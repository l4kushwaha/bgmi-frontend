(() => {
  /* ================= CONFIG ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const CHAT_URL = "https://chat.bgmi-gateway.workers.dev";

  let currentSearch = "";
  let currentFilter = "";

  /* ================= UTILS ================= */
  const normalizeId = v =>
    v === null || v === undefined ? null : String(parseInt(v, 10));

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
        badge: "",
        verified: false,
        avg_rating: 0,
        review_count: 0,
        total_sales: 0,
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
        `${i.title}${i.uid}${i.highest_rank}`
          .toLowerCase()
          .includes(currentSearch)
      );

      if (currentFilter === "own" && session) {
        items = items.filter(
          i =>
            normalizeId(i.seller_id) ===
            normalizeId(session.user.seller_id)
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
          (normalizeId(session.user.seller_id) ===
            normalizeId(item.seller_id) ||
            String(session.user.role).toLowerCase() === "admin");

        const card = document.createElement("div");
        card.className = "item-card show";

        card.innerHTML = `
          <div class="rating-badge">⭐ ${(seller.avg_rating || 0).toFixed(1)}</div>
          ${seller.verified ? `<div class="verified-badge">✔ Verified</div>` : ""}
          ${seller.badge ? `<div class="seller-badge">${seller.badge}</div>` : ""}

          ${images.length ? `
            <div class="images-gallery">
              ${images.map(img => `
                <img src="${img}" onclick="openImageModal('${img}')">
              `).join("")}
            </div>` : ""}

          <div class="item-info">
            <p><strong>${item.title}</strong></p>
            <p>UID: ${item.uid}</p>
            <p>Level: ${item.level || 0}</p>
            <p>Rank: ${item.highest_rank || "-"}</p>
            <p>Price: ₹${item.price || 0}</p>
            ${safeArray(item.upgraded_guns).length ? `<p>Upgraded Guns: ${safeArray(item.upgraded_guns).join(", ")}</p>` : ""}
            ${safeArray(item.mythic_items).length ? `<p>Mythic: ${safeArray(item.mythic_items).join(", ")}</p>` : ""}
            ${safeArray(item.legendary_items).length ? `<p>Legendary: ${safeArray(item.legendary_items).join(", ")}</p>` : ""}
            ${safeArray(item.gift_items).length ? `<p>Gifts: ${safeArray(item.gift_items).join(", ")}</p>` : ""}
            ${item.account_highlights ? `<p>Highlights: ${item.account_highlights}</p>` : ""}
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
    } catch (e) {
      console.error(e);
      toast("Failed to load listings", false);
    }
  }

  /* ================= EDIT MODAL ================= */
  window.openEditModal = async id => {
    const s = requireLogin();
    if (!s) return;

    const bg = document.getElementById("edit-modal-bg");
    const form = document.getElementById("edit-form");
    bg.classList.add("active");
    form.innerHTML = "Loading...";

    try {
      const res = await fetch(`${API_URL}/listings`);
      const items = await res.json();
      const item = items.find(i => String(i.id) === String(id));
      if (!item) return toast("Listing not found", false);

      form.innerHTML = `
        <label>Title</label>
        <input id="e-title" value="${item.title || ''}">
        <label>Price</label>
        <input id="e-price" type="number" value="${item.price || 0}">
        <label>Level</label>
        <input id="e-level" type="number" value="${item.level || 0}">
        <label>Rank</label>
        <input id="e-rank" value="${item.highest_rank || ''}">
        <label>Upgraded Guns</label>
        <input id="e-guns" value="${safeArray(item.upgraded_guns).join(', ')}">
        <label>Mythic Items</label>
        <input id="e-mythic" value="${safeArray(item.mythic_items).join(', ')}">
        <label>Legendary Items</label>
        <input id="e-legendary" value="${safeArray(item.legendary_items).join(', ')}">
        <label>Gift Items</label>
        <input id="e-gifts" value="${safeArray(item.gift_items).join(', ')}">
        <label>Account Highlights</label>
        <textarea id="e-highlights">${item.account_highlights || ''}</textarea>
        <label>Images (comma separated)</label>
        <div id="image-list" style="display:flex;gap:6px;flex-wrap:wrap;"></div>
        <button class="btn buy-btn" id="add-image-btn">Add Image</button>
      `;

      const imageList = document.getElementById("image-list");
      const addImageBtn = document.getElementById("add-image-btn");

      const renderImages = imgs => {
        imageList.innerHTML = "";
        imgs.forEach((img, idx) => {
          const div = document.createElement("div");
          div.style.position = "relative";
          div.style.display = "inline-block";

          const imgel = document.createElement("img");
          imgel.src = img;
          imgel.style.width = "50px";
          imgel.style.height = "50px";
          imgel.style.objectFit = "cover";
          imgel.style.borderRadius = "6px";
          div.appendChild(imgel);

          const cross = document.createElement("span");
          cross.textContent = "✖";
          cross.style.position = "absolute";
          cross.style.top = "-6px";
          cross.style.right = "-6px";
          cross.style.background = "#c0392b";
          cross.style.borderRadius = "50%";
          cross.style.width = "16px";
          cross.style.height = "16px";
          cross.style.color = "#fff";
          cross.style.fontSize = "12px";
          cross.style.cursor = "pointer";
          cross.style.display = "flex";
          cross.style.alignItems = "center";
          cross.style.justifyContent = "center";
          cross.onclick = () => {
            imgs.splice(idx, 1);
            renderImages(imgs);
          };
          div.appendChild(cross);
          imageList.appendChild(div);
        });
      };

      let currentImages = safeArray(item.images);
      renderImages(currentImages);

      addImageBtn.onclick = () => {
        const url = prompt("Enter Image URL");
        if (!url) return;
        currentImages.push(url);
        renderImages(currentImages);
      };

      document.getElementById("save-edit").onclick = async () => {
        const body = {
          title: document.getElementById("e-title").value,
          price: Number(document.getElementById("e-price").value) || 0,
          level: Number(document.getElementById("e-level").value) || 0,
          highest_rank: document.getElementById("e-rank").value || "",
          upgraded_guns: document.getElementById("e-guns").value.split(",").map(v => v.trim()).filter(v => v),
          mythic_items: document.getElementById("e-mythic").value.split(",").map(v => v.trim()).filter(v => v),
          legendary_items: document.getElementById("e-legendary").value.split(",").map(v => v.trim()).filter(v => v),
          gift_items: document.getElementById("e-gifts").value.split(",").map(v => v.trim()).filter(v => v),
          account_highlights: document.getElementById("e-highlights").value,
          images: currentImages
        };

        const s = requireLogin();
        try {
          const res = await fetch(`${API_URL}/listings/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
            body: JSON.stringify(body)
          });
          if (!res.ok) throw 0;
          toast("Listing updated");
          closeEdit();
          loadListings();
        } catch {
          toast("Edit failed", false);
        }
      };

    } catch (e) {
      console.error(e);
      toast("Failed to load listing for edit", false);
    }
  };

  window.closeEdit = () =>
    document.getElementById("edit-modal-bg").classList.remove("active");

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");

    const s = await fetchSeller(sellerId);
    content.innerHTML = `
      <h3>${s.name}</h3>
      ${s.verified ? `<p>✔ Verified</p>` : ""}
      ${s.badge ? `<p>Badge: ${s.badge}</p>` : ""}
      <p>⭐ ${s.avg_rating.toFixed(1)} | Sales: ${s.total_sales}</p>
      <p>Reviews: ${s.review_count}</p>
      <button class="btn outline" onclick="alert('Chat function coming soon')">Chat with Seller</button>
    `;
  };

  window.closeSeller = () =>
    document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= BUY / DELETE ================= */
  window.buyItem = async id => {
    const s = requireLogin();
    if (!s || !confirm("Confirm purchase?")) return;
    await fetch(`${API_URL}/orders/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
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

  /* ================= SEARCH ================= */
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