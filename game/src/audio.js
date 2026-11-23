// audio.js — SOLMARA procedural audio (round 4).
// WebAudio only, NO audio files. Engine hum, siren, gunshot, explosion,
// cash chime, and 4 procedural radio stations with DJ idents.
// AudioContext is created ONLY after a first user gesture (start button,
// keypress or pointerdown) — browsers block audio before a gesture.
// Radio box update: audio.js writes the station name itself, trying
// G.hud.el['radio-station'] first (filled by hud.js init) and falling back
// to document.getElementById('radio-station') if the HUD map is absent.
// Persisted state lives on G.audio ({radioOn, station}); save.js reads it
// from there and restores it into G.audio before/after initAudio runs, so
// initAudio reads G.audio defensively and defaults to OFF / station 0.

export const STATIONS = [
  {
    name: 'SOL FM', wave: 'sine', bpm: 100, dj: 'Sunny',
    lines: [
      'Golden hour on SOL FM — this one is for everyone stuck in downtown traffic.',
      'Sunny here, SOL FM — windows down, volume up, Solmara is glowing tonight.',
    ],
    tracks: ['Sunset Boulevard Breeze', 'Palms at Dusk'],
  },
  {
    name: 'EMBER ROCK', wave: 'square', bpm: 140, dj: 'Rex',
    lines: [
      'Rex on EMBER ROCK — turn it up, the Vultures hate this one.',
      'EMBER ROCK, Rex talking — if your engine is not screaming, you are doing it wrong.',
    ],
    tracks: ['Full Throttle Heart', 'Asphalt Anthem'],
  },
  {
    name: 'BAY BASS', wave: 'sawtooth', bpm: 120, dj: 'Marina',
    lines: [
      'Marina on BAY BASS — deep low end for the port run, stay smooth out there.',
      'BAY BASS with Marina — the tide is in and the bass is heavier than ever.',
    ],
    tracks: ['Harbour Lights Low', 'Night Tide Groove'],
  },
  {
    name: 'SOLMARA NIGHTS', wave: 'triangle', bpm: 90, dj: 'Nocturne',
    lines: [
      'Nocturne on SOLMARA NIGHTS — slow synths for the long drive home.',
      'SOLMARA NIGHTS, Nocturne here — the city never sleeps, it just hums softer.',
    ],
    tracks: ['Neon After Midnight', 'Slow Glow Avenue'],
  },
];

// Pentatonic-ish step patterns (semitone offsets from the station root).
const PATTERNS = [
  [0, 3, 5, 7, 10, 7, 5, 3],
  [0, 0, 5, 7, 10, 7, 12, 10],
  [0, 3, 3, 5, 7, 10, 7, 3],
  [0, 5, 7, 10, 12, 10, 7, 5],
];
const ROOTS = [220, 196, 174.61, 164.81]; // A3, G3, F3, E3

function midiToFreq(root, semitones) {
  return root * Math.pow(2, semitones / 12);
}

