(() => {
/* ================= CONFIG ================= */
const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
const container = document.getElementById("items-container");
const searchInput = document.getElementById("search");
const cityInput = document.getElementById("city");
const filterSelect = document.getElementById("filter");


let allItems = [];
let editItem = null;
let editImages = [];

/* ================= HELPERS ================= */
const esc = v => String(v ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const safeArray = v => {
  try {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return JSON.parse(v);
    return [];
  } catch { return []; }
};

const escArray = v => safeArray(v).map(esc);

const toast = msg => {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
};

const session = () => {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) return null;
    return { token, user };
  } catch { return null; }
};

const isOwner = item =>
  session() &&
  (String(session().user.seller_id) === String(item.seller_id) ||
   session().user.role === "admin");

const stars = r =>
  "★".repeat(Math.round(r || 0)) +
  "☆".repeat(5 - Math.round(r || 0));

/* ================= IMAGE COMPRESSION ================= */
function compressImage(file, maxW = 1200, quality = 0.75) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => img.src = e.target.result;
    reader.readAsDataURL(file);

    img.onload = () => {
      const scale = Math.min(maxW / img.width, 1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
  });
}

/* ================= LOAD ================= */
// ✅ COMMON FUNCTION (ADD THIS)
async function startChatOrBuy(order_id, seller_user_id, intent) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Please login first");
    return;
  }

  try {
    const res = await fetch(
      "https://bgmi_chat_service.bgmi-gateway.workers.dev/api/chat/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ order_id, seller_user_id, intent })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Unable to start chat");
      return;
    }

    // redirect to chat page
    location.href = `/chat.html?room_id=${data.room_id}`;

  } catch (err) {
    console.error("chat error", err);
    alert("Something went wrong");
  }
}

// ✅ CHAT BUTTON
function startChat(order_id, seller_user_id) {
  startChatOrBuy(order_id, seller_user_id, "chat");
}

// ✅ BUY BUTTON
async function startBuy(order_id, seller_user_id, amount) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    alert("Please login first");
    return;
  }

  const item = allItems.find(i => String(i.id) === String(order_id));

  // 0️⃣ Buyer picks: online delivery OR real meetup
  const choice = await openBuyOptions(item);
  if (!choice) return;            // cancelled
  if (choice === "meetup") { openMeetup(order_id); return; }

  // Popularity listing → buyer must give the target UID for the boost
  let target_uid = "";
  if (item && (item.category || "account") === "popularity") {
    const uid = await openTargetUid();
    if (!uid) return; // cancelled
    target_uid = uid;
  }

  try {
    // 1️⃣ Create purchase record (escrow tracking)
    const resPurchase = await fetch(
      "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/purchases",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ listing_id: order_id, target_uid })
      }
    );
    const purchaseData = await resPurchase.json();
    if (!resPurchase.ok) return alert(purchaseData.error || "Unable to create purchase");

    // 2️⃣ Call Wallet Service (10% admin fee) — direct UPI, no gateway
    const resWallet = await fetch(
      "https://bgmi-marketplace.bgmi-gateway.workers.dev/pay/service-charge",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ order_id, seller_id: seller_user_id, amount, purpose: "full" })
      }
    );
    const walletData = await resWallet.json();
    if (!resWallet.ok) return alert(walletData.error || "Payment failed");

    // 3️⃣ Direct UPI payment modal (no gateway / no KYC)
    const payResult = await openUpiPay({
      upi_id: walletData.upi_id,
      upi_name: walletData.upi_name,
      amount: walletData.upi_amount,
      order_id,
      note: walletData.note,
      direct_to_seller: walletData.direct_to_seller
    });
    if (!payResult.ok) return; // cancelled

    // 4️⃣ Payment submitted → open chat with seller
    await startChatOrBuy(order_id, seller_user_id, "buy");
  } catch (err) {
    console.error("Buy flow error", err);
    alert("Something went wrong");
  }
}

/* ================= BUY OPTIONS MODAL (online vs meetup) ================= */
let buyOptsResolver = null;

