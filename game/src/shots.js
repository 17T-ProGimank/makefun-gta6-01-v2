// shots.js — screenshot poses for ?shot=cover|mission|garage|city.
// Each pose hides the menus, starts the game, places Dante / cars / police,
// sets wanted + objective, and pins the camera via G._shotCam.
import { makeCar } from './vehicles.js';

function hideMenus(G) {
  // initMenus shows the start screen via showMenu(), which sets INLINE
  // style.display — removing the .on class alone does not hide it, because
  // the inline style beats the .menu{display:none} rule. Use showMenu(null)
  // (the same path the START button uses) when available; fall back to
  // clearing both the class and the inline display.
  if (G && G.menus && typeof G.menus.showMenu === 'function') {
    G.menus.showMenu(null);
  } else {
    document.querySelectorAll('.menu').forEach((m) => {
      m.classList.remove('on');
      m.style.display = 'none';
    });
  }
  const hud = document.getElementById('hud');
  if (hud) hud.classList.add('on');
}

function startRun(G) {
  hideMenus(G);
  G.state.started = true;
  G.state.paused = false;
  G.state.gameOver = false;
  G._shotCam = null;
}

function putPlayerInCar(G, car) {
  G.player.onFoot = false;
  G.state.inVehicle = car;
  G.player.pos.copy(car.pos);
  G.player.heading = car.heading;
  if (G.player.group) G.player.group.visible = false;
}

function putPlayerOnFoot(G, x, z, heading = 0) {
  G.player.onFoot = true;
  G.state.inVehicle = null;
  G.player.pos.set(x, 0, z);
  G.player.heading = heading;
  if (G.player.group) {
    G.player.group.visible = true;
    G.player.group.position.set(x, 0, z);
  }
}

function setWanted(G, n) {
  if (G.helpers.setWanted) G.helpers.setWanted(n);
  else G.state.wanted = n;
}

function placeTraffic(G, n, cx, cz, spread) {
  for (let i = 0; i < n; i++) {
    try {
      const colors = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x1e8449, 0xececec];
      const car = makeCar(G, colors[i % colors.length], 'traffic');
      car.pos.set(cx + (Math.random() - 0.5) * spread, 0, cz + (Math.random() - 0.5) * spread);
      car.heading = Math.random() * Math.PI * 2;
      if (car.group) car.group.position.copy(car.pos);
      G.cars.push(car);
    } catch (e) { /* traffic is garnish; a failed car must not break the shot */ }
  }
}

function snapCamera(G, px, py, pz, lx, ly, lz) {
  G._shotCam = {
    pos: new THREE.Vector3(px, py, pz),
    look: new THREE.Vector3(lx, ly, lz),
  };
}

export function applyShot(G, name) {
  startRun(G);
  const S = G.city.spawnPoints;
  if (name === 'cover') {
    // High-speed police chase downtown, wanted 3, AIR-1 overhead.
    // Car + camera both sit ON vertical road x=12 (roads at -42/12; the
    // downtown towers flank it, so the road is a clear corridor). The old
    // pose at x=0 put the car inside the tower block centred (-15,-15).
    const car = makeCar(G, 0xff7a1a, 'player');
    car.pos.set(12, 0, -30); car.heading = Math.PI;
    if (car.group) car.group.position.copy(car.pos);
    G.cars.push(car);
    putPlayerInCar(G, car);
    G.state.speed = 34;
    setWanted(G, 3);
    if (G.helpers.setObjective) G.helpers.setObjective('Outrun the SMPD — lose the tail!', { x: 0, z: 120, label: 'Escape' });
    placeTraffic(G, 6, 12, -10, 12);
    snapCamera(G, 12, 7, -60, 12, 1.5, -20);
  } else if (name === 'mission') {
    // Finale "King of Solmara": gold convoy at the port, 5 stars, payout banner.
    // Car + camera both sit ON vertical road x=174 (port-side corridor;
    // the old pose at x=150 put the car inside the residential block
    // centred (147,39), so a building hid the convoy).
    const car = makeCar(G, 0xffd23c, 'player');
    car.pos.set(174, 0, 40); car.heading = -Math.PI / 2;
    if (car.group) car.group.position.copy(car.pos);
    G.cars.push(car);
    putPlayerInCar(G, car);
    G.state.money = 8000;
    setWanted(G, 5);
    if (G.helpers.setObjective) G.helpers.setObjective('Deliver the gold to the Ember Garage!', { x: S.garage.x, z: S.garage.z, label: 'Ember Garage' });
    if (G.helpers.showBanner) G.helpers.showBanner('KING OF SOLMARA', 'Gold convoy secured — $8,000 payout');
    placeTraffic(G, 4, 174, 40, 12);
    snapCamera(G, 174, 10, 8, 174, 1.5, 40);
  } else if (name === 'garage') {
    // Dante on foot at the Ember Garage forecourt, 2 owned cars in the bays.
    G.garage.owned = [
      { color: 0xff7a1a, paint: 'Ember Orange', upgrade: 2, name: 'Ember GT' },
      { color: 0x1d5f7a, paint: 'Seafoam', upgrade: 1, name: 'Bay Runner' },
    ];
    const bays = (G.city.garageBays && G.city.garageBays.length >= 2)
      ? G.city.garageBays
      : [{ x: S.garage.x - 6, z: S.garage.z - 8 }, { x: S.garage.x + 6, z: S.garage.z - 8 }];
    bays.slice(0, 2).forEach((bay, i) => {
      const owned = G.garage.owned[i];
      const car = makeCar(G, owned.color, 'player', { paint: owned.paint, upgrade: owned.upgrade });
      car.pos.set(bay.x, 0, bay.z); car.heading = 0;
      if (car.group) car.group.position.copy(car.pos);
      G.cars.push(car);
    });
    putPlayerOnFoot(G, S.garage.x, S.garage.z - 2, Math.PI);
    if (G.helpers.setObjective) G.helpers.setObjective('Pick your ride — the garage is yours.', null);
    if (G.helpers.openGarageMenu) G.helpers.openGarageMenu();
    snapCamera(G, S.garage.x + 16, 7, S.garage.z - 20, S.garage.x, 1.5, S.garage.z);
  } else {
    // city: wide aerial of downtown + bay at golden hour, traffic below.
    putPlayerOnFoot(G, 0, 0, 0);
    setWanted(G, 0);
    if (G.helpers.setObjective) G.helpers.setObjective('Welcome to Solmara.', null);
    placeTraffic(G, 10, 0, 40, 180);
    snapCamera(G, -70, 95, -110, 10, 0, 90);
  }
  // Golden hour: 18:00 on the in-game clock, matching the low western sun.
  G.state.time = 18 * 3600;
}
