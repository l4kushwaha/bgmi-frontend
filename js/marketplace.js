
async function loadMarketplace() {
  const response = await fetch(API_URL + '/marketplace/items');
  const data = await response.json();

  const container = document.getElementById('items-container');
  container.innerHTML = data.map(item => `
    <div class="item">
      <h3>${item.username}</h3>
      <p>Rank: ${item.rank}</p>
      <p>Price: ₹${item.price}</p>
      <button onclick="buyItem('${item.id}')">Buy</button>
    </div>
  `).join('');
}
window.onload = loadMarketplace;
