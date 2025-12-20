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

  const stars = r =>
    "★".repeat(Math.round(r || 0)) + "☆".repeat(5 - Math.round(r || 0));

  const getUser = () =>
    JSON.parse(localStorage.getItem("user") || "null");

  /* ================= IMAGE COMPRESSION ================= */
  function compressImage(file, maxW = 1280, quality = 0.7) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /* ================= FULLSCREEN VIEWER ================= */
  let fsImgs = [];
  let fsIndex = 0;
  let zoom = 1;

  const viewer = document.getElementById("img-viewer");
  const viewerImg = viewer ? viewer.querySelector("img") : null;

  function openFS(imgs, index) {
    if (!viewer || !viewerImg) return;
    fsImgs = imgs;
    fsIndex = index;
    zoom = 1;
    viewerImg.style.transform = "scale(1)";
    viewerImg.src = imgs[index].src;
    viewer.classList.add("active");
  }

  function fsNav(dir) {
    if (!viewerImg || fsImgs.length < 2) return;
    fsIndex = (fsIndex + dir + fsImgs.length) % fsImgs.length;
    viewerImg.src = fsImgs[fsIndex].src;
  }

  if (viewer) {
    const left = viewer.querySelector(".fs-left");
    const right = viewer.querySelector(".fs-right");
    const closeBtn = viewer.querySelector(".close");

    if (left) left.onclick = () => fsNav(-1);
    if (right) right.onclick = () => fsNav(1);
    if (closeBtn)
      closeBtn.onclick = () => viewer.classList.remove("active");

    viewer.onclick = e => {
      if (e.target === viewer) viewer.classList.remove("active");
    };
  }

  if (viewerImg) {
    viewerImg.addEventListener("wheel", e => {
      e.preventDefault();
      zoom += e.deltaY * -0.001;
      zoom = Math.min(Math.max(1, zoom), 3);
      viewerImg.style.transform = `scale(${zoom})`;
    });
  }

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    const res = await fetch(`${API_URL}/listings`);
    const items = await res.json();
    container.innerHTML = "";
    items.forEach(renderCard);
  }

  /* ================= CARD ================= */
  function renderCard(item) {
    const user = getUser();
    const isOwner =
      user &&
      (String(user.seller_id) === String(item.seller_id) ||
        user.role === "admin");

    const images = safeArray(item.images);

    const card = document.createElement("div");
    card.className = "item-card";

    card.innerHTML = `
      <div class="rating-badge">${stars(item.avg_rating)}</div>

      <div class="images-gallery">
        ${images
          .map(
            (src, i) =>
              `<img src="${src}" class="${i === 0 ? "active" : ""}">`
          )
          .join("")}
        ${
          images.length > 1
            ? `
          <button class="img-arrow left">‹</button>
          <button class="img-arrow right">›</button>
        `
            : ""
        }
      </div>

      <div class="item-info">
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}<br>

        ${safeArray(item.upgraded_guns).length ? `<b>Upgraded:</b> ${safeArray(item.upgraded_guns).join(", ")}<br>` : ""}
        ${safeArray(item.mythic_items).length ? `<b>Mythic:</b> ${safeArray(item.mythic_items).join(", ")}<br>` : ""}
        ${safeArray(item.legendary_items).length ? `<b>Legendary:</b> ${safeArray(item.legendary_items).join(", ")}<br>` : ""}
        ${safeArray(item.gift_items).length ? `<b>Gifts:</b> ${safeArray(item.gift_items).join(", ")}<br>` : ""}
        ${safeArray(item.titles).length ? `<b>Titles:</b> ${safeArray(item.titles).join(", ")}<br>` : ""}
        ${item.account_highlights ? `<b>Highlights:</b> ${item.account_highlights}<br>` : ""}

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

    /* BUTTON EVENTS */
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

    /* ================= SAFE SLIDER ================= */
    const imgs = [...card.querySelectorAll(".images-gallery img")];

    if (imgs.length > 1) {
      let idx = 0;

      function slide(dir) {
        if (!imgs[idx]) return;
        imgs[idx].classList.remove("active");
        idx = (idx + dir + imgs.length) % imgs.length;
        if (!imgs[idx]) return;
        imgs[idx].classList.add("active");
      }

      setInterval(() => slide(1), 3500);

      const left = card.querySelector(".img-arrow.left");
      const right = card.querySelector(".img-arrow.right");

      if (left) left.onclick = () => slide(-1);
      if (right) right.onclick = () => slide(1);

      let startX = 0;
      const gallery = card.querySelector(".images-gallery");

      gallery.addEventListener("touchstart", e => {
        startX = e.touches[0].clientX;
      });

      gallery.addEventListener("touchend", e => {
        const endX = e.changedTouches[0].clientX;
        if (startX - endX > 50) slide(1);
        if (endX - startX > 50) slide(-1);
      });
    }

    imgs.forEach((img, i) => {
      img.onclick = () => openFS(imgs, i);
    });

    container.appendChild(card);
  }

  /* ================= EDIT ================= */
  function openEdit(item) {
    editListing = item;
    editImgs = safeArray(item.images);

    const bg = document.getElementById("edit-modal-bg");
    const form = document.getElementById("edit-form");
    if (!bg || !form) return;

    bg.classList.add("active");

    form.innerHTML = `
      <input id="e-title" value="${item.title}">
      <input id="e-price" type="number" value="${item.price}">
      <textarea id="e-upgraded">${safeArray(item.upgraded_guns).join(",")}</textarea>
      <textarea id="e-mythic">${safeArray(item.mythic_items).join(",")}</textarea>
      <textarea id="e-legendary">${safeArray(item.legendary_items).join(",")}</textarea>
      <textarea id="e-gifts">${safeArray(item.gift_items).join(",")}</textarea>
      <textarea id="e-titles">${safeArray(item.titles).join(",")}</textarea>
      <textarea id="e-highlights">${item.account_highlights || ""}</textarea>

      <div id="edit-images" class="edit-images-row"></div>
      <input type="file" id="add-images" accept="image/*" multiple>
    `;

    document.getElementById("add-images").onchange = async e => {
      for (const file of e.target.files) {
        editImgs.push(await compressImage(file));
      }
      renderEditImages();
    };

    renderEditImages();
  }

  function renderEditImages() {
    const box = document.getElementById("edit-images");
    if (!box) return;

    box.innerHTML = editImgs
      .map(
        (src, i) => `
        <div class="edit-img-wrap" draggable="true" data-i="${i}">
          <img src="${src}">
          <span class="remove-img">×</span>
        </div>
      `
      )
      .join("");

    box.querySelectorAll(".remove-img").forEach((btn, i) => {
      btn.onclick = () => {
        editImgs.splice(i, 1);
        renderEditImages();
      };
    });

    let drag = null;
    box.querySelectorAll(".edit-img-wrap").forEach(el => {
      el.ondragstart = () => (drag = el);
      el.ondragover = e => e.preventDefault();
      el.ondrop = () => {
        const from = drag.dataset.i;
        const to = el.dataset.i;
        editImgs.splice(to, 0, editImgs.splice(from, 1)[0]);
        renderEditImages();
      };
    });
  }

  /* ================= INIT ================= */
  loadListings();
})();