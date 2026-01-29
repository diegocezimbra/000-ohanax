/**
 * ============================================
 * LANDING PAGE DE ALTA CONVERSÃO - MAIN JS
 * ============================================
 * 
 * Renderiza toda a página baseado no config.js
 * Otimizado para performance e Core Web Vitals
 * 
 * NÃO EDITE - configurações vêm do config.js
 */

document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  renderHeader();
  renderHero();
  renderLogoBar();
  renderProblem();
  renderSolution();
  renderBenefits();
  renderHowItWorks();
  renderTestimonials();
  renderComparison();
  renderPricing();
  renderGuarantee();
  renderFAQ();
  renderCtaFinal();
  renderFooter();
  renderStickyCta();
  renderWhatsApp();
  
  initScrollEffects();
  initFAQ();
  initPricingToggle();
  initAnalytics();
});

// ============================================
// APPLY THEME
// ============================================
function applyTheme() {
  const { theme } = CONFIG;
  const root = document.documentElement;
  
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--primary-dark', theme.primaryDark);
  root.style.setProperty('--cta', theme.cta);
  root.style.setProperty('--cta-hover', theme.ctaHover);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--dark', theme.dark);
  root.style.setProperty('--medium', theme.medium);
  root.style.setProperty('--light', theme.light);
  root.style.setProperty('--white', theme.white);
  root.style.setProperty('--danger', theme.danger);
  root.style.setProperty('--hero-gradient', theme.heroGradient);
  root.style.setProperty('--cta-gradient', theme.ctaGradient);
}

// ============================================
// RENDER HEADER
// ============================================
function renderHeader() {
  const { header } = CONFIG;
  const el = document.getElementById('header');
  
  const logoHTML = header.logo.image 
    ? `<img src="${header.logo.image}" alt="${header.logo.text}">`
    : `<span class="logo-icon">${header.logo.icon}</span><span>${header.logo.text}</span>`;
  
  el.innerHTML = `
    <div class="container">
      <div class="header-inner">
        <a href="#" class="logo">${logoHTML}</a>
        <a href="${header.cta.href}" class="btn btn-cta">${header.cta.text}</a>
      </div>
    </div>
  `;
}

// ============================================
// RENDER HERO
// ============================================
function renderHero() {
  const { hero } = CONFIG;
  const el = document.getElementById('hero');
  
  const badgeHTML = hero.badge.show 
    ? `<div class="hero-badge"><span>${hero.badge.icon}</span> ${hero.badge.text}</div>` 
    : '';
  
  const statsHTML = hero.stats.map(s => `
    <div class="hero-stat">
      <div class="hero-stat-value">${s.icon || ''}${s.value}</div>
      <div class="hero-stat-label">${s.label}</div>
    </div>
  `).join('');
  
  const secondaryCtaHTML = hero.cta.secondary.show 
    ? `<a href="${hero.cta.secondary.href}" class="hero-cta-secondary">
         <span>${hero.cta.secondary.icon || ''}</span> ${hero.cta.secondary.text}
       </a>` 
    : '';
  
  const mediaHTML = hero.media.type === 'video' && hero.media.videoId
    ? `<div class="hero-media">
         <iframe src="https://www.youtube.com/embed/${hero.media.videoId}" 
                 frameborder="0" allowfullscreen 
                 loading="lazy"></iframe>
       </div>`
    : hero.media.src 
      ? `<div class="hero-media">
           <img src="${hero.media.src}" alt="${hero.media.alt}" loading="eager">
         </div>` 
      : '';
  
  el.innerHTML = `
    <div class="container">
      <div class="hero-inner">
        <div class="hero-content">
          ${badgeHTML}
          <h1>
            ${hero.headline.before} 
            <span class="hero-highlight">${hero.headline.highlight}</span> 
            ${hero.headline.after}
          </h1>
          <p class="hero-subtitle">${hero.subheadline}</p>
          <div class="hero-ctas">
            <a href="${hero.cta.primary.href}" class="btn btn-cta btn-lg">
              ${hero.cta.primary.text}
              ${hero.cta.primary.subtext ? `<span class="btn-subtext">${hero.cta.primary.subtext}</span>` : ''}
            </a>
            ${secondaryCtaHTML}
          </div>
          <div class="hero-stats">${statsHTML}</div>
        </div>
        ${mediaHTML}
      </div>
    </div>
  `;
}

