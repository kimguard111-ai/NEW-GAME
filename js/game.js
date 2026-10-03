// 메인 게임 루프
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let VW = 0, VH = 0;

const SAVE_KEY = 'seoul2049-save-v1';
const MAP_SEED = 2049;

const G = {
  player: null, enemies: [], bullets: [], particles: [], drops: [], texts: [], effects: [], decals: [], grenades: [],
  npcs: [], cam: { x: 0, y: 0 }, time: 0, shake: 0, running: false,
  spawnT: 0, bossT: 0, boss: null, saveT: 0, darkness: 0.3, zone: 0, noAmmoT: 0,
  shopStock: null, shopLevel: -1,
};
const input = { keys: {}, mx: 0, my: 0, down: false };

function resize() { VW = canvas.width = window.innerWidth; VH = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// ---------------- 입력 ----------------
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  input.keys[k] = true;
  if (!G.running || G.player.dead) return;
  if (k === 'r') startReload();
  else if (k === 'q') swapWeapon();
  else if (k === 'e') interact();
  else if (k === 'i') UI.toggle('inventory');
  else if (k === 'c') UI.toggle('stats');
  else if (k === 'j') UI.toggle('quest');
  else if (k === 'escape') UI.closeAll();
  else if (k >= '1' && k <= '4') useSkill(+k - 1);
  else if (k === '5') quickMedkit();
});
window.addEventListener('keyup', e => { input.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('mousemove', e => { input.mx = e.clientX; input.my = e.clientY; });
canvas.addEventListener('mousedown', e => { if (e.button === 0) input.down = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) input.down = false; });
window.addEventListener('blur', () => { input.keys = {}; input.down = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());

// ---------------- 공용 ----------------
function log(msg, color = '#ddd') { UI.log(msg, color); }
function floatText(x, y, text, color = '#fff', size = 14) {
  G.texts.push({ x: x + rand(-6, 6), y, text, color, size, t: 0, life: 0.9 });
}
function burst(x, y, color, n, speed = 120, life = 0.5, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(speed * 0.3, speed);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, life: rand(life * 0.5, life), color, size });
  }
}
function curWeapon() { const p = G.player; return p.equip[p.active]; }

// ---------------- 저장 ----------------
function saveGame(silent = true) {
  if (!G.player) return;
  try {
    const p = { ...G.player, reloadT: 0, atkT: 0 };
    localStorage.setItem(SAVE_KEY, JSON.stringify({ p, nextItemId, bossT: G.bossT }));
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
  ];
  if (save) {
    G.player = Object.assign(newPlayer(save.p.name), save.p);
    nextItemId = save.nextItemId || 1000;
    G.bossT = save.bossT || 0;
    G.player.dead = false;
    if (G.player.hp <= 0) G.player.hp = PlayerStats.maxHp(G.player);
    log(`${G.player.name}님, 다시 오신 것을 환영합니다.`, '#e0b23a');
  } else {
    G.player = newPlayer(name || '생존자');
    G.player.hp = PlayerStats.maxHp(G.player);
    log('대붕괴 20년 후, 서울. 시청역 생존자 캠프에서 눈을 떴다.', '#e0b23a');
    log('생존자 대장 한씨(오른쪽 위)에게 말을 걸어 임무를 받으세요. [E]', '#8cf');
  }
  G.enemies = []; G.bullets = []; G.drops = []; G.particles = []; G.texts = []; G.effects = []; G.decals = []; G.grenades = [];
  G.boss = null;
  G.running = true;
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  UI.buildHotbar();
  UI.refreshAll();
  saveGame();
}

// ---------------- 플레이어 행동 ----------------
function swapWeapon() {
  const p = G.player, other = p.active === 'w1' ? 'w2' : 'w1';
  if (!p.equip[other]) { log('교체할 무기가 없습니다.', '#aaa'); return; }
  p.active = other; p.reloadT = 0; p.atkT = Math.max(p.atkT, 0.2);
  log(`무기 교체: ${p.equip[other].name}`, '#aaa');
  UI.refreshInventory();
}

function startReload() {
  const p = G.player, w = curWeapon();
  if (!w) return;
  const b = WEAPONS[w.key];
  if (b.melee || p.reloadT > 0 || w.loaded >= b.mag) return;
  if (p.reserve <= 0) {
    if (G.noAmmoT <= 0) { log('예비 탄약이 없습니다! 상점에서 구매하거나 근접 무기로 교체(Q)하세요.', '#f88'); G.noAmmoT = 2; }
    return;
  }
  p.reloadT = b.reload * (p.buffs.adren > 0 ? 0.7 : 1);
}

function finishReload() {
  const p = G.player, w = curWeapon();
  if (!w || WEAPONS[w.key].melee) return;
  const take = Math.min(WEAPONS[w.key].mag - w.loaded, p.reserve);
  w.loaded += take; p.reserve -= take;
}

