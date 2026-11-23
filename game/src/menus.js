// menus.js — SOLMARA menus (round 4).
// Start / pause / game-over plus the new garage and crew screens.
// Buttons are wired defensively: by id where the spec fixes one, otherwise
// by matching the button's label inside its menu, so the file works even if
// index.html uses different button ids. Every helper call is guarded — a
// missing module must never crash a menu.

const MENU_IDS = ['menu-start', 'menu-pause', 'menu-gameover', 'menu-garage', 'menu-crew'];

const ROSTER = [
  { id: 'mara', name: 'Mara Voss', role: 'Fixer', bonus: '+10% mission payout', mission: 0 },
  { id: 'jax', name: 'Jax Calloway', role: 'Wheelman', bonus: '+15% getaway speed, police lose you faster', mission: 10 },
  { id: 'lena', name: 'Lena Marlowe', role: 'Ghost Driver', bonus: '-1 wanted star on mission start, +10% payout', mission: 11 },
];

const CAR_NAMES = { mara: 'Mara', jax: 'Jax', lena: 'Lena' };

function $(id) {
  return (typeof document !== 'undefined') ? document.getElementById(id) : null;
}

function findButton(menuId, labelRe) {
  const menu = $(menuId);
  if (!menu) return null;
  const btns = menu.querySelectorAll('button');
  for (const b of btns) {
    if (labelRe.test(b.textContent || '')) return b;
  }
  return null;
}

function bindByIdOrLabel(id, menuId, labelRe, fn) {
  const el = $(id) || (menuId ? findButton(menuId, labelRe) : null);
  if (el) el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
  return el;
}

