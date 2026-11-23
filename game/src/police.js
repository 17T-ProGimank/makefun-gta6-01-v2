// SOLMARA — police.js (round 4)
// SMPD cruisers chase by wanted level, AIR-1 helicopter circles at 3+ stars,
// roadblocks spawn ahead at 3+ stars, wanted decays when the player outruns
// or hides, arrest when a cruiser touches Dante on foot for 2 seconds.
import { randomRoadPos, clampToCity } from './city.js';

let spawnTimer = 0;
let roadblockTimer = 0;
let decayTimer = 0;
let arrestTimer = 0;

function evadeBonus(G) {
  try {
    const v = G.state && typeof G.state.evadeBonus === 'number' ? G.state.evadeBonus : 0;
    return Math.max(0, Math.min(1, v));
  } catch (err) { return 0; }
}

function makeCruiser(G, x, z) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1c2f4a });
  const whiteMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.55, 4.4), bodyMat);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.0), glassMat);
  cabin.position.set(0, 1.05, -0.2);
  g.add(cabin);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.18, 4.42), whiteMat);
  stripe.position.y = 0.62;
  g.add(stripe);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0x881111 }));
  bar.position.set(0, 1.38, -0.2);
  g.add(bar);
  g.userData.lightBar = bar;
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
  }
  g.position.set(x, 0, z);
  if (G.scene) G.scene.add(g);
  return { group: g, pos: new THREE.Vector3(x, 0, z), heading: 0, speed: 0, color: 0x1c2f4a, kind: 'police' };
}

function makeHeli(G, x, z) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x223344 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.6), bodyMat);
  g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x9fd8e8 }));
  glass.position.set(0, 0.2, 1.8);
  g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 4.0), bodyMat);
  tail.position.set(0, 0.3, -4.0);
  g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.08, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  rotor.position.y = 1.0;
  g.add(rotor);
  const spot = new THREE.PointLight(0xfff2c0, 12, 40);
  spot.position.y = -1;
  g.add(spot);
  g.userData.rotor = rotor;
  g.position.set(x, 32, z);
  if (G.scene) G.scene.add(g);
  return { group: g, pos: new THREE.Vector3(x, 32, z), heading: 0, angle: 0 };
}

function makeRoadblock(G, x, z, heading) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 });
  const stripeMat = new THREE.MeshLambertMaterial({ color: 0xe03a2a });
  for (let i = -1; i <= 1; i++) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.5), mat);
    barrier.position.set(i * 2.6, 0.5, 0);
    g.add(barrier);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 0.52), stripeMat);
    stripe.position.set(i * 2.6, 0.78, 0);
    g.add(stripe);
  }
  g.position.set(x, 0, z);
  g.rotation.y = heading;
  if (G.scene) G.scene.add(g);
  return { group: g, pos: new THREE.Vector3(x, 0, z), heading };
}

function removeObj(G, list, obj) {
  const i = list.indexOf(obj);
  if (i >= 0) list.splice(i, 1);
  if (obj && obj.group && G.scene) G.scene.remove(obj.group);
}

function updateStarsHUD(G) {
  try {
    const el = G.hud && G.hud.el ? G.hud.el.stars : null;
    if (!el) return;
    const kids = el.children || el.childNodes;
    for (let i = 0; i < kids.length; i++) {
      const star = kids[i];
      const on = i < (G.state.wanted || 0);
      if (star.style) star.style.opacity = on ? '1' : '0.25';
      if (star.textContent !== undefined) star.textContent = on ? '★' : '☆';
    }
  } catch (err) { /* HUD is optional */ }
  try {
    const label = G.hud && G.hud.el ? G.hud.el['wanted-label'] : null;
    if (label) label.textContent = (G.state.wanted || 0) > 0 ? 'WANTED' : '';
  } catch (err) { /* HUD is optional */ }
}

