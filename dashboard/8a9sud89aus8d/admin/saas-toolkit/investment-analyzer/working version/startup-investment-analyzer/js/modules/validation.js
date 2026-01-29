// ===========================
// Validation Module
// ===========================

const Validation = {
    validateCurrentStep() {
        const currentStep = AppState.getCurrentStep();
        const stepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);

        if (!stepElement) return true;

        const requiredFields = stepElement.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;

        requiredFields.forEach(field => {
            this.clearError(field);

            if (!field.value || field.value.trim() === '') {
                this.showError(field, 'Este campo é obrigatório');
                isValid = false;
                if (!firstInvalidField) firstInvalidField = field;
            }
        });

        // Scroll to first invalid field
        if (firstInvalidField) {
            firstInvalidField.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            firstInvalidField.focus();
        }

        return isValid;
    },

    showError(field, message) {
        field.classList.add('error');

        // Remove existing error message
        const existingError = field.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        field.parentElement.appendChild(errorDiv);
    },

    clearError(field) {
        field.classList.remove('error');
        const errorMessage = field.parentElement.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    },

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validateNumber(value, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        if (min !== null && num < min) return false;
        if (max !== null && num > max) return false;
        return true;
    }
};
