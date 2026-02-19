// =============================================================================
// STATE - Simple observable store for the YouTube Automation SPA
// =============================================================================

/** @type {Set<(state: AppState) => void>} */
const _listeners = new Set();

const _state = {
    /** @type {string | null} */
    currentProjectId: null,
    /** @type {object | null} */
    currentProject: null,
    /** @type {string | null} */
    currentTopicId: null,
    /** @type {object | null} */
    currentTopic: null,
    /** @type {boolean} */
    pipelinePaused: false,
    /** @type {'list' | 'project'} */
    sidebarMode: 'list',
};

/**
 * Returns a shallow copy of the current state.
 * @returns {Readonly<typeof _state>}
 */
export function getState() {
    return { ..._state };
}

/**
 * Merges partial updates into the state and notifies listeners.
 * @param {Partial<typeof _state>} updates
 */
export function setState(updates) {
    let changed = false;

    for (const key of Object.keys(updates)) {
        if (Object.prototype.hasOwnProperty.call(_state, key)) {
            if (_state[key] !== updates[key]) {
                _state[key] = updates[key];
                changed = true;
            }
        }
    }

    if (changed) {
        _notifyListeners();
    }
}

/**
 * Subscribes a listener to state changes.
 * @param {(state: typeof _state) => void} listener
 * @returns {() => void} Unsubscribe function
 */
export function subscribe(listener) {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
}

// ---- Convenience setters ----

/**
 * Sets the active project and switches sidebar to project mode.
 * @param {object} project
 */
export function setProject(project) {
    setState({
        currentProjectId: project.id,
        currentProject: project,
        sidebarMode: 'project',
    });
}

/**
 * Sets the active topic context.
 * @param {object | null} topic
 */
export function setTopic(topic) {
    setState({
        currentTopicId: topic ? topic.id : null,
        currentTopic: topic,
    });
}

/**
 * Updates the pipeline paused flag.
 * @param {boolean} paused
 */
export function setPipelinePaused(paused) {
    setState({ pipelinePaused: paused });
}

/**
 * Resets to project list mode (clears project and topic context).
 */
export function clearProjectContext() {
    setState({
        currentProjectId: null,
        currentProject: null,
        currentTopicId: null,
        currentTopic: null,
        sidebarMode: 'list',
    });
}

// ---- Private ----

function _notifyListeners() {
    const snapshot = getState();
    for (const listener of _listeners) {
        try {
            listener(snapshot);
        } catch (err) {
            console.error('[State] Listener error:', err);
        }
    }
}
