// =============================================================================
// PAGE: topic-detail - Detalhes da historia com 5 abas (v3 - Content Engine)
// =============================================================================
import { initTabs } from '../components/tabs.js';
import { renderStatusBadge } from '../components/badge.js';
import { escapeHtml } from '../utils/dom.js';
import { formatDuration, countWords, formatWords } from '../utils/helpers.js';

const api = window.ytApi;
const toast = window.ytToast;
const router = window.ytRouter;
let _pid = null, _tid = null, _topic = null;

let STAGES = [];
const SEG_COLORS = { hook:'warning', intro:'info', main:'success', example:'info',
    data:'info', transition:'warning', climax:'danger', conclusion:'success', cta:'danger' };

window.ytRegisterPage('topic-detail', async (params) => {
    _pid = params.projectId; _tid = params.topicId;

    // Breadcrumb navigation
    document.getElementById('td-bc-pipeline')?.addEventListener('click', () => router.navigate(`projects/${_pid}/pipeline`));
    document.getElementById('td-back')?.addEventListener('click', () => router.navigate(`projects/${_pid}/pipeline`));
    document.getElementById('td-reprocess')?.addEventListener('click', reprocessTopic);

    try {
        const [topic, defaults] = await Promise.all([
            api.topics.get(_pid, _tid),
            STAGES.length ? Promise.resolve(null) : api.config.defaults(),
        ]);
        _topic = topic;
        if (defaults) {
            STAGES = (defaults.pipeline_stages || []).map(s => s.key);
        }

        // Store in state for sub-pages
        window.ytState?.setState({ currentTopic: _topic });

        document.getElementById('td-loading').style.display = 'none';
        document.getElementById('td-overview').style.display = '';
        document.getElementById('td-title').textContent = _topic.title || 'Historia';
        document.getElementById('td-bc-title').textContent = _topic.title || 'Historia';

        // Show reprocess button if in error stage
        const stage = _topic.pipeline_stage || _topic.pipelineStage || '';
        if (stage === 'error' || stage === 'discarded') {
            document.getElementById('td-reprocess').style.display = '';
        }

        renderMeta();
        renderError();
        renderPipeline();
        initTabs('td-tabs-container', onTab);
        loadStory();
    } catch (err) {
        document.getElementById('td-loading').style.display = 'none';
        toast('Erro ao carregar historia: ' + err.message, 'error');
    }
});

function renderMeta() {
    const t = _topic;
    const stage = t.pipeline_stage || t.pipelineStage || 'idea';
    const pts = (t.key_points || t.keyPoints || []);
    const ptsHtml = pts.length
        ? pts.map(p => escapeHtml(p)).join(', ')
        : '--';
    const sourceCount = t.source_count || t.sourceCount || '0';

    document.getElementById('td-meta').innerHTML = `
        <div class="yt-detail-meta-item">
            <div class="yt-detail-meta-label">Angulo</div>
            <div class="yt-detail-meta-value">${escapeHtml(t.angle || '--')}</div>
        </div>
        <div class="yt-detail-meta-item">
            <div class="yt-detail-meta-label">Publico-Alvo</div>
            <div class="yt-detail-meta-value">${escapeHtml(t.target_audience || t.targetAudience || '--')}</div>
        </div>
        <div class="yt-detail-meta-item">
            <div class="yt-detail-meta-label">Estagio</div>
            <div class="yt-detail-meta-value">${renderStatusBadge(stage)}</div>
        </div>
        <div class="yt-detail-meta-item">
            <div class="yt-detail-meta-label">Fontes Usadas</div>
            <div class="yt-detail-meta-value">${sourceCount} fonte(s)</div>
        </div>
        <div class="yt-detail-meta-item" style="grid-column: 1 / -1;">
            <div class="yt-detail-meta-label">Pontos-Chave</div>
            <div class="yt-detail-meta-value">${ptsHtml}</div>
        </div>`;
}

