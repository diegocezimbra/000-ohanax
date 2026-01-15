// =============================================================================
// Audit Functions Module
// =============================================================================

let auditCurrentPage = 1;
const auditPageSize = 20;

let authLoginsPage = 1;
const authLoginsPageSize = 20;

// =============================================================================
// FORMATTERS
// =============================================================================

/**
 * Format number with locale
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('pt-BR');
}

/**
 * Format date and time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date/time string
 */
export function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('pt-BR');
}

/**
 * Format audit action for display
 * @param {string} action - Action identifier
 * @returns {string} Human-readable action label
 */
export function formatAuditAction(action) {
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

/**
 * Get color for action type
 * @param {string} action - Action identifier
 * @returns {string} Color hex code
 */
export function getActionColor(action) {
  if (action.includes('error') || action.includes('failed') || action.includes('wrong')) return '#ef4444';
  if (action.includes('not_found')) return '#f59e0b';
  if (action.includes('login') || action.includes('register')) return '#8b5cf6';
  if (action.includes('bipagem') || action.includes('scan')) return '#22c55e';
  if (action.includes('config')) return '#3b82f6';
  if (action.includes('sync')) return '#06b6d4';
  return '#64748b';
}

/**
 * Format auth method for display
 * @param {string} method - Auth method identifier
 * @returns {string} Human-readable method label
 */
export function formatAuthMethod(method) {
  const methods = {
    'password': 'Senha',
    'oauth_google': 'Google',
    'oauth_github': 'GitHub',
    'magic_link': 'Magic Link',
    'api_key': 'API Key'
  };
  return methods[method] || method || '-';
}

/**
 * Get severity CSS class
 * @param {string} severity - Severity level
 * @returns {string} CSS class name
 */
export function getSeverityClass(severity) {
  const classes = {
    'low': 'trialing',
    'medium': 'pending',
    'high': 'canceled',
    'critical': 'canceled'
  };
  return classes[severity] || 'trialing';
}

/**
 * Format security event type
 * @param {string} eventType - Event type identifier
 * @returns {string} Human-readable event label
 */
export function formatSecurityEventType(eventType) {
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

/**
 * Format admin action for display
 * @param {string} action - Admin action identifier
 * @returns {string} Human-readable action label
 */
export function formatAdminAction(action) {
  if (!action) return '-';
  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// =============================================================================
// oENTREGADOR AUDIT FUNCTIONS
// =============================================================================

/**
 * Load audit statistics for oEntregador
 * @param {Object} options - Options containing charts object and chartTheme
 */
export async function loadAuditStats() {
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

/**
 * Load audit timeline chart for oEntregador
 * @param {Object} charts - Charts registry object
 * @param {Object} chartTheme - Chart theme configuration
 */
export async function loadAuditTimeline(charts, chartTheme) {
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

/**
 * Load audit logs table for oEntregador
 * @param {number} page - Page number to load
 */
export async function loadAuditLogs(page = 1) {
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
    renderAuditPagination(result.totalPages, page);
  } catch (err) {
    console.error('Error loading audit logs:', err);
  }
}

/**
 * Render pagination for audit logs
 * @param {number} totalPages - Total number of pages
 * @param {number} page - Current page
 */
export function renderAuditPagination(totalPages, page) {
  const paginationEl = document.getElementById('audit-pagination');
  if (!paginationEl) return;

  if (totalPages > 1) {
    let paginationHtml = '';

    // Previous button
    if (page > 1) {
      paginationHtml += `<button onclick="loadAuditLogs(${page - 1})" style="background: #1e293b; border: 1px solid #334155; padding: 6px 12px; border-radius: 4px; color: #f1f5f9; cursor: pointer;">Anterior</button>`;
    }

    // Page info
    paginationHtml += `<span style="color: #94a3b8; padding: 6px 12px;">Pagina ${page} de ${totalPages}</span>`;

    // Next button
    if (page < totalPages) {
      paginationHtml += `<button onclick="loadAuditLogs(${page + 1})" style="background: #1e293b; border: 1px solid #334155; padding: 6px 12px; border-radius: 4px; color: #f1f5f9; cursor: pointer;">Proxima</button>`;
    }

    paginationEl.innerHTML = paginationHtml;
  } else {
    paginationEl.innerHTML = '';
  }
}

// =============================================================================
// AUTH AUDIT FUNCTIONS (for auth.html page)
// =============================================================================

/**
 * Load auth audit statistics
 */
export async function loadAuthAuditStats() {
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

/**
 * Load auth logins chart
 * @param {Object} charts - Charts registry object
 * @param {Object} chartTheme - Chart theme configuration
 */
export async function loadAuthLoginsChart(charts, chartTheme) {
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

/**
 * Load auth logins table
 * @param {number} page - Page number to load
 * @param {string} filter - Optional filter value
 */
export async function loadAuthLogins(page = 1, filter = '') {
  try {
    authLoginsPage = page;
    const filterEl = document.getElementById('auth-login-filter');
    const success = filter || (filterEl ? filterEl.value : '');

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

/**
 * Render pagination for auth logins
 * @param {number} page - Current page
 * @param {number} totalPages - Total number of pages
 */
export function renderAuthLoginsPagination(page, totalPages) {
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

/**
 * Load auth security events
 * @param {number} page - Page number to load
 */
export async function loadAuthSecurityEvents(page = 1) {
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

/**
 * Resolve a security event
 * @param {string} eventId - Event ID to resolve
 */
export async function resolveSecurityEvent(eventId) {
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

/**
 * Load auth admin actions
 * @param {number} page - Page number to load
 */
export async function loadAuthAdminActions(page = 1) {
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

// =============================================================================
// BILLING AUDIT FUNCTIONS
// =============================================================================

/**
 * Load billing audit data (summary, critical actions, sessions, chart, table)
 * @param {Object} charts - Charts registry object
 * @param {Object} chartTheme - Chart theme configuration
 */
export async function loadBillingAuditData(charts, chartTheme) {
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

// =============================================================================
// GLOBAL WINDOW ASSIGNMENTS (for onclick handlers in HTML)
// =============================================================================

// Make functions available globally for onclick handlers
if (typeof window !== 'undefined') {
  window.loadAuditLogs = loadAuditLogs;
  window.loadAuditStats = loadAuditStats;
  window.loadAuthLogins = loadAuthLogins;
  window.loadAuthSecurityEvents = loadAuthSecurityEvents;
  window.loadAuthAdminActions = loadAuthAdminActions;
  window.resolveSecurityEvent = resolveSecurityEvent;
  window.loadBillingAuditData = loadBillingAuditData;
}
