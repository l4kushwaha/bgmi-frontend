// js/sell.js
(() => {
  const API_BASE = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/listings";
  const form = document.getElementById('sellForm');
  const estimateBtn = document.getElementById('estimateBtn');
  const submitBtn = document.getElementById('submitBtn');
  const dropArea = document.getElementById('drop-area');
  const fileElem = document.getElementById('fileElem');
  const preview = document.getElementById('preview');
  const toastEl = document.getElementById('toast');
  const cardRoot = document.getElementById('cardRoot');

  // Session (use token key)
  function getSession(){
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return token && user ? { token, user } : null;
  }
  const session = getSession();
  if(!session){
    alert('Login required!');
    window.location.href = 'login.html';
    return;
  }
  console.log('✅ User logged in:', session.user.name || session.user.id);
  console.log('JWT Token:', session.token);

  // Toast helper
  function showToast(msg, isError=false){
    toastEl.textContent = msg;
    toastEl.className = isError ? 'err' : '';
    toastEl.style.display = 'block';
    setTimeout(()=> toastEl.style.display = 'none', 3200);
  }

  // Skeleton overlay helpers
  function showSkeleton(){
    const overlay = document.createElement('div');
    overlay.className = 'skeleton-overlay';
    overlay.id = 'skeletonOverlay';
    overlay.innerHTML = `
      <div class="skeleton" aria-hidden="true">
        <div class="s-line" style="width:60%"></div>
        <div class="s-line" style="width:40%"></div>
        <div class="s-box"></div>
        <div style="display:flex;gap:10px">
          <div class="s-line" style="width:40%"></div>
          <div class="s-line" style="width:50%"></div>
        </div>
      </div>
    `;
    cardRoot.appendChild(overlay);
  }
  function hideSkeleton(){
    const el = document.getElementById('skeletonOverlay');
    if(el) el.remove();
  }

  // Client-side estimate
  function estimateValue(){
    const keys = ["level","mythic_count","legendary_count","xsuit_count","gilt_count","honor_gilt_set","upgradable_guns","rare_glider","vehicle_skin","special_titles"];
    let price = 0;
    keys.forEach(k=>{
      const v = parseInt(document.getElementById(k).value) || 0;
      switch(k){
        case "level": price += v * 10; break;
        case "mythic_count": price += v * 500; break;
        case "legendary_count": price += v * 300; break;
        case "xsuit_count": price += v * 2000; break;
        case "gilt_count": price += v * 150; break;
        case "honor_gilt_set": price += v * 200; break;
        case "upgradable_guns": price += v * 100; break;
        case "rare_glider": price += v * 150; break;
        case "vehicle_skin": price += v * 100; break;
        case "special_titles": price += v * 200; break;
      }
    });
    document.getElementById('estimatedPrice').innerText = price ? `💰 Estimated Value: ₹${price}` : '';
  }
  estimateBtn.addEventListener('click', estimateValue);

  // Drag & drop image handling
  let uploaded = [];
  function handleFiles(files){
    for(const f of files){
      if(!f.type.startsWith('image/')) { showToast('Only images allowed', true); continue; }
      const reader = new FileReader();
      reader.onload = (e) => {
        uploaded.push(e.target.result);
        renderPreview();
      };
      reader.readAsDataURL(f);
    }
  }
  function renderPreview(){
    preview.innerHTML = '';
    uploaded.forEach((src, idx) => {
      const d = document.createElement('div');
      d.className = 'preview-img';
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'image ' + (idx+1);
      img.addEventListener('click', ()=> {
        document.getElementById('modalImg').src = src;
        document.getElementById('fullModal').style.display = 'flex';
      });
      const rem = document.createElement('div');
      rem.className = 'remove';
      rem.innerText = '×';
      rem.title = 'Remove';
      rem.addEventListener('click', ()=> {
        uploaded.splice(idx, 1);
        renderPreview();
      });
      d.appendChild(img);
      d.appendChild(rem);
      preview.appendChild(d);
    });
  }

  dropArea.addEventListener('click', ()=> fileElem.click());
  dropArea.addEventListener('dragover', (e)=> { e.preventDefault(); dropArea.classList.add('hover'); });
  dropArea.addEventListener('dragleave', (e)=> { e.preventDefault(); dropArea.classList.remove('hover'); });
  dropArea.addEventListener('drop', (e)=> { e.preventDefault(); dropArea.classList.remove('hover'); handleFiles(e.dataTransfer.files); });
  fileElem.addEventListener('change', (e)=> handleFiles(e.target.files));

  // Basic validation
  function validate(){
    let ok = true;
    // uid required
    const uidEl = document.getElementById('uid');
    const titleEl = document.getElementById('title');
    const levelEl = document.getElementById('level');

    const fieldUid = document.getElementById('field-uid');
    const fieldTitle = document.getElementById('field-title');
    const fieldLevel = document.getElementById('field-level');

    // reset
    fieldUid.classList.remove('invalid');
    fieldTitle.classList.remove('invalid');
    fieldLevel.classList.remove('invalid');

    if(!uidEl.value.trim()){
      fieldUid.classList.add('invalid');
      ok = false;
    }
    if(!titleEl.value.trim()){
      fieldTitle.classList.add('invalid');
      ok = false;
    }
    if(levelEl.value && isNaN(Number(levelEl.value))){
      fieldLevel.classList.add('invalid');
      ok = false;
    }
    return ok;
  }

  // submit handler
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if(!session){ showToast('Login required', true); return; }

    if(!validate()){
      showToast('Fix validation errors first', true);
      return;
    }

    // prepare payload
    const payload = {
      seller_id: session.user.id || session.user.username || String(session.user.id || 'unknown'),
      uid: document.getElementById('uid').value.trim(),
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('highlights').value.trim(),
      rank: document.getElementById('rank').value.trim(),
      level: parseInt(document.getElementById('level').value) || 0,
      mythic_count: parseInt(document.getElementById('mythic_count').value) || 0,
      legendary_count: parseInt(document.getElementById('legendary_count').value) || 0,
      xsuit_count: parseInt(document.getElementById('xsuit_count').value) || 0,
      gilt_count: parseInt(document.getElementById('gilt_count').value) || 0,
      honor_gilt_set: parseInt(document.getElementById('honor_gilt_set').value) || 0,
      upgradable_guns: parseInt(document.getElementById('upgradable_guns').value) || 0,
      rare_glider: parseInt(document.getElementById('rare_glider').value) || 0,
      vehicle_skin: parseInt(document.getElementById('vehicle_skin').value) || 0,
      special_titles: parseInt(document.getElementById('special_titles').value) || 0,
      images: uploaded.length ? uploaded : ["https://via.placeholder.com/250x150?text=No+Image"]
    };

    // UI: skeleton overlay
    showSkeleton();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Listing...';

    try {
      const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(()=>({}));

      if(res.ok){
        showToast('🎉 Account listed successfully');
        form.reset();
        uploaded = [];
        renderPreview();
        document.getElementById('estimatedPrice').innerText = '';
      } else {
        console.error('Server returned', res.status, data);
        if(res.status === 401){
          showToast('Unauthorized — please login again', true);
          // redirect to login after short delay
          setTimeout(()=> window.location.href = 'login.html', 900);
        } else if(res.status === 500){
          const details = data.details || data.error || data.message || 'Internal Server Error';
          showToast('Server error: ' + (data.message || 'Internal Server Error'), true);
          console.warn('Server details:', details);
          // If FK error (seller not present in listings.users), allow console-test fallback
          if(String(details).toLowerCase().includes('foreign key') || String(details).toLowerCase().includes('foreign')){
            attachConsoleTestHelper(payload);
          }
        } else {
          showToast(data.error || data.message || 'Failed to list account', true);
        }
      }
    } catch(err){
      console.error('Network request failed', err);
      showToast('Network request failed', true);
    } finally {
      hideSkeleton();
      submitBtn.disabled = false;
      submitBtn.textContent = 'List for Sale';
    }
  });

  // If server returns foreign key error — show helper button (console test)
  function attachConsoleTestHelper(payload){
    // avoid duplicate helper
    if(document.getElementById('consoleHelper')) return;
    const helper = document.createElement('div');
    helper.id = 'consoleHelper';
    helper.className = 'helper-box';
    helper.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;justify-content:space-between">
        <div style="flex:1" class="small">Your marketplace DB may not have your user record (FK failed). You can try a "console test" listing which bypasses JWT and uses a test user.</div>
        <div style="margin-left:12px">
          <button id="runConsoleTestBtn" class="console-btn">Try Console Test</button>
        </div>
      </div>
    `;
    form.appendChild(helper);
    const btn = document.getElementById('runConsoleTestBtn');
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = 'Creating...';
      try {
        const r2 = await fetch(`${API_BASE}/create?console_test=1`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d2 = await r2.json().catch(()=>({}));
        if(r2.ok){
          showToast('Created (console test) ✅');
          console.log('Console test result', d2);
          helper.remove();
        } else {
          showToast('Console create failed: ' + (d2.error || d2.message || r2.status), true);
          console.warn(d2);
          btn.disabled = false;
          btn.textContent = 'Try Console Test';
        }
      } catch(err){
        console.error(err);
        showToast('Console create network error', true);
        btn.disabled = false;
        btn.textContent = 'Try Console Test';
      }
    });
  }

  // small accessibility: allow Enter to submit when focusing fields
  form.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && (document.activeElement.tagName !== 'TEXTAREA')){
      // let form submit handler do validation
    }
  });

})();
