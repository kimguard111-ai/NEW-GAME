# Gemini 프롬프트 (복붙용)

## 사용법

1. 아래 번호 순서대로, 회색 상자 안의 글을 **그대로 복사해서** Gemini에 붙여넣습니다.
2. **📎 첨부**라고 적힌 것은 그 이미지를 같이 올립니다. (같은 캐릭터로 그려지게 하는 핵심)
3. 마음에 들면 **💾 파일 이름**대로 저장합니다. 마음에 안 들면 다시 생성. (파일 이름 속 `idle`·`walk`·`hit` 같은 단어로 도구가 동작을 자동 인식합니다)
4. 다 모으면 `tools/sprite-tool.html`에서 **🔧 도구 이름**을 고르고 파일들을 끌어다 놓습니다. (자세한 건 `docs/ART_GUIDE.md`)

> 한 캐릭터씩 끝내고 다음으로 넘어가세요. 전부 다 만들 필요 없이, 만든 것부터 게임에 바로 적용됩니다.

---

# 1. 플레이어 — 기본 몸 (방어구 없음)

### 1-1. 마스터
💾 `player_master.png` (이후 플레이어 작업에 계속 첨부)
```
Character design of a young male survivor in ruined post-apocalyptic Seoul: short dark hair, bare head, worn dark gray hoodie, plain dark pants, dirty sneakers, a small backpack. Empty hands, no weapon: both arms bent and raised forward at chest height as if holding an invisible rifle. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```

### 1-2. 대기
📎 `player_master.png` · 💾 `1_idle.png`
```
Using the attached character as the exact reference (same face, hair, clothes, colors and proportions), create a horizontal sprite strip of exactly 4 frames of an idle breathing animation. Bare head, empty hands raised forward at chest height, no weapon. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 1-3. 걷기
📎 `player_master.png` · 💾 `2_walk.png`
```
Using the attached character as the exact reference (same face, hair, clothes, colors and proportions), create a horizontal sprite strip of exactly 6 frames of a walk cycle. Bare head, empty hands raised forward at chest height, no weapon. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 1-4. 피격
📎 `player_master.png` · 💾 `3_hit.png`
```
Using the attached character as the exact reference (same face, hair, clothes, colors and proportions), create a horizontal sprite strip of exactly 2 frames of getting hit and flinching backward. Bare head, no weapon. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 1-5. 사망
📎 `player_master.png` · 💾 `4_death.png`
```
Using the attached character as the exact reference (same face, hair, clothes, colors and proportions), create a horizontal sprite strip of exactly 5 frames of a death animation: staggering, falling down, and lying on the ground. No weapon. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

🔧 도구 이름: **player** · 위 4장(1-2~1-5)을 한꺼번에 끌어다 놓기

---

# 2. 플레이어 — 방어구를 입은 몸 (4벌)

각 방어구마다: **마스터 1장**을 만든 뒤, 그 마스터를 첨부해서 **1-2 ~ 1-5 프롬프트를 그대로 다시 사용**합니다.
(1-2~1-5는 "첨부한 캐릭터"를 그리는 문장이라 어떤 방어구에도 그대로 쓸 수 있습니다.)

### 2-1. 방탄 조끼
📎 `player_master.png` · 💾 `vest_master.png` → 이걸 첨부해 1-2~1-5 → 🔧 **player_vest**
```
Same person as the attached character (same face, same hair, same body, bare head), now wearing a worn olive bulletproof vest over the dark gray hoodie. Empty hands raised forward at chest height, no weapon. Full body, standing, facing right. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no border.
```

### 2-2. 전술 조끼
📎 `player_master.png` · 💾 `tactical_master.png` → 이걸 첨부해 1-2~1-5 → 🔧 **player_tactical**
```
Same person as the attached character (same face, same hair, same body, bare head), now wearing a tan tactical plate carrier vest with many pouches, cargo pants and knee pads. Empty hands raised forward at chest height, no weapon. Full body, standing, facing right. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no border.
```

### 2-3. 군용 강화복
📎 `player_master.png` · 💾 `military_master.png` → 이걸 첨부해 1-2~1-5 → 🔧 **player_military**
```
Same person as the attached character (same face, same hair, same body, bare head), now wearing dark blue-gray military combat armor with shoulder pads, armored gloves and combat boots. Empty hands raised forward at chest height, no weapon. Full body, standing, facing right. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no border.
```

