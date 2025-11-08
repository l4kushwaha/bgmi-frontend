// ===== api.js (Extended + IIFE + Debug-Friendly) =====
(() => {
  // 🌍 Base URL auto-detect
  const BASE_URL = window.BASE_URL || (
    window.location.hostname.includes("localhost")
      ? "http://127.0.0.1:5000/api" // local dev
      : "https://bgmi_marketplace-service.bgmi-gateway.workers.dev/api" // production
  );

  window.BASE_URL = BASE_URL; // global access

  // --- Service Endpoints ---
  const SERVICES = {
    auth: `${BASE_URL}/auth`,
    market: `${BASE_URL}/market`,
    wallet: `${BASE_URL}/wallet`,
    verify: `${BASE_URL}/verify`,
    chat: `${BASE_URL}/chat`,
    admin: `${BASE_URL}/admin`,
    notify: `${BASE_URL}/notify`,
  };

  // --- Health Endpoints ---
  const GATEWAY_HEALTH = BASE_URL.replace("/api", "") + "/health";
  const MARKET_HEALTH = `${SERVICES.market}/health`;

  // --- Universal API Fetch Helper ---
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
      return Promise.reject(err); // caller can handle
    }
  }

  // --- Health Check Function ---
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

    // Market Service
    try {
      const res = await fetch(MARKET_HEALTH);
      const data = await res.json().catch(() => ({}));
      if (res.ok) console.log("✅ Market Service OK", data);
      else console.warn("⚠️ Market Service DOWN or Unhealthy", data);
    } catch (err) {
      console.error("❌ Cannot reach Market Service", err);
    }
  }

  // --- Convenience Helpers ---
  async function fetchMarketItems() { return apiRequest("market/items"); }
  async function buyMarketItem(itemId) { return apiRequest(`market/buy/${itemId}`, { method: "POST" }); }

  // --- Auto-run health check ---
  window.addEventListener("load", checkGateway);

  // --- Export globally ---
  window.SERVICES = SERVICES;
  window.apiRequest = apiRequest;
  window.fetchMarketItems = fetchMarketItems;
  window.buyMarketItem = buyMarketItem;
  window.checkGateway = checkGateway;
})();
