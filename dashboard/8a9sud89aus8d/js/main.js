// =============================================================================
// NAVIGATION
// =============================================================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + item.dataset.page).classList.remove('hidden');
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
    // Reload data with new period
    if (page === 'overview') {
      loadAllData();
    } else {
      loadProjectPage(page);
    }
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
// LOAD ALL DATA
// =============================================================================
async function loadAllData() {
  await Promise.all([
    loadOverview(),
    loadProjectPage('auth'),
    loadProjectPage('billing'),
    loadProjectPage('security'),
    loadProjectPage('oentregador')
  ]);
}

// =============================================================================
// OVERVIEW PAGE
// =============================================================================
async function loadOverview() {
  try {
    const data = await fetch('/api/overview').then(r => r.json());

    document.getElementById('total-mrr').textContent = formatCurrency(data.totalMrr);
    document.getElementById('total-onetime').textContent = formatCurrency(data.totalOneTimeRevenue || 0);
    document.getElementById('total-revenue').textContent = formatCurrency(data.totalRevenue || data.totalMrr);
    document.getElementById('total-arr').textContent = formatCurrency(data.totalMrr * 12);
    document.getElementById('total-users').textContent = data.totalUsers || 0;
    document.getElementById('active-subs').textContent = data.totalActiveSubs || 0;
    document.getElementById('total-purchases').textContent = data.totalPaidPurchases || 0;
    document.getElementById('total-customers').textContent = (data.totalActiveSubs || 0) + (data.totalPaidPurchases || 0);

    document.getElementById('overview-users-project').innerHTML = data.usersByProject.map(p => `
      <div class="metric-row">
        <span class="metric-label">${p.project_name}</span>
        <span class="metric-value">${p.total_users} usuarios</span>
      </div>
    `).join('') || '<div class="loading">Sem dados</div>';

    document.getElementById('overview-mrr-project').innerHTML = data.mrrByProject.map(p => `
      <div class="metric-row">
        <span class="metric-label">${p.project_name}</span>
        <span class="metric-value">${formatCurrency(p.mrr)} (${p.active_subs} ativos)</span>
      </div>
    `).join('') || '<div class="loading">Sem dados</div>';

    document.getElementById('overview-onetime-project').innerHTML = (data.oneTimeByProject || []).map(p => `
      <div class="metric-row">
        <span class="metric-label">${p.project_name}</span>
        <span class="metric-value">${formatCurrency(p.revenue)} (${p.paid_purchases} vendas)</span>
      </div>
    `).join('') || '<div class="loading">Sem vendas one-time</div>';

    document.getElementById('overview-subscribers-table').innerHTML = data.recentSubscribers.map(s => `
      <tr>
        <td>${s.email}</td>
        <td>${s.plan_name || '-'}</td>
        <td>${s.project_name || '-'}</td>
        <td>${formatCurrency(s.mrr)}</td>
        <td><span class="status ${s.status}">${s.status}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="5">Sem assinantes</td></tr>';

    // Chart
    if (charts.overview) charts.overview.destroy();
    charts.overview = new Chart(document.getElementById('overviewChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.mrrByProject.map(p => p.project_name),
        datasets: [{
          label: 'MRR (R$)',
          data: data.mrrByProject.map(p => p.mrr || 0),
          backgroundColor: ['#7c3aed', '#059669', '#dc2626', '#ea580c']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' }}},
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: '#334155' }},
          y: { ticks: { color: '#64748b' }, grid: { color: '#334155' }}
        }
      }
    });
  } catch (err) { console.error('Error loading overview:', err); }

  // Load funnel data
  try {
    const funnelData = await fetch('/api/funnel').then(r => r.json());
    updateFunnel(funnelData);
  } catch (err) { console.error('Error loading funnel:', err); }
}

// =============================================================================
// FUNNEL VISUALIZATION
// =============================================================================
function updateFunnel(data, prefix = '') {
  const registered = data.details.registered;
  const trialing = data.details.trialing;
  const paying = data.details.total_paying;
  const maxWidth = registered || 1;

  // Update bars width proportionally
  const registeredBar = document.querySelector(`#${prefix}funnel-registered .funnel-bar`);
  const trialBar = document.querySelector(`#${prefix}funnel-trial .funnel-bar`);
  const payingBar = document.querySelector(`#${prefix}funnel-paying .funnel-bar`);

  if (registeredBar) registeredBar.style.width = '100%';
  if (trialBar) trialBar.style.width = Math.max(5, (trialing / maxWidth) * 100) + '%';
  if (payingBar) payingBar.style.width = Math.max(5, (paying / maxWidth) * 100) + '%';

  // Update counts
  const countRegistered = document.getElementById(`${prefix}funnel-count-registered`);
  const countTrial = document.getElementById(`${prefix}funnel-count-trial`);
  const countPaying = document.getElementById(`${prefix}funnel-count-paying`);

  if (countRegistered) countRegistered.textContent = registered;
  if (countTrial) countTrial.textContent = trialing;
  if (countPaying) countPaying.textContent = paying;

  // Update conversion rates
  const convTrial = document.getElementById(`${prefix}funnel-conversion-trial`);
  const convTotal = document.getElementById(`${prefix}funnel-conversion-total`);

  if (convTrial) convTrial.textContent = data.conversion.trial_to_paid + '%';
  if (convTotal) convTotal.textContent = data.conversion.registered_to_paid + '%';
}

// =============================================================================
// PROJECT PAGE (Auth, Billing, Security, oEntregador)
// =============================================================================
async function loadProjectPage(project) {
  try {
    const data = await fetch(`/api/project/${project}`).then(r => r.json());

    // Cards principais
    document.getElementById(`${project}-users`).textContent = data.users.total || 0;
    document.getElementById(`${project}-mrr`).textContent = formatCurrency(data.billing.mrr);
    document.getElementById(`${project}-subs`).textContent = (data.billing.active || 0) + (data.billing.trialing || 0);
    document.getElementById(`${project}-new`).textContent = data.users.new_30d || 0;

    // Usuarios
    document.getElementById(`${project}-users-total`).textContent = data.users.total || 0;
    document.getElementById(`${project}-users-verified`).textContent = data.users.verified || 0;
    document.getElementById(`${project}-users-active`).textContent = data.users.active_7d || 0;
    document.getElementById(`${project}-users-today`).textContent = data.users.new_today || 0;

    // Assinaturas
    document.getElementById(`${project}-subs-active`).textContent = data.billing.active || 0;
    document.getElementById(`${project}-subs-trial`).textContent = data.billing.trialing || 0;
    document.getElementById(`${project}-subs-canceled`).textContent = data.billing.canceled || 0;
    document.getElementById(`${project}-revenue`).textContent = formatCurrency(data.billing.total_revenue);

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
        document.getElementById('security-scans-total').textContent = scanData.total_scans || 0;
        document.getElementById('security-scans-paid').textContent = scanData.paid_scans || 0;
        document.getElementById('security-scans-free').textContent = scanData.free_scans || 0;
        document.getElementById('security-scans-trial').textContent = scanData.trial_scans || 0;

        const percentage = scanData.total_scans > 0
          ? Math.round((scanData.paid_scans / scanData.total_scans) * 100)
          : 0;
        document.getElementById('security-paid-percentage').textContent = percentage + '%';
      } catch (e) { console.error('Error loading scan stats:', e); }
    }

    // Tabela
    document.getElementById(`${project}-table`).innerHTML = data.subscribers.map(s => `
      <tr>
        <td>${s.email}</td>
        <td>${s.plan_name || '-'}</td>
        <td>${formatCurrency(s.mrr)}</td>
        <td><span class="status ${s.status}">${s.status}</span></td>
        <td>${formatDateTime(s.created_at)}</td>
      </tr>
    `).join('') || '<tr><td colspan="5">Sem assinantes</td></tr>';

    // Chart
    if (charts[project]) charts[project].destroy();
    const colors = { auth: '#7c3aed', billing: '#059669', security: '#dc2626', oentregador: '#ea580c' };
    charts[project] = new Chart(document.getElementById(`${project}Chart`).getContext('2d'), {
      type: 'line',
      data: {
        labels: data.growth.map(g => formatDate(g.date)),
        datasets: [{
          label: 'Novos usuarios',
          data: data.growth.map(g => g.count),
          borderColor: colors[project],
          backgroundColor: colors[project] + '20',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#94a3b8' }}},
        scales: {
          x: { ticks: { color: '#64748b' }, grid: { color: '#334155' }},
          y: { ticks: { color: '#64748b' }, grid: { color: '#334155' }}
        }
      }
    });

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
// INITIALIZATION
// =============================================================================
async function init() {
  await checkForNewCustomers();
  await loadAllData();
  updateNextRefreshTime();
}

init();
