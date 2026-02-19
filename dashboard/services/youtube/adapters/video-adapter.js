/**
 * Video Generation Adapter - Runway ML + Kling AI + Veo 3 (Replicate) abstraction.
 */

/**
 * Generate a short video clip from an image + prompt.
 * @param {Object} opts
 * @param {string} opts.provider - 'runway' | 'kling' | 'veo3'
 * @param {string} opts.apiKey
 * @param {string} opts.prompt - Motion description
 * @param {string} opts.imageUrl - Source image URL
 * @param {number} opts.duration - 4 | 5 | 8 | 10 seconds
 * @param {string} opts.aspectRatio - '16:9' | '9:16' | '1:1'
 * @returns {Promise<{ buffer: Buffer, mimeType: string, metadata: Object }>}
 */
// --- Provider Registry ---
const VIDEO_PROVIDERS = {
  runway: callRunway,
  kling: callKling,
  veo3: callVeo3,
};

export async function generateVideo({
  provider, apiKey, prompt, imageUrl,
  duration = 5, aspectRatio = '16:9',
}) {
  const handler = VIDEO_PROVIDERS[provider];
  if (!handler) {
    throw new Error(`Unknown video provider: '${provider}'. Available: ${Object.keys(VIDEO_PROVIDERS).join(', ')}`);
  }
  return handler({ apiKey, prompt, imageUrl, duration, aspectRatio });
}

// --- Runway ML (Gen-3 Alpha) ---

async function callRunway({ apiKey, prompt, imageUrl, duration, aspectRatio }) {
  const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      promptImage: imageUrl,
      promptText: prompt,
      duration,
      ratio: aspectRatio,
      watermark: false,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Runway: ${data.error || JSON.stringify(data)}`);
  }

  const taskId = data.id;
  const result = await pollRunwayTask(apiKey, taskId, 600000);

  const videoResponse = await fetch(result.output[0]);
  const buffer = Buffer.from(await videoResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'video/mp4',
    metadata: { model: 'gen3a_turbo', taskId },
  };
}

async function pollRunwayTask(apiKey, taskId, timeoutMs) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
      },
    });
    const data = await response.json();

    if (data.status === 'SUCCEEDED') return data;
    if (data.status === 'FAILED') {
      throw new Error(`Runway task failed: ${data.failure || 'unknown'}`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Runway: Task timed out');
}

// --- Kling AI ---

async function callKling({ apiKey, prompt, imageUrl, duration, aspectRatio }) {
  const response = await fetch('https://api.klingai.com/v1/videos/image2video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_name: 'kling-v1',
      image: imageUrl,
      prompt,
      duration: String(duration),
      aspect_ratio: aspectRatio,
      mode: 'std',
    }),
  });

  const data = await response.json();
  if (data.code !== 0) {
    throw new Error(`Kling: ${data.message || JSON.stringify(data)}`);
  }

  const taskId = data.data.task_id;
  const result = await pollKlingTask(apiKey, taskId, 600000);

  const videoUrl = result.data.task_result.videos[0].url;
  const videoResponse = await fetch(videoUrl);
  const buffer = Buffer.from(await videoResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'video/mp4',
    metadata: { model: 'kling-v1', taskId },
  };
}

async function pollKlingTask(apiKey, taskId, timeoutMs) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`https://api.klingai.com/v1/videos/image2video/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await response.json();

    if (data.data?.task_status === 'succeed') return data;
    if (data.data?.task_status === 'failed') {
      throw new Error(`Kling task failed: ${data.data.task_status_msg || 'unknown'}`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Kling: Task timed out');
}

// --- Veo 3 Fast (google/veo-3-fast on Replicate) ---

async function callVeo3({ apiKey, prompt, imageUrl, duration, aspectRatio }) {
  const input = {
    prompt,
    duration: duration || 8,
    aspect_ratio: aspectRatio || '16:9',
  };

  // Veo 3 supports image-to-video via image input
  if (imageUrl) {
    input.image = imageUrl;
  }

  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/veo-3-fast',
      input,
    }),
  });

  const prediction = await createResponse.json();
  if (prediction.error) {
    throw new Error(`Veo3: ${prediction.error}`);
  }

  // Poll for completion (max 10 minutes - video generation takes longer)
  const result = await pollReplicatePrediction(apiKey, prediction.id, 600000);
  const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  if (!videoUrl) {
    throw new Error('Veo3: No output video received');
  }

  const videoResponse = await fetch(videoUrl);
  const buffer = Buffer.from(await videoResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'video/mp4',
    metadata: { model: 'google/veo-3-fast', predictionId: prediction.id },
  };
}

// --- Shared Replicate polling helper ---

async function pollReplicatePrediction(apiKey, predictionId, timeoutMs) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await response.json();

    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Veo3 prediction ${data.status}: ${data.error || 'unknown'}`);
    }

    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('Veo3: Prediction timed out');
}
