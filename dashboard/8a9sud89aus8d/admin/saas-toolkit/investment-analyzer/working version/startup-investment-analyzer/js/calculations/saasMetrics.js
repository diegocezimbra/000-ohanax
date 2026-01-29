// ===========================
// SaaS Metrics Calculation
// NRR, Quick Ratio, Churn
// ===========================

const SaaSMetrics = {
    calculate() {
        const formData = AppState.getFormData();

        // Calculate MRR to ARR
        this.calculateARR();

        // Quick Ratio
        const quickRatio = this.calculateQuickRatio();

        // NRR Rating
        const nrr = this.calculateNRR();

        // Annual Churn
        const annualChurn = this.calculateAnnualChurn();

        // Calculate overall score
        const score = this.calculateScore(nrr, quickRatio, annualChurn);
        AppState.updateScore('saasMetrics', score);

        return score;
    },

    calculateARR() {
        const formData = AppState.getFormData();
        const mrr = parseFloat(formData.mrr) || 0;
        const arr = mrr * 12;

        document.getElementById('arr').value = arr;

        const arrElement = document.getElementById('arrCalculated');
        if (arrElement) {
            arrElement.textContent = Utils.formatCurrency(arr);
        }

        return arr;
    },

    calculateQuickRatio() {
        const formData = AppState.getFormData();
        const newMRR = parseFloat(formData.newMRR) || 0;
        const expansionMRR = parseFloat(formData.expansionMRR) || 0;
        const churnedMRR = parseFloat(formData.churnedMRR) || 0;
        const contractionMRR = parseFloat(formData.contractionMRR) || 0;

        const denominator = churnedMRR + contractionMRR;
        const quickRatio = denominator > 0 ? ((newMRR + expansionMRR) / denominator).toFixed(2) : '-';

        let rating = '';
        const qr = parseFloat(quickRatio);
        if (qr >= 4) rating = '⭐ Excelente';
        else if (qr >= 2) rating = '✓ Bom';
        else if (qr > 0) rating = '△ Precisa Melhorar';

        // Update UI
        const quickRatioElement = document.getElementById('quickRatio');
        const quickRatioRatingElement = document.getElementById('quickRatioRating');

        if (quickRatioElement) quickRatioElement.textContent = quickRatio;
        if (quickRatioRatingElement) quickRatioRatingElement.textContent = rating;

        return quickRatio;
    },

    calculateNRR() {
        const formData = AppState.getFormData();
        const nrr = parseFloat(formData.nrr) || 0;

        let rating = '';
        if (nrr >= 120) rating = '⭐ Best';
        else if (nrr >= 110) rating = '✓ Better';
        else if (nrr >= 100) rating = '○ Good';
        else if (nrr >= 90) rating = '△ Needs Improvement';
        else rating = '✗ Problemático';

        const nrrRatingElement = document.getElementById('nrrRating');
        if (nrrRatingElement) nrrRatingElement.textContent = rating;

        return nrr;
    },

    calculateAnnualChurn() {
        const formData = AppState.getFormData();
        const monthlyChurn = parseFloat(formData.monthlyChurn) || 0;
        const annualChurn = (1 - Math.pow(1 - monthlyChurn / 100, 12)) * 100;

        const annualChurnElement = document.getElementById('annualChurn');
        if (annualChurnElement) {
            annualChurnElement.textContent = annualChurn.toFixed(1) + '%';
        }

        return annualChurn;
    },

    calculateScore(nrr, quickRatio, annualChurn) {
        let score = 0;

        // NRR scoring (0-40 points)
        if (nrr >= 120) score += 40;
        else if (nrr >= 110) score += 35;
        else if (nrr >= 100) score += 30;
        else if (nrr >= 90) score += 20;
        else score += 10;

        // Quick Ratio (0-30 points)
        const qr = parseFloat(quickRatio);
        if (qr >= 4) score += 30;
        else if (qr >= 2) score += 20;
        else if (qr >= 1) score += 10;

        // Churn (0-30 points)
        if (annualChurn <= 5) score += 30;
        else if (annualChurn <= 10) score += 25;
        else if (annualChurn <= 20) score += 15;
        else if (annualChurn <= 30) score += 10;

        return score;
    }
};
