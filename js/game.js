// 메인 게임 루프
const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');
let VW = 0, VH = 0;

// v1.37 세이브 슬롯 3개: 1번 = 예전 저장 자리 그대로 (기존 세이브 유지)
const SAVE_BASE = 'seoul2049-save-v1';
let SAVE_SLOT = 1; try { SAVE_SLOT = +localStorage.getItem('seoul2049-slot') || 1; } catch (e) { /* 저장 불가 */ }
const slotKey = n => n === 1 ? SAVE_BASE : `${SAVE_BASE}-s${n}`;
function saveKey() { return slotKey(SAVE_SLOT); }
const MAP_SEED = 2049;

const G = {
  player: null, enemies: [], bullets: [], particles: [], drops: [], texts: [], effects: [], decals: [], grenades: [], fires: [], mines: [], turrets: [],
  npcs: [], corpses: [], elite: null, strikes: [], pools: [], assault: null, fieldBoss: null, fbT: 150, inside: null, cam: { x: 0, y: 0 }, time: 0, shake: 0, running: false,
  spawnT: 0, bossT: 0, boss: null, saveT: 0, darkness: 0.3, zone: 0, noAmmoT: 0, hitstop: 0,
  shopStock: null, shopLevel: -1,
};
const input = { keys: {}, mx: 0, my: 0, down: false };

function resize() {
  canvas.width = Math.round(window.innerWidth * RES); canvas.height = Math.round(window.innerHeight * RES);
  canvas.style.width = window.innerWidth + 'px'; canvas.style.height = window.innerHeight + 'px';
  VW = window.innerWidth / ZOOM; VH = window.innerHeight / ZOOM; // 확대 전 기준 화면 크기
}
window.addEventListener('resize', resize);
resize();
// 마우스 휠: 카메라 확대 1.0 ~ 1.8
function setZoom(z) {
  ZOOM = clamp(Math.round(z * 10) / 10, ZOOM_MIN, ZOOM_MAX); // v1.21 최대 확대 1.8 → 2.2 (캐릭터가 작아진 만큼)
  try { localStorage.setItem('seoul2049-zoom', ZOOM); } catch (e) { /* 저장 불가 */ }
  GroundCache.clear(); resize();
}
canvas.addEventListener('wheel', e => { e.preventDefault(); setZoom(ZOOM + (e.deltaY < 0 ? 0.1 : -0.1)); }, { passive: false });

// ---------------- 입력 ----------------
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  input.keys[k] = true;
  if (k === 'escape' && G.paused) { Pause.toggle(); return; }
  if (!G.running || G.player.dead || G.paused) return;
  if (UI.keyCapture) return; // v1.37 설정에서 키 바꾸는 중
  if (k === ' ') e.preventDefault();
  if (k === 'escape') { if (UI.anyOpen()) UI.closeAll(); else Pause.toggle(); return; }
  if (k >= '1' && k <= '4') { Hotbar.useSkill(+k - 1); return; } // v1.50 스킬 퀵바 1~4
  if (BELT_KEYS.includes(k)) { Hotbar.use(BELT_KEYS.indexOf(k)); return; } // 벨트(소모품) 5~0
  const act = Object.keys(KEY_DEFAULTS).find(a => keyOf(a) === k); // v1.37 바꾼 키
  if (act === 'reload') startReload();
  else if (act === 'swap') swapWeapon();
  else if (act === 'interact') interact();
  else if (act === 'dodge') dodge();
  else if (act === 'inventory') UI.toggle('inventory');
  else if (act === 'stats') UI.toggle('stats');
  else if (act === 'skills') UI.toggle('skills'); // v1.26
  else if (act === 'quest') UI.toggle('quest');
  else if (act === 'settings') UI.toggle('settings');
  else if (act === 'belt') Hotbar.edit();
  else if (act === 'compCmd') Companion.command(); // v1.44 동료 명령
  else if (act === 'useMed') quickMedkit(); // v1.48 소모품은 벨트와 따로
  else if (act === 'gl') fireGL(); // v1.52 OX-20 유탄
});
window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e => { input.mx = e.clientX / ZOOM; input.my = e.clientY / ZOOM; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) input.down = true; else if (e.button === 2) { if (Settings.rmbAim) input.aim = true; else if (G.running && !G.paused && !G.player.dead) dodge(); } }); // v1.49.9 오른쪽 클릭 = 조준 (설정에서 끄면 v1.48 회피)
window.addEventListener('mouseup', e => { if (e.button === 0) input.down = false; else if (e.button === 2) input.aim = false; });
window.addEventListener('blur', () => { input.keys = {}; input.down = false; input.aim = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.running && !G.paused && !G.player.dead) Pause.toggle(); }); // 탭을 떠나면 자동 일시정지
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------------- 공용 ----------------
function log(msg, color = '#ddd') { UI.log(msg, color); if (color === '#f88' && typeof SFX !== 'undefined') SFX.play('error'); } // v1.35 안 되는 일: 낮은 삐-삐
function floatText(x, y, text, color = '#fff', size = 14) {
  // v1.47.1 글씨가 겹쳐 난잡하던 것: 0.35초 안에 근처(28px)에 뜬 같은 색 피해 숫자는 하나로 합침 · 한 화면 최대 18개
  const n = typeof text === 'number' ? text : /^-?\d+$/.test(text) ? +text : null;
  if (n !== null) for (const t of G.texts) if (t.num !== undefined && t.color === color && t.t < 0.35 && Math.abs(t.x - x) < 28 && Math.abs(t.y - y) < 28) { t.num += n; t.text = String(t.num); t.t = 0; t.size = Math.min(22, Math.max(t.size, size) + 1); return; }
  if (G.texts.length >= 18) G.texts.shift();
  G.texts.push({ x: x + rand(-6, 6), y, z: 34, text, color, size, t: 0, life: 0.9, num: n === null ? undefined : n });
}
function burst(x, y, color, n, speed = 120, life = 0.5, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(speed * 0.3, speed);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(life * 0.5, life), color, size });
  }
}
function curWeapon() { const p = G.player; return p.equip[p.active]; }
// v1.49.9 조준 (PC 오른쪽 클릭 누르는 동안): 퍼짐 ↓ · 이동 60% · 시야를 커서 쪽으로 더. 0~1 (부드럽게 들어감)
function adsOn() { const p = G.player, w = p && curWeapon(); return !IS_TOUCH && !!input.aim && !!w && !WEAPONS[w.key].melee && !p.dead && !UI.anyOpen(); }
function adsSpreadMul(w) { return lerp(ADS.hip * attMul(w, 'hipSpread'), (ADS.spread[wbase(w.key)] ?? 0.6) * attMul(w, 'adsSpread'), ADS.k); } // v1.50 조준경 · 레이저
const ADS = { k: 0, spread: { sniper: 0.3, rifle: 0.5, lmg: 0.6, smg: 0.6, shotgun: 0.75, pistol: 0.55 }, hip: 1.12 };
// 타격감: 아주 짧게 게임을 멈춤 (렌더는 계속)
function hitstop(t) { G.hitstop = Math.max(G.hitstop, t); }
const MIN_FIRE = 0.06; // v1.50.7 총 연사 하한 (초)
const KB_RATE = 18; // v1.49.7 밀려나는 속도가 줄어드는 빠르기 (총 거리 = 처음 속도 / KB_RATE)

// ---------------- 저장 ----------------
function saveGame(silent = true) {
  if (!G.player) return;
  try {
    const p = { ...G.player, reloadT: 0, atkT: 0 }, key = saveKey();
    const str = JSON.stringify({ ver: 2, p, nextItemId, bossT: G.bossT, savedAt: Date.now() });
    // v1.49 백업: 2분마다 직전 저장을 「-bak」에 남김 (저장이 깨져도 그 전으로 돌아갈 수 있게)
    const old = localStorage.getItem(key);
    if (old && Date.now() - (G.bakT || 0) > 120000 && validSave(old)) { localStorage.setItem(key + '-bak', old); G.bakT = Date.now(); }
    localStorage.setItem(key, str);
    if (!silent) log('게임이 저장되었습니다.', '#8f8');
  } catch (e) { if (!G.saveWarned) { G.saveWarned = true; log('저장하지 못했다. 브라우저 저장 공간이 꽉 찼거나 막혀 있다. 설정 → 세이브 코드 만들기로 따로 보관해 두자.', '#f88'); } }
}
function validSave(str) { try { const s = typeof str === 'string' ? JSON.parse(str) : str; return !!(s && s.p && s.p.name !== undefined && Array.isArray(s.p.inventory) && s.p.equip && s.p.stats); } catch (e) { return false; } }
// v1.51 실제 총 이름 → 가상 이름 (예전 세이브의 장비 이름도 바꿈)
const LEGACY_NAMES = [['M1911 권총', 'P-45 권총'], ['MP5 기관단총', 'SP-9 기관단총'], ['M870 산탄총', 'R-12 산탄총'], ['K2 돌격소총', 'KR-49 돌격소총'], ['K14 저격소총', 'SR-49 저격소총'], ['K3 기관총', 'LM-49 기관총']];
function renameLegacy(str) { for (const [a, b] of LEGACY_NAMES) str = str.split(a).join(b); return str; }
// v1.55 쇠파이프 → 소방 도끼 · 저격소총 → 돌격소총 (그림이 있는 무기만) · 피해는 기본치 비율로 · 저격탄은 크레딧으로 — 불러올 때 바로 (다른 코드가 없는 무기를 보기 전에)
function migrateRoster(P) {
  if (!P || !P.inventory) return P;
  const MAP = { pipe: ['axe', 25], sniper: ['rifle', 140] }, graves = Object.values(P.graves || {}).flatMap(g => g.items || []), comp = Object.values(P.compData || {}).map(c => c.gun);
  for (const it of [...P.inventory, ...Object.values(P.equip), ...(P.stash || []), ...graves, ...comp]) {
    const m = it && it.kind === 'weapon' && MAP[it.key]; if (!m) continue;
    it.dmg = Math.round(it.dmg * WEAPONS[m[0]].dmg / m[1] * 10) / 10; it.key = m[0];
    it.name = it.unique && UNIQUES[it.unique] ? UNIQUES[it.unique].name : (it.rarity > 0 ? RARITIES[it.rarity].name + ' ' : '') + WEAPONS[m[0]].name;
    if (!WEAPONS[m[0]].melee) it.loaded = Math.min(it.loaded || 0, WEAPONS[m[0]].mag); else delete it.loaded;
  }
  if (P.ammo && P.ammo.sniper) { P.credits += Math.round(P.ammo.sniper / 15 * 50); delete P.ammo.sniper; }
  if (P.codex && P.codex.items) { delete P.codex.items.pipe; delete P.codex.items.sniper; }
  return P;
}
function loadSave(n = SAVE_SLOT) {
  try {
    const s = localStorage.getItem(slotKey(n));
    if (!s) return null;
    if (validSave(s)) { const v = JSON.parse(renameLegacy(s)); migrateRoster(v.p); return v; }
    const b = localStorage.getItem(slotKey(n) + '-bak'); // v1.49 깨진 저장 → 백업으로
    if (b && validSave(b)) { const v = JSON.parse(renameLegacy(b)); migrateRoster(v.p); v.fromBak = true; return v; }
    return null;
  } catch (e) { return null; }
}

// ---------------- 시작 ----------------
// 캠프 NPC (v1.3: 작전 장교 = 출격 지도, 창고 관리인 = 창고)
function setupCampNpcs() {
  const c = World.campCenter();
  G.npcs = [
    { id: 'merchant', name: '암시장 상인 박씨', x: c.x - 120, y: c.y - 70, color: '#c9a227' },
    { id: 'captain', name: '생존자 대장 한씨', x: c.x + 120, y: c.y - 70, color: '#4f7fbf' },
    { id: 'medic', name: '의무병 이씨', x: c.x, y: c.y + 110, color: '#e8e8e8' },
    { id: 'mechanic', name: '정비공 최씨', x: c.x - 140, y: c.y + 60, color: '#888' },
    { id: 'deploy', name: '작전 장교 윤씨', x: c.x + 150, y: c.y + 70, color: '#6a8a5a' },
    { id: 'stash', name: '창고 관리인 정씨', x: c.x, y: c.y - 140, color: '#8a6a4a' },
  ];
}
function startGame(save, name) {
  World.generate('camp'); // v1.3: 항상 캠프(거점)에서 시작
  setupCampNpcs();
  if (save) {
    G.player = Object.assign(newPlayer(save.p.name), save.p);
    nextItemId = save.nextItemId || 1000;
    // v0.1 → v0.2: 아이템에 옵션 필드 추가 (기존 장비는 옵션 없음으로 유지)
    for (const k of Object.keys(G.player.equip)) normalizeItem(G.player.equip[k]);
    G.player.inventory.forEach(normalizeItem);
    G.player.pity = G.player.pity || 0;
    G.player.respecs = G.player.respecs || 0;
    G.player.found = G.player.found || [];
    G.player.mats = G.player.mats || { scrap: 0, chip: 0 }; // v0.12 재료
    G.player.quest = Story.migrate(G.player.quest); // v0.7: 단일 임무 → 챕터
    if (!('helmet' in G.player.equip)) G.player.equip.helmet = null; // v0.6.2 헬멧 칸
    for (const k of ['w1', 'w2']) { const w = G.player.equip[k]; if (w && !WEAPONS[w.key].melee) w.loaded = Math.min(w.loaded || 0, magSize(w)); }
    G.bossT = save.bossT || 0;
    G.player.dead = false;
    if (G.player.hp <= 0) G.player.hp = PlayerStats.maxHp(G.player);
    Object.assign(G.player, World.campCenter()); G.player.mapV = 4; // v1.3: 불러오면 항상 캠프
    G.player.stash = G.player.stash || [];
    if (G.player.raid) { // 출격 중에 껐다면: 주운 것은 확정하고 캠프로 (브라우저가 꺼져도 잃지 않게)
      for (const it of Raid.allItems()) delete it.raid;
      G.player.raid = null; log('지난 출격에서 무사히 돌아왔다. 가져온 물건은 확정되었다.', '#8cf');
    }
    log(`${G.player.name}님, 다시 오신 것을 환영합니다.`, '#e0b23a');
    if (save.fromBak) { log('마지막 저장이 깨져 있어서 직전 백업(최대 2분 전)으로 불러왔습니다.', '#ffd76a'); saveGame(); } // v1.49
  } else {
    G.player = newPlayer(name || '생존자');
    G.player.hp = PlayerStats.maxHp(G.player);
    G.player.tips = ['deploy', 'extract']; G.player.hints = []; // v1.45 같은 말은 키 그림 · 첫 출격 카드가 대신함
    log('대붕괴 20년 후, 서울. 시청역 생존자 캠프에서 눈을 떴다.', '#e0b23a');
    G.autoStory = true; // v0.16: 1장을 바로 시작 (캠프 대화 없이)
    G.welcome = true; // v1.15 첫 플레이 안내
  }
  G.enemies = []; G.bullets = []; G.drops = []; G.particles = []; G.texts = []; G.effects = []; G.decals = []; G.grenades = []; G.fires = []; G.mines = []; G.turrets = []; G.corpses = []; Juice.reset();
  G.boss = null; G.elite = null; G.strikes = []; G.pools = []; G.assault = null; G.fieldBoss = null; G.fbT = 150; G.inside = null;
  G.player.assaults = G.player.assaults || {}; // v0.9 어설트 기록
  G.exits = []; G.extractT = 0;
  const P = G.player; P.stam = 100; // v1.8.1 근접 무기 공속↓·피해↑: 이미 가진 근접 무기도 같은 비율로 피해 보정 (초당 피해 유지)
    { const R = { pipe: 25 / 18, axe: 55 / 44, katana: 79 / 60 };
      for (const it of [...P.inventory, ...Object.values(P.equip), ...(P.stash || [])]) if (it && it.kind === 'weapon' && R[it.key] && !it.v181) { it.dmg = Math.round(it.dmg * R[it.key] * 10) / 10; it.v181 = true; } }
    { const R = { smg: 12 / 9, rifle: 22 / 17 }; // v1.40.2 기관단총·소총 연사 ↓ · 한 발 피해 ↑: 가진 무기도 같은 비율로 (시체 가방 포함)
      const graves = Object.values(P.graves || {}).flatMap(g => g.items || []);
      for (const it of [...P.inventory, ...Object.values(P.equip), ...(P.stash || []), ...graves]) if (it && it.kind === 'weapon' && R[it.key] && !it.v1402) { it.dmg = Math.round(it.dmg * R[it.key] * 10) / 10; it.v1402 = true; } }
    { const R = { pistol: 18 / 14, sniper: 140 / 120, katana: 62 / 79 }; // v1.27 총기 밸런스: 가진 무기도 같은 비율로 (시체 가방 포함)
      const graves = Object.values(P.graves || {}).flatMap(g => g.items || []);
      for (const it of [...P.inventory, ...Object.values(P.equip), ...(P.stash || []), ...graves]) if (it && it.kind === 'weapon' && !it.v127) { if (R[it.key]) it.dmg = Math.round(it.dmg * R[it.key] * 10) / 10; it.v127 = true; } }
    P.graves = P.graves || {}; G.search = null; G.grave = null; P.tips = P.tips || []; P.playTime = P.playTime || 0; P.deaths = P.deaths || 0; P.bestCombo = P.bestCombo || 0; // v1.0 기록
    P.contract = null; P.cboard = null; // v1.47.1 출격 계약 게시판 삭제 (받아 둔 계약도 정리)
    mythTestGrant(P); // v1.61.2 시험 모드: Lv26 + 신화 3종
    Tut.init(P); // v1.54
    for (const k of ['lastAtk', 'lastShot', 'lastRoll', 'lastHurt', 'mLast', 'rollAtk', 'aimPtT', 'medCd']) P[k] = -9; // v1.57 시각 기록은 새 시계(G.time=0) 기준으로 — 예전 시각이 남아 이어하기 직후 몸이 안 보이던 것
    if (!P.hints) P.hints = P.level > 2 || (P.rec && P.rec.extracts) || P.deaths ? HINTS.map(h => h.id).concat('rules') : []; // v1.45 키 그림 안내 (이미 해 본 사람은 건너뜀)
  Bounty.refresh(); // v0.14 일일 의뢰
  Weekly.refresh(); // v1.15 주간 도전
  Journal.ensure(P);
  if (save && !save.p.skills) { // v1.16 이전 세이브: 지금 레벨로 쓰던 스킬·고른 갈래는 그대로 배운 것으로
    P.skills = {}; P.smodOwned = {};
    for (const s of SKILLS) if (P.level >= s.lvl) P.skills[s.id] = true;
    for (const [k, v] of Object.entries(P.skillMods || {})) if (v) P.smodOwned[k + '_' + v] = true;
  }
  P.smodOwned = P.smodOwned || {}; P.stree = P.stree || {}; P.passive = P.passive || {}; // v1.22 스킬 트리 · v1.23 패시브
  if (save && !save.p.skillsV120) { // v1.20 기존 세이브도 스킬은 돈 주고 배우기: 배운 스킬·갈래를 초기화하고 그 값을 크레딧으로 돌려줌 (손해 없음)
    let refund = 0;
    for (const s of SKILLS) { if (P.skills[s.id]) refund += s.price || 0; for (const k of ['a', 'b']) if (P.smodOwned[s.id + '_' + k]) refund += s.modPrice || 0; }
    P.skills = {}; P.smodOwned = {}; P.skillMods = {}; P.skillsV120 = true;
    if (refund) { P.credits += refund; G.skillRefund = refund; }
  }
  if (save && !save.p.hotbar) { // v1.24 기존 세이브: 쓰던 칸(배운 스킬 + 구급상자 + 투척 + 보조)이 다 들어가는 벨트를 채워 줌
    const acts = SKILLS.map((s, i) => P.skills[s.id] ? 'sk' + i : null).filter(Boolean).concat(['med', 'throw', 'util']);
    P.hotbar = acts.concat(Array(HOT_MAX).fill(null)).slice(0, HOT_MAX);
    if (!P.equip.belt) P.equip.belt = makeBelt(Math.min(3, Math.ceil(acts.length / 2) - 1));
  }
  if (!('belt' in P.equip)) P.equip.belt = null;
  if (save && !save.p.hb150) { // v1.50 옛 벨트(스킬) → 스킬 퀵바 · 벨트는 가진 소모품으로 채움
    P.skillbar = (P.hotbar || []).filter(a => a && a.startsWith('sk')).concat([null, null, null, null]).slice(0, 4);
    const own = BELT_ITEMS.filter(k => k !== 'ammo' && P.inventory.some(i => i && i.kind === 'cons' && i.key === k));
    P.hotbar = (own.includes('medkit') ? own : ['medkit'].concat(own)).concat(Array(HOT_MAX).fill(null)).slice(0, HOT_MAX); P.hb150 = true;
  }
  P.skillbar = P.skillbar || [null, null, null, null];
  P.srank = P.srank || {};
  if (save && !save.p.ammo) { // v1.33 탄약 4종: 예전 예비 탄약은 기관총탄으로, 나머지는 시작 양
    const r = save.p.reserve ?? 150; P.ammo = Object.fromEntries(Object.entries(AMMO).map(([k, a]) => [k, k === 'auto' ? Math.max(a.start, r) : a.start])); delete P.reserve;
  }
  if (save && !save.p.spV126) { // v1.25·1.26 기존 세이브: 배운 것은 그대로(등급 1), 지금까지 받았을 SP(시작 1 + 레벨 업 + 장 완료)에서 쓴 만큼 빼고 남은 SP를 줌
    P.sp = Math.max(0, 1 + (P.level - 1) + (P.quest.ch || 0) - spSpent(P)); P.spV125 = P.spV126 = true;
  }

  G.running = true;
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  UI.buildHotbar();
  UI.refreshAll();
  G.welcome = false; // v1.45 첫 안내 창 대신 그 순간의 키 그림 (FirstRun)
  if (G.skillRefund) { const r = G.skillRefund; G.skillRefund = 0; setTimeout(() => { UI.toast('스킬은 이제 배워서 씁니다', `배웠던 스킬 값 ₵${fmt(r)}을 돌려받았다. (암시장 상인 박씨 「스킬 교범」)`); log(`${ICON('tip')} 스킬은 상인에게서 배워야 쓸 수 있도록 바뀌었습니다. 이전 스킬·갈래 값 ₵${fmt(r)} 반환.`, '#7fd'); }, 1200); }
  if (G.autoStory) { G.autoStory = false; Story.start(G.player); }
  saveGame();
}

