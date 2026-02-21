/**
 * Content Engine Service - Cron-based automatic content generation.
 *
 * The Content Engine:
 * 1. Monitors the source pool for each project
 * 2. Automatically discovers stories from accumulated sources
 * 3. Maintains a buffer of ready-to-publish videos
 * 4. Respects daily generation limits (from DB settings)
 * 5. Runs on a configurable schedule (default: every 30 minutes)
 *
 * Settings used from yt_project_settings:
 * - content_engine_active: boolean
 * - content_engine_buffer_size: integer (default 7)
 * - content_engine_max_gen_per_day: integer (default 5)
 * - min_richness_score: integer (default 5)
 */
import { db } from '../../db.js';
import { getProjectSettings } from './settings-helper.js';
import { triggerPipelineFromTopic } from './pipeline-orchestrator.js';
import { generateTopicsFromSource } from './topic-generator.js';

// Default engine configuration (fallback when DB values are null)
const ENGINE_DEFAULTS = {
  buffer_target: 7,
  max_gen_per_day: 3,
  min_richness_score: 5,
  check_interval_ms: 3600000, // 1 hour
};

/**
 * Get engine config from project settings, falling back to ENGINE_DEFAULTS.
 */
async function getEngineConfig(projectId) {
  const settings = await getProjectSettings(projectId);
  return {
    buffer_target: settings.content_engine_buffer_size || ENGINE_DEFAULTS.buffer_target,
    max_gen_per_day: settings.content_engine_max_gen_per_day || ENGINE_DEFAULTS.max_gen_per_day,
    min_richness_score: settings.min_richness_score || ENGINE_DEFAULTS.min_richness_score,
    active: settings.content_engine_active !== false, // default true
  };
}

let _engineInterval = null;
let _engineIntervalMs = ENGINE_DEFAULTS.check_interval_ms;
let _lastCronRun = null;

/**
 * Get content engine status for a project.
 * @param {string} projectId
 * @returns {Promise<Object>} Engine status
 */
export async function getEngineStatus(projectId) {
  const pool = db.analytics;
  const config = await getEngineConfig(projectId);

  // Count videos in buffer (video_assembled + queued_for_publishing)
  const bufferResult = await pool.query(`
    SELECT COUNT(*) AS count
    FROM yt_topics
    WHERE project_id = $1
      AND pipeline_stage IN ('video_assembled', 'queued_for_publishing')
      AND is_deleted = false
  `, [projectId]);

  // Count topics generated today
  const todayResult = await pool.query(`
    SELECT COUNT(*) AS count
    FROM yt_topics
    WHERE project_id = $1
      AND created_at >= CURRENT_DATE
      AND is_deleted = false
  `, [projectId]);

  // Count active pipeline items
  const activeResult = await pool.query(`
    SELECT COUNT(*) AS count
    FROM yt_topics
    WHERE project_id = $1
      AND pipeline_stage NOT IN ('published', 'error', 'discarded', 'rejected', 'idea')
      AND is_deleted = false
  `, [projectId]);

  // Get project paused state
  const projectResult = await pool.query(
    'SELECT pipeline_paused FROM yt_projects WHERE id = $1',
    [projectId],
  );

  const isPaused = projectResult.rows[0]?.pipeline_paused || false;
  const bufferCurrent = parseInt(bufferResult.rows[0].count, 10);
  const genToday = parseInt(todayResult.rows[0].count, 10);
  const activePipeline = parseInt(activeResult.rows[0].count, 10);

  // Calculate next run based on actual last cron execution
  const engineActive = !isPaused && config.active;
  let nextRun = null;
  if (engineActive && _lastCronRun) {
    nextRun = new Date(_lastCronRun.getTime() + _engineIntervalMs);
  } else if (engineActive) {
    // Engine just started, first run is interval from now
    nextRun = new Date(Date.now() + _engineIntervalMs);
  }

  return {
    active: engineActive,
    buffer_current: bufferCurrent,
    buffer_target: config.buffer_target,
    gen_today: genToday,
    max_gen: config.max_gen_per_day,
    min_richness_score: config.min_richness_score,
    active_pipeline: activePipeline,
    next_run: nextRun ? nextRun.toISOString() : null,
  };
}

/**
 * Trigger the content engine for a specific project.
 * Generates new topics from pool sources if buffer is below target.
 * @param {string} projectId
 * @returns {Promise<Object>} Result of the trigger
 */