export function initMenus(G) {
  G.menus = G.menus || {};
  G.menus.open = 'menu-start'; // start screen shown first
  G.menus._prevEsc = false;
  G.menus._prevC = false;
  G.menus._prevG = false;
  G.menus._prevEnter = false;
  G.menus._bannerTimer = null;
  G.menus._hintTimer = null;
  G.menus._gameOverShown = false;

  G.helpers = G.helpers || {};

  const showMenu = (id) => {
    for (const mid of MENU_IDS) {
      const m = $(mid);
      if (m) m.style.display = (mid === id) ? 'flex' : 'none';
    }
    G.menus.open = id;
    if (id === 'menu-start') refreshSlots(G);
    if (id === 'menu-pause') refreshPauseStats(G);
    if (id === 'menu-garage') renderGarage(G);
    if (id === 'menu-crew') renderCrew(G);
  };
  G.menus.showMenu = showMenu;
  G.helpers.showMenu = showMenu;

  // --- Banner (big centre message, fades after 3s) ---
  G.helpers.showBanner = (title, sub) => {
    const banner = $('banner');
    const t = $('banner-title');
    const s = $('banner-sub');
    if (t) t.textContent = title || '';
    if (s) s.textContent = sub || '';
    if (banner) {
      banner.style.display = 'block';
      banner.style.opacity = '1';
      if (G.menus._bannerTimer) clearTimeout(G.menus._bannerTimer);
      G.menus._bannerTimer = setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => { banner.style.display = 'none'; }, 400);
      }, 3000);
    }
  };

  // --- Hint (small toast under the objective box, fades after 4s) ---
  G.helpers.showHint = (text) => {
    const hint = $('hint');
    if (!hint) return;
    hint.textContent = text || '';
    hint.style.display = 'block';
    hint.style.opacity = '1';
    if (G.menus._hintTimer) clearTimeout(G.menus._hintTimer);
    G.menus._hintTimer = setTimeout(() => {
      hint.style.opacity = '0';
      setTimeout(() => { hint.style.display = 'none'; }, 400);
    }, 4000);
  };

  // --- Garage / crew openers (also called by garage.js on G, and by C) ---
  G.helpers.openGarageMenu = () => {
    if (!G.state || !G.state.started) return;
    G.state.paused = true;
    renderGarage(G);
    showMenu('menu-garage');
  };
  G.helpers.openCrewMenu = () => {
    if (!G.state || !G.state.started) return;
    G.state.paused = true;
    renderCrew(G);
    showMenu('menu-crew');
  };
  G.helpers.closeMenu = () => {
    if (G.state && G.state.started && !G.state.gameOver) {
      G.state.paused = false;
      showMenu(null);
    } else {
      showMenu('menu-start');
    }
  };

  // --- Start screen ---
  const startGame = (slot) => {
    if (slot && G.helpers.setSlot) {
      try { G.helpers.setSlot(slot); } catch (e) { /* keep default slot */ }
    }
    G.state.started = true;
    G.state.paused = false;
    G.state.gameOver = false;
    G.menus._gameOverShown = false;
    if (G.helpers.startAudio) { try { G.helpers.startAudio(); } catch (e) {} }
    if (G.helpers.playSound) G.helpers.playSound('click');
    showMenu(null);
    if (G.helpers.showBanner) G.helpers.showBanner('SOLMARA', 'Dante Reyes — the debt comes due.');
  };
  G.menus.startGame = startGame;

  bindByIdOrLabel('btn-start', 'menu-start', /^\s*(START|NEW GAME|PLAY)/i, () => startGame(1));
  bindByIdOrLabel('btn-new-game', 'menu-start', /NEW GAME/i, () => startGame(1));
  // CONTINUE (load active slot, if any) — falls back to starting fresh.
  bindByIdOrLabel('btn-continue', 'menu-start', /CONTINUE/i, () => {
    if (G.helpers.loadGame) { try { G.helpers.loadGame(); } catch (e) {} }
    startGame();
  });
  // Slot buttons: load that slot if it has a save, else start a new game on it.
  for (let slot = 1; slot <= 3; slot++) {
    const btn = $('slot-' + slot);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (G.helpers.setSlot) { try { G.helpers.setSlot(slot); } catch (e) {} }
        let hasSave = false;
        if (G.helpers.listSaves) {
          try {
            const saves = G.helpers.listSaves();
            hasSave = !!(saves && saves[slot - 1]);
          } catch (e) { hasSave = false; }
        }
        if (hasSave && G.helpers.loadGame) { try { G.helpers.loadGame(slot); } catch (e) {} }
        startGame(slot);
      });
    }
  }

  // --- Pause menu ---
  bindByIdOrLabel('btn-resume', 'menu-pause', /RESUME/i, () => {
    G.state.paused = false;
    showMenu(null);
    if (G.helpers.playSound) G.helpers.playSound('click');
  });
  bindByIdOrLabel('btn-restart', 'menu-pause', /RESTART DAY/i, () => {
    // Restart the day: reset health/wanted, keep money and progress.
    G.state.health = 100;
    if (G.helpers.setWanted) G.helpers.setWanted(0);
    G.state.paused = false;
    showMenu(null);
    if (G.helpers.showBanner) G.helpers.showBanner('NEW DAY', 'Fresh start, same debt.');
  });
  bindByIdOrLabel('btn-quit-to-menu', 'menu-pause', /^(MENU|QUIT|MAIN MENU)/i, () => {
    G.state.paused = true;
    G.state.started = false;
    showMenu('menu-start');
  });
  // SAVE TO SLOT 1/2/3.
  for (let slot = 1; slot <= 3; slot++) {
    bindByIdOrLabel('btn-save-' + slot, 'menu-pause', new RegExp('SAVE.*' + slot), () => {
      if (G.helpers.saveGame) {
        try { G.helpers.saveGame(slot); } catch (e) {}
        if (G.helpers.showHint) G.helpers.showHint('Saved to slot ' + slot + '.');
        if (G.helpers.playSound) G.helpers.playSound('cash');
      }
      refreshPauseStats(G);
    });
  }
  // GARAGE + CREW buttons on the pause menu (ids fixed by the r4 spec).
  bindByIdOrLabel('btn-garage', 'menu-pause', /GARAGE/i, () => G.helpers.openGarageMenu());
  bindByIdOrLabel('btn-crew', 'menu-pause', /CREW/i, () => G.helpers.openCrewMenu());

  // --- Game-over menu ---
  bindByIdOrLabel('btn-retry', 'menu-gameover', /RETRY/i, () => {
    G.state.gameOver = false;
    G.state.health = 100;
    if (G.helpers.setWanted) G.helpers.setWanted(0);
    G.state.paused = false;
    G.menus._gameOverShown = false;
    showMenu(null);
  });
  bindByIdOrLabel('btn-menu', 'menu-gameover', /MENU/i, () => {
    G.state.gameOver = false;
    G.state.started = false;
    G.state.paused = true;
    showMenu('menu-start');
  });

  // --- Garage + crew CLOSE buttons ---
  bindByIdOrLabel('btn-garage-close', 'menu-garage', /CLOSE/i, () => G.helpers.closeMenu());
  bindByIdOrLabel('btn-crew-close', 'menu-crew', /CLOSE/i, () => G.helpers.closeMenu());

  refreshSlots(G);
  showMenu('menu-start');
}

