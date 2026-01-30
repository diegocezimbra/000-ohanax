import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Inicializar tabela de investment analyses (se nao existir)
async function initInvestmentAnalysesTable() {
  try {
    await db.analytics.query(`
      CREATE TABLE IF NOT EXISTS admin_investment_analyses (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        form_data JSONB NOT NULL DEFAULT '{}',
        score INTEGER DEFAULT 0,
        recommendation VARCHAR(50) DEFAULT 'nao_investir',
        notes TEXT,
        is_favorite BOOLEAN DEFAULT false,
        color VARCHAR(50) DEFAULT 'gradient-3',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.analytics.query(`
      CREATE INDEX IF NOT EXISTS idx_inv_analyses_company ON admin_investment_analyses(company_name);
      CREATE INDEX IF NOT EXISTS idx_inv_analyses_favorite ON admin_investment_analyses(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_inv_analyses_recommendation ON admin_investment_analyses(recommendation);
    `);

    console.log('Investment analyses table initialized');
  } catch (err) {
    console.error('Error initializing investment analyses table:', err.message);
  }
}

initInvestmentAnalysesTable();

// =============================================
// ROTAS
// =============================================

// GET /api/investment-analyses - Listar todas (summary only)
router.get('/', async (req, res) => {
  try {
    const { search, favorite } = req.query;

    let query = 'SELECT id, company_name, score, recommendation, is_favorite, color, created_at, updated_at FROM admin_investment_analyses WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND company_name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (favorite === 'true') {
      query += ' AND is_favorite = true';
    }

    query += ' ORDER BY is_favorite DESC, updated_at DESC';

    const result = await db.analytics.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching investment analyses:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/investment-analyses/:id - Obter uma analise completa
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.analytics.query(
      'SELECT * FROM admin_investment_analyses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Analise nao encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching investment analysis:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/investment-analyses - Criar nova analise
router.post('/', async (req, res) => {
  try {
    const { company_name, form_data, score, recommendation, notes, color } = req.body;

    if (!company_name) {
      return res.status(400).json({
        success: false,
        error: 'Nome da empresa e obrigatorio'
      });
    }

    const result = await db.analytics.query(
      `INSERT INTO admin_investment_analyses (company_name, form_data, score, recommendation, notes, color)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        company_name,
        JSON.stringify(form_data || {}),
        score || 0,
        recommendation || 'nao_investir',
        notes || null,
        color || 'gradient-3'
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error creating investment analysis:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/investment-analyses/:id - Atualizar analise
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name, form_data, score, recommendation, notes, color } = req.body;

    const result = await db.analytics.query(
      `UPDATE admin_investment_analyses
       SET company_name = COALESCE($1, company_name),
           form_data = COALESCE($2, form_data),
           score = COALESCE($3, score),
           recommendation = COALESCE($4, recommendation),
           notes = COALESCE($5, notes),
           color = COALESCE($6, color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        company_name,
        form_data ? JSON.stringify(form_data) : null,
        score,
        recommendation,
        notes,
        color,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Analise nao encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating investment analysis:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/investment-analyses/:id - Deletar analise
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.analytics.query(
      'DELETE FROM admin_investment_analyses WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Analise nao encontrada' });
    }

    res.json({ success: true, message: 'Analise deletada com sucesso' });
  } catch (err) {
    console.error('Error deleting investment analysis:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/investment-analyses/:id/favorite - Toggle favorito
router.patch('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.analytics.query(
      `UPDATE admin_investment_analyses
       SET is_favorite = NOT is_favorite,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Analise nao encontrada' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error toggling favorite:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
