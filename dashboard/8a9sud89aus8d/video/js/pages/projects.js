// =============================================================================
// PAGE: projects - Lista de projetos
// All config lists (niches, styles, tones, etc.) loaded from GET /config/defaults
// =============================================================================

import { openModal, closeModal } from '../components/modal.js';
import { escapeHtml } from '../utils/dom.js';

const api = window.ytApi;
const toast = window.ytToast;
const router = window.ytRouter;

// Cached config defaults (loaded once, reused across wizard opens)
let _configDefaults = null;

// -----------------------------------------------------------------------------
// Page loader
// -----------------------------------------------------------------------------
window.ytRegisterPage('projects', async () => {
    const grid = document.getElementById('projects-grid');
    const loading = document.getElementById('projects-loading');
    const empty = document.getElementById('projects-empty');

    document.getElementById('btn-new-project')
        ?.addEventListener('click', openNewProjectWizard);

    loading.style.display = 'block';
    grid.style.display = 'none';
    empty.style.display = 'none';

    try {
        const projects = await api.projects.list();
        loading.style.display = 'none';

        if (!projects || projects.length === 0) {
            empty.style.display = 'block';
            empty.innerHTML = `
                <div class="yt-empty-state">
                    <div class="yt-empty-state-icon">&#128193;</div>
                    <div class="yt-empty-state-message">
                        Nenhum projeto encontrado. Crie seu primeiro projeto!
                    </div>
                    <button class="yt-btn yt-btn-primary yt-empty-state-action"
                            id="btn-empty-new">+ Novo Projeto</button>
                </div>`;
            document.getElementById('btn-empty-new')
                ?.addEventListener('click', openNewProjectWizard);
            return;
        }

        grid.style.display = '';
        grid.innerHTML = projects.map(renderCard).join('');
        grid.querySelectorAll('[data-project-id]').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-project')) return;
                router.navigate(`projects/${card.dataset.projectId}/sources`);
            });
        });

        grid.querySelectorAll('.btn-delete-project').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.deleteId;
                const card = btn.closest('.yt-card');
                const name = card?.querySelector('.yt-card-title')?.textContent || 'este projeto';
                if (!confirm(`Tem certeza que deseja deletar "${name}"? Esta acao nao pode ser desfeita.`)) return;
                try {
                    await api.projects.delete(id);
                    toast('Projeto deletado!', 'success');
                    card?.remove();
                    if (!grid.querySelector('.yt-card')) {
                        grid.style.display = 'none';
                        empty.style.display = 'block';
                        empty.innerHTML = `
                            <div class="yt-empty-state">
                                <div class="yt-empty-state-icon">&#128193;</div>
                                <div class="yt-empty-state-message">
                                    Nenhum projeto encontrado. Crie seu primeiro projeto!
                                </div>
                                <button class="yt-btn yt-btn-primary yt-empty-state-action"
                                        id="btn-empty-new">+ Novo Projeto</button>
                            </div>`;
                        document.getElementById('btn-empty-new')
                            ?.addEventListener('click', openNewProjectWizard);
                    }
                } catch (err) {
                    toast('Erro ao deletar: ' + err.message, 'error');
                }
            });
        });
    } catch (err) {
        loading.style.display = 'none';
        toast('Erro ao carregar projetos: ' + err.message, 'error');
    }
});

// -----------------------------------------------------------------------------
// Card rendering
// -----------------------------------------------------------------------------
function renderCard(p) {
    const name = escapeHtml(p.name || 'Sem nome');
    const niche = escapeHtml(p.niche || '--');
    const counts = p.counts || {};
    const topics = counts.topics ?? p.topicCount ?? p.topic_count ?? 0;
    const videos = counts.videos_ready ?? p.videoCount ?? p.video_count ?? 0;
    const stage = p.status || p.pipeline_status || 'idle';
    const badge = stageBadge(stage);

    return `
        <div class="yt-card yt-card-clickable" data-project-id="${p.id}">
            <div class="yt-card-header">
                <h3 class="yt-card-title">${name}</h3>
                <div style="display:flex;align-items:center;gap:8px;">
                    ${badge}
                    <button class="yt-btn-icon btn-delete-project" data-delete-id="${p.id}"
                        title="Deletar projeto" style="color:var(--color-danger);font-size:16px;background:none;border:none;cursor:pointer;padding:4px;">
                        &#128465;
                    </button>
                </div>
            </div>
            <div class="yt-card-body">
                <div class="yt-project-meta">&#127909; ${niche}</div>
                <div class="yt-project-stats">
                    <span>${topics} historias</span>
                    <span style="margin-left:12px;">${videos} videos</span>
                </div>
            </div>
        </div>`;
}

