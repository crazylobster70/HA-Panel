// Panel – serwer App. Bez zależności npm: Node 22+ (globalny WebSocket, fetch).
// Jedno połączenie WebSocket do HA, stany rozsyłane do przeglądarek przez SSE.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PANEL_PORT || '8099', 10);
const TOKEN = process.env.SUPERVISOR_TOKEN || process.env.HA_TOKEN || '';
const HA_HTTP = process.env.HA_URL || 'http://supervisor/core';
const HA_WS = HA_HTTP.replace(/^http/, 'ws') + (process.env.HA_URL ? '/api/websocket' : '/websocket');
const WWW = path.join(__dirname, 'www');
const CONFIG_DIR = process.env.PANEL_CONFIG_DIR || '/config';
const LAYOUT_FILE = path.join(CONFIG_DIR, 'layout.json');
// historia układu: kopie layout.json przed każdą zmianą (najwyżej 1 na minutę, ostatnie 40)
const HIST_DIR = path.join(CONFIG_DIR, 'history');
let lastSnap = 0;
function snapshot(reason, force) {
  try {
    if (!fs.existsSync(LAYOUT_FILE)) return;
    if (!force && Date.now() - lastSnap < 60000) return;
    lastSnap = Date.now();
    fs.mkdirSync(HIST_DIR, { recursive: true });
    const id = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(LAYOUT_FILE, path.join(HIST_DIR, id + (reason ? '__' + reason : '') + '.json'));
    const files = fs.readdirSync(HIST_DIR).filter((f) => f.endsWith('.json')).sort();
    files.slice(0, Math.max(0, files.length - 40)).forEach((f) => { try { fs.unlinkSync(path.join(HIST_DIR, f)); } catch (e) { /* */ } });
  } catch (e) { log('Historia układu:', e.message); }
}
function histList() {
  try {
    return fs.readdirSync(HIST_DIR).filter((f) => f.endsWith('.json')).sort().reverse().map((f) => {
      const m = f.replace(/\.json$/, '').split('__'), iso = m[0].replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1:$2:$3.$4Z');
      let faces = 0, tiles = 0;
      try { const l = JSON.parse(fs.readFileSync(path.join(HIST_DIR, f), 'utf8')); (l.views || []).forEach((v) => { if (!v.page) faces++; tiles += (v.tiles || []).length; }); } catch (e) { /* */ }
      return { id: f, t: iso, reason: m[1] || '', faces, tiles };
    });
  } catch (e) { return []; }
}
const DEFAULT_LAYOUT = path.join(__dirname, 'default-layout.json');

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

if (!TOKEN) log('BRAK SUPERVISOR_TOKEN – sprawdź homeassistant_api: true w config.yaml');
if (typeof WebSocket === 'undefined') { log('Ten Node nie ma WebSocket (potrzebny Node 22+)'); process.exit(1); }

