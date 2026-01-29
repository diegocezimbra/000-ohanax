// ===========================
// Main Application Entry Point
// Startup Investment Analyzer
// ===========================

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    console.log('🚀 Initializing Startup Investment Analyzer...');

    // Load saved data if exists
    loadSavedData();

    // Initialize event listeners
    Events.initialize();

    // Update UI
    Navigation.updateProgressBar();
    Navigation.updateNavigationButtons();
    Utils.updateAllRangeValues();

    // Initial calculations
    Events.calculateAllMetrics();

    console.log('✅ Application initialized successfully');
}

function loadSavedData() {
    const savedData = Utils.loadFromLocalStorage('startupAnalyzerData');

    if (savedData) {
        console.log('📂 Loading saved data...');

        // Populate form fields with saved data
        Object.keys(savedData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = savedData[key];
                AppState.updateFormData(key, savedData[key]);
            }
        });

        // Update range displays
        Utils.updateAllRangeValues();

        console.log('✅ Saved data loaded');
    }
}

// Export for global access if needed
window.StartupAnalyzer = {
    state: AppState,
    navigation: Navigation,
    validation: Validation,
    utils: Utils,
    events: Events,
    scoring: Scoring,
    report: Report
};
