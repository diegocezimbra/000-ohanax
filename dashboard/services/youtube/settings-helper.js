/**
 * Settings Helper - Loads project settings with caching.
 * Used by all pipeline services to get AI provider configs.
 */
import { db } from '../../db.js';

// In-memory cache: projectId -> { settings, loadedAt }
const cache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute

/**
 * Get project settings, with short-lived cache.
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

  const settings = rows[0];
  cache.set(projectId, { settings, loadedAt: Date.now() });
  return settings;
}

/**
 * Invalidate cached settings (call after settings update).
 * @param {string} projectId
 */
export function invalidateSettingsCache(projectId) {
  cache.delete(projectId);
}
