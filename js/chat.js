(() => {
  /* ================= CONFIG ================= */
  const API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  /* ================= SESSION ================= */
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Please login first");
    return;
  }

  const headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  };

  /* ================= DOM ================= */
  const chatList   = document.getElementById("chatList");
  const chatBox    = document.getElementById("chatBox");
  const chatHeader = document.getElementById("chatHeader");
  const msgInput   = document.getElementById("msgInput");
  const sendBtn    = document.getElementById("sendBtn");
  const typingEl   = document.getElementById("typing");

  /* ================= STATE ================= */
  let currentRoom = null;
  let currentStatus = null;
  let lastMsgCount = 0;

  /* ======================================================
     LOAD SELLER DASHBOARD / CHAT LIST
     ====================================================== */
  async function loadChatList() {
    chatList.innerHTML = "";

    const res = await fetch(API + "/api/chat/pending", { headers });
    const rooms = await res.json();

    rooms.forEach(r => {
      const div = document.createElement("div");
      div.className = "chat-item";
      div.innerHTML = `
        <div class="chat-title">Order ${r.order_id}</div>
        <div class="chat-last">Request pending</div>
        <span class="badge">NEW</span>
      `;
      div.onclick = () => openRoom(r.id);
      chatList.appendChild(div);
    });
  }

  /* ======================================================
     OPEN CHAT ROOM
     ====================================================== */
  async function openRoom(roomId) {
    currentRoom = roomId;
    chatBox.innerHTML = "";
    lastMsgCount = 0;

    const res = await fetch(
      API + "/api/chat/room?room_id=" + roomId,
      { headers }
    );

    if (!res.ok) {
      chatHeader.innerText = "Access denied";
      return;
    }

    const room = await res.json();
    currentStatus = room.status;

    renderStatus(room);
    loadMessages();
  }

  /* ======================================================
     STATUS UI
     ====================================================== */
  function renderStatus(room) {
    chatHeader.innerText = "Order " + room.order_id;

    /* SELLER – REQUESTED */
    if (
      String(room.seller_user_id) === String(user.id) &&
      room.status === "requested"
    ) {
      chatHeader.innerHTML += " • New Request";

      chatBox.innerHTML = `
        <div style="padding:12px">
          <b>Buyer sent a request</b><br><br>
          <button id="approveBtn">Approve</button>
          <button id="rejectBtn">Reject</button>
        </div>
      `;

      document.getElementById("approveBtn").onclick =
        () => approveRoom(true);
      document.getElementById("rejectBtn").onclick =
        () => approveRoom(false);

      return;
    }

    /* BUYER – WAITING */
    if (
      String(room.buyer_id) === String(user.id) &&
      room.status === "requested"
    ) {
      chatHeader.innerHTML += " • Waiting for seller approval";
      return;
    }

    /* CHAT ACTIVE */
    if (room.status === "approved") {
      chatHeader.innerHTML += " • Chat active";
    }

    /* HALF PAID */
    if (room.status === "half_paid") {
      chatHeader.innerHTML += " • Half payment done";
    }

    /* COMPLETED */
    if (room.status === "completed") {
      chatHeader.innerHTML += " • Completed";
    }
  }

  /* ======================================================
     APPROVE / REJECT
     ====================================================== */
  async function approveRoom(approve) {
    await fetch(API + "/api/chat/approve", {
      method: "POST",
      headers,
      body: JSON.stringify({
        room_id: currentRoom,
        approve
      })
    });
    openRoom(currentRoom);
  }

  /* ======================================================
     LOAD MESSAGES
     ====================================================== */
  async function loadMessages() {
    if (!currentRoom) return;

    const res = await fetch(
      API + "/api/chat/messages?room_id=" + currentRoom,
      { headers }
    );
    const msgs = await res.json();

    if (!Array.isArray(msgs) || msgs.length === lastMsgCount) return;
    lastMsgCount = msgs.length;

    chatBox.innerHTML = "";
    msgs.forEach(m => {
      const div = document.createElement("div");
      div.className =
        "msg " + (String(m.sender_id) === String(user.id) ? "sent" : "recv");
      div.textContent = m.message;
      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* ======================================================
     SEND MESSAGE
     ====================================================== */
  async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || !currentRoom) return;

    msgInput.value = "";

    await fetch(API + "/api/chat/send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        room_id: currentRoom,
        message: text,
        type: "text",
        sensitive: false
      })
    });

    loadMessages();
  }

  /* ======================================================
     TYPING INDICATOR (UI ONLY)
     ====================================================== */
  let typingTimer;
  msgInput.oninput = () => {
    typingEl.innerText = "typing…";
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      typingEl.innerText = "";
    }, 700);
  };

  /* ======================================================
     EVENTS
     ====================================================== */
  sendBtn.onclick = sendMessage;
  msgInput.addEventListener("keydown", e => {
    if (e.key === "Enter") sendMessage();
  });

  /* ======================================================
     POLLING
     ====================================================== */
  setInterval(() => {
    if (currentRoom) {
      loadMessages();
    } else {
      loadChatList();
    }
  }, 2000);

  /* ================= INIT ================= */
  loadChatList();
})();