// ===== api.js (Unified for Vercel + Cloudflare Workers) =====

// 🛰️ Gateway base URL (use Workers in production)
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://127.0.0.1:5000/api" // local Flask dev (if needed)
  : "https://gateway.bgmi-gateway.workers.dev/api"; // ✅ Cloudflare Worker gateway

// Optional direct service paths (through gateway)
const AUTH_URL = `${BASE_URL}/auth`;
const MARKET_URL = `${BASE_URL}/market`;
const WALLET_URL = `${BASE_URL}/wallet`;

// --- Universal fetch helper ---
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${BASE_URL}/${endpoint}`, {
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
    const res = await fetch("https://gateway.bgmi-gateway.workers.dev/health");
    if (res.ok) console.log("✅ Gateway connection OK");
    else throw new Error("Gateway not healthy");
  } catch {
    alert("⚠️ Cannot reach Gateway. Make sure gateway is live.");
  }
}

// Auto-run health check
window.addEventListener("load", checkGateway);
