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
  ZOOM = clamp(Math.round(z * 10) / 10, ZOOM_MIN, 2.2); // v1.21 최대 확대 1.8 → 2.2 (캐릭터가 작아진 만큼)
  try { localStorage.setItem('seoul2049-zoom', ZOOM); } catch (e) { /* 저장 불가 */ }
  GroundCache.map.clear(); resize();
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
  if (k >= '1' && k <= '8') { Hotbar.use(+k - 1); return; } // v1.24 벨트 칸
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
  else if (act === 'throwNext') Gadgets.cycle('throw');
  else if (act === 'utilNext') Gadgets.cycle('util');
  else if (act === 'compCmd') Companion.command(); // v1.44 동료 명령
});
window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e => { input.mx = e.clientX / ZOOM; input.my = e.clientY / ZOOM; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) input.down = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) input.down = false; });
window.addEventListener('blur', () => { input.keys = {}; input.down = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.running && !G.paused && !G.player.dead) Pause.toggle(); }); // 탭을 떠나면 자동 일시정지
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------------- 공용 ----------------
function log(msg, color = '#ddd') { UI.log(msg, color); if (color === '#f88' && typeof SFX !== 'undefined') SFX.play('error'); } // v1.35 안 되는 일: 낮은 삐-삐
function floatText(x, y, text, color = '#fff', size = 14) {
  G.texts.push({ x: x + rand(-6, 6), y, z: 34, text, color, size, t: 0, life: 0.9 });
}
function burst(x, y, color, n, speed = 120, life = 0.5, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(speed * 0.3, speed);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(life * 0.5, life), color, size });
  }
}
function curWeapon() { const p = G.player; return p.equip[p.active]; }
// 타격감: 아주 짧게 게임을 멈춤 (렌더는 계속)
function hitstop(t) { G.hitstop = Math.max(G.hitstop, t); }

// ---------------- 저장 ----------------
function saveGame(silent = true) {
  if (!G.player) return;
  try {
    const p = { ...G.player, reloadT: 0, atkT: 0 };
    localStorage.setItem(saveKey(), JSON.stringify({ ver: 2, p, nextItemId, bossT: G.bossT, savedAt: Date.now() }));
    if (!silent) log('게임이 저장되었습니다.', '#8f8');
  } catch (e) { /* 저장 불가 환경 */ }
}
function loadSave(n = SAVE_SLOT) {
  try { const s = localStorage.getItem(slotKey(n)); return s ? JSON.parse(s) : null; } catch (e) { return null; }
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
  } else {
    G.player = newPlayer(name || '생존자');
    G.player.hp = PlayerStats.maxHp(G.player);
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
  if (G.welcome) { G.welcome = false; setTimeout(() => UI.welcome(), 600); }
  if (G.skillRefund) { const r = G.skillRefund; G.skillRefund = 0; setTimeout(() => { UI.toast('스킬은 이제 배워서 씁니다', `배웠던 스킬 값 ₵${fmt(r)}을 돌려받았습니다 — 암시장 상인 박씨 「스킬 교범」`); log(`${ICON('tip')} 스킬은 상인에게서 배워야 쓸 수 있도록 바뀌었습니다. 이전 스킬·갈래 값 ₵${fmt(r)} 반환.`, '#7fd'); }, 1200); }
  if (G.autoStory) { G.autoStory = false; Story.start(G.player); log('조작: WASD 이동 · 마우스 조준·사격 · Space 슬라이딩(무적 · 재사용 5초) · R 재장전 · 1~8 벨트 칸 (B: 칸 등록)', '#8cf'); }
  saveGame();
}

