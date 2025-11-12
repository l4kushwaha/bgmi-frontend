// ===== marketplace.js (Clean & Extended Version) =====
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
      toast.classList.add('toast');
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.classList.toggle('toast-success', success);
    toast.classList.toggle('toast-error', !success);
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
  }

  // ===== Modal Helpers =====
  let modalBg, confirmBtn, cancelBtn;

  function openModal(id) {
    selectedItemId = id;
    if (modalBg) modalBg.classList.add('modal-show');
  }

  function closeModal() {
    selectedItemId = null;
    if (modalBg) modalBg.classList.remove('modal-show');
  }

  // ===== API Request Helper =====
  async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}/${endpoint}`;
    const token = localStorage.getItem("jwt_token");
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (ADMIN_JWT) headers["Authorization"] = `Bearer ${ADMIN_JWT}`;
    
    const res = await fetch(url, { ...options, headers });
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
    card.classList.add('card'); // Use CSS from your HTML

    if (!previousItemUids.has(item.uid)) {
      const badge = document.createElement("div");
      badge.innerText = "NEW";
      badge.classList.add('badge-new');
      card.appendChild(badge);
    }
    previousItemUids.add(item.uid);

    const imgUrl = item.images?.[0] || "https://via.placeholder.com/250x150?text=No+Image";
    const isAvailable = item.status?.toLowerCase() === "available";
    const highlightsText = Array.isArray(item.highlights) ? item.highlights.join(", ") : (item.highlights || "");

    const img = document.createElement("img");
    img.src = imgUrl;
    img.classList.add('card-img');
    card.appendChild(img);

    const infoDiv = document.createElement("div");
    infoDiv.classList.add('card-info');
    infoDiv.innerHTML = `
      <strong>UID:</strong> ${item.uid || "N/A"}<br>
      <strong>Rank:</strong> ${item.rank || "N/A"}<br>
      <strong>Price:</strong> ₹${item.price || "N/A"}<br>
      ${highlightsText ? `<div class="highlights">${highlightsText}</div>` : ""}
      <strong>Status:</strong> <span class="item-status">${item.status || "Available"}</span><br>
    `;

    const btn = document.createElement("button");
    btn.innerText = isAvailable ? "Buy" : "Sold Out";
    btn.disabled = !isAvailable;
    btn.classList.add('btn-buy');
    if (!isAvailable) btn.classList.add('btn-disabled');
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
      container.innerHTML = `<p class="error-text">⚠️ Failed to load items: ${err.message}</p>`;
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
      buyBtn.classList.add('btn-disabled');
    }
  }

  // ===== Admin Section =====
  function renderAdminSection() {
    const adminDiv = document.createElement("div");
    adminDiv.id = 'admin-panel';
    adminDiv.innerHTML = document.getElementById('admin-panel-template')?.innerHTML || '';
    document.body.prepend(adminDiv);

    document.getElementById('admin-login-btn')?.addEventListener('click', () => {
      const token = document.getElementById('admin-jwt-input').value.trim();
      if (!token) return showToast("Enter a valid JWT", false);
      ADMIN_JWT = token;
      showToast("✅ Admin logged in");
    });

    document.getElementById('admin-create-listing-btn')?.addEventListener('click', async () => {
      if (!ADMIN_JWT) return showToast("Login first with Admin JWT", false);

      const uid = document.getElementById('admin-uid').value.trim();
      const title = document.getElementById('admin-title').value.trim();
      const description = document.getElementById('admin-desc').value.trim();
      const price = parseInt(document.getElementById('admin-price').value) || 0;
      const rank = document.getElementById('admin-rank').value.trim();
      const level = parseInt(document.getElementById('admin-level').value) || 0;

      if (!uid || !title) return showToast("UID and Title required", false);

      const body = { seller_id:"admin_user", uid, title, description, price, rank, level,
        mythic_count:0, legendary_count:0, xsuit_count:0, gilt_count:0, honor_gilt_set:0,
        upgradable_guns:0, rare_glider:0, vehicle_skin:0, special_titles:0
      };

      try {
        const res = await apiRequest('listings/create', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        showToast("✅ Listing created: " + (res.message || "Success"));
        loadMarketplace();
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

    confirmBtn?.addEventListener('click', async () => {
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

    cancelBtn?.addEventListener('click', closeModal);

    const searchInput = document.getElementById("search");
    searchInput?.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll("div[data-id]").forEach(card => {
        card.style.display = card.innerText.toLowerCase().includes(query) ? "inline-block" : "none";
      });
    });

    renderAdminSection();
    loadMarketplace();
    setInterval(loadMarketplace, 30000); // auto-refresh
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMarketplace);
  } else {
    initMarketplace();
  }

  window.openModal = openModal;
  window.closeModal = closeModal;

})();
