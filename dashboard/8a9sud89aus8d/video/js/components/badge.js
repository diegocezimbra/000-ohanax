// =============================================================================
// BADGE - Status badges for the YouTube Automation SPA
// =============================================================================

import { escapeHtml } from '../utils/dom.js';

const STAGE_CONFIG = {
    idea:                  { label: 'Ideia',             color: 'gray' },
    topics_generated:      { label: 'Selecionada',       color: 'purple' },
    story_created:         { label: 'Historia Criada',   color: 'blue' },
    script_created:        { label: 'Roteiro Criado',    color: 'cyan' },
    visuals_creating:      { label: 'Gerando Visuais',   color: 'orange' },
    visuals_created:       { label: 'Visuais Criados',   color: 'yellow' },
    thumbnails_created:    { label: 'Thumbnails',        color: 'pink' },
    narration_created:     { label: 'Narracao Criada',   color: 'pink' },
    video_assembled:       { label: 'Video Montado',     color: 'green' },
    queued_for_publishing: { label: 'Na Fila',           color: 'gray' },
    scheduled:             { label: 'Agendado',          color: 'orange' },
    published:             { label: 'Publicado',         color: 'green' },
    discarded:             { label: 'Descartado',        color: 'gray' },
    rejected:              { label: 'Rejeitado',         color: 'red' },
    error:                 { label: 'Erro',              color: 'red' },
};

/**
 * Returns HTML string for a pipeline stage badge.
 * @param {string} stage
 * @returns {string}
 */
export function renderStatusBadge(stage) {
    const config = STAGE_CONFIG[stage];
    if (!config) {
        return `<span class="yt-badge yt-badge-gray">${escapeHtml(stage)}</span>`;
    }
    return `<span class="yt-badge yt-badge-${config.color}">${config.label}</span>`;
}

/**
 * Returns HTML string for a richness score badge.
 * Score 8-10 = green, 7 = yellow, 5-6 = orange, 1-4 = red
 * @param {number} score
 * @returns {string}
 */
export function renderRichnessBadge(score) {
    if (score == null) return '<span class="yt-badge yt-badge-gray">--</span>';

    let color;
    if (score >= 8) {
        color = 'green';
    } else if (score >= 7) {
        color = 'yellow';
    } else if (score >= 5) {
        color = 'orange';
    } else {
        color = 'red';
    }

    return `<span class="yt-badge yt-badge-${color}">${score}/10</span>`;
}

const SOURCE_TYPE_CONFIG = {
    url:                  { label: 'URL',         color: 'blue' },
    pdf:                  { label: 'PDF',         color: 'orange' },
    text:                 { label: 'Texto',       color: 'purple' },
    manual:               { label: 'Texto',       color: 'purple' },
    youtube:              { label: 'YouTube',     color: 'red' },
    youtube_transcript:   { label: 'YouTube',     color: 'red' },
};

/**
 * Returns HTML string for a source type badge.
 * @param {string} type
 * @returns {string}
 */
export function renderSourceTypeBadge(type) {
    const config = SOURCE_TYPE_CONFIG[type];
    if (!config) {
        return `<span class="yt-badge yt-badge-gray">${escapeHtml(type)}</span>`;
    }
    return `<span class="yt-badge yt-badge-${config.color}">${config.label}</span>`;
}
