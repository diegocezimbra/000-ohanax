// ===========================
// Market Attractiveness Calculation
// Porter's Five Forces
// ===========================

const MarketAttractiveness = {
    calculate() {
        const formData = AppState.getFormData();

        // Porter's Five Forces
        const newEntrants = parseInt(formData.newEntrants) || 3;
        const supplierPower = parseInt(formData.supplierPower) || 3;
        const buyerPower = parseInt(formData.buyerPower) || 3;
        const substitutes = parseInt(formData.substitutes) || 3;
        const rivalry = parseInt(formData.rivalry) || 3;

        const totalForces = newEntrants + supplierPower + buyerPower + substitutes + rivalry;
        const attractivenessScore = 100 - ((totalForces / 25) * 100);

        // Update UI
        const scoreElement = document.getElementById('marketAttractivenessScore');
        if (scoreElement) {
            scoreElement.textContent = attractivenessScore.toFixed(1) + '%';
        }

        // Calculate Bottom-Up TAM
        this.calculateBottomUpTAM();

        // Save to scores
        AppState.updateScore('marketAttractiveness', attractivenessScore);

        return attractivenessScore;
    },

    calculateBottomUpTAM() {
        const formData = AppState.getFormData();
        const potentialCustomers = parseFloat(formData.potentialCustomers) || 0;
        const avgRevenue = parseFloat(formData.avgRevenuePerCustomer) || 0;
        const bottomUpTAM = potentialCustomers * avgRevenue;

        const tamElement = document.getElementById('bottomUpTAM');
        if (tamElement) {
            tamElement.textContent = Utils.formatCurrency(bottomUpTAM);
        }

        return bottomUpTAM;
    },

    // Market size validation
    validateMarketSizes() {
        const formData = AppState.getFormData();
        const tam = parseFloat(formData.tam) || 0;
        const sam = parseFloat(formData.sam) || 0;
        const som = parseFloat(formData.som) || 0;

        const warnings = [];

        if (sam > tam) {
            warnings.push('SAM não pode ser maior que TAM');
        }

        if (som > sam) {
            warnings.push('SOM não pode ser maior que SAM');
        }

        if (sam / tam > 0.6) {
            warnings.push('SAM parece muito alto (>60% do TAM)');
        }

        if (som / sam > 0.3) {
            warnings.push('SOM parece ambicioso (>30% do SAM)');
        }

        return warnings;
    }
};
