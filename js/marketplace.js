(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";

  let currentSearch = "";
  let currentFilter = "";

  /* ================= UTILS ================= */
  const normalizeId = v => (v === null || v === undefined ? null : String(parseInt(v, 10)));

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

  /* ================= SESSION ================= */
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

  /* ================= SELLER CACHE ================= */
  const sellerCache = {};
  async function fetchSeller(id) {
    const sid = normalizeId(id);
    if (sellerCache[sid]) return sellerCache[sid];

    try {
      const r = await fetch(`${API_URL}/seller/${sid}`);
      if (!r.ok) throw 0;
      const d = await r.json();
      sellerCache[sid] = d;
      return d;
    } catch {
      const f = {
        name: `Seller ${sid}`,
        avg_rating: 0,
        review_count: 0,
        total_sales: 0,
        seller_verified: false,
        badge: "",
        listings: [],
        reviews: []
      };
      sellerCache[sid] = f;
      return f;
    }
  }

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    const session = getSession();
    const JWT = session?.token;

    try {
      const res = await fetch(`${API_URL}/listings`, {
        headers: JWT ? { Authorization: `Bearer ${JWT}` } : {}
      });
      if (!res.ok) throw 0;

      let items = await res.json();
      if (!Array.isArray(items)) items = [];

      items = items.filter(i =>
        `${i.title}${i.uid}${i.highest_rank}`.toLowerCase().includes(currentSearch)
      );

      if (currentFilter === "own" && session) {
        items = items.filter(
          i => normalizeId(i.seller_id) === normalizeId(session.user.seller_id)
        );
      }

      container.innerHTML = "";
      if (!items.length) {
        container.innerHTML = `<p style="color:white">No listings found</p>`;
        return;
      }

      for (const item of items) {
        const seller = await fetchSeller(item.seller_id);
        const images = safeArray(item.images);
        const isOwner =
          session &&
          (normalizeId(session.user.seller_id) === normalizeId(item.seller_id) ||
            String(session.user.role).toLowerCase() === "admin");

        const card = document.createElement("div");
        card.className = "item-card show";

        card.innerHTML = `
          <div class="rating-badge">⭐ ${(seller.avg_rating || 0).toFixed(1)}</div>
          ${seller.seller_verified ? `<div class="verified-badge">✔ Verified</div>` : ""}
          ${images.length ? `
            <div class="images-gallery">
              ${images.map(img => `<img src="${img}" onclick="openImageModal('${img}')">`).join("")}
            </div>` : ""}
          <div class="item-info">
            <p><strong>${item.title}</strong></p>
            <p>UID: ${item.uid}</p>
            <p>Level: ${item.level || 0}</p>
            <p>Rank: ${item.highest_rank || "-"}</p>
            <p class="price">₹${item.price}</p>
          </div>
          <button class="btn buy-btn" ${item.status !== "available" ? "disabled" : ""}
            onclick="buyItem('${item.id}')">
            ${item.status === "available" ? "Buy" : "Sold"}
          </button>
          <button class="btn outline" onclick="openSellerProfile('${item.seller_id}')">
            Seller Profile
          </button>
          ${isOwner ? `
            <button class="btn edit-btn" onclick="openEditModal('${item.id}')">Edit</button>
            <button class="btn delete-btn" onclick="deleteListing('${item.id}')">Delete</button>
          ` : ""}
        `;
        container.appendChild(card);
      }
    } catch {
      toast("Failed to load listings", false);
    }
  }

  /* ================= EDIT MODAL ================= */
  const editImages = []; // will contain current images in edit modal
  const newImages = []; // will contain newly added images

  window.openEditModal = async id => {
    const s = requireLogin();
    if (!s) return;

    const bg = document.getElementById("edit-modal-bg");
    const form = document.getElementById("edit-form");
    const imgContainer = document.getElementById("edit-images-container");
    editImages.length = 0; newImages.length = 0;
    bg.classList.add("active");
    form.innerHTML = "Loading...";

    const res = await fetch(`${API_URL}/listings`);
    const items = await res.json();
    const item = items.find(i => String(i.id) === String(id));
    if (!item) return toast("Listing not found", false);

    form.innerHTML = `
      <input id="e-title" placeholder="Title" value="${item.title || ''}">
      <input id="e-price" type="number" placeholder="Price" value="${item.price || ''}">
      <input id="e-level" type="number" placeholder="Level" value="${item.level || 0}">
      <input id="e-rank" placeholder="Rank" value="${item.highest_rank || ''}">
      <textarea id="e-mythic" placeholder="Mythic Items">${safeArray(item.mythic_items).join(", ")}</textarea>
      <textarea id="e-legendary" placeholder="Legendary Items">${safeArray(item.legendary_items).join(", ")}</textarea>
      <textarea id="e-gifts" placeholder="Gift Items">${safeArray(item.gift_items).join(", ")}</textarea>
    `;

    // Load images horizontally with remove button
    imgContainer.innerHTML = "";
    safeArray(item.images).forEach((img, idx) => {
      const div = document.createElement("div");
      div.style.position = "relative";
      div.style.display = "inline-block";
      div.style.marginRight = "6px";
      div.innerHTML = `<img src="${img}" style="width:60px;height:60px;border-radius:8px;cursor:pointer;">
        <span style="position:absolute;top:-6px;right:-6px;background:#c0392b;color:#fff;border-radius:50%;width:18px;height:18px;text-align:center;line-height:18px;cursor:pointer;" onclick="removeEditImage(${idx})">×</span>`;
      imgContainer.appendChild(div);
      editImages.push(img);
    });

    // File input for adding images
    const fileInput = document.getElementById("edit-add-image");
    fileInput.value = "";
    fileInput.onchange = (e) => {
      Array.from(e.target.files).forEach(file => {
        const url = URL.createObjectURL(file);
        newImages.push(file);
        const div = document.createElement("div");
        div.style.position = "relative";
        div.style.display = "inline-block";
        div.style.marginRight = "6px";
        div.innerHTML = `<img src="${url}" style="width:60px;height:60px;border-radius:8px;cursor:pointer;">
          <span style="position:absolute;top:-6px;right:-6px;background:#c0392b;color:#fff;border-radius:50%;width:18px;height:18px;text-align:center;line-height:18px;cursor:pointer;" onclick="removeNewImage(${newImages.length-1}, this)">×</span>`;
        imgContainer.appendChild(div);
      });
    };
  };

  window.removeEditImage = idx => {
    editImages.splice(idx,1);
    document.getElementById("edit-images-container").children[idx].remove();
  };

  window.removeNewImage = (idx, el) => {
    newImages.splice(idx,1);
    el.parentElement.remove();
  };

  window.saveEdit = async id => {
    const s = requireLogin();
    if (!s) return;

    const body = {
      title: document.getElementById("e-title").value || "",
      price: Number(document.getElementById("e-price").value) || 0,
      level: Number(document.getElementById("e-level").value) || 0,
      highest_rank: document.getElementById("e-rank").value || "",
      mythic_items: document.getElementById("e-mythic").value.split(",").map(v=>v.trim()).filter(v=>v),
      legendary_items: document.getElementById("e-legendary").value.split(",").map(v=>v.trim()).filter(v=>v),
      gift_items: document.getElementById("e-gifts").value.split(",").map(v=>v.trim()).filter(v=>v),
      images: [...editImages] // only URLs for now
    };

    // TODO: handle newImages upload if connected to server

    const res = await fetch(`${API_URL}/listings/${id}`, {
      method:"PUT",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${s.token}`
      },
      body:JSON.stringify(body)
    });

    if(!res.ok) return toast("Edit failed", false);
    toast("Listing updated");
    closeEdit();
    loadListings();
  };

  window.closeEdit = () => document.getElementById("edit-modal-bg").classList.remove("active");

  /* ================= SELLER MODAL ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const nameEl = document.getElementById("seller-name");
    const verifiedEl = document.getElementById("seller-verified");
    const ratingEl = document.getElementById("seller-rating");
    const reviewsEl = document.getElementById("seller-reviews");
    const chatBtn = document.getElementById("seller-chat-btn");

    bg.classList.add("active");

    const s = await fetchSeller(sellerId);
    nameEl.textContent = s.name;
    verifiedEl.style.display = s.seller_verified ? "inline-block" : "none";
    ratingEl.textContent = `⭐ ${s.avg_rating} | Sales: ${s.total_sales}`;
    reviewsEl.textContent = `Reviews: ${s.review_count || 0}`;

    chatBtn.onclick = () => { alert("Chat button clicked! Implement later."); }
  };

  window.closeSeller = () => document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= BUY / DELETE ================= */
  window.buyItem = async id => {
    const s = requireLogin();
    if (!s || !confirm("Confirm purchase?")) return;
    await fetch(`${API_URL}/orders/create`, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${s.token}`
      },
      body:JSON.stringify({listing_id:id})
    });
    toast("Order created");
  };

  window.deleteListing = async id => {
    const s = requireLogin();
    if (!s || !confirm("Delete listing?")) return;
    await fetch(`${API_URL}/listings/${id}`,{
      method:"DELETE",
      headers:{Authorization:`Bearer ${s.token}`}
    });
    toast("Listing deleted");
    loadListings();
  };

  /* ================= SEARCH / FILTER ================= */
  searchInput?.addEventListener("input", e=>{
    currentSearch=e.target.value.toLowerCase();
    loadListings();
  });
  filterSelect?.addEventListener("change", e=>{
    currentFilter=e.target.value;
    loadListings();
  });

  loadListings();
})();