// ---------------- 플레이어 행동 ----------------
// 슬라이딩 (v1.33, 예전 슬라이딩): 0.42초 무적, 빠르게 미끄러지다 감속. 이동 중이면 그 방향, 아니면 조준 방향
// 재사용 5초 — 위급할 때만 (예전: 스태미나 50 · 연속 2번). 기력 절약 효과들은 재사용 감소로 바뀜
const ROLL = { dur: 0.42, speed: 400, cd: 5, minCd: 2, regen: 40 };
function rollCdMax(p) { return Math.max(ROLL.minCd, ROLL.cd * (perk('ghost') ? 0.6 : 1) * (branchOn('tac') ? 0.8 : 1) * (perk('runner') ? 0.85 : 1) * (pas('t2') ? 0.9 : 1) * (1 - gearBonus(p, 'rollStam'))); }
// v1.8.1 총구 위치: 총을 든 몸 그림이면 그림 속 총구(옆으로 · 어깨 높이)에서 쏘고, 조준점(커서)을 향해 날아감
// 총알은 높이 22에서 그려지므로, 화면상 총구 위치에 맞는 바닥 좌표를 역산
function gunMuzzle(p, w) {
  const def = { x: p.x + Math.cos(p.aim) * 22, y: p.y + Math.sin(p.aim) * 22, a: p.aim };
  const grp = ART.weaponGroup[w.key], m = ART.muzzle && ART.muzzle[grp];
  if (!m || typeof Sprites === 'undefined') return def;
  const base = p.equip.armor && Sprites.get('player_' + p.equip.armor.key) ? 'player_' + p.equip.armor.key : 'player';
  if (!Sprites.get(base + '_' + grp)) return def; // 총을 든 몸 그림이 없으면 예전 방식
  const H = (ART.height.player || 44) * (ART.charScale || 1), f = Iso.dir(p.aim).x < 0 ? -1 : 1; // v1.21 실제 스케일
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
  if ((p.rollCd || 0) > 0) { if (G.time - (p.stamWarn || 0) > 0.6) { p.stamWarn = G.time; floatText(p.x, p.y - 30, `슬라이딩 ${p.rollCd.toFixed(1)}초`, '#7ab8ff', 12); } return; }
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
  if (b.melee || p.reloadT > 0 || w.loaded >= magSize(w)) return;
  if ((p.ammo[b.ammo] || 0) <= 0 && !b.infinite) {
    if (G.noAmmoT <= 0) { log(`${AMMO[b.ammo].name}이 없습니다! 다른 총이나 근접 무기로 교체(Q)하거나 출격 지도에서 사세요.`, '#f88'); G.noAmmoT = 2; SFX.play('empty'); }
    return;
  }
  p.reloadT = p.reloadMax = b.reload * PlayerStats.reloadMul(p);
  SFX.reload(w.key, p.reloadMax); // v1.35 무기별 장전 소리
}

function finishReload() {
  const p = G.player, w = curWeapon();
  if (!w || WEAPONS[w.key].melee) return;
  const need = magSize(w) - w.loaded;
  if (WEAPONS[w.key].infinite) { w.loaded += need; return; } // 권총: 예비 탄약 소모 없음
  const t = WEAPONS[w.key].ammo, take = Math.min(need, p.ammo[t] || 0);
  w.loaded += take; p.ammo[t] -= take;
}

// v1.9 기관총 예열: 연사할수록 최대 25% 빨라짐 (0.4초 쉬면 식기 시작)
function gunRateMul(p, w) { return w.key === 'lmg' ? 1 - 0.25 * (p.heat || 0) : 1; }

function playerDamageMul(melee) {
  const p = G.player;
  let m = (melee ? PlayerStats.meleeMul(p) : PlayerStats.gunMul(p)) * (p.buffs.adren > 0 ? 1 + SkillCalc.adrenDmg(p) : 1);
  // v1.11 특성
  if (perk('rollStrike') && G.time - ((p.lastRoll || -9) + ROLL.dur) < 1.5) m *= 1.3;
  if (!melee && perk('steadyAim') && G.time - (p.lastHurt || -9) > 2) m *= 1.15;
  if (perk('lastStand') && p.hp < PlayerStats.maxHp(p) * 0.35) m *= 1.25;
  if (pas('a5')) m *= 1.05; if (branchOn('atk')) m *= 1.08; // v1.23 패시브 트리
  return m * Camp.dmgMul(); // v1.13 사격장
}

