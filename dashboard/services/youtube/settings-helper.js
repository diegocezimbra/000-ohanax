/**
 * Settings Helper - Loads project settings with caching + env var fallback.
 * Used by all pipeline services to get AI provider configs.
 *
 * Env var fallback: if a DB API key is null/empty, automatically uses
 * the corresponding process.env variable. Zero-config when env vars are set.
 */
import { db } from '../../db.js';

// In-memory cache: projectId -> { settings, loadedAt }
const cache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Maps settings fields to environment variables.
 * For provider-dependent keys, maps provider -> env var name.
 */
const ENV_KEY_MAP = {
  llm_api_key: {
    gemini: 'GOOGLE_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    openai: 'OPENAI_API_KEY',
  },
  search_api_key: {
    tavily: 'TAVILY_API_KEY',
    serper: 'SERPER_API_KEY',
  },
  image_api_key: {
    dalle: 'OPENAI_API_KEY',
    flux: 'REPLICATE_API_TOKEN',
  },
  tts_api_key: {
    elevenlabs: 'ELEVENLABS_API_KEY',
    openai: 'OPENAI_API_KEY',
  },
  video_api_key: {
    runway: 'RUNWAY_API_KEY',
    kling: 'KLING_API_KEY',
  },
  openai_api_key: 'OPENAI_API_KEY',
  replicate_api_key: 'REPLICATE_API_TOKEN',
  elevenlabs_api_key: 'ELEVENLABS_API_KEY',
};

/** Provider field → which settings field selects the provider */
const PROVIDER_FIELD_MAP = {
  llm_api_key: 'llm_provider',
  search_api_key: 'search_provider',
  image_api_key: 'image_provider',
  tts_api_key: 'tts_provider',
  video_api_key: 'video_provider',
};

/**
 * Enrich settings with env var defaults for null/empty API keys.
 * Does NOT overwrite existing DB values.
 */
function enrichWithEnvDefaults(settings) {
  const enriched = { ...settings };

  for (const [field, envMapping] of Object.entries(ENV_KEY_MAP)) {
    if (enriched[field]) continue; // DB value exists, don't override

    if (typeof envMapping === 'string') {
      // Direct mapping (e.g. openai_api_key -> OPENAI_API_KEY)
      enriched[field] = process.env[envMapping] || null;
    } else {
      // Provider-dependent mapping
      const providerField = PROVIDER_FIELD_MAP[field];
      const currentProvider = enriched[providerField];
      const envVar = envMapping[currentProvider];
      if (envVar) {
        enriched[field] = process.env[envVar] || null;
      }
    }
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
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    replicate: !!process.env.REPLICATE_API_TOKEN,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
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
