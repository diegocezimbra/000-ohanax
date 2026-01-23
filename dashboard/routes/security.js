import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// =============================================================================
// SECURITY SERVICE ENDPOINTS
// =============================================================================

// GET /api/security/stats
router.get('/stats', async (req, res) => {
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

// GET /api/security/scan-stats - Total scans vs paid scans
router.get('/scan-stats', async (req, res) => {
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

// GET /api/security/scans-per-day - Scans per day (last 30 days)
router.get('/scans-per-day', async (req, res) => {
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

// GET /api/security/today - Today's scans with user info
router.get('/today', async (req, res) => {
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

// GET /api/security/vulnerabilities
router.get('/vulnerabilities', async (req, res) => {
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

// GET /api/security/trials
router.get('/trials', async (req, res) => {
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

// GET /api/security/activity - Activity logs - recent activities
router.get('/activity', async (req, res) => {
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

// GET /api/security/activity/stats - Activity stats
router.get('/activity/stats', async (req, res) => {
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

// GET /api/security/activity/per-day - Activity per day (for charts)
router.get('/activity/per-day', async (req, res) => {
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

// GET /api/security/activity/failed-logins - Failed logins (security monitoring)
router.get('/activity/failed-logins', async (req, res) => {
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

// GET /api/security/trial-funnel - Funil baseado nos dados reais do banco (security_trial_sessions)
router.get('/trial-funnel', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Funil completo baseado na tabela security_trial_sessions
    const funnelQuery = await db.security.query(`
      SELECT
        -- Total de scans iniciados
        COUNT(*) as total_scans,

        -- Scans por status
        COUNT(*) FILTER (WHERE status = 'scanning') as scanning,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
        COUNT(*) FILTER (WHERE status = 'expired') as expired,

        -- Scans por payment_status
        COUNT(*) FILTER (WHERE payment_status = 'pending') as payment_pending,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as payment_paid,
        COUNT(*) FILTER (WHERE payment_status = 'free') as payment_free,

        -- Funil de conversão
        COUNT(*) FILTER (WHERE status IN ('completed', 'claimed')) as scans_completed,
        COUNT(*) FILTER (WHERE status = 'completed' AND payment_status = 'pending') as completed_not_paid,
        COUNT(*) FILTER (WHERE payment_status = 'paid' AND claimed_by_user_id IS NULL) as paid_not_registered,
        COUNT(*) FILTER (WHERE status = 'claimed') as fully_converted,

        -- Emails únicos
        COUNT(DISTINCT email) as unique_emails,

        -- Com vulnerabilidades vs sem
        COUNT(*) FILTER (WHERE payment_status != 'free' AND status IN ('completed', 'claimed')) as with_vulnerabilities,
        COUNT(*) FILTER (WHERE payment_status = 'free') as without_vulnerabilities

      FROM security_trial_sessions
      WHERE created_at >= $1
    `, [startDate]);

    const data = funnelQuery.rows[0];

    // Funil por semana
    const weeklyQuery = await db.security.query(`
      SELECT
        DATE_TRUNC('week', created_at)::date as week,
        COUNT(*) as scans_started,
        COUNT(*) FILTER (WHERE status IN ('completed', 'claimed')) as scans_completed,
        COUNT(*) FILTER (WHERE payment_status = 'paid') as paid,
        COUNT(*) FILTER (WHERE status = 'claimed') as registered
      FROM security_trial_sessions
      WHERE created_at >= $1
      GROUP BY DATE_TRUNC('week', created_at)
      ORDER BY week DESC
    `, [startDate]);

    // Tempo médio entre etapas
    const timingsQuery = await db.security.query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (paid_at - created_at))/3600)::numeric(10,1) as avg_hours_to_payment,
        AVG(EXTRACT(EPOCH FROM (claimed_at - paid_at))/3600)::numeric(10,1) as avg_hours_payment_to_register,
        AVG(EXTRACT(EPOCH FROM (claimed_at - created_at))/3600)::numeric(10,1) as avg_hours_to_full_conversion,
        MIN(EXTRACT(EPOCH FROM (claimed_at - created_at))/3600)::numeric(10,1) as min_hours_to_conversion,
        MAX(EXTRACT(EPOCH FROM (claimed_at - created_at))/3600)::numeric(10,1) as max_hours_to_conversion
      FROM security_trial_sessions
      WHERE status = 'claimed' AND created_at >= $1
    `, [startDate]);

    // Leads para remarketing (completaram mas não pagaram)
    const coldLeadsQuery = await db.security.query(`
      SELECT
        email,
        project_name,
        frontend_url,
        created_at,
        EXTRACT(EPOCH FROM (NOW() - created_at))/3600 as hours_since_scan
      FROM security_trial_sessions
      WHERE status = 'completed'
        AND payment_status = 'pending'
        AND expires_at > NOW()
        AND created_at >= $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [startDate]);

    // Leads quentes (pagaram mas não registraram)
    const hotLeadsQuery = await db.security.query(`
      SELECT
        email,
        project_name,
        frontend_url,
        created_at,
        paid_at,
        EXTRACT(EPOCH FROM (NOW() - paid_at))/3600 as hours_since_payment
      FROM security_trial_sessions
      WHERE payment_status = 'paid'
        AND claimed_by_user_id IS NULL
        AND created_at >= $1
      ORDER BY paid_at DESC
      LIMIT 20
    `, [startDate]);

    // Conversões recentes
    const recentConversionsQuery = await db.security.query(`
      SELECT
        ts.email,
        ts.project_name,
        ts.created_at as scan_date,
        ts.paid_at as payment_date,
        ts.claimed_at as register_date,
        EXTRACT(EPOCH FROM (ts.claimed_at - ts.created_at))/3600 as hours_to_conversion,
        au.name as user_name
      FROM security_trial_sessions ts
      LEFT JOIN security_admin_users au ON ts.claimed_by_user_id = au.id
      WHERE ts.status = 'claimed'
        AND ts.created_at >= $1
      ORDER BY ts.claimed_at DESC
      LIMIT 20
    `, [startDate]);

    // Build funnel structure
    const totalScans = parseInt(data.total_scans) || 0;
    const scansCompleted = parseInt(data.scans_completed) || 0;
    const withVulns = parseInt(data.with_vulnerabilities) || 0;
    const paidTotal = parseInt(data.payment_paid) || 0;
    const registered = parseInt(data.fully_converted) || 0;

    const funnel = {
      // Etapas do funil
      scansStarted: totalScans,
      scansCompleted: scansCompleted,
      withVulnerabilities: withVulns,
      withoutVulnerabilities: parseInt(data.without_vulnerabilities) || 0,
      paidTotal: paidTotal,
      paidNotRegistered: parseInt(data.paid_not_registered) || 0,
      completedNotPaid: parseInt(data.completed_not_paid) || 0,
      fullyConverted: registered,

      // Status breakdown
      status: {
        scanning: parseInt(data.scanning) || 0,
        pending: parseInt(data.pending) || 0,
        completed: parseInt(data.completed) || 0,
        claimed: parseInt(data.claimed) || 0,
        expired: parseInt(data.expired) || 0,
      },

      // Payment status breakdown
      paymentStatus: {
        pending: parseInt(data.payment_pending) || 0,
        paid: parseInt(data.payment_paid) || 0,
        free: parseInt(data.payment_free) || 0,
      },

      uniqueEmails: parseInt(data.unique_emails) || 0,
    };

    // Taxas de conversão
    const conversions = {
      // Scan iniciado → Scan completado
      startToComplete: totalScans > 0
        ? ((scansCompleted / totalScans) * 100).toFixed(1)
        : '0',

      // Scan completado → Com vulnerabilidades
      completeToVulns: scansCompleted > 0
        ? ((withVulns / scansCompleted) * 100).toFixed(1)
        : '0',

      // Com vulnerabilidades → Pagou
      vulnsToPaid: withVulns > 0
        ? ((paidTotal / withVulns) * 100).toFixed(1)
        : '0',

      // Pagou → Registrou
      paidToRegistered: paidTotal > 0
        ? ((registered / paidTotal) * 100).toFixed(1)
        : '0',

      // Conversão geral: Scan → Registro
      overallConversion: totalScans > 0
        ? ((registered / totalScans) * 100).toFixed(2)
        : '0',

      // Conversão de pagamento (inclui free)
      paymentConversion: scansCompleted > 0
        ? (((paidTotal + parseInt(data.payment_free)) / scansCompleted) * 100).toFixed(1)
        : '0',
    };

    // Funil como array para visualização
    const funnelSteps = [
      { step: 1, name: 'Scans Iniciados', count: funnel.scansStarted, percentage: '100%' },
      { step: 2, name: 'Scans Completados', count: funnel.scansCompleted, percentage: conversions.startToComplete + '%' },
      { step: 3, name: 'Com Vulnerabilidades', count: funnel.withVulnerabilities, percentage: conversions.completeToVulns + '%' },
      { step: 4, name: 'Pagaram', count: funnel.paidTotal, percentage: conversions.vulnsToPaid + '%' },
      { step: 5, name: 'Registraram', count: funnel.fullyConverted, percentage: conversions.paidToRegistered + '%' },
    ];

    // Dropout analysis
    const dropouts = {
      scanFailed: totalScans - scansCompleted,
      noVulnerabilities: parseInt(data.without_vulnerabilities) || 0,
      didNotPay: parseInt(data.completed_not_paid) || 0,
      paidButDidNotRegister: parseInt(data.paid_not_registered) || 0,
      expired: parseInt(data.expired) || 0,
    };

    res.json({
      period: `${days} days`,
      funnel,
      funnelSteps,
      conversions,
      dropouts,
      timings: timingsQuery.rows[0] || {},
      weekly: weeklyQuery.rows,
      leads: {
        cold: coldLeadsQuery.rows,
        hot: hotLeadsQuery.rows,
      },
      recentConversions: recentConversionsQuery.rows,
    });
  } catch (err) {
    console.error('Error fetching trial funnel:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /api/security/all-scans - Lista TODOS os scans (trial + paid users)
// =============================================================================
router.get('/all-scans', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const scanType = req.query.type || ''; // 'trial', 'paid', ''
    const status = req.query.status || '';
    const search = req.query.search || '';

    // Build combined query with UNION ALL
    let whereTrialClause = '1=1';
    let wherePaidClause = '1=1';
    const trialParams = [];
    const paidParams = [];
    let trialParamIndex = 1;
    let paidParamIndex = 1;

    // Status filter
    if (status) {
      whereTrialClause += ` AND ts.status = $${trialParamIndex}`;
      trialParams.push(status);
      trialParamIndex++;

      // Map status for paid scans
      wherePaidClause += ` AND sar.status = $${paidParamIndex}`;
      paidParams.push(status);
      paidParamIndex++;
    }

    // Search filter
    if (search) {
      whereTrialClause += ` AND (ts.email ILIKE $${trialParamIndex} OR ts.frontend_url ILIKE $${trialParamIndex} OR ts.backend_url ILIKE $${trialParamIndex} OR ts.project_name ILIKE $${trialParamIndex})`;
      trialParams.push(`%${search}%`);
      trialParamIndex++;

      wherePaidClause += ` AND (sau.email ILIKE $${paidParamIndex} OR sp.frontend_url ILIKE $${paidParamIndex} OR sp.backend_url ILIKE $${paidParamIndex} OR sp.name ILIKE $${paidParamIndex})`;
      paidParams.push(`%${search}%`);
      paidParamIndex++;
    }

    // Build queries based on type filter
    let countQueries = [];
    let dataQueries = [];

    if (scanType !== 'paid') {
      // Trial scans query
      const trialCountQuery = `
        SELECT COUNT(*) as count FROM security_trial_sessions ts WHERE ${whereTrialClause}
      `;
      countQueries.push({ type: 'trial', query: trialCountQuery, params: trialParams });

      const trialDataQuery = `
        SELECT
          ts.id::text as id,
          'trial' as scan_type,
          ts.email,
          ts.frontend_url,
          ts.backend_url,
          ts.project_name,
          ts.report_id::text as report_id,
          ts.status::text as status,
          ts.payment_status::text as payment_status,
          CASE
            WHEN ts.payment_status = 'paid' THEN 'Pago'
            WHEN ts.payment_status = 'free' THEN 'Gratuito'
            ELSE 'Pendente'
          END as payment_label,
          ts.created_at,
          NULL::timestamp as completed_at,
          ts.claimed_by_user_id::text as claimed_by_user_id,
          NULL::text as owner_email,
          NULL::text as owner_name
        FROM security_trial_sessions ts
        WHERE ${whereTrialClause}
      `;
      dataQueries.push({ type: 'trial', query: trialDataQuery, params: trialParams });
    }

    if (scanType !== 'trial') {
      // Paid/logged in user scans query
      // Exclude reports that are linked to an ACTIVE trial (not yet claimed)
      // If trial was claimed (converted to paid user), it should appear as PAID
      const paidCountQuery = `
        SELECT COUNT(*) as count
        FROM security_audit_reports sar
        LEFT JOIN security_projects sp ON sar.project_id = sp.id
        LEFT JOIN security_admin_users sau ON sp.owner_id = sau.id
        WHERE ${wherePaidClause}
          AND NOT EXISTS (
            SELECT 1 FROM security_trial_sessions ts
            WHERE ts.report_id = sar.id
              AND ts.status != 'claimed'
          )
      `;
      countQueries.push({ type: 'paid', query: paidCountQuery, params: paidParams });

      const paidDataQuery = `
        SELECT
          sar.id::text as id,
          'paid' as scan_type,
          COALESCE(sau.email, ts_claimed.email) as email,
          sp.frontend_url,
          sp.backend_url,
          sp.name as project_name,
          sar.id::text as report_id,
          sar.status,
          'logged' as payment_status,
          'Usuario Logado' as payment_label,
          sar.created_at,
          sar.completed_at,
          COALESCE(sau.id::text, ts_claimed.claimed_by_user_id::text) as claimed_by_user_id,
          sau.email as owner_email,
          sau.name as owner_name
        FROM security_audit_reports sar
        LEFT JOIN security_projects sp ON sar.project_id = sp.id
        LEFT JOIN security_admin_users sau ON sp.owner_id = sau.id
        LEFT JOIN security_trial_sessions ts_claimed ON ts_claimed.report_id = sar.id AND ts_claimed.status = 'claimed'
        WHERE ${wherePaidClause}
          AND NOT EXISTS (
            SELECT 1 FROM security_trial_sessions ts
            WHERE ts.report_id = sar.id
              AND ts.status != 'claimed'
          )
      `;
      dataQueries.push({ type: 'paid', query: paidDataQuery, params: paidParams });
    }

    // Execute count queries
    let totalCount = 0;
    for (const cq of countQueries) {
      const result = await db.security.query(cq.query, cq.params);
      totalCount += parseInt(result.rows[0].count);
    }

    // Build combined data query with UNION ALL
    let combinedQuery;
    if (dataQueries.length === 2) {
      // Need to carefully handle params for combined query
      const trialQuery = dataQueries[0];
      const paidQuery = dataQueries[1];

      // Re-index paid params
      let reindexedPaidQuery = paidQuery.query;
      const paidParamOffset = trialQuery.params.length;
      for (let i = paidQuery.params.length; i >= 1; i--) {
        reindexedPaidQuery = reindexedPaidQuery.replace(
          new RegExp(`\\$${i}`, 'g'),
          `$${i + paidParamOffset}`
        );
      }

      combinedQuery = `
        SELECT * FROM (
          (${trialQuery.query})
          UNION ALL
          (${reindexedPaidQuery})
        ) combined
        ORDER BY created_at DESC
        LIMIT $${trialQuery.params.length + paidQuery.params.length + 1}
        OFFSET $${trialQuery.params.length + paidQuery.params.length + 2}
      `;
      const allParams = [...trialQuery.params, ...paidQuery.params, limit, offset];
      const result = await db.security.query(combinedQuery, allParams);

      res.json({
        scans: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1,
        },
      });
    } else if (dataQueries.length === 1) {
      // Single query (filtered by type)
      const query = dataQueries[0];
      const paginatedQuery = `
        ${query.query}
        ORDER BY created_at DESC
        LIMIT $${query.params.length + 1} OFFSET $${query.params.length + 2}
      `;
      const result = await db.security.query(paginatedQuery, [...query.params, limit, offset]);

      res.json({
        scans: result.rows,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1,
        },
      });
    } else {
      res.json({
        scans: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      });
    }
  } catch (err) {
    console.error('Error fetching all scans:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /api/security/paying - Dados de pagamento do projeto Security
// Busca do banco de billing (subscriptions + one_time_purchases)
// =============================================================================
router.get('/paying', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Buscar ID do projeto Security no billing
    const projectResult = await db.billing.query(`
      SELECT id FROM projects WHERE name = 'security-audit' LIMIT 1
    `);

    if (projectResult.rows.length === 0) {
      return res.json({
        subscribers: [],
        onetime_purchases: [],
        summary: { mrr: 0, onetime_revenue: 0, active_subs: 0, onetime_count: 0 }
      });
    }

    const projectId = projectResult.rows[0].id;

    // Assinantes ativos do Security (subscriptions)
    const subscribersQuery = await db.billing.query(`
      SELECT
        s.external_user_email as email,
        s.status,
        pl.name as plan_name,
        CASE pl.interval
          WHEN 'monthly' THEN pl.price_cents
          WHEN 'yearly' THEN pl.price_cents / 12
          WHEN 'weekly' THEN pl.price_cents * 4
          ELSE pl.price_cents
        END / 100.0 as mrr,
        s.created_at
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      WHERE s.project_id = $1
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created_at DESC
      LIMIT $2
    `, [projectId, limit]);

    // Compras avulsas do Security (one_time_purchases)
    const onetimeQuery = await db.billing.query(`
      SELECT
        otp.external_user_email as email,
        otp.amount_cents / 100.0 as amount,
        otp.status,
        otp.created_at,
        otp.paid_at
      FROM one_time_purchases otp
      WHERE otp.project_id = $1
        AND otp.status = 'paid'
      ORDER BY otp.paid_at DESC NULLS LAST, otp.created_at DESC
      LIMIT $2
    `, [projectId, limit]);

    // Resumo de receita do Security
    const summaryQuery = await db.billing.query(`
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
        COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_subs,
        COUNT(CASE WHEN s.status = 'trialing' THEN 1 END) as trialing_subs
      FROM subscriptions s
      LEFT JOIN plans pl ON s.plan_id = pl.id
      WHERE s.project_id = $1
    `, [projectId]);

    const onetimeSummaryQuery = await db.billing.query(`
      SELECT
        COUNT(*) as onetime_count,
        COALESCE(SUM(amount_cents), 0) / 100.0 as onetime_revenue
      FROM one_time_purchases
      WHERE project_id = $1 AND status = 'paid'
    `, [projectId]);

    const summary = {
      mrr: parseFloat(summaryQuery.rows[0]?.mrr) || 0,
      active_subs: parseInt(summaryQuery.rows[0]?.active_subs) || 0,
      trialing_subs: parseInt(summaryQuery.rows[0]?.trialing_subs) || 0,
      onetime_count: parseInt(onetimeSummaryQuery.rows[0]?.onetime_count) || 0,
      onetime_revenue: parseFloat(onetimeSummaryQuery.rows[0]?.onetime_revenue) || 0
    };

    res.json({
      subscribers: subscribersQuery.rows,
      onetime_purchases: onetimeQuery.rows,
      summary
    });
  } catch (err) {
    console.error('Error fetching paying data:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /api/security/trial-sessions - Lista todos os scans de trial
// =============================================================================
router.get('/trial-sessions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const paymentStatus = req.query.payment_status || '';
    const search = req.query.search || '';

    // Build WHERE clause dynamically
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND ts.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (paymentStatus) {
      whereClause += ` AND ts.payment_status = $${paramIndex}`;
      params.push(paymentStatus);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (ts.email ILIKE $${paramIndex} OR ts.frontend_url ILIKE $${paramIndex} OR ts.backend_url ILIKE $${paramIndex} OR ts.project_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count total
    const countQuery = await db.security.query(`
      SELECT COUNT(*) as total
      FROM security_trial_sessions ts
      ${whereClause}
    `, params);

    // Get sessions with pagination
    const sessionsQuery = await db.security.query(`
      SELECT
        ts.id,
        ts.email,
        ts.frontend_url,
        ts.backend_url,
        ts.project_name,
        ts.report_id,
        ts.status,
        ts.payment_status,
        ts.created_at,
        ts.completed_at,
        ts.paid_at,
        ts.claimed_at,
        ts.expires_at,
        ts.claimed_by_user_id,
        au.name as claimed_by_name,
        au.email as claimed_by_email
      FROM security_trial_sessions ts
      LEFT JOIN security_admin_users au ON ts.claimed_by_user_id = au.id
      ${whereClause}
      ORDER BY ts.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const total = parseInt(countQuery.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      sessions: sessionsQuery.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error('Error fetching trial sessions:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// GET /api/security/analytics-funnel - Funil completo baseado nos eventos do banco interno
// Usa a tabela security_analytics_events (banco analytics na porta 5441)
// =============================================================================
router.get('/analytics-funnel', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Buscar contagem de cada evento do funil
    const eventsQuery = await db.analytics.query(`
      SELECT
        event_name,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT visitor_id) as unique_visitors
      FROM security_analytics_events
      WHERE created_at >= $1
      GROUP BY event_name
      ORDER BY count DESC
    `, [startDate]);

    // Criar mapa de eventos
    const eventCounts = {};
    const eventSessions = {};
    for (const row of eventsQuery.rows) {
      eventCounts[row.event_name] = parseInt(row.count);
      eventSessions[row.event_name] = parseInt(row.unique_sessions);
    }

    // Sessoes unicas totais
    const totalSessionsQuery = await db.analytics.query(`
      SELECT COUNT(DISTINCT session_id) as total
      FROM security_analytics_events
      WHERE created_at >= $1
    `, [startDate]);
    const totalSessions = parseInt(totalSessionsQuery.rows[0]?.total) || 0;

    // Visitantes unicos totais
    const totalVisitorsQuery = await db.analytics.query(`
      SELECT COUNT(DISTINCT visitor_id) as total
      FROM security_analytics_events
      WHERE created_at >= $1 AND visitor_id IS NOT NULL
    `, [startDate]);
    const totalVisitors = parseInt(totalVisitorsQuery.rows[0]?.total) || 0;

    // Montar dados do funil - FLUXO COMPLETO DO USUARIO
    // ================================================================================
    // MAPA DE PAGINAS E EVENTOS:
    // ================================================================================
    // Step 1: index.html (/scan)           -> funnel_scan_page_view      -> "Pág. de Scan"
    // Step 2: index.html (/scan)           -> funnel_scan_form_start     -> "Form Iniciado"
    // Step 3: index.html (/scan)           -> funnel_scan_form_submit    -> "Form Submetido"
    // Step 4: index.html (/scan)           -> funnel_scan_started        -> "Scan Iniciado"
    // Step 5: result.html (/scan/{id}/result)   -> funnel_result_page_view   -> "Pág. de Resultado"
    // Step 6: payment.html (/scan/{id}/payment) -> funnel_unlock_page_view  -> "Pág. de Desbloqueio"
    // Step 7: payment.html (/scan/{id}/payment) -> funnel_unlock_click -> "Clicou Desbloquear"
    // Step 8: payment.html (/scan/{id}/payment) -> funnel_unlock_checkout_created -> "Checkout Criado"
    // Step 9: result.html (/scan/{id}/result?just_paid=1) -> conversion_payment_success -> "Pagamento Concluído"
    // ================================================================================
    const funnel = {
      // ============ PÁGINA: index.html (/scan) ============
      // Step 1: Usuario acessou a pagina de scan
      scanPageView: eventCounts['funnel_scan_page_view'] || 0,
      scanPageViewSessions: eventSessions['funnel_scan_page_view'] || 0,

      // Step 2: Usuario comecou a preencher o formulario
      formStart: eventCounts['funnel_scan_form_start'] || 0,
      formStartSessions: eventSessions['funnel_scan_form_start'] || 0,

      // Step 3: Usuario submeteu o formulario
      formSubmit: eventCounts['funnel_scan_form_submit'] || 0,
      formSubmitSessions: eventSessions['funnel_scan_form_submit'] || 0,

      // Step 4: Scan iniciou (redirect para result.html)
      scanStarted: eventCounts['funnel_scan_started'] || 0,
      scanStartedSessions: eventSessions['funnel_scan_started'] || 0,

      // ============ PÁGINA: result.html (/scan/{id}/result) ============
      // Step 5: Usuario viu a pagina de resultado (scan rodando, mostra vulns)
      resultPageView: eventCounts['funnel_result_page_view'] || 0,
      resultPageViewSessions: eventSessions['funnel_result_page_view'] || 0,

      // CTAs do resultado (usuario ja pagou ou registrou)
      ctaClickRegister: eventCounts['cta_result_click_register'] || 0,
      ctaClickLogin: eventCounts['cta_result_click_login'] || 0,

      // Step 6: Scan encontrou vulnerabilidades (redirect automatico para payment)
      vulnsFound: eventCounts['nav_result_redirect_payment'] || 0,
      vulnsFoundSessions: eventSessions['nav_result_redirect_payment'] || 0,

      // ============ PÁGINA: payment.html (/scan/{id}/payment) - DESBLOQUEIO ============
      // Step 7: Usuario acessou pagina de desbloqueio (ve vulns e botao desbloquear)
      paymentPageView: eventCounts['funnel_unlock_page_view'] || 0,
      paymentPageViewSessions: eventSessions['funnel_unlock_page_view'] || 0,

      // Step 8: Usuario clicou em desbloquear
      paymentClickUnlock: eventCounts['funnel_unlock_click'] || 0,
      paymentClickUnlockSessions: eventSessions['funnel_unlock_click'] || 0,

      // Step 9: Checkout Stripe foi criado (URL gerada)
      paymentCheckoutCreated: eventCounts['funnel_unlock_checkout_created'] || 0,
      paymentCheckoutCreatedSessions: eventSessions['funnel_unlock_checkout_created'] || 0,

      // ============ PÁGINA: result.html (/scan/{id}/result?just_paid=1) ============
      // Step 10: Usuario voltou do Stripe com pagamento confirmado
      conversionPaymentSuccess: eventCounts['conversion_payment_success'] || 0,
      conversionPaymentSuccessSessions: eventSessions['conversion_payment_success'] || 0,

      // ============ ERROS ============
      errorScanApi: eventCounts['error_scan_api'] || 0,
      errorScanValidation: eventCounts['error_scan_validation'] || 0,
      errorPayment: eventCounts['error_payment'] || 0,

      // ============ METRICAS GERAIS ============
      totalSessions,
      totalVisitors,
    };

    // Calcular taxas de conversao entre cada etapa
    const conversions = {
      // Page View -> Form Start
      pageToFormStart: funnel.scanPageView > 0
        ? ((funnel.formStart / funnel.scanPageView) * 100).toFixed(1)
        : '0',

      // Form Start -> Form Submit
      formStartToSubmit: funnel.formStart > 0
        ? ((funnel.formSubmit / funnel.formStart) * 100).toFixed(1)
        : '0',

      // Form Submit -> Scan Started
      submitToScanStarted: funnel.formSubmit > 0
        ? ((funnel.scanStarted / funnel.formSubmit) * 100).toFixed(1)
        : '0',

      // Scan Started -> Vulns Found (scan encontrou vulnerabilidades)
      scanToVulnsFound: funnel.scanStarted > 0
        ? ((funnel.vulnsFound / funnel.scanStarted) * 100).toFixed(1)
        : '0',

      // Vulns Found -> Payment Page View
      vulnsFoundToPayment: funnel.vulnsFound > 0
        ? ((funnel.paymentPageView / funnel.vulnsFound) * 100).toFixed(1)
        : '0',

      // Payment Page -> Click Unlock
      paymentToUnlock: funnel.paymentPageView > 0
        ? ((funnel.paymentClickUnlock / funnel.paymentPageView) * 100).toFixed(1)
        : '0',

      // Click Unlock -> Checkout Created
      unlockToCheckout: funnel.paymentClickUnlock > 0
        ? ((funnel.paymentCheckoutCreated / funnel.paymentClickUnlock) * 100).toFixed(1)
        : '0',

      // Checkout -> Payment Success
      checkoutToSuccess: funnel.paymentCheckoutCreated > 0
        ? ((funnel.conversionPaymentSuccess / funnel.paymentCheckoutCreated) * 100).toFixed(1)
        : '0',

      // Conversao geral: Page View -> Payment Success
      overallConversion: funnel.scanPageView > 0
        ? ((funnel.conversionPaymentSuccess / funnel.scanPageView) * 100).toFixed(2)
        : '0',
    };

    // Pontos de dropout (abandono)
    const dropouts = {
      beforeFormStart: funnel.scanPageView - funnel.formStart,
      formAbandonment: funnel.formStart - funnel.formSubmit,
      scanNotStarted: funnel.formSubmit - funnel.scanStarted,
      noVulnsFound: funnel.scanStarted - funnel.vulnsFound, // Scan iniciado mas nao encontrou vulns (ou usuario saiu)
      beforePayment: funnel.vulnsFound - funnel.paymentPageView,
      beforeUnlock: funnel.paymentPageView - funnel.paymentClickUnlock,
      beforeCheckout: funnel.paymentClickUnlock - funnel.paymentCheckoutCreated,
      checkoutAbandonment: funnel.paymentCheckoutCreated - funnel.conversionPaymentSuccess,
      totalErrors: funnel.errorScanApi + funnel.errorScanValidation + funnel.errorPayment,
    };

    // Funil como array para visualizacao (diagrama)
    // Criar array de dropouts para o frontend (8 dropouts entre os 9 steps)
    const dropoutsArray = [
      { count: dropouts.beforeFormStart, rate: funnel.scanPageView > 0 ? ((dropouts.beforeFormStart / funnel.scanPageView) * 100).toFixed(1) : '0' },   // 1: Page -> Form Start
      { count: dropouts.formAbandonment, rate: funnel.formStart > 0 ? ((dropouts.formAbandonment / funnel.formStart) * 100).toFixed(1) : '0' },         // 2: Form Start -> Submit
      { count: dropouts.scanNotStarted, rate: funnel.formSubmit > 0 ? ((dropouts.scanNotStarted / funnel.formSubmit) * 100).toFixed(1) : '0' },         // 3: Submit -> Scan Started
      { count: dropouts.noVulnsFound, rate: funnel.scanStarted > 0 ? ((dropouts.noVulnsFound / funnel.scanStarted) * 100).toFixed(1) : '0' },           // 4: Scan -> Vulns Found
      { count: dropouts.beforePayment, rate: funnel.vulnsFound > 0 ? ((dropouts.beforePayment / funnel.vulnsFound) * 100).toFixed(1) : '0' },           // 5: Vulns -> Payment Page
      { count: dropouts.beforeUnlock, rate: funnel.paymentPageView > 0 ? ((dropouts.beforeUnlock / funnel.paymentPageView) * 100).toFixed(1) : '0' },   // 6: Payment -> Click Unlock
      { count: dropouts.beforeCheckout, rate: funnel.paymentClickUnlock > 0 ? ((dropouts.beforeCheckout / funnel.paymentClickUnlock) * 100).toFixed(1) : '0' }, // 7: Click -> Checkout
      { count: dropouts.checkoutAbandonment, rate: funnel.paymentCheckoutCreated > 0 ? ((dropouts.checkoutAbandonment / funnel.paymentCheckoutCreated) * 100).toFixed(1) : '0' }, // 8: Checkout -> Payment
    ];

    const funnelSteps = [
      {
        step: 1,
        name: 'Página do Scan',
        event: 'funnel_scan_page_view',
        count: funnel.scanPageView,
        sessions: funnel.scanPageViewSessions,
        percentage: '100%',
        dropoutNext: dropouts.beforeFormStart,
      },
      {
        step: 2,
        name: 'Início do Formulário',
        event: 'funnel_scan_form_start',
        count: funnel.formStart,
        sessions: funnel.formStartSessions,
        percentage: conversions.pageToFormStart + '%',
        dropoutNext: dropouts.formAbandonment,
      },
      {
        step: 3,
        name: 'Formulário Enviado',
        event: 'funnel_scan_form_submit',
        count: funnel.formSubmit,
        sessions: funnel.formSubmitSessions,
        percentage: conversions.formStartToSubmit + '%',
        dropoutNext: dropouts.scanNotStarted,
      },
      {
        step: 4,
        name: 'Scan Iniciado',
        event: 'funnel_scan_started',
        count: funnel.scanStarted,
        sessions: funnel.scanStartedSessions,
        percentage: conversions.submitToScanStarted + '%',
        dropoutNext: dropouts.noVulnsFound,
      },
      {
        step: 5,
        name: 'Encontrou Vulns',
        event: 'nav_result_redirect_payment',
        count: funnel.vulnsFound,
        sessions: funnel.vulnsFoundSessions,
        percentage: conversions.scanToVulnsFound + '%',
        dropoutNext: dropouts.beforePayment,
      },
      {
        step: 6,
        name: 'Pág. de Desbloqueio',
        event: 'funnel_unlock_page_view',
        count: funnel.paymentPageView,
        sessions: funnel.paymentPageViewSessions,
        percentage: conversions.vulnsFoundToPayment + '%',
        dropoutNext: dropouts.beforeUnlock,
      },
      {
        step: 7,
        name: 'Clicou Desbloquear',
        event: 'funnel_unlock_click',
        count: funnel.paymentClickUnlock,
        sessions: funnel.paymentClickUnlockSessions,
        percentage: conversions.paymentToUnlock + '%',
        dropoutNext: dropouts.beforeCheckout,
      },
      {
        step: 8,
        name: 'Checkout Criado',
        event: 'funnel_unlock_checkout_created',
        count: funnel.paymentCheckoutCreated,
        sessions: funnel.paymentCheckoutCreatedSessions,
        percentage: conversions.unlockToCheckout + '%',
        dropoutNext: dropouts.checkoutAbandonment,
      },
      {
        step: 9,
        name: 'Pagamento Concluído',
        event: 'conversion_payment_success',
        count: funnel.conversionPaymentSuccess,
        sessions: funnel.conversionPaymentSuccessSessions,
        percentage: conversions.checkoutToSuccess + '%',
        dropoutNext: 0,
      },
    ];

    // ================================================================================
    // EVENTOS PÓS-SCAN POR VARIAÇÃO (result.html, payment.html)
    // Esses eventos acontecem em páginas compartilhadas, mas o funnel_variant
    // identifica de qual landing page o usuário veio
    // ================================================================================
    const postScanByVariant = {
      original: {},
      video: {},
      pro: {},
      whatsapp: {},
    };

    const postScanEventsQuery = await db.analytics.query(`
      SELECT
        funnel_variant,
        event_name,
        COUNT(*) as count,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM security_analytics_events
      WHERE created_at >= $1
        AND funnel_variant IN ('original', 'video', 'pro', 'whatsapp')
        AND event_name IN (
          'nav_result_redirect_payment',
          'funnel_unlock_page_view',
          'funnel_unlock_click',
          'funnel_unlock_checkout_created',
          'conversion_payment_success'
        )
      GROUP BY funnel_variant, event_name
    `, [startDate]);

    for (const row of postScanEventsQuery.rows) {
      const variant = row.funnel_variant;
      if (postScanByVariant[variant]) {
        postScanByVariant[variant][row.event_name] = {
          count: parseInt(row.count),
          sessions: parseInt(row.unique_sessions),
        };
      }
    }

    // ================================================================================
    // FUNIL VARIAÇÃO A: /scan-video (Landing com vídeo)
    // ================================================================================
    const funnelVideoRaw = {
      pageView: eventCounts['funnel_scan_video_page_view'] || 0,
      pageViewSessions: eventSessions['funnel_scan_video_page_view'] || 0,
      videoPlay: eventCounts['funnel_scan_video_play'] || 0,
      videoPlaySessions: eventSessions['funnel_scan_video_play'] || 0,
      formStart: eventCounts['funnel_scan_video_form_start'] || 0,
      formStartSessions: eventSessions['funnel_scan_video_form_start'] || 0,
      formSubmit: eventCounts['funnel_scan_video_form_submit'] || 0,
      formSubmitSessions: eventSessions['funnel_scan_video_form_submit'] || 0,
      scanStarted: eventCounts['funnel_scan_video_started'] || 0,
      scanStartedSessions: eventSessions['funnel_scan_video_started'] || 0,
      // Eventos pós-scan (páginas compartilhadas)
      vulnsFound: postScanByVariant.video['nav_result_redirect_payment']?.count || 0,
      vulnsFoundSessions: postScanByVariant.video['nav_result_redirect_payment']?.sessions || 0,
      paymentPageView: postScanByVariant.video['funnel_unlock_page_view']?.count || 0,
      paymentPageViewSessions: postScanByVariant.video['funnel_unlock_page_view']?.sessions || 0,
      paymentClickUnlock: postScanByVariant.video['funnel_unlock_click']?.count || 0,
      paymentClickUnlockSessions: postScanByVariant.video['funnel_unlock_click']?.sessions || 0,
      checkoutCreated: postScanByVariant.video['funnel_unlock_checkout_created']?.count || 0,
      checkoutCreatedSessions: postScanByVariant.video['funnel_unlock_checkout_created']?.sessions || 0,
      paymentSuccess: postScanByVariant.video['conversion_payment_success']?.count || 0,
      paymentSuccessSessions: postScanByVariant.video['conversion_payment_success']?.sessions || 0,
    };

    const funnelVideoSteps = [
      {
        step: 1,
        name: 'Página Video',
        event: 'funnel_scan_video_page_view',
        count: funnelVideoRaw.pageView,
        sessions: funnelVideoRaw.pageViewSessions,
        percentage: '100%',
      },
      {
        step: 2,
        name: 'Video Play',
        event: 'funnel_scan_video_play',
        count: funnelVideoRaw.videoPlay,
        sessions: funnelVideoRaw.videoPlaySessions,
        percentage: funnelVideoRaw.pageView > 0 ? ((funnelVideoRaw.videoPlay / funnelVideoRaw.pageView) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 3,
        name: 'Início Formulário',
        event: 'funnel_scan_video_form_start',
        count: funnelVideoRaw.formStart,
        sessions: funnelVideoRaw.formStartSessions,
        percentage: funnelVideoRaw.videoPlay > 0 ? ((funnelVideoRaw.formStart / funnelVideoRaw.videoPlay) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 4,
        name: 'Formulário Enviado',
        event: 'funnel_scan_video_form_submit',
        count: funnelVideoRaw.formSubmit,
        sessions: funnelVideoRaw.formSubmitSessions,
        percentage: funnelVideoRaw.formStart > 0 ? ((funnelVideoRaw.formSubmit / funnelVideoRaw.formStart) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 5,
        name: 'Scan Iniciado',
        event: 'funnel_scan_video_started',
        count: funnelVideoRaw.scanStarted,
        sessions: funnelVideoRaw.scanStartedSessions,
        percentage: funnelVideoRaw.formSubmit > 0 ? ((funnelVideoRaw.scanStarted / funnelVideoRaw.formSubmit) * 100).toFixed(1) + '%' : '0%',
      },
      // Eventos pós-scan (páginas compartilhadas)
      {
        step: 6,
        name: 'Encontrou Vulns',
        event: 'nav_result_redirect_payment',
        count: funnelVideoRaw.vulnsFound,
        sessions: funnelVideoRaw.vulnsFoundSessions,
        percentage: funnelVideoRaw.scanStarted > 0 ? ((funnelVideoRaw.vulnsFound / funnelVideoRaw.scanStarted) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 7,
        name: 'Pág. Desbloqueio',
        event: 'funnel_unlock_page_view',
        count: funnelVideoRaw.paymentPageView,
        sessions: funnelVideoRaw.paymentPageViewSessions,
        percentage: funnelVideoRaw.vulnsFound > 0 ? ((funnelVideoRaw.paymentPageView / funnelVideoRaw.vulnsFound) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 8,
        name: 'Clicou Desbloquear',
        event: 'funnel_unlock_click',
        count: funnelVideoRaw.paymentClickUnlock,
        sessions: funnelVideoRaw.paymentClickUnlockSessions,
        percentage: funnelVideoRaw.paymentPageView > 0 ? ((funnelVideoRaw.paymentClickUnlock / funnelVideoRaw.paymentPageView) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 9,
        name: 'Checkout Criado',
        event: 'funnel_unlock_checkout_created',
        count: funnelVideoRaw.checkoutCreated,
        sessions: funnelVideoRaw.checkoutCreatedSessions,
        percentage: funnelVideoRaw.paymentClickUnlock > 0 ? ((funnelVideoRaw.checkoutCreated / funnelVideoRaw.paymentClickUnlock) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 10,
        name: 'Pagamento Concluído',
        event: 'conversion_payment_success',
        count: funnelVideoRaw.paymentSuccess,
        sessions: funnelVideoRaw.paymentSuccessSessions,
        percentage: funnelVideoRaw.checkoutCreated > 0 ? ((funnelVideoRaw.paymentSuccess / funnelVideoRaw.checkoutCreated) * 100).toFixed(1) + '%' : '0%',
      },
    ];

    const funnelVideoConversion = funnelVideoRaw.pageView > 0
      ? ((funnelVideoRaw.paymentSuccess / funnelVideoRaw.pageView) * 100).toFixed(2)
      : '0';

    // ================================================================================
    // FUNIL VARIAÇÃO B: /scan-pro (Landing com quiz/psicologia)
    // ================================================================================
    const funnelProRaw = {
      pageView: eventCounts['funnel_scan_pro_page_view'] || 0,
      pageViewSessions: eventSessions['funnel_scan_pro_page_view'] || 0,
      quizStart: eventCounts['funnel_scan_pro_quiz_start'] || 0,
      quizStartSessions: eventSessions['funnel_scan_pro_quiz_start'] || 0,
      quizComplete: eventCounts['funnel_scan_pro_quiz_complete'] || 0,
      quizCompleteSessions: eventSessions['funnel_scan_pro_quiz_complete'] || 0,
      formStart: eventCounts['funnel_scan_pro_form_start'] || 0,
      formStartSessions: eventSessions['funnel_scan_pro_form_start'] || 0,
      formSubmit: eventCounts['funnel_scan_pro_form_submit'] || 0,
      formSubmitSessions: eventSessions['funnel_scan_pro_form_submit'] || 0,
      scanStarted: eventCounts['funnel_scan_pro_started'] || 0,
      scanStartedSessions: eventSessions['funnel_scan_pro_started'] || 0,
      // Eventos pós-scan (páginas compartilhadas)
      vulnsFound: postScanByVariant.pro['nav_result_redirect_payment']?.count || 0,
      vulnsFoundSessions: postScanByVariant.pro['nav_result_redirect_payment']?.sessions || 0,
      paymentPageView: postScanByVariant.pro['funnel_unlock_page_view']?.count || 0,
      paymentPageViewSessions: postScanByVariant.pro['funnel_unlock_page_view']?.sessions || 0,
      paymentClickUnlock: postScanByVariant.pro['funnel_unlock_click']?.count || 0,
      paymentClickUnlockSessions: postScanByVariant.pro['funnel_unlock_click']?.sessions || 0,
      checkoutCreated: postScanByVariant.pro['funnel_unlock_checkout_created']?.count || 0,
      checkoutCreatedSessions: postScanByVariant.pro['funnel_unlock_checkout_created']?.sessions || 0,
      paymentSuccess: postScanByVariant.pro['conversion_payment_success']?.count || 0,
      paymentSuccessSessions: postScanByVariant.pro['conversion_payment_success']?.sessions || 0,
    };

    const funnelProSteps = [
      {
        step: 1,
        name: 'Página Pro',
        event: 'funnel_scan_pro_page_view',
        count: funnelProRaw.pageView,
        sessions: funnelProRaw.pageViewSessions,
        percentage: '100%',
      },
      {
        step: 2,
        name: 'Quiz Iniciado',
        event: 'funnel_scan_pro_quiz_start',
        count: funnelProRaw.quizStart,
        sessions: funnelProRaw.quizStartSessions,
        percentage: funnelProRaw.pageView > 0 ? ((funnelProRaw.quizStart / funnelProRaw.pageView) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 3,
        name: 'Quiz Completo',
        event: 'funnel_scan_pro_quiz_complete',
        count: funnelProRaw.quizComplete,
        sessions: funnelProRaw.quizCompleteSessions,
        percentage: funnelProRaw.quizStart > 0 ? ((funnelProRaw.quizComplete / funnelProRaw.quizStart) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 4,
        name: 'Início Formulário',
        event: 'funnel_scan_pro_form_start',
        count: funnelProRaw.formStart,
        sessions: funnelProRaw.formStartSessions,
        percentage: funnelProRaw.quizComplete > 0 ? ((funnelProRaw.formStart / funnelProRaw.quizComplete) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 5,
        name: 'Formulário Enviado',
        event: 'funnel_scan_pro_form_submit',
        count: funnelProRaw.formSubmit,
        sessions: funnelProRaw.formSubmitSessions,
        percentage: funnelProRaw.formStart > 0 ? ((funnelProRaw.formSubmit / funnelProRaw.formStart) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 6,
        name: 'Scan Iniciado',
        event: 'funnel_scan_pro_started',
        count: funnelProRaw.scanStarted,
        sessions: funnelProRaw.scanStartedSessions,
        percentage: funnelProRaw.formSubmit > 0 ? ((funnelProRaw.scanStarted / funnelProRaw.formSubmit) * 100).toFixed(1) + '%' : '0%',
      },
      // Eventos pós-scan (páginas compartilhadas)
      {
        step: 7,
        name: 'Encontrou Vulns',
        event: 'nav_result_redirect_payment',
        count: funnelProRaw.vulnsFound,
        sessions: funnelProRaw.vulnsFoundSessions,
        percentage: funnelProRaw.scanStarted > 0 ? ((funnelProRaw.vulnsFound / funnelProRaw.scanStarted) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 8,
        name: 'Pág. Desbloqueio',
        event: 'funnel_unlock_page_view',
        count: funnelProRaw.paymentPageView,
        sessions: funnelProRaw.paymentPageViewSessions,
        percentage: funnelProRaw.vulnsFound > 0 ? ((funnelProRaw.paymentPageView / funnelProRaw.vulnsFound) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 9,
        name: 'Clicou Desbloquear',
        event: 'funnel_unlock_click',
        count: funnelProRaw.paymentClickUnlock,
        sessions: funnelProRaw.paymentClickUnlockSessions,
        percentage: funnelProRaw.paymentPageView > 0 ? ((funnelProRaw.paymentClickUnlock / funnelProRaw.paymentPageView) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 10,
        name: 'Checkout Criado',
        event: 'funnel_unlock_checkout_created',
        count: funnelProRaw.checkoutCreated,
        sessions: funnelProRaw.checkoutCreatedSessions,
        percentage: funnelProRaw.paymentClickUnlock > 0 ? ((funnelProRaw.checkoutCreated / funnelProRaw.paymentClickUnlock) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 11,
        name: 'Pagamento Concluído',
        event: 'conversion_payment_success',
        count: funnelProRaw.paymentSuccess,
        sessions: funnelProRaw.paymentSuccessSessions,
        percentage: funnelProRaw.checkoutCreated > 0 ? ((funnelProRaw.paymentSuccess / funnelProRaw.checkoutCreated) * 100).toFixed(1) + '%' : '0%',
      },
    ];

    const funnelProConversion = funnelProRaw.pageView > 0
      ? ((funnelProRaw.paymentSuccess / funnelProRaw.pageView) * 100).toFixed(2)
      : '0';

    // ================================================================================
    // FUNIL VARIAÇÃO ORIGINAL: /scan (Landing padrão)
    // ================================================================================
    const funnelOriginalRaw = {
      pageView: eventCounts['funnel_scan_page_view'] || 0,
      pageViewSessions: eventSessions['funnel_scan_page_view'] || 0,
      formStart: eventCounts['funnel_scan_form_start'] || 0,
      formStartSessions: eventSessions['funnel_scan_form_start'] || 0,
      formSubmit: eventCounts['funnel_scan_form_submit'] || 0,
      formSubmitSessions: eventSessions['funnel_scan_form_submit'] || 0,
      scanStarted: eventCounts['funnel_scan_started'] || 0,
      scanStartedSessions: eventSessions['funnel_scan_started'] || 0,
      // Eventos pós-scan (páginas compartilhadas)
      vulnsFound: postScanByVariant.original['nav_result_redirect_payment']?.count || 0,
      vulnsFoundSessions: postScanByVariant.original['nav_result_redirect_payment']?.sessions || 0,
      paymentPageView: postScanByVariant.original['funnel_unlock_page_view']?.count || 0,
      paymentPageViewSessions: postScanByVariant.original['funnel_unlock_page_view']?.sessions || 0,
      paymentClickUnlock: postScanByVariant.original['funnel_unlock_click']?.count || 0,
      paymentClickUnlockSessions: postScanByVariant.original['funnel_unlock_click']?.sessions || 0,
      checkoutCreated: postScanByVariant.original['funnel_unlock_checkout_created']?.count || 0,
      checkoutCreatedSessions: postScanByVariant.original['funnel_unlock_checkout_created']?.sessions || 0,
      paymentSuccess: postScanByVariant.original['conversion_payment_success']?.count || 0,
      paymentSuccessSessions: postScanByVariant.original['conversion_payment_success']?.sessions || 0,
    };

    const funnelOriginalSteps = [
      {
        step: 1,
        name: 'Página Scan',
        event: 'funnel_scan_page_view',
        count: funnelOriginalRaw.pageView,
        sessions: funnelOriginalRaw.pageViewSessions,
        percentage: '100%',
      },
      {
        step: 2,
        name: 'Início Formulário',
        event: 'funnel_scan_form_start',
        count: funnelOriginalRaw.formStart,
        sessions: funnelOriginalRaw.formStartSessions,
        percentage: funnelOriginalRaw.pageView > 0 ? ((funnelOriginalRaw.formStart / funnelOriginalRaw.pageView) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 3,
        name: 'Formulário Enviado',
        event: 'funnel_scan_form_submit',
        count: funnelOriginalRaw.formSubmit,
        sessions: funnelOriginalRaw.formSubmitSessions,
        percentage: funnelOriginalRaw.formStart > 0 ? ((funnelOriginalRaw.formSubmit / funnelOriginalRaw.formStart) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 4,
        name: 'Scan Iniciado',
        event: 'funnel_scan_started',
        count: funnelOriginalRaw.scanStarted,
        sessions: funnelOriginalRaw.scanStartedSessions,
        percentage: funnelOriginalRaw.formSubmit > 0 ? ((funnelOriginalRaw.scanStarted / funnelOriginalRaw.formSubmit) * 100).toFixed(1) + '%' : '0%',
      },
      // Eventos pós-scan (páginas compartilhadas)
      {
        step: 5,
        name: 'Encontrou Vulns',
        event: 'nav_result_redirect_payment',
        count: funnelOriginalRaw.vulnsFound,
        sessions: funnelOriginalRaw.vulnsFoundSessions,
        percentage: funnelOriginalRaw.scanStarted > 0 ? ((funnelOriginalRaw.vulnsFound / funnelOriginalRaw.scanStarted) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 6,
        name: 'Pág. Desbloqueio',
        event: 'funnel_unlock_page_view',
        count: funnelOriginalRaw.paymentPageView,
        sessions: funnelOriginalRaw.paymentPageViewSessions,
        percentage: funnelOriginalRaw.vulnsFound > 0 ? ((funnelOriginalRaw.paymentPageView / funnelOriginalRaw.vulnsFound) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 7,
        name: 'Clicou Desbloquear',
        event: 'funnel_unlock_click',
        count: funnelOriginalRaw.paymentClickUnlock,
        sessions: funnelOriginalRaw.paymentClickUnlockSessions,
        percentage: funnelOriginalRaw.paymentPageView > 0 ? ((funnelOriginalRaw.paymentClickUnlock / funnelOriginalRaw.paymentPageView) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 8,
        name: 'Checkout Criado',
        event: 'funnel_unlock_checkout_created',
        count: funnelOriginalRaw.checkoutCreated,
        sessions: funnelOriginalRaw.checkoutCreatedSessions,
        percentage: funnelOriginalRaw.paymentClickUnlock > 0 ? ((funnelOriginalRaw.checkoutCreated / funnelOriginalRaw.paymentClickUnlock) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 9,
        name: 'Pagamento Concluído',
        event: 'conversion_payment_success',
        count: funnelOriginalRaw.paymentSuccess,
        sessions: funnelOriginalRaw.paymentSuccessSessions,
        percentage: funnelOriginalRaw.checkoutCreated > 0 ? ((funnelOriginalRaw.paymentSuccess / funnelOriginalRaw.checkoutCreated) * 100).toFixed(1) + '%' : '0%',
      },
    ];

    const funnelOriginalConversion = funnelOriginalRaw.pageView > 0
      ? ((funnelOriginalRaw.paymentSuccess / funnelOriginalRaw.pageView) * 100).toFixed(2)
      : '0';

    // ================================================================================
    // FUNIL VARIAÇÃO WHATSAPP: /whatsapp (Landing com quiz de qualificação)
    // ================================================================================
    const funnelWhatsappRaw = {
      pageView: eventCounts['funnel_whatsapp_page_view'] || 0,
      pageViewSessions: eventSessions['funnel_whatsapp_page_view'] || 0,
      quizStart: eventCounts['funnel_whatsapp_quiz_start'] || 0,
      quizStartSessions: eventSessions['funnel_whatsapp_quiz_start'] || 0,
      q1Passed: eventCounts['funnel_whatsapp_q1_passed'] || 0,
      q1PassedSessions: eventSessions['funnel_whatsapp_q1_passed'] || 0,
      q2Passed: eventCounts['funnel_whatsapp_q2_passed'] || 0,
      q2PassedSessions: eventSessions['funnel_whatsapp_q2_passed'] || 0,
      qualified: eventCounts['funnel_whatsapp_qualified'] || 0,
      qualifiedSessions: eventSessions['funnel_whatsapp_qualified'] || 0,
      disqualified: eventCounts['funnel_whatsapp_disqualified'] || 0,
      disqualifiedSessions: eventSessions['funnel_whatsapp_disqualified'] || 0,
      ctaClick: eventCounts['funnel_whatsapp_cta_click'] || 0,
      ctaClickSessions: eventSessions['funnel_whatsapp_cta_click'] || 0,
      urgencyShown: eventCounts['funnel_whatsapp_urgency_shown'] || 0,
      abandoned: eventCounts['funnel_whatsapp_abandoned'] || 0,
      scrollDepth: eventCounts['funnel_whatsapp_scroll_depth'] || 0,
      socialProofSeen: eventCounts['funnel_whatsapp_social_proof_seen'] || 0,
      testimonialSeen: eventCounts['funnel_whatsapp_testimonial_seen'] || 0,
      timeMilestone: eventCounts['funnel_whatsapp_time_milestone'] || 0,
    };

    const funnelWhatsappSteps = [
      {
        step: 1,
        name: 'Página WhatsApp',
        event: 'funnel_whatsapp_page_view',
        count: funnelWhatsappRaw.pageView,
        sessions: funnelWhatsappRaw.pageViewSessions,
        percentage: '100%',
      },
      {
        step: 2,
        name: 'Quiz Iniciado',
        event: 'funnel_whatsapp_quiz_start',
        count: funnelWhatsappRaw.quizStart,
        sessions: funnelWhatsappRaw.quizStartSessions,
        percentage: funnelWhatsappRaw.pageView > 0 ? ((funnelWhatsappRaw.quizStart / funnelWhatsappRaw.pageView) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 3,
        name: 'Q1 Passou',
        event: 'funnel_whatsapp_q1_passed',
        count: funnelWhatsappRaw.q1Passed,
        sessions: funnelWhatsappRaw.q1PassedSessions,
        percentage: funnelWhatsappRaw.quizStart > 0 ? ((funnelWhatsappRaw.q1Passed / funnelWhatsappRaw.quizStart) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 4,
        name: 'Q2 Passou',
        event: 'funnel_whatsapp_q2_passed',
        count: funnelWhatsappRaw.q2Passed,
        sessions: funnelWhatsappRaw.q2PassedSessions,
        percentage: funnelWhatsappRaw.q1Passed > 0 ? ((funnelWhatsappRaw.q2Passed / funnelWhatsappRaw.q1Passed) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 5,
        name: 'Qualificado',
        event: 'funnel_whatsapp_qualified',
        count: funnelWhatsappRaw.qualified,
        sessions: funnelWhatsappRaw.qualifiedSessions,
        percentage: funnelWhatsappRaw.q2Passed > 0 ? ((funnelWhatsappRaw.qualified / funnelWhatsappRaw.q2Passed) * 100).toFixed(1) + '%' : '0%',
      },
      {
        step: 6,
        name: 'Clicou WhatsApp',
        event: 'funnel_whatsapp_cta_click',
        count: funnelWhatsappRaw.ctaClick,
        sessions: funnelWhatsappRaw.ctaClickSessions,
        percentage: funnelWhatsappRaw.qualified > 0 ? ((funnelWhatsappRaw.ctaClick / funnelWhatsappRaw.qualified) * 100).toFixed(1) + '%' : '0%',
      },
    ];

    const funnelWhatsappConversion = funnelWhatsappRaw.pageView > 0
      ? ((funnelWhatsappRaw.ctaClick / funnelWhatsappRaw.pageView) * 100).toFixed(2)
      : '0';

    // Eventos por dia para grafico de tendencia
    const dailyQuery = await db.analytics.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE event_name = 'funnel_scan_page_view') as page_views,
        COUNT(*) FILTER (WHERE event_name = 'funnel_scan_form_submit') as form_submits,
        COUNT(*) FILTER (WHERE event_name = 'funnel_result_page_view') as result_views,
        COUNT(*) FILTER (WHERE event_name = 'conversion_payment_success') as conversions
      FROM security_analytics_events
      WHERE created_at >= $1
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `, [startDate]);

    // Preencher dias faltantes com zeros
    const dailyData = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const found = dailyQuery.rows.find(r => r.date && r.date.toISOString().split('T')[0] === dateStr);
      dailyData.push({
        date: dateStr,
        pageViews: found ? parseInt(found.page_views) : 0,
        formSubmits: found ? parseInt(found.form_submits) : 0,
        resultViews: found ? parseInt(found.result_views) : 0,
        conversions: found ? parseInt(found.conversions) : 0,
      });
    }

    // UTM Sources - de onde vem os usuarios
    const utmQuery = await db.analytics.query(`
      SELECT
        COALESCE(utm_source, 'direto') as source,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions
      FROM security_analytics_events
      WHERE created_at >= $1 AND event_name = 'funnel_scan_page_view'
      GROUP BY utm_source
      ORDER BY sessions DESC
      LIMIT 10
    `, [startDate]);

    res.json({
      period: `${days} days`,
      funnel,
      funnelSteps,
      conversions,
      dropouts: dropoutsArray,  // Array formatado para o frontend
      dropoutsRaw: dropouts,    // Objeto original para debug
      daily: dailyData,
      utmSources: utmQuery.rows,
      rawEvents: eventCounts,
      // Variações de landing page para A/B testing
      variations: {
        original: {
          name: 'Scan Original',
          path: '/scan',
          description: 'Landing padrão (controle)',
          funnel: funnelOriginalRaw,
          steps: funnelOriginalSteps,
          overallConversion: funnelOriginalConversion + '%',
        },
        video: {
          name: 'Scan Video',
          path: '/scan-video',
          description: 'Landing com vídeo explicativo',
          funnel: funnelVideoRaw,
          steps: funnelVideoSteps,
          overallConversion: funnelVideoConversion + '%',
        },
        pro: {
          name: 'Scan Pro',
          path: '/scan-pro',
          description: 'Landing com quiz de segurança',
          funnel: funnelProRaw,
          steps: funnelProSteps,
          overallConversion: funnelProConversion + '%',
        },
        whatsapp: {
          name: 'WhatsApp',
          path: '/whatsapp',
          description: 'Landing com quiz de qualificação para WhatsApp',
          funnel: funnelWhatsappRaw,
          steps: funnelWhatsappSteps,
          overallConversion: funnelWhatsappConversion + '%',
        },
      },
    });
  } catch (err) {
    console.error('Error fetching analytics funnel:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// UTM BREAKDOWN - Todos os valores únicos dos UTM params
// =============================================================================
router.get('/utm-breakdown', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Buscar todos os UTM sources únicos com contagem
    const sourcesQuery = await db.analytics.query(`
      SELECT
        COALESCE(utm_source, 'direto') as value,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions
      FROM security_analytics_events
      WHERE created_at >= $1
      GROUP BY utm_source
      ORDER BY sessions DESC
    `, [startDate]);

    // Buscar todos os UTM mediums únicos com contagem
    const mediumsQuery = await db.analytics.query(`
      SELECT
        COALESCE(utm_medium, 'none') as value,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions
      FROM security_analytics_events
      WHERE created_at >= $1
      GROUP BY utm_medium
      ORDER BY sessions DESC
    `, [startDate]);

    // Buscar todas as UTM campaigns únicas com contagem
    const campaignsQuery = await db.analytics.query(`
      SELECT
        COALESCE(utm_campaign, 'none') as value,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions
      FROM security_analytics_events
      WHERE created_at >= $1
      GROUP BY utm_campaign
      ORDER BY sessions DESC
    `, [startDate]);

    // Buscar todos os UTM contents únicos com contagem
    const contentsQuery = await db.analytics.query(`
      SELECT
        COALESCE(utm_content, 'none') as value,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions
      FROM security_analytics_events
      WHERE created_at >= $1
      GROUP BY utm_content
      ORDER BY sessions DESC
    `, [startDate]);

    // Buscar breakdown completo (combinação de todos os UTMs)
    const fullBreakdownQuery = await db.analytics.query(`
      SELECT
        COALESCE(utm_source, 'direto') as source,
        COALESCE(utm_medium, 'none') as medium,
        COALESCE(utm_campaign, 'none') as campaign,
        COALESCE(utm_content, 'none') as content,
        COUNT(*) as events,
        COUNT(DISTINCT session_id) as sessions,
        COUNT(*) FILTER (WHERE event_name = 'funnel_scan_page_view') as page_views,
        COUNT(*) FILTER (WHERE event_name = 'funnel_scan_form_submit') as form_submits,
        COUNT(*) FILTER (WHERE event_name = 'conversion_payment_success') as conversions
      FROM security_analytics_events
      WHERE created_at >= $1
      GROUP BY utm_source, utm_medium, utm_campaign, utm_content
      ORDER BY sessions DESC
      LIMIT 50
    `, [startDate]);

    res.json({
      period: `${days} dias`,
      sources: sourcesQuery.rows,
      mediums: mediumsQuery.rows,
      campaigns: campaignsQuery.rows,
      contents: contentsQuery.rows,
      fullBreakdown: fullBreakdownQuery.rows,
    });
  } catch (err) {
    console.error('Error fetching UTM breakdown:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// LEADS CAPTURADOS - Lista de leads parciais (emails/whatsapp capturados)
// =============================================================================
router.get('/leads', async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (email ILIKE $${paramIndex} OR whatsapp ILIKE $${paramIndex} OR frontend_url ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Buscar leads da tabela security_leads
    const countQuery = `SELECT COUNT(*) FROM security_leads ${whereClause}`;
    const countResult = await db.security.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT
        id,
        email,
        whatsapp,
        frontend_url,
        backend_url,
        project_name,
        status,
        source,
        utm_source,
        utm_medium,
        utm_campaign,
        ip_address,
        created_at,
        updated_at,
        paid_at,
        registered_at
      FROM security_leads
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataResult = await db.security.query(dataQuery, [...params, parseInt(limit), offset]);

    res.json({
      leads: dataResult.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
