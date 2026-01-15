// =============================================================================
// PAGE LOADER
// =============================================================================
let currentPage = 'overview';
const pageCache = {};

async function loadPage(pageName) {
  const container = document.getElementById('page-content');

  // Check cache first
  if (pageCache[pageName]) {
    container.innerHTML = pageCache[pageName];
    currentPage = pageName;
    loadPageData(pageName);
    return;
  }

  // Show loading
  container.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) throw new Error('Page not found');
    const html = await response.text();
    pageCache[pageName] = html;
    container.innerHTML = html;
    currentPage = pageName;
    loadPageData(pageName);
  } catch (err) {
    console.error(`Error loading page ${pageName}:`, err);
    container.innerHTML = '<div class="loading">Erro ao carregar pagina</div>';
  }
}

function loadPageData(pageName) {
  switch (pageName) {
    case 'overview':
      loadOverview();
      break;
    case 'users':
      loadUsersPage();
      break;
    case 'paying':
      loadPayingPage();
      break;
    case 'revenue':
      loadRevenuePage();
      break;
    default:
      loadProjectPage(pageName);
  }
}

// =============================================================================
// NAVIGATION
// =============================================================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    loadPage(item.dataset.page);
  });
});

// =============================================================================
// HELPERS / FORMATTERS
// =============================================================================
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
}

// =============================================================================
// DATE FILTER
// =============================================================================
function getDateRange(page) {
  const periodSelect = document.getElementById(`${page}-period`);
  const period = periodSelect ? periodSelect.value : '30';

  if (period === 'custom') {
    const startDate = document.getElementById(`${page}-start-date`).value;
    const endDate = document.getElementById(`${page}-end-date`).value;
    return { startDate, endDate, days: null };
  }

  const days = parseInt(period);
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    days
  };
}

function onPeriodChange(page) {
  const periodSelect = document.getElementById(`${page}-period`);
  const customDates = document.getElementById(`${page}-custom-dates`);

  if (periodSelect.value === 'custom') {
    customDates.style.display = 'flex';
  } else {
    customDates.style.display = 'none';
    loadPageData(page);
  }
}

// =============================================================================
// CHARTS
// =============================================================================
let charts = {};

// =============================================================================
// PROJECT MAPPING
// =============================================================================
const projectMapping = {
  'auth': 'app-auth',
  'billing': 'app-billing',
  'security': 'security-audit',
  'oentregador': 'app-oentregador'
};

// =============================================================================
// LOAD ALL DATA (reload current page)
// =============================================================================
async function loadAllData() {
  loadPageData(currentPage);
}

