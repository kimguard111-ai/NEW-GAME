// 지역 필드 보스 · 레이드 보스 타이탄 페이즈 (v0.10)

// 지역마다 주기적으로 한 마리씩 나타나는 필드 보스 (플레이어가 그 지역에 있을 때)
const FIELD_BOSSES = {
  1: { name: '거대 변이견 「붉은 이빨」', art: 'redfang', base: 'dog', level: 5, hpMul: 70, dmgMul: 1.6, scale: 1.9, patterns: ['dash', 'howl', 'dash', 'quake'] },
  2: { name: '약탈단장 「독사」', art: 'viper', base: 'raider', level: 10, hpMul: 24, dmgMul: 1.4, scale: 1.4, fireMul: 0.5, patterns: ['fan', 'dash', 'panther'] },
  3: { name: '실험체 「골리앗」', art: 'goliath', base: 'brute', level: 16, hpMul: 20, dmgMul: 1.3, scale: 1.6, patterns: ['quake', 'dash', 'glutton', 'quake'] },
  6: { name: '블랙선 저격수 「매」', art: 'hawk', base: 'merc', level: 23, hpMul: 18, dmgMul: 1.4, scale: 1.3, fireMul: 0.6, patterns: ['fan', 'argos', 'dash'] }, // v1.6
  7: { name: '은신 포식자 「그림자」', art: 'shade', base: 'stalker', level: 28, hpMul: 20, dmgMul: 1.3, scale: 1.5, patterns: ['dash', 'howl', 'dash', 'quake'] },
};
const FIELD_BOSS_CD = 360; // 처치 후 다음 출현까지 (초)
// v1.5 지하 연구소 격리실 보스 (출격마다 한 번)
const LAB_BOSS = { name: '최종 실험체 「키메라」', art: 'chimera', base: 'brute', level: 24, hpMul: 20, dmgMul: 1.35, scale: 1.9, patterns: ['glutton', 'dash', 'brood', 'quake'] };

