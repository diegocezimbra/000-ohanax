// =============================================================================
// DOM - DOM manipulation utilities for the YouTube Automation SPA
// =============================================================================

/**
 * Shortcut for document.querySelector.
 * @param {string} selector
 * @returns {HTMLElement | null}
 */
export function $(selector) {
    return document.querySelector(selector);
}

/**
 * Shortcut for document.querySelectorAll (returns real Array).
 * @param {string} selector
 * @returns {HTMLElement[]}
 */
export function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
}

/**
 * Creates an element with attributes and optional children.
 * @param {string} tag
 * @param {Record<string, string>} [attrs]
 * @param {(string | HTMLElement)[]} [children]
 * @returns {HTMLElement}
 */
export function createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'className') {
            el.className = value;
        } else if (key.startsWith('on') && typeof value === 'function') {
            el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
            el.setAttribute(key, value);
        }
    }

    for (const child of children) {
        if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            el.appendChild(child);
        }
    }

    return el;
}

/**
 * Escapes HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (!str) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    };
    return String(str).replace(/[&<>"']/g, (ch) => map[ch]);
}

/**
 * Creates a debounced version of a function.
 * @param {Function} fn
 * @param {number} delay - milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn.apply(this, args);
        }, delay);
    };
}

/**
 * Re-executes inline <script> tags inside a container.
 * Necessary because innerHTML does not execute scripts.
 * @param {HTMLElement} container
 */
export function executeInlineScripts(container) {
    const scripts = container.querySelectorAll('script');
    scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = oldScript.textContent;
        oldScript.parentNode.replaceChild(newScript, oldScript);
    });
}
