/**
 * Thumbnail Generator - Creates 3 thumbnail variants per topic.
 * Uses AI image generation + sharp for text overlay and compositing.
 *
 * YouTube Thumbnail Research-Backed Strategy:
 * - Faces with strong emotion increase CTR 20-30%
 * - Sad expressions: only 1.8% of videos use them but average 2.3M views
 * - Text: under 12 characters outperforms text-heavy designs
 * - Netflix data: thumbnails lose effectiveness with more than 3 faces
 * - Resolution: 1280x720 (YouTube recommended)
 * - Must be readable at 120x67px preview size
 * - Avoid bottom-right corner (YouTube adds timestamp/duration overlay)
 * - Max 3 visual elements total (face/scene + text + one accent element)
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { generateImage } from './adapters/image-adapter.js';
import { uploadFile, buildKey, uniqueFilename } from './s3.js';
import { getProjectSettings } from './settings-helper.js';

// YouTube recommended thumbnail resolution
const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_HEIGHT = 720;

// Maximum overlay text length for optimal CTR
const MAX_TEXT_CHARACTERS = 12;

/**
 * Generate 3 thumbnail variants for a topic, each using a different
 * proven CTR strategy.
 *
 * Variant 0: "Emotion Face" -- dramatic human expression (highest CTR)
 * Variant 1: "Dramatic Scene" -- action/tension imagery, no faces
 * Variant 2: "Mystery/Curiosity" -- curiosity gap, split composition
 *
 * @param {string} topicId
 * @returns {Promise<Array<Object>>}
 */
export async function generateThumbnails(topicId) {
  const pool = db.analytics;

  const { rows: topics } = await pool.query('SELECT * FROM yt_topics WHERE id = $1', [topicId]);
  const topic = topics[0];
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const settings = await getProjectSettings(topic.project_id);

  // Generate 3 concepts via LLM, each following a different CTR strategy
  const concepts = await generateThumbnailConcepts(topic, settings);

  const thumbnails = [];
  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];

    // Generate base image with no text baked in
    const imageResult = await generateImage({
      provider: settings.image_provider || 'dalle',
      apiKey: settings.image_provider === 'flux'
        ? settings.replicate_api_key
        : settings.openai_api_key,
      prompt: concept.imagePrompt,
      negativePrompt: concept.negativePrompt || DEFAULT_NEGATIVE_PROMPT,
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      style: 'vivid',
    });

    // Composite text overlay using sharp + SVG
    const finalBuffer = await addTextOverlay(
      imageResult.buffer,
      concept.overlayText,
      concept.textPosition,
      settings,
      concept,
    );

    // Upload to S3
    const key = buildKey(topic.project_id, 'thumbnails', uniqueFilename('png'));
    await uploadFile(finalBuffer, key, 'image/png');

    // Save to database (first variant is auto-selected)
    const { rows } = await pool.query(
      `INSERT INTO yt_thumbnails (topic_id, variant_index, s3_key, concept, is_selected)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [topicId, i, key, JSON.stringify(concept), i === 0],
    );
    thumbnails.push(rows[0]);
  }

  // Update topic stage
  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'thumbnails_created', updated_at = NOW() WHERE id = $1`,
    [topicId],
  );

  return thumbnails;
}

/**
 * Select a thumbnail variant as the primary one.
 * @param {string} topicId
 * @param {string} thumbnailId
 * @returns {Promise<Object>}
 */
export async function selectThumbnail(topicId, thumbnailId) {
  const pool = db.analytics;

  // Deselect all for this topic
  await pool.query(
    'UPDATE yt_thumbnails SET is_selected = false WHERE topic_id = $1',
    [topicId],
  );

  // Select the chosen one
  const { rows } = await pool.query(
    'UPDATE yt_thumbnails SET is_selected = true WHERE id = $1 AND topic_id = $2 RETURNING *',
    [thumbnailId, topicId],
  );

  if (rows.length === 0) throw new Error('Thumbnail not found');
  return rows[0];
}

