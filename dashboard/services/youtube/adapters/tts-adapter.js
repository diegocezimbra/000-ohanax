/**
 * Text-to-Speech Adapter - Fish Audio (OpenAudio S1).
 * ~$15/1M chars — high quality multilingual TTS.
 * Docs: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech
 */

/**
 * Generate speech audio from text.
 * @param {Object} opts
 * @param {string} opts.apiKey - Fish Audio API key
 * @param {string} opts.text - Text to narrate
 * @param {string} [opts.voice] - Fish Audio voice model ID (reference_id)
 * @param {string} [opts.model='s1'] - Fish Audio model
 * @param {number} [opts.speed=1.0] - Playback speed (0.5-2.0)
 * @returns {Promise<{ buffer: Buffer, mimeType: string, metadata: Object }>}
 */
export async function generateSpeech({
  apiKey, text, voice, model, speed = 1.0,
}) {
  const referenceId = voice || null;
  const fishModel = model || 's1';
  const clampedSpeed = clampValue(speed, 0.5, 2.0, 1.0);

  const requestBody = {
    text,
    format: 'mp3',
    mp3_bitrate: 128,
    temperature: 0.7,
    top_p: 0.7,
    prosody: { speed: clampedSpeed },
  };

  if (referenceId) {
    requestBody.reference_id = referenceId;
  }

  const response = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'model': fishModel,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Fish Audio: ${error.message || response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Estimate duration from audio buffer size (MP3 at ~128kbps)
  const estimatedDurationSeconds = Math.round(buffer.length / (128 * 128));

  return {
    buffer,
    mimeType: 'audio/mpeg',
    metadata: {
      model: fishModel,
      referenceId,
      speed: clampedSpeed,
      estimatedDurationSeconds,
    },
  };
}

/**
 * List available voices.
 * @param {Object} opts
 * @param {string} opts.apiKey
 * @returns {Promise<Array<{ id: string, name: string, previewUrl?: string }>>}
 */
export async function listVoices({ apiKey }) {
  const response = await fetch('https://api.fish.audio/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Fish Audio voices: ${response.statusText}`);
  }

  const data = await response.json();
  const models = data.items || data.models || data;
  return (Array.isArray(models) ? models : []).map(v => ({
    id: v.id || v._id,
    name: v.title || v.name,
    previewUrl: v.preview_url || null,
  }));
}

/**
 * Transcribe audio with word-level timestamps (for forced alignment).
 * Uses OpenAI Whisper API.
 * @param {Object} opts
 * @param {string} opts.apiKey - OpenAI API key
 * @param {Buffer} opts.audioBuffer
 * @param {string} opts.language - ISO 639-1 code
 * @returns {Promise<{ text: string, duration: number, words: Array<{ word: string, start: number, end: number }> }>}
 */
export async function transcribeWithTimestamps({ apiKey, audioBuffer, language = 'en' }) {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
  formData.append('file', blob, 'audio.mp3');
  formData.append('model', 'whisper-1');
  formData.append('language', language);
  formData.append('response_format', 'verbose_json');
  formData.append('timestamp_granularities[]', 'word');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Whisper: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.text,
    duration: data.duration || 0,
    words: (data.words || []).map(w => ({
      word: w.word,
      start: w.start,
      end: w.end,
    })),
  };
}

// --- Utilities ---

function clampValue(value, min, max, fallback) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}
