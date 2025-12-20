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
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

/* ================= IMAGE SLIDER ================= */
function initSlider(card){
  const g = card.querySelector(".images-gallery");
  if(!g) return;
  const imgs=[...g.querySelectorAll("img")];
  if(imgs.length<=1) return;

  const dots=[...g.querySelectorAll(".img-dots span")];
  let i=0;

  const show=n=>{
    imgs[i].classList.remove("active");
    dots[i].classList.remove("active");
    i=(n+imgs.length)%imgs.length;
    imgs[i].classList.add("active");
    dots[i].classList.add("active");
  };

  g.querySelector(".left").onclick=()=>show(i-1);
  g.querySelector(".right").onclick=()=>show(i+1);
  dots.forEach((d,n)=>d.onclick=()=>show(n));

  setInterval(()=>show(i+1),3500);
}

/* ================= EDIT ================= */
function openEdit(id){
  editItem = allItems.find(i=>String(i.id)===String(id));
  editImages = safeArray(editItem.images);

  const f = document.getElementById("edit-form");
  document.getElementById("edit-modal-bg").classList.add("active");

  const field = (label,id,val)=>`
    <label><b>${label}</b></label>
    <input id="${id}" value="${val||""}">
  `;

  const area = (label,id,val)=>`
    <label><b>${label}</b></label>
    <textarea id="${id}">${val||""}</textarea>
  `;

  f.innerHTML = `
    ${field("Listing Title","e-title",editItem.title)}
    ${field("Price","e-price",editItem.price)}
    ${field("Level","e-level",editItem.level)}
    ${field("Highest Rank","e-rank",editItem.highest_rank)}

    ${area("Upgraded Guns","e-upgraded",safeArray(editItem.upgraded_guns).join(","))}
    ${area("Mythic Items","e-mythic",safeArray(editItem.mythic_items).join(","))}
    ${area("Legendary Items","e-legendary",safeArray(editItem.legendary_items).join(","))}
    ${area("Gift Items","e-gifts",safeArray(editItem.gift_items).join(","))}
    ${area("Titles","e-titles",safeArray(editItem.titles).join(","))}
    ${area("Highlights","e-highlights",editItem.account_highlights)}

    <label><b>Images</b></label>
    <div id="e-images" style="display:flex;gap:8px;flex-wrap:wrap"></div>
    <button class="btn outline" id="add-img">Add Image</button>
  `;

  renderEditImages();

  document.getElementById("add-img").onclick = () => {
    const i = document.createElement("input");
    i.type="file"; i.accept="image/*";
    i.onchange=async e=>{
      const compressed = await compressImage(e.target.files[0]);
      editImages.push(compressed);
      renderEditImages();
    };
    i.click();
  };
}

function renderEditImages(){
  const box=document.getElementById("e-images");
  box.innerHTML="";
  editImages.forEach((src,i)=>{
    const d=document.createElement("div");
    d.style.position="relative";
    d.draggable=true;
    d.innerHTML=`
      <img src="${src}" style="width:70px;height:70px;object-fit:cover;border-radius:8px">
      <span style="position:absolute;top:-6px;right:-6px;
        background:red;color:#fff;border-radius:50%;
        padding:2px 6px;cursor:pointer">✖</span>`;
    d.querySelector("span").onclick=()=>{
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
async function deleteListing(id){
  if(!confirm("Delete listing?"))return;
  await fetch(`${API_URL}/listings/${id}`,{
    method:"DELETE",
    headers:{Authorization:`Bearer ${session().token}`}
  });
  toast("Listing deleted");
  loadListings();
}

/* ================= EVENTS ================= */
searchInput?.addEventListener("input",renderList);
filterSelect?.addEventListener("change",renderList);
loadListings();
})();