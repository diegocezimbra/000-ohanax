// =============================================================================
// PAGE: project-settings - Configuracoes do projeto (5 abas)
// =============================================================================
import { initTabs } from '../components/tabs.js';
import { escapeHtml } from '../utils/dom.js';

const api = window.ytApi;
const toast = window.ytToast;
let _pid = null;
let _s = {};

function $(id) { return document.getElementById(id); }
function val(id) { return $(id)?.value?.trim() ?? ''; }

async function save(fn, msg) {
    try { await fn(); toast(msg, 'success'); }
    catch (e) { toast('Erro: ' + e.message, 'error'); }
}

function opt(value, current) { return value === current ? 'selected' : ''; }

window.ytRegisterPage('project-settings', async (params) => {
    _pid = params.projectId;
    try {
        _s = await api.settings.get(_pid);
        $('settings-loading').style.display = 'none';
        $('settings-tabs').style.display = '';
        renderStorytelling(); renderAI(); renderPublishing(); renderVisual(); renderYouTube();
        initTabs('settings-tabs');
    } catch (err) {
        $('settings-loading').style.display = 'none';
        toast('Erro ao carregar configuracoes: ' + err.message, 'error');
    }
});

function renderStorytelling() {
    const styles = ['educational','documentary','dramatic','tutorial','entertainment'];
    $('panel-storytelling').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-group"><label class="yt-label">Estilo de Narrativa</label>
            <select class="yt-select" id="st-style">
                ${styles.map(v=>`<option value="${v}" ${opt(v,_s.storytelling_style)}>${v}</option>`).join('')}
            </select></div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Duracao Alvo (min)</label>
                <input class="yt-input" id="st-length" type="number" min="1" max="120" value="${_s.target_video_length||10}"></div>
            <div class="yt-form-group"><label class="yt-label">Idioma</label>
                <input class="yt-input" id="st-lang" value="${escapeHtml(_s.language||'pt-BR')}" maxlength="10"></div>
        </div>
        <button class="yt-btn yt-btn-primary" id="st-save">Salvar Storytelling</button>
        </div></div>`;
    $('st-save')?.addEventListener('click', () => save(
        () => api.settings.updateStorytelling(_pid, {
            storytelling_style: val('st-style'), target_video_length: Number(val('st-length')),
            language: val('st-lang'),
        }), 'Storytelling atualizado!'));
}

function renderAI() {
    $('panel-ai').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">LLM Provider</label>
                <select class="yt-select" id="ai-llm">
                    <option value="openai" ${opt('openai',_s.llm_provider)}>OpenAI</option>
                    <option value="anthropic" ${opt('anthropic',_s.llm_provider)}>Anthropic</option>
                </select></div>
            <div class="yt-form-group"><label class="yt-label">Modelo LLM</label>
                <input class="yt-input" id="ai-model" value="${escapeHtml(_s.llm_model||'')}" placeholder="Ex: gpt-4o"></div>
        </div>
        <div class="yt-form-group"><label class="yt-label">LLM API Key</label>
            <input class="yt-input" id="ai-llm-key" type="password" value="${escapeHtml(_s.llm_api_key||'')}" placeholder="sk-..."></div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Busca Provider</label>
                <select class="yt-select" id="ai-search">
                    <option value="tavily" ${opt('tavily',_s.search_provider)}>Tavily</option>
                    <option value="serper" ${opt('serper',_s.search_provider)}>Serper</option>
                </select></div>
            <div class="yt-form-group"><label class="yt-label">Search API Key</label>
                <input class="yt-input" id="ai-search-key" type="password" value="${escapeHtml(_s.search_api_key||'')}"></div>
        </div>
        <div class="yt-form-group"><label class="yt-label">Image Provider</label>
            <select class="yt-select" id="ai-img">
                <option value="dalle" ${opt('dalle',_s.image_provider)}>DALL-E</option>
                <option value="flux" ${opt('flux',_s.image_provider)}>Flux (Replicate)</option>
            </select></div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">OpenAI API Key</label>
                <input class="yt-input" id="ai-oai-key" type="password" value="${escapeHtml(_s.openai_api_key||'')}"></div>
            <div class="yt-form-group"><label class="yt-label">Replicate API Key</label>
                <input class="yt-input" id="ai-rep-key" type="password" value="${escapeHtml(_s.replicate_api_key||'')}"></div>
        </div>
        <button class="yt-btn yt-btn-primary" id="ai-save">Salvar Provedores IA</button>
        </div></div>`;
    $('ai-save')?.addEventListener('click', () => save(
        () => api.settings.updateAI(_pid, {
            llm_provider: val('ai-llm'), llm_model: val('ai-model'), llm_api_key: val('ai-llm-key'),
            search_provider: val('ai-search'), search_api_key: val('ai-search-key'),
            image_provider: val('ai-img'), openai_api_key: val('ai-oai-key'), replicate_api_key: val('ai-rep-key'),
        }), 'Provedores IA atualizados!'));
}

