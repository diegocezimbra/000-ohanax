/**
 * Job Handlers - Maps each pipeline job type to its service function.
 * Imported by job-worker.js on startup to register all handlers.
 */
import { registerHandler } from './job-worker.js';
import { processSource } from './source-processor.js';
import { conductResearch } from './web-research.js';
import { generateTopicsFromSource } from './topic-generator.js';
import { generateStory } from './story-generator.js';
import { generateScript, getScriptWithSegments } from './script-generator.js';
import { generateVisualForSegment, generateAllVisuals } from './visual-generator.js';
import { generateThumbnails } from './thumbnail-generator.js';
import { generateNarration } from './narration-generator.js';
import { assembleVideo } from './video-assembler.js';
import { publishToYouTube } from './publisher.js';
import { db } from '../../db.js';

/**
 * Register all pipeline job handlers.
 * Call once on startup.
 */
export function registerAllHandlers() {
  registerHandler('extract_source', handleExtractSource);
  registerHandler('web_research_source', handleWebResearch);
  registerHandler('generate_topics', handleGenerateTopics);
  registerHandler('generate_story', handleGenerateStory);
  registerHandler('generate_script', handleGenerateScript);
  registerHandler('expand_script', handleExpandScript);
  registerHandler('generate_visual_prompts', handleGenerateVisualPrompts);
  registerHandler('generate_visual_asset', handleGenerateVisualAsset);
  registerHandler('generate_thumbnails', handleGenerateThumbnails);
  registerHandler('generate_narration', handleGenerateNarration);
  registerHandler('assemble_video', handleAssembleVideo);
  registerHandler('publish_video', handlePublishVideo);

  console.log('[YouTube Handlers] 12 job handlers registered');
}

// --- Handler implementations ---

async function handleExtractSource(job) {
  const { sourceId } = job.payload;
  const result = await processSource(sourceId);
  return { content_length: result.wordCount };
}

async function handleWebResearch(job) {
  const { sourceId } = job.payload;
  const pool = db.analytics;

  // Get source content for context
  const { rows } = await pool.query(
    'SELECT processed_content, raw_content FROM yt_content_sources WHERE id = $1',
    [sourceId],
  );
  const content = rows[0]?.processed_content || rows[0]?.raw_content || '';

  const results = await conductResearch({
    projectId: job.project_id,
    sourceId,
    context: content.substring(0, 5000),
  });

  return { research_count: results.length };
}

async function handleGenerateTopics(job) {
  const { sourceId } = job.payload;
  const topics = await generateTopicsFromSource(job.project_id, sourceId);
  return {
    qualifying_topic_ids: topics.map(t => t.id),
    topic_count: topics.length,
  };
}

async function handleGenerateStory(job) {
  const { topicId } = job.payload;
  const story = await generateStory(topicId);
  return { storyId: story.id, wordCount: story.word_count };
}

async function handleGenerateScript(job) {
  const { topicId } = job.payload;
  const script = await generateScript(topicId);

  // Check if script needs expansion (fewer than 20 segments or < 30 min)
  const needsExpansion = script.segments && (
    script.segments.length < 20 || script.total_duration_estimate < 1800
  );

  return {
    scriptId: script.id,
    segmentCount: script.segments?.length || 0,
    needs_expansion: needsExpansion,
  };
}

async function handleExpandScript(job) {
  const { topicId } = job.payload;
  // Re-generate script with expansion flag
  const script = await generateScript(topicId);
  return { scriptId: script.id, segmentCount: script.segments?.length || 0 };
}

async function handleGenerateVisualPrompts(job) {
  const { topicId } = job.payload;
  const pool = db.analytics;

  // Get all segments for this topic
  const { rows: scripts } = await pool.query(
    'SELECT id FROM yt_scripts WHERE topic_id = $1',
    [topicId],
  );
  if (scripts.length === 0) throw new Error('No script found');

  const { rows: segments } = await pool.query(
    'SELECT id FROM yt_script_segments WHERE script_id = $1 ORDER BY segment_index',
    [scripts[0].id],
  );

  // Return segment IDs for fan-out (orchestrator creates individual asset jobs)
  return {
    asset_ids: segments.map(s => s.id),
    forwardPayload: { topicId },
  };
}

async function handleGenerateVisualAsset(job) {
  const { topicId, assetId } = job.payload;
  const asset = await generateVisualForSegment(topicId, assetId);
  return { assetId: asset.id, assetType: asset.asset_type };
}

async function handleGenerateThumbnails(job) {
  const { topicId } = job.payload;
  const thumbnails = await generateThumbnails(topicId);
  return { thumbnailCount: thumbnails.length };
}

async function handleGenerateNarration(job) {
  const { topicId } = job.payload;
  const narration = await generateNarration(topicId);
  return { narrationId: narration.id, duration: narration.duration_seconds };
}

async function handleAssembleVideo(job) {
  const { topicId } = job.payload;
  const video = await assembleVideo(topicId);
  return { videoId: video.id, sizeMb: video.file_size_mb };
}

async function handlePublishVideo(job) {
  const { publicationId } = job.payload;
  const pub = await publishToYouTube(publicationId);
  return { youtubeVideoId: pub.youtube_video_id, youtubeUrl: pub.youtube_url };
}
