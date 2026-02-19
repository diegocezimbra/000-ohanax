// =============================================================================
// NARRATION PAGE - Audio player e tabela de segmentos
// =============================================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (ch) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );
}

function truncate(str, max) {
    if (!str) return '';
    return str.length <= max ? str : str.slice(0, max - 1).trimEnd() + '\u2026';
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

export async function loadNarration(params) {
    const { projectId, topicId } = params;
    const api = window.ytApi;
    const toast = window.ytToast;

    const loading = document.getElementById('narr-loading');
    const empty = document.getElementById('narr-empty');
    const content = document.getElementById('narr-content');
    const regenBtn = document.getElementById('narr-regen');
    const downloadLink = document.getElementById('narr-download');

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
    const statusEl = document.getElementById('narr-status');
    statusEl.textContent = narration.status || 'concluido';

    // Duration
    const totalDuration = narration.totalDuration || narration.duration || 0;
    document.getElementById('narr-duration').textContent = formatDuration(totalDuration);

    // Segments
    const segments = narration.segments || [];
    document.getElementById('narr-seg-count').textContent = segments.length;

    // Voice info
    const voiceInfo = document.getElementById('narr-voice-info');
    if (narration.voice || narration.voiceName) {
        voiceInfo.textContent = `Voz: ${narration.voice || narration.voiceName}`;
    }

    renderSegments(segments);
    bindRegenerate(regenBtn, params);
}

function renderSegments(segments) {
    const tbody = document.getElementById('narr-segments-body');

    if (!segments.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-tertiary); padding: 24px;">
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
                <td style="font-weight: 600; text-align: center;">${seg.index ?? idx + 1}</td>
                <td style="font-size: 0.875rem;" title="${escapeHtml(seg.text || seg.narrationText || '')}">
                    ${text || '<em style="color: var(--text-tertiary);">Sem texto</em>'}
                </td>
                <td style="text-align: center; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem;">
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
