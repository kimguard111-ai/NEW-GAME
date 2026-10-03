# Gemini 프롬프트 — 아트 종류별 한 번에 복붙

**프롬프트 1개 = 그림 1장 = 가공 1번.** 위에서부터 하나씩 복사해 Gemini에 붙여넣으세요.

## 순서

1. 회색 상자 안의 글을 **통째로 복사 → Gemini에 붙여넣기** (📎 표시가 있으면 그 이미지도 같이 올리기)
2. 나온 그림을 저장
3. `tools/sprite-tool.html`을 열고 **🔧 도구 이름**을 고른 뒤 그림을 끌어다 놓기
   - **🔢 동작 순서**가 적혀 있으면 도구의 "동작 순서 지정" 칸에 그대로 붙여넣기
     (Gemini가 프레임 수를 다르게 그렸으면 그림을 세어 숫자만 고치기. 예: `walk 7`)
4. **PNG 다운로드** → `assets/` 폴더에 저장 → 도구 아래 칸의 코드를 `js/assets.js`에 붙여넣기

| # | 아트 | 프롬프트 수 | 🔧 도구 이름 |
|---|---|---|---|
| 1 | 플레이어 기본 몸 (방어구 없음) | 1 | player |
| 2 | 플레이어 방어구 몸 | 4 (방어구마다 1) | player_vest · player_tactical · player_military · player_exo |
| 3 | 무기 9종 | **1** | 무기 9종 한 장 |
| 4 | 헬멧 4종 | **1** | 헬멧 4종 한 장 |
| 5 | 적 | 6 (적마다 1) | zombie · raider · dog · brute · drone · boss |
| 6 | NPC | 4 (NPC마다 1) | merchant · captain · medic · mechanic |
| 7 | 랜드마크 | 4 (건물마다 1) | cathedral · bosingak · base · tower63 |
| 8 | 아이콘 (나중에 사용) | 1 | — |

---

## 1. 플레이어 기본 몸 (방어구 없음)