function playerDamageMul(melee) {
  const p = G.player;
  return (melee ? PlayerStats.meleeMul(p) : PlayerStats.gunMul(p)) * (p.buffs.adren > 0 ? 1.3 : 1);
}

function playerAttack() {
  const p = G.player, w = curWeapon();
  if (!w || p.atkT > 0 || p.reloadT > 0) return;
  const b = WEAPONS[w.key];
  p.atkT = b.rate * PlayerStats.rateMul(p);
  if (b.melee) {
    p.swingT = 0.18;
    const mul = playerDamageMul(true);
    let hit = false;
    for (const e of G.enemies) {
      const d = dist(p, e);
      if (d > b.range + e.r) continue;
      let da = Math.abs(((angleTo(p, e) - p.aim + Math.PI * 3) % TAU) - Math.PI);
      if (da > b.arc / 2 && d > e.r + p.r + 4) continue;
      const crit = Math.random() < PlayerStats.crit(p);
      damageEnemy(e, w.dmg * mul * (crit ? 1.8 : 1), crit, p.aim);
      hit = true;
    }
    if (hit) G.shake = Math.max(G.shake, 4);
    return;
  }
  if (w.loaded <= 0) { p.atkT = 0; startReload(); return; }
  w.loaded--;
  const pellets = b.pellets || 1, mul = playerDamageMul(false);
  const mx = p.x + Math.cos(p.aim) * 22, my = p.y + Math.sin(p.aim) * 22;
  for (let i = 0; i < pellets; i++) {
    const a = p.aim + rand(-b.spread, b.spread);
    const s = b.speed * rand(0.95, 1.05);
    const crit = Math.random() < PlayerStats.crit(p);
    G.bullets.push({
      x: mx, y: my, vx: Math.cos(a) * s, vy: Math.sin(a) * s, from: 'p', life: 0.9,
      dmg: w.dmg * mul * (crit ? 1.8 : 1), crit, pierce: b.pierce || 0, hit: [], color: crit ? '#ffef7a' : '#ffd27a',
    });
  }
  G.particles.push({ x: mx, y: my, vx: 0, vy: 0, t: 0, life: 0.06, color: '#ffe9a0', size: 9 });
  G.shake = Math.max(G.shake, b.pellets ? 5 : b.key === 'sniper' ? 6 : 1.5);
  if (w.loaded === 0) startReload();
}

function useSkill(i) {
  const p = G.player, s = SKILLS[i];
  if (p.level < s.lvl) { log(`${s.name}: Lv${s.lvl}에 습득합니다.`, '#aaa'); return; }
  if (p.skillCd[i] > 0) return;
  if (s.id === 'rapid') { p.buffs.rapid = 4; floatText(p.x, p.y - 30, '집중 사격!', '#7fd'); }
  else if (s.id === 'grenade') {
    const tx = input.mx + G.cam.x, ty = input.my + G.cam.y;
    const a = Math.atan2(ty - p.y, tx - p.x), d = Math.min(380, Math.hypot(tx - p.x, ty - p.y));
    G.grenades.push({ sx: p.x, sy: p.y, x: p.x, y: p.y, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, t: 0, dur: 0.55 });
  } else if (s.id === 'heal') {
    const mh = PlayerStats.maxHp(p), amt = Math.round(mh * 0.35);
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
  if (npc) UI.openNpc(npc);
}
function nearestNpc() {
  const p = G.player;
  let best = null, bd = 75;
  for (const n of G.npcs) { const d = dist(p, n); if (d < bd) { bd = d; best = n; } }
  return best;
}

function gainExp(n) {
  const p = G.player;
  p.exp += n;
  while (p.exp >= PlayerStats.expNext(p.level)) {
    p.exp -= PlayerStats.expNext(p.level);
    p.level++;
    p.statPoints += 3;
    p.hp = PlayerStats.maxHp(p);
    log(`레벨 업! Lv${p.level} — 능력치 포인트 +3 (C)`, '#ffd76a');
    const sk = SKILLS.find(s => s.lvl === p.level);
    if (sk) log(`새 스킬 습득: ${sk.name} [${SKILLS.indexOf(sk) + 1}]`, '#7fd');
    G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.8, color: '#ffd76a', r: 80 });
    floatText(p.x, p.y - 40, 'LEVEL UP!', '#ffd76a', 22);
    UI.buildHotbar(); UI.refreshStats();
    saveGame();
  }
}

