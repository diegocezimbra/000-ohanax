import { Router } from 'express';
import { db } from '../../db.js';
import { triggerPipelineFromSource } from '../../services/youtube/pipeline-orchestrator.js';

const router = Router({ mergeParams: true });

// =============================================================================
// GET / - List sources for project (with filters and pagination)
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, search, limit = '50', offset = '0' } = req.query;

    const conditions = ['s.project_id = $1', 's.is_deleted = false'];
    const params = [projectId];
    let paramIdx = 2;

    if (status) {
      conditions.push(`s.status = $${paramIdx}`);
      params.push(status);
      paramIdx++;
    }

    if (search) {
      conditions.push(`s.title ILIKE $${paramIdx}`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const safeOffset = parseInt(offset, 10) || 0;

    const whereClause = conditions.join(' AND ');

    const result = await db.analytics.query(`
      SELECT
        s.*,
        COALESCE(tg.topics_generated_count, 0) AS topics_generated_count
      FROM yt_content_sources s
      LEFT JOIN (
        SELECT source_id, COUNT(*) AS topics_generated_count
        FROM yt_topics
        WHERE is_deleted = false
        GROUP BY source_id
      ) tg ON tg.source_id = s.id
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, safeLimit, safeOffset]);

    const countResult = await db.analytics.query(
      `SELECT COUNT(*) FROM yt_content_sources s WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10)
    });
  } catch (err) {
    console.error('[YouTube/Sources] Error listing sources:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /pool/stats - Pool aggregate statistics
// =============================================================================
router.get('/pool/stats', async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await db.analytics.query(`
      SELECT
        COUNT(*) AS total_sources,
        COALESCE(SUM(word_count), 0) AS total_words,
        COUNT(*) FILTER (WHERE status = 'processed') AS processed,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing,
        COUNT(*) FILTER (WHERE status = 'error') AS errored
      FROM yt_content_sources
      WHERE project_id = $1 AND is_deleted = false
    `, [projectId]);

    const storiesResult = await db.analytics.query(`
      SELECT COUNT(*) AS count
      FROM yt_topics
      WHERE project_id = $1 AND is_deleted = false
    `, [projectId]);

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        total_sources: parseInt(row.total_sources, 10),
        total_words: parseInt(row.total_words, 10),
        stories_generated: parseInt(storiesResult.rows[0].count, 10),
        by_status: {
          processed: parseInt(row.processed, 10),
          pending: parseInt(row.pending, 10),
          processing: parseInt(row.processing, 10),
          error: parseInt(row.errored, 10),
        },
      },
    });
  } catch (err) {
    console.error('[YouTube/Sources] Error fetching pool stats:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /pool/health - Per-source health scores
// =============================================================================
router.get('/pool/health', async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await db.analytics.query(`
      SELECT
        s.id, s.title, s.source_type, s.status, s.word_count,
        s.created_at,
        COALESCE(tc.topics_count, 0) AS times_used
      FROM yt_content_sources s
      LEFT JOIN (
        SELECT source_id, COUNT(*) AS topics_count
        FROM yt_topics
        WHERE is_deleted = false
        GROUP BY source_id
      ) tc ON tc.source_id = s.id
      WHERE s.project_id = $1 AND s.is_deleted = false
      ORDER BY s.created_at DESC
    `, [projectId]);

    const sources = result.rows.map(s => ({
      id: s.id,
      title: s.title,
      source_type: s.source_type,
      status: s.status,
      word_count: s.word_count,
      times_used: parseInt(s.times_used, 10),
      health_score: calculateHealthScore(s),
    }));

    res.json({ success: true, data: { sources } });
  } catch (err) {
    console.error('[YouTube/Sources] Error fetching pool health:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

function calculateHealthScore(source) {
  if (source.status === 'error') return 0;
  if (source.status !== 'processed') return 50;
  const wordScore = Math.min((source.word_count || 0) / 100, 50);
  const usageScore = Math.max(50 - parseInt(source.times_used, 10) * 10, 0);
  return Math.round(wordScore + usageScore);
}

// =============================================================================
// GET /:sourceId - Get source detail with research results
// =============================================================================
router.get('/:sourceId', async (req, res) => {
  try {
    const { projectId, sourceId } = req.params;

    const sourceResult = await db.analytics.query(
      `SELECT * FROM yt_content_sources
       WHERE id = $1 AND project_id = $2 AND is_deleted = false`,
      [sourceId, projectId]
    );

    if (sourceResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }

    const researchResult = await db.analytics.query(
      `SELECT id, query, title, url, snippet, relevance_score, created_at
       FROM yt_research_results
       WHERE source_id = $1
       ORDER BY relevance_score DESC`,
      [sourceId]
    );

    res.json({
      success: true,
      data: {
        ...sourceResult.rows[0],
        research_results: researchResult.rows
      }
    });
  } catch (err) {
    console.error('[YouTube/Sources] Error fetching source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /url - Add URL source
// =============================================================================
router.post('/url', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { url, title } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }

    const result = await db.analytics.query(`
      INSERT INTO yt_content_sources (id, project_id, source_type, url, title, status)
      VALUES (gen_random_uuid(), $1, 'url', $2, $3, 'pending')
      RETURNING *
    `, [projectId, url.trim(), title?.trim() || null]);

    const source = result.rows[0];

    triggerPipelineFromSource(projectId, source.id).catch(err => {
      console.error('[YouTube/Sources] Pipeline trigger failed:', err.message);
    });

    res.status(201).json({ success: true, data: source });
  } catch (err) {
    console.error('[YouTube/Sources] Error adding URL source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /pdf - Add PDF source
// =============================================================================
router.post('/pdf', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, file_url } = req.body;

    if (!file_url || !file_url.trim()) {
      return res.status(400).json({ success: false, error: 'File URL is required' });
    }

    const result = await db.analytics.query(`
      INSERT INTO yt_content_sources (id, project_id, source_type, title, url, status)
      VALUES (gen_random_uuid(), $1, 'pdf', $2, $3, 'pending')
      RETURNING *
    `, [projectId, title || null, file_url.trim()]);

    const source = result.rows[0];

    triggerPipelineFromSource(projectId, source.id).catch(err => {
      console.error('[YouTube/Sources] Pipeline trigger failed:', err.message);
    });

    res.status(201).json({ success: true, data: source });
  } catch (err) {
    console.error('[YouTube/Sources] Error adding PDF source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /text - Add manual text source (skip extraction stage)
// =============================================================================
router.post('/text', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, content, reference } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Content text is required' });
    }

    const result = await db.analytics.query(`
      INSERT INTO yt_content_sources
        (id, project_id, source_type, title, raw_content, url, status)
      VALUES
        (gen_random_uuid(), $1, 'text', $2, $3, $4, 'processed')
      RETURNING *
    `, [projectId, title || null, content.trim(), reference || null]);

    const source = result.rows[0];

    triggerPipelineFromSource(projectId, source.id).catch(err => {
      console.error('[YouTube/Sources] Pipeline trigger failed:', err.message);
    });

    res.status(201).json({ success: true, data: source });
  } catch (err) {
    console.error('[YouTube/Sources] Error adding text source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /youtube - Add YouTube transcript source
// =============================================================================
router.post('/youtube', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { url } = req.body;

    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'YouTube URL is required' });
    }

    const result = await db.analytics.query(`
      INSERT INTO yt_content_sources (id, project_id, source_type, url, status)
      VALUES (gen_random_uuid(), $1, 'youtube', $2, 'pending')
      RETURNING *
    `, [projectId, url.trim()]);

    const source = result.rows[0];

    triggerPipelineFromSource(projectId, source.id).catch(err => {
      console.error('[YouTube/Sources] Pipeline trigger failed:', err.message);
    });

    res.status(201).json({ success: true, data: source });
  } catch (err) {
    console.error('[YouTube/Sources] Error adding YouTube source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT /:sourceId - Edit extracted content
// =============================================================================
router.put('/:sourceId', async (req, res) => {
  try {
    const { projectId, sourceId } = req.params;
    const { title, raw_content } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_content_sources
      SET
        title             = COALESCE($1, title),
        raw_content = COALESCE($2, raw_content),
        updated_at        = NOW()
      WHERE id = $3 AND project_id = $4 AND is_deleted = false
      RETURNING *
    `, [title, raw_content, sourceId, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[YouTube/Sources] Error updating source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// DELETE /:sourceId - Soft delete
// =============================================================================
router.delete('/:sourceId', async (req, res) => {
  try {
    const { projectId, sourceId } = req.params;

    const result = await db.analytics.query(`
      UPDATE yt_content_sources
      SET is_deleted = true, updated_at = NOW()
      WHERE id = $1 AND project_id = $2 AND is_deleted = false
      RETURNING id
    `, [sourceId, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }

    res.json({ success: true, data: { id: sourceId, deleted: true } });
  } catch (err) {
    console.error('[YouTube/Sources] Error deleting source:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
