import express from 'express';
import { metaConfig, autoOptimizerRules, adStatus } from '../config/meta.js';

const router = express.Router();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Faz requisicao para a API do Meta
 */
async function fetchMeta(endpoint, params = {}) {
  const url = new URL(`${metaConfig.baseUrl}/${metaConfig.apiVersion}/${endpoint}`);
  url.searchParams.append('access_token', metaConfig.userAccessToken);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Erro na API do Meta');
  }

  return data;
}

/**
 * Calcula metricas derivadas
 */
function calculateDerivedMetrics(insights) {
  const spend = parseFloat(insights.spend || 0);
  const impressions = parseInt(insights.impressions || 0);
  const clicks = parseInt(insights.clicks || 0);
  const reach = parseInt(insights.reach || 0);

  // Buscar conversoes (leads)
  let leads = 0;
  let purchases = 0;

  if (insights.actions) {
    for (const action of insights.actions) {
      if (action.action_type === 'lead') {
        leads = parseInt(action.value || 0);
      }
      if (action.action_type === 'purchase' || action.action_type === 'omni_purchase') {
        purchases = parseInt(action.value || 0);
      }
    }
  }

  // Buscar valor de conversao
  let conversionValue = 0;
  if (insights.action_values) {
    for (const av of insights.action_values) {
      if (av.action_type === 'purchase' || av.action_type === 'omni_purchase') {
        conversionValue = parseFloat(av.value || 0);
      }
    }
  }

  return {
    spend,
    impressions,
    clicks,
    reach,
    leads,
    purchases,
    conversionValue,
    ctr: impressions > 0 ? (clicks / impressions * 100) : 0,
    cpc: clicks > 0 ? (spend / clicks) : 0,
    cpm: impressions > 0 ? (spend / impressions * 1000) : 0,
    cpl: leads > 0 ? (spend / leads) : null,
    roas: spend > 0 && conversionValue > 0 ? (conversionValue / spend) : null,
    frequency: reach > 0 ? (impressions / reach) : 0,
  };
}

/**
 * Determina o status de um anuncio baseado nas regras do Auto-Optimizer
 */
function determineAdStatus(metrics, campaignAvgCpl, daysActive) {
  const { stopLoss, accelerator, explorer } = autoOptimizerRules;

  // Status pausado
  if (metrics.status === 'PAUSED') {
    return adStatus.PAUSED;
  }

  // Explorer - fase de aprendizado
  if (metrics.impressions < explorer.conditions.maxImpressions ||
      daysActive < explorer.conditions.maxDaysActive) {
    return adStatus.LEARNING;
  }

  // Stop Loss - desempenho critico
  if (metrics.impressions >= stopLoss.conditions.minImpressions) {
    // CTR muito baixo
    if (metrics.ctr < stopLoss.conditions.minCtr) {
      return adStatus.CRITICAL;
    }

    // CPL muito alto (se tiver leads)
    if (campaignAvgCpl && metrics.cpl && metrics.cpl > campaignAvgCpl * stopLoss.conditions.cplMultiplier) {
      return adStatus.CRITICAL;
    }

    // Gasto alto sem conversoes
    if (metrics.spend > stopLoss.conditions.minSpendWithoutConversion && metrics.leads === 0) {
      return adStatus.CRITICAL;
    }
  }

  // Accelerator - alto desempenho
  if (metrics.leads >= accelerator.conditions.minConversions) {
    // CTR alto
    if (metrics.ctr >= accelerator.conditions.minCtr) {
      return adStatus.SCALING;
    }

    // CPL baixo
    if (campaignAvgCpl && metrics.cpl && metrics.cpl < campaignAvgCpl * accelerator.conditions.cplMultiplier) {
      return adStatus.SCALING;
    }

    // ROAS alto
    if (metrics.roas && metrics.roas >= accelerator.conditions.minRoas) {
      return adStatus.SCALING;
    }
  }

  // Warning - abaixo do esperado mas nao critico
  if (metrics.ctr < 1 || (campaignAvgCpl && metrics.cpl && metrics.cpl > campaignAvgCpl * 1.5)) {
    return adStatus.WARNING;
  }

  // Healthy - tudo ok
  return adStatus.HEALTHY;
}

/**
 * Gera recomendacao baseada no status
 */