// ---------------- 플레이어 행동 ----------------
// 회피 (v1.33, 예전 회피): 0.42초 무적, 빠르게 미끄러지다 감속. 이동 중이면 그 방향, 아니면 조준 방향
// 재사용 5초 — 위급할 때만 (예전: 스태미나 50 · 연속 2번). 기력 절약 효과들은 재사용 감소로 바뀜
const ROLL = { dur: 0.3, speed: 470, /* v1.50.5 처음 버전 회피처럼 짧고 빠르게 (0.42·400 → 0.3·470) */ cd: 5, minCd: 2, regen: 40 };
function rollCdMax(p) { return Math.max(ROLL.minCd, ROLL.cd * (perk('ghost') ? 0.6 : 1) * (branchOn('tac') ? 0.8 : 1) * (perk('runner') ? 0.85 : 1) * (pas('t2') ? 0.9 : 1) * (1 - gearBonus(p, 'rollStam'))); }
// v1.8.1 총구 위치: 총을 든 몸 그림이면 그림 속 총구(옆으로 · 어깨 높이)에서 쏘고, 조준점(커서)을 향해 날아감
// 총알은 높이 22에서 그려지므로, 화면상 총구 위치에 맞는 바닥 좌표를 역산
function gunMuzzle(p, w) {
  const def = { x: p.x + Math.cos(p.aim) * 22, y: p.y + Math.sin(p.aim) * 22, a: p.aim };
  const grp = ART.weaponGroup[w.key], m = ART.muzzle && ART.muzzle[grp];
  if (!m || typeof Sprites === 'undefined') return def;
  const base = p.equip.armor && Sprites.get('player_' + p.equip.armor.key) ? 'player_' + p.equip.armor.key : 'player';
  if (!Sprites.get(base + '_' + grp) || p.backBody) return def; // 총을 든 몸 그림이 없거나 등 모습으로 위를 겨누면 예전 방식
  const H = (ART.height.player || 44) * (ART.charScale || 1), f = p.faceX || (Iso.dir(p.aim).x < 0 ? -1 : 1); // v1.50.6 몸과 같은 좌우 // v1.21 실제 스케일
  const dsx = f * H * m[0], dsy = -H * m[1] + 22 * ISO_K, ix = dsx / ISO_K, iy = dsy / ISO_K;
  const x = p.x + (ix + 2 * iy) / 2, y = p.y + (2 * iy - ix) / 2;
  if (World.solidAt(x, y)) return def; // 벽에 붙어 있으면 몸 앞에서
  const R = p.aimPt && G.time - (p.aimPtT || -9) < 0.5 ? clamp(dist(p, p.aimPt), 160, 700) : 320; // 조준점 (터치는 앞쪽 320)
  const tx = p.x + Math.cos(p.aim) * R, ty = p.y + Math.sin(p.aim) * R;
  return { x, y, a: Math.atan2(ty - y, tx - x) };
}

function dodge() {
  const p = G.player;
  if (p.dead || p.rollT > 0) return;
  if ((p.rollCd || 0) > 0) { if (G.time - (p.stamWarn || 0) > 0.6) { p.stamWarn = G.time; floatText(p.x, p.y - 30, `회피 ${p.rollCd.toFixed(1)}초`, '#7ab8ff', 12); } return; }
  let a = p.aim;
  const m = moveInput();
  if (m) a = Math.atan2(m.wy, m.wx);
  p.rollT = ROLL.dur; p.rollCd = p.rollCdMax = rollCdMax(p); p.rollA = a; p.lastRoll = G.time;
  SFX.play('dodge'); burst(p.x, p.y, '#8a8070', 8, 90, 0.35, 3);
}
// 현재 이동 입력 (월드 방향, 정규화 안 됨). 없으면 null
function moveInput() {
  let mx = 0, my = 0, amt = 1;
  if (input.keys[keyOf('up')] || input.keys['arrowup']) my -= 1; // v1.37 바꾼 키
  if (input.keys[keyOf('down')] || input.keys['arrowdown']) my += 1;
  if (input.keys[keyOf('left')] || input.keys['arrowleft']) mx -= 1;
  if (input.keys[keyOf('right')] || input.keys['arrowright']) mx += 1;
  if (Touch.move) { mx = Touch.move.x; my = Touch.move.y; amt = Math.min(1, Touch.move.mag); } // 모바일 왼쪽 조이스틱
  if (!mx && !my) return null;
  // 화면 기준 방향 → 월드 방향 (쿼터뷰)
  return { wx: (mx + 2 * my) / 2, wy: (2 * my - mx) / 2, amt };
}

function swapWeapon() {
  const p = G.player, other = p.active === 'w1' ? 'w2' : 'w1';
  if (!p.equip[other]) { log('교체할 무기가 없습니다.', '#aaa'); return; }
  p.active = other; p.reloadT = 0; p.atkT = Math.max(p.atkT, WEAPONS[p.equip[other].key].quickDraw ? 0.03 : 0.2); // v1.9 권총은 즉시 뽑음
  p.mStep = 0; p.mLast = -9; // 근접 콤보 초기화
  log(`무기 교체: ${itemName(p.equip[other])}`, '#aaa');
  UI.refreshInventory();
}

// v1.33 주운 탄약 종류: 장착한 총의 탄 위주 (가끔 다른 탄 — 나중에 쓸 총용)
function ammoPick(p) { const own = gunAmmoTypes(p), all = Object.keys(AMMO); return own.length && Math.random() < 0.75 ? own[Math.floor(Math.random() * own.length)] : all[Math.floor(Math.random() * all.length)]; }
function startReload() {
  const p = G.player, w = curWeapon();
  if (!w) return;
  const b = WEAPONS[w.key];
  if (!b.melee && p.reloadT > 0) { // v1.65 액티브 재장전: 장전 중 한 번 더 누르면 — 금색 칸이면 즉시 끝 + 이 탄창 피해 +20% · 빗나가면 0.6초 더 걸림 (한 번만)
    if (p.arTried) return; p.arTried = true;
    const k = 1 - p.reloadT / p.reloadMax;
    if (k >= AR_WIN[0] && k <= AR_WIN[1]) { p.reloadT = 0; finishReload(); w.arBoost = true; floatText(p.x, p.y - 40, '완벽 장전! 피해 +20%', '#ffd76a', 15); SFX.play('item', 1.4); G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.4, color: '#ffd76a', r: 46 }); }
    else { p.reloadT += 0.6; p.reloadMax += 0.6; floatText(p.x, p.y - 40, '삐끗!', '#ff8a6a', 13); SFX.play('empty'); }
    return;
  }
  if (b.melee || p.reloadT > 0 || w.loaded >= magSize(w)) return;
  w.arBoost = false; p.arTried = false;
  if (!p.arTold && G.player.raid) { p.arTold = true; log(`재장전 중 막대가 금색 칸에 왔을 때 ${IS_TOUCH ? '장전 버튼' : keyLabel(keyOf('reload'))}을 한 번 더 → 완벽 장전 (즉시 · 이 탄창 피해 +20%). 빗나가면 조금 늦어짐.`, '#ffd76a'); } // v1.65
  if ((p.ammo[b.ammo] || 0) <= 0 && !b.infinite) {
    if (G.noAmmoT <= 0) { log(`${AMMO[b.ammo].name}이 없습니다! 다른 총이나 근접 무기로 교체(Q)하거나 출격 지도에서 사세요.`, '#f88'); G.noAmmoT = 2; SFX.play('empty'); }
    return;
  }
  p.reloadT = p.reloadMax = b.reload * PlayerStats.reloadMul(p) * attMul(w, 'reload'); // v1.50 탄창 부품
  SFX.reload(wbase(w.key), p.reloadMax); // v1.35 무기별 장전 소리
}

const AR_WIN = [0.42, 0.62]; // v1.65 액티브 재장전 금색 칸 (장전 진행 비율)
function finishReload() {
  const p = G.player, w = curWeapon();
  if (!w || WEAPONS[w.key].melee) return;
  const need = magSize(w) - w.loaded;
  if (WEAPONS[w.key].infinite) { w.loaded += need; return; } // 권총: 예비 탄약 소모 없음
  const t = WEAPONS[w.key].ammo, take = Math.min(need, p.ammo[t] || 0);
  w.loaded += take; p.ammo[t] -= take;
}

// v1.9 기관총 예열: 연사할수록 최대 25% 빨라짐 (0.4초 쉬면 식기 시작)
function gunRateMul(p, w) { return wbase(w.key) === 'lmg' ? 1 - 0.25 * (p.heat || 0) : 1; }

// v1.50 근접 무기 한 번에 때리는 적 수: 무기 기본 + 등급 (희귀·영웅 +1 · 전설 +2) · 3타 마무리 +1
const MELEE_TARGETS = { pipe: 2, axe: 3, katana: 3 };
function meleeTargets(w, fin) { return (MELEE_TARGETS[w.key] || 2) + [0, 0, 1, 1, 2, 2][w.rarity || 0] + (fin ? 1 : 0); }
function playerDamageMul(melee) {
  const p = G.player;
  let m = (melee ? PlayerStats.meleeMul(p) : PlayerStats.gunMul(p)) * (p.buffs.adren > 0 ? 1 + SkillCalc.adrenDmg(p) : 1) * (!melee && p.buffs.rapid > 0 ? 1.2 : 1); // v1.50.7 집중 사격: 연사 대신 피해 일부
  // v1.11 특성
  if (perk('rollStrike') && G.time - ((p.lastRoll || -9) + ROLL.dur) < 1.5) m *= 1.3;
  if (!melee && perk('steadyAim') && G.time - (p.lastHurt || -9) > 2) m *= 1.15;
  if (perk('lastStand') && p.hp < PlayerStats.maxHp(p) * 0.35) m *= 1.25;
  if (pas('a5')) m *= 1.05; if (branchOn('atk')) m *= 1.08; // v1.23 패시브 트리
  if (!melee) { const cw = curWeapon(); if (cw && cw.arBoost) m *= 1.2; } // v1.65 완벽 장전한 탄창
  if (p.buffs.perfect > 0) m *= 1.3; // v1.65 완벽 회피 뒤 3초
  return m * Camp.dmgMul(); // v1.13 사격장
}

