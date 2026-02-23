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

  // Count topics actively being processed (have pending/processing jobs)
  const activeResult = await pool.query(`
    SELECT COUNT(DISTINCT t.id) AS count
    FROM yt_topics t
    INNER JOIN yt_jobs j ON j.topic_id = t.id AND j.status IN ('pending', 'processing')
    WHERE t.project_id = $1
      AND t.is_deleted = false
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
// Map pipeline_stage → job_type needed to resume a stranded topic.
// visuals_creating is handled specially (needs to restart visual prompts generation).
const STAGE_TO_RESUME_JOB = {
  story_created: 'generate_script',
  script_created: 'generate_visual_prompts',
  visuals_creating: 'generate_visual_prompts',
  visuals_created: 'generate_thumbnails',
  thumbnails_created: 'generate_narration',
  narration_created: 'assemble_video',
};

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

  // CRITICAL: Don't start new topics while others are still in the pipeline.
  // Each topic generates ~100 image jobs ($0.003/each = $0.30/topic).
  // Running multiple in parallel wastes money if one fails.
  if (status.active_pipeline > 0) {
    return { triggered: false, reason: `Pipeline busy (${status.active_pipeline} topic(s) in progress). Waiting for completion before starting new.` };
  }

  // Check buffer — if full, no need to produce more
  if (status.buffer_current >= status.buffer_target) {
    return { triggered: false, reason: `Buffer is full (${status.buffer_current}/${status.buffer_target})` };
  }

  // PRIORITY 0: Resume stranded topics — stuck in intermediate stages with no pending jobs.
  // These are topics that errored and were reset, or whose jobs got lost.
  // Only resume 1 per cycle to keep costs under control.
  const strandedStages = Object.keys(STAGE_TO_RESUME_JOB);
  const stranded = await pool.query(`
    SELECT t.id, t.title, t.pipeline_stage
    FROM yt_topics t
    WHERE t.project_id = $1
      AND t.pipeline_stage = ANY($2)
      AND t.is_deleted = false
      AND t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM yt_jobs j
        WHERE j.topic_id = t.id AND j.status IN ('pending', 'processing')
      )
    ORDER BY t.updated_at ASC
    LIMIT 1
  `, [projectId, strandedStages]);

  if (stranded.rows.length > 0) {
    const topic = stranded.rows[0];
    const resumeJob = STAGE_TO_RESUME_JOB[topic.pipeline_stage];
    console.log(`[ContentEngine] Resuming stranded topic ${topic.id}: "${topic.title}" (stage: ${topic.pipeline_stage} → ${resumeJob})`);
    await triggerPipelineFromTopic(projectId, topic.id, resumeJob);
    return {
      triggered: true,
      generated: 1,
      topics: [{ topicId: topic.id, title: topic.title, source: 'stranded', resumeJob }],
      buffer_status: `${status.buffer_current}/${status.buffer_target}`,
    };
  }

  // Check daily limit — only applies to PRIORITY 1 and 2 (new topic generation)
  if (status.gen_today >= status.max_gen) {
    return { triggered: false, reason: `Daily limit reached (${status.gen_today}/${status.max_gen})` };
  }

  // PRIORITY 1: Advance existing topics stuck at 'topics_generated' before creating new ones.
  // These already have richness scores — just need to enter the pipeline.
  const minRichness = status.min_richness_score || ENGINE_DEFAULTS.min_richness_score;
  const stuckTopics = await pool.query(`
    SELECT id, title, richness_score
    FROM yt_topics
    WHERE project_id = $1
      AND pipeline_stage = 'topics_generated'
      AND is_deleted = false
      AND richness_score >= $2
    ORDER BY richness_score DESC, created_at ASC
    LIMIT 1
  `, [projectId, minRichness]);

  if (stuckTopics.rows.length > 0) {
    const topic = stuckTopics.rows[0];
    console.log(`[ContentEngine] Advancing stuck topic ${topic.id}: "${topic.title}" (richness: ${topic.richness_score})`);
    await triggerPipelineFromTopic(projectId, topic.id, 'generate_story');
    return {
      triggered: true,
      generated: 1,
      topics: [{ topicId: topic.id, title: topic.title, richness: topic.richness_score, source: 'existing' }],
      buffer_status: `${status.buffer_current + 1}/${status.buffer_target}`,
    };
  }

  // PRIORITY 2: Generate new topics from processed sources
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
    return { triggered: false, reason: 'No processed sources and no stuck topics to advance' };
  }

  const generated = [];

  // Generate exactly 1 topic per trigger — one at a time for cost safety
  for (let i = 0; i < 1 && i < sourcesResult.rows.length; i++) {
    const source = sourcesResult.rows[i];
    try {
      const topics = await generateTopicsFromSource(projectId, source.id);
      const qualifiedTopics = topics
        .filter(t => (t.richness_score || 0) >= minRichness)
        .sort((a, b) => (b.richness_score || 0) - (a.richness_score || 0));

      const bestTopic = qualifiedTopics[0];
      if (bestTopic) {
        await triggerPipelineFromTopic(projectId, bestTopic.id, 'generate_story');
        generated.push({ topicId: bestTopic.id, title: bestTopic.title, richness: bestTopic.richness_score });
        break;
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
