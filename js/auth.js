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
      const e = new Error(data.error || data.message || "Request failed");
      e.code = data.code || "";
      throw e;
    }
    return data;
  }

  async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${AUTH_API}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!res.ok) throw new Error("Refresh failed");

  const data = await res.json();
  localStorage.setItem("token", data.access_token);

  // 🔥 UPDATE USER FROM NEW TOKEN
  const payload = decodeJWT(data.access_token);
  const user = {
    id: payload.id,
    email: payload.email,
    role: payload.role,
    name: payload.name || payload.email.split("@")[0]
  };
  localStorage.setItem("user", JSON.stringify(user));

  return data.access_token;
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
        name: payload.name || payload.email.split("@")[0]
      };
      localStorage.setItem("user", JSON.stringify(user));

      showToast("Login successful!", "success");

      setTimeout(() => {
        location.href =
          user.role === "admin"
            ? "admin_dashboard.html"
            : (new URLSearchParams(location.search).get("redirect") || "index.html");
      }, 800);

    } catch (err) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        showVerifyPanel(email);
        showToast("Email not verified. Enter the OTP sent to your email.", "info");
      } else {
        showToast(err.message, "error");
      }
    }
  }
  async function registerUser() {
    const username = document.getElementById("register-name")?.value.trim();
    const email = document.getElementById("register-email")?.value.trim();
    const password = document.getElementById("register-password")?.value.trim();

    if (!username || !email || !password) {
      showToast("All fields required", "error");
      return;
    }

    try {
      const data = await apiFetch(`${AUTH_API}/register`, {
        method: "POST",
        body: JSON.stringify({ username, email, password })
      });

      if (data && data.verify_required) {
        showToast("Check your email for OTP to activate your account", "success");
        showVerifyPanel(email);
        document.getElementById("register-name").value = "";
        document.getElementById("register-password").value = "";
        return;
      }

      showToast("Registered successfully! Logging in...", "success");

      // auto fill login
      document.getElementById("login-email").value = email;
      document.getElementById("login-password").value = password;

      setTimeout(loginUser, 700);

    } catch (err) {
      showToast(err.message, "error");
    }
  }

  /* ===================== EMAIL VERIFICATION (SIGNUP OTP) ===================== */
  function showVerifyPanel(email) {
    const panel = document.getElementById("verifyPanel");
    if (!panel) return;
    document.getElementById("verifyEmail").textContent = email;
    document.getElementById("verify-email-store").value = email;
    document.getElementById("verify-otp").value = "";
    panel.style.display = "block";
    document.getElementById("verify-otp").focus();
  }

  function closeVerify() {
    const panel = document.getElementById("verifyPanel");
    if (panel) panel.style.display = "none";
  }

  async function verifyEmail() {
    const email = document.getElementById("verify-email-store")?.value.trim();
    const otp = document.getElementById("verify-otp")?.value.trim();

    if (!email || !otp) {
      showToast("Enter the OTP sent to your email", "error");
      return;
    }

    try {
      await apiFetch(`${AUTH_API}/verify-email`, {
        method: "POST",
        body: JSON.stringify({ email, otp })
      });

      showToast("Email verified! Logging in...", "success");
      closeVerify();
      document.getElementById("login-email").value = email;
      document.getElementById("login-password").value = "";
      document.getElementById("login-password").focus();
    } catch (err) {
      showToast(err.message || "Verification failed", "error");
    }
  }

  async function resendVerification() {
    const email = document.getElementById("verify-email-store")?.value.trim();
    if (!email) {
      showToast("No email to resend to", "error");
      return;
    }

    const link = document.getElementById("resendVerifyLink");
    if (link) {
      link.textContent = "Sending...";
      link.style.pointerEvents = "none";
    }

    try {
      await apiFetch(`${AUTH_API}/resend-verification`, {
        method: "POST",
        body: JSON.stringify({ email })
      });
      showToast("OTP resent to your email", "success");
    } catch (err) {
      showToast(err.message || "Failed to resend OTP", "error");
    } finally {
      if (link) {
        link.textContent = "Resend OTP";
        link.style.pointerEvents = "auto";
      }
    }
  }

  /* ===================== LOGOUT ===================== */
  function logout() {
    localStorage.clear();
    location.href = "login.html";
  }

  /* ===================== HELPERS ===================== */
  function getCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  return decodeJWT(token); // always latest from token
}



  function isAdmin() {
    return getCurrentUser()?.role === "admin";
  }

  /* ===================== ROUTE PROTECTION ===================== */
 function protectRoute({ admin = false } = {}) {
  const user = getCurrentUser();
  const token = localStorage.getItem("token");

  if (!user || !token) {
    if (window.location.pathname !== "/login.html") {
      location.href = "login.html";
    }
    return;
  }

  if (admin && user.role !== "admin") {
    if (window.location.pathname !== "/index.html") {
      location.href = "index.html";
    }
  }
}


  /* ===================== AUTO REFRESH ===================== */
window.addEventListener("load", async () => {
  // ❌ skip refresh on auth pages
  if (
    location.pathname.includes("login") ||
    location.pathname.includes("register") ||
    location.pathname.includes("forgot")
  ) {
    return;
  }

  const refreshToken = localStorage.getItem("refresh_token");
  if (refreshToken) {
    try {
      await refreshAccessToken();
    } catch {
      localStorage.clear();
      location.href = "login.html";
    }
  }
});

  /* ===================== FORGOT PASSWORD ===================== */
async function sendResetLink() {
  const email = document.getElementById("email")?.value.trim();
  const btn = document.getElementById("forgotBtn");

  if (!email) {
    showToast("Please enter your email", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending...";

  try {
    const data = await apiFetch(`${AUTH_API}/forgot-password`, {
      method: "POST",
      body: JSON.stringify({ email })
    });

    if (data && data.dev_otp) {
      const otpInput = document.getElementById("resetToken");
      if (otpInput) {
        otpInput.value = data.dev_otp;
        document.getElementById("newPassword")?.focus();
      }
      showToast("Backup code: " + data.dev_otp, "success");
    } else {
      showToast(data.message || "OTP sent to email", "success");
    }
  } catch (err) {
    showToast(err.message || "Failed to send OTP", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Send OTP";
  }
}

/* ===================== RESET PASSWORD ===================== */
async function resetPassword() {
  const otp = document.getElementById("resetToken")?.value.trim();
  const newPassword = document.getElementById("newPassword")?.value.trim();

  if (!otp || !newPassword) {
    showToast("OTP and new password required", "error");
    return;
  }

  try {
    await apiFetch(`${AUTH_API}/reset-password`, {
      method: "POST",
      body: JSON.stringify({
        otp,
        new_password: newPassword // ✅ FIX
      })
    });

    showToast("Password reset successful!", "success");
    setTimeout(() => location.href = "login.html", 1000);
  } catch (err) {
    showToast(err.message || "Reset failed", "error");
  }
}

  // bahar expose karo
  window.loginUser = loginUser;
  window.registerUser = registerUser;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.isAdmin = isAdmin;
  window.protectRoute = protectRoute;
  window.sendResetLink = sendResetLink;
  window.resetPassword = resetPassword;
  window.refreshAccessToken = refreshAccessToken;
  window.verifyEmail = verifyEmail;
  window.resendVerification = resendVerification;
  window.closeVerify = closeVerify;
  window.showVerifyPanel = showVerifyPanel;



  // google/facebook se login
  async function socialLogin(provider) {
    location.href = `${AUTH_API}/oauth/${provider}`;
  }
  window.socialLogin = socialLogin;

})();