const Bosses = {
  // ---------------- 필드 보스 ----------------
  updateField(dt) {
    const p = G.player, fb = G.fieldBoss;
    if (fb) {
      if (fb.hp <= 0) { G.fieldBoss = null; G.fbT = FIELD_BOSS_CD; return; }
      // 멀리 떠나면 사라짐
      fb.awayT = dist(fb, p) > 2600 ? (fb.awayT || 0) + dt : 0;
      if (fb.awayT > 30) {
        fb.hp = 0; G.enemies = G.enemies.filter(e => e !== fb);
        log(`${fb.bossName}이(가) 자취를 감췄다.`, '#aaa');
        G.fieldBoss = null; G.fbT = 120;
      }
      return;
    }
    if (G.assault || p.dead) return;
    G.fbT -= dt;
    const z = World.zoneIndex(p.x, p.y);
    if (G.fbT > 0 || !FIELD_BOSSES[z]) return;
    const def = FIELD_BOSSES[z];
    for (let i = 0; i < 40; i++) {
      const a = rand(0, TAU), r = rand(700, 1300), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
      if (World.zoneIndex(x, y) !== z || World.circleBlocked(x, y, ENEMIES[def.base].r * def.scale + 4) || World.inSafe(x, y) || World.buildingAt(x, y)) continue;
      const e = makeEnemy(def.base, x, y, def.level);
      e.bossName = def.name; e.art = def.art; e.fieldBoss = z; e.patterns = def.patterns; e.scale = def.scale; e.expMul = 10;
      e.hp = e.maxHp = Math.round(e.maxHp * def.hpMul); e.dmg *= def.dmgMul;
      e.r = Math.round(e.r * def.scale); e.fireMul = def.fireMul || 1; e.weight = e.def.weight * 6; e.skillT = 2;
      G.enemies.push(e); G.fieldBoss = e;
      const dirs = ['동', '남동', '남', '남서', '서', '북서', '북', '북동'];
      const sa = Math.atan2((x + y) - (p.x + p.y), (x - y) - (p.x - p.y)); // 화면 기준 방향
      const dir = dirs[Math.round(((sa % TAU) + TAU) % TAU / (TAU / 8)) % 8];
      log(`${ICON('warn')} 필드 보스 ${def.name} 출현! (${dir}쪽 약 ${Math.round(r / TILE * 2)}m · 미니맵 붉은 표시)`, '#ff7a5a');
      UI.toast('필드 보스 출현', `${def.name} — ${ZONES[z].name}`);
      return;
    }
    G.fbT = 5; // 자리를 못 찾으면 잠시 후 재시도
  },

  onFieldKill(e, dropAt) {
    const p = G.player;
    log(`필드 보스 ${e.bossName} 처치!`, '#ffa53a');
    UI.toast('필드 보스 처치', e.bossName);
    dropAt('credits', { amount: e.level * 60 });
    dropAt('item', { item: randomGear(e.level + 1, 1.5, Math.random() < 0.3 ? 3 : 2, ZONES[e.fieldBoss].gear) });
    if (Math.random() < 0.25) dropAt('item', { item: randomGear(e.level + 1, 1, 1, ZONES[e.fieldBoss].gear) });
    dropAt('item', { item: makeConsumable('medkit', 2) });
    rollUnique(e.art, e.level + 1, dropAt); // v1.12 보스 고유 장비
    for (const o of G.enemies) if (o.guardOf === e) o.hp = 0; // 부하 정리
    p.fieldBossKills = (p.fieldBossKills || 0) + 1;
    Workshop.gain(10, 2, '필드 보스 잔해 회수');
    hitstop(0.15); G.shake = Math.max(G.shake, 12);
  },

  // ---------------- 연구소 키메라 (v1.5) ----------------
  // 격리실(미니맵 붉은 방)에 들어가면 깨어남. 체력 50% 이하에서 탈피 → 빨라지고 패턴 간격 짧아짐
  updateLab(dt) {
    const p = G.player, r = World.labBoss;
    if (!r || p.dead) return;
    const e = G.labBoss;
    if (!e) {
      if (G.labBossDone) return;
      const tx = p.x / TILE, ty = p.y / TILE;
      if (tx < r.x0 - 0.5 || tx > r.x1 + 1.5 || ty < r.y0 - 0.5 || ty > r.y1 + 1.5) return;
      const b = makeEnemy(LAB_BOSS.base, (r.cx + 0.5) * TILE, (r.cy + 0.5) * TILE, LAB_BOSS.level);
      b.bossName = LAB_BOSS.name; b.art = LAB_BOSS.art; b.patterns = LAB_BOSS.patterns; b.scale = LAB_BOSS.scale; b.expMul = 14; b.labBoss = true;
      b.hp = b.maxHp = Math.round(b.maxHp * LAB_BOSS.hpMul); b.dmg *= LAB_BOSS.dmgMul; b.r = Math.round(b.r * LAB_BOSS.scale);
      b.weight = b.def.weight * 8; b.skillT = 2.5; b.state = 'chase';
      G.enemies.push(b); G.labBoss = b;
      G.shake = 14; SFX.play('roar', 1);
      UI.toast('격리실 봉인 해제', `${LAB_BOSS.name} — 산성 장판 · 돌진 · 실험체 호출 · 내려찍기`);
      log(`${ICON('warn')} 격리 탱크가 깨졌다! ${LAB_BOSS.name}이(가) 깨어났다!`, '#ff5050');
      return;
    }
    if (e.hp <= 0) { G.labBoss = null; return; }
    if (!e.molted && e.hp < e.maxHp * 0.5) { // 탈피
      e.molted = true; e.speed *= 1.35; e.skillT = 0.8;
      G.shake = 18; hitstop(0.15);
      G.effects.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.8, color: '#ff5050', r: 300 });
      for (let i = 0; i < 6; i++) Monsters.strike(e.x + Math.cos(i / 6 * TAU) * 140, e.y + Math.sin(i / 6 * TAU) * 140, 60, 1.0, e.dmg * 0.8, 'rgba(140,220,70,', true);
      UI.toast('키메라 탈피', '더 빨라졌다 — 장판 사이로 구르며 거리를 유지하라');
      log('키메라가 껍질을 찢고 나온다! 주변에 산성액이 튄다!', '#ff5050');
    }
    if (e.molted && e.skillT > 2.5) e.skillT = 2.5; // 탈피 후 패턴 간격 단축
  },
  onLabKill(e, dropAt) {
    const p = G.player;
    G.labBoss = null; G.labBossDone = true;
    log(`${e.bossName} 처치! 격리실의 연구 기록을 회수했다.`, '#ffa53a');
    UI.toast('키메라 처치', '영웅 이상 장비 확정 · 전자 부품 — 탈출해야 확정');
    dropAt('credits', { amount: e.level * 120 });
    dropAt('item', { item: randomGear(e.level, 2, Math.random() < 0.3 ? 4 : 3, ZONES[5].gear) });
    dropAt('item', { item: randomGear(e.level, 1.5, 2, ZONES[5].gear) });
    dropAt('item', { item: makeConsumable('medkit', 3) });
    rollUnique('chimera', e.level, dropAt); // v1.12
    for (const o of G.enemies) if (o.guardOf === e) o.hp = 0;
    p.labKills = (p.labKills || 0) + 1;
    Workshop.gain(14, 6, '실험 장비 잔해 회수');
    Bounty.on('fieldBoss');
    hitstop(0.2); G.shake = Math.max(G.shake, 16);
  },

  // ---------------- 타이탄 페이즈 ----------------
  // 1페이즈(100~66%) 기존 패턴 · 2페이즈(66~33%) 방사능 낙하 · 3페이즈(33% 이하) 폭주 + 방사능 폭발
  titanPhase(e) { return e.hp > e.maxHp * 0.66 ? 1 : e.hp > e.maxHp * 0.33 ? 2 : 3; },
  updateTitan(e, dt) {
    const p = G.player, ph = this.titanPhase(e);
    if (ph > (e.phase || 1)) { // 페이즈 전환: 잠시 무적 + 충격파
      e.phase = ph; e.invulnT = 1.5; e.charge = 0;
      if (ph === 3) e.speed = e.def.speed * 1.35;
      G.shake = 22; hitstop(0.2);
      G.effects.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.9, color: '#7fff6a', r: 380 });
      const d = dist(e, p);
      if (d < 380 && !p.dead) {
        const a = angleTo(e, p); for (let i = 0; i < 8; i++) World.move(p, Math.cos(a) * 18, Math.sin(a) * 18);
        damagePlayer(e.dmg * 0.8);
      }
      UI.toast(`타이탄 ${ph}페이즈`, ph === 2 ? '방사능 낙하 — 바닥의 원을 피하라' : '폭주 — 붉은 원이 차오르면 멀리 벗어나라');
      log(ph === 2 ? '타이탄이 포효한다! 하늘에서 방사능 덩어리가 쏟아진다!' : '타이탄이 폭주한다! 몸에서 방사능이 끓어오른다!', '#7fff6a');
    }
    if (e.invulnT > 0) { e.invulnT -= dt; return; }
    if (e.state !== 'chase') return;
    if (ph >= 2 && (e.rainT = (e.rainT ?? 2) - dt) <= 0) {
      e.rainT = ph === 3 ? 5.5 : 7;
      for (let i = 0; i < (ph === 3 ? 6 : 4); i++) {
        const x = p.x + (i ? rand(-160, 160) : 0), y = p.y + (i ? rand(-160, 160) : 0);
        Monsters.strike(x, y, 60, 1.1 + i * 0.12, e.dmg * 0.9, 'rgba(120,255,80,', true);
      }
    }
    if (ph === 3 && (e.novaT = (e.novaT ?? 3) - dt) <= 0) {
      e.novaT = 10;
      Monsters.strike(e.x, e.y, 270, 1.8, e.dmg * 2.2, 'rgba(255,60,60,');
      floatText(e.x, e.y - 90, '방사능 폭발!', '#ff6060', 20);
    }
  },
};
