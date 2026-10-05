# Gemini 프롬프트 (v1.19) — 아트 종류별 한 번에 복붙

**프롬프트 1개 = 그림 1장 = 가공 1번.** 회색 상자를 통째로 복사해 Gemini에 붙여넣으세요.
그림이 없는 것은 지금의 코드 그림을 그대로 쓰고, 등록한 것부터 하나씩 바뀝니다. 한꺼번에 다 만들 필요 없습니다.

---

## 0. 시작 전에 (중요)

### 그림체를 하나로 맞추는 법
1. **콘셉트 아트를 매번 첨부하세요** (처음에 보여주신 "최종 이 느낌" 그림). 모든 프롬프트 맨 앞에 아래 한 줄이 들어 있습니다.
   `Match the art style of the attached concept image.` — 첨부를 안 하면 이 줄은 지워도 됩니다.
2. **플레이어(1번) 결과가 마음에 들 때까지 여기서 충분히 고르세요.** 이후 다른 캐릭터를 만들 때 플레이어 그림도 같이 첨부하면 크기·명암이 맞춰집니다.
3. 모든 프롬프트의 그림체 문장은 같습니다: *Detailed dark pixel art, desaturated colors with warm orange highlights.* 바꾸고 싶으면 **전부 같이** 바꾸세요.

### 가공 도구가 의존하는 규칙 (이미 프롬프트에 들어 있음)
| 규칙 | 이유 |
|---|---|
| 배경은 단색 마젠타 `#FF00FF` (보라·분홍 캐릭터는 초록 `#00FF00`) | 도구가 배경색을 지움. "투명"이라고 쓰면 가짜 체크무늬가 나옴 |
| 그림자·바닥·글자·격자선 없음 | 그림자는 게임이 그림. 바닥·글자는 프레임 인식 방해 |
| 오른쪽을 봄, 전신, 프레임 사이 넓은 간격 | 왼쪽은 게임이 뒤집어 만듦. 도구가 발 기준으로 정렬 |
| 오른쪽 아래 비우기 | Gemini ✦ 표시 자리 (도구가 지움) |

### 순서
1. 회색 상자 복사 → Gemini (📎 표시가 있으면 그 그림도 첨부)
2. `tools/sprite-tool.html` 열기 → **🔧 도구 이름** 선택 → 그림 끌어다 놓기
3. **🔢 동작 순서**를 도구의 "동작 순서 지정" 칸에 붙여넣기 (Gemini가 개수를 다르게 그렸으면 세어서 숫자만 고치기)
4. **PNG 다운로드** → `assets/` 폴더 → 도구 아래 칸의 코드를 `js/assets.js`에 붙여넣기 → 게임 새로고침

---

## 만드는 순서 (체감이 큰 것부터)

| 순서 | 아트 | 장수 | 🔧 도구 이름 | 효과 |
|---|---|---|---|---|
| ★1 | 플레이어 기본 몸 | 1 | player | 화면에 항상 있음 |
| ★2 | 무기 9종 | 1 | 무기 9종 한 장 | 손에 든 무기 **+ 인벤토리 아이콘도 자동 교체** |
| ★3 | 자주 보는 적 6종 | 6 | zombie · dog · raider · brute · drone · merc | 전투 화면의 대부분 |
| 4 | 플레이어 방어구 몸 | 4 | player_vest · _tactical · _military · _exo | 장비 바꿀 때 모습 변화 |
| 5 | 헬멧 4종 | 1 | 헬멧 4종 한 장 | 머리 + 아이콘 자동 교체 |
| 6 | 캠프 NPC 6명 | 6 | merchant · captain · medic · mechanic · deploy · stash | 거점 분위기 |
| 7 | 후반 적 6종 | 6 | subject · spitter · sentry · shield · stalker · boss | 연구소·강남·잠실·타이탄 |
| 8 | 랜드마크 6채 | 6 | cathedral · bosingak · base · tower63 · coex · lotte | 맵마다 상징 건물 |
| 9 | 보스 전용 17종 (선택) | 17 | glutton … chimera | 없으면 기본 적을 키워서 씀 |
| 10 | 타이틀 키아트 | 1 | (가공 없음) | 첫 화면 |
| 11 | **무기를 든 플레이어 몸** (v1.7.7 · 근접 v1.7.9) | 2~20 | player_long · player_pistol · player_vest_long … | 손과 총이 붙어 보임 |
| 12 | **소품 · 맵 꾸미기** (v1.18) | 5 | v1.18 거리 소품 · 차량 · 맵 오브젝트 · 캠프 소품 · 잔해·옥상 장식 | 거리·캠프·사건 오브젝트가 전부 그림으로 |
| 13 | **건물 외벽 · 옥상 질감** (v1.19) | 2 | v1.19 건물 외벽 질감 · 옥상 질감 | 모든 일반 건물의 벽·창문·1층 상가·옥상이 그림으로 |

> 아이콘: 무기·헬멧은 2·5번을 등록하면 자동으로 그 그림이 됩니다. 방어구·구급상자·메뉴 아이콘은 코드로 그린 아이콘(46종)이 이미 통일돼 있어 따로 만들지 않아도 됩니다.

---

## 1. 플레이어 기본 몸 · 🔧 **player** · 🔢 `idle 4, walk 6, hit 2, death 5`
📎 콘셉트 아트 · 💾 결과 그림은 2·4번에서 첨부용으로 씁니다
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a young male survivor in ruined post-apocalyptic Seoul: short dark hair, bare head, worn dark gray hoodie, plain dark pants, dirty sneakers, a small backpack. No armor, no vest, no helmet, no weapon. In every standing frame both empty hands are raised forward at chest height as if holding an invisible rifle. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. The same character in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 2. 무기 9종 (1장) · 🔧 **무기 9종 한 장 (3×3)**
📎 콘셉트 아트 · 순서가 중요합니다 (왼쪽 위부터 오른쪽으로, 줄 바꿈)
```
Match the art style of the attached concept image. Create ONE image showing exactly 9 separate weapons arranged in a neat 3 by 3 grid with wide empty space between them. Order from left to right, top row first: 1. a rusty steel pipe club with tape on the handle, 2. an M1911 pistol, 3. a red fire axe with a long wooden handle; middle row: 4. an MP5 submachine gun, 5. a pump-action shotgun with a wooden stock, 6. a Korean K2 assault rifle; bottom row: 7. a high-frequency sci-fi sword with a faint cyan glowing edge, 8. a bolt-action sniper rifle with a scope, 9. a light machine gun with a bipod and ammo box. Every weapon in pure side view, horizontal, handle or stock on the left and muzzle or blade tip pointing to the RIGHT, centered in its own grid cell, all drawn at a consistent real-world scale. Chunky readable shapes with light edge highlights, readable even when small. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No hands, no people, no text, no numbers, no labels, no grid lines, no shadow, no border.
```

---

## 3. 자주 보는 적 (적마다 1장) · 🔢 모두 `idle 4, walk 6, attack 4, hit 2, death 5` (드론만 다름)
📎 콘셉트 아트 + (있으면) 1번 플레이어 그림 — 크기·명암 맞춤용

### 3-1. 감염자 · 🔧 **zombie**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of an infected zombie: pale gray-green rotting skin, bloody wounds, torn office shirt and jeans, hunched posture, arms reaching forward, glowing red eyes. Rows: row 1: 4 frames of idle swaying; row 2: 6 frames of a slow shambling walk; row 3: 4 frames of raising both arms then a claw attack lunging forward; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, collapsing and lying on the ground. The same zombie in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 3-2. 변이견 · 🔧 **dog**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a mutated feral dog: hairless gray-brown hide, exposed muscles and ribs, glowing yellow eyes, oversized jaws with teeth, four legs, seen from the side. Rows: row 1: 4 frames of idle growling; row 2: 6 frames of a running cycle; row 3: 4 frames of crouching low then leaping forward to bite; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling on its side. The same dog in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the creature.
```

### 3-3. 약탈자 · 🔧 **raider**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a raider scavenger: red bandana mask over the face, scrap metal shoulder armor, dirty brown leather jacket, holding a pistol. Rows: row 1: 4 frames of idle holding the pistol; row 2: 6 frames of a walk cycle holding the pistol; row 3: 4 frames of aiming and firing the pistol with recoil, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling down and lying on the ground. The same raider in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 3-4. 변이 거한 · 🔧 **brute**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a huge hulking mutant brute, twice the size of a human: gray-brown cracked skin, bony growths on the shoulders and back, massive arms with clawed hands, small head, torn pants. Rows: row 1: 4 frames of idle heavy breathing; row 2: 6 frames of a heavy stomping walk; row 3: 4 frames of raising both fists high then smashing the ground; row 4: 2 frames of getting hit and staggering; row 5: 5 frames of a death animation, falling forward and lying on the ground. The same brute in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink, purple or magenta on the character.
```