export function initPolice(G) {
  if (!G.police) G.police = {};
  G.police.cars = [];
  G.police.heli = null;
  G.police.roadblocks = [];
  spawnTimer = 0;
  roadblockTimer = 0;
  decayTimer = 0;
  arrestTimer = 0;
  if (!G.helpers) G.helpers = {};
  G.helpers.setWanted = function (n) {
    const v = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    G.state.wanted = v;
    decayTimer = 0;
    updateStarsHUD(G);
    return v;
  };
  updateStarsHUD(G);
}

export function updatePolice(G, dt) {
  if (!G || !G.police || !G.state || !G.player) return;
  if (G.state.paused || G.state.gameOver || !G.state.started) return;
  if (!dt || dt <= 0) dt = 0.016;
  dt = Math.min(dt, 0.05);

  const wanted = G.state.wanted || 0;
  const evade = evadeBonus(G);
  const playerPos = G.player.pos;
  const maxCars = (G.config.police && G.config.police.maxCars) || 6;
  const desired = Math.min(wanted, maxCars);

  // Spawn cruisers up to the wanted level, a little at a time.
  spawnTimer -= dt;
  if (G.police.cars.length < desired && spawnTimer <= 0) {
    spawnTimer = 2.5;
    let sx = playerPos.x + 45, sz = playerPos.z + 20;
    try {
      if (typeof randomRoadPos === 'function') {
        const p = randomRoadPos(G);
        // Prefer a road spot at least 25 units away so units arrive, not pop in.
        if (Math.hypot(p.x - playerPos.x, p.z - playerPos.z) > 25) { sx = p.x; sz = p.z; }
      }
    } catch (err) { /* fall back to the offset spawn */ }
    try {
      if (typeof clampToCity === 'function') {
        const c = clampToCity(G, sx, sz); sx = c.x; sz = c.z;
      }
    } catch (err) { /* keep the raw spawn */ }
    G.police.cars.push(makeCruiser(G, sx, sz));
    try {
      if (G.helpers && typeof G.helpers.playSound === 'function') G.helpers.playSound('siren');
    } catch (err) { /* audio is optional */ }
  }

  // Chase: steer toward the player, faster at higher wanted, slower with a crew evade bonus.
  const chaseSpeed = (16 + wanted * 2.5) * (1 - evade * 0.25);
  let nearest = Infinity;
  for (const car of G.police.cars) {
    const dx = playerPos.x - car.pos.x;
    const dz = playerPos.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < nearest) nearest = dist;
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - car.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    car.heading += dh * Math.min(1, 3.2 * dt);
    // Ease off when very close so cruisers circle instead of jittering on top.
    const sp = dist < 6 ? chaseSpeed * 0.45 : chaseSpeed;
    car.speed = sp;
    car.pos.x += Math.sin(car.heading) * sp * dt;
    car.pos.z += Math.cos(car.heading) * sp * dt;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    if (car.group.userData.lightBar) {
      car.group.userData.lightBar.material.emissive.setHex(
        Math.floor(G.state.time * 6) % 2 === 0 ? 0xff2222 : 0x2244ff);
    }
  }

  // Separation: keep cruisers from stacking on the exact same spot while
  // they converge on the player — push overlapping pairs apart.
  for (let i = 0; i < G.police.cars.length; i++) {
    for (let j = i + 1; j < G.police.cars.length; j++) {
      const a = G.police.cars[i], b = G.police.cars[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01 && d < 4) {
        const push = (4 - d) * 0.5 * dt * 10;
        const nx = dx / d, nz = dz / d;
        a.pos.x -= nx * push; a.pos.z -= nz * push;
        b.pos.x += nx * push; b.pos.z += nz * push;
      }
    }
  }

  // Stand down when the heat is off: cruisers peel away one at a time.
  if (wanted === 0 && G.police.cars.length > 0) {
    spawnTimer -= dt;
    if (spawnTimer <= -2.5) {
      spawnTimer = 0;
      removeObj(G, G.police.cars, G.police.cars[G.police.cars.length - 1]);
    }
  }

  // AIR-1: circles overhead at 3+ stars, leaves when the heat drops.
  const heliAt = (G.config.police && G.config.police.roadblockAtStars) || 3;
  if (wanted >= heliAt && !G.police.heli) {
    G.police.heli = makeHeli(G, playerPos.x + 20, playerPos.z - 20);
  } else if (wanted < heliAt && G.police.heli) {
    if (G.scene) G.scene.remove(G.police.heli.group);
    G.police.heli = null;
  }
  if (G.police.heli) {
    const heli = G.police.heli;
    const speed = (G.config.police && G.config.police.heliSpeed) || 24;
    heli.angle += (speed / 26) * dt;
    const r = 26;
    heli.pos.set(playerPos.x + Math.cos(heli.angle) * r, 32, playerPos.z + Math.sin(heli.angle) * r);
    heli.group.position.copy(heli.pos);
    heli.group.rotation.y = -heli.angle;
    if (heli.group.userData.rotor) heli.group.userData.rotor.rotation.y += 18 * dt;
  }

  // Roadblocks: spawn ahead of the player's travel direction at 3+ stars.
  roadblockTimer -= dt;
  if (wanted >= heliAt && G.police.roadblocks.length < 2 && roadblockTimer <= 0) {
    roadblockTimer = 9;
    const heading = G.player.heading || 0;
    const bx = playerPos.x + Math.sin(heading) * 34;
    const bz = playerPos.z + Math.cos(heading) * 34;
    let cx = bx, cz = bz;
    try {
      if (typeof clampToCity === 'function') { const c = clampToCity(G, bx, bz); cx = c.x; cz = c.z; }
    } catch (err) { /* keep the raw spot */ }
    G.police.roadblocks.push(makeRoadblock(G, cx, cz, heading + Math.PI / 2));
  }
  if (wanted < heliAt) {
    for (const rb of [...G.police.roadblocks]) removeObj(G, G.police.roadblocks, rb);
  }
  // Smashing through a roadblock in a car clears it with a bang.
  for (const rb of [...G.police.roadblocks]) {
    const d = Math.hypot(rb.pos.x - playerPos.x, rb.pos.z - playerPos.z);
    if (d < 3.5 && !G.player.onFoot && G.state.inVehicle) {
      removeObj(G, G.police.roadblocks, rb);
      try {
        if (G.helpers && typeof G.helpers.spawnExplosion === 'function') {
          G.helpers.spawnExplosion(rb.pos, false);
        }
      } catch (err) { /* effects are optional */ }
      G.state.roadblocksSmashed = (G.state.roadblocksSmashed || 0) + 1;
    } else if (d > 90) {
      removeObj(G, G.police.roadblocks, rb);
    }
  }

  // Wanted decays when the player is far from every cruiser (crew evade bonus
  // shortens the wait); a close cruiser resets the clock.
  if (wanted > 0) {
    if (nearest > 55) {
      decayTimer += dt;
      const wait = Math.max(2.5, 6 * (1 - evade * 0.5));
      if (decayTimer >= wait) {
        decayTimer = 0;
        G.helpers.setWanted(wanted - 1);
      }
    } else {
      decayTimer = 0;
    }
  } else {
    decayTimer = 0;
  }

  // Arrest: a cruiser touching Dante on foot for 2s ends the run.
  if (wanted > 0 && G.player.onFoot && nearest < 2.6) {
    arrestTimer += dt;
    if (arrestTimer >= 2) {
      arrestTimer = 0;
      G.state.gameOver = true;
      try {
        if (G.helpers && typeof G.helpers.showBanner === 'function') {
          G.helpers.showBanner('BUSTED', 'The SMPD took Dante in — the debt is still waiting.');
        }
      } catch (err) { /* banner is optional */ }
    }
  } else {
    arrestTimer = Math.max(0, arrestTimer - dt * 2);
  }
}
