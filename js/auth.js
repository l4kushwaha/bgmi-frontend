// ===== auth.js (Extended BGMI Market v2.4 + OTP Reset Password, No redirect) =====
(() => {
  // 🌐 Base URLs
  const BASE_LOCAL_API = "http://127.0.0.1:5000/api";
  const BASE_GATEWAY_API = "https://bgmi-gateway.bgmi-gateway.workers.dev";
  const BASE_AUTH_SERVICE = "https://auth-service.bgmi-gateway.workers.dev/api/auth";

  // 🎯 Determine Auth API Endpoint dynamically
  const AUTH_API = window.AUTH_API || (() => {
    if (window.location.hostname.includes("localhost")) return BASE_LOCAL_API + "/auth";
    return BASE_AUTH_SERVICE;
  })();
  window.AUTH_API = AUTH_API;
  console.log("🔑 Using AUTH_API:", AUTH_API);

  // ===============================
  // 🧩 Universal Fetch Helper
  // ===============================
  async function apiFetch(url, options = {}, retry = true) {
    const token = localStorage.getItem("token");
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };
    if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

    console.log("🌐 API Request:", url, options);

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      console.log("📥 API Response:", data, "Status:", res.status);

      if (!res.ok) throw new Error(data.error || data.message || "Request failed");
      return data;
    } catch (err) {
      console.error("❌ API Error:", err);
      if (retry && !url.includes(BASE_GATEWAY_API)) {
        console.warn("⚠️ Retrying via Gateway...");
        const fallbackUrl = url.replace(AUTH_API, BASE_GATEWAY_API + "/api/auth");
        return apiFetch(fallbackUrl, options, false);
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
    const phone = document.getElementById("phone")?.value.trim() || "";
    const password = document.getElementById("password")?.value.trim();

    if (!full_name || !email || !password) return alert("⚠️ Please fill all required fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert("⚠️ Invalid email format.");

    const btn = document.getElementById("registerBtn");
    if (btn) btn.innerText = "Registering...";

    try {
      const payload = { full_name, email, phone, password };
      console.log("➡️ Sending registration payload:", payload);

      const data = await apiFetch(`${AUTH_API}/register`, { method: "POST", body: JSON.stringify(payload) });
      console.log("✅ Registration response:", data);

      alert("✅ Registration successful! Please log in.");
      window.location.href = "login.html";
    } catch (err) {
      console.error("Register Error:", err);
      alert(`⚠️ Registration failed: ${err.message}`);
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
    if (!email || !password) return alert("⚠️ Please enter both email and password.");

    const btn = document.getElementById("loginBtn");
    if (btn) btn.innerText = "Logging in...";

    try {
      const data = await apiFetch(`${AUTH_API}/login`, { method: "POST", body: JSON.stringify({ email, password }) });
      console.log("✅ Login response:", data);

      // ✅ Admin login
      if (data.role === "admin") {
        const adminUser = {
          id: 21,
          name: data.admin_info?.name || "Admin",
          email: data.admin_info?.email,
          phone: data.admin_info?.phone,
          role: "admin",
        };
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(adminUser));
        alert("👑 Welcome, Admin!");
        return window.location.href = "admin_dashboard.html";
      }

      // ✅ Normal user login
      if (data.role === "user" || data.user) {
  const userInfo = {
    id: Number(data.user?.id),                 // 🔥 force real ID
    name: data.user?.full_name                 // if future me aaye
          || data.user?.username               // 🔥 CURRENT BACKEND FIELD
          || "Player",
    email: data.user?.email || "",
    role: data.user?.role || "user",
    kyc_status: data.user?.kyc_status ?? "pending",
    is_verified: data.user?.is_verified ?? false,
  };

  // 🛡 Safety check
  if (!userInfo.id || userInfo.id <= 0) {
    console.error("❌ INVALID USER ID FROM AUTH:", data);
    alert("Login error: Invalid user ID");
    return;
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(userInfo));

  console.log("✅ USER SAVED:", userInfo);
  console.log("🆔 USER ID:", userInfo.id);

  alert("✅ Login successful!");
  return window.location.href = "index.html";
}


      alert("❌ Invalid credentials or account not found.");
    } catch (err) {
      console.error("Login Error:", err);
      alert(`⚠️ Login failed: ${err.message}`);
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
      const data = await apiFetch(`${AUTH_API}/forgot-password`, { method: "POST", body: JSON.stringify({ email }) });
      console.log("✅ Forgot Password response:", data);

      alert("✅ OTP sent to your email. Please check your inbox.");

      // ❌ Removed redirect to reset.html
      // OTP & New Password fields are expected to be visible on the same page
    } catch (err) {
      console.error("Forgot Password Error:", err);
      alert(`⚠️ Failed to send OTP: ${err.message}`);
    } finally {
      if (btn) btn.innerText = "Send OTP";
    }
  }

  // ===============================
  // 🔄 RESET PASSWORD
  // ===============================
  async function resetPassword() {
    const otpInput = document.getElementById("resetToken")?.value.trim();
    const new_password = document.getElementById("newPassword")?.value.trim();
    if (!otpInput || !new_password) return alert("⚠️ OTP and new password are required.");

    const btn = document.getElementById("resetBtn");
    if (btn) btn.innerText = "Resetting...";

    try {
      const data = await apiFetch(`${AUTH_API}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ otp: otpInput, new_password })
      });
      console.log("✅ Reset Password response:", data);

      alert("✅ Password reset successful! Please log in.");
    } catch (err) {
      console.error("Reset Password Error:", err);
      alert(`⚠️ Failed to reset password: ${err.message}`);
    } finally {
      if (btn) btn.innerText = "Reset Password";
    }
  }

  // ===============================
  // 🚪 LOGOUT
  // ===============================
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    updateFrontendAuth();
    if (!window.location.href.includes("index.html")) window.location.href = "login.html";
  }

  // ===============================
  // 👤 CURRENT USER UTILITIES
  // ===============================
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem("user")) || null; }
    catch { return null; }
  }
  function isAdmin() {
    const user = getCurrentUser();
    return user?.role === "admin";
  }

  // ===============================
  // 🧠 PROFILE/KYC HELPERS
  // ===============================
  function updateLocalUser(data = {}) {
    const user = getCurrentUser();
    if (!user) return;
    const updated = { ...user, ...data };
    localStorage.setItem("user", JSON.stringify(updated));
    updateFrontendAuth();
  }

  // ===============================
  // 🧠 FRONTEND AUTH STATE
  // ===============================
  function updateFrontendAuth() {
    const user = getCurrentUser();
    const guestView = document.getElementById("guest-view");
    const userDashboard = document.getElementById("user-dashboard");
    const logoutBtn = document.getElementById("logoutBtn");
    const usernameEl = document.getElementById("username");

    if (user) {
      guestView?.classList.replace("visible", "hidden");
      userDashboard?.classList.replace("hidden", "visible");
      logoutBtn?.classList.replace("hidden", "visible");
      if (usernameEl) usernameEl.textContent = user.name || "Player";
    } else {
      guestView?.classList.replace("hidden", "visible");
      userDashboard?.classList.replace("visible", "hidden");
      logoutBtn?.classList.replace("visible", "hidden");
    }
  }

  // ===============================
  // 🧠 GATEWAY HEALTH CHECK
  // ===============================
  async function testGatewayConnection() {
    try {
      const res = await fetch(AUTH_API + '/health');
      const data = await res.json();
      if (res.ok) console.log("🌐 Gateway Health:", data);
      else console.warn("⚠️ Gateway returned error:", data);
    } catch (err) {
      console.error("⚠️ Cannot reach Gateway:", err);
    }
  }

  // ===============================
  // 🚀 AUTO-RUN ON PAGE LOAD
  // ===============================
  window.addEventListener("load", () => {
    updateFrontendAuth();
    testGatewayConnection();

    // Auto-fill OTP from URL for reset page (optional)
    const params = new URLSearchParams(window.location.search);
    const otp = params.get("otp");
    if (otp && document.getElementById("resetToken")) {
      document.getElementById("resetToken").value = otp;
    }
  });

  // ===============================
  // 📌 Export functions globally
  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.sendResetLink = sendResetLink;
  window.resetPassword = resetPassword;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.isAdmin = isAdmin;
  window.updateLocalUser = updateLocalUser;
  window.updateFrontendAuth = updateFrontendAuth;
})();