function slotSummary(save) {
  if (!save) return 'EMPTY';
  const money = '$' + Math.floor(save.money || 0).toLocaleString('en-US');
  const mission = 'Mission ' + ((save.missionIndex || 0) + 1);
  const rank = save.rank || '';
  return money + ' · ' + mission + (rank ? ' · ' + rank : '');
}

function refreshSlots(G) {
  let saves = [null, null, null];
  if (G.helpers && G.helpers.listSaves) {
    try {
      const list = G.helpers.listSaves();
      if (Array.isArray(list)) saves = list;
    } catch (e) { /* empty slots */ }
  }
  for (let slot = 1; slot <= 3; slot++) {
    const btn = $('slot-' + slot);
    if (!btn) continue;
    const save = saves[slot - 1];
    btn.textContent = save
      ? 'SLOT ' + slot + ' — ' + slotSummary(save)
      : 'SLOT ' + slot + ' — EMPTY';
  }
}

function refreshPauseStats(G) {
  const statsEl = $('pause-stats') || $('menu-pause-stats');
  if (!statsEl) return;
  const st = G.state || {};
  const stats = (G.save && G.save.stats) || {};
  const missionsDone = (G.missions && typeof G.missions.currentIndex === 'number')
    ? G.missions.currentIndex : (st.missionIndex || 0);
  let rankTitle = 'NOBODY';
  if (G.helpers && G.helpers.respectRank) {
    try { rankTitle = G.helpers.respectRank().title; } catch (e) {}
  }
  const mins = Math.floor((st.time || 0) / 60);
  const secs = Math.floor((st.time || 0) % 60);
  statsEl.textContent =
    'Missions done: ' + missionsDone +
    ' · Kills: ' + (st.kills || stats.kills || 0) +
    ' · Cars stolen: ' + (st.carsStolen || stats.carsStolen || 0) +
    ' · Playtime: ' + mins + ':' + (secs < 10 ? '0' : '') + secs +
    ' · Rank: ' + rankTitle;
}

function garageCost(label, cost) {
  return label + ' ($' + cost + ')';
}

function renderGarage(G) {
  const list = $('garage-list');
  if (!list) return;
  list.innerHTML = '';
  let cars = [];
  if (G.helpers && G.helpers.garageCars) {
    try { cars = G.helpers.garageCars() || []; } catch (e) { cars = []; }
  }
  const cfg = (G.config && G.config.garage) || {};
  const repairCost = cfg.repairCost || 150;
  const paintCost = cfg.paintCost || 200;
  const upgradeCosts = cfg.upgradeCosts || [800, 1800, 3500];

  if (!cars.length) {
    const empty = document.createElement('div');
    empty.textContent = 'No cars stored yet — steal a car and press STORE CURRENT CAR.';
    list.appendChild(empty);
  }
  cars.forEach((car, i) => {
    const row = document.createElement('div');
    row.className = 'garage-car';
    const name = car.name || ('Car ' + (i + 1));
    const paint = car.paint || car.color || '—';
    const level = car.upgrade || 0;
    const nextCost = level < 3 ? upgradeCosts[level] : null;
    const info = document.createElement('div');
    info.textContent = name + ' · ' + paint + ' · Upgrade Lv ' + level + (i === (G.garage && G.garage.active) ? ' · ACTIVE' : '');
    row.appendChild(info);
    const mkBtn = (label, fn, disabled) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.disabled = !!disabled;
      b.addEventListener('click', () => { fn(); renderGarage(G); });
      row.appendChild(b);
      return b;
    };
    mkBtn(garageCost('REPAIR', repairCost), () => {
      if (G.helpers.repairCar) G.helpers.repairCar();
    });
    mkBtn(garageCost('PAINT', paintCost), () => {
      if (G.helpers.paintCar) G.helpers.paintCar(i);
    });
    mkBtn(nextCost ? garageCost('UPGRADE Lv ' + (level + 1), nextCost) : 'UPGRADE — MAX', () => {
      if (G.helpers.upgradeCar) G.helpers.upgradeCar();
    }, !nextCost);
    list.appendChild(row);
  });

  // STORE CURRENT CAR + CLOSE row (rebuilt each render so it never duplicates).
  const oldStore = $('btn-store-car');
  if (oldStore) oldStore.remove();
  const storeBtn = document.createElement('button');
  storeBtn.id = 'btn-store-car';
  storeBtn.textContent = 'STORE CURRENT CAR';
  storeBtn.addEventListener('click', () => {
    const car = G.state && G.state.inVehicle;
    if (!car) {
      if (G.helpers.showHint) G.helpers.showHint('You are not in a car.');
      return;
    }
    if (G.helpers.storeCar) {
      try { G.helpers.storeCar(car); } catch (e) {}
    }
    renderGarage(G);
  });
  list.appendChild(storeBtn);
}