function playerAttack() {
  const p = G.player, w = curWeapon();
  if (!w || p.atkT > 0 || p.reloadT > 0) return;
  const b = WEAPONS[w.key];
  if (!b.melee) p.atkT = b.rate * PlayerStats.rateMul(p) * gunRateMul(p, w);
  p.lastAtk = G.time; // 공격 애니메이션용
  SFX.play(b.melee ? 'swing_' + w.key : { smg: 'smg', rifle: 'rifle', lmg: 'lmg', shotgun: 'shotgun', sniper: 'sniper' }[w.key] || 'pistol');
  const critMul = PlayerStats.critMul(p, w); let cc = PlayerStats.crit(p, w);
  if (b.melee) {
    // v1.9 근접 3타 콤보: 1·2타는 빠르게, 3타는 무기별 마무리 (쇠파이프 강타 · 도끼 회전 베기 · 칼 찌르기)
    // 슬라이딩 직후 0.35초 안의 공격은 바로 마무리 일격 (슬라이딩 베기)
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
    if (fin) { SFX.play('heavy'); if (rolled) floatText(p.x, p.y - 34, '슬라이딩 베기!', '#ffd27a', 13); }
    const dmg = weaponDmg(w) * playerDamageMul(true) * M.dmg * (fin && perk('executioner') ? 1.4 : 1) * (fin && w.unique === 'goliath' ? 1.5 : 1) * (p.fangBuff ? 2 : 1);
    if (p.fangBuff) { p.fangBuff = false; floatText(p.x, p.y - 36, '굶주린 송곳니!', '#ff6a5a', 13); } // v1.12 붉은 이빨
    let hits = 0, anyCrit = false;
    for (const e of G.enemies) {
      if (e.hp <= 0) continue;
      const d = dist(p, e);
      if (d > range + e.r) continue;
      const da = Math.abs(((angleTo(p, e) - p.aim + Math.PI * 3) % TAU) - Math.PI);
      if (da > arc / 2 && d > e.r + p.r + 4) continue;
      if (!World.lineOfSight(p, e)) continue; // 벽 너머 타격 방지
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
    const ln = w.key === 'sniper' ? 750 : 550;
    for (const e of G.enemies) {
      if (e.state === 'chase' || e.hp <= 0 || e.minion || dist(e, p) > ln) continue;
      const nd = Nav.dist && Nav.dist[Math.floor(e.y / TILE) * World.W + Math.floor(e.x / TILE)];
      if (e.def.flying || nd >= 0) { e.state = 'chase'; e.heard = true; }
    }
  }
  if (perk('lastRounds') && w.loaded <= magSize(w) * 0.25) cc += 0.25; // v1.11 마지막 탄
  if (!(w.legend === 'thrift' && Math.random() < 0.35) && !(p.buffs.rapid > 0 && smod('rapid') === 'b')) w.loaded--; // v1.11 탄약 보급: 소모 없음
  const pellets = pelletCount(w), dmg = weaponDmg(w) * playerDamageMul(false);
  // v1.9 무기 손맛: 기관총 예열(연사할수록 정확·빨라짐) · 소총 첫 발 정조준(잠깐 쉬었다 쏘면 정확 + 치명타)
  const first = w.key === 'rifle' && G.time - (p.lastShot || -9) > 0.35;
  if (w.key === 'lmg') p.heat = w.unique === 'titan' ? 1 : Math.min(1, (p.heat || 0) + 0.04); // v1.12 타이탄 심장포: 항상 예열
  const frag = w.unique === 'raven' && (p.ravenN = (p.ravenN || 0) + 1) % 3 === 0; // v1.12 레이븐: 3발째 파편
  p.lastShot = G.time;
  const spread = b.spread * (1 - gearBonus(p, 'accuracy', w)) * (w.key === 'lmg' ? 1 - 0.55 * (p.heat || 0) : 1) * (first ? 0.15 : 1), pierce = (b.pierce || 0) + gearBonus(p, 'pierce', w) + (w.unique === 'hawk' ? 2 : 0);
  const mz = gunMuzzle(p, w), mx = mz.x, my = mz.y, aim0 = mz.a;
  const life = b.range / b.speed;
  const sid = (G.shotId = (G.shotId || 0) + 1); // v1.40 같은 한 발(산탄 여러 알) 표시
  for (let i = 0; i < pellets; i++) {
    const a = aim0 + rand(-spread, spread);
    const s = b.speed * rand(0.95, 1.05);
    const crit = Math.random() < cc + (first ? 0.1 : 0);
    G.bullets.push({
      x: mx, y: my, vx: Math.cos(a) * s, vy: Math.sin(a) * s, from: 'p', life, maxLife: life, falloff: b.falloff,
      dmg: dmg * (crit ? critMul : 1), crit, pierce, hit: [], w, frag: frag && i === 0, sid,
      color: crit ? '#ffef7a' : w.legend === 'boom' ? '#ff8a3a' : '#ffd27a',
    });
  }
  p.recoilT = 0.07;
  if (Settings.shake) { const d = Iso.dir(aim0), k = b.pellets || w.key === 'sniper' ? 9 : w.key === 'lmg' || w.key === 'smg' ? 2.2 : w.key === 'rifle' ? 3.5 : 4.5; G.kick = G.kick || { x: 0, y: 0 }; G.kick.x -= d.x * k; G.kick.y -= d.y * k; } // v1.28 사격 반동이 화면에도 // v1.40 반동 조금 더 세게
  Juice.shot(p, w, mx, my, aim0); // v1.28 총구 섬광 · 탄피
  if (w.key === 'sniper') { // v1.9 저격: 탄도가 잠깐 남음
    let ex = mx, ey = my; const c = Math.cos(aim0), sn = Math.sin(aim0);
    for (let d = 0; d < b.range; d += 16) { const nx = mx + c * d, ny = my + sn * d; if (World.solidAt(nx, ny)) break; ex = nx; ey = ny; }
    G.effects.push({ type: 'tracer', x: mx, y: my, x2: ex, y2: ey, t: 0, life: 0.35, color: 'rgba(255,240,200,0.8)', w: 2.5 });
  }
  G.particles.push({ x: mx, y: my, vx: 0, vy: 0, t: 0, life: 0.06, color: '#ffe9a0', size: b.pellets ? 14 : w.key === 'sniper' ? 12 : 8, z: 22 });
  G.shake = Math.max(G.shake, b.pellets ? 6 : w.key === 'sniper' ? 7 : w.key === 'lmg' ? 2.2 : 1.5);
  if (w.loaded === 0) startReload();
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
  if (!p.skills[s.id]) { log(`${s.name}: 아직 배우지 않았습니다 — 스킬 창(K)에서 스킬 포인트로`, '#aaa'); SFX.play('empty'); return; } // v1.16
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
    const amt = Math.round(mh * 0.4 * (perk('fieldMedic') ? 1.5 : 1) * (pas('s4') ? 1.2 : 1) * (1 + gearBonus(p, 'medHeal')));
    p.hp = Math.min(mh, p.hp + amt);
    floatText(p.x, p.y - 30, '+' + amt, '#6f6', 16);
  } else if (it.key === 'ammo') {
    const [t, n] = giveAmmoUnits(p, 120); log(`${AMMO[t].name} +${n}`, '#cc8');
  } else if (CONSUMABLES[it.key].slot) { // v1.14 투척물·보조: 가방에서 누르면 그 칸에 선택
    const slot = CONSUMABLES[it.key].slot; p.gsel = p.gsel || {}; p.gsel[slot] = it.key;
    const on = Hotbar.autoAdd(slot), k = G.player.hotbar.indexOf(slot) + 1; log(`${it.name}을(를) ${slot === 'throw' ? '투척' : '보조'} 칸${on ? `(${k}번)` : ''}에 올렸다.${on ? '' : ' 벨트 칸이 가득 — B로 등록'}`, '#cfe'); UI.buildHotbar(); return; // v1.24
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
    if (ex) { ex.count += it.count; UI.refreshInventory(); return true; }
  }
  if (inv.length >= Camp.bagSize()) return false;
  inv.push(it); Journal.onItem(it); // v1.15 도감
  UI.refreshInventory();
  return true;
}
function removeItem(it) {
  const inv = G.player.inventory, i = inv.indexOf(it);
  if (i >= 0) inv.splice(i, 1);
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
    log(`레벨 업! Lv${p.level} — 능력치 포인트 +3 · 스킬 포인트 +1 (C)`, '#ffd76a');
    SFX.play('levelup');
    const sk = SKILLS.find(s => s.lvl === p.level);
    if (sk) log(`새 스킬을 배울 수 있다: ${sk.name} — 스킬 창 K · ${SKILL_SP.root} SP`, '#7fd');
    const pt = PERK_TIERS.find(t => t.lvl === p.level); // v1.11 특성 선택
    if (pt) { UI.toast(`특성 선택 — Lv${pt.lvl}`, `능력치 창(C)에서 ${pt.perks.map(k => k.name).join(' · ')} 중 하나`); log(`특성을 고를 수 있다: ${pt.perks.map(k => k.name).join(' · ')} (능력치 창 C)`, '#ffd76a'); }
    G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.8, color: '#ffd76a', r: 80 });
    floatText(p.x, p.y - 40, 'LEVEL UP!', '#ffd76a', 22);
    UI.buildHotbar(); UI.refreshStats();
    saveGame();
  }
  if (p.level >= MAX_LEVEL) p.exp = 0;
}

