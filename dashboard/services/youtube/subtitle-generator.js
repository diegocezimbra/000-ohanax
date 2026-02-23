/**
 * Subtitle Generator - Creates SRT files from Whisper word-level alignment data.
 *
 * Groups words into subtitle cues of ~8-12 words each, respecting sentence
 * boundaries (periods, question marks, exclamation marks) when possible.
 * Output: standard SRT format for YouTube closed captions.
 */
import { db } from '../../db.js';
import { uploadFile, buildKey, uniqueFilename } from './s3.js';

const MAX_WORDS_PER_CUE = 10;
const MAX_CHARS_PER_CUE = 80;

/**
 * Generate SRT subtitles for a topic and upload to S3.
 * @param {string} topicId
 * @returns {Promise<{ srtContent: string, s3Key: string }>}
 */
export async function generateSubtitles(topicId) {
  const pool = db.analytics;

  const { rows } = await pool.query(
    'SELECT * FROM yt_narrations WHERE topic_id = $1',
    [topicId],
  );
  if (rows.length === 0) throw new Error('No narration found');

  const narration = rows[0];
  const alignment = typeof narration.alignment_data === 'string'
    ? JSON.parse(narration.alignment_data)
    : narration.alignment_data;

  if (!alignment?.words?.length) {
    throw new Error('No alignment data (word timestamps) available. Re-generate narration first.');
  }

  const words = alignment.words;
  const cues = groupWordsIntoCues(words);
  const srtContent = formatSrt(cues);

  // Get project_id for S3 key
  const { rows: topics } = await pool.query(
    'SELECT project_id FROM yt_topics WHERE id = $1',
    [topicId],
  );
  const projectId = topics[0]?.project_id;
  if (!projectId) throw new Error(`Topic ${topicId} not found`);

  const s3Key = buildKey(projectId, 'subtitles', uniqueFilename('srt'));
  const buffer = Buffer.from(srtContent, 'utf-8');
  await uploadFile(buffer, s3Key, 'text/plain; charset=utf-8');

  // Store SRT key in narration row
  await pool.query(
    `UPDATE yt_narrations SET srt_s3_key = $1, updated_at = NOW() WHERE topic_id = $2`,
    [s3Key, topicId],
  );

  console.log(`[SubtitleGen] Generated ${cues.length} subtitle cues for topic ${topicId}`);
  return { srtContent, s3Key, cueCount: cues.length };
}

/**
 * Group words into subtitle cues respecting sentence boundaries.
 * Each cue: { startTime, endTime, text }
 */
function groupWordsIntoCues(words) {
  const cues = [];
  let currentWords = [];
  let currentChars = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentWords.push(word);
    currentChars += word.word.length + 1; // +1 for space

    const isLast = i === words.length - 1;
    const isSentenceEnd = /[.!?]$/.test(word.word);
    const nextIsSentenceStart = !isLast && /^[A-Z]/.test(words[i + 1]?.word || '');
    const reachedWordLimit = currentWords.length >= MAX_WORDS_PER_CUE;
    const reachedCharLimit = currentChars >= MAX_CHARS_PER_CUE;

    // Break cue at sentence boundaries or word/char limits
    if (isLast || (isSentenceEnd && currentWords.length >= 3) || reachedWordLimit || reachedCharLimit) {
      cues.push({
        startTime: currentWords[0].start,
        endTime: word.end,
        text: currentWords.map(w => w.word).join(' '),
      });
      currentWords = [];
      currentChars = 0;
    }
  }

  return cues;
}

/**
 * Format cues into SRT string.
 * SRT format:
 * 1
 * 00:00:01,000 --> 00:00:04,500
 * Text of the subtitle
 */
function formatSrt(cues) {
  return cues.map((cue, index) => {
    const start = formatSrtTimestamp(cue.startTime);
    const end = formatSrtTimestamp(cue.endTime);
    return `${index + 1}\n${start} --> ${end}\n${cue.text}\n`;
  }).join('\n');
}

/**
 * Convert seconds to SRT timestamp format: HH:MM:SS,mmm
 */
function formatSrtTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}
