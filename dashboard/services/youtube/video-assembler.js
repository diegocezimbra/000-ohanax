/**
 * Video Assembler - Assembles final video from visuals + narration using FFmpeg.
 *
 * Architecture: Progressive chunked rendering to stay within 2GB RAM limits.
 * - Phase 1: Render chunks of ~10 clips each into intermediate MP4s
 * - Phase 2: Concatenate intermediates with crossfade transitions
 * - Phase 3: Mux narration audio onto the final video
 *
 * Features:
 * - Varied Ken Burns effects (zoom-in, zoom-out, pan-left, pan-right, diagonal)
 * - Crossfade transitions between clips (xfade filter)
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

// Max clips per chunk — keeps RAM under ~500MB per FFmpeg process (2GB container)
const MAX_CLIPS_PER_CHUNK = 6;

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

    if (visualClips.length <= MAX_CLIPS_PER_CHUNK) {
      // Small video — single pass is fine
      console.log(`[VideoAssembler] Single-pass: ${visualClips.length} clips`);
      await runSinglePassAssembly(audioPath, visualClips, outputPath);
    } else {
      // Large video — chunked progressive rendering
      console.log(`[VideoAssembler] Chunked: ${visualClips.length} clips in chunks of ${MAX_CLIPS_PER_CHUNK}`);
      await runChunkedAssembly(audioPath, visualClips, outputPath, tempDir);
    }

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
      // Use .webp extension since images are actually WebP format
      const ext = visual.assetType === 'video' ? 'mp4' : 'webp';
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

// --- FFmpeg Helpers ---

function selectKenBurnsEffect(globalIndex) {
  return KEN_BURNS_EFFECTS[globalIndex % KEN_BURNS_EFFECTS.length];
}

function selectXfadeTransition(transitionIndex) {
  return XFADE_TRANSITIONS[transitionIndex % XFADE_TRANSITIONS.length];
}

function buildKenBurnsFilter(inputLabel, outputLabel, effect, durationSeconds) {
  const totalFrames = Math.round(durationSeconds * FPS);
  const zoomExpr = `'${effect.startZoom}+(${effect.endZoom}-${effect.startZoom})*on/${totalFrames}'`;

  // Use output resolution directly for zoompan — no upscale.
  // Images are 1920x1088 (already close to output), zoompan handles crop internally.
  // The max zoom is 1.12x so slight edge softness is acceptable to save massive RAM.
  return [
    `[${inputLabel}]`,
    `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},`,
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
 * Build filter graph for a set of clips with Ken Burns + xfade transitions.
 * @param {Array} clips - The clips to process
 * @param {number} inputOffset - The FFmpeg input index offset (0-based, excluding audio)
 * @param {number} globalTransitionIdx - Starting transition index for variety
 * @returns {{ filterGraph: string, totalDuration: number }}
 */
function buildFilterGraphForClips(clips, inputOffset, globalTransitionIdx) {
  const filterParts = [];

  // Build per-clip filters
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const inputLabel = `${inputOffset + i}:v`;
    const outputLabel = `v${i}`;

    if (clip.type === 'image') {
      const effect = selectKenBurnsEffect(clip.globalIndex);
      filterParts.push(buildKenBurnsFilter(inputLabel, outputLabel, effect, clip.duration));
    } else {
      filterParts.push(buildVideoScaleFilter(inputLabel, outputLabel));
    }
  }

  // Chain xfade transitions
  // xfade offset = time in the OUTPUT stream where the crossfade starts
  let outputStreamDuration = clips[0].duration;

  if (clips.length === 1) {
    filterParts.push(`[v0]copy[vout]`);
  } else {
    let currentLabel = 'v0';

    for (let i = 1; i < clips.length; i++) {
      const offset = Math.max(outputStreamDuration - CROSSFADE_DURATION, 0);
      const transition = selectXfadeTransition(globalTransitionIdx + i - 1);
      const outLabel = i < clips.length - 1 ? `xf${i}` : 'vout';

      filterParts.push(
        `[${currentLabel}][v${i}]xfade=transition=${transition}:duration=${CROSSFADE_DURATION}:offset=${offset.toFixed(2)}[${outLabel}]`,
      );

      currentLabel = outLabel;
      outputStreamDuration = offset + clips[i].duration;
    }
  }

  // Final scale
  filterParts.push(
    `[vout]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:flags=lanczos,setsar=1[vfinal]`,
  );

  return { filterGraph: filterParts.join(';\n'), totalDuration: outputStreamDuration };
}