function renderError() {
    const banner = document.getElementById('td-error-banner');
    const stage = _topic.pipeline_stage || _topic.pipelineStage || '';
    const error = _topic.pipeline_error || _topic.pipelineError || '';

    if (stage === 'error' && error) {
        banner.style.display = '';
        banner.innerHTML = `
            <div class="yt-alert yt-alert-error">
                <span class="yt-alert-icon">⚠</span>
                <div class="yt-alert-content">
                    <div class="yt-alert-title">Erro no Pipeline</div>
                    <div class="yt-alert-message">${escapeHtml(error)}</div>
                </div>
            </div>`;
    } else {
        banner.style.display = 'none';
    }
}

function renderPipeline() {
    const stage = _topic.pipeline_stage || _topic.pipelineStage || 'idea';
    const idx = STAGES.indexOf(stage);
    const pct = idx >= 0 ? Math.round(((idx + 1) / STAGES.length) * 100) : 0;

    document.getElementById('td-progress-pct').textContent = `${pct}%`;
    document.getElementById('td-progress-bar').style.width = `${pct}%`;

    const STAGE_LABELS = {
        idea: 'Ideia', topics_generated: 'Selecionada', story_created: 'Historia',
        script_created: 'Roteiro', visuals_creating: 'Visuais...', visuals_created: 'Visuais',
        thumbnails_created: 'Thumbs', narration_created: 'Narracao',
        video_assembled: 'Video', queued_for_publishing: 'Fila', published: 'Publicado',
    };

    document.getElementById('td-pipeline-stages').innerHTML = STAGES.map((s, i) => {
        const done = i <= idx;
        const current = i === idx;
        const label = STAGE_LABELS[s] || s.replace(/_/g, ' ');
        let cls = 'yt-badge-gray';
        if (done && !current) cls = 'yt-badge-success';
        if (current) cls = 'yt-badge-blue';
        return `<span class="yt-badge ${cls}">${label}</span>`;
    }).join('');
}

function onTab(tab) {
    const m = { story:loadStory, script:loadScript, visuals:loadVisuals, narration:loadNarration, video:loadVideo, sources:loadSources };
    if (m[tab]) m[tab]();
}

async function reprocessTopic() {
    try {
        await api.topics.restartFrom(_pid, _tid, { stage: 'idea' });
        toast('Reprocessamento iniciado!', 'success');
        setTimeout(() => router.navigate(`projects/${_pid}/topics/${_tid}`), 500);
    } catch (e) { toast('Erro: ' + e.message, 'error'); }
}

// -- Story Tab --
let _storyDone = false;
async function loadStory() {
    if (_storyDone) return;
    const p = document.getElementById('panel-story');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const story = await api.story.get(_pid, _tid);
        _storyDone = true;
        const text = story.content || story.text || '';
        const wc = countWords(text);
        p.innerHTML = `
        <div class="yt-card">
            <div class="yt-card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <span>${formatWords(wc)}</span>
                <div class="yt-detail-actions">
                    <button class="yt-btn yt-btn-sm yt-btn-ghost" id="s-edit">Editar</button>
                    <button class="yt-btn yt-btn-sm yt-btn-primary" id="s-regen">Regenerar</button>
                </div>
            </div>
            <div class="yt-card-body">
                <div id="s-view">
                    <pre style="white-space:pre-wrap;line-height:1.7;font-family:inherit;color:var(--color-text-secondary);">${escapeHtml(text || 'Nenhuma historia gerada.')}</pre>
                </div>
                <div id="s-editor" style="display:none;">
                    <textarea class="yt-textarea" id="s-ta" rows="15">${escapeHtml(text)}</textarea>
                    <div style="margin-top:12px;display:flex;gap:8px;">
                        <button class="yt-btn yt-btn-primary yt-btn-sm" id="s-save">Salvar</button>
                        <button class="yt-btn yt-btn-ghost yt-btn-sm" id="s-cancel">Cancelar</button>
                    </div>
                </div>
            </div>
        </div>`;
        p.querySelector('#s-edit')?.addEventListener('click', () => {
            p.querySelector('#s-view').style.display = 'none';
            p.querySelector('#s-editor').style.display = '';
        });
        p.querySelector('#s-cancel')?.addEventListener('click', () => {
            p.querySelector('#s-view').style.display = '';
            p.querySelector('#s-editor').style.display = 'none';
        });
        p.querySelector('#s-save')?.addEventListener('click', async () => {
            try {
                await api.story.update(_pid, _tid, { content: p.querySelector('#s-ta').value });
                toast('Historia salva!', 'success');
                _storyDone = false; loadStory();
            } catch (e) { toast('Erro: ' + e.message, 'error'); }
        });
        p.querySelector('#s-regen')?.addEventListener('click', async () => {
            try {
                await api.story.regenerate(_pid, _tid);
                toast('Regeneracao iniciada!', 'success');
                _storyDone = false; loadStory();
            } catch (e) { toast('Erro: ' + e.message, 'error'); }
        });
    } catch {
        p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Historia ainda nao gerada.</p>';
    }
}

