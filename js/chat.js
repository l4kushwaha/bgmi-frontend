(() => {
  const API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  /* ================= SESSION ================= */
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Login required");
    location.href = "/login";
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token
  };

  /* ================= DOM ================= */
  const chatListBox = document.getElementById("chatList");
  const chatBox = document.getElementById("chatBox");
  const chatStatus = document.getElementById("chatStatus");
  const waitingBox = document.getElementById("waitingBox");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const imgBtn = document.getElementById("imgBtn");
  const imgInput = document.getElementById("imageInput");
  const search = document.getElementById("searchChats");
  const sound = document.getElementById("notifySound");
  const onlineStatus = document.getElementById("onlineStatus");

  function disable(d) {
  input.disabled = d;
  sendBtn.disabled = d;
  imgBtn.disabled = d;
}


  /* ================= STATE ================= */
  let chats = [];
  let activeRoom = null;
  let lastCount = 0;
  let canSend = false;

  /* ================= SAFE FETCH ================= */
  async function safeFetch(url, options = {}) {
    const r = await fetch(url, options);

    if (r.status === 401) {
      alert("Session expired. Please login again.");
      localStorage.clear();
      location.href = "/login";
      throw new Error("unauthorized");
    }

    return r;
  }

  /* ================= ONLINE STATUS ================= */
  function updateOnline() {
    onlineStatus.textContent = navigator.onLine ? "🟢 Online" : "🔴 Offline";
  }
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  /* ================= LOAD MY CHATS ================= */
  async function loadMyChats() {
    const r = await safeFetch(API + "/api/chat/my", { headers });
    chats = await r.json();
    renderChatList();
  }

  /* ================= RENDER CHAT LIST ================= */
  function renderChatList() {
    const q = search.value.toLowerCase();
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
        div.innerHTML = `
          <div class="chat-title">Order: ${c.order_id}</div>
          <div class="chat-preview">${c.last_message || "No messages"}</div>
          <div class="chat-meta">${c.status}</div>
        `;
        div.onclick = () => openChat(c.id);
        chatListBox.appendChild(div);
      });
  }

  /* ================= OPEN CHAT ================= */
  async function openChat(room_id) {
    activeRoom = room_id;
    lastCount = 0;
    chatBox.innerHTML = "";
    waitingBox.innerHTML = "";
    canSend = false;

    const r = await safeFetch(`${API}/api/chat/room?room_id=${room_id}`, { headers });
    const room = await r.json();

    renderStatus(room);
    await loadMessages();
    renderChatList();
  }

  /* ================= STATUS UI ================= */
 function renderStatus(room) {
  waitingBox.innerHTML = "";
  canSend = false;

  const buyBox = document.getElementById("buyBox");
  const isBuyer = String(room.buyer_id) === String(user.id);
  const isSeller = String(room.seller_user_id) === String(user.id);

  // REQUESTED
  if (room.status === "requested") {
    if (isSeller) {
      chatStatus.textContent = "New request";
      waitingBox.innerHTML = `
        <button onclick="approve(true)">Accept</button>
        <button onclick="approve(false)">Reject</button>
      `;
    } else {
      chatStatus.textContent = "Waiting for seller approval";
      waitingBox.textContent = "⏳ Request sent";
    }
    buyBox.style.display = "none";
    disable(true);
    return;
  }

  // APPROVED
  if (room.status === "approved") {
    chatStatus.textContent = "Chat active";
    canSend = true;
    disable(false);

    // ✅ ONLY BUYER sees Pay 50%
    if (room.intent === "buy" && isBuyer) {
      buyBox.style.display = "block";
    } else {
      buyBox.style.display = "none";
    }
    return;
  }

  // HALF PAID
  if (room.status === "half_paid") {
    chatStatus.textContent = "Half payment done";
    canSend = true;
    disable(false);
    buyBox.style.display = "none";
    return;
  }

  // CLOSED
  chatStatus.textContent = "Chat closed";
  buyBox.style.display = "none";
  disable(true);
}

  /* ================= APPROVE ================= */
  window.approve = async function(ok) {
    await safeFetch(API + "/api/chat/approve", {
      method: "POST",
      headers,
      body: JSON.stringify({ room_id: activeRoom, approve: ok })
    });
    await loadMyChats();
    await openChat(activeRoom);
  };

  /* ================= LOAD MESSAGES ================= */
  async function loadMessages() {
    if (!activeRoom) return;

    const r = await safeFetch(`${API}/api/chat/messages?room_id=${activeRoom}`, { headers });
    const msgs = await r.json();
    if (!Array.isArray(msgs)) return;

    if (lastCount > 0 && msgs.length > lastCount) {
      sound.play();
    }

    lastCount = msgs.length;
    chatBox.innerHTML = "";

    msgs.forEach(m => {
      const div = document.createElement("div");
      div.className = "message " +
        (String(m.sender_id) === String(user.id) ? "sent" : "received");

      if (m.type === "image") {
        const img = document.createElement("img");
        img.src = m.ciphertext;
        img.className = "chat-image";
        div.appendChild(img);
      } else {
        div.textContent = m.ciphertext;
      }

      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  }

  /* ================= SEND MESSAGE ================= */
  async function sendMessage(msg, type = "text") {
    if (!activeRoom || !msg || !canSend) return;

    const r = await safeFetch(API + "/api/chat/send", {
      method: "POST",
      headers,
      body: JSON.stringify({
        room_id: activeRoom,
        message: msg,
        type,
        sensitive: false
      })
    });

    if (!r.ok) {
      const e = await r.json();
      alert(e.error || "Message failed");
      return;
    }

    input.value = "";
    await loadMessages();
    await loadMyChats();
  }


  document.getElementById("halfPayBtn").onclick = async () => {
  if (!activeRoom) return;

  await fetch(
    "https://bgmi_chat_service.bgmi-gateway.workers.dev/api/chat/half-payment",
    {
      method: "POST",
      headers,
      body: JSON.stringify({ room_id: activeRoom })
    }
  );

  alert("Half payment done");
  openChat(activeRoom);
};


  /* ================= EVENTS ================= */
  sendBtn.onclick = () => sendMessage(input.value.trim());

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") sendBtn.onclick();
  });

  imgBtn.onclick = () => imgInput.click();

  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large (max 2MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => sendMessage(reader.result, "image");
    reader.readAsDataURL(file);
  };

  search.oninput = renderChatList;

  /* ================= POLLING ================= */
  setInterval(() => {
    loadMyChats();
    if (activeRoom) loadMessages();
  }, 3000);

  /* ================= INIT ================= */
  loadMyChats();
})();
