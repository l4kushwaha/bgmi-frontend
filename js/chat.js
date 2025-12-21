(() => {
  const CHAT_API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  /* ================= SESSION ================= */
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Please login first");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  /* ================= DOM ================= */
  const chatBox = document.getElementById("chatBox");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const statusEl = document.getElementById("chatStatus");
  const waitingBox = document.getElementById("waitingBox");

  /* ================= STATE ================= */
  const params = new URLSearchParams(location.search);
  const room_id = params.get("room_id");

  let chatStatus = "requested"; // requested | approved | half_paid | completed
  let pollTimer = null;

  if (!room_id) {
    alert("Invalid chat room");
    return;
  }

  /* ================= UI ================= */
  function addMessage(msg, mine) {
    const div = document.createElement("div");
    div.className = `message ${mine ? "sent" : "received"}`;

    let html = `<span>${msg.message}</span>`;

    if (msg.attachments?.length) {
      html += msg.attachments
        .map(
          a =>
            `<div class="attachments">
              <img class="chat-image" src="${a.file_url}">
            </div>`
        )
        .join("");
    }

    div.innerHTML = html;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function setWaiting(on) {
    waitingBox.style.display = on ? "block" : "none";
    input.disabled = on;
    sendBtn.disabled = on;
  }

  /* ================= LOAD MESSAGES ================= */
  async function loadMessages() {
    const res = await fetch(
      `${CHAT_API}/api/chat/messages?room_id=${room_id}`,
      { headers }
    );
    const data = await res.json();

    chatBox.innerHTML = "";
    data.forEach(m =>
      addMessage(m, m.sender_id === user.id)
    );
  }

  /* ================= CHECK ROOM STATUS ================= */
  async function checkRoom() {
    const res = await fetch(
      `${CHAT_API}/api/chat/messages?room_id=${room_id}`,
      { headers }
    );

    if (!res.ok) return;

    // status is inferred from DB (simplified)
    if (chatStatus === "requested") {
      statusEl.textContent = "⏳ Waiting for seller approval…";
      setWaiting(true);
    }

    if (chatStatus === "approved") {
      statusEl.textContent = "🟢 Chat active";
      setWaiting(false);
    }
  }

  /* ================= SEND MESSAGE ================= */
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";

    await fetch(`${CHAT_API}/api/chat/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        room_id,
        message: text,
        type: "text",
        sensitive: false
      })
    });

    addMessage({ message: text }, true);
  }

  /* ================= POLLING ================= */
  function startPolling() {
    loadMessages();
    checkRoom();

    pollTimer = setInterval(() => {
      loadMessages();
      checkRoom();
    }, 2500);
  }

  /* ================= EVENTS ================= */
  sendBtn.onclick = sendMessage;
  input.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  /* ================= INIT ================= */
  statusEl.textContent = "Connecting…";
  startPolling();
})();