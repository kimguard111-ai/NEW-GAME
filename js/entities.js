// 아이템 / 플레이어 / 적 관련 로직
let nextItemId = 1;

function rollRarity(bonus = 0) {
  return weighted(RARITIES.map((r, i) => [i, i === 0 ? Math.max(5, r.weight - bonus * 10) : r.weight * (1 + bonus * i * 0.5)]));
}

// 등급에 맞춰 추가 옵션을 굴림. 높은 등급일수록 좋은 수치가 나올 확률이 높음
function rollAffixes(kind, key, rarity, ilvl) {
  const melee = kind === 'weapon' && WEAPONS[key].melee;
  const pool = Object.keys(AFFIXES).filter(k => {
    const sl = AFFIXES[k].slot;
    return kind === 'armor' ? sl === 'armor' : sl === 'weapon' || (sl === 'gun' && !melee);
  });
  const out = [];
  for (let i = 0; i < AFFIX_COUNT[kind][rarity] && pool.length; i++) {
    const k = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], a = AFFIXES[k];
    let t = Math.random();
    if (rarity >= 3) t = Math.max(t, Math.random()); // 영웅·전설은 상위 수치 쪽으로
    let v = lerp(a.min, a.max, t);
    if (a.perLvl) v *= 1 + ilvl * a.perLvl;
    out.push({ k, v: a.pct ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10 });
  }
  return out;
}

function makeWeapon(key, ilvl, rarity) {
  const b = WEAPONS[key], r = RARITIES[rarity];
  const scale = r.mul * (1 + (ilvl - 1) * 0.07);
  const it = {
    id: nextItemId++, kind: 'weapon', key, rarity, ilvl: Math.max(ilvl, b.lvl), plus: 0,
    name: (rarity > 0 ? r.name + ' ' : '') + b.name, icon: b.icon,
    dmg: Math.round(b.dmg * scale * 10) / 10,
    affixes: rollAffixes('weapon', key, rarity, ilvl), isNew: true,
  };
  if (rarity === 4) {
    const keys = Object.keys(LEGENDARY).filter(k => !LEGENDARY[k].gun || !b.melee);
    it.legend = pick(keys);
  }
  if (!b.melee) it.loaded = b.mag;
  it.value = Math.round(b.price * r.mul * (1 + ilvl * 0.15) * (1 + it.affixes.length * 0.15));
  return it;
}

function makeArmor(key, ilvl, rarity) {
  const b = ARMORS[key], r = RARITIES[rarity];
  const affixes = rollAffixes('armor', key, rarity, ilvl);
  return {
    id: nextItemId++, kind: 'armor', key, rarity, ilvl: Math.max(ilvl, b.lvl), plus: 0,
    name: (rarity > 0 ? r.name + ' ' : '') + b.name, icon: b.icon,
    def: Math.round(b.def * r.mul * (1 + (ilvl - 1) * 0.06)),
    affixes, isNew: true,
    value: Math.round(b.price * r.mul * (1 + ilvl * 0.15) * (1 + affixes.length * 0.15)),
  };
}

// 구버전(v0.1) 세이브의 아이템을 현재 구조로 보정
function normalizeItem(it) {
  if (!it || it.kind === 'cons') return it;
  if (!Array.isArray(it.affixes)) it.affixes = [];
  if (!it.plus) it.plus = 0;
  return it;
}

function makeConsumable(key, count = 1) {
  const b = CONSUMABLES[key];
  return { id: nextItemId++, kind: 'cons', key, name: b.name, icon: b.icon, count, value: b.price };
}

// 레벨에 맞는 랜덤 장비
function randomGear(level, rarityBonus = 0, minRarity = 0) {
  const r = Math.max(minRarity, rollRarity(rarityBonus));
  if (Math.random() < 0.7) {
    const keys = Object.keys(WEAPONS).filter(k => WEAPONS[k].lvl <= level + 2);
    return makeWeapon(pick(keys), level, r);
  }
  const keys = Object.keys(ARMORS).filter(k => ARMORS[k].lvl <= level + 2);
  return makeArmor(pick(keys), level, r);
}

function itemReqLevel(it) {
  if (it.kind === 'weapon') return WEAPONS[it.key].lvl;
  if (it.kind === 'armor') return ARMORS[it.key].lvl;
  return 1;
}

function itemDesc(it) {
  if (it.kind === 'weapon') {
    const b = WEAPONS[it.key];
    let s = `피해 ${it.dmg}${b.pellets ? ' x' + b.pellets : ''} · 공격간격 ${b.rate}s`;
    s += b.melee ? ' · 근접' : ` · 탄창 ${b.mag} · 사거리 ${b.range}`;
    if (b.pierce) s += ' · 관통';
    return s + ` · 요구 Lv${b.lvl}`;
  }
  if (it.kind === 'armor') return `방어력 ${it.def} · 요구 Lv${ARMORS[it.key].lvl}`;
  return CONSUMABLES[it.key].desc;
}

function affixText(a) {
  const d = AFFIXES[a.k];
  return d.pct ? `${d.name} +${Math.round(a.v * 100)}%` : `${d.name} +${a.v}${d.unit || ''}`;
}

