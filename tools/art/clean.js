// 원본 정리: 배경(마젠타·분홍·보라 칸 · 초록 · 흰 상자)을 순수 #FF00FF 로 · 선택: 세로 자르기 선 (x:y0-y1,...)
// node clean.js in.png out.png [mode=pink|green] [cuts]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright'); const fs = require('fs');
const [inp, out, mode = 'pink', cuts = ''] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const data = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');
  const url = await pg.evaluate(async ([data, mode, cuts]) => {
    const im = new Image(); im.src = data; await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data; let n = 0;
    for (let i = 0; i < a.length; i += 4) {
      const r = a[i], gg = a[i + 1], bl = a[i + 2];
      const bg = mode === 'green' ? (gg > r + 30 && gg > bl + 30) : ((r > gg + 38 && bl > gg + 38 && Math.abs(r - bl) < 110 && r > 120 && bl > 120) || // v1.61 밝은 분홍만 (마젠타가 번진 검은 총열·양각대까지 지우던 것)
        (mode === 'light' && r > 200 && bl > 200 && r > gg + 6 && bl > gg + 6) || (r > 238 && gg > 238 && bl > 238) || (mode === 'light' && Math.min(r, gg, bl) > 185));
      if (bg) { a[i] = 255; a[i + 1] = 0; a[i + 2] = 255; a[i + 3] = 255; n++; }
    }
    for (const s of cuts.split(',').filter(Boolean)) { const [xx, yy] = s.split(':'), [y0, y1] = yy.split('-').map(Number), [x0, x1] = xx.includes('-') ? xx.split('-').map(Number) : [+xx, +xx + 2]; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * c.width + x) * 4; a[i] = 255; a[i + 1] = 0; a[i + 2] = 255; } }
    if (mode === 'green') for (let i = 0; i < a.length; i += 4) {} // (초록 배경도 마젠타로 바꿨으므로 도구는 그대로)
    g.putImageData(d, 0, 0); return [c.toDataURL('image/png'), n / (a.length / 4)];
  }, [data, mode, cuts]);
  fs.writeFileSync(out, Buffer.from(url[0].split(',')[1], 'base64')); console.log('bg ratio', url[1].toFixed(2)); await b.close();
})();
