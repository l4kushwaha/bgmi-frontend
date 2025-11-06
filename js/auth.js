// ===== auth.js (Extended + Debug-Friendly) =====

// 🌐 Auto-detect environment & endpoints
const BASE_LOCAL_API = "http://127.0.0.1:5000/api"; // Local dev
const BASE_GATEWAY_API = "https://bgmi-gateway.bgmi-gateway.workers.dev/api"; // Gateway
const BASE_AUTH_SERVICE = "https://bgmi-auth-service.bgmi-gateway.workers.dev/api/auth"; // Direct auth

// 🎯 Auth API Endpoint (auto fallback)
const AUTH_API = (() => {
  if (window.location.hostname.includes("localhost")) return BASE_LOCAL_API + "/auth";
  return BASE_AUTH_SERVICE; // Use direct auth in production
})();

// ===============================
// 🧩 Universal Fetch Helper
// ===============================
async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  console.log("🌐 API Request:", url, options);

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    console.log("📥 API Response:", data, "Status:", res.status);

    if (!res.ok) throw new Error(data.error || data.message || "Request failed");
    return data;
  } catch (err) {
    console.error("❌ API Error:", err);

    // Try fallback to gateway if not using it yet
    if (!url.includes(BASE_GATEWAY_API)) {
      console.warn("⚠️ Retrying via Gateway...");
      const fallbackUrl = url.replace(AUTH_API, BASE_GATEWAY_API + "/auth");
      return apiFetch(fallbackUrl, options);
    }

    alert(`⚠️ ${err.message || "Error connecting to Auth Service."}`);
    throw err;
  }
}

// ===============================
// 🧾 REGISTER USER
// ===============================
async function registerUser() {
  const full_name = document.getElementById("full_name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!full_name || !email || !phone || !password)
    return alert("⚠️ Please fill all fields.");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return alert("⚠️ Invalid email format.");

  const btn = document.getElementById("registerBtn");
  if (btn) btn.innerText = "Registering...";

  try {
    const data = await apiFetch(`${AUTH_API}/register`, {
      method: "POST",
      body: JSON.stringify({ full_name, email, phone, password }),
    });

    console.log("✅ Registration response:", data);

    alert("✅ Registration successful! Please log in.");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Register Error:", err);
  } finally {
    if (btn) btn.innerText = "Register";
  }
}

// ===============================
// 🔐 LOGIN USER
// ===============================
async function loginUser() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value.trim();

  if (!email || !password)
    return alert("⚠️ Please enter both email and password.");

  const btn = document.getElementById("loginBtn");
  if (btn) btn.innerText = "Logging in...";

  try {
    const data = await apiFetch(`${AUTH_API}/login`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    console.log("✅ Login response:", data);

    // --- ADMIN LOGIN ---
    if (data.role === "admin") {
      const adminUser = {
        id: 0,
        name: data.admin_info?.name || "Admin",
        email: data.admin_info?.email,
        phone: data.admin_info?.phone,
        role: "admin",
      };
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(adminUser));
      alert("👑 Welcome, Admin!");
      return (window.location.href = "admin_dashboard.html");
    }

    // --- USER LOGIN ---
    if (data.role === "user" && data.user) {
      const userInfo = {
        id: data.user.id,
        name: data.user.full_name,
        email: data.user.email,
        role: "user",
      };
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(userInfo));
      alert("✅ Login successful!");
      return (window.location.href = "index.html");
    }

    alert("❌ Invalid credentials or account not found.");
  } catch (err) {
    console.error("Login Error:", err);
  } finally {
    if (btn) btn.innerText = "Login";
  }
}

// ===============================
// 🔁 FORGOT PASSWORD
// ===============================
async function sendResetLink() {
  const email = document.getElementById("email")?.value.trim();
  if (!email) return alert("⚠️ Please enter your email.");

  const btn = document.getElementById("forgotBtn");
  if (btn) btn.innerText = "Sending...";

  try {
    const data = await apiFetch(`${AUTH_API}/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    console.log("✅ Forgot Password response:", data);

    alert("✅ Password reset link sent! Check your email.");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Forgot Password Error:", err);
  } finally {
    if (btn) btn.innerText = "Send Reset Link";
  }
}

// ===============================
// 🚪 LOGOUT
// ===============================
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// ===============================
// 👤 CURRENT USER UTILITIES
// ===============================
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function isAdmin() {
  const user = getCurrentUser();
  return user?.role === "admin";
}

// ===============================
// 🧠 GATEWAY HEALTH CHECK
// ===============================
async function testGatewayConnection() {
  try {
    const res = await fetch(`${BASE_GATEWAY_API}/health`);
    const data = await res.json().catch(() => ({}));
    console.log("🌐 Gateway Health:", data);

    if (res.ok) console.log("✅ Gateway connection OK");
    else throw new Error("Gateway not healthy");
  } catch (err) {
    console.warn("⚠️ Cannot reach Gateway. Make sure it's live.", err);
  }
}

window.addEventListener("load", testGatewayConnection);

// ===============================
// 📌 Export functions globally
window.registerUser = registerUser;
window.loginUser = loginUser;
window.sendResetLink = sendResetLink;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.isAdmin = isAdmin;
