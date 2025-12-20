(() => {
  const container = document.getElementById("items-container");
  const API_URL =
    "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  let editListing = null;
  let editImgs = [];
  let editIndex = 0;
  let dragIndex = null;

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

  /* ================= SELLER ================= */
  window.openSellerProfile = async id => {
    const bg = document.getElementById("seller-modal-bg");
    const c = document.getElementById("seller-content");
    bg.classList.add("active");
    c.innerHTML = "Loading...";

    const res = await fetch(`${API_URL}/seller/${id}`);
    const s = await res.json();

    c.innerHTML = `
      <h3>${s.name}</h3>
      <p>Status: ${s.seller_verified ? "Verified" : "Pending"}</p>
      <p>Rating: ${stars(s.avg_rating)}</p>
      <p>Total Sales: ${s.total_sales || 0}</p>
    `;
  };

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= LOAD ================= */
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
      (session.user.seller_id == item.seller_id ||
        session.user.role === "admin");

    const images = safeArray(item.images);

    const card = document.createElement("div");
    card.className = "item-card show";

    card.innerHTML = `
      <div class="images-gallery">
        ${images.map((i, x) =>
          `<img src="${i}" class="${x === 0 ? "active" : ""}">`
        ).join("")}
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
        toast("Buy coming soon");
    }

    container.appendChild(card);
  }

  /* ================= DELETE ================= */
  window.deleteListing = async id => {
    if (!confirm("Delete listing?")) return;
    await fetch(`${API_URL}/listings/${id}`, { method: "DELETE" });
    toast("Deleted");
    loadListings();
  };

  /* ================= EDIT ================= */
  function openEdit(item) {
    editListing = item;
    editImgs = safeArray(item.images);
    editIndex = 0;

    document.getElementById("edit-modal-bg").classList.add("active");
    const form = document.getElementById("edit-form");

    form.innerHTML = `
      <input id="e-title" value="${item.title}">
      <input id="e-price" type="number" value="${item.price}">
      <input id="e-level" type="number" value="${item.level}">
      <input id="e-rank" value="${item.highest_rank || ""}">

      <div id="edit-gallery" class="images-gallery"></div>
    `;

    renderEditGallery();
  }

  function renderEditGallery() {
    const g = document.getElementById("edit-gallery");
    g.innerHTML = `
      ${editImgs.map(
        (src, i) => `
        <div class="edit-img-wrap"
             draggable="true"
             data-i="${i}">
          <img src="${src}" class="${i === editIndex ? "active" : ""}">
          <span class="remove">×</span>
        </div>
      `
      ).join("")}
      <button class="img-arrow left">‹</button>
      <button class="img-arrow right">›</button>
    `;

    const imgs = g.querySelectorAll(".edit-img-wrap");

    imgs.forEach(wrap => {
      const i = +wrap.dataset.i;

      wrap.querySelector(".remove").onclick = () => {
        editImgs.splice(i, 1);
        editIndex = 0;
        renderEditGallery();
      };

      wrap.ondragstart = () => (dragIndex = i);
      wrap.ondragover = e => e.preventDefault();
      wrap.ondrop = () => {
        const temp = editImgs[dragIndex];
        editImgs[dragIndex] = editImgs[i];
        editImgs[i] = temp;
        renderEditGallery();
      };
    });

    g.querySelector(".left").onclick = () =>
      switchEdit(-1, imgs);
    g.querySelector(".right").onclick = () =>
      switchEdit(1, imgs);
  }

  function switchEdit(d, imgs) {
    imgs[editIndex]?.querySelector("img").classList.remove("active");
    editIndex = (editIndex + d + imgs.length) % imgs.length;
    imgs[editIndex]?.querySelector("img").classList.add("active");
  }

  /* ================= SAVE ================= */
  document.getElementById("save-edit")?.addEventListener("click", async () => {
    await fetch(`${API_URL}/listings/${editListing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: val("e-title"),
        price: +val("e-price"),
        level: +val("e-level"),
        highest_rank: val("e-rank"),
        images: editImgs
      })
    });

    toast("Updated");
    document.getElementById("edit-modal-bg").classList.remove("active");
    loadListings();
  });

  const val = id => document.getElementById(id)?.value || "";

  loadListings();
})();