// 아트 에셋 목록 (v0.6 아트 파이프라인)
// 1) Gemini로 만든 시트를 tools/sprite-tool.html 에서 가공
// 2) 결과 PNG를 assets/ 폴더에 넣고, 도구가 보여주는 한 줄을 아래 sprites 안에 붙여넣기
// 등록되지 않았거나 파일을 못 읽으면 기존 도형 그래픽을 그대로 사용합니다.
const ART = {
  dir: 'assets/',
  title: 'title.png', // 타이틀 키아트 (예: 'title.png'). 없으면 코드로 그린 서울 야경
  charFill: 0.78, // 가공 도구와 같은 값 (대기 자세 키 / 칸 높이)
  charScale: 0.8, // v1.21 실제 스케일: 사람 키 1.75m = 약 35단위 (1m = 20단위) — 캐릭터 그림 전체 배율
  feetPad: 4,     // 가공 도구와 같은 값 (칸 바닥 ~ 발)
  fps: { idle: 6, walk: 8, /* v1.33 10 → 8 (느려진 걸음에 맞춰) */ attack: 16, hit: 12, death: 10 },
  // 화면에 표시할 대기 자세 키 (px)
  // player_vest 등 방어구별 몸 그림은 player 키를 따름
  height: { player: 44, zombie: 44, dog: 26, raider: 44, brute: 74, drone: 26, subject: 44, spitter: 50, sentry: 30, boss: 120, merchant: 44, captain: 44, medic: 44, mechanic: 44, deploy: 44, stash: 44,
    // v0.15 보스 전용 그림 (등록하면 기본 적 그림을 키워 쓰는 대신 이 그림 사용)
    glutton: 66, panther: 56, argos: 46, redfang: 50, viper: 58, goliath: 118, warden: 100, butcher: 58, cerberus: 50, colony: 118, chimera: 120, merc: 44, shield: 48, stalker: 46,
    raven: 54, babel: 120, hawk: 54, shade: 66, anvil: 62, queen: 118,
    comp: 44, resident_b: 42, resident_c: 42 }, // v1.49.3 동료·캠프 주민 (resident_c 노인은 허리가 굽음)
  // 플레이어 무기 그림 (옆모습 1장, 총구/날이 오른쪽). 플레이어 몸 그림은 무기 없이 만들고 이 그림을 손에 붙임
  // 없으면 코드로 그린 총·칼을 사용
  weapons: {
    // v1.7.2 Gemini 아트 9종 한 장 (인벤토리·바닥 아이콘도 이 그림)
    pipe: { file: 'weapons.png', rect: [0, 0, 320, 46] },
    pistol: { file: 'weapons.png', rect: [328, 0, 320, 209] },
    axe: { file: 'weapons.png', rect: [656, 0, 320, 129] },
    smg: { file: 'weapons.png', rect: [984, 0, 320, 175] },
    shotgun: { file: 'weapons.png', rect: [1312, 0, 320, 68] },
    rifle: { file: 'weapons.png', rect: [1640, 0, 320, 105] },
    katana: { file: 'weapons.png', rect: [1968, 0, 320, 51] },
    sniper: { file: 'weapons.png', rect: [2296, 0, 320, 79] },
    lmg: { file: 'weapons.png', rect: [2624, 0, 320, 114] },
  },
  // 화면에 그릴 무기 길이(px)와 손잡이 위치(그림 왼쪽에서 비율)
  weaponLen: { pipe: 30, pistol: 15, axe: 32, smg: 22, shotgun: 30, rifle: 32, katana: 38, sniper: 40, lmg: 36 },
  weaponGrip: { pipe: 0.15, pistol: 0.3, axe: 0.15, smg: 0.35, shotgun: 0.3, rifle: 0.32, katana: 0.12, sniper: 0.3, lmg: 0.35 },
  handY: 0.62,     // 손 높이 (플레이어 키 대비, 가슴 높이)
  handX: 0.1,      // 손이 몸 중심에서 앞으로 나온 정도 (플레이어 키 대비)
  // v1.7.7 무기를 든 몸 그림의 그룹: player[_방어구]_그룹 그림이 있으면 그 몸을 쓰고 무기를 따로 붙이지 않음 (근접 무기는 기존 방식)
  weaponGroup: { pistol: 'pistol', smg: 'long', shotgun: 'long', rifle: 'long', sniper: 'long', lmg: 'long',
    pipe: 'heavy', axe: 'heavy', katana: 'blade' }, // v1.7.9 근접 그룹 · v1.8.0 근접은 모두 둔기(도끼) 그림으로 통일 · v1.31 블레이드는 칼 든 몸 그림
  // v1.8.1 총을 든 몸 그림 속 총구 위치 (발 기준, 플레이어 키 대비: 앞으로, 위로) — 그림에서 측정
  muzzle: { long: [0.61, 0.71], pistol: [0.42, 0.73] },
  handFromHead: { x: 0.1, y: 0.46 }, // v1.7.5 손 위치 = 이번 프레임 머리 꼭대기에서 (앞으로 x, 아래로 y) × 플레이어 키
  weaponThick: 1.7, // 코드로 그린 총의 세로 과장 배율 (작은 화면에서 실처럼 가늘어 보이지 않게)
  weaponThickArt: 1.0, // v1.7.6 무기 그림의 세로 배율 (그림은 원래 비율 그대로 — 1.7배였을 때 권총이 덩어리처럼 보였음)

  // 헬멧 그림 (1장, 오른쪽을 보는 3/4 시점). 몸 그림의 프레임별 머리 위치(heads)에 씌움
  helmets: {
    // v1.7.4 Gemini 아트 4종 한 장 (인벤토리 아이콘도 이 그림)
    cap: { file: 'helmets.png', rect: [0, 0, 180, 208] },
    tacHelmet: { file: 'helmets.png', rect: [188, 0, 212, 208] },
    gasmask: { file: 'helmets.png', rect: [408, 0, 188, 228] },
    exoHelm: { file: 'helmets.png', rect: [604, 0, 164, 204] },
  },
  helmetFit: { w: 1.35, up: 0.18 }, // 헬멧 폭 = 머리 폭 × w, 머리 꼭대기보다 (헬멧 폭 × up) 만큼 위에서 시작

  // v1.18 소품 그림 (가공 도구의 「v1.18 … 소품」 한 장 모드). 등록한 것만 코드 그림 대신 그림으로 바뀜
  // 예: lamp: { file: 'props_street.png', rect: [0, 0, 120, 300] },
  // v1.47 간판 판 (글자 없는 판 · 한글은 게임이 씀) — 가로 5 · 세로 5 · 문 위 4 · 고장 3
  signs: {
    wide: { file: 'signs/sign_wide.png', rects: [[8,5,496,102],[11,113,490,97],[9,216,494,99],[10,321,493,92],[3,416,506,92]],
      ink: ['#ff6a4a', '#2a2622', '#7af0ff', '#fff2e0', '#ffe27a'], glow: ['#ff5a3a', null, '#3bd6ff', null, '#ffd23b'] },
    tall: { file: 'signs/sign_tall.png', rects: [[6,6,94,276],[109,4,92,276],[210,4,92,276],[312,4,92,278],[414,6,92,276]],
      ink: ['#ff6a4a', '#2a2622', '#7af0ff', '#8aff8a', '#2a1c10'], glow: ['#ff5a3a', null, '#3bd6ff', '#5dff6a', null] },
    door: { file: 'signs/sign_door.png', rects: [[8,3,496,104],[9,113,494,97],[6,216,498,178],[4,400,503,109]],
      ink: ['#2a1c08', '#1a2a4a', '#f2ecd8', '#f2e2c0'], bh: [1, 1, 0.55, 1] }, // bh: 판 높이 비율 (3번은 아래 차양 포함)
    broken: { file: 'signs/sign_broken.png', rects: [[4,98,162,102],[175,98,162,89],[346,84,162,112]], ink: ['#9a7a5a', '#8a9aa8', '#7a6a5a'] },
  },
  props: { // v1.31 Gemini 소품 8장 (64종) — 덩어리 추출로 자른 아틀라스 · mirror = 그림이 반대 방향이라 뒤집어 씀
    // props_street.png
    barrel: { file: 'props_street.png', rect: [489, 4, 84, 146] },
    bench: { file: 'props_street.png', rect: [304, 184, 168, 164], mirror: true },
    cone: { file: 'props_street.png', rect: [383, 4, 102, 130] },
    deadtree: { file: 'props_street.png', rect: [126, 4, 96, 158] },
    hydrant: { file: 'props_street.png', rect: [671, 4, 72, 137] },
    lamp: { file: 'props_lamp.png', rect: [4, 200, 313, 518], ax: 0.093 }, // v1.31.2 다시 그린 가로등 (기둥이 그림 왼쪽 → ax = 기둥 위치)
    signal: { file: 'props_street.png', rect: [476, 184, 251, 178] },
    trash: { file: 'props_street.png', rect: [226, 4, 153, 122] },
    tree: { file: 'props_street.png', rect: [4, 4, 118, 176] },
    // props_vehicle.png
    bus: { file: 'props_vehicle.png', rect: [294, 207, 380, 303], mirror: true },
    car_a: { file: 'props_vehicle.png', rect: [4, 4, 276, 173], mirror: true },
    car_b: { file: 'props_vehicle.png', rect: [284, 4, 268, 199], mirror: true },
    car_burnt: { file: 'props_vehicle.png', rect: [678, 207, 276, 173], mirror: true },
    car_c: { file: 'props_vehicle.png', rect: [556, 4, 257, 182], mirror: true },
    police: { file: 'props_vehicle.png', rect: [4, 207, 286, 179], mirror: true },
    // props_object.png
    airdrop: { file: 'props_object.png', rect: [799, 4, 166, 149] },
    bag: { file: 'props_object.png', rect: [551, 4, 115, 119] },
    dumpster: { file: 'props_object.png', rect: [271, 4, 172, 176] },
    generator: { file: 'props_object.png', rect: [146, 194, 158, 148] },
    labcase: { file: 'props_object.png', rect: [4, 4, 152, 127] },
    locker: { file: 'props_object.png', rect: [447, 4, 100, 186] },
    mine: { file: 'props_object.png', rect: [308, 194, 70, 51] },
    nest: { file: 'props_object.png', rect: [382, 194, 268, 162] },
    safe: { file: 'props_object.png', rect: [670, 4, 125, 167] },
    // props_camp.png
    campfire: { file: 'props_camp.png', rect: [375, 182, 188, 105] },
    container: { file: 'props_camp.png', rect: [567, 182, 235, 218] },
    crates: { file: 'props_camp.png', rect: [487, 4, 191, 147] },
    maptable: { file: 'props_camp.png', rect: [4, 182, 187, 151] },
    radio: { file: 'props_camp.png', rect: [285, 182, 86, 242] },
    sandbags: { file: 'props_camp.png', rect: [806, 182, 178, 160] },
    tent: { file: 'props_camp.png', rect: [4, 4, 238, 165] },
    tent_medic: { file: 'props_camp.png', rect: [246, 4, 237, 166] },
    workbench: { file: 'props_camp.png', rect: [682, 4, 172, 174] },
    // v1.49.3 캠프가 커질 때 생기는 것 (props_growth.png)
    camp_laundry: { file: 'props_growth.png', rect: [4, 4, 453, 430] }, camp_garden: { file: 'props_growth.png', rect: [461, 4, 459, 331] },
    camp_lights: { file: 'props_growth.png', rect: [4, 438, 396, 440] }, camp_flag: { file: 'props_growth.png', rect: [404, 438, 250, 463], ax: 0.13 },
    // props_deco.png
    acunit: { file: 'props_deco.png', rect: [4, 180, 134, 146] },
    antenna: { file: 'props_deco.png', rect: [142, 180, 111, 158] },
    cart: { file: 'props_deco.png', rect: [449, 180, 128, 161] },
    debris: { file: 'props_deco.png', rect: [581, 180, 227, 145] },
    rubble_a: { file: 'props_deco.png', rect: [4, 4, 270, 149] },
    rubble_b: { file: 'props_deco.png', rect: [278, 4, 199, 110] },
    slab: { file: 'props_deco.png', rect: [481, 4, 292, 172] },
    tires: { file: 'props_deco.png', rect: [257, 180, 188, 134] },
    watertank: { file: 'props_deco.png', rect: [777, 4, 117, 167] },
    // props_seoul.png
    busstop: { file: 'props_seoul.png', rect: [4, 4, 346, 267], mirror: true },
    cross: { file: 'props_seoul.png', rect: [393, 529, 88, 243] },
    pocha: { file: 'props_seoul.png', rect: [354, 4, 342, 258] },
    pole: { file: 'props_seoul.png', rect: [700, 4, 120, 521] },
    scooter: { file: 'props_seoul.png', rect: [824, 4, 170, 164] },
    subway: { file: 'props_seoul.png', rect: [4, 529, 385, 246] },
    // props_interior1.png
    in_books: { file: 'props_interior1.png', rect: [443, 4, 148, 205], mirror: true },
    in_cafe: { file: 'props_interior1.png', rect: [154, 233, 188, 161] },
    in_elec: { file: 'props_interior1.png', rect: [758, 4, 243, 225], mirror: true },
    in_food: { file: 'props_interior1.png', rect: [346, 233, 196, 149] },
    in_mart: { file: 'props_interior1.png', rect: [4, 233, 146, 204], mirror: true },
    in_pc: { file: 'props_interior1.png', rect: [677, 233, 187, 183] },
    in_pharma: { file: 'props_interior1.png', rect: [238, 4, 201, 199], mirror: true },
    in_snack: { file: 'props_interior1.png', rect: [4, 4, 230, 205], mirror: true },
    in_washer: { file: 'props_interior1.png', rect: [546, 233, 127, 166] },
    // props_interior2.png
    in_bank: { file: 'props_interior2.png', rect: [525, 4, 167, 177] },
    in_bed: { file: 'props_interior2.png', rect: [193, 323, 182, 158] },
    in_boxes: { file: 'props_interior2.png', rect: [625, 185, 155, 125] },
    in_chair: { file: 'props_interior2.png', rect: [364, 185, 126, 98] },
    in_crate: { file: 'props_interior2.png', rect: [696, 4, 153, 131] },
    in_crate_open: { file: 'props_interior2.png', rect: [4, 185, 176, 134] },
    in_debris: { file: 'props_interior2.png', rect: [784, 185, 184, 97] },
    in_hosp: { file: 'props_interior2.png', rect: [4, 4, 193, 158] },
    in_police: { file: 'props_interior2.png', rect: [363, 4, 158, 148] },
    // props_turret.png (v1.31.2 · 윗줄 3개 사용)
    turret: { file: 'props_turret.png', rect: [4, 4, 258, 231] }, turret_flame: { file: 'props_turret.png', rect: [266, 4, 271, 246] }, turret_mortar: { file: 'props_turret.png', rect: [541, 4, 256, 230] },
  },
  // v1.35.1 아이콘 그림 (프롬프트 17 · icons_gear / icons_items / icons_skills) — 키는 아이콘 이름 (vest · medkit · ammo_pistol · rapid · roll …)
  // 예: vest: { file: 'icons_gear.png', rect: [x, y, w, h] } · 없으면 코드 아이콘
  icons: {
    // v1.49.12 총기 부품 12종 (프롬프트 22)
    att_reddot: { file: 'icons_attach1.png', rect: [4, 4, 169, 164] }, att_scope2: { file: 'icons_attach1.png', rect: [177, 4, 224, 202] }, att_scope4: { file: 'icons_attach1.png', rect: [405, 4, 322, 246] }, att_suppressor: { file: 'icons_attach1.png', rect: [4, 254, 297, 246] }, att_comp: { file: 'icons_attach1.png', rect: [305, 254, 224, 172] }, att_choke: { file: 'icons_attach1.png', rect: [533, 254, 221, 172] }, att_vgrip: { file: 'icons_attach1.png', rect: [758, 254, 134, 282] }, att_agrip: { file: 'icons_attach1.png', rect: [4, 540, 259, 174] }, att_laser: { file: 'icons_attach1.png', rect: [267, 540, 233, 159] },
    att_extmag: { file: 'icons_attach2.png', rect: [4, 4, 185, 308] }, att_dualmag: { file: 'icons_attach2.png', rect: [193, 4, 259, 293] }, att_drum: { file: 'icons_attach2.png', rect: [456, 4, 241, 281] },
    vest: { file: 'icons_gear.png', rect: [4, 4, 160, 208] }, tactical: { file: 'icons_gear.png', rect: [168, 4, 194, 215] }, military: { file: 'icons_gear.png', rect: [366, 4, 226, 222] }, medkit: { file: 'icons_gear.png', rect: [792, 4, 155, 155] }, exo: { file: 'icons_gear.png', rect: [4, 230, 259, 261] }, belt: { file: 'icons_gear.png', rect: [267, 230, 234, 132] }, ammo: { file: 'icons_gear.png', rect: [505, 230, 222, 233] }, scrap: { file: 'icons_gear.png', rect: [731, 230, 196, 129] },
    molotov: { file: 'icons_items.png', rect: [4, 4, 189, 246] }, flash: { file: 'icons_items.png', rect: [197, 4, 116, 231] }, mine: { file: 'icons_items.png', rect: [317, 4, 227, 174] }, stim: { file: 'icons_items.png', rect: [548, 4, 193, 204] }, ammo_pistol: { file: 'icons_items.png', rect: [745, 4, 194, 157] }, plate: { file: 'icons_items.png', rect: [4, 254, 176, 232] }, ammo_shell: { file: 'icons_items.png', rect: [184, 254, 195, 225] }, ammo_sniper: { file: 'icons_items.png', rect: [383, 254, 199, 124] }, ammo_auto: { file: 'icons_items.png', rect: [586, 254, 127, 254] },
    rapid: { file: 'icons_skills.png', rect: [4, 4, 231, 238] }, grenade: { file: 'icons_skills.png', rect: [239, 4, 231, 238] }, heal: { file: 'icons_skills.png', rect: [474, 4, 231, 238] }, adren: { file: 'icons_skills.png', rect: [4, 246, 235, 240] }, turret: { file: 'icons_skills.png', rect: [243, 246, 233, 240] }, roll: { file: 'icons_skills.png', rect: [717, 246, 235, 240] },
  },
  // 소품 그림을 화면에 놓는 크기: w = 화면 가로(px, 확대 1배 기준) · y = 그림 아래쪽을 바닥 점보다 얼마나 아래에 둘지
  propFit: {
    lamp: { w: 66, y: 2 }, tree: { w: 92, y: 4 }, deadtree: { w: 78, y: 4 }, /* v1.21 실제 스케일 */ trash: { w: 34, y: 4 }, cone: { w: 13, y: 2 }, barrel: { w: 19, y: 3 },
    hydrant: { w: 15, y: 2 }, bench: { w: 40, y: 6 }, signal: { w: 64, y: 2 },
    car_a: { w: 92, y: 18 }, car_b: { w: 96, y: 18 }, car_c: { w: 92, y: 18 }, police: { w: 92, y: 18 }, bus: { w: 210, y: 40 }, car_burnt: { w: 92, y: 18 }, /* v1.21 2칸 승용차 · 5칸 버스 */
    dumpster: { w: 38, y: 8 }, locker: { w: 24, y: 6 }, labcase: { w: 26, y: 6 }, bag: { w: 20, y: 3 }, safe: { w: 34, y: 8 }, airdrop: { w: 38, y: 8 }, generator: { w: 40, y: 8 }, nest: { w: 96, y: 12 }, mine: { w: 18, y: 3 },
    tent: { w: 86, y: 18 }, tent_medic: { w: 86, y: 18 }, crates: { w: 48, y: 10 }, workbench: { w: 56, y: 10 }, maptable: { w: 50, y: 10 }, radio: { w: 40, y: 8 }, campfire: { w: 36, y: 6 }, container: { w: 70, y: 16 }, sandbags: { w: 54, y: 8 },
    camp_laundry: { w: 92, y: 10 }, camp_garden: { w: 84, y: 14 }, camp_lights: { w: 84, y: 6 }, camp_flag: { w: 46, y: 3 }, // v1.49.3
    rubble_a: { w: 60, y: 10 }, rubble_b: { w: 56, y: 10 }, slab: { w: 64, y: 12 }, watertank: { w: 26, y: 6 }, acunit: { w: 24, y: 6 }, antenna: { w: 22, y: 2 }, tires: { w: 30, y: 5 }, cart: { w: 30, y: 5 }, debris: { w: 46, y: 8 },
    // v1.25 건물 내부 (상가마다 진열대·탁자 등 한 칸짜리 · 장식은 그림이 있을 때만 바닥에 흩어 놓음)
    in_snack: { w: 34, y: 6 }, in_pharma: { w: 34, y: 6 }, in_books: { w: 34, y: 6 }, in_elec: { w: 34, y: 6 }, in_mart: { w: 34, y: 6 }, in_cafe: { w: 30, y: 6 },
    in_food: { w: 30, y: 6 }, in_washer: { w: 26, y: 5 }, in_pc: { w: 32, y: 6 },
    in_bank: { w: 34, y: 6 }, in_hosp: { w: 34, y: 6 }, in_police: { w: 34, y: 6 }, in_crate: { w: 26, y: 5 }, in_crate_open: { w: 26, y: 5 },
    in_chair: { w: 18, y: 3 }, in_boxes: { w: 24, y: 4 }, in_debris: { w: 30, y: 4 }, in_bed: { w: 40, y: 7 },
    turret: { w: 40, y: 5 }, turret_flame: { w: 40, y: 5 }, turret_mortar: { w: 42, y: 5 }, /* v1.31.2 포탑 */
    pole: { w: 30, y: 2 }, busstop: { w: 72, y: 10 }, pocha: { w: 74, y: 12 }, scooter: { w: 30, y: 4 }, subway: { w: 84, y: 14 }, cross: { w: 22, y: 2 }, /* v1.22 서울 거리 소품 */
  },

  // v1.19 건물 질감 (가공 도구의 「v1.19 건물 외벽 / 옥상 질감」). 외벽 = 건물 한 칸 × 한 층의 정면 그림, 옥상 = 위에서 본 바닥
  // 등록하면 건물 벽·옥상에 기울여 붙임 (없으면 코드로 그린 벽·창문)
  tex: { // v1.31 Gemini 질감 4장 — 외벽 6종 + 변형 5종 · 옥상 3종 · 실내 바닥 6종
    // v1.35.1 외벽은 tex_tall1~6 (세로 3:5) 로 바뀜 — 아래 키들은 그 그림을 가리킴
    // tex_facade.png
    f_apartment: { file: 'tex_tall1.png', rect: [3, 3, 332, 566] },
    f_brick: { file: 'tex_tall1.png', rect: [346, 3, 332, 566] },
    f_office: { file: 'tex_tall1.png', rect: [690, 3, 331, 566] },
    f_glass: { file: 'tex_tall2.png', rect: [3, 3, 332, 566] },
    f_burnt: { file: 'tex_tall2.png', rect: [346, 3, 332, 566] },
    f_shop: { file: 'tex_facade.png', rect: [661, 283, 317, 266] },
    // tex_facade2.png
    f_apartment2: { file: 'tex_tall2.png', rect: [689, 3, 332, 566] },
    f_brick2: { file: 'tex_tall3.png', rect: [3, 3, 332, 566] },
    f_office2: { file: 'tex_tall3.png', rect: [347, 3, 330, 566] },
    f_glass2: { file: 'tex_tall3.png', rect: [689, 3, 332, 566] },
    f_burnt2: { file: 'tex_tall4.png', rect: [3, 3, 332, 566] },
    // tex_roof.png
    r_concrete: { file: 'tex_roof.png', rect: [7, 7, 330, 342] },
    r_gravel: { file: 'tex_roof.png', rect: [347, 7, 330, 342] },
    r_tar: { file: 'tex_roof.png', rect: [687, 7, 330, 341] },
    // tex_floor.png
    fl_tile: { file: 'tex_floor.png', rect: [7, 7, 269, 273] },
    fl_wood: { file: 'tex_floor.png', rect: [286, 7, 264, 274] },
    fl_lino: { file: 'tex_floor.png', rect: [560, 7, 274, 274] },
    fl_carpet: { file: 'tex_floor.png', rect: [7, 291, 270, 275] },
    fl_marble: { file: 'tex_floor.png', rect: [287, 291, 265, 275] },
    fl_concrete: { file: 'tex_floor.png', rect: [562, 291, 280, 274] },
    // tex_street.png (v1.31.2 바닥 · 4×4칸에 나눠 펼침) — 아스팔트는 가장자리 차선을 잘라 냄
    gr_asphalt: { file: 'tex_street.png', rect: [28, 8, 198, 262] }, gr_sidewalk: { file: 'tex_street.png', rect: [263, 5, 243, 269] }, gr_grass: { file: 'tex_street.png', rect: [518, 5, 243, 269] },
    gr_grass2: { file: 'tex_street.png', rect: [773, 5, 244, 269] }, gr_dirt: { file: 'tex_street.png', rect: [7, 286, 244, 270] }, gr_water: { file: 'tex_street.png', rect: [263, 286, 243, 270] },
    gr_plaza: { file: 'tex_street.png', rect: [519, 286, 242, 270] },
    // tex_vines.png (v1.31.2 · 가운데 칸만)
    f_vines: { file: 'tex_vines.png', rect: [178, 2, 668, 1020] },
    // tex_ground.png (v1.31.2)
    g_shutter: { file: 'tex_ground.png', rect: [7, 5, 191, 268] }, g_glass: { file: 'tex_ground.png', rect: [212, 4, 190, 269] }, g_awning: { file: 'tex_ground.png', rect: [417, 5, 190, 268] },
    g_awning2: { file: 'tex_ground.png', rect: [622, 5, 190, 268] }, g_realty: { file: 'tex_ground.png', rect: [827, 5, 189, 267] }, g_salon: { file: 'tex_ground.png', rect: [7, 286, 191, 270] },
    g_grille: { file: 'tex_ground.png', rect: [211, 286, 191, 270] }, g_salon2: { file: 'tex_ground.png', rect: [417, 286, 190, 270] }, g_karaoke: { file: 'tex_ground.png', rect: [622, 287, 191, 269] },
    g_empty: { file: 'tex_ground.png', rect: [826, 286, 191, 270] },
    // tex_facade3.png (v1.31.2)
    f_tile: { file: 'tex_tall4.png', rect: [346, 3, 331, 566] }, f_villa: { file: 'tex_tall4.png', rect: [689, 3, 332, 566] }, f_corridor: { file: 'tex_tall5.png', rect: [3, 3, 332, 566] },
    f_signframe: { file: 'tex_tall5.png', rect: [346, 3, 332, 566] }, f_motel: { file: 'tex_tall5.png', rect: [689, 3, 332, 566] }, f_military: { file: 'tex_tall6.png', rect: [3, 3, 333, 566] },
    f_stone: { file: 'tex_tall6.png', rect: [345, 3, 333, 566] }, f_scaffold: { file: 'tex_tall6.png', rect: [689, 3, 332, 566] },
    // tex_shopfront1.png (v1.31.2)
    sf_conv: { file: 'tex_shopfront1.png', rect: [3, 3, 330, 333] }, sf_pharma: { file: 'tex_shopfront1.png', rect: [346, 3, 331, 333] }, sf_bank: { file: 'tex_shopfront1.png', rect: [692, 3, 329, 334] },
    sf_cafe: { file: 'tex_shopfront1.png', rect: [3, 351, 330, 329] }, sf_hosp: { file: 'tex_shopfront1.png', rect: [347, 351, 330, 329] }, sf_mart: { file: 'tex_shopfront1.png', rect: [692, 351, 329, 329] },
    // tex_shopfront2.png (v1.31.2)
    sf_pc: { file: 'tex_shopfront2.png', rect: [3, 3, 329, 334] }, sf_police: { file: 'tex_shopfront2.png', rect: [346, 3, 332, 333] }, sf_food: { file: 'tex_shopfront2.png', rect: [692, 3, 329, 334] },
    sf_elec: { file: 'tex_shopfront2.png', rect: [3, 351, 329, 329] }, sf_books: { file: 'tex_shopfront2.png', rect: [347, 351, 331, 329] }, sf_laundry: { file: 'tex_shopfront2.png', rect: [692, 351, 329, 329] },
  },
  // 지역마다 쓰는 외벽 (zone 번호 → 후보). 1층은 f_shop. 강남 유리 고층은 항상 f_glass
  // v1.25 실내 바닥 질감 (가공 도구 「v1.25 실내 바닥 질감 6종」 → tex 안에 붙여넣기). 2×2칸에 한 장을 펼침
  // 상가 이름 → 소품 그림 · 바닥 질감 · 장식 (없는 그림은 지금처럼 코드로 그림)
  shopArt: {
    편의점: { obj: 'in_snack', floor: 'fl_tile', front: 'sf_conv' }, 약국: { obj: 'in_pharma', floor: 'fl_lino', front: 'sf_pharma' }, 마트: { obj: 'in_mart', floor: 'fl_tile', front: 'sf_mart' },
    서점: { obj: 'in_books', floor: 'fl_wood', front: 'sf_books' }, 전자상가: { obj: 'in_elec', floor: 'fl_tile', front: 'sf_elec' }, 카페: { obj: 'in_cafe', floor: 'fl_wood', front: 'sf_cafe' },
    분식집: { obj: 'in_food', floor: 'fl_concrete', front: 'sf_food' }, 은행: { obj: 'in_bank', floor: 'fl_marble', front: 'sf_bank' }, 병원: { obj: 'in_hosp', floor: 'fl_lino', deco: 'in_bed', front: 'sf_hosp' },
    파출소: { obj: 'in_police', floor: 'fl_marble', front: 'sf_police' }, PC방: { obj: 'in_pc', floor: 'fl_carpet', front: 'sf_pc' }, 세탁소: { obj: 'in_washer', floor: 'fl_concrete', front: 'sf_laundry' },
  },
  // v1.31.1 지역마다 외벽 후보 — 그림이 없는 키는 건너뜀 (f_tile·f_villa… 는 v1.31.1 프롬프트 15-2)
  texZones: { 0: ['f_apartment', 'f_brick', 'f_apartment2', 'f_villa', 'f_tile'],
    1: ['f_brick', 'f_apartment', 'f_office', 'f_brick2', 'f_apartment2', 'f_signframe', 'f_tile', 'f_motel'],
    2: ['f_brick', 'f_apartment', 'f_brick2', 'f_apartment2', 'f_tile', 'f_villa', 'f_vines', 'f_signframe'],
    3: ['f_office', 'f_burnt', 'f_apartment', 'f_office2', 'f_military', 'f_scaffold', 'f_signframe'], // v1.40.2 f_burnt2(무너진 벽 구멍)는 건물 전체에 줄지어 기괴해서 뺌
    4: ['f_office', 'f_glass', 'f_burnt', 'f_office2', 'f_stone', 'f_scaffold'],
    6: ['f_glass', 'f_office', 'f_glass2', 'f_office2', 'f_stone'],
    7: ['f_apartment', 'f_burnt', 'f_brick', 'f_apartment2', 'f_corridor', 'f_villa', 'f_vines'] },
  // v1.31.1 일반 건물 1층 상가: 칸·면마다 이 중 하나 (f_shop + 프롬프트 15-1의 9종)
  groundSet: ['f_shop', 'g_shutter', 'g_glass', 'g_awning', 'g_awning2', 'g_phone', 'g_grille', 'g_salon', 'g_salon2', 'g_realty', 'g_karaoke', 'g_empty'], // v1.31 변형(…2) 섞어 반복 줄이기

  // 랜드마크 건물 그림 (가공 도구의 "랜드마크" 항목으로 가공). 없으면 코드로 그린 건물 사용
  landmarks: {
    // v1.7.3 Gemini 아트 6채
    cathedral: { file: 'cathedral.png' },
    bosingak: { file: 'bosingak.png' },
    base: { file: 'base.png' },
    tower63: { file: 'tower63.png' },
    coex: { file: 'coex.png' },
    lotte: { file: 'lotte.png' },
  },
  sprites: {
    // 예시 (도구가 만들어 주는 형식):
    // zombie: { file: 'zombie.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 6] } },

    // v1.7.2 Gemini 아트 (art_raw → 가공 도구): 기본 몸 + 방어구 4종
    player: { file: 'player.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], hit: [2, 2], death: [3, 5] }, headW: 19, heads: { idle: [[4,-100],[4,-100],[4,-100],[4,-100]], walk: [[5,-97],[-1,-97],[0,-95],[2,-94],[3,-95],[-2,-95],[2,-95],[0,-93]], hit: [[-4,-99],[13,-95]], death: [[3,-100],[-36,-86],[-49,-79],[-52,-56],[-36,-51]] } },
    player_vest: { file: 'player_vest.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], hit: [2, 2], death: [3, 5] }, headW: 20, heads: { idle: [[3,-102],[3,-99],[3,-102],[3,-99]], walk: [[4,-95],[-1,-98],[-1,-95],[2,-95],[2,-95],[-2,-95],[2,-95],[-1,-95]], hit: [[-3,-99],[13,-102]], death: [[4,-100],[-34,-84],[-49,-80],[-52,-57],[-35,-50]] } },
    player_tactical: { file: 'player_tactical.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], hit: [2, 2], death: [3, 5] }, headW: 19, heads: { idle: [[4,-100],[3,-100],[4,-101],[4,-101]], walk: [[5,-94],[-1,-97],[-1,-95],[2,-94],[3,-95],[-2,-96],[2,-95],[0,-95]], hit: [[-4,-98],[14,-105]], death: [[3,-100],[-35,-86],[-49,-79],[-52,-57],[-36,-51]] } },
    player_military: { file: 'player_military.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], hit: [2, 2], death: [3, 5] }, headW: 19, heads: { idle: [[4,-100],[3,-100],[4,-100],[4,-101]], walk: [[5,-96],[-1,-99],[-1,-95],[3,-95],[3,-97],[-2,-96],[2,-95],[-1,-95]], hit: [[-5,-99],[13,-95]], death: [[3,-100],[-37,-89],[-52,-83],[-47,-51],[-36,-51]] } },
    player_exo: { file: 'player_exo.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], hit: [2, 2], death: [3, 5] }, headW: 19, heads: { idle: [[4,-100],[4,-101],[5,-101],[4,-100]], walk: [[5,-96],[-1,-99],[-2,-95],[3,-96],[4,-95],[-3,-96],[2,-95],[-1,-95]], hit: [[-9,-99],[14,-96]], death: [[11,-96],[-41,-88],[-53,-77],[-52,-58],[-54,-55]] } },
    // v1.7.3 Gemini 아트: 적 12종 · NPC 3명
    zombie: { file: 'zombie.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5, [0, 2, 3, 4]] } },
    dog: { file: 'dog.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    raider: { file: 'raider.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 6, [0, 2, 3, 4, 5]] } },
    brute: { file: 'brute.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    drone: { file: 'drone.png', cell: 128, w: 192, anims: { idle: [0, 4], attack: [1, 4], hit: [2, 2], death: [3, 6] } },
    merc: { file: 'merc.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    subject: { file: 'subject.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    spitter: { file: 'spitter.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    sentry: { file: 'sentry.png', cell: 128, w: 192, anims: { idle: [0, 8], attack: [1, 8], hit: [2, 2], walk: [3, 4], death: [4, 6] } },
    shield: { file: 'shield.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 10], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    stalker: { file: 'stalker.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 10], attack: [2, 4], hit: [3, 2, [0, 0]], death: [4, 5, [3, 2, 4, 1, 0]] } },
    boss: { file: 'boss.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 6] } },
    deploy: { file: 'deploy.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    medic: { file: 'medic.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    merchant: { file: 'merchant.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    // v1.49.3 동료 3명 (돌격은 공격 줄 없음 → 대기 자세가 사격 자세) · 캠프 주민 3명 (작업복 아저씨 · 앞치마 아주머니 · 지팡이 할아버지)
    comp_assault: { file: 'comp_assault.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], hit: [2, 2], death: [3, 5] } },
    comp_sniper: { file: 'comp_sniper.png', cell: 128, w: 192, anims: { idle: [0, 3], walk: [1, 5], attack: [2, 3], hit: [3, 2], death: [4, 6] } },
    comp_medic: { file: 'comp_medic.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 5], attack: [2, 5], hit: [3, 2], death: [4, 6] } },
    resident_a: { file: 'resident_a.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8] } },
    resident_b: { file: 'resident_b.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 4] } },
    resident_c: { file: 'resident_c.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 4] } },
    // v1.7.4 Gemini 아트: NPC 3명 · 보스 먹보·흑표
    captain: { file: 'captain.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    mechanic: { file: 'mechanic.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    stash: { file: 'stash.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    glutton: { file: 'glutton.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 5], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    panther: { file: 'panther.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    // v1.7.8 무기를 든 몸 (장총 long · 권총 pistol) × 방어구 5종
    player_exo_long: { file: 'player_exo_long.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], death: [3, 6] }, headW: 19, heads: { idle: [[3,-97],[3,-101],[3,-97],[3,-101]], walk: [[3,-95],[-4,-99],[-2,-99],[2,-99],[3,-99],[-1,-95],[2,-95],[2,-95]], attack: [[2,-96],[15,-94],[0,-96]], death: [[-1,-98],[-18,-90],[-27,-84],[-11,-69],[-52,-56],[-24,-63]] } },
    player_exo_pistol: { file: 'player_exo_pistol.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[5,-98],[5,-94],[4,-98],[5,-98]], walk: [[5,-94],[-2,-97],[-2,-94],[2,-97],[3,-97],[-3,-94],[2,-94],[-1,-97]], attack: [[3,-92],[7,-94],[3,-96]], hit: [[16,-100],[4,-90]], death: [[10,-92],[-36,-87],[-49,-76],[-1,-63],[1,-60]] } },
    player_long: { file: 'player_long.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 6] }, headW: 21, heads: { idle: [[5,-99],[5,-99],[5,-99],[6,-99]], walk: [[4,-97],[-3,-93],[-3,-93],[-1,-98],[0,-94],[-1,-97]], attack: [[3,-96],[3,-96],[25,-96],[4,-101]], hit: [[16,-90],[-4,-94]], death: [[-62,-71],[-55,-95],[1,-84],[-30,-67],[-36,-52],[23,-49]] } },
    player_military_long: { file: 'player_military_long.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 3], death: [4, 5] }, headW: 19, heads: { idle: [[3,-98],[3,-102],[3,-102],[3,-98]], walk: [[1,-94],[-2,-94],[-3,-94],[1,-94],[0,-94],[-2,-94],[-5,-94],[-2,-91]], attack: [[1,-99],[-3,-90],[0,-94]], hit: [[1,-98],[-3,-92],[-11,-94]], death: [[-1,-100],[-37,-92],[-43,-68],[-7,-65],[11,-59]] } },
    player_military_pistol: { file: 'player_military_pistol.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[4,-98],[3,-94],[4,-99],[4,-98]], walk: [[2,-94],[0,-97],[-1,-94],[0,-94],[2,-97],[-2,-97],[2,-97],[2,-94]], attack: [[0,-98],[13,-95],[-4,-96]], hit: [[8,-97],[11,-93]], death: [[19,-97],[-47,-87],[-60,-84],[-19,-64],[7,-57]] } },
    player_pistol: { file: 'player_pistol.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 20, heads: { idle: [[4,-99],[5,-103],[5,-99],[6,-103]], walk: [[3,-95],[-2,-95],[0,-99],[2,-92],[4,-99],[-2,-96],[-3,-99],[3,-95]], attack: [[13,-103],[6,-98],[5,-98]], hit: [[1,-98],[22,-106]], death: [[-29,-94],[-49,-90],[-23,-54],[-3,-62],[14,-55]] } },
    player_tactical_long: { file: 'player_tactical_long.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[4,-97],[4,-101],[4,-97],[4,-97]], walk: [[5,-91],[-1,-94],[-2,-94],[3,-95],[3,-95],[-3,-94],[2,-95]], attack: [[2,-94],[1,-94],[1,-97]], hit: [[-16,-91],[18,-88]], death: [[-23,-92],[-31,-90],[-32,-80],[-10,-66],[-75,-51]] } },
    // v1.49.8 산탄총 든 몸 (프롬프트 21절) · v1.49.12 군용 강화복까지 5종
    player_shotgun: { file: 'player_shotgun.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[4,-100],[3,-95],[4,-100],[4,-100]], walk: [[6,-101],[-2,-101],[-3,-101],[-2,-101],[-1,-97],[0,-92],[-2,-101]], attack: [[-13,-93],[6,-102],[5,-102]], hit: [[-12,-102],[-13,-107]], death: [[2,-108],[-48,-95],[-50,-82],[-4,-53],[4,-51]] } },
    player_vest_shotgun: { file: 'player_vest_shotgun.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[4,-96],[4,-97],[4,-101],[4,-96]], walk: [[6,-97],[-2,-97],[-3,-97],[-1,-103],[-1,-93],[0,-89],[-1,-97]], attack: [[-14,-91],[3,-98],[5,-98]], hit: [[11,-96],[12,-97]], death: [[-9,-95],[-46,-92],[-50,-76],[-42,-44],[-39,-42]] } },
    player_tactical_shotgun: { file: 'player_tactical_shotgun.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[4,-99],[4,-99],[4,-99],[4,-99]], walk: [[6,-95],[1,-94],[0,-95],[4,-100],[5,-100],[-2,-103],[3,-95],[1,-95]], attack: [[-5,-92],[-9,-97],[7,-101]], hit: [[-17,-92],[-18,-91]], death: [[5,-108],[-49,-92],[-63,-79],[-53,-56],[-37,-52]] } },
    player_military_shotgun: { file: 'player_military_shotgun.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[6,-99],[6,-99],[7,-99],[5,-99]], walk: [[6,-96],[1,-91],[-1,-91],[3,-92],[4,-92],[-2,-100],[3,-92],[0,-92]], attack: [[7,-94],[2,-93],[6,-90],[10,-99]], hit: [[2,-94],[9,-99]], death: [[7,-98],[-37,-89],[-43,-81],[-52,-58],[-36,-51]] } },
    player_exo_shotgun: { file: 'player_exo_shotgun.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[0,-98],[1,-98],[0,-98],[0,-98]], walk: [[0,-94],[-8,-97],[-8,-96],[-4,-96],[-2,-96],[-8,-94],[-4,-91],[-7,-96]], attack: [[-2,-95],[17,-87],[18,-95]], hit: [[19,-95],[15,-92]], death: [[9,-93],[-28,-90],[-51,-75],[-20,-61],[-8,-62]] } },
    // v1.50.3 등 모습 (위로 겨눌 때 · 프롬프트 23) · v1.50.4 전술 조끼까지 5종
    player_back: { file: 'player_back.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8] }, headW: 19, heads: { idle: [[-1,-98],[-1,-98],[-1,-101],[-1,-101]], walk: [[0,-93],[-1,-93],[8,-93],[7,-96],[9,-93],[10,-93],[4,-91],[5,-91]] } },
    player_vest_back: { file: 'player_vest_back.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8] }, headW: 19, heads: { idle: [[0,-99],[-1,-99],[0,-99],[0,-104]], walk: [[0,-104],[0,-98],[2,-95],[2,-101],[4,-100],[2,-95],[3,-95],[2,-95]] } },
    player_tactical_back: { file: 'player_tactical_back.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8] }, headW: 19, heads: { idle: [[-3,-99],[-2,-92],[-3,-99],[-1,-101]], walk: [[3,-95],[0,-95],[-1,-95],[3,-92],[4,-92],[-2,-95],[3,-92],[-2,-100]] } },
    player_military_back: { file: 'player_military_back.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6] }, headW: 19, heads: { idle: [[-4,-100],[-4,-100],[-4,-100],[-4,-100]], walk: [[-2,-101],[-3,-101],[2,-97],[1,-97],[-4,-103],[4,-103]] } },
    player_exo_back: { file: 'player_exo_back.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8] }, headW: 19, heads: { idle: [[-3,-100],[-3,-100],[-3,-100],[-2,-104]], walk: [[3,-89],[0,-92],[-2,-96],[2,-96],[4,-93],[-3,-96],[2,-89],[-1,-96]] } },
    player_tactical_pistol: { file: 'player_tactical_pistol.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], death: [3, 5] }, headW: 19, heads: { idle: [[4,-98],[3,-98],[3,-102],[3,-102]], walk: [[2,-93],[-2,-93],[-2,-90],[1,-94],[2,-94],[-1,-94],[1,-94],[3,-94]], attack: [[1,-97],[8,-92],[1,-95]], death: [[7,-97],[-24,-88],[-54,-82],[-29,-65],[14,-56]] } },
    player_vest_long: { file: 'player_vest_long.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[5,-94],[6,-97],[6,-101],[6,-97]], walk: [[3,-91],[-1,-92],[1,-95],[2,-91],[4,-95],[-1,-92],[1,-95],[3,-95]], attack: [[3,-94],[5,-92],[2,-98]], hit: [[-11,-95],[-9,-90]], death: [[-4,-87],[-41,-81],[-58,-71],[-26,-83],[11,-57]] } },
    player_vest_pistol: { file: 'player_vest_pistol.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], death: [3, 5] }, headW: 20, heads: { idle: [[3,-98],[3,-98],[3,-102],[3,-98]], walk: [[4,-94],[-2,-97],[-1,-94],[2,-94],[2,-94],[-2,-94],[2,-94],[0,-94]], attack: [[-3,-98],[16,-95],[2,-92]], death: [[12,-77],[-49,-91],[-52,-70],[-53,-59],[-43,-50]] } },
    // v1.8.0 Gemini 아트: 보스 7종 · 둔기 든 몸 3종
    argos: { file: 'argos.png', cell: 128, w: 192, anims: { idle: [0, 4], attack: [1, 4], hit: [2, 2], death: [3, 5] } },
    babel: { file: 'babel.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2, [0, 0]], death: [4, 6] } },
    goliath: { file: 'goliath.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 4], hit: [3, 2], death: [4, 6, [0, 1, 2, 3, 4]] } },
    hawk: { file: 'hawk.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    raven: { file: 'raven.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    redfang: { file: 'redfang.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    viper: { file: 'viper.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    player_heavy: { file: 'player_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[5,-102],[4,-98],[4,-98],[4,-102]], walk: [[2,-94],[-2,-94],[1,-94],[2,-97],[2,-97],[1,-94],[0,-94],[-1,-94]], attack: [[-10,-94],[7,-91],[5,-93],[9,-89],[23,-94]], hit: [[13,-95],[11,-94]], death: [[11,-94],[9,-90],[-52,-73],[-53,-54],[-35,-50]] } },
    player_vest_heavy: { file: 'player_vest_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] }, headW: 20, heads: { idle: [[4,-98],[4,-98],[3,-98],[3,-102]], walk: [[5,-94],[-2,-97],[-1,-94],[2,-94],[2,-97],[-1,-94],[2,-94],[-1,-94]], attack: [[-9,-84],[-15,-96],[-14,-95],[6,-92]], hit: [[11,-96],[15,-89]], death: [[8,-105],[-29,-91],[-38,-80],[9,-56],[9,-56]] } },
    player_tactical_heavy: { file: 'player_tactical_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] }, headW: 20, heads: { idle: [[3,-98],[4,-98],[3,-98],[3,-102]], walk: [[5,-94],[-2,-97],[-1,-94],[2,-94],[3,-94],[-1,-94],[2,-94],[0,-94]], attack: [[-9,-84],[-15,-97],[-14,-95],[6,-92]], hit: [[11,-96],[15,-89]], death: [[7,-101],[-29,-91],[-36,-76],[9,-56],[9,-56]] } },
    // v1.31 Gemini 그림 2차: 보스 8종 · 블레이드 든 몸 5종 · 둔기 든 몸(군용·외골격) 2종
    anvil: { file: 'anvil.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    butcher: { file: 'butcher.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 5], attack: [2, 5], hit: [3, 2], death: [4, 5] } },
    cerberus: { file: 'cerberus.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    chimera: { file: 'chimera.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    colony: { file: 'colony.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    queen: { file: 'queen.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    shade: { file: 'shade.png', cell: 128, w: 307, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 4] } },
    warden: { file: 'warden.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    player_blade: { file: 'player_blade.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[4,-104],[4,-99],[4,-95],[4,-99]], walk: [[6,-99],[1,-98],[0,-95],[4,-99],[5,-104],[-2,-98],[1,-99],[1,-95]], attack: [[-11,-99],[-9,-100],[-10,-96],[5,-96]], hit: [[-1,-97],[12,-95]], death: [[-28,-99],[-33,-92],[-44,-82],[-13,-59],[6,-59]] } },
    player_vest_blade: { file: 'player_vest_blade.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 6] }, headW: 18, heads: { idle: [[4,-99],[3,-99],[3,-104],[3,-104]], walk: [[3,-95],[1,-98],[-1,-90],[2,-90],[2,-95],[-2,-98],[1,-90],[-1,-95]], attack: [[-18,-106],[18,-97],[-20,-92],[10,-92],[40,-98]], hit: [[-4,-97],[-1,-95]], death: [[5,-98],[-28,-92],[-27,-80],[-53,-56],[7,-58],[-36,-48]] } },
    player_tactical_blade: { file: 'player_tactical_blade.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 6] }, headW: 18, heads: { idle: [[4,-99],[4,-99],[4,-104],[4,-99]], walk: [[6,-95],[1,-94],[0,-95],[3,-95],[4,-100],[-3,-98],[3,-95],[1,-100]], attack: [[7,-100],[21,-96],[34,-96],[12,-96]], hit: [[-4,-97],[24,-89]], death: [[-4,-102],[-53,-89],[-40,-82],[-25,-66],[0,-58],[-3,-58]] } },
    player_military_blade: { file: 'player_military_blade.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 4], hit: [3, 2], death: [4, 6] }, headW: 18, heads: { idle: [[3,-99],[3,-99],[3,-99],[3,-99]], walk: [[6,-95],[1,-94],[-1,-98],[4,-100],[4,-95],[-2,-94],[3,-95]], attack: [[-17,-102],[-19,-95],[10,-96],[10,-96]], hit: [[-13,-99],[21,-90]], death: [[6,-103],[-52,-91],[-24,-84],[-55,-60],[-3,-56],[-3,-55]] } },
    player_exo_blade: { file: 'player_exo_blade.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[1,-99],[2,-99],[4,-100],[1,-95]], walk: [[2,-98],[-4,-98],[-5,-107],[-1,-98],[0,-102],[-8,-98],[-1,-107],[-2,-95]], attack: [[-2,-104],[6,-95],[23,-100],[9,-100],[5,-100]], hit: [[-14,-97],[-2,-100]], death: [[11,-97],[-26,-91],[-19,-85],[-19,-66],[-14,-61]] } },
    player_military_heavy: { file: 'player_military_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 5] }, headW: 18, heads: { idle: [[9,-102],[4,-99],[4,-95],[4,-99]], walk: [[3,-95],[0,-91],[1,-98],[2,-100],[4,-95],[1,-95],[2,-95],[1,-95]], attack: [[-10,-96],[7,-92],[6,-93],[10,-93],[24,-96]], hit: [[15,-101],[13,-98]], death: [[14,-99],[5,-91],[-61,-77],[-23,-67],[-1,-62]] } },
    player_exo_heavy: { file: 'player_exo_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 5] }, headW: 18, heads: { idle: [[4,-104],[3,-99],[4,-99],[5,-99]], walk: [[6,-98],[0,-94],[-1,-91],[3,-98],[4,-98],[-3,-94],[2,-95],[1,-95]], attack: [[-15,-97],[-1,-103],[2,-101],[2,-97],[2,-97]], hit: [[5,-96],[5,-98]], death: [[12,-97],[-30,-87],[-25,-79],[-22,-70],[-20,-66]] } },
  },
};
