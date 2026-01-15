import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3333;

// Senha do dashboard via variavel de ambiente (Amplify)
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD;
const SECRET_ROUTE = '/8a9sud89aus8d';

// =============================================================================
// UMAMI ANALYTICS CONFIG
// =============================================================================
const UMAMI_CONFIG = {
  baseUrl: 'https://api.umami.is/v1',
  tokens: {
    // Token para security, auth, billing
    main: 'api_qEPOgaHG9K7EeZjgUZiVyvtkYpaADJST',
    // Token para oentregador
    oentregador: 'api_wEDDdI2afGuX3dmR2YQf2Bd34ud58fW4'
  },
  websites: {
    security: 'adecb5b8-60e1-448b-ab8c-aad0350dc2a2',
    auth: '032c4869-3301-4d7d-869a-2e898f1f49c7',
    billing: '2a708d6c-43ed-439e-af48-60a2c3e82f38',
    oentregador: 'c0ec15e8-98a1-4615-b586-5de88b65eba5'
  }
};

// Fetch visitors from Umami for a specific website
async function getUmamiVisitors(websiteId, token, startDate, endDate) {
  try {
    const startAt = new Date(startDate).getTime();
    const endAt = new Date(endDate).getTime();

    const url = `${UMAMI_CONFIG.baseUrl}/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`;
    console.log(`[Umami] Fetching: ${url.substring(0, 80)}...`);

    const response = await fetch(url, {
      headers: {
        'x-umami-api-key': token,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Umami] API error ${response.status}: ${errorText}`);
      return { visitors: 0, pageviews: 0, error: `${response.status}: ${errorText}` };
    }

    const data = await response.json();
    console.log(`[Umami] Response for ${websiteId}:`, JSON.stringify(data).substring(0, 200));

    return {
      visitors: typeof data.visitors === 'number' ? data.visitors : (data.visitors?.value || 0),
      pageviews: typeof data.pageviews === 'number' ? data.pageviews : (data.pageviews?.value || 0)
    };
  } catch (err) {
    console.error('[Umami] Fetch error:', err.message);
    return { visitors: 0, pageviews: 0, error: err.message };
  }
}

// Get total visitors across all websites
async function getTotalVisitors(startDate, endDate) {
  const results = await Promise.all([
    getUmamiVisitors(UMAMI_CONFIG.websites.auth, UMAMI_CONFIG.tokens.main, startDate, endDate),
    getUmamiVisitors(UMAMI_CONFIG.websites.billing, UMAMI_CONFIG.tokens.main, startDate, endDate),
    getUmamiVisitors(UMAMI_CONFIG.websites.security, UMAMI_CONFIG.tokens.main, startDate, endDate),
    getUmamiVisitors(UMAMI_CONFIG.websites.oentregador, UMAMI_CONFIG.tokens.oentregador, startDate, endDate)
  ]);

  return {
    visitors: results.reduce((sum, r) => sum + r.visitors, 0),
    pageviews: results.reduce((sum, r) => sum + r.pageviews, 0),
    byProject: {
      auth: results[0],
      billing: results[1],
      security: results[2],
      oentregador: results[3]
    }
  };
}

app.use(cors({
  origin: ['https://www.ohanax.com', 'https://ohanax.com', 'http://localhost:3333'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =============================================================================
// AUTENTICACAO DO DASHBOARD
// =============================================================================

// Middleware de autenticacao para o dashboard
function authMiddleware(req, res, next) {
  const authToken = req.cookies?.dashboard_auth;

  if (authToken === DASHBOARD_PASSWORD) {
    return next();
  }

  // Retorna pagina de login
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Access</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0f172a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-box {
          background: #1e293b;
          padding: 40px;
          border-radius: 12px;
          border: 1px solid #334155;
          width: 100%;
          max-width: 400px;
        }
        h1 {
          color: #f1f5f9;
          font-size: 24px;
          margin-bottom: 30px;
          text-align: center;
        }
        input {
          width: 100%;
          padding: 14px 16px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #f1f5f9;
          font-size: 16px;
          margin-bottom: 20px;
        }
        input:focus {
          outline: none;
          border-color: #3b82f6;
        }
        button {
          width: 100%;
          padding: 14px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        button:hover { background: #2563eb; }
        .error {
          color: #f87171;
          text-align: center;
          margin-bottom: 20px;
          display: ${req.query.error ? 'block' : 'none'};
        }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>Admin Dashboard</h1>
        <p class="error">Senha incorreta</p>
        <form method="POST" action="${SECRET_ROUTE}/login">
          <input type="password" name="password" placeholder="Senha" autofocus required>
          <button type="submit">Entrar</button>
        </form>
      </div>
    </body>
    </html>
  `);
}

// Rota de login
app.post(`${SECRET_ROUTE}/login`, (req, res) => {
  const { password } = req.body;

  if (password === DASHBOARD_PASSWORD) {
    // Cookie seguro, expira em 30 dias
    res.cookie('dashboard_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      sameSite: 'strict'
    });
    return res.redirect(SECRET_ROUTE);
  }

  res.redirect(`${SECRET_ROUTE}?error=1`);
});

// Logout
app.get(`${SECRET_ROUTE}/logout`, (req, res) => {
  res.clearCookie('dashboard_auth');
  res.redirect(SECRET_ROUTE);
});

// =============================================================================
// DASHBOARD STATIC FILES (protegido por autenticacao)
// =============================================================================

app.use(SECRET_ROUTE, authMiddleware, express.static(join(__dirname, '8a9sud89aus8d')));

// =============================================================================
// AUTH SERVICE METRICS
// =============================================================================

app.get('/api/auth/users', async (req, res) => {
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

app.get('/api/auth/users/list', async (req, res) => {
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

app.get('/api/auth/projects', async (req, res) => {
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

app.get('/api/auth/users/growth', async (req, res) => {
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
// BILLING SERVICE METRICS - FIXED MRR CALCULATION
// =============================================================================

// MRR calculado pelo preco do plano (nao pelo current_mrr_cents que esta zerado)
app.get('/api/billing/metrics', async (req, res) => {
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

app.get('/api/billing/mrr-by-project', async (req, res) => {
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

app.get('/api/billing/subscribers', async (req, res) => {
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

app.get('/api/billing/paying-users', async (req, res) => {
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

app.get('/api/billing/plans', async (req, res) => {
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

app.get('/api/billing/payments', async (req, res) => {
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

app.get('/api/billing/payment-stats', async (req, res) => {
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

app.get('/api/billing/churn', async (req, res) => {
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
app.get('/api/billing/subscriptions/growth', async (req, res) => {
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
app.get('/api/billing/subscriptions/by-status', async (req, res) => {
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
// SECURITY SERVICE METRICS
// =============================================================================

app.get('/api/security/stats', async (req, res) => {
  try {
    const result = await db.security.query(`
      SELECT
        COUNT(*) as total_audits,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as audits_last_30_days
      FROM security_audit_reports
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Scan stats: total scans vs paid scans
app.get('/api/security/scan-stats', async (req, res) => {
  try {
    // Total scans from security database
    const totalScans = await db.security.query(`
      SELECT COUNT(*) as total FROM security_audit_reports
    `);

    // Trial scans (free)
    const trialScans = await db.security.query(`
      SELECT COUNT(*) as total FROM security_trial_sessions
    `);

    // Paid users (active subscriptions for security-audit)
    const paidUsers = await db.billing.query(`
      SELECT DISTINCT s.external_user_id
      FROM subscriptions s
      JOIN projects p ON s.project_id = p.id
      WHERE p.name = 'security-audit' AND s.status = 'active'
    `);
    const paidUserIds = paidUsers.rows.map(r => r.external_user_id);

    // Get scans from paid users
    let paidScans = 0;
    if (paidUserIds.length > 0) {
      const paidScansResult = await db.security.query(`
        SELECT COUNT(*) as total
        FROM security_audit_reports sar
        JOIN security_projects sp ON sar.project_id = sp.id
        WHERE sp.owner_id = ANY($1::uuid[])
      `, [paidUserIds]);
      paidScans = parseInt(paidScansResult.rows[0].total) || 0;
    }

    const total = parseInt(totalScans.rows[0].total) || 0;
    const trials = parseInt(trialScans.rows[0].total) || 0;

    res.json({
      total_scans: total,
      trial_scans: trials,
      paid_scans: paidScans,
      free_scans: total - paidScans
    });
  } catch (err) {
    console.error('Error in scan-stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Scans per day (last 30 days)
app.get('/api/security/scans-per-day', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await db.security.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as scans,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM security_audit_reports
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

      const found = result.rows.find(r => r.date.toISOString().split('T')[0] === dateStr);
      data.push({
        date: dateStr,
        scans: found ? parseInt(found.scans) : 0,
        completed: found ? parseInt(found.completed) : 0,
        failed: found ? parseInt(found.failed) : 0
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Error in scans-per-day:', err);
    res.status(500).json({ error: err.message });
  }
});

// Today's scans with user info
app.get('/api/security/today', async (req, res) => {
  try {
    // Get scans from today with project and user info
    const result = await db.security.query(`
      SELECT
        sar.id,
        sar.status,
        sar.created_at,
        sar.started_at,
        sar.completed_at,
        sar.triggered_by,
        sp.name as project_name,
        sp.frontend_url as project_url,
        sau.email as user_email,
        sau.name as user_name
      FROM security_audit_reports sar
      LEFT JOIN security_projects sp ON sar.project_id = sp.id
      LEFT JOIN security_admin_users sau ON sp.owner_id = sau.id
      WHERE sar.created_at >= CURRENT_DATE
      ORDER BY sar.created_at DESC
    `);

    // Count by user
    const byUser = await db.security.query(`
      SELECT
        sau.email as user_email,
        sau.name as user_name,
        COUNT(*) as count
      FROM security_audit_reports sar
      LEFT JOIN security_projects sp ON sar.project_id = sp.id
      LEFT JOIN security_admin_users sau ON sp.owner_id = sau.id
      WHERE sar.created_at >= CURRENT_DATE
      GROUP BY sau.email, sau.name
      ORDER BY count DESC
    `);

    res.json({
      totalToday: result.rows.length,
      scans: result.rows,
      byUser: byUser.rows
    });
  } catch (err) {
    console.error('Error in security today:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/security/vulnerabilities', async (req, res) => {
  try {
    const result = await db.security.query(`
      SELECT
        severity,
        COUNT(*) as count,
        test_category
      FROM security_audit_results
      WHERE status = 'failed' AND severity IS NOT NULL
      GROUP BY severity, test_category
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/security/trials', async (req, res) => {
  try {
    const result = await db.security.query(`
      SELECT
        id,
        email,
        frontend_url,
        project_name,
        status,
        created_at
      FROM security_trial_sessions
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activity logs - recent activities
app.get('/api/security/activity', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const action = req.query.action;
    const resourceType = req.query.resourceType;
    const userId = req.query.userId;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (action) {
      whereClause += ` AND action = $${paramIndex++}`;
      params.push(action);
    }
    if (resourceType) {
      whereClause += ` AND resource_type = $${paramIndex++}`;
      params.push(resourceType);
    }
    if (userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    const result = await db.security.query(`
      SELECT
        sal.id,
        sal.user_id,
        sal.user_email,
        sal.action,
        sal.resource_type,
        sal.resource_id,
        sal.resource_name,
        sal.ip_address,
        sal.success,
        sal.error_message,
        sal.metadata,
        sal.created_at,
        sau.name as user_name
      FROM security_activity_logs sal
      LEFT JOIN security_admin_users sau ON sal.user_id = sau.id
      ${whereClause}
      ORDER BY sal.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `, [...params, limit, offset]);

    const countResult = await db.security.query(`
      SELECT COUNT(*) as total
      FROM security_activity_logs sal
      ${whereClause}
    `, params);

    res.json({
      data: result.rows,
      meta: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      }
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Activity stats
app.get('/api/security/activity/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Count by action
    const byAction = await db.security.query(`
      SELECT action, COUNT(*) as count
      FROM security_activity_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC
    `);

    // Count by resource type
    const byResource = await db.security.query(`
      SELECT resource_type, COUNT(*) as count
      FROM security_activity_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY resource_type
      ORDER BY count DESC
    `);

    // Count by user
    const byUser = await db.security.query(`
      SELECT
        user_email,
        COUNT(*) as count
      FROM security_activity_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days' AND user_email IS NOT NULL
      GROUP BY user_email
      ORDER BY count DESC
      LIMIT 20
    `);

    // Total stats
    const totals = await db.security.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN success = false THEN 1 END) as failed,
        COUNT(CASE WHEN action = 'login' THEN 1 END) as logins,
        COUNT(CASE WHEN action = 'login_failed' THEN 1 END) as failed_logins,
        COUNT(CASE WHEN action = 'scan_start' THEN 1 END) as scans_started
      FROM security_activity_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `);

    res.json({
      totals: totals.rows[0],
      byAction: byAction.rows,
      byResource: byResource.rows,
      byUser: byUser.rows,
      period: `${days} days`
    });
  } catch (err) {
    console.error('Error fetching activity stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Activity per day (for charts)
app.get('/api/security/activity/per-day', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const result = await db.security.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(CASE WHEN action = 'login' THEN 1 END) as logins,
        COUNT(CASE WHEN action = 'scan_start' THEN 1 END) as scans,
        COUNT(CASE WHEN success = false THEN 1 END) as failed
      FROM security_activity_logs
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
        logins: found ? parseInt(found.logins) : 0,
        scans: found ? parseInt(found.scans) : 0,
        failed: found ? parseInt(found.failed) : 0
      });
    }

    res.json(data);
  } catch (err) {
    console.error('Error fetching activity per day:', err);
    res.status(500).json({ error: err.message });
  }
});

// Failed logins (security monitoring)
app.get('/api/security/activity/failed-logins', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;

    const result = await db.security.query(`
      SELECT
        user_email,
        ip_address,
        error_message,
        created_at
      FROM security_activity_logs
      WHERE action = 'login_failed'
        AND created_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY created_at DESC
      LIMIT 100
    `);

    // Group by IP
    const byIp = await db.security.query(`
      SELECT
        ip_address,
        COUNT(*) as attempts,
        array_agg(DISTINCT user_email) as emails
      FROM security_activity_logs
      WHERE action = 'login_failed'
        AND created_at >= NOW() - INTERVAL '${hours} hours'
      GROUP BY ip_address
      HAVING COUNT(*) >= 3
      ORDER BY attempts DESC
    `);

    res.json({
      recent: result.rows,
      suspiciousIps: byIp.rows,
      period: `${hours} hours`
    });
  } catch (err) {
    console.error('Error fetching failed logins:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// O ENTREGADOR METRICS (MongoDB)
// =============================================================================

app.get('/api/oentregador/users', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const users = mongoDB.collection('app_users');

    const total = await users.countDocuments();
    const active = await users.countDocuments({ isActive: true });
    const admins = await users.countDocuments({ userRole: 'admin' });
    const regularUsers = await users.countDocuments({ userRole: 'user' });
    const verified = await users.countDocuments({ isStep01VerifyEmailCompleted: true });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newLast30Days = await users.countDocuments({
      userCreatedAt: { $gte: thirtyDaysAgo }
    });

    // Companies count
    const companies = mongoDB.collection('app_companies');
    const totalCompanies = await companies.countDocuments();
    const activeCompanies = await companies.countDocuments({ companyStatus: 'active' });

    res.json({ total, active, admins, regularUsers, verified, newLast30Days, totalCompanies, activeCompanies });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.status(500).json({ error: err.message, total: 0, active: 0, admins: 0, regularUsers: 0, verified: 0, newLast30Days: 0, totalCompanies: 0, activeCompanies: 0 });
  }
});

app.get('/api/oentregador/users/list', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const users = mongoDB.collection('app_users');

    const userList = await users.find({}, {
      projection: {
        userName: 1,
        userEmail: 1,
        userRole: 1,
        isActive: 1,
        userCreatedAt: 1,
        isStep01VerifyEmailCompleted: 1
      }
    }).sort({ userCreatedAt: -1 }).limit(100).toArray();

    res.json(userList);
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json([]);
  }
});

app.get('/api/oentregador/companies', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const companies = mongoDB.collection('app_companies');
    const companyList = await companies.find({}, {
      projection: {
        companyName: 1,
        companyCnpj: 1,
        companyStatus: 1,
        companyCreatedAt: 1
      }
    }).sort({ companyCreatedAt: -1 }).toArray();
    res.json(companyList);
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json([]);
  }
});

app.get('/api/oentregador/drivers', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const drivers = mongoDB.collection('delivery_drivers');

    const stats = await drivers.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalPackages: { $sum: '$stats.totalPackages' },
          completedPackages: { $sum: '$stats.completedPackages' },
          avgCompletionRate: { $avg: '$stats.completionRate' }
        }
      }
    ]).toArray();

    res.json(stats[0] || { total: 0, totalPackages: 0, completedPackages: 0, avgCompletionRate: 0 });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json({ total: 0, totalPackages: 0, completedPackages: 0, avgCompletionRate: 0 });
  }
});

app.get('/api/oentregador/batches', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const batches = mongoDB.collection('delivery_batches');

    const stats = await batches.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: '$appStatus',
          count: { $sum: 1 },
          totalPackages: { $sum: '$appTotalPackages' },
          completedPackages: { $sum: '$appCompletedPackages' }
        }
      }
    ]).toArray();

    const total = await batches.countDocuments({ deletedAt: null });

    res.json({ total, byStatus: stats });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json({ total: 0, byStatus: [] });
  }
});

app.get('/api/oentregador/packages', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const packages = mongoDB.collection('delivery_packages');

    const stats = await packages.aggregate([
      {
        $group: {
          _id: '$appStatus',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const total = await packages.countDocuments();

    res.json({ total, byStatus: stats });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.json({ total: 0, byStatus: [] });
  }
});

// Today's activity: users who logged in + items bipados
app.get('/api/oentregador/today', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const users = mongoDB.collection('app_users');
    const packages = mongoDB.collection('delivery_packages');

    // Start of today (UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Users active today (based on userLastLoginAt)
    const activeUsersToday = await users.find({
      userLastLoginAt: { $gte: today }
    }).project({
      userName: 1,
      userEmail: 1,
      userLastLoginAt: 1
    }).sort({ userLastLoginAt: -1 }).toArray();

    // Items bipados today (conferenceAt is when they were scanned)
    // Includes both 'checked' (ok) and 'wrong_batch' (divergência/pendência)
    const bipadosToday = await packages.countDocuments({
      conferenceStatus: { $in: ['checked', 'wrong_batch'] },
      conferenceAt: { $gte: today }
    });

    // Get bipados by user today
    const bipadosByUser = await packages.aggregate([
      {
        $match: {
          conferenceStatus: { $in: ['checked', 'wrong_batch'] },
          conferenceAt: { $gte: today }
        }
      },
      {
        $group: {
          _id: '$conferenceUserName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    res.json({
      activeUsers: activeUsersToday.length,
      activeUsersList: activeUsersToday.slice(0, 20),
      bipadosToday: bipadosToday,
      bipadosByUser: bipadosByUser
    });
  } catch (err) {
    console.error('MongoDB error in today stats:', err);
    res.json({ activeUsers: 0, activeUsersList: [], bipadosToday: 0, bipadosByUser: [] });
  }
});

// Bipados per day (last 30 days)
app.get('/api/oentregador/bipados-per-day', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const packages = mongoDB.collection('delivery_packages');

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate bipados by day (conferenceAt when status != pending)
    const result = await packages.aggregate([
      {
        $match: {
          conferenceStatus: { $in: ['checked', 'wrong_batch'] },
          conferenceAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$conferenceAt' }
          },
          total: { $sum: 1 },
          checked: {
            $sum: { $cond: [{ $eq: ['$conferenceStatus', 'checked'] }, 1, 0] }
          },
          wrong_batch: {
            $sum: { $cond: [{ $eq: ['$conferenceStatus', 'wrong_batch'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();

    // Fill missing days with zeros
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const found = result.find(r => r._id === dateStr);
      data.push({
        date: dateStr,
        total: found ? found.total : 0,
        checked: found ? found.checked : 0,
        wrong_batch: found ? found.wrong_batch : 0
      });
    }

    res.json(data);
  } catch (err) {
    console.error('MongoDB error in bipados-per-day:', err);
    res.json([]);
  }
});

// =============================================================================
// COMBINED DASHBOARD
// =============================================================================

app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const authResult = await db.auth.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
      FROM users
    `);

    const billingResult = await db.billing.query(`
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
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as paying_customers
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
    `);

    const securityResult = await db.security.query(`
      SELECT COUNT(*) as total_audits FROM security_audit_reports
    `);

    let oentregadorUsers = 0;
    let oentregadorCompanies = 0;
    try {
      const mongoDB = await db.mongo();
      const users = mongoDB.collection('app_users');
      const companies = mongoDB.collection('app_companies');
      oentregadorUsers = await users.countDocuments();
      oentregadorCompanies = await companies.countDocuments();
    } catch (e) {
      console.error('MongoDB error in summary:', e.message);
    }

    res.json({
      auth: authResult.rows[0],
      billing: billingResult.rows[0],
      security: securityResult.rows[0],
      oentregador: { total_users: oentregadorUsers, total_companies: oentregadorCompanies }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// USERS METRICS PAGE (all services combined)
// =============================================================================

app.get('/api/metrics/users', async (req, res) => {
  try {
    // Auth users
    const authUsers = await db.auth.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_30d,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_7d,
        COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as new_today,
        COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_30d,
        COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d
      FROM users
    `);

    // Auth users by project
    const authByProject = await db.auth.query(`
      SELECT
        p.name as project_name,
        COUNT(u.id) as total_users,
        COUNT(CASE WHEN u.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_30d
      FROM projects p
      LEFT JOIN users u ON u.project_id = p.id
      GROUP BY p.id, p.name
      ORDER BY total_users DESC
    `);

    // Auth growth
    const authGrowth = await db.auth.query(`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as count
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);

    // oEntregador users
    let oeUsers = { total: 0, active: 0, new_30d: 0, companies: 0 };
    try {
      const mongoDB = await db.mongo();
      const users = mongoDB.collection('app_users');
      const companies = mongoDB.collection('app_companies');
      oeUsers.total = await users.countDocuments();
      oeUsers.active = await users.countDocuments({ isActive: true });
      oeUsers.companies = await companies.countDocuments();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      oeUsers.new_30d = await users.countDocuments({ userCreatedAt: { $gte: thirtyDaysAgo } });
    } catch (e) {
      console.error('MongoDB error:', e.message);
    }

    res.json({
      auth: authUsers.rows[0],
      authByProject: authByProject.rows,
      authGrowth: authGrowth.rows,
      oentregador: oeUsers,
      combined: {
        total: parseInt(authUsers.rows[0].total) + oeUsers.total,
        new_30d: parseInt(authUsers.rows[0].new_30d) + oeUsers.new_30d
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// SUBSCRIPTIONS METRICS PAGE
// =============================================================================

app.get('/api/metrics/subscriptions', async (req, res) => {
  try {
    // General stats
    const stats = await db.billing.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'trialing' THEN 1 END) as trialing,
        COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled,
        COUNT(CASE WHEN status = 'past_due' THEN 1 END) as past_due,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_30d,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_7d,
        COUNT(CASE WHEN created_at::date = CURRENT_DATE THEN 1 END) as new_today
      FROM subscriptions
    `);

    // MRR calculation
    const mrr = await db.billing.query(`
      SELECT
        COALESCE(SUM(
          CASE pl.interval
            WHEN 'monthly' THEN pl.price_cents
            WHEN 'yearly' THEN pl.price_cents / 12
            WHEN 'weekly' THEN pl.price_cents * 4
            ELSE pl.price_cents
          END
        ), 0) / 100.0 as mrr
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      WHERE s.status = 'active'
    `);

    // By project
    const byProject = await db.billing.query(`
      SELECT
        p.name as project_name,
        COUNT(s.id) as total,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active,
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
        ), 0) / 100.0 as mrr
      FROM projects p
      LEFT JOIN subscriptions s ON s.project_id = p.id
      LEFT JOIN plans pl ON s.plan_id = pl.id
      GROUP BY p.id, p.name
      ORDER BY mrr DESC
    `);

    // By plan
    const byPlan = await db.billing.query(`
      SELECT
        pl.name as plan_name,
        pl.price_cents / 100.0 as price,
        pl.interval,
        p.name as project_name,
        COUNT(s.id) as total,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active
      FROM plans pl
      LEFT JOIN subscriptions s ON s.plan_id = pl.id
      LEFT JOIN projects p ON pl.project_id = p.id
      GROUP BY pl.id, p.name
      ORDER BY active DESC
    `);

    // Growth
    const growth = await db.billing.query(`
      SELECT
        DATE_TRUNC('day', created_at)::date as date,
        COUNT(*) as total,
        COUNT(CASE WHEN status IN ('active', 'trialing') THEN 1 END) as active
      FROM subscriptions
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date
    `);

    // Recent subscribers
    const recent = await db.billing.query(`
      SELECT
        s.external_user_email as email,
        s.status,
        pl.name as plan_name,
        pl.price_cents / 100.0 as price,
        p.name as project_name,
        s.created_at
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.created_at DESC
      LIMIT 20
    `);

    res.json({
      stats: stats.rows[0],
      mrr: parseFloat(mrr.rows[0].mrr),
      arr: parseFloat(mrr.rows[0].mrr) * 12,
      byProject: byProject.rows,
      byPlan: byPlan.rows,
      growth: growth.rows,
      recent: recent.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// STANDARDIZED PROJECT ENDPOINTS
// =============================================================================

// Mapeamento de nomes de projeto no frontend para nomes no banco billing
const projectNameMapping = {
  'auth': 'app-auth',
  'billing': 'app-billing',
  'security': 'security-audit',
  'oentregador': 'app-oentregador'
};

// GET /api/overview - Dados gerais para a pagina Overview
app.get('/api/overview', async (req, res) => {
  try {
    // Total MRR e assinantes ativos (todos os projetos)
    const billingMetrics = await db.billing.query(`
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
        ), 0) / 100.0 as total_mrr,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as total_active_subs
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
    `);

    // Total usuarios do auth
    const authUsers = await db.auth.query(`SELECT COUNT(*) as total FROM users`);

    // Usuarios do oEntregador (MongoDB)
    let oentregadorUsers = 0;
    try {
      const mongoDB = await db.mongo();
      oentregadorUsers = await mongoDB.collection('app_users').countDocuments();
    } catch (e) { console.error('MongoDB error:', e.message); }

    // Usuarios por projeto - buscar do billing (exceto Teste)
    const projectsFromBilling = await db.billing.query(`SELECT id, name FROM projects WHERE name != 'Teste'`);

    // Para cada projeto, buscar quantidade de usuarios no auth
    const usersByProjectData = [];
    for (const proj of projectsFromBilling.rows) {
      // Se for app-oentregador, usar contagem do MongoDB
      if (proj.name === 'app-oentregador') {
        usersByProjectData.push({
          project_name: proj.name,
          total_users: oentregadorUsers
        });
        continue;
      }

      const authUsers = await db.auth.query(`
        SELECT COUNT(*) as total
        FROM users u
        JOIN projects p ON u.project_id = p.id
        WHERE p.name = $1
      `, [proj.name]);

      usersByProjectData.push({
        project_name: proj.name,
        total_users: parseInt(authUsers.rows[0]?.total || 0)
      });
    }

    // Ordenar por total_users
    usersByProjectData.sort((a, b) => b.total_users - a.total_users);

    const usersByProject = { rows: usersByProjectData };

    // MRR por projeto
    const mrrByProject = await db.billing.query(`
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
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subs
      FROM projects p
      LEFT JOIN subscriptions s ON s.project_id = p.id
      LEFT JOIN plans pl ON s.plan_id = pl.id
      GROUP BY p.id, p.name
      ORDER BY mrr DESC
    `);

    // Ultimos assinantes
    const recentSubscribers = await db.billing.query(`
      SELECT
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
        s.created_at
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    // One-time purchases totais e por projeto
    const oneTimeTotal = await db.billing.query(`
      SELECT
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as total_paid,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents END), 0) / 100.0 as total_revenue
      FROM one_time_purchases
    `);

    const oneTimeByProject = await db.billing.query(`
      SELECT
        p.name as project_name,
        COUNT(CASE WHEN otp.status = 'paid' THEN 1 END) as paid_purchases,
        COALESCE(SUM(CASE WHEN otp.status = 'paid' THEN otp.amount_cents END), 0) / 100.0 as revenue
      FROM projects p
      LEFT JOIN one_time_purchases otp ON otp.project_id = p.id
      GROUP BY p.id, p.name
      HAVING COUNT(CASE WHEN otp.status = 'paid' THEN 1 END) > 0
      ORDER BY revenue DESC
    `);

    // Subscribers by status for the radial chart
    const subsByStatus = await db.billing.query(`
      SELECT
        status,
        COUNT(*) as count
      FROM subscriptions
      GROUP BY status
      ORDER BY count DESC
    `);

    const totalMrr = parseFloat(billingMetrics.rows[0].total_mrr) || 0;
    const totalOneTimeRevenue = parseFloat(oneTimeTotal.rows[0].total_revenue) || 0;

    res.json({
      totalMrr: totalMrr,
      totalOneTimeRevenue: totalOneTimeRevenue,
      totalRevenue: totalMrr + totalOneTimeRevenue,
      totalUsers: parseInt(authUsers.rows[0].total) + oentregadorUsers,
      totalActiveSubs: parseInt(billingMetrics.rows[0].total_active_subs),
      totalPaidPurchases: parseInt(oneTimeTotal.rows[0].total_paid) || 0,
      usersByProject: usersByProject.rows,
      mrrByProject: mrrByProject.rows,
      oneTimeByProject: oneTimeByProject.rows,
      recentSubscribers: recentSubscribers.rows,
      subsByStatus: subsByStatus.rows
    });
  } catch (err) {
    console.error('Error in /api/overview:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funnel - Dados do funil de conversao (todos os apps ou filtrado por projeto)
app.get('/api/funnel', async (req, res) => {
  const project = req.query.project; // opcional: 'auth', 'billing', 'security', 'oentregador'
  const billingProjectName = project ? projectNameMapping[project] : null;

  try {
    let registeredUsers = 0;

    // Usuarios cadastrados (auth database)
    if (!project || project !== 'oentregador') {
      const authProjectName = project === 'auth' ? 'app-auth' :
                              project === 'billing' ? 'app-billing' :
                              project === 'security' ? 'security-audit' : null;

      const authUsers = await db.auth.query(`
        SELECT COUNT(*) as total
        FROM users u
        LEFT JOIN projects p ON u.project_id = p.id
        ${authProjectName ? `WHERE p.name = '${authProjectName}'` : ''}
      `);
      registeredUsers += parseInt(authUsers.rows[0].total) || 0;
    }

    // Usuarios oEntregador (MongoDB)
    if (!project || project === 'oentregador') {
      try {
        const mongoDB = await db.mongo();
        const oeUsers = await mongoDB.collection('app_users').countDocuments();
        registeredUsers += oeUsers;
      } catch (e) { console.error('MongoDB error:', e.message); }
    }

    // Trial subscriptions
    const trialQuery = billingProjectName
      ? `SELECT COUNT(*) as total FROM subscriptions s JOIN projects p ON s.project_id = p.id WHERE s.status = 'trialing' AND p.name = $1`
      : `SELECT COUNT(*) as total FROM subscriptions WHERE status = 'trialing'`;
    const trialResult = billingProjectName
      ? await db.billing.query(trialQuery, [billingProjectName])
      : await db.billing.query(trialQuery);
    const trialUsers = parseInt(trialResult.rows[0].total) || 0;

    // Paying users (active subscriptions)
    const payingQuery = billingProjectName
      ? `SELECT COUNT(*) as total FROM subscriptions s JOIN projects p ON s.project_id = p.id WHERE s.status = 'active' AND p.name = $1`
      : `SELECT COUNT(*) as total FROM subscriptions WHERE status = 'active'`;
    const payingResult = billingProjectName
      ? await db.billing.query(payingQuery, [billingProjectName])
      : await db.billing.query(payingQuery);
    const payingUsers = parseInt(payingResult.rows[0].total) || 0;

    // One-time purchases (paid)
    const purchasesQuery = billingProjectName
      ? `SELECT COUNT(DISTINCT external_user_email) as total FROM one_time_purchases otp JOIN projects p ON otp.project_id = p.id WHERE otp.status = 'paid' AND p.name = $1`
      : `SELECT COUNT(DISTINCT external_user_email) as total FROM one_time_purchases WHERE status = 'paid'`;
    const purchasesResult = billingProjectName
      ? await db.billing.query(purchasesQuery, [billingProjectName])
      : await db.billing.query(purchasesQuery);
    const oneTimeBuyers = parseInt(purchasesResult.rows[0].total) || 0;

    // Total pagantes = assinantes ativos + compradores one-time (unique)
    const totalPaying = payingUsers + oneTimeBuyers;

    // Get visitors from Umami (last 90 days for all-time funnel view)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    let visitors = 0;
    let visitorsByProject = {};

    if (project) {
      // Single project
      const websiteId = UMAMI_CONFIG.websites[project];
      const token = project === 'oentregador' ? UMAMI_CONFIG.tokens.oentregador : UMAMI_CONFIG.tokens.main;
      const umamiData = await getUmamiVisitors(websiteId, token, startDate, endDate);
      visitors = umamiData.visitors;
    } else {
      // All projects
      const umamiData = await getTotalVisitors(startDate, endDate);
      visitors = umamiData.visitors;
      visitorsByProject = umamiData.byProject;
    }

    res.json({
      funnel: [
        { stage: 'Visitantes', count: visitors, color: '#6366f1' },
        { stage: 'Cadastrados', count: registeredUsers, color: '#64748b' },
        { stage: 'Em Trial', count: trialUsers, color: '#f59e0b' },
        { stage: 'Pagantes', count: totalPaying, color: '#22c55e' }
      ],
      details: {
        visitors: visitors,
        registered: registeredUsers,
        trialing: trialUsers,
        paying_subscriptions: payingUsers,
        paying_one_time: oneTimeBuyers,
        total_paying: totalPaying,
        visitors_by_project: visitorsByProject
      },
      conversion: {
        visitor_to_registered: visitors > 0 ? ((registeredUsers / visitors) * 100).toFixed(1) : 0,
        registered_to_trial: registeredUsers > 0 ? ((trialUsers / registeredUsers) * 100).toFixed(1) : 0,
        trial_to_paid: trialUsers > 0 ? ((payingUsers / (trialUsers + payingUsers)) * 100).toFixed(1) : 0,
        registered_to_paid: registeredUsers > 0 ? ((totalPaying / registeredUsers) * 100).toFixed(1) : 0,
        visitor_to_paid: visitors > 0 ? ((totalPaying / visitors) * 100).toFixed(1) : 0
      }
    });
  } catch (err) {
    console.error('Error in /api/funnel:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/project/:project - Dados padronizados para cada projeto
app.get('/api/project/:project', async (req, res) => {
  const project = req.params.project;
  const billingProjectName = projectNameMapping[project];

  try {
    let users = { total: 0, verified: 0, active_7d: 0, new_today: 0, new_30d: 0 };
    let growth = [];

    // Obter dados de usuarios
    if (project === 'oentregador') {
      // MongoDB
      try {
        const mongoDB = await db.mongo();
        const usersCol = mongoDB.collection('app_users');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        users.total = await usersCol.countDocuments();
        users.verified = await usersCol.countDocuments({ isStep01VerifyEmailCompleted: true });
        users.active_7d = await usersCol.countDocuments({
          $or: [
            { userLastLoginAt: { $gte: sevenDaysAgo } },
            { isActive: true }
          ]
        });
        users.new_today = await usersCol.countDocuments({ userCreatedAt: { $gte: today } });
        users.new_30d = await usersCol.countDocuments({ userCreatedAt: { $gte: thirtyDaysAgo } });

        // Growth
        const growthData = await usersCol.aggregate([
          { $match: { userCreatedAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$userCreatedAt" } },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: 1 } }
        ]).toArray();
        growth = growthData.map(g => ({ date: g._id, count: g.count }));
      } catch (e) { console.error('MongoDB error:', e.message); }
    } else {
      // PostgreSQL (auth database)
      const authProjectName = project === 'auth' ? 'app-auth' :
                              project === 'billing' ? 'app-billing' :
                              project === 'security' ? 'security-audit' : null;

      const usersData = await db.auth.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN u.email_verified = true THEN 1 END) as verified,
          COUNT(CASE WHEN u.last_login_at > NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
          COUNT(CASE WHEN u.created_at::date = CURRENT_DATE THEN 1 END) as new_today,
          COUNT(CASE WHEN u.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as new_30d
        FROM users u
        LEFT JOIN projects p ON u.project_id = p.id
        ${authProjectName ? `WHERE p.name = '${authProjectName}'` : ''}
      `);
      users = usersData.rows[0];

      // Growth
      const growthData = await db.auth.query(`
        SELECT
          DATE_TRUNC('day', u.created_at)::date as date,
          COUNT(*) as count
        FROM users u
        LEFT JOIN projects p ON u.project_id = p.id
        WHERE u.created_at > NOW() - INTERVAL '30 days'
        ${authProjectName ? `AND p.name = '${authProjectName}'` : ''}
        GROUP BY DATE_TRUNC('day', u.created_at)
        ORDER BY date
      `);
      growth = growthData.rows;
    }

    // Obter dados de billing (todos os projetos usam o billing database)
    const billingData = await db.billing.query(`
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
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) as trialing,
        COUNT(CASE WHEN s.status = 'canceled' THEN 1 END) as canceled,
        COALESCE((
          SELECT SUM(amount_cents) / 100.0
          FROM payments pay
          JOIN subscriptions sub ON pay.subscription_id = sub.id
          JOIN projects prj ON sub.project_id = prj.id
          WHERE pay.status = 'succeeded' AND prj.name = $1
        ), 0) as subscription_revenue
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE p.name = $1
    `, [billingProjectName]);

    // Obter dados de compras one-time
    const oneTimeData = await db.billing.query(`
      SELECT
        COUNT(*) as total_purchases,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_purchases,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_purchases,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents END), 0) / 100.0 as one_time_revenue
      FROM one_time_purchases otp
      JOIN projects p ON otp.project_id = p.id
      WHERE p.name = $1
    `, [billingProjectName]);

    // Assinantes recentes do projeto
    const subscribers = await db.billing.query(`
      SELECT
        s.external_user_email as email,
        s.status,
        CASE pl.interval
          WHEN 'monthly' THEN pl.price_cents
          WHEN 'yearly' THEN pl.price_cents / 12
          WHEN 'weekly' THEN pl.price_cents * 4
          ELSE pl.price_cents
        END / 100.0 as mrr,
        pl.name as plan_name,
        s.created_at
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE p.name = $1
      ORDER BY s.created_at DESC
      LIMIT 20
    `, [billingProjectName]);

    const subscriptionRevenue = parseFloat(billingData.rows[0].subscription_revenue) || 0;
    const oneTimeRevenue = parseFloat(oneTimeData.rows[0].one_time_revenue) || 0;

    res.json({
      users: {
        total: parseInt(users.total) || 0,
        verified: parseInt(users.verified) || 0,
        active_7d: parseInt(users.active_7d) || 0,
        new_today: parseInt(users.new_today) || 0,
        new_30d: parseInt(users.new_30d) || 0
      },
      billing: {
        mrr: parseFloat(billingData.rows[0].mrr) || 0,
        active: parseInt(billingData.rows[0].active) || 0,
        trialing: parseInt(billingData.rows[0].trialing) || 0,
        canceled: parseInt(billingData.rows[0].canceled) || 0,
        subscription_revenue: subscriptionRevenue,
        one_time_revenue: oneTimeRevenue,
        total_revenue: subscriptionRevenue + oneTimeRevenue
      },
      one_time: {
        total_purchases: parseInt(oneTimeData.rows[0].total_purchases) || 0,
        paid_purchases: parseInt(oneTimeData.rows[0].paid_purchases) || 0,
        pending_purchases: parseInt(oneTimeData.rows[0].pending_purchases) || 0,
        revenue: oneTimeRevenue
      },
      subscribers: subscribers.rows,
      growth: growth
    });
  } catch (err) {
    console.error(`Error in /api/project/${project}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /api/users - Lista completa de usuarios com filtros
// =============================================================================
app.get('/api/users', async (req, res) => {
  const { project, status, plan, search, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    let users = [];
    let total = 0;

    // Get users from auth database
    if (!project || project !== 'oentregador') {
      const authQuery = `
        SELECT
          u.id,
          u.email,
          u.email_verified,
          u.created_at,
          u.last_login_at,
          p.name as project_name
        FROM users u
        LEFT JOIN projects p ON u.project_id = p.id
        WHERE 1=1
        ${project && project !== 'oentregador' ? `AND p.name = '${project}'` : ''}
        ${status === 'verified' ? 'AND u.email_verified = true' : status === 'unverified' ? 'AND u.email_verified = false' : ''}
        ${search ? `AND u.email ILIKE '%${search}%'` : ''}
        ORDER BY u.created_at DESC
      `;

      const authUsers = await db.auth.query(authQuery);

      // Get subscriptions from billing database
      const subsQuery = `
        SELECT
          s.external_user_email as email,
          p.name as project_name,
          s.status,
          pl.name as plan_name,
          CASE pl.interval
            WHEN 'monthly' THEN pl.price_cents
            WHEN 'yearly' THEN pl.price_cents / 12
            WHEN 'weekly' THEN pl.price_cents * 4
            ELSE COALESCE(pl.price_cents, 0)
          END / 100.0 as mrr
        FROM subscriptions s
        LEFT JOIN plans pl ON s.plan_id = pl.id
        LEFT JOIN projects p ON s.project_id = p.id
      `;
      const subsResult = await db.billing.query(subsQuery);

      // Create subscription lookup by email+project
      const subsMap = new Map();
      subsResult.rows.forEach(s => {
        const key = `${s.email}:${s.project_name}`;
        subsMap.set(key, s);
      });

      // Merge users with subscription data
      let mergedUsers = authUsers.rows.map(u => {
        const key = `${u.email}:${u.project_name}`;
        const sub = subsMap.get(key);
        return {
          ...u,
          subscription_status: sub?.status || null,
          plan_name: sub?.plan_name || null,
          mrr: sub?.mrr || 0,
          source: 'auth'
        };
      });

      // Filter by plan status if needed
      if (plan === 'paying') {
        mergedUsers = mergedUsers.filter(u => u.subscription_status === 'active');
      } else if (plan === 'trialing') {
        mergedUsers = mergedUsers.filter(u => u.subscription_status === 'trialing');
      } else if (plan === 'free') {
        mergedUsers = mergedUsers.filter(u => !u.subscription_status);
      }

      total = mergedUsers.length;
      users = mergedUsers.slice(offset, offset + parseInt(limit));
    }

    // Get oEntregador users if needed
    if (!project || project === 'oentregador') {
      try {
        const mongoDB = await db.mongo();
        const mongoQuery = search ? { userEmail: { $regex: search, $options: 'i' } } : {};
        const oeUsers = await mongoDB.collection('app_users')
          .find(mongoQuery)
          .sort({ userCreatedAt: -1 })
          .skip(project === 'oentregador' ? offset : 0)
          .limit(project === 'oentregador' ? parseInt(limit) : 100)
          .toArray();

        const oeCount = await mongoDB.collection('app_users').countDocuments(mongoQuery);

        // Get oEntregador subscriptions from billing database to merge
        const oeEmails = oeUsers.map(u => u.userEmail).filter(Boolean);
        let oeSubsMap = new Map();

        if (oeEmails.length > 0) {
          // Convert emails to lowercase for case-insensitive matching
          const oeEmailsLower = oeEmails.map(e => e.toLowerCase());
          const oeSubsQuery = `
            SELECT
              s.external_user_email as email,
              LOWER(s.external_user_email) as email_lower,
              s.status,
              pl.name as plan_name,
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents
                WHEN 'yearly' THEN pl.price_cents / 12
                WHEN 'weekly' THEN pl.price_cents * 4
                ELSE pl.price_cents
              END / 100.0 as mrr
            FROM subscriptions s
            LEFT JOIN plans pl ON s.plan_id = pl.id
            LEFT JOIN projects p ON s.project_id = p.id
            WHERE p.name = 'app-oentregador'
            AND LOWER(s.external_user_email) = ANY($1)
          `;
          const oeSubs = await db.billing.query(oeSubsQuery, [oeEmailsLower]);
          oeSubs.rows.forEach(sub => {
            oeSubsMap.set(sub.email_lower, sub);
          });
        }

        const mappedOeUsers = oeUsers.map(u => {
          const sub = oeSubsMap.get(u.userEmail?.toLowerCase());
          return {
            id: u._id.toString(),
            email: u.userEmail,
            email_verified: u.isStep01VerifyEmailCompleted || false,
            created_at: u.userCreatedAt,
            last_login_at: u.userLastLoginAt,
            project_name: 'oentregador',
            subscription_status: sub?.status || null,
            plan_name: sub?.plan_name || null,
            mrr: sub?.mrr || 0,
            source: 'oentregador'
          };
        });

        // Apply plan filter for oEntregador
        let filteredOeUsers = mappedOeUsers;
        if (plan === 'paying') {
          filteredOeUsers = mappedOeUsers.filter(u => u.subscription_status === 'active');
        } else if (plan === 'trialing') {
          filteredOeUsers = mappedOeUsers.filter(u => u.subscription_status === 'trialing');
        } else if (plan === 'free') {
          filteredOeUsers = mappedOeUsers.filter(u => !u.subscription_status);
        }

        if (project === 'oentregador') {
          users = filteredOeUsers;
          total = plan ? filteredOeUsers.length : oeCount;
        } else {
          users = [...users, ...filteredOeUsers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, parseInt(limit));
          total += plan ? filteredOeUsers.length : oeCount;
        }
      } catch (e) {
        console.error('MongoDB error:', e.message);
      }
    }

    // Get summary stats
    let stats = { total: 0, verified: 0, with_plan: 0, free: 0 };
    if (project === 'oentregador') {
      // Stats for oEntregador from MongoDB + billing
      try {
        const mongoDB = await db.mongo();
        const totalUsers = await mongoDB.collection('app_users').countDocuments({});
        const verifiedUsers = await mongoDB.collection('app_users').countDocuments({ isStep01VerifyEmailCompleted: true });

        // Get subscription count from billing for oentregador
        const oeSubsCountQuery = `
          SELECT COUNT(*) as count
          FROM subscriptions s
          LEFT JOIN projects p ON s.project_id = p.id
          WHERE p.name = 'app-oentregador' AND s.status IN ('active', 'trialing')
        `;
        const oeSubsCount = await db.billing.query(oeSubsCountQuery);

        stats = {
          total: totalUsers,
          verified: verifiedUsers,
          with_plan: parseInt(oeSubsCount.rows[0].count) || 0,
          free: totalUsers - parseInt(oeSubsCount.rows[0].count) || 0
        };
      } catch (e) {
        console.error('Error getting oEntregador stats:', e.message);
      }
    } else if (!project) {
      // Stats for all projects (auth only, oentregador handled separately in UI)
      const authStatsQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN email_verified = true THEN 1 END) as verified
        FROM users u
        LEFT JOIN projects p ON u.project_id = p.id
        WHERE 1=1
      `;
      const authStats = await db.auth.query(authStatsQuery);

      const billingStatsQuery = `
        SELECT
          COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as with_plan
        FROM subscriptions s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE 1=1
      `;
      const billingStats = await db.billing.query(billingStatsQuery);

      stats = {
        total: parseInt(authStats.rows[0].total) || 0,
        verified: parseInt(authStats.rows[0].verified) || 0,
        with_plan: parseInt(billingStats.rows[0].with_plan) || 0,
        free: parseInt(authStats.rows[0].total) - parseInt(billingStats.rows[0].with_plan) || 0
      };
    } else {
      // Stats for specific auth project
      const authStatsQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN email_verified = true THEN 1 END) as verified
        FROM users u
        LEFT JOIN projects p ON u.project_id = p.id
        WHERE p.name = '${project}'
      `;
      const authStats = await db.auth.query(authStatsQuery);

      const billingStatsQuery = `
        SELECT
          COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as with_plan
        FROM subscriptions s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE p.name = '${project}'
      `;
      const billingStats = await db.billing.query(billingStatsQuery);

      stats = {
        total: parseInt(authStats.rows[0].total) || 0,
        verified: parseInt(authStats.rows[0].verified) || 0,
        with_plan: parseInt(billingStats.rows[0].with_plan) || 0,
        free: parseInt(authStats.rows[0].total) - parseInt(billingStats.rows[0].with_plan) || 0
      };
    }

    res.json({
      users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      stats
    });
  } catch (err) {
    console.error('Error in /api/users:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /api/paying - Lista de clientes pagantes
// =============================================================================
app.get('/api/paying', async (req, res) => {
  const { project, type, plan, search, startDate, endDate } = req.query;

  try {
    // Subscriptions
    let subscriptionsQuery = `
      SELECT
        s.external_user_email as email,
        p.name as project_name,
        pl.name as plan_name,
        'subscription' as type,
        CASE pl.interval
          WHEN 'monthly' THEN pl.price_cents
          WHEN 'yearly' THEN pl.price_cents / 12
          WHEN 'weekly' THEN pl.price_cents * 4
          ELSE pl.price_cents
        END / 100.0 as value,
        s.status,
        s.created_at,
        pl.interval
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.status = 'active'
      ${project ? `AND p.name = '${project}'` : ''}
      ${plan ? `AND pl.name = '${plan}'` : ''}
      ${search ? `AND s.external_user_email ILIKE '%${search}%'` : ''}
      ${startDate ? `AND s.created_at >= '${startDate}'` : ''}
      ${endDate ? `AND s.created_at <= '${endDate}'` : ''}
      ORDER BY s.created_at DESC
    `;

    // One-time purchases
    let onetimeQuery = `
      SELECT
        otp.external_user_email as email,
        p.name as project_name,
        'Pacote One-Time' as plan_name,
        'onetime' as type,
        otp.amount_cents / 100.0 as value,
        otp.status,
        otp.created_at,
        'one-time' as interval
      FROM one_time_purchases otp
      LEFT JOIN projects p ON otp.project_id = p.id
      WHERE otp.status = 'paid'
      ${project ? `AND p.name = '${project}'` : ''}
      ${search ? `AND otp.external_user_email ILIKE '%${search}%'` : ''}
      ${startDate ? `AND otp.created_at >= '${startDate}'` : ''}
      ${endDate ? `AND otp.created_at <= '${endDate}'` : ''}
      ORDER BY otp.created_at DESC
    `;

    let customers = [];

    if (!type || type === 'subscription') {
      const subs = await db.billing.query(subscriptionsQuery);
      customers = [...customers, ...subs.rows];
    }

    if (!type || type === 'onetime') {
      const onetime = await db.billing.query(onetimeQuery);
      customers = [...customers, ...onetime.rows];
    }

    // Sort by date
    customers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Get summary
    const summaryQuery = `
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
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subs
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE 1=1
      ${project ? `AND p.name = '${project}'` : ''}
    `;

    const onetimeSummaryQuery = `
      SELECT
        COUNT(DISTINCT external_user_email) as buyers,
        COALESCE(SUM(amount_cents), 0) / 100.0 as revenue
      FROM one_time_purchases
      WHERE status = 'paid'
      ${project ? `AND project_id = (SELECT id FROM projects WHERE name = '${project}')` : ''}
    `;

    const summary = await db.billing.query(summaryQuery);
    const onetimeSummary = await db.billing.query(onetimeSummaryQuery);

    // Get available plans for filter
    const plansQuery = `SELECT DISTINCT name FROM plans WHERE status = 'active' ORDER BY name`;
    const plans = await db.billing.query(plansQuery);

    res.json({
      customers,
      total: customers.length,
      summary: {
        mrr: parseFloat(summary.rows[0].mrr) || 0,
        active_subs: parseInt(summary.rows[0].active_subs) || 0,
        onetime_buyers: parseInt(onetimeSummary.rows[0].buyers) || 0,
        onetime_revenue: parseFloat(onetimeSummary.rows[0].revenue) || 0
      },
      plans: plans.rows.map(p => p.name)
    });
  } catch (err) {
    console.error('Error in /api/paying:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /api/revenue - Receita detalhada por projeto
// =============================================================================
app.get('/api/revenue', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    // Revenue by project
    const byProjectQuery = `
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
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subs,
        COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) as trialing,
        COALESCE((
          SELECT SUM(amount_cents) / 100.0
          FROM one_time_purchases otp
          WHERE otp.project_id = p.id AND otp.status = 'paid'
        ), 0) as onetime_revenue,
        COALESCE((
          SELECT COUNT(DISTINCT external_user_email)
          FROM one_time_purchases otp
          WHERE otp.project_id = p.id AND otp.status = 'paid'
        ), 0) as onetime_buyers
      FROM projects p
      LEFT JOIN subscriptions s ON s.project_id = p.id
      LEFT JOIN plans pl ON s.plan_id = pl.id
      WHERE p.name != 'Teste'
      GROUP BY p.id, p.name
      ORDER BY mrr DESC
    `;

    const byProject = await db.billing.query(byProjectQuery);

    // Total summary
    const totalMrr = byProject.rows.reduce((sum, p) => sum + parseFloat(p.mrr), 0);
    const totalOnetime = byProject.rows.reduce((sum, p) => sum + parseFloat(p.onetime_revenue), 0);

    // Revenue by plan
    const byPlanQuery = `
      SELECT
        pl.name as plan_name,
        p.name as project_name,
        pl.interval,
        pl.price_cents / 100.0 as price,
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subs,
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
        ), 0) / 100.0 as mrr
      FROM plans pl
      LEFT JOIN subscriptions s ON s.plan_id = pl.id
      LEFT JOIN projects p ON pl.project_id = p.id
      WHERE pl.status = 'active'
      GROUP BY pl.id, p.name
      ORDER BY mrr DESC
    `;

    const byPlan = await db.billing.query(byPlanQuery);

    // Recent transactions (subscriptions + one-time) - separate queries to avoid UNION issues
    const subsTransactionsQuery = `
      SELECT
        s.external_user_email as email,
        p.name as project_name,
        'subscription' as type,
        pl.name as plan_name,
        CASE pl.interval
          WHEN 'monthly' THEN pl.price_cents
          WHEN 'yearly' THEN pl.price_cents / 12
          WHEN 'weekly' THEN pl.price_cents * 4
          ELSE pl.price_cents
        END / 100.0 as value,
        s.created_at
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      LEFT JOIN projects p ON s.project_id = p.id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 10
    `;

    const onetimeTransactionsQuery = `
      SELECT
        otp.external_user_email as email,
        p.name as project_name,
        'onetime' as type,
        'Pacote One-Time' as plan_name,
        otp.amount_cents / 100.0 as value,
        otp.created_at
      FROM one_time_purchases otp
      LEFT JOIN projects p ON otp.project_id = p.id
      WHERE otp.status = 'paid'
      ORDER BY otp.created_at DESC
      LIMIT 10
    `;

    const [subsTransactions, onetimeTransactions] = await Promise.all([
      db.billing.query(subsTransactionsQuery),
      db.billing.query(onetimeTransactionsQuery)
    ]);

    const transactions = {
      rows: [...subsTransactions.rows, ...onetimeTransactions.rows]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 15)
    };

    // MRR growth (last 30 days by counting new active subscriptions)
    const mrrGrowthQuery = `
      SELECT
        DATE_TRUNC('day', s.created_at)::date as date,
        SUM(
          CASE pl.interval
            WHEN 'monthly' THEN pl.price_cents
            WHEN 'yearly' THEN pl.price_cents / 12
            WHEN 'weekly' THEN pl.price_cents * 4
            ELSE pl.price_cents
          END
        ) / 100.0 as mrr
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      WHERE s.status = 'active' AND s.created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', s.created_at)
      ORDER BY date
    `;

    const mrrGrowth = await db.billing.query(mrrGrowthQuery);

    res.json({
      summary: {
        total_revenue: totalMrr + totalOnetime,
        mrr: totalMrr,
        arr: totalMrr * 12,
        onetime: totalOnetime
      },
      byProject: byProject.rows.map(p => ({
        name: p.project_name,
        mrr: parseFloat(p.mrr),
        arr: parseFloat(p.mrr) * 12,
        active_subs: parseInt(p.active_subs),
        trialing: parseInt(p.trialing),
        onetime_revenue: parseFloat(p.onetime_revenue),
        onetime_buyers: parseInt(p.onetime_buyers),
        total_revenue: parseFloat(p.mrr) + parseFloat(p.onetime_revenue)
      })),
      byPlan: byPlan.rows,
      transactions: transactions.rows,
      mrrGrowth: mrrGrowth.rows
    });
  } catch (err) {
    console.error('Error in /api/revenue:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// DEBUG ENDPOINT - UMAMI TEST
// =============================================================================
app.get('/api/debug/umami', async (req, res) => {
  const now = new Date();
  const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const endDate = now;

  const results = {};

  // Test each website
  for (const [project, websiteId] of Object.entries(UMAMI_CONFIG.websites)) {
    const token = project === 'oentregador' ? UMAMI_CONFIG.tokens.oentregador : UMAMI_CONFIG.tokens.main;
    const data = await getUmamiVisitors(websiteId, token, startDate, endDate);
    results[project] = {
      websiteId,
      tokenPrefix: token.substring(0, 10) + '...',
      ...data
    };
  }

  res.json({
    message: 'Umami debug info',
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    results
  });
});

// =============================================================================
// OENTREGADOR - AUDIT LOGS
// =============================================================================

// Get audit logs with filters
app.get('/api/oentregador/audit/logs', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const {
      page = 1,
      limit = 50,
      category,
      status,
      userId,
      companyId,
      action,
      startDate,
      endDate
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (companyId) query.companyId = companyId;
    if (action) query.action = { $regex: action, $options: 'i' };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      auditLogs
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      auditLogs.countDocuments(query)
    ]);

    res.json({
      data: logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get audit stats
app.get('/api/oentregador/audit/stats', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const { period = 'week', companyId } = req.query;

    // Calculate start date based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const matchQuery = { timestamp: { $gte: startDate } };
    if (companyId) matchQuery.companyId = companyId;

    // Get counts by category
    const byCategory = await auditLogs.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]).toArray();

    // Get counts by status
    const byStatus = await auditLogs.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();

    // Get top actions
    const topActions = await auditLogs.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get top users
    const topUsers = await auditLogs.aggregate([
      { $match: { ...matchQuery, userId: { $ne: null } } },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$userName' },
          userEmail: { $first: '$userEmail' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Get total count
    const totalLogs = await auditLogs.countDocuments(matchQuery);

    // Convert arrays to objects
    const categoryObj = {
      auth: 0, bipagem: 0, config: 0, sync: 0, crud: 0, system: 0, financial: 0
    };
    byCategory.forEach(c => { if (c._id) categoryObj[c._id] = c.count; });

    const statusObj = { success: 0, failure: 0, error: 0 };
    byStatus.forEach(s => { if (s._id) statusObj[s._id] = s.count; });

    res.json({
      totalLogs,
      byCategory: categoryObj,
      byStatus: statusObj,
      topActions: topActions.map(a => ({ action: a._id, count: a.count })),
      topUsers: topUsers.map(u => ({
        userId: u._id,
        userName: u.userName || 'Unknown',
        userEmail: u.userEmail,
        count: u.count
      })),
      period: {
        start: startDate,
        end: now,
        name: period
      }
    });
  } catch (err) {
    console.error('Error fetching audit stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get audit activity timeline (logs per day)
app.get('/api/oentregador/audit/timeline', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const result = await auditLogs.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]).toArray();

    // Fill missing days and organize by status
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = {
        date: dateStr,
        success: 0,
        failure: 0,
        error: 0,
        total: 0
      };

      result.filter(r => r._id.date === dateStr).forEach(r => {
        if (r._id.status && dayData.hasOwnProperty(r._id.status)) {
          dayData[r._id.status] = r.count;
          dayData.total += r.count;
        }
      });

      data.push(dayData);
    }

    res.json({ data });
  } catch (err) {
    console.error('Error fetching audit timeline:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent activity for a user
app.get('/api/oentregador/audit/user/:userId', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const logs = await auditLogs
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({ data: logs });
  } catch (err) {
    console.error('Error fetching user audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get recent activity for a company
app.get('/api/oentregador/audit/company/:companyId', async (req, res) => {
  try {
    const mongoDB = await db.mongo();
    const auditLogs = mongoDB.collection('app_audit_logs');

    const { companyId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const logs = await auditLogs
      .find({ companyId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({ data: logs });
  } catch (err) {
    console.error('Error fetching company audit logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// WEBSITE ESTATICO (RAIZ)
// =============================================================================

// Serve arquivos estaticos do site principal
app.use(express.static(__dirname, {
  index: 'index.html',
  extensions: ['html']
}));

// Fallback para o site principal
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}${SECRET_ROUTE}`);
});
