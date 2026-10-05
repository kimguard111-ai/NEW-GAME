// 아이템 / 플레이어 / 적 관련 로직
let nextItemId = 1;

function rollRarity(bonus = 0) {
  return weighted(RARITIES.map((r, i) => [i, i === 0 ? Math.max(5, r.weight - bonus * 10) : r.weight * (1 + bonus * i * 0.5)]));
}

// 장비 종류에 붙을 수 있는 추가 옵션 목록
function affixPool(kind, key) {
  const melee = kind === 'weapon' && WEAPONS[key].melee;
  return Object.keys(AFFIXES).filter(k => {
    const sl = AFFIXES[k].slot;
    if (AFFIXES[k].weapons && !AFFIXES[k].weapons.includes(key)) return false; // 계열 전용 옵션
    if (kind === 'belt') return sl === 'belt'; // v1.25
    return kind !== 'weapon' ? sl === 'armor' : sl === 'weapon' || (sl === 'gun' && !melee); // 헬멧은 방어구 옵션
  });
}
// 옵션 하나의 수치. 높은 등급일수록 좋은 수치가 나올 확률이 높음
function rollAffix(k, rarity, ilvl) {
  const a = AFFIXES[k];
  let t = Math.random();
  if (rarity >= 3) t = Math.max(t, Math.random()); // 영웅·전설은 상위 수치 쪽으로
  let v = lerp(a.min, a.max, t);
  if (a.perLvl) v *= 1 + ilvl * a.perLvl;
  if (a.int) v = Math.round(lerp(a.min - 0.49, a.max + 0.49, t));
  return { k, v: a.int ? clamp(v, a.min, a.max) : a.pct ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10 };
}
// 등급에 맞춰 추가 옵션을 굴림
function rollAffixes(kind, key, rarity, ilvl) {
  const pool = affixPool(kind, key), out = [];
  for (let i = 0; i < AFFIX_COUNT[kind][rarity] && pool.length; i++) {
    out.push(rollAffix(pool.splice(Math.floor(Math.random() * pool.length), 1)[0], rarity, ilvl));
  }
  return out;
}

function makeWeapon(key, ilvl, rarity) {
  const b = WEAPONS[key], r = RARITIES[rarity];
  const scale = r.mul * (1 + (ilvl - 1) * 0.07);
  const it = {
    id: nextItemId++, kind: 'weapon', key, rarity, ilvl: Math.max(ilvl, b.lvl), plus: 0, v181: true, v127: true, v1402: true, // v181: 근접 피해 보정이 이미 반영된 새 수치
    name: (rarity > 0 ? r.name + ' ' : '') + b.name,
    dmg: Math.round(b.dmg * scale * 10) / 10,
    affixes: rollAffixes('weapon', key, rarity, ilvl), isNew: true,
  };
  if (rarity === 4) {
    const keys = Object.keys(LEGENDARY).filter(k => !LEGENDARY[k].slot && (!LEGENDARY[k].gun || !b.melee));
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
    name: (rarity > 0 ? r.name + ' ' : '') + b.name,
    def: Math.round(b.def * r.mul * (1 + (ilvl - 1) * 0.06)),
    affixes, isNew: true, legend: rarity === 4 ? slotLegend('armor') : undefined, // v1.12 방어구 전설
    value: Math.round(b.price * r.mul * (1 + ilvl * 0.15) * (1 + affixes.length * 0.15)),
  };
}

function makeHelmet(key, ilvl, rarity) {
  const b = HELMETS[key], r = RARITIES[rarity];
  const affixes = rollAffixes('helmet', key, rarity, ilvl);
  return {
    id: nextItemId++, kind: 'helmet', key, rarity, ilvl: Math.max(ilvl, b.lvl), plus: 0,
    name: (rarity > 0 ? r.name + ' ' : '') + b.name,
    def: Math.round(b.def * r.mul * (1 + (ilvl - 1) * 0.06)),
    affixes, isNew: true, legend: rarity === 4 ? slotLegend('helmet') : undefined, // v1.12 헬멧 전설
    value: Math.round(b.price * r.mul * (1 + ilvl * 0.15) * (1 + affixes.length * 0.15)),
  };
}
function slotLegend(slot) { return pick(Object.keys(LEGENDARY).filter(k => LEGENDARY[k].slot === slot)); }

