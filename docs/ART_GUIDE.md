# 아트 가이드 — Gemini로 캐릭터 스프라이트 만들기

게임은 그림이 없으면 지금의 도형 캐릭터를 그대로 쓰고, 그림을 등록한 것부터 하나씩 바뀝니다.
한 번에 다 만들 필요 없이 **플레이어 → 감염자 → 나머지** 순서로 하나씩 교체하는 것을 권합니다.

## 전체 흐름

1. Gemini로 **마스터 이미지**(캐릭터 1장)를 만든다
2. 마스터 이미지를 첨부해서 **애니메이션 스트립**(동작별 1장씩)을 만든다
3. `tools/sprite-tool.html`을 브라우저로 열고 스트립 이미지들을 한꺼번에 끌어다 놓는다
4. 미리보기를 확인하고 **PNG 다운로드** → `assets/` 폴더에 저장
5. 도구가 보여주는 한 줄을 `js/assets.js`의 `sprites` 안에 붙여넣기
6. 게임 새로고침

## 반드시 지켜야 할 규칙 (가공 도구가 의존함)

| 규칙 | 이유 |
|---|---|
| **배경은 단색 마젠타 `#FF00FF`** | 도구가 테두리 색을 배경으로 인식해 지움. "투명 배경"이라고 하면 Gemini가 가짜 체크무늬를 그림 |
| **캐릭터에 분홍·자주색을 쓰지 말 것** | 배경색과 같이 지워짐. 분홍이 필요하면 배경을 초록 `#00FF00`으로 (도구가 자동 감지) |
| **그림자·바닥·발판 없음** | 그림자는 게임이 직접 그림. 바닥이 있으면 발 위치를 못 찾음 |
| **글자·숫자·격자선·테두리 없음** | 프레임 감지를 방해함 |
| **오른쪽을 보는 자세** (화면 오른쪽, 살짝 관객 쪽) | 왼쪽은 게임이 좌우 반전으로 만듦. 왼쪽을 보고 나왔으면 도구에서 체크 해제 |
| **프레임 사이 간격을 충분히** | 붙어 있으면 한 프레임으로 인식됨 |
| **전신, 발끝까지** | 도구가 발을 기준으로 정렬함 |

시점은 게임과 같은 **쿼터뷰(위에서 약 35° 내려다보는 3/4 시점)**입니다.

## 프롬프트 템플릿

영어 프롬프트가 결과가 더 안정적입니다. `[ ]` 부분만 바꿔 쓰세요.

### 1) 마스터 이미지 (캐릭터 디자인 확정용)

```
Character design of [a survivor soldier in a dark tactical jacket, backpack, holding a K2 assault rifle],
full body, standing idle pose, isometric 3/4 top-down view (camera about 35 degrees above),
character facing right. Detailed pixel art, dark post-apocalyptic Seoul style, muted colors.
Solid flat #FF00FF magenta background filling the entire image.
No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```

마음에 드는 결과가 나올 때까지 여기서 충분히 고르세요. **이후 모든 요청에 이 이미지를 첨부**합니다.

### 2) 애니메이션 스트립 (동작마다 1장)

```
Using the attached character as the exact reference (same design, same outfit, same colors, same proportions),
create a horizontal sprite strip of exactly [6] frames showing a [walk cycle].
All frames in ONE row, evenly spaced with clear empty gaps between frames, feet on the same horizontal line,
same character size in every frame. Isometric 3/4 top-down view, character facing right.
Detailed pixel art. Solid flat #FF00FF magenta background filling the entire image.
No shadow, no ground, no text, no numbers, no grid lines, no borders.
```

`[ ]`에 넣을 내용:

| 행 이름 | 프레임 | 동작 설명 (`[walk cycle]` 자리) |
|---|---|---|
| idle | 4 | `idle breathing animation, subtle movement` |
| walk | 6 | `walk cycle` (근접형 적은 `shambling walk cycle`) |
| attack | 4 | 총기: `firing the rifle, recoil` / 근접: `melee swing attack` / 맨손 적: `claw attack lunging forward` |
| hit | 2 | `getting hit, flinching backward` |
| death | 5 | `death animation, falling down and lying on the ground` |
| back_idle / back_walk (선택) | 4 / 6 | 위 문장 + `seen from behind, facing away toward the upper right` |

