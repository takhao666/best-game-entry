// All canvas drawing for Starfall Salvage. Nothing here changes the
// world: it reads the world's state and paints one frame, including the
// parallax starfield, the ship, rocks, drones, cores, particles and the
// floating score text. Screen shake is applied here from world.shake.
import { CONFIG } from './config.js';

export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0.5) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world);
  drawCores(ctx, world);
  drawTractorBeams(ctx, world);
  drawAsteroids(ctx, world);
  drawDrones(ctx, world);
  drawEnemyBullets(ctx, world);
  drawBullets(ctx, world);
  if (world.ship.alive) drawShip(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  ctx.restore();
}

function drawBackground(ctx, world) {
  // Deep-space gradient.
  const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  grad.addColorStop(0, '#070b1d');
  grad.addColorStop(0.55, '#04060f');
  grad.addColorStop(1, '#0a0618');
  ctx.fillStyle = grad;
  ctx.fillRect(-24, -24, CONFIG.width + 48, CONFIG.height + 48);

  // Five soft nebula blobs, painted once per frame from fixed spots.
  drawNebula(ctx, 220, 160, 300, 'rgba(76, 201, 240, 0.09)');
  drawNebula(ctx, 1050, 620, 340, 'rgba(157, 120, 255, 0.10)');
  drawNebula(ctx, 900, 120, 200, 'rgba(255, 93, 115, 0.06)');
  drawNebula(ctx, 80, 620, 260, 'rgba(93, 242, 166, 0.05)');
  drawNebula(ctx, 640, 420, 420, 'rgba(76, 201, 240, 0.04)');

  // Parallax stars; the brightest ones get a little cross sparkle.
  for (const s of world.stars) {
    const tw = 0.55 + 0.45 * Math.sin(s.twinkle);
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#cfe0ff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
    if (s.size >= 1.8) {
      ctx.fillRect(s.x - 3, s.y + s.size / 2 - 0.5, 6 + s.size, 1);
      ctx.fillRect(s.x + s.size / 2 - 0.5, s.y - 3, 1, 6 + s.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawNebula(ctx, x, y, radius, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawShip(ctx, world) {
  const ship = world.ship;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  // Flicker while invulnerable after a hit.
  if (ship.invulnerable > 0 && Math.floor(world.time * 14) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }
  // Shield ring.
  if (ship.shield > 1) {
    ctx.beginPath();
    ctx.arc(0, 0, ship.radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(76, 201, 240, ${0.25 + (ship.shield / ship.maxShield) * 0.45})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Hull: a swept dart with a glowing cockpit.
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  const body = ctx.createLinearGradient(-12, 0, 20, 0);
  body.addColorStop(0, '#3d6fb4');
  body.addColorStop(1, '#9fd8ff');
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = '#dfe9ff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(6, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#5df2a6';
  ctx.shadowColor = '#5df2a6';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
  // Engine glow whenever the skiff is under thrust.
  const speed = Math.hypot(ship.vx, ship.vy);
  if (speed > 40) {
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(-12 - 10 - speed * 0.02, 0);
    ctx.lineTo(-12, 5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 179, 71, 0.85)';
    ctx.fill();
  }
  // Engine flame when dashing.
  if (ship.dashTimer > 0) {
    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-30, 0);
    ctx.lineTo(-12, 6);
    ctx.closePath();
    ctx.fillStyle = '#ffb347';
    ctx.fill();
  }
  ctx.restore();
}

function drawBullets(ctx, world) {
  ctx.save();
  ctx.lineCap = 'round';
  for (const b of world.bullets) {
    const len = Math.hypot(b.vx, b.vy) || 1;
    const nx = b.vx / len;
    const ny = b.vy / len;
    ctx.beginPath();
    ctx.moveTo(b.x - nx * 16, b.y - ny * 16);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = 10;
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemyBullets(ctx, world) {
  ctx.save();
  for (const o of world.enemyBullets) {
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff5d73';
    ctx.shadowColor = '#ff5d73';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd7dc';
    ctx.fill();
  }
  ctx.restore();
}

function drawAsteroids(ctx, world) {
  ctx.save();
  for (const a of world.asteroids) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    ctx.moveTo(a.vertices[0].x, a.vertices[0].y);
    for (let i = 1; i < a.vertices.length; i++) {
      ctx.lineTo(a.vertices[i].x, a.vertices[i].y);
    }
    ctx.closePath();
    // Big rocks read deep violet, medium ones slate, small ones pale:
    // the field's danger is visible at a glance.
    const shade = a.size === 'large' ? '#5d4a86' : a.size === 'medium' ? '#7d6ba8' : '#a08fd0';
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.strokeStyle = '#d9ccff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Sunlit crescent on the upper-left rim.
    ctx.beginPath();
    ctx.arc(0, 0, a.radius * 0.92, Math.PI * 0.9, Math.PI * 1.6);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Cracks and craters, from the same seeded vertices.
    ctx.beginPath();
    ctx.arc(-a.radius * 0.25, -a.radius * 0.2, a.radius * 0.22, 0, Math.PI * 2);
    ctx.arc(a.radius * 0.3, a.radius * 0.25, a.radius * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();
    // Health arc on damaged rocks.
    if (a.health < a.maxHealth) {
      ctx.beginPath();
      ctx.arc(0, 0, a.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * a.health) / a.maxHealth);
      ctx.strokeStyle = '#ff8fa0';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawDrones(ctx, world) {
  ctx.save();
  for (const d of world.drones) {
    ctx.save();
    ctx.translate(d.x, d.y);
    // Spinning outer ring.
    ctx.rotate(world.time * 1.5 + d.wobble);
    ctx.beginPath();
    ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#ff5d73';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * (d.radius - 3), Math.sin(a) * (d.radius - 3));
      ctx.lineTo(Math.cos(a) * (d.radius + 5), Math.sin(a) * (d.radius + 5));
    }
    ctx.stroke();
    ctx.rotate(-world.time * 1.5 - d.wobble);
    // Eye that tracks the ship.
    const ship = world.ship;
    const aim = Math.atan2(ship.y - d.y, ship.x - d.x);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#2a0a12';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.cos(aim) * 3, Math.sin(aim) * 3, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2e4d';
    ctx.shadowColor = '#ff2e4d';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    if (d.health < d.maxHealth) {
      ctx.beginPath();
      ctx.arc(0, 0, d.radius + 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * d.health) / d.maxHealth);
      ctx.strokeStyle = '#ff8fa0';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawCores(ctx, world) {
  ctx.save();
  for (const c of world.cores) {
    const blink = 0.75 + 0.25 * Math.sin(c.pulse);
    const fade = c.age > 9 ? Math.max(0.25, (12 - c.age) / 3) : 1;
    ctx.globalAlpha = blink * fade;
    const rich = c.kind === 'rich';
    const haloColor = rich ? '76, 201, 240' : '255, 209, 102';
    // Glow halo, larger for rich prism cores.
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.radius * (rich ? 4.5 : 3.5));
    g.addColorStop(0, `rgba(${haloColor}, ${rich ? 0.75 : 0.55})`);
    g.addColorStop(1, `rgba(${haloColor}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.radius * (rich ? 4.5 : 3.5), 0, Math.PI * 2);
    ctx.fill();
    // Diamond core.
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = rich ? '#4cc9f0' : '#ffd166';
    ctx.shadowColor = rich ? '#4cc9f0' : '#ffd166';
    ctx.shadowBlur = rich ? 18 : 12;
    ctx.fillRect(-c.radius * 0.7, -c.radius * 0.7, c.radius * 1.4, c.radius * 1.4);
    ctx.restore();
    // Rich cores flash a white heart and a sparkle cross.
    if (rich) {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.fillRect(c.x - 2, c.y - 2, 4, 4);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.x - c.radius * 1.6, c.y);
      ctx.lineTo(c.x + c.radius * 1.6, c.y);
      ctx.moveTo(c.x, c.y - c.radius * 1.6);
      ctx.lineTo(c.x, c.y + c.radius * 1.6);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Faint tractor lines from the skiff to cores it is pulling in: the
// salvage itself, made visible.
function drawTractorBeams(ctx, world) {
  const ship = world.ship;
  if (!ship.alive) return;
  ctx.save();
  for (const c of world.cores) {
    const d = Math.hypot(c.x - ship.x, c.y - ship.y);
    if (d < 200 && d > ship.radius + c.radius + 4) {
      const alpha = 0.28 * (1 - d / 220);
      ctx.beginPath();
      ctx.moveTo(ship.x, ship.y);
      ctx.lineTo(c.x, c.y);
      ctx.strokeStyle = c.kind === 'rich' ? `rgba(76, 201, 240, ${alpha + 0.12})` : `rgba(255, 209, 102, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawParticles(ctx, world) {
  ctx.save();
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.save();
  ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