// v1.12 세트 조각: 그 세트의 부위 장비에 세트 표시 + 이름 앞에 세트 이름
function makeSetPiece(sid, slot, level, rarity) {
  const S = SETS[sid], it = makeGear(S.pieces[slot], level, Math.max(2, rarity));
  it.set = sid; it.name = `${it.rarity > 0 ? RARITIES[it.rarity].name + ' ' : ''}${S.name} ${GEAR_DEFS(it.key).name}`;
  it.value = Math.round(it.value * 1.4);
  return it;
}
// v1.12 보스 고유 장비: 전설 등급 · 전설 효과 대신 고유 효과
function makeUnique(uid, level) {
  const U = UNIQUES[uid], it = makeGear(U.key, Math.max(level, GEAR_DEFS(U.key).lvl), 4);
  it.unique = uid; it.legend = undefined; it.name = U.name; it.value = Math.round(it.value * 1.8);
  return it;
}
// 장착한 세트 조각 수 (무기는 주·보조 중 하나만 셈)
function setCount(p, sid) {
  if (!p || !p.equip) return 0;
  const e = p.equip;
  return ((e.w1 && e.w1.set === sid) || (e.w2 && e.w2.set === sid) ? 1 : 0) + (e.armor && e.armor.set === sid ? 1 : 0) + (e.helmet && e.helmet.set === sid ? 1 : 0);
}
const setOn = (sid, n) => setCount(G.player, sid) >= n;
// 방어구·헬멧 전설 / 고유 효과
function armorLegend(id) { const e = G.player && G.player.equip; return !!e && ((e.armor && e.armor.legend === id) || (e.helmet && e.helmet.legend === id)); }
function heldUnique(id) { const p = G.player, w = p && p.equip[p.active]; return !!(w && w.unique === id); }
function wornUnique(id) { const e = G.player && G.player.equip; return !!e && ((e.armor && e.armor.unique === id) || (e.helmet && e.helmet.unique === id)); }

const GEAR_DEFS = k => WEAPONS[k] || ARMORS[k] || HELMETS[k];
// v1.24 벨트: 등급(rarity)이 곧 핫바 칸 수
function makeBelt(tier, ilvl) {
  const b = BELTS[Math.max(0, Math.min(3, tier))], r = BELTS.indexOf(b), lv = Math.max(b.lvl, ilvl || b.lvl);
  const affixes = rollAffixes('belt', 'belt', r, lv); // v1.25 벨트 옵션 (등급만큼 0~3개)
  return { id: nextItemId++, kind: 'belt', key: 'belt', rarity: r, ilvl: lv, plus: 0, name: b.name, affixes, isNew: true, value: Math.round(b.price * (1 + affixes.length * 0.2)) };
}
function beltSlots(p) { const b = p.equip.belt; return Math.max(2, b ? BELTS[b.rarity].slots : 2); }
function makeGear(k, level, r) { return WEAPONS[k] ? makeWeapon(k, level, r) : ARMORS[k] ? makeArmor(k, level, r) : makeHelmet(k, level, r); }

// 구버전(v0.1) 세이브의 아이템을 현재 구조로 보정
function normalizeItem(it) {
  if (!it || it.kind === 'cons') return it;
  if (!Array.isArray(it.affixes)) it.affixes = [];
  if (!it.plus) it.plus = 0;
  return it;
}

function makeConsumable(key, count = 1) {
  const b = CONSUMABLES[key];
  return { id: nextItemId++, kind: 'cons', key, name: b.name, count, value: b.price };
}

// 레벨에 맞는 랜덤 장비
// bias: 지역 특산 장비 키 목록 (절반 확률로 이 중에서 고름)
function randomGear(level, rarityBonus = 0, minRarity = 0, bias = null) {
  const r = Math.max(minRarity, rollRarity(rarityBonus));
  // v1.12 세트: 출격 중 그 지역의 희귀 이상 장비 중 15%는 세트 조각
  if (r >= 2 && typeof World !== 'undefined' && World.map !== 'camp' && Math.random() < 0.15) {
    const z = World.zoneIndex(), sid = Object.keys(SETS).find(k => SETS[k].zones.includes(z));
    if (sid) { const slot = pick(['weapon', 'weapon', 'armor', 'helmet']), key = SETS[sid].pieces[slot]; if (GEAR_DEFS(key).lvl <= level + 2) return makeSetPiece(sid, slot, level, r); }
  }
  if (bias && Math.random() < 0.5) {
    const keys = bias.filter(k => GEAR_DEFS(k).lvl <= level + 2);
    if (keys.length) return makeGear(pick(keys), level, r);
  }
  if (Math.random() < 0.7) {
    const keys = Object.keys(WEAPONS).filter(k => WEAPONS[k].lvl <= level + 2);
    return makeWeapon(pick(keys), level, r);
  }
  if (Math.random() < 0.4) return makeHelmet(pick(Object.keys(HELMETS).filter(k => HELMETS[k].lvl <= level + 2)), level, r);
  const keys = Object.keys(ARMORS).filter(k => ARMORS[k].lvl <= level + 2);
  return makeArmor(pick(keys), level, r);
}

