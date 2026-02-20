import { Router } from 'express';
import { db } from '../../db.js';
import { invalidateSettingsCache, getAvailableEnvProviders } from '../../services/youtube/settings-helper.js';
import { getConfigDefaults } from '../../services/youtube/config-defaults.js';

const router = Router({ mergeParams: true });

const MASK_PLACEHOLDER = '****';

// =============================================================================
// HELPERS
// =============================================================================
function maskApiKey(key) {
  if (!key || key.length < 8) return key ? MASK_PLACEHOLDER : null;
  return MASK_PLACEHOLDER + key.slice(-4);
}

/** Returns true if value is a masked placeholder (should not be saved). */
function isMasked(val) {
  return typeof val === 'string' && val.startsWith(MASK_PLACEHOLDER);
}

/** Clean value: if masked or empty string, return null (so COALESCE keeps DB value). */
function cleanKeyValue(val) {
  if (!val || isMasked(val)) return null;
  return val;
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

    const row = maskSettingsRow(result.rows[0]);

    // Parse emotional_triggers (comma-separated string) into array for frontend
    if (row.emotional_triggers && typeof row.emotional_triggers === 'string') {
      row.storytelling_triggers = row.emotional_triggers.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      row.storytelling_triggers = [];
    }

    // Parse narrative_template into individual fields for frontend
    if (row.narrative_template) {
      const tpl = row.narrative_template;
      const hookMatch = tpl.match(/Hook\s*\([^)]*\):\s*(.*?)(?=\s*Contexto\s*\(|$)/s);
      const ctxMatch = tpl.match(/Contexto\s*\([^)]*\):\s*(.*?)(?=\s*Desenvolvimento\s*\(|$)/s);
      const devMatch = tpl.match(/Desenvolvimento\s*\([^)]*\):\s*(.*?)(?=\s*Virada\s*\(|$)/s);
      const twistMatch = tpl.match(/Virada\s*\([^)]*\):\s*(.*?)(?=\s*Resolucao\s*|$)/s);
      const resMatch = tpl.match(/Resolucao\s*(?:Triunfante\s*)?\([^)]*\):\s*(.*?)$/s);
      row.storytelling_hook = hookMatch?.[1]?.trim() || '';
      row.storytelling_context = ctxMatch?.[1]?.trim() || '';
      row.storytelling_development = devMatch?.[1]?.trim() || '';
      row.storytelling_twist = twistMatch?.[1]?.trim() || '';
      row.storytelling_resolution = resMatch?.[1]?.trim() || '';
    }

    res.json({ success: true, data: row });
  } catch (err) {
    console.error('[YouTube/Settings] Error fetching settings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /env-providers - Which providers have env var keys configured
// =============================================================================
router.get('/env-providers', (req, res) => {
  res.json({ success: true, data: getAvailableEnvProviders() });
});

// =============================================================================
// GET /defaults - All configuration defaults (niches, stages, triggers, etc.)
// Single endpoint so the frontend never needs hardcoded lists.
// =============================================================================
router.get('/defaults', (req, res) => {
  res.json({ success: true, data: getConfigDefaults() });
});

// =============================================================================
// PUT /content-engine - Update content engine settings
// =============================================================================
router.put('/content-engine', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      duration_target, buffer_size, max_gen_per_day, min_richness
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        target_duration_minutes        = COALESCE($1, target_duration_minutes),
        content_engine_buffer_size     = COALESCE($2, content_engine_buffer_size),
        content_engine_max_gen_per_day = COALESCE($3, content_engine_max_gen_per_day),
        min_richness_score             = COALESCE($4, min_richness_score),
        updated_at                     = NOW()
      WHERE project_id = $5
      RETURNING *
    `, [
      duration_target ? parseInt(duration_target.split('-')[0]) : null,
      buffer_size, max_gen_per_day, min_richness,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    invalidateSettingsCache(projectId);
    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating content engine:', err.message);
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
      storytelling_style, target_video_length, language,
      narrative_template, emotional_triggers, title_template,
      narration_tone, target_duration_minutes, min_richness_score,
      // Frontend sends these individual fields + triggers array
      hook, context, development, twist, resolution, triggers
    } = req.body;

    // Build narrative_template from individual fields if provided
    let finalNarrativeTemplate = narrative_template || null;
    if (!finalNarrativeTemplate && (hook || context || development || twist || resolution)) {
      const parts = [];
      if (hook) parts.push(`Hook (0:00-0:30): ${hook}`);
      if (context) parts.push(`Contexto (0:30-5:00): ${context}`);
      if (development) parts.push(`Desenvolvimento (5:00-20:00): ${development}`);
      if (twist) parts.push(`Virada (20:00-30:00): ${twist}`);
      if (resolution) parts.push(`Resolucao Triunfante (30:00+): ${resolution}`);
      finalNarrativeTemplate = parts.join(' ');
    }

    // Accept triggers (array of keys from frontend) or emotional_triggers (legacy string)
    let finalTriggers = emotional_triggers || null;
    if (!finalTriggers && Array.isArray(triggers)) {
      finalTriggers = triggers.join(', ');
    }

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        storytelling_style      = COALESCE($1, storytelling_style),
        target_video_length     = COALESCE($2, target_video_length),
        language                = COALESCE($3, language),
        narrative_template      = COALESCE($4, narrative_template),
        emotional_triggers      = COALESCE($5, emotional_triggers),
        title_template          = COALESCE($6, title_template),
        narration_tone          = COALESCE($7, narration_tone),
        target_duration_minutes = COALESCE($8, target_duration_minutes),
        min_richness_score      = COALESCE($9, min_richness_score),
        updated_at              = NOW()
      WHERE project_id = $10
      RETURNING *
    `, [
      storytelling_style, target_video_length, language,
      finalNarrativeTemplate, finalTriggers, title_template,
      narration_tone, target_duration_minutes, min_richness_score,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    invalidateSettingsCache(projectId);
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
      search_provider, search_api_key,
      openai_api_key, replicate_api_key
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        llm_provider      = COALESCE($1, llm_provider),
        llm_api_key       = COALESCE($2, llm_api_key),
        llm_model         = COALESCE($3, llm_model),
        tts_provider      = COALESCE($4, tts_provider),
        tts_api_key       = COALESCE($5, tts_api_key),
        tts_voice_id      = COALESCE($6, tts_voice_id),
        tts_speed         = COALESCE($7, tts_speed),
        tts_stability     = COALESCE($8, tts_stability),
        image_provider    = COALESCE($9, image_provider),
        image_api_key     = COALESCE($10, image_api_key),
        image_style       = COALESCE($11, image_style),
        video_provider    = COALESCE($12, video_provider),
        video_api_key     = COALESCE($13, video_api_key),
        search_provider   = COALESCE($14, search_provider),
        search_api_key    = COALESCE($15, search_api_key),
        openai_api_key    = COALESCE($16, openai_api_key),
        replicate_api_key = COALESCE($17, replicate_api_key),
        updated_at        = NOW()
      WHERE project_id = $18
      RETURNING *
    `, [
      llm_provider, cleanKeyValue(llm_api_key), llm_model,
      tts_provider, cleanKeyValue(tts_api_key), tts_voice_id, tts_speed, tts_stability,
      image_provider, cleanKeyValue(image_api_key), image_style,
      video_provider, cleanKeyValue(video_api_key),
      search_provider, cleanKeyValue(search_api_key),
      cleanKeyValue(openai_api_key), cleanKeyValue(replicate_api_key),
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    invalidateSettingsCache(projectId);
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
      publication_timezone, default_visibility, auto_publish,
      max_publishes_per_day, preferred_publish_hour
    } = req.body;

    // Support both field naming conventions
    const maxPubDay = max_publications_per_day || max_publishes_per_day || null;
    // If preferred_publish_hour sent (legacy), convert to publication_times
    let pubTimes = publication_times;
    if (!pubTimes && preferred_publish_hour !== undefined) {
      const h = String(preferred_publish_hour).padStart(2, '0');
      pubTimes = JSON.stringify([`${h}:00`]);
    } else if (pubTimes && typeof pubTimes !== 'string') {
      pubTimes = JSON.stringify(pubTimes);
    }
    const pubDays = publication_days && typeof publication_days !== 'string'
      ? JSON.stringify(publication_days) : publication_days;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        max_publications_per_day = COALESCE($1, max_publications_per_day),
        max_publishes_per_day    = COALESCE($1, max_publishes_per_day),
        publication_times        = COALESCE($2::jsonb, publication_times),
        publication_days         = COALESCE($3::jsonb, publication_days),
        publication_timezone     = COALESCE($4, publication_timezone),
        default_visibility       = COALESCE($5, default_visibility),
        auto_publish             = COALESCE($6, auto_publish),
        preferred_publish_hour   = COALESCE($7, preferred_publish_hour),
        updated_at               = NOW()
      WHERE project_id = $8
      RETURNING *
    `, [
      maxPubDay, pubTimes, pubDays,
      publication_timezone, default_visibility, auto_publish,
      preferred_publish_hour,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    invalidateSettingsCache(projectId);
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
      visual_style, brand_colors, watermark_url,
      thumbnail_font, thumbnail_font_size, thumbnail_text_color,
      thumbnail_text_position, thumbnail_stroke_color, thumbnail_stroke_width,
      transition_type, transition_duration_ms, ken_burns_intensity,
      background_music_volume
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        visual_style            = COALESCE($1, visual_style),
        brand_colors            = COALESCE($2, brand_colors),
        watermark_url           = COALESCE($3, watermark_url),
        thumbnail_font          = COALESCE($4, thumbnail_font),
        thumbnail_font_size     = COALESCE($5, thumbnail_font_size),
        thumbnail_text_color    = COALESCE($6, thumbnail_text_color),
        thumbnail_text_position = COALESCE($7, thumbnail_text_position),
        thumbnail_stroke_color  = COALESCE($8, thumbnail_stroke_color),
        thumbnail_stroke_width  = COALESCE($9, thumbnail_stroke_width),
        transition_type         = COALESCE($10, transition_type),
        transition_duration_ms  = COALESCE($11, transition_duration_ms),
        ken_burns_intensity     = COALESCE($12, ken_burns_intensity),
        background_music_volume = COALESCE($13, background_music_volume),
        updated_at              = NOW()
      WHERE project_id = $14
      RETURNING *
    `, [
      visual_style, brand_colors, watermark_url,
      thumbnail_font, thumbnail_font_size, thumbnail_text_color,
      thumbnail_text_position, thumbnail_stroke_color, thumbnail_stroke_width,
      transition_type, transition_duration_ms, ken_burns_intensity,
      background_music_volume,
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    invalidateSettingsCache(projectId);
    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating visual identity:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// PUT /youtube - Update YouTube settings (channel, category, OAuth creds)
// =============================================================================
router.put('/youtube', async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      youtube_channel_id, youtube_channel_name, youtube_channel_avatar_url,
      youtube_category_id,
      youtube_access_token, youtube_refresh_token, youtube_token_expires_at,
      youtube_connected,
      google_client_id, google_client_secret
    } = req.body;

    const result = await db.analytics.query(`
      UPDATE yt_project_settings
      SET
        youtube_channel_id         = COALESCE($1, youtube_channel_id),
        youtube_channel_name       = COALESCE($2, youtube_channel_name),
        youtube_channel_avatar_url = COALESCE($3, youtube_channel_avatar_url),
        youtube_category_id        = COALESCE($4, youtube_category_id),
        youtube_access_token       = COALESCE($5, youtube_access_token),
        youtube_refresh_token      = COALESCE($6, youtube_refresh_token),
        youtube_token_expires_at   = COALESCE($7, youtube_token_expires_at),
        youtube_connected          = COALESCE($8, youtube_connected),
        google_client_id           = COALESCE($9, google_client_id),
        google_client_secret       = COALESCE($10, google_client_secret),
        updated_at                 = NOW()
      WHERE project_id = $11
      RETURNING *
    `, [
      youtube_channel_id, youtube_channel_name, youtube_channel_avatar_url,
      youtube_category_id ? String(youtube_category_id) : null,
      cleanKeyValue(youtube_access_token), cleanKeyValue(youtube_refresh_token),
      youtube_token_expires_at,
      youtube_connected,
      cleanKeyValue(google_client_id), cleanKeyValue(google_client_secret),
      projectId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    invalidateSettingsCache(projectId);
    res.json({ success: true, data: maskSettingsRow(result.rows[0]) });
  } catch (err) {
    console.error('[YouTube/Settings] Error updating YouTube config:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /youtube/auth-url - Generate Google OAuth URL
// =============================================================================
router.get('/youtube/auth-url', async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await db.analytics.query(
      'SELECT google_client_id FROM yt_project_settings WHERE project_id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    const clientId = result.rows[0].google_client_id;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Google Client ID not configured. Save it first.' });
    }

    // AppRunner is behind a load balancer, so req.protocol may be 'http' even when accessed via https
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const redirectUri = `${protocol}://${req.get('host')}/api/youtube/projects/${projectId}/settings/youtube/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];

    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: projectId,
    }).toString();

    res.json({ success: true, data: { authUrl, redirectUri } });
  } catch (err) {
    console.error('[YouTube/Settings] Error generating auth URL:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// GET /youtube/callback - Handle OAuth code exchange
// =============================================================================
router.get('/youtube/callback', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { code, error } = req.query;

    if (error) {
      return res.redirect(`/video/#projects/${projectId}/settings?oauth_error=${error}`);
    }

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code missing' });
    }

    const settings = await db.analytics.query(
      'SELECT google_client_id, google_client_secret FROM yt_project_settings WHERE project_id = $1',
      [projectId]
    );

    if (settings.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Settings not found' });
    }

    const { google_client_id, google_client_secret } = settings.rows[0];
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const redirectUri = `${protocol}://${req.get('host')}/api/youtube/projects/${projectId}/settings/youtube/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: google_client_id,
        client_secret: google_client_secret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) {
      return res.redirect(`/video/#projects/${projectId}/settings?oauth_error=${tokens.error_description || tokens.error}`);
    }

    // Get channel info
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { 'Authorization': `Bearer ${tokens.access_token}` } }
    );
    const channelData = await channelRes.json();
    const channel = channelData.items?.[0];

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

    // Save tokens + channel info
    await db.analytics.query(`
      UPDATE yt_project_settings SET
        youtube_access_token = $2,
        youtube_refresh_token = $3,
        youtube_token_expires_at = $4,
        youtube_connected = true,
        youtube_channel_id = COALESCE($5, youtube_channel_id),
        youtube_channel_name = COALESCE($6, youtube_channel_name),
        youtube_channel_avatar_url = COALESCE($7, youtube_channel_avatar_url),
        updated_at = NOW()
      WHERE project_id = $1
    `, [
      projectId,
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt,
      channel?.id || null,
      channel?.snippet?.title || null,
      channel?.snippet?.thumbnails?.default?.url || null,
    ]);

    invalidateSettingsCache(projectId);
    res.redirect(`/video/#projects/${projectId}/settings?oauth_success=true`);
  } catch (err) {
    console.error('[YouTube/Settings] OAuth callback error:', err.message);
    res.redirect(`/video/#projects/${req.params.projectId}/settings?oauth_error=${encodeURIComponent(err.message)}`);
  }
});

// =============================================================================
// POST /youtube/disconnect - Disconnect YouTube channel
// =============================================================================
router.post('/youtube/disconnect', async (req, res) => {
  try {
    const { projectId } = req.params;

    await db.analytics.query(`
      UPDATE yt_project_settings SET
        youtube_connected = false,
        youtube_access_token = NULL,
        youtube_refresh_token = NULL,
        youtube_token_expires_at = NULL,
        youtube_channel_id = NULL,
        youtube_channel_name = NULL,
        youtube_channel_avatar_url = NULL,
        updated_at = NOW()
      WHERE project_id = $1
    `, [projectId]);

    invalidateSettingsCache(projectId);
    res.json({ success: true });
  } catch (err) {
    console.error('[YouTube/Settings] Error disconnecting:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