function generateRecommendation(status, metrics, adName) {
  switch (status.code) {
    case 'CRITICAL':
      if (metrics.ctr < autoOptimizerRules.stopLoss.conditions.minCtr) {
        return {
          action: 'PAUSE',
          reason: `CTR muito baixo (${metrics.ctr.toFixed(2)}%). Considere pausar "${adName}" e testar novo criativo.`,
          priority: 'high',
        };
      }
      if (metrics.spend > autoOptimizerRules.stopLoss.conditions.minSpendWithoutConversion && metrics.leads === 0) {
        return {
          action: 'PAUSE',
          reason: `R$${metrics.spend.toFixed(2)} gastos sem conversoes em "${adName}". Considere pausar.`,
          priority: 'high',
        };
      }
      return {
        action: 'PAUSE',
        reason: `Desempenho critico em "${adName}". Considere pausar e revisar estrategia.`,
        priority: 'high',
      };

    case 'SCALING':
      return {
        action: 'SCALE',
        reason: `"${adName}" tem excelente desempenho! Considere aumentar orcamento em 20%.`,
        priority: 'medium',
      };

    case 'WARNING':
      return {
        action: 'MONITOR',
        reason: `"${adName}" precisa de atencao. CTR: ${metrics.ctr.toFixed(2)}%, CPL: R$${metrics.cpl?.toFixed(2) || 'N/A'}`,
        priority: 'low',
      };

    case 'LEARNING':
      return {
        action: 'WAIT',
        reason: `"${adName}" em fase de aprendizado. Aguarde mais dados antes de otimizar.`,
        priority: 'info',
      };

    default:
      return null;
  }
}

// =============================================================================
// ENDPOINTS
// =============================================================================

/**
 * GET /api/ads/security/campaigns
 * Lista campanhas da conta Security
 */
