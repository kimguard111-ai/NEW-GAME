# 그림 가공 스크립트 (v1.31)
`art_raw/new/` 의 Gemini 원본을 게임용으로 바꾸는 명령줄 도구. Playwright 필요 (`npm i playwright`).

| 스크립트 | 용도 |
|---|---|
| `clean.js in.png out.png [pink\|green\|light] [자르기]` | 배경 정리: 칸마다 다른 분홍·보라 배경, 초록 배경, 흰 상자를 순수 마젠타로. `x0-x1:y0-y1` 로 붙은 프레임 사이를 지움 |
| `tool.js 키 "idle 4, walk 6, …" 출력폴더 그림.png` | `sprite-tool.html` 자동 실행 (캐릭터 시트 → 프레임 정렬 PNG + 등록 코드). `WIDE=2.4` 로 옆으로 긴 몸 칸 넓히기 · `NOWM=1` 은 자동 ✦ 지우기 끄기 (회색 옷이 같이 지워질 때 — 미리 손으로 덮을 것) |
| `blobs.js in.png 출력폴더 이름 [합치는거리=8] [최소크기=600]` | 소품·질감 시트: 격자를 안 지킨 그림도 물체마다 덩어리로 찾아 **자기 픽셀만** 아틀라스로 (`이름.png` + 상자 `이름.json` + 번호 확인용 `chk_이름.png`) |

순서: 그림 보기 → (필요하면) `clean.js` → 캐릭터는 `tool.js`, 소품·질감은 `blobs.js` → 확인용 그림으로 번호 ↔ 키 맞추기 → `js/assets.js` 등록 → 게임 화면 확인 → 원본을 `art_raw/done/` 으로


## v1.50.9 WebP
게임은 `assets/*.webp`를 먼저 읽음 (PNG의 약 1/8). 새 그림을 `assets/`에 PNG로 넣은 뒤 `sh tools/webp.sh` (또는 `sh tools/bump-cache.sh <버전>`이 자동으로) 실행.
