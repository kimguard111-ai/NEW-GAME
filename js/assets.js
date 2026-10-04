// 아트 에셋 목록 (v0.6 아트 파이프라인)
// 1) Gemini로 만든 시트를 tools/sprite-tool.html 에서 가공
// 2) 결과 PNG를 assets/ 폴더에 넣고, 도구가 보여주는 한 줄을 아래 sprites 안에 붙여넣기
// 등록되지 않았거나 파일을 못 읽으면 기존 도형 그래픽을 그대로 사용합니다.
const ART = {
  dir: 'assets/',
  title: 'title.png', // 타이틀 키아트 (예: 'title.png'). 없으면 코드로 그린 서울 야경
  charFill: 0.78, // 가공 도구와 같은 값 (대기 자세 키 / 칸 높이)
  feetPad: 4,     // 가공 도구와 같은 값 (칸 바닥 ~ 발)
  fps: { idle: 6, walk: 10, attack: 16, hit: 12, death: 10 },
  // 화면에 표시할 대기 자세 키 (px)
  // player_vest 등 방어구별 몸 그림은 player 키를 따름
  height: { player: 44, zombie: 44, dog: 26, raider: 44, brute: 74, drone: 26, subject: 44, spitter: 50, sentry: 30, boss: 120, merchant: 44, captain: 44, medic: 44, mechanic: 44, deploy: 44, stash: 44,
    // v0.15 보스 전용 그림 (등록하면 기본 적 그림을 키워 쓰는 대신 이 그림 사용)
    glutton: 66, panther: 56, argos: 46, redfang: 50, viper: 58, goliath: 118, warden: 100, butcher: 58, cerberus: 50, colony: 118, chimera: 120, merc: 44, shield: 48, stalker: 46,
    raven: 54, babel: 120, hawk: 54, shade: 66, anvil: 62, queen: 118 },
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
    pipe: 'heavy', axe: 'heavy', katana: 'heavy' }, // v1.7.9 근접 그룹 · v1.8.0 근접은 모두 둔기(도끼) 그림으로 통일
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
    zombie: { file: 'zombie.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    dog: { file: 'dog.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    raider: { file: 'raider.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    brute: { file: 'brute.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    drone: { file: 'drone.png', cell: 128, w: 192, anims: { idle: [0, 4], attack: [1, 4], hit: [2, 2], death: [3, 6] } },
    merc: { file: 'merc.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    subject: { file: 'subject.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    spitter: { file: 'spitter.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    sentry: { file: 'sentry.png', cell: 128, w: 192, anims: { idle: [0, 8], attack: [1, 8], hit: [2, 2], walk: [3, 4], death: [4, 6] } },
    shield: { file: 'shield.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 10], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    stalker: { file: 'stalker.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 10], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    boss: { file: 'boss.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 6] } },
    deploy: { file: 'deploy.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    medic: { file: 'medic.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
    merchant: { file: 'merchant.png', cell: 128, w: 192, anims: { idle: [0, 4] } },
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
    player_tactical_pistol: { file: 'player_tactical_pistol.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], death: [3, 5] }, headW: 19, heads: { idle: [[4,-98],[3,-98],[3,-102],[3,-102]], walk: [[2,-93],[-2,-93],[-2,-90],[1,-94],[2,-94],[-1,-94],[1,-94],[3,-94]], attack: [[1,-97],[8,-92],[1,-95]], death: [[7,-97],[-24,-88],[-54,-82],[-29,-65],[14,-56]] } },
    player_vest_long: { file: 'player_vest_long.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[5,-94],[6,-97],[6,-101],[6,-97]], walk: [[3,-91],[-1,-92],[1,-95],[2,-91],[4,-95],[-1,-92],[1,-95],[3,-95]], attack: [[3,-94],[5,-92],[2,-98]], hit: [[-11,-95],[-9,-90]], death: [[-4,-87],[-41,-81],[-58,-71],[-26,-83],[11,-57]] } },
    player_vest_pistol: { file: 'player_vest_pistol.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], death: [3, 5] }, headW: 20, heads: { idle: [[3,-98],[3,-98],[3,-102],[3,-98]], walk: [[4,-94],[-2,-97],[-1,-94],[2,-94],[2,-94],[-2,-94],[2,-94],[0,-94]], attack: [[-3,-98],[16,-95],[2,-92]], death: [[12,-77],[-49,-91],[-52,-70],[-53,-59],[-43,-50]] } },
    // v1.8.0 Gemini 아트: 보스 7종 · 둔기 든 몸 3종
    argos: { file: 'argos.png', cell: 128, w: 192, anims: { idle: [0, 4], attack: [1, 4], hit: [2, 2], death: [3, 5] } },
    babel: { file: 'babel.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 3], hit: [3, 2], death: [4, 6] } },
    goliath: { file: 'goliath.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    hawk: { file: 'hawk.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    raven: { file: 'raven.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    redfang: { file: 'redfang.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    viper: { file: 'viper.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], attack: [2, 4], hit: [3, 2], death: [4, 5] } },
    player_heavy: { file: 'player_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 5], hit: [3, 2], death: [4, 5] }, headW: 19, heads: { idle: [[5,-102],[4,-98],[4,-98],[4,-102]], walk: [[2,-94],[-2,-94],[1,-94],[2,-97],[2,-97],[1,-94],[0,-94],[-1,-94]], attack: [[-10,-94],[7,-91],[5,-93],[9,-89],[23,-94]], hit: [[13,-95],[11,-94]], death: [[11,-94],[9,-90],[-52,-73],[-53,-54],[-35,-50]] } },
    player_vest_heavy: { file: 'player_vest_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] }, headW: 20, heads: { idle: [[4,-98],[4,-98],[3,-98],[3,-102]], walk: [[5,-94],[-2,-97],[-1,-94],[2,-94],[2,-97],[-1,-94],[2,-94],[-1,-94]], attack: [[-9,-84],[-15,-96],[-14,-95],[6,-92]], hit: [[11,-96],[15,-89]], death: [[8,-105],[-29,-91],[-38,-80],[9,-56],[9,-56]] } },
    player_tactical_heavy: { file: 'player_tactical_heavy.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 8], attack: [2, 4], hit: [3, 2], death: [4, 5] }, headW: 20, heads: { idle: [[3,-98],[4,-98],[3,-98],[3,-102]], walk: [[5,-94],[-2,-97],[-1,-94],[2,-94],[3,-94],[-1,-94],[2,-94],[0,-94]], attack: [[-9,-84],[-15,-97],[-14,-95],[6,-92]], hit: [[11,-96],[15,-89]], death: [[7,-101],[-29,-91],[-36,-76],[9,-56],[9,-56]] } },
  },
};
