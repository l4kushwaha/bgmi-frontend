// ===== api.js (Full Stable + Gateway Compatible + Debug Logs) =====
(() => {
  // 🌍 Base URL Auto-Detect
  const BASE_URL =
    window.BASE_URL ||
    (window.location.hostname.includes("localhost")
      ? "http://127.0.0.1:5000/api" // Local Dev Gateway
      : "https://bgmi-gateway.bgmi-gateway.workers.dev/api"); // Live Gateway

  window.BASE_URL = BASE_URL; // Global Access

  // --- 🌐 Service Endpoints ---
  const SERVICES = {
    auth: `${BASE_URL}/auth`,
    market: `${BASE_URL}/market`,
    wallet: `${BASE_URL}/wallet`,
    verify: `${BASE_URL}/verify`,
    chat: `${BASE_URL}/chat`,
    admin: `${BASE_URL}/admin`,
    notify: `${BASE_URL}/notify`,
  };

  // --- 🩺 Health Endpoints ---
  const HEALTH_ENDPOINTS = {
    gateway: BASE_URL.replace("/api", "") + "/health",
    auth: `${SERVICES.auth}/health`,
    market: `${SERVICES.market}/health`,
    wallet: `${SERVICES.wallet}/health`,
    verify: `${SERVICES.verify}/health`,
    chat: `${SERVICES.chat}/health`,
    admin: `${SERVICES.admin}/health`,
    notify: `${SERVICES.notify}/health`,
  };

  // --- 📦 Universal Fetch Helper ---
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
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      console.log("📥 API Response:", data, "Status:", res.status);

      if (!res.ok) {
        const message =
          data.error || data.message || `Request to ${endpoint} failed.`;
        throw new Error(message);
      }

      return data;
    } catch (err) {
      console.error(`❌ API Error [${endpoint}]:`, err);
      return Promise.reject(err);
    }
  }

  // --- 🩺 Comprehensive Health Check ---
  async function checkGateway() {
    console.log("🌐 Running Gateway & All Service Health Checks...");

    for (const [name, url] of Object.entries(HEALTH_ENDPOINTS)) {
      try {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (res.ok)
          console.log(`✅ ${name.charAt(0).toUpperCase() + name.slice(1)} OK`, data);
        else
          console.warn(
            `⚠️ ${name.charAt(0).toUpperCase() + name.slice(1)} DOWN`,
            data
          );
      } catch (err) {
        console.error(`❌ Cannot reach ${name} service`, err);
      }
    }
  }

  // --- 🛍️ Marketplace Functions ---
  async function fetchMarketItems() {
    return apiRequest("market/items");
  }
  async function buyMarketItem(itemId) {
    return apiRequest(`market/buy/${itemId}`, { method: "POST" });
  }

  // --- 🔁 Auto-run Health Check on Page Load ---
  window.addEventListener("load", checkGateway);

  // --- 🌎 Global Export for Other Scripts ---
  window.SERVICES = SERVICES;
  window.apiRequest = apiRequest;
  window.fetchMarketItems = fetchMarketItems;
  window.buyMarketItem = buyMarketItem;
  window.checkGateway = checkGateway;
})();
