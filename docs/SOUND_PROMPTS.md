# AI 효과음 프롬프트 (v1.40)

지금 게임 소리는 전부 코드로 합성한 소리입니다. 아래 이름대로 파일을 만들어 **`sound_raw/new/`** 에 올리면, 제가 다듬어서(앞뒤 무음 자르기 · 음량 맞추기 · mp3 변환) 연결합니다. **올린 소리만 바뀌고 나머지는 합성음 그대로**라 조금씩 올려도 됩니다.

## 0. 만드는 법

**추천 도구**: ElevenLabs Sound Effects (문장 → 효과음, 길이 지정 가능) · Stable Audio · 그 밖의 텍스트→효과음 도구
- 프롬프트는 **영어**가 결과가 좋습니다 (아래 그대로 복사)
- **길이**는 표의 「초」에 맞추기 (도구에서 길이 지정 · 안 되면 길게 받아도 제가 자름)
- 자주 나는 소리(총 · 발소리 · 맞는 소리)는 **같은 프롬프트로 2~4개** 받아서 `_1 _2 _3` 붙이기 → 게임이 번갈아 틀어 반복감이 줄어듦

**공통 규칙** (모든 프롬프트 끝에 이미 들어 있음)
- 소리 **하나만** · 음악 없음 · 말소리 없음 (외침도 단어 없이)
- **울림(리버브) 없이 건조하게** — 바깥 메아리·실내 울림은 게임이 따로 입힘
- 파일: mp3 또는 wav 아무거나 · 이름 예시 `pistol_1.mp3`, `pistol_2.mp3`

**우선순위**: ★ 표시부터 — 총 6종 + 맞는 소리 + 발소리 2종만 바꿔도 체감이 큽니다.

---

## 1. 총 ★
| 파일 이름 | 길이 | 변형 | 프롬프트 |
|---|---|---|---|
| `pistol_1~3` ★ | 0.6초 | 3 | `Single 1911 pistol gunshot, close range, sharp crack with a short punchy low thump, dry recording, no reverb, no echo, no music` |
| `smg_1~3` ★ | 0.35초 | 3 | `Single shot from a compact 9mm submachine gun, tight snappy crack, light body, very short, dry, no reverb, no music` |
| `rifle_1~3` ★ | 0.6초 | 3 | `Single assault rifle gunshot, loud supersonic crack with a deep chest-hitting thump, close mic, dry, no reverb, no music` |
| `lmg_1~3` | 0.5초 | 3 | `Single shot from a heavy belt-fed machine gun, deep powerful boom with a metallic mechanical clank, dry, no reverb, no music` |
| `shotgun_1~2` ★ | 1.0초 | 2 | `Pump-action shotgun blast, huge heavy boom, then a quick pump rack chk-chk, close, dry, no reverb, no music` |
| `sniper_1~2` | 1.3초 | 2 | `Bolt-action sniper rifle shot, massive sharp crack with a heavy low boom, followed by the metallic bolt being cycled, dry, no reverb, no music` |
| `eshot_1~3` | 0.4초 | 3 | `Single rifle gunshot heard from about 30 meters away, thinner and less bassy, slightly muffled, dry, no music` (적 총소리) |
| `empty` | 0.2초 | 1 | `Dry fire click of an empty gun, single small metallic click, no reverb, no music` |

## 2. 장전
| 파일 이름 | 길이 | 프롬프트 |
|---|---|---|
| `reload_pistol` | 1.0초 | `Pistol reload: magazine released and dropping, new magazine inserted, slide racked, crisp metallic foley, dry, no music` |
| `reload_smg` | 1.5초 | `Submachine gun reload: magazine out, magazine in, charging handle pulled, metallic foley, dry, no music` |
| `reload_rifle` | 1.8초 | `Assault rifle reload: magazine out, fresh magazine slapped in, bolt release clack, metallic foley, dry, no music` |
| `reload_shotgun` | 1.8초 | `Shotgun reload: four shells pushed one by one into the tube, then a pump rack, foley, dry, no music` |
| `reload_sniper` | 2.4초 | `Bolt-action rifle reload: bolt pulled back, magazine swapped, bolt pushed forward and locked, metallic foley, dry, no music` |
| `reload_lmg` | 4.0초 | `Light machine gun reload: top cover opened, ammo belt laid in with rattling links, cover slammed shut, charging handle pulled, dry, no music` |

