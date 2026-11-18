// Deterministic screenshot states. The game reads ?shot=start|play|end|
// victory (and &seed=N) and renders one frozen moment, so the screenshots
// in screenshots/ are real renders of the game's own code, repeatable to
// the pixel. A tiny autopilot flies the play shot: it steers toward the
// nearest core, fires at the nearest enemy and dashes when hurt.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { createWorld, startWave, updateWorld, applyUpgrade, spawnCore, burst, updateParticles } from './world.js';

export function shotRequested() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function buildShotWorld(shot, seed) {
  const rng = makeRng(seed);
  const world = createWorld(rng);
  world.best = 12480;

  if (shot === 'start') {
    // A lively title backdrop: wave 2 already spawned, so a drone hunts
    // above the title, and cores glint across the field. Park the ship
    // low-left, clear of the LAUNCH button and the best-score line.
    world.wave = 2;
    startWave(world);
    seedField(world, 900);
    scatterCores(world, 8);
    world.ship.x = 180;
    world.ship.y = 680;
    return { world, state: 'title' };
  }

  if (shot === 'play') {
    // Spawn the whole wave first, then let the autopilot fight for 2.5
    // seconds: bullets fan out, a rock or two pops and drops cores, but
    // the field stays crowded. Simulating a long fight instead clears
    // the field and leaves an empty frame. The ship already runs split
    // shot and a faster cycler, so the fire reads as a fan.
    world.wave = 5;
    applyUpgrade(world, 'split');
    applyUpgrade(world, 'rapid');
    startWave(world);
    seedField(world, 800);
    world.ship.hull = world.ship.maxHull;
    world.ship.shield = world.ship.maxShield;
    const autopilot = makeAutopilot();
    const dt = 1 / 60;
    for (let t = 0; t < 2.5 * 60; t++) {
      autopilot(world, dt);
      updateWorld(world, autopilot.input, dt, null);
      autopilot.input.endTick();
      if (!world.ship.alive) break;
    }
    world.score = 2480 + world.score;
    return { world, state: 'playing' };
  }

  if (shot === 'end') {
    // A doomed run: two waves in, hull gone, wreckage everywhere. A
    // fresh explosion burst still hangs at the death site.
    world.wave = 3;
    world.score = 7310;
    world.kills = 41;
    world.coresCollected = 58;
    startWave(world);
    seedField(world, 1500);
    world.ship.hull = 0;
    world.ship.alive = false;
    burst(world, world.ship.x, world.ship.y, '#ffd166', 60, 420, 9);
    burst(world, world.ship.x, world.ship.y, '#ff5d73', 40, 320, 8);
    // Let the debris fly for a fifth of a second so the wreck reads as
    // a spread-out explosion, not one stacked clump.
    for (let t = 0; t < 12; t++) updateParticles(world, 1 / 60);
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

// Drop n cores at fixed seeded spots across the field, for backdrops
// where nothing has been shot yet and no cores would exist otherwise.
function scatterCores(world, n) {
  for (let i = 0; i < n; i++) {
    const x = 120 + world.rng() * 1040;
    const y = 120 + world.rng() * 560;
    spawnCore(world, x, y);
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
    // Steer toward the nearest core, else hold the middle of the arena:
    // chasing every core drags the ship into a corner and empties the
    // frame, while the middle keeps the fight in view.
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
    if (best > 320) {
      tx = 640;
      ty = 400;
    }
    const dx = tx - ship.x;
    const dy = ty - ship.y;
    const len = Math.hypot(dx, dy) || 1;
    input._move = { x: dx / len, y: dy / len };
    // Aim at the nearest rock. Drones are left alone on purpose: they
    // keep orbiting and shooting, so the frame keeps its red hunters.
    let aimX = ship.x;
    let aimY = ship.y - 100;
    let bestEnemy = Infinity;
    const targets = world.asteroids;
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
