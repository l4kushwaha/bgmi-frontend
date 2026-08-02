(() => {
/* ================= CONFIG ================= */
const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
const container = document.getElementById("items-container");
const searchInput = document.getElementById("search");
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

  try {
    // 1️⃣ Create purchase record (escrow tracking)
    const resPurchase = await fetch(
      "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/purchases",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ listing_id: order_id })
      }
    );
    const purchaseData = await resPurchase.json();
    if (!resPurchase.ok) return alert(purchaseData.error || "Unable to create purchase");

    // 2️⃣ Call Wallet Service (10% admin fee)
    const resWallet = await fetch(
      "https://bgmi-marketplace.bgmi-gateway.workers.dev/pay/service-charge",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ order_id, seller_id: seller_user_id, amount: amount || 1000 })
      }
    );
    const walletData = await resWallet.json();
    if (!resWallet.ok) return alert(walletData.error || "Payment failed");

    // 3️⃣ Direct UPI payment modal (no gateway / no KYC)
    const payResult = await openUpiPay({
      upi_id: walletData.upi_id,
      upi_name: walletData.upi_name,
      amount: walletData.upi_amount,
      order_id
    });
    if (!payResult.ok) return; // cancelled

    // 4️⃣ Payment submitted → open chat with seller
    await startChatOrBuy(order_id, seller_user_id, "buy");
  } catch (err) {
    console.error("Buy flow error", err);
    alert("Something went wrong");
  }
}


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
  const f = filterSelect?.value || "";

  if (q)
    items = items.filter(i =>
      `${i.uid} ${i.title} ${i.highest_rank}`.toLowerCase().includes(q)
    );

  if (f === "own" && session())
    items = items.filter(i =>
      String(i.seller_id) === String(session().user.seller_id)
    );

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

  card.innerHTML = `
    <div class="images-gallery">
      ${images.map((img,i)=>`
        <img src="${esc(img)}" class="${i===0?"active":""}">
      `).join("")}

      ${images.length > 1 ? `
        <button class="img-arrow left">‹</button>
        <button class="img-arrow right">›</button>
        <div class="img-dots">
          ${images.map((_,i)=>`<span class="${i===0?"active":""}"></span>`).join("")}
        </div>` : ""}
    </div>

    <div class="card-content">
      <strong>${esc(item.title)}</strong><br>
      UID: ${esc(item.uid)}<br>
      Level: ${esc(item.level)}<br>
      Rank: ${esc(item.highest_rank || "-")}<br>

      ${upgraded ? `<b>Upgraded:</b> ${upgraded}<br>` : ""}
      ${mythic ? `<b>Mythic:</b> ${mythic}<br>` : ""}
      ${legendary ? `<b>Legendary:</b> ${legendary}<br>` : ""}
      ${gifts ? `<b>Honor Gifts:</b> ${gifts}<br>` : ""}
      ${titles ? `<b>Titles:</b> ${titles}<br>` : ""}
      ${xSuit ? `<b>X Suit:</b> ${xSuit}<br>` : ""}
      ${supercar ? `<b>Supercar:</b> ${supercar}<br>` : ""}
      ${ultimate ? `<b>Ultimate:</b> ${ultimate}<br>` : ""}
      ${item.account_highlights ? `<b>Highlights:</b> ${esc(item.account_highlights)}` : ""}

      <div class="price price-pulse">₹${esc(item.price)}</div>
    </div>

    <div class="card-actions">
      <button class="btn outline seller-btn">Seller Profile</button>
      ${isOwner(item)
        ? `<button class="btn edit-btn">Edit</button>
           <button class="btn delete-btn">Delete</button>`
        :
         `
         <button class="btn buy-btn">Buy</button>
         <button class="btn outline chat-btn">Chat</button>
         `
        }
    </div>
  `;

  /* seller */
  card.querySelector(".seller-btn").onclick =
    () => openSellerProfile(item.seller_id);

  if (isOwner(item)) {
    card.querySelector(".edit-btn").onclick = () => openEdit(item.id);
    card.querySelector(".delete-btn").onclick = () => deleteListing(item.id);
  }

 if (!isOwner(item)) {
  card.querySelector(".chat-btn").onclick = () =>
    startChat(item.id, item.seller_id); // CHAT

  card.querySelector(".buy-btn").onclick = () =>
    startBuy(item.id, item.seller_id, item.price); // BUY
}

  
  initFullscreen(card);

  container.appendChild(card);
    setTimeout(() =>{
      initSlider(card);},0);
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
    ${bio ? `<p class="seller-bio">“${esc(bio)}”</p>` : ""}
    ${social.length ? `<p class="seller-socials">${social.join(" ")}</p>` : ""}
  `;
};

window.closeSeller = () =>
  document.getElementById("seller-modal-bg").classList.remove("active");

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
filterSelect?.addEventListener("change", renderList);

loadListings();
})();