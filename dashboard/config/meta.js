/**
 * Configuracao da API Meta (Facebook/Instagram Ads)
 *
 * IMPORTANTE: Em producao, mover tokens para variaveis de ambiente
 */

export const metaConfig = {
  // API Version
  apiVersion: 'v21.0',
  baseUrl: 'https://graph.facebook.com',

  // Tokens
  userAccessToken: 'EAAdhZAywZAWOoBQUNPJ5ZCsy46z79S9SDfSxK0WqW0zTmbxNRZB7I5y7twYk9bDhbWQ7WbiDgbs7VNkdPTFM20rh3v49tq8HDdT6xZB7HGPrUipowVTaszNohovuIFzlCfGZA1LKMcy2i0BPW1AUiwsolni3AkinqPDfl9KxxAuwhB6EWUaMriZCnJAjTaZCLwZDZD',
  pageAccessToken: 'EAAdhZAywZAWOoBQVyeZAiU4TChIdDGBaze64u7CE9atZB160vJonW1AkQuBZBj0WIPNBUESqy1ZCtRoa04DEDn9a9GymBBb3tmCi7LjFGnohMOeeTSdeZBSPWBOPAV8no6BB2KCzH1VMkWjyLTd17QWECxlFjr35sZBeUgw2HotnZBEUMgbbPDafe5Ua0erk3LUF2i5oc',

  // IDs
  adAccountId: '354686431783766',
  pageId: '330409406821958',
  instagramId: '17841466860212532',
  campaignId: '120236244665850680', // Video v5 campaign (36 ads)

  // Campos padrao para buscar campanhas
  campaignFields: [
    'id',
    'name',
    'status',
    'objective',
    'created_time',
    'updated_time',
    'daily_budget',
    'lifetime_budget',
    'budget_remaining',
  ].join(','),

  // Campos de insights
  insightFields: [
    'impressions',
    'reach',
    'clicks',
    'spend',
    'cpc',
    'cpm',
    'ctr',
    'frequency',
    'actions',
    'cost_per_action_type',
    'conversions',
    'cost_per_conversion',
  ].join(','),

  // Campos de adsets
  adsetFields: [
    'id',
    'name',
    'status',
    'daily_budget',
    'lifetime_budget',
    'budget_remaining',
    'optimization_goal',
    'billing_event',
    'targeting',
    'created_time',
    'updated_time',
  ].join(','),

  // Campos de ads
  adFields: [
    'id',
    'name',
    'status',
    'creative',
    'created_time',
    'updated_time',
  ].join(','),
};

/**
 * Regras do Auto-Optimizer
 */
export const autoOptimizerRules = {
  // Stop Loss - Parar anuncios com baixo desempenho
  stopLoss: {
    name: 'Stop Loss',
    description: 'Pausar anuncios com custo por lead muito alto ou CTR muito baixo',
    conditions: {
      // Se CPL > 3x media da campanha
      cplMultiplier: 3,
      // Se CTR < 0.5%
      minCtr: 0.5,
      // Se gasto > R$50 sem conversoes
      minSpendWithoutConversion: 50,
      // Minimo de impressoes para avaliar
      minImpressions: 1000,
    },
    action: 'PAUSE',
    status: 'CRITICAL',
  },

  // Accelerator - Escalar anuncios de alto desempenho
  accelerator: {
    name: 'Accelerator',
    description: 'Aumentar orcamento de anuncios com excelente desempenho',
    conditions: {
      // Se CPL < 0.5x media da campanha
      cplMultiplier: 0.5,
      // Se CTR > 2%
      minCtr: 2,
      // Se ROAS > 3
      minRoas: 3,
      // Minimo de conversoes para validar
      minConversions: 5,
    },
    action: 'SCALE',
    status: 'SCALING',
    budgetIncrease: 1.2, // +20%
  },

  // Explorer - Testar novas variacoes
  explorer: {
    name: 'Explorer',
    description: 'Identificar anuncios em fase de aprendizado que precisam de mais dados',
    conditions: {
      // Menos de X impressoes
      maxImpressions: 500,
      // Menos de X dias ativo
      maxDaysActive: 3,
    },
    action: 'MONITOR',
    status: 'LEARNING',
  },
};

/**
 * Status codes para anuncios
 */
export const adStatus = {
  LEARNING: {
    code: 'LEARNING',
    label: 'Aprendizado',
    color: '#3b82f6', // blue
    description: 'Coletando dados para otimizacao',
  },
  HEALTHY: {
    code: 'HEALTHY',
    label: 'Saudavel',
    color: '#22c55e', // green
    description: 'Desempenho dentro do esperado',
  },
  WARNING: {
    code: 'WARNING',
    label: 'Atencao',
    color: '#f59e0b', // amber
    description: 'Desempenho abaixo do ideal',
  },
  CRITICAL: {
    code: 'CRITICAL',
    label: 'Critico',
    color: '#ef4444', // red
    description: 'Desempenho muito abaixo, considerar pausar',
  },
  SCALING: {
    code: 'SCALING',
    label: 'Escalando',
    color: '#8b5cf6', // purple
    description: 'Alto desempenho, candidato a escala',
  },
  PAUSED: {
    code: 'PAUSED',
    label: 'Pausado',
    color: '#6b7280', // gray
    description: 'Anuncio pausado',
  },
  COOLDOWN: {
    code: 'COOLDOWN',
    label: 'Cooldown',
    color: '#06b6d4', // cyan
    description: 'Aguardando periodo de estabilizacao',
  },
};

export default metaConfig;
