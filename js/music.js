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
// v1.72 음악 파일 (docs/MUSIC_PROMPTS.md · Gemini): 있는 곡만 파일로, 없는 맵은 위 합성 음악 그대로
// title = 타이틀 · camp = 캠프(바탕) · combat = 전투 층(적이 쫓아오는 만큼 커짐) · boss = 보스가 있으면 전투 층 대신
const MUSIC_FILES = { title: 'bgm_title.mp3', camp: 'bgm_camp.mp3', combat: 'bgm_combat.mp3', boss: 'bgm_boss.mp3' };
const MUSIC_XF = 2.5, MUSIC_FILE_VOL = 1.4; // 반복 이음매 겹침(초) · 합성 음악과 크기 맞춤

const Music = {
  gain: null, nextT: 0, step: 0, mood: null, moodId: '', intensity: 0, target: 0, syn: null, tracks: {},

  // ---------- v1.72 파일 곡 ----------
  track(n) { // 처음 부를 때 받아 둠 (없거나 실패하면 합성 음악)
    const c = SFX.ctx, T = this.tracks[n] || (this.tracks[n] = { buf: null, src: [], next: 0, on: false, lvl: 0 });
    if (!T.loading && MUSIC_FILES[n]) { T.loading = true; fetch('assets/music/' + MUSIC_FILES[n] + '?v=' + (typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '')).then(r => r.ok ? r.arrayBuffer() : null).then(a => a && c.decodeAudioData(a)).then(b => { if (b) T.buf = b; }).catch(() => {}); }
    if (!T.g && this.gain) { T.g = c.createGain(); T.g.gain.value = 0; T.g.connect(this.gain); }
    return T;
  },
  has(n) { const T = this.tracks[n]; return !!(T && T.buf); },
  // 곡 크기를 v 로 (0 이면 잠시 뒤 멈춤 · 다시 켜면 처음부터) · 끝나기 MUSIC_XF초 전에 다음 바퀴를 겹쳐 틂
  level(n, v) {
    const c = SFX.ctx, T = this.track(n); if (!T.buf || !T.g) return;
    if (Math.abs(v - T.lvl) > 0.001) { T.lvl = v; T.g.gain.setTargetAtTime(v * MUSIC_FILE_VOL, c.currentTime, v > 0 ? 0.6 : 0.9); }
    if (v > 0 && !T.on) { T.on = true; T.offT = 0; T.next = c.currentTime + 0.05; }
    if (v <= 0 && T.on && (T.offT = (T.offT || 0) + 1) > 240) { T.on = false; for (const s of T.src) try { s.stop(); } catch (e) { /* 이미 멈춤 */ } T.src = []; } // 약 4초 조용하면 멈춤
    if (v > 0) T.offT = 0;
    if (T.on && T.next < c.currentTime + 0.5) {
      const s = c.createBufferSource(), g = c.createGain(), t = Math.max(T.next, c.currentTime), D = T.buf.duration;
      s.buffer = T.buf; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + MUSIC_XF); g.gain.setValueAtTime(1, t + D - MUSIC_XF); g.gain.linearRampToValueAtTime(0.0001, t + D);
      s.connect(g); g.connect(T.g); s.start(t); s.stop(t + D + 0.05); s.onended = () => { T.src = T.src.filter(x => x !== s); };
      T.src.push(s); T.next = t + D - MUSIC_XF;
    }
  },
  // 타이틀 화면 (게임 루프 전): title.js 가 매 프레임 부름
  titleTick() {
    if (!SFX.ctx || !this.ensure()) return;
    this.level('title', Settings.bgm && Settings.sound ? 1 : 0); this.track('camp'); // 캠프 곡도 미리 받아 둠
  },

  ensure() {
    const c = SFX.ctx;
    if (!c) return false;
    if (!this.gain) { this.gain = c.createGain(); this.gain.connect(c.destination); this.nextT = c.currentTime + 0.3; this.syn = c.createGain(); this.syn.connect(this.gain); } // v1.72 syn = 합성 음악 (파일 곡이 나올 땐 줄임)
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
    { // v1.72 파일 곡: 캠프 = 캠프 곡 · 출격 = 합성 탐색 음악 위에 전투/보스 곡
      const inCamp = World.map === 'camp', I = this.intensity, cf = boss ? 'boss' : 'combat';
      this.level('title', 0);
      this.level('camp', inCamp ? 1 : 0);
      if (!inCamp) { this.track('combat'); this.track('boss'); }
      const fileFight = !inCamp && this.has(cf);
      this.level('combat', fileFight && cf === 'combat' ? Math.min(1, I * 1.2) : 0);
      this.level('boss', fileFight && cf === 'boss' ? Math.min(1, I * 1.2) : 0);
      this.fileFight = fileFight;
      const sv = (inCamp && this.has('camp') ? 0 : 1) * (fileFight ? 1 - 0.85 * Math.min(1, I * 1.2) : 1);
      if (Math.abs(sv - (this.synV ?? 1)) > 0.01) { this.synV = sv; this.syn.gain.setTargetAtTime(sv, c.currentTime, 0.5); }
    }
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
    // v1.29 긴장 층: 전투 전 압박 — 낮은 심장 박동(쿵-쿵) · 높으면 째깍이는 고음
    const T = G.tension || 0;
    if (T > 0.25 && I < 0.5) {
      if (step % 8 === 0) { this.kick(t, 0.16 * T); this.kick(t + eighth * 0.45, 0.1 * T); }
      if (T > 0.55 && step % 2 === 1) this.hat(t, 0.018 * T);
    }
    if (I < 0.05 || this.fileFight) return; // v1.72 전투 곡 파일이 있으면 합성 북은 안 침
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
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this.syn);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
  pluck(f, t, v) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g); g.connect(this.syn); o.start(t); o.stop(t + 0.65);
  },
  bass(f, t, dur, v) {
    const c = SFX.ctx, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.setValueAtTime(500, t); fl.frequency.exponentialRampToValueAtTime(140, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(fl); fl.connect(g); g.connect(this.syn); o.start(t); o.stop(t + dur + 0.02);
  },
  kick(t, v) {
    const c = SFX.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.syn); o.start(t); o.stop(t + 0.25);
  },
  noiseHit(t, v, type, freq, dur) {
    const c = SFX.ctx; if (!SFX.noiseBuf) return;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = SFX.noiseBuf; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.syn); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
  },
  hat(t, v) { this.noiseHit(t, v, 'highpass', 7000, 0.04); },
  snare(t, v) { this.noiseHit(t, v, 'bandpass', 1800, 0.16); },
};
