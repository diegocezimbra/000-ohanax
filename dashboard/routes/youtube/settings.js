import { Router } from 'express';
import { db } from '../../db.js';

const router = Router({ mergeParams: true });

const MASK_PLACEHOLDER = '****';

// =============================================================================
// HELPERS
// =============================================================================
function maskApiKey(key) {
  if (!key || key.length < 8) return key ? MASK_PLACEHOLDER : null;
  return MASK_PLACEHOLDER + key.slice(-4);
}

function maskSettingsRow(row) {
  if (!row) return null;
  return {
    ...row,
    llm_api_key: maskApiKey(row.llm_api_key),
    openai_api_key: maskApiKey(row.openai_api_key),
    replicate_api_key: maskApiKey(row.replicate_api_key),
    elevenlabs_api_key: maskApiKey(row.elevenlabs_api_key),
    video_api_key: maskApiKey(row.video_api_key),
    search_api_key: maskApiKey(row.search_api_key),
    youtube_access_token: maskApiKey(row.youtube_access_token),
    youtube_refresh_token: maskApiKey(row.youtube_refresh_token),
    google_client_id: maskApiKey(row.google_client_id),
    google_client_secret: maskApiKey(row.google_client_secret),
  };
}

// =============================================================================
// GET / - Get full settings for project (API keys masked)
// =============================================================================
router.get('/', async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await db.analytics.query(
      'SELECT * FROM yt_project_settings WHERE project_id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found for this project' });
    }

    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error fetching settings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT /storytelling - Update storytelling section
// =============================================================================
router.put('/storytelling', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      narrative_template, emotional_triggers, title_template,
      narration_tone, target_duration_minutes, min_richness_score
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        narrative_template      = COALESCE($1, narrative_template),
        emotional_triggers      = COALESCE($2, emotional_triggers),
        title_template          = COALESCE($3, title_template),
        narration_tone          = COALESCE($4, narration_tone),
        target_duration_minutes = COALESCE($5, target_duration_minutes),
        min_richness_score      = COALESCE($6, min_richness_score),
        updated_at              = NOW()
      WHERE project_id = $7
      RETURNING *
    `, [
      narrative_template, emotional_triggers, title_template,
      narration_tone, target_duration_minutes, min_richness_score,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating storytelling:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT /ai - Update AI provider configuration
// =============================================================================
router.put('/ai', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      llm_provider, llm_api_key, llm_model,
      tts_provider, tts_api_key, tts_voice_id, tts_speed, tts_stability,
      image_provider, image_api_key, image_style,
      video_provider, video_api_key,
      search_provider, search_api_key
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        llm_provider    = COALESCE($1, llm_provider),
        llm_api_key     = COALESCE($2, llm_api_key),
        llm_model       = COALESCE($3, llm_model),
        tts_provider    = COALESCE($4, tts_provider),
        tts_api_key     = COALESCE($5, tts_api_key),
        tts_voice_id    = COALESCE($6, tts_voice_id),
        tts_speed       = COALESCE($7, tts_speed),
        tts_stability   = COALESCE($8, tts_stability),
        image_provider  = COALESCE($9, image_provider),
        image_api_key   = COALESCE($10, image_api_key),
        image_style     = COALESCE($11, image_style),
        video_provider  = COALESCE($12, video_provider),
        video_api_key   = COALESCE($13, video_api_key),
        search_provider = COALESCE($14, search_provider),
        search_api_key  = COALESCE($15, search_api_key),
        updated_at      = NOW()
      WHERE project_id = $16
      RETURNING *
    `, [
      llm_provider, llm_api_key, llm_model,
      tts_provider, tts_api_key, tts_voice_id, tts_speed, tts_stability,
      image_provider, image_api_key, image_style,
      video_provider, video_api_key,
      search_provider, search_api_key,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating AI config:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT /publishing - Update publishing schedule
// =============================================================================
router.put('/publishing', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      max_publications_per_day, publication_times, publication_days,
      publication_timezone, default_visibility
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        max_publications_per_day = COALESCE($1, max_publications_per_day),
        publication_times        = COALESCE($2, publication_times),
        publication_days         = COALESCE($3, publication_days),
        publication_timezone     = COALESCE($4, publication_timezone),
        default_visibility       = COALESCE($5, default_visibility),
        updated_at               = NOW()
      WHERE project_id = $6
      RETURNING *
    `, [
      max_publications_per_day, publication_times, publication_days,
      publication_timezone, default_visibility,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating publishing:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT /visual-identity - Update thumbnail & video assembly defaults
// =============================================================================
router.put('/visual-identity', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      thumbnail_font, thumbnail_font_size, thumbnail_text_color,
      thumbnail_text_position, thumbnail_stroke_color, thumbnail_stroke_width,
      transition_type, transition_duration_ms, ken_burns_intensity,
      background_music_volume
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        thumbnail_font          = COALESCE($1, thumbnail_font),
        thumbnail_font_size     = COALESCE($2, thumbnail_font_size),
        thumbnail_text_color    = COALESCE($3, thumbnail_text_color),
        thumbnail_text_position = COALESCE($4, thumbnail_text_position),
        thumbnail_stroke_color  = COALESCE($5, thumbnail_stroke_color),
        thumbnail_stroke_width  = COALESCE($6, thumbnail_stroke_width),
        transition_type         = COALESCE($7, transition_type),
        transition_duration_ms  = COALESCE($8, transition_duration_ms),
        ken_burns_intensity     = COALESCE($9, ken_burns_intensity),
        background_music_volume = COALESCE($10, background_music_volume),
        updated_at              = NOW()
      WHERE project_id = $11
      RETURNING *
    `, [
      thumbnail_font, thumbnail_font_size, thumbnail_text_color,
      thumbnail_text_position, thumbnail_stroke_color, thumbnail_stroke_width,
      transition_type, transition_duration_ms, ken_burns_intensity,
      background_music_volume,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating visual identity:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT /youtube - Update YouTube OAuth tokens
// =============================================================================
router.put('/youtube', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      youtube_channel_id, youtube_channel_name, youtube_channel_avatar_url,
      youtube_access_token, youtube_refresh_token, youtube_token_expires_at,
      youtube_connected
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        youtube_channel_id         = COALESCE($1, youtube_channel_id),
        youtube_channel_name       = COALESCE($2, youtube_channel_name),
        youtube_channel_avatar_url = COALESCE($3, youtube_channel_avatar_url),
        youtube_access_token       = COALESCE($4, youtube_access_token),
        youtube_refresh_token      = COALESCE($5, youtube_refresh_token),
        youtube_token_expires_at   = COALESCE($6, youtube_token_expires_at),
        youtube_connected          = COALESCE($7, youtube_connected),
        updated_at                 = NOW()
      WHERE project_id = $8
      RETURNING *
    `, [
      youtube_channel_id, youtube_channel_name, youtube_channel_avatar_url,
      youtube_access_token, youtube_refresh_token, youtube_token_expires_at,
      youtube_connected,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating YouTube config:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
