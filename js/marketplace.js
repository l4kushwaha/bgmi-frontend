(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  let currentSearch = "";
  let currentFilter = "";
  let editListingId = null;

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
    if (!t) return;
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
      window.location.href = "login.html";
      return null;
    }
    return s;
  };

  const renderStars = rating => {
    const r = Math.round(Number(rating || 0));
    return "★".repeat(r) + "☆".repeat(5 - r);
  };

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    try {
      const session = getSession();
      const res = await fetch(`${API_URL}/listings`, {
        headers: session ? { Authorization: `Bearer ${session.token}` } : {}
      });

      if (!res.ok) throw new Error("Failed to load listings");
      let items = await res.json();
      if (!Array.isArray(items)) items = [];

      /* SEARCH */
      if (currentSearch) {
        items = items.filter(i =>
          `${i.uid} ${i.title} ${i.highest_rank}`
            .toLowerCase()
            .includes(currentSearch)
        );
      }

      /* FILTER */
      if (currentFilter === "own" && session) {
        items = items.filter(
          i => String(i.seller_id) === String(session.user.seller_id)
        );
      }

      container.innerHTML = "";

      if (!items.length) {
        container.innerHTML = `<p>No listings found</p>`;
        return;
      }

      items.forEach(item => renderCard(item));
    } catch (e) {
      console.error(e);
      toast("Failed to load listings", false);
    }
  }

  /* ================= RENDER CARD ================= */
  function renderCard(item) {
    const session = getSession();
    const isOwner =
      session &&
      (String(session.user.seller_id) === String(item.seller_id) ||
        session.user.role === "admin");

    const card = document.createElement("div");
    card.className = "item-card show";

    const images = safeArray(item.images);

    card.innerHTML = `
      <div class="rating-badge">${renderStars(item.avg_rating)}</div>

      ${
        item.seller_verified == 1
          ? `<div class="verified-badge">Verified</div>`
          : `<div class="verified-badge" style="background:#f39c12">Pending</div>`
      }

      ${item.badge ? `<div class="badge-badge">${item.badge}</div>` : ""}

      ${
        images.length
          ? `<div class="images-gallery">
              ${images
                .map(
                  img =>
                    `<img src="${img}" onclick="openImageModal('${img}')">`
                )
                .join("")}
            </div>`
          : ""
      }

      <div class="item-info">
        <strong>${item.title}</strong><br>
        <b>BGMI UID:</b> ${item.uid}<br>
        <b>Account Level:</b> ${item.level}<br>
        <b>Highest Rank:</b> ${item.highest_rank || "-"}<br>

        ${
          safeArray(item.upgraded_guns).length
            ? `<b>Upgraded Guns:</b> ${safeArray(
                item.upgraded_guns
              ).join(", ")}<br>`
            : ""
        }

        ${
          safeArray(item.mythic_items).length
            ? `<b>Mythic Items:</b> ${safeArray(
                item.mythic_items
              ).join(", ")}<br>`
            : ""
        }

        ${
          safeArray(item.legendary_items).length
            ? `<b>Legendary Items:</b> ${safeArray(
                item.legendary_items
              ).join(", ")}<br>`
            : ""
        }

        ${
          safeArray(item.gift_items).length
            ? `<b>Gift Items:</b> ${safeArray(item.gift_items).join(", ")}<br>`
            : ""
        }

        ${
          safeArray(item.titles).length
            ? `<b>Titles:</b> ${safeArray(item.titles).join(", ")}<br>`
            : ""
        }

        ${
          item.account_highlights
            ? `<b>Highlights:</b> ${item.account_highlights}`
            : ""
        }

        <div class="price">₹${item.price}</div>
      </div>

      <button class="btn buy-btn" ${
        item.status !== "available" ? "disabled" : ""
      } onclick="buyItem('${item.id}')">
        ${item.status === "available" ? "Buy Now" : "Sold"}
      </button>

      <button class="btn outline" onclick="openSellerProfile('${
        item.seller_id
      }')">
        Seller Profile
      </button>

      ${
        isOwner
          ? `
          <button class="btn edit-btn">Edit</button>
          <button class="btn delete-btn">Delete</button>
        `
          : ""
      }
    `;

    if (isOwner) {
      card.querySelector(".edit-btn").onclick = () => openEdit(item);
      card.querySelector(".delete-btn").onclick = () =>
        deleteListing(item.id);
    }

    container.appendChild(card);
  }

  /* ================= EDIT LISTING ================= */
  function openEdit(item) {
    editListingId = item.id;
    document.getElementById("edit-modal-bg").classList.add("active");

    const form = document.getElementById("edit-form");
    const arr = v => safeArray(v).join(", ");

    form.innerHTML = `
      <input id="e-title" value="${item.title}" placeholder="Title">
      <input id="e-price" type="number" value="${item.price}">
      <input id="e-level" type="number" value="${item.level}">
      <input id="e-rank" value="${item.highest_rank || ""}">
      <textarea id="e-upgraded">${arr(item.upgraded_guns)}</textarea>
      <textarea id="e-mythic">${arr(item.mythic_items)}</textarea>
      <textarea id="e-legendary">${arr(item.legendary_items)}</textarea>
      <textarea id="e-gifts">${arr(item.gift_items)}</textarea>
      <textarea id="e-titles">${arr(item.titles)}</textarea>
      <textarea id="e-highlights">${item.account_highlights || ""}</textarea>
    `;
  }

  window.closeEdit = () => {
    editListingId = null;
    document.getElementById("edit-modal-bg").classList.remove("active");
  };

  document.getElementById("save-edit").onclick = async () => {
    if (!editListingId) return;

    const s = requireLogin();
    if (!s) return;

    const body = {
      title: document.getElementById("e-title").value,
      price: Number(document.getElementById("e-price").value),
      level: Number(document.getElementById("e-level").value),
      highest_rank: document.getElementById("e-rank").value,
      upgraded_guns: document.getElementById("e-upgraded").value.split(","),
      mythic_items: document.getElementById("e-mythic").value.split(","),
      legendary_items: document.getElementById("e-legendary").value.split(","),
      gift_items: document.getElementById("e-gifts").value.split(","),
      titles: document.getElementById("e-titles").value.split(","),
      account_highlights: document.getElementById("e-highlights").value
    };

    try {
      const res = await fetch(`${API_URL}/listings/${editListingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error();
      toast("Listing updated");
      closeEdit();
      loadListings();
    } catch {
      toast("Update failed", false);
    }
  };

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