// 게임 데이터 정의
const TILE = 32;

const ENEMY_SPEED = 0.6; // 적 이동 속도 전체 배율 — v1.32 0.85 · v1.33 0.6 (플레이어 125 → 88, -30%에 맞춰)
const GAME_VERSION = 'v1.65';
const MAX_LEVEL = 30; // 레벨 상한 (본편 Lv20 + 위협 등급 어설트)

const RARITIES = [
  { name: '일반', mul: 1.0, color: '#dddddd', weight: 56 },
  { name: '고급', mul: 1.15, color: '#6fdc6f', weight: 27 },
  { name: '희귀', mul: 1.35, color: '#5aa8ff', weight: 11 },
  { name: '영웅', mul: 1.6, color: '#c77dff', weight: 4.5 },
  { name: '전설', mul: 2.0, color: '#ffa53a', weight: 1.0 },
  { name: '신화', mul: 2.3, color: '#ff4f3a', weight: 0 }, // v1.53 특별 무기 전용 (무작위로는 안 나옴) — 이름은 여기 한 곳
];
// 천장: 몬스터 장비 드랍이 이 횟수만큼 영웅 미만이면 다음 드랍은 영웅 이상 확정
// v1.25 파밍 경제: 장비가 귀하고 돈이 덜 벌리게 (확률 드랍 · 땅에 떨어지는 크레딧 · 판매가에 곱함)
const ECON = { gear: 0.3, cr: 0.35, sell: 0.15 }; // v1.57 크레딧 0.5 → 0.35 · 판매 0.2 → 0.15 (돈이 너무 잘 벌리던 것)
const MED_CD = 8; // v1.57 구급상자 쿨타임(초) — 무한히 먹으면 쉬워지던 것
const PITY_DROPS = 10; // v1.25 드랍 자체가 귀해진 만큼 15 → 10 // v0.10 드랍률 하향에 맞춰 50 → 35 · v1.5.1 → 25 · v1.7.1 → 15 (드랍이 더 귀해진 만큼)

