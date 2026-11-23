// SOLMARA — combat.js (round 4)
// Hitscan shooting: mouse click or F fires from the camera / Dante, enemies
// have health, muzzle flash + sound, infinite ammo. Enemies (Vultures) chase
// Dante and shoot back at close range. damagePlayer is attached to G.helpers.
let cooldown = 0;
let fPrev = false;
let pendingClick = false;
let flash = null;
let flashTimer = 0;

function makeEnemyFigure(G, x, z) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xb98a62 });
  const vest = new THREE.MeshLambertMaterial({ color: 0x3a1f1f });
  const pants = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), vest);
  torso.position.y = 1.08;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
  head.position.y = 1.68;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.44),
    new THREE.MeshLambertMaterial({ color: 0x111111 }));
  cap.position.y = 1.88;
  g.add(cap);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.16), vest);
  armL.position.set(-0.42, 1.08, 0);
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.66, 0.16), vest);
  armR.position.set(0.42, 1.08, 0.15);
  g.add(armR);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.22), pants);
  legL.position.set(-0.16, 0.38, 0);
  g.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.68, 0.22), pants);
  legR.position.set(0.16, 0.38, 0);
  g.add(legR);
  g.position.set(x, 0, z);
  if (G.scene) G.scene.add(g);
  return g;
}

function playSound(G, name) {
  try {
    if (G.helpers && typeof G.helpers.playSound === 'function') G.helpers.playSound(name);
  } catch (err) { /* audio is optional */ }
}

function shoot(G) {
  if (cooldown > 0) return;
  cooldown = 0.28;
  playSound(G, 'shot');

  // Muzzle origin: just ahead of the camera when driving, at Dante's chest on foot.
  const origin = new THREE.Vector3();
  const dir = new THREE.Vector3(0, 0, -1);
  if (G.camera) {
    G.camera.getWorldPosition(origin);
    G.camera.getWorldDirection(dir);
  } else if (G.player) {
    origin.copy(G.player.pos).add(new THREE.Vector3(0, 1.4, 0));
    dir.set(Math.sin(G.player.heading), 0, Math.cos(G.player.heading));
  }
  dir.y = 0;
  if (dir.lengthSq() < 0.001) dir.set(0, 0, -1);
  dir.normalize();

  // Muzzle flash: a brief bright sphere at the barrel, plus the effects helper.
  if (flash && G.scene) {
    flash.position.copy(origin).addScaledVector(dir, 1.2);
    flash.visible = true;
    flashTimer = 0.06;
  }
  try {
    if (G.helpers && typeof G.helpers.spawnExplosion === 'function') {
      // Small flash only — a real explosion would be wrong for a pistol shot,
      // so only the visual flash above fires; the helper is kept for big hits.
    }
  } catch (err) { /* effects are optional */ }

  // Hitscan: nearest enemy close to the shot ray, within 60 units.
  let best = null;
  let bestAlong = Infinity;
  const enemies = (G.combat && G.combat.enemies) || [];
  for (const e of enemies) {
    if (!e || !e.pos || e.health <= 0) continue;
    const to = new THREE.Vector3().subVectors(e.pos, origin);
    to.y = 0;
    const along = to.dot(dir);
    if (along < 1 || along > 60) continue;
    const perp = new THREE.Vector3().copy(to).addScaledVector(dir, -along);
    if (perp.length() > 2.2) continue;
    if (along < bestAlong) { bestAlong = along; best = e; }
  }
  if (best) {
    best.health -= 34;
    best.flashTimer = 0.12;
    if (best.group) {
      best.group.position.y = 0;
      // Hit jolt: a quick sideways shove so hits read clearly.
      best.pos.x += dir.x * 0.25;
      best.pos.z += dir.z * 0.25;
      best.group.position.copy(best.pos);
    }
    if (best.health <= 0) killEnemy(G, best);
  }
}

function killEnemy(G, enemy) {
  const list = (G.combat && G.combat.enemies) || [];
  const i = list.indexOf(enemy);
  if (i >= 0) list.splice(i, 1);
  if (enemy.group && G.scene) G.scene.remove(enemy.group);
  G.state.kills = (G.state.kills || 0) + 1;
  // A downed Vulture drops a little street cash — small, so farming kills
  // never beats doing missions, but a firefight still pays for the ammo.
  try {
    if (G.helpers && typeof G.helpers.addMoney === 'function') G.helpers.addMoney(25);
  } catch (err) { /* money helper is optional */ }
  try {
    if (G.helpers && typeof G.helpers.addRespect === 'function') G.helpers.addRespect(5);
  } catch (err) { /* respect is optional */ }
  try {
    if (G.helpers && typeof G.helpers.spawnExplosion === 'function') {
      G.helpers.spawnExplosion(enemy.pos, false);
    }
  } catch (err) { /* effects are optional */ }
}

