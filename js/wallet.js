
// ===== wallet.js =====
const WALLET_API = "http://localhost:5003"; // Wallet Service URL
const token = localStorage.getItem("token");

// Fetch wallet balance
async function getWalletBalance() {
  try {
    const res = await fetch(`${WALLET_API}/wallet/balance`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    document.getElementById("balance").textContent = data.balance || 0;
  } catch (err) {
    console.error("Error loading wallet:", err);
  }
}

// Fetch transactions
async function loadTransactions() {
  try {
    const res = await fetch(`${WALLET_API}/wallet/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    const container = document.getElementById("transactions");
    if (!data.length) {
      container.innerHTML = "<p>No transactions yet.</p>";
      return;
    }

    container.innerHTML = data
      .map(
        (t) => `
      <div class="transaction">
        <p>${t.type.toUpperCase()} - ₹${t.amount}</p>
        <p>${new Date(t.date).toLocaleString()}</p>
      </div>`
      )
      .join("");
  } catch (err) {
    console.error("Error fetching transactions:", err);
  }
}

// Withdraw funds
async function withdrawFunds() {
  const amount = prompt("Enter amount to withdraw:");
  if (!amount || isNaN(amount) || amount <= 0) return alert("Invalid amount");

  try {
    const res = await fetch(`${WALLET_API}/wallet/withdraw`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });

    const data = await res.json();
    if (res.ok) {
      alert("Withdrawal successful!");
      getWalletBalance();
      loadTransactions();
    } else {
      alert(data.message || "Withdrawal failed");
    }
  } catch (err) {
    console.error(err);
  }
}

window.onload = function () {
  getWalletBalance();
  loadTransactions();
};
