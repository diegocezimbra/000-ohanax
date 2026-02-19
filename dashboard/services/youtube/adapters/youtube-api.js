/**
 * YouTube Data API v3 Adapter.
 * Handles OAuth token refresh and resumable uploads.
 */

/**
 * Refresh an expired OAuth access token.
 * @param {Object} opts
 * @param {string} opts.clientId
 * @param {string} opts.clientSecret
 * @param {string} opts.refreshToken
 * @returns {Promise<{ accessToken: string, expiresIn: number }>}
 */
export async function refreshAccessToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`OAuth refresh: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Upload a video to YouTube using resumable upload protocol.
 * @param {Object} opts
 * @param {string} opts.accessToken
 * @param {Buffer} opts.videoBuffer
 * @param {Object} opts.metadata
 * @param {string} opts.metadata.title
 * @param {string} opts.metadata.description
 * @param {string[]} opts.metadata.tags
 * @param {string} opts.metadata.categoryId - YouTube category ID
 * @param {string} opts.metadata.privacyStatus - 'public' | 'unlisted' | 'private'
 * @param {string} opts.metadata.publishAt - ISO 8601 for scheduled publish
 * @param {Function} opts.onProgress - (uploaded, total) => void
 * @returns {Promise<{ videoId: string, url: string }>}
 */
export async function uploadVideo({
  accessToken, videoBuffer, metadata, onProgress,
}) {
  // Step 1: Initiate resumable upload
  const snippet = {
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags || [],
    categoryId: metadata.categoryId || '22', // People & Blogs
  };

  const status = {
    privacyStatus: metadata.privacyStatus || 'private',
    selfDeclaredMadeForKids: false,
  };

  if (metadata.publishAt) {
    status.privacyStatus = 'private';
    status.publishAt = metadata.publishAt;
  }

  const initResponse = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'video/mp4',
        'X-Upload-Content-Length': String(videoBuffer.length),
      },
      body: JSON.stringify({ snippet, status }),
    },
  );

  if (!initResponse.ok) {
    const error = await initResponse.json().catch(() => ({}));
    throw new Error(`YouTube upload init: ${error.error?.message || initResponse.statusText}`);
  }

  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('YouTube: No resumable upload URL returned');
  }

  // Step 2: Upload video in chunks (5MB each)
  const chunkSize = 5 * 1024 * 1024;
  let uploaded = 0;

  while (uploaded < videoBuffer.length) {
    const end = Math.min(uploaded + chunkSize, videoBuffer.length);
    const chunk = videoBuffer.slice(uploaded, end);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${uploaded}-${end - 1}/${videoBuffer.length}`,
        'Content-Type': 'video/mp4',
      },
      body: chunk,
    });

    if (uploadResponse.status === 200 || uploadResponse.status === 201) {
      const result = await uploadResponse.json();
      return {
        videoId: result.id,
        url: `https://www.youtube.com/watch?v=${result.id}`,
      };
    }

    if (uploadResponse.status !== 308) {
      const error = await uploadResponse.json().catch(() => ({}));
      throw new Error(`YouTube upload chunk: ${error.error?.message || uploadResponse.statusText}`);
    }

    uploaded = end;
    if (onProgress) onProgress(uploaded, videoBuffer.length);
  }

  throw new Error('YouTube: Upload completed but no response received');
}

/**
 * Set a custom thumbnail for a video.
 * @param {Object} opts
 * @param {string} opts.accessToken
 * @param {string} opts.videoId
 * @param {Buffer} opts.imageBuffer
 * @returns {Promise<{ thumbnailUrl: string }>}
 */
export async function setThumbnail({ accessToken, videoId, imageBuffer }) {
  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'image/png',
      },
      body: imageBuffer,
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`YouTube thumbnail: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    thumbnailUrl: data.items?.[0]?.default?.url || '',
  };
}

/**
 * Get video details (status, stats, etc.).
 * @param {Object} opts
 * @param {string} opts.accessToken
 * @param {string} opts.videoId
 * @returns {Promise<Object>}
 */
export async function getVideoDetails({ accessToken, videoId }) {
  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status,statistics&id=${videoId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`YouTube video details: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const video = data.items?.[0];
  if (!video) throw new Error(`YouTube: Video ${videoId} not found`);

  return {
    videoId: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: video.snippet.publishedAt,
    privacyStatus: video.status.privacyStatus,
    uploadStatus: video.status.uploadStatus,
    views: parseInt(video.statistics.viewCount || '0', 10),
    likes: parseInt(video.statistics.likeCount || '0', 10),
    comments: parseInt(video.statistics.commentCount || '0', 10),
  };
}

/**
 * Get channel info for the authenticated user.
 * @param {string} accessToken
 * @returns {Promise<{ channelId: string, title: string, subscriberCount: number }>}
 */
export async function getChannelInfo(accessToken) {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`YouTube channel: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const channel = data.items?.[0];
  if (!channel) throw new Error('YouTube: No channel found for this account');

  return {
    channelId: channel.id,
    title: channel.snippet.title,
    subscriberCount: parseInt(channel.statistics.subscriberCount || '0', 10),
  };
}
