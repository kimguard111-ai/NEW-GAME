// 타이틀 배경 (v1.1): 서울 야경 — 불타는 빌딩 숲, 남산타워, 한강, 날리는 불씨, 언덕 위 생존자 실루엣
// js/assets.js 의 ART.title 에 키아트 파일을 등록하면 그 그림을 배경으로 사용
const TitleBG = {
  cv: null, g: null, sky: null, t: 0, embers: [], art: null,
  init() {
    this.cv = document.getElementById('title-bg'); this.g = this.cv.getContext('2d');
    if (ART.title) { const im = new Image(); im.onload = () => { this.art = im; }; loadArt(im, ART.title, () => {}); } // v1.50.9 webp
    for (let i = 0; i < 70; i++) this.embers.push({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.05, s: 1 + Math.random() * 2, ph: Math.random() * 6 });
    const loop = now => {
      if (!document.getElementById('title-screen').classList.contains('hidden')) this.draw(now / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },
  // 정적인 도시는 크기가 바뀔 때만 다시 그림
  build(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), rnd = mulberry32(2049);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b0d16'); sky.addColorStop(0.45, '#2a1a1e'); sky.addColorStop(0.7, '#5a2a18'); sky.addColorStop(1, '#1a0f0c');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    // 연기 구름
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = H * (0.1 + rnd() * 0.45), r = 80 + rnd() * 220;
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${40 + rnd() * 40},${30 + rnd() * 20},${30},0.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const horizon = H * 0.62;
    // 남산 + N서울타워
    g.fillStyle = '#120d0f'; g.beginPath(); g.moveTo(W * 0.6, horizon); g.quadraticCurveTo(W * 0.78, H * 0.38, W * 0.98, horizon); g.fill();
    const tx = W * 0.79, ty = H * 0.43;
    g.fillStyle = '#0d0a0c'; g.fillRect(tx - 3, ty - H * 0.2, 6, H * 0.2); g.fillRect(tx - 14, ty - H * 0.2, 28, 14); g.fillRect(tx - 1, ty - H * 0.28, 2, H * 0.08);
    g.fillStyle = '#ff4030'; g.fillRect(tx - 1, ty - H * 0.285, 2, 3);
    // 빌딩 숲 3겹 (뒤 → 앞)
    for (const [layer, col, hmin, hmax, wmin, wmax] of [[0, '#1a1418', 0.12, 0.3, 30, 70], [1, '#120e12', 0.08, 0.24, 40, 90], [2, '#0a080b', 0.05, 0.16, 50, 120]]) {
      let x = -20;
      while (x < W) {
        const bw = wmin + rnd() * (wmax - wmin), bh = H * (hmin + rnd() * (hmax - hmin)), base = horizon + layer * H * 0.06;
        g.fillStyle = col; g.fillRect(x, base - bh, bw, bh + H);
        if (rnd() < 0.3) g.fillRect(x + bw * 0.4, base - bh - 18, 3, 18); // 안테나
        for (let wy = base - bh + 8; wy < base - 4; wy += 10) for (let wx = x + 5; wx < x + bw - 6; wx += 9) {
          const r = rnd();
          if (r < 0.07) { g.fillStyle = rnd() < 0.5 ? 'rgba(255,170,70,0.85)' : 'rgba(255,90,40,0.8)'; g.fillRect(wx, wy, 4, 5); }
          else if (r < 0.1) { g.fillStyle = 'rgba(200,220,255,0.25)'; g.fillRect(wx, wy, 4, 5); }
        }
        x += bw + rnd() * 6;
      }
    }
    // 한강 반사
    const ry = horizon + H * 0.14;
    const river = g.createLinearGradient(0, ry, 0, H); river.addColorStop(0, '#2a1612'); river.addColorStop(1, '#0a0606');
    g.fillStyle = river; g.fillRect(0, ry, W, H - ry);
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,${120 + rnd() * 80},60,${0.1 + rnd() * 0.25})`; g.fillRect(rnd() * W, ry + rnd() * (H - ry) * 0.5, 10 + rnd() * 40, 1.5); }
    // 앞쪽 언덕 + 생존자 실루엣 (등을 보이며 도시를 내려다봄)
    g.fillStyle = '#060506'; g.beginPath(); g.moveTo(W * 0.48, H); g.quadraticCurveTo(W * 0.62, H * 0.8, W * 0.8, H * 0.86); g.lineTo(W, H * 0.84); g.lineTo(W, H); g.fill();
    const sx = W * 0.66, sy = H * 0.872, s = H / 520;
    g.fillStyle = '#050405';
    g.beginPath(); g.ellipse(sx, sy - 112 * s, 11 * s, 13 * s, 0, 0, Math.PI * 2); g.fill();          // 머리
    g.fillRect(sx - 22 * s, sy - 98 * s, 44 * s, 52 * s);                                            // 몸
    g.fillRect(sx - 26 * s, sy - 96 * s, 22 * s, 40 * s);                                            // 배낭
    g.fillRect(sx - 18 * s, sy - 48 * s, 15 * s, 48 * s); g.fillRect(sx + 3 * s, sy - 48 * s, 15 * s, 48 * s); // 다리
    g.save(); g.translate(sx + 18 * s, sy - 80 * s); g.rotate(1.25); g.fillRect(0, -3 * s, 70 * s, 6 * s); g.restore(); // 총
    return c;
  },
  draw(t) {
    const W = window.innerWidth, H = window.innerHeight, cv = this.cv, g = this.g;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; this.sky = null; }
    if (this.art) { // 키아트: 화면을 덮도록
      const sc = Math.max(W / this.art.width, H / this.art.height);
      g.drawImage(this.art, (W - this.art.width * sc) / 2, (H - this.art.height * sc) / 2, this.art.width * sc, this.art.height * sc);
    } else {
      if (!this.sky) this.sky = this.build(W, H);
      g.drawImage(this.sky, 0, 0);
      // 불길 깜빡임
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const x = W * (0.08 + i * 0.16 + Math.sin(i * 7) * 0.04), y = H * (0.6 + Math.sin(i * 3) * 0.03), r = H * (0.08 + 0.02 * Math.sin(t * 3 + i * 2));
        const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,110,40,0.22)'); gr.addColorStop(1, 'rgba(255,60,20,0)');
        g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = 'source-over';
    }
    // 날리는 불씨
    for (const e of this.embers) {
      const y = ((e.y - t * e.v) % 1 + 1) % 1, x = e.x + Math.sin(t * 0.7 + e.ph) * 0.02;
      g.fillStyle = `rgba(255,${140 + Math.sin(t * 5 + e.ph) * 60},60,${0.5 + Math.sin(t * 4 + e.ph) * 0.3})`;
      g.fillRect(x * W, y * H, e.s, e.s);
    }
    // 왼쪽 글자 영역을 읽기 쉽게 어둡게
    const sh = g.createLinearGradient(0, 0, W * 0.6, 0); sh.addColorStop(0, 'rgba(0,0,0,0.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H);
  },
};
TitleBG.init();