// 강화 단계가 반영된 이름 / 수치
function itemName(it) { return it.plus ? `+${it.plus} ${it.name}` : it.name; }
function plusMul(it) { return 1 + (it.plus || 0) * ENHANCE.step; }
function armorDef(arm) { return arm ? Math.round(arm.def * plusMul(arm)) : 0; }
function itemSellPrice(it) { return Math.max(1, Math.floor((it.value || 0) * ECON.sell * /* v1.25 0.3 → 0.2 */ (1 + (it.plus || 0) * 0.25))) * (it.count || 1); }

function enhanceCost(it) { return Math.round((20 + it.ilvl * 6) * Math.pow(it.plus + 1, 1.3) * (1 + it.rarity * 0.25) * Camp.enhanceMul()); } // v1.13 작업대
function enhanceRate(it) { return Math.min(1, ENHANCE.rates[it.plus] + (it.fails || 0) * ENHANCE.failBonus + Camp.enhanceBonus()); }

function itemReqLevel(it) {
  if (it.kind === 'weapon') return WEAPONS[it.key].lvl;
  if (it.kind === 'armor') return ARMORS[it.key].lvl;
  if (it.kind === 'helmet') return HELMETS[it.key].lvl;
  if (it.kind === 'belt') return BELTS[it.rarity].lvl;
  return 1;
}

function itemDesc(it) {
  if (it.kind === 'weapon') {
    const b = WEAPONS[it.key];
    let s = `피해 ${Math.round(it.dmg * plusMul(it) * 10) / 10}${b.pellets ? ' x' + b.pellets : ''} · 공격간격 ${b.rate}s`;
    s += b.melee ? ' · 근접' : ` · 탄창 ${b.mag} · 사거리 ${b.range}`;
    if (b.pierce) s += ' · 관통';
    return s + ` · 요구 Lv${b.lvl}`;
  }
  if (it.kind === 'armor') return `방어력 ${armorDef(it)} · 요구 Lv${ARMORS[it.key].lvl}`;
  if (it.kind === 'helmet') return `방어력 ${armorDef(it)}${HELMETS[it.key].radRes ? ` · 방사능 피해 -${HELMETS[it.key].radRes * 100}%` : ''} · 요구 Lv${HELMETS[it.key].lvl}`;
  if (it.kind === 'belt') return `핫바 ${BELTS[it.rarity].slots}칸 · 칸마다 스킬·구급상자·소모품 등록 · 요구 Lv${BELTS[it.rarity].lvl}`;
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
  if (it.unique) h += `<br><span class="unique">◈ 고유 (${UNIQUES[it.unique].boss}): ${UNIQUES[it.unique].desc}</span>`;
  if (it.set) { // 세트 효과 (장착 수에 따라 켜짐)
    const S = SETS[it.set], n = setCount(G.player, it.set);
    h += `<br><span class="setname" style="color:${S.color}">▣ ${S.name} 세트 (${n}/3)</span>`
      + `<br><span class="setb${n >= 2 ? ' on' : ''}">(2) ${S.b2}</span><br><span class="setb${n >= 3 ? ' on' : ''}">(3) ${S.b3}</span>`;
  }
  return h;
}

