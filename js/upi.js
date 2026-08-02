(() => {
  /* =====================================================
     UPI Direct Payment Modal (no gateway / no KYC)
     Buyer pays admin UPI ID via any UPI app, submits UTR.
     ===================================================== */
  const WALLET_URL = "https://bgmi-marketplace.bgmi-gateway.workers.dev";

  const styles = `
    #upiModalWrap{position:fixed;inset:0;z-index:999;display:none;align-items:center;justify-content:center;
      background:rgba(5,5,12,.82);backdrop-filter:blur(6px);padding:16px}
    #upiModalWrap.show{display:flex;animation:fadeUp .3s ease both}
    #upiModal{width:100%;max-width:400px;background:#12121d;border:1px solid #2a2a3a;border-radius:18px;
      padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.6);color:#fff;font-family:'Poppins',sans-serif}
    #upiModal h3{margin:0 0 4px;font-size:1.1rem;color:#00ffc6}
    #upiModal .sub{opacity:.6;font-size:.78rem;margin-bottom:14px}
    #upiQr{width:190px;height:190px;border-radius:14px;margin:0 auto 12px;display:block;background:#fff;padding:8px;border:2px solid #00ffc6}
    #upiMeta{text-align:center;margin-bottom:12px}
    #upiMeta .upiId{font-weight:700;color:#fff;font-size:.95rem;word-break:break-all}
    #upiMeta .upiName{opacity:.65;font-size:.8rem}
    #upiAmount{text-align:center;font-size:1.6rem;font-weight:800;color:#00ffc6;margin:6px 0 12px}
    #upiActions{display:flex;gap:8px;margin-bottom:12px}
    .upiBtn{flex:1;background:#16a34a;border:none;color:#fff;padding:11px;border-radius:11px;font-weight:700;font-size:.85rem;cursor:pointer;transition:.2s}
    .upiBtn:hover{filter:brightness(1.15)}
    .upiBtn.ghost{background:rgba(255,255,255,.07);border:1px solid #333}
    #upiUtr{width:100%;background:rgba(255,255,255,.06);border:1px solid #333;color:#fff;padding:12px;border-radius:11px;
      font-size:.9rem;outline:none;margin-bottom:10px;box-sizing:border-box}
    #upiUtr:focus{border-color:#00ffc6}
    #upiSubmit{width:100%;background:linear-gradient(90deg,#00ffc6,#00b894);border:none;color:#062;padding:13px;
      border-radius:12px;font-weight:800;font-size:.95rem;cursor:pointer;transition:.2s}
    #upiSubmit:hover{box-shadow:0 0 20px rgba(0,255,198,.4)}
    #upiClose{position:absolute;top:18px;right:22px;color:#fff;background:rgba(255,255,255,.08);border:none;
      width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:1rem;z-index:1000}
    #upiNote{font-size:.72rem;opacity:.55;text-align:center;margin-top:10px;line-height:1.5}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  `;

  function esc(v) {
    return String(v ?? "").replace(/[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function buildModal() {
    if (document.getElementById("upiModalWrap")) return;
    const style = document.createElement("style");
    style.textContent = styles;
    document.head.appendChild(style);

    const wrap = document.createElement("div");
    wrap.id = "upiModalWrap";
    wrap.innerHTML = `
      <button id="upiClose" title="Cancel">&times;</button>
      <div id="upiModal">
        <h3>💰 UPI Payment</h3>
        <div class="sub">Pay directly to this UPI ID from any app (GPay / PhonePe / Paytm)</div>
        <img id="upiQr" alt="UPI QR" />
        <div id="upiMeta">
          <div class="upiId"></div>
          <div class="upiName"></div>
        </div>
        <div id="upiAmount"></div>
        <div id="upiActions">
          <button class="upiBtn" id="upiPayBtn">Pay via UPI App</button>
          <button class="upiBtn ghost" id="upiCopyBtn">Copy UPI ID</button>
        </div>
        <input id="upiUtr" placeholder="Enter UTR / Reference No. after paying" autocomplete="off" />
        <button id="upiSubmit">I have paid — Submit UTR</button>
        <div id="upiNote">UPI transfers are instant. After paying, submit your UTR number and the admin will confirm &amp; release the payment.</div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  window.openUpiPay = function (opts) {
    buildModal();
    const wrap = document.getElementById("upiModalWrap");
    const qr = document.getElementById("upiQr");
    const upi_id = opts.upi_id || "pay@bgmimarket";
    const upi_name = opts.upi_name || "BGMI Market";
    const amount = Number(opts.amount || 0);
    const order_id = opts.order_id;
    const note = opts.note || "UPI transfers are instant. After paying, submit your UTR number and the admin will confirm &amp; release the payment.";

    const uri = `upi://pay?pa=${encodeURIComponent(upi_id)}&pn=${encodeURIComponent(upi_name)}` +
      (amount ? `&am=${amount}` : "") +
      (order_id ? `&tn=${encodeURIComponent("BGMI Order " + order_id)}` : "") + `&cu=INR`;

    qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=190x190&data=" + encodeURIComponent(uri);
    document.querySelector("#upiMeta .upiId").textContent = upi_id;
    document.querySelector("#upiMeta .upiName").textContent = upi_name + (opts.direct_to_seller ? " (Seller — direct)" : " (payee)");
    document.getElementById("upiAmount").textContent = "₹" + Number(amount).toLocaleString("en-IN");
    document.getElementById("upiNote").textContent = note;
    document.getElementById("upiUtr").value = "";
    wrap.classList.add("show");

    return new Promise(resolve => {
      const cleanup = result => {
        wrap.classList.remove("show");
        document.getElementById("upiPayBtn").onclick = null;
        document.getElementById("upiCopyBtn").onclick = null;
        document.getElementById("upiSubmit").onclick = null;
        document.getElementById("upiClose").onclick = null;
        resolve(result);
      };

      document.getElementById("upiClose").onclick = () => cleanup({ ok: false, cancelled: true });
      document.getElementById("upiPayBtn").onclick = () => window.open(uri, "_blank");
      document.getElementById("upiCopyBtn").onclick = async () => {
        try {
          await navigator.clipboard.writeText(upi_id);
          const b = document.getElementById("upiCopyBtn");
          b.textContent = "Copied ✓";
          setTimeout(() => b.textContent = "Copy UPI ID", 1500);
        } catch (e) {
          prompt("Copy UPI ID:", upi_id);
        }
      };
      document.getElementById("upiSubmit").onclick = async () => {
        const utr = document.getElementById("upiUtr").value.trim();
        if (!utr) { alert("Enter your UTR / reference number"); return; }
        const btn = document.getElementById("upiSubmit");
        btn.disabled = true; btn.textContent = "Submitting…";
        try {
          const token = localStorage.getItem("token");
          const r = await fetch(WALLET_URL + "/pay/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ order_id, utr })
          });
          const data = await r.json();
          if (!r.ok) { alert(data.error || "Submission failed"); btn.disabled = false; btn.textContent = "I have paid — Submit UTR"; return; }
          cleanup({ ok: true, utr });
        } catch (e) {
          alert("Network error — please retry");
          btn.disabled = false; btn.textContent = "I have paid — Submit UTR";
        }
      };
    });
  };
})();
