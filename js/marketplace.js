// ===== marketplace.js (Optimized Version) =====
(() => {
  const API_URL = window.SERVICES?.market || "https://bgmi_marketplace-service.bgmi-gateway.workers.dev/api/market";
  window.MARKET_API = API_URL;

  let previousItemUids = new Set();
  let selectedItemUid = null;

  // ===== Toast Helper =====
  function showToast(message, success = true) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.style.background = success ? '#27ae60' : '#c0392b';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ===== Modal Helpers =====
  let modalBg, confirmBtn, cancelBtn;

  function openModal(uid) {
    selectedItemUid = uid;
    if (modalBg) modalBg.classList.add('active');
  }

  function closeModal() {
    selectedItemUid = null;
    if (modalBg) modalBg.classList.remove('active');
  }

  // ===== API Request Helper =====
  async function apiRequest(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}/${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
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

    const highlightsText = Array.isArray(item.highlights)
      ? item.highlights.join(", ")
      : item.highlights || "";

    card.innerHTML += `
      <img src="${imgUrl}" alt="BGMI ID Image">
      <div class="item-info">
        <strong>UID:</strong> ${item.uid || "N/A"}<br>
        <strong>Rank:</strong> ${item.rank || "N/A"}<br>
        <strong>Price:</strong> ₹${item.price || "N/A"}<br>
        ${highlightsText ? `<div class="highlight">${highlightsText}</div>` : ""}
        <strong>Status:</strong> <span class="item-status">${item.status || "Available"}</span><br>
        <button class="buy-btn" onclick="openModal('${item.uid}')" ${!isAvailable ? "disabled" : ""}>
          ${isAvailable ? "Buy" : "Sold Out"}
        </button>
      </div>
    `;
    return card;
  }

  // ===== Render All Items =====
  function renderItems(container, items) {
    container.innerHTML = "";
    if (!items.length) { container.innerHTML = "<p>No items available.</p>"; return; }
    items.forEach(item => container.appendChild(renderItem(item)));
  }

  // ===== Load Marketplace =====
  async function loadMarketplace() {
    const container = document.getElementById('items-container');
    if (!container) return console.error("#items-container not found");
    container.innerHTML = "<p>Loading items...</p>";
    try {
      const data = await apiRequest('all');
      renderItems(container, data.items || []);
    } catch (err) {
      container.innerHTML = `<p style="color:red;">⚠️ Failed to load items: ${err.message}</p>`;
      showToast(`⚠️ Failed to load items: ${err.message}`, false);
    }
  }

  // ===== Update Single Item in DOM =====
  function updateItemInDOM(item) {
    const card = document.querySelector(`.item-card[data-uid="${item.uid}"]`);
    if (!card) return; // item not found in DOM

    const statusEl = card.querySelector(".item-status");
    const buyBtn = card.querySelector(".buy-btn");

    statusEl.innerText = item.status || "Available";
    if (item.status?.toLowerCase() !== "available") {
      buyBtn.disabled = true;
      buyBtn.innerText = "Sold Out";
    }
  }

  // ===== Initialize =====
  function initMarketplace() {
    modalBg = document.getElementById('modal-bg');
    confirmBtn = document.getElementById('confirm-btn');
    cancelBtn = document.getElementById('cancel-btn');

    if (confirmBtn) confirmBtn.addEventListener('click', async () => {
      if (!selectedItemUid) return;
      try {
        const res = await apiRequest(`market/mark_sold/${selectedItemUid}`, { method: 'PUT' });
        showToast(`✅ Purchase successful: ${res.message}`, true);
        // Instead of reload, update only the purchased item
        updateItemInDOM({ uid: selectedItemUid, status: "Sold Out" });
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

    loadMarketplace();
    setInterval(loadMarketplace, 30000); // optional periodic refresh
  }

  // ===== DOM Ready =====
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMarketplace);
  } else {
    initMarketplace();
  }

  window.openModal = openModal;
})();
