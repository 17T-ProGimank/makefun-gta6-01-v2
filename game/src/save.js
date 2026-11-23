// save.js — SOLMARA round 4 (v2): 3-slot save system.
// Keys solmara-save-v1/v2/v3, active slot in G.save.slot (1..3, default 1).
// Persists money, missionIndex, respect points, crew ids, garage owned cars
// + active index, radio station + radioOn, stats, player position + heading,
// health. Autosaves every 30s to the active slot. Everything is applied
// defensively (clamped missionIndex 0..11, money >= 0) and localStorage
// access is wrapped so a missing/blocked store never crashes the game.

const SLOT_KEYS = { 1: 'solmara-save-v1', 2: 'solmara-save-v2', 3: 'solmara-save-v3' };
const AUTOSAVE_MS = 30000;

function keyFor(slot) {
  const s = Math.max(1, Math.min(3, Math.floor(slot || 1)));
  return SLOT_KEYS[s];
}

function readStore(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (e) { return null; }
}

function writeStore(key, value) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(key, value);
    return true;
  } catch (e) { return false; }
}

function rankTitle(G) {
  const fn = G && G.helpers && G.helpers.respectRank;
  if (typeof fn === 'function') {
    try {
      const r = fn();
      if (r && typeof r.title === 'string') return r.title;
    } catch (e) { /* ignore */ }
  }
  return 'NOBODY';
}

function collect(G) {
  const st = G.state || {};
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    money: Math.max(0, Math.floor(st.money || 0)),
    missionIndex: Math.max(0, Math.min(11, Math.floor(st.missionIndex || 0))),
    respect: (G.respect && typeof G.respect.points === 'number')
      ? Math.max(0, Math.floor(G.respect.points)) : 0,
    crew: Array.isArray(G.crew && G.crew.members) ? [...G.crew.members] : ['mara'],
    garage: {
      owned: Array.isArray(G.garage && G.garage.owned)
        ? G.garage.owned.map((c) => ({
            color: c.color || 0xff7a1a,
            paint: c.paint || 'Ember Orange',
            upgrade: Math.max(0, Math.min(3, c.upgrade || 0)),
            name: c.name || 'Ember GT',
          }))
        : [],
      active: Math.max(0, (G.garage && G.garage.active) || 0),
    },
    radio: {
      station: (G.audio && typeof G.audio.station === 'number') ? G.audio.station : 0,
      radioOn: !!(G.audio && G.audio.radioOn),
    },
    stats: {
      kills: Math.max(0, st.kills || 0),
      carsStolen: Math.max(0, st.carsStolen || 0),
      missionsDone: Math.max(0, st.missionsDone || 0),
      time: Math.max(0, Math.floor(st.time || 0)),
    },
    player: {
      x: (G.player && G.player.pos) ? G.player.pos.x : 0,
      z: (G.player && G.player.pos) ? G.player.pos.z : 0,
      heading: (G.player && typeof G.player.heading === 'number') ? G.player.heading : 0,
    },
    health: Math.max(0, Math.min(100, st.health || 100)),
  };
}

