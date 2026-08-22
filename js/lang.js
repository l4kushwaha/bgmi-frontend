/* Elegent-Kart language switcher - Google Translate powered */
(function () {
  var LANGS = [
    ['', 'English'], ['hi', 'हिन्दी Hindi'], ['mr', 'मराठी Marathi'], ['bn', 'বাংলা Bengali'],
    ['ta', 'தமிழ் Tamil'], ['te', 'తెలుగు Telugu'], ['gu', 'ગુજરાતી Gujarati'], ['kn', 'ಕನ್ನಡ Kannada'],
    ['ml', 'മലയാളം Malayalam'], ['pa', 'ਪੰਜਾਬੀ Punjabi'], ['or', 'ଓଡ଼ିଆ Odia'], ['ur', 'اردو Urdu'],
    ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'], ['pt', 'Português'],
    ['ru', 'Русский'], ['ar', 'العربية'], ['zh-CN', '中文'], ['ja', '日本語'], ['id', 'Bahasa']
  ];
  var INCLUDED = LANGS.filter(function (l) { return l[0]; }).map(function (l) { return l[0]; }).join(',');

  function setCookie(v) {
    if (v) document.cookie = 'googtrans=/en/' + v + ';path=/;max-age=31536000';
    else document.cookie = 'googtrans=;path=/;max-age=0';
  }
  function getCookie() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z-]+)/);
    return m ? m[1] : '';
  }

  /* ---- UI pill ---- */
  var sel = document.createElement('select');
  sel.id = 'langSel';
  sel.setAttribute('aria-label', 'Language');
  sel.style.cssText = 'background:rgba(15,23,42,.65);color:#e2e8f0;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 30px 7px 14px;font-size:.8rem;font-weight:700;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'><path d=\'M0 0l5 6 5-6z\' fill=\'%23cbd5e1\'/></svg>");background-repeat:no-repeat;background-position:right 11px center;backdrop-filter:blur(8px)';
  LANGS.forEach(function (l) {
    var o = document.createElement('option');
    o.value = l[0]; o.textContent = '🌐 ' + l[1];
    o.style.background = '#0f172a'; o.style.color = '#e2e8f0';
    sel.appendChild(o);
  });

  function mount() {
    var nav = document.querySelector('.navbar') || document.querySelector('nav');
    if (nav) {
      sel.style.marginLeft = 'auto'; sel.style.position = 'relative'; sel.style.zIndex = '60';
      nav.appendChild(sel);
    } else {
      sel.style.cssText += ';position:fixed;top:12px;right:12px;z-index:99998';
      document.body.appendChild(sel);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  /* ---- Google element (hidden) ---- */
  var holder = document.createElement('div');
  holder.id = 'google_translate_element';
  holder.style.cssText = 'position:absolute;opacity:0;pointer-events:none;height:0;width:0;overflow:hidden';
  document.body.appendChild(holder);

  window.googleTranslateElementInit = function () {
    try {
      new google.translate.TranslateElement({ pageLanguage: 'en', includedLanguages: INCLUDED, autoDisplay: false }, 'google_translate_element');
    } catch (e) {}
  };
  var gs = document.createElement('script');
  gs.src = 'https://translate.googleapis.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.head.appendChild(gs);

  function comboApply(lang) {
    var cb = document.querySelector('.goog-te-combo');
    if (!cb) return false;
    cb.value = lang;
    cb.dispatchEvent(new Event('change'));
    return true;
  }

  /* restore saved choice */
  var saved = localStorage.getItem('site_lang');
  if (saved === null && getCookie()) saved = getCookie();
  sel.value = saved || '';
  if (saved) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (comboApply(saved) || tries > 40) clearInterval(iv);
    }, 250);
  }

  sel.addEventListener('change', function () {
    var l = sel.value;
    localStorage.setItem('site_lang', l);
    setCookie(l);
    if (!comboApply(l)) location.reload(); /* fallback hard apply */
  });
})();