// =============================================================================
// OVERVIEW PAGE
// =============================================================================
async function loadOverview() {
  try {
    const data = await fetch('/api/overview').then(r => r.json());

    const totalMrrEl = document.getElementById('total-mrr');
    const totalOnetimeEl = document.getElementById('total-onetime');
    const totalRevenueEl = document.getElementById('total-revenue');
    const totalArrEl = document.getElementById('total-arr');
    const totalUsersEl = document.getElementById('total-users');
    const activeSubsEl = document.getElementById('active-subs');
    const totalPurchasesEl = document.getElementById('total-purchases');
    const totalCustomersEl = document.getElementById('total-customers');

    if (totalMrrEl) totalMrrEl.textContent = formatCurrency(data.totalMrr);
    if (totalOnetimeEl) totalOnetimeEl.textContent = formatCurrency(data.totalOneTimeRevenue || 0);
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(data.totalRevenue || data.totalMrr);
    if (totalArrEl) totalArrEl.textContent = formatCurrency(data.totalMrr * 12);
    if (totalUsersEl) totalUsersEl.textContent = data.totalUsers || 0;
    if (activeSubsEl) activeSubsEl.textContent = data.totalActiveSubs || 0;
    if (totalPurchasesEl) totalPurchasesEl.textContent = data.totalPaidPurchases || 0;
    if (totalCustomersEl) totalCustomersEl.textContent = (data.totalActiveSubs || 0) + (data.totalPaidPurchases || 0);

    const subscribersTableEl = document.getElementById('overview-subscribers-table');
    if (subscribersTableEl) {
      subscribersTableEl.innerHTML = data.recentSubscribers.map(s => `
        <tr>
          <td>${s.email}</td>
          <td>${s.plan_name || '-'}</td>
          <td>${s.project_name || '-'}</td>
          <td>${formatCurrency(s.mrr)}</td>
          <td><span class="status ${s.status}">${s.status}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="5">Sem assinantes</td></tr>';
    }

    // Render ApexCharts
    renderOverviewCharts(data);

  } catch (err) { console.error('Error loading overview:', err); }

  // Load funnel data
  try {
    const funnelData = await fetch('/api/funnel').then(r => r.json());
    renderFunnelChart(funnelData);
  } catch (err) { console.error('Error loading funnel:', err); }
}

// =============================================================================
// APEXCHARTS RENDERING
// =============================================================================
// Dark theme colors matching CSS variables
const chartTheme = {
  background: 'transparent',
  textColor: '#a1a1aa',
  gridColor: '#27272a',
  tooltipBg: '#18181b',
  tooltipBorder: '#27272a'
};

function renderOverviewCharts(data) {
  const projectColors = {
    'app-auth': '#8b5cf6',
    'app-billing': '#10b981',
    'security-audit': '#ef4444',
    'app-oentregador': '#f59e0b',
    'oentregador': '#f59e0b',
    'app-post-automation': '#06b6d4',
    'cardapio-digital': '#ec4899',
    'redutor-inss': '#6366f1'
  };

  // MRR by Project - Bar Chart
  const mrrProjectEl = document.getElementById('chart-mrr-project');
  if (mrrProjectEl && data.mrrByProject.length > 0) {
    if (charts.mrrProject) charts.mrrProject.destroy();
    charts.mrrProject = new ApexCharts(mrrProjectEl, {
      chart: {
        type: 'bar',
        height: 300,
        background: chartTheme.background,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      series: [{
        name: 'MRR',
        data: data.mrrByProject.map(p => p.mrr || 0)
      }],
      xaxis: {
        categories: data.mrrByProject.map(p => formatProjectName(p.project_name)),
        labels: { style: { colors: chartTheme.textColor, fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: chartTheme.textColor, fontSize: '11px' },
          formatter: (val) => 'R$ ' + val.toLocaleString('pt-BR')
        }
      },
      colors: data.mrrByProject.map(p => projectColors[p.project_name] || '#3b82f6'),
      plotOptions: {
        bar: {
          borderRadius: 4,
          distributed: true,
          columnWidth: '55%'
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val) => 'R$ ' + val.toLocaleString('pt-BR'),
        style: { colors: ['#fff'], fontSize: '11px', fontWeight: 600 },
        offsetY: -20
      },
      legend: { show: false },
      grid: { borderColor: chartTheme.gridColor, strokeDashArray: 3 },
      tooltip: {
        theme: 'dark',
        style: { fontSize: '12px' }
      }
    });
    charts.mrrProject.render();
  }

  // Users by Project - Donut Chart
  const usersProjectEl = document.getElementById('chart-users-project');
  if (usersProjectEl && data.usersByProject.length > 0) {
    if (charts.usersProject) charts.usersProject.destroy();
    charts.usersProject = new ApexCharts(usersProjectEl, {
      chart: {
        type: 'donut',
        height: 300,
        background: chartTheme.background,
        fontFamily: 'Inter, sans-serif'
      },
      series: data.usersByProject.map(p => p.total_users || 0),
      labels: data.usersByProject.map(p => formatProjectName(p.project_name)),
      colors: data.usersByProject.map(p => projectColors[p.project_name] || '#3b82f6'),
      dataLabels: {
        enabled: true,
        style: { fontSize: '12px', fontWeight: 600 }
      },
      legend: {
        position: 'bottom',
        labels: { colors: chartTheme.textColor },
        fontSize: '12px'
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              name: { color: chartTheme.textColor, fontSize: '12px' },
              value: { color: '#fafafa', fontSize: '20px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 },
              total: {
                show: true,
                label: 'Total',
                color: chartTheme.textColor,
                fontSize: '12px',
                formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString('pt-BR')
              }
            }
          }
        }
      },
      stroke: { show: false },
      tooltip: { theme: 'dark', style: { fontSize: '12px' } }
    });
    charts.usersProject.render();
  }

  // Revenue Distribution - Pie Chart
  const revenueDistEl = document.getElementById('chart-revenue-dist');
  if (revenueDistEl) {
    if (charts.revenueDist) charts.revenueDist.destroy();
    const mrrTotal = data.totalMrr || 0;
    const onetimeTotal = data.totalOneTimeRevenue || 0;
    charts.revenueDist = new ApexCharts(revenueDistEl, {
      chart: {
        type: 'pie',
        height: 300,
        background: chartTheme.background,
        fontFamily: 'Inter, sans-serif'
      },
      series: [mrrTotal, onetimeTotal],
      labels: ['MRR (Recorrente)', 'One-Time'],
      colors: ['#10b981', '#3b82f6'],
      dataLabels: {
        enabled: true,
        formatter: (val, opts) => formatCurrency(opts.w.globals.series[opts.seriesIndex]),
        style: { fontSize: '11px', fontWeight: 600 }
      },
      legend: {
        position: 'bottom',
        labels: { colors: chartTheme.textColor },
        fontSize: '12px'
      },
      stroke: { show: false },
      tooltip: { theme: 'dark', style: { fontSize: '12px' } }
    });
    charts.revenueDist.render();
  }

  // Subscribers by Status - Radial Bar
  const subsStatusEl = document.getElementById('chart-subs-status');
  if (subsStatusEl && data.subsByStatus && data.subsByStatus.length > 0) {
    if (charts.subsStatus) charts.subsStatus.destroy();

    // Convert array to object { active: count, trialing: count, ... }
    const statusData = {};
    data.subsByStatus.forEach(s => {
      statusData[s.status] = parseInt(s.count) || 0;
    });

    const total = (statusData.active || 0) + (statusData.trialing || 0) + (statusData.canceled || 0);
    const activePercent = total > 0 ? Math.round((statusData.active || 0) / total * 100) : 0;
    const trialPercent = total > 0 ? Math.round((statusData.trialing || 0) / total * 100) : 0;
    const canceledPercent = total > 0 ? Math.round((statusData.canceled || 0) / total * 100) : 0;

    charts.subsStatus = new ApexCharts(subsStatusEl, {
      chart: {
        type: 'radialBar',
        height: 300,
        background: chartTheme.background,
        fontFamily: 'Inter, sans-serif'
      },
      series: [activePercent, trialPercent, canceledPercent],
      labels: ['Ativos', 'Trial', 'Cancelados'],
      colors: ['#10b981', '#3b82f6', '#ef4444'],
      plotOptions: {
        radialBar: {
          hollow: { size: '40%' },
          track: { background: '#27272a' },
          dataLabels: {
            name: { fontSize: '12px', color: chartTheme.textColor },
            value: { fontSize: '18px', color: '#fafafa', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, formatter: (val) => val + '%' },
            total: {
              show: true,
              label: 'Total',
              color: chartTheme.textColor,
              fontSize: '12px',
              formatter: () => total
            }
          }
        }
      },
      legend: {
        show: true,
        position: 'bottom',
        labels: { colors: chartTheme.textColor },
        fontSize: '12px'
      }
    });
    charts.subsStatus.render();
  }

  // Projects Comparison - Grouped Bar Chart
  const comparisonEl = document.getElementById('chart-projects-comparison');
  if (comparisonEl && data.mrrByProject.length > 0 && data.usersByProject.length > 0) {
    if (charts.comparison) charts.comparison.destroy();

    const projectNames = [...new Set([
      ...data.mrrByProject.map(p => p.project_name),
      ...data.usersByProject.map(p => p.project_name)
    ])];

    charts.comparison = new ApexCharts(comparisonEl, {
      chart: {
        type: 'bar',
        height: 350,
        background: chartTheme.background,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      series: [
        {
          name: 'MRR (R$)',
          data: projectNames.map(name => {
            const proj = data.mrrByProject.find(p => p.project_name === name);
            return proj ? proj.mrr : 0;
          })
        },
        {
          name: 'Usuarios',
          data: projectNames.map(name => {
            const proj = data.usersByProject.find(p => p.project_name === name);
            return proj ? proj.total_users : 0;
          })
        },
        {
          name: 'Assinantes Ativos',
          data: projectNames.map(name => {
            const proj = data.mrrByProject.find(p => p.project_name === name);
            return proj ? proj.active_subs : 0;
          })
        }
      ],
      xaxis: {
        categories: projectNames.map(formatProjectName),
        labels: { style: { colors: chartTheme.textColor, fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: chartTheme.textColor, fontSize: '11px' } }
      },
      colors: ['#10b981', '#3b82f6', '#f59e0b'],
      plotOptions: {
        bar: { borderRadius: 3, columnWidth: '65%' }
      },
      dataLabels: { enabled: false },
      legend: {
        position: 'top',
        labels: { colors: chartTheme.textColor },
        fontSize: '12px'
      },
      grid: { borderColor: chartTheme.gridColor, strokeDashArray: 3 },
      tooltip: { theme: 'dark', style: { fontSize: '12px' } }
    });
    charts.comparison.render();
  }
}

// =============================================================================
// FUNNEL CHART WITH APEXCHARTS
// =============================================================================
function renderFunnelChart(data) {
  const visitors = data.details.visitors || 0;
  const registered = data.details.registered || 0;
  const trialing = data.details.trialing || 0;
  const paying = data.details.total_paying || 0;

  // Update stat cards
  const funnelVisitors = document.getElementById('funnel-visitors');
  const funnelRegistered = document.getElementById('funnel-registered');
  const funnelTrial = document.getElementById('funnel-trial');
  const funnelPaying = document.getElementById('funnel-paying');

  if (funnelVisitors) funnelVisitors.textContent = visitors.toLocaleString('pt-BR');
  if (funnelRegistered) funnelRegistered.textContent = registered.toLocaleString('pt-BR');
  if (funnelTrial) funnelTrial.textContent = trialing.toLocaleString('pt-BR');
  if (funnelPaying) funnelPaying.textContent = paying.toLocaleString('pt-BR');

  // Update percentages
  const regPercent = visitors > 0 ? ((registered / visitors) * 100).toFixed(1) : '100';
  const trialPercent = registered > 0 ? ((trialing / registered) * 100).toFixed(1) : '0';
  const payingPercent = visitors > 0 ? ((paying / visitors) * 100).toFixed(1) : '0';

  const regPercentEl = document.getElementById('funnel-reg-percent');
  const trialPercentEl = document.getElementById('funnel-trial-percent');
  const payingPercentEl = document.getElementById('funnel-paying-percent');

  if (regPercentEl) regPercentEl.textContent = regPercent + '% dos visitantes';
  if (trialPercentEl) trialPercentEl.textContent = trialPercent + '% dos cadastros';
  if (payingPercentEl) payingPercentEl.textContent = payingPercent + '% total';

  // Render funnel chart
  const funnelChartEl = document.getElementById('funnel-chart');
  if (funnelChartEl) {
    if (charts.funnel) charts.funnel.destroy();

    charts.funnel = new ApexCharts(funnelChartEl, {
      chart: {
        type: 'bar',
        height: 280,
        background: chartTheme.background,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      series: [{
        name: 'Quantidade',
        data: [visitors, registered, trialing, paying]
      }],
      plotOptions: {
        bar: {
          borderRadius: 6,
          horizontal: true,
          distributed: true,
          barHeight: '65%',
          isFunnel: true
        }
      },
      colors: ['#8b5cf6', '#71717a', '#f59e0b', '#10b981'],
      dataLabels: {
        enabled: true,
        formatter: (val, opt) => {
          const labels = ['Visitantes', 'Cadastrados', 'Trial', 'Pagantes'];
          return labels[opt.dataPointIndex] + ': ' + val.toLocaleString('pt-BR');
        },
        dropShadow: { enabled: false },
        style: { fontSize: '12px', fontWeight: 600, colors: ['#fff'] }
      },
      xaxis: {
        categories: ['Visitantes', 'Cadastrados', 'Trial', 'Pagantes'],
        labels: { show: false }
      },
      yaxis: { labels: { show: false } },
      legend: { show: false },
      grid: { show: false },
      tooltip: { theme: 'dark', style: { fontSize: '12px' } }
    });
    charts.funnel.render();
  }
}

// =============================================================================
// FUNNEL VISUALIZATION FOR PROJECT PAGES
// =============================================================================
function renderProjectFunnel(data, project) {
  const visitors = data.details.visitors || 0;
  const registered = data.details.registered || 0;
  const trialing = data.details.trialing || 0;
  const paying = data.details.total_paying || 0;

  // Update stat cards
  const funnelVisitors = document.getElementById(`${project}-funnel-visitors`);
  const funnelRegistered = document.getElementById(`${project}-funnel-registered`);
  const funnelTrial = document.getElementById(`${project}-funnel-trial`);
  const funnelPaying = document.getElementById(`${project}-funnel-paying`);

  if (funnelVisitors) funnelVisitors.textContent = visitors.toLocaleString('pt-BR');
  if (funnelRegistered) funnelRegistered.textContent = registered.toLocaleString('pt-BR');
  if (funnelTrial) funnelTrial.textContent = trialing.toLocaleString('pt-BR');
  if (funnelPaying) funnelPaying.textContent = paying.toLocaleString('pt-BR');

  // Update percentages
  const regPercent = visitors > 0 ? ((registered / visitors) * 100).toFixed(1) : '100';
  const trialPercent = registered > 0 ? ((trialing / registered) * 100).toFixed(1) : '0';
  const payingPercent = visitors > 0 ? ((paying / visitors) * 100).toFixed(1) : '0';

  const regPercentEl = document.getElementById(`${project}-funnel-reg-percent`);
  const trialPercentEl = document.getElementById(`${project}-funnel-trial-percent`);
  const payingPercentEl = document.getElementById(`${project}-funnel-paying-percent`);

  if (regPercentEl) regPercentEl.textContent = regPercent + '% dos visitantes';
  if (trialPercentEl) trialPercentEl.textContent = trialPercent + '% dos cadastros';
  if (payingPercentEl) payingPercentEl.textContent = payingPercent + '% total';

  // Render funnel chart with ApexCharts
  const funnelChartEl = document.getElementById(`${project}-funnel-chart`);
  if (funnelChartEl) {
    const chartKey = `${project}Funnel`;
    if (charts[chartKey]) charts[chartKey].destroy();

    charts[chartKey] = new ApexCharts(funnelChartEl, {
      chart: {
        type: 'bar',
        height: 280,
        background: chartTheme.background,
        toolbar: { show: false },
        fontFamily: 'Inter, sans-serif'
      },
      series: [{
        name: 'Quantidade',
        data: [visitors, registered, trialing, paying]
      }],
      plotOptions: {
        bar: {
          borderRadius: 6,
          horizontal: true,
          distributed: true,
          barHeight: '65%',
          isFunnel: true
        }
      },
      colors: ['#8b5cf6', '#71717a', '#f59e0b', '#10b981'],
      dataLabels: {
        enabled: true,
        formatter: (val, opt) => {
          const labels = ['Visitantes', 'Cadastrados', 'Trial', 'Pagantes'];
          return labels[opt.dataPointIndex] + ': ' + val.toLocaleString('pt-BR');
        },
        dropShadow: { enabled: false },
        style: { fontSize: '12px', fontWeight: 600, colors: ['#fff'] }
      },
      xaxis: {
        categories: ['Visitantes', 'Cadastrados', 'Trial', 'Pagantes'],
        labels: { show: false }
      },
      yaxis: { labels: { show: false } },
      legend: { show: false },
      grid: { show: false },
      tooltip: { theme: 'dark', style: { fontSize: '12px' } }
    });
    charts[chartKey].render();
  }
}

// =============================================================================
// PROJECT PAGE (Auth, Billing, Security, oEntregador)
// =============================================================================
async function loadProjectPage(project) {
  try {
    const data = await fetch(`/api/project/${project}`).then(r => r.json());

    // Cards principais - nova estrutura igual Overview
    const mrr = data.billing.mrr || 0;
    const oneTimeRevenue = data.one_time?.revenue || 0;
    const totalRevenue = mrr + oneTimeRevenue;
    const activeSubs = data.billing.active || 0;
    const trialingSubs = data.billing.trialing || 0;
    const oneTimeCount = data.one_time?.paid_purchases || 0;
    const uniqueCustomers = activeSubs + oneTimeCount;

    // Row 1: MRR, One-Time Revenue, Total Revenue, Users
    const mrrEl = document.getElementById(`${project}-mrr`);
    const oneTimeRevenueEl = document.getElementById(`${project}-onetime-revenue`);
    const totalRevenueEl = document.getElementById(`${project}-total-revenue`);
    const usersEl = document.getElementById(`${project}-users`);

    if (mrrEl) mrrEl.textContent = formatCurrency(mrr);
    if (oneTimeRevenueEl) oneTimeRevenueEl.textContent = formatCurrency(oneTimeRevenue);
    if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(totalRevenue);
    if (usersEl) usersEl.textContent = data.users.total || 0;

    // Row 2: ARR, Subs, One-Time Count, Unique Customers
    const arrEl = document.getElementById(`${project}-arr`);
    const subsEl = document.getElementById(`${project}-subs`);
    const oneTimeCountEl = document.getElementById(`${project}-onetime-count`);
    const uniqueCustomersEl = document.getElementById(`${project}-unique-customers`);

    if (arrEl) arrEl.textContent = formatCurrency(mrr * 12);
    if (subsEl) subsEl.textContent = activeSubs + trialingSubs;
    if (oneTimeCountEl) oneTimeCountEl.textContent = oneTimeCount;
    if (uniqueCustomersEl) uniqueCustomersEl.textContent = uniqueCustomers;

    // Usuarios
    const usersTotalEl = document.getElementById(`${project}-users-total`);
    const usersVerifiedEl = document.getElementById(`${project}-users-verified`);
    const usersActiveEl = document.getElementById(`${project}-users-active`);
    const usersTodayEl = document.getElementById(`${project}-users-today`);

    if (usersTotalEl) usersTotalEl.textContent = data.users.total || 0;
    if (usersVerifiedEl) usersVerifiedEl.textContent = data.users.verified || 0;
    if (usersActiveEl) usersActiveEl.textContent = data.users.active_7d || 0;
    if (usersTodayEl) usersTodayEl.textContent = data.users.new_today || 0;

    // Assinaturas
    const subsActiveEl = document.getElementById(`${project}-subs-active`);
    const subsTrialEl = document.getElementById(`${project}-subs-trial`);
    const subsCanceledEl = document.getElementById(`${project}-subs-canceled`);
    const revenueEl = document.getElementById(`${project}-revenue`);

    if (subsActiveEl) subsActiveEl.textContent = data.billing.active || 0;
    if (subsTrialEl) subsTrialEl.textContent = data.billing.trialing || 0;
    if (subsCanceledEl) subsCanceledEl.textContent = data.billing.canceled || 0;
    if (revenueEl) revenueEl.textContent = formatCurrency(data.billing.total_revenue);

    // Scan stats (apenas para security)
    if (project === 'security') {
      try {
        const scanData = await fetch('/api/security/scan-stats').then(r => r.json());
        const scansTotalEl = document.getElementById('security-scans-total');
        const scansPaidEl = document.getElementById('security-scans-paid');
        const scansFreeEl = document.getElementById('security-scans-free');
        const scansTrialEl = document.getElementById('security-scans-trial');
        const paidPercentEl = document.getElementById('security-paid-percentage');

        if (scansTotalEl) scansTotalEl.textContent = scanData.total_scans || 0;
        if (scansPaidEl) scansPaidEl.textContent = scanData.paid_scans || 0;
        if (scansFreeEl) scansFreeEl.textContent = scanData.free_scans || 0;
        if (scansTrialEl) scansTrialEl.textContent = scanData.trial_scans || 0;

        const percentage = scanData.total_scans > 0
          ? Math.round((scanData.paid_scans / scanData.total_scans) * 100)
          : 0;
        if (paidPercentEl) paidPercentEl.textContent = percentage + '%';
      } catch (e) { console.error('Error loading scan stats:', e); }

      // Scans per day chart
      try {
        const scansPerDay = await fetch('/api/security/scans-per-day?days=30').then(r => r.json());
        const scansChartEl = document.getElementById('securityScansChart');
        if (scansChartEl && scansPerDay.length > 0) {
          if (charts['securityScans']) charts['securityScans'].destroy();
          charts['securityScans'] = new ApexCharts(scansChartEl, {
            chart: {
              type: 'bar',
              height: 280,
              background: chartTheme.background,
              toolbar: { show: false },
              fontFamily: 'Inter, sans-serif'
            },
            series: [{
              name: 'Scans',
              data: scansPerDay.map(d => d.scans)
            }],
            colors: ['#ef4444'],
            plotOptions: {
              bar: {
                borderRadius: 4,
                columnWidth: '60%'
              }
            },
            xaxis: {
              categories: scansPerDay.map(d => {
                const date = new Date(d.date);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }),
              labels: {
                style: { colors: chartTheme.textColor, fontSize: '10px' },
                rotate: -45,
                rotateAlways: scansPerDay.length > 15
              },
              axisBorder: { show: false },
              axisTicks: { show: false }
            },
            yaxis: {
              labels: { style: { colors: chartTheme.textColor } },
              min: 0,
              forceNiceScale: true
            },
            grid: {
              borderColor: chartTheme.gridColor,
              strokeDashArray: 4
            },
            dataLabels: { enabled: false },
            tooltip: {
              theme: 'dark',
              y: {
                formatter: (val) => val + ' scans'
              }
            }
          });
          charts['securityScans'].render();
        }
      } catch (e) { console.error('Error loading scans per day:', e); }

      // Today's scans with user info
      try {
        const todayData = await fetch('/api/security/today').then(r => r.json());
        const todayTotalEl = document.getElementById('security-today-total');
        const scansByUserEl = document.getElementById('security-scans-by-user');
        const scansListEl = document.getElementById('security-today-scans-list');

        if (todayTotalEl) todayTotalEl.textContent = todayData.totalToday || 0;

        // Scans by user
        if (scansByUserEl && todayData.byUser) {
          if (todayData.byUser.length > 0) {
            scansByUserEl.innerHTML = todayData.byUser.map(u => `
              <div class="metric-row" style="padding: 6px 0; border-bottom: 1px solid #334155;">
                <span class="metric-label" style="font-size: 13px;">${u.user_name || u.user_email || 'Desconhecido'}</span>
                <span class="metric-value" style="color: #ef4444;">${u.count}</span>
              </div>
            `).join('');
          } else {
            scansByUserEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Nenhum scan hoje</div>';
          }
        }

        // Scans list
        if (scansListEl && todayData.scans) {
          if (todayData.scans.length > 0) {
            scansListEl.innerHTML = todayData.scans.map(s => {
              const time = new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const statusColor = s.status === 'completed' ? '#22c55e' : s.status === 'running' ? '#f59e0b' : s.status === 'failed' ? '#ef4444' : '#94a3b8';
              return `
                <div style="padding: 8px 0; border-bottom: 1px solid #334155; font-size: 13px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #e2e8f0;">${s.project_name || 'Projeto'}</span>
                    <span style="color: ${statusColor}; font-size: 11px;">${s.status}</span>
                  </div>
                  <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
                    ${s.user_name || s.user_email || 'Usuario'} - ${time}
                  </div>
                </div>
              `;
            }).join('');
          } else {
            scansListEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Nenhum scan hoje</div>';
          }
        }
      } catch (e) { console.error('Error loading security today stats:', e); }

      // Activity Log data
      try {
        // Activity stats
        const activityStats = await fetch('/api/security/activity/stats?days=30').then(r => r.json());
        const activityTotalEl = document.getElementById('security-activity-total');
        const activityLoginsEl = document.getElementById('security-activity-logins');
        const activityFailedLoginsEl = document.getElementById('security-activity-failed-logins');
        const activityScansEl = document.getElementById('security-activity-scans');

        if (activityTotalEl) activityTotalEl.textContent = activityStats.totals?.total || 0;
        if (activityLoginsEl) activityLoginsEl.textContent = activityStats.totals?.logins || 0;
        if (activityFailedLoginsEl) activityFailedLoginsEl.textContent = activityStats.totals?.failed_logins || 0;
        if (activityScansEl) activityScansEl.textContent = activityStats.totals?.scans_started || 0;

        // By action
        const byActionEl = document.getElementById('security-activity-by-action');
        if (byActionEl && activityStats.byAction) {
          const actionLabels = {
            'login': 'Login',
            'login_failed': 'Login Falho',
            'logout': 'Logout',
            'project_create': 'Criar Projeto',
            'project_update': 'Atualizar Projeto',
            'project_delete': 'Deletar Projeto',
            'scan_start': 'Iniciar Scan',
            'scan_complete': 'Scan Completo',
            'report_export': 'Exportar Relatorio'
          };
          byActionEl.innerHTML = activityStats.byAction.map(a => `
            <div class="metric-row" style="padding: 6px 0; border-bottom: 1px solid #334155;">
              <span class="metric-label" style="font-size: 12px;">${actionLabels[a.action] || a.action}</span>
              <span class="metric-value" style="font-size: 14px;">${a.count}</span>
            </div>
          `).join('') || '<div style="color: #64748b;">Sem dados</div>';
        }

        // By user
        const byUserEl = document.getElementById('security-activity-by-user');
        if (byUserEl && activityStats.byUser) {
          byUserEl.innerHTML = activityStats.byUser.map(u => `
            <div class="metric-row" style="padding: 6px 0; border-bottom: 1px solid #334155;">
              <span class="metric-label" style="font-size: 12px;">${u.user_email || 'Desconhecido'}</span>
              <span class="metric-value" style="font-size: 14px;">${u.count}</span>
            </div>
          `).join('') || '<div style="color: #64748b;">Sem dados</div>';
        }
      } catch (e) { console.error('Error loading activity stats:', e); }

      // Activity per day chart
      try {
        const activityPerDay = await fetch('/api/security/activity/per-day?days=30').then(r => r.json());
        const activityChartEl = document.getElementById('securityActivityChart');
        if (activityChartEl && activityPerDay.length > 0) {
          if (charts['securityActivity']) charts['securityActivity'].destroy();
          charts['securityActivity'] = new ApexCharts(activityChartEl, {
            chart: {
              type: 'area',
              height: 200,
              background: chartTheme.background,
              toolbar: { show: false },
              fontFamily: 'Inter, sans-serif'
            },
            series: [
              { name: 'Total', data: activityPerDay.map(d => d.total) },
              { name: 'Logins', data: activityPerDay.map(d => d.logins) },
              { name: 'Scans', data: activityPerDay.map(d => d.scans) }
            ],
            colors: ['#3b82f6', '#22c55e', '#ef4444'],
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.1 } },
            xaxis: {
              categories: activityPerDay.map(d => {
                const date = new Date(d.date);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }),
              labels: { style: { colors: chartTheme.textColor, fontSize: '10px' } },
              axisBorder: { show: false },
              axisTicks: { show: false }
            },
            yaxis: {
              labels: { style: { colors: chartTheme.textColor } }
            },
            grid: { borderColor: chartTheme.gridColor, strokeDashArray: 4 },
            legend: { position: 'top', labels: { colors: chartTheme.textColor } },
            tooltip: { theme: 'dark' }
          });
          charts['securityActivity'].render();
        }
      } catch (e) { console.error('Error loading activity chart:', e); }

      // Failed logins
      try {
        const failedLogins = await fetch('/api/security/activity/failed-logins?hours=24').then(r => r.json());
        const failedListEl = document.getElementById('security-failed-logins-list');
        const suspiciousIpsEl = document.getElementById('security-suspicious-ips');

        if (suspiciousIpsEl && failedLogins.suspiciousIps && failedLogins.suspiciousIps.length > 0) {
          suspiciousIpsEl.textContent = `${failedLogins.suspiciousIps.length} IP(s) suspeito(s)`;
        }

        if (failedListEl) {
          if (failedLogins.recent && failedLogins.recent.length > 0) {
            failedListEl.innerHTML = failedLogins.recent.slice(0, 20).map(f => {
              const time = new Date(f.created_at).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              });
              return `
                <div style="padding: 6px 0; border-bottom: 1px solid #334155; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #ef4444;">${f.user_email || 'Email?'}</span>
                    <span style="color: #64748b;">${time}</span>
                  </div>
                  <div style="color: #64748b; font-size: 11px;">IP: ${f.ip_address || '-'}</div>
                </div>
              `;
            }).join('');
          } else {
            failedListEl.innerHTML = '<div style="color: #22c55e; font-size: 13px;">Nenhuma tentativa falha nas ultimas 24h</div>';
          }
        }
      } catch (e) { console.error('Error loading failed logins:', e); }

      // Recent activities table
      try {
        const activities = await fetch('/api/security/activity?limit=20').then(r => r.json());
        const tableEl = document.getElementById('security-activity-table');

        const actionLabels = {
          'login': 'Login', 'login_failed': 'Login Falho', 'logout': 'Logout',
          'project_create': 'Criar Projeto', 'project_update': 'Atualizar Projeto',
          'project_delete': 'Deletar Projeto', 'scan_start': 'Iniciar Scan',
          'scan_complete': 'Scan Completo', 'report_export': 'Exportar'
        };

        if (tableEl && activities.data) {
          tableEl.innerHTML = activities.data.map(a => {
            const actionColor = a.action === 'login' ? '#22c55e' :
                               a.action === 'login_failed' ? '#ef4444' :
                               a.action.includes('scan') ? '#f59e0b' : '#3b82f6';
            return `
              <tr>
                <td>${a.user_name || a.user_email || '-'}</td>
                <td style="color: ${actionColor};">${actionLabels[a.action] || a.action}</td>
                <td>${a.resource_name || a.resource_type || '-'}</td>
                <td style="font-size: 11px; color: #64748b;">${a.ip_address || '-'}</td>
                <td style="font-size: 11px;">${formatDateTime(a.created_at)}</td>
              </tr>
            `;
          }).join('') || '<tr><td colspan="5">Sem atividades</td></tr>';
        }
      } catch (e) { console.error('Error loading activities table:', e); }
    }

    // oEntregador today stats (usuarios ativos e bipados)
    if (project === 'oentregador') {
      try {
        const todayData = await fetch('/api/oentregador/today').then(r => r.json());
        const todayUsersEl = document.getElementById('oentregador-today-users');
        const todayBipadosEl = document.getElementById('oentregador-today-bipados');
        const bipadosListEl = document.getElementById('oentregador-bipados-list');

        if (todayUsersEl) todayUsersEl.textContent = todayData.activeUsers || 0;
        if (todayBipadosEl) todayBipadosEl.textContent = todayData.bipadosToday || 0;

        if (bipadosListEl && todayData.bipadosByUser) {
          if (todayData.bipadosByUser.length > 0) {
            bipadosListEl.innerHTML = todayData.bipadosByUser.map(u => `
              <div class="metric-row" style="padding: 6px 0; border-bottom: 1px solid #334155;">
                <span class="metric-label" style="font-size: 13px;">${u._id || 'Desconhecido'}</span>
                <span class="metric-value" style="color: #22c55e;">${u.count}</span>
              </div>
            `).join('');
          } else {
            bipadosListEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Nenhum item bipado hoje</div>';
          }
        }
      } catch (e) { console.error('Error loading oentregador today stats:', e); }

      // Bipados per day chart
      try {
        const bipadosPerDay = await fetch('/api/oentregador/bipados-per-day?days=30').then(r => r.json());
        const bipadosChartEl = document.getElementById('oentregadorBipadosChart');
        if (bipadosChartEl && bipadosPerDay.length > 0) {
          if (charts['oentregadorBipados']) charts['oentregadorBipados'].destroy();
          charts['oentregadorBipados'] = new ApexCharts(bipadosChartEl, {
            chart: {
              type: 'bar',
              height: 280,
              stacked: true,
              background: chartTheme.background,
              toolbar: { show: false },
              fontFamily: 'Inter, sans-serif'
            },
            series: [
              {
                name: 'Bipados OK',
                data: bipadosPerDay.map(d => d.checked)
              },
              {
                name: 'Divergencias',
                data: bipadosPerDay.map(d => d.wrong_batch)
              }
            ],
            colors: ['#22c55e', '#ef4444'],
            plotOptions: {
              bar: {
                borderRadius: 4,
                columnWidth: '60%'
              }
            },
            xaxis: {
              categories: bipadosPerDay.map(d => {
                const date = new Date(d.date);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }),
              labels: {
                style: { colors: chartTheme.textColor, fontSize: '10px' },
                rotate: -45,
                rotateAlways: bipadosPerDay.length > 15
              },
              axisBorder: { show: false },
              axisTicks: { show: false }
            },
            yaxis: {
              labels: { style: { colors: chartTheme.textColor } },
              min: 0,
              forceNiceScale: true
            },
            grid: {
              borderColor: chartTheme.gridColor,
              strokeDashArray: 4
            },
            dataLabels: { enabled: false },
            legend: {
              position: 'top',
              labels: { colors: chartTheme.textColor }
            },
            tooltip: {
              theme: 'dark',
              y: {
                formatter: (val) => val + ' BRs'
              }
            }
          });
          charts['oentregadorBipados'].render();
        }
      } catch (e) { console.error('Error loading bipados per day:', e); }

      // ========================================
      // AUDIT LOGS SECTION
      // ========================================
      try {
        await loadAuditStats();
        await loadAuditTimeline();
        await loadAuditLogs();
      } catch (e) { console.error('Error loading audit data:', e); }
    }

    // Billing audit logs
    if (project === 'billing') {
      try {
        await loadBillingAuditData();
      } catch (e) { console.error('Error loading billing audit data:', e); }
    }

    // Tabela
    const tableEl = document.getElementById(`${project}-table`);
    if (tableEl) {
      tableEl.innerHTML = data.subscribers.map(s => `
        <tr>
          <td>${s.email}</td>
          <td>${s.plan_name || '-'}</td>
          <td>${formatCurrency(s.mrr)}</td>
          <td><span class="status ${s.status}">${s.status}</span></td>
          <td>${formatDateTime(s.created_at)}</td>
        </tr>
      `).join('') || '<tr><td colspan="5">Sem assinantes</td></tr>';
    }

    // Chart with ApexCharts
    const colors = { auth: '#8b5cf6', billing: '#10b981', security: '#ef4444', oentregador: '#f59e0b' };
    const chartEl = document.getElementById(`${project}Chart`);
    if (chartEl && data.growth.length > 0) {
      if (charts[project]) charts[project].destroy();
      charts[project] = new ApexCharts(chartEl, {
        chart: {
          type: 'area',
          height: 250,
          background: chartTheme.background,
          toolbar: { show: false },
          fontFamily: 'Inter, sans-serif'
        },
        series: [{
          name: 'Novos usuarios',
          data: data.growth.map(g => g.count)
        }],
        xaxis: {
          categories: data.growth.map(g => formatDate(g.date)),
          labels: { style: { colors: chartTheme.textColor, fontSize: '10px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: { style: { colors: chartTheme.textColor, fontSize: '11px' } }
        },
        colors: [colors[project]],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.3,
            opacityTo: 0.05
          }
        },
        stroke: { curve: 'smooth', width: 2 },
        dataLabels: { enabled: false },
        grid: { borderColor: chartTheme.gridColor, strokeDashArray: 3 },
        tooltip: { theme: 'dark', style: { fontSize: '12px' } }
      });
      charts[project].render();
    }

    // Load funnel data for this project
    try {
      const funnelData = await fetch(`/api/funnel?project=${project}`).then(r => r.json());
      renderProjectFunnel(funnelData, project);
    } catch (err) { console.error(`Error loading funnel for ${project}:`, err); }

    // Load auth audit data (for auth page only)
    if (project === 'auth') {
      await loadAuthAuditStats();
      await loadAuthLoginsChart();
      await loadAuthLogins();
      await loadAuthSecurityEvents();
      await loadAuthAdminActions();
    }

  } catch (err) { console.error(`Error loading ${project}:`, err); }
}

// =============================================================================
// AUDIO - New Customer Sound
// =============================================================================
let audioCtx = null;
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const buffer = audioCtx.createBuffer(1, 1, 22050);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);
  audioUnlocked = true;
  console.log('[Audio] Desbloqueado!');

  // Esconde o botão
  const btn = document.getElementById('unlock-audio-btn');
  if (btn) btn.classList.add('unlocked');
}

// Botão de desbloquear áudio - sempre aparece até clicar
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('unlock-audio-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      unlockAudio();
      // Toca um som de teste (cha-ching)
      setTimeout(() => {
        const testSound = sounds.chaChing.cloneNode();
        testSound.volume = 0.7;
        testSound.play().catch(err => console.error('Erro ao tocar som:', err));
      }, 100);
    });
  }
});

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// Sound URLs - DINHEIRO ENTRANDO NA CONTA!
const SOUND_URLS = {
  chaChing: 'sounds/cash.mp3',
  applause: 'sounds/applause.mp3'
};

// Preload sounds
let sounds = {};
function preloadSounds() {
  Object.entries(SOUND_URLS).forEach(([name, url]) => {
    const audio = new Audio();
    audio.src = url;
    audio.preload = 'auto';
    sounds[name] = audio;
  });
}
preloadSounds();

function playCashSound() {
  // 1. Som de dinheiro (cha-ching)
  const chaChing = sounds.chaChing.cloneNode();
  chaChing.volume = 0.7;
  chaChing.play().catch(() => {});

  // 2. Pausa... depois palmas de comemoração
  setTimeout(() => {
    const applause = sounds.applause.cloneNode();
    applause.volume = 0.5;
    applause.play().catch(() => {});
  }, 1500);
}

// =============================================================================
// MONEY ANIMATION
// =============================================================================
function playMoneyAnimation(message = 'Nova Venda!') {
  // Remove existing animation if any
  const existing = document.querySelector('.money-animation-container');
  if (existing) existing.remove();

  // Create container
  const container = document.createElement('div');
  container.className = 'money-animation-container';
  container.innerHTML = `
    <div class="safe-box">
      <div class="safe-slot"></div>
      <div class="money-bill"></div>
      <div class="money-bill"></div>
      <div class="money-bill"></div>
      <div class="coin"></div>
      <div class="coin"></div>
      <div class="coin"></div>
      <div class="sparkle"></div>
      <div class="sparkle"></div>
      <div class="sparkle"></div>
      <div class="sparkle"></div>
      <div class="sale-amount">${message}</div>
    </div>
  `;
  document.body.appendChild(container);

  const safeBox = container.querySelector('.safe-box');
  const bills = container.querySelectorAll('.money-bill');
  const coins = container.querySelectorAll('.coin');
  const sparkles = container.querySelectorAll('.sparkle');
  const saleAmount = container.querySelector('.sale-amount');

  // Animate safe appearing
  setTimeout(() => safeBox.classList.add('active'), 50);

  // Animate bills falling
  setTimeout(() => {
    bills.forEach(bill => bill.classList.add('falling'));
  }, 300);

  // Animate coins falling
  setTimeout(() => {
    coins.forEach(coin => coin.classList.add('falling'));
  }, 400);

  // Animate sparkles
  setTimeout(() => {
    sparkles.forEach(sparkle => sparkle.classList.add('animate'));
  }, 600);

  // Show sale amount
  setTimeout(() => {
    saleAmount.classList.add('show');
  }, 500);

  // Remove animation after completion
  setTimeout(() => {
    safeBox.classList.remove('active');
    setTimeout(() => container.remove(), 500);
  }, 3500);
}

// =============================================================================
// NEW CUSTOMER DETECTION
// =============================================================================
let previousData = {
  totalPaidSubs: 0,
  totalPaidPurchases: 0
};
let isFirstLoad = true;

async function checkForNewCustomers() {
  try {
    const data = await fetch('/api/overview').then(r => r.json());
    const paidSubsResponse = await fetch('/api/billing/metrics').then(r => r.json());
    const currentPaidSubs = parseInt(paidSubsResponse.active_subscriptions) || 0;
    const currentPurchases = data.totalPaidPurchases || 0;

    console.log(`[Check] Subs: ${currentPaidSubs} (antes: ${previousData.totalPaidSubs}), Compras: ${currentPurchases} (antes: ${previousData.totalPaidPurchases}), FirstLoad: ${isFirstLoad}`);

    if (!isFirstLoad) {
      const newPaidSubs = currentPaidSubs - previousData.totalPaidSubs;
      const newPurchases = currentPurchases - previousData.totalPaidPurchases;

      if (newPaidSubs > 0 || newPurchases > 0) {
        console.log(`NOVO CLIENTE PAGANTE! +${newPaidSubs} assinantes, +${newPurchases} compras`);
        playCashSound();

        // Build message for animation
        const msgs = [];
        if (newPaidSubs > 0) msgs.push(`+${newPaidSubs} assinatura(s)`);
        if (newPurchases > 0) msgs.push(`+${newPurchases} compra(s)`);
        playMoneyAnimation(msgs.join(' '));

        if (Notification.permission === 'granted') {
          new Notification('Dinheiro Entrando!', {
            body: msgs.join(', '),
            icon: '💰'
          });
        }
      }
    }

    previousData.totalPaidSubs = currentPaidSubs;
    previousData.totalPaidPurchases = currentPurchases;
    isFirstLoad = false;

  } catch (err) {
    console.error('Erro ao verificar novos clientes:', err);
  }
}

// =============================================================================
// AUTO-UPDATE
// =============================================================================
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutos

async function autoUpdate() {
  console.log('Atualizando dados...', new Date().toLocaleTimeString());
  await checkForNewCustomers();
  await loadAllData();
}

setInterval(autoUpdate, UPDATE_INTERVAL);

function updateNextRefreshTime() {
  const now = new Date();
  const next = new Date(now.getTime() + UPDATE_INTERVAL);
  const timeStr = next.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const refreshBtn = document.querySelector('.refresh-btn');
  if (refreshBtn) {
    refreshBtn.title = `Proxima atualizacao automatica: ${timeStr}`;
  }
}

// =============================================================================
// NOTIFICATIONS
// =============================================================================
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}

// =============================================================================
// USERS PAGE
// =============================================================================
let usersSearchTimeout = null;

function debounceSearch() {
  clearTimeout(usersSearchTimeout);
  usersSearchTimeout = setTimeout(() => loadUsersPage(), 300);
}

async function loadUsersPage() {
  const project = document.getElementById('users-filter-project')?.value || '';
  const status = document.getElementById('users-filter-status')?.value || '';
  const plan = document.getElementById('users-filter-plan')?.value || '';
  const search = document.getElementById('users-filter-search')?.value || '';

  try {
    const params = new URLSearchParams({ project, status, plan, search, limit: 100 });
    const data = await fetch(`/api/users?${params}`).then(r => r.json());

    // Update stats cards
    const totalEl = document.getElementById('users-total');
    const verifiedEl = document.getElementById('users-verified');
    const withPlanEl = document.getElementById('users-with-plan');
    const freeEl = document.getElementById('users-free');
    const countEl = document.getElementById('users-count');

    if (totalEl) totalEl.textContent = data.stats.total.toLocaleString('pt-BR');
    if (verifiedEl) verifiedEl.textContent = data.stats.verified.toLocaleString('pt-BR');
    if (withPlanEl) withPlanEl.textContent = data.stats.with_plan.toLocaleString('pt-BR');
    if (freeEl) freeEl.textContent = data.stats.free.toLocaleString('pt-BR');
    if (countEl) countEl.textContent = data.users.length;

    // Update table
    const tableEl = document.getElementById('users-table');
    if (tableEl) {
      tableEl.innerHTML = data.users.map(u => `
        <tr>
          <td>${u.email}</td>
          <td><span class="service-badge ${getProjectClass(u.project_name)}">${formatProjectName(u.project_name)}</span></td>
          <td>${u.plan_name || '-'}</td>
          <td>${u.subscription_status ? `<span class="status ${u.subscription_status}">${u.subscription_status}</span>` : '<span class="status">free</span>'}</td>
          <td>${formatCurrency(u.mrr)}</td>
          <td>${u.email_verified ? '✓' : '✗'}</td>
          <td>${formatDateTime(u.created_at)}</td>
        </tr>
      `).join('') || '<tr><td colspan="7">Nenhum usuario encontrado</td></tr>';
    }
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

function getProjectClass(projectName) {
  if (!projectName) return '';
  if (projectName.includes('auth')) return 'auth';
  if (projectName.includes('billing')) return 'billing';
  if (projectName.includes('security')) return 'security';
  if (projectName.includes('oentregador')) return 'oentregador';
  if (projectName.includes('post-automation')) return 'post-automation';
  if (projectName.includes('cardapio')) return 'cardapio';
  if (projectName.includes('redutor')) return 'redutor';
  return '';
}

function formatProjectName(name) {
  if (!name) return '-';
  const map = {
    'app-auth': 'Auth',
    'app-billing': 'Billing',
    'security-audit': 'Security',
    'app-oentregador': 'oEntregador',
    'oentregador': 'oEntregador',
    'app-post-automation': 'Post Automation',
    'cardapio-digital': 'Cardapio Digital',
    'redutor-inss': 'Redutor INSS'
  };
  return map[name] || name;
}

// =============================================================================
// PAYING PAGE
// =============================================================================
let payingSearchTimeout = null;

function debouncePayingSearch() {
  clearTimeout(payingSearchTimeout);
  payingSearchTimeout = setTimeout(() => loadPayingPage(), 300);
}

async function loadPayingPage() {
  const project = document.getElementById('paying-filter-project')?.value || '';
  const type = document.getElementById('paying-filter-type')?.value || '';
  const plan = document.getElementById('paying-filter-plan')?.value || '';
  const search = document.getElementById('paying-filter-search')?.value || '';

  try {
    const params = new URLSearchParams({ project, type, plan, search });
    const data = await fetch(`/api/paying?${params}`).then(r => r.json());

    // Update stats cards
    const mrrEl = document.getElementById('paying-mrr');
    const subsEl = document.getElementById('paying-subs');
    const onetimeEl = document.getElementById('paying-onetime');
    const onetimeRevEl = document.getElementById('paying-onetime-revenue');
    const countEl = document.getElementById('paying-count');

    if (mrrEl) mrrEl.textContent = formatCurrency(data.summary.mrr);
    if (subsEl) subsEl.textContent = data.summary.active_subs;
    if (onetimeEl) onetimeEl.textContent = data.summary.onetime_buyers;
    if (onetimeRevEl) onetimeRevEl.textContent = formatCurrency(data.summary.onetime_revenue);
    if (countEl) countEl.textContent = data.customers.length;

    // Populate plans dropdown
    const planSelect = document.getElementById('paying-filter-plan');
    if (planSelect && planSelect.options.length <= 1) {
      data.plans.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        planSelect.appendChild(opt);
      });
    }

    // Update table
    const tableEl = document.getElementById('paying-table');
    if (tableEl) {
      tableEl.innerHTML = data.customers.map(c => `
        <tr>
          <td>${c.email}</td>
          <td><span class="service-badge ${getProjectClass(c.project_name)}">${formatProjectName(c.project_name)}</span></td>
          <td>${c.plan_name || '-'}</td>
          <td><span class="status ${c.type === 'subscription' ? 'active' : 'trialing'}">${c.type === 'subscription' ? 'Assinatura' : 'One-Time'}</span></td>
          <td>${formatCurrency(c.value)}</td>
          <td><span class="status ${c.status}">${c.status}</span></td>
          <td>${formatDateTime(c.created_at)}</td>
        </tr>
      `).join('') || '<tr><td colspan="7">Nenhum cliente pagante</td></tr>';
    }
  } catch (err) {
    console.error('Error loading paying customers:', err);
  }
}

// =============================================================================
// REVENUE PAGE
// =============================================================================
async function loadRevenuePage() {
  try {
    const data = await fetch('/api/revenue').then(r => r.json());

    // Update summary cards
    const totalEl = document.getElementById('revenue-total');
    const mrrEl = document.getElementById('revenue-mrr');
    const arrEl = document.getElementById('revenue-arr');
    const onetimeEl = document.getElementById('revenue-onetime');

    if (totalEl) totalEl.textContent = formatCurrency(data.summary.total_revenue);
    if (mrrEl) mrrEl.textContent = formatCurrency(data.summary.mrr);
    if (arrEl) arrEl.textContent = formatCurrency(data.summary.arr);
    if (onetimeEl) onetimeEl.textContent = formatCurrency(data.summary.onetime);

    // Render project cards
    const projectsEl = document.getElementById('revenue-projects');
    if (projectsEl) {
      projectsEl.innerHTML = data.byProject.map(p => `
        <div class="project-card ${getProjectClass(p.name)}">
          <div class="project-card-header">
            <span class="project-card-name">${formatProjectName(p.name)}</span>
            <span class="project-card-badge ${getProjectClass(p.name)}">${p.active_subs} ativos</span>
          </div>
          <div class="project-card-revenue">
            <div class="project-card-revenue-value">${formatCurrency(p.total_revenue)}</div>
            <div class="project-card-revenue-label">Receita Total</div>
          </div>
          <div class="project-card-metrics">
            <div class="project-card-metric">
              <div class="project-card-metric-value">${formatCurrency(p.mrr)}</div>
              <div class="project-card-metric-label">MRR</div>
            </div>
            <div class="project-card-metric">
              <div class="project-card-metric-value">${formatCurrency(p.onetime_revenue)}</div>
              <div class="project-card-metric-label">One-Time</div>
            </div>
            <div class="project-card-metric">
              <div class="project-card-metric-value">${p.active_subs}</div>
              <div class="project-card-metric-label">Assinantes</div>
            </div>
            <div class="project-card-metric">
              <div class="project-card-metric-value">${p.onetime_buyers}</div>
              <div class="project-card-metric-label">Compradores</div>
            </div>
          </div>
        </div>
      `).join('') || '<div class="loading">Sem dados</div>';
    }

    // Render revenue by plan
    const byPlanEl = document.getElementById('revenue-by-plan');
    if (byPlanEl) {
      byPlanEl.innerHTML = data.byPlan.filter(p => p.mrr > 0).map(p => `
        <div class="metric-row">
          <span class="metric-label">${p.plan_name} <small>(${formatProjectName(p.project_name)})</small></span>
          <span class="metric-value">${formatCurrency(p.mrr)} (${p.active_subs} assinantes)</span>
        </div>
      `).join('') || '<div class="loading">Sem planos com MRR</div>';
    }

    // Render transactions
    const transactionsEl = document.getElementById('revenue-transactions');
    if (transactionsEl) {
      transactionsEl.innerHTML = data.transactions.map(t => `
        <tr>
          <td>${t.email}</td>
          <td><span class="service-badge ${getProjectClass(t.project_name)}">${formatProjectName(t.project_name)}</span></td>
          <td><span class="status ${t.type === 'subscription' ? 'active' : 'trialing'}">${t.type === 'subscription' ? 'Assinatura' : 'One-Time'}</span></td>
          <td>${t.plan_name || '-'}</td>
          <td>${formatCurrency(t.value)}</td>
          <td>${formatDateTime(t.created_at)}</td>
        </tr>
      `).join('') || '<tr><td colspan="6">Sem transacoes</td></tr>';
    }

    // Render chart with ApexCharts
    const chartEl = document.getElementById('revenueChart');
    if (chartEl && data.mrrGrowth.length > 0) {
      if (charts.revenue) charts.revenue.destroy();
      // Clear canvas and use div instead
      chartEl.parentElement.innerHTML = '<div id="revenueChart" style="height: 100%;"></div>';
      const newChartEl = document.getElementById('revenueChart');

      charts.revenue = new ApexCharts(newChartEl, {
        chart: {
          type: 'area',
          height: 280,
          background: chartTheme.background,
          toolbar: { show: false },
          fontFamily: 'Inter, sans-serif'
        },
        series: [{
          name: 'MRR Adicionado',
          data: data.mrrGrowth.map(g => g.mrr)
        }],
        xaxis: {
          categories: data.mrrGrowth.map(g => formatDate(g.date)),
          labels: { style: { colors: chartTheme.textColor, fontSize: '10px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: {
            style: { colors: chartTheme.textColor, fontSize: '11px' },
            formatter: (val) => 'R$ ' + val.toLocaleString('pt-BR')
          }
        },
        colors: ['#10b981'],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.4,
            opacityTo: 0.05
          }
        },
        stroke: { curve: 'smooth', width: 2 },
        dataLabels: { enabled: false },
        grid: { borderColor: chartTheme.gridColor, strokeDashArray: 3 },
        tooltip: { theme: 'dark', style: { fontSize: '12px' } }
      });
      charts.revenue.render();
    }
  } catch (err) {
    console.error('Error loading revenue:', err);
  }
}

// =============================================================================
// AUDIT LOGS FUNCTIONS
// =============================================================================

let auditCurrentPage = 1;
const auditPageSize = 20;

// Load audit statistics
async function loadAuditStats() {
  try {
    const stats = await fetch('/api/oentregador/audit/stats?period=week').then(r => r.json());

    // Total logs
    const totalLogsEl = document.getElementById('audit-total-logs');
    if (totalLogsEl) totalLogsEl.textContent = formatNumber(stats.totalLogs || 0);

    // Status counts
    const successEl = document.getElementById('audit-success');
    const failureEl = document.getElementById('audit-failure');
    const errorEl = document.getElementById('audit-error');

    if (successEl) successEl.textContent = formatNumber(stats.byStatus?.success || 0);
    if (failureEl) failureEl.textContent = formatNumber(stats.byStatus?.failure || 0);
    if (errorEl) errorEl.textContent = formatNumber(stats.byStatus?.error || 0);

    // Category counts
    const categories = ['auth', 'bipagem', 'config', 'sync', 'crud', 'system'];
    categories.forEach(cat => {
      const el = document.getElementById(`audit-cat-${cat}`);
      if (el) el.textContent = formatNumber(stats.byCategory?.[cat] || 0);
    });

    // Top users
    const topUsersEl = document.getElementById('audit-top-users');
    if (topUsersEl && stats.topUsers) {
      if (stats.topUsers.length > 0) {
        topUsersEl.innerHTML = stats.topUsers.map(u => `
          <div class="metric-row" style="padding: 8px 0; border-bottom: 1px solid #334155;">
            <div style="display: flex; flex-direction: column;">
              <span class="metric-label" style="font-size: 13px;">${u.userName || 'Desconhecido'}</span>
              <span style="font-size: 11px; color: #64748b;">${u.userEmail || ''}</span>
            </div>
            <span class="metric-value" style="color: #3b82f6;">${u.count}</span>
          </div>
        `).join('');
      } else {
        topUsersEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Nenhum dado disponivel</div>';
      }
    }

    // Top actions
    const topActionsEl = document.getElementById('audit-top-actions');
    if (topActionsEl && stats.topActions) {
      if (stats.topActions.length > 0) {
        topActionsEl.innerHTML = stats.topActions.map(a => {
          const actionLabel = formatAuditAction(a.action);
          const color = getActionColor(a.action);
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #1e293b; border-radius: 4px; border-left: 3px solid ${color};">
              <span style="font-size: 12px; color: #e2e8f0;">${actionLabel}</span>
              <span style="font-size: 14px; font-weight: 600; color: ${color};">${a.count}</span>
            </div>
          `;
        }).join('');
      } else {
        topActionsEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Nenhum dado disponivel</div>';
      }
    }
  } catch (err) {
    console.error('Error loading audit stats:', err);
  }
}

