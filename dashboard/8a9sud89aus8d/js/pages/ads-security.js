// =============================================================================
// ADS SECURITY PAGE MODULE
// Handles Meta (Facebook/Instagram) Ads Analysis for Security
// =============================================================================

let charts = {};
let chartTheme = {};
let formatCurrency = null;
let formatDate = null;
let formatDateTime = null;
let formatNumber = null;
let adsData = null; // Store loaded ads data for filtering

/**
 * Initialize the ads-security module with dependencies
 * @param {Object} deps - Dependencies object
 */
export function initAdsSecurityModule(deps) {
  charts = deps.charts || {};
  chartTheme = deps.chartTheme || {};
  formatCurrency = deps.formatCurrency || ((v) => `R$ ${v.toFixed(2)}`);
  formatDate = deps.formatDate || ((d) => d);
  formatDateTime = deps.formatDateTime || ((d) => d);
  formatNumber = deps.formatNumber || ((n) => n.toLocaleString('pt-BR'));
}

/**
 * Get date range from period selector
 */
function getDateRange() {
  const periodSelect = document.getElementById('ads-security-period');
  const period = periodSelect ? periodSelect.value : '30';

  if (period === 'custom') {
    const startDate = document.getElementById('ads-security-start-date').value;
    const endDate = document.getElementById('ads-security-end-date').value;
    return { startDate, endDate };
  }

  const days = parseInt(period);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * Format currency in BRL
 */
function formatBRL(value) {
  if (value === null || value === undefined) return 'R$ --';
  return `R$ ${parseFloat(value).toFixed(2)}`;
}

/**
 * Format percentage
 */
function formatPercent(value) {
  if (value === null || value === undefined) return '--%';
  return `${parseFloat(value).toFixed(2)}%`;
}

/**
 * Format large numbers
 */
function formatLargeNumber(value) {
  if (value === null || value === undefined) return '--';
  if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
  if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
  return value.toLocaleString('pt-BR');
}

/**
 * Get status badge HTML
 */
function getStatusBadge(status) {
  if (!status) return '<span class="status-badge" style="background: #64748b;">--</span>';
  return `<span class="status-badge" style="background: ${status.color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${status.label}</span>`;
}

/**
 * Get priority badge HTML
 */
function getPriorityBadge(priority) {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6',
    info: '#64748b',
  };
  const labels = {
    high: 'Alta',
    medium: 'Media',
    low: 'Baixa',
    info: 'Info',
  };
  return `<span style="background: ${colors[priority]}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${labels[priority]}</span>`;
}

/**
 * Main function to load ads security page
 */
export async function loadAdsSecurityPage() {
  const { startDate, endDate } = getDateRange();

  // Load all data in parallel
  await Promise.all([
    loadOverviewMetrics(startDate, endDate),
    loadAdsData(startDate, endDate),
    loadDailyChart(startDate, endDate),
    loadCampaigns(),
  ]);
}

/**
 * Load overview metrics (top cards)
 */
