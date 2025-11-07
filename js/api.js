// ===== api.js =====

// 🌍 Environment auto-detect
const BASE_LOCAL_API = "http://127.0.0.1:5000/api";
const BASE_GATEWAY = "https://bgmi-gateway.bgmi-gateway.workers.dev"; // main gateway
const BASE_MARKET_SERVICE = "https://bgmi_marketplace-service.bgmi-gateway.workers.dev/api/market";

// Universal service endpoints
const SERVICES = {
    auth: "https://bgmi_auth_service.bgmi-gateway.workers.dev",
    market: BASE_MARKET_SERVICE,
    wallet: `${BASE_GATEWAY}/wallet`,
    verify: `${BASE_GATEWAY}/verify`,
    chat: `${BASE_GATEWAY}/chat`,
    admin: `${BASE_GATEWAY}/admin`,
    notify: `${BASE_GATEWAY}/notify`,
};

// 🌐 Universal API request
async function apiRequest(endpoint, options = {}, service = 'market') {
    const token = localStorage.getItem("token");
    const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const baseURL = SERVICES[service] || BASE_MARKET_SERVICE;
    const cleanEndpoint = endpoint.replace(/^\//, "");
    const url = `${baseURL}/${cleanEndpoint}`;

    console.log("🌐 API Request:", url, options);

    try {
        const res = await fetch(url, { ...options, headers });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            throw new Error(data.error || data.message || "Request failed");
        }

        console.log("📥 API Response:", data);
        return data;
    } catch (err) {
        console.error(`❌ API Error [${endpoint}]:`, err);

        // Retry via gateway if direct fails
        if (!url.includes(BASE_GATEWAY)) {
            console.warn("⚠️ Retrying via Gateway...");
            const fallbackUrl = url.replace(baseURL, BASE_GATEWAY + `/${service}`);
            return apiRequest(fallbackUrl, options, service);
        }

        alert(`⚠️ ${err.message || "Error connecting to service."}`);
        throw err;
    }
}

// 🌟 Health Check (Gateway + Services)
async function checkGateway() {
    console.log("🌐 Running Gateway & Service Health Check...");

    try {
        const res = await fetch(BASE_GATEWAY + '/health');
        if (!res.ok) throw new Error("Gateway not healthy");
        console.log("✅ Gateway connection OK");

        // Market Service health
        try {
            const marketRes = await fetch(SERVICES.market + '/health');
            if (marketRes.ok) console.log("✅ Market Service OK");
            else console.warn("⚠️ Market Service DOWN");
        } catch {
            console.warn("❌ Market Service not reachable");
        }
    } catch (err) {
        console.error("⚠️ Cannot reach Gateway:", err);
        alert("⚠️ Cannot reach Gateway. Make sure it's live.");
    }
}

window.addEventListener("load", checkGateway);

// Export globally
window.apiRequest = apiRequest;
window.checkGateway = checkGateway;
