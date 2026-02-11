/**
 * OhanaX Navigation Header
 * Injeta header de navegação em todas as páginas do admin
 */

(function() {
    'use strict';

    // Detectar contexto atual baseado na URL
    const path = window.location.pathname;
    const isAnalises = path.includes('/analises/');
    const isDocumentacao = path.includes('/documentacao/');
    const isFerramentas = path.includes('/ferramentas/');
    const isSaasToolkit = path.includes('/saas-toolkit/');

    // Configuração do breadcrumb
    let breadcrumb = [{ label: 'Admin', href: '/admin/' }];
    let pageTitle = document.title;

    if (isAnalises) {
        breadcrumb.push({ label: 'Análises', href: '/admin/' });
        if (path.includes('/portfolio/')) {
            breadcrumb.push({ label: 'Portfolio', href: null });
        } else if (path.includes('/entregador/')) {
            breadcrumb.push({ label: 'O Entregador', href: null });
        } else if (path.includes('/checklist/')) {
            breadcrumb.push({ label: 'Checklist App', href: null });
        }
    } else if (isDocumentacao) {
        breadcrumb.push({ label: 'Documentação', href: '/admin/' });
        if (path.includes('/sellpipe/')) {
            breadcrumb.push({ label: 'Sellpipe', href: null });
        } else if (path.includes('/smart-noter/')) {
            breadcrumb.push({ label: 'Smart Noter', href: null });
        }
    } else if (isFerramentas) {
        breadcrumb.push({ label: 'Ferramentas', href: '/admin/' });
    }

    // Criar HTML do header
    const headerHTML = `
        <nav class="ohanax-nav-header">
            <div class="nav-container">
                <div class="nav-left">
                    <a href="/admin/" class="nav-back" title="Voltar ao Admin">
                        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M15 19l-7-7 7-7"/>
                        </svg>
                        Admin
                    </a>
                    <span class="nav-divider"></span>
                    <div class="nav-breadcrumb">
                        ${breadcrumb.map((item, i) =>
                            item.href
                                ? `<a href="${item.href}">${item.label}</a>${i < breadcrumb.length - 1 ? '<span class="breadcrumb-sep">/</span>' : ''}`
                                : `<span class="breadcrumb-current">${item.label}</span>`
                        ).join('')}
                    </div>
                </div>
                <div class="nav-right">
                    <a href="/analytics/" class="nav-link" title="Analytics Dashboard">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        Analytics
                    </a>
                    <a href="/admin/prompts.html" class="nav-link" title="Biblioteca de Prompts">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                        </svg>
                        Prompts
                    </a>
                </div>
            </div>
        </nav>
    `;

    // Estilos do header
    const styles = `
        <style id="ohanax-nav-styles">
            .ohanax-nav-header {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: 56px;
                background: rgba(10, 10, 10, 0.95);
                backdrop-filter: blur(20px);
                border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                z-index: 9999;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }

            .ohanax-nav-header .nav-container {
                max-width: 1400px;
                height: 100%;
                margin: 0 auto;
                padding: 0 24px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }

            .ohanax-nav-header .nav-left {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .ohanax-nav-header .nav-back {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 14px;
                background: linear-gradient(135deg, rgba(255, 51, 102, 0.1), rgba(139, 92, 246, 0.1));
                border: 1px solid rgba(255, 51, 102, 0.3);
                border-radius: 8px;
                color: #ff3366;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
                transition: all 0.2s ease;
            }

            .ohanax-nav-header .nav-back:hover {
                background: linear-gradient(135deg, rgba(255, 51, 102, 0.2), rgba(139, 92, 246, 0.2));
                border-color: rgba(255, 51, 102, 0.5);
                transform: translateX(-2px);
            }

            .ohanax-nav-header .nav-divider {
                width: 1px;
                height: 24px;
                background: rgba(255, 255, 255, 0.1);
            }

            .ohanax-nav-header .nav-breadcrumb {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #ffffff !important;
            }

            .ohanax-nav-header .nav-breadcrumb a {
                color: rgba(255, 255, 255, 0.6) !important;
                text-decoration: none !important;
                transition: color 0.2s;
            }

            .ohanax-nav-header .nav-breadcrumb a:hover {
                color: #ffffff !important;
            }

            .ohanax-nav-header .breadcrumb-sep {
                color: rgba(255, 255, 255, 0.3) !important;
            }

            .ohanax-nav-header .breadcrumb-current {
                color: #ffffff !important;
                font-weight: 500;
            }

            .ohanax-nav-header .nav-right {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ohanax-nav-header .nav-link {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 14px;
                background: transparent;
                border: 1px solid transparent;
                border-radius: 8px;
                color: #ffffff !important;
                font-size: 13px;
                font-weight: 500;
                text-decoration: none !important;
                transition: all 0.2s ease;
            }

            .ohanax-nav-header .nav-link:hover {
                background: rgba(255, 255, 255, 0.05);
                border-color: rgba(255, 255, 255, 0.1);
                color: #ffffff !important;
            }

            .ohanax-nav-header .nav-link svg {
                color: #ffffff !important;
                stroke: #ffffff !important;
            }

            .ohanax-nav-header .nav-back svg {
                color: #ff3366 !important;
                stroke: #ff3366 !important;
            }

            /* Adicionar padding ao body para compensar o header fixo */
            body {
                padding-top: 56px !important;
            }

            /* Ajuste para impressão */
            @media print {
                .ohanax-nav-header {
                    display: none !important;
                }
                body {
                    padding-top: 0 !important;
                }
            }

            /* Mobile */
            @media (max-width: 768px) {
                .ohanax-nav-header .nav-container {
                    padding: 0 12px;
                }

                .ohanax-nav-header .nav-breadcrumb {
                    display: none;
                }

                .ohanax-nav-header .nav-link span {
                    display: none;
                }
            }
        </style>
    `;

    // Inserir estilos e header
    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Adicionar fonte Inter se não existir
    if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Inter"]')) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        document.head.appendChild(fontLink);
    }
})();
