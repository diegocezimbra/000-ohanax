/**
 * Script Generator - Converts stories into segmented screenplays.
 * Generates YouTube metadata (title, description, tags, chapters).
 * Includes auto-enrichment loop if script is too thin.
 */
import { db } from '../../db.js';
import { generateText, parseJsonResponse } from './adapters/llm-adapter.js';
import { getProjectSettings } from './settings-helper.js';

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

  // Step 5: Auto-enrichment check (target: 30+ minutes = 1800 seconds)
  if (scriptData.segments.length < 20 || scriptData.totalDuration < 1800) {
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
  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `You are an elite YouTube screenplay writer who specializes in MAXIMUM RETENTION scripts. Your scripts consistently achieve 70%+ retention at 30 seconds and 50%+ average view duration. You understand YouTube's algorithm deeply: watch time, session time, and click-through rate are everything.

Your job: convert a narrative into a segmented video script optimized for the YouTube algorithm.

Return ONLY valid JSON in this exact structure:
{
  "segments": [
    {
      "type": "hook|intro|main|example|data|transition|climax|conclusion|cta",
      "narrationText": "Exact words the narrator will say",
      "visualDirection": "Precise visual and camera direction",
      "durationSeconds": number,
      "notes": "Optional production notes"
    }
  ],
  "chapters": [
    { "title": "Keyword-rich chapter name", "startSegment": 0 }
  ],
  "totalDuration": estimated total seconds
}

=== SEGMENT STRUCTURE RULES ===

1. HOOK SEGMENT (first segment, 15-25 seconds, type: "hook")
   - Use COLD OPEN technique: start at the most dramatic, surprising, or emotionally charged moment of the entire story. Do NOT start with "Neste video..." or "Ola, pessoal..."
   - The narrator MUST say the main topic keyword/phrase aloud within the first two sentences. YouTube's AI transcription analyzes spoken content for search ranking.
   - End the hook with a KNOWLEDGE GAP: tease a shocking revelation, counterintuitive fact, or unanswered question that forces the viewer to keep watching. Examples: "E o que aconteceu depois mudou tudo...", "Mas existe um detalhe que ninguem te conta..."
   - Visual direction: HIGH ENERGY. Describe rapid scene changes (3-4 different visuals in 15 seconds), dramatic close-ups, bold text overlays with the key phrase, cinematic movement.
   - Target: 80%+ retention at the 30-second mark. If a viewer would not feel compelled to stay, rewrite it.

2. INTRO SEGMENT (25-50 seconds, type: "intro")
   - Brief context setup AFTER the hook has already grabbed attention.
   - Include an explicit value promise: "Se voce ficar ate o final, vai descobrir [specific valuable thing that viewer cannot easily find elsewhere]."
   - Insert a PATTERN INTERRUPT here: describe an unexpected sound effect, a dramatic visual shift, a sudden change in narrator tone, or a surprising on-screen text animation. This prevents the 30-second drop-off.
   - Visual direction: Transition from hook energy to a slightly calmer but still engaging visual pace. Show the narrator/host or relevant B-roll that establishes credibility.

3. MAIN CONTENT SEGMENTS (bulk of the video, type: "main", "example", "data", or "transition")
   - Create 25-40 main segments, each 30-60 seconds of narration (100-180 words each).
   - CRITICAL RULE: Every segment MUST begin with a MINI-HOOK. Never start a segment with "E entao...", "Alem disso...", "O proximo ponto...". Instead, open each segment with a provocative question, a surprising statement, a bold claim, or a micro-cliffhanger from the previous segment.
   - Every 3rd main segment MUST include a PATTERN INTERRUPT: a surprising fact, a perspective shift, a rhetorical question directed at the viewer ("Voce consegue adivinhar o que aconteceu?"), a brief story-within-a-story, or a dramatic tonal shift.
   - Include EMOTIONAL PEAKS every 2-3 minutes: moments of surprise, outrage, humor, awe, or fear. Flat emotional energy kills retention.
   - Use BRIDGING PHRASES between segments that manufacture curiosity: "Mas isso nao foi nada comparado ao que veio depois...", "E aqui e onde a historia fica realmente interessante...", "Mas espera, porque tem um detalhe que muda tudo..."
   - Vary segment lengths deliberately: alternate between 25-second punchy segments and 50-second deep-dive segments. Rhythmic variation maintains engagement.
   - TRANSITIONS (type: "transition"): Use these sparingly (2-3 per script) to bridge major topic shifts. Keep under 15 seconds. They should create anticipation, not summarize.

4. CLIMAX SEGMENT (type: "climax", 40-60 seconds)
   - This is the MOST dramatic, surprising, or emotionally intense moment of the entire video.
   - Deliver the biggest revelation, the most shocking data point, the most unexpected twist.
   - Visual direction: Describe the most intense, cinematic visuals of the entire script. Slow-motion effects, dramatic zoom-ins, impactful text overlays, possibly an AI-generated video clip suggestion.
   - The narration should build tension before the reveal, then deliver it with maximum impact.

5. CONCLUSION SEGMENT (type: "conclusion", 30-45 seconds)
   - CIRCULAR STORYTELLING: Tie back explicitly to the opening hook. Reference the exact scenario, question, or image from the first segment. "Lembra do que eu falei no comeco? Agora voce entende por que..."
   - Deliver fully on the value promise made in the intro segment. The viewer must feel they got what was promised.
   - Leave the viewer with a thought-provoking final insight that they will want to share or discuss.

6. CTA SEGMENT (last segment, 15-20 seconds, type: "cta")
   - Do NOT just say "Se inscreva e deixe o like." That is lazy and ineffective.
   - TEASE THE NEXT VIDEO to drive session time: "No proximo video, vou revelar [specific intriguing topic]... e eu garanto que voce nao vai acreditar no que descobri." This can elevate session time by 10-30%.
   - Prompt SPECIFIC comment engagement with a concrete question: "Me conta nos comentarios: [specific question related to the video content]?"
   - Mention watching another video (end screen compatible): "E se voce quer entender [related topic], assiste esse video aqui que eu preparei especialmente."
   - Visual direction: Describe end screen layout with video thumbnail placeholder, subscribe button animation, and comment prompt text overlay.

=== VISUAL DIRECTION RULES (ALL SEGMENTS) ===

- NEVER describe static images. ALWAYS describe MOTION, TRANSFORMATION, and ACTION. Wrong: "Image of a city." Right: "Aerial drone shot sweeping over the city skyline at golden hour, camera slowly descending toward the main avenue as cars stream below."
- Use a 3:1 VISUAL-TO-NARRATION ratio: for every narration point, describe at least 3 distinct visual moments or scene changes.
- Include CAMERA MOVEMENT instructions in every segment: "zoom in slowly on...", "pan across from left to right...", "dolly forward through...", "cut to close-up of...", "transition with a whip-pan to..."
- Describe PEOPLE DOING THINGS whenever possible, not abstract concepts. Wrong: "The concept of inflation." Right: "A mother at the supermarket picking up a product, looking at the price tag, and putting it back on the shelf with a frustrated expression."
- Specify visual TRANSITIONS between segments: match cuts, whip pans, fade-to-black, zoom transitions, morph effects.
- Include on-screen TEXT suggestions for key statistics, quotes, or emphasis words (bold, animated, with sound effect).

=== CHAPTER RULES ===

- Generate exactly 4-8 chapters. No more, no less.
- Chapter titles MUST contain searchable keywords related to the topic. Never use generic names like "Introducao" or "Conclusao."
- The FIRST chapter should be the hook topic itself, not "Intro" or "Abertura."
- Each chapter title should be compelling enough that a viewer scanning chapters would click to that section. Think of them as mini-headlines.
- Chapters improve YouTube search visibility significantly, so front-load the most important keyword in each chapter title.

=== PACING AND RHYTHM ===

- Target total video duration: 30-45 minutes (long-form content optimized for maximum watch time and ad revenue).
- First 60 seconds are make-or-break. If 40%+ of viewers leave in the first 30 seconds, the video is dead. Write the hook and intro as if your life depends on it.
- Plan a PATTERN INTERRUPT at the 25-35 second mark (the critical drop-off point): music change, visual shift, sound effect, or tonal change.
- Build toward the climax with escalating intensity. The second half of the video should feel more urgent and dramatic than the first half.
- Never let more than 90 seconds pass without some form of engagement trigger (question, surprising fact, tonal shift, visual spectacle).
- For 30+ minute videos, structure with 2-3 major act breaks with mini-cliffhangers to prevent mid-video drop-offs.

=== LANGUAGE ===

- Write ALL narration text in Brazilian Portuguese (pt-BR).
- Use conversational, engaging language. Speak TO the viewer, not AT them.
- Avoid academic or overly formal tone. Be the smart friend explaining something fascinating.
- Use short, punchy sentences mixed with occasional longer ones for rhythm.`,
    userPrompt: `Topic: ${topic.title}
Angle/Hook: ${topic.angle || 'Not specified'}
Target keyword (MUST be spoken aloud in first segment): ${topic.title}

Story to convert into a retention-optimized screenplay:
${storyContent.substring(0, 20000)}`,
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

  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `You are a YouTube SEO and metadata specialist. You understand that title and description are the two biggest levers for Click-Through Rate (CTR) and search discovery. Your metadata consistently achieves 8%+ CTR.

Generate YouTube metadata optimized for CTR, search ranking, and session time. Return ONLY valid JSON:
{
  "title": "YouTube video title",
  "description": "Full YouTube description",
  "tags": ["tag1", "tag2", ...]
}

=== TITLE RULES ===

- Maximum 60 characters total. Hard limit. YouTube truncates at ~60 chars on mobile.
- FRONT-LOAD the primary keyword in the first 40 characters. YouTube weights the beginning of the title more heavily for search.
- Use exactly ONE emotional power word: "Chocante", "Revelado", "Segredo", "Verdade", "Incrivel", "Perigoso", "Urgente", "Proibido", "Escondido", "Impressionante".
- Include a curiosity gap or tension: the viewer must feel they NEED to click to resolve the question. Use structures like: "[Keyword]: O Segredo Que Ninguem Te Conta", "[Keyword] - A Verdade Chocante Revelada", "Por Que [Keyword] Vai Mudar Tudo em [Year]"
- Do NOT use ALL CAPS for the entire title. Capitalize only the power word or key phrase for emphasis.
- Do NOT use clickbait that the video cannot deliver on. The title must be fulfilled by the content.
- No emojis in the title.

=== DESCRIPTION RULES ===

- First 150 characters are CRITICAL: they appear in search results and must contain the primary keyword and a compelling hook. YouTube's algorithm heavily weights the first sentence.
- Structure the description in this exact order:
  1. HOOK LINE (first sentence): Contains the main keyword + a compelling reason to watch. This appears as the preview snippet in search.
  2. BLANK LINE
  3. CHAPTER TIMESTAMPS: Use the exact timestamps provided in the user prompt. Format: "00:00 Chapter Title". These timestamps MUST be included exactly as given.
  4. BLANK LINE
  5. CONTENT SUMMARY: 2-3 sentences summarizing what the viewer will learn. Include secondary keywords naturally.
  6. BLANK LINE
  7. 3 HASHTAGS: #PrimaryKeyword #SecondaryKeyword #BroadCategory (e.g., #Tecnologia, #Financas, #Saude). These appear above the title on YouTube and aid discovery.
  8. BLANK LINE
  9. AI DISCLOSURE LINE: "Este video foi criado com auxilio de ferramentas de IA."

- Total description length: 800-1500 characters.
- Include the main keyword 2-3 times naturally throughout the description (not stuffed).
- Do NOT include generic boilerplate like "Nao esqueca de se inscrever." The description is for SEO, not CTAs.

=== TAGS RULES ===

- First tag MUST be the EXACT primary keyword (the topic title as-is).
- Tags 2-5: Long-tail variations of the primary keyword (e.g., if keyword is "energia solar", add "energia solar residencial", "como funciona energia solar", "energia solar vale a pena").
- Tags 6-10: Related broader topics and synonyms.
- Tags 11-15: Trending or complementary keywords in the same niche.
- 10-15 tags total. No more than 15. YouTube may penalize tag stuffing.
- All tags in lowercase Brazilian Portuguese.
- Do NOT include irrelevant or overly generic tags like "video", "youtube", "2024".

=== LANGUAGE ===

- All metadata in Brazilian Portuguese (pt-BR).
- Title and description must feel natural, not keyword-stuffed.`,
    userPrompt: `Primary keyword (MUST appear first in tags and front-loaded in title): ${topic.title}
Angle: ${topic.angle || 'General'}
Chapter timestamps for description:
${chapterTimestamps}
Opening narration (for context): ${narrationPreview}
Total video duration: ${Math.round(scriptData.totalDuration / 60)} minutes`,
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

  const result = await generateText({
    provider: settings.llm_provider || 'anthropic',
    apiKey: settings.llm_api_key,
    model: settings.llm_model,
    systemPrompt: `You are a YouTube script enrichment specialist. Your job is to upgrade weak script segments to maximize viewer retention.

For each segment provided, return an upgraded version with:
1. RICHER NARRATION (120-180 words): Add emotional hooks, rhetorical questions, vivid storytelling details, and curiosity-building phrases. Every segment must start with a mini-hook that re-engages the viewer.
2. DETAILED VISUAL DIRECTION: Describe dynamic, moving visuals with camera directions. Never use static descriptions. Include at least 3 distinct visual moments per segment. Specify transitions, camera movements (zoom, pan, dolly), and on-screen text overlays for key points.
3. ENGAGEMENT TRIGGERS: Each enriched segment should contain at least one of: a surprising fact, a direct question to the viewer, an emotional moment, or a pattern interrupt.

Return a JSON array:
[
  {
    "segmentIndex": number,
    "narrationText": "Enriched narration in pt-BR",
    "visualDirection": "Detailed dynamic visual direction"
  }
]

Write all narration in Brazilian Portuguese (pt-BR). Conversational, engaging tone.`,
    userPrompt: `Topic: ${topic.title}\n\nWeak segments to enrich:\n${JSON.stringify(weakSegments.map(s => ({
      segmentIndex: s.segment_index,
      type: s.segment_type,
      narration: s.narration_text,
      visual: s.visual_direction,
    })))}`,
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
