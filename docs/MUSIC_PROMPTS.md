# 배경 음악 프롬프트 (v1.71 · Gemini 음악 만들기용)

지금 배경 음악은 전부 코드로 합성한 소리입니다 (`js/music.js` — 패드 + 아르페지오 + 전투 북). 아래 이름대로 음악 파일을 만들어 **`sound_raw/new/`** 에 올리면, 제가 다듬어서(앞뒤 자르기 · 이음매 없이 반복되게 · 음량 맞추기 · mp3) 연결합니다. **올린 곡만 바뀌고 나머지는 합성 음악 그대로**라 하나씩 올려도 됩니다.

> 효과음(총 · 장전 · 발소리 · 괴물 · UI)은 이미 `docs/SOUND_PROMPTS.md` 에 있습니다. 효과음은 음악 AI보다 **무료 효과음 모음**(Sonniss GDC 번들 · Kenney · freesound CC0)이 훨씬 낫습니다 — 그 문서의 0절 참고.

## 0. 만드는 법
- Gemini 앱에서 **음악 만들기**(Lyria)로 아래 영어 프롬프트를 그대로 붙여 넣기. 한 번에 짧게(30초 안팎) 나와도 괜찮습니다 — **반복(루프)되게 이어 붙이는 건 제가** 합니다.
- **같은 프롬프트로 2~3번** 만들어서 제일 나은 것 하나만 올리면 됨. 둘 다 좋으면 `_1 _2` 붙여 올리세요 (번갈아 틀어 반복감 ↓).
- 모든 프롬프트에 이미 들어 있는 규칙: **노래(목소리) 없음** · **끝에 페이드아웃·마무리 없이** 계속 이어지는 느낌 · 일정한 템포.
- 파일: mp3 / wav / m4a 아무거나. 이름은 표 그대로 (`bgm_camp.mp3`).
- 저작권: Gemini로 만든 음악의 상업적 사용 조건은 구글 약관을 따릅니다 (출시 전에 한 번 확인 — 바뀔 수 있음). 결과물엔 구글의 보이지 않는 표식(SynthID)이 들어갑니다.

## 1. 우선순위 (✅ = 들어감 · v1.72 4곡 · v1.76 맵 7곡 · 엔딩 · 탈출)
| 순서 | 파일 이름 | 어디서 | 왜 |
|---|---|---|---|
| 1 ✅ | `bgm_title` | 타이틀 화면 | 첫인상 · 스토어 영상에도 씀 |
| 2 ✅ | `bgm_camp` | 시청역 캠프 (가장 오래 듣는 곡) | 쉬는 곳 = 따뜻하게 |
| 3 ✅ | `bgm_combat` | 모든 맵 공통 전투 층 (적이 쫓아오면 위로 겹침) | 손맛 |
| 4 ✅ | `bgm_boss` | 필드 보스 · 정예 · 타이탄 · 키메라 · 바벨 | 보스 등장감 |
| 5 ✅ | `bgm_myeongdong` ~ `bgm_lab` (7곡) | 맵별 탐색 음악 | 맵마다 분위기 |
| 6 | `sting_extract` · `sting_death` · `sting_levelup` · `bgm_ending` | 짧은 효과 음악 · 엔딩 | 마무리 |

전투 곡은 **탐색 곡 위에 겹쳐 서서히 올라오는** 방식이라, 맵 탐색 곡과 템포가 달라도 됩니다 (제가 박자를 맞춰 겹침).

---

## 2. 프롬프트 (영어 그대로 복사)