> 파일 이름을 `1_idle.png`, `2_walk.png` … 처럼 붙이면 도구가 순서대로 정렬합니다.
> `back_` 행이 있으면 캐릭터가 화면 위쪽을 볼 때 그 그림을 씁니다. 없으면 앞모습을 그대로 씁니다.

### 총구 화염·이펙트

총구 화염은 게임이 직접 그리므로 **그리지 않는 편**이 깔끔합니다. 그려도 도구가 가장 가까운 캐릭터 프레임에 붙여 주지만, 프레임마다 위치가 달라지면 깜빡거려 보입니다.

## 에셋 목록

| 키 (도구에서 선택) | 대상 | 화면 키(px) | 비고 |
|---|---|---|---|
| player | 플레이어 | 44 | 기본 무기를 든 모습. 무기별 그림은 아직 미지원 |
| zombie | 감염자 | 44 | |
| dog | 변이견 | 26 | 네발 짐승. 오른쪽을 보는 옆모습 |
| raider | 약탈자 | 44 | 총을 든 인간 |
| brute | 변이 거한 | 74 | 덩치 큰 변이체 |
| drone | 경비 드론 | 26 | 공중에 뜬 모습. 게임이 공중에 띄워서 그림 (바닥 그림자 X) |
| boss | 방사능 군주 타이탄 | 120 | 거대 보스 |
| merchant / captain / medic / mechanic | NPC | 44 | idle 행만 있어도 됨 |

화면 키는 `js/assets.js`의 `height`에서 조절할 수 있습니다.

## 가공 도구 사용법 (`tools/sprite-tool.html`)

1. 브라우저로 파일을 직접 열면 됩니다 (서버 불필요)
2. **에셋 이름**을 고르고, 스트립 이미지들을 한꺼번에 끌어다 놓기
3. 상태 메시지에서 **행 수와 프레임 수**가 기대와 같은지 확인 (예: `5개 행, 프레임 4/6/4/2/5개`)
4. 결과 미리보기에서 각 행의 **애니메이션 이름**을 확인·수정 (기본: idle, walk, attack, hit, death 순)
5. 발 기준선(노란 선)에 발이 붙어 있는지, 움직임이 떨리지 않는지 확인
6. **PNG 다운로드** → `assets/[이름].png`로 저장 → 아래 칸의 코드를 `js/assets.js`에 붙여넣기

도구가 자동으로 해 주는 것:
- 배경색 자동 감지 및 제거 (가장자리 배경색 번짐까지 보정)
- 고르지 않은 간격의 프레임 자동 감지, 떨어진 작은 조각(화염 등)은 가까운 프레임에 합침
- 발 위치 기준 정렬, 이미지마다 다른 크기 통일, 같은 행 안의 크기 흔들림(±15%) 보정
- 쓰러진 자세(납작한 그림)는 서 있는 그림 배율을 따름

### 문제 해결

| 증상 | 해결 |
|---|---|
| 배경이 덜 지워짐 | 배경 제거 강도 ↑ |
| 캐릭터 일부(어두운 테두리 등)가 지워짐 | 배경 제거 강도 ↓ |
| 프레임 2개가 하나로 합쳐짐 | Gemini에 간격을 더 벌려 다시 요청, 또는 "격자로 나누기"로 열·행 지정 |
| 프레임 수가 이상함 (잡티를 프레임으로 인식) | "격자로 나누기" 사용 |
| 걸을 때 캐릭터가 위아래로 출렁임 | Gemini 결과의 크기 차이가 15% 이상. 다시 생성 권장 |
| 게임에서 왼쪽만 보거나 뒤집혀 보임 | 도구에서 "오른쪽을 보고 있음" 체크 상태 확인 후 다시 가공 |
| 게임에 반영이 안 됨 | `js/assets.js` 붙여넣기 확인, 브라우저 콘솔(F12)에 "에셋을 불러오지 못해" 경고가 있으면 파일 이름·경로 확인 |

## 아직 지원하지 않는 것 (다음 단계)

- 바닥 타일, 건물, 폐차 같은 배경 그림 (지금은 코드로 그린 입체 박스)
- 아이템 아이콘 (지금은 이모지)
- 무기별 플레이어 그림 (지금은 그림 하나로 모든 무기)

## 참고

Gemini로 생성한 이미지의 상업적 이용 조건은 사용 중인 Gemini 서비스 약관을 직접 확인하세요.
