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
    name: payload.email.split("@")[0]
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
  const token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (token && isTokenExpired(token) && refreshToken) {
    try {
      await refreshAccessToken();
    } catch (err) {
      console.warn("Refresh failed, logging out");
      localStorage.clear();
      return; // ✅ redirect ke liye return
    }
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
        console.log(data);

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
