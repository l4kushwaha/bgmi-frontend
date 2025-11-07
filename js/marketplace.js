// ===== marketplace.js =====

// Uses apiRequest() from api.js

const container = document.getElementById('items-container');
if (!container) throw new Error("#items-container not found");

let previousItemIds = new Set();
let selectedItemId = null;

// --- Toast helper ---
function showToast(message, success = true) {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.style.background = success ? '#27ae60' : '#c0392b';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- Modal helpers ---
const modalBg = document.getElementById('modal-bg');
const confirmBtn = document.getElementById('confirm-btn');
const cancelBtn = document.getElementById('cancel-btn');

function openModal(itemId) {
    selectedItemId = itemId;
    modalBg.classList.add('active');
}

function closeModal() {
    selectedItemId = null;
    modalBg.classList.remove('active');
}

confirmBtn.addEventListener('click', async () => {
    if (!selectedItemId) return;
    try {
        const res = await apiRequest(`buy/${selectedItemId}`, { method: 'POST' });
        showToast(`✅ Purchase successful: ${res.message}`, true);
        loadMarketplace();
    } catch (err) {
        showToast(`⚠️ Purchase failed: ${err.message}`, false);
    }
    closeModal();
});

cancelBtn.addEventListener('click', closeModal);

// --- Render marketplace items ---
function renderItems(items) {
    container.innerHTML = "";
    if (!items.length) {
        container.innerHTML = "<p>No items available.</p>";
        return;
    }

    const now = new Date().toLocaleTimeString();

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";

        const isNew = !previousItemIds.has(item.id);
        if (isNew) {
            const badge = document.createElement("div");
            badge.className = "new-badge";
            badge.innerText = "NEW";
            card.appendChild(badge);
        }
        previousItemIds.add(item.id);

        const imgUrl = item.images?.[0] || "https://via.placeholder.com/250x150?text=No+Image";
        const isAvailable = item.status?.toLowerCase() === "available";

        card.innerHTML += `
            <img src="${imgUrl}" alt="BGMI ID Image" title="Last updated: ${now}">
            <div class="item-info">
                <strong>UID:</strong> ${item.uid || "N/A"}<br>
                <strong>Rank:</strong> ${item.rank || "N/A"}<br>
                <strong>Price:</strong> ₹${item.price || "N/A"}<br>
                ${item.highlights?.length ? `<div class="highlight">${item.highlights.join(", ")}</div>` : ""}
                <strong>Status:</strong> ${item.status || "Available"}<br>
                <button class="buy-btn" onclick="openModal('${item.id}')" ${!isAvailable ? "disabled" : ""}>
                    ${isAvailable ? "Buy" : "Sold Out"}
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// --- Load marketplace ---
async function loadMarketplace() {
    container.innerHTML = "<p>Loading items...</p>";
    try {
        const data = await apiRequest('items');
        renderItems(data.items || []);
    } catch (err) {
        container.innerHTML = `<p style="color:red;">⚠️ Failed to load items: ${err.message}</p>`;
    }
}

// --- Search filter ---
document.getElementById("search").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const allCards = document.querySelectorAll(".item-card");
    allCards.forEach(card => {
        const text = card.querySelector(".item-info").innerText.toLowerCase();
        card.style.display = text.includes(query) ? "block" : "none";
    });
});

// --- Auto-load & refresh ---
document.addEventListener('DOMContentLoaded', () => {
    loadMarketplace();
    setInterval(loadMarketplace, 30000); // refresh every 30s
});