// Format audit action for display
function formatAuditAction(action) {
  const actionMap = {
    'auth.login': 'Login',
    'auth.login_failed': 'Login Falhou',
    'auth.logout': 'Logout',
    'auth.register': 'Registro',
    'auth.password_reset_request': 'Reset Senha Solicitado',
    'auth.password_reset_complete': 'Reset Senha Completo',
    'bipagem.scan': 'Bipagem OK',
    'bipagem.scan_not_found': 'BR Nao Encontrada',
    'bipagem.scan_wrong_at': 'BR em AT Errada',
    'bipagem.complete_at': 'AT Conferida',
    'config.provider_create': 'Config Criada',
    'config.provider_update': 'Config Atualizada',
    'config.provider_delete': 'Config Deletada',
    'sync.daily_start': 'Sync Iniciado',
    'sync.daily_complete': 'Sync Completo',
    'system.startup': 'Sistema Iniciado',
    'system.error': 'Erro Sistema'
  };
  return actionMap[action] || action;
}

// Get color for action type
function getActionColor(action) {
  if (action.includes('error') || action.includes('failed') || action.includes('wrong')) return '#ef4444';
  if (action.includes('not_found')) return '#f59e0b';
  if (action.includes('login') || action.includes('register')) return '#8b5cf6';
  if (action.includes('bipagem') || action.includes('scan')) return '#22c55e';
  if (action.includes('config')) return '#3b82f6';
  if (action.includes('sync')) return '#06b6d4';
  return '#64748b';
}

