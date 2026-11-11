/* Mainfilm Inventar. Kein Build, kein Framework. Zustand liegt im Gerät (localStorage + IndexedDB für Fotos).
   Alle Änderungen laufen durch wenige Funktionen (nimm, zurueck, melde, erledige, patch), damit später ein
   gemeinsamer Speicher an genau diesen Stellen andocken kann. */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const heute = () => new Date().toISOString().slice(0, 10);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];
const tag = d => { if (!d) return ''; const x = new Date(String(d).length > 10 ? d : d + 'T12:00'); return x.getDate() + '. ' + MON[x.getMonth()] + (x.getFullYear() !== new Date().getFullYear() ? ' ' + x.getFullYear() : ''); };
const vibr = n => { try { navigator.vibrate && navigator.vibrate(n || 12); } catch (e) {} };

const KAT = {
  Camera: 'Kamera', Lens: 'Objektive', Audio: 'Ton', Light: 'Licht', 'Light Support': 'Grip',
  'Camera Support': 'Kamera-Support', Monitor: 'Monitor', Filter: 'Filter', Power: 'Strom', Accessory: 'Zubehör'
};
const ST = { da: ['Im Lager', 'ok'], unterwegs: ['Unterwegs', 'rent'], defekt: ['Defekt', 'warn'], fehlt: ['Fehlt', 'bad'], neu: ['Ungeprüft', 'gap'] };
const I = (p, f) => `<svg viewBox="0 0 24 24" fill="${f || 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = {
  Camera: I('<rect x="2.5" y="7" width="15" height="11" rx="1.5"/><path d="M17.5 11l4-2.5v8l-4-2.5"/><circle cx="8" cy="12.5" r="2.5"/>'),
  Lens: I('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/>'),
  Audio: I('<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/>'),
  Light: I('<path d="M6 4h9l4 4v6l-4 4H6z"/><path d="M6 8H3M6 14H3M10 18v3"/>'),
  'Light Support': I('<path d="M12 3v12M12 15l-6 6M12 15l6 6M12 15v6M8 5h8"/>'),
  'Camera Support': I('<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M12 7v6M12 13l-6 8M12 13l6 8M12 13v8"/>'),
  Monitor: I('<rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 17v3"/>'),
  Filter: I('<circle cx="12" cy="12" r="9"/><path d="M5.6 18.4L18.4 5.6M9 20.5L20.5 9M3.5 15L15 3.5"/>'),
  Power: I('<rect x="3" y="8" width="16" height="9" rx="1.5"/><path d="M21 11v3M7 11v3M10.5 11v3"/>'),
  Accessory: I('<path d="M3.5 8l8.5-4.5L20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8L12 12.5 20.5 8M12 12.5v8"/>'),
  heute: I('<path d="M4 11l8-7 8 7v8.5a.5.5 0 01-.5.5H15v-6H9v6H4.5a.5.5 0 01-.5-.5z"/>'),
  bestand: I('<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>'),
  projekte: I('<path d="M3 7.5V18a1 1 0 001 1h16a1 1 0 001-1V9a1 1 0 00-1-1h-8L10 5.5H4a1 1 0 00-1 1z"/>'),
  mehr: I('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  lupe: I('<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/>'),
  hak: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  raus: I('<path d="M4 12h12M11 6l6 6-6 6M20 4v16"/>'),
  rein: I('<path d="M20 12H8M13 6l-6 6 6 6M4 4v16"/>'),
  warn: I('<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>'),
  frage: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.7-1.5 1.2-1.5 2.5M12 17v.3"/>'),
  neu: I('<path d="M3.5 8l8.5-4.5L20.5 8v8L12 20.5 3.5 16z"/><path d="M12 9v6M9 12h6"/>'),
  regal: I('<path d="M4 3v18M20 3v18M4 8h16M4 14h16M4 20h16"/><path d="M8 11.5l1.5 1.5L12 10"/>'),
  foto: I('<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.5"/>'),
};

/* ---------- Speicher ---------- */
const KEY = 'mfinv.v1';
let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
if (!S || !S.init) S = { init: 1, me: '', it: {}, neu: [], out: SEED.out.map(o => ({ ...o })), mel: SEED.mel.map(m => ({ ...m })), ev: [] };
if (!S.bed) S.bed = (SEED.bed || []).map(b => ({ ...b }));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Speicher im Gerät ist voll'); } };

const FOTO = new Map();
let idb = null;
const idbAuf = () => new Promise(res => {
  try {
    const r = indexedDB.open('mfinv', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('fotos');
    r.onsuccess = () => { idb = r.result; res(); };
    r.onerror = () => res();
  } catch (e) { res(); }
});
const fotosLaden = () => new Promise(res => {
  if (!idb) return res();
  const st = idb.transaction('fotos').objectStore('fotos'); const c = st.openCursor();
  c.onsuccess = () => { const cur = c.result; if (cur) { FOTO.set(cur.key, cur.value); cur.continue(); } else res(); };
  c.onerror = () => res();
});
const fotoSichern = (k, v) => { FOTO.set(k, v); if (idb) try { idb.transaction('fotos', 'readwrite').objectStore('fotos').put(v, k); } catch (e) {} };

/* ---------- Abgeleiteter Zustand ---------- */
let IT = [], BY = {};
function rechne() {
  const basis = [...SEED.items, ...S.neu].map(i => ({ ...i, ...(S.it[i.id] || {}) })).filter(i => !i.arch);
  BY = {};
  const h = heute();
  for (const i of basis) { i.out = 0; i.res = 0; i.def = 0; i.fehlt = 0; BY[i.id] = i; }
  for (const o of S.out) if (!o.zu && BY[o.itemId]) BY[o.itemId][o.von > h ? 'res' : 'out'] += o.q;
  for (const m of S.mel) if (!m.zu && BY[m.itemId]) BY[m.itemId][m.art === 'fehlt' ? 'fehlt' : 'def'] += m.q;
  for (const i of basis) {
    i.frei = Math.max(0, i.q - i.out - i.def - i.fehlt);
    i.st = i.fehlt ? 'fehlt' : i.def ? 'defekt' : i.out ? 'unterwegs' : i.z === 'neu' ? 'neu' : 'da';
    i.hay = norm([i.n, i.m, KAT[i.k], i.k, i.sn, i.ort, i.notiz].join(' '));
  }
  IT = basis;
}
function freiIn(i, von, bis) { let b = 0; const B = bis || '9999'; for (const o of S.out) if (!o.zu && o.itemId === i.id && o.von <= B && (o.bis || '9999') >= von) b += o.q; return Math.max(0, i.q - i.def - i.fehlt - b); }
function konflikt(i, von, bis) { const B = bis || '9999'; const o = S.out.find(o => !o.zu && o.itemId === i.id && o.von <= B && (o.bis || '9999') >= von); return o ? (o.pr || 'ohne Projektangabe') + (o.bis ? ' bis ' + tag(o.bis) : ', Rückgabe offen') : ''; }
function patch(id, o) {
  const n = S.neu.find(x => x.id === id);
  if (n) Object.assign(n, o); else S.it[id] = { ...(S.it[id] || {}), ...o };
}
function log(itemId, art, txt, pr) { S.ev.push({ ts: Date.now(), wer: S.me, itemId, art, txt, pr: pr || '' }); if (S.ev.length > 3000) S.ev.splice(0, S.ev.length - 3000); }
function fertig(msg) { save(); rechne(); zeichne(); if (msg) toast(msg, true); vibr(); }

/* ---------- Änderungen ---------- */
function nimm(sel, pr, wer, von, bis) {
  for (const [id, q] of Object.entries(sel)) {
    S.out.push({ id: uid(), itemId: id, q, pr: pr.trim(), wer, von: von || heute(), bis: bis || '', zu: null });
    log(id, 'raus', (q > 1 ? q + ' Stück ' : '') + (von > heute() ? 'reserviert ab ' + tag(von) : 'mitgenommen'), pr.trim());
  }
}
function zurueck(o, wie) {
  o.zu = Date.now(); o.zuWer = S.me;
  log(o.itemId, 'rein', 'zurück im Lager' + (wie ? ' (' + wie + ')' : ''), o.pr);
}
function melde(itemId, art, q, note, foto, pr) {
  const m = { id: uid(), itemId, art, q, note: note || '', foto: foto || '', ts: Date.now(), wer: S.me, zu: null, pr: pr || '' };
  S.mel.push(m); log(itemId, art, (art === 'fehlt' ? 'als fehlend gemeldet' : 'als defekt gemeldet') + (note ? ': ' + note : ''), pr);
  return m;
}
function erledige(m, wie) {
  m.zu = Date.now(); m.wie = wie;
  if (wie === 'ausgemustert') { const i = BY[m.itemId]; if (i) { const q = i.q - m.q; patch(i.id, q <= 0 ? { arch: true, q: 0 } : { q }); } }
  log(m.itemId, wie === 'ausgemustert' ? 'aus' : 'ok', wie, m.pr);
}

/* ---------- Suche und Befehl ---------- */
const SYN = {
  kamera: 'camera fx3 a7s3 bmpcc gopro', cam: 'camera', objektiv: 'lens', linse: 'lens', optik: 'lens', ton: 'audio', mikro: 'audio mkh ntg lav',
  mikrofon: 'audio mkh ntg lav', mic: 'audio', licht: 'light', lampe: 'light', leuchte: 'light', stativ: 'stativ stand', akku: 'akku np- v-mount',
  batterie: 'akku', strom: 'power', kabel: 'kabel xlr klinke schuko d-tap', gimbal: 'ronin rs 4', drohne: 'mavic', funk: 'wireless rodelink transmission',
  kopfhorer: 'mdr dt 770 headphon', funkstrecke: 'wireless rodelink', recorder: 'tascam zoom h5 atomos', rekorder: 'tascam zoom h5 atomos',
};
function lev1(a, b) { // Abstand höchstens 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, f = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++f > 1) return false;
    if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
  }
  return f + (a.length - i) + (b.length - j) <= 1;
}
function suche(q, liste) {
  const toks = norm(q).split(/[\s,]+/).filter(Boolean);
  if (!toks.length) return liste;
  const out = [];
  for (const i of liste) {
    let sc = 0, ok = true;
    const worte = i.hay.split(/[\s\-\/]+/);
    for (const t of toks) {
      if (i.hay.includes(t)) { sc += norm(i.n).startsWith(t) ? 5 : norm(i.n).includes(t) ? 3 : 1; continue; }
      const syn = SYN[t]; if (syn && syn.split(' ').some(s => i.hay.includes(s))) { sc += 1; continue; }
      if (t.length >= 4 && worte.some(w => lev1(t, w.slice(0, t.length + 1)) || lev1(t, w))) { sc += 1; continue; }
      ok = false; break;
    }
    if (ok) out.push([sc, i]);
  }
  return out.sort((a, b) => b[0] - a[0] || a[1].n.localeCompare(b[1].n)).map(x => x[1]);
}
function befehl(q) {
  let rest = ' ' + q + ' ', art = null, pr = '';
  const pm = rest.match(/\s(?:für|fuer|fur|projekt|dreh)\s+(.+?)\s*$/i);
  if (pm) { pr = pm[1].trim(); rest = rest.slice(0, pm.index) + ' '; art = 'mit'; }
  const W = [['defekt', /\s(defekt|kaputt|gebrochen|geht nicht|spinnt)\s/i], ['fehlt', /\s(fehlt|vermisst|verloren|ist weg|nicht da)\s/i], ['zurueck', /\s(zurück|zurueck|retour|wieder da)\s/i], ['ok', /\s(geprüft|geprueft|stimmt|ist da|vorhanden)\s/i], ['mit', /\s(mitnehmen|nehme|nehm ich|raus)\s/i]];
  for (const [a, re] of W) if (re.test(rest)) { art = art || a; rest = rest.replace(re, ' '); }
  if (!art) return null;
  const tr = suche(rest.trim(), IT);
  if (!rest.trim() || !tr.length) return null;
  const i = tr[0];
  if (art === 'zurueck' && !i.out) return null;
  if (art === 'ok' && i.z !== 'neu') return null;
  if (art === 'mit' && !i.frei) return null;
  return { art, i, pr };
}
const DAZU = [
  [/fx3|a7s3/i, [/np-fz100/i, /alpha s cage/i, /xlr kit/i, /metabones/i, /variabel 82/i]],
  [/pocket cinema|bmpcc/i, [/bmpcc akku/i, /bmpcc 6k pro cage/i, /d-tap kabel bmpcc/i, /sigma 18-35/i, /v-mount akku 98 wh micro/i]],
  [/aputure|amaran|molus|swit|softbox/i, [/c-stand lang/i, /sandsack/i, /schuko/i, /kabeltrommel/i]],
  [/mkh 8070|ntg5/i, [/boom pole/i, /windschutz/i, /xlr - lang/i, /tascam/i, /mdr-7506/i]],
  [/wireless|rodelink/i, [/lav mic/i, /mdr-7506/i]],
  [/atomos/i, [/np-f970/i, /micro converter/i]],
  [/ronin|rs 4/i, [/np-fz100/i, /v-mount platte/i]],
  [/mavic|gopro|insta/i, [/gopro akku/i, /ssd extern/i]],
];
function passtDazu(sel, fr) {
  const ids = Object.keys(sel); if (!ids.length) return [];
  const punkte = {};
  for (const id of ids) { // Faustregeln
    const i = BY[id]; if (!i) continue;
    for (const [re, ziele] of DAZU) if (re.test(i.n)) for (const z of ziele) for (const k of IT) if (z.test(k.n)) punkte[k.id] = (punkte[k.id] || 0) + 2;
  }
  const gruppen = {}; // gelernt: was war schon gemeinsam auf einem Projekt
  for (const o of S.out) if (o.pr) (gruppen[o.pr + o.von] = gruppen[o.pr + o.von] || []).push(o.itemId);
  for (const g of Object.values(gruppen)) if (g.some(x => sel[x])) for (const x of g) punkte[x] = (punkte[x] || 0) + 1;
  return Object.entries(punkte).filter(([id]) => !sel[id] && BY[id] && fr(BY[id]) > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => BY[id]);
}
const VORLAGE = {
  'Ready to Shoot': [/^sony fx3$/i, /cage für fx3/i, /xlr kit/i, /magic arm kurz/i, /ntg5/i, /mini v-mount platte/i, /v-mount akku 98 wh micro/i, /akku np-fz100/i, /d-tap auf sony dummy/i],
  Interview: [/fx3/i, /a7s/i, /sony 16-35/i, /canon 24-70/i, /metabones/i, /lav mic/i, /wireless pro/i, /mkh 8070/i, /boom pole/i, /tascam/i, /mdr-7506/i, /aputure 80c/i, /molus/i, /softbox 120/i, /c-stand lang/i, /sandsack/i, /akku np-fz100/i, /videostativ/i, /shinobi/i],
  Event: [/fx3/i, /a7s/i, /rs 4 pro/i, /sony 16-35/i, /canon 70-200/i, /metabones/i, /wireless go/i, /ntg5/i, /akku np-fz100/i, /variabel 82/i, /t2c/i],
  Social: [/iphone 16/i, /smartphone rig/i, /wireless go/i, /t2c/i, /insta360 x3/i],
  Drohne: [/mavic 3/i, /mini 3 pro/i, /hero10/i, /gopro akku/i, /ssd extern/i],
};
function rateKat(name) {
  const n = norm(name);
  const R = [['Power', /akku|batter|lade|netzteil|kabeltrommel|schuko|d-tap|v-mount|usb-c|powerbank/], ['Lens', /\d+\s?-\s?\d+|mm f|objektiv|adapter ef|sigma|zeiss|tamron|samyang/], ['Camera', /fx\d|a7|kamera|gopro|insta|bmpcc|pocket|mavic|drohne|iphone|pyxis/], ['Audio', /mikro|rode|sennheiser|xlr|klinke|lav|funk|recorder|kopfhor|zoom h|tascam|boom|intercom|walkie/], ['Filter', /filter|nd\d|mist|polar/], ['Monitor', /monitor|atomos|smallhd|teradek|converter|portkeys/], ['Light Support', /c-stand|stativ|sandsack|klemme|flag|floppy|gobo|zapfen|molton|rahmen|diffus|arm/], ['Light', /aputure|amaran|led|softbox|licht|lampe|astera|tube|panel|laterne|nanlite/], ['Camera Support', /gimbal|ronin|slider|cage|rig|easyrig|rods|platte|tripod|videostativ/]];
  for (const [k, re] of R) if (re.test(n)) return k;
  return '';
}

/* ---------- Bausteine ---------- */
function bildSrc(i) { return i.b && i.b.startsWith('idb:') ? FOTO.get(i.b.slice(4)) || '' : i.b || ''; }
function bild(i, extra) {
  const src = bildSrc(i);
  return `<div class="bild${src && (i.bf || i.b.startsWith('idb:')) ? ' foto' : ''}">${src ? `<img loading="lazy" alt="" src="${esc(src)}">` : IC[i.k] || IC.Accessory}${extra || ''}</div>`;
}
function standZeile(i) {
  if (i.q === 1) return `<span class="pkt ${ST[i.st][1]}"></span>${ST[i.st][0]}`;
  const t = []; if (i.fehlt) t.push(i.fehlt + ' fehlt'); if (i.def) t.push(i.def + ' defekt'); if (i.out) t.push(i.out + ' unterwegs');
  return `<span class="pkt ${ST[i.st][1]}"></span>${t.length ? t.join(', ') : i.st === 'neu' ? 'Ungeprüft' : 'Alle da'}`;
}
let toastT;
function toast(msg, ok) {
  let t = $('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = (ok ? IC.hak : '') + `<span>${esc(msg)}</span>`;
  clearTimeout(toastT); setTimeout(() => t.classList.add('auf'), 10); toastT = setTimeout(() => t.classList.remove('auf'), 2400);
}
function blatt(titel, leib, fuss) {
  zuBlatt(true);
  const s = document.createElement('div'); s.className = 'schleier'; s.dataset.a = 'schleier';
  s.innerHTML = `<div class="blatt" role="dialog" aria-modal="true" aria-label="${esc(titel)}"><div class="blatt-kopf"><h3>${esc(titel)}</h3><button class="zu" data-a="zu" aria-label="Schließen">✕</button></div><div class="blatt-leib">${leib}</div>${fuss ? `<div class="blatt-fuss">${fuss}</div>` : ''}</div>`;
  document.body.appendChild(s); document.body.style.overflow = 'hidden';
  setTimeout(() => s.classList.add('auf'), 20);
  return s;
}
function zuBlatt(sofort) {
  if (sofort) { $$('.schleier').forEach(x => x.remove()); document.body.style.overflow = ''; return; }
  const s = $('.schleier:not([data-weg])'); if (!s) return;
  document.body.style.overflow = '';
  s.classList.remove('auf'); s.dataset.weg = '1'; setTimeout(() => s.remove(), 380);
  if (location.hash.startsWith('#/g/')) history.replaceState(null, '', '#/' + VIEW);
}
const leib = () => $('.schleier:not([data-weg]) .blatt-leib');
function fotoWahl(cb) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const img = new Image(); const url = URL.createObjectURL(f);
    img.onload = () => {
      const m = 1000, k = Math.min(1, m / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      cb(c.toDataURL('image/jpeg', .72));
    };
    img.onerror = () => toast('Bild konnte nicht gelesen werden');
    img.src = url;
  };
  inp.click();
}

/* ---------- Ansichten ---------- */
let VIEW = 'heute', F = { q: '', kat: '', st: '' };
function aufgaben() {
  const a = [], h = heute();
  for (const o of S.out) if (!o.zu && BY[o.itemId]) {
    if (!o.pr && o.von <= h) a.push({ p: 1, i: BY[o.itemId], m: ['Wo ist das?', 'rent'], t: 'Ohne Projekt unterwegs' + (o.von ? ' seit ' + tag(o.von) : ''), k: [['imlager', 'Ist im Lager', o.id], ['zuordnen', 'Ist auf Projekt', o.id]] });
    else if (o.bis && o.bis < h) a.push({ p: 0, i: BY[o.itemId], m: ['Überfällig', 'bad'], t: `${o.pr} · fällig ${tag(o.bis)} · ${o.wer || ''}`, k: [['imlager', 'Ist zurück', o.id], ['verl', 'Verlängern', o.id]] });
  }
  for (const m of S.mel) if (!m.zu && BY[m.itemId]) {
    if (m.art === 'fehlt') a.push({ p: 2, i: BY[m.itemId], m: ['Fehlt', 'bad'], t: (m.q > 1 ? m.q + ' Stück · ' : '') + (m.note || 'gemeldet ' + tag(new Date(m.ts).toISOString())), k: [['erl', 'Gefunden', m.id, 'gefunden'], ['erl', 'Ausbuchen', m.id, 'ausgemustert']] });
    else a.push({ p: 3, i: BY[m.itemId], m: ['Defekt', 'warn'], t: (m.q > 1 ? m.q + ' Stück · ' : '') + (m.note || 'gemeldet ' + tag(new Date(m.ts).toISOString())), k: [['erl', 'Repariert', m.id, 'repariert'], ['erl', 'Ausmustern', m.id, 'ausgemustert']] });
  }
  for (const i of IT) if (i.frage) a.push({ p: 4, i, m: ['Klären', 'gap'], t: i.frage, k: [['bearb', 'Korrigieren', i.id], ['geklaert', 'Stimmt so', i.id]] });
  return a.sort((x, y) => x.p - y.p);
}
function vHeute() {
  const z = { da: 0, unterwegs: 0, defekt: 0, fehlt: 0, neu: 0 }; for (const i of IT) z[i.st]++;
  const auf = aufgaben();
  const neu = IT.filter(i => i.z === 'neu').length, ohneFoto = IT.filter(i => !i.b).length;
  const ohneSn = IT.filter(i => ['Camera', 'Lens', 'Monitor'].includes(i.k) && !i.sn).length;
  const offen = S.out.filter(o => !o.zu && o.pr && BY[o.itemId]);
  const hh = heute();
  const prs = {}; for (const o of offen) (prs[o.pr] = prs[o.pr] || []).push(o);
  const letzte = S.ev.slice(-6).reverse();
  return `<div class="zahlen">${Object.entries(ST).map(([k, [l, c]]) => `<button data-a="filterSt" data-v="${k}"><b class="num" data-zahl="${z[k]}">0</b><span><i class="pkt ${c}"></i>${l}</span></button>`).join('')}</div>
  <div class="aktionen" style="margin-top:18px">
    <button data-a="tab" data-tab="inventur"><i style="color:var(--mag-ink)">${IC.regal}</i><div><b>Bestandsaufnahme: ${IT.filter(i => S.inv.done[i.id]).length} von ${IT.length} erfasst</b><span>Fragen je Gerät durchklicken, bis der Stand stimmt</span></div></button>
    <button data-a="tab" data-tab="einkauf"><i>${IC.neu}</i><div><b>Einkauf: ${S.bed.filter(b => b.st === 'offen').length} zu besorgen, ${S.bed.filter(b => b.st === 'bestellt').length} bestellt</b><span>Bedarf sammeln, Bestellung abhaken, Neues einpflegen</span></div></button>
  </div>
  <h2>Zu erledigen <small>${auf.length ? auf.length + ' offen' : ''}</small></h2>
  <div class="zeilen">${auf.length ? auf.slice(0, 12).map(a => `<div class="zeile breit"><button data-a="geraet" data-id="${a.i.id}" aria-label="${esc(a.i.n)}">${bild(a.i)}</button><div class="t"><span class="marke ${a.m[1]}">${a.m[0]}</span><b>${esc(a.i.n)}</b><span>${esc(a.t)}</span></div><div class="akt">${a.k.map((k, n) => `<button class="kn ${n ? 'leise' : ''}" data-a="${k[0]}" data-id="${k[2]}" data-v="${k[3] || ''}">${k[1]}</button>`).join('')}</div></div>`).join('') : '<p class="leer">Nichts offen. Alles da, wo es sein soll.</p>'}</div>
  ${auf.length > 12 ? `<p class="notiz">und ${auf.length - 12} weitere</p>` : ''}
  <h2>Bestand pflegen</h2>
  <div class="aktionen">
    ${ohneFoto ? `<button data-a="regal" data-v="foto"><i>${IC.foto}</i><div><b>${ohneFoto} Positionen ohne Foto</b><span>Mit dem Telefon direkt am Regal aufnehmen</span></div></button>` : ''}
    ${ohneSn ? `<button data-a="regal" data-v="sn"><i>${IC.frage}</i><div><b>${ohneSn} Kameras, Objektive und Monitore ohne Seriennummer</b><span>Wichtig für Versicherung und Diebstahl</span></div></button>` : ''}
  </div>
  <h2>Unterwegs und geplant</h2>
  ${Object.keys(prs).length ? Object.entries(prs).map(([p, ls]) => projektZeile(p, ls)).join('') : '<p class="leer">Kein Gerät auf einem Projekt.</p>'}
  ${letzte.length ? `<h2>Zuletzt</h2><ul class="verlauf">${letzte.map(evZeile).join('')}</ul>` : ''}`;
}
function evZeile(e) {
  const i = BY[e.itemId]; const c = { raus: 'pr', rein: 'ok', defekt: 'warn', fehlt: 'bad', ok: 'ok' }[e.art] || '';
  return `<li class="${c}"><div><b>${esc(i ? i.n : 'Gerät')}</b> ${esc(e.txt)}${e.pr ? ' · ' + esc(e.pr) : ''}<small>${tag(new Date(e.ts).toISOString())}${e.wer ? ' · ' + esc(e.wer) : ''}</small></div></li>`;
}
function projektZeile(p, ls) {
  const off = ls.filter(o => !o.zu), stk = ls.reduce((s, o) => s + o.q, 0);
  const von = ls.map(o => o.von).sort()[0], wer = [...new Set(ls.map(o => o.wer).filter(Boolean))].join(', ');
  const its = [...new Set(ls.map(o => o.itemId))].map(id => BY[id]).filter(Boolean);
  return `<button class="projekt" data-a="projekt" data-v="${esc(p)}"><div class="projekt-kopf"><b>${esc(p || 'Ohne Angabe')}</b><span>${off.length ? `<span class="marke rent">${off.reduce((s, o) => s + o.q, 0)} ${off.every(o => o.von > heute()) ? 'geplant' : 'unterwegs'}</span>` : 'abgeschlossen'}</span></div><span class="notiz" style="display:block;margin-top:2px">${stk} Teile · ab ${tag(von)}${wer ? ' · ' + esc(wer) : ''}</span><div class="streifen">${its.slice(0, 5).map(i => bild(i)).join('')}${its.length > 5 ? `<div class="mehr">+${its.length - 5}</div>` : ''}</div></button>`;
}
function vBestand() {
  let l = IT;
  if (F.kat) l = l.filter(i => i.k === F.kat);
  if (F.st) l = l.filter(i => F.st === 'foto' ? !i.b : i.st === F.st);
  const cmd = F.q ? befehl(F.q) : null;
  l = F.q && !cmd ? suche(F.q, l) : cmd ? [cmd.i] : [...l].sort((a, b) => Object.keys(KAT).indexOf(a.k) - Object.keys(KAT).indexOf(b.k) || a.n.localeCompare(b.n));
  const kz = {}; for (const i of IT) kz[i.k] = (kz[i.k] || 0) + 1;
  const CT = { mit: 'Mitnehmen', defekt: 'Defekt melden', fehlt: 'Fehlt melden', zurueck: 'Zurückbuchen', ok: 'Als geprüft bestätigen' };
  return `<div class="suche">${IC.lupe}<input id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Suchen oder sagen: FX3 defekt" value="${esc(F.q)}" aria-label="Bestand durchsuchen">${F.q ? '<button class="x" data-a="qLeer" aria-label="Suche leeren">✕</button>' : ''}</div>
  <div id="cmd">${cmd ? `<button class="befehl" data-a="befehl"><i>${CT[cmd.art]}</i><span>${esc(cmd.i.n)}${cmd.pr ? ' · ' + esc(cmd.pr) : ''}</span></button>` : ''}</div>
  <div class="filter"><button data-a="kat" data-v="" aria-pressed="${!F.kat}">Alles<em>${IT.length}</em></button>${Object.entries(KAT).filter(([k]) => kz[k]).map(([k, lb]) => `<button data-a="kat" data-v="${k}" aria-pressed="${F.kat === k}">${lb}<em>${kz[k]}</em></button>`).join('')}</div>
  <div class="filter zwei"><button data-a="st" data-v="" aria-pressed="${!F.st}">Jeder Zustand</button>${Object.entries(ST).map(([k, [lb]]) => `<button data-a="st" data-v="${k}" aria-pressed="${F.st === k}">${lb}</button>`).join('')}<button data-a="st" data-v="foto" aria-pressed="${F.st === 'foto'}">Ohne Foto</button></div>
  <div class="raster" id="raster">${raster(l)}</div>`;
}
function raster(l) {
  return l.length ? l.map((i, n) => `<button class="karte" style="animation-delay:${Math.min(n, 14) * 22}ms" data-a="geraet" data-id="${i.id}">${bild(i, i.q > 1 ? `<span class="menge num">${i.frei}/${i.q}</span>` : '')}<b>${esc(i.n)}</b><span>${standZeile(i)}</span></button>`).join('')
    : `<div class="leer" style="grid-column:1/-1">Nichts gefunden.${F.q ? ` <button class="kn" data-a="neu" data-v="${esc(F.q)}">„${esc(F.q)}“ neu anlegen</button>` : ''}</div>`;
}
function vProjekte() {
  const prs = {}; for (const o of S.out) if (BY[o.itemId]) (prs[o.pr] = prs[o.pr] || []).push(o);
  const l = Object.entries(prs).sort((a, b) => (b[1].some(o => !o.zu) - a[1].some(o => !o.zu)) || (b[1].map(o => o.von).sort().pop() || '').localeCompare(a[1].map(o => o.von).sort().pop() || ''));
  return `<h2>Projekte <small>welches Gerät war wo</small></h2>${l.length ? l.map(([p, ls]) => projektZeile(p, ls)).join('') : '<p class="leer">Noch kein Projekt. Sobald jemand Geräte mitnimmt, steht hier, was wann wo war.</p>'}
  <p style="margin-top:20px"><button class="kn haupt gross" data-a="mit">${IC.raus} Geräte mitnehmen</button></p>`;
}
function vMehr() {
  return `<div class="aktionen"><button data-a="tab" data-tab="inventur"><i>${IC.regal}</i><div><b>Bestandsaufnahme</b><span>${IT.filter(i => S.inv.done[i.id]).length} von ${IT.length} erfasst</span></div></button><button data-a="tab" data-tab="einkauf"><i>${IC.neu}</i><div><b>Einkauf</b><span>${S.bed.filter(b => b.st === 'offen').length} zu besorgen</span></div></button></div>
  <h2>Ich</h2><div class="zeilen"><div class="zeile ohne"><div class="t"><b>${esc(S.me || 'Kein Name')}</b><span>Steht bei jeder Buchung und Meldung</span></div><button class="kn" data-a="name">Ändern</button></div></div>
  <h2>Projekte</h2><div class="zeilen"><div class="zeile ohne"><div class="t"><b>Welches Gerät war wo</b><span>Alle Projekte mit ihren Geräten</span></div><button class="kn" data-a="tab" data-tab="projekte">Öffnen</button></div></div>
  <h2>Etiketten</h2><div class="zeilen"><div class="zeile ohne"><div class="t"><b>QR-Etiketten drucken</b><span>Telefonkamera draufhalten, das Gerät öffnet sich hier</span></div><button class="kn" data-a="etiketten">Drucken</button></div></div>
  <h2>Daten</h2><div class="zeilen">
    <div class="zeile ohne"><div class="t"><b>Sicherung speichern</b><span>Alle Buchungen, Meldungen und Fotos als Datei</span></div><button class="kn" data-a="export">Speichern</button></div>
    <div class="zeile ohne"><div class="t"><b>Sicherung einspielen</b><span>Ersetzt den Stand auf diesem Gerät</span></div><button class="kn" data-a="import">Einspielen</button></div>
    <div class="zeile ohne"><div class="t"><b>Liste für die Versicherung</b><span>Bestand als CSV, ohne Preise</span></div><button class="kn" data-a="csv">CSV</button></div>
    <div class="zeile ohne"><div class="t"><b>Auf Anfang</b><span>Löscht alles, was auf diesem Gerät eingetragen wurde</span></div><button class="kn bad" data-a="reset">Zurücksetzen</button></div>
  </div>
  <div class="sync">${IC.warn.replace('<svg', '<svg width="22" height="22" style="flex:none"')}<div><b>Dieser Stand liegt nur auf diesem Gerät.</b><br>Buchungen und Meldungen werden noch nicht zwischen Telefonen geteilt. Bis die gemeinsame Datenbank steht, lässt sich jede Meldung per Teilen weitergeben und der Stand als Sicherung übertragen.</div></div>
  <p class="notiz">Grundbestand aus Notion, Stand ${tag(SEED.stand)}. ${SEED.items.length} Positionen. Preise und Versicherungswerte stehen bewusst nicht auf dieser öffentlichen Seite, sie bleiben in Notion.</p>`;
}
function zeichne() {
  const v = { heute: vHeute, bestand: vBestand, inventur: vInventur, einkauf: vEinkauf, projekte: vProjekte, mehr: vMehr }[VIEW] || vHeute;
  $('#view').innerHTML = `<div class="view">${v()}</div>`;
  $$('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === VIEW));
  $('#ich').innerHTML = S.me ? `<b>${esc(S.me)}</b><i>${esc(S.me.trim()[0].toUpperCase())}</i>` : 'Wer bist du?';
  $$('[data-zahl]').forEach(el => { const z = +el.dataset.zahl; let n = 0; const st = Math.max(1, Math.ceil(z / 14)); const t = setInterval(() => { n = Math.min(z, n + st); el.textContent = n; if (n >= z) clearInterval(t); }, 28); });
}
function geh(v, still) { VIEW = v; if (!still) history.replaceState(null, '', '#/' + v); zeichne(); window.scrollTo(0, 0); }

/* ---------- Blätter ---------- */
function bGeraet(id) {
  const i = BY[id]; if (!i) return toast('Dieses Gerät gibt es nicht mehr');
  history.replaceState(null, '', '#/g/' + id);
  const offM = S.mel.filter(m => !m.zu && m.itemId === id), offO = S.out.filter(o => !o.zu && o.itemId === id);
  const hist = [...S.out.filter(o => o.itemId === id).map(o => ({ ts: new Date(o.von + 'T12:00').getTime(), h: `<li class="pr"><div><b>${esc(o.pr || 'Ohne Projektangabe')}</b>${o.q > 1 ? ' · ' + o.q + ' Stück' : ''}<small>${tag(o.von)} bis ${o.zu ? tag(new Date(o.zu).toISOString()) : o.von > heute() ? (o.bis ? tag(o.bis) : 'offen') + ', geplant' : 'heute, noch unterwegs'}${o.wer ? ' · ' + esc(o.wer) : ''}</small></div></li>` })),
    ...S.ev.filter(e => e.itemId === id && !['raus', 'rein'].includes(e.art)).map(e => ({ ts: e.ts, h: `<li class="${{ defekt: 'warn', fehlt: 'bad', ok: 'ok' }[e.art] || ''}"><div>${esc(e.txt)}<small>${tag(new Date(e.ts).toISOString())}${e.wer ? ' · ' + esc(e.wer) : ''}</small></div></li>` }))].sort((a, b) => b.ts - a.ts);
  blatt(i.n, `${bild(i).replace('class="bild', 'class="bild geraet-bild')}
    <div class="stand"><span>${standZeile(i)}</span>${i.q > 1 ? `<span class="num">${i.frei} von ${i.q} frei</span>` : ''}<span style="color:var(--mute)">${KAT[i.k] || ''}</span></div>
    ${i.bs ? `<p class="notiz" style="margin:0 0 6px">Beispielbild. Das genaue Modell ist nicht bestätigt, ein eigenes Foto ersetzt es.</p>` : ''}
    ${i.frage ? `<div class="hinweis"><p>${esc(i.frage)}</p></div>` : ''}
    ${offO.map(o => `<div class="hinweis rent"><p><b>${o.von > heute() ? 'Geplant: ' : ''}${esc(o.pr || 'Unterwegs ohne Projektangabe')}</b><br>${o.q > 1 ? o.q + ' Stück · ' : ''}${o.von > heute() ? 'ab' : 'seit'} ${tag(o.von)}${o.bis ? ' · zurück bis ' + tag(o.bis) : ''}${o.wer ? ' · ' + esc(o.wer) : ''}</p><button class="kn" data-a="${o.von > heute() ? 'absagen' : 'imlager'}" data-id="${o.id}">${o.von > heute() ? 'Absagen' : 'Zurück'}</button></div>`).join('')}
    ${offM.map(m => `<div class="hinweis ${m.art === 'fehlt' ? 'bad' : ''}"><p><b>${m.art === 'fehlt' ? 'Fehlt' : 'Defekt'}${m.q > 1 ? ' · ' + m.q + ' Stück' : ''}</b><br>${esc(m.note || 'ohne Beschreibung')}${m.foto && FOTO.get(m.foto) ? `<img src="${FOTO.get(m.foto)}" alt="Foto zur Meldung" style="margin-top:8px;border-radius:3px;max-height:160px">` : ''}</p><button class="kn" data-a="erl" data-id="${m.id}" data-v="${m.art === 'fehlt' ? 'gefunden' : 'repariert'}">${m.art === 'fehlt' ? 'Gefunden' : 'Repariert'}</button></div>`).join('')}
    <div class="vier">
      <button class="kn haupt gross" data-a="mit" data-id="${id}" ${i.frei ? '' : 'disabled style="opacity:.4"'}>${IC.raus} Mitnehmen</button>
      ${i.z === 'neu' ? `<button class="kn gross" data-a="pruefOk" data-id="${id}">${IC.hak} Ist da</button>` : `<button class="kn gross" data-a="fotoG" data-id="${id}">${IC.foto} Foto</button>`}
      <button class="kn gross warn" data-a="melden" data-id="${id}" data-v="defekt">Defekt</button>
      <button class="kn gross bad" data-a="melden" data-id="${id}" data-v="fehlt">Fehlt</button>
    </div>
    <div class="fakten">
      <div><span class="k">Menge</span><span class="num">${i.q}</span></div>
      ${i.m ? `<div><span class="k">Modell</span><span>${esc(i.m)}</span></div>` : ''}
      ${i.zust ? `<div><span class="k">Zustand</span><span>${ZU_L[i.zust]}${i.mangel ? '<br><span style="color:var(--warn)">' + esc(i.mangel) + '</span>' : ''}</span></div>` : ''}
      ${i.nutz ? `<div><span class="k">Einsatz</span><span>${NUTZ_L[i.nutz]}</span></div>` : ''}
      <div><span class="k">Standort</span><span>${i.ort ? esc(i.ort) : '<span style="color:var(--mute)">nicht eingetragen</span>'}</span></div>
      ${i.notiz ? `<div><span class="k">Notiz</span><span>${esc(i.notiz)}</span></div>` : ''}
      <div><span class="k">Seriennummer</span><span>${i.sn ? esc(i.sn) : '<span style="color:var(--mute)">fehlt noch</span>'}</span></div>
      <div><span class="k">Geprüft</span><span>${i.z === 'neu' ? '<span style="color:var(--mute)">noch nie am Regal</span>' : i.lc ? tag(i.lc) : 'ja'}</span></div>
    </div>
    <h2 style="font-size:18px;margin-top:22px">Verlauf</h2>
    ${hist.length ? `<ul class="verlauf">${hist.map(x => x.h).join('')}</ul>` : '<p class="leer">Noch auf keinem Projekt gewesen.</p>'}`,
    `<button class="kn" data-a="bearb" data-id="${id}">Bearbeiten</button>${i.z === 'neu' ? `<button class="kn" data-a="fotoG" data-id="${id}">Foto</button>` : ''}`);
}

let CO = null;
function bMit(vorId, pr) {
  if (!brauchtName(() => bMit(vorId, pr))) return;
  CO = { pr: pr || '', von: heute(), bis: '', sel: {}, q: '' };
  if (vorId && BY[vorId] && BY[vorId].frei) CO.sel[vorId] = 1;
  const alte = [...new Set(S.out.map(o => o.pr).filter(Boolean))].reverse();
  blatt('Mitnehmen', `<datalist id="prs">${alte.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <label class="feld">Projekt<input id="coPr" list="prs" placeholder="z. B. DB ICON Folge 4" value="${esc(CO.pr)}" autocomplete="off"></label>
    <div class="zwei-sp"><label class="feld">Ab<input id="coVon" type="date" min="${heute()}" value="${heute()}"></label><label class="feld">Zurück am<input id="coBis" type="date" min="${heute()}"></label></div>
    <p class="tipp" style="margin-top:14px">Vorschlag für</p><div class="dazu">${Object.keys(VORLAGE).map(v => `<button data-a="coVorlage" data-v="${v}" style="padding:0 14px">${v}</button>`).join('')}</div>
    <div id="coDazu"></div>
    <div class="suche" style="margin-top:14px">${IC.lupe}<input id="coQ" type="search" placeholder="Gerät suchen" autocomplete="off" aria-label="Gerät suchen"></div>
    <div id="coListe"></div>`,
    `<button class="kn haupt gross" id="coOk" data-a="coOk">Mitnehmen</button>`);
  coZeichne();
}
function coZeichne() {
  const l = leib(); if (!l || !CO) return;
  const fr = i => freiIn(i, CO.von, CO.bis);
  for (const id of Object.keys(CO.sel)) { const f = BY[id] ? fr(BY[id]) : 0; if (f <= 0) delete CO.sel[id]; else if (CO.sel[id] > f) CO.sel[id] = f; }
  const frei = IT.filter(i => i.q - i.def - i.fehlt > 0);
  const liste = (CO.q ? suche(CO.q, frei) : [...frei].sort((a, b) => (!!CO.sel[b.id] - !!CO.sel[a.id]) || Object.keys(KAT).indexOf(a.k) - Object.keys(KAT).indexOf(b.k) || a.n.localeCompare(b.n))).slice(0, 60);
  $('#coListe', l).innerHTML = liste.map(i => `<button class="pick" data-a="coPick" data-id="${i.id}" aria-pressed="${!!CO.sel[i.id]}" ${fr(i) > 0 ? '' : 'disabled'}>${bild(i)}<div style="min-width:0"><b>${esc(i.n)}</b><small>${fr(i) <= 0 ? 'Belegt: ' + esc(konflikt(i, CO.von, CO.bis)) : CO.sel[i.id] && i.q > 1 ? CO.sel[i.id] + ' von ' + fr(i) + ' · nochmal tippen für mehr' : i.q > 1 ? fr(i) + ' frei' : KAT[i.k]}</small></div><span class="hak">${IC.hak}</span></button>`).join('') || '<p class="leer">Nichts frei.</p>';
  const dz = passtDazu(CO.sel, fr);
  $('#coDazu', l).innerHTML = dz.length ? `<p class="tipp" style="margin-top:14px">Passt dazu</p><div class="dazu">${dz.map(i => `<button data-a="coPick" data-id="${i.id}">${bild(i)}${esc(i.n)}</button>`).join('')}</div>` : '';
  const n = Object.values(CO.sel).reduce((s, x) => s + x, 0);
  $('#coOk').textContent = n ? `${n} ${n === 1 ? 'Teil' : 'Teile'} ${CO.von > heute() ? 'reservieren' : 'mitnehmen'}` : 'Geräte antippen';
  $('#coOk').disabled = !n; $('#coOk').style.opacity = n ? 1 : .4;
}
function bProjekt(p) {
  const ls = S.out.filter(o => o.pr === p && BY[o.itemId]), off = ls.filter(o => !o.zu);
  RU = {}; off.forEach(o => RU[o.id] = 'da');
  blatt(p || 'Ohne Angabe', `${off.length ? `<h2 style="font-size:18px">Zurückgeben <small>${off.length} offen</small></h2>${off.map(o => { const i = BY[o.itemId]; return `<div class="pick" style="grid-template-columns:44px minmax(0,1fr)">${bild(i)}<div style="min-width:0"><b>${esc(i.n)}</b><small>${o.q > 1 ? o.q + ' Stück · ' : ''}seit ${tag(o.von)}${o.bis ? ' · bis ' + tag(o.bis) : ''}${o.wer ? ' · ' + esc(o.wer) : ''}</small></div><div class="wahl" style="grid-column:1/-1;margin-top:0">${[['da', 'Zurück'], ['defekt', 'Defekt'], ['fehlt', 'Fehlt'], ['bleibt', 'Bleibt']].map(([k, lb]) => `<button data-a="ru" data-id="${o.id}" data-v="${k}" aria-pressed="${k === 'da'}">${lb}</button>`).join('')}</div></div>`; }).join('')}` : ''}
    ${ls.some(o => o.zu) ? `<h2 style="font-size:18px;margin-top:24px">War dabei</h2>${ls.filter(o => o.zu).map(o => { const i = BY[o.itemId]; return `<button class="pick" style="grid-template-columns:44px minmax(0,1fr)" data-a="geraet" data-id="${i.id}">${bild(i)}<div style="min-width:0"><b>${esc(i.n)}</b><small>${o.q > 1 ? o.q + ' Stück · ' : ''}${tag(o.von)} bis ${tag(new Date(o.zu).toISOString())}${o.wer ? ' · ' + esc(o.wer) : ''}</small></div></button>`; }).join('')}` : ''}`,
    off.length ? `<button class="kn" data-a="mit" data-v="${esc(p)}">Mehr mitnehmen</button><button class="kn haupt gross" data-a="ruOk" data-v="${esc(p)}">Buchen</button>` : `<button class="kn haupt" data-a="mit" data-v="${esc(p)}">Wieder mitnehmen</button>`);
}
let RU = {};
let ME = null;
function bMelden(id, art) {
  if (!brauchtName(() => bMelden(id, art))) return;
  ME = { id: id || '', art: art || 'defekt', q: 1, foto: '', suche: '' };
  blatt('Melden', '<div id="meIn"></div>', `<button class="kn haupt gross" data-a="meOk" id="meOk">Melden</button>`);
  meZeichne();
}
function meZeichne() {
  const l = leib(); if (!l || !ME) return; const i = BY[ME.id];
  $('#meIn', l).innerHTML = i ? `<div class="pick" style="border-bottom:0">${bild(i)}<div style="min-width:0"><b>${esc(i.n)}</b><small>${KAT[i.k]}</small></div><button class="kn leise" data-a="meAnders">Anderes</button></div>
    <div class="wahl"><button data-a="meArt" data-v="defekt" aria-pressed="${ME.art === 'defekt'}">Defekt</button><button data-a="meArt" data-v="fehlt" aria-pressed="${ME.art === 'fehlt'}">Fehlt</button></div>
    ${i.q > 1 ? `<label class="feld">Wie viele von ${i.q}?</label><div class="zaehler"><button data-a="meQ" data-v="-1" aria-label="weniger">−</button><span class="num">${ME.q}</span><button data-a="meQ" data-v="1" aria-label="mehr">+</button></div>` : ''}
    <label class="feld">${ME.art === 'fehlt' ? 'Wo zuletzt gesehen?' : 'Was ist kaputt?'}<textarea id="meNote" placeholder="${ME.art === 'fehlt' ? 'z. B. nach dem Dreh am Freitag nicht mehr im Koffer' : 'z. B. Lüfter läuft nicht mehr an'}">${esc(ME.note || '')}</textarea></label>
    <div class="fotofeld">${ME.foto ? `<div class="bild foto"><img src="${ME.foto}" alt=""></div>` : ''}<button class="kn" data-a="meFoto">${IC.foto} ${ME.foto ? 'Anderes Foto' : 'Foto dazu'}</button></div>`
    : `<div class="suche">${IC.lupe}<input id="meQ" type="search" placeholder="Welches Gerät?" autocomplete="off" value="${esc(ME.suche)}" aria-label="Gerät suchen"></div><div id="meListe">${suche(ME.suche, IT).slice(0, 40).map(k => `<button class="pick" data-a="meWahl" data-id="${k.id}">${bild(k)}<div style="min-width:0"><b>${esc(k.n)}</b><small>${KAT[k.k]}</small></div><span></span></button>`).join('')}</div>`;
  $('#meOk').style.display = i ? '' : 'none';
}
let NE = null;
function bNeu(vor, id) {
  NACH_NEU = null;
  const i = id ? BY[id] : null;
  NE = i ? { id, n: i.n, k: i.k, q: i.q, m: i.m || '', sn: i.sn || '', ort: i.ort || '', notiz: i.notiz || '', foto: '' } : { n: vor || '', k: rateKat(vor || ''), q: 1, m: '', sn: '', foto: '', auto: true };
  blatt(i ? 'Bearbeiten' : 'Neues Gerät', `<label class="feld">Name<input id="neN" value="${esc(NE.n)}" placeholder="z. B. Aputure LS 600d" autocomplete="off"></label><div id="neTipp"></div>
    <label class="feld">Kategorie<select id="neK"><option value="">bitte wählen</option>${Object.entries(KAT).map(([k, l]) => `<option value="${k}" ${NE.k === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <div class="zwei-sp"><label class="feld">Menge<input id="neQ" type="number" inputmode="numeric" min="1" value="${NE.q}"></label><label class="feld">Seriennummer<input id="neSn" value="${esc(NE.sn)}" autocomplete="off"></label></div>
    <label class="feld">Modell<input id="neM" value="${esc(NE.m)}" autocomplete="off"></label>
    <datalist id="orte">${[...new Set(IT.map(x => x.ort).filter(Boolean))].map(o => `<option value="${esc(o)}">`).join('')}</datalist>
    <label class="feld">Standort<input id="neOrt" list="orte" value="${esc(NE.ort || '')}" placeholder="z. B. Regal 2, Koffer FX3" autocomplete="off"></label>
    <label class="feld">Notiz oder Zubehör<input id="neNotiz" value="${esc(NE.notiz || '')}" placeholder="z. B. mit Tasche und 2 Akkus" autocomplete="off"></label>
    <div class="fotofeld" id="neFoto"><button class="kn" data-a="neFoto">${IC.foto} Foto aufnehmen</button></div>
    ${i ? `<p class="notiz"><button class="kn bad leise" data-a="archiv" data-id="${id}">Aus dem Bestand nehmen</button></p>` : ''}`,
    `<button class="kn haupt gross" data-a="neOk">${i ? 'Speichern' : 'Anlegen'}</button>`);
  neTipp();
}
function neTipp() {
  const l = leib(); if (!l || !NE || NE.id) return; const n = $('#neN', l).value.trim();
  const dup = n.length > 2 ? suche(n, IT).slice(0, 1)[0] : null;
  $('#neTipp', l).innerHTML = dup ? `<p class="tipp">Gibt es schon: <b>${esc(dup.n)}</b> (${dup.q} Stück). <button data-a="plusEins" data-id="${dup.id}">Dort ein Stück mehr eintragen</button></p>` : '';
  if (NE.auto) { const k = rateKat(n); if (k) $('#neK', l).value = k; }
}
let RG = null;
function bRegal(modus) {
  if (!brauchtName(() => bRegal(modus))) return;
  const filt = { neu: i => i.z === 'neu', foto: i => !i.b, sn: i => ['Camera', 'Lens', 'Monitor'].includes(i.k) && !i.sn }[modus];
  const l = IT.filter(filt).sort((a, b) => Object.keys(KAT).indexOf(a.k) - Object.keys(KAT).indexOf(b.k) || a.n.localeCompare(b.n));
  RG = { modus, ids: l.map(i => i.id), n: 0, q: null };
  blatt({ neu: 'Regal prüfen', foto: 'Fotos nachtragen', sn: 'Seriennummern' }[modus], '<div class="pruef" id="rgIn"></div>');
  rgZeichne();
}
function rgZeichne(rein) {
  const l = leib(); if (!l || !RG) return;
  const i = BY[RG.ids[RG.n]], ges = RG.ids.length;
  if (!i) { $('#rgIn', l).innerHTML = `<div style="padding:40px 0"><div style="width:72px;height:72px;margin:0 auto;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center">${IC.hak.replace('<svg', '<svg width="36" height="36"')}</div><h4>Durch.</h4><p>${ges ? ges + ' Positionen erledigt.' : 'Hier gibt es nichts mehr zu tun.'}</p><button class="kn haupt gross" data-a="zu">Fertig</button></div>`; return; }
  if (RG.q == null) RG.q = i.q;
  const kn = { neu: `<div style="margin:6px 0 14px"><span class="tipp" style="display:block;margin-bottom:6px">Soll: ${i.q} Stück. Wie viele liegen da?</span><div class="zaehler"><button data-a="rgQ" data-v="-1" aria-label="weniger">−</button><span class="num">${RG.q}</span><button data-a="rgQ" data-v="1" aria-label="mehr">+</button></div></div>
      <button class="kn haupt gross voll" data-a="rgOk">${IC.hak} ${RG.q === i.q ? 'Stimmt' : RG.q === 0 ? 'Nichts da, als fehlend melden' : 'Menge auf ' + RG.q + ' ändern'}</button>
      <div class="vier"><button class="kn warn" data-a="rgDef">Defekt</button><button class="kn" data-a="rgFoto">${IC.foto} Foto</button></div>`,
    foto: `<button class="kn haupt gross voll" data-a="rgFoto">${IC.foto} Foto aufnehmen</button>`,
    sn: `<label class="feld" style="text-align:left">Seriennummer<input id="rgSn" autocomplete="off" autocapitalize="characters" placeholder="steht meist unten am Gerät"></label><button class="kn haupt gross voll" style="margin-top:10px" data-a="rgSn">Speichern</button>` }[RG.modus];
  $('#rgIn', l).innerHTML = `<div class="tipp num">${RG.n + 1} von ${ges} · ${KAT[i.k]}</div><div class="bahn"><i style="width:${RG.n / ges * 100}%"></i></div>
    <div class="${rein ? 'karte-rein' : ''}" id="rgK">${bild(i)}<h4>${esc(i.n)}</h4><p>${esc(i.m || '')}</p></div>${kn}
    <p><button class="kn leise voll" data-a="rgWeiter">Überspringen</button></p>`;
}
function rgWeiter() { const k = $('#rgK'); if (k) k.className = 'karte-raus'; RG.q = null; setTimeout(() => { RG.n++; rgZeichne(true); }, 240); }
function brauchtName(dann) {
  if (S.me) return true;
  blatt('Wer bist du?', `<p style="margin-top:0">Dein Name steht bei jeder Buchung und Meldung, damit man nachfragen kann.</p><label class="feld">Vorname<input id="ichN" autocomplete="given-name" value="${esc(S.me)}"></label>`, `<button class="kn haupt gross" data-a="nameOk">Weiter</button>`);
  NACH = dann; setTimeout(() => { const f = $('#ichN'); f && f.focus(); }, 400); return false;
}
let NACH = null;
function bAktion() {
  blatt('Was möchtest du tun?', `<div class="aktionen">
    <button data-a="mit"><i>${IC.raus}</i><div><b>Mitnehmen</b><span>Geräte auf ein Projekt buchen</span></div></button>
    <button data-a="zurueckWahl"><i>${IC.rein}</i><div><b>Zurückbringen</b><span>Nach dem Dreh alles abhaken</span></div></button>
    <button data-a="melden" data-v="defekt"><i style="color:var(--warn)">${IC.warn}</i><div><b>Defekt melden</b><span>Mit Foto und kurzer Beschreibung</span></div></button>
    <button data-a="melden" data-v="fehlt"><i style="color:var(--bad)">${IC.frage}</i><div><b>Fehlt melden</b><span>Etwas ist nicht da, wo es sein soll</span></div></button>
    <button data-a="neu"><i>${IC.neu}</i><div><b>Neues Gerät</b><span>Name, Foto, fertig</span></div></button>
    <button data-a="inventur"><i>${IC.regal}</i><div><b>Bestandsaufnahme</b><span>Gerät für Gerät durchfragen</span></div></button>
  </div>`);
}
function teilen(txt) {
  if (navigator.share) navigator.share({ title: 'Mainfilm Inventar', text: txt }).catch(() => {});
  else { try { navigator.clipboard.writeText(txt); toast('In die Zwischenablage kopiert', true); } catch (e) {} }
}
function datei(name, inhalt, typ) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([inhalt], { type: typ })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }


