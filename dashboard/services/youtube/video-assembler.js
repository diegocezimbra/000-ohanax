/**
 * Video Assembler - Assembles final video from visuals + narration using FFmpeg.
 *
 * Features:
 * - Varied Ken Burns effects (zoom-in, zoom-out, pan-left, pan-right, diagonal)
 * - Crossfade transitions between segments (xfade filter)
 * - Multiple images per segment support (split duration, inner transitions)
 * - Video clip handling (scale+pad, no Ken Burns)
 * - YouTube-optimized encoding (CRF 20, tune film, 256k audio)
 */
import { db } from '../../db.js';
import { uploadFile, downloadFile, buildKey, uniqueFilename } from './s3.js';
import { getProjectSettings } from './settings-helper.js';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdtemp, readdir, rmdir } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';

// --- Effect & Transition Definitions ---

const KEN_BURNS_EFFECTS = [
  { name: 'zoom-in', startZoom: '1', endZoom: '1.12', xExpr: 'iw/2-(iw/zoom/2)', yExpr: 'ih/2-(ih/zoom/2)' },
  { name: 'zoom-out', startZoom: '1.12', endZoom: '1', xExpr: 'iw/2-(iw/zoom/2)', yExpr: 'ih/2-(ih/zoom/2)' },
  { name: 'pan-left', startZoom: '1.04', endZoom: '1.04', xExpr: '(iw-iw/zoom)*on/duration', yExpr: 'ih/2-(ih/zoom/2)' },
  { name: 'pan-right', startZoom: '1.04', endZoom: '1.04', xExpr: '(iw-iw/zoom)*(1-on/duration)', yExpr: 'ih/2-(ih/zoom/2)' },
  { name: 'diagonal', startZoom: '1.08', endZoom: '1.08', xExpr: '(iw-iw/zoom)*on/duration', yExpr: '(ih-ih/zoom)*on/duration' },
];

const XFADE_TRANSITIONS = [
  'fade',
  'fadeblack',
  'slideleft',
  'slideright',
  'wiperight',
];

const CROSSFADE_DURATION = 0.5;
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

    const outputPath = join(tempDir, 'output.mp4');
    await runFfmpegAssembly(audioPath, visualClips, outputPath, settings);

    const videoBuffer = await readFile(outputPath);
    const s3Key = buildKey(topic.project_id, 'videos', uniqueFilename('mp4'));
    try {
      await uploadFile(videoBuffer, s3Key, 'video/mp4');
    } catch (err) {
      throw new Error(`S3 upload failed: ${err.message}. Assembled video LOST — stopping pipeline.`);
    }

    const fileSizeMb = Math.round(videoBuffer.length / (1024 * 1024) * 100) / 100;

    const { rows } = await pool.query(
      `INSERT INTO yt_final_videos (topic_id, s3_key, duration_seconds, file_size_mb, resolution)
       VALUES ($1, $2, $3, $4, '1920x1080')
       ON CONFLICT (topic_id) DO UPDATE
       SET s3_key = $2, duration_seconds = $3, file_size_mb = $4, updated_at = NOW()
       RETURNING *`,
      [topicId, s3Key, narration.duration_seconds, fileSizeMb],
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
 * Fetch all segments with ALL their visual assets (not just one per segment).
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

  // Group visuals by segment
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
    const totalCrossfadeTime = Math.max(0, (visualCount - 1) * CROSSFADE_DURATION);
    const availableDuration = Math.max(segment.duration - totalCrossfadeTime, visualCount);
    const perVisualDuration = availableDuration / visualCount;

    for (let vi = 0; vi < segment.visuals.length; vi++) {
      const visual = segment.visuals[vi];
      const buffer = await downloadFile(visual.s3Key);
      const ext = visual.assetType === 'video' ? 'mp4' : 'png';
      const filePath = join(tempDir, `visual_${String(fileIndex).padStart(3, '0')}.${ext}`);
      await writeFile(filePath, buffer);

      clips.push({
        path: filePath,
        type: visual.assetType || 'image',
        duration: Math.max(perVisualDuration, 1),
        segmentIndex: segment.segmentIndex,
        isFirstInSegment: vi === 0,
        isLastInSegment: vi === segment.visuals.length - 1,
        globalIndex: fileIndex,
      });

      fileIndex++;
    }
  }

  return clips;
}

// --- FFmpeg Assembly ---

/**
 * Select a Ken Burns effect based on the clip's global index.
 * Cycles through all 5 effects to avoid repetition.
 */
function selectKenBurnsEffect(globalIndex) {
  return KEN_BURNS_EFFECTS[globalIndex % KEN_BURNS_EFFECTS.length];
}

