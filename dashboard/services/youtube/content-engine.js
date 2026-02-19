/**
 * Content Engine Service - Cron-based automatic content generation.
 *
 * The Content Engine:
 * 1. Monitors the source pool for each project
 * 2. Automatically discovers stories from accumulated sources
 * 3. Maintains a buffer of ready-to-publish videos
 * 4. Respects daily generation limits
 * 5. Runs on a configurable schedule (default: every 30 minutes)
 */
import { db } from '../../db.js';
import { getProjectSettings } from './settings-helper.js';
import { triggerPipelineFromTopic } from './pipeline-orchestrator.js';
import { generateTopicsFromSource } from './topic-generator.js';

// Default engine configuration
const ENGINE_DEFAULTS = {
  buffer_target: 7,         // Keep 7 videos ready in buffer
  max_gen_per_day: 5,       // Max 5 new topics per day
  check_interval_ms: 1800000, // 30 minutes
};

let _engineInterval = null;

/**
 * Get content engine status for a project.
 * @param {string} projectId
 * @returns {Promise<Object>} Engine status
 */
export async function getEngineStatus(projectId) {
  const pool = db.analytics;

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

  // Calculate next run
  const nextRun = isPaused ? null : new Date(Date.now() + ENGINE_DEFAULTS.check_interval_ms);

  return {
    active: !isPaused,
    buffer_current: bufferCurrent,
    buffer_target: ENGINE_DEFAULTS.buffer_target,
    gen_today: genToday,
    max_gen: ENGINE_DEFAULTS.max_gen_per_day,
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

  // Get current status
  const status = await getEngineStatus(projectId);

  // Check daily limit
  if (status.gen_today >= status.max_gen) {
    return { triggered: false, reason: `Daily limit reached (${status.gen_today}/${status.max_gen})` };
  }

  // Check buffer
  if (status.buffer_current >= status.buffer_target) {
    return { triggered: false, reason: `Buffer is full (${status.buffer_current}/${status.buffer_target})` };
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

  // How many new topics to generate
  const needed = Math.min(
    status.buffer_target - status.buffer_current,
    status.max_gen - status.gen_today,
    3, // Max 3 per trigger to avoid overload
  );

  const generated = [];

  // Pick random sources to generate topics from
  for (let i = 0; i < needed && i < sourcesResult.rows.length; i++) {
    const source = sourcesResult.rows[i];
    try {
      const topics = await generateTopicsFromSource(projectId, source.id);
      // Pick best topic (highest richness score) and start pipeline
      const bestTopic = topics.sort((a, b) => (b.richness_score || 0) - (a.richness_score || 0))[0];
      if (bestTopic) {
        await triggerPipelineFromTopic(projectId, bestTopic.id, 'generate_story');
        generated.push({ topicId: bestTopic.id, title: bestTopic.title });
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
  const pool = db.analytics;

  const { rows: projects } = await pool.query(`
    SELECT id FROM yt_projects
    WHERE status = 'active' AND pipeline_paused = false
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
