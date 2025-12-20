(() => {
  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const container = document.getElementById("items-container");
  const toastBox = document.getElementById("toast");

  let editListing = null;

  /* ========== HELPERS ========== */
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
    toastBox.textContent = msg;
    toastBox.classList.add("show");
    setTimeout(() => toastBox.classList.remove("show"), 2500);
  };

  const session = () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));
      return token && user ? { token, user } : null;
    } catch {
      return null;
    }
  };

  /* ========== SELLER PROFILE ========== */
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
        <p><b>Status:</b> ${s.seller_verified ? "Verified" : "Pending"}</p>
        <p><b>Badge:</b> ${s.badge || "-"}</p>
        <p><b>Rating:</b> ${s.avg_rating || 0}</p>
        <p><b>Total Sales:</b> ${s.total_sales || 0}</p>
      `;
    } catch {
      content.innerHTML = "Failed to load seller profile";
    }
  };

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /* ========== LOAD LISTINGS ========== */
  async function loadListings() {
    container.innerHTML = "";
    const res = await fetch(`${API_URL}/listings`);
    const items = await res.json();
    items.forEach(renderCard);
  }

  /* ========== RENDER CARD ========== */
  function renderCard(item) {
    const s = session();
    const isOwner =
      s &&
      (String(s.user.seller_id) === String(item.seller_id) ||
        s.user.role === "admin");

    const images = safeArray(item.images);

    const card = document.createElement("div");
    card.className = "item-card";

    card.innerHTML = `
      <div class="images-gallery">
        ${images.map((i, idx) =>
          `<img src="${i}" class="${idx === 0 ? "active" : ""}">`
        ).join("")}
      </div>

      <div class="card-content">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>
        Upgraded: ${safeArray(item.upgraded_guns).length}<br>
        Mythic: ${safeArray(item.mythic_items).length}<br>
        Legendary: ${safeArray(item.legendary_items).length}<br>
        Gifts: ${safeArray(item.gift_items).length}<br>
        Titles: ${safeArray(item.titles).length}
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

    card.querySelector(".seller-btn").onclick =
      () => openSellerProfile(item.seller_id);

    if (isOwner) {
      card.querySelector(".edit-btn").onclick = () => openEdit(item);
      card.querySelector(".delete-btn").onclick = () => deleteListing(item.id);
    }

    container.appendChild(card);
  }

  /* ========== EDIT MODAL ========== */
  function openEdit(item) {
    editListing = item;
    const bg = document.getElementById("edit-modal-bg");
    const form = document.getElementById("edit-form");

    bg.classList.add("active");

    const arr = v => safeArray(v).join(", ");

    form.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label>Title</label>
          <input id="e-title" value="${item.title}">
        </div>
        <div>
          <label>Price</label>
          <input id="e-price" type="number" value="${item.price}">
        </div>
        <div>
          <label>Level</label>
          <input id="e-level" value="${item.level}">
        </div>
        <div>
          <label>Rank</label>
          <input id="e-rank" value="${item.highest_rank || ""}">
        </div>
      </div>

      <label>Upgraded Guns</label>
      <input id="e-upgraded" value="${arr(item.upgraded_guns)}">

      <label>Mythic Items</label>
      <input id="e-mythic" value="${arr(item.mythic_items)}">

      <label>Legendary Items</label>
      <input id="e-legendary" value="${arr(item.legendary_items)}">

      <label>Gifts</label>
      <input id="e-gifts" value="${arr(item.gift_items)}">

      <label>Titles</label>
      <input id="e-titles" value="${arr(item.titles)}">

      <label>Images</label>
      <div id="e-images" style="display:flex;gap:8px;flex-wrap:wrap"></div>
      <button class="btn outline" id="add-img">Add Image</button>
    `;

    const imgBox = document.getElementById("e-images");

    safeArray(item.images).forEach(src => addThumb(src));

    document.getElementById("add-img").onclick = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = ev => addThumb(ev.target.result);
        r.readAsDataURL(f);
      };
      input.click();
    };

    function addThumb(src) {
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.innerHTML = `
        <img src="${src}" style="width:70px;height:70px;object-fit:cover;border-radius:8px">
        <span style="
          position:absolute;
          top:-6px;right:-6px;
          background:red;color:#fff;
          width:18px;height:18px;
          border-radius:50%;
          font-size:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer
        ">✖</span>
      `;
      wrap.querySelector("span").onclick = () => wrap.remove();
      imgBox.appendChild(wrap);
    }
  }

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg").classList.remove("active");

  document.getElementById("save-edit").onclick = async () => {
    if (!editListing) return;
    const s = session();
    if (!s) return;

    const images = [...document.querySelectorAll("#e-images img")].map(
      i => i.src
    );

    await fetch(`${API_URL}/listings/${editListing.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${s.token}`,
      },
      body: JSON.stringify({
        title: e("e-title"),
        price: +e("e-price"),
        level: e("e-level"),
        highest_rank: e("e-rank"),
        upgraded_guns: e("e-upgraded").split(","),
        mythic_items: e("e-mythic").split(","),
        legendary_items: e("e-legendary").split(","),
        gift_items: e("e-gifts").split(","),
        titles: e("e-titles").split(","),
        images,
      }),
    });

    toast("Listing updated");
    closeEdit();
    loadListings();
  };

  const e = id => document.getElementById(id).value;

  window.deleteListing = async id => {
    if (!confirm("Delete listing?")) return;
    const s = session();
    if (!s) return;

    await fetch(`${API_URL}/listings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${s.token}` },
    });

    toast("Listing deleted");
    loadListings();
  };

  loadListings();
})();