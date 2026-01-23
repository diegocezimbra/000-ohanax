import express from 'express';
import { metaConfig, autoOptimizerRules, adStatus } from '../config/meta.js';
import { db } from '../db.js';

const router = express.Router();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Busca leads internos do banco security_analytics_events
 * Lead = funnel_scan_form_submit (usuario submeteu formulario e iniciou scan)
 * Isso representa o sucesso do anuncio em trazer trafego qualificado
 */
async function getInternalLeads(startDate, endDate) {
  try {
    const result = await db.analytics.query(`
      SELECT
        COUNT(*) FILTER (WHERE event_name = 'funnel_scan_form_submit') as form_submits,
        COUNT(*) FILTER (WHERE event_name = 'funnel_scan_started') as scans_started,
        COUNT(*) FILTER (WHERE event_name = 'conversion_payment_success') as payments,
        COUNT(DISTINCT session_id) as unique_sessions
      FROM security_analytics_events
      WHERE created_at >= $1 AND created_at <= $2::date + INTERVAL '1 day'
    `, [startDate, endDate]);

    return {
      leads: parseInt(result.rows[0]?.form_submits) || 0,
      scansStarted: parseInt(result.rows[0]?.scans_started) || 0,
      payments: parseInt(result.rows[0]?.payments) || 0,
      sessions: parseInt(result.rows[0]?.unique_sessions) || 0,
    };
  } catch (err) {
    console.error('[Ads] Error fetching internal leads:', err.message);
    return { leads: 0, scansStarted: 0, payments: 0, sessions: 0 };
  }
}

/**
 * Busca leads internos por dia para graficos
 */
async function getInternalLeadsDaily(startDate, endDate) {
  try {
    const result = await db.analytics.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE event_name = 'funnel_scan_form_submit') as leads,
        COUNT(*) FILTER (WHERE event_name = 'conversion_payment_success') as payments
      FROM security_analytics_events
      WHERE created_at >= $1 AND created_at <= $2::date + INTERVAL '1 day'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [startDate, endDate]);

    return result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      leads: parseInt(row.leads) || 0,
      payments: parseInt(row.payments) || 0,
    }));
  } catch (err) {
    console.error('[Ads] Error fetching internal leads daily:', err.message);
    return [];
  }
}

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
 * Extrai URL da landing page do creative
 */
function extractLandingPageUrl(creative) {
  if (!creative) return null;

  // Tentar object_story_spec primeiro
  const storySpec = creative.object_story_spec;
  if (storySpec) {
    // Link ads
    if (storySpec.link_data?.link) {
      return storySpec.link_data.link;
    }
    // Video ads
    if (storySpec.video_data?.call_to_action?.value?.link) {
      return storySpec.video_data.call_to_action.value.link;
    }
  }

  // Tentar asset_feed_spec (para ads dinamicos)
  const feedSpec = creative.asset_feed_spec;
  if (feedSpec?.link_urls?.length > 0) {
    return feedSpec.link_urls[0].website_url || feedSpec.link_urls[0];
  }

  return null;
}

/**
 * Formata targeting info para exibicao
 */
