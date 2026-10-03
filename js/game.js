// 메인 게임 루프
const canvas = document.getElementById('game');
let ctx = canvas.getContext('2d');
let VW = 0, VH = 0;

const SAVE_KEY = 'seoul2049-save-v1';
const MAP_SEED = 2049;

const G = {
  player: null, enemies: [], bullets: [], particles: [], drops: [], texts: [], effects: [], decals: [], grenades: [],
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
  ZOOM = clamp(Math.round(z * 10) / 10, ZOOM_MIN, 1.8);
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
  if (k === 'r') startReload();
  else if (k === 'q') swapWeapon();
  else if (k === 'e') interact();
  else if (k === ' ') { e.preventDefault(); dodge(); }
  else if (k === 'i') UI.toggle('inventory');
  else if (k === 'c') UI.toggle('stats');
  else if (k === 'j') UI.toggle('quest');
  else if (k === 'o') UI.toggle('settings');
  else if (k === 'escape') { if (UI.anyOpen()) UI.closeAll(); else Pause.toggle(); }
  else if (k >= '1' && k <= '4') useSkill(+k - 1);
  else if (k === '5') quickMedkit();
});
window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e => { input.mx = e.clientX / ZOOM; input.my = e.clientY / ZOOM; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) input.down = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) input.down = false; });
window.addEventListener('blur', () => { input.keys = {}; input.down = false; });
document.addEventListener('visibilitychange', () => { if (document.hidden && G.running && !G.paused && !G.player.dead) Pause.toggle(); }); // 탭을 떠나면 자동 일시정지
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------------- 공용 ----------------
function log(msg, color = '#ddd') { UI.log(msg, color); }
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
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ver: 2, p, nextItemId, bossT: G.bossT }));
    if (!silent) log('게임이 저장되었습니다.', '#8f8');
  } catch (e) { /* 저장 불가 환경 */ }
}
function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

// ---------------- 시작 ----------------
function startGame(save, name) {
  World.generate(MAP_SEED);
  const c = World.campCenter();
  G.npcs = [
    { id: 'merchant', name: '암시장 상인 박씨', x: c.x - 120, y: c.y - 70, color: '#c9a227' },
    { id: 'captain', name: '생존자 대장 한씨', x: c.x + 120, y: c.y - 70, color: '#4f7fbf' },
    { id: 'medic', name: '의무병 이씨', x: c.x, y: c.y + 110, color: '#e8e8e8' },
    { id: 'mechanic', name: '정비공 최씨', x: c.x - 140, y: c.y + 60, color: '#888' },
  ];
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
    if (G.player.mapV !== 3) { Object.assign(G.player, World.campCenter()); G.player.mapV = 3; } // 맵 구조가 바뀌면(v0.11 축소 · v0.13 큰 건물) 캠프에서 시작
    if (World.circleBlocked(G.player.x, G.player.y, G.player.r)) Object.assign(G.player, World.campCenter());
    log(`${G.player.name}님, 다시 오신 것을 환영합니다.`, '#e0b23a');
  } else {
    G.player = newPlayer(name || '생존자');
    G.player.hp = PlayerStats.maxHp(G.player);
    log('대붕괴 20년 후, 서울. 시청역 생존자 캠프에서 눈을 떴다.', '#e0b23a');
    G.autoStory = true; // v0.16: 1장을 바로 시작 (캠프 대화 없이)
  }
  G.enemies = []; G.bullets = []; G.drops = []; G.particles = []; G.texts = []; G.effects = []; G.decals = []; G.grenades = []; G.corpses = [];
  G.boss = null; G.elite = null; G.strikes = []; G.pools = []; G.assault = null; G.fieldBoss = null; G.fbT = 150; G.inside = null;
  G.player.assaults = G.player.assaults || {}; // v0.9 어설트 기록
  const P = G.player; P.tips = P.tips || []; P.playTime = P.playTime || 0; P.deaths = P.deaths || 0; P.bestCombo = P.bestCombo || 0; // v1.0 기록
  Bounty.refresh(); // v0.14 일일 의뢰
  G.running = true;
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  UI.buildHotbar();
  UI.refreshAll();
  if (G.autoStory) { G.autoStory = false; Story.start(G.player); log('조작: WASD 이동 · 마우스 조준·사격 · Space 구르기(무적) · R 재장전 · 1~4 스킬', '#8cf'); }
  saveGame();
}

