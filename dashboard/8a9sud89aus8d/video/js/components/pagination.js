// =============================================================================
// PAGINATION - Page navigation component
// =============================================================================

/**
 * Renders pagination controls as an HTML string.
 * @param {number} currentPage - 1-based current page
 * @param {number} totalPages - Total number of pages
 * @param {string} onPageChangeFnName - Global function name to call, e.g. "goToPage"
 * @returns {string} HTML string
 */
export function renderPagination(currentPage, totalPages, onPageChangeFnName) {
    if (totalPages <= 1) return '';

    const pages = _buildPageNumbers(currentPage, totalPages);

    const prevDisabled = currentPage <= 1 ? 'disabled' : '';
    const nextDisabled = currentPage >= totalPages ? 'disabled' : '';

    const prevBtn = `
        <button class="yt-pagination-btn" ${prevDisabled}
                onclick="${onPageChangeFnName}(${currentPage - 1})">
            &#8249;
        </button>`;

    const nextBtn = `
        <button class="yt-pagination-btn" ${nextDisabled}
                onclick="${onPageChangeFnName}(${currentPage + 1})">
            &#8250;
        </button>`;

    const pageButtons = pages.map((p) => {
        if (p === '...') {
            return '<span class="yt-pagination-btn" style="cursor: default;">...</span>';
        }
        const activeClass = p === currentPage ? 'active' : '';
        return `
            <button class="yt-pagination-btn ${activeClass}"
                    onclick="${onPageChangeFnName}(${p})">
                ${p}
            </button>`;
    }).join('');

    return `
        <div class="yt-pagination">
            ${prevBtn}
            ${pageButtons}
            ${nextBtn}
        </div>`;
}

/**
 * Builds array of page numbers with ellipsis for large ranges.
 * Always shows first, last, and neighbors of current page.
 */
function _buildPageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set([1, total]);
    for (let i = current - 1; i <= current + 1; i++) {
        if (i >= 1 && i <= total) {
            pages.add(i);
        }
    }

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result = [];

    for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
            result.push('...');
        }
        result.push(sorted[i]);
    }

    return result;
}
