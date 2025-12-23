(() => {
const API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

/* ================= SESSION ================= */
const token = localStorage.getItem("token");
const user  = JSON.parse(localStorage.getItem("user") || "null");
if (!token || !user) return alert("Login required");

const headers = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + token
};

/* ================= DOM ================= */
const chatListBox = document.getElementById("chatList");
const chatBox = document.getElementById("chatBox");
const chatStatus = document.getElementById("chatStatus");
const waitingBox = document.getElementById("waitingBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const imgBtn = document.getElementById("imgBtn");
const imgInput = document.getElementById("imageInput");
const search = document.getElementById("searchChats");
const sound = document.getElementById("notifySound");
const onlineStatus = document.getElementById("onlineStatus");

/* ================= STATE ================= */
let chats = [];
let activeRoom = null;
let lastCount = 0;

/* ================= ONLINE ================= */
function updateOnline() {
  onlineStatus.textContent = navigator.onLine ? "🟢 Online" : "🔴 Offline";
}
window.addEventListener("online", updateOnline);
window.addEventListener("offline", updateOnline);
updateOnline();

/* ================= LOAD MY CHATS ================= */
async function loadMyChats() {
  const r = await fetch(API + "/api/chat/my", { headers });
  chats = await r.json();
  renderChatList();
}

/* ================= RENDER CHAT LIST ================= */
function renderChatList() {
  const q = search.value.toLowerCase();
  chatListBox.innerHTML = "";

  chats
    .filter(c =>
      !q ||
      (c.order_id || "").toLowerCase().includes(q) ||
      (c.last_message || "").toLowerCase().includes(q)
    )
    .forEach(c => {
      const div = document.createElement("div");
      div.className = "chat-item" + (activeRoom === c.id ? " active" : "");
      div.innerHTML = `
        <div class="chat-title">Order: ${c.order_id}</div>
        <div class="chat-preview">${c.last_message || "No messages"}</div>
        <div class="chat-meta">${c.status}</div>
      `;
      div.onclick = () => openChat(c.id);
      chatListBox.appendChild(div);
    });
}

/* ================= OPEN CHAT ================= */
async function openChat(room_id) {
  activeRoom = room_id;
  chatBox.innerHTML = "";
  waitingBox.innerHTML = "";
  lastCount = 0;

  const r = await fetch(`${API}/api/chat/room?room_id=${room_id}`, { headers });
  if (!r.ok) return;

  const room = await r.json();
  renderStatus(room);
  loadMessages();
  renderChatList();
}

/* ================= STATUS UI ================= */
function renderStatus(room) {
  // Seller request
  if (String(room.seller_user_id) === String(user.id) && room.status === "requested") {
    chatStatus.textContent = "New request";
    waitingBox.innerHTML = `
      <button onclick="approve(true)">Accept</button>
      <button onclick="approve(false)">Reject</button>
    `;
    disable(true);
    return;
  }

  // Buyer waiting
  if (String(room.buyer_id) === String(user.id) && room.status === "requested") {
    chatStatus.textContent = "Waiting for seller";
    waitingBox.textContent = "⏳ Request sent";
    disable(true);
    return;
  }

  chatStatus.textContent = "Chat active";
  disable(false);
}

function disable(d) {
  input.disabled = d;
  sendBtn.disabled = d;
  imgBtn.disabled = d;
}

/* ================= APPROVE ================= */
window.approve = async function(ok) {
  await fetch(API + "/api/chat/approve", {
    method: "POST",
    headers,
    body: JSON.stringify({ room_id: activeRoom, approve: ok })
  });
  openChat(activeRoom);
  loadMyChats();
};

/* ================= LOAD MESSAGES ================= */
async function loadMessages() {
  if (!activeRoom) return;

  const r = await fetch(`${API}/api/chat/messages?room_id=${activeRoom}`, { headers });
  const msgs = await r.json();
  if (!Array.isArray(msgs) || msgs.length === lastCount) return;

  if (msgs.length > lastCount) sound.play();
  lastCount = msgs.length;

  chatBox.innerHTML = "";
  msgs.forEach(m => {
    const div = document.createElement("div");
    div.className = "message " + (String(m.sender_id) === String(user.id) ? "sent" : "received");

    if (m.type === "image") {
      const img = document.createElement("img");
      img.src = m.ciphertext;
      img.className = "chat-image";
      div.appendChild(img);
    } else {
      div.textContent = m.ciphertext;
    }
    chatBox.appendChild(div);
  });
  chatBox.scrollTop = chatBox.scrollHeight;
}

/* ================= SEND MESSAGE ================= */
async function sendMessage(msg, type="text") {
  if (!activeRoom || !msg) return;

  await fetch(API + "/api/chat/send", {
    method: "POST",
    headers,
    body: JSON.stringify({
      room_id: activeRoom,
      message: msg,
      type,
      sensitive: false
    })
  });
  loadMessages();
  loadMyChats();
}

/* ================= EVENTS ================= */
sendBtn.onclick = () => {
  sendMessage(input.value);
  input.value = "";
};

input.addEventListener("keydown", e => {
  if (e.key === "Enter") sendBtn.onclick();
});

imgBtn.onclick = () => imgInput.click();

imgInput.onchange = () => {
  const file = imgInput.files[0];
  const reader = new FileReader();
  reader.onload = () => sendMessage(reader.result, "image");
  reader.readAsDataURL(file);
};

search.oninput = renderChatList;

/* ================= POLLING ================= */
setInterval(() => {
  loadMyChats();
  loadMessages();
}, 3000);

/* ================= INIT ================= */
loadMyChats();
})();