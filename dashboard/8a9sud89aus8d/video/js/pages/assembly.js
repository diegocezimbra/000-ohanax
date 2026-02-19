// =============================================================================
// ASSEMBLY PAGE - Video player, metadados e montagem
// =============================================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (ch) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );
}

function formatDuration(totalSeconds) {
    if (totalSeconds == null || isNaN(totalSeconds)) return '0:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function formatFileSize(bytes) {
    if (!bytes || isNaN(bytes)) return '--';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export async function loadAssembly(params) {
    const { projectId, topicId } = params;
    const api = window.ytApi;
    const toast = window.ytToast;

    const loading = document.getElementById('asm-loading');
    const empty = document.getElementById('asm-empty');
    const content = document.getElementById('asm-content');
    const actions = document.getElementById('asm-actions');

    let video = null;
    try {
        video = await api.video.get(projectId, topicId);
    } catch (err) {
        if (err.status === 404) {
            loading.style.display = 'none';
            empty.style.display = '';
            bindAssembleEmpty(params);
            return;
        }
        toast('Erro ao carregar video: ' + err.message, 'error');
        loading.style.display = 'none';
        return;
    }

    loading.style.display = 'none';

    const videoUrl = video.url || video.videoUrl || video.presignedUrl || '';
    if (!videoUrl) {
        empty.style.display = '';
        bindAssembleEmpty(params);
        return;
    }

    content.style.display = '';

    // Video player
    const videoEl = document.getElementById('asm-video');
    videoEl.src = videoUrl;

    // Metadata
    document.getElementById('asm-duration').textContent =
        formatDuration(video.duration || video.totalDuration || 0);
    document.getElementById('asm-size').textContent =
        formatFileSize(video.fileSize || video.size || 0);
    document.getElementById('asm-resolution').textContent =
        video.resolution || video.quality || '1080p';

    // Timeline
    const segments = video.segments || video.timeline || [];
    if (segments.length) {
        renderTimeline(segments);
    }

    // Actions
    const isAssembled = !!videoUrl;
    actions.innerHTML = `
        <button class="yt-btn yt-btn-primary" id="asm-reassemble">
            ${isAssembled ? 'Remontar Video' : 'Montar Video'}
        </button>
        <button class="yt-btn" id="asm-queue" ${!isAssembled ? 'disabled' : ''}>
            Enviar para Fila
        </button>`;

    bindActions(params, isAssembled);
}

function renderTimeline(segments) {
    const card = document.getElementById('asm-timeline-card');
    const timeline = document.getElementById('asm-timeline');
    card.style.display = '';

    timeline.innerHTML = segments.map((seg, idx) => {
        const thumbUrl = seg.thumbnailUrl || seg.url || '';
        return `
            <div style="flex-shrink: 0; text-align: center;">
                <div style="width: 120px; height: 68px; border-radius: 4px; overflow: hidden; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                    ${thumbUrl
                        ? `<img src="${escapeHtml(thumbUrl)}" alt="Seg ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">`
                        : `<span style="color: var(--text-tertiary); font-size: 0.75rem;">${idx + 1}</span>`
                    }
                </div>
                <div style="font-size: 0.6875rem; color: var(--text-secondary); margin-top: 4px;">
                    ${formatDuration(seg.duration || 0)}
                </div>
            </div>`;
    }).join('');
}

function bindAssembleEmpty(params) {
    const btn = document.getElementById('asm-assemble-empty');
    if (!btn) return;
    btn.onclick = () => assembleVideo(params);
}

function bindActions(params, isAssembled) {
    const reassembleBtn = document.getElementById('asm-reassemble');
    const queueBtn = document.getElementById('asm-queue');

    if (reassembleBtn) {
        reassembleBtn.onclick = () => {
            if (isAssembled) {
                reassembleVideo(params);
            } else {
                assembleVideo(params);
            }
        };
    }

    if (queueBtn) {
        queueBtn.onclick = () => {
            const state = window.ytState.getState();
            const pid = params.projectId;
            window.ytRouter.navigate(`projects/${pid}/publishing`);
            window.ytToast('Historia enviada para fila de publicacao!', 'success');
        };
    }
}

async function assembleVideo(params) {
    try {
        await window.ytApi.video.assemble(params.projectId, params.topicId);
        window.ytToast('Montagem do video iniciada!', 'success');
        setTimeout(() => loadAssembly(params), 3000);
    } catch (err) {
        window.ytToast('Erro ao montar video: ' + err.message, 'error');
    }
}

async function reassembleVideo(params) {
    try {
        await window.ytApi.video.reassemble(params.projectId, params.topicId);
        window.ytToast('Remontagem do video iniciada!', 'success');
        setTimeout(() => loadAssembly(params), 3000);
    } catch (err) {
        window.ytToast('Erro ao remontar video: ' + err.message, 'error');
    }
}