function playerAttack() {
  const p = G.player, w = curWeapon();
  if (!w || p.atkT > 0 || p.reloadT > 0) return;
  const b = WEAPONS[w.key];
  if (!b.melee) p.atkT = Math.max(MIN_FIRE, b.rate * PlayerStats.rateMul(p) * gunRateMul(p, w)); // v1.50.7 아무리 빨라도 초당 16발
  p.lastAtk = G.time; // 공격 애니메이션용
  SFX.play(b.melee ? 'swing_' + w.key : { smg: 'smg', rifle: 'rifle', lmg: 'lmg', shotgun: 'shotgun', sniper: 'sniper' }[wbase(w.key)] || 'pistol');
  const critMul = PlayerStats.critMul(p, w); let cc = PlayerStats.crit(p, w);
  if (b.melee) {
    // v1.9 근접 3타 콤보: 1·2타는 빠르게, 3타는 무기별 마무리 (쇠파이프 강타 · 도끼 회전 베기 · 칼 찌르기)
    // 회피 직후 0.35초 안의 공격은 바로 마무리 일격 (회피 베기)
    const rolled = G.time - ((p.lastRoll || -9) + ROLL.dur) < 0.35 && (p.lastRoll || -9) > (p.rollAtk || -9);
    p.mStep = rolled ? 2 : G.time - (p.mLast || -9) < b.rate * 1.6 + 0.35 ? ((p.mStep || 0) + 1) % 3 : 0;
    p.mLast = G.time;
    if (rolled) p.rollAtk = p.lastRoll;
    const fin = p.mStep === 2, M = fin ? MELEE_FINISH[w.key] : MELEE_COMBO;
    p.atkT = b.rate * M.rate * PlayerStats.rateMul(p);
    const reach = meleeReach(w), range = reach.range * M.range * (fin && w.unique === 'goliath' ? 1.4 : 1), arc = M.arc ? M.arc : reach.arc * (M.arcMul || 1);
    p.swingT = p.swingMax = fin ? 0.26 : 0.18; p.swingArc = arc; p.swingRange = range; p.swingFin = fin ? w.key : null;
    p.swingDir = p.mStep === 1 ? -1 : 1; // 2타는 반대 방향으로
    World.move(p, Math.cos(p.aim) * M.lunge * (rolled ? 1.5 : 1), Math.sin(p.aim) * M.lunge * (rolled ? 1.5 : 1)); // 휘두르며 전진
    if (fin) { SFX.play('heavy'); if (rolled) floatText(p.x, p.y - 34, '회피 베기!', '#ffd27a', 13); }
    const dmg = weaponDmg(w) * playerDamageMul(true) * M.dmg * (fin && perk('executioner') ? 1.4 : 1) * (fin && w.unique === 'goliath' ? 1.5 : 1) * (p.fangBuff ? 2 : 1);
    if (p.fangBuff) { p.fangBuff = false; floatText(p.x, p.y - 36, '굶주린 송곳니!', '#ff6a5a', 13); } // v1.12 붉은 이빨
    let hits = 0, anyCrit = false;
    const inArc = [];
    for (const e of G.enemies) {
      if (e.hp <= 0) continue;
      const d = dist(p, e);
      if (d > range + e.r) continue;
      const da = Math.abs(((angleTo(p, e) - p.aim + Math.PI * 3) % TAU) - Math.PI);
      if (da > arc / 2 && d > e.r + p.r + 4) continue;
      if (!World.lineOfSight(p, e)) continue; // 벽 너머 타격 방지
      inArc.push([d, e]);
    }
    inArc.sort((a, c) => a[0] - c[0]); // v1.50 가까운 순으로 무기 등급만큼만 (전에는 휘두른 범위의 적 전부)
    for (const [, e] of inArc.slice(0, meleeTargets(w, fin))) {
      const crit = Math.random() < cc + (M.crit || 0);
      anyCrit = anyCrit || crit;
      damageEnemy(e, dmg * (crit ? critMul : 1), crit, angleTo(p, e), { knock: b.knock * M.knock, stagger: b.stagger + M.stagger, w, melee: true, fin });
      hits++;
    }
    if (fin) G.effects.push({ type: 'slash', x: p.x, y: p.y, a: p.aim, arc, r: range, kind: w.key, t: 0, life: 0.3 });
    if (hits) {
      G.shake = Math.max(G.shake, (3 + b.knock * 0.12) * (fin ? 1.8 : 1));
      hitstop((anyCrit ? 0.075 : 0.04 + Math.min(0.03, b.stagger * 0.04)) + (fin ? 0.045 : 0));
      if (fin) SFX.play(w.key === 'katana' ? 'crit' : 'metal', 1);
    }
    return;
  }
  if (w.loaded <= 0) { p.atkT = 0; startReload(); return; }
  // 총소리 (v0.16): 근처의 배회하던 적이 소리를 듣고 몰려옴 (근접 무기는 조용함)
  if (G.time - (G.noiseT || -9) > 0.5) {
    G.noiseT = G.time;
    const ln = (wbase(w.key) === 'sniper' ? 750 : 550) * attMul(w, 'noise'); // v1.50 소음기
    for (const e of G.enemies) {
      if (e.state === 'chase' || e.hp <= 0 || e.minion || dist(e, p) > ln) continue;
      const nd = Nav.dist && Nav.dist[Math.floor(e.y / TILE) * World.W + Math.floor(e.x / TILE)];
      if (e.def.flying || nd >= 0) { e.state = 'chase'; e.heard = true; }
    }
  }
  if (perk('lastRounds') && w.loaded <= magSize(w) * 0.25) cc += 0.25; // v1.11 마지막 탄
  if (!(w.legend === 'thrift' && Math.random() < 0.35) && !(p.buffs.rapid > 0 && smod('rapid') === 'b')) w.loaded--; // v1.11 탄약 보급: 소모 없음
  const pellets = pelletCount(w), dmg = weaponDmg(w) * playerDamageMul(false) * attMul(w, 'dmg'), rapid = G.time - (p.lastShot || -9) < 0.3; // v1.50 rapid = 연사 중 (보정기·수직 손잡이)
  // v1.9 무기 손맛: 기관총 예열(연사할수록 정확·빨라짐) · 소총 첫 발 정조준(잠깐 쉬었다 쏘면 정확 + 치명타)
  const first = wbase(w.key) === 'rifle' && G.time - (p.lastShot || -9) > 0.35;
  if (wbase(w.key) === 'lmg') p.heat = w.unique === 'titan' ? 1 : Math.min(1, (p.heat || 0) + 0.04); // v1.12 타이탄 심장포: 항상 예열
  const frag = w.unique === 'raven' && (p.ravenN = (p.ravenN || 0) + 1) % 3 === 0; // v1.12 레이븐: 3발째 파편
  p.lastShot = G.time;
  const spread = b.spread * adsSpreadMul(w) * attMul(w, 'spread') * (rapid ? attMul(w, 'autoSpread') : 1) * (1 - gearBonus(p, 'accuracy', w)) * (wbase(w.key) === 'lmg' ? 1 - 0.55 * (p.heat || 0) : 1) * (first ? 0.15 : 1), pierce = (b.pierce || 0) + gearBonus(p, 'pierce', w) + (w.unique === 'hawk' ? 2 : 0);
  const mz = gunMuzzle(p, w), mx = mz.x, my = mz.y, aim0 = mz.a;
  const life = b.range / b.speed;
  const sid = (G.shotId = (G.shotId || 0) + 1); // v1.40 같은 한 발(산탄 여러 알) 표시
  for (let i = 0; i < pellets; i++) {
    const a = aim0 + rand(-spread, spread);
    const s = b.speed * rand(0.95, 1.05);
    const crit = Math.random() < cc + (first ? 0.1 : 0);
    G.bullets.push({
      x: mx, y: my, vx: Math.cos(a) * s, vy: Math.sin(a) * s, from: 'p', life, maxLife: life, falloff: b.falloff,
      dmg: dmg * (crit ? critMul : 1), crit, pierce, hit: [], w, frag: frag && i === 0, sid, headOf: p.aimHead ? p.aimTarget : null, // v1.66 머리를 겨눈 탄
      color: crit ? '#ffef7a' : w.legend === 'boom' ? '#ff8a3a' : '#ffd27a',
    });
  }
  p.recoilT = 0.07;
  if (Settings.shake) { const d = Iso.dir(aim0), k = b.pellets || wbase(w.key) === 'sniper' ? 9 : wbase(w.key) === 'lmg' || wbase(w.key) === 'smg' ? 2.2 : wbase(w.key) === 'rifle' ? 3.5 : 4.5; const kk = k * attMul(w, 'kick'); G.kick = G.kick || { x: 0, y: 0 }; G.kick.x -= d.x * kk; G.kick.y -= d.y * kk; } // v1.28 사격 반동이 화면에도 // v1.40 반동 조금 더 세게
  Juice.shot(p, w, mx, my, aim0); // v1.28 총구 섬광 · 탄피
  if (wbase(w.key) === 'sniper') { // v1.9 저격: 탄도가 잠깐 남음
    let ex = mx, ey = my; const c = Math.cos(aim0), sn = Math.sin(aim0);
    for (let d = 0; d < b.range; d += 16) { const nx = mx + c * d, ny = my + sn * d; if (World.solidAt(nx, ny)) break; ex = nx; ey = ny; }
    G.effects.push({ type: 'tracer', x: mx, y: my, x2: ex, y2: ey, t: 0, life: 0.35, color: 'rgba(255,240,200,0.8)', w: 2.5 });
  }
  G.particles.push({ x: mx, y: my, vx: 0, vy: 0, t: 0, life: 0.06, color: '#ffe9a0', size: b.pellets ? 14 : wbase(w.key) === 'sniper' ? 12 : 8, z: 22 });
  G.shake = Math.max(G.shake, b.pellets ? 6 : wbase(w.key) === 'sniper' ? 7 : wbase(w.key) === 'lmg' ? 2.2 : 1.5);
  if (w.loaded === 0) startReload();
}

// v1.52 OX-20 공중폭발 유탄: G (모바일: 유탄 버튼) · v1.62 탄 수 없이 쿨타임 5초 (남은 시간은 총에 붙어 있음: w.glCd)
const glOf = w => w && WEAPONS[w.key] && WEAPONS[w.key].gl;
function glLeft(w) { return glOf(w) && !(w.glCd > 0) ? 1 : 0; } // 1 = 쏠 수 있음
function fireGL() {
  const p = G.player, w = curWeapon(), L = glOf(w);
  if (!L || p.dead || World.map === 'camp') return;
  if (glLeft(w) < 1) { floatText(p.x, p.y - 34, `유탄 ${w.glCd.toFixed(1)}초`, '#aaa', 12); SFX.play('empty'); return; }
  let tx, ty;
  if (IS_TOUCH) { // 조준 방향 ±35° 안의 가장 가까운 적, 없으면 그 방향 300px
    const t = G.enemies.filter(e => e.hp > 0 && dist(e, p) < L.range && Math.abs(angDiff(angleTo(p, e), p.aim)) < 0.6).sort((a, b) => dist(a, p) - dist(b, p))[0];
    if (t) { tx = t.x; ty = t.y; } else { tx = p.x + Math.cos(p.aim) * 300; ty = p.y + Math.sin(p.aim) * 300; }
  } else ({ x: tx, y: ty } = Iso.toWorld(input.mx, input.my));
  const a = Math.atan2(ty - p.y, tx - p.x), d = clamp(Math.hypot(tx - p.x, ty - p.y), 60, L.range);
  w.glCd = L.cd;
  G.grenades.push({ sx: p.x, sy: p.y, x: p.x, y: p.y, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, t: 0, dur: 0.16 + d / 1500, tdmg: weaponDmg(w) * playerDamageMul(false) * L.mul, tr: L.r });
  p.aim = a; p.lastAtk = G.time; p.recoilT = 0.09; SFX.play('shotgun', 0.7); G.shake = Math.max(G.shake, 5);
  Juice.shot(p, w, gunMuzzle(p, w).x, gunMuzzle(p, w).y, a);
  if (!p.glTold2) { p.glTold2 = true; log(`유탄 발사! ${L.cd}초마다 한 발씩 쏠 수 있다.`, '#ffd76a'); }
}
function glRecharge(p, dt) { // 들고 있지 않은 총도 쿨타임이 돎
  for (const s of ['w1', 'w2']) { const w = p.equip[s]; if (glOf(w) && w.glCd > 0) w.glCd = Math.max(0, w.glCd - dt); }
}

// 범위 폭발 (수류탄 / 폭발탄 공용)
function explode(x, y, dmg, r, opts = {}) {
  for (const e of G.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (e.hp > 0 && d < r + e.r && World.lineOfSight({ x, y }, e)) damageEnemy(e, dmg * (d < r * 0.45 ? 1 : 0.7), false, Math.atan2(e.y - y, e.x - x), { knock: opts.knock || 0, stagger: opts.stagger || 0, noProc: true, blast: true });
  }
  G.effects.push({ type: 'boom', x, y, t: 0, life: 0.4, r });
  SFX.playAt('boom', x, y, opts.small ? 0.4 : 1, 1400); // v1.35 위치 소리
  burst(x, y, '#ffb040', opts.small ? 12 : 30, opts.small ? 160 : 260, 0.5, 4);
  if (!opts.small) burst(x, y, '#555', 20, 120, 0.9, 6);
  G.shake = Math.max(G.shake, opts.small ? 4 : 12);
}

function useSkill(i) {
  const p = G.player, s = SKILLS[i];
  if (p.level < s.lvl) { log(`${s.name}: Lv${s.lvl}부터 배울 수 있습니다 (암시장 상인 박씨).`, '#aaa'); return; }
  if (!p.skills[s.id]) { log(`${s.name}: 아직 안 배웠다. 스킬 창(K)에서 배울 수 있다`, '#aaa'); SFX.play('empty'); return; } // v1.16
  if ((p.skillCd[i] || 0) > 0) return;
  SFX.play(s.id === 'heal' ? 'heal' : 'skill');
  const m = smod(s.id); // v1.11 스킬 갈래
  if (s.id === 'rapid') {
    p.buffs.rapid = SkillCalc.rapidDur(p); p.rapidExt = 0; floatText(p.x, p.y - 30, m === 'a' ? '정밀 사격!' : m === 'b' ? '탄약 보급!' : '집중 사격!', '#7fd');
    const w = curWeapon(); if (m === 'b' && w && !WEAPONS[w.key].melee) { w.loaded = magSize(w); p.reloadT = 0; }
  } else if (s.id === 'grenade') {
    const { x: tx, y: ty } = Iso.toWorld(input.mx, input.my);
    const a = Math.atan2(ty - p.y, tx - p.x), d = Math.min(380, Math.hypot(tx - p.x, ty - p.y));
    G.grenades.push({ sx: p.x, sy: p.y, x: p.x, y: p.y, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, t: 0, dur: 0.55, mod: m, echo: stree('grenade', 'cap') });
  } else if (s.id === 'heal') {
    const mh = PlayerStats.maxHp(p), amt = Math.round(mh * SkillCalc.healPct(p));
    const now = m === 'a' ? Math.round(amt / 2) : amt;
    p.hp = Math.min(mh, p.hp + now);
    if (m === 'a') { p.buffs.regen = 6; p.regenRate = amt / 6; }
    if (m === 'b') { p.buffs.shield = 4; G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.4, color: '#7ab8ff', r: 60 }); }
    floatText(p.x, p.y - 30, '+' + now, '#6f6', 16); burst(p.x, p.y, '#6f6', 16, 80);
    if (stree('heal', 'cap')) { p.invT = Math.max(p.invT || 0, 1.5); floatText(p.x, p.y - 46, '불굴', '#ffe08a', 13); } // v1.22
  } else if (s.id === 'turret') Turrets.place(p); // v1.26 엔지니어
  else if (s.id === 'adren') {
    if (stree('adren', 'cap')) { // v1.22 전장의 함성
      for (const e of G.enemies) {
        if (e.hp <= 0 || e.nest || Math.hypot(e.x - p.x, e.y - p.y) > 180 + e.r) continue;
        e.stunT = Math.max(e.stunT || 0, e.def.boss || e.fieldBoss || e.labBoss ? 0.4 : 1.5); e.state = 'chase'; Monsters.interrupt(e);
        floatText(e.x, e.y - e.r - 14, '기절', '#fff3a0', 12);
      }
      G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.4, color: '#ff8844', r: 180 }); G.shake = Math.max(G.shake, 6);
    }
    p.buffs.adren = SkillCalc.adrenDur(p); p.adrenExt = 0; floatText(p.x, p.y - 30, m === 'a' ? '광폭!' : m === 'b' ? '진통제!' : '아드레날린!', '#f84'); }
  p.skillCd[i] = s.cd * SkillCalc.cdMul(s.id) * (perk('warlord') ? 0.75 : 1) * (s.id === 'heal' && perk('fieldMedic') ? 0.7 : 1) * (armorLegend('focus') ? 0.82 : 1);
  (p.skillCdMax = p.skillCdMax || [])[i] = p.skillCd[i]; // v1.22 줄어든 재사용 대기 기준으로 칸 표시
}

function quickMedkit() {
  const it = G.player.inventory.find(i => i && i.key === 'medkit');
  if (!it) { log('구급상자가 없습니다.', '#aaa'); return; }
  useItem(it);
}

function useItem(it) {
  const p = G.player;
  if (it.key === 'medkit') {
    const mh = PlayerStats.maxHp(p);
    if (p.hp >= mh) { log('체력이 이미 가득합니다.', '#aaa'); return; }
    if ((p.medCd || 0) > G.time) { floatText(p.x, p.y - 34, `구급상자 ${Math.ceil(p.medCd - G.time)}초`, '#aaa', 12); SFX.play('empty'); return; } // v1.57 쿨타임
    p.medCd = G.time + MED_CD;
    const amt = Math.round(mh * 0.4 * (perk('fieldMedic') ? 1.5 : 1) * (pas('s4') ? 1.2 : 1) * (1 + gearBonus(p, 'medHeal')));
    p.hp = Math.min(mh, p.hp + amt);
    floatText(p.x, p.y - 30, '+' + amt, '#6f6', 16);
  } else if (it.key === 'ammo') {
    const [t, n] = giveAmmoUnits(p, 120); log(`${AMMO[t].name} +${n}`, '#cc8');
  } else if (CONSUMABLES[it.key].slot) { // v1.14 투척물·보조: 가방에서 누르면 그 칸에 선택
    const slot = CONSUMABLES[it.key].slot; p.gsel = p.gsel || {}; p.gsel[slot] = it.key;
    const on = Hotbar.autoAdd(it.key); log(`${it.name}${on ? `을(를) 벨트 ${G.player.hotbar.indexOf(it.key) + 1}번 칸에 올렸다.` : '. 벨트 칸이 가득 (B로 바꾸기)'}`, '#cfe'); // v1.50 벨트 = 소모품
  } else return;
  if (Math.random() < gearBonus(p, 'gadSave')) { floatText(p.x, p.y - 44, '절약', '#9fe0ff', 12); UI.refreshInventory(); return; } // v1.25 벨트 옵션
  it.count--;
  if (it.count <= 0) removeItem(it);
  UI.refreshInventory();
}

