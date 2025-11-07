// ===== api.js (Fixed + Extended for Marketplace Project) =====

// 🌍 Base Gateway URL (auto-switch: local → production)
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://127.0.0.1:5000/api" // Local development
  : "https://bgmi_marketplace-service.bgmi-gateway.workers.dev/api"; // Production Gateway

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

    // Remove leading slash to avoid double slash in URL
    const cleanEndpoint = endpoint.replace(/^\//, "");

    const res = await fetch(`${BASE_URL}/${cleanEndpoint}`, {
      ...options,
      headers,
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const message = data.error || data.message || `Request to ${endpoint} failed.`;
      throw new Error(message);
    }

    return data;
  } catch (err) {
    console.error(`❌ API Error [${endpoint}]:`, err);
    return Promise.reject(err); // so caller can handle
  }
}

// --- Health Check Function ---
async function checkGateway() {
  console.log("🌐 Running Gateway & Service Health Check...");

  // Gateway Health
  try {
    const res = await fetch(GATEWAY_HEALTH);
    if (res.ok) console.log("✅ Gateway OK");
    else console.warn("⚠️ Gateway not healthy");
  } catch (err) {
    console.error("❌ Cannot reach Gateway", err);
  }

  // Market Service Health
  try {
    const res = await fetch(MARKET_HEALTH);
    if (res.ok) console.log("✅ Market Service OK");
    else console.warn("⚠️ Market Service DOWN or Unhealthy");
  } catch (err) {
    console.error("❌ Cannot reach Market Service", err);
  }
}

// --- Convenience Helpers ---
// Example: GET items from market
async function fetchMarketItems() {
  return apiRequest("market/items");
}

// Example: Buy item
async function buyMarketItem(itemId) {
  return apiRequest(`market/buy/${itemId}`, { method: "POST" });
}

// --- Auto-run health check on window load ---
window.addEventListener("load", checkGateway);

// --- Exporting for other JS files (if using modules) ---
// export { apiRequest, fetchMarketItems, buyMarketItem, checkGateway, SERVICES };
