// ===========================
// Global State Management
// ===========================

const AppState = {
    currentStep: 1,
    totalSteps: 7,
    formData: {},
    scores: {},

    // Getters
    getCurrentStep() {
        return this.currentStep;
    },

    getTotalSteps() {
        return this.totalSteps;
    },

    getFormData() {
        return this.formData;
    },

    getScores() {
        return this.scores;
    },

    // Setters
    setCurrentStep(step) {
        this.currentStep = step;
    },

    updateFormData(key, value) {
        this.formData[key] = value;
    },

    updateScore(category, value) {
        this.scores[category] = value;
    },

    // Reset
    reset() {
        this.currentStep = 1;
        this.formData = {};
        this.scores = {};
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppState;
}