// v1.33 탄약 4종 — 총마다 쓰는 탄이 다름. k = 기관총탄 1발 대비 양 (줍거나 상자로 받을 때) · pack/price = 출격 지도에서 사는 묶음
const AMMO = {
  pistol: { name: '권총탄',   color: '#d8c890', k: 0.6,  pack: 48,  price: 15, start: 72 },
  auto:   { name: '기관총탄', color: '#c8a050', k: 1,    pack: 120, price: 45, start: 120, desc: '기관단총 · 소총 · 기관총' },
  shell:  { name: '산탄',     color: '#d05a3a', k: 0.25, pack: 30,  price: 45, start: 24 },
  // v1.55 저격탄 삭제 (남은 탄은 크레딧으로)
  //sniper: { name: '저격탄',   color: '#7ab0d8', k: 0.12, pack: 15,  price: 50, start: 10 },
};
// 무기 기본 정보
// range: 사거리(px) · knock: 넉백 · stagger: 경직(초) · move: 장착 시 이동속도 배율
// role: 플레이어에게 보여줄 무기 성격 한 줄
const WEAPONS = {
  // v1.55 pipe 삭제 (그림이 있는 무기만 · 세이브의 것은 소방 도끼로 바뀜)
  pistol:  { ammo: 'pistol', name: 'P-45 권총',    icon: 'pistol', dmg: 18, rate: 0.42, /* v1.27 보조무기답게 공속↓ (0.26/14 · 실DPS 69 → 58) */ mag: 12, reload: 1.0, spread: 0.03, speed: 950, range: 520, knock: 6, stagger: 0.05, move: 1.05,
             quickDraw: true, lvl: 1, price: 80, role: '권총탄이 흔하고 쌈 · 즉시 꺼내 듦 · 언제나 믿을 수 있는 보조무기' },
  axe:     { name: '소방 도끼',     icon: 'axe', melee: true, dmg: 55, rate: 1.0, /* v1.8.1 0.8/44 */ range: 72, arc: 2.1, knock: 42, stagger: 0.7, move: 0.98, lvl: 1, price: 220, /* v1.55 쇠파이프 대신 첫 근접 무기 (Lv1~ 초중반) */
             role: '넓은 일격 · 3타째 회전 베기로 주변을 쓸어냄' },
  smg:     { ammo: 'auto', name: 'SP-9 기관단총',  icon: 'smg', dmg: 12, rate: 0.13, /* v1.50.7 0.1 → 0.13 (한 발 피해는 RATE_COMP로 ×1.2) · v1.40.2 9/0.075 — 너무 빨라 정신없던 것 (초당 피해 유지) */ mag: 32, reload: 1.5, spread: 0.11, speed: 900, range: 380, falloff: true, knock: 3, stagger: 0, move: 1.08,
             lvl: 3, price: 260, role: '근거리 순간 화력 · 이동하며 난사' },
  shotgun: { ammo: 'shell', name: 'R-12 산탄총',   icon: 'shotgun', dmg: 10, pellets: 7, rate: 0.7, mag: 6, reload: 1.8, /* v1.27 0.8 · 2.2 (Lv3 기관단총보다 약하던 것) */ spread: 0.3, speed: 800, range: 260, falloff: true, knock: 9, stagger: 0.3, move: 1.0,
             lvl: 5, price: 380, role: '근거리 폭발력 · 코앞에서 쏘면 크게 날려버림' },
  rifle:   { ammo: 'auto', name: 'KR-49 돌격소총',   icon: 'rifle', dmg: 22, rate: 0.18, /* v1.50.7 0.14 → 0.18 (×1.2) · v1.40.2 17/0.11 (초당 피해 유지) */ mag: 30, reload: 1.8, spread: 0.04, speed: 1100, range: 620, knock: 4, stagger: 0.05, move: 1.0,
             lvl: 8, price: 620, role: '안정적인 중거리 화력 · 끊어 쏘면 첫 발이 정확' },
  katana:  { name: '고주파 블레이드', icon: 'katana', melee: true, dmg: 62, rate: 0.5, /* v1.8.1 0.38/60 · v1.27 79 → 62 (Lv16 기관총보다 훨씬 강하던 것) */ range: 92, arc: 1.5, knock: 12, stagger: 0.2, move: 1.12, lvl: 18, price: 900, /* v1.55 후반 근접 (11 → 18) */
             role: '긴 칼날 · 3타째 돌진 찌르기 · 가장 빠른 이동' },
  // v1.55 sniper 삭제 (그림이 있는 무기만 · 세이브의 것은 돌격소총으로 바뀜)
  lmg:     { ammo: 'auto', name: 'LM-49 기관총',     icon: 'lmg', dmg: 15, rate: 0.1, /* v1.50.7 0.07 → 0.1 (×1.28) */ mag: 100, reload: 4.0, spread: 0.09, speed: 1050, range: 560, knock: 3, stagger: 0.03, move: 0.8,
             lvl: 16, price: 1800, role: '압도적 지속 화력 · 쏠수록 빨라지고 정확해짐 · 무거움' },
  // v1.53 신화 무기 (특별 총 3종): 신화 등급 고정 · 바벨·타이탄·키메라 · 어설트 위협 5+ A 등급 이상(v1.63, 전엔 S)에서 낮은 확률 (MYTH_DROP) · 상자·상점에서는 안 나옴 · 죽으면 잃음
  // base = 소리·손맛·부품을 빌려 오는 총 · 고유 아이콘과 손에 든 그림을 만들 예정
  // 손에 든 고유 그림은 player[_방어구]_<키> 가 있으면 그걸 씀 (없으면 같은 계열 그림)
  blaster: { ammo: 'shell', base: 'shotgun', myth: true, name: '래피드 블래스터', icon: 'blaster', dmg: 7, pellets: 6, rate: 0.25, mag: 20, reload: 3.2, spread: 0.34, speed: 800, range: 230, falloff: true, knock: 5, stagger: 0.12, move: 0.95,
             lvl: 26, price: 2400, role: '연사 산탄총 · 드럼 탄창 20발 · 근거리를 갈아버림, 멀리선 약함' },
  f20:     { ammo: 'auto', base: 'rifle', myth: true, name: 'F-20 불펍 소총', icon: 'f20', dmg: 19, rate: 0.12, mag: 40, reload: 2.1, spread: 0.035, speed: 1150, range: 680, knock: 3, stagger: 0.04, move: 1.0,
             built: { adsSpread: 0.7, adsLead: 1.35 }, fixed: ['scope'], lvl: 28, price: 3200, role: '가장 빠른 소총 · 2배 조준경 일체형 (조준경 칸 없음) · 탄창 40발' },
  ox20:    { ammo: 'auto', base: 'rifle', myth: true, name: 'OX-20 복합소총', icon: 'ox20', dmg: 27, rate: 0.2, mag: 30, reload: 2.0, spread: 0.045, speed: 1100, range: 620, knock: 4, stagger: 0.05, move: 0.95,
             gl: { cd: 5, mul: 4, r: 85, range: 430 }, lvl: 30, price: 4600, role: '돌격소총 + 공중폭발 유탄 (G · 모바일 유탄 버튼) · 유탄은 탄 수 없이 5초마다 한 발' }, // v1.62 4발 충전식 → 쿨타임 5초
};
// v1.53 신화 무기 드랍: 확률 + 못 얻을 때마다 pity · MYTH_LIVE = false 면 아직 안 나옴 (고유 그림이 오면 켬)
const MYTH_LIVE = true; // v1.55 고유 그림이 와서 켬
const MYTH_TEST = false; // v1.61.2 시험 모드: 새 게임·불러오기 모두 바로 Lv26 + 신화 3종 · 이 동안 신화 레벨 제한 25 — 출시 전 false
const MYTH_DROP = { babel: { chance: 0.06, pity: 0.02 }, titan: { chance: 0.03, pity: 0.01 }, chimera: { chance: 0.04, pity: 0.015 }, assault: { chance: 0.06, pity: 0.02, tier: 5, rank: 'A' } }; // v1.63 어설트는 위협 5+ A 등급 이상 (S만이면 최상급 장비로도 거의 못 함)
const wbase = k => (WEAPONS[k] && WEAPONS[k].base) || k; // v1.52 불법 무기 → 같은 계열 총 (소리·손맛·부품)