function damagePlayer(dmg, srcX, srcY) {
  const p = G.player;
  if (p.dead || World.inSafe(p.x, p.y)) return;
  if (p.invT > 0) return; // v1.11 두 번째 숨 무적
  if (p.rollT > 0) { // 슬라이딩 무적
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
  if (rr) Raid.summary(false, rr, Raid.lastDeath.items);
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
  p.buffs.rapid = 0; p.buffs.adren = 0; p.buffs.regen = 0; p.buffs.shield = 0; p.buffs.stim = 0; p.plate = 0;
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
    if (e.def.flying) { const nx = e.x + Math.cos(angle) * k, ny = e.y + Math.sin(angle) * k; if (!World.solidAt(nx, ny)) { e.x = nx; e.y = ny; } }
    else World.move(e, Math.cos(angle) * k, Math.sin(angle) * k);
    if (hit.stagger) e.stunT = Math.max(e.stunT, hit.stagger / wt);
  }
  if (e.hp > 0) Monsters.react(e, dmg, angle, hit); // v1.32 휘청 · 넘어짐
  const big = dmg >= e.maxHp * 0.25 || crit;
  SFX.play(crit ? 'crit' : FACTION[e.type] === 'machine' ? 'metal' : 'hit', 0.8);
  if (Settings.dmgNum) floatText(e.x, e.y - e.r - 6, (crit ? '치명타 ' : '') + dmg, crit ? '#ffe14a' : e.def.boss ? '#ffb0ff' : '#fff', crit ? 18 : big ? 15 : 13);
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
  gainExp(exp);
  floatText(e.x, e.y - 10, `+${fmt(exp)} EXP`, '#e0c040', 12);
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
    hitstop(0.12); G.shake = Math.max(G.shake, 10);
  }
  if (e.affix) { // 엘리트: 사망 효과 + 추가 보상
    Monsters.onDeath(e);
    dropAt('credits', { amount: e.level * 12 });
    if (Math.random() < 0.12 * ECON.gear) dropAt('item', { item: randomGear(e.level, 1.2, 0, ZONES[World.zoneIndex(e.x, e.y)].gear) });
  }
  if (Math.random() < 0.75) dropAt('credits', { amount: Math.round(e.level * rand(2, 5) * (e.type === 'brute' ? 3 : 1)) });
  if (Math.random() < 0.34) dropAt('ammo', { amount: randInt(15, 35) }); // v1.33 0.28 → 0.34 (탄약이 4종으로 나뉘어 권총도 탄이 필요)
  if (Math.random() < 0.05) dropAt('item', { item: makeConsumable('medkit', 1) });
  // 장비 드랍: 일반은 흔하게, 희귀 이상은 가끔. 깊은 지역일수록 좋은 등급 확률 증가
  const gearChance = e.assault || e.fieldBoss || e.labBoss ? 0 : e.type === 'brute' ? 0.04 : 0.015; // v0.10 드랍률 하향 (어설트 적은 보상 상자로 대체) · v1.5.1 (0.05/0.11 → 0.03/0.07) · v1.7.1 (→ 0.015/0.04, 대신 등급 상향)
  const zoneBonus = Math.max(0, World.zoneIndex(e.x, e.y) - 1) * 0.15;
  if (Math.random() < gearChance * ECON.gear * (perk('treasure') ? 1.25 : 1)) { // v1.25 ×0.3
    const it = randomGear(e.level, 0.4 + zoneBonus + (e.type === 'brute' ? 0.6 : 0), p.pity >= PITY_DROPS ? 3 : 0, ZONES[World.zoneIndex(e.x, e.y)].gear);
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
    for (let i = 0; i < n; i++) spawnEnemyBullet(e, off + i / n * TAU, 260, e.dmg * 0.6, '#7fff6a', 5);
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
      if (e.def.shield && !e.bossName) { const df = angDiff(a, e.face || 0), tr = 2.2 * dt; e.face = (e.face || 0) + clamp(df, -tr, tr); } // v1.6 방패병은 천천히 돌아섬 → 슬라이딩으로 뒤를 잡을 수 있음
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
  floatText(p.x, p.y - 20, `방사능 -${d}`, '#7fff6a', 13);
  if (p.hp <= 0) playerDie();
}

