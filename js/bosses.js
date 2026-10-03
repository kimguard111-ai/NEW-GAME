// 지역 필드 보스 · 레이드 보스 타이탄 페이즈 (v0.10)

// 지역마다 주기적으로 한 마리씩 나타나는 필드 보스 (플레이어가 그 지역에 있을 때)
const FIELD_BOSSES = {
  1: { name: '거대 변이견 「붉은 이빨」', base: 'dog', level: 5, hpMul: 70, dmgMul: 1.6, scale: 1.9, patterns: ['dash', 'howl', 'dash', 'quake'] },
  2: { name: '약탈단장 「독사」', base: 'raider', level: 10, hpMul: 24, dmgMul: 1.4, scale: 1.4, fireMul: 0.5, patterns: ['fan', 'dash', 'panther'] },
  3: { name: '실험체 「골리앗」', base: 'brute', level: 16, hpMul: 20, dmgMul: 1.3, scale: 1.6, patterns: ['quake', 'dash', 'glutton', 'quake'] },
};
const FIELD_BOSS_CD = 360; // 처치 후 다음 출현까지 (초)

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
      if (World.zoneIndex(x, y) !== z || World.circleBlocked(x, y, ENEMIES[def.base].r * def.scale + 4) || World.inSafe(x, y)) continue;
      const e = makeEnemy(def.base, x, y, def.level);
      e.bossName = def.name; e.fieldBoss = z; e.patterns = def.patterns; e.scale = def.scale; e.expMul = 10;
      e.hp = e.maxHp = Math.round(e.maxHp * def.hpMul); e.dmg *= def.dmgMul;
      e.r = Math.round(e.r * def.scale); e.fireMul = def.fireMul || 1; e.weight = e.def.weight * 6; e.skillT = 2;
      G.enemies.push(e); G.fieldBoss = e;
      const dirs = ['동', '남동', '남', '남서', '서', '북서', '북', '북동'];
      const sa = Math.atan2((x + y) - (p.x + p.y), (x - y) - (p.x - p.y)); // 화면 기준 방향
      const dir = dirs[Math.round(((sa % TAU) + TAU) % TAU / (TAU / 8)) % 8];
      log(`⚠ 필드 보스 ${def.name} 출현! (${dir}쪽 약 ${Math.round(r / TILE * 2)}m · 미니맵 붉은 표시)`, '#ff7a5a');
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
    if (Math.random() < 0.5) dropAt('item', { item: randomGear(e.level + 1, 1, 1, ZONES[e.fieldBoss].gear) });
    dropAt('item', { item: makeConsumable('medkit', 2) });
    for (const o of G.enemies) if (o.guardOf === e) o.hp = 0; // 부하 정리
    p.fieldBossKills = (p.fieldBossKills || 0) + 1;
    Workshop.gain(10, 2, '필드 보스 잔해 회수');
    hitstop(0.15); G.shake = Math.max(G.shake, 12);
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