### 2-4. 외골격 슈트
📎 `player_master.png` · 💾 `exo_master.png` → 이걸 첨부해 1-2~1-5 → 🔧 **player_exo**
```
Same person as the attached character (same face, same hair, bare head), now wearing a bulky metallic powered exoskeleton suit with hydraulic joints on the arms and legs. Empty hands raised forward at chest height, no weapon. Full body, standing, facing right. Isometric 3/4 top-down view, detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no border.
```

---

# 3. 헬멧 (4장)

첨부 없음 · 각각 저장 후 🔧 도구에서 같은 이름 선택

### 3-1. 방탄모 — 💾 `h_cap.png` · 🔧 **h_cap**
```
A single olive military ballistic helmet only, no head, no person. Isometric 3/4 view, facing right as if worn by a character looking right. Chunky readable shape, detailed dark pixel art. Solid flat #FF00FF magenta background. No text, no shadow, no border.
```

### 3-2. 전술 헬멧 — 💾 `h_tacHelmet.png` · 🔧 **h_tacHelmet**
```
A single black tactical helmet with side rails and a small mounted flashlight, no head, no person. Isometric 3/4 view, facing right as if worn by a character looking right. Chunky readable shape, detailed dark pixel art. Solid flat #FF00FF magenta background. No text, no shadow, no border.
```

### 3-3. 방독면 헬멧 — 💾 `h_gasmask.png` · 🔧 **h_gasmask**
```
A single full-face gas mask helmet with two round green-glowing lenses and a filter canister, no head, no person. Isometric 3/4 view, facing right as if worn by a character looking right. Chunky readable shape, detailed dark pixel art. Solid flat #FF00FF magenta background. No text, no shadow, no border.
```

### 3-4. 외골격 헬멧 — 💾 `h_exoHelm.png` · 🔧 **h_exoHelm**
```
A single sleek metallic exoskeleton helmet with a glowing blue visor slit, no head, no person. Isometric 3/4 view, facing right as if worn by a character looking right. Chunky readable shape, detailed dark pixel art. Solid flat #FF00FF magenta background. No text, no shadow, no border.
```

---

# 4. 무기 (9장)

첨부 없음 · 총구·칼끝이 **오른쪽** · 나중에 인벤토리 아이콘으로도 사용

### 4-1. 쇠파이프 — 💾 `w_pipe.png` · 🔧 **w_pipe**
```
A single rusty steel pipe used as a club, with tape wrapped around the handle. Pure side view, horizontal, handle on the left and tip pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-2. 권총 — 💾 `w_pistol.png` · 🔧 **w_pistol**
```
A single M1911 pistol. Pure side view, horizontal, grip on the left and muzzle pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-3. 소방 도끼 — 💾 `w_axe.png` · 🔧 **w_axe**
```
A single red fire axe with a long wooden handle. Pure side view, horizontal, handle on the left and axe head on the right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-4. 기관단총 — 💾 `w_smg.png` · 🔧 **w_smg**
```
A single MP5 submachine gun. Pure side view, horizontal, stock on the left and muzzle pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-5. 산탄총 — 💾 `w_shotgun.png` · 🔧 **w_shotgun**
```
A single pump-action shotgun with a wooden stock. Pure side view, horizontal, stock on the left and muzzle pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-6. 돌격소총 — 💾 `w_rifle.png` · 🔧 **w_rifle**
```
A single Korean K2 assault rifle with a folding stock. Pure side view, horizontal, stock on the left and muzzle pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-7. 고주파 블레이드 — 💾 `w_katana.png` · 🔧 **w_katana**
```
A single high-frequency sci-fi sword with a faint blue glowing edge and a dark grip. Pure side view, horizontal, grip on the left and blade tip pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-8. 저격소총 — 💾 `w_sniper.png` · 🔧 **w_sniper**
```
A single bolt-action sniper rifle with a long barrel and a scope. Pure side view, horizontal, stock on the left and muzzle pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

### 4-9. 기관총 — 💾 `w_lmg.png` · 🔧 **w_lmg**
```
A single light machine gun with a bipod and an ammo box. Pure side view, horizontal, stock on the left and muzzle pointing right, filling the image width. Chunky readable shape with light edge highlights, detailed dark pixel art. Solid flat #FF00FF magenta background. No hands, no person, no text, no shadow, no border.
```

