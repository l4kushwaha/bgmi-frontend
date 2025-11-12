// ===== marketplace.js (Extended Version with JWT Login) =====
(() => {
  const API_URL = window.SERVICES?.market || "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  window.MARKET_API = API_URL;

  let previousItemUids = new Set();
  let selectedItemId = null;
  let ADMIN_JWT = null;

  // ===== Toast Helper =====
  function showToast(message, success = true) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.position = 'fixed';
      toast.style.bottom = '20px';
      toast.style.left = '50%';
      toast.style.transform = 'translateX(-50%)';
      toast.style.padding = '10px 20px';
      toast.style.borderRadius = '20px';
      toast.style.zIndex = 1100;
      toast.style.fontFamily = 'Poppins, sans-serif';
      toast.style.color = '#fff';
      toast.style.transition = 'opacity 0.3s';
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.background = success ? '#27ae60' : '#c0392b';
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
  }

  // ===== Modal Helpers =====
  let modalBg, confirmBtn, cancelBtn;

  function openModal(id) {
    selectedItemId = id;
    if (modalBg) modalBg.style.display = 'flex';
  }

  function closeModal() {
    selectedItemId = null;
    if (modalBg) modalBg.style.display = 'none';
  }

  // ===== API Request Helper =====
  async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}/${endpoint}`;
    const token = localStorage.getItem("jwt_token"); // ✅ User token automatically
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(ADMIN_JWT ? { "Authorization": `Bearer ${ADMIN_JWT}` } : {})
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json();
  }

  // ===== Render Single Item =====
  function renderItem(item) {
    const card = document.createElement("div");
    card.dataset.id = item.id;
    card.dataset.uid = item.uid;

    // Inline styles
    card.style.border = "1px solid #00ffff";
    card.style.borderRadius = "12px";
    card.style.padding = "10px";
    card.style.margin = "10px";
    card.style.width = "250px";
    card.style.display = "inline-block";
    card.style.verticalAlign = "top";
    card.style.background = "rgba(0,0,0,0.5)";
    card.style.color = "#fff";
    card.style.fontFamily = "Poppins, sans-serif";
    card.style.position = "relative";

    const isNew = !previousItemUids.has(item.uid);
    if (isNew) {
      const badge = document.createElement("div");
      badge.innerText = "NEW";
      badge.style.position = "absolute";
      badge.style.top = "5px";
      badge.style.right = "5px";
      badge.style.background = "#ff00ff";
      badge.style.color = "#fff";
      badge.style.padding = "2px 6px";
      badge.style.borderRadius = "6px";
      badge.style.fontSize = "12px";
      badge.style.fontWeight = "700";
      card.appendChild(badge);
    }
    previousItemUids.add(item.uid);

    const imgUrl = item.images?.[0] || "https://via.placeholder.com/250x150?text=No+Image";
    const isAvailable = item.status?.toLowerCase() === "available";
    const highlightsText = Array.isArray(item.highlights) ? item.highlights.join(", ") : (item.highlights || "");

    const img = document.createElement("img");
    img.src = imgUrl;
    img.style.width = "100%";
    img.style.borderRadius = "8px";
    img.style.marginBottom = "8px";
    card.appendChild(img);

    const infoDiv = document.createElement("div");
    infoDiv.style.fontSize = "14px";
    infoDiv.style.lineHeight = "1.4em";

    infoDiv.innerHTML = `
      <strong>UID:</strong> ${item.uid || "N/A"}<br>
      <strong>Rank:</strong> ${item.rank || "N/A"}<br>
      <strong>Price:</strong> ₹${item.price || "N/A"}<br>
      ${highlightsText ? `<div style="color:#00ffff;font-size:12px;">${highlightsText}</div>` : ""}
      <strong>Status:</strong> <span class="item-status">${item.status || "Available"}</span><br>
    `;

    const btn = document.createElement("button");
    btn.innerText = isAvailable ? "Buy" : "Sold Out";
    btn.disabled = !isAvailable;
    btn.style.padding = "6px 12px";
    btn.style.marginTop = "5px";
    btn.style.width = "100%";
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.background = isAvailable ? "linear-gradient(135deg,#00ffff,#ff00ff)" : "#888";
    btn.style.color = "#fff";
    btn.style.cursor = isAvailable ? "pointer" : "not-allowed";
    btn.addEventListener("click", () => openModal(item.id));

    infoDiv.appendChild(btn);
    card.appendChild(infoDiv);

    return card;
  }

  // ===== Render All Items =====
  function renderItems(container, items) {
    container.innerHTML = "";
    if (!items.length) {
      container.innerHTML = "<p>No items available.</p>";
      return;
    }
    items.forEach(item => container.appendChild(renderItem(item)));
  }

  // ===== Load Marketplace =====
  async function loadMarketplace() {
    const container = document.getElementById('items-container');
    if (!container) return console.error("#items-container not found");
    container.innerHTML = "<p>Loading items...</p>";
    try {
      const data = await apiRequest('listings');
      renderItems(container, data || []);
    } catch (err) {
      container.innerHTML = `<p style="color:red;">⚠️ Failed to load items: ${err.message}</p>`;
      showToast(`⚠️ Failed to load items: ${err.message}`, false);
    }
  }

  // ===== Update Single Item in DOM =====
  function updateItemInDOM(item) {
    const card = document.querySelector(`div[data-id='${item.id}']`);
    if (!card) return;

    const statusEl = card.querySelector(".item-status");
    const buyBtn = card.querySelector("button");
    statusEl.innerText = item.status || "Available";
    if (item.status?.toLowerCase() !== "available") {
      buyBtn.disabled = true;
      buyBtn.innerText = "Sold Out";
      buyBtn.style.background = "#888";
      buyBtn.style.cursor = "not-allowed";
    }
  }

  // ===== User Login =====
  async function loginUser(email, password) {
    try {
      const res = await fetch("https://bgmi_auth_service.bgmi-gateway.workers.dev/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("jwt_token", data.token); // ✅ Store JWT
        showToast("Login successful");
        return data.token;
      } else {
        showToast("Login failed", false);
        return null;
      }
    } catch (err) {
      showToast("Login error: " + err.message, false);
      return null;
    }
  }

  // ===== Admin Section =====
  function renderAdminSection() {
    const adminDiv = document.createElement("div");
    adminDiv.style.margin = "20px";
    adminDiv.style.padding = "15px";
    adminDiv.style.background = "#1a1a1a";
    adminDiv.style.color = "#fff";
    adminDiv.style.borderRadius = "10px";
    adminDiv.style.fontFamily = "Poppins, sans-serif";

    adminDiv.innerHTML = `
      <h3 style="color:#00ffc6;">Admin Panel</h3>
      <label>Admin JWT:</label>
      <input type="text" id="admin-jwt-input" placeholder="Enter admin JWT" style="width:90%;padding:5px;margin-bottom:10px;"><br>
      <button id="admin-login-btn" style="padding:5px 10px;">Login as Admin</button>
      <hr style="border-color:#333;margin:10px 0;">
      <h4>Create Listing</h4>
      <input type="text" id="admin-uid" placeholder="UID" style="width:45%;margin-right:5px;padding:5px;">
      <input type="text" id="admin-title" placeholder="Title" style="width:45%;padding:5px;"><br><br>
      <textarea id="admin-desc" placeholder="Description" style="width:90%;height:50px;padding:5px;"></textarea><br><br>
      <input type="number" id="admin-price" placeholder="Price" style="width:30%; margin-right:5px;padding:5px;">
      <input type="text" id="admin-rank" placeholder="Rank" style="width:30%; margin-right:5px;padding:5px;">
      <input type="number" id="admin-level" placeholder="Level" style="width:30%;padding:5px;"><br><br>
      <button id="admin-create-listing-btn" style="padding:5px 10px;">Create Listing</button>
    `;

    document.body.prepend(adminDiv);

    document.getElementById('admin-login-btn').addEventListener('click', () => {
      const token = document.getElementById('admin-jwt-input').value.trim();
      if (!token) return showToast("Enter a valid JWT", false);
      ADMIN_JWT = token;
      showToast("✅ Admin logged in");
    });

    document.getElementById('admin-create-listing-btn').addEventListener('click', async () => {
      if (!ADMIN_JWT) return showToast("Login first with Admin JWT", false);
      const uid = document.getElementById('admin-uid').value.trim();
      const title = document.getElementById('admin-title').value.trim();
      const description = document.getElementById('admin-desc').value.trim();
      const price = parseInt(document.getElementById('admin-price').value) || 0;
      const rank = document.getElementById('admin-rank').value.trim();
      const level = parseInt(document.getElementById('admin-level').value) || 0;

      if (!uid || !title) return showToast("UID and Title required", false);

      const body = { 
        seller_id: "admin_user", uid, title, description, price, rank, level, 
        mythic_count:0, legendary_count:0, xsuit_count:0, gilt_count:0, honor_gilt_set:0,
        upgradable_guns:0, rare_glider:0, vehicle_skin:0, special_titles:0
      };

      try {
        const res = await apiRequest('listings/create', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        showToast("✅ Listing created: " + (res.message || "Success"));
        loadMarketplace(); // refresh items
      } catch (err) {
        showToast(`⚠️ Failed: ${err.message}`, false);
      }
    });
  }

  // ===== Initialize Marketplace =====
  function initMarketplace() {
    modalBg = document.getElementById('modal-bg');
    confirmBtn = document.getElementById('confirm-btn');
    cancelBtn = document.getElementById('cancel-btn');

    if (confirmBtn) confirmBtn.addEventListener('click', async () => {
      if (!selectedItemId) return;
      try {
        const res = await apiRequest(`listings/purchase/${selectedItemId}`, {
          method: 'POST',
          body: JSON.stringify({ payment_method: "wallet" })
        });
        showToast(`✅ Purchase successful: ${res.message}`, true);
        updateItemInDOM({ id: selectedItemId, status: "Sold Out" });
      } catch (err) {
        showToast(`⚠️ Purchase failed: ${err.message}`, false);
      }
      closeModal();
    });

    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    const searchInput = document.getElementById("search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll("div[data-id]").forEach(card => {
          const text = card.innerText.toLowerCase();
          card.style.display = text.includes(query) ? "inline-block" : "none";
        });
      });
    }

    renderAdminSection();
    loadMarketplace();
    setInterval(loadMarketplace, 30000); // auto-refresh every 30s
  }

  // ===== DOM Ready =====
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMarketplace);
  } else {
    initMarketplace();
  }

  window.openModal = openModal;
  window.closeModal = closeModal;

})();
