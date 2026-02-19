/**
 * Visual Generator - Creates AI images/videos for each script segment.
 *
 * YouTube Monetization Compliance:
 * - "Image slideshows with minimal narrative are NOT eligible for monetization"
 * - Videos generate clips for 40%+ of segments (not just hook/climax/transition)
 * - Non-video segments get 2-3 image variants for the 3:1 visual ratio
 * - All art direction enforces MOVEMENT and ACTION (never static scenes)
 * - Camera motion instructions included in every prompt
 *
 * The 3:1 ratio (3 visual scenes per narration point) increases view duration 25-40%.
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { generateImage } from './adapters/image-adapter.js';
import { generateVideo } from './adapters/video-adapter.js';
import { uploadFile, buildKey, uniqueFilename, getPresignedUrl } from './s3.js';
import { getProjectSettings } from './settings-helper.js';

// Segment types that ALWAYS get video treatment
const ALWAYS_VIDEO_TYPES = ['hook', 'climax', 'transition'];

// Minimum percentage of segments that must be video clips for monetization
const MIN_VIDEO_RATIO = 0.4;

// Number of image variants for non-video segments (3:1 visual ratio)
const IMAGE_VARIANTS_PER_SEGMENT = 3;

/**
 * Composition types for the 3-image variant system.
 * Each variant provides different framing so the video assembler can
 * create motion by transitioning between them.
 */
const COMPOSITION_TYPES = [
  {
    label: 'wide_establishing',
    instruction: 'Wide establishing shot showing the full scene and environment. Camera positioned far back to capture context and atmosphere.',
  },
  {
    label: 'medium_subject',
    instruction: 'Medium shot focused on the main subject or action. Camera at eye level, showing the subject in relation to immediate surroundings.',
  },
  {
    label: 'closeup_detail',
    instruction: 'Close-up detail shot highlighting a specific element, texture, or emotional expression. Camera positioned intimately close.',
  },
];

/**
 * Generate visual assets for a single script segment.
 * Produces either a video clip OR 2-3 image variants depending on segment type.
 *
 * @param {string} topicId
 * @param {string} segmentId
 * @param {Object} context - Optional context for continuity
 * @param {string} context.previousVisualDescription - Description of previous segment's ending visual
 * @param {number} context.segmentIndex - Index within full segment list
 * @param {number} context.totalSegments - Total number of segments
 * @returns {Promise<Array<Object>>} Array of created visual assets (1 for video, 2-3 for images)
 */
export async function generateVisualForSegment(topicId, segmentId, context = {}) {
  const pool = db.analytics;
  const { rows: topics } = await pool.query('SELECT * FROM yt_topics WHERE id = $1', [topicId]);
  const topic = topics[0];
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const settings = await getProjectSettings(topic.project_id);

  const { rows: segments } = await pool.query(
    'SELECT * FROM yt_script_segments WHERE id = $1',
    [segmentId],
  );
  const segment = segments[0];
  if (!segment) throw new Error(`Segment ${segmentId} not found`);

  const needsVideo = shouldGenerateVideo(segment, context);
  const hasVideoProvider = Boolean(settings.video_provider && settings.video_api_key);

  // Generate art direction with continuity context
  const artPrompt = await generateArtDirection(segment, topic, settings, context);

  const createdAssets = [];

  if (needsVideo && hasVideoProvider) {
    const asset = await createVideoAsset(artPrompt, topic, settings);
    const key = buildKey(topic.project_id, 'visuals', uniqueFilename(asset.extension));
    await uploadFile(asset.buffer, key, asset.mimeType);

    const { rows } = await pool.query(
      `INSERT INTO yt_visual_assets
         (topic_id, segment_id, asset_type, s3_key, prompt_used, sort_order, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        topicId, segmentId, asset.type, key,
        artPrompt.imagePrompt, 0,
        JSON.stringify({ ...asset.metadata, variant_index: 0 }),
      ],
    );
    createdAssets.push(rows[0]);
  } else {
    // Generate multiple image variants for the 3:1 visual ratio
    const variants = await generateMultipleImagesForSegment(artPrompt, topic, settings);

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];
      const key = buildKey(topic.project_id, 'visuals', uniqueFilename(variant.extension));
      await uploadFile(variant.buffer, key, variant.mimeType);

      const { rows } = await pool.query(
        `INSERT INTO yt_visual_assets
           (topic_id, segment_id, asset_type, s3_key, prompt_used, sort_order, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          topicId, segmentId, variant.type, key,
          variant.prompt, i,
          JSON.stringify({
            ...variant.metadata,
            variant_index: i,
            composition: variant.compositionLabel,
            total_variants: variants.length,
          }),
        ],
      );
      createdAssets.push(rows[0]);
    }
  }

  return createdAssets;
}

