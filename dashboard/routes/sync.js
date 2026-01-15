import express from 'express';
import { syncService } from '../services/sync.js';
import { db } from '../db.js';

const router = express.Router();

// Buscar dados do cache (usado pelo dashboard)
router.get('/cache/:source/:metric', async (req, res) => {
  try {
    const { source, metric } = req.params;
    const { days } = req.query;
    const dateRange = days ? `${days}d` : '7d';

    const cached = await syncService.getFromCache(source, metric, dateRange);

    if (!cached) {
      return res.status(404).json({ error: 'Dados nao encontrados no cache' });
    }

    res.json({
      data: cached.data,
      fetched_at: cached.fetched_at,
      source,
      metric,
      dateRange
    });
  } catch (error) {
    console.error('Erro ao buscar cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// Status do sync
router.get('/status', async (req, res) => {
  try {
    const result = await db.analytics.query('SELECT * FROM sync_config ORDER BY source');

    res.json({
      configs: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao buscar status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Forcar sync manual do GA4
router.post('/ga4', async (req, res) => {
  try {
    const result = await syncService.syncAllGA4();
    res.json(result);
  } catch (error) {
    console.error('Erro ao sincronizar GA4:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync individual de metricas GA4
router.post('/ga4/metrics', async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const data = await syncService.syncGA4Metrics(days);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync individual de eventos GA4
router.post('/ga4/events', async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const data = await syncService.syncGA4Events(days);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync de funil GA4
router.post('/ga4/funnel', async (req, res) => {
  try {
    const data = await syncService.syncGA4Funnel();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync de metricas de influenciadores
router.post('/influencers', async (req, res) => {
  try {
    const { days = 7 } = req.body;
    const data = await syncService.syncInfluencerMetrics(days);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar configuracao de sync
router.put('/config/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const { sync_interval_minutes, enabled, config } = req.body;

    const updates = [];
    const values = [source];
    let paramIndex = 2;

    if (sync_interval_minutes !== undefined) {
      updates.push(`sync_interval_minutes = $${paramIndex++}`);
      values.push(sync_interval_minutes);
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(enabled);
    }
    if (config !== undefined) {
      updates.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(config));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    const query = `UPDATE sync_config SET ${updates.join(', ')} WHERE source = $1 RETURNING *`;
    const result = await db.analytics.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Fonte nao encontrada' });
    }

    res.json({ success: true, config: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar/parar auto-sync
router.post('/auto/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { intervalMinutes = 60 } = req.body;

    if (action === 'start') {
      syncService.startAutoSync(intervalMinutes);
      res.json({ success: true, message: `Auto-sync iniciado (${intervalMinutes} min)` });
    } else if (action === 'stop') {
      syncService.stopAutoSync();
      res.json({ success: true, message: 'Auto-sync parado' });
    } else {
      res.status(400).json({ error: 'Acao invalida. Use start ou stop' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
