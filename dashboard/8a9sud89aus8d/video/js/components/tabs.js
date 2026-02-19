// =============================================================================
// TABS - Tab navigation component for the YouTube Automation SPA
// =============================================================================

/**
 * Initializes tab behavior on a container.
 * Expects [data-tab] buttons and [data-tab-panel] content divs inside it.
 *
 * @param {string} containerId - ID of the container element
 * @param {((tabName: string) => void) | null} [onTabChange] - Optional callback
 * @returns {{ setActive: (tabName: string) => void } | null}
 */
export function initTabs(containerId, onTabChange = null) {
    const container = document.getElementById(containerId);
    if (!container) return null;

    const buttons = container.querySelectorAll('[data-tab]');
    const panels = container.querySelectorAll('[data-tab-panel]');

    function activateTab(tabName) {
        buttons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        panels.forEach((panel) => {
            panel.classList.toggle(
                'active',
                panel.dataset.tabPanel === tabName
            );
        });
    }

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            activateTab(tabName);

            if (typeof onTabChange === 'function') {
                onTabChange(tabName);
            }
        });
    });

    // Activate the first tab by default
    if (buttons.length > 0) {
        const firstTab = buttons[0].dataset.tab;
        activateTab(firstTab);
    }

    return {
        /** Programmatically switch to a tab. */
        setActive: activateTab,
    };
}
