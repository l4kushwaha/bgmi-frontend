// =====================================================
// 💬 chat.js (BGMI Chat Frontend Extended v3.1)
// =====================================================
// Features:
// - WebSocket real-time messaging with reconnect/backoff
// - Typing indicators
// - Media support (image/video via dataURL fallback)
// - Search users (calls Chat API search endpoint)
// - Robust DOM checks + graceful fallback polling
// =====================================================

(() => {
  // ---------- CONFIG ----------
  const DEFAULT_API_BASE = "https://bgmi_chat_service.bgmi-gateway.workers.dev/api";
  const DEFAULT_WS_BASE = "wss://bgmi_chat_service.bgmi-gateway.workers.dev/chat/ws";

  // Allow overriding from global window (useful in dev)
  const API_BASE = window.CHAT_API_BASE || DEFAULT_API_BASE;
  const WS_URL = window.CHAT_WS_URL || DEFAULT_WS_BASE;

  // ---------- STATE ----------
  // sender_id: prefer real auth user (localStorage.user) otherwise fallback to 1 for dev
  let sender_id = 1;
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && (user.id || user.user_id)) sender_id = user.id ?? user.user_id;
  } catch { /* ignore parse errors */ }

  let receiver_id = null;
  let receiver_username = null;

  // WebSocket + reconnect/backoff
  let ws = null;
  let reconnectAttempts = 0;
  let isWSConnected = false;

  // ---------- DOM (safe queries) ----------
  const $ = id => document.getElementById(id);
  const searchInput = $("searchUser") || $("searchInput");
  const searchBtn = $("searchBtn");
  const userList = $("userList") || $("searchResults");
  const msgInput = $("msgInput") || $("messageInput");
  const sendBtn = $("sendBtn") || $("sendBtn");
  const messagesDiv = $("messages") || $("chatBox");
  const statusDiv = $("status") || null;
  const chatWithEl = $("chatWith") || $("currentUser") || null;
  const userStatusEl = $("userStatus") || null;
  const typingDiv = $("typingIndicator") || null;
  const fileInput = $("fileInput") || null;
  const emojiBtn = $("emojiBtn") || null;
  const emojiPicker = $("emojiPicker") || null;

  // ---------- UTIL ----------
  function log(...args) { console.log("[chat.js]", ...args); }
  function warn(...args) { console.warn("[chat.js]", ...args); }
  function err(...args) { console.error("[chat.js]", ...args); }

  function humanTime(ts = null) {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // Safe DOM append for messages
  function appendMessage(msg) {
    if (!messagesDiv) return;
    const div = document.createElement("div");
    div.className = "message " + (msg.sender_id === sender_id ? "sent" : "received");
    // message_type: text | image | video
    if (!msg.message_type || msg.message_type === "text") {
      div.textContent = msg.content || "";
    } else if (msg.message_type === "image") {
      const img = document.createElement("img");
      img.className = "chat-media";
      img.alt = msg.content || "image";
      // Prefer media_url (hosted) otherwise data_url content
      img.src = msg.media_url || msg.media_data || "";
      div.appendChild(img);
      if (msg.content) div.appendChild(document.createTextNode(" " + msg.content));
    } else if (msg.message_type === "video") {
      const v = document.createElement("video");
      v.controls = true;
      v.className = "chat-media";
      v.src = msg.media_url || msg.media_data || "";
      div.appendChild(v);
      if (msg.content) div.appendChild(document.createTextNode(" " + msg.content));
    }

    // Timestamp
    const t = document.createElement("time");
    t.textContent = humanTime(msg.timestamp);
    t.style.display = "block";
    t.style.fontSize = "11px";
    t.style.color = "#aaa";
    t.style.marginTop = "6px";
    div.appendChild(t);

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Replace messages content (conversation load)
  function setMessagesList(list) {
    if (!messagesDiv) return;
    messagesDiv.innerHTML = "";
    if (!list || list.length === 0) {
      const p = document.createElement("p");
      p.className = "chat-placeholder";
      p.textContent = "Start chatting 👋";
      messagesDiv.appendChild(p);
      return;
    }
    list.forEach(appendMessage);
  }

  // ---------- WebSocket Handling ----------
  function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    log("Connecting WebSocket to", WS_URL);
    try {
      ws = new WebSocket(WS_URL);

      ws.addEventListener("open", () => {
        log("WebSocket open");
        isWSConnected = true;
        reconnectAttempts = 0;
        // send simple auth handshake so server can map connection -> user_id
        ws.send(JSON.stringify({ type: "auth", user_id: sender_id }));
        setStatus("✅ Chat service online (WS)");
      });

      ws.addEventListener("message", ev => {
        try {
          const msg = JSON.parse(ev.data);
          // Expect message types: message, typing, presence, auth_success, read
          if (msg.type === "message") {
            // msg.message expected to contain sender_id, receiver_id, content, message_type, media_url, timestamp
            const m = msg.message || msg;
            // If message belongs to current conversation, append
            if (m.sender_id === receiver_id || m.receiver_id === receiver_id || m.sender_id === sender_id || m.receiver_id === sender_id) {
              appendMessage(m);
            }
            // Optionally: play sound / show desktop notification
          } else if (msg.type === "typing") {
            if (msg.sender_id === receiver_id || msg.from === receiver_id) showTypingIndicator();
          } else if (msg.type === "auth_success") {
            log("WS auth success");
          } else if (msg.type === "presence") {
            // { type: 'presence', user_id, status: 'online'|'offline' }
            if (userStatusEl && msg.user_id === receiver_id) {
              userStatusEl.textContent = msg.status === "online" ? "Online" : "Offline";
              userStatusEl.style.color = msg.status === "online" ? "#7fff7f" : "#ccc";
            }
          } else if (msg.type === "read") {
            // read receipt handling placeholder
            log("Read receipt:", msg);
          }
        } catch (e) {
          warn("Invalid WS message", ev.data);
        }
      });

      ws.addEventListener("close", () => {
        isWSConnected = false;
        warn("WebSocket closed; scheduling reconnect");
        setStatus("⚠️ WS disconnected — reconnecting...");
        scheduleReconnect();
      });

      ws.addEventListener("error", (e) => {
        isWSConnected = false;
        err("WebSocket error", e);
        try { ws.close(); } catch {}
        scheduleReconnect();
      });
    } catch (e) {
      err("WS connect failed", e);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    reconnectAttempts++;
    const delay = Math.min(30000, 1000 * Math.pow(1.8, reconnectAttempts)); // exponential backoff up to 30s
    log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`);
    setTimeout(connectWebSocket, delay);
  }

  // ---------- API (HTTP) helpers ----------
  async function apiFetch(path, opts = {}) {
    const token = localStorage.getItem("token");
    const headers = opts.headers || {};
    if (!(opts.body instanceof FormData)) headers["Content-Type"] = headers["Content-Type"] || "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
    const final = { ...opts, headers };
    const res = await fetch(url, final);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json().catch(() => ({}));
  }

  // ---------- Search Users ----------
  async function searchUsers() {
    if (!searchInput) return;
    const q = searchInput.value.trim();
    if (!q) return;
    if (!userList) return;

    userList.innerHTML = `<div style="padding:10px;color:#ccc">Searching…</div>`;
    try {
      const users = await apiFetch(`/chat/users/search?q=${encodeURIComponent(q)}`);
      userList.innerHTML = "";
      if (!Array.isArray(users) || users.length === 0) {
        userList.innerHTML = `<div style="padding:10px;color:#ccc">No users found.</div>`;
        return;
      }
      users.forEach(u => {
        const row = document.createElement("div");
        row.style.padding = "8px 10px";
        row.style.cursor = "pointer";
        row.textContent = u.username || u.email || `User ${u.id}`;
        row.addEventListener("click", () => openConversation(u.id, u.username || u.email || `User ${u.id}`));
        userList.appendChild(row);
      });
    } catch (e) {
      userList.innerHTML = `<div style="padding:10px;color:#f88">Search failed</div>`;
      warn("searchUsers error", e);
    }
  }

  // ---------- Open Conversation ----------
  async function openConversation(id, username) {
    receiver_id = id;
    receiver_username = username;
    if (chatWithEl) chatWithEl.textContent = `Chatting with: ${username}`;
    if (userStatusEl) {
      userStatusEl.textContent = "Checking...";
      userStatusEl.style.color = "#ccc";
    }
    setMessagesList([]);
    try {
      const convo = await apiFetch(`/chat/conversation/${sender_id}/${receiver_id}`);
      // backend returns array of messages (sender_id, receiver_id, content, timestamp, message_type, media_url)
      setMessagesList(convo);
    } catch (e) {
      warn("openConversation error", e);
      if (messagesDiv) messagesDiv.innerHTML = `<div style="padding:12px;color:#f88">Failed to load conversation</div>`;
    }
    // ask server to mark as read (placeholder, needs backend)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "read", user_id: sender_id, conversation_with: receiver_id }));
    }
  }

  // ---------- Send Message ----------
  // Supports:
  // - text messages
  // - if fileInput contains a file -> read as dataURL and send message_type image|video with media_data
  async function sendMessage() {
    if (!msgInput) return;
    const text = msgInput.value.trim();
    const file = fileInput && fileInput.files && fileInput.files[0];

    if (!text && !file) return;

    // Build message object consistent with backend expectation
    const basic = { type: "message", sender_id, receiver_id };

    try {
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const dataUrl = e.target.result;
          const mime = file.type || "";
          const isVideo = mime.startsWith("video");
          const message_type = isVideo ? "video" : "image";

          const msgObj = {
            ...basic,
            content: text || "",
            message_type,
            media_data: dataUrl,      // NOTE: server must accept large base64 data or you should upload separately
            filename: file.name,
            timestamp: new Date().toISOString(),
          };

          // Prefer WebSocket sending for real-time
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(msgObj));
            // append immediately for optimistic UI
            appendMessage({ ...msgObj, sender_id, timestamp: msgObj.timestamp });
          } else {
            // Fallback: HTTP POST to /chat/send (server must accept media_data)
            await apiFetch("/chat/send", { method: "POST", body: JSON.stringify(msgObj) });
            appendMessage({ ...msgObj, sender_id, timestamp: msgObj.timestamp });
          }
          // clear input & file
          msgInput.value = "";
          if (fileInput) fileInput.value = "";
        };
        reader.readAsDataURL(file);
        return;
      }

      // Text-only message
      const msgObj = {
        ...basic,
        content: text,
        message_type: "text",
        timestamp: new Date().toISOString(),
      };

      if (!receiver_id) {
        alert("Please select a user to chat with.");
        return;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msgObj));
        appendMessage({ ...msgObj, sender_id, timestamp: msgObj.timestamp });
        msgInput.value = "";
      } else {
        // HTTP fallback
        await apiFetch("/chat/send", {
          method: "POST",
          body: JSON.stringify(msgObj),
        });
        appendMessage({ ...msgObj, sender_id, timestamp: msgObj.timestamp });
        msgInput.value = "";
      }
    } catch (e) {
      warn("sendMessage error", e);
      alert("Failed to send message.");
    }
  }

  // ---------- Typing indicator ----------
  let typingTimeout = null;
  function notifyTyping() {
    if (!ws || ws.readyState !== WebSocket.OPEN || !receiver_id) return;
    ws.send(JSON.stringify({ type: "typing", sender_id, receiver_id }));
  }
  function showTypingIndicator() {
    if (!typingDiv) return;
    typingDiv.textContent = "Typing...";
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => typingDiv.textContent = "", 1800);
  }

  // ---------- Status helper ----------
  function setStatus(text) {
    if (!statusDiv) return;
    statusDiv.textContent = text;
    statusDiv.style.color = text.includes("online") ? "#4caf50" : "#f39c12";
  }

  // ---------- Poll fallback (3s) ----------
  setInterval(() => {
    if (!isWSConnected && receiver_id) {
      // poll conversation as backup
      loadConversation().catch(e => warn("poll loadConversation", e));
    }
  }, 3000);

  // ---------- Event Listeners (if DOM present) ----------
  if (searchBtn) searchBtn.addEventListener("click", searchUsers);
  if (searchInput) searchInput.addEventListener("keypress", e => e.key === "Enter" && searchUsers());
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (msgInput) {
    msgInput.addEventListener("keypress", e => {
      if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
      else notifyTyping();
    });
    msgInput.addEventListener("input", () => notifyTyping());
  }
  if (fileInput) fileInput.addEventListener("change", () => {
    // optional: preview selected file before send
  });

  // Emoji support (if present)
  if (emojiBtn && emojiPicker && msgInput) {
    emojiBtn.addEventListener("click", () => {
      emojiPicker.style.display = emojiPicker.style.display === "grid" ? "none" : "grid";
    });
    emojiPicker.querySelectorAll("span").forEach(s => {
      s.addEventListener("click", () => {
        msgInput.value += s.textContent;
        emojiPicker.style.display = "none";
        msgInput.focus();
      });
    });
  }

  // ---------- Initialize ----------
  (async function init() {
    // Health check then connect
    try {
      setStatus("Connecting to chat service...");
      const data = await apiFetch("/health").catch(() => null);
      if (data && data.status === "running") {
        setStatus("✅ Chat service online");
        connectWebSocket();
      } else {
        setStatus("⚠️ Chat service issue (using polling fallback)");
        // still attempt websocket
        connectWebSocket();
      }
    } catch (e) {
      warn("init health check failed", e);
      setStatus("❌ Chat service offline (will attempt WS)");
      connectWebSocket();
    }
  })();

  // expose some functions for debugging / integration
  window.BGMIChat = {
    connectWebSocket,
    sendMessage,
    searchUsers,
    openConversation,
    appendMessage,
    getState: () => ({ sender_id, receiver_id, wsState: ws ? ws.readyState : null }),
  };
})();
