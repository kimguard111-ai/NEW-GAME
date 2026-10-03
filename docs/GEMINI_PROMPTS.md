# Gemini 프롬프트 모음 — SEOUL 2049

`docs/ART_GUIDE.md`의 규칙(마젠타 배경, 오른쪽 보기, 그림자 없음)을 모두 반영한, **바로 붙여넣는 프롬프트**입니다.
결과물은 `tools/sprite-tool.html`로 가공해서 게임에 넣습니다.

## 0. 작업 순서 (권장)

| 순서 | 에셋 | 이유 |
|---|---|---|
| 1 | 플레이어 | 항상 화면 중앙. 아트 방향의 기준이 됨 |
| 2 | 감염자 | 가장 많이 보이는 적 |
| 3 | 약탈자 · 변이견 | 초중반 주력 적 |
| 4 | 랜드마크 4종 | 지역의 얼굴 (이번 v0.6에서 그림 자리 생김) |
| 5 | 변이 거한 · 경비 드론 · 타이탄 | 후반 적 |
| 6 | NPC 4명 | 대기 동작만 필요 |
| 7 | 아이템 아이콘 | **미리 만들어 두기만** (게임 적용은 이후 UI 작업 때) |

**한 캐릭터 = 마스터 이미지 1장 + 동작 스트립 5장.** 마스터가 마음에 들 때까지 충분히 다시 뽑고, 확정되면 이후 모든 요청에 첨부하세요.

---

## 1. 공통 스타일 문장

모든 프롬프트 끝에 이미 들어 있습니다. 화풍을 바꾸고 싶으면 이 문장만 일괄로 고치세요.

```
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
```

## 2. 캐릭터

### 2-1. 마스터 이미지 프롬프트

캐릭터마다 아래 해당 블록을 그대로 붙여넣으세요.

**플레이어 (player)**
```
Character design of a lone survivor soldier: dark messy hair, dark tactical jacket with armor plates,
cargo pants, combat boots, a large backpack, holding a K2 assault rifle in both hands.
Full body, standing idle pose, character facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
Solid flat #FF00FF magenta background filling the entire image. No shadow, no ground, no text, no border.
Do not use pink or magenta colors on the character.
```

**감염자 (zombie)**
```
Character design of an infected zombie: pale gray-green rotting skin, bloody wounds, torn shirt and jeans,
hunched posture, arms reaching forward, bald with patches of hair.
Full body, standing idle pose, character facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
Solid flat #FF00FF magenta background filling the entire image. No shadow, no ground, no text, no border.
Do not use pink or magenta colors on the character.
```

**변이견 (dog)**
```
Character design of a mutated feral dog: hairless gray-brown hide, exposed muscles and ribs, glowing yellow eyes,
oversized jaws with teeth. Four-legged, side view, standing idle, facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
Solid flat #FF00FF magenta background filling the entire image. No shadow, no ground, no text, no border.
Do not use pink or magenta colors on the character.
```

**약탈자 (raider)**
```
Character design of a raider scavenger: red bandana mask over the face, scrap metal shoulder armor,
dirty brown leather jacket, holding a pistol pointed forward.
Full body, standing idle pose, character facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
Solid flat #FF00FF magenta background filling the entire image. No shadow, no ground, no text, no border.
Do not use pink or magenta colors on the character.
```

**변이 거한 (brute)**
```
Character design of a huge hulking mutant brute, twice the size of a human: gray-brown cracked skin,
bony growths on the shoulders and back, massive arms with clawed hands, small head, torn pants.
Full body, standing idle pose, character facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
Solid flat #FF00FF magenta background filling the entire image. No shadow, no ground, no text, no border.
Do not use pink, purple or magenta colors on the character.
```

**경비 드론 (drone)**
```
Design of a military security quadcopter drone: dark gray armored body, four rotors, a single red sensor eye,
a small machine gun mounted underneath. Hovering in the air, facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
Solid flat #FF00FF magenta background filling the entire image. No shadow, no ground, no text, no border.
Do not use pink or magenta colors on the drone.
```

**방사능 군주 타이탄 (boss)**
```
Character design of a giant radioactive mutant boss, three times human size: dark green scarred skin,
glowing bright green radioactive veins and cracks, armored bony plates, huge claws, glowing yellow eyes.
Full body, standing menacing idle pose, character facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view (camera about 35 degrees above).
Solid flat #FF00FF magenta background filling the entire image. No shadow, no ground, no text, no border.
Do not use pink or magenta colors on the character.
```

