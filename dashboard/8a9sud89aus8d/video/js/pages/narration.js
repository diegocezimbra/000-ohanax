// =============================================================================
// NARRATION PAGE - Audio player e tabela de segmentos
// =============================================================================
import { escapeHtml } from '../utils/dom.js';
import { truncate, formatDuration } from '../utils/helpers.js';

export async function loadNarration(params) {
    const { projectId, topicId } = params;
    const api = window.ytApi;
    const toast = window.ytToast;
    const router = window.ytRouter;

    const loading = document.getElementById('narr-loading');
    const empty = document.getElementById('narr-empty');
    const content = document.getElementById('narr-content');
    const regenBtn = document.getElementById('narr-regen');
    const downloadLink = document.getElementById('narr-download');

    // Breadcrumb navigation
    const topicTitle = window.ytState?.getState()?.currentTopic?.title || 'Historia';
    document.getElementById('narr-bc-pipeline')?.addEventListener('click', () => router.navigate(`projects/${projectId}/pipeline`));
    const bcTopic = document.getElementById('narr-bc-topic');
    if (bcTopic) {
        bcTopic.textContent = topicTitle;
        bcTopic.addEventListener('click', () => router.navigate(`projects/${projectId}/topics/${topicId}`));
    }
    document.getElementById('narr-back')?.addEventListener('click', () => router.navigate(`projects/${projectId}/topics/${topicId}`));

    let narration = null;
    try {
        narration = await api.narration.get(projectId, topicId);
    } catch (err) {
        if (err.status === 404) {
            loading.style.display = 'none';
            empty.style.display = '';
            regenBtn.disabled = false;
            bindRegenerate(regenBtn, params);
            return;
        }
        toast('Erro ao carregar narracao: ' + err.message, 'error');
        loading.style.display = 'none';
        return;
    }

    loading.style.display = 'none';

    if (!narration || (!narration.audioUrl && !narration.url)) {
        empty.style.display = '';
        regenBtn.disabled = false;
        bindRegenerate(regenBtn, params);
        return;
    }

    content.style.display = '';
    regenBtn.disabled = false;

    // Audio player
    const audioUrl = narration.audioUrl || narration.url || '';
    const audioEl = document.getElementById('narr-audio');
    audioEl.src = audioUrl;

    // Download link
    if (audioUrl) {
        downloadLink.href = audioUrl;
        downloadLink.style.display = '';
    }

    // Status
    document.getElementById('narr-status').textContent = narration.status || 'concluido';

    // Stats
    const totalDuration = narration.totalDuration || narration.duration || 0;
    document.getElementById('narr-duration').textContent = formatDuration(totalDuration);

    const segments = narration.segments || [];
    document.getElementById('narr-seg-count').textContent = segments.length;

    const voiceInfo = document.getElementById('narr-voice-info');
    voiceInfo.textContent = narration.voice || narration.voiceName || '--';

    renderSegments(segments);
    bindRegenerate(regenBtn, params);
}

function renderSegments(segments) {
    const tbody = document.getElementById('narr-segments-body');

    if (!segments.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center;color:var(--color-text-muted);padding:24px;">
                    Nenhum segmento disponivel
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = segments.map((seg, idx) => {
        const text = escapeHtml(truncate(seg.text || seg.narrationText || '', 120));
        const duration = formatDuration(seg.duration || 0);

        return `
            <tr>
                <td style="font-weight:600;text-align:center;">${seg.index ?? idx + 1}</td>
                <td style="font-size:var(--font-size-sm);" title="${escapeHtml(seg.text || seg.narrationText || '')}">
                    ${text || '<em style="color:var(--color-text-muted);">Sem texto</em>'}
                </td>
                <td style="text-align:center;font-family:var(--font-mono);font-size:var(--font-size-sm);">
                    ${duration}
                </td>
            </tr>`;
    }).join('');
}

function bindRegenerate(btn, params) {
    btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'Regenerando...';
        try {
            await window.ytApi.narration.regenerate(params.projectId, params.topicId);
            window.ytToast('Regeneracao da narracao iniciada!', 'success');
            setTimeout(() => loadNarration(params), 3000);
        } catch (err) {
            window.ytToast('Erro ao regenerar narracao: ' + err.message, 'error');
            btn.disabled = false;
            btn.textContent = 'Regenerar Narracao';
        }
    };
}
