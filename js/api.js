// ===== api.js (Unified + Auto-dynamic services) =====
const API_URL = "https://marketplace_service.bgmi-gateway.workers.dev/api/market";


// 🌍 Base Gateway URL (auto-switch: local → production)
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://127.0.0.1:5000/api" // local dev
  : "https://bgmi-gateway.bgmi-gateway.workers.dev"; // Cloudflare production gateway

// --- Define service endpoints through gateway ---
const SERVICES = {
  auth: `${BASE_URL}/auth`,
  market: `${BASE_URL}/market`,
  wallet: `${BASE_URL}/wallet`,
  verify: `${BASE_URL}/verify`,
  chat: `${BASE_URL}/chat`,
  admin: `${BASE_URL}/admin`,
  notify: `${BASE_URL}/notify`,
};

// --- Universal Fetch Helper ---
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // If endpoint starts with '/', remove it to prevent double slashes
  const cleanEndpoint = endpoint.replace(/^\//, "");

  try {
    const res = await fetch(`${BASE_URL}/${cleanEndpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data.error || data.message || "Request failed.";
      throw new Error(message);
    }

    return data;
  } catch (err) {
    console.error(`❌ API Error [${endpoint}]:`, err);
    alert(`⚠️ ${err.message || "Error connecting to Gateway."}`);
    throw err;
  }
}

// --- Health Check for Gateway and Services ---
async function checkGateway() {
  try {
    // Gateway health
    const res = await fetch(`${BASE_URL.replace("/api", "")}/health`);
    if (res.ok) {
      console.log("✅ Gateway connection OK");
    } else {
      throw new Error("Gateway not healthy");
    }

    // Only check MARKET service health
    try {
      const marketRes = await fetch(`${SERVICES.market}/health`);
      if (marketRes.ok) console.log("✅ Market Service OK");
      else console.warn("⚠️ Market Service DOWN");
    } catch {
      console.warn("❌ Market Service not reachable");
    }
  } catch (err) {
    alert("⚠️ Cannot reach Gateway. Make sure it's live.");
  }
}
async function loadMarketplace() {
  try {
    const response = await fetch(`${API_URL}/all`);
    const data = await response.json();

    const container = document.getElementById('items-container');
    container.innerHTML = data.items.map(item => `
      <div class="item-card">
        <img src="${item.images?.[0] || 'https://via.placeholder.com/250x150?text=No+Image'}" alt="BGMI ID">
        <div class="item-info">
          <strong>UID:</strong> ${item.uid}<br>
          <strong>Title:</strong> ${item.title}<br>
          <strong>Price:</strong> ₹${item.price}<br>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("❌ API Error [market/all]:", err);
  }
}


// Auto-run health check on load
window.addEventListener("load", checkGateway);