function apply(G, data) {
  if (!data || typeof data !== 'object') return false;
  const st = G.state || {};
  st.money = Math.max(0, Math.floor(data.money || 0));
  st.missionIndex = Math.max(0, Math.min(11, Math.floor(data.missionIndex || 0)));
  st.health = Math.max(0, Math.min(100, data.health || 100));
  if (data.stats) {
    st.kills = Math.max(0, data.stats.kills || 0);
    st.carsStolen = Math.max(0, data.stats.carsStolen || 0);
    st.missionsDone = Math.max(0, data.stats.missionsDone || 0);
    st.time = Math.max(0, data.stats.time || 0);
  }
  if (typeof data.respect === 'number') {
    G.respect = G.respect || {};
    G.respect.points = Math.max(0, Math.floor(data.respect));
  }
  if (Array.isArray(data.crew) && data.crew.length > 0) {
    G.crew = G.crew || {};
    G.crew.members = [...data.crew];
  }
  if (data.garage) {
    G.garage = G.garage || {};
    G.garage.owned = Array.isArray(data.garage.owned) ? data.garage.owned : [];
    G.garage.active = Math.max(0, Math.min(
      Math.max(0, G.garage.owned.length - 1), data.garage.active || 0));
  }
  if (data.radio && G.audio) {
    G.audio.station = typeof data.radio.station === 'number' ? data.radio.station : 0;
    G.audio.radioOn = !!data.radio.radioOn;
  }
  if (data.player && G.player && G.player.pos) {
    G.player.pos.x = data.player.x || 0;
    G.player.pos.z = data.player.z || 0;
    G.player.heading = data.player.heading || 0;
  }
  if (G.missions && Array.isArray(G.missions.list)) {
    G.missions.currentIndex = st.missionIndex;
    G.missions.current = G.missions.list[st.missionIndex] || G.missions.list[0];
    G.missions.progress = { stage: 0, killsStart: 0, roadblocksStart: 0, peakWanted: 0, pickedUp: false };
  }
  return true;
}

export function saveGame(G, slot) {
  const s = Math.max(1, Math.min(3, Math.floor(slot || (G.save && G.save.slot) || 1)));
  if (G.save) G.save.slot = s;
  return writeStore(keyFor(s), JSON.stringify(collect(G)));
}

export function loadGame(G, slot) {
  const s = Math.max(1, Math.min(3, Math.floor(slot || (G.save && G.save.slot) || 1)));
  const raw = readStore(keyFor(s));
  if (!raw) return false;
  let data = null;
  try { data = JSON.parse(raw); } catch (e) { return false; }
  if (G.save) G.save.slot = s;
  return apply(G, data);
}

function rankTitleFor(points) {
  let title = 'NOBODY';
  for (const r of [{ at: 0, title: 'NOBODY' }, { at: 100, title: 'STREET HUSTLER' }, { at: 300, title: 'WHEELMAN' }, { at: 700, title: 'MADE' }, { at: 1400, title: 'SHOT CALLER' }, { at: 2500, title: 'KING OF SOLMARA' }]) {
    if (points >= r.at) title = r.title;
  }
  return title;
}

export function listSaves() {
  const out = [];
  for (let slot = 1; slot <= 3; slot++) {
    const raw = readStore(keyFor(slot));
    if (!raw) { out.push(null); continue; }
    try {
      const d = JSON.parse(raw);
      out.push({
        slot,
        money: Math.max(0, Math.floor(d.money || 0)),
        missionIndex: Math.max(0, Math.min(11, Math.floor(d.missionIndex || 0))),
        rank: rankTitleFor(Math.max(0, Math.floor(d.respect || 0))),
        savedAt: d.savedAt || null,
      });
    } catch (e) { out.push(null); }
  }
  return out;
}

export function initSave(G) {
  G.save = G.save || {};
  if (typeof G.save.slot !== 'number' || G.save.slot < 1 || G.save.slot > 3) {
    G.save.slot = 1;
  }
  G.helpers = G.helpers || {};
  G.helpers.saveGame = (slot) => saveGame(G, slot);
  G.helpers.loadGame = (slot) => loadGame(G, slot);
  G.helpers.listSaves = () => listSaves();
  G.helpers.setSlot = (n) => {
    const s = Math.max(1, Math.min(3, Math.floor(n || 1)));
    G.save.slot = s;
    return s;
  };

  // Load the active slot if one exists (fresh game otherwise).
  loadGame(G, G.save.slot);

  // Autosave every 30s to the active slot while the game is running.
  if (typeof setInterval === 'function' && !G.save._autosaveId) {
    G.save._autosaveId = setInterval(() => {
      try {
        if (G.state && G.state.started && !G.state.paused && !G.state.gameOver) {
          saveGame(G, G.save.slot);
        }
      } catch (e) { /* autosave must never crash the game */ }
    }, AUTOSAVE_MS);
  }
}