// ---------------- 플레이어 ----------------
function newPlayer(name) {
  const c = World.campCenter();
  return {
    name, x: c.x, y: c.y, r: 12, aim: 0, mapV: 4, mats: { scrap: 0, chip: 0 }, stash: [], raid: null, graves: {},
    level: 1, exp: 0, credits: 150, statPoints: 0, sp: 1, spV125: true, srank: {}, spV126: true, // v1.25 스킬 포인트
    stats: { str: 5, dex: 5, vit: 5, agi: 5 },
    hp: 1, ammo: Object.fromEntries(Object.entries(AMMO).map(([k, a]) => [k, a.start])), // v1.33 탄약 4종
    equip: { w1: makeWeapon('pistol', 1, 0), w2: makeWeapon('pipe', 1, 0), armor: null, helmet: null, belt: makeBelt(0) }, // v1.24 벨트 // 방어구 없이 시작 (첫 임무 보상·상점으로 획득)
    active: 'w1',
    inventory: [makeConsumable('medkit', 3), makeConsumable('ammo', 1)],
    quest: { ch: 0, step: 0, active: false, progress: 0 }, // v0.7 챕터
    skillCd: [0, 0, 0, 0, 0],
    hotbar: ['med', 'throw', null, null, null, null, null, null], // v1.24 벨트 칸에 등록한 것 (sk0~3 · med · throw · util)
    buffs: { rapid: 0, adren: 0, regen: 0, shield: 0 },
    perks: [], skillMods: {}, camp: {}, skills: {}, smodOwned: {}, stree: {}, passive: {}, skillsV120: true, // v1.16 배운 스킬 · 산 갈래 · v1.20 새 규칙 적용됨 // v1.13 캠프 시설 단계
    // v1.11 특성 (단계별 id) · 스킬 갈래 (스킬 id → 'a'|'b')
    atkT: 0, reloadT: 0, hurtT: 0, swingT: 0, dead: false,
    bossKills: 0, totalKills: 0, pity: 0, respecs: 0, found: [], radT: 0,
  };
}

// 장착 장비의 옵션 합계. 무기 옵션은 들고 있는 무기만, 방어구 옵션은 항상 적용
function gearBonus(p, k, w = p.equip[p.active]) {
  let v = 0;
  for (const arm of [p.equip.armor, p.equip.helmet, p.equip.belt]) if (arm && arm.affixes) for (const a of arm.affixes) if (a.k === k) v += a.v; // v1.25 벨트 옵션도
  if (w && w.affixes) for (const a of w.affixes) if (a.k === k) v += a.v;
  return v;
}
function hasLegend(p, id) { const w = p.equip[p.active]; return !!(w && w.legend === id); }