// ---------------------------------------------------------------------------
// Internal: Constants
// ---------------------------------------------------------------------------

const DEFAULT_NEGATIVE_PROMPT = [
  'text', 'words', 'letters', 'numbers', 'watermark', 'logo',
  'UI elements', 'borders', 'frames', 'low quality', 'blurry',
  'collage', 'multiple panels', 'split screen unless specified',
  'more than 3 faces', 'cluttered composition', 'small details',
].join(', ');

// ---------------------------------------------------------------------------
// Internal: Concept Generation (LLM)
// ---------------------------------------------------------------------------

/**
 * Generate 3 thumbnail concepts using proven CTR strategies.
 *
 * Each concept follows a distinct approach:
 * 1. Emotion Face: human expression driving emotional response
 * 2. Dramatic Scene: action/tension imagery without faces
 * 3. Mystery/Curiosity: curiosity gap with split or comparison composition
 *
 * @param {Object} topic
 * @param {Object} settings
 * @returns {Promise<Array<Object>>}
 */
async function generateThumbnailConcepts(topic, settings) {
  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `You are a world-class YouTube thumbnail designer. You know that thumbnails are the #1 factor in CTR (click-through rate).

Create EXACTLY 3 thumbnail concepts. Each MUST follow its specific strategy below.

Return a JSON array of 3 objects:
[
  {
    "strategy": "emotion_face",
    "imagePrompt": "DALL-E prompt for the base image (1280x720, NO text/words/letters in the image)",
    "negativePrompt": "what to exclude from the image",
    "overlayText": "1-4 words of text overlay (MAXIMUM 12 characters total)",
    "textPosition": "top-left|top-center|center-left|center",
    "textColor": "#FFFFFF or other high-contrast color",
    "accentColor": "one bold accent color for visual pop",
    "colorScheme": "dominant colors description for text contrast"
  },
  { ... },
  { ... }
]

=== CONCEPT 1: EMOTION FACE ===
- A single dramatic human face showing INTENSE emotion (shock, awe, fear, curiosity, sadness, amazement)
- The face MUST occupy at least 40% of the frame
- Extreme close-up or medium close-up framing
- Strong emotion in the eyes -- wide eyes, raised eyebrows, open mouth, or intense stare
- High contrast, saturated colors, dramatic side lighting
- Background should be simple/blurred to keep focus on the face
- Text: 2-4 words MAX (under 12 characters total)
- Research: sad/shocked expressions get 2.3M average views despite being used in only 1.8% of videos

=== CONCEPT 2: DRAMATIC SCENE ===
- For history/documentary: a dramatic historical scene showing ACTION and TENSION
- For other topics: the most visually striking representation of the subject
- NO human faces -- rely entirely on dramatic imagery, architecture, landscapes, objects
- Bold, short text overlay: 1-3 words
- Strong visual depth: foreground, midground, background layers
- Dramatic lighting: golden hour, storm lighting, fire glow, or stark contrast
- Wide or medium-wide composition
- Colors: bold, saturated, cinematic color grading

=== CONCEPT 3: MYSTERY/CURIOSITY ===
- Creates a CURIOSITY GAP -- the viewer NEEDS to click to understand
- Use one of these compositions:
  a) SPLIT: left/right comparison (before/after, then/now, vs)
  b) REVEAL: partially hidden subject with dramatic lighting
  c) IMPOSSIBLE: surreal or unexpected juxtaposition
- Contrasting colors on each side if split (e.g., red vs blue, light vs dark)
- Text that creates intrigue WITHOUT revealing the answer (e.g., "WHY?", "HIDDEN", "THE TRUTH")
- Can use arrows, circles, or visual markers to direct attention

=== UNIVERSAL RULES (ALL 3 CONCEPTS) ===
- NEVER put text in the image prompt itself -- text is added as overlay separately
- The image must be READABLE and IMPACTFUL at 120x67 pixels (YouTube search preview size)
- Avoid fine details that disappear at small sizes
- NEVER place important elements in the bottom-right corner (YouTube adds duration overlay there)
- Maximum 3 visual elements total: main subject + text + one accent element
- Use vivid, saturated colors -- thumbnails compete against millions of others
- Strong contrast between light and dark areas
- Each concept MUST be visually DISTINCT from the others`,

    userPrompt: `Video title: ${topic.title}
Topic angle: ${topic.angle || 'general documentary'}
Target audience: ${topic.target_audience || 'general YouTube audience'}

Create 3 thumbnail concepts following the strategies above. Remember: overlay text must be under 12 characters.`,
    maxTokens: 2000,
    temperature: 0.9,
    responseFormat: 'json',
  });

  const parsed = parseJsonResponse(result.text);
  const concepts = Array.isArray(parsed) ? parsed : (parsed.concepts || []);

  // Validate and sanitize each concept
  return concepts.slice(0, 3).map(sanitizeConcept);
}

