// =============================================================================
// HELPERS - Formatting utilities for the YouTube Automation SPA
// =============================================================================

const LOCALE = 'pt-BR';

/**
 * Formats an ISO date string to pt-BR date.
 * Example: "2025-03-15T10:30:00Z" -> "15/03/2025"
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleDateString(LOCALE);
}

/**
 * Formats an ISO date string to pt-BR date + time.
 * Example: "2025-03-15T10:30:00Z" -> "15/03/2025 10:30"
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--';
    return date.toLocaleString(LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Formats a date string as relative time in pt-BR.
 * Example: "3h atras", "2d atras", "agora"
 * @param {string | null | undefined} dateStr
 * @returns {string}
 */
export function formatRelativeTime(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '--';

    const diffMs = Date.now() - date.getTime();
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'agora';
    if (minutes < 60) return `${minutes}m atras`;
    if (hours < 24) return `${hours}h atras`;
    if (days < 30) return `${days}d atras`;

    return formatDate(dateStr);
}

/**
 * Formats seconds into "MM:SS" or "HH:MM:SS" duration.
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
    if (totalSeconds == null || isNaN(totalSeconds)) return '0:00';
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

/**
 * Formats a number with locale separators.
 * @param {number} n
 * @returns {string}
 */
export function formatNumber(n) {
    if (n == null || isNaN(n)) return '0';
    return n.toLocaleString(LOCALE);
}

/**
 * Formats a word count for display.
 * Example: 3750 -> "3.750 palavras"
 * @param {number} count
 * @returns {string}
 */
export function formatWords(count) {
    if (!count) return '0 palavras';
    return `${formatNumber(count)} palavras`;
}

/**
 * Truncates a string to a max length, adding ellipsis if needed.
 * @param {string} str
 * @param {number} max
 * @returns {string}
 */
export function truncate(str, max) {
    if (!str) return '';
    if (str.length <= max) return str;
    return str.slice(0, max - 1).trimEnd() + '\u2026';
}

/**
 * Counts words in a text by splitting on whitespace.
 * @param {string} text
 * @returns {number}
 */
export function countWords(text) {
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}
