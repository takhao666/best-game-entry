// The world: everything that lives in the arena — the ship, bullets,
// asteroids, drones, salvage cores and particles — plus waves, upgrades,
// collisions and scoring. Rendering lives in render.js; this file only
// moves things and decides what happens when they meet.
import { CONFIG } from './config.js';
import { range, intRange, pick, ringPoint } from './random.js';

export const SHIP_START = { x: 640, y: 560 };

export function createWorld(rng) {
  return {
    rng,
    tick: 0,
    wave: 1,
    score: 0,
    best: 0,
    combo: 0,
    comboTimer: 0,
    kills: 0,
    coresCollected: 0,
    waveSpawned: 0,
    waveTotal: 0,
    spawnTimer: 0,
    shake: 0,
    time: 0,
    ship: createShip(),
    bullets: [],
    enemyBullets: [],
    asteroids: [],
    drones: [],
    cores: [],
    particles: [],
    floaters: [],
    stars: makeStars(rng),
    upgrades: {
      fireRate: 0,
      damage: 0,
      multishot: 0,
      hullBonus: 0,
      shieldBonus: 0,
      magnetBonus: 0,
      dashBonus: 0,
      speedBonus: 0,
    },
  };
}

function createShip() {
  return {
    x: SHIP_START.x,
    y: SHIP_START.y,
    vx: 0,
    vy: 0,
    radius: CONFIG.ship.radius,
    angle: -Math.PI / 2,
    hull: CONFIG.ship.hull,
    maxHull: CONFIG.ship.hull,
    shield: CONFIG.ship.shield,
    maxShield: CONFIG.ship.shield,
    shieldTimer: 0,
    fireTimer: 0,
    dashTimer: 0,
    dashCooldown: 0,
    dashX: 0,
    dashY: 0,
    invulnerable: 0,
    trailTimer: 0,
    alive: true,
  };
}

// A starfield that drifts slowly; stars are placed once per world.
function makeStars(rng) {
  const stars = [];
  for (let i = 0; i < 220; i++) {
    stars.push({
      x: rng() * CONFIG.width,
      y: rng() * CONFIG.height,
      size: range(rng, 0.6, 2.2),
      speed: range(rng, 4, 18),
      twinkle: range(rng, 0, Math.PI * 2),
    });
  }
  return stars;
}

// --- Waves -------------------------------------------------------------

export function waveBudget(wave) {
  const def = CONFIG.waves[Math.min(wave, CONFIG.totalWaves) - 1];
  return { asteroids: def.asteroids, drones: def.drones };
}

export function startWave(world) {
  const budget = waveBudget(world.wave);
  world.waveTotal = budget.asteroids + budget.drones;
  world.waveSpawned = 0;
  world.spawnTimer = 0.5;
  world._pending = { asteroids: budget.asteroids, drones: budget.drones };
}

export function waveCleared(world) {
  return (
    world.waveSpawned >= world.waveTotal &&
    world.asteroids.length === 0 &&
    world.drones.length === 0
  );
}

