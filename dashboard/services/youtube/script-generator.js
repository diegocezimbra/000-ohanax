/**
 * Script Generator - Converts stories into segmented screenplays.
 * Generates YouTube metadata (title, description, tags, chapters).
 * Includes auto-enrichment loop if script is too thin.
 * Uses ALL project settings via centralized prompts.js
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { getProjectSettings } from './settings-helper.js';
import { buildScriptPrompt, buildMetadataPrompt, buildScriptEnrichmentPrompt } from './prompts.js';

/**
 * Generate a segmented script from a story.
 * @param {string} topicId
 * @returns {Promise<Object>} Created script with segments
 */
export async function generateScript(topicId) {
  const pool = db.analytics;

  const { rows: topics } = await pool.query('SELECT * FROM yt_topics WHERE id = $1', [topicId]);
  const topic = topics[0];
  if (!topic) throw new Error(`Topic ${topicId} not found`);

  const { rows: stories } = await pool.query('SELECT * FROM yt_stories WHERE topic_id = $1', [topicId]);
  const story = stories[0];
  if (!story) throw new Error(`Story for topic ${topicId} not found`);

  const settings = await getProjectSettings(topic.project_id);

  // Step 1: Generate script structure + segments
  const scriptData = await callLlmForScript(story.content, topic, settings);

  // Step 2: Generate YouTube metadata
  const metadata = await generateYouTubeMetadata(topic, scriptData, settings);

  // Step 3: Save script
  const { rows: scripts } = await pool.query(
    `INSERT INTO yt_scripts (topic_id, youtube_title, youtube_description, youtube_tags,
      chapters, total_duration_estimate, version)
     VALUES ($1, $2, $3, $4, $5, $6, 1)
     ON CONFLICT (topic_id) DO UPDATE
     SET youtube_title = $2, youtube_description = $3, youtube_tags = $4,
         chapters = $5, total_duration_estimate = $6,
         version = yt_scripts.version + 1, updated_at = NOW()
     RETURNING *`,
    [
      topicId, metadata.title, metadata.description,
      JSON.stringify(metadata.tags), JSON.stringify(scriptData.chapters),
      scriptData.totalDuration,
    ],
  );
  const script = scripts[0];

  // Step 4: Save segments
  await pool.query('DELETE FROM yt_script_segments WHERE script_id = $1', [script.id]);

  for (let i = 0; i < scriptData.segments.length; i++) {
    const seg = scriptData.segments[i];
    await pool.query(
      `INSERT INTO yt_script_segments (script_id, segment_index, segment_type, narration_text,
        visual_direction, duration_seconds, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        script.id, i, seg.type, seg.narrationText,
        seg.visualDirection, seg.durationSeconds, seg.notes || null,
      ],
    );
  }

  // Step 5: Auto-enrichment check based on target duration
  const targetSeconds = (settings.target_duration_minutes || 30) * 60;
  if (scriptData.segments.length < 20 || scriptData.totalDuration < targetSeconds) {
    await enrichScript(script.id, topic, settings);
  }

  // Update topic stage
  await pool.query(
    `UPDATE yt_topics SET pipeline_stage = 'script_created', updated_at = NOW() WHERE id = $1`,
    [topicId],
  );

  return { ...script, segments: scriptData.segments };
}

/**
 * Get full script with segments.
 */
export async function getScriptWithSegments(topicId) {
  const pool = db.analytics;
  const { rows: scripts } = await pool.query('SELECT * FROM yt_scripts WHERE topic_id = $1', [topicId]);
  if (scripts.length === 0) return null;

  const { rows: segments } = await pool.query(
    'SELECT * FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index',
    [scripts[0].id],
  );

  return { ...scripts[0], segments };
}

// --- Internal ---

async function callLlmForScript(storyContent, topic, settings) {
  const { system, user } = buildScriptPrompt(storyContent, topic, settings);

  const result = await generateText({
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 8000,
    temperature: 0.7,
    responseFormat: 'json',
  });

  const parsed = parseJsonResponse(result.text);

  // Validate segments
  const segments = (parsed.segments || []).map(seg => ({
    type: seg.type || 'main',
    narrationText: String(seg.narrationText || ''),
    visualDirection: String(seg.visualDirection || ''),
    durationSeconds: Math.min(90, Math.max(10, Number(seg.durationSeconds) || 45)),
    notes: seg.notes || null,
  }));

  return {
    segments,
    chapters: parsed.chapters || [],
    totalDuration: segments.reduce((sum, s) => sum + s.durationSeconds, 0),
  };
}

async function generateYouTubeMetadata(topic, scriptData, settings) {
  const narrationPreview = scriptData.segments
    .slice(0, 5)
    .map(s => s.narrationText)
    .join(' ')
    .substring(0, 2000);

  const chapterTimestamps = buildChapterTimestamps(scriptData);

  const { system, user } = buildMetadataPrompt(topic, scriptData, chapterTimestamps, narrationPreview, settings);

  const result = await generateText({
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 2000,
    temperature: 0.6,
    responseFormat: 'json',
  });

  const parsed = parseJsonResponse(result.text);
  return {
    title: String(parsed.title || topic.title).substring(0, 100),
    description: String(parsed.description || '').substring(0, 5000),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map(String).slice(0, 30) : [],
  };
}

/**
 * Build chapter timestamps string from script data for use in metadata prompt.
 */
function buildChapterTimestamps(scriptData) {
  if (!scriptData.chapters || scriptData.chapters.length === 0) {
    return '00:00 Inicio';
  }

  let runningSeconds = 0;
  const lines = [];

  for (const chapter of scriptData.chapters) {
    const segIndex = chapter.startSegment || 0;
    let seconds = 0;
    for (let i = 0; i < segIndex && i < scriptData.segments.length; i++) {
      seconds += scriptData.segments[i].durationSeconds;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timestamp = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    lines.push(`${timestamp} ${chapter.title}`);
  }

  return lines.join('\n');
}

async function enrichScript(scriptId, topic, settings) {
  const pool = db.analytics;

  const { rows: segments } = await pool.query(
    'SELECT * FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index',
    [scriptId],
  );

  // Find segments that are too short or lack visual direction
  const weakSegments = segments.filter(
    s => s.narration_text.split(/\s+/).length < 60 || !s.visual_direction,
  );

  if (weakSegments.length === 0) return;

  const weakSegmentData = weakSegments.map(s => ({
    segmentIndex: s.segment_index,
    type: s.segment_type,
    narration: s.narration_text,
    visual: s.visual_direction,
  }));

  const { system, user } = buildScriptEnrichmentPrompt(topic, weakSegmentData, settings);

  const result = await generateText({
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: system,
    userPrompt: user,
    maxTokens: 4000,
    temperature: 0.7,
    responseFormat: 'json',
  });

  const enriched = parseJsonResponse(result.text);
  const items = Array.isArray(enriched) ? enriched : (enriched.segments || []);

  for (const item of items) {
    if (item.segmentIndex != null && item.narrationText) {
      await pool.query(
        `UPDATE yt_script_segments
         SET narration_text = $1, visual_direction = $2, updated_at = NOW()
         WHERE script_id = $3 AND segment_index = $4`,
        [item.narrationText, item.visualDirection || '', scriptId, item.segmentIndex],
      );
    }
  }
}
