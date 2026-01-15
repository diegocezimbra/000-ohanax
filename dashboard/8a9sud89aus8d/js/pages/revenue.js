// Revenue Page Module

import { formatCurrency, formatDate, formatDateTime, formatProjectName, getProjectClass } from '../utils/formatters.js';
import { charts, chartTheme } from '../charts.js';

export async function loadRevenuePage() {
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
