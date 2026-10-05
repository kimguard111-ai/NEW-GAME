// 소품 시트: 배경(분홍·보라 계열) 투명화 → 물체 덩어리(가까운 조각은 합침) 찾기 → 투명 PNG + 덩어리 상자 목록 + 번호 붙인 확인용 그림
// node blobs.js in.png outDir name [merge=8] [minArea=600]
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright'); const fs = require('fs');
const [inp, outDir, name, merge = '8', minA = '600'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage();
  const data = 'data:image/png;base64,' + fs.readFileSync(inp).toString('base64');
  const res = await pg.evaluate(async ([data, M, minA]) => {
    const im = new Image(); im.src = data; await im.decode();
    const W = im.width, H = im.height, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, W, H), a = d.data, fg = new Uint8Array(W * H);
    for (let i = 0, p = 0; i < a.length; i += 4, p++) {
      const r = a[i], gg = a[i + 1], bl = a[i + 2];
      const bg = (r > gg + 38 && bl > gg + 38 && Math.abs(r - bl) < 120) || (r > 230 && gg > 190 && bl > 230);
      if (bg) a[i + 3] = 0; else {
        fg[p] = 1;
        // 가장자리 분홍 번짐 줄이기: 분홍기가 있으면 초록 채널 쪽으로 당김
        const pink = Math.min(r, bl) - gg; if (pink > 12) { a[i] = Math.max(gg, r - pink * 0.6); a[i + 2] = Math.max(gg, bl - pink * 0.6); }
      }
    }
    g.putImageData(d, 0, 0);
    // 덩어리: 축소 격자(M px 칸)에서 연결 → 가까운 조각 합쳐짐
    const gw = Math.ceil(W / M), gh = Math.ceil(H / M), cell = new Int32Array(gw * gh);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fg[y * W + x]) cell[Math.floor(y / M) * gw + Math.floor(x / M)]++;
    const lab = new Int32Array(gw * gh).fill(-1), boxes = [];
    for (let i = 0; i < gw * gh; i++) {
      if (cell[i] < 2 || lab[i] >= 0) continue;
      const st = [i], bx = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: 0 }; lab[i] = boxes.length;
      while (st.length) { const k = st.pop(), cx = k % gw, cy = (k / gw) | 0; bx.n += cell[k];
        bx.x0 = Math.min(bx.x0, cx); bx.x1 = Math.max(bx.x1, cx); bx.y0 = Math.min(bx.y0, cy); bx.y1 = Math.max(bx.y1, cy);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const j = ny * gw + nx; if (cell[j] >= 2 && lab[j] < 0) { lab[j] = boxes.length; st.push(j); } } }
      bx.id = boxes.length; boxes.push(bx);
    }
    // 정확한 픽셀 상자
    const out = [];
    for (const bx of boxes) {
      if (bx.n < minA) continue;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = bx.y0 * M; y < Math.min(H, (bx.y1 + 1) * M); y++) for (let x = bx.x0 * M; x < Math.min(W, (bx.x1 + 1) * M); x++) if (fg[y * W + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      out.push([x0, y0, x1 - x0 + 1, y1 - y0 + 1, bx.n, bx.id]);
    }
    out.sort((p, q) => (Math.round((p[1] + p[3]) / 120) - Math.round((q[1] + q[3]) / 120)) || (p[0] - q[0])); // 바닥선 기준 줄 → 왼쪽부터
    // 아틀라스: 덩어리마다 자기 픽셀만 (겹치는 상자의 이웃 물체가 섞이지 않게) · 한 줄씩 채워 넣기
    const PAD = 4, AW = 1024; let ax = PAD, ay = PAD, rowH = 0; const place = [];
    for (const r of out) { if (ax + r[2] + PAD > AW) { ax = PAD; ay += rowH + PAD; rowH = 0; } place.push([ax, ay]); ax += r[2] + PAD; rowH = Math.max(rowH, r[3]); }
    const at = document.createElement('canvas'); at.width = AW; at.height = ay + rowH + PAD; const ag = at.getContext('2d'), ad = ag.createImageData(at.width, at.height), src = g.getImageData(0, 0, W, H).data;
    out.forEach((r, k) => { const [px, py] = place[k];
      for (let y = 0; y < r[3]; y++) for (let x = 0; x < r[2]; x++) { const sx = r[0] + x, sy = r[1] + y; if (lab[Math.floor(sy / M) * gw + Math.floor(sx / M)] !== r[5]) continue;
        const si = (sy * W + sx) * 4, di = ((py + y) * at.width + px + x) * 4; ad.data[di] = src[si]; ad.data[di + 1] = src[si + 1]; ad.data[di + 2] = src[si + 2]; ad.data[di + 3] = src[si + 3]; } });
    ag.putImageData(ad, 0, 0);
    const atlas = at.toDataURL('image/png'), rects = out.map((r, k) => [place[k][0], place[k][1], r[2], r[3]]);
    const png = c.toDataURL('image/png');
    // 확인용: 상자 + 번호
    g.globalCompositeOperation = 'destination-over'; g.fillStyle = '#2a2d33'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
    g.font = 'bold 22px sans-serif'; out.forEach((r, i) => { g.strokeStyle = '#ffd400'; g.lineWidth = 2; g.strokeRect(r[0], r[1], r[2], r[3]); g.fillStyle = '#ffd400'; g.fillText(String(i), r[0] + 4, r[1] + 22); });
    return { png: atlas, chk: c.toDataURL('image/png'), boxes: out, rects, W, H };
  }, [data, +merge, +minA]);
  fs.writeFileSync(`${outDir}/${name}.png`, Buffer.from(res.png.split(',')[1], 'base64'));
  fs.writeFileSync(`${outDir}/chk_${name}.png`, Buffer.from(res.chk.split(',')[1], 'base64'));
  fs.writeFileSync(`${outDir}/${name}.json`, JSON.stringify(res.rects));
  console.log(name, res.W + 'x' + res.H, res.boxes.length, 'blobs:', res.boxes.map((r, i) => `${i}:[${r.slice(0, 4)}]`).join(' '));
  await b.close();
})();
