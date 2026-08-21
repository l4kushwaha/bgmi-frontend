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

  // ===== PRICE ESTIMATOR (server-driven via /api/price-config) =====
  // Default prices (MUST match server defaults in marketplace_service/index.js PRICE_DEFAULTS)
  const PRICE_DEFAULTS = {
    level_per: 8,
    rank_gold: 10, rank_platinum: 30, rank_ace: 50, rank_diamond: 40, rank_conquer: 200,
    mythic: 180, legendary: 100, gift: 1000, titles: 100, guns: 300,
    x_suit: 400, supercar: 1500, ultimate: 250,
    min_price: 999, round_to: 50, pop_per_point: 1
  };
  const PRICE = { ...PRICE_DEFAULTS };
  const rankKeys = { gold: "rank_gold", platinum: "rank_platinum", ace: "rank_ace", diamond: "rank_diamond", conquer: "rank_conquer" };

  let priceConfigLoaded = false;
  let priceConfigSyncInterval = null;

  async function loadPriceConfig() {
    try {
      const res = await fetch("https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/price-config");
      if (res.ok) {
        const cfg = await res.json();
        if (cfg && typeof cfg === "object") {
          Object.assign(PRICE, cfg);
          priceConfigLoaded = true;
          console.log("[Price Config] Loaded from server:", cfg);
        }
      } else {
        throw new Error(`Server returned ${res.status}`);
      }
    } catch (err) {
      console.warn("[Price Config] Failed to load from server, using defaults:", err.message);
      Object.assign(PRICE, PRICE_DEFAULTS);
      priceConfigLoaded = true;
      // Show subtle warning to user
      const out = document.getElementById("estimatedPrice");
      if (out && !out.textContent) {
        out.textContent = "⚠️ Using cached prices (offline mode)";
        out.style.color = "var(--accent-secondary)";
      }
    }
  }

  // Initial load
  await loadPriceConfig();

  // Periodic sync every 5 minutes to keep prices in sync with server
  priceConfigSyncInterval = setInterval(loadPriceConfig, 5 * 60 * 1000);

  // Cleanup on page unload
  window.addEventListener("beforeunload", () => {
    if (priceConfigSyncInterval) clearInterval(priceConfigSyncInterval);
  });

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
    price += level * PRICE.level_per;
    price += PRICE[rankKeys[rank]] || 0;
    price += mythicArray.length * PRICE.mythic;
    price += legendaryArray.length * PRICE.legendary;
    price += giftArray.length * PRICE.gift;
    price += titlesArray.length * PRICE.titles;
    price += gunsArray.length * PRICE.guns;
    price += xSuitArray.length * PRICE.x_suit;
    price += supercarArray.length * PRICE.supercar;
    price += ultimateArray.length * PRICE.ultimate;
    price = Math.max(PRICE.min_price || 0, Math.round(price / PRICE.round_to) * PRICE.round_to);
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

  // ===== BOOST ITEM PRESETS =====
  const boostItem = document.getElementById("boostItem");
  boostItem.onchange = () => {
    const val = boostItem.value;
    const popPoints = document.getElementById("popPoints");
    const popTitle = document.getElementById("popTitle");
    const price = document.getElementById("price");
    if (val === "custom") { popPoints.value = ""; popPoints.focus(); return; }
    if (!val) return;
    const [points, name] = val.split("|");
    popPoints.value = points;
    popTitle.value = `🔥 Instant ${Number(points).toLocaleString("en-IN")} Popularity Boost (${name})`;
    if (!price.value) price.value = Number(points) * (PRICE.pop_per_point || 1); // auto price per point
  };

  // Add info note for popularity selling flow
  const secPopularity = document.getElementById("secPopularity");
  if (secPopularity && !document.getElementById("popFlowNote")) {
    const note = document.createElement("div");
    note.id = "popFlowNote";
    note.style.cssText = "margin-top: 1rem; padding: 1rem; background: rgba(0, 234, 255, 0.1); border: 1px solid var(--border-primary); border-radius: var(--radius-md); font-size: 0.8rem; color: var(--accent-primary);";
    note.innerHTML = `
      <strong>📋 How Popularity Selling Works:</strong>
      <ol style="margin: 0.5rem 0 0 1.25rem; line-height: 1.8;">
        <li>You list the popularity boost service (points + price)</li>
        <li>Buyer purchases and enters <strong>THEIR BGMI UID</strong> at checkout</li>
        <li>You deliver the boost to that UID</li>
        <li>Admin verifies → payment released to you</li>
      </ol>
      <em>You don't need to know the buyer's UID when creating the listing.</em>
    `;
    secPopularity.appendChild(note);
  }

  // Quick-pick chips <-> select sync
  const chips = document.getElementById("boostChips");
  if (chips) {
    chips.addEventListener("click", e => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      chips.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === btn));
      boostItem.value = btn.dataset.val;
      boostItem.dispatchEvent(new Event("change"));
    });
  }

  // ===== MEETUP TOGGLE =====
  const meetupEnabled = document.getElementById("meetupEnabled");
  const meetupFields = document.getElementById("meetupFields");
  meetupEnabled.onchange = () => {
    meetupFields.style.display = meetupEnabled.checked ? "block" : "none";
    if (meetupEnabled.checked && !document.getElementById("sellerCity").value.trim()) {
      document.getElementById("sellerCity").focus();
    }
  };

  // ===== SUBMIT LISTING =====
  form.onsubmit = async e => {
    e.preventDefault();

    const uid = document.getElementById("uid").value.trim();
    const title = document.getElementById("title").value.trim();

    let payload;
    if (category === "popularity") {
      const points = Number(document.getElementById("popPoints").value);
      const popTitle = document.getElementById("popTitle").value.trim();
      if (!Number.isFinite(points) || points < 1) return showToast("Enter valid popularity points", true);
      if (!popTitle) return showToast("Boost title is required", true);

      let price = Number(document.getElementById("price").value);
      if (!price) price = Number(points) * (PRICE.pop_per_point || 1); // auto: per-point price
      if (!Number.isFinite(price) || price < 1) return showToast("Enter a valid price (₹)", true);

      payload = {
        category: "popularity",
        points,
        title: popTitle,
        description: document.getElementById("highlights")?.value.trim() || "",
        delivery_time: document.getElementById("deliveryTime")?.value.trim() || "",
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
        images,
        meetup_available: meetupEnabled.checked ? 1 : 0,
        city: (meetupEnabled.checked ? document.getElementById("sellerCity").value.trim() : "") || null
      };
    }

    // optional meetup fields when enabled for popularity too
    if (meetupEnabled.checked && !payload.meetup_available) {
      payload.meetup_available = 1;
      payload.city = document.getElementById("sellerCity").value.trim() || null;
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

  // Prefill from query params (?cat=popularity&points=750&title=...)
  try {
    const qp = new URLSearchParams(location.search);
    if (qp.get("cat") === "popularity") {
      setCategory("popularity");
      const pts = qp.get("points");
      const t = qp.get("title");
      if (pts) {
        document.getElementById("popPoints").value = pts;
        boostItem.value = "custom";
        if (!document.getElementById("price").value) document.getElementById("price").value = Number(pts) * (PRICE.pop_per_point || 1);
      }
      if (t) document.getElementById("popTitle").value = t;
      const customChip = chips?.querySelector('.chip[data-val="custom"]');
      if (customChip) customChip.classList.add("active");
    }
  } catch {}
})();
