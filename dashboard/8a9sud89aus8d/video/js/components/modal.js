// =============================================================================
// MODAL - Reusable modal dialog for the YouTube Automation SPA
// =============================================================================

import { escapeHtml } from '../utils/dom.js';

let _activeModal = null;

const SIZE_MAP = {
    sm: 'yt-modal-sm',
    md: 'yt-modal-md',
    lg: 'yt-modal-lg',
    xl: 'yt-modal-xl',
};

/**
 * Opens a modal dialog.
 * @param {object} options
 * @param {string} options.title
 * @param {'sm'|'md'|'lg'|'xl'} [options.size='md']
 * @param {string} options.body - HTML string for the body
 * @param {string} [options.footer] - HTML string for the footer
 * @param {() => void} [options.onClose]
 * @returns {{ close: () => void, el: HTMLElement }}
 */
export function openModal({ title, size = 'md', body, footer, onClose }) {
    closeModal();

    const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

    const overlay = document.createElement('div');
    overlay.className = 'yt-modal-overlay';
    overlay.innerHTML = `
        <div class="yt-modal ${sizeClass}" role="dialog" aria-modal="true"
             aria-label="${escapeHtml(title)}">
            <div class="yt-modal-header">
                <h3 class="yt-modal-title">${escapeHtml(title)}</h3>
                <button class="yt-modal-close" aria-label="Fechar">
                    &#10005;
                </button>
            </div>
            <div class="yt-modal-body">${body}</div>
            ${footer ? `<div class="yt-modal-footer">${footer}</div>` : ''}
        </div>`;

    document.body.appendChild(overlay);

    const modalEl = overlay.querySelector('.yt-modal');
    const closeBtn = overlay.querySelector('.yt-modal-close');

    const close = () => {
        if (_activeModal === handle) {
            _activeModal = null;
        }
        overlay.remove();
        document.removeEventListener('keydown', _onKeyDown);
        if (typeof onClose === 'function') {
            onClose();
        }
    };

    const handle = { close, el: modalEl };
    _activeModal = handle;

    // Close on X button
    closeBtn.addEventListener('click', close);

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            close();
        }
    });

    // Close on ESC
    function _onKeyDown(e) {
        if (e.key === 'Escape') {
            close();
        }
    }
    document.addEventListener('keydown', _onKeyDown);

    // Focus the modal for accessibility
    modalEl.setAttribute('tabindex', '-1');
    modalEl.focus();

    return handle;
}

/**
 * Closes the currently active modal, if any.
 */
export function closeModal() {
    if (_activeModal) {
        _activeModal.close();
        _activeModal = null;
    }
}
