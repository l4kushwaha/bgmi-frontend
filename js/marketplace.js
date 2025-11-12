(() => {
  // ===== Only run if marketplace DOM exists =====
  const container = document.getElementById("items-container");
  if (!container) return; // Prevent JS errors on sell.html

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/market";
  let selectedListingId = null;
  let selectedAction = null; // "purchase" or "edit"
  let currentSearchQuery = "";

  // ===== Toast =====
  function showToast(msg, success = true) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = success ? "#27ae60" : "#c0392b";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ===== Session helpers =====
  function getSession() {
    const token = localStorage.getItem("jwt_token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) return null;
    return { token, user };
  }

  function requireLogin() {
    const session = getSession();
    if (!session) {
      alert("Please login first!");
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  // ===== Render Listings =====
  async function loadListings() {
    const session = getSession();
    const JWT = session?.token;

    try {
      const res = await fetch(`${API_URL}/list`, {
        headers: JWT ? { "Authorization": `Bearer ${JWT}` } : {}
      });
      const items = await res.json();
      container.innerHTML = "";

      if (!items || items.length === 0) {
        container.innerHTML = "<p>No items available</p>";
        return;
      }

      // Filter by search query
      const filteredItems = items.filter(item => {
        const text = (item.title + " " + item.uid + " " + (item.highlights || []).join(", ")).toLowerCase();
        return text.includes(currentSearchQuery.toLowerCase());
      });

      if (filteredItems.length === 0) {
        container.innerHTML = "<p>No items found</p>";
        return;
      }

      filteredItems.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";

        const isNew = item.status === "available";
        let buttonsHTML = "";

        if (item.status === "available") {
          buttonsHTML += `<button class="buy-btn" onclick="openListingModal(${item.id}, 'purchase')">Buy</button>`;
        } else {
          buttonsHTML += `<button class="buy-btn" disabled>Sold Out</button>`;
        }

        if (session && (session.user.role === "admin" || session.user.id === item.seller_id)) {
          buttonsHTML += `<button class="edit-btn" onclick="openListingModal(${item.id}, 'edit')">Edit</button>`;
        }

        card.innerHTML = `
          ${isNew ? '<div class="new-badge">NEW</div>' : ''}
          <div class="item-info">
            <p><strong>Title:</strong> ${item.title || "N/A"}</p>
            <p><strong>UID:</strong> ${item.uid || "N/A"}</p>
            ${item.highlights ? `<p class="highlight">${item.highlights.join(", ")}</p>` : ""}
            <p class="highlight"><strong>Price:</strong> ₹${item.price || 0}</p>
            <p><strong>Status:</strong> ${item.status || "Available"}</p>
            ${buttonsHTML}
          </div>
        `;
        container.appendChild(card);
      });

    } catch (err) {
      console.error(err);
      showToast("Failed to load items", false);
      container.innerHTML = "<p>Failed to load items</p>";
    }
  }

  // ===== Modal =====
  window.openListingModal = (id, action) => {
    const session = requireLogin();
    if (!session) return;

    selectedListingId = id;
    selectedAction = action;

    const modalBg = document.getElementById("modal-bg");
    const modalText = document.getElementById("modal-text");
    modalText.textContent = action === "purchase" ? "Confirm purchase?" : "Edit your listing?";
    modalBg.classList.add("active");

    if (action === "edit") {
      const newPrice = prompt("Enter new price (₹):");
      if (newPrice !== null) updateListingPrice(id, parseInt(newPrice), session.token);
    }
  }

  document.getElementById("cancel-btn").addEventListener("click", () => {
    selectedListingId = null;
    selectedAction = null;
    document.getElementById("modal-bg").classList.remove("active");
  });

  document.getElementById("confirm-btn").addEventListener("click", async () => {
    const session = requireLogin();
    if (!session) return;
    const JWT = session.token;

    if (!selectedListingId || !selectedAction) return;
    if (selectedAction === "purchase") {
      try {
        const res = await fetch(`${API_URL}/purchase/${selectedListingId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JWT}` },
          body: JSON.stringify({ payment_method: "wallet" })
        });
        const data = await res.json();
        showToast(data.message || "Purchase successful");
        loadListings();
      } catch (err) {
        console.error(err);
        showToast("Purchase failed", false);
      }
    }

    selectedListingId = null;
    selectedAction = null;
    document.getElementById("modal-bg").classList.remove("active");
  });

  // ===== Update Listing Price =====
  async function updateListingPrice(id, price, JWT) {
    if (!JWT) return;
    if (!price || isNaN(price)) return showToast("Invalid price", false);
    try {
      const res = await fetch(`${API_URL}/update/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${JWT}` },
        body: JSON.stringify({ price })
      });
      const data = await res.json();
      showToast(data.message || "Price updated");
      loadListings();
    } catch (err) {
      console.error(err);
      showToast("Failed to update price", false);
    }
  }

  // ===== Search =====
  const searchInput = document.getElementById("search");
  searchInput.addEventListener("input", (e) => {
    currentSearchQuery = e.target.value.toLowerCase();
    loadListings(); // Filtered reload
  });

  // ===== Initial Load & Auto-refresh =====
  loadListings();
  setInterval(() => loadListings(), 30000); // 30s auto-refresh

})();
