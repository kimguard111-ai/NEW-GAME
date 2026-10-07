// 설정 (v0.15): 기기 저장, 저사양·모바일용 옵션
const Settings = {
  light: true,   // 조명 효과 (끄면 단순 어둠 — 가벼움)
  shake: true,   // 화면 흔들림
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
  fullscreen: true, // v1.45.2 모바일: 화면을 처음 누르면 전체 화면 (나갔다가도 다시 누르면 돌아감)
  load() { try { Object.assign(this, JSON.parse(localStorage.getItem('seoul2049-settings') || '{}')); } catch (e) { /* 저장 불가 */ } },
  save() { try { localStorage.setItem('seoul2049-settings', JSON.stringify({ light: this.light, shake: this.shake, dmgNum: this.dmgNum, detail: this.detail, sound: this.sound, bgm: this.bgm, musicVol: this.musicVol, volume: this.volume, tips: this.tips, reverb: this.reverb, ambient: this.ambient, xray: this.xray, outline: this.outline, keys: this.keys, fullscreen: this.fullscreen, camLead: this.camLead, rmbAim: this.rmbAim, mip: this.mip })); } catch (e) { /* 저장 불가 */ } },
};
// v1.37 키 바꾸기: 행동 → 키 (소문자 e.key). 벨트 1~8 · ESC 는 고정
const KEY_DEFAULTS = { up: 'w', left: 'a', down: 's', right: 'd', dodge: ' ', reload: 'r', swap: 'q', interact: 'e', inventory: 'i', stats: 'c', skills: 'k', quest: 'j', settings: 'o', belt: 'b', compCmd: 'f', useMed: 'x', gl: 'g' };
const KEY_NAMES = { up: '위로 이동', left: '왼쪽 이동', down: '아래로 이동', right: '오른쪽 이동', dodge: '회피', reload: '재장전', swap: '무기 교체', interact: '상호작용', inventory: '가방', stats: '능력치', skills: '스킬', quest: '미션', settings: '설정', belt: '벨트(소모품) 칸 등록', compCmd: '동료 명령', useMed: '구급상자 (바로)' , gl: '유탄 (OX-20)' };
function keyOf(act) { return (Settings.keys && Settings.keys[act]) || KEY_DEFAULTS[act]; }
function keyLabel(k) { return k === ' ' ? 'Space' : k.startsWith('arrow') ? ({ arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→' })[k] : k.length === 1 ? k.toUpperCase() : k; }
Settings.load();
