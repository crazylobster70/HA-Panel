/* Panel 0.7.2 – pełny ekran pogody: teraz, 24 godziny, 7 dni i szczegóły. ES5. */
(function () {
  var P = window.PANEL; if (!P) return;
  var esc = P.esc, st = P.st, stv = P.stv, attr = P.attr;
  var EN = !!(window.I18N && I18N.en);
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(d) { return d.getHours() + ':' + pad(d.getMinutes()); }
  var COND = { 'clear-night': 'Bezchmurnie', sunny: 'Słonecznie', partlycloudy: 'Częściowe zachmurzenie', cloudy: 'Pochmurno', rainy: 'Deszcz', pouring: 'Ulewa', lightning: 'Burza', 'lightning-rainy': 'Burza z deszczem', snowy: 'Śnieg', 'snowy-rainy': 'Deszcz ze śniegiem', hail: 'Grad', fog: 'Mgła', windy: 'Wietrznie', 'windy-variant': 'Wietrznie', exceptional: 'Nietypowo' };
  // ikona warunków: [nazwa, kolor]
  function ic(cond, night) {
    var m = {
      sunny: ['sun', '#ffd60a'], 'clear-night': ['moon', '#e5e5ea'], partlycloudy: [night ? 'cloud' : 'pcloud', night ? '#d1d1d6' : '#ffd60a'], cloudy: ['cloud', '#e5e5ea'],
      rainy: ['rain', '#64d2ff'], pouring: ['rain', '#0a84ff'], lightning: ['storm', '#ffd60a'], 'lightning-rainy': ['storm', '#ffd60a'], snowy: ['snow', '#fff'], 'snowy-rainy': ['snow', '#64d2ff'],
      hail: ['snow', '#d1d1d6'], fog: ['fog', '#d1d1d6'], windy: ['windy', '#e5e5ea'], 'windy-variant': ['windy', '#e5e5ea'], exceptional: ['info', '#ff9f0a']
    }[cond] || ['cloud', '#e5e5ea'];
    return FI(m[0], m[1], 'wic');
  }
  function sky(cond, night) {
    if (night) return 'linear-gradient(180deg,#0b1438 0%,#1b2b62 55%,#33467e 100%)';
    if (/rain|pour|light|snow|hail/.test(cond)) return 'linear-gradient(180deg,#4a5a6e 0%,#66778c 55%,#8796aa 100%)';
    if (cond === 'cloudy' || cond === 'fog') return 'linear-gradient(180deg,#5d7088 0%,#7f93ab 55%,#a4b5c8 100%)';
    return 'linear-gradient(180deg,#2a74cc 0%,#4a95e2 55%,#8cc6f4 100%)';
  }
  function isNight(d) {
    var r = attr('sun.sun', 'next_rising'), s = attr('sun.sun', 'next_setting');
    if (!r || !s) return d.getHours() < 7 || d.getHours() >= 18;
    r = new Date(r); s = new Date(s);
    // następny wschód przed następnym zachodem = teraz jest noc; dla przyszłych godzin przesuwamy o doby
    var t = d.getTime(), rise = r.getTime(), set = s.getTime();
    while (rise - 864e5 > t) rise -= 864e5; while (set - 864e5 > t) set -= 864e5;
    while (rise < t) rise += 864e5; while (set < t) set += 864e5;
    return rise < set;
  }
  function tempCol(t) { return t <= 0 ? '#5ac8fa' : t <= 8 ? '#64d2ff' : t <= 15 ? '#a3e15b' : t <= 22 ? '#ffd60a' : t <= 28 ? '#ff9f0a' : '#ff453a'; }
  function dir(b) { if (b == null) return ''; var D = EN ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] : ['Pn', 'Pn-Wsch', 'Wsch', 'Pd-Wsch', 'Pd', 'Pd-Zach', 'Zach', 'Pn-Zach']; return D[Math.round(((b % 360) + 360) % 360 / 45) % 8]; }
  function fmt(v, d) { return v == null || isNaN(v) ? '–' : P.pl(+v, d || 0); }

  var W = null;
  P.openWeather = function (entity) {
    var e = entity || P.ids().filter(function (x) { return x === 'weather.pogoda'; })[0] || P.ids().filter(function (x) { return x.indexOf('weather.') === 0; })[0];
    if (!e) return P.toast('Brak pogody w Home Assistant');
    var el = $('wxs'); if (!el) { el = document.createElement('div'); el.id = 'wxs'; document.body.appendChild(el); }
    el.className = 'wxs';
    W = { e: e, el: el, h: null, d: null };
    render();
    P.api('forecast?type=hourly&entity=' + encodeURIComponent(e)).then(function (x) { if (W) { W.h = x || []; render(); } }).catch(function () { if (W) { W.h = []; render(); } });
    P.api('forecast?type=daily&entity=' + encodeURIComponent(e)).then(function (x) { if (W) { W.d = x || []; render(); } }).catch(function () { if (W) { W.d = []; render(); } });
    W.t = setInterval(render, 60000);
  };
  function close() { if (!W) return; clearInterval(W.t); W.el.className = 'wxs hidden'; W.el.innerHTML = ''; W = null; }
  P.closeWeather = close;
  var oldOpen = P.screenOpen;
  P.screenOpen = function () { return !!W || (oldOpen ? oldOpen() : false); };

  function render() {
    if (!W) return;
    var s = st(W.e), a = (s && s.attributes) || {}, cond = s ? s.state : '', now = new Date(), night = isNight(now);
    var H = (W.h || []).filter(function (f) { return new Date(f.datetime).getTime() > now.getTime() - 3600e3; }).slice(0, 24);
    var D = (W.d || []).slice(0, 7);
    var today = D[0] || {}, h0 = H[0] || {};
    var sc = W.el.querySelector('.wx-main') ? W.el.querySelector('.wx-main').scrollTop : 0, hs = W.el.querySelector('.wx-hours') ? W.el.querySelector('.wx-hours').scrollLeft : 0;

    // 24 godziny
    var hours = W.h === null ? '<div class="wx-load">Wczytuję…</div>' : !H.length ? '<div class="wx-load">Brak prognozy godzinowej</div>' : H.map(function (f, i) {
      var d = new Date(f.datetime), pp = f.precipitation_probability;
      return '<div class="wx-h"><small>' + (i === 0 ? (EN ? 'Now' : 'Teraz') : pad(d.getHours())) + '</small>' + ic(f.condition, isNight(d)) +
        '<em>' + (pp >= 20 ? pp + '%' : '&nbsp;') + '</em><b>' + Math.round(f.temperature) + '°</b></div>';
    }).join('');
    // 7 dni z paskiem zakresu
    var lo = 99, hi = -99;
    D.forEach(function (f) { var l = f.templow != null ? f.templow : f.temperature; lo = Math.min(lo, l); hi = Math.max(hi, f.temperature); });
    var span = Math.max(1, hi - lo);
    var days = W.d === null ? '<div class="wx-load">Wczytuję…</div>' : !D.length ? '<div class="wx-load">Brak prognozy dziennej</div>' : D.map(function (f, i) {
      var d = new Date(f.datetime), l = f.templow != null ? f.templow : f.temperature, t = f.temperature, pp = f.precipitation_probability;
      var x1 = (l - lo) / span * 100, x2 = (t - lo) / span * 100;
      var cur = i === 0 && a.temperature != null ? '<i class="wx-dot" style="left:' + Math.max(0, Math.min(100, (a.temperature - lo) / span * 100)) + '%"></i>' : '';
      return '<div class="wx-d"><b class="wx-dn">' + (i === 0 ? (EN ? 'Today' : 'Dziś') : P.DAYS[d.getDay()].replace(/^./, function (c) { return c.toUpperCase(); })) + '</b>' +
        '<span class="wx-di">' + ic(f.condition, false) + (pp >= 20 ? '<em>' + pp + '%</em>' : '') + '</span>' +
        '<span class="wx-lo">' + Math.round(l) + '°</span><span class="wx-bar"><i style="left:' + x1 + '%;right:' + (100 - x2) + '%;background:linear-gradient(90deg,' + tempCol(l) + ',' + tempCol(t) + ')"></i>' + cur + '</span><span class="wx-hi">' + Math.round(t) + '°</span></div>';
    }).join('');
    // szczegóły
    var rise = attr('sun.sun', 'next_rising'), set = attr('sun.sun', 'next_setting');
    var sunTxt = night ? (rise ? hm(new Date(rise)) : '–') : (set ? hm(new Date(set)) : '–'), sunOther = night ? (set ? hm(new Date(set)) : '') : (rise ? hm(new Date(rise)) : '');
    var rainSum = 0; H.forEach(function (f) { rainSum += f.precipitation || 0; });
    var feels = a.apparent_temperature != null ? a.apparent_temperature : h0.apparent_temperature;
    var uv = h0.uv_index, uvTxt = uv == null ? '–' : uv < 3 ? 'Niski' : uv < 6 ? 'Umiarkowany' : uv < 8 ? 'Wysoki' : 'Bardzo wysoki';
    var card = function (icn, title, big, sub, extra) { return '<div class="wx-c">' + '<div class="wx-ct">' + FI(icn, 'rgba(255,255,255,.7)') + '<span>' + title + '</span></div><b>' + big + '</b>' + (extra || '') + '<small>' + (sub || '') + '</small></div>'; };
    var cards = [
      card('thermo', 'ODCZUWALNA', fmt(feels) + '°', feels != null && a.temperature != null ? (feels < a.temperature - 1 ? 'Wiatr sprawia, że jest chłodniej.' : feels > a.temperature + 1 ? 'Wilgotność sprawia, że jest cieplej.' : 'Podobna do rzeczywistej.') : ''),
      card('windy', 'WIATR', fmt(a.wind_speed != null ? a.wind_speed : h0.wind_speed) + ' <span class="u">' + esc(a.wind_speed_unit || 'km/h') + '</span>', (a.wind_gust_speed != null ? 'Porywy ' + fmt(a.wind_gust_speed) + ' ' + esc(a.wind_speed_unit || 'km/h') : '') + (a.wind_bearing != null ? ' · ' + dir(a.wind_bearing) : ''),
        a.wind_bearing != null ? '<i class="wx-arrow" style="transform:rotate(' + ((a.wind_bearing + 180) % 360) + 'deg)">' + FI('arrow', '#fff') + '</i>' : ''),
      card('drop', 'WILGOTNOŚĆ', fmt(a.humidity) + '%', a.dew_point != null ? 'Punkt rosy: ' + fmt(a.dew_point) + '°' : ''),
      card('rain', 'OPADY', fmt(rainSum, 1) + ' <span class="u">mm</span>', 'w ciągu 24 godzin'),
      card(night ? 'sun' : 'moon', night ? 'WSCHÓD SŁOŃCA' : 'ZACHÓD SŁOŃCA', sunTxt, sunOther ? (night ? 'Zachód: ' : 'Wschód: ') + sunOther : ''),
      card('gauge', 'CIŚNIENIE', fmt(a.pressure) + ' <span class="u">' + esc(a.pressure_unit || 'hPa') + '</span>', H.length > 3 && H[3].pressure != null && a.pressure != null ? (H[3].pressure < a.pressure - 1 ? 'Spada' : H[3].pressure > a.pressure + 1 ? 'Rośnie' : 'Stabilne') : ''),
      card('sun', 'INDEKS UV', uv == null ? '–' : fmt(uv), uvTxt),
      card('globe', 'WIDOCZNOŚĆ', a.visibility != null ? fmt(a.visibility) + ' <span class="u">' + esc(a.visibility_unit || 'km') + '</span>' : '–', a.cloud_coverage != null ? 'Zachmurzenie ' + a.cloud_coverage + '%' : '')
    ].join('');
    var place = (P.reg && P.reg().name) || '';
    W.el.style.background = sky(cond, night);
    W.el.innerHTML = '<button class="fx" data-wx="close">✕</button><div class="wx-time">' + hm(now) + '</div>' +
      '<div class="wx-main"><div class="wx-now"><span translate="no" class="wx-place">' + esc(place) + '</span><div class="wx-big">' + fmt(a.temperature) + '°</div>' +
      '<div class="wx-cond">' + esc(COND[cond] || cond || '–') + '</div>' +
      (today.temperature != null ? '<div class="wx-hl">Maks.: ' + Math.round(today.temperature) + '°  Min.: ' + Math.round(today.templow != null ? today.templow : today.temperature) + '°</div>' : '') + '</div>' +
      '<div class="wx-cards">' + cards + '</div>' +
      '<div class="wx-right"><div class="wx-box"><div class="wx-bt">' + FI('clock', 'rgba(255,255,255,.7)') + 'PROGNOZA GODZINOWA</div><div class="wx-hours">' + hours + '</div></div>' +
      '<div class="wx-box"><div class="wx-bt">' + FI('cal', 'rgba(255,255,255,.7)') + 'PROGNOZA NA 7 DNI</div>' + days + '</div></div></div>';
    var m = W.el.querySelector('.wx-main'); if (m) m.scrollTop = sc;
    var hh = W.el.querySelector('.wx-hours'); if (hh) hh.scrollLeft = hs;
  }
  document.addEventListener('click', function (ev) { if (W && ev.target.closest && ev.target.closest('[data-wx="close"]')) close(); });
  document.addEventListener('keydown', function (ev) { if (W && ev.key === 'Escape') close(); });
  // przesunięcie w prawo zamyka (jak strony)
  (function () {
    var sx, sy;
    document.addEventListener('pointerdown', function (ev) { if (W) { sx = ev.clientX; sy = ev.clientY; } }, true);
    document.addEventListener('pointerup', function (ev) { if (W && sx != null && ev.clientX - sx > 120 && Math.abs(ev.clientY - sy) < 60 && !ev.target.closest('.wx-hours')) close(); sx = null; }, true);
  })();

  // dotknięcie kafli i twarzy pogody otwiera ten ekran
  if (P.T.clock_weather) P.T.clock_weather.tap = function (c) { P.openWeather(c.weather); };
  if (P.T.weather_now) P.T.weather_now.tap = function (c) { P.openWeather(c.weather); };
  if (P.FK && P.FK.weather) {
    var m0 = P.FK.weather.mount;
    P.FK.weather.mount = function (el, v) { var off = m0(el, v); el.addEventListener('click', function () { P.openWeather((v.opts && v.opts.weather) || null); }); return off; };
  }
})();