### 3-5. 경비 드론 · 🔧 **drone** · 🔢 `idle 4, attack 4, hit 2, death 5`
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a military security quadcopter drone: dark gray armored body, four rotors, a single red sensor eye, a small machine gun mounted underneath, hovering in the air. Rows: row 1: 4 frames of hovering with spinning rotors; row 2: 4 frames of firing its machine gun, no muzzle flash; row 3: 2 frames of getting hit, sparking and tilting; row 4: 5 frames of smoking and crashing to the ground. The same drone in every frame, same size, all facing right, wide empty gaps between frames. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the drone.
```

### 3-6. 블랙선 용병 (강남) · 🔧 **merc**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a private military contractor soldier: black tactical uniform and plate carrier, black helmet with a dark visor, small yellow shoulder patch, holding a compact black assault rifle, professional and disciplined posture. Rows: row 1: 4 frames of idle with the rifle held low; row 2: 6 frames of a tactical walk with the rifle; row 3: 4 frames of shouldering the rifle and firing a short burst with recoil, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling down and lying on the ground. The same soldier in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 4. 플레이어 방어구 몸 (4장) · 🔢 4장 모두 `idle 4, walk 6, hit 2, death 5`
📎 4장 모두 **1번 플레이어 결과 그림을 첨부** (같은 사람으로 그려지게)

### 4-1. 방탄 조끼 · 🔧 **player_vest**
```
Using the attached character as the exact reference (same face, same hair, same body, same backpack, bare head), create ONE sprite sheet image of him now wearing a worn olive bulletproof vest over the dark gray hoodie. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 4-2. 전술 조끼 · 🔧 **player_tactical**
```
Using the attached character as the exact reference (same face, same hair, same body, same backpack, bare head), create ONE sprite sheet image of him now wearing a tan tactical plate carrier vest with many pouches, cargo pants and knee pads. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 4-3. 군용 강화복 · 🔧 **player_military**
```
Using the attached character as the exact reference (same face, same hair, same body, bare head), create ONE sprite sheet image of him now wearing olive-green military combat armor with shoulder pads, armored gloves and combat boots. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 4-4. 외골격 슈트 · 🔧 **player_exo**
```
Using the attached character as the exact reference (same face, same hair, bare head), create ONE sprite sheet image of him now wearing a bulky gray metallic powered exoskeleton suit with hydraulic joints on the arms and legs and a small glowing cyan core on the chest. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

---

## 5. 헬멧 4종 (1장) · 🔧 **헬멧 4종 한 장 (1×4)**
📎 콘셉트 아트 · 순서: 왼쪽부터 방탄모 → 전술 헬멧 → 방독면 → 외골격
```
Match the art style of the attached concept image. Create ONE image showing exactly 4 separate helmets in a single horizontal row with wide empty space between them. Order from left to right: 1. a simple olive military ballistic helmet, 2. a black tactical helmet with side rails and a small mounted flashlight, 3. a full-face gas mask helmet with two round glowing lenses and a filter canister, 4. a sleek metallic exoskeleton helmet with a glowing cyan visor slit. Helmets only: no heads, no faces, no people. Each helmet in isometric 3/4 view facing right, as if worn by a character looking right, all the same size. Chunky readable shapes. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No text, no numbers, no labels, no shadow, no border.
```

---

## 6. 캠프 NPC (NPC마다 1장) · 🔢 6장 모두 `idle 4`
📎 콘셉트 아트 + 1번 플레이어 그림 (크기 맞춤)

### 6-1. 암시장 상인 박씨 · 🔧 **merchant**
```
Match the art style of the attached concept image. Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a middle-aged Korean black market trader in ruined Seoul: long dark coat full of pockets, bags and goods hanging from the shoulders, flat cap, cunning smile. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-2. 생존자 대장 한씨 · 🔧 **captain**
```
Match the art style of the attached concept image. Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of an older Korean veteran survivor leader: gray beard, military cap, worn navy officer jacket, a radio on the chest, rifle slung on the back, arms crossed. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-3. 의무병 이씨 · 🔧 **medic**
```
Match the art style of the attached concept image. Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a young Korean field medic woman: dirty white coat with a red cross armband, medical bag on the side, short hair, surgical mask around the neck. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-4. 정비공 최씨 · 🔧 **mechanic**
```
Match the art style of the attached concept image. Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a Korean mechanic: grease-stained orange overalls, welding goggles on the forehead, tool belt, holding a large wrench. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-5. 작전 장교 윤씨 (출격 지도) · 🔧 **deploy**
```
Match the art style of the attached concept image. Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a Korean military operations officer: olive field uniform, beret, headset around the neck, holding an open folded paper map in both hands and studying it. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-6. 창고 관리인 정씨 · 🔧 **stash**
```
Match the art style of the attached concept image. Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of an elderly Korean storehouse keeper: thick padded vest, knitted beanie, reading glasses, a big ring of keys on the belt, holding a clipboard. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 7. 후반 적 (적마다 1장) · 🔢 따로 적힌 것 외에는 `idle 4, walk 6, attack 4, hit 2, death 5`
📎 콘셉트 아트 + 1번 플레이어 그림

### 7-1. 탈주 실험체 (연구소) · 🔧 **subject**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of an escaped lab test subject: very pale gray skin, shaved head with surgical scars, torn white hospital gown, broken restraint straps on the wrists, long sharp fingernail claws, glowing red eyes, fast and feral. Rows: row 1: 4 frames of idle twitching; row 2: 6 frames of a fast crouched run; row 3: 4 frames of a quick slashing claw attack; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, collapsing and lying on the ground. The same creature in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 7-2. 산성 실험체 (연구소) · 🔧 **spitter**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a bloated acid-spitting mutant: swollen sickly green body, a large glowing green acid sac on the throat, torn lab clothes, green drool. Rows: row 1: 4 frames of idle with the throat sac pulsing; row 2: 6 frames of a slow waddling walk; row 3: 4 frames of leaning back then spitting a glob of acid forward in an arc; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, bursting and collapsing. The same mutant in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 7-3. 보안 포탑 (연구소) · 🔧 **sentry** · 🔢 `idle 4, attack 4, hit 2, death 5`
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a stationary laboratory security turret: a squat gray metal base bolted to the floor, a rotating armored head with a twin-barrel gun and a single red sensor light, warning stripes on the base. It never walks. Rows: row 1: 4 frames of idle, the head slowly scanning left and right; row 2: 4 frames of firing a burst from the twin barrels with recoil, no muzzle flash; row 3: 2 frames of getting hit, sparks; row 4: 5 frames of breaking down, smoking and the head slumping. The same turret in every frame, same size, aimed to the right, wide empty gaps between frames, base of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the turret.
```

### 7-4. 방패 돌격병 (강남) · 🔧 **shield**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a riot shield trooper of a private military company: black heavy armor and helmet with a visor, holding a large dark gray ballistic riot shield with a small viewing window in front of the body on the right side, a short baton in the other hand. Rows: row 1: 4 frames of idle behind the raised shield; row 2: 6 frames of a slow heavy advance with the shield forward; row 3: 4 frames of a shield bash, shoving the shield forward; row 4: 2 frames of getting hit and the shield lowering; row 5: 5 frames of a death animation, dropping the shield and falling. The same trooper in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 7-5. 은신 변이체 (잠실) · 🔧 **stalker** · ⚠ 보라색 캐릭터라 **초록 배경**
> 게임이 투명하게 처리하므로 그림은 **잘 보이게** 그리면 됩니다.
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a tall thin stalker mutant predator: dark violet-gray translucent-looking skin, elongated limbs and fingers with long claws, eyeless face with a wide mouth, faint glowing violet spots along the spine. Rows: row 1: 4 frames of idle crouching and swaying; row 2: 6 frames of a fast low prowling run; row 3: 4 frames of crouching then leaping forward with claws extended; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, collapsing and lying on the ground. The same creature in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #00FF00 green background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use bright green on the character.
```

### 7-6. 방사능 군주 타이탄 (여의도 레이드 보스) · 🔧 **boss**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a giant radioactive mutant boss, three times human size: dark green scarred skin, glowing bright green radioactive veins and cracks, armored bony plates, huge claws, glowing yellow eyes. Rows: row 1: 4 frames of a menacing idle with veins pulsing; row 2: 6 frames of a heavy walk; row 3: 4 frames of a massive claw swipe attack; row 4: 2 frames of getting hit and roaring; row 5: 5 frames of a death animation, collapsing to its knees and falling. The same monster in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 8. 랜드마크 (건물마다 1장)
📎 콘셉트 아트 · 결과 코드는 `js/assets.js`의 **`landmarks`** 안에 (sprites 아님)

### 8-1. 무너진 명동성당 · 🔧 **cathedral** · 정사각형
```
Match the art style of the attached concept image. Create ONE image of a single ruined red-brick gothic cathedral (Myeongdong Cathedral in Seoul) with a tall pointed bell tower and a cross, part of the roof collapsed, broken stained glass windows, rubble at the base, a few candles glowing warm. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

