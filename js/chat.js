const API_BASE = "https://bgmi_chat_service.bgmi-gateway.workers.dev";
const token = localStorage.getItem("token"); // pre-stored JWT

let room_id = null;
let sse = null;

// DOM
const messagesDiv = document.getElementById("chatBox");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const attachInput = document.getElementById("attachments"); // <input type="file" multiple>
const presenceDiv = document.getElementById("presence");

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

// Add message to chat
function addMessage(msg, mine = false) {
  const div = document.createElement("div");
  div.className = mine ? "sent message" : "received message";
  div.id = `msg-${msg.id || ""}`;

  let attachHTML = "";
  if (msg.attachments && msg.attachments.length > 0) {
    attachHTML = msg.attachments.map(a => `<a href="${a.file_url}" target="_blank">${a.file_url.split("/").pop()}</a>`).join("<br>");
  }

  div.innerHTML = `
    <span>${msg.message}</span>
    ${mine ? `<small>${msg.status || "sent"}</small>` : ""}
    <div class="attachments">${attachHTML}</div>
  `;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Open chat room
async function openChat(rid) {
  room_id = rid;
  messagesDiv.innerHTML = "<p class='chat-placeholder'>Loading...</p>";

  const res = await fetch(`${API_BASE}/api/chat/messages?room_id=${room_id}`, { headers: authHeaders() });
  const data = await res.json();
  messagesDiv.innerHTML = "";
  data.forEach(m => addMessage(m, m.sender_id !== room_id));

  connectSSE();
  checkPresence();
}

// Send message
async function sendMessage() {
  if (!room_id) return;
  const content = input.value.trim();
  if (!content && attachInput.files.length === 0) return;

  const attachments = Array.from(attachInput.files).map(f => ({
    url: URL.createObjectURL(f),
    mime_type: f.type
  }));

  input.value = "";
  attachInput.value = "";

  const body = { room_id, message: content, type: "text", attachments };

  const res = await fetch(`${API_BASE}/api/chat/send`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  const data = await res.json();
  addMessage({ message: content, attachments, status: "sent", id: data.message_id }, true);
}

// SSE / Live updates
function connectSSE() {
  if (!room_id) return;
  if (sse) sse.close();

  sse = new EventSource(`${API_BASE}/api/chat/stream?room_id=${room_id}`, { headers: { Authorization: `Bearer ${token}` } });

  sse.onmessage = e => {
    const msg = JSON.parse(e.data);
    addMessage(msg, msg.sender_id !== room_id);
  };

  sse.onerror = () => {
    console.warn("SSE error, reconnecting in 3s");
    sse.close();
    setTimeout(connectSSE, 3000);
  };
}

// Check presence
async function checkPresence() {
  const res = await fetch(`${API_BASE}/api/user/presence`, { headers: authHeaders() });
  const data = await res.json();
  presenceDiv.textContent = data.online ? "🟢 Online" : "⚫ Offline";
}

/* ===== EVENTS ===== */
sendBtn.onclick = sendMessage;
input.addEventListener("keypress", e => e.key === "Enter" && sendMessage());
attachInput.addEventListener("change", () => input.focus());

/* ===== INIT ===== */
// call openChat(room_id) when user selects a chat
