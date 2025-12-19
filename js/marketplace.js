(() => {
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  let selectedListingId = null;
  let selectedAction = null;
  let currentSearchQuery = "";
  let currentFilter = "";

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
      let items = await res.json();

      if (!items || items.length === 0) {
        container.innerHTML = "<p style='color:white'>No items available</p>";
        return;
      }

      // ===== FILTER & SEARCH =====
      items = items.filter(item => {
        const text = (item.title + " " + item.uid + " " + (item.highest_rank || "")).toLowerCase();
        return text.includes(currentSearchQuery.toLowerCase());
      });

      // My Listings Filter
      if (currentFilter === "own" && session) {
        items = items.filter(item => Number(item.seller_id) === Number(session.user.id));
      } else if (currentFilter === "price_high") {
        items.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (currentFilter === "price_low") {
        items.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (currentFilter === "new") {
        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      if (items.length === 0) {
        container.innerHTML = "<p style='color:white'>No items found</p>";
        return;
      }

      container.innerHTML = "";
      items.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";

        const isOwner = session && Number(session.user.id) === Number(item.seller_id);
        const isAdmin = session && session.user.role === "admin";

        let buttonsHTML = "";
        if (item.status === "available") {
          buttonsHTML += `<button class="btn buy-btn" onclick="openListingModal(${item.id}, 'purchase')">Buy</button>`;
        } else {
          buttonsHTML += `<button class="btn buy-btn" disabled>Sold Out</button>`;
        }

        if (isOwner || isAdmin) {
          buttonsHTML += `<button class="btn edit-btn" onclick="openListingModal(${item.id}, 'edit')">Edit</button>`;
          buttonsHTML += `<button class="btn delete-btn" onclick="openListingModal(${item.id}, 'delete')">Delete</button>`;
        }

        const mythic = item.mythic_items ? JSON.parse(item.mythic_items) : [];
        const legendary = item.legendary_items ? JSON.parse(item.legendary_items) : [];
        const gift = item.gift_items ? JSON.parse(item.gift_items) : [];
        const guns = item.upgraded_guns ? JSON.parse(item.upgraded_guns) : [];
        const titles = item.titles ? JSON.parse(item.titles) : [];
        const images = item.images ? JSON.parse(item.images) : [];

        const imagesHTML = images.length > 0 ? images.map(src => `<img src="${src}" onclick="showImageModal('${src}')">`).join('') : '';

        card.innerHTML = `
          ${item.status === "available" ? '<div class="new-badge">NEW</div>' : ''}
          ${(isOwner || isAdmin) ? '<div class="owner-badge">OWNER</div>' : ''}
          <div class="item-info">
            <p><strong>Title:</strong> ${item.title || "N/A"}</p>
            <p><strong>UID:</strong> ${item.uid || "N/A"}</p>
            <p class="price"><strong>Price:</strong> ₹${item.price || 0}</p>
            <p><strong>Status:</strong> ${item.status || "Available"}</p>
            <p><strong>Level:</strong> ${item.level || 0}</p>
            <p><strong>Highest Rank:</strong> ${item.highest_rank || "N/A"}</p>
            <p><strong>Mythic:</strong> ${mythic.join(', ')}</p>
            <p><strong>Legendary:</strong> ${legendary.join(', ')}</p>
            <p><strong>Gift:</strong> ${gift.join(', ')}</p>
            <p><strong>Guns:</strong> ${guns.join(', ')}</p>
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
      container.innerHTML = "<p style='color:white'>Failed to load items</p>";
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

    if (action === "purchase") modalText.textContent = "Confirm purchase?";
    if (action === "edit") modalText.textContent = "Edit your listing";
    if (action === "delete") modalText.textContent = "Are you sure to delete this listing?";

    modalBg.classList.add("active");

    if (action === "edit") {
      fetch(`${API_URL}/listings?q=&limit=1000`, { headers: { "Authorization": `Bearer ${session.token}` } })
        .then(r => r.json())
        .then(listings => {
          const item = listings.find(l => l.id === id);
          if (!item) return showToast("Listing not found", false);

          const newTitle = prompt("Title:", item.title || "");
          const newPrice = prompt("Price (₹):", item.price || 0);
          const newLevel = prompt("Level:", item.level || 0);
          const newRank = prompt("Highest Rank:", item.highest_rank || "");
          const newMythic = prompt("Mythic Items (comma separated):", item.mythic_items ? JSON.parse(item.mythic_items).join(", ") : "");
          const newLegendary = prompt("Legendary Items (comma separated):", item.legendary_items ? JSON.parse(item.legendary_items).join(", ") : "");
          const newGift = prompt("Gift Items (comma separated):", item.gift_items ? JSON.parse(item.gift_items).join(", ") : "");
          const newGuns = prompt("Upgraded Guns (comma separated):", item.upgraded_guns ? JSON.parse(item.upgraded_guns).join(", ") : "");
          const newTitles = prompt("Titles (comma separated):", item.titles ? JSON.parse(item.titles).join(", ") : "");

          if (newTitle !== null && newPrice !== null && newLevel !== null) {
            updateListing({
              listing_id: id,
              title: newTitle,
              price: parseInt(newPrice),
              level: parseInt(newLevel),
              highest_rank: newRank,
              mythic_items: newMythic.split(",").map(s => s.trim()).filter(Boolean),
              legendary_items: newLegendary.split(",").map(s => s.trim()).filter(Boolean),
              gift_items: newGift.split(",").map(s => s.trim()).filter(Boolean),
              upgraded_guns: newGuns.split(",").map(s => s.trim()).filter(Boolean),
              titles: newTitles.split(",").map(s => s.trim()).filter(Boolean)
            }, session.token);
          }
        }).catch(e => showToast("Failed to fetch listing", false));
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
    } else if (selectedAction === "delete") {
      try {
        const res = await fetch(`${API_URL}/listings/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JWT}` },
          body: JSON.stringify({ listing_id: selectedListingId })
        });
        const data = await res.json();
        showToast(data.message || "Listing deleted");
        loadListings();
      } catch (err) {
        console.error(err);
        showToast("Failed to delete", false);
      }
    }

    selectedListingId = null;
    selectedAction = null;
    document.getElementById("modal-bg")?.classList.remove("active");
  });

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

  searchInput?.addEventListener("input", e => {
    currentSearchQuery = e.target.value.toLowerCase();
    loadListings();
  });
  filterSelect?.addEventListener("change", e => {
    currentFilter = e.target.value;
    loadListings();
  });

  window.showImageModal = (src) => {
    const modal = document.getElementById("imgModal");
    const img = document.getElementById("imgPreview");
    img.src = src;
    modal.style.display = "flex";
  };

  loadListings();
  setInterval(loadListings, 30000);
})();
