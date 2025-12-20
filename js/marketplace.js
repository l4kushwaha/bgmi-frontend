(() => {
  /* ================= BASIC SETUP ================= */
  const container = document.getElementById("items-container");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const CHAT_URL = "https://chat.bgmi-gateway.workers.dev";

  let currentSearchQuery = "";
  let currentFilter = "";

  /* ================= TOAST ================= */
  function showToast(msg, success = true) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = success ? "#27ae60" : "#c0392b";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  /* ================= SESSION ================= */
  function getSession() {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!token || !user) return null;
      return { token, user };
    } catch {
      return null;
    }
  }

  function requireLogin() {
    const session = getSession();
    if (!session) {
      alert("Please login first");
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  /* ================= FETCH SELLER ================= */
  async function fetchSeller(id) {
    try {
      const res = await fetch(`${API_URL}/seller/${id}`);
      if (!res.ok) throw new Error("Seller fetch failed");
      return await res.json();
    } catch {
      return null;
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
      let items = await res.json();
      if (!Array.isArray(items)) return;

      // SEARCH FILTER
      items = items.filter(i =>
        (i.title + i.uid + (i.highest_rank || ""))
          .toLowerCase()
          .includes(currentSearchQuery)
      );

      // APPLY FILTERS
      if (currentFilter === "own" && session) {
        items = items.filter(i => i.seller_id === session.user.id);
      } else if (currentFilter === "price_high") {
        items.sort((a, b) => b.price - a.price);
      } else if (currentFilter === "price_low") {
        items.sort((a, b) => a.price - b.price);
      }

      container.innerHTML = "";

      for (const item of items) {
        const seller = await fetchSeller(item.seller_id);
        const rating = seller?.avg_rating || 0;
        const verified = seller?.seller_verified;

        const card = document.createElement("div");
        card.className = "item-card";

        card.innerHTML = `
          <div class="rating-badge">⭐ ${rating.toFixed(1)}</div>
          ${verified ? `<div class="verified-badge">✔ Verified Seller</div>` : ""}
          <p><strong>${item.title}</strong></p>
          <p>UID: ${item.uid}</p>
          <p class="price">₹${item.price}</p>
          <button class="btn buy-btn"
            ${item.status !== "available" ? "disabled" : ""}
            onclick="buyItem('${item.id}', '${item.seller_id}')">
            ${item.status === "available" ? "Buy" : "Sold"}
          </button>
          <button class="btn outline"
            onclick="openSellerProfile('${item.seller_id}')">
            Seller Profile
          </button>
        `;

        container.appendChild(card);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load listings", false);
    }
  }

  /* ================= BUY ITEM ================= */
  window.buyItem = async (listingId, sellerId) => {
    const session = requireLogin();
    if (!session) return;

    if (!confirm("Confirm purchase?")) return;

    try {
      const res = await fetch(`${API_URL}/orders/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ listing_id: listingId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order failed");

      showToast("Order created, opening chat...");
      window.open(`${CHAT_URL}?order_id=${data.order.id}`, "_blank");
    } catch (e) {
      showToast(e.message, false);
    }
  };

  /* ================= SELLER PROFILE ================= */
  window.openSellerProfile = async (sellerId) => {
    const modal = document.getElementById("seller-modal");
    const content = document.getElementById("seller-content");

    modal.classList.add("active");
    content.innerHTML = "Loading...";

    const seller = await fetchSeller(sellerId);
    if (!seller) {
      content.innerHTML = "<p>Failed to load seller</p>";
      return;
    }

    const ratingsRes = await fetch(`${API_URL}/seller/${sellerId}/ratings`);
    const ratings = (await ratingsRes.json()) || [];

    content.innerHTML = `
      <h3>${seller.name} ${seller.seller_verified ? "✔" : ""}</h3>
      <p>⭐ ${seller.avg_rating.toFixed(1)} (${seller.review_count} reviews)</p>
      <h4>Reviews</h4>
      ${ratings.map(r => `
        <div class="review">
          <p>⭐ ${r.stars}</p>
          <p>${r.comment || ""}</p>
          ${seller.user_id === getSession()?.user.id
            ? `<button onclick="replyReview(${r.id})">Reply</button>` : ""}
          ${r.reply ? `<p class="reply">Seller: ${r.reply}</p>` : ""}
        </div>
      `).join("")}
    `;
  };

  /* ================= REVIEW REPLY ================= */
  window.replyReview = async (reviewId) => {
    const reply = prompt("Reply to review");
    if (!reply) return;

    const session = getSession();
    if (!session) return;

    try {
      await fetch(`${API_URL}/reviews/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ review_id: reviewId, reply })
      });
      showToast("Reply posted");
      loadListings();
    } catch {
      showToast("Failed to post reply", false);
    }
  };

  /* ================= RATE SELLER ================= */
  window.rateSeller = async (orderId) => {
    const rating = prompt("Rate seller (1–5)");
    if (!rating) return;

    const session = getSession();
    if (!session) return;

    try {
      await fetch(`${API_URL}/reviews/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({ order_id: orderId, stars: Number(rating), comment: "" })
      });
      showToast("Rating submitted");
      loadListings();
    } catch {
      showToast("Failed to submit rating", false);
    }
  };

  /* ================= SEARCH / FILTER ================= */
  searchInput?.addEventListener("input", e => {
    currentSearchQuery = e.target.value.toLowerCase();
    loadListings();
  });

  filterSelect?.addEventListener("change", e => {
    currentFilter = e.target.value;
    loadListings();
  });

  /* ================= INIT ================= */
  loadListings();
  setInterval(loadListings, 30000);
})();