export async function triggerEngine(projectId) {
  const pool = db.analytics;

  // Check if project is paused
  const projectResult = await pool.query(
    'SELECT pipeline_paused FROM yt_projects WHERE id = $1',
    [projectId],
  );
  if (projectResult.rows[0]?.pipeline_paused) {
    return { triggered: false, reason: 'Engine is paused' };
  }

  // Get current status (uses DB settings for buffer_target, max_gen, min_richness)
  const status = await getEngineStatus(projectId);

  // Check if engine is disabled in settings
  if (!status.active) {
    return { triggered: false, reason: 'Engine is disabled in settings' };
  }

  // Check daily limit
  if (status.gen_today >= status.max_gen) {
    return { triggered: false, reason: `Daily limit reached (${status.gen_today}/${status.max_gen})` };
  }

  // Check buffer
  if (status.buffer_current >= status.buffer_target) {
    return { triggered: false, reason: `Buffer is full (${status.buffer_current}/${status.buffer_target})` };
  }

  // CRITICAL: Don't start new topics while others are still in the pipeline.
  // Each topic generates ~100 image jobs ($0.003/each = $0.30/topic).
  // Running multiple in parallel wastes money if one fails.
  if (status.active_pipeline > 0) {
    return { triggered: false, reason: `Pipeline busy (${status.active_pipeline} topic(s) in progress). Waiting for completion before starting new.` };
  }

  // Get processed sources from the pool
  const sourcesResult = await pool.query(`
    SELECT id, processed_content
    FROM yt_content_sources
    WHERE project_id = $1
      AND status = 'processed'
      AND is_deleted = false
    ORDER BY created_at DESC
    LIMIT 10
  `, [projectId]);

  if (sourcesResult.rows.length === 0) {
    return { triggered: false, reason: 'No processed sources in pool' };
  }

  // Generate exactly 1 topic per trigger.
  // The engine runs periodically and will generate more on the next cycle.
  // This ensures each topic completes its full pipeline before starting another,
  // preventing wasted API credits on parallel failures.
  const needed = 1;

  const minRichness = status.min_richness_score || ENGINE_DEFAULTS.min_richness_score;
  const generated = [];

  // Pick sources and generate topics
  for (let i = 0; i < needed && i < sourcesResult.rows.length; i++) {
    const source = sourcesResult.rows[i];
    try {
      const topics = await generateTopicsFromSource(projectId, source.id);
      // Pick best topic that meets minimum richness score
      const qualifiedTopics = topics
        .filter(t => (t.richness_score || 0) >= minRichness)
        .sort((a, b) => (b.richness_score || 0) - (a.richness_score || 0));

      // Only pick the SINGLE best topic — never start multiple pipelines at once
      const bestTopic = qualifiedTopics[0];
      if (bestTopic) {
        await triggerPipelineFromTopic(projectId, bestTopic.id, 'generate_story');
        generated.push({ topicId: bestTopic.id, title: bestTopic.title, richness: bestTopic.richness_score });
        break; // Stop after first successful topic — one at a time
      } else {
        console.log(`[ContentEngine] Source ${source.id}: No topics met min richness score ${minRichness}`);
      }
    } catch (err) {
      console.error(`[ContentEngine] Error generating from source ${source.id}:`, err.message);
    }
  }

  return {
    triggered: true,
    generated: generated.length,
    topics: generated,
    buffer_status: `${status.buffer_current + generated.length}/${status.buffer_target}`,
  };
}

/**
 * Pause the content engine for a project.
 * @param {string} projectId
 */
export async function pauseEngine(projectId) {
  await db.analytics.query(
    'UPDATE yt_projects SET pipeline_paused = true, updated_at = NOW() WHERE id = $1',
    [projectId],
  );
}

/**
 * Resume the content engine for a project.
 * @param {string} projectId
 */
export async function resumeEngine(projectId) {
  await db.analytics.query(
    'UPDATE yt_projects SET pipeline_paused = false, updated_at = NOW() WHERE id = $1',
    [projectId],
  );
}

/**
 * Run the content engine cron across all active projects.
 * Called periodically by the main server.
 */
export async function runContentEngineCron() {
  _lastCronRun = new Date();
  const pool = db.analytics;

  // Only run for active, non-paused projects that have content_engine_active enabled
  const { rows: projects } = await pool.query(`
    SELECT p.id FROM yt_projects p
    LEFT JOIN yt_project_settings s ON s.project_id = p.id
    WHERE p.status = 'active'
      AND p.pipeline_paused = false
      AND COALESCE(s.content_engine_active, true) = true
  `);

  for (const project of projects) {
    try {
      const result = await triggerEngine(project.id);
      if (result.triggered && result.generated > 0) {
        console.log(`[ContentEngine] Project ${project.id}: Generated ${result.generated} new topic(s)`);
      }
    } catch (err) {
      console.error(`[ContentEngine] Error for project ${project.id}:`, err.message);
    }
  }
}

/**
 * Start the content engine cron loop.
 * @param {number} intervalMs - Check interval in milliseconds (default: 30 minutes)
 */
export function startContentEngine(intervalMs = ENGINE_DEFAULTS.check_interval_ms) {
  if (_engineInterval) {
    clearInterval(_engineInterval);
  }
  _engineIntervalMs = intervalMs;
  _lastCronRun = new Date(); // Mark engine start as first reference point
  _engineInterval = setInterval(runContentEngineCron, intervalMs);
  console.log(`[ContentEngine] Started with interval: ${intervalMs / 1000}s`);
}

/**
 * Stop the content engine cron.
 */
export function stopContentEngine() {
  if (_engineInterval) {
    clearInterval(_engineInterval);
    _engineInterval = null;
    console.log('[ContentEngine] Stopped');
  }
}