🔧 **player** · 🔢 `idle 4, walk 6, hit 2, death 5` · 💾 이 그림은 2번에서 첨부용으로도 씁니다
```
Create ONE sprite sheet image of a young male survivor in ruined post-apocalyptic Seoul: short dark hair, bare head, worn dark gray hoodie, plain dark pants, dirty sneakers, a small backpack. No armor, no vest, no helmet, no weapon. In every standing frame both empty hands are raised forward at chest height as if holding an invisible rifle. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. The same character in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 2. 플레이어 방어구 몸 (4장)

📎 4장 모두 **1번 결과 그림을 첨부**하세요 (같은 사람으로 그려지게). 🔢 동작 순서는 4장 모두 `idle 4, walk 6, hit 2, death 5`

> 방탄 조끼(2-1)는 처음 만들어 주신 그림이 이미 게임에 들어가 있습니다. 새로 만들면 교체됩니다.

### 2-1. 방탄 조끼 · 🔧 **player_vest**
```
Using the attached character as the exact reference (same face, same hair, same body, same backpack, bare head), create ONE sprite sheet image of him now wearing a worn olive bulletproof vest over the dark gray hoodie. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 2-2. 전술 조끼 · 🔧 **player_tactical**
```
Using the attached character as the exact reference (same face, same hair, same body, same backpack, bare head), create ONE sprite sheet image of him now wearing a tan tactical plate carrier vest with many pouches, cargo pants and knee pads. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 2-3. 군용 강화복 · 🔧 **player_military**
```
Using the attached character as the exact reference (same face, same hair, same body, bare head), create ONE sprite sheet image of him now wearing dark blue-gray military combat armor with shoulder pads, armored gloves and combat boots. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 2-4. 외골격 슈트 · 🔧 **player_exo**
```
Using the attached character as the exact reference (same face, same hair, bare head), create ONE sprite sheet image of him now wearing a bulky metallic powered exoskeleton suit with hydraulic joints on the arms and legs. No helmet, no weapon. In every standing frame both empty hands are raised forward at chest height. Rows: row 1: 4 frames of idle breathing; row 2: 6 frames of a walk cycle; row 3: 2 frames of getting hit and flinching backward; row 4: 5 frames of a death animation, falling down and lying on the ground. Same size in every frame, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

---

## 3. 무기 9종 (1장)

🔧 **무기 9종 한 장 (3×3)** · 순서가 중요합니다 (왼쪽 위부터 오른쪽으로, 줄 바꿈)
```
Create ONE image showing exactly 9 separate weapons arranged in a neat 3 by 3 grid with wide empty space between them. Order from left to right, top row first: 1. a rusty steel pipe club with tape on the handle, 2. an M1911 pistol, 3. a red fire axe with a long wooden handle; middle row: 4. an MP5 submachine gun, 5. a pump-action shotgun with a wooden stock, 6. a Korean K2 assault rifle; bottom row: 7. a high-frequency sci-fi sword with a faint blue glowing edge, 8. a bolt-action sniper rifle with a scope, 9. a light machine gun with a bipod and ammo box. Every weapon in pure side view, horizontal, handle or stock on the left and muzzle or blade tip pointing to the RIGHT, centered in its own grid cell. Chunky readable shapes with light edge highlights. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No hands, no people, no text, no numbers, no labels, no grid lines, no shadow, no border.
```

---

## 4. 헬멧 4종 (1장)

🔧 **헬멧 4종 한 장 (1×4)** · 순서: 왼쪽부터 방탄모 → 전술 헬멧 → 방독면 → 외골격
```
Create ONE image showing exactly 4 separate helmets in a single horizontal row with wide empty space between them. Order from left to right: 1. a simple olive military ballistic helmet, 2. a black tactical helmet with side rails and a small mounted flashlight, 3. a full-face gas mask helmet with two round green-glowing lenses and a filter canister, 4. a sleek metallic exoskeleton helmet with a glowing blue visor slit. Helmets only: no heads, no faces, no people. Each helmet in isometric 3/4 view facing right, as if worn by a character looking right, all the same size. Chunky readable shapes. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No text, no numbers, no labels, no shadow, no border.
```

---

## 5. 적 (적마다 1장)

### 5-1. 감염자 · 🔧 **zombie** · 🔢 `idle 4, walk 6, attack 4, hit 2, death 5`
```
Create ONE sprite sheet image of an infected zombie: pale gray-green rotting skin, bloody wounds, torn shirt and jeans, hunched posture, arms reaching forward. Rows: row 1: 4 frames of idle swaying; row 2: 6 frames of a slow shambling walk; row 3: 4 frames of a claw attack lunging forward; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, collapsing and lying on the ground. The same zombie in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 5-2. 약탈자 · 🔧 **raider** · 🔢 `idle 4, walk 6, attack 4, hit 2, death 5`
```
Create ONE sprite sheet image of a raider scavenger: red bandana mask over the face, scrap metal shoulder armor, dirty brown leather jacket, holding a pistol. Rows: row 1: 4 frames of idle holding the pistol; row 2: 6 frames of a walk cycle holding the pistol; row 3: 4 frames of firing the pistol with recoil, no muzzle flash; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling down and lying on the ground. The same raider in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 5-3. 변이견 · 🔧 **dog** · 🔢 `idle 4, walk 6, attack 4, hit 2, death 5`
```
Create ONE sprite sheet image of a mutated feral dog: hairless gray-brown hide, exposed muscles and ribs, glowing yellow eyes, oversized jaws with teeth, four legs, seen from the side. Rows: row 1: 4 frames of idle growling; row 2: 6 frames of a running cycle; row 3: 4 frames of a biting attack lunging forward; row 4: 2 frames of getting hit; row 5: 5 frames of a death animation, falling on its side. The same dog in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the creature.
```

### 5-4. 변이 거한 · 🔧 **brute** · 🔢 `idle 4, walk 6, attack 4, hit 2, death 5`
```
Create ONE sprite sheet image of a huge hulking mutant brute, twice the size of a human: gray-brown cracked skin, bony growths on the shoulders and back, massive arms with clawed hands, small head, torn pants. Rows: row 1: 4 frames of idle heavy breathing; row 2: 6 frames of a heavy stomping walk; row 3: 4 frames of a ground smash attack with both fists; row 4: 2 frames of getting hit and staggering; row 5: 5 frames of a death animation, falling forward and lying on the ground. The same brute in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink, purple or magenta on the character.
```

### 5-5. 경비 드론 · 🔧 **drone** · 🔢 `idle 4, attack 4, hit 2, death 5`
```
Create ONE sprite sheet image of a military security quadcopter drone: dark gray armored body, four rotors, a single red sensor eye, a small machine gun mounted underneath, hovering in the air. Rows: row 1: 4 frames of hovering with spinning rotors; row 2: 4 frames of firing its machine gun, no muzzle flash; row 3: 2 frames of getting hit, sparking and tilting; row 4: 5 frames of smoking and crashing to the ground. The same drone in every frame, same size, all facing right, wide empty gaps between frames. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the drone.
```

### 5-6. 방사능 군주 타이탄 (보스) · 🔧 **boss** · 🔢 `idle 4, walk 6, attack 4, hit 2, death 5`
```
Create ONE sprite sheet image of a giant radioactive mutant boss, three times human size: dark green scarred skin, glowing bright green radioactive veins and cracks, armored bony plates, huge claws, glowing yellow eyes. Rows: row 1: 4 frames of a menacing idle with veins pulsing; row 2: 6 frames of a heavy walk; row 3: 4 frames of a massive claw swipe attack; row 4: 2 frames of getting hit and roaring; row 5: 5 frames of a death animation, collapsing to its knees and falling. The same monster in every frame, same size, all facing right, wide empty gaps between frames, feet of each row on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 6. NPC (NPC마다 1장) · 🔢 4장 모두 `idle 4`

