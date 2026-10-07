#!/bin/sh
# v1.50.9 assets/*.png → 같은 이름 .webp (손실 압축 92 · 투명도 그대로) — 게임은 webp 를 먼저 읽음 (전체 42MB → 약 5MB)
# 원본 png 는 그대로 둠 (webp 를 못 읽는 브라우저는 png 로). png 가 webp 보다 새로우면 다시 만듦
# 사용: sh tools/webp.sh   (bump-cache.sh 가 자동으로 부름)
command -v convert >/dev/null || { echo "ImageMagick(convert)이 없어 webp 를 건너뜀"; exit 0; }
n=0
find assets -name "*.png" -not -path "assets/app/*" | while read -r f; do
  w="${f%.png}.webp"
  if [ ! -f "$w" ] || [ "$f" -nt "$w" ]; then convert "$f" -quality 92 -define webp:alpha-quality=100 -define webp:method=6 "$w" ; fi
done
echo "webp 만들기 끝"
