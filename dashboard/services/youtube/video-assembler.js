/**
 * Video Assembler - Assembles final video from visuals + narration using FFmpeg.
 *
 * Architecture: ONE clip at a time to minimize memory (< 200MB per FFmpeg process).
 * - Phase 1: Render each image individually into its own MP4 (static frame)
 * - Phase 2: Concatenate all clip MP4s using concat demuxer (zero-copy, no re-encode)
 * - Phase 3: Mux narration audio onto the final video
 *
 * This approach guarantees minimal RAM usage. Works reliably in 2GB containers
 * with 80+ clips.
 */
import { db } from '../../db.js';
import { uploadFile, downloadFile, buildKey, uniqueFilename } from './s3.js';
import { getProjectSettings } from './settings-helper.js';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdtemp, readdir, rmdir } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BGM_DIR = join(__dirname, '../../assets/bgm');

// --- Constants ---
const FPS = 25;
const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;

/**
 * Assemble final video from visual assets + narration audio.
 * @param {string} topicId
 * @returns {Promise<Object>} Created final video row
 */
export async function assembleVideo(topicId) {
  const pool = db.analytics;

  const topic = await fetchTopic(pool, topicId);
  const settings = await getProjectSettings(topic.project_id);
  const narration = await fetchNarration(pool, topicId);
  const segmentsWithVisuals = await fetchSegmentsWithAllVisuals(pool, topicId);

  const tempDir = await mkdtemp(join(tmpdir(), 'yt-assembly-'));

  try {
    // Validate ALL segments have visual assets before starting assembly
    const missingVisuals = segmentsWithVisuals.filter(s => s.visuals.length === 0);
    if (missingVisuals.length > 0) {
      const missingIndexes = missingVisuals.map(s => s.segmentIndex).join(', ');
      throw new Error(
        `${missingVisuals.length} segment(s) have no visual assets (indexes: ${missingIndexes}). ` +
        `Restart from generate_visual_prompts to regenerate.`
      );
    }

    const audioPath = await downloadAudioToTemp(narration, tempDir);
    const visualClips = await downloadAndGroupVisuals(segmentsWithVisuals, tempDir);

    if (visualClips.length === 0) {
      throw new Error('No visual assets available for assembly');
    }

    console.log(`[VideoAssembler] ${visualClips.length} clips to render individually`);

    // Phase 1: Render each clip individually (1 FFmpeg process per clip)
    const clipVideos = [];
    for (let i = 0; i < visualClips.length; i++) {
      const clip = visualClips[i];
      const clipPath = join(tempDir, `clip_${String(i).padStart(3, '0')}.mp4`);

      if (i % 10 === 0) {
        console.log(`[VideoAssembler] Rendering clip ${i + 1}/${visualClips.length}`);
      }

      await renderSingleClip(clip, clipPath);
      clipVideos.push(clipPath);
    }

    console.log(`[VideoAssembler] All ${clipVideos.length} clips rendered. Concatenating...`);

    // Phase 2: Concatenate all clips using concat demuxer (no re-encode)
    const concatPath = join(tempDir, 'concat_output.mp4');
    await concatenateClips(clipVideos, concatPath, tempDir);

    // Phase 3: Select random BGM + mux narration + BGM onto video
    const bgm = await selectRandomBgm();
    console.log(`[VideoAssembler] Muxing audio with BGM: ${bgm.name}`);
    const outputPath = join(tempDir, 'output.mp4');
    await muxAudioWithBgm(concatPath, audioPath, bgm.path, outputPath, settings);

    const videoBuffer = await readFile(outputPath);
    const s3Key = buildKey(topic.project_id, 'videos', uniqueFilename('mp4'));
    try {
      await uploadFile(videoBuffer, s3Key, 'video/mp4');
    } catch (err) {
      throw new Error(`S3 upload failed: ${err.message}. Assembled video LOST — stopping pipeline.`);
    }

    const fileSizeMb = Math.round(videoBuffer.length / (1024 * 1024) * 100) / 100;

    const { rows } = await pool.query(
      `INSERT INTO yt_final_videos (topic_id, s3_key, duration_seconds, file_size_mb, resolution, bgm_track)
       VALUES ($1, $2, $3, $4, '1920x1080', $5)
       ON CONFLICT (topic_id) DO UPDATE
       SET s3_key = $2, duration_seconds = $3, file_size_mb = $4, bgm_track = $5, updated_at = NOW()
       RETURNING *`,
      [topicId, s3Key, narration.duration_seconds, fileSizeMb, bgm.name],
    );

    await pool.query(
      `UPDATE yt_topics SET pipeline_stage = 'video_assembled', updated_at = NOW() WHERE id = $1`,
      [topicId],
    );

    return rows[0];
  } finally {
    await cleanupTempDir(tempDir);
  }
}

