import { db } from '../../db.js';

/**
 * Enqueue a new job into the pipeline queue.
 */
export async function enqueueJob({
  projectId, topicId = null, sourceId = null,
  jobType, payload = {}, priority = 0,
  dependsOn = null, maxAttempts = 3, runAfter = null
}) {
  const result = await db.analytics.query(`
    INSERT INTO yt_jobs (
      project_id, topic_id, source_id, job_type,
      payload, priority, depends_on, max_attempts, run_after
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, NOW()))
    RETURNING *
  `, [projectId, topicId, sourceId, jobType,
      JSON.stringify(payload), priority, dependsOn, maxAttempts, runAfter]);
  return result.rows[0];
}

/**
 * Claim the next available job using FOR UPDATE SKIP LOCKED.
 * Returns null if no job available.
 */
export async function claimNextJob(workerId) {
  const result = await db.analytics.query(`
    UPDATE yt_jobs
    SET status = 'processing',
        locked_by = $1,
        locked_at = NOW(),
        attempt = attempt + 1,
        started_at = COALESCE(started_at, NOW()),
        updated_at = NOW()
    WHERE id = (
      SELECT j.id
      FROM yt_jobs j
      LEFT JOIN yt_projects p ON p.id = j.project_id
      WHERE j.status = 'pending'
        AND j.run_after <= NOW()
        AND (p.pipeline_paused = false OR p.pipeline_paused IS NULL)
        AND (p.status = 'active' OR p.status IS NULL)
        AND (
          j.depends_on IS NULL
          OR EXISTS (
            SELECT 1 FROM yt_jobs dep
            WHERE dep.id = j.depends_on AND dep.status = 'completed'
          )
        )
      -- Prioritize jobs from topics that are furthest in the pipeline (closest to done).
      -- This ensures one topic completes fully before resources go to the next.
      ORDER BY j.priority DESC,
               CASE j.job_type
                 WHEN 'assemble_video' THEN 1
                 WHEN 'generate_narration' THEN 2
                 WHEN 'generate_thumbnails' THEN 3
                 WHEN 'generate_visual_asset' THEN 4
                 WHEN 'generate_visual_prompts' THEN 5
                 WHEN 'generate_script' THEN 6
                 WHEN 'expand_script' THEN 6
                 WHEN 'generate_story' THEN 7
                 WHEN 'generate_topics' THEN 8
                 WHEN 'web_research_source' THEN 9
                 WHEN 'extract_source' THEN 10
                 ELSE 11
               END ASC,
               j.created_at ASC
      LIMIT 1
      FOR UPDATE OF j SKIP LOCKED
    )
    RETURNING *
  `, [workerId]);
  return result.rows[0] || null;
}

/**
 * Mark a job as completed with result data.
 */
export async function completeJob(jobId, result = {}) {
  const res = await db.analytics.query(`
    UPDATE yt_jobs
    SET status = 'completed',
        result = $2,
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [jobId, JSON.stringify(result)]);
  return res.rows[0];
}

// Errors that should never be retried (billing, account, config, upload, auth issues)
const FATAL_ERROR_PATTERNS = [
  'insufficient credit',
  'billing',
  'payment required',
  'account suspended',
  'quota exceeded',
  'authorization header is malformed',
  'Access Key (AKID) must be provided',
  'missing credentials',
  // S3 upload failures — image was already paid for, retrying wastes money
  's3 upload failed',
  'accessdenied',
  'nosuchbucket',
  'invalidsecurity',
  'signaturedoesnotmatch',
  'invalidaccesskeyid',
  // TTS / Fish Audio failures — invalid key or no balance
  'invalid api key',
  'insufficient balance',
  'invalid_api_key',
  'unauthorized',
  'api key is invalid',
];

function isFatalError(message) {
  const lower = (message || '').toLowerCase();
  return FATAL_ERROR_PATTERNS.some(pattern => lower.includes(pattern));
}

/**
 * Mark a job as failed. Auto-retries with exponential backoff if attempts remain.
 * Billing/credit errors skip retry and fail immediately.
 */
export async function failJob(jobId, error) {
  const job = await db.analytics.query(
    'SELECT attempt, max_attempts, topic_id FROM yt_jobs WHERE id = $1',
    [jobId]
  );
  if (!job.rows[0]) return null;

  const { attempt, max_attempts, topic_id } = job.rows[0];
  const errorMsg = error?.message || String(error);
  const errorStack = error?.stack || '';

  // Billing/credit errors: skip retry, fail immediately
  // Throttle/rate-limit: always retry with longer backoff
  const isThrottle = errorMsg.toLowerCase().includes('throttled') || errorMsg.toLowerCase().includes('rate limit');
  const canRetry = (attempt < max_attempts && !isFatalError(errorMsg)) || isThrottle;

  if (canRetry) {
    // Throttle errors get longer backoff (60s base) to let rate limit reset
    const backoffSeconds = isThrottle ? 60 * attempt : 30 * Math.pow(2, attempt - 1);
    await db.analytics.query(`
      UPDATE yt_jobs
      SET status = 'pending',
          locked_by = NULL, locked_at = NULL,
          run_after = NOW() + INTERVAL '1 second' * $2,
          error_message = $3, error_stack = $4,
          updated_at = NOW()
      WHERE id = $1
    `, [jobId, backoffSeconds, errorMsg, errorStack]);
    return { retrying: true, nextAttemptIn: backoffSeconds };
  }

  await db.analytics.query(`
    UPDATE yt_jobs
    SET status = 'failed',
        error_message = $2, error_stack = $3,
        completed_at = NOW(), updated_at = NOW()
    WHERE id = $1
  `, [jobId, errorMsg, errorStack]);

  if (topic_id) {
    // Store a user-friendly error message for billing errors
    let displayError = errorMsg;
    if (errorMsg.toLowerCase().includes('insufficient credit') || errorMsg.toLowerCase().includes('billing')) {
      displayError = `BILLING: Crédito insuficiente no Replicate. Recarregue em https://replicate.com/account/billing e reprocesse este tópico.`;
    } else if (errorMsg.toLowerCase().includes('akid') || errorMsg.toLowerCase().includes('authorization header') || errorMsg.toLowerCase().includes('missing credentials')) {
      displayError = `CONFIG: Credenciais AWS S3 não configuradas. Configure YT_S3_ACCESS_KEY e YT_S3_SECRET_KEY no App Runner.`;
    } else if (errorMsg.toLowerCase().includes('s3 upload failed') || errorMsg.toLowerCase().includes('accessdenied') || errorMsg.toLowerCase().includes('nosuchbucket')) {
      displayError = `UPLOAD: Falha ao salvar imagem no S3. Verifique permissões do bucket e credenciais AWS. A imagem gerada (já paga) foi perdida.`;
    } else if (errorMsg.toLowerCase().includes('invalid api key') || errorMsg.toLowerCase().includes('fish audio')) {
      displayError = `TTS: API key do Fish Audio inválida ou sem saldo. Verifique FISH_AUDIO_API_KEY nas configurações do projeto.`;
    }
    await db.analytics.query(`
      UPDATE yt_topics
      SET pipeline_stage = 'error', pipeline_error = $2, updated_at = NOW()
      WHERE id = $1
    `, [topic_id, displayError]);
  }

  return { retrying: false };
}