// 스탯 설계 (기본값 5에서 올린 만큼 효과)
//  근력: 근접 피해 +6%, 방어력 +1   → 근접형, 맞으면서 싸움
//  사격: 총기 피해 +4%, 재장전 +1.5% → 총잡이
//  체력: 최대 체력 +15, 재생 +0.25/초 → 생존형
//  민첩: 이동·공격속도 +0.8%, 치명타 +0.8% → 기동형
// v1.11 특성 · 스킬 갈래 확인
const perk = id => !!(G.player && G.player.perks && G.player.perks.includes(id));
const pas = id => !!(G.player && G.player.passive && G.player.passive[id]); // v1.23 패시브 트리 단련
const branchOn = b => !!(G.player && G.player.perks && G.player.perks.filter(id => id && PERK_BRANCH[id] === b).length >= 3); // 같은 갈래 특성 3개 → 갈래 보너스
const smod = sid => (G.player && G.player.skillMods && G.player.skillMods[sid]) || null;
const PlayerStats = {
  maxHp: p => Math.round((100 + p.stats.vit * 15 + p.level * 10) * (1 + gearBonus(p, 'hp')) * (perk('thickSkin') ? 1.12 : 1) * (pas('s1') ? 1.05 : 1) * (branchOn('sur') ? 1.1 : 1) * (setOn('rad', 2) ? 1.08 : 1) * Camp.raidHpMul()),
  def: p => Math.round((armorDef(p.equip.armor) + armorDef(p.equip.helmet) + Math.max(0, p.stats.str - 5)) * (setOn('steel', 2) ? 1.15 : 1) * (pas('s2') ? 1.08 : 1)),
  dmgReduce: p => { const d = PlayerStats.def(p); return d / (d + 40 + 8 * p.level); }, // v1.0: 고레벨일수록 같은 방어력의 효과 감소 (Lv5 기존과 동일)
  gunMul: p => (1 + (p.stats.dex - 5) * 0.04) * (pas('a2') ? 1.06 : 1),
  meleeMul: p => (1 + (p.stats.str - 5) * 0.06) * (pas('a1') ? 1.06 : 1),
  crit: (p, w) => 0.05 + (p.stats.agi - 5) * 0.008 + gearBonus(p, 'crit', w) + (p.buffs.rapid > 0 && smod('rapid') === 'a' ? 0.25 : 0) + (setOn('blacksun', 2) ? 0.08 : 0) + (pas('a3') ? 0.03 : 0),
  critMul: (p, w) => ((w && WEAPONS[w.key].critMul) || 1.8) + gearBonus(p, 'critDmg', w) + (armorLegend('hunterEye') ? 0.35 : 0) + ((p.bsT || 0) > G.time ? 0.5 : 0) + (pas('a4') ? 0.15 : 0),
  agiMul: p => Math.min(0.3, (p.stats.agi - 5) * 0.008),
  speed: p => {
    const w = p.equip[p.active];
    return 88 /* v1.30 175 → 150 · v1.32 → 125 · v1.33 → 88 (-30% · 초속 약 4.4m) */ * (1 + PlayerStats.agiMul(p) + gearBonus(p, 'move')) * (w ? WEAPONS[w.key].move || 1 : 1) * (p.buffs.adren > 0 ? 1.35 : 1) * (perk('runner') ? 1.08 : 1) * (pas('t4') ? 1.04 : 1) * (setOn('vigil', 2) ? 1.06 : 1) * (p.buffs.stim > 0 ? 1.2 : 1) * (wornUnique('shade') && G.time - ((p.lastRoll || -9) + 0.28) < 1.5 ? 1.4 : 1);
  },
  // 공격 간격 배율 (작을수록 빠름)
  rateMul: (p, w) => (p.buffs.rapid > 0 ? (smod('rapid') === 'a' ? 0.67 : 0.5) : 1) / (1 + PlayerStats.agiMul(p) * 0.75 + gearBonus(p, 'rate', w)) / (perk('killStreak') && (G.combo || 0) >= 5 && G.time - (G.comboT || -9) < 3 ? 1.15 : 1) / ((p.vigilT || 0) > G.time ? 1.15 : 1) / (p.buffs.stim > 0 ? 1.15 : 1),
  reloadMul: (p, w) => (p.buffs.adren > 0 ? 0.7 : 1) / (1 + Math.max(0, p.stats.dex - 5) * 0.015 + gearBonus(p, 'reload', w)) / (perk('bulletStorm') ? 1.2 : 1) / (pas('t1') ? 1.1 : 1),
  regen: p => Math.max(0, p.stats.vit - 5) * 0.25 + (pas('s3') ? 1 : 0) + gearBonus(p, 'regen') + (armorLegend('filter') ? 2 : 0) + (wornUnique('chimera') ? (p.hp < PlayerStats.maxHp(p) * 0.5 ? 9 : 3) : 0),
  expMul: p => 1 + gearBonus(p, 'exp') + (pas('t5') ? 0.05 : 0),
  // v1.0: 처치 템포(v0.16)에 맞춰 상향 (45·lvl^1.65 → 70·lvl²)
  // v1.7: 밸런스 봇 측정 결과 Lv30까지 너무 빠름 → Lv5부터 점점 더 많이 (Lv10 ×1.65 · Lv20 ×2.4 · Lv30 ×3.0)
  expNext: lvl => Math.floor(70 * lvl * lvl * Math.max(1, Math.pow(lvl / 4, 0.55)) * (lvl >= 3 ? 1.5 : 1)), // v1.25 Lv3부터 ×1.5
};

