import express from 'express';
import { db } from '../db.js';

const router = express.Router();

// =============================================================================
// UMAMI ANALYTICS CONFIG & HELPERS
// =============================================================================
const UMAMI_CONFIG = {
  baseUrl: 'https://api.umami.is/v1',
  tokens: {
    main: 'api_qEPOgaHG9K7EeZjgUZiVyvtkYpaADJST',
  },
  websites: {
    security: 'adecb5b8-60e1-448b-ab8c-aad0350dc2a2',
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

// Fetch all scan funnel events from Umami
async function getSecurityScanFunnelEvents(startDate, endDate) {
  const websiteId = UMAMI_CONFIG.websites.security;
  const token = UMAMI_CONFIG.tokens.main;

  try {
    const startAt = new Date(startDate).getTime();
    const endAt = new Date(endDate).getTime();

    // Fetch all events for the security website
    const url = `${UMAMI_CONFIG.baseUrl}/websites/${websiteId}/events?startAt=${startAt}&endAt=${endAt}`;
    console.log(`[Umami] Fetching scan funnel events...`);

    const response = await fetch(url, {
      headers: {
        'x-umami-api-key': token,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[Umami] Scan funnel events fetch failed: ${response.status}`);
      return {};
    }

    const data = await response.json();

    // Map event names to counts
    const eventCounts = {};
    for (const event of data) {
      eventCounts[event.eventName] = event.count || 0;
    }

    return eventCounts;
  } catch (err) {
    console.error('[Umami] Scan funnel events error:', err.message);
    return {};
  }
}

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

// GET /api/security/scan-funnel - Funil detalhado do fluxo de scan (dados do Umami)
router.get('/scan-funnel', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch events from Umami
    const events = await getSecurityScanFunnelEvents(startDate, endDate);

    // Also get page visitors from Umami
    const websiteId = UMAMI_CONFIG.websites.security;
    const token = UMAMI_CONFIG.tokens.main;
    const visitorData = await getUmamiVisitors(websiteId, token, startDate, endDate);

    // Get trial data from database
    const trialsStarted = await db.security.query(`
      SELECT COUNT(*) as total
      FROM security_trial_sessions
      WHERE created_at >= $1
    `, [startDate]);

    const trialsPaid = await db.security.query(`
      SELECT COUNT(*) as total
      FROM security_trial_sessions
      WHERE created_at >= $1 AND payment_status = 'paid'
    `, [startDate]);

    const trialsCompleted = await db.security.query(`
      SELECT COUNT(*) as total
      FROM security_trial_sessions
      WHERE created_at >= $1 AND status IN ('completed', 'claimed')
    `, [startDate]);

    // Build funnel data
    const funnel = {
      // From Umami events
      pageViews: events['scan_page_view'] || visitorData.pageviews || 0,
      formEngagement: events['form_engagement'] || 0,
      emailValidationFailed: events['email_validation_failed'] || 0,
      existingUserRedirect: events['existing_user_redirect'] || 0,
      trialStarted: events['trial_started'] || parseInt(trialsStarted.rows[0]?.total) || 0,
      scanCompleted: events['scan_completed'] || parseInt(trialsCompleted.rows[0]?.total) || 0,
      paymentPageView: events['payment_page_view'] || 0,
      initiateCheckout: events['initiate_checkout'] || 0,
      checkoutError: events['checkout_error'] || 0,
      purchaseCompleted: events['purchase_completed'] || parseInt(trialsPaid.rows[0]?.total) || 0,
      registerClick: events['register_click'] || 0,
      loginClick: events['login_click'] || 0,
      scanError: events['scan_error'] || 0,

      // Computed metrics
      visitors: visitorData.visitors || 0,
    };

    // Calculate conversion rates
    const conversions = {
      pageToEngagement: funnel.pageViews > 0 ? ((funnel.formEngagement / funnel.pageViews) * 100).toFixed(1) : '0',
      engagementToTrial: funnel.formEngagement > 0 ? ((funnel.trialStarted / funnel.formEngagement) * 100).toFixed(1) : '0',
      trialToPaymentPage: funnel.trialStarted > 0 ? ((funnel.paymentPageView / funnel.trialStarted) * 100).toFixed(1) : '0',
      paymentPageToCheckout: funnel.paymentPageView > 0 ? ((funnel.initiateCheckout / funnel.paymentPageView) * 100).toFixed(1) : '0',
      checkoutToPurchase: funnel.initiateCheckout > 0 ? ((funnel.purchaseCompleted / funnel.initiateCheckout) * 100).toFixed(1) : '0',
      overallConversion: funnel.pageViews > 0 ? ((funnel.purchaseCompleted / funnel.pageViews) * 100).toFixed(2) : '0',
    };

    // Dropout points
    const dropouts = {
      formAbandonment: funnel.formEngagement > 0 ? funnel.formEngagement - funnel.trialStarted : 0,
      emailFailed: funnel.emailValidationFailed,
      existingUser: funnel.existingUserRedirect,
      paymentAbandonment: funnel.paymentPageView > 0 ? funnel.paymentPageView - funnel.initiateCheckout : 0,
      checkoutAbandonment: funnel.initiateCheckout > 0 ? funnel.initiateCheckout - funnel.purchaseCompleted : 0,
      scanErrors: funnel.scanError,
    };

    res.json({
      period: `${days} days`,
      funnel,
      conversions,
      dropouts,
      rawEvents: events
    });
  } catch (err) {
    console.error('Error fetching scan funnel:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
