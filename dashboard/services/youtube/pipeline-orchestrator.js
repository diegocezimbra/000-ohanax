import { db } from '../../db.js';
import { enqueueJob, cancelJobsForTopic } from './job-queue.js';

// STAGE_FLOW topicStage values MUST match the DB CHECK constraint on yt_topics.pipeline_stage:
// 'idea','topics_generated','story_created','script_created',
// 'visuals_creating','visuals_created','thumbnails_created','narration_created',
// 'video_assembled','queued_for_publishing','published','error','discarded'
const STAGE_FLOW = {
  extract_source: { nextJobType: 'web_research_source', topicStage: null },
  web_research_source: { nextJobType: 'generate_topics', topicStage: null },
  generate_topics: { nextJobType: 'generate_story', topicStage: 'idea', fanOut: true },
  generate_story: { nextJobType: 'generate_script', topicStage: 'story_created' },
  generate_script: {
    nextJobType: 'generate_visual_prompts',
    topicStage: 'script_created',
    conditionalJobType: 'expand_script',
  },
  expand_script: { nextJobType: 'generate_visual_prompts', topicStage: 'script_created' },
  generate_visual_prompts: {
    nextJobType: 'generate_visual_asset',
    topicStage: 'visuals_creating',
    fanOut: true,
  },
  generate_visual_asset: {
    nextJobType: 'generate_thumbnails',
    topicStage: 'visuals_created',
    awaitAll: true,
  },
  generate_thumbnails: { nextJobType: 'generate_narration', topicStage: 'thumbnails_created' },
  generate_narration: { nextJobType: 'assemble_video', topicStage: 'narration_created' },
  assemble_video: { nextJobType: null, topicStage: 'queued_for_publishing', terminal: true },
  publish_video: { nextJobType: null, topicStage: 'published', terminal: true },
};

/**
 * Called by the worker after every successful job completion.
 * Determines and enqueues the next step(s) in the pipeline.
 */
export async function onJobCompleted(job) {
  const config = STAGE_FLOW[job.job_type];
  if (!config) return;

  const result = job.result || {};

  // Update topic pipeline_stage if applicable
  if (config.topicStage && job.topic_id) {
    await updateTopicStage(job.topic_id, config.topicStage);
  }

  // Handle fan-out: generate_topics creates N story jobs
  if (job.job_type === 'generate_topics' && config.fanOut) {
    const topicIds = result.qualifying_topic_ids || [];
    for (const topicId of topicIds) {
      await enqueueJob({
        projectId: job.project_id,
        topicId,
        jobType: 'generate_story',
        payload: { topicId },
      });
    }
    return;
  }

  // Handle conditional: script may need expansion
  if (job.job_type === 'generate_script' && result.needs_expansion) {
    await enqueueJob({
      projectId: job.project_id,
      topicId: job.topic_id,
      jobType: 'expand_script',
      payload: { topicId: job.topic_id, scriptId: result.scriptId },
    });
    return;
  }

  // Handle fan-out: visual prompts create N asset generation jobs
  if (job.job_type === 'generate_visual_prompts' && config.fanOut) {
    const assetIds = result.asset_ids || [];
    for (const assetId of assetIds) {
      await enqueueJob({
        projectId: job.project_id,
        topicId: job.topic_id,
        jobType: 'generate_visual_asset',
        payload: { assetId, topicId: job.topic_id },
      });
    }
    return;
  }

  // Handle await-all: wait for all visual assets before continuing
  if (job.job_type === 'generate_visual_asset' && config.awaitAll) {
    const allDone = await checkAllVisualsComplete(job.topic_id);
    if (!allDone) return; // Wait for siblings
    await updateTopicStage(job.topic_id, 'visuals_created');
    await enqueueJob({
      projectId: job.project_id,
      topicId: job.topic_id,
      jobType: 'generate_thumbnails',
      payload: { topicId: job.topic_id },
    });
    return;
  }

  // Handle terminal: assemble_video creates publication entry
  if (job.job_type === 'assemble_video' && config.terminal) {
    await createPublicationEntry(job);
    return;
  }

  // Handle terminal: publish_video is the end
  if (job.job_type === 'publish_video') return;

  // Default: enqueue the next job in the chain
  if (config.nextJobType) {
    await enqueueJob({
      projectId: job.project_id,
      topicId: job.topic_id,
      sourceId: job.source_id,
      jobType: config.nextJobType,
      payload: {
        topicId: job.topic_id,
        sourceId: job.source_id,
        ...(result.forwardPayload || {}),
      },
    });
  }
}

