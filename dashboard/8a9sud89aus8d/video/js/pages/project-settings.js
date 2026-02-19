// =============================================================================
// PAGE: project-settings - Configuracao do YouTube
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
        $('settings-content').innerHTML = `
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
        $('settings-content').innerHTML = `
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