function spawnAsteroid(world, size, x, y) {
  const rng = world.rng;
  const cfg = CONFIG.asteroid;
  const table = {
    large: { radius: cfg.largeRadius, health: cfg.largeHealth, damage: cfg.largeDamage, score: cfg.largeScore },
    medium: { radius: cfg.mediumRadius, health: cfg.mediumHealth, damage: cfg.mediumDamage, score: cfg.mediumScore },
    small: { radius: cfg.smallRadius, health: cfg.smallHealth, damage: cfg.smallDamage, score: cfg.smallScore },
  }[size];
  const angle = rng() * Math.PI * 2;
  // Rocks drift faster in later waves, and lean toward the ship so the
  // field keeps pressing instead of sailing harmlessly past.
  const speed = range(rng, cfg.minSpeed, cfg.maxSpeed) * (1 + world.wave * 0.03);
  const edge = pick(rng, ['top', 'left', 'right']);
  const pos =
    x !== undefined
      ? { x, y }
      : edge === 'top'
        ? { x: range(rng, 40, CONFIG.width - 40), y: -50 }
        : edge === 'left'
          ? { x: -50, y: range(rng, 60, CONFIG.height - 120) }
          : { x: CONFIG.width + 50, y: range(rng, 60, CONFIG.height - 120) };
  // Blend the random drift with a lean toward the ship.
  const toShip = Math.atan2(world.ship.y - pos.y, world.ship.x - pos.x);
  const bias = 0.3;
  const vx = Math.cos(angle) * speed * (1 - bias) + Math.cos(toShip) * speed * bias;
  const vy = Math.abs(Math.sin(angle)) * speed * 0.6 + 20 + Math.sin(toShip) * speed * bias * 0.5;
  world.asteroids.push({
    kind: 'asteroid',
    size,
    x: pos.x,
    y: pos.y,
    vx,
    vy,
    radius: table.radius,
    health: table.health,
    maxHealth: table.health,
    damage: table.damage,
    score: table.score,
    rot: rng() * Math.PI * 2,
    rotSpeed: range(rng, -1.2, 1.2),
    vertices: makeRockVertices(rng, table.radius),
  });
}

// A craggy polygon: 9 points at jittered radii, so no two rocks match.
function makeRockVertices(rng, radius) {
  const points = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const r = radius * range(rng, 0.72, 1.08);
    points.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return points;
}

function spawnDrone(world) {
  const rng = world.rng;
  const cfg = CONFIG.drone;
  const edge = pick(rng, ['top', 'left', 'right']);
  const pos =
    edge === 'top'
      ? { x: range(rng, 60, CONFIG.width - 60), y: -40 }
      : edge === 'left'
        ? { x: -40, y: range(rng, 80, CONFIG.height - 160) }
        : { x: CONFIG.width + 40, y: range(rng, 80, CONFIG.height - 160) };
  world.drones.push({
    kind: 'drone',
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    radius: cfg.radius,
    health: cfg.health,
    maxHealth: cfg.health,
    damage: cfg.damage,
    score: cfg.score,
    fireTimer: range(rng, 1.2, 2.4),
    wobble: rng() * Math.PI * 2,
  });
}

function spawnCore(world, x, y) {
  const rng = world.rng;
  const angle = rng() * Math.PI * 2;
  const speed = range(rng, 30, 90);
  // One core in eight is a rich prism core: bigger, brighter, worth 5x.
  // It is the moment a salvage run turns into a haul.
  const rich = rng() < 0.125;
  world.cores.push({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: rich ? 11 : CONFIG.core.radius,
    value: rich ? CONFIG.core.value * 5 : CONFIG.core.value,
    kind: rich ? 'rich' : 'core',
    age: 0,
    pulse: rng() * Math.PI * 2,
  });
}

function burst(world, x, y, color, count, speed, sizeMax) {
  const rng = world.rng;
  for (let i = 0; i < count; i++) {
    if (world.particles.length >= CONFIG.particles.maxCount) return;
    const angle = rng() * Math.PI * 2;
    const sp = range(rng, speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      life: range(rng, 0.35, 0.8),
      maxLife: 0.8,
      size: range(rng, 1.5, sizeMax || 4),
      color,
    });
  }
}

export function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color: color || '#ffd166', life: 1 });
}

// --- Upgrades ----------------------------------------------------------

