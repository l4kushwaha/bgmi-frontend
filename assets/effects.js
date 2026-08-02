/* ============================================================
   BGMI Market — Shared Animated Theme (effects.js)
   Adds: loader, particles, scroll-reveal, glow, live clock
   ============================================================ */
(() => {
  "use strict";

  /* ---- 1. Page loader ---- */
  function initLoader() {
    const l = document.createElement("div");
    l.className = "fx-loader";
    l.innerHTML = '<div class="ring"></div>';
    document.body.appendChild(l);
    window.addEventListener("load", () => {
      setTimeout(() => l.classList.add("hide"), 250);
      setTimeout(() => l.remove(), 900);
    });
    setTimeout(() => l.classList.add("hide"), 3000);
  }

  /* ---- 2. Floating particles ---- */
  function initParticles(count = 18) {
    const wrap = document.createElement("div");
    wrap.className = "fx-particles";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      const size = 3 + Math.random() * 7;
      s.style.cssText = `
        left:${Math.random() * 100}%;
        width:${size}px; height:${size}px;
        animation-duration:${8 + Math.random() * 14}s;
        animation-delay:${-Math.random() * 12}s;
      `;
      wrap.appendChild(s);
    }
    document.body.appendChild(wrap);
  }

  /* ---- 3. Scroll reveal ---- */
  function initReveal() {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("visible"));
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

  /* ---- 4. Auto-tag glow ---- */
  function initGlow() {
    document.querySelectorAll(".item-card, .card-wrapper-1, .card-wrapper-2, .card-wrapper-3, .card-main-guest").forEach(el => el.classList.add("card-glow"));
  }

  /* ---- 5. Error shake on forms ---- */
  function initShake() {
    document.addEventListener("submit", e => {
      const form = e.target.closest("form");
      if (form && !form.checkValidity && document.activeElement && document.activeElement.classList.contains("invalid")) {
        form.classList.remove("shake");
        void form.offsetWidth;
        form.classList.add("shake");
      }
    });
  }

  /* ---- 6. Live clock (for dashboard/footer) ---- */
  function initClock() {
    document.querySelectorAll("[data-clock]").forEach(el => {
      const tick = () => el.textContent = new Date().toLocaleTimeString();
      tick();
      setInterval(tick, 1000);
    });
  }

  const page = (location.pathname || "").split("/").pop();
  const skipLoader = ["login.html", "register.html", "forgot_password.html", "wallet.html"];
  if (!skipLoader.includes(page)) initLoader();
  initParticles();
  initReveal();
  initGlow();
  initShake();
  initClock();
})();