/* ---------- Bestandsaufnahme: geführte Fragen je Gerät ---------- */
// Grundbestand nachziehen: neue Meldungen aus dem Abzug übernehmen, dort entfallene Start-Buchungen schließen
for (const m of SEED.mel) if (!S.mel.some(x => x.id === m.id)) S.mel.push({ ...m });
for (const o of S.out) if (!o.zu && String(o.id).startsWith('s-') && !SEED.out.some(x => x.id === o.id)) o.zu = Date.now();
if (!S.inv) S.inv = { start: '', done: {} };
for (const i of SEED.items) if (i.erf && !S.inv.done[i.id]) { S.inv.done[i.id] = 1; if (!S.inv.start) S.inv.start = i.lc || ''; }
for (const b of S.bed) if (!b.st) b.st = b.zu ? 'da' : 'offen';
for (const sb of SEED.bed || []) if (sb.st === 'da') { const b = S.bed.find(x => x.id === sb.id); if (b && b.st !== 'da') { b.st = 'da'; b.inv = 1; b.zu = Date.now(); } }
const ZU_L = { top: 'Einwandfrei', ok: 'Gebrauchsspuren, funktioniert', eing: 'Eingeschränkt nutzbar', defekt: 'Defekt' };
const NUTZ_L = { oft: 'Oft im Einsatz', selten: 'Selten im Einsatz', weg: 'Wird nicht mehr gebraucht' };
const J = (f, nein) => ({ f, nein });
function fragenFuer(i) {
  const n = norm(i.n);
  if (i.k === 'Camera') return [J('Sensor sauber, keine Flecken im Bild?', { mangel: 'Sensor verschmutzt' }), J('Gehäusedeckel und alle Klappen dran?', { kauf: 'Gehäusedeckel oder Klappe für ' + i.n })];
  if (i.k === 'Lens') return [J('Front- und Rückdeckel dabei?', { kauf: 'Objektivdeckel für ' + i.n }), J('Glas frei von Kratzern, Staub und Pilz?', { mangel: 'Glas nicht sauber' }), J('Fokus- und Zoomring laufen sauber?', { mangel: 'Ring läuft nicht sauber' })];
  if (i.k === 'Audio') return /xlr|klinke|adapter|kabel/.test(n) ? [J('Stecker fest, kein Knacken oder Wackeln?', { mangel: 'Stecker wackelt oder knackt' })] : [J('Getestet: Signal kommt sauber an?', { mangel: 'Signal nicht sauber' }), J('Windschutz, Klemme und Zubehör vollständig?', { kauf: 'Zubehör für ' + i.n })];
  if (i.k === 'Light') return [J('Getestet: leuchtet, Lüfter läuft ruhig?', { mangel: 'Leuchtet nicht sauber oder Lüfter laut' }), J('Netzteil, Kabel und Halterung dabei?', { kauf: 'Netzteil oder Kabel für ' + i.n })];
  if (i.k === 'Light Support' || i.k === 'Camera Support') return [J('Alles fest, nichts verbogen, Klemmen halten?', { mangel: 'Klemmt, verbogen oder hält nicht' }), J('Platten, Zapfen und Schrauben vollständig?', { kauf: 'Kleinteile für ' + i.n })];
  if (i.k === 'Monitor') return [J('Display ohne Kratzer und Pixelfehler?', { mangel: 'Display beschädigt' }), J('Kabel, Akkuplatte und Sonnenschutz dabei?', { kauf: 'Zubehör für ' + i.n })];
  if (i.k === 'Filter') return [J('Glas ohne Kratzer?', { mangel: 'Glas verkratzt' }), J('Dose oder Etui dabei?', { kauf: 'Filteretui für ' + i.n })];
  if (i.k === 'Power') return /akku|v-mount/.test(n) ? [J('Halten die Akkus die Ladung noch gut?', { mangel: 'Akku schwach' }), J('Gehäuse heil, nichts aufgebläht?', { mangel: 'Akku beschädigt, nicht mehr laden' })] : [J('Kabel und Stecker unbeschädigt?', { mangel: 'Kabel oder Stecker beschädigt' })];
  return [];
}
function ivSchritte(i) { const s = ['da', 'zust', ...fragenFuer(i).map((_, k) => 'f' + k), 'ort']; if (['Camera', 'Lens', 'Monitor'].includes(i.k) && !i.sn) s.push('sn'); if (!i.b) s.push('foto'); s.push('nutz'); return s; }
let IV = null, NACH_NEU = null;
const katListe = () => Object.keys(KAT).filter(k => IT.some(i => i.k === k));
const ivOffen = k => IT.filter(i => i.k === k && !S.inv.done[i.id]);
function bInventur(kat) {
  if (!brauchtName(() => bInventur(kat))) return;
  if (!kat) kat = katListe().find(k => ivOffen(k).length) || katListe()[0];
  if (!S.inv.start) { S.inv.start = heute(); save(); }
  IV = { kat, ids: ivOffen(kat).sort((a, b) => a.n.localeCompare(b.n)).map(i => i.id), n: 0, st: 0, sub: null, q: 0, zust: null, mangel: [], foto: '', lastOrt: IV ? IV.lastOrt : '' };
  blatt(KAT[kat], '<div class="pruef" id="ivIn"></div>');
  ivZeichne();
}
function ivZeichne(rein) {
  const l = leib(); if (!l || !IV) return;
  const i = BY[IV.ids[IV.n]]; if (!i) return ivEnde(IV.kat);
  const steps = ivSchritte(i), sc = IV.sub || steps[IV.st];
  const B = (v, t, kl, sub) => `<button data-a="ivA" data-v="${v}" class="${kl || ''}"><span>${t}</span>${sub ? `<small>${sub}</small>` : ''}</button>`;
  let f = '', w = '';
  if (sc === 'da') { f = 'Liegt es vor dir?'; w = B('schnell', 'Da, einwandfrei und komplett', 'haupt', 'ein Tipp, fertig') + B('ja', i.q > 1 ? 'Ja, alle ' + i.q + ' sind da' : 'Ja, ist da', '', 'weiter mit Zustand') + (i.q > 1 ? B('teil', 'Nicht alle') : '') + B('nein', 'Nein, fehlt') + B('weg', 'Gibt es nicht mehr') + B('spaeter', 'Später', '', 'bleibt offen'); }
  else if (sc === 'menge') { f = `Wie viele von ${i.q} liegen da?`; w = `<div style="text-align:center;margin-bottom:8px"><div class="zaehler"><button data-a="ivQ" data-v="-1" aria-label="weniger">−</button><span class="num">${IV.q}</span><button data-a="ivQ" data-v="1" aria-label="mehr">+</button></div></div>` + (IV.q < i.q ? B('fehlen', `Die anderen ${i.q - IV.q} fehlen`, 'haupt') + B('falsch', 'Die Liste war falsch', '', 'Menge auf ' + IV.q + ' setzen') : B('falsch', IV.q === i.q ? 'Stimmt doch' : 'Menge auf ' + IV.q + ' setzen', 'haupt')); }
  else if (sc === 'zust') { f = 'In welchem Zustand?'; w = Object.entries(ZU_L).map(([k, t], n) => B(k, t, n ? '' : 'haupt')).join(''); }
  else if (sc === 'was') { f = IV.zust === 'defekt' ? 'Was ist kaputt?' : 'Was ist eingeschränkt?'; w = `<label class="feld" style="margin-top:0"><textarea id="ivNote" placeholder="kurz beschreiben"></textarea></label><div class="fotofeld">${IV.foto ? `<div class="bild foto"><img src="${IV.foto}" alt=""></div>` : ''}<button class="kn" data-a="ivWasFoto">${IC.foto} Foto dazu</button></div>` + B('weiter', 'Weiter', 'haupt'); }
  else if (/^f\d/.test(sc)) { f = fragenFuer(i)[+sc.slice(1)].f; w = B('ja', 'Ja', 'haupt') + B('nein', 'Nein') + B('skip', 'Nicht geprüft'); }
  else if (sc === 'ort') { const orte = [...new Set([IV.lastOrt, i.ort, ...IT.map(x => x.ort)].filter(Boolean))].slice(0, 8); f = 'Wo liegt es?'; w = (orte.length ? `<div class="dazu">${orte.map(o => `<button data-a="ivOrt" data-v="${esc(o)}" style="padding:0 14px;min-height:48px">${esc(o)}</button>`).join('')}</div>` : '') + `<label class="feld" style="margin-top:4px">Neuer Ort<input id="ivOrtN" placeholder="z. B. Regal 2, Koffer FX3" autocomplete="off"></label>` + B('weiter', 'Weiter', 'haupt') + B('skip', 'Überspringen'); }
  else if (sc === 'sn') { f = 'Seriennummer?'; w = `<label class="feld" style="margin-top:0"><input id="ivSnN" autocapitalize="characters" autocomplete="off" placeholder="steht meist unten am Gerät"></label>` + B('weiter', 'Speichern', 'haupt') + B('skip', 'Überspringen'); }
  else if (sc === 'foto') { f = 'Es gibt noch kein Foto.'; w = `<button data-a="ivFoto" class="haupt"><span>Foto aufnehmen</span></button>` + B('skip', 'Überspringen'); }
  else if (sc === 'nutz') { f = 'Wie oft ist das im Einsatz?'; w = B('oft', 'Oft', 'haupt') + B('selten', 'Selten') + B('weg', 'Nie, kann eigentlich weg'); }
  $('#ivIn', l).innerHTML = `<div class="tipp num">${IV.n + 1} von ${IV.ids.length} · Frage ${IV.st + 1} von ${steps.length}</div><div class="bahn"><i style="width:${(IV.n + IV.st / steps.length) / IV.ids.length * 100}%"></i></div>
    <div class="${rein ? 'karte-rein' : ''}" id="rgK"><div class="ivkopf">${bild(i)}<div><h4>${esc(i.n)}</h4><p>${esc(i.m || KAT[i.k])}${i.q > 1 ? ' · Soll ' + i.q + ' Stück' : ''}</p></div></div>
    <div class="ivfrage">${f}</div><div class="wahlliste">${w}</div></div>
    ${IV.st || IV.sub ? '<p><button class="kn leise voll" data-a="ivZurueck">Eine Frage zurück</button></p>' : ''}`;
  l.scrollTop = 0;
}
function ivNext() { const i = BY[IV.ids[IV.n]]; IV.sub = null; IV.st++; if (!i || IV.st >= ivSchritte(i).length) return ivFertig(); ivZeichne(); }
function ivFertig() {
  const id = IV.ids[IV.n];
  patch(id, { z: 'ok', lc: heute(), frage: '', ...(IV.zust ? { zust: IV.zust } : {}), mangel: IV.mangel.join('; ') });
  S.inv.done[id] = Date.now(); log(id, 'ok', 'Bestandsaufnahme' + (IV.zust ? ': ' + ZU_L[IV.zust] : ''));
  save(); rechne(); zeichne(); vibr(); ivWeiter();
}
function ivWeiter() { const k = $('#rgK'); if (k) k.classList.add('karte-raus'); setTimeout(() => { IV.n++; IV.st = 0; IV.sub = null; IV.zust = null; IV.mangel = []; IV.foto = ''; ivZeichne(true); }, 240); }
function ivEnde(kat) {
  const l = leib(); if (!l) return;
  const next = katListe().find(k => k !== kat && ivOffen(k).length), rest = ivOffen(kat).length;
  $('#ivIn', l).innerHTML = `<div style="padding:20px 0 6px"><div style="width:72px;height:72px;margin:0 auto;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center">${IC.hak.replace('<svg', '<svg width="36" height="36"')}</div><h4>${KAT[kat]} ist durch.</h4><p>${rest ? rest + ' hast du auf später geschoben.' : 'Alle Positionen erfasst.'}</p></div>
    <div class="ivfrage" style="text-align:center">Liegt bei ${KAT[kat]} noch etwas, das nicht aufgetaucht ist?</div>
    <div class="wahlliste"><button data-a="ivNeu" data-v="${kat}"><span>Ja, eintragen</span><small>neu dazugekommen</small></button>${next ? `<button class="haupt" data-a="inventur" data-v="${next}"><span>Nein, weiter mit ${KAT[next]}</span><small>${ivOffen(next).length} offen</small></button>` : `<button class="haupt" data-a="ivSchluss"><span>Nein, fertig</span></button>`}</div>`;
}
function vInventur() {
  const ges = IT.length, done = IT.filter(i => S.inv.done[i.id]).length, next = katListe().find(k => ivOffen(k).length);
  const mang = IT.filter(i => i.mangel), weg = IT.filter(i => i.nutz === 'weg'), selten = IT.filter(i => i.nutz === 'selten');
  const fe = IT.filter(i => i.fehlt), de = IT.filter(i => i.def), kauf = S.bed.filter(b => b.st === 'offen' && b.grund);
  const befund = (t, l, f) => l.length ? `<h2 style="font-size:18px">${t} <small>${l.length}</small></h2><div class="zeilen">${l.map(f).join('')}</div>` : '';
  const gz = (i, sub) => `<button class="zeile" data-a="geraet" data-id="${i.id}">${bild(i)}<div class="t"><b>${esc(i.n)}</b><span>${esc(sub)}</span></div><span></span></button>`;
  return `<h2>Bestandsaufnahme <small>${S.inv.start ? 'seit ' + tag(S.inv.start) : 'noch nicht begonnen'}</small></h2>
  <div class="iv-stand"><div><b class="gross-zahl num">${done}</b><span> von ${ges} erfasst</span></div><div class="bahn"><i style="width:${ges ? done / ges * 100 : 0}%"></i></div></div>
  ${next ? `<p><button class="kn haupt gross voll" data-a="inventur" data-v="${next}">${IC.regal} ${done ? 'Weiter mit' : 'Los, mit'} ${KAT[next]}</button></p><p class="notiz">Je Gerät ein paar Fragen zum Antippen: da, Zustand, vollständig, Standort. Was fehlt, landet automatisch im Einkauf. Du kannst jederzeit aufhören, der Stand bleibt.</p>` : '<p class="leer">Alles erfasst. Unten kannst du den Stand übergeben.</p>'}
  <div>${katListe().map(k => { const a = IT.filter(i => i.k === k), d = a.filter(i => S.inv.done[i.id]).length; return `<div class="katz"><b>${KAT[k]} <span class="num" style="font-weight:400;color:var(--mute)">${d} von ${a.length}</span></b><button class="kn ${d === a.length ? 'leise' : ''}" data-a="${d === a.length ? 'ivNeu' : 'inventur'}" data-v="${k}">${d === a.length ? '+ Neues' : d ? 'Weiter' : 'Start'}</button><div class="bahn"><i style="width:${d / a.length * 100}%"></i></div></div>`; }).join('')}</div>
  <h2>Neu dazugekommen <small>${S.neu.filter(i => !(S.it[i.id] || {}).arch).length}</small></h2>
  <div class="zeilen">${IT.filter(i => S.neu.some(n => n.id === i.id)).map(i => gz(i, KAT[i.k] + (i.q > 1 ? ' · ' + i.q + ' Stück' : ''))).join('')}</div>
  <p><button class="kn gross voll" data-a="neu">${IC.neu} Neues Gerät eintragen</button></p>
  ${done ? '<h2>Befunde</h2>' : ''}
  ${befund('Fehlt', fe, i => gz(i, i.fehlt + ' von ' + i.q))}${befund('Defekt', de, i => gz(i, (S.mel.find(m => !m.zu && m.itemId === i.id && m.art !== 'fehlt') || {}).note || ''))}
  ${befund('Eingeschränkt', mang, i => gz(i, i.mangel))}
  ${befund('Nachkaufen', kauf, b => `<div class="zeile ohne"><div class="t"><b>${esc(b.t)}</b><span>aus der Bestandsaufnahme</span></div><button class="kn leise" data-a="tab" data-tab="einkauf">Einkauf</button></div>`)}
  ${befund('Selten im Einsatz', selten, i => gz(i, KAT[i.k]))}${befund('Kann weg', weg, i => gz(i, KAT[i.k]))}
  <h2>Stand übergeben</h2>
  <div class="zeilen">
    <div class="zeile ohne"><div class="t"><b>Stand als Datei</b><span>Alles Erfasste samt Fotos, zum Einspielen in den Grundbestand</span></div><button class="kn" data-a="export">Speichern</button></div>
    <div class="zeile ohne"><div class="t"><b>Kurzbericht</b><span>Zahlen und Befunde als Text zum Weiterschicken</span></div><button class="kn" data-a="ivBericht">Teilen</button></div>
    <div class="zeile ohne"><div class="t"><b>Neue Runde</b><span>Setzt nur den Fortschritt zurück, nicht die Antworten</span></div><button class="kn leise" data-a="ivReset">Neu beginnen</button></div>
  </div>`;
}
function vEinkauf() {
  const g = st => S.bed.filter(b => b.st === st);
  const z = (b, kn) => `<div class="zeile ohne breit2"><div class="t"><b>${esc(b.t)}</b><span>${esc(b.grund || b.wer || '')}${b.ts ? ' · ' + tag(new Date(b.ts).toISOString()) : ''}</span></div><div class="akt">${kn.map(([a, t, kl]) => `<button class="kn ${kl || ''}" data-a="${a}" data-id="${b.id}">${t}</button>`).join('')}</div></div>`;
  const off = g('offen'), best = g('bestellt'), da = g('da').slice(-8).reverse();
  return `<h2>Einkauf <small>${off.length} zu besorgen</small></h2>
  <div class="suche">${IC.plus}<input id="bedN" enterkeyhint="done" autocomplete="off" placeholder="Was brauchen wir? Eintippen und Enter" aria-label="Bedarf eintragen"></div>
  <div class="zeilen" style="margin-top:12px">${off.map(b => z(b, [['bedBest', 'Bestellt'], ['bedDa', 'Ist da', 'leise'], ['bedWeg', '✕', 'leise']])).join('') || '<p class="leer">Nichts offen.</p>'}</div>
  ${off.length ? `<p><button class="kn" data-a="bedTeilen">Liste teilen</button></p>` : ''}
  <h2>Bestellt, noch nicht da <small>${best.length}</small></h2>
  <div class="zeilen">${best.map(b => z(b, [['bedDa', 'Ist da'], ['bedOffen', 'Doch nicht', 'leise']])).join('') || '<p class="leer">Nichts unterwegs.</p>'}</div>
  ${da.length ? `<h2>Angekommen</h2><div class="zeilen">${da.map(b => z(b, b.inv ? [] : [['bedInv', 'Ins Inventar']])).join('')}</div>` : ''}`;
}

