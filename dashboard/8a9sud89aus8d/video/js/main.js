// =============================================================================
// MAIN.JS - YouTube Automation SPA entry point
// =============================================================================

import { Router } from './router.js';
import { api } from './api.js';
import {
    getState, setState, setProject, setTopic,
    clearProjectContext, subscribe,
} from './state.js';
import { $, escapeHtml, executeInlineScripts } from './utils/dom.js';
import { showToast } from './components/toast.js';

// =============================================================================
// PAGE LOADERS REGISTRY
// Each page module will register itself here when created.
// For now, stubs render placeholder HTML from /pages/*.html
// =============================================================================
const PAGE_LOADERS = {};

/** Registers a page loader function. */
export function registerPage(name, loaderFn) {
    PAGE_LOADERS[name] = loaderFn;
}

// =============================================================================
// ROUTER SETUP
// =============================================================================
const router = new Router();
let _activePollingId = null;

/** Cancels any active polling from the previous page. */
export function stopPolling() {
    if (_activePollingId) {
        clearInterval(_activePollingId);
        _activePollingId = null;
    }
}

/** Starts a polling interval, tracked so it is cleaned up on navigate. */
export function startPolling(fn, intervalMs) {
    stopPolling();
    _activePollingId = setInterval(fn, intervalMs);
}

// =============================================================================
// NAVIGATION HANDLER
// =============================================================================
router.onNavigate = async (match) => {
    if (!match) {
        router.navigate('projects');
        return;
    }

    stopPolling();

    const { page, params } = match;
    const container = $('#yt-page-content');
    container.innerHTML = '<div class="loading">Carregando...</div>';

    try {
        await _syncContext(params);
        await _loadPageContent(page, container);
        _callPageLoader(page, params);
        _updateSidebarActive(page);
    } catch (err) {
        console.error('[Nav] Error:', err);
        container.innerHTML =
            '<div class="loading">Erro ao carregar pagina.</div>';
    }
};

/** Syncs project/topic context from route params. */
async function _syncContext(params) {
    const state = getState();
    const { projectId, topicId } = params;

    if (projectId && projectId !== state.currentProjectId) {
        const project = await api.projects.get(projectId);
        setProject(project);
    } else if (!projectId && state.currentProjectId) {
        clearProjectContext();
    }

    if (topicId && topicId !== state.currentTopicId) {
        const pid = params.projectId || state.currentProjectId;
        const topic = await api.topics.get(pid, topicId);
        setTopic(topic);
    } else if (!topicId && state.currentTopicId) {
        setTopic(null);
    }
}

/** Loads the page HTML fragment from /pages/{page}.html. */
async function _loadPageContent(page, container) {
    try {
        const res = await fetch(`pages/${page}.html`);
        if (!res.ok) throw new Error(`Page ${page} not found`);
        container.innerHTML = await res.text();
        executeInlineScripts(container);
    } catch {
        container.innerHTML = `
            <div class="yt-empty-state">
                <div class="yt-empty-state-icon">&#128196;</div>
                <div class="yt-empty-state-message">
                    Pagina "${escapeHtml(page)}" ainda nao implementada.
                </div>
            </div>`;
    }
}

/** Calls the registered page loader if available. */
function _callPageLoader(page, params) {
    const loader = PAGE_LOADERS[page];
    if (typeof loader === 'function') {
        loader(params);
    }
}

// =============================================================================
// SIDEBAR RENDERING
// =============================================================================
function renderSidebar(state) {
    const sidebar = $('#yt-sidebar');
    if (!sidebar) return;

    if (state.sidebarMode === 'project' && state.currentProject) {
        sidebar.innerHTML = _renderProjectSidebar(state);
    } else {
        sidebar.innerHTML = _renderListSidebar();
    }

    _bindSidebarLinks();
}

function _renderListSidebar() {
    return `
        <div class="yt-sidebar-logo">
            <span class="yt-logo-accent">YT</span> Automation
        </div>
        <div class="yt-sidebar-section">
            <div class="yt-sidebar-section-title">Projetos</div>
            <a class="yt-sidebar-link active" data-page="projects"
               href="#/projects">
                <span class="yt-nav-icon">&#128193;</span> Todos os Projetos
            </a>
        </div>
        <div class="yt-sidebar-spacer"></div>
        <div class="yt-sidebar-footer">
            <a class="yt-sidebar-link" href="/admin/">
                <span class="yt-nav-icon">&#8592;</span> Admin Dashboard
            </a>
            <a class="yt-sidebar-link" href="/analytics/">
                <span class="yt-nav-icon">&#128200;</span> Analytics
            </a>
        </div>`;
}