function renderCrew(G) {
  const list = $('crew-list');
  if (!list) return;
  list.innerHTML = '';
  let members = [];
  if (G.helpers && G.helpers.crewList) {
    try { members = (G.helpers.crewList() || []).map((m) => m.id || m); } catch (e) { members = []; }
  }
  if (!members.length && G.crew && Array.isArray(G.crew.members)) members = G.crew.members.slice();
  for (const person of ROSTER) {
    const unlocked = members.includes(person.id);
    const row = document.createElement('div');
    row.className = 'crew-member' + (unlocked ? '' : ' locked');
    if (!unlocked) row.style.opacity = '0.45';
    const name = document.createElement('div');
    name.textContent = person.name + ' — ' + person.role;
    const bonus = document.createElement('div');
    bonus.textContent = unlocked
      ? person.bonus
      : 'Recruit in mission ' + person.mission;
    row.appendChild(name);
    row.appendChild(bonus);
    list.appendChild(row);
  }
  // Small footer note so the player knows who is driving with them.
  const note = document.createElement('div');
  note.textContent = members.length > 1
    ? 'Crew riding with you: ' + members.map((id) => CAR_NAMES[id] || id).join(', ') + '.'
    : 'Mara runs the jobs. Recruit Jax and Lena in missions 10 and 11.';
  list.appendChild(note);
}

export function updateMenus(G, dt) {
  if (!G.state) return;
  const keys = (G.input && G.input.keys) || new Set();

  // Game over: show the BUSTED screen once.
  if (G.state.gameOver && !G.menus._gameOverShown) {
    G.menus._gameOverShown = true;
    G.state.paused = true;
    if (G.menus.showMenu) G.menus.showMenu('menu-gameover');
    return;
  }

  // Esc pauses / resumes (edge-triggered). Esc from a sub-menu goes back to
  // pause; Esc in-game opens pause; Esc on pause resumes.
  const escDown = keys.has('Escape');
  if (escDown && !G.menus._prevEsc) {
    if (G.state.started && !G.state.gameOver) {
      if (G.menus.open === 'menu-garage' || G.menus.open === 'menu-crew') {
        if (G.menus.showMenu) G.menus.showMenu('menu-pause');
        refreshPauseStats(G);
      } else if (G.menus.open === 'menu-pause') {
        G.state.paused = false;
        if (G.menus.showMenu) G.menus.showMenu(null);
      } else if (!G.menus.open) {
        G.state.paused = true;
        if (G.menus.showMenu) G.menus.showMenu('menu-pause');
      }
    }
  }
  G.menus._prevEsc = escDown;

  // C opens the crew menu (edge-triggered, only while playing, not paused).
  const cDown = keys.has('KeyC');
  if (cDown && !G.menus._prevC) {
    if (G.state.started && !G.state.paused && !G.state.gameOver && !G.menus.open) {
      if (G.helpers.openCrewMenu) G.helpers.openCrewMenu();
    } else if (G.menus.open === 'menu-crew') {
      if (G.helpers.closeMenu) G.helpers.closeMenu();
    }
  }
  G.menus._prevC = cDown;

  // Enter on the start screen starts a new game (same as START).
  const enterDown = keys.has('Enter');
  if (enterDown && !G.menus._prevEnter && G.menus.open === 'menu-start') {
    if (G.menus.startGame) G.menus.startGame(1);
  }
  G.menus._prevEnter = enterDown;

  // G near the garage is handled by garage.js (it calls openGarageMenu);
  // menus only tracks the key so a stray G does not leak through here.
  G.menus._prevG = keys.has('KeyG');
}
