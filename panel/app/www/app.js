// Panel – frontend. Bez frameworka; kafle rysowane z layout.json.
(function () {
  'use strict';
  var S = {};            // stany encji
  var layout = null, view = null;
  var tiles = [];        // {cfg, el, deps:Set, wild:[prefixy], html}
  var dirty = new Set(), all = false, raf = 0;
  var popup = null;      // {render:fn}
  var $ = function (id) { return document.getElementById(id); };

  // ---------- pomocnicze ----------
  function st(id) { return id ? S[id] : undefined; }
  function stv(id) { var s = S[id]; return s ? s.state : undefined; }
  function num(id) { var v = parseFloat(stv(id)); return isNaN(v) ? null : v; }
  function attr(id, a) { var s = S[id]; return s && s.attributes ? s.attributes[a] : undefined; }
  function bad(v) { return v === undefined || v === 'unavailable' || v === 'unknown'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pl(n, d) { var x = String(n.toFixed(d)); return window.I18N && I18N.en ? x : x.replace('.', ','); }
  function plural(n, one, few, many) { if (n === 1) return one; var u = n % 10, t = n % 100; return (u >= 2 && u <= 4 && (t < 12 || t > 14)) ? few : many; }
  var EN = !!(window.I18N && I18N.en), LOC = EN ? 'en-GB' : 'pl-PL';
  var DAYS = EN ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var DSH = EN ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  var MON = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] : ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  var MSH = EN ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

  function imgSrc(v) {
    if (!v) return '';
    if (/^image\.[a-z0-9_]+$/.test(v)) return 'api/image/' + v + '?v=' + encodeURIComponent(stv(v) || '');
    if (/^img\//.test(v)) return 'api/file/' + v;
    if (/^\/local\//.test(v)) return 'api/www/' + v.slice(7).split('/').map(encodeURIComponent).join('/');
    if (/^www:/.test(v)) return 'api/wwwfind?q=' + encodeURIComponent(v.slice(4));
    return /^https?:\/\//.test(v) ? v : '';
  }
  function api(p, opt) {
    return fetch('api/' + p, opt).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
  }
  function call(domain, service, data, target) {
    return api('service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain, service: service, data: data || {}, target: target }) })
      .catch(function (e) { toast('Błąd: ' + e.message); throw e; });
  }
  var toastT;
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.add('hidden'); }, 2600); }

  var I = { // ikony
    car: '<svg viewBox="0 0 60 30" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M4 22h52v-6l-6-2-8-8H20l-8 8-8 2z"/><circle cx="16" cy="23" r="4" fill="rgba(0,0,0,.25)"/><circle cx="44" cy="23" r="4" fill="rgba(0,0,0,.25)"/></svg>',
    upd: function (c) { return FI('update', c); },
    ok: function (c) { return FI('check', c); },
    bat: function (c) { return FI('battery', c); },
    shield: function (c, off) { return FI(off ? 'shield' : 'shieldok', c); },
    bin: function (c) { return FI('bin', c); },
    wash: function (c) { return FI('wash', c); }
  };

  // ---------- kafle ----------
  // Każdy typ: render(cfg, tile) -> html; opcjonalnie tap(cfg), hold(cfg), act[nazwa](cfg, el), wide, center, cls(cfg)
  var T = {};

  T.clock_weather = {
    wide: true, ticks: true,
    deps: function (c) { return [c.weather, c.sun]; },
    render: function (c, t) {
      var n = new Date(), w = st(c.weather), night = stv(c.sun) === 'below_horizon';
      var a = (w && w.attributes) || {}, cond = w ? w.state : '';
      var COND = { 'clear-night': 'Bezchmurnie', sunny: 'Słonecznie', partlycloudy: 'Częściowe zachmurzenie', cloudy: 'Pochmurno', rainy: 'Deszcz', pouring: 'Ulewa', lightning: 'Burza', 'lightning-rainy': 'Burza z deszczem', snowy: 'Śnieg', 'snowy-rainy': 'Deszcz ze śniegiem', hail: 'Grad', fog: 'Mgła', windy: 'Wietrznie', 'windy-variant': 'Wietrznie', exceptional: 'Nietypowo' };
      t.el.style.background = night ? 'linear-gradient(180deg,#050b1f 0%,#0e1d45 60%,#1d3366 100%)'
        : (/rain|pour|light|snow|hail|fog|cloudy$/.test(cond) && cond !== 'partlycloudy' ? 'linear-gradient(180deg,#3b4a5c 0%,#56677b 60%,#74859a 100%)' : 'linear-gradient(180deg,#2f7fd6 0%,#4d9be6 55%,#86c1f2 100%)');
      var deco = night ? (t.stars || (t.stars = stars())) + (cond === 'clear-night' ? '<div class="moon"></div>' : '') : (cond === 'sunny' || cond === 'partlycloudy' ? '<div class="sunb"></div>' : '');
      var fc = (t.fc || []).filter(function (f) { return new Date(f.datetime).toDateString() !== n.toDateString(); }).slice(0, 3).map(function (f) {
        var d = new Date(f.datetime);
        return '<div>' + DSH[d.getDay()] + '<b>' + Math.round(f.temperature) + '°' + (f.templow != null ? ' / ' + Math.round(f.templow) + '°' : '') + '</b></div>';
      }).join('');
      var mm = n.getMinutes();
      if (c.mode === 'weather') {
        // tylko pogoda: duża temperatura z opisem | prognoza na 3 dni
        var DIRS = ['pn', 'pn-wsch', 'wsch', 'pd-wsch', 'pd', 'pd-zach', 'zach', 'pn-zach'];
        var wd = a.wind_bearing != null ? ' ' + DIRS[Math.round(((a.wind_bearing % 360) + 360) % 360 / 45) % 8] : '';
        var rows = [
          a.apparent_temperature != null ? ['Odczuwalna', Math.round(a.apparent_temperature) + '°'] : null,
          a.humidity != null ? ['Wilgotność', Math.round(a.humidity) + '%'] : null,
          a.wind_speed != null ? ['Wiatr', Math.round(a.wind_speed) + ' ' + (a.wind_speed_unit || 'km/h') + wd] : null,
          a.pressure != null ? ['Ciśnienie', Math.round(a.pressure) + ' ' + (a.pressure_unit || 'hPa')] : null
        ].filter(Boolean);
        return (t.stars && night ? t.stars : '') + '<div class="cw wo"><div class="cw-l"><div class="cw-t">' + (deco.indexOf('moon') >= 0 ? '<i class="moon"></i>' : deco.indexOf('sunb') >= 0 ? '<i class="sunb"></i>' : '') +
          '<span class="wtemp">' + (a.temperature != null ? Math.round(a.temperature) + '°' : '–') + '</span></div></div>' +
          '<div class="cw-r wnow"><b>' + esc(COND[cond] || cond || '–') + '</b>' + rows.map(function (r) { return '<div><span>' + r[0] + '</span><em>' + esc(r[1]) + '</em></div>'; }).join('') + '</div></div>';
      }
      // dwie kolumny: godzina i data | pogoda (temperatura, opis, prognoza) – wszystko mieści się w wysokości kafla
      return (t.stars && night ? t.stars : '') + '<div class="cw"><div class="cw-l"><div class="time">' + n.getHours() + ':' + (mm < 10 ? '0' : '') + mm + '</div><div class="date">' + DAYS[n.getDay()] + ', ' + n.getDate() + ' ' + MON[n.getMonth()] + '</div></div>' +
        '<div class="cw-r"><div class="cw-t">' + (deco.indexOf('moon') >= 0 ? '<i class="moon"></i>' : deco.indexOf('sunb') >= 0 ? '<i class="sunb"></i>' : '') + '<span class="temp">' + (a.temperature != null ? pl(a.temperature, 1) + '°' : '–') + '</span></div>' +
        '<div class="cw-c">' + esc(COND[cond] || cond) + (a.humidity != null ? ' · ' + a.humidity + '%' : '') + (a.wind_speed != null ? ' · ' + pl(a.wind_speed, 0) + ' ' + (a.wind_speed_unit || 'km/h') : '') + '</div>' +
        '<div class="fc">' + fc + '</div></div></div>';
    },
    init: function (c, t) {
      var load = function () { if (!c.weather) return; api('forecast?entity=' + encodeURIComponent(c.weather)).then(function (d) { t.fc = d; mark(t); }).catch(function () {}); };
      load(); setInterval(load, 600000);
    },
    tap: function (c) { moreInfo(c.weather); }
  };
  function stars() {
    var s = '', r = function (i, k) { var x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    for (var i = 0; i < 60; i++) s += '<circle cx="' + (r(i, 1) * 100).toFixed(2) + '" cy="' + (r(i, 2) * 32).toFixed(2) + '" r="' + (0.08 + r(i, 3) * 0.18).toFixed(2) + '" fill="#fff" opacity="' + (0.3 + r(i, 4) * 0.6).toFixed(2) + '"/>';
    return '<svg class="stars" viewBox="0 0 100 50" preserveAspectRatio="none">' + s + '</svg>';
  }

  T.analog_clock = {
    seconds: true,
    render: function () {
      var n = new Date(), s = n.getSeconds(), m = n.getMinutes() + s / 60, h = (n.getHours() % 12) + m / 60, t = '', num = '';
      for (var i = 0; i < 60; i++) {
        var big = i % 5 === 0, a = i * 6 * Math.PI / 180, r1 = big ? 84 : 87;
        t += '<line x1="' + (100 + r1 * Math.sin(a)).toFixed(2) + '" y1="' + (100 - r1 * Math.cos(a)).toFixed(2) + '" x2="' + (100 + 92 * Math.sin(a)).toFixed(2) + '" y2="' + (100 - 92 * Math.cos(a)).toFixed(2) + '" stroke="#fff" stroke-opacity="' + (big ? 1 : .55) + '" stroke-width="' + (big ? 2.4 : 1.1) + '" stroke-linecap="round"/>';
      }
      for (var k = 1; k <= 12; k++) { var b = k * 30 * Math.PI / 180; num += '<text x="' + (100 + 71 * Math.sin(b)).toFixed(2) + '" y="' + (100 - 71 * Math.cos(b)).toFixed(2) + '" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="19" font-weight="600">' + k + '</text>'; }
      var hand = function (deg, len, w, col) { return '<line x1="100" y1="100" x2="100" y2="' + (100 - len) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" transform="rotate(' + deg.toFixed(2) + ' 100 100)"/>'; };
      return '<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="97" fill="#0b0b0d"/><circle cx="100" cy="100" r="97" fill="none" stroke="rgba(255,255,255,.18)"/>' + t + num +
        hand(h * 30, 48, 6, '#fff') + hand(m * 6, 70, 4, '#fff') + hand(s * 6, 78, 1.6, '#ff9f0a') + '<circle cx="100" cy="100" r="4" fill="#ff9f0a"/></svg>';
    }
  };

  T.camera = {
    deps: function (c) { return [c.entity]; },
    render: function (c) {
      return '<img alt=""><div class="shade"></div><div class="lbl"><span class="big">' + esc(c.name || '') + '</span><span class="chip live">● LIVE</span></div>';
    },
    after: function (c, t) {
      var img = t.el.querySelector('img');
      if (t.timer) return;
      var load = function () {
        if (document.hidden) return;
        var n = new Image(); n.onload = function () { var i = t.el.querySelector('img'); if (i) i.src = n.src; };
        n.src = 'api/camera/' + c.entity + '?t=' + Date.now();
      };
      load(); t.timer = setInterval(load, (c.refresh || 2) * 1000);
      if (img) img.src = '';
    },
    tap: function (c) {
      if (PANEL.openCamera) return PANEL.openCamera(c.entity, c.name);
      var timer;
      openPop(function () {
        return '<h2>' + esc(c.name || 'Kamera') + '<button class="x" data-close>×</button></h2><img class="camfull" id="camfull" alt="">';
      }, { wide: true, onOpen: function () {
        var f = function () { var n = new Image(); n.onload = function () { var i = $('camfull'); if (i) i.src = n.src; }; n.src = 'api/camera/' + c.entity + '?t=' + Date.now(); };
        f(); timer = setInterval(f, 1000);
      }, onClose: function () { clearInterval(timer); }, static: true });
    }
  };

  T.thermostat = {
    deps: function (c) { return [c.entity]; },
    cls: function (c) { var v = stv(c.entity); return bad(v) || v === 'off' ? '' : 'on'; },
    render: function (c, t) {
      var s = st(c.entity); if (!s) return '<div class="ttl">' + esc(c.name) + '</div><div class="small">Niedostępny</div>';
      var a = s.attributes, off = s.state === 'off', heat = a.hvac_action === 'heating';
      var tgt = t.pending != null ? t.pending : parseFloat(a.temperature), cur = parseFloat(a.current_temperature);
      var big = isNaN(tgt) ? '–' : (tgt % 1 === 0 ? String(tgt) : pl(tgt, 1));
      var sub = [c.room, isNaN(cur) ? null : pl(cur, 1) + '°'].filter(Boolean).join(' · ');
      var stat = off ? 'Wyłączony' : heat ? '<span class="heat">Grzeje</span>' : 'Czeka';
      return '<div class="th-h"><b>' + esc(c.name || 'Termostat') + '</b><small>' + esc(sub) + '</small></div>' +
        '<div class="tbig' + (t.pending != null ? ' pend' : '') + (big.length > 2 ? ' dec' : '') + '">' + big + '<span>°</span></div>' +
        '<div class="tfoot"><div class="tchev" data-act="minus" data-now="1">' + FI('minus', 'currentColor') + '</div>' +
        '<div class="th-st">' + stat + '</div>' +
        '<div class="tchev" data-act="plus" data-now="1">' + FI('plus', 'currentColor') + '</div></div>';
    },
    act: {
      minus: function (c, el, t) { T.thermostat.step(c, t, -1); },
      plus: function (c, el, t) { T.thermostat.step(c, t, 1); }
    },
    step: function (c, t, dir) {
      var a = attr(c.entity, 'temperature'); if (a == null) return;
      var stp = c.step || attr(c.entity, 'target_temp_step') || 0.5;
      t.pending = Math.round(((t.pending != null ? t.pending : a) + dir * stp) * 10) / 10;
      mark(t); clearTimeout(t.deb);
      t.deb = setTimeout(function () {
        var v = t.pending;
        call('climate', 'set_temperature', { temperature: v }, { entity_id: c.entity }).finally(function () { setTimeout(function () { t.pending = null; mark(t); }, 1500); });
      }, 900);
    },
    tap: function (c) { if (PANEL.openDevice) PANEL.openDevice(c.entity); else moreInfo(c.entity); }
  };

  // przycinanie przezroczystych marginesów zdjęć aut (np. zdjęcie BMW z integracji ma duże puste brzegi)
  var TRIM = {};
  function trimImg(src, cb) {
    if (TRIM[src] !== undefined) return;
    TRIM[src] = null;
    var im = new Image();
    im.onload = function () {
      try {
        var w = im.naturalWidth, h = im.naturalHeight, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
        var d = cx.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
        for (var y = 0; y < h; y += 2) for (var x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 90) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 < 0 || (x1 - x0 > w * 0.96 && y1 - y0 > h * 0.96)) { TRIM[src] = src; return cb(); }
        var p = 2; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(w - 1, x1 + p); y1 = Math.min(h - 1, y1 + p);
        var o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
        o.getContext('2d').drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
        TRIM[src] = o.toDataURL('image/png');
      } catch (e) { TRIM[src] = src; }
      cb();
    };
    im.onerror = function () { TRIM[src] = src; };
    im.src = src;
  }
  T.car = {
    deps: function (c) { return [c.battery, c.range, c.plug, c.location, c.charging, /^image\./.test(c.image || '') ? c.image : null]; },
    cls: function (c) { return ['on', 'chargingactive', 'charging'].indexOf(stv(c.charging)) >= 0 ? 'on' : ''; },
    render: function (c) {
      var b = num(c.battery), r = num(c.range), loc = stv(c.location), ch = stv(c.charging), pl_ = stv(c.plug);
      if (r != null) r = miles(c.range, r);
      var charging = ['on', 'chargingactive', 'charging'].indexOf(ch) >= 0, plugged = pl_ === (c.plug_on || 'on');
      var chip = charging ? '<span class="chip c-green">⚡ Ładuje</span>' : plugged ? '<span class="chip c-blue">Podłączony</span>' : '<span class="chip c-grey">Niepodłączony</span>';
      var col = b == null ? '#888' : b <= 20 ? '#ff453a' : b <= 40 ? '#ff9f0a' : '#30d158';
      var stt = charging ? 'Ładuje' : plugged ? 'Podłączony' : 'Niepodłączony';
      if (c.image) return '<div class="h"><span class="ttl">' + esc(c.name) + '</span></div>' +
        '<div class="carph"><img src="' + (TRIM[imgSrc(c.image)] || imgSrc(c.image)) + '" alt=""></div>' +
        '<div class="cbot"><div class="bar"><i style="width:' + (b || 0) + '%;background:' + col + '"></i></div><div class="big">' + (b == null ? '–' : Math.round(b)) + '% · ' + (r == null ? '–' : Math.round(r) + ' mi') + '</div>' +
        '<div class="small">' + esc(stt + (bad(loc) || !loc ? '' : ' · ' + loc)) + '</div></div>';
      return '<div class="h"><span class="ttl">' + esc(c.name) + '</span>' + chip + '</div>' +
        '<div class="car">' + I.car + '<div class="pct">' + (b == null ? '–' : Math.round(b)) + '<small>%</small></div></div>' +
        '<div><div class="bar"><i style="width:' + (b || 0) + '%;background:' + col + '"></i></div><div class="row"><span>Zasięg ' + (r == null ? '–' : Math.round(r) + ' mi') + '</span><span>' + esc(bad(loc) ? '' : loc) + '</span></div></div>';
    },
    after: function (c, t) { if (c.image) { var src = imgSrc(c.image); if (TRIM[src] === undefined) trimImg(src, function () { t.html = null; mark(t); }); } },
    tap: function (c) { moreInfo(c.battery); }
  };

  function powerEnt(c) { var k = Object.keys(S); return c.power || k.filter(function (e) { return /^sensor\.octopus_energy_electricity_.*_current_demand$/.test(e); })[0] || k.filter(function (e) { return e.indexOf('sensor.') === 0 && attr(e, 'device_class') === 'power' && /^(W|kW)$/.test(attr(e, 'unit_of_measurement') || '') && /total|house|home|grid|demand|consumption|dom|pob/i.test(e); })[0]; }
  T.energy = {
    std: true,
    deps: function (c) { return [c.rate, c.off_peak, c.elec_cost, c.elec_kwh, c.gas_cost, powerEnt(c)]; },
    render: function (c) {
      var pe = powerEnt(c), w = num(pe), u = attr(pe, 'unit_of_measurement') || 'W';
      if (w != null && /kW/i.test(u)) w = w * 1000;
      var rate = num(c.rate), runit = attr(c.rate, 'unit_of_measurement') || '', op = stv(c.off_peak) === 'on', ec = num(c.elec_cost);
      var col = w == null ? '#8e8e93' : w < 400 ? '#30d158' : w < 1500 ? '#ffcc00' : w < 3000 ? '#ff9f0a' : '#ff453a';
      var big = w == null ? '–' : w >= 1000 ? pl(w / 1000, 2) + ' kW' : Math.round(w) + ' W';
      var sub = [rate == null ? null : (/GBP/.test(runit) ? pl(rate * 100, 1) + ' p/kWh' : pl(rate, 2) + ' ' + runit), ec == null ? null : 'dziś £' + pl(ec, 2)].filter(Boolean).join(' · ');
      return '<div class="h"><span class="ttl">Energia</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + FI('bolt', col) + '</div>' +
        '<div><div class="big">' + (w == null ? 'Brak odczytu' : 'Teraz ' + big) + '</div>' + (sub ? '<div class="small">' + esc(sub) + '</div>' : '') + '</div>';
    },
    tap: function (c) { moreInfo(c.elec_cost); }
  };

  T.updates = {
    std: true,
    wild: ['update.'],
    render: function (c) {
      var up = Object.keys(S).filter(function (e) { return e.indexOf('update.') === 0 && e !== 'update.panel_update' && S[e].state === 'on'; })
        .map(function (e) { return (attr(e, 'title') || attr(e, 'friendly_name') || e).replace(/ (Update|Firmware|Aktualizacja)$/i, ''); });
      var n = up.length, col = n ? '#0a84ff' : '#30d158', ver = attr(c.core || 'update.home_assistant_core_update', 'installed_version') || '';
      var title = n ? (n + ' ' + plural(n, 'aktualizacja', 'aktualizacje', 'aktualizacji')) : 'System aktualny';
      var sub = n ? up.slice(0, 2).join(', ') + (n > 2 ? ' +' + (n - 2) : '') : 'Home Assistant ' + ver;
      return '<div class="h"><span class="ttl">System</span></div><div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + (n ? I.upd(col) : I.ok(col)) + '</div>' +
        '<div><div class="big">' + esc(title) + '</div><div class="small">' + esc(sub) + '</div></div>';
    }
  };

  // baterie telefonów, tabletów i aut (urządzenia z lokalizacją GPS) się ładuje, a nie wymienia – pomijamy je
  function mobileBat(e) {
    var o = e.split('.')[1];
    if (/_battery_level$/.test(o) && S['sensor.' + o.replace(/_level$/, '_state')]) return true; // aplikacja HA w telefonie/tablecie
    if (/tablet|iphone|ipad|phone|watch/.test(o)) return true;
    return Object.keys(S).some(function (t) { if (t.indexOf('device_tracker.') !== 0 || attr(t, 'source_type') !== 'gps') return false; var to = t.split('.')[1].replace(/_device_tracker$/, ''); return to.length > 2 && o.indexOf(to) === 0; });
  }
  T.batteries = {
    std: true,
    wild: ['sensor.', 'binary_sensor.'],
    render: function (c) {
      var TH = c.threshold || 10;
      var nm = function (e) { return (attr(e, 'friendly_name') || e).replace(/\s*(Bateria|Battery|Battery level|Poziom baterii)$/i, '').trim(); };
      var allb = Object.keys(S).filter(function (e) { return e.indexOf('sensor.') === 0 && attr(e, 'device_class') === 'battery' && !isNaN(parseFloat(S[e].state)) && !mobileBat(e); })
        .map(function (e) { return { n: nm(e), v: parseFloat(S[e].state) }; }).sort(function (a, b) { return a.v - b.v; });
      var lowb = Object.keys(S).filter(function (e) { return e.indexOf('binary_sensor.') === 0 && attr(e, 'device_class') === 'battery' && S[e].state === 'on'; }).map(function (e) { return { n: nm(e), v: null }; });
      var low = allb.filter(function (x) { return x.v <= TH; }).concat(lowb), n = low.length, min = allb[0];
      var col = n ? '#ff453a' : (min && min.v <= 25 ? '#ff9f0a' : '#30d158');
      var title = n ? (n === 1 ? 'Słaba bateria' : 'Słabe baterie: ' + n) : 'Baterie OK';
      var sub = n ? low.map(function (x) { return x.n + (x.v != null ? ' ' + Math.round(x.v) + '%' : ''); }).join(', ') : (min ? 'Najniższa: ' + min.n + ' ' + Math.round(min.v) + '%' : 'Brak czujników');
      this._list = allb;
      return '<div class="h"><span class="ttl">Baterie</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + I.bat(col) + '</div>' +
        '<div><div class="big">' + esc(title) + '</div><div class="small">' + esc(sub) + '</div></div>';
    },
    tap: function () {
      var l = T.batteries._list || [];
      openPop(function () {
        return '<h2>Baterie<button class="x" data-close>×</button></h2>' + l.map(function (x) {
          var col = x.v <= 10 ? '#ff453a' : x.v <= 25 ? '#ff9f0a' : '#30d158';
          return '<div class="lrow"><span>' + esc(x.n) + '</span><b style="color:' + col + '">' + Math.round(x.v) + '%</b></div>';
        }).join('');
      });
    }
  };

  T.rooms = {
    std: true,
    render: function (c) {
      var col = '#bf5af2';
      return '<div class="h"><span class="ttl">' + esc(c.name || 'Pomieszczenia') + '</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + FI('home', col) + '</div>' +
        '<div><div class="big">' + esc(c.sub || 'W domu') + '</div></div>';
    },
    tap: function () { if (PANEL.openScreen) PANEL.openScreen('home'); }
  };

  // kafel Home Assistant: otwiera ustawienia HA w głównym oknie
  // kafel osoby: gdzie jest teraz (strefa / adres) i od kiedy
  function personZone(e) {
    var v = stv(e); if (bad(v)) return { t: 'Nieznane', col: '#8e8e93' };
    if (v === 'home') return { t: 'W domu', col: '#30d158' };
    if (v === 'not_home') return { t: 'Poza domem', col: '#ff9f0a' };
    return { t: v, col: '#0a84ff' };
  }
  function personAddr(c) {
    if (c.address) return stv(c.address);
    var tr = attr(c.entity, 'source'), dev = tr ? tr.split('.')[1] : '', geo = dev && Object.keys(S).filter(function (k) { return k === 'sensor.' + dev + '_geocoded_location'; })[0];
    return geo ? stv(geo) : null;
  }
  function since(e) {
    var s = S[e]; if (!s || !s.last_changed) return '';
    var d = new Date(s.last_changed), n = new Date(), hm = d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2);
    if (d.toDateString() === n.toDateString()) return 'od ' + hm;
    var y = new Date(n); y.setDate(n.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'od wczoraj ' + hm;
    return 'od ' + d.getDate() + ' ' + MSH[d.getMonth()] + ' ' + hm;
  }
  T.person = {
    std: true,
    deps: function (c) { var tr = attr(c.entity, 'source'), dev = tr ? tr.split('.')[1] : ''; return [c.entity, c.address, tr, dev ? 'sensor.' + dev + '_geocoded_location' : null]; },
    render: function (c) {
      var z = personZone(c.entity), pic = attr(c.entity, 'entity_picture'), addr = personAddr(c), v = stv(c.entity);
      var nm = c.name || String(attr(c.entity, 'friendly_name') || '').split(' ')[0];
      var sub = [since(c.entity), v !== 'home' && addr && !bad(addr) ? addr.split(',').slice(0, 2).join(',') : null].filter(Boolean).join(' · ');
      return '<div class="h"><span class="ttl" translate="no">' + esc(nm) + '</span></div>' +
        (pic ? '<div class="pphoto" style="background-image:url(\'api/art/' + c.entity + '?v=' + encodeURIComponent(String(pic).slice(-20)) + '\')"></div>'
          : '<div class="ring" style="background:' + z.col + '33;border:2.5px solid ' + z.col + '">' + FI('person', z.col) + '</div>') +
        '<div><div class="big" translate="no">' + esc(z.t) + '</div>' + (sub ? '<div class="small" translate="no">' + esc(sub) + '</div>' : '') + '</div>';
    },
    tap: function (c) {
      openPop(function () {
        var z = personZone(c.entity), addr = personAddr(c), tr = attr(c.entity, 'source');
        var bat = tr && Object.keys(S).filter(function (k) { return k.indexOf('sensor.' + tr.split('.')[1]) === 0 && attr(k, 'device_class') === 'battery'; })[0];
        return '<h2 translate="no">' + esc(attr(c.entity, 'friendly_name') || c.name) + '<button class="x" data-close>×</button></h2>' +
          '<div class="lrow"><span>Gdzie</span><b translate="no">' + esc(z.t) + '</b></div>' +
          (addr && !bad(addr) ? '<div class="lrow"><span>Adres</span><b translate="no" style="text-align:right;max-width:70%">' + esc(addr) + '</b></div>' : '') +
          '<div class="lrow"><span>Zmiana</span><b>' + esc(since(c.entity).replace(/^od /, '')) + '</b></div>' +
          (bat ? '<div class="lrow"><span>Bateria telefonu</span><b>' + esc(stv(bat)) + '%</b></div>' : '');
      });
    }
  };
  // kafel temperatury (np. szafka Ubiquiti): kolor wg progów, do tego stan internetu
  T.temp = {
    std: true,
    deps: function (c) { return [c.entity, c.internet, c.remote]; },
    render: function (c) {
      var v = num(c.entity), u = attr(c.entity, 'unit_of_measurement') || '°C', warn = c.warn || 45, hot = c.hot || 55;
      var col = v == null ? '#8e8e93' : v < warn ? '#30d158' : v < hot ? '#ff9f0a' : '#ff453a';
      var ok = function (e, n) { if (!e || !S[e]) return null; var on = stv(e) === 'on'; return n + ' ' + (on ? '✓' : '✗'); };
      var sub = [c.sub, ok(c.internet, 'Internet'), ok(c.remote, 'Zdalny')].filter(Boolean).join(' · ');
      return '<div class="h"><span class="ttl">' + esc(c.name || attr(c.entity, 'friendly_name') || 'Temperatura') + '</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + FI('thermo', col) + '</div>' +
        '<div><div class="big">' + (v == null ? 'Brak odczytu' : pl(v, 1) + ' ' + esc(u)) + '</div>' + (sub ? '<div class="small">' + esc(sub) + '</div>' : '') + '</div>';
    },
    tap: function (c) { if (PANEL.openScreen) PANEL.openScreen('system'); else moreInfo(c.entity); }
  };
  // kafel „Kamery”: mozaika podglądów wszystkich kamer, dotknięcie otwiera podstronę z kamerami
  T.cameras = {
    std: true,
    render: function (c) {
      var n = (PANEL.cameraList ? PANEL.cameraList() : []).length, col = '#64d2ff';
      return '<div class="h"><span class="ttl">' + esc(c.name || 'Kamery') + '</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + FI('camera', col) + '</div>' +
        '<div><div class="big">' + (n ? n + ' ' + plural(n, 'kamera', 'kamery', 'kamer') : 'Brak kamer') + '</div></div>';
    },
    tap: function () { if (PANEL.openScreen) PANEL.openScreen('cameras'); }
  };
  T.ha = {
    std: true,
    deps: function () { return ['update.home_assistant_core_update']; },
    render: function (c) {
      var ver = attr('update.home_assistant_core_update', 'installed_version'), col = '#18bcf2';
      return '<div class="h"><span class="ttl">' + esc(c.name || 'Home Assistant') + '</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + FI('hagear', col) + '</div>' +
        '<div><div class="big">' + esc(c.sub || 'Ustawienia') + '</div>' + (ver ? '<div class="small">Wersja ' + esc(ver) + '</div>' : '') + '</div>';
    },
    tap: function (c) {
      var url = c.url || '/config/dashboard';
      try { if (window.top && window.top !== window) { window.top.location.href = url; return; } } catch (e) { /* inna domena */ }
      window.location.href = url;
    }
  };

  T.lights = {
    std: true,
    deps: function (c) { return Object.keys(c.lights || {}); },
    cls: function (c) { return T.lights.on(c).length ? 'on' : ''; },
    on: function (c) { return Object.keys(c.lights || {}).filter(function (e) { return stv(e) === 'on'; }); },
    render: function (c) {
      var n = T.lights.on(c).length, all = Object.keys(c.lights || {}).length, col = n ? '#ffcc00' : '#8e8e93';
      return '<div class="h"><span class="ttl">Światła</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + FI('bulb', col) + '</div>' +
        '<div><div class="big">' + (n ? n + ' ' + plural(n, 'włączone', 'włączone', 'włączonych') : 'Wszystkie zgaszone') + '</div></div>';
    },
    allOff: function (c) {
      var on = T.lights.on(c); if (!on.length) return;
      call('light', 'turn_off', {}, { entity_id: on }).then(function () { toast('Zgaszono ' + on.length + ' ' + plural(on.length, 'światło', 'światła', 'świateł')); });
    },
    tap: function (c) {
      openPop(function () {
        var by = {};
        Object.keys(c.lights || {}).forEach(function (e) { if (!S[e]) return; (by[c.lights[e]] = by[c.lights[e]] || []).push(e); });
        return '<h2>Światła<button class="x" data-close>×</button></h2><div class="btns"><button class="btn red" data-pact="alloff">Zgaś wszystkie</button><button class="btn" data-close>Zamknij</button></div>' +
          Object.keys(by).map(function (r) {
            return '<h3>' + esc(r) + '</h3>' + by[r].map(function (e) {
              var on = stv(e) === 'on';
              return '<div class="lrow' + (bad(stv(e)) ? ' unav' : '') + '" data-pact="toggle" data-e="' + e + '"><span>' + esc(attr(e, 'friendly_name') || e) + '</span><span class="sw' + (on ? ' on' : '') + '"></span></div>';
            }).join('');
          }).join('');
      }, { acts: {
        toggle: function (el) { call('light', 'toggle', {}, { entity_id: el.getAttribute('data-e') }); },
        alloff: function () { T.lights.allOff(c); }
      } });
    }
  };

  T.contacts = {
    std: true,
    deps: function (c) { return Object.keys(c.entities || {}); },
    cls: function (c) { return Object.keys(c.entities || {}).some(function (e) { return stv(e) === 'on'; }) ? 'on' : ''; },
    render: function (c) {
      var ks = Object.keys(c.entities || {}), open = ks.filter(function (e) { return stv(e) === 'on'; }), n = open.length, col = n ? '#ff9f0a' : '#30d158';
      return '<div class="h"><span class="ttl">' + esc(c.name || 'Drzwi i okna') + '</span></div>' +
        '<div class="ring" style="background:' + col + '33;border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + FI('door', col) + '</div>' +
        '<div><div class="big">' + (n ? 'Otwarte: ' + n : 'Wszystko zamknięte') + '</div>' + (n ? '<div class="small">' + esc(open.map(function (e) { return c.entities[e]; }).join(', ')) + '</div>' : '') + '</div>';
    }
  };

  var ALARM = { disarmed: 'Rozbrojony', armed_away: 'Uzbrojony · poza domem', armed_home: 'Uzbrojony · w domu', armed_night: 'Tryb nocny', armed_vacation: 'Wakacje', arming: 'Uzbrajanie…', pending: 'Oczekuje…', triggered: 'ALARM!' };
  var ALARM_C = { disarmed: '#30d158', armed_home: '#ff453a', armed_away: '#ff453a', armed_night: '#ff453a', armed_vacation: '#ff453a', arming: '#ff9f0a', pending: '#ff9f0a', triggered: '#ff453a' };
  T.alarm = {
    std: true,
    deps: function (c) { return [c.entity]; },
    cls: function (c) { var v = stv(c.entity); return v === 'triggered' ? 'alert triggered' : (v === 'arming' || v === 'pending') ? 'warn' : (v && v.indexOf('armed') === 0) ? 'alert' : ''; },
    render: function (c) {
      var v = stv(c.entity), col = ALARM_C[v] || 'rgba(255,255,255,.6)';
      var hint = !v || bad(v) ? '' : v === 'disarmed' ? 'Dotknij, aby uzbroić' : v === 'triggered' ? 'Dotknij, aby wyłączyć' : 'Dotknij, aby rozbroić';
      return '<div class="h"><span class="ttl">' + esc(c.name || 'Alarm') + '</span></div>' +
        '<div class="ring" style="background:' + (ALARM_C[v] ? col + '33' : 'rgba(255,255,255,.1)') + ';border:2.5px solid ' + col + ';box-shadow:0 0 16px ' + col + '66">' + I.shield(col, v === 'disarmed') + '</div>' +
        '<div><div class="big">' + esc(ALARM[v] || v || 'Niedostępny') + '</div>' + (hint ? '<div class="small">' + hint + '</div>' : '') + '</div>';
    },
    tap: function (c) {
      var code = '';
      openPop(function () {
        var v = stv(c.entity), needCode = attr(c.entity, 'code_format') != null;
        return '<h2>' + esc(c.name || 'Alarm') + ' · ' + esc(ALARM[v] || v) + '<button class="x" data-close>×</button></h2>' +
          (needCode ? '<div class="pinv">' + code.replace(/./g, '●') + '</div><div class="pin">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(function (k) { return '<button class="btn" data-pact="key" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' : '') +
          '<div class="btns">' + (v === 'disarmed'
            ? '<button class="btn red" data-pact="arm" data-m="arm_home">W domu</button><button class="btn red" data-pact="arm" data-m="arm_away">Poza domem</button><button class="btn red" data-pact="arm" data-m="arm_night">Na noc</button><button class="btn" data-close>Anuluj</button>'
            : '<button class="btn green" data-pact="arm" data-m="disarm" style="grid-column:span 2">Rozbrój</button>') + '</div>';
      }, { acts: {
        key: function (el) { var k = el.getAttribute('data-k'); code = k === 'C' ? '' : k === '⌫' ? code.slice(0, -1) : (code + k).slice(0, 8); },
        arm: function (el) {
          var m = el.getAttribute('data-m'), d = code ? { code: code } : {};
          call('alarm_control_panel', 'alarm_' + m, d, { entity_id: c.entity }).then(function () { closePop(); });
          code = '';
        }
      } });
    }
  };

  T.network = {
    deps: function (c) { return [c.temp, c.internet, c.remote]; },
    cls: function (c) { var t = num(c.temp); return stv(c.internet) === 'off' || (t != null && t >= 45) ? 'alert' : ''; },
    render: function (c) {
      var t = num(c.temp), inet = stv(c.internet), rem = stv(c.remote), ok = inet !== 'off';
      var tc = t == null ? '#fff' : t >= 45 ? '#ff453a' : t >= 38 ? '#ff9f0a' : '#fff';
      var yn = function (v) { return bad(v) ? '–' : v === 'on' ? '✓' : '✗'; };
      return '<div class="h"><span class="ttl">Sieć</span>' + (ok ? '<span class="chip c-green">Online</span>' : '<span class="chip c-red">Brak internetu</span>') + '</div>' +
        '<div style="text-align:center"><div class="pct" style="color:' + tc + '">' + (t == null ? '–' : Math.round(t)) + '<small>°C</small></div><div class="small">' + esc(c.temp_name || '') + '</div></div>' +
        '<div class="row"><span>Internet ' + yn(inet) + '</span><span>Zdalny dostęp ' + yn(rem) + '</span></div>';
    }
  };

  T.bins = {
    wide: true, minute: true,
    deps: function (c) { var d = []; (c.items || []).forEach(function (i) { d.push(i.entity, i.ack); }); return d; },
    render: function (c) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var items = (c.items || []).map(function (i) {
        var stt = attr(i.entity, 'start_time'), d = stt ? new Date(stt.replace(' ', 'T')) : null, days = null;
        if (d) { var dd = new Date(d); dd.setHours(0, 0, 0, 0); days = Math.round((dd - today) / 864e5); }
        if (stv(i.entity) === 'on') days = 0;
        return { i: i, d: d, days: days };
      });
      // pokaż wszystkie: najpierw kosze, potem mycia (każde według terminu)
      var bins = items.filter(function (x) { return !x.i.wash; });
      var wash = items.filter(function (x) { return x.i.wash; }).sort(function (a, b) { return (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days); });
      bins.sort(function (a, b) { return (a.days == null ? 999 : a.days) - (b.days == null ? 999 : b.days); });
      var segs = bins.concat(wash).map(function (x) {
        var i = x.i, ack = stv(i.ack) === 'on', due = x.days != null && x.days <= 1, done = due && ack;
        var when = x.days == null ? 'brak terminu' : x.days === 0 ? 'dziś' : x.days === 1 ? 'jutro' : DAYS[x.d.getDay()] + ' ' + x.d.getDate() + ' ' + MSH[x.d.getMonth()] + ' · za ' + x.days + ' dni';
        var sub = due ? (done ? '✓ ' + (i.wash ? 'zrobione' : 'wystawiony') : when + ' · dotknij, gdy ' + (i.wash ? 'umyty' : 'wystawiony')) : when;
        var ic = i.wash ? I.wash(i.color) : I.bin(i.color);
        return '<div class="seg' + (due && !done ? ' due' : '') + (done ? ' done' : '') + '"' + (due && !done ? ' data-act="ack" data-e="' + i.ack + '"' : '') + '><div class="ic" style="background:' + i.color + '33;border:1px solid ' + i.color + '">' + ic + '</div><div style="min-width:0"><b>' + esc(i.name) + '</b><small>' + esc(sub) + '</small></div></div>';
      });
      return '<div class="bins-h">' + I.bin('#fff').replace('<svg', '<svg width="28" height="28"') + 'Kosze</div>' + segs.join('');
    },
    act: { ack: function (c, el) { call('input_boolean', 'turn_on', {}, { entity_id: el.getAttribute('data-e') }); } }
  };

  // siatka urządzeń / scen – każdy element wygląda jak osobny kafel
  var DICON = {
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    blinds: '<path d="M4 4h16M5 4v12M19 4v12M5 8h14M5 12h14M5 16h14M12 16v4"/>',
    door: '<path d="M14 3H6v18h8M14 3l5 2v14l-5 2zM11 12h.01"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 1 4l-3 3M14 12c4 0 7 1 7 4 0 2-2 3-4 1l-3-3M12 14c0 4-1 7-4 7-2 0-3-2-1-4l3-3M10 12c-4 0-7-1-7-4 0-2 2-3 4-1l3 3"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    power: '<path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    sofa: '<path d="M4 18v-6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6M2 14h20v4H2z"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>'
  };
  function devInfo(it) {
    var e = it.entity, d = e.split('.')[0], v = stv(e), on = false, alert = false, txt = '';
    if (bad(v)) txt = 'Niedostępne';
    else if (d === 'script' || d === 'scene') { on = v === 'on'; txt = on ? 'Uruchamiam…' : 'Scena'; }
    else if (d === 'cover') { on = v === 'open' || v === 'opening'; txt = { open: 'Otwarta', closed: 'Zamknięta', opening: 'Otwiera się…', closing: 'Zamyka się…' }[v] || v; }
    else if (d === 'lock') { alert = v === 'unlocked' || v === 'open'; txt = { locked: 'Zamknięty', unlocked: 'Otwarty', locking: 'Zamykanie…', unlocking: 'Otwieranie…', jammed: 'Zablokowany!' }[v] || v; if (v === 'jammed') alert = true; }
    else if (d === 'climate') { on = v !== 'off'; txt = TR[v] || v; }
    else if (d === 'button' || d === 'input_button') { txt = 'Naciśnij'; }
    else if (d === 'number' || d === 'input_number') { txt = pl(parseFloat(v), 0) + ' ' + (attr(e, 'unit_of_measurement') || ''); }
    else if (d === 'select' || d === 'input_select') { txt = TR[v] || v; }
    else { on = v === 'on'; txt = on ? 'Wł.' : 'Wył.'; if (on && attr(e, 'brightness') != null) txt = Math.round(attr(e, 'brightness') / 2.55) + '%'; }
    var icon = it.icon || ({ light: 'bulb', fan: 'fan', lock: alert ? 'unlock' : 'lock', cover: 'blinds', script: 'play', scene: 'play', media_player: 'tv', button: 'play', climate: 'fan' }[d] || 'power');
    return { on: on, alert: alert, txt: txt, icon: icon, name: it.name || attr(e, 'friendly_name') || e };
  }
  T.devices = {
    noPress: true,
    deps: function (c) { return (c.items || []).map(function (i) { return i.entity; }); },
    render: function (c) {
      var n = (c.items || []).length, cols = c.columns || Math.min(n, 2) || 1;
      if (!n) return '<div class="dev"><b>Pusty kafel</b><small>Przytrzymaj, aby dodać urządzenia</small></div>';
      return '<div class="devgrid' + (n === 1 ? ' solo' : '') + '" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">' + (c.items || []).map(function (it, i) {
        var f = devInfo(it), sub = [it.sub, f.txt].filter(Boolean).join(' · ');
        return '<div class="dev' + (f.on ? ' on' : '') + (f.alert ? ' alert' : '') + (bad(stv(it.entity)) ? ' unav' : '') + '" data-act="dev" data-i="' + i + '">' +
          FI({ bulb: 'bulb', moon: 'moon', film: 'film', blinds: 'blinds', door: 'door', fan: 'fan', lock: 'lock', power: 'power', play: 'play', sofa: 'sofa', tv: 'tv' }[f.icon] || 'power', 'currentColor', 'di') + '<b>' + esc(f.name) + '</b><small>' + esc(sub) + '</small></div>';
      }).join('') + '</div>';
    },
    act: {
      dev: function (c, el) {
        var it = c.items[+el.getAttribute('data-i')]; if (it && it.entity) control(it.entity);
      }
    }
  };

  // ================== 0.4.0: uniwersalne kafle (Wartość, Lista, Wykres, Mapa, Auto) ==================
  var TR = { on: 'Wł.', off: 'Wył.', home: 'W domu', not_home: 'Poza domem', locked: 'Zamknięty', unlocked: 'Otwarty', locking: 'Zamykanie…', unlocking: 'Otwieranie…',
    open: 'Otwarte', closed: 'Zamknięte', opening: 'Otwiera się…', closing: 'Zamyka się…', secured: 'Zamknięte', unsecured: 'Otwarte', connected: 'Podłączony', disconnected: 'Odłączony',
    unavailable: '—', unknown: '—', heat: 'Grzanie', cool: 'Chłodzenie', heat_cool: 'Auto', auto: 'Auto', idle: 'Bezczynny', charging: 'Ładuje', chargingactive: 'Ładuje',
    chargingpaused: 'Wstrzymane', chargingended: 'Zakończone', nocharging: 'Nie ładuje', chargingerror: 'Błąd ładowania', ok: 'OK' };
  var DC_TR = { door: ['Otwarte', 'Zamknięte'], window: ['Otwarte', 'Zamknięte'], opening: ['Otwarte', 'Zamknięte'], garage_door: ['Otwarta', 'Zamknięta'], lock: ['Otwarty', 'Zamknięty'],
    plug: ['Podłączony', 'Odłączony'], problem: ['Problem', 'OK'], battery: ['Słaba', 'OK'], connectivity: ['Połączono', 'Brak'], running: ['Działa', 'Nie'], heat: ['Grzeje', 'Nie'] };
  function parseMap(s) { var m = {}; String(s || '').split(/[;\n]/).forEach(function (p) { var i = p.indexOf('='); if (i > 0) m[p.slice(0, i).trim()] = p.slice(i + 1).trim(); }); return m; }
  function fmtMin(n) { n = Math.round(n); if (n < 60) return n + ' min'; var h = Math.floor(n / 60), m = n % 60; return h + ' h' + (m ? ' ' + m + ' min' : ''); }
  function fmtAgo(d) {
    var s = (Date.now() - d.getTime()) / 1000; if (isNaN(s)) return '—';
    if (s < 0) { s = -s; return s < 3600 ? 'za ' + Math.max(1, Math.round(s / 60)) + ' min' : s < 86400 ? 'za ' + Math.round(s / 3600) + ' h' : 'za ' + Math.round(s / 86400) + ' dni'; }
    return s < 90 ? 'przed chwilą' : s < 3600 ? Math.round(s / 60) + ' min temu' : s < 86400 ? Math.round(s / 3600) + ' h temu' : Math.round(s / 86400) + ' ' + plural(Math.round(s / 86400), 'dzień', 'dni', 'dni') + ' temu';
  }
  function toDate(v) { if (v == null) return null; var d = new Date(String(v).replace(' ', 'T')); return isNaN(d) ? null : d; }
  var monthCache = {}; // suma w tym miesiącu (ze statystyk)
  function monthSum(e) {
    var k = e + '|' + new Date().toDateString(), c = monthCache[k];
    if (c && (c.v != null || Date.now() - c.t < 600000)) return c.v;
    if (!c || Date.now() - c.t > 600000) {
      monthCache[k] = { t: Date.now(), v: c ? c.v : null };
      api('stats?period=month&ids=' + encodeURIComponent(e)).then(function (r) {
        var l = r[e] || []; monthCache[k].v = l.reduce(function (a, x) { return a + (x.change || 0); }, 0); all = true; schedule();
      }).catch(function () {});
    }
    return c ? c.v : null;
  }
  // jednostki brytyjskie: km → mile, km/h → mph, kWh/100 km → mi/kWh
  var KM_MI = 0.621371;
  function imp(n, unit) {
    var u = String(unit || '').replace(/\s/g, '').toLowerCase();
    if (isNaN(n)) return [n, unit];
    if (u === 'km') return [n * KM_MI, 'mi'];
    if (u === 'km/h' || u === 'kmh') return [n * KM_MI, 'mph'];
    if (u === 'kwh/100km') return [n > 0 ? 100 / (n / KM_MI) : n, 'mi/kWh'];
    if (u === 'm' && n >= 1000) return [n / 1000 * KM_MI, 'mi'];
    return [n, unit];
  }
  function miles(e, v) { var x = imp(v, attr(e, 'unit_of_measurement') || 'km'); return x[1] === 'mi' || x[1] === 'mph' ? x[0] : v * KM_MI; }
  // wartość jednego wiersza -> {text, warn, raw}
  function rowVal(r) {
    var e = r.entity, s = S[e];
    if (!e) return { text: r.text || '', warn: false };
    if (!s) return { text: '—', warn: false, missing: true };
    var raw = r.attr ? s.attributes[r.attr] : s.state, fmt = r.format || 'auto', text, n = parseFloat(raw);
    if (r.period === 'month') { raw = monthSum(e); n = raw == null ? NaN : raw; if (raw == null) return { text: '…', warn: false }; }
    var unit = r.unit != null && r.unit !== '' ? r.unit : (r.attr ? '' : (s.attributes.unit_of_measurement || ''));
    if (!isNaN(n) && r.scale) n = n * r.scale;
    if (!isNaN(n)) { var ix = imp(n, unit); if (ix[1] !== unit) { n = ix[0]; unit = ix[1]; if (unit === 'mi/kWh' && r.decimals == null) r = Object.assign({}, r, { decimals: 1 }); } }
    var map = parseMap(r.map), dom_ = e.split('.')[0];
    if ((dom_ === 'button' || dom_ === 'input_button') && !r.attr) return { text: 'Naciśnij', warn: false, raw: raw };
    if (map[String(raw)] != null) text = map[String(raw)];
    else if (fmt === 'minutes') text = isNaN(n) ? TR[raw] || raw : fmtMin(n);
    else if (fmt === 'ago') { var d = toDate(raw); text = d ? fmtAgo(d) : '—'; }
    else if (fmt === 'date') { var d2 = toDate(r.attr ? raw : (e.indexOf('calendar.') === 0 ? s.attributes.start_time : raw)); text = d2 ? d2.toLocaleDateString(LOC, { day: 'numeric', month: 'short', year: d2.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }) : '—'; }
    else if (fmt === 'time') { var d3 = toDate(raw); text = d3 ? d3.toLocaleTimeString(LOC, { hour: '2-digit', minute: '2-digit' }) : (raw || '—'); }
    else if (!isNaN(n) && fmt !== 'state' && (r.period === 'month' || (String(raw).trim() !== '' && isFinite(Number(raw))))) {
      var dec = r.decimals != null && r.decimals !== '' ? +r.decimals : (Math.abs(n) >= 100 || n % 1 === 0 ? 0 : 1);
      var num_ = n.toLocaleString(LOC, { minimumFractionDigits: dec, maximumFractionDigits: dec });
      text = /^[£$€]$/.test(unit) ? unit + num_ : num_ + (unit ? (/^[%°]/.test(unit) ? '' : ' ') + unit : '');
    } else {
      var dc = s.attributes.device_class, dct = DC_TR[dc];
      text = dct && (raw === 'on' || raw === 'off') ? dct[raw === 'on' ? 0 : 1] : (TR[raw] != null ? TR[raw] : String(raw));
    }
    var warn = false, w = String(r.warn || '').trim().replace(',', '.');
    if (w) {
      if (w[0] === '<' && !isNaN(n)) warn = n < parseFloat(w.slice(1));
      else if (w[0] === '>' && !isNaN(n)) warn = n > parseFloat(w.slice(1));
      else warn = String(raw) === w.replace(/^=/, '');
    }
    if (r.warn_entity && stv(r.warn_entity) === 'on') warn = true;
    return { text: text, warn: warn, raw: raw };
  }
  function rowDeps(rows) { var d = []; (rows || []).forEach(function (r) { d.push(r.entity, r.warn_entity); }); return d; }
  var CTRL = ['switch', 'input_boolean', 'light', 'fan', 'button', 'input_button', 'script', 'scene', 'number', 'input_number', 'select', 'input_select', 'climate', 'lock', 'cover', 'automation', 'media_player'];

  // sterowanie dowolną encją (z wiersza listy albo kafla)
  function control(e) {
    var d = e.split('.')[0], v = stv(e), name = attr(e, 'friendly_name') || e;
    if (bad(v) && d !== 'button' && d !== 'input_button') return toast('Niedostępne');
    if (['switch', 'input_boolean', 'light', 'fan', 'automation', 'cover', 'media_player'].indexOf(d) >= 0) return call(d === 'cover' ? 'cover' : 'homeassistant', 'toggle', {}, { entity_id: e });
    if (d === 'button' || d === 'input_button') return call(d, 'press', {}, { entity_id: e }).then(function () { toast(name + ' ✓'); });
    if (d === 'script' || d === 'scene') return call(d, 'turn_on', {}, { entity_id: e }).then(function () { toast(name + ' ✓'); });
    if (d === 'climate') return call('climate', v === 'off' ? 'turn_on' : 'turn_off', {}, { entity_id: e });
    if (d === 'lock') {
      if (v === 'locked') return openPop(function () { return '<h2>Otworzyć: ' + esc(name) + '?<button class="x" data-close>×</button></h2><div class="btns"><button class="btn red" data-pact="go">Otwórz</button><button class="btn" data-close>Anuluj</button></div>'; },
        { acts: { go: function () { call('lock', 'unlock', {}, { entity_id: e }); closePop(); } } });
      return call('lock', 'lock', {}, { entity_id: e });
    }
    if (d === 'select' || d === 'input_select') return openPop(function () {
      return '<h2>' + esc(name) + '<button class="x" data-close>×</button></h2>' + (attr(e, 'options') || []).map(function (o) { return '<div class="lrow pick" data-pact="o" data-o="' + esc(o) + '"><span>' + esc(TR[o] || o) + '</span><span>' + (o === stv(e) ? '✓' : '') + '</span></div>'; }).join('');
    }, { acts: { o: function (el) { call(d, 'select_option', { option: el.getAttribute('data-o') }, { entity_id: e }); closePop(); } } });
    if (d === 'number' || d === 'input_number') {
      var val = parseFloat(v), stp = attr(e, 'step') || 1, mn = attr(e, 'min'), mx = attr(e, 'max');
      return openPop(function () {
        return '<h2>' + esc(name) + '<button class="x" data-close>×</button></h2><div class="tbig" style="font-size:72px;min-height:110px">' + pl(val, stp < 1 ? 1 : 0) + '<span style="font-size:28px;margin-top:14px">' + esc(attr(e, 'unit_of_measurement') || '') + '</span></div>' +
          '<div class="btns"><button class="btn" data-pact="m">−</button><button class="btn" data-pact="p">＋</button></div><div class="btns" style="margin-top:10px"><button class="btn green" data-pact="ok" style="grid-column:span 2">Ustaw</button></div>';
      }, { acts: {
        m: function () { val = Math.max(mn != null ? mn : -1e9, Math.round((val - stp) * 100) / 100); },
        p: function () { val = Math.min(mx != null ? mx : 1e9, Math.round((val + stp) * 100) / 100); },
        ok: function () { call(d, 'set_value', { value: val }, { entity_id: e }); closePop(); }
      } });
    }
    moreInfo(e);
  }

  T.stat = {
    deps: function (c) { return [c.entity, c.warn_entity].concat(rowDeps(c.extra)); },
    cls: function (c) { var v = rowVal(c); return v.warn ? 'alert' : ''; },
    render: function (c) {
      var v = rowVal(c), parts = String(v.text).match(/^([£$€]?-?[\d\s.,]*\d)\s?(.*)$/);
      var big = parts ? parts[1] + '<small>' + esc(parts[2]) + '</small>' : esc(v.text);
      return '<div class="h"><span class="ttl">' + esc(c.name || attr(c.entity, 'friendly_name') || '') + '</span>' + (c.chip ? chipFor(c.chip) : '') + '</div>' +
        '<div class="statv"><div class="pct">' + big + '</div></div>' +
        ((c.extra || []).length ? '<div class="xrows">' + c.extra.map(function (r) { var x = rowVal(r); return '<div' + (x.warn ? ' class="warn"' : '') + '><span>' + esc(r.label || attr(r.entity, 'friendly_name') || '') + '</span><b>' + esc(x.text) + '</b></div>'; }).join('') + '</div>' : '<div></div>');
    },
    tap: function (c) { if (c.entity && CTRL.indexOf(c.entity.split('.')[0]) >= 0) control(c.entity); else moreInfo(c.entity); }
  };
  function chipFor(ch) { var x = rowVal(ch); return '<span class="chip ' + (x.warn ? 'c-yellow' : 'c-green') + '">' + esc(x.text) + '</span>'; }

  T.list = {
    deps: function (c) { return rowDeps(c.rows); },
    cls: function (c) { return (c.rows || []).some(function (r) { return rowVal(r).warn; }) ? 'warn' : ''; },
    render: function (c) {
      var rows = c.rows || [];
      return '<div class="h"><span class="ttl">' + esc(c.name || 'Lista') + '</span>' + (c.sub ? '<span class="sub">' + esc(c.sub) + '</span>' : '') + '</div>' +
        '<div class="lrows">' + (rows.length ? rows.map(function (r, i) {
          var x = rowVal(r), ctl = r.entity && CTRL.indexOf(r.entity.split('.')[0]) >= 0;
          return '<div class="lr' + (x.warn ? ' warn' : '') + (ctl ? ' ctl' : '') + (x.missing ? ' unav' : '') + '"' + (ctl ? ' data-act="row" data-i="' + i + '"' : '') + '><span>' + esc(r.label || attr(r.entity, 'friendly_name') || '') + '</span><b>' + esc(x.text) + (ctl ? ' ›' : '') + '</b></div>';
        }).join('') : '<div class="small">Przytrzymaj, aby dodać wiersze</div>') + '</div>';
    },
    act: { row: function (c, el) { var r = c.rows[+el.getAttribute('data-i')]; if (r && r.entity) control(r.entity); } }
  };

  T.graph = {
    deps: function () { return []; },
    init: function (c, t) {
      var load = function () {
        var ids = (c.series || []).map(function (s) { return s.entity; }).filter(Boolean);
        if (!ids.length) return;
        var per = c.period === 'hour' ? 'hour&hours=' + (c.hours || 24) : 'day&days=' + (c.days || 14);
        api('stats?period=' + per + '&ids=' + ids.map(encodeURIComponent).join(',')).then(function (d) { t.data = d; mark(t); }).catch(function () { t.err = true; mark(t); });
      };
      load(); t.timer = setInterval(load, 900000);
    },
    render: function (c, t) {
      var ser = (c.series || []).filter(function (s) { return s.entity; }), kind = c.kind || 'change';
      var head = '<div class="h"><span class="ttl">' + esc(c.name || 'Wykres') + '</span><span class="sub">' + (c.period === 'hour' ? (c.hours || 24) + ' h' : (c.days || 14) + ' dni') + '</span></div>';
      if (!ser.length) return head + '<div class="small">Przytrzymaj, aby wybrać dane</div>';
      if (!t.data) return head + '<div class="small">' + (t.err ? 'Brak statystyk dla tych encji' : 'Wczytuję…') + '</div>';
      var keys = {}; ser.forEach(function (s) { (t.data[s.entity] || []).forEach(function (p) { keys[p.start] = 1; }); });
      var ks = Object.keys(keys).map(Number).sort(function (a, b) { return a - b; });
      var val = function (s, k) { var p = (t.data[s.entity] || []).filter(function (x) { return x.start === k; })[0]; return p ? Math.max(0, p[kind] || 0) : 0; };
      var max = 0; ks.forEach(function (k) { ser.forEach(function (s) { max = Math.max(max, val(s, k)); }); });
      if (!ks.length || !max) return head + '<div class="small">Brak danych z tego okresu</div>';
      var W = 1000, H = 300, gw = W / ks.length, bw = Math.max(2, (gw * 0.72) / ser.length), bars = '', labels = '';
      ks.forEach(function (k, i) {
        ser.forEach(function (s, j) {
          var h = val(s, k) / max * (H - 30);
          bars += '<rect x="' + (i * gw + gw * 0.14 + j * bw).toFixed(1) + '" y="' + (H - 22 - h).toFixed(1) + '" width="' + (bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + (s.color || '#ffd60a') + '"><title>' + esc(s.name || '') + ': ' + pl(val(s, k), 1) + '</title></rect>';
        });
        var d = new Date(k), lab = c.period === 'hour' ? d.getHours() + ':00' : d.getDate();
        if (ks.length <= 16 || i % 2 === 0) labels += '<text x="' + (i * gw + gw / 2).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle" fill="#fff" opacity=".7" font-size="20">' + lab + '</text>';
      });
      var leg = ser.map(function (s) { var tot = ks.reduce(function (a, k) { return a + val(s, k); }, 0); return '<span><i style="background:' + (s.color || '#ffd60a') + '"></i>' + esc(s.name || attr(s.entity, 'friendly_name') || '') + ' · ' + pl(tot, 0) + ' ' + esc(s.unit || attr(s.entity, 'unit_of_measurement') || '') + '</span>'; }).join('');
      return head + '<svg class="graph" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' + bars + labels + '</svg><div class="legend">' + leg + '</div>';
    }
  };

  // mapa: kafelki OpenStreetMap (bez klucza API), lekko powiększone – czytelne nazwy ulic na tablecie
  function mapLL(c) { return [c.lat ? num(c.lat) : attr(c.entity, 'latitude'), c.lon ? num(c.lon) : attr(c.entity, 'longitude')]; }
  function mapTiles(la, lo, z, TS, R) {
    var n = Math.pow(2, z), fx = (lo + 180) / 360 * n, rad = la * Math.PI / 180, fy = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n, tx = Math.floor(fx), ty = Math.floor(fy), tl = '';
    for (var dx = -R; dx <= R; dx++) for (var dy = -R; dy <= R; dy++) {
      var x = ((tx + dx) % n + n) % n;
      tl += '<img src="https://tile.openstreetmap.org/' + z + '/' + x + '/' + (ty + dy) + '.png" style="width:' + TS + 'px;height:' + TS + 'px;left:calc(50% + ' + ((tx + dx - fx) * TS).toFixed(1) + 'px);top:calc(50% + ' + ((ty + dy - fy) * TS).toFixed(1) + 'px)" alt="">';
    }
    return '<div class="maptiles">' + tl + '</div><div class="mappin"></div><div class="mapattr">© OpenStreetMap</div>';
  }
  function mapPlace(c) { var st0 = stv(c.entity); return c.entity && c.entity.indexOf('sensor.') === 0 ? st0 : (TR[st0] || st0 || ''); }
  var MAPZ = null;
  function openMap(c) {
    var ll = mapLL(c); if (ll[0] == null) return;
    MAPZ = +c.zoom || 16;
    var el = $('mapx'); if (!el) { el = document.createElement('div'); el.id = 'mapx'; document.body.appendChild(el); }
    var draw = function () {
      ll = mapLL(c);
      el.className = 'mapx';
      el.innerHTML = '<div class="mx-map">' + mapTiles(ll[0], ll[1], MAPZ, 320, 4) + '</div>' +
        '<div class="mx-h"><button class="xbtn" data-mx="x">✕</button><span><b>' + esc(c.name || 'Mapa') + '</b><small>' + esc(mapPlace(c)) + '</small></span></div>' +
        '<div class="mx-z"><button data-mx="in">＋</button><button data-mx="out">－</button></div>';
    };
    draw();
    el.onclick = function (ev) {
      var b = ev.target.closest('[data-mx]'); if (!b) return;
      var k = b.getAttribute('data-mx');
      if (k === 'x') { el.className = 'mapx hidden'; el.innerHTML = ''; return; }
      MAPZ = Math.max(5, Math.min(19, MAPZ + (k === 'in' ? 1 : -1))); draw();
    };
  }
  T.map = {
    deps: function (c) { return [c.entity, c.lat, c.lon]; },
    render: function (c) {
      var ll = mapLL(c), z = +c.zoom || 16;
      if (ll[0] == null || ll[1] == null) return '<div class="h"><span class="ttl">' + esc(c.name || 'Mapa') + '</span></div><div class="small">Brak współrzędnych</div>';
      var place = mapPlace(c);
      return mapTiles(ll[0], ll[1], z, 300, 2) + '<div class="maplbl"><b>' + esc(c.name || '') + '</b>' + (place ? '<small>' + esc(place) + '</small>' : '') + '</div>';
    },
    tap: function (c) { openMap(c); }
  };

  T.car_hero = {
    deps: function (c) { return [c.battery, c.range, c.charging, c.plug, c.location, c.doors, c.lock, /^image\./.test(c.image || '') ? c.image : null, c.remaining]; },
    cls: function (c) { return ['on', 'chargingactive', 'charging'].indexOf(stv(c.charging)) >= 0 ? 'on' : ''; },
    render: function (c) {
      var b = num(c.battery), r = num(c.range), ch = stv(c.charging), charging = ['on', 'chargingactive', 'charging'].indexOf(ch) >= 0, plugged = stv(c.plug) === (c.plug_on || 'on');
      if (r != null) r = miles(c.range, r);
      var col = b == null ? '#888' : b <= 20 ? '#ff453a' : b <= 40 ? '#ff9f0a' : '#30d158', C = 2 * Math.PI * 52, rem = c.remaining ? num(c.remaining) : null;
      var chip = charging ? '<span class="chip c-green">⚡ Ładuje' + (rem ? ' · ' + fmtMin(rem) : '') + '</span>' : plugged ? '<span class="chip c-blue">Podłączony</span>' : '<span class="chip c-grey">Niepodłączony</span>';
      var doorsOk = c.doors ? (String(stv(c.doors)) === (c.doors_ok || 'secured') || stv(c.doors) === 'off') : null, lockOk = c.lock ? stv(c.lock) === 'locked' : null;
      var sec = (doorsOk === false || lockOk === false) ? '<span class="warnt">Otwarte</span>' : (doorsOk || lockOk) ? 'Zamknięte' : '—';
      var img = c.image ? '<img class="carimg" src="' + imgSrc(c.image) + '" alt="">' : '<svg class="carimg" viewBox="0 0 60 30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 22h52v-6l-6-2-8-8H20l-8 8-8 2z"/><circle cx="16" cy="23" r="4"/><circle cx="44" cy="23" r="4"/></svg>';
      return '<div class="h"><span class="ttl big2">' + esc(c.name || 'Samochód') + '</span>' + chip + '</div>' +
        '<div class="hero">' + img + '<div class="ring2"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="10"/><circle cx="60" cy="60" r="52" fill="none" stroke="' + col + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + ((b || 0) / 100 * C).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 60 60)"/></svg><div><b>' + (b == null ? '–' : Math.round(b)) + '<small>%</small></b><span>' + (r == null ? '' : Math.round(r) + ' mi') + '</span></div></div></div>' +
        '<div class="xrows"><div><span>Miejsce</span><b>' + esc(c.location ? (TR[stv(c.location)] || stv(c.location) || '—') : '—') + '</b></div><div><span>Drzwi</span><b>' + sec + '</b></div></div>';
    },
    tap: function (c) { if (c.lock) control(c.lock); }
  };

  // ---------- szablony podstron ----------
  function findEnt(list, re, dom) { return list.filter(function (e) { return (!dom || dom.indexOf(e.split('.')[0]) >= 0) && re.test(e); })[0]; }
  function carTemplate(q, name) {
    q = q.toLowerCase().trim().replace(/\s+/g, '_');
    var L = Object.keys(S).filter(function (e) { return e.indexOf(q) >= 0; }), f = function (re, dom) { return findEnt(L, re, dom); };
    var row = function (label, e, extra) { return e ? Object.assign({ label: label, entity: e }, extra || {}) : null; };
    var nn = function (a) { return a.filter(Boolean); };
    var bat = f(/charge_level|stan_naladowania|wskaznik_stanu|battery_level|state_of_charge$|soc$/, ['sensor']);
    var tires = L.filter(function (e) { return /^sensor\./.test(e) && /(tire|tyre)_pressure$|zmierzone_cisnienie/.test(e); });
    var doors = L.filter(function (e) { return /^binary_sensor\./.test(e) && /door|drzwi|trunk|hood|bagaz|maski|pokrywy/.test(e); });
    var t = [
      { type: 'car_hero', w: 2, h: 2, name: name || q, battery: bat, range: f(/remaining_range|zasieg_w_km|range$/, ['sensor']), charging: f(/(^switch\..*charging$)|stan_ladowania$|charging_status/, ['sensor', 'switch', 'binary_sensor']),
        plug: f(/plugged_in|plug|wtyku/, ['binary_sensor', 'sensor']), plug_on: 'on', location: f(/miejsce_parkowania|location/, ['sensor']) || f(/./, ['device_tracker']), lock: f(/./, ['lock']), image: f(/./, ['image']),
        remaining: f(/remaining_charging_time|pozostaly_czas_ladowania/, ['sensor']) },
      { type: 'list', w: 1, h: 1, name: 'Ładowanie', rows: nn([row('Pozostało AC', f(/remaining_charging_time_ac/), { format: 'minutes' }), row('Pozostało DC', f(/remaining_quick_charge/), { format: 'minutes' }), row('Pozostało', f(/prognozowany_pozostaly_czas_ladowania/), { format: 'minutes' }),
        row('Ta sesja', f(/energia_sesja|session_energy/)), row('Ten miesiąc', f(/energia_ten_miesiac|month/)), row('Cel ładowania', f(/wartosc_docelowa|target_soc|charge_limit/))]) },
      { type: 'list', w: 1, h: 1, name: 'Jazda i serwis', rows: nn([row('Przebieg', f(/odometer|przebieg$|mileage/), { decimals: 0 }), row('Następny serwis', f(/next_maintenance_date|service_date/), { format: 'date' }), row('Do serwisu', f(/next_maintenance_distance/)),
        row('Serwis (CBS)', f(/condition_based_service/)), row('Check Control', f(/check_control/), { warn: '>0' })]) },
      { type: 'list', w: 1, h: 1, name: 'Zabezpieczenie', rows: nn([row('Zamek', f(/./, ['lock'])), row('Drzwi', f(/stan_drzwi$/, ['sensor']), { warn: 'unsecured' })].concat(doors.slice(0, 7).map(function (e) {
        var suf = e.split('.')[1].replace(q + '_', ''), DL = { driver_door: 'Kierowca', passenger_door: 'Pasażer', rear_left_door: 'Tył L', rear_right_door: 'Tył P', trunk: 'Bagażnik', hood: 'Maska',
          stan_drzwi_przednich_lewych: 'Przód L', stan_drzwi_przednich_prawych: 'Przód P', stan_drzwi_tylnych_lewych: 'Tył L', stan_drzwi_tylnych_prawych: 'Tył P', stan_pokrywy_bagaznika: 'Bagażnik', stan_maski_silnika: 'Maska' };
        return { label: DL[suf] || String(attr(e, 'friendly_name') || suf).replace(name || '', '').replace(/_/g, ' ').trim(), entity: e, warn: 'on' };
      }))) },
      { type: 'list', w: 1, h: 1, name: 'Klimatyzacja i dane', rows: nn([row('Klimatyzacja', f(/./, ['climate'])), row('Akumulator 12V', f(/12v/)), row('Dane z', f(/vehicle_status_last_updated|ostatni_raport/), { format: 'ago' })].concat(L.filter(function (e) { return /^button\./.test(e); }).slice(0, 2).map(function (e) { return { label: 'Odśwież dane', entity: e }; }))) },
      { type: 'map', w: 1, h: 1, name: name || q, entity: f(/./, ['device_tracker']) },
      { type: 'list', w: 2, h: 1, name: 'Opony', rows: tires.slice(0, 4).map(function (e) {
        var l = /front_left|przod_lewo/.test(e) ? 'Przód L' : /front_right|przod_prawo/.test(e) ? 'Przód P' : /rear_left|tyl_lewo/.test(e) ? 'Tył L' : 'Tył P', w = e.replace(/_pressure$/, '_pressure_warning').replace('sensor.', 'binary_sensor.');
        return { label: l, entity: e, scale: 0.01, decimals: 2, unit: 'bar', warn_entity: S[w] ? w : undefined };
      }) }
    ];
    return t.map(function (x) { x.id = uid(); return x; });
  }
  function energyTemplate() {
    var L = Object.keys(S).filter(function (e) { return e.indexOf('octopus_energy') >= 0; }), f = function (re) { return findEnt(L, re); };
    var E = function (s) { return f(new RegExp('electricity.*' + s + '$')); }, G = function (s) { return f(new RegExp('gas.*' + s + '$')); };
    var r = function (label, e, x) { return e ? Object.assign({ label: label, entity: e }, x || {}) : null; }, nn = function (a) { return a.filter(Boolean); };
    var pence = { scale: 100, decimals: 1, unit: 'p' };
    var t = [
      { type: 'stat', w: 2, h: 1, name: 'Prąd teraz', entity: E('current_demand'), scale: 0.001, decimals: 1, unit: 'kW', chip: { entity: f(/off_peak$/), map: 'on=Taryfa nocna; off=Taryfa dzienna' },
        extra: nn([r('Stawka teraz', E('current_rate'), pence), r('Następna', E('next_rate'), pence), r('Dziś', E('current_accumulative_consumption'), { decimals: 1 }), r('Koszt dziś', E('current_accumulative_cost'), { decimals: 2, unit: '£' })]) },
      { type: 'stat', w: 2, h: 1, name: 'Gaz teraz', entity: G('current_rate'), scale: 100, decimals: 2, unit: 'p/kWh',
        extra: nn([r('Dziś', G('current_accumulative_consumption_kwh'), { decimals: 1 }), r('Dziś (m³)', G('current_accumulative_consumption_m3'), { decimals: 2 }), r('Koszt dziś', G('current_accumulative_cost'), { decimals: 2, unit: '£' })]) },
      { type: 'list', name: 'Dziś', rows: nn([r('Prąd', E('current_accumulative_consumption'), { decimals: 1 }), r('Prąd £', E('current_accumulative_cost'), { decimals: 2, unit: '£' }), r('Gaz', G('current_accumulative_consumption_kwh'), { decimals: 1 }), r('Gaz £', G('current_accumulative_cost'), { decimals: 2, unit: '£' })]) },
      { type: 'list', name: 'Wczoraj', rows: nn([r('Prąd', E('previous_accumulative_consumption'), { decimals: 1 }), r('Prąd £', E('previous_accumulative_cost'), { decimals: 2, unit: '£' }), r('Gaz', G('previous_accumulative_consumption_kwh'), { decimals: 1 }), r('Gaz £', G('previous_accumulative_cost'), { decimals: 2, unit: '£' })]) },
      { type: 'list', name: 'Ten miesiąc', rows: nn([r('Prąd', E('current_accumulative_consumption'), { period: 'month', decimals: 0 }), r('Prąd £', E('current_accumulative_cost'), { period: 'month', decimals: 2, unit: '£' }), r('Gaz', G('current_accumulative_consumption_kwh'), { period: 'month', decimals: 0 }), r('Gaz £', G('current_accumulative_cost'), { period: 'month', decimals: 2, unit: '£' })]) },
      { type: 'list', name: 'Opłaty stałe', sub: 'dziennie', rows: nn([r('Prąd', E('current_standing_charge'), { scale: 100, decimals: 1, unit: 'p' }), r('Gaz', G('current_standing_charge'), { scale: 100, decimals: 1, unit: 'p' })]) },
      { type: 'graph', w: 2, h: 1, name: 'Zużycie dzienne', days: 14, period: 'day', kind: 'change', series: nn([E('current_accumulative_consumption') && { entity: E('current_accumulative_consumption'), name: 'Prąd', color: '#ffd60a', unit: 'kWh' }, G('current_accumulative_consumption_kwh') && { entity: G('current_accumulative_consumption_kwh'), name: 'Gaz', color: '#ff9f0a', unit: 'kWh' }]) },
      { type: 'list', name: 'Ładowanie EV', rows: nn([r('Stan', f(/intelligent_state$/), { map: 'SMART_CONTROL_IN_PROGRESS=Ładuje taniej; SMART_CONTROL_CAPABLE=Czeka; BOOSTING=Doładowuje; SMART_CONTROL_NOT_AVAILABLE=Niedostępne; LOST_CONNECTION=Brak połączenia' }), r('Smart charge', f(/intelligent_smart_charge$/)), r('Doładuj teraz', f(/intelligent_bump_charge$/)), r('Cel', f(/intelligent_charge_target$/)), r('Gotowe na', f(/intelligent_target_time$/))]) },
      { type: 'list', name: 'Octoplus', rows: nn([r('Punkty', f(/octoplus_points$/), { decimals: 0, unit: 'pkt' }), r('Darmowy prąd', f(/^calendar.*free_electricity/), { format: 'date' }), r('Sesja oszczędzania', f(/^calendar.*saving_sessions/), { format: 'date' }), r('Zdrapka', f(/scratchcard_available$/), { map: 'on=Dostępna!; off=Brak' })]) }
    ];
    return t.map(function (x) { x.id = uid(); x.w = x.w || 1; x.h = x.h || 1; return x; });
  }

  // ---------- okno (popup) ----------
  function moreInfo(e) {
    if (!e || !S[e]) return;
    openPop(function () {
      var s = S[e], a = s.attributes || {};
      return '<h2>' + esc(a.friendly_name || e) + '<button class="x" data-close>×</button></h2><div class="lrow"><span>Stan</span><b>' + esc(s.state) + ' ' + esc(a.unit_of_measurement || '') + '</b></div>' +
        '<div class="small">Zmieniono: ' + new Date(s.last_changed).toLocaleString(LOC) + '</div>';
    });
  }
  function openPop(render, opt) {
    opt = opt || {};
    if (popup && popup.opt.onClose) popup.opt.onClose();
    popup = { render: render, opt: opt };
    $('sheet').className = 'sheet' + (opt.wide ? ' wide' : '') + (opt.cls ? ' ' + opt.cls : '');
    $('sheet').innerHTML = render();
    $('pop').classList.remove('hidden');
    if (opt.onOpen) opt.onOpen();
  }
  function refreshPop() { if (popup) { var sc = $('sheet').scrollTop; $('sheet').innerHTML = popup.render(); $('sheet').scrollTop = sc; } }
  function closePop() {
    if (popup && popup.opt.onClose) popup.opt.onClose();
    popup = null; $('pop').classList.add('hidden'); $('sheet').innerHTML = '';
  }
  $('pop').addEventListener('click', function (ev) {
    if (ev.target === $('pop') || ev.target.closest('[data-close]')) return closePop();
    var a = ev.target.closest('[data-pact]');
    if (a && popup && popup.opt.acts) {
      var f = popup.opt.acts[a.getAttribute('data-pact')];
      if (f) { f(a, ev); if (popup && !popup.opt.static) refreshPop(); }
    }
  });
  ['change', 'input'].forEach(function (evn) {
    $('pop').addEventListener(evn, function (ev) {
      var a = ev.target.closest('[data-pin]');
      if (a && popup && popup.opt.inputs) { var f = popup.opt.inputs[a.getAttribute('data-pin')]; if (f) f(a, evn); }
    });
  });

  // ---------- układ: twarze i pakowanie kafli ----------
  var faceOff = null, selIdx = -1, szPill = null;
  var vi = 0, edit = false, hist = [], CLIENT = Math.random().toString(36).slice(2);
  function V() { return layout.views[vi]; }
  function faces() { var r = []; layout.views.forEach(function (v, i) { if (!v.page) r.push(i); }); return r; }
  var navStack = [];
  function openPage(id) {
    var i = -1; layout.views.forEach(function (v, j) { if (v.id === id) i = j; });
    if (i < 0) return toast('Nie ma takiej podstrony');
    navStack.push(vi); vi = i; build();
  }
  function back() { vi = navStack.length ? navStack.pop() : (faces()[0] || 0); if (layout.views[vi] && layout.views[vi].page && !navStack.length) vi = faces()[0] || 0; build(); }
  function uid() { return 'k' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  // Starszy układ (grid.areas) -> w×h, gdyby serwer go nie przeliczył.
  function normalize(l) {
    (l.views || []).forEach(function (v, i) {
      if (!v.id) v.id = 'v' + i;
      if (v.grid && v.grid.areas) {
        var pos = {};
        v.grid.areas.forEach(function (row, r) { row.trim().split(/\s+/).forEach(function (n, c) { var p = pos[n] || (pos[n] = [r, c, r, c]); p[0] = Math.min(p[0], r); p[1] = Math.min(p[1], c); p[2] = Math.max(p[2], r); p[3] = Math.max(p[3], c); }); });
        v.tiles.forEach(function (t) { var p = pos[t.id]; if (p) { t.w = p[3] - p[1] + 1; t.h = p[2] - p[0] + 1; t._o = p[0] * 100 + p[1]; } else t._o = 1e6; });
        v.tiles.sort(function (a, b) { return a._o - b._o; }); v.tiles.forEach(function (t) { delete t._o; });
        v.columns = v.grid.columns || 5; delete v.grid;
      }
      v.columns = v.columns || 5; v.tiles = v.tiles || [];
      v.tiles.forEach(function (t) { t.id = t.id || uid(); t.w = t.w || 1; t.h = t.h || 1; });
    });
    return l;
  }
  // Gęste pakowanie: każdy kafel w pierwsze wolne miejsce (wiersz po wierszu).
  function place(list, cols) {
    var occ = [], out = [];
    function free(r, c, w, h) { for (var y = r; y < r + h; y++) for (var x = c; x < c + w; x++) if (occ[y] && occ[y][x]) return false; return true; }
    list.forEach(function (t) {
      var w = t.type === 'bins' ? cols : Math.max(1, Math.min(t.w || 1, cols)), h = Math.max(1, t.h || 1);
      for (var r = 0; ; r++) for (var c = 0; c + w <= cols; c++) if (free(r, c, w, h)) {
        for (var y = r; y < r + h; y++) { occ[y] = occ[y] || []; for (var x = c; x < c + w; x++) occ[y][x] = 1; }
        out.push({ r: r, c: c, w: w, h: h }); return;
      }
    });
    return { pos: out, rows: occ.length };
  }

  // dopasowanie do ekranu: układ projektowany na 1280×800 skaluje się do każdego ekranu w poziomie;
  // w pionie i na telefonie kafle układają się w 2–3 kolumny i przewijają
  var FIT = { s: 1, narrow: false, ncols: 2 };
  function fit() {
    var W = window.innerWidth, H = window.innerHeight, land = W >= H * 1.15 && W >= 640;
    var s = land ? Math.min(W / 1280, H / 800) : W / (W < 600 ? 490 : 820);
    s = Math.max(0.6, Math.min(2.2, Math.round(s * 100) / 100));
    document.documentElement.style.zoom = s === 1 ? '' : s;
    document.documentElement.style.setProperty('--vh', (H / s) + 'px');
    // jednostka czcionek kafli: jak 1vw, ale nie większa niż przy proporcjach 16:10 (szerokie okna nie rozpychają napisów)
    document.documentElement.style.setProperty('--u', (Math.min(W / s, land ? (H / s) * 1.6 : W / s) / 100) + 'px');
    document.body.classList.toggle('narrow', !land);
    FIT = { s: s, narrow: !land, ncols: W / s >= 700 ? 3 : 2 };
    document.documentElement.style.setProperty('--ncols', FIT.ncols);
    return FIT;
  }
  function build() {
    if (vi >= layout.views.length) vi = 0;
    fit();
    var v = V(), g = $('view'), cols = v.columns || 5, narrow = FIT.narrow;
    document.body.style.background = v.background || BG.turkus;
    document.body.classList.toggle('appear-light', v.appearance === 'light'); document.body.classList.toggle('appear-dark', v.appearance === 'dark');
    document.body.classList.toggle('onpage', !!v.page);
    $('back').classList.toggle('hidden', !v.page);
    $('back').innerHTML = '<span class="xbtn">✕</span><b class="ptitle">' + esc(v.title || '') + '</b><span class="pclock"></span>';
    if (window.PANEL && PANEL.tickClock) PANEL.tickClock();
    tiles.forEach(function (t) { if (t.timer) clearInterval(t.timer); });
    if (faceOff) { try { faceOff(); } catch (e) { /* */ } faceOff = null; }
    g.innerHTML = ''; tiles = []; selIdx = -1;
    var FK = window.PANEL && PANEL.FK && v.kind && PANEL.FK[v.kind];
    g.classList.toggle('faceview', !!FK);
    if (FK) {
      g.classList.remove('scroll'); g.style.gridTemplateColumns = ''; g.style.gridTemplateRows = '';
      var fe = document.createElement('div'); fe.className = 'face face-' + v.kind; g.appendChild(fe);
      faceOff = FK.mount(fe, v) || null;
      document.body.classList.toggle('editing', false); edit = false;
      renderDots(); renderBar(); return;
    }
    var pl_ = place(v.tiles, cols), rows = Math.max(pl_.rows, 1);
    var rs = v.rowSizes && v.rowSizes.length === rows ? v.rowSizes : null, scroll = !rs && rows > 4;
    g.classList.toggle('scroll', scroll);
    // dotyk: gdy ekran się nie przewija, wszystkie gesty należą do Panelu (bok: twarze, od dołu: menu)
    document.documentElement.classList.toggle('noscroll', !narrow && !scroll);
    g.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0,1fr))';
    g.style.gridTemplateRows = narrow ? '' : scroll ? 'repeat(' + rows + ', calc((var(--vh, 100vh) - 106px) / 4))' : (rs ? rs.map(function (x) { return 'minmax(0,' + x + 'fr)'; }).join(' ') : 'repeat(' + rows + ', minmax(0,1fr))');
    v.tiles.forEach(function (c, i) {
      var ty = T[c.type], el = document.createElement('div'), p = pl_.pos[i];
      el.className = 'tile t-' + (ty ? c.type : 'unknown') + (ty && ty.center ? ' center' : '') + (ty && ty.std ? ' std' : '') + (p.w >= 2 ? ' wide' : '');
      if (narrow) el.style.gridColumn = p.w >= 2 ? 'span ' + Math.min(p.w, FIT.ncols) : '';
      else { el.style.gridColumn = (p.c + 1) + ' / span ' + p.w; el.style.gridRow = (p.r + 1) + ' / span ' + p.h; }
      el.setAttribute('data-size', p.w + '×' + p.h);
      g.appendChild(el);
      var t = { cfg: c, idx: i, ty: ty || { render: function () { return '<div class="small">Nieznany typ: ' + esc(c.type) + '</div>'; } }, el: el, html: null };
      t.deps = new Set((t.ty.deps ? t.ty.deps(c) : []).filter(Boolean));
      tiles.push(t); bindTile(t);
      if (t.ty.init) t.ty.init(c, t);
    });
    if (!v.tiles.length) g.innerHTML = '<div class="empty">Pusta twarz<br><small>Przytrzymaj ekran, aby dodać kafle</small></div>';
    document.body.classList.toggle('editing', edit);
    renderDots(); renderBar();
    all = true; schedule();
  }

  // statyczny podgląd twarzy (galeria, edytor): ten sam wygląd kafli, bez obsługi dotyku
  function renderStatic(v, W, H) {
    W = W || 1280; H = H || 800;
    var box = document.createElement('div'); box.className = 'pv'; box.style.width = W + 'px'; box.style.height = H + 'px';
    box.style.background = v.background || BG.turkus;
    var FK = window.PANEL && PANEL.FK && v.kind && PANEL.FK[v.kind];
    if (FK) { var fe = document.createElement('div'); fe.className = 'face face-' + v.kind; box.appendChild(fe); fe.innerHTML = FK.html(v, true); return box; }
    var cols = v.columns || 5, P = place(v.tiles || [], cols), rows = Math.max(P.rows, 1);
    var g = document.createElement('div'); g.className = 'grid pvgrid'; box.appendChild(g);
    var rs = v.rowSizes && v.rowSizes.length === rows ? v.rowSizes : null;
    g.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0,1fr))';
    g.style.gridTemplateRows = rows > 4 && !rs ? 'repeat(' + rows + ', ' + Math.round((H - 106) / 4) + 'px)' : (rs ? rs.map(function (x) { return 'minmax(0,' + x + 'fr)'; }).join(' ') : 'repeat(' + rows + ', minmax(0,1fr))');
    (v.tiles || []).forEach(function (c, i) {
      var ty = T[c.type], p = P.pos[i], el = document.createElement('div');
      el.className = 'tile t-' + (ty ? c.type : 'unknown') + (ty && ty.center ? ' center' : '') + (ty && ty.std ? ' std' : '') + (p.w >= 2 ? ' wide' : '');
      el.style.gridColumn = (p.c + 1) + ' / span ' + p.w; el.style.gridRow = (p.r + 1) + ' / span ' + p.h; el.setAttribute('data-i', i);
      var ft = { cfg: c, idx: i, el: el, ty: ty || {}, fc: (tiles.filter(function (x) { return x.cfg.id === c.id; })[0] || {}).fc };
      try { el.innerHTML = ty ? ty.render(c, ft) : ''; looks(ft); } catch (e) { el.innerHTML = ''; }
      try { var x = (ty && ty.cls ? ty.cls(c) : '') || ''; x.split(' ').forEach(function (k) { if (k) el.classList.add(k); }); } catch (e) { /* */ }
      if (c.type === 'camera' && c.entity) { var im = el.querySelector('img'); if (im) im.src = 'api/camera/' + c.entity + '?t=' + Math.floor(Date.now() / 60000); }
      g.appendChild(el);
    });
    return box;
  }
  function renderTile(t) {
    var h;
    try { h = t.ty.render(t.cfg, t); } catch (e) { console.error(t.cfg.id, e); h = '<div class="small">Błąd kafla – przytrzymaj, aby poprawić</div>'; }
    if (h !== t.html) { t.html = h; t.el.innerHTML = h; looks(t); if (t.ctl) t.ctl.forEach(function (x) { t.el.appendChild(x); }); if (t.ty.after) t.ty.after(t.cfg, t); }
    var extra = '';
    try { extra = (t.ty.cls ? t.ty.cls(t.cfg) : '') || ''; } catch (e) { /* brak encji */ }
    ['on', 'alert', 'warn', 'triggered'].forEach(function (k) { t.el.classList.toggle(k, (' ' + extra + ' ').indexOf(' ' + k + ' ') >= 0); });
  }
  // własny wygląd kafla z edycji: górna nazwa, ikona, dolny napis, wyrównanie
  function looks(t) {
    var c = t.cfg, el = t.el;
    ['l', 'r', 'c'].forEach(function (k) { el.classList.remove('at-' + k, 'ab-' + k); });
    ['s', 'l', 'xl'].forEach(function (k) { el.classList.remove('is-' + k); });
    if (c.icon_size && c.icon_size !== 'm') el.classList.add('is-' + c.icon_size);
    if (c.align_top) el.classList.add('at-' + c.align_top);
    if (c.align_bottom) el.classList.add('ab-' + c.align_bottom);
    if (c.title) { var tt = el.querySelector('.h .ttl') || el.querySelector('.th-h b') || el.querySelector('.lbl .big'); if (tt) tt.textContent = c.title; }
    var ring = el.querySelector(':scope > .ring');
    if (ring && (c.icon_img || c.icon_mdi || c.icon_emoji || (c.icon2 && window.FI && FI.has(c.icon2)))) {
      var m = /solid\s*(#[0-9a-f]{3,8})/i.exec(ring.getAttribute('style') || ''), col = m ? m[1] : '#fff';
      if (c.icon_img) ring.innerHTML = '<img class="ic-img" src="' + imgSrc(c.icon_img) + '" alt="">';
      else if (c.icon_mdi) ring.innerHTML = '<i class="ic-mdi" style="background:' + col + ';-webkit-mask-image:url(\'api/mdi/' + encodeURIComponent(String(c.icon_mdi).replace(/^mdi:/, '')) + '.svg\');mask-image:url(\'api/mdi/' + encodeURIComponent(String(c.icon_mdi).replace(/^mdi:/, '')) + '.svg\')"></i>';
      else if (c.icon_emoji) ring.innerHTML = '<span class="ic-emo">' + esc(c.icon_emoji) + '</span>';
      else ring.innerHTML = FI(c.icon2, col);
    }
    if (c.bottom) {
      var b = el.querySelector('.cbot .big') || (t.ty.std ? el.querySelector(':scope > :nth-child(3) .big') : null) || el.querySelector('.th-st');
      if (b) b.textContent = c.bottom;
    }
  }
  function mark(t) { dirty.add(t); schedule(); }
  function schedule() { if (!raf) raf = requestAnimationFrame(flush); }
  function flush() {
    raf = 0;
    if (all) { all = false; tiles.forEach(renderTile); dirty.clear(); }
    else { dirty.forEach(renderTile); dirty.clear(); }
    if (popup && !popup.opt.static) refreshPop();
  }
  function onState(id) {
    if (window.PANEL && PANEL.hook) PANEL.hook(id);
    tiles.forEach(function (t) {
      if (t.deps.has(id) || (t.ty.wild && t.ty.wild.some(function (p) { return id.indexOf(p) === 0; }))) dirty.add(t);
    });
    schedule();
  }

  // ---------- dotyk: dotknięcie, przytrzymanie (edycja), przeciąganie w edycji ----------
  function bindTile(t) {
    var timer = null, held = false, sx = 0, sy = 0, drag = false, mode = null, rs = null;
    // uchwyty edycji (jak w Rehome): minus w lewym górnym rogu, łuk w prawym dolnym
    var del = document.createElement('div'); del.className = 'tdel'; del.innerHTML = '<i></i>';
    var res = document.createElement('div'); res.className = 'tres';
    t.ctl = [del, res]; t.ctl.forEach(function (x) { t.el.appendChild(x); });
    t.el.addEventListener('pointerdown', function (ev) {
      if (ev.button > 0) return;
      // przyciski „od razu” (np. strzałki termostatu): działają przy dotknięciu, przytrzymanie powtarza
      var now = !edit && ev.target.closest('[data-now]');
      if (now && t.ty.act && t.ty.act[now.getAttribute('data-act')]) {
        ev.preventDefault(); clearTimeout(timer); timer = null; held = true;
        var fn = t.ty.act[now.getAttribute('data-act')], rep = 0;
        now.classList.add('down'); fn(t.cfg, now, t); if (navigator.vibrate) navigator.vibrate(10);
        clearInterval(t.rep); t.rep = setTimeout(function loop() { fn(t.cfg, now, t); rep++; t.rep = setTimeout(loop, rep > 5 ? 120 : 260); }, 500);
        var stop = function () { clearTimeout(t.rep); now.classList.remove('down'); document.removeEventListener('pointerup', stop, true); document.removeEventListener('pointercancel', stop, true); };
        document.addEventListener('pointerup', stop, true); document.addEventListener('pointercancel', stop, true);
        return;
      }
      held = false; drag = false; sx = ev.clientX; sy = ev.clientY; t.downTarget = ev.target;
      mode = edit ? (ev.target.closest('.tres') ? 'resize' : ev.target.closest('.tdel') ? 'del' : 'move') : null;
      if (!t.ty.noPress && !edit) t.el.classList.add('press');
      clearTimeout(timer);
      if (!edit) timer = setTimeout(function () {
        held = true; t.el.classList.remove('press'); timer = null;
        if (navigator.vibrate) navigator.vibrate(30);
        enterEdit(); select(t.idx);
      }, 600);
      else {
        try { t.el.setPointerCapture(ev.pointerId); } catch (e) { /* stary WebView */ }
        if (mode === 'resize') {
          var r = t.el.getBoundingClientRect(), gap = 18, w0 = t.cfg.w || 1, h0 = t.cfg.h || 1;
          rs = { r: r, w0: w0, h0: h0, uw: (r.width + gap) / w0, uh: (r.height + gap) / h0, w: w0, h: h0, cols: V().columns || 5 };
          t.el.classList.add('resizing'); ev.preventDefault();
        }
      }
    });
    var cancel = function () { clearTimeout(timer); timer = null; t.el.classList.remove('press'); };
    t.el.addEventListener('pointermove', function (ev) {
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'resize' && rs && ev.buttons) {
        var nw = Math.max(1, Math.min(rs.cols, Math.round((rs.r.width + 18 + dx) / rs.uw)));
        var nh = Math.max(1, Math.min(4, Math.round((rs.r.height + 18 + dy) / rs.uh)));
        // podgląd na żywo: kafel rośnie od swojego lewego górnego rogu
        t.el.style.width = Math.max(rs.uw - 18, rs.r.width + dx) + 'px'; t.el.style.height = Math.max(rs.uh - 18, rs.r.height + dy) + 'px';
        if (nw !== rs.w || nh !== rs.h) { rs.w = nw; rs.h = nh; t.el.setAttribute('data-size', nw + '×' + nh); if (navigator.vibrate) navigator.vibrate(8); }
        return;
      }
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
        cancel();
        if (edit && mode === 'move' && ev.buttons) { drag = true; t.el.classList.add('dragging'); t.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.04)'; }
      }
    });
    t.el.addEventListener('pointercancel', function () { cancel(); endDrag(); });
    t.el.addEventListener('pointerleave', function () { if (!edit) cancel(); });
    function endDrag() { t.el.classList.remove('dragging', 'resizing'); t.el.style.transform = ''; t.el.style.width = ''; t.el.style.height = ''; }
    t.el.addEventListener('pointerup', function (ev) {
      var was = !!timer; cancel();
      if (held) return;
      if (edit) {
        if (mode === 'resize' && rs) {
          var w = rs.w, h = rs.h, changed = w !== rs.w0 || h !== rs.h0; rs = null; endDrag();
          if (changed) change(function () { V().tiles[t.idx].w = w; V().tiles[t.idx].h = h; }); else t.el.setAttribute('data-size', w + '×' + h);
          return;
        }
        if (mode === 'del') {
          if (Math.abs(ev.clientX - sx) < 12 && Math.abs(ev.clientY - sy) < 12) {
            var nm = t.cfg.name || (SCHEMA[t.cfg.type] || {}).label || 'kafel';
            change(function () { V().tiles.splice(t.idx, 1); }); toast('Usunięto „' + nm + '” – „Cofnij” przywraca');
          }
          return;
        }
        if (drag) {
          endDrag(); drag = false;
          var under = document.elementsFromPoint(ev.clientX, ev.clientY).map(function (e) { return e.closest && e.closest('.tile'); }).filter(function (e) { return e && e !== t.el; })[0];
          var target = tiles.filter(function (x) { return x.el === under; })[0];
          if (target) moveTile(t.idx, target.idx);
          return;
        }
        if (selIdx === t.idx) return tileMenu(t.idx);
        return select(t.idx);
      }
      var a = ev.target.closest('[data-act]');
      if (a && t.ty.act && t.ty.act[a.getAttribute('data-act')]) return t.ty.act[a.getAttribute('data-act')](t.cfg, a, t);
      if (was && t.cfg.open) return openPage(t.cfg.open);
      if (was && PANEL.tileTap && PANEL.tileTap(t.cfg)) return;
      if (was && t.ty.tap) t.ty.tap(t.cfg, t);
    });
    t.el.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
  }

  // przytrzymanie pustego tła: galeria/edycja; przesunięcie w bok: twarz jedzie za palcem (jak w iOS); w górę od dołu: menu
  (function () {
    var sx, sy, st0, timer, onTile, drag = null, lastX, lastT, vx = 0;
    var g = function () { return $('view'); };
    function canSwipe() { return !edit && !popup && !(PANEL.screenOpen && PANEL.screenOpen()) && (V().page || faces().length > 1); }
    function slideTo(dir) {
      // dir: -1 następna, +1 poprzednia; twarz wyjeżdża, nowa wjeżdża z przeciwnej strony
      var el = g(), w = window.innerWidth / (FIT.s || 1);
      el.style.transition = 'transform .22s ease-out'; el.style.transform = 'translateX(' + (dir * w) + 'px)';
      setTimeout(function () {
        if (V().page) back();
        else { var F = faces(), fi = F.indexOf(vi); vi = F[(fi - dir + F.length) % F.length]; build(); }
        var e2 = g(); e2.style.transition = 'none'; e2.style.transform = 'translateX(' + (-dir * w * 0.35) + 'px)'; e2.style.opacity = '0.4';
        requestAnimationFrame(function () { requestAnimationFrame(function () { e2.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s'; e2.style.transform = ''; e2.style.opacity = ''; }); });
      }, 200);
    }
    function snapBack() { var el = g(); el.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)'; el.style.transform = ''; }
    document.addEventListener('pointerdown', function (ev) {
      if (popup || (PANEL.screenOpen && PANEL.screenOpen())) { sx = null; return; }
      sx = lastX = ev.clientX; sy = ev.clientY; st0 = lastT = Date.now(); vx = 0; drag = null; onTile = !!ev.target.closest('.tile,.editbar,.dots');
      clearTimeout(timer);
      if (!onTile && !edit && !(V() && V().page)) timer = setTimeout(function () { if (PANEL.openGallery) PANEL.openGallery(); else enterEdit(); }, 700);
      else if (!onTile && !edit) timer = setTimeout(function () { enterEdit(); toast('Tryb edycji – dotknij kafla, aby go zmienić'); }, 700);
    }, true);
    document.addEventListener('pointermove', function (ev) {
      if (sx == null) return;
      var dx = ev.clientX - sx, dy = ev.clientY - sy, now = Date.now();
      if (Math.abs(dx) > 12 || Math.abs(dy) > 12) clearTimeout(timer);
      if (now > lastT) { vx = (ev.clientX - lastX) / (now - lastT); lastX = ev.clientX; lastT = now; }
      if (drag === null && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2 && canSwipe()) {
        if (V().page && dx < 0) drag = false; else drag = true;
        if (drag) { g().style.transition = 'none'; document.body.classList.add('swiping'); }
      } else if (drag === null && Math.abs(dy) > 14) drag = false;
      if (drag) { var z = FIT.s || 1; g().style.transform = 'translateX(' + (dx / z) + 'px)'; ev.preventDefault(); }
    }, true);
    function end(ev, cancelled) {
      clearTimeout(timer);
      if (sx == null) return;
      var dx = (ev.clientX != null ? ev.clientX : lastX) - sx, dy = (ev.clientY != null ? ev.clientY : sy) - sy, W = window.innerWidth;
      var wasDrag = drag; drag = null; sx = null; document.body.classList.remove('swiping');
      if (wasDrag) {
        var go = Math.abs(dx) > W * 0.18 || (Math.abs(vx) > 0.45 && Math.abs(dx) > 40);
        if (go && !cancelled) slideTo(dx < 0 ? -1 : 1); else snapBack();
        // nie traktuj przesunięcia jako dotknięcia kafla
        if (Math.abs(dx) > 12) { var stop = function (e) { e.stopPropagation(); e.preventDefault(); document.removeEventListener('click', stop, true); }; document.addEventListener('click', stop, true); setTimeout(function () { document.removeEventListener('click', stop, true); }, 350); }
        return;
      }
      if (cancelled || popup || (PANEL.screenOpen && PANEL.screenOpen())) return;
      if (dy < -60 && Math.abs(dx) < Math.abs(dy) && sy > window.innerHeight * 0.78 && Date.now() - st0 < 1500) { if (PANEL.openLauncher) PANEL.openLauncher(); else settings(); }
    }
    document.addEventListener('pointerup', function (ev) { end(ev, false); }, true);
    document.addEventListener('pointercancel', function (ev) { end(ev, true); }, true);
  })();

  function renderDots() {
    var d = $('dots'), F = faces();
    d.classList.toggle('hidden', (F.length < 2 && !edit) || !!V().page);
    d.innerHTML = F.map(function (i) { return '<i class="' + (i === vi ? 'cur' : '') + '" data-v="' + i + '"></i>'; }).join('');
  }
  $('dots').addEventListener('click', function (ev) { var i = ev.target.getAttribute('data-v'); if (i != null) { vi = +i; navStack = []; build(); } });
  $('back').addEventListener('click', function () { back(); });

  // ---------- zapis ----------
  var saveT;
  function snapshot() { hist.push(JSON.stringify(layout)); if (hist.length > 40) hist.shift(); }
  function save(rebuild) {
    if (rebuild !== false) build();
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      api('layout', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Panel-Client': CLIENT }, body: JSON.stringify(layout) })
        .catch(function (e) { toast('Nie zapisano: ' + e.message); });
    }, 400);
  }
  function change(fn, rebuild) { snapshot(); fn(); save(rebuild); }
  function undo() { if (!hist.length) return toast('Nie ma czego cofnąć'); layout = JSON.parse(hist.pop()); save(); if (popup) closePop(); }

  // ---------- tryb edycji ----------
  function enterEdit() { if (edit || (V() && V().kind)) return; edit = true; document.body.classList.add('editing'); renderBar(); renderDots(); }
  function exitEdit() { edit = false; select(-1); document.body.classList.remove('editing'); renderBar(); renderDots(); closePop(); }
  function renderBar() {
    var b = $('editbar');
    b.classList.toggle('hidden', !edit);
    if (edit) b.innerHTML = '<button data-eb="undo" class="rnd" title="Cofnij">↶</button><button data-eb="add" class="rnd" title="Dodaj kafel">＋</button>' +
      (V().page ? '<button data-eb="settings">⚙ Ustawienia</button>' : '<button data-eb="custom">Dostosuj</button><button data-eb="settings" class="rnd nset" title="Ustawienia">⚙</button>') + '<button data-eb="done" class="done">Gotowe</button>';
  }
  // 0.9.31: przyciski Aplikacje / Ustawienia na telefonie (wąski ekran)
  $('menubtns').addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-mb]'); if (!b) return;
    if (b.getAttribute('data-mb') === 'apps' && PANEL.openLauncher) PANEL.openLauncher(); else settings();
  });
  $('editbar').addEventListener('click', function (ev) {
    var a = ev.target.getAttribute('data-eb');
    if (a === 'undo') undo(); else if (a === 'add') addTile(); else if (a === 'settings') settings(); else if (a === 'done') exitEdit();
    else if (a === 'custom') { if (PANEL.openCustomize) PANEL.openCustomize(vi, 'widgets', selIdx); else settings('faces'); }
  });
  // rozmiary jak w Rehome: S 1×1, W 2×1, M 2×2, L 3×2 (przycięte do liczby kolumn)
  var SIZES = { S: [1, 1], W: [2, 1], M: [2, 2], L: [3, 2] };
  function sizeKey(c) { for (var k in SIZES) if (SIZES[k][0] === (c.w || 1) && SIZES[k][1] === (c.h || 1)) return k; return ''; }
  function setSize(i, k) {
    var c = V().tiles[i], cols = V().columns || 5; if (!c) return;
    change(function () { c.w = Math.min(SIZES[k][0], cols); c.h = SIZES[k][1]; });
    select(i);
  }
  function select(i) {
    selIdx = i;
    tiles.forEach(function (t) {
      t.el.classList.toggle('sel', t.idx === i);
      if (t.ctl) t.ctl = t.ctl.filter(function (x) { return x !== szPill; });
    });
    if (szPill && szPill.parentNode) szPill.parentNode.removeChild(szPill);
    var t = tiles.filter(function (x) { return x.idx === i; })[0];
    if (!t || !edit) return;
    if (!szPill) {
      szPill = document.createElement('div'); szPill.className = 'szpill';
      ['pointerdown', 'pointerup', 'click'].forEach(function (evn) {
        szPill.addEventListener(evn, function (ev) {
          ev.stopPropagation(); if (evn !== 'click') return;
          var b = ev.target.closest('[data-sz]'); if (!b || b.classList.contains('dis')) return;
          var k = b.getAttribute('data-sz');
          if (k === 'swap') typePicker(function (type) { var c = V().tiles[selIdx]; closePop(); change(function () { var n = Object.assign({ id: c.id, type: type }, JSON.parse(JSON.stringify(SCHEMA[type].def)), { w: c.w, h: c.h }); V().tiles[selIdx] = n; }); select(selIdx); tileMenu(selIdx); });
          else if (k === 'cfg') tileMenu(selIdx);
          else setSize(selIdx, k);
        });
      });
    }
    var c = t.cfg, cols = V().columns || 5, cur = sizeKey(c);
    szPill.innerHTML = Object.keys(SIZES).map(function (k) { return '<b data-sz="' + k + '" class="' + (k === cur ? 'on' : '') + (SIZES[k][0] > cols ? ' dis' : '') + '">' + k + '</b>'; }).join('') +
      '<i></i><b data-sz="swap" title="Zamień kafel">' + FI('swap', '#fff') + '</b><b data-sz="cfg" title="Ustawienia kafla">' + FI('gear', '#fff') + '</b>';
    var r = t.el.getBoundingClientRect();
    szPill.classList.toggle('up', r.top + r.height / 2 > window.innerHeight * 0.55);
    t.ctl = (t.ctl || []).concat([szPill]); t.el.appendChild(szPill);
  }
  function moveTile(from, to) {
    change(function () { var l = V().tiles, t = l.splice(from, 1)[0]; l.splice(to, 0, t); });
  }

  // definicje pól edytora dla każdego typu kafla
  var ICONS = ['', 'bulb', 'moon', 'film', 'blinds', 'door', 'fan', 'lock', 'power', 'play', 'sofa', 'tv'];
  var DEV_DOMAINS = ['light', 'switch', 'fan', 'cover', 'lock', 'script', 'scene', 'input_boolean', 'media_player', 'climate', 'button', 'input_button', 'number', 'input_number', 'select', 'input_select'];
  var ROWF = [['entity', 'Encja', 'entity', ['*']], ['label', 'Etykieta', 'text'],
    ['format', 'Format', 'select', ['auto|Automatyczny', 'minutes|Minuty → „1 h 20 min”', 'ago|Ile temu / za ile', 'date|Data', 'time|Godzina', 'state|Tekst stanu']],
    ['scale', 'Mnożnik (np. 100: £ → p, 0,001: W → kW)', 'number'], ['decimals', 'Miejsca po przecinku', 'number'], ['unit', 'Jednostka', 'text'],
    ['map', 'Tłumaczenie stanów (np. on=Otwarte; off=Zamknięte)', 'text'], ['warn', 'Ostrzeżenie gdy (on · <2,3 · >45 · =open)', 'text'],
    ['warn_entity', 'Ostrzeżenie z czujnika', 'entity', ['binary_sensor']], ['period', 'Okres', 'select', ['|Bieżąca wartość', 'month|Suma w tym miesiącu']], ['attr', 'Atrybut (zaawansowane)', 'text']];
  var SCHEMA = {
    stat: { label: 'Wartość', desc: 'Jedna duża liczba + dodatkowe wiersze', def: { w: 1, h: 1 },
      fields: [['entity', 'Encja', 'entity', ['*']], ['name', 'Nazwa', 'text'], ['scale', 'Mnożnik', 'number'], ['decimals', 'Miejsca po przecinku', 'number'], ['unit', 'Jednostka', 'text'], ['warn', 'Ostrzeżenie gdy', 'text'], ['extra', 'Dodatkowe wiersze', 'items', ROWF]] },
    list: { label: 'Lista', desc: 'Tytuł i wiersze etykieta → wartość; wiersze ze sterowaniem', def: { w: 1, h: 1, rows: [] },
      fields: [['name', 'Tytuł', 'text'], ['sub', 'Podtytuł', 'text'], ['rows', 'Wiersze', 'items', ROWF]] },
    graph: { label: 'Wykres', desc: 'Słupki dzienne/godzinowe z historii HA', def: { w: 2, h: 1, days: 14, period: 'day', kind: 'change', series: [] },
      fields: [['name', 'Tytuł', 'text'], ['series', 'Serie', 'items', [['entity', 'Encja (z historią)', 'entity', ['sensor']], ['name', 'Nazwa', 'text'], ['color', 'Kolor', 'color'], ['unit', 'Jednostka', 'text']]],
        ['period', 'Okres', 'select', ['day|Dni', 'hour|Godziny']], ['days', 'Ile dni', 'number'], ['hours', 'Ile godzin', 'number'], ['kind', 'Wartość', 'select', ['change|Zużycie (przyrost)', 'mean|Średnia', 'max|Maksimum']]] },
    map: { label: 'Mapa', desc: 'Lokalizacja auta lub osoby', def: { w: 1, h: 1, zoom: 15 },
      fields: [['entity', 'Lokalizacja', 'entity', ['device_tracker', 'person']], ['name', 'Nazwa', 'text'], ['zoom', 'Przybliżenie (10–18)', 'number'], ['lat', 'Szerokość z czujnika', 'entity', ['sensor']], ['lon', 'Długość z czujnika', 'entity', ['sensor']]] },
    car_hero: { label: 'Auto – główny', desc: 'Zdjęcie, bateria, zasięg, ładowanie, drzwi', def: { w: 2, h: 2, plug_on: 'on', doors_ok: 'secured' },
      fields: [['name', 'Nazwa', 'text'], ['image', 'Zdjęcie auta', 'image'], ['battery', 'Bateria (%)', 'entity', ['sensor']], ['range', 'Zasięg', 'entity', ['sensor']], ['charging', 'Ładowanie', 'entity', ['sensor', 'switch', 'binary_sensor']],
        ['remaining', 'Pozostały czas ładowania', 'entity', ['sensor']], ['plug', 'Wtyczka', 'entity', ['sensor', 'binary_sensor']], ['plug_on', 'Stan „podłączony”', 'text'], ['location', 'Miejsce', 'entity', ['sensor', 'device_tracker']],
        ['doors', 'Drzwi', 'entity', ['sensor', 'binary_sensor']], ['doors_ok', 'Stan „zamknięte”', 'text'], ['lock', 'Zamek', 'entity', ['lock']]] },
    devices: { label: 'Urządzenia i sceny', desc: 'Światła, rolety, zamki, sceny – jak w Apple Home', def: { w: 1, h: 1, columns: 1, items: [] },
      fields: [['items', 'Elementy', 'items', [['entity', 'Encja', 'entity', DEV_DOMAINS], ['name', 'Nazwa', 'text'], ['sub', 'Podpis (np. pokój)', 'text'], ['icon', 'Ikona', 'select', ICONS]]], ['columns', 'Kolumny w kaflu', 'number']] },
    clock_weather: { label: 'Zegar i pogoda', def: { w: 2, h: 1, sun: 'sun.sun' }, fields: [['weather', 'Pogoda', 'entity', ['weather']], ['sun', 'Słońce', 'entity', ['sun']], ['mode', 'Pokaż', 'select', ['|Zegar i pogoda', 'weather|Tylko pogoda']]] },
    analog_clock: { label: 'Zegar analogowy', def: { w: 1, h: 1 }, fields: [] },
    thermostat: { label: 'Termostat', def: { w: 1, h: 1, step: 0.5 }, fields: [['entity', 'Termostat', 'entity', ['climate']], ['name', 'Nazwa', 'text'], ['room', 'Pomieszczenie', 'text'], ['step', 'Krok (°)', 'number']] },
    camera: { label: 'Kamera', def: { w: 1, h: 1, refresh: 2 }, fields: [['entity', 'Kamera', 'entity', ['camera']], ['name', 'Nazwa', 'text'], ['refresh', 'Odświeżanie (s)', 'number']] },
    alarm: { label: 'Alarm', def: { w: 1, h: 1, name: 'Alarm' }, fields: [['entity', 'Alarm', 'entity', ['alarm_control_panel']], ['name', 'Nazwa', 'text']] },
    lights: { label: 'Światła (zbiorczo)', desc: 'Ile świateł się świeci i gdzie', def: { w: 1, h: 1, lights: {} }, fields: [['lights', 'Światło → pomieszczenie', 'entmap', ['light'], 'Pomieszczenie']] },
    contacts: { label: 'Drzwi i okna', def: { w: 1, h: 1, name: 'Drzwi i okna', entities: {} }, fields: [['name', 'Nazwa', 'text'], ['entities', 'Czujnik → nazwa', 'entmap', ['binary_sensor'], 'Nazwa']] },
    car: { label: 'Samochód', def: { w: 1, h: 1, plug_on: 'on' }, fields: [['name', 'Nazwa', 'text'], ['image', 'Zdjęcie auta', 'image'], ['battery', 'Bateria (%)', 'entity', ['sensor']], ['range', 'Zasięg', 'entity', ['sensor']], ['charging', 'Ładowanie', 'entity', ['sensor', 'switch', 'binary_sensor']], ['plug', 'Wtyczka', 'entity', ['sensor', 'binary_sensor']], ['plug_on', 'Stan „podłączony”', 'text'], ['location', 'Miejsce', 'entity', ['sensor', 'device_tracker']]] },
    energy: { label: 'Energia', def: { w: 1, h: 1 }, fields: [['power', 'Bieżący pobór (W)', 'entity', ['sensor']], ['rate', 'Stawka', 'entity', ['sensor']], ['off_peak', 'Tania taryfa', 'entity', ['binary_sensor']], ['elec_cost', 'Koszt prądu dziś', 'entity', ['sensor']], ['elec_kwh', 'Zużycie prądu dziś', 'entity', ['sensor']], ['gas_cost', 'Koszt gazu dziś', 'entity', ['sensor']]] },
    network: { label: 'Sieć', def: { w: 1, h: 1 }, fields: [['temp', 'Temperatura', 'entity', ['sensor']], ['temp_name', 'Opis temperatury', 'text'], ['internet', 'Internet', 'entity', ['binary_sensor']], ['remote', 'Zdalny dostęp', 'entity', ['binary_sensor']]] },
    bins: { label: 'Kosze', def: { w: 5, h: 1, items: [] }, fields: [['items', 'Kosze', 'items', [['name', 'Nazwa', 'text'], ['entity', 'Kalendarz', 'entity', ['calendar']], ['ack', 'Potwierdzenie', 'entity', ['input_boolean']], ['color', 'Kolor', 'color'], ['wash', 'To mycie, nie wystawienie', 'bool']]]] },
    updates: { label: 'Aktualizacje systemu', def: { w: 1, h: 1 }, fields: [] },
    batteries: { label: 'Baterie', def: { w: 1, h: 1, threshold: 10 }, fields: [['threshold', 'Próg słabej baterii (%)', 'number']] },
    cameras: { label: 'Kamery (wszystkie)', desc: 'Podgląd wszystkich kamer, otwiera podstronę z kamerami', def: { w: 1, h: 1, refresh: 10 }, fields: [['name', 'Nazwa', 'text'], ['refresh', 'Odświeżanie (s)', 'number']] },
    temp: { label: 'Temperatura', desc: 'Jedna temperatura z kolorem wg progów (np. szafka sieciowa)', def: { w: 1, h: 1, warn: 45, hot: 55 }, fields: [['entity', 'Czujnik temperatury', 'entity', ['sensor']], ['name', 'Nazwa', 'text'], ['sub', 'Podpis', 'text'], ['warn', 'Ciepło od (°)', 'number'], ['hot', 'Gorąco od (°)', 'number'], ['internet', 'Internet', 'entity', ['binary_sensor']], ['remote', 'Zdalny dostęp', 'entity', ['binary_sensor']]] },
    person: { label: 'Osoba', desc: 'Gdzie teraz jest (strefa, adres) i od kiedy', def: { w: 1, h: 1 }, fields: [['entity', 'Osoba', 'entity', ['person']], ['name', 'Nazwa', 'text'], ['address', 'Adres z czujnika (opcjonalnie)', 'entity', ['sensor']]] },
    ha: { label: 'Home Assistant (ustawienia)', def: { w: 1, h: 1 }, fields: [['name', 'Nazwa', 'text'], ['sub', 'Podpis', 'text'], ['url', 'Adres (domyślnie /config/dashboard)', 'text']] },
    rooms: { label: 'Pomieszczenia (otwiera ekran Dom)', def: { w: 1, h: 1 }, fields: [] }
  };

  function tileMenu(idx) {
    var pick = null; // {field, item, key, domains, cb}
    var wpick = null; // {key, list}
    openPop(function () {
      var c = V().tiles[idx]; if (!c) return '';
      if (pick) return picker(pick);
      if (wpick) return '<h2>Folder www<button class="x" data-pact="wcancel">←</button></h2>' + (wpick.list == null ? '<div class="small">Wczytuję…</div>' : !wpick.list.length ? '<div class="small">Brak zdjęć w folderze www (albo App nie ma do niego dostępu).</div>' :
        '<div class="wwwgrid">' + wpick.list.map(function (f) { return '<button data-pact="wdo" data-f="' + esc(f) + '"><img loading="lazy" src="' + imgSrc('/local/' + f) + '" alt=""><span>' + esc(f) + '</span></button>'; }).join('') + '</div>');
      var sc = SCHEMA[c.type] || { label: c.type, fields: [] }, cols = V().columns || 5;
      var btn = function (k, v, cur) { return '<button class="seg-b' + (cur ? ' sel' : '') + '" data-pact="' + k + '" data-v="' + v + '">' + v + '</button>'; };
      var ws = [], hs = [];
      for (var w = 1; w <= cols; w++) ws.push(btn('w', w, (c.w || 1) === w));
      for (var h = 1; h <= 4; h++) hs.push(btn('h', h, (c.h || 1) === h));
      return '<h2>' + esc(c.name || sc.label) + '<button class="x" data-close>×</button></h2>' +
        '<div class="ed"><label>Szerokość</label><div class="segs">' + ws.join('') + '</div></div>' +
        '<div class="ed"><label>Wysokość</label><div class="segs">' + hs.join('') + '</div></div>' +
        '<div class="ed"><label>Miejsce</label><div class="segs"><button class="seg-b" data-pact="prev">◀ Wcześniej</button><button class="seg-b" data-pact="next">Dalej ▶</button></div></div>' +
        '<div class="ed"><label>Rodzaj</label><div class="segs"><button class="seg-b wide" data-pact="type">' + esc(sc.label) + ' – zmień…</button></div></div>' +
        '<div class="ed"><label>Po dotknięciu otwórz</label><select class="inp" data-pin="open"><option value="">— nic (zwykłe działanie kafla) —</option>' + layout.views.filter(function (x) { return x.page; }).map(function (x) { return '<option value="' + esc(x.id) + '"' + (c.open === x.id ? ' selected' : '') + '>Podstrona: ' + esc(x.title || x.id) + '</option>'; }).join('') + '</select></div>' +
        looksHtml(c) +
        (sc.fields.length ? '<h3>Zawartość</h3>' + sc.fields.map(function (f) { return fieldHtml(c, f); }).join('') : '') +
        '<div class="btns" style="margin-top:18px"><button class="btn" data-pact="dup">Duplikuj</button><button class="btn red" data-pact="del">Usuń kafel</button></div>' +
        '<div class="small" style="margin-top:12px;text-align:center">Kafle możesz też przeciągać palcem w trybie edycji.</div>';
    }, { static: true, cls: 'editor', acts: {
      w: function (el) { change(function () { V().tiles[idx].w = +el.getAttribute('data-v'); }); refreshPop(); },
      h: function (el) { change(function () { V().tiles[idx].h = +el.getAttribute('data-v'); }); refreshPop(); },
      prev: function () { if (idx > 0) { moveTile(idx, idx - 1); idx--; } },
      next: function () { if (idx < V().tiles.length - 1) { moveTile(idx, idx + 1); idx++; } },
      dup: function () { change(function () { var c = JSON.parse(JSON.stringify(V().tiles[idx])); c.id = uid(); V().tiles.splice(idx + 1, 0, c); }); closePop(); toast('Skopiowano kafel'); },
      del: function () { change(function () { V().tiles.splice(idx, 1); }); closePop(); toast('Usunięto – „Cofnij” przywraca'); },
      type: function () { typePicker(function (type) { change(function () { var o = V().tiles[idx]; V().tiles[idx] = Object.assign({ id: o.id }, JSON.parse(JSON.stringify(SCHEMA[type].def)), { type: type, w: o.w, h: o.h }); }); tileMenu(idx); }); },
      pickent: function (el) {
        var key = el.getAttribute('data-k'), item = el.getAttribute('data-item'), sub = el.getAttribute('data-sub'), doms = el.getAttribute('data-d').split(',');
        pick = { domains: doms, q: '', cb: function (e) {
          change(function () {
            var c = V().tiles[idx];
            if (item != null) c[key][+item][sub] = e;
            else if (sub === '__map') { c[key] = c[key] || {}; c[key][e] = c[key][e] || (attr(e, 'friendly_name') || e); }
            else if (sub === '__item') { c[key] = c[key] || []; var n = {}; n.entity = e; if (c.type === 'devices') n.name = attr(e, 'friendly_name') || ''; if (c.type === 'bins') { n.entity = e; n.name = attr(e, 'friendly_name') || ''; n.color = '#30d158'; } c[key].push(n); }
            else c[key] = e;
          });
          pick = null; refreshPop();
        } };
        refreshPop(); var q = $('pq'); if (q) q.focus();
      },
      pickdo: function (el) { if (pick) pick.cb(el.getAttribute('data-e')); },
      wwwpick: function (el) {
        wpick = { key: el.getAttribute('data-k'), list: null }; refreshPop();
        api('www').then(function (l) { if (wpick) { wpick.list = l; refreshPop(); } }).catch(function () { if (wpick) { wpick.list = []; refreshPop(); } });
      },
      wdo: function (el) { var k = wpick.key, f = el.getAttribute('data-f'); change(function () { V().tiles[idx][k] = '/local/' + f; }); wpick = null; refreshPop(); },
      wcancel: function () { wpick = null; refreshPop(); },
      pickcancel: function () { pick = null; refreshPop(); },
      clr: function (el) { var key = el.getAttribute('data-k'); change(function () { delete V().tiles[idx][key]; }); refreshPop(); },
      maprm: function (el) { var key = el.getAttribute('data-k'), e = el.getAttribute('data-e'); change(function () { delete V().tiles[idx][key][e]; }); refreshPop(); },
      itemrm: function (el) { var key = el.getAttribute('data-k'), i = +el.getAttribute('data-item'); change(function () { V().tiles[idx][key].splice(i, 1); }); refreshPop(); },
      seticon: function (el) { var v = el.getAttribute('data-v'); change(function () { if (v) V().tiles[idx].icon2 = v; else delete V().tiles[idx].icon2; }); refreshPop(); },
      setal: function (el) { var k = el.getAttribute('data-k'), v = el.getAttribute('data-v'); change(function () { if (v) V().tiles[idx][k] = v; else delete V().tiles[idx][k]; }); refreshPop(); },
      itemup: function (el) { var key = el.getAttribute('data-k'), i = +el.getAttribute('data-item'); if (i < 1) return; change(function () { var l = V().tiles[idx][key]; l.splice(i - 1, 0, l.splice(i, 1)[0]); }); refreshPop(); }
    }, inputs: {
      f: function (el, evn) {
        if (evn === 'input' && el.type !== 'color') return; // zapis po zakończeniu pisania
        var key = el.getAttribute('data-k'), item = el.getAttribute('data-item'), sub = el.getAttribute('data-sub'), kind = el.getAttribute('data-kind');
        var val = kind === 'bool' ? el.checked : kind === 'number' ? (el.value === '' ? undefined : parseFloat(String(el.value).replace(',', '.'))) : el.value;
        change(function () {
          var c = V().tiles[idx];
          if (item != null) { if (val === '' || val === undefined || val === false) delete c[key][+item][sub]; else c[key][+item][sub] = val; }
          else if (sub) c[key][sub] = val;
          else if (val === '' || val === undefined) delete c[key]; else c[key] = val;
        });
      },
      imgfile: function (el, evn) {
        if (evn !== 'change' || !el.files || !el.files[0]) return;
        var key = el.getAttribute('data-k'), f = el.files[0], c0 = V().tiles[idx];
        toast('Wysyłam zdjęcie…');
        shrink(f, 1400).then(function (blob) {
          return fetch('api/upload?name=' + encodeURIComponent(c0.name || 'auto'), { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error); return j; }); });
        }).then(function (j) { change(function () { V().tiles[idx][key] = j.path; }); refreshPop(); toast('Zdjęcie zapisane'); })
          .catch(function (e) { toast('Nie udało się: ' + e.message); });
      },
      open: function (el, evn) { if (evn !== 'change') return; change(function () { if (el.value) V().tiles[idx].open = el.value; else delete V().tiles[idx].open; }); },
      pq: function (el, evn) { if (evn !== 'input') return; if (pick) { pick.q = el.value; var l = $('plist'); if (l) l.innerHTML = pickList(pick); } }
    } });
  }

  // zmniejsza zdjęcie z aparatu (np. 12 Mpx) do rozsądnego rozmiaru, zachowując przezroczystość
  function shrink(file, max) {
    return new Promise(function (resolve, reject) {
      var im = new Image(), u = URL.createObjectURL(file);
      im.onload = function () {
        var k = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
        cv.toBlob(function (b) { b ? resolve(b) : reject(new Error('Nie mogę przetworzyć zdjęcia')); }, 'image/webp', 0.88);
      };
      im.onerror = function () { reject(new Error('To nie jest obraz')); };
      im.src = u;
    });
  }
  function entLabel(e) { return e ? '<b>' + esc(attr(e, 'friendly_name') || e) + '</b><small>' + esc(e) + (S[e] ? ' · ' + esc(S[e].state) : ' · brak w HA') + '</small>' : '<b>Wybierz…</b>'; }
  function fieldHtml(c, f, item, itemObj) {
    var key = f[0], label = f[1], kind = f[2], it = item != null ? ' data-item="' + item + '"' : '';
    var holder = itemObj || c, k = itemObj ? key : key;
    var dk = item != null ? ' data-k="' + esc(holderKey(c, itemObj)) + '" data-sub="' + key + '"' : ' data-k="' + key + '"';
    var v = holder[k];
    if (kind === 'text' || kind === 'number') return '<div class="ed"><label>' + esc(label) + '</label><input class="inp" data-pin="f" data-kind="' + kind + '"' + dk + it + ' type="' + (kind === 'number' ? 'text' : 'text') + '" inputmode="' + (kind === 'number' ? 'decimal' : 'text') + '" value="' + esc(v == null ? '' : v) + '"></div>';
    if (kind === 'color') return '<div class="ed"><label>' + esc(label) + '</label><input class="inp col" data-pin="f" data-kind="color"' + dk + it + ' type="color" value="' + esc(v || '#30d158') + '"></div>';
    if (kind === 'bool') return '<div class="ed"><label class="chk"><input data-pin="f" data-kind="bool"' + dk + it + ' type="checkbox"' + (v ? ' checked' : '') + '> ' + esc(label) + '</label></div>';
    if (kind === 'select') return '<div class="ed"><label>' + esc(label) + '</label><select class="inp" data-pin="f" data-kind="select"' + dk + it + '>' + f[3].map(function (o) { var p = String(o).split('|'), val = p[0], lab = p[1] || p[0] || 'automatyczna'; return '<option value="' + esc(val) + '"' + (String(v == null ? '' : v) === val ? ' selected' : '') + '>' + esc(lab) + '</option>'; }).join('') + '</select></div>';
    if (kind === 'image') return '<div class="ed"><label>' + esc(label) + '</label><div class="imgfield">' + (v ? '<img src="' + imgSrc(v) + '" alt="">' : '<div class="noimg">Brak zdjęcia</div>') +
      '<div class="segs"><label class="seg-b">📷 Wybierz zdjęcie<input type="file" accept="image/*" data-pin="imgfile" data-k="' + key + '" hidden></label>' +
      '<button class="seg-b" data-pact="wwwpick" data-k="' + key + '">🗂 Z folderu www</button><button class="seg-b" data-pact="pickent" data-k="' + key + '" data-d="image">Zdjęcie z HA</button>' + (v ? '<button class="seg-b" data-pact="clr" data-k="' + key + '">Usuń</button>' : '') + '</div>' +
      '<div class="small">' + (v ? esc(/^image\./.test(v) ? 'Z Home Assistant: ' + v : /^www:/.test(v) ? 'Automatycznie: pierwsze zdjęcie z „' + v.slice(4) + '” w nazwie (folder www)' : /^\/local\//.test(v) ? 'Folder www: ' + v : 'Własne zdjęcie') : 'Najlepiej zdjęcie z boku, na jednolitym tle') + '</div></div></div>';
    if (kind === 'entity') return '<div class="ed"><label>' + esc(label) + '</label><div class="entbtn" data-pact="pickent"' + dk + it + ' data-d="' + f[3].join(',') + '">' + entLabel(v) + '</div></div>';
    if (kind === 'entmap') {
      var m = c[key] || {};
      return '<div class="ed"><label>' + esc(label) + '</label>' + Object.keys(m).map(function (e) {
        return '<div class="maprow"><div class="mapent">' + entLabel(e) + '</div><input class="inp" data-pin="f" data-kind="text" data-k="' + key + '" data-sub="' + esc(e) + '" value="' + esc(m[e]) + '" placeholder="' + esc(f[4]) + '"><button class="mini" data-pact="maprm" data-k="' + key + '" data-e="' + esc(e) + '">×</button></div>';
      }).join('') + '<button class="seg-b wide" data-pact="pickent" data-k="' + key + '" data-sub="__map" data-d="' + f[3].join(',') + '">＋ Dodaj</button></div>';
    }
    if (kind === 'items') {
      var l = c[key] || [];
      return '<div class="ed"><label>' + esc(label) + '</label>' + l.map(function (o, i) {
        return '<div class="itembox"><div class="itemhead"><span>' + (i + 1) + '. ' + esc(o.name || attr(o.entity, 'friendly_name') || o.entity || '') + '</span><span><button class="mini" data-pact="itemup" data-k="' + key + '" data-item="' + i + '">▲</button><button class="mini" data-pact="itemrm" data-k="' + key + '" data-item="' + i + '">×</button></span></div>' +
          f[3].map(function (sf) { return fieldHtml(c, sf, i, o); }).join('') + '</div>';
      }).join('') + '<button class="seg-b wide" data-pact="pickent" data-k="' + key + '" data-sub="__item" data-d="' + ((f[3].filter(function (sf) { return sf[2] === 'entity'; })[0] || [0, 0, 0, ['*']])[3]).join(',') + '">＋ Dodaj</button></div>';
    }
    return '';
  }
  var NOLOOK = { bins: 1, clock_weather: 1, analog_clock: 1, graph: 1, devices: 1, list: 1, stat: 1, map: 1 };
  function looksHtml(c) {
    if (NOLOOK[c.type]) return '';
    var ty = T[c.type] || {}, hasRing = ty.std && c.type !== 'person';
    var al = function (k, lab) {
      var cur = c[k] || '';
      return '<div class="ed"><label>' + lab + '</label><div class="segs">' + [['l', 'Do lewej'], ['', 'Środek'], ['r', 'Do prawej']].map(function (o) {
        return '<button class="seg-b' + (cur === o[0] ? ' sel' : '') + '" data-pact="setal" data-k="' + k + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
    };
    var sizeSel = '<div class="ed"><label>Wielkość ikony</label><div class="segs">' + [['s', 'Mała'], ['m', 'Średnia'], ['l', 'Duża'], ['xl', 'Bardzo duża']].map(function (o) {
      return '<button class="seg-b' + ((c.icon_size || 'm') === o[0] ? ' sel' : '') + '" data-pact="setal" data-k="icon_size" data-v="' + (o[0] === 'm' ? '' : o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
    var more = '<div class="ed"><label>Ikona z biblioteki Material Design (ponad 7000 ikon, np. car-electric, sofa, washing-machine)</label><input class="inp" data-pin="f" data-kind="text" data-k="icon_mdi" value="' + esc(c.icon_mdi || '') + '" placeholder="np. mdi:car-electric"></div>' +
      '<div class="ed"><label>Albo emoji</label><input class="inp" data-pin="f" data-kind="text" data-k="icon_emoji" value="' + esc(c.icon_emoji || '') + '" placeholder="np. 🚗"></div>' +
      fieldHtml(c, ['icon_img', 'Albo własny obrazek (PNG, SVG, zdjęcie)', 'image']) +
      '<div class="small" style="margin:-4px 0 10px">Pierwszeństwo: własny obrazek → ikona Material Design → emoji → ikona z siatki. Nazwy ikon znajdziesz na stronie pictogrammers.com (Material Design Icons) – takie same jak w Home Assistant.</div>';
    var icons = hasRing && window.FI && FI.names ? '<div class="ed"><label>Ikona</label><div class="icgrid"><button class="icb' + (!c.icon2 ? ' sel' : '') + '" data-pact="seticon" data-v="">Auto</button>' +
      FI.names().filter(function (n) { return !/^(prev|next|vol|shuffle|repeat|arrow|plus|minus|half|check2|pencil|swap)$/.test(n); }).map(function (n) { return '<button class="icb' + (c.icon2 === n ? ' sel' : '') + '" data-pact="seticon" data-v="' + n + '">' + FI(n, 'currentColor') + '</button>'; }).join('') + '</div></div>' : '';
    return '<h3>Wygląd</h3>' +
      '<div class="ed"><label>Górna nazwa</label><input class="inp" data-pin="f" data-kind="text" data-k="title" value="' + esc(c.title || '') + '" placeholder="Automatycznie"></div>' +
      al('align_top', 'Wyrównanie nazwy') + (hasRing ? sizeSel + icons + more : '') +
      '<div class="ed"><label>Dolny napis</label><input class="inp" data-pin="f" data-kind="text" data-k="bottom" value="' + esc(c.bottom || '') + '" placeholder="Automatycznie (stan na żywo)"></div>' +
      al('align_bottom', 'Wyrównanie dolnego napisu');
  }
  function holderKey(c, obj) { for (var k in c) if (Array.isArray(c[k]) && c[k].indexOf(obj) >= 0) return k; return ''; }

  function pickList(p) {
    var q = (p.q || '').toLowerCase();
    var list = Object.keys(S).filter(function (e) { return p.domains.indexOf('*') >= 0 || p.domains.indexOf(e.split('.')[0]) >= 0; })
      .filter(function (e) { return !q || e.toLowerCase().indexOf(q) >= 0 || String(attr(e, 'friendly_name') || '').toLowerCase().indexOf(q) >= 0; })
      .sort(function (a, b) { return String(attr(a, 'friendly_name') || a).localeCompare(String(attr(b, 'friendly_name') || b), EN ? 'en' : 'pl'); });
    var more = list.length > 150; list = list.slice(0, 150);
    return list.map(function (e) { return '<div class="lrow pick" data-pact="pickdo" data-e="' + esc(e) + '"><span>' + entLabel(e) + '</span></div>'; }).join('') +
      (more ? '<div class="small">Zawęź wyszukiwanie, żeby zobaczyć więcej…</div>' : '') + (list.length ? '' : '<div class="small">Nic nie pasuje</div>');
  }
  function picker(p) {
    return '<h2>Wybierz encję<button class="x" data-pact="pickcancel">←</button></h2><input id="pq" class="inp" data-pin="pq" placeholder="Szukaj (nazwa lub encja)…" value="' + esc(p.q) + '"><div class="small" style="margin:6px 0 10px">Typy: ' + esc(p.domains.join(', ')) + '</div><div id="plist">' + pickList(p) + '</div>';
  }

  function typePicker(cb) {
    openPop(function () {
      return '<h2>Rodzaj kafla<button class="x" data-close>×</button></h2>' + Object.keys(SCHEMA).filter(function (k) { return !SCHEMA[k].hidden; }).map(function (k) {
        return '<div class="lrow pick" data-pact="t" data-t="' + k + '"><span><b>' + esc(SCHEMA[k].label) + '</b>' + (SCHEMA[k].desc ? '<small>' + esc(SCHEMA[k].desc) + '</small>' : '') + '</span><span>›</span></div>';
      }).join('');
    }, { static: true, cls: 'editor', acts: { t: function (el) { cb(el.getAttribute('data-t')); } } });
  }
  function addTile() {
    typePicker(function (type) {
      var c = Object.assign({ id: uid(), type: type }, JSON.parse(JSON.stringify(SCHEMA[type].def)));
      change(function () { V().tiles.push(c); });
      tileMenu(V().tiles.length - 1);
    });
  }

  // ---------- ustawienia dashboardu ----------
  function waves(a, b, c, tint) {
    return 'radial-gradient(circle at 104% -22%, transparent 0 29%, ' + tint + '.55) 29.2% 30.6%, ' + tint + '.28) 30.8% 39%, transparent 39.2%), ' +
      'radial-gradient(circle at -12% 118%, transparent 0 47%, ' + tint + '.45) 47.2% 48.4%, ' + tint + '.2) 48.6% 62%, transparent 62.2%), ' +
      'radial-gradient(circle at 62% 175%, transparent 0 58%, rgba(0,0,0,.18) 58.2%), linear-gradient(140deg,' + a + ' 0%,' + b + ' 45%,' + c + ' 100%) ' + b;
  }
  var BG = {
    turkus: waves('#5aae9f', '#3f8f84', '#2b6f67', 'rgba(170,232,218,'),
    pomarancz: waves('#f7b54a', '#e8822f', '#c2491c', 'rgba(255,214,150,'),
    niebo: waves('#6aa7e8', '#3f7fcf', '#2a569e', 'rgba(190,220,255,'),
    fiolet: waves('#a083e0', '#7656c4', '#4c3290', 'rgba(220,200,255,'),
    zielen: waves('#7dbb6e', '#4f9446', '#2f6b2c', 'rgba(205,240,190,'),
    grafit: waves('#4a5059', '#30353c', '#1c1f24', 'rgba(200,210,220,'),
    noc: waves('#1b2550', '#0e1636', '#060a1c', 'rgba(120,140,220,')
  };
  var BGN = { turkus: 'Turkus', pomarancz: 'Pomarańcz', niebo: 'Niebo', fiolet: 'Fiolet', zielen: 'Zieleń', grafit: 'Grafit', noc: 'Noc' };

  // ---------- Ustawienia (0.6): dwie kolumny jak w Rehome ----------
  var VERSION = '1.0.2';
  var SET = { cat: 'ha', q: '' };
  var SET_CATS = [
    [['ha', 'Home Assistant', '#ff9f0a', 'home']],
    [['faces', 'Twarze', '#5ac8fa', 'clock'], ['bg', 'Tło', '#ff9500', 'photo'], ['grid', 'Siatka kafli', '#30b0c7', 'grid'], ['pages', 'Podstrony', '#5856d6', 'pages'], ['display', 'Ekran', '#007aff', 'sun'], ['ambient', 'Wygaszacz i zegar nocny', '#5e5ce6', 'moon']],
    [['launcher', 'Menu aplikacji', '#af52de', 'apps'], ['lang', 'Język', '#34c759', 'globe']],
    [['about', 'O Panelu', '#3a3a3c', 'info'], ['privacy', 'Prywatność', '#0a84ff', 'lock']]
  ];
  var SIC = {
    home: '<path d="M4 11l8-7 8 7v9H4z"/>', clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    pages: '<rect x="5" y="3" width="12" height="16" rx="2"/><path d="M9 21h10V7"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
    apps: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'
  };
  function sicon(k, c) { return '<i class="sic" style="background:' + c + '">' + FI({ home: 'hagear', clock: 'clock', photo: 'photo', grid: 'grid', pages: 'pages', sun: 'sun', apps: 'grid', info: 'info', lock: 'lock', globe: 'globe', moon: 'moon' }[k] || k, '#fff') + '</i>'; }
  function catName(k) { var r = ''; SET_CATS.forEach(function (g) { g.forEach(function (c) { if (c[0] === k) r = c[1]; }); }); return r; }
  function sgroup(rows, foot, head) { return (head ? '<div class="sg-h">' + head + '</div>' : '') + '<div class="sg">' + rows.join('') + '</div>' + (foot ? '<div class="sg-f">' + foot + '</div>' : ''); }
  function srow(label, value, extra, cls) { return '<div class="sr ' + (cls || '') + '"' + (extra || '') + '><span>' + label + '</span><span class="sv">' + (value || '') + '</span></div>'; }
  function stoggle(on, act) { return '<button class="tgl' + (on ? ' on' : '') + '" data-sact="' + act + '"><i></i></button>'; }
  function faceSel() {
    return '<div class="segs2">' + faces().map(function (i) { return '<button class="' + (i === vi ? 'sel' : '') + '" data-sact="vgo" data-i="' + i + '">' + esc(layout.views[i].title || 'Twarz') + '</button>'; }).join('') + '</div>';
  }
  function setPane() {
    var c = SET.cat, v = V() && !V().page ? V() : layout.views[faces()[0]], h = '';
    if (c === 'ha') {
      var n = Object.keys(S).length, ok = !$('status') || $('status').classList.contains('hidden');
      var reg = window.PANEL && PANEL.reg ? PANEL.reg() : { areas: [], name: '' };
      h = sgroup([srow('Home Assistant<small>' + esc(reg.name || 'Dom') + ' · ' + n + ' urządzeń i encji</small>', ok ? '<b class="g">W użyciu</b>' : '<b class="r">Brak połączenia</b>'), srow('Aktualizacje', 'Na żywo'), srow('Pomieszczenia', String(reg.areas.length))],
        'Panel działa wewnątrz Home Assistanta i korzysta z jego logowania, więc nie trzeba się tu nigdzie logować. Pomieszczenia, sceny i kamery pochodzą z Home Assistanta (Ustawienia → Obszary).');
    } else if (c === 'faces') {
      h = sgroup([srow('<a>Dostosuj twarze</a>', '›', ' data-sact="gal"', 'link')], 'Galeria twarzy: dodawaj, usuwaj i zmieniaj ich kolory i widżety. Galerię otwiera też przytrzymanie tła na ekranie głównym.') + sgroup(layout.views.map(function (x, i) {
        if (x.page) return '';
        return '<div class="sr ed"><input class="sinp" data-sin="vname" data-i="' + i + '" value="' + esc(x.title || ('Twarz ' + (i + 1))) + '"><button class="sbtn' + (i === vi ? ' on' : '') + '" data-sact="vgo" data-i="' + i + '">' + (i === vi ? 'Pokazana' : 'Pokaż') + '</button><button class="sbtn" data-sact="vup" data-i="' + i + '">▲</button><button class="sbtn red" data-sact="vdel" data-i="' + i + '">Usuń</button></div>';
      }), 'Twarze zmieniasz przesunięciem palca w bok albo kropkami na dole ekranu.', 'TWOJE TWARZE') +
        sgroup([srow('<a>＋ Pusta twarz</a>', '', ' data-sact="vadd" data-k="empty"', 'link'), srow('<a>＋ Twarz z zegarem</a>', '', ' data-sact="vadd" data-k="clock"', 'link'), srow('<a>＋ Kopia obecnej twarzy</a>', '', ' data-sact="vadd" data-k="copy"', 'link')], '', 'DODAJ');
    } else if (c === 'bg') {
      h = '<div class="sg-h">TWARZ</div>' + faceSel() + '<div class="sg-h">TAPETA</div><div class="swatch2">' + Object.keys(BG).map(function (k) {
        return '<button data-sact="bg" data-k="' + k + '" class="' + ((v.background || BG.turkus) === BG[k] ? 'sel' : '') + '"><i style="background:' + BG[k] + '"></i><span>' + BGN[k] + '</span></button>';
      }).join('') + '</div><div class="sg-f">Tapeta jest osobna dla każdej twarzy. Strony kafli i ekran Dom używają tapety twarzy, z której je otworzysz.</div>';
    } else if (c === 'grid') {
      h = '<div class="sg-h">TWARZ</div>' + faceSel() + '<div class="sg-h">KOLUMNY</div><div class="segs2">' + [3, 4, 5, 6, 7, 8].map(function (n) { return '<button class="' + ((v.columns || 5) === n ? 'sel' : '') + '" data-sact="cols" data-v="' + n + '">' + n + '</button>'; }).join('') + '</div>' +
        '<div class="sg-h">WYSOKOŚĆ WIERSZY</div><div class="segs2"><button class="' + (v.rowSizes ? 'sel' : '') + '" data-sact="rows" data-v="hv">Ostatni niski (HomeView)</button><button class="' + (!v.rowSizes ? 'sel' : '') + '" data-sact="rows" data-v="eq">Równe</button></div>' +
        sgroup([srow('<a>Edytuj kafle na ekranie</a>', '›', ' data-sact="edit"', 'link')], 'Kafle przestawiasz, powiększasz i usuwasz w trybie edycji: przytrzymaj kafel na ekranie.', ' ');
    } else if (c === 'pages') {
      h = sgroup(layout.views.map(function (x, i) {
        if (!x.page) return '';
        return '<div class="sr ed"><input class="sinp" data-sin="vname" data-i="' + i + '" value="' + esc(x.title || x.id) + '"><button class="sbtn" data-sact="pgo" data-i="' + i + '">Otwórz</button><button class="sbtn red" data-sact="vdel" data-i="' + i + '">Usuń</button></div>';
      }), 'Podstrony z kaflami otwierają się z kafla (np. Energia, BMW, Mazda). Pozostałe strony (Dom, Światła, Drzwi i okna, Baterie, Alarm, System) Panel buduje sam.', 'PODSTRONY Z KAFLAMI') +
        sgroup([srow('<a>＋ Pusta podstrona</a>', '', ' data-sact="padd" data-k="empty"', 'link'), srow('<a>＋ Samochód</a>', '', ' data-sact="padd" data-k="car"', 'link'), srow('<a>＋ Energia (Octopus)</a>', '', ' data-sact="padd" data-k="energy"', 'link')], '', 'DODAJ');
    } else if (c === 'display') {
      var d = layout.display || {};
      var cm = colorMode(), km = kioskMode();
      h = sgroup([['auto', 'Automatyczne'], ['normal', 'Standardowe'], ['vivid', 'Żywe'], ['vivid2', 'Bardzo żywe']].map(function (o) { return srow(o[1], cm === o[0] ? '<b style="color:#0a84ff">✓</b>' : '', ' data-sact="colors" data-k="' + o[0] + '"', 'link'); }),
        'Ustawienie tylko dla tego ekranu. Automatyczne włącza żywe kolory na tabletach z Androidem, których ekrany pokazują kolory bledziej niż komputer lub iPad.', 'KOLORY NA TYM EKRANIE') +
        sgroup([['auto', 'Automatyczny'], ['on', 'Włączony'], ['off', 'Wyłączony']].map(function (o) { return srow(o[1], km === o[0] ? '<b style="color:#0a84ff">✓</b>' : '', ' data-sact="kiosk" data-k="' + o[0] + '"', 'link'); }),
          'Tryb kiosku chowa pasek boczny Home Assistanta, gdy Panel jest otwarty – Panel zajmuje cały ekran. Po przejściu do innego dashboardu pasek wraca. Automatyczny włącza go na tabletach z Androidem.', 'TRYB KIOSKU NA TYM EKRANIE') +
        sgroup([srow('Ogranicz ruch', stoggle(d.reduceMotion, 'rm'))], 'Kafle nie drżą przy układaniu, a ekrany otwierają się bez animacji.') +
        sgroup([srow('<a>Wygaszacz i zegar nocny</a>', '›', ' data-scat="ambient"', 'link')]);
    } else if (c === 'ambient') {
      h = PANEL.ambPane ? PANEL.ambPane() : '';
    } else if (c === 'lang') {
      var cur = (window.I18N && I18N.lang) || 'pl';
      h = sgroup([['pl', 'Polski'], ['en', 'English']].map(function (o) { return srow('<span translate="no">' + o[1] + '</span>', cur === o[0] ? '<b style="color:#0a84ff">✓</b>' : '', ' data-sact="lang" data-k="' + o[0] + '"', 'link'); }),
        'Język jest zapamiętywany osobno na każdym ekranie (tablecie lub przeglądarce). Nazwy urządzeń i pomieszczeń pochodzą z Home Assistanta i nie są tłumaczone.', 'JĘZYK / LANGUAGE');
    } else if (c === 'launcher') {
      var n2 = (layout.launcher && layout.launcher.items || []).length;
      h = sgroup([srow('Ikony i widżety', n2 ? String(n2) : 'domyślne'), srow('<a>Edytuj menu</a>', '›', ' data-sact="lnedit"', 'link'), srow('<a class="r">Przywróć domyślne menu</a>', '', ' data-sact="lnreset"', 'link')],
        'Menu otwierasz przesunięciem palca w górę od dołu ekranu. Przytrzymaj ikonę, żeby usuwać, przestawiać i dodawać ikony.');
    } else if (c === 'about') {
      h = '<div class="about"><div class="alogo">Panel</div><b>Twój dom na ścianie.</b><small>Wersja ' + VERSION + '</small></div>' +
        sgroup([srow('Dane', 'Home Assistant'), srow('Tablety', 'odświeżają się same po zmianach')], 'Panel to App dla Home Assistanta. Układ zapisuje się w pliku layout.json w udziale addon_configs/local_panel.') +
        sgroup([srow('Przesuń w bok', 'następna twarz'), srow('Przesuń od dołu w górę', 'menu aplikacji'), srow('Dotknij kafla', 'otwiera jego stronę'), srow('Przytrzymaj kafel', 'edycja układu'), srow('Przytrzymaj urządzenie', 'okno urządzenia')], '', 'GESTY') +
        sgroup([srow('<a class="r">Przywróć układ domyślny</a>', '', ' data-sact="reset"', 'link')], 'Obecny układ zostaje w kopii i wraca przyciskiem „Cofnij” w trybie edycji.');
    } else if (c === 'privacy') {
      h = sgroup([srow('Twój dom zostaje w Twoim domu.', '')], 'Panel łączy się tylko z Twoim Home Assistantem, w Twojej sieci. Nie wysyła nic na zewnątrz i nie ma żadnych kont ani licencji.') +
        sgroup([srow('Tylko te', '')], 'Światła, przełączniki, wentylatory, rolety, zamki (otwieranie zawsze z potwierdzeniem), termostaty, głośniki i telewizory, odkurzacze, sceny, skrypty, alarm (z kodem, jeśli jest ustawiony) i aktualizacje (z potwierdzeniem).', 'CO TEN TABLET MOŻE ZROBIĆ PRZEZ PANEL');
    }
    return h;
  }
  function renderSettings(keepScroll) {
    var el = $('set'); if (!el) return;
    var pane = el.querySelector('.set-r'), sc = keepScroll && pane ? pane.scrollTop : 0;
    var q = SET.q.toLowerCase();
    var cats = SET_CATS.map(function (g) {
      var rows = g.filter(function (c) { return !q || c[1].toLowerCase().indexOf(q) >= 0; }).map(function (c) {
        var val = c[0] === 'lang' ? (EN ? 'English' : 'Polski') : c[0] === 'ha' ? (!$('status') || $('status').classList.contains('hidden') ? 'Połączono' : 'Rozłączono') : '';
        return '<div class="sc' + (SET.cat === c[0] ? ' sel' : '') + '" data-scat="' + c[0] + '">' + sicon(c[3], c[2]) + '<span>' + c[1] + '</span><small>' + val + '</small></div>';
      });
      return rows.length ? '<div class="sg">' + rows.join('') + '</div>' : '';
    }).join('');
    el.classList.toggle('det', !!SET.det);
    el.innerHTML = '<div class="set-h"><button class="xbtn sback" data-sback>‹</button><button class="xbtn" data-sx>✕</button><b class="set-t1">Ustawienia</b><b class="set-t2">' + esc(catName(SET.cat)) + '</b><span class="pclock"></span></div>' +
      '<div class="set-l"><input class="ssearch" data-sin="q" placeholder="Szukaj" value="' + esc(SET.q) + '">' +
      '<div class="sg prof"><i class="plogo">P</i><span><b>Panel</b><small>Twój dom na ścianie</small></span></div>' + cats +
      '<div class="sg-f">Ustawienia Panelu. Pomieszczenia i sceny Twojego domu ustawiasz w Home Assistant.</div></div>' +
      '<div class="set-r">' + setPane() + '</div>';
    if (sc) el.querySelector('.set-r').scrollTop = sc;
    if (PANEL.tickClock) PANEL.tickClock();
  }
  function settings(cat) {
    if (cat) SET.cat = cat;
    SET.det = !!cat;
    var el = $('set'); el.classList.remove('hidden');
    renderSettings();
  }
  function closeSettings() { $('set').classList.add('hidden'); $('set').innerHTML = ''; }
  (function () {
    var el = $('set');
    el.addEventListener('click', function (ev) {
      var t = ev.target;
      if (t.closest('[data-sx]')) return closeSettings();
      if (t.closest('[data-sback]')) { SET.det = false; return renderSettings(); }
      var cc = t.closest('[data-scat]'); if (cc) { SET.cat = cc.getAttribute('data-scat'); SET.det = true; return renderSettings(); }
      var a = t.closest('[data-sact]'); if (!a) return;
      var k = a.getAttribute('data-sact'), i = +a.getAttribute('data-i');
      var R = function () { renderSettings(true); };
      if (k === 'vgo') { vi = i; navStack = []; build(); R(); }
      else if (k === 'pgo') { closeSettings(); navStack = [faces()[0]]; vi = i; build(); }
      else if (k === 'vup') { if (i < 1) return; change(function () { var l = layout.views; l.splice(i - 1, 0, l.splice(i, 1)[0]); if (vi === i) vi--; else if (vi === i - 1) vi++; }); R(); }
      else if (k === 'vdel') {
        if (faces().length < 2 && !layout.views[i].page) return toast('Musi zostać co najmniej jedna twarz');
        if (!confirm('Usunąć „' + (layout.views[i].title || 'twarz') + '”? Przycisk „Cofnij” w trybie edycji ją przywróci.')) return;
        change(function () { layout.views.splice(i, 1); navStack = []; if (vi >= layout.views.length || vi === i) vi = faces()[0] || 0; else if (vi > i) vi--; }); R();
      } else if (k === 'vadd') {
        var kk = a.getAttribute('data-k'), v = V(), n;
        if (kk === 'copy') { n = JSON.parse(JSON.stringify(v)); n.title = (v.title || 'Twarz') + ' (kopia)'; n.tiles.forEach(function (x) { x.id = uid(); }); delete n.page; }
        else if (kk === 'clock') n = { title: 'Zegar', columns: 1, background: BG.noc, tiles: [{ id: uid(), type: 'analog_clock', w: 1, h: 1 }] };
        else n = { title: 'Nowa twarz', columns: 5, tiles: [] };
        n.id = 'v' + uid();
        change(function () { layout.views.push(n); vi = layout.views.length - 1; }); R();
      } else if (k === 'padd') {
        var pk = a.getAttribute('data-k');
        var add = function (title, tiles) { var n = { id: 'p' + uid(), page: true, title: title, columns: 4, tiles: tiles || [] }; change(function () { layout.views.push(n); }); R(); toast('Dodano podstronę „' + title + '”'); };
        if (pk === 'empty') return add('Nowa podstrona');
        if (pk === 'energy') return add('Energia', energyTemplate());
        openPop(function () {
          var tr = Object.keys(S).filter(function (e) { return e.indexOf('device_tracker.') === 0; });
          return '<h2>Które auto?<button class="x" data-close>×</button></h2><div class="small" style="margin-bottom:10px">Wybierz lokalizację auta – panel dobierze jego encje po nazwie.</div>' +
            tr.map(function (e) { return '<div class="lrow pick" data-pact="car" data-e="' + e + '"><span>' + entLabel(e) + '</span><span>›</span></div>'; }).join('');
        }, { static: true, cls: 'editor', acts: { car: function (el2) { var e = el2.getAttribute('data-e'), q = e.split('.')[1].replace(/_device_tracker$/, ''), nm = attr(e, 'friendly_name') || q; closePop(); add(nm, carTemplate(q, nm)); } } });
      }
      else if (k === 'bg') { change(function () { V().background = BG[a.getAttribute('data-k')]; }); R(); }
      else if (k === 'cols') { change(function () { V().columns = +a.getAttribute('data-v'); }); R(); }
      else if (k === 'rows') { change(function () { if (a.getAttribute('data-v') === 'eq') delete V().rowSizes; else V().rowSizes = [1, 1, 1, 0.52]; }); R(); }
      else if (k === 'edit') { closeSettings(); navStack = []; if (V().page) { vi = faces()[0]; build(); } enterEdit(); }
      else if (k === 'kiosk') { try { localStorage.setItem('panel.kiosk', a.getAttribute('data-k')); } catch (e) { /* */ } applyKiosk(); R(); }
      else if (k === 'colors') { try { localStorage.setItem('panel.colors', a.getAttribute('data-k')); } catch (e) { /* */ } applyColors(); R(); }
      else if (k.indexOf('amb-') === 0) { if (PANEL.ambAct && PANEL.ambAct(a)) R(); }
      else if (k === 'gal') { closeSettings(); if (PANEL.openGallery) PANEL.openGallery(); }
      else if (k === 'lang') { if (window.I18N) I18N.set(a.getAttribute('data-k')); }
      else if (k === 'rm') { change(function () { layout.display = Object.assign({}, layout.display, { reduceMotion: !(layout.display && layout.display.reduceMotion) }); }, false); applyDisplay(); R(); }
      else if (k === 'lnedit') { closeSettings(); if (PANEL.openLauncher) PANEL.openLauncher(true); }
      else if (k === 'lnreset') { change(function () { delete layout.launcher; }, false); toast('Przywrócono domyślne menu'); R(); }
      else if (k === 'reset') {
        if (!confirm('Przywrócić układ domyślny? Obecny można potem przywrócić przyciskiem „Cofnij”.')) return;
        api('layout/default').then(function (d) { change(function () { layout = normalize(d); vi = 0; }); R(); });
      }
    });
    var onIn = function (ev) {
      var t = ev.target, k = t.getAttribute('data-sin'); if (!k) return;
      if (k === 'q') { if (ev.type !== 'input') return; SET.q = t.value; var pos = t.selectionStart; renderSettings(true); var n = $('set').querySelector('.ssearch'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) { /* */ } } }
      else if (k === 'vname' && ev.type === 'change') { var i = +t.getAttribute('data-i'); change(function () { layout.views[i].title = t.value; }, false); }
    };
    el.addEventListener('input', onIn); el.addEventListener('change', onIn);
  })();
  // kolory per ekran (localStorage): auto = żywe na Androidzie
  function colorMode() { try { return localStorage.getItem('panel.colors') || 'auto'; } catch (e) { return 'auto'; } }
  function applyColors() {
    var m = colorMode(), eff = m === 'auto' ? (/Android/i.test(navigator.userAgent) ? 'vivid' : 'normal') : m, h = document.documentElement;
    h.classList.toggle('vivid', eff === 'vivid'); h.classList.toggle('vivid2', eff === 'vivid2');
  }
  applyColors();
  // tryb kiosku: Panel (w iframe HA, ta sama domena) chowa pasek boczny HA, tylko na czas, gdy jest otwarty
  function kioskMode() { try { return localStorage.getItem('panel.kiosk') || 'auto'; } catch (e) { return 'auto'; } }
  function kioskOn() { var m = kioskMode(); return m === 'on' || (m === 'auto' && /Android/i.test(navigator.userAgent)); }
  var KCSS = 'ha-sidebar{display:none!important}ha-drawer{--mdc-drawer-width:0px!important;--ha-sidebar-width:0px!important}';
  function haMain() {
    try {
      if (window.parent === window) return null;
      var ha = window.parent.document.querySelector('home-assistant');
      return ha && ha.shadowRoot && ha.shadowRoot.querySelector('home-assistant-main');
    } catch (e) { return null; }
  }
  function haMainRoot() { var m = haMain(); return m && m.shadowRoot; }
  function applyKiosk() {
    var m = haMain(), r = m && m.shadowRoot; if (!r) return false;
    var st = r.getElementById('panel-kiosk'), on = kioskOn();
    if (on && !st) { st = document.createElement('style'); st.id = 'panel-kiosk'; st.textContent = KCSS; r.appendChild(st); }
    else if (!on && st) st.parentNode.removeChild(st);
    // HA 2026: szerokość paska to zmienna --ha-sidebar-width na home-assistant-main
    if (on) { m.style.setProperty('--ha-sidebar-width', '0px', 'important'); m.style.setProperty('--ha-top-app-bar-width', '100%', 'important'); }
    else { m.style.removeProperty('--ha-sidebar-width'); m.style.removeProperty('--ha-top-app-bar-width'); }
    return true;
  }
  function clearKiosk() {
    var m = haMain(), r = m && m.shadowRoot, st = r && r.getElementById('panel-kiosk');
    if (st) st.parentNode.removeChild(st);
    if (m) { m.style.removeProperty('--ha-sidebar-width'); m.style.removeProperty('--ha-top-app-bar-width'); }
  }
  (function () { var n = 0, t = setInterval(function () { if (applyKiosk() && ++n > 3) { clearInterval(t); setInterval(applyKiosk, 5000); } }, 700); })();
  window.addEventListener('pagehide', clearKiosk); window.addEventListener('unload', clearKiosk);
  function applyDisplay() { document.body.classList.toggle('reduce-motion', !!(layout.display && layout.display.reduceMotion)); }

  // zegary
  setInterval(function () {
    var n = new Date();
    tiles.forEach(function (t) {
      if (t.ty.seconds) dirty.add(t);
      else if ((t.ty.ticks || t.ty.minute) && n.getSeconds() === 0) dirty.add(t);
    });
    schedule();
  }, 1000);
  window.addEventListener('resize', function () { clearTimeout(window.__rz); window.__rz = setTimeout(build, 250); });

  // ---------- połączenie ----------
  function connect() {
    var es = new EventSource('api/events'), last = Date.now();
    var setStatus = function (ok, txt) { var el = $('status'); el.textContent = txt || 'Brak połączenia z Home Assistant'; el.classList.toggle('hidden', ok); };
    es.addEventListener('snapshot', function (e) { last = Date.now(); S = JSON.parse(e.data); setStatus(true); all = true; schedule(); if (PANEL.hook) PANEL.hook(null); });
    es.addEventListener('registry', function () { if (PANEL.loadRegistry) PANEL.loadRegistry(); });
    es.addEventListener('state', function (e) { last = Date.now(); var d = JSON.parse(e.data); if (d.s) S[d.id] = d.s; else delete S[d.id]; onState(d.id); });
    es.addEventListener('status', function (e) { last = Date.now(); var d = JSON.parse(e.data); setStatus(d.connected, d.connected ? '' : 'Serwer panelu nie ma połączenia z HA'); });
    es.addEventListener('layout', function (e) { var d = {}; try { d = JSON.parse(e.data); } catch (x) { /* stary serwer */ } if (d.by !== CLIENT) loadLayout(); });
    es.addEventListener('ping', function () { last = Date.now(); });
    es.addEventListener('remote', function (e) { try { if (PANEL.remote) PANEL.remote.run(JSON.parse(e.data)); } catch (x) { /* */ } });
    es.onopen = function () {
      last = Date.now();
      // nowa wersja Panelu na serwerze → przeładuj stronę (raz na wersję)
      api('version').then(function (d) {
        if (!d || !d.version || d.version === VERSION) return;
        var k = 'panel.reloadFor'; try { if (sessionStorage.getItem(k) === d.version) return; sessionStorage.setItem(k, d.version); } catch (e) { /* */ }
        location.reload();
      }).catch(function () { /* stary serwer */ });
    };
    es.onerror = function () { setStatus(false); };
    var guard = setInterval(function () { if (Date.now() - last > 60000) { clearInterval(guard); es.close(); connect(); } }, 10000);
  }
  function loadLayout() {
    return api('layout').then(function (l) { layout = normalize(l); if (!layout.views.length) layout.views.push({ id: 'v0', title: 'Dom', columns: 5, tiles: [] }); applyDisplay(); build(); })
      .catch(function (e) { toast('Nie mogę wczytać układu: ' + e.message); });
  }
  // ---------- interfejs dla ekranów (screens.js) ----------
  window.PANEL = {
    st: st, stv: stv, num: num, attr: attr, bad: bad, esc: esc, pl: pl, plural: plural, ids: function () { return Object.keys(S); },
    call: call, control: control, toast: toast, openPop: openPop, closePop: closePop, moreInfo: moreInfo, api: api, imgSrc: imgSrc,
    TR: TR, DC_TR: DC_TR, T: T, DAYS: DAYS, MON: MON, MSH: MSH,
    layout: function () { return layout; }, openPage: openPage, hasPage: function (id) { return (layout.views || []).some(function (v) { return v.id === id && v.page; }); },
    editing: function () { return edit; }, popupOpen: function () { return !!popup; },
    settings: settings, change: change, VERSION: VERSION, faces: faces, setFace: function (i) { vi = i; navStack = []; edit = false; build(); },
    BG: BG, BGN: BGN, SCHEMA: SCHEMA, place: place, build: build, renderStatic: renderStatic, uid: uid, vi: function () { return vi; },
    enterEdit: enterEdit, exitEdit: exitEdit, tileMenu: tileMenu, typePicker: typePicker, addTile: addTile, undo: undo, refreshPop: refreshPop,
    save: function () { save(); }, setLayout: function (l) { layout = normalize(l); save(); }, fitInfo: function () { return FIT; }, select: select, SIZES: SIZES,
    DSH: DSH, LOC: LOC, mark: mark, mobileBat: mobileBat, redraw: function () { all = true; schedule(); }
  };
  loadLayout().then(connect);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { all = true; schedule(); } });
})();
