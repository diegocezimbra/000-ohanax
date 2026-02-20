/**
 * Image Generation Adapter - DALL-E 3 + Flux + Z-Image-Turbo (Replicate) abstraction.
 */

/**
 * Generate an image from a text prompt.
 * @param {Object} opts
 * @param {string} opts.provider - 'dalle' | 'flux' | 'z_image_turbo'
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
  flux_schnell: callFluxSchnell,
  z_image_turbo: callZImageTurbo,
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

// --- Flux Schnell (black-forest-labs/flux-schnell on Replicate) ---
// ~$0.003/image — 13x cheaper than flux-1.1-pro, ~2s generation time

async function callFluxSchnell({ apiKey, prompt, width, height }) {
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'black-forest-labs/flux-schnell',
      input: {
        prompt,
        width: width || 1920,
        height: height || 1080,
        num_outputs: 1,
      },
    }),
  });

  const prediction = await createResponse.json();
  if (prediction.error) {
    throw new Error(`Flux Schnell: ${prediction.error}`);
  }

  const result = await pollReplicatePrediction(apiKey, prediction.id, 120000, 'Flux Schnell');
  const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

  if (!imageUrl) {
    throw new Error('Flux Schnell: No output image received');
  }

  const imageResponse = await fetch(imageUrl);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  return {
    buffer,
    mimeType: 'image/webp',
    metadata: { model: 'black-forest-labs/flux-schnell' },
  };
}

// --- Z-Image-Turbo (prunaai/z-image-turbo on Replicate) ---

async function callZImageTurbo({ apiKey, prompt, negativePrompt, width, height }) {
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

  // Poll for completion (max 3 minutes - turbo models are fast)
  const result = await pollReplicatePrediction(apiKey, prediction.id, 180000, 'Z-Image-Turbo');
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

// --- Shared Replicate polling helper ---

async function pollReplicatePrediction(apiKey, predictionId, timeoutMs, providerName = 'Replicate') {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const data = await response.json();

    if (data.status === 'succeeded') return data;
    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(`${providerName} prediction ${data.status}: ${data.error || 'unknown'}`);
    }

    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error(`${providerName}: Prediction timed out`);
}
