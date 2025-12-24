(() => {
  // 🌐 Base URLs
  const BASE_LOCAL_API = "http://127.0.0.1:5000/api";
  const BASE_GATEWAY_API = "https://bgmi-gateway.bgmi-gateway.workers.dev";
  const BASE_AUTH_SERVICE = "https://auth-service.bgmi-gateway.workers.dev/api/auth";

  const AUTH_API = window.AUTH_API || (() => {
    if (window.location.hostname.includes("localhost")) return BASE_LOCAL_API + "/auth";
    return BASE_AUTH_SERVICE;
  })();
  window.AUTH_API = AUTH_API;

  // ===============================
  // 🔓 JWT Decode Helper
  // ===============================
  function decodeJWT(token) {
    try { return JSON.parse(atob(token.split(".")[1])); } 
    catch { return null; }
  }

  // ===============================
  // 🧩 Universal Fetch Helper
  // ===============================
  async function apiFetch(url, options = {}, retry = true) {
    const token = localStorage.getItem("token");
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
    if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Request failed");
      return data;
    } catch (err) {
      if (retry && !url.includes(BASE_GATEWAY_API)) {
        return apiFetch(url.replace(AUTH_API, BASE_GATEWAY_API + "/api/auth"), options, false);
      }
      throw err;
    }
  }

  // ===============================
  // 🔔 Toast Helper
  // ===============================
  function showToast(message, type = "info") {
    if (window.toastr) toastr[type](message);
    else alert(message);
  }

  // ===============================
  // 🧾 REGISTER USER
  // ===============================
  async function registerUser() {
    const full_name = document.getElementById("full_name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim() || "";
    const password = document.getElementById("password")?.value.trim();

    if (!full_name || !email || !password) return showToast("Please fill all required fields", "error");

    const btn = document.getElementById("registerBtn");
    if (btn) btn.innerText = "Registering...";

    try {
      const payload = { full_name, email, phone, password };
      const data = await apiFetch(`${AUTH_API}/register`, { method: "POST", body: JSON.stringify(payload) });
      showToast("Registered successfully!", "success");

      // Auto-login after registration
      await loginUser({ emailInput: email, passwordInput: password, autoLogin: true });
    } catch (err) {
      if (err.message.includes("exists")) showToast("You are already registered. Please login", "warning");
      else showToast(err.message, "error");
    } finally { if (btn) btn.innerText = "Register"; }
  }

  // ===============================
  // 🔐 LOGIN USER
  // ===============================
  async function loginUser({ emailInput, passwordInput, autoLogin = false } = {}) {
    const email = emailInput || document.getElementById("email")?.value.trim();
    const password = passwordInput || document.getElementById("password")?.value.trim();

    if (!email || !password) return showToast("Enter email and password", "error");
    const btn = document.getElementById("loginBtn");
    if (btn) btn.innerText = "Logging in...";

    try {
      const data = await apiFetch(`${AUTH_API}/login`, { method: "POST", body: JSON.stringify({ email, password }) });
      const jwtPayload = decodeJWT(data.access_token);

      localStorage.setItem("token", data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);

      const userInfo = { id: jwtPayload?.id, name: jwtPayload?.email?.split("@")[0] || "Player", email, role: jwtPayload?.role };
      localStorage.setItem("user", JSON.stringify(userInfo));

      // Role-based redirect
      if (userInfo.role === "admin") window.location.href = "admin_dashboard.html";
      else window.location.href = "index.html";

    } catch (err) {
      if (err.message.includes("password")) showToast("Wrong password", "error");
      else if (err.message.includes("not found")) showToast("Please create an account", "warning");
      else showToast(err.message || "Login failed", "error");
    } finally { if (btn) btn.innerText = "Login"; }
  }

  // ===============================
  // 🔁 FORGOT PASSWORD
  // ===============================
  async function sendResetLink() {
    const email = document.getElementById("email")?.value.trim();
    if (!email) return showToast("Please enter your email", "error");

    const btn = document.getElementById("forgotBtn");
    if (btn) btn.innerText = "Sending...";
    try {
      await apiFetch(`${AUTH_API}/forgot-password`, { method: "POST", body: JSON.stringify({ email }) });
      showToast("OTP sent to your email", "success");
    } catch (err) {
      showToast(err.message || "Failed to send OTP", "error");
    } finally { if (btn) btn.innerText = "Send OTP"; }
  }

  // ===============================
  // 🔄 RESET PASSWORD
  // ===============================
  async function resetPassword() {
    const otpInput = document.getElementById("resetToken")?.value.trim();
    const new_password = document.getElementById("newPassword")?.value.trim();
    if (!otpInput || !new_password) return showToast("OTP and new password required", "error");

    const btn = document.getElementById("resetBtn");
    if (btn) btn.innerText = "Resetting...";
    try {
      await apiFetch(`${AUTH_API}/reset-password`, { method: "POST", body: JSON.stringify({ otp: otpInput, new_password }) });
      showToast("Password reset successful! Please log in", "success");
    } catch (err) {
      showToast(err.message || "Failed to reset password", "error");
    } finally { if (btn) btn.innerText = "Reset Password"; }
  }

  // ===============================
  // 🚪 LOGOUT
  // ===============================
  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    updateFrontendAuth();
    if (!window.location.href.includes("index.html")) window.location.href = "login.html";
  }

  // ===============================
  // 👤 CURRENT USER UTILITIES
  // ===============================
  function getCurrentUser() { try { return JSON.parse(localStorage.getItem("user")) || null; } catch { return null; } }
  function isAdmin() { return getCurrentUser()?.role === "admin"; }

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
      if (usernameEl) usernameEl.textContent = user.name;
    } else {
      guestView?.classList.replace("hidden", "visible");
      userDashboard?.classList.replace("visible", "hidden");
      logoutBtn?.classList.replace("visible", "hidden");
    }
  }

  // ===============================
  // 🌐 AUTO-RUN ON PAGE LOAD
  // ===============================
  window.addEventListener("load", () => {
    updateFrontendAuth();
    const params = new URLSearchParams(window.location.search);
    const otp = params.get("otp");
    if (otp && document.getElementById("resetToken")) document.getElementById("resetToken").value = otp;
  });

  // ===============================
  // 🌟 EXPORT FUNCTIONS
  // ===============================
  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.sendResetLink = sendResetLink;
  window.resetPassword = resetPassword;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.isAdmin = isAdmin;
  window.updateFrontendAuth = updateFrontendAuth;
})();
