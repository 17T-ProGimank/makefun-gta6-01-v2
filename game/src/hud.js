// hud.js — SOLMARA heads-up display (round 4).
// Base HUD ids plus round-4 additions: #respect-bar + #respect-label,
// #crew-box, #garage-hint. Every update is defensive: a missing element is
// skipped, never an exception, so the game keeps running if index.html is
// missing a panel. Minimap is a top-down 180x180 canvas, north up.

const HUD_IDS = [
  'hud', 'stars', 'money', 'objective', 'health-bar', 'health-fill',
  'speed', 'minimap', 'banner', 'banner-title', 'banner-sub',
  'wanted-label', 'mission-label', 'time', 'radio-station',
  'respect-bar', 'respect-fill', 'respect-label', 'crew-box', 'garage-hint',
];

const RANKS_FALLBACK = [
  { at: 0, title: 'NOBODY' },
  { at: 100, title: 'STREET HUSTLER' },
  { at: 300, title: 'WHEELMAN' },
  { at: 700, title: 'MADE' },
  { at: 1400, title: 'SHOT CALLER' },
  { at: 2500, title: 'KING OF SOLMARA' },
];

function rankFor(points) {
  let cur = RANKS_FALLBACK[0];
  let next = null;
  for (let i = 0; i < RANKS_FALLBACK.length; i++) {
    if (points >= RANKS_FALLBACK[i].at) cur = RANKS_FALLBACK[i];
    else { next = RANKS_FALLBACK[i]; break; }
  }
  return { title: cur.title, points, nextAt: next ? next.at : null };
}

function fmtMoney(n) {
  const v = Math.max(0, Math.floor(n || 0));
  return '$' + v.toLocaleString('en-US');
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}

