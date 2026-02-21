import { claimNextJob, completeJob, failJob, logJob, resetStaleJobs, cancelJobsForTopic } from './job-queue.js';
import { onJobCompleted } from './pipeline-orchestrator.js';
import os from 'os';

const JOB_HANDLERS = {};
let running = false;

// Billing/credit/upload/auth errors that should cancel all sibling jobs immediately
const BILLING_ERROR_PATTERNS = [
  'insufficient credit', 'billing', 'payment required',
  'account suspended', 'quota exceeded',
  'authorization header is malformed', 'Access Key (AKID) must be provided',
  'missing credentials',
  // S3 upload failures — every retry generates another paid image that gets lost
  's3 upload failed', 'accessdenied', 'nosuchbucket',
  'invalidsecurity', 'signaturedoesnotmatch', 'invalidaccesskeyid',
  // TTS / Fish Audio — invalid key or no balance
  'invalid api key', 'insufficient balance', 'invalid_api_key',
  'unauthorized', 'api key is invalid',
];
function isBillingError(message) {
  const lower = (message || '').toLowerCase();
  return BILLING_ERROR_PATTERNS.some(p => lower.includes(p));
}
let activeJobs = 0;
let activeRateLimitedJobs = 0; // Track rate-limited jobs separately
let pollTimer = null;
let workerId = '';

/**
 * Register a handler for a job type. Called by service modules.
 */
export function registerHandler(jobType, handler) {
  JOB_HANDLERS[jobType] = handler;
}

/**
 * Start the worker polling loop.
 */
// Job types that use rate-limited external APIs (process one at a time with cooldown)
const RATE_LIMITED_JOBS = new Set(['generate_visual_asset', 'generate_thumbnails']);
const RATE_LIMIT_COOLDOWN_MS = 15000; // 15s cooldown between rate-limited jobs

export function start({ pollIntervalMs = 2000, maxConcurrent = 3 } = {}) {
  if (running) return;
  running = true;
  workerId = `worker-${os.hostname()}-${process.pid}-${Date.now()}`;
  console.log(`[YouTube Worker] Starting ${workerId} (concurrency: ${maxConcurrent}, rate-limited: 1 at a time)`);

  // Recover stale jobs on startup
  resetStaleJobs(10).then(stale => {
    if (stale.length > 0) {
      console.log(`[YouTube Worker] Recovered ${stale.length} stale jobs`);
    }
  }).catch(err => {
    console.error('[YouTube Worker] Error recovering stale jobs:', err.message);
  });

  // Periodic stale job check
  const staleCheckInterval = setInterval(() => {
    if (!running) { clearInterval(staleCheckInterval); return; }
    resetStaleJobs(10).catch(() => {});
  }, 5 * 60 * 1000);

  poll(pollIntervalMs, maxConcurrent);
}

/**
 * Stop the worker gracefully.
 */
export function stop() {
  running = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  console.log('[YouTube Worker] Stopping... waiting for active jobs to finish');
}

/**
 * Check if any handlers are registered (used to skip polling when no services loaded).
 */
export function hasHandlers() {
  return Object.keys(JOB_HANDLERS).length > 0;
}

// --- Internal ---

async function poll(intervalMs, maxConcurrent) {
  while (running) {
    try {
      if (activeJobs < maxConcurrent && hasHandlers()) {
        const job = await claimNextJob(workerId);
        if (job) {
          // Rate-limited jobs (images/thumbnails): only 1 at a time
          if (RATE_LIMITED_JOBS.has(job.job_type) && activeRateLimitedJobs > 0) {
            // Put it back — release the claim by resetting to pending
            await releaseJob(job.id);
            await sleep(intervalMs);
            continue;
          }

          activeJobs++;
          if (RATE_LIMITED_JOBS.has(job.job_type)) activeRateLimitedJobs++;

          processJob(job).finally(() => {
            activeJobs--;
            if (RATE_LIMITED_JOBS.has(job.job_type)) activeRateLimitedJobs--;
          });
          continue; // Try to claim more immediately
        }
      }
    } catch (err) {
      console.error('[YouTube Worker] Poll error:', err.message);
    }

    await sleep(intervalMs);
  }
}

/**
 * Release a claimed job back to pending (when we can't process it right now).
 */
async function releaseJob(jobId) {
  try {
    const { db } = await import('../../db.js');
    await db.analytics.query(`
      UPDATE yt_jobs
      SET status = 'pending', locked_by = NULL, locked_at = NULL,
          attempt = GREATEST(attempt - 1, 0), updated_at = NOW()
      WHERE id = $1
    `, [jobId]);
  } catch (err) {
    console.error('[YouTube Worker] Error releasing job:', err.message);
  }
}

async function processJob(job) {
  const handler = JOB_HANDLERS[job.job_type];

  if (!handler) {
    console.warn(`[YouTube Worker] No handler for job type: ${job.job_type}`);
    await failJob(job.id, new Error(`No handler registered for: ${job.job_type}`));
    return;
  }

  const startTime = Date.now();
  await logJob(job.id, 'info', `Starting ${job.job_type} (attempt ${job.attempt})`);

  try {
    const result = await handler(job);
    const durationMs = Date.now() - startTime;

    await completeJob(job.id, result || {});
    await logJob(job.id, 'info', `Completed ${job.job_type} in ${durationMs}ms`);

    // Cooldown after rate-limited jobs to avoid API throttling
    if (RATE_LIMITED_JOBS.has(job.job_type)) {
      console.log(`[YouTube Worker] Rate-limit cooldown: waiting ${RATE_LIMIT_COOLDOWN_MS}ms before next image job`);
      await new Promise(r => setTimeout(r, RATE_LIMIT_COOLDOWN_MS));
    }

    // Trigger next step in the pipeline
    const completedJob = { ...job, result: result || {} };
    try {
      await onJobCompleted(completedJob);
    } catch (orchestratorErr) {
      console.error(`[YouTube Worker] Orchestrator error after ${job.job_type}:`, orchestratorErr.message);
      await logJob(job.id, 'error', `Orchestrator error: ${orchestratorErr.message}`);
    }
  } catch (err) {
    const durationMs = Date.now() - startTime;
    console.error(`[YouTube Worker] Job ${job.job_type} failed (${durationMs}ms):`, err.message);
    await logJob(job.id, 'error', err.message, { stack: err.stack });
    await failJob(job.id, err);

    // Cooldown after failed rate-limited jobs too (prevent hammering the API)
    if (RATE_LIMITED_JOBS.has(job.job_type)) {
      const isThrottle = err.message.includes('throttled') || err.message.includes('rate limit');
      const cooldown = isThrottle ? 30000 : RATE_LIMIT_COOLDOWN_MS;
      console.log(`[YouTube Worker] Rate-limit cooldown after failure: waiting ${cooldown}ms`);
      await new Promise(r => setTimeout(r, cooldown));
    }

    // On billing/credit errors: cancel all pending sibling jobs for this topic
    // to prevent hundreds of doomed retries
    if (job.topic_id && isBillingError(err.message)) {
      console.error(`[YouTube Worker] BILLING ERROR detected — cancelling all pending jobs for topic ${job.topic_id}`);
      const cancelled = await cancelJobsForTopic(job.topic_id);
      console.error(`[YouTube Worker] Cancelled ${cancelled} pending jobs for topic ${job.topic_id}`);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => {
    pollTimer = setTimeout(resolve, ms);
  });
}