---

# 5. 적

적은 무기를 바꾸지 않으므로 무기를 그림에 그려도 됩니다. 캐릭터마다 마스터 1장 + 동작 스트립.

## 5-1. 감염자 → 🔧 **zombie**

**마스터** · 💾 `zombie_master.png`
```
Character design of an infected zombie: pale gray-green rotting skin, bloody wounds, torn shirt and jeans, hunched posture, arms reaching forward. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```
**대기** · 📎 `zombie_master.png` · 💾 `1_idle.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of an idle swaying animation. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**걷기** · 📎 `zombie_master.png` · 💾 `2_walk.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 6 frames of a slow shambling walk cycle. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**공격** · 📎 `zombie_master.png` · 💾 `3_attack.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of a claw attack lunging forward. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**피격** · 📎 `zombie_master.png` · 💾 `4_hit.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 2 frames of getting hit, head snapping back. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**사망** · 📎 `zombie_master.png` · 💾 `5_death.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 5 frames of a death animation: collapsing and lying on the ground. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

## 5-2. 약탈자 → 🔧 **raider**

**마스터** · 💾 `raider_master.png`
```
Character design of a raider scavenger: red bandana mask over the face, scrap metal shoulder armor, dirty brown leather jacket, holding a pistol pointed forward. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```
**대기** · 📎 `raider_master.png` · 💾 `1_idle.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of an idle animation holding the pistol. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**걷기** · 📎 `raider_master.png` · 💾 `2_walk.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 6 frames of a walk cycle holding the pistol. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**공격** · 📎 `raider_master.png` · 💾 `3_attack.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of firing the pistol with recoil, no muzzle flash. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**피격** · 📎 `raider_master.png` · 💾 `4_hit.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 2 frames of getting hit and flinching backward. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**사망** · 📎 `raider_master.png` · 💾 `5_death.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 5 frames of a death animation: falling down and lying on the ground. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

## 5-3. 변이견 → 🔧 **dog**

**마스터** · 💾 `dog_master.png`
```
Character design of a mutated feral dog: hairless gray-brown hide, exposed muscles and ribs, glowing yellow eyes, oversized jaws with teeth. Four-legged, side view, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the creature.
```
**대기** · 📎 `dog_master.png` · 💾 `1_idle.png`
```
Using the attached creature as the exact reference, create a horizontal sprite strip of exactly 4 frames of an idle growling animation. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**달리기** · 📎 `dog_master.png` · 💾 `2_walk.png`
```
Using the attached creature as the exact reference, create a horizontal sprite strip of exactly 6 frames of a running cycle. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**공격** · 📎 `dog_master.png` · 💾 `3_attack.png`
```
Using the attached creature as the exact reference, create a horizontal sprite strip of exactly 4 frames of a biting attack lunging forward. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**피격** · 📎 `dog_master.png` · 💾 `4_hit.png`
```
Using the attached creature as the exact reference, create a horizontal sprite strip of exactly 2 frames of getting hit and recoiling. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**사망** · 📎 `dog_master.png` · 💾 `5_death.png`
```
Using the attached creature as the exact reference, create a horizontal sprite strip of exactly 5 frames of a death animation: falling on its side. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

## 5-4. 변이 거한 → 🔧 **brute**

**마스터** · 💾 `brute_master.png`
```
Character design of a huge hulking mutant brute, twice the size of a human: gray-brown cracked skin, bony growths on the shoulders and back, massive arms with clawed hands, small head, torn pants. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink, purple or magenta on the character.
```
**대기** · 📎 `brute_master.png` · 💾 `1_idle.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of an idle heavy breathing animation. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**걷기** · 📎 `brute_master.png` · 💾 `2_walk.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 6 frames of a heavy stomping walk cycle. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**공격** · 📎 `brute_master.png` · 💾 `3_attack.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of a ground smash attack with both fists. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**피격** · 📎 `brute_master.png` · 💾 `4_hit.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 2 frames of getting hit and staggering. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**사망** · 📎 `brute_master.png` · 💾 `5_death.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 5 frames of a death animation: falling forward and lying on the ground. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