router.get('/security/campaigns', async (req, res) => {
  try {
    const data = await fetchMeta(`act_${metaConfig.adAccountId}/campaigns`, {
      fields: metaConfig.campaignFields,
      limit: 50,
    });

    res.json({
      campaigns: data.data || [],
      paging: data.paging,
    });
  } catch (err) {
    console.error('Error fetching campaigns:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ads/security/campaign/:id
 * Detalhes de uma campanha especifica
 */
router.get('/security/campaign/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchMeta(id, {
      fields: metaConfig.campaignFields,
    });

    res.json(data);
  } catch (err) {
    console.error('Error fetching campaign:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ads/security/insights
 * Insights gerais da conta (agregado)
 */
router.get('/security/insights', async (req, res) => {
  try {
    const { startDate, endDate, level = 'account' } = req.query;

    const timeRange = startDate && endDate
      ? JSON.stringify({ since: startDate, until: endDate })
      : JSON.stringify({ since: getDefaultStartDate(), until: getDefaultEndDate() });

    const data = await fetchMeta(`act_${metaConfig.adAccountId}/insights`, {
      fields: metaConfig.insightFields,
      time_range: timeRange,
      level,
    });

    const insights = data.data?.[0] || {};
    const metrics = calculateDerivedMetrics(insights);

    res.json({
      raw: insights,
      metrics,
      period: { startDate, endDate },
    });
  } catch (err) {
    console.error('Error fetching insights:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ads/security/adsets
 * Lista adsets da campanha principal
 */
router.get('/security/adsets', async (req, res) => {
  try {
    const { campaignId = metaConfig.campaignId } = req.query;

    const data = await fetchMeta(`${campaignId}/adsets`, {
      fields: metaConfig.adsetFields,
      limit: 100,
    });

    res.json({
      adsets: data.data || [],
      paging: data.paging,
    });
  } catch (err) {
    console.error('Error fetching adsets:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ads/security/ads
 * Lista todos os ads com insights e status
 */
router.get('/security/ads', async (req, res) => {
  try {
    const { startDate, endDate, campaignId = metaConfig.campaignId } = req.query;

    const start = startDate || getDefaultStartDate();
    const end = endDate || getDefaultEndDate();
    const timeRange = JSON.stringify({ since: start, until: end });

    // Buscar ads
    const adsData = await fetchMeta(`${campaignId}/ads`, {
      fields: 'id,name,status,created_time,updated_time,adset_id',
      limit: 100,
    });

    const ads = adsData.data || [];

    // Buscar insights de cada ad
    const adsWithInsights = await Promise.all(
      ads.map(async (ad) => {
        try {
          const insightsData = await fetchMeta(`${ad.id}/insights`, {
            fields: metaConfig.insightFields,
            time_range: timeRange,
          });

          const insights = insightsData.data?.[0] || {};
          const metrics = calculateDerivedMetrics(insights);

          // Calcular dias ativo
          const createdDate = new Date(ad.created_time);
          const now = new Date();
          const daysActive = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

          return {
            ...ad,
            insights,
            metrics,
            daysActive,
          };
        } catch (err) {
          return {
            ...ad,
            insights: {},
            metrics: calculateDerivedMetrics({}),
            daysActive: 0,
            error: err.message,
          };
        }
      })
    );

    // Calcular CPL medio da campanha para comparacao
    const totalSpend = adsWithInsights.reduce((sum, ad) => sum + ad.metrics.spend, 0);
    const totalLeads = adsWithInsights.reduce((sum, ad) => sum + ad.metrics.leads, 0);
    const campaignAvgCpl = totalLeads > 0 ? totalSpend / totalLeads : null;

    // Adicionar status e recomendacao a cada ad
    const adsWithStatus = adsWithInsights.map((ad) => {
      const status = determineAdStatus(
        { ...ad.metrics, status: ad.status },
        campaignAvgCpl,
        ad.daysActive
      );
      const recommendation = generateRecommendation(status, ad.metrics, ad.name);

      return {
        ...ad,
        optimizerStatus: status,
        recommendation,
      };
    });

    // Ordenar por gasto (maior primeiro)
    adsWithStatus.sort((a, b) => b.metrics.spend - a.metrics.spend);

    res.json({
      ads: adsWithStatus,
      summary: {
        totalAds: ads.length,
        totalSpend,
        totalLeads,
        avgCpl: campaignAvgCpl,
        byStatus: {
          learning: adsWithStatus.filter(a => a.optimizerStatus.code === 'LEARNING').length,
          healthy: adsWithStatus.filter(a => a.optimizerStatus.code === 'HEALTHY').length,
          warning: adsWithStatus.filter(a => a.optimizerStatus.code === 'WARNING').length,
          critical: adsWithStatus.filter(a => a.optimizerStatus.code === 'CRITICAL').length,
          scaling: adsWithStatus.filter(a => a.optimizerStatus.code === 'SCALING').length,
          paused: adsWithStatus.filter(a => a.optimizerStatus.code === 'PAUSED').length,
        },
      },
      period: { startDate: start, endDate: end },
    });
  } catch (err) {
    console.error('Error fetching ads:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ads/security/recommendations
 * Lista todas as recomendacoes ativas
 */
router.get('/security/recommendations', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Reutilizar endpoint de ads
    const adsResponse = await new Promise((resolve, reject) => {
      const mockReq = { query: { startDate, endDate } };
      const mockRes = {
        json: resolve,
        status: () => ({ json: reject }),
      };
      router.handle({ ...mockReq, method: 'GET', url: '/security/ads' }, mockRes);
    });

    // Filtrar apenas ads com recomendacoes
    const recommendations = adsResponse.ads
      .filter(ad => ad.recommendation)
      .map(ad => ({
        adId: ad.id,
        adName: ad.name,
        status: ad.optimizerStatus,
        metrics: {
          spend: ad.metrics.spend,
          leads: ad.metrics.leads,
          cpl: ad.metrics.cpl,
          ctr: ad.metrics.ctr,
          roas: ad.metrics.roas,
        },
        recommendation: ad.recommendation,
      }))
      .sort((a, b) => {
        // Ordenar por prioridade
        const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
        return priorityOrder[a.recommendation.priority] - priorityOrder[b.recommendation.priority];
      });

    res.json({
      recommendations,
      summary: {
        total: recommendations.length,
        byPriority: {
          high: recommendations.filter(r => r.recommendation.priority === 'high').length,
          medium: recommendations.filter(r => r.recommendation.priority === 'medium').length,
          low: recommendations.filter(r => r.recommendation.priority === 'low').length,
          info: recommendations.filter(r => r.recommendation.priority === 'info').length,
        },
      },
    });
  } catch (err) {
    console.error('Error fetching recommendations:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ads/security/daily-insights
 * Insights por dia para graficos
 */
router.get('/security/daily-insights', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate || getDefaultStartDate();
    const end = endDate || getDefaultEndDate();
    const timeRange = JSON.stringify({ since: start, until: end });

    const data = await fetchMeta(`act_${metaConfig.adAccountId}/insights`, {
      fields: metaConfig.insightFields,
      time_range: timeRange,
      time_increment: 1, // daily breakdown
    });

    const dailyInsights = (data.data || []).map(day => ({
      date: day.date_start,
      ...calculateDerivedMetrics(day),
    }));

    res.json({
      daily: dailyInsights,
      period: { startDate: start, endDate: end },
    });
  } catch (err) {
    console.error('Error fetching daily insights:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ads/security/overview
 * Overview completo para dashboard
 */
router.get('/security/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate || getDefaultStartDate();
    const end = endDate || getDefaultEndDate();
    const timeRange = JSON.stringify({ since: start, until: end });

    // Buscar dados em paralelo
    const [accountInsights, campaigns, dailyInsights] = await Promise.all([
      fetchMeta(`act_${metaConfig.adAccountId}/insights`, {
        fields: metaConfig.insightFields,
        time_range: timeRange,
      }),
      fetchMeta(`act_${metaConfig.adAccountId}/campaigns`, {
        fields: metaConfig.campaignFields,
        filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED'] }]),
      }),
      fetchMeta(`act_${metaConfig.adAccountId}/insights`, {
        fields: 'spend,impressions,clicks,actions',
        time_range: timeRange,
        time_increment: 1,
      }),
    ]);

    const metrics = calculateDerivedMetrics(accountInsights.data?.[0] || {});

    const daily = (dailyInsights.data || []).map(day => ({
      date: day.date_start,
      ...calculateDerivedMetrics(day),
    }));

    res.json({
      metrics,
      campaigns: campaigns.data || [],
      daily,
      period: { startDate: start, endDate: end },
    });
  } catch (err) {
    console.error('Error fetching overview:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helpers para datas padrao
function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate() {
  return new Date().toISOString().split('T')[0];
}

export default router;
