// =============================================================================
// PAGE: sources - Fontes de conteudo do projeto
// =============================================================================
import { openModal } from '../components/modal.js';
import { renderSourceTypeBadge } from '../components/badge.js';
import { initFileUpload } from '../components/file-upload.js';
import { escapeHtml } from '../utils/dom.js';
import { formatDate, formatWords } from '../utils/helpers.js';

const api = window.ytApi;
const toast = window.ytToast;
let _pid = null;

function statusBadge(status) {
    const m = { pending:['Pendente','info'], processing:['Processando','warning'],
                processed:['Processado','success'], error:['Erro','danger'] };
    const [l,v] = m[status] || [status,'info'];
    return `<span class="yt-badge yt-badge-${v}">${l}</span>`;
}

window.ytRegisterPage('sources', async (params) => {
    _pid = params.projectId;
    document.getElementById('btn-add-url')?.addEventListener('click', openAddUrl);
    document.getElementById('btn-add-yt')?.addEventListener('click', openAddYoutube);
    document.getElementById('btn-add-text')?.addEventListener('click', openAddText);
    document.getElementById('btn-add-pdf')?.addEventListener('click', openAddPdf);
    await loadSources();
});

async function loadSources() {
    const loading = document.getElementById('sources-loading');
    const empty = document.getElementById('sources-empty');
    const wrap = document.getElementById('sources-table-wrap');
    const tbody = document.getElementById('sources-tbody');
    loading.style.display = 'block'; empty.style.display = 'none'; wrap.style.display = 'none';
    try {
        const sources = await api.sources.list(_pid);
        loading.style.display = 'none';
        if (!sources || sources.length === 0) {
            empty.style.display = 'block';
            empty.innerHTML = `<div class="yt-empty-state"><div class="yt-empty-state-icon">&#128218;</div>
                <div class="yt-empty-state-message">Nenhuma fonte adicionada. Adicione URLs, videos, textos ou PDFs.</div></div>`;
            return;
        }
        wrap.style.display = '';
        tbody.innerHTML = sources.map(s => `
            <tr data-source-id="${s.id}" class="yt-table-row-clickable">
                <td>${escapeHtml(s.title||s.url||'Sem titulo')}</td>
                <td>${renderSourceTypeBadge(s.type)}</td><td>${statusBadge(s.status)}</td>
                <td style="text-align:right;">${formatWords(s.word_count||s.wordCount)}</td>
                <td>${formatDate(s.created_at||s.createdAt)}</td></tr>`).join('');
        tbody.querySelectorAll('[data-source-id]').forEach(row => {
            row.addEventListener('click', () => openSourceDetail(row.dataset.sourceId));
        });
    } catch (err) { loading.style.display='none'; toast('Erro ao carregar fontes: '+err.message,'error'); }
}

async function openSourceDetail(id) {
    try {
        const s = await api.sources.get(_pid, id);
        const body = `
            <div class="yt-form-group"><label class="yt-label">Titulo</label><p>${escapeHtml(s.title||'--')}</p></div>
            <div class="yt-form-group"><label class="yt-label">Tipo / Status</label>
                <p>${renderSourceTypeBadge(s.type)} ${statusBadge(s.status)}</p></div>
            <div class="yt-form-group"><label class="yt-label">Conteudo</label>
                <pre style="max-height:300px;overflow:auto;white-space:pre-wrap;font-size:13px;
                padding:12px;background:var(--color-bg-tertiary);border-radius:8px;">${escapeHtml(s.content||s.raw_content||'Nao disponivel')}</pre></div>`;
        const footer = `<button class="yt-btn yt-btn-danger yt-btn-sm" id="src-del">Excluir</button>`;
        const modal = openModal({ title: s.title||'Detalhe da Fonte', size:'lg', body, footer });
        modal.el.querySelector('#src-del')?.addEventListener('click', async () => {
            try { await api.sources.delete(_pid,id); toast('Fonte excluida!','success'); modal.close(); await loadSources(); }
            catch (e) { toast('Erro: '+e.message,'error'); }
        });
    } catch (err) { toast('Erro ao carregar fonte: '+err.message,'error'); }
}

