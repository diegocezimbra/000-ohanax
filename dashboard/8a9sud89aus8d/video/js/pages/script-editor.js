// =============================================================================
// PAGE: script-editor - Editor de roteiro com segmentos arrastaveis
// =============================================================================
import { confirmDialog } from '../components/confirm-dialog.js';
import { escapeHtml } from '../utils/dom.js';

const api = window.ytApi;
const toast = window.ytToast;
const router = window.ytRouter;
let _pid = null, _tid = null, _script = null, _sortable = null;

const SEG_TYPES = ['hook','intro','main','example','data','transition','climax','conclusion','cta'];
const TYPE_COLORS = { hook:'warning', intro:'info', main:'success', example:'info',
    data:'info', transition:'warning', climax:'danger', conclusion:'success', cta:'danger' };

window.ytRegisterPage('script-editor', async (params) => {
    _pid = params.projectId; _tid = params.topicId;
    document.getElementById('se-back')?.addEventListener('click', () => router.navigate(`projects/${_pid}/topics/${_tid}`));
    document.getElementById('se-save-all')?.addEventListener('click', saveAll);
    document.getElementById('se-regen')?.addEventListener('click', regenerateScript);
    await loadScript();
});

async function loadScript() {
    const loading = document.getElementById('se-loading');
    const content = document.getElementById('se-content');
    loading.style.display = 'block'; content.style.display = 'none';
    try {
        _script = await api.script.get(_pid, _tid);
        loading.style.display = 'none'; content.style.display = '';
        const meta = _script.metadata || _script;
        document.getElementById('se-meta-title').value = meta.title || '';
        document.getElementById('se-meta-desc').value = meta.description || '';
        document.getElementById('se-meta-tags').value = (meta.tags || []).join(', ');
        renderSegments();
        initSortable();
    } catch (err) {
        loading.style.display = 'none';
        toast('Erro ao carregar roteiro: ' + err.message, 'error');
    }
}

function renderSegments() {
    const container = document.getElementById('se-segments');
    const segs = _script.segments || [];
    container.innerHTML = segs.map((s, i) => {
        const type = s.type || 'main';
        const typeOpts = SEG_TYPES.map(t =>
            `<option value="${t}" ${t===type?'selected':''}>${t}</option>`).join('');
        return `
        <div class="yt-card" data-seg-id="${s.id}" data-seg-idx="${i}" style="margin-bottom:12px;cursor:grab;">
            <div class="yt-card-header" style="justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span class="yt-badge yt-badge-${TYPE_COLORS[type]||'info'}" style="cursor:grab;">&#9776; #${i+1}</span>
                    <select class="yt-select seg-type" style="width:140px;">${typeOpts}</select>
                </div>
                <div style="display:flex;gap:4px;">
                    <button class="yt-btn yt-btn-sm yt-btn-ghost seg-split" title="Dividir">&#9986;</button>
                    <button class="yt-btn yt-btn-sm yt-btn-ghost seg-merge" title="Mesclar">&#8614;</button>
                </div>
            </div>
            <div class="yt-card-body">
                <div class="yt-form-group"><label class="yt-label">Narracao</label>
                    <textarea class="yt-textarea seg-narration" rows="3">${escapeHtml(s.narration||'')}</textarea></div>
                <div class="yt-form-group"><label class="yt-label">Direcao Visual</label>
                    <textarea class="yt-textarea seg-visual" rows="2">${escapeHtml(s.visual_direction||s.visualDirection||'')}</textarea></div>
                <div class="yt-form-group"><label class="yt-label">Duracao: <span class="seg-dur-label">${s.duration||30}s</span></label>
                    <input type="range" class="seg-duration" min="10" max="90" value="${s.duration||30}" style="width:100%;"></div>
            </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.seg-duration').forEach(slider => {
        const label = slider.closest('.yt-form-group').querySelector('.seg-dur-label');
        slider.addEventListener('input', () => { label.textContent = slider.value + 's'; });
    });
    container.querySelectorAll('.seg-split').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('[data-seg-id]');
            splitSegment(card.dataset.segId, card);
        });
    });
    container.querySelectorAll('.seg-merge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('[data-seg-id]');
            mergeSegment(card.dataset.segId, card);
        });
    });
}

function initSortable() {
    const container = document.getElementById('se-segments');
    if (_sortable) _sortable.destroy();
    if (typeof Sortable !== 'undefined') {
        _sortable = Sortable.create(container, {
            animation: 200, handle: '.yt-badge', ghostClass: 'yt-card-ghost',
            onEnd: () => {
                document.querySelectorAll('#se-segments [data-seg-id]').forEach((card, i) => {
                    card.dataset.segIdx = i;
                    const badge = card.querySelector('.yt-badge');
                    if (badge) badge.innerHTML = `&#9776; #${i + 1}`;
                });
            },
        });
    }
}

async function splitSegment(segId, card) {
    const textarea = card.querySelector('.seg-narration');
    const pos = textarea.selectionStart || Math.floor(textarea.value.length / 2);
    try {
        await api.script.splitSegment(_pid, _tid, segId, { position: pos });
        toast('Segmento dividido!', 'success');
        await loadScript();
    } catch (err) { toast('Erro ao dividir: ' + err.message, 'error'); }
}

async function mergeSegment(segId, card) {
    const next = card.nextElementSibling;
    if (!next || !next.dataset.segId) { toast('Nao ha proximo segmento para mesclar', 'error'); return; }
    try {
        await api.script.mergeSegments(_pid, _tid, { segmentIds: [segId, next.dataset.segId] });
        toast('Segmentos mesclados!', 'success');
        await loadScript();
    } catch (err) { toast('Erro ao mesclar: ' + err.message, 'error'); }
}

async function saveAll() {
    try {
        const title = document.getElementById('se-meta-title')?.value?.trim();
        const description = document.getElementById('se-meta-desc')?.value?.trim();
        const tagsRaw = document.getElementById('se-meta-tags')?.value?.trim();
        const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
        await api.script.updateMetadata(_pid, _tid, { title, description, tags });

        const cards = document.querySelectorAll('#se-segments [data-seg-id]');
        await api.script.reorder(_pid, _tid, { segmentIds: Array.from(cards).map(c => c.dataset.segId) });

        for (const card of cards) {
            await api.script.updateSegment(_pid, _tid, card.dataset.segId, {
                type: card.querySelector('.seg-type')?.value,
                narration: card.querySelector('.seg-narration')?.value,
                visual_direction: card.querySelector('.seg-visual')?.value,
                duration: Number(card.querySelector('.seg-duration')?.value || 30),
            });
        }
        toast('Roteiro salvo com sucesso!', 'success');
    } catch (err) { toast('Erro ao salvar roteiro: ' + err.message, 'error'); }
}

async function regenerateScript() {
    const ok = await confirmDialog('Regenerar Roteiro',
        'Tem certeza? Isso substituira todo o roteiro atual. Esta acao nao pode ser desfeita.');
    if (!ok) return;
    try {
        await api.script.regenerate(_pid, _tid);
        toast('Regeneracao do roteiro iniciada!', 'success');
        await loadScript();
    } catch (err) { toast('Erro ao regenerar: ' + err.message, 'error'); }
}