(재장전 시간과 길이가 달라도 게임이 빠르기를 맞춥니다)

## 3. 근접
| 파일 이름 | 길이 | 변형 | 프롬프트 |
|---|---|---|---|
| `swing_pipe_1~2` | 0.4초 | 2 | `Fast whoosh of a heavy steel pipe swung through the air, short, dry, no music` |
| `swing_axe_1~2` | 0.5초 | 2 | `Heavy fire axe swung hard through the air, deep whoosh, dry, no music` |
| `swing_katana_1~2` | 0.4초 | 2 | `Sharp high-pitched sword slash whoosh with a faint ringing blade, dry, no music` |
| `heavy` | 0.5초 | 1 | `Brutal heavy melee impact on a body, deep thud with a crunch, dry, no music` (근접 마무리) |

## 4. 맞는 소리 ★
| 파일 이름 | 길이 | 변형 | 프롬프트 |
|---|---|---|---|
| `impact_1~4` ★ | 0.25초 | 4 | `Bullet hitting flesh, short wet punchy thwack, close, dry, no scream, no music` |
| `impactCrit_1~2` | 0.3초 | 2 | `Powerful bullet impact on a body with a sharp crack and a heavy thud, critical hit, dry, no music` |
| `metal_1~3` | 0.3초 | 3 | `Bullet hitting a metal robot, sharp metallic ping with a short ring, dry, no music` |
| `ricochet_1~2` | 0.4초 | 2 | `Bullet ricochet off concrete, small spark ping whizzing away, dry, no music` |
| `kill_1~3` | 0.6초 | 3 | `A body collapsing to the ground, heavy dull thud with cloth rustle, dry, no voice, no music` |
| `ehit_1~3` | 0.3초 | 3 | `Player getting hit, muffled body impact with a short grunt, no words, dry, no music` |
| `boom_1~2` | 2.0초 | 2 | `Grenade explosion, sharp blast with deep low rumble and debris falling, close, no music` |

## 5. 적
| 파일 이름 | 길이 | 변형 | 프롬프트 |
|---|---|---|---|
| `growl_1~3` | 0.8초 | 3 | `Zombie growl, raspy wet guttural snarl, short, dry, no words, no music` |
| `roar_1~2` | 1.5초 | 2 | `Huge mutant monster roar, deep and terrifying, dry, no music` |
| `shout_1~3` | 0.5초 | 3 | `Short aggressive male shout of alarm, like "hey!", no clear words, dry, no music` (약탈자·용병이 알아챔) |
| `beep_1` | 0.4초 | 1 | `Security drone alert, two quick electronic beeps, dry, no music` |

## 6. 발소리 (한 걸음씩) ★
각 바닥마다 **4개** (`_1~4`) · 길이 0.3초 · 걸음 **한 번**만
| 파일 이름 | 프롬프트 |
|---|---|
| `step_asphalt_1~4` ★ | `Single footstep of a combat boot on asphalt, one step only, dry, no music` |
| `step_concrete_1~4` ★ | `Single footstep of a combat boot on dusty concrete, one step only, dry, no music` |
| `step_gravel_1~4` | `Single footstep on gravel and broken rubble, crunchy, one step only, dry, no music` |
| `step_grass_1~4` | `Single footstep on dry grass, soft rustle, one step only, dry, no music` |
| `step_water_1~4` | `Single footstep splashing in shallow water, one step only, dry, no music` |
| `step_wood_1~4` | `Single footstep on an old wooden floor, hollow thud, one step only, dry, no music` |
| `step_tile_1~4` | `Single footstep on ceramic floor tiles, crisp tap, one step only, dry, no music` |
| `step_metal_1~4` | `Single footstep on a metal grate floor, clanky, one step only, dry, no music` |
| `step_carpet_1~4` | `Single footstep on carpet, very soft muffled, one step only, dry, no music` |

