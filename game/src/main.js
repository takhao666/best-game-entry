// Starfall Salvage: the game loop and state machine. States: title,
// playing, upgrade (pick a card between waves), paused, gameover,
// victory. The HUD, overlays and upgrade cards are DOM; the world is
// canvas. A ?shot= URL renders one frozen state for screenshots.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import { drawWorld } from './render.js';
import { buildShotWorld, shotRequested } from './shots.js';
import {
  createWorld,
  startWave,
  waveCleared,
  updateWorld,
  upgradeChoices,
  applyUpgrade,
  comboMultiplier,
  shipStats,
} from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const el = (id) => document.getElementById(id);
const scoreEl = el('score');
const comboEl = el('combo');
const waveEl = el('wave');
const hullFill = el('hullFill');
const shieldFill = el('shieldFill');
const dashFill = el('dashFill');
const dashLabel = el('dashLabel');
const toastEl = el('toast');
const titleScreen = el('titleScreen');
const upgradeScreen = el('upgradeScreen');
const endScreen = el('endScreen');
const pauseScreen = el('pauseScreen');
const bestLine = el('bestLine');

const sfx = new SoundBank();
const input = new Input(canvas);

let world = null;
let state = 'title';
let seed = (Math.random() * 1e9) | 0;
let toastTimer = null;
let rafId = 0;
let lastTime = 0;
let accumulator = 0;
const STEP = 1 / 60;

const BEST_KEY = 'starfall-salvage-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or no storage: the session's best still shows.
  }
}

function showToast(text, ms) {
  toastEl.textContent = text;
  toastEl.style.opacity = '1';
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.style.opacity = '0';
  }, ms || 1600);
}

function showOnly(screen) {
  for (const s of [titleScreen, upgradeScreen, endScreen, pauseScreen]) {
    s.classList.toggle('hidden', s !== screen);
  }
  if (!screen) {
    for (const s of [titleScreen, upgradeScreen, endScreen, pauseScreen]) {
      s.classList.add('hidden');
    }
  }
}

function newRun() {
  seed = (Math.random() * 1e9) | 0;
  world = createWorld(makeRng(seed));
  world.best = loadBest();
  bestLine.textContent = `Best score: ${world.best}`;
  startWave(world);
  state = 'playing';
  showOnly(null);
  sfx.waveHorn();
  showToast('WAVE 1 — SALVAGE THE FIELD');
}

function endRun(victory) {
  state = victory ? 'victory' : 'gameover';
  const isBest = world.score > world.best;
  if (isBest) {
    world.best = world.score;
    saveBest(world.score);
  }
  el('endTitle').textContent = victory ? 'HAUL SECURED!' : 'SHIP LOST';
  el('endText').textContent = victory
    ? `All ten waves cleared. The freighter's fortune is yours, captain${isBest ? ' — a new best!' : '.'}`
    : `Your skiff broke apart in wave ${world.wave}. The belt keeps its secrets… this time${isBest ? ' — but you set a new best!' : '.'}`;
  el('endStats').textContent =
    `Score ${world.score} · Best ${world.best} · Waves cleared ${victory ? 10 : world.wave - 1} · ` +
    `Kills ${world.kills} · Cores ${world.coresCollected}`;
  showOnly(endScreen);
  if (victory) sfx.victory();
  else sfx.gameOver();
}

