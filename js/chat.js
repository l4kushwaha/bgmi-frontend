(() => {
  const API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  /* ========= SESSION ========= */
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");
  if (!token || !user) return alert("Login required");

  const headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  };

  /* ========= DOM ========= */
  const chatList   = document.getElementById("chatList");
  const chatBox    = document.getElementById("chatBox");
  const chatHeader = document.getElementById("chatHeader");
  const waitingBox = document.getElementById("waitingBox");
  const msgInput   = document.getElementById("msgInput");
  const sendBtn    = document.getElementById("sendBtn");

  let activeRoom = null;
  let lastCount  = 0;

  /* ========= HELPERS ========= */
  function isSeller() {
    return user.role === "seller" || user.seller_id;
  }

  function saveLastRoom(id) {
    localStorage.setItem("last_room_id", id);
  }

  function getLastRoom() {
    return localStorage.getItem("last_room_id");
  }

  /* ========= LOAD SELLER REQUESTS ========= */
  async function loadSellerRequests() {
    const res = await fetch(API + "/api/chat/pending", { headers });
    const list = await res.json();

    chatList.innerHTML = "";

    if (!Array.isArray(list) || !list.length) {
      chatList.innerHTML = `<div class="center">No requests</div>`;
      return;
    }

    list.forEach(r => {
      const d = document.createElement("div");
      d.className = "chat-item";
      d.innerHTML = `
        <b>Order ${r.order_id}</b><br>
        <small>New request</small>
      `;
      d.onclick = () => openRoom(r.id);
      chatList.appendChild(d);
    });
  }

  /* ========= OPEN ROOM ========= */
  async function openRoom(roomId) {
    activeRoom = roomId;
    saveLastRoom(roomId);
    chatBox.innerHTML = "";
    waitingBox.style.display = "none";

    const res = await fetch(`${API}/api/chat/room?room_id=${roomId}`, { headers });
    if (!res.ok) {
      chatHeader.innerText = "Access denied";
      return;
    }

    const room = await res.json();
    chatHeader.innerText = `Order ${room.order_id}`;

    renderStatus(room);
    loadMessages();
  }

  /* ========= STATUS UI ========= */
  function renderStatus(room) {
    waitingBox.style.display = "none";

    if (room.status === "requested") {
      if (String(room.seller_user_id) === String(user.id)) {
        waitingBox.style.display = "block";
        waitingBox.innerHTML = `
          <b>New chat request</b><br><br>
          <button id="approveBtn">Approve</button>
          <button id="rejectBtn">Reject</button>
        `;
        document.getElementById("approveBtn").onclick = () => approve(true);
        document.getElementById("rejectBtn").onclick  = () => approve(false);
      } else {
        waitingBox.style.display = "block";
        waitingBox.innerText = "⏳ Waiting for seller approval";
      }
    }
  }

  /* ========= APPROVE ========= */
  async function approve(approve) {
    await fetch(API + "/api/chat/approve", {
      method: "POST",
      headers,
      body: JSON.stringify({ room_id: activeRoom, approve })
    });
    loadRoomAgain();
  }

  async function loadRoomAgain() {
    if (!activeRoom) return;
    openRoom(activeRoom);
  }

  /* ========= MESSAGES ========= */
  async function loadMessages() {
    if (!activeRoom) return;

    const res = await fetch(
      `${API}/api/chat/messages?room_id=${activeRoom}`,
      { headers }
    );
    const msgs = await res.json();
    if (!Array.isArray(msgs) || msgs.length === lastCount) return;
    lastCount = msgs.length;

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

  /* ========= SEND ========= */
  sendBtn.onclick = async () => {
    if (!activeRoom || !msgInput.value.trim()) return;

    await fetch(API + "/api/chat/send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        room_id: activeRoom,
        message: msgInput.value.trim()
      })
    });

    msgInput.value = "";
    loadMessages();
  };

  /* ========= INIT ========= */

  // 1️⃣ Seller dashboard
  if (isSeller()) {
    loadSellerRequests();
  }

  // 2️⃣ Buyer last chat
  const params = new URLSearchParams(location.search);
  const roomFromUrl = params.get("room_id");
  const lastRoom = getLastRoom();

  if (roomFromUrl) {
    openRoom(roomFromUrl);
  } else if (lastRoom) {
    openRoom(lastRoom);
  }

  // polling
  setInterval(() => {
    loadMessages();
    if (isSeller()) loadSellerRequests();
  }, 2500);
})();