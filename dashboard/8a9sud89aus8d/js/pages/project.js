// =============================================================================
// Project Pages Module
// Handles Auth, Billing, Security, oEntregador project pages
// =============================================================================

// These will be injected from main.js or imported
let charts = {};
let chartTheme = {};
let formatCurrency = null;
let formatDate = null;
let formatDateTime = null;
let loadAuditStats = null;
let loadAuditTimeline = null;
let loadAuditLogs = null;
let loadBillingAuditData = null;
let loadAuthAuditStats = null;
let loadAuthLoginsChart = null;
let loadAuthLogins = null;
let loadAuthSecurityEvents = null;
let loadAuthAdminActions = null;

/**
 * Initialize the project module with dependencies
 * @param {Object} deps - Dependencies object
 */
export function initProjectModule(deps) {
  charts = deps.charts || {};
  chartTheme = deps.chartTheme || {};
  formatCurrency = deps.formatCurrency || ((v) => `R$ ${v}`);
  formatDate = deps.formatDate || ((d) => d);
  formatDateTime = deps.formatDateTime || ((d) => d);
  loadAuditStats = deps.loadAuditStats || (() => {});
  loadAuditTimeline = deps.loadAuditTimeline || (() => {});
  loadAuditLogs = deps.loadAuditLogs || (() => {});
  loadBillingAuditData = deps.loadBillingAuditData || (() => {});
  loadAuthAuditStats = deps.loadAuthAuditStats || (() => {});
  loadAuthLoginsChart = deps.loadAuthLoginsChart || (() => {});
  loadAuthLogins = deps.loadAuthLogins || (() => {});
  loadAuthSecurityEvents = deps.loadAuthSecurityEvents || (() => {});
  loadAuthAdminActions = deps.loadAuthAdminActions || (() => {});
}

