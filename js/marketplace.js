(() => {
/* ================= CONFIG ================= */
const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
const container = document.getElementById("items-container");
const searchInput = document.getElementById("search");
const filterSelect = document.getElementById("filter");

let allItems = [];
let editItem = null;
let editImages = [];
let sliderTimers = new WeakMap();

/* ================= HELPERS ================= */
const safeArray = v => {
  try {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") return JSON.parse(v);
    return [];
  } catch {
    return [];
  }
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
  } catch {
    return null;
  }
};

const isOwner = item =>
  session() &&
  (String(session().user.seller_id) === String(item.seller_id) ||
   session().user.role === "admin");

const stars = r =>
  "★".repeat(Math.round(r || 0)) +
  "☆".repeat(5 - Math.round(r || 0));

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
        : `<button class="btn buy-btn" onclick="alert('Coming soon')">Buy</button>`}
    </div>
  `;

  /* SELLER */
  card.querySelector(".seller-btn").onclick =
    () => openSellerProfile(item.seller_id);

  /* OWNER */
  if (isOwner(item)) {
    card.querySelector(".edit-btn").onclick = () => openEdit(item.id);
    card.querySelector(".delete-btn").onclick = () => deleteListing(item.id);
  }

  initSlider(card);
  container.appendChild(card);
}

/* ================= IMAGE SLIDER ================= */
function initSlider(card){
  const gallery = card.querySelector(".images-gallery");
  if(!gallery) return;

  const imgs=[...gallery.querySelectorAll("img")];
  if(imgs.length<=1) return;

  const dots=[...gallery.querySelectorAll(".img-dots span")];
  let index=0;

  const show=i=>{
    imgs[index].classList.remove("active");
    dots[index].classList.remove("active");
    index=(i+imgs.length)%imgs.length;
    imgs[index].classList.add("active");
    dots[index].classList.add("active");
  };

  gallery.querySelector(".left").onclick=()=>show(index-1);
  gallery.querySelector(".right").onclick=()=>show(index+1);
  dots.forEach((d,i)=>d.onclick=()=>show(i));

  const timer=setInterval(()=>show(index+1),3500);
  sliderTimers.set(card,timer);

  imgs.forEach(img=>img.onclick=()=>openFullscreen(imgs,index));
}

/* ================= FULLSCREEN VIEWER ================= */
let fsImgs=[],fsIndex=0;
const viewer=document.createElement("div");
viewer.style.cssText=`
  position:fixed;inset:0;background:rgba(0,0,0,.9);
  display:none;align-items:center;justify-content:center;z-index:9999`;
viewer.innerHTML=`
  <span style="position:absolute;top:20px;right:30px;
    font-size:32px;color:#fff;cursor:pointer">×</span>
  <span class="fs-left" style="position:absolute;left:20px;
    font-size:40px;color:#fff;cursor:pointer">‹</span>
  <img style="max-width:92%;max-height:92%;border-radius:14px">
  <span class="fs-right" style="position:absolute;right:20px;
    font-size:40px;color:#fff;cursor:pointer">›</span>
`;
document.body.appendChild(viewer);

const fsImg=viewer.querySelector("img");
viewer.querySelector("span").onclick=()=>viewer.style.display="none";
viewer.querySelector(".fs-left").onclick=()=>fsShow(fsIndex-1);
viewer.querySelector(".fs-right").onclick=()=>fsShow(fsIndex+1);

function openFullscreen(imgs,i){
  fsImgs=imgs;
  fsIndex=i;
  fsImg.src=imgs[i].src;
  viewer.style.display="flex";
}
function fsShow(i){
  fsIndex=(i+fsImgs.length)%fsImgs.length;
  fsImg.src=fsImgs[fsIndex].src;
}

/* ================= SELLER PROFILE ================= */
window.openSellerProfile = async id => {
  const bg = document.getElementById("seller-modal-bg");
  const c = document.getElementById("seller-content");
  bg.classList.add("active");
  c.innerHTML="Loading...";
  const res = await fetch(`${API_URL}/seller/${id}`);
  const s = await res.json();

  c.innerHTML = `
    <h3>${s.name}</h3>
    <p>Status: ${s.seller_verified==1?"Verified":"Pending"}</p>
    <p>Badge: ${s.badge || "-"}</p>
    <p>Rating: ${stars(s.avg_rating)}</p>
    <p>Reviews: ${s.review_count || 0}</p>
    <p>Total Sales: ${s.total_sales || 0}</p>
    <button class="btn outline" onclick="alert('Chat coming soon')">Chat</button>
  `;
};

window.closeSeller = () =>
  document.getElementById("seller-modal-bg").classList.remove("active");

/* ================= EDIT ================= */
function openEdit(id){
  editItem=allItems.find(i=>String(i.id)===String(id));
  if(!editItem) return;
  editImages=safeArray(editItem.images);

  const f=document.getElementById("edit-form");
  document.getElementById("edit-modal-bg").classList.add("active");

  const arr=v=>safeArray(v).join(", ");

  f.innerHTML=`
    <input id="e-title" value="${editItem.title}">
    <input id="e-price" type="number" value="${editItem.price}">
    <input id="e-level" type="number" value="${editItem.level}">
    <input id="e-rank" value="${editItem.highest_rank||""}">
    <textarea id="e-upgraded">${arr(editItem.upgraded_guns)}</textarea>
    <textarea id="e-mythic">${arr(editItem.mythic_items)}</textarea>
    <textarea id="e-legendary">${arr(editItem.legendary_items)}</textarea>
    <textarea id="e-gifts">${arr(editItem.gift_items)}</textarea>
    <textarea id="e-titles">${arr(editItem.titles)}</textarea>
    <textarea id="e-highlights">${editItem.account_highlights||""}</textarea>
    <div id="e-images" style="display:flex;gap:8px;flex-wrap:wrap"></div>
    <button class="btn outline" id="add-img">Add Image</button>
  `;
  renderEditImages();

  document.getElementById("add-img").onclick=()=>{
    const i=document.createElement("input");
    i.type="file";i.accept="image/*";
    i.onchange=e=>{
      const r=new FileReader();
      r.onload=ev=>{
        editImages.push(ev.target.result);
        renderEditImages();
      };
      r.readAsDataURL(e.target.files[0]);
    };
    i.click();
  };
}

function renderEditImages(){
  const box=document.getElementById("e-images");
  box.innerHTML="";
  editImages.forEach((src,i)=>{
    const d=document.createElement("div");
    d.draggable=true;
    d.style.position="relative";
    d.innerHTML=`
      <img src="${src}" style="width:70px;height:70px;object-fit:cover;border-radius:8px">
      <span style="position:absolute;top:-6px;right:-6px;
        background:red;color:#fff;border-radius:50%;
        padding:2px 6px;cursor:pointer">✖</span>`;
    d.querySelector("span").onclick=()=>{
      editImages.splice(i,1);
      renderEditImages();
    };
    d.ondragstart=e=>e.dataTransfer.setData("i",i);
    d.ondragover=e=>e.preventDefault();
    d.ondrop=e=>{
      const from=e.dataTransfer.getData("i");
      [editImages[from],editImages[i]]=[editImages[i],editImages[from]];
      renderEditImages();
    };
    box.appendChild(d);
  });
}

document.getElementById("save-edit").onclick=async()=>{
  if(!editItem||!session())return;
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
  closeEdit();loadListings();
};

window.closeEdit=()=>
  document.getElementById("edit-modal-bg").classList.remove("active");

const e=id=>document.getElementById(id).value;

/* ================= DELETE ================= */
async function deleteListing(id){
  if(!session()||!confirm("Delete this listing?"))return;
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