/**
 * Select an xfade transition based on the clip pair index.
 * Cycles through all 5 transition types.
 */
function selectXfadeTransition(transitionIndex) {
  return XFADE_TRANSITIONS[transitionIndex % XFADE_TRANSITIONS.length];
}

/**
 * Build the zoompan filter string for a Ken Burns effect.
 */
function buildKenBurnsFilter(inputLabel, outputLabel, effect, durationSeconds) {
  const totalFrames = Math.round(durationSeconds * FPS);
  const zoomExpr = `'${effect.startZoom}+(${effect.endZoom}-${effect.startZoom})*on/${totalFrames}'`;

  return [
    `[${inputLabel}]`,
    `scale=2560:1440,`,
    `zoompan=`,
    `z=${zoomExpr}:`,
    `x='${effect.xExpr}':`,
    `y='${effect.yExpr}':`,
    `d=${totalFrames}:`,
    `s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:`,
    `fps=${FPS}`,
    `[${outputLabel}]`,
  ].join('');
}

/**
 * Build the scale+pad filter for video clips (no Ken Burns).
 */
function buildVideoScaleFilter(inputLabel, outputLabel) {
  return [
    `[${inputLabel}]`,
    `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:`,
    `force_original_aspect_ratio=decrease,`,
    `pad=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black,`,
    `fps=${FPS},`,
    `setsar=1`,
    `[${outputLabel}]`,
  ].join('');
}

/**
 * Run FFmpeg to assemble the final video with varied effects and transitions.
 */
async function runFfmpegAssembly(audioPath, clips, outputPath, settings) {
  if (clips.length === 0) {
    throw new Error('No clips to assemble');
  }

  const inputs = ['-i', audioPath];
  const filterParts = [];

  // Add input for each clip
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    if (clip.type === 'image') {
      inputs.push('-loop', '1', '-t', String(clip.duration), '-i', clip.path);
    } else {
      inputs.push('-t', String(clip.duration), '-i', clip.path);
    }
  }

  // Build per-clip filters (Ken Burns for images, scale+pad for videos)
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const inputLabel = `${i + 1}:v`;
    const outputLabel = `v${i}`;

    if (clip.type === 'image') {
      const effect = selectKenBurnsEffect(clip.globalIndex);
      filterParts.push(
        buildKenBurnsFilter(inputLabel, outputLabel, effect, clip.duration),
      );
    } else {
      filterParts.push(
        buildVideoScaleFilter(inputLabel, outputLabel),
      );
    }
  }

  // Chain xfade transitions between clips
  if (clips.length === 1) {
    // Single clip: just rename the output
    filterParts.push(`[v0]copy[vout]`);
  } else {
    let currentLabel = 'v0';
    let transitionIndex = 0;
    let accumulatedOffset = 0;

    for (let i = 1; i < clips.length; i++) {
      const prevClipDuration = clips[i - 1].duration;
      accumulatedOffset += prevClipDuration - CROSSFADE_DURATION;

      // Ensure offset is never negative
      const offset = Math.max(accumulatedOffset, 0);
      const transition = selectXfadeTransition(transitionIndex);
      const outLabel = i < clips.length - 1 ? `xf${i}` : 'vout';

      filterParts.push(
        `[${currentLabel}][v${i}]xfade=transition=${transition}:duration=${CROSSFADE_DURATION}:offset=${offset.toFixed(2)}[${outLabel}]`,
      );

      currentLabel = outLabel;
      transitionIndex++;
    }
  }

  // Final scale to ensure exact 1920x1080 output
  filterParts.push(
    `[vout]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:flags=lanczos,setsar=1[vfinal]`,
  );

  const filterGraph = filterParts.join(';\n');

  // Write filter graph to file to avoid ARG_MAX limits with many clips
  const filterPath = join(dirname(outputPath), 'filters.txt');
  await writeFile(filterPath, filterGraph);

  const args = [
    ...inputs,
    '-filter_complex_script', filterPath,
    '-map', '[vfinal]',
    '-map', '0:a',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-tune', 'film',
    '-profile:v', 'high',
    '-level', '4.1',
    '-pix_fmt', 'yuv420p',
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

/**
 * Execute FFmpeg as a child process with timeout.
 */
function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const maxTimeout = 900000; // 15 minutes for long videos

    execFile('ffmpeg', args, { timeout: maxTimeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[VideoAssembler] FFmpeg stderr:', stderr?.slice(-2000));
        reject(new Error(`FFmpeg failed: ${error.message}`));
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
    // Best-effort cleanup; temp dir will be reclaimed by OS eventually
  }
}
