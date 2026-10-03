// 아트 에셋 목록 (v0.6 아트 파이프라인)
// 1) Gemini로 만든 시트를 tools/sprite-tool.html 에서 가공
// 2) 결과 PNG를 assets/ 폴더에 넣고, 도구가 보여주는 한 줄을 아래 sprites 안에 붙여넣기
// 등록되지 않았거나 파일을 못 읽으면 기존 도형 그래픽을 그대로 사용합니다.
const ART = {
  dir: 'assets/',
  title: null, // 타이틀 키아트 (예: 'title.png'). 없으면 코드로 그린 서울 야경
  charFill: 0.78, // 가공 도구와 같은 값 (대기 자세 키 / 칸 높이)
  feetPad: 4,     // 가공 도구와 같은 값 (칸 바닥 ~ 발)
  fps: { idle: 6, walk: 10, attack: 16, hit: 12, death: 10 },
  // 화면에 표시할 대기 자세 키 (px)
  // player_vest 등 방어구별 몸 그림은 player 키를 따름
  height: { player: 44, zombie: 44, dog: 26, raider: 44, brute: 74, drone: 26, boss: 120, merchant: 44, captain: 44, medic: 44, mechanic: 44,
    // v0.15 보스 전용 그림 (등록하면 기본 적 그림을 키워 쓰는 대신 이 그림 사용)
    glutton: 66, panther: 56, argos: 46, redfang: 50, viper: 58, goliath: 118, warden: 100, butcher: 58, cerberus: 50, colony: 118 },
  // 플레이어 무기 그림 (옆모습 1장, 총구/날이 오른쪽). 플레이어 몸 그림은 무기 없이 만들고 이 그림을 손에 붙임
  // 없으면 코드로 그린 총·칼을 사용
  weapons: {
    // rifle: { file: 'w_rifle.png' },
  },
  // 화면에 그릴 무기 길이(px)와 손잡이 위치(그림 왼쪽에서 비율)
  weaponLen: { pipe: 30, pistol: 15, axe: 32, smg: 22, shotgun: 30, rifle: 32, katana: 38, sniper: 40, lmg: 36 },
  weaponGrip: { pipe: 0.15, pistol: 0.3, axe: 0.15, smg: 0.35, shotgun: 0.3, rifle: 0.32, katana: 0.12, sniper: 0.3, lmg: 0.35 },
  handY: 0.62,     // 손 높이 (플레이어 키 대비, 가슴 높이)
  handX: 0.1,      // 손이 몸 중심에서 앞으로 나온 정도 (플레이어 키 대비)
  weaponThick: 1.7, // 무기 그림 세로 과장 배율 (작은 화면에서 총이 실처럼 가늘어 보이지 않게)

  // 헬멧 그림 (1장, 오른쪽을 보는 3/4 시점). 몸 그림의 프레임별 머리 위치(heads)에 씌움
  helmets: {
    // gasmask: { file: 'h_gasmask.png' },
  },
  helmetFit: { w: 1.35, up: 0.18 }, // 헬멧 폭 = 머리 폭 × w, 머리 꼭대기보다 (헬멧 폭 × up) 만큼 위에서 시작

  // 랜드마크 건물 그림 (가공 도구의 "랜드마크" 항목으로 가공). 없으면 코드로 그린 건물 사용
  landmarks: {
    // cathedral: { file: 'cathedral.png' },
  },
  sprites: {
    // 예시 (도구가 만들어 주는 형식):
    // zombie: { file: 'zombie.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
    // 방탄 조끼를 입은 플레이어 (Gemini 첫 결과물)
    player_vest: { file: 'player_vest.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 7], hit: [2, 3], death: [3, 4] }, headW: 18, heads: { idle: [[3,-99],[5,-101],[3,-99],[3,-99]], walk: [[1,-93],[-1,-94],[-2,-94],[-2,-93],[-4,-96],[-1,-96],[4,-97]], hit: [[5,-93],[3,-95],[11,-81]], death: [[-5,-85],[-59,-69],[-17,-47],[-16,-48]] } },
  },
};
