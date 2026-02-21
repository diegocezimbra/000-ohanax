// =============================================================================
// PAGE: topics - Lista de historias do projeto (v3 - Content Engine)
// =============================================================================

import { openModal } from '../components/modal.js';
import { renderStatusBadge, renderRichnessBadge } from '../components/badge.js';
import { escapeHtml } from '../utils/dom.js';
import { formatDuration } from '../utils/helpers.js';

const api = window.ytApi;
const toast = window.ytToast;
const router = window.ytRouter;

let _pid = null;
let _selected = new Set();

// -----------------------------------------------------------------------------
// Page loader
// -----------------------------------------------------------------------------
window.ytRegisterPage('topics', async (params) => {
    _pid = params.projectId;
    _selected.clear();

    document.getElementById('btn-new-topic')?.addEventListener('click', openNewTopicModal);
    document.getElementById('btn-bulk-reprocess')?.addEventListener('click', bulkReprocess);
    document.getElementById('filter-status')?.addEventListener('change', loadTopics);
    document.getElementById('filter-sort')?.addEventListener('change', loadTopics);

    await loadTopics();
});

async function loadTopics() {
    const loading = document.getElementById('topics-loading');
    const empty = document.getElementById('topics-empty');
    const grid = document.getElementById('topics-grid');

    loading.style.display = 'block';
    empty.style.display = 'none';
    grid.style.display = 'none';

    const status = document.getElementById('filter-status')?.value || '';
    const sort = document.getElementById('filter-sort')?.value || 'newest';

    try {
        const topics = await api.topics.list(_pid, { status, sort });
        loading.style.display = 'none';

        if (!topics || topics.length === 0) {
            empty.style.display = 'block';
            empty.innerHTML = `
                <div class="yt-empty-state">
                    <div class="yt-empty-state-icon">&#128196;</div>
                    <div class="yt-empty-state-message">
                        Nenhuma historia encontrada. Adicione fontes ao pool e o Content Engine ira descobrir historias automaticamente.
                    </div>
                    <button class="yt-btn yt-btn-primary yt-empty-state-action"
                            id="btn-empty-topic">+ Nova Historia</button>
                </div>`;
            document.getElementById('btn-empty-topic')
                ?.addEventListener('click', openNewTopicModal);
            return;
        }

        grid.style.display = '';
        grid.innerHTML = topics.map(renderTopicCard).join('');
        bindCardEvents();
    } catch (err) {
        loading.style.display = 'none';
        toast('Erro ao carregar historias: ' + err.message, 'error');
    }
}

// -----------------------------------------------------------------------------
// Card rendering
// -----------------------------------------------------------------------------
function renderTopicCard(t) {
    const title = escapeHtml(t.title || 'Sem titulo');
    const angle = escapeHtml(t.angle || '--');
    const score = t.richness_score ?? t.richnessScore ?? null;
    const stage = t.pipeline_stage || t.pipelineStage || 'selected';
    const duration = t.estimated_duration || t.estimatedDuration || 0;
    const scorePercent = score != null ? (score / 10) * 100 : 0;

    const pipelineError = t.pipeline_error || t.pipelineError || '';
    const isError = stage === 'error';
    const isBilling = pipelineError.toLowerCase().includes('billing') || pipelineError.toLowerCase().includes('insufficient credit');
    let errorHtml = '';
    if (isError && pipelineError) {
        const icon = isBilling ? '&#128179;' : '&#9888;';
        const shortMsg = pipelineError.length > 100 ? pipelineError.substring(0, 100) + '...' : pipelineError;
        errorHtml = `<div style="font-size:12px;color:${isBilling ? 'var(--color-warning)' : 'var(--color-danger)'};margin-bottom:8px;line-height:1.3;" title="${escapeHtml(pipelineError)}">${icon} ${escapeHtml(shortMsg)}</div>`;
    }

    return `
        <div class="yt-card ${isError ? 'yt-card--error' : ''}" data-topic-id="${t.id}">
            <div class="yt-card-header" style="align-items:flex-start;">
                <label class="yt-topic-check" style="display:flex;align-items:center;gap:8px;"
                       onclick="event.stopPropagation();">
                    <input type="checkbox" class="topic-select" data-id="${t.id}">
                </label>
                ${renderStatusBadge(stage)}
            </div>
            <div class="yt-card-body yt-card-clickable" data-nav="${t.id}">
                <h3 class="yt-card-title" style="margin-bottom:8px;">${title}</h3>
                <p style="color:var(--color-text-secondary);font-size:13px;margin-bottom:12px;">
                    ${angle}
                </p>${errorHtml}
                <div style="margin-bottom:8px;">
                    <label class="yt-label" style="font-size:12px;">
                        Riqueza: ${score != null ? score + '/10' : '--'}
                    </label>
                    <div class="yt-progress">
                        <div class="yt-progress-bar" style="width:${scorePercent}%;"></div>
                    </div>
                </div>
                <div style="color:var(--color-text-secondary);font-size:13px;margin-bottom:4px;">
                    &#128218; ${t.source_count || t.sourceCount || '?'} fonte(s)
                </div>
                <div style="color:var(--color-text-secondary);font-size:13px;">
                    &#9202; ${formatDuration(duration)}
                </div>
            </div>
        </div>`;
}

