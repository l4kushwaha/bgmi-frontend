(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");
  const toastBox = document.getElementById("toast");

  const API_URL =
    "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  let currentSearch = "";
  let currentFilter = "";
  let editListing = null;

  /* ================= HELPERS ================= */
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
    toastBox.textContent = msg;
    toastBox.style.background = ok ? "#27ae60" : "#c0392b";
    toastBox.classList.add("show");
    setTimeout(() => toastBox.classList.remove("show"), 3000);
  };

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
      location.href = "login.html";
      return null;
    }
    return s;
  };

  const stars = r =>
    "★".repeat(Math.round(r || 0)) +
    "☆".repeat(5 - Math.round(r || 0));

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");
    content.innerHTML = "Loading...";

    try {
      const res = await fetch(`${API_URL}/seller/${sellerId}`);
      const s = await res.json();

      content.innerHTML = `
        <h3>${s.name}</h3>
        <p><b>Status:</b> ${s.seller_verified == 1 ? "Verified" : "Pending"}</p>
        <p><b>Badge:</b> ${s.badge || "None"}</p>
        <p><b>Rating:</b> ${stars(s.avg_rating)}</p>
        <p><b>Total Sales:</b> ${s.total_sales || 0}</p>
        <p><b>Reviews:</b> ${s.review_count || 0}</p>
        <button class="btn outline" onclick="alert('Chat coming soon')">
          Chat with Seller
        </button>
      `;
    } catch {
      content.innerHTML = "Failed to load seller";
    }
  };

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    const session = getSession();
    const res = await fetch(`${API_URL}/listings`, {
      headers: session ? { Authorization: `Bearer ${session.token}` } : {}
    });

    let items = await res.json();
    if (!Array.isArray(items)) items = [];

    if (currentSearch) {
      items = items.filter(i =>
        `${i.uid} ${i.title} ${i.highest_rank || ""}`
          .toLowerCase()
          .includes(currentSearch)
      );
    }

    if (currentFilter === "own" && session) {
      items = items.filter(
        i => String(i.seller_id) === String(session.user.seller_id)
      );
    }

    container.innerHTML = "";
    items.forEach(renderCard);
  }

  /* ================= RENDER CARD ================= */
  function renderCard(item) {
    const session = getSession();
    const isOwner =
      session &&
      (String(session.user.seller_id) === String(item.seller_id) ||
        session.user.role === "admin");

    const images = safeArray(item.images);
    const card = document.createElement("div");
    card.className = "item-card";

    card.innerHTML = `
      <div class="rating-badge">${stars(item.avg_rating)}</div>
      <div class="verified-badge">
        ${item.seller_verified == 1 ? "Verified" : "Pending"}
      </div>
      ${item.badge ? `<div class="badge-badge">${item.badge}</div>` : ""}

      <div class="images-gallery">
        ${images.map(img => `<img src="${img}">`).join("")}
      </div>

      <div class="item-info">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>
        <div class="price">₹${item.price}</div>
      </div>

      <button class="btn buy-btn">Buy</button>
      <button class="btn outline seller-btn">Seller Profile</button>

      ${
        isOwner
          ? `
            <button class="btn edit-btn">Edit</button>
            <button class="btn delete-btn">Delete</button>
          `
          : ""
      }
    `;

    /* EVENTS */
    const sellerBtn = card.querySelector(".seller-btn");
    if (sellerBtn)
      sellerBtn.onclick = () => openSellerProfile(item.seller_id);

    const buyBtn = card.querySelector(".buy-btn");
    if (buyBtn)
      buyBtn.onclick = () =>
        toast("Buy feature under development 🚧", false);

    if (isOwner) {
      const editBtn = card.querySelector(".edit-btn");
      if (editBtn) editBtn.onclick = () => openEdit(item);

      const delBtn = card.querySelector(".delete-btn");
      if (delBtn) delBtn.onclick = () => deleteListing(item.id);
    }

    container.appendChild(card);
  }

  /* ================= DELETE ================= */
  window.deleteListing = async id => {
    const s = requireLogin();
    if (!s || !confirm("Delete this listing?")) return;

    await fetch(`${API_URL}/listings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${s.token}` }
    });

    toast("Listing deleted");
    loadListings();
  };

  /* ================= SEARCH & FILTER ================= */
  searchInput?.addEventListener("input", e => {
    currentSearch = e.target.value.toLowerCase();
    loadListings();
  });

  filterSelect?.addEventListener("change", e => {
    currentFilter = e.target.value;
    loadListings();
  });

  loadListings();
})();