(() => {
  /* ================= BASIC SETUP ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const CHAT_URL = "https://chat.bgmi-gateway.workers.dev";

  let currentSearchQuery = "";
  let currentFilter = "";

  /* ================= SELLER CACHE ================= */
  const sellerCache = {};

  /* ================= NORMALIZE ID ================= */
  function normalizeId(val) {
    if (val === null || val === undefined) return null;
    return String(parseInt(val, 10));
  }

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
    const s = getSession();
    if (!s) {
      alert("Please login first");
      window.location.href = "login.html";
      return null;
    }
    return s;
  }

  /* ================= SAFE ARRAY ================= */
  function safeArray(val) {
    try {
      if (Array.isArray(val)) return val;
      if (typeof val === "string") return JSON.parse(val);
      return [];
    } catch {
      return [];
    }
  }

  /* ================= FETCH SELLER ================= */
  async function fetchSeller(id) {
    const sid = normalizeId(id);
    if (sellerCache[sid]) return sellerCache[sid];

    try {
      const res = await fetch(`${API_URL}/seller/${encodeURIComponent(sid)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      sellerCache[sid] = data;
      return data;
    } catch {
      const fallback = {
        user_id: sid,
        name: `Seller ${sid}`,
        avg_rating: 0,
        review_count: 0,
        total_sales: 0,
        seller_verified: false,
        listings: [],
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
      if (!res.ok) throw new Error("Listings fetch failed");

      let items = await res.json();
      if (!Array.isArray(items)) items = [];

      /* SEARCH */
      items = items.filter(i =>
        ((i.title || "") + (i.uid || "") + (i.highest_rank || ""))
          .toLowerCase()
          .includes(currentSearchQuery)
      );

      /* FILTERS */
      if (currentFilter === "own" && session) {
        items = items.filter(i =>
          normalizeId(i.seller_id) === normalizeId(session.user.seller_id)
        );
      } else if (currentFilter === "price_high") {
        items.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else if (currentFilter === "price_low") {
        items.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (currentFilter === "new") {
        items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      container.innerHTML = "";
      if (!items.length) {
        container.innerHTML = `<p style="color:white">No listings found</p>`;
        return;
      }

      for (const item of items) {
        const seller = await fetchSeller(item.seller_id);

        const isOwnerOrAdmin =
          session &&
          (
            normalizeId(session.user.seller_id) === normalizeId(item.seller_id) ||
            String(session.user.role).toLowerCase() === "admin"
          );

        const mythics = safeArray(item.mythic_items).join(", ");
        const legends = safeArray(item.legendary_items).join(", ");
        const gifts = safeArray(item.gift_items).join(", ");
        const guns = safeArray(item.upgraded_guns).join(", ");
        const titles = safeArray(item.titles).join(", ");
        const images = safeArray(item.images);

        const card = document.createElement("div");
        card.className = "item-card show";
        card.dataset.sellerId = normalizeId(item.seller_id);

        card.innerHTML = `
          <div class="rating-badge">⭐ ${(seller.avg_rating || 0).toFixed(1)}</div>
          ${seller.seller_verified ? `<div class="verified-badge">✔ Verified</div>` : ""}

          <div class="item-info">
            <p><strong>${item.title}</strong></p>
            <p>UID: ${item.uid}</p>
            <p>Level: ${item.level || 0}</p>
            <p>Rank: ${item.highest_rank || "-"}</p>
            <p class="price">₹${item.price}</p>
            ${mythics ? `<p>Mythic: ${mythics}</p>` : ""}
            ${legends ? `<p>Legendary: ${legends}</p>` : ""}
            ${gifts ? `<p>Gifts: ${gifts}</p>` : ""}
            ${guns ? `<p>Guns: ${guns}</p>` : ""}
            ${titles ? `<p>Titles: ${titles}</p>` : ""}
          </div>

          ${images.length ? `
            <div class="images-gallery">
              ${images.map(img => `<img src="${img}" class="item-img" onclick="openImageModal('${img}')">`).join("")}
            </div>` : ""}

          <button class="btn buy-btn"
            ${item.status !== "available" ? "disabled" : ""}
            onclick="buyItem('${item.id}')">
            ${item.status === "available" ? "Buy" : "Sold"}
          </button>

          <button class="btn outline"
            onclick="openSellerProfile('${normalizeId(item.seller_id)}')">
            Seller Profile
          </button>

          ${isOwnerOrAdmin ? `
            <button class="btn edit-btn" onclick="editListing('${item.id}')">Edit</button>
            <button class="btn delete-btn" onclick="deleteListing('${item.id}')">Delete</button>
          ` : ""}
        `;

        container.appendChild(card);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load listings", false);
      container.innerHTML = `<p style="color:white">Failed to load listings</p>`;
    }
  }

  /* ================= BUY ================= */
  window.buyItem = async id => {
    const s = requireLogin();
    if (!s || !confirm("Confirm purchase?")) return;

    try {
      const res = await fetch(`${API_URL}/orders/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`
        },
        body: JSON.stringify({ listing_id: id })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || "Order failed", false);

      showToast("Order created");
      window.open(`${CHAT_URL}?order_id=${data.order.id}`, "_blank");
    } catch {
      showToast("Order failed", false);
    }
  };

  /* ================= EDIT / DELETE ================= */
  window.editListing = async id => {
    const s = requireLogin();
    if (!s) return;
    const title = prompt("Enter new title");
    if (!title) return;

    try {
      const res = await fetch(`${API_URL}/listings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`
        },
        body: JSON.stringify({ title })
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || "Edit failed", false);

      showToast("Listing updated");
      loadListings();
    } catch {
      showToast("Edit failed", false);
    }
  };

  window.deleteListing = async id => {
    const s = requireLogin();
    if (!s || !confirm("Delete listing?")) return;

    try {
      const res = await fetch(`${API_URL}/listings/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${s.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || "Delete failed", false);

      showToast("Listing deleted");
      loadListings();
    } catch {
      showToast("Delete failed", false);
    }
  };

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");
    content.innerHTML = "Loading seller...";

    const s = await fetchSeller(sellerId);

    content.innerHTML = `
      <h3>${s.name} ${s.seller_verified ? "✔" : ""}</h3>
      <p>⭐ ${(s.avg_rating || 0).toFixed(1)} | Sales: ${s.total_sales} | Reviews: ${s.review_count}</p>
      ${s.listings?.length ? `<p>Listings: ${s.listings.map(l => l.title).join(", ")}</p>` : ""}
      ${(s.reviews || []).map(r => `
        <div class="review">
          <p>⭐ ${r.stars}</p>
          <p>${r.comment}</p>
          ${r.reply ? `<p class="reply">Seller: ${r.reply}</p>` : ""}
        </div>`).join("")}
      <button class="btn outline"
        onclick="window.open('${CHAT_URL}?seller=${sellerId}','_blank')">
        Chat with Seller
      </button>
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