/**
 * Generate visuals for ALL segments of a topic.
 * Enforces the 40% minimum video ratio and 3:1 image variant ratio.
 *
 * @param {string} topicId
 * @returns {Promise<Array<Object>>} All created visual assets
 */
export async function generateAllVisuals(topicId) {
  const pool = db.analytics;

  const { rows: scripts } = await pool.query(
    'SELECT id FROM yt_scripts WHERE topic_id = $1',
    [topicId],
  );
  if (scripts.length === 0) throw new Error(`No script found for topic ${topicId}`);

  const { rows: segments } = await pool.query(
    'SELECT * FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index',
    [scripts[0].id],
  );

  if (segments.length === 0) throw new Error(`No segments found for script ${scripts[0].id}`);

  // Clear any existing visual assets for a clean regeneration
  await pool.query(
    `DELETE FROM yt_visual_assets WHERE topic_id = $1`,
    [topicId],
  );

  // Pre-calculate which segments get video treatment
  const videoDecisions = computeVideoDecisions(segments);

  // Generate visuals sequentially to avoid rate limits and maintain continuity
  const allAssets = [];
  let previousVisualDescription = '';

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];

    const context = {
      previousVisualDescription,
      segmentIndex: i,
      totalSegments: segments.length,
      forceVideo: videoDecisions[i],
    };

    const assets = await generateVisualForSegment(topicId, segment.id, context);
    allAssets.push(...assets);

    // Track the last visual description for continuity
    const lastAsset = assets[assets.length - 1];
    if (lastAsset) {
      previousVisualDescription = lastAsset.prompt_used || segment.visual_direction || '';
    }
  }

  // Update topic stage
  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'visuals_created', updated_at = NOW() WHERE id = $1`,
    [topicId],
  );

  return allAssets;
}

// ---------------------------------------------------------------------------
// Internal: Video decision logic
// ---------------------------------------------------------------------------

/**
 * Determine if a segment should generate a video clip.
 *
 * Expanded from the original 3-type approach to meet the 40% minimum:
 * - ALWAYS: hook, climax, transition
 * - ALWAYS: every 3rd "main" segment (for visual variety)
 * - context.forceVideo overrides when set by computeVideoDecisions
 *
 * @param {Object} segment
 * @param {Object} context
 * @returns {boolean}
 */
function shouldGenerateVideo(segment, context = {}) {
  if (context.forceVideo === true) return true;
  if (context.forceVideo === false) return false;

  // Named types always get video
  if (ALWAYS_VIDEO_TYPES.includes(segment.segment_type)) return true;

  // Every 3rd main segment gets video for visual variety
  const index = context.segmentIndex ?? 0;
  if (segment.segment_type === 'main' && index % 3 === 0) return true;

  // Data/example segments with high narrative density benefit from video
  if (['data', 'example'].includes(segment.segment_type) && index % 2 === 0) return true;

  return false;
}

/**
 * Pre-compute video decisions across all segments to guarantee the 40% floor.
 * First pass: apply type-based rules.
 * Second pass: if below 40%, promote additional segments to video.
 *
 * @param {Array<Object>} segments
 * @returns {Object} Map of segmentIndex -> boolean (true = video)
 */
function computeVideoDecisions(segments) {
  const decisions = {};
  const targetVideoCount = Math.ceil(segments.length * MIN_VIDEO_RATIO);

  // First pass: apply default rules
  for (let i = 0; i < segments.length; i++) {
    decisions[i] = shouldGenerateVideo(segments[i], { segmentIndex: i });
  }

  // Count current video segments
  let videoCount = Object.values(decisions).filter(Boolean).length;

  // Second pass: promote non-video segments if below the 40% floor
  if (videoCount < targetVideoCount) {
    // Prioritize segments by type importance for promotion
    const promotionPriority = ['example', 'data', 'main', 'intro', 'conclusion', 'cta'];

    for (const targetType of promotionPriority) {
      if (videoCount >= targetVideoCount) break;

      for (let i = 0; i < segments.length; i++) {
        if (videoCount >= targetVideoCount) break;
        if (decisions[i]) continue;
        if (segments[i].segment_type === targetType) {
          decisions[i] = true;
          videoCount++;
        }
      }
    }
  }

  return decisions;
}

// ---------------------------------------------------------------------------
// Internal: Art Direction (LLM-powered prompt generation)
// ---------------------------------------------------------------------------

/**
 * Generate a detailed, cinematic art direction prompt via LLM.
 *
 * Key improvements over the original:
 * - ALWAYS describes MOVEMENT and ACTION (never static scenes)
 * - Includes camera movement instructions (pan, zoom, dolly, tracking shot)
 * - Maintains visual continuity by referencing the previous segment's ending
 * - Includes negative prompt instructions to prevent static/stock imagery
 * - Tailored instructions for historical vs. documentary content
 *
 * @param {Object} segment
 * @param {Object} topic
 * @param {Object} settings
 * @param {Object} context
 * @returns {Promise<Object>} Parsed art direction JSON
 */
async function generateArtDirection(segment, topic, settings, context = {}) {
  const visualStyle = settings.visual_style || 'cinematic, photorealistic';
  const previousVisual = context.previousVisualDescription || '';
  const segmentPosition = buildSegmentPositionLabel(context);

  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `You are an elite AI cinematographer and art director for YouTube documentary videos.
