(() => {
  const API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  /* ================= SESSION ================= */
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Please login first");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token
  };

  /* ================= DOM ================= */
  const chatListBox = document.getElementById("chatList");
  const searchInput = document.getElementById("searchChats");
  const chatBox     = document.getElementById("chatBox");
  const statusEl    = document.getElementById("chatStatus");
  const input       = document.getElementById("messageInput");
  const sendBtn     = document.getElementById("sendBtn");
  const waitingBox  = document.getElementById("waitingBox");

  /* ================= STATE ================= */
  let chats = [];
  let activeRoom = null;
  let lastMsgCount = 0;

  /* ================= ONLINE STATUS ================= */
  function onlineStatus() {
    return navigator.onLine ? "🟢 Online" : "🔴 Offline";
  }
  window.addEventListener("online", () => renderChatList());
  window.addEventListener("offline", () => renderChatList());

  /* ================= LOAD MY CHATS ================= */
  async function loadMyChats() {
    const res = await fetch(API + "/api/chat/my", { headers });
    chats = await res.json();
    renderChatList();
  }

  /* ================= RENDER CHAT LIST ================= */
  function renderChatList() {
    const q = searchInput.value.toLowerCase();

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

        const other =
          String(c.buyer_id) === String(user.id)
            ? "Seller"
            : "Buyer";

        const status =
          c.status === "requested" ? "⏳ Pending" :
          c.status === "approved"  ? "🟢 Active" :
          c.status === "half_paid" ? "💰 Half Paid" :
          c.status === "completed" ? "✅ Completed" : "";

        div.innerHTML = `
          <div class="chat-title">${other}</div>
          <div class="chat-preview">${c.last_message || "No messages yet"}</div>
          <div class="chat-meta">
            <span>${status}</span>
            <span>${onlineStatus()}</span>
          </div>
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
    lastMsgCount = 0;

    const res = await fetch(
      `${API}/api/chat/room?room_id=${room_id}`,
      { headers }
    );

    if (!res.ok) {
      statusEl.textContent = "Chat not accessible";
      return;
    }

    const room = await res.json();
    renderStatus(room);
    loadMessages();
    renderChatList();
  }

  /* ================= STATUS UI ================= */
  function renderStatus(room) {
    // SELLER – REQUEST
    if (
      String(room.seller_user_id) === String(user.id) &&
      room.status === "requested"
    ) {
      statusEl.textContent = "New request";
      waitingBox.innerHTML = `
        <button id="approveBtn">Accept</button>
        <button id="rejectBtn">Reject</button>
      `;
      document.getElementById("approveBtn").onclick = () => approve(true);
      document.getElementById("rejectBtn").onclick  = () => approve(false);
      disableInput(true);
      return;
    }

    // BUYER WAITING
    if (
      String(room.buyer_id) === String(user.id) &&
      room.status === "requested"
    ) {
      statusEl.textContent = "Waiting for seller approval";
      waitingBox.innerHTML = "⏳ Request sent";
      disableInput(true);
      return;
    }

    // ACTIVE CHAT
    if (room.status === "approved" || room.status === "half_paid") {
      statusEl.textContent = "Chat active";
      waitingBox.innerHTML = "";
      disableInput(false);
      return;
    }

    // COMPLETED
    if (room.status === "completed") {
      statusEl.textContent = "Chat closed";
      waitingBox.innerHTML = "Deal completed";
      disableInput(true);
    }
  }

  function disableInput(disabled) {
    input.disabled = disabled;
    sendBtn.disabled = disabled;
  }

  /* ================= APPROVE ================= */
  async function approve(approve) {
    await fetch(API + "/api/chat/approve", {
      method: "POST",
      headers,
      body: JSON.stringify({ room_id: activeRoom, approve })
    });
    openChat(activeRoom);
    loadMyChats();
  }

  /* ================= LOAD MESSAGES ================= */
  async function loadMessages() {
    if (!activeRoom) return;

    const res = await fetch(
      `${API}/api/chat/messages?room_id=${activeRoom}`,
      { headers }
    );
    const msgs = await res.json();

    if (!Array.isArray(msgs) || msgs.length === lastMsgCount) return;
    lastMsgCount = msgs.length;

    chatBox.innerHTML = "";
    msgs.forEach(m => {
      const div = document.createElement("div");
      div.className =
        "message " +
        (String(m.sender_id) === String(user.id) ? "sent" : "received");
      div.textContent = m.ciphertext || m.message;
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* ================= SEND MESSAGE ================= */
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || !activeRoom) return;

    input.value = "";

    await fetch(API + "/api/chat/send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        room_id: activeRoom,
        message: text,
        type: "text",
        sensitive: false
      })
    });

    loadMessages();
    loadMyChats();
  }

  /* ================= EVENTS ================= */
  sendBtn.onclick = sendMessage;
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });

  searchInput.addEventListener("input", renderChatList);

  /* ================= POLLING ================= */
  setInterval(() => {
    loadMyChats();
    loadMessages();
  }, 3000);

  /* ================= INIT ================= */
  statusEl.textContent = "Loading chats…";
  loadMyChats();
})();