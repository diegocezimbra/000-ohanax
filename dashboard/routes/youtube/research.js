import { Router } from 'express';
import { db } from '../../db.js';

const router = Router({ mergeParams: true });

// =============================================================================
// GET / - List all research results for project (with filters and pagination)
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { phase, min_relevance, limit = '50', offset = '0' } = req.query;

    const conditions = ['r.project_id = $1'];
    const params = [projectId];
    let paramIdx = 2;

    if (phase) {
      conditions.push(`r.research_phase = $${paramIdx}`);
      params.push(phase);
      paramIdx++;
    }

    if (min_relevance) {
      conditions.push(`r.relevance_score >= $${paramIdx}`);
      params.push(parseInt(min_relevance, 10));
      paramIdx++;
    }

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const safeOffset = parseInt(offset, 10) || 0;

    const whereClause = conditions.join(' AND ');

    const result = await db.analytics.query(`
      SELECT
        r.id,
        r.project_id,
        r.source_id,
        r.topic_id,
        r.research_phase,
        r.query_used,
        r.relevance_score,
        r.summary,
        r.source_url,
        r.created_at
      FROM yt_research_results r
      WHERE ${whereClause}
      ORDER BY r.relevance_score DESC, r.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, safeLimit, safeOffset]);

    const countResult = await db.analytics.query(
      `SELECT COUNT(*) FROM yt_research_results r WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10)
    });
  } catch (err) {
    console.error('[YouTube/Research] Error listing research:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /by-source/:sourceId - Get research results linked to a source
// =============================================================================
router.get('/by-source/:sourceId', async (req, res) => {
  try {
    const { projectId, sourceId } = req.params;

    const result = await db.analytics.query(`
      SELECT
        id, project_id, source_id, topic_id, research_phase,
        query_used, relevance_score, summary, source_url, created_at
      FROM yt_research_results
      WHERE project_id = $1 AND source_id = $2
      ORDER BY relevance_score DESC
    `, [projectId, sourceId]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[YouTube/Research] Error fetching by source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /by-topic/:topicId - Get research results linked to a topic
// =============================================================================
router.get('/by-topic/:topicId', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;

    const result = await db.analytics.query(`
      SELECT
        id, project_id, source_id, topic_id, research_phase,
        query_used, relevance_score, summary, source_url, created_at
      FROM yt_research_results
      WHERE project_id = $1 AND topic_id = $2
      ORDER BY relevance_score DESC
    `, [projectId, topicId]);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('[YouTube/Research] Error fetching by topic:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /:researchId - Get single research result with full content
// =============================================================================
router.get('/:researchId', async (req, res) => {
  try {
    const { projectId, researchId } = req.params;

    const result = await db.analytics.query(
      `SELECT * FROM yt_research_results
       WHERE id = $1 AND project_id = $2`,
      [researchId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Research result not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[YouTube/Research] Error fetching research:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
