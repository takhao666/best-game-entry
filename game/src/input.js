// Keyboard and mouse state for the game. The rest of the code never
// touches DOM events directly: it reads this snapshot once per tick.
// Coordinates are in the canvas's own 1280x800 space, converted from the
// element's bounding box so the game plays the same at any window size.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = 640;
    this.mouseY = 300;
    this.mouseDown = false;
    this.pressed = new Set();
    this._attach();
  }

  _attach() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(key);
      this.keys.add(key);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * 800;
    });
    this.canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) this.mouseDown = true;
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  // True while the key is held down.
  down(...names) {
    return names.some((name) => this.keys.has(name));
  }

  // True only on the tick after the key went down; call once per tick.
  wasPressed(...names) {
    return names.some((name) => this.pressed.has(name));
  }

  // Movement vector from WASD / arrows, normalised.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('a', 'arrowleft')) x -= 1;
    if (this.down('d', 'arrowright')) x += 1;
    if (this.down('w', 'arrowup')) y -= 1;
    if (this.down('s', 'arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const len = Math.hypot(x, y);
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  // Clear the edge-triggered set at the end of each tick.
  endTick() {
    this.pressed.clear();
  }
}