function formatTargeting(targeting) {
  if (!targeting) return { summary: 'N/A', details: {} };

  const parts = [];
  const details = {};

  // Localizacao
  if (targeting.geo_locations) {
    const geo = targeting.geo_locations;
    const locations = [];
    if (geo.countries) locations.push(...geo.countries);
    if (geo.regions) locations.push(...geo.regions.map(r => r.name || r.key));
    if (geo.cities) locations.push(...geo.cities.map(c => c.name || c.key));
    if (locations.length > 0) {
      parts.push(locations.slice(0, 2).join(', '));
      details.locations = locations;
    }
  }

  // Idade
  if (targeting.age_min || targeting.age_max) {
    const ageRange = `${targeting.age_min || 18}-${targeting.age_max || 65}`;
    parts.push(ageRange);
    details.ageRange = ageRange;
  }

  // Genero
  if (targeting.genders && targeting.genders.length > 0) {
    const genderMap = { 1: 'M', 2: 'F' };
    const genders = targeting.genders.map(g => genderMap[g] || g).join('/');
    parts.push(genders);
    details.genders = genders;
  }

  // Interesses (flexible_spec)
  if (targeting.flexible_spec && targeting.flexible_spec.length > 0) {
    const interests = [];
    for (const spec of targeting.flexible_spec) {
      if (spec.interests) {
        interests.push(...spec.interests.map(i => i.name));
      }
      if (spec.behaviors) {
        interests.push(...spec.behaviors.map(b => b.name));
      }
    }
    if (interests.length > 0) {
      details.interests = interests;
      parts.push(interests.slice(0, 2).join(', '));
    }
  }

  // Custom audiences
  if (targeting.custom_audiences && targeting.custom_audiences.length > 0) {
    details.customAudiences = targeting.custom_audiences.map(ca => ca.name);
    parts.push('Custom');
  }

  // Lookalike
  if (targeting.connections && targeting.connections.length > 0) {
    parts.push('Conexoes');
    details.connections = true;
  }

  return {
    summary: parts.length > 0 ? parts.join(' | ') : 'Broad',
    details,
  };
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
 *
 * IMPORTANTE: Leads agora vem do banco interno (security_analytics_events)
 */
router.get('/security/insights', async (req, res) => {
  try {
    const { startDate, endDate, level = 'account' } = req.query;

    const start = startDate || getDefaultStartDate();
    const end = endDate || getDefaultEndDate();
    const timeRange = JSON.stringify({ since: start, until: end });

    // Buscar dados do Meta e leads internos em paralelo
    const [metaData, internalLeads] = await Promise.all([
      fetchMeta(`act_${metaConfig.adAccountId}/insights`, {
        fields: metaConfig.insightFields,
        time_range: timeRange,
        level,
      }),
      getInternalLeads(start, end),
    ]);

    const insights = metaData.data?.[0] || {};
    const metrics = calculateDerivedMetrics(insights);

    // Substituir leads do Meta pelos leads internos
    const leadsInternal = internalLeads.leads || 0;
    metrics.leadsMeta = metrics.leads; // Guardar original para comparacao
    metrics.leads = leadsInternal;
    metrics.cpl = leadsInternal > 0 ? metrics.spend / leadsInternal : null;

    // Adicionar metricas extras do funil interno
    metrics.scansStarted = internalLeads.scansStarted;
    metrics.payments = internalLeads.payments;
    metrics.sessions = internalLeads.sessions;

    res.json({
      raw: insights,
      metrics,
      internalLeads,
      period: { startDate: start, endDate: end },
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
 *
 * IMPORTANTE: Leads agora vem do banco interno (security_analytics_events)
 * Lead = funnel_scan_form_submit (usuario submeteu formulario)
 * Isso representa o sucesso do anuncio em trazer trafego qualificado
 * A conversao final (pagamento) depende da landing page, nao do anuncio
 */
router.get('/security/ads', async (req, res) => {
  try {
    const { startDate, endDate, campaignId = metaConfig.campaignId, showPaused = 'false' } = req.query;

    const start = startDate || getDefaultStartDate();
    const end = endDate || getDefaultEndDate();
    const timeRange = JSON.stringify({ since: start, until: end });

    // Buscar leads internos do banco (funnel_scan_form_submit)
    const internalLeads = await getInternalLeads(start, end);
    console.log(`[Ads] Internal leads for ${start} to ${end}:`, internalLeads);

    // Buscar adsets primeiro para ter targeting info
    const adsetsData = await fetchMeta(`act_${metaConfig.adAccountId}/adsets`, {
      fields: 'id,name,targeting',
      limit: 200,
    });

    // Criar mapa de targeting por adset_id
    const adsetTargetingMap = {};
    for (const adset of adsetsData.data || []) {
      adsetTargetingMap[adset.id] = {
        name: adset.name,
        targeting: adset.targeting || {},
      };
    }

    // Buscar ads da conta inteira (todas as campanhas) - filtrar apenas ACTIVE
    // Inclui creative para pegar landing page URL
    const adsData = await fetchMeta(`act_${metaConfig.adAccountId}/ads`, {
      fields: 'id,name,status,created_time,updated_time,adset_id,campaign_id,creative{id,effective_object_story_id,object_story_spec,asset_feed_spec}',
      filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: showPaused === 'true' ? ['ACTIVE', 'PAUSED'] : ['ACTIVE'] }]),
      limit: 200,
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

          // Extrair targeting do adset
          const adsetInfo = adsetTargetingMap[ad.adset_id] || {};
          const targeting = formatTargeting(adsetInfo.targeting);

          // Extrair landing page URL do creative
          const landingPageUrl = extractLandingPageUrl(ad.creative);

          return {
            ...ad,
            insights,
            metrics,
            daysActive,
            targeting,
            adsetName: adsetInfo.name || null,
            landingPageUrl,
          };
        } catch (err) {
          return {
            ...ad,
            insights: {},
            metrics: calculateDerivedMetrics({}),
            daysActive: 0,
            targeting: { summary: 'N/A', details: {} },
            landingPageUrl: null,
            error: err.message,
          };
        }
      })
    );

    // =======================================================================
    // LEADS: Distribuir leads internos proporcionalmente por cliques
    // =======================================================================
    // Como nao temos tracking por ad individual, distribuimos os leads
    // proporcionalmente aos cliques de cada anuncio.
    // Isso é mais justo do que mostrar 0 para todos ou o total para todos.
    // =======================================================================
    const totalClicks = adsWithInsights.reduce((sum, ad) => sum + (ad.metrics.clicks || 0), 0);
    const totalInternalLeads = internalLeads.leads || 0;

    // Recalcular leads e CPL para cada ad baseado na proporcao de cliques
    const adsWithInternalLeads = adsWithInsights.map((ad) => {
      const clickShare = totalClicks > 0 ? (ad.metrics.clicks || 0) / totalClicks : 0;
      const estimatedLeads = Math.round(totalInternalLeads * clickShare);

      // Recalcular CPL com leads internos
      const newCpl = estimatedLeads > 0 ? ad.metrics.spend / estimatedLeads : null;

      return {
        ...ad,
        metrics: {
          ...ad.metrics,
          leads: estimatedLeads,
          leadsInternal: estimatedLeads, // Para debug
          leadsMeta: ad.metrics.leads, // Leads originais do Meta (para comparacao)
          cpl: newCpl,
          clickShare: (clickShare * 100).toFixed(1) + '%',
        },
      };
    });

    // Calcular CPL medio da campanha para comparacao
    const totalSpend = adsWithInternalLeads.reduce((sum, ad) => sum + ad.metrics.spend, 0);
    const totalLeads = totalInternalLeads; // Usar leads internos
    const campaignAvgCpl = totalLeads > 0 ? totalSpend / totalLeads : null;

    // Adicionar status e recomendacao a cada ad
    const adsWithStatus = adsWithInternalLeads.map((ad) => {
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
        // Dados internos para debug/transparencia
        internalLeads: {
          formSubmits: internalLeads.leads,
          scansStarted: internalLeads.scansStarted,
          payments: internalLeads.payments,
          sessions: internalLeads.sessions,
        },
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
 *
 * IMPORTANTE: Leads agora vem do banco interno (security_analytics_events)
 */
router.get('/security/daily-insights', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate || getDefaultStartDate();
    const end = endDate || getDefaultEndDate();
    const timeRange = JSON.stringify({ since: start, until: end });

    // Buscar dados do Meta e leads internos por dia em paralelo
    const [metaData, internalLeadsDaily] = await Promise.all([
      fetchMeta(`act_${metaConfig.adAccountId}/insights`, {
        fields: metaConfig.insightFields,
        time_range: timeRange,
        time_increment: 1, // daily breakdown
      }),
      getInternalLeadsDaily(start, end),
    ]);

    // Criar mapa de leads internos por data
    const leadsMap = {};
    for (const day of internalLeadsDaily) {
      leadsMap[day.date] = day;
    }

    // Combinar dados do Meta com leads internos
    const dailyInsights = (metaData.data || []).map(day => {
      const metrics = calculateDerivedMetrics(day);
      const internalDay = leadsMap[day.date_start] || { leads: 0, payments: 0 };

      // Substituir leads do Meta pelos internos
      metrics.leadsMeta = metrics.leads;
      metrics.leads = internalDay.leads;
      metrics.payments = internalDay.payments;
      metrics.cpl = internalDay.leads > 0 ? metrics.spend / internalDay.leads : null;

      return {
        date: day.date_start,
        ...metrics,
      };
    });

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
