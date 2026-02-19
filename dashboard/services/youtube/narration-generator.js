/**
 * Narration Generator - Generates TTS audio from script segments.
 *
 * Features:
 * - Dramatic pauses via text preprocessing (ellipsis before pattern interrupts)
 * - Per-segment speed adjustment (faster hooks, slower climax)
 * - Configurable TTS stability/speed from project settings
 * - Inter-segment silence (0.3-0.5s) for natural pacing
 * - Actual duration estimation from TTS metadata + Whisper alignment
 */
import { db } from '../../db.js';
import { generateSpeech, transcribeWithTimestamps } from './adapters/tts-adapter.js';
import { uploadFile, buildKey, uniqueFilename } from './s3.js';
import { getProjectSettings } from './settings-helper.js';

// --- Constants ---

const SILENCE_BETWEEN_SEGMENTS_MS = 350; // 0.35 seconds
const WORDS_PER_MINUTE_FALLBACK = 150;
const MP3_SAMPLE_RATE = 44100;
const SEGMENT_SPEED_MODIFIERS = {
  hook: 1.05,
  intro: 1.0,
  body: 1.0,
  climax: 0.95,
  twist: 0.95,
  conclusion: 1.0,
  outro: 1.0,
};

/**
 * Generate narration audio for all segments of a topic.
 * @param {string} topicId
 * @returns {Promise<Object>} Created narration row
 */
