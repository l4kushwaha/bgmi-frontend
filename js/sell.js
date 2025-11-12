(() => {
  // ===== Only run if sellForm exists =====
  const form = document.getElementById("sellForm");
  if (!form) return; // Prevent JS errors on marketplace.html

  const API_URL = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/market";
  let uploadedImages = [];

  // ===== Session / JWT =====
  function getSession() {
    const token = localStorage.getItem("token"); // ✅ correct
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) return null;
    return { token, user };
  }

  const session = getSession();
  if (!session) {
    alert("Login required!");
    window.location.href = "login.html";
  } else {
    console.log("✅ User logged in:", session.user.name || session.user.id);
    console.log("JWT Token:", session.token);
  }

  // ===== Toast =====
  function showToast(msg, success = true) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = success ? "#27ae60" : "#c0392b";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  // ===== Price Estimation =====
  function estimateValue() {
    const fields = ["level","mythic_count","legendary_count","xsuit_count","gilt_count","honor_gilt_set","upgradable_guns","rare_glider","vehicle_skin","special_titles"];
    let price = 0;
    fields.forEach(f => {
      const val = parseInt(document.getElementById(f).value) || 0;
      switch(f){
        case "level": price += val * 10; break;
        case "mythic_count": price += val * 500; break;
        case "legendary_count": price += val * 300; break;
        case "xsuit_count": price += val * 2000; break;
        case "gilt_count": price += val * 150; break;
        case "honor_gilt_set": price += val * 200; break;
        case "upgradable_guns": price += val * 100; break;
        case "rare_glider": price += val * 150; break;
        case "vehicle_skin": price += val * 100; break;
        case "special_titles": price += val * 200; break;
      }
    });
    document.getElementById("estimatedPrice").innerText = `💰 Estimated Value: ₹${price}`;
  }

  // ===== Drag & Drop Images =====
  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("fileElem");
  const preview = document.getElementById("preview");

  dropArea?.addEventListener("click", () => fileInput.click());
  dropArea?.addEventListener("dragover", e => { e.preventDefault(); dropArea.classList.add("hover"); });
  dropArea?.addEventListener("dragleave", e => { e.preventDefault(); dropArea.classList.remove("hover"); });
  dropArea?.addEventListener("drop", e => { e.preventDefault(); dropArea.classList.remove("hover"); handleFiles(e.dataTransfer.files); });
  fileInput?.addEventListener("change", e => handleFiles(e.target.files));

  function handleFiles(files) {
    for (let file of files) {
      if (!file.type.startsWith("image/")) { showToast("❌ Only images allowed", false); continue; }
      const reader = new FileReader();
      reader.onload = e => { uploadedImages.push(e.target.result); updatePreview(); };
      reader.readAsDataURL(file);
    }
  }

  function updatePreview() {
    if (!preview) return;
    preview.innerHTML = "";
    uploadedImages.forEach((img, index) => {
      const div = document.createElement("div");
      div.className = "preview-img";
      div.dataset.index = index;

      const imageElem = document.createElement("img");
      imageElem.src = img;
      imageElem.addEventListener("click", () => openFullModal(img));
      div.appendChild(imageElem);

      const del = document.createElement("span");
      del.innerText = "×";
      del.addEventListener("click", () => { uploadedImages.splice(index, 1); updatePreview(); });
      div.appendChild(del);

      const num = document.createElement("div");
      num.className = "number";
      num.innerText = index + 1;
      div.appendChild(num);

      preview.appendChild(div);
    });
  }

  // ===== Fullscreen Modal =====
  const fullModal = document.getElementById("fullModal");
  const modalImg = document.getElementById("modalImg");

  window.openFullModal = (src) => {
    modalImg.src = src;
    fullModal.style.display = "flex";
  };
  window.closeModal = () => fullModal.style.display = "none";

  // ===== Estimate Price Button =====
  const estimateBtn = form.querySelector("button[onclick='estimateValue()']");
  if (estimateBtn) estimateBtn.addEventListener("click", estimateValue);

  // ===== Form Submit =====
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!session) return;

    const payload = {
      seller_id: session.user?.id || "admin_user",
      uid: document.getElementById("uid").value.trim(),
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("highlights").value.trim(),
      rank: document.getElementById("rank").value.trim(),
      level: parseInt(document.getElementById("level").value) || 0,
      mythic_count: parseInt(document.getElementById("mythic_count").value) || 0,
      legendary_count: parseInt(document.getElementById("legendary_count").value) || 0,
      xsuit_count: parseInt(document.getElementById("xsuit_count").value) || 0,
      gilt_count: parseInt(document.getElementById("gilt_count").value) || 0,
      honor_gilt_set: parseInt(document.getElementById("honor_gilt_set").value) || 0,
      upgradable_guns: parseInt(document.getElementById("upgradable_guns").value) || 0,
      rare_glider: parseInt(document.getElementById("rare_glider").value) || 0,
      vehicle_skin: parseInt(document.getElementById("vehicle_skin").value) || 0,
      special_titles: parseInt(document.getElementById("special_titles").value) || 0,
      images: uploadedImages.length ? uploadedImages : ["https://via.placeholder.com/250x150?text=No+Image"]
    };

    try {
      const res = await fetch(`${API_URL}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast("🎉 Account listed successfully!");
        form.reset();
        uploadedImages = [];
        preview.innerHTML = "";
        document.getElementById("estimatedPrice").innerText = "";
      } else throw new Error(data.error || "Failed to list account");

    } catch (err) {
      console.error(err);
      showToast("❌ " + err.message, false);
    }
  });

})();