// 스킬 수치: 각 스킬은 연동 능력치 하나를 따라 강해짐
const STAT_NAMES = { str: '근력', dex: '사격', vit: '체력', agi: '민첩' };
const statUp = (p, k) => Math.max(0, p.stats[k] - 5);
const SkillCalc = {
  rapidDur: p => (4 + Math.min(4, statUp(p, 'agi') * 0.1) + (stree('rapid', 'r1') ? 1.5 : 0)) * (smod('rapid') === 'b' ? 0.75 : 1) * rankMul('rapid'),
  grenadeR: p => (110 + Math.min(50, statUp(p, 'dex') * 2)) * (perk('demolition') ? 1.3 : 1) * (stree('grenade', 'r1') ? 1.15 : 1),
  grenadeDmg: p => (30 + p.level * 6) * (1 + (PlayerStats.gunMul(p) - 1) * 0.5) * rankMul('grenade'), // v1.16 너프: 45+레벨×9 · 사격 능력치 전부 → 30+레벨×6 · 절반만
  healPct: p => Math.min(0.6, 0.35 + statUp(p, 'vit') * 0.006) * rankMul('heal') + (stree('heal', 'r1') ? 0.1 : 0),
  adrenDur: p => 8 + (stree('adren', 'r1') ? 2 : 0), // v1.22
  turretDmg: p => (6 + p.level * 2.4) * (1 + (PlayerStats.gunMul(p) - 1) * 0.5) * Camp.dmgMul() * rankMul('turret'), // v1.26 포탑 한 발
  turretDur: p => 14 + (stree('turret', 'r1') ? 6 : 0),
  cdMul: id => (1 - gearBonus(G.player, 'cdr')) * (stree(id, 'r2') ? 0.85 : 1) * (pas('t3') ? 0.94 : 1) * (branchOn('tac') ? 0.9 : 1), // v1.22 숙달 · v1.23 전술 단련·갈래 보너스
  adrenDmg: p => Math.min(0.6, 0.3 + statUp(p, 'str') * 0.01) * (smod('adren') === 'b' ? 0.5 : 1) * rankMul('adren'),
};
const srank = id => { const p = G.player; return p && p.skills && p.skills[id] ? Math.max(1, (p.srank && p.srank[id]) || 1) : 0; }; // v1.26 스킬 등급
const rankMul = id => 1 + RANK_BONUS * Math.max(0, srank(id) - 1);
function spSpent(p) { // 쓴 스킬 포인트 (등급 + 트리 노드)
  let n = 0;
  for (const s of SKILLS) { if (p.skills[s.id]) n += Math.max(1, (p.srank && p.srank[s.id]) || 1) * SKILL_SP.root; for (const k of ['a', 'b']) if (p.smodOwned[s.id + '_' + k]) n += SKILL_SP[k]; for (const k of ['r1', 'r2', 'cap']) if (p.stree && p.stree[s.id + '_' + k]) n += SKILL_SP[k]; }
  return n;
}
const stree = (id, k) => !!(G.player && G.player.stree && G.player.stree[id + '_' + k]); // v1.22 스킬 트리
function skillDesc(s, p) {
  const m = smod(s.id), base = skillBaseDesc(s, p);
  return m ? `<b class="r2">[${SKILL_MODS[s.id][m].name}]</b> ${base} · ${SKILL_MODS[s.id][m].desc}` : base;
}
function skillBaseDesc(s, p) {
  const pc = v => Math.round(v * 100) + '%';
  switch (s.id) {
    case 'rapid': return `${SkillCalc.rapidDur(p).toFixed(1)}초간 공격 속도 2배`;
    case 'grenade': return `반경 ${SkillCalc.grenadeR(p)} 폭발, 피해 ${Math.round(SkillCalc.grenadeDmg(p))}`;
    case 'heal': return `즉시 최대 체력 ${pc(SkillCalc.healPct(p))} 회복`;
    case 'turret': return `${SkillCalc.turretDur(p)}초 동안 자동 포탑 (한 발 ${Math.round(SkillCalc.turretDmg(p))} · 사거리 ${TURRET.range}) · 커서 근처에 설치`;
    case 'adren': return `${SkillCalc.adrenDur(p)}초간 이동속도 +35%, 피해 +${pc(SkillCalc.adrenDmg(p))}, 재장전 +30%`;
  }
  return '';
}

// 능력치 초기화 비용 (첫 1회 무료)
function respecCost(p) { return p.respecs ? p.level * 80 : 0; }

// 계열 전용 옵션이 반영된 무기 수치
function pelletCount(w) { return (WEAPONS[w.key].pellets || 1) + gearBonus(G.player, 'pellets', w) + (w.unique === 'viper' ? 3 : 0); }
function meleeReach(w) { const b = WEAPONS[w.key], r = gearBonus(G.player, 'reach', w) + (w.unique === 'babel' ? 0.3 : 0); return { range: b.range * (1 + r), arc: b.arc * (1 + r) }; }

function magSize(w) { const b = WEAPONS[w.key]; return Math.round(b.mag * (1 + gearBonus(G.player, 'mag', w)) * (perk('bulletStorm') ? 1.3 : 1)); }
function weaponDmg(w) { return w.dmg * plusMul(w) * (1 + gearBonus(G.player, 'dmg', w)); }

