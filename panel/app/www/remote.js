/* Panel 1.0 – zdalne sterowanie ekranami na czas testów i raport o błędach. ES5. */
(function () {
  var P = window.PANEL; if (!P) return;
  var UA = navigator.userAgent, KIND = /Android/i.test(UA) ? 'android' : /iPhone|iPad|iPod/i.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1) ? 'ios' : 'desktop';
  var DID = ''; try { DID = localStorage.getItem('panel.did') || ''; if (!DID) { DID = KIND + '-' + Math.random().toString(36).slice(2, 8); localStorage.setItem('panel.did', DID); } } catch (e) { DID = KIND + '-x'; }
  var ERR = [];
  function logErr(m) { ERR.push(new Date().toTimeString().slice(0, 8) + ' ' + String(m).slice(0, 300)); if (ERR.length > 25) ERR.shift(); }
  window.addEventListener('error', function (e) { logErr((e.message || 'błąd') + (e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + e.lineno : '')); });
  window.addEventListener('unhandledrejection', function (e) { logErr('promise: ' + (e.reason && (e.reason.message || e.reason))); });
  var ce = console.error; console.error = function () { try { logErr(Array.prototype.map.call(arguments, function (a) { return a && a.message || String(a); }).join(' ')); } catch (x) { /* */ } return ce.apply(console, arguments); };
  function $(id) { return document.getElementById(id); }
  function vis(id) { var e = $(id); return !!(e && !e.classList.contains('hidden') && e.innerHTML); }
  function state() {
    var scr = $('scr');
    return { screen: vis('scr') ? (scr.getAttribute('data-name') || '?') : null, face: P.vi ? P.vi() : null, editing: P.editing ? P.editing() : false,
      popup: P.popupOpen ? P.popupOpen() : false, settings: vis('set'), device: vis('devw'), app: vis('apx'), amb: vis('amb') ? $('amb').className : null, bell: vis('bell') };
  }
  function report(cmd, result) {
    var b = { did: DID, kind: KIND, ua: UA.slice(0, 160), version: P.VERSION, size: innerWidth + 'x' + innerHeight, dpr: devicePixelRatio, lang: (window.I18N && I18N.lang) || 'pl', cmd: cmd, result: result || 'ok', state: state(), errors: ERR.slice() };
    try { fetch('api/remote/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); } catch (e) { /* */ }
  }
  function home() {
    try { if (P.closeBell) P.closeBell(); } catch (e) { /* */ }
    try { if (P.ambHide) P.ambHide(); } catch (e) { /* */ }
    try { if (P.closeApp) P.closeApp(); } catch (e) { /* */ }
    try { if (P.closeWeather) P.closeWeather(); } catch (e) { /* */ }
    try { if (P.closePop) P.closePop(); } catch (e) { /* */ }
    try { if (P.exitEdit && P.editing()) P.exitEdit(); } catch (e) { /* */ }
    try { var s = $('set'); if (s && !s.classList.contains('hidden')) { s.classList.add('hidden'); s.innerHTML = ''; } } catch (e) { /* */ }
    try { var l = $('lnch'); if (l) l.classList.add('hidden'); } catch (e) { /* */ }
    try { var m = $('mapx'); if (m) { m.className = 'mapx hidden'; m.innerHTML = ''; } } catch (e) { /* */ }
    try { if (P.closeScreens) P.closeScreens(); } catch (e) { /* */ }
    try { var v = P.layout().views[P.vi()]; if (v && v.page) P.setFace(P.faces()[0]); } catch (e) { /* */ }
  }
  function tileIdx(type) { var v = P.layout().views[P.vi()]; return v ? v.tiles.findIndex(function (t) { return t.type === type || t.id === type; }) : -1; }
  var CMD = {
    reload: function () { location.reload(); },
    report: function () { return 'ok'; },
    home: function () { home(); },
    face: function (a) { home(); var f = P.faces(); P.setFace(f[Math.max(0, Math.min(f.length - 1, +a || 0))]); },
    page: function (a) { home(); P.openPage(a); },
    screen: function (a) { home(); P.openScreen(a || 'home'); },
    weather: function () { home(); P.openWeather(); },
    settings: function (a) { home(); P.settings(a || 'display'); },
    camera: function (a) { home(); P.openCamera(a); },
    device: function (a) { home(); P.openDevice(a); },
    tile: function (a) { home(); var el = document.querySelector('#view .t-' + a); if (!el) return 'brak kafla ' + a; var r = el.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 9, isPrimary: true }; el.dispatchEvent(new PointerEvent('pointerdown', o)); setTimeout(function () { el.dispatchEvent(new PointerEvent('pointerup', o)); el.dispatchEvent(new MouseEvent('click', o)); }, 60); },
    tilemenu: function (a) { home(); var i = tileIdx(a); if (i < 0) return 'brak kafla ' + a; P.enterEdit(); P.tileMenu(i); },
    edit: function () { home(); P.enterEdit(); },
    exit: function () { home(); },
    saver: function () { home(); P.ambShow('saver'); },
    night: function () { home(); P.ambShow('night'); },
    bell: function () { home(); P.testBell(); },
    tour: function () { home(); P.tour(); },
    launcher: function () { home(); P.openLauncher(); },
    gallery: function () { home(); P.openGallery(); },
    app: function (a) { home(); ({ music: P.openMusic, clock: P.openClock, reminders: P.openReminders }[a] || P.openMusic)(); },
    click: function (a) { var el = document.querySelector(a); if (!el) return 'brak ' + a; el.click(); },
    scroll: function (a) { var y = +a || 0, el = document.querySelector('#apx:not(.hidden) .ap-b, .sheet, #set:not(.hidden) .set-r, #scr:not(.hidden) .scr-b'); if (el) el.scrollTop = y; else window.scrollTo(0, y); }
  };
  function match(t) { return !t || t === 'all' || t === KIND || t === DID; }
  function run(d) {
    if (!d || !match(d.target) || !CMD[d.cmd]) return;
    var r; try { r = CMD[d.cmd](d.arg); } catch (e) { r = 'błąd: ' + e.message; logErr(d.cmd + ': ' + e.message); }
    setTimeout(function () { report(d.cmd + (d.arg ? ' ' + d.arg : ''), r); }, 600);
  }
  // zdarzenia „remote” przychodzą przez główne połączenie SSE (app.js)
  setTimeout(function () { report('start'); }, 5000);
  P.remote = { did: DID, kind: KIND, run: run };
})();
