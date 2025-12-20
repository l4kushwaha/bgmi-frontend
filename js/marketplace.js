(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  let currentSearch = "";
  let currentFilter = "";

  /* ================= UTILS ================= */
  const normalizeId = v => v === null || v === undefined ? null : String(parseInt(v, 10));
  const safeArray = v => {
    try {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") return JSON.parse(v);
      return [];
    } catch { return []; }
  };

  const stars = n => {
    const r = Math.round(Number(n) || 0);
    return "★".repeat(r) + "☆".repeat(5 - r);
  };

  const toast = (msg, ok = true) => {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.style.background = ok ? "#27ae60" : "#c0392b";
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  };

  /* ================= SESSION ================= */
  const getSession = () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!token || !user) return null;
      return { token, user };
    } catch { return null; }
  };

  const requireLogin = () => {
    const s = getSession();
    if (!s) {
      alert("Please login first");
      window.location.href = "login.html";
      return null;
    }
    return s;
  };

  /* ================= SELLER CACHE ================= */
  const sellerCache = {};
  async function fetchSeller(id) {
    const sid = normalizeId(id);
    if (sellerCache[sid]) return sellerCache[sid];

    try {
      const r = await fetch(`${API_URL}/seller/${sid}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      sellerCache[sid] = d;
      return d;
    } catch {
      const f = {
        name: `Seller ${sid}`,
        badge: "",
        seller_verified: 0,
        avg_rating: 0,
        review_count: 0,
        total_sales: 0
      };
      sellerCache[sid] = f;
      return f;
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
      if (!res.ok) throw 0;

      let items = await res.json();
      if (!Array.isArray(items)) items = [];

      items = items.filter(i =>
        `${i.title}${i.uid}${i.highest_rank}`.toLowerCase().includes(currentSearch)
      );

      if (currentFilter === "own" && session) {
        items = items.filter(
          i => normalizeId(i.seller_id) === normalizeId(session.user.seller_id)
        );
      }

      container.innerHTML = "";
      if (!items.length) {
        container.innerHTML = `<p style="color:white">No listings found</p>`;
        return;
      }

      for (const item of items) {
        const seller = await fetchSeller(item.seller_id);
        const images = safeArray(item.images);
        const isOwner =
          session &&
          (normalizeId(session.user.seller_id) === normalizeId(item.seller_id) ||
            String(session.user.role).toLowerCase() === "admin");

        const verifiedText = seller.seller_verified ? "Verified" : "Pending";

        const card = document.createElement("div");
        card.className = "item-card show";

        card.innerHTML = `
          <div class="rating-badge">${stars(seller.avg_rating)}</div>
          <div class="verified-badge">${verifiedText}</div>
          ${seller.badge ? `<div class="badge-badge">${seller.badge}</div>` : ""}

          ${images.length ? `
            <div class="images-gallery">
              ${images.map(img => `<img src="${img}" onclick="openImageModal('${img}')">`).join("")}
            </div>` : ""}

          <div class="item-info">
            <p><strong>${item.title}</strong></p>
            <p>UID: ${item.uid}</p>
            <p>Level: ${item.level}</p>
            <p>Rank: ${item.highest_rank || "-"}</p>
            <p class="price">₹${item.price}</p>
          </div>

          <button class="btn buy-btn"
            ${item.status !== "available" ? "disabled" : ""}
            onclick="buyItem('${item.id}')">
            ${item.status === "available" ? "Buy" : "Sold"}
          </button>

          <button class="btn outline"
            onclick="openSellerProfile('${item.seller_id}')">
            Seller Profile
          </button>

          ${isOwner ? `
            <button class="btn edit-btn" onclick="openEditModal('${item.id}')">Edit</button>
            <button class="btn delete-btn" onclick="deleteListing('${item.id}')">Delete</button>
          ` : ""}
        `;
        container.appendChild(card);
      }
    } catch (e) {
      console.error(e);
      toast("Failed to load listings", false);
    }
  }

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");

    const s = await fetchSeller(sellerId);

    content.innerHTML = `
      <h3>${s.name}</h3>
      <p><strong>Status:</strong> ${s.seller_verified ? "Verified" : "Pending"}</p>
      <p><strong>Badge:</strong> ${s.badge || "None"}</p>
      <p><strong>Rating:</strong> ${stars(s.avg_rating)}</p>
      <p><strong>Total Sales:</strong> ${s.total_sales}</p>
      <p><strong>Reviews:</strong> ${s.review_count}</p>

      <button class="btn outline"
        onclick="alert('Chat feature coming soon!')">
        Chat with Seller
      </button>
    `;
  };

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= BUY / DELETE ================= */
  window.buyItem = async id => {
    const s = requireLogin();
    if (!s || !confirm("Confirm purchase?")) return;

    await fetch(`${API_URL}/orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.token}`
      },
      body: JSON.stringify({ listing_id: id })
    });
    toast("Order created");
  };

  window.deleteListing = async id => {
    const s = requireLogin();
    if (!s || !confirm("Delete listing?")) return;

    await fetch(`${API_URL}/listings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${s.token}` }
    });
    toast("Listing deleted");
    loadListings();
  };

  /* ================= SEARCH / FILTER ================= */
  searchInput?.addEventListener("input", e => {
    currentSearch = e.target.value.toLowerCase();
    loadListings();
  });

  filterSelect?.addEventListener("change", e => {
    currentFilter = e.target.value;
    loadListings();
  });

  /* ================= INIT ================= */
  loadListings();
})();