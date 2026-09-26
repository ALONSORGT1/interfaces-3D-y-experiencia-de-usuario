// Short original sounds synthesized in the browser. No audio downloads or autoplay.
export class Audio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.lastImpact = 0;
  }
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.context ??= new (window.AudioContext || window.webkitAudioContext)();
      this.context.resume();
      this.play("bonus");
    }
    return this.enabled;
  }
  tone(frequency, duration, type = "sine", volume = 0.08, delay = 0) {
    if (!this.enabled || !this.context) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain(),
      start = c.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(frequency, start);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(40, frequency * 0.65),
      start + duration,
    );
    g.gain.setValueAtTime(volume, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + duration);
    o.connect(g);
    g.connect(c.destination);
    o.start(start);
    o.stop(start + duration);
  }
  play(kind) {
    if (kind === "throw") {
      this.tone(160, 0.2, "triangle", 0.12);
      return;
    }
    if (kind === "impact") {
      const now = performance.now();
      if (now - this.lastImpact < 80) return;
      this.lastImpact = now;
      this.tone(90, 0.09, "triangle", 0.13);
      return;
    }
    if (kind === "penalty") {
      this.tone(180, 0.3, "sawtooth", 0.035);
      return;
    }
    if (kind === "bonus") {
      this.tone(660, 0.16);
      this.tone(880, 0.2, "sine", 0.06, 0.08);
      return;
    }
    if (kind === "win") {
      [440, 554, 659, 880].forEach((n, i) =>
        this.tone(n, 0.4, "triangle", 0.1, i * 0.13),
      );
      return;
    }
    if (kind === "lose") {
      [330, 277, 220].forEach((n, i) =>
        this.tone(n, 0.3, "triangle", 0.07, i * 0.16),
      );
    }
  }
}
