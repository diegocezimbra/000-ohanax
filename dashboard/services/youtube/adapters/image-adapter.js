/**
 * Image Generation Adapter - DALL-E 3 + Flux abstraction.
 */

/**
 * Generate an image from a text prompt.
 * @param {Object} opts
 * @param {string} opts.provider - 'dalle' | 'flux'
 * @param {string} opts.apiKey
 * @param {string} opts.prompt
 * @param {string} opts.negativePrompt - ignored by DALL-E
 * @param {number} opts.width - default 1792 (DALL-E) or 1920
 * @param {number} opts.height - default 1024 (DALL-E) or 1080
 * @param {string} opts.style - 'natural' | 'vivid' (DALL-E) or model-specific
 * @returns {Promise<{ buffer: Buffer, mimeType: string, metadata: Object }>}
 */
// --- Provider Registry ---
const IMAGE_PROVIDERS = {
  dalle: callDallE,
  flux: callFlux,
};

export async function generateImage({
  provider, apiKey, prompt, negativePrompt = '',
  width = 1920, height = 1080, style = 'vivid',
}) {
  const handler = IMAGE_PROVIDERS[provider];
  if (!handler) {
    throw new Error(`Unknown image provider: '${provider}'. Available: ${Object.keys(IMAGE_PROVIDERS).join(', ')}`);
  }
  return handler({ apiKey, prompt, negativePrompt, width, height, style });
}

// --- Internal providers ---

async function callDallE({ apiKey, prompt, style }) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: '1792x1024', // Closest 16:9 size supported
      quality: 'hd',
      style,
      n: 1,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`DALL-E: ${data.error.message || JSON.stringify(data.error)}`);
  }

  const imageUrl = data.data[0].url;
  const revisedPrompt = data.data[0].revised_prompt;

  // Download image to buffer
  const imageResponse = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'image/png',
    metadata: { model: 'dall-e-3', revisedPrompt },
  };
}

async function callFlux({ apiKey, prompt, negativePrompt, width, height }) {
  // Replicate API for Flux model
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'black-forest-labs/flux-1.1-pro',
      input: {
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        num_outputs: 1,
      },
    }),
  });

  const prediction = await createResponse.json();
  if (prediction.error) {
    throw new Error(`Flux: ${prediction.error}`);
  }

  // Poll for completion (max 5 minutes)
  const result = await pollReplicatePrediction(apiKey, prediction.id, 300000);
  const imageUrl = result.output?.[0] || result.output;

  if (!imageUrl) {
    throw new Error('Flux: No output image received');
  }

  const imageResponse = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'image/png',
    metadata: { model: 'flux-1.1-pro' },
  };
}

async function pollReplicatePrediction(apiKey, predictionId, timeoutMs) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await response.json();

    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`Flux prediction ${data.status}: ${data.error || 'unknown'}`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Flux: Prediction timed out');
}
