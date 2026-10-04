// 어설트: 랜드마크 거점 탈환전 (v0.9)
// 랜드마크 앞에서 [E] → 봉쇄 구역 안에서 웨이브 3개 + 거점 보스 → 클리어 시간으로 등급(S/A/B)·보상
// 별도 맵 없이 기존 도시 위에서 진행 (봉쇄선 밖으로 나갈 수 없음)

const ASSAULTS = {
  cathedral: { name: '성당 탈환전', level: 4, minLevel: 3, par: 70, limit: 240,
    waves: [{ zombie: 6, dog: 2 }, { zombie: 8, dog: 4 }, { zombie: 6, brute: 1, elites: 1 }],
    boss: { name: '변이 거한 「파수꾼」', art: 'warden', base: 'brute', hpMul: 7, dmgMul: 1.2, scale: 1.35, patterns: ['glutton'] } },
  bosingak: { name: '보신각 소탕전', level: 9, minLevel: 7, par: 90, limit: 240,
    waves: [{ raider: 4, dog: 3 }, { raider: 6, dog: 3 }, { raider: 5, zombie: 4, elites: 2 }],
    boss: { name: '약탈자 처형인 「도살자」', art: 'butcher', base: 'raider', hpMul: 12, dmgMul: 1.3, scale: 1.3, fireMul: 0.5, patterns: ['panther', 'glutton'] } },
  base: { name: '용산 기지 재점령', level: 14, minLevel: 12, par: 75, limit: 270,
    waves: [{ drone: 3, raider: 3, dog: 2 }, { brute: 2, drone: 4, dog: 2 }, { drone: 3, raider: 3, brute: 2, elites: 2 }],
    boss: { name: '방어 시스템 「케르베로스」', art: 'cerberus', base: 'drone', hpMul: 16, dmgMul: 1.2, scale: 1.8, fireMul: 0.35, patterns: ['argos', 'panther'] } },
  tower63: { name: '63빌딩 정화 작전', level: 19, minLevel: 16, par: 85, limit: 300,
    waves: [{ zombie: 8, brute: 2 }, { drone: 4, raider: 3, zombie: 4 }, { brute: 3, drone: 3, zombie: 4, elites: 3 }],
    boss: { name: '방사능 변이체 「군체」', art: 'colony', base: 'brute', hpMul: 9, dmgMul: 1.3, scale: 1.6, patterns: ['glutton', 'argos'], affix: 'commander' } },
};
// v1.6 강남 · 잠실
ASSAULTS.coex = { name: '코엑스 탈환전', level: 24, minLevel: 21, par: 85, limit: 300,
  waves: [{ merc: 4, shield: 2 }, { merc: 4, drone: 3, shield: 2 }, { merc: 4, shield: 3, drone: 2, elites: 2 }],
  boss: { name: '블랙선 중화기병 「모루」', art: 'anvil', base: 'shield', hpMul: 10, dmgMul: 1.3, scale: 1.4, patterns: ['quake', 'dash', 'fan'] } };
ASSAULTS.lotte = { name: '롯데타워 정화 작전', level: 29, minLevel: 26, par: 90, limit: 300,
  waves: [{ stalker: 4, zombie: 6 }, { stalker: 4, brute: 2, spitter: 3 }, { stalker: 5, brute: 3, zombie: 4, elites: 3 }],
  boss: { name: '포식 변이체 「여왕」', art: 'queen', base: 'brute', hpMul: 10, dmgMul: 1.35, scale: 1.7, patterns: ['glutton', 'brood', 'quake'] } };
