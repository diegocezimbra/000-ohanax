// =============================================================================
// API - Fetch wrapper + endpoint definitions for YouTube Automation
// =============================================================================

const BASE = '/api/youtube';

/** Core fetch wrapper. Sends JSON, parses response, throws on error. */
async function request(path, options = {}) {
    const config = {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    };
    if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
    }
    const res = await fetch(BASE + path, config);
    const data = await res.json();
    if (!res.ok) {
        const message = data.error || data.message || `HTTP ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data.data !== undefined ? data.data : data;
}

/** Builds a query string, filtering out falsy values. */
function qs(params) {
    if (!params) return '';
    const filtered = {};
    for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
            filtered[key] = String(val);
        }
    }
    return new URLSearchParams(filtered).toString();
}

// Shorthand helpers for common methods
const POST = (path) => request(path, { method: 'POST' });
const POST_BODY = (path, body) => request(path, { method: 'POST', body });
const PUT_BODY = (path, body) => request(path, { method: 'PUT', body });
const DEL = (path) => request(path, { method: 'DELETE' });

export const api = {
    projects: {
        list: () => request('/projects'),
        get: (id) => request(`/projects/${id}`),
        create: (body) => POST_BODY('/projects', body),
        update: (id, body) => PUT_BODY(`/projects/${id}`, body),
        delete: (id) => DEL(`/projects/${id}`),
    },

    settings: {
        get: (pid) => request(`/projects/${pid}/settings`),
        updateStorytelling: (pid, body) => PUT_BODY(`/projects/${pid}/settings/storytelling`, body),
        updateAI: (pid, body) => PUT_BODY(`/projects/${pid}/settings/ai`, body),
        updatePublishing: (pid, body) => PUT_BODY(`/projects/${pid}/settings/publishing`, body),
        updateVisualIdentity: (pid, body) => PUT_BODY(`/projects/${pid}/settings/visual-identity`, body),
        updateYouTube: (pid, body) => PUT_BODY(`/projects/${pid}/settings/youtube`, body),
    },

    sources: {
        list: (pid, params) => request(`/projects/${pid}/sources?${qs(params)}`),
        get: (pid, id) => request(`/projects/${pid}/sources/${id}`),
        addUrl: (pid, body) => POST_BODY(`/projects/${pid}/sources/url`, body),
        addPdf: (pid, body) => POST_BODY(`/projects/${pid}/sources/pdf`, body),
        addText: (pid, body) => POST_BODY(`/projects/${pid}/sources/text`, body),
        addYoutube: (pid, body) => POST_BODY(`/projects/${pid}/sources/youtube`, body),
        update: (pid, id, body) => PUT_BODY(`/projects/${pid}/sources/${id}`, body),
        delete: (pid, id) => DEL(`/projects/${pid}/sources/${id}`),
    },

    topics: {
        list: (pid, params) => request(`/projects/${pid}/topics?${qs(params)}`),
        stats: (pid) => request(`/projects/${pid}/topics/stats`),
        get: (pid, id) => request(`/projects/${pid}/topics/${id}`),
        create: (pid, body) => POST_BODY(`/projects/${pid}/topics`, body),
        update: (pid, id, body) => PUT_BODY(`/projects/${pid}/topics/${id}`, body),
        reprocess: (pid, id) => POST(`/projects/${pid}/topics/${id}/reprocess`),
        restartFrom: (pid, id, body) => POST_BODY(`/projects/${pid}/topics/${id}/restart-from`, body),
        delete: (pid, id) => DEL(`/projects/${pid}/topics/${id}`),
    },

    story: {
        get: (pid, tid) => request(`/projects/${pid}/topics/${tid}/story`),
        update: (pid, tid, body) => PUT_BODY(`/projects/${pid}/topics/${tid}/story`, body),
        regenerate: (pid, tid) => POST(`/projects/${pid}/topics/${tid}/story/regenerate`),
    },

    script: {
        get: (pid, tid) => request(`/projects/${pid}/topics/${tid}/script`),
        updateMetadata: (pid, tid, body) =>
            PUT_BODY(`/projects/${pid}/topics/${tid}/script/metadata`, body),
        updateSegment: (pid, tid, segId, body) =>
            PUT_BODY(`/projects/${pid}/topics/${tid}/script/segments/${segId}`, body),
        splitSegment: (pid, tid, segId, body) =>
            POST_BODY(`/projects/${pid}/topics/${tid}/script/segments/${segId}/split`, body),
        mergeSegments: (pid, tid, body) =>
            POST_BODY(`/projects/${pid}/topics/${tid}/script/segments/merge`, body),
        reorder: (pid, tid, body) =>
            PUT_BODY(`/projects/${pid}/topics/${tid}/script/segments/reorder`, body),
        regenerate: (pid, tid) => POST(`/projects/${pid}/topics/${tid}/script/regenerate`),
    },

    visuals: {
        list: (pid, tid) => request(`/projects/${pid}/topics/${tid}/visuals`),
        regenerateSegment: (pid, tid, segId) =>
            POST(`/projects/${pid}/topics/${tid}/visuals/segments/${segId}/regenerate`),
        selectAsset: (pid, tid, assetId) =>
            PUT_BODY(`/projects/${pid}/topics/${tid}/visuals/${assetId}/select`, {}),
        regenerateAll: (pid, tid) =>
            POST(`/projects/${pid}/topics/${tid}/visuals/regenerate-all`),
    },

    thumbnail: {
        list: (pid, tid) => request(`/projects/${pid}/topics/${tid}/thumbnail`),
        select: (pid, tid, id) =>
            PUT_BODY(`/projects/${pid}/topics/${tid}/thumbnail/${id}/select`, {}),
        regenerate: (pid, tid) =>
            POST(`/projects/${pid}/topics/${tid}/thumbnail/regenerate`),
    },

    narration: {
        get: (pid, tid) => request(`/projects/${pid}/topics/${tid}/narration`),
        regenerate: (pid, tid) =>
            POST(`/projects/${pid}/topics/${tid}/narration/regenerate`),
    },

    video: {
        get: (pid, tid) => request(`/projects/${pid}/topics/${tid}/video`),
        assemble: (pid, tid) =>
            POST(`/projects/${pid}/topics/${tid}/video/assemble`),
        reassemble: (pid, tid) =>
            POST(`/projects/${pid}/topics/${tid}/video/reassemble`),
    },

    publishing: {
        list: (pid, params) => request(`/projects/${pid}/publishing?${qs(params)}`),
        calendar: (pid, month) => request(`/projects/${pid}/publishing/calendar?month=${month}`),
        get: (pid, id) => request(`/projects/${pid}/publishing/${id}`),
        approve: (pid, id) => POST(`/projects/${pid}/publishing/${id}/approve`),
        reject: (pid, id, body) => POST_BODY(`/projects/${pid}/publishing/${id}/reject`, body),
        update: (pid, id, body) => PUT_BODY(`/projects/${pid}/publishing/${id}`, body),
        retry: (pid, id) => POST(`/projects/${pid}/publishing/${id}/retry`),
    },

    pipeline: {
        get: (pid) => request(`/projects/${pid}/pipeline`),
        stats: (pid) => request(`/projects/${pid}/pipeline/stats`),
        pause: (pid) => POST(`/projects/${pid}/pipeline/pause`),
        resume: (pid) => POST(`/projects/${pid}/pipeline/resume`),
        bulkReprocess: (pid, body) => POST_BODY(`/projects/${pid}/pipeline/bulk/reprocess`, body),
        bulkReject: (pid, body) => POST_BODY(`/projects/${pid}/pipeline/bulk/reject`, body),
        bulkApprove: (pid, body) => POST_BODY(`/projects/${pid}/pipeline/bulk/approve`, body),
    },

    jobs: {
        list: (params) => request(`/jobs?${qs(params)}`),
        stats: () => request('/jobs/stats'),
        get: (id) => request(`/jobs/${id}`),
        retry: (id) => POST(`/jobs/${id}/retry`),
        cancel: (id) => POST(`/jobs/${id}/cancel`),
    },
};
