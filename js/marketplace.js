(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const API_URL =
    "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  let editListing = null;
  let editImgs = [];

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

  const toast = msg => {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
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

  const stars = r =>
    "★".repeat(Math.round(r || 0)) + "☆".repeat(5 - Math.round(r || 0));

  /* ================= GLOBAL CLOSE ================= */
  window.closeSeller = () =>
    document.getElementById("seller-modal-bg")?.classList.remove("active");

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg")?.classList.remove("active");

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
        <p>Status: ${s.seller_verified == 1 ? "Verified" : "Pending"}</p>
        <p>Badge: ${s.badge || "-"}</p>
        <p>Rating: ${stars(s.avg_rating)}</p>
        <p>Total Sales: ${s.total_sales || 0}</p>
        <p>Reviews: ${s.review_count || 0}</p>
      `;
    } catch {
      content.innerHTML = "Failed to load seller";
    }
  };

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    const res = await fetch(`${API_URL}/listings`);
    const items = await res.json();
    container.innerHTML = "";
    items.forEach(renderCard);
  }

  /* ================= CARD ================= */
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

      <div class="images-gallery">
        ${images.map(i => `<img src="${i}">`).join("")}
      </div>

      <div class="item-info">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>
        <div class="price">₹${item.price}</div>
      </div>

      <button class="btn outline seller-btn">Seller Profile</button>

      ${
        isOwner
          ? `
            <button class="btn edit-btn">Edit</button>
            <button class="btn delete-btn">Delete</button>
          `
          : `<button class="btn buy-btn">Buy</button>`
      }
    `;

    card.querySelector(".seller-btn").onclick = () =>
      openSellerProfile(item.seller_id);

    if (isOwner) {
      card.querySelector(".edit-btn").onclick = () => openEdit(item);
      card.querySelector(".delete-btn").onclick = () =>
        deleteListing(item.id);
    } else {
      card.querySelector(".buy-btn").onclick = () =>
        toast("Buy feature coming soon");
    }

    container.appendChild(card);
  }

  /* ================= DELETE ================= */
  window.deleteListing = async id => {
    if (!confirm("Delete this listing?")) return;
    await fetch(`${API_URL}/listings/${id}`, { method: "DELETE" });
    toast("Listing deleted");
    loadListings();
  };

  /* ================= EDIT ================= */
  function openEdit(item) {
    editListing = item;
    editImgs = safeArray(item.images);

    const bg = document.getElementById("edit-modal-bg");
    const form = document.getElementById("edit-form");
    if (!bg || !form) return;

    bg.classList.add("active");

    const arr = v => safeArray(v).join(", ");

    form.innerHTML = `
      <input id="e-title" value="${item.title || ""}" placeholder="Title">
      <input id="e-price" type="number" value="${item.price || 0}" placeholder="Price">
      <input id="e-level" type="number" value="${item.level || 0}" placeholder="Level">
      <input id="e-rank" value="${item.highest_rank || ""}" placeholder="Rank">

      <textarea id="e-upgraded" placeholder="Upgraded Guns">${arr(
        item.upgraded_guns
      )}</textarea>
      <textarea id="e-mythic" placeholder="Mythic Items">${arr(
        item.mythic_items
      )}</textarea>
      <textarea id="e-legendary" placeholder="Legendary Items">${arr(
        item.legendary_items
      )}</textarea>
      <textarea id="e-highlights" placeholder="Highlights">${
        item.account_highlights || ""
      }</textarea>

      <label><b>Images</b></label>
      <div id="edit-images" class="edit-images-row"></div>

      <input type="file" id="add-images" accept="image/*" multiple>
    `;

    document.getElementById("add-images").onchange = e => {
      [...e.target.files].forEach(file => {
        const r = new FileReader();
        r.onload = ev => {
          editImgs.push(ev.target.result);
          renderEditImages();
        };
        r.readAsDataURL(file);
      });
    };

    renderEditImages();
  }

  function renderEditImages() {
    const box = document.getElementById("edit-images");
    if (!box) return;

    box.innerHTML = editImgs
      .map(
        (src, i) => `
        <div class="edit-img-wrap">
          <img src="${src}">
          <span class="remove-img" data-i="${i}">×</span>
        </div>
      `
      )
      .join("");

    box.querySelectorAll(".remove-img").forEach(btn => {
      btn.onclick = () => {
        editImgs.splice(btn.dataset.i, 1);
        renderEditImages();
      };
    });
  }

  /* ================= SAVE EDIT ================= */
  document.getElementById("save-edit")?.addEventListener("click", async () => {
    if (!editListing) return;

    await fetch(`${API_URL}/listings/${editListing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: val("e-title"),
        price: +val("e-price"),
        level: +val("e-level"),
        highest_rank: val("e-rank"),
        upgraded_guns: val("e-upgraded").split(","),
        mythic_items: val("e-mythic").split(","),
        legendary_items: val("e-legendary").split(","),
        account_highlights: val("e-highlights"),
        images: editImgs
      })
    });

    toast("Listing updated");
    closeEdit();
    loadListings();
  });

  const val = id => document.getElementById(id)?.value || "";

  loadListings();
})();