function openBuyOptions(item) {
  const title = item ? (item.title || "Listing") : "Listing";
  document.getElementById("buyopts-info").textContent =
    `${title} — ₹${Number(item?.price || 0).toLocaleString("en-IN")}`;
  document.getElementById("buyopts-modal-bg").classList.add("active");
  return new Promise(resolve => { buyOptsResolver = resolve; });
}

function resolveBuyOptions(choice) {
  document.getElementById("buyopts-modal-bg").classList.remove("active");
  if (buyOptsResolver) { buyOptsResolver(choice); buyOptsResolver = null; }
}

document.getElementById("buyopts-online").onclick = () => resolveBuyOptions("online");
document.getElementById("buyopts-meetup").onclick = () => resolveBuyOptions("meetup");
document.getElementById("buyopts-cancel").onclick = () => resolveBuyOptions(null);

/* ================= TARGET UID MODAL (popularity buy) ================= */
let targetResolver = null;

function openTargetUid() {
  document.getElementById("target-uid").value = "";
  document.getElementById("target-msg").textContent = "";
  document.getElementById("target-modal-bg").classList.add("active");
  setTimeout(() => document.getElementById("target-uid").focus(), 50);
  return new Promise(resolve => { targetResolver = resolve; });
}

function resolveTargetUid(uid) {
  document.getElementById("target-modal-bg").classList.remove("active");
  if (targetResolver) { targetResolver(uid); targetResolver = null; }
}

document.getElementById("target-submit").onclick = () => {
  const uid = document.getElementById("target-uid").value.replace(/\D/g, "").slice(0, 12);
  if (!uid) {
    document.getElementById("target-msg").textContent = "UID required — apna BGMI UID dalo (sirf numbers).";
    return;
  }
  resolveTargetUid(uid);
};

document.getElementById("target-cancel").onclick = () => resolveTargetUid(null);


/* ================= MEETUP MODAL ================= */
let meetupListing = null;

window.openMeetup = itemId => {
  const item = allItems.find(i => String(i.id) === String(itemId));
  if (!item) return;
  const s = session();
  if (!s) { alert("Please login first"); return; }

  meetupListing = item;
  document.getElementById("meetup-listing-info").textContent =
    `${item.title} — ₹${item.price}${item.seller_city || item.city ? "  ·  📍 " + (item.seller_city || item.city) : ""}`;
  document.getElementById("mu-city").value = item.seller_city || item.city || "";
  document.getElementById("mu-location").value = "";
  document.getElementById("mu-date").value = "";
  document.getElementById("mu-time").value = "";
  document.getElementById("mu-note").value = "";
  document.getElementById("mu-msg").textContent = "";
  document.getElementById("meetup-modal-bg").classList.add("active");
};

window.closeMeetup = () =>
  document.getElementById("meetup-modal-bg").classList.remove("active");

