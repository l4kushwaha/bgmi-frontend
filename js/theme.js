/**
 * Theme Management - Dark/Light Mode Toggle
 * Handles theme persistence, system preference detection, and smooth transitions
 */

(function() {
  'use strict';

  const THEME_KEY = 'bgmi-market-theme';
  const THEME_ATTR = 'data-theme';
  const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
  };

  // DOM Elements
  let toggleBtn = null;
  let toggleThumb = null;
  let toggleTrack = null;

  // State
  let currentTheme = THEMES.DARK;
  let isTransitioning = false;

  // Initialize theme on load
  function initTheme() {
    // Get saved theme or detect system preference
    const savedTheme = getSavedTheme();
    const systemTheme = getSystemTheme();
    currentTheme = savedTheme || systemTheme;

    applyTheme(currentTheme, false);
    setupToggle();
    setupSystemListener();
    createParticles();
  }

  // Get saved theme from localStorage
  function getSavedTheme() {
    try {
      return localStorage.getItem(THEME_KEY);
    } catch (e) {
      return null;
    }
  }

  // Detect system preference
  function getSystemTheme() {
    try {
      return window.matchMedia('(prefers-color-scheme: light)').matches 
        ? THEMES.LIGHT 
        : THEMES.DARK;
    } catch (e) {
      return THEMES.DARK;
    }
  }

  // Apply theme to document
  function applyTheme(theme, animate = true) {
    if (isTransitioning) return;
    
    const root = document.documentElement;
    
    if (animate) {
      isTransitioning = true;
      root.style.transition = 'background-color var(--transition-slow), color var(--transition-slow)';
      
      // Force reflow
      root.offsetHeight;
    }

    root.setAttribute(THEME_ATTR, theme);
    currentTheme = theme;

    // Update toggle button ARIA
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', 
        theme === THEMES.DARK ? 'Switch to light mode' : 'Switch to dark mode'
      );
      toggleBtn.setAttribute('aria-pressed', theme === THEMES.DARK);
    }

    // Save to localStorage
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('themechange', { 
      detail: { theme, previousTheme: theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK } 
    }));

    if (animate) {
      setTimeout(() => {
        root.style.transition = '';
        isTransitioning = false;
      }, 400);
    }
  }

  // Toggle theme
  function toggleTheme() {
    const newTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    applyTheme(newTheme, true);
    
    // Add click animation
    if (toggleThumb) {
      toggleThumb.style.transform = currentTheme === THEMES.DARK 
        ? 'translateX(32px) scale(0.9)' 
        : 'translateX(0) scale(0.9)';
      setTimeout(() => {
        toggleThumb.style.transform = currentTheme === THEMES.DARK 
          ? 'translateX(32px)' 
          : 'translateX(0)';
      }, 150);
    }
  }

  // Setup toggle button
  function setupToggle() {
    toggleBtn = document.getElementById('themeToggle');
    if (!toggleBtn) return;

    toggleThumb = toggleBtn.querySelector('.toggle-thumb');
    toggleTrack = toggleBtn.querySelector('.toggle-track');

    toggleBtn.addEventListener('click', toggleTheme);
    
    // Keyboard support
    toggleBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    });

    // Set initial ARIA
    toggleBtn.setAttribute('role', 'switch');
    toggleBtn.setAttribute('aria-checked', currentTheme === THEMES.DARK);
    toggleBtn.setAttribute('aria-label', 
      currentTheme === THEMES.DARK ? 'Switch to light mode' : 'Switch to dark mode'
    );
  }

  // Listen for system theme changes
  function setupSystemListener() {
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      mediaQuery.addEventListener('change', (e) => {
        // Only auto-switch if user hasn't manually set a preference
        const savedTheme = getSavedTheme();
        if (!savedTheme) {
          applyTheme(e.matches ? THEMES.LIGHT : THEMES.DARK, true);
        }
      });
    } catch (e) {}
  }

  // Create floating particles
  function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const particleCount = window.innerWidth < 768 ? 15 : 30;
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation-delay: ${Math.random() * -20}s;
        animation-duration: ${15 + Math.random() * 10}s;
      `;
      fragment.appendChild(particle);
    }

    container.appendChild(fragment);
  }

  // Counter animation for hero stats
  function animateCounters() {
    const counters = document.querySelectorAll('[data-count]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const duration = 2000;
          const startTime = performance.now();
          
          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(eased * target);
            el.textContent = current.toLocaleString('en-IN');
            
            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              el.textContent = target.toLocaleString('en-IN');
            }
          }
          
          requestAnimationFrame(updateCounter);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => observer.observe(counter));
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initTheme();
      animateCounters();
    });
  } else {
    initTheme();
    animateCounters();
  }

  // Export for global access
  window.ThemeManager = {
    getCurrentTheme: () => currentTheme,
    setTheme: applyTheme,
    toggle: toggleTheme,
    THEMES
  };
})();