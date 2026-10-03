// 게임 데이터 정의
const TILE = 32;

const GAME_VERSION = 'v0.5.1';

const RARITIES = [
  { name: '일반', mul: 1.0, color: '#dddddd', weight: 56 },
  { name: '고급', mul: 1.15, color: '#6fdc6f', weight: 27 },
  { name: '희귀', mul: 1.35, color: '#5aa8ff', weight: 11 },
  { name: '영웅', mul: 1.6, color: '#c77dff', weight: 4.5 },
  { name: '전설', mul: 2.0, color: '#ffa53a', weight: 1.0 },
];
// 천장: 몬스터 장비 드랍이 이 횟수만큼 영웅 미만이면 다음 드랍은 영웅 이상 확정
const PITY_DROPS = 50;

// 무기 기본 정보
// range: 사거리(px) · knock: 넉백 · stagger: 경직(초) · move: 장착 시 이동속도 배율
// role: 플레이어에게 보여줄 무기 성격 한 줄
const WEAPONS = {
  pipe:    { name: '쇠파이프',      icon: '🔧', melee: true, dmg: 18, rate: 0.40, range: 62, arc: 1.3, knock: 16, stagger: 0.25, move: 1.08, lvl: 1, price: 60,
             role: '빠른 연타 · 탄약 불필요' },
  pistol:  { name: 'M1911 권총',    icon: '🔫', dmg: 14, rate: 0.26, mag: 12, reload: 1.0, spread: 0.03, speed: 950, range: 520, knock: 6, stagger: 0.05, move: 1.05,
             infinite: true, lvl: 1, price: 80, role: '탄약 무한 · 언제나 믿을 수 있는 보조무기' },
  axe:     { name: '소방 도끼',     icon: '🪓', melee: true, dmg: 44, rate: 0.8, range: 72, arc: 2.1, knock: 42, stagger: 0.7, move: 0.98, lvl: 4, price: 220,
             role: '느리지만 넓은 일격 · 여러 적을 밀치고 경직' },
  smg:     { name: 'MP5 기관단총',  icon: '🔫', dmg: 9, rate: 0.075, mag: 32, reload: 1.5, spread: 0.11, speed: 900, range: 380, falloff: true, knock: 3, stagger: 0, move: 1.08,
             lvl: 3, price: 260, role: '근거리 순간 화력 · 이동하며 난사' },
  shotgun: { name: 'M870 산탄총',   icon: '🔫', dmg: 10, pellets: 7, rate: 0.8, mag: 6, reload: 2.2, spread: 0.3, speed: 800, range: 260, falloff: true, knock: 9, stagger: 0.3, move: 1.0,
             lvl: 5, price: 380, role: '근거리 폭발력 · 맞은 적을 크게 밀쳐냄' },
  rifle:   { name: 'K2 돌격소총',   icon: '🔫', dmg: 17, rate: 0.11, mag: 30, reload: 1.8, spread: 0.04, speed: 1100, range: 620, knock: 4, stagger: 0.05, move: 1.0,
             lvl: 8, price: 620, role: '안정적인 중거리 지속 화력' },
  katana:  { name: '고주파 블레이드', icon: '🗡️', melee: true, dmg: 60, rate: 0.38, range: 92, arc: 1.5, knock: 12, stagger: 0.2, move: 1.12, lvl: 11, price: 900,
             role: '빠르고 긴 칼날 · 가장 빠른 이동' },
  sniper:  { name: 'K14 저격소총',  icon: '🎯', dmg: 120, rate: 1.2, mag: 5, reload: 2.4, spread: 0.003, speed: 1600, range: 950, pierce: 3, knock: 22, stagger: 0.8, critMul: 2.6, move: 0.9,
             lvl: 12, price: 1100, role: '장거리 일격 · 관통 · 치명타 x2.6' },
  lmg:     { name: 'K3 기관총',     icon: '🔫', dmg: 15, rate: 0.07, mag: 100, reload: 4.0, spread: 0.09, speed: 1050, range: 560, knock: 3, stagger: 0.03, move: 0.8,
             lvl: 16, price: 1800, role: '압도적 지속 화력 · 무겁고 탄약 소모 큼' },
};