// --- Single-Pass Assembly (for small videos, <=MAX_CLIPS_PER_CHUNK clips) ---

async function runSinglePassAssembly(audioPath, clips, outputPath) {
  const inputs = ['-i', audioPath];

  for (const clip of clips) {
    if (clip.type === 'image') {
      inputs.push('-loop', '1', '-t', String(clip.duration), '-i', clip.path);
    } else {
      inputs.push('-t', String(clip.duration), '-i', clip.path);
    }
  }

  // inputOffset=1 because input 0 is audio
  const { filterGraph } = buildFilterGraphForClips(clips, 1, 0);

  const filterPath = join(dirname(outputPath), 'filters.txt');
  await writeFile(filterPath, filterGraph);

  const args = [
    ...inputs,
    '-filter_complex_script', filterPath,
    '-map', '[vfinal]',
    '-map', '0:a',
    ...ENCODING_ARGS,
    '-shortest',
    '-y',
    outputPath,
  ];

  return runFfmpeg(args);
}

// --- Chunked Assembly (for large videos) ---

/**
 * Split clips into chunks and render progressively:
 * 1. Render each chunk into an intermediate MP4 (video only)
 * 2. Concatenate all intermediates with crossfade between them
 * 3. Mux audio onto the final video
 */
async function runChunkedAssembly(audioPath, clips, outputPath, tempDir) {
  // Split clips into chunks
  const chunks = [];
  for (let i = 0; i < clips.length; i += MAX_CLIPS_PER_CHUNK) {
    chunks.push(clips.slice(i, i + MAX_CLIPS_PER_CHUNK));
  }

  console.log(`[VideoAssembler] Rendering ${chunks.length} chunks...`);

  // Phase 1: Render each chunk into an intermediate MP4
  const intermediates = [];
  let globalTransitionIdx = 0;

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const chunkPath = join(tempDir, `chunk_${String(chunkIdx).padStart(2, '0')}.mp4`);

    console.log(`[VideoAssembler] Rendering chunk ${chunkIdx + 1}/${chunks.length} (${chunk.length} clips)`);
    await renderChunk(chunk, chunkPath, tempDir, chunkIdx, globalTransitionIdx);
    intermediates.push(chunkPath);

    globalTransitionIdx += chunk.length;
  }

  if (intermediates.length === 1) {
    // Only one chunk — just mux the audio
    console.log(`[VideoAssembler] Single chunk — muxing audio`);
    await muxAudio(intermediates[0], audioPath, outputPath);
  } else {
    // Phase 2: Concatenate intermediates with crossfades
    console.log(`[VideoAssembler] Concatenating ${intermediates.length} chunks...`);
    const concatPath = join(tempDir, 'concat_output.mp4');
    await concatenateChunks(intermediates, concatPath, tempDir);

    // Phase 3: Mux audio
    console.log(`[VideoAssembler] Muxing audio onto final video`);
    await muxAudio(concatPath, audioPath, outputPath);
  }
}

/**
 * Render a single chunk of clips into an intermediate MP4 (video only, no audio).
 */