function addItem(it) {
  const inv = G.player.inventory;
  if (it.kind === 'cons') {
    const ex = inv.find(i => i && i.kind === 'cons' && i.key === it.key);
    if (ex) { ex.count += it.count; UI.refreshInventory(); if (it.key !== 'ammo' && G.player.hotbar) Hotbar.autoAdd(it.key); return true; }
  }
  if (inv.length >= Camp.bagSize()) return false;
  inv.push(it); Journal.onItem(it); // v1.15 도감
  if (it.kind === 'cons' && it.key !== 'ammo' && G.player.hotbar) Hotbar.autoAdd(it.key); // v1.50 새 소모품은 빈 벨트 칸에
  UI.refreshInventory();
  return true;
}
function removeItem(it) {
  const inv = G.player.inventory, i = inv.indexOf(it);
  if (i >= 0) inv.splice(i, 1);
  if (i >= 0 && it.att) { const back = Object.values(it.att).filter(Boolean); if (back.length) { inv.push(...back); it.att = null; log(`끼워 둔 부품 ${back.length}개는 가방으로 돌아왔다.`, '#9fd0ff'); } } // v1.50 총을 팔거나 분해해도 부품은 남김
}

function interact() {
  const npc = nearestNpc();
  if (npc) { UI.openNpc(npc); return; }
  if (Settlement.near(G.player)) { Settlement.take(); return; } // v1.43 캠프 사람들이 모아 둔 것
  const crate = Interiors.nearCrate();
  if (crate) { Interiors.openCrate(crate); return; }
  const sc = Raid.inRaid() && Scavenge.near(); // v1.4 뒤지기 · 시체 가방
  if (sc) { Scavenge.start(sc); return; }
  const l = Assault.available();
  if (l) Assault.choose(l);
}
function nearestNpc() {
  const p = G.player;
  let best = null, bd = 75;
  for (const n of G.npcs) { const d = dist(p, n); if (d < bd) { bd = d; best = n; } }
  return best;
}

function gainExp(n) {
  const p = G.player;
  if (p.level >= MAX_LEVEL) { p.exp = 0; return; }
  p.exp += n;
  while (p.level < MAX_LEVEL && p.exp >= PlayerStats.expNext(p.level)) {
    p.exp -= PlayerStats.expNext(p.level);
    p.level++;
    p.statPoints += 3;
    p.hp = PlayerStats.maxHp(p);
    p.sp = (p.sp || 0) + 1; // v1.25 스킬 포인트
    log(`레벨 업! Lv${p.level}. 능력치 포인트 +3, 스킬 포인트 +1 (C)`, '#ffd76a');
    SFX.play('levelup');
    const sk = SKILLS.find(s => s.lvl === p.level);
    if (sk) log(`새 스킬을 배울 수 있다: ${sk.name} (스킬 창 K, ${SKILL_SP.root} SP)`, '#7fd');
    const pt = PERK_TIERS.find(t => t.lvl === p.level); // v1.11 특성 선택
    if (pt) { UI.toast(`Lv${pt.lvl} 특성 선택`, `능력치 창(C)에서 ${pt.perks.map(k => k.name).join(' · ')} 중 하나`); log(`특성을 고를 수 있다: ${pt.perks.map(k => k.name).join(' · ')} (능력치 창 C)`, '#ffd76a'); }
    G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.8, color: '#ffd76a', r: 80 });
    floatText(p.x, p.y - 40, 'LEVEL UP!', '#ffd76a', 22);
    UI.buildHotbar(); UI.refreshStats();
    saveGame();
  }
  if (p.level >= MAX_LEVEL) p.exp = 0;
}

const PERFECT_DODGE = 0.2; // v1.65 구르기 시작 뒤 이 시간 안에 막은 공격 = 완벽 회피
function damagePlayer(dmg, srcX, srcY) {
  const p = G.player;
  if (p.dead || World.inSafe(p.x, p.y)) return;
  if (p.invT > 0) return; // v1.11 두 번째 숨 무적
  if (p.rollT > 0) { // 회피 무적
    if (G.time - (p.lastRoll || -9) < PERFECT_DODGE && p.perfRoll !== p.lastRoll) { // v1.65 완벽 회피: 구르기 시작 직후에 맞을 뻔함 → 잠깐 느려지고 3초 동안 피해 +30%
      p.perfRoll = p.lastRoll; p.buffs.perfect = 3; G.slowT = 0.45; p.dodgeTxt = G.time;
      floatText(p.x, p.y - 44, '완벽 회피!', '#7fe8ff', 18); SFX.play('item', 1.8); G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.5, color: '#7fe8ff', r: 70 });
      return;
    }
    if (G.time - (p.dodgeTxt || 0) > 0.4) { p.dodgeTxt = G.time; floatText(p.x, p.y - 30, '회피!', '#9fe0ff', 14); }
    return;
  }
  SFX.play('ehit');
  // v1.11 받는 피해 감소: 투쟁 본능 · 그림자 걸음 · 방어막 · 진통제
  let tk = 1;
  if (perk('lastStand') && p.hp < PlayerStats.maxHp(p) * 0.35) tk *= 0.85;
  if (perk('ghost') && G.time - ((p.lastRoll || -9) + ROLL.dur) < 1) tk *= 0.5;
  if (p.buffs.shield > 0) tk *= 0.6;
  if (p.buffs.adren > 0 && smod('adren') === 'b') tk *= 0.7;
  if (pas('s5')) tk *= 0.95; // v1.23 철벽
  if (p.buffs.stim > 0) tk *= 0.9; // v1.14 전투 자극제
  if (setOn('steel', 3) && p.hp >= PlayerStats.maxHp(p) * 0.5) tk *= 0.8; // v1.12 강철 부대 3세트
  if (wornUnique('shade') && G.time - ((p.lastRoll || -9) + ROLL.dur) < 1.5) tk *= 0.7; // 그림자 외피
  let d = Math.max(1, Math.round(dmg * tk * (1 - PlayerStats.dmgReduce(p))));
  if (p.plate > 0) { // v1.14 방탄판이 먼저 막음
    const ab = Math.min(p.plate, d); p.plate -= ab; d -= ab;
    if (p.plate <= 0) { floatText(p.x, p.y - 34, '방탄판 파손', '#7ab8ff', 12); SFX.play('metal', 0.8); }
    if (d <= 0) { p.lastHurt = G.time; floatText(p.x, p.y - 20, '막음', '#7ab8ff', 12); return; }
  }
  p.hp -= d; p.hurtT = 0.15; p.lastHurt = G.time;
  { // v1.17 맞은 방향 기록 (출처가 없으면 가장 가까운 쫓아오는 적)
    let sx = srcX, sy = srcY;
    if (sx === undefined) { let bd = 1e9; for (const e of G.enemies) { if (e.hp <= 0 || e.state !== 'chase') continue; const dd = dist(e, p); if (dd < bd) { bd = dd; sx = e.x; sy = e.y; } } }
    if (sx !== undefined) { G.hitDirs = G.hitDirs || []; G.hitDirs.push({ x: sx, y: sy, t: G.time }); if (G.hitDirs.length > 6) G.hitDirs.shift(); }
  }
  // v1.12 방어구 전설
  if (armorLegend('aegis') && G.time > (p.aegisCd || 0) && Math.random() < 0.2) { p.aegisCd = G.time + 10; p.buffs.shield = Math.max(p.buffs.shield || 0, 3); floatText(p.x, p.y - 44, '반응 장갑!', '#7ab8ff', 13); }
  if (armorLegend('thorns') && G.time > (p.thornCd || 0)) { p.thornCd = G.time + 0.3; for (const e of G.enemies) if (e.hp > 0 && dist(e, p) < 70 + e.r) damageEnemy(e, d * 0.8, false, angleTo(p, e), { knock: 6, noProc: true }); }
  if (armorLegend('survivor') && p.hp > 0 && p.hp < PlayerStats.maxHp(p) * 0.3 && G.time > (p.survCd || 0)) { p.survCd = G.time + 45; p.buffs.adren = Math.max(p.buffs.adren, 8); floatText(p.x, p.y - 44, '생존 본능!', '#f84', 14); SFX.play('skill'); }
  if (p.hp <= 0 && perk('secondWind') && p.raid && !p.raid.sw) { // 출격마다 한 번
    p.raid.sw = true; p.hp = Math.round(PlayerStats.maxHp(p) * 0.3); p.invT = 2;
    floatText(p.x, p.y - 40, '두 번째 숨!', '#9fe0ff', 18); SFX.play('levelup'); G.flash = 0.3; hitstop(0.15);
    G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.5, color: '#9fe0ff', r: 120 });
    return;
  }
  floatText(p.x, p.y - 20, '-' + d, '#ff5050', 14);
  G.shake = Math.max(G.shake, 4);
  if (p.hp <= 0) playerDie();
}

function playerDie() {
  const p = G.player;
  p.hp = 0; p.dead = true; input.down = false; p.deaths++;
  burst(p.x, p.y, '#a00', 30, 160, 0.8, 4);
  const rr = p.raid, msg = Raid.onDeath() || '캠프로 돌아갑니다.'; // v1.3: 이번 출격에서 주운 것만 잃음 · v1.4 시체 가방
  if (rr) { Raid.summary(false, rr, Raid.lastDeath.items); Journal.onMythSecured(Raid.lastDeath.kept || []); } // v1.69 장착해서 지킨 신화도 도감 등록
  log(`사망했습니다. ${msg}`, '#f55');
  document.querySelector('#death-screen p').textContent = msg;
  UI.closeAll();
  document.getElementById('death-screen').classList.remove('hidden');
  saveGame();
}

function respawn() {
  if (World.map !== 'camp') { Raid.toCamp(); document.getElementById('death-screen').classList.add('hidden'); saveGame(); return; } // 출격 맵에서 죽으면 캠프로
  const p = G.player, c = World.campCenter();
  p.x = c.x; p.y = c.y; p.dead = false; p.hp = PlayerStats.maxHp(p); p.reloadT = 0; p.hurtT = 0;
  p.buffs.rapid = 0; p.buffs.adren = 0; p.buffs.regen = 0; p.buffs.shield = 0; p.buffs.stim = 0; p.buffs.perfect = 0; p.plate = 0;
  G.enemies = G.enemies.filter(e => e.def.boss || dist(e, p) > 900);
  G.bullets = []; G.strikes = []; G.pools = [];
  document.getElementById('death-screen').classList.add('hidden');
}

// ---------------- 적 ----------------
// hit: { knock 넉백, stagger 경직(초), w 사용 무기, noProc 전설효과 미발동 }
function damageEnemy(e, dmg, crit, angle, hit = {}) {
  if (e.hp <= 0) return;
  if (e.invulnT > 0) { if (Math.random() < 0.15) floatText(e.x, e.y - e.r - 6, '무적', '#aaa', 12); return; } // 타이탄 페이즈 전환
  const p = G.player, w = hit.w;
  if (w && w.legend === 'execute' && e.hp < e.maxHp * 0.3) dmg *= 1.6;
  const bigE = e.elite || e.affix || e.fieldBoss || e.labBoss || e.nest || e.def.boss;
  if (perk('apex') && bigE) dmg *= 1.2; // v1.11
  if (setOn('rad', 3) && bigE) dmg *= 1.15; // v1.12 방사능 사냥꾼 3세트
  if ((e.markT || 0) > G.time) dmg *= 1.25; // v1.12 매의 표식
  if (e.armorMut) dmg *= 0.8; // v1.15 변형 규칙: 장갑
  if (!hit.noProc && ((e.windT || 0) > 0 || (e.aimT || 0) > 0)) { dmg *= 1.5; if (G.time - (e.gapTxt || -9) > 0.6) { e.gapTxt = G.time; floatText(e.x, e.y - e.r - 14, '빈틈!', '#ffd76a', 13); } } // v1.65 공격 준비 중(조준선·휘두르기 예고)인 적은 피해 +50%
  if (w && w.unique === 'hawk') e.markT = G.time + 5;
  if (w && w.unique === 'viper') e.slowT = G.time + 2;
  dmg = Math.max(1, Math.round(dmg));
  // v1.6 방패병: 정면(방패가 향한 쪽)에서 맞으면 피해 감소 (v1.7 80% → 65%). 폭발·경직 중·뒤/옆은 그대로
  if (e.def.shield && !hit.blast && angle !== undefined && e.stunT <= 0 && Math.abs(angDiff(angle, (e.face || 0) + Math.PI)) < 1.05) {
    dmg = Math.max(1, Math.round(dmg * 0.35));
    if (Math.random() < 0.3) floatText(e.x, e.y - e.r - 6, '막힘', '#9fb2c8', 12);
    SFX.play('metal', 0.6); burst(e.x + Math.cos(angle + Math.PI) * 12, e.y + Math.sin(angle + Math.PI) * 12, '#ffe0a0', 3, 120, 0.15, 2);
    e.hp -= dmg; e.hitT = 0.05; e.state = 'chase';
    if (!hit.noProc) { Juice.hit(e.hp <= 0); if (e.hp <= 0) SFX.play('hitmark'); } // v1.28 명중 표시
    if (e.hp <= 0) killEnemy(e);
    return;
  }
  if (e.def.cloak) e.revealT = 2.5; // 맞으면 잠시 드러남
  e.hp -= dmg; e.hitT = e.def.boss ? 0.05 : 0.1; e.state = 'chase';
  if (!hit.noProc) { Juice.hit(e.hp <= 0); if (e.hp <= 0) SFX.play('hitmark'); } // v1.28 명중 표시 (불길 같은 지속 피해는 제외)
  if (!hit.noProc && FACTION[e.type] !== 'machine' && angle !== undefined && Math.random() < 0.5) { // v1.28 맞은 반대쪽 바닥에 핏방울
    const d = e.r * rand(0.8, 2.2); G.decals.push({ x: e.x + Math.cos(angle) * d, y: e.y + Math.sin(angle) * d, r: rand(2, 4.5), a: rand(0, TAU), drop: true });
    if (G.decals.length > 150) G.decals.shift();
  }
  // 넉백·경직은 적의 무게에 반비례 (보스는 무시)
  const wt = e.weight ?? e.def.weight; // 네임드는 잘 밀리지 않음
  if (wt > 0 && angle !== undefined) {
    const k = (hit.knock || 3) / wt;
    e.kbx = (e.kbx || 0) + Math.cos(angle) * k * KB_RATE; e.kby = (e.kby || 0) + Math.sin(angle) * k * KB_RATE; // v1.49.7 밀려남: 한 번에 순간이동 → 0.15초 동안 미끄러짐 (거리는 같음)
    if (hit.stagger) e.stunT = Math.max(e.stunT, hit.stagger / wt);
  }
  if (e.hp > 0) Monsters.react(e, dmg, angle, hit); // v1.32 휘청 · 넘어짐
  const big = dmg >= e.maxHp * 0.25 || crit;
  SFX.play(crit ? 'crit' : FACTION[e.type] === 'machine' ? 'metal' : 'hit', 0.8);
  if (Settings.dmgNum) floatText(e.x, e.y - e.r - 6, crit ? dmg + '!' : '' + dmg, crit ? '#ffe14a' : e.def.boss ? '#ffb0ff' : '#fff', crit ? 19 : big ? 15 : 13); // v1.49.7 「치명타 123」 → 「123!」
  burst(e.x, e.y, FACTION[e.type] === 'machine' ? '#ffc' : '#8a1010', crit ? 9 : 4, crit ? 150 : 110, 0.35);
  if (crit) burst(e.x, e.y, '#fff3a0', 5, 180, 0.15, 2);
  if (e.def.boss && (crit || (hit.stagger || 0) >= 0.5)) { G.shake = Math.max(G.shake, 5); hitstop(0.035); }
  if (w && !hit.noProc) {
    if (w.legend === 'leech') p.hp = Math.min(PlayerStats.maxHp(p), p.hp + dmg * 0.04);
    const gun = !WEAPONS[w.key].melee; // v1.12 방사능 탄 (타이탄) · 방사능 사냥꾼 3세트
    if (gun && ((w.unique === 'titan' && Math.random() < 0.25) || (setOn('rad', 3) && Math.random() < 0.12))) { explode(e.x, e.y, dmg * 0.5, 48, { small: true, knock: 6, stagger: 0.1 }); burst(e.x, e.y, '#7fff6a', 8, 120, 0.3); }
    if (w.legend === 'boom' && Math.random() < 0.2) explode(e.x, e.y, dmg * 0.6 * (perk('demolition') ? 1.3 : 1), 55, { small: true, knock: 10, stagger: 0.15 });
    if (w.legend === 'chain' && crit) {
      let t = null, bd = 170;
      for (const o of G.enemies) { const dd = dist(o, e); if (o !== e && o.hp > 0 && dd < bd && World.lineOfSight(e, o)) { bd = dd; t = o; } }
      if (t) {
        G.effects.push({ type: 'zap', x: e.x, y: e.y, x2: t.x, y2: t.y, t: 0, life: 0.18 });
        damageEnemy(t, dmg * 0.5, false, angleTo(e, t), { knock: 4, noProc: true, w });
      }
    }
  }
  if (e.hp <= 0) {
    e.lastHit = { crit, melee: hit.melee, fin: hit.fin, blast: hit.blast || hit.blastKill, fire: hit.fire, heavy: (hit.knock || 0) >= 9 || (hit.stagger || 0) >= 0.3, a: angle, ally: hit.ally };
    killEnemy(e);
    if (w && w.legend === 'quickload' && w === curWeapon() && !hit.noProc) {
      w.loaded = magSize(w); p.reloadT = 0;
      floatText(p.x, p.y - 34, '장전!', '#ffd27a', 13);
    }
  }
}

