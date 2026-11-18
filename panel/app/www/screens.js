// Panel 0.5 – pełnoekranowe strony w stylu Rehome: Dom, Światła, Drzwi i okna, Baterie, Alarm, System
// oraz okno urządzenia (przytrzymanie). Korzysta z window.PANEL z app.js.
(function () {
  'use strict';
  var P = window.PANEL;
  var $ = function (id) { return document.getElementById(id); };
  var esc = P.esc, stv = P.stv, attr = P.attr, num = P.num, bad = P.bad, plural = P.plural;
  var REG = { name: '', areas: [], ent: {}, skip: {} };

  function loadRegistry() {
    return P.api('registry').then(function (r) { REG = r || REG; if (stack.length) render(true); if (P.redraw) P.redraw(); }).catch(function () {});
  }
  P.loadRegistry = loadRegistry;

  // ---------- ikony (24×24, linia) ----------
  var IC = {
    bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    power: '<path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
    fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 4-7 2 0 3 2 1 4l-3 3M14 12c4 0 7 1 7 4 0 2-2 3-4 1l-3-3M12 14c0 4-1 7-4 7-2 0-3-2-1-4l3-3M10 12c-4 0-7-1-7-4 0-2 2-3 4-1l3 3"/>',
    blinds: '<path d="M4 4h16M5 4v12M19 4v12M5 8h14M5 12h14M5 16h14M12 16v4"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    thermo: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 10v6"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    door: '<path d="M14 3H6v18h8M14 3l5 2v14l-5 2zM11 12h.01"/>',
    window: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
    motion: '<circle cx="13" cy="4" r="2"/><path d="M8 21l3-6 3 2v4M11 15l1-5-3 1-2 3M12 10l3 3h3"/>',
    tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/>',
    speaker: '<rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="14" r="3"/><circle cx="12" cy="7.5" r="1"/>',
    sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    camera: '<path d="M3 7h4l2-2h6l2 2h4v12H3z"/><circle cx="12" cy="13" r="3.5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
    shieldok: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2"/>',
    update: '<path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    home: '<path d="M4 11l8-7 8 7v9H4zM10 20v-5h4v5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    disk: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    net: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
    vacuum: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v2"/>',
    water: '<path d="M7 3h10v6H7zM12 9v3M8 21h8l-1-9H9z"/>',
    smoke: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8M12 8v8"/>',
    gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
    siren: '<path d="M7 18v-6a5 5 0 0 1 10 0v6M4 21h16M12 3v2M4.5 6.5 6 8M19.5 6.5 18 8"/>',
    play: '<path d="M7 4l13 8-13 8z"/>',
    pause: '<path d="M7 4h4v16H7zM13 4h4v16h-4z"/>',
    prev: '<path d="M18 5v14l-9-7zM6 5v14"/>',
    next: '<path d="M6 5v14l9-7zM18 5v14"/>',
    vol: '<path d="M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    car: '<path d="M3 16h18v-4l-3-1-3-4H9l-3 4-3 1z"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>'
  };
  function svg(name, cls) { if (window.FI && FI.has(name)) return FI(name, null, cls); return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (IC[name] || IC.power) + '</svg>'; }

  // ---------- opis encji: nazwa, ikona, stan, kolor ----------
  var areaName = function (id) { for (var i = 0; i < REG.areas.length; i++) if (REG.areas[i].id === id) return REG.areas[i].name; return ''; };
  function shortName(e, area) {
    var n = String(attr(e, 'friendly_name') || e.split('.')[1].replace(/_/g, ' '));
    var a = area || areaName(REG.ent[e]);
    if (a && n.toLowerCase().indexOf(a.toLowerCase() + ' ') === 0 && n.length > a.length + 2) n = n.slice(a.length + 1);
    return n.replace(/\s+(Contact|Kontakt)$/i, '').trim();
  }
  function rgbOf(e) {
    var c = attr(e, 'rgb_color');
    if (c && c.length === 3) { var m = Math.max(c[0], c[1], c[2]) || 1, k = 255 / m; return 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')'; }
    var kv = attr(e, 'color_temp_kelvin');
    if (kv) return kv < 3200 ? '#ffc864' : kv < 4500 ? '#ffe2a8' : '#f2f4ff';
    return '#ffd60a';
  }
  var DCI = { door: 'door', garage_door: 'door', window: 'window', opening: 'door', motion: 'motion', occupancy: 'motion', presence: 'motion', moisture: 'drop', smoke: 'smoke', gas: 'smoke', carbon_monoxide: 'smoke', lock: 'lock', sound: 'speaker', vibration: 'motion', tamper: 'shield', safety: 'shield', problem: 'bell' };
  var BIN_ON = { door: 'Otwarte', garage_door: 'Otwarta', window: 'Otwarte', opening: 'Otwarte', motion: 'Ruch', occupancy: 'Zajęte', presence: 'Obecność', moisture: 'Wyciek!', smoke: 'Dym!', gas: 'Gaz!', carbon_monoxide: 'Czad!', lock: 'Otwarty', sound: 'Dźwięk', vibration: 'Drgania', tamper: 'Naruszenie', safety: 'Niebezpieczeństwo', problem: 'Problem' };
  var BIN_OFF = { door: 'Zamknięte', garage_door: 'Zamknięta', window: 'Zamknięte', opening: 'Zamknięte', motion: 'Brak ruchu', occupancy: 'Wolne', presence: 'Brak', moisture: 'Sucho', smoke: 'OK', gas: 'OK', carbon_monoxide: 'OK', lock: 'Zamknięty', sound: 'Cisza', vibration: 'Spokój', tamper: 'OK', safety: 'OK', problem: 'OK' };
  var HVAC = { heat: 'Grzanie', cool: 'Chłodzenie', heat_cool: 'Auto', auto: 'Auto', dry: 'Osuszanie', fan_only: 'Wentylator', off: 'Wył.' };
  var ACT = { heating: 'Grzeje', cooling: 'Chłodzi', idle: 'Czeka', off: 'Wył.', drying: 'Osusza', fan: 'Wentyluje' };
  var MEDIA = { playing: 'Gra', paused: 'Pauza', idle: 'Bezczynny', off: 'Wył.', on: 'Wł.', standby: 'Czuwanie', buffering: 'Ładuje…' };
  function fmtNum(v, d) { return Number(v).toLocaleString(window.I18N && I18N.en ? 'en-GB' : 'pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d }); }

  function info(e, area) {
    var d = e.split('.')[0], v = stv(e), dc = attr(e, 'device_class'), o = { e: e, dom: d, name: shortName(e, area), icon: 'power', on: false, ac: '#30d158', txt: '', unav: bad(v), ctrl: false, alert: false };
    if (o.unav) o.txt = 'Brak odpowiedzi';
    if (d === 'light') {
      o.icon = 'bulb'; o.ctrl = true; o.on = v === 'on'; o.ac = rgbOf(e);
      if (!o.unav) o.txt = o.on ? (attr(e, 'brightness') != null ? Math.round(attr(e, 'brightness') / 2.55) + '%' : 'Wł.') : 'Wył.';
    } else if (d === 'switch' || d === 'input_boolean' || d === 'siren') {
      o.icon = d === 'siren' ? 'siren' : (dc === 'outlet' || /gniazd|wtycz|plug|socket/i.test(o.name) ? 'plug' : 'power'); o.ctrl = true; o.on = v === 'on'; o.ac = '#30d158';
      if (!o.unav) o.txt = o.on ? 'Wł.' : 'Wył.';
    } else if (d === 'fan') {
      o.icon = 'fan'; o.ctrl = true; o.on = v === 'on'; o.ac = '#64d2ff';
      if (!o.unav) o.txt = o.on ? (attr(e, 'percentage') != null ? attr(e, 'percentage') + '%' : 'Wł.') : 'Wył.';
    } else if (d === 'cover' || d === 'valve') {
      o.icon = d === 'valve' ? 'water' : 'blinds'; o.ctrl = true; o.on = v === 'open' || v === 'opening'; o.ac = '#5ac8fa';
      var pos = attr(e, 'current_position');
      if (!o.unav) o.txt = { open: pos != null && pos < 100 ? 'Otwarta ' + pos + '%' : 'Otwarta', closed: 'Zamknięta', opening: 'Otwiera się…', closing: 'Zamyka się…' }[v] || v;
    } else if (d === 'lock') {
      o.icon = v === 'locked' ? 'lock' : 'unlock'; o.ctrl = true; o.on = v !== 'locked' && !o.unav; o.alert = o.on; o.ac = '#ff9f0a';
      if (!o.unav) o.txt = { locked: 'Zamknięty', unlocked: 'Otwarty', locking: 'Zamykanie…', unlocking: 'Otwieranie…', jammed: 'Zablokowany!', open: 'Otwarty' }[v] || v;
    } else if (d === 'climate') {
      o.icon = 'thermo'; o.ctrl = true; o.on = v !== 'off' && !o.unav; o.ac = '#ff9f0a';
      var ct = attr(e, 'current_temperature'), ha = attr(e, 'hvac_action');
      if (!o.unav) o.txt = (ct != null ? fmtNum(ct, 1) + '° · ' : '') + (v === 'off' ? 'Wył.' : (ACT[ha] || HVAC[v] || v));
    } else if (d === 'media_player') {
      o.icon = dc === 'tv' || /tv|samsung|apple tv|shield/i.test(o.name) ? 'tv' : 'speaker'; o.ctrl = true; o.on = v === 'playing' || v === 'on'; o.ac = '#ff375f';
      if (!o.unav) o.txt = v === 'playing' && attr(e, 'media_title') ? attr(e, 'media_title') : (MEDIA[v] || v);
    } else if (d === 'vacuum' || d === 'lawn_mower') {
      o.icon = 'vacuum'; o.ctrl = true; o.on = v === 'cleaning' || v === 'mowing'; o.ac = '#30d158';
      if (!o.unav) o.txt = { cleaning: 'Sprząta', docked: 'W stacji', returning: 'Wraca', idle: 'Czeka', paused: 'Pauza', error: 'Błąd', mowing: 'Kosi' }[v] || v;
    } else if (d === 'humidifier' || d === 'water_heater') {
      o.icon = d === 'humidifier' ? 'drop' : 'water'; o.ctrl = true; o.on = v !== 'off' && !o.unav; o.ac = '#5ac8fa'; if (!o.unav) o.txt = P.TR[v] || v;
    } else if (d === 'binary_sensor') {
      o.icon = DCI[dc] || 'gauge'; o.on = v === 'on'; o.alert = o.on && /moisture|smoke|gas|carbon_monoxide|safety|tamper|problem/.test(dc || '');
      o.ac = dc === 'motion' || dc === 'occupancy' || dc === 'presence' ? '#bf5af2' : o.alert ? '#ff453a' : '#ff9f0a';
      if (!o.unav) o.txt = o.on ? (BIN_ON[dc] || 'Wł.') : (BIN_OFF[dc] || 'Wył.');
    } else if (d === 'sensor') {
      o.icon = dc === 'temperature' ? 'thermo' : dc === 'humidity' || dc === 'moisture' ? 'drop' : dc === 'battery' ? 'battery' : 'gauge';
      var n = parseFloat(v), u = attr(e, 'unit_of_measurement') || '';
      if (!o.unav) o.txt = isNaN(n) ? (P.TR[v] || v) : fmtNum(n, dc === 'temperature' ? 1 : (Math.abs(n) >= 100 || n % 1 === 0 ? 0 : 1)) + (u === '°C' || u === '°F' ? '°' : u === '%' ? '%' : (u ? ' ' + u : ''));
    } else if (d === 'script' || d === 'scene') {
      o.icon = 'sparkle'; o.ctrl = true; o.on = v === 'on'; o.ac = '#ffd60a'; o.txt = 'Scena'; o.unav = false;
    } else if (d === 'camera') {
      o.icon = 'camera';
    } else { o.txt = o.unav ? o.txt : (P.TR[v] || v); }
    return o;
  }

  // ---------- co pokazujemy w pomieszczeniach ----------
  var ROOM_DOMS = ['light', 'switch', 'fan', 'cover', 'lock', 'climate', 'media_player', 'vacuum', 'valve', 'humidifier', 'water_heater', 'input_boolean', 'siren', 'lawn_mower'];
  var ROOM_BIN = ['door', 'window', 'garage_door', 'opening', 'motion', 'occupancy', 'presence', 'moisture', 'smoke', 'gas', 'carbon_monoxide', 'lock'];
  var ROOM_SEN = ['temperature', 'humidity'];
  var NOISE = /screensaver|kiosk|lockdown|hold_mode|remote_manag|camera_enab|rtsp|intercom|adaptive_br|keep_screen|_vs_|nightlight|sync_send|freeze|audio_reac|overlay|status_light|system_sounds|_detection$|detection_|turbo|delayed_power|detach_relay|_none$|tablet_salon_screen/;
  function roomWorthy(e) {
    if (REG.skip[e] || NOISE.test(e)) return false;
    var d = e.split('.')[0], dc = attr(e, 'device_class');
    if (ROOM_DOMS.indexOf(d) >= 0) return true;
    if (d === 'binary_sensor') return ROOM_BIN.indexOf(dc) >= 0 && !/_window_open$/.test(e) && !(bad(stv(e)) && /smoke|gas|carbon_monoxide/.test(dc));
    if (d === 'sensor') return ROOM_SEN.indexOf(dc) >= 0 && !/device_temperature|_device_temp|cpu|network_temp|wiatraki/.test(e);
    if (d === 'script' || d === 'scene') return true;
    return false;
  }
  var ORDER = { light: 0, switch: 1, input_boolean: 1, fan: 2, cover: 3, valve: 3, climate: 4, media_player: 5, lock: 6, vacuum: 7, script: 8, scene: 8, binary_sensor: 9, sensor: 10 };
  function byName(a, b) { return (a.unav - b.unav) || (ORDER[a.dom] - ORDER[b.dom]) || a.name.localeCompare(b.name, 'pl'); }
  // własne ustawienia pokoi (layout.rooms[id] = { hide, add, order }) – edycja na ekranie Dom
  var RE = null;
  var RO = false; // tryb ustawiania kolejności pomieszczeń
  function roomCfg(id) { var l = P.layout(); return (l && l.rooms && l.rooms[id]) || {}; }
  function saveRoom(id, fn) {
    P.change(function () { var l = P.layout(); l.rooms = l.rooms || {}; var r = l.rooms[id] || {}; r.hide = r.hide || []; r.add = r.add || []; r.order = r.order || []; fn(r); l.rooms[id] = r; }, false);
  }
  function roomIds(id, auto) {
    var rc = roomCfg(id), hide = rc.hide || [], ids = auto.filter(function (e) { return hide.indexOf(e) < 0; });
    (rc.add || []).forEach(function (e) { if (P.st(e) && ids.indexOf(e) < 0 && hide.indexOf(e) < 0) ids.push(e); });
    return ids;
  }
  function roomList() {
    var by = {};
    P.ids().forEach(function (e) { var a = REG.ent[e]; if (a && roomWorthy(e)) (by[a] = by[a] || []).push(e); });
    var lo = (P.layout() && P.layout().roomOrder) || [];
    var areas = REG.areas.slice();
    if (lo.length) areas.sort(function (x, y) { var i = lo.indexOf(x.id), j = lo.indexOf(y.id); return (i < 0 ? 1e4 : i) - (j < 0 ? 1e4 : j); });
    return areas.map(function (a) {
      var rc = roomCfg(a.id), ord = rc.order || [];
      var ents = roomIds(a.id, by[a.id] || []).map(function (e) { return info(e, a.name); }).sort(byName);
      if (ord.length) ents.sort(function (x, y) { var i = ord.indexOf(x.e), j = ord.indexOf(y.e); return (i < 0 ? 1e4 : i) - (j < 0 ? 1e4 : j) || byName(x, y); });
      return { id: a.id, name: a.name, icon: a.icon, ents: ents };
    }).filter(function (r) { return r.ents.length || r.id === RE; });
  }

  // ---------- elementy ----------
  var used = null; // encje użyte na bieżącym ekranie (do odświeżania)
  function use(e) { if (used) used[e] = 1; }
  function pill(o, sub, edit) {
    use(o.e);
    return '<div class="pill' + (o.on ? ' on' : '') + (o.alert ? ' alert' : '') + (o.unav ? ' unav' : '') + (edit ? ' jig' : '') + '" data-e="' + o.e + '" style="--ac:' + o.ac + '">' +
      (edit ? '<b class="rdel" data-rdel="' + o.e + '">−</b>' : '') +
      '<i class="pi">' + svg(o.icon) + '</i><div class="pt"><b translate="no">' + esc(o.name) + '</b><small>' + esc(sub != null ? sub : o.txt) + '</small></div></div>';
  }
  function section(title, body, extra) {
    return '<section class="sec"' + (extra || '') + '><h3 class="sec-h">' + title + '</h3>' + body + '</section>';
  }
  function pills(list, subFn) { return '<div class="pills">' + list.map(function (o) { return pill(o, subFn ? subFn(o) : null); }).join('') + '</div>'; }
  function card(html, cls) { return '<div class="gcard ' + (cls || '') + '">' + html + '</div>'; }
  function row(label, value, cls, extra) { return '<div class="grow ' + (cls || '') + '"' + (extra || '') + '><span>' + label + '</span><b>' + value + '</b></div>'; }
  function hero(icon, color, title, sub, right) {
    return '<div class="hero2" style="--ac:' + color + '"><div class="hring">' + svg(icon) + '</div><div class="htx"><div class="hbig">' + title + '</div><div class="hsub">' + sub + '</div></div>' + (right || '') + '</div>';
  }
  function ago(t) {
    var d = new Date(String(t).replace(' ', 'T')), s = (Date.now() - d.getTime()) / 1000;
    if (isNaN(s)) return '—';
    if (s < 0) { s = -s; return s < 3600 ? 'za ' + Math.max(1, Math.round(s / 60)) + ' min' : s < 86400 ? 'za ' + Math.round(s / 3600) + ' h' : 'za ' + Math.round(s / 86400) + ' dni'; }
    return s < 90 ? 'przed chwilą' : s < 3600 ? Math.round(s / 60) + ' min temu' : s < 86400 ? Math.round(s / 3600) + ' h temu' : Math.round(s / 86400) + ' ' + plural(Math.round(s / 86400), 'dzień', 'dni', 'dni') + ' temu';
  }
  function firstTile(type) {
    var l = P.layout(), r = null;
    (l && l.views || []).forEach(function (v) { (v.tiles || []).forEach(function (t) { if (!r && t.type === type) r = t; }); });
    return r;
  }

  // ---------- kamery ----------
  function camCfg() { var l = P.layout(); return (l && l.cameras) || {}; }
  function cameras(all) {
    var groups = {}, order = [], cc = camCfg(), names = cc.names || {}, hid = cc.hidden || {}, ord = cc.order || [];
    P.ids().filter(function (e) { return e.indexOf('camera.') === 0 && !/tablet|screenshot|powiadom|notif/.test(e) && !REG.skip[e]; }).forEach(function (e) {
      var nm = String(attr(e, 'friendly_name') || e.replace(/^camera\./, '')).replace(/\s+(High|Medium|Low) resolution channel$/i, '');
      // grupuj po nazwie kamery (UniFi potrafi nadać kanałom tej samej kamery różne identyfikatory)
      var k = (REG.dev && REG.dev[e]) || nm.toLowerCase();
      if (!groups[k]) { groups[k] = { k: k, names: {}, ents: {} }; order.push(k); }
      var q = /_low_res/.test(e) ? 'low' : /_medium_res/.test(e) ? 'med' : /_high_res/.test(e) ? 'high' : 'one';
      groups[k].ents[q] = e; groups[k].names[q] = nm;
    });
    var list = order.map(function (k) {
      var g = groups[k], e = g.ents.med || g.ents.one || g.ents.high || g.ents.low, def = g.names.high || g.names.one || g.names.med || g.names.low;
      return { k: k, e: e, name: names[k] || def, def: def, hidden: !!hid[k], unav: bad(stv(e)) };
    }).filter(function (c) { return !c.unav && (all || !c.hidden); });
    var pos = function (c) { var i = ord.indexOf(c.k); return i < 0 ? 1000 + order.indexOf(c.k) : i; };
    return list.sort(function (a, b) { return pos(a) - pos(b); });
  }
  var camTimer = null;
  function camRefresh() {
    clearInterval(camTimer);
    var f = function () {
      if (document.hidden) return;
      Array.prototype.forEach.call(document.querySelectorAll('#scr img[data-cam]'), function (img) {
        var n = new Image(); n.onload = function () { img.src = n.src; img.classList.add('ok'); };
        n.src = 'api/camera/' + img.getAttribute('data-cam') + '?t=' + Date.now();
      });
    };
    f(); camTimer = setInterval(f, 10000);
  }

  // ================== EKRANY ==================
  var SCREENS = {};

  // ---------- Dom ----------
  SCREENS.home = function (arg) {
    var rooms = roomList(), filter = arg && arg.room, html = '';
    var th = firstTile('thermostat'), clim = th && th.entity || P.ids().filter(function (e) { return e.indexOf('climate.') === 0; })[0];
    var lightsOn = P.ids().filter(function (e) { return e.indexOf('light.') === 0 && stv(e) === 'on' && !REG.skip[e] && !NOISE.test(e); }).length;
    var al = firstTile('alarm'), ale = al && al.entity;
    var opens = contactEnts().filter(function (e) { return isOpen(e); }).length;
    if (clim) use(clim); if (ale) use(ale);
    var ct = clim ? attr(clim, 'current_temperature') : null;
    html += '<div class="sums">' +
      (ct != null ? '<button class="sum" data-dev="' + clim + '">' + svg('thermo') + fmtNum(ct, 0) + '°</button>' : '') +
      '<button class="sum' + (lightsOn ? ' on' : '') + '" data-go="lights">' + svg('bulb') + lightsOn + '</button>' +
      '<button class="sum' + (opens ? ' warn' : '') + '" data-go="contacts">' + svg(opens ? 'door' : 'lock') + (opens ? opens : '') + '</button>' +
      (ale ? '<button class="sum' + (/^armed|triggered/.test(stv(ale) || '') ? ' warn' : '') + '" data-go="alarm">' + svg('shield') + '</button>' : '') +
      (!filter ? '<button class="sum' + (RO ? ' blue' : '') + '" data-ract="' + (RO ? 'odone' : 'order') + '">' + (RO ? 'Gotowe' : '⇅ Kolejność') + '</button>' : '') +
      '</div>';
    if (RO && !filter) {
      html += section('Kolejność pomieszczeń<span class="rtools"><button class="rbtn" data-ract="oreset">Przywróć</button><button class="rbtn blue" data-ract="odone">Gotowe</button></span>',
        '<div class="small" style="margin:0 4px 10px">Strzałkami przesuń pomieszczenie wyżej lub niżej. Kolejność zapisuje się od razu.</div><div class="rolist">' +
        rooms.map(function (r, i) {
          return '<div class="ro-row"><b translate="no">' + esc(r.name) + '</b><small>' + r.ents.length + '</small>' +
            '<button class="rbtn" data-ract="oup" data-r="' + r.id + '"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
            '<button class="rbtn" data-ract="odown" data-r="' + r.id + '"' + (i === rooms.length - 1 ? ' disabled' : '') + '>▼</button></div>';
        }).join('') + '</div>');
      return { title: REG.name || 'Dom', html: html };
    }
    if (!filter) {
      var cams = cameras();
      if (cams.length) html += section('Kamery', '<div class="cams">' + cams.map(function (c) { return '<div class="cam" data-cam-open="' + c.e + '"><img data-cam="' + c.e + '" alt=""><span>' + esc(c.name) + '</span></div>'; }).join('') + '</div>');
      var sc = P.ids().filter(function (e) { return (e.indexOf('scene.') === 0 || e.indexOf('script.') === 0) && !REG.ent[e] && !REG.skip[e]; }).map(function (e) { return info(e); }).sort(byName);
      if (sc.length) html += section('Sceny', '<div class="pills scenes">' + sc.map(function (o) { return pill(o); }).join('') + '</div>');
    }
    rooms.forEach(function (r) {
      if (filter && r.id !== filter) return;
      var ed = RE === r.id;
      var tools = ed ? '<span class="rtools"><button class="rbtn" data-ract="add" data-r="' + r.id + '">＋ Dodaj</button><button class="rbtn" data-ract="reset" data-r="' + r.id + '">Przywróć</button><button class="rbtn blue" data-ract="done">Gotowe</button></span>'
        : '<span class="rtools"><button class="rbtn ghost" data-ract="edit" data-r="' + r.id + '">Edytuj</button></span>';
      html += section('<span data-room="' + r.id + '" translate="no">' + esc(r.name) + '<i class="chev">' + (filter ? '⌄' : '›') + '</i></span>' + tools,
        '<div class="pills' + (ed ? ' redit' : '') + '" data-rroom="' + r.id + '">' + r.ents.map(function (o) { return pill(o, null, ed); }).join('') +
        (ed ? '<div class="pill addp" data-ract="add" data-r="' + r.id + '"><i class="pi">' + svg('plus') + '</i><div class="pt"><b>Dodaj urządzenie</b><small>z całego domu</small></div></div>' : '') + '</div>', ' id="room-' + r.id + '"');
    });
    if (!rooms.length) html += '<div class="empty2">' + (REG.areas.length ? 'Brak urządzeń przypisanych do pomieszczeń.' : 'Wczytuję pomieszczenia z Home Assistant…') + '</div>';
    return { title: REG.name || 'Dom', html: html, after: camRefresh };
  };

  // ---------- Światła ----------
  function lightGroups() {
    var t = firstTile('lights'), groups = {}, order = [], add = function (room, e) { if (!groups[room]) { groups[room] = []; order.push(room); } groups[room].push(e); };
    var ign = (t && t.ignore) || [];
    if (t && t.lights && Object.keys(t.lights).length) {
      Object.keys(t.lights).forEach(function (e) { if (P.st(e)) add(t.lights[e], e); });
      // światła spoza mapy kafla, ale przypisane do pomieszczeń – na koniec
      P.ids().forEach(function (e) { if (e.indexOf('light.') === 0 && !t.lights[e] && ign.indexOf(e) < 0 && !REG.skip[e] && !NOISE.test(e) && REG.ent[e] && !/_main$/.test(e)) add(areaName(REG.ent[e]) || 'Inne', e); });
    } else {
      REG.areas.forEach(function (a) { P.ids().forEach(function (e) { if (e.indexOf('light.') === 0 && REG.ent[e] === a.id && !REG.skip[e] && !NOISE.test(e)) add(a.name, e); }); });
      P.ids().forEach(function (e) { if (e.indexOf('light.') === 0 && !REG.ent[e] && !REG.skip[e] && !NOISE.test(e)) add('Inne', e); });
    }
    return order.map(function (r) { return { name: r, ents: groups[r] }; });
  }
  // wszystkie kamery na pełnym ekranie (siatka); dotknięcie powiększa kamerę
  var CE = false; // edycja listy kamer
  SCREENS.cameras = function () {
    var cams = cameras(CE);
    var bar = '<div class="sums camtools">' + (CE ? '<button class="sum" data-cact="reset">Przywróć</button><button class="sum blue" data-cact="done">Gotowe</button>' : '<button class="sum" data-cact="edit">' + svg('pencil') + 'Edytuj</button>') + '</div>';
    if (!cams.length) return { title: 'Kamery', html: bar + '<div class="empty2">Brak kamer w Home Assistant</div>' };
    return { title: 'Kamery', html: bar + (CE ? '<div class="small" style="margin:0 4px 10px">Przeciągnij kamerę palcem, żeby zmienić kolejność. Możesz też zmienić nazwę albo ukryć kamerę. Ukryte kamery nie pokazują się na liście ani w liczniku na kafelku.</div>' : '') +
      '<div class="camgrid' + (CE ? ' cedit' : '') + '">' + cams.map(function (c, i) {
        return '<div class="cam' + (c.hidden ? ' chid' : '') + '"' + (CE ? ' data-ck="' + esc(c.k) + '"' : ' data-cam-open="' + c.e + '"') + '><img data-cam="' + c.e + '" alt="" draggable="false">' +
          (CE ? '<div class="cctl"><input class="inp" data-cname="' + esc(c.k) + '" value="' + esc(c.name) + '" placeholder="' + esc(c.def) + '"><div class="cbtns">' +
            '<button data-cact="up" data-k="' + esc(c.k) + '"' + (i === 0 ? ' disabled' : '') + '>◀</button><button data-cact="down" data-k="' + esc(c.k) + '"' + (i === cams.length - 1 ? ' disabled' : '') + '>▶</button>' +
            '<button data-cact="hide" data-k="' + esc(c.k) + '" class="' + (c.hidden ? 'on' : '') + '">' + (c.hidden ? 'Pokaż' : 'Ukryj') + '</button></div></div>' : '<span>' + esc(c.name) + '</span>') + '</div>';
      }).join('') + '</div>', after: camRefresh };
  };
  function camSave(fn) { P.change(function () { var l = P.layout(); l.cameras = l.cameras || {}; fn(l.cameras); }, false); }
  function camAct(b) {
    var k = b.getAttribute('data-cact'), key = b.getAttribute('data-k');
    if (k === 'edit') { CE = true; }
    else if (k === 'done') { CE = false; }
    else if (k === 'reset') { if (!confirm('Przywrócić domyślne nazwy, kolejność i widoczność kamer?')) return; P.change(function () { delete P.layout().cameras; }, false); }
    else if (k === 'hide') camSave(function (c) { c.hidden = c.hidden || {}; if (c.hidden[key]) delete c.hidden[key]; else c.hidden[key] = 1; });
    else if (k === 'up' || k === 'down') {
      var ks = cameras(true).map(function (c) { return c.k; }), i = ks.indexOf(key), j = i + (k === 'up' ? -1 : 1);
      if (i < 0 || j < 0 || j >= ks.length) return;
      ks.splice(j, 0, ks.splice(i, 1)[0]); camSave(function (c) { c.order = ks; });
    }
    render(true); if (P.redraw) P.redraw();
  }
  P.cameraList = function () { return cameras(); };
  SCREENS.lights = function () {
    var g = lightGroups(), on = [];
    g.forEach(function (x) { x.ents.forEach(function (e) { use(e); if (stv(e) === 'on') on.push(e); }); });
    var html = '<div class="sums"><span class="sum' + (on.length ? ' on' : '') + '">' + svg('bulb') + (on.length ? on.length + ' ' + plural(on.length, 'włączone', 'włączone', 'włączonych') : 'Wszystkie zgaszone') + '</span>' +
      (on.length ? '<button class="sum red" data-act="lights-off">Zgaś wszystkie</button>' : '') + '</div>';
    if (on.length) html += section('Włączone teraz', pills(on.map(function (e) { return info(e); }), function (o) { return (areaName(REG.ent[o.e]) ? areaName(REG.ent[o.e]) + ' · ' : '') + o.txt; }));
    g.forEach(function (x) { html += section(esc(x.name), pills(x.ents.map(function (e) { return info(e, x.name); }))); });
    return { title: 'Światła', html: html };
  };

  // ---------- Drzwi i okna ----------
  var CAR = /_window_open$|_motion|ruch|doorbell_doorbell/;
  function contactEnts() {
    var t = firstTile('contacts'), list = t && t.entities ? Object.keys(t.entities) : [];
    P.ids().forEach(function (e) {
      if (list.indexOf(e) >= 0 || REG.skip[e] || CAR.test(e)) return;
      var d = e.split('.')[0], dc = attr(e, 'device_class');
      if ((d === 'binary_sensor' && /^(door|window|garage_door|opening)$/.test(dc || '')) || d === 'cover' || (d === 'lock' && !CAR.test(e))) list.push(e);
    });
    return list;
  }
  function isOpen(e) { var v = stv(e), d = e.split('.')[0]; return d === 'lock' ? (v === 'unlocked' || v === 'open') : d === 'cover' ? false : v === 'on'; }
  SCREENS.contacts = function () {
    var t = firstTile('contacts'), names = (t && t.entities) || {}, list = contactEnts();
    var nm = function (e) { var o = info(e); if (names[e]) o.name = names[e]; return o; };
    var open = list.filter(isOpen), html = '';
    var kinds = { door: [], window: [], cover: [], lock: [] };
    list.forEach(function (e) { var d = e.split('.')[0], dc = attr(e, 'device_class'); (d === 'cover' ? kinds.cover : d === 'lock' ? kinds.lock : dc === 'window' ? kinds.window : kinds.door).push(nm(e)); use(e); });
    html += hero(open.length ? 'door' : 'lock', open.length ? '#ff9f0a' : '#30d158', open.length ? 'Otwarte: ' + open.length : 'Wszystko zamknięte',
      open.length ? open.map(function (e) { return esc(nm(e).name); }).join(', ') : (kinds.door.length + kinds.window.length) + ' ' + plural(kinds.door.length + kinds.window.length, 'czujnik', 'czujniki', 'czujników') + ' drzwi i okien');
    var room = function (o) { var a = areaName(REG.ent[o.e]); return (a ? a + ' · ' : '') + o.txt; };
    if (kinds.door.length) html += section('Drzwi', pills(kinds.door, room));
    if (kinds.window.length) html += section('Okna', pills(kinds.window, room));
    if (kinds.cover.length) html += section('Rolety', pills(kinds.cover, room));
    if (kinds.lock.length) html += section('Zamki', pills(kinds.lock, room));
    return { title: 'Drzwi i okna', html: html };
  };

  // ---------- Baterie ----------
  // jedna pozycja na urządzenie; tablety i telefony osobno (ładuje się je, a nie wymienia baterii); auta pomijamy
  function batCfg() { var l = P.layout(); return (l && l.batteries) || {}; }
  function batTH() { var c = batCfg(), t = firstTile('batteries'); return c.th || (t && t.threshold) || 10; }
  var BAT_PREF = /(_battery_level|_battery|_bateria)$/;
  function batteries(all) {
    var bdev = REG.bdev || {}, devs = REG.bdevs || {}, cc = batCfg(), names = cc.names || {}, hid = cc.hidden || {};
    var ids = P.ids(), byDev = {}, order = [], carDev = {}, kioskModel = {}, mobileDev = {};
    // auta: urządzenia z lokalizatorem GPS albo użyte na kafelkach aut
    ids.forEach(function (e) {
      var d = bdev[e]; if (!d) return;
      if (/_battery_state$/.test(e) || /^binary_sensor\..*_charging$/.test(e) && !/charging_status$/.test(e)) mobileDev[d] = 1;
      // kiosk na tablecie: sensor.<x>_device (model) obok sensor.<x>_battery
      var km = /^sensor\.(.+)_device$/.exec(e);
      if (km && stv(e) && P.st('sensor.' + km[1] + '_battery')) kioskModel[d] = String(stv(e)).toLowerCase();
    });
    ids.forEach(function (e) { var d = bdev[e]; if (d && e.indexOf('device_tracker.') === 0 && attr(e, 'source_type') === 'gps' && !mobileDev[d] && !kioskModel[d]) carDev[d] = 1; });
    (P.layout().views || []).forEach(function (v) { (v.tiles || []).forEach(function (t) { if (/^car/.test(t.type || '')) [t.battery, t.range, t.charging, t.plug].forEach(function (e) { if (e && bdev[e]) carDev[bdev[e]] = 1; }); }); });
    ids.forEach(function (e) {
      if (e.indexOf('sensor.') !== 0 || attr(e, 'device_class') !== 'battery' || isNaN(parseFloat(stv(e))) || REG.skip[e]) return;
      var d = bdev[e] || e; if (carDev[d]) return;
      var cur = byDev[d];
      if (!cur) { byDev[d] = e; order.push(d); }
      else if (!BAT_PREF.test(cur) && BAT_PREF.test(e)) byDev[d] = e;
    });
    var mob = function (d, e) { return !!mobileDev[d] || !!kioskModel[d] || (P.mobileBat && P.mobileBat(e)); };
    var upd = function (e) { var s = P.st(e); return s ? new Date(s.last_updated || s.last_changed || 0).getTime() : 0; };
    // ten sam tablet bywa w HA dwa razy (aplikacja HA i kiosk) – łączymy po modelu, zostaje świeższy odczyt
    var drop = {};
    Object.keys(kioskModel).forEach(function (kd) {
      if (!byDev[kd]) return;
      order.forEach(function (d) {
        if (d === kd || drop[d] || kioskModel[d]) return;
        var m = (devs[d] && devs[d].m || '').toLowerCase();
        if (m.length > 3 && kioskModel[kd].indexOf(m) >= 0) { if (upd(byDev[d]) > upd(byDev[kd])) byDev[kd] = byDev[d]; drop[d] = kd; }
      });
    });
    var clean = function (s) { return String(s || '').replace(/\s*(Bateria|Battery level|Battery|Poziom baterii)$/i, '').trim(); };
    var list = order.filter(function (d) { return !drop[d]; }).map(function (d) {
      var e = byDev[d], isMob = mob(d, e), def = clean((devs[d] && devs[d].n) || attr(e, 'friendly_name') || e), ch = false;
      if (isMob) ids.forEach(function (x) {
        var xd = bdev[x]; if (xd !== d && drop[xd] !== d) return;
        if (/_battery_state$/.test(x) && /^(charging|full)$/i.test(String(stv(x)))) ch = true;
        if (/^binary_sensor\..*_charging$/.test(x) && stv(x) === 'on') ch = true;
      });
      var a = REG.ent[e] || '', model = devs[d] && devs[d].m || '';
      return { k: d, e: e, def: def, n: names[d] || def, v: parseFloat(stv(e)), a: areaName(a), mob: isMob, ch: ch, hidden: !!hid[d],
        tab: isMob && (/tab|ipad|KF|SM-X|SM-T/i.test(def + ' ' + model) || !!kioskModel[d]) };
    }).filter(function (x) { return all || !x.hidden; }).sort(function (a, b) { return a.v - b.v || a.n.localeCompare(b.n); });
    var lowb = ids.filter(function (e) { return e.indexOf('binary_sensor.') === 0 && attr(e, 'device_class') === 'battery' && stv(e) === 'on' && !hid[bdev[e] || e]; });
    return { list: list, lowb: lowb, th: batTH() };
  }
  P.batteries = function () { var b = batteries(false), th = b.th; return { all: b.list.filter(function (x) { return !x.mob; }), mobile: b.list.filter(function (x) { return x.mob; }), low: b.list.filter(function (x) { return !x.mob && x.v <= th; }), lowb: b.lowb, th: th }; };
  var BE = false; // edycja listy baterii
  var BIC = { tablet: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M11 18h2"/>', phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>' };
  function bsvg(n) { return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + BIC[n] + '</svg>'; }
  SCREENS.batteries = function () {
    var b = batteries(BE), TH = b.th, list = b.list;
    var mob = list.filter(function (x) { return x.mob; }), sens = list.filter(function (x) { return !x.mob; });
    var vis = sens.filter(function (x) { return !x.hidden; });
    var low = vis.filter(function (x) { return x.v <= TH; }), n = low.length + b.lowb.length, mid = vis.filter(function (x) { return x.v > TH && x.v <= 30; });
    var col = n ? '#ff453a' : mid.length ? '#ff9f0a' : '#30d158';
    var colOf = function (v) { return v <= TH ? '#ff453a' : v <= 30 ? '#ff9f0a' : '#30d158'; };
    var bar = '<div class="sums camtools">' + (BE ? '<button class="sum" data-bact="reset">Przywróć</button><button class="sum blue" data-bact="done">Gotowe</button>' : '<button class="sum" data-bact="edit">' + svg('pencil') + 'Edytuj</button>') + '</div>';
    var html = bar + hero('battery', col, n ? (n === 1 ? 'Jedna bateria do wymiany' : 'Do wymiany: ' + n) : 'Baterie OK', vis.length + ' ' + plural(vis.length, 'czujnik', 'czujniki', 'czujników') + ' na baterii' + (vis[0] ? ' · najniższa ' + Math.round(vis[0].v) + '%' : ''));
    if (BE) html += '<div class="small" style="margin:4px 4px 12px">Zmień nazwę albo ukryj urządzenie. Ukryte nie liczą się na kafelku ani w powiadomieniach.</div>' +
      section('Próg wymiany baterii', '<div class="bseg">' + [10, 15, 20, 25, 30].map(function (v) { return '<button data-bact="th" data-v="' + v + '" class="' + (v === TH ? 'on' : '') + '">' + v + '%</button>'; }).join('') + '</div>');
    var ctl = function (x) {
      return '<div class="bctl"><input class="inp" data-bname="' + esc(x.k) + '" value="' + esc(x.n) + '" placeholder="' + esc(x.def) + '"><button data-bact="hide" data-k="' + esc(x.k) + '" class="' + (x.hidden ? 'on' : '') + '">' + (x.hidden ? 'Pokaż' : 'Ukryj') + '</button></div>';
    };
    if (mob.length) html += section('Tablety i telefony', '<div class="bdevs">' + mob.map(function (x) {
      use(x.e);
      var c = x.v <= 15 ? '#ff453a' : x.v <= 30 ? '#ff9f0a' : '#30d158';
      return '<div class="bdev' + (x.hidden ? ' bhid' : '') + '"' + (BE ? '' : ' data-dev="' + x.e + '"') + ' style="--ac:' + c + '">' +
        '<div class="bdh"><i class="bdi">' + bsvg(x.tab ? 'tablet' : 'phone') + '</i><b class="bdv">' + Math.round(x.v) + '%</b></div>' +
        (BE ? ctl(x) : '<b class="bdn" translate="no">' + esc(x.n) + '</b><small class="bds">' + (x.ch ? bsvg('bolt') + 'Ładuje się' : 'Na baterii') + (x.a ? ' · ' + esc(x.a) : '') + '</small>') +
        '<div class="bbar"><i style="width:' + Math.max(3, Math.min(100, x.v)) + '%;background:' + c + '"></i></div></div>';
    }).join('') + '</div>');
    var rows = function (l) {
      return '<div class="gcard list blist' + (BE ? ' bedit' : '') + '">' + l.map(function (x) {
        use(x.e);
        var c = colOf(x.v);
        return '<div class="brow' + (x.hidden ? ' bhid' : '') + '"' + (BE ? '' : ' data-dev="' + x.e + '"') + '>' + (BE ? ctl(x) : '<div class="bn"><b translate="no">' + esc(x.n) + '</b><small>' + (x.a ? esc(x.a) : '&nbsp;') + '</small></div>') +
          '<div class="bbar"><i style="width:' + Math.max(3, Math.min(100, x.v)) + '%;background:' + c + '"></i></div><b class="bv" style="color:' + c + '">' + Math.round(x.v) + '%</b></div>';
      }).join('') + '</div>';
    };
    var lowL = sens.filter(function (x) { return x.v <= TH; }), restL = sens.filter(function (x) { return x.v > TH; });
    if (lowL.length || b.lowb.length) html += section('Do wymiany', (lowL.length ? rows(lowL) : '') + (b.lowb.length ? pills(b.lowb.map(function (e) { var o = info(e); o.txt = 'Słaba bateria'; o.on = true; o.ac = '#ff453a'; return o; })) : ''));
    if (restL.length) html += section('Czujniki i piloty', rows(restL));
    if (!list.length && !b.lowb.length) html += '<div class="empty2">Brak urządzeń na baterii</div>';
    return { title: 'Baterie', html: html };
  };
  function batSave(fn) { P.change(function () { var l = P.layout(); l.batteries = l.batteries || {}; fn(l.batteries); }, false); }
  function batAct(btn) {
    var k = btn.getAttribute('data-bact'), key = btn.getAttribute('data-k');
    if (k === 'edit') BE = true;
    else if (k === 'done') BE = false;
    else if (k === 'reset') { if (!confirm('Przywrócić domyślne nazwy, widoczność i próg baterii?')) return; P.change(function () { delete P.layout().batteries; }, false); }
    else if (k === 'hide') batSave(function (c) { c.hidden = c.hidden || {}; if (c.hidden[key]) delete c.hidden[key]; else c.hidden[key] = 1; });
    else if (k === 'th') batSave(function (c) { c.th = parseInt(btn.getAttribute('data-v'), 10); });
    render(true); if (P.redraw) P.redraw();
  }

  // ---------- Alarm ----------
  var ALARM = { disarmed: 'Rozbrojony', armed_away: 'Uzbrojony · poza domem', armed_home: 'Uzbrojony · w domu', armed_night: 'Tryb nocny', armed_vacation: 'Wakacje', armed_custom_bypass: 'Uzbrojony', arming: 'Uzbrajanie…', pending: 'Odliczanie…', disarming: 'Rozbrajanie…', triggered: 'ALARM!' };
  var ALC = { disarmed: '#30d158', arming: '#ff9f0a', pending: '#ff9f0a', triggered: '#ff453a' };
  var code = '';
  SCREENS.alarm = function (arg) {
    var t = firstTile('alarm'), e = (arg && arg.entity) || (t && t.entity) || P.ids().filter(function (x) { return x.indexOf('alarm_control_panel.') === 0; })[0];
    if (!e) return { title: 'Alarm', html: '<div class="empty2">Brak centrali alarmowej w Home Assistant.</div>' };
    use(e);
    var v = stv(e), col = ALC[v] || (/^armed/.test(v || '') ? '#ff453a' : '#8e8e93'), need = attr(e, 'code_format') != null && attr(e, 'code_arm_required') !== false;
    var html = '<div class="alarm-hero" style="--ac:' + col + '"><div class="ah-ring">' + svg(v === 'disarmed' ? 'shieldok' : 'shield') + '</div><div class="ah-st">' + esc(ALARM[v] || v || 'Niedostępny') + '</div><div class="ah-sub">' + esc(attr(e, 'friendly_name') || '') + ' · zmiana ' + esc(ago((P.st(e) || {}).last_changed)) + '</div></div>';
    var modes = v === 'disarmed' ? [['arm_home', 'W domu', 'home'], ['arm_away', 'Poza domem', 'car'], ['arm_night', 'Na noc', 'clock']] : [['disarm', 'Rozbrój', 'shieldok']];
    var keypad = attr(e, 'code_format') != null ? '<div class="pinv2">' + (code ? code.replace(/./g, '●') : '<small>Wpisz kod</small>') + '</div><div class="pin2">' +
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map(function (k) { return '<button data-act="key" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' : '';
    html += '<div class="alarm-ctl">' + (keypad ? '<div class="kp">' + keypad + '</div>' : '') + '<div class="modes">' + modes.map(function (m) {
      return '<button class="mode' + (m[0] === 'disarm' ? ' green' : '') + '" data-act="arm" data-m="' + m[0] + '" data-e="' + e + '">' + svg(m[2]) + '<b>' + m[1] + '</b></button>';
    }).join('') + '</div></div>';
    var sens = contactEnts().filter(function (x) { return x.split('.')[0] === 'binary_sensor'; }).concat(P.ids().filter(function (x) { return x.indexOf('binary_sensor.') === 0 && /motion|occupancy/.test(attr(x, 'device_class') || '') && !REG.skip[x] && !/tablet|ix3|mazda/.test(x); }));
    var seen = {}; sens = sens.filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; });
    if (sens.length) html += section('Czujniki', pills(sens.map(function (x) { return info(x); }).sort(function (a, b) { return (b.on - a.on) || a.name.localeCompare(b.name, 'pl'); }), function (o) { var a = areaName(REG.ent[o.e]); return (a ? a + ' · ' : '') + o.txt; }));
    if (need) html += '<div class="hint">Do uzbrojenia i rozbrojenia potrzebny jest kod.</div>';
    return { title: 'Alarm', html: html };
  };

  // ---------- System ----------
  function findS(re) { return P.ids().filter(function (e) { return re.test(e); })[0]; }
  function sv(e, d, u) { if (!e) return null; var n = parseFloat(stv(e)); use(e); return isNaN(n) ? null : fmtNum(n, d || 0) + (u || ''); }
  SCREENS.system = function () {
    var ups = P.ids().filter(function (e) { return e.indexOf('update.') === 0 && e !== 'update.panel_update'; }), pend = ups.filter(function (e) { return stv(e) === 'on'; });
    ups.forEach(use);
    var core = 'update.home_assistant_core_update', ver = attr(core, 'installed_version') || '';
    var html = hero(pend.length ? 'update' : 'check', pend.length ? '#0a84ff' : '#30d158', pend.length ? pend.length + ' ' + plural(pend.length, 'aktualizacja', 'aktualizacje', 'aktualizacji') : 'System aktualny', 'Home Assistant ' + esc(ver) + ' · ' + ups.length + ' sprawdzanych elementów');
    if (pend.length) html += section('Do zainstalowania', card(pend.map(function (e) {
      var nm = String(attr(e, 'title') || attr(e, 'friendly_name') || e).replace(/ (Update|Firmware|Aktualizacja|Oprogramowanie sprzętowe)$/i, '');
      var busy = attr(e, 'in_progress');
      return '<div class="urow"><div class="un"><b>' + esc(nm) + '</b><small>' + esc((attr(e, 'installed_version') || '?') + ' → ' + (attr(e, 'latest_version') || '?')) + '</small></div>' +
        (busy ? '<span class="ubusy">Instaluję…' + (typeof busy === 'number' ? ' ' + busy + '%' : '') + '</span>' : '<button class="ubtn" data-act="install" data-e="' + e + '">Zainstaluj</button>') + '</div>';
    }).join(''), 'list'));
    var cpu = findS(/^sensor\.system_monitor_processor_use$/), tmp = findS(/^sensor\.system_monitor_processor_temperature$/), mem = findS(/^sensor\.system_monitor_memory_use_percent$/),
      disk = findS(/^sensor\.(system_monitor_)?disk_use_percent/), l1 = findS(/^sensor\.system_monitor_load_1m$/), boot = findS(/^sensor\.system_monitor_last_boot$/);
    var stats = [['cpu', 'Procesor', sv(cpu, 0, '%')], ['thermo', 'Temperatura', sv(tmp, 0, '°C')], ['gauge', 'Pamięć', sv(mem, 0, '%')], ['disk', 'Dysk', sv(disk, 0, '%')], ['gauge', 'Obciążenie', sv(l1, 2)], ['clock', 'Działa od', boot && !bad(stv(boot)) ? ago(stv(boot)).replace(' temu', '') : null]]
      .filter(function (x) { return x[2] != null; });
    if (stats.length) html += section('Serwer', '<div class="stats">' + stats.map(function (x) { return '<div class="stat2">' + svg(x[0]) + '<small>' + x[1] + '</small><b>' + esc(x[2]) + '</b></div>'; }).join('') + '</div>');
    var bl = findS(/^sensor\.backup_last_successful_automatic_backup$/), bn = findS(/^sensor\.backup_next_scheduled_automatic_backup$/), bs = findS(/^sensor\.backup_last_successful_automatic_backup_size$/), bm = findS(/^sensor\.backup_backup_manager_state$/);
    if (bl || bn) { [bl, bn, bs, bm].forEach(function (e) { if (e) use(e); }); html += section('Kopie zapasowe', card(
      (bl ? row('Ostatnia udana', bad(stv(bl)) ? '—' : esc(ago(stv(bl)))) : '') + (bn ? row('Następna', bad(stv(bn)) ? '—' : esc(ago(stv(bn)))) : '') +
      (bs && !bad(stv(bs)) ? row('Rozmiar', fmtNum(parseFloat(stv(bs)) / 1024, 2) + ' GB') : '') + (bm ? row('Stan', esc({ idle: 'Gotowy', create_backup: 'Tworzy kopię…', receive_backup: 'Odbiera…', restore_backup: 'Przywraca…', blocked: 'Zablokowany' }[stv(bm)] || stv(bm))) : ''), 'list')); }
    var nt = firstTile('network') || (P.layout() || {}).systemNetwork;
    if (nt) { [nt.temp, nt.internet, nt.remote].forEach(function (e) { if (e) use(e); }); html += section('Sieć', card(
      (nt.temp ? row(esc(nt.temp_name || 'Temperatura'), sv(nt.temp, 0, '°C') || '—') : '') + (nt.internet ? row('Internet', stv(nt.internet) === 'off' ? '<span class="bad">Brak</span>' : 'Działa') : '') +
      (nt.remote ? row('Zdalny dostęp', stv(nt.remote) === 'on' ? 'Włączony' : 'Wyłączony') : ''), 'list')); }
    return { title: 'System', html: html };
  };

  // ================== nawigacja i rysowanie ==================
  var stack = [], rT = 0, pendingRender = false;
  function screenOpen() { return stack.length > 0; }
  P.screenOpen = screenOpen;
  function openScreen(name, arg) {
    if (!SCREENS[name]) return;
    if (name === 'home') RO = false;
    if (stack.length) stack[stack.length - 1].scroll = ($('scr').querySelector('.scr-b') || {}).scrollTop || 0;
    stack.push({ name: name, arg: arg || {}, scroll: 0 });
    var s = $('scr');
    s.style.background = document.body.style.background || '';
    s.classList.remove('hidden'); s.classList.add('enter');
    setTimeout(function () { s.classList.remove('enter'); }, 300);
    render(false);
  }
  function closeScreen(all) {
    if (all) stack = []; else stack.pop();
    clearInterval(camTimer);
    RE = null;
    if (!stack.length) { $('scr').classList.add('hidden'); $('scr').innerHTML = ''; code = ''; return; }
    render(false, stack[stack.length - 1].scroll);
  }
  P.openScreen = openScreen;

  function render(keepScroll, toScroll) {
    var top = stack[stack.length - 1]; if (!top) return;
    var s = $('scr'), b = s.querySelector('.scr-b'), sc = keepScroll && b ? b.scrollTop : (toScroll || 0);
    used = {};
    var r;
    try { r = SCREENS[top.name](top.arg); } catch (e) { console.error(e); r = { title: 'Błąd', html: '<div class="empty2">Błąd ekranu: ' + esc(e.message) + '</div>' }; }
    top.used = used; used = null;
    if (!b || s.getAttribute('data-name') !== top.name + (top.arg.room || '')) {
      s.setAttribute('data-name', top.name + (top.arg.room || ''));
      s.innerHTML = '<div class="scr-h"><button class="xbtn" data-x aria-label="Zamknij">' + (stack.length > 1 ? '‹' : '✕') + '</button><div class="scr-st"></div><div class="scr-clock pclock"></div></div><div class="scr-b"></div>';
      b = s.querySelector('.scr-b');
      b.addEventListener('scroll', function () { s.classList.toggle('compact', b.scrollTop > 46); }, { passive: true });
    }
    s.querySelector('.scr-st').textContent = r.title;
    s.querySelector('.xbtn').textContent = stack.length > 1 ? '‹' : '✕';
    b.innerHTML = '<h1 class="scr-big">' + esc(r.title) + '</h1>' + r.html;
    b.scrollTop = sc;
    s.classList.toggle('compact', sc > 46);
    tickClock();
    if (r.after && !keepScroll) r.after();
    else if (r.after && !s.querySelector('img[data-cam].ok')) r.after();
  }
  // odświeżanie po zmianie stanów: tylko gdy dotyczy ekranu, najwyżej 4×/s
  P.hook = function (id) {
    if (devState && (id === null || id === devState.e)) renderDev();
    var top = stack[stack.length - 1]; if (!top) return;
    if (id !== null && top.used && !top.used[id] && !(top.name === 'system' && id.indexOf('update.') === 0)) return;
    if (rT) { pendingRender = true; return; }
    if (touching) { pendingRender = true; return; }
    render(true);
    rT = setTimeout(function () { rT = 0; if (pendingRender && !touching) { pendingRender = false; render(true); } }, 250);
  };

  // ---------- zegar w nagłówkach ----------
  function tickClock() {
    var d = new Date(), t = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    Array.prototype.forEach.call(document.querySelectorAll('.pclock'), function (el) { el.textContent = t; });
  }
  P.tickClock = tickClock;
  setInterval(tickClock, 10000);

  // ---------- dotyk na ekranach: dotknięcie przełącza, przytrzymanie otwiera okno ----------
  var touching = false;
  (function () {
    var timer = null, held = false, sx = 0, sy = 0, el = null;
    var scr = $('scr');
    var rdrag = null, cdrag = null;
    scr.addEventListener('pointerdown', function (ev) {
      el = ev.target.closest('[data-e]'); held = false; sx = ev.clientX; sy = ev.clientY; touching = true;
      clearTimeout(timer);
      if (CE) {
        var cc = ev.target.closest('.cedit .cam[data-ck]');
        if (cc && !ev.target.closest('input,button')) { cdrag = cc; try { scr.setPointerCapture(ev.pointerId); } catch (x) { /* */ } }
        el = null; return;
      }
      if (RE && el && el.closest('.redit')) {
        if (!ev.target.closest('[data-rdel]')) { rdrag = el; try { scr.setPointerCapture(ev.pointerId); } catch (x) { /* */ } }
        el = null; return;
      }
      if (RE && el) { el = null; return; }
      if (el && el.classList.contains('pill')) {
        el.classList.add('press');
        var e = el.getAttribute('data-e');
        timer = setTimeout(function () { held = true; timer = null; if (el) el.classList.remove('press'); if (navigator.vibrate) navigator.vibrate(25); openDevice(e); }, 520);
      }
    });
    var clear = function () { clearTimeout(timer); timer = null; if (el) el.classList.remove('press'); };
    scr.addEventListener('pointermove', function (ev) {
      if (Math.abs(ev.clientX - sx) > 10 || Math.abs(ev.clientY - sy) > 10) clear();
      if (cdrag && (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8)) { var z = parseFloat(document.documentElement.style.zoom) || 1; cdrag.classList.add('drag'); cdrag.style.transform = 'translate(' + (ev.clientX - sx) / z + 'px,' + (ev.clientY - sy) / z + 'px) scale(1.04)'; }
      if (rdrag && (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8)) { rdrag.classList.add('drag'); rdrag.style.transform = 'translate(' + (ev.clientX - sx) / (parseFloat(document.documentElement.style.zoom) || 1) + 'px,' + (ev.clientY - sy) / (parseFloat(document.documentElement.style.zoom) || 1) + 'px) scale(1.04)'; }
    });
    scr.addEventListener('pointercancel', function () { clear(); touching = false; if (cdrag) { cdrag.classList.remove('drag'); cdrag.style.transform = ''; cdrag = null; } });
    scr.addEventListener('dragstart', function (ev) { if (CE) ev.preventDefault(); });
    scr.addEventListener('pointerup', function (ev) {
      var wasTimer = !!timer; clear(); touching = false;
      var moved = Math.abs(ev.clientX - sx) > 10 || Math.abs(ev.clientY - sy) > 10;
      if (cdrag) {
        var cd = cdrag; cdrag = null;
        if (moved) {
          cd.style.visibility = 'hidden'; var ov = document.elementFromPoint(ev.clientX, ev.clientY); cd.style.visibility = '';
          var tg = ov && ov.closest('.cedit .cam[data-ck]');
          if (tg && tg !== cd) {
            var ks = Array.prototype.map.call(cd.parentNode.querySelectorAll('.cam[data-ck]'), function (x) { return x.getAttribute('data-ck'); });
            var fi = ks.indexOf(cd.getAttribute('data-ck')), ti = ks.indexOf(tg.getAttribute('data-ck'));
            ks.splice(ti, 0, ks.splice(fi, 1)[0]);
            camSave(function (c) { c.order = ks; });
            if (P.redraw) P.redraw();
          }
        }
        render(true); return;
      }
      if (rdrag) {
        var d = rdrag; rdrag = null;
        if (moved) {
          d.style.visibility = 'hidden'; var over = document.elementFromPoint(ev.clientX, ev.clientY); d.style.visibility = '';
          var o2 = over && over.closest('.redit [data-e]');
          if (o2 && o2 !== d) {
            var ids = Array.prototype.map.call(d.parentNode.querySelectorAll('[data-e]'), function (x) { return x.getAttribute('data-e'); });
            var from = ids.indexOf(d.getAttribute('data-e')), to = ids.indexOf(o2.getAttribute('data-e'));
            ids.splice(to, 0, ids.splice(from, 1)[0]);
            saveRoom(RE, function (r) { r.order = ids; });
          }
          render(true); return;
        }
      }
      var rd = ev.target.closest('[data-rdel]');
      if (rd && RE) { var eid = rd.getAttribute('data-rdel'); saveRoom(RE, function (r) { if (r.hide.indexOf(eid) < 0) r.hide.push(eid); r.add = r.add.filter(function (x) { return x !== eid; }); }); render(true); return; }
      var ra = !moved && ev.target.closest('[data-ract]');
      if (ra) { if (!ra.disabled) roomAct(ra.getAttribute('data-ract'), ra.getAttribute('data-r')); return; }
      setTimeout(function () { if (pendingRender && !rT) { pendingRender = false; render(true); } }, 50);
      if (held || moved) return;
      var t = ev.target;
      if (t.closest('[data-x]')) return closeScreen(false);
      var go = t.closest('[data-go]'); if (go) return openScreen(go.getAttribute('data-go'));
      var rm = t.closest('[data-room]');
      if (rm) {
        var top = stack[stack.length - 1], id = rm.getAttribute('data-room');
        if (top.arg.room) { top.arg = {}; render(false); var sec = $('room-' + id); if (sec) scr.querySelector('.scr-b').scrollTop = sec.offsetTop - 90; }
        else { top.arg = { room: id }; render(false); }
        return;
      }
      var cb = t.closest('[data-cact]'); if (cb) { if (!cb.disabled) camAct(cb); return; }
      if (t.closest('[data-cname]')) return;
      var bb = t.closest('[data-bact]'); if (bb) { batAct(bb); return; }
      if (t.closest('[data-bname]')) return;
      var co = t.closest('[data-cam-open]'); if (co) return openCamera(co.getAttribute('data-cam-open'));
      var dv = t.closest('[data-dev]'); if (dv) return openDevice(dv.getAttribute('data-dev'));
      var a = t.closest('[data-act]'); if (a) return act(a);
      if (el && wasTimer) {
        var e = el.getAttribute('data-e'), o = info(e);
        if (o.dom === 'lock' || o.dom === 'climate' || o.dom === 'media_player' && !o.on && stv(e) === 'off') return openDevice(e);
        if (o.ctrl && !o.unav) return P.control(e);
        openDevice(e);
      }
    });
  })();

  document.addEventListener('change', function (ev) {
    var bn = ev.target.closest && ev.target.closest('#scr [data-bname]');
    if (bn) { var bk = bn.getAttribute('data-bname'), bv = bn.value.trim(); batSave(function (c) { c.names = c.names || {}; if (bv) c.names[bk] = bv; else delete c.names[bk]; }); if (P.redraw) P.redraw(); return; }
    var n = ev.target.closest && ev.target.closest('#scr [data-cname]'); if (!n) return;
    var key = n.getAttribute('data-cname'), v = n.value.trim();
    camSave(function (c) { c.names = c.names || {}; if (v) c.names[key] = v; else delete c.names[key]; });
    if (P.redraw) P.redraw();
  });
  function roomAct(k, id) {
    var top = stack[stack.length - 1];
    if (k === 'edit') { RE = id; if (top && !top.arg.room) top.arg = { room: id }; render(false); }
    else if (k === 'done') { RE = null; render(true); }
    else if (k === 'reset') { if (!confirm('Przywrócić domyślną listę urządzeń w tym pomieszczeniu?')) return; P.change(function () { var l = P.layout(); if (l.rooms) delete l.rooms[id]; }, false); render(true); }
    else if (k === 'add') roomPicker(id);
    else if (k === 'order') { RO = true; RE = null; render(false); }
    else if (k === 'odone') { RO = false; render(true); }
    else if (k === 'oreset') { if (!confirm('Przywrócić domyślną kolejność pomieszczeń?')) return; P.change(function () { delete P.layout().roomOrder; }, false); render(false); }
    else if (k === 'oup' || k === 'odown') {
      var ids = roomList().map(function (r) { return r.id; }), i = ids.indexOf(id), j = i + (k === 'oup' ? -1 : 1);
      if (i < 0 || j < 0 || j >= ids.length) return;
      ids[i] = ids[j]; ids[j] = id;
      REG.areas.forEach(function (a) { if (ids.indexOf(a.id) < 0) ids.push(a.id); });
      P.change(function () { P.layout().roomOrder = ids; }, false); render(true);
    }
  }
  function roomPicker(id) {
    var q = '', aname = areaName(id);
    var cand = function () {
      var have = {}; roomList().forEach(function (r) { if (r.id === id) r.ents.forEach(function (o) { have[o.e] = 1; }); });
      var ql = q.toLowerCase();
      return P.ids().filter(function (e) {
        var d = e.split('.')[0];
        if (have[e]) return false;
        if (!(ROOM_DOMS.indexOf(d) >= 0 || d === 'binary_sensor' || d === 'sensor' || d === 'script' || d === 'scene' || d === 'camera' || d === 'button' || d === 'input_button')) return false;
        return !ql || e.toLowerCase().indexOf(ql) >= 0 || String(attr(e, 'friendly_name') || '').toLowerCase().indexOf(ql) >= 0;
      }).sort(function (a, b) { return (REG.ent[b] === id) - (REG.ent[a] === id) || String(attr(a, 'friendly_name') || a).localeCompare(String(attr(b, 'friendly_name') || b), 'pl'); });
    };
    var list = function () {
      var c = cand(), more = c.length > 120;
      return c.slice(0, 120).map(function (e) { var o = info(e); var an = areaName(REG.ent[e]); return '<div class="lrow pick" data-pact="pick" data-e="' + e + '"><span><b translate="no">' + esc(attr(e, 'friendly_name') || e) + '</b><small translate="no">' + esc((an ? an + ' · ' : '') + e) + '</small></span><span>＋</span></div>'; }).join('') +
        (more ? '<div class="small">Zawęź wyszukiwanie, żeby zobaczyć więcej…</div>' : '') + (c.length ? '' : '<div class="small">Nic nie pasuje</div>');
    };
    P.openPop(function () {
      return '<h2><span>Dodaj do: <span translate="no">' + esc(aname) + '</span></span><button class="x" data-close>×</button></h2><input class="inp" data-pin="rq" placeholder="Szukaj (nazwa lub encja)…" value="' + esc(q) + '"><div id="rpl" style="margin-top:10px">' + list() + '</div>';
    }, { static: true, cls: 'editor', acts: { pick: function (el) {
      var e = el.getAttribute('data-e');
      saveRoom(id, function (r) { r.hide = r.hide.filter(function (x) { return x !== e; }); if (r.add.indexOf(e) < 0 && REG.ent[e] !== id) r.add.push(e); });
      P.toast('Dodano: ' + (attr(e, 'friendly_name') || e)); var l = document.getElementById('rpl'); if (l) l.innerHTML = list(); render(true);
    } }, inputs: { rq: function (el, evn) { if (evn !== 'input') return; q = el.value; var l = document.getElementById('rpl'); if (l) l.innerHTML = list(); } } });
  }

  function act(a) {
    var k = a.getAttribute('data-act');
    if (k === 'lights-off') {
      var on = []; lightGroups().forEach(function (g) { g.ents.forEach(function (e) { if (stv(e) === 'on') on.push(e); }); });
      if (on.length) P.call('light', 'turn_off', {}, { entity_id: on }).then(function () { P.toast('Zgaszono ' + on.length + ' ' + plural(on.length, 'światło', 'światła', 'świateł')); });
    } else if (k === 'key') {
      var c = a.getAttribute('data-k'); code = c === 'C' ? '' : c === '⌫' ? code.slice(0, -1) : (code + c).slice(0, 10); render(true);
    } else if (k === 'arm') {
      var m = a.getAttribute('data-m'), e = a.getAttribute('data-e'), d = code ? { code: code } : {};
      P.call('alarm_control_panel', 'alarm_' + m, d, { entity_id: e }).then(function () { code = ''; render(true); });
    } else if (k === 'install') {
      var u = a.getAttribute('data-e'), nm = String(attr(u, 'title') || attr(u, 'friendly_name') || u).replace(/ Update$/, '');
      P.openPop(function () {
        return '<h2>Zainstalować?<button class="x" data-close>×</button></h2><p class="small" style="white-space:normal;margin-bottom:16px">' + esc(nm) + ': ' + esc(attr(u, 'installed_version') || '') + ' → ' + esc(attr(u, 'latest_version') || '') + '. Home Assistant zrobi kopię zapasową, jeśli ta aktualizacja to umożliwia.</p>' +
          '<div class="btns"><button class="btn green" data-pact="go">Zainstaluj</button><button class="btn" data-close>Anuluj</button></div>';
      }, { acts: { go: function () { var data = /home_assistant_(core|operating_system|supervisor)|_update$/.test(u) && (attr(u, 'supported_features') & 8) ? { backup: true } : {}; P.call('update', 'install', data, { entity_id: u }).then(function () { P.toast('Instaluję: ' + nm); }); P.closePop(); } } });
    }
  }

  // ================== okno urządzenia ==================
  var devState = null, dragging = false;
  function closeDev() { devState = null; $('devw').classList.add('hidden'); $('devw').innerHTML = ''; clearInterval(camTimer2); }
  function darker() { return 'rgba(0,0,0,.16)'; }
  function levelOf(e) {
    var d = e.split('.')[0], v = stv(e);
    if (d === 'light') { var modes = attr(e, 'supported_color_modes') || []; if (modes.length && modes.every(function (m) { return m === 'onoff'; })) return null; return { kind: 'brightness', val: v === 'on' ? Math.round((attr(e, 'brightness') || 255) / 2.55) : 0 }; }
    if (d === 'cover' && attr(e, 'current_position') != null) return { kind: 'position', val: attr(e, 'current_position') };
    if (d === 'fan' && attr(e, 'percentage') != null) return { kind: 'percentage', val: v === 'on' ? attr(e, 'percentage') : 0 };
    if (d === 'media_player' && attr(e, 'volume_level') != null) return { kind: 'volume', val: Math.round(attr(e, 'volume_level') * 100) };
    return null;
  }
  function openDevice(e) {
    if (!P.st(e)) return;
    devState = { e: e, lvl: null };
    var w = $('devw'); w.classList.remove('hidden'); w.classList.add('enter'); setTimeout(function () { w.classList.remove('enter'); }, 280);
    renderDev();
  }
  P.openDevice = openDevice;
  function renderDev() {
    if (!devState || dragging) return;
    var e = devState.e, o = info(e), d = o.dom, v = stv(e), L = levelOf(e), w = $('devw');
    var bg = o.on ? o.ac : '#2c2c2e', fg = o.on && (d === 'light' || d === 'cover' || d === 'switch' || d === 'input_boolean') ? '#1c1c1e' : '#fff';
    if (d === 'binary_sensor' || d === 'sensor') { bg = o.on || o.alert ? o.ac : '#2c2c2e'; fg = '#fff'; }
    if (d === 'climate' && o.on) { bg = v === 'cool' ? '#0a84ff' : '#ff9f0a'; fg = '#fff'; }
    if (d === 'media_player') { bg = o.on ? '#3a0d1c' : '#1c1c1e'; fg = '#fff'; }
    w.style.setProperty('--bg', bg); w.style.setProperty('--fg', fg); w.style.setProperty('--x', darker(bg));
    var body = '';
    if (L) {
      devState.lvl = L.val;
      var lab = { brightness: 'Przeciągnij w górę lub w dół, aby zmienić jasność.', position: 'Przeciągnij w górę lub w dół, aby otworzyć lub zamknąć.', percentage: 'Przeciągnij w górę lub w dół, aby zmienić prędkość.', volume: 'Przeciągnij w górę lub w dół, aby zmienić głośność.' }[L.kind];
      body += '<div class="dv-ic">' + svg(d === 'media_player' ? 'vol' : o.icon) + '</div><div class="dv-big" id="dvval">' + L.val + '<small>%</small></div>';
      if (d === 'media_player') body += '<div class="dv-media"><b>' + esc(attr(e, 'media_title') || MEDIA[v] || v) + '</b><small>' + esc(attr(e, 'media_artist') || '') + '</small></div>' +
        '<div class="dv-tr"><button data-dv="prev">' + svg('prev') + '</button><button data-dv="pp" class="pp">' + svg(v === 'playing' ? 'pause' : 'play') + '</button><button data-dv="next">' + svg('next') + '</button></div>';
      body += '<div class="dv-hint">' + lab + '</div>';
      if (d === 'light' && v === 'on') {
        var modes = attr(e, 'supported_color_modes') || [], sw = '';
        if (modes.some(function (m) { return /hs|rgb|xy/.test(m); })) sw += ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#af52de', '#ff2d55'].map(function (c) { return '<button class="sw" style="background:' + c + '" data-dv="rgb" data-c="' + c + '"></button>'; }).join('');
        if (modes.indexOf('color_temp') >= 0) sw += [[2700, '#ffc864'], [4000, '#ffe9c4'], [6000, '#eef2ff']].map(function (x) { return '<button class="sw" style="background:' + x[1] + '" data-dv="ct" data-k="' + x[0] + '"></button>'; }).join('');
        if (sw) body += '<div class="dv-sw">' + sw + '</div>';
      }
    } else if (d === 'climate') {
      var tg = attr(e, 'temperature'), ct = attr(e, 'current_temperature'), modes2 = attr(e, 'hvac_modes') || [];
      body += '<div class="dv-ic">' + svg('thermo') + '</div><div class="dv-big">' + (tg != null ? fmtNum(tg, 1) : '—') + '<small>°</small></div>' +
        '<div class="dv-sub">Teraz ' + (ct != null ? fmtNum(ct, 1) + '°' : '—') + ' · ' + esc(ACT[attr(e, 'hvac_action')] || HVAC[v] || v) + '</div>' +
        '<div class="dv-tr"><button data-dv="t-">−</button><button data-dv="t+">+</button></div>' +
        '<div class="dv-modes">' + modes2.map(function (m) { return '<button class="' + (m === v ? 'sel' : '') + '" data-dv="mode" data-m="' + m + '">' + esc(HVAC[m] || m) + '</button>'; }).join('') + '</div>';
    } else if (d === 'lock') {
      body += '<div class="dv-ic big">' + svg(v === 'locked' ? 'lock' : 'unlock') + '</div><div class="dv-st">' + esc(o.txt) + '</div><div class="dv-sub">Zmiana ' + esc(ago((P.st(e) || {}).last_changed)) + '</div>';
    } else if (o.ctrl) {
      body += '<button class="dv-power' + (o.on ? ' on' : '') + '" data-dv="toggle">' + svg(o.icon) + '</button><div class="dv-st">' + esc(o.txt) + '</div><div class="dv-hint">Dotknij, aby ' + (o.on ? 'wyłączyć' : 'włączyć') + '.</div>';
    } else {
      body += '<div class="dv-ic big">' + svg(o.icon) + '</div><div class="dv-st">' + esc(o.txt || v) + '</div><div class="dv-sub">Zmiana ' + esc(ago((P.st(e) || {}).last_changed)) + '</div>';
    }
    var foot = '';
    if (d === 'light' || d === 'fan' || d === 'switch' || d === 'input_boolean') foot = o.unav ? '' : '<button class="dv-btn" data-dv="toggle">' + (o.on ? 'Wyłącz' : 'Włącz') + '</button>';
    if (d === 'cover') foot = '<div class="dv-row"><button class="dv-btn" data-dv="open">Otwórz</button><button class="dv-btn" data-dv="stop">Stop</button><button class="dv-btn" data-dv="close">Zamknij</button></div>';
    if (d === 'lock') foot = v === 'locked' ? '<button class="dv-btn" data-dv="unlock">Otwórz</button>' : '<button class="dv-btn" data-dv="lock">Zamknij</button>';
    if (d === 'climate') foot = '<button class="dv-btn" data-dv="toggle">' + (v === 'off' ? 'Włącz' : 'Wyłącz') + '</button>';
    if (d === 'media_player') foot = '<button class="dv-btn" data-dv="mpower">' + (v === 'off' ? 'Włącz' : 'Wyłącz') + '</button>';
    w.innerHTML = '<div class="dv-h"><button class="xbtn" data-dvx>✕</button><b>' + esc(attr(e, 'friendly_name') || e) + '</b><span class="pclock"></span></div>' +
      '<div class="dv-body' + (L ? ' drag' : '') + '">' + body + '</div><div class="dv-foot">' + foot + '</div>';
    tickClock();
  }
  var dvT = null;
  function sendLevel(e, val) {
    var d = e.split('.')[0];
    if (d === 'light') return val <= 0 ? P.call('light', 'turn_off', {}, { entity_id: e }) : P.call('light', 'turn_on', { brightness_pct: val }, { entity_id: e });
    if (d === 'cover') return P.call('cover', 'set_cover_position', { position: val }, { entity_id: e });
    if (d === 'fan') return val <= 0 ? P.call('fan', 'turn_off', {}, { entity_id: e }) : P.call('fan', 'set_percentage', { percentage: val }, { entity_id: e });
    if (d === 'media_player') return P.call('media_player', 'volume_set', { volume_level: val / 100 }, { entity_id: e });
  }
  (function () {
    var w = $('devw'), sy = 0, v0 = 0, moved = false, h = 1;
    w.addEventListener('pointerdown', function (ev) {
      moved = false;
      if (!devState || ev.target.closest('button') || !ev.target.closest('.dv-body.drag')) return;
      dragging = true; sy = ev.clientY; v0 = devState.lvl || 0; h = w.clientHeight * 0.55;
      try { w.setPointerCapture(ev.pointerId); } catch (x) { /* stary WebView */ }
    });
    w.addEventListener('pointermove', function (ev) {
      if (!dragging || !devState) return;
      var dy = sy - ev.clientY; if (Math.abs(dy) > 6) moved = true;
      var nv = Math.max(0, Math.min(100, Math.round(v0 + dy / h * 100)));
      if (nv === devState.lvl) return;
      devState.lvl = nv;
      var el = $('dvval'); if (el) el.innerHTML = nv + '<small>%</small>';
      var e = devState.e;
      clearTimeout(dvT); dvT = setTimeout(function () { sendLevel(e, nv); }, 350);
    });
    var up = function () {
      if (!dragging) return; dragging = false;
      if (moved && devState) { clearTimeout(dvT); sendLevel(devState.e, devState.lvl); }
      setTimeout(renderDev, 900);
    };
    w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
    w.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-dvx]')) return closeDev();
      var b = ev.target.closest('[data-dv]'); if (!b || !devState) return;
      var e = devState.e, d = e.split('.')[0], k = b.getAttribute('data-dv'), v = stv(e);
      if (k === 'toggle') P.call(d === 'climate' ? 'climate' : 'homeassistant', d === 'climate' ? (v === 'off' ? 'turn_on' : 'turn_off') : 'toggle', {}, { entity_id: e });
      else if (k === 'open' || k === 'close' || k === 'stop') P.call('cover', k + '_cover', {}, { entity_id: e });
      else if (k === 'lock') P.call('lock', 'lock', {}, { entity_id: e });
      else if (k === 'unlock') P.openPop(function () { return '<h2>Otworzyć: ' + esc(attr(e, 'friendly_name') || e) + '?<button class="x" data-close>×</button></h2><div class="btns"><button class="btn red" data-pact="go">Otwórz</button><button class="btn" data-close>Anuluj</button></div>'; },
        { acts: { go: function () { P.call('lock', 'unlock', {}, { entity_id: e }); P.closePop(); } } });
      else if (k === 'rgb') { var c = b.getAttribute('data-c'), r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), bl = parseInt(c.slice(5, 7), 16); P.call('light', 'turn_on', { rgb_color: [r, g, bl] }, { entity_id: e }); }
      else if (k === 'ct') P.call('light', 'turn_on', { color_temp_kelvin: +b.getAttribute('data-k') }, { entity_id: e });
      else if (k === 't-' || k === 't+') {
        var step = attr(e, 'target_temp_step') || 0.5, tg = (attr(e, 'temperature') || 20) + (k === 't+' ? step : -step);
        tg = Math.max(attr(e, 'min_temp') || 5, Math.min(attr(e, 'max_temp') || 35, Math.round(tg * 10) / 10));
        P.call('climate', 'set_temperature', { temperature: tg }, { entity_id: e });
      } else if (k === 'mode') P.call('climate', 'set_hvac_mode', { hvac_mode: b.getAttribute('data-m') }, { entity_id: e });
      else if (k === 'pp') P.call('media_player', 'media_play_pause', {}, { entity_id: e });
      else if (k === 'prev') P.call('media_player', 'media_previous_track', {}, { entity_id: e });
      else if (k === 'next') P.call('media_player', 'media_next_track', {}, { entity_id: e });
      else if (k === 'mpower') P.call('media_player', v === 'off' ? 'turn_on' : 'turn_off', {}, { entity_id: e });
    });
  })();

  // kamera na cały ekran
  var camTimer2 = null;
  function openCamera(e, title) {
    devState = null;
    var w = $('devw'); w.classList.remove('hidden');
    w.style.setProperty('--bg', '#000'); w.style.setProperty('--fg', '#fff'); w.style.setProperty('--x', '#2c2c2e');
    var nm = title || (cameras().filter(function (c) { return c.e === e; })[0] || {}).name || attr(e, 'friendly_name') || e;
    w.innerHTML = '<div class="dv-h"><button class="xbtn" data-dvx>✕</button><b>' + esc(nm) + '</b><span class="pclock"></span></div><div class="dv-cam"><img id="dvcam" alt=""></div>';
    tickClock();
    var hi = e.replace('_medium_resolution_channel', '_high_resolution_channel');
    var src = P.st(hi) ? hi : e;
    var f = function () { var n = new Image(); n.onload = function () { var i = $('dvcam'); if (i) i.src = n.src; }; n.src = 'api/camera/' + src + '?t=' + Date.now(); };
    f(); clearInterval(camTimer2); camTimer2 = setInterval(f, 1500);
  }

  P.openCamera = openCamera;
  P.closeScreens = function () { if (stack.length) closeScreen(true); if (!$('devw').classList.contains('hidden')) closeDev(); };
  // ================== kafle na stronie głównej prowadzą do swoich stron ==================
  function pageFor(c) {
    if (c.type === 'energy' && P.hasPage('energia')) return 'energia';
    if (c.type === 'car' || c.type === 'car_hero') {
      var n = String(c.name || '').toLowerCase();
      if (/mazda/.test(n) && P.hasPage('mazda')) return 'mazda';
      if (/bmw|ix3/.test(n) && P.hasPage('bmw')) return 'bmw';
    }
    return null;
  }
  var TILE_SCREEN = { rooms: 'home', lights: 'lights', contacts: 'contacts', batteries: 'batteries', alarm: 'alarm', updates: 'system', network: 'system', cameras: 'cameras' };
  P.tileTap = function (c) {
    if (P.editing()) return false;
    if (TILE_SCREEN[c.type]) { openScreen(TILE_SCREEN[c.type], c.type === 'alarm' ? { entity: c.entity } : {}); return true; }
    var pg = pageFor(c); if (pg) { P.openPage(pg); return true; }
    return false;
  };
  // podpis kafla Pomieszczenia: prawdziwa liczba pomieszczeń
  var oldRooms = P.T.rooms.render;
  P.T.rooms.render = function (c) { var n = roomList().length || REG.areas.length; return oldRooms(Object.assign({}, c, { count: c.count || n })); };


  // ================== MENU OD DOŁU (0.6) ==================
  P.reg = function () { return REG; };
  var APPS = {
    home: { n: 'Dom', ic: 'home', bg: 'linear-gradient(160deg,#ffb340,#ff8a00)', go: function () { openScreen('home'); } },
    lights: { n: 'Światła', ic: 'bulb', bg: 'linear-gradient(160deg,#ffe066,#ffc400)', go: function () { openScreen('lights'); } },
    contacts: { n: 'Drzwi i okna', ic: 'door', bg: 'linear-gradient(160deg,#5ee0c8,#20a58f)', go: function () { openScreen('contacts'); } },
    alarm: { n: 'Alarm', ic: 'shield', bg: 'linear-gradient(160deg,#ff6b61,#e0251b)', go: function () { openScreen('alarm'); } },
    batteries: { n: 'Baterie', ic: 'battery', bg: 'linear-gradient(160deg,#6be37f,#22b43c)', go: function () { openScreen('batteries'); } },
    system: { n: 'System', ic: 'update', bg: 'linear-gradient(160deg,#8e8e93,#48484a)', go: function () { openScreen('system'); } },
    energia: { n: 'Energia', ic: 'gauge', bg: 'linear-gradient(160deg,#ffd60a,#ff9f0a)', page: 'energia' },
    bmw: { n: 'BMW iX3', ic: 'car', bg: 'linear-gradient(160deg,#4fa3ff,#0a5fd6)', page: 'bmw' },
    mazda: { n: 'Mazda', ic: 'car', bg: 'linear-gradient(160deg,#ff7a7a,#c7202a)', page: 'mazda' },
    cameras: { n: 'Kamery', ic: 'camera', bg: 'linear-gradient(160deg,#5c5c64,#1c1c1e)', go: function () { openScreen('cameras'); } },
    settings: { n: 'Ustawienia', ic: 'gear', bg: 'linear-gradient(160deg,#a1a1a6,#636366)', go: function () { P.settings(); } }
  };
  IC.gear = '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>';
  var WIDGETS = { calendar: 'Kalendarz', weather: 'Pogoda' };
  P.APPS = APPS; P.WIDGETS = WIDGETS; P.WRENDER = {}; P.WTAP = {};
  P.renderLauncher = function () { renderLauncher(); };
  function lnDefault() {
    var it = [{ w: 'calendar' }, { a: 'home' }, { a: 'lights' }, { w: 'weather' }, { a: 'contacts' }, { a: 'alarm' }, { a: 'batteries' }, { a: 'system' }];
    if (WIDGETS.music) it.push({ w: 'music' });
    ['music', 'clock', 'reminders', 'weather'].forEach(function (a) { if (APPS[a]) it.push({ a: a }); });
    if (WIDGETS.timers) it.push({ w: 'timers' });
    ['energia', 'bmw', 'mazda'].forEach(function (p) { if (P.hasPage(p)) it.push({ a: p }); });
    it.push({ a: 'settings' });
    return it;
  }
  function lnItems() { var l = P.layout(); return (l && l.launcher && l.launcher.items) || lnDefault(); }
  function lnValid(x) { return x.w ? !!WIDGETS[x.w] : !!APPS[x.a] && (!APPS[x.a].page || P.hasPage(APPS[x.a].page)); }
  function lnSave(items) { P.change(function () { P.layout().launcher = { items: items }; }, false); }
  var LN = { open: false, edit: false };
  var PLD = window.I18N && I18N.en ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] : ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  function nextEvent() {
    var best = null, now = Date.now();
    P.ids().forEach(function (e) {
      if (e.indexOf('calendar.') !== 0) return;
      var st0 = attr(e, 'start_time'), en = attr(e, 'end_time'), msg = attr(e, 'message');
      if (!st0 || !msg) return;
      var t = new Date(String(st0).replace(' ', 'T')).getTime(), te = en ? new Date(String(en).replace(' ', 'T')).getTime() : t;
      if (isNaN(t) || te < now) return;
      if (!best || t < best.t) best = { t: t, m: msg };
    });
    return best;
  }
  var WCOND = { 'clear-night': 'Bezchmurnie', cloudy: 'Pochmurno', fog: 'Mgła', hail: 'Grad', lightning: 'Burza', 'lightning-rainy': 'Burza z deszczem', partlycloudy: 'Częściowe zachmurzenie', pouring: 'Ulewa', rainy: 'Deszcz', snowy: 'Śnieg', 'snowy-rainy': 'Deszcz ze śniegiem', sunny: 'Słonecznie', windy: 'Wietrznie', 'windy-variant': 'Wietrznie', exceptional: 'Uwaga' };
  function lnItem(x, i) {
    var del = LN.edit ? '<b class="ln-del" data-ldel="' + i + '">−</b>' : '';
    if (x.w === 'calendar') {
      var d = new Date(), ev = nextEvent();
      var evs = ev ? (new Date(ev.t).toDateString() === d.toDateString() ? (new Date(ev.t).getHours() || new Date(ev.t).getMinutes() ? ('0' + new Date(ev.t).getHours()).slice(-2) + ':' + ('0' + new Date(ev.t).getMinutes()).slice(-2) + ' ' : 'Dziś: ') : PLD[new Date(ev.t).getDay()] + ': ') + esc(ev.m) : 'Brak wydarzeń';
      return '<div class="ln-it wid cal" data-li="' + i + '">' + del + '<div class="lw"><small>' + PLD[d.getDay()].toUpperCase() + '</small><b>' + d.getDate() + '</b><span>' + evs + '</span></div></div>';
    }
    if (x.w === 'weather') {
      var we = (firstTile('clock_weather') || {}).weather || P.ids().filter(function (e) { return e.indexOf('weather.') === 0; })[0];
      var t = we ? attr(we, 'temperature') : null, c = we ? stv(we) : '';
      return '<div class="ln-it wid wea" data-li="' + i + '">' + del + '<div class="lw"><small>' + esc(REG.name || 'Dom') + ' ➤</small><b>' + (t != null ? Math.round(t) + '°' : '—') + '</b><span>' + esc(WCOND[c] || c || '') + (we && attr(we, 'humidity') != null ? '<br>Wilgotność ' + attr(we, 'humidity') + '%' : '') + '</span></div></div>';
    }
    if (x.w && P.WRENDER[x.w]) return '<div class="ln-it wid w-' + x.w + '" data-li="' + i + '">' + del + P.WRENDER[x.w]() + '</div>';
    var A = APPS[x.a];
    return '<div class="ln-it app" data-li="' + i + '">' + del + '<i class="ln-ic" style="background:' + A.bg + '">' + svg(A.ic) + '</i><span>' + esc(A.n) + '</span></div>';
  }
  function renderLauncher() {
    var el = $('lnch'), d = new Date();
    var items = lnItems().filter(lnValid);
    el.classList.toggle('editing', LN.edit);
    el.innerHTML = '<div class="ln-card"><div class="ln-top">' +
      (LN.edit ? '<button class="ln-pill dark" data-lact="add">＋ Dodaj</button><span class="sp"></span><button class="ln-pill blue" data-lact="done">✓ Gotowe</button>' :
        '<div class="ln-date"><small>' + PLD[d.getDay()].toUpperCase() + ', ' + d.getDate() + ' ' + P.MON[d.getMonth()].toUpperCase() + '</small><b class="pclock"></b></div><span class="sp"></span><button class="ln-prof" data-lact="profile">' + svg('home') + '</button>') +
      '</div><div class="ln-grid">' + items.map(lnItem).join('') + '</div></div>';
    tickClock();
  }
  function openLauncher(edit) {
    LN.open = true; LN.edit = !!edit;
    var el = $('lnch'); el.classList.remove('hidden'); el.classList.add('enter'); setTimeout(function () { el.classList.remove('enter'); }, 320);
    renderLauncher();
  }
  function closeLauncher() { LN.open = false; LN.edit = false; $('lnch').classList.add('hidden'); $('lnch').innerHTML = ''; }
  P.openLauncher = openLauncher;
  var oldOpen = P.screenOpen;
  P.screenOpen = function () { return oldOpen() || LN.open || !$('set').classList.contains('hidden'); };
  function lnAdd() {
    var have = lnItems().filter(lnValid), key = function (x) { return x.w ? 'w:' + x.w : 'a:' + x.a; }, hk = have.map(key);
    var opts = Object.keys(WIDGETS).map(function (k) { return { w: k, n: WIDGETS[k] + ' (widżet)' }; }).concat(Object.keys(APPS).map(function (k) { return { a: k, n: APPS[k].n }; }))
      .filter(function (x) { return lnValid(x) && hk.indexOf(key(x)) < 0; });
    P.openPop(function () {
      return '<h2>Dodaj do menu<button class="x" data-close>×</button></h2>' + (opts.length ? opts.map(function (x, i) { return '<div class="lrow pick" data-pact="add" data-i="' + i + '"><span><b>' + esc(x.n) + '</b></span><span>＋</span></div>'; }).join('') : '<div class="small">Wszystko już jest w menu.</div>');
    }, { static: true, cls: 'editor', acts: { add: function (el) { var x = opts[+el.getAttribute('data-i')], it = have.slice(); it.push(x.w ? { w: x.w } : { a: x.a }); lnSave(it); P.closePop(); renderLauncher(); } } });
  }
  (function () {
    var el = $('lnch'), timer = null, sx = 0, sy = 0, drag = null, moved = false, downIt = null;
    el.addEventListener('pointerdown', function (ev) {
      sx = ev.clientX; sy = ev.clientY; moved = false; downIt = ev.target.closest('[data-li]');
      clearTimeout(timer);
      if (downIt && !LN.edit) timer = setTimeout(function () { timer = null; if (navigator.vibrate) navigator.vibrate(20); LN.edit = true; renderLauncher(); downIt = null; }, 600);
      if (downIt && LN.edit && !ev.target.closest('[data-ldel]')) { drag = { el: downIt, i: +downIt.getAttribute('data-li') }; try { el.setPointerCapture(ev.pointerId); } catch (x) { /* */ } }
    });
    el.addEventListener('pointermove', function (ev) {
      var dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) { moved = true; clearTimeout(timer); timer = null; }
      if (drag && moved) { drag.el.classList.add('drag'); drag.el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(1.06)'; }
    });
    var end = function (ev) {
      clearTimeout(timer);
      var wasTimer = !!timer; timer = null;
      if (drag) {
        var d = drag; drag = null;
        if (moved) {
          d.el.style.visibility = 'hidden';
          var over = document.elementFromPoint(ev.clientX, ev.clientY); d.el.style.visibility = '';
          var o = over && over.closest('[data-li]');
          var items = lnItems().filter(lnValid);
          if (o && o !== d.el) { var to = +o.getAttribute('data-li'), it = items.splice(d.i, 1)[0]; items.splice(to, 0, it); lnSave(items); }
          renderLauncher(); return;
        }
      }
      if (moved) { if (!LN.edit && ev.clientY - sy > 120 && Math.abs(ev.clientX - sx) < 120) closeLauncher(); return; }
      var t = ev.target;
      if (!t.closest('.ln-card')) { if (LN.edit) { LN.edit = false; renderLauncher(); } else closeLauncher(); return; }
      var dl = t.closest('[data-ldel]');
      if (dl) { var items2 = lnItems().filter(lnValid); items2.splice(+dl.getAttribute('data-ldel'), 1); lnSave(items2); renderLauncher(); return; }
      var la = t.closest('[data-lact]');
      if (la) { var k = la.getAttribute('data-lact'); if (k === 'done') { LN.edit = false; renderLauncher(); } else if (k === 'add') lnAdd(); else if (k === 'profile') { closeLauncher(); P.settings('ha'); } return; }
      var li = t.closest('[data-li]');
      if (li && !LN.edit && (wasTimer || true)) {
        var x = lnItems().filter(lnValid)[+li.getAttribute('data-li')];
        closeLauncher();
        if (x.w === 'weather') { if (P.openWeather) P.openWeather(); return; }
        if (x.w && P.WTAP[x.w]) { P.WTAP[x.w](t); return; }
        if (x.w) return;
        var A = APPS[x.a]; if (A.page) P.openPage(A.page); else A.go();
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', function () { clearTimeout(timer); timer = null; if (drag) { drag = null; renderLauncher(); } });
  })();
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && LN.open) closeLauncher(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { if (devState || !$('devw').classList.contains('hidden')) closeDev(); else if (stack.length) closeScreen(false); } });
  loadRegistry();
})();
