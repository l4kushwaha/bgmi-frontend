// ===== marketplace.js (Extended & Refined) =====
(() => {
  const API_URL = window.SERVICES?.market || "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/market";
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
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.background = success ? '#27ae60' : '#c0392b';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ===== Modal Helpers =====
  let modalBg, confirmBtn, cancelBtn;

  function openModal(id) {
    selectedItemId = id;
    if (modalBg) modalBg.classList.add('active');
  }

  function closeModal() {
    selectedItemId = null;
    if (modalBg) modalBg.classList.remove('active');
  }

  // ===== API Request Helper =====
  async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}/${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
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
    card.className = "item-card";
    card.dataset.id = item.id;
    card.dataset.uid = item.uid;

    const isNew = !previousItemUids.has(item.uid);
    if (isNew) {
      const badge = document.createElement("div");
      badge.className = "new-badge";
      badge.innerText = "NEW";
      card.appendChild(badge);
    }
    previousItemUids.add(item.uid);

    const imgUrl = item.images?.[0] || "https://via.placeholder.com/250x150?text=No+Image";
    const isAvailable = item.status?.toLowerCase() === "available";
    const highlightsText = Array.isArray(item.highlights) ? item.highlights.join(", ") : (item.highlights || "");

    card.innerHTML += `
      <img src="${imgUrl}" alt="BGMI ID Image">
      <div class="item-info">
        <strong>UID:</strong> ${item.uid || "N/A"}<br>
        <strong>Rank:</strong> ${item.rank || "N/A"}<br>
        <strong>Price:</strong> ₹${item.price || "N/A"}<br>
        ${highlightsText ? `<div class="highlight">${highlightsText}</div>` : ""}
        <strong>Status:</strong> <span class="item-status">${item.status || "Available"}</span><br>
        <button class="buy-btn" onclick="openModal(${item.id})" ${!isAvailable ? "disabled" : ""}>
          ${isAvailable ? "Buy" : "Sold Out"}
        </button>
      </div>
    `;
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
      const data = await apiRequest('list');
      renderItems(container, data || []);
    } catch (err) {
      container.innerHTML = `<p style="color:red;">⚠️ Failed to load items: ${err.message}</p>`;
      showToast(`⚠️ Failed to load items: ${err.message}`, false);
    }
  }

  // ===== Update Single Item in DOM =====
  function updateItemInDOM(item) {
    const card = document.querySelector(`.item-card[data-id="${item.id}"]`);
    if (!card) return;

    const statusEl = card.querySelector(".item-status");
    const buyBtn = card.querySelector(".buy-btn");

    statusEl.innerText = item.status || "Available";
    if (item.status?.toLowerCase() !== "available") {
      buyBtn.disabled = true;
      buyBtn.innerText = "Sold Out";
    }
  }

  // ===== Admin Section =====
  function renderAdminSection() {
    const adminDiv = document.createElement("div");
    adminDiv.id = "admin-section";
    adminDiv.style = "margin: 20px; padding: 15px; background: #1a1a1a; color:#fff; border-radius: 10px;";

    adminDiv.innerHTML = `
      <h3 style="color:#00ffc6;">Admin Panel</h3>
      <label>JWT Token:</label>
      <input type="text" id="admin-jwt-input" placeholder="Enter admin JWT" style="width:90%;padding:5px;"><br><br>
      <button id="admin-login-btn">Login as Admin</button>
      <hr style="border-color:#333;">
      <h4>Create Listing</h4>
      <input type="text" id="admin-uid" placeholder="UID" style="width:45%;margin-right:5px;">
      <input type="text" id="admin-title" placeholder="Title" style="width:45%;"><br><br>
      <textarea id="admin-desc" placeholder="Description" style="width:90%;height:50px;"></textarea><br><br>
      <input type="number" id="admin-price" placeholder="Price" style="width:30%; margin-right:5px;">
      <input type="text" id="admin-rank" placeholder="Rank" style="width:30%; margin-right:5px;">
      <input type="number" id="admin-level" placeholder="Level" style="width:30%;"><br><br>
      <button id="admin-create-listing-btn">Create Listing</button>
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
        const res = await apiRequest('create', {
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
        const res = await apiRequest(`purchase/${selectedItemId}`, {
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
        document.querySelectorAll(".item-card").forEach(card => {
          const text = card.querySelector(".item-info").innerText.toLowerCase();
          card.style.display = text.includes(query) ? "block" : "none";
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