// v1.9 처치 연출: 무엇으로 쓰러뜨렸는지에 따라 다르게 (치명타 · 폭발 · 근접 마무리)
function killFx(e) {
  const h = e.lastHit; if (!h || e.def.boss) return;
  const mech = FACTION[e.type] === 'machine', a = h.a || 0;
  if (h.fin) { // 근접 마무리: 맞은 방향으로 피 튀김 + 잠깐 멈춤
    for (let i = 0; i < 14; i++) { const aa = a + rand(-0.5, 0.5), sp = rand(120, 300); G.particles.push({ x: e.x, y: e.y, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, t: 0, life: rand(0.3, 0.6), color: mech ? '#ffd' : '#9a1010', size: rand(2, 4), z: 16 }); }
    hitstop(0.06); G.shake = Math.max(G.shake, 6);
  } else if (h.blast) { // 폭발·산탄 코앞: 그을음 + 불씨, 시체가 밀려남
    burst(e.x, e.y, '#ff9a3a', 12, 220, 0.5, 3); burst(e.x, e.y, '#333', 8, 90, 0.8, 5);
  } else if (h.crit) { // 치명타 처치: 금빛 고리 + 높은 소리
    G.effects.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.35, color: '#ffe14a', r: e.r * 3.5 });
    burst(e.x, e.y, '#fff3a0', 10, 200, 0.3, 2); SFX.play('crit', 1.2); hitstop(0.04);
  }
}

function killEnemy(e) {
  const p = G.player;
  if (!e.def.boss && !(e.lastHit && e.lastHit.ally) && G.time - (G.killStopT || -9) > 0.22) { G.killStopT = G.time; hitstop(0.02); G.shake = Math.max(G.shake, 2); } // v1.49.7 보통 처치도 아주 짧게 멈춤 (몰려올 때 끊기지 않게 0.22초에 한 번)
  // 보스 소환수는 경험치 20%, 드랍 없음 (보스 옆 무한 파밍 방지)
  // 연속 처치 콤보 (v0.16): 3초 안에 이어 잡으면 경험치 +5%씩 (최대 +50%)
  if (p.raid && !e.minion) p.raid.kills++;
  Companion.onKill(e); // v1.44 동료 레벨
  if (!e.minion) {
    G.combo = G.time - (G.comboT || -9) < 3 ? (G.combo || 0) + 1 : 1; G.comboT = G.time;
    if (G.combo >= 3) SFX.play('combo', G.combo);
    if (G.combo > p.bestCombo) p.bestCombo = G.combo;
    if (G.combo === 10 || G.combo === 25 || G.combo === 50) { UI.toast(`${G.combo} 연속 처치!`, `보너스 +${Math.round(G.combo * p.level * ECON.cr)}₵`); p.credits += Math.round(G.combo * p.level * ECON.cr); } // v1.25
  }
  { // v1.12 세트 · 고유 처치 효과
    const h = e.lastHit || {}, cw = curWeapon();
    if (setOn('vigil', 3)) p.vigilT = G.time + 3;
    if (h.crit && setOn('blacksun', 3)) { p.bsT = G.time + 2; if (cw && !WEAPONS[cw.key].melee) cw.loaded = Math.min(magSize(cw), (cw.loaded || 0) + 3); }
    if (h.melee && heldUnique('fang')) p.fangBuff = true;
    if (heldUnique('babel')) { const mh = PlayerStats.maxHp(p); p.hp = Math.min(mh, p.hp + mh * 0.03); }
  }
  if (e.lastHit && e.lastHit.melee && perk('brawler')) { const mh = PlayerStats.maxHp(p); p.hp = Math.min(mh, p.hp + mh * 0.04); } // v1.11 싸움꾼
  if (p.buffs.rapid > 0 && stree('rapid', 'cap') && (p.rapidExt || 0) < 4) { p.buffs.rapid += 0.6; p.rapidExt = (p.rapidExt || 0) + 0.6; } // v1.22 사냥 본능
  if (p.buffs.adren > 0 && smod('adren') === 'a' && (p.adrenExt || 0) < 8) { p.buffs.adren += 1.5; p.adrenExt = (p.adrenExt || 0) + 1.5; } // 광폭
  const comboMul = 1 + Math.min(0.5, Math.max(0, (G.combo || 1) - 1) * 0.05);
  SFX.play(e.def.boss || e.fieldBoss || e.elite ? 'roar' : 'kill', e.def.boss ? 1 : 0.8);
  const exp = Math.round((e.def.boss ? e.def.exp : e.def.exp * e.level) * PlayerStats.expMul(p) * (e.minion ? 0.2 : 1) * (e.expMul || 1) * comboMul * (p.raid ? 1.4 : 1) * (World.def && World.def.lab ? 1.5 : 1)); // v1.31 연구소: 적이 적어(분당 처치 3.2) 경험치 ×1.5 // 엘리트 4배 · v1.16 출격 맵 처치 경험치 ×1.4 (적이 무한히 나오지 않는 만큼)
  gainExp(Math.round(exp * ((curDiff() || {}).exp || 1))); // v1.66 난이도 경험치
  p.totalKills++;
  const ck = e.art && Sprites.get(e.art) ? e.art : e.type; // 보스 전용 그림이면 그 그림으로 쓰러짐
  if (Sprites.get(ck) && ART.sprites[ck].anims.death) {
    const h = e.lastHit || {}, a = h.a ?? 0, c = { key: ck, x: e.x, y: e.y, face: e.face || 0, t0: G.time, z: 0, vx: 0, vy: 0, vz: 0, kind: '' };
    // v1.32 죽는 모습: 폭발 = 날아가며 돎 · 강한 한 방 = 뒤로 미끄러짐 · 불 = 검게 그을림 · 근접 마무리 = 빨리 쓰러짐 · 드론 = 떨어지며 연기
    if (e.def.flying) { c.kind = 'fall'; c.z = 34; }
    else if (h.fire) c.kind = 'burn';
    else if (h.blast && !e.def.boss) { c.kind = 'blast'; const sp = 170 / Math.max(0.7, e.weight ?? e.def.weight); c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp; c.vz = 150; c.spin = (Math.random() < 0.5 ? -1 : 1) * rand(5, 9); }
    else if (h.heavy || h.crit) { c.kind = 'slide'; c.vx = Math.cos(a) * 150; c.vy = Math.sin(a) * 150; }
    else if (h.fin) c.kind = 'fin';
    G.corpses.push(c);
    if (G.corpses.length > 30) G.corpses.shift();
  }
  if (FACTION[e.type] !== 'machine') G.decals.push({ x: e.x, y: e.y, r: e.r * rand(1, 1.6), a: rand(0, TAU) });
  if (G.decals.length > 150) G.decals.shift();
  burst(e.x, e.y, FACTION[e.type] === 'machine' ? '#aab' : '#7a0d0d', e.def.boss ? 60 : 18, e.def.boss ? 260 : 170, 0.6, 4);
  G.effects.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.3, color: FACTION[e.type] === 'machine' ? '#cde' : '#fff', r: e.r * 2.5 });
  if (e.type === 'brute') hitstop(0.06);
  if (e.def.boss) hitstop(0.3);
  if (e.volatile) Monsters.strike(e.x, e.y, 70, 0.8, e.dmg * 1.5, 'rgba(255,120,40,'); // v1.15 변형 규칙: 폭발
  killFx(e);
  // 퀘스트
  Story.onKill(e);
  Journal.onKill(e); // v1.15 도감
  Bounty.onKill(e); // v0.14 일일 의뢰
  // 드랍
  const dropAt = (kind, extra) => G.drops.push({ x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), kind, t: 0, ...extra });
  if (e.def.boss) {
    p.bossKills++;
    G.boss = null; G.bossT = p.raid ? 1e9 : 240; // v1.16 출격당 한 번
    log('방사능 군주 타이탄을 쓰러뜨렸다! 서울에 희망이 비친다.', '#ffa53a');
    G.shake = 20;
    dropAt('credits', { amount: 3000 + randInt(0, 2000) });
    for (let i = 0; i < 3; i++) dropAt('item', { item: randomGear(20, 2.5) });
    rollUnique('titan', 20, dropAt); // v1.12
    rollMyth('titan', e.level, dropAt); // v1.53 신화
    dropAt('item', { item: makeConsumable('medkit', 5) });
    Workshop.gain(30, 8, '타이탄 잔해 회수');
    // 보스 소환수 정리
    for (const o of G.enemies) if (o.minion) o.hp = 0;
    return;
  }
  if (e.minion) return;
  if (e.fieldBoss) Bosses.onFieldKill(e, dropAt);
  if (e.labBoss) Bosses.onLabKill(e, dropAt);
  RaidEvents.onKill(e, dropAt); // v1.10 둥지
  Pop.onKill(e, dropAt); // v1.17 소탕
  if (e.elite) { // 네임드: 장비 확정 + 크레딧
    G.elite = null;
    log(`${ELITES[e.elite].name} 처치!`, '#ffa53a');
    if (Math.random() < 0.5) dropAt('item', { item: randomGear(e.level, 1.5, 2, ZONES[World.zoneIndex(e.x, e.y)].gear) }); // v1.25 확정 → 50%
    dropAt('credits', { amount: e.level * 40 });
    rollUnique(e.elite, e.level, dropAt); // v1.12 레이븐 · 바벨
    if (e.elite === 'babel') rollMyth('babel', e.level, dropAt); // v1.53 신화
    if (e.elite === 'babel' && p.raid && p.raid.diff === 1 && !p.hellOpen) { p.hellOpen = true; UI.toast('헬 난이도 개방', '잠실을 「헬」로 출격할 수 있다 (출격 지도)'); log('하드 바벨을 쓰러뜨렸다 — 잠실 헬 난이도가 열렸다.', '#ff4a4a'); } // v1.66
    if (Math.random() < 0.15) dropAt('item', { item: randomAttach(e.level) }); // v1.50 부품 · v1.51 30% → 15%
    hitstop(0.12); G.shake = Math.max(G.shake, 10);
  }
  { const D = curDiff(); if (D && D.elite && (e.affix || e.fieldBoss) && !e.minion) rollMyth('hard', e.level, dropAt); } // v1.66 하드·헬: 엘리트·필드 보스도 신화 (낮은 확률)
  if (e.affix) { // 엘리트: 사망 효과 + 추가 보상
    Monsters.onDeath(e);
    dropAt('credits', { amount: e.level * 12 });
    if (Math.random() < 0.12 * ECON.gear) dropAt('item', { item: randomGear(e.level, 1.2, 0, ZONES[World.zoneIndex(e.x, e.y)].gear) });
  }
  if (Math.random() < 0.75) dropAt('credits', { amount: Math.round(e.level * rand(2, 5) * (e.type === 'brute' ? 3 : 1)) });
  if (Math.random() < 0.34) dropAt('ammo', { amount: randInt(15, 35) }); // v1.33 0.28 → 0.34 (탄약이 4종으로 나뉘어 권총도 탄이 필요)
  if (Math.random() < 0.05) dropAt('item', { item: makeConsumable('medkit', 1) });
  if (Math.random() < (e.affix ? 0.025 : e.type === 'brute' ? 0.008 : 0.002)) dropAt('item', { item: randomAttach(e.level) }); // v1.50 부품 · v1.51 낮춤 (엘리트 6→2.5% · 거구 2→0.8% · 보통 0.6→0.2%)
  // 장비 드랍: 일반은 흔하게, 희귀 이상은 가끔. 깊은 지역일수록 좋은 등급 확률 증가
  const gearChance = e.assault || e.fieldBoss || e.labBoss ? 0 : e.type === 'brute' ? 0.04 : 0.015; // v0.10 드랍률 하향 (어설트 적은 보상 상자로 대체) · v1.5.1 (0.05/0.11 → 0.03/0.07) · v1.7.1 (→ 0.015/0.04, 대신 등급 상향)
  const zoneBonus = Math.max(0, World.zoneIndex(e.x, e.y) - 1) * 0.15;
  if (Math.random() < gearChance * ECON.gear * (perk('treasure') ? 1.25 : 1)) { // v1.25 ×0.3
    const it = randomGear(e.level, 0.4 + zoneBonus + (e.type === 'brute' ? 0.6 : 0) + ((curDiff() || {}).gear || 0), p.pity >= PITY_DROPS ? 3 : 0, ZONES[World.zoneIndex(e.x, e.y)].gear); // v1.66 난이도 장비 등급
    p.pity = it.rarity >= 3 ? 0 : p.pity + 1;
    dropAt('item', { item: it });
  }
}

function spawnEnemyBullet(e, a, speed, dmg, color = '#ff6a4a', r = 3) {
  G.bullets.push({ x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    from: 'e', life: 1.6, dmg, color, r });
}

function tryMoveSmart(e, a, step) {
  const tries = [0, e.sideDir * Math.PI / 4, e.sideDir * Math.PI / 2, -e.sideDir * Math.PI / 4, -e.sideDir * Math.PI / 2];
  if (e.def.flying) { // 드론: 낮은 장애물은 넘지만 건물 위에는 머물지 않음 (건물 위에서 맞지 않고 쏘는 문제)
    for (const off of tries) {
      const nx = e.x + Math.cos(a + off) * step, ny = e.y + Math.sin(a + off) * step;
      if (!World.inSafe(nx, ny) && !World.solidAt(nx, ny)) { e.x = nx; e.y = ny; return; }
    }
    e.sideDir *= -1;
    return;
  }
  step *= World.slow(e.x, e.y); // v1.6 물속은 느림
  for (const off of tries) {
    const aa = a + off, dx = Math.cos(aa) * step, dy = Math.sin(aa) * step;
    if (World.inSafe(e.x + dx, e.y + dy)) continue;
    const ox = e.x, oy = e.y;
    World.move(e, dx, dy);
    if (Math.hypot(e.x - ox, e.y - oy) > step * 0.5) return;
  }
  e.sideDir *= -1;
}

function updateBoss(e, dt, d) {
  const p = G.player, ph = Bosses.titanPhase(e), rage = ph === 3 ? 1.6 : ph === 2 ? 1.25 : 1;
  Bosses.updateTitan(e, dt); // v0.10 페이즈 패턴
  if (e.invulnT > 0) return;
  e.bossT1 -= dt * rage; e.bossT2 -= dt; e.bossT3 -= dt * rage;
  if (e.state !== 'chase') return;
  if (e.bossT1 <= 0) {
    e.bossT1 = 3.2;
    const n = rage > 1 ? 24 : 16, off = rand(0, TAU);
    for (let i = 0; i < n; i++) spawnEnemyBullet(e, off + i / n * TAU, 260, e.dmg * 0.6, '#ff9a3a', 5); // v1.64 초록 → 주황 (적 탄은 늘 빨강·주황)
  }
  if (e.bossT2 <= 0) {
    e.bossT2 = 9;
    const minions = G.enemies.filter(o => o.minion).length;
    for (let i = 0; i < 3 && minions + i < 9; i++) {
      const m = makeEnemy(pick(['zombie', 'dog']), e.x + rand(-60, 60), e.y + rand(-60, 60), 17);
      if (World.circleBlocked(m.x, m.y, m.r)) continue;
      m.minion = true; m.state = 'chase';
      G.enemies.push(m);
    }
    floatText(e.x, e.y - 50, '크아아아!', '#7fff6a', 18);
  }
  if (e.bossT3 <= 0 && e.charge <= 0 && d < 500) {
    e.bossT3 = 6; e.charge = 1.3; e.chargeA = angleTo(e, p);
  }
}

