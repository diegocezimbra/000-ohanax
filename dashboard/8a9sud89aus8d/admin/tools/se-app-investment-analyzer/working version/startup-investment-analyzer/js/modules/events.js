// ===========================
// Event Listeners Module
// ===========================

const Events = {
    initialize() {
        this.setupNavigationButtons();
        this.setupRangeInputs();
        this.setupFormInputs();
        this.setupSpecialFields();
    },

    setupNavigationButtons() {
        document.getElementById('prevBtn')?.addEventListener('click', () => {
            Navigation.previousStep();
        });

        document.getElementById('nextBtn')?.addEventListener('click', () => {
            Navigation.nextStep();
        });

        document.getElementById('generateReportBtn')?.addEventListener('click', () => {
            Report.generate();
        });
    },

    setupRangeInputs() {
        const rangeInputs = document.querySelectorAll('input[type="range"]');
        rangeInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                Utils.updateRangeValue(e.target);
                this.handleFormUpdate();
            });
        });
    },

    setupFormInputs() {
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('input', () => this.handleFormUpdate());
            input.addEventListener('change', () => this.handleFormUpdate());
        });
    },

    setupSpecialFields() {
        // MRR auto-calculate ARR
        const mrrInput = document.getElementById('mrr');
        if (mrrInput) {
            mrrInput.addEventListener('input', (e) => {
                const arr = parseFloat(e.target.value) * 12;
                const arrInput = document.getElementById('arr');
                if (arrInput) {
                    arrInput.value = arr || 0;
                }
            });
        }

        // Stage change - update ownership benchmark
        const stageSelect = document.getElementById('stage');
        if (stageSelect) {
            stageSelect.addEventListener('change', () => {
                this.updateOwnershipBenchmark();
            });
        }
    },

    handleFormUpdate() {
        this.saveFormData();
        this.calculateAllMetrics();
    },

    saveFormData() {
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            AppState.updateFormData(input.id, input.value);
        });

        // Save to localStorage
        Utils.saveToLocalStorage('startupAnalyzerData', AppState.getFormData());
    },

    calculateAllMetrics() {
        // Calculate all metrics
        FounderMarketFit.calculate();
        MarketAttractiveness.calculate();
        PMF.calculate();
        SaaSMetrics.calculate();
        UnitEconomics.calculate();

        // Update live score
        Scoring.updateLiveScore();
    },

    updateOwnershipBenchmark() {
        const formData = AppState.getFormData();
        const stage = formData.stage || document.getElementById('stage')?.value;
        const benchmarkElement = document.getElementById('ownershipBenchmark');

        const benchmarks = {
            'pre-seed': 'Benchmark: 85-95% | Red flag: <80%',
            'seed': 'Benchmark: 70-85% | Red flag: <60%',
            'series-a': 'Benchmark: 55-70% | Red flag: <50%',
            'series-b': 'Benchmark: 40-55% | Red flag: <35%',
            'series-c': 'Benchmark: 30-45% | Red flag: <25%',
            'growth': 'Benchmark: 25-40% | Red flag: <20%'
        };

        if (benchmarkElement && benchmarks[stage]) {
            benchmarkElement.textContent = benchmarks[stage];
        }
    }
};
