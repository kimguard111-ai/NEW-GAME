# 자동차 그림 다시 뽑기 (가상 디자인) — 유료 출시 전에

지금 `assets/props_vehicle.png` 는 실제 차종(세단 · SUV · 해치백 · 경찰차 · 시내버스)을 닮았음. v1.94.1에서 엠블럼 · 경찰 휘장은 지웠지만 생김새는 그대로.
아래 프롬프트로 다시 뽑아서 같은 배치(1024×514, 6대)로 주면 그대로 바꿔 끼움 (`js/assets.js` 의 rect 만 맞추면 됨).

## 프롬프트 (Gemini · 이미지)
```
Isometric pixel-art sprite sheet, 6 abandoned vehicles for a post-apocalyptic Seoul game, transparent background, same camera angle as classic isometric RPG (2:1), front facing lower-left.
All vehicles must be FICTIONAL designs: no real car model, no brand logo, no emblem, no badge, no manufacturer grille shape, no license plate text, no police insignia.
1) generic 4-door compact sedan, beige, cracked windshield
2) boxy generic SUV, faded green, rust
3) small generic hatchback, red, rust and broken glass
4) generic patrol car, white with dark blue stripes, light bar on roof, plain doors (no emblem, no text)
5) generic city bus, green, one door in front and one in middle, plain front (no logo)
6) burnt-out generic sedan shell
Muted gritty colors, dark outlines, rust and dust details, consistent lighting from upper-left. Layout: 3 cars top row, patrol car + bus + burnt car bottom row, evenly spaced.
```

## 확인할 것
- 그릴 가운데에 타원 · 방패 같은 모양이 있으면 다시 뽑기 (AI가 습관처럼 넣음)
- 경찰차에 「POLICE」 「경찰」 글자나 독수리 · 무궁화 모양이 있으면 다시 뽑기
