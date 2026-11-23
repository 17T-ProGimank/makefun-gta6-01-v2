// respect.js — SOLMARA round 4: respect / rank progression.
// Points come from events: missions pay reward/10 on completion, combat may
// add 5 per enemy down, stealing a car may add 2. Rank-ups banner loudly.
// All helper calls are defensive: a missing helper is skipped, never a crash.

export const RANKS = [
  { at: 0, title: 'NOBODY' },
  { at: 100, title: 'STREET HUSTLER' },
  { at: 300, title: 'WHEELMAN' },
  { at: 700, title: 'MADE' },
  { at: 1400, title: 'SHOT CALLER' },
  { at: 2500, title: 'KING OF SOLMARA' },
];

function call(G, name, ...args) {
  const fn = G && G.helpers && G.helpers[name];
  if (typeof fn === 'function') {
    try { return fn(...args); } catch (e) { /* helper failed: ignore */ }
  }
  return undefined;
}

function rankFor(points) {
  let cur = RANKS[0];
  for (const r of RANKS) {
    if (points >= r.at) cur = r;
  }
  const idx = RANKS.indexOf(cur);
  const next = RANKS[idx + 1] || null;
  return { title: cur.title, points, nextAt: next ? next.at : null };
}

export function initRespect(G) {
  G.respect = G.respect || {};
  if (typeof G.respect.points !== 'number' || G.respect.points < 0) {
    G.respect.points = 0;
  }
  G.helpers = G.helpers || {};

  // addRespect(n): add points; on rank-up show the RANK UP banner.
  G.helpers.addRespect = (n) => {
    const amount = Math.max(0, Math.floor(n || 0));
    if (amount === 0) return rankFor(G.respect.points);
    const before = rankFor(G.respect.points);
    G.respect.points += amount;
    const after = rankFor(G.respect.points);
    if (after.title !== before.title) {
      call(G, 'showBanner', 'RANK UP — ' + after.title, 'Respect ' + G.respect.points + (after.nextAt ? ' — next rank at ' + after.nextAt : ' — top of Solmara'));
      call(G, 'playSound', 'cash');
    }
    call(G, 'saveGame');
    return after;
  };

  // respectRank(): {title, points, nextAt} for the current points.
  G.helpers.respectRank = () => rankFor(G.respect.points);

  // respectProgress(): {points, nextAt, pct} — pct is 0..1 progress to the
  // next rank, for the HUD respect bar (pct is 1 at the top rank).
  G.helpers.respectProgress = () => {
    const r = rankFor(G.respect.points);
    if (r.nextAt === null) return { points: r.points, nextAt: null, pct: 1 };
    const cur = RANKS.find((x) => x.title === r.title) || RANKS[0];
    const pct = Math.max(0, Math.min(1, (r.points - cur.at) / (r.nextAt - cur.at)));
    return { points: r.points, nextAt: r.nextAt, pct };
  };
}

export function updateRespect(G, dt) {
  // No-op: respect points arrive from events (missions, combat, car theft).
  // Kept in the update loop so the rank state stays visible to hud.js.
  if (!G || !G.respect) return;
  if (typeof G.respect.points !== 'number' || G.respect.points < 0) {
    G.respect.points = 0;
  }
}
