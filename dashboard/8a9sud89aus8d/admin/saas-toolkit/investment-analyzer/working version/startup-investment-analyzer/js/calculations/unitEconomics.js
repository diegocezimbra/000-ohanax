// ===========================
// Unit Economics Calculation
// LTV, CAC, Payback, Rule of 40, Magic Number
// ===========================

const UnitEconomics = {
    calculate() {
        const formData = AppState.getFormData();

        // Calculate all metrics
        const cac = this.calculateCAC();
        const ltv = this.calculateLTV();
        const ltvCac = this.calculateLTVCAC(ltv, cac);
        const cacPayback = this.calculateCACPayback(cac);
        const ruleOf40 = this.calculateRuleOf40();
        this.calculateRunway();
        this.calculateMagicNumber();

        // Calculate overall score
        const score = this.calculateScore(ltvCac, cacPayback, ruleOf40);
        AppState.updateScore('unitEconomics', score);

        return score;
    },

    calculateCAC() {
        const formData = AppState.getFormData();
        const salesMarketingSpend = parseFloat(formData.salesMarketingSpend) || 0;
        const newCustomersQuarter = parseFloat(formData.newCustomersQuarter) || 0;

        const cac = newCustomersQuarter > 0 ? salesMarketingSpend / newCustomersQuarter : 0;

        const cacDisplay = document.getElementById('cacDisplay');
        if (cacDisplay) cacDisplay.value = Utils.formatCurrency(cac);

        return cac;
    },

    calculateLTV() {
        const formData = AppState.getFormData();
        const arpa = parseFloat(formData.arpa) || 0;
        const grossMargin = parseFloat(formData.grossMargin) || 0;
        const monthlyChurn = parseFloat(formData.monthlyChurn) || 0.1;

        const ltv = monthlyChurn > 0 ? (arpa * (grossMargin / 100)) / (monthlyChurn / 100) : 0;

        const ltvDisplay = document.getElementById('ltvDisplay');
        if (ltvDisplay) ltvDisplay.value = Utils.formatCurrency(ltv);

        return ltv;
    },

    calculateLTVCAC(ltv, cac) {
        const ltvCac = cac > 0 ? ltv / cac : 0;

        // Update display fields
        const ltvCacDisplay = document.getElementById('ltvCacDisplay');
        if (ltvCacDisplay) {
            ltvCacDisplay.value = ltvCac > 0 ? ltvCac.toFixed(2) + ':1' : '-';
        }

        // Rating
        let rating = '';
        if (ltvCac >= 5) rating = '⭐ Excelente';
        else if (ltvCac >= 3) rating = '✓ Ideal';
        else if (ltvCac >= 2) rating = '○ Aceitável';
        else if (ltvCac > 0) rating = '△ Insustentável';

        const ltvCacRatioDisplay = document.getElementById('ltvCacRatioDisplay');
        const ltvCacRatingDisplay = document.getElementById('ltvCacRating');
        if (ltvCacRatioDisplay) ltvCacRatioDisplay.textContent = ltvCac > 0 ? ltvCac.toFixed(2) : '-';
        if (ltvCacRatingDisplay) ltvCacRatingDisplay.textContent = rating;

        return ltvCac;
    },

    calculateCACPayback(cac) {
        const formData = AppState.getFormData();
        const arpa = parseFloat(formData.arpa) || 0;
        const grossMargin = parseFloat(formData.grossMargin) || 0;

        const cacPayback = (arpa * (grossMargin / 100)) > 0 ? cac / (arpa * (grossMargin / 100)) : 0;

        const cacPaybackDisplay = document.getElementById('cacPaybackDisplay');
        if (cacPaybackDisplay) {
            cacPaybackDisplay.value = cacPayback > 0 ? cacPayback.toFixed(1) + ' meses' : '-';
        }

        // Rating
        let rating = '';
        if (cacPayback > 0 && cacPayback <= 6) rating = '⭐ Best';
        else if (cacPayback <= 12) rating = '✓ Better';
        else if (cacPayback <= 18) rating = '○ Good';
        else if (cacPayback <= 24) rating = '△ Aceitável';
        else rating = '✗ Preocupante';

        const cacPaybackMonths = document.getElementById('cacPaybackMonths');
        const cacPaybackRatingEl = document.getElementById('cacPaybackRating');
        if (cacPaybackMonths) cacPaybackMonths.textContent = cacPayback > 0 ? cacPayback.toFixed(1) + 'm' : '-';
        if (cacPaybackRatingEl) cacPaybackRatingEl.textContent = rating;

        return cacPayback;
    },

    calculateRuleOf40() {
        const formData = AppState.getFormData();
        const growthRate = parseFloat(formData.growthRate) || 0;
        const ebitdaMargin = parseFloat(formData.ebitdaMargin) || 0;

        const ruleOf40 = growthRate + ebitdaMargin;

        const ruleOf40Display = document.getElementById('ruleOf40Display');
        if (ruleOf40Display) ruleOf40Display.value = ruleOf40.toFixed(1) + '%';

        // Rating
        let rating = '';
        if (ruleOf40 >= 60) rating = '⭐ Top Tier';
        else if (ruleOf40 >= 40) rating = '✓ Excelente';
        else if (ruleOf40 >= 20) rating = '○ Moderado';
        else rating = '△ Abaixo do esperado';

        const ruleOf40Score = document.getElementById('ruleOf40Score');
        const ruleOf40RatingEl = document.getElementById('ruleOf40Rating');
        if (ruleOf40Score) ruleOf40Score.textContent = ruleOf40.toFixed(1);
        if (ruleOf40RatingEl) ruleOf40RatingEl.textContent = rating;

        return ruleOf40;
    },

    calculateRunway() {
        const formData = AppState.getFormData();
        const cash = parseFloat(formData.cash) || 0;
        const monthlyBurn = parseFloat(formData.monthlyBurn) || 0;

        const runway = monthlyBurn > 0 ? cash / monthlyBurn : 0;

        const runwayDisplay = document.getElementById('runwayDisplay');
        if (runwayDisplay) runwayDisplay.value = runway > 0 ? runway.toFixed(1) + ' meses' : '-';

        const runwayMonths = document.getElementById('runwayMonths');
        if (runwayMonths) runwayMonths.textContent = runway > 0 ? runway.toFixed(1) + ' meses' : '-';

        return runway;
    },

    calculateMagicNumber() {
        const formData = AppState.getFormData();
        const salesMarketingSpend = parseFloat(formData.salesMarketingSpend) || 0;
        const arr = parseFloat(formData.arr) || parseFloat(formData.mrr) * 12 || 0;
        const previousQuarterARR = parseFloat(formData.previousQuarterARR) || 0;

        const magicNumber = salesMarketingSpend > 0 ? ((arr - previousQuarterARR) * 4) / salesMarketingSpend : 0;

        const magicNumberDisplay = document.getElementById('magicNumberDisplay');
        if (magicNumberDisplay) magicNumberDisplay.value = magicNumber > 0 ? magicNumber.toFixed(2) : '-';

        return magicNumber;
    },

    calculateScore(ltvCac, cacPayback, ruleOf40) {
        let score = 0;

        // LTV/CAC (0-40 points)
        if (ltvCac >= 5) score += 40;
        else if (ltvCac >= 3) score += 35;
        else if (ltvCac >= 2) score += 25;
        else if (ltvCac >= 1) score += 15;

        // CAC Payback (0-30 points)
        if (cacPayback > 0 && cacPayback <= 6) score += 30;
        else if (cacPayback <= 12) score += 25;
        else if (cacPayback <= 18) score += 20;
        else if (cacPayback <= 24) score += 15;

        // Rule of 40 (0-30 points)
        if (ruleOf40 >= 60) score += 30;
        else if (ruleOf40 >= 40) score += 25;
        else if (ruleOf40 >= 20) score += 15;
        else if (ruleOf40 >= 0) score += 10;

        return score;
    }
};
