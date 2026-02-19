// =============================================================================
// TABLE - Sortable table header utilities for the YouTube Automation SPA
// =============================================================================

import { escapeHtml } from '../utils/dom.js';

/**
 * @typedef {object} ColumnDef
 * @property {string} key - Column identifier
 * @property {string} label - Display label
 * @property {boolean} [sortable=false] - Whether column is sortable
 * @property {string} [width] - Optional CSS width (e.g., "120px", "20%")
 * @property {string} [align] - Optional alignment ("left", "center", "right")
 */

/**
 * Renders a sortable table header row.
 *
 * @param {ColumnDef[]} columns
 * @param {{ column: string, direction: 'asc'|'desc' } | null} currentSort
 * @param {string} onSortFnName - Window function name, called as fn(columnKey)
 * @returns {string} <thead> HTML string
 */
export function renderTableHeader(columns, currentSort, onSortFnName) {
    const ths = columns.map((col) => {
        const widthAttr = col.width ? `style="width: ${col.width};"` : '';
        const alignClass = col.align === 'right'
            ? 'style="text-align: right;"'
            : col.align === 'center'
                ? 'style="text-align: center;"'
                : '';

        if (!col.sortable) {
            return `<th ${widthAttr} ${alignClass}>${escapeHtml(col.label)}</th>`;
        }

        const isActive = currentSort && currentSort.column === col.key;
        const icon = _sortIcon(isActive, currentSort?.direction);

        return `
            <th class="yt-sortable-th" ${widthAttr} ${alignClass}
                data-sort-key="${escapeHtml(col.key)}"
                onclick="${onSortFnName}('${escapeHtml(col.key)}')">
                ${escapeHtml(col.label)}
                ${icon}
            </th>`;
    }).join('');

    return `<thead><tr>${ths}</tr></thead>`;
}

/**
 * Updates sort indicators in a rendered table.
 *
 * @param {string} containerId - ID of the table or its wrapper
 * @param {string} column - Active column key
 * @param {'asc'|'desc'} direction
 */
export function updateSortIndicator(containerId, column, direction) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.yt-sortable-th').forEach((th) => {
        const key = th.dataset.sortKey;
        const iconEl = th.querySelector('.yt-sort-icon');
        if (!iconEl) return;

        if (key === column) {
            iconEl.classList.add('active');
            iconEl.innerHTML = direction === 'asc' ? '&#9650;' : '&#9660;';
        } else {
            iconEl.classList.remove('active');
            iconEl.innerHTML = '&#9650;&#9660;';
        }
    });
}

/**
 * Builds the sort icon HTML fragment.
 */
function _sortIcon(isActive, direction) {
    if (!isActive) {
        return '<span class="yt-sort-icon">&#9650;&#9660;</span>';
    }
    const arrow = direction === 'asc' ? '&#9650;' : '&#9660;';
    return `<span class="yt-sort-icon active">${arrow}</span>`;
}
