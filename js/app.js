/* ============================================================
   Elegent-Kart · app.js v1
   - SecureStorage (AES-256 at-rest via CryptoJS)
   - Transparent storage shim (whitelisted keys auto-encrypt)
   - Global sanitizeHTML()
   - Dynamic time-based greeting pill (navbar)
   ============================================================ */
(function () {
  "use strict";
  var SECURE_KEY = "bgmi_market_enc_key_v1";
  var ENC_KEYS = ["token", "user", "user_profile", "refresh_token", "pop_cart"];
  var CT_PREFIX = "U2FsdGVk"; /* CryptoJS salted-ciphertext marker */

  function enc(plainStr) {
    try { return CryptoJS.AES.encrypt(plainStr, SECURE_KEY).toString(); }
    catch (e) { return null; }
  }
  function dec(cipherStr) {
    try {
      var s = CryptoJS.AES.decrypt(cipherStr, SECURE_KEY).toString(CryptoJS.enc.Utf8);
      return s || null;
    } catch (e) { return null; }
  }

  var SecureStorage = {
    set: function (key, value) {
      try {
        var json = typeof value === "string" ? value : JSON.stringify(value);
        var ct = enc(json);
        if (ct === null) throw new Error("enc-fail");
        localStorage.setItem(key, ct); /* shim encrypts */
      } catch (e) { console.error("SecureStorage.set failed", e); }
    },
    get: function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        return parsed;
      } catch (e) { return localStorage.getItem(key); }
    },
    getString: function (key) { return localStorage.getItem(key); },
    remove: function (key) { localStorage.removeItem(key); }
  };
  window.SecureStorage = SecureStorage;

  /* ---- Transparent at-rest encryption for whitelisted keys ---- */
  var _set = Storage.prototype.setItem,
      _get = Storage.prototype.getItem,
      _rem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function (k, v) {
    if (ENC_KEYS.indexOf(k) > -1 && typeof v === "string" && typeof CryptoJS !== "undefined") {
      var c = enc(v);
      if (c !== null && c.slice(0, CT_PREFIX.length) === CT_PREFIX) { _set.call(this, k, c); return; }
    }
    _set.call(this, k, v);
  };
  Storage.prototype.getItem = function (k) {
    var raw = _get.call(this, k);
    if (raw === null || ENC_KEYS.indexOf(k) === -1 || typeof CryptoJS === "undefined") return raw;
    if (raw.slice(0, CT_PREFIX.length) === CT_PREFIX) {
      var p = dec(raw);
      return p === null ? raw : p;
    }
    return raw;
  };

  /* Migrate pre-existing plaintext values to encrypted form */
  function migrate() {
    ENC_KEYS.forEach(function (k) {
      var raw = _get.call(localStorage, k);
      if (raw && raw.slice(0, CT_PREFIX.length) !== CT_PREFIX && typeof CryptoJS !== "undefined") {
        var c = enc(raw);
        if (c !== null) _set.call(localStorage, k, c);
      }
    });
  }

  /* ---- XSS sanitizer ---- */
  window.sanitizeHTML = function (str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  };

  /* ---- Greeting widget ---- */
  function greetParts() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return { icon: "🌅", txt: "Good Morning" };
    if (h >= 12 && h < 17) return { icon: "☀️", txt: "Good Afternoon" };
    if (h >= 17 && h < 21) return { icon: "🌆", txt: "Good Evening" };
    return { icon: "🌙", txt: "Good Night" };
  }
  function userName() {
    try {
      var u = JSON.parse(localStorage.getItem("user") || localStorage.getItem("user_profile") || "null");
      return (u && (u.username || u.name)) || null;
    } catch (e) { return null; }
  }
  function buildGreeting() {
    var nav = document.querySelector(".navbar");
    if (!nav || document.getElementById("greetBadge")) return;
    var g = greetParts(), n = userName();
    var el = document.createElement("div");
    el.id = "greetBadge";
    el.setAttribute("aria-live", "polite");
    el.style.cssText = "margin-left:auto;margin-right:14px;display:flex;align-items:center;background:rgba(15,23,42,.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:7px 16px;font-weight:600;color:#F8FAFC;font-size:.86rem;white-space:nowrap;max-width:40vw;overflow:hidden;text-overflow:ellipsis;box-shadow:0 8px 24px -12px rgba(0,0,0,.6)";
    el.textContent = g.txt + ", " + (n ? n : "Gamer") + "! " + (n ? "👋" : "🎮");
    nav.appendChild(el);
  }
  function tick() {
    var el = document.getElementById("greetBadge");
    if (!el) return;
    var g = greetParts(), n = userName();
    el.textContent = g.txt + ", " + (n ? n : "Gamer") + "! " + (n ? "👋" : "🎮");
  }

  function init() {
    migrate();
    buildGreeting();
    setInterval(tick, 60000);
    window.addEventListener("storage", tick);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* ---- Anti-tamper guard (Inspect-Element price/balance faking) ---- */
  window.__appRender = false;
  var TAMPER_CONTAINERS = ["#items-container", "#withdrawalsList", ".stats-grid", "#greetBadge"];
  function restoreSecureState() {
    try {
      window.__appRender = true;
      if (typeof renderList === "function" && typeof allItems !== "undefined" && allItems) renderList();
      if (typeof loadWalletData === "function") loadWalletData();
      tick();
      setTimeout(function () { window.__appRender = false; }, 120);
    } catch (e) { window.__appRender = false; }
  }
  var __tamperObs = null;
  function initGuard() {
    if (/chat\.html|admin_dashboard/i.test(location.pathname)) return;
    if (__tamperObs) return;
    __tamperObs = new MutationObserver(function (muts) {
      if (window.__appRender) return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "childList" || m.type === "characterData" || m.type === "attributes") {
          console.warn("Security Alert: Unauthorized DOM modification detected!");
          restoreSecureState();
          break;
        }
      }
    });
    TAMPER_CONTAINERS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        try { __tamperObs.observe(el, { childList: true, subtree: true, characterData: true, attributes: true }); } catch (e) {}
      });
    });
  }

  /* ---- Mobile floating bottom dock ---- */
  var DOCK = [
    ["index.html", "\uD83C\uDFE0", "Home"],
    ["marketplace.html", "\uD83D\uDED2", "Market"],
    ["sell.html", "\u2795", "Sell", "center"],
    ["chat.html", "\uD83D\uDCAC", "Chats"],
    ["profile.html", "\uD83D\uDC64", "Profile"]
  ];
  function buildDock() {
    if (document.querySelector(".mobile-bottom-dock")) return;
    if (/admin_dashboard/i.test(location.pathname)) return;
    var nav = document.createElement("nav");
    nav.className = "mobile-bottom-dock";
    nav.setAttribute("aria-label", "Mobile navigation");
    var path = location.pathname.split("/").pop() || "index.html";
    DOCK.forEach(function (d) {
      var a = document.createElement("a");
      a.href = d[0];
      a.className = "dock-item" + (d[3] ? " " + d[3] : "") + (path === d[0] ? " active" : "");
      if (path === d[0]) a.setAttribute("aria-current", "page");
      a.innerHTML = '<span class="di-ic">' + d[1] + '</span><span class="di-tx">' + d[2] + "</span>";
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { initGuard(); buildDock(); });
  else { initGuard(); buildDock(); }
})();