### 8-2. 보신각 · 🔧 **bosingak** · 정사각형
```
Match the art style of the attached concept image. Create ONE image of a single traditional Korean bell pavilion (Bosingak in Seoul) on a stone platform: red wooden pillars, a curved dark gray tiled roof with upturned eaves, a large bronze bell hanging inside, weathered and dusty, raider graffiti and scrap barricades around the base. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

### 8-3. 버려진 용산 기지 · 🔧 **base** · 정사각형
```
Match the art style of the attached concept image. Create ONE image of a single abandoned military base compound: a concrete bunker, sandbag walls, a rusty abandoned tank, a small watchtower with a searchlight, barbed wire, military crates. The compound stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the compound: no street, no ground outside it, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

### 8-4. 63빌딩 잔해 · 🔧 **tower63** · **세로로 긴 이미지 (9:16)**
```
Match the art style of the attached concept image. Create ONE tall vertical image of a single ruined golden glass skyscraper (the 63 Building in Seoul): tall tower with golden reflective glass, the top floors broken and collapsed, some windows glowing, green radioactive haze at the base. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

### 8-5. 무너진 코엑스 (강남) · 🔧 **coex** · 정사각형 · ⚠ 분홍 전광판 때문에 **초록 배경**
```
Match the art style of the attached concept image. Create ONE image of a single ruined modern convention center and mall (COEX in Gangnam, Seoul): a wide low building with a large cracked glass atrium dome, a huge broken outdoor LED screen flickering red, collapsed entrance canopy, black military barricades and floodlights of a private army camp at the entrance. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text, no letters on the screen. Solid flat #00FF00 green background. Leave the bottom-right corner empty. Do not use bright green on the building.
```

### 8-6. 롯데월드타워 잔해 (잠실) · 🔧 **lotte** · **세로로 아주 긴 이미지 (9:16)**
```
Match the art style of the attached concept image. Create ONE tall vertical image of a single ruined supertall skyscraper (Lotte World Tower in Jamsil, Seoul): a slender tapering pale gray glass tower, the very top spire broken off, a blinking red aviation light on the broken top, dark organic mutant growths and vines creeping up from the base, a faint cold blue glow in some windows. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. Do not use pink or magenta on the building.
```

---

## 9. 보스 전용 그림 (선택) · 🔢 모두 `idle 4, walk 6, attack 4, hit 2, death 5`
등록하지 않으면 기본 적 그림을 크게 키워 씁니다. 📎 콘셉트 아트 + (있으면) 기본 적 그림 (예: 먹보 → 감염자 그림)

| 🔧 이름 | 누구 | 어디 | 기본 그림 |
|---|---|---|---|
| glutton | 네임드 「먹보」 | 명동 1장 | zombie |
| panther | 네임드 「흑표」 | 종로 2장 | raider |
| argos | 네임드 「아르고스」 | 용산 3장 | drone |
| raven | 네임드 「레이븐」 | 강남 5장 | merc |
| babel | 네임드 「바벨」 | 잠실 6장 (최종) | brute |
| redfang · viper · goliath · hawk · shade | 필드 보스 | 명동·종로·용산·강남·잠실 | dog · raider · brute · merc · stalker |
| warden · butcher · cerberus · colony · anvil · queen | 어설트 거점 보스 | 성당·보신각·기지·63빌딩·코엑스·롯데타워 | brute · raider · drone · brute · shield · brute |
| chimera | 연구소 보스 「키메라」 | 지하 연구소 | brute |

### 9-1. 먹보 · 🔧 **glutton**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a grotesque bloated giant zombie, very fat swollen belly, green-yellow pus boils, tiny head, stubby arms, acid vomit dripping from the mouth. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of vomiting a stream of green acid forward; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same monster in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-2. 흑표 · 🔧 **panther**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a raider gang leader: black panther pelt cloak, spiked shoulder armor, black face paint, holding a sawed-off shotgun. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of firing the shotgun with recoil, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same leader in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-3. 아르고스 · 🔧 **argos** · 🔢 `idle 4, attack 4, hit 2, death 5`
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a large autonomous combat drone: heavy black armored hexagonal body, six rotors, a big glowing red central eye, twin missile pods on the sides, hovering. Rows: row 1: 4 frames of hovering; row 2: 4 frames of launching missiles from its pods, no explosion; row 3: 2 frames of getting hit, sparking; row 4: 5 frames of smoking and crashing to the ground. The same drone in every frame, same size, all facing right, wide empty gaps between frames. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the drone.
```

### 9-4. 레이븐 · 🔧 **raven**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of the commander of a private military company: long black armored officer coat, black tactical helmet with a raven-beak shaped visor, black feathers on the shoulder armor, a radio headset, holding a black assault rifle with one hand and a signal flare in the other. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of raising the flare to call an airstrike then firing the rifle, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same commander in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-5. 바벨 (최종 보스) · 🔧 **babel** · ⚠ 보라색이라 **초록 배경**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of the final boss, a towering mutant overlord three times human size: dark purple-black chitin armor plates, a crown of bony spikes on the head, many thin tendrils from the back, glowing violet eyes and veins, long scythe-like claws. Rows: row 1: 4 frames of a menacing idle with tendrils swaying; row 2: 6 frames of a heavy slow walk; row 3: 4 frames of raising both claws then slamming the ground; row 4: 2 frames of getting hit and roaring; row 5: 5 frames of a death animation, collapsing to its knees and falling. The same monster in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #00FF00 green background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use bright green on the character.
```

### 9-6. 붉은 이빨 · 🔧 **redfang**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a giant mutated wolf-dog, size of a bear, red-tinted hairless hide, rows of oversized teeth, bony spikes along the spine, four legs, seen from the side. Rows: row 1: 4 frames of idle; row 2: 6 frames of a running cycle; row 3: 4 frames of a charging bite lunge; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling on its side. The same beast in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the creature.
```

### 9-7. 독사 · 🔧 **viper**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a raider warlord: green snake-scale leather coat, gas mask with snake fangs painted on it, ammo belts, holding an assault rifle. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of firing the rifle in a wide sweep, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same warlord in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-8. 골리앗 · 🔧 **goliath**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a gigantic lab-experiment mutant, three times human size: pale gray skin with surgical stitches, metal braces bolted to its arms and spine, broken restraint chains hanging from the wrists. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of a two-handed ground slam; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same mutant in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-9. 매 (강남 필드 보스) · 🔧 **hawk**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of an elite private military sniper: gray-black ghillie-style tactical cloak, black helmet with a glowing yellow monocular scope over one eye, holding a long black sniper rifle. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of aiming and firing the sniper rifle with strong recoil, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same sniper in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-10. 그림자 (잠실 필드 보스) · 🔧 **shade** · ⚠ **초록 배경**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a huge alpha stalker predator, twice human size: dark violet-black skin, extremely long thin limbs, a hunched back with bony ridges, eyeless head with a split jaw, long blade-like claws, faint violet glow along the spine. Rows: row 1: 4 frames of idle crouching; row 2: 6 frames of a fast low prowl; row 3: 4 frames of a lunging double claw strike; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, collapsing and lying on the ground. The same creature in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #00FF00 green background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use bright green on the character.
```

### 9-11. 파수꾼 · 🔧 **warden**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a huge mutant brute guarding a ruined cathedral: cracked stone-gray skin, a broken church bell fused to one arm like a shield, tattered priest robes. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of swinging the bell arm in a heavy smash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same brute in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-12. 도살자 · 🔧 **butcher**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a raider executioner: bloody butcher apron over scrap armor, metal executioner hood, holding a pistol and a cleaver. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of firing the pistol, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same executioner in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-13. 케르베로스 · 🔧 **cerberus**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a three-headed military defense robot dog made of armored steel plates, three red sensor heads, a gun turret on its back, four mechanical legs. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of firing the back turret, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same robot in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-14. 군체 · 🔧 **colony**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a towering radioactive hive mutant, three times human size, made of many fused bodies, glowing green tumors and veins, several arms and mouths. Rows: row 1: 4 frames of idle; row 2: 6 frames of a walk cycle; row 3: 4 frames of lashing out with multiple arms; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling and lying on the ground. The same mutant in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-15. 모루 (코엑스 거점 보스) · 🔧 **anvil**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a massive heavy-weapons riot trooper: huge bulky black armor like a walking tank, a thick steel tower shield bolted to the left arm, a rotary minigun on the right arm, a small glowing yellow visor slit. Rows: row 1: 4 frames of idle behind the shield; row 2: 6 frames of a slow heavy stomping walk; row 3: 4 frames of slamming the shield into the ground then firing the minigun, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling forward and lying on the ground. The same trooper in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-16. 여왕 (롯데타워 거점 보스) · 🔧 **queen**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of a huge mutant brood queen, three times human size: swollen glowing egg sac abdomen, insect-like dark carapace, a tall crested head, four long clawed arms, dripping green acid. Rows: row 1: 4 frames of idle with the egg sac pulsing; row 2: 6 frames of a slow crawling walk; row 3: 4 frames of spraying acid forward and lashing with claws; row 4: 2 frames of getting hit and shrieking; row 5: 5 frames of a death animation, collapsing and lying on the ground. The same monster in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 9-17. 키메라 (지하 연구소 보스) · 🔧 **chimera**
```
Match the art style of the attached concept image. Create ONE sprite sheet image of the final lab experiment, a chimera mutant three times human size: flayed raw red muscles partly covered with pale stitched skin, one arm a huge bony claw and the other a tentacle, shattered glass and tubes from a containment tank still stuck in its back, glowing green eyes. Rows: row 1: 4 frames of idle breathing heavily; row 2: 6 frames of a lurching walk; row 3: 4 frames of a sweeping claw strike; row 4: 2 frames of getting hit and roaring; row 5: 5 frames of a death animation, collapsing and lying on the ground. The same monster in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 10. 타이틀 키아트 (1장) · 가공 없음 · **가로 16:9**
📎 콘셉트 아트 · 저장: `assets/title.png` → `js/assets.js`의 `title: null`을 `title: 'title.png'`로 바꾸기
> 게임 제목·메뉴는 게임이 위에 올리므로 **글자 없이**, 화면 **가운데 위쪽과 아래쪽을 비워** 두세요.
```
Match the art style of the attached concept image. Create ONE wide 16:9 cinematic key art image for a post-apocalyptic action RPG set in Seoul in the year 2049. A lone survivor with a backpack and a rifle stands on a broken rooftop on the left third of the image, seen from behind, looking over the ruined Seoul skyline at night: the broken N Seoul Tower on a dark hill, collapsed skyscrapers, a ruined glass supertall tower on the far horizon with a blinking red light, scattered fires and a few flickering Korean neon signs in the streets below, falling ash, a faint green radioactive glow near the river. Moody dark blue night sky with warm orange firelight. Keep the upper center and the bottom area darker and empty for the game title and menu. Detailed dark pixel art, desaturated colors with warm orange highlights. No text, no letters, no logo, no watermark, no border.
```

