import { Router } from 'express';
import { db } from '../../db.js';
import { triggerPipelineFromTopic } from '../../services/youtube/pipeline-orchestrator.js';

const router = Router({ mergeParams: true });

// =============================================================================
// GET / - Get story for the current topic
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { topicId } = req.params;

    const result = await db.analytics.query(
      'SELECT * FROM yt_stories WHERE topic_id = $1',
      [topicId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No story found for this topic'
      });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[YouTube/Stories] Error fetching story:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT / - Edit story text (UPSERT with version increment and word count)
// =============================================================================
router.put('/', async (req, res) => {
  try {
    const { projectId, topicId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Story content is required'
      });
    }

    const trimmedContent = content.trim();
    const wordCount = trimmedContent
      .split(/\s+/)
      .filter(word => word.length > 0)
      .length;

    const result = await db.analytics.query(`
      INSERT INTO yt_stories (topic_id, content, word_count, version)
      VALUES ($1, $2, $3, 1)
      ON CONFLICT (topic_id)
      DO UPDATE SET
        content    = $2,
        word_count = $3,
        version    = yt_stories.version + 1,
        updated_at = NOW()
      RETURNING *
    `, [topicId, trimmedContent, wordCount]);

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('[YouTube/Stories] Error updating story:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /regenerate - Queue story regeneration via pipeline
// =============================================================================
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

    triggerPipelineFromTopic(projectId, topicId, 'generate_story').catch(err => {
      console.error('[YouTube/Stories] Regenerate trigger failed:', err.message);
    });

    res.json({
      success: true,
      message: 'Story regeneration queued'
    });
  } catch (err) {
    console.error('[YouTube/Stories] Error regenerating story:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