// ============================================
// RENDER LOGO BAR
// ============================================
function renderLogoBar() {
  const { logoBar } = CONFIG;
  if (!logoBar.show) return;
  
  const el = document.getElementById('logo-bar');
  
  const logosHTML = logoBar.logos.map(l => 
    `<img src="${l.src}" alt="${l.alt}" loading="lazy">`
  ).join('');
  
  el.innerHTML = `
    <div class="container">
      <p class="logo-bar-title">${logoBar.title}</p>
      <div class="logo-bar-logos">${logosHTML}</div>
    </div>
  `;
}

// ============================================
// RENDER PROBLEM
// ============================================
function renderProblem() {
  const { problem } = CONFIG;
  if (!problem.show) return;
  
  const el = document.getElementById('problem');
  
  const problemsHTML = problem.problems.map(p => `
    <div class="problem-card">
      <span class="problem-icon">${p.icon}</span>
      <div>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
      </div>
    </div>
  `).join('');
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${problem.headline}</h2>
        <p>${problem.subheadline}</p>
      </div>
      <div class="problem-grid">${problemsHTML}</div>
      ${problem.transition ? `<p class="problem-transition">${problem.transition}</p>` : ''}
    </div>
  `;
}

// ============================================
// RENDER SOLUTION
// ============================================
function renderSolution() {
  const { solution } = CONFIG;
  if (!solution.show) return;
  
  const el = document.getElementById('solution');
  
  const pointsHTML = solution.points.map(p => `
    <div class="solution-point">
      <div class="solution-point-icon">${p.icon}</div>
      <div>
        <h3>${p.title}</h3>
        <p>${p.description}</p>
      </div>
    </div>
  `).join('');
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${solution.headline}</h2>
        <p>${solution.subheadline}</p>
      </div>
      <div class="solution-inner">
        <div class="solution-media">
          <img src="${solution.media.src}" alt="${solution.media.alt}" loading="lazy">
        </div>
        <div class="solution-points">${pointsHTML}</div>
      </div>
    </div>
  `;
}

// ============================================
// RENDER BENEFITS
// ============================================
function renderBenefits() {
  const { benefits } = CONFIG;
  if (!benefits.show) return;
  
  const el = document.getElementById('benefits');
  
  const itemsHTML = benefits.items.map(b => `
    <div class="benefit-card">
      <div class="benefit-icon">${b.icon}</div>
      <h3>${b.title}</h3>
      <p>${b.description}</p>
      ${b.metric ? `<span class="benefit-metric">${b.metric}</span>` : ''}
    </div>
  `).join('');
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${benefits.headline}</h2>
        ${benefits.subheadline ? `<p>${benefits.subheadline}</p>` : ''}
      </div>
      <div class="benefits-grid">${itemsHTML}</div>
    </div>
  `;
}

// ============================================
// RENDER HOW IT WORKS
// ============================================
function renderHowItWorks() {
  const { howItWorks } = CONFIG;
  if (!howItWorks.show) return;
  
  const el = document.getElementById('how-it-works');
  
  const stepsHTML = howItWorks.steps.map(s => `
    <div class="step">
      <div class="step-number">${s.number}</div>
      <div class="step-icon">${s.icon}</div>
      <h3>${s.title}</h3>
      <p>${s.description}</p>
      ${s.image ? `<img src="${s.image}" alt="${s.title}" class="step-image" loading="lazy">` : ''}
    </div>
  `).join('');
  
  const ctaHTML = howItWorks.cta.show 
    ? `<div style="text-align: center; margin-top: 3rem;">
         <a href="${howItWorks.cta.href}" class="btn btn-cta btn-lg">${howItWorks.cta.text}</a>
       </div>` 
    : '';
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${howItWorks.headline}</h2>
        <p>${howItWorks.subheadline}</p>
      </div>
      <div class="steps">${stepsHTML}</div>
      ${ctaHTML}
    </div>
  `;
}