// -- Script Tab --
let _scriptDone = false;
async function loadScript() {
    if (_scriptDone) return;
    const p = document.getElementById('panel-script');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const sc = await api.script.get(_pid, _tid);
        _scriptDone = true;
        const segs = sc.segments || [];
        const rows = segs.map(s => {
            const t = s.type || 'main';
            return `<tr>
                <td>${s.index ?? s.order ?? '--'}</td>
                <td><span class="yt-badge yt-badge-${SEG_COLORS[t] || 'info'}">${t}</span></td>
                <td>${escapeHtml((s.narration || '').substring(0, 80))}${(s.narration||'').length > 80 ? '...' : ''}</td>
                <td>${escapeHtml((s.visual_direction || s.visualDirection || '').substring(0, 60))}</td>
                <td>${formatDuration(s.duration || 0)}</td>
            </tr>`;
        }).join('');
        p.innerHTML = `
        <div class="yt-card">
            <div class="yt-card-header" style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-weight:600;">${segs.length} segmento(s)</span>
                <button class="yt-btn yt-btn-sm yt-btn-primary" id="sc-edit">Editar Roteiro</button>
            </div>
            <div class="yt-card-body" style="padding:0;">
                <table class="yt-table">
                    <thead><tr><th>#</th><th>Tipo</th><th>Narracao</th><th>Visual</th><th>Duracao</th></tr></thead>
                    <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:var(--color-text-muted);padding:24px;">Nenhum segmento</td></tr>'}</tbody>
                </table>
            </div>
        </div>`;
        p.querySelector('#sc-edit')?.addEventListener('click', () => router.navigate(`projects/${_pid}/topics/${_tid}/script`));
    } catch {
        p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Roteiro ainda nao gerado.</p>';
    }
}

// -- Visuals Tab --
async function loadVisuals() {
    const p = document.getElementById('panel-visuals');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const vis = await api.visuals.list(_pid, _tid);
        const items = vis.segments || vis || [];
        if (!items.length) {
            p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Nenhum visual gerado.</p>';
            return;
        }
        p.innerHTML = `<div class="yt-grid-3">${items.map(v => `
            <div class="yt-card">
                <div class="yt-card-body" style="text-align:center;">
                    <div class="yt-img-placeholder" style="aspect-ratio:16/9;margin-bottom:8px;">
                        <img src="${escapeHtml(v.url || v.image_url || '')}" alt="Seg ${v.segment_index ?? ''}"
                             style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md);"
                             onerror="this.style.display='none'">
                    </div>
                    <p style="font-size:var(--font-size-sm);color:var(--color-text-secondary);">Segmento ${v.segment_index ?? v.segmentIndex ?? '?'}</p>
                </div>
            </div>`).join('')}</div>`;
    } catch {
        p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Visuais nao disponiveis.</p>';
    }
}

