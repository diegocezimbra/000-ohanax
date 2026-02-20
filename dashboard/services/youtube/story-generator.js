/**
 * Story Generator - Creates cinematic narratives from topics.
 *
 * Architecture: Chapter-based generation for uniform quality.
 * 1. generateOutline() → JSON with ~30-50 chapters
 * 2. generateChaptersSequentially() → each chapter individually with context
 * 3. Concatenate → full story with [VISUAL] + [IMG_PROMPT] markers
 *
 * Each chapter receives 4 layers of context:
 * - Full outline (compact titles list)
 * - Current chapter details (emotion, function, target words)
 * - Last N words of previous chapter (direct continuity)
 * - Running summary (distant context, updated every SUMMARY_INTERVAL chapters)
 *
 * Prompts centralized in prompts.js
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { getProjectSettings } from './settings-helper.js';
import {
  buildOutlinePrompt,
  buildChapterPrompt,
  buildRunningSummaryPrompt,
  buildStoryExpansionPrompt,
} from './prompts.js';

// --- Constants ---
const CHAPTER_RETRY_LIMIT = 3;
const CHAPTER_RETRY_DELAY_MS = 2000;
const SUMMARY_INTERVAL = 5;
const PREVIOUS_CONTEXT_WORDS = 800;

/**
 * Generate a story narrative for a topic using chapter-based approach.
 * Public interface unchanged — returns the same story row as before.
 * @param {string} topicId
 * @returns {Promise<Object>} Created story row
 */
