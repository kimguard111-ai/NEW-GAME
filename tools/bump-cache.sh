#!/bin/sh
# 새 버전을 올릴 때: index.html 의 js·css 주소 뒤 ?v= 를 바꿔 휴대폰·브라우저가 옛 파일(캐시)을 쓰지 않게 함
# 사용: sh tools/bump-cache.sh 1.48.1
V="$1"; [ -z "$V" ] && { echo "사용: sh tools/bump-cache.sh <버전>"; exit 1; }
sed -i -E "s#(src=\"js/[A-Za-z0-9_-]+\.js)(\?v=[A-Za-z0-9.]+)?\"#\1?v=$V\"#g; s#(href=\"css/[A-Za-z0-9_-]+\.css)(\?v=[A-Za-z0-9.]+)?\"#\1?v=$V\"#g" index.html
grep -c "?v=$V" index.html
sh "$(dirname "$0")/webp.sh" # v1.50.9 그림 webp 도 같이