/**
 * Trigger pipeline from a newly added content source.
 */
export async function triggerPipelineFromSource(projectId, sourceId) {
  return enqueueJob({
    projectId,
    sourceId,
    jobType: 'extract_source',
    payload: { sourceId },
  });
}

/**
 * Trigger pipeline from a topic (manual creation or reprocess).
 */
export async function triggerPipelineFromTopic(projectId, topicId, startStage = 'generate_story') {
  await cancelJobsForTopic(topicId);
  return enqueueJob({
    projectId,
    topicId,
    jobType: startStage,
    payload: { topicId },
  });
}

/**
 * Restart pipeline from a specific stage.
 */
export async function restartPipelineFromStage(projectId, topicId, stage) {
  const validStages = [
    'generate_story', 'generate_script', 'generate_visual_prompts',
    'generate_thumbnails', 'generate_narration', 'assemble_video',
  ];
  if (!validStages.includes(stage)) {
    throw new Error(`Invalid restart stage: ${stage}`);
  }
  await cancelJobsForTopic(topicId);
  return enqueueJob({
    projectId, topicId,
    jobType: stage,
    payload: { topicId },
  });
}

/**
 * Calculate next available publish slot respecting:
 * - max_publications_per_day (daily limit)
 * - publication_times (allowed time slots)
 * - publication_days (allowed days of week: ["Mon","Tue","Wed",...])
 * - publication_timezone (for correct day/time calculation)
 * - auto_publish (if false, returns null — manual only)
 */
export async function calculateNextPublishSlot(projectId) {
  const settings = await db.analytics.query(
    'SELECT * FROM yt_project_settings WHERE project_id = $1', [projectId]
  );
  if (!settings.rows[0]) return null;

  const {
    max_publications_per_day,
    publication_times,
    publication_days,
    publication_timezone,
    auto_publish,
  } = settings.rows[0];

  // If auto_publish is explicitly disabled, don't schedule
  if (auto_publish === false) return null;

  // Parse publication_days (JSONB array of day abbreviations: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"])
  let allowedDays = null;
  if (publication_days) {
    const days = typeof publication_days === 'string' ? JSON.parse(publication_days) : publication_days;
    if (Array.isArray(days) && days.length > 0) {
      // Map day abbreviations to JS getDay() numbers (0=Sun, 1=Mon, ..., 6=Sat)
      const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      allowedDays = new Set(days.map(d => dayMap[d]).filter(d => d !== undefined));
    }
  }

  // Parse publication_times (JSONB array of "HH:MM" strings)
  const times = publication_times
    ? (typeof publication_times === 'string' ? JSON.parse(publication_times) : publication_times)
    : ['10:00', '14:00', '18:00']; // sensible defaults

  // Timezone offset helper: get current date/time in the project's timezone
  const tzOffset = getTimezoneOffsetMs(publication_timezone || 'America/Sao_Paulo');

  // Get count of already scheduled/published for future dates
  const scheduled = await db.analytics.query(`
    SELECT scheduled_for::date as pub_date, COUNT(*) as cnt
    FROM yt_publications
    WHERE project_id = $1
      AND status IN ('scheduled', 'publishing', 'published', 'approved')
      AND scheduled_for >= CURRENT_DATE
    GROUP BY pub_date
    ORDER BY pub_date
  `, [projectId]);

  const dateCounts = {};
  for (const row of scheduled.rows) {
    dateCounts[row.pub_date] = parseInt(row.cnt);
  }

  const maxPerDay = max_publications_per_day || 3;
  const now = new Date();

  // Search up to 60 days ahead
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);

    // Check if this day of week is allowed
    if (allowedDays && !allowedDays.has(date.getDay())) {
      continue; // Skip disallowed days
    }

    const dateStr = date.toISOString().split('T')[0];
    const count = dateCounts[dateStr] || 0;

    if (count < maxPerDay) {
      // Find next available time on this day
      for (const time of times) {
        const [hours, minutes] = String(time).split(':').map(Number);
        const slotDate = new Date(date);
        slotDate.setHours(hours, minutes, 0, 0);

        // Apply timezone offset (convert project-local time to UTC for storage)
        const slotUtc = new Date(slotDate.getTime() - tzOffset);

        if (slotUtc > now) {
          return slotUtc;
        }
      }
    }
  }
  return null;
}