/* ---------- Handlungen ---------- */
const A = {
  zu: () => zuBlatt(), schleier: (d, el, e) => { if (e.target === el) zuBlatt(); },
  tab: d => { zuBlatt(true); geh(d.tab); }, plus: () => bAktion(),
  geraet: d => bGeraet(d.id), projekt: d => bProjekt(d.v),
  filterSt: d => { F = { q: '', kat: '', st: d.v }; geh('bestand'); },
  kat: d => { F.kat = d.v; zeichne(); }, st: d => { F.st = d.v; zeichne(); },
  qLeer: () => { F.q = ''; zeichne(); $('#q').focus(); },
  befehl: () => { const c = befehl(F.q); if (!c) return; F.q = '';
    if (c.art === 'mit') bMit(c.i.id, c.pr); else if (c.art === 'defekt' || c.art === 'fehlt') bMelden(c.i.id, c.art);
    else if (c.art === 'zurueck') { S.out.filter(o => !o.zu && o.itemId === c.i.id).forEach(o => zurueck(o)); fertig(c.i.n + ' ist zurück'); }
    else if (c.art === 'ok') A.pruefOk({ id: c.i.id }); },
  mit: d => bMit(d.id, d.v), melden: d => bMelden(d.id, d.v), neu: d => bNeu(d.v), bearb: d => bNeu('', d.id), regal: d => bRegal(d.v),
  zurueckWahl: () => { const prs = [...new Set(S.out.filter(o => !o.zu && BY[o.itemId]).map(o => o.pr))];
    if (!prs.length) { zuBlatt(); return toast('Gerade ist nichts unterwegs'); }
    if (prs.length === 1) return bProjekt(prs[0]);
    blatt('Welches Projekt?', prs.map(p => projektZeile(p, S.out.filter(o => o.pr === p && !o.zu && BY[o.itemId]))).join('')); },
  imlager: d => { const o = S.out.find(x => x.id === d.id); if (!o) return; zurueck(o); zuBlatt(true); fertig(BY[o.itemId].n + ' ist im Lager'); },
  verl: d => { const o = S.out.find(x => x.id === d.id); if (!o) return; const t = new Date(); t.setDate(t.getDate() + 2); o.bis = t.toISOString().slice(0, 10); fertig('Verlängert bis ' + tag(o.bis)); },
  zuordnen: d => { const o = S.out.find(x => x.id === d.id); if (!o) return; ZU = o.id;
    blatt('Auf welchem Projekt?', `<p style="margin-top:0"><b>${esc(BY[o.itemId].n)}</b> steht als unterwegs, aber ohne Projekt.</p><datalist id="prs">${[...new Set(S.out.map(x => x.pr).filter(Boolean))].map(p => `<option value="${esc(p)}">`).join('')}</datalist><label class="feld">Projekt<input id="zuPr" list="prs" autocomplete="off"></label><label class="feld">Wer hat es?<input id="zuWer" value="${esc(S.me)}" autocomplete="off"></label>`, `<button class="kn haupt gross" data-a="zuOk">Zuordnen</button>`); },
  zuOk: () => { const o = S.out.find(x => x.id === ZU), p = $('#zuPr').value.trim(); if (!p) return $('#zuPr').focus(); o.pr = p; o.wer = $('#zuWer').value.trim(); log(o.itemId, 'raus', 'Projekt nachgetragen', p); zuBlatt(true); fertig('Zugeordnet'); },
  erl: d => { const m = S.mel.find(x => x.id === d.id); if (!m) return;
    if (d.v === 'ausgemustert' && !confirm(`${BY[m.itemId].n}: ${m.q} Stück endgültig aus dem Bestand nehmen?`)) return;
    erledige(m, d.v); zuBlatt(true); fertig({ repariert: 'Wieder einsatzbereit', gefunden: 'Wieder da', ausgemustert: 'Aus dem Bestand genommen' }[d.v]); },
  geklaert: d => { patch(d.id, { frage: '' }); log(d.id, 'ok', 'Angabe bestätigt'); fertig('Geklärt'); },
  pruefOk: d => { if (!brauchtName(() => A.pruefOk(d))) return; patch(d.id, { z: 'ok', lc: heute() }); log(d.id, 'ok', 'am Regal geprüft'); zuBlatt(true); fertig('Geprüft'); },
  fotoG: d => fotoWahl(url => { fotoSichern(d.id, url); patch(d.id, { b: 'idb:' + d.id }); log(d.id, 'foto', 'Foto aufgenommen'); zuBlatt(true); fertig('Foto gespeichert'); bGeraet(d.id); }),
  coPick: d => { const i = BY[d.id], n = CO.sel[d.id] || 0, f = freiIn(i, CO.von, CO.bis); if (!f) return; if (!n) CO.sel[d.id] = 1; else if (n < f) CO.sel[d.id] = n + 1; else delete CO.sel[d.id]; vibr(8); coZeichne(); },
  coOk: () => { const p = $('#coPr').value.trim(); if (!p) { $('#coPr').focus(); return toast('Für welches Projekt?'); }
    const n = Object.values(CO.sel).reduce((s, x) => s + x, 0); const spaeter = CO.von > heute(); nimm(CO.sel, p, S.me, CO.von, CO.bis); CO = null; zuBlatt(true); fertig(`${n} ${n === 1 ? 'Teil' : 'Teile'} ${spaeter ? 'für' : 'auf'} ${p} ${spaeter ? 'reserviert' : 'gebucht'}`); },
  coVorlage: d => { let z = 0; for (const re of VORLAGE[d.v]) { const i = IT.find(k => re.test(k.n) && !CO.sel[k.id] && freiIn(k, CO.von, CO.bis) > 0); if (i) { CO.sel[i.id] = /akku/i.test(i.n) ? Math.min(3, freiIn(i, CO.von, CO.bis)) : 1; z++; } } coZeichne(); toast(z ? z + ' Positionen vorgeschlagen, bitte anpassen' : 'Dafür ist gerade nichts frei', !!z); vibr(); },
  absagen: d => { const o = S.out.find(x => x.id === d.id); if (!o) return; o.zu = Date.now(); log(o.itemId, 'rein', 'Reservierung abgesagt', o.pr); zuBlatt(true); fertig('Reservierung abgesagt'); },
  bedOk: d => { const b = S.bed.find(x => x.id === d.id); if (b) { b.zu = Date.now(); fertig('Erledigt'); } },
  ru: (d, el) => { RU[d.id] = d.v; $$('[data-a="ru"][data-id="' + d.id + '"]').forEach(b => b.setAttribute('aria-pressed', b === el)); vibr(8); },
  ruOk: d => { let z = 0, pr = 0; for (const [id, w] of Object.entries(RU)) { const o = S.out.find(x => x.id === id); if (!o || w === 'bleibt') continue;
      zurueck(o, w === 'da' ? '' : w); z++; if (w !== 'da') { melde(o.itemId, w, o.q, 'bei der Rückgabe von ' + o.pr + ' gemeldet', '', o.pr); pr++; } }
    zuBlatt(true); fertig(z ? `${z} zurückgebucht${pr ? ', ' + pr + ' gemeldet' : ''}` : 'Nichts geändert'); },
  meArt: d => { ME.note = ($('#meNote') || {}).value || ''; ME.art = d.v; meZeichne(); },
  meQ: d => { ME.note = ($('#meNote') || {}).value || ''; ME.q = Math.max(1, Math.min(BY[ME.id].q, ME.q + +d.v)); meZeichne(); },
  meWahl: d => { ME.id = d.id; meZeichne(); }, meAnders: () => { ME.id = ''; meZeichne(); },
  meFoto: () => fotoWahl(url => { ME.note = ($('#meNote') || {}).value || ''; ME.foto = url; meZeichne(); }),
  meOk: () => { const i = BY[ME.id]; if (!i) return; const note = $('#meNote').value.trim(); let fk = '';
    if (ME.foto) { fk = 'm' + uid(); fotoSichern(fk, ME.foto); }
    const offen = S.out.find(o => !o.zu && o.itemId === i.id);
    melde(i.id, ME.art, ME.q, note, fk, offen ? offen.pr : '');
    const txt = `${ME.art === 'fehlt' ? 'FEHLT' : 'DEFEKT'}: ${i.n}${ME.q > 1 ? ' (' + ME.q + ' Stück)' : ''}${note ? '. ' + note : ''} Gemeldet von ${S.me}. ${location.origin + location.pathname}#/g/${i.id}`;
    ME = null; zuBlatt(true); fertig();
    blatt('Gemeldet', `<div class="pruef" style="padding:10px 0 4px"><div style="width:72px;height:72px;margin:0 auto;border-radius:50%;background:var(--ok-soft);color:var(--ok);display:grid;place-items:center">${IC.hak.replace('<svg', '<svg width="36" height="36"')}</div><h4>${esc(i.n)}</h4><p>Steht jetzt unter „Zu erledigen“.</p></div>`, `<button class="kn" data-a="zu">Fertig</button><button class="kn haupt" data-a="teilen" data-v="${esc(txt)}">Weitersagen</button>`); },
  teilen: d => teilen(d.v),
  neFoto: () => fotoWahl(url => { NE.foto = url; $('#neFoto').innerHTML = `<div class="bild foto"><img src="${url}" alt=""></div><button class="kn" data-a="neFoto">${IC.foto} Anderes Foto</button>`; }),
  plusEins: d => { const i = BY[d.id]; patch(d.id, { q: i.q + 1 }); log(d.id, 'ok', 'Menge auf ' + (i.q + 1) + ' erhöht'); zuBlatt(true); fertig(i.n + ': jetzt ' + (i.q + 1) + ' Stück'); },
  neOk: () => { if (!brauchtName(() => {})) return; const n = $('#neN').value.trim(), k = $('#neK').value; if (!n) return $('#neN').focus(); if (!k) { $('#neK').focus(); return toast('Kategorie wählen'); }
    const o = { n, k, q: Math.max(1, parseInt($('#neQ').value) || 1), sn: $('#neSn').value.trim(), m: $('#neM').value.trim(), ort: $('#neOrt').value.trim(), notiz: $('#neNotiz').value.trim() };
    let id = NE.id;
    if (id) { patch(id, o); log(id, 'ok', 'Angaben geändert'); }
    else { id = 'n' + uid(); S.neu.push({ id, ...o, z: 'ok', lc: heute(), b: '' }); log(id, 'ok', 'neu angelegt'); }
    if (NE.foto) { fotoSichern(id, NE.foto); patch(id, { b: 'idb:' + id }); }
    const neu = !NE.id; NE = null; zuBlatt(true); if (neu && S.inv.start) S.inv.done[id] = Date.now(); fertig(neu ? n + ' angelegt' : 'Gespeichert');
    if (NACH_NEU) { const k = NACH_NEU; NACH_NEU = null; if (neu) { IV = { kat: k, ids: [], n: 0, st: 0, mangel: [], lastOrt: IV ? IV.lastOrt : '' }; blatt(KAT[k], '<div class="pruef" id="ivIn"></div>'); ivEnde(k); } } },
  archiv: d => { if (!confirm('Wirklich aus dem Bestand nehmen?')) return; patch(d.id, { arch: true }); log(d.id, 'aus', 'aus dem Bestand genommen'); zuBlatt(true); fertig('Entfernt'); },
  rgQ: d => { RG.q = Math.max(0, RG.q + +d.v); rgZeichne(); }, rgWeiter: () => rgWeiter(),
  rgOk: () => { const i = BY[RG.ids[RG.n]];
    if (RG.q === 0) melde(i.id, 'fehlt', i.q, 'bei der Regalprüfung nicht gefunden');
    else if (RG.q !== i.q) { patch(i.id, { q: RG.q }); log(i.id, 'ok', `Menge von ${i.q} auf ${RG.q} korrigiert`); }
    patch(i.id, { z: 'ok', lc: heute(), frage: '' }); log(i.id, 'ok', 'am Regal geprüft'); save(); rechne(); zeichne(); vibr(); rgWeiter(); },
  rgDef: () => { const i = BY[RG.ids[RG.n]]; melde(i.id, 'defekt', 1, 'bei der Regalprüfung aufgefallen'); patch(i.id, { z: 'ok', lc: heute() }); save(); rechne(); zeichne(); toast('Als defekt gemeldet', true); rgWeiter(); },
  rgFoto: () => { const i = BY[RG.ids[RG.n]]; fotoWahl(url => { fotoSichern(i.id, url); patch(i.id, { b: 'idb:' + i.id }); log(i.id, 'foto', 'Foto aufgenommen'); save(); rechne(); zeichne(); if (RG.modus === 'foto') rgWeiter(); else rgZeichne(); toast('Foto gespeichert', true); }); },
  rgSn: () => { const v = $('#rgSn').value.trim(); if (!v) return $('#rgSn').focus(); const i = BY[RG.ids[RG.n]]; patch(i.id, { sn: v }); log(i.id, 'ok', 'Seriennummer eingetragen'); save(); rechne(); zeichne(); vibr(); rgWeiter(); },
  name: () => { const alt = S.me; S.me = ''; brauchtName(() => {}); S.me = alt; $('#ichN').value = alt; },
  nameOk: () => { const v = $('#ichN').value.trim(); if (!v) return $('#ichN').focus(); S.me = v; save(); zuBlatt(true); zeichne(); const f = NACH; NACH = null; f && f(); },
  export: () => datei('mainfilm-inventar-' + heute() + '.json', JSON.stringify({ v: 1, S, fotos: [...FOTO] }), 'application/json'),
  import: () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
    inp.onchange = () => { const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d.S || !d.S.init) throw 0; if (!confirm('Den Stand auf diesem Gerät durch die Sicherung ersetzen?')) return; S = d.S; (d.fotos || []).forEach(([k, v]) => fotoSichern(k, v)); fertig('Sicherung eingespielt'); } catch (e) { toast('Das ist keine Inventar-Sicherung'); } }; r.readAsText(inp.files[0]); };
    inp.click(); },
  csv: () => datei('mainfilm-bestand-' + heute() + '.csv', '﻿' + ['Name;Kategorie;Menge;Zustand;Frei;Modell;Seriennummer;Zuletzt geprüft', ...IT.map(i => [i.n, KAT[i.k], i.q, ST[i.st][0], i.frei, i.m || '', i.sn || '', i.lc || ''].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(';'))].join('\n'), 'text/csv'),
  reset: () => { if (!confirm('Alles löschen, was auf diesem Gerät eingetragen wurde? Der Grundbestand bleibt.')) return; localStorage.removeItem(KEY); if (idb) idb.transaction('fotos', 'readwrite').objectStore('fotos').clear(); location.hash = ''; location.reload(); },
  etiketten: () => { const base = location.origin + location.pathname + '#/g/'; let e = $('.etiketten'); if (!e) { e = document.createElement('div'); e.className = 'etiketten'; document.body.appendChild(e); }
    e.innerHTML = IT.map(i => { const q = qrcode(0, 'M'); q.addData(base + i.id); q.make(); return `<div class="etikett">${q.createSvgTag({ cellSize: 2, margin: 0, scalable: true })}<div>${esc(i.n)}<small>${KAT[i.k]}${i.sn ? ' · ' + esc(i.sn) : ''}</small><small>Mainfilm</small></div></div>`; }).join('');
    setTimeout(() => window.print(), 80); },
};

