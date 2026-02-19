import { Router } from 'express';
import { db } from '../../db.js';
import { enqueueJob } from '../../services/youtube/job-queue.js';
import { getPresignedUrl } from '../../services/youtube/s3.js';

const router = Router({ mergeParams: true });

// GET / - Final video info for topic
router.get('/', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT id, topic_id, s3_key, duration_seconds, file_size_mb, resolution,
        created_at, updated_at
      FROM yt_final_videos WHERE topic_id = $1
    `, [req.params.topicId]);

    if (!result.rows[0]) {
      return res.json({ success: true, data: null, message: 'No video assembled yet' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Videos] Error fetching video:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /assemble - Trigger video assembly
router.post('/assemble', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const job = await enqueueJob({
      projectId, topicId,
      jobType: 'assemble_video',
      payload: { topicId },
    });
    res.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    console.error('[Videos] Error triggering assembly:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /reassemble - Re-assemble after changes
router.post('/reassemble', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const job = await enqueueJob({
      projectId, topicId,
      jobType: 'assemble_video',
      payload: { topicId, reassemble: true },
    });
    res.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    console.error('[Videos] Error triggering reassembly:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /download - Return presigned URL for video download
router.get('/download', async (req, res) => {
  try {
    const result = await db.analytics.query(
      'SELECT s3_key FROM yt_final_videos WHERE topic_id = $1', [req.params.topicId]
    );
    if (!result.rows[0]?.s3_key) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    const downloadUrl = await getPresignedUrl(result.rows[0].s3_key, 3600);
    res.json({ success: true, data: { downloadUrl } });
  } catch (err) {
    console.error('[Videos] Error getting download URL:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
