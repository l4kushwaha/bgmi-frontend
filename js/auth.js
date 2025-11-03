// ===== auth.js (Final Working Version) =====

// ✅ Your backend service base URL
const GATEWAY_BASE = "http://10.84.71.149:5001";
const AUTH_API = `${GATEWAY_BASE}/api/auth`;

// ===============================
// 🧩 Unified Fetch Helper
// ===============================
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || data.message || "Unknown error");
    return data;
  } catch (err) {
    console.error("❌ API Error:", err);
    alert(`⚠️ ${err.message || "Error connecting to server."}`);
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
    return alert("⚠️ Please fill in all fields.");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return alert("⚠️ Invalid email format.");

  const btn = document.getElementById("registerBtn");
  if (btn) btn.innerText = "Registering...";

  try {
    await apiFetch(`${AUTH_API}/register`, {
      method: "POST",
      body: JSON.stringify({ full_name, email, phone, password }),
    });

    alert("✅ Registration successful! Please log in.");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Register Error:", err);
  } finally {
    if (btn) btn.innerText = "Register";
  }
}

// ===============================
// 🔐 LOGIN USER (Admin + User)
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

    console.log("✅ Login Response:", data);

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

    // --- NORMAL USER LOGIN ---
    if (data.role === "user" && data.user) {
      const userInfo = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: "user",
      };

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(userInfo));

      alert("✅ Login successful!");
      return (window.location.href = "index.html");
    }

    // --- FALLBACK ---
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
async function forgotPassword() {
  const email = document.getElementById("email")?.value.trim();
  if (!email) return alert("⚠️ Please enter your email.");

  try {
    await apiFetch(`${AUTH_API}/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    alert("✅ Password reset instructions sent to your email!");
  } catch (err) {
    console.error("Forgot Password Error:", err);
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
// 👤 GET CURRENT USER
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
// 🧠 Quick Server Health Check
// ===============================
async function testServerConnection() {
  try {
    const res = await fetch(`${GATEWAY_BASE}/`);
    if (res.ok) console.log("✅ Auth Service connection OK");
    else throw new Error("Auth service not healthy");
  } catch (e) {
    console.warn("⚠️ Cannot reach Auth Service. Make sure it's running.");
  }
}

window.addEventListener("load", testServerConnection);
