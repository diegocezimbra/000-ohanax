// =============================================================================
// CONFIRM DIALOG - Confirmation prompt using modal
// =============================================================================

import { openModal } from './modal.js';
import { escapeHtml } from '../utils/dom.js';

/**
 * Shows a confirmation dialog and returns a Promise<boolean>.
 * Resolves true on "Sim", false on "Cancelar".
 *
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirmDialog(title, message) {
    return new Promise((resolve) => {
        const body = `<p style="color: var(--color-text-secondary); line-height: 1.6;">
            ${escapeHtml(message)}
        </p>`;

        const footer = `
            <button class="btn btn-secondary btn-small" id="yt-confirm-cancel">
                Cancelar
            </button>
            <button class="btn btn-primary btn-small" id="yt-confirm-yes">
                Sim
            </button>`;

        let resolved = false;

        const modal = openModal({
            title,
            size: 'sm',
            body,
            footer,
            onClose: () => {
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            },
        });

        const cancelBtn = modal.el.querySelector('#yt-confirm-cancel');
        const yesBtn = modal.el.querySelector('#yt-confirm-yes');

        cancelBtn.addEventListener('click', () => {
            resolved = true;
            modal.close();
            resolve(false);
        });

        yesBtn.addEventListener('click', () => {
            resolved = true;
            modal.close();
            resolve(true);
        });
    });
}
