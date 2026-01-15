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

    // Build funnel data - usando nomes corretos dos eventos do Security
    const funnel = {
      // Step 1: Page View - usuário acessou /scan
      pageView: events['funnel_trial_page_view'] || events['page_view_trial'] || visitorData.pageviews || 0,

      // Step 2: Form Start - usuário começou a preencher o formulário
      formStart: events['funnel_trial_form_start'] || events['form_start_trial'] || 0,

      // Step 3: Form Submit - usuário submeteu o formulário
      formSubmit: events['funnel_trial_form_submit'] || parseInt(trialsStarted.rows[0]?.total) || 0,

      // Step 4: Scan Started - scan iniciou processamento
      scanStarted: events['funnel_trial_scan_started'] || 0,

      // Step 5: Result View - usuário viu o resultado do scan
      resultView: events['funnel_trial_result_view'] || parseInt(trialsCompleted.rows[0]?.total) || 0,

      // Step 6a: Click Register - usuário clicou para se registrar
      clickRegister: events['funnel_trial_click_register'] || 0,

      // Step 6b: Click Login - usuário clicou para fazer login
      clickLogin: events['funnel_trial_click_login'] || 0,

      // Step 7: Checkout Start - usuário iniciou checkout
      checkoutStart: events['conversion_checkout_start'] || 0,

      // Step 8: Checkout Success - pagamento concluído
      checkoutSuccess: events['conversion_checkout_success'] || parseInt(trialsPaid.rows[0]?.total) || 0,

      // Erros
      scanError: events['error_scan'] || events['feature_scan_failed'] || 0,

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
    const funnelSteps = [
      { step: 1, name: 'Page View', event: 'funnel_trial_page_view', count: funnel.pageView },
      { step: 2, name: 'Form Start', event: 'funnel_trial_form_start', count: funnel.formStart },
      { step: 3, name: 'Form Submit', event: 'funnel_trial_form_submit', count: funnel.formSubmit },
      { step: 4, name: 'Scan Started', event: 'funnel_trial_scan_started', count: funnel.scanStarted },
      { step: 5, name: 'Result View', event: 'funnel_trial_result_view', count: funnel.resultView },
      { step: 6, name: 'Action (Register/Login)', event: 'funnel_trial_click_*', count: funnel.clickRegister + funnel.clickLogin },
      { step: 7, name: 'Checkout Start', event: 'conversion_checkout_start', count: funnel.checkoutStart },
      { step: 8, name: 'Purchase Complete', event: 'conversion_checkout_success', count: funnel.checkoutSuccess },
    ];

    // Descrições para leigos entenderem cada métrica
    const descriptions = {
      _about: 'Este funil mostra a jornada do usuário desde que acessa a página de scan gratuito até efetuar o pagamento. Os dados vêm do Umami (ferramenta de analytics) que rastreia cliques e ações no site.',

      funnel: {
        pageView: 'Quantas pessoas abriram a página do scan gratuito. É o ponto de entrada do funil.',
        formStart: 'Quantas pessoas começaram a preencher o formulário (clicaram em algum campo). Mostra interesse inicial.',
        formSubmit: 'Quantas pessoas enviaram o formulário completo para iniciar o scan.',
        scanStarted: 'Quantos scans efetivamente começaram a rodar no servidor.',
        resultView: 'Quantas pessoas viram o resultado do scan (a página com as vulnerabilidades encontradas).',
        clickRegister: 'Quantas pessoas clicaram no botão "Criar conta gratuita" após ver o resultado.',
        clickLogin: 'Quantas pessoas clicaram em "Já tenho conta - Fazer login" após ver o resultado.',
        checkoutStart: 'Quantas pessoas iniciaram o processo de pagamento.',
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

export default router;
