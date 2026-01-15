import { db } from '../db.js';

// Configuracoes do GA4 - usar variaveis de ambiente
const GA4_CONFIG = {
  clientId: process.env.GA4_CLIENT_ID,
  clientSecret: process.env.GA4_CLIENT_SECRET,
  refreshToken: process.env.GA4_REFRESH_TOKEN,
  propertyId: process.env.GA4_PROPERTY_ID || '518739213'
};

// Cache do token GA4
let ga4TokenCache = {
  access_token: null,
  expires_at: 0
};

// Renovar token OAuth2 do GA4
async function refreshGA4Token() {
  if (ga4TokenCache.access_token && Date.now() < ga4TokenCache.expires_at - 60000) {
    return ga4TokenCache.access_token;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: GA4_CONFIG.refreshToken,
        client_id: GA4_CONFIG.clientId,
        client_secret: GA4_CONFIG.clientSecret,
        grant_type: 'refresh_token'
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    ga4TokenCache = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    };

    return data.access_token;
  } catch (error) {
    console.error('[SYNC] Erro ao renovar token GA4:', error.message);
    throw error;
  }
}

// Salvar dados no cache
async function saveToCache(source, metricType, dateRange, data) {
  const query = `
    INSERT INTO analytics_cache (source, metric_type, date_range, data, fetched_at)
    VALUES ($1, $2, $3, $4, NOW())
    ON CONFLICT (source, metric_type, date_range)
    DO UPDATE SET data = $4, fetched_at = NOW()
  `;
  await db.analytics.query(query, [source, metricType, dateRange, JSON.stringify(data)]);
}

// Buscar do cache
async function getFromCache(source, metricType, dateRange) {
  const result = await db.analytics.query(
    'SELECT data, fetched_at FROM analytics_cache WHERE source = $1 AND metric_type = $2 AND date_range = $3',
    [source, metricType, dateRange]
  );
  return result.rows[0] || null;
}

// Atualizar last_sync
async function updateLastSync(source) {
  await db.analytics.query(
    'UPDATE sync_config SET last_sync = NOW() WHERE source = $1',
    [source]
  );
}

// Verificar se deve sincronizar
async function shouldSync(source) {
  const result = await db.analytics.query(
    'SELECT last_sync, sync_interval_minutes, enabled FROM sync_config WHERE source = $1',
    [source]
  );

  if (!result.rows[0] || !result.rows[0].enabled) return false;

  const { last_sync, sync_interval_minutes } = result.rows[0];
  if (!last_sync) return true;

  const minutesSinceLastSync = (Date.now() - new Date(last_sync).getTime()) / (1000 * 60);
  return minutesSinceLastSync >= sync_interval_minutes;
}

// ============================================================================
// GA4 SYNC FUNCTIONS
// ============================================================================

async function syncGA4Metrics(days = 7) {
  console.log(`[SYNC] Sincronizando metricas GA4 (${days} dias)...`);

  try {
    const token = await refreshGA4Token();

    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_CONFIG.propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' }
        ]
      })
    });

    const data = await response.json();
    await saveToCache('ga4', 'session_metrics', `${days}d`, data);
    console.log('[SYNC] Metricas GA4 salvas com sucesso');
    return data;
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar metricas GA4:', error.message);
    throw error;
  }
}

async function syncGA4Events(days = 7) {
  console.log(`[SYNC] Sincronizando eventos GA4 (${days} dias)...`);

  try {
    const token = await refreshGA4Token();

    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_CONFIG.propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        limit: 50
      })
    });

    const data = await response.json();
    await saveToCache('ga4', 'events', `${days}d`, data);
    console.log('[SYNC] Eventos GA4 salvos com sucesso');
    return data;
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar eventos GA4:', error.message);
    throw error;
  }
}

async function syncGA4Pages(days = 7) {
  console.log(`[SYNC] Sincronizando paginas GA4 (${days} dias)...`);

  try {
    const token = await refreshGA4Token();

    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_CONFIG.propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        limit: 20
      })
    });

    const data = await response.json();
    await saveToCache('ga4', 'pages', `${days}d`, data);
    console.log('[SYNC] Paginas GA4 salvas com sucesso');
    return data;
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar paginas GA4:', error.message);
    throw error;
  }
}

async function syncGA4TrafficSource(days = 7) {
  console.log(`[SYNC] Sincronizando fontes de trafego GA4 (${days} dias)...`);

  try {
    const token = await refreshGA4Token();

    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_CONFIG.propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [
          { name: 'sessionSource' },
          { name: 'sessionMedium' },
          { name: 'sessionCampaign' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'conversions' }
        ],
        limit: 50
      })
    });

    const data = await response.json();
    await saveToCache('ga4', 'traffic_source', `${days}d`, data);
    console.log('[SYNC] Fontes de trafego GA4 salvas com sucesso');
    return data;
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar fontes de trafego GA4:', error.message);
    throw error;
  }
}

