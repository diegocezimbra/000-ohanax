/**
 * Source Processor - Extracts content from URL, PDF, text, or YouTube transcripts.
 * Handles the first stage of the pipeline.
 */
import { db } from '../../db.js';
import { generateText } from './adapters/llm-adapter.js';
import { getProjectSettings } from './settings-helper.js';

/**
 * Process a content source and extract its text content.
 * @param {string} sourceId
 * @returns {Promise<{ content: string, wordCount: number }>}
 */
export async function processSource(sourceId) {
  const pool = db.analytics;

  const { rows } = await pool.query(
    'SELECT * FROM yt_content_sources WHERE id = $1',
    [sourceId],
  );
  const source = rows[0];
  if (!source) throw new Error(`Source ${sourceId} not found`);

  let extractedContent;

  switch (source.source_type) {
    case 'url':
      extractedContent = await extractFromUrl(source.url);
      break;
    case 'youtube':
      extractedContent = await extractFromYouTube(source.url);
      break;
    case 'text':
      extractedContent = source.raw_content;
      break;
    case 'pdf':
      extractedContent = await extractFromPdf(source.raw_content);
      break;
    default:
      throw new Error(`Unknown source type: ${source.source_type}`);
  }

  const wordCount = extractedContent.split(/\s+/).length;

  // Summarize if content is too long (>10k words)
  let processedContent = extractedContent;
  if (wordCount > 10000) {
    const settings = await getProjectSettings(source.project_id);
    processedContent = await summarizeContent(extractedContent, settings);
  }

  await pool.query(
    `UPDATE yt_content_sources
     SET processed_content = $1, word_count = $2, status = 'processed', updated_at = NOW()
     WHERE id = $3`,
    [processedContent, wordCount, sourceId],
  );

  return { content: processedContent, wordCount };
}

// --- Extractors ---

async function extractFromUrl(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.statusText}`);
  }

  const html = await response.text();
  return stripHtml(html);
}

async function extractFromYouTube(url) {
  // Extract video ID from various YouTube URL formats
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error(`Invalid YouTube URL: ${url}`);

  // Attempt to get transcript via YouTube's timedtext API
  const response = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)' } },
  );
  const html = await response.text();

  // Extract captions track URL from page data
  const captionMatch = html.match(/"captionTracks":\[(.+?)\]/);
  if (!captionMatch) {
    throw new Error('No captions available for this video');
  }

  const tracks = JSON.parse(`[${captionMatch[1]}]`);
  const englishTrack = tracks.find(t => t.languageCode === 'en') || tracks[0];
  if (!englishTrack?.baseUrl) {
    throw new Error('No usable caption track found');
  }

  const captionResponse = await fetch(englishTrack.baseUrl);
  const captionXml = await captionResponse.text();

  // Parse XML captions to plain text
  const textSegments = captionXml.match(/<text[^>]*>([^<]*)<\/text>/g) || [];
  const transcript = textSegments
    .map(seg => seg.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!transcript) throw new Error('Empty transcript extracted');
  return transcript;
}

async function extractFromPdf(base64Content) {
  // Dynamic import of pdf-parse (only needed for PDFs)
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = Buffer.from(base64Content, 'base64');
  const result = await pdfParse(buffer);
  return result.text;
}

function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function stripHtml(html) {
  // Remove script, style, nav, header, footer tags entirely
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');

  // Convert block elements to newlines
  text = text.replace(/<\/?(p|div|h[1-6]|br|li|tr)[^>]*>/gi, '\n');
  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode entities
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Clean whitespace
  text = text.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
  return text;
}

async function summarizeContent(content, settings) {
  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: 'You are an expert content analyst. Summarize the following content while preserving all key facts, data points, quotes, and unique insights. The summary should be comprehensive enough to create video content from.',
    userPrompt: `Summarize this content (preserve all facts and data):\n\n${content.substring(0, 80000)}`,
    maxTokens: 4000,
    temperature: 0.3,
  });
  return result.text;
}
