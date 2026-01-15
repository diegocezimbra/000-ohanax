import express from 'express';
import { db } from '../db.js';
const router = express.Router();

// =============================================================================
// BILLING METRICS ENDPOINTS
// =============================================================================

// MRR calculado pelo preco do plano (nao pelo current_mrr_cents que esta zerado)
router.get('/metrics', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN s.status = 'active' THEN
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents
                WHEN 'yearly' THEN pl.price_cents / 12
                WHEN 'weekly' THEN pl.price_cents * 4
                ELSE pl.price_cents
              END
            ELSE 0
          END
        ), 0) / 100.0 as mrr,
        COALESCE(SUM(
          CASE
            WHEN s.status = 'active' THEN
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents * 12
                WHEN 'yearly' THEN pl.price_cents
                WHEN 'weekly' THEN pl.price_cents * 52
                ELSE pl.price_cents * 12
              END
            ELSE 0
          END
        ), 0) / 100.0 as arr,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) as trial_subscriptions,
        COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) as canceled_subscriptions,
        COUNT(CASE WHEN s.status = 'past_due' THEN 1 END) as past_due_subscriptions,
        COUNT(CASE WHEN s.status = 'expired' THEN 1 END) as expired_subscriptions,
        COUNT(CASE WHEN s.status = 'pending' THEN 1 END) as pending_subscriptions,
        COUNT(*) as total_subscriptions
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mrr-by-project', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        p.name as project_name,
        COALESCE(SUM(
          CASE
            WHEN s.status = 'active' THEN
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents
                WHEN 'yearly' THEN pl.price_cents / 12
                WHEN 'weekly' THEN pl.price_cents * 4
                ELSE pl.price_cents
              END
            ELSE 0
          END
        ), 0) / 100.0 as mrr,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscriptions
      FROM projects p
      LEFT JOIN subscriptions s ON s.project_id = p.id
      LEFT JOIN plans pl ON s.plan_id = pl.id
      GROUP BY p.id, p.name
      ORDER BY mrr DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/subscribers', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        s.id,
        s.external_user_email as email,
        s.status,
        s.gateway,
        CASE pl.interval
          WHEN 'monthly' THEN pl.price_cents
          WHEN 'yearly' THEN pl.price_cents / 12
          WHEN 'weekly' THEN pl.price_cents * 4
          ELSE pl.price_cents
        END / 100.0 as mrr,
        s.current_period_start,
        s.current_period_end,
        s.created_at,
        pl.name as plan_name,
        pl.price_cents / 100.0 as plan_price,
        pl.interval as plan_interval,
        p.name as project_name
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/paying-users', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT DISTINCT ON (s.external_user_email)
        s.external_user_email as email,
        s.status,
        CASE pl.interval
          WHEN 'monthly' THEN pl.price_cents
          WHEN 'yearly' THEN pl.price_cents / 12
          WHEN 'weekly' THEN pl.price_cents * 4
          ELSE pl.price_cents
        END / 100.0 as mrr,
        pl.name as plan_name,
        p.name as project_name,
        s.created_at as subscribed_at
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.status = 'active'
      ORDER BY s.external_user_email, s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        pl.id,
        pl.name,
        pl.price_cents / 100.0 as price,
        pl.interval,
        pl.status,
        p.name as project_name,
        COUNT(s.id) as total_subscribers,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subscribers
      FROM plans pl
      LEFT JOIN projects p ON pl.project_id = p.id
      LEFT JOIN subscriptions s ON s.plan_id = pl.id
      GROUP BY pl.id, p.name
      ORDER BY active_subscribers DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        id,
        external_user_email as email,
        amount_cents / 100.0 as amount,
        status,
        payment_method,
        gateway,
        paid_at,
        created_at
      FROM payments
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/payment-stats', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount_cents END), 0) / 100.0 as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'succeeded' AND paid_at > NOW() - INTERVAL '30 days' THEN amount_cents END), 0) / 100.0 as revenue_last_30_days,
        COALESCE(SUM(CASE WHEN status = 'succeeded' AND paid_at > NOW() - INTERVAL '7 days' THEN amount_cents END), 0) / 100.0 as revenue_last_7_days
      FROM payments
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/churn', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        DATE_TRUNC('month', canceled_at)::date as month,
        COUNT(*) as churned_count
      FROM subscriptions
      WHERE canceled_at IS NOT NULL
      GROUP BY DATE_TRUNC('month', canceled_at)
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscriptions growth over time
router.get('/subscriptions/growth', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as count,
        COUNT(CASE WHEN status IN ('active', 'trialing') THEN 1 END) as active_count,
        SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('day', created_at)) as cumulative
      FROM subscriptions
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Subscriptions by status
router.get('/subscriptions/by-status', async (req, res) => {
  try {
    const result = await db.billing.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY status
      ORDER BY count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// BILLING AUDIT LOGS
// =============================================================================

// Get all audit logs with pagination and filters
router.get('/audit-logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const action = req.query.action;
    const resource = req.query.resource;
    const days = parseInt(req.query.days) || 30;

    let whereClause = `WHERE created_at >= NOW() - INTERVAL '${days} days'`;
    if (action) {
      whereClause += ` AND action = '${action}'`;
    }
    if (resource) {
      whereClause += ` AND resource = '${resource}'`;
    }

    const countResult = await db.billing.query(`
      SELECT COUNT(*) as total FROM audit_logs ${whereClause}
    `);

    const result = await db.billing.query(`
      SELECT
        id,
        project_id,
        action,
        resource,
        resource_id,
        resource_name,
        admin_user_id,
        admin_user_email,
        ip_address,
        user_agent,
        previous_values,
        new_values,
        metadata,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get audit logs summary (actions count by type)
router.get('/audit-logs/summary', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const result = await db.billing.query(`
      SELECT
        action,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC
    `);

    const byResource = await db.billing.query(`
      SELECT
        resource,
        COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY resource
      ORDER BY count DESC
    `);

    res.json({
      byAction: result.rows,
      byResource: byResource.rows,
      period: `${days} days`
    });
  } catch (err) {
    console.error('Error fetching audit summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get critical actions (DELETE, REVOKE, etc.)
router.get('/audit-logs/critical', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await db.billing.query(`
      SELECT
        id,
        project_id,
        action,
        resource,
        resource_id,
        resource_name,
        admin_user_id,
        admin_user_email,
        ip_address,
        previous_values,
        new_values,
        created_at
      FROM audit_logs
      WHERE action IN ('DELETE', 'REVOKE', 'CANCEL', 'DEACTIVATE')
        AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching critical actions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get admin sessions (LOGIN/LOGOUT activity)
router.get('/sessions', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const result = await db.billing.query(`
      SELECT
        id,
        admin_user_id,
        admin_user_email,
        action,
        ip_address,
        user_agent,
        metadata,
        created_at
      FROM audit_logs
      WHERE action IN ('LOGIN', 'LOGOUT', 'LOGIN_NEW_DEVICE')
        AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
      LIMIT 100
    `);

    // Get unique active admins (with recent activity)
    const activeAdmins = await db.billing.query(`
      SELECT DISTINCT ON (admin_user_email)
        admin_user_email,
        admin_user_id,
        ip_address,
        user_agent,
        created_at as last_activity
      FROM audit_logs
      WHERE admin_user_email IS NOT NULL
        AND created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY admin_user_email, created_at DESC
    `);

    res.json({
      sessions: result.rows,
      activeAdmins: activeAdmins.rows,
      period: `${days} days`
    });
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get activity per day for chart
router.get('/audit-logs/per-day', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const result = await db.billing.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN action = 'CREATE' THEN 1 END) as creates,
        COUNT(CASE WHEN action = 'UPDATE' THEN 1 END) as updates,
        COUNT(CASE WHEN action IN ('DELETE', 'REVOKE', 'CANCEL') THEN 1 END) as critical
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    // Fill missing days with zeros
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const found = result.rows.find(r => r.date && r.date.toISOString().split('T')[0] === dateStr);
      data.push({
        date: dateStr,
        total: found ? parseInt(found.total) : 0,
        creates: found ? parseInt(found.creates) : 0,
        updates: found ? parseInt(found.updates) : 0,
        critical: found ? parseInt(found.critical) : 0
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching audit per day:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
