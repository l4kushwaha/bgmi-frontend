const WALLET_API = "https://bgmi-wallet-service.bgmi-gateway.workers.dev";
const CHAT_API   = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

const token = localStorage.getItem("token");
const room  = JSON.parse(localStorage.getItem("activeRoom") || "null");

if (!token || !room) {
  alert("Session expired");
  location.href = "/login";
}

const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + token
};

const infoText = document.getElementById("infoText");
const payBtn = document.getElementById("payBtn");

/* ================= INIT ================= */
(async () => {
  const r = await fetch(`${WALLET_API}/create-order`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      order_id: room.order_id,
      amount: room.amount
    })
  });

  const data = await r.json();
  if (!r.ok) return alert(data.error);

  window.razorpayData = data;

  infoText.innerHTML = `
    Total Amount: ₹${data.amount}<br>
    Service Charge (10%): ₹${data.admin_fee}<br>
    Seller Receives: ₹${data.seller_amount}
  `;
})();

/* ================= PAY ================= */
payBtn.onclick = () => {
  const d = window.razorpayData;

  const options = {
    key: d.key,
    amount: d.admin_fee * 100,
    currency: "INR",
    name: "BGMI Marketplace",
    description: "Service Charge",
    order_id: d.razorpay_order_id,
    handler: async function (res) {

      // VERIFY PAYMENT
      const vr = await fetch(`${WALLET_API}/verify`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          razorpay_payment_id: res.razorpay_payment_id,
          razorpay_order_id: res.razorpay_order_id,
          razorpay_signature: res.razorpay_signature,
          order_id: room.order_id,
          seller_id: room.seller_user_id
        })
      });

      const v = await vr.json();
      if (!vr.ok) return alert(v.error);

      // 🔔 Notify chat
      await fetch(`${CHAT_API}/api/chat/half-payment`, {
        method: "POST",
        headers,
        body: JSON.stringify({ room_id: room.id })
      });

      alert("Service charge paid successfully");
      location.href = "/chat.html";
    },
    theme: { color: "#22c55e" }
  };

  new Razorpay(options).open();
};
