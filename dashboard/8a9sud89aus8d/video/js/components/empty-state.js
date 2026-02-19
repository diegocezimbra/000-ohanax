// =============================================================================
// EMPTY STATE - Placeholder for empty lists / sections
// =============================================================================

import { escapeHtml } from '../utils/dom.js';

/**
 * Returns an HTML string for an empty-state placeholder.
 * @param {string} icon - Emoji or HTML entity for the icon
 * @param {string} message - Descriptive message
 * @param {string} [actionLabel] - Optional button text
 * @param {string} [actionFnName] - Window function name for the button onclick
 * @returns {string}
 */
export function renderEmptyState(icon, message, actionLabel, actionFnName) {
    const buttonHtml = actionLabel && actionFnName
        ? `<button class="btn btn-primary btn-small"
                   onclick="${escapeHtml(actionFnName)}()">
               ${escapeHtml(actionLabel)}
           </button>`
        : '';

    return `
        <div class="yt-empty-state">
            <div class="yt-empty-state-icon">${icon}</div>
            <div class="yt-empty-state-message">
                ${escapeHtml(message)}
            </div>
            ${buttonHtml}
        </div>`;
}