**NPC 4명** — 위 블록에서 첫 문장만 바꾸면 됩니다.

| 키 | 첫 문장 |
|---|---|
| merchant | `Character design of a black market trader: long dark coat full of pockets, bags and goods hanging from the shoulders, cap, cunning smile.` |
| captain | `Character design of a veteran survivor leader: gray beard, military cap, worn officer jacket, rifle slung on the back, arms crossed.` |
| medic | `Character design of a field medic: white coat with a red cross armband, medical bag on the side, short hair, surgical mask around the neck.` |
| mechanic | `Character design of a mechanic: grease-stained overalls, welding goggles on the forehead, tool belt, holding a large wrench.` |

### 2-2. 동작 스트립 프롬프트 (모든 캐릭터 공통)

마스터 이미지를 **첨부**하고, `[프레임 수]`와 `[동작]`만 아래 표에서 골라 넣으세요.

```
Using the attached character as the exact reference (same design, same outfit, same colors, same proportions),
create a horizontal sprite strip of exactly [프레임 수] frames showing [동작].
All frames in ONE row, evenly spaced with clear empty gaps between frames, feet on the same horizontal line,
same character size in every frame, character facing right.
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, isometric 3/4 top-down view.
Solid flat #FF00FF magenta background filling the entire image.
No shadow, no ground, no text, no numbers, no grid lines, no borders, no muzzle flash effects.
```

파일 이름은 `1_idle.png`, `2_walk.png`, `3_attack.png`, `4_hit.png`, `5_death.png`로 저장하면 도구가 순서대로 처리합니다.

| 캐릭터 | idle (4) | walk (6) | attack (4) | hit (2) | death (5) |
|---|---|---|---|---|---|
| player | `an idle breathing animation, holding the rifle` | `a walk cycle carrying the rifle` | `firing the rifle with recoil` | `getting hit, flinching backward` | `a death animation, falling down and lying on the ground` |
| zombie | `an idle swaying animation` | `a slow shambling walk cycle` | `a claw attack lunging forward` | `getting hit, head snapping back` | `a death animation, collapsing and lying on the ground` |
| dog | `an idle growling animation` | `a running cycle` | `a biting attack lunging forward` | `getting hit, recoiling` | `a death animation, falling on its side` |
| raider | `an idle animation holding the pistol` | `a walk cycle holding the pistol` | `firing the pistol with recoil` | `getting hit, flinching backward` | `a death animation, falling down and lying on the ground` |
| brute | `an idle heavy breathing animation` | `a heavy stomping walk cycle` | `a ground smash attack with both fists` | `getting hit, staggering` | `a death animation, falling forward and lying on the ground` |
| drone | `a hovering animation with spinning rotors` | — (생략 가능, 대기 동작으로 대체) | `firing the machine gun` | `getting hit, sparks and tilting` | `a death animation, smoking and crashing to the ground` |
| boss | `a menacing idle animation, glowing veins pulsing` | `a heavy walk cycle` | `a massive claw swipe attack` | `getting hit, roaring in pain` | `a death animation, collapsing to its knees then falling` |
| NPC 4명 | `an idle breathing animation` | — | — | — | — |

> **뒷모습 (선택)**: `back_idle`(4), `back_walk`(6) 행을 만들면 캐릭터가 화면 위쪽을 볼 때 사용됩니다.
> `[동작]` 뒤에 `, seen from behind, facing away toward the upper right`를 붙이세요. 처음에는 생략해도 됩니다.

### 2-3. 결과 확인 포인트

- 모든 프레임이 **같은 사람**으로 보이는지 (옷 색·무기 모양) → 아니면 다시 생성
- 프레임끼리 **붙어 있지 않은지** → 붙었으면 `with wide empty gaps between frames` 강조
- 캐릭터에 **분홍·자주색이 없는지** → 있으면 배경을 `#00FF00` 초록으로 바꿔 다시 생성

---

## 3. 랜드마크 (지역 건물 4종, 각 1장)