function stageBadge(stage) {
    const m = {
        idle: ['Inativo', 'info'], active: ['Ativo', 'success'],
        paused: ['Pausado', 'warning'], error: ['Erro', 'danger'],
    };
    const [label, v] = m[stage] || [stage, 'info'];
    return `<span class="yt-badge yt-badge-${v}">${label}</span>`;
}

// =============================================================================
// New Project Wizard (multi-step modal, all config from backend)
// =============================================================================
async function openNewProjectWizard() {
    // Load config defaults from backend (cached after first load)
    if (!_configDefaults) {
        try {
            _configDefaults = await api.config.defaults();
        } catch (err) {
            toast('Erro ao carregar configuracoes: ' + err.message, 'error');
            return;
        }
    }

    const cfg = _configDefaults;
    const sd = cfg.storytelling_defaults || {};
    let step = 1;
    const state = {
        // Step 1: Basico
        name: '', niche: '', description: '', language: 'pt-BR',
        // Step 2: Storytelling (defaults from backend)
        storytelling_style: 'dramatic', narration_tone: 'dramatic',
        target_duration_minutes: 30, min_richness_score: 7,
        narrative_template: sd.narrative_template || '',
        emotional_triggers: sd.emotional_triggers || '',
        // Step 3: Visual + Publicacao
        visual_style: '', brand_colors: '',
        thumbnail_font: 'Inter Bold', thumbnail_font_size: 72,
        thumbnail_text_color: '#FFFFFF', thumbnail_stroke_color: '#000000',
        thumbnail_stroke_width: 2,
        transition_type: 'crossfade', transition_duration_ms: 500,
        ken_burns_intensity: 0.05, background_music_volume: 0.15,
        max_publications_per_day: 1,
        publication_times: ['14:00'],
        publication_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
        publication_timezone: 'America/Sao_Paulo',
        default_visibility: 'public', auto_publish: false,
    };

    function render() {
        const modal = openModal({
            title: `Novo Projeto — Passo ${step} de 3`,
            size: 'lg',
            body: renderStep(),
            footer: renderFooter(),
        });

        bindStepEvents(modal);
        return modal;
    }

    function renderStep() {
        if (step === 1) return renderStep1();
        if (step === 2) return renderStep2();
        return renderStep3();
    }

    function renderFooter() {
        const prev = step > 1
            ? `<button class="yt-btn yt-btn-ghost" id="wiz-prev">Voltar</button>` : '';
        const next = step < 3
            ? `<button class="yt-btn yt-btn-primary" id="wiz-next">Proximo</button>`
            : `<button class="yt-btn yt-btn-primary" id="wiz-create">Criar Projeto</button>`;
        return `
            <button class="yt-btn yt-btn-ghost" id="wiz-cancel">Cancelar</button>
            <div style="flex:1;"></div>
            <div style="display:flex;gap:8px;">${prev}${next}</div>`;
    }

    // =========================================================================
    // Step 1: Info basica (niches + languages from backend)
    // =========================================================================
    function renderStep1() {
        const niches = cfg.niches || [];
        const languages = cfg.languages || [];
        const sel = (v) => v === state.niche ? 'selected' : '';
        const selL = (v) => v === state.language ? 'selected' : '';

        return `
            <div style="display:flex;flex-direction:column;gap:16px;">
                <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:4px;">
                    Informacoes basicas do seu canal/projeto de videos.</p>
                <div class="yt-form-group">
                    <label class="yt-label">Nome do Projeto *</label>
                    <input class="yt-input" id="wiz-name" maxlength="100"
                        value="${escapeHtml(state.name)}"
                        placeholder="Ex: Canal de Tecnologia">
                </div>
                <div class="yt-form-row">
                    <div class="yt-form-group"><label class="yt-label">Nicho *</label>
                        <select class="yt-input" id="wiz-niche">
                            <option value="">Selecione o nicho...</option>
                            ${niches.map(n => `<option value="${n.value}" ${sel(n.value)}>${escapeHtml(n.label)}</option>`).join('')}
                        </select></div>
                    <div class="yt-form-group"><label class="yt-label">Idioma</label>
                        <select class="yt-input" id="wiz-language">
                            ${languages.map(l => `<option value="${l.value}" ${selL(l.value)}>${escapeHtml(l.label)}</option>`).join('')}
                        </select></div>
                </div>
                <div class="yt-form-group">
                    <label class="yt-label">Descricao do Canal</label>
                    <textarea class="yt-textarea" id="wiz-desc" rows="3" maxlength="500"
                        placeholder="Sobre o que e seu canal? Qual publico alvo?">${escapeHtml(state.description)}</textarea>
                </div>
            </div>`;
    }

    // =========================================================================
    // Step 2: Storytelling (styles + tones + durations from backend)
    // =========================================================================
    function renderStep2() {
        const styles = cfg.storytelling_styles || [];
        const tones = cfg.narration_tones || [];
        const durations = cfg.duration_targets || [];
        const optS = (v) => v === state.storytelling_style ? 'selected' : '';
        const optT = (v) => v === state.narration_tone ? 'selected' : '';

        return `
            <div style="display:flex;flex-direction:column;gap:16px;">
                <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:4px;">
                    Como suas historias serao contadas. Isso define o tom e estrutura dos roteiros gerados pela IA.</p>
                <div class="yt-form-row">
                    <div class="yt-form-group"><label class="yt-label">Estilo de Narrativa</label>
                        <select class="yt-select" id="wiz-style">
                            ${styles.map(s => `<option value="${s.value}" ${optS(s.value)}>${escapeHtml(s.label)}</option>`).join('')}
                        </select></div>
                    <div class="yt-form-group"><label class="yt-label">Tom da Narracao</label>
                        <select class="yt-select" id="wiz-tone">
                            ${tones.map(t => `<option value="${t.value}" ${optT(t.value)}>${escapeHtml(t.label)}</option>`).join('')}
                        </select></div>
                </div>
                <div class="yt-form-row">
                    <div class="yt-form-group"><label class="yt-label">Duracao Alvo do Video</label>
                        <select class="yt-select" id="wiz-duration">
                            ${durations.map(d => `<option value="${d.value}" ${state.target_duration_minutes <= 40 && d.value === '30-40' ? 'selected' : ''}>${escapeHtml(d.label)}</option>`).join('')}
                        </select></div>
                    <div class="yt-form-group"><label class="yt-label">Richness Score Minimo (0-10)</label>
                        <input class="yt-input" id="wiz-richness" type="number" min="0" max="10"
                            value="${state.min_richness_score}"></div>
                </div>
                <div class="yt-form-group"><label class="yt-label">Template de Narrativa</label>
                    <textarea class="yt-textarea" id="wiz-template" rows="10"
                        placeholder="Estrutura padrao para as historias...">${escapeHtml(state.narrative_template)}</textarea>
                </div>
                <div class="yt-form-group"><label class="yt-label">Gatilhos Emocionais</label>
                    <input class="yt-input" id="wiz-triggers"
                        value="${escapeHtml(state.emotional_triggers)}"
                        placeholder="Ex: curiosidade, surpresa, medo"></div>
            </div>`;
    }

    // =========================================================================
    // Step 3: Visual + Publicacao (transitions, visibilities, timezones from backend)
    // =========================================================================
    function renderStep3() {
        const dayLabels = [
            { key: 'mon', label: 'Seg' }, { key: 'tue', label: 'Ter' },
            { key: 'wed', label: 'Qua' }, { key: 'thu', label: 'Qui' },
            { key: 'fri', label: 'Sex' }, { key: 'sat', label: 'Sab' },
            { key: 'sun', label: 'Dom' },
        ];
        const transitions = cfg.transitions || [];
        const visibilities = cfg.visibilities || [];
        const timezones = cfg.timezones || [];
        const optTr = (v) => v === state.transition_type ? 'selected' : '';
        const optVis = (v) => v === state.default_visibility ? 'selected' : '';
        const optTz = (v) => v === state.publication_timezone ? 'selected' : '';

        return `
            <div style="display:flex;flex-direction:column;gap:16px;">
                <p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:4px;">
                    Aparencia dos videos e frequencia de publicacao.</p>

                <h4 style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-text);margin:0;">
                    Identidade Visual</h4>
                <div class="yt-form-row">
                    <div class="yt-form-group"><label class="yt-label">Estilo Visual</label>
                        <input class="yt-input" id="wiz-vis-style"
                            value="${escapeHtml(state.visual_style)}"
                            placeholder="Ex: cinematografico, fotorrealista"></div>
                    <div class="yt-form-group"><label class="yt-label">Cores da Marca</label>
                        <input class="yt-input" id="wiz-vis-colors"
                            value="${escapeHtml(state.brand_colors)}"
                            placeholder="Ex: #FF5733, #1A1A2E"></div>
                </div>
                <div class="yt-form-row">
                    <div class="yt-form-group"><label class="yt-label">Transicao</label>
                        <select class="yt-select" id="wiz-transition">
                            ${transitions.map(t => `<option value="${t.value}" ${optTr(t.value)}>${escapeHtml(t.label)}</option>`).join('')}
                        </select></div>
                    <div class="yt-form-group"><label class="yt-label">Duracao Transicao (ms)</label>
                        <input class="yt-input" id="wiz-trans-dur" type="number" min="0" max="3000"
                            value="${state.transition_duration_ms}"></div>
                    <div class="yt-form-group"><label class="yt-label">Ken Burns</label>
                        <input class="yt-input" id="wiz-kb" type="number" step="0.01" min="0" max="0.20"
                            value="${state.ken_burns_intensity}"></div>
                </div>

                <hr style="border:none;border-top:1px solid var(--color-border);margin:4px 0;">
                <h4 style="font-size:var(--font-size-sm);font-weight:600;color:var(--color-text);margin:0;">
                    Agenda de Publicacao</h4>
                <div class="yt-form-row">
                    <div class="yt-form-group"><label class="yt-label">Frequencia</label>
                        <select class="yt-select" id="wiz-freq">
                            ${[1, 2, 3, 4, 5].map(n =>
                                `<option value="${n}" ${n === state.max_publications_per_day ? 'selected' : ''}>${n}x por dia</option>`
                            ).join('')}
                        </select></div>
                    <div class="yt-form-group"><label class="yt-label">Fuso Horario</label>
                        <select class="yt-select" id="wiz-tz">
                            ${timezones.map(tz => `<option value="${tz.value}" ${optTz(tz.value)}>${escapeHtml(tz.label)}</option>`).join('')}
                        </select></div>
                </div>

                <div class="yt-form-group">
                    <label class="yt-label">Horarios</label>
                    <div id="wiz-times-container"></div>
                </div>

                <div class="yt-form-group">
                    <label class="yt-label">Dias da Semana</label>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        ${dayLabels.map(d => `
                            <label style="display:flex;align-items:center;gap:4px;padding:8px 12px;
                                background:var(--color-bg-elevated);border:1px solid var(--color-border);
                                border-radius:var(--radius-md);cursor:pointer;font-size:var(--font-size-sm);">
                                <input type="checkbox" class="wiz-day" value="${d.key}"
                                    ${state.publication_days.includes(d.key) ? 'checked' : ''}> ${d.label}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="yt-form-row">
                    <div class="yt-form-group"><label class="yt-label">Visibilidade Padrao</label>
                        <select class="yt-select" id="wiz-vis">
                            ${visibilities.map(v => `<option value="${v.value}" ${optVis(v.value)}>${escapeHtml(v.label)}</option>`).join('')}
                        </select></div>
                    <div class="yt-form-group">
                        <label class="yt-label" style="display:flex;align-items:center;gap:8px;margin-top:24px;">
                            <input type="checkbox" id="wiz-auto" ${state.auto_publish ? 'checked' : ''}>
                            Publicacao Automatica
                        </label>
                    </div>
                </div>
            </div>`;
    }

    // =========================================================================
    // Save state from current step fields before navigating
    // =========================================================================
    function saveStepState(modal) {
        const q = (id) => modal.el.querySelector(`#${id}`);
        const v = (id) => q(id)?.value?.trim() ?? '';

        if (step === 1) {
            state.name = v('wiz-name');
            state.niche = v('wiz-niche');
            state.description = v('wiz-desc');
            state.language = v('wiz-language');
        } else if (step === 2) {
            state.storytelling_style = v('wiz-style');
            state.narration_tone = v('wiz-tone');
            state.target_duration_minutes = Number(v('wiz-duration')?.split('-')[0]) || 30;
            state.min_richness_score = Number(v('wiz-richness')) || 7;
            state.narrative_template = v('wiz-template');
            state.emotional_triggers = v('wiz-triggers');
        } else if (step === 3) {
            state.visual_style = v('wiz-vis-style');
            state.brand_colors = v('wiz-vis-colors');
            state.transition_type = v('wiz-transition');
            state.transition_duration_ms = Number(v('wiz-trans-dur')) || 500;
            state.ken_burns_intensity = Number(v('wiz-kb')) || 0.05;
            state.max_publications_per_day = Number(v('wiz-freq')) || 1;
            state.publication_timezone = v('wiz-tz');
            state.default_visibility = v('wiz-vis');
            state.auto_publish = q('wiz-auto')?.checked || false;
            state.publication_times = [...modal.el.querySelectorAll('.wiz-time-slot')].map(i => i.value);
            state.publication_days = [...modal.el.querySelectorAll('.wiz-day:checked')].map(c => c.value);
        }
    }

    // =========================================================================
    // Bind step-specific events
    // =========================================================================
    function bindStepEvents(modal) {
        modal.el.querySelector('#wiz-cancel')?.addEventListener('click', () => modal.close());

        modal.el.querySelector('#wiz-prev')?.addEventListener('click', () => {
            saveStepState(modal);
            step--;
            modal.close();
            render();
        });

        modal.el.querySelector('#wiz-next')?.addEventListener('click', () => {
            if (!validateStep(modal)) return;
            saveStepState(modal);
            step++;
            modal.close();
            render();
        });

        modal.el.querySelector('#wiz-create')?.addEventListener('click', async () => {
            saveStepState(modal);
            await createProject(modal);
        });

        // Step 3: dynamic time slots
        if (step === 3) {
            renderWizTimeSlots(modal);
            modal.el.querySelector('#wiz-freq')?.addEventListener('change', () => {
                renderWizTimeSlots(modal);
            });
        }
    }

    function renderWizTimeSlots(modal) {
        const container = modal.el.querySelector('#wiz-times-container');
        if (!container) return;
        const freq = Number(modal.el.querySelector('#wiz-freq')?.value) || 1;
        let html = '<div style="display:flex;gap:12px;flex-wrap:wrap;">';
        for (let i = 0; i < freq; i++) {
            const time = state.publication_times[i] || `${String(10 + i * 4).padStart(2, '0')}:00`;
            html += `<div class="yt-form-group" style="flex:0 0 auto;min-width:120px;">
                <label class="yt-label">Horario ${i + 1}</label>
                <input class="yt-input wiz-time-slot" type="time" value="${time}">
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    // =========================================================================
    // Validation
    // =========================================================================
    function validateStep(modal) {
        const v = (id) => modal.el.querySelector(`#${id}`)?.value?.trim() ?? '';
        if (step === 1) {
            if (!v('wiz-name')) { toast('Nome do projeto e obrigatorio', 'error'); return false; }
            if (!v('wiz-niche')) { toast('Selecione um nicho', 'error'); return false; }
        }
        return true;
    }

    // =========================================================================
    // Create project + update settings
    // =========================================================================
    async function createProject(modal) {
        try {
            const btn = modal.el.querySelector('#wiz-create');
            if (btn) { btn.disabled = true; btn.textContent = 'Criando...'; }

            const project = await api.projects.create({
                name: state.name,
                niche: state.niche,
                description: state.description,
                language: state.language,
            });

            const pid = project.id;

            await api.settings.updateStorytelling(pid, {
                storytelling_style: state.storytelling_style,
                narration_tone: state.narration_tone,
                target_duration_minutes: state.target_duration_minutes,
                min_richness_score: state.min_richness_score,
                language: state.language,
                narrative_template: state.narrative_template || null,
                emotional_triggers: state.emotional_triggers || null,
            });

            await api.settings.updateVisualIdentity(pid, {
                visual_style: state.visual_style || null,
                brand_colors: state.brand_colors || null,
                thumbnail_font: state.thumbnail_font,
                thumbnail_font_size: state.thumbnail_font_size,
                thumbnail_text_color: state.thumbnail_text_color,
                thumbnail_stroke_color: state.thumbnail_stroke_color,
                thumbnail_stroke_width: state.thumbnail_stroke_width,
                transition_type: state.transition_type,
                transition_duration_ms: state.transition_duration_ms,
                ken_burns_intensity: state.ken_burns_intensity,
                background_music_volume: state.background_music_volume,
            });

            const durVal = `${state.target_duration_minutes}-${state.target_duration_minutes + 10}`;
            await api.settings.updateContentEngine(pid, {
                duration_target: durVal,
                publications_per_day: state.max_publications_per_day,
                buffer_size: 7,
                max_gen_per_day: 5,
                min_richness: state.min_richness_score,
            });

            await api.settings.updatePublishing(pid, {
                max_publications_per_day: state.max_publications_per_day,
                publication_times: state.publication_times,
                publication_days: state.publication_days,
                publication_timezone: state.publication_timezone,
                default_visibility: state.default_visibility,
                auto_publish: state.auto_publish,
            });

            toast('Projeto criado com sucesso!', 'success');
            modal.close();
            router.navigate(`projects/${pid}/sources`);
        } catch (err) {
            toast('Erro ao criar projeto: ' + err.message, 'error');
            const btn = modal.el.querySelector('#wiz-create');
            if (btn) { btn.disabled = false; btn.textContent = 'Criar Projeto'; }
        }
    }

    render();
}
