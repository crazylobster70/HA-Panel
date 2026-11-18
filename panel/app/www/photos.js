/* Panel – Ustawienia → Zdjęcia: album Panelu (w mediach Home Assistanta), dodawanie z urządzenia, z telefonu (kod QR) i z folderu www. ES5. */
(function () {
  var P = window.PANEL; if (!P) return;
  var esc = P.esc;
  function $(id) { return document.getElementById(id); }
  function T(s) { return window.I18N && I18N.t ? I18N.t(s) : s; }
  var AL = null; // { files, media, session }
  var NARROW = function () { return document.body.classList.contains('narrow'); };

  function load(cb) {
    P.api('album').then(function (a) { AL = a; if (cb) cb(a); if (P.refreshSettings) P.refreshSettings(); if (P.resetPhotos) P.resetPhotos(); }).catch(function () { AL = { files: [], media: false }; if (P.refreshSettings) P.refreshSettings(); });
  }
  function source() { return ((P.layout() || {}).photos || {}).source || 'all'; }

  // wysyłanie: zmniejszenie do 2400 px na dłuższym boku, potem do albumu
  function send(files, done) {
    var list = Array.prototype.slice.call(files || []), ok = 0, i = 0;
    if (!list.length) return;
    P.toast(T('Wysyłam zdjęcia') + '… 0/' + list.length);
    (function next() {
      if (i >= list.length) { P.toast(T('Dodano zdjęć') + ': ' + ok); load(); if (done) done(ok); return; }
      var f = list[i++];
      (P.shrink ? P.shrink(f, 2400) : Promise.resolve(f)).then(function (blob) {
        return fetch('api/album', { method: 'POST', headers: { 'Content-Type': blob.type || 'image/jpeg' }, body: blob }).then(function (r) { if (!r.ok) throw new Error(r.status); ok++; });
      }).catch(function () { /* pomiń błędne zdjęcie */ }).then(function () { P.toast(T('Wysyłam zdjęcia') + '… ' + i + '/' + list.length); next(); });
    })();
  }

  // ---------- panel ustawień ----------
  function row(icon, col, title, sub, act, extra) {
    return '<div class="sr link ph-row"' + (act ? ' data-sact="' + act + '"' : '') + '><span class="ph-ri"><i class="sic" style="background:' + col + '">' + icon + '</i><span>' + title + '<small>' + sub + '</small></span></span><span class="sv">' + (extra || '›') + '</span></div>';
  }
  var IC = {
    dev: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M10 18h4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    album: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2"><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M7 4h10"/></svg>'
  };
  P.photosPane = function () {
    if (!AL) load();
    var a = AL || { files: [], media: false }, src = source();
    var srcName = { panel: 'Zdjęcia Panelu', www: 'Folder www Home Assistanta', all: 'Wszystkie zdjęcia' };
    return '<div class="sg-h">DODAJ ZDJĘCIA</div><div class="sg">' +
      '<label class="sr link ph-row"><span class="ph-ri"><i class="sic" style="background:#3478f6">' + IC.dev + '</i><span>' + (NARROW() ? 'Z tego telefonu' : 'Z tego urządzenia') + '<small>Wybierz zdjęcia na tym ' + (NARROW() ? 'telefonie' : 'urządzeniu') + '</small></span></span><span class="sv">›</span>' +
      '<input type="file" accept="image/*" multiple data-sin="alfile" style="display:none"></label>' +
      (NARROW() ? '' : row(IC.phone, '#34c759', 'Z telefonu', 'Zeskanuj kod aparatem telefonu', 'ph-qr')) +
      row(IC.album, '#5ac8fa', 'Z folderu Home Assistanta', 'Zdjęcia z folderu www', 'ph-www') +
      '</div><div class="sg-f">Zdjęcia są najpierw zmniejszane na tym urządzeniu (2400 pikseli na dłuższym boku), żeby szybko się wysłały.</div>' +
      '<div class="sg"><div class="sr link" data-sact="ph-src"><span>Twarz Zdjęcia pokazuje</span><span class="sv">' + esc(T(srcName[src])) + ' ⌄</span></div></div>' +
      '<div class="sg-f">' + (src === 'panel' ? 'Tylko zdjęcia dodane tutaj.' : src === 'www' ? 'Zdjęcia z folderu www Home Assistanta.' : 'Zdjęcia dodane tutaj i zdjęcia z folderu www Home Assistanta.') + ' Dotyczy też kafla Zdjęcie bez własnego zdjęcia.</div>' +
      '<div class="sg-h">ZDJĘCIA PANELU</div><div class="sg ph-grid">' +
      (AL == null ? '<div class="small" style="padding:14px">Wczytuję…</div>' : !a.files.length ? '<div class="small" style="padding:14px">Nie ma jeszcze zdjęć. Dodaj je powyżej.</div>' :
        a.files.map(function (n) { return '<div class="ph-th" style="background-image:url(\'api/album/file/' + encodeURIComponent(n) + '\')"><button data-sact="ph-del" data-k="' + esc(n) + '" aria-label="Usuń">×</button></div>'; }).join('')) +
      '</div><div class="sg-f">' + (AL == null ? '' : a.files.length + ' ' + T('zdj.') + ' ') + (a.media ? 'w mediach Home Assistanta, folder Panel. Widać je też w przeglądarce mediów Home Assistanta, gdzie również można je dodawać i usuwać.' : 'w Panelu.') + '</div>';
  };
  P.photosFile = function (input) { send(input.files); };
  P.bgSources = function () {
    return '<div class="sg">' +
      '<label class="sr link ph-row"><span class="ph-ri"><i class="sic" style="background:#3478f6">' + IC.dev + '</i><span>' + (NARROW() ? 'Z tego telefonu' : 'Z tego urządzenia') + '<small>Wybierz zdjęcie na tym ' + (NARROW() ? 'telefonie' : 'urządzeniu') + '</small></span></span><span class="sv">›</span>' +
      '<input type="file" accept="image/*" data-sin="bgfile" style="display:none"></label>' +
      (NARROW() ? '' : row(IC.phone, '#34c759', 'Z telefonu', 'Zeskanuj kod aparatem telefonu', 'ph-bgqr')) +
      row(IC.album, '#5ac8fa', 'Ze zdjęć Panelu lub folderu Home Assistanta', 'Album Panelu i folder www', 'ph-bgha') + '</div>';
  };
  P.photosAct = function (a) {
    var k = a.getAttribute('data-sact');
    if (k === 'ph-del') {
      if (!confirm(T('Usunąć to zdjęcie?'))) return false;
      fetch('api/album/file/' + encodeURIComponent(a.getAttribute('data-k')), { method: 'DELETE' }).then(function () { load(); });
      return false;
    }
    if (k === 'ph-src') {
      var cur = source();
      P.openPop(function () {
        return '<h2>Twarz Zdjęcia pokazuje<button class="x" data-close>×</button></h2>' + [['panel', 'Zdjęcia Panelu', 'Tylko zdjęcia dodane w Ustawieniach'], ['www', 'Folder www Home Assistanta', 'Zdjęcia z folderu /config/www'], ['all', 'Wszystkie zdjęcia', 'Jedne i drugie']].map(function (o) {
          return '<div class="lrow pick" data-pact="src" data-v="' + o[0] + '"><span><b>' + o[1] + '</b><small>' + o[2] + '</small></span><span>' + (cur === o[0] ? '✓' : '') + '</span></div>';
        }).join('');
      }, { static: true, acts: { src: function (el) { var v = el.getAttribute('data-v'); P.change(function () { var l = P.layout(); l.photos = l.photos || {}; l.photos.source = v; }, false); P.closePop(); if (P.resetPhotos) P.resetPhotos(); if (P.refreshSettings) P.refreshSettings(); } } });
      return false;
    }
    if (k === 'ph-www') { wwwPicker(); return false; }
    if (k === 'ph-qr') { qrPop(); return false; }
    if (k === 'ph-bgqr') { qrPop('bg'); return false; }
    if (k === 'ph-bgha') { bgPicker(); return false; }
    return false;
  };

  // ---------- z folderu www ----------
  function wwwPicker() {
    var list = null, sel = {};
    P.api('www').then(function (l) { list = l || []; P.refreshPop && P.refreshPop(); }).catch(function () { list = []; P.refreshPop && P.refreshPop(); });
    P.openPop(function () {
      var n = Object.keys(sel).length;
      return '<h2>Z folderu Home Assistanta<button class="x" data-close>×</button></h2>' +
        (list == null ? '<div class="small">Wczytuję…</div>' : !list.length ? '<div class="small">W folderze www Home Assistanta nie ma zdjęć.</div>' :
          '<div class="ph-pick">' + list.slice(0, 200).map(function (f) {
            return '<button class="ph-pt' + (sel[f] ? ' on' : '') + '" data-pact="tg" data-f="' + esc(f) + '" style="background-image:url(\'api/www/' + f.split('/').map(encodeURIComponent).join('/') + '\')"><i>✓</i></button>';
          }).join('') + '</div><button class="btn" data-pact="add" style="width:100%;margin-top:12px"' + (n ? '' : ' disabled') + '>' + (n ? T('Dodaj') + ' (' + n + ')' : T('Zaznacz zdjęcia')) + '</button>');
    }, { wide: true, acts: {
      tg: function (el) { var f = el.getAttribute('data-f'); if (sel[f]) delete sel[f]; else sel[f] = 1; },
      add: function () {
        var fs = Object.keys(sel); P.closePop(); P.toast(T('Dodaję zdjęcia') + '…');
        Promise.all(fs.map(function (f) { return P.api('album/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: f }) }).catch(function () { }); }))
          .then(function () { P.toast(T('Dodano zdjęć') + ': ' + fs.length); load(); });
      } } });
  }

  // ---------- tło: jedno zdjęcie z albumu Panelu albo z folderu www ----------
  function bgPicker() {
    var alb = null, www = null;
    P.api('album').then(function (a) { alb = a.files || []; P.refreshPop && P.refreshPop(); }).catch(function () { alb = []; P.refreshPop && P.refreshPop(); });
    P.api('www').then(function (l) { www = l || []; P.refreshPop && P.refreshPop(); }).catch(function () { www = []; P.refreshPop && P.refreshPop(); });
    function grid(list, url) { return '<div class="ph-pick">' + list.slice(0, 200).map(function (f) { return '<button class="ph-pt" data-pact="pick" data-u="' + esc(url(f)) + '" style="background-image:url(\'' + url(f) + '\')"></button>'; }).join('') + '</div>'; }
    P.openPop(function () {
      return '<h2>Wybierz tło<button class="x" data-close>×</button></h2>' +
        '<div class="sg-h" style="margin:4px 0 8px">ZDJĘCIA PANELU</div>' + (alb == null ? '<div class="small">Wczytuję…</div>' : alb.length ? grid(alb, function (n) { return 'api/album/file/' + encodeURIComponent(n); }) : '<div class="small">Brak – dodaj je w Ustawienia → Zdjęcia.</div>') +
        '<div class="sg-h" style="margin:16px 0 8px">FOLDER WWW HOME ASSISTANTA</div>' + (www == null ? '<div class="small">Wczytuję…</div>' : www.length ? grid(www, function (f) { return 'api/www/' + f.split('/').map(encodeURIComponent).join('/'); }) : '<div class="small">Brak zdjęć.</div>');
    }, { wide: true, static: true, acts: { pick: function (el) { var u = el.getAttribute('data-u'); P.closePop(); if (P.setBgImage) P.setBgImage(u); } } });
  }

  // ---------- z telefonu: kod QR ----------
  function qrSrc(text) {
    if (!window.qrcode) return '';
    var q = qrcode(0, 'M'); q.addData(text); q.make();
    return q.createDataURL(6, 2);
  }
  function needQr(cb) {
    if (window.qrcode) return cb();
    var s = document.createElement('script'); s.src = 'qrcode.js'; s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }
  function panelUrl() {
    try { var t = window.top.location; if (t && t.origin && t.origin !== 'null') return t.origin + t.pathname; } catch (e) { /* inna domena */ }
    return location.href.split('?')[0];
  }
  function qrPop(mode) {
    var url = panelUrl(), start = AL ? AL.files.length : 0, timer = null, bg = mode === 'bg', known = AL ? AL.files.slice() : null;
    P.api('album').then(function (a) { known = a.files.slice(); start = known.length; }).catch(function () { });
    P.api('album/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: bg ? 'bg' : 'album' }) }).catch(function () { });
    needQr(function () {
      P.openPop(function () {
        var now = AL ? AL.files.length - start : 0;
        return '<h2>Z telefonu<button class="x" data-close>×</button></h2>' +
          '<div class="ph-qr"><img src="' + qrSrc(url) + '" alt=""><div><b>1.</b> Zeskanuj kod aparatem telefonu (telefon w tej samej sieci Wi-Fi i zalogowany do Home Assistanta).<br><br><b>2.</b> Otworzy się Panel – dotknij <b>' + (bg ? 'Wybierz zdjęcie' : 'Wybierz zdjęcia') + '</b>.<br><br><b>3.</b> ' + (bg ? 'Zdjęcie od razu zostanie tłem tej twarzy.' : 'Zdjęcia pojawią się tutaj.') +
          '<div class="ph-cnt">' + (now > 0 ? T('Dodano zdjęć') + ': ' + now : T('Czekam na zdjęcia…')) + '</div><small class="ph-url">' + esc(url) + '</small></div></div>';
      }, { static: false, cls: 'phqrpop', onClose: function () { clearInterval(timer); fetch('api/album/session', { method: 'DELETE' }); } });
      timer = setInterval(function () {
        P.api('album').then(function (a) {
          var c = AL ? AL.files.length : 0; AL = a;
          if (bg && known) { var nw = a.files.filter(function (n) { return known.indexOf(n) < 0; }); if (nw.length) { clearInterval(timer); P.closePop(); if (P.setBgImage) P.setBgImage('api/album/file/' + encodeURIComponent(nw[0])); return; } }
          if (a.files.length !== c) { P.refreshPop && P.refreshPop(); if (P.refreshSettings) P.refreshSettings(); if (P.resetPhotos) P.resetPhotos(); }
        });
      }, 3000);
    });
  }

  // ---------- telefon po zeskanowaniu kodu: okno „Dodaj zdjęcia” ----------
  var asked = 0;
  function phoneCheck() {
    if (!('ontouchstart' in window) || Date.now() - asked < 15000) return;
    P.api('album').then(function (a) {
      AL = a;
      if (!a.session || P.popupOpen()) return;
      asked = Date.now();
      var bg = a.mode === 'bg';
      P.openPop(function () {
        return '<h2>' + (bg ? 'Tło Panelu' : 'Dodaj zdjęcia do Panelu') + '<button class="x" data-close>×</button></h2><div style="margin-bottom:14px;font-size:15px;opacity:.75;line-height:1.35">' +
          (bg ? 'Wybierz zdjęcie z tego telefonu. Zostanie tapetą na ekranie, na którym pokazano kod.' : 'Wybierz zdjęcia z tego telefonu. Pokażą się na twarzy Zdjęcia na wszystkich ekranach.') + '</div>' +
          '<label class="btn ph-big">' + (bg ? 'Wybierz zdjęcie' : 'Wybierz zdjęcia') + '<input type="file" accept="image/*"' + (bg ? '' : ' multiple') + ' data-pin="pf" style="display:none"></label>';
      }, { static: true, inputs: { pf: function (el, evn) { if (evn !== 'change') return; send(el.files, function () { P.closePop(); }); } } });
    }).catch(function () { });
  }
  setTimeout(phoneCheck, 2500);
  setInterval(phoneCheck, 20000);
})();
