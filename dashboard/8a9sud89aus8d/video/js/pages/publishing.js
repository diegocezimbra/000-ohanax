// =============================================================================
// PUBLISHING PAGE - Publication queue list & calendar
// =============================================================================

// --- i18n ---
const I18N = {
    en: {
        status: { pending_review: 'Pending', approved: 'Approved', published: 'Published', rejected: 'Rejected', failed: 'Failed' },
        months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        noTitle: 'Untitled',
        approve: 'Approve',
        reject: 'Reject',
        retry: 'Retry',
        approved: 'Publication approved!',
        rejected: 'Publication rejected.',
        retryScheduled: 'Retry scheduled!',
        loadError: 'Error loading publications: ',
        calendarError: 'Error loading calendar: ',
        detailError: 'Error loading details: ',
        details: 'Details',
        scheduled: 'Scheduled:',
        duration: 'Duration:',
        description: 'Description:',
        tags: 'Tags:',
        watchOnYT: 'Watch on YouTube',
        rejectedViaModal: 'Rejected via modal',
    },
    'pt-BR': {
        status: { pending_review: 'Pendente', approved: 'Aprovado', published: 'Publicado', rejected: 'Rejeitado', failed: 'Falhou' },
        months: ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        days: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'],
        noTitle: 'Sem titulo',
        approve: 'Aprovar',
        reject: 'Rejeitar',
        retry: 'Tentar Novamente',
        approved: 'Publicacao aprovada!',
        rejected: 'Publicacao rejeitada.',
        retryScheduled: 'Reenvio agendado!',
        loadError: 'Erro ao carregar publicacoes: ',
        calendarError: 'Erro ao carregar calendario: ',
        detailError: 'Erro ao carregar detalhes: ',
        details: 'Detalhes',
        scheduled: 'Agendado:',
        duration: 'Duracao:',
        description: 'Descricao:',
        tags: 'Tags:',
        watchOnYT: 'Ver no YouTube',
        rejectedViaModal: 'Rejected via modal',
    },
};

const STATUS_BADGE_MAP = {
    pending_review: 'info',
    approved: 'success',
    published: 'success',
    rejected: 'danger',
    failed: 'danger',
};

let _projectId = null;
let _currentView = 'list';
let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth();

function _lang() {
    const project = window.ytState?.getState()?.currentProject;
    const lang = project?.language || 'en';
    return I18N[lang] || I18N.en;
}

function _locale() {
    const project = window.ytState?.getState()?.currentProject;
    const lang = project?.language || 'en';
    return lang === 'pt-BR' ? 'pt-BR' : 'en-US';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, (ch) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );
}

function formatDate(d) {
    if (!d) return '--';
    const locale = _locale();
    const dt = new Date(d);
    return dt.toLocaleDateString(locale) + ' ' + dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
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
    const t = _lang();

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
        tbody.innerHTML = items.map((item) => renderRow(item, t)).join('');
        bindRowActions(t);
    } catch (err) {
        window.ytToast(t.loadError + err.message, 'error');
    }
}