function bindCardEvents() {
    document.querySelectorAll('[data-nav]').forEach(el => {
        el.addEventListener('click', () => {
            router.navigate(`projects/${_pid}/topics/${el.dataset.nav}`);
        });
    });

    document.querySelectorAll('.topic-select').forEach(cb => {
        cb.addEventListener('change', () => {
            if (cb.checked) _selected.add(cb.dataset.id);
            else _selected.delete(cb.dataset.id);
            updateBulkBtn();
        });
    });
}

function updateBulkBtn() {
    const btn = document.getElementById('btn-bulk-reprocess');
    if (btn) btn.style.display = _selected.size > 0 ? '' : 'none';
}

// -----------------------------------------------------------------------------
// Bulk reprocess
// -----------------------------------------------------------------------------
async function bulkReprocess() {
    if (_selected.size === 0) return;
    try {
        const promises = [..._selected].map(id => api.topics.reprocess(_pid, id));
        await Promise.all(promises);
        toast(`${_selected.size} historia(s) enviadas para reprocessamento!`, 'success');
        _selected.clear();
        updateBulkBtn();
        await loadTopics();
    } catch (err) {
        toast('Erro ao reprocessar: ' + err.message, 'error');
    }
}

// -----------------------------------------------------------------------------
// New topic modal
// -----------------------------------------------------------------------------
async function openNewTopicModal() {
    // Load available sources for selection
    let sources = [];
    try { sources = await api.sources.list(_pid); } catch { /* silent */ }

    const sourceCheckboxes = sources.length > 0
        ? sources.map(s => `
            <label style="display:flex;align-items:center;gap:8px;padding:8px;
                background:var(--color-bg-elevated);border:1px solid var(--color-border);
                border-radius:var(--radius-md);cursor:pointer;font-size:var(--font-size-sm);">
                <input type="checkbox" class="topic-source-cb" value="${s.id}">
                ${escapeHtml(s.title || s.url || 'Fonte sem titulo')}
            </label>`).join('')
        : '<p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">Nenhuma fonte no pool. Adicione fontes primeiro.</p>';

    const body = `
        <div class="yt-form-group">
            <label class="yt-label">Titulo *</label>
            <input class="yt-input" id="topic-title" maxlength="200"
                   placeholder="Ex: Como a IA esta mudando o marketing">
        </div>
        <div class="yt-form-group">
            <label class="yt-label">Angulo / Abordagem</label>
            <input class="yt-input" id="topic-angle" maxlength="200"
                   placeholder="Ex: Tutorial pratico para iniciantes">
        </div>
        <div class="yt-form-group">
            <label class="yt-label">Publico-Alvo</label>
            <input class="yt-input" id="topic-audience" maxlength="200"
                   placeholder="Ex: Profissionais de marketing digital">
        </div>
        <div class="yt-form-group">
            <label class="yt-label">Fontes do Pool (selecione as relacionadas)</label>
            <div style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto;padding:4px;">
                ${sourceCheckboxes}
            </div>
        </div>
        <div class="yt-form-group">
            <label class="yt-label">Pontos-Chave (um por linha)</label>
            <textarea class="yt-textarea" id="topic-points" rows="4"
                      placeholder="Ponto 1\nPonto 2\nPonto 3"></textarea>
        </div>`;

    const footer = `
        <button class="yt-btn yt-btn-ghost" id="topic-cancel">Cancelar</button>
        <button class="yt-btn yt-btn-primary" id="topic-save">Criar Historia</button>`;

    const modal = openModal({ title: 'Nova Historia', size: 'md', body, footer });

    modal.el.querySelector('#topic-cancel')?.addEventListener('click', () => modal.close());
    modal.el.querySelector('#topic-save')?.addEventListener('click', async () => {
        const title = modal.el.querySelector('#topic-title')?.value?.trim();
        if (!title) { toast('Titulo e obrigatorio', 'error'); return; }

        const angle = modal.el.querySelector('#topic-angle')?.value?.trim();
        const target_audience = modal.el.querySelector('#topic-audience')?.value?.trim();
        const raw = modal.el.querySelector('#topic-points')?.value?.trim();
        const key_points = raw ? raw.split('\n').map(s => s.trim()).filter(Boolean) : [];
        const source_ids = [...modal.el.querySelectorAll('.topic-source-cb:checked')].map(cb => cb.value);

        try {
            await api.topics.create(_pid, { title, angle, target_audience, key_points, source_ids });
            toast('Historia criada com sucesso!', 'success');
            modal.close();
            await loadTopics();
        } catch (err) {
            toast('Erro ao criar historia: ' + err.message, 'error');
        }
    });
}
