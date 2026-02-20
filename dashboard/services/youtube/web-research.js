/**
 * Web Research Service - AI-guided web research to enrich content.
 * Generates search queries via LLM, runs searches, filters by relevance.
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { webSearch } from './adapters/search-adapter.js';
import { getProjectSettings } from './settings-helper.js';

/**
 * Conduct web research for a topic or source.
 * @param {Object} opts
 * @param {string} opts.projectId
 * @param {string} opts.topicId - optional
 * @param {string} opts.sourceId - optional
 * @param {string} opts.context - Content context to research
 * @returns {Promise<Array<{ title: string, url: string, snippet: string, relevance: number }>>}
 */
export async function conductResearch({ projectId, topicId, sourceId, context }) {
  const settings = await getProjectSettings(projectId);
  const pool = db.analytics;

  // Step 1: Generate search queries via LLM
  const queries = await generateSearchQueries(context, settings);

  // Step 2: Execute searches in parallel
  const allResults = [];
  const searchPromises = queries.map(query =>
    webSearch({
      provider: settings.search_provider || 'serper',
      apiKey: settings.search_api_key,
      query,
      maxResults: 5,
    }).catch(err => {
      console.error(`Search failed for "${query}":`, err.message);
      return [];
    }),
  );

  const searchResults = await Promise.all(searchPromises);
  for (const results of searchResults) {
    allResults.push(...results);
  }

  // Step 3: Deduplicate by URL
  const seen = new Set();
  const uniqueResults = allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  // Step 4: Score relevance via LLM
  const scoredResults = await scoreRelevance(uniqueResults, context, settings);

  // Step 5: Save results to database
  const savedResults = [];
  for (const result of scoredResults) {
    const { rows } = await pool.query(
      `INSERT INTO yt_research_results (project_id, topic_id, source_id, query, title, url, snippet, relevance_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [projectId, topicId, sourceId, result.query, result.title, result.url, result.snippet, result.relevance],
    );
    savedResults.push(rows[0]);
  }

  return savedResults;
}

/**
 * Get research results for a topic.
 */
export async function getResearchForTopic(topicId) {
  const { rows } = await db.analytics.query(
    'SELECT * FROM yt_research_results WHERE topic_id = $1 ORDER BY relevance_score DESC',
    [topicId],
  );
  return rows;
}

/**
 * Get research results for a source.
 */
export async function getResearchForSource(sourceId) {
  const { rows } = await db.analytics.query(
    'SELECT * FROM yt_research_results WHERE source_id = $1 ORDER BY relevance_score DESC',
    [sourceId],
  );
  return rows;
}

// --- Internal helpers ---

async function generateSearchQueries(context, settings) {
  const result = await generateText({
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `You generate diverse web search queries to research a topic for YouTube video creation.
Return a JSON array of 3-5 search queries. Each should explore a different angle:
- Recent data and statistics
- Expert opinions or studies
- Counterarguments or different perspectives
- Real-world examples or case studies`,
    userPrompt: `Generate search queries to research this topic:\n\n${context.substring(0, 3000)}`,
    maxTokens: 500,
    temperature: 0.7,
    responseFormat: 'json',
  });

  const parsed = parseJsonResponse(result.text);
  if (Array.isArray(parsed)) return parsed.slice(0, 5);
  if (parsed.queries) return parsed.queries.slice(0, 5);
  return [context.substring(0, 100)];
}

async function scoreRelevance(results, context, settings) {
  if (results.length === 0) return [];

  const resultList = results
    .map((r, i) => `[${i}] ${r.title}: ${r.snippet}`)
    .join('\n');

  const result = await generateText({
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `Score the relevance of search results for creating a YouTube video.
Return a JSON array of objects with "index" (number) and "relevance" (0.0-1.0).
Only include results with relevance >= 0.3.`,
    userPrompt: `Topic context:\n${context.substring(0, 2000)}\n\nSearch results:\n${resultList}`,
    maxTokens: 1000,
    temperature: 0.2,
    responseFormat: 'json',
  });

  const scores = parseJsonResponse(result.text);
  const scoreArray = Array.isArray(scores) ? scores : (scores.results || []);

  return scoreArray
    .filter(s => s.relevance >= 0.3)
    .map(s => ({
      ...results[s.index],
      relevance: s.relevance,
    }))
    .sort((a, b) => b.relevance - a.relevance);
}