### 타이틀 · 캠프
| 파일 이름 | 길이 | 프롬프트 |
|---|---|---|
| `bgm_title` ★ | 60초+ | `Instrumental main theme for a post-apocalyptic survival game set in a ruined Seoul in 2049. Slow and cinematic, 72 BPM, D minor. A lonely haegeum (Korean bowed fiddle) melody over a deep analog synth drone, distant war drums building slowly, low piano notes, wind and faint radio static in the background. Melancholic but determined. No vocals, no lyrics, steady tempo, no fade-out ending.` |
| `bgm_camp` ★ | 60초+ | `Instrumental calm safe-zone music for a post-apocalyptic survival game: a survivors' camp in an abandoned Seoul subway station at night. 68 BPM, C major with gentle minor turns. Soft fingerpicked acoustic guitar, warm Rhodes electric piano, a quiet gayageum (Korean zither) melody now and then, faint crackle of a campfire and an old radio. Warm, hopeful, tired. Loopable, no vocals, no lyrics, no drums, no fade-out ending.` |

### 전투 · 보스
| 파일 이름 | 길이 | 프롬프트 |
|---|---|---|
| `bgm_combat` ★ | 30~60초 | `Instrumental combat loop for a top-down post-apocalyptic action shooter. 128 BPM, A minor. Driving distorted synth bass, tight punchy electronic drums with heavy kick and snare, pulsing arpeggiated synth, short aggressive janggu (Korean hourglass drum) fills, tense string stabs. Intense and urgent but not chaotic, constant energy from start to end. Loopable, no vocals, no lyrics, no intro, no fade-out ending.` |
| `bgm_boss` ★ | 60초+ | `Instrumental boss battle music for a post-apocalyptic action shooter set in ruined Seoul. 140 BPM, E minor. Massive taiko and buk (Korean barrel drum) hits, grinding industrial synth bass, dark brass and low choir-like synth pads without words, a screaming taepyeongso (Korean double-reed horn) lead, glitchy electronic percussion. Huge, threatening, relentless. Loopable, no vocals, no lyrics, no fade-out ending.` |

### 맵별 탐색 (조용하고 긴장된 · 반복)
| 파일 이름 | 맵 | 프롬프트 |
|---|---|---|
| `bgm_myeongdong` | 명동 (1장 · 상가 폐허) | `Instrumental exploration music for a post-apocalyptic game, wandering a ruined shopping district of Seoul overrun by infected. 84 BPM, A minor. Sparse muted piano, low ambient synth pad, a slow distant bass pulse, broken neon hum and faint shop jingles warped and detuned in the background. Eerie, lonely, quietly tense. Loopable, no vocals, no lyrics, no drums, no fade-out ending.` |
| `bgm_jongno` | 종로 (2장 · 약탈자 · 옛 궁궐) | `Instrumental exploration music for a post-apocalyptic game in old downtown Seoul near a ruined palace, controlled by armed raiders. 86 BPM, D minor. A slow geomungo (Korean bass zither) plucked line, low cello drone, sparse muffled hand drum, dusty tape-saturated synth pad. Tense, watchful, a hint of old Korea. Loopable, no vocals, no lyrics, no fade-out ending.` |
| `bgm_yongsan` | 용산 (3장 · 군 기지 · 드론) | `Instrumental exploration music for a post-apocalyptic game inside an abandoned military base patrolled by combat drones. 92 BPM, E phrygian. Cold pulsing analog synth sequence, metallic industrial percussion far away, sonar-like pings, low brass swells, mechanical servo textures. Cold, clinical, dangerous. Loopable, no vocals, no lyrics, no fade-out ending.` |
| `bgm_yeouido` | 여의도 (4장 · 방사능 · 한강) | `Instrumental exploration music for a post-apocalyptic game in a radioactive skyscraper district beside a poisoned river. 80 BPM, F-sharp minor. Slowly shifting toxic-sounding synth drones, Geiger-counter crackle rhythm, distant reversed piano, deep sub bass swells, faint ghostly wind. Heavy, sickly, uneasy. Loopable, no vocals, no lyrics, no drums, no fade-out ending.` |
| `bgm_gangnam` | 강남 (5장 · 블랙선 용병 · 기업) | `Instrumental exploration music for a post-apocalyptic game in a ruined luxury business district held by a private mercenary corporation. 98 BPM, B minor. Glossy but broken synthwave: cold corporate synth chords, ticking hi-hat pulse, distorted K-pop style synth hook played slowly and detuned, deep bass. Stylish, cynical, tense. Loopable, no vocals, no lyrics, no fade-out ending.` |
| `bgm_jamsil` | 잠실 (6장 · 바벨의 탑 · 마지막) | `Instrumental exploration music for the final area of a post-apocalyptic game: a giant mutated tower in a ruined stadium district. 90 BPM, G minor. Ominous low strings, slow heartbeat-like sub drum, alien organic synth textures, distant metallic tower groans, a mournful haegeum melody appearing rarely. Epic, dreadful, final. Loopable, no vocals, no lyrics, no fade-out ending.` |
| `bgm_lab` | 지하 연구소 (키메라) | `Instrumental exploration music for a post-apocalyptic game in an underground bio-research lab full of escaped experiments. 76 BPM, C-sharp minor. Dripping water rhythm, flickering electrical hum, dissonant glassy synth tones, slow creeping low strings, occasional distant metal bang. Claustrophobic, horror, cold. Loopable, no vocals, no lyrics, no drums, no fade-out ending.` |

