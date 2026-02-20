/**
 * Publisher Service - Manages the publishing queue and YouTube uploads.
 * Handles scheduling, review workflow, and actual publishing.
 */
import { db } from '../../db.js';
import { downloadFile, getPresignedUrl } from './s3.js';
import { uploadVideo, setThumbnail, refreshAccessToken } from './adapters/youtube-api.js';
import { getProjectSettings, invalidateSettingsCache } from './settings-helper.js';
import { calculateNextPublishSlot } from './pipeline-orchestrator.js';

/**
 * Queue a topic for publishing review.
 * @param {string} topicId
 * @param {Object} opts
 * @param {string} opts.scheduledFor - ISO date string or null for ASAP
 * @returns {Promise<Object>} Publication row
 */
export async function queueForPublishing(topicId, { scheduledFor } = {}) {
  const pool = db.analytics;

  const { rows: topics } = await pool.query('SELECT * FROM yt_topics WHERE id = $1', [topicId]);
  const topic = topics[0];
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  // Verify all assets exist
  const { rows: videos } = await pool.query(
    'SELECT * FROM yt_final_videos WHERE topic_id = $1', [topicId],
  );
  if (videos.length === 0) throw new Error('No assembled video found');

  const { rows: scripts } = await pool.query(
    'SELECT * FROM yt_scripts WHERE topic_id = $1', [topicId],
  );

  // Calculate publish slot if not specified
  let publishAt = scheduledFor;
  if (!publishAt) {
    publishAt = await calculateNextPublishSlot(topic.project_id);
  }

  const { rows } = await pool.query(
    `INSERT INTO yt_publications (topic_id, project_id, video_id, status, scheduled_for,
      youtube_title, youtube_description, youtube_tags)
     VALUES ($1, $2, $3, 'pending_review', $4, $5, $6, $7)
     ON CONFLICT (topic_id) DO UPDATE
     SET status = 'pending_review', scheduled_for = $4,
         youtube_title = $5, youtube_description = $6, youtube_tags = $7,
         updated_at = NOW()
     RETURNING *`,
    [
      topicId, topic.project_id, videos[0].id, publishAt,
      scripts[0]?.youtube_title || topic.title,
      scripts[0]?.youtube_description || '',
      scripts[0]?.youtube_tags || '[]',
    ],
  );

  // Update topic stage
  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'queued_for_publishing', updated_at = NOW() WHERE id = $1`,
    [topicId],
  );

  return rows[0];
}

/**
 * Approve a publication for publishing.
 */
export async function approvePublication(publicationId) {
  const { rows } = await db.analytics.query(
    `UPDATE yt_publications SET status = 'approved', updated_at = NOW()
     WHERE id = $1 AND status = 'pending_review'
     RETURNING *`,
    [publicationId],
  );
  if (rows.length === 0) throw new Error('Publication not found or not in review');
  return rows[0];
}

/**
 * Reject a publication with feedback.
 */
export async function rejectPublication(publicationId, feedback) {
  const { rows } = await db.analytics.query(
    `UPDATE yt_publications SET status = 'rejected', review_notes = $1, updated_at = NOW()
     WHERE id = $2 AND status = 'pending_review'
     RETURNING *`,
    [feedback, publicationId],
  );
  if (rows.length === 0) throw new Error('Publication not found or not in review');
  return rows[0];
}

/**
 * Publish an approved video to YouTube.
 * Called by the publishing cron job or manually.
 * @param {string} publicationId
 * @returns {Promise<Object>} Updated publication with YouTube URL
 */
export async function publishToYouTube(publicationId) {
  const pool = db.analytics;

  const { rows: pubs } = await pool.query(
    'SELECT * FROM yt_publications WHERE id = $1', [publicationId],
  );
  const pub = pubs[0];
  if (!pub) throw new Error('Publication not found');
  if (pub.status !== 'approved') throw new Error('Publication not approved');

  const settings = await getProjectSettings(pub.project_id);

  // Refresh OAuth token
  const { accessToken } = await refreshAccessToken({
    clientId: settings.google_client_id || process.env.YT_GOOGLE_CLIENT_ID,
    clientSecret: settings.google_client_secret || process.env.YT_GOOGLE_CLIENT_SECRET,
    refreshToken: settings.youtube_refresh_token,
  });

  // Update stored access token
  await pool.query(
    `UPDATE yt_project_settings SET youtube_access_token = $1, updated_at = NOW()
     WHERE project_id = $2`,
    [accessToken, pub.project_id],
  );
  invalidateSettingsCache(pub.project_id);

  // Download the video file
  const { rows: videos } = await pool.query(
    'SELECT * FROM yt_final_videos WHERE id = $1', [pub.video_id],
  );
  const videoBuffer = await downloadFile(videos[0].s3_key);

  // Parse tags
  let tags;
  try {
    tags = typeof pub.youtube_tags === 'string' ? JSON.parse(pub.youtube_tags) : pub.youtube_tags;
  } catch { tags = []; }

  // AI disclosure required by YouTube policy (March 2024) to maintain YPP eligibility
  const aiDisclosure = '\n\n---\nEste vídeo foi produzido com auxílio de ferramentas de inteligência artificial para geração de roteiro, narração e elementos visuais. Todo o conteúdo foi revisado e curado por humanos.';
  let description = pub.youtube_description || '';
  if (!description.includes('auxílio de ferramentas de inteligência artificial')) {
    description += aiDisclosure;
  }

  // Upload to YouTube
  const result = await uploadVideo({
    accessToken,
    videoBuffer,
    metadata: {
      title: pub.youtube_title,
      description,
      tags,
      categoryId: settings.youtube_category_id || '22',
      privacyStatus: pub.scheduled_for ? 'private' : (settings.default_visibility || 'public'),
      publishAt: pub.scheduled_for || null,
      madeForKids: false,
      selfDeclaredMadeForKids: false,
    },
    onProgress: (uploaded, total) => {
      const pct = Math.round((uploaded / total) * 100);
      console.log(`Upload progress: ${pct}%`);
    },
  });

  // Set custom thumbnail
  const { rows: thumbnails } = await pool.query(
    'SELECT * FROM yt_thumbnails WHERE topic_id = $1 AND is_selected = true LIMIT 1',
    [pub.topic_id],
  );

  if (thumbnails.length > 0) {
    const thumbBuffer = await downloadFile(thumbnails[0].s3_key);
    await setThumbnail({
      accessToken,
      videoId: result.videoId,
      imageBuffer: thumbBuffer,
    });
  }

  // Update publication status
  const { rows: updated } = await pool.query(
    `UPDATE yt_publications
     SET status = 'published', youtube_video_id = $1, youtube_url = $2,
         published_at = NOW(), updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [result.videoId, result.url, publicationId],
  );

  // Update topic stage
  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'published', status = 'published', updated_at = NOW()
     WHERE id = $1`,
    [pub.topic_id],
  );

  return updated[0];
}

/**
 * Publishing cron - called periodically to publish approved & scheduled videos.
 * Respects auto_publish setting: only auto-publishes if enabled in project settings.
 */
export async function runPublishingCron() {
  const pool = db.analytics;

  // Get approved publications that are due, joined with project settings to check auto_publish
  const { rows: due } = await pool.query(
    `SELECT p.id, p.project_id
     FROM yt_publications p
     LEFT JOIN yt_project_settings s ON s.project_id = p.project_id
     WHERE p.status = 'approved'
       AND (p.scheduled_for IS NULL OR p.scheduled_for <= NOW())
       AND COALESCE(s.auto_publish, false) = true
     ORDER BY p.scheduled_for ASC NULLS FIRST
     LIMIT 3`,
  );

  for (const pub of due) {
    try {
      await publishToYouTube(pub.id);
      console.log(`[Publisher] Published: ${pub.id}`);
    } catch (err) {
      console.error(`[Publisher] Publish failed for ${pub.id}:`, err.message);
      await pool.query(
        `UPDATE yt_publications SET status = 'failed', review_notes = $1, updated_at = NOW()
         WHERE id = $2`,
        [err.message, pub.id],
      );
    }
  }
}

// calculateNextPublishSlot is imported from pipeline-orchestrator.js (single source of truth)
