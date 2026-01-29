// ===========================
// Global State
// ===========================
let currentStep = 1;
const totalSteps = 7;
let formData = {};
let scores = {};

// ===========================
// Initialize App
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updateProgressBar();
    updateRangeValues();
    calculateLiveMetrics();
});

// ===========================
// Event Listeners
// ===========================
function initializeEventListeners() {
    // Navigation buttons
    document.getElementById('prevBtn').addEventListener('click', previousStep);
    document.getElementById('nextBtn').addEventListener('click', nextStep);
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);

    // Range inputs - update display values
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            updateRangeValue(e.target);
            calculateLiveMetrics();
        });
    });

    // All form inputs - trigger live calculations
    const formInputs = document.querySelectorAll('input, select, textarea');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            saveFormData();
            calculateLiveMetrics();
        });
        input.addEventListener('change', () => {
            saveFormData();
            calculateLiveMetrics();
        });
    });

    // MRR auto-calculate ARR
    document.getElementById('mrr').addEventListener('input', (e) => {
        const arr = parseFloat(e.target.value) * 12;
        document.getElementById('arr').value = arr || 0;
    });

    // Stage change - update ownership benchmark
    document.getElementById('stage').addEventListener('change', updateOwnershipBenchmark);
}

// ===========================
// Navigation Functions
// ===========================
function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            changeStep(currentStep + 1);
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        changeStep(currentStep - 1);
    }
}

function changeStep(step) {
    // Hide current step
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('completed');

    // Show new step
    currentStep = step;
    document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');

    // Update buttons
    updateNavigationButtons();
    updateProgressBar();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const generateBtn = document.getElementById('generateReportBtn');

    prevBtn.style.display = currentStep === 1 ? 'none' : 'block';

    if (currentStep === totalSteps) {
        nextBtn.style.display = 'none';
        generateBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        generateBtn.style.display = 'none';
    }
}

function updateProgressBar() {
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.querySelector('.progress-bar::before') ||
        document.styleSheets[0].insertRule(
            `.progress-bar::before { width: ${progress}% !important; }`, 0
        );

    // Update via inline style for immediate effect
    const progressBar = document.querySelector('.progress-bar');
    progressBar.style.setProperty('--progress', `${progress}%`);
}