/**
 * Get timezone offset in milliseconds for common timezones.
 * Positive means ahead of UTC.
 */
function getTimezoneOffsetMs(timezone) {
  const offsets = {
    'America/Sao_Paulo': -3 * 3600000,
    'America/New_York': -5 * 3600000,
    'Europe/Lisbon': 0,
    'UTC': 0,
  };
  return offsets[timezone] || offsets['America/Sao_Paulo'];
}

// --- Internal helpers ---

// Ordered pipeline stages — used to prevent regression
const STAGE_ORDER = [
  'idea', 'topics_generated', 'story_created', 'script_created',
  'visuals_creating', 'visuals_created', 'thumbnails_created',
  'narration_created', 'video_assembled', 'queued_for_publishing', 'published',
];

async function updateTopicStage(topicId, stage) {
  // Only advance — never regress the pipeline stage
  const current = await db.analytics.query(
    'SELECT pipeline_stage FROM yt_topics WHERE id = $1', [topicId]
  );
  if (current.rows[0]) {
    const currentIdx = STAGE_ORDER.indexOf(current.rows[0].pipeline_stage);
    const newIdx = STAGE_ORDER.indexOf(stage);
    if (currentIdx >= 0 && newIdx >= 0 && newIdx <= currentIdx) {
      return; // Already at or past this stage — skip
    }
  }
  await db.analytics.query(
    'UPDATE yt_topics SET pipeline_stage = $2, pipeline_error = NULL, updated_at = NOW() WHERE id = $1',
    [topicId, stage]
  );
}

async function checkAllVisualsComplete(topicId) {
  const result = await db.analytics.query(`
    SELECT
      COUNT(*) FILTER (WHERE va.status = 'completed') as done,
      COUNT(*) as total
    FROM yt_visual_assets va
    JOIN yt_script_segments ss ON va.segment_id = ss.id
    JOIN yt_scripts s ON ss.script_id = s.id
    WHERE s.topic_id = $1 AND va.is_selected = true
  `, [topicId]);
  const { done, total } = result.rows[0];
  return parseInt(total) > 0 && parseInt(done) === parseInt(total);
}

async function createPublicationEntry(job) {
  const result = job.result || {};
  const script = await db.analytics.query(
    'SELECT youtube_title, youtube_description, youtube_tags FROM yt_scripts WHERE topic_id = $1',
    [job.topic_id]
  );
  const video = await db.analytics.query(
    'SELECT id FROM yt_final_videos WHERE topic_id = $1',
    [job.topic_id]
  );
  const thumbnail = await db.analytics.query(
    'SELECT id FROM yt_thumbnails WHERE topic_id = $1 AND is_selected = true LIMIT 1',
    [job.topic_id]
  );

  if (!video.rows[0]) return;

  const scriptData = script.rows[0] || {};
  await db.analytics.query(`
    INSERT INTO yt_publications (
      project_id, topic_id, video_id,
      youtube_title, youtube_description, youtube_tags, status
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_review')
  `, [
    job.project_id, job.topic_id, video.rows[0].id,
    scriptData.youtube_title, scriptData.youtube_description,
    scriptData.youtube_tags,
  ]);
}
