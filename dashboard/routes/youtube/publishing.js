import { Router } from 'express';
import { db } from '../../db.js';
import { calculateNextPublishSlot } from '../../services/youtube/pipeline-orchestrator.js';

const router = Router({ mergeParams: true });

function getProjectId(req) { return req.params.projectId; }

function parsePagination(query) {
  const limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 200);
  const offset = Math.max(parseInt(query.offset) || 0, 0);
  return { limit, offset };
}

// GET / - List publication queue
router.get('/', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { status, sort } = req.query;
    const { limit, offset } = parsePagination(req.query);
    const conditions = ['p.project_id = $1'];
    const filterParams = [projectId];
    let idx = 2;
    if (status) { conditions.push(`p.status = $${idx++}`); filterParams.push(status); }
    const where = conditions.join(' AND ');
    const orderDir = sort === 'created_at_asc' ? 'ASC' : 'DESC';

    const listParams = [...filterParams, limit, offset];
    const result = await db.analytics.query(`
      SELECT p.id, p.topic_id, p.video_id,
        p.youtube_title, p.youtube_description, p.youtube_tags,
        p.youtube_video_id, p.youtube_url, p.status,
        p.scheduled_for, p.published_at,
        p.review_notes, p.created_at, p.updated_at,
        t.title AS topic_title, t.richness_score,
        fv.duration_seconds AS video_duration
      FROM yt_publications p
      LEFT JOIN yt_topics t ON p.topic_id = t.id
      LEFT JOIN yt_final_videos fv ON p.video_id = fv.id
      WHERE ${where}
      ORDER BY p.created_at ${orderDir}
      LIMIT $${idx} OFFSET $${idx + 1}
    `, listParams);

    const countResult = await db.analytics.query(
      `SELECT COUNT(*) FROM yt_publications p WHERE ${where}`,
      filterParams
    );
    res.json({
      success: true, data: result.rows,
      meta: { total: parseInt(countResult.rows[0].count), limit, offset },
    });
  } catch (err) {
    console.error('[Publishing] Error listing publications:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /calendar - Calendar view grouped by date
router.get('/calendar', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: 'month query param required (YYYY-MM)' });
    }
    const startDate = `${month}-01`;
    const result = await db.analytics.query(`
      SELECT p.id, p.youtube_title, p.status, p.scheduled_for, p.published_at,
        t.title AS topic_title
      FROM yt_publications p
      LEFT JOIN yt_topics t ON p.topic_id = t.id
      WHERE p.project_id = $1
        AND ((p.scheduled_for >= $2::date AND p.scheduled_for < $2::date + INTERVAL '1 month')
          OR (p.published_at >= $2::date AND p.published_at < $2::date + INTERVAL '1 month'))
      ORDER BY COALESCE(p.scheduled_for, p.published_at) ASC
    `, [projectId, startDate]);

    const calendar = {};
    for (const row of result.rows) {
      const dateKey = (row.scheduled_for || row.published_at).toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = [];
      calendar[dateKey].push(row);
    }
    res.json({ success: true, data: calendar });
  } catch (err) {
    console.error('[Publishing] Error fetching calendar:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /today-count - Count published today
router.get('/today-count', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const result = await db.analytics.query(`
      SELECT COUNT(*) AS count FROM yt_publications
      WHERE project_id = $1 AND status = 'published'
        AND published_at >= CURRENT_DATE AND published_at < CURRENT_DATE + INTERVAL '1 day'
    `, [projectId]);
    res.json({ success: true, data: { count: parseInt(result.rows[0].count) } });
  } catch (err) {
    console.error('[Publishing] Error counting today:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:pubId - Single publication detail
router.get('/:pubId', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT p.*, t.title AS topic_title, t.richness_score
      FROM yt_publications p LEFT JOIN yt_topics t ON p.topic_id = t.id
      WHERE p.id = $1
    `, [req.params.pubId]);
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'Publication not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Publishing] Error fetching publication:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:pubId/approve - Approve for scheduling
router.post('/:pubId/approve', async (req, res) => {
  try {
    const projectId = getProjectId(req);
    const { pubId } = req.params;
    const pub = await db.analytics.query(
      'SELECT id, status, topic_id FROM yt_publications WHERE id = $1', [pubId]
    );
    if (!pub.rows[0]) {
      return res.status(404).json({ success: false, error: 'Publication not found' });
    }
    if (pub.rows[0].status !== 'pending_review') {
      return res.status(400).json({ success: false, error: `Cannot approve status '${pub.rows[0].status}'` });
    }
    const scheduledAt = await calculateNextPublishSlot(projectId);
    await db.analytics.query(
      `UPDATE yt_publications SET status = 'approved', scheduled_for = $2, updated_at = NOW() WHERE id = $1`,
      [pubId, scheduledAt]
    );
    await db.analytics.query(
      `UPDATE yt_topics SET pipeline_stage = 'scheduled', updated_at = NOW() WHERE id = $1`,
      [pub.rows[0].topic_id]
    );
    res.json({ success: true, data: { pubId, scheduledAt } });
  } catch (err) {
    console.error('[Publishing] Error approving publication:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:pubId/reject - Reject publication
router.post('/:pubId/reject', async (req, res) => {
  try {
    const { pubId } = req.params;
    const { reason } = req.body;
    const pub = await db.analytics.query(
      'SELECT id, topic_id, status FROM yt_publications WHERE id = $1', [pubId]
    );
    if (!pub.rows[0]) {
      return res.status(404).json({ success: false, error: 'Publication not found' });
    }
    if (!['pending_review', 'approved'].includes(pub.rows[0].status)) {
      return res.status(400).json({ success: false, error: `Cannot reject status '${pub.rows[0].status}'` });
    }
    await db.analytics.query(
      `UPDATE yt_publications SET status = 'rejected', review_notes = $2, updated_at = NOW() WHERE id = $1`,
      [pubId, reason || null]
    );
    await db.analytics.query(
      `UPDATE yt_topics SET pipeline_stage = 'rejected', updated_at = NOW() WHERE id = $1`,
      [pub.rows[0].topic_id]
    );
    res.json({ success: true, data: { pubId, status: 'rejected' } });
  } catch (err) {
    console.error('[Publishing] Error rejecting publication:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /:pubId - Edit publication before publish
router.put('/:pubId', async (req, res) => {
  try {
    const { pubId } = req.params;
    const { youtube_title, youtube_description, youtube_tags } = req.body;
    const pub = await db.analytics.query(
      'SELECT id, status FROM yt_publications WHERE id = $1', [pubId]
    );
    if (!pub.rows[0]) {
      return res.status(404).json({ success: false, error: 'Publication not found' });
    }
    if (!['pending_review', 'approved'].includes(pub.rows[0].status)) {
      return res.status(400).json({ success: false, error: 'Can only edit pending or approved publications' });
    }
    const result = await db.analytics.query(`
      UPDATE yt_publications
      SET youtube_title = COALESCE($2, youtube_title),
          youtube_description = COALESCE($3, youtube_description),
          youtube_tags = COALESCE($4, youtube_tags), updated_at = NOW()
      WHERE id = $1 RETURNING *
    `, [pubId, youtube_title, youtube_description, youtube_tags ? JSON.stringify(youtube_tags) : null]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[Publishing] Error editing publication:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:pubId/schedule - Set specific schedule time
router.post('/:pubId/schedule', async (req, res) => {
  try {
    const { pubId } = req.params;
    const { scheduled_for } = req.body;
    if (!scheduled_for) {
      return res.status(400).json({ success: false, error: 'scheduled_for is required' });
    }
    const scheduledDate = new Date(scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    await db.analytics.query(
      `UPDATE yt_publications SET status = 'scheduled', scheduled_for = $2, updated_at = NOW() WHERE id = $1`,
      [pubId, scheduledDate]
    );
    res.json({ success: true, data: { pubId, scheduledAt: scheduledDate } });
  } catch (err) {
    console.error('[Publishing] Error scheduling publication:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:pubId/retry - Retry failed publication
router.post('/:pubId/retry', async (req, res) => {
  try {
    const { pubId } = req.params;
    const result = await db.analytics.query(`
      UPDATE yt_publications SET status = 'approved',
        review_notes = NULL, updated_at = NOW()
      WHERE id = $1 AND status = 'failed' RETURNING id
    `, [pubId]);
    if (!result.rows[0]) {
      return res.status(400).json({ success: false, error: 'Publication not found or not failed' });
    }
    res.json({ success: true, data: { pubId, status: 'approved' } });
  } catch (err) {
    console.error('[Publishing] Error retrying publication:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:pubId/unschedule - Move back from scheduled/approved to pending_review
router.post('/:pubId/unschedule', async (req, res) => {
  try {
    const { pubId } = req.params;
    const result = await db.analytics.query(`
      UPDATE yt_publications SET status = 'pending_review', scheduled_for = NULL, updated_at = NOW()
      WHERE id = $1 AND status IN ('approved', 'scheduled') RETURNING id, topic_id
    `, [pubId]);
    if (!result.rows[0]) {
      return res.status(400).json({ success: false, error: 'Publication not found or not in scheduled/approved state' });
    }
    await db.analytics.query(
      `UPDATE yt_topics SET pipeline_stage = 'queued_for_publishing', updated_at = NOW() WHERE id = $1`,
      [result.rows[0].topic_id]
    );
    res.json({ success: true, data: { pubId, status: 'pending_review' } });
  } catch (err) {
    console.error('[Publishing] Error unscheduling publication:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