async function renderChunk(clips, outputPath, tempDir, chunkIdx, globalTransitionIdx) {
  const inputs = [];

  for (const clip of clips) {
    if (clip.type === 'image') {
      inputs.push('-loop', '1', '-t', String(clip.duration), '-i', clip.path);
    } else {
      inputs.push('-t', String(clip.duration), '-i', clip.path);
    }
  }

  // inputOffset=0 because there's no audio input in chunk rendering
  const { filterGraph } = buildFilterGraphForClips(clips, 0, globalTransitionIdx);

  const filterPath = join(tempDir, `chunk_${chunkIdx}_filters.txt`);
  await writeFile(filterPath, filterGraph);

  const args = [
    ...inputs,
    '-filter_complex_script', filterPath,
    '-map', '[vfinal]',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',       // Slightly higher quality for intermediates
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-an',              // No audio in chunks
    '-y',
    outputPath,
  ];

  return runFfmpeg(args);
}

/**
 * Concatenate intermediate chunk videos with crossfade transitions between them.
 */
async function concatenateChunks(chunkPaths, outputPath, tempDir) {
  if (chunkPaths.length <= 1) {
    // Nothing to concatenate — just copy
    const buffer = await readFile(chunkPaths[0]);
    await writeFile(outputPath, buffer);
    return;
  }

  // For up to ~15 chunks, a single xfade chain is fine since inputs are pre-encoded
  const inputs = [];
  for (const chunkPath of chunkPaths) {
    inputs.push('-i', chunkPath);
  }

  // Get duration of each chunk using ffprobe
  const durations = [];
  for (const chunkPath of chunkPaths) {
    const duration = await getVideoDuration(chunkPath);
    durations.push(duration);
  }

  // Build xfade chain between chunks
  // xfade offset = time in the OUTPUT stream where the crossfade starts.
  // After each xfade, the output stream duration = offset + CROSSFADE_DURATION
  // (because xfade overlaps CROSSFADE_DURATION seconds from both streams).
  const filterParts = [];
  let currentLabel = '0:v';
  let outputStreamDuration = durations[0];

  for (let i = 1; i < chunkPaths.length; i++) {
    // The crossfade starts CROSSFADE_DURATION before the end of the current output
    const offset = Math.max(outputStreamDuration - CROSSFADE_DURATION, 0);
    const transition = selectXfadeTransition(i - 1);
    const outLabel = i < chunkPaths.length - 1 ? `xf${i}` : 'vout';

    filterParts.push(
      `[${currentLabel}][${i}:v]xfade=transition=${transition}:duration=${CROSSFADE_DURATION}:offset=${offset.toFixed(2)}[${outLabel}]`,
    );

    currentLabel = outLabel;
    // After xfade, the new output duration = offset + duration of new input
    outputStreamDuration = offset + durations[i];
  }

  filterParts.push(
    `[vout]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:flags=lanczos,setsar=1[vfinal]`,
  );

  const filterGraph = filterParts.join(';\n');
  const filterPath = join(tempDir, 'concat_filters.txt');
  await writeFile(filterPath, filterGraph);

  const args = [
    ...inputs,
    '-filter_complex_script', filterPath,
    '-map', '[vfinal]',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-profile:v', 'high',
    '-pix_fmt', 'yuv420p',
    '-an',
    '-y',
    outputPath,
  ];

  return runFfmpeg(args, 1800000); // 30 min timeout for concat
}

/**
 * Mux audio onto a video file.
 */
async function muxAudio(videoPath, audioPath, outputPath) {
  const args = [
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',         // No re-encode for video
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
 * Get video duration using ffprobe.
 */
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { timeout: 30000 }, (error, stdout) => {
      if (error) {
        reject(new Error(`ffprobe failed: ${error.message}`));
        return;
      }
      const duration = parseFloat(stdout.trim());
      if (isNaN(duration)) {
        reject(new Error(`Could not parse duration from ffprobe output: ${stdout}`));
        return;
      }
      resolve(duration);
    });
  });
}

// --- Shared Encoding Args ---

const ENCODING_ARGS = [
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
  '-movflags', '+faststart',
];

/**
 * Execute FFmpeg as a child process with timeout.
 */
function runFfmpeg(args, timeout = 900000) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        // Log last 3000 chars of stderr for debugging
        console.error('[VideoAssembler] FFmpeg stderr:', stderr?.slice(-3000));
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
