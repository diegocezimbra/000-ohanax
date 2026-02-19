import { Router } from 'express';
import { db } from '../../db.js';
import { enqueueJob } from '../../services/youtube/job-queue.js';
import { getPresignedUrl } from '../../services/youtube/s3.js';

const router = Router({ mergeParams: true });

// GET / - Narration info for topic
router.get('/', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT id, topic_id, s3_key, duration_seconds,
        segment_meta, alignment_data, created_at, updated_at
      FROM yt_narrations WHERE topic_id = $1
    `, [req.params.topicId]);

    if (!result.rows[0]) {
      return res.json({ success: true, data: null, message: 'No narration generated yet' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Narrations] Error fetching narration:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /regenerate - Regenerate full narration
router.post('/regenerate', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const job = await enqueueJob({
      projectId, topicId,
      jobType: 'generate_narration',
      payload: { topicId },
    });
    res.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    console.error('[Narrations] Error regenerating narration:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /download - Return presigned URL for audio download
router.get('/download', async (req, res) => {
  try {
    const result = await db.analytics.query(
      'SELECT s3_key FROM yt_narrations WHERE topic_id = $1', [req.params.topicId]
    );
    if (!result.rows[0]?.s3_key) {
      return res.status(404).json({ success: false, error: 'Narration not found' });
    }
    const downloadUrl = await getPresignedUrl(result.rows[0].s3_key, 3600);
    res.json({ success: true, data: { downloadUrl } });
  } catch (err) {
    console.error('[Narrations] Error getting download URL:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
