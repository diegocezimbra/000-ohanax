import { Router } from 'express';
import { db } from '../../db.js';
import { enqueueJob } from '../../services/youtube/job-queue.js';

const router = Router({ mergeParams: true });

// GET / - All visual assets grouped by segment
router.get('/', async (req, res) => {
  try {
    const { topicId } = req.params;

    const result = await db.analytics.query(`
      SELECT
        ss.id AS segment_id,
        ss.segment_index,
        ss.segment_type,
        ss.narration_text,
        ss.visual_direction,
        ss.duration_seconds,
        va.id AS asset_id,
        va.asset_type,
        va.s3_key,
        va.prompt_used,
        va.metadata AS asset_metadata,
        va.status AS asset_status,
        va.is_selected,
        va.created_at AS asset_created_at
      FROM yt_script_segments ss
      JOIN yt_scripts s ON ss.script_id = s.id
      LEFT JOIN yt_visual_assets va ON va.segment_id = ss.id
      WHERE s.topic_id = $1
      ORDER BY ss.segment_index ASC
    `, [topicId]);

    const segmentMap = new Map();

    for (const row of result.rows) {
      if (!segmentMap.has(row.segment_id)) {
        segmentMap.set(row.segment_id, {
          id: row.segment_id,
          segmentIndex: row.segment_index,
          segmentType: row.segment_type,
          narrationText: row.narration_text,
          visualDirection: row.visual_direction,
          durationSeconds: row.duration_seconds,
          assets: [],
        });
      }

      if (row.asset_id) {
        segmentMap.get(row.segment_id).assets.push({
          id: row.asset_id,
          assetType: row.asset_type,
          s3Key: row.s3_key,
          promptUsed: row.prompt_used,
          metadata: row.asset_metadata,
          status: row.asset_status,
          isSelected: row.is_selected,
          createdAt: row.asset_created_at,
        });
      }
    }

    const segments = Array.from(segmentMap.values());
    res.json({ success: true, data: { segments, totalSegments: segments.length } });
  } catch (err) {
    console.error('[Visuals] Error fetching assets:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:assetId - Single asset detail
router.get('/:assetId', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT va.*, ss.narration_text, ss.visual_direction, ss.segment_index
      FROM yt_visual_assets va
      JOIN yt_script_segments ss ON va.segment_id = ss.id
      WHERE va.id = $1
    `, [req.params.assetId]);

    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Visuals] Error fetching asset:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /segments/:segmentId/regenerate
router.post('/segments/:segmentId/regenerate', async (req, res) => {
  try {
    const { projectId, topicId, segmentId } = req.params;
    const segment = await db.analytics.query(
      'SELECT id FROM yt_script_segments WHERE id = $1', [segmentId]
    );
    if (!segment.rows[0]) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }
    const job = await enqueueJob({
      projectId, topicId,
      jobType: 'generate_visual_asset',
      payload: { assetId: segmentId, topicId },
    });
    res.json({ success: true, data: { jobId: job.id, segmentId } });
  } catch (err) {
    console.error('[Visuals] Error regenerating asset:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /:assetId/select - Select this asset
router.put('/:assetId/select', async (req, res) => {
  try {
    const { assetId } = req.params;
    const asset = await db.analytics.query(
      'SELECT id, segment_id FROM yt_visual_assets WHERE id = $1', [assetId]
    );
    if (!asset.rows[0]) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    const { segment_id } = asset.rows[0];
    await db.analytics.query(
      'UPDATE yt_visual_assets SET is_selected = false WHERE segment_id = $1', [segment_id]
    );
    await db.analytics.query(
      'UPDATE yt_visual_assets SET is_selected = true WHERE id = $1', [assetId]
    );
    res.json({ success: true, data: { assetId, segmentId: segment_id } });
  } catch (err) {
    console.error('[Visuals] Error selecting asset:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /regenerate-all
router.post('/regenerate-all', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const job = await enqueueJob({
      projectId, topicId,
      jobType: 'generate_visual_prompts',
      payload: { topicId },
    });
    res.json({ success: true, data: { jobId: job.id } });
  } catch (err) {
    console.error('[Visuals] Error regenerating all visuals:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
