// 효과음 (v0.16 재미 패치): 외부 파일 없이 WebAudio로 합성
// SFX.play('이름', 세기, 좌우) — 같은 소리는 짧은 간격 안에 겹치지 않게 제한
// v1.35 소리 패스: 울림 버스(바깥 = 긴 도시 메아리 · 실내 = 짧은 방 울림) · 좌우 위치(SFX.playAt) · 바닥별 발소리 · 무기별 장전 · UI 소리
const SFX = {
  ctx: null, master: null, bus: null, dst: null, noiseBuf: null, last: {}, sends: null,

  // 브라우저는 첫 입력 뒤에만 소리를 허용 → 첫 키·클릭·터치에서 초기화
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.connect(c.destination);
    this.setVolume();
    const n = c.sampleRate * 0.5, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // 울림: 모든 효과음 → bus → (그대로) + (도시 메아리) + (방 울림)
    this.bus = c.createGain(); this.bus.connect(this.master); this.dst = this.bus;
    this.sends = {};
    for (const [k, len, decay, tone] of [['city', 1.8, 2.6, 2400], ['room', 0.7, 3.5, 5000]]) {
      const cv = c.createConvolver(), g = c.createGain(), f = c.createBiquadFilter();
      cv.buffer = this.impulse(len, decay); f.type = 'lowpass'; f.frequency.value = tone; g.gain.value = k === 'city' ? 0.16 : 0;
      this.bus.connect(g); g.connect(f); f.connect(cv); cv.connect(this.master); this.sends[k] = g;
    }
  },
  // 잡음이 줄어드는 반향 (스테레오)
  impulse(len, decay) {
    const c = this.ctx, n = Math.floor(c.sampleRate * len), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1); }
    return b;
  },
  setVolume() { if (this.master) this.master.gain.value = Settings.sound ? Settings.volume * 0.5 : 0; },
  // 매 프레임: 실내·연구소면 방 울림, 바깥이면 도시 메아리
  env(inside, lab) {
    if (!this.sends) return;
    const t = this.ctx.currentTime;
    this.sends.city.gain.setTargetAtTime(inside || lab ? 0.02 : 0.16, t, 0.3);
    this.sends.room.gain.setTargetAtTime(lab ? 0.42 : inside ? 0.32 : 0, t, 0.3);
  },

  // 잡음 한 방 (총소리·타격·폭발): 대역 필터 + 빠른 감쇠
  noise(dur, freq, q, vol, type = 'bandpass', sweep = 0, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.dst); s.start(t, Math.random() * 0.2); s.stop(t + dur + 0.02);
  },
  // 음 하나 (픽업·레벨업·UI)
  tone(freq, dur, vol, type = 'sine', delay = 0, slide = 0) {
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.dst); o.start(t); o.stop(t + dur + 0.02);
  },
  click(vol, delay = 0, f = 3200) { this.noise(0.018, f, 3, vol, 'bandpass', 0, delay); }, // 금속 딸깍

  // 월드 위치에서 나는 소리: 거리로 작아지고 화면 좌우로 나뉨
  playAt(name, x, y, k = 1, range = 950) {
    const p = G.player; if (!p) return this.play(name, k);
    const d = Math.hypot(x - p.x, y - p.y), v = Math.pow(clamp(1 - d / range, 0, 1), 1.3);
    if (v < 0.04) return;
    this.play(name, k * v, clamp((Iso.sx(x, y) - VW / 2) / (VW / 2), -1, 1) * 0.8);
  },

  play(name, k = 1, pan = 0) {
    if (!this.ctx || !Settings.sound) return;
    const now = performance.now(), gap = { hit: 35, ehit: 50, eshot: 60, coin: 40, step: 0, growl: 260, roar: 600, shout: 300, beep: 300, estep: 70, error: 250, click: 40 }[name] ?? 25; // v1.29 적 소리는 겹치지 않게
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    let pn = null;
    if (pan && this.ctx.createStereoPanner) { pn = this.ctx.createStereoPanner(); pn.pan.value = pan; pn.connect(this.bus); this.dst = pn; }
    try { this.sound(name, k); } finally { this.dst = this.bus; }
  },
  sound(name, k) {
    const v = k, R = Math.random;
    switch (name) {
      // 무기 (v1.35: 딸깍 + 몸통 + 낮은 울림 — 꼬리는 울림 버스가 만듦)
      case 'pistol': this.click(0.25 * v, 0, 4200); this.noise(0.1, 1900, 1.3, 0.5 * v); this.tone(170, 0.07, 0.24 * v, 'square', 0, 0.45); break;
      case 'smg': this.click(0.15 * v, 0, 5000); this.noise(0.06, 2400, 1.5, 0.32 * v); this.tone(210 + R() * 20, 0.045, 0.13 * v, 'square', 0, 0.5); break;
      case 'rifle': this.click(0.22 * v, 0, 3800); this.noise(0.1, 1500, 1.1, 0.45 * v); this.noise(0.16, 380, 0.8, 0.25 * v, 'lowpass', 0.5); this.tone(115, 0.09, 0.24 * v, 'sawtooth', 0, 0.4); break;
      case 'lmg': this.click(0.18 * v, 0, 3400); this.noise(0.09, 1200, 1.0, 0.42 * v); this.noise(0.14, 300, 0.8, 0.28 * v, 'lowpass', 0.5); this.tone(95, 0.08, 0.22 * v, 'sawtooth', 0, 0.4); break;
      case 'shotgun': this.noise(0.3, 900, 0.7, 0.75 * v, 'lowpass', 0.3); this.tone(78, 0.22, 0.42 * v, 'sine', 0, 0.4);
        this.noise(0.05, 1400, 2, 0.16 * v, 'bandpass', 0, 0.34); this.noise(0.06, 900, 2, 0.18 * v, 'bandpass', 0, 0.44); break; // 펌프 착-칵
      case 'sniper': this.click(0.3 * v, 0, 5200); this.noise(0.45, 1100, 0.6, 0.8 * v, 'lowpass', 0.2); this.tone(68, 0.32, 0.45 * v, 'sine', 0, 0.3);
        this.click(0.12 * v, 0.55, 2400); this.click(0.12 * v, 0.72, 3000); break; // 노리쇠
      case 'swing': this.noise(0.14, 700, 1.5, 0.25 * v, 'bandpass', 3); break;
      case 'swing_pipe': this.noise(0.16, 520, 1.6, 0.27 * v, 'bandpass', 2.6); break;
      case 'swing_axe': this.noise(0.22, 360, 1.4, 0.33 * v, 'bandpass', 2.4); this.tone(70, 0.12, 0.12 * v, 'sine', 0.04, 0.6); break;
      case 'swing_katana': this.noise(0.12, 1600, 2.2, 0.22 * v, 'bandpass', 2.2); this.tone(2600, 0.18, 0.04 * v, 'sine', 0.02, 1.15); break; // 날카로운 쉬익 + 칼날 울림
      case 'heavy': this.noise(0.22, 420, 1.2, 0.4 * v, 'bandpass', 2.5); this.tone(90, 0.18, 0.3 * v, 'sine', 0.05, 0.5); break; // v1.9 근접 마무리
      // v1.29 적 반응 (처음 알아챔) · 발소리
      case 'growl': this.noise(0.45, 260, 0.6, 0.35 * v, 'lowpass', 0.5); this.tone(95 + R() * 30, 0.4, 0.22 * v, 'sawtooth', 0, 0.55); break; // 감염체: 낮은 울음
      case 'roar': this.noise(0.7, 200, 0.5, 0.5 * v, 'lowpass', 0.4); this.tone(70, 0.6, 0.35 * v, 'sawtooth', 0, 0.5); break; // 덩치·네임드
      case 'shout': this.tone(330 + R() * 60, 0.09, 0.14 * v, 'square', 0, 0.85); this.tone(260, 0.12, 0.12 * v, 'square', 0.1, 0.8); break; // 약탈자·용병: 짧은 외침
      case 'beep': this.tone(1500, 0.06, 0.12 * v, 'square'); this.tone(1900, 0.08, 0.12 * v, 'square', 0.09); break; // 기계: 경보음
      case 'estep': this.noise(0.05, 180, 1.2, 0.12 * v, 'lowpass'); break;
      case 'casing': this.tone(2600 + R() * 900, 0.03, 0.06 * v, 'triangle', 0, 0.8); this.tone(3400 + R() * 600, 0.025, 0.04 * v, 'triangle', 0.05, 0.8); break; // v1.28 탄피 떨어지는 소리
      case 'hitmark': this.tone(2400, 0.025, 0.07 * v, 'square'); break; // v1.28 명중 확인
      case 'empty': this.click(0.16, 0, 2600); this.tone(1200, 0.03, 0.08, 'square'); break;
      case 'reload': this.click(0.14, 0, 2200); this.click(0.14, 0.12, 3000); break;
      // 타격
      case 'hit': this.noise(0.06, 500, 1.5, 0.3 * v, 'lowpass'); break;
      case 'crit': this.noise(0.08, 3000, 2, 0.3 * v); this.tone(1400, 0.07, 0.15 * v, 'triangle', 0, 0.6); break;
      case 'metal': this.tone(900 + R() * 300, 0.08, 0.15 * v, 'triangle', 0, 0.7); this.tone(2300 + R() * 400, 0.2, 0.04 * v, 'sine', 0.01, 0.98); break; // 쇳소리 + 잔향
      case 'kill': this.noise(0.18, 350, 0.9, 0.45 * v, 'lowpass', 0.4); this.tone(140, 0.12, 0.2 * v, 'sine', 0, 0.5); break;
      case 'boom': this.noise(0.6, 600, 0.5, 0.9 * v, 'lowpass', 0.1); this.tone(55, 0.5, 0.5 * v, 'sine', 0, 0.5); this.noise(0.9, 160, 0.5, 0.3 * v, 'lowpass', 0.6, 0.08); break; // 낮은 굉음 꼬리
      // 적
      case 'eshot': this.noise(0.08, 2600, 1.6, 0.18 * v); this.tone(150, 0.05, 0.06 * v, 'square', 0, 0.5); break;
      case 'ehit': this.noise(0.1, 300, 1.0, 0.45 * v, 'lowpass'); this.tone(90, 0.1, 0.3 * v, 'sine', 0, 0.6); break; // 플레이어가 맞음
      case 'warn': this.tone(520, 0.12, 0.12 * v, 'square'); this.tone(520, 0.12, 0.12 * v, 'square', 0.16); break;
      // 플레이어
      case 'dodge': this.noise(0.38, 700, 0.9, 0.3 * v, 'bandpass', 0.5); this.noise(0.3, 2400, 1.2, 0.08 * v, 'highpass'); break; // v1.33 슬라이딩: 바닥 긁는 소리
      case 'coin': this.tone(1320, 0.06, 0.12, 'square'); this.tone(1760, 0.08, 0.1, 'square', 0.05); break;
      case 'ammo': this.click(0.12, 0, 2600); this.click(0.1, 0.05, 3400); break;
      case 'item': { const r = k; // 등급별 차임
        const notes = [[523], [523, 659], [523, 659, 784], [523, 659, 784, 1047], [523, 659, 784, 1047, 1319]][r] || [523];
        notes.forEach((f, i) => this.tone(f, 0.25 + r * 0.05, 0.12 + r * 0.03, 'triangle', i * 0.07)); break; }
      case 'legend': { // v1.7.1 전설 드랍: 낮은 울림 + 높이 올라가는 반짝임
        this.tone(130, 0.9, 0.25, 'sine', 0, 0.5);
        [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.4, 0.14, 'triangle', 0.05 + i * 0.06));
        [2637, 3136].forEach((f, i) => this.tone(f, 0.6, 0.06, 'sine', 0.5 + i * 0.12)); break; }
      case 'levelup': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.35, 0.18, 'triangle', i * 0.08)); break;
      case 'combo': this.tone(700 + Math.min(10, k) * 60, 0.08, 0.1, 'triangle'); break;
      case 'skill': this.tone(400, 0.15, 0.15, 'sawtooth', 0, 2); break;
      case 'heal': this.tone(660, 0.2, 0.12, 'sine', 0, 1.5); this.tone(880, 0.25, 0.1, 'sine', 0.1, 1.5); break;
      case 'quest': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.3, 0.15, 'triangle', i * 0.1)); break;
      case 'heart': this.tone(62, 0.12, 0.35, 'sine', 0, 0.6); this.tone(55, 0.14, 0.28, 'sine', 0.16, 0.6); break; // v1.17 저체력
      // v1.35 UI
      case 'ui': this.tone(900, 0.03, 0.06, 'square'); break;
      case 'click': this.tone(1250, 0.02, 0.04, 'triangle'); break;
      case 'open': this.noise(0.12, 1400, 1.2, 0.07, 'bandpass', 1.8); this.tone(520, 0.06, 0.05, 'triangle', 0.02, 1.4); break; // 창 열림: 종이 펄럭 + 위로
      case 'close': this.noise(0.1, 1600, 1.2, 0.06, 'bandpass', 0.6); this.tone(620, 0.06, 0.04, 'triangle', 0, 0.7); break;
      case 'error': this.tone(180, 0.12, 0.1, 'square', 0, 0.9); this.tone(150, 0.14, 0.09, 'square', 0.1, 0.9); break; // 낮은 삐-삐
      case 'equip': this.click(0.14, 0, 1800); this.noise(0.12, 600, 1.2, 0.12, 'bandpass', 0.6, 0.03); this.click(0.1, 0.1, 2600); break; // 장비 철컥
      case 'buy': this.tone(1320, 0.06, 0.1, 'square'); this.tone(1760, 0.08, 0.09, 'square', 0.05); this.click(0.1, 0.12, 2000); break;
    }
  },

  // v1.35 무기별 장전 (재장전 시간 dur에 맞춰 예약)
  reload(key, dur) {
    if (!this.ctx || !Settings.sound) return;
    const d = dur || 1.5;
    if (key === 'shotgun') { const n = Math.max(2, Math.round(d / 0.32)); for (let i = 0; i < n; i++) { this.click(0.12, 0.15 + i * (d - 0.4) / n, 1600); this.noise(0.05, 700, 1.5, 0.08, 'bandpass', 0, 0.17 + i * (d - 0.4) / n); } this.noise(0.05, 1400, 2, 0.15, 'bandpass', 0, d - 0.18); this.noise(0.06, 900, 2, 0.16, 'bandpass', 0, d - 0.08); return; } // 한 발씩 넣고 펌프
    if (key === 'sniper') { this.click(0.16, 0.05, 2400); this.click(0.14, d * 0.45, 1800); this.click(0.15, d * 0.7, 2200); this.click(0.18, d - 0.12, 3000); return; } // 노리쇠 뒤로 · 탄창 · 노리쇠 앞으로
    if (key === 'lmg') { this.click(0.16, 0.08, 1500); this.noise(0.18, 500, 1, 0.12, 'bandpass', 0.6, d * 0.35); this.noise(0.1, 1200, 1.5, 0.1, 'bandpass', 0, d * 0.65); this.click(0.2, d - 0.15, 2000); return; } // 덮개 · 탄띠 · 덮개 닫음
    // 탄창 빼기 → 넣기 → (권총 슬라이드 / 소총·기관단총 장전 손잡이)
    this.click(0.14, 0.06, 2200); this.noise(0.05, 800, 1.5, 0.06, 'bandpass', 0, 0.1);
    this.click(0.17, d * 0.62, 2800); this.click(0.18, d - 0.12, key === 'pistol' ? 3600 : 2400);
  },

  // v1.35 바닥별 발소리
  step(surf, k = 1, pan = 0) {
    if (!this.ctx || !Settings.sound) return;
    let pn = null;
    if (pan && this.ctx.createStereoPanner) { pn = this.ctx.createStereoPanner(); pn.pan.value = pan; pn.connect(this.bus); this.dst = pn; }
    const v = k * (0.85 + Math.random() * 0.3), f = 0.9 + Math.random() * 0.2;
    try {
      switch (surf) {
        case 'asphalt': this.noise(0.05, 260 * f, 1.0, 0.12 * v, 'lowpass'); this.noise(0.025, 1800 * f, 1.5, 0.03 * v); break;
        case 'concrete': this.noise(0.04, 400 * f, 1.2, 0.11 * v, 'lowpass'); this.click(0.04 * v, 0, 2400 * f); break;
        case 'gravel': for (let i = 0; i < 3; i++) this.noise(0.03, 1600 * f + i * 400, 2, 0.06 * v, 'bandpass', 0, i * 0.018); this.noise(0.05, 300, 1, 0.07 * v, 'lowpass'); break;
        case 'grass': this.noise(0.09, 2600 * f, 0.8, 0.045 * v, 'highpass', 0.6); this.noise(0.04, 200, 1, 0.05 * v, 'lowpass'); break;
        case 'water': this.noise(0.14, 900 * f, 1.2, 0.1 * v, 'bandpass', 0.5); this.tone(380 * f, 0.08, 0.025 * v, 'sine', 0.02, 1.6); break; // 첨벙
        case 'wood': this.noise(0.05, 220 * f, 1.4, 0.13 * v, 'lowpass'); this.tone(150 * f, 0.05, 0.05 * v, 'sine', 0, 0.8); break; // 나무 바닥 쿵
        case 'carpet': this.noise(0.05, 220 * f, 1, 0.06 * v, 'lowpass'); break;
        case 'metal': this.noise(0.04, 300 * f, 1.2, 0.1 * v, 'lowpass'); this.tone(1100 * f, 0.07, 0.025 * v, 'triangle', 0, 0.95); break; // 연구소 철판
        default: this.noise(0.035, 600 * f, 1.3, 0.1 * v, 'lowpass'); this.click(0.05 * v, 0, 3200 * f); // 타일
      }
    } finally { this.dst = this.bus; }
  },
};
for (const ev of ['keydown', 'mousedown', 'touchstart']) window.addEventListener(ev, () => SFX.unlock(), { once: false, passive: true });
// v1.35 UI 버튼 소리 (게임 안 모든 버튼)
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button, .btn, .map-row.go, .map-row.cx, .hot, .tab'); if (b) SFX.play('click'); }, true);
