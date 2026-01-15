// =============================================================================
// Overview Page Module
// =============================================================================
// Este modulo depende das seguintes variaveis/funcoes globais do main.js:
// - formatCurrency(value)
// - formatDate(date)
// - charts (objeto para armazenar instancias dos graficos)
// - chartTheme (objeto com cores do tema)
// - formatProjectName(name)
// =============================================================================

/**
 * Carrega os dados da pagina Overview
 */
export async function loadOverview() {
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

/**
 * Renderiza todos os graficos da pagina Overview
 * @param {Object} data - Dados da API de overview
 */
export function renderOverviewCharts(data) {
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

/**
 * Renderiza o grafico de funil de conversao
 * @param {Object} data - Dados da API de funnel
 */
export function renderFunnelChart(data) {
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
