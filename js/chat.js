(() => {

  const CHAT_API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";



  /* ================= SESSION ================= */

  const token = localStorage.getItem("token");

  const user  = JSON.parse(localStorage.getItem("user") || "null");



  if (!token || !user) {

    alert("Please login first");

    return;

  }



  const headers = {

    "Content-Type": "application/json",

    "Authorization": "Bearer " + token

  };



  /* ================= DOM ================= */

  const chatBox    = document.getElementById("chatBox");

  const input      = document.getElementById("messageInput");

  const sendBtn    = document.getElementById("sendBtn");

  const statusEl   = document.getElementById("chatStatus");

  const waitingBox = document.getElementById("waitingBox");



  /* ================= STATE ================= */

  const params  = new URLSearchParams(location.search);

  const room_id = params.get("room_id");



  let currentStatus = null;

  let lastMsgCount  = 0;



  if (!room_id) {

    alert("Invalid chat room");

    return;

  }



  /* ================= UI HELPERS ================= */

  function setWaiting(show, html = "") {

    waitingBox.style.display = show ? "block" : "none";

    waitingBox.innerHTML = html || "";

    input.disabled = show;

    sendBtn.disabled = show;

  }



  function addMessage(msg, mine) {

    const div = document.createElement("div");

    div.className = `message ${mine ? "sent" : "received"}`;

    div.innerHTML = `<span>${msg.message}</span>`;

    chatBox.appendChild(div);

    chatBox.scrollTop = chatBox.scrollHeight;

  }



  /* ================= LOAD ROOM ================= */

  async function loadRoom() {

    const res = await fetch(

      `${CHAT_API}/api/chat/room?room_id=${room_id}`,

      { headers }

    );



    if (!res.ok) {

      statusEl.textContent = "Chat not available";

      setWaiting(true, "Access denied");

      return;

    }



    const room = await res.json();



    if (room.status !== currentStatus) {

      currentStatus = room.status;

      renderStatus(room);

    }



    if (["approved", "half_paid", "completed"].includes(room.status)) {

      loadMessages();

    }

  }



  /* ================= STATUS UI ================= */

  function renderStatus(room) {



    // SELLER VIEW (REQUESTED)

    if (user.id === room.seller_id && room.status === "requested") {

      statusEl.textContent = "New chat request";

      setWaiting(true, `

        <b>Buyer sent request</b><br><br>

        <button id="approveBtn">Approve</button>

        <button id="rejectBtn">Reject</button>

      `);



      document.getElementById("approveBtn").onclick = () => approve(true);

      document.getElementById("rejectBtn").onclick  = () => approve(false);

      return;

    }



    // BUYER WAITING

    if (user.id === room.buyer_id && room.status === "requested") {

      statusEl.textContent = "⏳ Waiting for seller approval";

      setWaiting(true);

      return;

    }



    // CHAT ACTIVE

    if (room.status === "approved") {

      statusEl.textContent = "🟢 Chat active";

      setWaiting(false);

      return;

    }



    // HALF PAID

    if (room.status === "half_paid") {

      statusEl.textContent = "💰 Half payment completed";

      setWaiting(false);

      return;

    }



    // COMPLETED

    if (room.status === "completed") {

      statusEl.textContent = "✅ Deal completed";

      setWaiting(true, "Chat closed");

      return;

    }

  }



  /* ================= APPROVE / REJECT ================= */

  async function approve(approve) {

    await fetch(`${CHAT_API}/api/chat/approve`, {

      method: "POST",

      headers,

      body: JSON.stringify({ room_id, approve })

    });

    loadRoom();

  }



  /* ================= LOAD MESSAGES ================= */

  async function loadMessages() {

    const res = await fetch(

      `${CHAT_API}/api/chat/messages?room_id=${room_id}`,

      { headers }

    );

    const msgs = await res.json();



    if (!Array.isArray(msgs) || msgs.length === lastMsgCount) return;

    lastMsgCount = msgs.length;



    chatBox.innerHTML = "";

    msgs.forEach(m =>

      addMessage(m, String(m.sender_id) === String(user.id))

    );

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

  setInterval(loadRoom, 3000);



  /* ================= EVENTS ================= */

  sendBtn.onclick = sendMessage;

  input.addEventListener("keydown", e => {

    if (e.key === "Enter") sendMessage();

  });



  /* ================= INIT ================= */

  statusEl.textContent = "Connecting…";

  loadRoom();

})();