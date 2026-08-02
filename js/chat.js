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

  /* ================= STATE ================= */
  let chats = [];
  let activeRoom = null;
  let lastCount = 0;
  let canSend = false;
  let mode = "global";           // global | chats
  let channel = "bgmi";
  let lastGlobal = 0;
  let selectedEffect = "";
  let recState = { active: false, mediaRecorder: null, chunks: [], start: 0, timer: null };

  const CHANNELS = [
    { id: "bgmi", label: "🎯 BGMI" },
    { id: "free_fire", label: "🔥 Free Fire" },
    { id: "general", label: "💬 General" }
  ];

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
  exitPrivate.onclick = () => { activeRoom = null; chatBox.innerHTML = ""; waitingBox.innerHTML = ""; chatStatus.textContent = "Select a chat"; renderChatList(); };

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
    msgs.forEach(m => chatBox.appendChild(renderPrivateMsg(m)));
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

    const body = {
      room_id: activeRoom,
      message: msg || "",
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

    const r = await fetch("https://bgmi-marketplace.bgmi-gateway.workers.dev/pay/service-charge", {
      method: "POST",
      headers,
      body: JSON.stringify({ order_id: room.order_id, seller_id: room.seller_user_id, amount: 1000 })
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
})();
