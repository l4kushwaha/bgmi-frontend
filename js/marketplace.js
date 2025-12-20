/******************** CONFIG ********************/
const API_URL = "http://localhost:5000/api";
const itemsContainer = document.getElementById("items-container");
const toastBox = document.getElementById("toast");

/******************** HELPERS ********************/
const session = () => JSON.parse(localStorage.getItem("session"));
const isOwner = sellerId => session()?.user?.id === sellerId;

const toast = msg => {
  toastBox.textContent = msg;
  toastBox.classList.add("show");
  setTimeout(() => toastBox.classList.remove("show"), 2500);
};

const stars = r =>
  "★".repeat(Math.round(r || 0)) +
  "☆".repeat(5 - Math.round(r || 0));

/******************** LOAD LISTINGS ********************/
async function loadListings() {
  itemsContainer.innerHTML = "";
  const res = await fetch(`${API_URL}/listings`);
  const data = await res.json();
  data.forEach(renderCard);
}
loadListings();

/******************** RENDER CARD ********************/
function renderCard(item) {
  const card = document.createElement("div");
  card.className = "item-card show";

  const verified =
    item.seller?.verified === 1
      ? `<div class="verified-badge">Verified</div>`
      : "";

  const badge = item.seller?.badge
    ? `<div class="badge-badge">${item.seller.badge}</div>`
    : "";

  card.innerHTML = `
    <div class="rating-badge">${stars(item.rating || 0)}</div>
    ${verified}
    ${badge}

    <div class="item-info">
      <strong>${item.title}</strong><br>
      BGMI UID: ${item.uid}<br>
      Level: ${item.level}<br>
      Rank: ${item.highest_rank}<br>
      Guns: ${item.upgraded_guns || "-"}<br>
      Mythic: ${item.mythic_items || 0},
      Legendary: ${item.legendary_items || 0}<br>
      Highlights: ${item.highlights || "-"}
    </div>

    <div class="price">₹${item.price}</div>

    <div class="images-gallery">
      ${(item.images || [])
        .map(
          i => `<img src="${i}" onclick="previewImg('${i}')">`
        )
        .join("")}
    </div>

    <button class="btn outline seller-btn">Seller Profile</button>

    ${
      isOwner(item.seller_id)
        ? `
      <button class="btn edit-btn">Edit</button>
      <button class="btn delete-btn">Delete</button>
    `
        : `<button class="btn buy-btn">Buy</button>`
    }
  `;

  // EVENTS
  card.querySelector(".seller-btn").onclick = () =>
    openSeller(item.seller);

  if (isOwner(item.seller_id)) {
    card.querySelector(".edit-btn").onclick = () => openEdit(item);
    card.querySelector(".delete-btn").onclick = () =>
      deleteListing(item.id);
  }

  itemsContainer.appendChild(card);
}

/******************** IMAGE PREVIEW ********************/
window.previewImg = src => {
  document.getElementById("imgPreview").src = src;
  document.getElementById("imgModal").classList.add("active");
};

/******************** SELLER PROFILE ********************/
window.openSeller = seller => {
  document.getElementById("seller-modal-bg").classList.add("active");

  document.getElementById("seller-content").innerHTML = `
    <h3>${seller.name}</h3>
    <p>Status: ${
      seller.verified === 1 ? "Verified" : "Pending"
    }</p>
    <p>Badge: ${seller.badge || "-"}</p>
    <p>Total Sales: ${seller.total_sales || 0}</p>
    <p>Reviews: ${seller.review_count || 0}</p>
    <button class="btn outline">Chat (coming soon)</button>
  `;
};

window.closeSeller = () =>
  document
    .getElementById("seller-modal-bg")
    .classList.remove("active");

/******************** EDIT LISTING ********************/
let editImages = [];
let editId = null;

window.openEdit = item => {
  editId = item.id;
  editImages = [...(item.images || [])];

  document.getElementById("edit-modal-bg").classList.add("active");

  document.getElementById("edit-form").innerHTML = `
    <input id="e-title" value="${item.title}">
    <input id="e-uid" value="${item.uid}">
    <input id="e-level" value="${item.level}">
    <input id="e-rank" value="${item.highest_rank}">
    <input id="e-guns" value="${item.upgraded_guns || ""}">
    <input id="e-mythic" value="${item.mythic_items || 0}">
    <input id="e-legend" value="${item.legendary_items || 0}">
    <textarea id="e-highlights">${
      item.highlights || ""
    }</textarea>
    <input id="e-price" value="${item.price}">

    <input type="file" id="imgAdd" multiple>
    <div id="e-images-container"></div>
  `;

  document.getElementById("imgAdd").onchange = e => {
    [...e.target.files].forEach(f => {
      const r = new FileReader();
      r.onload = ev => {
        editImages.push(ev.target.result);
        renderEditImages();
      };
      r.readAsDataURL(f);
    });
  };

  renderEditImages();
};

function renderEditImages() {
  document.getElementById("e-images-container").innerHTML =
    editImages
      .map(
        (i, idx) => `
      <div style="position:relative">
        <img src="${i}" width="60">
        <span onclick="removeEditImg(${idx})"
         style="position:absolute;top:-6px;right:-6px;
         cursor:pointer;background:red;color:#fff;
         border-radius:50%;padding:2px 6px">×</span>
      </div>`
      )
      .join("");
}

window.removeEditImg = i => {
  editImages.splice(i, 1);
  renderEditImages();
};

document.getElementById("save-edit").onclick = async () => {
  await fetch(`${API_URL}/listings/${editId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session().token}`,
    },
    body: JSON.stringify({
      title: e("e-title"),
      uid: e("e-uid"),
      level: e("e-level"),
      highest_rank: e("e-rank"),
      upgraded_guns: e("e-guns"),
      mythic_items: e("e-mythic"),
      legendary_items: e("e-legend"),
      highlights: e("e-highlights"),
      price: e("e-price"),
      images: editImages,
    }),
  });

  closeEdit();
  loadListings();
  toast("Listing updated");
};

const e = id => document.getElementById(id).value;

window.closeEdit = () =>
  document
    .getElementById("edit-modal-bg")
    .classList.remove("active");

/******************** DELETE ********************/
window.deleteListing = async id => {
  if (!confirm("Delete this listing?")) return;
  await fetch(`${API_URL}/listings/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session().token}`,
    },
  });
  toast("Listing deleted");
  loadListings();
};