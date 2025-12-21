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
const safeArray = v => {
  try {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return JSON.parse(v);
    return [];
  } catch { return []; }
};

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

/* ================= LOAD LISTINGS ================= */
async function loadListings() {
  const s = session();
  const res = await fetch(`${API_URL}/listings`, {
    headers: s ? { Authorization: `Bearer ${s.token}` } : {}
  });
  const data = await res.json();
  allItems = Array.isArray(data) ? data : [];
  renderList();
}

/* ================= FILTER + SEARCH ================= */
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
  card.className = "item-card";

  card.innerHTML = `
    <div class="images-gallery">
      ${images.map((img,i)=>`
        <img src="${img}" class="${i===0?"active":""}">
      `).join("")}

      ${images.length > 1 ? `
        <button class="img-arrow left">‹</button>
        <button class="img-arrow right">›</button>
        <div class="img-dots">
          ${images.map((_,i)=>`<span class="${i===0?"active":""}"></span>`).join("")}
        </div>` : ""}
    </div>

    <div class="card-content">
      <strong>${item.title}</strong><br>
      UID: ${item.uid}<br>
      Level: ${item.level}<br>
      Rank: ${item.highest_rank || "-"}<br>

      ${safeArray(item.upgraded_guns).length ? `<b>Upgraded:</b> ${safeArray(item.upgraded_guns).join(", ")}<br>` : ""}
      ${safeArray(item.mythic_items).length ? `<b>Mythic:</b> ${safeArray(item.mythic_items).join(", ")}<br>` : ""}
      ${safeArray(item.legendary_items).length ? `<b>Legendary:</b> ${safeArray(item.legendary_items).join(", ")}<br>` : ""}
      ${safeArray(item.gift_items).length ? `<b>Gifts:</b> ${safeArray(item.gift_items).join(", ")}<br>` : ""}
      ${safeArray(item.titles).length ? `<b>Titles:</b> ${safeArray(item.titles).join(", ")}<br>` : ""}
      ${item.account_highlights ? `<b>Highlights:</b> ${item.account_highlights}` : ""}

      <div class="price">₹${item.price}</div>
    </div>

    <div class="card-actions">
      <button class="btn outline seller-btn">Seller Profile</button>
      ${isOwner(item)
        ? `<button class="btn edit-btn">Edit</button>
           <button class="btn delete-btn">Delete</button>`
        : `<button class="btn buy-btn" onclick="alert('Buy coming soon')">Buy</button>`}
    </div>
  `;

  card.querySelector(".seller-btn").onclick =
    () => openSellerProfile(item.seller_id);

  if (isOwner(item)) {
    card.querySelector(".edit-btn").onclick = () => openEdit(item.id);
    card.querySelector(".delete-btn").onclick = () => deleteListing(item.id);
  }

  initSlider(card);
  container.appendChild(card);
}

/* ================= IMAGE SLIDER (FIXED) ================= */
function initSlider(card) {
  const g = card.querySelector(".images-gallery");
  if (!g) return;

  const imgs = [...g.querySelectorAll("img")];
  if (imgs.length <= 1) return;

  const dots = [...g.querySelectorAll(".img-dots span")];
  const left = g.querySelector(".img-arrow.left");
  const right = g.querySelector(".img-arrow.right");

  let index = 0;
  let timer;

  const show = n => {
    imgs[index].classList.remove("active");
    dots[index].classList.remove("active");

    index = (n + imgs.length) % imgs.length;

    imgs[index].classList.add("active");
    dots[index].classList.add("active");
  };

  left.onclick = () => show(index - 1);
  right.onclick = () => show(index + 1);
  dots.forEach((d,i)=> d.onclick = () => show(i));

  const start = () => {
    stop();
    timer = setInterval(() => show(index + 1), 3000);
  };
  const stop = () => timer && clearInterval(timer);

  g.addEventListener("mouseenter", stop);
  g.addEventListener("mouseleave", start);
  start();
}

/* ================= SELLER PROFILE ================= */
window.openSellerProfile = async sellerId => {
  const bg = document.getElementById("seller-modal-bg");
  const c = document.getElementById("seller-content");
  bg.classList.add("active");
  c.innerHTML = "Loading...";

  const res = await fetch(`${API_URL}/seller/${sellerId}`);
  const s = await res.json();

  c.innerHTML = `
    <h3>${s.name}</h3>
    <p><b>Status:</b> ${s.seller_verified ? "Verified" : "Pending"}</p>
    <p><b>Badge:</b> ${s.badge || "None"}</p>
    <p><b>Rating:</b> ${stars(s.avg_rating)}</p>
    <p><b>Reviews:</b> ${s.review_count || 0}</p>
    <p><b>Total Sales:</b> ${s.total_sales || 0}</p>
    <button class="btn outline" onclick="alert('Chat coming soon')">Chat</button>
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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <input id="e-title" value="${editItem.title}">
      <input id="e-price" value="${editItem.price}">
      <input id="e-level" value="${editItem.level}">
      <input id="e-rank" value="${editItem.highest_rank || ""}">
    </div>

    <textarea id="e-upgraded">${safeArray(editItem.upgraded_guns).join(",")}</textarea>
    <textarea id="e-mythic">${safeArray(editItem.mythic_items).join(",")}</textarea>
    <textarea id="e-legendary">${safeArray(editItem.legendary_items).join(",")}</textarea>
    <textarea id="e-gifts">${safeArray(editItem.gift_items).join(",")}</textarea>
    <textarea id="e-titles">${safeArray(editItem.titles).join(",")}</textarea>
    <textarea id="e-highlights">${editItem.account_highlights || ""}</textarea>

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
      gift_items:e("e-gifts").split(","),
      titles:e("e-titles").split(","),
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