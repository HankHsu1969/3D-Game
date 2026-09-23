// All sounds are synthesised with the Web Audio API, so there are no audio
// files to load: wooden clacks for tiles, bell chimes for matches, and a
// plucked pentatonic (guzheng-like) melody for background music.

const PENTA = [0, 2, 4, 7, 9]; // gong shang jue zhi yu

export class Sound {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = false;
    this.musicTimer = null;
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      // a short synthetic reverb gives everything a palace-hall feel
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.impulse(2.2);
      const wet = this.ctx.createGain();
      wet.gain.value = 0.28;
      this.reverb.connect(wet).connect(this.master);
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.noise(0.5);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  impulse(sec) {
    const rate = this.ctx.sampleRate, len = rate * sec;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  noise(sec) {
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  out(node, wet = true) {
    node.connect(this.master);
    if (wet) node.connect(this.reverb);
  }

  midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // Wooden "clack" of a tile being picked up.
  click(pitch = 1) {
    if (!this.sfxOn) return;
    const ctx = this.ensure(), t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400 * pitch;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(bp).connect(g);
    this.out(g, false);
    src.start(t);
    src.stop(t + 0.1);

    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(900 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(420 * pitch, t + 0.05);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.25, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(og);
    this.out(og, false);
    o.start(t);
    o.stop(t + 0.1);
  }

  bell(freq, t, dur = 1.2, vol = 0.25) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.out(g);
    // inharmonic partials make it read as a metal bell
    for (const [ratio, amp] of [[1, 1], [2.76, 0.4], [5.4, 0.18]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq * ratio;
      const pg = ctx.createGain();
      pg.gain.value = amp;
      o.connect(pg).connect(g);
      o.start(t);
      o.stop(t + dur);
    }
  }

  match(combo = 0) {
    if (!this.sfxOn) return;
    const ctx = this.ensure(), t = ctx.currentTime;
    const root = 72 + Math.min(combo, 6) * 2;
    this.click(1.2);
    this.bell(this.midi(root), t + 0.03, 1.4, 0.22);
    this.bell(this.midi(root + 7), t + 0.11, 1.6, 0.18);
    this.bell(this.midi(root + 12), t + 0.19, 1.8, 0.14);
  }

  error() {
    if (!this.sfxOn) return;
    const ctx = this.ensure(), t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(90, t + 0.22);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(lp).connect(g);
    this.out(g, false);
    o.start(t);
    o.stop(t + 0.3);
  }

  hint() {
    if (!this.sfxOn) return;
    const ctx = this.ensure(), t = ctx.currentTime;
    this.bell(this.midi(84), t, 0.8, 0.12);
    this.bell(this.midi(88), t + 0.12, 0.8, 0.12);
  }

  shuffle() {
    if (!this.sfxOn) return;
    this.ensure();
    for (let i = 0; i < 14; i++) setTimeout(() => this.click(0.7 + Math.random() * 0.8), i * 38);
  }

  win() {
    if (!this.sfxOn) return;
    const ctx = this.ensure(), t = ctx.currentTime;
    const notes = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
    notes.forEach((n, i) => this.pluck(this.midi(64 + n), t + i * 0.09, 0.3));
    [64, 71, 76].forEach((m, i) => this.bell(this.midi(m + 12), t + 1.05 + i * 0.02, 3, 0.16));
  }

  // Karplus-Strong style pluck rendered into a buffer.
  pluck(freq, t, vol = 0.25) {
    const ctx = this.ctx, rate = ctx.sampleRate;
    const dur = 1.8, len = Math.floor(rate * dur);
    const buf = ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    const period = Math.max(2, Math.floor(rate / freq));
    for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
    for (let i = period; i < len; i++) d[i] = (d[i - period] + d[i - period + 1]) * 0.4985;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    this.out(g);
    src.start(t);
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    if (this.musicOn) this.startMusic(); else this.stopMusic();
    return this.musicOn;
  }

  startMusic() {
    this.ensure();
    this.stopMusic();
    let step = 0, prev = 2;
    const tick = () => {
      const ctx = this.ctx, t = ctx.currentTime + 0.05;
      // wandering pentatonic melody over a slow drone
      if (step % 8 === 0) this.pluck(this.midi(45 + (step % 32 === 16 ? 5 : 0)), t, 0.16);
      if (Math.random() < 0.72) {
        prev = Math.max(0, Math.min(9, prev + Math.round((Math.random() - 0.5) * 3)));
        const oct = Math.floor(prev / 5), deg = PENTA[prev % 5];
        this.pluck(this.midi(62 + oct * 12 + deg), t, 0.12);
        if (Math.random() < 0.15) this.pluck(this.midi(62 + oct * 12 + deg), t + 0.12, 0.07);
      }
      step++;
    };
    tick();
    this.musicTimer = setInterval(tick, 520);
  }

  stopMusic() {
    clearInterval(this.musicTimer);
    this.musicTimer = null;
  }
}
