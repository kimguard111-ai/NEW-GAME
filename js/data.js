// 게임 데이터 정의
const TILE = 32;

const GAME_VERSION = 'v1.7.1';
const MAX_LEVEL = 30; // 레벨 상한 (본편 Lv20 + 위협 등급 어설트)

const RARITIES = [
  { name: '일반', mul: 1.0, color: '#dddddd', weight: 56 },
  { name: '고급', mul: 1.15, color: '#6fdc6f', weight: 27 },
  { name: '희귀', mul: 1.35, color: '#5aa8ff', weight: 11 },
  { name: '영웅', mul: 1.6, color: '#c77dff', weight: 4.5 },
  { name: '전설', mul: 2.0, color: '#ffa53a', weight: 1.0 },
];
// 천장: 몬스터 장비 드랍이 이 횟수만큼 영웅 미만이면 다음 드랍은 영웅 이상 확정
const PITY_DROPS = 15; // v0.10 드랍률 하향에 맞춰 50 → 35 · v1.5.1 → 25 · v1.7.1 → 15 (드랍이 더 귀해진 만큼)

// 무기 기본 정보
// range: 사거리(px) · knock: 넉백 · stagger: 경직(초) · move: 장착 시 이동속도 배율
// role: 플레이어에게 보여줄 무기 성격 한 줄
const WEAPONS = {
  pipe:    { name: '쇠파이프',      icon: 'pipe', melee: true, dmg: 18, rate: 0.40, range: 62, arc: 1.3, knock: 16, stagger: 0.25, move: 1.08, lvl: 1, price: 60,
             role: '빠른 연타 · 탄약 불필요' },
  pistol:  { name: 'M1911 권총',    icon: 'pistol', dmg: 14, rate: 0.26, mag: 12, reload: 1.0, spread: 0.03, speed: 950, range: 520, knock: 6, stagger: 0.05, move: 1.05,
             infinite: true, lvl: 1, price: 80, role: '탄약 무한 · 언제나 믿을 수 있는 보조무기' },
  axe:     { name: '소방 도끼',     icon: 'axe', melee: true, dmg: 44, rate: 0.8, range: 72, arc: 2.1, knock: 42, stagger: 0.7, move: 0.98, lvl: 4, price: 220,
             role: '느리지만 넓은 일격 · 여러 적을 밀치고 경직' },
  smg:     { name: 'MP5 기관단총',  icon: 'smg', dmg: 9, rate: 0.075, mag: 32, reload: 1.5, spread: 0.11, speed: 900, range: 380, falloff: true, knock: 3, stagger: 0, move: 1.08,
             lvl: 3, price: 260, role: '근거리 순간 화력 · 이동하며 난사' },
  shotgun: { name: 'M870 산탄총',   icon: 'shotgun', dmg: 10, pellets: 7, rate: 0.8, mag: 6, reload: 2.2, spread: 0.3, speed: 800, range: 260, falloff: true, knock: 9, stagger: 0.3, move: 1.0,
             lvl: 5, price: 380, role: '근거리 폭발력 · 맞은 적을 크게 밀쳐냄' },
  rifle:   { name: 'K2 돌격소총',   icon: 'rifle', dmg: 17, rate: 0.11, mag: 30, reload: 1.8, spread: 0.04, speed: 1100, range: 620, knock: 4, stagger: 0.05, move: 1.0,
             lvl: 8, price: 620, role: '안정적인 중거리 지속 화력' },
  katana:  { name: '고주파 블레이드', icon: 'katana', melee: true, dmg: 60, rate: 0.38, range: 92, arc: 1.5, knock: 12, stagger: 0.2, move: 1.12, lvl: 11, price: 900,
             role: '빠르고 긴 칼날 · 가장 빠른 이동' },
  sniper:  { name: 'K14 저격소총',  icon: 'sniper', dmg: 120, rate: 1.2, mag: 5, reload: 2.4, spread: 0.003, speed: 1600, range: 950, pierce: 3, knock: 22, stagger: 0.8, critMul: 2.6, move: 0.9,
             lvl: 12, price: 1100, role: '장거리 일격 · 관통 · 치명타 x2.6' },
  lmg:     { name: 'K3 기관총',     icon: 'lmg', dmg: 15, rate: 0.07, mag: 100, reload: 4.0, spread: 0.09, speed: 1050, range: 560, knock: 3, stagger: 0.03, move: 0.8,
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
const AFFIX_COUNT = { weapon: [0, 1, 2, 3, 3], armor: [0, 1, 2, 3, 4], helmet: [0, 1, 2, 3, 4] };

const ARMORS = {
  vest:     { name: '방탄 조끼',     icon: 'vest', def: 8, lvl: 1, price: 120 },
  tactical: { name: '전술 조끼',     icon: 'tactical', def: 16, lvl: 5, price: 420 },
  military: { name: '군용 강화복',   icon: 'military', def: 28, lvl: 10, price: 950 },
  exo:      { name: '외골격 슈트',   icon: 'exo', def: 45, lvl: 16, price: 2000 },
};

// 헬멧 (v0.6.2). radRes: 방사능 피해 감소율
const HELMETS = {
  cap:       { name: '방탄모',       icon: 'cap', def: 4,  lvl: 1,  price: 80 },
  tacHelmet: { name: '전술 헬멧',    icon: 'tacHelmet', def: 9,  lvl: 6,  price: 320 },
  gasmask:   { name: '방독면 헬멧',  icon: 'gasmask', def: 12, lvl: 12, price: 800, radRes: 0.7 },
  exoHelm:   { name: '외골격 헬멧',  icon: 'exoHelm', def: 20, lvl: 16, price: 1600 },
};

const CONSUMABLES = {
  medkit: { name: '구급상자', icon: 'medkit', desc: '최대 체력의 40% 회복', price: 40, stack: 20 },
  ammo:   { name: '탄약 상자', icon: 'ammo', desc: '예비 탄약 +120', price: 45, stack: 20 },
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
  // v1.5 지하 연구소
  subject: { name: '탈주 실험체', hp: 70, dmg: 13, speed: 128, r: 12, exp: 30, weight: 0.9, color: '#c8b8b0', atkCd: 0.8, aggro: 400 },
  spitter: { name: '산성 실험체', hp: 85, dmg: 16, speed: 70,  r: 13, exp: 34, weight: 1.1, color: '#8fd14a', atkCd: 1.0, aggro: 440,
             ranged: true, lob: true, range: 340, fireCd: 2.6 },
  sentry:  { name: '보안 포탑', hp: 160, dmg: 8, speed: 0, r: 14, exp: 38, weight: 99, color: '#9aa4b0', atkCd: 1.0, aggro: 520,
             ranged: true, range: 480, fireCd: 1.5, burst: 3, bulletSpeed: 520, turret: true },
  // v1.6 강남 · 잠실
  merc:    { name: '블랙선 용병', hp: 110, dmg: 6, speed: 96, r: 12, exp: 40, weight: 1.1, color: '#2a2e36', atkCd: 1.0, aggro: 500,
             ranged: true, range: 360, fireCd: 2.8, burst: 3, bulletSpeed: 480, nade: true }, // v1.7 하향: 피해 11→7 · 사격 간격 1.9→2.4 · 사거리 420→360 · 탄속 560→480  // 3점사 · 가끔 수류탄
  shield:  { name: '방패 돌격병', hp: 170, dmg: 14, speed: 78, r: 14, exp: 48, weight: 2.2, color: '#3a3e46', atkCd: 1.6, aggro: 460, shield: true }, // 정면 피해 65% 감소 · 느리게 돌아섬 · v1.7 하향 (체력 200→170 · 피해 20→14 · 공격 간격 1.3→1.6)
  stalker: { name: '은신 변이체', hp: 120, dmg: 16, /* v1.7 21→16: 위협은 은신, 피해까지 최고일 필요 없음 */ speed: 150, r: 12, exp: 46, weight: 0.9, color: '#4a3a5a', atkCd: 0.9, aggro: 420, pounce: true, cloak: true }, // 가까이 오거나 맞기 전엔 거의 안 보임
  boss:   { name: '방사능 군주 타이탄', hp: 60000, /* v1.7 90000→60000: 엔딩이 6장으로 옮겨져 중간 보스, 봇 측정상 Lv20 장비로 2분+ */ dmg: 130, speed: 75, r: 36, exp: 20000, weight: 0, color: '#3fbf5a', atkCd: 1.2, aggro: 700, boss: true },
};

// 지역 (캠프 중심으로부터 타일 거리)
const ZONES = [
  { name: '시청역 생존자 캠프', maxDist: 12, lvl: [0, 0], dark: 0.25, tint: null, spawns: [] },
// v0.6 지역 특성: desc 설명 · packs 무리 출몰(종류: [최소, 최대]) · gear 특산 장비(드랍의 50%) · gearText 표시용
  { name: '명동 잔해', maxDist: 28, lvl: [1, 4], dark: 0.32, tint: null,
    spawns: [['zombie', 70], ['dog', 30]],
    desc: '감염자 무리가 몰려다닌다', packs: { zombie: [2, 4] },
    gear: ['pistol', 'smg', 'pipe', 'vest', 'cap'], gearText: '권총·기관단총·쇠파이프' },
  { name: '종로 폐허', maxDist: 44, lvl: [5, 9], dark: 0.42, tint: null,
    spawns: [['zombie', 35], ['dog', 25], ['raider', 40]],
    desc: '약탈자들이 무리 지어 매복한다', packs: { raider: [2, 3], dog: [2, 3] },
    gear: ['shotgun', 'axe', 'tactical', 'tacHelmet'], gearText: '산탄총·소방 도끼·전술 조끼·전술 헬멧' },
  { name: '용산 군사구역', maxDist: 58, lvl: [10, 15], dark: 0.52, tint: 'rgba(40,20,10,0.12)',
    spawns: [['raider', 35], ['brute', 25], ['drone', 25], ['dog', 15]],
    desc: '경비 드론 편대가 순찰한다', packs: { drone: [2, 3] },
    gear: ['rifle', 'sniper', 'lmg', 'military'], gearText: '돌격소총·저격소총·기관총·군용 강화복' },
  { name: '여의도 방사능 지대', maxDist: 999, lvl: [16, 20], dark: 0.6, tint: 'rgba(40,120,30,0.12)',
    spawns: [['brute', 30], ['drone', 30], ['raider', 20], ['zombie', 20]],
    desc: '방사능 웅덩이 — 들어가면 체력이 깎인다', packs: { zombie: [3, 5] },
    gear: ['katana', 'lmg', 'sniper', 'exo', 'gasmask', 'exoHelm'], gearText: '고주파 블레이드·기관총·외골격 슈트·방독면 헬멧' },
  // v1.5 지하 연구소 (실내 던전): 방과 복도, 붉은 비상등만 켜진 어둠
  { name: '지하 연구소', maxDist: 999, lvl: [18, 24], dark: 0.82, tint: 'rgba(70,0,0,0.10)',
    spawns: [['subject', 40], ['spitter', 25], ['sentry', 15], ['drone', 20]],
    desc: '어둠 속 실험체 · 보안 포탑 · 최종 실험체 「키메라」', packs: { subject: [2, 4] },
    gear: ['katana', 'sniper', 'lmg', 'exo', 'exoHelm'], gearText: '고주파 블레이드·저격소총·기관총·외골격 장비' },
  // v1.6
  { name: '강남 업무지구', maxDist: 999, lvl: [20, 25], dark: 0.55, tint: 'rgba(30,20,70,0.10)',
    spawns: [['merc', 25], ['shield', 25], ['brute', 15], ['dog', 15], ['drone', 10], ['raider', 10]], // v1.7 원거리 비율 70% → 45% (봇 측정 사망률 100%)
    desc: '민간 군사 회사 「블랙선」의 구역 — 방패병은 뒤나 폭발로', packs: { merc: [1, 2] },
    gear: ['rifle', 'sniper', 'lmg', 'military', 'exo', 'tacHelmet', 'exoHelm'], gearText: '돌격소총·저격소총·기관총·강화복·외골격' },
  { name: '잠실 변이 지대', maxDist: 999, lvl: [25, 30], dark: 0.62, tint: 'rgba(60,10,60,0.10)',
    spawns: [['stalker', 25], ['zombie', 30], ['brute', 15], ['dog', 18], ['spitter', 12]], // v1.7 변이 거한 25→15 (잠실 사망 원인 2위)
    desc: '보이지 않는 포식자 · 석촌호수 물가는 발이 느려진다', packs: { zombie: [3, 5] },
    gear: ['katana', 'lmg', 'sniper', 'exo', 'exoHelm', 'gasmask'], gearText: '고주파 블레이드·기관총·저격소총·외골격·방독면' },
];

// v1.3 맵 (출격·탈출): 캠프(거점)에서 맵을 골라 출격하고, 맵 가장자리 탈출 지점으로 귀환
// chapter: 이야기가 이 장에 도달하면 해금 · landmark: 맵 가운데 랜드마크 · boss/hazards: 타이탄 아레나·방사능 웅덩이
const MAPS = {
  camp:       { name: '시청역 생존자 캠프', zone: 0, size: 40, seed: 2049 },
  myeongdong: { name: '명동 잔해', zone: 1, size: 72, seed: 1101, landmark: 'cathedral', chapter: 0 },
  jongno:     { name: '종로 폐허', zone: 2, size: 90, seed: 1202, landmark: 'bosingak', chapter: 1 },
  yongsan:    { name: '용산 군사구역', zone: 3, size: 90, seed: 1303, landmark: 'base', chapter: 2 },
  yeouido:    { name: '여의도 방사능 지대', zone: 4, size: 108, seed: 1404, landmark: 'tower63', chapter: 3, boss: true, hazards: true },
  gangnam:    { name: '강남 업무지구', zone: 6, size: 108, seed: 1606, landmark: 'coex', chapter: 4, tall: [0.55, 9, 9] }, // v1.6 유리 고층 빌딩 숲
  jamsil:     { name: '잠실 변이 지대', zone: 7, size: 108, seed: 1707, landmark: 'lotte', chapter: 5, lake: true },      // v1.6 석촌호수 (얕은 물)
  lab:        { name: '지하 연구소', zone: 5, size: 66, seed: 1505, chapter: 4, lab: true, lock: '제4장 완료 후 해금' }, // v1.5 실내 던전 (출격마다 구조가 바뀜)
};
const MAP_ORDER = ['myeongdong', 'jongno', 'yongsan', 'yeouido', 'lab', 'gangnam', 'jamsil']; // 출격 지도 표시 순서
const CHAPTER_MAP = ['myeongdong', 'jongno', 'yongsan', 'yeouido', 'gangnam', 'jamsil'];      // v1.6 장 번호 → 그 장의 맵

// 지역 랜드마크 (v0.6). tx,ty: 좌상단 타일, size: 한 변 타일 수, base: 그림 기준 크기(v0.13 확대 전). 처음 가까이 가면 발견 보상
const LANDMARKS = [
  { id: 'cathedral', name: '무너진 명동성당', zone: 1, tx: 80, ty: 55, size: 7, base: 4, exp: 80, credits: 200 },
  { id: 'bosingak', name: '보신각', zone: 2, tx: 38, ty: 86, size: 6, base: 4, exp: 600, credits: 600 },
  { id: 'base', name: '버려진 용산 기지', zone: 3, tx: 98, ty: 92, size: 8, base: 5, exp: 2500, credits: 1500 },
  { id: 'tower63', name: '63빌딩 잔해', zone: 4, tx: 5, ty: 23, size: 7, base: 4, exp: 6000, credits: 3000 },
  { id: 'coex', name: '무너진 코엑스', zone: 6, tx: 0, ty: 0, size: 8, base: 5, exp: 9000, credits: 4000 },
  { id: 'lotte', name: '롯데월드타워 잔해', zone: 7, tx: 0, ty: 0, size: 7, base: 4, exp: 14000, credits: 6000 },
];

const SKILLS = [
// stat: 스킬을 강화하는 능력치 (v0.3)
  { id: 'rapid',   name: '집중 사격', icon: 'rapid', lvl: 1,  cd: 14, stat: 'agi' },
  { id: 'grenade', name: '수류탄',   icon: 'grenade', lvl: 3,  cd: 8,  stat: 'dex' },
  { id: 'heal',    name: '응급 처치', icon: 'heal',  lvl: 6,  cd: 22, stat: 'vit' },
  { id: 'adren',   name: '아드레날린', icon: 'adren', lvl: 10, cd: 40, stat: 'str' },
];

// 임무는 js/quests.js (v0.7 챕터 구조)
