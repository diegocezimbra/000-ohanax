/**
 * Settings Helper - Loads project settings with caching + env var fallback.
 * Used by all pipeline services to get AI provider configs.
 *
 * Providers:
 * - LLM: Gemini (gemini-2.0-flash)
 * - Image: Z-Image-Turbo (Replicate)
 * - TTS: Fish Audio (OpenAudio S1)
 * - STT: OpenAI Whisper (forced alignment)
 * - Search: Serper
 * - Video: Veo3 (Replicate)
 */
import { db } from '../../db.js';

// In-memory cache: projectId -> { settings, loadedAt }
const cache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Maps settings fields to environment variables.
 */
const ENV_KEY_MAP = {
  llm_api_key: 'GOOGLE_API_KEY',
  search_api_key: 'SERPER_API_KEY',
  image_api_key: 'REPLICATE_API_TOKEN',
  fish_audio_api_key: 'FISH_AUDIO_API_KEY',
  video_api_key: 'REPLICATE_API_TOKEN',
  openai_api_key: 'OPENAI_API_KEY',
  replicate_api_key: 'REPLICATE_API_TOKEN',
};

/**
 * Enrich settings with env var defaults for null/empty API keys.
 * Does NOT overwrite existing DB values.
 */
function enrichWithEnvDefaults(settings) {
  const enriched = { ...settings };

  for (const [field, envVar] of Object.entries(ENV_KEY_MAP)) {
    if (enriched[field]) continue; // DB value exists, don't override
    enriched[field] = process.env[envVar] || null;
  }

  return enriched;
}

/**
 * Get project settings, with short-lived cache + env var fallback.
 * @param {string} projectId
 * @returns {Promise<Object>} Settings object with all provider keys/configs
 */
export async function getProjectSettings(projectId) {
  const cached = cache.get(projectId);
  if (cached && (Date.now() - cached.loadedAt) < CACHE_TTL_MS) {
    return cached.settings;
  }

  const { rows } = await db.analytics.query(
    'SELECT * FROM yt_project_settings WHERE project_id = $1',
    [projectId],
  );

  if (rows.length === 0) {
    throw new Error(`No settings found for project ${projectId}. Configure project settings first.`);
  }

  const settings = enrichWithEnvDefaults(rows[0]);
  cache.set(projectId, { settings, loadedAt: Date.now() });
  return settings;
}

/**
 * Check which env var API keys are available (for frontend hints).
 * @returns {Object} Map of provider -> boolean
 */
export function getAvailableEnvProviders() {
  return {
    gemini: !!process.env.GOOGLE_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    replicate: !!process.env.REPLICATE_API_TOKEN,
    fish_audio: !!process.env.FISH_AUDIO_API_KEY,
    serper: !!process.env.SERPER_API_KEY,
  };
}

/**
 * Invalidate cached settings (call after settings update).
 * @param {string} projectId
 */
export function invalidateSettingsCache(projectId) {
  cache.delete(projectId);
}
