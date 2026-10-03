// 효과음 (v0.16 재미 패치): 외부 파일 없이 WebAudio로 합성
// SFX.play('이름', 세기) — 같은 소리는 짧은 간격 안에 겹치지 않게 제한
const SFX = {
  ctx: null, master: null, noiseBuf: null, last: {},

  // 브라우저는 첫 입력 뒤에만 소리를 허용 → 첫 키·클릭·터치에서 초기화
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.setVolume();
    const n = this.ctx.sampleRate * 0.5, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  },
  setVolume() { if (this.master) this.master.gain.value = Settings.sound ? Settings.volume * 0.5 : 0; },

  // 잡음 한 방 (총소리·타격·폭발): 대역 필터 + 빠른 감쇠
  noise(dur, freq, q, vol, type = 'bandpass', sweep = 0) {
    const c = this.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  },
  // 음 하나 (픽업·레벨업·UI)
  tone(freq, dur, vol, type = 'sine', delay = 0, slide = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },

  play(name, k = 1) {
    if (!this.ctx || !Settings.sound) return;
    const now = performance.now(), gap = { hit: 35, ehit: 50, eshot: 60, coin: 40, step: 0 }[name] ?? 25;
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const v = k;
    switch (name) {
      // 무기
      case 'pistol': this.noise(0.12, 1800, 1.2, 0.5 * v); this.tone(160, 0.08, 0.25 * v, 'square', 0, 0.5); break;
      case 'smg': this.noise(0.07, 2200, 1.4, 0.35 * v); this.tone(200, 0.05, 0.15 * v, 'square', 0, 0.5); break;
      case 'rifle': this.noise(0.11, 1500, 1.1, 0.45 * v); this.tone(120, 0.09, 0.25 * v, 'sawtooth', 0, 0.4); break;
      case 'lmg': this.noise(0.09, 1300, 1.0, 0.4 * v); this.tone(100, 0.08, 0.22 * v, 'sawtooth', 0, 0.4); break;
      case 'shotgun': this.noise(0.28, 900, 0.7, 0.75 * v, 'lowpass', 0.3); this.tone(80, 0.2, 0.4 * v, 'sine', 0, 0.4); break;
      case 'sniper': this.noise(0.4, 1100, 0.6, 0.8 * v, 'lowpass', 0.2); this.tone(70, 0.3, 0.45 * v, 'sine', 0, 0.3); break;
      case 'swing': this.noise(0.14, 700, 1.5, 0.25 * v, 'bandpass', 3); break;
      case 'empty': this.tone(1200, 0.03, 0.12, 'square'); break;
      case 'reload': this.tone(600, 0.04, 0.12, 'square'); this.tone(380, 0.05, 0.12, 'square', 0.12); break;
      // 타격
      case 'hit': this.noise(0.06, 500, 1.5, 0.3 * v, 'lowpass'); break;
      case 'crit': this.noise(0.08, 3000, 2, 0.3 * v); this.tone(1400, 0.07, 0.15 * v, 'triangle', 0, 0.6); break;
      case 'metal': this.tone(900 + Math.random() * 300, 0.08, 0.15 * v, 'triangle', 0, 0.7); break;
      case 'kill': this.noise(0.18, 350, 0.9, 0.45 * v, 'lowpass', 0.4); this.tone(140, 0.12, 0.2 * v, 'sine', 0, 0.5); break;
      case 'boom': this.noise(0.6, 600, 0.5, 0.9 * v, 'lowpass', 0.1); this.tone(55, 0.5, 0.5 * v, 'sine', 0, 0.5); break;
      // 적
      case 'eshot': this.noise(0.08, 2600, 1.6, 0.18 * v); break;
      case 'ehit': this.noise(0.1, 300, 1.0, 0.45 * v, 'lowpass'); this.tone(90, 0.1, 0.3 * v, 'sine', 0, 0.6); break; // 플레이어가 맞음
      case 'warn': this.tone(520, 0.12, 0.12 * v, 'square'); this.tone(520, 0.12, 0.12 * v, 'square', 0.16); break;
      case 'growl': this.tone(110, 0.3, 0.15 * v, 'sawtooth', 0, 0.7); break;
      case 'roar': this.tone(70, 0.9, 0.4 * v, 'sawtooth', 0, 0.5); this.noise(0.9, 300, 0.6, 0.3 * v, 'lowpass'); break;
      // 플레이어
      case 'dodge': this.noise(0.22, 900, 1.2, 0.3 * v, 'bandpass', 2.5); break;
      case 'coin': this.tone(1320, 0.06, 0.12, 'square'); this.tone(1760, 0.08, 0.1, 'square', 0.05); break;
      case 'ammo': this.tone(500, 0.05, 0.1, 'square'); break;
      case 'item': { const r = k; // 등급별 차임
        const notes = [[523], [523, 659], [523, 659, 784], [523, 659, 784, 1047], [523, 659, 784, 1047, 1319]][r] || [523];
        notes.forEach((f, i) => this.tone(f, 0.25 + r * 0.05, 0.12 + r * 0.03, 'triangle', i * 0.07)); break; }
      case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.35, 0.18, 'triangle', i * 0.08)); break;
      case 'combo': this.tone(700 + Math.min(10, k) * 60, 0.08, 0.1, 'triangle'); break;
      case 'skill': this.tone(400, 0.15, 0.15, 'sawtooth', 0, 2); break;
      case 'heal': this.tone(660, 0.2, 0.12, 'sine', 0, 1.5); this.tone(880, 0.25, 0.1, 'sine', 0.1, 1.5); break;
      case 'quest': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.3, 0.15, 'triangle', i * 0.1)); break;
      case 'ui': this.tone(900, 0.03, 0.06, 'square'); break;
    }
  },
};
for (const ev of ['keydown', 'mousedown', 'touchstart']) window.addEventListener(ev, () => SFX.unlock(), { once: false, passive: true });
