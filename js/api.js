// ===== api.js (Unified & Environment Aware) =====

// ✅ Auto-detect Gateway URL (works locally & in production)
const BASE_ORIGIN = window.location.origin.includes("localhost")
  ? "http://127.0.0.1:5000"
  : window.location.origin;

// ✅ All API routes go through the Gateway (port 5000)
const API_URL = `${BASE_ORIGIN}/api`;

// If you ever need to hit a service directly (for debugging only)
const AUTH_URL = `${BASE_ORIGIN}/api/auth`;
const MARKET_URL = `${BASE_ORIGIN}/api/market`;
const WALLET_URL = `${BASE_ORIGIN}/api/wallet`;

// --- Fetch helper (used across frontend scripts) ---
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_URL}/${endpoint}`, {
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

// --- Simple Connectivity Check ---
async function checkGateway() {
  try {
    const res = await fetch(`${BASE_ORIGIN}/health`);
    if (res.ok) console.log("✅ Gateway connection OK");
    else throw new Error("Gateway not healthy");
  } catch {
    alert("⚠️ Cannot reach Gateway. Make sure backend services are running.");
  }
}

// Run health check automatically on page load
window.addEventListener("load", checkGateway);
