(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

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
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.style.background = ok ? "#27ae60" : "#c0392b";
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
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

  const stars = r => "★".repeat(Math.round(r || 0)) + "☆".repeat(5 - Math.round(r || 0));

  /* ================= SELLER PROFILE (FIXED) ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");
    content.innerHTML = "Loading...";

    try {
      const res = await fetch(`${API_URL}/seller/${sellerId}`);
      const s = await res.json();

      content.innerHTML = `
        <h3>${s.name || "Seller"}</h3>
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
        `${i.uid} ${i.title} ${i.highest_rank}`.toLowerCase().includes(currentSearch)
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

  /* ================= CARD RENDER ================= */
  function renderCard(item) {
    const session = getSession();
    const isOwner =
      session &&
      (String(session.user.seller_id) === String(item.seller_id) ||
        session.user.role === "admin");

    const images = safeArray(item.images);

    const card = document.createElement("div");
    card.className = "item-card show";

    card.innerHTML = `
      <div class="rating-badge">${stars(item.avg_rating)}</div>

      ${item.seller_verified == 1
        ? `<div class="verified-badge">Verified</div>`
        : `<div class="verified-badge" style="background:#f39c12">Pending</div>`}

      ${item.badge ? `<div class="badge-badge">${item.badge}</div>` : ""}

      <div class="images-gallery">
        ${images.map(img => `<img src="${img}" onclick="openImageModal('${img}')">`).join("")}
      </div>

      <div class="item-info">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>

        ${safeArray(item.upgraded_guns).length ? `<b>Upgraded Guns:</b> ${safeArray(item.upgraded_guns).join(", ")}<br>` : ""}
        ${safeArray(item.mythic_items).length ? `<b>Mythic:</b> ${safeArray(item.mythic_items).join(", ")}<br>` : ""}
        ${safeArray(item.legendary_items).length ? `<b>Legendary:</b> ${safeArray(item.legendary_items).join(", ")}<br>` : ""}
        ${safeArray(item.gift_items).length ? `<b>Gifts:</b> ${safeArray(item.gift_items).join(", ")}<br>` : ""}
        ${safeArray(item.titles).length ? `<b>Titles:</b> ${safeArray(item.titles).join(", ")}<br>` : ""}
        ${item.account_highlights ? `<b>Highlights:</b> ${item.account_highlights}` : ""}

        <div class="price">₹${item.price}</div>
      </div>

      <button class="btn buy-btn" ${item.status !== "available" ? "disabled" : ""} onclick="buyItem('${item.id}')">
        ${item.status === "available" ? "Buy Now" : "Sold"}
      </button>

      <button class="btn outline" onclick="openSellerProfile('${item.seller_id}')">
        Seller Profile
      </button>

      ${isOwner ? `
        <button class="btn edit-btn">Edit</button>
        <button class="btn delete-btn">Delete</button>
      ` : ""}
    `;

    if (isOwner) {
      card.querySelector(".edit-btn").onclick = () => openEdit(item);
      card.querySelector(".delete-btn").onclick = () => deleteListing(item.id);
    }

    container.appendChild(card);
  }

  /* ================= EDIT MODAL (RESTORED STYLE) ================= */
  function openEdit(item) {
    editListing = item;
    document.getElementById("edit-modal-bg").classList.add("active");

    const form = document.getElementById("edit-form");
    const arr = v => safeArray(v).join(", ");

    form.innerHTML = `
      <input id="e-title" value="${item.title}" placeholder="Title">
      <input id="e-price" type="number" value="${item.price}">
      <input id="e-level" type="number" value="${item.level}">
      <input id="e-rank" value="${item.highest_rank || ""}">

      <textarea id="e-upgraded" placeholder="Upgraded Guns">${arr(item.upgraded_guns)}</textarea>
      <textarea id="e-mythic" placeholder="Mythic Items">${arr(item.mythic_items)}</textarea>
      <textarea id="e-legendary" placeholder="Legendary Items">${arr(item.legendary_items)}</textarea>
      <textarea id="e-gifts" placeholder="Gift Items">${arr(item.gift_items)}</textarea>
      <textarea id="e-titles" placeholder="Titles">${arr(item.titles)}</textarea>
      <textarea id="e-highlights" placeholder="Highlights">${item.account_highlights || ""}</textarea>
    `;
  }

  window.closeEdit = () => {
    editListing = null;
    document.getElementById("edit-modal-bg").classList.remove("active");
  };

  document.getElementById("save-edit").onclick = async () => {
    if (!editListing) return;
    const s = requireLogin();
    if (!s) return;

    const body = {
      title: e("e-title"),
      price: +e("e-price"),
      level: +e("e-level"),
      highest_rank: e("e-rank"),
      upgraded_guns: e("e-upgraded").split(","),
      mythic_items: e("e-mythic").split(","),
      legendary_items: e("e-legendary").split(","),
      gift_items: e("e-gifts").split(","),
      titles: e("e-titles").split(","),
      account_highlights: e("e-highlights")
    };

    await fetch(`${API_URL}/listings/${editListing.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.token}`
      },
      body: JSON.stringify(body)
    });

    toast("Listing updated");
    closeEdit();
    loadListings();
  };

  const e = id => document.getElementById(id).value;

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

  /* ================= SEARCH ================= */
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