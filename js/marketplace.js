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
  const normalizeId = v => v == null ? null : String(parseInt(v, 10));

  const safeArray = v => {
    try {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") return JSON.parse(v);
      return [];
    } catch { return []; }
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
    } catch { return null; }
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
        items = items.filter(i =>
          normalizeId(i.seller_id) === normalizeId(session.user.seller_id)
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
          ${images.length ? `<div class="images-gallery">
            ${images.map(img => `<img src="${img}" onclick="openImageModal('${img}')">`).join("")}
          </div>` : ""}
          <div class="item-info">
            <p><strong>${item.title || ""}</strong></p>
            <p>UID: ${item.uid || "-"}</p>
            <p>Level: ${item.level || "-"}</p>
            <p>Rank: ${item.highest_rank || "-"}</p>
            <p>Price: ₹${item.price || 0}</p>
            ${safeArray(item.mythic_items).length ? `<p>Mythic: ${safeArray(item.mythic_items).join(", ")}</p>` : ""}
            ${safeArray(item.legendary_items).length ? `<p>Legendary: ${safeArray(item.legendary_items).join(", ")}</p>` : ""}
            ${safeArray(item.gift_items).length ? `<p>Gifts: ${safeArray(item.gift_items).join(", ")}</p>` : ""}
          </div>
          <button class="btn buy-btn" ${item.status!=="available"?"disabled":""} onclick="buyItem('${item.id}')">
            ${item.status==="available"?"Buy":"Sold"}
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

      // Build edit form
      form.innerHTML = `
        <label>Title</label>
        <input id="e-title" value="${item.title || ""}">
        <label>Price</label>
        <input id="e-price" type="number" value="${item.price || ""}">
        <label>Level</label>
        <input id="e-level" type="number" value="${item.level || ""}">
        <label>Rank</label>
        <input id="e-rank" value="${item.highest_rank || ""}">
        <label>Mythic Items (comma separated)</label>
        <textarea id="e-mythic">${safeArray(item.mythic_items).join(", ")}</textarea>
        <label>Legendary Items (comma separated)</label>
        <textarea id="e-legendary">${safeArray(item.legendary_items).join(", ")}</textarea>
        <label>Gift Items (comma separated)</label>
        <textarea id="e-gifts">${safeArray(item.gift_items).join(", ")}</textarea>
        <label>Images (drag & drop or paste URLs, comma separated)</label>
        <textarea id="e-images" placeholder="https://example.com/image1.jpg, ...">${safeArray(item.images).join(", ")}</textarea>
      `;

      // Drag and drop support for images
      const imagesTextarea = document.getElementById("e-images");
      imagesTextarea.addEventListener("dragover", e => e.preventDefault());
      imagesTextarea.addEventListener("drop", e => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        const urls = files.map(f => URL.createObjectURL(f));
        imagesTextarea.value = [...imagesTextarea.value.split(",").map(v=>v.trim()), ...urls].join(", ");
      });

      // Attach save handler
      document.getElementById("save-edit").onclick = () => saveEdit(id);

    } catch {
      toast("Failed to load listing", false);
    }
  };

  window.saveEdit = async id => {
    const s = requireLogin();
    if (!s) return;

    const body = {
      title: document.getElementById("e-title")?.value || "",
      price: Number(document.getElementById("e-price")?.value) || 0,
      level: Number(document.getElementById("e-level")?.value) || 0,
      highest_rank: document.getElementById("e-rank")?.value || "",
      mythic_items: (document.getElementById("e-mythic")?.value || "").split(",").map(v => v.trim()).filter(v=>v),
      legendary_items: (document.getElementById("e-legendary")?.value || "").split(",").map(v => v.trim()).filter(v=>v),
      gift_items: (document.getElementById("e-gifts")?.value || "").split(",").map(v => v.trim()).filter(v=>v),
      images: (document.getElementById("e-images")?.value || "").split(",").map(v => v.trim()).filter(v=>v)
    };

    try {
      const res = await fetch(`${API_URL}/listings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${s.token}`
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw 1;
      toast("Listing updated successfully");
      closeEdit();
      loadListings();
    } catch {
      toast("Edit failed", false);
    }
  };

  window.closeEdit = () => document.getElementById("edit-modal-bg").classList.remove("active");

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async sellerId => {
    const bg = document.getElementById("seller-modal-bg");
    const content = document.getElementById("seller-content");
    bg.classList.add("active");

    const s = await fetchSeller(sellerId);

    content.innerHTML = `
      <h3>${s.name} ${s.seller_verified ? "✔ Verified" : ""}</h3>
      <p>⭐ ${s.avg_rating} | Sales: ${s.total_sales}</p>
      <p>Reviews: ${s.review_count}</p>
      <button class="btn delete-btn" onclick="closeSeller()">Close</button>
    `;
  };

  window.closeSeller = () => document.getElementById("seller-modal-bg").classList.remove("active");

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