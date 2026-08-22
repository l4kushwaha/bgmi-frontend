(() => {
  const API = "https://bgmi_chat_service.bgmi-gateway.workers.dev";

  /* ================= SESSION ================= */
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Login required");
    location.href = "login.html";
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token
  };

  const MY_NAME = (user.name || user.username || "").slice(0, 30)
    || String(user.email || user.id).split("@")[0]
    || ("User#" + user.id);

  /* ================= DOM ================= */
  const chatListBox = document.getElementById("chatList");
  const chatBox = document.getElementById("chatBox");
  const globalBox = document.getElementById("globalBox");
  const gEmpty = document.getElementById("gEmpty");
  const privateBox = document.getElementById("privateBox");
  const chatStatus = document.getElementById("chatStatus");
  const waitingBox = document.getElementById("waitingBox");
  const input = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const imgBtn = document.getElementById("imgBtn");
  const imgInput = document.getElementById("imageInput");
  const search = document.getElementById("searchChats");
  const sound = document.getElementById("notifySound");
  const onlineStatus = document.getElementById("onlineStatus");
  const pillsBox = document.getElementById("pillsBox");
  const tabGlobal = document.getElementById("tabGlobal");
  const tabChats = document.getElementById("tabChats");
  const exitPrivate = document.getElementById("exitPrivate");
  const micBtn = document.getElementById("micBtn");
  const effBtn = document.getElementById("effBtn");
  const effectsPop = document.getElementById("effectsPop");
  const callAudioBtn = document.getElementById("callAudioBtn");
  const callVideoBtn = document.getElementById("callVideoBtn");
  const callOverlay = document.getElementById("callOverlay");
  const callAvatar = document.getElementById("callAvatar");
  const callName = document.getElementById("callName");
  const callState = document.getElementById("callState");
  const callAcceptBtn = document.getElementById("callAcceptBtn");
  const callDeclineBtn = document.getElementById("callDeclineBtn");
  const callEndBtn = document.getElementById("callEndBtn");
  const remoteVideo = document.getElementById("callVideoRemote");
  const localVideo = document.getElementById("callVideoLocal");

  /* ================= STATE ================= */
  let chats = [];
  
/* ================= E2E ENCRYPTION (private rooms) ================= */
const E2E_SALT = "BGMIMKT::e2e::v1::";
let _e2eKeys = {};
async function e2eKey(room){
  if(_e2eKeys[room]) return _e2eKeys[room];
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(E2E_SALT + room));
  const k = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt","decrypt"]);
  _e2eKeys[room] = k; return k;
}
async function e2eEnc(room,text){
  try{
    const k = await e2eKey(room);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({name:"AES-GCM",iv},k,new TextEncoder().encode(text));
    const b = new Uint8Array(iv.length + ct.byteLength);
    b.set(iv); b.set(new Uint8Array(ct), iv.length);
    let s="";for(let i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);
    return "enc1:"+btoa(s);
  }catch(e){ throw new Error("e2e_encrypt_failed"); }
}
async function e2eDec(room,t){
  try{
    if(!t || t.indexOf("enc1:")!==0) return t;
    const bin = atob(t.slice(5));
    const b = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);
    const k = await e2eKey(room);
    const pt = await crypto.subtle.decrypt({name:"AES-GCM",iv:b.slice(0,12)},k,b.slice(12));
    return new TextDecoder().decode(pt);
  }catch(e){ return "\ud83d\udd10 [encrypted]"; }
}
let activeRoom = null;
  let lastCount = 0;
  let canSend = false;
  let mode = "global";           // global | chats
  let channel = "bgmi";
  let lastGlobal = 0;
  let selectedEffect = "";
  let recState = { active: false, mediaRecorder: null, chunks: [], start: 0, timer: null };

  /* ===== CALL STATE ===== */
  const callStateMachine = {
    active: false,          // in a call (ringing/connected)
    roomId: null,
    callId: null,
    kind: "audio",
    peer: null,             // RTCPeerConnection
    localStream: null,
    remoteStream: null,
    pollTimer: null,
    eventSeq: 0,
    initiator: false,
    gotOffer: false,
    myOffer: null
  };

  const CHANNELS = [
    { id: "bgmi", label: "🎯 BGMI" },
    { id: "free_fire", label: "🔥 Free Fire" },
    { id: "general", label: "💬 General" }
  ];

  /* ================= SAFE FETCH ================= */
  let _refreshing = false;
  async function tryRefresh() {
    if (_refreshing) return false;
    _refreshing = true;
    try {
      const rt = localStorage.getItem("refresh_token");
      if (!rt) return false;
      const r = await fetch("https://auth-service.bgmi-gateway.workers.dev/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt })
      });
      if (!r.ok) return false;
      const d = await r.json();
      if (d.access_token) {
        localStorage.setItem("token", d.access_token);
        localStorage.setItem("access_token", d.access_token);
        if (d.refresh_token) localStorage.setItem("refresh_token", d.refresh_token);
        return true;
      }
      return false;
    } catch { return false; } finally { _refreshing = false; }
  }
  async function safeFetch(url, options = {}) {
    const opt = { ...options };
    if (opt.headers && opt.headers.Authorization) {
      opt.headers = { ...opt.headers, Authorization: "Bearer " + (localStorage.getItem("access_token") || localStorage.getItem("token")) };
    }
    let r = await fetch(url, opt);
    if (r.status === 401) {
      const ok = await tryRefresh();
      if (ok) {
        if (opt.headers && opt.headers.Authorization) {
          opt.headers = { ...opt.headers, Authorization: "Bearer " + localStorage.getItem("access_token") };
        }
        r = await fetch(url, opt);
      }
      if (r.status === 401) {
        alert("Session expired. Please login again.");
        localStorage.clear();
        location.href = "login.html";
        throw new Error("unauthorized");
      }
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

  /* ================= ESCAPE ================= */
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  function timeStr(iso) {
    try { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  }

  function effectClass(e) {
    return e ? (" fx-" + e) : "";
  }

  /* ================= TAB SWITCHING ================= */
  function setMode(m) {
    mode = m;
    tabGlobal.classList.toggle("active", m === "global");
    tabChats.classList.toggle("active", m === "chats");

    if (m === "global") {
      globalBox.classList.add("open");
      privateBox.style.display = "none";
      search.style.display = "none";
      pillsBox.style.display = "block";
      imgBtn.style.display = "none";
      input.disabled = false;
      sendBtn.disabled = false;
      micBtn.disabled = false;
      loadGlobal();
    } else {
      globalBox.classList.remove("open");
      privateBox.style.display = "flex";
      search.style.display = "block";
      pillsBox.style.display = "none";
      imgBtn.style.display = "block";
      input.disabled = true;
      sendBtn.disabled = true;
      micBtn.disabled = true;
      loadMyChats();
      if (activeRoom) openChat(activeRoom);
    }
  }
  tabGlobal.onclick = () => setMode("global");
  tabChats.onclick = () => setMode("chats");
  exitPrivate.onclick = () => { activeRoom = null; chatBox.innerHTML = ""; waitingBox.innerHTML = ""; chatStatus.textContent = "Select a chat"; callAudioBtn.style.display = "none"; callVideoBtn.style.display = "none"; renderChatList(); };

  /* incoming call watcher: jab koi active room me callee hai to call detect karo */
  let incomingWatcher = null;
  function startIncomingWatcher() {
    stopIncomingWatcher();
    incomingWatcher = setInterval(async () => {
      if (!activeRoom || callStateMachine.active) return;
      try {
        const r = await safeFetch(API + `/api/chat/call/poll?room_id=${activeRoom}&since=0`, { headers });
        const d = await r.json();
        if (d.call && d.call.status === "ringing" && String(d.call.callee_id) === String(user.id)) {
          handleIncoming(d.call);
        }
      } catch {}
    }, 2500);
  }
  function stopIncomingWatcher() { if (incomingWatcher) { clearInterval(incomingWatcher); incomingWatcher = null; } }

  /* ================= CHANNEL PILLS ================= */
  function renderPills() {
    pillsBox.innerHTML = "";
    CHANNELS.forEach(c => {
      const p = document.createElement("span");
      p.className = "ch-pill" + (c.id === channel ? " active" : "");
      p.textContent = c.label;
      p.onclick = () => { channel = c.id; renderPills(); loadGlobal(); };
      pillsBox.appendChild(p);
    });
  }
  renderPills();

  /* ================= INPUT ENABLE ================= */
  function setInputEnabled(d) {
    if (mode === "global") {
      input.disabled = false;
      sendBtn.disabled = false;
      micBtn.disabled = false;
    } else if (mode === "chats") {
      input.disabled = !d;
      sendBtn.disabled = !d;
      micBtn.disabled = !d;
      imgBtn.disabled = !d;
    }
  }

  /* ================= GLOBAL CHAT ================= */
  async function loadGlobal() {
    const r = await safeFetch(`${API}/api/chat/global/messages?channel=${channel}&limit=50`, { headers });
    const msgs = await r.json();
    if (!Array.isArray(msgs)) return;

    if (lastGlobal > 0 && msgs.length > lastGlobal) sound.play();
    lastGlobal = msgs.length;

    globalBox.innerHTML = "";
    gEmpty.style.display = "none";
    if (!msgs.length) {
      globalBox.appendChild(gEmpty);
      gEmpty.style.display = "block";
      return;
    }

    msgs.forEach(m => {
      globalBox.appendChild(renderGlobalMsg(m));
    });
    globalBox.scrollTop = globalBox.scrollHeight;
  }

  function renderGlobalMsg(m) {
    const div = document.createElement("div");
    const mine = String(m.sender_id) === String(user.id);
    div.className = "g-msg" + (mine ? " mine" : "");

    const avatar = document.createElement("div");
    avatar.className = "g-avatar";
    avatar.textContent = (m.username || "?").charAt(0);

    const body = document.createElement("div");
    body.className = "g-body";

    const meta = document.createElement("div");
    meta.innerHTML = `<span class="g-name">${esc(m.username || "User")}</span><span class="g-time">${timeStr(m.created_at)}</span>`;

    if (m.type === "voice" && m.media) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = API + "/api/chat/media/" + m.media;
      audio.style.maxWidth = "220px";
      body.appendChild(meta);
      body.appendChild(audio);
    } else {
      const txt = document.createElement("div");
      txt.className = "g-text" + effectClass(m.effect);
      if (m.effect === "glitch") txt.setAttribute("data-text", m.message || "");
      txt.textContent = m.message || "";
      body.appendChild(meta);
      body.appendChild(txt);
    }

    div.appendChild(avatar);
    div.appendChild(body);
    return div;
  }

  async function sendGlobal() {
    const msg = input.value.trim();
    const payload = {
      channel,
      message: msg,
      effect: selectedEffect || undefined
    };
    if (!msg && !recState.chunks.length) return;

    const r = await safeFetch(API + "/api/chat/global/send", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const e = await r.json();
      alert(e.error || "Message failed" + (e.wait ? " (wait " + e.wait + "s)" : ""));
      return;
    }
    input.value = "";
    lastGlobal = 0;
    await loadGlobal();
  }

  /* ================= LOAD MY CHATS ================= */
  async function loadMyChats() {
    const r = await safeFetch(API + "/api/chat/my", { headers });
    chats = await r.json();
    renderChatList();
  }

  /* ================= RENDER CHAT LIST ================= */
  function renderChatList() {
    const q = (search.value || "").toLowerCase();
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
          <div class="chat-title">Order: ${esc(c.order_id)}</div>
          <div class="chat-preview">${esc(c.last_message || "No messages")}</div>
          <div class="chat-meta">${esc(c.status)}</div>
        `;
        div.onclick = () => { setMode("chats"); openChat(c.id); };
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
    exitPrivate.style.display = "inline-block";
    startIncomingWatcher();

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
    setInputEnabled(false);

    const buyBox = document.getElementById("buyBox");
    const isBuyer = String(room.buyer_id) === String(user.id);
    const isSeller = String(room.seller_user_id) === String(user.id);
    const callable = room.status === "approved" || room.status === "half_paid";

    callAudioBtn.style.display = callable ? "block" : "none";
    callVideoBtn.style.display = callable ? "block" : "none";

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
      return;
    }

    if (room.status === "approved") {
      chatStatus.textContent = "Chat active";
      canSend = true;
      setInputEnabled(true);
      if (room.intent === "buy" && isBuyer) {
        buyBox.style.display = "block";
      } else {
        buyBox.style.display = "none";
      }
      return;
    }

    if (room.status === "half_paid") {
      chatStatus.textContent = "Half payment done";
      canSend = true;
      setInputEnabled(true);
      buyBox.style.display = "none";
      return;
    }

    chatStatus.textContent = "Chat closed";
    buyBox.style.display = "none";
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

    if (lastCount > 0 && msgs.length > lastCount) sound.play();
    lastCount = msgs.length;

    chatBox.innerHTML = "";
    for (const m of msgs) {
      if (m.type !== "system" && m.type !== "image" && m.ciphertext) m.ciphertext = await e2eDec(activeRoom, m.ciphertext);
      chatBox.appendChild(renderPrivateMsg(m));
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function renderPrivateMsg(m) {
    const div = document.createElement("div");
    const mine = String(m.sender_id) === String(user.id);

    if (m.type === "system") {
      div.className = "message system";
      div.textContent = "ℹ️ " + m.ciphertext;
    } else if (m.type === "image") {
      div.className = "message " + (mine ? "sent" : "received");
      const img = document.createElement("img");
      img.src = m.ciphertext;
      img.className = "chat-image";
      div.appendChild(img);
    } else if (m.type === "voice" && m.media) {
      div.className = "message " + (mine ? "sent" : "received");
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = API + "/api/chat/media/" + m.media;
      div.appendChild(audio);
    } else {
      div.className = "message " + (mine ? "sent" : "received");
      div.textContent = m.ciphertext;
      if (m.effect) {
        div.classList.add("fx-" + m.effect);
        if (m.effect === "glitch") div.setAttribute("data-text", m.ciphertext || "");
      }
    }

    return div;
  }

  /* ================= SEND (private) ================= */
  async function sendMessage(msg, type = "text", media = null, media_type = null) {
    if (!activeRoom || (!msg && !media) || !canSend) return;

    let enc;
    try {
      enc = await e2eEnc(activeRoom, msg || "");
      if (enc && enc.indexOf("enc1:") !== 0) throw new Error("encryption_failed");
    } catch (e) {
      alert("Encryption failed — message NOT sent (privacy protected).");
      return;
    }

    const body = {
      room_id: activeRoom,
      message: enc,
      type,
      sensitive: false,
      effect: selectedEffect || undefined
    };
    if (media) { body.media = media; body.media_type = media_type; }

    const r = await safeFetch(API + "/api/chat/send", { method: "POST", headers, body: JSON.stringify(body) });
    if (!r.ok) {
      const e = await r.json();
      alert(e.error || "Message failed");
      return;
    }
    input.value = "";
    await loadMessages();
    await loadMyChats();
  }

  /* ================= HALF PAY (UPI) ================= */
  document.getElementById("halfPayBtn").onclick = async () => {
    if (!activeRoom) return;
    const room = chats.find(c => c.id === activeRoom);
    if (!room) return alert("Room not found");

    // half of the listing price (never less than ₹1)
    let amount = 1000;
    try {
      const lr = await fetch(`https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/listings/${String(room.order_id).replace(/[^0-9]/g, "").slice(0, 12)}`);
      const listing = await lr.json();
      const price = Number(listing.price);
      if (lr.ok && Number.isFinite(price) && price > 0) amount = Math.max(1, Math.round(price / 2));
    } catch {}

    const r = await fetch("https://bgmi-marketplace.bgmi-gateway.workers.dev/pay/service-charge", {
      method: "POST",
      headers,
      body: JSON.stringify({ order_id: room.order_id, seller_id: room.seller_user_id, amount, purpose: "half" })
    });
    const data = await r.json();
    if (!r.ok) return alert(data.error || "Payment failed");

    const payResult = await openUpiPay({
      upi_id: data.upi_id,
      upi_name: data.upi_name,
      amount: data.upi_amount,
      order_id: room.order_id
    });
    if (!payResult.ok) return;

    await fetch(API + "/api/chat/half-payment", {
      method: "POST",
      headers,
      body: JSON.stringify({ room_id: activeRoom })
    });
    openChat(activeRoom);
  };

  /* ================= EFFECTS PICKER ================= */
  effBtn.onclick = (e) => { e.stopPropagation(); effectsPop.classList.toggle("open"); };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".effects-pop") && !e.target.closest("#effBtn")) effectsPop.classList.remove("open");
  });
  effectsPop.querySelectorAll(".eff-chip").forEach(chip => {
    chip.onclick = () => {
      selectedEffect = chip.getAttribute("data-e");
      effectsPop.querySelectorAll(".eff-chip").forEach(c => c.classList.toggle("sel", c === chip));
      effectsPop.classList.remove("open");
    };
  });

  /* ================= VOICE RECORDER ================= */
  function formatDur(ms) {
    const s = Math.floor(ms / 1000);
    return (s < 60 ? s + "s" : Math.floor(s / 60) + "m " + (s % 60) + "s");
  }

  async function toggleRec() {
    if (recState.active) return stopRec();

    if (!navigator.mediaDevices || !window.MediaRecorder) {
      return alert("Voice messages not supported on this browser");
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recState.active = true;
      recState.chunks = [];
      recState.mediaRecorder = mr;
      recState.start = Date.now();

      mr.ondataavailable = e => { if (e.data.size) recState.chunks.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recState.timer);
        micBtn.classList.remove("rec");
        micBtn.textContent = "🎤";
        recState.active = false;

        const blob = new Blob(recState.chunks, { type: "audio/webm" });
        if (blob.size < 1000) return;

        const buf = await blob.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        const b64 = btoa(bin);

        if (mode === "global") {
          await safeFetch(API + "/api/chat/global/send", {
            method: "POST",
            headers,
            body: JSON.stringify({ channel, media: "data:audio/webm;base64," + b64, media_type: "audio/webm", effect: selectedEffect || undefined })
          });
          await loadGlobal();
        } else if (canSend) {
          await sendMessage("", "voice", "data:audio/webm;base64," + b64, "audio/webm");
        }
      };

      mr.start();
      micBtn.classList.add("rec");
      micBtn.textContent = "⏹";
      recState.timer = setInterval(() => {
        micBtn.title = formatDur(Date.now() - recState.start);
      }, 1000);
    } catch {
      alert("Microphone access denied");
    }
  }

  function stopRec() {
    if (recState.mediaRecorder && recState.mediaRecorder.state !== "inactive") {
      recState.mediaRecorder.stop();
    }
  }
  micBtn.onclick = toggleRec;

  /* ================= CALLING SYSTEM ================= */
  async function initCallMedia(kind) {
    const c = {
      audio: { echoCancellation: true, noiseSuppression: true },
      video: kind === "video" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false
    };
    return navigator.mediaDevices.getUserMedia(c);
  }

  function callPeer() {
    if (callStateMachine.peer) return callStateMachine.peer;
    const cfg = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
    const pc = new RTCPeerConnection(cfg);
    callStateMachine.peer = pc;

    callStateMachine.localStream?.getTracks().forEach(t => pc.addTrack(t, callStateMachine.localStream));

    pc.ontrack = e => {
      callStateMachine.remoteStream = e.streams[0];
      remoteVideo.srcObject = e.streams[0];
      remoteVideo.style.display = "block";
      localVideo.style.display = callStateMachine.kind === "video" ? "block" : "none";
    };

    pc.onicecandidate = e => {
      if (e.candidate && callStateMachine.callId) {
        fireAndForget(sendCallEvent("ice", e.candidate.toJSON()));
      }
    };

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === "connected") {
        callState.textContent = "Connected";
        callAcceptBtn.style.display = "none";
        callDeclineBtn.style.display = "none";
        callEndBtn.style.display = "block";
        callStateMachine.active = true;
        stopPollingCalls();
        stopRing();
      } else if (st === "failed" || st === "closed" || st === "disconnected") {
        if (st === "failed" || st === "closed") endCallLocal(true);
      }
    };

    return pc;
  }

  function showCallOverlay(name, state, kind) {
    callOverlay.classList.add("open");
    callAvatar.textContent = (name || "?").charAt(0).toUpperCase();
    callName.textContent = name || "…";
    callState.textContent = state;
    localVideo.style.display = "none";
    remoteVideo.style.display = "none";
  }

  async function fireAndForget(p) { try { await p; } catch {} }

  async function sendCallEvent(type, payload) {
    await safeFetch(API + "/api/chat/call/event", {
      method: "POST",
      headers,
      body: JSON.stringify({ call_id: callStateMachine.callId, type, payload })
    });
  }

  function startPollingCalls() {
    if (callStateMachine.pollTimer) return;
    callStateMachine.pollTimer = setInterval(async () => {
      try {
        const r = await safeFetch(API + `/api/chat/call/poll?room_id=${callStateMachine.roomId}&since=${callStateMachine.eventSeq}`, { headers });
        const d = await r.json();
        if (d.call && d.call.id !== callStateMachine.callId && d.call.status === "ringing" && String(d.call.callee_id) === String(user.id)) {
          handleIncoming(d.call);
        }
        if (d.events && d.events.length) {
          d.events.forEach(e => {
            callStateMachine.eventSeq = Math.max(callStateMachine.eventSeq, Number(e.id) || 0);
            handleCallEvent(e);
          });
        }
      } catch {}
    }, 2000);
  }

  function stopPollingCalls() {
    if (callStateMachine.pollTimer) { clearInterval(callStateMachine.pollTimer); callStateMachine.pollTimer = null; }
  }

  let ringTimer = null;
  function startRing() {
    stopRing();
    ringTimer = setInterval(() => { try { sound.currentTime = 0; sound.play(); } catch {} }, 1600);
  }
  function stopRing() { if (ringTimer) { clearInterval(ringTimer); ringTimer = null; } }

  async function handleCallEvent(e) {
    const c = callStateMachine;
    if (e.type === "offer" && !c.initiator) {
      if (c.active) return;
      c.gotOffer = true;
      const pc = callPeer();
      await pc.setRemoteDescription(e.payload);
      c.peer.offer = e.payload;
      callAcceptBtn.style.display = "block";
      callDeclineBtn.style.display = "block";
      callEndBtn.style.display = "none";
      callState.textContent = "Incoming call…";
    } else if (e.type === "answer" && c.initiator) {
      if (c.peer) await c.peer.setRemoteDescription(e.payload);
    } else if (e.type === "ice") {
      if (c.peer) { try { await c.peer.addIceCandidate(e.payload); } catch {} }
    } else if (e.type === "hangup") {
      endCallLocal(true);
    }
  }

  async function handleIncoming(call) {
    const c = callStateMachine;
    if (c.active) return;
    c.active = true;
    c.roomId = call.room_id;
    c.callId = call.id;
    c.kind = call.kind;
    c.initiator = false;
    c.eventSeq = 0;

    showCallOverlay("Incoming " + call.kind + " call", "Ringing…", call.kind);
    callAcceptBtn.style.display = "block";
    callDeclineBtn.style.display = "block";
    callEndBtn.style.display = "none";
    startRing();
    startPollingCalls();
  }

  async function startCall(kind) {
    if (!activeRoom) return;
    const c = callStateMachine;
    if (c.active) return alert("Already in a call");

    try {
      c.localStream = await initCallMedia(kind);
    } catch {
      return alert("Microphone/Camera access denied");
    }
    localVideo.srcObject = c.localStream;

    const r = await safeFetch(API + "/api/chat/call/start", {
      method: "POST",
      headers,
      body: JSON.stringify({ room_id: activeRoom, kind })
    });
    const d = await r.json();
    if (!r.ok) {
      c.localStream.getTracks().forEach(t => t.stop());
      return alert(d.error === "call_already_active" ? "Ek call already active hai" : (d.error || "Unable to start call"));
    }

    c.active = true;
    c.roomId = activeRoom;
    c.callId = d.call_id;
    c.kind = kind;
    c.initiator = true;
    c.eventSeq = 0;

    const room = chats.find(ch => ch.id === activeRoom);
    const otherName = room?.other_name || room?.seller_name || "User";
    showCallOverlay("Calling " + otherName + "…", "Ringing…", kind);
    callAcceptBtn.style.display = "none";
    callDeclineBtn.style.display = "block";
    callEndBtn.style.display = "block";

    const pc = callPeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    c.myOffer = offer;
    await sendCallEvent("offer", offer);
    startPollingCalls();
  }

  async function acceptCall() {
    const c = callStateMachine;
    try {
      c.localStream = await initCallMedia(c.kind);
    } catch {
      return alert("Microphone/Camera access denied");
    }
    localVideo.srcObject = c.localStream;
    localVideo.style.display = c.kind === "video" ? "block" : "none";

    const pc = callPeer();
    if (c.gotOffer) {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendCallEvent("answer", answer);
    }
    callState.textContent = "Connecting…";
    callAcceptBtn.style.display = "none";
    callDeclineBtn.style.display = "none";
    callEndBtn.style.display = "block";
    startPollingCalls();
  }

  async function endCallLocal(silent) {
    const c = callStateMachine;
    if (!c.active && !c.callId) return;

    if (c.callId && !silent) fireAndForget(sendCallEvent("hangup", { by: user.id }));
    stopPollingCalls();
    stopRing();
    try { fireAndForget(safeFetch(API + "/api/chat/call/state", { method: "POST", headers, body: JSON.stringify({ call_id: c.callId, status: "ended" }) })); } catch {}

    c.peer?.close();
    c.peer = null;
    c.localStream?.getTracks().forEach(t => t.stop());
    c.localStream = null;
    c.remoteStream = null;
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    remoteVideo.style.display = "none";
    localVideo.style.display = "none";
    c.active = false;
    c.callId = null;
    c.roomId = null;
    c.gotOffer = false;
    c.initiator = false;
    callOverlay.classList.remove("open");
  }

  callAudioBtn.onclick = () => startCall("audio");
  callVideoBtn.onclick = () => startCall("video");
  callAcceptBtn.onclick = acceptCall;
  callDeclineBtn.onclick = () => endCallLocal(false);
  callEndBtn.onclick = () => endCallLocal(false);


  /* ================= EVENTS ================= */
  sendBtn.onclick = () => {
    if (mode === "global") sendGlobal();
    else sendMessage(input.value.trim());
  };

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendBtn.onclick();
    }
  });

  imgBtn.onclick = () => imgInput.click();
  imgInput.onchange = () => {
    const file = imgInput.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Image too large (max 2MB)");
    const reader = new FileReader();
    reader.onload = () => sendMessage(reader.result, "image");
    reader.readAsDataURL(file);
  };

  search.oninput = renderChatList;

  /* ================= POLLING ================= */
  setInterval(() => {
    if (mode === "global") loadGlobal();
    else { loadMyChats(); if (activeRoom) loadMessages(); }
  }, 3000);

  /* ================= INIT ================= */
  setMode("global");
  loadGlobal();
  loadMyChats();

  // Auto-open room passed via ?room_id= (from marketplace Chat / Buy)
  try {
    const qp = new URLSearchParams(location.search);
    const roomIdParam = qp.get("room_id");
    if (roomIdParam) {
      setMode("chats");
      openChat(roomIdParam);
    }
  } catch {}
})();
