// =============================================================================
// PIPELINE PAGE - Kanban board com SortableJS
// =============================================================================

const STAGES = [
    { key: 'source_added', label: 'Fonte Adicionada' },
    { key: 'research_done', label: 'Pesquisa Feita' },
    { key: 'topics_generated', label: 'Topicos Gerados' },
    { key: 'story_created', label: 'Historia Criada' },
    { key: 'script_created', label: 'Roteiro Criado' },
    { key: 'visuals_created', label: 'Visuais Criados' },
    { key: 'thumbnails_created', label: 'Thumbnails Criadas' },
    { key: 'narration_created', label: 'Narracao Criada' },
    { key: 'video_assembled', label: 'Video Montado' },
    { key: 'queued_for_publishing', label: 'Na Fila' },
    { key: 'published', label: 'Publicado' },
];

let _projectId = null;
let _selectedIds = new Set();

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (ch) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );
}

function relativeTime(dateStr) {
    if (!dateStr) return '--';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

function stageProgress(stageKey) {
    const idx = STAGES.findIndex((s) => s.key === stageKey);
    if (idx < 0) return 0;
    return Math.round(((idx + 1) / STAGES.length) * 100);
}

export async function loadPipeline(params) {
    _projectId = params.projectId;
    _selectedIds.clear();

    const loading = document.getElementById('pipe-loading');
    const kanban = document.getElementById('pipe-kanban');

    try {
        const [pipelineData, stats] = await Promise.all([
            window.ytApi.pipeline.get(_projectId),
            window.ytApi.pipeline.stats(_projectId),
        ]);

        renderStats(stats);
        renderKanban(pipelineData);
        loading.style.display = 'none';
        kanban.style.display = '';
        initSortable();
    } catch (err) {
        window.ytToast('Erro ao carregar pipeline: ' + err.message, 'error');
        loading.style.display = 'none';
        return;
    }

    bindControls();

    // Auto-refresh
    window.ytStartPolling(async () => {
        try {
            const [data, stats] = await Promise.all([
                window.ytApi.pipeline.get(_projectId),
                window.ytApi.pipeline.stats(_projectId),
            ]);
            renderStats(stats);
            renderKanban(data);
            initSortable();
        } catch { /* silent */ }
    }, 10000);
}

function renderStats(stats) {
    document.getElementById('pipe-stat-total').textContent = stats.total ?? '--';
    document.getElementById('pipe-stat-progress').textContent = stats.inProgress ?? stats.in_progress ?? '--';
    document.getElementById('pipe-stat-completed').textContent = stats.completed ?? '--';
    document.getElementById('pipe-stat-failed').textContent = stats.failed ?? '--';

    // Update pause button
    const btn = document.getElementById('pipe-pause-toggle');
    const paused = stats.paused || false;
    btn.textContent = paused ? 'Retomar Pipeline' : 'Pausar Pipeline';
    btn.className = paused ? 'yt-btn yt-btn-primary' : 'yt-btn yt-btn-primary';
}

function renderKanban(data) {
    const kanban = document.getElementById('pipe-kanban');
    const items = Array.isArray(data) ? data : data.topics || data.items || data.data || [];

    // Group by stage
    const grouped = {};
    STAGES.forEach((s) => { grouped[s.key] = []; });
    items.forEach((item) => {
        const stage = item.pipelineStage || item.stage || 'source_added';
        if (grouped[stage]) {
            grouped[stage].push(item);
        }
    });

    kanban.innerHTML = STAGES.map((stage) => {
        const cards = grouped[stage.key] || [];
        return `
        <div class="yt-kanban-column" data-stage="${stage.key}">
            <div class="yt-kanban-column-header">
                <span>${escapeHtml(stage.label)}</span>
                <span class="yt-badge">${cards.length}</span>
            </div>
            <div class="yt-kanban-cards" data-stage="${stage.key}">
                ${cards.map((card) => renderCard(card)).join('')}
            </div>
        </div>`;
    }).join('');

    updateBulkButtons();
}

function renderCard(item) {
    const title = escapeHtml(item.title || item.name || 'Sem titulo');
    const timeInStage = relativeTime(item.stageEnteredAt || item.updatedAt);
    const progress = stageProgress(item.pipelineStage || item.stage || 'source_added');
    const isSelected = _selectedIds.has(item.id);

    return `
    <div class="yt-kanban-card ${isSelected ? 'yt-kanban-card--selected' : ''}"
         data-id="${escapeHtml(item.id)}" data-topic-id="${escapeHtml(item.topicId || item.id)}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; flex: 1;">
                <input type="checkbox" class="pipe-card-check" data-id="${escapeHtml(item.id)}"
                       ${isSelected ? 'checked' : ''}>
                <span style="font-weight: 500; font-size: 0.8125rem; line-height: 1.3;">${title}</span>
            </label>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.6875rem; color: var(--text-tertiary);">
            <span>Ha ${timeInStage}</span>
            <span>${progress}%</span>
        </div>
        <div class="yt-progress" style="height: 4px; margin-top: 4px;">
            <div class="yt-progress-bar" style="width: ${progress}%;"></div>
        </div>
    </div>`;
}

function initSortable() {
    document.querySelectorAll('.yt-kanban-cards').forEach((col) => {
        if (col._sortable) col._sortable.destroy();
        col._sortable = new Sortable(col, {
            group: 'pipeline',
            animation: 150,
            ghostClass: 'yt-kanban-card--ghost',
            onEnd: (evt) => {
                const cardId = evt.item.dataset.id;
                const newStage = evt.to.dataset.stage;
                if (cardId && newStage) {
                    handleStageChange(cardId, newStage);
                }
            },
        });
    });

    // Bind checkboxes
    document.querySelectorAll('.pipe-card-check').forEach((cb) => {
        cb.addEventListener('change', () => {
            const id = cb.dataset.id;
            if (cb.checked) _selectedIds.add(id);
            else _selectedIds.delete(id);
            cb.closest('.yt-kanban-card').classList.toggle('yt-kanban-card--selected', cb.checked);
            updateBulkButtons();
        });
    });
}

async function handleStageChange(topicId, newStage) {
    try {
        await window.ytApi.topics.restartFrom(_projectId, topicId, { stage: newStage });
        window.ytToast('Estagio atualizado!', 'success');
    } catch (err) {
        window.ytToast('Erro ao mover topico: ' + err.message, 'error');
    }
}

function updateBulkButtons() {
    const hasSelected = _selectedIds.size > 0;
    document.getElementById('pipe-bulk-reprocess').disabled = !hasSelected;
    document.getElementById('pipe-bulk-approve').disabled = !hasSelected;
}

function bindControls() {
    // Pause/Resume
    document.getElementById('pipe-pause-toggle').addEventListener('click', async () => {
        const btn = document.getElementById('pipe-pause-toggle');
        const isPaused = btn.textContent.includes('Retomar');
        try {
            if (isPaused) {
                await window.ytApi.pipeline.resume(_projectId);
                btn.textContent = 'Pausar Pipeline';
                window.ytToast('Pipeline retomado!', 'success');
            } else {
                await window.ytApi.pipeline.pause(_projectId);
                btn.textContent = 'Retomar Pipeline';
                window.ytToast('Pipeline pausado.', 'info');
            }
        } catch (err) {
            window.ytToast('Erro: ' + err.message, 'error');
        }
    });

    // Bulk reprocess
    document.getElementById('pipe-bulk-reprocess').addEventListener('click', async () => {
        if (!_selectedIds.size) return;
        try {
            await window.ytApi.pipeline.bulkReprocess(_projectId, { topicIds: [..._selectedIds] });
            window.ytToast(`${_selectedIds.size} topico(s) enviados para reprocessamento!`, 'success');
            _selectedIds.clear();
            loadPipeline({ projectId: _projectId });
        } catch (err) {
            window.ytToast('Erro: ' + err.message, 'error');
        }
    });

    // Bulk approve
    document.getElementById('pipe-bulk-approve').addEventListener('click', async () => {
        if (!_selectedIds.size) return;
        try {
            await window.ytApi.pipeline.bulkApprove(_projectId, { topicIds: [..._selectedIds] });
            window.ytToast(`${_selectedIds.size} topico(s) aprovados!`, 'success');
            _selectedIds.clear();
            loadPipeline({ projectId: _projectId });
        } catch (err) {
            window.ytToast('Erro: ' + err.message, 'error');
        }
    });
}
