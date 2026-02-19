// =============================================================================
// PAGE: project-settings - Configuracoes do projeto (5 abas)
// =============================================================================
import { initTabs } from '../components/tabs.js';
import { escapeHtml } from '../utils/dom.js';

const api = window.ytApi;
const toast = window.ytToast;
let _pid = null;
let _s = {};
let _env = {};

function $(id) { return document.getElementById(id); }
function val(id) { return $(id)?.value?.trim() ?? ''; }

async function save(fn, msg) {
    try { await fn(); toast(msg, 'success'); }
    catch (e) { toast('Erro: ' + e.message, 'error'); }
}

function opt(value, current) { return value === current ? 'selected' : ''; }
function chk(val) { return val ? 'checked' : ''; }

/** If value is a masked placeholder, return null so backend preserves existing. */
function cleanKey(id) {
    const v = val(id);
    if (!v || v.startsWith('****')) return null;
    return v;
}

const DEFAULT_MODELS = {
    gemini: 'gemini-2.0-flash',
    anthropic: 'claude-sonnet-4-5-20250929',
    openai: 'gpt-4o',
};

// =============================================================================
// Page loader
// =============================================================================
window.ytRegisterPage('project-settings', async (params) => {
    _pid = params.projectId;
    try {
        const [settings, envProviders] = await Promise.all([
            api.settings.get(_pid),
            api.settings.envProviders(_pid).catch(() => ({})),
        ]);
        _s = settings;
        _env = envProviders;
        $('settings-loading').style.display = 'none';
        $('settings-tabs').style.display = '';
        renderStorytelling();
        renderAI();
        renderPublishing();
        renderVisual();
        renderYouTube();
        initTabs('settings-tabs');

        // Check for OAuth callback params
        const hashParts = location.hash.split('?');
        if (hashParts[1]) {
            const hp = new URLSearchParams(hashParts[1]);
            if (hp.get('oauth_success')) {
                toast('YouTube conectado com sucesso!', 'success');
                history.replaceState(null, '', hashParts[0]);
            }
            if (hp.get('oauth_error')) {
                toast('Erro OAuth: ' + hp.get('oauth_error'), 'error');
                history.replaceState(null, '', hashParts[0]);
            }
        }
    } catch (err) {
        $('settings-loading').style.display = 'none';
        toast('Erro ao carregar configuracoes: ' + err.message, 'error');
    }
});