// v1.9 근접 3타 콤보. 1·2타(MELEE_COMBO) → 3타 무기별 마무리(MELEE_FINISH). 값은 무기 기본치에 곱함
// rate: 다음 공격까지 간격 배율 · arc: 고정 각도(없으면 arcMul) · lunge: 전진 거리(px) · stagger: 경직 추가(초) · crit: 치명타 확률 추가
// 한 바퀴(3타) DPS ≈ 기존 ×1.15 — 콤보를 이어 갈수록 이득
// v1.26 공속 더 낮춤 (1·2타 0.8 → 1.0, 마무리 +0.15~0.2) · 대신 한 방 피해 ↑ → 3타 한 바퀴 DPS 약 -8%, 묵직하게
const MELEE_COMBO = { dmg: 0.95, rate: 1.0, range: 1, arcMul: 1, knock: 1, stagger: 0, lunge: 6 };
const MELEE_FINISH = {
  pipe:   { name: '강타',      dmg: 1.9,  rate: 1.5,  range: 1.05, arcMul: 0.8, knock: 2.2, stagger: 0.5, lunge: 10, crit: 0.15 },
  axe:    { name: '회전 베기', dmg: 1.55, rate: 1.5, range: 1.1,  arc: Math.PI * 2, knock: 1.6, stagger: 0.3, lunge: 4 },
  katana: { name: '돌진 찌르기', dmg: 1.95, rate: 1.4, range: 1.7,  arc: 0.55, knock: 0.8, stagger: 0.2, lunge: 34 },
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
  // v1.25 벨트 전용 옵션
  medHeal: { name: '구급상자 회복', slot: 'belt', min: 0.10, max: 0.30, pct: true },
  gadDmg:  { name: '투척물 피해',   slot: 'belt', min: 0.10, max: 0.35, pct: true },
  cdr:     { name: '스킬 재사용 단축', slot: 'belt', min: 0.04, max: 0.10, pct: true },
  rollStam:{ name: '회피 재사용 감소', slot: 'belt', min: 0.08, max: 0.20, pct: true },
  gadSave: { name: '소모품 절약 확률', slot: 'belt', min: 0.08, max: 0.20, pct: true },
};

// 전설 무기 고유 효과 (무기를 들고 있을 때만 발동)
const LEGENDARY = {
  boom:    { name: '폭발탄',    desc: '명중 시 20% 확률로 소형 폭발' },
  leech:   { name: '흡혈',      desc: '입힌 피해의 4%만큼 체력 회복' },
  execute: { name: '처형자',    desc: '체력 30% 이하의 적에게 피해 +60%' },
  thrift:  { name: '보급 장인', desc: '35% 확률로 탄약을 소모하지 않음', gun: true },
  quickload: { name: '속사 장전', desc: '적을 처치하면 탄창이 즉시 가득 참', gun: true },
  chain:   { name: '연쇄 타격', desc: '치명타가 근처 적 1명에게 50% 피해로 튐' },
  // v1.12 방어구 전설 (slot: armor)
  aegis:      { name: '반응 장갑', desc: '맞으면 20% 확률로 3초 방어막 (받는 피해 -40%, 재발동 10초)', slot: 'armor' },
  thorns:     { name: '가시 갑옷', desc: '맞으면 가까운 적 모두에게 받은 피해의 80% 반사', slot: 'armor' },
  afterimage: { name: '잔상', desc: '회피가 끝난 자리에 충격파 (레벨×14 피해 · 경직)', slot: 'armor' },
  survivor:   { name: '생존 본능', desc: '체력이 30% 아래로 떨어지면 아드레날린 자동 발동 (재발동 45초)', slot: 'armor' },
  // v1.12 헬멧 전설 (slot: helmet)
  nightVision:{ name: '야간 투시', desc: '어둠 -60% · 은신한 적이 항상 보임', slot: 'helmet' },
  hunterEye:  { name: '사냥꾼의 눈', desc: '치명타 피해 +35%', slot: 'helmet' },
  focus:      { name: '집중 장치', desc: '스킬 재사용 대기 -18%', slot: 'helmet' },
  filter:     { name: '정화 필터', desc: '방사능·산성 장판 피해 없음 · 체력 재생 +2/초', slot: 'helmet' },
};

// v1.12 지역 세트 장비: 그 지역(zones)에서 나오는 희귀 이상 장비의 15%가 세트 조각. 무기(주·보조 중 하나) · 방어구 · 헬멧 3부위
const SETS = {
  vigil:    { name: '자경단', zones: [2], pieces: { weapon: 'smg', armor: 'tactical', helmet: 'tacHelmet' }, color: '#5ad8a8',
              b2: '이동 속도 +6%', b3: '처치하면 3초 동안 공격 속도 +15%' },
  steel:    { name: '강철 부대', zones: [3], pieces: { weapon: 'rifle', armor: 'military', helmet: 'gasmask' }, color: '#9ab4d8',
              b2: '방어력 +15%', b3: '체력 50% 이상일 때 받는 피해 -20%' },
  rad:      { name: '방사능 사냥꾼', zones: [4, 5], pieces: { weapon: 'lmg', armor: 'exo', helmet: 'exoHelm' }, color: '#9aff6a',
              b2: '방사능 피해 없음 · 최대 체력 +8%', b3: '엘리트·보스·둥지 피해 +15% · 총알 12% 확률로 소형 폭발' },
  blacksun: { name: '블랙선', zones: [6, 7], pieces: { weapon: 'lmg', armor: 'exo', helmet: 'exoHelm' }, color: '#ffd23b',
              b2: '치명타 확률 +8%', b3: '치명타로 처치하면 탄창 +3발 · 2초 동안 치명타 피해 +50%' },
};