// 아이템 설명 HTML (인벤토리·상점 공용)
function itemHtml(it) {
  if (it.kind === 'cons') return `<span class="muted">${itemDesc(it)}</span>`;
  let h = `<span class="muted">${itemDesc(it)}</span>`;
  if (it.kind === 'weapon') h += `<br><span class="role">${WEAPONS[it.key].role}</span>`;
  for (const a of it.affixes || []) h += `<br><span class="affix">◆ ${affixText(a)}</span>`;
  if (it.legend) h += `<br><span class="legend">★ ${LEGENDARY[it.legend].name}: ${LEGENDARY[it.legend].desc}</span>`;
  return h;
}

// ---------------- 플레이어 ----------------
function newPlayer(name) {
  const c = World.campCenter();
  return {
    name, x: c.x, y: c.y, r: 12, aim: 0,
    level: 1, exp: 0, credits: 150, statPoints: 0,
    stats: { str: 5, dex: 5, vit: 5, agi: 5 },
    hp: 1, reserve: 150,
    equip: { w1: makeWeapon('pistol', 1, 0), w2: makeWeapon('pipe', 1, 0), armor: makeArmor('vest', 1, 0) },
    active: 'w1',
    inventory: [makeConsumable('medkit', 3), makeConsumable('ammo', 1)],
    quest: { idx: 0, active: false, progress: 0 },
    skillCd: [0, 0, 0, 0],
    buffs: { rapid: 0, adren: 0 },
    atkT: 0, reloadT: 0, hurtT: 0, swingT: 0, dead: false,
    bossKills: 0, totalKills: 0, pity: 0, respecs: 0,
  };
}

// 장착 장비의 옵션 합계. 무기 옵션은 들고 있는 무기만, 방어구 옵션은 항상 적용
function gearBonus(p, k, w = p.equip[p.active]) {
  let v = 0;
  const arm = p.equip.armor;
  if (arm && arm.affixes) for (const a of arm.affixes) if (a.k === k) v += a.v;
  if (w && w.affixes) for (const a of w.affixes) if (a.k === k) v += a.v;
  return v;
}
function hasLegend(p, id) { const w = p.equip[p.active]; return !!(w && w.legend === id); }

// 스탯 설계 (기본값 5에서 올린 만큼 효과)
//  근력: 근접 피해 +6%, 방어력 +1   → 근접형, 맞으면서 싸움
//  사격: 총기 피해 +4%, 재장전 +1.5% → 총잡이
//  체력: 최대 체력 +15, 재생 +0.25/초 → 생존형
//  민첩: 이동·공격속도 +0.8%, 치명타 +0.8% → 기동형
const PlayerStats = {
  maxHp: p => Math.round((100 + p.stats.vit * 15 + p.level * 10) * (1 + gearBonus(p, 'hp'))),
  def: p => (p.equip.armor ? p.equip.armor.def : 0) + Math.max(0, p.stats.str - 5),
  dmgReduce: p => { const d = PlayerStats.def(p); return d / (d + 80); },
  gunMul: p => 1 + (p.stats.dex - 5) * 0.04,
  meleeMul: p => 1 + (p.stats.str - 5) * 0.06,
  crit: (p, w) => 0.05 + (p.stats.agi - 5) * 0.008 + gearBonus(p, 'crit', w),
  critMul: (p, w) => ((w && WEAPONS[w.key].critMul) || 1.8) + gearBonus(p, 'critDmg', w),
  agiMul: p => Math.min(0.3, (p.stats.agi - 5) * 0.008),
  speed: p => {
    const w = p.equip[p.active];
    return 165 * (1 + PlayerStats.agiMul(p) + gearBonus(p, 'move')) * (w ? WEAPONS[w.key].move || 1 : 1) * (p.buffs.adren > 0 ? 1.35 : 1);
  },
  // 공격 간격 배율 (작을수록 빠름)
  rateMul: (p, w) => (p.buffs.rapid > 0 ? 0.5 : 1) / (1 + PlayerStats.agiMul(p) * 0.75 + gearBonus(p, 'rate', w)),
  reloadMul: (p, w) => (p.buffs.adren > 0 ? 0.7 : 1) / (1 + Math.max(0, p.stats.dex - 5) * 0.015 + gearBonus(p, 'reload', w)),
  regen: p => Math.max(0, p.stats.vit - 5) * 0.25 + gearBonus(p, 'regen'),
  expMul: p => 1 + gearBonus(p, 'exp'),
  expNext: lvl => Math.floor(45 * Math.pow(lvl, 1.65)),
};