// ---------------- 플레이어 행동 ----------------
// 구르기 (v0.16): 0.28초 무적 돌진, 1초 쿨타임. 이동 중이면 그 방향, 아니면 조준 방향
const ROLL = { dur: 0.28, speed: 540, cd: 1.0 };
function dodge() {
  const p = G.player;
  if (p.dead || p.rollT > 0 || (p.rollCd || 0) > 0) return;
  let a = p.aim;
  const m = moveInput();
  if (m) a = Math.atan2(m.wy, m.wx);
  p.rollT = ROLL.dur; p.rollCd = ROLL.cd; p.rollA = a;
  SFX.play('dodge'); burst(p.x, p.y, '#8a8070', 6, 80, 0.3, 3);
}
// 현재 이동 입력 (월드 방향, 정규화 안 됨). 없으면 null
function moveInput() {
  let mx = 0, my = 0, amt = 1;
  if (input.keys['w'] || input.keys['arrowup']) my -= 1;
  if (input.keys['s'] || input.keys['arrowdown']) my += 1;
  if (input.keys['a'] || input.keys['arrowleft']) mx -= 1;
  if (input.keys['d'] || input.keys['arrowright']) mx += 1;
  if (Touch.move) { mx = Touch.move.x; my = Touch.move.y; amt = Math.min(1, Touch.move.mag); } // 모바일 왼쪽 조이스틱
  if (!mx && !my) return null;
  // 화면 기준 방향 → 월드 방향 (쿼터뷰)
  return { wx: (mx + 2 * my) / 2, wy: (2 * my - mx) / 2, amt };
}

function swapWeapon() {
  const p = G.player, other = p.active === 'w1' ? 'w2' : 'w1';
  if (!p.equip[other]) { log('교체할 무기가 없습니다.', '#aaa'); return; }
  p.active = other; p.reloadT = 0; p.atkT = Math.max(p.atkT, 0.2);
  log(`무기 교체: ${itemName(p.equip[other])}`, '#aaa');
  UI.refreshInventory();
}

function startReload() {
  const p = G.player, w = curWeapon();
  if (!w) return;
  const b = WEAPONS[w.key];
  if (b.melee || p.reloadT > 0 || w.loaded >= magSize(w)) return;
  if (p.reserve <= 0 && !b.infinite) {
    if (G.noAmmoT <= 0) { log('예비 탄약이 없습니다! 상점에서 구매하거나 근접 무기로 교체(Q)하세요.', '#f88'); G.noAmmoT = 2; SFX.play('empty'); }
    return;
  }
  p.reloadT = p.reloadMax = b.reload * PlayerStats.reloadMul(p);
  SFX.play('reload');
}

function finishReload() {
  const p = G.player, w = curWeapon();
  if (!w || WEAPONS[w.key].melee) return;
  const need = magSize(w) - w.loaded;
  if (WEAPONS[w.key].infinite) { w.loaded += need; return; } // 권총: 예비 탄약 소모 없음
  const take = Math.min(need, p.reserve);
  w.loaded += take; p.reserve -= take;
}

function playerDamageMul(melee) {
  const p = G.player;
  return (melee ? PlayerStats.meleeMul(p) : PlayerStats.gunMul(p)) * (p.buffs.adren > 0 ? 1 + SkillCalc.adrenDmg(p) : 1);
}

