/**
 * Image Generation Adapter - Z-Image-Turbo (Replicate).
 * ~$0.003/image, ~2-4s generation time.
 * Model: prunaai/z-image-turbo on Replicate.
 */

/**
 * Generate an image from a text prompt.
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
  width = 1920, height = 1080,
}) {
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'prunaai/z-image-turbo',
      input: {
        prompt,
        negative_prompt: negativePrompt || '',
        width: width || 1920,
        height: height || 1080,
        num_inference_steps: 4,
        guidance_scale: 3.5,
        num_outputs: 1,
      },
    }),
  });

  const prediction = await createResponse.json();
  if (prediction.error) {
    throw new Error(`Z-Image-Turbo: ${prediction.error}`);
  }

  const result = await pollReplicatePrediction(apiKey, prediction.id, 180000);
  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  if (!imageUrl) {
    throw new Error('Z-Image-Turbo: No output image received');
  }

  const imageResponse = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'image/png',
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