Object.assign(A, {
  inventur: d => bInventur(d.v), ivSchluss: () => { zuBlatt(); geh('inventur'); },
  ivQ: d => { const i = BY[IV.ids[IV.n]]; IV.q = Math.max(0, IV.q + +d.v); ivZeichne(); },
  ivZurueck: () => { if (IV.sub) IV.sub = null; else if (IV.st > 0) IV.st--; ivZeichne(); },
  ivA: d => { const i = BY[IV.ids[IV.n]]; if (!i) return; const sc = IV.sub || ivSchritte(i)[IV.st], v = d.v;
    const fehltMeld = q => { if (q > 0) melde(i.id, 'fehlt', q, 'bei der Bestandsaufnahme nicht gefunden'); };
    if (sc === 'da') {
      if (v === 'ja') return ivNext();
      if (v === 'schnell') { IV.zust = 'top'; return ivFertig(); }
      if (v === 'teil') { IV.sub = 'menge'; IV.q = Math.max(0, i.q - 1); return ivZeichne(); }
      if (v === 'nein') { fehltMeld(i.q - i.fehlt); return ivFertig(); }
      if (v === 'weg') { if (!confirm(i.n + ' endgültig aus dem Bestand nehmen?')) return; patch(i.id, { arch: true }); log(i.id, 'aus', 'bei der Bestandsaufnahme ausgebucht'); return ivFertig(); }
      if (v === 'spaeter') return ivWeiter();
    }
    if (sc === 'menge') { if (v === 'fehlen') fehltMeld(i.q - IV.q - i.fehlt); else if (IV.q !== i.q) { if (IV.q === 0) { patch(i.id, { arch: true }); log(i.id, 'aus', 'Menge 0, ausgebucht'); return ivFertig(); } patch(i.id, { q: IV.q }); log(i.id, 'ok', `Menge von ${i.q} auf ${IV.q} korrigiert`); }
      save(); rechne(); if (IV.q === 0) return ivFertig(); return ivNext(); }
    if (sc === 'zust') { IV.zust = v; if (v === 'eing' || v === 'defekt') { IV.sub = 'was'; return ivZeichne(); } return ivNext(); }
    if (sc === 'was') { const note = $('#ivNote').value.trim(); let fk = ''; if (IV.foto) { fk = 'm' + uid(); fotoSichern(fk, IV.foto); }
      if (IV.zust === 'defekt') { if (!i.def) melde(i.id, 'defekt', 1, note || 'bei der Bestandsaufnahme als defekt erfasst', fk); } else IV.mangel.push(note || 'eingeschränkt');
      save(); rechne(); return ivNext(); }
    if (/^f\d/.test(sc)) { if (v === 'nein') { const c = fragenFuer(i)[+sc.slice(1)].nein;
        if (c.kauf && !S.bed.some(b => b.t === c.kauf && b.st !== 'da')) S.bed.push({ id: uid(), t: c.kauf, wer: S.me, ts: Date.now(), st: 'offen', grund: 'Bestandsaufnahme', zu: null });
        if (c.mangel) { IV.mangel.push(c.mangel); if (IV.zust === 'top' || IV.zust === 'ok') IV.zust = 'eing'; } }
      return ivNext(); }
    if (sc === 'ort') { if (v === 'weiter') { const o = $('#ivOrtN').value.trim(); if (o) { patch(i.id, { ort: o }); IV.lastOrt = o; } } return ivNext(); }
    if (sc === 'sn') { if (v === 'weiter') { const o = $('#ivSnN').value.trim(); if (!o) return $('#ivSnN').focus(); patch(i.id, { sn: o }); } return ivNext(); }
    if (sc === 'foto') return ivNext();
    if (sc === 'nutz') { patch(i.id, { nutz: v }); return ivNext(); }
  },
  ivOrt: d => { const i = BY[IV.ids[IV.n]]; patch(i.id, { ort: d.v }); IV.lastOrt = d.v; ivNext(); },
  ivFoto: () => { const i = BY[IV.ids[IV.n]]; fotoWahl(url => { fotoSichern(i.id, url); patch(i.id, { b: 'idb:' + i.id }); save(); rechne(); ivNext(); }); },
  ivWasFoto: () => fotoWahl(url => { const n = $('#ivNote').value; IV.foto = url; ivZeichne(); $('#ivNote').value = n; }),
  ivNeu: d => { bNeu(''); NACH_NEU = d.v; NE.k = d.v; NE.auto = false; $('#neK').value = d.v; },
  ivReset: () => { if (!confirm('Fortschritt der Bestandsaufnahme zurücksetzen? Antworten und Zustände bleiben erhalten.')) return; S.inv = { start: '', done: {} }; fertig('Neue Runde'); },
  ivBericht: () => { const done = IT.filter(i => S.inv.done[i.id]).length; const L = (t, l) => l.length ? `\n${t}: ${l.join(', ')}` : '';
    teilen(`Mainfilm Inventar, Stand ${tag(heute())}: ${done} von ${IT.length} Positionen erfasst.` + L('Fehlt', IT.filter(i => i.fehlt).map(i => i.n)) + L('Defekt', IT.filter(i => i.def).map(i => i.n)) + L('Eingeschränkt', IT.filter(i => i.mangel).map(i => i.n + ' (' + i.mangel + ')')) + L('Neu', IT.filter(i => S.neu.some(n => n.id === i.id)).map(i => i.n)) + L('Kann weg', IT.filter(i => i.nutz === 'weg').map(i => i.n)) + L('Zu besorgen', S.bed.filter(b => b.st === 'offen').map(b => b.t))); },
  bedBest: d => { const b = S.bed.find(x => x.id === d.id); if (b) { b.st = 'bestellt'; b.ts = Date.now(); fertig('Als bestellt markiert'); } },
  bedOffen: d => { const b = S.bed.find(x => x.id === d.id); if (b) { b.st = 'offen'; fertig(); } },
  bedWeg: d => { S.bed = S.bed.filter(x => x.id !== d.id); fertig('Gestrichen'); },
  bedDa: d => { const b = S.bed.find(x => x.id === d.id); if (!b) return; b.st = 'da'; b.zu = Date.now(); fertig('Angekommen');
    blatt('Angekommen', `<p style="margin-top:0"><b>${esc(b.t)}</b> ist da. Soll es als Gerät ins Inventar?</p>`, `<button class="kn" data-a="zu">Nein</button><button class="kn haupt" data-a="bedInv" data-id="${b.id}">Ins Inventar</button>`); },
  bedInv: d => { const b = S.bed.find(x => x.id === d.id); if (!b) return; b.inv = 1; save(); bNeu(b.t.replace(/, \d+ Stück$/, '')); },
  bedTeilen: () => teilen('Einkauf Mainfilm Equipment:\n' + S.bed.filter(b => b.st === 'offen').map(b => '• ' + b.t).join('\n')),
});
let ZU = null;
document.addEventListener('click', e => { const el = e.target.closest('[data-a]'); if (!el || el.disabled) return; const f = A[el.dataset.a]; if (f) f(el.dataset, el, e); });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'q') { F.q = t.value; const cmd = befehl(F.q); let l = IT; if (F.kat) l = l.filter(i => i.k === F.kat); if (F.st) l = l.filter(i => F.st === 'foto' ? !i.b : i.st === F.st);
    const CT = { mit: 'Mitnehmen', defekt: 'Defekt melden', fehlt: 'Fehlt melden', zurueck: 'Zurückbuchen', ok: 'Als geprüft bestätigen' };
    $('#cmd').innerHTML = cmd ? `<button class="befehl" data-a="befehl"><i>${CT[cmd.art]}</i><span>${esc(cmd.i.n)}${cmd.pr ? ' · ' + esc(cmd.pr) : ''}</span></button>` : '';
    $('#raster').innerHTML = raster(cmd ? [cmd.i] : suche(F.q, l)); }
  else if (t.id === 'coQ') { CO.q = t.value; coZeichne(); }
  else if (t.id === 'coVon' || t.id === 'coBis') { CO.von = $('#coVon').value || heute(); CO.bis = $('#coBis').value; if (CO.bis && CO.bis < CO.von) { CO.bis = CO.von; $('#coBis').value = CO.von; } coZeichne(); }
  else if (t.id === 'meQ') { ME.suche = t.value; $('#meListe').innerHTML = suche(ME.suche, IT).slice(0, 40).map(k => `<button class="pick" data-a="meWahl" data-id="${k.id}">${bild(k)}<div style="min-width:0"><b>${esc(k.n)}</b><small>${KAT[k.k]}</small></div><span></span></button>`).join(''); }
  else if (t.id === 'neN') neTipp();
  else if (t.id === 'neK') NE.auto = false;
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') zuBlatt();
  if (e.key === 'Enter' && e.target.id === 'q') { const c = befehl(F.q); if (c) A.befehl(); }
  if (e.key === 'Enter' && e.target.id === 'ichN') A.nameOk();
  if (e.key === 'Enter' && e.target.id === 'bedN' && e.target.value.trim()) { if (!brauchtName(() => {})) return; S.bed.push({ id: uid(), t: e.target.value.trim(), wer: S.me, ts: Date.now(), st: 'offen', zu: null }); fertig('Notiert'); const f = $('#bedN'); f && f.focus(); }
});
function weg() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h.startsWith('g/')) { VIEW = 'bestand'; zeichne(); bGeraet(decodeURIComponent(h.slice(2))); }
  else if (['heute', 'bestand', 'inventur', 'einkauf', 'projekte', 'mehr'].includes(h)) geh(h, true);
  else geh('heute', true);
}
window.addEventListener('hashchange', weg);

(async () => {
  await idbAuf(); await fotosLaden();
  $('#unten').innerHTML = [['heute', 'Heute'], ['bestand', 'Bestand']].map(([k, l]) => `<button data-a="tab" data-tab="${k}">${IC[k]}${l}</button>`).join('') + `<button class="plus" data-a="plus" aria-label="Aktion">${IC.plus}</button>` + [['inventur', 'Inventur'], ['mehr', 'Mehr']].map(([k, l]) => `<button data-a="tab" data-tab="${k}">${IC[k === 'inventur' ? 'regal' : k]}${l}</button>`).join('');
  rechne(); weg();
  if (!S.me && !location.hash.startsWith('#/g/')) brauchtName(() => {});
})();
})();
