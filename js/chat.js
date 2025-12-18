// =====================================================
// 💬 BGMI Chat Frontend – FINAL v6
// =====================================================
// Features:
// ✅ JWT Auth
// ✅ Real-time WebSocket
// ✅ Message Status (sent/delivered/read)
// ✅ Typing Indicator
// ✅ Online / Offline Presence
// =====================================================

const API_BASE = "https://bgmi_chat_service.bgmi-gateway.workers.dev";
const token = localStorage.getItem("jwt"); // JWT after login

let receiver_id = null;
let socket = null;

// DOM
const usersDiv = document.getElementById("userList");
const messagesDiv = document.getElementById("messages");
const input = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const typingDiv = document.getElementById("typing");
const presenceDiv = document.getElementById("presence");

/* ========== HELPERS ========== */
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function addMessage(msg, mine) {
  const div = document.createElement("div");
  div.className = mine ? "sent" : "received";
  div.id = `msg-${msg.id || ""}`;
  div.innerHTML = `
    <span>${msg.content}</span>
    ${mine ? `<small>${msg.status || "sent"}</small>` : ""}
  `;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* ========== OPEN CHAT ========== */
async function openChat(userId) {
  receiver_id = userId;
  messagesDiv.innerHTML = "";

  // load history
  const res = await fetch(
    `${API_BASE}/api/chat/conversation/${receiver_id}`,
    { headers: authHeaders() }
  );
  const data = await res.json();
  data.forEach(m => addMessage(m, m.sender_id !== receiver_id));

  checkPresence();
}

/* ========== SEND MESSAGE ========== */
async function sendMessage() {
  const content = input.value.trim();
  if (!content || !receiver_id) return;

  input.value = "";

  await fetch(`${API_BASE}/api/chat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ receiver_id, content }),
  });

  addMessage({ content, status: "sent" }, true);
}

/* ========== READ RECEIPT ========== */
async function markRead(message_id, sender_id) {
  await fetch(`${API_BASE}/api/chat/read`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message_id, sender_id }),
  });
}

/* ========== TYPING ========== */
input.addEventListener("input", async () => {
  if (!receiver_id) return;
  await fetch(`${API_BASE}/api/chat/typing`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ receiver_id }),
  });
});

/* ========== PRESENCE ========== */
async function checkPresence() {
  const res = await fetch(`${API_BASE}/api/user/presence`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  presenceDiv.textContent = data.online ? "🟢 Online" : "⚫ Offline";
}

/* ========== WEBSOCKET ========== */
function connectWS() {
  socket = new WebSocket(
    `wss://bgmi_chat_service.bgmi-gateway.workers.dev/ws`,
    []
  );

  socket.onmessage = e => {
    const msg = JSON.parse(e.data);

    if (msg.type === "chat") {
      addMessage(msg, false);
      markRead(msg.message_id, msg.sender_id);
    }

    if (msg.type === "typing") {
      typingDiv.textContent = "Typing...";
      setTimeout(() => (typingDiv.textContent = ""), 1000);
    }

    if (msg.type === "read") {
      const el = document.querySelector(`#msg-${msg.message_id} small`);
      if (el) el.textContent = "read ✔✔";
    }

    if (msg.type === "order") {
      alert(`🛒 New Order: ${msg.product} ₹${msg.amount}`);
    }
  };
}

/* ========== EVENTS ========== */
sendBtn.onclick = sendMessage;
input.addEventListener("keypress", e => e.key === "Enter" && sendMessage());

/* ========== INIT ========== */
connectWS();
