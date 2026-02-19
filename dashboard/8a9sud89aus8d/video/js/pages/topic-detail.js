// =============================================================================
// PAGE: topic-detail - Detalhes do topico com 5 abas
// =============================================================================
import { initTabs } from '../components/tabs.js';
import { renderStatusBadge } from '../components/badge.js';
import { escapeHtml } from '../utils/dom.js';
import { formatDuration, countWords, formatWords } from '../utils/helpers.js';

const api = window.ytApi;
const toast = window.ytToast;
const router = window.ytRouter;
let _pid = null, _tid = null, _topic = null;

const STAGES = ['idea','story_created','script_generated','visuals_generated',
    'thumbnail_generated','narration_generated','video_ready','published'];
const SEG_COLORS = { hook:'warning', intro:'info', main:'success', example:'info',
    data:'info', transition:'warning', climax:'danger', conclusion:'success', cta:'danger' };

window.ytRegisterPage('topic-detail', async (params) => {
    _pid = params.projectId; _tid = params.topicId;
    document.getElementById('td-back')?.addEventListener('click', () => router.navigate(`projects/${_pid}/topics`));
    try {
        _topic = await api.topics.get(_pid, _tid);
        document.getElementById('td-loading').style.display = 'none';
        document.getElementById('td-overview').style.display = '';
        document.getElementById('td-title').textContent = _topic.title || 'Topico';
        renderMeta(); renderPipeline();
        initTabs('td-tabs-container', onTab);
        loadStory();
    } catch (err) {
        document.getElementById('td-loading').style.display = 'none';
        toast('Erro ao carregar topico: ' + err.message, 'error');
    }
});

function renderMeta() {
    const t = _topic;
    const pts = (t.key_points||t.keyPoints||[]).map(p=>`<li>${escapeHtml(p)}</li>`).join('');
    document.getElementById('td-meta').innerHTML = `
        <div><p><strong>Angulo:</strong> ${escapeHtml(t.angle||'--')}</p>
            <p style="margin-top:8px;"><strong>Publico:</strong> ${escapeHtml(t.target_audience||t.targetAudience||'--')}</p>
            <p style="margin-top:8px;"><strong>Estagio:</strong> ${renderStatusBadge(t.pipeline_stage||t.pipelineStage||'idea')}</p></div>
        <div><strong>Pontos-Chave:</strong>${pts?`<ul style="margin-top:4px;padding-left:20px;">${pts}</ul>`:'<p>--</p>'}</div>`;
}

function renderPipeline() {
    const stage = _topic.pipeline_stage||_topic.pipelineStage||'idea';
    const idx = STAGES.indexOf(stage);
    const pct = idx >= 0 ? ((idx+1)/STAGES.length)*100 : 0;
    const labels = STAGES.map((s,i) => {
        const c = i<=idx ? 'yt-badge-success' : 'yt-badge-gray';
        return `<span class="yt-badge ${c}" style="font-size:11px;">${s.replace(/_/g,' ')}</span>`;
    }).join(' ');
    document.getElementById('td-pipeline-progress').innerHTML = `
        <div class="yt-progress" style="margin-bottom:8px;"><div class="yt-progress-bar" style="width:${pct}%;"></div></div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${labels}</div>`;
}

function onTab(tab) {
    const m = { story:loadStory, script:loadScript, visuals:loadVisuals, narration:loadNarration, video:loadVideo };
    if (m[tab]) m[tab]();
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
        const text = story.content||story.text||'';
        const wc = countWords(text);
        p.innerHTML = `<div class="yt-card"><div class="yt-card-body">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
                <span>${formatWords(wc)}</span>
                <div><button class="yt-btn yt-btn-sm yt-btn-ghost" id="s-edit">Editar</button>
                    <button class="yt-btn yt-btn-sm yt-btn-primary" id="s-regen">Regenerar</button></div></div>
            <div id="s-view"><pre style="white-space:pre-wrap;line-height:1.7;font-family:inherit;">${escapeHtml(text||'Nenhuma historia gerada.')}</pre></div>
            <div id="s-editor" style="display:none;">
                <textarea class="yt-textarea" id="s-ta" rows="15">${escapeHtml(text)}</textarea>
                <div style="margin-top:12px;display:flex;gap:8px;">
                    <button class="yt-btn yt-btn-primary yt-btn-sm" id="s-save">Salvar</button>
                    <button class="yt-btn yt-btn-ghost yt-btn-sm" id="s-cancel">Cancelar</button></div></div>
        </div></div>`;
        p.querySelector('#s-edit')?.addEventListener('click', () => { p.querySelector('#s-view').style.display='none'; p.querySelector('#s-editor').style.display=''; });
        p.querySelector('#s-cancel')?.addEventListener('click', () => { p.querySelector('#s-view').style.display=''; p.querySelector('#s-editor').style.display='none'; });
        p.querySelector('#s-save')?.addEventListener('click', async () => {
            try { await api.story.update(_pid,_tid,{content:p.querySelector('#s-ta').value}); toast('Historia salva!','success'); _storyDone=false; loadStory(); }
            catch(e){toast('Erro: '+e.message,'error');} });
        p.querySelector('#s-regen')?.addEventListener('click', async () => {
            try { await api.story.regenerate(_pid,_tid); toast('Regeneracao iniciada!','success'); _storyDone=false; loadStory(); }
            catch(e){toast('Erro: '+e.message,'error');} });
    } catch { p.innerHTML = '<p style="color:var(--color-text-secondary);">Historia ainda nao gerada.</p>'; }
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
        const segs = sc.segments||[];
        const rows = segs.map(s => {
            const t = s.type||'main';
            return `<tr><td>${s.index??s.order??'--'}</td>
                <td><span class="yt-badge yt-badge-${SEG_COLORS[t]||'info'}">${t}</span></td>
                <td>${escapeHtml((s.narration||'').substring(0,80))}...</td>
                <td>${escapeHtml((s.visual_direction||s.visualDirection||'').substring(0,60))}</td>
                <td>${formatDuration(s.duration||0)}</td></tr>`;
        }).join('');
        p.innerHTML = `<div class="yt-card"><div class="yt-card-body">
            <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
                <button class="yt-btn yt-btn-sm yt-btn-primary" id="sc-edit">Editar Roteiro</button></div>
            <table class="yt-table"><thead><tr><th>#</th><th>Tipo</th><th>Narracao</th><th>Visual</th><th>Duracao</th></tr></thead>
            <tbody>${rows||'<tr><td colspan="5">Nenhum segmento</td></tr>'}</tbody></table>
        </div></div>`;
        p.querySelector('#sc-edit')?.addEventListener('click', () => router.navigate(`projects/${_pid}/topics/${_tid}/script`));
    } catch { p.innerHTML = '<p style="color:var(--color-text-secondary);">Roteiro ainda nao gerado.</p>'; }
}