Your mission: generate prompts that produce DYNAMIC, CINEMATIC visuals -- never static images.

Return JSON:
{
  "imagePrompt": "Detailed DALL-E/Flux prompt (max 900 chars). MUST describe movement, action, and camera motion.",
  "negativePrompt": "Elements to exclude from the image",
  "motionDescription": "For video clips: precise description of the motion/movement over 5 seconds",
  "cameraMovement": "Specific camera instruction: pan left/right, dolly in/out, tracking shot, crane up/down, zoom, etc.",
  "continuityNote": "Brief note on how this visual connects to the previous scene"
}

VISUAL STYLE: ${visualStyle}

ABSOLUTE RULES:
1. EVERY prompt MUST describe people, objects, or environments IN ACTION -- moving, gesturing, reacting, transforming.
2. EVERY prompt MUST include a camera movement instruction (slow pan, dolly forward, tracking shot following subject, crane ascending, zoom into detail).
3. For HISTORICAL content: describe animated battle maps with moving arrows, troops marching, buildings being constructed stone by stone, ships sailing across seas, crowds gathering in time-lapse.
4. For DOCUMENTARY content: describe people in mid-conversation gesturing, scientists conducting experiments, workers operating machinery, crowds flowing through streets.
5. Maintain a CINEMATIC DOCUMENTARY look: dramatic lighting, shallow depth of field, film grain, color grading.
6. Use STRONG compositional techniques: rule of thirds, leading lines, dynamic diagonals, foreground framing.
7. If a previous scene description is provided, START this scene with a visual element that connects to it (same color palette, matching camera direction, or thematic link).

NEGATIVE PROMPT MUST ALWAYS INCLUDE: "static image, stock photo, text overlay, watermark, logo, UI elements, borders, frames, collage, slideshow look, flat lighting, centered boring composition, clip art, cartoon unless specified, blurry, low quality"

${previousVisual ? `PREVIOUS SCENE ended with: "${previousVisual.substring(0, 200)}"` : 'This is the OPENING scene -- make it immediately captivating with dramatic camera movement.'}`,

    userPrompt: `Topic: ${topic.title}
Segment type: ${segment.segment_type} (${segmentPosition})
Visual direction from script: ${segment.visual_direction || 'none provided'}
Narration context: ${segment.narration_text.substring(0, 400)}