## 5-5. 경비 드론 → 🔧 **drone** (걷기 없음)

**마스터** · 💾 `drone_master.png`
```
Design of a military security quadcopter drone: dark gray armored body, four rotors, a single red sensor eye, a small machine gun mounted underneath. Hovering in the air, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the drone.
```
**비행** · 📎 `drone_master.png` · 💾 `1_idle.png`
```
Using the attached drone as the exact reference, create a horizontal sprite strip of exactly 4 frames of hovering with spinning rotors. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**공격** · 📎 `drone_master.png` · 💾 `2_attack.png`
```
Using the attached drone as the exact reference, create a horizontal sprite strip of exactly 4 frames of firing its machine gun, no muzzle flash. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**피격** · 📎 `drone_master.png` · 💾 `3_hit.png`
```
Using the attached drone as the exact reference, create a horizontal sprite strip of exactly 2 frames of getting hit, sparking and tilting. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**추락** · 📎 `drone_master.png` · 💾 `4_death.png`
```
Using the attached drone as the exact reference, create a horizontal sprite strip of exactly 5 frames of a destruction animation: smoking and crashing down to the ground. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

## 5-6. 방사능 군주 타이탄 (보스) → 🔧 **boss**

**마스터** · 💾 `boss_master.png`
```
Character design of a giant radioactive mutant boss, three times human size: dark green scarred skin, glowing bright green radioactive veins and cracks, armored bony plates, huge claws, glowing yellow eyes. Full body, standing menacingly, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```
**대기** · 📎 `boss_master.png` · 💾 `1_idle.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of a menacing idle animation with glowing veins pulsing. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**걷기** · 📎 `boss_master.png` · 💾 `2_walk.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 6 frames of a heavy walk cycle. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**공격** · 📎 `boss_master.png` · 💾 `3_attack.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of a massive claw swipe attack. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**피격** · 📎 `boss_master.png` · 💾 `4_hit.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 2 frames of getting hit and roaring in pain. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```
**사망** · 📎 `boss_master.png` · 💾 `5_death.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 5 frames of a death animation: collapsing to its knees and falling to the ground. All frames in one row with wide empty gaps between them, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

---

# 6. NPC (마스터 1장 + 대기 1장씩)

대기 프롬프트는 4명 모두 같습니다. 각 NPC의 마스터를 첨부해서 사용하세요.

**대기 (공통)** · 📎 각 NPC 마스터 · 💾 `1_idle.png`
```
Using the attached character as the exact reference, create a horizontal sprite strip of exactly 4 frames of an idle breathing animation. All frames in one row with wide empty gaps between them, feet on the same line, same size in every frame, facing right. Isometric 3/4 top-down view, detailed dark pixel art. Solid flat #FF00FF magenta background. No shadow, no ground, no text, no numbers, no grid lines, no border.
```

### 6-1. 암시장 상인 · 💾 `merchant_master.png` · 🔧 **merchant**
```
Character design of a black market trader in ruined Seoul: long dark coat full of pockets, bags and goods hanging from the shoulders, flat cap, cunning smile. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```

### 6-2. 생존자 대장 · 💾 `captain_master.png` · 🔧 **captain**
```
Character design of a veteran survivor leader: gray beard, military cap, worn officer jacket, rifle slung on the back, arms crossed. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```

### 6-3. 의무병 · 💾 `medic_master.png` · 🔧 **medic**
```
Character design of a field medic: white coat with a red cross armband, medical bag on the side, short hair, surgical mask around the neck. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```

### 6-4. 정비공 · 💾 `mechanic_master.png` · 🔧 **mechanic**
```
Character design of a mechanic: grease-stained overalls, welding goggles on the forehead, tool belt, holding a large wrench. Full body, standing, facing right. Isometric 3/4 top-down view, camera about 35 degrees above. Detailed dark pixel art, desaturated colors with warm orange highlights. Solid flat #FF00FF magenta background filling the whole image. No shadow, no ground, no text, no border. Do not use pink or magenta on the character.
```

---

# 7. 랜드마크 (4장)

첨부 없음 · 🔧 도구에서 같은 이름을 고르면 자동으로 건물 모드