function playerAttack() {
  const p = G.player, w = curWeapon();
  if (!w || p.atkT > 0 || p.reloadT > 0) return;
  const b = WEAPONS[w.key];
  p.atkT = b.rate * PlayerStats.rateMul(p);
  p.lastAtk = G.time; // 공격 애니메이션용
  SFX.play(b.melee ? 'swing' : { smg: 'smg', rifle: 'rifle', lmg: 'lmg', shotgun: 'shotgun', sniper: 'sniper' }[w.key] || 'pistol');
  const critMul = PlayerStats.critMul(p, w), cc = PlayerStats.crit(p, w);
  if (b.melee) {
    const reach = meleeReach(w);
    p.swingT = 0.18;
    World.move(p, Math.cos(p.aim) * 6, Math.sin(p.aim) * 6); // 휘두르며 살짝 전진
    const dmg = weaponDmg(w) * playerDamageMul(true);
    let hits = 0, anyCrit = false;
    for (const e of G.enemies) {
      if (e.hp <= 0) continue;
      const d = dist(p, e);
      if (d > reach.range + e.r) continue;
      const da = Math.abs(((angleTo(p, e) - p.aim + Math.PI * 3) % TAU) - Math.PI);
      if (da > reach.arc / 2 && d > e.r + p.r + 4) continue;
      if (!World.lineOfSight(p, e)) continue; // 벽 너머 타격 방지
      const crit = Math.random() < cc;
      anyCrit = anyCrit || crit;
      damageEnemy(e, dmg * (crit ? critMul : 1), crit, angleTo(p, e), { knock: b.knock, stagger: b.stagger, w });
      hits++;
    }
    if (hits) {
      G.shake = Math.max(G.shake, 3 + b.knock * 0.12);
      hitstop(anyCrit ? 0.075 : 0.04 + Math.min(0.03, b.stagger * 0.04));
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
  if (!(w.legend === 'thrift' && Math.random() < 0.35)) w.loaded--;
  const pellets = pelletCount(w), dmg = weaponDmg(w) * playerDamageMul(false);
  const spread = b.spread * (1 - gearBonus(p, 'accuracy', w)), pierce = (b.pierce || 0) + gearBonus(p, 'pierce', w);
  const mx = p.x + Math.cos(p.aim) * 22, my = p.y + Math.sin(p.aim) * 22;
  const life = b.range / b.speed;
  for (let i = 0; i < pellets; i++) {
    const a = p.aim + rand(-spread, spread);
    const s = b.speed * rand(0.95, 1.05);
    const crit = Math.random() < cc;
    G.bullets.push({
      x: mx, y: my, vx: Math.cos(a) * s, vy: Math.sin(a) * s, from: 'p', life, maxLife: life, falloff: b.falloff,
      dmg: dmg * (crit ? critMul : 1), crit, pierce, hit: [], w,
      color: crit ? '#ffef7a' : w.legend === 'boom' ? '#ff8a3a' : '#ffd27a',
    });
  }
  p.recoilT = 0.07;
  G.particles.push({ x: mx, y: my, vx: 0, vy: 0, t: 0, life: 0.06, color: '#ffe9a0', size: b.pellets ? 14 : w.key === 'sniper' ? 12 : 8, z: 22 });
  G.shake = Math.max(G.shake, b.pellets ? 6 : w.key === 'sniper' ? 7 : w.key === 'lmg' ? 2.2 : 1.5);
  if (w.loaded === 0) startReload();
}

// 범위 폭발 (수류탄 / 폭발탄 공용)
function explode(x, y, dmg, r, opts = {}) {
  for (const e of G.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (e.hp > 0 && d < r + e.r && World.lineOfSight({ x, y }, e)) damageEnemy(e, dmg * (d < r * 0.45 ? 1 : 0.7), false, Math.atan2(e.y - y, e.x - x), { knock: opts.knock || 0, stagger: opts.stagger || 0, noProc: true });
  }
  G.effects.push({ type: 'boom', x, y, t: 0, life: 0.4, r });
  SFX.play('boom', opts.small ? 0.4 : 1);
  burst(x, y, '#ffb040', opts.small ? 12 : 30, opts.small ? 160 : 260, 0.5, 4);
  if (!opts.small) burst(x, y, '#555', 20, 120, 0.9, 6);
  G.shake = Math.max(G.shake, opts.small ? 4 : 12);
}

function useSkill(i) {
  const p = G.player, s = SKILLS[i];
  if (p.level < s.lvl) { log(`${s.name}: Lv${s.lvl}에 습득합니다.`, '#aaa'); return; }
  if (p.skillCd[i] > 0) return;
  SFX.play(s.id === 'heal' ? 'heal' : 'skill');
  if (s.id === 'rapid') { p.buffs.rapid = SkillCalc.rapidDur(p); floatText(p.x, p.y - 30, '집중 사격!', '#7fd'); }
  else if (s.id === 'grenade') {
    const { x: tx, y: ty } = Iso.toWorld(input.mx, input.my);
    const a = Math.atan2(ty - p.y, tx - p.x), d = Math.min(380, Math.hypot(tx - p.x, ty - p.y));
    G.grenades.push({ sx: p.x, sy: p.y, x: p.x, y: p.y, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, t: 0, dur: 0.55 });
  } else if (s.id === 'heal') {
    const mh = PlayerStats.maxHp(p), amt = Math.round(mh * SkillCalc.healPct(p));
    p.hp = Math.min(mh, p.hp + amt);
    floatText(p.x, p.y - 30, '+' + amt, '#6f6', 16); burst(p.x, p.y, '#6f6', 16, 80);
  } else if (s.id === 'adren') { p.buffs.adren = 8; floatText(p.x, p.y - 30, '아드레날린!', '#f84'); }
  p.skillCd[i] = s.cd;
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
    const amt = Math.round(mh * 0.4);
    p.hp = Math.min(mh, p.hp + amt);
    floatText(p.x, p.y - 30, '+' + amt, '#6f6', 16);
  } else if (it.key === 'ammo') {
    p.reserve += 120; log('예비 탄약 +120', '#cc8');
  } else return;
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
  if (inv.length >= 24) return false;
  inv.push(it);
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
  const crate = Interiors.nearCrate();
  if (crate) { Interiors.openCrate(crate); return; }
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
    log(`레벨 업! Lv${p.level} — 능력치 포인트 +3 (C)`, '#ffd76a');
    SFX.play('levelup');
    const sk = SKILLS.find(s => s.lvl === p.level);
    if (sk) log(`새 스킬 습득: ${sk.name} [${SKILLS.indexOf(sk) + 1}]`, '#7fd');
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
  if (p.rollT > 0) { // 구르기 무적
    if (G.time - (p.dodgeTxt || 0) > 0.4) { p.dodgeTxt = G.time; floatText(p.x, p.y - 30, '회피!', '#9fe0ff', 14); }
    return;
  }
  SFX.play('ehit');
  const d = Math.max(1, Math.round(dmg * (1 - PlayerStats.dmgReduce(p))));
  p.hp -= d; p.hurtT = 0.15;
  floatText(p.x, p.y - 20, '-' + d, '#ff5050', 14);
  G.shake = Math.max(G.shake, 4);
  if (p.hp <= 0) playerDie();
}

function playerDie() {
  const p = G.player;
  p.hp = 0; p.dead = true; input.down = false; p.deaths++;
  const lost = Math.floor(p.credits * 0.1);
  p.credits -= lost;
  burst(p.x, p.y, '#a00', 30, 160, 0.8, 4);
  log(`사망했습니다. ${fmt(lost)} 크레딧을 잃었습니다.`, '#f55');
  UI.closeAll();
  document.getElementById('death-screen').classList.remove('hidden');
  saveGame();
}

function respawn() {
  const p = G.player, c = World.campCenter();
  p.x = c.x; p.y = c.y; p.dead = false; p.hp = PlayerStats.maxHp(p); p.reloadT = 0; p.hurtT = 0;
  p.buffs.rapid = 0; p.buffs.adren = 0;
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
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.hitT = e.def.boss ? 0.05 : 0.1; e.state = 'chase';
  // 넉백·경직은 적의 무게에 반비례 (보스는 무시)
  const wt = e.weight ?? e.def.weight; // 네임드는 잘 밀리지 않음
  if (wt > 0 && angle !== undefined) {
    const k = (hit.knock || 3) / wt;
    if (e.def.flying) { const nx = e.x + Math.cos(angle) * k, ny = e.y + Math.sin(angle) * k; if (!World.solidAt(nx, ny)) { e.x = nx; e.y = ny; } }
    else World.move(e, Math.cos(angle) * k, Math.sin(angle) * k);
    if (hit.stagger) e.stunT = Math.max(e.stunT, hit.stagger / wt);
  }
  const big = dmg >= e.maxHp * 0.25 || crit;
  SFX.play(crit ? 'crit' : e.type === 'drone' ? 'metal' : 'hit', 0.8);
  if (Settings.dmgNum) floatText(e.x, e.y - e.r - 6, (crit ? '치명타 ' : '') + dmg, crit ? '#ffe14a' : e.def.boss ? '#ffb0ff' : '#fff', crit ? 18 : big ? 15 : 13);
  burst(e.x, e.y, e.type === 'drone' ? '#ffc' : '#8a1010', crit ? 9 : 4, crit ? 150 : 110, 0.35);
  if (crit) burst(e.x, e.y, '#fff3a0', 5, 180, 0.15, 2);
  if (e.def.boss && (crit || (hit.stagger || 0) >= 0.5)) { G.shake = Math.max(G.shake, 5); hitstop(0.035); }
  if (w && !hit.noProc) {
    if (w.legend === 'leech') p.hp = Math.min(PlayerStats.maxHp(p), p.hp + dmg * 0.04);
    if (w.legend === 'boom' && Math.random() < 0.2) explode(e.x, e.y, dmg * 0.6, 55, { small: true, knock: 10, stagger: 0.15 });
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
    killEnemy(e);
    if (w && w.legend === 'quickload' && w === curWeapon() && !hit.noProc) {
      w.loaded = magSize(w); p.reloadT = 0;
      floatText(p.x, p.y - 34, '장전!', '#ffd27a', 13);
    }
  }
}

function killEnemy(e) {
  const p = G.player;
  // 보스 소환수는 경험치 20%, 드랍 없음 (보스 옆 무한 파밍 방지)
  // 연속 처치 콤보 (v0.16): 3초 안에 이어 잡으면 경험치 +5%씩 (최대 +50%)
  if (!e.minion) {
    G.combo = G.time - (G.comboT || -9) < 3 ? (G.combo || 0) + 1 : 1; G.comboT = G.time;
    if (G.combo >= 3) SFX.play('combo', G.combo);
    if (G.combo > p.bestCombo) p.bestCombo = G.combo;
    if (G.combo === 10 || G.combo === 25 || G.combo === 50) { UI.toast(`${G.combo} 연속 처치!`, `보너스 +${G.combo * p.level}₵`); p.credits += G.combo * p.level; }
  }
  const comboMul = 1 + Math.min(0.5, Math.max(0, (G.combo || 1) - 1) * 0.05);
  SFX.play(e.def.boss || e.fieldBoss || e.elite ? 'roar' : 'kill', e.def.boss ? 1 : 0.8);
  const exp = Math.round((e.def.boss ? e.def.exp : e.def.exp * e.level) * PlayerStats.expMul(p) * (e.minion ? 0.2 : 1) * (e.expMul || 1) * comboMul); // 엘리트 4배
  gainExp(exp);
  floatText(e.x, e.y - 10, `+${fmt(exp)} EXP`, '#e0c040', 12);
  p.totalKills++;
  const ck = e.art && Sprites.get(e.art) ? e.art : e.type; // 보스 전용 그림이면 그 그림으로 쓰러짐
  if (Sprites.get(ck) && ART.sprites[ck].anims.death) {
    G.corpses.push({ key: ck, x: e.x, y: e.y, face: e.face || 0, t0: G.time });
    if (G.corpses.length > 30) G.corpses.shift();
  }
  if (e.type !== 'drone') G.decals.push({ x: e.x, y: e.y, r: e.r * rand(1, 1.6), a: rand(0, TAU) });
  if (G.decals.length > 150) G.decals.shift();
  burst(e.x, e.y, e.type === 'drone' ? '#aab' : '#7a0d0d', e.def.boss ? 60 : 18, e.def.boss ? 260 : 170, 0.6, 4);
  G.effects.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.3, color: e.type === 'drone' ? '#cde' : '#fff', r: e.r * 2.5 });
  if (e.type === 'brute') hitstop(0.06);
  if (e.def.boss) hitstop(0.3);
  // 퀘스트
  Story.onKill(e);
  Bounty.onKill(e); // v0.14 일일 의뢰
  // 드랍
  const dropAt = (kind, extra) => G.drops.push({ x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), kind, t: 0, ...extra });
  if (e.def.boss) {
    p.bossKills++;
    G.boss = null; G.bossT = 240;
    log('방사능 군주 타이탄을 쓰러뜨렸다! 서울에 희망이 비친다.', '#ffa53a');
    G.shake = 20;
    dropAt('credits', { amount: 3000 + randInt(0, 2000) });
    for (let i = 0; i < 3; i++) dropAt('item', { item: randomGear(20, 2.5) });
    dropAt('item', { item: makeConsumable('medkit', 5) });
    Workshop.gain(30, 8, '타이탄 잔해 회수');
    // 보스 소환수 정리
    for (const o of G.enemies) if (o.minion) o.hp = 0;
    return;
  }
  if (e.minion) return;
  if (e.fieldBoss) Bosses.onFieldKill(e, dropAt);
  if (e.elite) { // 네임드: 장비 확정 + 크레딧
    G.elite = null;
    log(`${ELITES[e.elite].name} 처치!`, '#ffa53a');
    dropAt('item', { item: randomGear(e.level, 1.5, 2, ZONES[World.zoneIndex(e.x, e.y)].gear) });
    dropAt('credits', { amount: e.level * 40 });
    hitstop(0.12); G.shake = Math.max(G.shake, 10);
  }
  if (e.affix) { // 엘리트: 사망 효과 + 추가 보상
    Monsters.onDeath(e);
    dropAt('credits', { amount: e.level * 12 });
    if (Math.random() < 0.35) dropAt('item', { item: randomGear(e.level, 0.8, 0, ZONES[World.zoneIndex(e.x, e.y)].gear) });
  }
  if (Math.random() < 0.75) dropAt('credits', { amount: Math.round(e.level * rand(2, 5) * (e.type === 'brute' ? 3 : 1)) });
  if (Math.random() < 0.28) dropAt('ammo', { amount: randInt(15, 35) });
  if (Math.random() < 0.05) dropAt('item', { item: makeConsumable('medkit', 1) });
  // 장비 드랍: 일반은 흔하게, 희귀 이상은 가끔. 깊은 지역일수록 좋은 등급 확률 증가
  const gearChance = e.assault || e.fieldBoss ? 0 : e.type === 'brute' ? 0.11 : 0.05; // v0.10 드랍률 하향 (어설트 적은 보상 상자로 대체)
  const zoneBonus = Math.max(0, World.zoneIndex(e.x, e.y) - 1) * 0.15;
  if (Math.random() < gearChance) {
    const it = randomGear(e.level, zoneBonus + (e.type === 'brute' ? 0.6 : 0), p.pity >= PITY_DROPS ? 3 : 0, ZONES[World.zoneIndex(e.x, e.y)].gear);
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
    e.atkT -= dt; e.fireT -= dt; e.hitT -= dt; e.buffT = (e.buffT || 0) - dt;
    const d = dist(e, p);
    if (e.stunT > 0) { e.stunT -= dt; e.state = 'chase'; e.fireT = Math.max(e.fireT, 0.2); Monsters.interrupt(e); continue; } // 경직: 이동·공격 불가, 준비 중인 공격 끊김
    const same = Interiors.sameSpace(e); // 건물 안팎이 다르면 쫓지 않음 (벽 너머 길찾기 없음)
    if (!p.dead && !pSafe && same && d < e.def.aggro) e.state = 'chase';
    else if (e.state === 'chase' && (p.dead || pSafe || d > e.def.aggro * (e.heard ? 2.6 : 1.7) || (!same && Nav.dist && Nav.dist[Math.floor(e.y / TILE) * World.W + Math.floor(e.x / TILE)] < 0))) e.state = 'idle'; // 길이 없을 때만 포기
    if (e.assault && !p.dead) e.state = 'chase'; // 어설트 적은 항상 추격
    if (e.def.boss) updateBoss(e, dt, d);
    if ((e.elite || e.patterns) && e.state === 'chase') Monsters.updateNamed(e, dt);
    if (e.affix && e.state === 'chase' && !e.announced) { e.announced = true; log(`⚠ 엘리트: ${ELITE_AFFIXES[e.affix].name} ${e.def.name} (${ELITE_AFFIXES[e.affix].desc})`, ELITE_AFFIXES[e.affix].color); }

    if (e.charge > 0) {
      // 보스 돌진 (0.5초 예고 후 질주)
      e.charge -= dt;
      if (e.charge < 0.8) {
        tryMoveSmart(e, e.chargeA, 430 * dt);
        if (d < e.r + p.r + 4 && e.atkT <= 0) { damagePlayer(e.dmg * 1.4); e.atkT = 0.8; }
      }
      continue;
    }

    if (e.state === 'chase') {
      const a = angleTo(e, p);
      e.face = a;
      let moveA = a, spd = e.speed * Monsters.buff(e);
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
      if (!hold && d > e.r + p.r + 2) tryMoveSmart(e, moveA, spd * dt);
      if (e.def.boss && d < e.r + p.r + 8 && e.atkT <= 0) {
        e.atkT = e.def.atkCd * (e.atkMul || 1); e.lastAtk = G.time;
        damagePlayer(e.dmg * Monsters.buff(e), e.x, e.y);
      }
    } else if (!Monsters.infight(e, dt)) { // 플레이어가 없으면 다른 세력과 싸움, 아니면 배회
      e.wanderT -= dt;
      if (e.wanderT <= 0) { e.wanderT = rand(1.5, 4); e.wanderA = rand(0, TAU); e.wandering = Math.random() < 0.6; }
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
      if (!a.def.boss) World.move(a, -nx * push, -ny * push);
      if (!b.def.boss) World.move(b, nx * push, ny * push);
    }
  }
  G.enemies = G.enemies.filter(e => e.hp > 0);
}

