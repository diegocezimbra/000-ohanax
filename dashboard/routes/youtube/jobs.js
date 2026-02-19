import { Router } from 'express';
import { db } from '../../db.js';
import {
  getQueueStats,
  getQueueStatsByType,
  getJobLogs,
  listJobs,
  getJob,
  cancelJob,
} from '../../services/youtube/job-queue.js';

const router = Router({ mergeParams: true });

// =============================================================================
// GET / - List jobs with filters
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { status, job_type, project_id, limit, offset } = req.query;

    const jobs = await listJobs({
      projectId: project_id || null,
      status: status || null,
      jobType: job_type || null,
      limit: Math.min(parseInt(limit) || 50, 200),
      offset: Math.max(parseInt(offset) || 0, 0),
    });

    res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('[Jobs] Error listing jobs:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /stats - Global job stats
// =============================================================================
router.get('/stats', async (req, res) => {
  try {
    const { project_id } = req.query;

    const [overall, byType] = await Promise.all([
      getQueueStats(project_id || null),
      getQueueStatsByType(project_id || null),
    ]);

    res.json({
      success: true,
      data: {
        overall: {
          pending: parseInt(overall.pending),
          processing: parseInt(overall.processing),
          completed24h: parseInt(overall.completed_24h),
          failed: parseInt(overall.failed),
          cancelled: parseInt(overall.cancelled),
        },
        byType,
      },
    });
  } catch (err) {
    console.error('[Jobs] Error fetching stats:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /:jobId - Job detail with logs
// =============================================================================
router.get('/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const [job, logs] = await Promise.all([
      getJob(jobId),
      getJobLogs(jobId),
    ]);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: { ...job, logs } });
  } catch (err) {
    console.error('[Jobs] Error fetching job:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /:jobId/retry - Retry failed job
// =============================================================================
router.post('/:jobId/retry', async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: `Cannot retry job with status '${job.status}'`,
      });
    }

    await db.analytics.query(`
      UPDATE yt_jobs
      SET status = 'pending',
          error_message = NULL,
          error_stack = NULL,
          locked_by = NULL,
          locked_at = NULL,
          attempt = 0,
          run_after = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `, [jobId]);

    res.json({ success: true, data: { jobId, status: 'pending' } });
  } catch (err) {
    console.error('[Jobs] Error retrying job:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /:jobId/cancel - Cancel pending job
// =============================================================================
router.post('/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;

    const cancelled = await cancelJob(jobId);

    if (!cancelled) {
      return res.status(400).json({
        success: false,
        error: 'Job not found or not in a cancellable status',
      });
    }

    res.json({ success: true, data: { jobId, status: 'cancelled' } });
  } catch (err) {
    console.error('[Jobs] Error cancelling job:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
