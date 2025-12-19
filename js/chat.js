// ================= BGMI Chat – FINAL v8 =================
const API_BASE = "https://bgmi_chat_service.bgmi-gateway.workers.dev";
const token = localStorage.getItem("token"); // pre-stored JWT

let receiver_id = null;
let socket = null;

// DOM
const usersDiv = document.getElementById("searchResults");
const messagesDiv = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingDiv = document.getElementById("typing");
const presenceDiv = document.getElementById("presence");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

/* ===== HELPERS ===== */
function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

function addMessage(msg, mine) {
  const div = document.createElement("div");
  div.className = mine ? "sent message" : "received message";
  div.id = `msg-${msg.id || ""}`;
  div.innerHTML = `<span>${msg.content}</span>${mine ? `<small>${msg.status || "sent"}</small>` : ""}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* ===== SEARCH USERS ===== */
async function searchUsers() {
  const q = searchInput.value.trim();
  if (!q) return;
  usersDiv.innerHTML = "<p>Searching...</p>";

  const res = await fetch(`${API_BASE}/api/chat/users/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
  const users = await res.json();

  usersDiv.innerHTML = "";
  users.forEach(u => {
    const div = document.createElement("div");
    div.textContent = `${u.username} (${u.email})`;
    div.onclick = () => openChat(u.id);
    usersDiv.appendChild(div);
  });
}

/* ===== OPEN CHAT ===== */
async function openChat(userId) {
  receiver_id = userId;
  messagesDiv.innerHTML = "<p class='chat-placeholder'>Loading...</p>";

  const res = await fetch(`${API_BASE}/api/chat/conversation/${receiver_id}`, { headers: authHeaders() });
  const data = await res.json();
  messagesDiv.innerHTML = "";
  data.forEach(m => addMessage(m, m.sender_id != receiver_id));

  checkPresence();
}

/* ===== SEND MESSAGE ===== */
async function sendMessage() {
  const content = input.value.trim();
  if (!content || !receiver_id) return;
  input.value = "";

  const res = await fetch(`${API_BASE}/api/chat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ receiver_id, content })
  });
  const data = await res.json();

  addMessage({ content, status: "sent", id: data.message_id }, true);
}

/* ===== MARK READ ===== */
async function markRead(message_id, sender_id) {
  await fetch(`${API_BASE}/api/chat/read`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message_id, sender_id })
  });
}

/* ===== TYPING ===== */
input.addEventListener("input", async () => {
  if (!receiver_id) return;
  await fetch(`${API_BASE}/api/chat/typing`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ receiver_id })
  });
});

/* ===== PRESENCE ===== */
async function checkPresence() {
  const res = await fetch(`${API_BASE}/api/user/presence`, { headers: authHeaders() });
  const data = await res.json();
  presenceDiv.textContent = data.online ? "🟢 Online" : "⚫ Offline";
}

/* ===== WEBSOCKET ===== */
function connectWS() {
  const token = localStorage.getItem("token");
  if (!token) return console.error("No JWT token");

  socket = new WebSocket(
    `${API_BASE.replace("https", "wss")}/ws?token=${encodeURIComponent(token)}`
  );

  socket.onopen = () => {
    console.log("✅ WebSocket connected");
  };

  socket.onmessage = e => {
    const msg = JSON.parse(e.data);
    console.log("📩 WS:", msg);
  };

  socket.onerror = () => {
    console.warn("⚠️ WebSocket error");
  };

  socket.onclose = () => {
    console.warn("⚠️ WebSocket disconnected, reconnecting in 3s");
    setTimeout(connectWS, 3000);
  };
}


/* ===== EVENTS ===== */
sendBtn.onclick = sendMessage;
input.addEventListener("keypress", e => e.key === "Enter" && sendMessage());
searchBtn.onclick = searchUsers;
searchInput.addEventListener("keypress", e => e.key === "Enter" && searchUsers());

/* ===== INIT ===== */
connectWS();
