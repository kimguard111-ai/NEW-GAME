// 밸런스 측정 봇 (v1.7): 실제 출격 루프(캠프 정비·상점 → 레벨에 맞는 맵 출격 → 이야기 목표 → 탈출/사망)를 Lv1부터 자동으로 돌려
// 레벨 도달 시간 · 맵별 사망률 · 사망 원인 · 분당 처치를 출력. 봇은 조준이 사람보다 정확하고 엄폐를 안 함 → 시간은 대략 ×3 하면 사람 기준
// 실행: npm i playwright (최초 1회) 후  node tools/balance-bot.js <게임 분> [구르기 성공률 0~1] [시작 레벨] [고정 맵]
//   예) node tools/balance-bot.js 300 0.5          → Lv1부터 300분
//       node tools/balance-bot.js 60 0.5 22 gangnam → Lv22·상점 희귀+4 장비로 강남만 60분
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const MIN = +process.argv[2] || 60, DODGE = process.argv[3] !== undefined ? +process.argv[3] : 0.5;
const START = +process.argv[4] || 0, FIXMAP = process.argv[5] || ''; // 시나리오: 이 레벨·상점 장비로 시작해서 한 맵만 반복 (이야기 끝난 상태)
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1])); pg.on('dialog', d => d.accept());
  await pg.goto('file://' + require('path').resolve(__dirname, '../index.html')); await pg.evaluate(() => localStorage.clear()); await pg.reload();
  await pg.click('#btn-new'); await pg.waitForTimeout(900); await pg.evaluate(() => UI.close('dialog')); // v1.15 첫 안내 창 닫기
  await pg.evaluate(([DODGE, START, FIXMAP]) => {
    Settings.tips = false;
    const p = G.player;
    window.B = { raids: [], lvlT: { 1: 0 }, field: null, fieldKey: '', cur: null, seen: new WeakSet(), dodges: 0, dodgeTry: 0, enh: 0, bought: 0 };
    // 목표 칸까지 거리 지도 (BFS)
    B.makeField = (x, y) => {
      const W = World.W, H = World.H, d = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H);
      let h = 0, n = 0; const gx = Math.floor(x / TILE), gy = Math.floor(y / TILE);
      for (let r = 0; r <= 8 && !n; r++) for (let yy = gy - r; yy <= gy + r; yy++) for (let xx = gx - r; xx <= gx + r; xx++) { // 목표가 막힌 칸(랜드마크)이면 가장 가까운 빈 칸들에서 시작
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const i = yy * W + xx; if (d[i] < 0 && !SOLID.has(World.tiles[i])) { d[i] = 0; q[n++] = i; } }
      while (h < n) { const i = q[h++], cx = i % W; for (const j of [i - 1, i + 1, i - W, i + W]) { if (j < 0 || j >= W * H || d[j] >= 0 || SOLID.has(World.tiles[j])) continue; if ((j === i - 1 && cx === 0) || (j === i + 1 && cx === W - 1)) continue; d[j] = d[i] + 1; q[n++] = j; } }
      return d;
    };
    B.goField = (f, sp) => {
      const W = World.W, tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE), here = f[ty * W + tx];
      let best = here < 0 ? 1e9 : here, bx = 0, by = 0;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const v = f[(ty + oy) * W + tx + ox]; if (v >= 0 && v < best) { best = v; bx = ox; by = oy; } }
      if (!bx && !by) return here === 0;
      const a = Math.atan2((ty + by + 0.5) * TILE - p.y, (tx + bx + 0.5) * TILE - p.x);
      if (!World.move(p, Math.cos(a) * sp, Math.sin(a) * sp)) World.move(p, Math.cos(a + 0.8) * sp, Math.sin(a + 0.8) * sp);
      return false;
    };
    B.mapFor = () => {
      const L = p.level, want = L < 5 ? 'myeongdong' : L < 10 ? 'jongno' : L < 15 ? 'yongsan' : L < 20 ? 'yeouido' : L < 25 ? 'gangnam' : 'jamsil';
      const story = CHAPTER_MAP[p.quest.ch]; // 이야기 맵이 열려 있고 레벨이 되면 우선
      const last3 = B.raids.slice(-3); // 3번 연속 사망하면 한 단계 쉬운 맵에서 정비 (사람처럼)
      if (last3.length === 3 && last3.every(r => !r.ok) && !B.retreat) B.retreat = 2;
      if (B.retreat > 0) { B.retreat--; const order = ['myeongdong', 'jongno', 'yongsan', 'yeouido', 'gangnam', 'jamsil'], i = order.indexOf(B.raids[B.raids.length - 1].map); return order[Math.max(0, i - 1)]; }
      if (story && Raid.unlocked(story) && Story.chapter(p) && p.level >= Story.chapter(p).minLevel) return story;
      if (Raid.unlocked(want)) return want;
      return [...MAP_ORDER].reverse().find(id => id !== 'lab' && Raid.unlocked(id));
    };
    // 캠프 정비: 장착·판매·보충·강화·능력치
    B.camp = () => {
      for (const s of SKILLS) if (p.level >= s.lvl && !p.skills[s.id] && p.sp >= SKILL_SP.root) { p.sp -= SKILL_SP.root; p.skills[s.id] = true; p.srank[s.id] = 1; } // v1.25 스킬 포인트
      for (const s of SKILLS) while (p.skills[s.id] && srank(s.id) < SKILL_RANKS && p.level >= rankLvl(s, srank(s.id) + 1) && p.sp >= SKILL_SP.root) { p.sp -= SKILL_SP.root; p.srank[s.id] = srank(s.id) + 1; } // v1.26 등급
      for (const s of SKILLS) if (p.stree[s.id + '_r2'] && srank(s.id) >= SKILL_RANKS && !p.smodOwned[s.id + '_a'] && !p.smodOwned[s.id + '_b'] && p.sp >= SKILL_SP.a) { p.sp -= SKILL_SP.a; p.smodOwned[s.id + '_a'] = true; p.skillMods[s.id] = 'a'; } // v1.25 갈래
      for (const s of SKILLS) for (const k of ['r1', 'r2', 'cap']) { const n = SKILL_TREE[s.id][k]; if (p.skills[s.id] && !p.stree[s.id + '_' + k] && UI.treeNode(s, k).pre && p.level >= n.lvl && p.sp >= SKILL_SP[k]) { p.sp -= SKILL_SP[k]; p.stree[s.id + '_' + k] = true; } } // v1.22 스킬 트리 · v1.25 SP
      for (const b of Object.keys(PASSIVES)) PASSIVES[b].forEach((n, i) => { if (!p.passive[n.id] && (i === 0 || p.passive[PASSIVES[b][i - 1].id]) && p.level >= n.lvl && p.credits >= n.price + 2500) { p.credits -= n.price; p.passive[n.id] = true; B.skillBuy = (B.skillBuy || 0) + n.price; } }); // v1.23 패시브 단련
      UI.openShop(); // 상인 진열품 중 더 좋은 것 구매 (사람처럼)
      for (const it of G.shopStock) if (p.level >= itemReqLevel(it) && isUpgrade(p, it) && p.credits >= it.value + 300) { const c = JSON.parse(JSON.stringify(it)); c.id = nextItemId++; UI.buy(c, it.value); B.shop = (B.shop || 0) + it.value; }
      for (const it of [...p.inventory]) if (it.kind !== 'cons' && p.level >= itemReqLevel(it) && isUpgrade(p, it)) UI.equip(it, it.kind === 'weapon' ? (WEAPONS[it.key].melee ? 'w2' : 'w1') : it.kind);
      for (const it of [...p.inventory]) if (it.kind !== 'cons' && !isUpgrade(p, it)) { p.credits += itemSellPrice(it); removeItem(it); }
      const med = p.inventory.find(i => i.key === 'medkit'); let mc = med ? med.count : 0;
      while (mc < 8 && p.credits >= 120 + 50) { addItem(makeConsumable('medkit', 3)); p.credits -= 120; mc += 3; B.bought += 120; }
      while (p.reserve < 400 && p.credits >= 45 + 50) { p.reserve += 120; p.credits -= 45; B.bought += 45; }
      for (const slot of ['w1', 'armor', 'helmet']) { const it = p.equip[slot]; let k = 0; while (it && it.plus < 6 && p.credits > enhanceCost(it) * 2 && k++ < 10) { UI.doEnhance(it); B.enh++; } }
      while (p.statPoints > 0) { p.stats[['dex', 'vit', 'agi'][p.statPoints % 3]]++; p.statPoints--; }
      PERK_TIERS.forEach((t, i) => { if (p.level >= t.lvl && !p.perks[i]) p.perks[i] = ['thickSkin', 'runner', 'steadyAim', 'lastStand', 'secondWind', 'apex'][i]; }); // v1.16 봇도 특성 선택 (생존 위주)
      UI.closeAll();
    };
    B.deploy = () => {
      B.camp();
      const id = B.mapFor();
      Raid.deploy(id); $('raid-summary').classList.add('hidden');
      B.cur = { map: id, t0: G.time, k0: p.totalKills, lv0: p.level, exp0: p.exp, cr0: p.credits, plan: rand(300, 480) };
      B.field = null; B.fieldKey = '';
    };
    B.endRaid = ok => {
      const c = B.cur; if (!c) return;
      const w = p.equip.w1;
      B.raids.push({ map: c.map, ok, min: ((G.time - c.t0) / 60).toFixed(1), kills: p.totalKills - c.k0, lv: `${c.lv0}→${p.level}`, dps: Math.round(weaponDps(p, w)), def: PlayerStats.def(p), hp: PlayerStats.maxHp(p), ch: `${p.quest.ch}-${p.quest.step}`, cr: p.credits, w: `${w.name}+${w.plus}`, t: (G.time / 60).toFixed(0) });
      B.cur = null;
    };
    B.tick = () => {
      if (p.dead) { B.endRaid(false); respawn(); $('raid-summary').classList.add('hidden'); return B.deploy(); }
      if (World.map === 'camp') { if (B.cur) B.endRaid(true); return B.deploy(); }
      const c = B.cur, mh = PlayerStats.maxHp(p);
      const med = (p.inventory.find(i => i.key === 'medkit') || { count: 0 }).count;
      const leave = G.time - c.t0 > c.plan || p.inventory.length >= 22 || (med === 0 && p.hp < mh * 0.5);
      // 적 고르기 (가까운 것, 시야 우선)
      let best = null, bd = 1e9;
      for (const e of G.enemies) { if (e.hp <= 0) continue; const d = dist(e, p) + (World.lineOfSight(p, e) ? 0 : 400); if (d < bd) { bd = d; best = e; } }
      const w = curWeapon(), W = WEAPONS[w.key], range = W.melee ? W.range : W.range * 0.8;
      const sp = PlayerStats.speed(p) / 30 * World.slow(p.x, p.y);
      // 예고 공격 반응: 한 번의 예고마다 DODGE 확률로 구르기
      for (const e of G.enemies) {
        const tele = (e.windT > 0 && dist(e, p) < 70) || (e.pounceT > 0 && dist(e, p) < 260) || (e.aimT > 0 && e.aimT < 0.2 && dist(e, p) < 500) || (e.slamT > 0 && dist(e, p) < 110);
        if (tele && !e._tele) { B.dodgeTry++; if (Math.random() < DODGE && p.stam >= ROLL.cost) { dodge(); B.dodges++; } }
        e._tele = tele;
      }
      for (const s of G.strikes) if (Math.hypot(p.x - s.x, p.y - s.y) < s.r + 14 && Math.random() < DODGE * 0.1) { const aa = Math.atan2(p.y - s.y, p.x - s.x); World.move(p, Math.cos(aa) * sp * 1.5, Math.sin(aa) * sp * 1.5); }
      // 이동 목표: 탈출 / 이야기(도착·네임드) / 전투 / 줍기 / 배회
      const st = Story.step(p), tg = Story.target(p);
      let goal = null;
      if (leave) { const ex = G.exits.filter(q => !q.locked).sort((a, b2) => dist(a, p) - dist(b2, p))[0]; goal = ['ex', ex.x, ex.y]; }
      else if (tg && st && (st.type === 'reach' || st.type === 'hunt' || (st.type === 'kill' && st.target === 'boss')) && !(st.type === 'hunt' && G.elite && dist(G.elite, p) < 500) && !(st.target === 'boss' && G.boss && dist(G.boss, p) < 500)) goal = ['st' + st.type, tg.x, tg.y];
      // 목표(탈출·이야기)가 있으면 이동은 목표 쪽, 사격은 따로 (사람처럼 쏘면서 이동). 바로 붙은 적만 상대
      if (goal && !(best && bd < 140)) {
        if (best && bd < 600) { input.mx = Iso.sx(best.x, best.y); input.my = Iso.sy(best.x, best.y, 20); input.down = World.lineOfSight(p, best) && bd < range + best.r; } else input.down = false;
        const key = goal[0] + Math.round(goal[1]) + ',' + Math.round(goal[2]);
        if (B.fieldKey !== key) { B.field = B.makeField(goal[1], goal[2]); B.fieldKey = key; }
        B.goField(B.field, sp * 0.85);
      } else if (best && bd < (leave ? 220 : 650)) {
        input.mx = Iso.sx(best.x, best.y) + Math.sin(G.time * 3.1) * 30; input.my = Iso.sy(best.x, best.y, 20) + Math.cos(G.time * 2.3) * 20;
        const los = World.lineOfSight(p, best); input.down = los && bd < range + best.r;
        const a = angleTo(p, best);
        if (!input.down) { if (!World.move(p, Math.cos(a) * sp, Math.sin(a) * sp)) World.move(p, Math.cos(a + 1.2) * sp, Math.sin(a + 1.2) * sp); }
        else if (bd < 120 && !W.melee) World.move(p, -Math.cos(a) * sp * 0.8, -Math.sin(a) * sp * 0.8);
        for (let i = 0; i < SKILLS.length; i++) if (p.skills[SKILLS[i].id] && (p.skillCd[i] || 0) <= 0 && bd < 320 && i !== 2) useSkill(i);
      } else {
        input.down = false;
        const dr = !leave && G.drops.filter(d => d.kind === 'item' && dist(d, p) < 450 && World.lineOfSight(p, d)).sort((a, b2) => dist(a, p) - dist(b2, p))[0];
        if (dr) { const a = angleTo(p, dr); World.move(p, Math.cos(a) * sp, Math.sin(a) * sp); }
        else if (goal) {
          const key = goal[0] + Math.round(goal[1]) + ',' + Math.round(goal[2]);
          if (B.fieldKey !== key) { B.field = B.makeField(goal[1], goal[2]); B.fieldKey = key; }
          B.goField(B.field, sp);
        } else {
          const sc = Scavenge.near(); if (sc && !G.search && !sc.grave) Scavenge.start(sc);
          else if (!G.search) { // 근처 안 뒤진 곳으로, 없으면 배회
            const cc = Scavenge.list.filter(q => !q.looted && dist(q, p) < 500)[0];
            if (cc) { const a = angleTo(p, cc); World.move(p, Math.cos(a) * sp, Math.sin(a) * sp); }
            else { // v1.16 맵 인구가 정해져 있으니 남은 적(가장 가까운 적 · 아직 안 깨어난 구역) 쪽으로
              const fe = G.enemies.filter(e => e.hp > 0 && !e.def.boss).sort((a, b2) => dist(a, p) - dist(b2, p))[0];
              const pc = Pop.cells.filter(c => c.n > 0).sort((a, b2) => dist(a, p) - dist(b2, p))[0];
              const tgt = fe && (!pc || dist(fe, p) < dist(pc, p) + 300) ? fe : pc;
              if (tgt) { const key = 'hunt' + Math.round(tgt.x / 200) + ',' + Math.round(tgt.y / 200); if (B.fieldKey !== key) { B.field = B.makeField(tgt.x, tgt.y); B.fieldKey = key; } B.goField(B.field, sp); }
              else { B.wa = (B.wa ?? rand(0, TAU)) + rand(-0.15, 0.15); if (!World.move(p, Math.cos(B.wa) * sp, Math.sin(B.wa) * sp)) B.wa += 1.5; }
            }
          }
        }
      }
      if (G.grave && dist(G.grave, p) < 45 && !G.search) Scavenge.start({ grave: true });
      if (p.hp < mh * 0.4) { if (p.skillCd[2] <= 0 && p.skills.heal) useSkill(2); else quickMedkit(); }
      while (p.statPoints > 0) { p.stats[['dex', 'vit', 'agi'][p.statPoints % 3]]++; p.statPoints--; }
      const L0 = p.level;
      update(1 / 30);
      if (p.level > L0) B.lvlT[p.level] = +(G.time / 60).toFixed(1);
    };
    // 경험치 출처 집계: 처치 / 그 외(이야기·랜드마크·의뢰·어설트)
    B.exp = { kill: 0, other: 0 }; B.src = 'other';
    const gx = gainExp; window.gainExp = n => { B.exp[B.src] += n; gx(n); };
    const ke = killEnemy; window.killEnemy = e => { B.src = 'kill'; try { ke(e); } finally { B.src = 'other'; } };
    // 사망 원인: 죽기 전 8초 동안 받은 피해를 적 종류·공격 방식별로 합산
    B.hits = []; B.cause = {}; B.curE = null;
    const ma = Monsters.attack.bind(Monsters); Monsters.attack = (e, ...r) => { B.curE = e; try { return ma(e, ...r); } finally { B.curE = null; } };
    const mn = Monsters.updateNamed.bind(Monsters); Monsters.updateNamed = (e, ...r) => { B.curE = e; try { return mn(e, ...r); } finally { B.curE = null; } };
    const ms = Monsters.strike.bind(Monsters); Monsters.strike = (...r) => { ms(...r); G.strikes[G.strikes.length - 1].src = B.curE ? (B.curE.elite || B.curE.bossName ? '★' : '') + B.curE.type : 'boss?'; };
    const sb = spawnEnemyBullet; window.spawnEnemyBullet = (e, ...r) => { sb(e, ...r); G.bullets[G.bullets.length - 1].src = (e.elite || e.bossName ? '★' : '') + e.type; };
    const dp = damagePlayer; window.damagePlayer = (dmg, ...r) => {
      const hp0 = p.hp; dp(dmg, ...r); const d = hp0 - Math.max(0, p.hp); if (d <= 0) return;
      const st = new Error().stack; let src = '?';
      if (st.includes('updateBullets')) { const bl = G.bullets.filter(b => b.from === 'e').sort((a, b2) => dist(a, p) - dist(b2, p))[0]; src = (bl && bl.src || '?') + ' 총알'; }
      else if (st.includes('updateHazards')) { const s2 = G.strikes.filter(s => s.t >= s.delay).sort((a, b2) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b2.x - p.x, b2.y - p.y))[0]; src = s2 ? s2.src + (s2.pool ? ' 장판' : ' 폭발') : '장판'; }
      else if (B.curE) src = (B.curE.elite || B.curE.bossName ? '★' : '') + B.curE.type + ' 근접';
      else if (st.includes('updateEnemies')) src = '돌진/보스';
      B.hits.push([G.time, src, d]);
    };
    const pd = playerDie; window.playerDie = () => {
      const recent = B.hits.filter(h => G.time - h[0] < 8), tot = {};
      for (const [, s3, d] of recent) tot[s3] = (tot[s3] || 0) + d;
      const top = Object.entries(tot).sort((a, b2) => b2[1] - a[1]).slice(0, 2).map(x => x[0]);
      for (const t of top) { const k = World.map + ': ' + t; B.cause[k] = (B.cause[k] || 0) + 1; }
      B.hits = []; pd();
    };
    if (START) { // 시나리오 시작: 레벨·능력치·상점 희귀 장비 +4
      p.level = START; p.statPoints = (START - 1) * 3; p.quest = { ch: 6, step: 0, active: false, progress: 0 }; p.finalEnd = p.ended = true;
      while (p.statPoints > 0) { p.stats[['dex', 'vit', 'agi'][p.statPoints % 3]]++; p.statPoints--; }
      p.credits = 1e7; G.shopLevel = -1; UI.openShop(); for (const it of G.shopStock) if (isUpgrade(p, it)) { const c = JSON.parse(JSON.stringify(it)); c.id = nextItemId++; c.plus = 4; addItem(c); UI.equip(c, c.kind === 'weapon' ? (WEAPONS[c.key].melee ? 'w2' : 'w1') : c.kind); }
      for (const s of SKILLS) p.skills[s.id] = true; // v1.16 시나리오: 스킬 모두 배운 상태
      p.credits = 5000; UI.closeAll();
    }
    { let c0 = p.credits; B.earned = 0; Object.defineProperty(p, 'credits', { get: () => c0, set: v => { if (v > c0) B.earned += v - c0; c0 = v; }, enumerable: true, configurable: true }); } // v1.31 크레딧 수입 측정
    if (FIXMAP) B.mapFor = () => FIXMAP;
    B.deploy();
  }, [DODGE, START, FIXMAP]);
  let shown = 0;
  for (let m = 0; m < MIN; m += 10) {
    const r = await pg.evaluate(() => { for (let i = 0; i < 30 * 600; i++) B.tick(); input.down = false; return { raids: B.raids, p: { lv: G.player.level, ch: G.player.quest.ch + '-' + G.player.quest.step, cr: G.player.credits, map: World.map } }; });
    for (; shown < r.raids.length; shown++) { const x = r.raids[shown]; console.log(`${x.t.padStart(4)}분 ${x.ok ? '탈출' : '사망'} ${x.map.padEnd(10)} ${x.min}분 처치${x.kills} Lv${x.lv} 장${x.ch} ${x.w} dps${x.dps} 방어${x.def} HP${x.hp} ₵${x.cr}`); }
  }
  const s = await pg.evaluate(() => ({ shop: B.shop, expSrc: B.exp, lvlT: B.lvlT, dodge: `${B.dodges}/${B.dodgeTry}`, enh: B.enh, bought: B.bought, p: G.player.level }));
  console.log('레벨 도달(게임 분):', JSON.stringify(s.lvlT));
  console.log('경험치 출처:', JSON.stringify(s.expSrc));
  console.log('사망 원인 (죽기 전 8초 피해 1·2위):'); for (const [k, v] of Object.entries(await pg.evaluate(() => B.cause)).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log('  ' + k + ' ×' + v);
  console.log('상점 구매 ₵' + s.shop);
  { const e = await pg.evaluate(() => [B.earned, G.time / 60]); console.log(`크레딧 수입 ₵${Math.round(e[0])} · 분당 ₵${Math.round(e[0] / e[1])} (판매·보상·주운 것 모두)`); } // v1.31
  console.log(`구르기 ${s.dodge} · 강화 시도 ${s.enh} · 보급 구매 ₵${s.bought}`);
  const R = await pg.evaluate(() => B.raids);
  const by = {}; for (const x of R) { const o = by[x.map] = by[x.map] || { n: 0, die: 0, min: 0, kills: 0 }; o.n++; if (!x.ok) o.die++; o.min += +x.min; o.kills += x.kills; }
  for (const k in by) { const o = by[k]; console.log(`${k.padEnd(10)} 출격 ${o.n} · 사망률 ${Math.round(100 * o.die / o.n)}% · 평균 ${(o.min / o.n).toFixed(1)}분 · 분당 처치 ${(o.kills / o.min).toFixed(1)}`); }
  console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].slice(0, 8).join('\n') : 'NO ERRORS');
  await b.close();
})();