/**
 * Sanitize and validate a thumbnail concept from LLM output.
 * Enforces the 12-character text limit and provides safe defaults.
 *
 * @param {Object} concept
 * @returns {Object}
 */
function sanitizeConcept(concept) {
  let overlayText = String(concept.overlayText || '').trim();

  // Enforce the 12-character maximum for optimal CTR
  if (overlayText.length > MAX_TEXT_CHARACTERS) {
    // Try to truncate at a word boundary
    const words = overlayText.split(/\s+/);
    overlayText = '';
    for (const word of words) {
      const candidate = overlayText ? `${overlayText} ${word}` : word;
      if (candidate.length > MAX_TEXT_CHARACTERS) break;
      overlayText = candidate;
    }
    // If even the first word is too long, hard truncate
    if (!overlayText) {
      overlayText = String(concept.overlayText).substring(0, MAX_TEXT_CHARACTERS);
    }
  }

  // Prevent text placement in the bottom-right danger zone
  const safePosition = sanitizeTextPosition(concept.textPosition);

  return {
    strategy: concept.strategy || 'unknown',
    imagePrompt: String(concept.imagePrompt || '').substring(0, 1000),
    negativePrompt: String(concept.negativePrompt || DEFAULT_NEGATIVE_PROMPT),
    overlayText,
    textPosition: safePosition,
    textColor: concept.textColor || '#FFFFFF',
    accentColor: concept.accentColor || '#FF0000',
    colorScheme: concept.colorScheme || 'high contrast',
  };
}

/**
 * Ensure text position avoids the bottom-right corner where YouTube
 * places the video duration timestamp overlay.
 *
 * @param {string} position
 * @returns {string}
 */
function sanitizeTextPosition(position) {
  const forbidden = ['bottom-right'];
  const validPositions = [
    'top-left', 'top-center', 'top-right',
    'center-left', 'center', 'center-right',
    'bottom-left',
  ];

  if (forbidden.includes(position)) return 'bottom-left';
  if (validPositions.includes(position)) return position;
  return 'center-left';
}

// ---------------------------------------------------------------------------
// Internal: Text Overlay Compositing (sharp + SVG)
// ---------------------------------------------------------------------------

/**
 * Add text overlay to a thumbnail image using sharp SVG compositing.
 *
 * Improvements:
 * - Uses settings.thumbnail_text_color and thumbnail_stroke_color
 * - Stroke width from settings.thumbnail_stroke_width
 * - Font from settings.thumbnail_font
 * - Avoids bottom-right corner (YouTube timestamp area)
 * - Multi-line support for longer text
 * - Readability tested at preview sizes via high contrast + thick stroke
 *
 * @param {Buffer} imageBuffer
 * @param {string} text
 * @param {string} position
 * @param {Object} settings
 * @param {Object} concept - Full concept object for color customization
 * @returns {Promise<Buffer>}
 */
