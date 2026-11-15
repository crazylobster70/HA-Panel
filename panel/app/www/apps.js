/* Panel 0.8 – mini-aplikacje: Muzyka (Music Assistant), Zegar (zegar światowy, budziki, minutniki), Przypomnienia (todo), Pogoda. ES5. */
(function () {
  var P = window.PANEL; if (!P) return;
  var esc = P.esc, st = P.st, stv = P.stv, attr = P.attr;
  var EN = !!(window.I18N && I18N.en);
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ls(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* */ } }
  function svc(domain, service, data, target, ret) {
    return P.api('service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain, service: service, data: data || {}, target: target, return_response: !!ret }) });
  }

  // ---------- wspólna nakładka aplikacji ----------
  var A = null; // { id, el, render, off }
  function openApp(id, render, opt) {
    closeApp();
    var el = $('apx'); if (!el) { el = document.createElement('div'); el.id = 'apx'; document.body.appendChild(el); }
    el.className = 'apx ' + (opt && opt.cls || '');
    A = { id: id, el: el, render: render, off: opt && opt.off };
    render(); return A;
  }
  function closeApp() { if (!A) return; if (A.off) A.off(); A.el.className = 'apx hidden'; A.el.innerHTML = ''; A = null; }
  function rerender() { if (A) A.render(); }
  var oldOpen = P.screenOpen;
  P.screenOpen = function () { return !!A || !!RING || (oldOpen ? oldOpen() : false); };
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && A) closeApp(); });
  function head(title, extra) { return '<div class="ap-h"><button class="fx" data-ap="close">✕</button><b>' + title + '</b>' + (extra || '') + '</div>'; }

  // ---------- dźwięk (WebAudio, odblokowany pierwszym dotknięciem) ----------
  var AC = null;
  document.addEventListener('pointerdown', function () { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { /* */ } }, true);
  function beep() {
    if (!AC) return;
    try {
      var t = AC.currentTime;
      [0, 0.18, 0.36].forEach(function (d) {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = 'sine'; o.frequency.value = 880; o.connect(g); g.connect(AC.destination);
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.4, t + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15);
        o.start(t + d); o.stop(t + d + 0.16);
      });
    } catch (e) { /* */ }
  }

  // =====================================================================
  //  MUZYKA
  // =====================================================================
  var M = { view: 'now', q: '', res: null, lib: null, entry: undefined, pick: false, busy: false };
  function maPlayers() {
    return P.ids().filter(function (e) { return e.indexOf('media_player.') === 0 && attr(e, 'mass_player_type') != null && stv(e) !== 'unavailable'; })
      .sort(function (a, b) { return (stv(b) === 'playing') - (stv(a) === 'playing') || String(attr(a, 'friendly_name')).localeCompare(String(attr(b, 'friendly_name')), 'pl'); });
  }
  function curPlayer() {
    var l = maPlayers(), p = ls('panel.mplayer', null);
    if (p && l.indexOf(p) >= 0) return p;
    return l[0] || null;
  }
  function pos(e) {
    var p = attr(e, 'media_position'), u = attr(e, 'media_position_updated_at');
    if (p == null) return null;
    if (stv(e) === 'playing' && u) p += (Date.now() - new Date(u).getTime()) / 1000;
    var d = attr(e, 'media_duration'); return d ? Math.min(p, d) : p;
  }
  function mmss(s) { if (s == null || isNaN(s)) return '–:––'; s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + pad(s % 60); }
  function art(e) { var p = attr(e, 'entity_picture'); return p ? 'api/art/' + e + '?v=' + encodeURIComponent(String(p).slice(-24)) : ''; }
  function imgUrl(u) { return !u ? '' : /^https?:/.test(u) ? 'api/img?u=' + encodeURIComponent(u) : u; }
  function maEntry(cb) {
    if (M.entry !== undefined) return cb(M.entry);
    P.api('ma/entry').then(function (r) { M.entry = r && r.entry; cb(M.entry); }).catch(function () { M.entry = null; cb(null); });
  }
  function renderMusic() {
    var e = curPlayer(), el = A.el;
    if (!e) { el.innerHTML = head('Muzyka') + '<div class="ap-empty">' + FI('music', 'rgba(255,255,255,.5)') + '<b>Brak głośników Music Assistant</b><small>Dodaj odtwarzacze w aplikacji Music Assistant w Home Assistant.</small></div>'; return; }
    var s = st(e), a = (s && s.attributes) || {}, playing = stv(e) === 'playing', has = !!a.media_title, img = art(e);
    var tabs = '<div class="mu-tabs"><button class="' + (M.view === 'now' ? 'on' : '') + '" data-mu="view" data-v="now">Teraz odtwarzane</button><button class="' + (M.view === 'lib' ? 'on' : '') + '" data-mu="view" data-v="lib">Biblioteka</button><button class="' + (M.view === 'search' ? 'on' : '') + '" data-mu="view" data-v="search">Szukaj</button></div>';
    var spk = '<button class="mu-spk" data-mu="pick">' + FI('speaker', '#fff') + '<span translate="no">' + esc(a.friendly_name || e) + '</span>⌄</button>';
    var body = '';
    if (M.view === 'now') {
      if (!has) body = '<div class="ap-empty">' + FI('music', 'rgba(255,255,255,.5)') + '<b>Nic nie gra</b><small>Wybierz coś w Bibliotece albo wyszukaj.</small><button class="fpill" data-mu="view" data-v="lib">Biblioteka</button></div>';
      else {
        var d = a.media_duration, p = pos(e), pct = d && p != null ? Math.min(100, p / d * 100) : 0;
        var sh = a.shuffle, rp = a.repeat || 'off', vol = a.volume_level != null ? Math.round(a.volume_level * 100) : null;
        body = '<div class="mu-now"><div class="mu-art"' + (img ? ' style="background-image:url(\'' + img + '\')"' : '') + '>' + (img ? '' : FI('music', 'rgba(255,255,255,.4)')) + '</div>' +
          '<div class="mu-ctl"><div class="mu-t"><b translate="no">' + esc(a.media_title) + '</b><span translate="no">' + esc([a.media_artist, a.media_album_name].filter(Boolean).join(' — ')) + '</span></div>' +
          '<div class="mu-prog"><div class="mu-bar"><i id="mubar" style="width:' + pct + '%"></i></div><div class="mu-tm"><span id="mupos">' + mmss(p) + '</span><span>' + (d ? '-' + mmss(d - (p || 0)) : '') + '</span></div></div>' +
          '<div class="mu-btns"><button class="sm' + (sh ? ' on' : '') + '" data-mu="shuffle" title="Losowo">' + FI('shuffle', '#fff') + '</button><button data-mu="prev">' + FI('prev', '#fff') + '</button>' +
          '<button class="big" data-mu="pp">' + FI(playing ? 'pause' : 'play', '#fff') + '</button><button data-mu="next">' + FI('next', '#fff') + '</button>' +
          '<button class="sm' + (rp !== 'off' ? ' on' : '') + '" data-mu="repeat" title="Powtarzaj">' + FI('repeat', '#fff') + (rp === 'one' ? '<em>1</em>' : '') + '</button></div>' +
          (vol != null ? '<div class="mu-vol">' + FI('vol', 'rgba(255,255,255,.7)') + '<input type="range" min="0" max="100" value="' + vol + '" data-mu="vol"><b>' + vol + '%</b></div>' : '') + '</div></div>';
      }
    } else if (M.view === 'lib') {
      if (!M.lib) { body = '<div class="ap-load">Wczytuję bibliotekę…</div>'; loadLib(); }
      else body = libSection('Playlisty', M.lib.playlist) + libSection('Radio', M.lib.radio) + libSection('Albumy', M.lib.album) + (!M.lib.playlist.length && !M.lib.radio.length && !M.lib.album.length ? '<div class="ap-empty"><b>Biblioteka jest pusta</b><small>' + (M.lib.err ? esc(M.lib.err) : 'Dodaj muzykę w Music Assistant.') + '</small></div>' : '');
    } else {
      body = '<div class="mu-search"><input class="fe-inp" data-mu="q" placeholder="Wykonawca, utwór, album, radio…" value="' + esc(M.q) + '"><button class="fpill" data-mu="go">Szukaj</button></div>';
      if (M.busy) body += '<div class="ap-load">Szukam…</div>';
      else if (M.res) {
        var r = M.res, any = false;
        [['tracks', 'Utwory'], ['artists', 'Wykonawcy'], ['albums', 'Albumy'], ['playlists', 'Playlisty'], ['radio', 'Radio']].forEach(function (k) {
          var l = r[k[0]] || []; if (!l.length) return; any = true;
          body += k[0] === 'tracks' ? '<div class="mu-sec">' + k[1] + '</div><div class="mu-list">' + l.map(function (x, i) { return '<button class="mu-row" data-mu="play" data-k="' + k[0] + '" data-i="' + i + '"><i style="background-image:url(\'' + imgUrl(x.image) + '\')"></i><span><b translate="no">' + esc(x.name) + '</b><small translate="no">' + esc((x.artists || []).map(function (y) { return y.name; }).join(', ') + (x.album ? ' — ' + x.album.name : '')) + '</small></span>' + FI('play', '#fff') + '</button>'; }).join('') + '</div>'
            : libSection(k[1], l, k[0]);
        });
        if (!any) body += '<div class="ap-empty"><b>Nic nie znaleziono</b></div>';
      }
    }
    var picker = M.pick ? '<div class="mu-pick"><div class="mu-pk">' + '<div class="mu-pkh">Odtwarzaj na</div>' + maPlayers().map(function (x) {
      return '<button data-mu="setp" data-e="' + x + '"><span><b translate="no">' + esc(attr(x, 'friendly_name') || x) + '</b><small>' + esc(stv(x) === 'playing' ? 'Gra: ' + (attr(x, 'media_title') || '') : (P.TR[stv(x)] || stv(x))) + '</small></span>' + (x === e ? '<em>✓</em>' : '') + '</button>';
    }).join('') + '</div></div>' : '';
    el.innerHTML = head('Muzyka', spk) + tabs + '<div class="ap-body">' + body + '</div>' + picker;
  }
  function libSection(title, list, key) {
    if (!list || !list.length) return '';
    key = key || title;
    return '<div class="mu-sec">' + title + '</div><div class="mu-grid">' + list.slice(0, 24).map(function (x, i) {
      return '<button class="mu-card" data-mu="play" data-k="' + esc(key) + '" data-i="' + i + '"><i style="background-image:url(\'' + imgUrl(x.image) + '\')">' + (x.image ? '' : FI(x.media_type === 'radio' ? 'speaker' : 'music', 'rgba(255,255,255,.5)')) + '</i><b translate="no">' + esc(x.name) + '</b><small translate="no">' + esc((x.artists || []).map(function (y) { return y.name; }).join(', ') || x.owner || '') + '</small></button>';
    }).join('') + '</div>';
  }
  function libKey(k) { return { Playlisty: 'playlist', Radio: 'radio', Albumy: 'album' }[k] || k; }
  function loadLib() {
    if (M.libLoading) return; M.libLoading = true;
    maEntry(function (id) {
      if (!id) { M.lib = { playlist: [], radio: [], album: [], err: 'Nie znaleziono Music Assistant w Home Assistant.' }; M.libLoading = false; return rerender(); }
      var out = { playlist: [], radio: [], album: [] }, n = 0;
      ['playlist', 'radio', 'album'].forEach(function (t) {
        svc('music_assistant', 'get_library', { config_entry_id: id, media_type: t, limit: 30, order_by: 'last_played' }, null, true)
          .then(function (r) { out[t] = (r && r.result && r.result.response && r.result.response.items) || []; })
          .catch(function () { /* */ })
          .then(function () { if (++n === 3) { M.lib = out; M.libLoading = false; if (A && A.id === 'music') rerender(); } });
      });
    });
  }
  function search() {
    if (!M.q.trim()) return;
    M.busy = true; rerender();
    maEntry(function (id) {
      if (!id) { M.busy = false; M.res = {}; return rerender(); }
      svc('music_assistant', 'search', { config_entry_id: id, name: M.q.trim(), limit: 8 }, null, true)
        .then(function (r) { M.res = (r && r.result && r.result.response) || {}; })
        .catch(function (e) { M.res = {}; P.toast('Nie udało się: ' + e.message); })
        .then(function () { M.busy = false; rerender(); });
    });
  }
  function playItem(k, i) {
    var src = M.view === 'search' ? (M.res || {})[k] : (M.lib || {})[libKey(k)];
    var x = src && src[+i], e = curPlayer(); if (!x || !e) return;
    svc('music_assistant', 'play_media', { media_id: x.uri, media_type: x.media_type, enqueue: 'replace' }, { entity_id: e })
      .then(function () { P.toast('Gra: ' + x.name); M.view = 'now'; rerender(); })
      .catch(function (er) { P.toast('Nie udało się: ' + er.message); });
  }
  function openMusic() {
    M.view = curPlayer() && attr(curPlayer(), 'media_title') ? 'now' : 'lib'; M.pick = false;
    var t = setInterval(function () {
      if (!A || A.id !== 'music' || M.view !== 'now') return;
      var e = curPlayer(), d = attr(e, 'media_duration'), p = pos(e), b = $('mubar'), ps = $('mupos');
      if (b && d && p != null) b.style.width = Math.min(100, p / d * 100) + '%'; if (ps) ps.textContent = mmss(p);
    }, 1000);
    openApp('music', renderMusic, { cls: 'dark', off: function () { clearInterval(t); } });
  }
  document.addEventListener('click', function (ev) {
    if (!A || A.id !== 'music') return;
    var b = ev.target.closest('[data-mu]'); if (!b) { if (M.pick && !ev.target.closest('.mu-pk')) { M.pick = false; rerender(); } return; }
    var k = b.getAttribute('data-mu'), e = curPlayer(), a = (st(e) || {}).attributes || {};
    if (k === 'view') { M.view = b.getAttribute('data-v'); M.pick = false; rerender(); if (M.view === 'search') { var q = A.el.querySelector('[data-mu=q]'); if (q) q.focus(); } }
    else if (k === 'pick') { M.pick = !M.pick; rerender(); }
    else if (k === 'setp') { lsSet('panel.mplayer', b.getAttribute('data-e')); M.pick = false; rerender(); }
    else if (k === 'pp') P.call('media_player', 'media_play_pause', {}, { entity_id: e });
    else if (k === 'prev') P.call('media_player', 'media_previous_track', {}, { entity_id: e });
    else if (k === 'next') P.call('media_player', 'media_next_track', {}, { entity_id: e });
    else if (k === 'shuffle') P.call('media_player', 'shuffle_set', { shuffle: !a.shuffle }, { entity_id: e });
    else if (k === 'repeat') P.call('media_player', 'repeat_set', { repeat: { off: 'all', all: 'one', one: 'off' }[a.repeat || 'off'] }, { entity_id: e });
    else if (k === 'go') search();
    else if (k === 'play') playItem(b.getAttribute('data-k'), b.getAttribute('data-i'));
  });
  document.addEventListener('change', function (ev) {
    if (!A || A.id !== 'music') return;
    var v = ev.target.closest && ev.target.closest('[data-mu=vol]'); if (!v) return;
    P.call('media_player', 'volume_set', { volume_level: +v.value / 100 }, { entity_id: curPlayer() });
  });
  document.addEventListener('input', function (ev) {
    if (!A || A.id !== 'music') return;
    var q = ev.target.closest && ev.target.closest('[data-mu=q]'); if (q) { M.q = q.value; return; }
    var v = ev.target.closest && ev.target.closest('[data-mu=vol]'); if (v && v.nextSibling) v.nextSibling.textContent = v.value + '%';
  });
  document.addEventListener('keydown', function (ev) { if (A && A.id === 'music' && ev.key === 'Enter' && ev.target.getAttribute && ev.target.getAttribute('data-mu') === 'q') search(); });

  // =====================================================================
  //  ZEGAR: zegar światowy, budziki, minutniki (na tym ekranie)
  // =====================================================================
  var ZONES = [['Europe/London', 'Londyn'], ['Europe/Warsaw', 'Warszawa'], ['Europe/Paris', 'Paryż'], ['Europe/Madrid', 'Madryt'], ['Europe/Rome', 'Rzym'],
    ['Europe/Athens', 'Ateny'], ['Europe/Kyiv', 'Kijów'], ['Europe/Istanbul', 'Stambuł'], ['Europe/Moscow', 'Moskwa'], ['Atlantic/Canary', 'Teneryfa'], ['Atlantic/Reykjavik', 'Reykjavik'],
    ['Asia/Dubai', 'Dubaj'], ['Asia/Kolkata', 'Delhi'], ['Asia/Bangkok', 'Bangkok'], ['Asia/Singapore', 'Singapur'], ['Asia/Shanghai', 'Pekin'], ['Asia/Tokyo', 'Tokio'],
    ['Australia/Sydney', 'Sydney'], ['Pacific/Auckland', 'Auckland'], ['America/New_York', 'Nowy Jork'], ['America/Chicago', 'Chicago'], ['America/Denver', 'Denver'],
    ['America/Los_Angeles', 'Los Angeles'], ['America/Toronto', 'Toronto'], ['America/Sao_Paulo', 'São Paulo'], ['America/Mexico_City', 'Meksyk'], ['Africa/Cairo', 'Kair'], ['Africa/Johannesburg', 'Johannesburg']];
  var Z = { tab: 'world', edit: false };
  function zoneParts(tz) {
    try {
      var f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()), o = {};
      f.forEach(function (x) { o[x.type] = x.value; });
      return { h: +o.hour % 24, m: +o.minute, d: +o.day, mo: +o.month, y: +o.year };
    } catch (e) { var n = new Date(); return { h: n.getHours(), m: n.getMinutes(), d: n.getDate(), mo: n.getMonth() + 1, y: n.getFullYear() }; }
  }
  function cities() { var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw'); return ls('panel.cities', [[tz, tz.split('/').pop().replace(/_/g, ' ')]]); }
  function alarms() { return ls('panel.alarms', []); }
  function timers() { return ls('panel.timers', []); }
  function startTimer(sec, label) {
    var l = timers(); l.push({ id: Date.now().toString(36), dur: sec, end: Date.now() + sec * 1000, label: label || '' }); lsSet('panel.timers', l);
    P.toast('Minutnik: ' + fmtDur(sec)); rerender(); refreshLauncher();
  }
  function fmtDur(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); }
  function left(t) { return t.paused ? t.left : Math.max(0, (t.end - Date.now()) / 1000); }
  var DAYSL = EN ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'];
  function renderClock() {
    var el = A.el, here = new Date(), body = '';
    var tabs = '<div class="mu-tabs"><button class="' + (Z.tab === 'world' ? 'on' : '') + '" data-zc="tab" data-v="world">Zegar światowy</button><button class="' + (Z.tab === 'alarm' ? 'on' : '') + '" data-zc="tab" data-v="alarm">Budziki</button><button class="' + (Z.tab === 'timer' ? 'on' : '') + '" data-zc="tab" data-v="timer">Minutniki</button></div>';
    if (Z.tab === 'world') {
      var hOff = -here.getTimezoneOffset() / 60;
      body = '<div class="zc-list">' + cities().map(function (c, i) {
        var z = zoneParts(c[0]), diff = Math.round(((z.h * 60 + z.m) - (here.getHours() * 60 + here.getMinutes())) / 30) / 2, dd = z.d !== here.getDate() ? (new Date(z.y, z.mo - 1, z.d) > here ? 'Jutro' : 'Wczoraj') : 'Dziś';
        if (dd === 'Jutro' && diff < 0) diff += 24; if (dd === 'Wczoraj' && diff > 0) diff -= 24;
        var off = diff === 0 ? 'ten sam czas' : (diff > 0 ? '+' : '') + String(diff).replace('.', ',') + ' godz.';
        return '<div class="zc-row">' + (Z.edit ? '<b class="rdel" data-zc="delc" data-i="' + i + '">−</b>' : '') + '<div><small>' + dd + ', ' + off + '</small><b translate="no">' + esc(c[1]) + '</b></div><span class="zc-t">' + z.h + ':' + pad(z.m) + '</span></div>';
      }).join('') + '</div><div class="zc-bar"><button class="fpill" data-zc="addc">＋ Dodaj miasto</button><button class="fpill" data-zc="edit">' + (Z.edit ? 'Gotowe' : 'Edytuj') + '</button></div>';
      void hOff;
    } else if (Z.tab === 'alarm') {
      var al = alarms();
      body = '<div class="zc-list">' + (al.length ? al.map(function (x, i) {
        var dl = x.days && x.days.length ? (x.days.length === 7 ? 'Codziennie' : x.days.length === 5 && x.days.indexOf(0) < 0 && x.days.indexOf(6) < 0 ? 'Dni robocze' : x.days.map(function (d) { return DAYSL[d]; }).join(' ')) : 'Jednorazowo';
        return '<div class="zc-row al' + (x.on ? '' : ' off') + '">' + (Z.edit ? '<b class="rdel" data-zc="dela" data-i="' + i + '">−</b>' : '') + '<div data-zc="edita" data-i="' + i + '"><span class="zc-t">' + x.h + ':' + pad(x.m) + '</span><small>' + esc((x.label ? x.label + ' · ' : '') + dl) + '</small></div><button class="tgl' + (x.on ? ' on' : '') + '" data-zc="tgla" data-i="' + i + '"><i></i></button></div>';
      }).join('') : '<div class="ap-empty"><b>Brak budzików</b><small>Budzik zadzwoni na tym ekranie.</small></div>') + '</div><div class="zc-bar"><button class="fpill" data-zc="adda">＋ Nowy budzik</button>' + (al.length ? '<button class="fpill" data-zc="edit">' + (Z.edit ? 'Gotowe' : 'Edytuj') + '</button>' : '') + '</div>';
    } else {
      var tl = timers();
      body = '<div class="zc-quick">' + [1, 3, 5, 10, 15, 30, 60].map(function (m) { return '<button data-zc="qt" data-v="' + m * 60 + '"><b>' + (m === 60 ? '1' : m) + '</b><small>' + (m === 60 ? 'GODZ.' : 'MIN') + '</small></button>'; }).join('') + '<button data-zc="ct"><b>＋</b><small>INNY</small></button></div>' +
        '<div class="zc-list tm">' + tl.map(function (t, i) {
          var l0 = left(t), pct = t.dur ? (1 - l0 / t.dur) * 100 : 0;
          return '<div class="zc-row tm"><div class="zc-ring" style="background:conic-gradient(#ff9f0a ' + pct + '%,rgba(255,255,255,.12) 0)"><i></i></div><div><span class="zc-t" data-tl="' + t.id + '">' + fmtDur(l0) + '</span><small>' + esc(t.label || ('Minutnik ' + fmtDur(t.dur))) + '</small></div>' +
            '<button class="zc-b" data-zc="tplus" data-i="' + i + '">+1 min</button><button class="zc-b ' + (t.paused ? 'go' : '') + '" data-zc="tpause" data-i="' + i + '">' + FI(t.paused ? 'play' : 'pause', '#fff') + '</button><button class="zc-b red" data-zc="tdel" data-i="' + i + '">✕</button></div>';
        }).join('') + '</div>' + (tl.length ? '' : '<div class="ap-empty small"><small>Minutniki działają na tym ekranie i dzwonią, gdy czas minie.</small></div>');
    }
    el.innerHTML = head('Zegar', '<span class="ap-clock">' + here.getHours() + ':' + pad(here.getMinutes()) + '</span>') + tabs + '<div class="ap-body">' + body + '</div>';
  }
  function openClock(tab) { if (tab) Z.tab = tab; Z.edit = false; openApp('clock', renderClock, { cls: 'dark' }); }
  // edytor budzika / własnego minutnika (okno #pop)
  function alarmEditor(i) {
    var l = alarms(), x = i != null ? JSON.parse(JSON.stringify(l[i])) : { h: 7, m: 0, days: [1, 2, 3, 4, 5], on: true, label: '' };
    P.openPop(function () {
      return '<h2>' + (i != null ? 'Budzik' : 'Nowy budzik') + '<button class="x" data-close>×</button></h2>' +
        '<div class="zc-set"><div class="zc-step"><button data-pact="h-">−</button><b>' + pad(x.h) + '</b><button data-pact="h+">+</button></div><span>:</span><div class="zc-step"><button data-pact="m-">−</button><b>' + pad(x.m) + '</b><button data-pact="m+">+</button></div></div>' +
        '<div class="zc-days">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) { return '<button class="' + (x.days.indexOf(d) >= 0 ? 'on' : '') + '" data-pact="day" data-d="' + d + '">' + DAYSL[d] + '</button>'; }).join('') + '</div>' +
        '<input class="inp" data-pin="lbl" placeholder="Etykieta (np. Praca)" value="' + esc(x.label) + '">' +
        '<div class="btns"><button class="btn" data-close>Anuluj</button><button class="btn blue" data-pact="save">Zapisz</button></div>';
    }, { static: true, cls: 'editor', acts: {
      'h-': function () { x.h = (x.h + 23) % 24; P.refreshPop(); }, 'h+': function () { x.h = (x.h + 1) % 24; P.refreshPop(); },
      'm-': function () { x.m = (x.m + 55) % 60; P.refreshPop(); }, 'm+': function () { x.m = (x.m + 5) % 60; P.refreshPop(); },
      day: function (el) { var d = +el.getAttribute('data-d'), k = x.days.indexOf(d); if (k >= 0) x.days.splice(k, 1); else x.days.push(d); P.refreshPop(); },
      save: function () { var l2 = alarms(); x.on = true; x.fired = null; if (i != null) l2[i] = x; else l2.push(x); l2.sort(function (a, b) { return a.h * 60 + a.m - (b.h * 60 + b.m); }); lsSet('panel.alarms', l2); P.closePop(); rerender(); P.toast('Budzik na ' + x.h + ':' + pad(x.m)); }
    }, inputs: { lbl: function (el) { x.label = el.value; } } });
  }
  function timerEditor() {
    var x = { m: 20, s: 0, label: '' };
    P.openPop(function () {
      return '<h2>Minutnik<button class="x" data-close>×</button></h2><div class="zc-set"><div class="zc-step"><button data-pact="m-">−</button><b>' + x.m + '<small> min</small></b><button data-pact="m+">+</button></div><div class="zc-step"><button data-pact="s-">−</button><b>' + pad(x.s) + '<small> s</small></b><button data-pact="s+">+</button></div></div>' +
        '<input class="inp" data-pin="lbl" placeholder="Etykieta (np. Makaron)" value="' + esc(x.label) + '"><div class="btns"><button class="btn" data-close>Anuluj</button><button class="btn blue" data-pact="go">Start</button></div>';
    }, { static: true, cls: 'editor', acts: {
      'm-': function () { x.m = Math.max(0, x.m - 1); P.refreshPop(); }, 'm+': function () { x.m = Math.min(600, x.m + 1); P.refreshPop(); },
      's-': function () { x.s = (x.s + 45) % 60; P.refreshPop(); }, 's+': function () { x.s = (x.s + 15) % 60; P.refreshPop(); },
      go: function () { var s = x.m * 60 + x.s; if (!s) return; P.closePop(); startTimer(s, x.label); }
    }, inputs: { lbl: function (el) { x.label = el.value; } } });
  }
  function cityPicker() {
    var have = {}; cities().forEach(function (c) { have[c[0] + c[1]] = 1; });
    P.openPop(function () {
      return '<h2>Dodaj miasto<button class="x" data-close>×</button></h2>' + ZONES.filter(function (z) { return !have[z[0] + z[1]]; }).map(function (z, i) {
        var p = zoneParts(z[0]); return '<div class="lrow pick" data-pact="c" data-tz="' + z[0] + '" data-n="' + esc(z[1]) + '"><span><b>' + esc(z[1]) + '</b><small>' + z[0] + '</small></span><span>' + p.h + ':' + pad(p.m) + '</span></div>';
      }).join('');
    }, { static: true, cls: 'editor', acts: { c: function (el) { var l = cities(); l.push([el.getAttribute('data-tz'), el.getAttribute('data-n')]); lsSet('panel.cities', l); P.closePop(); rerender(); } } });
  }
  document.addEventListener('click', function (ev) {
    if (!A || A.id !== 'clock') return;
    var b = ev.target.closest('[data-zc]'); if (!b) return;
    var k = b.getAttribute('data-zc'), i = +b.getAttribute('data-i'), l;
    if (k === 'tab') { Z.tab = b.getAttribute('data-v'); Z.edit = false; rerender(); }
    else if (k === 'edit') { Z.edit = !Z.edit; rerender(); }
    else if (k === 'addc') cityPicker();
    else if (k === 'delc') { l = cities(); l.splice(i, 1); lsSet('panel.cities', l); rerender(); }
    else if (k === 'adda') alarmEditor(null);
    else if (k === 'edita') { if (!Z.edit) alarmEditor(i); }
    else if (k === 'dela') { l = alarms(); l.splice(i, 1); lsSet('panel.alarms', l); rerender(); }
    else if (k === 'tgla') { l = alarms(); l[i].on = !l[i].on; l[i].fired = null; lsSet('panel.alarms', l); rerender(); }
    else if (k === 'qt') startTimer(+b.getAttribute('data-v'));
    else if (k === 'ct') timerEditor();
    else if (k === 'tplus') { l = timers(); if (l[i].paused) l[i].left += 60; else l[i].end += 60000; l[i].dur += 60; lsSet('panel.timers', l); rerender(); }
    else if (k === 'tpause') { l = timers(); var t = l[i]; if (t.paused) { t.end = Date.now() + t.left * 1000; t.paused = false; } else { t.left = left(t); t.paused = true; } lsSet('panel.timers', l); rerender(); }
    else if (k === 'tdel') { l = timers(); l.splice(i, 1); lsSet('panel.timers', l); rerender(); refreshLauncher(); }
  });

  // ---------- dzwonienie (budzik / minutnik) – działa też przy zamkniętej aplikacji ----------
  var RING = null;
  function ring(title, sub, snooze) {
    if (RING) return;
    var el = $('ring'); if (!el) { el = document.createElement('div'); el.id = 'ring'; document.body.appendChild(el); }
    el.className = 'ring-o';
    var d = new Date();
    el.innerHTML = '<div class="ring-t">' + d.getHours() + ':' + pad(d.getMinutes()) + '</div><b>' + esc(title) + '</b><small>' + esc(sub || '') + '</small><div class="ring-b">' + (snooze ? '<button data-rg="snooze">Drzemka 9 min</button>' : '') + '<button class="stop" data-rg="stop">Stop</button></div>';
    RING = { snooze: snooze, t: setInterval(beep, 1200), auto: setTimeout(stopRing, 10 * 60000) };
    beep();
    if (navigator.vibrate) try { navigator.vibrate([400, 200, 400]); } catch (e) { /* */ }
  }
  function stopRing() { if (!RING) return; clearInterval(RING.t); clearTimeout(RING.auto); RING = null; var el = $('ring'); if (el) { el.className = 'ring-o hidden'; el.innerHTML = ''; } }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('#ring [data-rg]'); if (!b || !RING) return;
    if (b.getAttribute('data-rg') === 'snooze' && RING.snooze) RING.snooze();
    stopRing();
  });
  setInterval(function () {
    var now = new Date(), changed = false;
    // minutniki
    var tl = timers(), keep = [];
    tl.forEach(function (t) {
      if (!t.paused && t.end <= Date.now()) { ring('Minutnik', t.label || fmtDur(t.dur), null); changed = true; }
      else keep.push(t);
    });
    if (changed) { lsSet('panel.timers', keep); rerender(); refreshLauncher(); }
    // odliczanie w otwartej aplikacji
    if (A && A.id === 'clock' && Z.tab === 'timer') keep.forEach(function (t) { var s = document.querySelector('[data-tl="' + t.id + '"]'); if (s) { s.textContent = fmtDur(left(t)); var r = s.closest('.zc-row').querySelector('.zc-ring'); if (r) r.style.background = 'conic-gradient(#ff9f0a ' + ((1 - left(t) / t.dur) * 100) + '%,rgba(255,255,255,.12) 0)'; } });
    // budziki
    var al = alarms(), key = now.toDateString() + ' ' + now.getHours() + ':' + now.getMinutes(), ach = false;
    al.forEach(function (x) {
      var due = x.snoozeUntil ? (Date.now() >= x.snoozeUntil) : (x.on && x.h === now.getHours() && x.m === now.getMinutes() && (!x.days || !x.days.length || x.days.indexOf(now.getDay()) >= 0));
      if (due && x.fired !== key) {
        x.fired = key; ach = true;
        if (x.snoozeUntil) delete x.snoozeUntil;
        if (!x.days || !x.days.length) x.on = false;
        ring('Budzik', x.label || (x.h + ':' + pad(x.m)), function () { var l = alarms(); l.forEach(function (y) { if (y.h === x.h && y.m === x.m && y.label === x.label) y.snoozeUntil = Date.now() + 9 * 60000; }); lsSet('panel.alarms', l); });
      }
    });
    if (ach) { lsSet('panel.alarms', al); rerender(); }
    if (A && A.id === 'clock' && now.getSeconds() === 0 && Z.tab !== 'timer') rerender();
  }, 1000);

  // =====================================================================
  //  PRZYPOMNIENIA (listy todo z Home Assistanta)
  // =====================================================================
  var R = { list: null, items: null, q: '', loading: false };
  function todoLists() { return P.ids().filter(function (e) { return e.indexOf('todo.') === 0 && stv(e) !== 'unavailable'; }).sort(function (a, b) { return String(attr(a, 'friendly_name')).localeCompare(String(attr(b, 'friendly_name')), 'pl'); }); }
  function loadItems() {
    if (!R.list) return; R.loading = true;
    P.api('todo?entity=' + encodeURIComponent(R.list)).then(function (l) { R.items = l || []; }).catch(function () { R.items = []; }).then(function () { R.loading = false; if (A && A.id === 'rem') rerender(); });
  }
  function renderRem() {
    var lists = todoLists(), el = A.el;
    if (!lists.length) { el.innerHTML = head('Przypomnienia') + '<div class="ap-empty">' + FI('check2', 'rgba(255,255,255,.5)') + '<b>Brak list</b><small>W Home Assistant dodaj integrację „Lokalna lista zadań” (Ustawienia → Urządzenia i usługi → Dodaj integrację), a lista pojawi się tutaj.</small></div>'; return; }
    if (!R.list || lists.indexOf(R.list) < 0) { R.list = lists[0]; R.items = null; loadItems(); }
    var items = R.items || [], open = items.filter(function (x) { return x.status !== 'completed'; }), done = items.filter(function (x) { return x.status === 'completed'; });
    var row = function (x) {
      var due = x.due ? new Date(String(x.due).length <= 10 ? x.due + 'T00:00' : x.due) : null;
      return '<div class="rm-row' + (x.status === 'completed' ? ' done' : '') + '"><button class="rm-c" data-rm="tgl" data-u="' + esc(x.uid) + '" data-s="' + x.status + '"></button><div><b translate="no">' + esc(x.summary) + '</b>' + (due ? '<small class="' + (due < new Date() && x.status !== 'completed' ? 'late' : '') + '">' + due.getDate() + ' ' + P.MON[due.getMonth()] + (String(x.due).length > 10 ? ', ' + due.getHours() + ':' + pad(due.getMinutes()) : '') + '</small>' : '') + (x.description ? '<small translate="no">' + esc(x.description) + '</small>' : '') + '</div></div>';
    };
    el.innerHTML = head('Przypomnienia') + '<div class="rm"><div class="rm-lists">' + lists.map(function (e) {
      return '<button class="' + (e === R.list ? 'on' : '') + '" data-rm="list" data-e="' + e + '"><i>' + FI('check2', '#fff') + '</i><span translate="no">' + esc(attr(e, 'friendly_name') || e) + '</span><b>' + (stv(e) || 0) + '</b></button>';
    }).join('') + '</div><div class="rm-main"><h2 translate="no">' + esc(attr(R.list, 'friendly_name') || '') + '</h2>' +
      '<div class="rm-add"><input class="fe-inp" data-rm="new" placeholder="Nowe przypomnienie…"><button class="fpill" data-rm="add">Dodaj</button></div>' +
      (R.items === null ? '<div class="ap-load">Wczytuję…</div>' : (open.length ? open.map(row).join('') : '<div class="ap-empty small"><small>Wszystko zrobione</small></div>') +
        (done.length ? '<div class="mu-sec">Ukończone (' + done.length + ')<button class="rm-clr" data-rm="clr">Usuń ukończone</button></div>' + done.slice(0, 30).map(row).join('') : '')) + '</div></div>';
  }
  function openRem() { openApp('rem', renderRem, { cls: 'dark' }); if (R.list) loadItems(); }
  function addItem() {
    var i = A.el.querySelector('[data-rm=new]'), v = i && i.value.trim(); if (!v) return;
    svc('todo', 'add_item', { item: v }, { entity_id: R.list }).then(function () { loadItems(); }).catch(function (e) { P.toast('Nie udało się: ' + e.message); });
    i.value = '';
  }
  document.addEventListener('click', function (ev) {
    if (!A || A.id !== 'rem') return;
    var b = ev.target.closest('[data-rm]'); if (!b) return;
    var k = b.getAttribute('data-rm');
    if (k === 'list') { R.list = b.getAttribute('data-e'); R.items = null; rerender(); loadItems(); }
    else if (k === 'add') addItem();
    else if (k === 'tgl') { var u = b.getAttribute('data-u'), s = b.getAttribute('data-s'); b.parentNode.classList.toggle('done'); svc('todo', 'update_item', { item: u, status: s === 'completed' ? 'needs_action' : 'completed' }, { entity_id: R.list }).then(loadItems).catch(function (e) { P.toast('Nie udało się: ' + e.message); }); }
    else if (k === 'clr') svc('todo', 'remove_completed_items', {}, { entity_id: R.list }).then(loadItems);
  });
  document.addEventListener('keydown', function (ev) { if (A && A.id === 'rem' && ev.key === 'Enter' && ev.target.getAttribute && ev.target.getAttribute('data-rm') === 'new') addItem(); });

  // odświeżanie po zmianach w HA
  var oldHook = P.hook;
  P.hook = function (id) {
    if (oldHook) oldHook(id);
    if (!A) return;
    if (A.id === 'music' && id.indexOf('media_player.') === 0 && (id === curPlayer() || M.pick)) { clearTimeout(M.rt); M.rt = setTimeout(rerender, 150); }
    if (A.id === 'rem' && id === R.list) { clearTimeout(R.rt); R.rt = setTimeout(loadItems, 300); }
  };

  // =====================================================================
  //  menu od dołu: aplikacje i widżety
  // =====================================================================
  if (P.APPS) {
    P.APPS.music = { n: 'Muzyka', ic: 'music', bg: 'linear-gradient(160deg,#ff6482,#e21b3c)', go: openMusic };
    P.APPS.clock = { n: 'Zegar', ic: 'clock', bg: 'linear-gradient(160deg,#3a3a3c,#000)', go: function () { openClock(); } };
    P.APPS.reminders = { n: 'Przypomnienia', ic: 'check2', bg: 'linear-gradient(160deg,#ffb340,#ff7a00)', go: openRem };
    P.APPS.weather = { n: 'Pogoda', ic: 'cloud', bg: 'linear-gradient(160deg,#5ab0ff,#1e6fd9)', go: function () { if (P.openWeather) P.openWeather(); } };
  }
  if (P.WIDGETS) {
    P.WIDGETS.music = 'Muzyka'; P.WIDGETS.timers = 'Minutniki';
    P.WRENDER.music = function () {
      var e = curPlayer(), a = e ? ((st(e) || {}).attributes || {}) : {}, img = e ? art(e) : '', pl = e && stv(e) === 'playing';
      return '<div class="lw mus"' + (img ? ' style="background-image:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.65)),url(\'' + img + '\')"' : '') + '><small>' + FI('music', '#fff') + '</small><span class="mt"><b translate="no">' + esc(a.media_title || 'Nic nie gra') + '</b><em translate="no">' + esc(a.media_artist || (e ? attr(e, 'friendly_name') : '')) + '</em></span>' +
        (a.media_title ? '<button class="mpp" data-wm="pp">' + FI(pl ? 'pause' : 'play', '#fff') + '</button>' : '') + '</div>';
    };
    P.WTAP.music = function (t) { if (t && t.closest && t.closest('[data-wm=pp]')) { P.call('media_player', 'media_play_pause', {}, { entity_id: curPlayer() }); return; } openMusic(); };
    P.WRENDER.timers = function () {
      var tl = timers(), t = tl[0];
      return '<div class="lw tim"><small>Minutniki</small>' + (t ? '<b class="tl">' + fmtDur(left(t)) + '</b><span>' + esc(t.label || 'Minutnik') + (tl.length > 1 ? ' +' + (tl.length - 1) : '') + '</span>' :
        '<div class="tq">' + [5, 10, 15].map(function (m) { return '<button data-wt="' + m + '"><b>' + m + '</b><small>MIN</small></button>'; }).join('') + '</div>') + '</div>';
    };
    P.WTAP.timers = function (t) { var q = t && t.closest && t.closest('[data-wt]'); if (q) { startTimer(+q.getAttribute('data-wt') * 60); return; } openClock('timer'); };
  }
  function refreshLauncher() { var l = $('lnch'); if (l && !l.classList.contains('hidden') && P.openLauncher && P.renderLauncher) P.renderLauncher(); }
  // tykanie widżetu minutnika w otwartym menu
  setInterval(function () { var l = $('lnch'); if (!l || l.classList.contains('hidden')) return; var tl = timers(), b = l.querySelector('.tim .tl'); if (b && tl[0]) b.textContent = fmtDur(left(tl[0])); }, 1000);

  P.openMusic = openMusic; P.openClock = openClock; P.openReminders = openRem; P.closeApp = closeApp;
  document.addEventListener('click', function (ev) { if (A && ev.target.closest && ev.target.closest('[data-ap="close"]')) closeApp(); });
})();
