// =============================================================================
// FILE UPLOAD - Drag-and-drop + click-to-browse file upload component
// =============================================================================

import { escapeHtml } from '../utils/dom.js';

const DEFAULT_MAX_SIZE_MB = 10;

/**
 * Initializes a file upload drop zone inside a container.
 *
 * @param {string} containerId - ID of the wrapper element
 * @param {object} options
 * @param {string} [options.accept] - File accept attribute (e.g. ".pdf,.txt")
 * @param {number} [options.maxSize] - Max file size in bytes
 * @param {(file: File) => void} options.onFile - Callback when file is selected
 */
export function initFileUpload(containerId, { accept, maxSize, onFile }) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const maxBytes = maxSize || DEFAULT_MAX_SIZE_MB * 1024 * 1024;
    const acceptStr = accept || '*';

    container.innerHTML = `
        <div class="yt-file-upload" id="${containerId}-dropzone">
            <div class="yt-file-upload-icon">&#128193;</div>
            <div class="yt-file-upload-text">
                Arraste um arquivo ou clique para selecionar
            </div>
            <div class="yt-file-upload-hint">
                Max ${_formatSize(maxBytes)}
                ${accept ? ` | Formatos: ${escapeHtml(accept)}` : ''}
            </div>
            <input type="file" id="${containerId}-input"
                   accept="${escapeHtml(acceptStr)}"
                   style="display: none;">
            <div class="yt-file-upload-info" id="${containerId}-info"
                 style="display: none;"></div>
        </div>`;

    const dropzone = document.getElementById(`${containerId}-dropzone`);
    const fileInput = document.getElementById(`${containerId}-input`);
    const infoEl = document.getElementById(`${containerId}-info`);

    // Click to browse
    dropzone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) _handleFile(file);
    });

    // Drag events
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) _handleFile(file);
    });

    function _handleFile(file) {
        if (file.size > maxBytes) {
            infoEl.style.display = 'block';
            infoEl.style.color = 'var(--color-accent)';
            infoEl.textContent = `Arquivo excede o limite de ${_formatSize(maxBytes)}`;
            return;
        }

        infoEl.style.display = 'block';
        infoEl.style.color = '';
        infoEl.textContent = `${escapeHtml(file.name)} (${_formatSize(file.size)})`;

        if (typeof onFile === 'function') {
            onFile(file);
        }
    }
}

/**
 * Formats bytes into a human-readable string.
 */
function _formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