// 장비 추가 옵션 (v0.2). pct: 퍼센트 표시 · slot: weapon(모든 무기) / gun(총기만) / armor
const AFFIXES = {
  dmg:     { name: '공격력',      slot: 'weapon', min: 0.05, max: 0.15, pct: true },
  rate:    { name: '공격 속도',   slot: 'weapon', min: 0.04, max: 0.12, pct: true },
  crit:    { name: '치명타 확률', slot: 'weapon', min: 0.02, max: 0.06, pct: true },
  critDmg: { name: '치명타 피해', slot: 'weapon', min: 0.15, max: 0.40, pct: true },
  mag:     { name: '탄창 용량',   slot: 'gun',    min: 0.15, max: 0.40, pct: true },
  reload:  { name: '재장전 속도', slot: 'gun',    min: 0.10, max: 0.25, pct: true },
  // 무기 계열 전용 (v0.4 장비 2.0 마무리): weapons 에 적힌 무기에만 붙음
  pellets: { name: '산탄 펠릿',   slot: 'weapon', min: 1, max: 3, int: true, unit: '발', weapons: ['shotgun'] },
  pierce:  { name: '관통',        slot: 'weapon', min: 1, max: 2, int: true, unit: '명', weapons: ['sniper'] },
  reach:   { name: '공격 범위',   slot: 'weapon', min: 0.10, max: 0.25, pct: true, weapons: ['pipe', 'axe', 'katana'] },
  accuracy:{ name: '정확도',      slot: 'weapon', min: 0.15, max: 0.35, pct: true, weapons: ['pistol', 'smg', 'rifle', 'lmg'] },
  hp:      { name: '최대 체력',   slot: 'armor',  min: 0.05, max: 0.15, pct: true },
  move:    { name: '이동 속도',   slot: 'armor',  min: 0.03, max: 0.08, pct: true },
  regen:   { name: '체력 재생',   slot: 'armor',  min: 1, max: 3, perLvl: 0.15, unit: '/초' },
  exp:     { name: '경험치 획득', slot: 'armor',  min: 0.05, max: 0.15, pct: true },
};

// 전설 무기 고유 효과 (무기를 들고 있을 때만 발동)
const LEGENDARY = {
  boom:    { name: '폭발탄',    desc: '명중 시 20% 확률로 소형 폭발' },
  leech:   { name: '흡혈',      desc: '입힌 피해의 4%만큼 체력 회복' },
  execute: { name: '처형자',    desc: '체력 30% 이하의 적에게 피해 +60%' },
  thrift:  { name: '보급 장인', desc: '35% 확률로 탄약을 소모하지 않음', gun: true },
  quickload: { name: '속사 장전', desc: '적을 처치하면 탄창이 즉시 가득 참', gun: true },
  chain:   { name: '연쇄 타격', desc: '치명타가 근처 적 1명에게 50% 피해로 튐' },
};

// 장비 강화 (v0.5). rates[현재 단계] = 성공 확률
// 실패 시 dropFrom 단계 이상이면 -1, 실패할 때마다 해당 아이템 다음 확률 +failBonus. 파괴 없음
const ENHANCE = {
  max: 10, step: 0.08, dropFrom: 7, failBonus: 0.05,
  rates: [1, 1, 1, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25],
};

// 등급별 추가 옵션 개수
const AFFIX_COUNT = { weapon: [0, 1, 2, 3, 3], armor: [0, 1, 2, 3, 4] };

const ARMORS = {
  vest:     { name: '방탄 조끼',     icon: '🦺', def: 8, lvl: 1, price: 120 },
  tactical: { name: '전술 조끼',     icon: '🦺', def: 16, lvl: 5, price: 420 },
  military: { name: '군용 강화복',   icon: '🛡️', def: 28, lvl: 10, price: 950 },
  exo:      { name: '외골격 슈트',   icon: '🤖', def: 45, lvl: 16, price: 2000 },
};

const CONSUMABLES = {
  medkit: { name: '구급상자', icon: '💊', desc: '최대 체력의 40% 회복', price: 40, stack: 20 },
  ammo:   { name: '탄약 상자', icon: '📦', desc: '예비 탄약 +120', price: 45, stack: 20 },
};