// =============================================================================
// Tab 1: Storytelling
// =============================================================================
function renderStorytelling() {
    const styles = ['educational', 'documentary', 'dramatic', 'tutorial', 'entertainment'];
    const tones = ['conversational', 'formal', 'dramatic', 'humorous', 'inspirational'];
    $('panel-storytelling').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Estilo de Narrativa</label>
                <select class="yt-select" id="st-style">
                    ${styles.map(v => `<option value="${v}" ${opt(v, _s.storytelling_style)}>${v}</option>`).join('')}
                </select></div>
            <div class="yt-form-group"><label class="yt-label">Tom da Narracao</label>
                <select class="yt-select" id="st-tone">
                    ${tones.map(v => `<option value="${v}" ${opt(v, _s.narration_tone)}>${v}</option>`).join('')}
                </select></div>
        </div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Duracao Alvo (minutos)</label>
                <input class="yt-input" id="st-duration" type="number" min="1" max="120"
                    value="${_s.target_duration_minutes || 12}"></div>
            <div class="yt-form-group"><label class="yt-label">Richness Score Minimo (0-10)</label>
                <input class="yt-input" id="st-richness" type="number" min="0" max="10"
                    value="${_s.min_richness_score || 5}"></div>
            <div class="yt-form-group"><label class="yt-label">Idioma</label>
                <select class="yt-select" id="st-lang">
                    <option value="pt-BR" ${opt('pt-BR', _s.language)}>Portugues (BR)</option>
                    <option value="en" ${opt('en', _s.language)}>Ingles</option>
                    <option value="es" ${opt('es', _s.language)}>Espanhol</option>
                </select></div>
        </div>
        <div class="yt-form-group"><label class="yt-label">Template de Narrativa (opcional)</label>
            <textarea class="yt-textarea" id="st-template" rows="3"
                placeholder="Estrutura padrao para as historias...">${escapeHtml(_s.narrative_template || '')}</textarea></div>
        <div class="yt-form-group"><label class="yt-label">Gatilhos Emocionais (opcional)</label>
            <input class="yt-input" id="st-triggers" value="${escapeHtml(_s.emotional_triggers || '')}"
                placeholder="Ex: curiosidade, surpresa, medo"></div>
        <button class="yt-btn yt-btn-primary" id="st-save">Salvar Storytelling</button>
        </div></div>`;

    $('st-save')?.addEventListener('click', () => save(
        () => api.settings.updateStorytelling(_pid, {
            storytelling_style: val('st-style'),
            narration_tone: val('st-tone'),
            target_duration_minutes: Number(val('st-duration')),
            min_richness_score: Number(val('st-richness')),
            language: val('st-lang'),
            narrative_template: val('st-template') || null,
            emotional_triggers: val('st-triggers') || null,
        }), 'Storytelling atualizado!'));
}

// =============================================================================
// Tab 2: Provedores IA
// =============================================================================
function renderAI() {
    const envHint = (provider) => {
        if (_env[provider]) return `<span class="yt-field-hint" style="color:var(--color-green);">Credencial do ambiente disponivel</span>`;
        return '';
    };

    $('panel-ai').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">Modelo de Linguagem (LLM)</h3>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Provider</label>
                <select class="yt-select" id="ai-llm">
                    <option value="gemini" ${opt('gemini', _s.llm_provider)}>Google Gemini</option>
                    <option value="anthropic" ${opt('anthropic', _s.llm_provider)}>Anthropic Claude</option>
                    <option value="openai" ${opt('openai', _s.llm_provider)}>OpenAI</option>
                </select>
                <div id="ai-llm-env-hint">${envHint(_s.llm_provider)}</div></div>
            <div class="yt-form-group"><label class="yt-label">Modelo</label>
                <input class="yt-input" id="ai-model" value="${escapeHtml(_s.llm_model || '')}"
                    placeholder="Ex: gemini-2.0-flash"></div>
        </div>
        <div class="yt-form-group"><label class="yt-label">LLM API Key (opcional se credencial do ambiente)</label>
            <input class="yt-input" id="ai-llm-key" type="password" value="${escapeHtml(_s.llm_api_key || '')}"
                placeholder="Deixe vazio para usar credencial do ambiente"></div>

        <hr style="border:none;border-top:1px solid var(--color-border);margin:20px 0;">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">Busca Web</h3>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Search Provider</label>
                <select class="yt-select" id="ai-search">
                    <option value="tavily" ${opt('tavily', _s.search_provider)}>Tavily</option>
                    <option value="serper" ${opt('serper', _s.search_provider)}>Serper</option>
                </select></div>
            <div class="yt-form-group"><label class="yt-label">Search API Key</label>
                <input class="yt-input" id="ai-search-key" type="password"
                    value="${escapeHtml(_s.search_api_key || '')}"></div>
        </div>

        <hr style="border:none;border-top:1px solid var(--color-border);margin:20px 0;">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">Geracao de Imagens</h3>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Image Provider</label>
                <select class="yt-select" id="ai-img">
                    <option value="dalle" ${opt('dalle', _s.image_provider)}>DALL-E 3</option>
                    <option value="flux" ${opt('flux', _s.image_provider)}>Flux (Replicate)</option>
                </select></div>
        </div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">OpenAI API Key</label>
                <input class="yt-input" id="ai-oai-key" type="password"
                    value="${escapeHtml(_s.openai_api_key || '')}"
                    placeholder="Deixe vazio para usar credencial do ambiente">
                ${envHint('openai')}</div>
            <div class="yt-form-group"><label class="yt-label">Replicate API Key</label>
                <input class="yt-input" id="ai-rep-key" type="password"
                    value="${escapeHtml(_s.replicate_api_key || '')}"
                    placeholder="Deixe vazio para usar credencial do ambiente">
                ${envHint('replicate')}</div>
        </div>
        <button class="yt-btn yt-btn-primary" id="ai-save">Salvar Provedores IA</button>
        </div></div>`;

    // Auto-suggest model when provider changes
    $('ai-llm')?.addEventListener('change', () => {
        const provider = val('ai-llm');
        const modelInput = $('ai-model');
        const current = modelInput.value.trim();
        if (!current || Object.values(DEFAULT_MODELS).includes(current)) {
            modelInput.value = DEFAULT_MODELS[provider] || '';
        }
        $('ai-llm-env-hint').innerHTML = _env[provider]
            ? `<span class="yt-field-hint" style="color:var(--color-green);">Credencial do ambiente disponivel</span>`
            : '';
    });

    $('ai-save')?.addEventListener('click', () => save(
        () => api.settings.updateAI(_pid, {
            llm_provider: val('ai-llm'),
            llm_model: val('ai-model'),
            llm_api_key: cleanKey('ai-llm-key'),
            search_provider: val('ai-search'),
            search_api_key: cleanKey('ai-search-key'),
            image_provider: val('ai-img'),
            openai_api_key: cleanKey('ai-oai-key'),
            replicate_api_key: cleanKey('ai-rep-key'),
        }), 'Provedores IA atualizados!'));
}