// ---------------- 투사체 / 수류탄 / 드랍 ----------------
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
            damageEnemy(e, b.dmg * fall, b.crit, Math.atan2(b.vy, b.vx), { knock: wb ? wb.knock * (pb ? 2.2 : 1) : 3, stagger: wb ? wb.stagger + (pb ? 0.2 : 0) : 0, w: b.w, blastKill: pb, ally: b.ally });
            if (b.mark) e.markT = G.time + 5; // v1.44 윤 저격수 전용: 표적 지정
            if (wb && wb.key === 'sniper') hitstop(0.045);
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
  if (d.kind === 'item' && d.item.unique) { // v1.12 고유 장비: 분홍 빛기둥 + 긴 멈춤
    const uc = '#ff5aa0';
    SFX.play('legend', 4); burst(d.x, d.y, uc, 50, 260, 0.9, 4); burst(d.x, d.y, '#ffd76a', 20, 180, 0.6, 3);
    G.effects.push({ type: 'ring', x: d.x, y: d.y, t: 0, life: 1.1, color: uc, r: 200 });
    floatText(d.x, d.y - 52, '◈ 고유 장비 ◈', uc, 22);
    hitstop(0.2); G.shake = Math.max(G.shake, 12); G.flash = { color: uc, t: 0, life: 0.9, a: 0.5 };
    UI.toast('◈ 고유 장비 ◈', `${itemName(d.item)} — ${UNIQUES[d.item.unique].desc}`);
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
  Tips.update(dt);
  if (!p.dead) {
    const mv = moveInput();
    if (p.rollT > 0) { // 슬라이딩 중: 빠르게 미끄러지다 감속
      const sp = ROLL.speed * (0.3 + 0.7 * p.rollT / ROLL.dur);
      p.rollT -= dt;
      World.move(p, Math.cos(p.rollA) * sp * dt, Math.sin(p.rollA) * sp * dt);
      if (p.rollT <= 0 && armorLegend('afterimage')) { explode(p.x, p.y, p.level * 14 * playerDamageMul(true), 80, { small: true, knock: 18, stagger: 0.5 }); G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.35, color: '#c9a0ff', r: 90 }); } // v1.12 잔상
      for (let i = 0; i < 2; i++) G.particles.push({ x: p.x + rand(-5, 5), y: p.y + rand(-5, 5), vx: -Math.cos(p.rollA) * rand(20, 60) + rand(-20, 20), vy: -Math.sin(p.rollA) * rand(20, 60) + rand(-20, 20), t: 0, life: rand(0.3, 0.55), color: 'rgba(150,140,120,0.55)', size: rand(4, 7), z: 2, vz: 14 }); // 바닥 먼지
    } else if (mv) {
      const { wx, wy, amt } = mv;
      const l = Math.hypot(wx, wy), sp = PlayerStats.speed(p) * dt * amt * World.slow(p.x, p.y); // v1.6 물속은 느림
      World.move(p, wx / l * sp, wy / l * sp);
      p.walkT = (p.walkT || 0) + dt;
    }
    Ambience.playerStep(p, dt, !!mv && !(p.rollT > 0)); // v1.35 바닥별 발소리
    if (IS_TOUCH) Touch.aimUpdate(p); // 모바일 오른쪽 조이스틱 → 조준점·사격
    const aimAt = Iso.toWorld(input.mx, input.my, 20); // 가슴 높이 조준
    p.aim = Math.atan2(aimAt.y - p.y, aimAt.x - p.x); p.aimPt = aimAt; p.aimPtT = G.time;
    if (input.down && !(p.rollT > 0)) playerAttack();
    if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) { p.reloadT = 0; finishReload(); } }
    // 캠프 안에서는 천천히 회복
    const mh = PlayerStats.maxHp(p);
    if (World.inSafe(p.x, p.y) && p.hp < mh) p.hp = Math.min(mh, p.hp + mh * 0.08 * dt);
    else if (p.hp < mh) p.hp = Math.min(mh, p.hp + PlayerStats.regen(p) * dt); // 체력 스탯·옵션 재생
  }
  p.rollCd = (p.rollCd || 0) - dt;
  if ((p.stamT = (p.stamT || 0) - dt) <= 0) p.stam = Math.min(100, p.stam + ROLL.regen * dt); // 스태미나 회복
  p.atkT -= dt; p.hurtT -= dt; p.swingT -= dt; if (G.time - (p.lastShot || -9) > 0.4) p.heat = Math.max(0, (p.heat || 0) - dt * 0.8); p.recoilT = (p.recoilT || 0) - dt; G.noAmmoT -= dt;
  for (let i = 0; i < SKILLS.length; i++) p.skillCd[i] = Math.max(0, (p.skillCd[i] || 0) - dt); // v1.26 스킬 5개
  p.buffs.rapid = Math.max(0, p.buffs.rapid - dt);
  p.buffs.adren = Math.max(0, p.buffs.adren - dt);
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
    log(z === 0 ? `${zn.name} — 안전 지대` : `${zn.name} 진입 (권장 Lv${zn.lvl[0]}~${zn.lvl[1]})`, z === 0 ? '#8f8' : '#fc8');
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
  const lx = lead ? clamp((input.mx - VW / 2) * 0.2, -110, 110) : 0, ly = lead ? clamp((input.my - VH / 2) * 0.2, -70, 70) : 0, kl = 1 - Math.pow(0.02, dt);
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
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.running) {
    if (G.paused) { /* 일시정지: 그리기만 */ }
    else if (G.hitstop > 0) G.hitstop -= dt; // 타격 정지 중에는 월드 정지
    else update(dt);
    render();
    UI.updateHUD(dt);
  }
  requestAnimationFrame(frame);
}

