(() => {
  const container = document.getElementById("items-container");
  if (!container) return;

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  let selectedListingId = null;
  let selectedAction = null;
  let currentSearchQuery = "";

  // ===== Toast =====
  function showToast(msg, success = true) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = success ? "#27ae60" : "#c0392b";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ===== Session =====
  function getSession() {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) return null;
    return { token, user };
  }

  function requireLogin() {
    const session = getSession();
    if (!session) {
      alert("Please login first!");
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  // ===== Load Listings =====
  async function loadListings() {
    const session = getSession();
    const JWT = session?.token;

    try {
      const res = await fetch(`${API_URL}/listings`, {
        headers: JWT ? { "Authorization": `Bearer ${JWT}` } : {}
      });
      const items = await res.json();
      container.innerHTML = "";

      if (!items || items.length === 0) {
        container.innerHTML = "<p>No items available</p>";
        return;
      }

      const filteredItems = items.filter(item => {
        const text = (item.title + " " + item.uid).toLowerCase();
        return text.includes(currentSearchQuery.toLowerCase());
      });

      if (filteredItems.length === 0) {
        container.innerHTML = "<p>No items found</p>";
        return;
      }

      filteredItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";

        let buttonsHTML = "";
        if (item.status === "available") 
          buttonsHTML += `<button class="buy-btn" onclick="openListingModal(${item.id}, 'purchase')">Buy</button>`;
        else 
          buttonsHTML += `<button class="buy-btn" disabled>Sold Out</button>`;

        if (session && (session.user.role === "admin" || session.user.id === item.seller_id)) {
          buttonsHTML += `<button class="edit-btn" onclick="openListingModal(${item.id}, 'edit')">Edit</button>`;
        }

        // parse JSON arrays safely
        const mythic = item.mythic_items ? JSON.parse(item.mythic_items) : [];
        const legendary = item.legendary_items ? JSON.parse(item.legendary_items) : [];
        const gift = item.gift_items ? JSON.parse(item.gift_items) : [];
        const guns = item.upgraded_guns ? JSON.parse(item.upgraded_guns) : [];
        const titles = item.titles ? JSON.parse(item.titles) : [];
        const images = item.images ? JSON.parse(item.images) : [];

        const imagesHTML = images.length > 0 ? images.map(src => `<img src="${src}" class="listing-img">`).join('') : '';

        card.innerHTML = `
          ${item.status === "available" ? '<div class="new-badge">NEW</div>' : ''}
          <div class="item-info">
            <p><strong>Title:</strong> ${item.title || "N/A"}</p>
            <p><strong>UID:</strong> ${item.uid || "N/A"}</p>
            <p class="highlight"><strong>Price:</strong> ₹${item.price || 0}</p>
            <p><strong>Status:</strong> ${item.status || "Available"}</p>
            <p><strong>Level:</strong> ${item.level || 0}</p>
            <p><strong>Highest Rank:</strong> ${item.highest_rank || "N/A"}</p>
            <p><strong>Mythic Items:</strong> ${mythic.join(', ')}</p>
            <p><strong>Legendary Items:</strong> ${legendary.join(', ')}</p>
            <p><strong>Gift Items:</strong> ${gift.join(', ')}</p>
            <p><strong>Upgraded Guns:</strong> ${guns.join(', ')}</p>
            <p><strong>Titles:</strong> ${titles.join(', ')}</p>
            <div class="images-gallery">${imagesHTML}</div>
            ${buttonsHTML}
          </div>
        `;
        container.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      showToast("Failed to load items", false);
      container.innerHTML = "<p>Failed to load items</p>";
    }
  }

  // ===== Modal =====
  window.openListingModal = (id, action) => {
    const session = requireLogin();
    if (!session) return;

    selectedListingId = id;
    selectedAction = action;

    const modalBg = document.getElementById("modal-bg");
    const modalText = document.getElementById("modal-text");
    modalText.textContent = action === "purchase" ? "Confirm purchase?" : "Edit your listing?";
    modalBg.classList.add("active");

    if (action === "edit") {
      // prompt multiple fields (simple approach)
      const newPrice = prompt("Enter new price (₹):");
      const newLevel = prompt("Enter new level:");
      if (newPrice !== null && newLevel !== null) {
        const payload = {
          listing_id: id,
          price: parseInt(newPrice),
          level: parseInt(newLevel)
        };
        updateListing(payload, session.token);
      }
    }
  };

  document.getElementById("cancel-btn")?.addEventListener("click", () => {
    selectedListingId = null;
    selectedAction = null;
    document.getElementById("modal-bg")?.classList.remove("active");
  });

  document.getElementById("confirm-btn")?.addEventListener("click", async () => {
    const session = requireLogin();
    if (!session) return;
    const JWT = session.token;

    if (!selectedListingId || !selectedAction) return;

    if (selectedAction === "purchase") {
      try {
        const res = await fetch(`${API_URL}/orders/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JWT}` },
          body: JSON.stringify({ listing_id: selectedListingId })
        });
        const data = await res.json();
        showToast(data.message || "Order created & escrow initiated");
        loadListings();
      } catch (err) {
        console.error(err);
        showToast("Purchase failed", false);
      }
    }

    selectedListingId = null;
    selectedAction = null;
    document.getElementById("modal-bg")?.classList.remove("active");
  });

  // ===== Update Listing =====
  async function updateListing(payload, JWT) {
    try {
      const res = await fetch(`${API_URL}/listings/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JWT}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      showToast(data.message || "Listing updated");
      loadListings();
    } catch (err) {
      console.error(err);
      showToast("Failed to update listing", false);
    }
  }

  // ===== Search =====
  const searchInput = document.getElementById("search");
  searchInput?.addEventListener("input", e => {
    currentSearchQuery = e.target.value.toLowerCase();
    loadListings();
  });

  // ===== Initial load & auto-refresh =====
  loadListings();
  setInterval(loadListings, 30000);
})();