// ---------- układ (layout.json) ----------
// Skróty sha256 domyślnych układów z poprzednich wersji: jeśli plik użytkownika jest
// nietknięty, podmieniamy go na nowy domyślny (z kopią zapasową).
const OLD_DEFAULTS = [];
function ensureLayout() {
  try {
    if (fs.existsSync(LAYOUT_FILE)) {
      const cur = fs.readFileSync(LAYOUT_FILE);
      const h = require('crypto').createHash('sha256').update(cur).digest('hex');
      if (OLD_DEFAULTS.includes(h)) {
        fs.writeFileSync(LAYOUT_FILE + '.bak', cur);
        fs.copyFileSync(DEFAULT_LAYOUT, LAYOUT_FILE);
        log('Zaktualizowano nieedytowany layout.json do nowej wersji (kopia: layout.json.bak)');
      }
    } else {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.copyFileSync(DEFAULT_LAYOUT, LAYOUT_FILE);
      log('Utworzono', LAYOUT_FILE, 'z układu domyślnego');
    }
  } catch (e) { log('Nie mogę zapisać layout.json:', e.message); }
}
// Układ v1 (grid.areas z nazwami t1, t2…) -> v2 (każdy kafel ma w×h, kolejność = pozycja).
function normalize(l) {
  if (!l || !Array.isArray(l.views)) return { version: 2, views: [] };
  l.views.forEach((v, vi) => {
    if (!v.id) v.id = 'v' + vi;
    if (v.grid && Array.isArray(v.grid.areas)) {
      const pos = {};
      v.grid.areas.forEach((row, r) => row.trim().split(/\s+/).forEach((name, c) => {
        const p = pos[name] || (pos[name] = { r0: r, c0: c, r1: r, c1: c });
        p.r0 = Math.min(p.r0, r); p.c0 = Math.min(p.c0, c); p.r1 = Math.max(p.r1, r); p.c1 = Math.max(p.c1, c);
      }));
      (v.tiles || []).forEach(t => { const p = pos[t.id]; if (p) { t.w = p.c1 - p.c0 + 1; t.h = p.r1 - p.r0 + 1; t._o = p.r0 * 100 + p.c0; } else t._o = 1e6; });
      v.tiles.sort((a, b) => a._o - b._o); v.tiles.forEach(t => delete t._o);
      v.columns = v.grid.columns || 5;
      if (v.grid.rows === 'repeat(3, minmax(0,1fr)) minmax(0,.52fr)') v.rowSizes = [1, 1, 1, 0.52];
      delete v.grid;
    }
    v.columns = v.columns || 5;
    v.tiles = (v.tiles || []).map((t, i) => Object.assign({ id: t.id || ('k' + Date.now().toString(36) + i), w: 1, h: 1 }, t));
  });
  l.version = 2;
  return l;
}
function readLayout() {
  for (const f of [LAYOUT_FILE, DEFAULT_LAYOUT]) {
    try { return normalize(JSON.parse(fs.readFileSync(f, 'utf8'))); }
    catch (e) { if (f === LAYOUT_FILE && fs.existsSync(f)) log('Błąd w layout.json:', e.message, '– używam domyślnego'); }
  }
  return { views: [] };
}

// ---------- połączenie z HA ----------
const states = Object.create(null);
let ready = false, ws = null, msgId = 1;
// rejestr: pomieszczenia i przypisanie encji (do ekranu Dom); odświeżany po zmianach w HA
let reg = { name: '', areas: [], ent: {}, skip: {} };
let regT = null;
async function loadRegistry() {
  try {
    const [areas, devices, ents, cfg] = await Promise.all([
      send({ type: 'config/area_registry/list' }),
      send({ type: 'config/device_registry/list' }),
      send({ type: 'config/entity_registry/list_for_display' }),
      send({ type: 'get_config' }),
    ]);
    const devArea = {}, devInfo = {};
    (devices || []).forEach(d => { if (d.area_id) devArea[d.id] = d.area_id; devInfo[d.id] = { n: d.name_by_user || d.name || '', m: d.model || '' }; });
    const ent = {}, skip = {}, dev = {}, bdev = {}, bdevs = {};
    ((ents && ents.entities) || []).forEach(e => {
      const a = e.ai || (e.di && devArea[e.di]);
      if (a) ent[e.ei] = a;
      if (e.ec != null || e.hb) skip[e.ei] = 1;
      if (e.di && /^camera\./.test(e.ei)) dev[e.ei] = e.di;
      // urządzenia z baterią (ekran Baterie): encja → urządzenie, żeby pokazać jedno urządzenie raz
      if (e.di && /^(sensor|binary_sensor|device_tracker)\./.test(e.ei) && (/^device_tracker\./.test(e.ei) || /batter|bateri|charg|naladowa|_device$|state_of_charge|soc$/.test(e.ei))) { bdev[e.ei] = e.di; if (devInfo[e.di]) bdevs[e.di] = devInfo[e.di]; }
    });
    reg = { name: (cfg && cfg.location_name) || '', areas: (areas || []).map(a => ({ id: a.area_id, name: a.name, icon: a.icon || '' })), ent, skip, dev, bdev, bdevs };
    log('Rejestr: pomieszczenia', reg.areas.length, 'encje z pomieszczeniem', Object.keys(ent).length);
    broadcast('registry', 1);
  } catch (e) { log('Nie mogę wczytać rejestru:', e.message); }
}
const pending = new Map();
const clients = new Set();

function send(obj) {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== 1 || !ready) return reject(new Error('Brak połączenia z HA'));
    const id = msgId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ ...obj, id }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('Timeout HA')); } }, 15000);
  });
}

function broadcast(event, data) {
  const line = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(line);
}

