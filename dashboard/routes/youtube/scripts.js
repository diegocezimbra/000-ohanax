import { Router } from 'express';
import { db } from '../../db.js';
import { triggerPipelineFromTopic } from '../../services/youtube/pipeline-orchestrator.js';

const router = Router({ mergeParams: true });

// GET / - Get script with all segments
router.get('/', async (req, res) => {
  try {
    const scriptResult = await db.analytics.query(
      'SELECT * FROM yt_scripts WHERE topic_id = $1', [req.params.topicId]
    );
    if (scriptResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Script not found for this topic' });
    }
    const segments = await db.analytics.query(
      'SELECT * FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index ASC',
      [scriptResult.rows[0].id]
    );
    res.json({ success: true, data: { ...scriptResult.rows[0], segments: segments.rows } });
  } catch (err) {
    console.error('[YouTube/Scripts] Error fetching script:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /metadata - Edit YouTube metadata
router.put('/metadata', async (req, res) => {
  try {
    const { youtube_title, youtube_description, youtube_tags } = req.body;
    const result = await db.analytics.query(`
      UPDATE yt_scripts SET youtube_title = COALESCE($1, youtube_title),
        youtube_description = COALESCE($2, youtube_description),
        youtube_tags = COALESCE($3, youtube_tags), updated_at = NOW()
      WHERE topic_id = $4 RETURNING *
    `, [youtube_title, youtube_description,
        youtube_tags ? JSON.stringify(youtube_tags) : null,
        req.params.topicId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Script not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[YouTube/Scripts] Error updating metadata:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /segments/:segmentId - Edit single segment
router.put('/segments/:segmentId', async (req, res) => {
  try {
    const { segmentId } = req.params;
    const { narration_text, visual_direction, duration_seconds, segment_type, notes } = req.body;

    const segResult = await db.analytics.query(`
      UPDATE yt_script_segments SET
        narration_text = COALESCE($1, narration_text),
        visual_direction = COALESCE($2, visual_direction),
        duration_seconds = COALESCE($3, duration_seconds),
        segment_type = COALESCE($4, segment_type),
        notes = COALESCE($5, notes),
        updated_at = NOW()
      WHERE id = $6 RETURNING *
    `, [narration_text, visual_direction, duration_seconds, segment_type, notes, segmentId]);

    if (segResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }

    // Recalculate script total duration
    await recalculateDuration(segResult.rows[0].script_id);

    res.json({ success: true, data: segResult.rows[0] });
  } catch (err) {
    console.error('[YouTube/Scripts] Error updating segment:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /segments/:segmentId/split - Split segment at word index
router.post('/segments/:segmentId/split', async (req, res) => {
  const client = await db.analytics.connect();
  try {
    const { segmentId } = req.params;
    const { split_at_word } = req.body;

    if (!split_at_word || split_at_word < 1) {
      return res.status(400).json({ success: false, error: 'split_at_word must be a positive integer' });
    }

    await client.query('BEGIN');
    const segResult = await client.query('SELECT * FROM yt_script_segments WHERE id = $1', [segmentId]);
    if (segResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Segment not found' });
    }

    const seg = segResult.rows[0];
    const words = seg.narration_text.split(/\s+/).filter(w => w.length > 0);
    if (split_at_word >= words.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: `split_at_word exceeds word count (${words.length})` });
    }

    const firstHalf = words.slice(0, split_at_word).join(' ');
    const secondHalf = words.slice(split_at_word).join(' ');
    const halfDuration = Math.round(seg.duration_seconds / 2);

    // Shift subsequent segments
    await client.query(
      'UPDATE yt_script_segments SET segment_index = segment_index + 1 WHERE script_id = $1 AND segment_index > $2',
      [seg.script_id, seg.segment_index]
    );
    // Update first half
    await client.query(
      'UPDATE yt_script_segments SET narration_text = $1, duration_seconds = $2, updated_at = NOW() WHERE id = $3',
      [firstHalf, halfDuration, segmentId]
    );
    // Insert second half
    await client.query(`
      INSERT INTO yt_script_segments (script_id, segment_index, segment_type, narration_text, visual_direction, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [seg.script_id, seg.segment_index + 1, seg.segment_type, secondHalf, seg.visual_direction, halfDuration]);

    await client.query('COMMIT');
    await recalculateDuration(seg.script_id);

    const updated = await db.analytics.query(
      'SELECT * FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index ASC', [seg.script_id]
    );
    res.json({ success: true, data: updated.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[YouTube/Scripts] Error splitting segment:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// POST /segments/merge - Merge two adjacent segments
router.post('/segments/merge', async (req, res) => {
  const client = await db.analytics.connect();
  try {
    const { segment_id_a, segment_id_b } = req.body;

    if (!segment_id_a || !segment_id_b) {
      return res.status(400).json({ success: false, error: 'segment_id_a and segment_id_b are required' });
    }

    await client.query('BEGIN');
    const segsResult = await client.query(
      'SELECT * FROM yt_script_segments WHERE id IN ($1, $2) ORDER BY segment_index ASC',
      [segment_id_a, segment_id_b]
    );
    if (segsResult.rows.length !== 2) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'One or both segments not found' });
    }

    const [segA, segB] = segsResult.rows;
    if (segA.script_id !== segB.script_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Segments must belong to the same script' });
    }

    const mergedText = [segA.narration_text, segB.narration_text].filter(Boolean).join(' ');
    const mergedVisual = [segA.visual_direction, segB.visual_direction].filter(Boolean).join(' | ');
    const mergedDuration = (segA.duration_seconds || 0) + (segB.duration_seconds || 0);

    await client.query(
      'UPDATE yt_script_segments SET narration_text = $1, visual_direction = $2, duration_seconds = $3, updated_at = NOW() WHERE id = $4',
      [mergedText, mergedVisual, mergedDuration, segA.id]
    );
    await client.query('DELETE FROM yt_script_segments WHERE id = $1', [segB.id]);

    // Re-index segments
    await client.query(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY segment_index ASC) - 1 AS new_idx
        FROM yt_script_segments WHERE script_id = $1
      )
      UPDATE yt_script_segments seg SET segment_index = ordered.new_idx
      FROM ordered WHERE seg.id = ordered.id
    `, [segA.script_id]);

    await client.query('COMMIT');
    await recalculateDuration(segA.script_id);

    const updated = await db.analytics.query(
      'SELECT * FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index ASC', [segA.script_id]
    );
    res.json({ success: true, data: updated.rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[YouTube/Scripts] Error merging segments:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PUT /segments/reorder - Bulk reorder segments
router.put('/segments/reorder', async (req, res) => {
  const client = await db.analytics.connect();
  try {
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ success: false, error: 'order must be an array of { id, segment_index }' });
    }
    await client.query('BEGIN');
    for (const item of order) {
      await client.query(
        'UPDATE yt_script_segments SET segment_index = $1, updated_at = NOW() WHERE id = $2',
        [item.segment_index, item.id]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, message: 'Segments reordered' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[YouTube/Scripts] Error reordering segments:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// POST /regenerate - Regenerate entire script via pipeline
router.post('/regenerate', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const topicCheck = await db.analytics.query(
      'SELECT id FROM yt_topics WHERE id = $1 AND project_id = $2 AND is_deleted = false',
      [topicId, projectId]
    );
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    triggerPipelineFromTopic(projectId, topicId, 'generate_script').catch(err => {
      console.error('[YouTube/Scripts] Regenerate trigger failed:', err.message);
    });
    res.json({ success: true, message: 'Script regeneration queued' });
  } catch (err) {
    console.error('[YouTube/Scripts] Error regenerating script:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- Internal helper ---
async function recalculateDuration(scriptId) {
  await db.analytics.query(`
    UPDATE yt_scripts SET total_duration_estimate = (
      SELECT COALESCE(SUM(duration_seconds), 0)
      FROM yt_script_segments WHERE script_id = $1
    ), updated_at = NOW() WHERE id = $1
  `, [scriptId]);
}

export default router;
