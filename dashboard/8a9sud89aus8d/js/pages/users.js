// Users Page Module
// =============================================================================
// Funções relacionadas à página de gerenciamento de usuários
// =============================================================================

import { formatCurrency, formatDateTime, formatProjectName } from '../utils/helpers.js';

let usersSearchTimeout = null;

/**
 * Debounce para busca de usuários
 * Aguarda 300ms após o último input antes de executar a busca
 */
export function debounceSearch() {
  clearTimeout(usersSearchTimeout);
  usersSearchTimeout = setTimeout(() => loadUsersPage(), 300);
}

/**
 * Carrega a página de usuários com filtros
 * Busca dados da API e atualiza a tabela e estatísticas
 */
export async function loadUsersPage() {
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

/**
 * Retorna a classe CSS baseada no nome do projeto
 * @param {string} projectName - Nome do projeto
 * @returns {string} Classe CSS correspondente
 */
export function getProjectClass(projectName) {
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