Generate a cinematic, movement-rich visual prompt for this segment.`,
    maxTokens: 700,
    temperature: 0.7,
    responseFormat: 'json',
  });

  return parseJsonResponse(result.text);
}

/**
 * Build a human-readable position label for segment context.
 * @param {Object} context
 * @returns {string}
 */
function buildSegmentPositionLabel(context) {
  const index = context.segmentIndex ?? 0;
  const total = context.totalSegments ?? 1;

  if (index === 0) return 'opening segment';
  if (index === total - 1) return 'final segment';
  if (index < total * 0.2) return 'early segment';
  if (index > total * 0.8) return 'closing segment';
  return `mid segment (${index + 1} of ${total})`;
}

// ---------------------------------------------------------------------------
// Internal: Multi-Image Generation (3:1 visual ratio)
// ---------------------------------------------------------------------------

/**
 * Generate 2-3 image variants for a single segment.
 *
 * Each variant uses a different composition (wide, medium, close-up) so
 * the video assembler can create motion by transitioning between them.
 * This implements the 3:1 visual ratio that increases view duration 25-40%.
 *
 * @param {Object} artPrompt - The base art direction from LLM
 * @param {Object} topic
 * @param {Object} settings
 * @returns {Promise<Array<Object>>} Array of image assets with composition metadata
 */
async function generateMultipleImagesForSegment(artPrompt, topic, settings) {
  const provider = settings.image_provider || 'dalle';
  const apiKey = provider === 'dalle' ? settings.openai_api_key : settings.replicate_api_key;
  const basePrompt = artPrompt.imagePrompt || '';
  const baseNegative = artPrompt.negativePrompt || '';
  const cameraHint = artPrompt.cameraMovement || '';

  const variants = [];

  for (let i = 0; i < IMAGE_VARIANTS_PER_SEGMENT; i++) {
    const composition = COMPOSITION_TYPES[i];

    // Augment the base prompt with composition-specific framing
    const variantPrompt = buildVariantPrompt(basePrompt, composition, cameraHint, i);
    const variantNegative = `${baseNegative}, static image, stock photo, text overlay, watermark`;

    const result = await generateImage({
      provider,
      apiKey,
      prompt: variantPrompt,
      negativePrompt: variantNegative,
      width: 1920,
      height: 1080,
      style: settings.dalle_style || 'vivid',
    });

    variants.push({
      buffer: result.buffer,
      mimeType: result.mimeType,
      type: 'image',
      extension: 'png',
      metadata: result.metadata,
      prompt: variantPrompt,
      compositionLabel: composition.label,
    });
  }

  return variants;
}

/**
 * Augment a base image prompt with composition-specific framing instructions.
 *
 * @param {string} basePrompt
 * @param {Object} composition - One of COMPOSITION_TYPES
 * @param {string} cameraHint - Camera movement instruction from art direction
 * @param {number} variantIndex
 * @returns {string}
 */
function buildVariantPrompt(basePrompt, composition, cameraHint, variantIndex) {
  // Remove any trailing period for clean concatenation
  const cleanBase = basePrompt.replace(/\.\s*$/, '');

  // Add composition instruction
  const framingParts = [cleanBase];
  framingParts.push(composition.instruction);

  // Vary camera position per variant for visual diversity
  if (variantIndex === 0 && cameraHint) {
    framingParts.push(`Camera movement: ${cameraHint}.`);
  } else if (variantIndex === 1) {
    framingParts.push('Slightly different angle from the main shot, showing depth and dimension.');
  } else if (variantIndex === 2) {
    framingParts.push('Intimate perspective revealing texture, emotion, or fine detail.');
  }

  // Enforce the cinematic documentary look on every variant
  framingParts.push('Cinematic documentary style, dramatic lighting, shallow depth of field.');

  const fullPrompt = framingParts.join('. ');

  // DALL-E has a 4000 char limit, Flux is more permissive; keep under 900 for reliability
  return fullPrompt.substring(0, 900);
}

// ---------------------------------------------------------------------------
// Internal: Asset Creation (Image + Video)
// ---------------------------------------------------------------------------

/**
 * Create a single image asset from an art direction prompt.
 * @param {Object} artPrompt
 * @param {Object} topic
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
async function createImageAsset(artPrompt, topic, settings) {
  const provider = settings.image_provider || 'dalle';
  const result = await generateImage({
    provider,
    apiKey: provider === 'dalle' ? settings.openai_api_key : settings.replicate_api_key,
    prompt: artPrompt.imagePrompt,
    negativePrompt: artPrompt.negativePrompt || '',
    width: 1920,
    height: 1080,
    style: settings.dalle_style || 'vivid',
  });

  return {
    buffer: result.buffer,
    mimeType: result.mimeType,
    type: 'image',
    extension: 'png',
    metadata: result.metadata,
  };
}

/**
 * Create a video asset: generate base image, upload it, then generate video from it.
 * @param {Object} artPrompt
 * @param {Object} topic
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
async function createVideoAsset(artPrompt, topic, settings) {
  // Generate the base image for image-to-video conversion
  const image = await createImageAsset(artPrompt, topic, settings);

  // Upload image temporarily for video generation input
  const tempKey = buildKey(topic.project_id, 'temp', uniqueFilename('png'));
  await uploadFile(image.buffer, tempKey, 'image/png');

  const imageUrl = await getPresignedUrl(tempKey, 3600);

  // Build a rich motion prompt from art direction fields
  const motionPrompt = buildMotionPrompt(artPrompt);

  const provider = settings.video_provider || 'runway';
  const result = await generateVideo({
    provider,
    apiKey: settings[`${provider}_api_key`] || settings.video_api_key,
    prompt: motionPrompt,
    imageUrl,
    duration: 5,
    aspectRatio: '16:9',
  });

  return {
    buffer: result.buffer,
    mimeType: result.mimeType,
    type: 'video',
    extension: 'mp4',
    metadata: { ...result.metadata, sourceImage: tempKey },
  };
}

/**
 * Combine motion description and camera movement into a single video prompt.
 * @param {Object} artPrompt
 * @returns {string}
 */
function buildMotionPrompt(artPrompt) {
  const parts = [];

  if (artPrompt.motionDescription) {
    parts.push(artPrompt.motionDescription);
  }

  if (artPrompt.cameraMovement) {
    parts.push(`Camera: ${artPrompt.cameraMovement}`);
  }

  // Fall back to the image prompt if no motion-specific instructions exist
  if (parts.length === 0 && artPrompt.imagePrompt) {
    parts.push(artPrompt.imagePrompt);
  }

  return parts.join('. ').substring(0, 500);
}