// v1.12 보스 고유 장비: 보스마다 하나, 처치 시 낮은 확률 (못 얻을 때마다 +3%). 고유 효과는 전설 효과 대신 붙음
const UNIQUES = {
  fang:    { from: 'redfang', boss: '붉은 이빨', key: 'axe',     name: '「붉은 이빨」 송곳니 도끼', chance: 0.10,
             desc: '근접으로 처치하면 다음 공격 피해 +100%' },
  viper:   { from: 'viper',   boss: '독사',     key: 'shotgun', name: '「독사」의 독니 산탄총', chance: 0.10,
             desc: '산탄 펠릿 +3 · 맞은 적 2초 동안 이동 속도 -35%' },
  goliath: { from: 'goliath', boss: '골리앗',   key: 'axe',     name: '「골리앗」의 팔', chance: 0.10,
             desc: '근접 마무리 범위 +40% · 마무리 피해 +50%' },
  hawk:    { from: 'hawk',    boss: '매',       key: 'rifle',   name: '「매」의 눈 정찰소총', chance: 0.10,
             desc: '관통 +2 · 맞은 적 5초 동안 받는 피해 +25% (표식)' },
  shade:   { from: 'shade',   boss: '그림자',   key: 'exo',     name: '「그림자」 은신 외피', chance: 0.10,
             desc: '회피 후 1.5초 동안 이동 속도 +40% · 받는 피해 -30%' },
  chimera: { from: 'chimera', boss: '키메라',   key: 'military', name: '「키메라」 재생 조직 갑옷', chance: 0.15,
             desc: '체력 재생 +3/초 · 체력 50% 이하에서 재생 3배' },
  titan:   { from: 'titan',   boss: '타이탄',   key: 'lmg',     name: '「타이탄」 방사능 심장포', chance: 0.15,
             desc: '25% 확률로 방사능 탄 (작은 초록 폭발) · 예열이 항상 최대' },
  raven:   { from: 'raven',   boss: '레이븐',   key: 'rifle',   name: '「레이븐」 지휘 소총', chance: 0.20,
             desc: '3발째마다 파편 폭발 (피해 60%)' },
  babel:   { from: 'babel',   boss: '바벨',     key: 'katana',  name: '「바벨」 촉수 칼날', chance: 0.20,
             desc: '근접 범위 +30% · 처치할 때마다 최대 체력 3% 회복' },
};

// 장비 강화 (v0.5). rates[현재 단계] = 성공 확률
// 실패 시 dropFrom 단계 이상이면 -1, 실패할 때마다 해당 아이템 다음 확률 +failBonus. 파괴 없음
const ENHANCE = {
  max: 10, step: 0.08, dropFrom: 7, failBonus: 0.05,
  rates: [1, 1, 1, 0.85, 0.75, 0.65, 0.55, 0.45, 0.35, 0.25],
};

// 등급별 추가 옵션 개수
const AFFIX_COUNT = { weapon: [0, 1, 2, 3, 3, 4], armor: [0, 1, 2, 3, 4, 4], helmet: [0, 1, 2, 3, 4, 4], belt: [0, 1, 2, 3] }; // v1.25 벨트

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
  medkit: { name: '구급상자', icon: 'medkit', desc: '최대 체력의 40% 회복 · 8초에 한 번', price: 40, stack: 20 },
  ammo:   { name: '탄약 상자', icon: 'ammo', desc: '들고 있는 총의 탄약 (기관총탄 120발어치)', price: 45, stack: 20 },
  // v1.14 투척물 (6번 칸, T로 바꿈) · 보조 (7번 칸, Y로 바꿈)
  molotov: { name: '화염병', icon: 'molotov', desc: '던진 자리에 5초 불길 (넓게 · 계속 피해)', price: 90, stack: 10, slot: 'throw' },
  flash:   { name: '섬광탄', icon: 'flash', desc: '반경 170 안의 적 2.5초 기절 (보스 0.6초) · 은신 드러냄', price: 70, stack: 10, slot: 'throw' },
  mine:    { name: '지뢰', icon: 'mine', desc: '발밑에 설치. 적이 밟으면 크게 터진다 (최대 4개)', price: 110, stack: 10, slot: 'throw' },
  stim:    { name: '전투 자극제', icon: 'stim', desc: '12초 동안 이동 +20% · 공격 속도 +15% · 받는 피해 -10%', price: 120, stack: 10, slot: 'util' },
  plate:   { name: '방탄판', icon: 'plate', desc: '최대 체력 25%만큼 피해를 막는 보호막 (최대 50%까지 쌓임)', price: 100, stack: 10, slot: 'util' },
};

