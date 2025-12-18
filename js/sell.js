(() => {
  const API_BASE = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/listings";
  const form = document.getElementById("sellForm");
  const estimateBtn = document.getElementById("estimateBtn");
  const submitBtn = document.getElementById("submitBtn");
  const preview = document.getElementById("preview");
  const toast = document.getElementById("toast");

  /* ========== SESSION ========== */
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

  /* ========== TOAST ========== */
  function showToast(msg, err = false) {
    toast.textContent = msg;
    toast.className = err ? "err" : "";
    toast.style.display = "block";
    setTimeout(() => (toast.style.display = "none"), 3000);
  }

  /* ========== IMAGE UPLOAD (OPTIONAL) ========== */
  let images = [];
  const dropArea = document.getElementById("drop-area");
  const fileElem = document.getElementById("fileElem");

  function renderPreview() {
    preview.innerHTML = "";
    images.forEach((src, i) => {
      const d = document.createElement("div");
      d.className = "preview-img";
      d.innerHTML = `<img src="${src}"><div class="x">×</div>`;
      d.querySelector(".x").onclick = () => {
        images.splice(i, 1);
        renderPreview();
      };
      preview.appendChild(d);
    });
  }

  function handleFiles(files) {
    [...files].forEach(f => {
      if (!f.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = e => {
        images.push(e.target.result);
        renderPreview();
      };
      r.readAsDataURL(f);
    });
  }

  dropArea.onclick = () => fileElem.click();
  dropArea.ondrop = e => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  dropArea.ondragover = e => e.preventDefault();
  fileElem.onchange = e => handleFiles(e.target.files);

  /* ========== AI-STYLE PRICE ESTIMATOR ========== */
  function estimatePrice() {
    const level = +document.getElementById("level").value || 0;
    const mythic = +document.getElementById("mythic_count").value || 0;
    const legendary = +document.getElementById("legendary_count").value || 0;
    const xsuit = +document.getElementById("xsuit_count").value || 0;
    const guns = +document.getElementById("upgradable_guns").value || 0;
    const titles = +document.getElementById("special_titles").value || 0;

    let price =
      level * 8 +
      mythic * 550 +
      legendary * 280 +
      xsuit * 1800 +
      guns * 900 +
      titles * 150;

    price = Math.max(999, Math.round(price / 50) * 50);

    const out = document.getElementById("estimatedPrice");
    out.textContent = `Estimated price: ₹${price}`;
    out.dataset.value = price;
    return price;
  }

  estimateBtn.onclick = estimatePrice;

  /* ========== SUBMIT ========== */
  form.onsubmit = async e => {
    e.preventDefault();

    const price = estimatePrice();

    const payload = {
      uid: uid.value.trim(),
      title: title.value.trim(),
      description: highlights.value.trim(),
      price,
      level: +level.value || 0,
      highest_rank: rank.value || "",
      mythic_items: Array(+mythic_count.value || 0).fill("Mythic"),
      legendary_items: Array(+legendary_count.value || 0).fill("Legendary"),
      gift_items: [],
      upgraded_guns: Array(+upgradable_guns.value || 0).fill("Gun"),
      titles: Array(+special_titles.value || 0).fill("Title"),
      images
    };

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

      showToast("🎉 Account listed successfully");
      form.reset();
      images = [];
      renderPreview();
      document.getElementById("estimatedPrice").textContent = "";
    } catch (err) {
      console.error(err);
      showToast(err.error || "Listing failed", true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "List for Sale";
    }
  };
})();
