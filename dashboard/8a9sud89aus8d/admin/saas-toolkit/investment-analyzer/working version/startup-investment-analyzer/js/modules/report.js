// ===========================
// Report Generation Module
// ===========================

const Report = {
    generate() {
        // Save and calculate everything
        Events.saveFormData();
        Events.calculateAllMetrics();

        const totalScore = Scoring.calculateTotal();
        const reportHTML = this.generateHTML(totalScore);

        const reportContainer = document.getElementById('finalReport');
        if (reportContainer) {
            reportContainer.innerHTML = reportHTML;

            // Auto-scroll to report
            setTimeout(() => {
                reportContainer.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    },

    generateHTML(totalScore) {
        const formData = AppState.getFormData();
        const verdict = ReportHelpers.getVerdict(totalScore);
        const recommendation = ReportHelpers.getRecommendation(totalScore);

        return `
            <div class="report-header">
                <h3>${formData.companyName || 'Startup'}</h3>
                <div class="report-score">${totalScore.toFixed(0)}/100</div>
                <div class="report-verdict ${verdict.class}">${verdict.icon} ${verdict.text}</div>
            </div>

            <div class="report-section">
                <h4>📊 Breakdown de Score por Categoria</h4>
                <div class="category-scores">
                    ${ReportHelpers.generateCategoryScoreCards()}
                </div>
            </div>

            <div class="report-section">
                <h4>🎯 Métricas-Chave</h4>
                <div class="key-metrics-grid">
                    ${ReportHelpers.generateKeyMetrics()}
                </div>
            </div>

            <div class="report-section">
                <h4>💡 Insights & Análise</h4>
                <ul class="insights-list">
                    ${this.generateInsights()}
                </ul>
            </div>

            <div class="report-section">
                <h4>✅ Pontos Fortes</h4>
                <ul class="insights-list">
                    ${this.generateStrengths()}
                </ul>
            </div>

            <div class="report-section">
                <h4>⚠️ Pontos de Atenção & Riscos</h4>
                <ul class="insights-list">
                    ${this.generateWeaknesses()}
                </ul>
            </div>

            <div class="recommendation-box">
                <h5>🎯 Recomendação Final</h5>
                ${recommendation}
            </div>

            <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--gray-200);">
                <button class="btn btn-primary" onclick="window.print()" style="margin-right: 1rem;">
                    🖨️ Imprimir Relatório
                </button>
                <button class="btn btn-secondary" onclick="location.reload()">
                    🔄 Nova Análise
                </button>
            </div>
        `;
    },

    generateInsights() {
        const formData = AppState.getFormData();
        const scores = AppState.getScores();
        const insights = [];

        // Founder-Market Fit
        const fmf = scores.founderMarketFit || 0;
        if (fmf >= 22) {
            insights.push('<li class="positive">✓ <strong>Founder-Market Fit Excepcional:</strong> Equipe demonstra profundo conhecimento do mercado e obsessão pelo problema.</li>');
        } else if (fmf < 15) {
            insights.push('<li class="negative">✗ <strong>Founder-Market Fit Fraco:</strong> Equipe pode não ter a experiência ou conexão necessária com o mercado.</li>');
        }

        // PMF
        const seanEllis = parseFloat(formData.seanEllis) || 0;
        if (seanEllis >= 40) {
            insights.push('<li class="positive">✓ <strong>Product-Market Fit Atingido:</strong> Sean Ellis score acima do benchmark de 40%.</li>');
        } else if (seanEllis < 30) {
            insights.push('<li class="warning">△ <strong>PMF em Construção:</strong> Produto ainda buscando fit forte com mercado.</li>');
        }

        // NRR
        const nrr = parseFloat(formData.nrr) || 0;
        if (nrr >= 120) {
            insights.push('<li class="positive">✓ <strong>NRR Excepcional (≥120%):</strong> Forte expansion revenue, comanda múltiplos premium (10-15x ARR).</li>');
        } else if (nrr < 100) {
            insights.push('<li class="negative">✗ <strong>NRR Abaixo de 100%:</strong> Receita está contraindo, sinal de churn alto ou falta de expansion.</li>');
        }

        // Market Size
        const tam = parseFloat(formData.tam) || 0;
        if (tam >= 1000000000) {
            insights.push('<li class="positive">✓ <strong>Mercado de $1B+:</strong> TAM suficientemente grande para suportar outcome unicórnio.</li>');
        } else if (tam < 100000000) {
            insights.push('<li class="warning">△ <strong>Mercado Pequeno:</strong> TAM pode limitar potencial de exit para valores significativos.</li>');
        }

        // Growth Rate
        const growthRate = parseFloat(formData.growthRate) || 0;
        const stage = formData.stage;
        const growthBenchmark = ReportHelpers.getGrowthBenchmarkValue(stage);
        if (growthRate >= growthBenchmark * 1.2) {
            insights.push('<li class="positive">✓ <strong>Crescimento Acelerado:</strong> Growth rate está acima do top quartile para o estágio.</li>');
        }

        return insights.length > 0 ? insights.join('') : '<li>Análise completa disponível nas seções abaixo.</li>';
    },

    generateStrengths() {
        const formData = AppState.getFormData();
        const scores = AppState.getScores();
        const strengths = [];

        // Team
        if (scores.team >= 80) {
            strengths.push('<li class="positive">Equipe fundadora excepcional com forte founder-market fit</li>');
        }

        // NRR
        const nrr = parseFloat(formData.nrr) || 0;
        if (nrr >= 110) {
            strengths.push('<li class="positive">Excelente Net Revenue Retention indicando forte expansion e baixo churn</li>');
        }

        // Gross Margin
        const grossMargin = parseFloat(formData.grossMargin) || 0;
        if (grossMargin >= 75) {
            strengths.push('<li class="positive">Gross margins saudáveis acima de 75%</li>');
        }

        // PMF
        const seanEllis = parseFloat(formData.seanEllis) || 0;
        if (seanEllis >= 40) {
            strengths.push('<li class="positive">Product-Market Fit forte comprovado por Sean Ellis Test</li>');
        }

        // Market Size
        const tam = parseFloat(formData.tam) || 0;
        if (tam >= 1000000000) {
            strengths.push('<li class="positive">Grande mercado endereçável (TAM $1B+)</li>');
        }

        return strengths.length > 0 ? strengths.join('') : '<li>Startup demonstra potencial em várias áreas.</li>';
    },

    generateWeaknesses() {
        const formData = AppState.getFormData();
        const scores = AppState.getScores();
        const weaknesses = [];

        // Team
        if (scores.team < 60) {
            weaknesses.push('<li class="negative">Equipe pode não ter experiência ou founder-market fit adequado</li>');
        }

        // Churn
        const monthlyChurn = parseFloat(formData.monthlyChurn) || 0;
        if (monthlyChurn > 7) {
            weaknesses.push('<li class="negative">Churn mensal alto (>7%) indica problemas de retenção</li>');
        }

        // NRR
        const nrr = parseFloat(formData.nrr) || 0;
        if (nrr < 100) {
            weaknesses.push('<li class="negative">NRR abaixo de 100% - receita está contraindo</li>');
        }

        // Runway
        const runway = this.calculateRunway();
        if (runway > 0 && runway < 6) {
            weaknesses.push('<li class="negative">Runway crítico (<6 meses) - necessita levantar capital urgentemente</li>');
        }

        // Gross Margin
        const grossMargin = parseFloat(formData.grossMargin) || 0;
        if (grossMargin < 60) {
            weaknesses.push('<li class="negative">Gross margin baixo (<60%) pode dificultar escala rentável</li>');
        }

        return weaknesses.length > 0 ? weaknesses.join('') : '<li>Não foram identificados riscos críticos significativos.</li>';
    },

    calculateRunway() {
        const formData = AppState.getFormData();
        const cash = parseFloat(formData.cash) || 0;
        const monthlyBurn = parseFloat(formData.monthlyBurn) || 0;
        return monthlyBurn > 0 ? cash / monthlyBurn : 0;
    }
};