export function initAudio(G) {
  if (!G.audio) G.audio = {};
  const a = G.audio;
  // Defensive restore: save.js may have put these on G.audio already, or
  // on G.saveData (older restore path). Defaults: radio OFF, station 0.
  if (typeof a.radioOn !== 'boolean') {
    a.radioOn = !!(G.saveData && G.saveData.radioOn);
  }
  if (typeof a.station !== 'number' || a.station < 0 || a.station >= STATIONS.length) {
    const s = G.saveData && typeof G.saveData.station === 'number' ? G.saveData.station : 0;
    a.station = Math.max(0, Math.min(STATIONS.length - 1, s));
  }
  a.ctx = a.ctx || null;
  a.master = a.master || null;
  a.noiseBuf = null;
  a.engineOsc = null;
  a.engineGain = null;
  a.engineFilter = null;
  a.nextNoteTime = 0;
  a.step = 0;
  a.djTimer = 45; // seconds until the first DJ ident
  a.djLine = 0; // rotating line index per station (shared counter, rotated per ident)
  a.sirenTimer = 0;
  a._prevR = false;
  a._gestureBound = false;
  a._started = false;

  const ensureCtx = () => {
    if (a.ctx) {
      if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      a.ctx = new AC();
      a.master = a.ctx.createGain();
      a.master.gain.value = 0.5;
      a.master.connect(a.ctx.destination);
      // Shared white-noise buffer for shot / explosion / pickup textures.
      const len = Math.floor(a.ctx.sampleRate * 0.5);
      a.noiseBuf = a.ctx.createBuffer(1, len, a.ctx.sampleRate);
      const data = a.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      startEngine(a);
      a.nextNoteTime = a.ctx.currentTime + 0.1;
      a._started = true;
      updateRadioBox(G);
      return true;
    } catch (e) {
      return false;
    }
  };

  // First user gesture unlocks audio (also called by the start button path).
  const onGesture = () => { ensureCtx(); };
  if (typeof window !== 'undefined' && !a._gestureBound) {
    a._gestureBound = true;
    window.addEventListener('pointerdown', onGesture, { once: false });
    window.addEventListener('keydown', onGesture, { once: false });
  }

  a.ensureCtx = ensureCtx;

  G.helpers = G.helpers || {};
  G.helpers.playSound = (name) => playSound(G, name);
  G.helpers.startAudio = () => ensureCtx();
  G.helpers.toggleRadio = () => toggleRadio(G);
  G.helpers.setStation = (i) => {
    a.station = Math.max(0, Math.min(STATIONS.length - 1, i | 0));
    a.step = 0;
    updateRadioBox(G);
  };
  updateRadioBox(G);
}

function startEngine(a) {
  if (!a.ctx || a.engineOsc) return;
  a.engineOsc = a.ctx.createOscillator();
  a.engineOsc.type = 'sawtooth';
  a.engineOsc.frequency.value = 55;
  a.engineFilter = a.ctx.createBiquadFilter();
  a.engineFilter.type = 'lowpass';
  a.engineFilter.frequency.value = 320;
  a.engineGain = a.ctx.createGain();
  a.engineGain.gain.value = 0.0;
  a.engineOsc.connect(a.engineFilter);
  a.engineFilter.connect(a.engineGain);
  a.engineGain.connect(a.master);
  a.engineOsc.start();
}

function updateRadioBox(G) {
  const a = G.audio || {};
  const st = STATIONS[a.station || 0];
  const text = a.radioOn ? 'RADIO: ' + st.name : 'RADIO: OFF (R)';
  // Preferred: the HUD element map filled by hud.js init.
  const el = (G.hud && G.hud.el && G.hud.el['radio-station'])
    || (typeof document !== 'undefined' ? document.getElementById('radio-station') : null);
  if (el) el.textContent = text;
}

function toggleRadio(G) {
  const a = G.audio;
  if (!a) return;
  a.radioOn = !a.radioOn;
  if (a.radioOn) {
    if (a.ensureCtx) a.ensureCtx();
    a.djTimer = 45;
    a.step = 0;
    if (a.ctx) a.nextNoteTime = a.ctx.currentTime + 0.05;
    if (G.helpers && G.helpers.playSound) G.helpers.playSound('click');
  }
  updateRadioBox(G);
}

function blip(a, opts) {
  // opts: {type, freq, freqEnd, dur, gain, when}
  if (!a.ctx || !a.master) return;
  const t0 = a.ctx.currentTime + (opts.when || 0);
  const osc = a.ctx.createOscillator();
  osc.type = opts.type || 'sine';
  osc.frequency.setValueAtTime(opts.freq || 440, t0);
  if (opts.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqEnd), t0 + opts.dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain || 0.25, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g);
  g.connect(a.master);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.05);
}