---

## 11. 무기를 든 플레이어 몸 (v1.7.7) · 🔢 모두 `idle 4, walk 6, attack 3, hit 2, death 5`

빈손 몸 + 무기를 따로 붙이는 방식은 손과 총이 따로 놀아 보입니다. **총을 든 몸**을 그려 두면 게임이 그 그림을 쓰고 무기를 따로 붙이지 않습니다.

| 그룹 | 쓰는 무기 | 그림 속 총 |
|---|---|---|
| **long** (장총) | 기관단총 · 산탄총 · 돌격소총 · 저격소총 · 기관총 | 검은 돌격소총 하나로 통일 |
| **pistol** (권총) | 권총 | 검은 권총 |
| **heavy** (둔기) | 쇠파이프 · 소방 도끼 | 빨간 소방 도끼 (v1.7.9) |
| **blade** (칼) | 고주파 블레이드 | 푸른 날 블레이드 (v1.7.9) |

- 방어구마다 2장(장총·권총)씩 필요합니다. **올라온 것부터 바로 적용**되고, 없는 조합은 지금 방식으로 보입니다.
- 추천 순서: **기본 몸 장총 → 기본 몸 권총** → 자주 입는 방어구 → 나머지
- 📎 **반드시 같은 방어구의 빈손 몸 그림을 첨부**하세요 (art_raw의 `Player.png`, `player_best1~4.png`). 얼굴·옷·크기가 똑같아야 장비를 바꿀 때 어색하지 않습니다.
- 총은 **항상 수평으로 오른쪽을 겨눈 자세**입니다 (왼쪽은 게임이 뒤집음). 위·아래 조준은 게임이 총알 방향으로 처리합니다.
- 헬멧은 게임이 머리에 씌우므로 **맨머리**로 그립니다.

| 🔧 도구 이름 = art_raw 파일 이름 | 방어구 | 📎 첨부할 빈손 몸 |
|---|---|---|
| `player_long` · `player_pistol` | 없음 (후드) | `Player.png` |
| `player_vest_long` · `player_vest_pistol` | 방탄 조끼 | `player_best1.png` |
| `player_tactical_long` · `player_tactical_pistol` | 전술 조끼 | `player_best2.png` |
| `player_military_long` · `player_military_pistol` | 군용 강화복 | `player_best3.png` |
| `player_exo_long` · `player_exo_pistol` | 외골격 | `player_best4.png` |
| (근접) `player_heavy` · `player_blade` · `player_vest_heavy` · `player_vest_blade` … | 위와 같은 순서 | 위와 같음 |

### 11-1. 장총 든 몸 · 🔧 **player_long** (방어구 버전은 이름만 바꿔 같은 프롬프트)
📎 해당 방어구의 빈손 몸 그림 + 콘셉트 아트
```
Using the attached character as the exact reference (same face, same hair, same body, same clothes and armor, same backpack, same size, bare head), create ONE sprite sheet image of him now holding a black assault rifle with both hands in a firing stance: the stock tucked into the right shoulder, the left hand on the front grip, the barrel pointing straight to the RIGHT and level with the ground. The rifle stays in his hands in every frame except the death frames. Rows: row 1: 4 frames of idle breathing while aiming the rifle forward; row 2: 6 frames of a walk cycle while keeping the rifle aimed forward; row 3: 3 frames of firing the rifle with a small recoil kick, no muzzle flash, no bullets; row 4: 2 frames of getting hit and flinching backward while still holding the rifle; row 5: 5 frames of a death animation, dropping the rifle, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No helmet, no shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 11-2. 권총 든 몸 · 🔧 **player_pistol** (방어구 버전은 이름만 바꿔 같은 프롬프트)
📎 해당 방어구의 빈손 몸 그림 + 콘셉트 아트
```
Using the attached character as the exact reference (same face, same hair, same body, same clothes and armor, same backpack, same size, bare head), create ONE sprite sheet image of him now holding a black M1911 pistol with both hands in a firing stance, arms extended forward at chest height, the pistol pointing straight to the RIGHT and level with the ground. The pistol stays in his hands in every frame except the death frames. Rows: row 1: 4 frames of idle breathing while aiming the pistol forward; row 2: 6 frames of a walk cycle while keeping the pistol aimed forward; row 3: 3 frames of firing the pistol with a small recoil kick of the hands, no muzzle flash, no bullets; row 4: 2 frames of getting hit and flinching backward while still holding the pistol; row 5: 5 frames of a death animation, dropping the pistol, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No helmet, no shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 11-3. 둔기(도끼) 든 몸 · 🔧 **player_heavy** · 🔢 `idle 4, walk 6, attack 4, hit 2, death 5`
📎 해당 방어구의 빈손 몸 그림 + 콘셉트 아트 · 방어구 버전: `player_vest_heavy` · `player_tactical_heavy` · `player_military_heavy` · `player_exo_heavy`
```
Using the attached character as the exact reference (same face, same hair, same body, same clothes and armor, same backpack, same size, bare head), create ONE sprite sheet image of him now holding a red fire axe with a long wooden handle in both hands, in a ready stance with the axe head raised near the right shoulder. The axe stays in his hands in every frame except the death frames. Rows: row 1: 4 frames of idle breathing in the ready stance; row 2: 6 frames of a walk cycle holding the axe ready; row 3: 4 frames of one big horizontal swing to the RIGHT: wind-up behind the shoulder, fast swing forward, follow-through, return to ready (no motion blur, no slash effect); row 4: 2 frames of getting hit and flinching backward while still holding the axe; row 5: 5 frames of a death animation, dropping the axe, falling down and lying on the ground. Keep the head and face steady and upright in every frame. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No helmet, no shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 11-4. 블레이드 든 몸 · 🔧 **player_blade** · 🔢 `idle 4, walk 6, attack 4, hit 2, death 5`
📎 해당 방어구의 빈손 몸 그림 + 콘셉트 아트 · 방어구 버전: `player_vest_blade` · `player_tactical_blade` · `player_military_blade` · `player_exo_blade`
```
Using the attached character as the exact reference (same face, same hair, same body, same clothes and armor, same backpack, same size, bare head), create ONE sprite sheet image of him now holding a long high-frequency sci-fi sword with a black handle and a faint cyan glowing blade in his right hand, in a low ready stance with the blade pointing forward to the RIGHT. The sword stays in his hand in every frame except the death frames. Rows: row 1: 4 frames of idle breathing in the ready stance; row 2: 6 frames of a fast walk cycle holding the sword ready; row 3: 4 frames of one quick horizontal slash to the RIGHT: draw back, fast slash forward, follow-through, return to ready (no motion blur, no slash effect); row 4: 2 frames of getting hit and flinching backward while still holding the sword; row 5: 5 frames of a death animation, dropping the sword, falling down and lying on the ground. Keep the head and face steady and upright in every frame. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No helmet, no shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

> 결과가 이상할 때: 총이 비스듬하면 "barrel perfectly horizontal" 을, 사람이 바뀌면 빈손 몸 그림을 다시 첨부했는지 확인하세요. 행이 섞이거나 공격·피격이 한 줄에 그려져도 괜찮습니다 (가공할 때 세어서 맞춥니다).

