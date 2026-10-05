// 엘리트 몬스터 · 네임드 고유 패턴 · 세력 다툼 (v0.8)

// 엘리트 접두어. types 가 있으면 그 적에게만 붙음
const ELITE_AFFIXES = {
  berserk:   { name: '광폭한',   color: '#ff5a3a', desc: '빠르고 공격이 잦음' },
  armored:   { name: '중장갑',   color: '#9fb2c8', desc: '매우 단단하고 밀리지 않음' },
  volatile:  { name: '폭발하는', color: '#ffb040', desc: '죽으면 잠시 뒤 폭발' },
  splitter:  { name: '분열하는', color: '#7fff6a', desc: '죽으면 둘로 나뉨', types: ['zombie', 'dog', 'brute'] },
  commander: { name: '지휘관',   color: '#ffd76a', desc: '주변 적의 속도·공격력 +30%' },
};

// 세력: 다른 세력끼리는 플레이어가 없을 때 서로 싸움
const FACTION = { zombie: 'infected', dog: 'infected', brute: 'infected', boss: 'infected', raider: 'human', drone: 'machine',
  subject: 'infected', spitter: 'infected', sentry: 'machine', merc: 'human', shield: 'human', stalker: 'infected', nest: 'infected' }; // v1.5 연구소: 실험체 ↔ 보안 장비