/**
 * Cancel a specific job.
 */
export async function cancelJob(jobId) {
  const result = await db.analytics.query(`
    UPDATE yt_jobs
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = $1 AND status IN ('pending', 'processing')
    RETURNING id
  `, [jobId]);
  return result.rowCount > 0;
}

/**
 * Cancel all pending/processing jobs for a topic.
 */
export async function cancelJobsForTopic(topicId) {
  const result = await db.analytics.query(`
    UPDATE yt_jobs
    SET status = 'cancelled', updated_at = NOW()
    WHERE topic_id = $1 AND status IN ('pending', 'processing')
  `, [topicId]);
  return result.rowCount;
}

/**
 * Cancel all pending/processing jobs for a project.
 */
export async function cancelJobsForProject(projectId) {
  const result = await db.analytics.query(`
    UPDATE yt_jobs
    SET status = 'cancelled', updated_at = NOW()
    WHERE project_id = $1 AND status IN ('pending', 'processing')
  `, [projectId]);
  return result.rowCount;
}

/**
 * Reset jobs stuck in processing for too long (worker crash recovery).
 */
export async function resetStaleJobs(staleMinutes = 10) {
  const result = await db.analytics.query(`
    UPDATE yt_jobs
    SET status = 'pending', locked_by = NULL, locked_at = NULL, updated_at = NOW()
    WHERE status = 'processing'
      AND locked_at < NOW() - INTERVAL '1 minute' * $1
    RETURNING id, job_type, topic_id
  `, [staleMinutes]);
  return result.rows;
}

/**
 * Get aggregated queue stats, optionally filtered by project.
 */
export async function getQueueStats(projectId = null) {
  const where = projectId ? 'WHERE project_id = $1' : '';
  const params = projectId ? [projectId] : [];
  const result = await db.analytics.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '24 hours') as completed_24h,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
    FROM yt_jobs ${where}
  `, params);
  return result.rows[0];
}

/**
 * Get stats grouped by job type.
 */
export async function getQueueStatsByType(projectId = null) {
  const where = projectId ? 'WHERE project_id = $1' : '';
  const params = projectId ? [projectId] : [];
  const result = await db.analytics.query(`
    SELECT job_type,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'processing') as processing,
      COUNT(*) FILTER (WHERE status = 'failed') as failed
    FROM yt_jobs ${where}
    GROUP BY job_type
    ORDER BY job_type
  `, params);
  return result.rows;
}

/**
 * Append a log entry for a job.
 */
export async function logJob(jobId, level, message, metadata = null) {
  await db.analytics.query(`
    INSERT INTO yt_job_logs (job_id, level, message, metadata)
    VALUES ($1, $2, $3, $4)
  `, [jobId, level, message, metadata ? JSON.stringify(metadata) : null]);
}

/**
 * Get logs for a job.
 */
export async function getJobLogs(jobId, limit = 100) {
  const result = await db.analytics.query(`
    SELECT * FROM yt_job_logs
    WHERE job_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [jobId, limit]);
  return result.rows;
}

/**
 * Get a single job by ID.
 */
export async function getJob(jobId) {
  const result = await db.analytics.query(
    'SELECT * FROM yt_jobs WHERE id = $1', [jobId]
  );
  return result.rows[0] || null;
}

/**
 * List jobs with filters and pagination.
 */
export async function listJobs({ projectId, status, jobType, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (projectId) { conditions.push(`project_id = $${idx++}`); params.push(projectId); }
  if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
  if (jobType) { conditions.push(`job_type = $${idx++}`); params.push(jobType); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(limit, offset);

  const result = await db.analytics.query(`
    SELECT * FROM yt_jobs ${where}
    ORDER BY created_at DESC
    LIMIT $${idx++} OFFSET $${idx}
  `, params);
  return result.rows;
}