---

## 12. 소품 · 맵 꾸미기 (v1.18) · 한 장에 여러 개 (격자)

지금 거리·캠프의 소품은 전부 코드로 그린 도형입니다. 아래 6장을 만들면 **등록한 것부터 그림으로 바뀝니다** (없는 건 지금 그대로).
불빛·불꽃·경광등·연기는 게임이 그림 위에 계속 얹으므로 **그림에는 켜진 불·불꽃을 그리지 않습니다.**

| 장 | 🔧 도구 이름 | 격자 | 파일 이름 | 들어가는 곳 |
|---|---|---|---|---|
| 12-1 | **v1.18 거리 소품 9종** | 3×3 | `props_street.png` | 가로등 · 나무 · 죽은 나무 · 쓰레기봉투 · 고깔 · 드럼통 · 소화전 · 벤치 · 신호등 |
| 12-2 | **v1.18 차량 6종** | 3×2 | `props_vehicle.png` | 길 위 폐차 3종 · 경찰차 · 버스 · 불탄 차 |
| 12-3 | **v1.18 맵 오브젝트 9종** | 3×3 | `props_object.png` | 뒤질 곳 4종 · 금고 · 보급 상자 · 발전기 · 변이 둥지 · 지뢰 |
| 12-4 | **v1.18 캠프 소품 9종** | 3×3 | `props_camp.png` | 천막 · 의무 천막 · 상자 더미 · 작업대 · 작전 탁자 · 무전기 · 모닥불 · 컨테이너 · 모래주머니 |
| 12-5 | **v1.18 잔해·옥상 장식 9종** | 3×3 | `props_deco.png` | 잔해 더미 · 콘크리트 판 · 옥상 물탱크·실외기·안테나 · 타이어 · 쇼핑카트 · 쓰레기 |
| 12-6 | **v1.22 서울 거리 소품 6종** | 3×2 | `props_seoul.png` | 전봇대 · 버스 정류장 · 포장마차 · 배달 오토바이 · 지하철 입구 · 옥상 교회 십자가 |

**순서**: 회색 상자 → Gemini (📎 콘셉트 아트 첨부) → 결과를 `art_raw/new/`에 위 파일 이름으로 올리기 → 끝 (가공·등록은 제가 합니다).
직접 할 때: 도구에서 🔧 이름 선택 → 그림 끌어다 놓기 → **PNG 다운로드**를 `assets/`에 → 도구 아래 코드를 `js/assets.js`의 **`props`** 안에 붙여넣기.

**격자 규칙 (중요)**: 도구는 그림을 **격자 칸으로 똑같이 나눠** 칸마다 물건 하나를 꺼냅니다. 순서는 **왼쪽 위 → 오른쪽 → 다음 줄**이고, 물건마다 칸 가운데에 두고 **바닥에 닿는 부분이 칸 아래쪽**에 오게 합니다. 칸이 비거나 두 물건이 붙으면 그 칸만 빠집니다 (도구가 알려 줌).
크기는 상관없습니다 — 게임이 `js/assets.js`의 `propFit`(화면 가로 px)에 맞춰 줄입니다.

### 12-1. 거리 소품 9종 · 🔧 **v1.18 거리 소품 9종 (3×3)** · `props_street.png`
📎 콘셉트 아트
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate street props from a ruined post-apocalyptic Seoul, each centered in its own equal cell with wide empty space between them, every prop standing upright with its base at the bottom of its cell. In order, left to right, top to bottom: 1) a tall broken Korean street lamp, curved metal pole with the lamp head arching to the right, lamp OFF (dark glass); 2) a small leafy roadside ginkgo tree in a square tree pit; 3) a dead leafless tree with bare twisted branches; 4) a pile of three tied black garbage bags with some scattered paper; 5) an orange traffic cone with white stripes on a square base; 6) a rusty open-top steel oil drum used as a fire barrel, NO fire, NO flames; 7) a red Korean fire hydrant; 8) a weathered wooden park bench with a black metal frame, the long side running diagonally toward the bottom-right; 9) a traffic light pole with a horizontal arm reaching to the LEFT holding a dark three-light signal box, all lights OFF. All props in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, same scale (the lamp and traffic light are the tallest). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no street, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the props.
```

### 12-2. 차량 6종 · 🔧 **v1.18 차량 6종 (3×2)** · `props_vehicle.png`
📎 콘셉트 아트 · ⚠ **모든 차가 같은 방향**(앞이 오른쪽 아래)이어야 합니다. 반대 차선은 게임이 뒤집어 씁니다.
```
Match the art style of the attached concept image. Create ONE image with a 3 by 2 grid of 6 separate abandoned vehicles from a ruined post-apocalyptic Seoul, each centered in its own equal cell with wide empty space between them. EVERY vehicle points the SAME way: parked diagonally with its FRONT toward the BOTTOM-RIGHT of the image (isometric view, the long side of the vehicle runs from top-left to bottom-right), wheels on the ground at the bottom of the cell. In order, left to right, top to bottom: 1) a dusty gray Korean compact sedan with a cracked windshield and a flat tire; 2) a rusty dark green SUV with a dented door; 3) a faded red hatchback with broken side windows and rust patches; 4) an abandoned white Korean police car with a dark blue stripe and a roof light bar (lights OFF); 5) a long green Seoul city bus, windows partly broken, doors open (this one is much longer than the cars); 6) a completely burnt-out black car shell, charred and rusted, no fire. All in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, realistic relative scale (the bus is about 3 times longer than a car). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no road, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the vehicles.
```

### 12-3. 맵 오브젝트 9종 · 🔧 **v1.18 맵 오브젝트 9종 (3×3)** · `props_object.png`
📎 콘셉트 아트 · 뒤질 곳(1~4)은 뒤지고 나면 게임이 어둡게 만듭니다
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate objects for a post-apocalyptic looting game, each centered in its own equal cell with wide empty space between them, every object resting on its base at the bottom of its cell. In order, left to right, top to bottom: 1) a dark green metal garbage dumpster with a half-open lid; 2) a tall olive-green military storage locker with stenciled markings; 3) a white sealed laboratory equipment case with a blue stripe and a small keypad; 4) a dusty abandoned canvas backpack lying on its side; 5) a heavy steel wall safe on the floor with a round combination dial, door closed; 6) an olive military supply airdrop crate with white markings and a collapsed parachute bundle on top; 7) a yellow portable diesel generator with a fuel can beside it; 8) a large pulsing mutant flesh nest: a dark red organic mound with veins, small glowing yellow egg sacs and short tentacles spreading on the ground; 9) a small round olive anti-personnel landmine with a tiny sensor on top. All in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, realistic relative scale (the nest is the largest, the landmine the smallest). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the objects.
```

### 12-4. 캠프 소품 9종 · 🔧 **v1.18 캠프 소품 9종 (3×3)** · `props_camp.png`
📎 콘셉트 아트 · 모닥불은 **장작과 돌만** (불꽃은 게임이 그림)
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate props for a survivor camp inside a ruined Seoul subway plaza, each centered in its own equal cell with wide empty space between them, every prop resting on its base at the bottom of its cell. In order, left to right, top to bottom: 1) a worn olive-green canvas A-frame tent with an open flap; 2) a white medical A-frame tent with a big red cross on the side; 3) a stack of wooden supply crates with a small green military box on top; 4) a mechanic's workbench made of steel with tools, a vise and scrap parts; 5) a wooden operations table with a paper map of Seoul and a small unlit lantern; 6) a field radio set on a crate with a tall thin antenna mast and guy wires; 7) a campfire ring of gray stones with crossed charred logs, NO fire, NO flames; 8) a rusty blue shipping container with doors closed; 9) a short wall of stacked tan sandbags, three layers high, with a strand of barbed wire on top. All in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, realistic relative scale (the shipping container and tents are the largest). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no people, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the props.
```

### 12-5. 잔해·옥상 장식 9종 · 🔧 **v1.18 잔해·옥상 장식 9종 (3×3)** · `props_deco.png`
📎 콘셉트 아트 · 1·2·3·7·9는 잔해 바닥에 흩어 놓고, 4·5·6은 건물 옥상에 올라갑니다
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate debris and rooftop props from a ruined post-apocalyptic Seoul, each centered in its own equal cell with wide empty space between them, every prop resting on its base at the bottom of its cell. In order, left to right, top to bottom: 1) a low wide pile of broken concrete chunks and bricks with bent rusty rebar sticking out; 2) a smaller rubble pile of gray concrete pieces and dust; 3) a large cracked slab of concrete floor tilted at an angle with rebar edges; 4) a round blue rooftop water tank on a small steel stand; 5) a gray rooftop air conditioner outdoor unit with a fan grille; 6) a thin rooftop TV antenna mast with crossbars; 7) a stack of four old car tires; 8) an abandoned rusty shopping cart tipped slightly; 9) a scattered heap of trash: broken boxes, plastic crates and newspapers. All in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, realistic relative scale. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the props.
```