// --- Data Fetching ---

async function fetchTopic(pool, topicId) {
  const { rows } = await pool.query(
    'SELECT * FROM yt_topics WHERE id = $1',
    [topicId],
  );
  if (rows.length === 0) throw new Error(`Topic ${topicId} not found`);
  return rows[0];
}

async function fetchNarration(pool, topicId) {
  const { rows } = await pool.query(
    'SELECT * FROM yt_narrations WHERE topic_id = $1',
    [topicId],
  );
  if (rows.length === 0) throw new Error('No narration found');
  return rows[0];
}

/**
 * Fetch all segments with ALL their visual assets.
 * Groups multiple assets per segment into arrays.
 */
async function fetchSegmentsWithAllVisuals(pool, topicId) {
  const { rows: scripts } = await pool.query(
    'SELECT id FROM yt_scripts WHERE topic_id = $1',
    [topicId],
  );
  if (scripts.length === 0) throw new Error(`No script found for topic ${topicId}`);

  const { rows } = await pool.query(
    `SELECT
       ss.id AS segment_id,
       ss.segment_index,
       ss.duration_seconds,
       ss.segment_type,
       va.id AS asset_id,
       va.s3_key AS visual_key,
       va.asset_type,
       va.sort_order
     FROM yt_script_segments ss
     LEFT JOIN yt_visual_assets va ON va.segment_id = ss.id
     WHERE ss.script_id = $1
     ORDER BY ss.segment_index, COALESCE(va.sort_order, 0)`,
    [scripts[0].id],
  );

  const segmentMap = new Map();
  for (const row of rows) {
    if (!segmentMap.has(row.segment_id)) {
      segmentMap.set(row.segment_id, {
        segmentId: row.segment_id,
        segmentIndex: row.segment_index,
        duration: row.duration_seconds || 45,
        segmentType: row.segment_type || 'body',
        visuals: [],
      });
    }
    if (row.visual_key) {
      segmentMap.get(row.segment_id).visuals.push({
        assetId: row.asset_id,
        s3Key: row.visual_key,
        assetType: row.asset_type || 'image',
        sortOrder: row.sort_order || 0,
      });
    }
  }

  return Array.from(segmentMap.values());
}

// --- File Download & Grouping ---

async function downloadAudioToTemp(narration, tempDir) {
  const audioBuffer = await downloadFile(narration.s3_key);
  const audioPath = join(tempDir, 'narration.mp3');
  await writeFile(audioPath, audioBuffer);
  return audioPath;
}

/**
 * Download all visual assets and flatten into an ordered clip list.
 * Multiple images per segment get split durations.
 */
async function downloadAndGroupVisuals(segments, tempDir) {
  const clips = [];
  let fileIndex = 0;

  for (const segment of segments) {
    if (segment.visuals.length === 0) continue;

    const visualCount = segment.visuals.length;
    const perVisualDuration = segment.duration / visualCount;

    for (let vi = 0; vi < segment.visuals.length; vi++) {
      const visual = segment.visuals[vi];
      const buffer = await downloadFile(visual.s3Key);
      const ext = visual.assetType === 'video' ? 'mp4' : 'webp';
      const filePath = join(tempDir, `visual_${String(fileIndex).padStart(3, '0')}.${ext}`);
      await writeFile(filePath, buffer);

      clips.push({
        path: filePath,
        type: visual.assetType || 'image',
        duration: Math.max(perVisualDuration, 1),
        segmentIndex: segment.segmentIndex,
        globalIndex: fileIndex,
      });

      fileIndex++;
    }
  }

  return clips;
}

// --- Single Clip Rendering ---

/**
 * Render a single image into an MP4 clip (static frame, no animation).
 * Simple and fast: scale+pad to 1920x1080, encode N frames.
 */