document.getElementById("mu-submit").onclick = async () => {
  const s = session();
  if (!s) { alert("Please login first"); return; }
  const msg = document.getElementById("mu-msg");
  msg.style.color = "#e67e22";
  msg.textContent = "";
  const payload = {
    listing_id: meetupListing.id,
    city: document.getElementById("mu-city").value.trim(),
    location: document.getElementById("mu-location").value.trim(),
    meet_date: document.getElementById("mu-date").value,
    meet_time: document.getElementById("mu-time").value,
    note: document.getElementById("mu-note").value.trim()
  };
  if (!payload.city || !payload.location || !payload.meet_date || !payload.meet_time) {
    msg.textContent = "City, location, date & time sab required hai.";
    return;
  }
  try {
    const res = await fetch(`${API_URL}/meetups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.token },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    msg.style.color = "#27ae60";
    msg.textContent = "✅ Meetup request sent! Seller approve karega.";
    setTimeout(closeMeetup, 1400);
  } catch (err) {
    msg.style.color = "#c0392b";
    msg.textContent = "❌ " + err.message;
  }
};

async function loadListings() {
  const s = session();
  const res = await fetch(`${API_URL}/listings`, {
    headers: s ? { Authorization: `Bearer ${s.token}` } : {}
  });
  const data = await res.json();
  allItems = Array.isArray(data) ? data : [];
  renderList();
}

/* ================= SEARCH / FILTER ================= */
function renderList() {
  let items = [...allItems];
  const q = searchInput?.value?.toLowerCase() || "";
  const c = cityInput?.value?.toLowerCase() || "";
  const f = filterSelect?.value || "";

  if (q)
    items = items.filter(i =>
      `${i.uid} ${i.title} ${i.highest_rank}`.toLowerCase().includes(q)
    );

  if (c)
    items = items.filter(i =>
      `${i.seller_city || ""} ${i.city || ""}`.toLowerCase().includes(c)
    );

  if (f === "own" && session())
    items = items.filter(i =>
      String(i.seller_id) === String(session().user.seller_id)
    );

  if (f === "account" || f === "popularity")
    items = items.filter(i => (i.category || "account") === f);

  if (f === "meetup")
    items = items.filter(i => i.meetup_available || i.city);

  if (f === "price_low") items.sort((a,b)=>a.price-b.price);
  if (f === "price_high") items.sort((a,b)=>b.price-a.price);
  if (f === "new") items.sort((a,b)=>b.id-a.id);

  container.innerHTML = "";
  items.forEach(renderCard);
}

/* ================= CARD ================= */
function renderCard(item) {
  const images = safeArray(item.images);
  const card = document.createElement("div");
  card.className = "item-card reveal card-in";
  card.dataset.delay = String((item.id || 0) % 4);
  card.dataset.i = String(((item.id || 0) % 8) + 1);

  const upgraded = escArray(item.upgraded_guns).join(", ");
  const mythic = escArray(item.mythic_items).join(", ");
  const legendary = escArray(item.legendary_items).join(", ");
  const gifts = escArray(item.honor_gift ?? item.gift_items).join(", ");
  const titles = escArray(item.titles).join(", ");
  const xSuit = escArray(item.x_suit).join(", ");
  const supercar = escArray(item.supercar).join(", ");
  const ultimate = escArray(item.ultimate).join(", ");

  const isPopularity = (item.category || "account") === "popularity";

  // Build card using safe DOM methods instead of innerHTML (XSS prevention)
  const gallery = document.createElement("div");
  gallery.className = "images-gallery";
  images.forEach((img, i) => {
    const imgEl = document.createElement("img");
    imgEl.src = esc(img);
    imgEl.className = i === 0 ? "active" : "";
    gallery.appendChild(imgEl);
  });

  if (images.length > 1) {
    const leftBtn = document.createElement("button");
    leftBtn.className = "img-arrow left";
    leftBtn.textContent = "‹";
    const rightBtn = document.createElement("button");
    rightBtn.className = "img-arrow right";
    rightBtn.textContent = "›";
    const dotsWrap = document.createElement("div");
    dotsWrap.className = "img-dots";
    images.forEach((_, i) => {
      const dot = document.createElement("span");
      dot.className = i === 0 ? "active" : "";
      dotsWrap.appendChild(dot);
    });
    gallery.appendChild(leftBtn);
    gallery.appendChild(rightBtn);
    gallery.appendChild(dotsWrap);
  }

  const cardContent = document.createElement("div");
  cardContent.className = "card-content";

  const catChip = document.createElement("span");
  catChip.className = `cat-chip ${isPopularity ? "pop" : "acc"}`;
  catChip.textContent = isPopularity ? "🔥 POPULARITY" : "🎮 ACCOUNT";
  cardContent.appendChild(catChip);

  const titleEl = document.createElement("strong");
  titleEl.textContent = esc(item.title);
  cardContent.appendChild(titleEl);
  cardContent.appendChild(document.createElement("br"));

  if (isPopularity) {
    const popPoints = document.createElement("span");
    popPoints.className = "pop-points";
    popPoints.textContent = `⚡ ${esc(item.points || 0)} Popularity Points`;
    cardContent.appendChild(popPoints);
    cardContent.appendChild(document.createElement("br"));
    if (item.delivery_time) {
      const dTime = document.createElement("span");
      dTime.className = "d-time";
      dTime.textContent = `🚚 Delivery: ${esc(item.delivery_time)}`;
      cardContent.appendChild(dTime);
      cardContent.appendChild(document.createElement("br"));
    }
  } else {
    const uidEl = document.createElement("span");
    uidEl.textContent = `UID: ${esc(item.uid)}`;
    cardContent.appendChild(uidEl);
    cardContent.appendChild(document.createElement("br"));
    const levelEl = document.createElement("span");
    levelEl.textContent = `Level: ${esc(item.level)}`;
    cardContent.appendChild(levelEl);
    cardContent.appendChild(document.createElement("br"));
    const rankEl = document.createElement("span");
    rankEl.textContent = `Rank: ${esc(item.highest_rank || "-")}`;
    cardContent.appendChild(rankEl);
    cardContent.appendChild(document.createElement("br"));
  }

  if (item.seller_city || item.city) {
    const cityBadge = document.createElement("span");
    cityBadge.className = "city-badge";
    cityBadge.textContent = `📍 ${esc(item.seller_city || item.city)}`;
    cardContent.appendChild(cityBadge);
  }

  if (item.meetup_available) {
    const meetupBadge = document.createElement("span");
    meetupBadge.className = "meetup-badge";
    meetupBadge.textContent = "🤝 Meetup Available";
    cardContent.appendChild(meetupBadge);
  }

  if (!isPopularity) {
    const details = [
      { label: "Upgraded:", value: upgraded },
      { label: "Mythic:", value: mythic },
      { label: "Legendary:", value: legendary },
      { label: "Honor Gifts:", value: gifts },
      { label: "Titles:", value: titles },
      { label: "X Suit:", value: xSuit },
      { label: "Supercar:", value: supercar },
      { label: "Ultimate:", value: ultimate },
      { label: "Highlights:", value: esc(item.account_highlights || "") }
    ];
    details.forEach(d => {
      if (d.value) {
        const strong = document.createElement("b");
        strong.textContent = d.label;
        const span = document.createElement("span");
        span.textContent = ` ${d.value}`;
        cardContent.appendChild(strong);
        cardContent.appendChild(span);
        cardContent.appendChild(document.createElement("br"));
      }
    });
  }

  const priceEl = document.createElement("div");
  priceEl.className = "price price-pulse";
  priceEl.textContent = `₹${esc(item.price)}`;
  cardContent.appendChild(priceEl);

  card.appendChild(gallery);
  card.appendChild(cardContent);

  /* card actions */
  const cardActions = document.createElement("div");
  cardActions.className = "card-actions";

  const viewBtn = document.createElement("button");
  viewBtn.className = "btn view-btn";
  viewBtn.textContent = "👁️ View Details";
  viewBtn.onclick = () => openDetails(item.id);
  cardActions.appendChild(viewBtn);

  const sellerBtn = document.createElement("button");
  sellerBtn.className = "btn outline seller-btn";
  sellerBtn.textContent = "Seller Profile";
  sellerBtn.onclick = () => openSellerProfile(item.seller_id);
  cardActions.appendChild(sellerBtn);

  if (isOwner(item)) {
    const editBtn = document.createElement("button");
    editBtn.className = "btn edit-btn";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openEdit(item.id);
    cardActions.appendChild(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = () => deleteListing(item.id);
    cardActions.appendChild(deleteBtn);
  } else {
    const buyBtn = document.createElement("button");
    buyBtn.className = "btn buy-btn";
    buyBtn.textContent = "Buy";
    buyBtn.onclick = () => startBuy(item.id, item.seller_id, item.price);
    cardActions.appendChild(buyBtn);

    if (item.meetup_available || item.seller_city) {
      const muBtn = document.createElement("button");
      muBtn.className = "btn meetup-btn";
      muBtn.textContent = "🤝 Meetup";
      muBtn.onclick = () => openMeetup(item.id);
      cardActions.appendChild(muBtn);
    }

    const chatBtn = document.createElement("button");
    chatBtn.className = "btn outline chat-btn";
    chatBtn.textContent = "Chat";
    chatBtn.onclick = () => startChat(item.id, item.seller_id);
    cardActions.appendChild(chatBtn);
  }

  card.appendChild(cardActions);

  initFullscreen(card);

  container.appendChild(card);
  setTimeout(() => { initSlider(card); }, 0);
}


/* ================= CARD SLIDER ================= */
function initSlider(card) {

  const gallery = card.querySelector(".images-gallery");

  if (!gallery) return;



  const imgs = Array.from(gallery.querySelectorAll("img"));

  if (imgs.length <= 1) return;



  const leftBtn  = gallery.querySelector(".img-arrow.left");

  const rightBtn = gallery.querySelector(".img-arrow.right");

  const dotsWrap = gallery.querySelector(".img-dots");



  if (!leftBtn || !rightBtn || !dotsWrap) return;



  const dots = Array.from(dotsWrap.children);



  let index = 0;

  let timer = null;



  // --- show image ---

  function show(I) {

    imgs.forEach(img => img.classList.remove("active"));

    dots.forEach(d => d.classList.remove("active"));



    index = (I + imgs.length) % imgs.length;



    imgs[index].classList.add("active");

    dots[index].classList.add("active");

  }



  // --- arrows ---

  leftBtn.onclick  = e => { e.stopPropagation(); show(index - 1); restart(); };

  rightBtn.onclick = e => { e.stopPropagation(); show(index + 1); restart(); };



  // --- dots ---

  dots.forEach((d, I) => {

    d.onclick = e => { e.stopPropagation(); show(I); restart(); };

  });



  // --- auto slide ---

  function start() {

    timer = setInterval(() => {

      show(index + 1);

    }, 3500);

  }



  function stop() {

    if (timer) clearInterval(timer);

  }



  function restart() {

    stop();

    start();

  }



  gallery.addEventListener("mouseenter", stop);

  gallery.addEventListener("mouseleave", start);



  // init

  show(0);

  start();

}

/* ================= FULLSCREEN VIEWER ================= */
let fsViewer = null;
let fsImg = null;
let fsLeft = null;
let fsRight = null;
let fsTimer = null;
let fsIndex = 0;
let fsImgs = [];

function initFullscreen(card) {
  const imgs = [...card.querySelectorAll(".images-gallery img")];
  if (!imgs.length) return;

  // 🔹 Create fullscreen viewer ONCE
  if (!fsViewer) {
    fsViewer = document.createElement("div");
    fsViewer.id = "fs-viewer";
    fsViewer.style.cssText = `
      position:fixed;inset:0;
      background:rgba(0,0,0,.9);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:9999;
    `;

    fsViewer.innerHTML = `
      <span id="fs-close"
        style="position:absolute;top:20px;right:30px;
        font-size:34px;color:#fff;cursor:pointer">×</span>

      <span id="fs-left"
        style="position:absolute;left:20px;
        font-size:42px;color:#fff;cursor:pointer">‹</span>

      <img id="fs-img"
        style="max-width:90%;max-height:90%;
        border-radius:14px">

      <span id="fs-right"
        style="position:absolute;right:20px;
        font-size:42px;color:#fff;cursor:pointer">›</span>
    `;

    document.body.appendChild(fsViewer);

    fsImg = fsViewer.querySelector("#fs-img");
    fsLeft = fsViewer.querySelector("#fs-left");
    fsRight = fsViewer.querySelector("#fs-right");

    fsViewer.querySelector("#fs-close").onclick = () => {
      fsViewer.style.display = "none";
      stopFsAuto();
    };

    fsViewer.onclick = e => {
      if (e.target === fsViewer) {
        fsViewer.style.display = "none";
        stopFsAuto();
      }
    };

    fsLeft.onclick = e => {
      e.stopPropagation();
      showFs(fsIndex - 1);
    };

    fsRight.onclick = e => {
      e.stopPropagation();
      showFs(fsIndex + 1);
    };
  }

  // 🔹 Attach click to card images
  imgs.forEach((img, i) => {
    img.onclick = () => {
      fsImgs = imgs;
      fsIndex = i;
      fsImg.src = img.src;
      fsViewer.style.display = "flex";
      startFsAuto();
    };
  });
}

function showFs(i) {
  if (!fsImgs.length) return;
  fsIndex = (i + fsImgs.length) % fsImgs.length;
  fsImg.src = fsImgs[fsIndex].src;
}

function startFsAuto() {
  stopFsAuto();
  fsTimer = setInterval(() => showFs(fsIndex + 1), 3000);
}

function stopFsAuto() {
  if (fsTimer) clearInterval(fsTimer);
}

/* ================= SELLER PROFILE ================= */
window.openSellerProfile = async sellerId => {
  const bg = document.getElementById("seller-modal-bg");
  const c = document.getElementById("seller-content");
  bg.classList.add("active");
  c.innerHTML = "Loading...";

  // seller stats (market service)
  let s = { name: "Seller #" + sellerId, seller_verified: false, badge: "new", avg_rating: 0, review_count: 0, total_sales: 0 };
  try {
    const res = await fetch(`${API_URL}/seller/${sellerId}`);
    s = await res.json();
  } catch { /* fallback to defaults */ }

  // profile bio + socials (verification service)
  let bio = "", instagram = "", facebook = "";
  try {
    const token = localStorage.getItem("token") || "";
    const r = await fetch(
      "https://verification_service.bgmi-gateway.workers.dev/profile/" + sellerId,
      { headers: token ? { Authorization: "Bearer " + token } : {} }
    );
    const p = (await r.json()).profile || {};
    bio = p.bio || "";
    instagram = p.instagram || "";
    facebook = p.facebook || "";
  } catch { /* optional */ }

  const social = [];
  if (instagram) social.push(`<a href="${/^https?:/.test(instagram) ? esc(instagram) : "https://instagram.com/" + esc(instagram)}" target="_blank" rel="noopener" class="seller-social ig">📸 Instagram</a>`);
  if (facebook) social.push(`<a href="${/^https?:/.test(facebook) ? esc(facebook) : "https://facebook.com/" + esc(facebook)}" target="_blank" rel="noopener" class="seller-social fb">👍 Facebook</a>`);

  c.innerHTML = `
    <h3>${esc(s.name || ("Seller #" + sellerId))}</h3>
    <p><b>Status:</b> ${s.seller_verified ? "✅ Verified" : "Pending"}</p>
    <p><b>Badge:</b> ${esc(s.badge || "None")}</p>
    <p><b>Rating:</b> ${stars(s.avg_rating)}</p>
    <p><b>Reviews:</b> ${s.review_count || 0}</p>
    <p><b>Total Sales:</b> ${s.total_sales || 0}</p>
    ${s.city ? `<p><b>📍 City:</b> ${esc(s.city)}</p>` : ""}
    ${s.meetup_note ? `<p><b>🤝 Meetup:</b> ${esc(s.meetup_note)}</p>` : ""}
    ${bio ? `<p class="seller-bio">“${esc(bio)}”</p>` : ""}
    ${social.length ? `<p class="seller-socials">${social.join(" ")}</p>` : ""}
  `;
};

window.closeSeller = () =>
  document.getElementById("seller-modal-bg").classList.remove("active");

/* ================= VIEW DETAILS ================= */
window.openDetails = itemId => {
  const item = allItems.find(i => String(i.id) === String(itemId));
  if (!item) return;
  const bg = document.getElementById("details-modal-bg");
  const c = document.getElementById("details-content");

  const images = safeArray(item.images);
  const isPop = (item.category || "account") === "popularity";

  const chip = (label, val) =>
    val ? `<div class="d-chip"><b>${esc(label)}</b>${esc(val)}</div>` : "";

  const dGrid = [
    chip("Gilt / Level", item.level),
    chip("Highest Rank", item.highest_rank),
    chip("Mythic Items", safeArray(item.mythic_items).join(", ") || ""),
    chip("Legendary Items", safeArray(item.legendary_items).join(", ") || ""),
    chip("Honor Gift", safeArray(item.honor_gift ?? item.gift_items).join(", ") || ""),
    chip("Upgraded Guns", safeArray(item.upgraded_guns).join(", ") || ""),
    chip("Titles", safeArray(item.titles).join(", ") || ""),
    chip("X Suit", safeArray(item.x_suit).join(", ") || ""),
    chip("Supercar", safeArray(item.supercar).join(", ") || ""),
    chip("Ultimate", safeArray(item.ultimate).join(", ") || "")
  ].join("");

  const popChips = isPop ? [
    `<div class="d-chip" style="border-color:rgba(255,120,0,.5)"><b style="color:#ff9d3c">⚡ Popularity Points</b>${esc(item.points || 0)}</div>`,
    chip("Delivery Time", item.delivery_time)
  ].join("") : "";

  const cityChips = (item.seller_city || item.city) ? [
    `<div class="d-chip" style="border-color:rgba(0,234,255,.5)"><b style="color:#00eaff">📍 City</b>${esc(item.seller_city || item.city)}</div>`,
    ...(item.meetup_available ? [`<div class="d-chip" style="border-color:rgba(124,255,139,.5)"><b style="color:#7CFF8B">🤝 Real Meetup</b>Available — public place</div>`] : [])
  ].join("") : "";

  c.innerHTML = `
    <div class="d-hero">
      <div>
        <span class="cat-chip ${isPop?"pop":"acc"}">${isPop?"🔥 POPULARITY":"🎮 ACCOUNT"}</span>
        <h3 style="margin:.2rem 0">${esc(item.title)}</h3>
        <div class="d-meta">UID: ${esc(item.uid)} · Listing #${esc(item.id)}</div>
      </div>
    </div>

    <div class="d-imgs">
      ${images.length ? images.map(img => `<img src="${esc(img)}" onclick="openDetailsFull(this.src)">`).join("")
        : `<div class="d-chip">No images</div>`}
    </div>

    ${popChips}
    ${cityChips}
    <div class="d-grid">${dGrid}</div>

    ${item.description || item.account_highlights ? `<div class="d-desc">📝 ${esc(item.description || item.account_highlights)}</div>` : ""}

    <div class="d-price">₹${esc(item.price)}</div>

    <div class="d-actions">
      ${isOwner(item) ? `
        <button class="btn edit-btn" onclick="closeDetails();openEdit(${item.id})">✏️ Edit</button>
        <button class="btn delete-btn" onclick="closeDetails();deleteListing(${item.id})">🗑 Delete</button>`
      : `
        <button class="btn buy-btn" onclick="closeDetails();startBuy(${item.id}, ${JSON.stringify(item.seller_id)}, ${item.price})">🛒 Buy Now</button>
        ${(item.meetup_available || item.seller_city) ? `<button class="btn meetup-btn" onclick="closeDetails();openMeetup(${item.id})">🤝 Meetup</button>` : ""}
        <button class="btn outline chat-btn" onclick="closeDetails();startChat(${item.id}, ${JSON.stringify(item.seller_id)})">💬 Chat</button>`}
    </div>
  `;

  bg.classList.add("active");
};

window.openDetailsFull = src => {
  const img = document.createElement("img");
  img.src = src;
  img.style.cssText = "position:fixed;inset:0;margin:auto;max-width:92vw;max-height:92vh;border-radius:14px;z-index:10002;cursor:zoom-out;box-shadow:0 0 60px rgba(0,255,255,.4)";
  img.onclick = () => img.remove();
  document.body.appendChild(img);
};

window.closeDetails = () =>
  document.getElementById("details-modal-bg").classList.remove("active");

/* ================= EDIT ================= */
function openEdit(id) {
  editItem = allItems.find(i => String(i.id) === String(id));
  editImages = safeArray(editItem.images);

  const f = document.getElementById("edit-form");
  document.getElementById("edit-modal-bg").classList.add("active");

  f.innerHTML = `
    <label>Title</label><input id="e-title" value="${esc(editItem.title)}">
    <label>Price</label><input id="e-price" value="${esc(editItem.price)}">
    <label>Level</label><input id="e-level" value="${esc(editItem.level)}">
    <label>Rank</label><input id="e-rank" value="${esc(editItem.highest_rank || "")}">

    <label>Upgraded Guns</label><textarea id="e-upgraded">${esc(safeArray(editItem.upgraded_guns).join(","))}</textarea>
    <label>Mythic Items</label><textarea id="e-mythic">${esc(safeArray(editItem.mythic_items).join(","))}</textarea>
    <label>Legendary Items</label><textarea id="e-legendary">${esc(safeArray(editItem.legendary_items).join(","))}</textarea>
    <label>Honor Gifts</label><textarea id="e-honor">${esc(safeArray(editItem.honor_gift ?? editItem.gift_items).join(","))}</textarea>
    <label>Titles</label><textarea id="e-titles">${esc(safeArray(editItem.titles).join(","))}</textarea>
    <label>X Suit</label><textarea id="e-x_suit">${esc(safeArray(editItem.x_suit).join(","))}</textarea>
    <label>Supercar</label><textarea id="e-supercar">${esc(safeArray(editItem.supercar).join(","))}</textarea>
    <label>Ultimate</label><textarea id="e-ultimate">${esc(safeArray(editItem.ultimate).join(","))}</textarea>
    <label>Highlights</label><textarea id="e-highlights">${esc(editItem.account_highlights || "")}</textarea>

    <label>Images</label>
    <div id="e-images" style="display:flex;gap:8px;flex-wrap:wrap"></div>
    <button class="btn outline" id="add-img">Add Image</button>
  `;

  renderEditImages();

  document.getElementById("add-img").onclick = () => {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.onchange = async e => {
      const img = await compressImage(e.target.files[0]);
      editImages.push(img);
      renderEditImages();
    };
    i.click();
  };
}

function renderEditImages() {
  const box = document.getElementById("e-images");
  box.innerHTML = "";
  editImages.forEach((src,i)=>{
    const d = document.createElement("div");
    d.style.position = "relative";
    d.innerHTML = `
      <img src="${src}" style="width:70px;height:70px;border-radius:8px;object-fit:cover">
      <span style="position:absolute;top:-6px;right:-6px;
        background:red;color:#fff;border-radius:50%;
        padding:2px 6px;cursor:pointer">✖</span>`;
    d.querySelector("span").onclick = () => {
      editImages.splice(i,1);
      renderEditImages();
    };
    box.appendChild(d);
  });
}

/* ================= SAVE ================= */
document.getElementById("save-edit").onclick = async () => {
  await fetch(`${API_URL}/listings/${editItem.id}`,{
    method:"PUT",
    headers:{
      "Content-Type":"application/json",
      Authorization:`Bearer ${session().token}`
    },
    body:JSON.stringify({
      title:e("e-title"),
      price:+e("e-price"),
      level:+e("e-level"),
      highest_rank:e("e-rank"),
      upgraded_guns:e("e-upgraded").split(","),
      mythic_items:e("e-mythic").split(","),
      legendary_items:e("e-legendary").split(","),
      honor_gift:e("e-honor").split(","),
      titles:e("e-titles").split(","),
      x_suit:e("e-x_suit").split(","),
      supercar:e("e-supercar").split(","),
      ultimate:e("e-ultimate").split(","),
      account_highlights:e("e-highlights"),
      images:editImages
    })
  });
  toast("Listing updated");
  closeEdit();
  loadListings();
};

window.closeEdit = () =>
  document.getElementById("edit-modal-bg").classList.remove("active");

const e = id => document.getElementById(id).value;

/* ================= DELETE ================= */
async function deleteListing(id) {
  if (!confirm("Delete listing?")) return;
  await fetch(`${API_URL}/listings/${id}`,{
    method:"DELETE",
    headers:{ Authorization:`Bearer ${session().token}` }
  });
  toast("Listing deleted");
  loadListings();
}

/* ================= EVENTS ================= */
searchInput?.addEventListener("input", renderList);
cityInput?.addEventListener("input", renderList);
filterSelect?.addEventListener("change", renderList);

loadListings();
})();