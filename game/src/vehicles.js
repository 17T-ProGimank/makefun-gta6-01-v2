// SOLMARA — vehicles (round 4).
// Builds cars from boxes (body, cabin, wheels, headlights), spawns the
// traffic fleet, and runs arcade driving physics for the player's car
// plus simple road-following AI for traffic. Round 4: makeCar honours
// opts {paint, upgrade} and the car's _upgradeTop / paint fields —
// garage upgrades add top speed, garage paint re-skins the body.
// NOTE: THREE is the global from the vendored classic script
// game/vendor/three.min.js — no `import` here (no import map).

const TRAFFIC_COLORS = [0xb03a2e, 0x2e6db0, 0x3a8a4a, 0xd8a020, 0x8a8a8a, 0xe8e0d0, 0x4a2e6a, 0x2e8a7a];

function box(w, h, d, color, x, y, z, parent) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// Build one car. kind: 'player' | 'traffic' | 'police'.
// opts (round 4, optional): { paint: hex colour, upgrade: 0..3 }.
// paint overrides the base colour; upgrade is stored on the car object
// as _upgradeTop (top-speed bonus) and applied in updateVehicles.
export function makeCar(G, color, kind, opts = {}) {
  const group = new THREE.Group();
  const bodyColor = (opts && opts.paint != null) ? opts.paint : color;
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });

  // Body + cabin.
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), bodyMat);
  body.position.y = 0.55; body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1a2028 })
  );
  cabin.position.set(0, 1.15, -0.2); cabin.castShadow = true;
  group.add(cabin);

  // Wheels.
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelPos = [[-0.95, 0.38, 1.4], [0.95, 0.38, 1.4], [-0.95, 0.38, -1.4], [0.95, 0.38, -1.4]];
  for (const [wx, wy, wz] of wheelPos) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, wy, wz);
    group.add(w);
  }

  // Headlights (warm, on at golden hour) + tail lights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const s of [-0.6, 0.6]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    h.position.set(s, 0.6, 2.22); group.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
    t.position.set(s, 0.6, -2.22); group.add(t);
  }

  // Police livery: white doors + light bar.
  if (kind === 'police') {
    box(2.05, 0.5, 1.6, 0xe8e8e8, 0, 0.6, 0.3, group);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.18, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x2244ff })
    );
    bar.position.set(0, 1.55, -0.2);
    group.add(bar);
  }

  const upgrade = (opts && opts.upgrade) || 0;
  const car = {
    group,
    pos: group.position,
    heading: 0,
    speed: 0,
    color: bodyColor,
    kind,
    mesh: body,
    _upgradeTop: upgrade * 6, // +6 per garage upgrade level
    paint: bodyColor,
    upgrade,
    // Traffic AI state.
    aiDir: Math.random() < 0.5 ? 'v' : 'h',
    aiRoad: 0,
    aiPause: 0,
    aiTarget: 0
  };
  if (G.scene) G.scene.add(group);
  return car;
}

// NOTE: garage.js repaints a stored car by setting car.paint and
// replacing car.mesh.material itself (car.mesh is the body mesh, kept
// as a stable reference on the car object for exactly that).

// Spawn the traffic fleet on random roads (count from CONFIG, 18 in r4).
export function initVehicles(G) {
  const count = (G.config && G.config.traffic && G.config.traffic.count) || 14;
  G.cars = G.cars || [];
  for (let i = 0; i < count; i++) {
    const color = TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
    const car = makeCar(G, color, 'traffic');
    const p = randomRoadPosLocal(G);
    car.pos.set(p.x, 0, p.z);
    car.heading = (Math.random() < 0.5 ? 0 : Math.PI / 2) + (Math.random() < 0.5 ? 0 : Math.PI);
    car.aiRoad = car.heading % Math.PI === 0 ? p.x : p.z;
    car.group.rotation.y = car.heading;
    G.cars.push(car);
  }
}