// Load audit timeline chart
async function loadAuditTimeline() {
  try {
    const timeline = await fetch('/api/oentregador/audit/timeline?days=30').then(r => r.json());
    const chartEl = document.getElementById('auditTimelineChart');

    if (chartEl && timeline.data && timeline.data.length > 0) {
      if (charts['auditTimeline']) charts['auditTimeline'].destroy();

      charts['auditTimeline'] = new ApexCharts(chartEl, {
        chart: {
          type: 'area',
          height: 280,
          stacked: true,
          background: chartTheme.background,
          toolbar: { show: false },
          fontFamily: 'Inter, sans-serif'
        },
        series: [
          {
            name: 'Sucesso',
            data: timeline.data.map(d => d.success)
          },
          {
            name: 'Falhas',
            data: timeline.data.map(d => d.failure)
          },
          {
            name: 'Erros',
            data: timeline.data.map(d => d.error)
          }
        ],
        colors: ['#22c55e', '#f59e0b', '#ef4444'],
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.5,
            opacityTo: 0.1
          }
        },
        stroke: { curve: 'smooth', width: 2 },
        xaxis: {
          categories: timeline.data.map(d => {
            const date = new Date(d.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }),
          labels: {
            style: { colors: chartTheme.textColor, fontSize: '10px' },
            rotate: -45,
            rotateAlways: timeline.data.length > 15
          },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: { style: { colors: chartTheme.textColor } },
          min: 0
        },
        grid: {
          borderColor: chartTheme.gridColor,
          strokeDashArray: 4
        },
        dataLabels: { enabled: false },
        legend: {
          position: 'top',
          labels: { colors: chartTheme.textColor }
        },
        tooltip: {
          theme: 'dark',
          y: {
            formatter: (val) => val + ' eventos'
          }
        }
      });
      charts['auditTimeline'].render();
    }
  } catch (err) {
    console.error('Error loading audit timeline:', err);
  }
}

