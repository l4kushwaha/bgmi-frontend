// ===== api.js (Unified + Auto-dynamic services) =====

// 🌍 Base Gateway URL (auto-switch: local → production)
const BASE_URL = window.location.hostname.includes("localhost")
  ? "http://127.0.0.1:5000/api" // local dev
  : "https://bgmi-gateway.workers.dev/api"; // Cloudflare production gateway

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
    const res = await fetch(`${BASE_URL.replace("/api", "")}/health`);
    if (res.ok) {
      console.log("✅ Gateway connection OK");
    } else {
      throw new Error("Gateway not healthy");
    }

    // Optional: Check each service
    for (const [name, url] of Object.entries(SERVICES)) {
      fetch(`${url}/health`)
        .then(r => r.ok ? console.log(`✅ ${name} OK`) : console.warn(`⚠️ ${name} DOWN`))
        .catch(() => console.warn(`❌ ${name} not reachable`));
    }
  } catch (err) {
    alert("⚠️ Cannot reach Gateway. Make sure it's live.");
  }
}

// Auto-run health check on load
window.addEventListener("load", checkGateway);
