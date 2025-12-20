(() => {
/* ================= CONFIG ================= */
const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
const container = document.getElementById("items-container");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");

let allItems = [];
let editItem = null;
let editImages = [];

/* ================= SLIDER STATE ================= */
const sliderTimers = new WeakMap();

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

/* ================= SELLER PROFILE (FIXED) ================= */
window.openSellerProfile = async sellerId => {
  const bg = document.getElementById("seller-modal-bg");
  const content = document.getElementById("seller-content");
  bg.classList.add("active");
  content.innerHTML = "Loading...";

  try {
    const res = await fetch(`${API_URL}/seller/${sellerId}`);
    const s = await res.json();

    content.innerHTML = `
      <h3>${s.name}</h3>
      <p><b>Status:</b> ${s.seller_verified ? "Verified" : "Pending"}</p>
      <p><b>Badge:</b> ${s.badge || "-"}</p>
      <p><b>Rating:</b> ${"★".repeat(Math.round(s.avg_rating || 0))}</p>
      <p><b>Total Sales:</b> ${s.total_sales || 0}</p>
      <p><b>Reviews:</b> ${s.review_count || 0}</p>
      <button class="btn outline" onclick="alert('Chat coming soon')">
        Chat with Seller
      </button>
    `;
  } catch {
    content.innerHTML = "Failed to load seller profile";
  }
};

window.closeSeller = () =>
  document.getElementById("seller-modal-bg").classList.remove("active");

/* ================= LOAD ================= */
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
      ${images.length>1?`
        <button class="img-arrow left">‹</button>
        <button class="img-arrow right">›</button>
        <div class="img-dots">
          ${images.map((_,i)=>`<span class="${i===0?"active":""}"></span>`).join("")}
        </div>`:""}
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

  initSlider(card);
  container.appendChild(card);
}

/* ================= IMAGE SLIDER (FINAL FIX) ================= */
function initSlider(card){
  const g = card.querySelector(".images-gallery");
  if(!g) return;

  const imgs = [...g.querySelectorAll("img")];
  if(imgs.length <= 1) return;

  const dots = [...g.querySelectorAll(".img-dots span")];
  const left = g.querySelector(".left");
  const right = g.querySelector(".right");

  let index = 0;

  const show = n => {
    imgs[index].classList.remove("active");
    dots[index].classList.remove("active");
    index = (n + imgs.length) % imgs.length;
    imgs[index].classList.add("active");
    dots[index].classList.add("active");
  };

  left.onclick = () => show(index - 1);
  right.onclick = () => show(index + 1);
  dots.forEach((d,i)=>d.onclick=()=>show(i));

  if (sliderTimers.has(g)) {
    clearInterval(sliderTimers.get(g));
  }

  const timer = setInterval(() => show(index + 1), 3500);
  sliderTimers.set(g, timer);

  g.addEventListener("mouseenter", () => clearInterval(timer));
  g.addEventListener("mouseleave", () => {
    clearInterval(sliderTimers.get(g));
    sliderTimers.set(g, setInterval(() => show(index + 1), 3500));
  });
}

/* ================= EVENTS ================= */
searchInput?.addEventListener("input",renderList);
filterSelect?.addEventListener("change",renderList);
loadListings();
})();