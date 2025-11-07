// ===== marketplace.js =====

const API_URL = "https://bgmi_marketplace-service.bgmi-gateway.workers.dev/api/market";

let previousItemIds = new Set();

async function apiRequest(path, options = {}) {
    const url = `${API_URL}/${path}`;
    const res = await fetch(url, options);
    if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "API request failed");
    }
    return await res.json();
}

const container = document.getElementById('items-container');
if (!container) throw new Error("#items-container not found");

async function loadMarketplace() {
    container.innerHTML = "<p>Loading items...</p>";
    try {
        const data = await apiRequest('items');
        renderItems(data.items || []);
    } catch (err) {
        container.innerHTML = `<p style="color:red;">⚠️ Failed to load items: ${err.message}</p>`;
    }
}

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
                <button class="buy-btn" onclick="buyItem('${item.id}')" ${!isAvailable ? "disabled" : ""}>
                    ${isAvailable ? "Buy" : "Sold Out"}
                </button>
            </div>
        `;

        container.appendChild(card);
    });
}

async function buyItem(itemId) {
    try {
        const res = await apiRequest(`buy/${itemId}`, { method: 'POST' });
        alert(`✅ Purchase successful: ${res.message}`);
        loadMarketplace();
    } catch (err) {
        alert(`⚠️ Purchase failed: ${err.message}`);
    }
}

// Search filter
document.getElementById("search").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const allCards = document.querySelectorAll(".item-card");
    allCards.forEach(card => {
        const text = card.querySelector(".item-info").innerText.toLowerCase();
        card.style.display = text.includes(query) ? "block" : "none";
    });
});

// Auto-load & refresh
document.addEventListener('DOMContentLoaded', () => {
    loadMarketplace();
    setInterval(loadMarketplace, 30000); // refresh every 30s
});