## 7. 플레이어 · 획득
| 파일 이름 | 길이 | 프롬프트 |
|---|---|---|
| `dodge_1~2` | 0.5초 | `Quick slide across a concrete floor, fabric and boots scraping, short, dry, no music` (슬라이딩) |
| `heal` | 1.0초 | `Medical bandage being wrapped quickly and a soft relieved breath, no words, dry, no music` |
| `ammo` | 0.4초 | `Picking up a box of ammunition, rounds rattling, short, dry, no music` |
| `coin` | 0.3초 | `Picking up a few metal coins and scrap tokens, short jingle, dry, no music` |
| `item` | 0.6초 | `Picking up a piece of gear, cloth rustle and a light metallic clink, short, dry, no music` |
| `levelup` | 1.2초 | `Short gritty rising synth stinger for leveling up, dark post-apocalyptic tone, no melody longer than one second` |
| `quest` | 1.2초 | `Short low brass and radio static stinger for mission complete, gritty, post-apocalyptic, no voice` |

## 8. 맵 환경음
| 파일 이름 | 길이 | 프롬프트 |
|---|---|---|
| `amb_wind` | **15초 반복용** | `Seamless loop of cold wind blowing through an empty ruined city, low and steady, no music, no voices, loopable` |
| `amb_gun_1~3` | 2초 | `Distant gunfire far away in a ruined city, a short burst of 2 to 5 shots, muffled, no music` |
| `amb_siren` | 8초 | `Distant air raid siren wailing far away, muffled, no music` |
| `amb_crow_1~2` | 2초 | `A few crow caws in the distance, no music` |
| `amb_moan_1~2` | 2초 | `Distant zombie moan echoing far away, no words, no music` |
| `amb_creak_1~2` | 2초 | `Slow creak of a twisted metal beam in the wind, no music` |
| `amb_dog_1~2` | 2초 | `A stray dog barking far away, three barks, no music` |
| `amb_geiger_1~2` | 3초 | `Geiger counter crackling irregularly, no music` |
| `amb_drip_1~3` | 1초 | `Single water drip in an underground tunnel, no music` |
| `amb_alarm` | 3초 | `Distant facility alarm beeping in an underground lab, muffled, no music` |
| `amb_heli` | 8초 | `Military helicopter passing far away, rotor thumping fading in and out, no music` |
| `amb_glass_1~2` | 1.5초 | `Glass shards falling and tinkling from a broken window, no music` |
| `amb_water` | 4초 | `Gentle water lapping against a concrete lake shore, no music` |
| `amb_insects` | 3초 | `Night insects chirping in overgrown grass, no music` |
| `amb_roar` | 3초 | `Huge creature roaring far away in the distance, muffled, no music` |
| `amb_fire_1~3` | 1초 | `Campfire crackle and pop, close, no music` |
| `amb_radio_1~2` | 2초 | `Old military radio static with garbled unintelligible chatter, no clear words, no music` |

## 9. UI
| 파일 이름 | 길이 | 프롬프트 |
|---|---|---|
| `click` | 0.1초 | `Small dry mechanical switch click, no music` |
| `open` | 0.3초 | `Canvas bag flap opened with a short zipper pull, dry, no music` (창 열기) |
| `close` | 0.3초 | `Canvas bag flap closed, soft thump, dry, no music` |
| `error` | 0.3초 | `Short low negative buzzer from an old military device, dry, no music` |
| `equip` | 0.5초 | `Gear being strapped on, buckle click and fabric, dry, no music` |
| `buy` | 0.5초 | `Old cash register drawer opening with coins, short, dry, no music` |

---

## 올리는 법
1. 위 이름 그대로 저장 (변형은 `_1`, `_2` …) → `sound_raw/new/` 에 올림
2. 제가 다듬어서 `assets/sfx/` 로 옮기고 `js/sfx.js` 의 `SOUND_FILES` 에 등록 → 원본은 `sound_raw/done/` 으로
3. 마음에 안 드는 소리는 같은 이름으로 다시 올리면 바꿔 끼움