// ============================================
// RENDER TESTIMONIALS
// ============================================
function renderTestimonials() {
  const { testimonials } = CONFIG;
  if (!testimonials.show) return;
  
  const el = document.getElementById('testimonials');
  
  const highlightHTML = testimonials.highlight.show 
    ? `<div class="testimonials-highlight">
         <div class="testimonials-highlight-number">${testimonials.highlight.number}</div>
         <div class="testimonials-highlight-label">${testimonials.highlight.label}</div>
         <div class="testimonials-highlight-sublabel">${testimonials.highlight.sublabel}</div>
       </div>` 
    : '';
  
  const itemsHTML = testimonials.items.map(t => `
    <div class="testimonial-card">
      <div class="testimonial-rating">${'★'.repeat(t.rating)}</div>
      <p class="testimonial-quote">"${t.quote}"</p>
      ${t.metric ? `<span class="testimonial-metric">${t.metric}</span>` : ''}
      <div class="testimonial-author">
        ${t.avatar ? `<img src="${t.avatar}" alt="${t.author}" class="testimonial-avatar" loading="lazy">` : ''}
        <div>
          <div class="testimonial-name">${t.author}</div>
          <div class="testimonial-role">${t.role}</div>
        </div>
      </div>
    </div>
  `).join('');
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${testimonials.headline}</h2>
        ${testimonials.subheadline ? `<p>${testimonials.subheadline}</p>` : ''}
      </div>
      ${highlightHTML}
      <div class="testimonials-grid">${itemsHTML}</div>
    </div>
  `;
}

// ============================================
// RENDER COMPARISON
// ============================================
function renderComparison() {
  const { comparison } = CONFIG;
  if (!comparison.show) return;
  
  const el = document.getElementById('comparison');
  
  const beforeHTML = comparison.before.points.map(p => `<li>${p}</li>`).join('');
  const afterHTML = comparison.after.points.map(p => `<li>${p}</li>`).join('');
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${comparison.headline}</h2>
      </div>
      <div class="comparison-inner">
        <div class="comparison-column comparison-before">
          <h3>${comparison.before.title}</h3>
          <p class="comparison-subtitle">${comparison.before.subtitle}</p>
          <ul class="comparison-list">${beforeHTML}</ul>
        </div>
        <div class="comparison-column comparison-after">
          <h3>${comparison.after.title}</h3>
          <p class="comparison-subtitle">${comparison.after.subtitle}</p>
          <ul class="comparison-list">${afterHTML}</ul>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// RENDER PRICING
// ============================================
function renderPricing() {
  const { pricing } = CONFIG;
  if (!pricing.show) return;
  
  const el = document.getElementById('pricing');
  
  const badgeHTML = pricing.badge.show 
    ? `<div class="pricing-badge"><span>${pricing.badge.text}</span></div>` 
    : '';
  
  const toggleHTML = pricing.billingToggle.show 
    ? `<div class="pricing-toggle">
         <span class="pricing-toggle-label active" data-billing="monthly">${pricing.billingToggle.monthly}</span>
         <div class="pricing-toggle-switch" data-toggle="billing"></div>
         <span class="pricing-toggle-label" data-billing="annual">
           ${pricing.billingToggle.annual} 
           <strong style="color: var(--cta)">${pricing.billingToggle.annualDiscount}</strong>
         </span>
       </div>` 
    : '';
  
  const plansHTML = pricing.plans.map(plan => `
    <div class="pricing-card ${plan.highlighted ? 'highlighted' : ''}">
      ${plan.badge ? `<div class="pricing-card-badge">${plan.badge}</div>` : ''}
      <div class="pricing-name">${plan.name}</div>
      <p class="pricing-description">${plan.description}</p>
      <div class="pricing-price">
        <span data-price-monthly="${plan.price.monthly}" data-price-annual="${plan.price.annual}">
          ${plan.price.monthly}
        </span>
        <span class="pricing-period">${plan.period}</span>
      </div>
      <ul class="pricing-features">
        ${plan.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
      <a href="${plan.cta.href}" class="btn ${plan.highlighted ? 'btn-cta' : 'btn-outline'}">
        ${plan.cta.text}
      </a>
    </div>
  `).join('');
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${pricing.headline}</h2>
        <p>${pricing.subheadline}</p>
      </div>
      ${badgeHTML}
      ${toggleHTML}
      <div class="pricing-grid">${plansHTML}</div>
    </div>
  `;
}

// ============================================
// RENDER GUARANTEE
// ============================================
function renderGuarantee() {
  const { guarantee } = CONFIG;
  if (!guarantee.show) return;
  
  const el = document.getElementById('guarantee');
  
  const pointsHTML = guarantee.points.map(p => `<span>${p}</span>`).join('');
  
  const signatureHTML = guarantee.signature.show 
    ? `<div class="guarantee-signature">
         ${guarantee.signature.image ? `<img src="${guarantee.signature.image}" alt="${guarantee.signature.name}">` : ''}
         <div class="guarantee-signature-info">
           <div class="guarantee-signature-name">${guarantee.signature.name}</div>
           <div class="guarantee-signature-role">${guarantee.signature.role}</div>
         </div>
       </div>` 
    : '';
  
  el.innerHTML = `
    <div class="container">
      <div class="guarantee-inner">
        <div class="guarantee-icon">${guarantee.icon}</div>
        <h2>${guarantee.headline}</h2>
        <p>${guarantee.subheadline}</p>
        <div class="guarantee-points">${pointsHTML}</div>
        ${signatureHTML}
      </div>
    </div>
  `;
}

// ============================================
// RENDER FAQ
// ============================================
function renderFAQ() {
  const { faq } = CONFIG;
  if (!faq.show) return;
  
  const el = document.getElementById('faq');
  
  const itemsHTML = faq.items.map((item, i) => `
    <div class="faq-item" data-faq="${i}">
      <button class="faq-question">${item.question}</button>
      <div class="faq-answer"><p>${item.answer}</p></div>
    </div>
  `).join('');
  
  el.innerHTML = `
    <div class="container">
      <div class="section-header">
        <h2>${faq.headline}</h2>
        ${faq.subheadline ? `<p>${faq.subheadline}</p>` : ''}
      </div>
      <div class="faq-list">${itemsHTML}</div>
    </div>
  `;
}

// ============================================
// RENDER CTA FINAL
// ============================================
function renderCtaFinal() {
  const { ctaFinal } = CONFIG;
  if (!ctaFinal.show) return;
  
  const el = document.getElementById('cta-final');
  
  const urgencyHTML = ctaFinal.urgency.show 
    ? `<div class="cta-urgency">${ctaFinal.urgency.text}</div>` 
    : '';
  
  const trustHTML = ctaFinal.trustSignals.map(t => `<span>${t}</span>`).join('');
  
  el.innerHTML = `
    <div class="container">
      ${urgencyHTML}
      <h2>${ctaFinal.headline}</h2>
      <p>${ctaFinal.subheadline}</p>
      <a href="${ctaFinal.cta.href}" class="btn btn-cta btn-lg">
        ${ctaFinal.cta.text}
        ${ctaFinal.cta.subtext ? `<span class="btn-subtext">${ctaFinal.cta.subtext}</span>` : ''}
      </a>
      <div class="cta-trust">${trustHTML}</div>
    </div>
  `;
}

// ============================================
// RENDER FOOTER
// ============================================
function renderFooter() {
  const { footer } = CONFIG;
  const el = document.getElementById('footer');
  
  const linksHTML = footer.links.map(l => 
    `<a href="${l.href}">${l.text}</a>`
  ).join('');
  
  const socialIcons = {
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
  };
  
  const socialHTML = footer.social.map(s => 
    `<a href="${s.href}" target="_blank" rel="noopener">${socialIcons[s.icon] || ''}</a>`
  ).join('');
  
  const badgesHTML = footer.badges && footer.badges.length 
    ? `<div class="footer-badges">${footer.badges.map(b => `<img src="${b.src}" alt="${b.alt}" loading="lazy">`).join('')}</div>` 
    : '';
  
  el.innerHTML = `
    <div class="container">
      <div class="footer-inner">
        <a href="#" class="logo">
          <span class="logo-icon">${footer.logo.icon}</span>
          <span>${footer.logo.text}</span>
        </a>
        <p class="footer-tagline">${footer.tagline}</p>
        <div class="footer-links">${linksHTML}</div>
        <div class="footer-social">${socialHTML}</div>
        ${badgesHTML}
        <p class="footer-copyright">${footer.copyright}</p>
      </div>
    </div>
  `;
}

// ============================================
// RENDER STICKY CTA
// ============================================
function renderStickyCta() {
  const { stickyCta } = CONFIG;
  if (!stickyCta.show) return;
  
  const el = document.getElementById('sticky-cta');
  
  el.innerHTML = `
    <a href="${stickyCta.href}" class="btn btn-cta">${stickyCta.text}</a>
  `;
}

// ============================================
// RENDER WHATSAPP
// ============================================
function renderWhatsApp() {
  const { whatsapp } = CONFIG;
  if (!whatsapp.show) return;
  
  const el = document.getElementById('whatsapp-float');
  const msg = encodeURIComponent(whatsapp.message);
  
  el.innerHTML = `
    <a href="https://wa.me/${whatsapp.number}?text=${msg}" 
       class="whatsapp-float ${whatsapp.position}"
       target="_blank" 
       rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    </a>
  `;
}

// ============================================
// INTERACTIONS
// ============================================

// Scroll effects
function initScrollEffects() {
  const { stickyCta } = CONFIG;
  const stickyEl = document.getElementById('sticky-cta');
  
  if (stickyCta.show && stickyEl) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > stickyCta.showAfterScroll) {
        stickyEl.classList.add('visible');
      } else {
        stickyEl.classList.remove('visible');
      }
    }, { passive: true });
  }
}