// 적 정의
const ENEMIES = {
  zombie: { name: '감염자',   hp: 40,  dmg: 8,  speed: 68,  r: 12, exp: 10, weight: 1, color: '#6b8f4e', atkCd: 1.0, aggro: 360 },
  dog:    { name: '변이견',   hp: 26,  dmg: 6,  speed: 155, r: 10, exp: 12, weight: 0.7, color: '#8a5a3c', atkCd: 0.7, aggro: 420 },
  raider: { name: '약탈자',   hp: 50,  dmg: 7,  speed: 92,  r: 12, exp: 18, weight: 1, color: '#b5523b', atkCd: 1.0, aggro: 460,
            ranged: true, range: 320, fireCd: 1.2, bulletSpeed: 430 },
  brute:  { name: '변이 거한', hp: 190, dmg: 22, speed: 56,  r: 20, exp: 45, weight: 2.5, color: '#7a4f8a', atkCd: 1.5, aggro: 360 },
  drone:  { name: '경비 드론', hp: 60,  dmg: 9,  speed: 115, r: 11, exp: 26, weight: 0.8, color: '#8fa3b8', atkCd: 1.0, aggro: 440,
            ranged: true, range: 290, fireCd: 0.9, bulletSpeed: 480, flying: true },
  boss:   { name: '방사능 군주 타이탄', hp: 5200, dmg: 40, speed: 75, r: 36, exp: 6000, weight: 0, color: '#3fbf5a', atkCd: 1.2, aggro: 700, boss: true },
};

// 지역 (캠프 중심으로부터 타일 거리)
const ZONES = [
  { name: '시청역 생존자 캠프', maxDist: 12, lvl: [0, 0], dark: 0.25, tint: null, spawns: [] },
  { name: '명동 잔해', maxDist: 34, lvl: [1, 4], dark: 0.32, tint: null,
    spawns: [['zombie', 70], ['dog', 30]] },
  { name: '종로 폐허', maxDist: 54, lvl: [5, 9], dark: 0.42, tint: null,
    spawns: [['zombie', 35], ['dog', 25], ['raider', 40]] },
  { name: '용산 군사구역', maxDist: 72, lvl: [10, 15], dark: 0.52, tint: 'rgba(40,20,10,0.12)',
    spawns: [['raider', 35], ['brute', 25], ['drone', 25], ['dog', 15]] },
  { name: '여의도 방사능 지대', maxDist: 999, lvl: [16, 20], dark: 0.6, tint: 'rgba(40,120,30,0.12)',
    spawns: [['brute', 30], ['drone', 30], ['raider', 20], ['zombie', 20]] },
];

const SKILLS = [
// stat: 스킬을 강화하는 능력치 (v0.3)
  { id: 'rapid',   name: '집중 사격', icon: '⚡', lvl: 1,  cd: 14, stat: 'agi' },
  { id: 'grenade', name: '수류탄',   icon: '💣', lvl: 3,  cd: 8,  stat: 'dex' },
  { id: 'heal',    name: '응급 처치', icon: '✚',  lvl: 6,  cd: 22, stat: 'vit' },
  { id: 'adren',   name: '아드레날린', icon: '🔥', lvl: 10, cd: 40, stat: 'str' },
];

const QUESTS = [
  { title: '첫 번째 사냥', target: 'zombie', count: 8, minLevel: 1,
    text: '캠프 바깥 명동 잔해에 감염자들이 몰려들고 있다. 8마리만 정리해 주게.',
    reward: { exp: 90, credits: 150, items: [['medkit', 2]] } },
  { title: '굶주린 사냥개', target: 'dog', count: 8, minLevel: 2,
    text: '변이견 무리가 보급조를 습격했어. 놈들을 8마리 처치해 주게.',
    reward: { exp: 220, credits: 300, items: [['ammo', 3]] } },
  { title: '약탈자 소탕', target: 'raider', count: 10, minLevel: 5,
    text: '종로 쪽 약탈자들이 우리 물자를 노리고 있다. 본때를 보여주게.',
    reward: { exp: 900, credits: 700, gear: 2 } },
  { title: '거인의 발소리', target: 'brute', count: 6, minLevel: 10,
    text: '용산에서 변이 거한이 목격됐다. 놈들이 캠프까지 오기 전에 막아야 해.',
    reward: { exp: 3500, credits: 1500, gear: 2 } },
  { title: '기계의 눈', target: 'drone', count: 12, minLevel: 12,
    text: '옛 군의 경비 드론들이 아직도 작동 중이다. 12기를 격추해 주게.',
    reward: { exp: 6000, credits: 2500, gear: 3 } },
  { title: '방사능 지대의 왕', target: 'boss', count: 1, minLevel: 16,
    text: '여의도 방사능 지대의 군주 타이탄... 놈만 쓰러뜨리면 서울에 희망이 생긴다.',
    reward: { exp: 20000, credits: 10000, gear: 4 } },
];
