// 지역 필드 보스 · 레이드 보스 타이탄 페이즈 (v0.10)

// 지역마다 주기적으로 한 마리씩 나타나는 필드 보스 (플레이어가 그 지역에 있을 때)
const FIELD_BOSSES = {
  1: { name: '거대 변이견 「붉은 이빨」', art: 'redfang', base: 'dog', level: 5, hpMul: 70, dmgMul: 1.6, scale: 1.9, patterns: ['dash', 'howl', 'dash', 'quake'] },
  2: { name: '약탈단장 「독사」', art: 'viper', base: 'raider', level: 10, hpMul: 24, dmgMul: 1.4, scale: 1.4, fireMul: 0.5, patterns: ['fan', 'dash', 'panther'] },
  3: { name: '실험체 「골리앗」', art: 'goliath', base: 'brute', level: 16, hpMul: 20, dmgMul: 1.3, scale: 1.6, patterns: ['quake', 'dash', 'glutton', 'quake'] },
  6: { name: '블랙선 저격수 「매」', art: 'hawk', base: 'merc', level: 23, hpMul: 18, dmgMul: 1.4, scale: 1.3, fireMul: 0.6, patterns: ['fan', 'argos', 'dash'] }, // v1.6
  9: { name: '물귀신 군주 「거머리」', art: 'leech', base: 'brute', level: 33, hpMul: 20, dmgMul: 1.3, scale: 1.6, patterns: ['brood', 'quake', 'dash', 'glutton'] }, // v2.0 한강 (그림 키 leech · 지금은 군체 그림을 물빛으로 · GEMINI_PROMPTS 51절)
  7: { name: '은신 포식자 「그림자」', art: 'shade', base: 'stalker', level: 28, hpMul: 20, dmgMul: 1.3, scale: 1.5, patterns: ['dash', 'howl', 'dash', 'quake'] },
};
const FIELD_BOSS_CD = 360;
// v1.98.11 지하 연구소 · 스카이타워 B1~B4 (마지막 층 빼고) 층마다 지역 필드 보스의 「메아리」 하나 — 그 층 레벨로 · 고유 장비도 그 레벨로 (하누라님 피드백: 낮은 맵 뺑뺑이 대신)
const ECHO_ARTS = ['redfang', 'viper', 'goliath', 'hawk', 'shade']; // 처치 후 다음 출현까지 (초)
// v1.5 지하 연구소 격리실 보스 (출격마다 한 번)
// v1.78 스카이타워 옥상 보스 (바벨 그림 · 바벨 패턴 + 내려찍기 · 돌진 · 실험체 호출)
const TOWER_BOSS = { name: '바벨 원형체 「뿌리」', art: 'root', base: 'brute', level: V2_OPEN ? 46 : 42, hpMul: 12, dmgMul: 1.4, scale: 2.1, patterns: ['babel', 'quake', 'dash', 'brood'] };
const LAB_BOSS = { name: '최종 실험체 「키메라」', art: 'chimera', base: 'brute', level: V2_OPEN ? 42 : 38, hpMul: 14, dmgMul: 1.35, /* v1.77 B5 (Lv24 → 38 · 체력 배율 20 → 14 로 맞춤) */ scale: 1.9, patterns: ['glutton', 'dash', 'brood', 'quake'] };

