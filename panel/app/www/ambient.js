/* Panel 0.9 – zegar nocny, wygaszacz ze zdjęciami, dzwonek na cały ekran, samouczek. ES5. */
(function () {
  var P = window.PANEL; if (!P) return;
  var esc = P.esc, st = P.st, stv = P.stv, attr = P.attr;
  var EN = !!(window.I18N && I18N.en), LOC = EN ? 'en-GB' : 'pl-PL';
  var ANDROID = /Android/i.test(navigator.userAgent);
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function FIx(n, c) { return window.FI ? FI(n, c) : ''; }

  // ---------- ustawienia tego ekranu ----------
  var DEF = { night: ANDROID, from: 21, to: 7, saver: ANDROID ? 5 : 0, bell: true, motionOn: false };
  function cfg() { var c = {}; try { c = JSON.parse(localStorage.getItem('panel.amb') || '{}') || {}; } catch (e) { /* */ } var o = {}; Object.keys(DEF).forEach(function (k) { o[k] = c[k] === undefined ? DEF[k] : c[k]; }); return o; }
  try { var c0 = JSON.parse(localStorage.getItem('panel.amb') || '{}') || {}; if (!c0.m090 ) { if (c0.from === 23) c0.from = 21; c0.m090 = 1; localStorage.setItem('panel.amb', JSON.stringify(c0)); } } catch (e) { /* */ }
  function setCfg(k, v) { var c = cfg(); c[k] = v; try { localStorage.setItem('panel.amb', JSON.stringify(c)); } catch (e) { /* */ } }

  // ---------- warstwa nakładek ----------
  function layer(id, cls) {
    var el = $(id);
    if (!el) {
      el = document.createElement('div'); el.id = id; document.body.appendChild(el);
      ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'wheel'].forEach(function (t) { el.addEventListener(t, function (ev) { ev.stopPropagation(); }); });
    }
    el.className = cls; return el;
  }
  var idleAt = Date.now(), mode = null, wakeUntil = 0, forced = false;
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) { document.addEventListener(t, function () { idleAt = Date.now(); }, true); });

  function weatherEnt() { var ids = P.ids(); return ids.filter(function (x) { return x === 'weather.pogoda'; })[0] || ids.filter(function (x) { return x.indexOf('weather.') === 0; })[0]; }
  var COND = { 'clear-night': 'Bezchmurnie', sunny: 'Słonecznie', partlycloudy: 'Częściowe zachmurzenie', cloudy: 'Pochmurno', rainy: 'Deszcz', pouring: 'Ulewa', lightning: 'Burza', 'lightning-rainy': 'Burza z deszczem', snowy: 'Śnieg', 'snowy-rainy': 'Deszcz ze śniegiem', hail: 'Grad', fog: 'Mgła', windy: 'Wietrznie', 'windy-variant': 'Wietrznie', exceptional: 'Nietypowo' };
  var WIC = { 'clear-night': 'moon', sunny: 'sun', partlycloudy: 'pcloud', cloudy: 'cloud', rainy: 'rain', pouring: 'rain', lightning: 'storm', 'lightning-rainy': 'storm', snowy: 'snow', 'snowy-rainy': 'snow', hail: 'snow', fog: 'fog', windy: 'windy', 'windy-variant': 'windy' };
  function wx() {
    var e = weatherEnt(); if (!e || P.bad(stv(e))) return null;
    var t = attr(e, 'temperature'), c = stv(e);
    return { t: t == null ? '–' : Math.round(t) + '°', c: COND[c] || c, ic: WIC[c] || 'cloud' };
  }
  function dateTxt(d) { var s = d.toLocaleDateString(LOC, { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); }
  function nightNow() {
    var c = cfg(); if (!c.night) return false;
    var h = new Date().getHours(), f = +c.from, t = +c.to;
    return f > t ? (h >= f || h < t) : (h >= f && h < t);
  }
  function busy() { return (P.editing && P.editing()) || (P.popupOpen && P.popupOpen()) || !$('set').classList.contains('hidden') || !!$('tour'); }

  // ---------- zegar nocny ----------
  function renderNight() {
    var el = layer('amb', 'amb night'), d = new Date(), w = wx();
    var dx = Math.round((Math.random() - 0.5) * 60), dy = Math.round((Math.random() - 0.5) * 40);
    el.innerHTML = '<div class="nc" style="transform:translate(' + dx + 'px,' + dy + 'px)"><div class="nt">' + pad(d.getHours()) + '<i>:</i>' + pad(d.getMinutes()) + '</div>' +
      '<div class="nd">' + esc(dateTxt(d)) + (w ? ' · ' + esc(w.t) + ' ' + esc(w.c) : '') + '</div></div>';
  }
  // ---------- wygaszacz: duży zegar cyfrowy z datą i pogodą ----------
  function renderSaver() {
    var el = layer('amb', 'amb saver'), d = new Date(), w = wx();
    var dx = Math.round((Math.random() - 0.5) * 80), dy = Math.round((Math.random() - 0.5) * 50);
    el.innerHTML = '<div class="sv-c" style="transform:translate(' + dx + 'px,' + dy + 'px)"><div class="sv-t">' + pad(d.getHours()) + '<i>:</i>' + pad(d.getMinutes()) + '</div>' +
      '<div class="sv-d">' + esc(dateTxt(d)) + '</div>' +
      (w ? '<div class="sv-w">' + FIx(w.ic, '#fff') + '<b>' + esc(w.t) + '</b><span>' + esc(w.c) + '</span></div>' : '') + '</div>';
  }
  // po wygaszaczu / zegarze nocnym wróć na główną twarz
  function homeFace() {
    try {
      var f = P.faces(), v = P.layout().views[P.vi()];
      if (P.closeScreens) P.closeScreens(); if (P.closeApp) P.closeApp();
      if (f.length && (P.vi() !== f[0] || (v && v.page))) P.setFace(f[0]);
    } catch (e) { /* */ }
  }
  function hideAmb() { forced = false; var el = $('amb'); if (el) { el.className = 'amb hidden'; el.innerHTML = ''; } mode = null; }
  function tick() {
    if (BELL) return;
    if (forced) { if (mode === 'night' && new Date().getSeconds() < 5) renderNight(); else if (mode === 'saver' && new Date().getSeconds() < 5) renderSaver(); return; }
    var c = cfg(), idle = Date.now() - idleAt, want = null;
    if (!busy() && Date.now() > wakeUntil) {
      if (nightNow() && idle >= 60000) want = 'night';
      else if (c.saver > 0 && idle >= c.saver * 60000) want = 'saver';
    }
    if (want !== mode) {
      hideAmb(); mode = want;
      if (want === 'night') renderNight();
      if (want === 'saver') renderSaver();
    } else if (new Date().getSeconds() < 5) { if (mode === 'night') renderNight(); else if (mode === 'saver') renderSaver(); }
  }
  setInterval(tick, 5000);
  document.addEventListener('click', function (ev) {
    if (mode && ev.target.closest && ev.target.closest('#amb')) { ev.stopPropagation(); hideAmb(); idleAt = Date.now(); wakeUntil = Date.now() + 2000; homeFace(); }
  }, true);

  // ---------- dzwonek do drzwi ----------
  var BELL = null, lastRing = 0, seen = {}, AC = null;
  document.addEventListener('pointerdown', function () { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { /* */ } }, true);
  function chime() {
    if (!AC) return null;
    var stop = false, play = function (f, t0) { var o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2); o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + 1.25); };
    var n = 0, run = function () { if (stop || n++ >= 3) return; var t = AC.currentTime; play(659, t); play(523, t + 0.55); setTimeout(run, 2600); };
    run(); return function () { stop = true; };
  }
  function bellEnts() { return P.ids().filter(function (e) { return (e.indexOf('event.') === 0 && attr(e, 'device_class') === 'doorbell') || /^binary_sensor\..*doorbell(_ring)?$/.test(e) && /doorbell$/.test(e); }); }
  function bellCam(src) {
    var dev = String(attr(src, 'friendly_name') || '').split(' ')[0].toLowerCase(), cams = P.ids().filter(function (e) { return e.indexOf('camera.') === 0; });
    var mine = cams.filter(function (e) { var n = String(attr(e, 'friendly_name') || '').toLowerCase(); return dev && n.indexOf(dev + ' ') === 0 && !/powiadom|notif|package|paczk/.test(n); });
    if (!mine.length) mine = cams.filter(function (e) { return /doorbell|dzwonek|entry/.test(e); });
    return mine.filter(function (e) { return /medium/.test(e); })[0] || mine.filter(function (e) { return /high/.test(e); })[0] || mine[0];
  }
  function ringFrom(e) {
    var v = stv(e) || '', ev = e.indexOf('event.') === 0, key = ev ? v + '|' + (attr(e, 'event_id') || '') : v, was = seen[e];
    seen[e] = key;
    if (was === undefined || P.bad(v)) return false;
    return ev ? was !== key : (was !== 'on' && v === 'on');
  }
  function openBell(src, test) {
    if (!cfg().bell && !test) return;
    if (Date.now() - lastRing < 15000 && BELL) return;
    lastRing = Date.now(); hideAmb();
    var cam = bellCam(src || bellEnts()[0]);
    var el = layer('bell', 'bell');
    var d = new Date();
    el.innerHTML = '<div class="bl-h"><span class="bl-dot"></span><b>Ktoś dzwoni do drzwi</b><span class="bl-tm">' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '</span></div>' +
      '<div class="bl-cam">' + (cam ? '<img id="blimg" alt="">' : '<div class="bl-nc">' + FIx('bell', '#fff') + '</div>') + '</div>' +
      '<div class="bl-f"><button data-bl="mute">' + FIx('vol', '#fff') + '<span>Wycisz</span></button><button data-bl="close" class="bl-x">Zamknij</button></div>';
    var stop = chime();
    var f = function () { if (!cam) return; var n = new Image(); n.onload = function () { var i = $('blimg'); if (i) i.src = n.src; }; n.src = 'api/camera/' + cam + '?t=' + Date.now(); };
    f();
    BELL = { stop: stop, cam: setInterval(f, 1000), auto: setTimeout(closeBell, 60000) };
    el.onclick = function (ev) {
      var b = ev.target.closest('[data-bl]'); if (!b) return;
      if (b.getAttribute('data-bl') === 'mute') { if (BELL && BELL.stop) BELL.stop(); b.classList.add('on'); b.querySelector('span').textContent = 'Wyciszono'; }
      else closeBell();
    };
  }
  function closeBell() {
    if (!BELL) return;
    if (BELL.stop) BELL.stop(); clearInterval(BELL.cam); clearTimeout(BELL.auto); BELL = null;
    var el = $('bell'); if (el) { el.className = 'bell hidden'; el.innerHTML = ''; }
    idleAt = Date.now();
  }
  var oldHook = P.hook;
  P.hook = function (id) {
    if (oldHook) oldHook(id);
    if (id === null) { bellEnts().forEach(function (e) { ringFrom(e); }); return; }
    if (bellEnts().indexOf(id) >= 0 && ringFrom(id)) openBell(id);
    // 0.9.39: budzenie ruchem – ruch przed tabletem chowa wygaszacz i wraca na stronę główną (zegar nocny zostaje)
    var mo = motionList();
    if (id && mo.indexOf(id) >= 0 && stv(id) === 'on') {
      idleAt = Date.now();
      if (mode === 'saver') { hideAmb(); wakeUntil = Date.now() + 2000; homeFace(); }
    }
  };
  P.testBell = function () { openBell(null, true); };
  P.closeBell = closeBell;
  P.ambShow = function (m) { hideAmb(); mode = m; forced = true; if (m === 'night') renderNight(); else renderSaver(); };
  P.ambHide = function () { hideAmb(); idleAt = Date.now(); wakeUntil = Date.now() + 2000; };

  // ---------- samouczek ----------
  var STEPS = [
    { ic: 'home', t: 'Witaj w Panelu', d: 'Dotknij kafla, żeby otworzyć jego stronę. Przytrzymaj urządzenie, żeby otworzyć jego okno.', g: 'tap' },
    { ic: 'swap', t: 'Przesuń w bok', d: 'Przesuń palcem w lewo lub w prawo, żeby przejść do następnej twarzy.', g: 'side' },
    { ic: 'grid', t: 'Przesuń od dołu w górę', d: 'Od dolnej krawędzi ekranu w górę otwiera się menu z aplikacjami: Muzyka, Zegar, Pogoda, Kamery i Ustawienia.', g: 'up' },
    { ic: 'pencil', t: 'Przytrzymaj', d: 'Przytrzymaj kafel, żeby przestawiać, powiększać i usuwać kafle. Przytrzymaj tło, żeby otworzyć galerię twarzy.', g: 'hold' },
    { ic: 'moon', t: 'Zegar nocny i wygaszacz', d: 'W nocy ekran pokazuje przyciemniony zegar, a gdy nikt go nie dotyka – duży zegar z pogodą. Gdy ktoś zadzwoni do drzwi, od razu zobaczysz obraz z kamery. Ustawisz to w Ustawieniach → Ekran.', g: 'tap' }
  ];
  function tour(force) {
    try { if (!force && localStorage.getItem('panel.tour')) return; } catch (e) { return; }
    var i = 0, el = document.createElement('div'); el.id = 'tour'; el.className = 'tour'; document.body.appendChild(el);
    ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove'].forEach(function (t) { el.addEventListener(t, function (ev) { ev.stopPropagation(); }); });
    var done = function () { try { localStorage.setItem('panel.tour', '1'); } catch (e) { /* */ } el.remove(); idleAt = Date.now(); };
    var draw = function () {
      var s = STEPS[i], last = i === STEPS.length - 1;
      el.innerHTML = '<div class="tc"><div class="tg g-' + s.g + '"><i class="tico">' + FIx(s.ic, '#fff') + '</i><span class="hand"></span></div><b>' + s.t + '</b><p>' + s.d + '</p>' +
        '<div class="tdots">' + STEPS.map(function (x, j) { return '<i class="' + (j === i ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
        '<div class="tb">' + (last ? '' : '<button data-tr="skip">Pomiń</button>') + '<button data-tr="next" class="pri">' + (last ? 'Zaczynamy' : 'Dalej') + '</button></div></div>';
    };
    el.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-tr]'); if (!b) return;
      if (b.getAttribute('data-tr') === 'skip') return done();
      if (++i >= STEPS.length) return done();
      draw();
    });
    draw();
  }
  setTimeout(function () { tour(false); }, 2500);
  P.tour = function () { tour(true); };

  // ---------- panel ustawień (Ustawienia → Ekran) ----------
  function chk(on) { return on ? '<b style="color:#0a84ff">✓</b>' : ''; }
  function row(l, v, act, k) { return '<div class="sr link" data-sact="' + act + '" data-k="' + k + '"><span>' + l + '</span><span class="sv">' + v + '</span></div>'; }
  function seg(act, list, cur) { return '<div class="segs2">' + list.map(function (o) { return '<button class="' + (String(cur) === String(o[0]) ? 'sel' : '') + '" data-sact="' + act + '" data-k="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  // czujnik ruchu TEGO tabletu: Kiosk zgłasza model urządzenia (sensor.*_device, np. „samsung SM-X230”),
  // a ten sam model jest w przeglądarce tabletu – po nim rozpoznajemy, który czujnik jest nasz
  function ownSensor() {
    var ua = navigator.userAgent, hit = null;
    P.ids().forEach(function (e) {
      if (hit || !/^sensor\..+_device$/.test(e)) return;
      var v = String(stv(e) || ''), model = v.split(' ').pop();
      if (model && model.length >= 4 && ua.indexOf(model) >= 0) {
        var m = 'binary_sensor.' + e.slice(7, -7) + '_motion';
        if (P.st(m)) hit = m;
      }
    });
    return hit;
  }
  function motionList() { var o = ownSensor(); return cfg().motionOn && o ? [o] : []; }
  function motionPane() {
    var o = ownSensor(), on = !!cfg().motionOn;
    return '<div class="sg-h">BUDZENIE RUCHEM NA TYM EKRANIE</div>' +
      (o ? '<div class="sg"><div class="sr"><span>Budź ruchem przed tabletem<small>' + esc(String(attr(o, 'friendly_name') || o)) + '</small></span><span class="sv"><button class="tgl' + (on ? ' on' : '') + '" data-sact="amb-motion"><i></i></button></span></div></div>' +
        '<div class="sg-f">Używa tylko czujnika ruchu tego tabletu. Gdy ktoś podejdzie, wygaszacz z zegarem zniknie i pokaże się strona główna. W nocy zostaje zegar nocny.</div>'
        : '<div class="sg"><div class="sr"><span>Ten ekran nie ma własnego czujnika ruchu<small>Budzenie ruchem działa na tabletach z aplikacją Kiosk, która udostępnia czujnik ruchu w Home Assistant.</small></span></div></div>');
  }
  P.ambPane = function () {
    var c = cfg();
    return '<div class="sg-h">ZEGAR NOCNY NA TYM EKRANIE</div><div class="sg">' + '<div class="sr"><span>Zegar nocny</span><span class="sv"><button class="tgl' + (c.night ? ' on' : '') + '" data-sact="amb-night"><i></i></button></span></div></div>' +
      (c.night ? '<div class="sg-h">OD GODZINY</div>' + seg('amb-from', [[21, '21:00'], [22, '22:00'], [23, '23:00'], [0, '0:00']], c.from) + '<div class="sg-h">DO GODZINY</div>' + seg('amb-to', [[5, '5:00'], [6, '6:00'], [7, '7:00'], [8, '8:00']], c.to) : '') +
      '<div class="sg-f">W nocy, po minucie bez dotyku, ekran pokazuje przyciemniony czerwony zegar z datą i pogodą. Dotknięcie wraca do Panelu.</div>' +
      '<div class="sg-h">WYGASZACZ</div>' + seg('amb-saver', [[0, 'Wyłączony'], [2, '2 min'], [5, '5 min'], [10, '10 min'], [30, '30 min']], c.saver) +
      '<div class="sg-f">Po tym czasie bez dotyku ekran pokazuje duży zegar z datą i pogodą.</div>' +
      motionPane() +
      '<div class="sg-h">DZWONEK DO DRZWI</div><div class="sg"><div class="sr"><span>Kamera na cały ekran</span><span class="sv"><button class="tgl' + (c.bell ? ' on' : '') + '" data-sact="amb-bell"><i></i></button></span></div>' +
      row('<a>Wypróbuj teraz</a>', '›', 'amb-test', '1') + '</div><div class="sg-f">Gdy ktoś zadzwoni, Panel pokaże obraz z kamery dzwonka i zagra dźwięk. Okno samo się zamyka po minucie.</div>' +
      '<div class="sg">' + row('<a>Pokaż samouczek</a>', '›', 'amb-tour', '1') + '</div>';
  };
  P.ambAct = function (a) {
    var k = a.getAttribute('data-sact'), v = a.getAttribute('data-k'), c = cfg();
    if (k === 'amb-night') setCfg('night', !c.night);
    else if (k === 'amb-from') setCfg('from', +v);
    else if (k === 'amb-to') setCfg('to', +v);
    else if (k === 'amb-saver') setCfg('saver', +v);
    else if (k === 'amb-bell') setCfg('bell', !c.bell);
    else if (k === 'amb-motion') setCfg('motionOn', !c.motionOn);
    else if (k === 'amb-test') { $('set').classList.add('hidden'); P.testBell(); return false; }
    else if (k === 'amb-tour') { $('set').classList.add('hidden'); P.tour(); return false; }
    return true;
  };
})();