// -- Visuals Tab --
async function loadVisuals() {
    const p = document.getElementById('panel-visuals');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const vis = await api.visuals.list(_pid, _tid);
        const items = vis.segments||vis||[];
        if (!items.length) { p.innerHTML = '<p style="color:var(--color-text-secondary);">Nenhum visual gerado.</p>'; return; }
        p.innerHTML = `<div class="yt-grid-3">${items.map(v => `
            <div class="yt-card"><div class="yt-card-body" style="text-align:center;">
                <img src="${escapeHtml(v.url||v.image_url||'')}" alt="Seg ${v.segment_index??''}"
                     style="max-width:100%;border-radius:8px;" onerror="this.style.display='none'">
                <p style="margin-top:8px;font-size:13px;color:var(--color-text-secondary);">Segmento ${v.segment_index??v.segmentIndex??'?'}</p>
            </div></div>`).join('')}</div>`;
    } catch { p.innerHTML = '<p style="color:var(--color-text-secondary);">Visuais nao disponiveis.</p>'; }
}

// -- Narration Tab --
async function loadNarration() {
    const p = document.getElementById('panel-narration');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const n = await api.narration.get(_pid, _tid);
        const url = n.audio_url||n.audioUrl||'';
        p.innerHTML = `<div class="yt-card"><div class="yt-card-body">
            ${url?`<audio controls style="width:100%;margin-bottom:12px;"><source src="${escapeHtml(url)}" type="audio/mpeg"></audio>`:'<p>Audio nao disponivel</p>'}
            <p>Duracao: ${formatDuration(n.duration||0)}</p>
            <button class="yt-btn yt-btn-sm yt-btn-primary" id="nr-regen" style="margin-top:12px;">Regenerar</button>
        </div></div>`;
        p.querySelector('#nr-regen')?.addEventListener('click', async () => {
            try { await api.narration.regenerate(_pid,_tid); toast('Regeneracao iniciada!','success'); }
            catch(e){toast('Erro: '+e.message,'error');} });
    } catch { p.innerHTML = '<p style="color:var(--color-text-secondary);">Narracao nao gerada.</p>'; }
}

// -- Video Tab --
async function loadVideo() {
    const p = document.getElementById('panel-video');
    p.innerHTML = '<div class="yt-spinner"></div>';
    try {
        const v = await api.video.get(_pid, _tid);
        const url = v.video_url||v.videoUrl||'';
        const sz = v.file_size||v.fileSize||0;
        p.innerHTML = `<div class="yt-card"><div class="yt-card-body">
            ${url?`<video controls style="width:100%;border-radius:8px;margin-bottom:12px;"><source src="${escapeHtml(url)}" type="video/mp4"></video>`:'<p>Video nao disponivel</p>'}
            <p>Tamanho: ${sz?(sz/(1024*1024)).toFixed(1)+' MB':'--'}</p>
            <button class="yt-btn yt-btn-sm yt-btn-primary" id="vd-reas" style="margin-top:12px;">Remontar Video</button>
        </div></div>`;
        p.querySelector('#vd-reas')?.addEventListener('click', async () => {
            try { await api.video.reassemble(_pid,_tid); toast('Remontagem iniciada!','success'); }
            catch(e){toast('Erro: '+e.message,'error');} });
    } catch { p.innerHTML = '<p style="color:var(--color-text-secondary);">Video nao gerado.</p>'; }
}
