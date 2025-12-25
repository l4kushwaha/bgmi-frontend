(() => {
    const BASE_LOCAL_API = "http://127.0.0.1:5000/api";
    const BASE_GATEWAY_API = "https://bgmi-gateway.bgmi-gateway.workers.dev";
    const BASE_AUTH_SERVICE = "https://auth-service.bgmi-gateway.workers.dev/api/auth";

    const AUTH_API = window.AUTH_API || (() => {
        if (window.location.hostname.includes("localhost")) return BASE_LOCAL_API + "/auth";
        return BASE_AUTH_SERVICE;
    })();
    window.AUTH_API = AUTH_API;

    console.log("🔑 Using AUTH_API:", AUTH_API);

    // ===================== TOAST =====================
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
        toastContainer = document.createElement("div");
        toastContainer.id = "toast-container";
        document.body.appendChild(toastContainer);
    }

    function showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // ===================== JWT DECODE =====================
    function decodeJWT(token) {
        try {
            const payload = token.split(".")[1];
            return JSON.parse(atob(payload));
        } catch (err) {
            console.error("JWT decode failed", err);
            return null;
        }
    }

    // ===================== FETCH HELPER =====================
    async function apiFetch(url, options = {}, retry = true) {
        const token = localStorage.getItem("token");
        const headers = {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        };
        if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

        try {
            const res = await fetch(url, { ...options, headers });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(data.error || data.message || "Request failed");
            return data;
        } catch (err) {
            console.error("API Error:", err);
            if (retry && !url.includes(BASE_GATEWAY_API)) {
                const fallbackUrl = url.replace(AUTH_API, BASE_GATEWAY_API + "/api/auth");
                return apiFetch(fallbackUrl, options, false);
            }
            showToast(err.message || "Error connecting to Auth Service", "error");
            throw err;
        }
    }

    // ===================== EMAIL VALIDATION =====================
    function isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regex.test(email)) return false;
        const fakeDomains = ["tempmail.com","mailinator.com","10minutemail.com","yopmail.com"];
        return !fakeDomains.some(d => email.endsWith("@" + d));
    }

    // ===================== REGISTER =====================
    async function registerUser() {
        const full_name = document.getElementById("register-name")?.value.trim();
        const email = document.getElementById("register-email")?.value.trim();
        const password = document.getElementById("register-password")?.value.trim();

        if (!full_name || !email || !password) {
            showToast("Please fill all fields!", "error");
            return;
        }

        if (!isValidEmail(email)) {
            showToast("Fake or invalid email detected!", "error");
            return;
        }

        const btn = document.querySelector("#registerBtn");
        if (btn) btn.innerText = "Registering...";

        try {
            const data = await apiFetch(`${AUTH_API}/register`, {
                method: "POST",
                body: JSON.stringify({ username: full_name, email, password })
            });

            showToast("Registration successful! Logging in...", "success");
            // Auto-login after registration
            document.getElementById("login-email").value = email;
            document.getElementById("login-password").value = password;
            await loginUser(true);
        } catch (err) {
            showToast(err.message || "Registration failed!", "error");
        } finally {
            if (btn) btn.innerText = "Register";
        }
    }

    // ===================== LOGIN =====================
    async function loginUser(auto = false) {
        const emailEl = document.getElementById(auto ? "login-email" : "login-email") || document.getElementById("register-email");
        const passwordEl = document.getElementById(auto ? "login-password" : "login-password") || document.getElementById("register-password");
        const email = emailEl?.value.trim();
        const password = passwordEl?.value.trim();

        if (!email || !password) {
            showToast("Enter both email and password!", "error");
            return;
        }

        const btn = document.querySelector("#loginBtn");
        if (btn) btn.innerText = "Logging in...";

        try {
            const data = await apiFetch(`${AUTH_API}/login`, {
                method: "POST",
                body: JSON.stringify({ email, password })
            });

            const jwtPayload = decodeJWT(data.access_token);
            if (!jwtPayload || !jwtPayload.id) throw new Error("Invalid session");

            const userInfo = {
                id: Number(jwtPayload.id),
                name: jwtPayload.email?.split("@")[0] || "Player",
                email: jwtPayload.email,
                role: jwtPayload.role || "user"
            };

            localStorage.setItem("token", data.access_token);
            localStorage.setItem("user", JSON.stringify(userInfo));

            if (userInfo.role === "admin") {
                showToast("Welcome, Admin!", "success");
                return window.location.href = "admin_dashboard.html";
            }

            showToast("Login successful!", "success");
            window.location.href = "index.html";
        } catch (err) {
            if (err.message.includes("credentials")) {
                showToast("Wrong password!", "error");
            } else if (err.message.includes("not found")) {
                showToast("You are not a registered user!", "error");
            } else {
                showToast(err.message || "Login failed!", "error");
            }
        } finally {
            if (btn) btn.innerText = "Login";
        }
    }

    // ===================== FORGOT PASSWORD =====================
    async function sendResetLink() {
        const email = document.getElementById("login-email")?.value.trim();
        if (!email) {
            showToast("Enter your email!", "error");
            return;
        }

        try {
            await apiFetch(`${AUTH_API}/forgot-password`, {
                method: "POST",
                body: JSON.stringify({ email })
            });
            showToast("OTP sent to your email!", "success");
        } catch (err) {
            showToast(err.message || "Failed to send OTP", "error");
        }
    }

    // ===================== RESET PASSWORD =====================
    async function resetPassword() {
        const otp = document.getElementById("resetToken")?.value.trim();
        const new_password = document.getElementById("newPassword")?.value.trim();
        if (!otp || !new_password) {
            showToast("OTP and new password are required!", "error");
            return;
        }

        try {
            await apiFetch(`${AUTH_API}/reset-password`, {
                method: "POST",
                body: JSON.stringify({ otp, new_password })
            });
            showToast("Password reset successful!", "success");
            window.location.href = "login.html";
        } catch (err) {
            showToast(err.message || "Password reset failed", "error");
        }
    }

    // ===================== LOGOUT =====================
    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        showToast("Logged out successfully!", "success");
        window.location.href = "login.html";
    }

    // ===================== CURRENT USER =====================
    function getCurrentUser() {
        try { return JSON.parse(localStorage.getItem("user")) || null; }
        catch { return null; }
    }

    function isAdmin() {
        const user = getCurrentUser();
        return user?.role === "admin";
    }

    // ===================== FRONTEND AUTH STATE =====================
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

    // ===================== AUTO-RUN =====================
    window.addEventListener("load", () => {
        updateFrontendAuth();
        const params = new URLSearchParams(window.location.search);
        const otp = params.get("otp");
        if (otp && document.getElementById("resetToken")) {
            document.getElementById("resetToken").value = otp;
        }
    });

    // ===================== EXPORT =====================
    window.registerUser = registerUser;
    window.loginUser = loginUser;
    window.sendResetLink = sendResetLink;
    window.resetPassword = resetPassword;
    window.logout = logout;
    window.getCurrentUser = getCurrentUser;
    window.isAdmin = isAdmin;
    window.updateFrontendAuth = updateFrontendAuth;

})();