// 적 정의
const ENEMIES = {
  zombie: { name: '감염자',   hp: 40,  dmg: 8,  speed: 68,  r: 12, exp: 10, weight: 1, color: '#6b8f4e', atkCd: 1.0, aggro: 360 },
  dog:    { name: '변이견',   hp: 26,  dmg: 6,  speed: 132, /* v1.45 155 → 132 (실속도 93 → 79: 플레이어 88보다 늘 느리게 · 위협은 도약으로) */ r: 10, exp: 12, weight: 0.7, color: '#8a5a3c', atkCd: 0.7, aggro: 420 },
  raider: { name: '약탈자',   hp: 50,  dmg: 7,  speed: 92,  r: 12, exp: 18, weight: 1, color: '#b5523b', atkCd: 1.0, aggro: 460,
            ranged: true, range: 320, fireCd: 1.4, bulletSpeed: 380, nade: 'weak' }, /* v1.46 1.2·430 → 1.4·380 (종로 봇 사망 73%: 총알이 대부분 — 옆으로 피할 수 있게) */ // v1.32 약탈자도 가끔 수류탄 (용병보다 드물고 약함)
  brute:  { name: '변이 거한', hp: 190, dmg: 22, speed: 56,  r: 20, exp: 45, weight: 2.5, color: '#7a4f8a', atkCd: 1.5, aggro: 360 },
  drone:  { name: '경비 드론', hp: 60,  dmg: 7.5, /* v1.62 9 → 7.5 · 쏘는 간격 0.9 → 1.1: 봇 완주 측정 용산 사망률 78% (사망 원인 1위 드론 총알) */ speed: 115, r: 11, exp: 26, weight: 0.8, color: '#8fa3b8', atkCd: 1.0, aggro: 440,
            ranged: true, range: 290, fireCd: 1.1, bulletSpeed: 480, flying: true },
  // v1.5 지하 연구소
  subject: { name: '탈주 실험체', hp: 70, dmg: 13, speed: 128, r: 12, exp: 30, weight: 0.9, color: '#c8b8b0', atkCd: 0.8, aggro: 400 },
  spitter: { name: '산성 실험체', hp: 85, dmg: 16, speed: 70,  r: 13, exp: 34, weight: 1.1, color: '#8fd14a', atkCd: 1.0, aggro: 440,
             ranged: true, lob: true, range: 340, fireCd: 2.6 },
  sentry:  { name: '보안 포탑', hp: 160, dmg: 8, speed: 0, r: 14, exp: 38, weight: 99, color: '#9aa4b0', atkCd: 1.0, aggro: 520,
             ranged: true, range: 480, fireCd: 1.5, burst: 3, bulletSpeed: 520, turret: true },
  // v1.6 강남 · 잠실
  merc:    { name: '블랙선 용병', hp: 110, dmg: 5, /* v1.16 6→5: 봇 측정 강남 사망률 90~100% (사망 원인 1위) */ speed: 96, r: 12, exp: 40, weight: 1.1, color: '#2a2e36', atkCd: 1.0, aggro: 500,
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
    gear: ['pistol', 'smg', 'vest', 'cap'], gearText: '권총·기관단총·방탄모' } /* v1.57 도끼는 처음부터 있으니 특산에서 뺌 */,
  { name: '종로 폐허', maxDist: 44, lvl: [5, 9], dark: 0.42, tint: null,
    spawns: [['zombie', 45], ['dog', 25], ['raider', 28]], // v1.57 약탈자 40 → 28 (총 쏘는 적이 너무 많아 쾌적하지 않던 것)
    desc: '약탈자들이 무리 지어 매복한다', packs: { raider: [1, 2], dog: [2, 3] },
    gear: ['shotgun', 'axe', 'tactical', 'tacHelmet'], gearText: '산탄총·소방 도끼·전술 조끼·전술 헬멧' },
  { name: '용산 군사구역', maxDist: 58, lvl: [10, 15], dark: 0.52, tint: 'rgba(40,20,10,0.12)',
    spawns: [['raider', 35], ['brute', 25], ['drone', 25], ['dog', 15]],
    desc: '경비 드론 편대가 순찰한다', packs: { drone: [2, 3] },
    gear: ['rifle', 'lmg', 'military'], gearText: '돌격소총·기관총·군용 강화복' },
  { name: '여의도 방사능 지대', maxDist: 999, lvl: [16, 20], dark: 0.6, tint: 'rgba(40,120,30,0.12)',
    spawns: [['brute', 30], ['drone', 30], ['raider', 20], ['zombie', 20]],
    desc: '방사능 웅덩이. 들어가면 체력이 깎인다', packs: { zombie: [3, 5] },
    gear: ['katana', 'lmg', 'exo', 'gasmask', 'exoHelm'], gearText: '고주파 블레이드·기관총·외골격 슈트·방독면 헬멧' },
  // v1.5 지하 연구소 (실내 던전): 방과 복도, 붉은 비상등만 켜진 어둠
  { name: '지하 연구소', maxDist: 999, lvl: [18, 24], dark: 0.82, tint: 'rgba(70,0,0,0.10)',
    spawns: [['subject', 40], ['spitter', 25], ['sentry', 15], ['drone', 20]],
    desc: '어둠 속 실험체 · 보안 포탑 · 최종 실험체 「키메라」', packs: { subject: [2, 4] },
    gear: ['katana', 'lmg', 'exo', 'exoHelm'], gearText: '고주파 블레이드·기관총·외골격 장비' },
  // v1.6
  { name: '강남 업무지구', maxDist: 999, lvl: [20, 25], dark: 0.55, tint: 'rgba(30,20,70,0.10)',
    spawns: [['merc', 25], ['shield', 25], ['brute', 15], ['dog', 15], ['drone', 10], ['raider', 10]], // v1.7 원거리 비율 70% → 45% (봇 측정 사망률 100%)
    desc: '민간 군사 회사 「블랙선」 구역. 방패병은 뒤를 잡거나 폭발로', packs: { merc: [1, 2] },
    gear: ['rifle', 'lmg', 'military', 'exo', 'tacHelmet', 'exoHelm'], gearText: '돌격소총·기관총·강화복·외골격' },
  { name: '잠실 변이 지대', maxDist: 999, lvl: [25, 30], dark: 0.62, tint: 'rgba(60,10,60,0.10)',
    spawns: [['stalker', 25], ['zombie', 30], ['brute', 15], ['dog', 18], ['spitter', 12]], // v1.7 변이 거한 25→15 (잠실 사망 원인 2위)
    desc: '보이지 않는 포식자 · 석촌호수 물가는 발이 느려진다', packs: { zombie: [3, 5] },
    gear: ['katana', 'lmg', 'exo', 'exoHelm', 'gasmask'], gearText: '고주파 블레이드·기관총·외골격·방독면' },
];

