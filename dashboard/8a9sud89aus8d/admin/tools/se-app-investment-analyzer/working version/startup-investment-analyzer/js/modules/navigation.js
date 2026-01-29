// ===========================
// Navigation Module
// ===========================

const Navigation = {
    nextStep() {
        if (Validation.validateCurrentStep()) {
            if (AppState.getCurrentStep() < AppState.getTotalSteps()) {
                this.changeStep(AppState.getCurrentStep() + 1);
            }
        }
    },

    previousStep() {
        if (AppState.getCurrentStep() > 1) {
            this.changeStep(AppState.getCurrentStep() - 1);
        }
    },

    changeStep(step) {
        const currentStep = AppState.getCurrentStep();

        // Hide current step
        document.querySelector(`.form-step[data-step="${currentStep}"]`)?.classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep}"]`)?.classList.remove('active');
        document.querySelector(`.step[data-step="${currentStep}"]`)?.classList.add('completed');

        // Show new step
        AppState.setCurrentStep(step);
        document.querySelector(`.form-step[data-step="${step}"]`)?.classList.add('active');
        document.querySelector(`.step[data-step="${step}"]`)?.classList.add('active');

        // Update UI
        this.updateNavigationButtons();
        this.updateProgressBar();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const generateBtn = document.getElementById('generateReportBtn');
        const currentStep = AppState.getCurrentStep();

        prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';

        if (currentStep === AppState.getTotalSteps()) {
            nextBtn.style.display = 'none';
            generateBtn.style.display = 'inline-flex';
        } else {
            nextBtn.style.display = 'inline-flex';
            generateBtn.style.display = 'none';
        }
    },

    updateProgressBar() {
        const currentStep = AppState.getCurrentStep();
        const progress = ((currentStep - 1) / (AppState.getTotalSteps() - 1)) * 100;
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');

            if (stepNum < currentStep) {
                step.classList.add('completed');
            } else if (stepNum === currentStep) {
                step.classList.add('active');
            }
        });
    }
};
