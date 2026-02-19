// =============================================================================
// PIPELINE PAGE - Kanban board com SortableJS
// =============================================================================

const STAGES = [
    { key: 'selected', label: 'Selecionada' },
    { key: 'researching', label: 'Pesquisando' },
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
        const [pipelineData, stats, engineStatus] = await Promise.all([
            window.ytApi.pipeline.get(_projectId),
            window.ytApi.pipeline.stats(_projectId),
            window.ytApi.contentEngine?.status(_projectId).catch(() => null),
        ]);

        renderStats(stats);
        renderEngineStatus(engineStatus);
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
            const [data, stats, engineStatus] = await Promise.all([
                window.ytApi.pipeline.get(_projectId),
                window.ytApi.pipeline.stats(_projectId),
                window.ytApi.contentEngine?.status(_projectId).catch(() => null),
            ]);
            renderStats(stats);
            renderEngineStatus(engineStatus);
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

    // Content Engine status
    const engineEl = document.getElementById('pipe-engine-status');
    if (engineEl) {
        const engineActive = stats.contentEngineActive ?? stats.content_engine_active ?? true;
        engineEl.innerHTML = engineActive
            ? '<span class="yt-badge yt-badge-success">Engine Ativo</span>'
            : '<span class="yt-badge yt-badge-warning">Engine Pausado</span>';
    }
    const poolEl = document.getElementById('pipe-pool-health');
    if (poolEl) {
        poolEl.textContent = stats.poolSources ?? stats.pool_sources ?? '--';
    }

    // Update pause button
    const btn = document.getElementById('pipe-pause-toggle');
    const paused = stats.paused || false;
    btn.textContent = paused ? 'Retomar Engine' : 'Pausar Engine';
    btn.className = paused ? 'yt-btn yt-btn-primary' : 'yt-btn yt-btn-primary';
}

function renderEngineStatus(status) {
    if (!status) return;
    const bufferEl = document.getElementById('pipe-buffer-text');
    const bufferBar = document.getElementById('pipe-buffer-bar');
    const genEl = document.getElementById('pipe-gen-today');
    const nextEl = document.getElementById('pipe-next-run');

    const bufCur = status.buffer_current ?? status.bufferCurrent ?? 0;
    const bufTarget = status.buffer_target ?? status.bufferTarget ?? 7;
    const genToday = status.gen_today ?? status.genToday ?? 0;
    const maxGen = status.max_gen ?? status.maxGen ?? 5;
    const nextRun = status.next_run ?? status.nextRun ?? null;

    if (bufferEl) bufferEl.textContent = `${bufCur}/${bufTarget}`;
    if (bufferBar) bufferBar.style.width = `${Math.min((bufCur / bufTarget) * 100, 100)}%`;
    if (genEl) genEl.textContent = `${genToday}/${maxGen}`;
    if (nextEl) {
        if (nextRun) {
            const diff = new Date(nextRun).getTime() - Date.now();
            const mins = Math.max(0, Math.floor(diff / 60000));
            nextEl.textContent = mins > 0 ? `em ${mins}min` : 'agora';
        } else {
            nextEl.textContent = '--';
        }
    }

    // Update engine status badge from engine API too
    const engineEl = document.getElementById('pipe-engine-status');
    if (engineEl) {
        const active = status.active ?? status.contentEngineActive ?? true;
        engineEl.innerHTML = active
            ? '<span class="yt-badge yt-badge-success">Engine Ativo</span>'
            : '<span class="yt-badge yt-badge-warning">Engine Pausado</span>';
    }
}

function renderKanban(data) {
    const kanban = document.getElementById('pipe-kanban');
    const items = Array.isArray(data) ? data : data.topics || data.items || data.data || [];

    // Group by stage (including extra statuses)
    const grouped = {};
    STAGES.forEach((s) => { grouped[s.key] = []; });
    grouped['discarded'] = [];
    grouped['rejected'] = [];
    grouped['error'] = [];
    items.forEach((item) => {
        const stage = item.pipelineStage || item.stage || 'selected';
        if (grouped[stage]) {
            grouped[stage].push(item);
        }
    });

    const EXTRA_COLS = [
        { key: 'discarded', label: 'Descartado' },
        { key: 'rejected', label: 'Rejeitado' },
        { key: 'error', label: 'Erro' },
    ];
    const allCols = [...STAGES, ...EXTRA_COLS.filter(c => (grouped[c.key] || []).length > 0)];

    kanban.innerHTML = allCols.map((stage) => {
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
    const progress = stageProgress(item.pipelineStage || item.stage || 'selected');
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

    // Bind card click -> navigate to topic detail
    document.querySelectorAll('.yt-kanban-card').forEach((card) => {
        card.addEventListener('click', (e) => {
            // Don't navigate if clicking checkbox
            if (e.target.closest('.pipe-card-check') || e.target.tagName === 'INPUT') return;
            const topicId = card.dataset.topicId;
            if (topicId && _projectId) {
                window.ytRouter.navigate(`projects/${_projectId}/topics/${topicId}`);
            }
        });
        card.style.cursor = 'pointer';
    });
}

async function handleStageChange(topicId, newStage) {
    try {
        await window.ytApi.topics.restartFrom(_projectId, topicId, { stage: newStage });
        window.ytToast('Estagio atualizado!', 'success');
    } catch (err) {
        window.ytToast('Erro ao mover historia: ' + err.message, 'error');
    }
}

function updateBulkButtons() {
    const hasSelected = _selectedIds.size > 0;
    document.getElementById('pipe-bulk-reprocess').disabled = !hasSelected;
    document.getElementById('pipe-bulk-approve').disabled = !hasSelected;
}

function bindControls() {
    // Trigger Content Engine manually
    document.getElementById('pipe-trigger')?.addEventListener('click', async () => {
        try {
            await window.ytApi.contentEngine.trigger(_projectId);
            window.ytToast('Geracao forcada! O engine esta processando...', 'success');
        } catch (err) {
            window.ytToast('Erro: ' + err.message, 'error');
        }
    });

    // Pause/Resume Content Engine (with backward compatibility to pipeline)
    document.getElementById('pipe-pause-toggle').addEventListener('click', async () => {
        const btn = document.getElementById('pipe-pause-toggle');
        const isPaused = btn.textContent.includes('Retomar');
        const engineApi = window.ytApi.contentEngine || window.ytApi.pipeline;
        try {
            if (isPaused) {
                await engineApi.resume(_projectId);
                btn.textContent = 'Pausar Engine';
                window.ytToast('Content Engine retomado!', 'success');
            } else {
                await engineApi.pause(_projectId);
                btn.textContent = 'Retomar Engine';
                window.ytToast('Content Engine pausado.', 'info');
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
            window.ytToast(`${_selectedIds.size} historia(s) enviadas para reprocessamento!`, 'success');
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
            window.ytToast(`${_selectedIds.size} historia(s) aprovadas!`, 'success');
            _selectedIds.clear();
            loadPipeline({ projectId: _projectId });
        } catch (err) {
            window.ytToast('Erro: ' + err.message, 'error');
        }
    });
}
