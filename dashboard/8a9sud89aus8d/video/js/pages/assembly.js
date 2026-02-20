// =============================================================================
// ASSEMBLY PAGE - Video player, metadados e montagem
// =============================================================================
import { escapeHtml } from '../utils/dom.js';
import { formatDuration, formatFileSize } from '../utils/helpers.js';

export async function loadAssembly(params) {
    const { projectId, topicId } = params;
    const api = window.ytApi;
    const toast = window.ytToast;
    const router = window.ytRouter;

    const loading = document.getElementById('asm-loading');
    const empty = document.getElementById('asm-empty');
    const content = document.getElementById('asm-content');
    const actions = document.getElementById('asm-actions');

    // Breadcrumb navigation
    const topicTitle = window.ytState?.getState()?.currentTopic?.title || 'Historia';
    document.getElementById('asm-bc-pipeline')?.addEventListener('click', () => router.navigate(`projects/${projectId}/pipeline`));
    const bcTopic = document.getElementById('asm-bc-topic');
    if (bcTopic) {
        bcTopic.textContent = topicTitle;
        bcTopic.addEventListener('click', () => router.navigate(`projects/${projectId}/topics/${topicId}`));
    }

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
    document.getElementById('asm-video').src = videoUrl;

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
        <button class="yt-btn yt-btn-sm yt-btn-ghost" id="asm-back-btn">&#8592; Voltar</button>
        <button class="yt-btn yt-btn-primary" id="asm-reassemble">
            ${isAssembled ? 'Remontar Video' : 'Montar Video'}
        </button>
        <button class="yt-btn" id="asm-queue" ${!isAssembled ? 'disabled' : ''}>
            Enviar para Fila
        </button>`;

    document.getElementById('asm-back-btn')?.addEventListener('click', () => router.navigate(`projects/${projectId}/topics/${topicId}`));
    bindActions(params, isAssembled);
}

function renderTimeline(segments) {
    const card = document.getElementById('asm-timeline-card');
    const timeline = document.getElementById('asm-timeline');
    card.style.display = '';

    timeline.innerHTML = segments.map((seg, idx) => {
        const thumbUrl = seg.thumbnailUrl || seg.url || '';
        return `
            <div style="flex-shrink:0;text-align:center;">
                <div class="yt-img-placeholder" style="width:120px;height:68px;">
                    ${thumbUrl
                        ? `<img src="${escapeHtml(thumbUrl)}" alt="Seg ${idx + 1}" style="width:100%;height:100%;object-fit:cover;">`
                        : `<span style="color:var(--text-tertiary);font-size:var(--font-size-sm);">${idx + 1}</span>`
                    }
                </div>
                <div style="font-size:var(--font-size-xs);color:var(--color-text-secondary);margin-top:4px;">
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
            window.ytRouter.navigate(`projects/${params.projectId}/publishing`);
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
