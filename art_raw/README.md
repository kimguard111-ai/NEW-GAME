# art_raw — Gemini 원본 그림

```
art_raw/
├─ new/    ← 새 그림은 여기에만 올리기 (받은 원본 그대로)
└─ done/   ← Claude가 가공·등록을 끝낸 원본 보관 (건드리지 않아도 됨)
   ├─ characters/  플레이어 · NPC
   ├─ monsters/    일반 적
   ├─ bosses/      네임드 · 보스
   ├─ landmarks/   랜드마크 건물
   ├─ items/       무기 · 헬멧
   ├─ props/       소품 · 차량 · 실내 (v1.18~)
   ├─ textures/    건물 외벽 · 옥상 · 실내 바닥 (v1.19~)
   └─ ui/          타이틀 등
```

## 흐름
1. 새 그림은 **`art_raw/new/`** 에만 올립니다 — 한 번에 여러 장, 아무 순서나 OK
2. Claude에게 "new에 올렸어" 라고 말하기
3. Claude가 `new/`의 그림을 가공 → `assets/` 저장 → `js/assets.js` 등록 → 게임 화면 확인 → **원본을 `done/` 알맞은 폴더로 옮김**
4. 그래서 `new/`가 비어 있으면 = 전부 처리 끝. 남아 있으면 = 아직 안 한 것 (또는 문제가 있어 보고한 것)

## 올리는 법 (GitHub 웹, 폰도 가능)
1. 저장소에서 브랜치를 **`claude/rpg-game-development-2kfay6`** 로 바꾸기 (왼쪽 위 브랜치 버튼)
2. `art_raw` → `new` 폴더 열기 → **Add file → Upload files** → 그림 끌어다 놓기
3. **Commit changes**

## 파일 이름 = 프롬프트 문서(`docs/GEMINI_PROMPTS.md`)의 파일 이름
| 그림 | 파일 이름 예 |
|---|---|
| 적·NPC·보스 | `zombie.png` · `merc.png` · `deploy.png` · `chimera.png` … |
| 플레이어 몸 | `player.png` · `player_long.png` · `player_heavy.png` … |
| 무기·헬멧 한 장 | `weapons_all.png` · `helmets_all.png` |
| 랜드마크 | `cathedral.png` · `coex.png` … |
| 소품 (12장) | `props_street.png` · `props_vehicle.png` · `props_object.png` · `props_camp.png` · `props_deco.png` · `props_seoul.png` |
| 실내 (14장) | `props_interior1.png` · `props_interior2.png` · `tex_floor.png` |
| 건물 질감 (13장) | `tex_facade.png` · `tex_roof.png` |

- 이름이 틀려도 괜찮습니다 — 그림을 보고 판단하고, 애매하면 물어봅니다.
- 같은 그림을 다시 만들었으면 **같은 이름으로 `new/`에** 올리면 됩니다 (처리 후 `done/`의 예전 것을 교체).
- 원본이 크면(5MB 이상) 저장소가 빨리 무거워집니다. Gemini에서 받은 PNG 그대로면 괜찮고, 일부러 키우지만 않으면 됩니다.
