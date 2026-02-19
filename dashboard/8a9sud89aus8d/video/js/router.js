// =============================================================================
// ROUTER - Hash-based SPA router with parameter extraction
// =============================================================================

const ROUTES = [
    { pattern: 'projects', page: 'projects' },
    { pattern: 'projects/:projectId/settings', page: 'project-settings' },
    { pattern: 'projects/:projectId/sources', page: 'sources' },
    { pattern: 'projects/:projectId/topics', page: 'topics' },
    { pattern: 'projects/:projectId/topics/:topicId', page: 'topic-detail' },
    {
        pattern: 'projects/:projectId/topics/:topicId/script',
        page: 'script-editor',
    },
    {
        pattern: 'projects/:projectId/topics/:topicId/visuals',
        page: 'visuals',
    },
    {
        pattern: 'projects/:projectId/topics/:topicId/thumbnail',
        page: 'thumbnail',
    },
    {
        pattern: 'projects/:projectId/topics/:topicId/narration',
        page: 'narration',
    },
    {
        pattern: 'projects/:projectId/topics/:topicId/assembly',
        page: 'assembly',
    },
    { pattern: 'projects/:projectId/publishing', page: 'publishing' },
    { pattern: 'projects/:projectId/pipeline', page: 'pipeline' },
];

/**
 * Compiles a route pattern into a RegExp and extracts param names.
 * Example: "projects/:projectId/topics/:topicId"
 *   -> regex: /^projects\/([^/]+)\/topics\/([^/]+)$/
 *   -> paramNames: ['projectId', 'topicId']
 */
function compilePattern(pattern) {
    const paramNames = [];
    const regexStr = pattern.replace(/:([a-zA-Z]+)/g, (_match, name) => {
        paramNames.push(name);
        return '([^/]+)';
    });
    return {
        regex: new RegExp(`^${regexStr}$`),
        paramNames,
    };
}

// Sort routes by segment count descending so more specific routes
// (e.g. topics/:topicId/script) match before less specific ones
// (e.g. topics/:topicId).
const COMPILED_ROUTES = ROUTES
    .map((route) => ({
        ...route,
        ...compilePattern(route.pattern),
        _segmentCount: route.pattern.split('/').length,
    }))
    .sort((a, b) => b._segmentCount - a._segmentCount);

export class Router {
    constructor() {
        /** @type {((match: RouteMatch) => void) | null} */
        this.onNavigate = null;

        this._handleHashChange = this._handleHashChange.bind(this);
        window.addEventListener('hashchange', this._handleHashChange);
    }

    /**
     * Resolves the current hash to a route match.
     * @returns {{ page: string, params: Record<string, string> } | null}
     */
    resolve() {
        const hash = window.location.hash.replace(/^#\/?/, '');
        if (!hash) {
            return { page: 'projects', params: {} };
        }
        return this._matchPath(hash);
    }

    /**
     * Programmatic navigation via hash change.
     * @param {string} path - e.g. "projects/abc123/topics"
     */
    navigate(path) {
        const cleaned = path.replace(/^#?\/?/, '');
        window.location.hash = `#/${cleaned}`;
    }

    /**
     * Start listening and resolve the initial route.
     */
    start() {
        const match = this.resolve();
        if (match && this.onNavigate) {
            this.onNavigate(match);
        }
    }

    /**
     * Cleans up event listeners.
     */
    destroy() {
        window.removeEventListener('hashchange', this._handleHashChange);
    }

    // ---- Private ----

    _handleHashChange() {
        const match = this.resolve();
        if (match && this.onNavigate) {
            this.onNavigate(match);
        }
    }

    /**
     * Matches a path string against compiled routes.
     * Routes are matched in order (most specific patterns first
     * because they are defined that way in the array).
     */
    _matchPath(path) {
        for (const route of COMPILED_ROUTES) {
            const result = route.regex.exec(path);
            if (result) {
                const params = {};
                route.paramNames.forEach((name, index) => {
                    params[name] = decodeURIComponent(result[index + 1]);
                });
                return { page: route.page, params };
            }
        }
        return null;
    }
}
