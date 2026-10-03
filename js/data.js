// 게임 데이터 정의
const TILE = 32;

const RARITIES = [
  { name: '일반', mul: 1.0, color: '#dddddd', weight: 60 },
  { name: '고급', mul: 1.15, color: '#6fdc6f', weight: 25 },
  { name: '희귀', mul: 1.35, color: '#5aa8ff', weight: 10 },
  { name: '영웅', mul: 1.6, color: '#c77dff', weight: 4 },
  { name: '전설', mul: 2.0, color: '#ffa53a', weight: 1 },
];

// 무기 기본 정보
const WEAPONS = {
  pipe:    { name: '쇠파이프',      icon: '🔧', melee: true, dmg: 18, rate: 0.45, range: 60, arc: 1.2, lvl: 1, price: 60 },
  pistol:  { name: 'M1911 권총',    icon: '🔫', dmg: 14, rate: 0.28, mag: 12, reload: 1.2, spread: 0.04, speed: 950, lvl: 1, price: 80 },
  axe:     { name: '소방 도끼',     icon: '🪓', melee: true, dmg: 38, rate: 0.75, range: 70, arc: 1.4, lvl: 4, price: 220 },
  smg:     { name: 'MP5 기관단총',  icon: '🔫', dmg: 9, rate: 0.085, mag: 30, reload: 1.6, spread: 0.09, speed: 900, lvl: 3, price: 260 },
  shotgun: { name: 'M870 산탄총',   icon: '🔫', dmg: 9, pellets: 7, rate: 0.8, mag: 6, reload: 2.2, spread: 0.26, speed: 800, lvl: 5, price: 380 },
  rifle:   { name: 'K2 돌격소총',   icon: '🔫', dmg: 17, rate: 0.11, mag: 30, reload: 1.8, spread: 0.05, speed: 1100, lvl: 8, price: 620 },
  katana:  { name: '고주파 블레이드', icon: '🗡️', melee: true, dmg: 70, rate: 0.5, range: 80, arc: 1.6, lvl: 11, price: 900 },
  sniper:  { name: 'K14 저격소총',  icon: '🎯', dmg: 110, rate: 1.25, mag: 5, reload: 2.5, spread: 0.004, speed: 1600, pierce: 3, lvl: 12, price: 1100 },
  lmg:     { name: 'K3 기관총',     icon: '🔫', dmg: 15, rate: 0.07, mag: 100, reload: 4.0, spread: 0.08, speed: 1050, lvl: 16, price: 1800 },
};

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
  zombie: { name: '감염자',   hp: 40,  dmg: 8,  speed: 68,  r: 12, exp: 10, color: '#6b8f4e', atkCd: 1.0, aggro: 360 },
  dog:    { name: '변이견',   hp: 26,  dmg: 6,  speed: 155, r: 10, exp: 12, color: '#8a5a3c', atkCd: 0.7, aggro: 420 },
  raider: { name: '약탈자',   hp: 50,  dmg: 7,  speed: 92,  r: 12, exp: 18, color: '#b5523b', atkCd: 1.0, aggro: 460,
            ranged: true, range: 320, fireCd: 1.2, bulletSpeed: 430 },
  brute:  { name: '변이 거한', hp: 190, dmg: 22, speed: 56,  r: 20, exp: 45, color: '#7a4f8a', atkCd: 1.5, aggro: 360 },
  drone:  { name: '경비 드론', hp: 60,  dmg: 9,  speed: 115, r: 11, exp: 26, color: '#8fa3b8', atkCd: 1.0, aggro: 440,
            ranged: true, range: 290, fireCd: 0.9, bulletSpeed: 480, flying: true },
  boss:   { name: '방사능 군주 타이탄', hp: 5200, dmg: 40, speed: 75, r: 36, exp: 6000, color: '#3fbf5a', atkCd: 1.2, aggro: 700, boss: true },
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
  { id: 'rapid',   name: '집중 사격', icon: '⚡', lvl: 1,  cd: 14, desc: '4초간 공격 속도 2배' },
  { id: 'grenade', name: '수류탄',   icon: '💣', lvl: 3,  cd: 8,  desc: '마우스 위치에 폭발 피해' },
  { id: 'heal',    name: '응급 처치', icon: '✚',  lvl: 6,  cd: 22, desc: '즉시 최대 체력 35% 회복' },
  { id: 'adren',   name: '아드레날린', icon: '🔥', lvl: 10, cd: 40, desc: '8초간 이동속도 +35%, 피해 +30%' },
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