function damagePlayer(dmg, srcX, srcY) {
  const p = G.player;
  if (p.dead || World.inSafe(p.x, p.y)) return;
  const d = Math.max(1, Math.round(dmg * (1 - PlayerStats.dmgReduce(p))));
  p.hp -= d; p.hurtT = 0.15;
  floatText(p.x, p.y - 20, '-' + d, '#ff5050', 14);
  G.shake = Math.max(G.shake, 4);
  if (p.hp <= 0) playerDie();
}

function playerDie() {
  const p = G.player;
  p.hp = 0; p.dead = true; input.down = false;
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
  p.x = c.x; p.y = c.y; p.dead = false; p.hp = PlayerStats.maxHp(p); p.reloadT = 0;
  p.buffs.rapid = 0; p.buffs.adren = 0;
  G.enemies = G.enemies.filter(e => e.def.boss || dist(e, p) > 900);
  G.bullets = [];
  document.getElementById('death-screen').classList.add('hidden');
}

// ---------------- 적 ----------------
function damageEnemy(e, dmg, crit, angle) {
  if (e.hp <= 0) return;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.hitT = 0.1; e.state = 'chase';
  floatText(e.x, e.y - e.r - 6, (crit ? '치명타 ' : '') + dmg, crit ? '#ffe14a' : '#fff', crit ? 17 : 13);
  burst(e.x, e.y, e.type === 'drone' ? '#ffc' : '#8a1010', crit ? 8 : 4, 110, 0.35);
  if (!e.def.boss && angle !== undefined) World.move(e, Math.cos(angle) * 4, Math.sin(angle) * 4);
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  const p = G.player;
  const exp = Math.round(e.def.boss ? e.def.exp : e.def.exp * e.level);
  gainExp(exp);
  floatText(e.x, e.y - 10, `+${fmt(exp)} EXP`, '#e0c040', 12);
  p.totalKills++;
  if (e.type !== 'drone') G.decals.push({ x: e.x, y: e.y, r: e.r * rand(1, 1.6), a: rand(0, TAU) });
  if (G.decals.length > 150) G.decals.shift();
  burst(e.x, e.y, e.type === 'drone' ? '#aab' : '#7a0d0d', e.def.boss ? 60 : 14, e.def.boss ? 260 : 140, 0.6, 4);
  // 퀘스트
  const q = QUESTS[p.quest.idx];
  if (p.quest.active && q && q.target === e.type && p.quest.progress < q.count) {
    p.quest.progress++;
    if (p.quest.progress >= q.count) log(`임무 완료: ${q.title} — 한씨에게 보고하세요.`, '#8cf');
    UI.refreshQuest();
  }
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
    // 보스 소환수 정리
    for (const o of G.enemies) if (o.minion) o.hp = 0;
    return;
  }
  if (Math.random() < 0.75) dropAt('credits', { amount: Math.round(e.level * rand(2, 5) * (e.type === 'brute' ? 3 : 1)) });
  if (Math.random() < 0.28) dropAt('ammo', { amount: randInt(15, 35) });
  if (Math.random() < 0.05) dropAt('item', { item: makeConsumable('medkit', 1) });
  const gearChance = e.type === 'brute' ? 0.16 : 0.06;
  if (Math.random() < gearChance) dropAt('item', { item: randomGear(e.level, e.type === 'brute' ? 0.6 : 0) });
}

function spawnEnemyBullet(e, a, speed, dmg, color = '#ff6a4a', r = 3) {
  G.bullets.push({ x: e.x + Math.cos(a) * e.r, y: e.y + Math.sin(a) * e.r, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    from: 'e', life: 1.6, dmg, color, r });
}

