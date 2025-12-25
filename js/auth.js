(() => {
  /* ===================== CONFIG ===================== */
  const BASE_LOCAL_API = "http://127.0.0.1:5000/api";
  const BASE_AUTH_SERVICE = "https://auth-service.bgmi-gateway.workers.dev/api/auth";

  const AUTH_API = location.hostname.includes("localhost")
    ? BASE_LOCAL_API + "/auth"
    : BASE_AUTH_SERVICE;

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

  /* ===================== JWT ===================== */
  function decodeJWT(token) {
    try {
      return JSON.parse(atob(token.split(".")[1]));
    } catch {
      return null;
    }
  }

  function isTokenExpired(token) {
    const p = decodeJWT(token);
    if (!p?.exp) return true;
    return Date.now() >= p.exp * 1000;
  }

  /* ===================== FETCH HELPER ===================== */
  async function apiFetch(url, options = {}, retry = true) {
    let token = localStorage.getItem("token");

    if (token && isTokenExpired(token)) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) throw new Error("Session expired");
      token = localStorage.getItem("token");
    }

    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401 && retry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return apiFetch(url, options, false);
      }
      throw new Error(data.error || data.message || "Request failed");
    }
    return data;
  }

  /* ===================== REFRESH TOKEN ===================== */
  async function refreshAccessToken() {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return false;

    try {
      const res = await fetch(`${AUTH_API}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh })
      });

      const data = await res.json();
      if (!res.ok || !data.access_token) throw new Error();

      localStorage.setItem("token", data.access_token);
      return true;
    } catch {
      logout(true);
      return false;
    }
  }

  /* ===================== EMAIL CHECK ===================== */
  function isValidEmail(email) {
    const r = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const fake = ["tempmail.com", "mailinator.com", "10minutemail.com", "yopmail.com"];
    return r.test(email) && !fake.some(d => email.endsWith("@" + d));
  }

  /* ===================== REGISTER ===================== */
  async function registerUser() {
    const username = document.getElementById("register_name")?.value.trim();
    const email = document.getElementById("register_email")?.value.trim();
    const password = document.getElementById("register_password")?.value.trim();

    if (!username || !email || !password)
      return showToast("All fields required", "error");

    if (!isValidEmail(email))
      return showToast("Invalid email", "error");

    try {
      await apiFetch(`${AUTH_API}/register`, {
        method: "POST",
        body: JSON.stringify({ username, email, password })
      });

      showToast("Registered successfully!", "success");

      document.getElementById("login_email").value = email;
      document.getElementById("login_password").value = password;
      await loginUser(true);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  /* ===================== LOGIN ===================== */
  async function loginUser(auto = false) {
    const email = document.getElementById("login_email")?.value.trim();
    const password = document.getElementById("login_password")?.value.trim();

    if (!email || !password)
      return showToast("Email & password required", "error");

    try {
      const data = await apiFetch(`${AUTH_API}/login`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      const payload = decodeJWT(data.access_token);
      if (!payload) throw new Error("Invalid session");

      const user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        name: payload.email.split("@")[0]
      };

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      localStorage.setItem("user", JSON.stringify(user));

      showToast("Login successful!", "success");
      location.href = user.role === "admin"
        ? "admin_dashboard.html"
        : "index.html";
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  /* ===================== LOGOUT ===================== */
  function logout(silent = false) {
    localStorage.clear();
    if (!silent) showToast("Logged out", "success");
    location.href = "login.html";
  }

  /* ===================== USER HELPERS ===================== */
  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem("user")); }
    catch { return null; }
  }

  function isAdmin() {
    return getCurrentUser()?.role === "admin";
  }

  /* ===================== ROUTE PROTECTION ===================== */
  function protectRoute({ auth = true, admin = false } = {}) {
    const user = getCurrentUser();
    const token = localStorage.getItem("token");

    if (auth && (!user || !token)) {
      location.href = "login.html";
      return;
    }

    if (admin && user?.role !== "admin") {
      location.href = "index.html";
    }
  }

  function redirectIfLoggedIn() {
    const user = getCurrentUser();
    if (user) {
      location.href = user.role === "admin"
        ? "admin_dashboard.html"
        : "index.html";
    }
  }

  /* ===================== AUTO CHECK ===================== */
  window.addEventListener("load", () => {
    const token = localStorage.getItem("token");
    if (token && isTokenExpired(token)) {
      refreshAccessToken();
    }
  });

  /* ===================== EXPORT ===================== */
  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.isAdmin = isAdmin;
  window.protectRoute = protectRoute;
  window.redirectIfLoggedIn = redirectIfLoggedIn;
})();
