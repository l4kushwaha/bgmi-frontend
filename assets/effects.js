/* ============================================================
   BGMI Market — Porsche-Level Premium Effects System
   Advanced scroll-linked animations, magnetic interactions, 
   parallax layers, physics-based motion, micro-interactions
   ============================================================ */
(() => {
  "use strict";

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = matchMedia("(max-width: 768px)").matches;
  const prefersHighContrast = matchMedia("(prefers-contrast: high)").matches;
  
  // ============ PERFORMANCE MONITORING ============
  const perf = {
    lastFrame: performance.now(),
    frameCount: 0,
    fps: 60,
    update() {
      const now = performance.now();
      this.frameCount++;
      if (now - this.lastFrame >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFrame = now;
        if (this.fps < 50) document.body.classList.add('low-fps');
        else document.body.classList.remove('low-fps');
      }
    }
  };

  // ============ LENIS-LIKE SMOOTH SCROLL ============
  let scrollY = 0;
  let targetScrollY = 0;
  let scrollVelocity = 0;
  let lastScrollY = 0;
  const SMOOTH_SCROLL_ENABLED = false; // Disabled - breaks layout on many pages
  const SCROLL_EASE = 0.075; // Porsche-like smoothness

  function initSmoothScroll() {
    if (!SMOOTH_SCROLL_ENABLED) return;
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'smooth-scroll-wrapper';
    scrollContainer.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      will-change: transform;
    `;
    
    // Move all content into scroll container
    while (document.body.firstChild) {
      if (document.body.firstChild === scrollContainer) break;
      scrollContainer.appendChild(document.body.firstChild);
    }
    document.body.appendChild(scrollContainer);
    
    scrollContainer.addEventListener('scroll', () => {
      targetScrollY = scrollContainer.scrollTop;
    }, { passive: true });
    
    function animateScroll() {
      perf.update();
      
      // Physics-based easing (spring-damper)
      const delta = targetScrollY - scrollY;
      scrollVelocity += delta * SCROLL_EASE;
      scrollVelocity *= 0.82; // damping
      scrollY += scrollVelocity;
      
      // Clamp to target when very close
      if (Math.abs(delta) < 0.5 && Math.abs(scrollVelocity) < 0.5) {
        scrollY = targetScrollY;
        scrollVelocity = 0;
      }
      
      scrollContainer.style.transform = `translate3d(0, ${-scrollY}px, 0)`;
      document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);
      document.documentElement.style.setProperty('--scroll-velocity', `${Math.abs(scrollVelocity).toFixed(2)}`);
      document.documentElement.style.setProperty('--scroll-direction', scrollY > lastScrollY ? 'down' : 'up');
      lastScrollY = scrollY;
      
      // Update all scroll-linked animations
      updateScrollLinkedAnimations(scrollY);
      
      requestAnimationFrame(animateScroll);
    }
    animateScroll();
  }

  // ============ SCROLL-LINKED ANIMATION SYSTEM ============
  const scrollAnimations = [];
  
  function registerScrollAnimation(config) {
    scrollAnimations.push(config);
  }
  
  function updateScrollLinkedAnimations(scrollY) {
    scrollAnimations.forEach(anim => {
      const { element, start, end, onProgress, onEnter, onLeave, once = false } = anim;
      if (!element) return;
      
      const progress = Math.max(0, Math.min(1, (scrollY - start) / (end - start)));
      const wasActive = element.dataset.scrollActive === 'true';
      const isActive = progress > 0 && progress < 1;
      
      if (isActive && !wasActive && onEnter) onEnter(element, progress);
      if (!isActive && wasActive && onLeave) onLeave(element, progress);
      if (isActive) onProgress(element, progress);
      
      if (once && progress >= 1) {
        element.dataset.scrollDone = 'true';
        anim.once = true; // prevent re-trigger
      }
      
      element.dataset.scrollActive = isActive;
      element.dataset.scrollProgress = progress.toFixed(3);
    });
  }
  
  // Auto-register elements with data-scroll-animate
  function initScrollLinkedAnimations() {
    if (reducedMotion) return;
    
    document.querySelectorAll('[data-scroll-animate]').forEach(el => {
      const trigger = el.dataset.scrollTrigger || 'self';
      const targetEl = trigger === 'self' ? el : document.querySelector(trigger);
      if (!targetEl) return;
      
      const rect = targetEl.getBoundingClientRect();
      const start = scrollY + rect.top - window.innerHeight * 0.85;
      const end = scrollY + rect.bottom - window.innerHeight * 0.15;
      
      const animationType = el.dataset.scrollAnimate; // 'fade', 'slide', 'scale', 'rotate', 'clip', 'parallax', 'text', 'counter'
      const easing = el.dataset.scrollEasing || 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      const duration = parseFloat(el.dataset.scrollDuration) || 1;
      
      registerScrollAnimation({
        element: el,
        start,
        end,
        onProgress: (element, progress) => {
          const eased = easeOutCubic(progress);
          
          switch (animationType) {
            case 'fade':
              element.style.opacity = eased;
              break;
            case 'slide-up':
              element.style.transform = `translate3d(0, ${(1 - eased) * 60}px, 0)`;
              element.style.opacity = eased;
              break;
            case 'slide-down':
              element.style.transform = `translate3d(0, ${(eased - 1) * 60}px, 0)`;
              element.style.opacity = eased;
              break;
            case 'slide-left':
              element.style.transform = `translate3d(${(1 - eased) * 80}px, 0, 0)`;
              element.style.opacity = eased;
              break;
            case 'slide-right':
              element.style.transform = `translate3d(${(eased - 1) * 80}px, 0, 0)`;
              element.style.opacity = eased;
              break;
            case 'scale':
              element.style.transform = `scale(${0.9 + eased * 0.1})`;
              element.style.opacity = eased;
              break;
            case 'rotate':
              element.style.transform = `rotate(${(1 - eased) * -12}deg) scale(${0.95 + eased * 0.05})`;
              element.style.opacity = eased;
              break;
            case 'clip':
              element.style.clipPath = `inset(${100 - eased * 100}% 0 0 0)`;
              break;
            case 'parallax':
              const speed = parseFloat(el.dataset.parallaxSpeed) || 0.3;
              element.style.transform = `translate3d(0, ${(scrollY - start) * speed * 0.5}px, 0)`;
              break;
            case 'text':
              animateTextReveal(element, eased);
              break;
            case 'counter':
              animateCounter(element, eased, parseFloat(el.dataset.count) || 0, el.dataset);
              break;
          }
        },
        onEnter: (element) => {
          element.style.willChange = 'transform, opacity, clip-path';
        },
        onLeave: (element) => {
          element.style.willChange = 'auto';
        }
      });
    });
  }
  
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }
  
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  // ============ PARALLAX LAYERS WITH DEPTH ============
  function initParallax() {
    if (reducedMotion) return;
    
    // Register parallax elements
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.3;
      const depth = parseFloat(el.dataset.parallaxDepth) || 0; // 0 = background, 1 = foreground
      
      registerScrollAnimation({
        element: el,
        start: -window.innerHeight,
        end: document.documentElement.scrollHeight,
        onProgress: (element, progress) => {
          const offset = (progress - 0.5) * window.innerHeight * speed * (1 + depth);
          element.style.transform = `translate3d(0, ${offset}px, ${-depth * 100}px)`;
        }
      });
    });
  }

  // ============ MAGNETIC INTERACTIONS (PORSCHE-STYLE) ============
  function initMagnetic() {
    if (reducedMotion || matchMedia("(hover: none)").matches) return;
    
    const magneticElements = document.querySelectorAll('[data-magnetic]');
    
    magneticElements.forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.25;
      const maxDistance = parseFloat(el.dataset.magneticMax) || 80;
      
      let rafId = null;
      
      el.addEventListener('mousemove', (e) => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const deltaX = (e.clientX - centerX) * strength;
          const deltaY = (e.clientY - centerY) * strength;
          const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
          const clampedDistance = Math.min(distance, maxDistance);
          const angle = Math.atan2(deltaY, deltaX);
          const finalX = Math.cos(angle) * clampedDistance;
          const finalY = Math.sin(angle) * clampedDistance;
          
          // Magnetic pull with spring physics
          el.style.transform = `translate(${finalX}px, ${finalY}px) scale(1.015)`;
          el.style.transition = 'transform 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          
          // Shine follow
          const shine = el.querySelector('.magnetic-shine');
          if (shine) {
            shine.style.transform = `translate(${finalX * 1.5}px, ${finalY * 1.5}px)`;
          }
          
          rafId = null;
        });
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate(0, 0) scale(1)';
        el.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        const shine = el.querySelector('.magnetic-shine');
        if (shine) {
          shine.style.transform = 'translate(0, 0)';
          shine.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
      });
      
      // Add shine element
      if (!el.querySelector('.magnetic-shine')) {
        const shine = document.createElement('div');
        shine.className = 'magnetic-shine';
        shine.style.cssText = `
          position: absolute;
          inset: -60%;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 0;
        `;
        el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.prepend(shine);
        
        el.addEventListener('mouseenter', () => shine.style.opacity = '1');
        el.addEventListener('mouseleave', () => shine.style.opacity = '0');
      }
    });
  }

  // ============ 3D TILT CARDS WITH DEPTH ============
  function init3DTilt() {
    if (reducedMotion || matchMedia("(hover: none)").matches) return;
    
    const tiltCards = document.querySelectorAll('[data-tilt]');
    
    tiltCards.forEach(card => {
      const maxTilt = parseFloat(card.dataset.tilt) || 10;
      const perspective = parseFloat(card.dataset.perspective) || 1200;
      const scale = parseFloat(card.dataset.tiltScale) || 1.03;
      const glare = card.dataset.tiltGlare !== 'false';
      
      if (glare && !card.querySelector('.tilt-glare')) {
        const glareEl = document.createElement('div');
        glareEl.className = 'tilt-glare';
        glareEl.style.cssText = `
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%, rgba(255,255,255,0.08) 100%);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 1;
          border-radius: inherit;
        `;
        card.style.position = 'relative';
        card.style.overflow = 'hidden';
        card.prepend(glareEl);
      }
      
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;
        
        card.style.transform = `perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
        card.style.transition = 'transform 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        const glare = card.querySelector('.tilt-glare');
        if (glare) {
          glare.style.opacity = '0.25';
          glare.style.transform = `translate(${(x / centerX - 1) * 50}%, ${(y / centerY - 1) * 50}%) rotate(${(rotateY * 0.5).toFixed(1)}deg)`;
        }
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        card.style.transition = 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        const glare = card.querySelector('.tilt-glare');
        if (glare) {
          glare.style.opacity = '0';
          glare.style.transition = 'opacity 0.4s ease, transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
      });
    });
  }

  // ============ SCROLL REVEAL WITH ADVANCED EASING ============
  function initScrollReveal() {
    if (reducedMotion) {
      document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('revealed'));
      return;
    }
    
    const elements = document.querySelectorAll('[data-reveal]:not(.revealed)');
    if (!elements.length) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = parseFloat(el.dataset.revealDelay) || 0;
          const duration = parseFloat(el.dataset.revealDuration) || 800;
          const easing = el.dataset.revealEasing || 'cubic-bezier(0.16, 1, 0.3, 1)';
          const type = el.dataset.revealType || 'slide-up'; // 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'scale', 'rotate', 'clip', 'fade'
          
          setTimeout(() => {
            el.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}, clip-path ${duration}ms ${easing}`;
            el.classList.add('revealed');
            
            // Add stagger for children
            const staggerChildren = el.querySelectorAll('[data-stagger-child]');
            staggerChildren.forEach((child, i) => {
              child.style.transition = `transform ${duration}ms ${easing} ${i * 60}ms, opacity ${duration}ms ${easing} ${i * 60}ms`;
              child.classList.add('revealed');
            });
          }, delay);
          
          observer.unobserve(el);
        }
      });
    }, { 
      threshold: 0.08,
      rootMargin: '0px 0px -30px 0px'
    });
    
    elements.forEach(el => observer.observe(el));
  }

  // ============ TEXT REVEAL ANIMATIONS (SPLIT TEXT) ============
  function initTextReveal() {
    if (reducedMotion) return;
    
    const textElements = document.querySelectorAll('[data-text-reveal]');
    
    textElements.forEach(el => {
      if (el.dataset.textRevealInit) return;
      el.dataset.textRevealInit = 'true';
      
      const text = el.textContent.trim();
      const type = el.dataset.textReveal; // 'chars', 'words', 'lines'
      const delay = parseFloat(el.dataset.revealDelay) || 0;
      const stagger = parseFloat(el.dataset.stagger) || 0.025;
      const duration = parseFloat(el.dataset.textDuration) || 0.8;
      const easing = el.dataset.textEasing || 'cubic-bezier(0.16, 1, 0.3, 1)';
      
      let html = '';
      if (type === 'chars') {
        html = text.split('').map((char, i) => 
          `<span class="char-reveal" style="display:inline-block;opacity:0;transform:translateY(100%);transition:all ${duration}s ${easing} ${delay + i * stagger}s;will-change:transform,opacity;">${char === ' ' ? '&nbsp;' : char}</span>`
        ).join('');
      } else if (type === 'words') {
        html = text.split(' ').map((word, i) => 
          `<span class="word-reveal" style="display:inline-block;opacity:0;transform:translateY(100%);transition:all ${duration}s ${easing} ${delay + i * stagger}s;will-change:transform,opacity;">${word}</span>`
        ).join(' ');
      } else if (type === 'lines') {
        html = text.split('\n').map((line, i) => 
          `<span class="line-reveal" style="display:block;opacity:0;transform:translateY(100%);transition:all ${duration}s ${easing} ${delay + i * stagger}s;will-change:transform,opacity;">${line}</span>`
        ).join('');
      }
      
      el.innerHTML = html;
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            requestAnimationFrame(() => {
              el.querySelectorAll('.char-reveal, .word-reveal, .line-reveal').forEach(span => {
                span.style.opacity = '1';
                span.style.transform = 'translateY(0)';
              });
            });
            observer.unobserve(el);
          }
        });
      }, { threshold: 0.25 });
      
      observer.observe(el);
    });
  }

  function animateTextReveal(element, progress) {
    const chars = element.querySelectorAll('.char-reveal, .word-reveal, .line-reveal');
    chars.forEach((char, i) => {
      const charProgress = Math.max(0, Math.min(1, (progress - i * 0.02) / 0.8));
      if (charProgress > 0) {
        char.style.opacity = easeOutCubic(charProgress);
        char.style.transform = `translateY(${(1 - easeOutCubic(charProgress)) * 100}%)`;
      }
    });
  }

  // ============ NUMBER COUNTUP WITH EASING ============
  function initCountUp() {
    if (reducedMotion) {
      document.querySelectorAll('[data-count]').forEach(el => {
        el.textContent = formatNumber(el.dataset.count, el.dataset);
      });
      return;
    }
    
    const counters = document.querySelectorAll('[data-count]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        
        const el = entry.target;
        const target = parseFloat(el.dataset.count) || 0;
        const decimals = parseInt(el.dataset.decimals) || 0;
        const duration = parseInt(el.dataset.duration) || 1800;
        const easing = el.dataset.easing || 'cubic-bezier(0.16, 1, 0.3, 1)';
        const prefix = el.dataset.prefix || '';
        const suffix = el.dataset.suffix || '';
        const formatter = el.dataset.formatter || 'number';
        
        observer.unobserve(el);
        
        const startTime = performance.now();
        let lastValue = -1;
        
        function animate(now) {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = easeOutExpo(progress);
          const current = target * eased;
          
          // Only update if value changed (performance)
          const displayValue = formatNumber(current, { 
            decimals, prefix, suffix, formatter 
          });
          if (displayValue !== lastValue) {
            el.textContent = displayValue;
            lastValue = displayValue;
          }
          
          if (progress < 1) requestAnimationFrame(animate);
        }
        
        requestAnimationFrame(animate);
      });
    }, { threshold: 0.4 });
    
    counters.forEach(el => observer.observe(el));
  }
  
  function formatNumber(num, opts = {}) {
    const { decimals = 0, prefix = '', suffix = '', formatter = 'number' } = opts;
    if (formatter === 'currency') {
      return prefix + num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    } else if (formatter === 'compact') {
      if (num >= 1e9) return prefix + (num / 1e9).toFixed(1) + 'B' + suffix;
      if (num >= 1e6) return prefix + (num / 1e6).toFixed(1) + 'M' + suffix;
      if (num >= 1e3) return prefix + (num / 1e3).toFixed(1) + 'K' + suffix;
      return prefix + num.toFixed(decimals) + suffix;
    }
    return prefix + num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  }

  function animateCounter(element, progress, target, dataset) {
    if (element.dataset.counterDone === 'true') return;
    if (progress >= 0.99) {
      element.dataset.counterDone = 'true';
      element.textContent = formatNumber(target, dataset);
      return;
    }
    const current = target * easeOutExpo(progress);
    element.textContent = formatNumber(current, dataset);
  }

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  // ============ CURSOR FOLLOWING ORB (PORSCHE-STYLE) ============
  function initCursorOrb() {
    if (reducedMotion || smallScreen || matchMedia("(hover: none)").matches) return;
    
    const orb = document.createElement('div');
    orb.id = 'cursor-orb';
    orb.innerHTML = `
      <div class="orb-ring"></div>
      <div class="orb-core"></div>
    `;
    orb.style.cssText = `
      position: fixed;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      mix-blend-mode: screen;
      transform: translate(-50%, -50%);
      transition: width 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                  height 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                  opacity 0.2s ease,
                  border-color 0.2s ease;
      background: transparent;
      opacity: 0;
      border: 2px solid var(--accent-primary);
      box-shadow: 
        0 0 15px var(--accent-primary),
        0 0 30px var(--accent-secondary),
        inset 0 0 15px rgba(255,255,255,0.1);
    `;
    document.body.appendChild(orb);
    
    // Add ring animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes orbPulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.3; }
      }
      .orb-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 1px solid var(--accent-primary);
        animation: orbPulse 2s ease-in-out infinite;
      }
      .orb-core {
        position: absolute;
        inset: 8px;
        border-radius: 50%;
        background: radial-gradient(circle at 30% 30%, var(--accent-primary), var(--accent-secondary));
        opacity: 0.4;
      }
    `;
    document.head.appendChild(style);
    
    let mouseX = 0, mouseY = 0;
    let orbX = 0, orbY = 0;
    let isVisible = false;
    
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        orb.style.opacity = '0.7';
        isVisible = true;
      }
    });
    
    document.addEventListener('mouseleave', () => {
      orb.style.opacity = '0';
      isVisible = false;
    });
    
    // Magnetic targets enlarge orb
    const magneticTargets = 'button, a, [data-magnetic], [data-tilt], .btn, .card, .glass, .stat-card, input, select, .nav-link, .theme-toggle';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(magneticTargets)) {
        orb.style.width = '72px';
        orb.style.height = '72px';
        orb.style.borderColor = 'var(--accent-secondary)';
        orb.style.boxShadow = '0 0 25px var(--accent-primary), 0 0 50px var(--accent-secondary), inset 0 0 20px rgba(255,255,255,0.15)';
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(magneticTargets)) {
        orb.style.width = '40px';
        orb.style.height = '40px';
        orb.style.borderColor = 'var(--accent-primary)';
        orb.style.boxShadow = '0 0 15px var(--accent-primary), 0 0 30px var(--accent-secondary), inset 0 0 15px rgba(255,255,255,0.1)';
      }
    });
    
    // Click ripple
    document.addEventListener('click', (e) => {
      if (e.target.closest('button, a, .btn, [data-magnetic], [data-tilt]')) {
        orb.style.animation = 'none';
        orb.offsetHeight; // force reflow
        orb.style.animation = 'orbClick 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      }
    });
    
    const clickStyle = document.createElement('style');
    clickStyle.textContent = `
      @keyframes orbClick {
        0% { transform: translate(-50%, -50%) scale(1); border-width: 2px; }
        50% { transform: translate(-50%, -50%) scale(1.8); border-width: 4px; opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(2.5); border-width: 1px; opacity: 0; }
      }
    `;
    document.head.appendChild(clickStyle);
    
    function animateOrb() {
      orbX += (mouseX - orbX) * 0.12;
      orbY += (mouseY - orbY) * 0.12;
      orb.style.left = orbX + 'px';
      orb.style.top = orbY + 'px';
      requestAnimationFrame(animateOrb);
    }
    animateOrb();
  }

  // ============ SCROLL PROGRESS INDICATOR ============
  function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.id = 'scroll-progress';
    progressBar.innerHTML = '<div class="progress-fill"></div>';
    progressBar.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: transparent;
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(progressBar);
    
    const fill = progressBar.querySelector('.progress-fill');
    fill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), var(--accent-tertiary));
      background-size: 200% 200%;
      animation: gradientFlow 4s ease infinite;
      transform-origin: left;
      transform: scaleX(0);
      transition: transform 0.08s linear;
      border-radius: 0 2px 2px 0;
      box-shadow: 0 0 12px var(--accent-primary), 0 0 24px var(--accent-secondary);
    `;
    
    function updateProgress() {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? scrollY / scrollHeight : 0;
      fill.style.transform = `scaleX(${progress})`;
      
      // Change color based on scroll position
      const hue = progress * 120; // cyan to green
      fill.style.filter = `hue-rotate(${hue}deg)`;
    }
    
    // Listen to our smooth scroll
    window.addEventListener('scroll', updateProgress, { passive: true });
  }

  // ============ IMAGE LAZY LOAD WITH BLUR-UP ============
  function initImageLazyLoad() {
    const images = document.querySelectorAll('img[data-src]');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        
        const img = entry.target;
        const src = img.dataset.src;
        const placeholder = img.dataset.placeholder;
        
        if (placeholder) {
          img.style.filter = 'blur(20px) scale(1.05)';
          img.style.transition = 'filter 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        }
        
        const tempImg = new Image();
        tempImg.onload = () => {
          img.src = src;
          img.removeAttribute('data-src');
          if (placeholder) {
            requestAnimationFrame(() => {
              img.style.filter = 'blur(0)';
              img.style.transform = 'scale(1)';
            });
          }
          img.classList.add('loaded');
        };
        tempImg.src = src;
        
        observer.unobserve(img);
      });
    }, { rootMargin: '150px' });
    
    images.forEach(img => observer.observe(img));
  }

  // ============ MICRO-INTERACTIONS (PREMIUM) ============
  function initMicroInteractions() {
    // Button press ripple with spring physics
    document.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('button, .btn, a.btn, .nav-link, .theme-toggle, [data-magnetic], [data-tilt]');
      if (!btn || btn.dataset.noRipple) return;
      
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'premium-ripple';
      ripple.style.cssText = `
        position: absolute;
        left: ${e.clientX - rect.left}px;
        top: ${e.clientY - rect.top}px;
        width: 0; height: 0;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 70%);
        transform: translate(-50%, -50%) scale(0);
        animation: premiumRipple 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        pointer-events: none;
        z-index: 1000;
      `;
      btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
    
    const rippleStyle = document.createElement('style');
    rippleStyle.textContent = `
      @keyframes premiumRipple {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0.6; }
        30% { opacity: 0.4; }
        100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
      }
    `;
    document.head.appendChild(rippleStyle);
    
    // Input focus glow with smooth transition
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('input, select, textarea')) {
        const target = e.target;
        target.style.transition = 'box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        target.style.boxShadow = '0 0 0 4px rgba(0, 212, 255, 0.25), 0 8px 32px rgba(0, 212, 255, 0.12), 0 0 0 1px var(--accent-primary)';
        target.style.borderColor = 'var(--accent-primary)';
        target.style.transform = 'scale(1.005)';
      }
    });
    
    document.addEventListener('focusout', (e) => {
      if (e.target.matches('input, select, textarea')) {
        const target = e.target;
        target.style.boxShadow = '';
        target.style.borderColor = '';
        target.style.transform = 'scale(1)';
      }
    });
    
    // Card hover with 3D lift and glow
    document.querySelectorAll('.glass, .card, .stat-card, .boost-card, .feature-card, .glass-strong').forEach(card => {
      card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), border-color 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      card.style.willChange = 'transform, box-shadow';
      
      card.addEventListener('mouseenter', () => {
        if (reducedMotion) return;
        card.style.transform = 'translateY(-10px) scale(1.005)';
        card.style.boxShadow = 'var(--shadow-lg), var(--shadow-glow), 0 0 60px rgba(0, 212, 255, 0.15)';
        card.style.borderColor = 'var(--border-primary)';
        
        // Animate children with stagger
        const children = card.querySelectorAll('[data-hover-child]');
        children.forEach((child, i) => {
          child.style.transition = `transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${i * 40}ms, opacity 0.3s ease ${i * 40}ms`;
          child.style.transform = 'translateY(-4px)';
        });
      });
      
      card.addEventListener('mouseleave', () => {
        if (reducedMotion) return;
        card.style.transform = 'translateY(0) scale(1)';
        card.style.boxShadow = '';
        card.style.borderColor = '';
        
        const children = card.querySelectorAll('[data-hover-child]');
        children.forEach(child => {
          child.style.transform = 'translateY(0)';
        });
      });
    });
    
    // Nav link hover with underline animation
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.querySelector('.nav-underline')) return;
      
      const underline = document.createElement('span');
      underline.className = 'nav-underline';
      underline.style.cssText = `
        position: absolute;
        bottom: 4px; left: 50%;
        width: 0; height: 2px;
        background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
        transform: translateX(-50%);
        transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        border-radius: 1px;
      `;
      link.style.position = 'relative';
      link.appendChild(underline);
      
      link.addEventListener('mouseenter', () => {
        underline.style.width = '80%';
      });
      link.addEventListener('mouseleave', () => {
        underline.style.width = '0%';
      });
    });
  }

  // ============ PAGE TRANSITIONS (VIEW TRANSITIONS API) ============
  function initPageTransitions() {
    if (!document.startViewTransition) return;
    
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || link.target === '_blank') return;
      
      e.preventDefault();
      
      // Add exiting class for custom animation
      document.documentElement.classList.add('page-transitioning');
      
      document.startViewTransition(async () => {
        window.location.href = href;
      }).finished.then(() => {
        document.documentElement.classList.remove('page-transitioning');
      });
    });
    
    // Listen for view transition events
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.classList.add('page-loaded');
    });
  }

  // ============ STAGGERED ENTRANCE ============
  function initStaggeredEntrance() {
    if (reducedMotion) return;
    
    const containers = document.querySelectorAll('[data-stagger]');
    
    containers.forEach(container => {
      const items = container.querySelectorAll('[data-stagger-item]');
      const staggerDelay = parseFloat(container.dataset.staggerDelay) || 60;
      const type = container.dataset.staggerType || 'slide-up'; // 'slide-up', 'fade', 'scale', 'flip'
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          
          items.forEach((item, i) => {
            const delay = i * staggerDelay;
            setTimeout(() => {
              let transform = '';
              switch (type) {
                case 'slide-up':
                  transform = 'translateY(0)';
                  break;
                case 'fade':
                  transform = 'translateY(0)';
                  break;
                case 'scale':
                  transform = 'scale(1)';
                  break;
                case 'flip':
                  transform = 'rotateY(0deg)';
                  break;
              }
              item.style.transition = `transform 0.7s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)`;
              item.style.transform = transform;
              item.style.opacity = '1';
            }, delay);
          });
          
          observer.unobserve(container);
        });
      }, { threshold: 0.08 });
      
      items.forEach(item => {
        let initialTransform = '';
        switch (container.dataset.staggerType) {
          case 'slide-up':
            initialTransform = 'translateY(40px)';
            break;
          case 'fade':
            initialTransform = 'translateY(20px)';
            break;
          case 'scale':
            initialTransform = 'scale(0.9)';
            break;
          case 'flip':
            initialTransform = 'rotateY(-90deg)';
            break;
        }
        item.style.transform = initialTransform;
        item.style.opacity = '0';
      });
      
      observer.observe(container);
    });
  }

  // ============ HOVER REVEAL WITH CLIP-PATH ============
  function initHoverReveal() {
    if (reducedMotion || matchMedia("(hover: none)").matches) return;
    
    const revealCards = document.querySelectorAll('[data-hover-reveal]');
    
    revealCards.forEach(card => {
      const content = card.querySelector('[data-hover-content]');
      if (!content) return;
      
      content.style.clipPath = 'inset(100% 0 0 0)';
      content.style.transition = 'clip-path 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
      content.style.willChange = 'clip-path';
      
      card.addEventListener('mouseenter', () => {
        content.style.clipPath = 'inset(0 0 0 0)';
      });
      
      card.addEventListener('mouseleave', () => {
        content.style.clipPath = 'inset(100% 0 0 0)';
      });
    });
  }

  // ============ MORPHING SHAPES ============
  function initMorphingShapes() {
    if (reducedMotion) return;
    
    const shapes = document.querySelectorAll('[data-morph]');
    
    shapes.forEach(shape => {
      const paths = shape.dataset.morph.split('|');
      if (paths.length < 2) return;
      
      let current = 0;
      
      function morph() {
        current = (current + 1) % paths.length;
        shape.style.clipPath = paths[current];
        shape.style.transition = 'clip-path 3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      }
      
      setInterval(morph, 4000);
    });
  }

  // ============ FLOATING PARTICLES (ENHANCED) ============
  function initAdvancedParticles() {
    if (reducedMotion) return;
    
    const container = document.createElement('div');
    container.id = 'advanced-particles';
    container.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: -1;
      overflow: hidden;
    `;
    document.body.appendChild(container);
    
    const particleCount = smallScreen ? 12 : 24;
    const colors = [
      'var(--accent-primary)',
      'var(--accent-secondary)', 
      'var(--accent-tertiary)',
      'var(--accent-purple)',
      'var(--accent-pink)',
      'var(--accent-gold)'
    ];
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 5 + 3;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const duration = 20 + Math.random() * 30;
      const delay = -Math.random() * duration;
      const x = Math.random() * 100;
      const driftX = (Math.random() - 0.5) * 40;
      
      particle.style.cssText = `
        position: absolute;
        left: ${x}%;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        opacity: ${0.12 + Math.random() * 0.18};
        filter: blur(${size * 0.6}px);
        animation: particleFloat ${duration}s ${delay}s infinite ease-in-out;
        will-change: transform, opacity;
        --drift-x: ${driftX}vw;
      `;
      container.appendChild(particle);
    }
    
    // Add particle animation if not exists
    if (!document.querySelector('#particle-keyframes')) {
      const style = document.createElement('style');
      style.id = 'particle-keyframes';
      style.textContent = `
        @keyframes particleFloat {
          0% { transform: translateY(100vh) translateX(var(--drift-x, 0)) scale(0.5); opacity: 0; }
          8% { opacity: 0.15; transform: translateY(85vh) translateX(calc(var(--drift-x, 0) * 0.2)) scale(1); }
          50% { opacity: 0.1; transform: translateY(45vh) translateX(calc(var(--drift-x, 0) * 0.6)) scale(1.1); }
          92% { opacity: 0.1; transform: translateY(15vh) translateX(calc(var(--drift-x, 0) * 0.8)) scale(0.9); }
          100% { transform: translateY(-10vh) translateX(var(--drift-x, 0)) scale(0.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ============ BACKGROUND CROSSFADE ANIMATION ============
  const bgCrossfadeStyle = document.createElement('style');
  bgCrossfadeStyle.textContent = `
    @keyframes bgCrossfade {
      0%, 45% { opacity: 1; transform: scale(1); }
      50%, 55% { opacity: 0; transform: scale(1.02); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(bgCrossfadeStyle);

  // ============ iOS 26 GLASSY BACKGROUND SYSTEM ============
  function initBackgroundSystem() {
    if (document.body.dataset.nofx) return;
    
    // Per-page curated wallpapers (verified URLs)
    const U = (u) => u;
    const PAGE_BG = {
      index: [
        "https://www.xtrafondos.com/wallpapers/pubg-mobile-blood-raven-x-suit-set-skin-outfit-8145.jpg",
        "https://wallpaperaccess.com/full/9950190.jpg",
        "https://wallpapercave.com/wp/wp15280640.jpg",
        "https://i.ytimg.com/vi/T54D_gTij3o/maxresdefault.jpg",
        "https://preview.redd.it/upcoming-honor-suit-v0-f0wtura8fdlf1.jpeg?width=1080&crop=smart&auto=webp&s=0550346aee6ba60b8db4db2519f2d0dda72a79d5",
        "https://i0.wp.com/shop-blogs.rooter.gg/wp-content/uploads/2026/02/Wildsoul-Warden-set-in-BGMI.webp?fit=1376%2C700&ssl=1"
      ],
      marketplace: [
        "https://wallpaperaccess.com/full/11137957.jpg",
        "https://images.hdqwalls.com/wallpapers/pubg-x-spiderman-1m.jpg",
        "https://wallpaperaccess.com/full/9471241.jpg",
        "https://c4.wallpaperflare.com/wallpaper/816/114/355/honor-of-kings-game-characters-hd-wallpaper-preview.jpg"
      ],
      sell: [
        "https://c4.wallpaperflare.com/wallpaper/816/114/355/honor-of-kings-game-characters-hd-wallpaper-preview.jpg",
        "https://images.hdqwalls.com/wallpapers/bthumb/devious-cybercat-in-pubg-tl.jpg",
        "https://4kwallpapers.com/images/walls/thumbs_2t/7318.jpg"
      ],
      login: [
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcToxu42fr0YYF4xv082E3uawtjg7O0HSHvCiZUCnVlDcoiA5VdosyMRXpJ6&s=10",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREgB7tCEVk6uT5rJJs6NFNed-1R5ttw_GwZ3NSQQ6QE2lVzfd-mVZ0x-c&s=10",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSTDtawYn04k-I3hWmV1aAtUFR6zZUhoe1PEwbeMa9_m7dg-TncuS5I8rA&s=10"
      ],
      popularity: [
        "https://images.hdqwalls.com/wallpapers/pubg-x-spiderman-1m.jpg",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS94KIkWG67yNTJS8w4g4uZY_3-ikQwIFNHbleCZEPvWh1RaMPD3Dpd2X_N&s=10",
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQIo_IcPEk-Zgb-zMeUo8fnxBMuADrHQp0KAgmPkgg9_zKF1mOsdixKEQg&s=10"
      ]
    };
    PAGE_BG.forgot_password = PAGE_BG.login;
    PAGE_BG.default = [...PAGE_BG.index, ...PAGE_BG.marketplace];

    const pageKey = ((location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/i, '')) || 'index';
    const bgImages = PAGE_BG[pageKey] || PAGE_BG.default;

    if (!bgImages.length) return;
    
    // Select 2 random images for this session
    const shuffled = [...bgImages].sort(() => Math.random() - 0.5);
    const selectedImages = shuffled.slice(0, 2);
    
    // Preload images for faster display
    selectedImages.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
    
    let loadedCount = 0;
    
    // Create background layers immediately
    const layer1 = document.createElement('div');
    layer1.className = 'bg-layer';
    layer1.style.willChange = 'opacity, transform';
    
    const layer2 = document.createElement('div');
    layer2.className = 'bg-layer';
    layer2.style.opacity = '0';
    layer2.style.willChange = 'opacity, transform';
    layer2.style.animation = 'bgCrossfade 35s ease-in-out infinite alternate';
    
    // Insert layers immediately so fallback is visible
    document.body.insertBefore(layer1, document.body.firstChild);
    document.body.insertBefore(layer2, document.body.firstChild);
    
    // Create glass layer (iOS 26 style frosted glass overlay) - immediately
    const glassLayer = document.createElement('div');
    glassLayer.className = 'glass-layer';
    glassLayer.style.willChange = 'backdrop-filter';
    document.body.insertBefore(glassLayer, document.body.firstChild);
    
    // Create mesh gradient - immediately
    const meshGradient = document.createElement('div');
    meshGradient.className = 'mesh-gradient';
    meshGradient.style.willChange = 'transform, opacity';
    document.body.insertBefore(meshGradient, document.body.firstChild);
    
    // Create floating glass shards - immediately
    createGlassShards();
    
    // Load images with error handling and fallback
    function loadImageWithFallback(url, layer, isFirst) {
      const img = new Image();
      img.onload = () => {
        layer.style.backgroundImage = `url("${url}")`;
        layer.style.transition = 'opacity 2s ease-in-out';
        loadedCount++;
      };
      img.onerror = () => {
        // Fallback to gradient with Porsche colors if image fails
        layer.style.backgroundImage = isFirst 
          ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.18), transparent 50%), linear-gradient(135deg, rgba(255, 107, 0, 0.12), transparent 50%)'
          : 'linear-gradient(135deg, rgba(184, 77, 255, 0.15), transparent 50%), linear-gradient(135deg, rgba(255, 200, 0, 0.1), transparent 50%)';
        loadedCount++;
      };
      img.src = url;
    }
    
    loadImageWithFallback(selectedImages[0], layer1, true);
    loadImageWithFallback(selectedImages[1], layer2, false);
  }
  
  function createGlassShards() {
    const shardsContainer = document.createElement('div');
    shardsContainer.className = 'glass-shards';
    document.body.appendChild(shardsContainer);
    
    const shardCount = 6;
    for (let i = 0; i < shardCount; i++) {
      const shard = document.createElement('div');
      shard.className = 'glass-shard';
      
      const width = 100 + Math.random() * 180;
      const height = 70 + Math.random() * 120;
      const left = Math.random() * 85;
      const top = Math.random() * 85;
      const duration = 25 + Math.random() * 20;
      const delay = -Math.random() * duration;
      const rotation = Math.random() * 360;
      
      shard.style.cssText = `
        width: ${width}px;
        height: ${height}px;
        left: ${left}%;
        top: ${top}%;
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
        border-radius: ${16 + Math.random() * 20}px;
        transform: rotate(${rotation}deg);
        will-change: transform, opacity;
      `;
      
      shardsContainer.appendChild(shard);
    }
  }

  // ============ NAVIGATION SCROLL SPY ============
  function initNavScrollSpy() {
    const sections = document.querySelectorAll('section[id], main > [id]');
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    if (!sections.length || !navLinks.length) return;
    
    function updateActiveNav() {
      const scrollPos = scrollY + window.innerHeight * 0.4;
      
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        const sectionTop = scrollY + rect.top;
        const sectionBottom = sectionTop + rect.height;
        
        if (scrollPos >= sectionTop && scrollPos < sectionBottom) {
          const id = section.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${id}`) {
              link.classList.add('active');
              link.setAttribute('aria-current', 'page');
            } else {
              link.classList.remove('active');
              link.removeAttribute('aria-current');
            }
          });
        }
      });
    }
    
    // Listen to our smooth scroll
    registerScrollAnimation({
      element: document.body,
      start: 0,
      end: document.documentElement.scrollHeight,
      onProgress: updateActiveNav
    });
  }

  // ============ THEME TRANSITION EFFECT ============
  function initThemeTransition() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;
    
    themeToggle.addEventListener('click', () => {
      // Create expanding circle effect
      const ripple = document.createElement('div');
      const rect = themeToggle.getBoundingClientRect();
      ripple.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top + rect.height / 2}px;
        width: 0; height: 0;
        border-radius: 50%;
        background: var(--bg-primary);
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        animation: themeRipple 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      `;
      document.body.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
    
    const themeRippleStyle = document.createElement('style');
    themeRippleStyle.textContent = `
      @keyframes themeRipple {
        0% { width: 0; height: 0; opacity: 1; }
        50% { opacity: 0.8; }
        100% { width: 300vmax; height: 300vmax; opacity: 0; }
      }
    `;
    document.head.appendChild(themeRippleStyle);
  }

  // ============ INITIALIZATION ============
  const safeInit = (fn) => { try { fn(); } catch (e) { console.warn('[effects]', e); } };

  function init() {
    safeInit(typeof initThemeBackground === 'function' ? initThemeBackground : () => {});
    safeInit(initBackgroundSystem);
    
    if (!reducedMotion && !document.body.dataset.nofx) {
      safeInit(initSmoothScroll);
      safeInit(initParallax);
      safeInit(initMagnetic);
      safeInit(init3DTilt);
      safeInit(initCursorOrb);
      safeInit(initScrollProgress);
      safeInit(initAdvancedParticles);
      safeInit(initScrollLinkedAnimations);
      safeInit(initNavScrollSpy);
      safeInit(initThemeTransition);
    }
    
    safeInit(initScrollReveal);
    safeInit(initTextReveal);
    safeInit(initCountUp);
    safeInit(initImageLazyLoad);
    safeInit(initMicroInteractions);
    safeInit(initPageTransitions);
    safeInit(initStaggeredEntrance);
    safeInit(initHoverReveal);
    safeInit(initMorphingShapes);

    // FAILSAFE: rescue stuck-hidden elements IN VIEWPORT only (below-fold keeps scroll animations)
    const inView = el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; };
    setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => { if (inView(el)) el.classList.add('revealed'); });
      document.querySelectorAll('.char-reveal, .word-reveal, .line-reveal').forEach(s => { if (inView(s)) { s.style.opacity = '1'; s.style.transform = 'translateY(0)'; } });
      document.querySelectorAll('[data-stagger-item]').forEach(el => { if (inView(el)) { el.style.opacity = '1'; el.style.transform = 'none'; } });
    }, 1600);
    // Late safety net for observer edge-cases (still only in-viewport)
    setTimeout(() => {
      document.querySelectorAll('[data-reveal]:not(.revealed)').forEach(el => { if (inView(el)) el.classList.add('revealed'); });
    }, 6000);
    
    // Legacy compatibility
    initGlitch();
    initMarquee();
    initDecoDelay();
  }
  
  // Legacy functions for compatibility
  function initGlitch() {
    document.querySelectorAll(".glitch").forEach(el => {
      if (!el.getAttribute("data-text")) el.setAttribute("data-text", el.textContent);
    });
  }
  
  function initMarquee() {
    document.querySelectorAll(".marquee-wrap .marquee-inner").forEach(inner => {
      if (inner.dataset.dup) return;
      inner.dataset.dup = "1";
      inner.innerHTML += inner.innerHTML;
    });
  }
  
  function initDecoDelay() {
    document.querySelectorAll(".wiggle, .bob, .wobble, .jump").forEach(el => {
      if (el.dataset.deco) return;
      el.dataset.deco = "1";
      el.style.animationDelay = (Math.random() * 1.2).toFixed(2) + "s";
    });
  }

  // scroll karne pe navbar me halka shadow
  document.addEventListener('DOMContentLoaded', () => {
    const nb = document.querySelector('.navbar');
    if (!nb) return;
    nb.dataset.fxNavbarScroll = '1';
    const onS = () => nb.classList.toggle('scrolled', (window.scrollY || 0) > 40);
    window.addEventListener('scroll', onS, { passive: true });
    onS();
  });

  // menu drawer + right side profile/login buttons
  function initPorscheNav() {
    const nb = document.querySelector('.navbar');
    if (!nb || nb.dataset.fxPorscheNav) return;
    nb.dataset.fxPorscheNav = '1';
    nb.classList.add('fx-clean');

    // turant dikhne wala background (baad me HD load hota hai)
    const l1 = document.querySelector('.bg-layer');
    if (l1 && !l1.style.backgroundImage) {
      l1.style.backgroundImage = 'url("https://picsum.photos/seed/' + (location.pathname.replace(/[^a-z]/g, '') || 'home') + '/1600/900")';
    }

    // hamburger + Menu
    const btn = document.createElement('button');
    btn.className = 'fx-menu-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open menu');
    btn.innerHTML = '<i></i><i></i><i></i><span>Menu</span>';
    nb.prepend(btn);

    // left drawer
    const scrim = document.createElement('div');
    scrim.className = 'fx-scrim';
    const ov = document.createElement('div');
    ov.className = 'fx-drawer';
    const links = [...nb.querySelectorAll('.nav-links > a.nav-link')]
      .map((a, i) => '<a href="' + a.getAttribute('href') + '" style="transition-delay:' + (80 + i * 45) + 'ms">' + a.textContent.trim() + '</a>').join('');
    ov.innerHTML = '<button class="fx-drawer-close" aria-label="Close menu">\u00d7</button><nav>' + links + '</nav>';
    document.body.appendChild(scrim);
    document.body.appendChild(ov);

    const closeDrawer = () => {
      ov.classList.remove('open');
      scrim.classList.remove('open');
      btn.classList.remove('active');
      document.documentElement.style.overflow = '';
    };
    btn.addEventListener('click', () => {
      const open = ov.classList.toggle('open');
      scrim.classList.toggle('open', open);
      btn.classList.toggle('active', open);
      document.documentElement.style.overflow = open ? 'hidden' : '';
    });
    scrim.addEventListener('click', closeDrawer);
    ov.querySelector('.fx-drawer-close').addEventListener('click', closeDrawer);
    ov.querySelectorAll('nav a').forEach(a => a.addEventListener('click', closeDrawer));

    // guarantee: har page pe wallpaper dikhe (fxGuaranteeBg)
    if (!document.querySelector(".bg-layer")) {
      const b = document.createElement("div");
      b.className = "bg-layer";
      b.style.cssText = "position:fixed;inset:0;z-index:-3;background-size:cover;background-position:center;background-image:url(https://picsum.photos/seed/" + (location.pathname.replace(/[^a-z]/g, "") || "home") + "/1600/900)";
      const g = document.createElement("div");
      g.className = "glass-layer";
      g.style.cssText = "position:fixed;inset:0;z-index:-2;backdrop-filter:blur(4px) saturate(125%);background:rgba(9,10,13,0.06)";
      document.body.prepend(g, b);
    }

    // right side: profile/login/logout
    const area = document.createElement('div');
    area.className = 'fx-auth-area';
    const loggedIn = !!(localStorage.getItem('token') || localStorage.getItem('user'));
    area.innerHTML = loggedIn
      ? '<a class="fx-auth-btn" href="profile.html">Profile</a><button type="button" class="fx-auth-btn" id="fxLogoutBtn">Logout</button>'
      : '<a class="fx-auth-btn primaryb" href="login.html">Login</a>';
    nb.appendChild(area);

    // purana theme toggle yahan shift kar do (fxThemeMove)
    const oldToggle = document.getElementById('themeToggle');
    if (oldToggle) {
      oldToggle.style.marginRight = '0.4rem';
      area.insertBefore(oldToggle, area.firstChild);
    }

    const lo = area.querySelector('#fxLogoutBtn');
    if (lo) lo.addEventListener('click', () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      location.href = 'index.html';
    });
  }

  // wallpaper layers kabhi delete na hon (fxEnsureBg)
  function fxEnsureBg() {
    if (document.querySelector(".bg-layer")) return;
    const b = document.createElement("div");
    b.className = "bg-layer";
    b.style.cssText = "position:fixed;inset:0;z-index:-3;background-size:cover;background-position:center;background-image:url(https://picsum.photos/seed/" + (location.pathname.replace(/[^a-z]/g, "") || "home") + "/1600/900)";
    const g = document.createElement("div");
    g.className = "glass-layer";
    g.style.cssText = "position:fixed;inset:0;z-index:-2;backdrop-filter:blur(4px) saturate(125%);background:rgba(9,10,13,0.06)";
    document.body.prepend(g, b);
  }
  document.addEventListener("DOMContentLoaded", fxEnsureBg);
  window.addEventListener("load", fxEnsureBg);
  setTimeout(fxEnsureBg, 1500);
  setTimeout(fxEnsureBg, 4000);

  document.addEventListener('DOMContentLoaded', initPorscheNav);

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose for manual initialization
  window.PremiumEffects = {
    initScrollReveal,
    initTextReveal,
    initCountUp,
    initMagnetic,
    init3DTilt,
    registerScrollAnimation
  };
})();