function tryMoveSmart(e, a, step) {
  if (e.def.flying) {
    const nx = e.x + Math.cos(a) * step, ny = e.y + Math.sin(a) * step;
    if (!World.inSafe(nx, ny) && nx > TILE && ny > TILE && nx < (World.W - 1) * TILE && ny < (World.H - 1) * TILE) { e.x = nx; e.y = ny; }
    return;
  }
  const tries = [0, e.sideDir * Math.PI / 4, e.sideDir * Math.PI / 2, -e.sideDir * Math.PI / 4, -e.sideDir * Math.PI / 2];
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
  const p = G.player, rage = e.hp < e.maxHp * 0.5 ? 1.5 : 1;
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
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    e.atkT -= dt; e.fireT -= dt; e.hitT -= dt;
    const d = dist(e, p);
    if (!p.dead && !pSafe && d < e.def.aggro) e.state = 'chase';
    else if (e.state === 'chase' && (p.dead || pSafe || d > e.def.aggro * 1.7)) e.state = 'idle';
    if (e.def.boss) updateBoss(e, dt, d);

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
      let moveA = a, spd = e.speed;
      if (e.def.ranged) {
        const los = World.lineOfSight(e, p);
        if (los && d < e.def.range * 0.55) moveA = a + Math.PI;
        else if (los && d < e.def.range * 0.9) { moveA = a + e.sideDir * Math.PI / 2; spd *= 0.6; }
        if (los && d < e.def.range && e.fireT <= 0) {
          e.fireT = e.def.fireCd * rand(0.8, 1.25);
          spawnEnemyBullet(e, a + rand(-0.06, 0.06), e.def.bulletSpeed, e.dmg);
        }
        if (Math.random() < dt * 0.4) e.sideDir *= -1;
      }
      if (d > e.r + p.r + 2) tryMoveSmart(e, moveA, spd * dt);
      if (!e.def.ranged && d < e.r + p.r + 8 && e.atkT <= 0) {
        e.atkT = e.def.atkCd;
        damagePlayer(e.dmg, e.x, e.y);
      }
    } else {
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
  if (G.spawnT > 0) return;
  G.spawnT = 0.35;
  // 먼 적 정리
  G.enemies = G.enemies.filter(e => e.def.boss || e.minion || dist(e, p) < 1800 || e.state === 'chase');
  const z = World.zoneIndex(p.x, p.y);
  const near = G.enemies.filter(e => !e.def.boss && dist(e, p) < 1300).length;
  const target = z === 0 ? 8 : 14 + z * 3;
  if (near >= target) return;
  for (let tries = 0; tries < 6; tries++) {
    const a = rand(0, TAU), r = rand(560, 950);
    const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
    if (World.circleBlocked(x, y, 22) || World.inSafe(x, y)) continue;
    const zi = World.zoneIndex(x, y);
    if (zi === 0) continue;
    const zone = ZONES[zi];
    // 캠프에서 멀어질수록 레벨 상승
    const prev = ZONES[zi - 1].maxDist, span = Math.min(zone.maxDist, 110) - prev;
    const t = clamp((World.distTiles(x, y) - prev) / span, 0, 1);
    const lvl = clamp(Math.round(lerp(zone.lvl[0], zone.lvl[1], t) + rand(-1, 1)), zone.lvl[0], zone.lvl[1]);
    const e = makeEnemy(weighted(zone.spawns), x, y, lvl);
    G.enemies.push(e);
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
            damageEnemy(e, b.dmg, b.crit, Math.atan2(b.vy, b.vx));
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
      const dmg = (45 + p.level * 9) * playerDamageMul(false);
      for (const e of G.enemies) {
        const d = Math.hypot(e.x - g.x, e.y - g.y);
        if (d < 110 + e.r) damageEnemy(e, dmg * (d < 50 ? 1 : 0.7), false, Math.atan2(e.y - g.y, e.x - g.x));
      }
      G.effects.push({ type: 'boom', x: g.x, y: g.y, t: 0, life: 0.45, r: 110 });
      burst(g.x, g.y, '#ffb040', 30, 260, 0.5, 4);
      burst(g.x, g.y, '#555', 20, 120, 0.9, 6);
      G.shake = Math.max(G.shake, 12);
    }
  }
  G.grenades = G.grenades.filter(g => !g.done);
}

