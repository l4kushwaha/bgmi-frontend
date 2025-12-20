(() => {
  /*************** CONFIG ***************/
  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const container = document.getElementById("items-container");
  const toastBox = document.getElementById("toast");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  let currentSearch = "";
  let currentFilter = "";
  let editListing = null;

  /*************** HELPERS ***************/
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
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!token || !user) return null;
      return { token, user };
    } catch {
      return null;
    }
  };

  const isOwner = sellerId => {
    const s = session();
    return s && String(s.user.seller_id) === String(sellerId);
  };

  const stars = r => {
    const n = Math.round(r || 0);
    return "★".repeat(n) + "☆".repeat(5 - n);
  };

  /*************** LOAD LISTINGS ***************/
  async function loadListings() {
    container.innerHTML = ""; // 🔥 prevents duplicate cards

    const res = await fetch(`${API_URL}/listings`);
    let items = await res.json();
    if (!Array.isArray(items)) items = [];

    if (currentSearch) {
      items = items.filter(i =>
        `${i.uid} ${i.title} ${i.highest_rank || ""}`
          .toLowerCase()
          .includes(currentSearch)
      );
    }

    if (currentFilter === "own") {
      const s = session();
      if (s) {
        items = items.filter(
          i => String(i.seller_id) === String(s.user.seller_id)
        );
      }
    }

    items.forEach(renderCard);
  }

  /*************** CARD ***************/
  function renderCard(item) {
    const card = document.createElement("div");
    card.className = "item-card";

    const images = safeArray(item.images);

    card.innerHTML = `
      <div class="images-gallery">
        ${images.map((i, idx) =>
          `<img src="${i}" class="${idx === 0 ? "active" : ""}">`
        ).join("")}
      </div>

      <div class="card-content">
        <div>${stars(item.avg_rating)}</div>
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>
        Upgraded: ${safeArray(item.upgraded_guns).length}<br>
        Mythic: ${safeArray(item.mythic_items).length},
        Legendary: ${safeArray(item.legendary_items).length}<br>
        Gifts: ${safeArray(item.gift_items).length},
        Titles: ${safeArray(item.titles).length}
        <div class="price">₹${item.price}</div>
      </div>

      <div class="card-actions">
        <button class="btn outline seller-btn">Seller Profile</button>

        ${
          isOwner(item.seller_id)
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

    if (isOwner(item.seller_id)) {
      card.querySelector(".edit-btn").onclick = () => openEdit(item);
      card.querySelector(".delete-btn").onclick = () =>
        deleteListing(item.id);
    }

    container.appendChild(card);
  }

  /*************** SELLER PROFILE ***************/
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");
    content.innerHTML = "Loading...";

    const res = await fetch(`${API_URL}/seller/${sellerId}`);
    const s = await res.json();

    content.innerHTML = `
      <h3>${s.name}</h3>
      <p>Status: ${s.seller_verified ? "Verified" : "Pending"}</p>
      <p>Badge: ${s.badge || "-"}</p>
      <p>Rating: ${stars(s.avg_rating)}</p>
      <p>Total Sales: ${s.total_sales || 0}</p>

      <button class="btn outline" onclick="alert('Chat coming soon')">
        💬 Chat with Seller
      </button>
    `;
  };

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /*************** EDIT LISTING ***************/
  function openEdit(item) {
    editListing = item;
    document.getElementById("edit-modal-bg").classList.add("active");

    const form = document.getElementById("edit-form");
    const images = safeArray(item.images);

    form.innerHTML = `
      <label>Title</label>
      <input id="e-title" value="${item.title}">

      <label>Price</label>
      <input id="e-price" value="${item.price}">

      <label>Highlights</label>
      <textarea id="e-highlights">${item.account_highlights || ""}</textarea>

      <label>Images</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap" id="e-images"></div>

      <input type="file" id="imgAdd" multiple>
    `;

    const imgBox = document.getElementById("e-images");

    images.forEach(src => addImg(src));

    document.getElementById("imgAdd").onchange = e => {
      [...e.target.files].forEach(f => {
        const r = new FileReader();
        r.onload = ev => addImg(ev.target.result);
        r.readAsDataURL(f);
      });
    };

    function addImg(src) {
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      wrap.innerHTML = `
        <img src="${src}" style="width:70px;height:70px;border-radius:8px;object-fit:cover">
        <span style="
          position:absolute;top:-6px;right:-6px;
          background:red;color:#fff;
          border-radius:50%;cursor:pointer;
          padding:2px 6px;font-size:12px">×</span>
      `;
      wrap.querySelector("span").onclick = () => wrap.remove();
      imgBox.appendChild(wrap);
    }
  }

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg").classList.remove("active");

  document.getElementById("save-edit").onclick = async () => {
    if (!editListing) return;

    const imgs = [...document.querySelectorAll("#e-images img")].map(i => i.src);

    await fetch(`${API_URL}/listings/${editListing.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session().token}`
      },
      body: JSON.stringify({
        title: e("e-title"),
        price: e("e-price"),
        account_highlights: e("e-highlights"),
        images: imgs
      })
    });

    closeEdit();
    toast("Listing updated");
    loadListings();
  };

  const e = id => document.getElementById(id).value;

  /*************** DELETE ***************/
  async function deleteListing(id) {
    if (!confirm("Delete this listing?")) return;

    await fetch(`${API_URL}/listings/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session().token}` }
    });

    toast("Listing deleted");
    loadListings();
  }

  /*************** SEARCH & FILTER ***************/
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