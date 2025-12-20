(() => {
  /* ================= CONFIG ================= */
  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const container = document.getElementById("items-container");
  const toastBox = document.getElementById("toast");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  let listings = [];
  let currentSearch = "";
  let currentFilter = "";

  /* ================= HELPERS ================= */
  const session = () => {
    try {
      return JSON.parse(localStorage.getItem("session"));
    } catch {
      return null;
    }
  };

  const toast = (msg, ok = true) => {
    toastBox.textContent = msg;
    toastBox.style.background = ok ? "#27ae60" : "#c0392b";
    toastBox.classList.add("show");
    setTimeout(() => toastBox.classList.remove("show"), 2500);
  };

  const stars = r => {
    const n = Math.round(r || 0);
    return "★".repeat(n) + "☆".repeat(5 - n);
  };

  const safeArray = v => {
    try {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") return JSON.parse(v);
      return [];
    } catch {
      return [];
    }
  };

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    container.innerHTML = ""; // 🔥 prevents duplicate cards

    const res = await fetch(`${API_URL}/listings`);
    listings = await res.json();
    if (!Array.isArray(listings)) listings = [];

    applyFilters();
  }

  function applyFilters() {
    let items = [...listings];

    if (currentSearch) {
      items = items.filter(i =>
        `${i.uid} ${i.title} ${i.highest_rank || ""}`
          .toLowerCase()
          .includes(currentSearch)
      );
    }

    if (currentFilter === "price_low")
      items.sort((a, b) => a.price - b.price);

    if (currentFilter === "price_high")
      items.sort((a, b) => b.price - a.price);

    if (currentFilter === "new")
      items.sort((a, b) => b.id - a.id);

    if (currentFilter === "own") {
      const s = session();
      if (s?.user?.seller_id) {
        items = items.filter(
          i => String(i.seller_id) === String(s.user.seller_id)
        );
      }
    }

    container.innerHTML = "";
    items.forEach(renderCard);
  }

  /* ================= RENDER CARD ================= */
  function renderCard(item) {
    const s = session();
    const isOwner =
      s &&
      (String(s.user?.seller_id) === String(item.seller_id) ||
        s.user?.role === "admin");

    const images = safeArray(item.images);

    const card = document.createElement("div");
    card.className = "item-card";
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="images-gallery">
        ${
          images.length
            ? images
                .map(
                  (img, i) =>
                    `<img src="${img}" class="${
                      i === 0 ? "active" : ""
                    }">`
                )
                .join("")
            : `<img src="https://via.placeholder.com/400x250?text=No+Image" class="active">`
        }
      </div>

      <div class="card-content">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>
        Rating: ${stars(item.avg_rating)}<br>
        <div class="price">₹${item.price}</div>
      </div>

      <div class="card-actions">
        <button class="btn outline seller-btn">Seller Profile</button>

        ${
          isOwner
            ? `
              <button class="btn edit-btn">Edit</button>
              <button class="btn delete-btn">Delete</button>
            `
            : `<button class="btn buy-btn">Buy</button>`
        }
      </div>
    `;

    container.appendChild(card);
  }

  /* ================= EVENT DELEGATION ================= */
  container.addEventListener("click", e => {
    const card = e.target.closest(".item-card");
    if (!card) return;

    const id = card.dataset.id;
    const item = listings.find(i => String(i.id) === id);

    if (e.target.classList.contains("seller-btn")) {
      openSeller(item.seller_id);
    }

    if (e.target.classList.contains("buy-btn")) {
      toast("Buy feature coming soon 🚀");
    }

    if (e.target.classList.contains("edit-btn")) {
      openEdit(item);
    }

    if (e.target.classList.contains("delete-btn")) {
      deleteListing(item.id);
    }
  });

  /* ================= SELLER PROFILE ================= */
  async function openSeller(sellerId) {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");
    content.innerHTML = "Loading...";

    try {
      const res = await fetch(`${API_URL}/seller/${sellerId}`);
      const s = await res.json();

      content.innerHTML = `
        <h3>${s.name}</h3>
        <p>Status: ${s.seller_verified ? "Verified" : "Pending"}</p>
        <p>Badge: ${s.badge || "-"}</p>
        <p>Rating: ${stars(s.avg_rating)}</p>
        <button class="btn outline" onclick="alert('Chat coming soon')">
          💬 Chat with Seller
        </button>
      `;
    } catch {
      content.innerHTML = "Failed to load seller";
    }
  }

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= EDIT ================= */
  let editItem = null;

  function openEdit(item) {
    editItem = item;
    document.getElementById("edit-modal-bg").classList.add("active");

    document.getElementById("edit-form").innerHTML = `
      <input id="e-title" value="${item.title}">
      <input id="e-price" value="${item.price}">
      <textarea id="e-highlights">${
        item.account_highlights || ""
      }</textarea>
    `;
  }

  document.getElementById("save-edit").onclick = async () => {
    if (!editItem) return;

    await fetch(`${API_URL}/listings/${editItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: e("e-title"),
        price: e("e-price"),
        account_highlights: e("e-highlights")
      })
    });

    toast("Listing updated");
    closeEdit();
    loadListings();
  };

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg").classList.remove("active");

  const e = id => document.getElementById(id).value;

  /* ================= DELETE ================= */
  async function deleteListing(id) {
    if (!confirm("Delete this listing?")) return;
    await fetch(`${API_URL}/listings/${id}`, { method: "DELETE" });
    toast("Listing deleted");
    loadListings();
  }

  /* ================= SEARCH & FILTER ================= */
  searchInput?.addEventListener("input", e => {
    currentSearch = e.target.value.toLowerCase();
    applyFilters();
  });

  filterSelect?.addEventListener("change", e => {
    currentFilter = e.target.value;
    applyFilters();
  });

  /* ================= INIT ================= */
  loadListings();
})();