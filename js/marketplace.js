// ===== marketplace.js (Fixed + Extended with JWT auto-fetch) =====
(() => {
  const API_URL = window.SERVICES?.market || "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  window.MARKET_API = API_URL;

  let previousItemUids = new Set();
  let selectedItemId = null;
  let ADMIN_JWT = localStorage.getItem("admin_jwt") || null; // auto-fetch admin JWT
  const USER_JWT = localStorage.getItem("jwt_token"); // auto-fetch user JWT

  // ===== Toast Helper =====
  function showToast(message, success = true) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = success ? 'toast-success' : 'toast-error'; // use CSS
      document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.className = success ? 'toast-success show' : 'toast-error show';
    setTimeout(() => toast.classList.remove('show'), 3000);
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
    const token = ADMIN_JWT || USER_JWT || null;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
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
    card.className = "market-card"; // use CSS classes instead of inline styles

    const isNew = !previousItemUids.has(item.uid);
    if (isNew) {
      const badge = document.createElement("div");
      badge.className = "market-badge";
      badge.innerText = "NEW";
      card.appendChild(badge);
    }
    previousItemUids.add(item.uid);

    const imgUrl = item.images?.[0] || "https://via.placeholder.com/250x150?text=No+Image";
    const isAvailable = item.status?.toLowerCase() === "available";
    const highlightsText = Array.isArray(item.highlights) ? item.highlights.join(", ") : (item.highlights || "");

    const img = document.createElement("img");
    img.src = imgUrl;
    img.className = "market-img";
    card.appendChild(img);

    const infoDiv = document.createElement("div");
    infoDiv.className = "market-info";
    infoDiv.innerHTML = `
      <strong>UID:</strong> ${item.uid || "N/A"}<br>
      <strong>Rank:</strong> ${item.rank || "N/A"}<br>
      <strong>Price:</strong> ₹${item.price || "N/A"}<br>
      ${highlightsText ? `<div class="market-highlights">${highlightsText}</div>` : ""}
      <strong>Status:</strong> <span class="item-status">${item.status || "Available"}</span><br>
    `;

    const btn = document.createElement("button");
    btn.innerText = isAvailable ? "Buy" : "Sold Out";
    btn.disabled = !isAvailable;
    btn.className = isAvailable ? "btn-buy" : "btn-sold";
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
      buyBtn.className = "btn-sold";
    }
  }

  // ===== Admin Section =====
  function renderAdminSection() {
    if (!ADMIN_JWT) return; // show only if admin JWT exists
    const adminDiv = document.createElement("div");
    adminDiv.className = "admin-panel";
    adminDiv.innerHTML = `
      <h3>Admin Panel</h3>
      <h4>Create Listing</h4>
      <input type="text" id="admin-uid" placeholder="UID">
      <input type="text" id="admin-title" placeholder="Title"><br><br>
      <textarea id="admin-desc" placeholder="Description"></textarea><br><br>
      <input type="number" id="admin-price" placeholder="Price">
      <input type="text" id="admin-rank" placeholder="Rank">
      <input type="number" id="admin-level" placeholder="Level"><br><br>
      <button id="admin-create-listing-btn">Create Listing</button>
    `;
    document.body.prepend(adminDiv);

    document.getElementById('admin-create-listing-btn').addEventListener('click', async () => {
      const uid = document.getElementById('admin-uid').value.trim();
      const title = document.getElementById('admin-title').value.trim();
      if (!uid || !title) return showToast("UID and Title required", false);
      const body = {
        seller_id: "admin_user", uid, title,
        description: document.getElementById('admin-desc').value.trim(),
        price: parseInt(document.getElementById('admin-price').value) || 0,
        rank: document.getElementById('admin-rank').value.trim(),
        level: parseInt(document.getElementById('admin-level').value) || 0,
        mythic_count:0, legendary_count:0, xsuit_count:0, gilt_count:0, honor_gilt_set:0,
        upgradable_guns:0, rare_glider:0, vehicle_skin:0, special_titles:0
      };
      try {
        const res = await apiRequest('listings/create', { method: 'POST', body: JSON.stringify(body) });
        showToast("✅ Listing created");
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

    if (confirmBtn) confirmBtn.addEventListener('click', async () => {
      if (!selectedItemId) return;
      try {
        const res = await apiRequest(`listings/purchase/${selectedItemId}`, {
          method: 'POST',
          body: JSON.stringify({ payment_method: "wallet" })
        });
        showToast(`✅ Purchase successful`);
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
        document.querySelectorAll(".market-card").forEach(card => {
          card.style.display = card.innerText.toLowerCase().includes(query) ? "inline-block" : "none";
        });
      });
    }

    renderAdminSection();
    loadMarketplace();
    setInterval(loadMarketplace, 30000);
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