// ===========================
// Validation
// ===========================
function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.form-step[data-step="${currentStep}"]`);
    const requiredInputs = currentStepElement.querySelectorAll('[required]');

    let isValid = true;
    requiredInputs.forEach(input => {
        if (!input.value || input.value === '') {
            isValid = false;
            input.style.borderColor = 'var(--danger)';

            // Remove error styling after user starts typing
            input.addEventListener('input', () => {
                input.style.borderColor = '';
            }, { once: true });
        }
    });

    if (!isValid) {
        alert('Por favor, preencha todos os campos obrigatórios marcados com *');
    }

    return isValid;
}

// ===========================
// Form Data Management
// ===========================
function saveFormData() {
    const form = document.getElementById('investmentForm');
    const formDataObj = new FormData(form);

    formData = {};
    for (let [key, value] of formDataObj.entries()) {
        formData[key] = value;
    }

    // Handle checkboxes separately
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (!formData[checkbox.name]) {
            formData[checkbox.name] = [];
        }
        if (checkbox.checked) {
            if (!Array.isArray(formData[checkbox.name])) {
                formData[checkbox.name] = [];
            }
            formData[checkbox.name].push(checkbox.value);
        }
    });
}

// ===========================
// Range Input Updates
// ===========================
function updateRangeValues() {
    const ranges = {
        'obsession': 'obsessionValue',
        'domainKnowledge': 'domainKnowledgeValue',
        'trackRecord': 'trackRecordValue',
        'networkAccess': 'networkAccessValue',
        'personalExperience': 'personalExperienceValue',
        'newEntrants': 'newEntrantsValue',
        'supplierPower': 'supplierPowerValue',
        'buyerPower': 'buyerPowerValue',
        'substitutes': 'substitutesValue',
        'rivalry': 'rivalryValue'
    };

    Object.keys(ranges).forEach(rangeId => {
        const input = document.getElementById(rangeId);
        if (input) {
            updateRangeValue(input);
        }
    });
}

function updateRangeValue(input) {
    const valueDisplay = document.getElementById(input.id + 'Value');
    if (valueDisplay) {
        valueDisplay.textContent = input.value;
    }
}

// ===========================
// Live Metric Calculations
// ===========================
function calculateLiveMetrics() {
    saveFormData();

    // Founder-Market Fit Score
    calculateFounderMarketFit();

    // Market Attractiveness
    calculateMarketAttractiveness();

    // PMF Status
    calculatePMFStatus();

    // SaaS Metrics
    calculateSaaSMetrics();

    // Unit Economics
    calculateUnitEconomics();

    // Update live score
    updateLiveScore();
}

// ===========================
// Founder-Market Fit Calculation
// ===========================
function calculateFounderMarketFit() {
    const obsession = parseInt(formData.obsession) || 0;
    const domainKnowledge = parseInt(formData.domainKnowledge) || 0;
    const trackRecord = parseInt(formData.trackRecord) || 0;
    const networkAccess = parseInt(formData.networkAccess) || 0;
    const personalExperience = parseInt(formData.personalExperience) || 0;
    const industryExperience = parseInt(formData.industryExperience) || 0;
    const previousStartup = parseInt(formData.previousStartup) || 0;

    const totalScore = obsession + domainKnowledge + trackRecord +
                      networkAccess + personalExperience + industryExperience +
                      previousStartup;

    let rating = '';
    if (totalScore >= 30) rating = '⭐ Excepcional';
    else if (totalScore >= 22) rating = '✓ Forte';
    else if (totalScore >= 15) rating = '○ Moderado';
    else if (totalScore >= 8) rating = '△ Fraco';
    else rating = 'Insuficiente';

    const scoreElement = document.getElementById('founderMarketFitScore');
    const ratingElement = document.getElementById('founderMarketFitRating');

    if (scoreElement) scoreElement.textContent = totalScore;
    if (ratingElement) ratingElement.textContent = rating;

    scores.founderMarketFit = totalScore;
    return totalScore;
}

// ===========================
// Market Attractiveness Calculation
// ===========================
function calculateMarketAttractiveness() {
    const newEntrants = parseInt(formData.newEntrants) || 3;
    const supplierPower = parseInt(formData.supplierPower) || 3;
    const buyerPower = parseInt(formData.buyerPower) || 3;
    const substitutes = parseInt(formData.substitutes) || 3;
    const rivalry = parseInt(formData.rivalry) || 3;

    const totalForces = newEntrants + supplierPower + buyerPower + substitutes + rivalry;
    const attractivenessScore = 100 - ((totalForces / 25) * 100);

    const scoreElement = document.getElementById('marketAttractivenessScore');
    if (scoreElement) {
        scoreElement.textContent = attractivenessScore.toFixed(1) + '%';
    }

    // Bottom-Up TAM Validation
    const potentialCustomers = parseFloat(formData.potentialCustomers) || 0;
    const avgRevenue = parseFloat(formData.avgRevenuePerCustomer) || 0;
    const bottomUpTAM = potentialCustomers * avgRevenue;

    const tamElement = document.getElementById('bottomUpTAM');
    if (tamElement) {
        tamElement.textContent = formatCurrency(bottomUpTAM);
    }

    scores.marketAttractiveness = attractivenessScore;
    return attractivenessScore;
}

// ===========================
// PMF Status Calculation
// ===========================
function calculatePMFStatus() {
    const seanEllis = parseFloat(formData.seanEllis) || 0;
    const cohortRetention = parseFloat(formData.cohortRetention) || 0;
    const monthlyChurn = parseFloat(formData.monthlyChurn) || 100;

    let pmfStatus = '';
    if (seanEllis >= 40 && cohortRetention >= 35 && monthlyChurn < 5) {
        pmfStatus = '🎯 Strong PMF';
    } else if (seanEllis >= 30 && cohortRetention >= 15) {
        pmfStatus = '✓ Early PMF';
    } else if (seanEllis >= 20) {
        pmfStatus = '○ Emerging PMF';
    } else {
        pmfStatus = '△ Pre-PMF';
    }

    const statusElement = document.getElementById('pmfStatus');
    if (statusElement) statusElement.textContent = pmfStatus;

    // DAU/MAU Ratio
    const dau = parseFloat(formData.dau) || 0;
    const mau = parseFloat(formData.mau) || 0;
    const dauMauRatio = mau > 0 ? ((dau / mau) * 100).toFixed(1) + '%' : '-';

    const ratioElement = document.getElementById('dauMauRatio');
    if (ratioElement) ratioElement.textContent = dauMauRatio;

    scores.pmf = seanEllis >= 40 ? 90 : seanEllis >= 30 ? 70 : seanEllis >= 20 ? 50 : 30;
    return scores.pmf;
}

// ===========================
// SaaS Metrics Calculation
// ===========================
function calculateSaaSMetrics() {
    const mrr = parseFloat(formData.mrr) || 0;
    const arr = mrr * 12;

    document.getElementById('arr').value = arr;

    const arrElement = document.getElementById('arrCalculated');
    if (arrElement) arrElement.textContent = formatCurrency(arr);

    // Quick Ratio
    const newMRR = parseFloat(formData.newMRR) || 0;
    const expansionMRR = parseFloat(formData.expansionMRR) || 0;
    const churnedMRR = parseFloat(formData.churnedMRR) || 0;
    const contractionMRR = parseFloat(formData.contractionMRR) || 0;

    const denominator = churnedMRR + contractionMRR;
    const quickRatio = denominator > 0 ? ((newMRR + expansionMRR) / denominator).toFixed(2) : '-';

    let quickRatioRating = '';
    const qr = parseFloat(quickRatio);
    if (qr >= 4) quickRatioRating = '⭐ Excelente';
    else if (qr >= 2) quickRatioRating = '✓ Bom';
    else if (qr > 0) quickRatioRating = '△ Precisa Melhorar';

    const quickRatioElement = document.getElementById('quickRatio');
    const quickRatioRatingElement = document.getElementById('quickRatioRating');

    if (quickRatioElement) quickRatioElement.textContent = quickRatio;
    if (quickRatioRatingElement) quickRatioRatingElement.textContent = quickRatioRating;

    // NRR Rating
    const nrr = parseFloat(formData.nrr) || 0;
    let nrrRating = '';
    if (nrr >= 120) nrrRating = '⭐ Best';
    else if (nrr >= 110) nrrRating = '✓ Better';
    else if (nrr >= 100) nrrRating = '○ Good';
    else if (nrr >= 90) nrrRating = '△ Needs Improvement';
    else nrrRating = '✗ Problemático';

    const nrrRatingElement = document.getElementById('nrrRating');
    if (nrrRatingElement) nrrRatingElement.textContent = nrrRating;

    // Annual Churn
    const monthlyChurn = parseFloat(formData.monthlyChurn) || 0;
    const annualChurn = (1 - Math.pow(1 - monthlyChurn / 100, 12)) * 100;

    const annualChurnElement = document.getElementById('annualChurn');
    if (annualChurnElement) annualChurnElement.textContent = annualChurn.toFixed(1) + '%';

    scores.saasMetrics = calculateSaaSMetricsScore(nrr, quickRatio, annualChurn);
}

function calculateSaaSMetricsScore(nrr, quickRatio, annualChurn) {
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

// ===========================
// Unit Economics Calculation
// ===========================
function calculateUnitEconomics() {
    const salesMarketingSpend = parseFloat(formData.salesMarketingSpend) || 0;
    const newCustomersQuarter = parseFloat(formData.newCustomersQuarter) || 0;
    const arpa = parseFloat(formData.arpa) || 0;
    const grossMargin = parseFloat(formData.grossMargin) || 0;
    const monthlyChurn = parseFloat(formData.monthlyChurn) || 0.1;
    const growthRate = parseFloat(formData.growthRate) || 0;
    const ebitdaMargin = parseFloat(formData.ebitdaMargin) || 0;

    // CAC
    const cac = newCustomersQuarter > 0 ? salesMarketingSpend / newCustomersQuarter : 0;
    document.getElementById('cacDisplay').value = formatCurrency(cac);

    // LTV
    const ltv = monthlyChurn > 0 ? (arpa * (grossMargin / 100)) / (monthlyChurn / 100) : 0;
    document.getElementById('ltvDisplay').value = formatCurrency(ltv);

    // LTV/CAC
    const ltvCac = cac > 0 ? ltv / cac : 0;
    document.getElementById('ltvCacDisplay').value = ltvCac > 0 ? ltvCac.toFixed(2) + ':1' : '-';

    let ltvCacRating = '';
    if (ltvCac >= 5) ltvCacRating = '⭐ Excelente';
    else if (ltvCac >= 3) ltvCacRating = '✓ Ideal';
    else if (ltvCac >= 2) ltvCacRating = '○ Aceitável';
    else if (ltvCac > 0) ltvCacRating = '△ Insustentável';

    const ltvCacRatioDisplay = document.getElementById('ltvCacRatioDisplay');
    const ltvCacRatingDisplay = document.getElementById('ltvCacRating');
    if (ltvCacRatioDisplay) ltvCacRatioDisplay.textContent = ltvCac > 0 ? ltvCac.toFixed(2) : '-';
    if (ltvCacRatingDisplay) ltvCacRatingDisplay.textContent = ltvCacRating;

    // CAC Payback
    const cacPayback = (arpa * (grossMargin / 100)) > 0 ? cac / (arpa * (grossMargin / 100)) : 0;
    document.getElementById('cacPaybackDisplay').value = cacPayback > 0 ? cacPayback.toFixed(1) + ' meses' : '-';

    let cacPaybackRating = '';
    if (cacPayback > 0 && cacPayback <= 6) cacPaybackRating = '⭐ Best';
    else if (cacPayback <= 12) cacPaybackRating = '✓ Better';
    else if (cacPayback <= 18) cacPaybackRating = '○ Good';
    else if (cacPayback <= 24) cacPaybackRating = '△ Aceitável';
    else cacPaybackRating = '✗ Preocupante';

    const cacPaybackMonths = document.getElementById('cacPaybackMonths');
    const cacPaybackRatingEl = document.getElementById('cacPaybackRating');
    if (cacPaybackMonths) cacPaybackMonths.textContent = cacPayback > 0 ? cacPayback.toFixed(1) + 'm' : '-';
    if (cacPaybackRatingEl) cacPaybackRatingEl.textContent = cacPaybackRating;

    // Rule of 40
    const ruleOf40 = growthRate + ebitdaMargin;
    document.getElementById('ruleOf40Display').value = ruleOf40.toFixed(1) + '%';

    let ruleOf40Rating = '';
    if (ruleOf40 >= 60) ruleOf40Rating = '⭐ Top Tier';
    else if (ruleOf40 >= 40) ruleOf40Rating = '✓ Excelente';
    else if (ruleOf40 >= 20) ruleOf40Rating = '○ Moderado';
    else ruleOf40Rating = '△ Abaixo do esperado';

    const ruleOf40Score = document.getElementById('ruleOf40Score');
    const ruleOf40RatingEl = document.getElementById('ruleOf40Rating');
    if (ruleOf40Score) ruleOf40Score.textContent = ruleOf40.toFixed(1);
    if (ruleOf40RatingEl) ruleOf40RatingEl.textContent = ruleOf40Rating;

    // Runway
    const cash = parseFloat(formData.cash) || 0;
    const monthlyBurn = parseFloat(formData.monthlyBurn) || 0;
    const runway = monthlyBurn > 0 ? cash / monthlyBurn : 0;
    document.getElementById('runwayDisplay').value = runway > 0 ? runway.toFixed(1) + ' meses' : '-';

    const runwayMonths = document.getElementById('runwayMonths');
    if (runwayMonths) runwayMonths.textContent = runway > 0 ? runway.toFixed(1) + ' meses' : '-';

    // Magic Number
    const arr = parseFloat(formData.arr) || parseFloat(formData.mrr) * 12 || 0;
    const previousQuarterARR = parseFloat(formData.previousQuarterARR) || 0;
    const magicNumber = salesMarketingSpend > 0 ? ((arr - previousQuarterARR) * 4) / salesMarketingSpend : 0;
    document.getElementById('magicNumberDisplay').value = magicNumber > 0 ? magicNumber.toFixed(2) : '-';

    scores.unitEconomics = calculateUnitEconomicsScore(ltvCac, cacPayback, ruleOf40);
}

function calculateUnitEconomicsScore(ltvCac, cacPayback, ruleOf40) {
    let score = 0;

    // LTV/CAC (0-40 points)
    if (ltvCac >= 5) score += 40;
    else if (ltvCac >= 3) score += 35;
    else if (ltvCac >= 2) score += 25;
    else if (ltvCac > 0) score += 10;

    // CAC Payback (0-30 points)
    if (cacPayback > 0 && cacPayback <= 6) score += 30;
    else if (cacPayback <= 12) score += 25;
    else if (cacPayback <= 18) score += 20;
    else if (cacPayback <= 24) score += 15;

    // Rule of 40 (0-30 points)
    if (ruleOf40 >= 60) score += 30;
    else if (ruleOf40 >= 40) score += 25;
    else if (ruleOf40 >= 20) score += 15;
    else if (ruleOf40 >= 0) score += 5;

    return score;
}

// ===========================
// Ownership Benchmark Update
// ===========================
function updateOwnershipBenchmark() {
    const stage = formData.stage || document.getElementById('stage').value;
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

// ===========================
// Live Score Update
// ===========================
function updateLiveScore() {
    const totalScore = calculateTotalScore();
    const scoreElement = document.querySelector('#liveScore .score-value');

    if (scoreElement) {
        scoreElement.textContent = totalScore.toFixed(0) + '/100';

        // Color coding
        if (totalScore >= 80) {
            scoreElement.style.color = '#10b981';
        } else if (totalScore >= 70) {
            scoreElement.style.color = '#3b82f6';
        } else if (totalScore >= 60) {
            scoreElement.style.color = '#f59e0b';
        } else {
            scoreElement.style.color = '#ef4444';
        }
    }
}

// ===========================
// Total Score Calculation
// ===========================
function calculateTotalScore() {
    const weights = {
        team: 0.20,
        market: 0.15,
        product: 0.12,
        moat: 0.08,
        financial: 0.18,
        traction: 0.10,
        valuation: 0.07,
        risk: 0.05,
        exit: 0.05
    };

    // Team Score (0-100)
    const teamScore = calculateTeamScore();

    // Market Score (0-100)
    const marketScore = scores.marketAttractiveness || 50;

    // Product Score (0-100)
    const productScore = scores.pmf || 50;

    // Moat Score (0-100) - based on NRR and differentiation
    const moatScore = calculateMoatScore();

    // Financial Score (0-100)
    const financialScore = scores.unitEconomics || 50;

    // Traction Score (0-100)
    const tractionScore = scores.saasMetrics || 50;

    // Valuation Score (0-100)
    const valuationScore = calculateValuationScore();

    // Risk Score (0-100)
    const riskScore = 70; // Default, could be expanded

    // Exit Score (0-100)
    const exitScore = 70; // Default, could be expanded

    const totalScore =
        (teamScore * weights.team) +
        (marketScore * weights.market) +
        (productScore * weights.product) +
        (moatScore * weights.moat) +
        (financialScore * weights.financial) +
        (tractionScore * weights.traction) +
        (valuationScore * weights.valuation) +
        (riskScore * weights.risk) +
        (exitScore * weights.exit);

    // Store individual scores
    scores.team = teamScore;
    scores.market = marketScore;
    scores.product = productScore;
    scores.moat = moatScore;
    scores.financial = financialScore;
    scores.traction = tractionScore;
    scores.valuation = valuationScore;
    scores.risk = riskScore;
    scores.exit = exitScore;
    scores.total = totalScore;

    return totalScore;
}

function calculateTeamScore() {
    const founderMarketFit = scores.founderMarketFit || 0;
    const maxFounderScore = 35; // Max possible from 7 categories
    const founderScore = (founderMarketFit / maxFounderScore) * 50;

    const commitment = parseInt(formData.founderCommitment) || 0;
    const technical = parseInt(formData.technicalTeam) || 0;
    const dynamics = parseInt(formData.teamDynamics) || 0;

    const teamFactorsScore = ((commitment + technical + dynamics) / 15) * 50;

    return founderScore + teamFactorsScore;
}

function calculateMoatScore() {
    const nrr = parseFloat(formData.nrr) || 0;
    const differentiation = parseInt(formData.differentiation) || 0;
    const logoRetention = parseFloat(formData.logoRetention) || 0;

    let score = 0;

    // NRR (0-50 points)
    if (nrr >= 120) score += 50;
    else if (nrr >= 110) score += 40;
    else if (nrr >= 100) score += 30;
    else if (nrr >= 90) score += 20;
    else score += 10;

    // Differentiation (0-30 points)
    score += (differentiation / 5) * 30;

    // Logo Retention (0-20 points)
    if (logoRetention >= 90) score += 20;
    else if (logoRetention >= 80) score += 15;
    else if (logoRetention >= 70) score += 10;
    else score += 5;

    return score;
}

function calculateValuationScore() {
    // Simplified valuation scoring based on multiple vs ARR
    const arr = parseFloat(formData.arr) || parseFloat(formData.mrr) * 12 || 0;
    const currentValuation = parseFloat(formData.currentValuation) || 0;

    if (arr === 0 || currentValuation === 0) return 50;

    const multiple = currentValuation / arr;
    const vertical = formData.vertical || 'horizontal-saas';

    const benchmarkMultiples = {
        'ai-native': { ideal: 12, max: 20 },
        'cybersecurity': { ideal: 8, max: 12 },
        'devtools': { ideal: 8, max: 12 },
        'fintech': { ideal: 7, max: 10 },
        'vertical-saas': { ideal: 7, max: 10 },
        'healthcare': { ideal: 6, max: 9 },
        'horizontal-saas': { ideal: 5, max: 8 }
    };

    const benchmark = benchmarkMultiples[vertical] || benchmarkMultiples['horizontal-saas'];

    if (multiple <= benchmark.ideal) return 100;
    else if (multiple <= benchmark.max) return 80;
    else if (multiple <= benchmark.max * 1.5) return 60;
    else if (multiple <= benchmark.max * 2) return 40;
    else return 20;
}

// ===========================
// Report Generation
// ===========================
function generateReport() {
    saveFormData();
    calculateLiveMetrics();

    const totalScore = calculateTotalScore();
    const report = generateReportHTML(totalScore);

    document.getElementById('finalReport').innerHTML = report;

    // Auto-scroll to report
    setTimeout(() => {
        document.getElementById('finalReport').scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function generateReportHTML(totalScore) {
    const verdict = getVerdict(totalScore);
    const recommendation = getRecommendation(totalScore);

    return `
        <div class="report-header">
            <h3>${formData.companyName || 'Startup'}</h3>
            <div class="report-score">${totalScore.toFixed(0)}/100</div>
            <div class="report-verdict ${verdict.class}">${verdict.icon} ${verdict.text}</div>
        </div>

        <div class="report-section">
            <h4>📊 Breakdown de Score por Categoria</h4>
            <div class="category-scores">
                ${generateCategoryScoreCards()}
            </div>
        </div>

        <div class="report-section">
            <h4>🎯 Métricas-Chave</h4>
            <div class="key-metrics-grid">
                ${generateKeyMetrics()}
            </div>
        </div>

        <div class="report-section">
            <h4>💡 Insights & Análise</h4>
            <ul class="insights-list">
                ${generateInsights()}
            </ul>
        </div>

        <div class="report-section">
            <h4>✅ Pontos Fortes</h4>
            <ul class="insights-list">
                ${generateStrengths()}
            </ul>
        </div>

        <div class="report-section">
            <h4>⚠️ Pontos de Atenção & Riscos</h4>
            <ul class="insights-list">
                ${generateWeaknesses()}
            </ul>
        </div>

        <div class="recommendation-box">
            <h5>🎯 Recomendação Final</h5>
            ${recommendation}
        </div>

        <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 2px solid var(--gray-200);">
            <button class="btn btn-primary" onclick="window.print()" style="margin-right: 1rem;">
                🖨️ Imprimir Relatório
            </button>
            <button class="btn btn-secondary" onclick="location.reload()">
                🔄 Nova Análise
            </button>
        </div>
    `;
}

function generateCategoryScoreCards() {
    const categories = [
        { name: 'Equipe', score: scores.team, weight: 20 },
        { name: 'Mercado', score: scores.market, weight: 15 },
        { name: 'Produto', score: scores.product, weight: 12 },
        { name: 'Moat', score: scores.moat, weight: 8 },
        { name: 'Financeiro', score: scores.financial, weight: 18 },
        { name: 'Tração', score: scores.traction, weight: 10 },
        { name: 'Valuation', score: scores.valuation, weight: 7 },
        { name: 'Risco', score: scores.risk, weight: 5 },
        { name: 'Exit Potential', score: scores.exit, weight: 5 }
    ];

    return categories.map(cat => `
        <div class="category-score-card">
            <div class="category-name">${cat.name}</div>
            <div class="category-score">${cat.score.toFixed(0)}</div>
            <div class="category-weight">Peso: ${cat.weight}%</div>
        </div>
    `).join('');
}

function generateKeyMetrics() {
    const arr = parseFloat(formData.arr) || parseFloat(formData.mrr) * 12 || 0;
    const nrr = parseFloat(formData.nrr) || 0;
    const growthRate = parseFloat(formData.growthRate) || 0;
    const grossMargin = parseFloat(formData.grossMargin) || 0;
    const seanEllis = parseFloat(formData.seanEllis) || 0;
    const totalCustomers = parseFloat(formData.totalCustomers) || 0;

    const metrics = [
        { label: 'ARR', value: formatCurrency(arr), benchmark: getARRBenchmark() },
        { label: 'NRR', value: nrr.toFixed(0) + '%', benchmark: 'Benchmark: ≥120%' },
        { label: 'Growth Rate', value: growthRate.toFixed(0) + '%', benchmark: getGrowthBenchmark() },
        { label: 'Gross Margin', value: grossMargin.toFixed(1) + '%', benchmark: 'Benchmark: ≥70%' },
        { label: 'Sean Ellis PMF', value: seanEllis.toFixed(0) + '%', benchmark: 'Benchmark: ≥40%' },
        { label: 'Clientes', value: totalCustomers, benchmark: '-' }
    ];

    return metrics.map(m => `
        <div class="key-metric">
            <div class="key-metric-label">${m.label}</div>
            <div class="key-metric-value">${m.value}</div>
            <div class="key-metric-benchmark">${m.benchmark}</div>
        </div>
    `).join('');
}

function generateInsights() {
    const insights = [];

    // Founder-Market Fit
    const fmf = scores.founderMarketFit || 0;
    if (fmf >= 22) {
        insights.push('<li class="positive">✓ <strong>Founder-Market Fit Excepcional:</strong> Equipe demonstra profundo conhecimento do mercado e obsessão pelo problema.</li>');
    } else if (fmf < 15) {
        insights.push('<li class="negative">✗ <strong>Founder-Market Fit Fraco:</strong> Equipe pode não ter a experiência ou conexão necessária com o mercado.</li>');
    }

    // PMF
    const seanEllis = parseFloat(formData.seanEllis) || 0;
    if (seanEllis >= 40) {
        insights.push('<li class="positive">✓ <strong>Product-Market Fit Atingido:</strong> Sean Ellis score acima do benchmark de 40%.</li>');
    } else if (seanEllis < 30) {
        insights.push('<li class="warning">△ <strong>PMF em Construção:</strong> Produto ainda buscando fit forte com mercado.</li>');
    }

    // NRR
    const nrr = parseFloat(formData.nrr) || 0;
    if (nrr >= 120) {
        insights.push('<li class="positive">✓ <strong>NRR Excepcional (≥120%):</strong> Forte expansion revenue, comanda múltiplos premium (10-15x ARR).</li>');
    } else if (nrr < 100) {
        insights.push('<li class="negative">✗ <strong>NRR Abaixo de 100%:</strong> Receita está contraindo, sinal de churn alto ou falta de expansion.</li>');
    }

    // Market Size
    const tam = parseFloat(formData.tam) || 0;
    if (tam >= 1000000000) {
        insights.push('<li class="positive">✓ <strong>Mercado de $1B+:</strong> TAM suficientemente grande para suportar outcome unicórnio.</li>');
    } else if (tam < 100000000) {
        insights.push('<li class="warning">△ <strong>Mercado Pequeno:</strong> TAM pode limitar potencial de exit para valores significativos.</li>');
    }

    // Growth Rate
    const growthRate = parseFloat(formData.growthRate) || 0;
    const stage = formData.stage;
    const growthBenchmark = getGrowthBenchmarkValue(stage);
    if (growthRate >= growthBenchmark * 1.2) {
        insights.push('<li class="positive">✓ <strong>Crescimento Acelerado:</strong> Growth rate está acima do top quartile para o estágio.</li>');
    }

    return insights.join('');
}

function generateStrengths() {
    const strengths = [];

    // Team
    if (scores.team >= 80) {
        strengths.push('<li class="positive">Equipe fundadora excepcional com forte founder-market fit</li>');
    }

    // NRR
    const nrr = parseFloat(formData.nrr) || 0;
    if (nrr >= 110) {
        strengths.push('<li class="positive">Excelente Net Revenue Retention indicando forte expansion e baixo churn</li>');
    }

    // Gross Margin
    const grossMargin = parseFloat(formData.grossMargin) || 0;
    if (grossMargin >= 75) {
        strengths.push('<li class="positive">Gross margins saudáveis acima de 75%</li>');
    }

    // Unit Economics
    const ltvCacRaw = calculateLTVCAC();
    if (ltvCacRaw >= 3) {
        strengths.push('<li class="positive">Unit economics fortes com LTV/CAC ≥3:1</li>');
    }

    // Market
    if (scores.marketAttractiveness >= 70) {
        strengths.push('<li class="positive">Mercado atrativo com barreiras de entrada favoráveis</li>');
    }

    // Differentiation
    const diff = parseInt(formData.differentiation) || 0;
    if (diff >= 4) {
        strengths.push('<li class="positive">Diferenciação clara de produto vs competidores</li>');
    }

    if (strengths.length === 0) {
        strengths.push('<li>Analise em andamento - preencha mais dados para identificar pontos fortes</li>');
    }

    return strengths.join('');
}

function generateWeaknesses() {
    const weaknesses = [];

    // Runway
    const cash = parseFloat(formData.cash) || 0;
    const monthlyBurn = parseFloat(formData.monthlyBurn) || 0;
    const runway = monthlyBurn > 0 ? cash / monthlyBurn : 999;
    if (runway < 12) {
        weaknesses.push('<li class="warning">⚠️ Runway abaixo de 12 meses - capital adicional necessário em breve</li>');
    }

    // Customer Concentration
    const concentration = parseFloat(formData.customerConcentration) || 0;
    if (concentration > 50) {
        weaknesses.push('<li class="warning">⚠️ Alta concentração de clientes (>50% em top 10) representa risco</li>');
    }

    // Churn
    const monthlyChurn = parseFloat(formData.monthlyChurn) || 0;
    if (monthlyChurn > 5) {
        weaknesses.push('<li class="negative">✗ Churn mensal elevado (>5%) indica problemas de retenção</li>');
    }

    // LTV/CAC
    const ltvCac = calculateLTVCAC();
    if (ltvCac < 2 && ltvCac > 0) {
        weaknesses.push('<li class="negative">✗ LTV/CAC abaixo de 2:1 - modelo pode ser insustentável</li>');
    }

    // PMF
    const seanEllis = parseFloat(formData.seanEllis) || 0;
    if (seanEllis < 30) {
        weaknesses.push('<li class="warning">⚠️ PMF ainda em construção - Sean Ellis score abaixo de 30%</li>');
    }

    // Founder Ownership
    const ownership = parseFloat(formData.founderOwnership) || 0;
    const stage = formData.stage;
    const ownershipBenchmark = getOwnershipBenchmark(stage);
    if (ownership < ownershipBenchmark.redFlag) {
        weaknesses.push('<li class="negative">✗ Founder ownership muito baixo para o estágio - potencial problema de motivação</li>');
    }

    // Competition
    const numCompetitors = parseInt(formData.numCompetitors) || 0;
    if (numCompetitors > 10) {
        weaknesses.push('<li class="warning">⚠️ Mercado altamente competitivo com 10+ competidores diretos</li>');
    }

    if (weaknesses.length === 0) {
        weaknesses.push('<li class="positive">Nenhum red flag crítico identificado</li>');
    }

    return weaknesses.join('');
}

function getVerdict(score) {
    if (score >= 80) {
        return { text: 'STRONG INVEST', icon: '🟢', class: 'success' };
    } else if (score >= 70) {
        return { text: 'INVEST', icon: '🟢', class: 'success' };
    } else if (score >= 60) {
        return { text: 'CONDITIONAL', icon: '🟡', class: 'warning' };
    } else if (score >= 50) {
        return { text: 'HOLD', icon: '🟡', class: 'warning' };
    } else if (score >= 40) {
        return { text: 'WEAK PASS', icon: '🟠', class: 'danger' };
    } else {
        return { text: 'STRONG PASS', icon: '🔴', class: 'danger' };
    }
}

function getRecommendation(score) {
    const companyName = formData.companyName || 'Esta startup';

    if (score >= 80) {
        return `
            <p><strong>Recomendação: Prosseguir agressivamente com due diligence final.</strong></p>
            <p>${companyName} demonstra métricas excepcionais e potencial para se tornar um líder de categoria. A combinação de equipe forte, PMF claro e unit economics saudáveis posiciona bem para crescimento acelerado.</p>
            <p><strong>Próximos Passos:</strong></p>
            <ul>
                <li>Due diligence legal e financeiro completo</li>
                <li>Reference calls com clientes e membros da equipe</li>
                <li>Technical due diligence aprofundado</li>
                <li>Preparar term sheet competitivo</li>
            </ul>
        `;
    } else if (score >= 70) {
        return `
            <p><strong>Recomendação: Investimento recomendado com due diligence padrão.</strong></p>
            <p>${companyName} apresenta fundamentos sólidos e está no caminho certo. Algumas áreas precisam de atenção mas o potencial geral é positivo.</p>
            <p><strong>Próximos Passos:</strong></p>
            <ul>
                <li>Due diligence focada nas áreas de preocupação identificadas</li>
                <li>Validação de métricas chave com dados financeiros</li>
                <li>Conversas sobre plano de mitigação de riscos</li>
                <li>Negociação de termos apropriados ao perfil de risco</li>
            </ul>
        `;
    } else if (score >= 60) {
        return `
            <p><strong>Recomendação: Condicional - investimento apenas com melhorias ou termos ajustados.</strong></p>
            <p>${companyName} tem potencial mas apresenta gaps significativos que precisam ser endereçados antes de prosseguir.</p>
            <p><strong>Condições Recomendadas:</strong></p>
            <ul>
                <li>Demonstração de melhoria nas métricas de retenção/churn</li>
                <li>Fortalecimento da equipe em áreas críticas</li>
                <li>Valuation ajustada ao perfil de risco</li>
                <li>Milestones claros antes de tranches adicionais</li>
            </ul>
        `;
    } else if (score >= 50) {
        return `
            <p><strong>Recomendação: HOLD - aguardar melhorias significativas antes de reconsiderar.</strong></p>
            <p>${companyName} ainda não está pronta para investimento neste momento. Recomendamos manter contato e reavaliar quando métricas melhorarem.</p>
            <p><strong>Áreas que Precisam Melhoria:</strong></p>
            <ul>
                <li>Fortalecer Product-Market Fit</li>
                <li>Melhorar unit economics</li>
                <li>Reduzir churn e aumentar retenção</li>
                <li>Validar tamanho de mercado e timing</li>
            </ul>
        `;
    } else {
        return `
            <p><strong>Recomendação: PASS - não investir neste momento.</strong></p>
            <p>${companyName} apresenta múltiplos red flags e riscos significativos que tornam o investimento inadequado no momento atual.</p>
            <p><strong>Razões Principais:</strong></p>
            <ul>
                <li>Métricas fundamentais abaixo de benchmarks aceitáveis</li>
                <li>Riscos de execução significativos</li>
                <li>Unit economics insustentáveis</li>
                <li>PMF não demonstrado adequadamente</li>
            </ul>
            <p>Recomendamos passar nesta oportunidade e focar recursos em empresas com perfil de risco-retorno mais favorável.</p>
        `;
    }
}

// ===========================
// Helper Functions
// ===========================
function formatCurrency(value) {
    if (value >= 1000000000) {
        return '$' + (value / 1000000000).toFixed(2) + 'B';
    } else if (value >= 1000000) {
        return '$' + (value / 1000000).toFixed(2) + 'M';
    } else if (value >= 1000) {
        return '$' + (value / 1000).toFixed(2) + 'K';
    } else {
        return '$' + value.toFixed(2);
    }
}

function getARRBenchmark() {
    const stage = formData.stage;
    const benchmarks = {
        'pre-seed': '<$100K',
        'seed': '$0-$1M',
        'series-a': '$1-$5M',
        'series-b': '$5-$15M',
        'series-c': '$15M+',
        'growth': '$50M+'
    };
    return 'Benchmark: ' + (benchmarks[stage] || '-');
}

function getGrowthBenchmark() {
    const stage = formData.stage;
    const benchmarks = {
        'pre-seed': 'N/A',
        'seed': '200%+',
        'series-a': '100-150%',
        'series-b': '80-120%',
        'series-c': '50-80%',
        'growth': '40-60%'
    };
    return 'Benchmark: ' + (benchmarks[stage] || '-');
}

function getGrowthBenchmarkValue(stage) {
    const benchmarks = {
        'pre-seed': 200,
        'seed': 200,
        'series-a': 100,
        'series-b': 80,
        'series-c': 50,
        'growth': 40
    };
    return benchmarks[stage] || 100;
}

function getOwnershipBenchmark(stage) {
    const benchmarks = {
        'pre-seed': { ideal: 90, redFlag: 80 },
        'seed': { ideal: 77.5, redFlag: 60 },
        'series-a': { ideal: 62.5, redFlag: 50 },
        'series-b': { ideal: 47.5, redFlag: 35 },
        'series-c': { ideal: 37.5, redFlag: 25 },
        'growth': { ideal: 32.5, redFlag: 20 }
    };
    return benchmarks[stage] || { ideal: 50, redFlag: 30 };
}

function calculateLTVCAC() {
    const salesMarketingSpend = parseFloat(formData.salesMarketingSpend) || 0;
    const newCustomersQuarter = parseFloat(formData.newCustomersQuarter) || 0;
    const arpa = parseFloat(formData.arpa) || 0;
    const grossMargin = parseFloat(formData.grossMargin) || 0;
    const monthlyChurn = parseFloat(formData.monthlyChurn) || 0.1;

    const cac = newCustomersQuarter > 0 ? salesMarketingSpend / newCustomersQuarter : 0;
    const ltv = monthlyChurn > 0 ? (arpa * (grossMargin / 100)) / (monthlyChurn / 100) : 0;

    return cac > 0 ? ltv / cac : 0;
}