// v1.3 맵 (출격·탈출): 캠프(거점)에서 맵을 골라 출격하고, 맵 가장자리 탈출 지점으로 귀환
// chapter: 이야기가 이 장에 도달하면 해금 · landmark: 맵 가운데 랜드마크 · boss/hazards: 타이탄 아레나·방사능 웅덩이
const MAPS = {
  camp:       { name: '시청역 생존자 캠프', zone: 0, size: 40, seed: 2049 },
  myeongdong: { name: '명동 잔해', zone: 1, size: 72, seed: 1101, landmark: 'cathedral', chapter: 0 },
  jongno:     { name: '종로 폐허', zone: 2, size: 90, seed: 1202, landmark: 'bosingak', chapter: 1 },
  yongsan:    { name: '용산 군사구역', zone: 3, size: 90, seed: 1303, landmark: 'base', chapter: 2 },
  yeouido:    { name: '여의도 방사능 지대', zone: 4, size: 108, seed: 1404, landmark: 'tower63', chapter: 3, boss: true, hazards: true },
  gangnam:    { name: '강남 업무지구', zone: 6, size: 108, seed: 1606, landmark: 'coex', chapter: 4, tall: [0.55, 6, 6] } /* v1.21 9~17층 → 6~11층 (층 높이 2.7m) */, // v1.6 유리 고층 빌딩 숲
  jamsil:     { name: '잠실 변이 지대', zone: 7, size: 108, seed: 1707, landmark: 'lotte', chapter: 5, lake: true },      // v1.6 석촌호수 (얕은 물)
  lab:        { name: '지하 연구소', zone: 5, size: 66, seed: 1505, chapter: 4, lab: true, lock: '제4장 완료 후 해금' }, // v1.5 실내 던전 (출격마다 구조가 바뀜)
};
const MAP_ORDER = ['myeongdong', 'jongno', 'yongsan', 'yeouido', 'lab', 'gangnam', 'jamsil']; // 출격 지도 표시 순서
const CHAPTER_MAP = ['myeongdong', 'jongno', 'yongsan', 'yeouido', 'gangnam', 'jamsil'];      // v1.6 장 번호 → 그 장의 맵

// 지역 랜드마크 (v0.6). tx,ty: 좌상단 타일, size: 한 변 타일 수, base: 그림 기준 크기(v0.13 확대 전). 처음 가까이 가면 발견 보상
const LANDMARKS = [
  { id: 'cathedral', name: '무너진 언덕 성당', zone: 1, tx: 80, ty: 55, size: 7, base: 4, exp: 80, credits: 200 },
  { id: 'bosingak', name: '보신각', zone: 2, tx: 38, ty: 86, size: 6, base: 4, exp: 600, credits: 600 },
  { id: 'base', name: '버려진 용산 기지', zone: 3, tx: 98, ty: 92, size: 8, base: 5, exp: 2500, credits: 1500 },
  { id: 'tower63', name: '금빛타워 잔해', zone: 4, tx: 5, ty: 23, size: 7, base: 4, exp: 6000, credits: 3000 },
  { id: 'coex', name: '무너진 무역센터', zone: 6, tx: 0, ty: 0, size: 8, base: 5, exp: 9000, credits: 4000 },
  { id: 'lotte', name: '스카이타워 잔해', zone: 7, tx: 0, ty: 0, size: 7, base: 4, exp: 14000, credits: 6000 },
];

const SKILLS = [
// stat: 스킬을 강화하는 능력치 (v0.3)
// v1.16 스킬은 레벨만 되면 생기지 않고 암시장 상인 박씨에게서 크레딧으로 배움 (price) · 갈래도 따로 삼 (modPrice)
  { id: 'rapid',   name: '집중 사격', icon: 'rapid', lvl: 1,  cd: 14, stat: 'agi', price: 200,  modPrice: 2500 },
  { id: 'grenade', name: '수류탄',   icon: 'grenade', lvl: 3,  cd: 11, /* v1.16 8→11 */ stat: 'dex', price: 1200, modPrice: 3500 },
  { id: 'heal',    name: '응급 처치', icon: 'heal',  lvl: 6,  cd: 22, stat: 'vit', price: 2000, modPrice: 3500 },
  { id: 'adren',   name: '아드레날린', icon: 'adren', lvl: 10, cd: 40, stat: 'str', price: 5000, modPrice: 5000 },
  { id: 'turret',  name: '포탑 설치', icon: 'turret', lvl: 8, cd: 20, stat: 'dex', eng: true }, // v1.26 엔지니어
];