export function upgradeChoices(world) {
  const pool = CONFIG.upgrades.slice();
  const rng = world.rng;
  const out = [];
  while (out.length < 3 && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

export function applyUpgrade(world, id) {
  const ship = world.ship;
  const up = world.upgrades;
  if (id === 'rapid') up.fireRate += 1;
  if (id === 'heavy') up.damage += 1;
  if (id === 'split') up.multishot += 1;
  if (id === 'hull') {
    up.hullBonus += 1;
    ship.maxHull += 40;
    ship.hull = Math.min(ship.maxHull, ship.hull + 40);
  }
  if (id === 'shield') {
    up.shieldBonus += 1;
    ship.maxShield += 30;
    ship.shield = ship.maxShield;
  }
  if (id === 'magnet') up.magnetBonus += 1;
  if (id === 'dash') up.dashBonus += 1;
  if (id === 'thrusters') up.speedBonus += 1;
}

// Derived stats from base values plus upgrades.
export function shipStats(world) {
  const up = world.upgrades;
  return {
    fireInterval: CONFIG.ship.fireInterval * Math.pow(0.77, up.fireRate),
    bulletDamage: CONFIG.ship.bulletDamage * Math.pow(1.5, up.damage),
    projectiles: 1 + up.multishot,
    maxSpeed: CONFIG.ship.maxSpeed * (1 + 0.25 * up.speedBonus),
    accel: CONFIG.ship.accel * (1 + 0.2 * up.speedBonus),
    pickupRadius:
      CONFIG.ship.pickupRadius * (1 + 0.7 * up.magnetBonus),
    dashCooldown: CONFIG.ship.dashCooldown * Math.pow(0.55, up.dashBonus),
    shieldRegenRate: CONFIG.ship.shieldRegenRate * (up.shieldBonus > 0 ? 2 : 1),
  };
}

// --- Damage ------------------------------------------------------------

export function damageShip(world, amount, sx, sy) {
  const ship = world.ship;
  if (!ship.alive || ship.invulnerable > 0 || ship.dashTimer > 0) return false;
  let left = amount;
  if (ship.shield > 0) {
    const absorbed = Math.min(ship.shield, left);
    ship.shield -= absorbed;
    left -= absorbed;
  }
  ship.hull -= left;
  ship.shieldTimer = 0;
  ship.invulnerable = 0.6;
  world.shake = Math.max(world.shake, 10);
  burst(world, ship.x, ship.y, '#ff5d73', 14, 260);
  if (ship.hull <= 0) {
    ship.hull = 0;
    ship.alive = false;
    burst(world, ship.x, ship.y, '#ffd166', 60, 420);
    burst(world, ship.x, ship.y, '#ff5d73', 40, 320);
    world.shake = 22;
  }
  return true;
}

// --- Per-tick update ----------------------------------------------------

export function updateWorld(world, input, dt, sfx) {
  world.tick += 1;
  world.time += dt;
  const ship = world.ship;
  const stats = shipStats(world);

  // Combo decay.
  if (world.combo > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  // Spawning.
  if (world._pending && world.waveSpawned < world.waveTotal) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = Math.max(0.25, 0.9 - world.wave * 0.05);
      const pending = world._pending;
      if (pending.drones > 0 && (pending.asteroids <= 0 || world.rng() < 0.35)) {
        spawnDrone(world);
        pending.drones -= 1;
      } else if (pending.asteroids > 0) {
        spawnAsteroid(world, 'large');
        pending.asteroids -= 1;
      }
      world.waveSpawned += 1;
    }
  }

  updateShip(world, input, dt, stats, sfx);
  updateBullets(world, dt);
  updateAsteroids(world, dt, sfx);
  updateDrones(world, dt, sfx);
  updateCores(world, dt, sfx);
  updateParticles(world, dt);
  updateFloaters(world, dt);
  updateStars(world, dt);
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
}

function updateShip(world, input, dt, stats, sfx) {
  const ship = world.ship;
  if (!ship.alive) return;
  const move = input.moveVector();

  if (ship.dashTimer > 0) {
    ship.dashTimer -= dt;
    ship.x += ship.dashX * CONFIG.ship.dashSpeed * dt;
    ship.y += ship.dashY * CONFIG.ship.dashSpeed * dt;
  } else {
    ship.vx += move.x * stats.accel * dt;
    ship.vy += move.y * stats.accel * dt;
    const drag = Math.exp(-CONFIG.ship.drag * dt);
    ship.vx *= drag;
    ship.vy *= drag;
    const speed = Math.hypot(ship.vx, ship.vy);
    if (speed > stats.maxSpeed) {
      ship.vx = (ship.vx / speed) * stats.maxSpeed;
      ship.vy = (ship.vy / speed) * stats.maxSpeed;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
  }

  // Stay inside the arena, softly.
  ship.x = Math.max(ship.radius, Math.min(CONFIG.width - ship.radius, ship.x));
  ship.y = Math.max(ship.radius, Math.min(CONFIG.height - ship.radius, ship.y));

  // Aim at the mouse.
  ship.angle = Math.atan2(input.mouseY - ship.y, input.mouseX - ship.x);

  // Dash: Shift or Space, with cooldown and a short invulnerability.
  if (ship.dashCooldown > 0) ship.dashCooldown -= dt;
  if (input.wasPressed('shift', ' ') && ship.dashCooldown <= 0) {
    const dx = move.x !== 0 || move.y !== 0 ? move.x : Math.cos(ship.angle);
    const dy = move.x !== 0 || move.y !== 0 ? move.y : Math.sin(ship.angle);
    const len = Math.hypot(dx, dy) || 1;
    ship.dashX = dx / len;
    ship.dashY = dy / len;
    ship.dashTimer = CONFIG.ship.dashTime;
    ship.dashCooldown = stats.dashCooldown;
    ship.invulnerable = Math.max(ship.invulnerable, CONFIG.ship.dashInvulnerable);
    burst(world, ship.x, ship.y, '#4cc9f0', 10, 200);
    if (sfx) sfx.dash();
  }
  if (ship.invulnerable > 0) ship.invulnerable -= dt;

  // Shield regeneration after a quiet spell.
  ship.shieldTimer += dt;
  if (ship.shieldTimer >= CONFIG.ship.shieldRegenDelay && ship.shield < ship.maxShield) {
    ship.shield = Math.min(ship.maxShield, ship.shield + stats.shieldRegenRate * dt);
  }

  // Fire while the mouse is held (or Space is held as an alternative).
  ship.fireTimer -= dt;
  if ((input.mouseDown || input.down(' ')) && ship.fireTimer <= 0) {
    ship.fireTimer = stats.fireInterval;
    const count = stats.projectiles;
    const spread = 0.14;
    for (let i = 0; i < count; i++) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const a = ship.angle + offset;
      const noseX = ship.x + Math.cos(a) * (ship.radius + 6);
      const noseY = ship.y + Math.sin(a) * (ship.radius + 6);
      world.bullets.push({
        x: noseX,
        y: noseY,
        vx: Math.cos(a) * CONFIG.ship.bulletSpeed + ship.vx * 0.4,
        vy: Math.sin(a) * CONFIG.ship.bulletSpeed + ship.vy * 0.4,
        damage: stats.bulletDamage,
        life: 0.9,
      });
    }
    if (sfx) sfx.shoot();
  }

  // Thruster trail.
  ship.trailTimer -= dt;
  if ((move.x !== 0 || move.y !== 0) && ship.trailTimer <= 0) {
    ship.trailTimer = CONFIG.particles.trailEvery;
    world.particles.push({
      x: ship.x - Math.cos(ship.angle) * ship.radius,
      y: ship.y - Math.sin(ship.angle) * ship.radius,
      vx: -Math.cos(ship.angle) * 60 + (world.rng() - 0.5) * 40,
      vy: -Math.sin(ship.angle) * 60 + (world.rng() - 0.5) * 40,
      life: 0.35,
      maxLife: 0.35,
      size: 3,
      color: '#ffb347',
    });
  }
}

function updateBullets(world, dt) {
  const bullets = world.bullets;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < -20 || b.x > CONFIG.width + 20 || b.y < -20 || b.y > CONFIG.height + 20) {
      bullets.splice(i, 1);
    }
  }
  const orbs = world.enemyBullets;
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (o.life <= 0 || o.x < -20 || o.x > CONFIG.width + 20 || o.y < -20 || o.y > CONFIG.height + 20) {
      orbs.splice(i, 1);
      continue;
    }
    const ship = world.ship;
    if (ship.alive && dist(o.x, o.y, ship.x, ship.y) < o.radius + ship.radius) {
      damageShip(world, CONFIG.drone.orbDamage, o.x, o.y);
      orbs.splice(i, 1);
    }
  }
}