// FAQ accordion
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  
  items.forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// Pricing toggle
function initPricingToggle() {
  const toggle = document.querySelector('[data-toggle="billing"]');
  if (!toggle) return;
  
  const labels = document.querySelectorAll('.pricing-toggle-label');
  const prices = document.querySelectorAll('[data-price-monthly]');
  
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('annual');
    const isAnnual = toggle.classList.contains('annual');
    
    labels.forEach(l => {
      l.classList.toggle('active', 
        (isAnnual && l.dataset.billing === 'annual') || 
        (!isAnnual && l.dataset.billing === 'monthly')
      );
    });
    
    prices.forEach(p => {
      p.textContent = isAnnual ? p.dataset.priceAnnual : p.dataset.priceMonthly;
    });
  });
}

// Analytics
function initAnalytics() {
  const { analytics } = CONFIG;
  
  // Google Analytics 4
  if (analytics.googleAnalytics) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${analytics.googleAnalytics}`;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', analytics.googleAnalytics);
  }
  
  // Google Tag Manager
  if (analytics.googleTagManager) {
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer',analytics.googleTagManager);
  }
  
  // Facebook Pixel
  if (analytics.facebookPixel) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', analytics.facebookPixel);
    fbq('track', 'PageView');
  }
  
  // Microsoft Clarity (grátis!)
  if (analytics.clarity) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", analytics.clarity);
  }
  
  // Hotjar
  if (analytics.hotjar) {
    (function(h,o,t,j,a,r){
      h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
      h._hjSettings={hjid:analytics.hotjar,hjsv:6};
      a=o.getElementsByTagName('head')[0];
      r=o.createElement('script');r.async=1;
      r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
      a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
  }
}
