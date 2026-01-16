// =============================================================================
// MAIN.JS - Dashboard Entry Point
// Importa e orquestra todos os modulos
// =============================================================================

// Import utilities
import {
  formatCurrency, formatDate, formatDateTime, formatNumber,
  getProjectClass, formatProjectName, projectMapping, chartTheme
} from './utils/helpers.js';

// Import page modules
import { loadOverview, renderOverviewCharts, renderFunnelChart } from './pages/overview.js';
import { initProjectModule, loadProjectPage, renderProjectFunnel, loadAllScans, debounceAllScansSearch, loadLeads, debounceLeadsSearch } from './pages/project.js';
import { debounceSearch, loadUsersPage, getProjectClass as getUsersProjectClass } from './pages/users.js';
import { debouncePayingSearch, loadPayingPage } from './pages/paying.js';
import { loadRevenuePage } from './pages/revenue.js';
import {
  loadAuditStats, loadAuditTimeline, loadAuditLogs, formatAuditAction,
  loadAuthAuditStats, loadAuthLoginsChart, loadAuthLogins, loadAuthSecurityEvents, loadAuthAdminActions,
  loadBillingAuditData
} from './pages/audit.js';
import { initAdsSecurityModule, loadAdsSecurityPage, filterAdsTable } from './pages/ads-security.js';

// =============================================================================
// GLOBAL STATE
// =============================================================================
let currentPage = 'overview';
const pageCache = {};
let charts = {};

// =============================================================================
// EXPOSE GLOBALS (necessario para onclick handlers no HTML)
// =============================================================================
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatNumber = formatNumber;
window.getProjectClass = getProjectClass;
window.formatProjectName = formatProjectName;
window.projectMapping = projectMapping;
window.chartTheme = chartTheme;
window.charts = charts;

// Page loaders
window.loadOverview = loadOverview;
window.loadProjectPage = loadProjectPage;
window.loadUsersPage = loadUsersPage;
window.loadPayingPage = loadPayingPage;
window.loadRevenuePage = loadRevenuePage;

// Audit functions
window.loadAuditStats = loadAuditStats;
window.loadAuditTimeline = loadAuditTimeline;
window.loadAuditLogs = loadAuditLogs;
window.loadAuthAuditStats = loadAuthAuditStats;
window.loadAuthLoginsChart = loadAuthLoginsChart;
window.loadAuthLogins = loadAuthLogins;
window.loadAuthSecurityEvents = loadAuthSecurityEvents;
window.loadAuthAdminActions = loadAuthAdminActions;
window.loadBillingAuditData = loadBillingAuditData;

// Search debounce
window.debounceSearch = debounceSearch;
window.debouncePayingSearch = debouncePayingSearch;
window.debounceAllScansSearch = debounceAllScansSearch;

// All scans list
window.loadAllScans = loadAllScans;

// Leads
window.loadLeads = loadLeads;
window.debounceLeadsSearch = debounceLeadsSearch;

// Ads Security
window.loadAdsSecurityPage = loadAdsSecurityPage;
window.filterAdsTable = filterAdsTable;
window.loadAdsData = loadAdsSecurityPage;

// =============================================================================
// INITIALIZE PROJECT MODULE
// =============================================================================
initProjectModule({
  charts,
  chartTheme,
  formatCurrency,
  formatDate,
  formatDateTime,
  loadAuditStats,
  loadAuditTimeline,
  loadAuditLogs,
  loadBillingAuditData,
  loadAuthAuditStats,
  loadAuthLoginsChart,
  loadAuthLogins,
  loadAuthSecurityEvents,
  loadAuthAdminActions
});

// Initialize Ads Security module
initAdsSecurityModule({
  charts,
  chartTheme,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber
});

// =============================================================================
// PAGE LOADER
// =============================================================================
async function loadPage(pageName) {
  const container = document.getElementById('page-content');

  // Show loading
  container.innerHTML = '<div class="loading">Carregando...</div>';

  try {
    // Always fetch fresh to ensure scripts are re-executed
    const response = await fetch(`pages/${pageName}.html`);
    if (!response.ok) throw new Error('Page not found');
    const html = await response.text();
    container.innerHTML = html;
    currentPage = pageName;

    // Execute inline scripts (they don't run when using innerHTML)
    executeInlineScripts(container);

    loadPageData(pageName);
  } catch (err) {
    console.error(`Error loading page ${pageName}:`, err);
    container.innerHTML = '<div class="loading">Erro ao carregar pagina</div>';
  }
}

// Helper to execute inline scripts after innerHTML
function executeInlineScripts(container) {
  const scripts = container.querySelectorAll('script');
  scripts.forEach(oldScript => {
    const newScript = document.createElement('script');
    // Copy attributes
    Array.from(oldScript.attributes).forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    // Copy content
    newScript.textContent = oldScript.textContent;
    // Replace old script with new one to execute it
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
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
    case 'ads-security':
      loadAdsSecurityPage();
      break;
    default:
      loadProjectPage(pageName);
  }
}

window.loadPage = loadPage;
window.loadPageData = loadPageData;

// =============================================================================
// MOBILE MENU TOGGLE
// =============================================================================
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
  sidebar.classList.add('active');
  menuToggle.classList.add('active');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('active');
  menuToggle.classList.remove('active');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

function toggleSidebar() {
  if (sidebar.classList.contains('active')) {
    closeSidebar();
  } else {
    openSidebar();
  }
}

// Toggle menu ao clicar no botão hamburger
menuToggle.addEventListener('click', toggleSidebar);

// Fechar menu ao clicar no overlay
sidebarOverlay.addEventListener('click', closeSidebar);

// Fechar menu com tecla ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sidebar.classList.contains('active')) {
    closeSidebar();
  }
});

// =============================================================================
// NAVIGATION
// =============================================================================
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    loadPage(item.dataset.page);
    // Fechar sidebar no mobile após selecionar página
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  });
});

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

window.getDateRange = getDateRange;
window.onPeriodChange = onPeriodChange;

// =============================================================================
// LOAD ALL DATA (reload current page)
// =============================================================================
async function loadAllData() {
  loadPageData(currentPage);
}

window.loadAllData = loadAllData;

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

  // Esconde o botao
  const btn = document.getElementById('unlock-audio-btn');
  if (btn) btn.classList.add('unlocked');
}

// Botao de desbloquear audio - sempre aparece ate clicar
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

  // 2. Pausa... depois palmas de comemoracao
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
// INITIALIZATION
// =============================================================================
async function init() {
  await loadPage('overview');
  await checkForNewCustomers();
  updateNextRefreshTime();
}

init();
