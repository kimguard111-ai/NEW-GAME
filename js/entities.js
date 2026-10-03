// 아이템 / 플레이어 / 적 관련 로직
let nextItemId = 1;

function rollRarity(bonus = 0) {
  return weighted(RARITIES.map((r, i) => [i, i === 0 ? Math.max(5, r.weight - bonus * 10) : r.weight * (1 + bonus * i * 0.5)]));
}

function makeWeapon(key, ilvl, rarity) {
  const b = WEAPONS[key], r = RARITIES[rarity];
  const scale = r.mul * (1 + (ilvl - 1) * 0.07);
  const it = {
    id: nextItemId++, kind: 'weapon', key, rarity, ilvl: Math.max(ilvl, b.lvl),
    name: (rarity > 0 ? r.name + ' ' : '') + b.name, icon: b.icon,
    dmg: Math.round(b.dmg * scale * 10) / 10,
  };
  if (!b.melee) it.loaded = b.mag;
  it.value = Math.round(b.price * r.mul * (1 + ilvl * 0.15));
  return it;
}

function makeArmor(key, ilvl, rarity) {
  const b = ARMORS[key], r = RARITIES[rarity];
  return {
    id: nextItemId++, kind: 'armor', key, rarity, ilvl: Math.max(ilvl, b.lvl),
    name: (rarity > 0 ? r.name + ' ' : '') + b.name, icon: b.icon,
    def: Math.round(b.def * r.mul * (1 + (ilvl - 1) * 0.06)),
    value: Math.round(b.price * r.mul * (1 + ilvl * 0.15)),
  };
}

function makeConsumable(key, count = 1) {
  const b = CONSUMABLES[key];
  return { id: nextItemId++, kind: 'cons', key, name: b.name, icon: b.icon, count, value: b.price };
}

// 레벨에 맞는 랜덤 장비
function randomGear(level, rarityBonus = 0) {
  const r = rollRarity(rarityBonus);
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
    s += b.melee ? ' · 근접' : ` · 탄창 ${b.mag} · 재장전 ${b.reload}s`;
    if (b.pierce) s += ' · 관통';
    return s + ` · 요구 Lv${b.lvl}`;
  }
  if (it.kind === 'armor') return `방어력 ${it.def} · 요구 Lv${ARMORS[it.key].lvl}`;
  return CONSUMABLES[it.key].desc;
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
    bossKills: 0, totalKills: 0,
  };
}

const PlayerStats = {
  maxHp: p => Math.round(100 + p.stats.vit * 14 + p.level * 10),
  def: p => (p.equip.armor ? p.equip.armor.def : 0),
  dmgReduce: p => { const d = PlayerStats.def(p); return d / (d + 80); },
  gunMul: p => 1 + (p.stats.dex - 5) * 0.035,
  meleeMul: p => 1 + (p.stats.str - 5) * 0.05,
  crit: p => 0.05 + (p.stats.agi - 5) * 0.006,
  speed: p => (165 + (p.stats.agi - 5) * 1.5) * (p.buffs.adren > 0 ? 1.35 : 1),
  rateMul: p => (p.buffs.rapid > 0 ? 0.5 : 1) * (1 - Math.min(0.3, (p.stats.agi - 5) * 0.004)),
  expNext: lvl => Math.floor(45 * Math.pow(lvl, 1.65)),
};

// ---------------- 적 ----------------
function makeEnemy(type, x, y, level) {
  const d = ENEMIES[type];
  const hpMul = 1 + (level - 1) * 0.38, dmgMul = 1 + (level - 1) * 0.26;
  const hp = Math.round(d.hp * (d.boss ? 1 : hpMul));
  return {
    type, def: d, x, y, r: d.r, level,
    hp, maxHp: hp, dmg: d.dmg * (d.boss ? 1 : dmgMul),
    speed: d.speed * rand(0.92, 1.08),
    atkT: rand(0, 1), fireT: rand(0.5, 1.5), state: 'idle',
    wanderA: rand(0, TAU), wanderT: 0, hitT: 0, stuckT: 0, sideDir: Math.random() < 0.5 ? 1 : -1,
    bossT1: 3, bossT2: 7, bossT3: 5, charge: 0, chargeA: 0,
  };
}
