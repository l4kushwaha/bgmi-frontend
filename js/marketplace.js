(() => {
  /* ================= CONFIG ================= */
  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api";
  const container = document.getElementById("items-container");
  const toastBox = document.getElementById("toast");
  const searchInput = document.getElementById("search");
  const filterSelect = document.getElementById("filter");

  let currentSearch = "";
  let currentFilter = "";
  let editListing = null;

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

  const toast = msg => {
    toastBox.textContent = msg;
    toastBox.classList.add("show");
    setTimeout(() => toastBox.classList.remove("show"), 2500);
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

  const requireLogin = () => {
    const s = session();
    if (!s) {
      alert("Please login first");
      location.href = "login.html";
      return null;
    }
    return s;
  };

  const isOwner = sellerId => {
    const s = session();
    return s && String(s.user.seller_id) === String(sellerId);
  };

  const stars = r => {
    const n = Math.round(r || 0);
    return "★".repeat(n) + "☆".repeat(5 - n);
  };

  /* ================= IMAGE COMPRESSION ================= */
  const compressImage = file =>
    new Promise(res => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = e => (img.src = e.target.result);
      reader.readAsDataURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const scale = Math.min(1, 900 / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        res(canvas.toDataURL("image/jpeg", 0.7));
      };
    });

  /* ================= LOAD LISTINGS ================= */
  async function loadListings() {
    container.innerHTML = "";

    const res = await fetch(`${API_URL}/listings`);
    let items = await res.json();
    if (!Array.isArray(items)) items = [];

    if (currentSearch) {
      items = items.filter(i =>
        `${i.uid} ${i.title} ${i.highest_rank || ""}`
          .toLowerCase()
          .includes(currentSearch)
      );
    }

    const s = session();
    if (currentFilter === "own" && s) {
      items = items.filter(
        i => String(i.seller_id) === String(s.user.seller_id)
      );
    }
    if (currentFilter === "price_low") items.sort((a,b)=>a.price-b.price);
    if (currentFilter === "price_high") items.sort((a,b)=>b.price-a.price);
    if (currentFilter === "new") items.sort((a,b)=>b.id-a.id);

    items.forEach(renderCard);
  }

  /* ================= CARD ================= */
  function renderCard(item) {
    const card = document.createElement("div");
    card.className = "item-card";

    const images = safeArray(item.images);
    let index = 0;

    card.innerHTML = `
      <div class="images-gallery">
        ${images.map((i,n)=>`<img src="${i}" class="${n===0?"active":""}">`).join("")}
        <button class="img-nav left">‹</button>
        <button class="img-nav right">›</button>
      </div>

      <div class="card-content">
        <div>${stars(item.avg_rating)}</div>
        <strong>${item.title}</strong><br>
        UID: ${item.uid}<br>
        Level: ${item.level}<br>
        Rank: ${item.highest_rank || "-"}
        <div class="price">₹${item.price}</div>
      </div>

      <div class="card-actions">
        <button class="btn outline seller-btn">Seller Profile</button>
        ${
          isOwner(item.seller_id)
            ? `<button class="btn edit-btn">Edit</button>
               <button class="btn delete-btn">Delete</button>`
            : `<button class="btn buy-btn">Buy</button>`
        }
      </div>
    `;

    const imgs = card.querySelectorAll("img");
    const show = i => {
      imgs.forEach(im=>im.classList.remove("active"));
      imgs[i].classList.add("active");
      index=i;
    };

    setInterval(()=>show((index+1)%imgs.length),3500);
    card.querySelector(".left").onclick=()=>show((index-1+imgs.length)%imgs.length);
    card.querySelector(".right").onclick=()=>show((index+1)%imgs.length);

    card.querySelector(".seller-btn").onclick=()=>openSellerProfile(item.seller_id);
    if (isOwner(item.seller_id)) {
      card.querySelector(".edit-btn").onclick=()=>openEdit(item);
      card.querySelector(".delete-btn").onclick=()=>deleteListing(item.id);
    } else {
      card.querySelector(".buy-btn").onclick=()=>{
        const s=requireLogin(); if(!s)return;
        toast("Buy feature coming soon");
      };
    }

    container.appendChild(card);
  }

  /* ================= SELLER ================= */
  window.openSellerProfile = async sellerId => {
    const bg=document.getElementById("seller-modal-bg");
    const c=document.getElementById("seller-content");
    bg.classList.add("active");
    const r=await fetch(`${API_URL}/seller/${sellerId}`);
    const s=await r.json();
    c.innerHTML=`
      <h3>${s.name}</h3>
      <p>Rating: ${stars(s.avg_rating)}</p>
      <button class="btn outline" onclick="alert('Chat coming soon')">💬 Chat</button>
    `;
  };
  window.closeSeller=()=>document.getElementById("seller-modal-bg").classList.remove("active");

  /* ================= EDIT ================= */
  function openEdit(item){
    editListing=item;
    document.getElementById("edit-modal-bg").classList.add("active");
    const f=document.getElementById("edit-form");
    const arr=v=>safeArray(v).join(", ");

    f.innerHTML=`
      <input id="e-title" value="${item.title}">
      <input id="e-price" value="${item.price}">
      <textarea id="e-upgraded">${arr(item.upgraded_guns)}</textarea>
      <textarea id="e-mythic">${arr(item.mythic_items)}</textarea>
      <textarea id="e-legendary">${arr(item.legendary_items)}</textarea>
      <textarea id="e-gifts">${arr(item.gift_items)}</textarea>
      <textarea id="e-titles">${arr(item.titles)}</textarea>
      <textarea id="e-highlights">${item.account_highlights||""}</textarea>
      <div id="e-images" style="display:flex;gap:8px;flex-wrap:wrap"></div>
      <input type="file" id="imgAdd" multiple>
    `;

    const box=document.getElementById("e-images");
    safeArray(item.images).forEach(addImg);

    document.getElementById("imgAdd").onchange=async e=>{
      for(const f of e.target.files){
        addImg(await compressImage(f));
      }
    };

    function addImg(src){
      const d=document.createElement("div");
      d.draggable=true;
      d.style.position="relative";
      d.innerHTML=`<img src="${src}" style="width:70px;height:70px;border-radius:8px">
      <span style="position:absolute;top:-6px;right:-6px;background:red;color:#fff;border-radius:50%;cursor:pointer;padding:2px 6px">×</span>`;
      d.querySelector("span").onclick=()=>d.remove();
      box.appendChild(d);
    }
  }

  window.closeEdit=()=>document.getElementById("edit-modal-bg").classList.remove("active");

  document.getElementById("save-edit").onclick=async()=>{
    const imgs=[...document.querySelectorAll("#e-images img")].map(i=>i.src);
    await fetch(`${API_URL}/listings/${editListing.id}`,{
      method:"PUT",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${session().token}`
      },
      body:JSON.stringify({
        title:e("e-title"),
        price:e("e-price"),
        upgraded_guns:e("e-upgraded").split(","),
        mythic_items:e("e-mythic").split(","),
        legendary_items:e("e-legendary").split(","),
        gift_items:e("e-gifts").split(","),
        titles:e("e-titles").split(","),
        account_highlights:e("e-highlights"),
        images:imgs
      })
    });
    closeEdit(); toast("Listing updated"); loadListings();
  };

  const e=id=>document.getElementById(id).value;

  async function deleteListing(id){
    if(!confirm("Delete?"))return;
    await fetch(`${API_URL}/listings/${id}`,{
      method:"DELETE",
      headers:{Authorization:`Bearer ${session().token}`}
    });
    toast("Deleted"); loadListings();
  }

  searchInput?.addEventListener("input",e=>{
    currentSearch=e.target.value.toLowerCase(); loadListings();
  });
  filterSelect?.addEventListener("change",e=>{
    currentFilter=e.target.value; loadListings();
  });

  loadListings();
})();