async function loadOverviewMetrics(startDate, endDate) {
  try {
    const response = await fetch(`/api/ads/security/insights?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();

    if (data.error) {
      console.error('Error loading insights:', data.error);
      return;
    }

    const metrics = data.metrics || {};

    // Update top cards
    document.getElementById('ads-total-spend').textContent = formatBRL(metrics.spend);
    document.getElementById('ads-total-impressions').textContent = formatLargeNumber(metrics.impressions);
    document.getElementById('ads-total-clicks').textContent = formatLargeNumber(metrics.clicks);
    document.getElementById('ads-total-leads').textContent = formatLargeNumber(metrics.leads);

    // Update metrics cards
    document.getElementById('ads-ctr').textContent = formatPercent(metrics.ctr);
    document.getElementById('ads-cpc').textContent = formatBRL(metrics.cpc);
    document.getElementById('ads-cpm').textContent = formatBRL(metrics.cpm);
    document.getElementById('ads-cpl').textContent = metrics.cpl ? formatBRL(metrics.cpl) : 'R$ --';

  } catch (err) {
    console.error('Error loading overview metrics:', err);
  }
}

/**
 * Load ads data with status and recommendations
 */
async function loadAdsData(startDate, endDate) {
  try {
    const response = await fetch(`/api/ads/security/ads?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();

    if (data.error) {
      console.error('Error loading ads:', data.error);
      document.getElementById('ads-table').innerHTML = `<tr><td colspan="10" style="color: #ef4444;">Erro: ${data.error}</td></tr>`;
      return;
    }

    // Store data for filtering
    adsData = data;

    // Update status counts
    const summary = data.summary || {};
    const byStatus = summary.byStatus || {};

    document.getElementById('ads-status-learning').textContent = byStatus.learning || 0;
    document.getElementById('ads-status-healthy').textContent = byStatus.healthy || 0;
    document.getElementById('ads-status-warning').textContent = byStatus.warning || 0;
    document.getElementById('ads-status-critical').textContent = byStatus.critical || 0;
    document.getElementById('ads-status-scaling').textContent = byStatus.scaling || 0;
    document.getElementById('ads-status-paused').textContent = byStatus.paused || 0;

    // Update total count
    document.getElementById('ads-total-count').textContent = summary.totalAds || 0;

    // Render ads table
    renderAdsTable(data.ads || []);

    // Load recommendations
    loadRecommendations(data.ads || []);

  } catch (err) {
    console.error('Error loading ads data:', err);
    document.getElementById('ads-table').innerHTML = `<tr><td colspan="10" style="color: #ef4444;">Erro ao carregar: ${err.message}</td></tr>`;
  }
}

/**
 * Render ads table
 */
function renderAdsTable(ads) {
  const tbody = document.getElementById('ads-table');

  if (!ads || ads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="color: #64748b;">Nenhum anuncio encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = ads.map(ad => {
    const metrics = ad.metrics || {};
    const status = ad.optimizerStatus || {};
    const rec = ad.recommendation;

    return `
      <tr data-status="${status.code || ''}">
        <td>${getStatusBadge(status)}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ad.name}">${ad.name}</td>
        <td>${formatBRL(metrics.spend)}</td>
        <td>${formatLargeNumber(metrics.impressions)}</td>
        <td>${formatLargeNumber(metrics.clicks)}</td>
        <td>${formatPercent(metrics.ctr)}</td>
        <td>${formatBRL(metrics.cpc)}</td>
        <td style="color: ${metrics.leads > 0 ? '#22c55e' : '#64748b'};">${metrics.leads || 0}</td>
        <td style="color: ${metrics.cpl ? '#f59e0b' : '#64748b'};">${metrics.cpl ? formatBRL(metrics.cpl) : '--'}</td>
        <td style="font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rec?.reason || ''}">
          ${rec ? `<span style="color: ${getRecommendationColor(rec.priority)};">${rec.action}</span>` : '--'}
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Get recommendation color based on priority
 */
function getRecommendationColor(priority) {
  const colors = {
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#3b82f6',
    info: '#64748b',
  };
  return colors[priority] || '#64748b';
}

/**
 * Filter ads table by status
 */
export function filterAdsTable() {
  if (!adsData) return;

  const filter = document.getElementById('ads-filter-status').value;
  const filteredAds = filter
    ? adsData.ads.filter(ad => ad.optimizerStatus?.code === filter)
    : adsData.ads;

  renderAdsTable(filteredAds);
}

/**
 * Load and render recommendations
 */
function loadRecommendations(ads) {
  const container = document.getElementById('ads-recommendations-list');

  // Filter ads with recommendations
  const recommendations = ads
    .filter(ad => ad.recommendation)
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2, info: 3 };
      return priorityOrder[a.recommendation.priority] - priorityOrder[b.recommendation.priority];
    });

  // Update high priority count
  const highPriority = recommendations.filter(r => r.recommendation.priority === 'high').length;
  document.getElementById('ads-recommendations-high').textContent = highPriority;

  if (recommendations.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #64748b;">
        <div style="font-size: 48px; margin-bottom: 12px;">&#10003;</div>
        <div>Nenhuma recomendacao pendente!</div>
        <div style="font-size: 12px; margin-top: 4px;">Todos os anuncios estao com desempenho adequado.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = recommendations.map(ad => {
    const rec = ad.recommendation;
    const metrics = ad.metrics || {};
    const status = ad.optimizerStatus || {};

    return `
      <div style="background: ${getRecommendationBg(rec.priority)}; border: 1px solid ${getRecommendationBorder(rec.priority)}; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${getPriorityBadge(rec.priority)}
            ${getStatusBadge(status)}
            <span style="font-weight: 600; color: #f1f5f9;">${ad.name}</span>
          </div>
          <span style="font-size: 12px; color: #64748b;">${ad.daysActive} dias ativo</span>
        </div>
        <div style="font-size: 13px; color: #94a3b8; margin-bottom: 12px;">${rec.reason}</div>
        <div style="display: flex; gap: 16px; font-size: 11px; color: #64748b;">
          <span>Gasto: <strong style="color: #f1f5f9;">${formatBRL(metrics.spend)}</strong></span>
          <span>Leads: <strong style="color: ${metrics.leads > 0 ? '#22c55e' : '#f1f5f9'};">${metrics.leads}</strong></span>
          <span>CTR: <strong style="color: #f1f5f9;">${formatPercent(metrics.ctr)}</strong></span>
          <span>CPL: <strong style="color: ${metrics.cpl ? '#f59e0b' : '#f1f5f9'};">${metrics.cpl ? formatBRL(metrics.cpl) : '--'}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Get recommendation background color
 */
function getRecommendationBg(priority) {
  const colors = {
    high: 'rgba(239, 68, 68, 0.1)',
    medium: 'rgba(245, 158, 11, 0.1)',
    low: 'rgba(59, 130, 246, 0.1)',
    info: 'rgba(100, 116, 139, 0.1)',
  };
  return colors[priority] || colors.info;
}

/**
 * Get recommendation border color
 */
function getRecommendationBorder(priority) {
  const colors = {
    high: 'rgba(239, 68, 68, 0.3)',
    medium: 'rgba(245, 158, 11, 0.3)',
    low: 'rgba(59, 130, 246, 0.3)',
    info: 'rgba(100, 116, 139, 0.3)',
  };
  return colors[priority] || colors.info;
}

/**
 * Load daily insights chart
 */
async function loadDailyChart(startDate, endDate) {
  try {
    const response = await fetch(`/api/ads/security/daily-insights?startDate=${startDate}&endDate=${endDate}`);
    const data = await response.json();

    if (data.error) {
      console.error('Error loading daily insights:', data.error);
      return;
    }

    const daily = data.daily || [];

    // Destroy existing chart
    if (charts.adsDaily) {
      charts.adsDaily.destroy();
    }

    const chartEl = document.getElementById('ads-daily-chart');
    if (!chartEl) return;

    charts.adsDaily = new ApexCharts(chartEl, {
      chart: {
        type: 'line',
        height: 280,
        background: chartTheme.background || 'transparent',
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif',
      },
      series: [
        {
          name: 'Gasto (R$)',
          type: 'area',
          data: daily.map(d => ({ x: d.date, y: d.spend })),
        },
        {
          name: 'Leads',
          type: 'line',
          data: daily.map(d => ({ x: d.date, y: d.leads })),
        },
      ],
      colors: ['#3b82f6', '#22c55e'],
      stroke: {
        curve: 'smooth',
        width: [2, 3],
      },
      fill: {
        type: ['gradient', 'solid'],
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.3,
          opacityFrom: 0.4,
          opacityTo: 0.1,
        },
      },
      xaxis: {
        type: 'datetime',
        labels: {
          style: { colors: '#64748b', fontSize: '11px' },
          format: 'dd/MM',
        },
      },
      yaxis: [
        {
          title: { text: 'Gasto (R$)', style: { color: '#64748b', fontSize: '11px' } },
          labels: {
            style: { colors: '#64748b', fontSize: '11px' },
            formatter: (v) => `R$ ${v.toFixed(0)}`,
          },
        },
        {
          opposite: true,
          title: { text: 'Leads', style: { color: '#64748b', fontSize: '11px' } },
          labels: {
            style: { colors: '#64748b', fontSize: '11px' },
            formatter: (v) => v.toFixed(0),
          },
        },
      ],
      legend: {
        position: 'top',
        horizontalAlign: 'left',
        labels: { colors: '#94a3b8' },
      },
      tooltip: {
        theme: 'dark',
        x: { format: 'dd/MM/yyyy' },
      },
      grid: {
        borderColor: '#334155',
        strokeDashArray: 3,
      },
    });

    charts.adsDaily.render();

  } catch (err) {
    console.error('Error loading daily chart:', err);
  }
}

/**
 * Load campaigns list
 */
async function loadCampaigns() {
  try {
    const response = await fetch('/api/ads/security/campaigns');
    const data = await response.json();

    if (data.error) {
      console.error('Error loading campaigns:', data.error);
      document.getElementById('ads-campaigns-table').innerHTML = `<tr><td colspan="6" style="color: #ef4444;">Erro: ${data.error}</td></tr>`;
      return;
    }

    const campaigns = data.campaigns || [];
    const tbody = document.getElementById('ads-campaigns-table');

    if (campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="color: #64748b;">Nenhuma campanha encontrada</td></tr>';
      return;
    }

    tbody.innerHTML = campaigns.map(campaign => {
      const statusColor = campaign.status === 'ACTIVE' ? '#22c55e' : '#64748b';
      const dailyBudget = campaign.daily_budget ? (parseInt(campaign.daily_budget) / 100).toFixed(2) : '--';
      const budgetRemaining = campaign.budget_remaining ? (parseInt(campaign.budget_remaining) / 100).toFixed(2) : '--';

      return `
        <tr>
          <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${campaign.name}">${campaign.name}</td>
          <td><span style="color: ${statusColor};">${campaign.status}</span></td>
          <td>${campaign.objective || '--'}</td>
          <td>R$ ${dailyBudget}</td>
          <td>R$ ${budgetRemaining}</td>
          <td>${campaign.created_time ? new Date(campaign.created_time).toLocaleDateString('pt-BR') : '--'}</td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading campaigns:', err);
    document.getElementById('ads-campaigns-table').innerHTML = `<tr><td colspan="6" style="color: #ef4444;">Erro ao carregar: ${err.message}</td></tr>`;
  }
}