// -- Narration Tab --
async function loadNarration() {
    const p = document.getElementById('panel-narration');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const n = await api.narration.get(_pid, _tid);
        const url = n.audio_url || n.audioUrl || '';
        p.innerHTML = `
        <div class="yt-card">
            <div class="yt-card-body">
                ${url ? `<audio controls style="width:100%;margin-bottom:12px;"><source src="${escapeHtml(url)}" type="audio/mpeg"></audio>` : '<p style="color:var(--color-text-secondary);">Audio nao disponivel</p>'}
                <p style="color:var(--color-text-secondary);">Duracao: ${formatDuration(n.duration || 0)}</p>
                <button class="yt-btn yt-btn-sm yt-btn-primary" id="nr-regen" style="margin-top:12px;">Regenerar</button>
            </div>
        </div>`;
        p.querySelector('#nr-regen')?.addEventListener('click', async () => {
            try {
                await api.narration.regenerate(_pid, _tid);
                toast('Regeneracao iniciada!', 'success');
            } catch (e) { toast('Erro: ' + e.message, 'error'); }
        });
    } catch {
        p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Narracao nao gerada.</p>';
    }
}

// -- Video Tab --
async function loadVideo() {
    const p = document.getElementById('panel-video');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const v = await api.video.get(_pid, _tid);
        const url = v.video_url || v.videoUrl || '';
        const sz = v.file_size || v.fileSize || 0;
        p.innerHTML = `
        <div class="yt-card">
            <div class="yt-card-body">
                ${url ? `<video controls style="width:100%;border-radius:var(--radius-lg);margin-bottom:12px;background:#000;"><source src="${escapeHtml(url)}" type="video/mp4"></video>` : '<p style="color:var(--color-text-secondary);">Video nao disponivel</p>'}
                <p style="color:var(--color-text-secondary);">Tamanho: ${sz ? (sz / (1024 * 1024)).toFixed(1) + ' MB' : '--'}</p>
                <button class="yt-btn yt-btn-sm yt-btn-primary" id="vd-reas" style="margin-top:12px;">Remontar Video</button>
            </div>
        </div>`;
        p.querySelector('#vd-reas')?.addEventListener('click', async () => {
            try {
                await api.video.reassemble(_pid, _tid);
                toast('Remontagem iniciada!', 'success');
            } catch (e) { toast('Erro: ' + e.message, 'error'); }
        });
    } catch {
        p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Video nao gerado.</p>';
    }
}

// -- Sources Tab --
let _sourcesDone = false;
async function loadSources() {
    if (_sourcesDone) return;
    const p = document.getElementById('panel-sources');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const sources = await api.topics.sources(_pid, _tid);
        _sourcesDone = true;
        const items = Array.isArray(sources) ? sources : sources.sources || [];
        if (!items.length) {
            p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Nenhuma fonte vinculada a esta historia.</p>';
            return;
        }
        const rows = items.map(s => `
            <tr>
                <td>${escapeHtml(s.title || s.source_title || 'Sem titulo')}</td>
                <td>${escapeHtml(s.type || s.source_type || '--')}</td>
                <td style="text-align:center;">${s.relevance_score != null ? `<span class="yt-badge yt-badge-${s.relevance_score >= 7 ? 'green' : s.relevance_score >= 5 ? 'yellow' : 'red'}">${s.relevance_score}/10</span>` : '--'}</td>
            </tr>`).join('');
        p.innerHTML = `
        <div class="yt-card">
            <div class="yt-card-header"><span style="font-weight:600;">Fontes Usadas nesta Historia</span></div>
            <div class="yt-card-body" style="padding:0;">
                <table class="yt-table">
                    <thead><tr><th>Titulo</th><th>Tipo</th><th>Relevancia</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    } catch {
        p.innerHTML = '<p style="color:var(--color-text-secondary);padding:16px;">Fontes nao disponiveis.</p>';
    }
}
