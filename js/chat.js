(() => {
  const CHAT_API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Please login first");
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const room_id = params.get("room_id");

  if (!room_id) {
    alert("Invalid chat room");
    return;
  }

  const chatBox = document.getElementById("chatBox");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const statusEl = document.getElementById("chatStatus");
  const waitingBox = document.getElementById("waitingBox");

  if (!chatBox || !input || !sendBtn) return;

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  }

  function addMessage(msg, mine) {
    const div = document.createElement("div");
    div.className = `message ${mine ? "sent" : "received"}`;

    let html = `<span>${msg.message}</span>`;

    if (msg.type === "image" && msg.message.startsWith("http")) {
      html = `<img src="${msg.message}" class="chat-image">`;
    }

    div.innerHTML = html;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  async function fetchMessages() {
    const res = await fetch(
      `${CHAT_API}/api/chat/messages?room_id=${room_id}`,
      { headers: headers() }
    );

    if (!res.ok) return;

    const data = await res.json();
    chatBox.innerHTML = "";

    data.forEach(m => {
      addMessage(m, m.sender_id === user.id);
    });
  }

  async function checkRoomStatus() {
    const res = await fetch(
      `${CHAT_API}/api/chat/messages?room_id=${room_id}`,
      { headers: headers() }
    );

    if (!res.ok) return;

    statusEl.textContent = "Connected";
    waitingBox.style.display = "none";
    sendBtn.disabled = false;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    sendBtn.disabled = true;

    const payload = {
      room_id,
      message: text,
      type: text.startsWith("http") ? "image" : "text",
      sensitive: false
    };

    const res = await fetch(`${CHAT_API}/api/chat/send`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      addMessage({ message: text, type: payload.type }, true);
    }

    sendBtn.disabled = false;
  }

  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });

  statusEl.textContent = "Loading...";
  sendBtn.disabled = true;
  waitingBox.style.display = "block";

  fetchMessages();
  checkRoomStatus();

  setInterval(fetchMessages, 3000);
})();