function updateAsteroids(world, dt, sfx) {
  const list = world.asteroids;
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.rotSpeed * dt;
    // Drift back in when it leaves the bottom or sides.
    if (a.y > CONFIG.height + 60) {
      a.y = -60;
      a.x = range(world.rng, 40, CONFIG.width - 40);
    }
    if (a.x < -70) a.x = CONFIG.width + 60;
    if (a.x > CONFIG.width + 70) a.x = -60;

    // Bullets vs asteroid.
    for (let j = world.bullets.length - 1; j >= 0; j--) {
      const b = world.bullets[j];
      if (dist(b.x, b.y, a.x, a.y) < a.radius + 4) {
        world.bullets.splice(j, 1);
        a.health -= b.damage;
        burst(world, b.x, b.y, '#ffe9a8', 3, 120);
        break;
      }
    }
    if (a.health <= 0) {
      killAsteroid(world, a, sfx);
      list.splice(i, 1);
      continue;
    }

    // Ship vs asteroid.
    const ship = world.ship;
    if (ship.alive && dist(a.x, a.y, ship.x, ship.y) < a.radius + ship.radius - 4) {
      if (damageShip(world, a.damage, a.x, a.y)) {
        // Knock the rock away so one hit does not chain into many.
        const away = Math.atan2(a.y - ship.y, a.x - ship.x);
        a.vx = Math.cos(away) * 160;
        a.vy = Math.sin(away) * 160;
      }
    }
  }
}

