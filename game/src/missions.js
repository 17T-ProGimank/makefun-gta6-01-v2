// missions.js — SOLMARA round 4: 12 chained jobs for Dante Reyes.
// Missions 1-9 follow the base spec; 10-12 recruit the crew and end in the
// "King of Solmara" finale. Completion is checked in updateMissions via
// arrive-at-target / kill-count / survive patterns. All helper calls are
// defensive: a missing helper is skipped, never a crash.

export const MISSIONS = [
  {
    id: 1, title: 'First Gear', giver: 'Mara Voss',
    brief: 'Mara needs a driver she can trust. Drive to the Ember Garage and meet her.',
    objective: 'Drive to the Ember Garage',
    target: { x: -27, z: 66, label: 'Ember Garage' },
    reward: 200,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 1 — FIRST GEAR', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 2, title: 'The Pickup', giver: 'Mara Voss',
    brief: 'Steal a car off the street and deliver it to the port. No scratches, no questions.',
    objective: 'Steal a car, then deliver it to the port',
    target: { x: 170, z: 40, label: 'Port' },
    reward: 400,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 2 — THE PICKUP', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 3, title: 'Hot Wheels', giver: 'Mara Voss',
    brief: 'Get the SMPD on your tail — reach 2 stars — then lose them. Make it look easy.',
    objective: 'Reach 2 wanted stars, then lose the tail',
    target: null,
    reward: 600,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 3 — HOT WHEELS', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 4, title: 'The Exchange', giver: 'Mara Voss',
    brief: 'Deliver the package downtown. The Vultures will try to stop you — deal with them.',
    objective: 'Deliver the package downtown, then take out the ambush',
    target: { x: 0, z: 0, label: 'Downtown' },
    reward: 900,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 4 — THE EXCHANGE', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 5, title: 'Air Support', giver: 'Mara Voss',
    brief: 'AIR-1 is in the sky and the whole city is watching. Get to 3 stars and vanish.',
    objective: 'Escape AIR-1 at 3 wanted stars',
    target: null,
    reward: 1200,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 5 — AIR SUPPORT', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 6, title: 'Roadblock Run', giver: 'Mara Voss',
    brief: 'The SMPD have the roads sealed. Smash through 2 roadblocks and keep rolling.',
    objective: 'Smash through 2 roadblocks',
    target: null,
    reward: 1500,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 6 — ROADBLOCK RUN', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 7, title: 'The Heist', giver: 'Mara Voss',
    brief: 'Rob the Solmara Bank, grab the cash, and get it back to the safehouse.',
    objective: 'Rob the Solmara Bank, then reach the safehouse',
    target: { x: 0, z: 0, label: 'Solmara Bank' },
    reward: 2500,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 7 — THE HEIST', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 8, title: 'Payback', giver: 'Mara Voss',
    brief: 'Silas Rook and his Vultures are waiting at the port. Take down 5 of them.',
    objective: 'Take down 5 Vultures at the port',
    target: { x: 170, z: 40, label: 'Port' },
    reward: 4000,
    onStart(G) {
      setObj(G, this);
      banner(G, 'MISSION 8 — PAYBACK', this.brief);
      spawnAmbush(G, 170, 40, 5);
    },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 9, title: 'Clean Getaway', giver: 'Mara Voss',
    brief: 'Five stars. The whole SMPD, AIR-1, everything. Lose them all and you are a legend.',
    objective: 'Escape a 5-star wanted level',
    target: null,
    reward: 5000,
    legend: true,
    onStart(G) { setObj(G, this); banner(G, 'MISSION 9 — CLEAN GETAWAY', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 10, title: 'New Blood', giver: 'Mara Voss',
    brief: 'Jax Calloway is hiding in the north hills with the SMPD on him. Pick him up during a 2-star chase and lose the tail.',
    objective: 'Pick up Jax in the north hills, then lose the 2-star tail',
    target: { x: 0, z: -170, label: 'North Hills' },
    reward: 5500,
    recruit: 'jax',
    crewAssist: 'jax',
    onStart(G) { setObj(G, this); banner(G, 'MISSION 10 — NEW BLOOD', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 11, title: 'Ghost Ride', giver: 'Mara Voss',
    brief: 'Midnight port run. Pick up Lena Marlowe and her car, then deliver it to the Ember Garage without a scratch.',
    objective: "Collect Lena's car at the port, deliver it to the Ember Garage",
    target: { x: 170, z: 40, label: 'Port' },
    reward: 6500,
    recruit: 'lena',
    crewAssist: 'lena',
    onStart(G) { setObj(G, this); banner(G, 'MISSION 11 — GHOST RIDE', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
  {
    id: 12, title: 'King of Solmara', giver: 'Mara Voss',
    brief: 'The finale. Steal the Vultures\u2019 gold convoy truck at the port, survive a 5-star wanted level with AIR-1 and roadblocks, then deliver the gold to the Ember Garage.',
    objective: 'Steal the gold convoy truck, survive 5 stars, deliver the gold',
    target: { x: 170, z: 40, label: 'Port' },
    reward: 8000,
    legend: true,
    crewAssist: 'jax',
    onStart(G) { setObj(G, this); banner(G, 'MISSION 12 — KING OF SOLMARA', this.brief); },
    onDone(G) { finishMission(G, this); },
  },
];

// ---- internal helpers (not exported) ---------------------------------------

function call(G, name, ...args) {
  const fn = G && G.helpers && G.helpers[name];
  if (typeof fn === 'function') {
    try { return fn(...args); } catch (e) { /* helper failed: ignore */ }
  }
  return undefined;
}

function banner(G, title, sub) { call(G, 'showBanner', title, sub || ''); }

function setObj(G, m) {
  call(G, 'setObjective', m.objective, m.target || null);
}

function dist2D(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function playerPos(G) {
  if (G.player && G.player.pos) return G.player.pos;
  return { x: 0, z: 0 };
}

function nearTarget(G, target, radius) {
  if (!target) return false;
  const p = playerPos(G);
  return dist2D(p.x, p.z, target.x, target.z) <= (radius || 10);
}

function spawnAmbush(G, x, z, count) {
  const spawn = G && G.helpers && G.helpers.spawnEnemy;
  if (typeof spawn !== 'function') return;
  for (let i = 0; i < count; i++) {
    try { spawn(x + (i - 2) * 4, z + ((i % 2) ? 5 : -5)); } catch (e) { /* ignore */ }
  }
}

// Shared completion: pay reward (crew payout bonus), banner, sound, respect,
// recruit, save. Every mission's onDone routes through here.
function finishMission(G, m) {
  let payout = m.reward;
  const bonus = call(G, 'crewBonus', 'payout');
  if (typeof bonus === 'number' && bonus > 1) payout = Math.round(m.reward * bonus);
  call(G, 'addMoney', payout);
  if (m.recruit) call(G, 'recruitCrew', m.recruit);
  if (m.id === 12) {
    // Finale: top respect up to KING OF SOLMARA (2500) before the usual share.
    const rank = call(G, 'respectRank');
    if (rank && typeof rank.points === 'number' && rank.points < 2500) {
      call(G, 'addRespect', 2500 - rank.points);
    }
  }
  if (m.id === 10) call(G, 'addRespect', 550);
  const sub = m.legend
    ? `$${payout.toLocaleString('en-US')} — SOLMARA LEGEND`
    : `$${payout.toLocaleString('en-US')} earned`;
  banner(G, 'MISSION PASSED — ' + m.title.toUpperCase(), sub);
  call(G, 'playSound', 'cash');
  call(G, 'addRespect', Math.round(m.reward / 10));
  call(G, 'saveGame');
  if (G.state) G.state.missionsDone = (G.state.missionsDone || 0) + 1;
}

// ---- module contract --------------------------------------------------------

export function initMissions(G) {
  G.missions = G.missions || {};
  G.missions.list = MISSIONS;
  const idx = Math.max(0, Math.min(11, (G.state && G.state.missionIndex) || 0));
  G.missions.currentIndex = idx;
  G.missions.current = MISSIONS[idx];
  G.missions.progress = { stage: 0, killsStart: 0, roadblocksStart: 0, peakWanted: 0, pickedUp: false };
  if (G.state) G.state.missionIndex = idx;
  // setObjective helper (missions.js owns it per the base spec).
  G.helpers = G.helpers || {};
  G.helpers.setObjective = (text, target) => {
    if (!G.state) return;
    G.state.objectiveText = text || '';
    G.state.objectiveTarget = target || null;
  };
  const cur = G.missions.current;
  if (cur && typeof cur.onStart === 'function') {
    try { cur.onStart(G); } catch (e) { /* ignore */ }
  }
}

function startNext(G) {
  const next = Math.min(11, G.missions.currentIndex + 1);
  G.missions.currentIndex = next;
  if (G.state) G.state.missionIndex = next;
  G.missions.current = MISSIONS[next];
  G.missions.progress = { stage: 0, killsStart: 0, roadblocksStart: 0, peakWanted: 0, pickedUp: false };
  const cur = G.missions.current;
  if (cur && typeof cur.onStart === 'function') {
    try { cur.onStart(G); } catch (e) { /* ignore */ }
  }
}

export function updateMissions(G, dt) {
  if (!G || !G.state || !G.missions || !G.missions.current) return;
  if (!G.state.started || G.state.paused || G.state.gameOver) return;
  const m = G.missions.current;
  const p = G.missions.progress;
  const wanted = G.state.wanted || 0;
  if (wanted > p.peakWanted) p.peakWanted = wanted;

  const done = () => {
    try { m.onDone(G); } catch (e) { /* ignore */ }
    // Last mission: stay on it, mark the campaign complete.
    if (m.id === 12) {
      G.missions.progress = { stage: 0, killsStart: 0, roadblocksStart: 0, peakWanted: 0, pickedUp: false };
      call(G, 'setObjective', 'SOLMARA IS YOURS — KING OF SOLMARA', null);
      return;
    }
    startNext(G);
  };

  switch (m.id) {
    case 1: // arrive at the Ember Garage
      if (nearTarget(G, m.target, 10)) done();
      break;

    case 2: // stage 0: steal a car; stage 1: deliver to the port
      if (p.stage === 0) {
        if ((G.state.carsStolen || 0) > 0 || G.state.inVehicle) {
          p.stage = 1;
          call(G, 'setObjective', 'Deliver the car to the port', m.target);
        }
      } else if (nearTarget(G, m.target, 10) && G.state.inVehicle) {
        done();
      }
      break;

    case 3: // reach wanted 2, then lose it
      if (p.stage === 0 && wanted >= 2) {
        p.stage = 1;
        call(G, 'setObjective', 'Lose the tail — get back to 0 stars', null);
      } else if (p.stage === 1 && wanted === 0) {
        done();
      }
      break;

    case 4: // stage 0: reach downtown; stage 1: kill the 3 ambush enemies
      if (p.stage === 0) {
        if (nearTarget(G, m.target, 10)) {
          p.stage = 1;
          p.killsStart = G.state.kills || 0;
          spawnAmbush(G, 0, 0, 3);
          call(G, 'setObjective', 'Ambush! Take out 3 Vultures', null);
        }
      } else if ((G.state.kills || 0) - p.killsStart >= 3) {
        done();
      }
      break;

    case 5: // reach wanted 3, then escape AIR-1 (back to 0)
      if (p.stage === 0 && wanted >= 3) {
        p.stage = 1;
        call(G, 'setObjective', 'Escape AIR-1 — get back to 0 stars', null);
      } else if (p.stage === 1 && wanted === 0) {
        done();
      }
      break;

    case 6: // smash through 2 roadblocks
      if (p.stage === 0) {
        p.roadblocksStart = G.state.roadblocksSmashed || 0;
        p.stage = 1;
        if (wanted < 3) call(G, 'setWanted', 3);
      } else if ((G.state.roadblocksSmashed || 0) - p.roadblocksStart >= 2) {
        done();
      }
      break;

    case 7: // stage 0: reach the bank; stage 1: reach the safehouse
      if (p.stage === 0) {
        if (nearTarget(G, m.target, 10)) {
          p.stage = 1;
          const sh = (G.city && G.city.safehouse) || { x: 0, z: 176 };
          call(G, 'setObjective', 'Escape to the safehouse with the cash', { x: sh.x, z: sh.z, label: 'Safehouse' });
        }
      } else {
        const sh = (G.city && G.city.safehouse) || { x: 0, z: 176 };
        if (nearTarget(G, sh, 8)) done();
      }
      break;

    case 8: // take down 5 Vultures at the port
      if (p.stage === 0) {
        p.killsStart = G.state.kills || 0;
        p.stage = 1;
      } else if ((G.state.kills || 0) - p.killsStart >= 5) {
        done();
      }
      break;

    case 9: // reach 5 stars, then lose them all
      if (p.stage === 0 && wanted >= 5) {
        p.stage = 1;
        call(G, 'setObjective', 'Lose the 5-star heat — get back to 0 stars', null);
      } else if (p.stage === 1 && wanted === 0) {
        done();
      }
      break;

    case 10: // stage 0: reach the north hills; stage 1: 2-star chase, then lose it
      if (p.stage === 0) {
        if (nearTarget(G, m.target, 10)) {
          p.stage = 1;
          p.pickedUp = true;
          call(G, 'setWanted', 2);
          call(G, 'setObjective', 'Jax is in! Lose the 2-star tail', null);
          banner(G, 'JAX CALLOWAY IS IN THE CAR', 'Lose the tail and he joins the crew');
        }
      } else if (p.stage === 1 && wanted === 0) {
        done();
      }
      break;

    case 11: // stage 0: reach the port; stage 1: deliver Lena's car to the garage
      if (p.stage === 0) {
        if (nearTarget(G, m.target, 10)) {
          p.stage = 1;
          const garage = (G.city && G.city.spawnPoints && G.city.spawnPoints.garage) || { x: -27, z: 66 };
          call(G, 'setObjective', "Deliver Lena's car to the Ember Garage", { x: garage.x, z: garage.z, label: 'Ember Garage' });
          banner(G, 'LENA MARLOWE IS IN THE CAR', 'Deliver her car to the Ember Garage — no scratches');
        }
      } else {
        const garage = (G.city && G.city.spawnPoints && G.city.spawnPoints.garage) || { x: -27, z: 66 };
        if (nearTarget(G, garage, 10)) done();
      }
      break;

    case 12: // finale, 3 stages
      if (p.stage === 0) {
        if (nearTarget(G, m.target, 10)) {
          p.stage = 1;
          call(G, 'setWanted', 5);
          call(G, 'setObjective', 'Gold secured! Survive the 5-star heat', null);
          banner(G, 'GOLD CONVOY TRUCK SECURED', 'Survive 5 stars — AIR-1 and roadblocks are coming');
        }
      } else if (p.stage === 1) {
        // Survive the heat: either lose the tail, or hold out 60s at 5 stars.
        if (wanted >= 5) p.heatTime = (p.heatTime || 0) + dt;
        if ((p.peakWanted >= 5 && wanted === 0) || (p.heatTime || 0) >= 60) {
          p.stage = 2;
          const garage = (G.city && G.city.spawnPoints && G.city.spawnPoints.garage) || { x: -27, z: 66 };
          call(G, 'setObjective', 'Deliver the gold to the Ember Garage', { x: garage.x, z: garage.z, label: 'Ember Garage' });
          banner(G, 'HEAT IS OFF', 'Deliver the gold to the Ember Garage');
        }
      } else {
        const garage = (G.city && G.city.spawnPoints && G.city.spawnPoints.garage) || { x: -27, z: 66 };
        if (nearTarget(G, garage, 10)) done();
      }
      break;

    default:
      break;
  }
}
