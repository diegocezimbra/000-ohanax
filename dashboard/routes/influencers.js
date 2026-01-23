import express from 'express';
import { db } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Gerar codigo unico para influenciador
function generateCode(name) {
  const base = name.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 10);
  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base}${suffix}`;
}

// Gerar short code para link
function generateShortCode() {
  return crypto.randomBytes(4).toString('hex');
}

// ============================================================================
// INFLUENCER CRUD
// ============================================================================

// Listar todos os influenciadores
router.get('/', async (req, res) => {
  try {
    const { status, platform } = req.query;

    let query = 'SELECT * FROM influencers WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (platform) {
      params.push(platform);
      query += ` AND platform = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.analytics.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar influenciadores:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar influenciador por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.analytics.query('SELECT * FROM influencers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Influenciador nao encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar influenciador
router.post('/', async (req, res) => {
  try {
    const { name, email, platform = 'linkedin', commission_percent = 0, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome e obrigatorio' });
    }

    const code = generateCode(name);

    const result = await db.analytics.query(`
      INSERT INTO influencers (code, name, email, platform, commission_percent, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [code, name, email, platform, commission_percent, notes]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar influenciador:', error);
    res.status(500).json({ error: error.message });
  }
});

// Atualizar influenciador
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, platform, commission_percent, status, notes } = req.body;

    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email);
    }
    if (platform !== undefined) {
      updates.push(`platform = $${paramIndex++}`);
      values.push(platform);
    }
    if (commission_percent !== undefined) {
      updates.push(`commission_percent = $${paramIndex++}`);
      values.push(commission_percent);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.push('updated_at = NOW()');

    const query = `UPDATE influencers SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await db.analytics.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Influenciador nao encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deletar influenciador
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se tem links ou metricas
    const linksResult = await db.analytics.query('SELECT COUNT(*) FROM tracking_links WHERE influencer_id = $1', [id]);
    const metricsResult = await db.analytics.query('SELECT COUNT(*) FROM influencer_metrics WHERE influencer_id = $1', [id]);

    const hasLinks = parseInt(linksResult.rows[0].count) > 0;
    const hasMetrics = parseInt(metricsResult.rows[0].count) > 0;

    if (hasLinks || hasMetrics) {
      // Soft delete - apenas marca como inativo
      await db.analytics.query('UPDATE influencers SET status = $1, updated_at = NOW() WHERE id = $2', ['deleted', id]);
      return res.json({ message: 'Influenciador marcado como deletado (possui dados associados)' });
    }

    // Hard delete
    const result = await db.analytics.query('DELETE FROM influencers WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Influenciador nao encontrado' });
    }

    res.json({ message: 'Influenciador deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TRACKING LINKS
// ============================================================================

// Listar links de um influenciador
router.get('/:id/links', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.analytics.query(
      'SELECT * FROM tracking_links WHERE influencer_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar link de rastreamento
router.post('/:id/links', async (req, res) => {
  try {
    const { id } = req.params;
    const { campaign, destination_url } = req.body;

    if (!destination_url) {
      return res.status(400).json({ error: 'URL de destino e obrigatoria' });
    }

    // Buscar influenciador
    const influencerResult = await db.analytics.query('SELECT code FROM influencers WHERE id = $1', [id]);
    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Influenciador nao encontrado' });
    }

    const influencerCode = influencerResult.rows[0].code;
    const shortCode = generateShortCode();

    // Montar UTMs
    const utmSource = 'influencer';
    const utmMedium = 'social';
    const utmCampaign = campaign ? `influencer_${campaign}` : 'influencer_default';
    const utmContent = influencerCode;

    // Construir URL final
    const url = new URL(destination_url);
    url.searchParams.set('utm_source', utmSource);
    url.searchParams.set('utm_medium', utmMedium);
    url.searchParams.set('utm_campaign', utmCampaign);
    url.searchParams.set('utm_content', utmContent);

    const result = await db.analytics.query(`
      INSERT INTO tracking_links (influencer_id, campaign, destination_url, short_code, utm_source, utm_medium, utm_campaign, utm_content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, campaign, url.toString(), shortCode, utmSource, utmMedium, utmCampaign, utmContent]);

    res.status(201).json({
      ...result.rows[0],
      full_url: url.toString()
    });
  } catch (error) {
    console.error('Erro ao criar link:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deletar link
router.delete('/links/:linkId', async (req, res) => {
  try {
    const { linkId } = req.params;
    const result = await db.analytics.query('DELETE FROM tracking_links WHERE id = $1 RETURNING *', [linkId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link nao encontrado' });
    }

    res.json({ message: 'Link deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// METRICS
// ============================================================================

// Metricas de um influenciador
router.get('/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const result = await db.analytics.query(`
      SELECT
        date,
        visits,
        scans_started,
        scans_completed,
        checkouts,
        conversions,
        revenue
      FROM influencer_metrics
      WHERE influencer_id = $1
        AND date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY date DESC
    `, [id]);

    // Calcular totais
    const totals = {
      visits: 0,
      scans_started: 0,
      scans_completed: 0,
      checkouts: 0,
      conversions: 0,
      revenue: 0
    };

    result.rows.forEach(row => {
      totals.visits += parseInt(row.visits || 0);
      totals.scans_started += parseInt(row.scans_started || 0);
      totals.scans_completed += parseInt(row.scans_completed || 0);
      totals.checkouts += parseInt(row.checkouts || 0);
      totals.conversions += parseInt(row.conversions || 0);
      totals.revenue += parseFloat(row.revenue || 0);
    });

    res.json({
      daily: result.rows,
      totals,
      period: `${days} dias`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resumo de todos os influenciadores
router.get('/metrics/summary', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await db.analytics.query(`
      SELECT
        i.id,
        i.code,
        i.name,
        i.platform,
        i.commission_percent,
        COALESCE(SUM(m.visits), 0) as total_visits,
        COALESCE(SUM(m.scans_started), 0) as total_scans_started,
        COALESCE(SUM(m.conversions), 0) as total_conversions,
        COALESCE(SUM(m.revenue), 0) as total_revenue
      FROM influencers i
      LEFT JOIN influencer_metrics m ON i.id = m.influencer_id
        AND m.date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      WHERE i.status = 'active'
      GROUP BY i.id, i.code, i.name, i.platform, i.commission_percent
      ORDER BY total_visits DESC
    `);

    res.json({
      influencers: result.rows,
      period: `${days} dias`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// LINK GENERATOR (Utility)
// ============================================================================

// Gerar link rapido para influenciador existente
router.post('/generate-link', async (req, res) => {
  try {
    const {
      influencer_code,
      destination_url,
      campaign,
      utm_source = 'influencer',
      utm_medium = 'social',
    } = req.body;

    if (!influencer_code || !destination_url) {
      return res.status(400).json({ error: 'Codigo do influenciador e URL de destino sao obrigatorios' });
    }

    // Verificar se influenciador existe
    const influencerResult = await db.analytics.query(
      'SELECT id, code, name, platform FROM influencers WHERE code = $1',
      [influencer_code]
    );

    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Influenciador nao encontrado' });
    }

    const influencer = influencerResult.rows[0];

    // Construir UTM campaign: inf_{nome_campanha}_{codigo_influenciador}
    const utmCampaign = campaign ? `inf_${campaign}` : 'inf_default';

    // Construir URL com UTMs
    const url = new URL(destination_url);
    url.searchParams.set('utm_source', utm_source);
    url.searchParams.set('utm_medium', utm_medium);
    url.searchParams.set('utm_campaign', utmCampaign);
    url.searchParams.set('utm_content', influencer.code);

    // Salvar link no banco para tracking
    try {
      await db.analytics.query(`
        INSERT INTO tracking_links (influencer_id, campaign, destination_url, utm_source, utm_medium, utm_campaign, utm_content)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [influencer.id, campaign, url.toString(), utm_source, utm_medium, utmCampaign, influencer.code]);
    } catch (err) {
      console.log('Could not save tracking link:', err.message);
    }

    res.json({
      influencer: {
        id: influencer.id,
        code: influencer.code,
        name: influencer.name,
        platform: influencer.platform,
      },
      original_url: destination_url,
      tracking_url: url.toString(),
      utm_params: {
        utm_source,
        utm_medium,
        utm_campaign: utmCampaign,
        utm_content: influencer.code,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