// =============================================================================
// FUNNEL VISUALIZATION FOR PROJECT PAGES
// =============================================================================
export function renderProjectFunnel(data, project) {
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
export async function loadProjectPage(project) {
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

      // Revenue section - Assinaturas e One-Time (dados do billing)
      try {
        // Carregar dados de pagamento do billing
        const payingData = await fetch('/api/security/paying?limit=10').then(r => r.json());
        const summary = payingData.summary || {};

        // Usar dados do summary se disponíveis, senão usar os valores já carregados
        const actualMrr = summary.mrr || mrr;
        const actualActiveSubs = summary.active_subs || activeSubs;
        const actualOnetimeRevenue = summary.onetime_revenue || oneTimeRevenue;
        const actualOnetimeCount = summary.onetime_count || oneTimeCount;

        // Popular a seção de receita com dados corretos
        const subRevenueEl = document.getElementById('security-sub-revenue');
        const subsInfoEl = document.getElementById('security-subs');
        const totalRevenueEl = document.getElementById('security-total-revenue');

        if (subRevenueEl) subRevenueEl.textContent = formatCurrency(actualMrr);
        if (subsInfoEl) subsInfoEl.textContent = actualActiveSubs + ' assinantes ativos';
        if (totalRevenueEl) totalRevenueEl.textContent = formatCurrency(actualMrr + actualOnetimeRevenue);

        const tableEl = document.getElementById('security-table');

        if (tableEl) {
          const subs = payingData.subscribers || [];
          const onetime = payingData.onetime_purchases || [];

          // Combinar assinantes e compras one-time
          const allTransactions = [
            ...subs.map(s => ({
              email: s.email,
              name: s.plan_name || 'Plano',
              value: s.mrr || 0,
              type: 'Assinatura',
              status: s.status,
              created_at: s.created_at,
              isOnetime: false
            })),
            ...onetime.map(o => ({
              email: o.email,
              name: o.package_name || 'Pacote Avulso',
              value: o.amount || 0,
              type: 'One-Time',
              status: o.status,
              created_at: o.paid_at || o.created_at,
              isOnetime: true
            }))
          ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

          if (allTransactions.length > 0) {
            tableEl.innerHTML = allTransactions.map(t => `
              <tr ${t.isOnetime ? 'style="background: rgba(245, 158, 11, 0.08);"' : ''}>
                <td>${t.email || '-'}</td>
                <td ${t.isOnetime ? 'style="color: #f59e0b;"' : ''}>${t.name}</td>
                <td>${formatCurrency(t.value)}</td>
                <td style="font-size: 11px; ${t.isOnetime ? 'color: #f59e0b;' : 'color: #22c55e;'}">${t.type}</td>
                <td style="font-size: 11px;">${formatDateTime(t.created_at)}</td>
              </tr>
            `).join('');
          } else {
            tableEl.innerHTML = '<tr><td colspan="5" style="color: #64748b;">Sem transacoes recentes</td></tr>';
          }
        }

        // Mostrar percentual one-time sobre total
        const totalRev = actualMrr + actualOnetimeRevenue;
        if (totalRev > 0) {
          const oneTimePercent = ((actualOnetimeRevenue / totalRev) * 100).toFixed(0);

          const oneTimeCountEl = document.getElementById('security-onetime-count');
          if (oneTimeCountEl) {
            oneTimeCountEl.textContent = `${actualOnetimeCount} pacotes (${oneTimePercent}% da receita)`;
          }
        }
      } catch (e) { console.error('Error loading revenue section:', e); }

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

      // Scan Funnel - Detailed (from Umami events)
      try {
        const funnelData = await fetch('/api/security/scan-funnel?days=30').then(r => r.json());

        // Update cards
        const pageviewsEl = document.getElementById('scan-funnel-pageviews');
        const engagementEl = document.getElementById('scan-funnel-engagement');
        const engagementPctEl = document.getElementById('scan-funnel-engagement-pct');
        const startedEl = document.getElementById('scan-funnel-started');
        const startedPctEl = document.getElementById('scan-funnel-started-pct');
        const purchasesEl = document.getElementById('scan-funnel-purchases');
        const purchasesPctEl = document.getElementById('scan-funnel-purchases-pct');

        // Mapear nomes do backend para o frontend
        const funnel = funnelData.funnel || {};
        if (pageviewsEl) pageviewsEl.textContent = funnel.pageView || funnel.totalPageviews || 0;
        if (engagementEl) engagementEl.textContent = funnel.formStart || 0;
        if (engagementPctEl) engagementPctEl.textContent = (funnelData.conversions?.pageToFormStart || 0) + '% engajaram';
        if (startedEl) startedEl.textContent = funnel.formSubmit || 0;
        if (startedPctEl) startedPctEl.textContent = (funnelData.conversions?.formStartToSubmit || 0) + '% iniciaram';
        if (purchasesEl) purchasesEl.textContent = funnel.checkoutSuccess || 0;
        if (purchasesPctEl) purchasesPctEl.textContent = (funnelData.conversions?.overallConversion || 0) + '% conversao';

        // Update details
        const paymentPageEl = document.getElementById('scan-funnel-payment-page');
        const checkoutEl = document.getElementById('scan-funnel-checkout');
        const emailErrorsEl = document.getElementById('scan-funnel-email-errors');
        const existingUsersEl = document.getElementById('scan-funnel-existing-users');
        const registerClickEl = document.getElementById('scan-funnel-register-click');
        const scanErrorsEl = document.getElementById('scan-funnel-scan-errors');

        if (paymentPageEl) paymentPageEl.textContent = funnel.resultView || 0;
        if (checkoutEl) checkoutEl.textContent = funnel.checkoutStart || 0;
        if (emailErrorsEl) emailErrorsEl.textContent = 0; // Não temos esse evento específico
        if (existingUsersEl) existingUsersEl.textContent = 0; // Não temos esse evento específico
        if (registerClickEl) registerClickEl.textContent = funnel.clickRegister || 0;
        if (scanErrorsEl) scanErrorsEl.textContent = funnel.scanError || 0;

        // Render dropouts list
        const dropoutsEl = document.getElementById('scan-funnel-dropouts');
        if (dropoutsEl && funnelData.dropouts) {
          const dropouts = funnelData.dropouts;
          const items = [
            { label: 'Abandono no Form', value: dropouts.formAbandonment || 0, color: '#f59e0b' },
            { label: 'Email Invalido', value: dropouts.emailFailed || 0, color: '#ef4444' },
            { label: 'Usuario Existente', value: dropouts.existingUser || 0, color: '#3b82f6' },
            { label: 'Abandono Pagamento', value: dropouts.paymentAbandonment || 0, color: '#f59e0b' },
            { label: 'Abandono Checkout', value: dropouts.checkoutAbandonment || 0, color: '#ef4444' },
            { label: 'Erros de Scan', value: dropouts.scanErrors || 0, color: '#ef4444' }
          ].filter(item => item.value > 0);

          if (items.length > 0) {
            dropoutsEl.innerHTML = items.map(item => `
              <div class="metric-row" style="padding: 8px 0; border-bottom: 1px solid #334155;">
                <span class="metric-label">${item.label}</span>
                <span class="metric-value" style="color: ${item.color};">${item.value}</span>
              </div>
            `).join('');
          } else {
            dropoutsEl.innerHTML = '<div style="color: #22c55e; padding: 16px;">Sem abandonos significativos</div>';
          }
        }

        // Render funnel chart
        const funnelChartEl = document.getElementById('scan-funnel-chart');
        if (funnelChartEl && funnelData.funnel) {
          const f = funnelData.funnel;
          if (charts['scanFunnel']) charts['scanFunnel'].destroy();
          charts['scanFunnel'] = new ApexCharts(funnelChartEl, {
            chart: {
              type: 'bar',
              height: 280,
              background: chartTheme.background,
              toolbar: { show: false },
              fontFamily: 'Inter, sans-serif'
            },
            series: [{
              name: 'Usuarios',
              data: [
                f.pageViews || 0,
                f.formEngagement || 0,
                f.trialStarted || 0,
                f.paymentPageView || 0,
                f.initiateCheckout || 0,
                f.purchaseCompleted || 0
              ]
            }],
            colors: ['#6366f1', '#8b5cf6', '#3b82f6', '#f59e0b', '#22c55e', '#10b981'],
            plotOptions: {
              bar: {
                borderRadius: 4,
                horizontal: true,
                distributed: true,
                dataLabels: { position: 'top' }
              }
            },
            xaxis: {
              categories: ['Page View', 'Engajou Form', 'Iniciou Scan', 'Pag. Pagamento', 'Iniciou Checkout', 'Comprou'],
              labels: { style: { colors: chartTheme.textColor } }
            },
            yaxis: { labels: { style: { colors: chartTheme.textColor } } },
            grid: { borderColor: chartTheme.gridColor, strokeDashArray: 4 },
            dataLabels: {
              enabled: true,
              formatter: (val) => val,
              offsetX: 30,
              style: { colors: ['#fff'], fontSize: '12px' }
            },
            legend: { show: false },
            tooltip: { theme: 'dark' }
          });
          charts['scanFunnel'].render();
        }
      } catch (e) { console.error('Error loading scan funnel:', e); }

      // Database Trial Funnel - Real data from security_trial_sessions
      try {
        const dbFunnelData = await fetch('/api/security/trial-funnel').then(r => r.json());

        // Update cards
        const dbStartedEl = document.getElementById('db-funnel-started');
        const dbCompletedEl = document.getElementById('db-funnel-completed');
        const dbCompletedPctEl = document.getElementById('db-funnel-completed-pct');
        const dbPaidEl = document.getElementById('db-funnel-paid');
        const dbPaidPctEl = document.getElementById('db-funnel-paid-pct');
        const dbRegisteredEl = document.getElementById('db-funnel-registered');
        const dbRegisteredPctEl = document.getElementById('db-funnel-registered-pct');

        const funnel = dbFunnelData.funnel || {};
        const conversions = dbFunnelData.conversions || {};

        if (dbStartedEl) dbStartedEl.textContent = funnel.scansStarted || 0;
        if (dbCompletedEl) dbCompletedEl.textContent = funnel.scansCompleted || 0;
        if (dbCompletedPctEl) dbCompletedPctEl.textContent = (conversions.startedToCompleted || 0) + '% dos iniciados';
        if (dbPaidEl) dbPaidEl.textContent = funnel.paidTotal || 0;
        if (dbPaidPctEl) dbPaidPctEl.textContent = (conversions.completedToPaid || 0) + '% dos completados';
        if (dbRegisteredEl) dbRegisteredEl.textContent = funnel.fullyConverted || 0;
        if (dbRegisteredPctEl) dbRegisteredPctEl.textContent = (conversions.overallConversion || 0) + '% conversao total';

        // Update main conversion rate KPI
        const conversionRateEl = document.getElementById('security-conversion-rate');
        if (conversionRateEl) {
          const rate = conversions.startedToPaid || conversions.completedToPaid || 0;
          conversionRateEl.textContent = rate + '%';
        }

        // Update timing metrics
        const timeToPayEl = document.getElementById('db-funnel-time-to-pay');
        const timeToRegisterEl = document.getElementById('db-funnel-time-to-register');
        const withVulnsEl = document.getElementById('db-funnel-with-vulns');
        const vulnConversionEl = document.getElementById('db-funnel-vuln-conversion');

        const timings = dbFunnelData.timings || {};
        if (timeToPayEl) timeToPayEl.textContent = (timings.avgHoursToPayment || 0).toFixed(1) + ' h';
        if (timeToRegisterEl) timeToRegisterEl.textContent = (timings.avgHoursToRegistration || 0).toFixed(1) + ' h';
        if (withVulnsEl) withVulnsEl.textContent = funnel.withVulnerabilities || 0;

        // Calculate vulnerability to payment conversion
        const vulnToPaidRate = funnel.withVulnerabilities > 0
          ? ((funnel.paidTotal / funnel.withVulnerabilities) * 100).toFixed(1)
          : 0;
        if (vulnConversionEl) vulnConversionEl.textContent = vulnToPaidRate + '%';

        // Hot leads (paid but not registered)
        const hotLeadsEl = document.getElementById('db-funnel-hot-leads');
        const hotLeads = dbFunnelData.leads?.hot || dbFunnelData.hotLeads || [];
        if (hotLeadsEl) {
          if (hotLeads.length > 0) {
            hotLeadsEl.innerHTML = hotLeads.map(lead => `
              <div style="padding: 8px 0; border-bottom: 1px solid #334155; font-size: 13px;">
                <div style="color: #f59e0b;">${lead.email || 'Email nao informado'}</div>
                <div style="color: #64748b; font-size: 11px; margin-top: 2px;">
                  Projeto: ${lead.project_name || '-'} | Pagou: ${formatDate(lead.paid_at)}
                </div>
              </div>
            `).join('');
          } else {
            hotLeadsEl.innerHTML = '<div style="color: #22c55e; font-size: 13px;">Todos os pagantes estao registrados!</div>';
          }
        }

        // Cold leads (completed but not paid)
        const coldLeadsEl = document.getElementById('db-funnel-cold-leads');
        const coldLeads = dbFunnelData.leads?.cold || dbFunnelData.coldLeads || [];
        if (coldLeadsEl) {
          if (coldLeads.length > 0) {
            coldLeadsEl.innerHTML = coldLeads.slice(0, 10).map(lead => `
              <div style="padding: 6px 0; border-bottom: 1px solid #334155; font-size: 12px;">
                <div style="color: #94a3b8;">${lead.email || 'Email nao informado'}</div>
                <div style="color: #64748b; font-size: 11px;">
                  ${lead.project_name || '-'} | ${formatDate(lead.created_at)}
                </div>
              </div>
            `).join('');
          } else {
            coldLeadsEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Sem leads frios</div>';
          }
        }

        // Recent conversions
        const recentConversionsEl = document.getElementById('db-funnel-recent-conversions');
        if (recentConversionsEl && dbFunnelData.recentConversions) {
          if (dbFunnelData.recentConversions.length > 0) {
            recentConversionsEl.innerHTML = dbFunnelData.recentConversions.map(conv => `
              <div style="padding: 6px 0; border-bottom: 1px solid #334155; font-size: 12px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #10b981;">${conv.email || '-'}</span>
                  <span style="color: #64748b; font-size: 11px;">${formatDate(conv.claimed_at)}</span>
                </div>
                <div style="color: #64748b; font-size: 11px;">${conv.project_name || '-'}</div>
              </div>
            `).join('');
          } else {
            recentConversionsEl.innerHTML = '<div style="color: #64748b; font-size: 13px;">Sem conversoes recentes</div>';
          }
        }

        // Render DB funnel chart
        const dbFunnelChartEl = document.getElementById('db-trial-funnel-chart');
        if (dbFunnelChartEl && funnel) {
          if (charts['dbTrialFunnel']) charts['dbTrialFunnel'].destroy();
          charts['dbTrialFunnel'] = new ApexCharts(dbFunnelChartEl, {
            chart: {
              type: 'bar',
              height: 260,
              background: chartTheme.background,
              toolbar: { show: false },
              fontFamily: 'Inter, sans-serif'
            },
            series: [{
              name: 'Quantidade',
              data: [
                funnel.scansStarted || 0,
                funnel.scansCompleted || 0,
                funnel.withVulnerabilities || 0,
                funnel.paidTotal || 0,
                funnel.fullyConverted || 0
              ]
            }],
            colors: ['#6366f1', '#8b5cf6', '#f59e0b', '#22c55e', '#10b981'],
            plotOptions: {
              bar: {
                borderRadius: 4,
                horizontal: true,
                distributed: true,
                dataLabels: { position: 'top' }
              }
            },
            xaxis: {
              categories: ['Iniciados', 'Completados', 'Com Vulns', 'Pagaram', 'Registraram'],
              labels: { style: { colors: chartTheme.textColor } }
            },
            yaxis: { labels: { style: { colors: chartTheme.textColor } } },
            grid: { borderColor: chartTheme.gridColor, strokeDashArray: 4 },
            dataLabels: {
              enabled: true,
              formatter: (val) => val,
              offsetX: 30,
              style: { colors: ['#fff'], fontSize: '12px' }
            },
            legend: { show: false },
            tooltip: { theme: 'dark' }
          });
          charts['dbTrialFunnel'].render();
        }
      } catch (e) { console.error('Error loading DB trial funnel:', e); }

      // Load all scans list
      loadAllScans(1);

      // ========================================
      // ANALYTICS FUNNEL - Internal Database (security_analytics_events)
      // ========================================
      try {
        const analyticsFunnel = await fetch('/api/security/analytics-funnel?days=30').then(r => r.json());

        // Update metric cards
        const afSessionsEl = document.getElementById('af-total-sessions');
        const afVisitorsEl = document.getElementById('af-total-visitors');
        const afConversionEl = document.getElementById('af-conversion-rate');

        if (afSessionsEl) afSessionsEl.textContent = (analyticsFunnel.totals?.uniqueSessions || 0).toLocaleString('pt-BR');
        if (afVisitorsEl) afVisitorsEl.textContent = (analyticsFunnel.totals?.uniqueVisitors || 0).toLocaleString('pt-BR');
        if (afConversionEl) afConversionEl.textContent = (analyticsFunnel.totals?.conversionRate || 0) + '%';

        // Update funnel steps
        const steps = analyticsFunnel.funnelSteps || [];
        steps.forEach((step, index) => {
          const countEl = document.getElementById(`af-step-${index + 1}-count`);
          const pctEl = document.getElementById(`af-step-${index + 1}-pct`);

          if (countEl) countEl.textContent = step.count.toLocaleString('pt-BR');
          if (pctEl) pctEl.textContent = step.percentage + '%';
        });

        // Update dropouts
        const dropouts = analyticsFunnel.dropouts || [];
        dropouts.forEach((dropout, index) => {
          const dropoutEl = document.getElementById(`af-dropout-${index + 1}`);
          if (dropoutEl) {
            dropoutEl.textContent = `-${dropout.count} (${dropout.rate}%)`;
          }
        });

        // UTM Sources - usando o novo layout
        const utmListEl = document.getElementById('af-utm-sources');
        if (utmListEl && analyticsFunnel.utmSources) {
          if (analyticsFunnel.utmSources.length > 0) {
            utmListEl.innerHTML = analyticsFunnel.utmSources.map(utm => `
              <div class="funnel-utm-item">
                <div class="funnel-utm-source">
                  <span class="funnel-utm-badge">${utm.source || 'direto'}</span>
                </div>
                <span class="funnel-utm-count">${utm.count}</span>
              </div>
            `).join('');
          } else {
            utmListEl.innerHTML = '<div class="funnel-utm-empty">Sem dados de UTM no periodo</div>';
          }
        }

        // Daily trends chart
        const afChartEl = document.getElementById('af-daily-chart');
        if (afChartEl && analyticsFunnel.dailyTrends && analyticsFunnel.dailyTrends.length > 0) {
          if (charts['analyticsFunnel']) charts['analyticsFunnel'].destroy();
          charts['analyticsFunnel'] = new ApexCharts(afChartEl, {
            chart: {
              type: 'area',
              height: 200,
              background: chartTheme.background,
              toolbar: { show: false },
              fontFamily: 'Inter, sans-serif'
            },
            series: [
              { name: 'Page Views', data: analyticsFunnel.dailyTrends.map(d => d.pageViews || 0) },
              { name: 'Form Starts', data: analyticsFunnel.dailyTrends.map(d => d.formStarts || 0) },
              { name: 'Scans', data: analyticsFunnel.dailyTrends.map(d => d.scansStarted || 0) },
              { name: 'Payments', data: analyticsFunnel.dailyTrends.map(d => d.payments || 0) }
            ],
            colors: ['#6366f1', '#8b5cf6', '#f59e0b', '#22c55e'],
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.1 } },
            xaxis: {
              categories: analyticsFunnel.dailyTrends.map(d => {
                const date = new Date(d.date);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }),
              labels: { style: { colors: chartTheme.textColor, fontSize: '10px' } },
              axisBorder: { show: false },
              axisTicks: { show: false }
            },
            yaxis: { labels: { style: { colors: chartTheme.textColor } } },
            grid: { borderColor: chartTheme.gridColor, strokeDashArray: 4 },
            legend: { position: 'top', labels: { colors: chartTheme.textColor } },
            tooltip: { theme: 'dark' }
          });
          charts['analyticsFunnel'].render();
        }
      } catch (e) { console.error('Error loading analytics funnel:', e); }
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
// ALL SCANS LIST (Trial + Paid)
// =============================================================================
let allScansSearchTimeout = null;

export function debounceAllScansSearch() {
  clearTimeout(allScansSearchTimeout);
  allScansSearchTimeout = setTimeout(() => loadAllScans(1), 300);
}

export async function loadAllScans(page = 1) {
  try {
    const typeEl = document.getElementById('all-scans-type');
    const statusEl = document.getElementById('all-scans-status');
    const searchEl = document.getElementById('all-scans-search');
    const tableEl = document.getElementById('all-scans-table');
    const countEl = document.getElementById('all-scans-count');
    const paginationEl = document.getElementById('all-scans-pagination');

    if (!tableEl) return;

    const type = typeEl?.value || '';
    const status = statusEl?.value || '';
    const search = searchEl?.value || '';

    tableEl.innerHTML = '<tr><td colspan="8" class="loading">Carregando...</td></tr>';

    const params = new URLSearchParams({ page, limit: 30 });
    if (type) params.append('type', type);
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const data = await fetch(`/api/security/all-scans?${params}`).then(r => r.json());

    if (countEl) countEl.textContent = data.pagination.total;

    if (data.scans.length === 0) {
      tableEl.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #64748b;">Nenhum scan encontrado</td></tr>';
    } else {
      tableEl.innerHTML = data.scans.map(scan => {
        const typeLabel = scan.scan_type === 'trial'
          ? '<span style="background: #f59e0b; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">TRIAL</span>'
          : '<span style="background: #22c55e; color: #000; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">PAGO</span>';

        const statusColor = {
          'completed': '#22c55e',
          'claimed': '#10b981',
          'scanning': '#f59e0b',
          'pending': '#94a3b8',
          'expired': '#ef4444',
          'failed': '#ef4444'
        }[scan.status] || '#94a3b8';

        const paymentColor = {
          'paid': '#22c55e',
          'free': '#3b82f6',
          'pending': '#f59e0b'
        }[scan.payment_status] || '#94a3b8';

        const frontendUrl = scan.frontend_url || '-';
        const backendUrl = scan.backend_url || '-';
        const truncatedFrontend = frontendUrl.length > 30 ? frontendUrl.substring(0, 30) + '...' : frontendUrl;
        const truncatedBackend = backendUrl.length > 30 ? backendUrl.substring(0, 30) + '...' : backendUrl;

        return `
          <tr>
            <td>${typeLabel}</td>
            <td style="font-size: 12px;">${scan.email || '-'}</td>
            <td style="font-size: 11px;" title="${frontendUrl}">${truncatedFrontend}</td>
            <td style="font-size: 11px;" title="${backendUrl}">${truncatedBackend}</td>
            <td style="font-size: 12px;">${scan.project_name || '-'}</td>
            <td><span style="color: ${statusColor};">${scan.status}</span></td>
            <td><span style="color: ${paymentColor};">${scan.payment_label || scan.payment_status || '-'}</span></td>
            <td style="font-size: 11px;">${formatDateTime(scan.created_at)}</td>
          </tr>
        `;
      }).join('');
    }

    // Render pagination
    if (paginationEl && data.pagination.totalPages > 1) {
      let paginationHtml = '';
      const { page: currentPage, totalPages, hasPrev, hasNext } = data.pagination;

      if (hasPrev) {
        paginationHtml += `<button onclick="loadAllScans(${currentPage - 1})">&laquo; Anterior</button>`;
      }

      paginationHtml += `<span style="margin: 0 12px; color: #94a3b8;">Página ${currentPage} de ${totalPages}</span>`;

      if (hasNext) {
        paginationHtml += `<button onclick="loadAllScans(${currentPage + 1})">Próximo &raquo;</button>`;
      }

      paginationEl.innerHTML = paginationHtml;
    } else if (paginationEl) {
      paginationEl.innerHTML = '';
    }
  } catch (err) {
    console.error('Error loading all scans:', err);
    const tableEl = document.getElementById('all-scans-table');
    if (tableEl) {
      tableEl.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #ef4444;">Erro ao carregar scans</td></tr>';
    }
  }
}
