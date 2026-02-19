// =============================================================================
// PAGE: project-settings - Configuracao do YouTube + Content Engine
// =============================================================================
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
        _s = await api.settings.get(_pid);
        $('settings-loading').style.display = 'none';
        $('settings-content').style.display = '';
        renderContentEngine();
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
                // Reload settings to show connected state
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
                <option value="30-40" ${opt('30-40',durTarget)}>30-40 minutos</option>
                <option value="40-50" ${opt('40-50',durTarget)}>40-50 minutos</option>
                <option value="50-60" ${opt('50-60',durTarget)}>50-60 minutos</option>
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
// Storytelling Settings
// =============================================================================
function renderStorytelling() {
    const container = $('settings-storytelling');
    if (!container) return;

    const DEF_HOOK = 'O adversario ri, zomba ou duvida publicamente. Cena de humilhacao ou desprezo que estabelece a tensao inicial. A abertura DEVE conectar tematicamente com a resolucao final — o espectador precisa sentir que voltou ao ponto de partida, mas agora com a perspectiva invertida.';
    const DEF_CONTEXT = 'Background historico detalhado. O que estava em jogo, quem eram os protagonistas, qual era o cenario geopolitico/social. Construir o mundo para que o espectador entenda a gravidade do conflito e se importe com o desfecho.';
    const DEF_DEVELOPMENT = 'Jornada do protagonista com dificuldades reais, momentos de duvida e quase-desistencia. Incluir detalhes humanos (conversas, decisoes dificeis, sacrificios). O espectador precisa torcer ativamente pelo protagonista.';
    const DEF_TWIST = 'O momento em que as mesas viram. O adversario percebe que subestimou. Detalhar a reacao, o choque, a mudanca de poder. Este e o climax emocional — usar linguagem cinematica e ritmo acelerado.';
    const DEF_RESOLUTION = 'Vitoria completa e definitiva. Contraste explicito entre a zombaria inicial e o resultado final. Fechar o arco narrativo conectando diretamente com o hook de abertura. Deixar o espectador com sensacao de satisfacao e justica.';
    const DEF_TITLE = '{adversary} ri de {protagonist} sobre {topic} -- {consequence}';

    const hook = _s.storytelling_hook || _s.storytellingHook || DEF_HOOK;
    const context = _s.storytelling_context || _s.storytellingContext || DEF_CONTEXT;
    const development = _s.storytelling_development || _s.storytellingDevelopment || DEF_DEVELOPMENT;
    const twist = _s.storytelling_twist || _s.storytellingTwist || DEF_TWIST;
    const resolution = _s.storytelling_resolution || _s.storytellingResolution || DEF_RESOLUTION;
    const titleTemplate = _s.storytelling_title_template || _s.storytellingTitleTemplate || DEF_TITLE;
    const narrationTone = _s.storytelling_narration_tone || _s.storytellingNarrationTone || 'dramatic';

    const triggers = _s.storytelling_triggers || _s.storytellingTriggers || [];
    const allTriggers = [
        { key: 'patriotismo', label: 'Patriotismo / Orgulho Nacional' },
        { key: 'underdog', label: 'Underdog / Subestimado' },
        { key: 'vinganca', label: 'Vinganca / Justica Poetica' },
        { key: 'curiosidade', label: 'Curiosidade / Misterio' },
        { key: 'raiva_justa', label: 'Raiva Justa' },
    ];

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
                <option value="dramatic" ${opt('dramatic',narrationTone)}>Dramatico</option>
                <option value="documentary" ${opt('documentary',narrationTone)}>Documentario</option>
                <option value="suspense" ${opt('suspense',narrationTone)}>Suspense</option>
                <option value="epic" ${opt('epic',narrationTone)}>Epico</option>
                <option value="conversational" ${opt('conversational',narrationTone)}>Conversacional</option>
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
// AI Providers (read-only info)
// =============================================================================
function renderAIProviders() {
    const container = $('settings-ai-info');
    if (!container) return;

    const providers = [
        { func: 'Texto / Roteiro (LLM)', provider: 'Gemini', detail: 'Google Gemini via GEMINI_API_KEY' },
        { func: 'Narracao (TTS)', provider: 'ElevenLabs', detail: 'ElevenLabs via ELEVENLABS_API_KEY' },
        { func: 'Imagem (Visuais)', provider: 'Replicate', detail: 'prunaai/z-image-turbo — 1024x1024, 8 steps' },
        { func: 'Video (Cenas Animadas)', provider: 'Replicate', detail: 'google/veo-3-fast — 720p' },
        { func: 'Pesquisa Web', provider: 'Serper', detail: 'serper.dev via SERPER_API_KEY' },
        { func: 'Montagem Final', provider: 'FFmpeg', detail: 'Processamento local' },
    ];

    const rows = providers.map(p => `
        <tr>
            <td style="font-weight:500;">${escapeHtml(p.func)}</td>
            <td><span class="yt-badge yt-badge-blue">${escapeHtml(p.provider)}</span></td>
            <td style="color:var(--color-text-secondary);font-size:var(--font-size-sm);">${escapeHtml(p.detail)}</td>
        </tr>`).join('');

    container.innerHTML = `
        <div class="yt-card" style="margin-bottom:24px;"><div class="yt-card-body">
        <h3 style="margin-bottom:16px;font-size:var(--font-size-base);font-weight:600;">
            Provedores de IA</h3>
        <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:16px;">
            Servicos utilizados em cada etapa do pipeline de geracao. Configurados via variaveis de ambiente.</p>
        <table class="yt-table">
            <thead><tr><th>Funcao</th><th>Provedor</th><th>Detalhes</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        </div></div>`;
}

// =============================================================================
// YouTube Settings
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
                        `<option value="${c.id}" ${opt(c.id, catId)}>${c.id} - ${c.name}</option>`
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
