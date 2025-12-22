(() => {
  const API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  /* ===== SESSION ===== */
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");
  if (!token || !user) return alert("Login required");

  const headers = {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  };

  /* ===== DOM ===== */
  const chatList   = document.getElementById("chatList");
  const chatBox    = document.getElementById("chatBox");
  const chatHeader = document.getElementById("chatHeader");
  const waitingBox = document.getElementById("waitingBox");
  const msgInput   = document.getElementById("msgInput");
  const sendBtn    = document.getElementById("sendBtn");
  const imgBtn     = document.getElementById("imageBtn");
  const imgInput   = document.getElementById("imgInput");

  let activeRoom = null;
  let lastCount = 0;

  /* ===== LOAD CHAT LIST ===== */
  async function loadChats() {
    const res = await fetch(API + "/api/chat/pending", { headers });
    const list = await res.json();

    chatList.innerHTML = "";
    if (!Array.isArray(list) || !list.length) {
      chatList.innerHTML = `<div class="center">No chats</div>`;
      return;
    }

    list.forEach(c => {
      const d = document.createElement("div");
      d.className = "chat-item";
      d.innerHTML = `
        <b>Order ${c.order_id}</b>
        ${c.status === "requested" ? `<span class="badge">NEW</span>` : ""}
        <br><small>${c.status}</small>
      `;
      d.onclick = () => openRoom(c.id);
      chatList.appendChild(d);
    });
  }

  /* ===== OPEN ROOM ===== */
  async function openRoom(roomId) {
    activeRoom = roomId;
    lastCount = 0;
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

  /* ===== STATUS ===== */
  function renderStatus(room) {
    waitingBox.style.display = "none";

    if (room.status === "requested") {
      if (String(room.seller_user_id) === String(user.id)) {
        waitingBox.style.display = "block";
        waitingBox.innerHTML = `
          <b>New request</b><br><br>
          <button onclick="approve(true)">Approve</button>
          <button onclick="approve(false)">Reject</button>
        `;
      } else {
        waitingBox.style.display = "block";
        waitingBox.innerText = "⏳ Waiting for seller approval";
      }
    }
  }

  /* ===== APPROVE ===== */
  window.approve = async approve => {
    await fetch(API + "/api/chat/approve", {
      method: "POST",
      headers,
      body: JSON.stringify({ room_id: activeRoom, approve })
    });
  };

  /* ===== LOAD MESSAGES ===== */
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
      const d = document.createElement("div");
      const mine = String(m.sender_id) === String(user.id);
      d.className = "msg " + (mine ? "sent" : "recv");

      if (m.type === "image") {
        d.innerHTML = `<img class="chat-img" src="${m.message}">`;
      } else {
        d.textContent = m.message;
      }
      chatBox.appendChild(d);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* ===== SEND MESSAGE ===== */
  async function sendMessage(type = "text", content = "") {
    if (!activeRoom) return;
    if (type === "text" && !msgInput.value.trim()) return;

    const payload = {
      room_id: activeRoom,
      type,
      message: type === "text" ? msgInput.value.trim() : content
    };

    msgInput.value = "";
    await fetch(API + "/api/chat/send", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });
    loadMessages();
  }

  sendBtn.onclick = () => sendMessage();
  msgInput.onkeydown = e => e.key === "Enter" && sendMessage();

  /* ===== IMAGE ===== */
  imgBtn.onclick = () => imgInput.click();
  imgInput.onchange = () => {
    const f = imgInput.files[0];
    const r = new FileReader();
    r.onload = () => sendMessage("image", r.result);
    r.readAsDataURL(f);
  };

  /* ===== POLLING ===== */
  setInterval(() => {
    loadChats();
    loadMessages();
  }, 2000);

  loadChats();
})();