const ASSAULT_R = 13 * TILE; // 봉쇄 구역 반지름
// 위협 등급 (v0.14 엔드게임): 등급마다 적 레벨 +3 · 체력 +30% · 보상 증가. 등급 N을 깨면 N+1 개방
const TIER_MAX = 10; // v1.15: 6~10은 적 레벨 대신 이번 주 변형 규칙이 단계마다 하나씩 붙음
const tierLvl = t => 3 * (Math.min(t, 5) - 1) + Math.max(0, t - 5), tierHp = t => 1 + 0.3 * (Math.min(t, 5) - 1) + 0.15 * Math.max(0, t - 5);
// v1.15 변형 규칙 (주마다 순서가 바뀜): 위협 6 = 1개 · 7 = 2개 … 10 = 5개
const MUTATORS = {
  swift:    { name: '질주', desc: '적 이동 속도 +25%' },
  armored:  { name: '장갑', desc: '적이 받는 피해 -20%' },
  volatile: { name: '폭발', desc: '적이 쓰러질 때 그 자리 폭발 (0.8초 뒤)' },
  regen:    { name: '재생', desc: '적이 초당 최대 체력 2% 회복' },
  horde:    { name: '대군', desc: '웨이브마다 적 +3 · 엘리트 +1' },
  dark:     { name: '암흑', desc: '시야가 크게 어두워짐' },
  frenzy:   { name: '광분', desc: '적 피해 +20%' },
};
const weekNo = () => Math.floor((Date.now() / 864e5 + 3) / 7); // 월요일 기준 주 번호
function weekMutators() {
  const rng = mulberry32(weekNo() * 7919), keys = Object.keys(MUTATORS);
  for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
  return keys.slice(0, 5);
}
const tierMutators = t => weekMutators().slice(0, Math.max(0, t - 5));
const RANKS = { S: { gear: 2, bonus: 1.5, min: 2, mul: 1.5, color: '#ffd76a' }, A: { gear: 1, bonus: 1.0, min: 1, mul: 1.2, color: '#c77dff' }, B: { gear: 1, bonus: 0.5, min: 0, mul: 1, color: '#9fd' } };

