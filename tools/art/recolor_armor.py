# v2.0 갑옷 단계: 군용 강화복 몸 그림에서 「목 아래 갑옷」만 골라 색을 바꿈 (새 몸 그림 없이 단계 외관 만들기)
# 갑옷 위장 무늬가 머리카락과 같은 갈색 계열이라 색만으로는 못 가름 → 프레임마다 머리 꼭대기를 찾아 그 아래만 · 피부색(손) · 회색(총) 은 빼고
# 사용: python3 tools/art/recolor_armor.py <입력.png> <출력.png> <hazmat|bsuit|eod> <칸 가로> <칸 세로>
import sys, colorsys
from PIL import Image
STYLE = {  # 색상°, 채도, 밝기 배율, 대비, 밝은 부분 강조색
  'hazmat': (48, 0.55, 1.45, 1.1, None),             # 방호 강화복: 탁한 화학 방호 노랑 코팅
  'bsuit':  (220, 0.08, 0.75, 1.25, (226, 178, 38)),  # 블랙선 전투복: 흑연색 + 가장 밝은 모서리만 노란 줄
  'eod':    (200, 0.14, 1.2, 1.15, None),             # 처리반 강화복: 무거운 강철 회색 (푸른기 살짝)
}
def hls(p): return colorsys.rgb_to_hls(p[0] / 255, p[1] / 255, p[2] / 255)
def skin(h, l, s): return 8 <= h * 360 <= 40 and s >= 0.38 and l >= 0.42
def gun(h, l, s): return s < 0.07 or 180 <= h * 360 <= 300
def run(src, dst, kind, cw, ch):
    hue, sat, lk, ct, acc = STYLE[kind]
    im = Image.open(src).convert('RGBA'); px = im.load(); W, H = im.size
    for fy in range(0, H, ch):
        for fx in range(0, W, cw):
            pts = [(x, y) for y in range(fy, min(H, fy + ch)) for x in range(fx, min(W, fx + cw)) if px[x, y][3] > 100]
            if not pts: continue
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
            lying = (x1 - x0) > (y1 - y0) * 1.3
            if lying:  # 쓰러진 프레임: 피부가 많은 쪽 끝이 머리
                third = (x1 - x0) / 3
                sl = sum(1 for x, y in pts if x < x0 + third and skin(*hls(px[x, y]))); sr = sum(1 for x, y in pts if x > x1 - third and skin(*hls(px[x, y])))
                head = (lambda x, y: x < x0 + 24) if sl >= sr else (lambda x, y: x > x1 - 24)
            else:
                neck = y0 + max(18, int((y1 - y0) * 0.25)); head = lambda x, y: y < neck
            for x, y in pts:
                if head(x, y): continue
                r, g, b, a = px[x, y]; h, l, s = hls((r, g, b))
                if skin(h, l, s) or gun(h, l, s): continue
                nl = max(0.03, min(0.9, ((l - 0.25) * ct + 0.25) * lk))
                if acc and l > 0.47: px[x, y] = (*acc, a); continue
                nr, ng, nb = colorsys.hls_to_rgb(hue / 360, nl, min(1, sat * (0.7 + s)))
                px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    im.save(dst)
if __name__ == '__main__': run(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]))