function renderRow(item, t) {
    const badgeClass = STATUS_BADGE_MAP[item.status] || 'info';
    const statusLabel = t.status[item.status] || t.status.pending_review;
    const thumb = item.thumbnailUrl || '';
    const title = escapeHtml(item.youtube_title || item.topic_title || item.title || t.noTitle);
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
        <td><span class="yt-badge yt-badge-${badgeClass}">${statusLabel}</span></td>
        <td style="font-size: 0.875rem;">${scheduled}</td>
        <td>
            <div style="display: flex; gap: 4px;">
                ${item.status === 'pending_review' ? `
                    <button class="yt-btn yt-btn-sm yt-btn-primary pub-approve" data-id="${escapeHtml(item.id)}">${t.approve}</button>
                    <button class="yt-btn yt-btn-sm yt-btn-danger pub-reject" data-id="${escapeHtml(item.id)}">${t.reject}</button>
                ` : ''}
                ${item.status === 'failed' ? `
                    <button class="yt-btn yt-btn-sm pub-retry" data-id="${escapeHtml(item.id)}">${t.retry}</button>
                ` : ''}
            </div>
        </td>
    </tr>`;
}

function bindRowActions(t) {
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
                window.ytToast(t.approved, 'success');
                fetchList();
            } catch (err) {
                window.ytToast('Error: ' + err.message, 'error');
            }
        });
    });

    document.querySelectorAll('.pub-reject').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await window.ytApi.publishing.reject(_projectId, btn.dataset.id, { reason: t.rejectedViaModal });
                window.ytToast(t.rejected, 'info');
                fetchList();
            } catch (err) {
                window.ytToast('Error: ' + err.message, 'error');
            }
        });
    });

    document.querySelectorAll('.pub-retry').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await window.ytApi.publishing.retry(_projectId, btn.dataset.id);
                window.ytToast(t.retryScheduled, 'success');
                fetchList();
            } catch (err) {
                window.ytToast('Error: ' + err.message, 'error');
            }
        });
    });
}

async function openDetail(pubId) {
    const modal = document.getElementById('pub-detail-modal');
    const body = document.getElementById('pub-modal-body');
    const footer = document.getElementById('pub-modal-footer');
    const t = _lang();

    body.innerHTML = '<div class="yt-spinner" style="margin: 24px auto;"></div>';
    footer.innerHTML = '';
    modal.style.display = '';
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    try {
        const item = await window.ytApi.publishing.get(_projectId, pubId);
        const badgeClass = STATUS_BADGE_MAP[item.status] || 'info';
        const statusLabel = t.status[item.status] || t.status.pending_review;
        const title = item.youtube_title || item.topic_title || item.title || t.details;
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
                    <div><strong>Status:</strong> <span class="yt-badge yt-badge-${badgeClass}">${statusLabel}</span></div>
                    <div><strong>${t.scheduled}</strong> ${formatDate(item.scheduled_for || item.scheduledFor)}</div>
                    <div><strong>${t.duration}</strong> ${duration}</div>
                    ${item.youtube_url ? `<div><strong>YouTube:</strong> <a href="${escapeHtml(item.youtube_url)}" target="_blank" style="color:var(--color-primary);">${t.watchOnYT}</a></div>` : ''}
                </div>
                <div><strong>${t.description}</strong><p style="white-space:pre-wrap;color:var(--text-secondary);margin:4px 0 0;max-height:200px;overflow-y:auto;font-size:0.8125rem;">${escapeHtml(desc)}</p></div>
                <div><strong>${t.tags}</strong><p style="color:var(--text-secondary);margin:4px 0 0;font-size:0.8125rem;">${escapeHtml(tagsStr) || '--'}</p></div>
            </div>`;

        if (item.status === 'pending_review') {
            footer.innerHTML = `
                <button class="yt-btn yt-btn-primary" id="pub-modal-approve">${t.approve}</button>
                <button class="yt-btn yt-btn-danger" id="pub-modal-reject">${t.reject}</button>`;
            document.getElementById('pub-modal-approve').onclick = async () => {
                await window.ytApi.publishing.approve(_projectId, pubId);
                window.ytToast(t.approved, 'success');
                modal.style.display = 'none';
                fetchList();
            };
            document.getElementById('pub-modal-reject').onclick = async () => {
                await window.ytApi.publishing.reject(_projectId, pubId, { reason: t.rejectedViaModal });
                window.ytToast(t.rejected, 'info');
                modal.style.display = 'none';
                fetchList();
            };
        }
    } catch (err) {
        body.innerHTML = `<p style="color: var(--color-danger);">${t.detailError}${escapeHtml(err.message)}</p>`;
    }
}

async function fetchCalendar() {
    const grid = document.getElementById('pub-cal-grid');
    const titleEl = document.getElementById('pub-cal-title');
    const t = _lang();
    titleEl.textContent = `${t.months[_calMonth]} ${_calYear}`;

    const monthStr = `${_calYear}-${String(_calMonth + 1).padStart(2, '0')}`;
    let items = [];
    try {
        const res = await window.ytApi.publishing.calendar(_projectId, monthStr);
        items = Array.isArray(res) ? res : res.data || res.publications || [];
    } catch (err) {
        window.ytToast(t.calendarError + err.message, 'error');
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

    let html = t.days.map((d) =>
        `<div style="text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); padding: 4px;">${d}</div>`
    ).join('');

    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const pubs = dayMap[day] || [];
        const dots = pubs.map((p) => {
            const badgeClass = STATUS_BADGE_MAP[p.status] || 'info';
            return `<span class="yt-badge yt-badge-${badgeClass}" style="font-size: 0.625rem; padding: 0 4px;">${escapeHtml((p.title || '').slice(0, 12))}</span>`;
        }).join('');

        html += `
            <div style="min-height: 80px; border: 1px solid var(--border-color); border-radius: 4px; padding: 4px; font-size: 0.75rem;">
                <div style="font-weight: 600; margin-bottom: 4px;">${day}</div>
                <div style="display: flex; flex-direction: column; gap: 2px;">${dots}</div>
            </div>`;
    }

    grid.innerHTML = html;
}
