import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Inicializar tabela de prompts (se não existir)
async function initPromptsTable() {
  try {
    await db.analytics.query(`
      CREATE TABLE IF NOT EXISTS admin_prompts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'dev',
        content TEXT NOT NULL,
        description TEXT,
        tags TEXT[],
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices
    await db.analytics.query(`
      CREATE INDEX IF NOT EXISTS idx_prompts_category ON admin_prompts(category);
      CREATE INDEX IF NOT EXISTS idx_prompts_favorite ON admin_prompts(is_favorite);
    `);

    console.log('Prompts table initialized');
  } catch (err) {
    console.error('Error initializing prompts table:', err.message);
  }
}

// Inicializar tabela ao carregar o módulo
initPromptsTable();

// =============================================
// ROTAS ESTÁTICAS (ANTES de /:id para evitar conflitos)
// =============================================

// GET /api/prompts/stats/categories - Estatísticas por categoria
router.get('/stats/categories', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT
        category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE is_favorite) as favorites
      FROM admin_prompts
      GROUP BY category
      ORDER BY count DESC
    `);

    res.json({
      success: true,
      stats: result.rows
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/prompts/import - Importar múltiplos prompts
router.post('/import', async (req, res) => {
  try {
    const { prompts: promptsToImport } = req.body;

    if (!Array.isArray(promptsToImport) || promptsToImport.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Array de prompts é obrigatório'
      });
    }

    const imported = [];
    const errors = [];

    for (const prompt of promptsToImport) {
      try {
        // Verificar se já existe um prompt com o mesmo título
        const existing = await db.analytics.query(
          'SELECT id FROM admin_prompts WHERE title = $1',
          [prompt.title]
        );

        if (existing.rows.length > 0) {
          errors.push({ title: prompt.title, error: 'Já existe' });
          continue;
        }

        const result = await db.analytics.query(
          `INSERT INTO admin_prompts (title, category, content, description, tags, is_favorite)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            prompt.title,
            prompt.category || 'dev',
            prompt.content,
            prompt.description || null,
            prompt.tags || [],
            prompt.is_favorite || false
          ]
        );

        imported.push(result.rows[0]);
      } catch (err) {
        errors.push({ title: prompt.title, error: err.message });
      }
    }

    res.json({
      success: true,
      imported: imported.length,
      errors: errors.length,
      details: { imported, errors }
    });
  } catch (err) {
    console.error('Error importing prompts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =============================================
// ROTAS DINÂMICAS
// =============================================

// GET /api/prompts - Listar todos os prompts
router.get('/', async (req, res) => {
  try {
    const { category, search, favorite } = req.query;

    let query = 'SELECT * FROM admin_prompts WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
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
      prompts: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching prompts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/prompts - Criar novo prompt
router.post('/', async (req, res) => {
  try {
    const { title, category, content, description, tags, is_favorite } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Título e conteúdo são obrigatórios'
      });
    }

    const result = await db.analytics.query(
      `INSERT INTO admin_prompts (title, category, content, description, tags, is_favorite)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        title,
        category || 'dev',
        content,
        description || null,
        tags || [],
        is_favorite || false
      ]
    );

    res.status(201).json({
      success: true,
      prompt: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating prompt:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/prompts/:id - Obter um prompt específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.analytics.query(
      'SELECT * FROM admin_prompts WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prompt não encontrado' });
    }

    res.json({
      success: true,
      prompt: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching prompt:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/prompts/:id - Atualizar prompt
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, content, description, tags, is_favorite } = req.body;

    const result = await db.analytics.query(
      `UPDATE admin_prompts
       SET title = COALESCE($1, title),
           category = COALESCE($2, category),
           content = COALESCE($3, content),
           description = COALESCE($4, description),
           tags = COALESCE($5, tags),
           is_favorite = COALESCE($6, is_favorite),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, category, content, description, tags, is_favorite, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prompt não encontrado' });
    }

    res.json({
      success: true,
      prompt: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating prompt:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/prompts/:id/favorite - Toggle favorito
router.patch('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.analytics.query(
      `UPDATE admin_prompts
       SET is_favorite = NOT is_favorite,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prompt não encontrado' });
    }

    res.json({
      success: true,
      prompt: result.rows[0]
    });
  } catch (err) {
    console.error('Error toggling favorite:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/prompts/:id - Deletar prompt
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.analytics.query(
      'DELETE FROM admin_prompts WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prompt não encontrado' });
    }

    res.json({
      success: true,
      message: 'Prompt deletado com sucesso'
    });
  } catch (err) {
    console.error('Error deleting prompt:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
