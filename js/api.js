// ===== api.js (Extended + IIFE + Debug-Friendly + Verify Service Integrated) =====
(() => {
  // 🌍 Base URL auto-detect
  const BASE_URL = window.BASE_URL || (
    window.location.hostname.includes("localhost")
      ? "http://127.0.0.1:5000/api" // Local dev (via gateway)
      : "https://bgmi-gateway.bgmi-gateway.workers.dev/api" // ✅ Gateway in production
  );

  window.BASE_URL = BASE_URL; // Global access

  // --- 🧩 Service Endpoints ---
  const SERVICES = {
    auth: `${BASE_URL}/auth`,
    market: `${BASE_URL}/market`,
    wallet: `${BASE_URL}/wallet`,
    verify: `${BASE_URL}/verify`,   // ✅ Verification microservice via gateway
    chat: `${BASE_URL}/chat`,
    admin: `${BASE_URL}/admin`,
    notify: `${BASE_URL}/notify`,
  };

  // --- 🔍 Health Endpoints ---
  const GATEWAY_HEALTH = BASE_URL.replace("/api", "") + "/health";
  const VERIFY_HEALTH = `${SERVICES.verify}/health`;
  const MARKET_HEALTH = `${SERVICES.market}/health`;

  // --- 🛠️ Universal API Request Helper ---
  async function apiRequest(endpoint, options = {}) {
    try {
      const token = localStorage.getItem("token") || "";
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      };

      const cleanEndpoint = endpoint.replace(/^\//, "");
      const url = `${BASE_URL}/${cleanEndpoint}`;

      console.log("🌐 API Request:", url, options);

      const res = await fetch(url, { ...options, headers });
      let data = {};
      try { data = await res.json(); } catch { data = {}; }

      console.log("📥 API Response:", data, "Status:", res.status);

      if (!res.ok) {
        const message = data.error || data.message || `Request to ${endpoint} failed.`;
        throw new Error(message);
      }

      return data;
    } catch (err) {
      console.error(`❌ API Error [${endpoint}]:`, err);
      return Promise.reject(err);
    }
  }

  // --- 💓 Health Check Function ---
  async function checkGateway() {
    console.log("🌐 Running Gateway & Service Health Check...");

    // Gateway
    try {
      const res = await fetch(GATEWAY_HEALTH);
      const data = await res.json().catch(() => ({}));
      if (res.ok) console.log("✅ Gateway OK", data);
      else console.warn("⚠️ Gateway not healthy", data);
    } catch (err) {
      console.error("❌ Cannot reach Gateway", err);
    }

    // Market
    try {
      const res = await fetch(MARKET_HEALTH);
      const data = await res.json().catch(() => ({}));
      if (res.ok) console.log("✅ Market Service OK", data);
      else console.warn("⚠️ Market Service DOWN or Unhealthy", data);
    } catch (err) {
      console.error("❌ Cannot reach Market Service", err);
    }

    // ✅ Verification
    try {
      const res = await fetch(VERIFY_HEALTH);
      const data = await res.json().catch(() => ({}));
      if (res.ok) console.log("✅ Verification Service OK", data);
      else console.warn("⚠️ Verification Service DOWN or Unhealthy", data);
    } catch (err) {
      console.error("❌ Cannot reach Verification Service", err);
    }
  }

  // --- 🎯 Convenience Helpers ---
  async function fetchMarketItems() {
    return apiRequest("market/items");
  }

  async function buyMarketItem(itemId) {
    return apiRequest(`market/buy/${itemId}`, { method: "POST" });
  }

  // ✅ Verification specific functions
  async function uploadKYC(formData) {
    return apiRequest("verify/upload", {
      method: "POST",
      body: formData,
      headers: {}, // multipart handled by browser
    });
  }

  async function getKYCStatus() {
    return apiRequest("verify/status");
  }

  // --- 🚀 Auto-run Health Check on load ---
  window.addEventListener("load", checkGateway);

  // --- 🌐 Export globally ---
  window.SERVICES = SERVICES;
  window.apiRequest = apiRequest;
  window.fetchMarketItems = fetchMarketItems;
  window.buyMarketItem = buyMarketItem;
  window.uploadKYC = uploadKYC;
  window.getKYCStatus = getKYCStatus;
  window.checkGateway = checkGateway;

  // 🧱 ===== Admin Dashboard Placeholder =====
  // TODO: (Future Integration)
  // When admin_dashboard.html is added:
  // - Use SERVICES.admin endpoints
  // - Add functions like getAllUsers(), getPendingKYCs(), verifyUser(), etc.
  // - Combine with verify service for KYC review panel
})();