function addModal(title, bodyHtml, onSave) {
    const footer = `<button class="yt-btn yt-btn-ghost" id="am-cancel">Cancelar</button>
        <button class="yt-btn yt-btn-primary" id="am-save">Adicionar</button>`;
    const modal = openModal({ title, size:'md', body: bodyHtml, footer });
    modal.el.querySelector('#am-cancel')?.addEventListener('click', () => modal.close());
    modal.el.querySelector('#am-save')?.addEventListener('click', () => onSave(modal));
    return modal;
}

function openAddUrl() {
    addModal('Adicionar URL', `
        <div class="yt-form-group"><label class="yt-label">URL *</label>
            <input class="yt-input" id="src-url" placeholder="https://exemplo.com/artigo"></div>
        <div class="yt-form-group"><label class="yt-label">Titulo</label>
            <input class="yt-input" id="src-url-title" placeholder="Titulo opcional"></div>`,
    async (modal) => {
        const url = modal.el.querySelector('#src-url')?.value?.trim();
        if (!url) { toast('URL e obrigatoria','error'); return; }
        const title = modal.el.querySelector('#src-url-title')?.value?.trim();
        try { await api.sources.addUrl(_pid,{url,title}); toast('URL adicionada!','success'); modal.close(); await loadSources(); }
        catch (e) { toast('Erro: '+e.message,'error'); }
    });
}

function openAddYoutube() {
    addModal('Adicionar YouTube', `
        <div class="yt-form-group"><label class="yt-label">URL do YouTube *</label>
            <input class="yt-input" id="src-yt-url" placeholder="https://youtube.com/watch?v=..."></div>`,
    async (modal) => {
        const url = modal.el.querySelector('#src-yt-url')?.value?.trim();
        if (!url) { toast('URL do YouTube e obrigatoria','error'); return; }
        try { await api.sources.addYoutube(_pid,{url}); toast('YouTube adicionado!','success'); modal.close(); await loadSources(); }
        catch (e) { toast('Erro: '+e.message,'error'); }
    });
}

function openAddText() {
    addModal('Adicionar Texto', `
        <div class="yt-form-group"><label class="yt-label">Titulo *</label>
            <input class="yt-input" id="src-txt-title" placeholder="Titulo do conteudo"></div>
        <div class="yt-form-group"><label class="yt-label">Conteudo *</label>
            <textarea class="yt-textarea" id="src-txt-content" rows="8" placeholder="Cole o texto aqui..."></textarea></div>`,
    async (modal) => {
        const title = modal.el.querySelector('#src-txt-title')?.value?.trim();
        const content = modal.el.querySelector('#src-txt-content')?.value?.trim();
        if (!title||!content) { toast('Titulo e conteudo sao obrigatorios','error'); return; }
        try { await api.sources.addText(_pid,{title,content}); toast('Texto adicionado!','success'); modal.close(); await loadSources(); }
        catch (e) { toast('Erro: '+e.message,'error'); }
    });
}

function openAddPdf() {
    let _file = null;
    const modal = addModal('Adicionar PDF', `
        <div class="yt-form-group"><label class="yt-label">Titulo</label>
            <input class="yt-input" id="src-pdf-title" placeholder="Titulo opcional"></div>
        <div class="yt-form-group"><label class="yt-label">Arquivo PDF *</label>
            <div id="src-pdf-upload"></div></div>`,
    async (m) => {
        if (!_file) { toast('Selecione um arquivo PDF','error'); return; }
        const title = m.el.querySelector('#src-pdf-title')?.value?.trim();
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await api.sources.addPdf(_pid,{ title:title||_file.name, filename:_file.name, content:reader.result.split(',')[1] });
                toast('PDF adicionado!','success'); m.close(); await loadSources();
            } catch (e) { toast('Erro: '+e.message,'error'); }
        };
        reader.readAsDataURL(_file);
    });
    initFileUpload('src-pdf-upload', { accept:'.pdf', onFile:(f) => { _file=f; } });
}
