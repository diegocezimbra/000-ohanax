// =============================================================================
// VISUALS PAGE - Grid de assets visuais por segmento
// =============================================================================
import { escapeHtml } from '../utils/dom.js';
import { truncate } from '../utils/helpers.js';

const STATUS_MAP = {
    completed: { label: 'Concluido', badge: 'success' },
    processing: { label: 'Processando', badge: 'warning' },
    pending: { label: 'Pendente', badge: 'info' },
    failed: { label: 'Falhou', badge: 'danger' },
};

export async function loadVisuals(params) {
    const { projectId, topicId } = params;
    const api = window.ytApi;
    const toast = window.ytToast;
    const router = window.ytRouter;

    const grid = document.getElementById('vis-grid');
    const loading = document.getElementById('vis-loading');
    const empty = document.getElementById('vis-empty');
    const regenAllBtn = document.getElementById('vis-regen-all');
    const stats = document.getElementById('vis-stats');

    // Breadcrumb navigation
    const topicTitle = window.ytState?.getState()?.currentTopic?.title || 'Historia';
    document.getElementById('vis-bc-pipeline')?.addEventListener('click', () => router.navigate(`projects/${projectId}/pipeline`));
    const bcTopic = document.getElementById('vis-bc-topic');
    if (bcTopic) {
        bcTopic.textContent = topicTitle;
        bcTopic.addEventListener('click', () => router.navigate(`projects/${projectId}/topics/${topicId}`));
    }
    document.getElementById('vis-back')?.addEventListener('click', () => router.navigate(`projects/${projectId}/topics/${topicId}`));

    // Fetch visuals
    let visuals = [];
    try {
        visuals = await api.visuals.list(projectId, topicId);
        if (!Array.isArray(visuals)) visuals = visuals.segments || visuals.data || [];
    } catch (err) {
        toast('Erro ao carregar assets visuais: ' + err.message, 'error');
        loading.style.display = 'none';
        return;
    }

    loading.style.display = 'none';

    if (!visuals.length) {
        empty.style.display = '';
        return;
    }

    // Stats
    const done = visuals.filter(v => v.status === 'completed').length;
    const pending = visuals.length - done;
    document.getElementById('vis-stat-total').textContent = visuals.length;
    document.getElementById('vis-stat-done').textContent = done;
    document.getElementById('vis-stat-pending').textContent = pending;
    stats.style.display = '';

    regenAllBtn.disabled = false;
    grid.style.display = '';
    renderGrid(visuals, projectId, topicId);

    // Regenerar todos
    regenAllBtn.onclick = async () => {
        regenAllBtn.disabled = true;
        regenAllBtn.textContent = 'Regenerando...';
        try {
            await api.visuals.regenerateAll(projectId, topicId);
            toast('Regeneracao de todos os assets iniciada!', 'success');
            loadVisuals(params);
        } catch (err) {
            toast('Erro ao regenerar todos: ' + err.message, 'error');
            regenAllBtn.disabled = false;
            regenAllBtn.textContent = 'Regenerar Todos';
        }
    };
}

function renderGrid(visuals, projectId, topicId) {
    const grid = document.getElementById('vis-grid');
    grid.innerHTML = visuals.map((seg, idx) => {
        const status = STATUS_MAP[seg.status] || STATUS_MAP.pending;
        const imgUrl = seg.url || seg.presignedUrl || seg.thumbnailUrl || '';
        const prompt = escapeHtml(truncate(seg.visualPrompt || seg.prompt || '', 120));
        const segType = escapeHtml(seg.segmentType || seg.type || 'visual');

        return `
        <div class="yt-card" data-segment-id="${escapeHtml(seg.id || seg.segmentId || idx)}">
            <div class="yt-card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:600;">Segmento ${seg.index ?? idx + 1}</span>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span class="yt-badge yt-badge-info">${segType}</span>
                    <span class="yt-badge yt-badge-${status.badge}">${status.label}</span>
                </div>
            </div>
            <div class="yt-card-body">
                <div class="yt-img-placeholder" style="aspect-ratio:16/9;cursor:pointer;margin-bottom:12px;"
                     onclick="window._ytVisualsPreview('${escapeHtml(imgUrl)}', '${prompt}', ${seg.index ?? idx + 1})">
                    ${imgUrl
                        ? `<img src="${escapeHtml(imgUrl)}" alt="Segmento ${seg.index ?? idx + 1}" style="width:100%;height:100%;object-fit:cover;">`
                        : `<span style="color:var(--text-tertiary);font-size:2rem;">&#128444;</span>`
                    }
                </div>
                <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-bottom:12px;min-height:36px;">
                    ${prompt || '<em>Sem prompt</em>'}
                </p>
                <button class="yt-btn yt-btn-sm" data-regen="${escapeHtml(seg.id || seg.segmentId || idx)}">
                    Regenerar
                </button>
            </div>
        </div>`;
    }).join('');

    // Bind individual regen buttons
    grid.querySelectorAll('[data-regen]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const segId = btn.dataset.regen;
            btn.disabled = true;
            btn.textContent = 'Regenerando...';
            try {
                await window.ytApi.visuals.regenerateSegment(projectId, topicId, segId);
                window.ytToast('Regeneracao do segmento iniciada!', 'success');
            } catch (err) {
                window.ytToast('Erro ao regenerar segmento: ' + err.message, 'error');
            }
            btn.disabled = false;
            btn.textContent = 'Regenerar';
        });
    });
}

// Global preview function
window._ytVisualsPreview = (url, prompt, index) => {
    if (!url) return;
    const modal = document.getElementById('vis-preview-modal');
    document.getElementById('vis-modal-img').src = url;
    document.getElementById('vis-modal-prompt').textContent = prompt || '';
    document.getElementById('vis-modal-title').textContent = `Preview - Segmento ${index}`;
    modal.style.display = '';
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
};