function spawnEnemies(dt) {
  const p = G.player;
  G.spawnT -= dt;
  if (G.spawnT > 0 || G.assault) return; // 어설트 중에는 일반 스폰 없음
  G.spawnT = 0.35;
  // 먼 적 정리
  G.enemies = G.enemies.filter(e => e.def.boss || e.minion || e.elite || e.fieldBoss || dist(e, p) < 1800 || e.state === 'chase');
  if (G.elite && G.elite.hp <= 0) G.elite = null;
  const z = World.zoneIndex(p.x, p.y);
  const near = G.enemies.filter(e => !e.def.boss && dist(e, p) < 1300).length;
  const target = z === 0 ? 8 : 18 + z * 4; // v0.16 밀도 상향 (14+z·3 → 18+z·4)
  if (near >= target) return;
  for (let tries = 0; tries < 6; tries++) {
    const a = rand(0, TAU), r = rand(560, 950);
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (World.circleBlocked(x, y, 22) || World.inSafe(x, y) || World.buildingAt(x, y)) continue; // 실내 적은 입장 시 따로
    const zi = World.zoneIndex(x, y);
    if (zi === 0) continue;
    if (zi > z && Math.random() < 0.7) continue; // 지역 경계 너머(더 위험한 지역) 스폰은 덜 나오게
    const zone = ZONES[zi];
    // 캠프에서 멀어질수록 레벨 상승
    const prev = ZONES[zi - 1].maxDist, span = Math.min(zone.maxDist, 86) - prev;
    const t = clamp((World.distTiles(x, y) - prev) / span, 0, 1);
    const lvl = clamp(Math.round(lerp(zone.lvl[0], zone.lvl[1], t) + rand(-1, 1)), zone.lvl[0], zone.lvl[1]);
    const type = weighted(zone.spawns), e = makeEnemy(type, x, y, lvl);
    if (Math.random() < Monsters.eliteChance(zi)) Monsters.makeElite(e, Monsters.rollAffix(type)); // v0.8 엘리트
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
  const hel = p.equip.helmet, res = hel ? HELMETS[hel.key].radRes || 0 : 0; // 방독면
  const d = Math.max(1, Math.round(PlayerStats.maxHp(p) * 0.015 * (1 - res)));
  p.hp -= d;
  floatText(p.x, p.y - 20, `☢ -${d}`, '#7fff6a', 13);
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
        b.life = 0; burst(b.x, b.y, '#ccb', 3, 70, 0.2, 2); break;
      }
      if (b.from === 'p') {
        for (const e of G.enemies) {
          if (e.hp <= 0 || b.hit.includes(e)) continue;
          if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (e.r + 3) ** 2) {
            b.hit.push(e);
            // 산탄총·기관단총: 사거리 후반부 피해 감소 (최대 -50%)
            const fall = b.falloff ? clamp(1 - Math.max(0, (1 - b.life / b.maxLife) - 0.5), 0.5, 1) : 1;
            const wb = b.w && WEAPONS[b.w.key];
            damageEnemy(e, b.dmg * fall, b.crit, Math.atan2(b.vy, b.vx), { knock: wb ? wb.knock : 3, stagger: wb ? wb.stagger : 0, w: b.w });
            if (wb && wb.key === 'sniper') hitstop(0.035);
            if (b.pierce-- <= 0) { b.life = 0; break; }
          }
        }
      } else {
        if (World.inSafe(b.x, b.y)) { b.life = 0; break; }
        if (!p.dead && (p.x - b.x) ** 2 + (p.y - b.y) ** 2 < (p.r + (b.r || 3)) ** 2) {
          damagePlayer(b.dmg); b.life = 0; break;
        }
      }
    }
  }
  G.bullets = G.bullets.filter(b => b.life > 0);
}

