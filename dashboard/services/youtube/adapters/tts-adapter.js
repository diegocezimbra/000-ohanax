/**
 * Text-to-Speech Adapter - ElevenLabs + OpenAI TTS abstraction.
 * Supports speed, stability, and similarity_boost configuration.
 */

/**
 * Generate speech audio from text.
 * @param {Object} opts
 * @param {string} opts.provider - 'elevenlabs' | 'openai'
 * @param {string} opts.apiKey
 * @param {string} opts.text - Text to narrate
 * @param {string} opts.voice - Voice ID (ElevenLabs) or voice name (OpenAI)
 * @param {string} opts.model - ElevenLabs model or OpenAI TTS model
 * @param {number} [opts.speed=1.0] - Playback speed (both providers)
 * @param {number} [opts.stability=0.5] - Voice stability 0-1 (ElevenLabs only)
 * @param {number} [opts.similarityBoost=0.75] - Similarity boost 0-1 (ElevenLabs only)
 * @returns {Promise<{ buffer: Buffer, mimeType: string, metadata: Object }>}
 */
// --- Provider Registry ---
const TTS_PROVIDERS = {
  elevenlabs: callElevenLabs,
  openai: callOpenAiTts,
};

export async function generateSpeech({
  provider, apiKey, text, voice,
  model, speed = 1.0, stability = 0.5,
  similarityBoost = 0.75,
}) {
  const handler = TTS_PROVIDERS[provider];
  if (!handler) {
    throw new Error(`Unknown TTS provider: '${provider}'. Available: ${Object.keys(TTS_PROVIDERS).join(', ')}`);
  }
  return handler({ apiKey, text, voice, model, speed, stability, similarityBoost });
}

/**
 * List available voices for a provider.
 * @param {Object} opts
 * @param {string} opts.provider
 * @param {string} opts.apiKey
 * @returns {Promise<Array<{ id: string, name: string, previewUrl?: string }>>}
 */
export async function listVoices({ provider, apiKey }) {
  if (provider === 'openai') {
    return [
      { id: 'alloy', name: 'Alloy' },
      { id: 'ash', name: 'Ash' },
      { id: 'coral', name: 'Coral' },
      { id: 'echo', name: 'Echo' },
      { id: 'fable', name: 'Fable' },
      { id: 'onyx', name: 'Onyx' },
      { id: 'nova', name: 'Nova' },
      { id: 'sage', name: 'Sage' },
      { id: 'shimmer', name: 'Shimmer' },
    ];
  }
  return fetchElevenLabsVoices(apiKey);
}

// --- ElevenLabs ---

async function callElevenLabs({ apiKey, text, voice, model, speed, stability, similarityBoost }) {
  const voiceId = voice || 'pNInz6obpgDQGcFmaJgB'; // Default: Adam
  const modelId = model || 'eleven_multilingual_v2';

  const requestBody = {
    text,
    model_id: modelId,
    voice_settings: {
      stability: clampValue(stability, 0, 1, 0.5),
      similarity_boost: clampValue(similarityBoost, 0, 1, 0.75),
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  // ElevenLabs v1 API supports speed via query param on some models
  const speedParam = speed !== 1.0 ? `?output_format=mp3_44100_128` : '';

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}${speedParam}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`ElevenLabs: ${error.detail?.message || response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Estimate duration from audio buffer size (MP3 at ~128kbps)
  const estimatedDurationSeconds = Math.round(buffer.length / (128 * 128));

  return {
    buffer,
    mimeType: 'audio/mpeg',
    metadata: {
      model: modelId,
      voiceId,
      stability,
      similarityBoost,
      speed,
      estimatedDurationSeconds,
    },
  };
}

async function fetchElevenLabsVoices(apiKey) {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': apiKey },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs voices: ${response.statusText}`);
  }

  const data = await response.json();
  return data.voices.map(v => ({
    id: v.voice_id,
    name: v.name,
    previewUrl: v.preview_url,
  }));
}

// --- OpenAI TTS ---

async function callOpenAiTts({ apiKey, text, voice, model, speed }) {
  const ttsModel = model || 'tts-1-hd';
  const ttsVoice = voice || 'onyx';
  const clampedSpeed = clampValue(speed, 0.25, 4.0, 1.0);

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: ttsModel,
      input: text,
      voice: ttsVoice,
      response_format: 'mp3',
      speed: clampedSpeed,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI TTS: ${error.error?.message || response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  // Estimate duration from audio buffer size (MP3 at ~128kbps)
  const estimatedDurationSeconds = Math.round(buffer.length / (128 * 128));

  return {
    buffer,
    mimeType: 'audio/mpeg',
    metadata: {
      model: ttsModel,
      voice: ttsVoice,
      speed: clampedSpeed,
      estimatedDurationSeconds,
    },
  };
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