const Bosses = {
  // ---------------- 필드 보스 ----------------
  updateField(dt) {
    const p = G.player, fb = G.fieldBoss;
    if (fb) {
      if (fb.hp <= 0) { G.fieldBoss = null; G.fbT = G.player.raid ? 1e9 : FIELD_BOSS_CD; return; } // v1.16 출격당 한 번
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
      UI.toast('필드 보스 출현', `${ZONES[z].name}의 ${def.name}`);
      return;
    }
    G.fbT = 5; // 자리를 못 찾으면 잠시 후 재시도
  },

  echo() {
    const id = World.map, D = DUNGEONS[id], f = World.labFloor || 1;
    if (!World.def || !World.def.lab || !D || f >= D.floors) return;
    const zs = Object.keys(FIELD_BOSSES).map(Number).filter(z => ECHO_ARTS.includes(FIELD_BOSSES[z].art)), z = zs[Math.floor(Math.random() * zs.length)], def = FIELD_BOSSES[z], p = G.player;
    for (let k = 0; k < 300; k++) {
      const tx = 2 + Math.floor(Math.random() * (World.W - 4)), ty = 2 + Math.floor(Math.random() * (World.H - 4)), x = tx * TILE + 16, y = ty * TILE + 16;
      if (Math.hypot(x - p.x, y - p.y) < 650 || World.circleBlocked(x, y, ENEMIES[def.base].r * def.scale + 4) || World.buildingAt(x, y)) continue;
      const e = makeEnemy(def.base, x, y, D.lv(f));
      e.bossName = def.name + ' (메아리)'; e.art = def.art; e.fieldBoss = z; e.echo = true; e.patterns = def.patterns; e.scale = def.scale; e.expMul = 6;
      e.hp = e.maxHp = Math.round(e.maxHp * def.hpMul * 0.55); e.dmg *= def.dmgMul; // 던전 체력 배율이 이미 붙어서 원래보다 낮게
      e.r = Math.round(e.r * def.scale); e.fireMul = def.fireMul || 1; e.weight = e.def.weight * 6; e.skillT = 2;
      G.enemies.push(e); G.echoBoss = e; // 체력바 · 미니맵 · 보스전
      log(`${ICON('warn')} 이 층 어딘가에 ${def.name}의 메아리가 있다 · 처치하면 「${def.name}」 고유 장비가 나올 수 있다`, '#ff7a5a');
      return;
    }
  },

  onFieldKill(e, dropAt) {
    const p = G.player;
    log(`필드 보스 ${e.bossName} 처치!`, '#ffa53a');
    UI.toast('필드 보스 처치', e.bossName);
    dropAt('credits', { amount: e.level * 60 });
    dropAt('item', { item: randomGear(e.level + 1, 1.5, Math.random() < 0.3 ? 3 : 2, ZONES[e.fieldBoss].gear) });
    if (Math.random() < 0.25 * ECON.gear) dropAt('item', { item: randomGear(e.level + 1, 1, 1, ZONES[e.fieldBoss].gear) });
    dropAt('item', { item: makeConsumable('medkit', 2) });
    rollUnique(e.art, e.level + 1, dropAt, e.echo ? (curDiff() || {}).uniq || 1 : 1); // v1.12 보스 고유 장비 · v1.98.13 하드 메아리 ×1.5
    for (const o of G.enemies) if (o.guardOf === e) o.hp = 0; // 부하 정리
    p.fieldBossKills = (p.fieldBossKills || 0) + 1;
    Workshop.gain(10, 2, '필드 보스 잔해 회수');
    hitstop(0.15); G.shake = Math.max(G.shake, 12);
  },

  // ---------------- 연구소 키메라 (v1.5) ----------------
  // 격리실(미니맵 붉은 방)에 들어가면 깨어남. 체력 50% 이하에서 탈피 → 빨라지고 패턴 간격 짧아짐
  updateLab(dt) {
    const p = G.player, r = World.labBoss, BD = World.map === 'tower' ? TOWER_BOSS : LAB_BOSS, T = World.map === 'tower'; // v1.78
    if (!r || p.dead) return;
    const e = G.labBoss;
    if (!e) {
      if (G.labBossDone) return;
      const tx = p.x / TILE, ty = p.y / TILE;
      if (tx < r.x0 - 0.5 || tx > r.x1 + 1.5 || ty < r.y0 - 0.5 || ty > r.y1 + 1.5) return;
      const b = makeEnemy(BD.base, (r.cx + 0.5) * TILE, (r.cy + 0.5) * TILE, BD.level);
      b.bossName = BD.name; b.art = BD.art; b.patterns = BD.patterns; b.scale = BD.scale; b.towerBoss = T; b.expMul = 14; b.labBoss = true;
      b.hp = b.maxHp = Math.round(b.maxHp * BD.hpMul / ((dunMul() || { hp: 1 }).hp) * (dunMul() ? 1.5 : 1)); /* v1.81 층 배율 대신 보스는 ×1.5만 */
      b.dmg *= BD.dmgMul; b.r = Math.round(b.r * BD.scale); // v1.84.2 외부 점검: 위 줄 주석에 묻혀 v1.81부터 실행되지 않던 것 (보스 피해 배율 · 몸 충돌 크기)
      b.weight = b.def.weight * 8; b.skillT = 2.5; b.state = 'chase';
      G.enemies.push(b); G.labBoss = b;
      G.shake = 14; SFX.play('roar', 1);
      UI.toast(T ? '옥상의 뿌리' : '격리실 봉인 해제', T ? `${BD.name}: 은신 변이체 호출, 내려찍기, 산성 비, 돌진` : `${BD.name}: 산성 장판, 돌진, 실험체 호출, 내려찍기`);
      log(T ? `${ICON('warn')} 옥상을 뒤덮은 뿌리가 일어선다! ${BD.name}!` : `${ICON('warn')} 격리 탱크가 깨졌다! ${BD.name}이(가) 깨어났다!`, '#ff5050');
      return;
    }
    if (e.hp <= 0) { G.labBoss = null; return; }
    Monsters.actor = e; // v1.84.2 외부 점검: 적 갱신 루프 밖에서 불려서 장판 주인이 마지막에 움직인 다른 적으로 찍히던 것 (사망 원인)
    if (!e.molted && e.hp < e.maxHp * 0.5) { // 탈피
      e.molted = true; e.speed *= 1.35; e.skillT = 0.8;
      G.shake = 18; hitstop(0.15);
      G.effects.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.8, color: '#ff5050', r: 300 });
      for (let i = 0; i < 6; i++) Monsters.strike(e.x + Math.cos(i / 6 * TAU) * 140, e.y + Math.sin(i / 6 * TAU) * 140, 60, 1.0, e.dmg * 0.8, 'rgba(140,220,70,', true);
      UI.toast(T ? '바벨 원형체 각성' : '키메라 탈피', '더 빨라졌다. 장판 사이로 빠지며 거리를 벌려라');
      log(T ? '뿌리가 껍질을 찢고 솟구친다! 주변에 산성액이 튄다!' : '키메라가 껍질을 찢고 나온다! 주변에 산성액이 튄다!', '#ff5050');
    }
    if (e.molted && e.skillT > 2.5) e.skillT = 2.5; // 탈피 후 패턴 간격 단축
  },
  onLabKill(e, dropAt) {
    const p = G.player;
    G.labBoss = null; G.labBossDone = true;
    if (e.towerBoss) { // v1.78 스카이타워 옥상
      log(`${e.bossName} 처치! 타워를 뒤덮은 뿌리가 시들어 간다.`, '#ffa53a'); UI.toast('바벨 원형체 처치', '전설급 장비 · 신화 무기 기회. 비상구로 탈출해야 내 것');
      dropAt('credits', { amount: e.level * 160 });
      dropAt('item', { item: randomGear(e.level, 2.4, Math.random() < 0.45 ? 4 : 3, ZONES[8].gear) }); dropAt('item', { item: randomGear(e.level, 1.6, 3, ZONES[8].gear) }); dropAt('item', { item: makeConsumable('medkit', 3) });
      rollMyth('tower', e.level, dropAt);
      for (const o of G.enemies) if (o.guardOf === e) o.hp = 0;
      p.towerKills = (p.towerKills || 0) + 1; if (p.towerKills === 1 && !p.hellOpen) { UI.toast('스카이타워 하드 개방', '출격 지도에서 「하드」 — 적 Lv+4 · 경험치 ×1.5 · 신화 ×2'); log('뿌리를 쓰러뜨렸다 — 스카이타워 하드가 열렸다.', '#ff9a3a'); } // v1.98.13 Workshop.gain(18, 8, '뿌리 표본 회수'); Bounty.on('fieldBoss'); hitstop(0.2); G.shake = Math.max(G.shake, 18);
      return;
    }
    log(`${e.bossName} 처치! 격리실의 연구 기록을 회수했다.`, '#ffa53a');
    UI.toast('키메라 처치', '영웅 이상 장비와 전자 부품. 탈출해야 내 것');
    dropAt('credits', { amount: e.level * 120 });
    dropAt('item', { item: randomGear(e.level, 2, Math.random() < 0.3 ? 4 : 3, ZONES[5].gear) });
    dropAt('item', { item: randomGear(e.level, 1.5, 2, ZONES[5].gear) });
    dropAt('item', { item: makeConsumable('medkit', 3) });
    rollUnique('chimera', e.level, dropAt); // v1.12
    rollMyth('chimera', e.level, dropAt); // v1.53 신화
    for (const o of G.enemies) if (o.guardOf === e) o.hp = 0;
    p.labKills = (p.labKills || 0) + 1;
    if (p.labKills === 1 && !p.hellOpen) { UI.toast('지하 연구소 하드 개방', '출격 지도에서 「하드」 — 적 Lv+4 · 경험치 ×1.5 · 신화 ×2'); log('키메라를 쓰러뜨렸다 — 지하 연구소 하드가 열렸다.', '#ff9a3a'); } // v1.98.13
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
      if (ph === 3) e.speed = e.def.speed * ENEMY_SPEED * 1.35;
      G.shake = 22; hitstop(0.2);
      G.effects.push({ type: 'ring', x: e.x, y: e.y, t: 0, life: 0.9, color: '#ff5a3a', r: 380 }); // v1.66 색 규칙: 충격파도 빨강
      const d = dist(e, p);
      if (d < 380 && !p.dead) {
        const a = angleTo(e, p); for (let i = 0; i < 8; i++) World.move(p, Math.cos(a) * 18, Math.sin(a) * 18);
        damagePlayer(e.dmg * 0.8, e.x, e.y, e);
      }
      UI.toast(`타이탄 ${ph}페이즈`, ph === 2 ? '방사능 낙하! 바닥의 원을 피해라' : '폭주! 붉은 원이 차오르면 멀리 벗어나라');
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
      Monsters.strike(e.x, e.y, 270, 1.8, e.dmg * 1.8, 'rgba(255,60,60,'); // v1.66 2.2 → 1.8
      floatText(e.x, e.y - 90, '방사능 폭발!', '#ff6060', 20);
    }
  },
};
