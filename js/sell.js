(() => {
  const API_BASE = "https://bgmi_marketplace_service.bgmi-gateway.workers.dev/api/listings";
  const form = document.getElementById('sellForm');
  const estimateBtn = document.getElementById('estimateBtn');
  const submitBtn = document.getElementById('submitBtn');
  const dropArea = document.getElementById('drop-area');
  const fileElem = document.getElementById('fileElem');
  const preview = document.getElementById('preview');
  const toastEl = document.getElementById('toast');

  // ===== Session =====
  function getSession() {
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

  function showToast(msg, isError=false){
    toastEl.textContent = msg;
    toastEl.className = isError ? 'err' : '';
    toastEl.style.display = 'block';
    setTimeout(()=> toastEl.style.display = 'none', 3200);
  }

  // ===== Drag & drop image handling =====
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

  // ===== Validation =====
  function validate(){
    let ok = true;
    const uidEl = document.getElementById('uid');
    const titleEl = document.getElementById('title');
    const levelEl = document.getElementById('level');

    [uidEl,titleEl,levelEl].forEach(el=> el.classList.remove('invalid'));

    if(!uidEl.value.trim()){ uidEl.classList.add('invalid'); ok=false; }
    if(!titleEl.value.trim()){ titleEl.classList.add('invalid'); ok=false; }
    if(levelEl.value && isNaN(Number(levelEl.value))){ levelEl.classList.add('invalid'); ok=false; }

    return ok;
  }

  // ===== Submit handler =====
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if(!session){ showToast('Login required', true); return; }
    if(!validate()){ showToast('Fix validation errors first', true); return; }

    const payload = {
      uid: document.getElementById('uid').value.trim(),
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('highlights').value.trim(),
      price: parseInt(document.getElementById('estimatedPrice').dataset.value) || 0,
      level: parseInt(document.getElementById('level').value) || 0,
      highest_rank: document.getElementById('rank')?.value || "",
      mythic_items: (document.getElementById('mythic')?.value || "").split(',').map(s=>s.trim()).filter(Boolean),
      legendary_items: (document.getElementById('legendary')?.value || "").split(',').map(s=>s.trim()).filter(Boolean),
      gift_items: (document.getElementById('gift')?.value || "").split(',').map(s=>s.trim()).filter(Boolean),
      upgraded_guns: (document.getElementById('guns')?.value || "").split(',').map(s=>s.trim()).filter(Boolean),
      titles: (document.getElementById('titles')?.value || "").split(',').map(s=>s.trim()).filter(Boolean),
      images: uploaded
    };

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
          setTimeout(()=> window.location.href = 'login.html', 900);
        } else {
          showToast(data.error || data.message || 'Failed to list account', true);
        }
      }
    } catch(err){
      console.error('Network request failed', err);
      showToast('Network request failed', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'List for Sale';
    }
  });
})();
