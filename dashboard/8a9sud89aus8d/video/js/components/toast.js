// =============================================================================
// TOAST - Toast notification system for the YouTube Automation SPA
// =============================================================================

import { escapeHtml } from '../utils/dom.js';

const ICON_MAP = {
    success: '&#10003;',
    error: '&#10007;',
    warning: '&#9888;',
    info: '&#8505;',
};

const DEFAULT_DURATION_MS = 3000;

/**
 * Shows a toast notification.
 * @param {string} message - Text to display
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 * @param {number} [durationMs=3000]
 */
export function showToast(message, type = 'info', durationMs = DEFAULT_DURATION_MS) {
    const container = document.getElementById('yt-toast-container');
    if (!container) return;

    const icon = ICON_MAP[type] || ICON_MAP.info;
    const cssClass = `yt-toast yt-toast-${type}`;

    const toast = document.createElement('div');
    toast.className = cssClass;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    const removeToast = () => {
        toast.classList.add('yt-toast-exit');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    };

    // Click to dismiss
    toast.addEventListener('click', removeToast);

    // Auto-remove after duration
    setTimeout(removeToast, durationMs);
}