### 6-1. 암시장 상인 · 🔧 **merchant**
```
Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a black market trader in ruined Seoul: long dark coat full of pockets, bags and goods hanging from the shoulders, flat cap, cunning smile. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-2. 생존자 대장 · 🔧 **captain**
```
Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a veteran survivor leader: gray beard, military cap, worn officer jacket, rifle slung on the back, arms crossed. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-3. 의무병 · 🔧 **medic**
```
Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a field medic: white coat with a red cross armband, medical bag on the side, short hair, surgical mask around the neck. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

### 6-4. 정비공 · 🔧 **mechanic**
```
Create ONE horizontal sprite strip of exactly 4 frames of an idle breathing animation of a mechanic: grease-stained overalls, welding goggles on the forehead, tool belt, holding a large wrench. The same character in every frame, same size, facing right, wide empty gaps between frames, feet on the same line. Isometric 3/4 top-down view (camera about 35 degrees above). Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No shadow, no ground, no text, no numbers, no grid lines, no border. Do not use pink or magenta on the character.
```

---

## 7. 랜드마크 (건물마다 1장)

### 7-1. 무너진 명동성당 · 🔧 **cathedral** · 정사각형
```
Create ONE image of a single ruined red-brick gothic cathedral (Myeongdong Cathedral in Seoul) with a tall pointed bell tower and a cross, part of the roof collapsed, broken stained glass windows, rubble at the base. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

### 7-2. 보신각 · 🔧 **bosingak** · 정사각형
```
Create ONE image of a single traditional Korean bell pavilion (Bosingak in Seoul) on a stone platform: red wooden pillars, a curved dark gray tiled roof with upturned eaves, a large bronze bell hanging inside, weathered and dusty. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

### 7-3. 버려진 용산 기지 · 🔧 **base** · 정사각형
```
Create ONE image of a single abandoned military base compound: a concrete bunker, sandbag walls, a rusty abandoned tank, a small watchtower with a searchlight, barbed wire, military crates. The compound stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the compound: no street, no ground outside it, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

### 7-4. 63빌딩 잔해 · 🔧 **tower63** · **세로로 긴 이미지(9:16)**
```
Create ONE tall vertical image of a single ruined golden glass skyscraper (the 63 Building in Seoul): tall tower with golden reflective glass, the top floors broken and collapsed, some windows glowing, green radioactive haze at the base. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty.
```

---

## 8. 아이콘 (1장, 나중에 사용)

아직 게임에 적용되지 않습니다. 무기·헬멧 아이콘은 3·4번 그림을 그대로 쓸 예정이라 방어구·소모품만 미리 만들어 둡니다.
```
Create ONE image showing exactly 6 separate game item icons arranged in a 3 by 2 grid with wide empty space between them. Order from left to right, top row first: 1. a worn olive bulletproof vest, 2. a tan tactical plate carrier vest with pouches, 3. dark blue-gray military combat armor; bottom row: 4. a metallic powered exoskeleton suit, 5. a first aid kit with a red cross, 6. a military ammunition box. Each icon centered in its cell, slight 3/4 angle, all the same size. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. Leave the bottom-right corner empty. No text, no numbers, no labels, no shadow, no border, no people.
```

---

## 결과가 이상할 때

| 증상 | 해결 |
|---|---|
| 행이 섞임 (걷기 줄 끝에 피격 프레임 등) | 괜찮습니다. 🔢 동작 순서 칸에 **실제로 그려진 개수**를 입력 |
| 무기·헬멧이 격자에 안 맞게 흩어짐 | 다시 생성. 도구가 "빈 칸"을 알려 줌 |
| 프레임마다 다른 사람처럼 그려짐 | 다시 생성 (2번은 1번 그림을 첨부했는지 확인) |
| 캐릭터에 분홍·자주색이 있음 | 프롬프트의 `#FF00FF magenta`를 `#00FF00 green`으로 바꿔 다시 생성 |
| 체크무늬(가짜 투명) 배경 | 다시 생성 ("transparent"라는 단어는 넣지 않기) |
| 플레이어가 무기를 들거나 헬멧을 씀 | 다시 생성 (게임이 따로 붙이므로 빈손·맨머리여야 함) |
| 오른쪽 아래 Gemini ✦ 표시 | 도구가 자동으로 지움 |
