// =============================================================================
// PUBLISHING PAGE - Lista e calendario de publicacoes
// =============================================================================

const STATUS_BADGES = {
    pending_review: { label: 'Pendente', badge: 'info' },
    approved: { label: 'Aprovado', badge: 'success' },
    published: { label: 'Publicado', badge: 'success' },
    rejected: { label: 'Rejeitado', badge: 'danger' },
    failed: { label: 'Falhou', badge: 'danger' },
};

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

let _projectId = null;
let _currentView = 'list';
let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth();

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (ch) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );
}

function formatDate(d) {
    if (!d) return '--';
    const dt = new Date(d);
    return dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export async function loadPublishing(params) {
    _projectId = params.projectId;
    const loading = document.getElementById('pub-loading');

    // Tabs
    document.querySelectorAll('.yt-tab[data-view]').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.yt-tab[data-view]').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            _currentView = tab.dataset.view;
            switchView();
        });
    });

    // Filter
    document.getElementById('pub-status-filter').addEventListener('change', () => {
        if (_currentView === 'list') fetchList();
    });

    // Calendar nav
    document.getElementById('pub-cal-prev').addEventListener('click', () => {
        _calMonth--;
        if (_calMonth < 0) { _calMonth = 11; _calYear--; }
        fetchCalendar();
    });
    document.getElementById('pub-cal-next').addEventListener('click', () => {
        _calMonth++;
        if (_calMonth > 11) { _calMonth = 0; _calYear++; }
        fetchCalendar();
    });

    await fetchList();
    loading.style.display = 'none';
    switchView();
}

function switchView() {
    const listView = document.getElementById('pub-list-view');
    const calView = document.getElementById('pub-calendar-view');
    if (_currentView === 'list') {
        listView.style.display = '';
        calView.style.display = 'none';
    } else {
        listView.style.display = 'none';
        calView.style.display = '';
        fetchCalendar();
    }
}

async function fetchList() {
    const status = document.getElementById('pub-status-filter').value;
    const tbody = document.getElementById('pub-table-body');
    const emptyEl = document.getElementById('pub-list-empty');
    const tableCard = document.getElementById('pub-table-card');

    try {
        const res = await window.ytApi.publishing.list(_projectId, { status: status || undefined });
        const items = Array.isArray(res) ? res : res.data || res.publications || [];

        if (!items.length) {
            emptyEl.style.display = '';
            tableCard.style.display = 'none';
            return;
        }

        emptyEl.style.display = 'none';
        tableCard.style.display = '';
        tbody.innerHTML = items.map((item) => renderRow(item)).join('');
        bindRowActions();
    } catch (err) {
        window.ytToast('Erro ao carregar publicacoes: ' + err.message, 'error');
    }
}

