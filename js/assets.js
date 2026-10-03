// 아트 에셋 목록 (v0.6 아트 파이프라인)
// 1) Gemini로 만든 시트를 tools/sprite-tool.html 에서 가공
// 2) 결과 PNG를 assets/ 폴더에 넣고, 도구가 보여주는 한 줄을 아래 sprites 안에 붙여넣기
// 등록되지 않았거나 파일을 못 읽으면 기존 도형 그래픽을 그대로 사용합니다.
const ART = {
  dir: 'assets/',
  charFill: 0.78, // 가공 도구와 같은 값 (대기 자세 키 / 칸 높이)
  feetPad: 4,     // 가공 도구와 같은 값 (칸 바닥 ~ 발)
  fps: { idle: 6, walk: 10, attack: 16, hit: 12, death: 10 },
  // 화면에 표시할 대기 자세 키 (px)
  height: { player: 44, zombie: 44, dog: 26, raider: 44, brute: 74, drone: 26, boss: 120, merchant: 44, captain: 44, medic: 44, mechanic: 44 },
  // 랜드마크 건물 그림 (가공 도구의 "랜드마크" 항목으로 가공). 없으면 코드로 그린 건물 사용
  landmarks: {
    // cathedral: { file: 'cathedral.png' },
  },
  sprites: {
    // 예시 (도구가 만들어 주는 형식):
    // zombie: { file: 'zombie.png', cell: 128, w: 192, anims: { idle: [0, 4], walk: [1, 6], attack: [2, 4], hit: [3, 2], death: [4, 6] } },
  },
};