export async function generateNarration(topicId) {
  const pool = db.analytics;

  const topic = await fetchTopic(pool, topicId);
  const settings = await getProjectSettings(topic.project_id);
  const segments = await fetchSegments(pool, topicId);

  const baseSpeed = parseFloat(settings.tts_speed) || 1.0;
  const baseStability = parseFloat(settings.tts_stability) || 0.75;

  const segmentBuffers = [];
  const segmentMeta = [];
  const silenceBuffer = createSilenceBuffer(SILENCE_BETWEEN_SEGMENTS_MS);

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const processedText = preprocessNarrationText(segment.narration_text, segment.segment_type);
    const segmentSpeed = calculateSegmentSpeed(baseSpeed, segment.segment_type);

    const audio = await generateSpeech({
      provider: settings.tts_provider || 'elevenlabs',
      apiKey: selectApiKey(settings),
      text: processedText,
      voice: settings.tts_voice_id,
      model: settings.tts_model,
      speed: segmentSpeed,
      stability: baseStability,
      similarityBoost: 0.75,
    });

    const estimatedSegmentDuration = estimateSegmentDuration(
      audio.buffer,
      audio.metadata,
      segment.narration_text,
    );

    segmentBuffers.push(audio.buffer);
    segmentMeta.push({
      segmentIndex: segment.segment_index,
      segmentId: segment.id,
      segmentType: segment.segment_type || 'body',
      byteOffset: 0,
      byteLength: audio.buffer.length,
      durationSeconds: estimatedSegmentDuration,
      speed: segmentSpeed,
    });

    // Add silence between segments (not after the last one)
    if (i < segments.length - 1) {
      segmentBuffers.push(silenceBuffer);
    }
  }

  // Concatenate all audio segments with silence gaps
  const fullAudioBuffer = Buffer.concat(segmentBuffers);

  // Calculate byte offsets in the concatenated buffer
  let offset = 0;
  let silenceIndex = 0;
  for (let i = 0; i < segmentMeta.length; i++) {
    segmentMeta[i].byteOffset = offset;
    offset += segmentMeta[i].byteLength;

    // Account for silence buffer between segments
    if (i < segmentMeta.length - 1) {
      offset += silenceBuffer.length;
      silenceIndex++;
    }
  }

  // Upload full audio to S3
  const audioKey = buildKey(topic.project_id, 'narrations', uniqueFilename('mp3'));
  await uploadFile(fullAudioBuffer, audioKey, 'audio/mpeg');

  // Run forced alignment for word-level timestamps
  const alignment = await runAlignment(settings, fullAudioBuffer);

  // Calculate total duration (prefer alignment duration, then sum of segments, then estimate)
  const totalDuration = calculateTotalDuration(alignment, segmentMeta, segments);

  // Update each segment's duration_seconds in the database
  await updateSegmentDurations(pool, segmentMeta);

  // Upsert narration
  const { rows } = await pool.query(
    `INSERT INTO yt_narrations (topic_id, s3_key, duration_seconds, segment_meta, alignment_data)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (topic_id) DO UPDATE
     SET s3_key = $2, duration_seconds = $3, segment_meta = $4,
         alignment_data = $5, updated_at = NOW()
     RETURNING *`,
    [
      topicId, audioKey, totalDuration,
      JSON.stringify(segmentMeta),
      alignment ? JSON.stringify(alignment) : null,
    ],
  );

  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'narration_created', updated_at = NOW() WHERE id = $1`,
    [topicId],
  );

  return rows[0];
}

/**
 * Re-generate narration for a single segment (partial re-record).
 * @param {string} topicId
 * @param {string} segmentId
 * @returns {Promise<{ buffer: Buffer, s3Key: string, durationSeconds: number }>}
 */
export async function regenerateSegmentAudio(topicId, segmentId) {
  const pool = db.analytics;

  const topic = await fetchTopic(pool, topicId);
  const settings = await getProjectSettings(topic.project_id);
  const segment = await fetchSingleSegment(pool, segmentId);

  const baseSpeed = parseFloat(settings.tts_speed) || 1.0;
  const baseStability = parseFloat(settings.tts_stability) || 0.75;
  const processedText = preprocessNarrationText(segment.narration_text, segment.segment_type);
  const segmentSpeed = calculateSegmentSpeed(baseSpeed, segment.segment_type);

  const audio = await generateSpeech({
    provider: settings.tts_provider || 'elevenlabs',
    apiKey: selectApiKey(settings),
    text: processedText,
    voice: settings.tts_voice_id,
    model: settings.tts_model,
    speed: segmentSpeed,
    stability: baseStability,
    similarityBoost: 0.75,
  });

  const durationSeconds = estimateSegmentDuration(
    audio.buffer,
    audio.metadata,
    segment.narration_text,
  );

  const key = buildKey(topic.project_id, 'narration-segments', uniqueFilename('mp3'));
  await uploadFile(audio.buffer, key, 'audio/mpeg');

  return { buffer: audio.buffer, s3Key: key, durationSeconds };
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

async function fetchSegments(pool, topicId) {
  const { rows: scripts } = await pool.query(
    'SELECT id FROM yt_scripts WHERE topic_id = $1',
    [topicId],
  );
  if (scripts.length === 0) throw new Error(`No script found for topic ${topicId}`);

  const { rows } = await pool.query(
    'SELECT * FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index',
    [scripts[0].id],
  );
  if (rows.length === 0) throw new Error('No script segments found');
  return rows;
}

async function fetchSingleSegment(pool, segmentId) {
  const { rows } = await pool.query(
    'SELECT * FROM yt_script_segments WHERE id = $1',
    [segmentId],
  );
  if (rows.length === 0) throw new Error(`Segment ${segmentId} not found`);
  return rows[0];
}

// --- Text Preprocessing ---

/**
 * Preprocess narration text for more natural TTS output.
 * - Adds ellipsis before dramatic pattern interrupts
 * - Adds micro-pauses after key sentences
 */
function preprocessNarrationText(text, segmentType) {
  if (!text) return '';

  let processed = text;

  // Add ellipsis before dramatic reveals (pattern interrupt markers)
  // Patterns: "Mas", "No entanto", "Porém", "Acontece que", "A verdade é que"
  const dramaticPatterns = [
    /(?<=[.!?])\s+(Mas\b)/g,
    /(?<=[.!?])\s+(No entanto\b)/g,
    /(?<=[.!?])\s+(Porém\b)/g,
    /(?<=[.!?])\s+(Acontece que\b)/g,
    /(?<=[.!?])\s+(A verdade é que\b)/g,
    /(?<=[.!?])\s+(E então\b)/g,
    /(?<=[.!?])\s+(De repente\b)/g,
    /(?<=[.!?])\s+(O que ninguém\b)/g,
  ];

  for (const pattern of dramaticPatterns) {
    processed = processed.replace(pattern, '... $1');
  }

  // For climax/twist segments, add extra dramatic pauses
  if (segmentType === 'climax' || segmentType === 'twist') {
    // Add pause after exclamation marks
    processed = processed.replace(/!\s+/g, '!... ');
    // Add pause before final sentence of the segment
    const sentences = processed.split(/(?<=[.!?])\s+/);
    if (sentences.length >= 3) {
      sentences.splice(-1, 0, '...');
      processed = sentences.join(' ');
    }
  }

  // For hook segments, ensure it starts punchy (trim leading filler)
  if (segmentType === 'hook') {
    processed = processed.replace(/^(Então,?\s*|Bem,?\s*|Bom,?\s*)/i, '');
  }

  return processed.trim();
}

// --- Speed Calculation ---

/**
 * Calculate the effective TTS speed for a segment type.
 * Hooks are slightly faster; climax/twist slightly slower.
 */
function calculateSegmentSpeed(baseSpeed, segmentType) {
  const modifier = SEGMENT_SPEED_MODIFIERS[segmentType] || 1.0;
  const effectiveSpeed = baseSpeed * modifier;
  // Clamp to safe range for TTS providers
  return Math.min(4.0, Math.max(0.25, effectiveSpeed));
}

// --- Duration Estimation ---

/**
 * Estimate segment duration using the best available source:
 * 1. TTS metadata (actual audio length from provider)
 * 2. Buffer size estimation (~128kbps MP3)
 * 3. Word count fallback (~150 WPM)
 */
function estimateSegmentDuration(buffer, metadata, originalText) {
  // Priority 1: TTS provider returned actual duration
  if (metadata?.estimatedDurationSeconds && metadata.estimatedDurationSeconds > 0) {
    return metadata.estimatedDurationSeconds;
  }

  // Priority 2: Estimate from MP3 buffer size (128kbps = 16KB/s)
  if (buffer && buffer.length > 0) {
    const bytesPerSecond = 16 * 1024;
    const bufferEstimate = buffer.length / bytesPerSecond;
    if (bufferEstimate > 0.5) {
      return Math.round(bufferEstimate * 10) / 10;
    }
  }

  // Priority 3: Word count fallback
  const wordCount = (originalText || '').split(/\s+/).filter(Boolean).length;
  return Math.round((wordCount / WORDS_PER_MINUTE_FALLBACK) * 60);
}

/**
 * Calculate total narration duration from the best available source.
 */
function calculateTotalDuration(alignment, segmentMeta, segments) {
  // Priority 1: Whisper returned total duration
  if (alignment?.duration && alignment.duration > 0) {
    return Math.round(alignment.duration);
  }

  // Priority 2: Sum of actual segment durations + silence gaps
  const segmentDurationSum = segmentMeta.reduce(
    (sum, meta) => sum + (meta.durationSeconds || 0),
    0,
  );
  const silenceTotal = Math.max(0, segmentMeta.length - 1) * (SILENCE_BETWEEN_SEGMENTS_MS / 1000);

  if (segmentDurationSum > 0) {
    return Math.round(segmentDurationSum + silenceTotal);
  }

  // Priority 3: Word count fallback
  const totalWords = segments.reduce(
    (sum, s) => sum + (s.narration_text || '').split(/\s+/).filter(Boolean).length,
    0,
  );
  return Math.round((totalWords / WORDS_PER_MINUTE_FALLBACK) * 60);
}

// --- Silence Generation ---

/**
 * Create a silent MP3 buffer of the specified duration.
 * Generates a minimal valid MP3 frame with silence.
 */
function createSilenceBuffer(durationMs) {
  // MP3 frame at 128kbps, 44100Hz: each frame = 1152 samples = ~26.12ms
  const frameDurationMs = 26.12;
  const frameCount = Math.ceil(durationMs / frameDurationMs);

  // Minimal MPEG1 Layer3 128kbps 44100Hz stereo silence frame (417 bytes)
  // Frame header: 0xFFFB9004 (sync, MPEG1, Layer3, 128kbps, 44100Hz, stereo)
  const frameHeader = Buffer.from([0xFF, 0xFB, 0x90, 0x04]);

  // Frame body: 413 bytes of zeros (silence)
  const frameBodySize = 417 - 4;
  const frameBody = Buffer.alloc(frameBodySize, 0);
  const singleFrame = Buffer.concat([frameHeader, frameBody]);

  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(singleFrame);
  }

  return Buffer.concat(frames);
}

// --- Database Updates ---

/**
 * Update each segment's duration_seconds with actual TTS-measured durations.
 * This helps the video assembler allocate precise visual timing.
 */
async function updateSegmentDurations(pool, segmentMeta) {
  for (const meta of segmentMeta) {
    if (meta.durationSeconds && meta.durationSeconds > 0) {
      await pool.query(
        'UPDATE yt_script_segments SET duration_seconds = $1 WHERE id = $2',
        [Math.round(meta.durationSeconds * 10) / 10, meta.segmentId],
      );
    }
  }
}

// --- Forced Alignment ---

async function runAlignment(settings, audioBuffer) {
  try {
    return await transcribeWithTimestamps({
      apiKey: settings.openai_api_key,
      audioBuffer,
      language: settings.language || 'pt',
    });
  } catch (err) {
    console.error('[NarrationGenerator] Forced alignment failed (non-critical):', err.message);
    return null;
  }
}

// --- Utilities ---

function selectApiKey(settings) {
  if (settings.tts_provider === 'openai') {
    return settings.openai_api_key;
  }
  return settings.elevenlabs_api_key;
}