// v1.11 특성: 이 레벨이 되면 3개 중 1개 선택 (총 6개). 의무병의 능력치 초기화 때 함께 초기화
const PERK_TIERS = [
  { lvl: 5, perks: [
    { id: 'rollStrike', name: '회피 공격', desc: '회피가 끝나고 1.5초 동안 주는 피해 +30%' },
    { id: 'scavenger', name: '청소부', desc: '뒤지기 속도 +40% · 뒤질 곳의 크레딧 +50%' },
    { id: 'thickSkin', name: '강인함', desc: '최대 체력 +12%' } ] },
  { lvl: 10, perks: [
    { id: 'lastRounds', name: '마지막 탄', desc: '탄창이 25% 이하일 때 치명타 확률 +25%' },
    { id: 'brawler', name: '싸움꾼', desc: '근접 공격으로 처치하면 최대 체력 4% 회복' },
    { id: 'runner', name: '질주', desc: '이동 속도 +8% · 회피 재사용 -15%' } ] },
  { lvl: 15, perks: [
    { id: 'executioner', name: '처형 일격', desc: '근접 3타 마무리 · 회피 베기 피해 +40%' },
    { id: 'steadyAim', name: '침착함', desc: '2초 동안 맞지 않으면 총기 피해 +15%' },
    { id: 'fieldMedic', name: '응급 요원', desc: '구급상자 회복량 +50% · 응급 처치 재사용 -30%' } ] },
  { lvl: 20, perks: [
    { id: 'lastStand', name: '투쟁 본능', desc: '체력 35% 이하일 때 주는 피해 +25% · 받는 피해 -15%' },
    { id: 'demolition', name: '폭파 전문가', desc: '수류탄 반경 +30% · 내가 일으킨 폭발 피해 +30%' },
    { id: 'killStreak', name: '연쇄 사냥', desc: '연속 처치 5 이상일 때 공격 속도 +15%' } ] },
  { lvl: 25, perks: [
    { id: 'secondWind', name: '두 번째 숨', desc: '출격마다 한 번, 쓰러질 피해를 받으면 체력 30%로 버티고 2초 무적' },
    { id: 'treasure', name: '보물 사냥꾼', desc: '몬스터·뒤질 곳의 장비 드랍 확률 +25%' },
    { id: 'bulletStorm', name: '탄막', desc: '탄창 용량 +30% · 재장전 속도 +20%' } ] },
  { lvl: 30, perks: [
    { id: 'apex', name: '정점 포식자', desc: '엘리트·네임드·보스·둥지에게 주는 피해 +20%' },
    { id: 'ghost', name: '그림자 걸음', desc: '회피 재사용 -40% · 회피 후 1초 동안 받는 피해 -50%' },
    { id: 'warlord', name: '전쟁군주', desc: '모든 스킬 재사용 대기 -25%' } ] },
];

// v1.24 벨트 (장구류): 차는 벨트 등급만큼 핫바 칸 (2 · 4 · 6 · 8). 칸에는 배운 스킬 · 구급상자 · 투척물 · 보조를 직접 등록
// 등급 = rarity (0 일반 ~ 3 영웅). 벨트가 없어도 기본 2칸
const BELTS = [
  { name: '낡은 허리띠', slots: 2, lvl: 1, price: 60 },
  { name: '전술 벨트', slots: 3, lvl: 3, price: 900 }, /* v1.50 벨트 = 소모품 칸: 2·3·4·6 (전엔 스킬까지 넣느라 2·4·6·8) */
  { name: '전투 장구 벨트', slots: 4, lvl: 10, price: 4000 },
  { name: '특수부대 장구류', slots: 6, lvl: 18, price: 12000 },
];
const HOT_MAX = 6;

// v1.23 패시브 트리: 특성(위 PERK_TIERS)을 세 갈래로 나눠 트리로 보여 줌. 단계마다 고르는 규칙은 그대로 (3개 중 1개, 무료)
// 특성 사이의 「단련」 노드는 크레딧으로 삼 (캠프에서, 위에서부터 차례로, 되돌리기 없음)
// 같은 갈래 특성을 3개 이상 고르면 갈래 보너스
const PERK_BRANCH = { rollStrike: 'atk', scavenger: 'tac', thickSkin: 'sur', lastRounds: 'atk', runner: 'tac', brawler: 'sur',
  executioner: 'atk', steadyAim: 'tac', fieldMedic: 'sur', killStreak: 'atk', demolition: 'tac', lastStand: 'sur',
  bulletStorm: 'atk', treasure: 'tac', secondWind: 'sur', apex: 'atk', warlord: 'tac', ghost: 'sur' };
const PASSIVE_BRANCHES = {
  atk: { name: '공격', color: '#ff8a6a', bonus: '모든 피해 +8%' },
  tac: { name: '전술', color: '#6ab4ff', bonus: '스킬 재사용 대기 -10% · 회피 재사용 -20%' },
  sur: { name: '생존', color: '#6fdc6f', bonus: '최대 체력 +10%' },
};
const PASSIVES = {
  atk: [ { id: 'a1', name: '근접 단련', desc: '근접 피해 +6%', lvl: 7, price: 1500 }, { id: 'a2', name: '사격 단련', desc: '총기 피해 +6%', lvl: 12, price: 3000 },
         { id: 'a3', name: '급소 노리기', desc: '치명타 확률 +3%', lvl: 17, price: 5000 }, { id: 'a4', name: '치명상', desc: '치명타 피해 +15%', lvl: 22, price: 8000 },
         { id: 'a5', name: '살육', desc: '모든 피해 +5%', lvl: 27, price: 12000 } ],
  tac: [ { id: 't1', name: '빠른 손', desc: '재장전 속도 +10%', lvl: 7, price: 1500 }, { id: 't2', name: '호흡 조절', desc: '회피 재사용 -10%', lvl: 12, price: 3000 },
         { id: 't3', name: '전술 훈련', desc: '스킬 재사용 대기 -6%', lvl: 17, price: 5000 }, { id: 't4', name: '경량 장비', desc: '이동 속도 +4%', lvl: 22, price: 8000 },
         { id: 't5', name: '현장 감각', desc: '뒤지기 속도 +25% · 경험치 +5%', lvl: 27, price: 12000 } ],
  sur: [ { id: 's1', name: '강골', desc: '최대 체력 +5%', lvl: 7, price: 1500 }, { id: 's2', name: '보호대', desc: '방어력 +8%', lvl: 12, price: 3000 },
         { id: 's3', name: '회복력', desc: '체력 재생 +1/초', lvl: 17, price: 5000 }, { id: 's4', name: '응급 훈련', desc: '구급상자 회복량 +20%', lvl: 22, price: 8000 },
         { id: 's5', name: '철벽', desc: '받는 피해 -5%', lvl: 27, price: 12000 } ],
};

