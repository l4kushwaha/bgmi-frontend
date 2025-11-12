// =====================================================
// 💬 BGMI Chat Frontend (v2)
// =====================================================
// ✅ Uses Cloudflare Gateway API for Chat Microservice
// ✅ Supports user search, conversation view, send messages
// =====================================================

const API_BASE = "https://bgmi_chat_service.bgmi-gateway.workers.dev/api";

// 🧩 Example user IDs (replace later with real auth IDs)
const sender_id = 1;  // logged-in user
let receiver_id = null; // selected chat user

// 🌐 DOM Elements
const searchInput = document.getElementById("searchUser");
const searchBtn = document.getElementById("searchBtn");
const userList = document.getElementById("userList");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");
const statusDiv = document.getElementById("status");
const currentUserHeader = document.getElementById("currentUser");

// 🟢 1. Check Chat Service Health
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();

    if (data.status === "running") {
      statusDiv.textContent = "✅ Chat service online";
      statusDiv.style.color = "#4caf50";
    } else {
      statusDiv.textContent = "⚠️ Chat service issue";
      statusDiv.style.color = "orange";
    }
  } catch {
    statusDiv.textContent = "❌ Chat service offline";
    statusDiv.style.color = "red";
  }
}

// 🔍 2. Search users to start chat
async function searchUsers() {
  const q = searchInput.value.trim();
  if (!q) return;

  try {
    const res = await fetch(`${API_BASE}/chat/users/search?q=${encodeURIComponent(q)}`);
    const users = await res.json();

    userList.innerHTML = "";
    if (users.length === 0) {
      userList.innerHTML = "<p>No users found.</p>";
      return;
    }

    users.forEach(user => {
      const btn = document.createElement("button");
      btn.className = "user-btn";
      btn.textContent = user.username;
      btn.onclick = () => openConversation(user.id, user.username);
      userList.appendChild(btn);
    });
  } catch (err) {
    console.error("Search Error:", err);
  }
}

// 💬 3. Open chat with selected user
async function openConversation(id, username) {
  receiver_id = id;
  currentUserHeader.textContent = `Chatting with: ${username}`;
  messagesDiv.innerHTML = "<p class='chat-placeholder'>Loading conversation...</p>";
  await loadConversation();
}

// 📩 4. Load messages between sender and receiver
async function loadConversation() {
  if (!receiver_id) return;

  try {
    const res = await fetch(`${API_BASE}/chat/conversation/${sender_id}/${receiver_id}`);
    const data = await res.json();

    messagesDiv.innerHTML = "";
    if (data.length === 0) {
      messagesDiv.innerHTML = "<p class='chat-placeholder'>Start chatting 👋</p>";
      return;
    }

    data.forEach(msg => {
      const div = document.createElement("div");
      div.className = "message " + (msg.sender_id == sender_id ? "sent" : "received");
      div.textContent = msg.content;
      messagesDiv.appendChild(div);
    });

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  } catch (err) {
    console.error("Load Error:", err);
  }
}

// 📨 5. Send message
async function sendMessage() {
  const content = msgInput.value.trim();
  if (!content || !receiver_id) return;

  try {
    const res = await fetch(`${API_BASE}/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_id, receiver_id, content }),
    });

    const data = await res.json();
    if (data.success) {
      msgInput.value = "";
      await loadConversation();
    }
  } catch (err) {
    console.error("Send Error:", err);
  }
}

// ♻️ 6. Auto-refresh chat every 3 seconds
setInterval(() => {
  if (receiver_id) loadConversation();
}, 3000);

// 🚀 7. Initialize
checkHealth();

// 🎯 Event Listeners
sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", e => e.key === "Enter" && sendMessage());
searchBtn.addEventListener("click", searchUsers);
searchInput.addEventListener("keypress", e => e.key === "Enter" && searchUsers());
