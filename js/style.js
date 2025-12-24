document.addEventListener("DOMContentLoaded", () => {
    const authWrapper = document.querySelector(".auth-wrapper");
    const registerBtn = document.querySelector(".register-trigger");
    const loginBtn = document.querySelector(".login-trigger");

    // Open Signup
    registerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        authWrapper.classList.add("toggled");
    });

    // Open Login
    loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        authWrapper.classList.remove("toggled");
    });
});