function updateGrenades(dt) {
  const p = G.player;
  for (const g of G.grenades) {
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    g.x = lerp(g.sx, g.tx, k); g.y = lerp(g.sy, g.ty, k); g.h = Math.sin(k * Math.PI) * 40;
    if (k >= 1) {
      g.done = true;
      explode(g.x, g.y, SkillCalc.grenadeDmg(p) * (p.buffs.adren > 0 ? 1 + SkillCalc.adrenDmg(p) : 1), SkillCalc.grenadeR(p), { knock: 30, stagger: 0.6 });
      hitstop(0.05);
    }
  }
  G.grenades = G.grenades.filter(g => !g.done);
}

function updateDrops(dt) {
  const p = G.player;
  for (const d of G.drops) {
    if (!d.seen) { // 희귀 이상 장비가 떨어지는 순간: 소리 + 글자 (빛기둥은 render)
      d.seen = true;
      const r = d.kind === 'item' && d.item.kind !== 'cons' ? d.item.rarity || 0 : 0;
      if (r >= 2) { SFX.play('item', r); floatText(d.x, d.y - 40, `${RARITIES[r].name}!`, RARITIES[r].color, 14 + r * 2); }
    }
    d.t += dt;
    if (p.dead) continue;
    const dd = dist(p, d);
    if (dd < 90 && d.kind !== 'item') { // 자석 효과
      const a = angleTo(d, p); d.x += Math.cos(a) * 260 * dt; d.y += Math.sin(a) * 260 * dt;
    }
    if (dd < 24) {
      if (d.kind === 'credits') { p.credits += d.amount; floatText(p.x, p.y - 26, `+${d.amount}₵`, '#ffd76a', 12); d.gone = true; SFX.play('coin'); }
      else if (d.kind === 'ammo') { p.reserve += d.amount; floatText(p.x, p.y - 26, `탄약 +${d.amount}`, '#cc8', 12); d.gone = true; SFX.play('ammo'); }
      else if (d.kind === 'item') {
        if (addItem(d.item)) {
          const r = d.item.rarity || 0, up = isUpgrade(p, d.item);
          SFX.play('item', Math.min(4, r));
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
    if (p.rollT > 0) { // 구르는 중: 정해진 방향으로 빠르게
      p.rollT -= dt;
      World.move(p, Math.cos(p.rollA) * ROLL.speed * dt, Math.sin(p.rollA) * ROLL.speed * dt);
      if (Math.random() < 0.5) G.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, t: 0, life: 0.35, color: 'rgba(150,140,120,0.6)', size: 6, z: 4 });
    } else if (mv) {
      const { wx, wy, amt } = mv;
      const l = Math.hypot(wx, wy), sp = PlayerStats.speed(p) * dt * amt;
      World.move(p, wx / l * sp, wy / l * sp);
      p.walkT = (p.walkT || 0) + dt;
    }
    if (IS_TOUCH) Touch.aimUpdate(p); // 모바일 오른쪽 조이스틱 → 조준점·사격
    const aimAt = Iso.toWorld(input.mx, input.my, 20); // 가슴 높이 조준
    p.aim = Math.atan2(aimAt.y - p.y, aimAt.x - p.x);
    if (input.down && !(p.rollT > 0)) playerAttack();
    if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) { p.reloadT = 0; finishReload(); } }
    // 캠프 안에서는 천천히 회복
    const mh = PlayerStats.maxHp(p);
    if (World.inSafe(p.x, p.y) && p.hp < mh) p.hp = Math.min(mh, p.hp + mh * 0.08 * dt);
    else if (p.hp < mh) p.hp = Math.min(mh, p.hp + PlayerStats.regen(p) * dt); // 체력 스탯·옵션 재생
  }
  p.rollCd = (p.rollCd || 0) - dt;
  p.atkT -= dt; p.hurtT -= dt; p.swingT -= dt; p.recoilT = (p.recoilT || 0) - dt; G.noAmmoT -= dt;
  for (let i = 0; i < 4; i++) p.skillCd[i] = Math.max(0, p.skillCd[i] - dt);
  p.buffs.rapid = Math.max(0, p.buffs.rapid - dt);
  p.buffs.adren = Math.max(0, p.buffs.adren - dt);

  spawnEnemies(dt);
  updateBossSpawn(dt);
  Interiors.update();
  Nav.update(dt);
  updateEnemies(dt);
  Assault.update(dt);
  Bosses.updateField(dt);
  updateBullets(dt);
  updateGrenades(dt);
  Monsters.updateHazards(dt);
  updateDrops(dt);

  for (const pt of G.particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.9; pt.vy *= 0.9; if (pt.vz) pt.z += pt.vz * dt; }
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
  G.darkness = lerp(G.darkness, ZONES[z].dark + (G.inside ? 0.15 : 0), dt * 1.5); // 실내는 조금 어둡게

  // 카메라
  G.shake *= Math.pow(0.002, dt);
  if (!Settings.shake) G.shake = 0; // 설정: 화면 흔들림 끔
  G.cam.x = (p.x - p.y) * ISO_K - VW / 2 + rand(-G.shake, G.shake);
  G.cam.y = (p.x + p.y) * ISO_K / 2 - VH / 2 - 20 + rand(-G.shake, G.shake);

  G.saveT += dt;
  if (G.saveT > 20) { G.saveT = 0; Bounty.refresh(); saveGame(); } // 자정이 지나면 의뢰 갱신
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
  Sprites.loadAll();
  const save = loadSave();
  document.getElementById('version-label').textContent = GAME_VERSION;
  const btnC = document.getElementById('btn-continue');
  if (!save) btnC.disabled = true;
  else btnC.textContent = `이어하기 (${save.p.name} Lv${save.p.level})`;
  document.getElementById('btn-new').onclick = () => {
    if (save && !confirm('기존 저장 데이터가 삭제됩니다. 새로 시작할까요?')) return;
    const name = document.getElementById('name-input').value.trim() || '생존자';
    startGame(null, name);
  };
  btnC.onclick = () => startGame(save);
  document.getElementById('btn-respawn').onclick = respawn;
  window.addEventListener('beforeunload', () => saveGame());
  requestAnimationFrame(frame);
})();
