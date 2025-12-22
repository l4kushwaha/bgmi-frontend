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
const chatBox    = document.getElementById("chatBox");
const input      = document.getElementById("messageInput");
const sendBtn    = document.getElementById("sendBtn");
const statusEl   = document.getElementById("chatStatus");
const waitingBox = document.getElementById("waitingBox");

/* ================= STATE ================= */
const room_id = new URLSearchParams(location.search).get("room_id");
let lastCount = 0;
let roomCache = null;

if (!room_id) {
  alert("Invalid room");
  return;
}

/* ================= HELPERS ================= */
function addMessage(text, mine){
  const div = document.createElement("div");
  div.className = `message ${mine ? "sent":"received"}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setWaiting(show, html=""){
  waitingBox.style.display = show ? "block":"none";
  waitingBox.innerHTML = html;
  input.disabled = show;
  sendBtn.disabled = show;
}

function canChat(room){
  if (room.intent === "chat")
    return room.status === "approved";

  if (room.intent === "buy")
    return room.status === "half_paid";

  return false;
}

/* ================= LOAD ROOM ================= */
async function loadRoom(){
  const r = await fetch(`${API}/api/chat/room?room_id=${room_id}`,{headers});
  if(!r.ok){
    statusEl.textContent="Access denied";
    setWaiting(true,"");
    return;
  }
  const room = await r.json();
  roomCache = room;
  renderStatus(room);
  if(canChat(room)) loadMessages();
}

/* ================= STATUS UI ================= */
function renderStatus(room){

  /* SELLER */
  if(user.id==room.seller_user_id && room.status==="requested"){
    statusEl.textContent = room.intent==="buy"
      ? "New BUY request"
      : "New CHAT request";

    setWaiting(true,`
      <button id="approveBtn">Approve</button>
      <button id="rejectBtn">Reject</button>
    `);

    approveBtn.onclick=()=>approve(true);
    rejectBtn.onclick=()=>approve(false);
    return;
  }

  /* BUYER WAITING */
  if(user.id==room.buyer_id && room.status==="requested"){
    statusEl.textContent="Waiting for seller approval";
    setWaiting(true);
    return;
  }

  /* BUY FLOW */
  if(room.intent==="buy" && room.status==="approved"){
    statusEl.textContent="Pay 50% to start chat";
    setWaiting(true,`<button id="halfPayBtn">Pay 50%</button>`);
    halfPayBtn.onclick=halfPay;
    return;
  }

  /* CHAT ACTIVE */
  if(canChat(room)){
    statusEl.textContent="Chat active";
    setWaiting(false);
    return;
  }

  /* CLOSED */
  if(room.status==="closed"){
    statusEl.textContent="Request closed";
    setWaiting(true,"Chat closed");
  }
}

/* ================= ACTIONS ================= */
async function approve(ok){
  await fetch(`${API}/api/chat/approve`,{
    method:"POST",
    headers,
    body:JSON.stringify({room_id,approve:ok})
  });
  loadRoom();
}

async function halfPay(){
  await fetch(`${API}/api/chat/half-payment`,{
    method:"POST",
    headers,
    body:JSON.stringify({room_id})
  });
  loadRoom();
}

/* ================= MESSAGES ================= */
async function loadMessages(){
  const r = await fetch(`${API}/api/chat/messages?room_id=${room_id}`,{headers});
  const msgs = await r.json();
  if(!Array.isArray(msgs) || msgs.length===lastCount) return;
  lastCount = msgs.length;
  chatBox.innerHTML="";
  msgs.forEach(m=>addMessage(m.message,m.sender_id==user.id));
}

async function sendMessage(){
  const text=input.value.trim();
  if(!text || !roomCache || !canChat(roomCache)) return;
  input.value="";
  await fetch(`${API}/api/chat/send`,{
    method:"POST",
    headers,
    body:JSON.stringify({
      room_id,
      message:text,
      type:"text",
      sensitive:false
    })
  });
  addMessage(text,true);
}

/* ================= EVENTS ================= */
sendBtn.onclick=sendMessage;
input.addEventListener("keydown",e=>e.key==="Enter"&&sendMessage());

/* ================= INIT ================= */
loadRoom();
setInterval(loadRoom,3000);

})();