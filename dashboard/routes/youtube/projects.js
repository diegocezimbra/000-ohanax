import { Router } from 'express';
import { db } from '../../db.js';

const router = Router({ mergeParams: true });

// =============================================================================
// GET /projects - List all projects with aggregate counts
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.niche,
        p.language,
        p.status,
        p.pipeline_paused,
        p.created_at,
        p.updated_at,
        COALESCE(s.youtube_connected, false) AS youtube_connected,
        COALESCE(tc.total_topics, 0) AS topics_count,
        COALESCE(tc.videos_ready, 0) AS videos_ready_count,
        COALESCE(tc.published, 0) AS published_count
      FROM yt_projects p
      LEFT JOIN yt_project_settings s ON s.project_id = p.id
      LEFT JOIN (
        SELECT
          project_id,
          COUNT(*) AS total_topics,
          COUNT(*) FILTER (WHERE pipeline_stage = 'video_ready') AS videos_ready,
          COUNT(*) FILTER (WHERE pipeline_stage = 'published') AS published
        FROM yt_topics
        WHERE is_deleted = false
        GROUP BY project_id
      ) tc ON tc.project_id = p.id
      WHERE p.status != 'deleted'
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows.map(formatProjectRow)
    });
  } catch (err) {
    console.error('[YouTube/Projects] Error listing projects:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /projects/:projectId - Get single project with aggregate data
// =============================================================================
router.get('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await db.analytics.query(`
      SELECT
        p.id,
        p.name,
        p.description,
        p.niche,
        p.language,
        p.status,
        p.pipeline_paused,
        p.created_at,
        p.updated_at,
        COALESCE(s.youtube_connected, false) AS youtube_connected,
        COALESCE(tc.total_topics, 0) AS topics_count,
        COALESCE(tc.videos_ready, 0) AS videos_ready_count,
        COALESCE(tc.published, 0) AS published_count
      FROM yt_projects p
      LEFT JOIN yt_project_settings s ON s.project_id = p.id
      LEFT JOIN (
        SELECT
          project_id,
          COUNT(*) AS total_topics,
          COUNT(*) FILTER (WHERE pipeline_stage = 'video_ready') AS videos_ready,
          COUNT(*) FILTER (WHERE pipeline_stage = 'published') AS published
        FROM yt_topics
        WHERE is_deleted = false
        GROUP BY project_id
      ) tc ON tc.project_id = p.id
      WHERE p.id = $1 AND p.status != 'deleted'
    `, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: formatProjectRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Projects] Error fetching project:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /projects - Create project (with default settings in transaction)
// =============================================================================
router.post('/', async (req, res) => {
  const client = await db.analytics.connect();

  try {
    const { name, description, language, niche } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    await client.query('BEGIN');

    const projectResult = await client.query(`
      INSERT INTO yt_projects (id, name, description, language, niche, status, pipeline_paused)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', false)
      RETURNING *
    `, [name.trim(), description || null, language || 'pt-BR', niche || null]);

    const project = projectResult.rows[0];

    await client.query(`
      INSERT INTO yt_project_settings (id, project_id)
      VALUES (gen_random_uuid(), $1)
    `, [project.id]);

    await client.query('COMMIT');

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[YouTube/Projects] Error creating project:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// =============================================================================
// PUT /projects/:projectId - Partial update project
// =============================================================================
router.put('/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, language, niche, status } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_projects
      SET
        name        = COALESCE($1, name),
        description = COALESCE($2, description),
        language    = COALESCE($3, language),
        niche       = COALESCE($4, niche),
        status      = COALESCE($5, status),
        updated_at  = NOW()
      WHERE id = $6 AND status != 'deleted'
      RETURNING *
    `, [name, description, language, niche, status, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[YouTube/Projects] Error updating project:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// DELETE /projects/:projectId - Soft delete + cancel pending jobs
// =============================================================================
router.delete('/:projectId', async (req, res) => {
  const client = await db.analytics.connect();

  try {
    const { projectId } = req.params;

    await client.query('BEGIN');

    const result = await client.query(`
      UPDATE yt_projects
      SET status = 'deleted', updated_at = NOW()
      WHERE id = $1 AND status != 'deleted'
      RETURNING id
    `, [projectId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    await client.query(`
      UPDATE yt_jobs
      SET status = 'cancelled', updated_at = NOW()
      WHERE project_id = $1 AND status IN ('pending', 'processing')
    `, [projectId]);

    await client.query('COMMIT');

    res.json({ success: true, data: { id: projectId, status: 'deleted' } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[YouTube/Projects] Error deleting project:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// =============================================================================
// HELPERS
// =============================================================================
function formatProjectRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    niche: row.niche,
    language: row.language,
    status: row.status,
    pipeline_paused: row.pipeline_paused,
    youtube_connected: row.youtube_connected,
    counts: {
      topics: parseInt(row.topics_count, 10),
      videos_ready: parseInt(row.videos_ready_count, 10),
      published: parseInt(row.published_count, 10)
    },
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export default router;