export function initHUD(G) {
  G.hud = G.hud || {};
  G.hud.el = G.hud.el || {};
  if (typeof document !== 'undefined') {
    for (const id of HUD_IDS) {
      const el = document.getElementById(id);
      if (el) G.hud.el[id] = el;
    }
  }
  // Minimap drawing context, cached once.
  const mm = G.hud.el['minimap'];
  G.hud.mapCtx = mm && mm.getContext ? mm.getContext('2d') : null;
  G.hud._lastMoney = null;

  G.helpers = G.helpers || {};
  // addMoney: money += n, then refresh the HUD immediately.
  G.helpers.addMoney = (n) => {
    G.state.money = Math.max(0, (G.state.money || 0) + (n || 0));
    const moneyEl = G.hud.el['money'];
    if (moneyEl) moneyEl.textContent = fmtMoney(G.state.money);
    return G.state.money;
  };
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

function drawMinimap(G) {
  const ctx = G.hud.mapCtx;
  const canvas = G.hud.el['minimap'];
  if (!ctx || !canvas) return;
  const W = canvas.width || 180;
  const H = canvas.height || 180;
  const bounds = (G.city && G.city.bounds) || 210;
  const scale = W / (bounds * 2);
  const toX = (x) => W / 2 + x * scale;
  const toY = (z) => H / 2 + z * scale; // north up: -z is up, +z (beach) is down

  // Ground + sea (sea along the south edge, the bay/beach side).
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#2e4a2c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1d5f7a';
  ctx.fillRect(0, H * 0.82, W, H * 0.18);

  // Roads: use the city's road list when it has usable geometry, otherwise
  // fall back to the fixed 42-unit grid the city is built on.
  ctx.strokeStyle = '#5a6068';
  ctx.lineWidth = 3;
  let drewRoads = false;
  const roads = (G.city && G.city.roads) || [];
  for (const r of roads) {
    if (r && typeof r.x1 === 'number' && typeof r.z1 === 'number') {
      ctx.beginPath();
      ctx.moveTo(toX(r.x1), toY(r.z1));
      ctx.lineTo(toX(r.x2), toY(r.z2));
      ctx.stroke();
      drewRoads = true;
    } else if (r && typeof r.x === 'number' && typeof r.z === 'number') {
      ctx.fillStyle = '#5a6068';
      ctx.fillRect(toX(r.x) - 2, toY(r.z) - 2, 4, 4);
      drewRoads = true;
    }
  }
  if (!drewRoads) {
    const block = (G.config && G.config.city && G.config.city.block) || 42;
    const half = (G.config && G.config.city && G.config.city.size / 2) || 210;
    ctx.strokeStyle = '#565d66';
    ctx.lineWidth = 2;
    for (let p = -half; p <= half; p += block) {
      ctx.beginPath(); ctx.moveTo(toX(p), toY(-half)); ctx.lineTo(toX(p), toY(half)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(toX(-half), toY(p)); ctx.lineTo(toX(half), toY(p)); ctx.stroke();
    }
  }

  // Garage + safehouse landmarks (small squares, if their positions exist).
  const sp = (G.city && G.city.spawnPoints) || {};
  if (sp.garage) {
    ctx.fillStyle = '#ff9a3c';
    ctx.fillRect(toX(sp.garage.x) - 3, toY(sp.garage.z) - 3, 6, 6);
  }
  const sh = G.city && G.city.safehouse;
  if (sh && typeof sh.x === 'number') {
    ctx.fillStyle = '#3ddc84';
    ctx.fillRect(toX(sh.x) - 3, toY(sh.z) - 3, 6, 6);
  }

  // Mission target: yellow star.
  const target = G.state && G.state.objectiveTarget;
  if (target && typeof target.x === 'number' && typeof target.z === 'number') {
    drawStar(ctx, toX(target.x), toY(target.z), 7, '#ffd23c');
  }

  // Traffic cars: small grey dots, so the player can read congestion.
  for (const car of G.cars || []) {
    const p = car.pos || car;
    if (p && typeof p.x === 'number' && car.kind === 'traffic') {
      ctx.fillStyle = '#9aa0a8';
      ctx.fillRect(toX(p.x) - 1.5, toY(p.z) - 1.5, 3, 3);
    }
  }

  // Police: patrol cars blue, helicopter red.
  const police = G.police || {};
  for (const car of police.cars || []) {
    const p = car.pos || car;
    if (p && typeof p.x === 'number') {
      ctx.fillStyle = '#3a86ff';
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.z), 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (police.heli && police.heli.pos) {
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath(); ctx.arc(toX(police.heli.pos.x), toY(police.heli.pos.z), 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // Player: white dot + heading wedge.
  const pp = (G.player && G.player.pos) || null;
  if (pp && typeof pp.x === 'number') {
    const px = toX(pp.x);
    const py = toY(pp.z);
    const heading = (G.player && typeof G.player.heading === 'number') ? G.player.heading : 0;
    // Wedge points in the heading direction (heading 0 = north / -z).
    const hx = Math.sin(heading);
    const hz = -Math.cos(heading);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px + hx * 8, py + hz * 8);
    ctx.lineTo(px - hz * 4 - hx * 3, py + hx * 4 - hz * 3);
    ctx.lineTo(px + hz * 4 - hx * 3, py - hx * 4 - hz * 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    // North marker.
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('N', 6, 12);
  }
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function updateHUD(G, dt) {
  const el = (G.hud && G.hud.el) || {};
  const st = G.state || {};

  // Money.
  setText(el['money'], fmtMoney(st.money));

  // Wanted stars: 5 spans if present, otherwise plain text.
  const starsEl = el['stars'];
  if (starsEl) {
    const wanted = Math.max(0, Math.min(5, st.wanted || 0));
    if (starsEl.children && starsEl.children.length >= 5) {
      for (let i = 0; i < 5; i++) {
        const span = starsEl.children[i];
        const on = i < wanted;
        if (span.textContent !== (on ? '★' : '☆')) span.textContent = on ? '★' : '☆';
        span.style.color = on ? '#ffd23c' : 'rgba(255,255,255,0.35)';
      }
    } else {
      setText(starsEl, '★'.repeat(wanted) + '☆'.repeat(5 - wanted));
    }
  }
  setText(el['wanted-label'], (st.wanted || 0) > 0 ? 'WANTED ' + (st.wanted || 0) + '★ — SMPD' : 'CLEAN');

  // Health bar.
  const hp = Math.max(0, Math.min(100, st.health == null ? 100 : st.health));
  if (el['health-fill']) {
    el['health-fill'].style.width = hp + '%';
    el['health-fill'].style.background = hp > 50 ? '#3ddc84' : hp > 25 ? '#ffb347' : '#ff3b30';
  }

  // Speed (km/h from m/s).
  setText(el['speed'], Math.round(Math.abs(st.speed || 0) * 3.6) + ' km/h');

  // Objective + mission label.
  setText(el['objective'], st.objectiveText || 'Meet Mara at the Ember Garage.');
  const cur = (G.missions && G.missions.current) || null;
  const idx = typeof st.missionIndex === 'number' ? st.missionIndex : ((G.missions && G.missions.currentIndex) || 0);
  if (cur && cur.title) setText(el['mission-label'], 'MISSION ' + (idx + 1) + '/12 — ' + cur.title);
  else setText(el['mission-label'], 'MISSION ' + (idx + 1) + '/12');

  // Playtime clock.
  setText(el['time'], fmtTime(st.time));

  // Respect bar + label ("WHEELMAN · 320/700").
  let rank;
  if (G.helpers && G.helpers.respectRank) {
    try { rank = G.helpers.respectRank(); } catch (e) { rank = null; }
  }
  if (!rank) rank = rankFor((G.respect && G.respect.points) || 0);
  const nextAt = rank.nextAt;
  const label = nextAt
    ? rank.title + ' · ' + Math.floor(rank.points) + '/' + nextAt
    : rank.title + ' · ' + Math.floor(rank.points) + '/MAX';
  setText(el['respect-label'], label);
  if (el['respect-fill']) {
    // Progress within the current tier: find the tier floor.
    let floor = 0;
    for (const r of RANKS_FALLBACK) if (rank.points >= r.at) floor = r.at;
    const span = nextAt ? Math.max(1, nextAt - floor) : 1;
    const pct = nextAt ? Math.min(100, ((rank.points - floor) / span) * 100) : 100;
    el['respect-fill'].style.width = pct + '%';
  } else if (el['respect-bar']) {
    // Some layouts use the bar itself as the fill.
    el['respect-bar'].style.setProperty('--fill', (nextAt ? Math.min(100, (rank.points / nextAt) * 100) : 100) + '%');
  }

  // Crew box ("CREW: Mara +2" — first member by first name, plus the rest).
  const crewEl = el['crew-box'];
  if (crewEl) {
    let names = [];
    if (G.helpers && G.helpers.crewList) {
      try {
        names = (G.helpers.crewList() || []).map((m) => (m.name || m.id || '').split(' ')[0]).filter(Boolean);
      } catch (e) { names = []; }
    }
    if (!names.length && G.crew && Array.isArray(G.crew.members)) {
      const pretty = { mara: 'Mara', jax: 'Jax', lena: 'Lena' };
      names = G.crew.members.map((id) => pretty[id] || id);
    }
    let text = 'CREW: —';
    if (names.length === 1) text = 'CREW: ' + names[0];
    else if (names.length > 1) text = 'CREW: ' + names[0] + ' +' + (names.length - 1);
    setText(crewEl, text);
  }

  // Garage hint: visible only near the Ember Garage.
  const gh = el['garage-hint'];
  if (gh) {
    const near = !!st.nearGarage;
    gh.style.display = near ? 'block' : 'none';
    if (near) setText(gh, 'GARAGE — press G');
  }

  // Minimap.
  drawMinimap(G);
}
