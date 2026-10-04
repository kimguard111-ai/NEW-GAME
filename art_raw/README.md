# art_raw — Gemini 원본 그림 올리는 곳

Gemini에서 받은 **원본 그림을 가공하지 말고 그대로** 이 폴더에 올리면 됩니다.
Claude가 가져가서 배경 제거·프레임 자르기·발 정렬 → `assets/`에 저장 → `js/assets.js` 등록 → 게임 화면 확인까지 합니다.

## 올리는 법 (GitHub 웹, 폰도 가능)
1. 저장소 페이지에서 브랜치를 **`claude/rpg-game-development-2kfay6`** 로 바꾸기 (왼쪽 위 브랜치 버튼)
2. `art_raw` 폴더 열기 → **Add file → Upload files** → 그림 끌어다 놓기
3. 아래쪽 **Commit changes** 누르기
4. Claude에게 "art_raw에 올렸어" 라고 말하기

## 파일 이름 = 프롬프트 문서의 🔧 이름
| 그림 | 파일 이름 예 |
|---|---|
| 플레이어 기본 몸 | `player.png` |
| 방어구 몸 | `player_vest.png` · `player_tactical.png` · `player_military.png` · `player_exo.png` |
| 무기 9종 한 장 | `weapons_all.png` |
| 헬멧 4종 한 장 | `helmets_all.png` |
| 적·NPC·보스 | `zombie.png` · `merc.png` · `deploy.png` · `chimera.png` … |
| 랜드마크 | `cathedral.png` · `coex.png` … |
| 타이틀 | `title.png` |

- 이름을 잘못 붙여도 괜찮습니다. 말로 "이건 감염자야"라고 알려 주면 됩니다.
- 같은 그림을 다시 만들었으면 같은 이름으로 올리면 덮어씁니다 (최신 것으로 교체).
- 동작 개수(🔢)가 프롬프트와 다르게 그려졌어도 괜찮습니다. 가공할 때 세어서 맞춥니다.
