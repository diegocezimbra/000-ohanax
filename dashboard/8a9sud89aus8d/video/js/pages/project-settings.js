// =============================================================================
// PAGE: project-settings - Configuracao do YouTube + Content Engine
// All configuration lists come from GET /settings/defaults (zero hardcoded data)
// =============================================================================
import { escapeHtml } from '../utils/dom.js';

const api = window.ytApi;
const toast = window.ytToast;
let _pid = null;
let _s = {};
let _defaults = {};
let _project = {};

function $(id) { return document.getElementById(id); }
function val(id) { return $(id)?.value?.trim() ?? ''; }

async function save(fn, msg) {
    try { await fn(); toast(msg, 'success'); }
    catch (e) { toast('Erro: ' + e.message, 'error'); }
}

function opt(value, current) { return value === current ? 'selected' : ''; }

/** If value is a masked placeholder, return null so backend preserves existing. */
function cleanKey(id) {
    const v = val(id);
    if (!v || v.startsWith('****')) return null;
    return v;
}

// =============================================================================
// Page loader
// =============================================================================
window.ytRegisterPage('project-settings', async (params) => {
    _pid = params.projectId;
    try {
        const [settings, defaults, project] = await Promise.all([
            api.settings.get(_pid),
            api.settings.defaults(_pid),
            api.projects.get(_pid),
        ]);
        _s = settings;
        _defaults = defaults;
        _project = project;

        $('settings-loading').style.display = 'none';
        $('settings-content').style.display = '';

        // Update page title with project name
        const pageTitle = document.querySelector('.yt-page-title');
        if (pageTitle && _project.name) {
            pageTitle.textContent = `Configuracoes — ${_project.name}`;
        }

        renderProject();
        renderContentEngine();
        renderPublishing();
        renderStorytelling();
        renderAIProviders();
        renderYouTube();

        // Check for OAuth callback params
        const hashParts = location.hash.split('?');
        if (hashParts[1]) {
            const hp = new URLSearchParams(hashParts[1]);
            if (hp.get('oauth_success')) {
                toast('YouTube conectado com sucesso!', 'success');
                history.replaceState(null, '', hashParts[0]);
                _s = await api.settings.get(_pid);
                renderYouTube();
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
// Project Info (name, niche, language, description)
// =============================================================================
function renderProject() {
    const container = $('settings-project');
    if (!container) return;

    const name = _project.name || '';
    const description = _project.description || '';
    const niche = _project.niche || '';
    const language = _project.language || 'pt-BR';
    const niches = _defaults.niches || [];
    const languages = _defaults.languages || [];

    container.innerHTML = `
        <div class="yt-card" style="margin-bottom:24px;"><div class="yt-card-body">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">
            Projeto</h3>
        <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:16px;">
            Informacoes gerais do projeto.</p>

        <div class="yt-form-group"><label class="yt-label">Nome do Projeto</label>
            <input class="yt-input" id="proj-name" maxlength="100"
                value="${escapeHtml(name)}"
                placeholder="Ex: Canal de Historia"></div>

        <div class="yt-form-group"><label class="yt-label">Nicho</label>
            <select class="yt-select" id="proj-niche">
                <option value="">Selecione...</option>
                ${niches.map(n => `<option value="${n.value}" ${opt(n.value, niche)}>${escapeHtml(n.label)}</option>`).join('')}
            </select></div>

        <div class="yt-form-group"><label class="yt-label">Idioma</label>
            <select class="yt-select" id="proj-language">
                ${languages.map(l => `<option value="${l.value}" ${opt(l.value, language)}>${escapeHtml(l.label)}</option>`).join('')}
            </select></div>

        <div class="yt-form-group"><label class="yt-label">Descricao</label>
            <textarea class="yt-textarea" id="proj-description" rows="3" maxlength="500"
                placeholder="Breve descricao do projeto...">${escapeHtml(description)}</textarea></div>

        <button class="yt-btn yt-btn-primary" id="proj-save" style="margin-top:12px;">
            Salvar Projeto</button>
        </div></div>`;

    $('proj-save')?.addEventListener('click', () => save(
        async () => {
            const updated = await api.projects.update(_pid, {
                name: val('proj-name'),
                niche: val('proj-niche') || null,
                language: val('proj-language'),
                description: val('proj-description') || null,
            });
            _project = updated;
            // Update page title and sidebar if name changed
            const pageTitle = document.querySelector('.yt-page-title');
            if (pageTitle) pageTitle.textContent = `Configuracoes — ${escapeHtml(updated.name || 'Projeto')}`;
        }, 'Projeto atualizado!'));
}

// =============================================================================
// Content Engine Settings
// =============================================================================
function renderContentEngine() {
    const container = $('settings-engine');
    if (!container) return;

    const engineActive = _s.content_engine_active ?? _s.contentEngineActive ?? true;
    const durTarget = _s.content_engine_duration_target || _s.contentEngineDurationTarget || '30-40';
    const pubPerDay = _s.content_engine_publications_per_day ?? _s.contentEnginePublicationsPerDay ?? 3;
    const bufferSize = _s.content_engine_buffer_size ?? _s.contentEngineBufferSize ?? 7;
    const maxGenPerDay = _s.content_engine_max_gen_per_day ?? _s.contentEngineMaxGenPerDay ?? 5;
    const minRichness = _s.content_engine_min_richness ?? _s.contentEngineMinRichness ?? 7;
    const durations = _defaults.duration_targets || [];

    container.innerHTML = `
        <div class="yt-card" style="margin-bottom:24px;"><div class="yt-card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="font-size:var(--font-size-base);font-weight:600;">Content Engine</h3>
            <button class="yt-btn yt-btn-sm ${engineActive ? 'yt-btn-ghost' : 'yt-btn-primary'}" id="ce-toggle">
                ${engineActive ? 'Pausar Engine' : 'Retomar Engine'}</button>
        </div>
        <div id="ce-status-badge" style="margin-bottom:16px;">
            <span class="yt-badge ${engineActive ? 'yt-badge-green' : 'yt-badge-yellow'}">
                ${engineActive ? 'Engine Ativo' : 'Engine Pausado'}</span>
        </div>
        <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:16px;">
            Configuracoes do motor automatico de descoberta e criacao de historias.</p>

        <div class="yt-form-group"><label class="yt-label">Duracao Alvo do Video</label>
            <select class="yt-select" id="ce-duration">
                ${durations.map(d => `<option value="${d.value}" ${opt(d.value, durTarget)}>${escapeHtml(d.label)}</option>`).join('')}
            </select></div>

        <div class="yt-form-group"><label class="yt-label">Publicacoes por Dia</label>
            <input class="yt-input" type="number" id="ce-pub-day" min="1" max="10"
                   value="${pubPerDay}"></div>

        <div class="yt-form-group"><label class="yt-label">Videos na Fila (Buffer)</label>
            <input class="yt-input" type="number" id="ce-buffer" min="1" max="30"
                   value="${bufferSize}">
            <small style="color:var(--color-text-muted);font-size:12px;">
                O engine gera novos videos quando a fila fica abaixo deste numero.</small></div>

        <div class="yt-form-group"><label class="yt-label">Max Geracoes por Dia</label>
            <input class="yt-input" type="number" id="ce-max-gen" min="1" max="20"
                   value="${maxGenPerDay}"></div>

        <div class="yt-form-group"><label class="yt-label">Riqueza Minima (0-10)</label>
            <input class="yt-input" type="number" id="ce-richness" min="0" max="10"
                   value="${minRichness}">
            <small style="color:var(--color-text-muted);font-size:12px;">
                Historias com score abaixo deste valor serao descartadas.</small></div>

        <button class="yt-btn yt-btn-primary" id="ce-save" style="margin-top:12px;">
            Salvar Content Engine</button>
        </div></div>`;

    $('ce-save')?.addEventListener('click', () => save(
        () => api.settings.updateContentEngine(_pid, {
            duration_target: val('ce-duration'),
            publications_per_day: parseInt(val('ce-pub-day')) || 3,
            buffer_size: parseInt(val('ce-buffer')) || 7,
            max_gen_per_day: parseInt(val('ce-max-gen')) || 5,
            min_richness: parseInt(val('ce-richness')) || 7,
        }), 'Content Engine configurado!'));

    $('ce-toggle')?.addEventListener('click', async () => {
        const btn = $('ce-toggle');
        const isActive = btn.textContent.includes('Pausar');
        try {
            if (isActive) {
                await api.contentEngine.pause(_pid);
                toast('Content Engine pausado.', 'info');
            } else {
                await api.contentEngine.resume(_pid);
                toast('Content Engine retomado!', 'success');
            }
            _s.content_engine_active = !isActive;
            renderContentEngine();
        } catch (e) { toast('Erro: ' + e.message, 'error'); }
    });
}

// =============================================================================
// Publishing Schedule
// =============================================================================
function renderPublishing() {
    const container = $('settings-publishing');
    if (!container) return;

    const maxPubDay = _s.max_publications_per_day ?? _s.max_publishes_per_day ?? 1;
    const pubTimes = (typeof _s.publication_times === 'string'
        ? JSON.parse(_s.publication_times || '[]')
        : _s.publication_times) || ['14:00'];
    const pubDays = (typeof _s.publication_days === 'string'
        ? JSON.parse(_s.publication_days || '[]')
        : _s.publication_days) || ['mon', 'tue', 'wed', 'thu', 'fri'];
    const timezone = _s.publication_timezone || 'America/Sao_Paulo';
    const visibility = _s.default_visibility || 'public';
    const autoPublish = _s.auto_publish ?? false;
    const timezones = _defaults.timezones || [];
    const visibilities = _defaults.visibilities || [];

    const allDays = [
        { key: 'mon', label: 'Seg' }, { key: 'tue', label: 'Ter' },
        { key: 'wed', label: 'Qua' }, { key: 'thu', label: 'Qui' },
        { key: 'fri', label: 'Sex' }, { key: 'sat', label: 'Sab' },
        { key: 'sun', label: 'Dom' },
    ];

    container.innerHTML = `
        <div class="yt-card" style="margin-bottom:24px;"><div class="yt-card-body">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">
            Agenda de Publicacao</h3>
        <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:16px;">
            Horarios e dias em que os videos serao publicados automaticamente.</p>

        <div class="yt-form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--font-size-sm);">
                <input type="checkbox" id="pub-auto" ${autoPublish ? 'checked' : ''}>
                Publicar automaticamente quando o video estiver pronto
            </label></div>

        <div class="yt-form-group"><label class="yt-label">Max Publicacoes por Dia</label>
            <input class="yt-input" type="number" id="pub-max-day" min="1" max="10"
                value="${maxPubDay}"></div>

        <div class="yt-form-group"><label class="yt-label">Horarios de Publicacao</label>
            <div id="pub-times-list" style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px;">
                ${pubTimes.map((t, i) => `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <input class="yt-input pub-time-input" type="time" value="${t}" style="width:140px;">
                        ${pubTimes.length > 1 ? `<button class="yt-btn yt-btn-sm yt-btn-ghost pub-time-remove" data-idx="${i}" title="Remover">X</button>` : ''}
                    </div>`).join('')}
            </div>
            <button class="yt-btn yt-btn-sm yt-btn-ghost" id="pub-add-time">+ Adicionar Horario</button></div>

        <div class="yt-form-group"><label class="yt-label">Dias da Semana</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">
                ${allDays.map(d => `
                    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:var(--font-size-sm);
                        padding:4px 12px;border:1px solid var(--color-border);border-radius:var(--radius-md);
                        background:${pubDays.includes(d.key) ? 'var(--color-accent)' : 'transparent'};
                        color:${pubDays.includes(d.key) ? '#fff' : 'var(--color-text)'};">
                        <input type="checkbox" class="pub-day-check" value="${d.key}"
                            ${pubDays.includes(d.key) ? 'checked' : ''} style="display:none;">
                        ${d.label}
                    </label>`).join('')}
            </div></div>

        <div class="yt-form-group"><label class="yt-label">Fuso Horario</label>
            <select class="yt-select" id="pub-timezone">
                ${timezones.map(t => `<option value="${t.value}" ${opt(t.value, timezone)}>${escapeHtml(t.label)}</option>`).join('')}
            </select></div>

        <div class="yt-form-group"><label class="yt-label">Visibilidade Padrao</label>
            <select class="yt-select" id="pub-visibility">
                ${visibilities.map(v => `<option value="${v.value}" ${opt(v.value, visibility)}>${escapeHtml(v.label)}</option>`).join('')}
            </select></div>

        <button class="yt-btn yt-btn-primary" id="pub-save" style="margin-top:12px;">
            Salvar Agenda</button>
        </div></div>`;

    // Toggle day styling on click
    container.querySelectorAll('.pub-day-check').forEach(cb => {
        cb.closest('label').addEventListener('click', () => {
            setTimeout(() => {
                const label = cb.closest('label');
                label.style.background = cb.checked ? 'var(--color-accent)' : 'transparent';
                label.style.color = cb.checked ? '#fff' : 'var(--color-text)';
            }, 0);
        });
    });

    // Add time slot
    $('pub-add-time')?.addEventListener('click', () => {
        const list = $('pub-times-list');
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;gap:8px;';
        div.innerHTML = `
            <input class="yt-input pub-time-input" type="time" value="12:00" style="width:140px;">
            <button class="yt-btn yt-btn-sm yt-btn-ghost pub-time-remove" title="Remover">X</button>`;
        list.appendChild(div);
        div.querySelector('.pub-time-remove').addEventListener('click', () => div.remove());
    });

    // Remove time slot
    container.querySelectorAll('.pub-time-remove').forEach(btn => {
        btn.addEventListener('click', () => btn.closest('div').remove());
    });

    // Save
    $('pub-save')?.addEventListener('click', () => save(
        async () => {
            const times = [...container.querySelectorAll('.pub-time-input')].map(i => i.value).filter(Boolean);
            const days = [...container.querySelectorAll('.pub-day-check:checked')].map(cb => cb.value);
            const updated = await api.settings.updatePublishing(_pid, {
                max_publications_per_day: parseInt(val('pub-max-day')) || 1,
                publication_times: times,
                publication_days: days,
                publication_timezone: val('pub-timezone'),
                default_visibility: val('pub-visibility'),
                auto_publish: $('pub-auto').checked,
            });
            _s = { ..._s, ...updated };
        }, 'Agenda de publicacao salva!'));
}

// =============================================================================
// Storytelling Settings (defaults from backend)
// =============================================================================
function renderStorytelling() {
    const container = $('settings-storytelling');
    if (!container) return;

    const sd = _defaults.storytelling_defaults || {};
    const hook = _s.storytelling_hook || _s.storytellingHook || sd.hook || '';
    const context = _s.storytelling_context || _s.storytellingContext || sd.context || '';
    const development = _s.storytelling_development || _s.storytellingDevelopment || sd.development || '';
    const twist = _s.storytelling_twist || _s.storytellingTwist || sd.twist || '';
    const resolution = _s.storytelling_resolution || _s.storytellingResolution || sd.resolution || '';
    const titleTemplate = _s.storytelling_title_template || _s.storytellingTitleTemplate || sd.title_template || '';
    const narrationTone = _s.storytelling_narration_tone || _s.storytellingNarrationTone || 'dramatic';

    const triggers = _s.storytelling_triggers || _s.storytellingTriggers || [];
    const allTriggers = _defaults.psychological_triggers || [];
    const tones = _defaults.narration_tones || [];

    container.innerHTML = `
        <div class="yt-card" style="margin-bottom:24px;"><div class="yt-card-body">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">
            Storytelling</h3>
        <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:16px;">
            Template narrativo e gatilhos psicologicos aplicados a todas as historias deste projeto.</p>

        <h4 style="font-size:var(--font-size-sm);font-weight:600;margin-bottom:12px;">Template Narrativo</h4>

        <div class="yt-form-group"><label class="yt-label">Hook (0:00 - 0:30)</label>
            <textarea class="yt-textarea" id="st-hook" rows="2"
                placeholder="O adversario ri/zomba/duvida. Humilhacao ou desprezo.">${escapeHtml(hook)}</textarea></div>

        <div class="yt-form-group"><label class="yt-label">Contexto (0:30 - 5:00)</label>
            <textarea class="yt-textarea" id="st-context" rows="2"
                placeholder="Background historico. O que estava em jogo.">${escapeHtml(context)}</textarea></div>

        <div class="yt-form-group"><label class="yt-label">Desenvolvimento (5:00 - 20:00)</label>
            <textarea class="yt-textarea" id="st-development" rows="2"
                placeholder="Jornada, dificuldades, momentos de duvida.">${escapeHtml(development)}</textarea></div>

        <div class="yt-form-group"><label class="yt-label">Virada (20:00 - 30:00)</label>
            <textarea class="yt-textarea" id="st-twist" rows="2"
                placeholder="As mesas viram. O adversario percebe que subestimou.">${escapeHtml(twist)}</textarea></div>

        <div class="yt-form-group"><label class="yt-label">Resolucao Triunfante (30:00+)</label>
            <textarea class="yt-textarea" id="st-resolution" rows="2"
                placeholder="Vitoria completa. Contraste zombaria vs resultado.">${escapeHtml(resolution)}</textarea></div>

        <div class="yt-form-group"><label class="yt-label">Template de Titulo</label>
            <input class="yt-input" id="st-title-tpl"
                value="${escapeHtml(titleTemplate)}"
                placeholder="{adversary} ri de {protagonist} sobre {topic} -- {consequence}">
            <small style="color:var(--color-text-muted);font-size:12px;">
                Placeholders: {adversary}, {protagonist}, {topic}, {consequence}</small></div>

        <div class="yt-form-group"><label class="yt-label">Tom da Narracao</label>
            <select class="yt-select" id="st-tone">
                ${tones.map(t => `<option value="${t.value}" ${opt(t.value, narrationTone)}>${escapeHtml(t.label)}</option>`).join('')}
            </select></div>

        <h4 style="font-size:var(--font-size-sm);font-weight:600;margin:16px 0 12px;">Gatilhos Psicologicos</h4>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
            ${allTriggers.map(t => `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:var(--font-size-sm);">
                    <input type="checkbox" class="st-trigger" value="${t.key}"
                        ${triggers.includes(t.key) ? 'checked' : ''}>
                    ${escapeHtml(t.label)}
                </label>`).join('')}
        </div>

        <button class="yt-btn yt-btn-primary" id="st-save" style="margin-top:12px;">
            Salvar Storytelling</button>
        </div></div>`;

    $('st-save')?.addEventListener('click', () => save(
        () => api.settings.updateStorytelling(_pid, {
            hook: val('st-hook'),
            context: val('st-context'),
            development: val('st-development'),
            twist: val('st-twist'),
            resolution: val('st-resolution'),
            title_template: val('st-title-tpl'),
            narration_tone: val('st-tone'),
            triggers: [...container.querySelectorAll('.st-trigger:checked')].map(cb => cb.value),
        }), 'Storytelling configurado!'));
}

// =============================================================================
// AI Providers (read-only info from backend)
// =============================================================================
function renderAIProviders() {
    const container = $('settings-ai-info');
    if (!container) return;

    const providers = _defaults.ai_providers || [];

    const rows = providers.map(p => `
        <tr>
            <td style="font-weight:500;">${escapeHtml(p.function)}</td>
            <td><span class="yt-badge yt-badge-blue">${escapeHtml(p.provider)}</span></td>
            <td style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">${escapeHtml(p.detail)}</td>
            <td style="text-align:center;">${p.configured
                ? '<span class="yt-badge yt-badge-green">OK</span>'
                : '<span class="yt-badge yt-badge-yellow">Falta Key</span>'}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="yt-card" style="margin-bottom:24px;"><div class="yt-card-body">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">
            Provedores de IA</h3>
        <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:16px;">
            Servicos utilizados em cada etapa do pipeline de geracao. Configurados via variaveis de ambiente.</p>
        <table class="yt-table">
            <thead><tr><th>Funcao</th><th>Provedor</th><th>Detalhes</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        </div></div>`;
}

// =============================================================================
// YouTube Settings (categories from backend)
// =============================================================================
function renderYouTube() {
    const connected = _s.youtube_connected;
    const categories = _defaults.youtube_categories || [];
    const catId = String(_s.youtube_category_id || '22');

    if (connected) {
        $('settings-youtube').innerHTML = `
            <div class="yt-card"><div class="yt-card-body">
            <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">
                Canal Conectado</h3>
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
                        `<option value="${c.id}" ${opt(c.id, catId)}>${c.id} - ${escapeHtml(c.name)}</option>`
                    ).join('')}
                </select></div>

            <div style="display:flex;gap:8px;margin-top:16px;">
                <button class="yt-btn yt-btn-primary" id="yt-save">Salvar</button>
                <button class="yt-btn yt-btn-danger" id="yt-disconnect">Desconectar Canal</button>
            </div>
            </div></div>`;

        $('yt-save')?.addEventListener('click', () => save(
            () => api.settings.updateYouTube(_pid, {
                youtube_category_id: val('yt-category'),
            }), 'Configuracao salva!'));

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
        $('settings-youtube').innerHTML = `
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
                        `<option value="${c.id}" ${opt(c.id, catId)}>${c.id} - ${escapeHtml(c.name)}</option>`
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