export async function generateStory(topicId) {
  const pool = db.analytics;

  // Get topic with project info
  const { rows: topics } = await pool.query(
    'SELECT * FROM yt_topics WHERE id = $1',
    [topicId],
  );
  const topic = topics[0];
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const settings = await getProjectSettings(topic.project_id);

  // Gather context: source content + research
  const sourceContent = await getSourceContent(topic.source_id);
  const research = await getResearchContent(topicId, topic.source_id);

  // Step 1: Generate detailed outline
  console.log(`[StoryGen] Generating outline for topic: ${topic.title}`);
  const outline = await generateOutline(topic, sourceContent, research, settings);
  console.log(`[StoryGen] Outline generated: ${outline.chapters.length} chapters, ~${outline.estimatedTotalWords} words target`);

  // Step 2: Generate each chapter sequentially
  const { fullStory } = await generateChaptersSequentially(outline, topic, settings);
  const wordCount = fullStory.split(/\s+/).length;

  // Step 3: Check minimum length (fallback, should be rare with chapter approach)
  const targetMinutes = settings.target_duration_minutes || 30;
  const minWords = Math.round(targetMinutes * 280 * 0.80);
  let finalStory = fullStory;
  if (wordCount < minWords) {
    console.log(`[StoryGen] Story too short (${wordCount}/${minWords}), expanding...`);
    finalStory = await expandStory(fullStory, topic, settings);
  }

  const finalWordCount = finalStory.split(/\s+/).length;

  // Step 4: Upsert story with outline
  const { rows } = await pool.query(
    `INSERT INTO yt_stories (topic_id, content, word_count, outline, version)
     VALUES ($1, $2, $3, $4, 1)
     ON CONFLICT (topic_id) DO UPDATE
     SET content = $2, word_count = $3, outline = $4, version = yt_stories.version + 1, updated_at = NOW()
     RETURNING *`,
    [topicId, finalStory, finalWordCount, JSON.stringify(outline)],
  );

  // Update topic stage
  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'story_created', updated_at = NOW() WHERE id = $1`,
    [topicId],
  );

  console.log(`[StoryGen] Story complete: ${finalWordCount} words, ${outline.chapters.length} chapters`);
  return rows[0];
}

/**
 * Edit a story manually (preserves version history).
 */
export async function updateStory(topicId, content) {
  const pool = db.analytics;
  const wordCount = content.split(/\s+/).length;

  const { rows } = await pool.query(
    `UPDATE yt_stories
     SET content = $1, word_count = $2, version = version + 1, updated_at = NOW()
     WHERE topic_id = $3
     RETURNING *`,
    [content, wordCount, topicId],
  );

  if (rows.length === 0) throw new Error(`Story for topic ${topicId} not found`);
  return rows[0];
}

// --- Internal: Outline Generation ---

async function generateOutline(topic, sourceContent, research, settings) {
  const { system, user } = buildOutlinePrompt(topic, sourceContent, research, settings);

  const result = await generateText({
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 8000,
    temperature: 0.8,
    responseFormat: 'json',
  });

  const outline = parseJsonResponse(result.text);

  // Validate minimum chapters
  if (!outline.chapters || outline.chapters.length < 10) {
    throw new Error(`Outline too short: ${outline.chapters?.length || 0} chapters (minimum 10)`);
  }

  return outline;
}

// --- Internal: Chapter-by-Chapter Generation ---

async function generateChaptersSequentially(outline, topic, settings) {
  const chapters = outline.chapters;
  const chapterTexts = [];
  let runningSummary = '';
  let fullStory = '';

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const previousText = i > 0 ? getLastNWords(chapterTexts[i - 1], PREVIOUS_CONTEXT_WORDS) : '';

    // Generate single chapter with retry
    const chapterText = await generateSingleChapter(
      chapter, outline.chapters, previousText, runningSummary, topic, settings,
    );

    chapterTexts.push(chapterText);
    fullStory += (i > 0 ? '\n\n' : '') + chapterText;

    const chapterWordCount = chapterText.split(/\s+/).length;
    console.log(`[StoryGen] Chapter ${i + 1}/${chapters.length} complete (${chapterWordCount} words): "${chapter.title}"`);

    // Update running summary every SUMMARY_INTERVAL chapters
    if ((i + 1) % SUMMARY_INTERVAL === 0 && i < chapters.length - 1) {
      runningSummary = await generateRunningSummary(fullStory, topic, settings);
    }
  }

  return { fullStory, chapterTexts };
}

async function generateSingleChapter(chapter, outlineChapters, previousText, runningSummary, topic, settings) {
  const { system, user } = buildChapterPrompt(
    chapter, outlineChapters, previousText, runningSummary, topic, settings,
  );

  const maxTokens = Math.max(Math.round(chapter.targetWordCount * 2.5), 800);

  for (let attempt = 1; attempt <= CHAPTER_RETRY_LIMIT; attempt++) {
    try {
      const result = await generateText({
        apiKey: settings.llm_api_key,
        model: settings.llm_model,
        systemPrompt: system,
        userPrompt: user,
        maxTokens,
        temperature: 0.85,
      });

      return result.text;
    } catch (err) {
      if (attempt === CHAPTER_RETRY_LIMIT) throw err;
      const delay = CHAPTER_RETRY_DELAY_MS * attempt;
      console.warn(`[StoryGen] Chapter ${chapter.chapterNumber} attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

async function generateRunningSummary(storySoFar, topic, settings) {
  try {
    const { system, user } = buildRunningSummaryPrompt(storySoFar, topic, settings);

    const result = await generateText({
      apiKey: settings.llm_api_key,
      model: settings.llm_model,
      systemPrompt: system,
      userPrompt: user,
      maxTokens: 300,
      temperature: 0.3,
    });

    console.log(`[StoryGen] Running summary updated (${result.text.split(/\s+/).length} words)`);
    return result.text;
  } catch (err) {
    console.warn(`[StoryGen] Running summary failed (non-critical): ${err.message}`);
    return '';
  }
}

// --- Internal: Data helpers (unchanged) ---

async function getSourceContent(sourceId) {
  if (!sourceId) return '';
  const { rows } = await db.analytics.query(
    'SELECT processed_content, raw_content FROM yt_content_sources WHERE id = $1',
    [sourceId],
  );
  return rows[0]?.processed_content || rows[0]?.raw_content || '';
}

async function getResearchContent(topicId, sourceId) {
  const { rows } = await db.analytics.query(
    `SELECT title, snippet, url FROM yt_research_results
     WHERE (topic_id = $1 OR source_id = $2) AND relevance_score >= 0.5
     ORDER BY relevance_score DESC LIMIT 15`,
    [topicId, sourceId],
  );
  return rows;
}

// --- Internal: Fallback expansion (kept for edge cases) ---

async function expandStory(story, topic, settings) {
  const { system, user } = buildStoryExpansionPrompt(story, topic, settings);

  const result = await generateText({
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 12000,
    temperature: 0.85,
  });

  return result.text;
}

// --- Helpers ---

function getLastNWords(text, n) {
  const words = text.split(/\s+/);
  if (words.length <= n) return text;
  return words.slice(-n).join(' ');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
