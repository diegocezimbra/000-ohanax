/**
 * Image Generation Adapter - Z-Image-Turbo (Replicate).
 * ~$0.003/image, ~2-4s generation time.
 * Model: prunaai/z-image-turbo on Replicate.
 */

const IMAGE_RETRY_LIMIT = 4;
const IMAGE_RETRY_DELAY_MS = 8000;

/**
 * Generate an image from a text prompt (with retry on transient failures).
 * @param {Object} opts
 * @param {string} opts.apiKey - Replicate API token
 * @param {string} opts.prompt
 * @param {string} [opts.negativePrompt]
 * @param {number} [opts.width=1920]
 * @param {number} [opts.height=1080]
 * @returns {Promise<{ buffer: Buffer, mimeType: string, metadata: Object }>}
 */
export async function generateImage({
  apiKey, prompt, negativePrompt = '',
  width = 1920, height = 1088,
}) {
  // Z-Image-Turbo requires dimensions divisible by 16
  width = Math.round(width / 16) * 16;
  height = Math.round(height / 16) * 16;
  for (let attempt = 1; attempt <= IMAGE_RETRY_LIMIT; attempt++) {
    try {
      return await _generateImageOnce({ apiKey, prompt, negativePrompt, width, height });
    } catch (err) {
      const isRetryable = err.message.includes('timed out') || err.message.includes('504')
        || err.message.includes('502') || err.message.includes('503')
        || err.message.includes('throttled') || err.message.includes('rate limit');
      if (attempt === IMAGE_RETRY_LIMIT || !isRetryable) throw err;
      // Longer delay for rate-limit errors (wait for window to reset)
      const isRateLimit = err.message.includes('throttled') || err.message.includes('rate limit');
      const delay = isRateLimit ? 15000 * attempt : IMAGE_RETRY_DELAY_MS * attempt;
      console.warn(`[ImageAdapter] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function _generateImageOnce({ apiKey, prompt, negativePrompt, width, height }) {
  const createResponse = await fetch('https://api.replicate.com/v1/models/prunaai/z-image-turbo/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: {
        prompt,
        negative_prompt: negativePrompt || '',
        width: width || 1920,
        height: height || 1088,
        num_inference_steps: 8,
        guidance_scale: 0,
        output_format: 'webp',
        output_quality: 90,
        num_outputs: 1,
      },
    }),
  });

  const prediction = await createResponse.json();
  if (!createResponse.ok || prediction.error || prediction.detail) {
    throw new Error(`Z-Image-Turbo: ${prediction.error || prediction.detail || createResponse.statusText}`);
  }
  if (!prediction.id) {
    throw new Error(`Z-Image-Turbo: No prediction ID returned`);
  }

  const result = await pollReplicatePrediction(apiKey, prediction.id, 300000);
  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  if (!imageUrl) {
    throw new Error('Z-Image-Turbo: No output image received');
  }

  const imageResponse = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'image/webp',
    metadata: { model: 'prunaai/z-image-turbo' },
  };
}

// --- Replicate polling helper ---

async function pollReplicatePrediction(apiKey, predictionId, timeoutMs) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await response.json();

    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Z-Image-Turbo prediction ${data.status}: ${data.error || 'unknown'}`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Z-Image-Turbo: Prediction timed out');
}