function noiseBurst(a, opts) {
  // opts: {dur, gain, filterType, filterFreq, freqEnd}
  if (!a.ctx || !a.master || !a.noiseBuf) return;
  const t0 = a.ctx.currentTime + (opts.when || 0);
  const src = a.ctx.createBufferSource();
  src.buffer = a.noiseBuf;
  src.loop = true;
  const f = a.ctx.createBiquadFilter();
  f.type = opts.filterType || 'lowpass';
  f.frequency.setValueAtTime(opts.filterFreq || 1200, t0);
  if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), t0 + opts.dur);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(opts.gain || 0.4, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  src.connect(f);
  f.connect(g);
  g.connect(a.master);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.05);
}

export function playSound(G, name) {
  const a = G.audio;
  if (!a) return;
  if (!a.ctx) {
    // No gesture yet: try to create the context (harmless if blocked), and
    // bail out silently rather than crashing the game loop.
    if (a.ensureCtx) a.ensureCtx();
    if (!a.ctx) return;
  }
  if (a.ctx.state === 'suspended') a.ctx.resume().catch(() => {});
  switch (name) {
    case 'shot':
      noiseBurst(a, { dur: 0.12, gain: 0.5, filterType: 'highpass', filterFreq: 900 });
      blip(a, { type: 'square', freq: 220, freqEnd: 60, dur: 0.09, gain: 0.2 });
      break;
    case 'explosion':
      noiseBurst(a, { dur: 0.9, gain: 0.7, filterType: 'lowpass', filterFreq: 900, freqEnd: 80 });
      blip(a, { type: 'sine', freq: 120, freqEnd: 30, dur: 0.8, gain: 0.5 });
      break;
    case 'siren':
      // Two-tone SMPD wail, ~1.6s.
      blip(a, { type: 'sine', freq: 700, dur: 0.4, gain: 0.16 });
      blip(a, { type: 'sine', freq: 950, dur: 0.4, gain: 0.16, when: 0.4 });
      blip(a, { type: 'sine', freq: 700, dur: 0.4, gain: 0.16, when: 0.8 });
      blip(a, { type: 'sine', freq: 950, dur: 0.4, gain: 0.16, when: 1.2 });
      break;
    case 'pickup':
      blip(a, { type: 'sine', freq: 520, freqEnd: 880, dur: 0.14, gain: 0.22 });
      break;
    case 'cash':
      // Two-note chime: E5 then B5.
      blip(a, { type: 'sine', freq: 659.25, dur: 0.16, gain: 0.28 });
      blip(a, { type: 'sine', freq: 987.77, dur: 0.28, gain: 0.28, when: 0.13 });
      break;
    case 'engine':
      blip(a, { type: 'sawtooth', freq: 90, freqEnd: 180, dur: 0.25, gain: 0.12 });
      break;
    case 'click':
      blip(a, { type: 'square', freq: 800, dur: 0.05, gain: 0.12 });
      break;
    case 'mission':
      // Little rising arpeggio: C5 - E5 - G5.
      blip(a, { type: 'triangle', freq: 523.25, dur: 0.14, gain: 0.25 });
      blip(a, { type: 'triangle', freq: 659.25, dur: 0.14, gain: 0.25, when: 0.12 });
      blip(a, { type: 'triangle', freq: 783.99, dur: 0.3, gain: 0.25, when: 0.24 });
      break;
    default:
      blip(a, { type: 'sine', freq: 440, dur: 0.1, gain: 0.15 });
      break;
  }
}

