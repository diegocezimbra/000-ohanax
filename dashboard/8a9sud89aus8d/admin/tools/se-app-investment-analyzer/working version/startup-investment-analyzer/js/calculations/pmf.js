// ===========================
// Product-Market Fit Calculation
// Sean Ellis Test + Retention
// ===========================

const PMF = {
    calculate() {
        const formData = AppState.getFormData();

        const seanEllis = parseFloat(formData.seanEllis) || 0;
        const cohortRetention = parseFloat(formData.cohortRetention) || 0;
        const monthlyChurn = parseFloat(formData.monthlyChurn) || 100;

        const status = this.getStatus(seanEllis, cohortRetention, monthlyChurn);
        const score = this.getScore(seanEllis);

        // Update UI
        this.updateUI(status);

        // Calculate DAU/MAU
        this.calculateDAUMAU();

        // Save to scores
        AppState.updateScore('pmf', score);

        return score;
    },

    getStatus(seanEllis, cohortRetention, monthlyChurn) {
        if (seanEllis >= 40 && cohortRetention >= 35 && monthlyChurn < 5) {
            return '🎯 Strong PMF';
        }
        if (seanEllis >= 30 && cohortRetention >= 15) {
            return '✓ Early PMF';
        }
        if (seanEllis >= 20) {
            return '○ Emerging PMF';
        }
        return '△ Pre-PMF';
    },

    getScore(seanEllis) {
        if (seanEllis >= 40) return 90;
        if (seanEllis >= 30) return 70;
        if (seanEllis >= 20) return 50;
        return 30;
    },

    updateUI(status) {
        const statusElement = document.getElementById('pmfStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    },

    calculateDAUMAU() {
        const formData = AppState.getFormData();
        const dau = parseFloat(formData.dau) || 0;
        const mau = parseFloat(formData.mau) || 0;

        let ratio = '-';
        let rating = '';

        if (mau > 0) {
            const ratioValue = (dau / mau) * 100;
            ratio = ratioValue.toFixed(1) + '%';

            if (ratioValue >= 30) rating = '⭐ Excelente';
            else if (ratioValue >= 20) rating = '✓ Bom';
            else if (ratioValue >= 10) rating = '○ Adequado';
            else rating = '△ Baixo';
        }

        const ratioElement = document.getElementById('dauMauRatio');
        if (ratioElement) {
            ratioElement.textContent = ratio;
        }

        return ratio;
    },

    // Benchmark guidance
    getBenchmark(vertical) {
        const benchmarks = {
            'Social': { target: 30, good: 20 },
            'SaaS': { target: 20, good: 15 },
            'E-commerce': { target: 15, good: 10 },
            'Marketplace': { target: 25, good: 18 }
        };

        return benchmarks[vertical] || benchmarks['SaaS'];
    }
};
