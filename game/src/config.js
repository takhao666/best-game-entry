// All tuning for Starfall Salvage in one place. Every number the game
// balances on lives here, so a tweak never means hunting through logic.
export const CONFIG = {
  width: 1280,
  height: 800,
  totalWaves: 10,

  ship: {
    radius: 16,
    accel: 1500,
    maxSpeed: 340,
    drag: 2.4,
    hull: 100,
    shield: 50,
    shieldRegenDelay: 5,
    shieldRegenRate: 12,
    fireInterval: 0.16,
    bulletSpeed: 620,
    bulletDamage: 12,
    dashSpeed: 900,
    dashTime: 0.16,
    dashCooldown: 1.6,
    dashInvulnerable: 0.35,
    pickupRadius: 90,
  },

  // Enemy budgets per wave: how many of each type the wave spawns.
  waves: [
    { asteroids: 6, drones: 0 },
    { asteroids: 8, drones: 1 },
    { asteroids: 10, drones: 2 },
    { asteroids: 12, drones: 3 },
    { asteroids: 12, drones: 4 },
    { asteroids: 14, drones: 5 },
    { asteroids: 16, drones: 6 },
    { asteroids: 16, drones: 7 },
    { asteroids: 18, drones: 8 },
    { asteroids: 20, drones: 10 },
  ],

  asteroid: {
    largeRadius: 42,
    mediumRadius: 26,
    smallRadius: 14,
    largeHealth: 30,
    mediumHealth: 16,
    smallHealth: 8,
    largeScore: 40,
    mediumScore: 25,
    smallScore: 15,
    largeDamage: 22,
    mediumDamage: 15,
    smallDamage: 10,
    minSpeed: 40,
    maxSpeed: 130,
    coresDropped: { large: 3, medium: 2, small: 1 },
  },

  drone: {
    radius: 18,
    health: 26,
    score: 60,
    damage: 15,
    orbDamage: 10,
    speed: 165,
    fireInterval: 1.9,
    orbSpeed: 260,
    coresDropped: 2,
  },

  core: {
    value: 25,
    radius: 8,
    lifetime: 12,
    magnetRadius: 90,
    magnetPull: 420,
  },

  combo: {
    window: 4,
    maxMultiplier: 8,
  },

  particles: {
    explosionCount: 26,
    trailEvery: 0.02,
    maxCount: 420,
  },

  // Upgrade cards offered between waves: id, title, blurb, apply().
  upgrades: [
    { id: 'rapid', title: 'Rapid Cycler', blurb: '+30% fire rate. Your cannon cycles faster.' },
    { id: 'heavy', title: 'Heavy Rounds', blurb: '+50% bullet damage. Rocks break sooner.' },
    { id: 'split', title: 'Split Shot', blurb: '+1 projectile per shot, spread a little wider.' },
    { id: 'hull', title: 'Plated Hull', blurb: '+40 max hull and repair 40 now.' },
    { id: 'shield', title: 'Shield Coil', blurb: '+30 max shield, it recharges twice as fast.' },
    { id: 'magnet', title: 'Tractor Web', blurb: '+70% pickup radius. Cores fly to you.' },
    { id: 'dash', title: 'Ion Dash', blurb: 'Dash recharges 45% faster, dash hits harder.' },
    { id: 'thrusters', title: 'Hot Thrusters', blurb: '+25% top speed and sharper handling.' },
  ],
};
