// =============================================================================
// THUMBNAIL PAGE - Selecao e preview de variantes de thumbnail
// =============================================================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (ch) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );
}

export async function loadThumbnails(params) {
    const { projectId, topicId } = params;
    const api = window.ytApi;
    const toast = window.ytToast;

    const grid = document.getElementById('thumb-grid');
    const loading = document.getElementById('thumb-loading');
    const empty = document.getElementById('thumb-empty');
    const regenBtn = document.getElementById('thumb-regen');
    const topicInfo = document.getElementById('thumb-topic-info');

    // Topic context
    const state = window.ytState.getState();
    if (state.currentTopic) {
        document.getElementById('thumb-topic-title').textContent = state.currentTopic.title || '';
        topicInfo.style.display = '';
    }

    // Fetch thumbnails
    let thumbnails = [];
    try {
        const res = await api.thumbnail.list(projectId, topicId);
        thumbnails = Array.isArray(res) ? res : res.thumbnails || res.data || [];
    } catch (err) {
        toast('Erro ao carregar thumbnails: ' + err.message, 'error');
        loading.style.display = 'none';
        return;
    }

    loading.style.display = 'none';

    if (!thumbnails.length) {
        empty.style.display = '';
        return;
    }

    regenBtn.disabled = false;
    grid.style.display = '';
    renderThumbnails(thumbnails, projectId, topicId);

    // Regenerar
    regenBtn.onclick = async () => {
        regenBtn.disabled = true;
        regenBtn.textContent = 'Regenerando...';
        try {
            await api.thumbnail.regenerate(projectId, topicId);
            toast('Regeneracao de thumbnails iniciada!', 'success');
            setTimeout(() => loadThumbnails(params), 2000);
        } catch (err) {
            toast('Erro ao regenerar thumbnails: ' + err.message, 'error');
            regenBtn.disabled = false;
            regenBtn.textContent = 'Regenerar Thumbnails';
        }
    };
}

function renderThumbnails(thumbnails, projectId, topicId) {
    const grid = document.getElementById('thumb-grid');

    grid.innerHTML = thumbnails.map((thumb, idx) => {
        const url = thumb.url || thumb.presignedUrl || '';
        const isSelected = thumb.selected || thumb.isPrimary || false;
        const borderStyle = isSelected
            ? 'border: 3px solid var(--color-success); box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);'
            : 'border: 3px solid transparent;';

        return `
        <div class="yt-card" style="${borderStyle} transition: border-color 0.2s;">
            <div class="yt-card-header" style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600;">Variante ${idx + 1}</span>
                ${isSelected ? '<span class="yt-badge yt-badge-success">Selecionada</span>' : ''}
            </div>
            <div class="yt-card-body">
                <div style="cursor: pointer; border-radius: 8px; overflow: hidden; margin-bottom: 12px;"
                     onclick="window._ytThumbPreview('${escapeHtml(url)}')">
                    ${url
                        ? `<img src="${escapeHtml(url)}" alt="Thumbnail ${idx + 1}" style="width: 320px; height: 180px; object-fit: cover; display: block;">`
                        : `<div style="width: 320px; height: 180px; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center;">
                               <span style="color: var(--text-tertiary); font-size: 2rem;">&#128247;</span>
                           </div>`
                    }
                </div>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="radio" name="thumb-select" value="${escapeHtml(thumb.id || idx)}"
                           ${isSelected ? 'checked' : ''}
                           data-thumb-id="${escapeHtml(thumb.id || idx)}">
                    <span>Usar como principal</span>
                </label>
            </div>
        </div>`;
    }).join('');

    // Bind radio selection
    grid.querySelectorAll('input[name="thumb-select"]').forEach((radio) => {
        radio.addEventListener('change', async () => {
            const thumbId = radio.dataset.thumbId;
            try {
                await window.ytApi.thumbnail.select(projectId, topicId, thumbId);
                window.ytToast('Thumbnail selecionada com sucesso!', 'success');
                // Re-render to update border
                const res = await window.ytApi.thumbnail.list(projectId, topicId);
                const updated = Array.isArray(res) ? res : res.thumbnails || res.data || [];
                renderThumbnails(updated, projectId, topicId);
            } catch (err) {
                window.ytToast('Erro ao selecionar thumbnail: ' + err.message, 'error');
            }
        });
    });
}

// Global preview function
window._ytThumbPreview = (url) => {
    if (!url) return;
    const modal = document.getElementById('thumb-preview-modal');
    document.getElementById('thumb-modal-img').src = url;
    modal.style.display = '';
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    };
};