// 스킬 수치: 각 스킬은 연동 능력치 하나를 따라 강해짐
const STAT_NAMES = { str: '근력', dex: '사격', vit: '체력', agi: '민첩' };
const statUp = (p, k) => Math.max(0, p.stats[k] - 5);
const SkillCalc = {
  rapidDur: p => 4 + Math.min(4, statUp(p, 'agi') * 0.1),
  grenadeR: p => 110 + Math.min(50, statUp(p, 'dex') * 2),
  grenadeDmg: p => (45 + p.level * 9) * PlayerStats.gunMul(p),
  healPct: p => Math.min(0.6, 0.35 + statUp(p, 'vit') * 0.006),
  adrenDmg: p => Math.min(0.6, 0.3 + statUp(p, 'str') * 0.01),
};
function skillDesc(s, p) {
  const pc = v => Math.round(v * 100) + '%';
  switch (s.id) {
    case 'rapid': return `${SkillCalc.rapidDur(p).toFixed(1)}초간 공격 속도 2배`;
    case 'grenade': return `반경 ${SkillCalc.grenadeR(p)} 폭발, 피해 ${Math.round(SkillCalc.grenadeDmg(p))}`;
    case 'heal': return `즉시 최대 체력 ${pc(SkillCalc.healPct(p))} 회복`;
    case 'adren': return `8초간 이동속도 +35%, 피해 +${pc(SkillCalc.adrenDmg(p))}, 재장전 +30%`;
  }
  return '';
}

// 능력치 초기화 비용 (첫 1회 무료)
function respecCost(p) { return p.respecs ? p.level * 80 : 0; }

function magSize(w) { const b = WEAPONS[w.key]; return Math.round(b.mag * (1 + gearBonus(G.player, 'mag', w))); }
function weaponDmg(w) { return w.dmg * (1 + (w.plus || 0) * 0.08) * (1 + gearBonus(G.player, 'dmg', w)); }

// 현재 능력치 기준 무기의 실제 초당 피해 (재장전 시간 포함). 장비 비교와 HUD에 사용
function weaponDps(p, w) {
  if (!w) return 0;
  const b = WEAPONS[w.key];
  const mul = (b.melee ? PlayerStats.meleeMul(p) : PlayerStats.gunMul(p)) * (1 + (w.plus || 0) * 0.08) * (1 + gearBonus(p, 'dmg', w));
  const cc = Math.min(1, PlayerStats.crit(p, w));
  const interval = b.rate * (p.buffs.rapid > 0 ? 2 : 1) * PlayerStats.rateMul(p, w);
  let dps = w.dmg * (b.pellets || 1) * mul * (1 + cc * (PlayerStats.critMul(p, w) - 1)) / interval;
  if (!b.melee) {
    const mag = Math.round(b.mag * (1 + gearBonus(p, 'mag', w)));
    const rl = b.reload / (1 + Math.max(0, p.stats.dex - 5) * 0.015 + gearBonus(p, 'reload', w));
    dps *= (mag * interval) / (mag * interval + rl);
  }
  if (w.legend === 'boom') dps *= 1.1;
  return dps;
}

// 방어구 가치: 버틸 수 있는 실질 체력 (체력 옵션과 방어력 합산)
function armorEhp(p, arm) {
  const base = (100 + p.stats.vit * 15 + p.level * 10);
  let hp = 0;
  if (arm) for (const a of arm.affixes || []) if (a.k === 'hp') hp += a.v;
  const def = (arm ? arm.def : 0) + Math.max(0, p.stats.str - 5);
  return base * (1 + hp) / (1 - def / (def + 80));
}

// 현재 장착 장비보다 좋은지 (인벤토리 ▲ 표시)
function isUpgrade(p, it) {
  if (it.kind === 'weapon') {
    // 같은 무기를 장착 중이면 그것과만 비교 (역할이 다른 무기끼리 DPS만으로 ▲ 표시하지 않도록)
    const equipped = ['w1', 'w2'].map(s => p.equip[s]).filter(Boolean);
    const sameKey = equipped.filter(w => w.key === it.key);
    const melee = WEAPONS[it.key].melee;
    const same = sameKey.length ? sameKey : equipped.filter(w => WEAPONS[w.key].melee === melee);
    const best = same.length ? Math.max(...same.map(w => weaponDps(p, w))) : 0;
    return weaponDps(p, it) > best * 1.02;
  }
  if (it.kind === 'armor') return armorEhp(p, it) > armorEhp(p, p.equip.armor) * 1.02 || (!!p.equip.armor && it.affixes.length > p.equip.armor.affixes.length && it.def >= p.equip.armor.def);
  return false;
}

// ---------------- 적 ----------------
function makeEnemy(type, x, y, level) {
  const d = ENEMIES[type];
  const hpMul = 1 + (level - 1) * 0.38, dmgMul = 1 + (level - 1) * 0.26;
  const hp = Math.round(d.hp * (d.boss ? 1 : hpMul));
  return {
    type, def: d, x, y, r: d.r, level,
    hp, maxHp: hp, dmg: d.dmg * (d.boss ? 1 : dmgMul),
    speed: d.speed * rand(0.92, 1.08),
    atkT: rand(0, 1), fireT: rand(0.5, 1.5), state: 'idle', stunT: 0,
    wanderA: rand(0, TAU), wanderT: 0, hitT: 0, stuckT: 0, sideDir: Math.random() < 0.5 ? 1 : -1,
    bossT1: 3, bossT2: 7, bossT3: 5, charge: 0, chargeA: 0,
  };
}
