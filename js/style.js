document.addEventListener("DOMContentLoaded", () => {
  const authWrapper = document.querySelector(".auth-wrapper");
  const registerTrigger = document.querySelector(".register-trigger");
  const loginTrigger = document.querySelector(".login-trigger");

  // ================= PANEL TOGGLE ONLY =================

  if (registerTrigger) {
    registerTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      authWrapper.classList.add("toggled");
    });
  }

  if (loginTrigger) {
    loginTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      authWrapper.classList.remove("toggled");
    });
  }
});