function updateDrops(dt) {
  const p = G.player;
  for (const d of G.drops) {
    d.t += dt;
    if (p.dead) continue;
    const dd = dist(p, d);
    if (dd < 90 && d.kind !== 'item') { // 자석 효과
      const a = angleTo(d, p); d.x += Math.cos(a) * 260 * dt; d.y += Math.sin(a) * 260 * dt;
    }
    if (dd < 24) {
      if (d.kind === 'credits') { p.credits += d.amount; floatText(p.x, p.y - 26, `+${d.amount}₵`, '#ffd76a', 12); d.gone = true; }
      else if (d.kind === 'ammo') { p.reserve += d.amount; floatText(p.x, p.y - 26, `탄약 +${d.amount}`, '#cc8', 12); d.gone = true; }
      else if (d.kind === 'item') {
        if (addItem(d.item)) {
          log(`획득: ${d.item.name}${d.item.count > 1 ? ' x' + d.item.count : ''}`, RARITIES[d.item.rarity || 0].color);
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
  if (!p.dead) {
    let mx = 0, my = 0;
    if (input.keys['w'] || input.keys['arrowup']) my -= 1;
    if (input.keys['s'] || input.keys['arrowdown']) my += 1;
    if (input.keys['a'] || input.keys['arrowleft']) mx -= 1;
    if (input.keys['d'] || input.keys['arrowright']) mx += 1;
    if (mx || my) {
      const l = Math.hypot(mx, my), sp = PlayerStats.speed(p) * dt;
      World.move(p, mx / l * sp, my / l * sp);
      p.walkT = (p.walkT || 0) + dt;
    }
    p.aim = Math.atan2(input.my + G.cam.y - p.y, input.mx + G.cam.x - p.x);
    if (input.down) playerAttack();
    if (p.reloadT > 0) { p.reloadT -= dt; if (p.reloadT <= 0) { p.reloadT = 0; finishReload(); } }
    // 캠프 안에서는 천천히 회복
    const mh = PlayerStats.maxHp(p);
    if (World.inSafe(p.x, p.y) && p.hp < mh) p.hp = Math.min(mh, p.hp + mh * 0.08 * dt);
  }
  p.atkT -= dt; p.hurtT -= dt; p.swingT -= dt; G.noAmmoT -= dt;
  for (let i = 0; i < 4; i++) p.skillCd[i] = Math.max(0, p.skillCd[i] - dt);
  p.buffs.rapid = Math.max(0, p.buffs.rapid - dt);
  p.buffs.adren = Math.max(0, p.buffs.adren - dt);

  spawnEnemies(dt);
  updateBossSpawn(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateGrenades(dt);
  updateDrops(dt);

  for (const pt of G.particles) { pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vx *= 0.9; pt.vy *= 0.9; }
  G.particles = G.particles.filter(pt => pt.t < pt.life);
  for (const t of G.texts) { t.t += dt; t.y -= 32 * dt; }
  G.texts = G.texts.filter(t => t.t < t.life);
  for (const ef of G.effects) ef.t += dt;
  G.effects = G.effects.filter(ef => ef.t < ef.life);

  // 지역 변경
  const z = World.zoneIndex(p.x, p.y);
  if (z !== G.zone) {
    G.zone = z;
    const zn = ZONES[z];
    log(z === 0 ? `${zn.name} — 안전 지대` : `${zn.name} 진입 (권장 Lv${zn.lvl[0]}~${zn.lvl[1]})`, z === 0 ? '#8f8' : '#fc8');
  }
  G.darkness = lerp(G.darkness, ZONES[z].dark, dt * 1.5);

  // 카메라
  G.shake *= Math.pow(0.002, dt);
  G.cam.x = clamp(p.x - VW / 2, 0, World.W * TILE - VW) + rand(-G.shake, G.shake);
  G.cam.y = clamp(p.y - VH / 2, 0, World.H * TILE - VH) + rand(-G.shake, G.shake);

  G.saveT += dt;
  if (G.saveT > 20) { G.saveT = 0; saveGame(); }
}

// ---------------- 렌더링 ----------------
const TILE_COLORS = {
  [T.ROAD]: '#2a2c30', [T.WALK]: '#45464b', [T.RUBBLE]: '#3d3833', [T.GRASS]: '#2c3824',
  [T.CAMP]: '#363c45', [T.CAR]: '#2a2c30', [T.BARRICADE]: '#363c45',
};

function drawTile(tx, ty, t, x, y) {
  const h = hash2(tx, ty);
  if (t === T.BUILDING) {
    const s = World.shade[ty * World.W + tx];
    const base = 70 + Math.floor(s * 40);
    ctx.fillStyle = `rgb(${base},${base - 4},${base - 10})`;
    ctx.fillRect(x, y, TILE, TILE);
    const below = World.tileAt(tx, ty + 1), above = World.tileAt(tx, ty - 1);
    if (above !== T.BUILDING) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, TILE, 3); }
    if (below !== T.BUILDING) {
      // 정면 벽 (창문)
      ctx.fillStyle = `rgb(${base - 35},${base - 38},${base - 42})`;
      ctx.fillRect(x, y + TILE - 12, TILE, 12);
      ctx.fillStyle = h < 0.3 ? '#c9a24a' : '#1b1d22';
      ctx.fillRect(x + 6, y + TILE - 9, 7, 6);
      ctx.fillStyle = h > 0.85 ? '#c9a24a' : '#1b1d22';
      ctx.fillRect(x + 19, y + TILE - 9, 7, 6);
    } else if (h < 0.08) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 8, y + 8, 12, 12); // 환풍구
    }
    if (World.tileAt(tx - 1, ty) !== T.BUILDING) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y, 2, TILE); }
    return;
  }
  ctx.fillStyle = TILE_COLORS[t];
  ctx.fillRect(x, y, TILE, TILE);
  if (t === T.ROAD || t === T.CAR) {
    const lx = tx % World.BLOCK, ly = ty % World.BLOCK;
    ctx.fillStyle = '#8a7a3a';
    if (lx === 1 && ly >= 3 && ty % 2 === 0) ctx.fillRect(x + 14, y + 4, 4, 18);
    if (ly === 1 && lx >= 3 && tx % 2 === 0) ctx.fillRect(x + 4, y + 14, 18, 4);
    if (h < 0.06) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + h * 200, y + 10, 10, 6); } // 균열
  } else if (t === T.WALK) {
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  } else if (t === T.RUBBLE) {
    ctx.fillStyle = '#58524a';
    for (let i = 0; i < 3; i++) {
      const hh = hash2(tx * 3 + i, ty * 7 - i);
      ctx.fillRect(x + hh * 24, y + hash2(ty + i, tx) * 24, 4 + hh * 6, 3 + hh * 4);
    }
  } else if (t === T.GRASS) {
    ctx.fillStyle = '#3a4a2c';
    if (h < 0.5) ctx.fillRect(x + h * 50, y + 8, 3, 3);
    if (h > 0.4) ctx.fillRect(x + 6, y + h * 26, 3, 3);
    if (h > 0.93) { ctx.fillStyle = '#4a3a28'; ctx.beginPath(); ctx.arc(x + 16, y + 16, 9, 0, TAU); ctx.fill(); } // 고목
  } else if (t === T.CAMP) {
    ctx.strokeStyle = 'rgba(120,150,190,0.12)'; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }
  if (t === T.CAR) {
    const cols = ['#6b3a2a', '#4a5560', '#5d5a3a', '#3a4a5a'];
    ctx.fillStyle = cols[Math.floor(h * 4)];
    ctx.fillRect(x + 2, y + 6, TILE - 4, TILE - 12);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + 9, y + 9, 12, TILE - 18);
  } else if (t === T.BARRICADE) {
    ctx.fillStyle = '#8a7048'; ctx.fillRect(x + 1, y + 4, TILE - 2, TILE - 8);
    ctx.fillStyle = '#6e5a3a'; ctx.fillRect(x + 1, y + 15, TILE - 2, 2); ctx.fillRect(x + 15, y + 4, 2, TILE - 8);
  }
}