### 짧은 음악 · 엔딩
| 파일 이름 | 길이 | 프롬프트 |
|---|---|---|
| `sting_extract` | 4~6초 | `Short instrumental victory sting for escaping by helicopter in a post-apocalyptic game: rising synth swell and a bright brass chord with a final drum hit, relief and triumph, 5 seconds, ends cleanly, no vocals.` |
| `sting_death` | 4~6초 | `Short instrumental defeat sting for a post-apocalyptic game: a low distorted piano chord, a sinking synth drone and a dull heartbeat that stops, 5 seconds, ends in silence, no vocals.` |
| `sting_levelup` | 2~3초 | `Very short instrumental level-up jingle for a post-apocalyptic action game: quick ascending synth arpeggio with a soft metallic shimmer, 2 seconds, ends cleanly, no vocals.` |
| `bgm_ending` | 60초+ | `Instrumental ending theme for a post-apocalyptic game set in Seoul: dawn after the final battle, survivors watching the first sunlight over the ruins. 70 BPM, D major with bittersweet minor turns. Solo haegeum melody, warm strings slowly joining, soft piano, gentle low drums at the climax. Hopeful, emotional, quiet strength. No vocals, no lyrics.` |

---

## 3. 결과가 이상할 때
| 증상 | 해결 |
|---|---|
| 노래(가사·허밍)가 들어감 | 다시 생성 — 프롬프트 끝에 `Strictly instrumental, absolutely no human voice` 추가 |
| 곡이 끝나듯 페이드아웃 | 괜찮음 — 제가 중간의 이어지는 부분만 잘라 루프로 만듦 |
| 너무 시끄럽거나 화려함 (탐색 곡) | `very sparse, minimal, quiet, background music` 추가 |
| 한국 악기가 어색하게 튐 | 해당 악기 부분을 빼고 다시 (예: haegeum 문장 삭제) |
| 30초보다 짧음 | 괜찮음 (15초 이상이면 루프 가능) · 같은 프롬프트로 2개 받아 올리면 이어 붙임 |

## 4. 올리면 제가 하는 일
1. `sound_raw/new/`의 파일을 보고 들어서(파형) 반복 이음매 자리 찾기 → 앞뒤 자르기 · 음량 맞추기 → `assets/music/*.mp3`
2. `js/music.js`에 파일 재생 추가: **파일이 있는 곡만** 파일로, 없는 맵은 지금 합성 음악 그대로
3. 전투 층: 탐색 곡 위에 `bgm_combat`을 적이 쫓아오는 정도(강도 0~1)에 맞춰 크게/작게 · 보스가 나오면 `bgm_boss`로 바꿈
4. 설정의 「음악」 음량 · 끄기는 그대로 적용
