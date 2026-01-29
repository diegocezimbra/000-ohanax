// ===========================
// Founder-Market Fit Calculation
// NFX Framework
// ===========================

const FounderMarketFit = {
    calculate() {
        const formData = AppState.getFormData();

        const obsession = parseInt(formData.obsession) || 0;
        const domainKnowledge = parseInt(formData.domainKnowledge) || 0;
        const trackRecord = parseInt(formData.trackRecord) || 0;
        const networkAccess = parseInt(formData.networkAccess) || 0;
        const personalExperience = parseInt(formData.personalExperience) || 0;
        const industryExperience = this.mapIndustryExperience(formData.industryExperience);
        const previousStartup = this.mapPreviousStartup(formData.previousStartup);

        const totalScore = obsession + domainKnowledge + trackRecord +
                          networkAccess + personalExperience +
                          industryExperience + previousStartup;

        const rating = this.getRating(totalScore);

        // Update UI
        this.updateUI(totalScore, rating);

        // Save to scores
        AppState.updateScore('founderMarketFit', totalScore);

        return totalScore;
    },

    mapIndustryExperience(value) {
        const mapping = {
            '10+ anos, expertise reconhecida': 5,
            '5-10 anos': 4,
            '2-5 anos': 3,
            '0-2 anos': 2,
            'Nenhuma experiência': 1
        };
        return mapping[value] || 0;
    },

    mapPreviousStartup(value) {
        const mapping = {
            'Exit $10M+': 5,
            'Startup com tração': 4,
            'Primeiro empreendimento mas background forte': 3,
            'Empresa familiar/pequeno negócio': 2,
            'Primeira vez empreendendo': 1
        };
        return mapping[value] || 0;
    },

    getRating(score) {
        if (score >= 30) return '⭐ Excepcional';
        if (score >= 22) return '✓ Forte';
        if (score >= 15) return '○ Moderado';
        if (score >= 8) return '△ Fraco';
        return 'Insuficiente';
    },

    updateUI(score, rating) {
        const scoreElement = document.getElementById('founderMarketFitScore');
        const ratingElement = document.getElementById('founderMarketFitRating');

        if (scoreElement) scoreElement.textContent = score;
        if (ratingElement) ratingElement.textContent = rating;
    }
};