### 12-6. 서울 거리 소품 6종 · 🔧 **v1.22 서울 거리 소품 6종 (3×2)** · `props_seoul.png`
📎 콘셉트 아트 · 게임이 계속 코드로 얹는 것: **전봇대 사이 전선**, **지하철 역 이름·노선 번호 기둥**, **십자가 빨간 불빛** → 그림에는 전선·글씨·켜진 불을 넣지 않습니다
```
Match the art style of the attached concept image. Create ONE image with a 3 by 2 grid of 6 separate street props that make a ruined post-apocalyptic city feel like SEOUL, KOREA, each centered in its own equal cell with wide empty space between them, every prop standing upright with its base at the bottom of its cell. In order, left to right, top to bottom: 1) a tall gray concrete Korean utility pole with two short crossbars near the top, white ceramic insulators, a small gray cylindrical transformer box hanging on one side, and a yellow-and-black warning band near the bottom, NO wires hanging off it; 2) a Seoul city bus stop shelter: thin steel posts, a glass back panel with cracks, a curved green roof, a narrow bench, and a small blank blue sign panel on a post (no letters), the long side running diagonally toward the bottom-right; 3) an abandoned Korean street food tent bar (pojangmacha): an orange-red plastic tarp tent over a metal frame, a rolled-up front flap, a small counter, and a few stacked red plastic stools beside it; 4) a Korean food delivery motor scooter standing on its kickstand, with a square insulated delivery box on the back, dusty and scratched; 5) a Seoul subway station stair entrance: low concrete walls with steps going DOWN into darkness, covered by a curved glass-and-steel canopy, open at the front, NO sign pillar, NO letters; 6) a small rooftop church cross: a slim metal pole holding a plain cross made of red neon tubes, the neon OFF (dark red glass), no glow. All props in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, realistic relative scale (the utility pole is the tallest, about 3 times a person; the subway entrance and food tent are the widest). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no street, no people, no wires, no text, no letters, no numbers, no grid lines, no border. Do not use pink or magenta on the props.
```

> v1.21부터 사람이 실제 비율(약 1.75m)로 작아졌습니다. 12-2 차량을 이미 만들었다면 그대로 써도 게임이 승용차 2칸 · 버스 5칸 크기로 맞춥니다. 새로 만든다면 프롬프트의 "the bus is about 3 times longer than a car"를 **"about 2.5 times longer"**로 바꾸면 더 정확합니다.

> 소품이 너무 크거나 작게 보이면 `js/assets.js`의 `propFit`에서 그 키의 `w`(화면 가로 px)만 바꾸면 됩니다. 땅에서 떠 보이면 `y`를 키우세요.

---

## 13. 건물 외벽 · 옥상 질감 (v1.19) · 한 장에 여러 개 (격자)

건물은 매 출격마다 크기·높이가 달라서 **통째 그림이 아니라 "질감"**을 씁니다. 게임이 건물 상자의 벽·옥상 면에 그림을 **기울여 붙이고, 층마다 반복**합니다 (1층은 상가 질감). 같은 블록의 건물은 같은 외벽을 씁니다.
- 외벽 한 칸 = **건물 한 칸 너비 × 한 층 높이를 정면에서 본 평면 그림** (원근·기울임 없음). 가로:세로 = **8:9** (거의 정사각형, 세로가 조금 김)
- 반복해서 이어 붙이므로 **위·아래·좌·우 끝이 자연스럽게 이어져야** 합니다 (가장자리에 테두리·그림자 금지)
- 명암(남쪽 면은 어둡게)·건물마다 밝기 차이는 게임이 넣으므로 **고르게 밝게** 그립니다

| 지역 | 쓰는 외벽 |
|---|---|
| 명동 · 종로 · 잠실 | 벽돌 · 아파트 (· 사무실 · 불탄 벽) |
| 용산 · 여의도 | 사무실 · 불탄 벽 · 유리 |
| 강남 | 유리 (고층은 항상) · 사무실 |
지역별 후보는 `js/assets.js`의 `texZones`에서 바꿀 수 있습니다.

### 13-1. 외벽 질감 6종 · 🔧 **v1.19 건물 외벽 질감 6종 (3×2)** · `tex_facade.png`
📎 콘셉트 아트
```
Match the art style of the attached concept image. Create ONE image with a 3 by 2 grid of 6 separate flat building facade texture tiles for a post-apocalyptic Seoul, each tile a FLAT FRONT ORTHOGRAPHIC view (no perspective, no isometric angle, no depth), each tile a solid filled rectangle slightly taller than wide (width to height ratio 8:9), placed in its own equal cell with wide empty space between tiles. Each tile shows exactly ONE story of ONE narrow section of a building wall, designed to repeat seamlessly: the left edge matches the right edge and the top edge matches the bottom edge, no border, no frame, no outline around the tile. In order, left to right, top to bottom: 1) a beige weathered Korean apartment wall with two windows, small balcony railing, stains and cracks, one window faintly lit warm orange; 2) a dark red brick wall with two old windows with metal frames, one window boarded up; 3) a gray concrete office wall with a horizontal ribbon window, dirty glass, one dim fluorescent light inside; 4) a dark blue glass curtain wall of a skyscraper with thin metal mullions, a few cracked panes reflecting faint light; 5) a burnt soot-blackened concrete wall with two shattered empty window holes and scorch marks; 6) a ground floor storefront: a closed rusty metal roll-down shutter with graffiti and a blank dark sign band above it (no letters). Evenly lit, no shadows on the tiles, no sky, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No text, no letters, no numbers, no grid lines between tiles. Do not use pink or magenta inside the tiles.
```

### 13-2. 옥상 질감 3종 · 🔧 **v1.19 옥상 질감 3종 (3×1)** · `tex_roof.png`
📎 콘셉트 아트 · 하나가 옥상 4×4칸에 걸쳐 펼쳐지므로 무늬가 크고 고르게
```
Match the art style of the attached concept image. Create ONE image with 3 separate square flat rooftop floor textures side by side for a post-apocalyptic Seoul, each a solid filled SQUARE seen from DIRECTLY ABOVE (top-down orthographic, no perspective), placed in its own equal cell with wide empty space between them. Each texture must tile seamlessly: the left edge matches the right edge and the top edge matches the bottom edge, no border, no frame. From left to right: 1) a weathered gray concrete roof slab with expansion joints, cracks, water stains and a little moss; 2) a light brown gravel roof with scattered small stones, a few puddle marks and debris; 3) a dark patched tar waterproofing roof with seams, bubbles and old repair patches. Evenly lit, no shadows, no objects, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No text, no letters, no numbers, no grid lines between tiles. Do not use pink or magenta inside the tiles.
```

> 이음매가 보이면: 해당 칸만 "seamless tileable texture, edges match exactly" 를 강조해 다시 생성하세요. 창문이 너무 크면 "smaller windows, more wall" 을 덧붙이세요.

---

## 14. 건물 내부 꾸미기 (v1.25) · 한 장에 여러 개 (격자)

들어갈 수 있는 상가 12종(편의점 · 약국 · 마트 · 서점 · 전자상가 · 카페 · 분식집 · 은행 · 병원 · 파출소 · PC방 · 세탁소)의 실내입니다.
아래 3장을 `art_raw/new/`에 올리면 **등록한 것부터 바로 그림으로 바뀝니다** (없는 건 지금 코드 그림 그대로).

| 장 | 🔧 도구 이름 | 격자 | 파일 이름 | 들어가는 곳 |
|---|---|---|---|---|
| 14-1 | **v1.25 실내 소품 9종 — 상가** | 3×3 | `props_interior1.png` | 상가마다 진열대·탁자 (한 칸짜리, 줄지어 반복) |
| 14-2 | **v1.25 실내 소품 9종 — 창구·상자·장식** | 3×3 | `props_interior2.png` | 은행·병원·파출소 창구 · 보급 상자(닫힘/열림) · 바닥 장식 4종 |
| 14-3 | **v1.25 실내 바닥 질감 6종** | 3×2 | `tex_floor.png` | 상가 바닥 (2×2칸에 한 장을 펼침) |

- 진열대·창구는 **게임이 한 칸에 하나씩 줄지어 놓습니다** → 한 칸(약 1.6m) 크기의 **한 단위**만 그리면 됩니다. 길게 이어 그리지 마세요.
- **긴 쪽이 왼쪽 위 → 오른쪽 아래**로 놓이게 (벤치·정류장과 같은 방향). 반대 방향 줄은 게임이 뒤집어 씁니다.
- 넘어진 의자 · 상자 · 잔해 · 병원 침대는 **장식**: 그림이 있을 때만 바닥에 드물게 흩어 놓고, 부딪히지 않습니다.
- 어느 상가에 어느 그림이 들어가는지는 `js/assets.js`의 `shopArt`에서 바꿀 수 있습니다.

