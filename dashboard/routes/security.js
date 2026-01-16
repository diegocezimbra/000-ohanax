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
// Eventos mapeados do frontend Security (src/services/analytics/index.ts):
// - funnel_trial_page_view
// - funnel_trial_form_start
// - funnel_trial_form_submit
// - funnel_trial_scan_started
// - funnel_trial_result_view
// - funnel_trial_click_register
// - funnel_trial_click_login
// - conversion_checkout_start
// - conversion_checkout_success
// - error_scan
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

    // Get trial data from database (fallback)
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

    // Build funnel data - usando nomes CORRETOS dos eventos do Security frontend
    // Nomes reais: funnel_scan_*, funnel_result_*, funnel_payment_*
    const funnel = {
      // Step 1: Page View - usuário acessou /scan (scan/index.html)
      pageView: events['funnel_scan_page_view'] || events['funnel_trial_page_view'] || visitorData.pageviews || 0,

      // Step 2: Form Start - usuário começou a preencher o formulário
      formStart: events['funnel_scan_form_start'] || events['funnel_trial_form_start'] || 0,

      // Step 3: Form Submit - usuário submeteu o formulário
      formSubmit: events['funnel_scan_form_submit'] || events['funnel_trial_form_submit'] || parseInt(trialsStarted.rows[0]?.total) || 0,

      // Step 4: Scan Started - scan iniciou processamento
      scanStarted: events['funnel_scan_started'] || events['funnel_trial_scan_started'] || 0,

      // Step 5: Result View - usuário viu o resultado do scan (scan/result.html)
      resultView: events['funnel_result_page_view'] || events['funnel_trial_result_view'] || parseInt(trialsCompleted.rows[0]?.total) || 0,

      // Step 6a: Click Register - usuário clicou para se registrar
      clickRegister: events['cta_result_click_register'] || events['funnel_trial_click_register'] || 0,

      // Step 6b: Click Login - usuário clicou para fazer login
      clickLogin: events['cta_result_click_login'] || events['funnel_trial_click_login'] || 0,

      // Step 7: Payment Page View - usuário viu página de pagamento
      paymentPageView: events['funnel_payment_page_view'] || 0,

      // Step 8: Click Unlock - usuário clicou para desbloquear
      clickUnlock: events['funnel_payment_click_unlock'] || 0,

      // Step 9: Checkout Created - checkout foi criado
      checkoutStart: events['funnel_payment_checkout_created'] || events['conversion_checkout_start'] || 0,

      // Step 10: Checkout Success - pagamento concluído
      checkoutSuccess: events['conversion_payment_success'] || events['conversion_checkout_success'] || parseInt(trialsPaid.rows[0]?.total) || 0,

      // Erros
      scanError: events['error_scan_api'] || events['error_scan_validation'] || events['error_scan'] || 0,

      // Métricas gerais
      visitors: visitorData.visitors || 0,
      totalPageviews: visitorData.pageviews || 0,
    };

    // Calculate conversion rates para cada etapa do funil
    const conversions = {
      // Taxa de engajamento: quem viu a página e começou a preencher
      pageToFormStart: funnel.pageView > 0
        ? ((funnel.formStart / funnel.pageView) * 100).toFixed(1)
        : '0',

      // Taxa de submissão: quem começou e submeteu
      formStartToSubmit: funnel.formStart > 0
        ? ((funnel.formSubmit / funnel.formStart) * 100).toFixed(1)
        : '0',

      // Taxa de conclusão do scan
      submitToResult: funnel.formSubmit > 0
        ? ((funnel.resultView / funnel.formSubmit) * 100).toFixed(1)
        : '0',

      // Taxa de conversão para registro/login
      resultToAction: funnel.resultView > 0
        ? (((funnel.clickRegister + funnel.clickLogin) / funnel.resultView) * 100).toFixed(1)
        : '0',

      // Taxa de início de checkout
      actionToCheckout: (funnel.clickRegister + funnel.clickLogin) > 0
        ? ((funnel.checkoutStart / (funnel.clickRegister + funnel.clickLogin)) * 100).toFixed(1)
        : '0',

      // Taxa de conclusão do checkout
      checkoutToSuccess: funnel.checkoutStart > 0
        ? ((funnel.checkoutSuccess / funnel.checkoutStart) * 100).toFixed(1)
        : '0',

      // Conversão geral: visitante → pagamento
      overallConversion: funnel.pageView > 0
        ? ((funnel.checkoutSuccess / funnel.pageView) * 100).toFixed(2)
        : '0',
    };

    // Dropout points - onde os usuários abandonam
    const dropouts = {
      // Abandonaram antes de começar a preencher
      beforeFormStart: funnel.pageView - funnel.formStart,

      // Começaram mas não submeteram
      formAbandonment: funnel.formStart - funnel.formSubmit,

      // Submeteram mas não viram resultado (erro ou abandono)
      scanAbandonment: funnel.formSubmit - funnel.resultView,

      // Viram resultado mas não clicaram em nada
      resultAbandonment: funnel.resultView - (funnel.clickRegister + funnel.clickLogin),

      // Clicaram mas não iniciaram checkout
      preCheckoutAbandonment: (funnel.clickRegister + funnel.clickLogin) - funnel.checkoutStart,

      // Iniciaram checkout mas não concluíram
      checkoutAbandonment: funnel.checkoutStart - funnel.checkoutSuccess,

      // Erros de scan
      scanErrors: funnel.scanError,
    };

    // Funil como array para facilitar visualização
    // Nomes corretos dos eventos usados pelo Security frontend
    const funnelSteps = [
      { step: 1, name: 'Page View', event: 'funnel_scan_page_view', count: funnel.pageView },
      { step: 2, name: 'Form Start', event: 'funnel_scan_form_start', count: funnel.formStart },
      { step: 3, name: 'Form Submit', event: 'funnel_scan_form_submit', count: funnel.formSubmit },
      { step: 4, name: 'Scan Started', event: 'funnel_scan_started', count: funnel.scanStarted },
      { step: 5, name: 'Result View', event: 'funnel_result_page_view', count: funnel.resultView },
      { step: 6, name: 'Payment Page', event: 'funnel_payment_page_view', count: funnel.paymentPageView },
      { step: 7, name: 'Click Unlock', event: 'funnel_payment_click_unlock', count: funnel.clickUnlock },
      { step: 8, name: 'Checkout Created', event: 'funnel_payment_checkout_created', count: funnel.checkoutStart },
      { step: 9, name: 'Purchase Complete', event: 'conversion_payment_success', count: funnel.checkoutSuccess },
    ];

    // Descrições para leigos entenderem cada métrica
    const descriptions = {
      _about: 'Este funil mostra a jornada do usuário desde que acessa a página de scan gratuito até efetuar o pagamento. Os dados vêm do Umami (ferramenta de analytics) que rastreia cliques e ações no site.',

      funnel: {
        pageView: 'Quantas pessoas abriram a página do scan gratuito (/scan). É o ponto de entrada do funil.',
        formStart: 'Quantas pessoas começaram a preencher o formulário (clicaram em algum campo). Mostra interesse inicial.',
        formSubmit: 'Quantas pessoas enviaram o formulário completo para iniciar o scan.',
        scanStarted: 'Quantos scans efetivamente começaram a rodar no servidor.',
        resultView: 'Quantas pessoas viram o resultado do scan (a página /scan/result com as vulnerabilidades).',
        clickRegister: 'Quantas pessoas clicaram no botão "Criar conta gratuita" após ver o resultado.',
        clickLogin: 'Quantas pessoas clicaram em "Já tenho conta - Fazer login" após ver o resultado.',
        paymentPageView: 'Quantas pessoas viram a página de pagamento (/scan/payment).',
        clickUnlock: 'Quantas pessoas clicaram em "Desbloquear" na página de pagamento.',
        checkoutStart: 'Quantas pessoas iniciaram o processo de checkout (foram para a página de pagamento).',
        checkoutSuccess: 'Quantas pessoas efetivamente pagaram e concluíram a compra.',
        scanError: 'Quantos scans falharam por erro técnico.',
        visitors: 'Total de visitantes únicos na página.',
        totalPageviews: 'Total de visualizações de página (inclui mesma pessoa voltando).',
      },

      conversions: {
        pageToFormStart: 'De quem viu a página, quantos % começaram a preencher o formulário. Se baixo, a página não está atraindo interesse.',
        formStartToSubmit: 'De quem começou a preencher, quantos % terminaram e enviaram. Se baixo, o formulário pode ser confuso ou longo demais.',
        submitToResult: 'De quem enviou o formulário, quantos % viram o resultado. Se baixo, pode haver erros no scan ou abandono.',
        resultToAction: 'De quem viu o resultado, quantos % clicaram para se registrar/logar. Se baixo, o resultado não está convencendo.',
        actionToCheckout: 'De quem clicou para registrar/logar, quantos % iniciaram o pagamento. Se baixo, há fricção no processo de registro.',
        checkoutToSuccess: 'De quem iniciou o pagamento, quantos % concluíram. Se baixo, há problemas no checkout (preço, forma de pagamento, etc).',
        overallConversion: 'Conversão total: de todos que viram a página, quantos % pagaram. É a métrica mais importante.',
      },

      dropouts: {
        beforeFormStart: 'Pessoas que viram a página mas não começaram a preencher. Podem não ter entendido a proposta ou não terem interesse.',
        formAbandonment: 'Pessoas que começaram a preencher mas desistiram. O formulário pode ser complexo ou pedir dados demais.',
        scanAbandonment: 'Pessoas que enviaram mas não viram o resultado. Podem ter fechado a página antes de terminar ou houve erro.',
        resultAbandonment: 'Pessoas que viram o resultado mas não clicaram em nada. O resultado pode não ter convencido da necessidade.',
        preCheckoutAbandonment: 'Pessoas que clicaram para registrar mas não iniciaram pagamento. Fricção no processo de cadastro.',
        checkoutAbandonment: 'Pessoas que iniciaram pagamento mas não concluíram. Problemas com preço, forma de pagamento ou confiança.',
        scanErrors: 'Scans que falharam por erro técnico. Precisa investigar e corrigir.',
      },

      funnelSteps: 'Array ordenado mostrando cada etapa do funil com nome e quantidade. Útil para fazer gráficos de funil.',
    };

    res.json({
      period: `${days} days`,
      descriptions,
      funnel,
      funnelSteps,
      conversions,
      dropouts,
      rawEvents: events
    });
  } catch (err) {
    console.error('Error fetching scan funnel:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/security/trial-funnel - Funil baseado nos dados reais do banco (security_trial_sessions)
// Este funil usa dados reais do banco para comparar com os eventos do Umami
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
          'paid' as payment_status,
          'Usuario Pago' as payment_label,
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
// GET /api/security/analytics-funnel - Funil completo baseado nos eventos do nosso banco interno
// Usa a tabela security_analytics_events (banco analytics) em vez do Umami
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
    // Step 6: payment.html (/scan/{id}/payment) -> funnel_payment_page_view  -> "Pág. de Desbloqueio"
    // Step 7: payment.html (/scan/{id}/payment) -> funnel_payment_click_unlock -> "Clicou Desbloquear"
    // Step 8: payment.html (/scan/{id}/payment) -> funnel_payment_checkout_created -> "Checkout Criado"
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

      // ============ PÁGINA: payment.html (/scan/{id}/payment) ============
      // Step 6: Usuario acessou pagina de desbloqueio (ve vulns e botao desbloquear)
      // NOTA: O evento se chama "payment" por razoes historicas, mas a pagina é de desbloqueio
      paymentPageView: eventCounts['funnel_payment_page_view'] || 0,
      paymentPageViewSessions: eventSessions['funnel_payment_page_view'] || 0,

      // Step 7: Usuario clicou em desbloquear
      paymentClickUnlock: eventCounts['funnel_payment_click_unlock'] || 0,
      paymentClickUnlockSessions: eventSessions['funnel_payment_click_unlock'] || 0,

      // Step 8: Checkout Stripe foi criado (URL gerada)
      paymentCheckoutCreated: eventCounts['funnel_payment_checkout_created'] || 0,
      paymentCheckoutCreatedSessions: eventSessions['funnel_payment_checkout_created'] || 0,

      // ============ PÁGINA: result.html (/scan/{id}/result?just_paid=1) ============
      // Step 9: Usuario voltou do Stripe com pagamento confirmado
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

      // Scan Started -> Result View
      scanToResult: funnel.scanStarted > 0
        ? ((funnel.resultPageView / funnel.scanStarted) * 100).toFixed(1)
        : '0',

      // Result View -> Payment Page View
      resultToPayment: funnel.resultPageView > 0
        ? ((funnel.paymentPageView / funnel.resultPageView) * 100).toFixed(1)
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
      resultAbandonment: funnel.scanStarted - funnel.resultPageView,
      beforePayment: funnel.resultPageView - funnel.paymentPageView,
      beforeUnlock: funnel.paymentPageView - funnel.paymentClickUnlock,
      beforeCheckout: funnel.paymentClickUnlock - funnel.paymentCheckoutCreated,
      checkoutAbandonment: funnel.paymentCheckoutCreated - funnel.conversionPaymentSuccess,
      totalErrors: funnel.errorScanApi + funnel.errorScanValidation + funnel.errorPayment,
    };

    // Funil como array para visualizacao (diagrama)
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
        dropoutNext: dropouts.resultAbandonment,
      },
      {
        step: 5,
        name: 'Pág. de Resultado',
        event: 'funnel_result_page_view',
        count: funnel.resultPageView,
        sessions: funnel.resultPageViewSessions,
        percentage: conversions.scanToResult + '%',
        dropoutNext: dropouts.beforePayment,
      },
      {
        step: 6,
        name: 'Pág. de Desbloqueio',
        event: 'funnel_payment_page_view',
        count: funnel.paymentPageView,
        sessions: funnel.paymentPageViewSessions,
        percentage: conversions.resultToPayment + '%',
        dropoutNext: dropouts.beforeUnlock,
      },
      {
        step: 7,
        name: 'Clicou Desbloquear',
        event: 'funnel_payment_click_unlock',
        count: funnel.paymentClickUnlock,
        sessions: funnel.paymentClickUnlockSessions,
        percentage: conversions.paymentToUnlock + '%',
        dropoutNext: dropouts.beforeCheckout,
      },
      {
        step: 8,
        name: 'Checkout Criado',
        event: 'funnel_payment_checkout_created',
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
      dropouts,
      daily: dailyData,
      utmSources: utmQuery.rows,
      rawEvents: eventCounts,
    });
  } catch (err) {
    console.error('Error fetching analytics funnel:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
