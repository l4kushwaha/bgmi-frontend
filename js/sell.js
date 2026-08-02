(() => {
  const API_BASE = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/listings";
  const form = document.getElementById("sellForm");
  const estimateBtn = document.getElementById("estimateBtn");
  const submitBtn = document.getElementById("submitBtn");
  const preview = document.getElementById("preview");
  const toast = document.getElementById("toast");

  // ===== SESSION =====
  function getSession() {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user") || "null");
      return token && user ? { token, user } : null;
    } catch {
      return null;
    }
  }
  const session = getSession();
  if (!session) {
    alert("Login required");
    location.href = "login.html";
    return;
  }

  // ===== TOAST =====
  function showToast(msg, error = false) {
    toast.textContent = msg;
    toast.style.background = error ? "#c0392b" : "#27ae60";
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 3200);
  }

  // ===== IMAGE UPLOAD =====
  let images = [];
  const dropArea = document.getElementById("drop-area");
  const fileElem = document.getElementById("fileElem");

  function renderPreview() {
    preview.innerHTML = "";
    images.forEach((src, i) => {
      const d = document.createElement("div");
      d.className = "preview-img";
      d.innerHTML = `<img src="${src}" class="item-img"><div class="remove">×</div>`;
      d.querySelector(".remove").onclick = () => {
        images.splice(i, 1);
        renderPreview();
      };
      preview.appendChild(d);
    });
  }

  function handleFiles(files) {
    [...files].forEach(f => {
      if (!f.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = e => {
        images.push(e.target.result);
        renderPreview();
      };
      reader.readAsDataURL(f);
    });
  }

  dropArea.onclick = () => fileElem.click();
  dropArea.ondrop = e => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  dropArea.ondragover = e => e.preventDefault();
  fileElem.onchange = e => handleFiles(e.target.files);

  // ===== PRICE ESTIMATOR =====
  const rankValues = { gold: 10, platinum: 30, ace: 50, diamond: 40, conquer: 200 };
  function calcEstimate() {
    const level = +document.getElementById("level").value || 0;
    const rank = document.getElementById("rank").value.trim().toLowerCase();
    const mythicArray = (document.getElementById("mythic")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const legendaryArray = (document.getElementById("legendary")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const giftArray = (document.getElementById("honor_gift")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const gunsArray = (document.getElementById("guns")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const titlesArray = (document.getElementById("titles")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const xSuitArray = (document.getElementById("x_suit")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const supercarArray = (document.getElementById("supercar")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const ultimateArray = (document.getElementById("ultimate")?.value || "").split(",").map(s => s.trim()).filter(Boolean);

    let price = 0;
    price += level * 8;
    price += rankValues[rank] || 0;
    price += mythicArray.length * 180;
    price += legendaryArray.length * 100;
    price += giftArray.length * 1000;
    price += titlesArray.length * 100;
    price += gunsArray.length * 300;
    price += xSuitArray.length * 400;
    price += supercarArray.length * 1500;
    price += ultimateArray.length * 250;
    price = Math.max(999, Math.round(price / 50) * 50);
    return price;
  }

  function estimatePrice() {
    const price = calcEstimate();
    const priceInput = document.getElementById("price");
    const out = document.getElementById("estimatedPrice");
    priceInput.value = price;
    out.textContent = `⚡ Estimated ₹${price} — adjust the price above if needed`;
    showToast(`Estimated price: ₹${price}`);
    priceInput.focus();
  }
  estimateBtn.onclick = estimatePrice;

  // Auto-fill estimate when price is empty on submit
  document.getElementById("price").addEventListener("input", () => {
    const out = document.getElementById("estimatedPrice");
    if (document.getElementById("price").value) out.textContent = "";
  });

  // ===== CATEGORY TOGGLE =====
  let category = "account";
  const catAccount = document.getElementById("catAccount");
  const catPopularity = document.getElementById("catPopularity");
  const secAccount = document.getElementById("secAccount");
  const secItems = document.getElementById("secItems");
  const secPopularity = document.getElementById("secPopularity");

  function setCategory(cat) {
    category = cat;
    catAccount.classList.toggle("active", cat === "account");
    catPopularity.classList.toggle("active", cat === "popularity");
    secAccount.classList.toggle("hidden-sec", cat !== "account");
    secItems.classList.toggle("hidden-sec", cat !== "account");
    secPopularity.classList.toggle("hidden-sec", cat !== "popularity");
    const titleEl = document.querySelector(".title");
    if (cat === "popularity") {
      titleEl.textContent = "Sell Your Popularity";
      titleEl.setAttribute("data-text", "Sell Your Popularity");
      document.querySelector(".subtitle").textContent = "Boost kisi bhi BGMI player ki popularity — direct UPI payment 🔥";
    } else {
      titleEl.textContent = "Sell Your BGMI Account";
      titleEl.setAttribute("data-text", "Sell Your BGMI Account");
      document.querySelector(".subtitle").textContent = "List your account &amp; get paid directly via UPI 🚀";
    }
  }
  catAccount.onclick = () => setCategory("account");
  catPopularity.onclick = () => setCategory("popularity");

  // ===== SUBMIT LISTING =====
  form.onsubmit = async e => {
    e.preventDefault();

    const uid = document.getElementById("uid").value.trim();
    const title = document.getElementById("title").value.trim();

    let payload;
    if (category === "popularity") {
      const popUid = document.getElementById("popUid").value.trim();
      const points = Number(document.getElementById("popPoints").value);
      const popTitle = document.getElementById("popTitle").value.trim();
      if (!/^\d{1,12}$/.test(popUid)) return showToast("Enter a valid player UID (digits only)", true);
      if (!Number.isFinite(points) || points < 1) return showToast("Enter valid popularity points", true);
      if (!popTitle) return showToast("Boost title is required", true);

      let price = Number(document.getElementById("price").value);
      if (!price) price = points; // auto: ₹1 per point base
      if (!Number.isFinite(price) || price < 1) return showToast("Enter a valid price (₹)", true);

      payload = {
        category: "popularity",
        points,
        uid: popUid,
        title: popTitle,
        description: document.getElementById("highlights")?.value.trim() || "",
        price,
        images
      };
    } else {
      if (!/^\d{1,12}$/.test(uid)) return showToast("Enter a valid BGMI UID (digits only)", true);
      if (!title) return showToast("Account title is required", true);

      let price = Number(document.getElementById("price").value);
      if (!price) price = calcEstimate();
      if (!Number.isFinite(price) || price < 1) return showToast("Enter a valid price (₹)", true);

      payload = {
        category: "account",
        uid,
        title,
        description: document.getElementById("highlights")?.value.trim() || "",
        price,
        level: +document.getElementById("level").value || 0,
        highest_rank: document.getElementById("rank")?.value || "",
        mythic_items: (document.getElementById("mythic")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        legendary_items: (document.getElementById("legendary")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        honor_gift: (document.getElementById("honor_gift")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        upgraded_guns: (document.getElementById("guns")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        titles: (document.getElementById("titles")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        x_suit: (document.getElementById("x_suit")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        supercar: (document.getElementById("supercar")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        ultimate: (document.getElementById("ultimate")?.value || "").split(",").map(s => s.trim()).filter(Boolean),
        images
      };
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Listing...";

    try {
      const res = await fetch(`${API_BASE}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw data;

      showToast("🎉 Listing created successfully");
      form.reset();
      images = [];
      renderPreview();
      document.getElementById("estimatedPrice").textContent = "";
    } catch (err) {
      console.error(err);
      showToast(err.error || err.message || "Listing failed", true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "List for Sale";
    }
  };
})();