async function addTextOverlay(imageBuffer, text, position, settings, concept = {}) {
  const sharp = (await import('sharp')).default;

  if (!text) return imageBuffer;

  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || THUMBNAIL_WIDTH;
  const height = metadata.height || THUMBNAIL_HEIGHT;

  // Typography settings from project config or concept
  const fontFamily = settings.thumbnail_font || 'Arial Black, Impact, sans-serif';
  const fontSize = settings.thumbnail_font_size || Math.floor(width * 0.07);
  const textColor = concept.textColor || settings.thumbnail_text_color || '#FFFFFF';
  const strokeColor = settings.thumbnail_stroke_color || '#000000';
  const strokeWidth = settings.thumbnail_stroke_width || 3;
  const padding = Math.floor(width * 0.04);

  // Calculate text position (avoiding bottom-right)
  const safePosition = sanitizeTextPosition(position);
  const { x, y, anchor } = getTextPosition(safePosition, width, height, padding, fontSize);

  // Handle multi-line text for slightly longer overlay text
  const lines = splitTextIntoLines(text.toUpperCase(), 2);
  const lineHeight = Math.floor(fontSize * 1.2);

  // Build SVG with each line
  const textElements = lines.map((line, i) => {
    const lineY = y + (i * lineHeight);
    return `<text x="${x}" y="${lineY}" text-anchor="${anchor}"
      font-family="${escapeXml(fontFamily)}" font-size="${fontSize}"
      font-weight="900" fill="${textColor}" filter="url(#shadow)"
      stroke="${strokeColor}" stroke-width="${strokeWidth}"
      paint-order="stroke fill">${escapeXml(line)}</text>`;
  }).join('\n      ');

  const svgText = `
    <svg width="${width}" height="${height}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="4" dy="4" stdDeviation="5" flood-color="rgba(0,0,0,0.9)"/>
        </filter>
      </defs>
      ${textElements}
    </svg>`;

  return image
    .composite([{ input: Buffer.from(svgText), top: 0, left: 0 }])
    .png()
    .toBuffer();
}

/**
 * Calculate text position coordinates, ensuring we avoid the YouTube
 * timestamp overlay area (bottom-right ~200x40px zone).
 *
 * @param {string} position
 * @param {number} width
 * @param {number} height
 * @param {number} padding
 * @param {number} fontSize
 * @returns {{ x: number, y: number, anchor: string }}
 */
function getTextPosition(position, width, height, padding, fontSize) {
  // Vertical offset so text baseline sits inside the safe area
  const baselineOffset = Math.floor(fontSize * 0.8);

  // Bottom safe zone: stay above the YouTube duration overlay (bottom 60px)
  const bottomSafe = height - padding - 60;

  const positions = {
    'top-left':     { x: padding,         y: padding + baselineOffset,     anchor: 'start' },
    'top-center':   { x: width / 2,       y: padding + baselineOffset,     anchor: 'middle' },
    'top-right':    { x: width - padding,  y: padding + baselineOffset,     anchor: 'end' },
    'center-left':  { x: padding,         y: height / 2,                   anchor: 'start' },
    'center':       { x: width / 2,       y: height / 2,                   anchor: 'middle' },
    'center-right': { x: width - padding,  y: height / 2,                   anchor: 'end' },
    'bottom-left':  { x: padding,         y: bottomSafe,                   anchor: 'start' },
  };

  return positions[position] || positions['center-left'];
}

/**
 * Split text into N lines, breaking at word boundaries.
 * Used when overlay text has 2+ words to improve readability.
 *
 * @param {string} text
 * @param {number} maxLines
 * @returns {Array<string>}
 */
function splitTextIntoLines(text, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length <= 1 || maxLines <= 1) return [text];

  // For 2 lines, split roughly in the middle
  const midpoint = Math.ceil(words.length / 2);
  return [
    words.slice(0, midpoint).join(' '),
    words.slice(midpoint).join(' '),
  ].filter(Boolean);
}

/**
 * Escape special XML characters for safe SVG embedding.
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