### 14-1. 상가 소품 9종 · 🔧 **v1.25 실내 소품 9종 — 상가 (3×3)** · `props_interior1.png`
📎 콘셉트 아트
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate interior furniture pieces from abandoned shops in post-apocalyptic Seoul, each centered in its own equal cell with wide empty space between them, every piece standing on its base at the bottom of its cell. Each piece is ONE short unit about as wide as a person is tall, with its long side running diagonally toward the bottom-right. In order, left to right, top to bottom: 1) a Korean convenience store snack shelf, metal, half-empty with colorful chip bags and ramen cups, some fallen; 2) a white pharmacy shelf with small medicine boxes and bottles, mostly looted; 3) a wooden bookstore bookshelf with dusty books, some fallen; 4) an electronics store display shelf with old TVs, phones and boxes, glass cracked; 5) a supermarket refrigerated drink cooler with a glass door, dark and dirty, a few bottles inside; 6) a small round cafe table with two wooden chairs; 7) a stainless steel Korean snack-bar (bunsik) table with two round stools; 8) a white front-loading washing machine from a laundromat, dirty; 9) a PC-bang gaming desk with a dark monitor, keyboard and a reclining gaming chair. All in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, realistic relative scale. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no floor, no walls, no people, no text, no letters, no logos, no numbers, no grid lines, no border. Do not use pink or magenta on the objects.
```

### 14-2. 창구 · 상자 · 장식 9종 · 🔧 **v1.25 실내 소품 9종 — 창구·상자·장식 (3×3)** · `props_interior2.png`
📎 콘셉트 아트 · 5번(열린 상자)은 4번과 **같은 상자**가 뚜껑이 열리고 비어 있는 모습
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate interior objects from abandoned buildings in post-apocalyptic Seoul, each centered in its own equal cell with wide empty space between them, every object resting on its base at the bottom of its cell. Counters (1 to 3) are ONE short unit about as wide as a person is tall, with the long side running diagonally toward the bottom-right. In order, left to right, top to bottom: 1) a Korean bank teller counter segment with a cracked glass partition on top; 2) a white hospital reception counter segment with scattered papers and a dark monitor; 3) a gray Korean police station desk with a dark monitor, files and a desk lamp (off); 4) a closed olive military supply crate with a latch and stenciled marks; 5) the SAME crate but open and empty, lid leaning on its side; 6) a fallen wooden chair lying on its side; 7) a small stack of three dusty cardboard boxes, one torn; 8) a flat patch of fallen ceiling tiles, broken plaster and scattered papers on the floor (very low); 9) an old hospital bed with a stained mattress and metal rails. All in the same isometric 3/4 top-down view (camera about 35 degrees above), same lighting from the upper left, realistic relative scale. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no floor, no walls, no people, no text, no letters, no logos, no numbers, no grid lines, no border. Do not use pink or magenta on the objects.
```

### 14-3. 실내 바닥 질감 6종 · 🔧 **v1.25 실내 바닥 질감 6종 (3×2)** · `tex_floor.png`
📎 콘셉트 아트 · 한 장이 바닥 2×2칸에 펼쳐지므로 무늬가 너무 크지 않게
```
Match the art style of the attached concept image. Create ONE image with a 3 by 2 grid of 6 separate square indoor floor textures for abandoned shops in post-apocalyptic Seoul, each a solid filled SQUARE seen from DIRECTLY ABOVE (top-down orthographic, no perspective), placed in its own equal cell with wide empty space between them. Each texture must tile seamlessly: the left edge matches the right edge and the top edge matches the bottom edge, no border, no frame. In order, left to right, top to bottom: 1) dirty white square ceramic floor tiles of a convenience store, a few cracked tiles and dust; 2) worn brown wooden floorboards of a cafe, scratches and stains; 3) faded green hospital linoleum with scuffs and a few tears; 4) dark gray stained carpet of a PC bang with a subtle pattern; 5) polished beige stone tiles of a bank lobby, cracked and dusty; 6) bare gray concrete floor with oil stains and cracks. Evenly lit, no shadows, no objects, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No text, no letters, no numbers, no grid lines between tiles. Do not use pink or magenta inside the tiles.
```

> 소품이 칸보다 커서 겹치면 `js/assets.js`의 `propFit`에서 그 키의 `w`를 줄이세요 (기본 34).

---

## 15. 외벽 다양화 (v1.31.1) · 한 장에 여러 개 (격자)

건물 외벽은 **한 칸(약 1.6m) × 한 층(2.7m)** 크기의 그림을 층마다 쌓아 붙입니다. 그래서 그림 하나는 **세로로 긴 직사각형 (가로:세로 ≈ 3:5)** 이어야 합니다 (정사각형으로 만들면 옆으로 눌려 보임).
- 15-1 **1층 상가 9종**: 일반 건물 1층에 칸·면마다 다른 가게가 들어감 → 거리가 가게들로 이어져 보임
- 15-2 **위층 외벽 9종**: 지역마다 섞여 쓰임 (명동 상가 간판틀 · 종로 타일·빌라 · 용산 군 시설 · 여의도 석재 · 잠실 복도식 아파트 …)
- 15-3·15-4 **들어갈 수 있는 상가 12종의 가게 앞모습**: 그 상가 외벽 1층 (위층은 지역 외벽). 문은 게임이 따로 그리므로 **문 없이 쇼윈도만**, 간판 자리는 비워 두기 (게임이 한글 간판을 씀)

| 장 | 🔧 도구 이름 | 격자 | 파일 이름 |
|---|---|---|---|
| 15-1 | v1.31.1 1층 상가 9종 | 3×3 | `tex_ground.png` |
| 15-2 | v1.31.1 위층 외벽 9종 | 3×3 | `tex_facade3.png` |
| 15-3 | v1.31.1 상가 앞모습 1 (6종) | 3×2 | `tex_shopfront1.png` |
| 15-4 | v1.31.1 상가 앞모습 2 (6종) | 3×2 | `tex_shopfront2.png` |

공통 규칙: **정면에서 본 평평한 그림** (원근 없음, 기울이지 않음) · 칸마다 하나 · 칸 사이는 마젠타 · 글씨·숫자·로고 없음 · 좌우가 이어지게 (옆 칸에 같은 그림을 붙여도 자연스럽게)