### 7-1. 무너진 명동성당 — 💾 `cathedral.png` · 🔧 **cathedral** · 정사각형 이미지
```
A single ruined red-brick gothic cathedral (Myeongdong Cathedral in Seoul) with a tall pointed bell tower and a cross, part of the roof collapsed, broken stained glass windows, rubble at the base. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background.
```

### 7-2. 보신각 — 💾 `bosingak.png` · 🔧 **bosingak** · 정사각형 이미지
```
A single traditional Korean bell pavilion (Bosingak in Seoul) on a stone platform: red wooden pillars, a curved dark gray tiled roof with upturned eaves, a large bronze bell hanging inside, weathered and dusty. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background.
```

### 7-3. 버려진 용산 기지 — 💾 `base.png` · 🔧 **base** · 정사각형 이미지
```
A single abandoned military base compound: a concrete bunker, sandbag walls, a rusty abandoned tank, a small watchtower with a searchlight, barbed wire, military crates. The compound stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the compound: no street, no ground outside it, no people, no shadow, no text. Solid flat #FF00FF magenta background.
```

### 7-4. 63빌딩 잔해 — 💾 `tower63.png` · 🔧 **tower63** · **세로로 긴 이미지 (9:16)**
```
A single ruined golden glass skyscraper (the 63 Building in Seoul): tall tower with golden reflective glass, the top floors broken and collapsed, some windows glowing, green radioactive haze at the base. The building stands on a square diamond-shaped footprint, viewed from the south corner, so the bottom tip of the footprint touches the bottom center of the image. Isometric 3/4 top-down view, detailed dark pixel art, gritty post-apocalyptic, desaturated colors with warm orange highlights. Only the building: no street, no ground, no people, no shadow, no text. Solid flat #FF00FF magenta background. Tall vertical image.
```

---

# 8. 아이콘 (미리 만들어 두기 — 게임 적용은 나중)

무기 아이콘은 4번 무기 그림을 그대로 씁니다. 헬멧은 3번 그림을 씁니다. 나머지만 만들면 됩니다.

### 8-1. 방탄 조끼 — 💾 `icon_vest.png`
```
A single game item icon of a worn olive bulletproof vest, centered, slight 3/4 angle, filling about 80% of a square image. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. No text, no border, no shadow, no person.
```
### 8-2. 전술 조끼 — 💾 `icon_tactical.png`
```
A single game item icon of a tan tactical plate carrier vest with pouches, centered, slight 3/4 angle, filling about 80% of a square image. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. No text, no border, no shadow, no person.
```
### 8-3. 군용 강화복 — 💾 `icon_military.png`
```
A single game item icon of dark blue-gray military combat armor, centered, slight 3/4 angle, filling about 80% of a square image. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. No text, no border, no shadow, no person.
```
### 8-4. 외골격 슈트 — 💾 `icon_exo.png`
```
A single game item icon of a metallic powered exoskeleton suit, centered, slight 3/4 angle, filling about 80% of a square image. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. No text, no border, no shadow, no person.
```
### 8-5. 구급상자 — 💾 `icon_medkit.png`
```
A single game item icon of a first aid kit with a red cross, centered, slight 3/4 angle, filling about 80% of a square image. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. No text, no border, no shadow, no person.
```
### 8-6. 탄약 상자 — 💾 `icon_ammo.png`
```
A single game item icon of a military ammunition box, centered, slight 3/4 angle, filling about 80% of a square image. Detailed dark pixel art, gritty post-apocalyptic style. Solid flat #FF00FF magenta background. No text, no border, no shadow, no person.
```

---

## 결과가 이상할 때

| 증상 | 해결 |
|---|---|
| 프레임마다 다른 사람처럼 그려짐 | 마스터 이미지를 첨부했는지 확인 후 다시 생성 |
| 프레임끼리 붙어 있음 | 다시 생성 (프롬프트에 이미 "wide empty gaps"가 있음) |
| 캐릭터에 분홍·자주색이 있음 | 프롬프트의 `#FF00FF magenta`를 `#00FF00 green`으로 바꿔 다시 생성 |
| 체크무늬(가짜 투명) 배경이 나옴 | 다시 생성. "transparent"라는 단어는 절대 넣지 않기 |
| 플레이어가 무기·헬멧을 들고/쓰고 나옴 | 다시 생성 (게임이 따로 붙이므로 빈손·맨머리여야 함) |
