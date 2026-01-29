// ===========================
// Report Helper Functions
// ===========================

const ReportHelpers = {
    getVerdict(score) {
        if (score >= 85) {
            return { class: 'excellent', icon: '🚀', text: 'Investimento Altamente Recomendado' };
        }
        if (score >= 75) {
            return { class: 'good', icon: '✅', text: 'Forte Candidato a Investimento' };
        }
        if (score >= 65) {
            return { class: 'moderate', icon: '⚠️', text: 'Potencial com Ressalvas' };
        }
        if (score >= 50) {
            return { class: 'weak', icon: '⚡', text: 'Requer Melhorias Significativas' };
        }
        return { class: 'poor', icon: '❌', text: 'Não Recomendado' };
    },

    getRecommendation(score) {
        const formData = AppState.getFormData();

        if (score >= 85) {
            return `<p><strong>PASS - Forte Recomendação:</strong> Esta startup demonstra métricas excepcionais
            em múltiplas dimensões. Equipe forte, tração comprovada, e unit economics saudáveis.
            Recomenda-se <strong>DD completo e term sheet</strong> nas próximas 2 semanas.</p>`;
        }

        if (score >= 75) {
            return `<p><strong>PASS com Condições:</strong> Startup demonstra bom potencial mas com alguns
            pontos de atenção. Recomenda-se <strong>aprofundar DD</strong> especialmente em:
            ${this.getAreasNeedingAttention()}. Se endereçado satisfatoriamente, pode ser excelente investimento.</p>`;
        }

        if (score >= 65) {
            return `<p><strong>MAYBE:</strong> Startup tem elementos promissores mas também riscos significativos.
            Recomenda-se <strong>follow-on call</strong> para entender melhor: ${this.getAreasNeedingAttention()}.
            Considerar novamente em 3-6 meses após progresso em áreas críticas.</p>`;
        }

        return `<p><strong>PASS (por enquanto):</strong> Startup ainda não demonstrou maturidade suficiente
        para investimento neste momento. Principais gaps: ${this.getAreasNeedingAttention()}.
        Sugerir reconectar quando atingirem marcos específicos.</p>`;
    },

    getAreasNeedingAttention() {
        const scores = AppState.getScores();
        const areas = [];

        if (scores.team < 70) areas.push('Equipe/Founder-Market Fit');
        if (scores.pmf < 70) areas.push('Product-Market Fit');
        if (scores.saasMetrics < 60) areas.push('Métricas SaaS (NRR/Churn)');
        if (scores.unitEconomics < 60) areas.push('Unit Economics');

        return areas.length > 0 ? areas.join(', ') : 'métricas gerais';
    },

    getARRBenchmark() {
        const formData = AppState.getFormData();
        const stage = formData.stage;

        const benchmarks = {
            'pre-seed': '$0-50K',
            'seed': '$100K-500K',
            'series-a': '$1M-3M',
            'series-b': '$7M-15M',
            'series-c': '$20M+',
            'growth': '$50M+'
        };

        return `Benchmark: ${benchmarks[stage] || 'N/A'}`;
    },

    getGrowthBenchmark() {
        const formData = AppState.getFormData();
        const stage = formData.stage;

        const benchmarks = {
            'pre-seed': '200%+',
            'seed': '200%+',
            'series-a': '115%+',
            'series-b': '95%+',
            'series-c': '70%+',
            'growth': '60%+'
        };

        const target = benchmarks[stage] || '100%+';
        return `Benchmark: ${target}`;
    },

    getGrowthBenchmarkValue(stage) {
        const benchmarks = {
            'pre-seed': 200,
            'seed': 200,
            'series-a': 115,
            'series-b': 95,
            'series-c': 70,
            'growth': 60
        };

        return benchmarks[stage] || 100;
    },

    generateCategoryScoreCards() {
        const scores = AppState.getScores();
        const categories = [
            { name: 'Equipe', score: scores.team || 0, weight: 20 },
            { name: 'Mercado', score: scores.market || 0, weight: 15 },
            { name: 'Produto', score: scores.product || 0, weight: 12 },
            { name: 'Moat', score: scores.moat || 0, weight: 8 },
            { name: 'Financeiro', score: scores.financial || 0, weight: 18 },
            { name: 'Tração', score: scores.traction || 0, weight: 10 },
            { name: 'Valuation', score: scores.valuation || 0, weight: 7 },
            { name: 'Risco', score: scores.risk || 0, weight: 5 },
            { name: 'Exit Potential', score: scores.exit || 0, weight: 5 }
        ];

        return categories.map(cat => `
            <div class="category-score-card">
                <div class="category-name">${cat.name}</div>
                <div class="category-score">${cat.score.toFixed(0)}</div>
                <div class="category-weight">Peso: ${cat.weight}%</div>
            </div>
        `).join('');
    },

    generateKeyMetrics() {
        const formData = AppState.getFormData();
        const arr = parseFloat(formData.arr) || parseFloat(formData.mrr) * 12 || 0;
        const nrr = parseFloat(formData.nrr) || 0;
        const growthRate = parseFloat(formData.growthRate) || 0;
        const grossMargin = parseFloat(formData.grossMargin) || 0;
        const seanEllis = parseFloat(formData.seanEllis) || 0;
        const totalCustomers = parseFloat(formData.totalCustomers) || 0;

        const metrics = [
            { label: 'ARR', value: Utils.formatCurrency(arr), benchmark: this.getARRBenchmark() },
            { label: 'NRR', value: nrr.toFixed(0) + '%', benchmark: 'Benchmark: ≥120%' },
            { label: 'Growth Rate', value: growthRate.toFixed(0) + '%', benchmark: this.getGrowthBenchmark() },
            { label: 'Gross Margin', value: grossMargin.toFixed(1) + '%', benchmark: 'Benchmark: ≥70%' },
            { label: 'Sean Ellis PMF', value: seanEllis.toFixed(0) + '%', benchmark: 'Benchmark: ≥40%' },
            { label: 'Clientes', value: totalCustomers, benchmark: '-' }
        ];

        return metrics.map(m => `
            <div class="key-metric">
                <div class="key-metric-label">${m.label}</div>
                <div class="key-metric-value">${m.value}</div>
                <div class="key-metric-benchmark">${m.benchmark}</div>
            </div>
        `).join('');
    }
};
