import { Router } from 'express';
import { db } from '../../db.js';
import { restartPipelineFromStage, calculateNextPublishSlot } from '../../services/youtube/pipeline-orchestrator.js';

const router = Router({ mergeParams: true });

// =============================================================================
// HELPERS
// =============================================================================

function getProjectId(req) {
  return req.params.projectId;
}

// =============================================================================
// GET / - Kanban board data (topics grouped by pipeline_stage)
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const projectId = getProjectId(req);

    const topicsResult = await db.analytics.query(`
      SELECT
        t.id, t.title, t.richness_score,
        t.pipeline_stage, t.pipeline_error,
        t.created_at, t.updated_at
      FROM yt_topics t
      WHERE t.project_id = $1 AND t.is_deleted = false
      ORDER BY t.created_at DESC
    `, [projectId]);

    const activeJobsResult = await db.analytics.query(`
      SELECT topic_id, job_type, status
      FROM yt_jobs
      WHERE project_id = $1 AND status IN ('pending', 'processing')
    `, [projectId]);

    const activeJobsByTopic = {};
    for (const job of activeJobsResult.rows) {
      if (!job.topic_id) continue;
      if (!activeJobsByTopic[job.topic_id]) {
        activeJobsByTopic[job.topic_id] = [];
      }
      activeJobsByTopic[job.topic_id].push({
        jobType: job.job_type,
        status: job.status,
      });
    }

    const stages = {};
    for (const topic of topicsResult.rows) {
      const stage = topic.pipeline_stage;
      if (!stages[stage]) stages[stage] = [];
      stages[stage].push({
        ...topic,
        activeJobs: activeJobsByTopic[topic.id] || [],
      });
    }

    res.json({ success: true, data: { stages } });
  } catch (err) {
    console.error('[Pipeline] Error fetching kanban:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /stats - Pipeline statistics
// =============================================================================
router.get('/stats', async (req, res) => {
  try {
    const projectId = getProjectId(req);

    const stageResult = await db.analytics.query(`
      SELECT pipeline_stage, COUNT(*) AS count
      FROM yt_topics
      WHERE project_id = $1 AND is_deleted = false
      GROUP BY pipeline_stage
    `, [projectId]);

    const stageMap = {};
    for (const row of stageResult.rows) {
      stageMap[row.pipeline_stage] = parseInt(row.count);
    }

    const jobResult = await db.analytics.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed
      FROM yt_jobs
      WHERE project_id = $1
    `, [projectId]);

    const projectResult = await db.analytics.query(
      'SELECT pipeline_paused FROM yt_projects WHERE id = $1',
      [projectId]
    );

    const isPaused = projectResult.rows[0]?.pipeline_paused || false;

    res.json({
      success: true,
      data: {
        stages: stageMap,
        jobs: {
          pending: parseInt(jobResult.rows[0].pending),
          processing: parseInt(jobResult.rows[0].processing),
          failed: parseInt(jobResult.rows[0].failed),
        },
        isPaused,
      },
    });
  } catch (err) {
    console.error('[Pipeline] Error fetching stats:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /activity - Recent pipeline activity
// =============================================================================
router.get('/activity', async (req, res) => {
  try {
    const projectId = getProjectId(req);

    const result = await db.analytics.query(`
      SELECT
        j.id, j.job_type, j.status,
        j.topic_id, j.error_message,
        j.started_at, j.completed_at, j.created_at,
        t.title AS topic_title
      FROM yt_jobs j
      LEFT JOIN yt_topics t ON j.topic_id = t.id
      WHERE j.project_id = $1
        AND j.status IN ('completed', 'failed')
      ORDER BY j.completed_at DESC NULLS LAST
      LIMIT 50
    `, [projectId]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[Pipeline] Error fetching activity:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /pause - Pause pipeline
// =============================================================================
router.post('/pause', async (req, res) => {
  try {
    const projectId = getProjectId(req);

    await db.analytics.query(
      'UPDATE yt_projects SET pipeline_paused = true, updated_at = NOW() WHERE id = $1',
      [projectId]
    );

    res.json({ success: true, data: { paused: true } });
  } catch (err) {
    console.error('[Pipeline] Error pausing pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /resume - Resume pipeline
// =============================================================================
router.post('/resume', async (req, res) => {
  try {
    const projectId = getProjectId(req);

    await db.analytics.query(
      'UPDATE yt_projects SET pipeline_paused = false, updated_at = NOW() WHERE id = $1',
      [projectId]
    );

    res.json({ success: true, data: { paused: false } });
  } catch (err) {
    console.error('[Pipeline] Error resuming pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /bulk/reprocess - Bulk reprocess topics from a given stage
// =============================================================================
router.post('/bulk/reprocess', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { topic_ids, from_stage } = req.body;

    if (!Array.isArray(topic_ids) || topic_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'topic_ids array is required' });
    }

    if (!from_stage) {
      return res.status(400).json({ success: false, error: 'from_stage is required' });
    }

    const results = [];
    const errors = [];

    for (const topicId of topic_ids) {
      try {
        await restartPipelineFromStage(projectId, topicId, from_stage);
        results.push({ topicId, status: 'reprocessing' });
      } catch (err) {
        errors.push({ topicId, error: err.message });
      }
    }

    res.json({ success: true, data: { processed: results, errors } });
  } catch (err) {
    console.error('[Pipeline] Error bulk reprocessing:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /bulk/reject - Bulk reject topics
// =============================================================================
router.post('/bulk/reject', async (req, res) => {
  try {
    const { topic_ids } = req.body;

    if (!Array.isArray(topic_ids) || topic_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'topic_ids array is required' });
    }

    const result = await db.analytics.query(`
      UPDATE yt_topics
      SET pipeline_stage = 'rejected', updated_at = NOW()
      WHERE id = ANY($1::uuid[])
      RETURNING id
    `, [topic_ids]);

    res.json({
      success: true,
      data: { rejectedCount: result.rowCount },
    });
  } catch (err) {
    console.error('[Pipeline] Error bulk rejecting:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /bulk/approve - Bulk approve topics for publication
// =============================================================================
router.post('/bulk/approve', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { topic_ids } = req.body;

    if (!Array.isArray(topic_ids) || topic_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'topic_ids array is required' });
    }

    const pubs = await db.analytics.query(`
      SELECT id, topic_id, status
      FROM yt_publications
      WHERE topic_id = ANY($1::uuid[]) AND status = 'queued'
    `, [topic_ids]);

    const approved = [];
    const errors = [];

    for (const pub of pubs.rows) {
      try {
        const scheduledAt = await calculateNextPublishSlot(projectId);

        await db.analytics.query(`
          UPDATE yt_publications
          SET status = 'scheduled', scheduled_for = $2, updated_at = NOW()
          WHERE id = $1
        `, [pub.id, scheduledAt]);

        await db.analytics.query(
          `UPDATE yt_topics SET pipeline_stage = 'scheduled', updated_at = NOW() WHERE id = $1`,
          [pub.topic_id]
        );

        approved.push({ pubId: pub.id, topicId: pub.topic_id, scheduledAt });
      } catch (err) {
        errors.push({ pubId: pub.id, topicId: pub.topic_id, error: err.message });
      }
    }

    res.json({ success: true, data: { approved, errors } });
  } catch (err) {
    console.error('[Pipeline] Error bulk approving:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
