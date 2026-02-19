import { Router } from 'express';
import { db } from '../../db.js';
import { enqueueJob } from '../../services/youtube/job-queue.js';
import { getPresignedUrl } from '../../services/youtube/s3.js';

const router = Router({ mergeParams: true });

// GET / - All thumbnail variants for topic
router.get('/', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT id, variant_index, s3_key, concept, is_selected, created_at
      FROM yt_thumbnails WHERE topic_id = $1
      ORDER BY variant_index ASC
    `, [req.params.topicId]);

    // Generate presigned URLs for display
    const thumbnails = await Promise.all(result.rows.map(async (row) => ({
      ...row,
      imageUrl: row.s3_key ? await getPresignedUrl(row.s3_key, 3600) : null,
    })));

    res.json({ success: true, data: thumbnails });
  } catch (err) {
    console.error('[Thumbnails] Error fetching thumbnails:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /regenerate - Regenerate all 3 variants
router.post('/regenerate', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const job = await enqueueJob({
      projectId, topicId,
      jobType: 'generate_thumbnails',
      payload: { topicId },
    });
    res.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    console.error('[Thumbnails] Error regenerating thumbnails:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /:thumbnailId/select - Select a thumbnail variant
router.put('/:thumbnailId/select', async (req, res) => {
  try {
    const { topicId, thumbnailId } = req.params;
    const thumbnail = await db.analytics.query(
      'SELECT id FROM yt_thumbnails WHERE id = $1 AND topic_id = $2',
      [thumbnailId, topicId]
    );
    if (!thumbnail.rows[0]) {
      return res.status(404).json({ success: false, error: 'Thumbnail not found' });
    }
    await db.analytics.query(
      'UPDATE yt_thumbnails SET is_selected = false WHERE topic_id = $1', [topicId]
    );
    await db.analytics.query(
      'UPDATE yt_thumbnails SET is_selected = true WHERE id = $1', [thumbnailId]
    );
    res.json({ success: true, data: { thumbnailId, topicId } });
  } catch (err) {
    console.error('[Thumbnails] Error selecting thumbnail:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
