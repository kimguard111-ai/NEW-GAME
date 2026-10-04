// 설정 (v0.15): 기기 저장, 저사양·모바일용 옵션
const Settings = {
  light: true,   // 조명 효과 (끄면 단순 어둠 — 가벼움)
  shake: true,   // 화면 흔들림
  dmgNum: true,  // 피해 숫자
  detail: true,  // v1.11 세부 묘사 (옥상 난간·물탱크 · 1층 셔터 · 도로 마모 · 차 디테일)
  tips: true,    // 도움말 팁 (v1.0)
  sound: true,   // 효과음 (v0.16)
  bgm: true,     // v1.17 배경 음악
  musicVol: 0.5,
  volume: 0.7,
  load() { try { Object.assign(this, JSON.parse(localStorage.getItem('seoul2049-settings') || '{}')); } catch (e) { /* 저장 불가 */ } },
  save() { try { localStorage.setItem('seoul2049-settings', JSON.stringify({ light: this.light, shake: this.shake, dmgNum: this.dmgNum, detail: this.detail, sound: this.sound, bgm: this.bgm, musicVol: this.musicVol, volume: this.volume, tips: this.tips })); } catch (e) { /* 저장 불가 */ } },
};
Settings.load();
