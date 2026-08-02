const WALLET_API = "https://bgmi-marketplace.bgmi-gateway.workers.dev";

const token = localStorage.getItem("token");
const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + token
};

const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const esc = v => String(v ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const toast = msg => {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
};

async function loadBalance() {
  try {
    const res = await fetch(`${WALLET_API}/balance`, { headers });
    if (res.status === 401) {
      toast("Session expired, please login");
      return;
    }
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Failed to load balance");

    document.getElementById("availableBalance").textContent = fmt(d.available_balance);
    document.getElementById("escrowHeld").textContent = fmt(d.escrow_held);
    document.getElementById("totalWithdrawn").textContent = fmt(d.total_withdrawn);
  } catch (err) {
    toast(err.message);
  }
}

async function loadWithdrawals() {
  try {
    const res = await fetch(`${WALLET_API}/withdrawals`, { headers });
    const list = await res.json();
    const box = document.getElementById("withdrawalsList");
    box.innerHTML = "";

    if (!Array.isArray(list) || !list.length) {
      box.innerHTML = `<p style="opacity:.7">No withdrawals yet</p>`;
      return;
    }

    list.forEach(w => {
      const el = document.createElement("div");
      el.className = "wd-item";
      const colors = { pending: "#ffb703", processed: "#22c55e", rejected: "#ef4444" };
      el.innerHTML = `
        <div>
          <strong>${fmt(w.amount)}</strong>
          <small>→ ${esc(w.upi_id)} · ${esc(w.created_at || "")}</small>
        </div>
        <span class="wd-status" style="color:${colors[w.status] || "#fff"}">${esc(w.status)}</span>
      `;
      box.appendChild(el);
    });
  } catch (err) {
    toast(err.message);
  }
}

document.getElementById("withdrawBtn")?.addEventListener("click", async () => {
  const amount = Number(document.getElementById("withdrawAmount").value);
  const upi_id = document.getElementById("upiId").value.trim();

  if (!amount || amount <= 0) return toast("Enter a valid amount");
  if (!upi_id) return toast("Enter your UPI ID");

  try {
    const res = await fetch(`${WALLET_API}/withdraw`, {
      method: "POST",
      headers,
      body: JSON.stringify({ amount, upi_id })
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || "Withdrawal failed");
    toast("Withdrawal requested");
    document.getElementById("withdrawAmount").value = "";
    document.getElementById("upiId").value = "";
    loadBalance();
    loadWithdrawals();
  } catch (err) {
    toast(err.message);
  }
});

loadBalance();
loadWithdrawals();
