/**
 * OHANAX - Landing Page Scripts
 * Tecnologia e Atitude.
 */

(function() {
  'use strict';

  // ============================================
  // Cursor Glow Effect
  // ============================================
  const cursorGlow = document.getElementById('cursorGlow');

  if (cursorGlow && window.matchMedia('(pointer: fine)').matches) {
    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    function animateCursor() {
      const ease = 0.1;
      currentX += (mouseX - currentX) * ease;
      currentY += (mouseY - currentY) * ease;

      cursorGlow.style.left = currentX + 'px';
      cursorGlow.style.top = currentY + 'px';

      requestAnimationFrame(animateCursor);
    }

    animateCursor();
  }

  // ============================================
  // Navigation
  // ============================================
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  // Scroll effect
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }

    lastScrollY = currentScrollY;
  }, { passive: true });

  // Mobile menu toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navMenu.classList.toggle('active');
      document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });

    // Close menu on link click
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // ============================================
  // Smooth Scroll
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ============================================
  // Intersection Observer for Animations
  // ============================================
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);

  // Observe elements
  document.querySelectorAll('.product-card, .tech-item, .section-header').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });

  // ============================================
  // Product Card Hover Effects
  // ============================================
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
      const icon = this.querySelector('.product-icon');
      if (icon) {
        const accent = getComputedStyle(icon).getPropertyValue('--accent');
        this.style.setProperty('--accent', accent);
      }
    });
  });

  // ============================================
  // Stats Counter Animation
  // ============================================
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateStats();
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    statsObserver.observe(heroStats);
  }

  function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
      const text = stat.textContent;
      // Only animate numeric values
      if (!isNaN(parseInt(text))) {
        const target = parseInt(text);
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            stat.textContent = text; // Restore original (with % or other suffix)
            clearInterval(timer);
          } else {
            stat.textContent = Math.floor(current);
          }
        }, 20);
      }
    });
  }

  // ============================================
  // Keyboard Navigation
  // ============================================
  document.addEventListener('keydown', (e) => {
    // Close mobile menu on Escape
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
      navToggle.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // ============================================
  // Performance: Reduce motion for users who prefer it
  // ============================================
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.scrollBehavior = 'auto';

    // Disable cursor glow
    if (cursorGlow) {
      cursorGlow.style.display = 'none';
    }
  }

  // ============================================
  // Console Easter Egg
  // ============================================
  console.log('%c🚀 Ohanax', 'font-size: 24px; font-weight: bold; color: #ff3366;');
  console.log('%cTecnologia e Atitude.', 'font-size: 14px; color: #888;');
  console.log('%cInteressado em fazer parte? contato@ohanax.com', 'font-size: 12px; color: #666;');

})();
