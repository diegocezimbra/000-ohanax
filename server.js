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
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || '@123b456ABC';
const SECRET_ROUTE = '/8a9sud89aus8d';

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
            WHEN s.status IN ('active', 'trialing') THEN
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
            WHEN s.status IN ('active', 'trialing') THEN
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
            WHEN s.status IN ('active', 'trialing') THEN
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents
                WHEN 'yearly' THEN pl.price_cents / 12
                WHEN 'weekly' THEN pl.price_cents * 4
                ELSE pl.price_cents
              END
            ELSE 0
          END
        ), 0) / 100.0 as mrr,
        COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as active_subscriptions
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
      WHERE s.status IN ('active', 'trialing')
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
        COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as active_subscribers
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
            WHEN s.status IN ('active', 'trialing') THEN
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents
                WHEN 'yearly' THEN pl.price_cents / 12
                WHEN 'weekly' THEN pl.price_cents * 4
                ELSE pl.price_cents
              END
            ELSE 0
          END
        ), 0) / 100.0 as mrr,
        COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as paying_customers
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
      WHERE s.status IN ('active', 'trialing')
    `);

    // By project
    const byProject = await db.billing.query(`
      SELECT
        p.name as project_name,
        COUNT(s.id) as total,
        COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as active,
        COALESCE(SUM(
          CASE
            WHEN s.status IN ('active', 'trialing') THEN
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
        COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as active
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
            WHEN s.status IN ('active', 'trialing') THEN
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents
                WHEN 'yearly' THEN pl.price_cents / 12
                WHEN 'weekly' THEN pl.price_cents * 4
                ELSE pl.price_cents
              END
            ELSE 0
          END
        ), 0) / 100.0 as total_mrr,
        COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as total_active_subs
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

    // Usuarios por projeto (auth + billing)
    const usersByProject = await db.auth.query(`
      SELECT
        p.name as project_name,
        COUNT(u.id) as total_users
      FROM projects p
      LEFT JOIN users u ON u.project_id = p.id
      GROUP BY p.id, p.name
      ORDER BY total_users DESC
    `);

    // MRR por projeto
    const mrrByProject = await db.billing.query(`
      SELECT
        p.name as project_name,
        COALESCE(SUM(
          CASE
            WHEN s.status IN ('active', 'trialing') THEN
              CASE pl.interval
                WHEN 'monthly' THEN pl.price_cents
                WHEN 'yearly' THEN pl.price_cents / 12
                WHEN 'weekly' THEN pl.price_cents * 4
                ELSE pl.price_cents
              END
            ELSE 0
          END
        ), 0) / 100.0 as mrr,
        COUNT(CASE WHEN s.status IN ('active', 'trialing') THEN 1 END) as active_subs
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
      recentSubscribers: recentSubscribers.rows
    });
  } catch (err) {
    console.error('Error in /api/overview:', err);
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
            WHEN s.status IN ('active', 'trialing') THEN
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
