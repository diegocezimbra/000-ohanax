/**
 * Rotas de Logs Centralizados
 *
 * Endpoints para ingestão e consulta de logs do oEntregador
 * Tabela: oentregador_logs no banco analytics (porta 5441)
 */
import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// =============================================================================
// INGESTÃO DE LOGS
// =============================================================================

/**
 * POST /api/logs/oentregador
 * Recebe logs do app-backend do oEntregador
 */
router.post('/oentregador', async (req, res) => {
  try {
    const log = req.body;

    // Validar campos obrigatórios
    if (!log.action || !log.category || !log.status) {
      return res.status(400).json({
        error: 'Campos obrigatórios: action, category, status'
      });
    }

    const result = await db.analytics.query(`
      INSERT INTO oentregador_logs (
        user_id, user_name, user_email, user_role,
        company_id, company_name,
        action, category, resource, resource_id,
        method, endpoint, ip_address, user_agent,
        status, status_code, error_message,
        old_value, new_value, metadata,
        duration, timestamp
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, $20,
        $21, $22
      ) RETURNING id
    `, [
      log.userId || null,
      log.userName || null,
      log.userEmail || null,
      log.userRole || null,
      log.companyId || null,
      log.companyName || null,
      log.action,
      log.category,
      log.resource || null,
      log.resourceId || null,
      log.method || null,
      log.endpoint || null,
      log.ipAddress || null,
      log.userAgent || null,
      log.status,
      log.statusCode || null,
      log.errorMessage || null,
      log.oldValue ? JSON.stringify(log.oldValue) : null,
      log.newValue ? JSON.stringify(log.newValue) : null,
      log.metadata ? JSON.stringify(log.metadata) : null,
      log.duration || null,
      log.timestamp || new Date()
    ]);

    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Erro ao inserir log:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/logs/oentregador/batch
 * Recebe múltiplos logs em batch
 */
router.post('/oentregador/batch', async (req, res) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs) || logs.length === 0) {
      return res.status(400).json({ error: 'Array de logs obrigatório' });
    }

    const client = await db.analytics.connect();

    try {
      await client.query('BEGIN');

      let inserted = 0;
      for (const log of logs) {
        if (!log.action || !log.category || !log.status) continue;

        await client.query(`
          INSERT INTO oentregador_logs (
            user_id, user_name, user_email, user_role,
            company_id, company_name,
            action, category, resource, resource_id,
            method, endpoint, ip_address, user_agent,
            status, status_code, error_message,
            old_value, new_value, metadata,
            duration, timestamp
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
          )
        `, [
          log.userId, log.userName, log.userEmail, log.userRole,
          log.companyId, log.companyName,
          log.action, log.category, log.resource, log.resourceId,
          log.method, log.endpoint, log.ipAddress, log.userAgent,
          log.status, log.statusCode, log.errorMessage,
          log.oldValue ? JSON.stringify(log.oldValue) : null,
          log.newValue ? JSON.stringify(log.newValue) : null,
          log.metadata ? JSON.stringify(log.metadata) : null,
          log.duration, log.timestamp || new Date()
        ]);
        inserted++;
      }

      await client.query('COMMIT');
      res.json({ success: true, inserted });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao inserir batch de logs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// CONSULTA DE LOGS
// =============================================================================

/**
 * GET /api/logs/oentregador
 * Lista logs com filtros e paginação
 */
router.get('/oentregador', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      companyId,
      userId,
      action,
      category,
      status,
      startDate,
      endDate
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];

    if (companyId) {
      params.push(companyId);
      conditions.push(`company_id = $${params.length}`);
    }
    if (userId) {
      params.push(userId);
      conditions.push(`user_id = $${params.length}`);
    }
    if (action) {
      params.push(action);
      conditions.push(`action = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (startDate) {
      params.push(new Date(startDate));
      conditions.push(`timestamp >= $${params.length}`);
    }
    if (endDate) {
      params.push(new Date(endDate));
      conditions.push(`timestamp <= $${params.length}`);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Count total
    const countResult = await db.analytics.query(
      `SELECT COUNT(*) FROM oentregador_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get logs
    params.push(parseInt(limit));
    params.push(offset);

    const logsResult = await db.analytics.query(`
      SELECT * FROM oentregador_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      data: logsResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/logs/oentregador/stats
 * Estatísticas dos logs
 */
router.get('/oentregador/stats', async (req, res) => {
  try {
    const { period = 'day', companyId } = req.query;

    // Determinar intervalo de tempo
    let interval;
    switch (period) {
      case 'week':
        interval = "7 days";
        break;
      case 'month':
        interval = "30 days";
        break;
      default:
        interval = "1 day";
    }

    const companyFilter = companyId
      ? `AND company_id = '${companyId}'`
      : '';

    // Total de logs
    const totalResult = await db.analytics.query(`
      SELECT COUNT(*) as total
      FROM oentregador_logs
      WHERE timestamp >= NOW() - INTERVAL '${interval}' ${companyFilter}
    `);

    // Por categoria
    const byCategoryResult = await db.analytics.query(`
      SELECT category, COUNT(*) as count
      FROM oentregador_logs
      WHERE timestamp >= NOW() - INTERVAL '${interval}' ${companyFilter}
      GROUP BY category
      ORDER BY count DESC
    `);

    // Por status
    const byStatusResult = await db.analytics.query(`
      SELECT status, COUNT(*) as count
      FROM oentregador_logs
      WHERE timestamp >= NOW() - INTERVAL '${interval}' ${companyFilter}
      GROUP BY status
    `);

    // Top ações
    const topActionsResult = await db.analytics.query(`
      SELECT action, COUNT(*) as count
      FROM oentregador_logs
      WHERE timestamp >= NOW() - INTERVAL '${interval}' ${companyFilter}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);

    // Top usuários
    const topUsersResult = await db.analytics.query(`
      SELECT user_id, user_name, COUNT(*) as count
      FROM oentregador_logs
      WHERE timestamp >= NOW() - INTERVAL '${interval}'
        AND user_id IS NOT NULL ${companyFilter}
      GROUP BY user_id, user_name
      ORDER BY count DESC
      LIMIT 10
    `);

    // Logs por hora (últimas 24h)
    const hourlyResult = await db.analytics.query(`
      SELECT
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as count
      FROM oentregador_logs
      WHERE timestamp >= NOW() - INTERVAL '24 hours' ${companyFilter}
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour
    `);

    res.json({
      period,
      total: parseInt(totalResult.rows[0].total),
      byCategory: byCategoryResult.rows.reduce((acc, r) => {
        acc[r.category] = parseInt(r.count);
        return acc;
      }, {}),
      byStatus: byStatusResult.rows.reduce((acc, r) => {
        acc[r.status] = parseInt(r.count);
        return acc;
      }, {}),
      topActions: topActionsResult.rows.map(r => ({
        action: r.action,
        count: parseInt(r.count)
      })),
      topUsers: topUsersResult.rows.map(r => ({
        userId: r.user_id,
        userName: r.user_name,
        count: parseInt(r.count)
      })),
      hourly: hourlyResult.rows.map(r => ({
        hour: r.hour,
        count: parseInt(r.count)
      }))
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/logs/oentregador/recent
 * Últimos logs (para dashboard live)
 */
router.get('/oentregador/recent', async (req, res) => {
  try {
    const { limit = 20, companyId } = req.query;

    const params = [parseInt(limit)];
    let whereClause = '';

    if (companyId) {
      params.unshift(companyId);
      whereClause = 'WHERE company_id = $1';
    }

    const result = await db.analytics.query(`
      SELECT
        id, user_name, action, category, status,
        endpoint, duration, timestamp
      FROM oentregador_logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${params.length}
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar logs recentes:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
