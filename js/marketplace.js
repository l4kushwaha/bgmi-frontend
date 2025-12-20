(() => {
  /******************** CONFIG ********************/
  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");
  const toastBox = document.getElementById("toast");

  let allItems = [];
  let currentSearch = "";
  let currentFilter = "";

  /******************** HELPERS ********************/
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
    setTimeout(() => toastBox.classList.remove("show"), 2500);
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

  const stars = r =>
    "★".repeat(Math.round(r || 0)) +
    "☆".repeat(5 - Math.round(r || 0));

  /******************** LOAD LISTINGS ********************/
  async function loadListings() {
    container.innerHTML = "";
    try {
      const session = getSession();
      const res = await fetch(`${API_URL}/listings`, {
        headers: session
          ? { Authorization: `Bearer ${session.token}` }
          : {}
      });

      const data = await res.json();
      allItems = Array.isArray(data) ? data : [];
      applyFilters();
    } catch {
      toast("Failed to load listings", false);
    }
  }

  /******************** FILTER + SEARCH ********************/
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

    if (currentFilter === "price_low")
      items.sort((a, b) => a.price - b.price);

    if (currentFilter === "price_high")
      items.sort((a, b) => b.price - a.price);

    if (currentFilter === "new")
      items.sort((a, b) => b.id - a.id);

    container.innerHTML = "";
    items.forEach(renderCard);
  }

  /******************** RENDER CARD ********************/
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
            : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#ccc">No Image</div>`
        }
      </div>

      <div class="card-content">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>

        ${
          safeArray(item.upgraded_guns).length
            ? `<b>Upgraded:</b> ${safeArray(item.upgraded_guns).join(", ")}<br>`
            : ""
        }
        ${
          safeArray(item.mythic_items).length
            ? `<b>Mythic:</b> ${safeArray(item.mythic_items).join(", ")}<br>`
            : ""
        }
        ${
          safeArray(item.legendary_items).length
            ? `<b>Legendary:</b> ${safeArray(item.legendary_items).join(", ")}<br>`
            : ""
        }
        ${
          safeArray(item.gift_items).length
            ? `<b>Gifts:</b> ${safeArray(item.gift_items).join(", ")}<br>`
            : ""
        }
        ${
          safeArray(item.titles).length
            ? `<b>Titles:</b> ${safeArray(item.titles).join(", ")}<br>`
            : ""
        }
        ${
          item.account_highlights
            ? `<b>Highlights:</b> ${item.account_highlights}<br>`
            : ""
        }

        <div class="price">₹${item.price}</div>
      </div>

      <div class="card-actions">
        <button class="btn outline seller-btn" data-seller="${item.seller_id}">
          Seller Profile
        </button>

        ${
          isOwner
            ? `
          <button class="btn edit-btn" data-edit="${item.id}">Edit</button>
          <button class="btn delete-btn" data-delete="${item.id}">Delete</button>
        `
            : `<button class="btn buy-btn" data-buy="${item.id}">Buy</button>`
        }
      </div>
    `;

    container.appendChild(card);
  }

  /******************** EVENT DELEGATION ********************/
  container.addEventListener("click", e => {
    const sellerBtn = e.target.closest("[data-seller]");
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");
    const buyBtn = e.target.closest("[data-buy]");

    if (sellerBtn) openSellerProfile(sellerBtn.dataset.seller);
    if (editBtn) openEdit(editBtn.dataset.edit);
    if (deleteBtn) deleteListing(deleteBtn.dataset.delete);
    if (buyBtn) toast("Buy feature coming soon 🚀");
  });

  /******************** SELLER PROFILE ********************/
  async function openSellerProfile(id) {
    const bg = document.getElementById("seller-modal-bg");
    const box = document.getElementById("seller-content");
    bg.classList.add("active");
    box.innerHTML = "Loading...";

    try {
      const res = await fetch(`${API_URL}/seller/${id}`);
      const s = await res.json();

      box.innerHTML = `
        <h3>${s.name}</h3>
        <p>Status: ${s.seller_verified ? "Verified" : "Pending"}</p>
        <p>Badge: ${s.badge || "-"}</p>
        <p>Rating: ${stars(s.avg_rating)}</p>
        <p>Total Sales: ${s.total_sales || 0}</p>
        <button class="btn outline">Chat (Coming Soon)</button>
      `;
    } catch {
      box.innerHTML = "Failed to load seller";
    }
  }

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /******************** EDIT LISTING ********************/
  let editItem = null;

  function openEdit(id) {
    editItem = allItems.find(i => String(i.id) === String(id));
    if (!editItem) return;

    const bg = document.getElementById("edit-modal-bg");
    const form = document.getElementById("edit-form");
    bg.classList.add("active");

    form.innerHTML = `
      <input id="e-title" value="${editItem.title}">
      <input id="e-price" type="number" value="${editItem.price}">
      <textarea id="e-highlights">${editItem.account_highlights || ""}</textarea>
    `;
  }

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg").classList.remove("active");

  document.getElementById("save-edit").onclick = async () => {
    if (!editItem) return;
    const s = getSession();
    if (!s) return toast("Login required", false);

    await fetch(`${API_URL}/listings/${editItem.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.token}`
      },
      body: JSON.stringify({
        title: document.getElementById("e-title").value,
        price: +document.getElementById("e-price").value,
        account_highlights: document.getElementById("e-highlights").value
      })
    });

    toast("Listing updated");
    closeEdit();
    loadListings();
  };

  /******************** DELETE ********************/
  async function deleteListing(id) {
    const s = getSession();
    if (!s) return toast("Login required", false);
    if (!confirm("Delete this listing?")) return;

    await fetch(`${API_URL}/listings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${s.token}` }
    });

    toast("Listing deleted");
    loadListings();
  }

  /******************** SEARCH + FILTER EVENTS ********************/
  searchInput?.addEventListener("input", e => {
    currentSearch = e.target.value.toLowerCase();
    applyFilters();
  });

  filterSelect?.addEventListener("change", e => {
    currentFilter = e.target.value;
    applyFilters();
  });

  loadListings();
})();