function _renderProjectSidebar(state) {
    const p = state.currentProject;
    const pid = state.currentProjectId;
    const name = escapeHtml(p.name || p.channelName || 'Projeto');

    return `
        <div class="yt-sidebar-logo">
            <span class="yt-logo-accent">YT</span> Automation
        </div>
        <a class="yt-sidebar-back" href="#/projects">
            <span>&#8592;</span> Voltar aos Projetos
        </a>
        <div class="yt-sidebar-project-name" title="${name}">
            ${name}
        </div>
        <div class="yt-sidebar-section">
            <div class="yt-sidebar-section-title">Conteudo</div>
            <a class="yt-sidebar-link" data-page="sources"
               href="#/projects/${pid}/sources">
                <span class="yt-nav-icon">&#128218;</span> Fontes
            </a>
            <a class="yt-sidebar-link" data-page="topics"
               href="#/projects/${pid}/topics">
                <span class="yt-nav-icon">&#128196;</span> Topicos
            </a>
            <a class="yt-sidebar-link" data-page="pipeline"
               href="#/projects/${pid}/pipeline">
                <span class="yt-nav-icon">&#9881;</span> Pipeline
            </a>
        </div>
        <div class="yt-sidebar-section">
            <div class="yt-sidebar-section-title">Publicacao</div>
            <a class="yt-sidebar-link" data-page="publishing"
               href="#/projects/${pid}/publishing">
                <span class="yt-nav-icon">&#128228;</span> Fila
            </a>
        </div>
        <div class="yt-sidebar-section">
            <div class="yt-sidebar-section-title">Configuracao</div>
            <a class="yt-sidebar-link" data-page="project-settings"
               href="#/projects/${pid}/settings">
                <span class="yt-nav-icon">&#9881;</span> Settings
            </a>
        </div>
        <div class="yt-sidebar-spacer"></div>
        <div class="yt-sidebar-footer">
            <a class="yt-sidebar-link" href="/analytics/">
                <span class="yt-nav-icon">&#128200;</span> Analytics
            </a>
        </div>`;
}

function _bindSidebarLinks() {
    const links = document.querySelectorAll('.yt-sidebar-link[data-page]');
    links.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            if (href) {
                router.navigate(href.replace('#/', ''));
            }
            _closeMobileSidebar();
        });
    });
}

function _updateSidebarActive(page) {
    document.querySelectorAll('.yt-sidebar-link').forEach((el) => {
        el.classList.toggle('active', el.dataset.page === page);
    });
}

// =============================================================================
// MOBILE SIDEBAR TOGGLE
// =============================================================================
function _initMobileMenu() {
    const toggle = $('#yt-menu-toggle');
    const sidebar = $('#yt-sidebar');
    const overlay = $('#yt-sidebar-overlay');

    if (!toggle || !sidebar || !overlay) return;

    toggle.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('active');
        if (isOpen) {
            _closeMobileSidebar();
        } else {
            sidebar.classList.add('active');
            toggle.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    });

    overlay.addEventListener('click', _closeMobileSidebar);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            _closeMobileSidebar();
        }
    });
}

function _closeMobileSidebar() {
    const sidebar = $('#yt-sidebar');
    const toggle = $('#yt-menu-toggle');
    const overlay = $('#yt-sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (toggle) toggle.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// =============================================================================
// EXPOSE GLOBALS (for onclick handlers in HTML page fragments)
// =============================================================================
window.ytRouter = router;
window.ytApi = api;
window.ytState = { getState, setState, setProject, setTopic };
window.ytToast = showToast;
window.ytStopPolling = stopPolling;
window.ytStartPolling = startPolling;
window.ytRegisterPage = registerPage;

// =============================================================================
// INIT
// =============================================================================
subscribe(renderSidebar);
_initMobileMenu();
renderSidebar(getState());
router.start();
