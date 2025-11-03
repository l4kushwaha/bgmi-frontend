// ===== main.js =====

// Redirect if not logged in
function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
  }
}

// Logout user
function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// Load user info if available
function loadUserProfile() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    document.getElementById("username").textContent = user.name || "Player";
  }
}

// Navbar active page highlight
function setActiveNav() {
  const links = document.querySelectorAll("nav a");
  links.forEach(link => {
    if (link.href === window.location.href) {
      link.classList.add("active");
    }
  });
}

window.onload = function() {
  setActiveNav();
};

