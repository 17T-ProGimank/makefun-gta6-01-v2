// input.js — keyboard + mouse input for SOLMARA.
// Owns G.input.keys (a Set of KeyboardEvent.code strings) and G.input.mouseDX
// (accumulated horizontal mouse movement, decayed each frame by updateInput).
// Every other module reads G.input.keys; nothing else touches the listeners.

const GAME_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'ShiftLeft', 'ShiftRight',
  'KeyE', 'KeyF', 'KeyG', 'KeyC', 'KeyR', 'Enter', 'Escape',
]);

export function initInput(G) {
  if (!G.input) G.input = { keys: new Set(), mouseDX: 0 };
  const keys = G.input.keys;

  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    // Ignore repeats: the Set already dedupes, but skip re-adding.
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });
  // Losing focus must not leave a key stuck down.
  window.addEventListener('blur', () => {
    keys.clear();
  });
  window.addEventListener('mousemove', (e) => {
    if (typeof e.movementX === 'number') G.input.mouseDX += e.movementX;
  });
}

export function updateInput(G, dt) {
  // Decay the accumulated mouse delta so a flick does not spin the camera
  // forever; frame-rate independent.
  if (G.input) G.input.mouseDX *= Math.pow(0.001, dt);
  if (G.input && Math.abs(G.input.mouseDX) < 0.001) G.input.mouseDX = 0;
}
