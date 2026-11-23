// SOLMARA — main entrypoint (round 4). Three.js open-world crime game:
// 12 chained missions, crew of 3, Ember Garage management, respect ranks,
// 3-slot saves, 4 radio stations, SMPD 5-star wanted + AIR-1 + roadblocks.
import { CONFIG } from './config.js';
import { buildCity } from './city.js';
import { initInput, updateInput } from './input.js';
import { initPlayer, updatePlayer } from './player.js';
import { initVehicles, updateVehicles } from './vehicles.js';
import { initPedestrians, updatePedestrians } from './pedestrians.js';
import { initPolice, updatePolice } from './police.js';
import { initMissions, updateMissions } from './missions.js';
import { initCrew, updateCrew } from './crew.js';
import { initGarage, updateGarage } from './garage.js';
import { initRespect, updateRespect } from './respect.js';
import { initCombat, updateCombat, spawnEnemy } from './combat.js';
import { initHUD, updateHUD } from './hud.js';
import { initAudio, updateAudio } from './audio.js';
import { initSave } from './save.js';
import { initEffects, updateEffects } from './effects.js';
import { initMenus, updateMenus } from './menus.js';
import { applyShot } from './shots.js';

const app = document.getElementById('app');

// Renderer: golden-hour look — soft shadows, filmic tone mapping.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.skyHorizon);
scene.fog = new THREE.Fog(0xff9a3c, 180, 520);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 30, 60);

const clock = new THREE.Clock();

// The shared game context every module receives.
const G = {
  scene, camera, renderer, clock,
  config: CONFIG,
  state: {
    money: 500, wanted: 0, health: 100,
    missionIndex: 0, objectiveText: '', objectiveTarget: null,
    started: false, paused: false, gameOver: false,
    time: 0, speed: 0, inVehicle: null, kills: 0, carsStolen: 0,
  },
  player: { group: null, pos: new THREE.Vector3(0, 0, 0), heading: 0, speed: 0, onFoot: true },
  cars: [],
  peds: [],
  police: { cars: [], heli: null, roadblocks: [] },
  missions: { list: [], currentIndex: 0, current: null },
  crew: { members: ['mara'], active: null },
  garage: { owned: [], active: 0 },
  respect: { points: 0 },
  save: { slot: 1 },
  audio: { ctx: null, master: null, radioOn: false, station: 0 },
  hud: { el: {} },
  city: {
    bounds: 210, roads: [],
    spawnPoints: {
      garage: { x: -27, z: 66 },
      beach: { x: 0, z: 168 },
      downtown: { x: 0, z: 0 },
    },
  },
  input: { keys: new Set(), mouseDX: 0 },
  helpers: {},
  effects: { shakeAmt: 0, shakeT: 0 },
  _shotCam: null,
  _menuAngle: 0,
};

// Init order (fixed by the round-4 spec).
buildCity(G);
initInput(G);
initPlayer(G);
initVehicles(G);
initPedestrians(G);
initPolice(G);
initMissions(G);
initCrew(G);
initGarage(G);
initRespect(G);
initCombat(G);
// Missions 4 and 8 call G.helpers.spawnEnemy — wire it now that combat exists.
G.helpers.spawnEnemy = (x, z) => spawnEnemy(G, x, z);
initHUD(G);
initAudio(G);
initSave(G);
initEffects(G);
initMenus(G);

window.SOLMARA = G;

// Chase camera: behind the player (or their car), using CONFIG distances.
function updateCamera(dt) {
  if (G._shotCam) {
    camera.position.copy(G._shotCam.pos);
    camera.lookAt(G._shotCam.look);
    return;
  }
  const p = G.player.pos;
  if (!G.state.started) {
    // Slow menu orbit over downtown + bay before the game starts.
    G._menuAngle += dt * 0.05;
    const r = 90;
    camera.position.set(Math.sin(G._menuAngle) * r, 42, Math.cos(G._menuAngle) * r);
    camera.lookAt(0, 4, 40);
    return;
  }
  const dist = CONFIG.camera.dist;
  const height = CONFIG.camera.height;
  const back = new THREE.Vector3(-Math.sin(G.player.heading), 0, -Math.cos(G.player.heading));
  const target = new THREE.Vector3(
    p.x + back.x * dist,
    height,
    p.z + back.z * dist,
  );
  camera.position.lerp(target, 1 - Math.pow(0.001, dt));
  camera.lookAt(p.x, CONFIG.camera.lookHeight, p.z);
  // Camera shake from explosions / impacts.
  if (G.effects && G.effects.shakeAmt > 0.01) {
    const a = G.effects.shakeAmt;
    camera.position.x += (Math.random() - 0.5) * a;
    camera.position.y += (Math.random() - 0.5) * a * 0.6;
    camera.position.z += (Math.random() - 0.5) * a;
  }
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (G.state.started && !G.state.paused && !G.state.gameOver) {
    G.state.time += dt;
    updateInput(G, dt);
    updatePlayer(G, dt);
    updateVehicles(G, dt);
    updatePedestrians(G, dt);
    updatePolice(G, dt);
    updateMissions(G, dt);
    updateCrew(G, dt);
    updateGarage(G, dt);
    updateRespect(G, dt);
    updateCombat(G, dt);
    updateEffects(G, dt);
    updateHUD(G, dt);
    updateAudio(G, dt);
    updateMenus(G, dt);
  } else {
    // Paused, game over, or still on the start screen: menus still tick
    // (banner fades, pause screen shows) even though the world is frozen.
    updateMenus(G, dt);
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Tab hidden mid-game: auto-pause so the player is not busted while away.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state.started && !G.state.gameOver) {
    G.state.paused = true;
  }
});

// Screenshot hook: ?shot=cover|mission|garage|city poses the scene.
const shotName = new URLSearchParams(window.location.search).get('shot');
if (shotName) {
  setTimeout(() => { try { applyShot(G, shotName); } catch (e) { console.warn('shot failed', e); } }, 1200);
}

frame();
