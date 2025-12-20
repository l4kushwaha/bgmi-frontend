(() => {
  /* ================= CONFIG ================= */
  const API_URL =
    "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");
  const toastBox = document.getElementById("toast");

  let allItems = [];
  let currentSearch = "";
  let currentFilter = "";

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
    if (!toastBox) return;
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
    if (!bg || !content) return;

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

  window.closeSeller = () => {
    const bg = document.getElementById("seller-modal-bg");
    if (bg) bg.classList.remove("active");
  };

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    const session = getSession();
    const res = await fetch(`${API_URL}/listings`, {
      headers: session
        ? { Authorization: `Bearer ${session.token}` }
        : {}
    });

    const data = await res.json();
    allItems = Array.isArray(data) ? data : [];
    applyFilters();
  }

  /* ================= FILTER + SEARCH ================= */
  function applyFilters() {
    let items = [...allItems];
    const session = getSession();

    if (currentSearch) {
      items = items.filter(i =>
        `${i.uid} ${i.title} ${i.highest_rank}`
          .toLowerCase()
          .includes(currentSearch)
      );
    }

    if (currentFilter === "own" && session) {
      items = items.filter(
        i => String(i.seller_id) === String(session.user.seller_id)
      );
    }

    if (currentFilter === "price_low") {
      items.sort((a, b) => a.price - b.price);
    }

    if (currentFilter === "price_high") {
      items.sort((a, b) => b.price - a.price);
    }

    if (currentFilter === "new") {
      items.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
    }

    renderItems(items);
  }

  /* ================= RENDER ================= */
  function renderItems(items) {
    if (!container) return;
    container.innerHTML = "";
    items.forEach(renderCard);
  }

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
            : `<img src="https://via.placeholder.com/300x200?text=No+Image" class="active">`
        }
      </div>

      <div class="card-content">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>
        Rating: ${stars(item.avg_rating)}<br>
        ${
          item.account_highlights
            ? `<b>Highlights:</b> ${item.account_highlights}<br>`
            : ""
        }
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

    const sellerBtn = card.querySelector(".seller-btn");
    if (sellerBtn)
      sellerBtn.onclick = () =>
        openSellerProfile(item.seller_id);

    const buyBtn = card.querySelector(".buy-btn");
    if (buyBtn)
      buyBtn.onclick = () =>
        toast("Buy feature coming soon");

    if (isOwner) {
      const editBtn = card.querySelector(".edit-btn");
      const delBtn = card.querySelector(".delete-btn");

      if (editBtn) editBtn.onclick = () => openEdit(item);
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

  /* ================= EDIT ================= */
  let editItem = null;

  function openEdit(item) {
    editItem = item;
    const bg = document.getElementById("edit-modal-bg");
    const form = document.getElementById("edit-form");
    if (!bg || !form) return;

    bg.classList.add("active");

    form.innerHTML = `
      <label>Title</label>
      <input id="e-title" value="${item.title}">
      <label>Price</label>
      <input id="e-price" type="number" value="${item.price}">
      <label>Level</label>
      <input id="e-level" value="${item.level}">
      <label>Rank</label>
      <input id="e-rank" value="${item.highest_rank || ""}">
      <label>Highlights</label>
      <textarea id="e-highlights">${item.account_highlights || ""}</textarea>
    `;
  }

  window.closeEdit = () => {
    const bg = document.getElementById("edit-modal-bg");
    if (bg) bg.classList.remove("active");
  };

  const saveBtn = document.getElementById("save-edit");
  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!editItem) return;
      const s = requireLogin();
      if (!s) return;

      await fetch(`${API_URL}/listings/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`
        },
        body: JSON.stringify({
          title: document.getElementById("e-title").value,
          price: +document.getElementById("e-price").value,
          level: +document.getElementById("e-level").value,
          highest_rank: document.getElementById("e-rank").value,
          account_highlights:
            document.getElementById("e-highlights").value
        })
      });

      toast("Listing updated");
      closeEdit();
      loadListings();
    };
  }

  /* ================= EVENTS ================= */
  if (searchInput) {
    searchInput.oninput = e => {
      currentSearch = e.target.value.toLowerCase();
      applyFilters();
    };
  }

  if (filterSelect) {
    filterSelect.onchange = e => {
      currentFilter = e.target.value;
      applyFilters();
    };
  }

  /* ================= INIT ================= */
  loadListings();
})();