function connect() {
  log('Łączę z HA:', HA_WS);
  ready = false;
  ws = new WebSocket(HA_WS);
  // zawieszone łączenie (HA w trakcie restartu) – po 20 s zaczynamy od nowa
  const me = ws, guard = setTimeout(() => { if (me === ws && !ready) { log('Brak odpowiedzi HA, łączę ponownie'); try { me.close(); } catch (e) { /* już zamknięte */ } setTimeout(() => { if (me === ws) connect(); }, 1000); } }, 20000);
  ws.onmessage = async (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'auth_required') ws.send(JSON.stringify({ type: 'auth', access_token: TOKEN }));
    else if (m.type === 'auth_invalid') log('HA odrzucił token:', m.message);
    else if (m.type === 'auth_ok') {
      clearTimeout(guard); ready = true; log('Połączono z HA', m.ha_version);
      try {
        const list = await send({ type: 'get_states' });
        for (const k in states) delete states[k];
        for (const s of list) states[s.entity_id] = s;
        await send({ type: 'subscribe_events', event_type: 'state_changed' });
        log('Stany:', list.length);
        broadcast('snapshot', states);
        await loadRegistry();
        autoSetup();
        for (const ev of ['area_registry_updated', 'device_registry_updated', 'entity_registry_updated']) await send({ type: 'subscribe_events', event_type: ev }).catch(() => {});
      } catch (e) { log('Błąd startu:', e.message); }
    } else if (m.type === 'result') {
      const p = pending.get(m.id); if (!p) return;
      pending.delete(m.id);
      m.success ? p.resolve(m.result) : p.reject(new Error((m.error && m.error.message) || 'Błąd HA'));
    } else if (m.type === 'event' && m.event && m.event.event_type === 'state_changed') {
      const d = m.event.data;
      if (d.new_state) states[d.entity_id] = d.new_state; else delete states[d.entity_id];
      broadcast('state', { id: d.entity_id, s: d.new_state || null });
    } else if (m.type === 'event' && m.event && /_registry_updated$/.test(m.event.event_type)) {
      clearTimeout(regT); regT = setTimeout(loadRegistry, 3000);
    }
  };
  ws.onclose = () => {
    clearTimeout(guard);
    if (me !== ws) return;
    ready = false;
    for (const [, p] of pending) p.reject(new Error('Rozłączono'));
    pending.clear();
    broadcast('status', { connected: false });
    log('Rozłączono z HA, ponawiam za 5 s');
    setTimeout(connect, 5000);
  };
  ws.onerror = () => {};
}

// ---------- prognoza (cache 10 min) ----------
const fcCache = new Map();
async function forecast(entity, type) {
  const key = entity + '|' + type, c = fcCache.get(key);
  if (c && Date.now() - c.t < 600000) return c.d;
  const r = await send({
    type: 'call_service', domain: 'weather', service: 'get_forecasts',
    service_data: { type }, target: { entity_id: entity }, return_response: true,
  });
  const d = (r && r.response && r.response[entity] && r.response[entity].forecast) || [];
  fcCache.set(key, { t: Date.now(), d });
  return d;
}

// ---------- statystyki z rekordera (wykresy, sumy miesięczne; cache 10 min) ----------
const stCache = new Map();
async function stats(ids, period, start) {
  const key = ids.join(',') + '|' + period + '|' + start.toISOString(), c = stCache.get(key);
  if (c && Date.now() - c.t < 600000) return c.d;
  const r = await send({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), statistic_ids: ids, period, types: ['change', 'mean', 'max', 'min'] });
  stCache.set(key, { t: Date.now(), d: r || {} });
  return r || {};
}

