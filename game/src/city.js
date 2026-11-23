// SOLMARA — city builder (round 4).
// Golden-hour coastal island city, 420 units across: beach + bay to the
// south, downtown towers in the centre, port to the east, residential
// blocks, hills to the north. Warm low sun from the WEST, long shadows,
// streetlights on. Round 4 adds the safehouse landmark near the beach
// spawn, four downtown shop fronts, and the Ember Garage forecourt with
// four marked parking bays.
// NOTE: THREE is the global from the vendored classic script
// game/vendor/three.min.js — main.js loads it before this module, so
// there is no `import` here (no import map in index.html).

const HALF = 210; // city.bounds

function makeCanvasTexture(draw, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Textured sign board: dark board, bright lettering.
function makeSign(text, bg, fg, w = 256, h = 64) {
  const tex = makeCanvasTexture((ctx, cw, ch) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(4, 4, cw - 8, ch - 8);
    ctx.fillStyle = fg; ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cw / 2, ch / 2 + 1);
  }, w, h);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 2.25),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  return mesh;
}

function box(w, h, d, color, x, y, z, parent) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function buildCity(G) {
  const { scene } = G;
  const cfg = G.config;
  const size = cfg.city.size;           // 420
  const block = cfg.city.block;         // 42
  const roadW = cfg.city.roadWidth;     // 12
  const palette = cfg.colors.buildingPalette;

  // --- Sky, fog, sun (golden hour, sun low in the WEST = -x) ---
  scene.background = new THREE.Color(cfg.colors.skyHorizon);
  scene.fog = new THREE.Fog(0xff8a4a, 180, 520);
  const sun = new THREE.DirectionalLight(cfg.colors.sun, 2.2);
  sun.position.set(-220, 55, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -230; sun.shadow.camera.right = 230;
  sun.shadow.camera.top = 230; sun.shadow.camera.bottom = -230;
  sun.shadow.camera.far = 600;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffc490, 0.55));
  const hemi = new THREE.HemisphereLight(cfg.colors.skyTop, 0x5a4632, 0.5);
  scene.add(hemi);
  // Visible sun disc low over the western horizon.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: cfg.colors.sun, fog: false })
  );
  sunDisc.position.set(-430, 42, 60);
  sunDisc.lookAt(0, 20, 0);
  scene.add(sunDisc);

  // --- Ground, sea, beach (south edge, z > 168) ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 160, size + 160),
    new THREE.MeshLambertMaterial({ color: cfg.colors.ground })
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 160, 90),
    new THREE.MeshLambertMaterial({ color: cfg.colors.sea })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.05, HALF + 45);
  scene.add(sea);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(size, 22),
    new THREE.MeshLambertMaterial({ color: cfg.colors.sand })
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.08, HALF - 11);
  sand.receiveShadow = true;
  scene.add(sand);

  // --- Roads: grid of 9x9 blocks, roads between them ---
  const roads = [];
  const roadMat = new THREE.MeshLambertMaterial({ color: cfg.colors.road });
  const walkMat = new THREE.MeshLambertMaterial({ color: cfg.colors.sidewalk });
  const pitch = block + roadW; // 54
  const roadCenters = [];
  for (let i = 0; i <= 9; i++) roadCenters.push(-HALF + roadW / 2 + i * pitch);
  // roadCenters: -204, -150, ..., 204  (10 roads each way)
  for (const c of roadCenters) {
    // vertical road (along z)
    const v = new THREE.Mesh(new THREE.PlaneGeometry(roadW, size), roadMat);
    v.rotation.x = -Math.PI / 2; v.position.set(c, 0.1, 0); v.receiveShadow = true;
    scene.add(v);
    // horizontal road (along x)
    const h = new THREE.Mesh(new THREE.PlaneGeometry(size, roadW), roadMat);
    h.rotation.x = -Math.PI / 2; h.position.set(0, 0.1, c); h.receiveShadow = true;
    scene.add(h);
  }
  // Centre lines (dashed, thin white strips) on the two main avenues.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8d8c8 });
  for (let s = -HALF + 12; s < HALF; s += 18) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 5), lineMat);
    dash.rotation.x = -Math.PI / 2; dash.position.set(0, 0.12, s);
    scene.add(dash);
    const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.6), lineMat);
    dash2.rotation.x = -Math.PI / 2; dash2.position.set(s, 0.12, 0);
    scene.add(dash2);
  }
  for (const c of roadCenters) {
    roads.push({ x: c, z: 0, dir: 'v' });
    roads.push({ x: 0, z: c, dir: 'h' });
  }

  // --- Sidewalk pads under each block ---
  for (let bx = 0; bx < 9; bx++) {
    for (let bz = 0; bz < 9; bz++) {
      const cx = -HALF + roadW + block / 2 + bx * pitch;
      const cz = -HALF + roadW + block / 2 + bz * pitch;
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(block + 4, block + 4), walkMat);
      pad.rotation.x = -Math.PI / 2; pad.position.set(cx, 0.06, cz);
      pad.receiveShadow = true;
      scene.add(pad);
    }
  }

  // --- Buildings: deterministic pseudo-random per block ---
  let seed = 1337;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const windowLit = new THREE.MeshLambertMaterial({ color: cfg.colors.windowLit, emissive: 0xaa7722, emissiveIntensity: 0.7 });
  const windowDark = new THREE.MeshLambertMaterial({ color: cfg.colors.windowDark });
  function tower(cx, cz, w, d, h, color) {
    const b = box(w, h, d, color, cx, h / 2, cz, scene);
    // Lit window strips on the west face (catching the sunset).
    const rows = Math.max(2, Math.floor(h / 7));
    for (let r = 0; r < rows; r++) {
      const lit = rand() > 0.45;
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.7, 1.6),
        lit ? windowLit : windowDark
      );
      win.position.set(cx, 3 + r * 6.5, cz - d / 2 - 0.05);
      win.rotation.y = Math.PI;
      scene.add(win);
    }
    return b;
  }

  // Downtown towers: centre 3x3 blocks, tall.
  for (let bx = 3; bx <= 5; bx++) {
    for (let bz = 3; bz <= 5; bz++) {
      const cx = -HALF + roadW + block / 2 + bx * pitch;
      const cz = -HALF + roadW + block / 2 + bz * pitch;
      const h = 38 + rand() * 42;
      tower(cx, cz, 26 + rand() * 8, 26 + rand() * 8, h, palette[Math.floor(rand() * palette.length)]);
    }
  }
  // Residential / low blocks elsewhere (skip port east edge, beach south row, garage block).
  for (let bx = 0; bx < 9; bx++) {
    for (let bz = 0; bz < 9; bz++) {
      if (bx >= 3 && bx <= 5 && bz >= 3 && bz <= 5) continue; // downtown
      if (bx === 8) continue; // port strip (east)
      if (bz === 8) continue; // beach row (south)
      if (bx === 2 && bz === 6) continue; // Ember Garage block
      const cx = -HALF + roadW + block / 2 + bx * pitch;
      const cz = -HALF + roadW + block / 2 + bz * pitch;
      const n = 1 + Math.floor(rand() * 2);
      for (let k = 0; k < n; k++) {
        const ox = (rand() - 0.5) * 18, oz = (rand() - 0.5) * 18;
        const h = 8 + rand() * 16;
        tower(cx + ox, cz + oz, 12 + rand() * 8, 12 + rand() * 8, h,
          palette[Math.floor(rand() * palette.length)]);
      }
    }
  }
  // North hills: dark green cones rising behind the city.
  for (let i = 0; i < 7; i++) {
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(34 + rand() * 22, 30 + rand() * 26, 7),
      new THREE.MeshLambertMaterial({ color: 0x2e4a2a })
    );
    hill.position.set(-180 + i * 60 + (rand() - 0.5) * 20, 8, -HALF - 34 - rand() * 14);
    hill.castShadow = true;
    scene.add(hill);
  }

  // --- Port (east edge): cranes, containers, dock ---
  const dock = box(16, 2, 200, 0x6a6f75, HALF - 8, 1, 0, scene);
  dock.receiveShadow = true;
  const contColors = [0xb03a2e, 0x2e6db0, 0x3a8a4a, 0xd8a020];
  for (let i = 0; i < 12; i++) {
    box(12, 3, 3, contColors[i % 4],
      HALF - 30 - (i % 3) * 14, 1.5, -90 + Math.floor(i / 3) * 44, scene);
  }
  for (let i = 0; i < 3; i++) {
    const cz = -120 + i * 120;
    // Crane legs + jib (simple gantry shape).
    box(2, 34, 2, 0xd8a020, HALF - 22, 17, cz - 8, scene);
    box(2, 34, 2, 0xd8a020, HALF - 22, 17, cz + 8, scene);
    box(2, 3, 26, 0xd8a020, HALF - 22, 33, cz, scene);
    const jib = box(30, 2, 2, 0xd8a020, HALF - 40, 30, cz, scene);
    jib.rotation.z = 0.15;
  }

  // --- Streetlights along the main avenues (on, warm) ---
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x333a42 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  for (const c of roadCenters) {
    for (let s = -180; s <= 180; s += 54) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7, 6), poleMat);
      pole.position.set(c + 7, 3.5, s); pole.castShadow = true;
      scene.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), bulbMat);
      bulb.position.set(c + 7, 7.1, s);
      scene.add(bulb);
    }
  }

  // --- Palm trees along the beach ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a34 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7a3a });
  for (let x = -190; x <= 190; x += 24) {
    if (Math.abs(x) < 14) continue; // keep the safehouse approach clear
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, HALF - 24); trunk.rotation.z = 0.12;
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.6, 7), leafMat);
    crown.position.set(x + 0.8, 7.6, HALF - 24);
    scene.add(crown);
  }

  // --- Ember Garage (block bx=2, bz=6; centre ~(-27, 42)) ---
  const garageX = -27, garageZ = 42;
  const garageBody = box(30, 9, 20, 0x8a3a20, garageX, 4.5, garageZ, scene);
  garageBody.castShadow = true;
  // Roller doors facing the road (south face).
  for (let i = -1; i <= 1; i++) {
    box(7, 6, 0.4, 0x4a4f55, garageX + i * 9, 3, garageZ + 10.2, scene);
  }
  const emberSign = makeSign('EMBER GARAGE', '#3a1408', '#ffb347');
  emberSign.position.set(garageX, 10.6, garageZ + 10.3);
  scene.add(emberSign);
  // Round 4: garage forecourt — 4 marked parking bays south of the doors.
  const bayMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const bayLine = (x, z, w, d) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), bayMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.14, z);
    scene.add(m);
  };
  G.city.garageBays = [];
  for (let i = 0; i < 4; i++) {
    const bx = garageX - 13.5 + i * 9;
    const bz = garageZ + 17;
    // Bay outline: two side lines + back line.
    bayLine(bx - 3.4, bz, 0.35, 9);
    bayLine(bx + 3.4, bz, 0.35, 9);
    bayLine(bx, bz - 4.4, 7.2, 0.35);
    G.city.garageBays.push({ x: bx, z: bz });
  }

  // --- Round 4: SAFEHOUSE near the beach spawn (small house at (0, 176)) ---
  const shX = 0, shZ = 176;
  box(12, 6, 10, 0xe8dcc0, shX, 3, shZ, scene);            // walls
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(9.5, 4, 4),
    new THREE.MeshLambertMaterial({ color: 0x8a3a20 })
  );
  roof.position.set(shX, 8, shZ); roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);
  box(2.4, 4, 0.4, 0x4a3220, shX, 2, shZ + 5.1, scene);    // door
  box(2.4, 2, 0.4, 0xffd27a, shX - 3.6, 3, shZ + 5.1, scene); // lit window
  box(2.4, 2, 0.4, 0x2a3542, shX + 3.6, 3, shZ + 5.1, scene);
  const shSign = makeSign('SAFEHOUSE', '#1d3a2e', '#9fe8b0');
  shSign.position.set(shX, 7.4, shZ + 5.3);
  scene.add(shSign);
  G.city.safehouse = { x: shX, z: shZ, radius: 6 };

  // --- Round 4: 4 shop fronts downtown (visual only, no interaction) ---
  const shops = [
    { name: 'TIRE KING', bg: '#1a1a1a', fg: '#ffd23c', x: -12, z: -6 },
    { name: 'BURGER BAY', bg: '#7a1a1a', fg: '#ffe9a8', x: 12, z: -6 },
    { name: 'SOL SUN TAN', bg: '#1a4a6a', fg: '#ffd27a', x: -12, z: 18 },
    { name: '24H MART', bg: '#1a5a2e', fg: '#d8ffd8', x: 12, z: 18 }
  ];
  G.city.shops = [];
  for (const s of shops) {
    box(14, 7, 12, 0x6f6a62, s.x, 3.5, s.z, scene);
    const sign = makeSign(s.name, s.bg, s.fg);
    sign.position.set(s.x, 8.2, s.z - 6.2);
    sign.rotation.y = Math.PI; // face the street to the north
    scene.add(sign);
    G.city.shops.push({ name: s.name, x: s.x, z: s.z });
  }

  // --- Spawn points + roads on G.city ---
  G.city.roads = roads;
  G.city.spawnPoints = {
    garage: { x: garageX, z: garageZ + 24 },
    beach: { x: 0, z: 168 },
    downtown: { x: 0, z: 0 }
  };
  G.city.bounds = HALF;
}

// Random point on a road (used for traffic / ped spawns).
export function randomRoadPos(G) {
  const roads = G.city.roads;
  if (!roads || roads.length === 0) return { x: 0, z: 0 };
  const r = roads[Math.floor(Math.random() * roads.length)];
  const along = (Math.random() * 2 - 1) * (G.city.bounds - 12);
  const across = (Math.random() * 2 - 1) * 4;
  if (r.dir === 'v') return { x: r.x + across, z: along };
  return { x: along, z: r.z + across };
}

// Clamp a position inside the city (keeps a margin from the edge).
export function clampToCity(G, x, z) {
  const b = (G.city && G.city.bounds) || HALF;
  const m = 6;
  return {
    x: Math.max(-b + m, Math.min(b - m, x)),
    z: Math.max(-b + m, Math.min(b - m, z))
  };
}

// Round 4: true while the player stands inside the safehouse heal zone.
export function inSafehouse(G) {
  const sh = G.city && G.city.safehouse;
  if (!sh || !G.player || !G.player.pos) return false;
  const dx = G.player.pos.x - sh.x;
  const dz = G.player.pos.z - sh.z;
  return dx * dx + dz * dz <= sh.radius * sh.radius;
}
