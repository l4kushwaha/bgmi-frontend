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

  /* ================= IMAGE COMPRESSION ================= */
  async function compressImage(file, quality = 0.7) {
    return new Promise(res => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = e => {
        img.src = e.target.result;
        img.onload = () => {
          const c = document.createElement("canvas");
          const max = 1200;
          let { width, height } = img;
          if (width > max || height > max) {
            if (width > height) {
              height *= max / width;
              width = max;
            } else {
              width *= max / height;
              height = max;
            }
          }
          c.width = width;
          c.height = height;
          c.getContext("2d").drawImage(img, 0, 0, width, height);
          res(c.toDataURL("image/jpeg", quality));
        };
      };
      reader.readAsDataURL(file);
    });
  }

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    container.innerHTML = "";
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

  /* ================= CARD ================= */
  function renderCard(item) {
    const s = session();
    const isOwner =
      s &&
      (String(s.user?.seller_id) === String(item.seller_id) ||
        s.user?.role === "admin");

    const images = safeArray(item.images);
    let index = 0;
    let autoTimer;

    const card = document.createElement("div");
    card.className = "item-card";
    card.dataset.id = item.id;

    card.innerHTML = `
      <div class="images-gallery">
        ${
          images.length
            ? images.map(
                (img, i) =>
                  `<img src="${img}" class="${i === 0 ? "active" : ""}">`
              ).join("")
            : `<img src="https://via.placeholder.com/400x250?text=No+Image" class="active">`
        }
        ${
          images.length > 1
            ? `
          <button class="img-arrow left">‹</button>
          <button class="img-arrow right">›</button>
          <div class="img-dots">
            ${images.map((_, i) => `<span class="${i === 0 ? "active" : ""}"></span>`).join("")}
          </div>`
            : ""
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
            ? `<button class="btn edit-btn">Edit</button>
               <button class="btn delete-btn">Delete</button>`
            : `<button class="btn buy-btn">Buy</button>`
        }
      </div>
    `;

    const imgs = [...card.querySelectorAll(".images-gallery img")];
    const dots = [...card.querySelectorAll(".img-dots span")];

    const show = i => {
      imgs.forEach(im => im.classList.remove("active"));
      dots.forEach(d => d.classList.remove("active"));
      imgs[i].classList.add("active");
      dots[i]?.classList.add("active");
      index = i;
    };

    card.querySelector(".img-arrow.left")?.onclick = e => {
      e.stopPropagation();
      show((index - 1 + imgs.length) % imgs.length);
    };
    card.querySelector(".img-arrow.right")?.onclick = e => {
      e.stopPropagation();
      show((index + 1) % imgs.length);
    };

    if (imgs.length > 1) {
      autoTimer = setInterval(() => show((index + 1) % imgs.length), 3500);
      card.onmouseenter = () => clearInterval(autoTimer);
      card.onmouseleave = () =>
        (autoTimer = setInterval(() => show((index + 1) % imgs.length), 3500));
    }

    imgs.forEach((img, i) => {
      img.onclick = () => openFullscreen(imgs, i);
    });

    container.appendChild(card);
  }

  /* ================= FULLSCREEN VIEWER ================= */
  let fsImgs = [], fsIndex = 0;
  const viewer = document.createElement("div");
  viewer.id = "img-viewer";
  viewer.innerHTML = `
    <span class="close">×</span>
    <div class="fs-arrow left">‹</div>
    <img>
    <div class="fs-arrow right">›</div>
  `;
  document.body.appendChild(viewer);

  function openFullscreen(imgs, i) {
    fsImgs = imgs;
    fsIndex = i;
    viewer.classList.add("active");
    viewer.querySelector("img").src = imgs[i].src;
  }

  function fsShow(i) {
    fsIndex = (i + fsImgs.length) % fsImgs.length;
    viewer.querySelector("img").src = fsImgs[fsIndex].src;
  }

  viewer.querySelector(".left").onclick = () => fsShow(fsIndex - 1);
  viewer.querySelector(".right").onclick = () => fsShow(fsIndex + 1);
  viewer.querySelector(".close").onclick = () =>
    viewer.classList.remove("active");

  /* ================= EVENTS ================= */
  container.onclick = e => {
    const card = e.target.closest(".item-card");
    if (!card) return;
    const item = listings.find(i => String(i.id) === card.dataset.id);

    if (e.target.classList.contains("seller-btn")) openSeller(item.seller_id);
    if (e.target.classList.contains("buy-btn")) toast("Buy coming soon 🚀");
    if (e.target.classList.contains("edit-btn")) openEdit(item);
    if (e.target.classList.contains("delete-btn")) deleteListing(item.id);
  };

  async function openSeller(id) {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");
    content.innerHTML = "Loading...";
    const res = await fetch(`${API_URL}/seller/${id}`);
    const s = await res.json();
    content.innerHTML = `
      <h3>${s.name}</h3>
      <p>Status: ${s.seller_verified ? "Verified" : "Pending"}</p>
      <p>Rating: ${stars(s.avg_rating)}</p>
      <button class="btn outline" onclick="alert('Chat coming soon')">
        💬 Chat with Seller
      </button>
    `;
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
      <input type="file" id="imgAdd" multiple>
      <div id="e-images"></div>
    `;

    const box = document.getElementById("e-images");
    safeArray(item.images).forEach(src => addThumb(src));

    function addThumb(src) {
      const d = document.createElement("div");
      d.draggable = true;
      d.innerHTML = `<img src="${src}"><span>×</span>`;
      d.querySelector("span").onclick = () => d.remove();
      box.appendChild(d);
    }

    document.getElementById("imgAdd").onchange = async e => {
      for (const f of e.target.files) {
        addThumb(await compressImage(f));
      }
    };
  }

  document.getElementById("save-edit").onclick = async () => {
    const imgs = [...document.querySelectorAll("#e-images img")].map(i => i.src);
    await fetch(`${API_URL}/listings/${editItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: e("e-title"),
        price: e("e-price"),
        images: imgs
      })
    });
    toast("Listing updated");
    closeEdit();
    loadListings();
  };

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg").classList.remove("active");

  const e = id => document.getElementById(id).value;

  async function deleteListing(id) {
    if (!confirm("Delete listing?")) return;
    await fetch(`${API_URL}/listings/${id}`, { method: "DELETE" });
    toast("Listing deleted");
    loadListings();
  }

  searchInput?.oninput = e => {
    currentSearch = e.target.value.toLowerCase();
    applyFilters();
  };
  filterSelect?.onchange = e => {
    currentFilter = e.target.value;
    applyFilters();
  };

  loadListings();
})();