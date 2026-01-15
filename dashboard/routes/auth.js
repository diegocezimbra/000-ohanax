import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// =============================================================================
// AUTH SERVICE - USER STATISTICS & MANAGEMENT
// =============================================================================

// GET /users - Estatisticas de usuarios
router.get('/users', async (req, res) => {
  try {
    const result = await db.auth.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified,
        COUNT(CASE WHEN provider = 'google' THEN 1 END) as google_users,
        COUNT(CASE WHEN provider = 'github' THEN 1 END) as github_users,
        COUNT(CASE WHEN provider = 'email' THEN 1 END) as email_users,
        COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
        COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7_days,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_last_30_days,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_last_7_days,
        COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as new_today
      FROM users
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/list - Lista de usuarios
router.get('/users/list', async (req, res) => {
  try {
    const result = await db.auth.query(`
      SELECT
        u.id, u.email, u.name, u.provider, u.email_verified,
        u.last_login_at, u.created_at,
        p.name as project_name
      FROM users u
      LEFT JOIN projects p ON u.project_id = p.id
      ORDER BY u.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /projects - Lista de projetos
router.get('/projects', async (req, res) => {
  try {
    const result = await db.auth.query(`
      SELECT
        p.id, p.name, p.description, p.created_at,
        COUNT(u.id) as total_users
      FROM projects p
      LEFT JOIN users u ON u.project_id = p.id
      GROUP BY p.id
      ORDER BY total_users DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/growth - Crescimento de usuarios (ultimos 90 dias)
router.get('/users/growth', async (req, res) => {
  try {
    const result = await db.auth.query(`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as count,
        SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)) as cumulative
      FROM users
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// AUTH AUDIT LOGS
// =============================================================================

// GET /audit/stats - Estatisticas de auditoria do Auth
router.get('/audit/stats', async (req, res) => {
  try {
    // Logins hoje
    const loginsToday = await db.auth.query(`
      SELECT COUNT(*) as count FROM login_history WHERE created_at::date = CURRENT_DATE
    `);

    // Logins falhos (ultimos 7 dias)
    const failedLogins = await db.auth.query(`
      SELECT COUNT(*) as count FROM login_history
      WHERE success = false AND created_at > NOW() - INTERVAL '7 days'
    `);

    // Novos dispositivos (ultimos 7 dias)
    const newDevices = await db.auth.query(`
      SELECT COUNT(*) as count FROM login_history
      WHERE is_new_device = true AND created_at > NOW() - INTERVAL '7 days'
    `);

    // Eventos criticos nao resolvidos
    const criticalEvents = await db.auth.query(`
      SELECT COUNT(*) as count FROM security_events
      WHERE severity IN ('high', 'critical') AND resolved = false
    `);

    res.json({
      loginsToday: parseInt(loginsToday.rows[0].count) || 0,
      failedLogins: parseInt(failedLogins.rows[0].count) || 0,
      newDevices: parseInt(newDevices.rows[0].count) || 0,
      criticalEvents: parseInt(criticalEvents.rows[0].count) || 0
    });
  } catch (err) {
    console.error('Error fetching auth audit stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /audit/logins - Historico de logins
router.get('/audit/logins', async (req, res) => {
  try {
    const { success, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const params = [];

    if (success !== undefined && success !== '') {
      whereClause = 'WHERE success = $1';
      params.push(success === 'true');
    }

    const countQuery = `SELECT COUNT(*) as total FROM login_history ${whereClause}`;
    const countResult = await db.auth.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT
        id, user_id, user_type, user_email, success, failure_reason,
        ip_address, user_agent, device_fingerprint, is_new_device,
        auth_method, created_at
      FROM login_history
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataResult = await db.auth.query(dataQuery, [...params, parseInt(limit), offset]);

    res.json({
      data: dataResult.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching auth logins:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /audit/logins-chart - Dados para grafico de logins (7 dias)
router.get('/audit/logins-chart', async (req, res) => {
  try {
    const result = await db.auth.query(`
      SELECT
        created_at::date as date,
        COUNT(*) as total,
        COUNT(CASE WHEN success = true THEN 1 END) as success,
        COUNT(CASE WHEN success = false THEN 1 END) as failed
      FROM login_history
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY created_at::date
      ORDER BY date
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching logins chart:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /audit/security-events - Eventos de seguranca
router.get('/audit/security-events', async (req, res) => {
  try {
    const { severity, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = '';
    const params = [];

    if (severity) {
      whereClause = 'WHERE severity = $1';
      params.push(severity);
    }

    const countQuery = `SELECT COUNT(*) as total FROM security_events ${whereClause}`;
    const countResult = await db.auth.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT
        id, user_id, user_type, user_email, event_type, severity,
        ip_address, user_agent, details, resolved, resolved_at,
        resolved_by, created_at
      FROM security_events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataResult = await db.auth.query(dataQuery, [...params, parseInt(limit), offset]);

    res.json({
      data: dataResult.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching security events:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /audit/security-events/:id/resolve - Resolver evento de seguranca
router.patch('/audit/security-events/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    await db.auth.query(`
      UPDATE security_events
      SET resolved = true, resolved_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error resolving security event:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /audit/admin-actions - Acoes administrativas recentes
router.get('/audit/admin-actions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE actor_type = 'admin'`;
    const countResult = await db.auth.query(countQuery);
    const total = parseInt(countResult.rows[0].total);

    const dataQuery = `
      SELECT
        id, actor_type, actor_id, actor_email, action,
        resource_type, resource_id, http_method, endpoint,
        status_code, success, duration_ms, changes, metadata,
        severity, ip_address, created_at
      FROM audit_logs
      WHERE actor_type = 'admin'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const dataResult = await db.auth.query(dataQuery, [parseInt(limit), offset]);

    res.json({
      data: dataResult.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching admin actions:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