function killAsteroid(world, a, sfx) {
  const cfg = CONFIG.asteroid;
  world.kills += 1;
  world.score += a.score;
  addFloater(world, a.x, a.y, `+${a.score}`, '#dfe9ff');
  burst(world, a.x, a.y, '#c9b8ff', a.size === 'large' ? 34 : 16, a.size === 'large' ? 320 : 240);
  if (sfx) sfx.explosion(a.size === 'large');
  const drops = cfg.coresDropped[a.size];
  for (let i = 0; i < drops; i++) {
    const p = ringPoint(world.rng, a.x, a.y, 10);
    spawnCore(world, p.x, p.y);
  }
  // Big rocks split into two smaller ones.
  const child = a.size === 'large' ? 'medium' : a.size === 'medium' ? 'small' : null;
  if (child) {
    for (let i = 0; i < 2; i++) {
      const p = ringPoint(world.rng, a.x, a.y, 14);
      spawnAsteroid(world, child, p.x, p.y);
    }
  }
}

function updateDrones(world, dt, sfx) {
  const ship = world.ship;
  const list = world.drones;
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    d.wobble += dt * 2;
    if (ship.alive) {
      const dx = ship.x - d.x;
      const dy = ship.y - d.y;
      const len = Math.hypot(dx, dy) || 1;
      const orbit = Math.sin(d.wobble) * 0.6;
      d.vx += ((dx / len) * CONFIG.drone.speed + -dy / len * orbit * 60 - d.vx) * dt * 1.5;
      d.vy += ((dy / len) * CONFIG.drone.speed + dx / len * orbit * 60 - d.vy) * dt * 1.5;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.fireTimer -= dt;
      if (d.fireTimer <= 0 && len < 520) {
        d.fireTimer = CONFIG.drone.fireInterval * range(world.rng, 0.9, 1.3);
        world.enemyBullets.push({
          x: d.x,
          y: d.y,
          vx: (dx / len) * CONFIG.drone.orbSpeed,
          vy: (dy / len) * CONFIG.drone.orbSpeed,
          radius: 6,
          life: 3,
        });
      }
    } else {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }

    for (let j = world.bullets.length - 1; j >= 0; j--) {
      const b = world.bullets[j];
      if (dist(b.x, b.y, d.x, d.y) < d.radius + 4) {
        world.bullets.splice(j, 1);
        d.health -= b.damage;
        burst(world, b.x, b.y, '#ff8fa0', 3, 120);
        break;
      }
    }
    if (d.health <= 0) {
      world.kills += 1;
      world.score += d.score;
      addFloater(world, d.x, d.y, `+${d.score}`, '#dfe9ff');
      burst(world, d.x, d.y, '#ff5d73', 24, 300);
      if (sfx) sfx.explosion(false);
      for (let k = 0; k < CONFIG.drone.coresDropped; k++) {
        const p = ringPoint(world.rng, d.x, d.y, 10);
        spawnCore(world, p.x, p.y);
      }
      list.splice(i, 1);
      continue;
    }

    if (ship.alive && dist(d.x, d.y, ship.x, ship.y) < d.radius + ship.radius - 2) {
      damageShip(world, d.damage, d.x, d.y);
    }
  }
}

