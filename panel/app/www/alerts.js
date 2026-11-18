/* Panel 0.9.39 – paski z alertami na górze ekranu i historia układu. ES5. */
(function () {
  var P = window.PANEL; if (!P) return;
  var esc = P.esc, stv = P.stv, attr = P.attr;
  function $(id) { return document.getElementById(id); }
  function T(s) { return window.I18N && I18N.t ? I18N.t(s) : s; }

  // ---------- ustawienia (wspólne, w układzie) ----------
  var DEF = { on: true, doors: true, doorMin: 10, battery: true, batLow: 15, car: true, alarm: true };
  function cfg() { var a = (P.layout() && P.layout().alerts) || {}, o = {}; for (var k in DEF) o[k] = a[k] != null ? a[k] : DEF[k]; return o; }
  function setCfg(k, v) { P.change(function () { var l = P.layout(); l.alerts = l.alerts || {}; l.alerts[k] = v; }, false); }

  // ukryte przez użytkownika: klucz alertu → stan, przy którym go ukryto (wraca, gdy stan się zmieni)
  var hidden = {};
  try { hidden = JSON.parse(localStorage.getItem('panel.alerts.hidden') || '{}') || {}; } catch (e) { hidden = {}; }
  function saveHidden() { try { localStorage.setItem('panel.alerts.hidden', JSON.stringify(hidden)); } catch (e) { /* */ } }

  function name(e) { return String(attr(e, 'friendly_name') || e); }
  function mins(e) { var s = P.st(e); if (!s || !s.last_changed) return 0; return Math.floor((Date.now() - new Date(s.last_changed).getTime()) / 60000); }
  function ago(m) { return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }

  function collect() {
    var c = cfg(), out = [], ids = P.ids();
    if (!c.on) return out;
    if (c.doors) {
      var open = ids.filter(function (e) {
        return e.indexOf('binary_sensor.') === 0 && /^(door|window|garage_door|opening)$/.test(attr(e, 'device_class') || '') && stv(e) === 'on' && mins(e) >= c.doorMin;
      });
      if (open.length) out.push({ key: 'doors', sig: open.join(','), lvl: 'warn', icon: 'door',
        text: open.length === 1 ? T('Otwarte') + ': ' + name(open[0]) + ' · ' + ago(mins(open[0])) : T('Otwarte') + ': ' + open.length + ' ' + T('drzwi i okna'),
        go: function () { P.openScreen && P.openScreen('contacts'); } });
    }
    if (c.battery) {
      var low;
      if (P.batteries) { var bb = P.batteries(); low = bb.all.concat(bb.mobile.filter(function (x) { return !x.ch; })).filter(function (x) { return x.v < c.batLow; }); }
      else low = ids.filter(function (e) {
        if (e.indexOf('sensor.') !== 0 || attr(e, 'device_class') !== 'battery' || attr(e, 'unit_of_measurement') !== '%') return false;
        var v = parseFloat(stv(e)); return !isNaN(v) && v < c.batLow;
      }).map(function (e) { return { e: e, n: name(e), v: parseFloat(stv(e)) }; });
      if (low.length) out.push({ key: 'battery', sig: low.map(function (x) { return x.e; }).join(','), lvl: 'info', icon: 'battery',
        text: low.length === 1 ? T('Słaba bateria') + ': ' + low[0].n + ' ' + Math.round(low[0].v) + '%' : T('Słaba bateria') + ': ' + low.length + ' ' + T('urządzeń'),
        go: function () { P.openScreen && P.openScreen('batteries'); } });
    }
    if (c.car) {
      var lay = P.layout() || {};
      (lay.views || []).forEach(function (v) {
        (v.tiles || []).forEach(function (t) {
          if (t.type !== 'car' || !t.battery) return;
          var b = parseFloat(stv(t.battery)), ch = String(stv(t.charging) || '').toLowerCase();
          var plugged = t.plug ? String(stv(t.plug)) === String(t.plug_on || 'on') : true;
          var done = /^(complete|completed|finished|fully_charged|full|charged)$/.test(ch) || (b >= 100 && plugged);
          if (done && plugged) out.push({ key: 'car-' + t.id, sig: String(b), lvl: 'ok', icon: 'car',
            text: (t.name || T('Auto')) + ' ' + T('naładowane') + (isNaN(b) ? '' : ' (' + Math.round(b) + '%)'),
            go: function () { if (t.open && P.hasPage(t.open)) P.openPage(t.open); } });
        });
      });
    }
    if (c.alarm) {
      ids.filter(function (e) { return e.indexOf('alarm_control_panel.') === 0 && /^armed_(away|vacation)$/.test(stv(e)); }).forEach(function (a) {
        var home = ids.filter(function (e) { return e.indexOf('person.') === 0 && stv(e) === 'home'; });
        if (home.length) out.push({ key: 'alarm-' + a, sig: stv(a) + home.join(','), lvl: 'warn', icon: 'shield',
          text: T('Alarm uzbrojony (wyjście), a w domu jest') + ' ' + home.map(function (e) { return name(e).split(' ')[0]; }).join(', '),
          go: function () { P.openScreen && P.openScreen('alarm'); } });
      });
    }
    // ukryte, dopóki stan się nie zmieni
    return out.filter(function (a) { return hidden[a.key] !== a.sig; });
  }

  var bar = document.createElement('div'); bar.id = 'alerts'; bar.className = 'alerts'; document.body.appendChild(bar);
  var cur = [], expanded = false, seenKeys = {};
  var ICO = {
    door: '<path d="M6 3h9v18H6z"/><circle cx="12.5" cy="12" r="1"/>',
    battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4"/><path d="M6 10v4"/>',
    car: '<path d="M5 16h14M6 16l1.5-5h9L18 16"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/>',
    shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICO[k] || '') + '</svg>'; }
  function busy() { return P.editing() || P.popupOpen() || !$('set').classList.contains('hidden') || ($('amb') && !$('amb').classList.contains('hidden')) || ($('bell') && !$('bell').classList.contains('hidden')); }
  function render() {
    cur = collect();
    if (!cur.length || busy()) { if (bar.className !== 'alerts hidden') { bar.className = 'alerts hidden'; bar.innerHTML = ''; bar._plain = ''; } return; }
    var show = expanded ? cur : cur.slice(0, 1);
    if (bar.className !== 'alerts') bar.className = 'alerts';
    var html = show.map(function (a, i) {
      return '<div class="al al-' + a.lvl + (seenKeys[a.key] ? '' : ' al-new') + '" data-al="' + i + '"><i class="al-i">' + ico(a.icon) + '</i><span class="al-t">' + esc(a.text) + '</span>' +
        (!expanded && cur.length > 1 ? '<button class="al-more" data-alx="more">+' + (cur.length - 1) + '</button>' : '') +
        '<button class="al-x" data-alx="hide" data-i="' + i + '" aria-label="Ukryj">×</button></div>';
    }).join('');
    // odświeżaj tylko, gdy treść się zmieniła (bez migania); animacja tylko dla nowych alertów
    var plain = html.replace(/ al-new/g, '');
    if (plain !== bar._plain) { bar._plain = plain; bar.innerHTML = html; }
    show.forEach(function (a) { seenKeys[a.key] = 1; });
  }
  bar.addEventListener('click', function (ev) {
    var x = ev.target.closest('[data-alx]');
    if (x) {
      ev.stopPropagation();
      if (x.getAttribute('data-alx') === 'more') { expanded = true; return render(); }
      var a = cur[+x.getAttribute('data-i')]; if (a) { hidden[a.key] = a.sig; saveHidden(); }
      if (cur.length <= 2) expanded = false;
      return render();
    }
    var r = ev.target.closest('[data-al]'); if (!r) return;
    var al = cur[+r.getAttribute('data-al')]; expanded = false; render();
    if (al && al.go) al.go();
  });
  var old = P.hook, pend = null;
  P.hook = function (id) { if (old) old(id); if (!pend) pend = setTimeout(function () { pend = null; render(); }, 400); };
  setInterval(render, 30000);
  document.addEventListener('click', function (ev) { if (expanded && !(ev.target.closest && ev.target.closest('#alerts'))) expanded = false; setTimeout(render, 50); }, true);
  // chowaj paski, gdy otwarte są ustawienia, okienko, edycja, wygaszacz albo dzwonek
  setInterval(function () { var b = busy(); if (b !== bar._b) { bar._b = b; if (b) bar.style.display = 'none'; else { bar.style.display = ''; render(); } } }, 600);

  // ---------- ustawienia: Alerty ----------
  function tg(on, k) { return '<button class="tgl' + (on ? ' on' : '') + '" data-sact="al-' + k + '"><i></i></button>'; }
  function row(l, v) { return '<div class="sr"><span>' + l + '</span><span class="sv">' + v + '</span></div>'; }
  function seg(k, opts, val) { return '<div class="segs2">' + opts.map(function (o) { return '<button class="' + (o[0] === val ? 'sel' : '') + '" data-sact="al-' + k + '" data-k="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  P.alertPane = function () {
    var c = cfg();
    return '<div class="sg">' + row('Paski z alertami', tg(c.on, 'on')) + '</div><div class="sg-f">Wąski pasek na górze ekranu pokazuje się tylko wtedy, gdy coś wymaga uwagi. Dotknięcie otwiera szczegóły, × chowa alert do następnej zmiany.</div>' +
      (c.on ? '<div class="sg-h">CO POKAZYWAĆ</div><div class="sg">' + row('Otwarte drzwi i okna', tg(c.doors, 'doors')) + row('Słaba bateria w czujnikach', tg(c.battery, 'battery')) +
        row('Auto naładowane', tg(c.car, 'car')) + row('Alarm uzbrojony, a ktoś w domu', tg(c.alarm, 'alarm')) + '</div>' +
        (c.doors ? '<div class="sg-h">DRZWI I OKNA OTWARTE DŁUŻEJ NIŻ</div>' + seg('dmin', [[5, '5 min'], [10, '10 min'], [30, '30 min'], [60, '1 h']], c.doorMin) : '') +
        (c.battery ? '<div class="sg-h">BATERIA PONIŻEJ</div>' + seg('blow', [[10, '10%'], [15, '15%'], [20, '20%'], [30, '30%']], c.batLow) : '') +
        '<div class="sg"><div class="sr"><span><a>Pokaż ukryte alerty</a></span><span class="sv"><button class="sbtn" data-sact="al-unhide">Pokaż</button></span></div></div>' : '');
  };
  P.alertAct = function (a) {
    var k = a.getAttribute('data-sact').slice(3), v = +a.getAttribute('data-k'), c = cfg();
    if (k === 'dmin') setCfg('doorMin', v);
    else if (k === 'blow') setCfg('batLow', v);
    else if (k === 'unhide') { hidden = {}; saveHidden(); P.toast(T('Ukryte alerty znów będą widoczne')); }
    else if (DEF[k] !== undefined) setCfg(k, !c[k]);
    setTimeout(render, 200);
    return true;
  };

  // ---------- ustawienia: Historia układu ----------
  var HIST = null;
  function when(iso) {
    var d = new Date(iso), n = new Date(), y = new Date(n.getTime() - 86400000), hm = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    if (d.toDateString() === n.toDateString()) return T('dziś') + ' ' + hm;
    if (d.toDateString() === y.toDateString()) return T('wczoraj') + ' ' + hm;
    return d.getDate() + ' ' + (P.MSH ? P.MSH[d.getMonth()] : d.getMonth() + 1) + ' ' + hm;
  }
  P.histPane = function () {
    if (!HIST) { P.api('history').then(function (l) { HIST = l; if (P.refreshSettings) P.refreshSettings(); }).catch(function () { HIST = []; if (P.refreshSettings) P.refreshSettings(); }); }
    var list = HIST || [];
    return '<div class="sg-f" style="margin-top:0">Panel zapisuje kopię układu przed każdą zmianą (najwyżej raz na minutę, ostatnie 40). Przywrócenie zmienia układ na wszystkich ekranach, a obecny układ też trafia do historii, więc zawsze można wrócić.</div>' +
      (HIST == null ? '<div class="sg"><div class="sr"><span>Wczytuję…</span></div></div>' : !list.length ? '<div class="sg"><div class="sr"><span>Na razie brak zapisanych wersji. Pierwsza pojawi się po pierwszej zmianie układu.</span></div></div>' :
        '<div class="sg">' + list.map(function (h) {
          return '<div class="sr"><span>' + esc(when(h.t)) + '<small>' + h.faces + ' ' + T('twarze') + ' · ' + h.tiles + ' ' + T('kafli') + (h.reason ? ' · ' + T('przed przywróceniem') : '') + '</small></span>' +
            '<span class="sv"><button class="sbtn" data-sact="hi-restore" data-k="' + esc(h.id) + '">Przywróć</button></span></div>';
        }).join('') + '</div>');
  };
  P.histAct = function (a) {
    var k = a.getAttribute('data-sact'), id = a.getAttribute('data-k');
    if (k === 'hi-restore') {
      var h = (HIST || []).filter(function (x) { return x.id === id; })[0];
      if (!confirm(T('Przywrócić układ z') + ' ' + (h ? when(h.t) : '') + '? ' + T('Zmieni się na wszystkich ekranach.'))) return false;
      P.api('history/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: id }) })
        .then(function () { P.toast(T('Przywrócono układ')); HIST = null; if (P.refreshSettings) P.refreshSettings(); })
        .catch(function (e) { P.toast('Błąd: ' + e.message); });
      return false;
    }
    return false;
  };
  P.histReset = function () { HIST = null; };
})();