function drawShadow(x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y + r * 0.6, r, r * 0.45, 0, 0, TAU); ctx.fill();
}

function drawPlayer(p) {
  const x = p.x - G.cam.x, y = p.y - G.cam.y;
  drawShadow(x, y, p.r);
  const w = curWeapon(), b = w ? WEAPONS[w.key] : null;
  ctx.save(); ctx.translate(x, y); ctx.rotate(p.aim);
  if (b && b.melee) {
    const swing = p.swingT > 0 ? (p.swingT / 0.18 - 0.5) * b.arc : -0.6;
    ctx.save(); ctx.rotate(swing);
    ctx.fillStyle = w.key === 'katana' ? '#bde' : w.key === 'axe' ? '#a33' : '#888';
    ctx.fillRect(8, -2, b.range * 0.55, 4);
    ctx.restore();
    if (p.swingT > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${p.swingT * 3})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, b.range * 0.8, -b.arc / 2, b.arc / 2); ctx.stroke();
    }
  } else if (b) {
    const len = w.key === 'sniper' ? 30 : w.key === 'pistol' ? 16 : 24;
    ctx.fillStyle = '#222'; ctx.fillRect(6, -3, len, 6);
    ctx.fillStyle = '#555'; ctx.fillRect(6, -3, len, 2);
  }
  ctx.fillStyle = '#d9b48f'; ctx.beginPath(); ctx.arc(10, 6, 3.5, 0, TAU); ctx.arc(10, -6, 3.5, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = p.hurtT > 0 ? '#fff' : '#3e5f3a';
  ctx.beginPath(); ctx.arc(x, y, p.r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#1a2a18'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(x, y, p.r * 0.55, 0, TAU); ctx.fill(); // 헬멧
  if (p.buffs.adren > 0) { ctx.strokeStyle = 'rgba(255,120,40,0.7)'; ctx.beginPath(); ctx.arc(x, y, p.r + 5, 0, TAU); ctx.stroke(); }
  if (p.buffs.rapid > 0) { ctx.strokeStyle = 'rgba(120,255,220,0.7)'; ctx.beginPath(); ctx.arc(x, y, p.r + 8, 0, TAU); ctx.stroke(); }
  ctx.lineWidth = 1;
  ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#9fe08f'; ctx.fillText(p.name, x, y - p.r - 8);
  if (p.reloadT > 0) {
    const b2 = WEAPONS[curWeapon().key];
    ctx.fillStyle = '#000'; ctx.fillRect(x - 18, y + p.r + 6, 36, 4);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 18, y + p.r + 6, 36 * (1 - p.reloadT / b2.reload), 4);
  }
}

