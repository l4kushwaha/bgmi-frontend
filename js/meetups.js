(() => {
  const API = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const CHAT_API = "https://bgmi_chat_service.bgmi-gateway.workers.dev/api";

  const list = document.getElementById("meetupList");

  const session = () => {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return token && user ? { token, user } : null;
    } catch { return null; }
  };

  const esc = v => String(v ?? "").replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const s = session();
  if (!s) {
    list.innerHTML = '<p class="empty">Login karke dobara aao.</p>';
    return;
  }

  const STATUS = {
    pending: ["Pending", "tag-pending"],
    approved: ["Approved ✅", "tag-approved"],
    declined: ["Declined", "tag-declined"],
    completed: ["Completed 🎉", "tag-completed"],
    cancelled: ["Cancelled", "tag-cancelled"]
  };

  async function load() {
    list.innerHTML = '<p class="empty">Loading…</p>';
    try {
      const res = await fetch(API + "/meetups/my", {
        headers: { Authorization: "Bearer " + s.token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Load failed");
      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) {
        list.innerHTML = '<p class="empty">Abhi koi meetup request nahi hai. 🤝<br><a href="marketplace.html" style="color:#00ffc6">Marketplace par jao →</a></p>';
        return;
      }
      list.innerHTML = "";
      rows.forEach(render);
    } catch (err) {
      list.innerHTML = '<p class="empty">Load failed: ' + esc(err.message) + "</p>";
    }
  }

  function render(m) {
    const [label, cls] = STATUS[m.status] || [m.status, "tag-cancelled"];
    const who = m.is_buyer ? "Aap (Buyer)" : "Aap (Seller)";
    const other = m.is_buyer ? "Seller" : "Buyer";

    const card = document.createElement("div");
    card.className = "mu-card reveal visible";
    card.innerHTML = `
      <div class="mu-head">
        <div class="mu-title">
          ${esc(m.listing_title || ("Listing #" + m.listing_id))}
          <small>UID: ${esc(m.listing_uid || "-")} · ${m.is_buyer ? "Buyer ho aap" : "Seller ho aap"} · ${esc(other)} #${esc(m.is_buyer ? m.seller_id : m.buyer_id)}</small>
        </div>
        <span class="mu-tag ${cls}">${label}</span>
      </div>
      <div class="mu-row">📍 <b>City:</b> ${esc(m.city || "-")}</div>
      <div class="mu-row">🗺️ <b>Spot:</b> ${esc(m.location || "-")}</div>
      <div class="mu-row">📅 <b>When:</b> ${esc(m.meet_date || "-")} ${esc(m.meet_time ? "@ " + m.meet_time : "")}</div>
      ${m.note ? `<div class="mu-row">📝 <b>Note:</b> ${esc(m.note)}</div>` : ""}
      <div class="mu-row">🏷️ <b>Price:</b> ₹${esc(m.listing_price || 0)}</div>
      <div class="mu-actions" id="acts-${m.id}"></div>
    `;
    list.appendChild(card);
    renderActions(card, m);
  }

  function renderActions(card, m) {
    const box = card.querySelector(".mu-actions");
    const actions = [];

    if (m.is_seller && m.status === "pending") {
      actions.push(`<button class="btn approve" data-act="approve">✅ Approve</button>`);
      actions.push(`<button class="btn decline" data-act="decline">❌ Decline</button>`);
    }
    if (m.status === "approved") {
      actions.push(`<button class="btn complete" data-act="complete">🏁 Mark Completed</button>`);
      actions.push(`<button class="btn chat" data-act="chat">💬 Open Chat</button>`);
    }
    if (m.status === "approved" || m.status === "pending") {
      actions.push(`<button class="btn decline" data-act="cancel">✖ Cancel</button>`);
    }

    if (!actions.length) {
      box.innerHTML = "";
      return;
    }
    box.innerHTML = actions.join("");

    box.querySelectorAll("button").forEach(btn => {
      btn.onclick = async () => {
        btn.disabled = true;
        const act = btn.dataset.act;
        try {
          if (act === "chat") {
            const r = await fetch(CHAT_API + "/chat/create", {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.token },
              body: JSON.stringify({ order_id: String(m.listing_id), seller_user_id: m.seller_id, intent: "chat" })
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || "Chat create failed");
            location.href = "/chat.html?room_id=" + d.room_id;
            return;
          }
          if (act === "cancel") {
            const r = await fetch(`${API}/meetups/${m.id}/respond`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.token },
              body: JSON.stringify({ decision: "declined" })
            });
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              throw new Error(d.error || "Cancel failed");
            }
          } else if (act === "approve" || act === "decline") {
            const r = await fetch(`${API}/meetups/${m.id}/respond`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.token },
              body: JSON.stringify({ decision: act })
            });
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              throw new Error(d.error || "Action failed");
            }
          } else if (act === "complete") {
            const r = await fetch(`${API}/meetups/${m.id}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.token }
            });
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              throw new Error(d.error || "Complete failed");
            }
          }
          load();
        } catch (err) {
          alert(err.message);
          btn.disabled = false;
        }
      };
    });
  }

  load();
})();
