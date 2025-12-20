/***********************
 * GLOBALS
 ***********************/
const API_URL = "/api"; // change if needed
const itemsContainer = document.getElementById("items-container");
const editModalBg = document.getElementById("edit-modal-bg");
const editForm = document.getElementById("edit-form");
const saveEditBtn = document.getElementById("save-edit");
const sellerModalBg = document.getElementById("seller-modal-bg");
const sellerContent = document.getElementById("seller-content");
const toastBox = document.getElementById("toast");

let listings = [];
let currentEditItem = null;

/***********************
 * AUTH HELPERS
 ***********************/
function getSession() {
  try {
    return JSON.parse(localStorage.getItem("session"));
  } catch {
    return null;
  }
}

function requireLogin() {
  const s = getSession();
  if (!s) {
    toast("Please login first", true);
    return null;
  }
  return s;
}

/***********************
 * TOAST
 ***********************/
function toast(msg, err = false) {
  toastBox.textContent = msg;
  toastBox.style.background = err ? "#c0392b" : "#27ae60";
  toastBox.classList.add("show");
  setTimeout(() => toastBox.classList.remove("show"), 2500);
}

/***********************
 * LOAD LISTINGS
 ***********************/
async function loadListings() {
  itemsContainer.innerHTML = "";
  try {
    const res = await fetch(`${API_URL}/listings`);
    listings = await res.json();
    listings.forEach(renderCard);
  } catch {
    toast("Failed to load listings", true);
  }
}

/***********************
 * RENDER CARD
 ***********************/
function renderCard(item) {
  const session = getSession();
  const isOwner = session && session.userId === item.sellerId;

  const card = document.createElement("div");
  card.className = "item-card show";

  card.innerHTML = `
    ${item.rating ? `<div class="rating-badge">⭐ ${item.rating}</div>` : ""}
    ${item.verified === 1 ? `<div class="verified-badge">Verified</div>` : ""}
    ${item.badge ? `<div class="badge-badge">${item.badge}</div>` : ""}

    <div class="item-info">
      <strong>${item.account_title || "BGMI Account"}</strong><br>
      UID: ${item.bgmi_uid || "-"}<br>
      Level: ${item.account_level || "-"}<br>
      Highest Rank: ${item.highest_rank || "-"}<br>
      Gilt Items: ${item.gilt_items || 0}<br>
      Upgraded Guns: ${item.upgraded_guns || 0}<br>
      Mythic Items: ${item.mythic_items || 0}<br>
      Legendary Items: ${item.legendary_items || 0}<br>
      Titles: ${item.titles || "-"}<br>
      <em>${item.account_highlights || ""}</em>
    </div>

    <div class="price">₹${item.price}</div>

    <div class="images-gallery">
      ${(item.images || []).map(
        img => `<img src="${img}" onclick="openImg('${img}')">`
      ).join("")}
    </div>

    <button class="btn outline seller-btn">Seller Profile</button>

    ${isOwner ? `
      <button class="btn edit-btn">Edit</button>
      <button class="btn delete-btn">Delete</button>
    ` : `
      <button class="btn buy-btn">Buy</button>
    `}
  `;

  // seller profile
  card.querySelector(".seller-btn").onclick = () =>
    openSeller(item.sellerId);

  if (isOwner) {
    card.querySelector(".edit-btn").onclick = () => openEdit(item);
    card.querySelector(".delete-btn").onclick = () => deleteListing(item.id);
  }

  itemsContainer.appendChild(card);
}

/***********************
 * IMAGE MODAL
 ***********************/
window.openImg = src => {
  const m = document.getElementById("imgModal");
  document.getElementById("imgPreview").src = src;
  m.classList.add("active");
};

/***********************
 * SELLER PROFILE
 ***********************/
async function openSeller(id) {
  sellerModalBg.classList.add("active");
  sellerContent.innerHTML = "Loading...";

  try {
    const res = await fetch(`${API_URL}/sellers/${id}`);
    const s = await res.json();

    sellerContent.innerHTML = `
      <h3>${s.name}</h3>
      ${s.verified === 1 ? `<span class="verified-badge">Verified</span>` : ""}
      ${s.badge ? `<span class="badge-badge">${s.badge}</span>` : ""}
      <p>Total Sales: ${s.total_sales}</p>
      <p>Reviews: ${s.review_count}</p>
      <button class="btn outline">Chat (Coming Soon)</button>
    `;
  } catch {
    sellerContent.innerHTML = "Failed to load seller";
  }
}

window.closeSeller = () =>
  sellerModalBg.classList.remove("active");

/***********************
 * EDIT LISTING
 ***********************/
function openEdit(item) {
  currentEditItem = item;
  editModalBg.classList.add("active");

  editForm.innerHTML = `
    <input value="${item.account_title || ""}" id="e-title" placeholder="Account Title">
    <input value="${item.price}" id="e-price" type="number" placeholder="Price">
    <textarea id="e-highlights" placeholder="Account Highlights">${item.account_highlights || ""}</textarea>

    <div id="e-images-container"></div>
    <button class="btn outline" id="add-image">Add Image</button>
  `;

  const imgBox = document.getElementById("e-images-container");
  (item.images || []).forEach(addEditImage);

  document.getElementById("add-image").onclick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => addEditImage(reader.result);
      reader.readAsDataURL(file);
    };
    input.click();
  };
}

function addEditImage(src) {
  const imgBox = document.getElementById("e-images-container");
  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.innerHTML = `
    <img src="${src}" style="width:60px;height:60px;border-radius:8px">
    <span style="position:absolute;top:-6px;right:-6px;
      background:red;color:#fff;border-radius:50%;
      padding:2px 6px;cursor:pointer">×</span>
  `;
  wrap.querySelector("span").onclick = () => wrap.remove();
  imgBox.appendChild(wrap);
}

window.closeEdit = () =>
  editModalBg.classList.remove("active");

/***********************
 * SAVE EDIT
 ***********************/
saveEditBtn.onclick = async () => {
  const s = requireLogin();
  if (!s) return;

  const imgs = [...document.querySelectorAll("#e-images-container img")]
    .map(i => i.src);

  await fetch(`${API_URL}/listings/${currentEditItem.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s.token}`
    },
    body: JSON.stringify({
      account_title: document.getElementById("e-title").value,
      price: document.getElementById("e-price").value,
      account_highlights: document.getElementById("e-highlights").value,
      images: imgs
    })
  });

  toast("Listing updated");
  closeEdit();
  loadListings();
};

/***********************
 * DELETE LISTING ✅ FIXED
 ***********************/
async function deleteListing(id) {
  const s = requireLogin();
  if (!s || !confirm("Delete this listing?")) return;

  await fetch(`${API_URL}/listings/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${s.token}` }
  });

  toast("Listing deleted");
  loadListings();
}

/***********************
 * INIT
 ***********************/
loadListings();