const Monsters = {
  // ---------------- 엘리트 ----------------
  eliteChance(zone) { return 0.035 + Math.min(zone, 4) * 0.012; }, // 명동 약 5% ~ 여의도 약 8% (v1.7 이후 맵도 8%)
  rollAffix(type) {
    const keys = Object.keys(ELITE_AFFIXES).filter(k => !ELITE_AFFIXES[k].types || ELITE_AFFIXES[k].types.includes(type));
    return pick(keys);
  },
  makeElite(e, affix) {
    e.affix = affix; e.expMul = 4; e.scale = 1.2; e.r = Math.round(e.r * 1.15);
    let hpMul = 3;
    e.weight = e.def.weight * 2;
    if (affix === 'armored') { hpMul = 6; e.weight = e.def.weight * 6; }
    if (affix === 'berserk') { e.speed *= 1.45; e.atkMul = 0.6; e.fireMul = 0.6; }
    e.hp = e.maxHp = Math.round(e.maxHp * hpMul);
    e.dmg *= 1.3;
    return e;
  },
  // 엘리트 사망 효과
  onDeath(e) {
    if (e.affix === 'volatile') {
      this.strike(e.x, e.y, 95, 0.8, e.dmg * 2.2, 'rgba(255,170,60,');
      floatText(e.x, e.y - 30, '폭발한다!', '#ffb040', 15);
    }
    if (e.affix === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const m = makeEnemy(e.type, e.x + rand(-20, 20), e.y + rand(-20, 20), Math.max(1, e.level - 1));
        if (World.circleBlocked(m.x, m.y, m.r)) { m.x = e.x; m.y = e.y; }
        m.hp = m.maxHp = Math.round(m.maxHp * 0.6); m.scale = 0.85; m.state = 'chase';
        G.enemies.push(m);
      }
      floatText(e.x, e.y - 30, '분열!', '#7fff6a', 15);
    }
  },
  // 지휘관 주변 적 강화 (buffT 동안 속도·공격력 +30%)
  auras() {
    for (const c of G.enemies) if (c.affix === 'commander' && c.hp > 0)
      for (const o of G.enemies) if (o !== c && o.hp > 0 && !o.def.boss && dist(o, c) < 230) o.buffT = 0.6;
  },
  buff(e) { return e.buffT > 0 ? 1.3 : 1; },

  // ---------------- 예고 공격 (바닥 원 → 지연 폭발) / 장판 ----------------
  strike(x, y, r, delay, dmg, color, pool = false) {
    G.strikes.push({ x, y, r, t: 0, delay, dmg, color, pool });
    if (Math.hypot(x - G.player.x, y - G.player.y) < r + 200) SFX.play('warn', 0.7);
  },
  updateHazards(dt) {
    const p = G.player;
    for (const s of G.strikes) {
      s.t += dt;
      if (s.t < s.delay) continue;
      s.done = true;
      if (!p.dead && Math.hypot(p.x - s.x, p.y - s.y) < s.r + p.r) damagePlayer(s.dmg);
      G.effects.push({ type: 'boom', x: s.x, y: s.y, t: 0, life: 0.35, r: s.r });
      SFX.play('boom', clamp(1 - Math.hypot(p.x - s.x, p.y - s.y) / 900, 0.1, 0.6));
      burst(s.x, s.y, s.pool ? '#8fd14a' : '#ffb040', 16, 200, 0.4, 4);
      G.shake = Math.max(G.shake, 5);
      if (s.pool) G.pools.push({ x: s.x, y: s.y, r: s.r * 0.9, t: 0, life: 4, dps: s.dmg * 0.5 });
    }
    G.strikes = G.strikes.filter(s => !s.done);
    let inPool = null;
    for (const pl of G.pools) { pl.t += dt; if (Math.hypot(p.x - pl.x, p.y - pl.y) < pl.r) inPool = pl; }
    G.pools = G.pools.filter(pl => pl.t < pl.life);
    p.poolT = (p.poolT || 0) - dt;
    if (inPool && !p.dead && p.poolT <= 0 && !armorLegend('filter')) { p.poolT = 0.5; damagePlayer(inPool.dps * 0.5); }
  },

  // ---------------- 네임드 고유 패턴 ----------------
  updateNamed(e, dt) {
    const p = G.player;
    e.skillT = (e.skillT ?? 3) - dt;
    if (e.skillT > 0) return;
    // 어설트 보스는 patterns 를 번갈아 사용
    const id = e.patterns ? e.patterns[e.patIdx = ((e.patIdx ?? -1) + 1) % e.patterns.length] : e.elite;
    if (id === 'glutton') { // 산성 토사물: 플레이어 주변 3곳에 장판
      e.skillT = 5.5; e.lastAtk = G.time;
      for (let i = 0; i < 3; i++) this.strike(p.x + rand(-70, 70), p.y + rand(-70, 70), 55, 0.9, e.dmg * 0.6, 'rgba(140,220,70,', true);
      floatText(e.x, e.y - 50, '우웨엑!', '#8fd14a', 18);
    } else if (id === 'panther') { // 호위병 호출 (최대 4)
      e.skillT = 11; e.lastAtk = G.time;
      const guards = G.enemies.filter(o => o.guardOf === e && o.hp > 0).length;
      for (let i = 0; i < 2 && guards + i < 4; i++) {
        const g = makeEnemy('raider', e.x + rand(-60, 60), e.y + rand(-60, 60), Math.max(1, e.level - 2));
        if (World.circleBlocked(g.x, g.y, g.r)) continue;
        g.guardOf = e; g.minion = true; g.state = 'chase';
        G.enemies.push(g);
      }
      floatText(e.x, e.y - 40, '얘들아, 쳐라!', '#ff7a5a', 16);
    } else if (id === 'argos') { // 미사일 포격: 플레이어 위치 3곳 예고 후 폭발
      e.skillT = 6; e.lastAtk = G.time;
      this.strike(p.x, p.y, 70, 1.1, e.dmg * 2.2, 'rgba(255,60,60,');
      for (let i = 0; i < 2; i++) this.strike(p.x + rand(-110, 110), p.y + rand(-110, 110), 70, 1.1 + i * 0.25, e.dmg * 2.2, 'rgba(255,60,60,');
      floatText(e.x, e.y - 50, '표적 지정', '#ff6060', 16);
    } else if (id === 'dash') { // 돌진: 붉은 선 예고 0.5초 후 질주 (보스 돌진과 같은 방식)
      e.skillT = 4; e.charge = 1.3; e.chargeA = angleTo(e, p);
    } else if (id === 'howl') { // 울부짖음: 변이견 부하 호출 (최대 6)
      e.skillT = 8; e.lastAtk = G.time;
      const n = G.enemies.filter(o => o.guardOf === e && o.hp > 0).length;
      for (let i = 0; i < 3 && n + i < 6; i++) {
        const g = makeEnemy('dog', e.x + rand(-70, 70), e.y + rand(-70, 70), Math.max(1, e.level - 1));
        if (World.circleBlocked(g.x, g.y, g.r)) continue;
        g.guardOf = e; g.minion = true; g.state = 'chase'; G.enemies.push(g);
      }
      floatText(e.x, e.y - 50, '아우우우!', '#ff7a5a', 18);
    } else if (id === 'raven') { // v1.6 레이븐: 폭격 요청(플레이어 쪽으로 이어지는 원 5개) ↔ 용병 호출 (최대 3)
      e.skillT = 6.5; e.lastAtk = G.time;
      if ((e.ravenN = (e.ravenN || 0) + 1) % 2) {
        const a = angleTo(e, p), d0 = dist(e, p);
        for (let i = 0; i < 5; i++) { const r = d0 - 120 + i * 70; this.strike(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 65, 0.9 + i * 0.18, e.dmg * 2, 'rgba(255,60,60,'); }
        floatText(e.x, e.y - 50, '폭격 좌표 전송!', '#ff6060', 16);
      } else {
        const n = G.enemies.filter(o => o.guardOf === e && o.hp > 0).length;
        for (let i = 0; i < 2 && n + i < 3; i++) {
          const g = makeEnemy(i ? 'shield' : 'merc', e.x + rand(-60, 60), e.y + rand(-60, 60), Math.max(1, e.level - 2));
          if (World.circleBlocked(g.x, g.y, g.r)) continue;
          g.guardOf = e; g.minion = true; g.state = 'chase'; G.enemies.push(g);
        }
        floatText(e.x, e.y - 50, '엄호해!', '#ffb040', 16);
      }
    } else if (id === 'babel') { // v1.6 바벨: 은신 변이체 호출 → 거대 내려찍기 → 산성 비 순환
      e.skillT = 5; e.lastAtk = G.time;
      const k = (e.babelN = (e.babelN || 0) + 1) % 3;
      if (k === 1) {
        const n = G.enemies.filter(o => o.guardOf === e && o.hp > 0).length;
        for (let i = 0; i < 3 && n + i < 4; i++) {
          const g = makeEnemy('stalker', e.x + rand(-90, 90), e.y + rand(-90, 90), Math.max(1, e.level - 3));
          if (World.circleBlocked(g.x, g.y, g.r)) continue;
          g.guardOf = e; g.minion = true; g.state = 'chase'; G.enemies.push(g);
        }
        floatText(e.x, e.y - 70, '그어어어...', '#e050ff', 18);
      } else if (k === 2) {
        this.strike(e.x, e.y, 200, 1.3, e.dmg * 2, 'rgba(230,80,255,');
        floatText(e.x, e.y - 70, '쿵!!', '#e050ff', 20);
      } else {
        for (let i = 0; i < 6; i++) this.strike(p.x + (i ? rand(-150, 150) : 0), p.y + (i ? rand(-150, 150) : 0), 58, 1.0 + i * 0.12, e.dmg * 0.8, 'rgba(140,220,70,', true);
      }
    } else if (id === 'brood') { // v1.5 키메라: 탈주 실험체 호출 (최대 5)
      e.skillT = 7; e.lastAtk = G.time;
      const n = G.enemies.filter(o => o.guardOf === e && o.hp > 0).length;
      for (let i = 0; i < 3 && n + i < 5; i++) {
        const g = makeEnemy('subject', e.x + rand(-80, 80), e.y + rand(-80, 80), Math.max(1, e.level - 3));
        if (World.circleBlocked(g.x, g.y, g.r)) continue;
        g.guardOf = e; g.minion = true; g.state = 'chase'; G.enemies.push(g);
      }
      floatText(e.x, e.y - 60, '끼이이익!', '#ff5050', 18);
    } else if (id === 'fan') { // 부채꼴 사격 7발
      e.skillT = 3.5; e.lastAtk = G.time;
      const a = angleTo(e, p);
      for (let i = -3; i <= 3; i++) spawnEnemyBullet(e, a + i * 0.14, e.def.bulletSpeed || 400, e.dmg * 0.8, '#ffb040', 4);
    } else if (id === 'quake') { // 내려찍기: 자기 주변 큰 원
      e.skillT = 5; e.lastAtk = G.time;
      this.strike(e.x, e.y, 150, 1.0, e.dmg * 1.8, 'rgba(255,150,50,');
      floatText(e.x, e.y - 50, '쿵!', '#ffb040', 18);
    }
  },

  // ---------------- 일반 적 공격 (v0.16: 보고 피할 수 있게 예고) ----------------
  TELE: { zombie: 0.38, dog: 0.3, raider: 0.35, drone: 0.3, /* v1.7 드론 조준선 0.22→0.3: 용산 사망 1위, 보고 피할 시간 */ subject: 0.26, sentry: 0.45, merc: 0.38, shield: 0.45, stalker: 0.32 },
  vol(e) { return clamp(1 - dist(e, G.player) / 900, 0.08, 1); },
  // 공격 처리. 이번 프레임에 멈춰 있어야 하면(예고·도약 중) true
  attack(e, dt, d, a) {
    const p = G.player, b = this.buff(e);
    if (e.def.lob) { // v1.5 산성 실험체: 플레이어 자리에 산성 덩어리 (바닥 원 예고 → 장판)
      if (e.fireT <= 0 && d < e.def.range && World.lineOfSight(e, p)) {
        e.fireT = e.def.fireCd * (e.fireMul || 1) * rand(0.85, 1.2); e.lastAtk = G.time;
        this.strike(p.x + rand(-20, 20), p.y + rand(-20, 20), 52, 1.0, e.dmg * b, 'rgba(140,220,70,', true);
        floatText(e.x, e.y - 40, '퉤!', '#8fd14a', 12);
      }
      return false;
    }
    if (e.burstN > 0) { // v1.5 보안 포탑: 점사
      if ((e.burstT -= dt) <= 0) { e.burstN--; e.burstT = 0.13; spawnEnemyBullet(e, e.aimA + rand(-0.06, 0.06), e.def.bulletSpeed, e.dmg * b, '#ffd040'); SFX.play('eshot', this.vol(e)); }
      return true;
    }
    if (e.def.nade && !(e.aimT > 0) && !(e.burstN > 0)) { // v1.6 용병 수류탄: 플레이어 자리에 주황 원 → 1.2초 뒤 폭발 (구르거나 벗어나기)
      e.nadeT = (e.nadeT ?? rand(3, 6)) - dt;
      const los = World.lineOfSight(e, p), flush = !los && G.time - (e.seenT || -9) < 3; // v1.32 벽 뒤에 숨은 플레이어에게도 (넘겨 던짐)
      if (e.nadeT <= 0 && d > 140 && d < (e.def.nade === 'weak' ? 300 : 380) && (los || flush)) {
        e.nadeT = (e.def.nade === 'weak' ? rand(14, 20) : rand(9, 13)) * (e.fireMul || 1); e.lastAtk = G.time;
        const tx = p.x + rand(-15, 15), ty = p.y + rand(-15, 15);
        this.strike(tx, ty, 72, 1.2, e.dmg * (e.def.nade === 'weak' ? 1.8 : 2.2) * b, 'rgba(255,150,50,');
        G.effects.push({ type: 'nade', x: e.x, y: e.y, x2: tx, y2: ty, t: 0, life: 0.75 }); // 날아가는 수류탄
        floatText(e.x, e.y - 40, '수류탄!', '#ffb040', 13);
        return true;
      }
    }
    if (e.def.ranged) { // 조준선 → 발사 (조준 중엔 방향 고정 · 정지)
      if (e.aimT > 0) {
        e.aimT -= dt;
        if (e.aimT <= 0) {
          spawnEnemyBullet(e, e.aimA + rand(-0.03, 0.03), e.def.bulletSpeed, e.dmg * b, e.def.burst ? '#ffd040' : undefined); e.lastAtk = G.time; SFX.play('eshot', this.vol(e));
          if (e.def.burst) { e.burstN = e.def.burst - 1; e.burstT = 0.13; }
        }
        return true;
      }
      if (e.fireT <= 0 && d < e.def.range && World.lineOfSight(e, p)) {
        e.fireT = e.def.fireCd * (e.fireMul || 1) * rand(0.8, 1.25);
        e.aimT = this.TELE[e.type] || 0.3; e.aimA = a;
      }
      return false;
    }
    if (e.type === 'dog' || e.def.pounce) { // 웅크림 0.45초(예고선) → 도약 (v1.6 은신 변이체도)
      if (e.leapT > 0) {
        e.leapT -= dt; tryMoveSmart(e, e.leapA, 560 * dt);
        if (!e.leapHit && dist(e, p) < e.r + p.r + 6) { e.leapHit = true; e.lastAtk = G.time; damagePlayer(e.dmg * 1.5 * b, e.x, e.y); }
        return true;
      }
      if (e.pounceT > 0) { e.pounceT -= dt; if (e.pounceT <= 0) { e.leapT = 0.32; e.leapHit = false; } return true; }
      e.pounceCd = (e.pounceCd ?? rand(1, 3)) - dt;
      if (e.pounceCd <= 0 && d > 80 && d < 230 && World.lineOfSight(e, p)) {
        e.pounceCd = rand(3, 5); e.pounceT = 0.45; e.leapA = a; SFX.play('growl', this.vol(e)); return true;
      }
    }
    if (e.type === 'brute') { // 내려찍기: 앞쪽 원 예고
      if (e.slamT > 0) { e.slamT -= dt; return true; }
      if (d < e.r + p.r + 40 && e.atkT <= 0) {
        e.atkT = e.def.atkCd * (e.atkMul || 1) * 1.4; e.lastAtk = G.time; e.slamT = 0.6;
        this.strike(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, 75, 0.6, e.dmg * 1.3 * b, 'rgba(255,150,50,');
        return true;
      }
      return false;
    }
    // 근접(감염자·기타): 팔을 드는 예고 → 그때도 붙어 있으면 맞음
    if (e.windT > 0) {
      e.windT -= dt;
      if (e.windT <= 0) {
        e.lastAtk = G.time;
        if (dist(e, p) < e.r + p.r + 16) damagePlayer(e.dmg * b, e.x, e.y);
        else if (dist(e, p) < 120) floatText(p.x, p.y - 30, '빗나감', '#aaa', 11);
      }
      return true;
    }
    if (d < e.r + p.r + 8 && e.atkT <= 0) { e.atkT = e.def.atkCd * (e.atkMul || 1); e.windT = e.windMax = this.TELE[e.type] || 0.3; return true; }
    return false;
  },
  // ---------------- v1.32 적 AI 2차: 엄폐 · 우회 · 무리 ----------------
  // 추격 중 이동 방향을 고침. null = 제자리 (엄폐물 뒤에서 대기)
  tactics(e, dt, d, a, moveA, los) {
    const p = G.player;
    if (los) e.seenT = G.time;
    if (e.def.boss || e.fieldBoss || e.labBoss || e.def.flying || e.assault || !e.speed) return moveA;
    const fac = FACTION[e.type];
    if (e.flank === undefined) e.flank = (fac === 'human' || e.type === 'dog' || e.type === 'subject') && Math.random() < 0.55 ? (Math.random() < 0.5 ? 1 : -1) : 0;
    if (e.swarm === undefined) e.swarm = fac === 'infected' ? rand(-0.45, 0.45) : 0;
    // 엄폐: 총 든 사람(약탈자·용병)은 가까운 벽 뒤로 숨었다가 → 나와서 쏘고 → 다시 숨음
    if (e.def.ranged && fac === 'human' && !e.def.shield && d < e.def.range * 1.25) {
      e.tacT = (e.tacT ?? rand(0.5, 1.5)) - dt;
      if (e.tac === 'cover' && e.cover) {
        if (e.tacT <= 0 || World.lineOfSight(e.cover, p)) { e.tac = 'peek'; e.tacT = rand(1.8, 2.8); e.cover = null; } // 엄폐물이 소용없어지면 바로 나옴
        else { const cd = Math.hypot(e.cover.x - e.x, e.cover.y - e.y); e.inCover = cd < 10; if (cd < 6) return null; return Math.atan2(e.cover.y - e.y, e.cover.x - e.x); }
      }
      e.inCover = false;
      if (e.tac !== 'cover' && e.tacT <= 0 && los) {
        const c = this.findCover(e, p);
        if (c) { e.tac = 'cover'; e.cover = c; e.tacT = (e.hp < e.maxHp * 0.4 ? rand(2.4, 3.6) : rand(1.3, 2.2)); return Math.atan2(c.y - e.y, c.x - e.x); }
        e.tac = 'peek'; e.tacT = rand(1.5, 2.5);
      }
    }
    // 우회: 정면으로 오지 않고 옆으로 크게 돌아 들어옴 (가까워지면 곧장)
    if (e.flank && los && !(e.def.ranged && d < e.def.range * 0.9)) moveA += e.flank * 0.8 * clamp((d - 110) / 220, 0, 1);
    // 무리: 감염체는 한 줄로 따라오지 않고 퍼져서 에워쌈
    if (e.swarm && los) moveA += e.swarm * clamp((d - 60) / 240, 0, 1);
    return moveA;
  },
  // 플레이어 쪽으로 벽이 바로 앞에 있고, 플레이어에게서 안 보이는 자리
  findCover(e, p) {
    let best = null, bd = 1e9;
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * TAU + (i % 2) * 0.13, r = 55 + (i % 4) * 52, x = e.x + Math.cos(ang) * r, y = e.y + Math.sin(ang) * r;
      if (World.solidAt(x, y) || World.solidAt(x + 10, y) || World.solidAt(x - 10, y) || World.solidAt(x, y + 10) || World.solidAt(x, y - 10)) continue;
      const pd = Math.hypot(p.x - x, p.y - y); if (pd < 150 || pd > e.def.range) continue;
      const ta = Math.atan2(p.y - y, p.x - x);
      if (![24, 38, 54].some(k => World.solidAt(x + Math.cos(ta) * k, y + Math.sin(ta) * k))) continue; // 바로 앞에 벽
      if (World.lineOfSight({ x, y }, p) || !World.lineOfSight(e, { x, y })) continue;
      const cd = Math.hypot(x - e.x, y - e.y); if (cd < bd) { bd = cd; best = { x, y }; }
    }
    return best;
  },
  // 감염체 하나가 알아채면 근처 무리도 함께 달려듦
  packAlert(e) {
    if (FACTION[e.type] !== 'infected' || e.def.boss) return;
    for (const o of G.enemies) if (o !== e && o.hp > 0 && o.state !== 'chase' && FACTION[o.type] === 'infected' && !o.def.boss && Math.hypot(o.x - e.x, o.y - e.y) < 380) { o.state = 'chase'; o.prevSt = 'chase'; o.heard = true; o.alertT = 0.6 + Math.random() * 0.5; }
  },
  // 배회할 때 감염체는 가까운 동족 쪽으로 모임
  packWander(e) {
    if (FACTION[e.type] !== 'infected') return;
    let n = null, nd = 340;
    for (const o of G.enemies) { if (o === e || o.hp <= 0 || FACTION[o.type] !== 'infected') continue; const dd = Math.abs(o.x - e.x) + Math.abs(o.y - e.y); if (dd > 80 && dd < nd) { nd = dd; n = o; } }
    if (n) { e.wanderA = Math.atan2(n.y - e.y, n.x - e.x) + rand(-0.6, 0.6); e.wandering = true; }
  },
  // v1.32 맞은 반응: 휘청(항상) · 넘어짐(크게 맞거나 폭발 · 가벼운 적만)
  react(e, dmg, angle, hit) {
    if (e.def.boss || e.hp <= 0) return;
    e.flinchT = 0.16; e.flinchA = angle ?? e.flinchA ?? 0;
    const wt = e.weight ?? e.def.weight, heavy = e.fieldBoss || e.labBoss || e.elite || e.patterns || e.def.flying || !e.def.speed || wt > 2.5;
    if (heavy || G.time < (e.downCd || 0)) return;
    if ((hit.blast && dmg >= e.maxHp * 0.18) || dmg >= e.maxHp * 0.32 || ((hit.stagger || 0) >= 0.3 && dmg >= e.maxHp * 0.2)) {
      e.downT = 1.05; e.downCd = G.time + 3.5; e.stunT = Math.max(e.stunT, 1.05); this.interrupt(e);
    }
  },
  // 경직되면 준비 중이던 공격이 끊김 (강한 무기 보상)
  interrupt(e) { e.windT = 0; e.aimT = 0; e.pounceT = 0; e.leapT = 0; e.burstN = 0; },

  // ---------------- 세력 다툼 ----------------
  // 플레이어를 쫓지 않을 때 근처의 다른 세력과 싸움. 처리했으면 true
  infight(e, dt) {
    if (e.def.boss || e.elite || e.minion || e.assault || e.bossName) return false;
    e.foeT = (e.foeT || 0) - dt;
    if (e.foeT <= 0) {
      e.foeT = 0.6; e.foe = null;
      let bd = e.def.ranged ? e.def.range : 240;
      for (const o of G.enemies) {
        if (o === e || o.hp <= 0 || o.def.boss || o.elite || o.bossName || FACTION[o.type] === FACTION[e.type]) continue;
        const d = dist(e, o);
        if (d < bd && World.lineOfSight(e, o)) { bd = d; e.foe = o; }
      }
    }
    const f = e.foe;
    if (!f || f.hp <= 0) return false;
    const d = dist(e, f), a = angleTo(e, f), b = this.buff(e);
    e.face = a;
    if (e.def.ranged) {
      if (d > e.def.range * 0.8) tryMoveSmart(e, a, e.speed * 0.7 * b * dt);
      if (e.fireT <= 0) {
        e.fireT = e.def.fireCd * (e.fireMul || 1) * rand(1, 1.4); e.lastAtk = G.time;
        G.effects.push({ type: 'tracer', x: e.x, y: e.y, x2: f.x, y2: f.y, t: 0, life: 0.09, color: FACTION[e.type] === 'machine' ? '#9cf' : '#ff8a5a' });
        this.hurt(f, e.dmg * 0.8 * b, e);
      }
    } else if (d > e.r + f.r + 4) tryMoveSmart(e, a, e.speed * b * dt);
    else if (e.atkT <= 0) { e.atkT = e.def.atkCd * (e.atkMul || 1); e.lastAtk = G.time; this.hurt(f, e.dmg * b, e); }
    return true;
  },
  // 몬스터끼리의 피해 (플레이어 경험치·드랍 없음)
  hurt(t, dmg, src) {
    if (t.hp <= 0) return;
    t.hp -= dmg; t.hitT = 0.08;
    if (!t.foe) { t.foe = src; t.foeT = 0.6; }
    burst(t.x, t.y, FACTION[t.type] === 'machine' ? '#ffc' : '#7a1010', 3, 90, 0.3);
    if (t.hp <= 0) {
      t.hp = 0;
      burst(t.x, t.y, FACTION[t.type] === 'machine' ? '#aab' : '#7a0d0d', 10, 140, 0.5, 4);
      if (FACTION[t.type] !== 'machine') G.decals.push({ x: t.x, y: t.y, r: t.r * 1.2, a: rand(0, TAU) });
    }
  },
};