// =============================================================================
// Tab 3: Publicacao
// =============================================================================
function renderPublishing() {
    const pubTimes = parsePubTimes(_s.publication_times);
    const pubDays = parsePubDays(_s.publication_days);
    const freq = _s.max_publications_per_day || _s.max_publishes_per_day || 1;
    const tz = _s.publication_timezone || 'America/Sao_Paulo';
    const vis = _s.default_visibility || 'public';

    const dayLabels = [
        { key: 'mon', label: 'Seg' }, { key: 'tue', label: 'Ter' },
        { key: 'wed', label: 'Qua' }, { key: 'thu', label: 'Qui' },
        { key: 'fri', label: 'Sex' }, { key: 'sat', label: 'Sab' },
        { key: 'sun', label: 'Dom' },
    ];

    $('panel-publishing').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Frequencia de Publicacao</label>
                <select class="yt-select" id="pub-freq">
                    ${[1, 2, 3, 4, 5].map(n =>
                        `<option value="${n}" ${n === freq ? 'selected' : ''}>${n}x por dia</option>`
                    ).join('')}
                </select></div>
            <div class="yt-form-group"><label class="yt-label">Fuso Horario</label>
                <select class="yt-select" id="pub-tz">
                    <option value="America/Sao_Paulo" ${opt('America/Sao_Paulo', tz)}>Brasilia (GMT-3)</option>
                    <option value="America/New_York" ${opt('America/New_York', tz)}>Nova York (GMT-5)</option>
                    <option value="America/Los_Angeles" ${opt('America/Los_Angeles', tz)}>Los Angeles (GMT-8)</option>
                    <option value="Europe/London" ${opt('Europe/London', tz)}>Londres (GMT+0)</option>
                    <option value="Europe/Lisbon" ${opt('Europe/Lisbon', tz)}>Lisboa (GMT+0)</option>
                    <option value="UTC" ${opt('UTC', tz)}>UTC</option>
                </select></div>
        </div>

        <div class="yt-form-group">
            <label class="yt-label">Horarios de Publicacao</label>
            <div id="pub-times-container"></div>
        </div>

        <div class="yt-form-group">
            <label class="yt-label">Dias da Semana</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${dayLabels.map(d => `
                    <label style="display:flex;align-items:center;gap:4px;padding:8px 12px;
                        background:var(--color-bg-elevated);border:1px solid var(--color-border);
                        border-radius:var(--radius-md);cursor:pointer;font-size:var(--font-size-sm);">
                        <input type="checkbox" class="pub-day" value="${d.key}"
                            ${pubDays.includes(d.key) ? 'checked' : ''}> ${d.label}
                    </label>
                `).join('')}
            </div>
        </div>

        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Visibilidade Padrao</label>
                <select class="yt-select" id="pub-vis">
                    <option value="public" ${opt('public', vis)}>Publico</option>
                    <option value="unlisted" ${opt('unlisted', vis)}>Nao Listado</option>
                    <option value="private" ${opt('private', vis)}>Privado</option>
                </select></div>
            <div class="yt-form-group">
                <label class="yt-label" style="display:flex;align-items:center;gap:8px;margin-top:24px;">
                    <input type="checkbox" id="pub-auto" ${chk(_s.auto_publish)}>
                    Publicacao Automatica (sem revisao manual)
                </label>
            </div>
        </div>

        <button class="yt-btn yt-btn-primary" id="pub-save">Salvar Publicacao</button>
        </div></div>`;

    renderTimeSlots(pubTimes, freq);

    $('pub-freq')?.addEventListener('change', () => {
        const newFreq = Number(val('pub-freq'));
        const currentTimes = getTimeSlotsValues();
        renderTimeSlots(currentTimes, newFreq);
    });

    $('pub-save')?.addEventListener('click', () => {
        const times = getTimeSlotsValues();
        const days = [...document.querySelectorAll('.pub-day:checked')].map(c => c.value);
        save(
            () => api.settings.updatePublishing(_pid, {
                max_publications_per_day: Number(val('pub-freq')),
                publication_times: times,
                publication_days: days,
                publication_timezone: val('pub-tz'),
                default_visibility: val('pub-vis'),
                auto_publish: $('pub-auto').checked,
            }), 'Publicacao atualizada!'
        );
    });
}

function parsePubTimes(raw) {
    if (!raw) return ['14:00'];
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return ['14:00']; }
    }
    return Array.isArray(raw) ? raw : ['14:00'];
}

function parsePubDays(raw) {
    if (!raw) return ['mon', 'tue', 'wed', 'thu', 'fri'];
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return ['mon', 'tue', 'wed', 'thu', 'fri']; }
    }
    return Array.isArray(raw) ? raw : ['mon', 'tue', 'wed', 'thu', 'fri'];
}

function renderTimeSlots(currentTimes, freq) {
    const container = $('pub-times-container');
    if (!container) return;

    let html = '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
    for (let i = 0; i < freq; i++) {
        const time = currentTimes[i] || `${String(10 + i * 4).padStart(2, '0')}:00`;
        html += `
            <div class="yt-form-group" style="flex:0 0 auto;min-width:120px;">
                <label class="yt-label">Horario ${i + 1}</label>
                <input class="yt-input pub-time-slot" type="time" value="${time}">
            </div>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function getTimeSlotsValues() {
    return [...document.querySelectorAll('.pub-time-slot')].map(input => input.value);
}

// =============================================================================
// Tab 4: Identidade Visual
// =============================================================================
function renderVisual() {
    $('panel-visual').innerHTML = `
        <div class="yt-card"><div class="yt-card-body">
        <div class="yt-form-group"><label class="yt-label">Estilo Visual</label>
            <input class="yt-input" id="vis-style"
                value="${escapeHtml(_s.visual_style || '')}"
                placeholder="Ex: cinematografico, fotorrealista"></div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Cores da Marca (virgula)</label>
                <input class="yt-input" id="vis-colors"
                    value="${escapeHtml(_s.brand_colors || '')}"
                    placeholder="Ex: #FF5733, #1A1A2E"></div>
            <div class="yt-form-group"><label class="yt-label">URL da Marca d'agua</label>
                <input class="yt-input" id="vis-watermark"
                    value="${escapeHtml(_s.watermark_url || '')}"
                    placeholder="https://..."></div>
        </div>

        <hr style="border:none;border-top:1px solid var(--color-border);margin:20px 0;">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">Thumbnail</h3>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Fonte</label>
                <input class="yt-input" id="vis-font"
                    value="${escapeHtml(_s.thumbnail_font || 'Inter Bold')}"></div>
            <div class="yt-form-group"><label class="yt-label">Tamanho (px)</label>
                <input class="yt-input" id="vis-font-size" type="number" min="12" max="200"
                    value="${_s.thumbnail_font_size || 72}"></div>
        </div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Cor do Texto</label>
                <input class="yt-input" id="vis-text-color" type="color"
                    value="${_s.thumbnail_text_color || '#FFFFFF'}"></div>
            <div class="yt-form-group"><label class="yt-label">Cor do Contorno</label>
                <input class="yt-input" id="vis-stroke-color" type="color"
                    value="${_s.thumbnail_stroke_color || '#000000'}"></div>
            <div class="yt-form-group"><label class="yt-label">Largura Contorno (px)</label>
                <input class="yt-input" id="vis-stroke-width" type="number" min="0" max="10"
                    value="${_s.thumbnail_stroke_width || 2}"></div>
        </div>

        <hr style="border:none;border-top:1px solid var(--color-border);margin:20px 0;">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">Montagem de Video</h3>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Transicao</label>
                <select class="yt-select" id="vis-transition">
                    ${['crossfade', 'fade', 'dissolve', 'wipe', 'none'].map(v =>
                        `<option value="${v}" ${opt(v, _s.transition_type)}>${v}</option>`
                    ).join('')}
                </select></div>
            <div class="yt-form-group"><label class="yt-label">Duracao Transicao (ms)</label>
                <input class="yt-input" id="vis-trans-dur" type="number" min="0" max="3000"
                    value="${_s.transition_duration_ms || 500}"></div>
        </div>
        <div class="yt-form-row">
            <div class="yt-form-group"><label class="yt-label">Ken Burns (0.00 - 0.20)</label>
                <input class="yt-input" id="vis-kb" type="number" step="0.01" min="0" max="0.20"
                    value="${_s.ken_burns_intensity || 0.05}"></div>
            <div class="yt-form-group"><label class="yt-label">Volume Musica de Fundo (0.00 - 1.00)</label>
                <input class="yt-input" id="vis-music-vol" type="number" step="0.05" min="0" max="1"
                    value="${_s.background_music_volume || 0.15}"></div>
        </div>
        <button class="yt-btn yt-btn-primary" id="vis-save">Salvar Identidade Visual</button>
        </div></div>`;

    $('vis-save')?.addEventListener('click', () => save(
        () => api.settings.updateVisualIdentity(_pid, {
            visual_style: val('vis-style'),
            brand_colors: val('vis-colors'),
            watermark_url: val('vis-watermark') || null,
            thumbnail_font: val('vis-font'),
            thumbnail_font_size: Number(val('vis-font-size')),
            thumbnail_text_color: val('vis-text-color'),
            thumbnail_stroke_color: val('vis-stroke-color'),
            thumbnail_stroke_width: Number(val('vis-stroke-width')),
            transition_type: val('vis-transition'),
            transition_duration_ms: Number(val('vis-trans-dur')),
            ken_burns_intensity: Number(val('vis-kb')),
            background_music_volume: Number(val('vis-music-vol')),
        }), 'Identidade visual atualizada!'));
}

// =============================================================================
// Tab 5: YouTube
// =============================================================================
function renderYouTube() {
    const connected = _s.youtube_connected;
    const categories = [
        { id: '1', name: 'Film & Animation' },
        { id: '2', name: 'Autos & Vehicles' },
        { id: '10', name: 'Music' },
        { id: '15', name: 'Pets & Animals' },
        { id: '17', name: 'Sports' },
        { id: '20', name: 'Gaming' },
        { id: '22', name: 'People & Blogs' },
        { id: '23', name: 'Comedy' },
        { id: '24', name: 'Entertainment' },
        { id: '25', name: 'News & Politics' },
        { id: '26', name: 'Howto & Style' },
        { id: '27', name: 'Education' },
        { id: '28', name: 'Science & Technology' },
    ];
    const catId = String(_s.youtube_category_id || '22');

    if (connected) {
        $('panel-youtube').innerHTML = `
            <div class="yt-card"><div class="yt-card-body">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
                ${_s.youtube_channel_avatar_url
                    ? `<img src="${escapeHtml(_s.youtube_channel_avatar_url)}" style="width:48px;height:48px;border-radius:50%;">`
                    : '<div style="width:48px;height:48px;border-radius:50%;background:var(--color-bg-elevated);display:flex;align-items:center;justify-content:center;font-size:20px;">&#9654;</div>'}
                <div>
                    <div style="font-weight:600;font-size:var(--font-size-base);">
                        ${escapeHtml(_s.youtube_channel_name || 'Canal Conectado')}</div>
                    <div style="font-size:var(--font-size-xs);color:var(--color-text-muted);">
                        ID: ${escapeHtml(_s.youtube_channel_id || '--')}</div>
                </div>
                <span class="yt-badge yt-badge-green" style="margin-left:auto;">Conectado</span>
            </div>

            <div class="yt-form-group"><label class="yt-label">Categoria do Canal</label>
                <select class="yt-select" id="yt-category">
                    ${categories.map(c =>
                        `<option value="${c.id}" ${opt(c.id, catId)}>${c.id} - ${c.name}</option>`
                    ).join('')}
                </select></div>

            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="yt-btn yt-btn-primary" id="yt-save">Salvar Categoria</button>
                <button class="yt-btn yt-btn-danger" id="yt-disconnect">Desconectar</button>
            </div>
            </div></div>`;

        $('yt-save')?.addEventListener('click', () => save(
            () => api.settings.updateYouTube(_pid, {
                youtube_category_id: val('yt-category'),
            }), 'Categoria atualizada!'));

        $('yt-disconnect')?.addEventListener('click', async () => {
            if (!confirm('Deseja realmente desconectar o canal do YouTube?')) return;
            await save(
                () => api.settings.youtubeDisconnect(_pid),
                'YouTube desconectado!');
            _s.youtube_connected = false;
            _s.youtube_channel_id = null;
            _s.youtube_channel_name = null;
            _s.youtube_channel_avatar_url = null;
            renderYouTube();
        });
    } else {
        $('panel-youtube').innerHTML = `
            <div class="yt-card"><div class="yt-card-body">
            <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">
                Conectar Canal do YouTube</h3>

            <div style="background:var(--color-bg-elevated);border:1px solid var(--color-border);
                border-radius:var(--radius-lg);padding:16px;margin-bottom:16px;">
                <p style="font-weight:600;margin-bottom:8px;color:var(--color-text);">
                    Passo 1: Criar credenciais no Google Cloud</p>
                <ol style="color:var(--color-text-secondary);font-size:var(--font-size-sm);
                    line-height:1.8;padding-left:20px;">
                    <li>Acesse <a href="https://console.cloud.google.com" target="_blank"
                        style="color:var(--color-accent);">console.cloud.google.com</a></li>
                    <li>Crie um novo projeto (ou use existente)</li>
                    <li>Em "APIs e Servicos", ative a <strong>YouTube Data API v3</strong></li>
                    <li>Em "Credenciais", crie um <strong>ID do cliente OAuth 2.0</strong> (tipo: Aplicativo Web)</li>
                    <li>Adicione o URI de redirecionamento mostrado abaixo</li>
                </ol>
            </div>

            <div style="background:var(--color-bg-elevated);border:1px solid var(--color-border);
                border-radius:var(--radius-lg);padding:16px;margin-bottom:16px;">
                <p style="font-weight:600;margin-bottom:8px;color:var(--color-text);">
                    Passo 2: Configurar credenciais</p>
                <div class="yt-form-group"><label class="yt-label">Google Client ID</label>
                    <input class="yt-input" id="yt-client-id"
                        value="${escapeHtml(_s.google_client_id || '')}"
                        placeholder="xxxxx.apps.googleusercontent.com"></div>
                <div class="yt-form-group"><label class="yt-label">Google Client Secret</label>
                    <input class="yt-input" id="yt-client-secret" type="password"
                        value="${escapeHtml(_s.google_client_secret || '')}"
                        placeholder="GOCSPX-..."></div>
                <div class="yt-form-group"><label class="yt-label">URI de Redirecionamento (copie para o Google Cloud)</label>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input class="yt-input" id="yt-redirect-uri" readonly
                            value="${window.location.origin}/api/youtube/projects/${_pid}/settings/youtube/callback"
                            style="font-size:var(--font-size-xs);">
                        <button class="yt-btn yt-btn-sm" id="yt-copy-uri" title="Copiar">Copiar</button>
                    </div></div>
            </div>

            <div style="background:var(--color-bg-elevated);border:1px solid var(--color-border);
                border-radius:var(--radius-lg);padding:16px;margin-bottom:16px;">
                <p style="font-weight:600;margin-bottom:8px;color:var(--color-text);">
                    Passo 3: Autorizar</p>
                <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:12px;">
                    Salve as credenciais acima primeiro, depois clique em conectar.</p>
                <button class="yt-btn yt-btn-primary" id="yt-connect">Conectar com Google</button>
            </div>

            <div class="yt-form-group" style="margin-top:16px;">
                <label class="yt-label">Categoria do Canal</label>
                <select class="yt-select" id="yt-category">
                    ${categories.map(c =>
                        `<option value="${c.id}" ${opt(c.id, catId)}>${c.id} - ${c.name}</option>`
                    ).join('')}
                </select></div>

            <button class="yt-btn yt-btn-ghost" id="yt-save-creds" style="margin-top:12px;">
                Salvar Credenciais</button>
            </div></div>`;

        $('yt-copy-uri')?.addEventListener('click', () => {
            const uri = $('yt-redirect-uri').value;
            navigator.clipboard.writeText(uri).then(() => toast('URI copiado!', 'success'));
        });

        $('yt-save-creds')?.addEventListener('click', () => save(
            () => api.settings.updateYouTube(_pid, {
                google_client_id: cleanKey('yt-client-id') || val('yt-client-id'),
                google_client_secret: cleanKey('yt-client-secret') || val('yt-client-secret'),
                youtube_category_id: val('yt-category'),
            }), 'Credenciais salvas!'));

        $('yt-connect')?.addEventListener('click', async () => {
            const clientId = val('yt-client-id');
            const clientSecret = val('yt-client-secret');
            if (!clientId || !clientSecret) {
                toast('Preencha Client ID e Client Secret primeiro', 'error');
                return;
            }

            try {
                await api.settings.updateYouTube(_pid, {
                    google_client_id: clientId,
                    google_client_secret: clientSecret,
                    youtube_category_id: val('yt-category'),
                });

                const { authUrl } = await api.settings.youtubeAuthUrl(_pid);
                window.location.href = authUrl;
            } catch (e) {
                toast('Erro: ' + e.message, 'error');
            }
        });
    }
}
