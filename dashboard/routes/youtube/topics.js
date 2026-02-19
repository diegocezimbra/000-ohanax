import { Router } from 'express';
import { db } from '../../db.js';
import { triggerPipelineFromTopic, restartPipelineFromStage } from '../../services/youtube/pipeline-orchestrator.js';

const router = Router({ mergeParams: true });

// Valid stages for restart-from: these are JOB TYPE names that the pipeline orchestrator accepts
const VALID_RESTART_STAGES = [
  'generate_story', 'generate_script', 'generate_visual_prompts',
  'generate_thumbnails', 'generate_narration', 'assemble_video',
];

// GET /stats - Topic counts by pipeline_stage (static route BEFORE parametrized)
router.get('/stats', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT pipeline_stage, COUNT(*) AS count
      FROM yt_topics WHERE project_id = $1 AND is_deleted = false
      GROUP BY pipeline_stage ORDER BY pipeline_stage
    `, [req.params.projectId]);

    const stats = {};
    for (const row of result.rows) stats[row.pipeline_stage] = parseInt(row.count, 10);
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('[YouTube/Topics] Error fetching stats:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET / - List topics with filters, search, sorting, pagination
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      stage, min_richness, source_id, search,
      sort = 'created_desc', limit = '50', offset = '0'
    } = req.query;

    const conditions = ['t.project_id = $1', 't.is_deleted = false'];
    const params = [projectId];
    let paramIdx = 2;

    if (stage) {
      conditions.push(`t.pipeline_stage = $${paramIdx}`);
      params.push(stage);
      paramIdx++;
    }

    if (min_richness) {
      conditions.push(`t.richness_score >= $${paramIdx}`);
      params.push(parseInt(min_richness, 10));
      paramIdx++;
    }

    if (source_id) {
      conditions.push(`t.source_id = $${paramIdx}`);
      params.push(source_id);
      paramIdx++;
    }

    if (search) {
      conditions.push(`(t.title ILIKE $${paramIdx} OR t.angle ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const sortMap = {
      richness_desc: 't.richness_score DESC NULLS LAST',
      richness_asc: 't.richness_score ASC NULLS LAST',
      created_desc: 't.created_at DESC',
      created_asc: 't.created_at ASC',
      title_asc: 't.title ASC'
    };
    const orderBy = sortMap[sort] || sortMap.created_desc;

    const safeLimit = Math.min(parseInt(limit, 10) || 50, 200);
    const safeOffset = parseInt(offset, 10) || 0;
    const whereClause = conditions.join(' AND ');

    const result = await db.analytics.query(`
      SELECT t.*
      FROM yt_topics t
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, safeLimit, safeOffset]);

    const countResult = await db.analytics.query(
      `SELECT COUNT(*) FROM yt_topics t WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count, 10)
    });
  } catch (err) {
    console.error('[YouTube/Topics] Error listing topics:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /:topicId - Get topic detail with related entity statuses
router.get('/:topicId', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const q = (sql) => db.analytics.query(sql, [topicId]);

    const topicResult = await db.analytics.query(
      'SELECT * FROM yt_topics WHERE id = $1 AND project_id = $2 AND is_deleted = false',
      [topicId, projectId]
    );
    if (topicResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const [story, script, narration, thumbnails, video, pub] = await Promise.all([
      q('SELECT id, version, word_count, created_at FROM yt_stories WHERE topic_id = $1'),
      q('SELECT id, total_duration_estimate, youtube_title, version, created_at FROM yt_scripts WHERE topic_id = $1'),
      q('SELECT id, duration_seconds, s3_key, created_at FROM yt_narrations WHERE topic_id = $1'),
      q('SELECT id, variant_index, s3_key, is_selected, created_at FROM yt_thumbnails WHERE topic_id = $1 ORDER BY variant_index'),
      q('SELECT id, duration_seconds, file_size_mb, s3_key, created_at FROM yt_final_videos WHERE topic_id = $1'),
      q('SELECT id, status, youtube_video_id, youtube_url, published_at FROM yt_publications WHERE topic_id = $1')
    ]);

    res.json({
      success: true,
      data: {
        ...topicResult.rows[0],
        story: story.rows[0] || null, script: script.rows[0] || null,
        narration: narration.rows[0] || null, thumbnails: thumbnails.rows,
        video: video.rows[0] || null, publication: pub.rows[0] || null
      }
    });
  } catch (err) {
    console.error('[YouTube/Topics] Error fetching topic:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST / - Create manual topic
router.post('/', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title, angle, target_audience, estimated_duration, key_points
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const result = await db.analytics.query(`
      INSERT INTO yt_topics (
        project_id, title, angle, target_audience,
        estimated_duration, key_points,
        is_deleted, pipeline_stage, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, false, 'idea', 'draft'
      )
      RETURNING *
    `, [
      projectId, title.trim(), angle || null, target_audience || null,
      estimated_duration || null, key_points ? JSON.stringify(key_points) : '[]'
    ]);

    const topic = result.rows[0];

    triggerPipelineFromTopic(projectId, topic.id, 'generate_story').catch(err => {
      console.error('[YouTube/Topics] Pipeline trigger failed:', err.message);
    });

    res.status(201).json({ success: true, data: topic });
  } catch (err) {
    console.error('[YouTube/Topics] Error creating topic:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /:topicId - Edit topic metadata
router.put('/:topicId', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const {
      title, angle, target_audience, estimated_duration, key_points
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_topics
      SET
        title              = COALESCE($1, title),
        angle              = COALESCE($2, angle),
        target_audience    = COALESCE($3, target_audience),
        estimated_duration = COALESCE($4, estimated_duration),
        key_points         = COALESCE($5, key_points),
        updated_at         = NOW()
      WHERE id = $6 AND project_id = $7 AND is_deleted = false
      RETURNING *
    `, [
      title, angle, target_audience, estimated_duration,
      key_points ? JSON.stringify(key_points) : null,
      topicId, projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[YouTube/Topics] Error updating topic:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:topicId/reprocess - Force-reprocess a discarded topic
router.post('/:topicId/reprocess', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;

    const result = await db.analytics.query(`
      UPDATE yt_topics
      SET pipeline_stage = 'idea', updated_at = NOW()
      WHERE id = $1 AND project_id = $2 AND pipeline_stage = 'discarded' AND is_deleted = false
      RETURNING id, pipeline_stage
    `, [topicId, projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Topic not found or not in discarded stage'
      });
    }

    triggerPipelineFromTopic(projectId, topicId, 'generate_story').catch(err => {
      console.error('[YouTube/Topics] Reprocess trigger failed:', err.message);
    });

    res.json({ success: true, data: result.rows[0], message: 'Topic queued for reprocessing' });
  } catch (err) {
    console.error('[YouTube/Topics] Error reprocessing topic:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /:topicId/restart-from - Restart pipeline from a named stage
router.post('/:topicId/restart-from', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const { stage } = req.body;
    if (!stage || !VALID_RESTART_STAGES.includes(stage)) {
      return res.status(400).json({ success: false, error: `Invalid stage. Valid: ${VALID_RESTART_STAGES.join(', ')}` });
    }
    const topicCheck = await db.analytics.query(
      'SELECT id FROM yt_topics WHERE id = $1 AND project_id = $2 AND is_deleted = false',
      [topicId, projectId]
    );
    if (topicCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    restartPipelineFromStage(projectId, topicId, stage).catch(err => {
      console.error('[YouTube/Topics] Restart trigger failed:', err.message);
    });
    res.json({ success: true, message: `Pipeline restart queued from stage: ${stage}` });
  } catch (err) {
    console.error('[YouTube/Topics] Error restarting pipeline:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /:topicId - Soft delete
router.delete('/:topicId', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const result = await db.analytics.query(
      `UPDATE yt_topics SET is_deleted = true, updated_at = NOW()
       WHERE id = $1 AND project_id = $2 AND is_deleted = false RETURNING id`,
      [topicId, projectId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    res.json({ success: true, data: { id: topicId, deleted: true } });
  } catch (err) {
    console.error('[YouTube/Topics] Error deleting topic:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