// 현재 능력치 기준 무기의 실제 초당 피해 (재장전 시간 포함). 장비 비교와 HUD에 사용
function weaponDps(p, w) {
  if (!w) return 0;
  const b = WEAPONS[w.key];
  const mul = (b.melee ? PlayerStats.meleeMul(p) : PlayerStats.gunMul(p)) * plusMul(w) * (1 + gearBonus(p, 'dmg', w));
  const cc = Math.min(1, PlayerStats.crit(p, w));
  const interval = b.rate * (p.buffs.rapid > 0 ? 2 : 1) * PlayerStats.rateMul(p, w);
  let dps = w.dmg * ((b.pellets || 1) + gearBonus(p, 'pellets', w)) * mul * (1 + cc * (PlayerStats.critMul(p, w) - 1)) / interval;
  if (!b.melee) {
    const mag = Math.round(b.mag * (1 + gearBonus(p, 'mag', w)));
    const rl = b.reload / (1 + Math.max(0, p.stats.dex - 5) * 0.015 + gearBonus(p, 'reload', w));
    dps *= (mag * interval) / (mag * interval + rl);
  }
  if (b.melee && MELEE_FINISH[w.key]) { // v1.9 3타 콤보를 이어 휘두른다고 가정
    const F = MELEE_FINISH[w.key], C = MELEE_COMBO;
    dps *= (2 * C.dmg + F.dmg) / (2 * C.rate + F.rate);
  }
  if (w.legend === 'boom') dps *= 1.1;
  return dps;
}

// 방어구·헬멧 가치: 버틸 수 있는 실질 체력. it 을 그 칸에 장착했다고 가정 (null/생략 = 현재 장비)
function armorEhp(p, it) {
  const base = (100 + p.stats.vit * 15 + p.level * 10);
  const arm = it && it.kind === 'armor' ? it : p.equip.armor, hel = it && it.kind === 'helmet' ? it : p.equip.helmet;
  let hp = 0;
  for (const g of [arm, hel]) if (g) for (const a of g.affixes || []) if (a.k === 'hp') hp += a.v;
  const def = armorDef(arm) + armorDef(hel) + Math.max(0, p.stats.str - 5);
  return base * (1 + hp) / (1 - def / (def + 40 + 8 * p.level)); // PlayerStats.dmgReduce 와 같은 식
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
  if (it.kind === 'belt') { const cur = p.equip.belt; return BELTS[it.rarity].slots > beltSlots(p) || (!!cur && it.rarity === cur.rarity && it.affixes.length > cur.affixes.length); } // v1.24 · v1.25 옵션
  if (it.kind === 'armor' || it.kind === 'helmet') {
    const cur = p.equip[it.kind];
    return armorEhp(p, it) > armorEhp(p) * 1.02 || (!!cur && it.affixes.length > cur.affixes.length && armorDef(it) >= armorDef(cur));
  }
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
    speed: d.speed * ENEMY_SPEED * rand(0.92, 1.08), // v1.32 적 이동 전체 ×0.85 (플레이어 감속만큼)
    atkT: rand(0, 1), fireT: rand(0.5, 1.5), state: 'idle', stunT: 0,
    wanderA: rand(0, TAU), wanderT: 0, hitT: 0, stuckT: 0, sideDir: Math.random() < 0.5 ? 1 : -1,
    bossT1: 3, bossT2: 7, bossT3: 5, charge: 0, chargeA: 0,
  };
}

// v1.33 탄약 4종 도우미
function ammoOf(w) { return w && WEAPONS[w.key] && WEAPONS[w.key].ammo || null; }
function gunAmmoTypes(p) { return [...new Set(['w1', 'w2'].map(k => ammoOf(p.equip[k])).filter(Boolean))]; }
function addAmmo(p, t, n) { p.ammo[t] = (p.ammo[t] || 0) + Math.max(1, Math.round(n)); return Math.max(1, Math.round(n)); }
// 기관총탄 u발어치를 들고 있는 총(없으면 장착한 총, 그것도 없으면 권총탄)에 맞춰 줌
function giveAmmoUnits(p, u, t) { t = t || ammoOf(curWeapon()) || gunAmmoTypes(p)[0] || 'pistol'; return [t, addAmmo(p, t, u * AMMO[t].k)]; }