// ---------------- 타이틀 ----------------
(function initTitle() {
  UI.init();
  if (document.fonts) for (const f of ['12px BlackHan', '12px Typer', '12px Pen']) document.fonts.load(f); // v1.39 캔버스 글씨용 글꼴 미리 읽기
  Sprites.loadAll();
  document.getElementById('version-label').textContent = GAME_VERSION;
  const btnC = document.getElementById('btn-continue');
  let save = null;
  // v1.37 슬롯 고르기: 슬롯마다 이름 · 레벨 · 장 · 플레이 시간
  const slots = () => {
    save = loadSave();
    document.getElementById('slot-row').innerHTML = [1, 2, 3].map(n => { const s = loadSave(n), p = s && s.p;
      return `<button class="slot${n === SAVE_SLOT ? ' on' : ''}" data-slot="${n}"><b>No.${n}</b>${p ? `<span class="who">${p.name}</span><span class="meta">Lv${p.level} · ${(p.quest && p.quest.ch) || 0}장 · ${Math.floor((p.playTime || 0) / 3600)}h ${String(Math.floor((p.playTime || 0) % 3600 / 60)).padStart(2, '0')}m</span>` : '<span class="empty">— 빈칸 —</span>'}</button>`; }).join(''); // v1.38 명단 한 줄
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
