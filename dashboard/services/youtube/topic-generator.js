/**
 * Topic Generator - Generates video topics from processed sources using LLM.
 *
 * Features:
 * - Series-first approach (YouTube 2025 algorithm prioritizes series/playlists)
 * - Strategic angle framework with 5 proven content angles
 * - Evergreen content priority with SEO keyword generation
 * - All output in Portuguese (pt-BR)
 * - Optimized titles: front-loaded keywords, max 60 chars, emotional power words
 * - hookIdea, searchKeywords, seriesName, seriesOrder in output
 * - Uses ALL project settings via centralized prompts.js
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { getProjectSettings } from './settings-helper.js';
import { buildTopicPrompt } from './prompts.js';

// --- Strategic Angle Framework ---

const CONTENT_ANGLES = [
  {
    id: 'hidden_truth',
    label: 'O que realmente aconteceu',
    description: 'Revelacao de verdade oculta. Perspectiva contraintuitiva que desafia a narrativa popular.',
  },
  {
    id: 'person_story',
    label: 'A pessoa que mudou tudo',
    description: 'Historia centrada em uma pessoa fascinante. Narrativa emocional com arco dramatico claro.',
  },
  {
    id: 'curiosity_gap',
    label: 'X coisas que ninguem te conta sobre...',
    description: 'Lista de fatos surpreendentes. Curiosidade que forca o clique e a retencao.',
  },
  {
    id: 'superlative',
    label: 'A maior/pior/mais [evento] da historia',
    description: 'Superlativo dramatico. Escala e magnitude que impressionam o espectador.',
  },
  {
    id: 'consequence',
    label: 'Como [evento] mudou o mundo para sempre',
    description: 'Impacto e consequencia. Mostra como um evento alterou o curso da historia.',
  },
];

/**
 * Generate topics from a processed source.
 * @param {string} projectId
 * @param {string} sourceId
 * @returns {Promise<Array<Object>>} Created topic rows
 */
export async function generateTopicsFromSource(projectId, sourceId) {
  const pool = db.analytics;
  const settings = await getProjectSettings(projectId);

  const source = await fetchSource(pool, sourceId, projectId);
  const content = source.processed_content || source.raw_content;
  if (!content) throw new Error('Source has no content to generate topics from');

  const researchContext = await fetchResearchContext(pool, sourceId);
  const topics = await callLlmForTopics(content, researchContext, settings);

  return saveTopics(pool, projectId, sourceId, topics);
}

/**
 * Regenerate topics for a source (delete old drafts, create new).
 */
export async function regenerateTopics(projectId, sourceId) {
  const pool = db.analytics;

  await pool.query(
    `DELETE FROM yt_topics
     WHERE project_id = $1 AND source_id = $2
     AND status = 'draft' AND pipeline_stage = 'topics_generated'`,
    [projectId, sourceId],
  );

  return generateTopicsFromSource(projectId, sourceId);
}

// --- Data Fetching ---

async function fetchSource(pool, sourceId, projectId) {
  const { rows } = await pool.query(
    'SELECT * FROM yt_content_sources WHERE id = $1 AND project_id = $2',
    [sourceId, projectId],
  );
  if (rows.length === 0) throw new Error(`Source ${sourceId} not found`);
  return rows[0];
}

async function fetchResearchContext(pool, sourceId) {
  const { rows } = await pool.query(
    'SELECT title, snippet FROM yt_research_results WHERE source_id = $1 ORDER BY relevance_score DESC LIMIT 10',
    [sourceId],
  );

  if (rows.length === 0) return '';

  return `\n\nPesquisa complementar:\n${rows.map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`;
}

// --- LLM Topic Generation ---

async function callLlmForTopics(content, researchContext, settings) {
  const targetLength = settings.target_video_length || '30-45 minutos';
  const { system, user } = buildTopicPrompt(content, researchContext, settings, CONTENT_ANGLES);

  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 6000,
    temperature: 0.8,
    responseFormat: 'json',
  });

  const parsed = parseJsonResponse(result.text);
  const rawTopics = extractTopicsArray(parsed);

  return sanitizeTopics(rawTopics, targetLength);
}

// --- Topic Parsing & Sanitization ---

function extractTopicsArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed.topics && Array.isArray(parsed.topics)) return parsed.topics;
  if (parsed.series && Array.isArray(parsed.series)) {
    // Some LLMs nest topics inside series objects
    const allTopics = [];
    for (const series of parsed.series) {
      if (series.topics && Array.isArray(series.topics)) {
        for (const topic of series.topics) {
          allTopics.push({ ...topic, seriesName: topic.seriesName || series.name });
        }
      }
    }
    if (allTopics.length > 0) return allTopics;
  }
  return [];
}

function sanitizeTopics(rawTopics, targetLength) {
  return rawTopics
    .filter(t => t.title && t.keyPoints)
    .map(t => ({
      title: sanitizeTitle(String(t.title)),
      angle: String(t.angle || 'hidden_truth').substring(0, 100),
      angleDescription: String(t.angleDescription || t.angle || '').substring(0, 500),
      targetAudience: String(t.targetAudience || 'Publico geral').substring(0, 200),
      estimatedDuration: String(t.estimatedDuration || targetLength),
      richnessScore: clampScore(t.richnessScore),
      keyPoints: sanitizeKeyPoints(t.keyPoints),
      seriesName: String(t.seriesName || '').substring(0, 200),
      seriesOrder: Number(t.seriesOrder) || 0,
      searchKeywords: sanitizeSearchKeywords(t.searchKeywords),
      hookIdea: String(t.hookIdea || '').substring(0, 300),
    }));
}

function sanitizeTitle(title) {
  // Enforce max 60 characters; truncate at last full word
  let cleaned = title.substring(0, 60);
  if (title.length > 60) {
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > 30) {
      cleaned = cleaned.substring(0, lastSpace);
    }
  }
  return cleaned.trim();
}

function clampScore(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 5;
  return Math.min(10, Math.max(1, num));
}

function sanitizeKeyPoints(keyPoints) {
  if (!Array.isArray(keyPoints)) return [];
  return keyPoints
    .map(String)
    .filter(Boolean)
    .slice(0, 8);
}

function sanitizeSearchKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  return keywords
    .map(k => String(k).toLowerCase().trim())
    .filter(k => k.length > 0)
    .slice(0, 5);
}

// --- Database Persistence ---

async function saveTopics(pool, projectId, sourceId, topics) {
  const savedTopics = [];

  for (const topic of topics) {
    const { rows } = await pool.query(
      `INSERT INTO yt_topics (
        project_id, source_id, title, angle, target_audience,
        estimated_duration, richness_score, key_points,
        series_name, series_order, search_keywords, hook_idea,
        pipeline_stage, status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'topics_generated', 'draft')
       RETURNING *`,
      [
        projectId,
        sourceId,
        topic.title,
        topic.angle,
        topic.targetAudience,
        topic.estimatedDuration,
        topic.richnessScore,
        JSON.stringify(topic.keyPoints),
        topic.seriesName || null,
        topic.seriesOrder || 0,
        JSON.stringify(topic.searchKeywords),
        topic.hookIdea || null,
      ],
    );
    savedTopics.push(rows[0]);
  }

  return savedTopics;
}