function updateCores(world, dt, sfx) {
  const ship = world.ship;
  const stats = shipStats(world);
  const list = world.cores;
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i];
    c.age += dt;
    c.pulse += dt * 5;
    if (c.age > CONFIG.core.lifetime) {
      list.splice(i, 1);
      continue;
    }
    // Drift, then get pulled in when the ship is near.
    if (ship.alive) {
      const dx = ship.x - c.x;
      const dy = ship.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      if (len < stats.pickupRadius) {
        const pull = CONFIG.core.magnetPull * (1 - len / (stats.pickupRadius + 40));
        c.vx += (dx / len) * pull * dt * 4;
        c.vy += (dy / len) * pull * dt * 4;
      }
    }
    c.vx *= Math.exp(-1.2 * dt);
    c.vy *= Math.exp(-1.2 * dt);
    c.x += c.vx * dt;
    c.y += c.vy * dt;

    if (ship.alive && dist(c.x, c.y, ship.x, ship.y) < c.radius + ship.radius + 2) {
      list.splice(i, 1);
      world.coresCollected += 1;
      world.combo = Math.min(world.combo + 1, 40);
      world.comboTimer = CONFIG.combo.window;
      const multiplier = 1 + Math.floor(world.combo / 5);
      const capped = Math.min(multiplier, CONFIG.combo.maxMultiplier);
      const gained = c.value * capped;
      world.score += gained;
      addFloater(world, c.x, c.y, `+${gained}`, '#ffd166');
      burst(world, c.x, c.y, '#ffd166', 6, 140);
      if (sfx) sfx.pickup(world.combo);
    }
  }
}

function updateParticles(world, dt) {
  const list = world.particles;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.exp(-2 * dt);
    p.vy *= Math.exp(-2 * dt);
    p.life -= dt;
    if (p.life <= 0) list.splice(i, 1);
  }
}

function updateFloaters(world, dt) {
  const list = world.floaters;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    f.y -= 34 * dt;
    f.life -= dt * 0.9;
    if (f.life <= 0) list.splice(i, 1);
  }
}

function updateStars(world, dt) {
  for (const s of world.stars) {
    s.y += s.speed * dt;
    s.twinkle += dt * 2;
    if (s.y > CONFIG.height + 2) {
      s.y = -2;
      s.x = world.rng() * CONFIG.width;
    }
  }
}

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function comboMultiplier(world) {
  return Math.min(1 + Math.floor(world.combo / 5), CONFIG.combo.maxMultiplier);
}

export { intRange, spawnCore, burst, updateParticles };
