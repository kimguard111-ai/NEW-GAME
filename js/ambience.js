// v1.35 환경음 · 발소리: 맵마다 깔리는 바람/웅웅거림 + 가끔 들리는 먼 소리 (먼 총성 · 사이렌 · 까마귀 …)
// 외부 파일 없이 SFX.ctx 로 합성. 실내에선 바깥 소리가 막혀 먹먹해짐 (저역 통과)
const AMBIENT = {
  camp:       { wind: 0.18, fire: 1.2, radio: 0.5, insects: 0.6 },
  myeongdong: { wind: 0.4, moan: 0.8, crow: 0.7, creak: 0.6, gun: 0.2 },
  jongno:     { wind: 0.4, gun: 0.7, dog: 0.7, creak: 0.5 },
  yongsan:    { wind: 0.35, gun: 1.2, siren: 0.6, heli: 0.3 },
  yeouido:    { wind: 0.6, geiger: 1.4, drone: 0.5, siren: 0.3 },
  lab:        { hum: 1, drip: 1.2, alarm: 0.5 },
  gangnam:    { wind: 0.55, heli: 0.8, siren: 0.6, glass: 0.6, gun: 0.4 },
  jamsil:     { wind: 0.3, water: 1, insects: 0.8, roar: 0.6 },
};

