// ===========================
// Scoring Module
// Total score calculation with weighted categories
// ===========================

const Scoring = {
    weights: {
        team: 0.20,
        market: 0.15,
        product: 0.12,
        moat: 0.08,
        financial: 0.18,
        traction: 0.10,
        valuation: 0.07,
        risk: 0.05,
        exit: 0.05
    },

    calculateTotal() {
        const scores = AppState.getScores();

        const teamScore = this.calculateTeamScore();
        const marketScore = scores.marketAttractiveness || 50;
        const productScore = scores.pmf || 50;
        const moatScore = this.calculateMoatScore();
        const financialScore = scores.unitEconomics || 50;
        const tractionScore = scores.saasMetrics || 50;
        const valuationScore = this.calculateValuationScore();
        const riskScore = 70; // Default
        const exitScore = 70; // Default

        const totalScore =
            (teamScore * this.weights.team) +
            (marketScore * this.weights.market) +
            (productScore * this.weights.product) +
            (moatScore * this.weights.moat) +
            (financialScore * this.weights.financial) +
            (tractionScore * this.weights.traction) +
            (valuationScore * this.weights.valuation) +
            (riskScore * this.weights.risk) +
            (exitScore * this.weights.exit);

        // Store individual scores
        AppState.updateScore('team', teamScore);
        AppState.updateScore('market', marketScore);
        AppState.updateScore('product', productScore);
        AppState.updateScore('moat', moatScore);
        AppState.updateScore('financial', financialScore);
        AppState.updateScore('traction', tractionScore);
        AppState.updateScore('valuation', valuationScore);
        AppState.updateScore('risk', riskScore);
        AppState.updateScore('exit', exitScore);
        AppState.updateScore('total', totalScore);

        return totalScore;
    },

    calculateTeamScore() {
        const scores = AppState.getScores();
        const formData = AppState.getFormData();

        const founderMarketFit = scores.founderMarketFit || 0;
        const maxFounderScore = 35;
        const founderScore = (founderMarketFit / maxFounderScore) * 50;

        const commitment = this.mapCommitment(formData.founderCommitment);
        const technical = this.mapTechnical(formData.technicalTeam);
        const dynamics = this.mapDynamics(formData.teamDynamics);

        const teamFactorsScore = ((commitment + technical + dynamics) / 15) * 50;

        return founderScore + teamFactorsScore;
    },

    mapCommitment(value) {
        const mapping = {
            '100% full-time, all-in': 5,
            'Full-time recente': 4,
            'Full-time + side project': 3,
            'Part-time planejando full-time': 2,
            'Part-time sem planos de full-time': 1
        };
        return mapping[value] || 0;
    },

    mapTechnical(value) {
        const mapping = {
            'CTO experiente + time senior': 5,
            'Founder técnico + time em construção': 4,
            'Founder técnico mas sem time': 3,
            'Founder non-tech + CTO contratado': 2,
            'Sem founder técnico, tudo terceirizado': 1
        };
        return mapping[value] || 0;
    },

    mapDynamics(value) {
        const mapping = {
            'Trabalharam juntos com sucesso antes': 5,
            'Se conhecem bem, roles claros': 4,
            'Conhecidos recentes mas alinhados': 3,
            'Co-founders sem histórico prévio': 2,
            'Conflitos ou falta de alinhamento': 1
        };
        return mapping[value] || 0;
    },

    calculateMoatScore() {
        const formData = AppState.getFormData();
        const nrr = parseFloat(formData.nrr) || 0;
        const differentiation = this.mapDifferentiation(formData.differentiation);
        const logoRetention = parseFloat(formData.logoRetention) || 0;

        let score = 0;

        // NRR (0-50 points)
        if (nrr >= 120) score += 50;
        else if (nrr >= 110) score += 40;
        else if (nrr >= 100) score += 30;
        else if (nrr >= 90) score += 20;
        else score += 10;

        // Differentiation (0-30 points)
        score += (differentiation / 5) * 30;

        // Logo Retention (0-20 points)
        if (logoRetention >= 90) score += 20;
        else if (logoRetention >= 80) score += 15;
        else if (logoRetention >= 70) score += 10;
        else score += 5;

        return score;
    },

    mapDifferentiation(value) {
        const mapping = {
            '10x melhor que alternativas': 5,
            'Claramente superior em múltiplos aspectos': 4,
            'Diferenciação moderada': 3,
            'Similar mas com twist': 2,
            'Me-too product': 1
        };
        return mapping[value] || 0;
    },

    calculateValuationScore() {
        const formData = AppState.getFormData();
        const arr = parseFloat(formData.arr) || parseFloat(formData.mrr) * 12 || 0;
        const currentValuation = parseFloat(formData.currentValuation) || 0;

        if (arr === 0 || currentValuation === 0) return 50;

        const multiple = currentValuation / arr;
        const vertical = formData.vertical || 'horizontal-saas';

        const benchmarkMultiples = {
            'ai-native': { ideal: 12, max: 20 },
            'cybersecurity': { ideal: 8, max: 12 },
            'devtools': { ideal: 8, max: 12 },
            'fintech': { ideal: 7, max: 10 },
            'vertical-saas': { ideal: 7, max: 10 },
            'healthcare': { ideal: 6, max: 9 },
            'horizontal-saas': { ideal: 5, max: 8 }
        };

        const benchmark = benchmarkMultiples[vertical] || benchmarkMultiples['horizontal-saas'];

        if (multiple <= benchmark.ideal) return 100;
        if (multiple <= benchmark.max) return 80;
        if (multiple <= benchmark.max * 1.5) return 60;
        return 40;
    },

    updateLiveScore() {
        const totalScore = this.calculateTotal();
        const scoreElement = document.querySelector('#liveScore .score-value');

        if (scoreElement) {
            scoreElement.textContent = totalScore.toFixed(0) + '/100';

            // Color coding
            if (totalScore >= 80) scoreElement.style.color = '#10b981';
            else if (totalScore >= 70) scoreElement.style.color = '#3b82f6';
            else if (totalScore >= 60) scoreElement.style.color = '#f59e0b';
            else scoreElement.style.color = '#ef4444';
        }

        return totalScore;
    }
};
