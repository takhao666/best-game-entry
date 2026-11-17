// Deterministic screenshot states. The game reads ?shot=start|play|end|
// victory (and &seed=N) and renders one frozen moment, so the screenshots
// in screenshots/ are real renders of the game's own code, repeatable to
// the pixel. A tiny autopilot flies the play shot: it steers toward the
// nearest core, fires at the nearest enemy and dashes when hurt.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { createWorld, startWave, updateWorld, applyUpgrade } from './world.js';

export function shotRequested() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function buildShotWorld(shot, seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  world.best = 12480;

  if (shot === 'start') {
    // A lively title backdrop: wave 1 already spawned. Park the ship
    // low-left, clear of the LAUNCH button and the best-score line.
    startWave(world);
    seedField(world, 900);
    world.ship.x = 180;
    world.ship.y = 680;
    return { world, state: 'title' };
  }

  if (shot === 'play') {
    // Simulate 10 seconds of autopilot play on wave 3 for a busy
    // mid-action frame: rocks, drones and cores still everywhere.
    world.wave = 3;
    startWave(world);
    const autopilot = makeAutopilot();
    const dt = 1 / 60;
    for (let t = 0; t < 10 * 60; t++) {
      autopilot(world, dt);
      updateWorld(world, autopilot.input, dt, null);
      autopilot.input.endTick();
      if (!world.ship.alive) break;
    }
    world.score = 2480 + world.score;
    return { world, state: 'playing' };
  }

  if (shot === 'end') {
    // A doomed run: two waves in, hull gone, wreckage everywhere.
    world.wave = 3;
    world.score = 7310;
    world.kills = 41;
    world.coresCollected = 58;
    startWave(world);
    seedField(world, 1500);
    world.ship.hull = 0;
    world.ship.alive = false;
    return { world, state: 'gameover' };
  }

  // victory: all ten waves survived, haul tallied.
  world.wave = 10;
  world.score = 31240;
  world.kills = 132;
  world.coresCollected = 214;
  world.combo = 12;
  startWave(world);
  seedField(world, 600);
  applyUpgrade(world, 'split');
  applyUpgrade(world, 'rapid');
  return { world, state: 'victory' };
}

// Scatter a fixed field of rocks, drones and cores for a backdrop.
function seedField(world, ticks) {
  const dt = 1 / 60;
  const idle = { moveVector: () => ({ x: 0, y: 0 }), wasPressed: () => false, down: () => false, mouseDown: false, mouseX: 640, mouseY: 200, endTick: () => {} };
  for (let t = 0; t < ticks; t++) {
    updateWorld(world, idle, dt, null);
    if (world.waveSpawned >= world.waveTotal) break;
  }
}

// The autopilot: a fake Input the simulation drives.
function makeAutopilot() {
  const input = {
    keys: new Set(),
    mouseX: 640,
    mouseY: 200,
    mouseDown: true,
    pressed: new Set(),
    moveVector() {
      return this._move;
    },
    wasPressed(...names) {
      return names.some((name) => this.pressed.has(name));
    },
    down() {
      return false;
    },
    endTick() {
      this.pressed.clear();
    },
    _move: { x: 0, y: 0 },
  };

  function autopilot(world, dt) {
    const ship = world.ship;
    // Steer toward the nearest core, else toward the centre.
    let tx = 640;
    let ty = 400;
    let best = Infinity;
    for (const c of world.cores) {
      const d = Math.hypot(c.x - ship.x, c.y - ship.y);
      if (d < best) {
        best = d;
        tx = c.x;
        ty = c.y;
      }
    }
    const dx = tx - ship.x;
    const dy = ty - ship.y;
    const len = Math.hypot(dx, dy) || 1;
    input._move = { x: dx / len, y: dy / len };
    // Aim at the nearest enemy.
    let aimX = ship.x;
    let aimY = ship.y - 100;
    let bestEnemy = Infinity;
    const targets = world.asteroids.concat(world.drones);
    for (const e of targets) {
      const d = Math.hypot(e.x - ship.x, e.y - ship.y);
      if (d < bestEnemy) {
        bestEnemy = d;
        aimX = e.x;
        aimY = e.y;
      }
    }
    input.mouseX = aimX;
    input.mouseY = aimY;
    input.mouseDown = true;
    // Dash away when an asteroid gets too close.
    if (world.tick % 240 === 0 && ship.dashCooldown <= 0) {
      input.pressed.add('shift');
    }
  }
  autopilot.input = input;
  return autopilot;
}

export { CONFIG };