async function renderSingleClip(clip, outputPath) {
  if (clip.type === 'video') {
    return renderVideoClip(clip, outputPath);
  }

  const totalFrames = Math.round(clip.duration * FPS);

  const filterGraph = [
    `[0:v]`,
    `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=decrease,`,
    `pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,`,
    `setsar=1`,
    `[vout]`,
  ].join('');

  const args = [
    '-loop', '1',
    '-i', clip.path,
    '-filter_complex', filterGraph,
    '-map', '[vout]',
    '-frames:v', String(totalFrames),
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-r', String(FPS),
    '-an',
    '-y',
    outputPath,
  ];

  return runFfmpeg(args, 120000); // 2 min timeout per clip
}

/**
 * Render a video clip (scale + pad to output resolution).
 */
async function renderVideoClip(clip, outputPath) {
  const filterGraph = [
    `[0:v]`,
    `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:`,
    `force_original_aspect_ratio=decrease,`,
    `pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,`,
    `fps=${FPS},`,
    `setsar=1`,
    `[vout]`,
  ].join('');

  const args = [
    '-t', String(clip.duration),
    '-i', clip.path,
    '-filter_complex', filterGraph,
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-an',
    '-y',
    outputPath,
  ];

  return runFfmpeg(args, 120000);
}

// --- Concatenation ---

/**
 * Concatenate clips using FFmpeg concat demuxer.
 * Zero re-encoding, zero extra memory — just remuxes the streams.
 */
async function concatenateClips(clipPaths, outputPath, tempDir) {
  // Write concat list file
  const listContent = clipPaths.map(p => `file '${p}'`).join('\n');
  const listPath = join(tempDir, 'concat_list.txt');
  await writeFile(listPath, listContent);

  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c', 'copy',
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ];

  return runFfmpeg(args, 300000); // 5 min timeout for concat
}

// --- BGM Selection ---

/**
 * Select a random background music track from the assets/bgm directory.
 * @returns {Promise<{ name: string, path: string }>}
 */
async function selectRandomBgm() {
  const files = await readdir(BGM_DIR);
  const mp3s = files.filter(f => f.endsWith('.mp3'));
  if (mp3s.length === 0) {
    return { name: 'none', path: null };
  }
  const chosen = mp3s[Math.floor(Math.random() * mp3s.length)];
  return { name: chosen.replace('.mp3', ''), path: join(BGM_DIR, chosen) };
}

// --- Audio Mux ---

/**
 * Mux narration + looped BGM onto a video file (no video re-encode).
 * BGM is looped to match video length and mixed at low volume (15%).
 * Volume is configurable via project settings (background_music_volume).
 */
async function muxAudioWithBgm(videoPath, narrationPath, bgmPath, outputPath, settings) {
  const bgmVolume = parseFloat(settings?.background_music_volume) || 0.15;

  // If no BGM available, fall back to narration-only mux
  if (!bgmPath) {
    const args = [
      '-i', videoPath,
      '-i', narrationPath,
      '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '44100',
      '-shortest', '-movflags', '+faststart', '-y', outputPath,
    ];
    return runFfmpeg(args);
  }

  // Mix narration (full volume) + BGM (looped, low volume)
  const filterComplex = [
    `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[narr];`,
    `[2:a]aloop=loop=-1:size=2e+09,aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${bgmVolume}[bgm];`,
    `[narr][bgm]amix=inputs=2:duration=first:dropout_transition=3[aout]`,
  ].join('');

  const args = [
    '-i', videoPath,
    '-i', narrationPath,
    '-i', bgmPath,
    '-filter_complex', filterComplex,
    '-map', '0:v',
    '-map', '[aout]',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-ar', '44100',
    '-shortest',
    '-movflags', '+faststart',
    '-y',
    outputPath,
  ];

  return runFfmpeg(args);
}

// --- FFmpeg Execution ---

/**
 * Execute FFmpeg as a child process with timeout.
 */
function runFfmpeg(args, timeout = 900000) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[VideoAssembler] FFmpeg stderr:', stderr?.slice(-2000));
        reject(new Error(`FFmpeg failed: ${error.message}\n${stderr?.slice(-500) || ''}`));
        return;
      }
      resolve();
    });
  });
}

// --- Temp Directory Cleanup ---

async function cleanupTempDir(dir) {
  try {
    const files = await readdir(dir);
    await Promise.all(
      files.map(file => unlink(join(dir, file)).catch(() => {})),
    );
    await rmdir(dir).catch(() => {});
  } catch {
    // Best-effort cleanup
  }
}