function updateEnemies(dt) {
  const p = G.player, pSafe = World.inSafe(p.x, p.y);
  Monsters.auras();
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    if (e.nest) { RaidEvents.nestTick(e, dt, dist(e, p)); continue; } // v1.10 변이 둥지 (움직이지 않음)
    if (e.regenMut) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.02 * dt); // v1.15 변형 규칙: 재생
    if (e.state !== 'chase' && !e.def.boss && !e.fieldBoss && !e.labBoss && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) > 2200) continue; // v1.16 멀리 있는 적은 쉼 (사라지지 않음)
    e.atkT -= dt; e.fireT -= dt; e.hitT -= dt; e.buffT = (e.buffT || 0) - dt; e.revealT = (e.revealT || 0) - dt;
    const d = dist(e, p);
    e.flinchT = (e.flinchT || 0) - dt; e.downT = (e.downT || 0) - dt; // v1.32 휘청 · 넘어짐
    if (e.kbx || e.kby) { const mx = e.kbx * dt, my = e.kby * dt; if (e.def.flying) { if (!World.solidAt(e.x + mx, e.y + my)) { e.x += mx; e.y += my; } } else World.move(e, mx, my); const f = Math.exp(-KB_RATE * dt); e.kbx *= f; e.kby *= f; if (Math.abs(e.kbx) + Math.abs(e.kby) < 3) e.kbx = e.kby = 0; }
    if (e.stunT > 0) { e.stunT -= dt; e.state = 'chase'; e.fireT = Math.max(e.fireT, 0.2); Monsters.interrupt(e); continue; } // 경직: 이동·공격 불가, 준비 중인 공격 끊김
    const same = Interiors.sameSpace(e); // 건물 안팎이 다르면 쫓지 않음 (벽 너머 길찾기 없음)
    if (!p.dead && !pSafe && same && d < e.def.aggro) e.state = 'chase';
    else if (e.state === 'chase' && (p.dead || pSafe || d > e.def.aggro * (e.heard ? 2.6 : 1.7) || (!same && Nav.dist && Nav.dist[Math.floor(e.y / TILE) * World.W + Math.floor(e.x / TILE)] < 0))) e.state = 'idle'; // 길이 없을 때만 포기
    if (e.assault && !p.dead) e.state = 'chase'; // 어설트 적은 항상 추격
    if (e.state === 'chase' && e.prevSt !== 'chase' && !e.minion && G.time - (e.spotT || -99) > 8) { e.spotT = G.time; Juice.spot(e, d); Monsters.packAlert(e); } // v1.29 처음 알아챔: 「!」 + 울음
    e.prevSt = e.state; e.alertT = (e.alertT || 0) - dt;
    if (e.state === 'chase' && !e.def.flying && d < 520 && (e.stepT = (e.stepT || 0) - dt) <= 0) { e.stepT = e.type === 'brute' ? 0.55 : e.type === 'dog' ? 0.22 : 0.4; Juice.step(e, d); } // v1.29 다가오는 발소리
    if (e.def.boss) updateBoss(e, dt, d);
    if ((e.elite || e.patterns) && e.state === 'chase') Monsters.updateNamed(e, dt);
    if (e.affix && e.state === 'chase' && !e.announced) { e.announced = true; log(`${ICON('warn')} 엘리트: ${ELITE_AFFIXES[e.affix].name} ${e.def.name} (${ELITE_AFFIXES[e.affix].desc})`, ELITE_AFFIXES[e.affix].color); }

    if (e.charge > 0) {
      // 보스 돌진 (0.5초 예고 후 질주)
      e.charge -= dt;
      if (e.charge < 0.8) {
        tryMoveSmart(e, e.chargeA, 340 * dt); // v1.33 430 → 340 (이동 감속에 맞춰)
        if (d < e.r + p.r + 4 && e.atkT <= 0) { damagePlayer(e.dmg * 1.4); e.atkT = 0.8; }
      }
      continue;
    }

    if (e.state === 'chase') {
      const a = angleTo(e, p);
      if (e.def.shield && !e.bossName) { const df = angDiff(a, e.face || 0), tr = 2.2 * dt; e.face = (e.face || 0) + clamp(df, -tr, tr); } // v1.6 방패병은 천천히 돌아섬 → 회피로 뒤를 잡을 수 있음
      else e.face = a;
      let moveA = a, spd = e.speed * Monsters.buff(e) * ((e.slowT || 0) > G.time ? 0.65 : 1); // v1.12 독사 둔화
      const hold = !e.def.boss && Monsters.attack(e, dt, d, a); // v0.16 예고 공격 (예고·도약 중엔 정지)
      // 시야가 막혔으면 길찾기 지도를 따라 건물을 돌아서 접근 (드론은 날아서 직선)
      const seen = e.def.flying || d < 70 || World.lineOfSight(e, p);
      if (!seen) { const na = Nav.dir(e); if (na !== null) moveA = na; }
      if (e.def.ranged) {
        const los = World.lineOfSight(e, p);
        if (los && d < e.def.range * 0.55) moveA = a + Math.PI;
        else if (los && d < e.def.range * 0.9) { moveA = a + e.sideDir * Math.PI / 2; spd *= 0.6; }
        else if (!los && !e.def.flying) { const na = Nav.dir(e); if (na !== null) moveA = na; }
        if (Math.random() < dt * 0.4) e.sideDir *= -1;
      }
      const ta = hold ? moveA : Monsters.tactics(e, dt, d, a, moveA, seen); // v1.32 엄폐 · 우회 · 무리
      if (!hold && ta !== null && d > e.r + p.r + 2) tryMoveSmart(e, ta, spd * (e.tac === 'cover' ? 1.15 : 1) * dt);
      if (e.def.boss && d < e.r + p.r + 8 && e.atkT <= 0) {
        e.atkT = e.def.atkCd * (e.atkMul || 1); e.lastAtk = G.time;
        damagePlayer(e.dmg * Monsters.buff(e), e.x, e.y);
      }
    } else if (!Monsters.infight(e, dt)) { // 플레이어가 없으면 다른 세력과 싸움, 아니면 배회
      e.wanderT -= dt;
      if (e.wanderT <= 0) { e.wanderT = rand(1.5, 4); e.wanderA = rand(0, TAU); e.wandering = Math.random() < 0.6; if (Math.random() < 0.7) Monsters.packWander(e); } // v1.32 감염체는 무리 쪽으로
      if (e.wandering) { tryMoveSmart(e, e.wanderA, e.speed * 0.35 * dt); e.face = e.wanderA; }
    }
  }
  // 서로 밀어내기
  const es = G.enemies;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j];
    const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, dd = dx * dx + dy * dy;
    if (dd > 0 && dd < rr * rr) {
      const dl = Math.sqrt(dd), push = (rr - dl) / 2, nx = dx / dl, ny = dy / dl;
      if (!a.def.boss && !a.def.turret) World.move(a, -nx * push, -ny * push); // 포탑은 고정
      if (!b.def.boss && !b.def.turret) World.move(b, nx * push, ny * push);
    }
  }
  G.enemies = G.enemies.filter(e => e.hp > 0);
}

function spawnEnemies(dt) {
  const p = G.player;
  G.spawnT -= dt;
  if (G.spawnT > 0 || G.assault || World.map === 'camp') return; // 어설트 중·캠프에는 일반 스폰 없음
  if (Pop.cells.length || p.raid) { Pop.update(dt + 0.35); G.spawnT = 0.35; return; } // v1.16 출격 맵: 정해진 인구만 (무한 스폰 없음)
  if (G.boss && G.boss.hp > 0 && dist(G.boss, p) < 1100) return; // v1.7 타이탄과 싸우는 중엔 일반 스폰 없음 (소환수만) — 봇 측정 사망 원인 1위가 끼어든 변이 거한
  const al = RaidEvents.alert || 0; // v1.10 경보 단계: 출현 빨라지고 밀도 ↑
  G.spawnT = 0.35 / (1 + al * 0.35);
  // 먼 적 정리
  G.enemies = G.enemies.filter(e => e.def.boss || e.minion || e.elite || e.fieldBoss || e.labBoss || e.evGuard || e.keyCarrier || dist(e, p) < 1800 || e.state === 'chase');
  if (G.elite && G.elite.hp <= 0) G.elite = null;
  const z = World.zoneIndex(p.x, p.y);
  const near = G.enemies.filter(e => !e.def.boss && !e.nest && dist(e, p) < 1300).length;
  const target = Math.round((z === 0 ? 8 : 18 + Math.min(z, 4) * 4) * (1 + al * 0.15)); // v0.16 밀도 상향 (14+z·3 → 18+z·4) · v1.7 연구소·강남·잠실(z 5~7)은 여의도 밀도로 상한 (최대 46 → 34)
  if (near >= target) return;
  for (let tries = 0; tries < 6; tries++) {
    const a = rand(0, TAU), r = rand(560, 950);
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (World.circleBlocked(x, y, 22) || World.inSafe(x, y) || World.buildingAt(x, y)) continue; // 실내 적은 입장 시 따로
    if (G.exits && G.exits.some(q => Math.hypot(q.x - x, q.y - y) < 260)) continue; // 탈출 지점 바로 앞은 비움
    const zi = z, zone = ZONES[zi];
    // 맵 가운데(랜드마크)에 가까울수록 레벨 상승
    const t = clamp(1 - Math.hypot(x / TILE - World.cx, y / TILE - World.cy) / (World.W * 0.55), 0, 1);
    const lvl = clamp(Math.round(lerp(zone.lvl[0], zone.lvl[1], t) + rand(-1, 1)), zone.lvl[0], zone.lvl[1]);
    const type = weighted(zone.spawns), e = makeEnemy(type, x, y, lvl);
    if (Math.random() < Monsters.eliteChance(zi) + (al >= 2 ? 0.04 : 0)) Monsters.makeElite(e, Monsters.rollAffix(type)); // v0.8 엘리트 · v1.10 경보 2단계부터 +4%
    G.enemies.push(e);
    // 지역 특성: 무리 지어 출몰
    const pk = zone.packs && zone.packs[type];
    if (pk) for (let i = 1, n = randInt(pk[0], pk[1]); i < n; i++) {
      const ox = x + rand(-70, 70), oy = y + rand(-70, 70);
      if (!World.circleBlocked(ox, oy, e.r) && !World.inSafe(ox, oy)) G.enemies.push(makeEnemy(type, ox, oy, lvl));
    }
    return;
  }
}

function updateBossSpawn(dt) {
  const p = G.player;
  if (G.bossT > 0) G.bossT -= dt;
  if (!World.bossTile) return; // 타이탄은 여의도에만
  const bx = World.bossTile.x * TILE + TILE / 2, by = World.bossTile.y * TILE + TILE / 2;
  if (!G.boss && G.bossT <= 0 && Math.hypot(p.x - bx, p.y - by) < 1000) {
    G.boss = makeEnemy('boss', bx, by, 20);
    G.enemies.push(G.boss);
    log('대지가 흔들린다... 방사능 군주 타이탄이 모습을 드러냈다!', '#c7f');
    UI.sms('[서울특별시] 영등포구 초대형 변이체 출현. 지진동 감지. 즉시 실내 대피 바랍니다.'); // v1.56
  }
  if (G.boss && G.boss.hp <= 0) G.boss = null;
}

// ---------------- 지역: 랜드마크 발견 / 방사능 ----------------
function updateLandmarks() {
  const p = G.player;
  for (const l of World.landmarks) {
    if (p.found.includes(l.id) || dist(p, l) > l.size * TILE / 2 + 170) continue;
    p.found.push(l.id);
    p.credits += l.credits;
    log(`랜드마크 발견: ${l.name}! (EXP +${fmt(l.exp)}, +${fmt(l.credits)}₵)`, '#ffd76a');
    floatText(p.x, p.y - 44, `★ ${l.name} 발견`, '#ffd76a', 18);
    G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 1, color: '#ffd76a', r: 120 });
    gainExp(l.exp);
    if (ASSAULTS[l.id]) log(`  이곳에서 [E]로 어설트 「${ASSAULTS[l.id].name}」를 시작할 수 있습니다.`, '#ff9a5a');
    saveGame();
  }
}

// 방사능 웅덩이 안에 있으면 0.5초마다 최대 체력의 1.5% 피해 (방어력 무시)
function updateRadiation(dt) {
  const p = G.player;
  const inside = World.hazards.some(h => Math.hypot(p.x - h.x, p.y - h.y) < h.r);
  p.inRad = inside;
  if (!inside) { p.radT = 0; return; }
  p.radT -= dt;
  if (p.radT > 0) return;
  p.radT = 0.5;
  if (armorLegend('filter') || setOn('rad', 2)) return; // v1.12 정화 필터 · 방사능 사냥꾼 2세트
  const hel = p.equip.helmet, res = hel ? HELMETS[hel.key].radRes || 0 : 0; // 방독면
  const d = Math.max(1, Math.round(PlayerStats.maxHp(p) * 0.015 * (1 - res)));
  p.hp -= d;
  floatText(p.x, p.y - 20, `방사능 -${d}`, '#ffb040', 13); // v1.66 받는 피해 = 주황
  if (p.hp <= 0) playerDie();
}

// ---------------- 투사체 / 수류탄 / 드랍 ----------------
// v1.66 화면에 그려진 적 그림 사각형 (발 기준 위로 키만큼) 안에 마우스가 있으면 그 적 · 위쪽 22% = 머리
const MOBILE_HS_T = 0.45; // v1.69 모바일 헤드샷 조준 시간(초)
function enemyScreenH(e) { const k = e.art && ART.height[e.art] ? e.art : e.type; return (ART.height[k] || 44) * (ART.charScale || 1) * (k === e.type ? (e.scale || 1) : 1); }
function hoverEnemy(mx, my) {
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    if (e.hp <= 0 || (typeof enemyCloaked === 'function' && enemyCloaked(e))) continue;
    const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y), H = enemyScreenH(e), W = Math.max(e.r * 2.4, H * 0.45);
    if (mx < sx - W / 2 || mx > sx + W / 2 || my < sy - H - 4 || my > sy + 6) continue;
    const d = Math.abs(mx - sx) + Math.abs(my - (sy - H / 2));
    if (d < bd) { bd = d; best = { e, head: my < sy - H * 0.78 && H >= 30 }; }
  }
  return best;
}
function updateBullets(dt) {
  const p = G.player;
  for (const b of G.bullets) {
    b.life -= dt;
    const sp = Math.hypot(b.vx, b.vy) * dt, steps = Math.max(1, Math.ceil(sp / 10));
    for (let s = 0; s < steps && b.life > 0; s++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      if (World.solidAt(b.x, b.y)) {
        b.life = 0; if (b.from === 'p') Juice.wall(b.x, b.y, Math.atan2(b.vy, b.vx)); else burst(b.x, b.y, '#ccb', 3, 70, 0.2, 2); break; // v1.40 벽 맞음
      }
      if (b.from === 'p') {
        for (const e of G.enemies) {
          if (e.hp <= 0 || b.hit.includes(e)) continue;
          if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + 3) ** 2) {
            b.hit.push(e);
            // 산탄총·기관단총: 사거리 후반부 피해 감소 (최대 -50%)
            const fall = b.falloff ? clamp(1 - Math.max(0, (1 - b.life / b.maxLife) - 0.5), 0.5, 1) : 1;
            const wb = b.w && WEAPONS[b.w.key];
            // v1.9 산탄총 코앞 사격: 크게 밀치고 경직
            const pb = wb && wb.pellets && b.maxLife - b.life < 0.1;
            Juice.impact(e, b, Math.atan2(b.vy, b.vx), b.crit); // v1.40 타격감
            let hs = 1; if (b.headOf === e) { hs = (e.def.boss || e.elite || e.fieldBoss || e.labBoss) ? 1.25 : 1.5; if (G.time - (e.hsTxt || -9) > 0.35) { e.hsTxt = G.time; floatText(e.x, e.y - (ART.height[e.art || e.type] || 44) - 8, '헤드샷!', '#ff5a4a', 15); SFX.play('headshot'); } if (b.w && WEAPONS[b.w.key] && WEAPONS[b.w.key].hsMul) hs *= WEAPONS[b.w.key].hsMul; } // v1.66 헤드샷 (보스 ×1.25) · v1.68 F-20 ×2
            damageEnemy(e, b.dmg * fall * hs, b.crit, Math.atan2(b.vy, b.vx), { knock: wb ? wb.knock * (pb ? 2.2 : 1) : 3, stagger: wb ? wb.stagger + (pb ? 0.2 : 0) : 0, w: b.w, blastKill: pb, ally: b.ally });
            if (b.mark) e.markT = G.time + 5; // v1.44 윤 저격수 전용: 표적 지정
            if (wb && wbase(wb.key) === 'sniper') hitstop(0.045);
            if (b.frag) explode(e.x, e.y, b.dmg * 0.6, 50, { small: true, knock: 8, stagger: 0.1 }); // v1.12 레이븐 파편
            if (b.pierce-- <= 0) { b.life = 0; break; }
          }
        }
      } else {
        if (World.inSafe(b.x, b.y)) { b.life = 0; break; }
        if (!p.dead && (p.x - b.x) ** 2 + (p.y - b.y) ** 2 < (p.r + (b.r || 3)) ** 2) {
          damagePlayer(b.dmg, b.x - b.vx * 0.6, b.y - b.vy * 0.6); b.life = 0; break; // v1.17 날아온 방향
        }
      }
    }
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
}

