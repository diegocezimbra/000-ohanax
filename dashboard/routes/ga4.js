import express from 'express';

const router = express.Router();

// Configuracoes do GA4 - usar variaveis de ambiente
const GA4_CONFIG = {
  clientId: process.env.GA4_CLIENT_ID,
  clientSecret: process.env.GA4_CLIENT_SECRET,
  refreshToken: process.env.GA4_REFRESH_TOKEN,
  propertyId: process.env.GA4_PROPERTY_ID || '518739213'
};

// Cache do token
let tokenCache = {
  access_token: null,
  expires_at: 0
};

// Renovar token OAuth2
async function refreshAccessToken() {
  // Verificar cache
  if (tokenCache.access_token && Date.now() < tokenCache.expires_at - 60000) {
    return tokenCache.access_token;
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

    // Atualizar cache
    tokenCache = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000)
    };

    return data.access_token;
  } catch (error) {
    console.error('Erro ao renovar token GA4:', error);
    throw error;
  }
}

// Endpoint para obter token
router.get('/token', async (req, res) => {
  try {
    const access_token = await refreshAccessToken();
    res.json({ access_token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para metricas de sessao
router.get('/metrics', async (req, res) => {
  try {
    const token = await refreshAccessToken();
    const days = req.query.days || 7;

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
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para eventos
router.get('/events', async (req, res) => {
  try {
    const token = await refreshAccessToken();
    const days = req.query.days || 7;
    const limit = req.query.limit || 20;

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
        limit: parseInt(limit)
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para funil
router.post('/funnel', async (req, res) => {
  try {
    const token = await refreshAccessToken();
    const { steps, days = 30 } = req.body;

    const defaultSteps = [
      { name: 'Page View', filterExpression: { funnelEventFilter: { eventName: 'page_view' } } },
      { name: 'Scan Start', filterExpression: { funnelEventFilter: { eventName: 'scan_start' } } },
      { name: 'Checkout Start', filterExpression: { funnelEventFilter: { eventName: 'checkout_start' } } }
    ];

    const response = await fetch(`https://analyticsdata.googleapis.com/v1alpha/properties/${GA4_CONFIG.propertyId}:runFunnelReport`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        funnel: {
          steps: steps || defaultSteps
        }
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para paginas mais visitadas
router.get('/pages', async (req, res) => {
  try {
    const token = await refreshAccessToken();
    const days = req.query.days || 7;
    const limit = req.query.limit || 10;

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
        limit: parseInt(limit)
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
