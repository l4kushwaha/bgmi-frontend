(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const CHAT_URL = "https://chat.bgmi-gateway.workers.dev";

  let currentSearch = "";
  let currentFilter = "";

  /* ================= UTILS ================= */
  const normalizeId = v =>
    v === null || v === undefined ? null : String(parseInt(v, 10));

  const safeArray = v => {
    try {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") return JSON.parse(v);
      return [];
    } catch {
      return [];
    }
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
    } catch {
      return null;
    }
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
        avg_rating: 0,
        review_count: 0,
        total_sales: 0,
        seller_verified: false,
        listings: [],
        reviews: []
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

      /* SEARCH */
      items = items.filter(i =>
        `${i.title}${i.uid}${i.highest_rank}`
          .toLowerCase()
          .includes(currentSearch)
      );

      /* FILTER */
      if (currentFilter === "own" && session) {
        items = items.filter(
          i =>
            normalizeId(i.seller_id) ===
            normalizeId(session.user.seller_id)
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
          (normalizeId(session.user.seller_id) ===
            normalizeId(item.seller_id) ||
            String(session.user.role).toLowerCase() === "admin");

        const card = document.createElement("div");
        card.className = "item-card show";

        card.innerHTML = `
          <div class="rating-badge">⭐ ${(seller.avg_rating || 0).toFixed(1)}</div>
          ${seller.seller_verified ? `<div class="verified-badge">✔ Verified</div>` : ""}

          ${images.length ? `
            <div class="images-gallery">
              ${images.map(img =>
                `<img src="${img}" class="item-img"
                  onclick="openImageModal('${img}')">`
              ).join("")}
            </div>
          ` : ""}

          <div class="item-info">
            <p><strong>${item.title}</strong></p>
            <p>UID: ${item.uid}</p>
            <p>Level: ${item.level || 0}</p>
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
            <button class="btn edit-btn"
              onclick="editListing('${item.id}')">Edit</button>
            <button class="btn delete-btn"
              onclick="deleteListing('${item.id}')">Delete</button>
          ` : ""}
        `;

        container.appendChild(card);
      }
    } catch (e) {
      console.error(e);
      toast("Failed to load listings", false);
      container.innerHTML = `<p style="color:white">Error loading listings</p>`;
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
      if (!res.ok) return toast(data.error || "Order failed", false);

      toast("Order created");
      window.open(`${CHAT_URL}?order_id=${data.order.id}`, "_blank");
    } catch {
      toast("Order failed", false);
    }
  };

  /* ================= EDIT (NEW TAB) ================= */
  window.editListing = id => {
    const s = requireLogin();
    if (!s) return;

    window.open(`edit-listing.html?id=${id}`, "_blank");
  };

  /* ================= DELETE ================= */
  window.deleteListing = async id => {
    const s = requireLogin();
    if (!s || !confirm("Delete listing?")) return;

    try {
      const res = await fetch(`${API_URL}/listings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${s.token}` }
      });

      const data = await res.json();
      if (!res.ok) return toast(data.error || "Delete failed", false);

      toast("Listing deleted");
      loadListings();
    } catch {
      toast("Delete failed", false);
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
      <p>⭐ ${(s.avg_rating || 0).toFixed(1)}
      | Sales: ${s.total_sales}</p>

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
    currentSearch = e.target.value.toLowerCase();
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