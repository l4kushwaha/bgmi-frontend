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
  function showToast(msg, err = false) {
    toast.textContent = msg;
    toast.className = err ? "err" : "";
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
      d.innerHTML = `<img src="${src}"><div class="remove">×</div>`;
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
  const rankValues = {
    gold: 10,
    platinum: 30,
    ace: 50,
    diamond: 40,
    conquer: 200
  };

  function estimatePrice() {
  const level = +document.getElementById("level").value || 0;
  const rank = document.getElementById("rank").value.trim().toLowerCase();

  const mythicArray = document.getElementById("mythic")?.value.split(",").map(s => s.trim()).filter(Boolean) || [];
  const legendaryArray = document.getElementById("legendary")?.value.split(",").map(s => s.trim()).filter(Boolean) || [];
  const giftArray = document.getElementById("gift")?.value.split(",").map(s => s.trim()).filter(Boolean) || [];
  const gunsArray = document.getElementById("guns")?.value.split(",").map(s => s.trim()).filter(Boolean) || [];
  const titlesArray = document.getElementById("titles")?.value.split(",").map(s => s.trim()).filter(Boolean) || [];

  let price = 0;
  price += level * 8;
  price += rankValues[rank] || 0;
  price += mythicArray.length * 500;
  price += legendaryArray.length * 280;
  price += giftArray.length * 500;
  price += titlesArray.length * 400;
  price += gunsArray.length * 900;

  price = Math.max(999, Math.round(price / 50) * 50);

  const out = document.getElementById("estimatedPrice");
  out.textContent = `Estimated price: ₹${price}`;
  out.dataset.value = price;
  return price;
}


  estimateBtn.onclick = estimatePrice;

  // ===== SUBMIT =====
  form.onsubmit = async e => {
    e.preventDefault();
    const price = estimatePrice();

    const payload = {
      uid: document.getElementById("uid").value.trim(),
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("highlights").value.trim(),
      price,
      level: +document.getElementById("level").value || 0,
      highest_rank: document.getElementById("rank")?.value || "",
      mythic_items: document.getElementById("mythic")?.value.split(",").map(s => s.trim()).filter(Boolean),
      legendary_items: document.getElementById("legendary")?.value.split(",").map(s => s.trim()).filter(Boolean),
      gift_items: document.getElementById("gift")?.value.split(",").map(s => s.trim()).filter(Boolean),
      upgraded_guns: document.getElementById("guns")?.value.split(",").map(s => s.trim()).filter(Boolean),
      titles: document.getElementById("titles")?.value.split(",").map(s => s.trim()).filter(Boolean),
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
      showToast(err.error || err.message || "Listing failed", true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "List for Sale";
    }
  };
})();
