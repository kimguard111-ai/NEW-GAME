// 설정 (v0.15): 기기 저장, 저사양·모바일용 옵션
const Settings = {
  light: true,   // 조명 효과 (끄면 단순 어둠 — 가벼움)
  shake: true,   // 화면 흔들림 (v1.90부터 shakeAmt > 0 과 같음)
  shakeAmt: IS_TOUCH ? 0.7 : 1, // v1.90 흔들림 세기 0~1 (폰은 작은 화면이라 기본 70%)
  vibrate: true, // v1.90 폰 진동
  camLead: true, // v1.28 조준 방향으로 시야 내밀기
  rmbAim: true,  // v1.49.9 PC 오른쪽 클릭 = 조준 (끄면 예전처럼 회피)
  dmgNum: true,  // 피해 숫자
  detail: true,  // v1.11 세부 묘사 (옥상 난간·물탱크 · 1층 셔터 · 도로 마모 · 차 디테일)
  tips: true,    // 도움말 팁 (v1.0)
  sound: true,   // 효과음 (v0.16)
  bgm: true,     // v1.17 배경 음악
  musicVol: 0.5,
  volume: 0.7,
  reverb: !(('ontouchstart' in window) || navigator.maxTouchPoints > 0), // v1.37 울림 (모바일은 기본 끔 — CPU)
  ambient: true, // v1.37 환경음
  xray: true,    // v1.37 건물에 가려진 적 투시 윤곽
  outline: true, // v1.46 적 붉은 윤곽선 · 발밑 고리
  mip: true,     // v1.49 그림 축소 캐시 (끄면 원본을 매번 줄여 그림 — 문제 확인용)
  keys: null,    // v1.37 조작 키 (null = 기본)
  textScale: null, // v1.64 글자 크기 (null = 기본: PC 1.15 · 모바일 1.0) — 「글자가 너무 작다」 피드백
  cb: false, // v1.92 색약 모드
  resMode: 'auto', // v1.93 화면 해상도: 'auto' · '0' 높음 · '1' 보통 · '2' 낮음
  fps: false, // v1.85 프레임 표시 (저가폰 측정)
  fullscreen: true, // v1.45.2 모바일: 화면을 처음 누르면 전체 화면 (나갔다가도 다시 누르면 돌아감)
  load() { // v1.84.10 외부 점검: 아는 항목만 · 기본값과 같은 자료형만 · 음량은 0~1 · 글자 크기는 0.8~1.6
    try {
      const s = JSON.parse(localStorage.getItem('seoul2049-settings') || '{}'); if (!s || typeof s !== 'object') return;
      for (const k of Object.keys(s)) {
        if (!(k in this) || typeof this[k] === 'function') continue;
        const d = this[k], v = s[k];
        if (k === 'textScale') this.textScale = v === null ? null : Number.isFinite(+v) ? clamp(+v, 0.8, 1.6) : null;
        else if (k === 'keys') this.keys = v && typeof v === 'object' && !Array.isArray(v) ? v : null;
        else if (typeof d === 'boolean') this[k] = !!v;
        else if (typeof d === 'number') { if (Number.isFinite(+v)) this[k] = /vol/i.test(k) ? clamp(+v, 0, 1) : +v; }
        else if (d === null || typeof d === typeof v) this[k] = v;
      }
      if (s.shake === false && s.shakeAmt === undefined) this.shakeAmt = 0; // 예전에 흔들림을 끈 사람은 0%
      this.shakeAmt = clamp(+this.shakeAmt || 0, 0, 1); this.shake = this.shakeAmt > 0;
    } catch (e) { /* 저장 불가 */ }
  },
  save() { try { localStorage.setItem('seoul2049-settings', JSON.stringify({ fps: this.fps, light: this.light, shake: this.shake, shakeAmt: this.shakeAmt, cb: this.cb, resMode: this.resMode, vibrate: this.vibrate, dmgNum: this.dmgNum, detail: this.detail, sound: this.sound, bgm: this.bgm, musicVol: this.musicVol, volume: this.volume, tips: this.tips, reverb: this.reverb, ambient: this.ambient, xray: this.xray, outline: this.outline, keys: this.keys, fullscreen: this.fullscreen, textScale: this.textScale, camLead: this.camLead, rmbAim: this.rmbAim, mip: this.mip })); } catch (e) { /* 저장 불가 */ } },
};
// v1.37 키 바꾸기: 행동 → 키 (소문자 e.key). 벨트 1~8 · ESC 는 고정
const KEY_DEFAULTS = { up: 'w', left: 'a', down: 's', right: 'd', dodge: ' ', reload: 'r', swap: 'q', interact: 'e', inventory: 'i', stats: 'c', skills: 'k', quest: 'j', settings: 'o', belt: 'b', compCmd: 'f', useMed: 'x', gl: 'g' };
const KEY_NAMES = { up: '위로 이동', left: '왼쪽 이동', down: '아래로 이동', right: '오른쪽 이동', dodge: '회피', reload: '재장전', swap: '무기 교체', interact: '상호작용', inventory: '가방', stats: '능력치', skills: '스킬', quest: '미션', settings: '설정', belt: '벨트(소모품) 칸 등록', compCmd: '동료 명령', useMed: '구급상자 (바로)' , gl: '유탄 (OX-20)' };
function keyOf(act) { return (Settings.keys && Settings.keys[act]) || KEY_DEFAULTS[act]; }
function keyLabel(k) {
  if (typeof Pad !== 'undefined' && Pad.on) { const act = Object.keys(KEY_DEFAULTS).find(a => keyOf(a) === k), pl = act && Pad.label(act); if (pl) return pl; } // v1.91 패드를 쓰는 중이면 패드 버튼 글자
  return k === ' ' ? 'Space' : k.startsWith('arrow') ? ({ arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' })[k] : k.length === 1 ? k.toUpperCase() : k; }
// v1.92 색약 모드: 탈출 지점이 하늘색이 되므로 안내 글의 「초록 ◎ · 초록 원」도 같이
function cbText(s) { return Settings.cb && typeof s === 'string' ? s.replace(/초록( ?◎| 원)/g, '하늘색$1') : s; }
Settings.load();
if (document.body) document.body.classList.toggle('cb', Settings.cb);
// v1.64 글자 크기: HUD 글자 칸은 그대로 · 창은 덜 키움 (화면 밖으로 안 넘치게)
function textScale() { return Settings.textScale || ((('ontouchstart' in window) || navigator.maxTouchPoints > 0) ? 1 : 1.15); }
function applyTextScale() { const t = textScale(), r = document.documentElement.style; r.setProperty('--ts', t); r.setProperty('--tsp', 1 + (t - 1) * 0.6); }
applyTextScale();
