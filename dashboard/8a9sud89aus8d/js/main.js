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
    'app-oentregador': '#f59e0b'
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
  if (subsStatusEl && data.subsByStatus) {
    if (charts.subsStatus) charts.subsStatus.destroy();
    const statusData = data.subsByStatus;
    const total = (statusData.active || 0) + (statusData.trialing || 0) + (statusData.canceled || 0);
    const activePercent = total > 0 ? Math.round((statusData.active / total) * 100) : 0;
    const trialPercent = total > 0 ? Math.round((statusData.trialing / total) * 100) : 0;
    const canceledPercent = total > 0 ? Math.round((statusData.canceled / total) * 100) : 0;

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
// FUNNEL VISUALIZATION
// =============================================================================
function updateFunnel(data, prefix = '') {
  const visitors = data.details.visitors || 0;
  const registered = data.details.registered;
  const trialing = data.details.trialing;
  const paying = data.details.total_paying;

  // Use visitors as max if available, otherwise registered
  const maxWidth = visitors > 0 ? visitors : (registered || 1);

  // Calculate percentages relative to previous stage
  const regPercent = visitors > 0 ? ((registered / visitors) * 100).toFixed(1) : 100;
  const trialPercent = registered > 0 ? ((trialing / registered) * 100).toFixed(1) : 0;
  const payingPercentOfReg = registered > 0 ? ((paying / registered) * 100).toFixed(1) : 0;

  // Update visitors count
  const countVisitors = document.getElementById(`${prefix}funnel-count-visitors`);
  if (countVisitors) countVisitors.textContent = visitors.toLocaleString('pt-BR');

  // Update counts
  const countRegistered = document.getElementById(`${prefix}funnel-count-registered`);
  const countTrial = document.getElementById(`${prefix}funnel-count-trial`);
  const countPaying = document.getElementById(`${prefix}funnel-count-paying`);

  if (countRegistered) countRegistered.textContent = registered.toLocaleString('pt-BR');
  if (countTrial) countTrial.textContent = trialing.toLocaleString('pt-BR');
  if (countPaying) countPaying.textContent = paying.toLocaleString('pt-BR');

  // Update visual funnel bars (width based on funnel shape)
  const visitorsBar = document.getElementById(`${prefix}funnel-bar-visitors`);
  const registeredBar = document.getElementById(`${prefix}funnel-bar-registered`);
  const trialBar = document.getElementById(`${prefix}funnel-bar-trial`);
  const payingBar = document.getElementById(`${prefix}funnel-bar-paying`);

  if (visitorsBar) {
    visitorsBar.style.width = '100%';
  }
  if (registeredBar) {
    const regWidth = visitors > 0 ? Math.max(40, (registered / maxWidth) * 100) : 70;
    registeredBar.style.width = regWidth + '%';
  }
  if (trialBar) {
    const trialWidth = visitors > 0 ? Math.max(30, (trialing / maxWidth) * 100) : Math.max(30, (trialing / registered) * 70);
    trialBar.style.width = trialWidth + '%';
  }
  if (payingBar) {
    const payingWidth = visitors > 0 ? Math.max(20, (paying / maxWidth) * 100) : Math.max(20, (paying / registered) * 70);
    payingBar.style.width = payingWidth + '%';
  }

  // Update percentage labels on funnel bars
  const percentRegistered = document.getElementById(`${prefix}funnel-percent-registered`);
  const percentTrial = document.getElementById(`${prefix}funnel-percent-trial`);
  const percentPaying = document.getElementById(`${prefix}funnel-percent-paying`);

  if (percentRegistered) percentRegistered.textContent = regPercent + '%';
  if (percentTrial) percentTrial.textContent = trialPercent + '%';
  if (percentPaying) percentPaying.textContent = payingPercentOfReg + '%';

  // Update conversion rates (cards on the right)
  const convVisitorReg = document.getElementById(`${prefix}funnel-conversion-visitor-reg`);
  const convRegTrial = document.getElementById(`${prefix}funnel-conversion-reg-trial`);
  const convTrial = document.getElementById(`${prefix}funnel-conversion-trial`);
  const convTotal = document.getElementById(`${prefix}funnel-conversion-total`);

  if (convVisitorReg) convVisitorReg.textContent = (data.conversion.visitor_to_registered || regPercent) + '%';
  if (convRegTrial) convRegTrial.textContent = trialPercent + '%';
  if (convTrial) convTrial.textContent = data.conversion.trial_to_paid + '%';
  // Visitante -> Pagante (total do funil)
  if (convTotal) {
    const visitorToPaid = visitors > 0 ? ((paying / visitors) * 100).toFixed(1) : data.conversion.registered_to_paid;
    convTotal.textContent = visitorToPaid + '%';
  }

  // Update total summary card (bottom)
  const totalVisitors = document.getElementById(`${prefix}funnel-total-visitors`);
  const totalRegistered = document.getElementById(`${prefix}funnel-total-registered`);
  const totalPaying = document.getElementById(`${prefix}funnel-total-paying`);
  const totalConversion = document.getElementById(`${prefix}funnel-total-conversion`);

  if (totalVisitors) totalVisitors.textContent = visitors.toLocaleString('pt-BR');
  if (totalRegistered) totalRegistered.textContent = registered.toLocaleString('pt-BR');
  if (totalPaying) totalPaying.textContent = paying.toLocaleString('pt-BR');

  // Total conversion: visitor to paying (or registered to paying if no visitors)
  if (totalConversion) {
    const visitorToPaid = visitors > 0 ? ((paying / visitors) * 100).toFixed(1) : data.conversion.registered_to_paid;
    totalConversion.textContent = visitorToPaid + '%';
  }
}

// =============================================================================
// PROJECT PAGE (Auth, Billing, Security, oEntregador)
// =============================================================================
async function loadProjectPage(project) {
  try {
    const data = await fetch(`/api/project/${project}`).then(r => r.json());

    // Cards principais
    const usersEl = document.getElementById(`${project}-users`);
    const mrrEl = document.getElementById(`${project}-mrr`);
    const subsEl = document.getElementById(`${project}-subs`);
    const newEl = document.getElementById(`${project}-new`);

    if (usersEl) usersEl.textContent = data.users.total || 0;
    if (mrrEl) mrrEl.textContent = formatCurrency(data.billing.mrr);
    if (subsEl) subsEl.textContent = (data.billing.active || 0) + (data.billing.trialing || 0);
    if (newEl) newEl.textContent = data.users.new_30d || 0;

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

    // One-time (se existir)
    if (data.one_time) {
      const otPaid = document.getElementById(`${project}-onetime-paid`);
      const otPending = document.getElementById(`${project}-onetime-pending`);
      const otRevenue = document.getElementById(`${project}-onetime-revenue`);
      const subRevenue = document.getElementById(`${project}-sub-revenue`);
      const revSubs = document.getElementById(`${project}-revenue-subs`);
      const revOnetime = document.getElementById(`${project}-revenue-onetime`);

      if (otPaid) otPaid.textContent = data.one_time.paid_purchases || 0;
      if (otPending) otPending.textContent = data.one_time.pending_purchases || 0;
      if (otRevenue) otRevenue.textContent = formatCurrency(data.one_time.revenue);
      if (subRevenue) subRevenue.textContent = formatCurrency(data.billing.subscription_revenue);
      if (revSubs) revSubs.textContent = formatCurrency(data.billing.subscription_revenue);
      if (revOnetime) revOnetime.textContent = formatCurrency(data.one_time.revenue);
    }

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
      updateFunnel(funnelData, `${project}-`);
    } catch (err) { console.error(`Error loading funnel for ${project}:`, err); }

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
}

document.addEventListener('click', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// Sound URLs
const SOUND_URLS = {
  chaChing: 'https://www.soundjay.com/misc/sounds/cash-register-1.mp3',
  applause: 'https://www.soundjay.com/human/sounds/applause-01.mp3'
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
  // Play cha-ching
  const chaChing = sounds.chaChing.cloneNode();
  chaChing.volume = 0.7;
  chaChing.play().catch(() => {});

  // After 0.5s play applause
  setTimeout(() => {
    const applause = sounds.applause.cloneNode();
    applause.volume = 0.5;
    applause.play().catch(() => {});
  }, 500);

  // Use Speech Synthesis
  setTimeout(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance('Aeee! Nova venda!');
      utterance.lang = 'pt-BR';
      utterance.rate = 1.2;
      utterance.pitch = 1.3;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, 300);
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

        if (Notification.permission === 'granted') {
          const msgs = [];
          if (newPaidSubs > 0) msgs.push(`${newPaidSubs} nova(s) assinatura(s)`);
          if (newPurchases > 0) msgs.push(`${newPurchases} nova(s) compra(s)`);

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
  return '';
}

function formatProjectName(name) {
  if (!name) return '-';
  const map = {
    'app-auth': 'Auth',
    'app-billing': 'Billing',
    'security-audit': 'Security',
    'app-oentregador': 'oEntregador',
    'oentregador': 'oEntregador'
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
        <div class="project-card">
          <div class="project-card-header">
            <span class="project-card-name">${formatProjectName(p.name)}</span>
            <span class="project-card-badge ${getProjectClass(p.name)}">${p.active_subs} ativos</span>
          </div>
          <div class="project-card-metrics">
            <div class="project-card-metric full">
              <div class="project-card-metric-value">${formatCurrency(p.total_revenue)}</div>
              <div class="project-card-metric-label">Receita Total</div>
            </div>
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
// INITIALIZATION
// =============================================================================
async function init() {
  await loadPage('overview');
  await checkForNewCustomers();
  updateNextRefreshTime();
}

init();
