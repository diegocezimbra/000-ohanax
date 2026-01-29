// ===========================
// Utility Functions
// ===========================

const Utils = {
    // Format currency
    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    },

    // Format percentage
    formatPercentage(value, decimals = 1) {
        return `${value.toFixed(decimals)}%`;
    },

    // Format large numbers (K, M, B)
    formatNumber(value) {
        if (value >= 1000000000) {
            return `$${(value / 1000000000).toFixed(1)}B`;
        }
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}K`;
        }
        return this.formatCurrency(value);
    },

    // Get form value safely
    getFormValue(id, defaultValue = 0) {
        const element = document.getElementById(id);
        if (!element) return defaultValue;

        const value = element.value;
        if (value === '' || value === null || value === undefined) {
            return defaultValue;
        }

        // Try to parse as number
        const numValue = parseFloat(value);
        return isNaN(numValue) ? defaultValue : numValue;
    },

    // Get form text value
    getFormText(id, defaultValue = '') {
        const element = document.getElementById(id);
        return element ? element.value.trim() : defaultValue;
    },

    // Save form data to localStorage
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    },

    // Load form data from localStorage
    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error loading from localStorage:', e);
            return null;
        }
    },

    // Update range input display
    updateRangeValue(input) {
        const valueDisplay = input.parentElement.querySelector('.range-value');
        if (valueDisplay) {
            valueDisplay.textContent = input.value;
        }
    },

    // Update all range values
    updateAllRangeValues() {
        const rangeInputs = document.querySelectorAll('input[type="range"]');
        rangeInputs.forEach(input => this.updateRangeValue(input));
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
