document.addEventListener("DOMContentLoaded", () => {
    const authWrapper = document.querySelector(".auth-wrapper");
    const registerTrigger = document.querySelector(".register-trigger");
    const loginTrigger = document.querySelector(".login-trigger");

    // ================= TOAST CONTAINER =================
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

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    // ================= PANEL TOGGLE =================
    // Open Signup panel
    registerTrigger.addEventListener("click", (e) => {
        e.preventDefault();
        authWrapper.classList.add("toggled");
    });

    // Open Login panel
    loginTrigger.addEventListener("click", (e) => {
        e.preventDefault();
        authWrapper.classList.remove("toggled");
    });

    // ================= LOGIN BUTTON =================
    const loginBtn = document.querySelector(".loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof loginUser === "function") {
                loginUser()
                    .then(() => showToast("Login successful!", "success"))
                    .catch(err => showToast(err.message || "Login failed!", "error"));
            }
        });
    }

    // ================= REGISTER BUTTON =================
    const registerBtn = document.querySelector(".registerBtn");
    if (registerBtn) {
        registerBtn.addEventListener("click", (e) => {
            e.preventDefault();
            if (typeof registerUser === "function") {
                registerUser()
                    .then(() => showToast("Registration successful! Logging in...", "success"))
                    .catch(err => showToast(err.message || "Registration failed!", "error"));
            }
        });
    }
});