function updateGrenades(dt) {
  const p = G.player, later = [];
  for (const g of G.grenades) {
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    g.x = lerp(g.sx, g.tx, k); g.y = lerp(g.sy, g.ty, k); g.h = Math.sin(k * Math.PI) * 40;
    if (k >= 1) {
      g.done = true;
      if (g.kind) { Gadgets.land(g); continue; } // v1.14 화염병 · 섬광탄
      if (g.tdmg) { explode(g.x, g.y, g.tdmg, g.tr, { small: true, knock: 14, stagger: 0.3 }); continue; } // v1.26 박격 포탑
      const base = SkillCalc.grenadeDmg(p) * (p.buffs.adren > 0 ? 1 + SkillCalc.adrenDmg(p) : 1) * (perk('demolition') ? 1.3 : 1);
      const dmg = base * (g.child ? 0.35 : g.mod === 'b' ? 0.8 : 1) * (g.second ? 0.5 : 1), r = SkillCalc.grenadeR(p) * (g.child ? 0.55 : g.second ? 0.8 : 1);
      if (g.echo && !g.child) later.push({ sx: g.x, sy: g.y, x: g.x, y: g.y, tx: g.x, ty: g.y, t: 0, dur: 1, second: true }); // v1.22 연쇄 폭발
      explode(g.x, g.y, dmg, r, { knock: g.child ? 12 : 30, stagger: g.child ? 0.2 : 0.6, small: g.child });
      hitstop(g.child ? 0.02 : 0.05);
      if (g.mod === 'a' && !g.child && !g.second) for (let i = 0; i < 4; i++) { // v1.11 집속탄
        const a = i / 4 * TAU + rand(-0.4, 0.4), d = rand(55, 90);
        later.push({ sx: g.x, sy: g.y, x: g.x, y: g.y, tx: g.x + Math.cos(a) * d, ty: g.y + Math.sin(a) * d, t: 0, dur: 0.35, child: true });
      }
      if (g.mod === 'b' && !g.child && !g.second) G.fires.push({ x: g.x, y: g.y, r: r * 0.85, t: 0, life: 4, tick: 0, dmg: base * 0.22 * 0.5 }); // 소이탄 (0.5초마다)
    }
  }
  G.grenades = G.grenades.filter(g => !g.done).concat(later);
  // v1.11 소이탄 불길: 0.5초마다 안의 적에게 피해
  for (const f of G.fires) {
    f.t += dt; f.tick -= dt;
    if (f.tick <= 0) { f.tick = 0.5; for (const e of G.enemies) if (e.hp > 0 && Math.hypot(e.x - f.x, e.y - f.y) < f.r + e.r) damageEnemy(e, f.dmg, false, undefined, { noProc: true, blast: true, fire: true }); }
  }
  G.fires = G.fires.filter(f => f.t < f.life);
}

// v1.7.1 장비가 땅에 닿는 순간의 연출 — 드랍이 귀해진 만큼 등급별로 확실하게
// v1.12 보스 고유 장비 굴림: 기본 확률 + 못 얻을 때마다 +3% (얻으면 초기화)
// v1.53 신화 무기: 정해진 곳에서만 낮은 확률 (못 얻을 때마다 확률 +pity) · 레벨 제한이 높아 미리 주워 둘 수도 있음
// v1.61.2 시험용 (MYTH_TEST): 새 게임·불러오기 모두 바로 Lv26 + 신화 3종 (가방, 꽉 차면 창고) · 한 번만
function mythTestGrant(P) {
  if (!MYTH_TEST || !P) return false;
  if (P.level < 26) { const n = 26 - P.level; P.level = 26; P.exp = 0; P.statPoints = (P.statPoints || 0) + n * 3; P.sp = (P.sp || 0) + n; P.hp = PlayerStats.maxHp(P); }
  if (P.mythTestGot) return false;
  P.mythTestGot = true; P.stash = P.stash || [];
  for (const k of Object.keys(WEAPONS).filter(k => WEAPONS[k].myth)) { const w = makeMyth(k, P.level); w.isNew = true; if (P.inventory.length < Camp.bagSize()) P.inventory.push(w); else P.stash.push(w); }
  setTimeout(() => { if (G.player !== P) return; UI.toast('시험 모드: Lv26 · 신화 무기 3종', '가방(꽉 차면 창고)에 래피드 블래스터 · F-20 · OX-20 · 능력치(C)·스킬(K) 포인트도 같이'); log('시험 모드: Lv26 · 신화 무기 3종을 받았다.', '#ff8a3d'); UI.refreshInventory(); }, 2000);
  return true;
}
function makeMyth(key, level) { const w = makeWeapon(key, Math.max(level, WEAPONS[key].lvl), 5); w.name = WEAPONS[key].name; return w; }
function rollMyth(src, level, dropAt) {
  const p = G.player, DF = curDiff(), D = src === 'hard' ? DF && DF.elite : MYTH_DROP[src]; // v1.66 하드·헬 엘리트 신화
  if (!MYTH_LIVE || !D) return false;
  const dm = src === 'hard' ? 1 : DF ? DF.myth : 1; // v1.66 난이도 배율 (바벨 하드 ×2 · 헬 ×4)
  p.mythPity = p.mythPity || {};
  if (Math.random() < (D.chance + (p.mythPity[src] || 0) * D.pity) * dm) { p.mythPity[src] = 0;
    const all = Object.keys(WEAPONS).filter(k => WEAPONS[k].myth), had = (p.codex && p.codex.myth) || {}, fresh = all.filter(k => !had[k]); // v1.63 아직 확보 못 한 신화부터
    dropAt('item', { item: makeMyth(pick(fresh.length ? fresh : all), level) }); return true; }
  p.mythPity[src] = (p.mythPity[src] || 0) + 1; return false;
}
function rollUnique(from, level, dropAt) {
  const uid = Object.keys(UNIQUES).find(k => UNIQUES[k].from === from), p = G.player;
  if (!uid) return;
  p.uniqPity = p.uniqPity || {};
  const ch = UNIQUES[uid].chance + (p.uniqPity[uid] || 0) * 0.03;
  if (Math.random() < ch) { p.uniqPity[uid] = 0; dropAt('item', { item: makeUnique(uid, level) }); }
  else p.uniqPity[uid] = (p.uniqPity[uid] || 0) + 1;
}

function dropReveal(d, r) {
  const c = RARITIES[r].color, p = G.player;
  if (d.kind === 'item' && d.item.rarity === 5) { // v1.53 신화: 붉은 금빛 기둥 · 가장 긴 멈춤
    const mc = RARITIES[5].color;
    SFX.play('legend', 4); burst(d.x, d.y, mc, 70, 320, 1.1, 4); burst(d.x, d.y, '#ffe08a', 40, 220, 0.8, 3);
    G.effects.push({ type: 'ring', x: d.x, y: d.y, t: 0, life: 1.4, color: mc, r: 260 }); G.effects.push({ type: 'ring', x: d.x, y: d.y, t: 0, life: 0.9, color: '#ffe08a', r: 150 });
    floatText(d.x, d.y - 56, `◆ ${RARITIES[5].name} ◆`, mc, 26);
    hitstop(0.3); G.shake = Math.max(G.shake, 16); G.flash = { color: mc, t: 0, life: 1.2, a: 0.55 };
    UI.toast(`◆ ${RARITIES[5].name} 무기 ◆`, `${itemName(d.item)} — ${WEAPONS[d.item.key].role}`);
    log(`${RARITIES[5].name} 무기가 떨어졌다: ${itemName(d.item)}`, mc);
    return;
  }
  if (d.kind === 'item' && d.item.unique) { // v1.12 고유 장비: 분홍 빛기둥 + 긴 멈춤
    const uc = '#ff5aa0';
    SFX.play('legend', 4); burst(d.x, d.y, uc, 50, 260, 0.9, 4); burst(d.x, d.y, '#ffd76a', 20, 180, 0.6, 3);
    G.effects.push({ type: 'ring', x: d.x, y: d.y, t: 0, life: 1.1, color: uc, r: 200 });
    floatText(d.x, d.y - 52, '◈ 고유 장비 ◈', uc, 22);
    hitstop(0.2); G.shake = Math.max(G.shake, 12); G.flash = { color: uc, t: 0, life: 0.9, a: 0.5 };
    UI.toast('◈ 고유 장비 ◈', `${itemName(d.item)}: ${UNIQUES[d.item.unique].desc}`);
    log(`고유 장비가 떨어졌다: ${itemName(d.item)}`, uc);
    return;
  }
  if (r < 2) { if (d.kind === 'item' && d.item.kind !== 'cons') { SFX.play('item', r); burst(d.x, d.y, c, 6, 70, 0.3, 2); } return; }
  SFX.play(r >= 4 ? 'legend' : 'item', r);
  burst(d.x, d.y, c, 10 + r * 8, 120 + r * 40, 0.6, 3);
  G.effects.push({ type: 'ring', x: d.x, y: d.y, t: 0, life: 0.6 + r * 0.1, color: c, r: 50 + r * 25 });
  if (d.kind === 'item' && d.item.set) { const S = SETS[d.item.set]; floatText(d.x, d.y - 46, `▣ ${S.name} 세트`, S.color, 17 + r * 2); log(`세트 장비가 떨어졌다: ${itemName(d.item)}`, S.color); } // v1.12
  else floatText(d.x, d.y - 46, r >= 4 ? `★ ${RARITIES[r].name} ★` : `${RARITIES[r].name}!`, c, 15 + r * 3);
  if (r >= 3) { // 영웅 이상: 화면이 잠깐 멈추고 번쩍
    hitstop(r >= 4 ? 0.14 : 0.06); G.shake = Math.max(G.shake, r >= 4 ? 10 : 5);
    G.flash = { color: c, t: 0, life: r >= 4 ? 0.7 : 0.35, a: r >= 4 ? 0.45 : 0.22 };
    UI.toast(r >= 4 ? '★ 전설 장비 ★' : `${RARITIES[r].name} 장비 드랍!`, itemName(d.item) + (isUpgrade(p, d.item) ? '  ▲ 지금 장비보다 좋음' : ''));
    log(`${RARITIES[r].name} 장비가 떨어졌다: ${itemName(d.item)}`, c);
  }
}

function updateDrops(dt) {
  const p = G.player;
  for (const d of G.drops) {
    if (d.kind === 'credits' && !d.econ) { d.econ = true; d.amount = Math.max(1, Math.round(d.amount * ECON.cr)); } // v1.25 땅에 떨어지는 크레딧 절반
    const r = d.kind === 'item' && d.item.kind !== 'cons' ? d.item.rarity || 0 : 0;
    if (d.z === undefined) { // v1.7.1 튀어나오기: 적 자리에서 포물선으로 솟았다가 한 번 튕기고 착지
      const a = rand(0, TAU), s = rand(30, 70);
      d.z = 6; d.vz = d.kind === 'item' ? 170 + r * 30 : rand(90, 130); d.vx = Math.cos(a) * s; d.vy = Math.sin(a) * s; d.bounce = 0;
    }
    if (!d.landed) {
      d.vz -= 560 * dt; d.z += d.vz * dt;
      const nx = d.x + d.vx * dt, ny = d.y + d.vy * dt;
      if (!World.solidAt(nx, ny)) { d.x = nx; d.y = ny; }
      if (d.z <= 0 && d.vz < 0) {
        d.z = 0;
        if (d.bounce++ === 0 && d.vz < -90) { d.vz = -d.vz * 0.32; d.vx *= 0.4; d.vy *= 0.4; }
        else { d.landed = true; d.vz = 0; if (!d.seen) { d.seen = true; dropReveal(d, r); } }
      }
      d.t += dt; continue; // 공중에선 줍지 않음
    }
    d.t += dt;
    if (p.dead) continue;
    const dd = dist(p, d);
    if (dd < 90 && d.kind !== 'item') { // 자석 효과
      const a = angleTo(d, p); d.x += Math.cos(a) * 260 * dt; d.y += Math.sin(a) * 260 * dt;
    }
    if (dd < 24) {
      if (d.kind === 'credits' && p.raid) p.raid.credits += d.amount; // 탈출해야 확정
      if (d.kind === 'item' && p.raid && d.item.kind !== 'cons' && !d.item.raid) d.item.raid = true;
      if (d.kind === 'credits') { p.credits += d.amount; floatText(p.x, p.y - 26, `+${d.amount}₵`, '#ffd76a', 12); d.gone = true; SFX.play('coin'); }
      else if (d.kind === 'ammo') { const t = d.ammo || ammoPick(p), n = addAmmo(p, t, d.amount * AMMO[t].k); floatText(p.x, p.y - 26, `${AMMO[t].name} +${n}`, AMMO[t].color, 12); d.gone = true; SFX.play('ammo'); }
      else if (d.kind === 'item') {
        if (addItem(d.item)) {
          const r = d.item.rarity || 0, up = isUpgrade(p, d.item);
          SFX.play('item', Math.min(4, r)); Juice.loot(d.item, d.x, d.y); // v1.29 알림 카드 · 가방으로 날아가는 아이콘
          log(`획득: ${itemName(d.item)}${d.item.count > 1 ? ' x' + d.item.count : ''}${up ? '  ▲ 장착 장비보다 좋음!' : ''}`, RARITIES[r].color);
          if (r >= 2) {
            floatText(p.x, p.y - 30, `${RARITIES[r].name} 장비!`, RARITIES[r].color, 16 + r * 2);
            G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.7, color: RARITIES[r].color, r: 60 + r * 15 });
          }
          d.gone = true;
        } else if (!d.warned) { log('인벤토리가 가득 찼습니다.', '#f88'); d.warned = true; }
      }
    }
    if (d.t > 120) d.gone = true;
  }
  G.drops = G.drops.filter(d => !d.gone);
}

