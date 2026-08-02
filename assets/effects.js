/* ============================================================
   BGMI Market — Shared Animated Theme (effects.js)
   Loader, aurora bg, particles, glitch, 3D tilt, cursor glow,
   click sparkles, scroll reveal, live counters & clock.
   ============================================================ */
(() => {
  "use strict";

  /* ---- 1. Page loader ---- */
  function initLoader() {
    const l = document.createElement("div");
    l.className = "fx-loader";
    l.innerHTML = '<div class="ring"></div><div class="label">Loading</div>';
    document.body.appendChild(l);
    window.addEventListener("load", () => {
      setTimeout(() => l.classList.add("hide"), 350);
      setTimeout(() => l.remove(), 1000);
    });
    setTimeout(() => l.classList.add("hide"), 3200);
  }

  /* ---- 2. Aurora background blobs ---- */
  function initAurora() {
    const wrap = document.createElement("div");
    wrap.className = "fx-aurora";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = "<span></span><span></span><span></span>";
    document.body.insertBefore(wrap, document.body.firstChild);
  }

  /* ---- 3. Floating neon particles ---- */
  function initParticles(count = 22) {
    const wrap = document.createElement("div");
    wrap.className = "fx-particles";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const size = 2 + Math.random() * 6;
      const dur = 7 + Math.random() * 16;
      s.style.cssText = `
        left:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        animation-duration:${dur}s;
        animation-delay:${-Math.random() * dur}s;
      `;
      wrap.appendChild(s);
    }
    document.body.appendChild(wrap);
  }

  /* ---- 4. Scroll reveal (with zoom variant) ---- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach(el => el.classList.add("visible"));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add("visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  }

  /* ---- 5. Auto-tag glow cards (skip wrappers with own hover transforms) ---- */
  function initGlow() {
    document.querySelectorAll(".item-card, .card").forEach(el => {
      if (!el.classList.contains("card-wrapper-1") &&
          !el.classList.contains("card-wrapper-2") &&
          !el.classList.contains("card-wrapper-3") &&
          !el.classList.contains("card-main-guest")) {
        el.classList.add("card-glow");
      }
    });
  }

  /* ---- 6. 3D tilt on cards (desktop only) ---- */
  function initTilt() {
    if (matchMedia("(hover: none)").matches) return;
    document.querySelectorAll(".tilt").forEach(card => {
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }

  /* ---- 7. Cursor glow + click sparkles ---- */
  function initCursor() {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);

    let raf = null;
    window.addEventListener("mousemove", e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        glow.style.left = e.clientX + "px";
        glow.style.top = e.clientY + "px";
        raf = null;
      });
    });

    document.addEventListener("click", e => {
      if (e.target.closest("a, button, input, textarea, .item-card img")) {
        burst(e.clientX, e.clientY, 5);
      } else {
        burst(e.clientX, e.clientY, 8);
      }
    });
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      const ang = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 42;
      s.style.cssText = `
        left:${x}px; top:${y}px;
        --dx:${Math.cos(ang) * dist}px;
        --dy:${Math.sin(ang) * dist}px;
        width:${4 + Math.random() * 5}px; height:${4 + Math.random() * 5}px;
      `;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 750);
    }
  }

  /* ---- 8. Glitch text pairing ---- */
  function initGlitch() {
    document.querySelectorAll(".glitch").forEach(el => {
      if (!el.getAttribute("data-text")) el.setAttribute("data-text", el.textContent);
    });
  }

  /* ---- 9. Error shake on invalid submit ---- */
  function initShake() {
    document.addEventListener("submit", e => {
      const form = e.target.closest("form");
      if (form && form.querySelector(".invalid")) {
        form.classList.remove("shake");
        void form.offsetWidth;
        form.classList.add("shake");
      }
    });
  }

  /* ---- 10. Animated counters ---- */
  function initCounters() {
    const els = document.querySelectorAll("[data-count]");
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        io.unobserve(el);
        const target = parseFloat(el.getAttribute("data-count")) || 0;
        const dec = (el.getAttribute("data-dec") || "0").length;
        const dur = 1100;
        const t0 = performance.now();
        const tick = now => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(dec);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    els.forEach(el => io.observe(el));
  }

  /* ---- 11. Live clock ---- */
  function initClock() {
    document.querySelectorAll("[data-clock]").forEach(el => {
      const tick = () => el.textContent = new Date().toLocaleTimeString();
      tick();
      setInterval(tick, 1000);
    });
  }

  /* ---- 12. Floating emoji background ---- */
  function initEmojis(count = 10) {
    const pool = ["💥","⚔️","🔫","🛡️","💰","🚀","💎","🏆","🔥","🎯","✨","🪖","🥇","⚡"];
    const wrap = document.createElement("div");
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const e = document.createElement("span");
      e.className = "fx-emoji";
      e.textContent = pool[Math.floor(Math.random() * pool.length)];
      const size = 1 + Math.random() * 1.6;
      const dur = 9 + Math.random() * 14;
      e.style.cssText = `
        left:${Math.random() * 100}%;
        font-size:${size}rem;
        animation-duration:${dur}s;
        animation-delay:${-Math.random() * dur}s;
        opacity:${0.3 + Math.random() * 0.4};
      `;
      wrap.appendChild(e);
    }
    document.body.appendChild(wrap);
  }

  /* ---- 13. Staggered card entrance ---- */
  function initCardStagger() {
    document.querySelectorAll(".card-in:not([data-i])").forEach((el, i) => {
      el.setAttribute("data-i", String((i % 8) + 1));
    });
  }

  /* ---- 14. Seamless marquee (duplicate content) ---- */
  function initMarquee() {
    document.querySelectorAll(".marquee-wrap .marquee-inner").forEach(inner => {
      if (inner.dataset.dup) return;
      inner.dataset.dup = "1";
      inner.innerHTML += inner.innerHTML;
    });
  }

  /* ---- 15. Randomize decorative animation delays ---- */
  function initDecoDelay() {
    document.querySelectorAll(".wiggle, .bob, .wobble, .jump").forEach(el => {
      if (el.dataset.deco) return;
      el.dataset.deco = "1";
      el.style.animationDelay = (Math.random() * 1.2).toFixed(2) + "s";
      el.style.animationDuration = (el.style.animationDuration ||
        ((2 + Math.random() * 1.5).toFixed(2) + "s"));
    });
  }

  /* ---- 16. Subtle CRT scanlines texture ---- */
  function initScanlines() {
    const s = document.createElement("div");
    s.className = "fx-scanlines";
    s.setAttribute("aria-hidden", "true");
    document.body.appendChild(s);
  }

  const page = (location.pathname || "").split("/").pop();
  const skipLoader = ["login.html", "register.html", "forgot_password.html", "wallet.html"];
  if (!skipLoader.includes(page)) initLoader();
  initAurora();
  initParticles();
  initReveal();
  initGlow();
  initTilt();
  initCursor();
  initGlitch();
  initShake();
  initCounters();
  initClock();
  initEmojis();
  initCardStagger();
  initMarquee();
  initDecoDelay();
  initScanlines();
})();
