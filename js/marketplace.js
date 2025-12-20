(() => {
  /* ================= BASIC SETUP ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const CHAT_URL = "https://chat.bgmi-gateway.workers.dev";

  let currentSearchQuery = "";
  let currentFilter = "";

  // seller cache (🔥 performance boost)
  const sellerCache = {};

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

  /* ================= FETCH SELLER (SAFE + CACHED) ================= */
  async function fetchSeller(id) {
    const sid = String(id);
    if (sellerCache[sid]) return sellerCache[sid];

    try {
      const res = await fetch(`${API_URL}/seller/${encodeURIComponent(sid)}`);
      if (!res.ok) throw new Error("Seller not found");
      const data = await res.json();
      sellerCache[sid] = data;
      return data;
    } catch {
      // fallback (🔥 never break UI)
      const fallback = {
        user_id: sid,
        name: `Seller ${sid}`,
        avg_rating: 0,
        review_count: 0,
        total_sales: 0,
        seller_verified: false,
        reviews: []
      };
      sellerCache[sid] = fallback;
      return fallback;
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

      // SEARCH
      items = items.filter(i =>
        ((i.title || "") + (i.uid || "") + (i.highest_rank || ""))
          .toLowerCase()
          .includes(currentSearchQuery)
      );

      // FILTERS
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
      if (!items.length) {
        container.innerHTML = `<p style="color:white">No listings found</p>`;
        return;
      }

      for (const item of items) {
        const seller = await fetchSeller(item.seller_id);

        const card = document.createElement("div");
        card.className = "item-card show";

        const arr = v => Array.isArray(v) ? v.join(", ") : "";
        const images = Array.isArray(item.images) ? item.images : [];

        card.innerHTML = `
          <div class="rating-badge">⭐ ${(seller.avg_rating || 0).toFixed(1)}</div>
          ${seller.seller_verified ? `<div class="verified-badge">✔ Verified</div>` : ""}
          <div class="item-info">
            <p><strong>${item.title || "N/A"}</strong></p>
            <p>UID: ${item.uid || "N/A"}</p>
            <p>Level: ${item.level || 0}</p>
            <p>Rank: ${item.highest_rank || "N/A"}</p>
            <p class="price">₹${item.price || 0}</p>
            ${arr(item.mythic_items) ? `<p>Mythic: ${arr(item.mythic_items)}</p>` : ""}
            ${arr(item.legendary_items) ? `<p>Legendary: ${arr(item.legendary_items)}</p>` : ""}
            ${arr(item.gift_items) ? `<p>Gift: ${arr(item.gift_items)}</p>` : ""}
            ${arr(item.upgraded_guns) ? `<p>Guns: ${arr(item.upgraded_guns)}</p>` : ""}
            ${arr(item.titles) ? `<p>Titles: ${arr(item.titles)}</p>` : ""}
          </div>

          ${images.length ? `
            <div class="images-gallery">
              ${images.map(img =>
                `<img src="${img}" class="item-img" onclick="openImageModal('${img}')">`
              ).join("")}
            </div>` : ""}

          <hr>
          <p>Seller: ${seller.name} ${seller.seller_verified ? "✔" : ""}</p>
          <p>Total Sales: ${seller.total_sales} | Reviews: ${seller.review_count}</p>

          <div style="display:flex;gap:6px;margin-top:6px">
            <button class="btn buy-btn"
              ${item.status !== "available" ? "disabled" : ""}
              onclick="buyItem('${item.id}','${item.seller_id}')">
              ${item.status === "available" ? "Buy" : "Sold"}
            </button>
            <button class="btn outline"
              onclick="openSellerProfile('${item.seller_id}')">
              Seller Profile
            </button>

            ${session && (String(session.user.id) === String(item.seller_id) || session.user.role === "admin")
              ? `<button class="btn edit-btn" onclick="editListing('${item.id}')">Edit</button>
                 <button class="btn delete-btn" onclick="deleteListing('${item.id}')">Delete</button>`
              : ""}
          </div>
        `;

        container.appendChild(card);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load listings", false);
      container.innerHTML = `<p style="color:white">Failed to load listings</p>`;
    }
  }

  /* ================= BUY ITEM ================= */
  window.buyItem = async (listingId) => {
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
      if (!res.ok) throw new Error(data.error || "Order failed");

      showToast("Order created, opening chat...");
      window.open(`${CHAT_URL}?order_id=${data.order.id}`, "_blank");
    } catch (e) {
      showToast(e.message, false);
    }
  };

  /* ================= EDIT / DELETE ================= */
  window.editListing = id => alert(`Edit coming soon: ${id}`);

  window.deleteListing = async id => {
    const session = requireLogin();
    if (!session || !confirm("Delete this listing?")) return;

    const res = await fetch(`${API_URL}/listings/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify({ listing_id: id })
    });

    const data = await res.json();
    if (res.ok) {
      showToast("Listing deleted");
      loadListings();
    } else {
      showToast(data.error || "Delete failed", false);
    }
  };

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");
    content.innerHTML = "Loading...";

    const s = await fetchSeller(sellerId);
    content.innerHTML = `
      <h3>${s.name} ${s.seller_verified ? "✔" : ""}</h3>
      <p>⭐ ${(s.avg_rating || 0).toFixed(1)} | Sales: ${s.total_sales} | Reviews: ${s.review_count}</p>
      <h4>Reviews</h4>
      ${(s.reviews || []).map(r => `
        <div class="review">
          <p>⭐ ${r.stars}</p>
          <p>${r.comment || ""}</p>
        </div>`).join("") || "<p>No reviews yet</p>"}
    `;
  };

  /* ================= IMAGE MODAL ================= */
  window.openImageModal = src => {
    const m = document.getElementById("imgModal");
    document.getElementById("imgPreview").src = src;
    m.classList.add("active");
  };

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
