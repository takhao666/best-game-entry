// A tiny deterministic random-number generator (mulberry32) plus the
// small helpers the game uses. Gameplay seeds it once per run, and the
// screenshot states seed it with a fixed number, so a given seed always
// plays the same field. Nothing here touches Math.random.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Float in [min, max).
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// Integer in [min, max] inclusive.
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// Pick one element of an array.
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

// A random point on a circle of the given radius around (cx, cy).
export function ringPoint(rng, cx, cy, radius) {
  const angle = rng() * Math.PI * 2;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

// Fisher-Yates shuffle that returns a new array, driven by rng.
export function shuffled(rng, array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