export function spawnEnemy(G, x, z) {
  if (!G.combat) G.combat = { enemies: [] };
  if (!G.combat.enemies) G.combat.enemies = [];
  const group = makeEnemyFigure(G, x, z);
  const enemy = {
    group,
    pos: new THREE.Vector3(x, 0, z),
    heading: 0,
    speed: 3.4,
    health: 100,
    attackTimer: 1.0 + Math.random() * 0.8,
    flashTimer: 0,
  };
  G.combat.enemies.push(enemy);
  if (!G.enemies) G.enemies = G.combat.enemies;
  return enemy;
}

export function damagePlayer(n) {
  // Attached to G.helpers.damagePlayer by initCombat; G is closed over there.
  // This exported form is kept for direct calls with a G stored on the fn.
  const G = damagePlayer._G;
  if (!G || !G.state) return;
  applyDamage(G, n);
}

function applyDamage(G, n) {
  const amount = Number(n) || 0;
  if (amount <= 0) return;
  G.state.health = Math.max(0, (G.state.health ?? 100) - amount);
  try {
    const fill = G.hud && G.hud.el ? G.hud.el['health-fill'] : null;
    if (fill && fill.style) fill.style.width = G.state.health + '%';
  } catch (err) { /* HUD is optional */ }
  if (G.state.health <= 0 && !G.state.gameOver) {
    G.state.gameOver = true;
    try {
      if (G.helpers && typeof G.helpers.showBanner === 'function') {
        G.helpers.showBanner('WASTED', 'Dante went down — the Vultures win this round.');
      }
    } catch (err) { /* banner is optional */ }
  }
}

export function initCombat(G) {
  if (!G.combat) G.combat = {};
  G.combat.enemies = [];
  G.enemies = G.combat.enemies;
  cooldown = 0;
  fPrev = false;
  pendingClick = false;
  flashTimer = 0;
  if (!G.helpers) G.helpers = {};
  damagePlayer._G = G;
  G.helpers.damagePlayer = function (n) { applyDamage(G, n); };
  // Muzzle flash mesh, hidden until a shot fires.
  flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd27a })
  );
  flash.visible = false;
  if (G.scene) G.scene.add(flash);
  // Mouse click queues a shot (input.js only tracks keys / mouse delta).
  if (typeof window !== 'undefined' && !initCombat._listening) {
    initCombat._listening = true;
    window.addEventListener('mousedown', function (ev) {
      if (ev && ev.button === 0) pendingClick = true;
    });
  }
}

export function updateCombat(G, dt) {
  if (!G || !G.combat || !G.state || !G.player) return;
  if (G.state.paused || G.state.gameOver || !G.state.started) return;
  if (!dt || dt <= 0) dt = 0.016;
  dt = Math.min(dt, 0.05);

  if (cooldown > 0) cooldown -= dt;
  if (flashTimer > 0) {
    flashTimer -= dt;
    if (flashTimer <= 0 && flash) flash.visible = false;
  }

  const keys = (G.input && G.input.keys) ? G.input.keys : new Set();
  const fDown = keys.has('KeyF');
  if ((fDown && !fPrev) || pendingClick) shoot(G);
  fPrev = fDown;
  pendingClick = false;

  // Enemies: close in on Dante and shoot back inside 25 units.
  const playerPos = G.player.pos;
  for (const e of [...G.combat.enemies]) {
    if (!e || !e.pos) continue;
    if (e.flashTimer > 0) e.flashTimer -= dt;
    const dx = playerPos.x - e.pos.x;
    const dz = playerPos.z - e.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 45) continue;
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - e.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    e.heading += dh * Math.min(1, 4 * dt);
    if (dist > 6) {
      e.pos.x += Math.sin(e.heading) * e.speed * dt;
      e.pos.z += Math.cos(e.heading) * e.speed * dt;
    }
    e.group.position.copy(e.pos);
    e.group.rotation.y = e.heading;
    // Return fire: a shot every ~1.4s inside 25 units, 5 damage a hit.
    e.attackTimer -= dt;
    if (dist < 25 && e.attackTimer <= 0) {
      e.attackTimer = 1.4;
      playSound(G, 'shot');
      applyDamage(G, 5);
    }
  }
}