function renderPublishing() {
    const chk = _s.auto_publish ? 'checked' : '';
    $('panel-publishing').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Max Publicacoes / Dia</label>
                <input class="yt-input" id="pub-max" type="number" min="1" max="50" value="${_s.max_publishes_per_day||1}"></div>
            <div class="yt-form-group"><label class="yt-label">Horario Preferido (hora)</label>
                <input class="yt-input" id="pub-hour" type="number" min="0" max="23" value="${_s.preferred_publish_hour??10}"></div>
        </div>
        <div class="yt-form-group"><label class="yt-label" style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="pub-auto" ${chk}> Publicacao Automatica</label></div>
        <button class="yt-btn yt-btn-primary" id="pub-save">Salvar Publicacao</button>
        </div></div>`;
    $('pub-save')?.addEventListener('click', () => save(
        () => api.settings.updatePublishing(_pid, {
            max_publishes_per_day: Number(val('pub-max')),
            preferred_publish_hour: Number(val('pub-hour')),
            auto_publish: $('pub-auto').checked,
        }), 'Publicacao atualizada!'));
}

function renderVisual() {
    $('panel-visual').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-group"><label class="yt-label">Estilo Visual</label>
            <input class="yt-input" id="vis-style" value="${escapeHtml(_s.visual_style||'')}" placeholder="Ex: moderno, minimalista"></div>
        <div class="yt-form-group"><label class="yt-label">Cores da Marca (virgula)</label>
            <input class="yt-input" id="vis-colors" value="${escapeHtml(_s.brand_colors||'')}" placeholder="Ex: #FF5733, #1A1A2E"></div>
        <div class="yt-form-group"><label class="yt-label">URL da Marca d'agua</label>
            <input class="yt-input" id="vis-watermark" value="${escapeHtml(_s.watermark_url||'')}" placeholder="https://..."></div>
        <button class="yt-btn yt-btn-primary" id="vis-save">Salvar Identidade Visual</button>
        </div></div>`;
    $('vis-save')?.addEventListener('click', () => save(
        () => api.settings.updateVisualIdentity(_pid, {
            visual_style: val('vis-style'), brand_colors: val('vis-colors'), watermark_url: val('vis-watermark'),
        }), 'Identidade visual atualizada!'));
}

function renderYouTube() {
    $('panel-youtube').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-group"><label class="yt-label">YouTube Channel ID</label>
            <input class="yt-input" id="yt-channel-id" value="${escapeHtml(_s.youtube_channel_id||'')}" placeholder="UCxxxxxxxx"></div>
        <div class="yt-form-group"><label class="yt-label">YouTube Category ID</label>
            <input class="yt-input" id="yt-category" type="number" min="1" max="44" value="${_s.youtube_category_id||22}"></div>
        <div class="yt-card" style="margin-top:16px;background:var(--color-bg-tertiary);"><div class="yt-card-body">
            <p><strong>Conexao OAuth</strong></p>
            <p style="color:var(--color-text-secondary);margin-top:8px;">Para publicar videos automaticamente,
            conecte sua conta do YouTube via OAuth nas configuracoes de integracao do painel admin.</p>
        </div></div>
        <button class="yt-btn yt-btn-primary" id="yt-save" style="margin-top:16px;">Salvar YouTube</button>
        </div></div>`;
    $('yt-save')?.addEventListener('click', () => save(
        () => api.settings.updateYouTube(_pid, {
            youtube_channel_id: val('yt-channel-id'), youtube_category_id: Number(val('yt-category')),
        }), 'YouTube atualizado!'));
}
