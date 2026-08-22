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
      if (c !== null && c.slice(0, 7) === CT_PREFIX) { _set.call(this, k, c); return; }
    }
    _set.call(this, k, v);
  };
  Storage.prototype.getItem = function (k) {
    var raw = _get.call(this, k);
    if (raw === null || ENC_KEYS.indexOf(k) === -1 || typeof CryptoJS === "undefined") return raw;
    if (raw.slice(0, 7) === CT_PREFIX) {
      var p = dec(raw);
      return p === null ? raw : p;
    }
    return raw;
  };

  /* Migrate pre-existing plaintext values to encrypted form */
  function migrate() {
    ENC_KEYS.forEach(function (k) {
      var raw = _get.call(localStorage, k);
      if (raw && raw.slice(0, 7) !== CT_PREFIX && typeof CryptoJS !== "undefined") {
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
})();
