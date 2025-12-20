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

const toast = (msg, ok = true) => {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = ok ? "#27ae60" : "#c0392b";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
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

/* ================= LOAD LISTINGS ================= */
async function loadListings() {
  const s = session();
  const res = await fetch(`${API_URL}/listings`, {
    headers: s ? { Authorization: `Bearer ${s.token}` } : {}
  });
  allItems = await res.json();
  if (!Array.isArray(allItems)) allItems = [];
  renderList();
}

function renderList() {
  let items = [...allItems];
  const q = searchInput?.value?.toLowerCase() || "";
  const f = filterSelect?.value || "";

  if (q) {
    items = items.filter(i =>
      `${i.uid} ${i.title} ${i.highest_rank}`.toLowerCase().includes(q)
    );
  }

  if (f === "own" && session()) {
    items = items.filter(i =>
      String(i.seller_id) === String(session().user.seller_id)
    );
  }

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
        <img src="${img}" class="slide-img ${i===0?"active":""}">
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

/* ================= SLIDER (FINAL FIXED) ================= */
function initSlider(card) {
  const gallery = card.querySelector(".images-gallery");
  if (!gallery) return;

  const imgs = [...gallery.querySelectorAll(".slide-img")];
  if (imgs.length <= 1) return;

  const dots = [...gallery.querySelectorAll(".img-dots span")];
  const left = gallery.querySelector(".img-arrow.left");
  const right = gallery.querySelector(".img-arrow.right");

  let index = 0;
  let timer = null;

  const show = i => {
    imgs[index].classList.remove("active");
    dots[index].classList.remove("active");
    index = (i + imgs.length) % imgs.length;
    imgs[index].classList.add("active");
    dots[index].classList.add("active");
  };

  left.onclick = () => show(index - 1);
  right.onclick = () => show(index + 1);
  dots.forEach((d,i)=>d.onclick=()=>show(i));

  const startAuto = () => {
    stopAuto();
    timer = setInterval(()=>show(index + 1), 3500);
  };

  const stopAuto = () => {
    if (timer) clearInterval(timer);
  };

  gallery.addEventListener("mouseenter", stopAuto);
  gallery.addEventListener("mouseleave", startAuto);

  startAuto(); // 🔥 AUTO SLIDE START
}

/* ================= EDIT ================= */
function openEdit(id) {
  editItem = allItems.find(i => String(i.id) === String(id));
  editImages = safeArray(editItem.images);

  document.getElementById("edit-modal-bg").classList.add("active");
  document.getElementById("edit-form").innerHTML = `
    <label>Title</label><input id="e-title" value="${editItem.title}">
    <label>Price</label><input id="e-price" value="${editItem.price}">
    <label>Level</label><input id="e-level" value="${editItem.level}">
  `;
}

window.closeEdit = () =>
  document.getElementById("edit-modal-bg").classList.remove("active");

/* ================= DELETE ================= */
async function deleteListing(id) {
  if (!confirm("Delete listing?")) return;
  await fetch(`${API_URL}/listings/${id}`, {
    method:"DELETE",
    headers:{ Authorization:`Bearer ${session().token}` }
  });
  toast("Listing deleted");
  loadListings();
}

/* ================= EVENTS ================= */
searchInput && searchInput.addEventListener("input", renderList);
filterSelect && filterSelect.addEventListener("change", renderList);

loadListings();
})();