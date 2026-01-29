import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

// Inicializar tabela de orçamentos (se não existir)
async function initOrcamentosTable() {
  try {
    await db.analytics.query(`
      CREATE TABLE IF NOT EXISTS admin_orcamentos (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(50) NOT NULL UNIQUE,
        cliente_nome VARCHAR(255) NOT NULL,
        cliente_empresa VARCHAR(255),
        cliente_email VARCHAR(255),
        cliente_telefone VARCHAR(50),
        projeto_nome VARCHAR(255) NOT NULL,
        projeto_descricao TEXT,
        tipo VARCHAR(50) DEFAULT 'desenvolvimento',
        status VARCHAR(50) DEFAULT 'rascunho',
        valor_total DECIMAL(12,2) DEFAULT 0,
        desconto DECIMAL(5,2) DEFAULT 0,
        valor_final DECIMAL(12,2) DEFAULT 0,
        prazo_dias INTEGER,
        validade_dias INTEGER DEFAULT 30,
        itens JSONB DEFAULT '[]',
        condicoes TEXT,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar índices
    await db.analytics.query(`
      CREATE INDEX IF NOT EXISTS idx_orcamentos_numero ON admin_orcamentos(numero);
      CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON admin_orcamentos(status);
      CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON admin_orcamentos(cliente_nome);
    `);

    console.log('Orcamentos table initialized');
  } catch (err) {
    console.error('Error initializing orcamentos table:', err.message);
  }
}

// Inicializar tabela ao carregar o módulo
initOrcamentosTable();

// Gerar número único do orçamento
function gerarNumeroOrcamento() {
  const ano = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `ORC-${ano}-${timestamp}`;
}

// GET /api/orcamentos - Listar todos os orçamentos
router.get('/', async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM admin_orcamentos WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (cliente_nome ILIKE $${paramIndex} OR projeto_nome ILIKE $${paramIndex} OR numero ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ' ORDER BY updated_at DESC';
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.analytics.query(query, params);

    // Contar total
    let countQuery = 'SELECT COUNT(*) FROM admin_orcamentos WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (status && status !== 'all') {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }

    if (search) {
      countQuery += ` AND (cliente_nome ILIKE $${countIndex} OR projeto_nome ILIKE $${countIndex} OR numero ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.analytics.query(countQuery, countParams);

    res.json({
      success: true,
      orcamentos: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error fetching orcamentos:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orcamentos/:id - Obter um orçamento específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.analytics.query(
      'SELECT * FROM admin_orcamentos WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    }

    res.json({
      success: true,
      orcamento: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching orcamento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orcamentos/numero/:numero - Obter por número
router.get('/numero/:numero', async (req, res) => {
  try {
    const { numero } = req.params;

    const result = await db.analytics.query(
      'SELECT * FROM admin_orcamentos WHERE numero = $1',
      [numero]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    }

    res.json({
      success: true,
      orcamento: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching orcamento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orcamentos - Criar novo orçamento
router.post('/', async (req, res) => {
  try {
    const {
      cliente_nome,
      cliente_empresa,
      cliente_email,
      cliente_telefone,
      projeto_nome,
      projeto_descricao,
      tipo,
      status,
      valor_total,
      desconto,
      valor_final,
      prazo_dias,
      validade_dias,
      itens,
      condicoes,
      observacoes
    } = req.body;

    if (!cliente_nome || !projeto_nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome do cliente e nome do projeto são obrigatórios'
      });
    }

    const numero = gerarNumeroOrcamento();

    const result = await db.analytics.query(
      `INSERT INTO admin_orcamentos (
        numero, cliente_nome, cliente_empresa, cliente_email, cliente_telefone,
        projeto_nome, projeto_descricao, tipo, status, valor_total, desconto,
        valor_final, prazo_dias, validade_dias, itens, condicoes, observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        numero,
        cliente_nome,
        cliente_empresa || null,
        cliente_email || null,
        cliente_telefone || null,
        projeto_nome,
        projeto_descricao || null,
        tipo || 'desenvolvimento',
        status || 'rascunho',
        valor_total || 0,
        desconto || 0,
        valor_final || 0,
        prazo_dias || null,
        validade_dias || 30,
        JSON.stringify(itens || []),
        condicoes || null,
        observacoes || null
      ]
    );

    res.status(201).json({
      success: true,
      orcamento: result.rows[0]
    });
  } catch (err) {
    console.error('Error creating orcamento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/orcamentos/:id - Atualizar orçamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cliente_nome,
      cliente_empresa,
      cliente_email,
      cliente_telefone,
      projeto_nome,
      projeto_descricao,
      tipo,
      status,
      valor_total,
      desconto,
      valor_final,
      prazo_dias,
      validade_dias,
      itens,
      condicoes,
      observacoes
    } = req.body;

    const result = await db.analytics.query(
      `UPDATE admin_orcamentos SET
        cliente_nome = COALESCE($1, cliente_nome),
        cliente_empresa = COALESCE($2, cliente_empresa),
        cliente_email = COALESCE($3, cliente_email),
        cliente_telefone = COALESCE($4, cliente_telefone),
        projeto_nome = COALESCE($5, projeto_nome),
        projeto_descricao = COALESCE($6, projeto_descricao),
        tipo = COALESCE($7, tipo),
        status = COALESCE($8, status),
        valor_total = COALESCE($9, valor_total),
        desconto = COALESCE($10, desconto),
        valor_final = COALESCE($11, valor_final),
        prazo_dias = COALESCE($12, prazo_dias),
        validade_dias = COALESCE($13, validade_dias),
        itens = COALESCE($14, itens),
        condicoes = COALESCE($15, condicoes),
        observacoes = COALESCE($16, observacoes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
      RETURNING *`,
      [
        cliente_nome,
        cliente_empresa,
        cliente_email,
        cliente_telefone,
        projeto_nome,
        projeto_descricao,
        tipo,
        status,
        valor_total,
        desconto,
        valor_final,
        prazo_dias,
        validade_dias,
        itens ? JSON.stringify(itens) : null,
        condicoes,
        observacoes,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    }

    res.json({
      success: true,
      orcamento: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating orcamento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/orcamentos/:id/status - Atualizar status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatus = ['rascunho', 'enviado', 'aprovado', 'rejeitado', 'expirado'];
    if (!validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status inválido. Use: ${validStatus.join(', ')}`
      });
    }

    const result = await db.analytics.query(
      `UPDATE admin_orcamentos SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    }

    res.json({
      success: true,
      orcamento: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/orcamentos/:id - Deletar orçamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.analytics.query(
      'DELETE FROM admin_orcamentos WHERE id = $1 RETURNING id, numero',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    }

    res.json({
      success: true,
      message: `Orçamento ${result.rows[0].numero} deletado com sucesso`
    });
  } catch (err) {
    console.error('Error deleting orcamento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orcamentos/:id/duplicar - Duplicar orçamento
router.post('/:id/duplicar', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar orçamento original
    const original = await db.analytics.query(
      'SELECT * FROM admin_orcamentos WHERE id = $1',
      [id]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Orçamento não encontrado' });
    }

    const orc = original.rows[0];
    const novoNumero = gerarNumeroOrcamento();

    // Criar cópia
    const result = await db.analytics.query(
      `INSERT INTO admin_orcamentos (
        numero, cliente_nome, cliente_empresa, cliente_email, cliente_telefone,
        projeto_nome, projeto_descricao, tipo, status, valor_total, desconto,
        valor_final, prazo_dias, validade_dias, itens, condicoes, observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'rascunho', $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        novoNumero,
        orc.cliente_nome,
        orc.cliente_empresa,
        orc.cliente_email,
        orc.cliente_telefone,
        orc.projeto_nome + ' (Cópia)',
        orc.projeto_descricao,
        orc.tipo,
        orc.valor_total,
        orc.desconto,
        orc.valor_final,
        orc.prazo_dias,
        orc.validade_dias,
        JSON.stringify(orc.itens),
        orc.condicoes,
        orc.observacoes
      ]
    );

    res.status(201).json({
      success: true,
      orcamento: result.rows[0]
    });
  } catch (err) {
    console.error('Error duplicating orcamento:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orcamentos/stats/resumo - Estatísticas
router.get('/stats/resumo', async (req, res) => {
  try {
    const result = await db.analytics.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'rascunho') as rascunhos,
        COUNT(*) FILTER (WHERE status = 'enviado') as enviados,
        COUNT(*) FILTER (WHERE status = 'aprovado') as aprovados,
        COUNT(*) FILTER (WHERE status = 'rejeitado') as rejeitados,
        COALESCE(SUM(valor_final) FILTER (WHERE status = 'aprovado'), 0) as valor_aprovado,
        COALESCE(SUM(valor_final), 0) as valor_total
      FROM admin_orcamentos
    `);

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
