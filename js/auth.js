(() => {
  /* ===================== CONFIG ===================== */
  const AUTH_API = location.hostname.includes("localhost")
    ? "http://127.0.0.1:5000/api/auth"
    : "https://auth-service.bgmi-gateway.workers.dev/api/auth";

  console.log("🔑 AUTH_API:", AUTH_API);

  /* ===================== TOAST ===================== */
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
  }

  function showToast(msg, type = "info") {
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  /* ===================== JWT HELPERS ===================== */
  function decodeJWT(token) {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  }

  function isTokenExpired(token) {
    const p = decodeJWT(token);
    return !p?.exp || Date.now() >= p.exp * 1000;
  }

  /* ===================== API FETCH ===================== */
  async function apiFetch(url, options = {}) {
    const token = localStorage.getItem("token");

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || data.message || "Request failed");
    }
    return data;
  }

  /* ===================== LOGIN ===================== */
  async function loginUser() {
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value.trim();

    if (!email || !password) {
      showToast("Email & password required", "error");
      return;
    }

    try {
      const data = await apiFetch(`${AUTH_API}/login`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);

      const payload = decodeJWT(data.access_token);
      const user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.email.split("@")[0]
      };
      localStorage.setItem("user", JSON.stringify(user));

      showToast("Login successful!", "success");

      setTimeout(() => {
        location.href =
          user.role === "admin"
            ? "admin_dashboard.html"
            : "index.html";
      }, 800);

    } catch (err) {
      showToast(err.message, "error");
    }
  }

  /* ===================== REGISTER ===================== */
  async function registerUser() {
    const username = document.getElementById("register-name")?.value.trim();
    const email = document.getElementById("register-email")?.value.trim();
    const password = document.getElementById("register-password")?.value.trim();

    if (!username || !email || !password) {
      showToast("All fields required", "error");
      return;
    }

    try {
      await apiFetch(`${AUTH_API}/register`, {
        method: "POST",
        body: JSON.stringify({ username, email, password })
      });

      showToast("Registered successfully! Logging in...", "success");

      // auto fill login
      document.getElementById("login-email").value = email;
      document.getElementById("login-password").value = password;

      setTimeout(loginUser, 700);

    } catch (err) {
      showToast(err.message, "error");
    }
  }

  /* ===================== LOGOUT ===================== */
  function logout() {
    localStorage.clear();
    location.href = "login.html";
  }

  /* ===================== HELPERS ===================== */
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  }

  function isAdmin() {
    return getCurrentUser()?.role === "admin";
  }

  /* ===================== ROUTE PROTECTION ===================== */
  function protectRoute({ admin = false } = {}) {
    const user = getCurrentUser();
    const token = localStorage.getItem("token");

    if (!user || !token) {
      location.href = "login.html";
      return;
    }

    if (admin && user.role !== "admin") {
      location.href = "index.html";
    }
  }

  /* ===================== AUTO REFRESH ===================== */
  window.addEventListener("load", () => {
    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      localStorage.clear();
      location.href = "login.html";
    }
  });

  /* ===================== FORGOT PASSWORD ===================== */
async function sendResetLink() {
    const email = document.getElementById("email")?.value.trim();

    if (!email) {
        showToast("Please enter your email", "error");
        return;
    }

    try {
        const data = await apiFetch(`${AUTH_API}/forgot-password`, {
            method: "POST",
            body: JSON.stringify({ email })
        });

        showToast(data.message || "Reset link sent! Check your email.", "success");
    } catch (err) {
        showToast(err.message || "Failed to send reset link", "error");
    }
}

/* ===================== RESET PASSWORD ===================== */
async function resetPassword() {
    const token = new URLSearchParams(window.location.search).get("token");
    const password = document.getElementById("reset-password")?.value.trim();
    const confirm = document.getElementById("reset-confirm")?.value.trim();

    if (!password || !confirm) {
        showToast("All fields required", "error");
        return;
    }

    if (password !== confirm) {
        showToast("Passwords do not match", "error");
        return;
    }

    try {
        const data = await apiFetch(`${AUTH_API}/reset-password`, {
            method: "POST",
            body: JSON.stringify({ token, password })
        });

        showToast(data.message || "Password reset successful!", "success");

        setTimeout(() => location.href = "login.html", 1000);

    } catch (err) {
        showToast(err.message || "Failed to reset password", "error");
    }
}



  /* ===================== EXPORT ===================== */
  window.loginUser = loginUser;
  window.registerUser = registerUser;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.isAdmin = isAdmin;
  window.protectRoute = protectRoute;
  window.sendResetLink = sendResetLink;
  window.resetPassword = resetPassword;

})();