const Ambience = {
  out: null, lp: null, wind: null, windF: null, hum: null, mapId: '', timers: {}, inside: 0,

  ensure() {
    const c = SFX.ctx; if (!c || !SFX.master) return false;
    if (!this.out) {
      this.out = c.createGain(); this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 18000;
      this.out.connect(this.lp); this.lp.connect(SFX.master);
      // 바람: 잡음 반복 → 천천히 흔들리는 저역 통과
      const n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let last = 0;
      for (let i = 0; i < n; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.15; d[i] = last; } // 갈색 잡음
      const s = c.createBufferSource(); s.buffer = b; s.loop = true;
      this.windF = c.createBiquadFilter(); this.windF.type = 'lowpass'; this.windF.frequency.value = 500; this.windF.Q.value = 2;
      this.wind = c.createGain(); this.wind.gain.value = 0;
      s.connect(this.windF); this.windF.connect(this.wind); this.wind.connect(this.out); s.start();
      // 웅웅거림 (연구소 · 방사능 지대): 낮은 두 음
      this.hum = c.createGain(); this.hum.gain.value = 0; this.hum.connect(this.out);
      for (const [f, t] of [[55, 'sawtooth'], [110.6, 'sine']]) { const o = c.createOscillator(), fl = c.createBiquadFilter(); o.type = t; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = 240; o.connect(fl); fl.connect(this.hum); o.start(); }
    }
    return true;
  },

  update(dt) {
    if (!G.running || !Settings.sound || !this.ensure()) return;
    if (Settings.ambient === false) { this.out.gain.setTargetAtTime(0, SFX.ctx.currentTime, 0.2); SFX.env(!!G.inside, !!(World.def && World.def.lab)); return; } // v1.37 끔
    const c = SFX.ctx, t = c.currentTime, A = AMBIENT[World.map] || AMBIENT.myeongdong, lab = !!(World.def && World.def.lab);
    if (this.mapId !== World.map) { this.mapId = World.map; this.timers = {}; }
    const inside = !!G.inside;
    SFX.env(inside, lab);
    this.out.gain.setTargetAtTime(0.8, t, 0.5); // 음량은 SFX.master 가 설정대로
    this.lp.frequency.setTargetAtTime(inside ? 700 : 18000, t, 0.25); // 실내: 바깥 소리가 벽에 막힘
    if (!this.windFile && SFX.bufs.amb_wind) { this.windFile = true; const s = c.createBufferSource(); s.buffer = SFX.bufs.amb_wind[0]; s.loop = true; s.connect(this.wind); s.start(); this.windF.disconnect(); } // v1.40 바람 녹음이 있으면 그것을 반복
    this.wind.gain.setTargetAtTime((A.wind || 0) * 0.5 * (inside ? 0.5 : 1), t, 1.2);
    this.windF.frequency.setTargetAtTime(380 + Math.sin(G.time * 0.23) * 160 + Math.sin(G.time * 0.71) * 90, t, 0.4); // 바람이 일었다 잦아듦
    this.hum.gain.setTargetAtTime((A.hum ? 0.05 : A.drone ? 0.025 * A.drone : 0), t, 1);
    // 가끔 들리는 먼 소리
    for (const k of Object.keys(A)) {
      if (!this[k + 'Fx']) continue;
      const rate = A[k]; if (this.timers[k] === undefined) this.timers[k] = rand(2, 10) / rate;
      if ((this.timers[k] -= dt) <= 0) { this.timers[k] = rand(...(this.gap[k] || [8, 20])) / rate; this.with(rand(-0.8, 0.8), () => SFX.playFile('amb_' + k, 0.6) || this[k + 'Fx'](c)); } // v1.40 파일이 있으면 그 소리
    }
  },
  gap: { gun: [10, 26], siren: [25, 50], crow: [12, 30], moan: [9, 22], creak: [12, 28], dog: [14, 30], geiger: [1.5, 5], drip: [1.5, 5], alarm: [16, 34], heli: [30, 60], glass: [14, 30], water: [3, 7], insects: [6, 12], roar: [18, 36], fire: [0.3, 1.2], radio: [10, 24] },
  // 좌우 위치 정해서 SFX 합성 함수로 그리기 (SFX.dst 를 잠깐 바꿈)
  with(pan, fn) {
    const c = SFX.ctx, pn = c.createStereoPanner ? c.createStereoPanner() : null;
    if (pn) { pn.pan.value = pan; pn.connect(this.out); SFX.dst = pn; } else SFX.dst = this.out;
    try { fn(); } finally { SFX.dst = SFX.bus; }
  },
  // ---------- 먼 소리 ----------
  gunFx() { const n = randInt(1, 5), auto = Math.random() < 0.5; for (let i = 0; i < n; i++) SFX.noise(0.12, 700, 0.8, 0.09 * rand(0.6, 1), 'lowpass', 0.4, i * (auto ? 0.09 : rand(0.3, 0.9))); },
  sirenFx(c) { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime; o.type = 'triangle'; o.frequency.setValueAtTime(600, t); for (let i = 0; i < 4; i++) { o.frequency.linearRampToValueAtTime(880, t + i * 2 + 1); o.frequency.linearRampToValueAtTime(600, t + i * 2 + 2); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + 1.5); g.gain.linearRampToValueAtTime(0.0001, t + 8); o.connect(g); g.connect(SFX.dst); o.start(t); o.stop(t + 8.1); },
  crowFx() { const n = randInt(2, 3); for (let i = 0; i < n; i++) { SFX.tone(1100 + rand(-80, 80), 0.16, 0.025, 'sawtooth', i * 0.3, 0.75); SFX.noise(0.12, 1500, 2, 0.02, 'bandpass', 0.7, i * 0.3); } },
  moanFx() { SFX.tone(rand(120, 160), 1.3, 0.03, 'sawtooth', 0, 0.7); SFX.noise(1.1, 300, 1, 0.025, 'lowpass', 0.6); },
  creakFx() { SFX.tone(rand(70, 110), 1.6, 0.025, 'sawtooth', 0, rand(1.2, 1.6)); SFX.noise(1.2, 1200, 6, 0.012, 'bandpass', 1.3); },
  dogFx() { const n = randInt(2, 4); for (let i = 0; i < n; i++) { SFX.noise(0.1, 700, 1.4, 0.04, 'bandpass', 0.6, i * 0.32); SFX.tone(420, 0.08, 0.02, 'sawtooth', i * 0.32, 0.6); } },
  geigerFx() { const n = randInt(3, 14), sp = rand(0.03, 0.12); for (let i = 0; i < n; i++) SFX.click(0.05 * rand(0.5, 1), i * sp * rand(0.4, 1.6), 3800); }, // 방사능 계측기
  dripFx() { SFX.tone(rand(1400, 2200), 0.12, 0.03, 'sine', 0, 0.55); },
  alarmFx() { for (let i = 0; i < 4; i++) SFX.tone(980, 0.25, 0.018, 'square', i * 0.5); },
  heliFx(c) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), t = c.currentTime; // 프로펠러 툭툭툭
    s.buffer = SFX.noiseBuf; s.loop = true; f.type = 'lowpass'; f.frequency.value = 260; lfo.frequency.value = 11; lg.gain.value = 0.025;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 3); g.gain.linearRampToValueAtTime(0.0001, t + 9);
    lfo.connect(lg); lg.connect(g.gain); s.connect(f); f.connect(g); g.connect(SFX.dst); s.start(t); lfo.start(t); s.stop(t + 9.1); lfo.stop(t + 9.1); },
  glassFx() { for (let i = 0; i < randInt(3, 6); i++) SFX.tone(rand(2800, 4800), 0.15, 0.015, 'triangle', i * rand(0.04, 0.1), 0.97); },
  waterFx() { SFX.noise(0.9, 500, 0.8, 0.035, 'lowpass', 1.6); },
  insectsFx() { for (let i = 0; i < 6; i++) SFX.tone(4200 + rand(-200, 200), 0.05, 0.008, 'sine', i * 0.07); },
  roarFx() { SFX.tone(rand(60, 80), 1.4, 0.04, 'sawtooth', 0, 0.6); SFX.noise(1.2, 220, 0.6, 0.04, 'lowpass', 0.5); },
  fireFx() { SFX.click(0.03 * rand(0.4, 1), 0, rand(1500, 3500)); if (Math.random() < 0.3) SFX.noise(0.3, 400, 0.7, 0.015, 'lowpass'); }, // 캠프 모닥불 탁탁
  radioFx() { SFX.noise(0.6, 1800, 3, 0.02, 'bandpass', 0.8); for (let i = 0; i < 3; i++) SFX.tone(rand(300, 600), 0.08, 0.01, 'square', 0.1 + i * 0.15); }, // 무전 잡음

  // ---------- 발소리 ----------
  surface(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE), t = World.tileAt(tx, ty);
    if (t === T.WATER) return 'water';
    if (t === T.GRASS) return 'grass';
    if (t === T.RUBBLE || t === T.LANDMARK || t === T.CAMP) return 'gravel';
    if (t === T.LFLOOR || t === T.LPROP) return 'metal';
    if (t === T.FLOOR || t === T.DOOR || t === T.PROP) { const b = G.inside, fl = b && ART.shopArt[b.name] && ART.shopArt[b.name].floor; return fl === 'fl_wood' ? 'wood' : fl === 'fl_carpet' ? 'carpet' : fl === 'fl_concrete' ? 'concrete' : 'tile'; }
    if (t === T.ROAD || t === T.CAR) return 'asphalt';
    return 'concrete';
  },
  playerStep(p, dt, moving) {
    if (!moving) { p.stepT = Math.min(p.stepT || 0, 0.08); return; }
    if ((p.stepT = (p.stepT || 0) - dt * PlayerStats.speed(p) / 88) > 0) return;
    p.stepT = 0.38; SFX.step(this.surface(p.x, p.y), 0.55);
  },
};
