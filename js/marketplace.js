// ===== marketplace.js (Safe DOM + Retry for #items-container) =====
(() => {
  const API_URL = window.SERVICES?.market || "https://bgmi_marketplace-service.bgmi-gateway.workers.dev/api/market";
  window.MARKET_API = API_URL;

  let previousItemIds = new Set();
  let selectedItemId = null;
  let modalBg, confirmBtn, cancelBtn;

  function showToast(message, success = true) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = message;
    toast.style.background = success ? '#27ae60' : '#c0392b';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function openModal(itemId) {
    selectedItemId = itemId;
    if (modalBg) modalBg.classList.add('active');
  }

  function closeModal() {
    selectedItemId = null;
    if (modalBg) modalBg.classList.remove('active');
  }

  function renderItems(container, items) {
    container.innerHTML = "";
    if (!items.length) { container.innerHTML = "<p>No items available.</p>"; return; }

    const now = new Date().toLocaleTimeString();

    items.forEach(item => {
      const card = document.createElement("div");
      card.className = "item-card";

      const isNew = !previousItemIds.has(item.id);
      if (isNew) {
        const badge = document.createElement("div");
        badge.className = "new-badge";
        badge.innerText = "NEW";
        card.appendChild(badge);
      }
      previousItemIds.add(item.id);

      const imgUrl = item.images?.[0] || "https://via.placeholder.com/250x150?text=No+Image";
      const isAvailable = item.status?.toLowerCase() === "available";

      card.innerHTML += `
        <img src="${imgUrl}" alt="BGMI ID Image" title="Last updated: ${now}">
        <div class="item-info">
          <strong>UID:</strong> ${item.uid || "N/A"}<br>
          <strong>Rank:</strong> ${item.rank || "N/A"}<br>
          <strong>Price:</strong> ₹${item.price || "N/A"}<br>
          ${item.highlights?.length ? `<div class="highlight">${item.highlights.join(", ")}</div>` : ""}
          <strong>Status:</strong> ${item.status || "Available"}<br>
          <button class="buy-btn" onclick="openModal('${item.id}')" ${!isAvailable ? "disabled" : ""}>
            ${isAvailable ? "Buy" : "Sold Out"}
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  async function loadMarketplace() {
    const container = document.getElementById('items-container');
    if (!container) return console.error("#items-container not found");

    container.innerHTML = "<p>Loading items...</p>";
    try {
      const data = await apiRequest('items');
      renderItems(container, data.items || []);
    } catch (err) {
      container.innerHTML = `<p style="color:red;">⚠️ Failed to load items: ${err.message}</p>`;
      showToast(`⚠️ Failed to load items: ${err.message}`, false);
    }
  }

  function initMarketplace() {
    modalBg = document.getElementById('modal-bg');
    confirmBtn = document.getElementById('confirm-btn');
    cancelBtn = document.getElementById('cancel-btn');

    if (confirmBtn) confirmBtn.addEventListener('click', async () => {
      if (!selectedItemId) return;
      try {
        const res = await apiRequest(`buy/${selectedItemId}`, { method: 'POST' });
        showToast(`✅ Purchase successful: ${res.message}`, true);
        loadMarketplace();
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
    setInterval(loadMarketplace, 30000);
  }

  // ===== Wait until #items-container exists =====
  function waitForContainer(retries = 50, interval = 500) {
    const container = document.getElementById('items-container');
    if (container) {
      initMarketplace();
    } else if (retries > 0) {
      console.warn("#items-container not found yet. Retrying in 500ms...");
      setTimeout(() => waitForContainer(retries - 1, interval), interval);
    } else {
      console.error("#items-container not found after multiple retries. Cannot initialize marketplace.");
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    waitForContainer();
  });

  window.openModal = openModal;
})();
