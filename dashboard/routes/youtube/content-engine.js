import { Router } from 'express';
import {
  getEngineStatus,
  triggerEngine,
  pauseEngine,
  resumeEngine,
} from '../../services/youtube/content-engine.js';

const router = Router({ mergeParams: true });

// =============================================================================
// GET /status - Get Content Engine status for project
// =============================================================================
router.get('/status', async (req, res) => {
  try {
    const { projectId } = req.params;
    const status = await getEngineStatus(projectId);
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[ContentEngine] Error getting status:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /trigger - Manually trigger the Content Engine
// =============================================================================
router.post('/trigger', async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await triggerEngine(projectId);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('[ContentEngine] Error triggering engine:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /pause - Pause the Content Engine for project
// =============================================================================
router.post('/pause', async (req, res) => {
  try {
    const { projectId } = req.params;
    await pauseEngine(projectId);
    res.json({ success: true, data: { paused: true } });
  } catch (err) {
    console.error('[ContentEngine] Error pausing:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================================================
// POST /resume - Resume the Content Engine for project
// =============================================================================
router.post('/resume', async (req, res) => {
  try {
    const { projectId } = req.params;
    await resumeEngine(projectId);
    res.json({ success: true, data: { paused: false } });
  } catch (err) {
    console.error('[ContentEngine] Error resuming:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
