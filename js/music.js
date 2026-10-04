// 배경 음악 (v1.17): 외부 파일 없이 WebAudio로 합성. 맵마다 조성·템포·음색이 다르고, 적이 쫓아오면 전투 층이 서서히 올라옴
// 층: 패드(4마디마다 화음) · 아르페지오(듬성듬성) · 전투(베이스·킥·하이햇·스네어, 강도 0~1)
// SFX.ctx 를 같이 씀 (첫 입력 뒤에만 소리 허용). 음량: 설정 → 음악

// 맵 분위기: root = 기준 음(MIDI) · prog = 화음 진행(근음 반음 간격, minor/major) · tempo · cut = 패드 필터 · wave = 패드 파형
const MOODS = {
  camp:       { root: 48, tempo: 68, prog: [[0, 'M'], [5, 'M'], [9, 'm'], [7, 'M']], cut: 900, wave: 'triangle', arp: 0.55 },
  myeongdong: { root: 45, tempo: 84, prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']], cut: 700, wave: 'sawtooth', arp: 0.4 },
  jongno:     { root: 50, tempo: 86, prog: [[0, 'm'], [10, 'M'], [8, 'M'], [7, 'm']], cut: 650, wave: 'sawtooth', arp: 0.4 },
  yongsan:    { root: 40, tempo: 92, prog: [[0, 'm'], [1, 'M'], [0, 'm'], [10, 'm']], cut: 600, wave: 'square', arp: 0.35 },
  yeouido:    { root: 42, tempo: 80, prog: [[0, 'm'], [6, 'm'], [1, 'M'], [5, 'm']], cut: 520, wave: 'sawtooth', arp: 0.3 },
  lab:        { root: 37, tempo: 76, prog: [[0, 'm'], [1, 'M'], [6, 'm'], [0, 'm']], cut: 420, wave: 'square', arp: 0.25 },
  gangnam:    { root: 47, tempo: 98, prog: [[0, 'm'], [7, 'm'], [8, 'M'], [5, 'M']], cut: 800, wave: 'sawtooth', arp: 0.5 },
  jamsil:     { root: 43, tempo: 90, prog: [[0, 'm'], [3, 'M'], [10, 'M'], [8, 'M']], cut: 600, wave: 'sawtooth', arp: 0.4 },
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

const Music = {
  gain: null, nextT: 0, step: 0, mood: null, moodId: '', intensity: 0, target: 0,

  ensure() {
    const c = SFX.ctx;
    if (!c) return false;
    if (!this.gain) { this.gain = c.createGain(); this.gain.connect(c.destination); this.nextT = c.currentTime + 0.3; }
    this.gain.gain.value = Settings.bgm && Settings.sound ? (Settings.musicVol ?? 0.5) * 0.45 : 0;
    return true;
  },

  // 매 프레임: 분위기 · 전투 강도 → 박자보다 조금 앞서 음을 예약
  update(dt) {
    if (!G.running || !this.ensure() || !(Settings.bgm && Settings.sound)) return;
    const c = SFX.ctx, p = G.player;
    const id = MOODS[World.map] ? World.map : 'myeongdong';
    if (id !== this.moodId) { this.moodId = id; this.mood = MOODS[id]; this.step = 0; this.nextT = Math.max(this.nextT, c.currentTime + 0.1); }
    // 전투 강도: 쫓아오는 적 수 · 보스
    let n = 0, boss = false;
    if (p && !p.dead) for (const e of G.enemies) { if (e.hp <= 0 || e.state !== 'chase') continue; if (Math.abs(e.x - p.x) + Math.abs(e.y - p.y) < 900) { n++; if (e.def.boss || e.fieldBoss || e.labBoss || e.bossName) boss = true; } }
    this.target = boss ? 1 : G.assault ? 0.8 : Math.min(1, n / 4);
    this.intensity += (this.target - this.intensity) * Math.min(1, dt * (this.target > this.intensity ? 1.5 : 0.35));
    const eighth = 60 / this.mood.tempo / 2;
    if (this.nextT < c.currentTime - 0.5) this.nextT = c.currentTime + 0.05; // 탭이 멈췄다 돌아오면 다시 맞춤
    while (this.nextT < c.currentTime + 0.4) { this.play(this.step, this.nextT, eighth); this.nextT += eighth; this.step++; }
  },

  chord(step) {
    const M = this.mood, [off, q] = M.prog[Math.floor(step / 32) % M.prog.length], r = M.root + off;
    return [r, r + (q === 'm' ? 3 : 4), r + 7];
  },

  play(step, t, eighth) {
    const M = this.mood, I = this.intensity, ch = this.chord(step);
    // 패드: 4마디(32 eighth)마다 새 화음, 길게 겹침
    if (step % 32 === 0) for (const [i, m] of ch.entries()) this.pad(mtof(m + 12 * (i === 0 ? 0 : 0)), t, eighth * 32 + 1.2, M, i);
    // 아르페지오: 짝수 박에 가끔 (전투가 세지면 줄어듦)
    if (step % 2 === 0 && Math.random() < M.arp * (1 - I * 0.6)) this.pluck(mtof(pick(ch) + 12 + (Math.random() < 0.3 ? 12 : 0)), t, 0.04);
    if (I < 0.05) return;
    // 전투 층
    const root = ch[0] - 12;
    this.bass(mtof(step % 4 === 2 ? root + 12 : root), t, eighth * 0.9, 0.09 * I);
    if (step % 4 === 0) this.kick(t, 0.35 * I);
    if (step % 8 === 4) this.snare(t, 0.12 * I);
    this.hat(t, (step % 2 ? 0.025 : 0.04) * I);
    if (I > 0.7 && step % 16 === 14) this.pluck(mtof(ch[2] + 24), t, 0.05 * I); // 강할 때 높은 경고음
  },

  // ---------- 악기 ----------
  pad(f, t, dur, M, i) {
    const c = SFX.ctx, o = c.createOscillator(), o2 = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = M.wave; o2.type = M.wave; o.frequency.value = f; o2.frequency.value = f * 1.004; // 살짝 어긋나게 → 두꺼운 소리
    fl.type = 'lowpass'; fl.frequency.setValueAtTime(M.cut * 0.6, t); fl.frequency.linearRampToValueAtTime(M.cut, t + dur * 0.5); fl.frequency.linearRampToValueAtTime(M.cut * 0.6, t + dur); fl.Q.value = 2;
    const v = (i === 0 ? 0.05 : 0.035);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 1.5); g.gain.setValueAtTime(v, t + dur - 1.2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this.gain);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
  pluck(f, t, v) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.65);
  },
  bass(f, t, dur, v) {
    const c = SFX.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(140, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(this.gain); o.start(t); o.stop(t + dur + 0.02);
  },
  kick(t, v) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.25);
  },
  noiseHit(t, v, type, freq, dur) {
    const c = SFX.ctx; if (!SFX.noiseBuf) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = SFX.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.gain); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  },
  hat(t, v) { this.noiseHit(t, v, 'highpass', 7000, 0.04); },
  snare(t, v) { this.noiseHit(t, v, 'bandpass', 1800, 0.16); },
};