// ---------- HTTP ----------
const REPORTS = {};
let APPV = null;
function appVersion() {
  if (APPV) return APPV;
  try { const m = /VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(WWW, 'app.js'), 'utf8')); APPV = m ? m[1] : '0'; } catch (e) { APPV = '0'; }
  return APPV;
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
const IMG_DIR = path.join(CONFIG_DIR, 'img');
const WWW_DIR = process.env.PANEL_WWW_DIR || '/homeassistant/www'; // folder www HA = adresy /local/…
// album zdjęć Panelu: w mediach Home Assistanta (folder Panel – widać go w przeglądarce mediów HA), a bez mediów – w konfiguracji Panelu
const ALBUM_DIR = process.env.PANEL_ALBUM_DIR || (fs.existsSync('/media') ? '/media/Panel' : path.join(CONFIG_DIR, 'photos'));
const ALBUM_IN_MEDIA = ALBUM_DIR.indexOf('/media') === 0;
function listAlbum() {
  try { return fs.readdirSync(ALBUM_DIR).filter((n) => /\.(jpe?g|png|webp|gif)$/i.test(n) && n[0] !== '.').map((n) => ({ n, t: fs.statSync(path.join(ALBUM_DIR, n)).mtimeMs })).sort((a, b) => b.t - a.t).map((x) => x.n); } catch (e) { return []; }
}
let albumSession = 0, albumMode = 'album'; // do kiedy telefon może dodawać zdjęcia po zeskanowaniu kodu; album albo tło
const IMG_RE = /\.(jpe?g|png|webp|gif|svg)$/i;
function listWww() {
  const out = [];
  (function walk(dir, rel, depth) {
    let ents = []; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const d of ents) {
      if (out.length >= 400 || d.name.startsWith('.')) continue;
      if (d.isDirectory() && depth < 3 && d.name !== 'community') walk(path.join(dir, d.name), rel + d.name + '/', depth + 1);
      else if (d.isFile() && IMG_RE.test(d.name)) out.push(rel + d.name);
    }
  })(WWW_DIR, '', 0);
  return out.sort();
}
function sendFile(res, f, maxAge) {
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    const ext = path.extname(f).toLowerCase();
    res.writeHead(200, { 'Content-Type': ({ '.svg': 'image/svg+xml', '.gif': 'image/gif' })[ext] || IMG_MIME[ext] || 'application/octet-stream', 'Cache-Control': 'max-age=' + (maxAge || 3600) });
    res.end(data);
  });
}
const IMG_MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
function rawBody(req, max) {
  return new Promise((resolve, reject) => {
    const parts = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { reject(new Error('Plik za duży (max 8 MB)')); req.destroy(); } else parts.push(c); });
    req.on('end', () => resolve(Buffer.concat(parts)));
  });
}
function body(req) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(e); } });
  });
}