게임은 그림의 **가로 폭을 건물 발판(마름모) 폭에 맞추고, 그림 맨 아래를 마름모의 아래 꼭짓점**에 맞춥니다.
그래서 "정사각형 발판, 아래 꼭짓점이 이미지 맨 아래 중앙"이 중요합니다. 도구에서 해당 이름(cathedral 등)을 고르면 자동으로 랜드마크 모드가 됩니다.

공통으로 붙는 문장:
```
Single isometric building on a square diamond-shaped footprint, viewed from the south corner
(the bottom tip of the footprint diamond touches the bottom center of the image).
Detailed dark pixel art, gritty post-apocalyptic ruined Seoul, desaturated colors with warm orange highlights,
isometric 3/4 top-down view. Only the building itself: no surrounding street, no ground, no people, no shadow, no text.
Solid flat #FF00FF magenta background filling the entire image.
```

**무너진 명동성당 (cathedral)** — 정사각형 이미지 권장
```
A ruined red-brick gothic cathedral (Myeongdong Cathedral in Seoul) with a tall pointed bell tower and a cross,
part of the roof collapsed, broken stained glass windows, rubble at the base.
+ 공통 문장
```

**보신각 (bosingak)** — 정사각형 이미지 권장
```
A traditional Korean bell pavilion (Bosingak in Seoul) on a stone platform: red wooden pillars,
a curved dark gray tiled roof with upturned eaves, a large bronze bell hanging inside, weathered and dusty.
+ 공통 문장
```

**버려진 용산 기지 (base)** — 정사각형 이미지 권장
```
An abandoned military base compound: a concrete bunker, sandbag walls, a rusty abandoned tank,
a small watchtower with a searchlight, barbed wire, military crates.
+ 공통 문장
```

**63빌딩 잔해 (tower63)** — **세로로 긴 이미지(9:16)** 권장
```
A ruined golden glass skyscraper (the 63 Building in Seoul): tall tower with golden reflective glass,
the top floors broken and collapsed, some windows glowing, radioactive green haze at the base.
+ 공통 문장
```

---

## 4. 아이템 아이콘 (미리 만들어 두기)

아직 게임에 적용되지 않습니다(현재는 이모지). 이후 UI/폴리싱 단계(v0.13)에서 연결할 예정이니, 같은 화풍으로 미리 모아 두면 됩니다.

공통 문장:
```
Single game item icon, centered, slight 3/4 angle, fills about 80% of the square image.
Detailed dark pixel art, gritty post-apocalyptic style, desaturated colors with warm highlights.
Solid flat #FF00FF magenta background. No text, no border, no shadow, no hands.
```

| 파일 이름 | 앞에 붙일 설명 |
|---|---|
| icon_pipe | `A rusty steel pipe used as a melee weapon.` |
| icon_pistol | `An M1911 pistol.` |
| icon_axe | `A red fire axe.` |
| icon_smg | `An MP5 submachine gun.` |
| icon_shotgun | `A pump-action shotgun (Remington 870).` |
| icon_rifle | `A Korean K2 assault rifle.` |
| icon_katana | `A high-frequency sci-fi blade with a faint blue glowing edge.` |
| icon_sniper | `A bolt-action sniper rifle with a scope.` |
| icon_lmg | `A light machine gun with a bipod and ammo belt.` |
| icon_vest | `A worn bulletproof vest.` |
| icon_tactical | `A tactical vest with pouches.` |
| icon_military | `A military armored combat suit.` |
| icon_exo | `A powered exoskeleton suit.` |
| icon_medkit | `A first aid kit with a red cross.` |
| icon_ammo | `A military ammunition box.` |

---

## 5. 지금은 만들지 않는 것을 권장

| 에셋 | 이유 |
|---|---|
| 바닥 타일 (도로·보도·풀밭) | 쿼터뷰 타일은 이어 붙였을 때 경계가 맞아야 하는데, 이미지 생성은 이 정밀도가 잘 안 나옵니다. 지금의 코드 바닥을 유지하고 나중에 방법을 따로 정합니다 |
| 일반 건물 | 맵의 건물은 높이·크기가 제각각이라 그림 한 장으로 맞추기 어렵습니다. 랜드마크로 지역 분위기를 먼저 잡는 편이 효과가 큽니다 |
| 무기별 플레이어 그림 | 무기 9종 × 동작 5개라 양이 너무 많습니다. 기본 소총 그림 하나로 시작 |
