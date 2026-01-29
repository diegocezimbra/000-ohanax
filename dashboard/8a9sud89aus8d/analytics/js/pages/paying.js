// Paying Page Module

import { formatCurrency, formatDateTime, getProjectClass, formatProjectName } from '../utils/helpers.js';

let payingSearchTimeout = null;

export function debouncePayingSearch() {
  clearTimeout(payingSearchTimeout);
  payingSearchTimeout = setTimeout(() => loadPayingPage(), 300);
}

export async function loadPayingPage() {
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