const server = http.createServer(async (req, res) => {
  // W HA wpuszczamy tylko ingress (172.30.32.2) – inne Apps w sieci hassio nie mają dostępu.
  if (process.env.SUPERVISOR_TOKEN && !process.env.HA_URL) {
    const ip = (req.socket.remoteAddress || '').replace('::ffff:', '');
    if (ip !== '172.30.32.2' && ip !== '127.0.0.1') { res.writeHead(403); return res.end(); }
  }
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      res.write('retry: 3000\n\n');
      clients.add(res);
      res.write(`event: status\ndata: ${JSON.stringify({ connected: ready })}\n\n`);
      if (ready) res.write(`event: snapshot\ndata: ${JSON.stringify(states)}\n\n`);
      const ping = setInterval(() => res.write('event: ping\ndata: 1\n\n'), 20000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    if (p === '/api/layout' && req.method === 'GET') return json(res, 200, readLayout());
    if (p === '/api/registry') return json(res, 200, reg);
    if (p === '/api/layout/default') return json(res, 200, normalize(JSON.parse(fs.readFileSync(DEFAULT_LAYOUT, 'utf8'))));
    if (p === '/api/layout' && req.method === 'PUT') {
      const l = await body(req);
      if (!l || !Array.isArray(l.views) || !l.views.length) return json(res, 400, { error: 'Układ musi mieć co najmniej jedną twarz' });
      try { if (fs.existsSync(LAYOUT_FILE)) fs.copyFileSync(LAYOUT_FILE, LAYOUT_FILE + '.prev'); } catch (e) { /* kopia nieobowiązkowa */ }
      snapshot('');
      fs.writeFileSync(LAYOUT_FILE, JSON.stringify(normalize(l), null, 2));
      broadcast('layout', { by: req.headers['x-panel-client'] || '' });
      return json(res, 200, { ok: true });
    }
    if (p === '/api/history' && req.method === 'GET') return json(res, 200, histList());
    if (p === '/api/history/restore' && req.method === 'POST') {
      const b = await body(req), id = path.basename(String((b && b.id) || ''));
      const f = path.join(HIST_DIR, id);
      if (!id.endsWith('.json') || !fs.existsSync(f)) return json(res, 404, { error: 'Nie ma takiej wersji' });
      const l = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!l || !Array.isArray(l.views) || !l.views.length) return json(res, 400, { error: 'Uszkodzona wersja' });
      snapshot('przed-przywroceniem', true);
      fs.writeFileSync(LAYOUT_FILE, JSON.stringify(normalize(l), null, 2));
      broadcast('layout', { by: 'restore' });
      return json(res, 200, { ok: true });
    }
    // zdalne sterowanie ekranami na czas testów (tylko przez ingress HA, czyli po zalogowaniu)
    if (p === '/api/remote' && req.method === 'POST') {
      const b = await body(req);
      if (!b || typeof b.cmd !== 'string' || !/^[a-z_]{1,24}$/.test(b.cmd)) return json(res, 400, { error: 'Zła komenda' });
      const msg = { id: Date.now().toString(36), cmd: b.cmd, arg: b.arg == null ? null : String(b.arg).slice(0, 200), target: String(b.target || 'android').slice(0, 40) };
      broadcast('remote', msg);
      // opcjonalnie: po chwili zrób zrzut ekranu tabletu (przycisk z Kiosk Satellite)
      if (/^button\.[a-z0-9_]+$/.test(b.shot || '')) {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        await wait(Math.min(8000, Math.max(500, +b.delay || 2500)));
        try { await send({ type: 'call_service', domain: 'button', service: 'press', service_data: {}, target: { entity_id: b.shot } }); } catch (e) { /* */ }
        await wait(1500);
      }
      return json(res, 200, { ok: true, sent: msg, displays: clients.size });
    }
    if (p === '/api/remote/report' && req.method === 'POST') {
      const b = await body(req);
      if (b && b.did) { REPORTS[String(b.did).slice(0, 40)] = Object.assign({ at: new Date().toISOString() }, b); }
      return json(res, 200, { ok: true });
    }
    if (p === '/api/remote/report') return json(res, 200, REPORTS);
    if (p === '/api/service' && req.method === 'POST') {
      const b = await body(req);
      if (!/^[a-z_]+$/.test(b.domain || '') || !/^[a-z_]+$/.test(b.service || '')) return json(res, 400, { error: 'Zła usługa' });
      const msg = { type: 'call_service', domain: b.domain, service: b.service, service_data: b.data || {} };
      if (b.target && typeof b.target === 'object') msg.target = b.target;
      if (b.return_response) msg.return_response = true;
      const r = await send(msg);
      return json(res, 200, { ok: true, result: r });
    }
    // listy zadań (todo) – zwykłe pobranie przez WebSocket HA
    if (p === '/api/todo') {
      const e = url.searchParams.get('entity') || '';
      if (!/^todo\.[a-z0-9_]+$/.test(e)) return json(res, 400, { error: 'Zła lista' });
      const r = await send({ type: 'todo/item/list', entity_id: e });
      return json(res, 200, (r && r.items) || []);
    }
    // wpis konfiguracji Music Assistant (potrzebny do wyszukiwania i biblioteki)
    if (p === '/api/ma/entry') {
      const r = await send({ type: 'config_entries/get', domain: 'music_assistant' });
      const e = (r || []).filter(x => x.state === 'loaded')[0] || (r || [])[0];
      return json(res, 200, { entry: e ? e.entry_id : null });
    }
    // okładki odtwarzaczy (entity_picture wymaga tokenu HA)
    if (p.startsWith('/api/art/')) {
      const e = decodeURIComponent(p.slice(9));
      if (!/^(media_player|person)\.[a-z0-9_]+$/.test(e)) return json(res, 400, { error: 'Zły obraz' });
      const pic = states[e] && states[e].attributes && states[e].attributes.entity_picture;
      if (!pic) { res.writeHead(404); return res.end(); }
      const r = await fetch(/^https?:/.test(pic) ? pic : `${HA_HTTP}${pic}`, { headers: /^https?:/.test(pic) ? {} : { Authorization: `Bearer ${TOKEN}` } });
      if (!r.ok) { res.writeHead(r.status); return res.end(); }
      res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'max-age=600' });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    // obrazki z Music Assistant (wyniki wyszukiwania) – tylko adresy http(s)
    if (p === '/api/img') {
      const u = url.searchParams.get('u') || '';
      if (!/^https?:\/\//.test(u)) { res.writeHead(400); return res.end(); }
      try {
        const r = await fetch(u); if (!r.ok) { res.writeHead(r.status); return res.end(); }
        const ct = r.headers.get('content-type') || '';
        if (!/^image\//.test(ct)) { res.writeHead(415); return res.end(); }
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'max-age=86400' });
        return res.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) { res.writeHead(502); return res.end(); }
    }
    if (p === '/api/forecast') {
      const e = url.searchParams.get('entity') || '', t = url.searchParams.get('type') || 'daily';
      if (!/^weather\.[a-z0-9_]+$/.test(e)) return json(res, 400, { error: 'Zła encja' });
      return json(res, 200, await forecast(e, t));
    }
    if (p === '/api/stats') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(x => /^[a-z_]+\.[a-z0-9_]+$/.test(x));
      const period = ['hour', 'day', 'week', 'month'].includes(url.searchParams.get('period')) ? url.searchParams.get('period') : 'day';
      if (!ids.length) return json(res, 400, { error: 'Brak encji' });
      const start = new Date(); start.setHours(0, 0, 0, 0);
      if (period === 'month') start.setDate(1);
      else if (period === 'hour') start.setTime(Date.now() - (parseInt(url.searchParams.get('hours'), 10) || 24) * 3600e3);
      else start.setDate(start.getDate() - ((parseInt(url.searchParams.get('days'), 10) || 14) - 1));
      return json(res, 200, await stats(ids, period, start));
    }
    if (p.startsWith('/api/image/')) {
      const e = decodeURIComponent(p.slice(11));
      if (!/^image\.[a-z0-9_]+$/.test(e)) return json(res, 400, { error: 'Złe zdjęcie' });
      const r = await fetch(`${HA_HTTP}/api/image_proxy/${e}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!r.ok) return json(res, r.status, { error: 'Zdjęcie niedostępne' });
      res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/png', 'Cache-Control': 'max-age=3600' });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    if (p === '/api/upload' && req.method === 'POST') {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[(req.headers['content-type'] || '').split(';')[0]];
      if (!ext) return json(res, 400, { error: 'Dozwolone: JPG, PNG, WEBP' });
      const name = (url.searchParams.get('name') || 'zdjecie').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 40) + '-' + Date.now().toString(36) + ext;
      const buf = await rawBody(req, 8 * 1024 * 1024);
      fs.mkdirSync(IMG_DIR, { recursive: true });
      fs.writeFileSync(path.join(IMG_DIR, name), buf);
      log('Zapisano zdjęcie', name, Math.round(buf.length / 1024) + ' KB');
      return json(res, 200, { path: 'img/' + name });
    }
    if (p === '/api/www') return json(res, 200, listWww());
    if (p === '/api/photos') {
      // źródło zdjęć dla twarzy Zdjęcia i kafla Zdjęcie: panel (album Panelu), www (folder www HA), all (oba)
      const src = url.searchParams.get('src') || 'all';
      const alb = listAlbum().map((n) => 'api/album/file/' + encodeURIComponent(n));
      const www = listWww().map(f => 'api/www/' + f.split('/').map(encodeURIComponent).join('/'));
      return json(res, 200, src === 'panel' ? alb : src === 'www' ? www : alb.concat(www));
    }
    if (p === '/api/album' && req.method === 'GET') return json(res, 200, { files: listAlbum(), media: ALBUM_IN_MEDIA, session: albumSession > Date.now(), mode: albumMode });
    if (p === '/api/album' && req.method === 'POST') {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[(req.headers['content-type'] || '').split(';')[0]];
      if (!ext) return json(res, 400, { error: 'Dozwolone: JPG, PNG, WEBP' });
      const buf = await rawBody(req, 12 * 1024 * 1024);
      fs.mkdirSync(ALBUM_DIR, { recursive: true });
      const d = new Date(), name = 'panel-' + d.toISOString().slice(0, 10) + '-' + Date.now().toString(36) + ext;
      fs.writeFileSync(path.join(ALBUM_DIR, name), buf);
      log('Album: dodano', name, Math.round(buf.length / 1024) + ' KB');
      broadcast('album', {});
      return json(res, 200, { name });
    }
    if (p === '/api/album/import' && req.method === 'POST') {
      const b = await body(req), rel = String((b && b.file) || '');
      const f = path.normalize(path.join(WWW_DIR, rel));
      if (!f.startsWith(WWW_DIR + path.sep) || !IMG_RE.test(f) || !fs.existsSync(f)) return json(res, 404, { error: 'Nie ma takiego zdjęcia' });
      fs.mkdirSync(ALBUM_DIR, { recursive: true });
      const name = 'panel-www-' + Date.now().toString(36) + '-' + path.basename(f).toLowerCase().replace(/[^a-z0-9_.-]+/g, '-');
      fs.copyFileSync(f, path.join(ALBUM_DIR, name));
      broadcast('album', {});
      return json(res, 200, { name });
    }
    if (p.startsWith('/api/album/file/')) {
      const n = path.basename(decodeURIComponent(p.slice(16)));
      if (req.method === 'DELETE') { try { fs.unlinkSync(path.join(ALBUM_DIR, n)); } catch (e) { return json(res, 404, { error: 'Nie ma takiego zdjęcia' }); } broadcast('album', {}); return json(res, 200, { ok: true }); }
      if (!/\.(jpe?g|png|webp|gif)$/i.test(n) || !fs.existsSync(path.join(ALBUM_DIR, n))) { res.writeHead(404); return res.end(); }
      return sendFile(res, path.join(ALBUM_DIR, n), 86400);
    }
    if (p === '/api/album/session' && req.method === 'POST') { const sb = await body(req).catch(() => null); albumMode = sb && sb.mode === 'bg' ? 'bg' : 'album'; albumSession = Date.now() + 10 * 60000; broadcast('album', { session: true }); return json(res, 200, { until: albumSession }); }
    if (p === '/api/album/session' && req.method === 'DELETE') { albumSession = 0; broadcast('album', {}); return json(res, 200, { ok: true }); }
    if (p === '/api/calendar') {
      const ids = (url.searchParams.get('ids') || '').split(',').filter(x => /^calendar\.[a-z0-9_]+$/.test(x)).slice(0, 20);
      const days = Math.min(62, parseInt(url.searchParams.get('days'), 10) || 31);
      const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start.getTime() + days * 864e5);
      const out = [];
      await Promise.all(ids.map(async id => {
        try {
          const r = await fetch(`${HA_HTTP}/api/calendars/${id}?start=${start.toISOString()}&end=${end.toISOString()}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
          if (!r.ok) return;
          (await r.json()).forEach(ev => out.push({ cal: id, summary: ev.summary || '', start: ev.start && (ev.start.dateTime || ev.start.date), end: ev.end && (ev.end.dateTime || ev.end.date), allDay: !!(ev.start && ev.start.date) }));
        } catch (e) { /* kalendarz niedostępny */ }
      }));
      out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
      return json(res, 200, out);
    }
    if (p === '/api/wwwfind') {
      const q = (url.searchParams.get('q') || '').toLowerCase(), hit = listWww().find(f => f.toLowerCase().includes(q));
      if (!q || !hit) { res.writeHead(404); return res.end(); }
      return sendFile(res, path.join(WWW_DIR, hit), 600);
    }
    if (p.startsWith('/api/www/')) {
      const f = path.normalize(path.join(WWW_DIR, decodeURIComponent(p.slice(9))));
      if (!f.startsWith(WWW_DIR + path.sep) || !IMG_RE.test(f)) { res.writeHead(403); return res.end(); }
      return sendFile(res, f, 3600);
    }
    if (p.startsWith('/api/file/img/')) {
      const f = path.normalize(path.join(IMG_DIR, decodeURIComponent(p.slice(14))));
      if (!f.startsWith(IMG_DIR + path.sep)) { res.writeHead(403); return res.end(); }
      return fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': IMG_MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'max-age=86400' });
        res.end(data);
      });
    }
    if (p.startsWith('/api/mdi/')) {
      const n = decodeURIComponent(p.slice(9)).replace(/^mdi:/, '').replace(/\.svg$/, '').toLowerCase();
      if (!/^[a-z0-9-]{1,64}$/.test(n)) return json(res, 400, { error: 'Zła nazwa ikony' });
      const dir = path.join(CONFIG_DIR, 'mdi'), f = path.join(dir, n + '.svg');
      let svg = null;
      try { svg = fs.readFileSync(f); } catch (e) { /* brak w pamięci */ }
      if (!svg) {
        try {
          const r = await fetch(`https://cdn.jsdelivr.net/npm/@mdi/svg@7/svg/${n}.svg`);
          if (!r.ok) return json(res, 404, { error: 'Nie ma takiej ikony' });
          svg = Buffer.from(await r.arrayBuffer());
          if (!/^<svg/.test(svg.toString('utf8', 0, 20).trim())) return json(res, 404, { error: 'Nie ma takiej ikony' });
          fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(f, svg);
        } catch (e) { return json(res, 502, { error: 'Brak internetu' }); }
      }
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=604800' });
      return res.end(svg);
    }
    if (p.startsWith('/api/camera/')) {
      const e = decodeURIComponent(p.slice(12));
      if (!/^camera\.[a-z0-9_]+$/.test(e)) return json(res, 400, { error: 'Zła kamera' });
      const r = await fetch(`${HA_HTTP}/api/camera_proxy/${e}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!r.ok) return json(res, r.status, { error: 'Kamera niedostępna' });
      res.writeHead(200, { 'Content-Type': r.headers.get('content-type') || 'image/jpeg', 'Cache-Control': 'no-store' });
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    if (p === '/api/version') return json(res, 200, { version: appVersion() });
    // pliki statyczne
    if (p === '/' || p === '/index.html') {
      const v = appVersion();
      let html = ''; try { html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8'); } catch (e) { res.writeHead(404); return res.end(); }
      html = html.replace(/(src|href)="([a-z0-9_-]+\.(js|css))"/g, (m, a, f) => `${a}="${f}?v=${v}"`);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }
    let f = path.normalize(path.join(WWW, p === '/' ? 'index.html' : p));
    if (!f.startsWith(WWW)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Nie ma'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(data);
    });
  } catch (e) {
    log('Błąd', p, e.message);
    if (!res.headersSent) json(res, 500, { error: e.message });
  }
});

// Pierwsze uruchomienie: układ dobierany automatycznie do encji w Twoim Home Assistant.
function autoSetup() {
  try {
    if (!fs.existsSync(LAYOUT_FILE)) return;
    const l = normalize(JSON.parse(fs.readFileSync(LAYOUT_FILE, 'utf8')));
    if (l.autoSetup) return;
    const ids = Object.keys(states), dom = d => ids.filter(e => e.startsWith(d + '.')).sort();
    const face = l.views.find(v => !v.page); if (!face) return;
    const add = (t, at) => { t.id = t.type + Math.random().toString(36).slice(2, 7); t.w = t.w || 1; t.h = t.h || 1; if (at == null) face.tiles.push(t); else face.tiles.splice(at, 0, t); };
    const allp = dom('person'), real = allp.filter(e => states[e].attributes && states[e].attributes.user_id);
    const people = (real.length ? real : allp).slice(0, 3);
    people.forEach((e, k) => add({ type: 'person', entity: e }, 1 + k));
    const cams = dom('camera').filter(e => !/screenshot|tablet|snapshot|notif/i.test(e));
    const bell = cams.find(e => /doorbell|dzwonek|entry|door/i.test(e));
    if (bell) add({ type: 'camera', entity: bell, name: 'Dzwonek', refresh: 2 }, 1 + people.length);
    const clim = dom('climate')[0]; if (clim) add({ type: 'thermostat', entity: clim, step: 0.5 }, 2 + people.length);
    const alarm = dom('alarm_control_panel')[0]; if (alarm) add({ type: 'alarm', entity: alarm, name: 'Alarm' });
    if (cams.length) add({ type: 'cameras', refresh: 10 });
    l.autoSetup = true;
    fs.writeFileSync(LAYOUT_FILE, JSON.stringify(l, null, 2));
    log('Pierwsze uruchomienie: dopasowano układ (osoby:', people.length, ', kamery:', cams.length, ', termostat:', !!clim, ', alarm:', !!alarm, ')');
    broadcast('layout', { by: 'auto' });
  } catch (e) { log('Automatyczny układ nieudany:', e.message); }
}

ensureLayout();
server.listen(PORT, () => log('Panel nasłuchuje na porcie', PORT));
connect();