// v1.11 스킬 갈래: 스킬마다 2개 중 하나 (캠프에서 자유롭게 바꿈). 고르지 않으면 기본형
const SKILL_MODS = {
  rapid:   { a: { name: '정밀 사격', desc: '연사 +40% 대신 +18%로 낮추고 치명타 확률 +25%' },
             b: { name: '탄약 보급', desc: '발동 순간 탄창 가득 · 지속 중 탄약 소모 없음 (지속 -25%)' } },
  grenade: { a: { name: '집속탄', desc: '터진 뒤 작은 폭탄 4개가 흩어져 다시 폭발 (각 35%)' },
             b: { name: '소이탄', desc: '폭발 피해 -20% · 그 자리에 4초 불길 (초당 폭발 피해의 22%)' } },
  heal:    { a: { name: '재생 주사', desc: '즉시 절반 회복 + 6초 동안 나머지의 2배를 서서히 회복' },
             b: { name: '방어막', desc: '회복 + 4초 동안 받는 피해 -40%' } },
  turret:  { a: { name: '화염 포탑', desc: '사거리가 짧은 대신 앞쪽 적 여럿을 한꺼번에 태움 (0.2초마다)' },
             b: { name: '박격 포탑', desc: '느리지만 멀리(420) 포탄을 쏴 범위 폭발' } },
  adren:   { a: { name: '광폭', desc: '지속 중 처치할 때마다 지속 +1.5초 (최대 +8초)' },
             b: { name: '진통제', desc: '지속 중 받는 피해 -30% (피해 증가는 절반)' } },
};

// v1.25 스킬은 스킬 포인트(SP)로 배움: 시작 1 · 레벨 업마다 +1 · 장(챕터) 완료마다 +1 (Lv30까지 약 35) — 전부 배우려면 44라 골라야 함
// price · modPrice (크레딧)는 v1.16~1.24 기록용으로 남김
// v1.26 스킬 등급: 스킬마다 1~5등급 (등급마다 1 SP, 다음 등급은 2레벨마다) · 숙련 ← 2등급 · 숙달 ← 숙련 + 4등급 · 갈래 ← 5등급 · 궁극 ← 숙달 + 갈래
const SKILL_SP = { root: 1, r1: 1, r2: 1, a: 1, b: 1, cap: 2 };
const SKILL_RANKS = 5, RANK_BONUS = 0.06; // 등급마다 스킬 위력 +6% (5등급 +24%)
const rankLvl = (s, r) => s.lvl + (r - 1) * 2; // r등급을 찍을 수 있는 레벨
const skillResetCost = p => 300 + p.level * 120; // 캠프 상인 박씨: 스킬 초기화 (SP 전부 돌려받음)

// v1.22 스킬 트리: 스킬마다 한 갈래 (배우기 → 숙련 → 숙달 → 갈래 a/b → 궁극). 모두 박씨에게서 크레딧으로 삼 · 되돌리기 없음
// 선행: 숙련 ← 배우기 · 숙달 ← 숙련 · 갈래 ← 배우기 · 궁극 ← 숙달 + 갈래 하나
const SKILL_TREE = {
  rapid:   { r1: { name: '숙련 사격', desc: '지속 +1.5초', lvl: 4, price: 700 },
             r2: { name: '사격 숙달', desc: '재사용 대기 -15%', lvl: 8, price: 1600 },
             cap: { name: '사냥 본능', desc: '지속 중 처치할 때마다 지속 +0.6초 (최대 +4초)', lvl: 18, price: 8000 } },
  grenade: { r1: { name: '파편 증량', desc: '폭발 반경 +15%', lvl: 6, price: 1500 },
             r2: { name: '투척 숙달', desc: '재사용 대기 -15%', lvl: 10, price: 3000 },
             cap: { name: '연쇄 폭발', desc: '1초 뒤 같은 자리에서 한 번 더 폭발 (피해 50%)', lvl: 20, price: 9000 } },
  heal:    { r1: { name: '지혈대', desc: '회복량 +10%p (최대 70%)', lvl: 9, price: 2500 },
             r2: { name: '처치 숙달', desc: '재사용 대기 -15%', lvl: 13, price: 4000 },
             cap: { name: '불굴', desc: '발동하면 1.5초 동안 피해를 받지 않음', lvl: 22, price: 9000 } },
  turret:  { r1: { name: '보강 장갑', desc: '포탑 지속 +6초', lvl: 12, price: 0 },
             r2: { name: '이중 설치', desc: '포탑을 동시에 2개까지', lvl: 16, price: 0 },
             cap: { name: '자폭 프로토콜', desc: '포탑이 사라질 때 크게 폭발 (포탑 피해 ×6)', lvl: 22, price: 0 } },
  adren:   { r1: { name: '분노 조절', desc: '지속 +2초', lvl: 13, price: 5000 },
             r2: { name: '투지 숙달', desc: '재사용 대기 -15%', lvl: 16, price: 7000 },
             cap: { name: '전장의 함성', desc: '발동할 때 주변 적 1.5초 기절 (보스 0.4초)', lvl: 25, price: 12000 } },
};

// 임무는 js/quests.js (v0.7 챕터 구조)
