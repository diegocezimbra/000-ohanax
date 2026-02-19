// =============================================================================
// PAGE: projects - Lista de projetos
// =============================================================================

import { openModal, closeModal } from '../components/modal.js';
import { escapeHtml } from '../utils/dom.js';

const api = window.ytApi;
const toast = window.ytToast;
const router = window.ytRouter;

// -----------------------------------------------------------------------------
// Page loader
// -----------------------------------------------------------------------------
window.ytRegisterPage('projects', async () => {
    const grid = document.getElementById('projects-grid');
    const loading = document.getElementById('projects-loading');
    const empty = document.getElementById('projects-empty');

    document.getElementById('btn-new-project')
        ?.addEventListener('click', openNewProjectModal);

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
                ?.addEventListener('click', openNewProjectModal);
            return;
        }

        grid.style.display = '';
        grid.innerHTML = projects.map(renderCard).join('');
        grid.querySelectorAll('[data-project-id]').forEach(card => {
            card.addEventListener('click', () => {
                router.navigate(`projects/${card.dataset.projectId}/sources`);
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
    const channel = escapeHtml(p.channelName || p.channel_name || '--');
    const topics = p.topicCount ?? p.topic_count ?? 0;
    const videos = p.videoCount ?? p.video_count ?? 0;
    const stage = p.pipelineStatus || p.pipeline_status || 'idle';
    const badge = stageBadge(stage);

    return `
        <div class="yt-card yt-card-clickable" data-project-id="${p.id}">
            <div class="yt-card-header">
                <h3 class="yt-card-title">${name}</h3>
                ${badge}
            </div>
            <div class="yt-card-body">
                <div class="yt-project-meta">&#127909; ${channel}</div>
                <div class="yt-project-stats">
                    <span>${topics} topicos</span>
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

// -----------------------------------------------------------------------------
// New project modal
// -----------------------------------------------------------------------------
function openNewProjectModal() {
    const body = `
        <div class="yt-form-group">
            <label class="yt-label">Nome do Projeto *</label>
            <input class="yt-input" id="proj-name" maxlength="100"
                   placeholder="Ex: Canal de Tecnologia">
        </div>
        <div class="yt-form-group">
            <label class="yt-label">Nome do Canal</label>
            <input class="yt-input" id="proj-channel" maxlength="100"
                   placeholder="Ex: TechExplica">
        </div>
        <div class="yt-form-group">
            <label class="yt-label">Descricao</label>
            <textarea class="yt-textarea" id="proj-desc" rows="3"
                      maxlength="500" placeholder="Breve descricao do projeto..."></textarea>
        </div>`;

    const footer = `
        <button class="yt-btn yt-btn-ghost" id="proj-cancel">Cancelar</button>
        <button class="yt-btn yt-btn-primary" id="proj-save">Criar Projeto</button>`;

    const modal = openModal({ title: 'Novo Projeto', size: 'md', body, footer });

    modal.el.querySelector('#proj-cancel')?.addEventListener('click', () => modal.close());
    modal.el.querySelector('#proj-save')?.addEventListener('click', async () => {
        const name = modal.el.querySelector('#proj-name')?.value?.trim();
        const channelName = modal.el.querySelector('#proj-channel')?.value?.trim();
        const description = modal.el.querySelector('#proj-desc')?.value?.trim();

        if (!name) { toast('Nome do projeto e obrigatorio', 'error'); return; }

        try {
            await api.projects.create({ name, channelName, description });
            toast('Projeto criado com sucesso!', 'success');
            modal.close();
            router.navigate('projects');
        } catch (err) {
            toast('Erro ao criar projeto: ' + err.message, 'error');
        }
    });
}