// ---------------- 업데이트 ----------------
function update(dt) {
  G.time += dt;
  const p = G.player;
  p.playTime += dt;
  if ((G.combatT = (G.combatT || 0) - dt) <= 0) { // v1.47.1 싸우는 중: 팁 미룸 · 로그 2줄만
    G.combatT = 0.25; const p = G.player;
    G.combat = !!p.raid && G.enemies.some(e => e.hp > 0 && e.state === 'chase' && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) < 700);
    document.body.classList.toggle('combat', G.combat); UI.flushToast();
  }
  Tips.update(dt);
  FirstRun.update(dt); // v1.45
  Tut.update(); // v1.54 처음 할 일
  UI.smsUpdate(dt); // v1.56 긴급재난문자
  Camp.broadcast && Camp.broadcast(dt); // v1.56 캠프 안내방송
  if (!p.dead) {
    const mv = moveInput();
    if (p.rollT > 0) { // 회피 중: 빠르게 미끄러지다 감속
      const sp = ROLL.speed * (0.3 + 0.7 * p.rollT / ROLL.dur);
      p.rollT -= dt;
      World.move(p, Math.cos(p.rollA) * sp * dt, Math.sin(p.rollA) * sp * dt);
      if (p.rollT <= 0 && armorLegend('afterimage')) { explode(p.x, p.y, p.level * 14 * playerDamageMul(true), 80, { small: true, knock: 18, stagger: 0.5 }); G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.35, color: '#c9a0ff', r: 90 }); } // v1.12 잔상
      for (let i = 0; i < 2; i++) G.particles.push({ x: p.x + rand(-5, 5), y: p.y + rand(-5, 5), vx: -Math.cos(p.rollA) * rand(20, 60) + rand(-20, 20), vy: -Math.sin(p.rollA) * rand(20, 60) + rand(-20, 20), t: 0, life: rand(0.3, 0.55), color: 'rgba(150,140,120,0.55)', size: rand(4, 7), z: 2, vz: 14 }); // 바닥 먼지
    } else if (mv) {
      const { wx, wy, amt } = mv;
      const l = Math.hypot(wx, wy), sp = PlayerStats.speed(p) * dt * amt * World.slow(p.x, p.y) * (1 - ADS.k * (1 - clamp(0.6 * attMul(curWeapon(), 'adsMove'), 0.3, 1))) * attMul(curWeapon(), 'move'); // v1.50 앵글 손잡이 · 4배 · 드럼 // v1.6 물속은 느림
      World.move(p, wx / l * sp, wy / l * sp);
      p.walkT = (p.walkT || 0) + dt;
    }
    Ambience.playerStep(p, dt, !!mv && !(p.rollT > 0)); // v1.35 바닥별 발소리
    if (IS_TOUCH) Touch.aimUpdate(p); // 모바일 오른쪽 조이스틱 → 조준점·사격
    let aimAt = Iso.toWorld(input.mx, input.my, 20); // 가슴 높이 조준
    const hv = IS_TOUCH ? null : hoverEnemy(input.mx, input.my); // v1.66 마우스가 적 그림 위면 그 적을 조준 (머리·몸 위를 눌러도 발밑 판정에 맞게) · 위쪽 = 머리
    p.aimTarget = hv && hv.e; p.aimHead = !!(hv && hv.head);
    if (hv) aimAt = { x: hv.e.x, y: hv.e.y };
    if (IS_TOUCH) { // v1.69 모바일 헤드샷: 멈춰 선 채 같은 적을 MOBILE_HS_T초 겨누면 머리 조준 (움직이거나 구르면 처음부터)
      const L = Touch.lock && Touch.lock.hp > 0 ? Touch.lock : null;
      if (L && L === p.mLock && !mv && !(p.rollT > 0)) p.mLockT = (p.mLockT || 0) + dt; else { p.mLock = L; p.mLockT = 0; }
      p.aimTarget = L; p.aimHead = !!L && p.mLockT >= MOBILE_HS_T && enemyScreenH(L) >= 30;
    }
    p.aim = Math.atan2(aimAt.y - p.y, aimAt.x - p.x); p.aimPt = aimAt; p.aimPtT = G.time;
    if (input.down && !(p.rollT > 0)) playerAttack();
    if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) { p.reloadT = 0; finishReload(); } }
    glRecharge(p, dt); // v1.52 OX-20 유탄
    // 캠프 안에서는 천천히 회복
    const mh = PlayerStats.maxHp(p);
    if (World.inSafe(p.x, p.y) && p.hp < mh) p.hp = Math.min(mh, p.hp + mh * 0.012 * dt); // v1.57 캠프 회복 8%/초 → 1.2%/초 (바로 채우려면 의무병)
    else if (p.hp < mh) p.hp = Math.min(mh, p.hp + PlayerStats.regen(p) * dt); // 체력 스탯·옵션 재생
  }
  p.rollCd = (p.rollCd || 0) - dt;
  if ((p.stamT = (p.stamT || 0) - dt) <= 0) p.stam = Math.min(100, p.stam + ROLL.regen * dt); // 스태미나 회복
  p.atkT -= dt; p.hurtT -= dt; p.swingT -= dt; if (G.time - (p.lastShot || -9) > 0.4) p.heat = Math.max(0, (p.heat || 0) - dt * 0.8); p.recoilT = (p.recoilT || 0) - dt; G.noAmmoT -= dt;
  for (let i = 0; i < SKILLS.length; i++) p.skillCd[i] = Math.max(0, (p.skillCd[i] || 0) - dt); // v1.26 스킬 5개
  p.buffs.rapid = Math.max(0, p.buffs.rapid - dt);
  p.buffs.adren = Math.max(0, p.buffs.adren - dt);
  p.buffs.perfect = Math.max(0, (p.buffs.perfect || 0) - dt); // v1.65 완벽 회피
  p.invT = Math.max(0, (p.invT || 0) - dt);
  p.buffs.shield = Math.max(0, (p.buffs.shield || 0) - dt);
  p.buffs.stim = Math.max(0, (p.buffs.stim || 0) - dt);
  if (p.buffs.regen > 0 && !p.dead) { p.buffs.regen -= dt; p.hp = Math.min(PlayerStats.maxHp(p), p.hp + (p.regenRate || 0) * dt); }

  spawnEnemies(dt);
  updateBossSpawn(dt);
  Interiors.update();
  Raid.update(dt);
  Scavenge.update(dt);
  RaidEvents.update(dt); // v1.10
  Gadgets.update(dt); // v1.14 지뢰
  Turrets.update(dt); // v1.26 포탑
  Juice.update(dt); // v1.28
  Journal.update(dt); // v1.15 업적
  updateTension(dt); // v1.29 출격 긴장도 (음악 · 화면 톤)
  Music.update(dt); // v1.17 배경 음악
  Ambience.update(dt); // v1.35 환경음 · 울림
  if (!p.dead && p.hp < PlayerStats.maxHp(p) * 0.3 && World.map !== 'camp' && (G.beatT = (G.beatT || 0) - dt) <= 0) { G.beatT = 0.4 + p.hp / PlayerStats.maxHp(p) * 2.2; SFX.play('heart'); } // v1.17 저체력 심장 박동
  Nav.update(dt);
  updateEnemies(dt);
  Companion.update(dt); // v1.41 동료
  Settlement.update(dt); // v1.43 캠프 사람들
  Assault.update(dt);
  Bosses.updateField(dt);
  Bosses.updateLab(dt); // v1.5 연구소 키메라
  updateBullets(dt);
  updateGrenades(dt);
  Monsters.updateHazards(dt);
  updateDrops(dt);

  for (const pt of G.particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.9; pt.vy *= 0.9; if (pt.vz) pt.z += pt.vz * dt; }
  for (const c of G.corpses) { // v1.32 시체 움직임 (밀려나기 · 날아가기 · 떨어지기)
    if (c.vx || c.vy) { const ox = c.x, oy = c.y; c.x += c.vx * dt; c.y += c.vy * dt; if (World.solidAt(c.x, c.y)) { c.x = ox; c.y = oy; c.vx = c.vy = 0; } const fr = c.z > 0 ? 0.99 : 0.82; c.vx *= fr; c.vy *= fr; if (Math.abs(c.vx) + Math.abs(c.vy) < 4) c.vx = c.vy = 0; }
    if (c.z > 0 || c.vz) { c.vz -= 600 * dt; c.z = Math.max(0, c.z + c.vz * dt); if (c.z === 0) { if (c.kind === 'fall' && !c.landed) { c.landed = true; burst(c.x, c.y, '#ffc', 10, 160, 0.3, 2); G.effects.push({ type: 'boom', x: c.x, y: c.y, t: 0, life: 0.25, r: 22 }); } c.vz = 0; } }
    if (c.kind === 'fall' && Math.random() < dt * 14 && G.time - c.t0 < 2.5) G.particles.push({ x: c.x + rand(-4, 4), y: c.y + rand(-4, 4), vx: rand(-10, 10), vy: rand(-10, 10), t: 0, life: 0.9, color: '#444', size: rand(3, 5), z: c.z + 10, vz: 30 });
  }
  G.corpses = G.corpses.filter(c => G.time - c.t0 < 8);
  G.particles = G.particles.filter(pt => pt.t < pt.life);
  for (const t of G.texts) { t.t += dt; t.z += 36 * dt; }
  G.texts = G.texts.filter(t => t.t < t.life);
  for (const ef of G.effects) ef.t += dt;
  G.effects = G.effects.filter(ef => ef.t < ef.life);

  if (!p.dead) { updateLandmarks(); updateRadiation(dt); }
  Story.update();

  // 지역 변경
  const z = World.zoneIndex(p.x, p.y);
  if (z !== G.zone) {
    G.zone = z;
    const zn = ZONES[z];
    log(z === 0 ? `${zn.name} (안전 지대)` : `${zn.name} 진입 (권장 Lv${zn.lvl[0]}~${zn.lvl[1]})`, z === 0 ? '#8f8' : '#fc8');
    if (zn.desc) log(`  ${zn.desc} · 특산: ${zn.gearText}`, '#c9b27a');
  }
  G.darkness = lerp(G.darkness, (ZONES[z].dark + (G.inside ? 0.15 : 0) + (G.assault && (G.assault.muts || []).includes('dark') ? 0.3 : 0)) * (armorLegend('nightVision') ? 0.4 : 1), dt * 1.5); // v1.12 야간 투시 // 실내는 조금 어둡게

  // 카메라
  G.shake *= Math.pow(0.002, dt);
  if (!Settings.shake) G.shake = 0; // 설정: 화면 흔들림 끔
  // v1.28 카메라 손맛: 부드럽게 따라가기 + 조준 방향으로 시야 내밀기 + 사격 반동 (순간이동·출격 땐 바로 맞춤)
  const ctx0 = (p.x - p.y) * ISO_K - VW / 2, cty0 = (p.x + p.y) * ISO_K / 2 - VH / 2 - 20;
  const F = G.camF || (G.camF = { x: ctx0, y: cty0 }), L = G.camLead || (G.camLead = { x: 0, y: 0 }), KK = G.kick || (G.kick = { x: 0, y: 0 });
  if (Math.hypot(ctx0 - F.x, cty0 - F.y) > 300) { F.x = ctx0; F.y = cty0; } else { const k = 1 - Math.pow(0.00005, dt); F.x += (ctx0 - F.x) * k; F.y += (cty0 - F.y) * k; }
  const lead = Settings.camLead !== false && !p.dead && !UI.anyOpen() && !IS_TOUCH;
  const cw0 = curWeapon(); ADS.k = clamp(ADS.k + (adsOn() ? dt / (0.15 * attMul(cw0, 'adsTime')) : -dt / 0.12), 0, 1); // 0.15초에 들어가고 0.12초에 풀림
  const far = (cw0 && wbase(cw0.key) === 'sniper' ? 1.6 : 1) * attMul(cw0, 'adsLead'), lm = 0.2 + 0.22 * ADS.k * far, lcx = 110 + 120 * ADS.k * far, lcy = 70 + 80 * ADS.k * far; // 조준하면 커서 쪽으로 더 멀리 (저격총은 더)
  const lx = lead || ADS.k > 0 ? clamp((input.mx - VW / 2) * lm, -lcx, lcx) : 0, ly = lead || ADS.k > 0 ? clamp((input.my - VH / 2) * lm, -lcy, lcy) : 0, kl = 1 - Math.pow(0.02, dt);
  L.x += (lx - L.x) * kl; L.y += (ly - L.y) * kl;
  const kd = Math.pow(0.0005, dt); KK.x *= kd; KK.y *= kd;
  G.cam.x = F.x + L.x + KK.x + rand(-G.shake, G.shake);
  G.cam.y = F.y + L.y + KK.y + rand(-G.shake, G.shake);

  G.saveT += dt;
  if (G.saveT > 20) { G.saveT = 0; Bounty.refresh(); Weekly.refresh(); saveGame(); } // 자정이 지나면 의뢰 갱신
}

// v1.29 출격 긴장도 0~1: 경보 단계 · 출격 시간 · 아직 확정 안 된 전리품 · 체력 · 다가오는 적. 캠프에서는 0
// 음악(심장 박동·째깍임 층)과 화면 톤(가장자리 어둡게·붉게)이 따라감 — 전투 음악(쫓는 적 수)과는 따로
function updateTension(dt) {
  const p = G.player; let t = 0;
  if (p && p.raid && !p.dead && World.map !== 'camp') {
    let near = 0; for (const e of G.enemies) if (e.hp > 0 && e.state === 'chase' && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) < 900) near++;
    const mh = PlayerStats.maxHp(p), loot = p.inventory.filter(i => i && i.raid).length * 0.04 + (p.raid.credits || 0) / 4000;
    t = (RaidEvents.alert || 0) * 0.15 + Math.min(0.2, p.raid.t / 1800) + Math.min(0.15, loot) + Math.max(0, 0.5 - p.hp / mh) * 0.8 + Math.min(0.35, near * 0.07);
    if (G.extractT > 0) t += 0.25; // 탈출 중
  }
  t = clamp(t, 0, 1);
  G.tension = (G.tension || 0) + (t - (G.tension || 0)) * Math.min(1, dt * (t > (G.tension || 0) ? 0.8 : 0.3));
}

// ---------------- 루프 ----------------
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame); // v1.49 먼저 다음 프레임을 예약 — 오류가 나도 게임이 멈추지 않게
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.running) {
    try {
      if (G.paused) { /* 일시정지: 그리기만 */ }
      else if (G.hitstop > 0) G.hitstop -= dt; // 타격 정지 중에는 월드 정지
      else { if (G.slowT > 0) G.slowT -= dt; update(G.slowT > 0 ? dt * 0.35 : dt); } // v1.65 완벽 회피 슬로모
      render();
      UI.updateHUD(dt);
      FpsWatch.tick(dt);
    } catch (e) { ErrNote.show(e); }
  }
}

// v1.49 버벅임 감지: 출격 중 8초 평균이 초당 24프레임 아래면 저사양 모드를 한 번 켜 줌 (설정에서 다시 켤 수 있음)
const FpsWatch = {
  acc: 0, n: 0, done: false,
  tick(dt) {
    if (this.done || !G.player || !G.player.raid || G.paused || !Settings.light) return;
    this.acc += dt; this.n++;
    if (this.acc < 8) return;
    const fps = this.n / this.acc; this.acc = 0; this.n = 0;
    if (fps >= 24) return;
    this.done = true;
    try { if (localStorage.getItem('seoul2049-autolow')) return; localStorage.setItem('seoul2049-autolow', '1'); } catch (e) { /* 무시 */ }
    Object.assign(Settings, { light: false, detail: false, reverb: false, ambient: false }); Settings.save(); GroundCache.clear();
    UI.toast('화면이 버벅여서 저사양 모드를 켰다', `초당 ${Math.round(fps)}프레임이라 그래픽을 낮췄다. 설정에서 조명·세부 묘사를 다시 켤 수 있다`);
  },
};

// v1.49 오류 안내: 화면 위에 짧게 (게임은 계속 · 바로 저장) — 같은 오류는 한 번만
const ErrNote = {
  seen: new Set(), n: 0,
  show(e) {
    const msg = String(e && (e.message || e.reason || e)).slice(0, 160), where = e && e.stack ? String(e.stack).split('\n')[1] || '' : '';
    if (this.seen.has(msg) || this.n >= 3) return; this.seen.add(msg); this.n++;
    try { saveGame(); } catch (er) { /* 무시 */ }
    let el = document.getElementById('err-note');
    if (!el) { el = document.createElement('div'); el.id = 'err-note'; document.body.appendChild(el); }
    el.innerHTML = `<b>문제가 생겼다.</b> 진행은 저장했고 게임은 계속된다. 계속 이상하면 새로고침.  <br><span class="muted">${msg.replace(/</g, '&lt;')} ${where.trim().replace(/</g, '&lt;').slice(0, 90)}</span> <button id="err-copy">내용 복사</button> <button id="err-close">닫기</button>`;
    el.classList.remove('hidden');
    document.getElementById('err-close').onclick = () => el.classList.add('hidden');
    document.getElementById('err-copy').onclick = () => { try { navigator.clipboard.writeText(`${GAME_VERSION} ${msg} ${where}`); } catch (er) { /* 무시 */ } };
    clearTimeout(this.t); this.t = setTimeout(() => el.classList.add('hidden'), 15000);
  },
};
window.addEventListener('error', e => { if (e.error || e.message) ErrNote.show(e.error || e.message); });
window.addEventListener('unhandledrejection', e => ErrNote.show(e.reason));

// ---------------- 타이틀 ----------------
(function initTitle() {
  UI.init();
  if (document.fonts) for (const f of ['12px BlackHan', '12px Typer', '12px Pen']) document.fonts.load(f); // v1.39 캔버스 글씨용 글꼴 미리 읽기
  Sprites.loadAll();
  document.getElementById('version-label').textContent = GAME_VERSION;
  { // v1.49 첫 로딩: 그림을 다 받을 때까지 진행 막대 (느린 회선에서 빈 화면처럼 보이던 것)
    const bar = document.createElement('div'); bar.id = 'load-bar'; bar.innerHTML = '<div class="lb-fill"></div><span>그림 불러오는 중…</span>';
    document.querySelector('.title-main').appendChild(bar);
    // v1.50.9 다 받기 전엔 시작 버튼을 막음 (그림 없이 시작해 코드로 그린 임시 모양이 보이다가 천천히 바뀌던 것) · 30초가 지나면 그냥 열어 줌
    const gate = [...document.querySelectorAll('#btn-new, #btn-continue')]; gate.forEach(b => b.classList.add('wait')); // 누르기만 막음 (이어서 버튼의 켜짐/꺼짐은 세이브가 정함)
    const open = () => gate.forEach(b => b.classList.remove('wait'));
    const t0 = performance.now(), tick = () => { const k = Sprites.total ? Sprites.done / Sprites.total : 0;
      bar.firstChild.style.width = Math.round(k * 100) + '%'; bar.lastChild.textContent = `그림 불러오는 중… ${Math.round(k * 100)}%`;
      if (k >= 1 || performance.now() - t0 > 30000) { open(); bar.classList.add('done'); setTimeout(() => bar.remove(), 600); } else setTimeout(tick, 120); };
    tick();
  }
  const btnC = document.getElementById('btn-continue');
  let save = null;
  // v1.37 슬롯 고르기: 슬롯마다 이름 · 레벨 · 장 · 플레이 시간
  const slots = () => {
    save = loadSave();
    document.getElementById('slot-row').innerHTML = [1, 2, 3].map(n => { const s = loadSave(n), p = s && s.p;
      return `<button class="slot${n === SAVE_SLOT ? ' on' : ''}" data-slot="${n}"><b>No.${n}</b>${p ? `<span class="who">${p.name}</span><span class="meta">Lv${p.level} · ${(p.quest && p.quest.ch) || 0}장 · ${Math.floor((p.playTime || 0) / 3600)}h ${String(Math.floor((p.playTime || 0) % 3600 / 60)).padStart(2, '0')}m</span>` : '<span class="empty">빈칸</span>'}</button>`; }).join(''); // v1.38 명단 한 줄
    document.querySelectorAll('#slot-row .slot').forEach(b => { b.onclick = () => { SAVE_SLOT = +b.dataset.slot; try { localStorage.setItem('seoul2049-slot', SAVE_SLOT); } catch (e) { /* */ } SFX.play('click'); slots(); }; });
    btnC.disabled = !save; btnC.textContent = '이어서';
  };
  slots();
  document.getElementById('btn-new').onclick = () => {
    if (save && !confirm(`슬롯 ${SAVE_SLOT}의 「${save.p.name} Lv${save.p.level}」 저장이 지워집니다. 새로 시작할까요?`)) return;
    const name = document.getElementById('name-input').value.trim() || '생존자';
    startGame(null, name);
  };
  btnC.onclick = () => save && startGame(save);
  document.getElementById('btn-respawn').onclick = respawn;
  window.addEventListener('beforeunload', () => saveGame());
  requestAnimationFrame(frame);
})();