async function syncGA4Funnel() {
  console.log('[SYNC] Sincronizando funil GA4...');

  try {
    const token = await refreshGA4Token();

    const response = await fetch(`https://analyticsdata.googleapis.com/v1alpha/properties/${GA4_CONFIG.propertyId}:runFunnelReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        funnel: {
          steps: [
            { name: 'Page View', filterExpression: { funnelEventFilter: { eventName: 'page_view' } } },
            { name: 'Scan Start', filterExpression: { funnelEventFilter: { eventName: 'scan_start' } } },
            { name: 'Checkout Start', filterExpression: { funnelEventFilter: { eventName: 'checkout_start' } } }
          ]
        }
      })
    });

    const data = await response.json();
    await saveToCache('ga4', 'funnel_scan', '30d', data);
    console.log('[SYNC] Funil GA4 salvo com sucesso');
    return data;
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar funil GA4:', error.message);
    throw error;
  }
}

// ============================================================================
// SYNC UTM/INFLUENCER DATA
// ============================================================================

async function syncInfluencerMetrics(days = 7) {
  console.log(`[SYNC] Sincronizando metricas de influenciadores (${days} dias)...`);

  try {
    const token = await refreshGA4Token();

    // Buscar sessoes por utm_content (codigo do influenciador)
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${GA4_CONFIG.propertyId}:runReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [
          { name: 'date' },
          { name: 'sessionCampaign' },
          { name: 'customEvent:utm_content' }
        ],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' }
        ],
        dimensionFilter: {
          filter: {
            fieldName: 'sessionCampaign',
            stringFilter: {
              matchType: 'BEGINS_WITH',
              value: 'influencer_'
            }
          }
        },
        limit: 1000
      })
    });

    const data = await response.json();
    await saveToCache('ga4', 'influencer_traffic', `${days}d`, data);

    // Processar e salvar metricas por influenciador
    if (data.rows) {
      for (const row of data.rows) {
        const date = row.dimensionValues[0]?.value;
        const campaign = row.dimensionValues[1]?.value;
        const utmContent = row.dimensionValues[2]?.value;
        const sessions = parseInt(row.metricValues[0]?.value || '0');

        if (utmContent && date) {
          // Buscar influenciador pelo codigo
          const influencerResult = await db.analytics.query(
            'SELECT id FROM influencers WHERE code = $1',
            [utmContent]
          );

          if (influencerResult.rows[0]) {
            const influencerId = influencerResult.rows[0].id;
            const formattedDate = `${date.substring(0,4)}-${date.substring(4,6)}-${date.substring(6,8)}`;

            await db.analytics.query(`
              INSERT INTO influencer_metrics (influencer_id, date, visits)
              VALUES ($1, $2, $3)
              ON CONFLICT (influencer_id, date)
              DO UPDATE SET visits = influencer_metrics.visits + $3
            `, [influencerId, formattedDate, sessions]);
          }
        }
      }
    }

    console.log('[SYNC] Metricas de influenciadores salvas com sucesso');
    return data;
  } catch (error) {
    console.error('[SYNC] Erro ao sincronizar metricas de influenciadores:', error.message);
    throw error;
  }
}

// ============================================================================
// MAIN SYNC FUNCTIONS
// ============================================================================

async function syncAllGA4() {
  console.log('[SYNC] Iniciando sincronizacao completa do GA4...');

  try {
    // Sincronizar diferentes periodos
    await syncGA4Metrics(7);
    await syncGA4Metrics(30);
    await syncGA4Events(7);
    await syncGA4Events(30);
    await syncGA4Pages(7);
    await syncGA4TrafficSource(7);
    await syncGA4TrafficSource(30);
    await syncGA4Funnel();
    await syncInfluencerMetrics(7);

    await updateLastSync('ga4');
    console.log('[SYNC] Sincronizacao GA4 concluida com sucesso');

    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('[SYNC] Erro na sincronizacao GA4:', error.message);
    return { success: false, error: error.message };
  }
}

// Sync automatico
let syncInterval = null;

function startAutoSync(intervalMinutes = 60) {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  console.log(`[SYNC] Iniciando auto-sync a cada ${intervalMinutes} minutos`);

  // Executar imediatamente
  syncAllGA4();

  // Configurar intervalo
  syncInterval = setInterval(() => {
    syncAllGA4();
  }, intervalMinutes * 60 * 1000);
}

function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[SYNC] Auto-sync parado');
  }
}

export const syncService = {
  // Cache functions
  getFromCache,
  saveToCache,
  shouldSync,

  // GA4 sync
  syncGA4Metrics,
  syncGA4Events,
  syncGA4Pages,
  syncGA4TrafficSource,
  syncGA4Funnel,
  syncInfluencerMetrics,
  syncAllGA4,

  // Auto sync
  startAutoSync,
  stopAutoSync,

  // Token refresh (para uso externo se necessario)
  refreshGA4Token
};
