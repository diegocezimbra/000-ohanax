/* ========================================
   SHARED HEADER COMPONENT
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    const headerType = document.body.dataset.saasHeader || 'default';

    const headerConfig = {
        'investment': {
            title: 'Investment Analyzer',
            icon: '📊',
            subtitle: 'SaaS Toolkit'
        },
        'launchpad': {
            title: 'MicroSaaS Launchpad',
            icon: '🚀',
            subtitle: 'SaaS Toolkit'
        },
        'launchpad1': {
            title: 'MicroSaaS Launchpad',
            icon: '🚀',
            subtitle: 'SaaS Toolkit'
        },
        'default': {
            title: 'SaaS Toolkit',
            icon: '⚡',
            subtitle: 'Tools'
        }
    };

    const config = headerConfig[headerType] || headerConfig['default'];
    const isLaunchpad = headerType === 'launchpad' || headerType === 'launchpad1';

    const headerHTML = `
        <header class="saas-top-bar">
            <div class="top-bar-left">
                <a href="/admin/" class="top-bar-back" title="Voltar ao Admin">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M15 19l-7-7 7-7"/>
                    </svg>
                    Admin
                </a>
                <div class="top-bar-divider"></div>
                <div class="top-bar-logo">
                    <span class="logo-icon">${config.icon}</span>
                    <div class="logo-text">
                        <span class="logo-title">${config.title}</span>
                        <span class="logo-subtitle">${config.subtitle}</span>
                    </div>
                </div>
            </div>
            <div class="top-bar-right">
                <a href="/analytics/" class="top-bar-link" title="Analytics">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Analytics
                </a>
                <a href="/admin/tools/se-app-investment-analyzer/" class="top-bar-link ${headerType === 'investment' ? 'active' : ''}" title="Investment Analyzer">
                    📊 Analyzer
                </a>
                <a href="/admin/tools/zzz-se-app-microsaas-launchpad/" class="top-bar-link ${isLaunchpad ? 'active' : ''}" title="MicroSaaS Launchpad">
                    🚀 Launchpad
                </a>
            </div>
        </header>
    `;

    const headerStyles = `
        <style>
            .saas-top-bar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 64px;
                background: var(--bg-secondary, #111113);
                border-bottom: 1px solid var(--border-color, #27272a);
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 24px;
                z-index: 1000;
            }

            .top-bar-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .top-bar-back {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 14px;
                background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(168, 85, 247, 0.1));
                border: 1px solid rgba(34, 211, 238, 0.3);
                border-radius: 8px;
                color: #22d3ee;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
                transition: all 0.2s ease;
            }

            .top-bar-back:hover {
                background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(168, 85, 247, 0.2));
                border-color: rgba(34, 211, 238, 0.5);
                transform: translateX(-2px);
            }

            .top-bar-divider {
                width: 1px;
                height: 32px;
                background: var(--border-color, #27272a);
            }

            .top-bar-logo {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .top-bar-logo .logo-icon {
                font-size: 24px;
            }

            .top-bar-logo .logo-text {
                display: flex;
                flex-direction: column;
            }

            .top-bar-logo .logo-title {
                font-weight: 700;
                font-size: 15px;
                color: var(--text-primary, #fafafa);
            }

            .top-bar-logo .logo-subtitle {
                font-size: 11px;
                color: var(--text-muted, #71717a);
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .top-bar-right {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .top-bar-link {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                background: transparent;
                border: 1px solid transparent;
                border-radius: 8px;
                color: var(--text-secondary, #a1a1aa);
                font-size: 13px;
                font-weight: 500;
                text-decoration: none;
                transition: all 0.2s ease;
            }

            .top-bar-link:hover {
                background: var(--bg-tertiary, #18181b);
                color: var(--text-primary, #fafafa);
            }

            .top-bar-link.active {
                background: var(--bg-tertiary, #18181b);
                border-color: var(--border-color, #27272a);
                color: var(--text-primary, #fafafa);
            }

            @media (max-width: 768px) {
                .saas-top-bar {
                    padding: 0 12px;
                }

                .top-bar-logo .logo-text {
                    display: none;
                }

                .top-bar-link span,
                .top-bar-back span {
                    display: none;
                }
            }
        </style>
    `;

    // Insert styles
    document.head.insertAdjacentHTML('beforeend', headerStyles);

    // Insert header at start of body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
});
