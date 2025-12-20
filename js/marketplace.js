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

  function getMySellerId(session) {
    if (!session || !session.user) return null;
    return String(session.user.seller_id || session.user.id);
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
    const sid = String(id);
    if (sellerCache[sid]) return sellerCache[sid];

    try {
      const res = await fetch(`${API_URL}/seller/${sid}`);
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
        reviews: []
      };
      sellerCache[sid] = fallback;
      return fallback;
    }
  }

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    const session = getSession();
    const mySellerId = getMySellerId(session);

    try {
      const res = await fetch(`${API_URL}/listings`, {
        headers: session?.token
          ? { Authorization: `Bearer ${session.token}` }
          : {}
      });

      let items = await res.json();
      if (!Array.isArray(items)) items = [];

      /* SEARCH */
      items = items.filter(i =>
        ((i.title || "") + (i.uid || "") + (i.highest_rank || ""))
          .toLowerCase()
          .includes(currentSearchQuery)
      );

      /* FILTER */
      if (currentFilter === "own" && mySellerId) {
        items = items.filter(i => String(i.seller_id) === mySellerId);
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
            String(item.seller_id) === mySellerId ||
            String(session.user.role).toLowerCase() === "admin"
          );

        const card = document.createElement("div");
        card.className = "item-card show";
        card.dataset.sellerId = item.seller_id;

        card.innerHTML = `
          <div class="rating-badge">⭐ ${(seller.avg_rating || 0).toFixed(1)}</div>
          ${seller.seller_verified ? `<div class="verified-badge">✔ Verified</div>` : ""}

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
    }
  }

  /* ================= BUY ================= */
  window.buyItem = async id => {
    const s = requireLogin();
    if (!s || !confirm("Confirm purchase?")) return;

    const res = await fetch(`${API_URL}/orders/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.token}`
      },
      body: JSON.stringify({ listing_id: id })
    });

    const data = await res.json();
    if (res.ok) {
      showToast("Order created");
      window.open(`${CHAT_URL}?order_id=${data.order.id}`, "_blank");
    } else {
      showToast(data.error || "Order failed", false);
    }
  };

  window.editListing = id => alert(`Edit listing ${id}`);
  window.deleteListing = async id => {
    const s = requireLogin();
    if (!s || !confirm("Delete listing?")) return;

    await fetch(`${API_URL}/listings/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.token}`
      },
      body: JSON.stringify({ listing_id: id })
    });

    showToast("Listing deleted");
    loadListings();
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
})();
