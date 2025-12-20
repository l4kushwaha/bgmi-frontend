(() => {
  /* ================= BASIC SETUP ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const CHAT_URL = "https://chat.bgmi-gateway.workers.dev";

  let currentSearchQuery = "";
  let currentFilter = "";

  /* ================= TOAST ================= */
  function showToast(msg, success = true) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = success ? "#27ae60" : "#c0392b";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ================= SESSION ================= */
  function getSession() {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!token || !user) return null;
      return { token, user };
    } catch {
      return null;
    }
  }

  function requireLogin() {
    const session = getSession();
    if (!session) {
      alert("Please login first");
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  /* ================= FETCH SELLER ================= */
  async function fetchSeller(id) {
    try {
      const res = await fetch(`${API_URL}/seller/${id}`);
      if (!res.ok) throw new Error("Seller fetch failed");
      return await res.json();
    } catch {
      return null;
    }
  }

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    const session = getSession();
    const JWT = session?.token;

    try {
      const res = await fetch(`${API_URL}/listings`, {
        headers: JWT ? { Authorization: `Bearer ${JWT}` } : {}
      });

      if (!res.ok) throw new Error("Failed to fetch listings");

      let items = await res.json();
      if (!Array.isArray(items)) items = [];

      // SEARCH FILTER
      items = items.filter(i =>
        ((i.title || "") + (i.uid || "") + (i.highest_rank || ""))
          .toLowerCase()
          .includes(currentSearchQuery)
      );

      // APPLY FILTERS
      if (currentFilter === "own" && session) {
        items = items.filter(i => String(i.seller_id) === String(session.user.id));
      } else if (currentFilter === "price_high") {
        items.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (currentFilter === "price_low") {
        items.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (currentFilter === "new") {
        items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }

      container.innerHTML = "";
      if (items.length === 0) {
        container.innerHTML = `<p style="color:white">No listings found</p>`;
        return;
      }

      for (const item of items) {
        const seller = await fetchSeller(item.seller_id);
        const rating = seller?.avg_rating || 0;
        const verified = seller?.seller_verified || false;
        const totalSells = seller?.total_sales || 0;
        const reviewCount = seller?.review_count || 0;

        const card = document.createElement("div");
        card.className = "item-card";

        // Safe array handling
        const mythics = Array.isArray(item.mythic_items) ? item.mythic_items.join(", ") : "";
        const legendaries = Array.isArray(item.legendary_items) ? item.legendary_items.join(", ") : "";
        const gifts = Array.isArray(item.gift_items) ? item.gift_items.join(", ") : "";
        const guns = Array.isArray(item.upgraded_guns) ? item.upgraded_guns.join(", ") : "";
        const titles = Array.isArray(item.titles) ? item.titles.join(", ") : "";
        const images = Array.isArray(item.images) ? item.images : [];

        let itemDetails = `
          <div class="rating-badge">⭐ ${rating.toFixed(1)}</div>
          ${verified ? `<div class="verified-badge">✔ Verified Seller</div>` : ""}
          <div class="item-info">
            <p><strong>${item.title || "N/A"}</strong></p>
            <p>UID: ${item.uid || "N/A"}</p>
            <p>Level: ${item.level || 0}</p>
            <p>Rank: ${item.highest_rank || "N/A"}</p>
            <p class="price">₹${item.price || 0}</p>
            ${mythics ? `<p>Mythic: ${mythics}</p>` : ""}
            ${legendaries ? `<p>Legendary: ${legendaries}</p>` : ""}
            ${gifts ? `<p>Gift: ${gifts}</p>` : ""}
            ${guns ? `<p>Guns: ${guns}</p>` : ""}
            ${titles ? `<p>Titles: ${titles}</p>` : ""}
          </div>
        `;

        // Images gallery
        if (images.length) {
          itemDetails += `<div class="images-gallery">`;
          for (const img of images) {
            itemDetails += `<img src="${img}" class="item-img" alt="item" onclick="openImageModal('${img}')">`;
          }
          itemDetails += `</div>`;
        }

        // Seller info & buttons
        itemDetails += `
          <hr>
          <p>Seller: ${seller?.name || "N/A"} ${verified ? "✔" : ""}</p>
          <p>Total Sells: ${totalSells} | Reviews: ${reviewCount}</p>
          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn buy-btn"
              ${item.status !== "available" ? "disabled" : ""}
              onclick="buyItem('${item.id}', '${item.seller_id}')">
              ${item.status === "available" ? "Buy" : "Sold"}
            </button>
            <button class="btn outline"
              onclick="openSellerProfile('${item.seller_id}')">
              Seller Profile
            </button>
        `;

        // Owner / Admin buttons
        if (session && (String(session.user.id) === String(item.seller_id) || session.user.role === "admin")) {
          itemDetails += `
            <button class="btn edit-btn" onclick="editListing('${item.id}')">Edit</button>
            <button class="btn delete-btn" onclick="deleteListing('${item.id}')">Delete</button>
          `;
        }
        itemDetails += `</div>`;

        card.innerHTML = itemDetails;
        container.appendChild(card);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load listings", false);
      container.innerHTML = `<p style="color:white">Failed to load listings</p>`;
    }
  }

  /* ================= BUY ITEM ================= */
  window.buyItem = async (listingId, sellerId) => {
    const session = requireLogin();
    if (!session) return;
    if (!confirm("Confirm purchase?")) return;

    try {
      const res = await fetch(`${API_URL}/orders/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ listing_id: listingId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order failed");

      showToast("Order created, opening chat...");
      window.open(`${CHAT_URL}?order_id=${data.order.id}`, "_blank");
    } catch (e) {
      showToast(e.message, false);
    }
  };

  /* ================= EDIT / DELETE ================= */
  window.editListing = (listingId) => alert(`Edit listing coming soon! ID: ${listingId}`);
  window.deleteListing = async (listingId) => {
    const session = requireLogin();
    if (!session) return;
    if (!confirm("Delete this listing?")) return;

    try {
      const res = await fetch(`${API_URL}/listings/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ listing_id: listingId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      showToast("Listing deleted");
      loadListings();
    } catch (e) {
      showToast(e.message, false);
    }
  };

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async (sellerId) => {
    const modal = document.getElementById("seller-modal");
    const content = document.getElementById("seller-content");
    modal.classList.add("active");
    content.innerHTML = "Loading...";

    const seller = await fetchSeller(sellerId);
    if (!seller) {
      content.innerHTML = "<p>Failed to load seller</p>";
      return;
    }

    content.innerHTML = `
      <h3>${seller.name || "Seller"} ${seller.seller_verified ? "✔" : ""}</h3>
      <p>⭐ ${seller.avg_rating?.toFixed(1) || 0} | Total Sells: ${seller.total_sales || 0} | Reviews: ${seller.review_count || 0}</p>
      <h4>Reviews:</h4>
      <div>${(seller.reviews || []).map(r => `
        <div class="review">
          <p>⭐ ${r.stars || 0}</p>
          <p>${r.comment || ""}</p>
          ${r.reply ? `<p class="reply">Seller: ${r.reply}</p>` : ""}
        </div>
      `).join("")}</div>
    `;
  };

  /* ================= IMAGE LIGHTBOX ================= */
  window.openImageModal = (src) => {
    const imgModal = document.getElementById("imgModal");
    const imgPreview = document.getElementById("imgPreview");
    imgPreview.src = src;
    imgModal.classList.add("active");
  };
  document.getElementById("imgModal")?.addEventListener("click", () => {
    document.getElementById("imgModal").classList.remove("active");
  });

  /* ================= SEARCH / FILTER ================= */
  searchInput?.addEventListener("input", e => {
    currentSearchQuery = e.target.value.toLowerCase();
    loadListings();
  });
  filterSelect?.addEventListener("change", e => {
    currentFilter = e.target.value;
    loadListings();
  });

  /* ================= INIT ================= */
  loadListings();
  setInterval(loadListings, 30000);
})();