const Assault = {
  // 지금 [E]로 시작할 수 있는 어설트 (랜드마크 앞에 있을 때)
  available() {
    const p = G.player;
    if (G.assault || p.dead) return null;
    for (const l of World.landmarks) {
      if (ASSAULTS[l.id] && p.found.includes(l.id) && dist(p, l) < l.size * TILE / 2 + 90) return l;
    }
    return null;
  },
  hint(l) {
    const a = ASSAULTS[l.id], rec = G.player.assaults[l.id];
    return `[E] 어설트: ${a.name} (권장 Lv${a.minLevel}+${rec ? ` · 최고 ${rec.best} ${rec.time}초 · 위협 ${rec.tier || 1}단계 클리어` : ' · 첫 클리어 보너스'})`;
  },
  // 위협 등급 선택 (한 번이라도 깬 어설트)
  choose(l) {
    const p = G.player, a = ASSAULTS[l.id], rec = p.assaults[l.id];
    if (!rec) return this.start(l, 1);
    const top = Math.min(TIER_MAX, (rec.tier || 1) + 1), btns = [];
    for (let t = 1; t <= top; t++) btns.push([`위협 ${t} (적 Lv${a.level + tierLvl(t)})${t > 5 ? ' ' + tierMutators(t).map(m => MUTATORS[m].name).join('·') : ''}`, () => { UI.close('dialog'); this.start(l, t); }]);
    btns.push(['취소', () => UI.close('dialog')]);
    UI.dialog(a.name, `위협 등급이 높을수록 적 레벨 +3 · 체력 +30%씩, 보상(장비 등급·전자 부품·경험치)도 커집니다.<br><span class="muted">위협 N을 클리어하면 N+1이 열립니다. (최대 ${TIER_MAX})</span>`
      + `<br><b style="color:#ff8a5a">위협 6~10 — 이번 주 변형 규칙</b> <span class="muted">(매주 월요일 바뀜, 단계마다 하나씩 추가)</span><br>${weekMutators().map((m, i) => `<span class="muted">${i + 6}:</span> ${MUTATORS[m].name} — ${MUTATORS[m].desc}`).join('<br>')}`, btns);
  },

  start(l, tier = 1) {
    const p = G.player, a = ASSAULTS[l.id];
    if (p.level < a.minLevel - 2) { log(`${a.name}: Lv${a.minLevel - 2} 이상부터 도전할 수 있습니다.`, '#f88'); return; }
    // 봉쇄 구역 안 일반 적은 철수 (이후 일반 스폰 중지)
    G.enemies = G.enemies.filter(e => e.def.boss || dist(e, l) > 1400);
    G.assault = { id: l.id, l, wave: -1, phase: 'ready', t: 0, wait: 3, boss: null, tier, muts: tierMutators(tier) };
    if (G.assault.muts.length) log(`변형 규칙: ${G.assault.muts.map(m => `${MUTATORS[m].name}(${MUTATORS[m].desc})`).join(' · ')}`, '#ff8a5a');
    UI.toast(`어설트 — ${a.name}${tier > 1 ? ` · 위협 ${tier}` : ''}`, `웨이브 ${a.waves.length}개 + 거점 보스 · 제한 시간 ${a.limit}초 · 봉쇄선 밖으로 나갈 수 없음`);
    log(`어설트 개시: ${a.name}. 3초 후 첫 웨이브!`, '#ff9a5a');
    G.effects.push({ type: 'ring', x: l.x, y: l.y, t: 0, life: 1, color: '#ff6a4a', r: ASSAULT_R });
  },

  update(dt) {
    const s = G.assault;
    if (!s) return;
    const p = G.player, a = ASSAULTS[s.id], l = s.l;
    if (p.dead) return this.end(false, '전투 불능');
    s.t += dt;
    if (s.t > a.limit) return this.end(false, '제한 시간 초과');
    // 봉쇄선: 밖으로 나갈 수 없음
    const d = dist(p, l);
    if (d > ASSAULT_R - p.r) {
      const k = (ASSAULT_R - p.r) / d, nx = l.x + (p.x - l.x) * k, ny = l.y + (p.y - l.y) * k;
      if (!World.circleBlocked(nx, ny, p.r)) { p.x = nx; p.y = ny; }
    }
    const live = G.enemies.filter(e => e.assault && e.hp > 0), alive = live.length;
    // 동시에 최대 6마리, 원거리는 최대 3마리 (원거리 집중 사격으로 순삭 방지)
    if (s.queue && s.queue.length && (s.qT -= dt) <= 0 && alive < 6) {
      const ranged = live.filter(e => e.def.ranged).length, i = s.queue.findIndex(q => !ENEMIES[q.type].ranged || ranged < 3);
      if (i >= 0) { s.qT = 0.5; this.spawnOne(s.queue.splice(i, 1)[0]); }
    }
    this.unstick(dt);
    if (s.phase === 'fight' && alive === 0 && !(s.queue && s.queue.length)) {
      if (s.wave === a.waves.length) return this.clear();
      s.phase = 'ready'; s.wait = 2.5;
      floatText(p.x, p.y - 40, '웨이브 정리!', '#9fd', 16);
    }
    if (s.phase === 'ready' && (s.wait -= dt) <= 0) {
      s.wave++; s.phase = 'fight';
      if (s.wave < a.waves.length) this.spawnWave(a.waves[s.wave], a.level + tierLvl(s.tier));
      else this.spawnBoss(a);
    }
  },

  spot(r0, r1, rad) { // 봉쇄 구역 안 빈 자리
    const l = G.assault.l;
    for (let i = 0; i < 30; i++) {
      const ang = rand(0, TAU), r = rand(r0, r1), x = l.x + Math.cos(ang) * r, y = l.y + Math.sin(ang) * r;
      if (!World.circleBlocked(x, y, rad) && !World.buildingAt(x, y) && dist({ x, y }, G.player) > 140) return { x, y };
    }
    return null;
  },
  add(e) {
    const k = tierHp(G.assault.tier);
    e.assault = true; e.state = 'chase'; e.hp = e.maxHp = Math.round(e.maxHp * k);
    const m = G.assault.muts || []; // v1.15 변형 규칙
    if (m.includes('swift')) e.speed *= 1.25;
    if (m.includes('frenzy')) e.dmg *= 1.2;
    if (m.includes('armored')) e.armorMut = true;
    if (m.includes('volatile')) e.volatile = true;
    if (m.includes('regen')) e.regenMut = true;
    G.enemies.push(e); return e;
  },

  // 웨이브는 큐에 넣고 0.5초 간격으로 봉쇄선 가장자리에서 투입 (엘리트는 마지막에)
  spawnWave(w, lvl) {
    const s = G.assault, list = [];
    for (const [type, n] of Object.entries(w)) if (type !== 'elites') for (let i = 0; i < n; i++) list.push({ type, lvl: lvl + randInt(-1, 0) });
    for (let i = list.length - 1; i > 0; i--) { const j = randInt(0, i); [list[i], list[j]] = [list[j], list[i]]; }
    if ((s.muts || []).includes('horde')) { const t0 = Object.keys(w).find(k => k !== 'elites'); for (let i = 0; i < 3; i++) list.push({ type: t0, lvl }); }
    const el = (w.elites || 0) + ((s.muts || []).includes('horde') ? 1 : 0);
    for (let i = 0; i < Math.min(el, list.length); i++) list[list.length - 1 - i].elite = true;
    s.queue = list; s.qT = 0;
    log(`웨이브 ${s.wave + 1} / ${ASSAULTS[s.id].waves.length} — 적 ${list.length}`, '#ff9a5a');
    UI.toast(`웨이브 ${s.wave + 1}`, `적 ${list.length}${w.elites ? ` · 엘리트 ${w.elites}` : ''}`);
  },
  spawnOne(q) {
    const at = this.spot(ASSAULT_R * 0.55, ASSAULT_R * 0.9, ENEMIES[q.type].r + 4);
    if (!at) { G.assault.queue.push(q); return; }
    const e = this.add(makeEnemy(q.type, at.x, at.y, q.lvl));
    if (q.elite) Monsters.makeElite(e, Monsters.rollAffix(e.type));
    burst(e.x, e.y, '#ff6a4a', 8, 120, 0.4);
  },
  // 건물 뒤에 끼어 오래 안 보이는 적은 플레이어가 보이는 자리로 옮김 (진행 막힘 방지)
  unstick(dt) {
    const p = G.player;
    for (const e of G.enemies) {
      if (!e.assault || e.hp <= 0) continue;
      e.hideT = World.lineOfSight(e, p) ? 0 : (e.hideT || 0) + dt;
      if (e.hideT < 6) continue;
      for (let i = 0; i < 20; i++) {
        const at = this.spot(160, ASSAULT_R * 0.9, e.r + 4);
        if (at && World.lineOfSight(at, p)) { e.x = at.x; e.y = at.y; e.hideT = 0; burst(e.x, e.y, '#ff6a4a', 8, 120, 0.4); break; }
      }
    }
  },

  spawnBoss(a) {
    const b = a.boss, at = this.spot(ASSAULT_R * 0.35, ASSAULT_R * 0.7, ENEMIES[b.base].r * b.scale + 4) || { x: G.assault.l.x, y: G.assault.l.y + G.assault.l.size * TILE };
    const e = makeEnemy(b.base, at.x, at.y, a.level + 1 + tierLvl(G.assault.tier));
    e.bossName = b.name; e.art = b.art; e.patterns = b.patterns; e.scale = b.scale; e.expMul = 6;
    e.hp = e.maxHp = Math.round(e.maxHp * b.hpMul); e.dmg *= b.dmgMul;
    e.r = Math.round(e.r * b.scale); e.fireMul = b.fireMul || 1; e.weight = e.def.weight * 5;
    if (b.affix) { e.affix = b.affix; e.announced = true; }
    this.add(e); G.assault.boss = e;
    log(`${ICON('warn')} 거점 보스 ${b.name} 출현!`, '#ffa53a');
    UI.toast('거점 보스', b.name);
    G.shake = Math.max(G.shake, 10);
  },

  par(a, tier = 1) { return Math.round(a.par * (1 + 0.1 * (tier - 1))); }, // 높은 위협은 S 기준 시간 완화
  rank(t, a, tier = 1) { const par = this.par(a, tier); return t <= par ? 'S' : t <= par * 1.4 ? 'A' : 'B'; },

  clear() {
    const s = G.assault, p = G.player, a = ASSAULTS[s.id], l = s.l;
    const tier = s.tier || 1, t = Math.round(s.t), rk = this.rank(t, a, tier), R = RANKS[rk];
    const rec = p.assaults[s.id], first = !rec, lvl = a.level + tierLvl(tier), tm = 1 + 0.5 * (tier - 1);
    const exp = Math.round(lvl * lvl * 18 * R.mul * tm), credits = Math.round(lvl * 70 * R.mul * tm);
    gainExp(exp); p.credits += credits;
    const zone = ZONES[l.zone].gear;
    const drop = it => G.drops.push({ x: p.x + rand(-40, 40), y: p.y + rand(-40, 40), kind: 'item', t: 0, item: it });
    // 위협 3+: 첫 장비 희귀 이상 · 위협 5: 영웅 이상, 위협마다 장비 등급 보너스
    for (let i = 0; i < R.gear + (tier >= 4 ? 1 : 0); i++) drop(randomGear(lvl + 1, R.bonus + 0.4 * (tier - 1), i === 0 ? Math.max(R.min, tier >= 5 ? 3 : tier >= 3 ? 2 : 0) : 0, zone));
    if (first) drop(randomGear(a.level + 1, 2, 3, zone)); // 첫 클리어: 영웅 이상 확정
    if (tier > 1 && tier > ((rec && rec.tier) || 1)) drop(randomGear(lvl + 1, 2, tier >= 10 ? 4 : 3, zone)); // 새 위협 등급 첫 클리어: 영웅 이상 (v1.15 위협 10은 전설)
    if (tier >= 6) { drop(randomGear(lvl + 1, 1.5 + 0.3 * (tier - 5), 3, zone)); Weekly.on('mutator', tier); } // v1.15 변형 규칙 보상
    drop(makeConsumable('medkit', 2));
    Workshop.gain(4 + 'BAS'.indexOf(rk) * 3 + 2 * (tier - 1), 1 + 'BAS'.indexOf(rk) + (tier - 1), '작전 보급'); // 재료: 등급·위협 비례
    const better = !rec || 'SAB'.indexOf(rk) < 'SAB'.indexOf(rec.best) || t < rec.time;
    p.assaults[s.id] = { best: rec && 'SAB'.indexOf(rec.best) < 'SAB'.indexOf(rk) ? rec.best : rk,
      time: rec ? Math.min(rec.time, t) : t, clears: (rec ? rec.clears : 0) + 1, tier: Math.max(tier, (rec && rec.tier) || 1) };
    Bounty.on('assault', tier);
    UI.toast(`어설트 완료 — 등급 ${rk}${tier > 1 ? ` · 위협 ${tier}` : ''}`, `${t}초 (S ≤ ${this.par(a, tier)}초) · EXP +${fmt(exp)} · +${fmt(credits)}₵${first ? ' · 첫 클리어 보너스!' : ''}`);
    log(`어설트 완료: ${a.name} 위협 ${tier} 등급 ${rk} (${t}초)${better && rec ? ' — 기록 갱신!' : ''}`, R.color);
    G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 1.2, color: R.color, r: 160 });
    burst(p.x, p.y, R.color, 40, 220, 0.9, 4);
    G.assault = null;
    saveGame();
  },

  end(ok, why) {
    const s = G.assault;
    for (const e of G.enemies) if (e.assault) e.hp = 0; // 남은 어설트 적 철수 (보상 없음)
    G.enemies = G.enemies.filter(e => e.hp > 0);
    log(`어설트 실패: ${why}`, '#f66');
    if (!G.player.dead) UI.toast('어설트 실패', why);
    G.assault = null;
  },

  trackerHtml() {
    const s = G.assault, a = ASSAULTS[s.id];
    const left = G.enemies.filter(e => e.assault && e.hp > 0).length, rem = Math.max(0, Math.ceil(a.limit - s.t));
    const stage = s.wave >= a.waves.length ? '거점 보스' : s.wave < 0 ? '준비' : `웨이브 ${s.wave + 1} / ${a.waves.length}`;
    return `<b style="color:#ff9a5a">${ICON('swords')} ${a.name}${s.tier > 1 ? ` · 위협 ${s.tier}` : ''}</b><br>${stage}${s.phase === 'fight' ? ` · 남은 적 <b>${left}</b>` : ''}`
      + `<br><span class="muted">${Math.floor(s.t)}초 · 예상 등급 ${this.rank(s.t, a, s.tier)} · 남은 시간 ${rem}초</span>`;
  },

  panelHtml(p) {
    let h = '<hr style="border-color:#333"><b>어설트 (거점 탈환전)</b> <span class="muted">— 발견한 랜드마크 앞에서 [E]</span>';
    for (const l of World.landmarks) {
      const a = ASSAULTS[l.id], rec = p.assaults[l.id];
      if (!a) continue;
      const state = !p.found.includes(l.id) ? `${ICON('lock')} ${l.name} 발견 필요` : rec ? `<b style="color:${RANKS[rec.best].color}">${rec.best}</b> 최고 ${rec.time}초 · ${rec.clears}회 · 위협 ${rec.tier || 1}/${TIER_MAX}` : '미도전 · 첫 클리어 시 영웅 장비';
      h += `<div class="step-row">${a.name} <span class="muted">Lv${a.minLevel}+</span> — ${state}</div>`;
    }
    return h;
  },
};