function scheduleRadioNote(G) {
  const a = G.audio;
  if (!a.ctx || !a.radioOn) return;
  const st = STATIONS[a.station || 0];
  const beat = 60 / st.bpm;
  const now = a.ctx.currentTime;
  // Schedule a short lookahead so the loop stays in time. The guard caps
  // iterations so a long tab-inactive gap can never spin the scheduler.
  let guard = 0;
  while (a.nextNoteTime < now + 0.15 && guard++ < 32) {
    const pattern = PATTERNS[a.station || 0];
    const semis = pattern[a.step % pattern.length];
    const freq = midiToFreq(ROOTS[a.station || 0], semis);
    const t0 = Math.max(a.nextNoteTime, now);
    const osc = a.ctx.createOscillator();
    osc.type = st.wave;
    osc.frequency.value = freq;
    // Bass stations get a quiet octave-down shadow note for body.
    const g = a.ctx.createGain();
    const noteDur = beat * 0.9;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + noteDur);
    osc.connect(g);
    g.connect(a.master);
    osc.start(t0);
    osc.stop(t0 + noteDur + 0.05);
    // Every 4th step, a soft off-beat hat tick (high blip) keeps tempo.
    if (a.step % 2 === 1) {
      const tick = a.ctx.createOscillator();
      tick.type = 'square';
      tick.frequency.value = 2400;
      const tg = a.ctx.createGain();
      tg.gain.setValueAtTime(0.0001, t0);
      tg.gain.exponentialRampToValueAtTime(0.03, t0 + 0.005);
      tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
      tick.connect(tg);
      tg.connect(a.master);
      tick.start(t0);
      tick.stop(t0 + 0.05);
    }
    a.step++;
    a.nextNoteTime += beat;
  }
}

export function updateAudio(G, dt) {
  const a = G.audio;
  if (!a) return;
  if (!G.state || !G.state.started || G.state.paused) return;

  // R cycles radio stations (edge-triggered). Also turns the radio on the
  // first time R is pressed if it was off.
  const keys = (G.input && G.input.keys) || new Set();
  const rDown = keys.has('KeyR');
  if (rDown && !a._prevR) {
    if (!a.radioOn) {
      toggleRadio(G);
    } else {
      a.station = (a.station + 1) % STATIONS.length;
      a.step = 0;
      a.djTimer = 45; // fresh station, fresh DJ countdown
      updateRadioBox(G);
      if (G.helpers && G.helpers.playSound) G.helpers.playSound('click');
    }
  }
  a._prevR = rDown;

  if (!a.ctx) return;

  // Engine hum follows speed: idle ~55 Hz, up to ~190 Hz at full speed,
  // louder while driving than while on foot.
  if (a.engineOsc && a.engineGain) {
    const speed = Math.abs(G.state.speed || 0);
    const driving = !!G.state.inVehicle;
    const targetFreq = 55 + Math.min(speed, 45) * 3;
    const targetGain = driving ? 0.05 + Math.min(speed / 45, 1) * 0.06 : 0.02;
    const t = a.ctx.currentTime;
    a.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.08);
    a.engineGain.gain.setTargetAtTime(targetGain, t, 0.1);
    if (a.engineFilter) a.engineFilter.frequency.setTargetAtTime(280 + speed * 14, t, 0.1);
  }

  // Radio sequencer.
  if (a.radioOn) scheduleRadioNote(G);

  // DJ idents: every ~45s while the radio is on, a banner with the DJ's
  // line and the current track title. Two rotating lines per station.
  if (a.radioOn && G.helpers && G.helpers.showBanner) {
    a.djTimer -= dt;
    if (a.djTimer <= 0) {
      a.djTimer = 45;
      const st = STATIONS[a.station || 0];
      const line = st.lines[a.djLine % st.lines.length];
      const track = st.tracks[a.djLine % st.tracks.length];
      a.djLine++;
      G.helpers.showBanner(st.dj + ' — ' + st.name, line + '  ♪ ' + track);
    }
  }

  // SMPD siren ambience: a wail every ~2.5s while wanted at 3+ stars.
  if ((G.state.wanted || 0) >= 3) {
    a.sirenTimer -= dt;
    if (a.sirenTimer <= 0) {
      a.sirenTimer = 2.5;
      playSound(G, 'siren');
    }
  } else {
    a.sirenTimer = 0;
  }
}
