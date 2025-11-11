// ===== BGMI Chat Frontend =====
// ✅ Uses Chat microservice via Cloudflare Gateway

const API_BASE = "https://bgmi_chat_service.bgmi-gateway.workers.dev/api";

// 🧩 Example users (replace later with logged-in IDs)
const sender_id = 1;    // logged-in user
const receiver_id = 2;  // chatting with this user

const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");
const statusDiv = document.getElementById("status");

// 🟢 Check service status
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (data.status === "running") {
      statusDiv.textContent = "✅ Chat service online";
      statusDiv.style.color = "#4caf50";
    } else {
      statusDiv.textContent = "⚠️ Service issue";
      statusDiv.style.color = "orange";
    }
  } catch {
    statusDiv.textContent = "❌ Chat service offline";
    statusDiv.style.color = "red";
  }
}

// 💬 Send message
async function sendMessage() {
  const content = msgInput.value.trim();
  if (!content) return;

  try {
    const res = await fetch(`${API_BASE}/chat/send`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ sender_id, receiver_id, content }),
    });
    const data = await res.json();
    if (data.success) {
      msgInput.value = "";
      loadConversation();
    }
  } catch (err) {
    console.error("Send Error:", err);
  }
}

// 📩 Load messages between two users
async function loadConversation() {
  try {
    const res = await fetch(`${API_BASE}/chat/conversation/${sender_id}/${receiver_id}`);
    const data = await res.json();

    messagesDiv.innerHTML = "";
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

// ♻️ Auto-refresh every 3 seconds
setInterval(loadConversation, 3000);

// 🚀 Initialize
checkHealth();
loadConversation();

// 🖱 Send button event
sendBtn.addEventListener("click", sendMessage);

// ⌨️ Enter key to send
msgInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage();
});
