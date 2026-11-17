// Synthesised sound effects through the Web Audio API: no audio files,
// everything is an oscillator or a short noise buffer built in code.
// The game creates one SoundBank; calling a method is a no-op until the
// player has interacted (browsers block audio before a gesture), and the
// mute toggle silences it without tearing the graph down.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Call from a user gesture (start button, first keypress) to unlock audio.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.32;
  }

  // One oscillator blip: frequency slides from `from` to `to` over `dur`.
  blip({ from = 440, to = 220, dur = 0.08, type = 'square', gain = 0.5 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // A burst of filtered noise, for explosions and impacts.
  noise({ dur = 0.3, gain = 0.6, cutoff = 1200 }) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t);
  }

  shoot() {
    this.blip({ from: 880, to: 320, dur: 0.07, type: 'square', gain: 0.22 });
  }

  explosion(big) {
    this.noise({ dur: big ? 0.5 : 0.28, gain: big ? 0.7 : 0.45, cutoff: big ? 900 : 1600 });
    this.blip({ from: 160, to: 40, dur: big ? 0.4 : 0.22, type: 'sine', gain: 0.5 });
  }

  pickup(combo) {
    const base = 520 + Math.min(combo, 8) * 60;
    this.blip({ from: base, to: base * 1.6, dur: 0.09, type: 'sine', gain: 0.4 });
  }

  hurt() {
    this.blip({ from: 220, to: 70, dur: 0.18, type: 'sawtooth', gain: 0.5 });
    this.noise({ dur: 0.15, gain: 0.3, cutoff: 700 });
  }

  dash() {
    this.noise({ dur: 0.18, gain: 0.25, cutoff: 3200 });
  }

  waveHorn() {
    this.blip({ from: 196, to: 392, dur: 0.35, type: 'triangle', gain: 0.45 });
  }

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      window.setTimeout(() => {
        this.blip({ from: freq, to: freq, dur: 0.22, type: 'triangle', gain: 0.4 });
      }, i * 130);
    });
  }

  gameOver() {
    const notes = [392, 330, 262, 196];
    notes.forEach((freq, i) => {
      window.setTimeout(() => {
        this.blip({ from: freq, to: freq * 0.94, dur: 0.3, type: 'sawtooth', gain: 0.3 });
      }, i * 170);
    });
  }
}
