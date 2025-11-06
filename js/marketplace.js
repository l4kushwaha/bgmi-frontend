// ===== marketplace.js =====

// DOM reference
const container = document.getElementById('items-container');

// Fetch and render marketplace items
async function loadMarketplace() {
  try {
    // Use apiRequest helper from api.js for market service
    const data = await apiRequest('market/items'); // automatic BASE_URL & token included

    container.innerHTML = data.map(item => `
      <div class="item">
        <h3>${item.username}</h3>
        <p>Rank: ${item.rank}</p>
        <p>Price: ₹${item.price}</p>
        <button onclick="buyItem('${item.id}')">Buy</button>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<p style="color:red;">⚠️ Failed to load marketplace items.</p>`;
  }
}

// Buy button handler
async function buyItem(itemId) {
  try {
    const res = await apiRequest(`market/buy/${itemId}`, { method: 'POST' });
    alert(`✅ Purchase successful: ${res.message}`);
    loadMarketplace(); // refresh items
  } catch (err) {
    alert(`⚠️ Purchase failed: ${err.message}`);
  }
}

// Auto-load on page load
window.addEventListener('load', loadMarketplace);
