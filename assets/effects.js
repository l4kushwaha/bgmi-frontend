/* ============================================================
   BGMI Market — Shared Animated Theme (effects.js)
   Loader, aurora bg, particles, glitch, 3D tilt, cursor glow,
   click sparkles, scroll reveal, live counters & clock.
   ============================================================ */
(() => {
  "use strict";

  /* ---- 0. Per-page theme (distinct gaming background per page) ---- */
  const THEMES = {
    "index.html": {
      bg: "radial-gradient(circle at 15% 15%, rgba(139,92,246,.4), transparent 42%), radial-gradient(circle at 85% 25%, rgba(255,0,128,.22), transparent 40%), radial-gradient(circle at 50% 95%, rgba(0,255,198,.18), transparent 45%), linear-gradient(160deg,#12002b,#07070f 55%,#160021)",
      t1: "rgba(139,92,246,.6)", t2: "rgba(255,0,128,.5)", t3: "rgba(0,255,198,.45)"
    },
    "marketplace.html": {
      bg: "radial-gradient(circle at 10% 20%, rgba(0,140,255,.35), transparent 45%), radial-gradient(circle at 90% 80%, rgba(0,255,198,.28), transparent 45%), radial-gradient(circle at 60% 0%, rgba(0,80,200,.3), transparent 40%), linear-gradient(160deg,#02101f,#040a18 55%,#020a18)",
      t1: "rgba(0,150,255,.6)", t2: "rgba(0,255,198,.5)", t3: "rgba(30,60,255,.45)"
    },
    "sell.html": {
      bg: "radial-gradient(circle at 80% 12%, rgba(255,120,0,.32), transparent 42%), radial-gradient(circle at 12% 85%, rgba(255,0,128,.26), transparent 42%), radial-gradient(circle at 50% 100%, rgba(255,60,0,.16), transparent 45%), linear-gradient(160deg,#190902,#12080f 55%,#1a0306)",
      t1: "rgba(255,140,0,.6)", t2: "rgba(255,0,128,.5)", t3: "rgba(255,60,0,.42)"
    },
    "profile.html": {
      bg: "radial-gradient(circle at 20% 15%, rgba(255,0,160,.32), transparent 42%), radial-gradient(circle at 85% 75%, rgba(139,92,246,.3), transparent 45%), radial-gradient(circle at 50% 0%, rgba(255,0,80,.2), transparent 40%), linear-gradient(160deg,#1a0318,#0f0518 55%,#12031a)",
      t1: "rgba(255,0,160,.6)", t2: "rgba(139,92,246,.5)", t3: "rgba(255,80,200,.42)"
    },
    "wallet.html": {
      bg: "radial-gradient(circle at 15% 25%, rgba(0,200,150,.3), transparent 42%), radial-gradient(circle at 85% 70%, rgba(0,255,198,.25), transparent 45%), radial-gradient(circle at 40% 100%, rgba(34,197,94,.18), transparent 45%), linear-gradient(160deg,#02170f,#04130d 55%,#02100c)",
      t1: "rgba(0,220,160,.6)", t2: "rgba(0,255,198,.5)", t3: "rgba(34,197,94,.42)"
    },
    "popularity.html": {
      bg: "radial-gradient(circle at 75% 10%, rgba(255,150,0,.35), transparent 42%), radial-gradient(circle at 15% 90%, rgba(255,0,100,.24), transparent 42%), radial-gradient(circle at 50% 60%, rgba(255,80,0,.14), transparent 40%), linear-gradient(160deg,#190902,#12050a 55%,#160202)",
      t1: "rgba(255,150,0,.6)", t2: "rgba(255,0,100,.5)", t3: "rgba(255,120,0,.42)"
    },
    "meetups.html": {
      bg: "radial-gradient(circle at 80% 20%, rgba(167,139,250,.32), transparent 42%), radial-gradient(circle at 10% 80%, rgba(255,0,255,.24), transparent 42%), radial-gradient(circle at 60% 100%, rgba(88,28,135,.3), transparent 45%), linear-gradient(160deg,#12002b,#0a0516 55%,#160021)",
      t1: "rgba(167,139,250,.6)", t2: "rgba(255,0,255,.5)", t3: "rgba(139,92,246,.42)"
    },
    "chat.html": {
      bg: "radial-gradient(circle at 15% 15%, rgba(59,91,219,.34), transparent 42%), radial-gradient(circle at 85% 85%, rgba(0,255,198,.2), transparent 45%), radial-gradient(circle at 70% 0%, rgba(99,102,241,.28), transparent 42%), linear-gradient(160deg,#030a1e,#050a18 55%,#030818)",
      t1: "rgba(99,102,241,.6)", t2: "rgba(59,91,219,.5)", t3: "rgba(0,255,198,.42)"
    },
    "admin_dashboard.html": {
      bg: "radial-gradient(circle at 10% 10%, rgba(139,92,246,.3), transparent 42%), radial-gradient(circle at 90% 90%, rgba(30,64,175,.32), transparent 45%), linear-gradient(160deg,#0b0817,#06060f 55%,#0a0a16)",
      t1: "rgba(139,92,246,.55)", t2: "rgba(59,91,219,.5)", t3: "rgba(0,255,198,.32)"
    },
    "login.html": {
      bg: "radial-gradient(circle at 20% 20%, rgba(0,200,255,.35), transparent 42%), radial-gradient(circle at 80% 80%, rgba(0,255,198,.28), transparent 42%), radial-gradient(circle at 50% 0%, rgba(0,120,220,.3), transparent 40%), linear-gradient(160deg,#02101c,#04121c 55%,#021018)",
      t1: "rgba(0,200,255,.6)", t2: "rgba(0,255,198,.5)", t3: "rgba(0,120,220,.42)"
    },
    "forgot_password.html": {
      bg: "radial-gradient(circle at 25% 20%, rgba(0,220,200,.3), transparent 42%), radial-gradient(circle at 80% 70%, rgba(59,130,246,.26), transparent 42%), radial-gradient(circle at 50% 110%, rgba(0,255,220,.16), transparent 45%), linear-gradient(160deg,#02141c,#042028 55%,#02141a)",
      t1: "rgba(0,220,200,.55)", t2: "rgba(59,130,246,.5)", t3: "rgba(0,255,220,.42)"
    }
  };

  const page = (location.pathname || "").split("/").pop();
  const reducedMotion = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const smallScreen = typeof matchMedia !== "undefined" && matchMedia("(max-width: 640px)").matches;
  const theme = THEMES[page] || THEMES["index.html"];
  if (!document.body.dataset.nofx) {
    document.body.style.background = theme.bg;
    document.body.style.setProperty("--t1", theme.t1);
    document.body.style.setProperty("--t2", theme.t2);
    document.body.style.setProperty("--t3", theme.t3);
  }

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

  /* ---- 17. Neon grid floor ---- */
  function initGrid() {
    const g = document.createElement("div");
    g.className = "fx-grid";
    g.setAttribute("aria-hidden", "true");
    document.body.appendChild(g);
  }

  /* ---- 18. Glassy water bubbles ---- */
  function initBubbles(count = 12) {
    const wrap = document.createElement("div");
    wrap.className = "fx-bubbles";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const size = 14 + Math.random() * 46;
      const dur = 10 + Math.random() * 18;
      const b = document.createElement("span");
      b.className = "fx-bubble";
      b.style.cssText = `
        left:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        animation-duration:${dur}s;
        animation-delay:${-Math.random() * dur}s;
      `;
      wrap.appendChild(b);
    }
    document.body.appendChild(wrap);
  }

  /* ---- 19. ☄️ Shooting meteors ---- */
  function initMeteors(count = 3) {
    for (let i = 0; i < count; i++) {
      const m = document.createElement("span");
      m.className = "fx-meteor";
      const dur = 7 + Math.random() * 6;
      m.style.cssText = `
        left:${Math.random() * 80}%;
        top:${Math.random() * 40}%;
        --mx:${(40 + Math.random() * 70)}vw;
        --my:${(50 + Math.random() * 70)}vh;
        animation-duration:${dur}s;
        animation-delay:${-Math.random() * dur}s;
      `;
      document.body.appendChild(m);
    }
  }

  /* ---- 20. 🎁 Floating loot boxes ---- */
  function initLoot(count = 4) {
    const pool = ["🎁", "📦", "💎", "⚔️", "🏆", "🪙"];
    for (let i = 0; i < count; i++) {
      const l = document.createElement("span");
      l.className = "fx-loot";
      l.textContent = pool[Math.floor(Math.random() * pool.length)];
      const dur = 15 + Math.random() * 9;
      l.style.cssText = `
        left:${Math.random() * 100}%;
        font-size:${1 + Math.random() * 1.4}rem;
        animation-duration:${dur}s;
        animation-delay:${-Math.random() * dur}s;
      `;
      document.body.appendChild(l);
    }
  }

  /* ---- 21. 💥 Battle-zone shrinking rings ---- */
  function initZones(count = 2) {
    for (let i = 0; i < count; i++) {
      const z = document.createElement("span");
      z.className = "fx-zone";
      const size = 30 + Math.random() * 55;
      z.style.cssText = `
        width:${size}vmin; height:${size}vmin;
        left:${Math.random() * 70}%;
        top:${Math.random() * 70}%;
        animation-duration:${6 + Math.random() * 6}s;
        animation-delay:${-Math.random() * 8}s;
      `;
      document.body.appendChild(z);
    }
  }

  /* ---- 22. 💧 Water ripple on interactive clicks ---- */
  function initRipple() {
    document.addEventListener("click", e => {
      const t = e.target.closest("button, a, .item-card, .stat-card, .boost-card, .soon-card, .rank-row, .wd-item, .g-card, .mu-card, .panel .mini");
      if (!t) return;
      const r = t.getBoundingClientRect();
      if (!r.width) return;
      const s = document.createElement("span");
      s.className = "fx-ripple";
      s.style.left = (e.clientX - r.left) + "px";
      s.style.top = (e.clientY - r.top) + "px";
      t.appendChild(s);
      setTimeout(() => s.remove(), 900);
    });
  }

  /* ---- 23. Cinematic vignette ---- */
  function initVignette() {
    const v = document.createElement("div");
    v.className = "fx-vignette";
    v.setAttribute("aria-hidden", "true");
    document.body.appendChild(v);
  }

  const skipLoader = ["login.html", "register.html", "forgot_password.html", "wallet.html"];
  if (!reducedMotion && !document.body.dataset.nofx) {
    if (!skipLoader.includes(page)) initLoader();
    initAurora();
    initGrid();
    initScanlines();
    initBubbles(smallScreen ? 8 : 12);
    initVignette();
    if (smallScreen) {
      initParticles(12);
      initZones(1);
    } else {
      initParticles(20);
      initZones(2);
      initMeteors(3);
      initLoot(4);
      initEmojis(8);
    }
    initRipple();
  }
  initReveal();
  initGlow();
  initTilt();
  initCursor();
  initGlitch();
  initShake();
  initCounters();
  initClock();
  initCardStagger();
  initMarquee();
  initDecoDelay();
})();