function randomRoadPosLocal(G) {
  // Prefer the city helper when available; fall back to a grid position.
  if (G.city && G.city.roads && G.city.roads.length) {
    const roads = G.city.roads;
    const r = roads[Math.floor(Math.random() * roads.length)];
    const along = (Math.random() * 2 - 1) * 190;
    const across = (Math.random() * 2 - 1) * 4;
    return r.dir === 'v' ? { x: r.x + across, z: along } : { x: along, z: r.z + across };
  }
  return { x: (Math.random() * 2 - 1) * 150, z: (Math.random() * 2 - 1) * 150 };
}

// Traffic AI: follow the road grid, pause at random, keep loose distance
// from the player. Player car: arcade physics driven by input keys.
export function updateVehicles(G, dt) {
  const cfg = G.config;
  const playerCar = G.state.inVehicle;
  const maxSpeed = cfg.car.maxSpeed;

  for (const car of G.cars) {
    if (car === playerCar) continue;
    if (car.kind === 'police') continue; // police.js drives its own cars
    // Random pauses (pretend traffic light / parked moment).
    if (car.aiPause > 0) { car.aiPause -= dt; continue; }
    if (Math.random() < dt * 0.02) { car.aiPause = 1 + Math.random() * 3; continue; }

    const speed = 9 + Math.random() * 2;
    const dx = Math.sin(car.heading), dz = Math.cos(car.heading);
    car.pos.x += dx * speed * dt;
    car.pos.z += dz * speed * dt;
    // Occasionally turn at an intersection (multiples of 54 on the grid).
    const gx = Math.abs(car.pos.x % 54), gz = Math.abs(car.pos.z % 54);
    if ((gx < 2 || gx > 52) && (gz < 2 || gz > 52) && Math.random() < dt * 0.5) {
      car.heading += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
      car.group.rotation.y = car.heading;
    }
    // Keep inside the city; U-turn at the edge.
    const b = (G.city && G.city.bounds) || 210;
    if (Math.abs(car.pos.x) > b - 8 || Math.abs(car.pos.z) > b - 8) {
      car.heading += Math.PI;
      car.group.rotation.y = car.heading;
    }
  }

  // --- Player driving ---
  if (playerCar && G.input && G.input.keys) {
    const keys = G.input.keys;
    const upgradeTop = playerCar._upgradeTop || 0; // round 4 garage bonus
    const top = maxSpeed + upgradeTop;
    const grip = 1 + ((playerCar.upgrade || 0) * 0.1);
    if (keys.has('KeyW') || keys.has('ArrowUp')) {
      playerCar.speed += cfg.car.accel * dt;
    } else if (keys.has('KeyS') || keys.has('ArrowDown')) {
      playerCar.speed -= cfg.car.brake * dt;
    } else {
      playerCar.speed -= Math.sign(playerCar.speed) * 8 * dt;
      if (Math.abs(playerCar.speed) < 0.5) playerCar.speed = 0;
    }
    playerCar.speed = Math.max(-cfg.car.reverseMax, Math.min(top, playerCar.speed));
    const steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
      - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
    if (Math.abs(playerCar.speed) > 0.5) {
      playerCar.heading += steer * cfg.car.turn * grip * dt * Math.sign(playerCar.speed);
    }
    playerCar.pos.x += Math.sin(playerCar.heading) * playerCar.speed * dt;
    playerCar.pos.z += Math.cos(playerCar.heading) * playerCar.speed * dt;
    playerCar.group.rotation.y = playerCar.heading;
    playerCar.group.position.copy(playerCar.pos);
    G.state.speed = Math.abs(playerCar.speed) * 3.6; // km/h for the HUD

    // Stealing credit: a fresh player car counts once (respect hook).
    if (playerCar._stolen !== true && playerCar.kind === 'player') {
      playerCar._stolen = true;
      if (G.helpers && G.helpers.addRespect) G.helpers.addRespect(2);
      if (G.state) G.state.carsStolen = (G.state.carsStolen || 0) + 1;
    }
  } else {
    G.state.speed = 0;
  }
}
