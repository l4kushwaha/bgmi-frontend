(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  let listingsCache = [];
  let currentListing = null;

  /* ================= UTILS ================= */
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

  const stars = r => {
    const full = Math.round(r || 0);
    return "★".repeat(full) + "☆".repeat(5 - full);
  };

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    try {
      const res = await fetch(`${API_URL}/listings`);
      let items = await res.json();
      if (!Array.isArray(items)) items = [];
      listingsCache = items;
      renderListings(items);
    } catch {
      toast("Failed to load listings", false);
    }
  }

  /* ================= RENDER LISTINGS ================= */
  function renderListings(items) {
    const q = searchInput.value.toLowerCase();
    container.innerHTML = "";

    items
      .filter(i =>
        `${i.uid}${i.title}${i.highest_rank}`.toLowerCase().includes(q)
      )
      .forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card show";

        const mythic = safeArray(item.mythic_items);
        const legendary = safeArray(item.legendary_items);
        const gifts = safeArray(item.gift_items);
        const guns = safeArray(item.upgraded_guns);
        const titles = safeArray(item.titles);
        const images = safeArray(item.images);

        card.innerHTML = `
          <div class="rating-badge">${stars(item.avg_rating)}</div>

          <div class="verified-badge">
            ${item.seller_verified == 1 ? "Verified" : "Pending"}
          </div>

          ${item.badge ? `<div class="badge-badge">${item.badge}</div>` : ""}

          <div class="item-info">
            <strong>${item.title}</strong><br>
            BGMI UID: ${item.uid}<br>
            Account Level: ${item.level}<br>
            Highest Rank: ${item.highest_rank || "-"}<br>

            ${guns.length ? `Upgraded Guns: ${guns.join(", ")}<br>` : ""}
            ${mythic.length ? `Mythic Items: ${mythic.join(", ")}<br>` : ""}
            ${legendary.length ? `Legendary Items: ${legendary.join(", ")}<br>` : ""}
            ${gifts.length ? `Gift Items: ${gifts.join(", ")}<br>` : ""}
            ${titles.length ? `Titles: ${titles.join(", ")}<br>` : ""}

            ${item.account_highlights
              ? `<br><em>${item.account_highlights}</em>`
              : ""}
            
            <div class="price">₹${item.price}</div>
          </div>

          ${
            images.length
              ? `<div class="images-gallery">
                  ${images
                    .map(
                      img =>
                        `<img src="${img}" onclick="openImage('${img}')">`
                    )
                    .join("")}
                </div>`
              : ""
          }

          <button class="btn buy-btn" ${
            item.status !== "available" ? "disabled" : ""
          }>
            ${item.status === "available" ? "Buy" : "Sold"}
          </button>

          <button class="btn outline seller-btn">Seller Profile</button>
          <button class="btn edit-btn">Edit</button>
        `;

        card.querySelector(".seller-btn").onclick = () =>
          openSellerProfile(item.seller_id);

        card.querySelector(".edit-btn").onclick = () =>
          openEditModal(item);

        container.appendChild(card);
      });
  }

  /* ================= IMAGE PREVIEW ================= */
  window.openImage = src => {
    const m = document.getElementById("imgModal");
    document.getElementById("imgPreview").src = src;
    m.classList.add("active");
  };

  /* ================= EDIT MODAL ================= */
  function openEditModal(item) {
    requireLogin();
    currentListing = item;
    document.getElementById("edit-modal-bg").classList.add("active");

    const f = document.getElementById("edit-form");
    f.innerHTML = `
      <input id="e-title" value="${item.title}">
      <input id="e-price" type="number" value="${item.price}">
      <input id="e-level" type="number" value="${item.level}">
      <input id="e-rank" value="${item.highest_rank || ""}">
      <textarea id="e-highlights">${item.account_highlights || ""}</textarea>
      <textarea id="e-guns">${safeArray(item.upgraded_guns).join(", ")}</textarea>
      <textarea id="e-mythic">${safeArray(item.mythic_items).join(", ")}</textarea>
      <textarea id="e-legendary">${safeArray(item.legendary_items).join(", ")}</textarea>
      <textarea id="e-gifts">${safeArray(item.gift_items).join(", ")}</textarea>
      <textarea id="e-titles">${safeArray(item.titles).join(", ")}</textarea>
    `;
  }

  document.getElementById("save-edit").onclick = async () => {
    const s = requireLogin();
    if (!currentListing) return;

    const body = {
      title: e("e-title"),
      price: Number(e("e-price")),
      level: Number(e("e-level")),
      highest_rank: e("e-rank"),
      account_highlights: e("e-highlights"),
      upgraded_guns: e("e-guns").split(",").map(v => v.trim()),
      mythic_items: e("e-mythic").split(",").map(v => v.trim()),
      legendary_items: e("e-legendary").split(",").map(v => v.trim()),
      gift_items: e("e-gifts").split(",").map(v => v.trim()),
      titles: e("e-titles").split(",").map(v => v.trim())
    };

    try {
      const res = await fetch(
        `${API_URL}/listings/${currentListing.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${s.token}`
          },
          body: JSON.stringify(body)
        }
      );

      if (!res.ok) throw 0;
      toast("Listing updated");
      closeEdit();
      loadListings();
    } catch {
      toast("Edit failed", false);
    }
  };

  function e(id) {
    return document.getElementById(id).value || "";
  }

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg").classList.remove("active");

  /* ================= SELLER PROFILE (UNCHANGED) ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");

    const r = await fetch(`${API_URL}/seller/${sellerId}`);
    const s = await r.json();

    content.innerHTML = `
      <h3>${s.name}</h3>
      <p>${s.seller_verified ? "Verified" : "Pending"}</p>
      <p>Badge: ${s.badge || "None"}</p>
      <p>Rating: ${stars(s.avg_rating)}</p>
      <p>Total Sales: ${s.total_sales}</p>
      <p>Reviews: ${s.review_count}</p>
    `;
  };

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= SEARCH ================= */
  searchInput.addEventListener("input", () =>
    renderListings(listingsCache)
  );

  /* ================= INIT ================= */
  loadListings();
})();