### 15-1. 1층 상가 9종 · `tex_ground.png`
📎 콘셉트 아트
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate flat building texture panels for the ground floor of abandoned shops in a ruined post-apocalyptic Seoul, each panel a TALL RECTANGLE (width to height about 3:5), seen perfectly FRONT-ON (orthographic, no perspective, no angle), placed in its own equal cell with thin magenta gaps between them. Each panel shows ONE narrow shop bay exactly one storey high, filling the whole panel edge to edge, and its left and right edges continue seamlessly. In order, left to right, top to bottom: 1) a rolled-down rusty metal shutter covered in spray-paint graffiti shapes (no readable letters); 2) a shattered glass shop window with dark empty shelves behind; 3) a small restaurant front with a torn striped fabric awning and fogged window; 4) a mobile phone shop window with faded blank posters and an empty display; 5) a half-open steel grille gate with darkness behind; 6) a hair salon front with a spiral barber pole beside a dusty window; 7) a real-estate office glass front plastered with blank paper notices; 8) a karaoke entrance with dark tinted glass and a broken neon tube frame (unlit); 9) an empty boarded shop with plywood over the window and peeling paper. Each panel has a blank dark signboard band across the top (no text). Evenly lit, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background in the gaps. Leave the bottom-right corner empty. No text, no letters, no numbers, no logos, no border. Do not use pink or magenta inside the panels.
```

### 15-2. 위층 외벽 9종 · `tex_facade3.png`
📎 콘셉트 아트
```
Match the art style of the attached concept image. Create ONE image with a 3 by 3 grid of 9 separate flat building wall texture panels for the UPPER floors of ruined buildings in post-apocalyptic Seoul, each panel a TALL RECTANGLE (width to height about 3:5), seen perfectly FRONT-ON (orthographic, no perspective), placed in its own equal cell with thin magenta gaps between them. Each panel shows exactly ONE storey and ONE window bay, filling the whole panel edge to edge, with left and right edges that continue seamlessly. In order, left to right, top to bottom: 1) a 1980s Korean building wall of small beige ceramic tiles with a single aluminum window, some tiles fallen off; 2) a red-brick villa wall with a silver sliding-sash veranda window and a rusty railing; 3) an apartment corridor side: open outdoor walkway with a concrete parapet and a door-less dark opening behind; 4) a commercial building wall with an empty rectangular signboard frame (blank) above a dirty window; 5) an old motel wall in faded pink-beige plaster with a small frosted window and an air conditioner unit; 6) a grey military concrete wall with a narrow slit window, stenciled stripes and rust streaks; 7) a polished grey stone office wall with a dark tinted window, cracked; 8) a wall covered by construction scaffolding pipes and torn green safety netting; 9) a concrete wall overgrown with ivy vines around a broken window. Evenly lit, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background in the gaps. Leave the bottom-right corner empty. No text, no letters, no numbers, no logos, no border. Do not use pink or magenta inside the panels.
```

### 15-3. 상가 앞모습 1 (6종) · `tex_shopfront1.png`
📎 콘셉트 아트 · 순서: 편의점 · 약국 · 은행 · 카페 · 병원 · 마트
```
Match the art style of the attached concept image. Create ONE image with a 3 by 2 grid of 6 separate flat shop-front texture panels for abandoned Korean shops, each panel a TALL RECTANGLE (width to height about 3:5), seen perfectly FRONT-ON (orthographic, no perspective), placed in its own equal cell with thin magenta gaps. Each panel shows ONE storey of a shop front WITHOUT a door: a display window bay with a blank signboard band on top (no text), filling the panel edge to edge, left and right edges continuing seamlessly. In order, left to right, top to bottom: 1) a convenience store window with toppled snack shelves and a blank colored stripe band; 2) a pharmacy window with a green cross shape (no letters) and empty medicine shelves; 3) a bank front of heavy tinted glass and a closed steel security shutter half down; 4) a cafe window with wooden frame, hanging lamps (off) and chairs stacked inside; 5) a clinic front with frosted white glass and a red cross shape (no letters); 6) a supermarket window with shopping carts piled inside and torn sale posters (blank). Evenly lit, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background in the gaps. Leave the bottom-right corner empty. No text, no letters, no numbers, no logos, no border. Do not use pink or magenta inside the panels.
```

### 15-4. 상가 앞모습 2 (6종) · `tex_shopfront2.png`
📎 콘셉트 아트 · 순서: PC방 · 파출소 · 분식집 · 전자상가 · 서점 · 세탁소
```
Match the art style of the attached concept image. Create ONE image with a 3 by 2 grid of 6 separate flat shop-front texture panels for abandoned Korean shops, each panel a TALL RECTANGLE (width to height about 3:5), seen perfectly FRONT-ON (orthographic, no perspective), placed in its own equal cell with thin magenta gaps. Each panel shows ONE storey of a shop front WITHOUT a door: a display window bay with a blank signboard band on top (no text), filling the panel edge to edge, left and right edges continuing seamlessly. In order, left to right, top to bottom: 1) a PC-bang front with dark tinted glass and faint monitor glow shapes inside; 2) a police box front in white and navy panels with a barred window and a dead blue lamp; 3) a snack restaurant window with steamed-up glass, a menu board shape (blank) and plastic stools; 4) an electronics shop window with stacked old TVs and phone boxes behind cracked glass; 5) a bookstore window with dusty books stacked and fallen; 6) a laundromat window showing a row of front-loading washing machines. Evenly lit, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background in the gaps. Leave the bottom-right corner empty. No text, no letters, no numbers, no logos, no border. Do not use pink or magenta inside the panels.
```

> 결과를 `art_raw/new/`에 위 파일 이름으로 올리면 가공해 연결합니다. 예전 외벽(13번)도 세로로 긴 비율로 다시 만들면 덜 눌려 보입니다 — 원하면 같은 이름으로 다시 올리세요.

---

## 16. 바닥 · 터렛 · 남은 것 (v1.31.2) · 한 장에 여러 개 (격자)
v1.31.2부터 **바닥(도로·인도·풀밭·흙·물·광장)** 과 **엔지니어 터렛 3종** 은 그림을 올리면 바로 붙습니다 (없으면 지금처럼 코드 그림).
- 바닥 그림 한 장은 게임에서 **4×4칸에 나눠 펼침** → 칸마다 다른 부분이 보여 반복이 덜함. 그래서 **위에서 똑바로 내려다본 정사각형**, 네 변이 이어져야 함

| 장 | 격자 | 파일 이름 |
|---|---|---|
| 16-1 | 3×2 | `tex_street.png` |
| 16-2 | 3×1 | `props_turret.png` |
| 16-3 | 1장 | `props_lamp.png` (가로등 다시) |
| 16-4 | 1장 | `tex_vines.png` (15-2에서 빠진 담쟁이 벽) |

### 16-1. 바닥 질감 6종 · `tex_street.png`
📎 콘셉트 아트 · 순서: 아스팔트 · 인도 블록 · 풀밭 · 흙·잔해 · 물 · 광장 포장
```
Match the art style of the attached concept image. Create ONE image with a 3 by 2 grid of 6 separate SQUARE ground texture panels for a ruined post-apocalyptic Seoul, each seen from DIRECTLY ABOVE (top-down, orthographic, no perspective, no shadows of objects), placed in its own equal cell with thin magenta gaps. Each panel fills its cell edge to edge and tiles SEAMLESSLY on all four sides. In order, left to right, top to bottom: 1) cracked dark asphalt road with faded patches, oil stains and small potholes (no lane markings); 2) grey Korean sidewalk paving blocks, some missing or tilted, weeds in the cracks; 3) overgrown dark green grass with dry patches and small weeds; 4) packed brown dirt with scattered concrete crumbs, gravel and bits of brick; 5) murky dark green-grey water surface with faint ripples and floating debris specks; 6) a plaza of large square stone pavers, cracked, with dust in the joints. Evenly lit, low contrast so characters stand out on top. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background in the gaps. No text, no letters, no numbers, no logos, no border. Do not use pink or magenta inside the panels.
```

### 16-2. 엔지니어 터렛 3종 · `props_turret.png`
📎 콘셉트 아트 · 순서: 기관총 터렛 · 화염 터렛 · 박격포 터렛
```
Match the art style of the attached concept image. Create ONE image with a 3 by 1 grid of 3 separate small deployable military turrets for a post-apocalyptic survivor engineer, each in its own equal cell, seen from a high three-quarter isometric angle (same angle as the concept image), each sitting on a compact tripod or base plate, gun barrel pointing to the RIGHT. In order: 1) a light machine-gun turret with an ammo box and a small armored shield, scrap-built; 2) a flamethrower turret with a fuel tank and a short wide nozzle, scorch marks; 3) a squat mortar turret with a short thick tube angled up and to the right, shell crates beside it. No muzzle fire, no smoke, no people. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. No text, no letters, no numbers, no logos, no border. Do not use pink or magenta on the objects.
```

### 16-3. 가로등 다시 · `props_lamp.png`
📎 콘셉트 아트 — 12-1에서 받은 가로등에 **신호등이 붙어 있어** 보류 중
```
Match the art style of the attached concept image. ONE single Korean street lamp post for a ruined city: a tall grey metal pole with a single curved arm and one lamp head at the top (unlit), a little rust and a torn paper notice taped on the pole, seen from a high three-quarter isometric angle, lamp arm pointing to the RIGHT. ONLY the street lamp — NO traffic light, NO signs, NO wires, NO other objects. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. No text, no letters, no numbers, no logos, no border.
```

### 16-4. 담쟁이 벽 · `tex_vines.png`
📎 콘셉트 아트
```
Match the art style of the attached concept image. ONE flat building wall texture panel, a TALL RECTANGLE (width to height about 3:5), seen perfectly FRONT-ON (orthographic, no perspective): one storey of a grey concrete wall overgrown with dark green ivy vines around a single broken window, filling the image edge to edge, left and right edges continuing seamlessly. Evenly lit. Detailed dark pixel art, desaturated colors with warm orange highlights. No text, no letters, no numbers, no logos, no border.
```

> 15번 4장은 v1.31.2에 연결됨. Gemini가 이번에도 **정사각형에 가깝게** 그려서 외벽이 조금 옆으로 눌려 보입니다 — 신경 쓰이면 「**세로 그림 한 장씩**」(16-4처럼 3:5 한 장) 으로 다시 받는 게 확실합니다.

---

## 결과가 이상할 때

| 증상 | 해결 |
|---|---|
| 행이 섞임 (걷기 줄 끝에 피격 프레임 등) | 괜찮습니다. 🔢 동작 순서 칸에 **실제로 그려진 개수**를 입력 |
| 무기·헬멧이 격자에 안 맞게 흩어짐 | 다시 생성. 도구가 "빈 칸"을 알려 줌 |
| 프레임마다 다른 사람처럼 그려짐 | 다시 생성 (방어구는 1번 그림을 첨부했는지 확인) |
| 캐릭터 일부가 배경과 같이 지워짐 | 그 색이 배경과 비슷한 것. 마젠타 ↔ 초록 배경을 바꿔 다시 생성 |
| 체크무늬(가짜 투명) 배경 | 다시 생성 ("transparent"라는 단어는 넣지 않기) |
| 플레이어가 무기를 들거나 헬멧을 씀 | 다시 생성 (게임이 따로 붙이므로 빈손·맨머리여야 함) |
| 다른 그림과 그림체가 다름 | 콘셉트 아트와 1번 플레이어 그림을 **둘 다** 첨부해 다시 생성 |
| 캐릭터가 너무 작거나 큼 | 상관없음. 화면 키는 `js/assets.js`의 `height`로 맞춤 |
| 오른쪽 아래 Gemini ✦ 표시 | 도구가 자동으로 지움 |
