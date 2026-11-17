/* Panel 0.7 – twarze jak w Rehome: galeria, „Dodaj twarz”, edytor STYL/WIDŻETY i twarze specjalne. ES5. */
(function () {
  var P = window.PANEL; if (!P) return;
  var esc = P.esc, st = P.st, stv = P.stv, attr = P.attr;
  var EN = !!(window.I18N && I18N.en), LOC = EN ? 'en-GB' : 'pl-PL';
  var MONN = EN ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    : ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  var DAY1 = EN ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['N', 'P', 'W', 'Ś', 'C', 'P', 'S'];
  var DSHU = EN ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] : ['NDZ', 'PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB'];
  function $(id) { return document.getElementById(id); }
  function ids(dom) { return P.ids().filter(function (e) { return e.split('.')[0] === dom; }); }
  function fname(e) { return attr(e, 'friendly_name') || e; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(d) { return d.getHours() + ':' + pad(d.getMinutes()); }
  function L() { return P.layout(); }
  function cur() { return L().views[P.vi()]; }
  function overlay(id, cls) {
    var el = $(id);
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
    el.className = cls; return el;
  }

  // ---------- wybór encji „automatycznie” ----------
  function firstWeather() { return ids('weather').sort(function (a, b) { return (b === 'weather.pogoda') - (a === 'weather.pogoda') || (b === 'weather.home') - (a === 'weather.home'); })[0]; }
  function firstClimate() { var c = ids('climate'); return c.indexOf('climate.termostat') >= 0 ? 'climate.termostat' : c[0]; }
  function cameras() {
    var all = ids('camera').filter(function (e) { return !P.bad(stv(e)); });
    var med = all.filter(function (e) { return /_medium_resolution_channel$/.test(e); });
    var rest = all.filter(function (e) { return !/_(high|medium|low)_resolution_channel/.test(e) && !/_package_camera/.test(e); });
    return med.concat(rest);
  }
  function camName(e) { return fname(e).replace(/\s*(Medium|High|Low) resolution channel$/i, '').replace(/\s*(średnia|wysoka|niska) rozdzielczość.*$/i, ''); }
  function lightsOn() { return ids('light').filter(function (e) { return stv(e) === 'on'; }); }

  // ---------- zdjęcia (twarz Zdjęcia i kafel Zdjęcie) ----------
  var PH = null, PHL = null;
  function photos(cb) {
    if (PH) return cb(PH);
    if (!PHL) PHL = P.api('photos').then(function (l) { PH = l || []; return PH; }).catch(function () { PH = []; return PH; });
    PHL.then(cb);
  }
  function photoFor(v, n) {
    var album = (v.opts && v.opts.album) || 'all', cams = cameras().map(function (e) { return 'api/camera/' + e + '?t=' + Math.floor(Date.now() / 30000); });
    var list = album === 'cameras' ? cams : album === 'images' ? (PH || []) : (PH || []).concat(cams);
    return list.length ? list[(n || 0) % list.length] : '';
  }
  function clockBlock(v, small) {
    var d = new Date();
    return '<div class="fclock' + (small ? ' small' : '') + '"><div class="ft">' + hm(d) + '</div></div>';
  }
  function upNext() {
    var best = null;
    ids('calendar').forEach(function (e) {
      var s = attr(e, 'start_time'); if (!s) return; var d = new Date(String(s).replace(' ', 'T'));
      if (isNaN(d) || d < new Date(Date.now() - 864e5)) return;
      if (!best || d < best.d) best = { d: d, m: attr(e, 'message') || fname(e) };
    });
    return best;
  }

  var FK = P.FK = {};
  // --- Zdjęcia ---
  FK.photos = {
    html: function (v, stat, n) {
      var o = v.opts || {}, w = o.widgets || { temp: true, date: true, next: true, home: true }, small = o.clock === 'small', d = new Date();
      var src = photoFor(v, n || 0), wx = firstWeather(), a = (st(wx) || {}).attributes || {}, nx = upNext(), on = lightsOn().length;
      var chips = [];
      if (w.date) chips.push('<span>' + P.DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + P.MON[d.getMonth()] + '</span>');
      if (w.temp && a.temperature != null) chips.push('<span>' + FI('cloud', '#fff') + P.pl(a.temperature, 0) + '°</span>');
      if (w.next && nx) chips.push('<span>' + FI('cal', '#fff') + esc(nx.m) + ' · ' + (nx.d.toDateString() === d.toDateString() ? hm(nx.d) : P.DSH[nx.d.getDay()] + ' ' + hm(nx.d)) + '</span>');
      if (w.home) chips.push('<span>' + FI('bulb', '#fff') + on + ' ' + (EN ? 'on' : P.plural(on, 'światło', 'światła', 'świateł')) + '</span>');
      return '<div class="fphoto"' + (src ? ' style="background-image:url(\'' + src + '\')"' : '') + '>' + (src ? '' : '<div class="fempty">' + FI('photo', 'rgba(255,255,255,.6)') + '<b>Brak zdjęć</b><small>Dodaj zdjęcia do folderu www w Home Assistant</small></div>') + '</div>' +
        '<div class="fshade"></div>' + clockBlock(v, small) + (chips.length ? '<div class="fchips' + (small ? ' small' : '') + '">' + chips.join('') + '</div>' : '');
    },
    mount: function (el, v) {
      var n = 0, every = ((v.opts && v.opts.every) || 5) * 60000, draw = function () { el.innerHTML = FK.photos.html(v, false, n); };
      photos(draw); draw();
      var t1 = setInterval(draw, 30000), t2 = setInterval(function () { n++; draw(); }, every);
      el.addEventListener('click', function () { n++; draw(); });
      return function () { clearInterval(t1); clearInterval(t2); };
    }
  };
  // --- Pogoda ---
  var COND = { 'clear-night': 'Bezchmurnie', sunny: 'Słonecznie', partlycloudy: 'Częściowe zachmurzenie', cloudy: 'Pochmurno', rainy: 'Deszcz', pouring: 'Ulewa', lightning: 'Burza', 'lightning-rainy': 'Burza z deszczem', snowy: 'Śnieg', 'snowy-rainy': 'Deszcz ze śniegiem', hail: 'Grad', fog: 'Mgła', windy: 'Wietrznie', 'windy-variant': 'Wietrznie', exceptional: 'Nietypowo' };
  var FC = {};
  function sky(cond, night) {
    if (night) return 'linear-gradient(180deg,#071030 0%,#13245a 60%,#28407a 100%)';
    if (/rain|pour|light|snow|hail|fog/.test(cond) || cond === 'cloudy') return 'linear-gradient(180deg,#56677b 0%,#7a8b9f 55%,#a3b1c2 100%)';
    return 'linear-gradient(180deg,#2f7fd6 0%,#4d9be6 55%,#9fd0f7 100%)';
  }
  FK.weather = {
    html: function (v) {
      var e = (v.opts && v.opts.weather) || firstWeather(), s = st(e), a = (s && s.attributes) || {}, cond = s ? s.state : '', night = stv('sun.sun') === 'below_horizon', d = new Date();
      var f = (FC[e] || [])[0] || {}, set = attr('sun.sun', 'next_setting'), rise = attr('sun.sun', 'next_rising');
      var sunT = night ? rise : set, sd = sunT ? new Date(sunT) : null;
      return '<div class="fwx" style="background:' + sky(cond, night) + '"><div class="fwx-cl c1"></div><div class="fwx-cl c2"></div>' +
        '<div class="fwx-top"><span>' + FI('cloud', '#fff') + esc(COND[cond] || cond || '–') + (f.temperature != null ? ' &nbsp;H:' + Math.round(f.temperature) + '° L:' + Math.round(f.templow != null ? f.templow : f.temperature) + '°' : '') + '</span><b>' + hm(d) + '</b></div>' +
        '<div class="fwx-big">' + (a.temperature != null ? Math.round(a.temperature) + '°' : '–') + '</div>' +
        '<div class="fwx-bot">' + (sd ? '<div><small>' + (night ? 'Wschód słońca' : 'Zachód słońca') + '</small><b>' + hm(sd) + '</b></div>' : '') +
        (a.wind_speed != null ? '<div><small>Wiatr</small><b>' + Math.round(a.wind_speed) + ' ' + esc(a.wind_speed_unit || 'km/h') + '</b></div>' : '') +
        (a.humidity != null ? '<div><small>Wilgotność</small><b>' + a.humidity + '%</b></div>' : '') +
        (a.pressure != null ? '<div><small>Ciśnienie</small><b>' + Math.round(a.pressure) + ' ' + esc(a.pressure_unit || 'hPa') + '</b></div>' : '') + '</div></div>';
    },
    mount: function (el, v) {
      var e = (v.opts && v.opts.weather) || firstWeather(), draw = function () { el.innerHTML = FK.weather.html(v); };
      if (e) P.api('forecast?entity=' + encodeURIComponent(e)).then(function (d) { FC[e] = d || []; draw(); }).catch(function () {});
      draw(); var t = setInterval(draw, 30000);
      return function () { clearInterval(t); };
    }
  };
  // --- Kalendarz ---
  var EVS = null;
  FK.calendar = {
    html: function (v) {
      var d = new Date(), wk = '', off = EN ? d.getDay() : (d.getDay() + 6) % 7, s0 = new Date(d); s0.setDate(d.getDate() - off);
      for (var i = 0; i < 7; i++) { var x = new Date(s0); x.setDate(s0.getDate() + i); wk += '<div class="' + (x.toDateString() === d.toDateString() ? 'today' : '') + '"><small>' + DAY1[x.getDay()] + '</small><b>' + x.getDate() + '</b></div>'; }
      var evs = (EVS || []).filter(function (e) { return new Date(e.end || e.start) >= new Date(d.getFullYear(), d.getMonth(), d.getDate()); }).slice(0, 7);
      var body = EVS === null ? '<div class="fcal-none">Wczytuję…</div>' : !evs.length ? '<div class="fcal-none">Brak wydarzeń</div>' : evs.map(function (e) {
        var sd = new Date(e.allDay ? e.start + 'T00:00' : e.start), today = sd.toDateString() === d.toDateString();
        return '<div class="fcal-ev"><i></i><div><b>' + esc(e.summary) + '</b><small>' + (today ? 'Dziś' : P.DAYS[sd.getDay()] + ', ' + sd.getDate() + ' ' + P.MON[sd.getMonth()]) + (e.allDay ? '' : ' · ' + hm(sd)) + '</small></div></div>';
      }).join('');
      return '<div class="fcal"><div class="fcal-h"><b>‹ ' + MONN[d.getMonth()] + '</b><span>' + hm(d) + '</span></div><div class="fcal-wk">' + wk + '</div><div class="fcal-list">' + body + '</div></div>';
    },
    mount: function (el, v) {
      var draw = function () { el.innerHTML = FK.calendar.html(v); };
      var load = function () { var c = ids('calendar'); if (!c.length) { EVS = []; return draw(); } P.api('calendar?days=21&ids=' + c.join(',')).then(function (l) { EVS = l || []; draw(); }).catch(function () { EVS = []; draw(); }); };
      load(); draw(); var t = setInterval(draw, 30000), t2 = setInterval(load, 600000);
      return function () { clearInterval(t); clearInterval(t2); };
    }
  };
  // --- Flow (spokojne, rozmyte kształty) ---
  var FLOW = { fiolet: ['#5b3fc4', '#7ee0b0', '#7fb6ff', '#f3a6ff'], niebo: ['#1f5fbf', '#8de2ff', '#b6a6ff', '#7cf0c8'], turkus: ['#1f7a6e', '#ffe08a', '#8fe3ff', '#b9ffb0'], pomarancz: ['#c2491c', '#ffd27a', '#ff8fb1', '#ffb36b'] };
  FK.flow = {
    html: function (v) {
      var c = FLOW[(v.opts && v.opts.palette) || 'fiolet'] || FLOW.fiolet, d = new Date();
      return '<div class="fflow" style="background:' + c[0] + '"><i style="background:' + c[1] + '"></i><i style="background:' + c[2] + '"></i><i style="background:' + c[3] + '"></i><i style="background:' + c[1] + '"></i><i style="background:' + c[2] + '"></i></div>' +
        '<div class="fflow-t"><b>' + hm(d) + '</b><small>' + P.DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + P.MON[d.getMonth()] + '</small></div>';
    },
    mount: function (el, v) { var draw = function () { el.innerHTML = FK.flow.html(v); }; draw(); var t = setInterval(function () { var b = el.querySelector('.fflow-t b'); if (b) b.textContent = hm(new Date()); }, 15000); return function () { clearInterval(t); }; }
  };
  // --- Analogowy ---
  FK.analog = {
    svg: function (v) {
      var n = new Date(), s = n.getSeconds(), m = n.getMinutes() + s / 60, h = (n.getHours() % 12) + m / 60, out = '';
      [[12, 0], [3, 90], [6, 180], [9, 270]].forEach(function (k) { var a = k[1] * Math.PI / 180; out += '<text x="' + (500 + 360 * Math.sin(a)).toFixed(1) + '" y="' + (500 - 360 * Math.cos(a)).toFixed(1) + '" text-anchor="middle" dominant-baseline="central" class="anum">' + k[0] + '</text>'; });
      var hand = function (deg, len, w, col, tail) { return '<line x1="500" y1="' + (500 + (tail || 0)) + '" x2="500" y2="' + (500 - len) + '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" transform="rotate(' + deg.toFixed(2) + ' 500 500)"/>'; };
      var sec = !(v.opts && v.opts.seconds === false);
      return '<svg viewBox="0 0 1000 1000" class="fan-svg">' + out + hand(h * 30, 210, 26, '#fff') + hand(m * 6, 330, 18, '#fff') + (sec ? hand(s * 6, 370, 6, '#ff3b30', 60) : '') + '<circle cx="500" cy="500" r="16" fill="' + (sec ? '#ff3b30' : '#fff') + '"/></svg>';
    },
    html: function (v) { var d = new Date(); return '<div class="fan">' + FK.analog.svg(v) + '<div class="fan-d">' + DSHU[d.getDay()] + ' <b>' + d.getDate() + '</b></div></div>'; },
    mount: function (el, v) { el.innerHTML = FK.analog.html(v); var t = setInterval(function () { var s = el.querySelector('.fan-svg'); if (s) s.outerHTML = FK.analog.svg(v); }, 1000); return function () { clearInterval(t); }; }
  };
  // --- Zegar cyfrowy ---
  FK.clock = {
    html: function (v) { var d = new Date(); return '<div class="fdig' + (v.opts && v.opts.style === 'thin' ? ' thin' : '') + '"><b>' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '</b><small>' + P.DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + P.MON[d.getMonth()] + '</small></div>'; },
    mount: function (el, v) { var draw = function () { el.innerHTML = FK.clock.html(v); }; draw(); var t = setInterval(draw, 10000); return function () { clearInterval(t); }; }
  };
  // --- Kamery ---
  FK.cameras = {
    html: function (v, stat) {
      var c = cameras().slice(0, 9), n = c.length <= 1 ? 1 : c.length <= 4 ? 2 : 3;
      if (!c.length) return '<div class="fcams none">Brak kamer w Home Assistant</div>';
      return '<div class="fcams" style="grid-template-columns:repeat(' + n + ',1fr)">' + c.map(function (e) { return '<div data-cam="' + e + '"><img src="api/camera/' + e + '?t=' + Math.floor(Date.now() / (stat ? 60000 : 1000)) + '" alt=""><span>' + esc(camName(e)) + '</span></div>'; }).join('') + '</div>';
    },
    mount: function (el, v) {
      el.innerHTML = FK.cameras.html(v);
      var t = setInterval(function () {
        if (document.hidden) return;
        Array.prototype.forEach.call(el.querySelectorAll('[data-cam]'), function (d) { var e = d.getAttribute('data-cam'), n = new Image(); n.onload = function () { var i = d.querySelector('img'); if (i) i.src = n.src; }; n.src = 'api/camera/' + e + '?t=' + Date.now(); });
      }, 3000);
      el.addEventListener('click', function (ev) { var d = ev.target.closest('[data-cam]'); if (d && P.T.camera) P.T.camera.tap({ entity: d.getAttribute('data-cam'), name: camName(d.getAttribute('data-cam')) }); });
      return function () { clearInterval(t); };
    }
  };

  // ---------- nowe kafle: data z kalendarzem miesiąca, pogoda teraz, zdjęcie ----------
  P.T.date_cal = {
    ticks: true,
    render: function () {
      var d = new Date(), y = d.getFullYear(), m = d.getMonth(), first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate(), cells = '';
      first = (first + 6) % 7; // od poniedziałku
      for (var i = 0; i < first; i++) cells += '<i></i>';
      for (var k = 1; k <= dim; k++) cells += '<i class="' + (k === d.getDate() ? 'td' : '') + '">' + k + '</i>';
      var hd = EN ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['P', 'W', 'Ś', 'C', 'P', 'S', 'N'];
      return '<div class="dc-top"><b class="dc-d">' + DSHU[d.getDay()] + '</b><b class="dc-n">' + d.getDate() + '</b><span>' + MONN[m] + '</span></div><div class="dc-g">' + hd.map(function (x) { return '<i class="h">' + x + '</i>'; }).join('') + cells + '</div>';
    }
  };
  P.T.weather_now = {
    deps: function (c) { return [c.weather || firstWeather()]; },
    render: function (c) {
      var e = c.weather || firstWeather(), s = st(e), a = (s && s.attributes) || {};
      return '<div class="wn-ic">' + FI(s && /clear|sunny/.test(s.state) ? 'sun' : 'cloud', '#fff') + '</div><div class="wn-t">' + (a.temperature != null ? Math.round(a.temperature) + '°' : '–') + '</div><div class="small">' + esc(COND[s ? s.state : ''] || '') + '</div>';
    },
    tap: function (c) { P.moreInfo(c.weather || firstWeather()); }
  };
  P.T.photo = {
    noPress: false,
    render: function (c, t) {
      // własne zdjęcie (wgrane, z www albo encja image.) ma pierwszeństwo przed albumem
      if (c.image) {
        return '<div class="ph-img" style="background-image:url(\'' + P.imgSrc(c.image) + '\');background-size:' + (c.fit === 'contain' ? 'contain' : 'cover') + '"></div>' +
          (c.name ? '<div class="shade"></div><div class="lbl"><span class="big">' + esc(c.name) + '</span></div>' : '');
      }
      var src = photoFor({ opts: { album: c.album || 'images' } }, t && t.n || 0); return src ? '<div class="ph" style="background-image:url(\'' + src + '\')"></div>' : '<div class="ph-none">' + FI('photo', 'rgba(255,255,255,.7)') + '<small>Brak zdjęć</small></div>'; },
    init: function (c, t) { t.n = 0; photos(function () { P.mark(t); }); t.timer = setInterval(function () { t.n++; P.mark(t); }, 5 * 60000); },
    tap: function (c, t) {
      if (c.image) { P.openPop(function () { return '<h2>' + esc(c.name || 'Zdjęcie') + '<button class="x" data-close>×</button></h2><img class="ph-full" src="' + P.imgSrc(c.image) + '" alt="">'; }, { static: true }); return; }
      t.n++; P.mark(t);
    },
    deps: function (c) { return [/^image\./.test(c.image || '') ? c.image : null]; }
  };
  P.SCHEMA.date_cal = { label: 'Data i kalendarz', desc: 'Duża data i kalendarz miesiąca', def: { w: 2, h: 2 }, fields: [] };
  P.SCHEMA.weather_now = { label: 'Pogoda teraz', def: { w: 1, h: 1 }, fields: [['weather', 'Pogoda', 'entity', ['weather']]] };
  P.SCHEMA.photo = { label: 'Zdjęcie', desc: 'Własne zdjęcie (wgrane z telefonu lub komputera) albo zdjęcia z folderu www', def: { w: 1, h: 1, album: 'images', fit: 'cover' }, fields: [['image', 'Własne zdjęcie', 'image'], ['name', 'Podpis (opcjonalnie)', 'text'], ['fit', 'Dopasowanie', 'select', ['cover|Wypełnij kafel', 'contain|Pokaż całe zdjęcie']], ['album', 'Album (gdy nie ma własnego zdjęcia)', 'select', ['images|Obrazy', 'all|Wszystkie', 'cameras|Kamery']]] };

  // ---------- szablony twarzy (Dodaj twarz) ----------
  function tile(type, extra) { var d = JSON.parse(JSON.stringify((P.SCHEMA[type] || {}).def || {})); return Object.assign({ id: P.uid(), type: type }, d, extra || {}); }
  function devTile(list, name) { return tile('devices', { name: name || '', items: list.map(function (e) { return { entity: e }; }) }); }
  function sceneList() { return ids('scene').concat(ids('script')).filter(function (e) { return !P.bad(stv(e)); }); }
  var TPL = [
    { id: 'photos', name: 'Zdjęcia', kind: 'photos', opts: { clock: 'large', album: 'all', every: 5, widgets: { temp: true, date: true, next: true, home: true } } },
    { id: 'home_modular', name: 'Dom modułowy', bg: 'turkus', columns: 4, tiles: function () {
      var l = ids('light').slice(0, 3), sc = sceneList()[0];
      return [tile('thermostat', { entity: firstClimate(), name: 'Termostat', w: 2, h: 2 }), tile('clock_weather', { weather: firstWeather(), w: 2, h: 1 })]
        .concat(sc ? [devTile([sc])] : []).concat(l.map(function (e) { return devTile([e]); })).slice(0, 7);
    } },
    { id: 'modular', name: 'Modułowa', bg: 'grafit', columns: 4, tiles: function () { return [tile('date_cal', { w: 2, h: 2 }), tile('analog_clock', { w: 2, h: 1 }), tile('weather_now', { weather: firstWeather() }), tile('lights')]; } },
    { id: 'home_modular_plus', name: 'Dom modułowy plus', bg: 'niebo', columns: 5, tiles: function () {
      var cam = cameras()[0], sc = sceneList().slice(0, 2), l = ids('light').slice(0, 2);
      return [tile('clock_weather', { weather: firstWeather(), w: 2, h: 1 })].concat(cam ? [tile('camera', { entity: cam, name: camName(cam) })] : [])
        .concat([tile('thermostat', { entity: firstClimate(), name: 'Termostat' }), tile('photo'), tile('weather_now', { weather: firstWeather() }), tile('date_cal', { w: 1, h: 1 }), tile('alarm', { entity: ids('alarm_control_panel')[0] }), tile('lights')])
        .concat(sc.map(function (e) { return devTile([e]); })).concat(l.map(function (e) { return devTile([e]); }));
    } },
    { id: 'weather', name: 'Pogoda', kind: 'weather' },
    { id: 'calendar', name: 'Kalendarz', kind: 'calendar' },
    { id: 'flow', name: 'Flow', kind: 'flow', opts: { palette: 'fiolet' } },
    { id: 'analog', name: 'Analogowy', kind: 'analog', opts: { seconds: true } },
    { id: 'clock', name: 'Zegar', kind: 'clock' },
    { id: 'home_camera', name: 'Kamery', kind: 'cameras' }
  ];
  function tplById(id) { return TPL.filter(function (t) { return t.id === id; })[0]; }
  function makeFace(t) {
    var v = { id: 'f' + P.uid(), title: t.name, faceType: t.id, columns: t.columns || 5, tiles: [] };
    if (t.kind) { v.kind = t.kind; v.opts = JSON.parse(JSON.stringify(t.opts || {})); }
    else { v.tiles = t.tiles(); v.background = P.BG[t.bg] || P.BG.turkus; }
    return v;
  }
  function faceName(v) { var t = v.faceType && tplById(v.faceType); return v.title || (t ? t.name : 'Twarz'); }

  // ---------- podgląd ----------
  function preview(v, w) {
    var box = P.renderStatic(v, 1280, 800), s = w / 1280;
    var wrap = document.createElement('div'); wrap.className = 'pvw'; wrap.style.width = w + 'px'; wrap.style.height = Math.round(800 * s) + 'px';
    box.style.transform = 'scale(' + s + ')'; wrap.appendChild(box); return wrap;
  }
  function vw() { var f = P.fitInfo(); return window.innerWidth / (f.s || 1); }
  function vh() { var f = P.fitInfo(); return window.innerHeight / (f.s || 1); }

  // ================== GALERIA ==================
  var G = null;
  P.openGallery = function (focus) {
    if (P.editing()) P.exitEdit();
    var F = P.faces(); if (!F.length) return;
    G = { idx: Math.max(0, F.indexOf(focus != null ? focus : P.vi())) };
    renderGallery();
  };
  function renderGallery() {
    var F = P.faces(), el = overlay('fgal', 'fgal');
    var cw = Math.round(Math.min(760, vw() * 0.62, (vh() - 230) * 1.6));
    el.innerHTML = '<button class="fx" data-g="close">✕</button><div class="fg-title" id="fgt"></div><div class="fg-car" id="fgc"><div class="fg-pad"></div></div>' +
      '<div class="fg-bar"><button class="fpill" data-g="custom">Dostosuj</button><button class="fround" data-g="add" title="Dodaj twarz">' + FI('plus', '#fff') + '</button><button class="fround" data-g="del" title="Usuń twarz">' + FI('bin', '#fff') + '</button></div>';
    var car = $('fgc');
    F.forEach(function (i, k) {
      var c = document.createElement('div'); c.className = 'fg-card'; c.setAttribute('data-k', k); c.setAttribute('data-vi', i);
      c.appendChild(preview(L().views[i], cw)); car.appendChild(c);
    });
    var pad2 = document.createElement('div'); pad2.className = 'fg-pad'; car.appendChild(pad2);
    car.style.setProperty('--cw', cw + 'px');
    setTimeout(function () { var c = car.querySelectorAll('.fg-card')[G.idx]; if (c) car.scrollLeft = c.offsetLeft - (car.clientWidth - c.offsetWidth) / 2; galSel(); }, 0);
    car.addEventListener('scroll', function () { clearTimeout(G.st); G.st = setTimeout(galSel, 60); });
  }
  function galSel() {
    var car = $('fgc'); if (!car) return;
    var mid = car.scrollLeft + car.clientWidth / 2, best = 0, bd = 1e9;
    Array.prototype.forEach.call(car.querySelectorAll('.fg-card'), function (c, k) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = k; } c.classList.toggle('act', false); });
    G.idx = best; var cc = car.querySelectorAll('.fg-card')[best]; if (cc) cc.classList.add('act');
    var v = L().views[P.faces()[best]]; $('fgt').textContent = v ? faceName(v).toUpperCase() : '';
  }
  function closeGallery() { var el = $('fgal'); if (el) { el.className = 'fgal hidden'; el.innerHTML = ''; } G = null; }
  document.addEventListener('click', function (ev) {
    var g = ev.target.closest && ev.target.closest('#fgal [data-g], #fgal .fg-card'); if (!g || !G) return;
    var F = P.faces(), k = g.getAttribute('data-g');
    if (g.classList.contains('fg-card')) {
      var kk = +g.getAttribute('data-k');
      if (kk !== G.idx) { var car = $('fgc'); car.scrollTo ? car.scrollTo({ left: g.offsetLeft - (car.clientWidth - g.offsetWidth) / 2, behavior: 'smooth' }) : (car.scrollLeft = g.offsetLeft); return; }
      var i = +g.getAttribute('data-vi'); closeGallery(); P.setFace(i); return;
    }
    if (k === 'close') { closeGallery(); return; }
    if (k === 'custom') { var vi2 = F[G.idx]; closeGallery(); P.setFace(vi2); openCustomize(vi2, null, -1); return; }
    if (k === 'add') { openAddFace(); return; }
    if (k === 'del') {
      if (F.length < 2) return P.toast('Musi zostać co najmniej jedna twarz');
      var vd = F[G.idx], nm = faceName(L().views[vd]);
      if (!confirm('Usunąć twarz „' + nm + '”? Przycisk „Cofnij” w trybie edycji ją przywróci.')) return;
      P.change(function () { L().views.splice(vd, 1); }, false);
      var F2 = P.faces(); P.setFace(F2[Math.min(G.idx, F2.length - 1)]); G.idx = Math.min(G.idx, F2.length - 1); renderGallery();
    }
  });

  // ================== DODAJ TWARZ ==================
  function openAddFace() {
    var el = overlay('fadd', 'fadd'), added = {};
    L().views.forEach(function (v) { if (v.faceType) added[v.faceType] = 1; });
    var tw = Math.round(Math.min(420, (vw() - 160) / 2));
    el.innerHTML = '<div class="fa-h"><button class="fx" data-fa="close">✕</button><b>Dodaj twarz</b></div><div class="fa-grid" id="fag"></div>';
    var g = $('fag');
    TPL.forEach(function (t) {
      var c = document.createElement('div'); c.className = 'fa-it' + (added[t.id] ? ' added' : ''); c.setAttribute('data-t', t.id);
      c.appendChild(preview(makeFace(t), tw));
      c.insertAdjacentHTML('beforeend', '<span>' + esc(t.name) + '</span>' + (added[t.id] ? '<em>✓ Dodano</em>' : ''));
      g.appendChild(c);
    });
  }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('#fadd [data-fa], #fadd .fa-it'); if (!a) return;
    if (a.getAttribute('data-fa') === 'close') { $('fadd').className = 'fadd hidden'; $('fadd').innerHTML = ''; return; }
    var t = tplById(a.getAttribute('data-t')); if (!t) return;
    var v = makeFace(t), F = P.faces(), at = G ? F[G.idx] + 1 : P.vi() + 1;
    P.change(function () { L().views.splice(at, 0, v); }, false);
    $('fadd').className = 'fadd hidden'; $('fadd').innerHTML = '';
    P.toast('Dodano twarz „' + t.name + '”');
    var F2 = P.faces(), ni = F2.indexOf(at); P.setFace(at);
    if (G) { G.idx = ni; renderGallery(); } else P.openGallery(at);
  });

  // ================== EDYTOR (Dostosuj) ==================
  var E = null;
  var CATS = [
    ['sug', 'Polecane', 'star'], ['lights', 'Światła', 'bulb'], ['climate', 'Klimat', 'thermo'], ['scenes', 'Sceny', 'sparkle'], ['rooms', 'Pomieszczenia', 'sofa'],
    ['security', 'Bezpieczeństwo', 'shield'], ['media', 'Media', 'music'], ['clock', 'Zegar', 'clock'], ['wxcal', 'Pogoda i kalendarz', 'cloud'], ['ha', 'Home Assistant', 'hagear'], ['other', 'Zdjęcia i inne', 'photo']
  ];
  function reg() { return P.reg ? P.reg() : { areas: [], ent: {} }; }
  function areaOf(e) { var r = reg(), a = r.ent[e]; var x = (r.areas || []).filter(function (z) { return z.id === a; })[0]; return x ? x.name : ''; }
  function catItems(k) {
    var it = [], add = function (label, sub, icon, cfg) { it.push({ label: label, sub: sub || '', icon: icon, cfg: cfg }); };
    var byRoom = function (dom, mk, icon) { ids(dom).filter(function (e) { return !P.bad(stv(e)); }).forEach(function (e) { var a = areaOf(e); add(fname(e), (a ? a + ' · ' : '') + (P.TR[stv(e)] || stv(e)), icon, mk(e), a); }); it.sort(function (a, b) { return a.sub.localeCompare(b.sub, 'pl') || a.label.localeCompare(b.label, 'pl'); }); };
    if (k === 'sug') {
      add('Pomieszczenia', 'otwiera ekran Dom', 'sofa', tile('rooms')); add('Światła (zbiorczo)', 'ile się świeci i gdzie', 'bulb', tile('lights'));
      if (firstClimate()) add('Termostat', fname(firstClimate()), 'thermo', tile('thermostat', { entity: firstClimate(), name: 'Termostat' }));
      if (ids('alarm_control_panel')[0]) add('Alarm', fname(ids('alarm_control_panel')[0]), 'shield', tile('alarm', { entity: ids('alarm_control_panel')[0] }));
      add('Zegar i pogoda', '', 'clock', tile('clock_weather', { weather: firstWeather() })); add('Drzwi i okna', '', 'door', tile('contacts'));
      add('Baterie', '', 'battery', tile('batteries')); add('Aktualizacje systemu', '', 'update', tile('updates')); add('Home Assistant', 'ustawienia HA', 'hagear', tile('ha'));
    } else if (k === 'lights') { add('Światła (zbiorczo)', 'ile się świeci i gdzie', 'bulb', tile('lights')); byRoom('light', function (e) { return devTile([e]); }, 'bulb'); }
    else if (k === 'climate') {
      byRoom('climate', function (e) { return tile('thermostat', { entity: e, name: fname(e) }); }, 'thermo');
      ids('sensor').filter(function (e) { return attr(e, 'device_class') === 'temperature' && !P.bad(stv(e)); }).forEach(function (e) { add(fname(e), (areaOf(e) ? areaOf(e) + ' · ' : '') + stv(e) + '°', 'thermo', tile('stat', { entity: e, name: fname(e), unit: '°', decimals: 1 })); });
      byRoom('fan', function (e) { return devTile([e]); }, 'fan');
    }
    else if (k === 'scenes') { byRoom('scene', function (e) { return devTile([e]); }, 'sparkle'); byRoom('script', function (e) { return devTile([e]); }, 'play'); }
    else if (k === 'rooms') {
      add('Pomieszczenia', 'otwiera ekran Dom', 'sofa', tile('rooms'));
      (reg().areas || []).forEach(function (a) {
        var l = P.ids().filter(function (e) { return reg().ent[e] === a.id && /^(light|switch|fan|cover|lock|scene)\./.test(e); }).slice(0, 4);
        if (l.length) add(a.name, l.length + ' ' + P.plural(l.length, 'urządzenie', 'urządzenia', 'urządzeń'), 'sofa', devTile(l, a.name));
      });
    }
    else if (k === 'security') {
      ids('alarm_control_panel').forEach(function (e) { add(fname(e), 'Alarm', 'shield', tile('alarm', { entity: e })); });
      add('Drzwi i okna', '', 'door', tile('contacts'));
      byRoom('lock', function (e) { return devTile([e]); }, 'lock');
      cameras().forEach(function (e) { add(camName(e), 'Kamera', 'camera', tile('camera', { entity: e, name: camName(e) })); });
    }
    else if (k === 'media') byRoom('media_player', function (e) { return devTile([e]); }, 'speaker');
    else if (k === 'clock') { add('Zegar i pogoda', '', 'clock', tile('clock_weather', { weather: firstWeather() })); add('Zegar analogowy', '', 'clock', tile('analog_clock')); add('Data i kalendarz', '', 'cal', tile('date_cal')); }
    else if (k === 'wxcal') {
      ids('weather').forEach(function (e) { add(fname(e), 'Pogoda teraz', 'cloud', tile('weather_now', { weather: e })); add(fname(e) + ' + zegar', 'Zegar i pogoda', 'clock', tile('clock_weather', { weather: e })); });
      add('Data i kalendarz', '', 'cal', tile('date_cal'));
      add('Kosze', 'z kalendarza', 'bin', tile('bins'));
    }
    else if (k === 'ha') { add('Home Assistant', 'ustawienia HA', 'hagear', tile('ha')); add('Aktualizacje systemu', '', 'update', tile('updates')); add('Baterie', '', 'battery', tile('batteries')); add('Sieć', '', 'net', tile('network')); }
    else if (k === 'other') { add('Zdjęcie', 'z folderu www', 'photo', tile('photo')); add('Samochód', '', 'bolt', tile('car')); add('Energia', '', 'bolt', tile('energy')); add('Mapa', '', 'globe', tile('map')); add('Wykres', '', 'gauge', tile('graph')); add('Lista', '', 'pages', tile('list')); add('Wartość', '', 'gauge', tile('stat')); }
    return it;
  }

  function openCustomize(i, tab, sel) {
    if (i == null) i = P.vi();
    P.setFace(i);
    var v = L().views[i];
    E = { vi: i, snap: JSON.stringify(L()), tab: tab || (v.kind === 'photos' ? 'clock' : 'style'), sel: sel != null && sel >= 0 ? sel : -1, cat: null, q: '' };
    if (E.tab === 'widgets' && v.kind && v.kind !== 'photos') E.tab = 'style';
    renderEd();
  }
  P.openCustomize = function (i, tab, sel) { if (P.editing()) P.exitEdit(); openCustomize(i, tab, sel); };
  function tabsFor(v) {
    if (v.kind === 'photos') return [['clock', 'ZEGAR'], ['widgets', 'WIDŻETY'], ['album', 'ALBUM']];
    if (v.kind) return [['style', 'STYL']];
    return [['style', 'STYL'], ['widgets', 'WIDŻETY']];
  }
  function pills(list, curv, act) { return '<div class="fe-pills">' + list.map(function (o) { return '<button class="' + (String(o[0]) === String(curv) ? 'on' : '') + (o[2] ? ' dis' : '') + '" data-e="' + act + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  function edV() { return L().views[E.vi]; }
  function setOpt(k, val) { P.change(function () { var v = edV(); v.opts = v.opts || {}; v.opts[k] = val; }, false); P.build(); renderEd(); }
  function sidePanel(v) {
    var h = '';
    if (E.tab === 'style') {
      h += '<div class="fe-h">NAZWA</div><input class="fe-inp" data-ein="title" value="' + esc(faceName(v)) + '">';
      if (!v.kind) {
        h += '<div class="fe-h">TAPETA</div><div class="fe-sw">' + Object.keys(P.BG).map(function (k) { return '<button data-e="bg" data-v="' + k + '" class="' + ((v.background || P.BG.turkus) === P.BG[k] ? 'on' : '') + '" title="' + esc(P.BGN[k]) + '"><i style="background:' + P.BG[k] + '"></i></button>'; }).join('') + '</div>';
        h += '<div class="fe-h">KOLUMNY</div>' + pills([[4, '4'], [5, '5'], [6, '6'], [7, '7']], v.columns || 5, 'cols');
        h += '<div class="fe-h">WIERSZE</div>' + pills([['eq', 'Równe'], ['hv', 'Ostatni niski']], v.rowSizes ? 'hv' : 'eq', 'rows');
        h += '<div class="fe-h">UKŁAD</div><button class="fe-btn" data-e="reset">↶ Przywróć układ</button>';
      } else if (v.kind === 'flow') h += '<div class="fe-h">KOLORY</div><div class="fe-sw">' + Object.keys(FLOW).map(function (k) { return '<button data-e="palette" data-v="' + k + '" class="' + (((v.opts || {}).palette || 'fiolet') === k ? 'on' : '') + '"><i style="background:linear-gradient(135deg,' + FLOW[k][0] + ',' + FLOW[k][2] + ')"></i></button>'; }).join('') + '</div>';
      else if (v.kind === 'analog') h += '<div class="fe-h">SEKUNDNIK</div>' + pills([['on', 'Pokaż'], ['off', 'Ukryj']], (v.opts || {}).seconds === false ? 'off' : 'on', 'secs');
      else if (v.kind === 'clock') h += '<div class="fe-h">CZCIONKA</div>' + pills([['bold', 'Wąska gruba'], ['thin', 'Cienka']], (v.opts || {}).style === 'thin' ? 'thin' : 'bold', 'cstyle');
      else if (v.kind === 'weather') h += '<div class="fe-h">POGODA</div>' + pills(ids('weather').map(function (e) { return [e, esc(fname(e))]; }), (v.opts || {}).weather || firstWeather(), 'wx');
      else if (v.kind === 'cameras') h += '<div class="fe-note">Twarz pokazuje do 9 kamer z Home Assistanta, odświeżanych co 3 s. Dotknij kamery, żeby ją powiększyć.</div>';
      else if (v.kind === 'calendar') h += '<div class="fe-note">Wydarzenia z wszystkich kalendarzy Home Assistanta na najbliższe 3 tygodnie.</div>';
    } else if (E.tab === 'clock') {
      h += '<div class="fe-h">ZEGAR</div>' + pills([['large', 'A Duży'], ['small', 'A Mały']], (v.opts || {}).clock === 'small' ? 'small' : 'large', 'clocksz');
    } else if (E.tab === 'album') {
      h += '<div class="fe-h">ŹRÓDŁO</div>' + pills([['all', 'Wszystkie zdjęcia'], ['images', 'Obrazy'], ['cameras', 'Kamery']], (v.opts || {}).album || 'all', 'album');
      h += '<div class="fe-h">ZMIANA ZDJĘCIA CO</div>' + pills([[1, '1 min'], [5, '5 min'], [15, '15 min'], [60, '1 h']], (v.opts || {}).every || 5, 'every');
      h += '<div class="fe-note">' + (PH ? PH.length : 0) + ' zdjęć w folderze www Home Assistanta (i w zdjęciach Panelu). Dotknij twarzy, żeby przejść do następnego zdjęcia.</div>';
    } else if (E.tab === 'widgets' && v.kind === 'photos') {
      var w = (v.opts || {}).widgets || { temp: true, date: true, next: true, home: true };
      h += '<div class="fe-h">WIDŻETY NA ZDJĘCIU</div>' + [['temp', 'Temperatura'], ['date', 'Data'], ['next', 'Najbliższe wydarzenie'], ['home', 'Dom (światła)']].map(function (o) { return '<button class="fe-row tg" data-e="pw" data-v="' + o[0] + '"><span>' + o[1] + '</span><i class="' + (w[o[0]] ? 'on' : '') + '"></i></button>'; }).join('');
    } else if (E.tab === 'widgets') {
      var c = v.tiles[E.sel];
      if (c) {
        var S = P.SIZES, cols = v.columns || 5, curK = ''; for (var k in S) if (S[k][0] === (c.w || 1) && S[k][1] === (c.h || 1)) curK = k;
        h += '<div class="fe-h">ROZMIAR</div>' + pills([['S', 'Mały'], ['W', 'Szeroki'], ['M', 'Średni'], ['L', 'Duży']].map(function (o) { return [o[0], o[1], S[o[0]][0] > cols]; }), curK, 'size');
        h += '<div class="fe-box"><div class="fe-row hd"><b>' + esc(((P.SCHEMA[c.type] || {}).label) || c.type) + '</b></div>';
        ((P.SCHEMA[c.type] || {}).fields || []).filter(function (f) { return f[2] === 'entity'; }).slice(0, 4).forEach(function (f) {
          h += '<button class="fe-row" data-e="cfg"><span>' + esc(f[1]) + '</span><small>' + (c[f[0]] ? esc(fname(c[f[0]])) : 'Automatycznie') + ' ›</small></button>';
        });
        h += '<button class="fe-row" data-e="cfg"><span>Wszystkie ustawienia kafla</span><small>›</small></button><button class="fe-row" data-e="swap"><span>Zamień na inny kafel</span><small>⇄</small></button></div>';
        h += '<button class="fe-btn red" data-e="rm">⊖ Usuń</button>';
      } else h += '<div class="fe-note">Dotknij kafla w podglądzie, żeby go wybrać. Kafle przestawiasz, przeciągając je palcem.</div>';
      h += '<div class="fe-h">' + (E.cat ? '<button class="fe-back" data-e="cat" data-v="">‹ ' + esc(CATS.filter(function (x) { return x[0] === E.cat; })[0][1]) + '</button>' : 'DODAJ WIDŻET') + '</div>';
      if (!E.cat) h += '<div class="fe-cats">' + CATS.map(function (x) { return '<button data-e="cat" data-v="' + x[0] + '">' + FI(x[2], '#fff') + '<span>' + x[1] + '</span></button>'; }).join('') + '</div>';
      else {
        var q = E.q.toLowerCase(), items = catItems(E.cat).filter(function (x) { return !q || (x.label + ' ' + x.sub).toLowerCase().indexOf(q) >= 0; });
        E.items = items;
        h += '<input class="fe-inp" data-ein="q" placeholder="Szukaj…" value="' + esc(E.q) + '"><div class="fe-list">' + (items.length ? items.slice(0, 150).map(function (x, n) {
          return '<button class="fe-row it" data-e="addit" data-v="' + n + '"><i>' + FI(x.icon, '#fff') + '</i><span><b translate="no">' + esc(x.label) + '</b><small translate="no">' + esc(x.sub) + '</small></span><em>＋</em></button>';
        }).join('') : '<div class="fe-note">Nic nie pasuje</div>') + '</div>';
      }
    }
    return h;
  }
  function renderEd() {
    var v = edV(); if (!v) return closeEd();
    var el = overlay('fed', 'fed'), tabs = tabsFor(v), sc = el.querySelector('.fe-side') ? el.querySelector('.fe-side').scrollTop : 0;
    if (!tabs.some(function (t) { return t[0] === E.tab; })) E.tab = tabs[0][0];
    var ap = v.appearance || 'auto';
    el.innerHTML = '<div class="fe-tabs">' + tabs.map(function (t) { return '<button class="' + (t[0] === E.tab ? 'on' : '') + '" data-e="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="fe-main"><div class="fe-pv" id="fepv"></div><div class="fe-side">' + sidePanel(v) + '</div></div>' +
      '<div class="fe-bot"><button class="fx" data-e="cancel">✕</button><button class="fpill fap" data-e="appear">' + FI('half', '#fff') + ' ' + ({ auto: 'Automatyczny', light: 'Jasny', dark: 'Ciemny' }[ap]) + '</button><button class="fok" data-e="ok">' + FI('check2', '#fff') + '</button></div>';
    var side = el.querySelector('.fe-side'); side.scrollTop = sc;
    var pvw = Math.round(Math.min(vw() - 470, (vh() - 200) * 1.6, 980));
    var pv = preview(v, Math.max(360, pvw)); $('fepv').appendChild(pv);
    if (E.tab === 'widgets' && !v.kind) {
      pv.classList.add('pick');
      Array.prototype.forEach.call(pv.querySelectorAll('.tile'), function (t) { if (+t.getAttribute('data-i') === E.sel) t.classList.add('fsel'); });
      bindPvDrag(pv, Math.max(360, pvw) / 1280);
    }
    document.body.classList.toggle('appear-light', ap === 'light'); document.body.classList.toggle('appear-dark', ap === 'dark');
  }
  // przeciąganie kafli w podglądzie (reszta sama się przepakowuje)
  function bindPvDrag(pv, s) {
    var d = null;
    pv.addEventListener('pointerdown', function (ev) {
      var t = ev.target.closest('.tile'); if (!t) return;
      d = { t: t, i: +t.getAttribute('data-i'), x: ev.clientX, y: ev.clientY, moved: false };
      try { pv.setPointerCapture(ev.pointerId); } catch (e) { /* */ } ev.preventDefault();
    });
    pv.addEventListener('pointermove', function (ev) {
      if (!d) return; var z = P.fitInfo().s || 1, dx = (ev.clientX - d.x) / z / s, dy = (ev.clientY - d.y) / z / s;
      if (Math.abs(dx) + Math.abs(dy) > 14 / s) { d.moved = true; d.t.classList.add('fdrag'); d.t.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; }
    });
    pv.addEventListener('pointerup', function (ev) {
      if (!d) return; var dd = d; d = null;
      if (!dd.moved) { E.sel = dd.i === E.sel ? -1 : dd.i; renderEd(); return; }
      dd.t.style.visibility = 'hidden'; var over = document.elementFromPoint(ev.clientX, ev.clientY); dd.t.style.visibility = '';
      var o = over && over.closest('.pv .tile'), to = o ? +o.getAttribute('data-i') : -1;
      if (to >= 0 && to !== dd.i) { P.change(function () { var l = edV().tiles, x = l.splice(dd.i, 1)[0]; l.splice(to, 0, x); }, false); E.sel = to; P.build(); }
      renderEd();
    });
  }
  function closeEd() { var el = $('fed'); if (el) { el.className = 'fed hidden'; el.innerHTML = ''; } E = null; }
  P.customizing = function () { return !!E; };
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('#fed [data-e]'); if (!a || !E) return;
    var k = a.getAttribute('data-e'), val = a.getAttribute('data-v'), v = edV();
    if (a.classList.contains('dis')) return;
    if (k === 'tab') { E.tab = val; E.cat = null; renderEd(); }
    else if (k === 'cancel') { var s = E.snap; closeEd(); P.setLayout(JSON.parse(s)); }
    else if (k === 'ok') { closeEd(); P.build(); P.toast('Zapisano twarz'); }
    else if (k === 'appear') { P.change(function () { var n = { auto: 'light', light: 'dark', dark: 'auto' }[v.appearance || 'auto']; if (n === 'auto') delete v.appearance; else v.appearance = n; }, false); P.build(); renderEd(); }
    else if (k === 'bg') { P.change(function () { v.background = P.BG[val]; }, false); P.build(); renderEd(); }
    else if (k === 'cols') { P.change(function () { v.columns = +val; }, false); P.build(); renderEd(); }
    else if (k === 'rows') { P.change(function () { if (val === 'eq') delete v.rowSizes; else { var r = P.place(v.tiles, v.columns || 5).rows; v.rowSizes = []; for (var x = 0; x < r; x++) v.rowSizes.push(x === r - 1 ? 0.52 : 1); } }, false); P.build(); renderEd(); }
    else if (k === 'reset') {
      if (!confirm('Przywrócić układ tej twarzy?')) return;
      var t = v.faceType && tplById(v.faceType);
      if (t && t.tiles) { P.change(function () { v.tiles = t.tiles(); v.columns = t.columns || 5; }, false); P.build(); renderEd(); }
      else P.api('layout/default').then(function (d) { var dv = (d.views || []).filter(function (x) { return x.id === v.id; })[0]; if (!dv) return P.toast('Ta twarz nie ma układu domyślnego'); P.change(function () { v.tiles = dv.tiles; v.columns = dv.columns; }, false); P.build(); renderEd(); });
    }
    else if (k === 'palette') setOpt('palette', val);
    else if (k === 'secs') setOpt('seconds', val === 'on');
    else if (k === 'cstyle') setOpt('style', val);
    else if (k === 'wx') setOpt('weather', val);
    else if (k === 'clocksz') setOpt('clock', val);
    else if (k === 'album') setOpt('album', val);
    else if (k === 'every') setOpt('every', +val);
    else if (k === 'pw') { var w = Object.assign({ temp: true, date: true, next: true, home: true }, (v.opts || {}).widgets); w[val] = !w[val]; setOpt('widgets', w); }
    else if (k === 'size') { var S = P.SIZES[val], c = v.tiles[E.sel]; P.change(function () { c.w = Math.min(S[0], v.columns || 5); c.h = S[1]; }, false); P.build(); renderEd(); }
    else if (k === 'rm') { P.change(function () { v.tiles.splice(E.sel, 1); }, false); E.sel = -1; P.build(); renderEd(); }
    else if (k === 'cfg') { if (P.vi() !== E.vi) P.setFace(E.vi); P.tileMenu(E.sel); watchPop(); }
    else if (k === 'swap') P.typePicker(function (type) { var c = v.tiles[E.sel]; P.closePop(); P.change(function () { v.tiles[E.sel] = Object.assign({ id: c.id, type: type }, JSON.parse(JSON.stringify(P.SCHEMA[type].def)), { w: c.w, h: c.h }); }, false); P.build(); renderEd(); P.tileMenu(E.sel); watchPop(); });
    else if (k === 'cat') { E.cat = val || null; E.q = ''; renderEd(); var sd = document.querySelector('.fe-side'); if (sd) sd.scrollTop = 0; }
    else if (k === 'addit') {
      var x = E.items && E.items[+val]; if (!x) return;
      var nc = JSON.parse(JSON.stringify(x.cfg)); nc.id = P.uid();
      var at = E.sel >= 0 ? E.sel + 1 : v.tiles.length;
      P.change(function () { v.tiles.splice(at, 0, nc); }, false); E.sel = at; P.build(); renderEd();
      P.toast('Dodano: ' + x.label);
    }
  });
  // po zamknięciu okna ustawień kafla odśwież podgląd edytora
  function watchPop() { var t = setInterval(function () { if (!E) return clearInterval(t); if (!P.popupOpen()) { clearInterval(t); P.build(); renderEd(); } }, 400); }
  document.addEventListener('input', function (ev) {
    var a = ev.target.closest && ev.target.closest('#fed [data-ein]'); if (!a || !E) return;
    var k = a.getAttribute('data-ein');
    if (k === 'q') { E.q = a.value; clearTimeout(E.qt); E.qt = setTimeout(function () { var pos = a.selectionStart; renderEd(); var n = document.querySelector('#fed [data-ein=q]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* */ } } }, 250); }
    else if (k === 'title') { var v = edV(), val = a.value; clearTimeout(E.tt); E.tt = setTimeout(function () { P.change(function () { v.title = val; }, false); }, 400); }
  });

  // nakładki 0.7 blokują gesty ekranu głównego (przytrzymanie, przesunięcie)
  var oldOpen = P.screenOpen;
  P.screenOpen = function () { return !!(G || E || ($('fadd') && $('fadd').className === 'fadd')) || (oldOpen ? oldOpen() : false); };
  photos(function () {});
  P.faceTemplates = TPL; P.makeFace = makeFace;
})();