function drawEnemy(e) {
  const x = e.x - G.cam.x, y = e.y - G.cam.y;
  if (x < -80 || y < -80 || x > VW + 80 || y > VH + 80) return;
  const f = e.face || 0, flash = e.hitT > 0;
  const hover = e.def.flying ? Math.sin(G.time * 6 + e.x) * 3 - 10 : 0;
  drawShadow(x, y, e.r * (e.def.flying ? 0.7 : 1));
  ctx.save(); ctx.translate(x, y + hover);
  const col = flash ? '#fff' : e.def.color;
  switch (e.type) {
    case 'zombie':
      ctx.rotate(f);
      ctx.fillStyle = flash ? '#fff' : '#4e6b38';
      ctx.fillRect(4, -9, 14, 4); ctx.fillRect(4, 5, 14, 4);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c33'; ctx.fillRect(5, -4, 3, 3); ctx.fillRect(5, 2, 3, 3);
      break;
    case 'dog':
      ctx.rotate(f);
      ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, e.r * 1.5, e.r * 0.8, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e.r * 1.4, 0, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff4'; ctx.fillRect(e.r * 1.6, -3, 2, 2); ctx.fillRect(e.r * 1.6, 2, 2, 2);
      break;
    case 'raider':
      ctx.rotate(f);
      ctx.fillStyle = '#222'; ctx.fillRect(6, -2, 20, 5);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2a22'; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.55, 0, TAU); ctx.fill();
      break;
    case 'brute':
      ctx.rotate(f);
      ctx.fillStyle = flash ? '#fff' : '#5a3a68';
      ctx.beginPath(); ctx.arc(10, -14, 9, 0, TAU); ctx.arc(10, 14, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d9c'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.6; ctx.fillRect(Math.cos(a) * 12 - 2, Math.sin(a) * 12 - 2, 4, 4); }
      break;
    case 'drone':
      ctx.rotate(G.time * 0.5);
      ctx.fillStyle = col; ctx.fillRect(-9, -9, 18, 18);
      ctx.fillStyle = 'rgba(200,220,240,0.5)';
      for (const [ox, oy] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) { ctx.beginPath(); ctx.arc(ox, oy, 6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = e.state === 'chase' ? '#f33' : '#3f3'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
      break;
    case 'boss': {
      const pulse = 1 + Math.sin(G.time * 4) * 0.05;
      ctx.fillStyle = 'rgba(80,255,90,0.15)'; ctx.beginPath(); ctx.arc(0, 0, e.r * 1.6 * pulse, 0, TAU); ctx.fill();
      ctx.rotate(f);
      ctx.fillStyle = flash ? '#fff' : '#2a6a3a';
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * e.r * 1.35, Math.sin(a) * e.r * 1.35); ctx.lineTo(Math.cos(a + 0.25) * e.r, Math.sin(a + 0.25) * e.r); ctx.lineTo(Math.cos(a - 0.25) * e.r, Math.sin(a - 0.25) * e.r); ctx.fill(); }
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, e.r * pulse, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eaff5a'; ctx.beginPath(); ctx.arc(14, -10, 5, 0, TAU); ctx.arc(14, 10, 5, 0, TAU); ctx.fill();
      if (e.charge > 0.8) { ctx.strokeStyle = 'rgba(255,60,60,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(300, 0); ctx.stroke(); ctx.lineWidth = 1; }
      break;
    }
  }
  ctx.restore();
  if (!e.def.boss) {
    const ty = y + hover - e.r - 8;
    ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    const lvDiff = e.level - G.player.level;
    ctx.fillStyle = lvDiff >= 4 ? '#f66' : lvDiff >= 1 ? '#fc8' : lvDiff <= -4 ? '#999' : '#eee';
    ctx.fillText(`Lv${e.level} ${e.def.name}`, x, ty - 4);
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#300'; ctx.fillRect(x - 16, ty, 32, 4);
      ctx.fillStyle = '#e33'; ctx.fillRect(x - 16, ty, 32 * e.hp / e.maxHp, 4);
    }
  }
}

function drawNpc(n) {
  const x = n.x - G.cam.x, y = n.y - G.cam.y;
  drawShadow(x, y, 13);
  ctx.fillStyle = n.color; ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a'; ctx.fillText(n.name, x, y - 22);
  let mark = null;
  if (n.id === 'captain') {
    const p = G.player, q = QUESTS[p.quest.idx];
    if (q && p.quest.active && p.quest.progress >= q.count) mark = ['?', '#ffd700'];
    else if (q && !p.quest.active && p.level >= q.minLevel) mark = ['!', '#ffd700'];
  } else if (n.id === 'merchant') mark = ['₵', '#aaa'];
  else if (n.id === 'medic') mark = ['✚', '#f55'];
  if (mark) {
    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = mark[1];
    ctx.fillText(mark[0], x, y - 38 + Math.sin(G.time * 3) * 3);
  }
}

function render() {
  const cam = G.cam, p = G.player;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  const tx0 = Math.max(0, Math.floor(cam.x / TILE)), ty0 = Math.max(0, Math.floor(cam.y / TILE));
  const tx1 = Math.min(World.W - 1, Math.ceil((cam.x + VW) / TILE)), ty1 = Math.min(World.H - 1, Math.ceil((cam.y + VH) / TILE));
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    drawTile(tx, ty, World.tiles[ty * World.W + tx], Math.floor(tx * TILE - cam.x), Math.floor(ty * TILE - cam.y));
  }
  // 핏자국
  for (const d of G.decals) {
    ctx.fillStyle = 'rgba(90,10,10,0.45)';
    ctx.beginPath(); ctx.ellipse(d.x - cam.x, d.y - cam.y, d.r, d.r * 0.6, d.a, 0, TAU); ctx.fill();
  }
  // 보스 아레나 표시
  const bx = World.bossTile.x * TILE + 16 - cam.x, by = World.bossTile.y * TILE + 16 - cam.y;
  ctx.strokeStyle = 'rgba(80,255,90,0.25)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(bx, by, 7.5 * TILE, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;

  // 드랍
  for (const d of G.drops) {
    const x = d.x - cam.x, y = d.y - cam.y + Math.sin(G.time * 4 + d.x) * 2;
    if (d.kind === 'credits') { ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#a07a10'; ctx.stroke(); }
    else if (d.kind === 'ammo') { ctx.fillStyle = '#7a7a3a'; ctx.fillRect(x - 6, y - 4, 12, 8); ctx.fillStyle = '#cc8'; ctx.fillRect(x - 4, y - 2, 8, 2); }
    else {
      const c = RARITIES[d.item.rarity || 0].color;
      ctx.fillStyle = c; ctx.globalAlpha = 0.25 + Math.sin(G.time * 5) * 0.1;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.item.icon, x, y + 6);
      ctx.font = '11px sans-serif'; ctx.fillStyle = c; ctx.fillText(d.item.name, x, y - 16);
    }
  }
  for (const n of G.npcs) drawNpc(n);
  for (const e of G.enemies) drawEnemy(e);
  if (!p.dead) drawPlayer(p);

  // 투사체
  for (const b of G.bullets) {
    const x = b.x - cam.x, y = b.y - cam.y;
    if (b.from === 'p') {
      ctx.strokeStyle = b.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * 0.015, y - b.vy * 0.015); ctx.stroke();
    } else {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(x, y, b.r || 3, 0, TAU); ctx.fill();
    }
  }
  ctx.lineWidth = 1;
  for (const g of G.grenades) {
    drawShadow(g.x - cam.x, g.y - cam.y, 4);
    ctx.fillStyle = '#4a5a3a'; ctx.beginPath(); ctx.arc(g.x - cam.x, g.y - cam.y - g.h, 5, 0, TAU); ctx.fill();
  }
  for (const pt of G.particles) {
    ctx.globalAlpha = 1 - pt.t / pt.life; ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - cam.x - pt.size / 2, pt.y - cam.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  for (const ef of G.effects) {
    const k = ef.t / ef.life, x = ef.x - cam.x, y = ef.y - cam.y;
    if (ef.type === 'boom') {
      ctx.fillStyle = `rgba(255,170,60,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(x, y, ef.r * (0.4 + k * 0.6), 0, TAU); ctx.fill();
    } else if (ef.type === 'ring') {
      ctx.strokeStyle = ef.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, ef.r * k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
  }

  // 어둠 / 분위기
  const px = p.x - cam.x, py = p.y - cam.y;
  const grd = ctx.createRadialGradient(px, py, 140, px, py, Math.max(VW, VH) * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, `rgba(0,0,0,${G.darkness + 0.25})`);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = `rgba(10,8,20,${G.darkness * 0.35})`; ctx.fillRect(0, 0, VW, VH);
  const tint = ZONES[G.zone].tint;
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, VW, VH); }
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(200,0,0,${p.hurtT})`; ctx.fillRect(0, 0, VW, VH); }
  const mh = PlayerStats.maxHp(p);
  if (!p.dead && p.hp < mh * 0.3) {
    const a = 0.25 + Math.sin(G.time * 6) * 0.1;
    const g2 = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.8);
    g2.addColorStop(0, 'rgba(120,0,0,0)'); g2.addColorStop(1, `rgba(140,0,0,${a})`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, VW, VH);
  }

  // 떠오르는 텍스트
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    ctx.globalAlpha = 1 - t.t / t.life;
    ctx.font = `bold ${t.size}px sans-serif`;
    ctx.fillStyle = '#000'; ctx.fillText(t.text, t.x - cam.x + 1, t.y - cam.y + 1);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x - cam.x, t.y - cam.y);
  }
  ctx.globalAlpha = 1;
}

// ---------------- 루프 ----------------
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.running) {
    update(dt);
    render();
    UI.updateHUD(dt);
  }
  requestAnimationFrame(frame);
}

// ---------------- 타이틀 ----------------
(function initTitle() {
  UI.init();
  const save = loadSave();
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