// Load audit logs table
async function loadAuditLogs(page = 1) {
  try {
    auditCurrentPage = page;
    const category = document.getElementById('audit-filter-category')?.value || '';
    const status = document.getElementById('audit-filter-status')?.value || '';

    let url = `/api/oentregador/audit/logs?page=${page}&limit=${auditPageSize}`;
    if (category) url += `&category=${category}`;
    if (status) url += `&status=${status}`;

    const result = await fetch(url).then(r => r.json());
    const tableEl = document.getElementById('audit-logs-table');

    if (tableEl) {
      if (result.data && result.data.length > 0) {
        tableEl.innerHTML = result.data.map(log => {
          const statusClass = log.status === 'success' ? 'active' : (log.status === 'error' ? 'canceled' : 'trialing');
          const statusLabel = log.status === 'success' ? 'Sucesso' : (log.status === 'error' ? 'Erro' : 'Falha');
          const timestamp = new Date(log.timestamp);
          const timeStr = `${timestamp.toLocaleDateString('pt-BR')} ${timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

          return `
            <tr>
              <td style="font-size: 12px; white-space: nowrap;">${timeStr}</td>
              <td style="font-size: 12px;">
                <span style="color: ${getActionColor(log.action)};">${formatAuditAction(log.action)}</span>
              </td>
              <td style="font-size: 12px;">
                <div>${log.userName || '-'}</div>
                <div style="font-size: 10px; color: #64748b;">${log.userEmail || ''}</div>
              </td>
              <td><span class="status ${statusClass}">${statusLabel}</span></td>
              <td style="font-size: 11px; color: #94a3b8; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                ${log.errorMessage || (log.metadata ? JSON.stringify(log.metadata).substring(0, 50) + '...' : '-')}
              </td>
            </tr>
          `;
        }).join('');
      } else {
        tableEl.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">Nenhum log encontrado</td></tr>';
      }
    }

    // Pagination
    const paginationEl = document.getElementById('audit-pagination');
    if (paginationEl && result.totalPages > 1) {
      let paginationHtml = '';

      // Previous button
      if (page > 1) {
        paginationHtml += `<button onclick="loadAuditLogs(${page - 1})" style="background: #1e293b; border: 1px solid #334155; padding: 6px 12px; border-radius: 4px; color: #f1f5f9; cursor: pointer;">Anterior</button>`;
      }

      // Page info
      paginationHtml += `<span style="color: #94a3b8; padding: 6px 12px;">Pagina ${page} de ${result.totalPages}</span>`;

      // Next button
      if (page < result.totalPages) {
        paginationHtml += `<button onclick="loadAuditLogs(${page + 1})" style="background: #1e293b; border: 1px solid #334155; padding: 6px 12px; border-radius: 4px; color: #f1f5f9; cursor: pointer;">Proxima</button>`;
      }

      paginationEl.innerHTML = paginationHtml;
    } else if (paginationEl) {
      paginationEl.innerHTML = '';
    }
  } catch (err) {
    console.error('Error loading audit logs:', err);
  }
}

// Make functions available globally
window.loadAuditLogs = loadAuditLogs;
window.loadAuditStats = loadAuditStats;
window.loadAuditTimeline = loadAuditTimeline;

// =============================================================================
// AUTH AUDIT FUNCTIONS (for auth.html page)
// =============================================================================

let authLoginsPage = 1;
const authLoginsPageSize = 20;

// Load auth audit stats
async function loadAuthAuditStats() {
  try {
    const stats = await fetch('/api/auth/audit/stats').then(r => r.json());

    const loginsTodayEl = document.getElementById('auth-logins-today');
    const failedLoginsEl = document.getElementById('auth-failed-logins');
    const newDevicesEl = document.getElementById('auth-new-devices');
    const criticalEventsEl = document.getElementById('auth-critical-events');

    if (loginsTodayEl) loginsTodayEl.textContent = stats.loginsToday || 0;
    if (failedLoginsEl) failedLoginsEl.textContent = stats.failedLogins || 0;
    if (newDevicesEl) newDevicesEl.textContent = stats.newDevices || 0;
    if (criticalEventsEl) criticalEventsEl.textContent = stats.criticalEvents || 0;
  } catch (err) {
    console.error('Error loading auth audit stats:', err);
  }
}

// Load auth logins chart
async function loadAuthLoginsChart() {
  try {
    const data = await fetch('/api/auth/audit/logins-chart').then(r => r.json());
    const chartEl = document.getElementById('auth-logins-chart');

    if (chartEl && data.length > 0) {
      if (charts['authLogins']) charts['authLogins'].destroy();

      charts['authLogins'] = new ApexCharts(chartEl, {
        chart: {
          type: 'bar',
          height: 200,
          stacked: true,
          background: chartTheme.background,
          toolbar: { show: false },
          fontFamily: 'Inter, sans-serif'
        },
        series: [
          {
            name: 'Sucesso',
            data: data.map(d => parseInt(d.success) || 0)
          },
          {
            name: 'Falha',
            data: data.map(d => parseInt(d.failed) || 0)
          }
        ],
        colors: ['#22c55e', '#ef4444'],
        plotOptions: {
          bar: {
            borderRadius: 4,
            columnWidth: '60%'
          }
        },
        xaxis: {
          categories: data.map(d => {
            const date = new Date(d.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }),
          labels: { style: { colors: chartTheme.textColor, fontSize: '10px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: { style: { colors: chartTheme.textColor } },
          min: 0
        },
        grid: {
          borderColor: chartTheme.gridColor,
          strokeDashArray: 4
        },
        dataLabels: { enabled: false },
        legend: {
          position: 'top',
          labels: { colors: chartTheme.textColor }
        },
        tooltip: {
          theme: 'dark',
          y: {
            formatter: (val) => val + ' logins'
          }
        }
      });
      charts['authLogins'].render();
    }
  } catch (err) {
    console.error('Error loading auth logins chart:', err);
  }
}

// Load auth logins table
async function loadAuthLogins(page = 1) {
  try {
    authLoginsPage = page;
    const filterEl = document.getElementById('auth-login-filter');
    const success = filterEl ? filterEl.value : '';

    let url = `/api/auth/audit/logins?page=${page}&limit=${authLoginsPageSize}`;
    if (success) url += `&success=${success}`;

    const result = await fetch(url).then(r => r.json());
    const tableEl = document.getElementById('auth-logins-table');

    if (tableEl) {
      if (result.data && result.data.length > 0) {
        tableEl.innerHTML = result.data.map(log => {
          const statusClass = log.success ? 'active' : 'canceled';
          const statusLabel = log.success ? 'Sucesso' : 'Falha';
          const time = formatDateTime(log.created_at);
          const method = formatAuthMethod(log.auth_method);
          const device = log.is_new_device ? '<span style="color: #f59e0b;">Novo</span>' : 'Conhecido';

          return `
            <tr>
              <td style="font-size: 12px; white-space: nowrap;">${time}</td>
              <td style="font-size: 12px;">${log.user_email || '-'}</td>
              <td style="font-size: 11px; color: #64748b;">${log.ip_address || '-'}</td>
              <td style="font-size: 12px;">${method}</td>
              <td><span class="status ${statusClass}">${statusLabel}</span></td>
              <td style="font-size: 12px;">${device}</td>
            </tr>
          `;
        }).join('');
      } else {
        tableEl.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #64748b;">Nenhum login encontrado</td></tr>';
      }
    }

    // Pagination
    renderAuthLoginsPagination(result.page, result.totalPages);
  } catch (err) {
    console.error('Error loading auth logins:', err);
  }
}

// Render pagination for auth logins
function renderAuthLoginsPagination(page, totalPages) {
  const paginationEl = document.getElementById('auth-logins-pagination');
  if (!paginationEl) return;

  if (totalPages > 1) {
    let paginationHtml = '';
    if (page > 1) {
      paginationHtml += `<button onclick="loadAuthLogins(${page - 1})" style="background: #1e293b; border: 1px solid #334155; padding: 6px 12px; border-radius: 4px; color: #f1f5f9; cursor: pointer;">Anterior</button>`;
    }
    paginationHtml += `<span style="color: #94a3b8; padding: 6px 12px;">Pagina ${page} de ${totalPages}</span>`;
    if (page < totalPages) {
      paginationHtml += `<button onclick="loadAuthLogins(${page + 1})" style="background: #1e293b; border: 1px solid #334155; padding: 6px 12px; border-radius: 4px; color: #f1f5f9; cursor: pointer;">Proxima</button>`;
    }
    paginationEl.innerHTML = paginationHtml;
  } else {
    paginationEl.innerHTML = '';
  }
}

// Format auth method
function formatAuthMethod(method) {
  const methods = {
    'password': 'Senha',
    'oauth_google': 'Google',
    'oauth_github': 'GitHub',
    'magic_link': 'Magic Link',
    'api_key': 'API Key'
  };
  return methods[method] || method || '-';
}

// Load auth security events
async function loadAuthSecurityEvents() {
  try {
    const filterEl = document.getElementById('auth-severity-filter');
    const severity = filterEl ? filterEl.value : '';

    let url = '/api/auth/audit/security-events?limit=20';
    if (severity) url += `&severity=${severity}`;

    const result = await fetch(url).then(r => r.json());
    const tableEl = document.getElementById('auth-security-table');

    if (tableEl) {
      if (result.data && result.data.length > 0) {
        tableEl.innerHTML = result.data.map(event => {
          const severityClass = getSeverityClass(event.severity);
          const eventLabel = formatSecurityEventType(event.event_type);
          const time = formatDateTime(event.created_at);
          const resolvedStatus = event.resolved
            ? '<span class="status active">Resolvido</span>'
            : `<span class="status canceled">Pendente</span>`;
          const actionBtn = !event.resolved
            ? `<button onclick="resolveSecurityEvent('${event.id}')" style="background: #22c55e; border: none; padding: 4px 8px; border-radius: 4px; color: white; cursor: pointer; font-size: 11px;">Resolver</button>`
            : '';

          return `
            <tr>
              <td style="font-size: 12px; white-space: nowrap;">${time}</td>
              <td style="font-size: 12px;">${eventLabel}</td>
              <td><span class="status ${severityClass}">${event.severity}</span></td>
              <td style="font-size: 12px;">${event.user_email || '-'}</td>
              <td style="font-size: 11px; color: #64748b;">${event.ip_address || '-'}</td>
              <td>${resolvedStatus}</td>
              <td>${actionBtn}</td>
            </tr>
          `;
        }).join('');
      } else {
        tableEl.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #22c55e;">Nenhum evento de seguranca</td></tr>';
      }
    }
  } catch (err) {
    console.error('Error loading security events:', err);
  }
}

// Get severity CSS class
function getSeverityClass(severity) {
  const classes = {
    'low': 'trialing',
    'medium': 'pending',
    'high': 'canceled',
    'critical': 'canceled'
  };
  return classes[severity] || 'trialing';
}

// Format security event type
function formatSecurityEventType(eventType) {
  const types = {
    'failed_login': 'Login Falho',
    'multiple_failed_logins': 'Multiplos Logins Falhos',
    'password_reset': 'Reset de Senha',
    'password_changed': 'Senha Alterada',
    'email_changed': 'Email Alterado',
    'new_device': 'Novo Dispositivo',
    'suspicious_location': 'Localizacao Suspeita',
    'session_revoked_all': 'Sessoes Revogadas',
    'api_key_created': 'API Key Criada',
    'api_key_revoked': 'API Key Revogada',
    'account_locked': 'Conta Bloqueada',
    'rate_limit_exceeded': 'Rate Limit Excedido'
  };
  return types[eventType] || eventType || '-';
}

// Resolve security event
async function resolveSecurityEvent(eventId) {
  try {
    await fetch(`/api/auth/audit/security-events/${eventId}/resolve`, {
      method: 'PATCH'
    });
    await loadAuthSecurityEvents();
    await loadAuthAuditStats();
  } catch (err) {
    console.error('Error resolving security event:', err);
  }
}

// Load auth admin actions
async function loadAuthAdminActions() {
  try {
    const result = await fetch('/api/auth/audit/admin-actions?limit=20').then(r => r.json());
    const tableEl = document.getElementById('auth-admin-actions-table');

    if (tableEl) {
      if (result.data && result.data.length > 0) {
        tableEl.innerHTML = result.data.map(log => {
          const time = formatDateTime(log.created_at);
          const actionLabel = formatAdminAction(log.action);
          const details = log.changes
            ? JSON.stringify(log.changes).substring(0, 50) + '...'
            : (log.metadata ? JSON.stringify(log.metadata).substring(0, 50) + '...' : '-');

          return `
            <tr>
              <td style="font-size: 12px; white-space: nowrap;">${time}</td>
              <td style="font-size: 12px;">${log.actor_email || '-'}</td>
              <td style="font-size: 12px; color: #3b82f6;">${actionLabel}</td>
              <td style="font-size: 12px;">${log.resource_type || '-'}</td>
              <td style="font-size: 11px; color: #64748b; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${details}</td>
            </tr>
          `;
        }).join('');
      } else {
        tableEl.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">Nenhuma acao administrativa</td></tr>';
      }
    }
  } catch (err) {
    console.error('Error loading admin actions:', err);
  }
}

// Format admin action
function formatAdminAction(action) {
  if (!action) return '-';
  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Make auth audit functions available globally
window.loadAuthLogins = loadAuthLogins;
window.loadAuthSecurityEvents = loadAuthSecurityEvents;
window.loadAuthAdminActions = loadAuthAdminActions;
window.resolveSecurityEvent = resolveSecurityEvent;

// =============================================================================
// BILLING AUDIT FUNCTIONS
// =============================================================================

async function loadBillingAuditData() {
  const days = 7;

  // Load summary stats
  try {
    const summary = await fetch(`/api/billing/audit-logs/summary?days=${days}`).then(r => r.json());
    const sessions = await fetch(`/api/billing/sessions?days=${days}`).then(r => r.json());

    // Total actions count
    const totalActions = summary.byAction?.reduce((sum, a) => sum + parseInt(a.count), 0) || 0;
    const totalEl = document.getElementById('billing-audit-total');
    if (totalEl) totalEl.textContent = totalActions;

    // Critical actions count
    const criticalActions = ['DELETE', 'REVOKE', 'CANCEL', 'DEACTIVATE'];
    const criticalCount = summary.byAction?.filter(a => criticalActions.includes(a.action))
      .reduce((sum, a) => sum + parseInt(a.count), 0) || 0;
    const criticalEl = document.getElementById('billing-audit-critical-count');
    if (criticalEl) criticalEl.textContent = criticalCount;

    // Active admins
    const adminsEl = document.getElementById('billing-audit-admins');
    if (adminsEl) adminsEl.textContent = sessions.activeAdmins?.length || 0;

    // Actions by type
    const byActionEl = document.getElementById('billing-audit-by-action');
    if (byActionEl && summary.byAction?.length > 0) {
      const actionLabels = {
        'CREATE': 'Criar', 'UPDATE': 'Atualizar', 'DELETE': 'Deletar',
        'ACTIVATE': 'Ativar', 'DEACTIVATE': 'Desativar', 'REVOKE': 'Revogar',
        'LOGIN': 'Login', 'LOGOUT': 'Logout', 'LOGIN_NEW_DEVICE': 'Novo Device',
        'CANCEL': 'Cancelar', 'VIEW': 'Visualizar'
      };
      const actionColors = {
        'CREATE': '#22c55e', 'UPDATE': '#3b82f6', 'DELETE': '#ef4444',
        'ACTIVATE': '#22c55e', 'DEACTIVATE': '#f59e0b', 'REVOKE': '#ef4444',
        'LOGIN': '#8b5cf6', 'LOGOUT': '#64748b', 'LOGIN_NEW_DEVICE': '#f59e0b',
        'CANCEL': '#ef4444', 'VIEW': '#64748b'
      };
      byActionEl.innerHTML = summary.byAction.slice(0, 8).map(a => `
        <div class="metric-row" style="padding: 6px 0; border-bottom: 1px solid #334155;">
          <span class="metric-label" style="font-size: 12px; color: ${actionColors[a.action] || '#94a3b8'};">
            ${actionLabels[a.action] || a.action}
          </span>
          <span class="metric-value" style="font-size: 14px;">${a.count}</span>
        </div>
      `).join('');
    } else if (byActionEl) {
      byActionEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Sem acoes registradas</div>';
    }
  } catch (e) { console.error('Error loading billing audit summary:', e); }

  // Load critical actions
  try {
    const critical = await fetch(`/api/billing/audit-logs/critical?days=${days}`).then(r => r.json());
    const criticalEl = document.getElementById('billing-critical-actions');

    if (criticalEl) {
      if (critical.length > 0) {
        criticalEl.innerHTML = critical.slice(0, 10).map(c => {
          const time = new Date(c.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          });
          const actionLabels = { 'DELETE': 'Deletou', 'REVOKE': 'Revogou', 'CANCEL': 'Cancelou', 'DEACTIVATE': 'Desativou' };
          const resourceLabels = { 'PLAN': 'Plano', 'GATEWAY': 'Gateway', 'API_KEY': 'API Key', 'PROJECT': 'Projeto', 'SUBSCRIPTION': 'Assinatura' };
          return `
            <div style="padding: 8px 0; border-bottom: 1px solid #334155; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #ef4444; font-weight: 500;">${actionLabels[c.action] || c.action} ${resourceLabels[c.resource] || c.resource}</span>
                <span style="color: #64748b; font-size: 11px;">${time}</span>
              </div>
              <div style="color: #94a3b8; font-size: 11px; margin-top: 2px;">
                ${c.resource_name || c.resource_id || '-'} por ${c.admin_user_email || 'Sistema'}
              </div>
            </div>
          `;
        }).join('');
      } else {
        criticalEl.innerHTML = '<div style="color: #22c55e; font-size: 13px;">Nenhuma acao critica nos ultimos 7 dias</div>';
      }
    }
  } catch (e) { console.error('Error loading billing critical actions:', e); }

  // Load sessions
  try {
    const sessions = await fetch(`/api/billing/sessions?days=${days}`).then(r => r.json());
    const sessionsEl = document.getElementById('billing-admin-sessions');

    if (sessionsEl) {
      if (sessions.activeAdmins?.length > 0) {
        sessionsEl.innerHTML = sessions.activeAdmins.map(s => {
          const time = new Date(s.last_activity).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          });
          return `
            <div style="padding: 8px 0; border-bottom: 1px solid #334155; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #f1f5f9;">${s.admin_user_email || 'Admin'}</span>
                <span style="color: #64748b; font-size: 11px;">${time}</span>
              </div>
              <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
                IP: ${s.ip_address || '-'}
              </div>
            </div>
          `;
        }).join('');
      } else {
        sessionsEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Nenhuma sessao ativa</div>';
      }
    }
  } catch (e) { console.error('Error loading billing sessions:', e); }

  // Load audit chart (activity per day)
  try {
    const perDay = await fetch(`/api/billing/audit-logs/per-day?days=${days}`).then(r => r.json());
    const chartEl = document.getElementById('billing-audit-chart');

    if (chartEl && perDay.length > 0) {
      if (charts['billingAudit']) charts['billingAudit'].destroy();
      charts['billingAudit'] = new ApexCharts(chartEl, {
        chart: {
          type: 'bar',
          height: 200,
          stacked: true,
          background: chartTheme.background,
          toolbar: { show: false },
          fontFamily: 'Inter, sans-serif'
        },
        series: [
          { name: 'Criar', data: perDay.map(d => d.creates) },
          { name: 'Atualizar', data: perDay.map(d => d.updates) },
          { name: 'Criticas', data: perDay.map(d => d.critical) }
        ],
        colors: ['#22c55e', '#3b82f6', '#ef4444'],
        plotOptions: {
          bar: { borderRadius: 4, columnWidth: '60%' }
        },
        xaxis: {
          categories: perDay.map(d => {
            const date = new Date(d.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }),
          labels: { style: { colors: chartTheme.textColor, fontSize: '10px' } },
          axisBorder: { show: false },
          axisTicks: { show: false }
        },
        yaxis: {
          labels: { style: { colors: chartTheme.textColor } },
          min: 0,
          forceNiceScale: true
        },
        grid: { borderColor: chartTheme.gridColor, strokeDashArray: 4 },
        dataLabels: { enabled: false },
        legend: { position: 'top', labels: { colors: chartTheme.textColor } },
        tooltip: { theme: 'dark' }
      });
      charts['billingAudit'].render();
    }
  } catch (e) { console.error('Error loading billing audit chart:', e); }

  // Load recent audit logs table
  try {
    const logs = await fetch(`/api/billing/audit-logs?days=${days}&limit=15`).then(r => r.json());
    const tableEl = document.getElementById('billing-audit-table');

    if (tableEl) {
      if (logs.data?.length > 0) {
        const actionLabels = {
          'CREATE': 'Criar', 'UPDATE': 'Atualizar', 'DELETE': 'Deletar',
          'ACTIVATE': 'Ativar', 'DEACTIVATE': 'Desativar', 'REVOKE': 'Revogar',
          'LOGIN': 'Login', 'LOGOUT': 'Logout', 'LOGIN_NEW_DEVICE': 'Novo Device',
          'CANCEL': 'Cancelar', 'VIEW': 'Visualizar'
        };
        const resourceLabels = {
          'PLAN': 'Plano', 'GATEWAY': 'Gateway', 'API_KEY': 'API Key',
          'PROJECT': 'Projeto', 'SUBSCRIPTION': 'Assinatura', 'BRANDING': 'Branding',
          'ONE_TIME_PRODUCT': 'Produto', 'SESSION': 'Sessao'
        };
        const actionColors = {
          'CREATE': '#22c55e', 'UPDATE': '#3b82f6', 'DELETE': '#ef4444',
          'ACTIVATE': '#22c55e', 'DEACTIVATE': '#f59e0b', 'REVOKE': '#ef4444',
          'LOGIN': '#8b5cf6', 'LOGOUT': '#64748b', 'CANCEL': '#ef4444'
        };

        tableEl.innerHTML = logs.data.map(log => {
          const time = new Date(log.created_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          });
          const details = log.resource_name || log.resource_id || '-';
          return `
            <tr>
              <td style="font-size: 12px; white-space: nowrap;">${time}</td>
              <td style="font-size: 12px;">${log.admin_user_email || 'Sistema'}</td>
              <td style="font-size: 12px; color: ${actionColors[log.action] || '#94a3b8'};">${actionLabels[log.action] || log.action}</td>
              <td style="font-size: 12px;">${resourceLabels[log.resource] || log.resource}</td>
              <td style="font-size: 11px; color: #64748b; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${details}</td>
            </tr>
          `;
        }).join('');
      } else {
        tableEl.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #64748b;">Nenhuma atividade registrada</td></tr>';
      }
    }
  } catch (e) { console.error('Error loading billing audit table:', e); }
}

// Make billing audit function available globally
window.loadBillingAuditData = loadBillingAuditData;

// =============================================================================
// INITIALIZATION
// =============================================================================
async function init() {
  await loadPage('overview');
  await checkForNewCustomers();
  updateNextRefreshTime();
}

init();