function renderRow(item) {
    const st = STATUS_BADGES[item.status] || STATUS_BADGES.pending_review;
    const thumb = item.thumbnailUrl || '';
    const title = escapeHtml(item.youtube_title || item.topic_title || item.title || 'Sem titulo');
    const scheduled = formatDate(item.scheduledFor || item.scheduled_for);

    return `
    <tr data-pub-id="${escapeHtml(item.id)}" style="cursor: pointer;" class="pub-row">
        <td>
            ${thumb
                ? `<img src="${escapeHtml(thumb)}" alt="" style="width: 72px; height: 40px; object-fit: cover; border-radius: 4px;">`
                : `<div style="width: 72px; height: 40px; background: var(--bg-tertiary); border-radius: 4px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 0.75rem; color: var(--text-tertiary);">&#127916;</span></div>`
            }
        </td>
        <td style="font-weight: 500;">${title}</td>
        <td><span class="yt-badge yt-badge-${st.badge}">${st.label}</span></td>
        <td style="font-size: 0.875rem;">${scheduled}</td>
        <td>
            <div style="display: flex; gap: 4px;">
                ${item.status === 'pending_review' ? `
                    <button class="yt-btn yt-btn-sm yt-btn-primary pub-approve" data-id="${escapeHtml(item.id)}">Aprovar</button>
                    <button class="yt-btn yt-btn-sm yt-btn-danger pub-reject" data-id="${escapeHtml(item.id)}">Rejeitar</button>
                ` : ''}
                ${item.status === 'failed' ? `
                    <button class="yt-btn yt-btn-sm pub-retry" data-id="${escapeHtml(item.id)}">Tentar Novamente</button>
                ` : ''}
            </div>
        </td>
    </tr>`;
}

function bindRowActions() {
    // Row click -> detail modal
    document.querySelectorAll('.pub-row').forEach((row) => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            openDetail(row.dataset.pubId);
        });
    });

    document.querySelectorAll('.pub-approve').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await window.ytApi.publishing.approve(_projectId, btn.dataset.id);
                window.ytToast('Publicacao aprovada!', 'success');
                fetchList();
            } catch (err) {
                window.ytToast('Erro: ' + err.message, 'error');
            }
        });
    });

    document.querySelectorAll('.pub-reject').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await window.ytApi.publishing.reject(_projectId, btn.dataset.id, { reason: 'Rejeitado manualmente' });
                window.ytToast('Publicacao rejeitada.', 'info');
                fetchList();
            } catch (err) {
                window.ytToast('Erro: ' + err.message, 'error');
            }
        });
    });

    document.querySelectorAll('.pub-retry').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await window.ytApi.publishing.retry(_projectId, btn.dataset.id);
                window.ytToast('Reenvio agendado!', 'success');
                fetchList();
            } catch (err) {
                window.ytToast('Erro: ' + err.message, 'error');
            }
        });
    });
}

async function openDetail(pubId) {
    const modal = document.getElementById('pub-detail-modal');
    const body = document.getElementById('pub-modal-body');
    const footer = document.getElementById('pub-modal-footer');

    body.innerHTML = '<div class="yt-spinner" style="margin: 24px auto;"></div>';
    footer.innerHTML = '';
    modal.style.display = '';
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    try {
        const item = await window.ytApi.publishing.get(_projectId, pubId);
        const st = STATUS_BADGES[item.status] || STATUS_BADGES.pending_review;
        const title = item.youtube_title || item.topic_title || item.title || 'Detalhes';
        document.getElementById('pub-modal-title').textContent = title;

        const desc = item.youtube_description || item.description || '--';
        const tags = item.youtube_tags || item.tags || [];
        const tagsStr = Array.isArray(tags) ? tags.join(', ') : String(tags);
        const duration = item.video_duration ? `${Math.floor(item.video_duration / 60)}:${String(item.video_duration % 60).padStart(2, '0')}` : '--';

        // Fetch video URL
        let videoHtml = '';
        if (item.topic_id) {
            try {
                const video = await window.ytApi.video.get(_projectId, item.topic_id);
                const videoUrl = video?.video_url || video?.videoUrl || '';
                if (videoUrl) {
                    videoHtml = `
                        <video controls style="width:100%;border-radius:8px;margin-bottom:16px;background:#000;max-height:400px;">
                            <source src="${escapeHtml(videoUrl)}" type="video/mp4">
                        </video>`;
                }
            } catch (e) {
                console.warn('[Publishing] Could not load video:', e.message);
            }
        }

        body.innerHTML = `
            ${videoHtml}
            <div style="display:flex;flex-direction:column;gap:12px;font-size:0.875rem;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div><strong>Status:</strong> <span class="yt-badge yt-badge-${st.badge}">${st.label}</span></div>
                    <div><strong>Agendado:</strong> ${formatDate(item.scheduled_for || item.scheduledFor)}</div>
                    <div><strong>Duracao:</strong> ${duration}</div>
                    ${item.youtube_url ? `<div><strong>YouTube:</strong> <a href="${escapeHtml(item.youtube_url)}" target="_blank" style="color:var(--color-primary);">Ver no YouTube</a></div>` : ''}
                </div>
                <div><strong>Descricao:</strong><p style="white-space:pre-wrap;color:var(--text-secondary);margin:4px 0 0;max-height:200px;overflow-y:auto;font-size:0.8125rem;">${escapeHtml(desc)}</p></div>
                <div><strong>Tags:</strong><p style="color:var(--text-secondary);margin:4px 0 0;font-size:0.8125rem;">${escapeHtml(tagsStr) || '--'}</p></div>
            </div>`;

        if (item.status === 'pending_review') {
            footer.innerHTML = `
                <button class="yt-btn yt-btn-primary" id="pub-modal-approve">Aprovar</button>
                <button class="yt-btn yt-btn-danger" id="pub-modal-reject">Rejeitar</button>`;
            document.getElementById('pub-modal-approve').onclick = async () => {
                await window.ytApi.publishing.approve(_projectId, pubId);
                window.ytToast('Aprovado!', 'success');
                modal.style.display = 'none';
                fetchList();
            };
            document.getElementById('pub-modal-reject').onclick = async () => {
                await window.ytApi.publishing.reject(_projectId, pubId, { reason: 'Rejeitado via modal' });
                window.ytToast('Rejeitado.', 'info');
                modal.style.display = 'none';
                fetchList();
            };
        }
    } catch (err) {
        body.innerHTML = `<p style="color: var(--color-danger);">Erro ao carregar detalhes: ${escapeHtml(err.message)}</p>`;
    }
}

async function fetchCalendar() {
    const grid = document.getElementById('pub-cal-grid');
    const title = document.getElementById('pub-cal-title');
    title.textContent = `${MONTH_NAMES[_calMonth]} ${_calYear}`;

    const monthStr = `${_calYear}-${String(_calMonth + 1).padStart(2, '0')}`;
    let items = [];
    try {
        const res = await window.ytApi.publishing.calendar(_projectId, monthStr);
        items = Array.isArray(res) ? res : res.data || res.publications || [];
    } catch (err) {
        window.ytToast('Erro ao carregar calendario: ' + err.message, 'error');
    }

    // Build day map
    const dayMap = {};
    items.forEach((item) => {
        const d = new Date(item.scheduledFor || item.scheduled_for);
        const day = d.getDate();
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(item);
    });

    const firstDay = new Date(_calYear, _calMonth, 1).getDay();
    const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

    let html = dayNames.map((d) =>
        `<div style="text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); padding: 4px;">${d}</div>`
    ).join('');

    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const pubs = dayMap[day] || [];
        const dots = pubs.map((p) => {
            const st = STATUS_BADGES[p.status] || STATUS_BADGES.pending_review;
            return `<span class="yt-badge yt-badge-${st.badge}" style="font-size: 0.625rem; padding: 0 4px;">${escapeHtml((p.title || '').slice(0, 12))}</span>`;
        }).join('');

        html += `
            <div style="min-height: 80px; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px; font-size: 0.75rem;">
                <div style="font-weight: 600; margin-bottom: 4px;">${day}</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">${dots}</div>
            </div>`;
    }

    grid.innerHTML = html;
}