function openUpgrades() {
  state = 'upgrade';
  const cards = upgradeChoices(world);
  const box = el('upgradeCards');
  box.innerHTML = '';
  cards.forEach((card, i) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<h3>${card.title}</h3><p>${card.blurb}</p><span class="key">PRESS ${i + 1} OR CLICK</span>`;
    div.addEventListener('click', () => chooseUpgrade(card.id));
    box.appendChild(div);
  });
  showOnly(upgradeScreen);
  // Store the offered cards for the number keys.
  openUpgrades.current = cards;
}

function chooseUpgrade(id) {
  applyUpgrade(world, id);
  world.wave += 1;
  startWave(world);
  state = 'playing';
  showOnly(null);
  sfx.waveHorn();
  showToast(`WAVE ${world.wave} — INCOMING`);
}

function updateHud() {
  if (!world) return;
  scoreEl.textContent = String(world.score);
  waveEl.textContent = String(Math.min(world.wave, CONFIG.totalWaves));
  const mult = comboMultiplier(world);
  comboEl.textContent = world.combo >= 5 ? `COMBO x${mult} · ${world.combo} cores` : '';
  const ship = world.ship;
  hullFill.style.width = `${Math.max(0, (ship.hull / ship.maxHull) * 100)}%`;
  shieldFill.style.width = `${Math.max(0, (ship.shield / ship.maxShield) * 100)}%`;
  const stats = shipStats(world);
  const dashReady = ship.dashCooldown <= 0;
  dashFill.style.width = dashReady ? '100%' : `${Math.max(0, (1 - ship.dashCooldown / stats.dashCooldown) * 100)}%`;
  dashLabel.textContent = dashReady ? 'ready' : 'charging';
}

// One fixed-timestep tick of play.
function tick(dt) {
  if (state !== 'playing') return;
  updateWorld(world, input, dt, sfx);
  if (!world.ship.alive) {
    updateHud();
    endRun(false);
    return;
  }
  if (waveCleared(world)) {
    updateHud();
    if (world.wave >= CONFIG.totalWaves) {
      endRun(true);
    } else {
      openUpgrades();
    }
  }
}

function frame(time) {
  rafId = window.requestAnimationFrame(frame);
  const dt = Math.min(0.1, (time - lastTime) / 1000 || 0);
  lastTime = time;
  accumulator += dt;
  while (accumulator >= STEP) {
    accumulator -= STEP;
    if (state === 'playing') tick(STEP);
    else if (world && (state === 'title' || state === 'gameover' || state === 'victory')) {
      // Keep the backdrop alive behind overlays: drift stars and particles.
      updateWorld(world, idleInput, STEP, null);
    }
  }
  if (world) drawWorld(ctx, world);
  if (state === 'playing') updateHud();
  input.endTick();
}

// A still input for backdrop animation behind overlays.
const idleInput = {
  moveVector: () => ({ x: 0, y: 0 }),
  wasPressed: () => false,
  down: () => false,
  mouseDown: false,
  mouseX: 640,
  mouseY: 200,
  endTick: () => {},
};

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    showOnly(pauseScreen);
  } else if (state === 'paused') {
    state = 'playing';
    showOnly(null);
  }
}

function bindControls() {
  el('startBtn').addEventListener('click', () => {
    sfx.unlock();
    newRun();
  });
  el('restartBtn').addEventListener('click', () => {
    sfx.unlock();
    newRun();
  });
  el('muteBtn').addEventListener('click', () => {
    sfx.unlock();
    sfx.setMuted(!sfx.muted);
    el('muteBtn').textContent = sfx.muted ? '♪ sound: off' : '♪ sound: on';
  });
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    sfx.unlock();
    if (key === 'enter' && (state === 'title' || state === 'gameover' || state === 'victory')) {
      newRun();
      return;
    }
    if (key === 'r' && (state === 'gameover' || state === 'victory' || state === 'paused')) {
      newRun();
      return;
    }
    if (key === 'p') {
      togglePause();
      return;
    }
    if (key === 'm') {
      sfx.setMuted(!sfx.muted);
      el('muteBtn').textContent = sfx.muted ? '♪ sound: off' : '♪ sound: on';
      return;
    }
    if (state === 'upgrade' && ['1', '2', '3'].includes(key)) {
      const cards = openUpgrades.current || [];
      const card = cards[Number(key) - 1];
      if (card) chooseUpgrade(card.id);
    }
  });
  // Clicking the canvas during play also fires (mouseDown is tracked).
  canvas.addEventListener('mousedown', () => sfx.unlock());
}

function start() {
  bindControls();
  const shot = shotRequested();
  if (shot) {
    // Frozen screenshot state: render one frame and stop the loop.
    const seedParam = new URLSearchParams(window.location.search).get('seed');
    const shotSeed = seedParam ? Number(seedParam) : 1;
    const built = buildShotWorld(shot, shotSeed);
    world = built.world;
    state = built.state;
    drawWorld(ctx, world);
    updateHud();
    if (state === 'title') {
      showOnly(titleScreen);
      bestLine.textContent = `Best score: ${world.best}`;
    } else if (state === 'gameover' || state === 'victory') {
      el('endTitle').textContent = state === 'victory' ? 'HAUL SECURED!' : 'SHIP LOST';
      el('endText').textContent =
        state === 'victory'
          ? 'All ten waves cleared. The freighter’s fortune is yours, captain.'
          : `Your skiff broke apart in wave ${world.wave}. The belt keeps its secrets… this time.`;
      el('endStats').textContent =
        `Score ${world.score} · Best ${world.best} · Waves cleared ${state === 'victory' ? 10 : world.wave - 1} · ` +
        `Kills ${world.kills} · Cores ${world.coresCollected}`;
      showOnly(endScreen);
    } else {
      showOnly(null);
    }
    document.title = `Starfall Salvage — shot:${shot}`;
    if (state === 'playing') {
      // The frozen action frame carries its wave banner with it.
      toastEl.textContent = `WAVE ${world.wave} — DRONES INBOUND`;
      toastEl.style.opacity = '1';
    }
    return;
  }
  world = createWorld(makeRng(seed));
  world.best = loadBest();
  bestLine.textContent = `Best score: ${world.best}`;
  startWave(world);
  state = 'title';
  showOnly(titleScreen);
  lastTime = window.performance.now();
  rafId = window.requestAnimationFrame(frame);
}

start();
