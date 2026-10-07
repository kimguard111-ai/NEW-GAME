// 2.5D 쿼터뷰(아이소메트릭) 렌더러
// 월드 좌표 (x, y, 높이 z) → 화면: sx = (x - y)·K, sy = (x + y)·K/2 - z·K
const ISO_K = 0.9;
// 카메라 확대 (v0.11): 월드 전체를 ZOOM 배로 그림. VW·VH 는 확대 전 기준의 가상 화면 크기
// 모바일은 화면이 작아 기본값을 화면 높이에 맞춤 (가로 390px 폰 ≈ 0.7)
const ZOOM_MIN = IS_TOUCH ? 0.6 : 1;
// 고해상도 화면(폰) 선명하게: 캔버스를 기기 픽셀 비율로 그림 (모바일 성능을 위해 최대 1.5배, PC는 기존과 같은 1배)
const RES = IS_TOUCH ? Math.min(window.devicePixelRatio || 1, 1.5) : 1;
const ZOOM_MAX = 2.6; // v1.50.10 최대 확대 2.2 → 2.6
let ZOOM = IS_TOUCH ? clamp(Math.round(Math.min(window.innerWidth, window.innerHeight) / 560 * 1.75 * 10) / 10, 0.9, 2.1) : 1.9; // v1.50.10 기본 확대 ↑ (PC 1.6 → 1.9 · 모바일 ×1.5 → ×1.75) // v1.45.2 모바일 기본 확대 ×1.15 → ×1.5 (캐릭터가 너무 작게 보이던 것) // v1.21 캐릭터가 작아진 만큼 기본 확대 ↑
try { const z = +localStorage.getItem('seoul2049-zoom'); if (z) ZOOM = clamp(localStorage.getItem('seoul2049-zoom121') ? z : z * 1.15, ZOOM_MIN, ZOOM_MAX); localStorage.setItem('seoul2049-zoom121', '1'); if (IS_TOUCH && z && !localStorage.getItem('seoul2049-zoom1452')) ZOOM = clamp(ZOOM * 1.3, ZOOM_MIN, ZOOM_MAX); localStorage.setItem('seoul2049-zoom1452', '1'); if (z && !localStorage.getItem('seoul2049-zoom1510')) ZOOM = clamp(ZOOM * 1.2, ZOOM_MIN, ZOOM_MAX); localStorage.setItem('seoul2049-zoom1510', '1'); /* v1.50.10 저장된 확대도 한 번 ×1.2 */ } catch (e) { /* 저장 불가 */ } // v1.21 저장된 확대도 한 번 ×1.15

const Iso = {
  sx: (x, y) => (x - y) * ISO_K - G.cam.x,
  sy: (x, y, z = 0) => (x + y) * ISO_K / 2 - z * ISO_K - G.cam.y,
  // 화면 좌표 → 지면(z) 위 월드 좌표
  toWorld(mx, my, z = 0) {
    const ix = (mx + G.cam.x) / ISO_K, iy = (my + G.cam.y) / ISO_K + z;
    return { x: (ix + 2 * iy) / 2, y: (2 * iy - ix) / 2 };
  },
  // 월드 방향 각도 → 화면상의 단위 방향
  dir(a) {
    const dx = Math.cos(a) - Math.sin(a), dy = (Math.cos(a) + Math.sin(a)) / 2, l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  },
  // 바닥 그리기용 변환 (월드 좌표 그대로 그리면 투영됨)
  groundTransform() { const z = ZOOM * RES; ctx.setTransform(ISO_K * z, ISO_K / 2 * z, -ISO_K * z, ISO_K / 2 * z, -G.cam.x * z, -G.cam.y * z); },
  reset() { ctx.setTransform(ZOOM * RES, 0, 0, ZOOM * RES, 0, 0); },
};

const TILE_COLORS = {
  [T.ROAD]: '#2a2c30', [T.WALK]: '#45464b', [T.RUBBLE]: '#3d3833', [T.GRASS]: '#2c3824',
  [T.CAMP]: '#363c45', [T.CAR]: '#2a2c30', [T.BARRICADE]: '#363c45', [T.BUILDING]: '#1d1d20', [T.LANDMARK]: '#3a3833',
  [T.WALL]: '#2a2420', [T.FLOOR]: '#4a4038', [T.DOOR]: '#4a4038', [T.PROP]: '#4a4038',
  [T.LWALL]: '#060709', [T.LFLOOR]: '#3a3f46', [T.LPROP]: '#3a3f46', [T.WATER]: '#16303e',
};

// ---------------- 바닥 ----------------
// v1.31.2 바닥 질감 (프롬프트 16번): 있으면 바탕색 대신 그림 — 그림 하나를 4×4칸에 걸쳐 펼침. 차선·횡단보도·풀 포기 같은 코드 디테일은 그 위에 그대로
const GROUND_TEX = { [T.ROAD]: 'gr_asphalt', [T.CAR]: 'gr_asphalt', [T.WALK]: 'gr_sidewalk', [T.GRASS]: ['gr_grass', 'gr_grass2'], [T.RUBBLE]: 'gr_dirt', [T.WATER]: 'gr_water', [T.CAMP]: 'gr_plaza', [T.BARRICADE]: 'gr_plaza', [T.LANDMARK]: 'gr_dirt' };
function groundTex(tx, ty, t, x, y) {
  let k = GROUND_TEX[t]; if (Array.isArray(k)) { const v = k.filter(q => ART.tex[q] && ART.tex[q].ready); k = v[Math.floor(hash2(tx >> 2, ty >> 2) * v.length)]; } // 변형: 4×4칸 덩어리마다
  const a = ART.tex && ART.tex[k]; if (!a || !a.ready) return false;
  const [rx, ry, rw, rh] = a.rect || [0, 0, a.img.width, a.img.height], q = 4;
  ctx.drawImage(a.img, rx + (((tx % q) + q) % q) * rw / q, ry + (((ty % q) + q) % q) * rh / q, rw / q, rh / q, x, y, TILE + 0.6, TILE + 0.6);
  return true;
}
function drawGroundTile(tx, ty, t) {
  const x = tx * TILE, y = ty * TILE, h = hash2(tx, ty);
  if (!groundTex(tx, ty, t, x, y)) { ctx.fillStyle = TILE_COLORS[t]; ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6); }
  if (t === T.ROAD || t === T.CAR) {
    const lx = tx % World.BLOCK, ly = ty % World.BLOCK, RW = World.ROADW;
    ctx.fillStyle = '#8a7a3a'; // 중앙선 (4차선: 2번째와 3번째 칸 사이)
    if (lx === RW / 2 && ly > RW && ty % 2 === 0) ctx.fillRect(x - 2, y + 4, 4, 18);
    if (ly === RW / 2 && lx > RW && tx % 2 === 0) ctx.fillRect(x + 4, y - 2, 18, 4);
    // v1.21 왕복 2차선 (차선 하나 2칸 ≈ 3.2m — 예전 4차선 표시는 차선이 1.6m라 비현실적) · 가장자리 실선
    ctx.fillStyle = 'rgba(200,200,190,0.22)';
    if (lx === 0 && ly > RW) ctx.fillRect(x + 2, y, 1.5, TILE); if (lx === RW - 1 && ly > RW) ctx.fillRect(x + TILE - 3.5, y, 1.5, TILE);
    if (ly === 0 && lx > RW) ctx.fillRect(x, y + 2, TILE, 1.5); if (ly === RW - 1 && lx > RW) ctx.fillRect(x, y + TILE - 3.5, TILE, 1.5);
    // 교차로 앞 횡단보도
    ctx.fillStyle = 'rgba(170,170,160,0.35)';
    if (ly === RW && lx < RW) for (let i = 0; i < 4; i++) ctx.fillRect(x + 2 + i * 8, y + 5, 4, 22);
    if (lx === RW && ly < RW) for (let i = 0; i < 4; i++) ctx.fillRect(x + 5, y + 2 + i * 8, 22, 4);
    if (h < 0.06) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + h * 200, y + 10, 10, 6); }
    if (Settings.detail) roadWear(x, y, h, tx, ty);
  } else if (t === T.WALK) { // v1.10 보도블록: 칸마다 조금씩 다른 색 · 깨진 블록 · 틈새 풀
    const v = Math.floor((hash2(tx * 5 + 1, ty * 3 + 2) - 0.5) * 10);
    ctx.fillStyle = `rgb(${69 + v},${70 + v},${75 + v})`; ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    ctx.beginPath(); ctx.moveTo(x + 16, y); ctx.lineTo(x + 16, y + TILE); ctx.moveTo(x, y + 16); ctx.lineTo(x + TILE, y + 16); ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.stroke();
    if (h < 0.1) { ctx.fillStyle = 'rgba(25,25,28,0.55)'; ctx.beginPath(); ctx.moveTo(x + 16 * (h > 0.05), y + 16 * (h * 20 % 1 > 0.5)); ctx.lineTo(x + 16 * (h > 0.05) + 16, y + 16 * (h * 20 % 1 > 0.5) + 3); ctx.lineTo(x + 16 * (h > 0.05) + 9, y + 16 * (h * 20 % 1 > 0.5) + 16); ctx.fill(); } // 깨진 블록
    else if (h > 0.9) { ctx.fillStyle = 'rgba(70,95,50,0.6)'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 14 + i * 2 - 3, y + 15 - (i % 2) * 3, 1.5, 3 + (i % 2) * 2); } // 틈새 풀
  } else if (t === T.RUBBLE) { // v1.10 잔해 바닥: 크기·색이 다른 콘크리트 조각 + 철근 + 먼지
    ctx.fillStyle = 'rgba(80,72,62,0.5)'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 14, 11, h * 6, 0, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const hh = hash2(tx * 3 + i, ty * 7 - i), h3 = hash2(ty + i * 5, tx - i);
      const c = 70 + Math.floor(hh * 40);
      ctx.fillStyle = `rgb(${c},${c - 5},${c - 12})`;
      const px = x + 2 + hh * 24, py = y + 2 + h3 * 24, w = 3 + hh * 7, hgt = 2 + h3 * 5;
      ctx.beginPath(); ctx.moveTo(px, py + hgt); ctx.lineTo(px + w * 0.3, py); ctx.lineTo(px + w, py + hgt * 0.3); ctx.lineTo(px + w * 0.8, py + hgt); ctx.fill();
    }
    if (h < 0.25) { ctx.strokeStyle = '#6a3a22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 6 + h * 40, y + 20); ctx.lineTo(x + 20 + h * 20, y + 8); ctx.stroke(); ctx.lineWidth = 1; } // 철근
  } else if (t === T.GRASS) { // v1.10 풀밭: 색 얼룩 + 풀 포기
    ctx.fillStyle = h < 0.5 ? 'rgba(60,78,44,0.6)' : 'rgba(36,46,30,0.6)'; ctx.beginPath(); ctx.ellipse(x + 8 + h * 16, y + 10 + h * 12, 9, 6, h * 5, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a6034'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const gx = x + 4 + hash2(tx + i, ty * 3) * 24, gy = y + 4 + hash2(ty + i * 7, tx) * 24; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 2, gy - 4); ctx.moveTo(gx, gy); ctx.lineTo(gx + 1, gy - 5); ctx.moveTo(gx, gy); ctx.lineTo(gx + 3, gy - 3); ctx.stroke(); }
  } else if ((t === T.FLOOR || t === T.PROP) && floorTex(tx, ty, x, y)) { // v1.25 실내 바닥 질감 그림
  } else if (t === T.FLOOR || t === T.DOOR) { // 실내 바닥 (나무 마루)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    for (let i = 8; i < TILE; i += 8) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.lineTo(x + TILE, y + i); ctx.stroke(); }
    if (h < 0.15) { ctx.fillStyle = 'rgba(30,25,20,0.5)'; ctx.fillRect(x + h * 100, y + 6, 10, 8); } // 얼룩·잔해
    if (t === T.DOOR) { ctx.fillStyle = '#5a5048'; ctx.fillRect(x, y, TILE, TILE); }
  } else if (t === T.CAMP) { // v1.10 캠프 광장: 낡은 보도석 + 깔아 둔 판자·방수포
    const v = Math.floor((hash2(tx * 7 + 3, ty * 11 + 5) - 0.5) * 8);
    ctx.fillStyle = `rgb(${62 + v},${64 + v},${66 + v})`; ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    if (h < 0.07) { ctx.fillStyle = '#4a3a2a'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 3, y + 4 + i * 9, TILE - 6, 7); ctx.fillStyle = 'rgba(0,0,0,0.3)'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 3, y + 10 + i * 9, TILE - 6, 1); } // 판자
    else if (h > 0.975) { ctx.fillStyle = 'rgba(50,70,90,0.4)'; ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4); } // 방수포
    else if (h > 0.8) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 10, 7, h * 9, 0, TAU); ctx.fill(); } // 얼룩
  } else if (t === T.WATER) { // v1.6 석촌호수: 잔물결 · 떠다니는 잔해
    ctx.strokeStyle = 'rgba(120,180,210,0.18)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) { const yy = y + 8 + i * 14 + h * 6; ctx.beginPath(); ctx.moveTo(x + 4 + h * 8, yy); ctx.quadraticCurveTo(x + 14, yy - 3, x + 24 - h * 6, yy); ctx.stroke(); }
    ctx.lineWidth = 1;
    if (h < 0.05) { ctx.fillStyle = '#3a3428'; ctx.fillRect(x + 8, y + 10, 10, 5); }
    const d = (dx, dy) => World.tileAt(tx + dx, ty + dy) !== T.WATER; // 물가 테두리
    ctx.fillStyle = 'rgba(160,150,120,0.35)';
    if (d(0, -1)) ctx.fillRect(x, y, TILE, 3); if (d(0, 1)) ctx.fillRect(x, y + TILE - 3, TILE, 3);
    if (d(-1, 0)) ctx.fillRect(x, y, 3, TILE); if (d(1, 0)) ctx.fillRect(x + TILE - 3, y, 3, TILE);
  } else if (t === T.LFLOOR || t === T.LPROP) { // v1.5 연구소 바닥: 금속 패널 · 배수 격자 · 얼룩
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x + 2, y + 2, TILE - 4, 2);
    if (h < 0.08) { ctx.fillStyle = 'rgba(20,22,26,0.8)'; for (let i = 6; i < TILE - 4; i += 5) ctx.fillRect(x + 6, y + i, TILE - 12, 2); } // 배수 격자
    else if (h < 0.13) { ctx.fillStyle = 'rgba(90,10,10,0.5)'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 6 + h * 60, 4 + h * 30, h * 20, 0, TAU); ctx.fill(); } // 핏자국
    else if (h > 0.96) { ctx.fillStyle = 'rgba(200,170,40,0.35)'; for (let i = 0; i < 4; i++) ctx.fillRect(x + i * 8, y + 13, 4, 6); } // 경고 줄무늬
  }
}

// v1.10 도로 마모: 갈라짐 · 움푹 팬 곳 · 기름 웅덩이 · 맨홀
function roadWear(x, y, h, tx, ty) {
  const h2 = hash2(tx * 13 + 5, ty * 7 + 1);
  if (h2 < 0.12) { // 갈라진 금
    ctx.strokeStyle = 'rgba(10,10,12,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); let px = x + h2 * 200 % 28, py = y + 2; ctx.moveTo(px, py);
    for (let i = 1; i < 5; i++) { px += (hash2(tx + i, ty - i) - 0.5) * 14; py += 7; ctx.lineTo(px, py); }
    ctx.stroke();
  } else if (h2 < 0.16) { // 팬 곳
    ctx.fillStyle = 'rgba(12,12,14,0.6)'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 8 + h2 * 20, 5 + h2 * 10, h * 4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(80,76,70,0.5)'; ctx.fillRect(x + 10, y + 12, 3, 2); ctx.fillRect(x + 20, y + 19, 2, 2);
  } else if (h2 < 0.19) { // 물·기름 웅덩이 (살짝 반사)
    ctx.fillStyle = 'rgba(40,50,64,0.7)'; ctx.beginPath(); ctx.ellipse(x + 15, y + 17, 11, 7, h * 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(140,120,170,0.25)'; ctx.beginPath(); ctx.ellipse(x + 13, y + 15, 6, 3, h * 3, 0, Math.PI); ctx.stroke();
  } else if (h2 > 0.992) { // 맨홀
    ctx.fillStyle = '#1c1d20'; ctx.beginPath(); ctx.arc(x + 16, y + 16, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a3b40'; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 11, y + 16); ctx.lineTo(x + 21, y + 16); ctx.stroke();
  }
}

// v1.10 맵 바깥: 검은 허공 대신 무너진 도시가 이어지는 바닥 (멀어질수록 안개로 어두워짐)
function drawOutsideTile(tx, ty) {
  const x = tx * TILE, y = ty * TILE, h = hash2(tx + 911, ty + 377);
  const d = Math.max(-tx, -ty, tx - World.W + 1, ty - World.H + 1); // 맵 경계에서 몇 칸 떨어졌나
  const lab = World.def && World.def.lab;
  ctx.fillStyle = lab ? '#060709' : h < 0.55 ? '#2c2a28' : '#33302c'; ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
  if (!lab) {
    for (let i = 0; i < 4; i++) {
      const hh = hash2(tx * 3 + i, ty * 5 - i), c = 52 + Math.floor(hh * 30);
      ctx.fillStyle = `rgb(${c},${c - 4},${c - 9})`; ctx.fillRect(x + hh * 24, y + hash2(ty + i, tx * 2) * 24, 3 + hh * 8, 2 + hh * 5);
    }
    if (h < 0.08) { ctx.fillStyle = '#1a1816'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 14, 10, h * 20, 0, TAU); ctx.fill(); } // 그을린 자국
  }
  ctx.fillStyle = `rgba(6,7,10,${Math.min(0.92, 0.25 + d * 0.09)})`; ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
}

// 정적인 바닥을 청크 단위로 미리 그려 캐시 (LRU)
const OUT_PAD = 14; // 맵 바깥으로 그리는 칸 수
// v1.50.8 캔버스 메모리 예산: 폰(특히 아이폰 사파리)은 캔버스 메모리 합이 한도를 넘으면 새 캔버스가 소리 없이 비어 버림
// (타이틀·캐릭터 그림이 벗겨지거나 깜빡이던 것) → 캐시마다 픽셀 예산을 두고, 버릴 때 크기를 0으로 만들어 바로 돌려줌
const CANVAS_BUDGET = { ground: IS_TOUCH ? 12e6 : 40e6, mip: IS_TOUCH ? 6e6 : 20e6 };
function freeCanvas(c) { if (c) { c.width = 0; c.height = 0; } }
const GroundCache = {
  CH: 16, map: new Map(), LIMIT: 28, px: 0,
  clear() { for (const c of this.map.values()) freeCanvas(c.cv); this.map.clear(); this.px = 0; }, // v1.50.8 비울 때 메모리도 바로 돌려줌
  get(cx, cy) {
    const key = cx + ',' + cy;
    let c = this.map.get(key);
    if (c) { this.map.delete(key); this.map.set(key, c); return c; }
    const CH = this.CH, x0 = cx * CH * TILE, y0 = cy * CH * TILE, span = CH * TILE;
    const left = Math.floor((x0 - y0 - span) * ISO_K) - 2, top = Math.floor((x0 + y0) * ISO_K / 2) - 2;
    const cv = document.createElement('canvas'), z = ZOOM * RES;
    cv.width = Math.ceil((2 * span * ISO_K + 4) * z); cv.height = Math.ceil((span * ISO_K + 4) * z);
    const g = cv.getContext('2d');
    const saved = ctx; ctx = g;
    g.setTransform(ISO_K * z, ISO_K / 2 * z, -ISO_K * z, ISO_K / 2 * z, -left * z, -top * z);
    // 경계 이음매 방지를 위해 한 칸씩 더 그림
    for (let ty = cy * CH - 1; ty <= cy * CH + CH; ty++) for (let tx = cx * CH - 1; tx <= cx * CH + CH; tx++) {
      if (tx < 0 || ty < 0 || tx >= World.W || ty >= World.H) { if (tx >= -OUT_PAD && ty >= -OUT_PAD && tx < World.W + OUT_PAD && ty < World.H + OUT_PAD) drawOutsideTile(tx, ty); continue; }
      drawGroundTile(tx, ty, World.tiles[ty * World.W + tx]);
    }
    ctx = saved;
    c = { cv, left, top, z };
    this.map.set(key, c); this.px += cv.width * cv.height;
    while (this.map.size > 1 && (this.map.size > this.LIMIT || this.px > CANVAS_BUDGET.ground)) { const k = this.map.keys().next().value, o = this.map.get(k); this.px -= o.cv.width * o.cv.height; freeCanvas(o.cv); this.map.delete(k); } // v1.50.8 예산 넘으면 오래된 것부터 바로 해제
    return c;
  },
  draw(tx0, ty0, tx1, ty1) {
    const Z = ZOOM * RES, CH = this.CH, ox = Math.round(G.cam.x * Z) / Z, oy = Math.round(G.cam.y * Z) / Z;
    for (let cy = Math.floor(ty0 / CH); cy <= Math.floor(ty1 / CH); cy++)
      for (let cx = Math.floor(tx0 / CH); cx <= Math.floor(tx1 / CH); cx++) {
        const x0 = cx * CH * TILE, y0 = cy * CH * TILE, span = CH * TILE;
        const sl = (x0 - y0 - span) * ISO_K - G.cam.x, st = (x0 + y0) * ISO_K / 2 - G.cam.y;
        if (sl > VW || sl + 2 * span * ISO_K < 0 || st > VH || st + span * ISO_K < 0) continue;
        const c = this.get(cx, cy);
        ctx.drawImage(c.cv, c.left - ox, c.top - oy, c.cv.width / c.z, c.cv.height / c.z);
      }
  },
};

// ---------------- 입체 박스 ----------------
function poly(pts, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath(); ctx.fill();
}

// (x0,y0)-(x1,y1) 월드 사각형, 높이 h. sz/ez: 남쪽/동쪽 면이 시작되는 높이(이웃 건물에 가려진 부분 제외, -1 = 안 보임)
function drawBox(x0, y0, x1, y1, h, top, south, east, sz, ez, win) {
  const S = Iso.sx, Y = Iso.sy;
  if (sz >= 0 && sz < h) {
    poly([S(x0, y1), Y(x0, y1, sz), S(x1, y1), Y(x1, y1, sz), S(x1, y1), Y(x1, y1, h), S(x0, y1), Y(x0, y1, h)], south);
    if (win) drawWindows(x0, y1, x1, y1, sz, h, win, 0);
  }
  if (ez >= 0 && ez < h) {
    poly([S(x1, y0), Y(x1, y0, ez), S(x1, y1), Y(x1, y1, ez), S(x1, y1), Y(x1, y1, h), S(x1, y0), Y(x1, y0, h)], east);
    if (win) drawWindows(x1, y0, x1, y1, ez, h, win, 1);
  }
  poly([S(x0, y0), Y(x0, y0, h), S(x1, y0), Y(x1, y0, h), S(x1, y1), Y(x1, y1, h), S(x0, y1), Y(x0, y1, h)], top);
}

// 벽면 창문 (층마다 2개)
function drawWindows(ax, ay, bx, by, z0, h, seed, side) {
  for (let fz = 16; fz + 30 < h; fz += FLOOR_H) { // v1.21 층 2.7m에 맞춘 창문 (높이 26)
    if (fz < z0) continue;
    for (let k = 0; k < 2; k++) {
      const u0 = 0.18 + k * 0.42, u1 = u0 + 0.24;
      const lit = hash2(seed * 31 + k + side * 7, fz) < (World.def && World.def.tall ? 0.22 : 0.12); // 강남은 불 켜진 창이 많음
      const ax0 = lerp(ax, bx, u0), ay0 = lerp(ay, by, u0), ax1 = lerp(ax, bx, u1), ay1 = lerp(ay, by, u1);
      poly([Iso.sx(ax0, ay0), Iso.sy(ax0, ay0, fz), Iso.sx(ax1, ay1), Iso.sy(ax1, ay1, fz),
        Iso.sx(ax1, ay1), Iso.sy(ax1, ay1, fz + 26), Iso.sx(ax0, ay0), Iso.sy(ax0, ay0, fz + 26)], lit ? '#c9a24a' : '#16181c');
    }
  }
}

// 들어간 건물의 벽은 낮게 잘라 내부가 보이게 (v0.13)
const CUT_H = 34;
// v1.49.11 들어간 건물 벽 높이: 앞(남·동 바깥벽)은 발목까지 · 뒤(북·서 바깥벽)는 높게 · 칸막이는 중간 — 앞벽이 방을 가리고 모든 벽이 같은 회색 상자라 어색하던 것
function cutWallH(tx, ty) {
  const bd = World.buildings[World.bid[ty * World.W + tx]]; if (!bd) return CUT_H;
  if (ty === bd.y1 || tx === bd.x1) return 9;
  if (ty === bd.y0 || tx === bd.x0) return 38;
  return 22;
}
const PLASTER = [[125, 116, 102], [108, 120, 114], [122, 108, 96], [116, 110, 104], [98, 106, 118]];
// 실내 벽면 한 면: 회벽 + 아래 징두리(어두운 판) + 걸레받이 + 가끔 얼룩·벽보
function drawInnerFace(ax, ay, bx, by, h, bd, hs) {
  const S = Iso.sx, Y = Iso.sy, c = PLASTER[bd.id % PLASTER.length], f = (k, d) => `rgb(${c[0] * k + d | 0},${c[1] * k + d | 0},${c[2] * k + d | 0})`;
  const quad = (z0, z1, col) => poly([S(ax, ay), Y(ax, ay, z0), S(bx, by), Y(bx, by, z0), S(bx, by), Y(bx, by, z1), S(ax, ay), Y(ax, ay, z1)], col);
  quad(0, h, f(0.78, 0));
  const wz = Math.min(h, 15); quad(0, wz, f(0.55, 4)); // 징두리
  quad(0, 2.5, 'rgba(20,16,12,0.75)'); // 걸레받이
  if (h > wz) { ctx.strokeStyle = 'rgba(255,240,210,0.12)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(S(ax, ay), Y(ax, ay, wz)); ctx.lineTo(S(bx, by), Y(bx, by, wz)); ctx.stroke(); }
  if (h > 26 && hs < 0.22) { const k = 0.25 + hs * 2, px = ax + (bx - ax) * k, py = ay + (by - ay) * k, qx = ax + (bx - ax) * (k + 0.32), qy = ay + (by - ay) * (k + 0.32); // 벽보 · 액자
    poly([S(px, py), Y(px, py, 20), S(qx, qy), Y(qx, qy, 20), S(qx, qy), Y(qx, qy, 32), S(px, py), Y(px, py, 32)], hs < 0.1 ? 'rgba(170,150,110,0.85)' : 'rgba(60,70,80,0.9)'); }
  else if (h > 20 && hs > 0.8) { ctx.fillStyle = 'rgba(40,30,20,0.25)'; ctx.beginPath(); ctx.ellipse((S(ax, ay) + S(bx, by)) / 2, (Y(ax, ay, h * 0.6) + Y(bx, by, h * 0.6)) / 2, 7, 4, 0, 0, TAU); ctx.fill(); } // 물 얼룩
}
function insideBid(tx, ty) { return G.inside && World.bid[ty * World.W + tx] === G.inside.id; }
function tileHeight(tx, ty) {
  const t = World.tileAt(tx, ty);
  if (t === T.BUILDING) return World.height[ty * World.W + tx] || 60;
  if (t === T.WALL) return insideBid(tx, ty) ? cutWallH(tx, ty) : World.height[ty * World.W + tx];
  if (t === T.FLOOR || t === T.DOOR) return insideBid(tx, ty) ? 0 : World.height[ty * World.W + tx];
  if (t === T.PROP) return insideBid(tx, ty) ? World.height[ty * World.W + tx] : World.buildings[World.bid[ty * World.W + tx]].h; // 소품 / 바깥에서는 지붕
  if (t === T.LWALL || t === T.LPROP) return World.height[ty * World.W + tx];
  return 0;
}

function drawSolidTile(o) {
  const { tx, ty, t } = o, x0 = tx * TILE, y0 = ty * TILE, x1 = x0 + TILE, y1 = y0 + TILE;
  const h = hash2(tx, ty);
  if (o.fade) ctx.globalAlpha = 0.3;
  if (t === T.BUILDING) {
    const s = World.shade[ty * World.W + tx], ht = World.height[ty * World.W + tx] || 60;
    const b = 72 + Math.floor(s * 38);
    const ruin = ht < 44, glass = World.def && World.def.tall && ht > FLOOR_H * 5.5; // v1.21 층 높이가 커진 만큼 기준 층수 ↓ // v1.6 강남 유리 고층 빌딩: 푸른 유리 외벽
    const top = ruin ? `rgb(${b - 8},${b - 14},${b - 20})` : glass ? `rgb(${b - 22},${b - 10},${b + 6})` : `rgb(${b},${b - 3},${b - 8})`;
    const south = glass ? `rgb(${b - 52},${b - 40},${b - 22})` : `rgb(${b - 34},${b - 37},${b - 42})`, east = glass ? `rgb(${b - 40},${b - 28},${b - 10})` : `rgb(${b - 20},${b - 23},${b - 28})`;
    if (ruin) { drawRuinTile(tx, ty, x0, y0, ht, b, h); ctx.globalAlpha = 1; return; } // v1.10 무너진 건물
    const sz = tileHeight(tx, ty + 1), ez = tileHeight(tx + 1, ty);
    const fv = facadeVariant(tx, ty, glass, ht);
    if (fv) drawTexBuilding(tx, ty, x0, y0, x1, y1, ht, sz, ez, fv, s); // v1.19 그림 질감
    else {
      drawBox(x0, y0, x1, y1, ht, top, south, east, sz, ez, tx * 977 + ty);
      if (!glass && Settings.detail) drawFacadeBase(tx, ty, x0, y0, x1, y1, sz, ez, h); // v1.10 1층 셔터·때
    }
    City.drawSign(tx, ty); // v1.2 한글 네온 간판
    if (!glass && Settings.detail) drawDongNo(tx, ty, ht, ez, h); // v1.21 아파트 동 번호
    if (Settings.detail) drawRoof(tx, ty, x0, y0, x1, y1, ht, b, h, glass);
    else if (h < 0.04) drawBox(x0 + 9, y0 + 9, x1 - 9, y1 - 9, ht + 8, '#4a4a4e', '#2e2e32', '#3a3a3e', ht, ht, 0); // 옥상 환풍기
  } else if (t === T.PROP && insideBid(tx, ty)) { // 실내 소품 (v0.15)
    const bd = World.buildings[World.bid[ty * World.W + tx]], S = SHOP_STYLES[bd.style], ph = tileHeight(tx, ty);
    const ak = ART.shopArt[bd.name] && ART.shopArt[bd.name].obj;
    if (ak && propArt(ak)) { // v1.25 실내 소품 그림: 같은 건물 소품이 좌우(x)로 이어지면 그대로, 위아래(y)로 이어지면 뒤집음
      const runY = World.tileAt(tx, ty - 1) === T.PROP || World.tileAt(tx, ty + 1) === T.PROP, runX = World.tileAt(tx - 1, ty) === T.PROP || World.tileAt(tx + 1, ty) === T.PROP;
      drawPropArt(ak, Iso.sx(x0 + 16, y0 + 16), Iso.sy(x0 + 16, y0 + 16), runY && !runX);
      ctx.globalAlpha = 1; return;
    }
    const ins = bd.style === 'table' || bd.style === 'washer' ? 5 : 2; // 식탁·세탁기는 한 칸 안에서 작게
    drawBox(x0 + ins, y0 + ins, x1 - ins, y1 - ins, ph, S.c[0], S.c[1], S.c[2], 0, 0, 0);
    if (bd.style === 'shelf') { // 진열 상품 (색 점)
      for (let i = 0; i < 3; i++) { ctx.fillStyle = ['#c84a3a', '#d8b040', '#4a8ac8'][(tx + ty + i) % 3]; ctx.fillRect(Iso.sx(x0 + 8 + i * 8, y0 + 16) - 2, Iso.sy(x0 + 8 + i * 8, y0 + 16, ph) - 3, 4, 3); }
    } else if (bd.style === 'desk') { // 모니터 불빛
      drawBox(x0 + 10, y0 + 12, x1 - 10, y1 - 12, ph + 14, '#1a1c20', '#7ab8e8', '#4a7aa8', ph, ph, 0);
    } else if (bd.style === 'washer') {
      ctx.fillStyle = '#3a4048'; ctx.beginPath(); ctx.arc(Iso.sx(x0 + 16, y1 - 5), Iso.sy(x0 + 16, y1 - 5, ph * 0.5), 5, 0, TAU); ctx.fill();
    }
  } else if (t === T.WALL || t === T.FLOOR || t === T.DOOR || t === T.PROP) { // 들어갈 수 있는 건물 (상가) · 소품 칸은 바깥에서 지붕
    const i = ty * World.W + tx, s = World.shade[i], cut = insideBid(tx, ty), ht = tileHeight(tx, ty);
    const b = 92 + Math.floor(s * 30);
    const top = `rgb(${b + 6},${b - 10},${b - 26})`, south = `rgb(${b - 40},${b - 52},${b - 62})`, east = `rgb(${b - 24},${b - 36},${b - 46})`;
    const sf = t === T.WALL && !cut && shopFront(i); // v1.31.1 들어갈 수 있는 상가 외벽 그림 (가게 앞모습 + 위층 외벽)
    if (sf) drawTexBuilding(tx, ty, x0, y0, x1, y1, ht, tileHeight(tx, ty + 1), tileHeight(tx + 1, ty), sf.upper, s, sf.front);
    else if (t === T.WALL && cut) { // v1.49.11 잘린 벽: 안쪽을 보는 면은 실내 마감 · 바깥을 보는 면은 바깥벽 색 · 윗면은 잘린 단면
      const bd = World.buildings[World.bid[i]], sz = tileHeight(tx, ty + 1), ez = tileHeight(tx + 1, ty), S = Iso.sx, Y = Iso.sy;
      const sIn = ty !== bd.y1, eIn = tx !== bd.x1; // 남쪽 면이 실내를 보는가 (맨 아래 바깥벽이 아니면) · 동쪽 면도 같은 방식
      if (sz >= 0 && sz < ht) { if (sIn) drawInnerFace(x0, y1, x1, y1, ht, bd, h); else poly([S(x0, y1), Y(x0, y1, sz), S(x1, y1), Y(x1, y1, sz), S(x1, y1), Y(x1, y1, ht), S(x0, y1), Y(x0, y1, ht)], south); }
      if (ez >= 0 && ez < ht) { if (eIn) drawInnerFace(x1, y0, x1, y1, ht, bd, hash2(tx + 3, ty)); else poly([S(x1, y0), Y(x1, y0, ez), S(x1, y1), Y(x1, y1, ez), S(x1, y1), Y(x1, y1, ht), S(x1, y0), Y(x1, y0, ht)], east); }
      poly([S(x0, y0), Y(x0, y0, ht), S(x1, y0), Y(x1, y0, ht), S(x1, y1), Y(x1, y1, ht), S(x0, y1), Y(x0, y1, ht)], '#34302b'); // 잘린 단면
      ctx.strokeStyle = 'rgba(210,190,160,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(S(x0, y1), Y(x0, y1, ht)); ctx.lineTo(S(x1, y1), Y(x1, y1, ht)); ctx.lineTo(S(x1, y0), Y(x1, y0, ht)); ctx.stroke();
    } else if (t === T.WALL) {
      drawBox(x0, y0, x1, y1, ht, top, south, east, tileHeight(tx, ty + 1), tileHeight(tx + 1, ty), tx * 977 + ty);
    } else if (t === T.FLOOR || t === T.PROP) { // 지붕 (바깥에서만)
      drawBox(x0, y0, x1, y1, ht, `rgb(${b - 20},${b - 26},${b - 32})`, south, east, -1, -1, 0);
      if (h < 0.05) drawBox(x0 + 8, y0 + 8, x1 - 8, y1 - 8, ht + 10, '#4a4a4e', '#2e2e32', '#3a3a3e', ht, ht, 0); // 옥상 실외기
    } else if (cut) { // v1.49.11 안에 있을 때 출입문: 문턱만 (낮아진 앞벽 위에 문틀·간판이 떠 있지 않게)
      const S = Iso.sx, Y = Iso.sy; poly([S(x0, y0), Y(x0, y0, 0), S(x1, y0), Y(x1, y0, 0), S(x1, y1), Y(x1, y1, 0), S(x0, y1), Y(x0, y1, 0)], 'rgba(30,26,22,0.55)');
    } else { // 출입문: 위쪽 문틀만, 아래는 어두운 입구
      const bd = World.buildings[World.bid[i]], LIN = 54;
      const S = Iso.sx, Y = Iso.sy;
      if (bd.south) poly([S(x0, y1), Y(x0, y1, 0), S(x1, y1), Y(x1, y1, 0), S(x1, y1), Y(x1, y1, LIN), S(x0, y1), Y(x0, y1, LIN)], 'rgba(10,8,6,0.85)');
      else poly([S(x1, y0), Y(x1, y0, 0), S(x1, y1), Y(x1, y1, 0), S(x1, y1), Y(x1, y1, LIN), S(x1, y0), Y(x1, y0, LIN)], 'rgba(10,8,6,0.85)');
      drawBox(x0, y0, x1, y1, ht, top, south, east, bd.south ? LIN : -1, bd.south ? -1 : LIN, 0);
      // 간판 (문 위 노란 띠) · v1.47 그림 판이 있으면 문 두 칸에 반씩 나눠 그림 (깊이 순서 유지)
      const z0 = LIN + 6, z1 = LIN + 22, da = City.signArt('door');
      if (da) { const idx = bd.door.findIndex(([x, y]) => x === tx && y === ty), v = doorSignVar(bd.name), r = da.rects[v], half = bd.south ? idx : 1 - idx, bh = da.bh[v], dh = 16 / bh;
        ctx.save(); City.faceTransform(tx, ty, bd.south ? 's' : 'e', z1); ctx.drawImage(da.img, r[0] + half * r[2] / 2, r[1], r[2] / 2, r[3], 0, 0, TILE, dh); ctx.restore(); }
      else if (bd.south) poly([S(x0, y1), Y(x0, y1, z0), S(x1, y1), Y(x1, y1, z0), S(x1, y1), Y(x1, y1, z1), S(x0, y1), Y(x0, y1, z1)], '#c9a24a');
      else poly([S(x1, y0), Y(x1, y0, z0), S(x1, y1), Y(x1, y1, z0), S(x1, y1), Y(x1, y1, z1), S(x1, y0), Y(x1, y0, z1)], '#c9a24a');
    }
  } else if (t === T.LWALL) { // v1.5 연구소 벽 (콘크리트 + 아래쪽 경고 띠 + 가끔 패널 불빛)
    const ht = tileHeight(tx, ty), S = Iso.sx, Y = Iso.sy;
    drawBox(x0, y0, x1, y1, ht, '#3c4048', '#23262c', '#2d3138', tileHeight(tx, ty + 1), tileHeight(tx + 1, ty), 0);
    if (tileHeight(tx, ty + 1) === 0) {
      poly([S(x0, y1), Y(x0, y1, 6), S(x1, y1), Y(x1, y1, 6), S(x1, y1), Y(x1, y1, 11), S(x0, y1), Y(x0, y1, 11)], tx % 2 ? '#8a7020' : '#1a1a1a');
      if (h < 0.1) poly([S(x0 + 10, y1), Y(x0 + 10, y1, 26), S(x0 + 18, y1), Y(x0 + 18, y1, 26), S(x0 + 18, y1), Y(x0 + 18, y1, 34), S(x0 + 10, y1), Y(x0 + 10, y1, 34)], Math.sin(G.time * 3 + tx) > 0 ? '#40ff70' : '#1a4a24');
    }
  } else if (t === T.LPROP) { // 실험 장비: 낮은 것 = 작업대, 높은 것 = 배양 탱크 (초록 빛)
    const ht = tileHeight(tx, ty);
    if (ht < 30) {
      drawBox(x0 + 3, y0 + 3, x1 - 3, y1 - 3, ht, '#6a727c', '#3a4048', '#4e555e', 0, 0, 0);
      ctx.fillStyle = h < 0.5 ? '#7ab8e8' : '#c84a3a'; ctx.fillRect(Iso.sx(x0 + 12, y0 + 12) - 3, Iso.sy(x0 + 12, y0 + 12, ht) - 4, 6, 3);
    } else {
      drawBox(x0 + 4, y0 + 4, x1 - 4, y1 - 4, 8, '#4a525c', '#2a2e34', '#363c44', 0, 0, 0);
      drawBox(x0 + 6, y0 + 6, x1 - 6, y1 - 6, ht, 'rgba(120,255,150,0.55)', 'rgba(60,170,90,0.55)', 'rgba(80,200,110,0.55)', 8, 8, 0);
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(Iso.sx(x0 + 16, y0 + 16), Iso.sy(x0 + 16, y0 + 16, 24), 80, 0.6, 'rgba(90,255,140,A)');
    }
  } else if (t === T.CAR && City.carSkip.has(ty * World.W + tx)) { /* 버스·경찰차는 소품으로 그림 */
  } else if (t === T.CAR) {
    const cols = [['#7b4a32', '#4b2a1a', '#5f3824'], ['#56626e', '#333b44', '#454f5a'], ['#6d6a44', '#43412a', '#575536'], ['#44566a', '#28323e', '#364556'], ['#8a8a86', '#555552', '#6e6e6a'], ['#6a2a2a', '#401818', '#552020']];
    const burnt = isBurningCar(tx, ty);
    const c = burnt ? ['#2a2624', '#171514', '#201d1b'] : cols[Math.floor(h * cols.length)];
    const vert = (tx % World.BLOCK) < World.ROADW, carKeys = ['car_a', 'car_b', 'car_c'].filter(k => propArt(k)); // v1.18 차량 그림
    const ck = burnt && propArt('car_burnt') ? 'car_burnt' : carKeys.length ? carKeys[Math.floor(h * 97) % carKeys.length] : null;
    if (ck) { drawShadow(Iso.sx(x0 + 16, y0 + 16), Iso.sy(x0 + 16, y0 + 16), 18); drawPropArt(ck, Iso.sx(x0 + 16, y0 + 16), Iso.sy(x0 + 16, y0 + 16), vert); }
    else drawCarShape(x0 + 16, y0 + 16, vert, c, h, { burnt });
  } else if (t === T.BARRICADE && propArt('sandbags')) { // v1.18 그림
    drawPropArt('sandbags', Iso.sx(x0 + 16, y0 + 16), Iso.sy(x0 + 16, y0 + 16), (tx + ty) % 2 === 0);
  } else if (t === T.BARRICADE) { // v1.10 모래주머니 3단 + 위에 철조망
    const S = Iso.sx, Y = Iso.sy;
    for (let r = 0; r < 3; r++) {
      const z0 = r * 7, z1 = z0 + 7, off = r % 2 ? 4 : 0, sh = r === 2 ? 2 : 0;
      drawBox(x0 + 1 + sh, y0 + 1 + sh, x1 - 1 - sh, y1 - 1 - sh, z1, r % 2 ? '#a08658' : '#958050', '#6a5434', '#7e6640', z0, z0, 0);
      ctx.strokeStyle = 'rgba(40,30,18,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); // 주머니 이음새
      for (let k = 8 + off; k < TILE; k += 12) { ctx.moveTo(S(x0 + k, y1 - 1 - sh), Y(x0 + k, y1 - 1 - sh, z0)); ctx.lineTo(S(x0 + k, y1 - 1 - sh), Y(x0 + k, y1 - 1 - sh, z1)); ctx.moveTo(S(x1 - 1 - sh, y0 + k), Y(x1 - 1 - sh, y0 + k, z0)); ctx.lineTo(S(x1 - 1 - sh, y0 + k), Y(x1 - 1 - sh, y0 + k, z1)); }
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(150,150,150,0.6)'; ctx.beginPath(); // 철조망
    for (let k = 0; k <= TILE; k += 4) { const px = S(x0 + k, y0 + 16), py = Y(x0 + k, y0 + 16, 24 + (k % 8 ? 3 : 0)); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    if (h < 0.15) { ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(S(x0 + 16, y0 + 16), Y(x0 + 16, y0 + 16, 21)); ctx.lineTo(S(x0 + 16, y0 + 16), Y(x0 + 16, y0 + 16, 34)); ctx.stroke(); ctx.lineWidth = 1; } // 말뚝
  }
  ctx.globalAlpha = 1;
}

// v1.11 버려진 차: 바퀴 · 떠 있는 차체 · 유리창 운전석 · 앞뒤 등 · 녹 · 깨진 유리. vert = 세로 차선(길이가 y 방향)
function drawCarShape(cx, cy, vert, c, h, o = {}) {
  const L = o.L || 13, Wd = o.W || 8, S = Iso.sx, Y = Iso.sy, k = o.k || 1; // k: 높이 배율 (v1.21 실제 스케일 승용차 1.45)
  const R = (a0, a1, b0, b1) => vert ? [cx + b0, cy + a0, cx + b1, cy + a1] : [cx + a0, cy + b0, cx + a1, cy + b1]; // a: 길이축, b: 폭축
  const front = h * 7 % 1 < 0.5 ? 1 : -1; // 앞쪽 방향
  drawShadow(S(cx, cy), Y(cx, cy), 15 * L / 13);
  for (const a of [-L + 3 * k, L - 6 * k]) for (const b of [-Wd, Wd - 3 * k]) { const r = R(a, a + 3 * k, b, b + 3 * k); drawBox(r[0], r[1], r[2], r[3], 5 * k, '#111', '#0a0a0a', '#0e0e0e', 0, 0, 0); } // 바퀴
  const body = R(-L, L, -Wd, Wd);
  drawBox(body[0], body[1], body[2], body[3], 11 * k, c[0], c[1], c[2], 3 * k, 3 * k, 0);
  // 운전석: 뒤쪽으로 치우친 짧은 상자, 옆면은 유리
  const ca = front > 0 ? [-L + 3 * k, L * 0.45] : [-L * 0.45, L - 3 * k], cab = R(ca[0], ca[1], -Wd + 1.5, Wd - 1.5);
  const glass = o.burnt ? '#0a0a0a' : '#1b2430', glassE = o.burnt ? '#0d0d0d' : '#24303e';
  drawBox(cab[0], cab[1], cab[2], cab[3], (o.tall ? 22 : 18) * k, o.roof || c[0], glass, glassE, 11 * k, 11 * k, 0);
  if (!o.burnt && h * 13 % 1 < 0.35) { // 깨진 앞유리
    ctx.strokeStyle = 'rgba(200,220,235,0.5)'; ctx.lineWidth = 1; const fx = S(cab[2], cab[3]), fy = Y(cab[2], cab[3], 15 * k);
    ctx.beginPath(); ctx.moveTo(fx - 4, fy - 2); ctx.lineTo(fx, fy); ctx.lineTo(fx - 2, fy + 3); ctx.moveTo(fx, fy); ctx.lineTo(fx + 3, fy - 3); ctx.stroke();
  }
  // 앞뒤 등 (화면에 보이는 남·동쪽 끝)
  const endFace = vert ? cy + L : cx + L, lit = front > 0 ? (o.burnt ? '#332' : '#e8dca0') : '#a02020';
  if (vert) { poly([S(cx - Wd + 1, endFace), Y(cx - Wd + 1, endFace, 7 * k), S(cx - Wd + 4, endFace), Y(cx - Wd + 4, endFace, 7 * k), S(cx - Wd + 4, endFace), Y(cx - Wd + 4, endFace, 9.5 * k), S(cx - Wd + 1, endFace), Y(cx - Wd + 1, endFace, 9.5 * k)], lit); poly([S(cx + Wd - 4, endFace), Y(cx + Wd - 4, endFace, 7 * k), S(cx + Wd - 1, endFace), Y(cx + Wd - 1, endFace, 7 * k), S(cx + Wd - 1, endFace), Y(cx + Wd - 1, endFace, 9.5 * k), S(cx + Wd - 4, endFace), Y(cx + Wd - 4, endFace, 9.5 * k)], lit); }
  else { poly([S(endFace, cy - Wd + 1), Y(endFace, cy - Wd + 1, 7 * k), S(endFace, cy - Wd + 4), Y(endFace, cy - Wd + 4, 7 * k), S(endFace, cy - Wd + 4), Y(endFace, cy - Wd + 4, 9.5 * k), S(endFace, cy - Wd + 1), Y(endFace, cy - Wd + 1, 9.5 * k)], lit); poly([S(endFace, cy + Wd - 4), Y(endFace, cy + Wd - 4, 7 * k), S(endFace, cy + Wd - 1), Y(endFace, cy + Wd - 1, 7 * k), S(endFace, cy + Wd - 1), Y(endFace, cy + Wd - 1, 9.5 * k), S(endFace, cy + Wd - 4), Y(endFace, cy + Wd - 4, 9.5 * k)], lit); }
  // 문 이음새 (옆면)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath();
  if (vert) { const x = cx + Wd; ctx.moveTo(S(x, cy), Y(x, cy, 4 * k)); ctx.lineTo(S(x, cy), Y(x, cy, 11 * k)); } else { const y = cy + Wd; ctx.moveTo(S(cx, y), Y(cx, y, 4 * k)); ctx.lineTo(S(cx, y), Y(cx, y, 11 * k)); }
  ctx.stroke();
  if (h * 31 % 1 < 0.4 || o.burnt) { ctx.fillStyle = o.burnt ? 'rgba(0,0,0,0.4)' : 'rgba(90,50,25,0.45)'; ctx.beginPath(); ctx.ellipse(S(cx, cy) + (h - 0.5) * 10, Y(cx, cy, 11 * k), 5 * k, 2.5 * k, 0, 0, TAU); ctx.fill(); } // 녹·그을음
}

// v1.10 무너진 건물: 한 칸을 2×2 조각으로 나눠 높이가 들쭉날쭉한 콘크리트 + 철근 + 꺾인 바닥판
function drawRuinTile(tx, ty, x0, y0, ht, b, h) {
  // v1.31.2 잔해 그림이 있으면: 회색 상자 대신 칸마다 잔해 더미 (흙 바닥 + 더미 하나 · 크기·방향 칸마다 다르게). 막히는 칸인 건 그대로
  const piles = ['rubble_a', 'rubble_b', 'slab', 'debris', 'rubble_a', 'rubble_b'].filter(propArt);
  if (piles.length) {
    const S = Iso.sx, Y = Iso.sy, k = hash2(tx * 7 + 1, ty * 13 + 5);
    poly([S(x0, y0), Y(x0, y0, 1), S(x0 + TILE, y0), Y(x0 + TILE, y0, 1), S(x0 + TILE, y0 + TILE), Y(x0 + TILE, y0 + TILE, 1), S(x0, y0 + TILE), Y(x0, y0 + TILE, 1)], `rgb(${b - 30},${b - 36},${b - 42})`);
    const key = piles[Math.floor(k * piles.length)], fit = ART.propFit[key] || { w: 60 };
    drawPropArt(key, S(x0 + 16, y0 + 16), Y(x0 + 16, y0 + 16), k > 0.5, (TILE * 2 * ISO_K * (1.0 + h * 0.35)) / fit.w);
    return;
  }
  const q = TILE / 2;
  const cols = (k) => { const c = b - 12 + Math.floor(k * 18); return [`rgb(${c},${c - 6},${c - 13})`, `rgb(${c - 38},${c - 42},${c - 48})`, `rgb(${c - 24},${c - 28},${c - 34})`]; };
  const nb = (dx, dy) => tileHeight(tx + dx, ty + dy);
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { // 뒤 → 앞 순서
    const k = hash2(tx * 4 + i * 17, ty * 4 + j * 29), hh = Math.max(6, ht * (0.35 + k * 0.75));
    const ax = x0 + i * q, ay = y0 + j * q, c = cols(k);
    const sz = j === 1 ? Math.min(hh, nb(0, 1)) : 0, ez = i === 1 ? Math.min(hh, nb(1, 0)) : 0;
    drawBox(ax, ay, ax + q, ay + q, hh, c[0], c[1], c[2], j === 1 ? (nb(0, 1) >= hh ? -1 : sz) : 0, i === 1 ? (nb(1, 0) >= hh ? -1 : ez) : 0, 0);
    if (k > 0.55) { // 부서진 창 구멍
      const S = Iso.sx, Y = Iso.sy, zz = hh * 0.45;
      if (j === 1) poly([S(ax + 4, ay + q), Y(ax + 4, ay + q, zz), S(ax + 11, ay + q), Y(ax + 11, ay + q, zz), S(ax + 11, ay + q), Y(ax + 11, ay + q, zz + 7), S(ax + 4, ay + q), Y(ax + 4, ay + q, zz + 7)], '#0d0e10');
    }
    if (k < 0.3) { // 철근
      ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let r = 0; r < 3; r++) { const px = ax + 3 + r * 5, py = ay + 5 + r * 3; ctx.moveTo(Iso.sx(px, py), Iso.sy(px, py, hh)); ctx.lineTo(Iso.sx(px + (r - 1) * 2, py), Iso.sy(px, py, hh + 7 + r * 3)); }
      ctx.stroke(); ctx.lineWidth = 1;
    }
  }
  if (h < 0.2) { // 기울어진 바닥판
    const S = Iso.sx, Y = Iso.sy, z = ht * 0.5;
    poly([S(x0 + 2, y0 + 6), Y(x0 + 2, y0 + 6, z), S(x0 + 30, y0 + 2), Y(x0 + 30, y0 + 2, z + 10), S(x0 + 30, y0 + 20), Y(x0 + 30, y0 + 20, z + 6), S(x0 + 2, y0 + 24), Y(x0 + 2, y0 + 24, z - 4)], '#5c5650');
  }
}

// v1.10 건물 1층: 길 쪽 벽 아래에 내려진 셔터(가끔) + 바닥 쪽 얼룩
function drawFacadeBase(tx, ty, x0, y0, x1, y1, sz, ez, h) {
  const S = Iso.sx, Y = Iso.sy;
  const face = (ax, ay, bx, by, z0, z1, c) => poly([S(ax, ay), Y(ax, ay, z0), S(bx, by), Y(bx, by, z0), S(bx, by), Y(bx, by, z1), S(ax, ay), Y(ax, ay, z1)], c);
  const shutter = hash2(tx * 3 + 1, ty * 5 + 7);
  if (sz === 0) {
    face(x0, y1, x1, y1, 0, 6, 'rgba(0,0,0,0.25)');
    if (shutter < 0.35) { face(x0 + 3, y1, x1 - 3, y1, 0, 22, shutter < 0.1 ? '#4a3e34' : '#5a5e64'); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); for (let z = 3; z < 22; z += 3) { ctx.moveTo(S(x0 + 3, y1), Y(x0 + 3, y1, z)); ctx.lineTo(S(x1 - 3, y1), Y(x1 - 3, y1, z)); } ctx.stroke(); }
  }
  if (ez === 0) {
    face(x1, y0, x1, y1, 0, 6, 'rgba(0,0,0,0.25)');
    if (shutter > 0.7) { face(x1, y0 + 3, x1, y1 - 3, 0, 22, '#565a60'); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); for (let z = 3; z < 22; z += 3) { ctx.moveTo(S(x1, y0 + 3), Y(x1, y0 + 3, z)); ctx.lineTo(S(x1, y1 - 3), Y(x1, y1 - 3, z)); } ctx.stroke(); }
  }
}

// v1.10 옥상: 가장자리 난간(턱) · 실외기 · 물탱크 · 얼룩 · 안테나
// v1.21 아파트 동 번호: 4층 넘는 건물의 동쪽 벽 위쪽에 '103동' 처럼 칠한 글씨
function drawDongNo(tx, ty, ht, ez, h) {
  if (ht < FLOOR_H * 4 || ez > ht - FLOOR_H * 2 || h < 0.3 || h > 0.36 || World.map === 'camp') return;
  if (World.tileAt(tx, ty - 1) !== T.BUILDING || World.height[(ty - 1) * World.W + tx] !== ht) return; // 넓은 벽에만
  ctx.save(); City.faceTransform(tx, ty, 'e', ht - 10);
  ctx.font = 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(235,232,220,0.75)'; ctx.fillText(`${101 + Math.floor(h * 1000) % 12}동`, TILE / 2, 0);
  ctx.fillStyle = 'rgba(80,120,170,0.55)'; ctx.fillRect(3, 14, TILE - 6, 2); // 단지 띠
  ctx.restore();
}

function drawRoof(tx, ty, x0, y0, x1, y1, ht, b, h, glass) {
  const S = Iso.sx, Y = Iso.sy, lip = 3, rim = glass ? '#5a6878' : `rgb(${b + 12},${b + 8},${b + 2})`, rimS = glass ? '#2a3440' : `rgb(${b - 30},${b - 33},${b - 38})`;
  const edge = (dx, dy) => tileHeight(tx + dx, ty + dy) < ht - 4;
  // 얼룩·이끼 (난간보다 먼저)
  if (h > 0.6 && h < 0.75) { ctx.fillStyle = h < 0.68 ? 'rgba(20,18,16,0.25)' : 'rgba(60,80,40,0.22)'; ctx.beginPath(); ctx.ellipse(S(x0 + 16, y0 + 16), Y(x0 + 16, y0 + 16, ht), 12, 6, 0, 0, TAU); ctx.fill(); }
  if (edge(0, -1)) drawBox(x0, y0, x1, y0 + lip, ht + 4, rim, rimS, rimS, ht, edge(1, 0) ? ht : -1, 0);
  if (edge(-1, 0)) drawBox(x0, y0, x0 + lip, y1, ht + 4, rim, rimS, rimS, -1, ht, 0);
  if (edge(0, 1)) drawBox(x0, y1 - lip, x1, y1, ht + 4, rim, rimS, rimS, ht, -1, 0);
  if (edge(1, 0)) drawBox(x1 - lip, y0, x1, y1, ht + 4, rim, rimS, rimS, -1, ht, 0);
  if (!glass && h > 0.42 && h < 0.428 && ht >= FLOOR_H * 3 && !edge(0, 1) && !edge(1, 0)) { // v1.21 옥상 교회 십자가 (빨간 네온)
    const cx = S(x0 + 16, y0 + 16), cy = Y(x0 + 16, y0 + 16, ht), K = ISO_K, top = cy - 70 * K, on = Math.sin(G.time * 1.3 + tx) > -0.9;
    if (propArt('cross')) drawPropArt('cross', cx, cy); // v1.22 그림 (빛은 코드)
    else {
      ctx.strokeStyle = '#3a3a40'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, top + 30 * K); ctx.stroke();
      ctx.fillStyle = on ? '#ff2a3a' : '#5a1a20'; ctx.fillRect(cx - 2, top, 4, 32 * K); ctx.fillRect(cx - 9 * K, top + 8 * K, 18 * K, 4);
      if (on) { ctx.fillStyle = 'rgba(255,200,200,0.8)'; ctx.fillRect(cx - 0.5, top + 1, 1, 32 * K - 2); }
    }
    if (on) { if (Settings.light && Light.list.length < LIGHT_CAP) addLight(cx, top + 14, 70, 0.6, 'rgba(255,40,60,A)'); }
    ctx.lineWidth = 1; return;
  }
  if (h < 0.055 && propArt(h < 0.04 ? 'acunit' : 'watertank')) drawPropArt(h < 0.04 ? 'acunit' : 'watertank', S(x0 + 16, y0 + 16), Y(x0 + 16, y0 + 16, ht)); // v1.18 그림
  else if (h > 0.985 && propArt('antenna')) drawPropArt('antenna', S(x0 + 16, y0 + 16), Y(x0 + 16, y0 + 16, ht));
  else if (h < 0.04) drawBox(x0 + 9, y0 + 9, x1 - 9, y1 - 9, ht + 8, '#4a4a4e', '#2e2e32', '#3a3a3e', ht, ht, 0); // 실외기
  else if (h < 0.055 && !glass) { // 물탱크 (원통)
    const cx = S(x0 + 16, y0 + 16), cy = Y(x0 + 16, y0 + 16, ht), r = 9, hh = 18 * ISO_K;
    ctx.fillStyle = '#3a6a8a'; ctx.fillRect(cx - r, cy - hh, r * 2, hh);
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r / 2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#5a8aaa'; ctx.beginPath(); ctx.ellipse(cx, cy - hh, r, r / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(cx + r * 0.3, cy - hh, r * 0.7, hh);
  } else if (h > 0.985) { // 안테나
    const ax = S(x0 + 16, y0 + 16), ay = Y(x0 + 16, y0 + 16, ht);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 30); ctx.moveTo(ax - 6, ay - 22); ctx.lineTo(ax + 6, ay - 22); ctx.moveTo(ax - 4, ay - 27); ctx.lineTo(ax + 4, ay - 27); ctx.stroke(); ctx.lineWidth = 1;
    if (Math.sin(G.time * 3 + tx) > 0.6) { ctx.fillStyle = '#ff3030'; ctx.fillRect(ax - 1.5, ay - 32, 3, 3); }
  }
}

// ---------------- 스프라이트 (js/assets.js 에 등록된 그림) ----------------
// v1.49 축소 캐시: 큰 원본(1024px 아틀라스)을 매 프레임 작게 줄여 그리던 것이 가장 무거웠음 → 화면에 그려질 크기로 한 번 줄여 두고 재사용
const Mip = {
  map: new Map(), n: 0, zoom: 0, px: 0, tmp: null,
  clear() { for (const c of this.map.values()) freeCanvas(c); this.map.clear(); this.px = 0; },
  draw(img, rx, ry, rw, rh, dx, dy, dw, dh) {
    const s = ZOOM * RES, tw = Math.max(1, Math.ceil(Math.abs(dw) * s / 4) * 4), th = Math.max(1, Math.ceil(Math.abs(dh) * s / 4) * 4);
    if (!Settings.mip || rw < tw * 1.5 || rh < th * 1.5) return ctx.drawImage(img, rx, ry, rw, rh, dx, dy, dw, dh); // 별로 안 줄이면 그대로
    if (this.zoom !== s) { this.clear(); this.zoom = s; }
    if (img._mid === undefined) img._mid = ++this.n;
    const key = `${img._mid}|${rx}|${ry}|${rw}|${rh}|${tw}|${th}`;
    let c = this.map.get(key);
    if (!c) {
      if (this.map.size > 2500 || this.px > CANVAS_BUDGET.mip) this.clear(); // v1.50.8 픽셀 예산
      c = document.createElement('canvas'); c.width = tw; c.height = th;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
      // 두 단계로 줄여 계단·흐림을 줄임
      if (rw > tw * 3) { const m = this.tmp || (this.tmp = document.createElement('canvas')); if (m.width < tw * 2 || m.height < th * 2) { m.width = Math.max(m.width, tw * 2); m.height = Math.max(m.height, th * 2); } const mg = m.getContext('2d'); mg.clearRect(0, 0, tw * 2, th * 2); mg.imageSmoothingQuality = 'high'; mg.drawImage(img, rx, ry, rw, rh, 0, 0, tw * 2, th * 2); g.drawImage(m, 0, 0, tw * 2, th * 2, 0, 0, tw, th); } // v1.50.8 중간 캔버스 하나를 돌려 씀
      else g.drawImage(img, rx, ry, rw, rh, 0, 0, tw, th);
      this.map.set(key, c); this.px += tw * th;
    }
    ctx.drawImage(c, 0, 0, tw, th, dx, dy, dw, dh);
  },
};

// v1.50.9 그림 주소: webp(약 1/8 크기)를 먼저, 못 읽으면 png · 버전을 붙여 업데이트 뒤 옛 그림이 남지 않게
function artURL(file, png) { const f = !png && /\.png$/.test(file) ? file.slice(0, -4) + '.webp' : file; return ART.dir + f + '?v=' + (typeof GAME_VERSION !== 'undefined' ? GAME_VERSION.replace(/^v/, '') : '0'); }
function loadArt(im, file, onFail) { im.onerror = () => { if (!im._png && /\.png$/.test(file)) { im._png = true; im.src = artURL(file, true); } else onFail(); }; im.src = artURL(file); }
const Sprites = {
  total: 0, done: 0, // v1.49 첫 로딩 진행
  load() {
    for (const s of [...Object.values(ART.sprites), ...Object.values(ART.landmarks)]) {
      const im = new Image(); s.ready = false; Sprites.total++; // 다시 읽을 때 이전 상태가 남지 않게
      im.onload = () => { (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => { s.ready = true; Sprites.done++; }); }; // v1.50.8 다 풀린 뒤에 씀 (폰에서 덜 풀린 그림이 비어 보이던 것)
      s.img = im; loadArt(im, s.file, () => { Sprites.done++; console.warn('에셋을 불러오지 못해 기본 그래픽을 사용합니다:', ART.dir + s.file); });
    }
  },
  loadAll() { // 무기·헬멧 그림까지 포함
    const cache = {}; // 한 파일에 여러 무기·헬멧(rect)이 들어 있으면 한 번만 읽음
    for (const s of [...Object.values(ART.weapons), ...Object.values(ART.helmets), ...Object.values(ART.props || {}), ...Object.values(ART.tex || {}), ...Object.values(ART.icons || {}), ...Object.values(ART.signs || {})]) { // v1.18 소품 · v1.19 건물 질감 · v1.35.1 아이콘 포함
      let im = cache[s.file];
      if (!im) {
        im = cache[s.file] = new Image(); im.users = []; Sprites.total++;
        im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => { Sprites.done++; im.users.forEach(u => { u.ready = true; }); if (typeof GroundCache !== 'undefined') GroundCache.clear(); }); // v1.25 바닥 질감이 늦게 읽혀도 다시 그림
        loadArt(im, s.file, () => { Sprites.done++; console.warn('무기·헬멧 그림을 불러오지 못해 기본 그래픽을 사용합니다:', ART.dir + s.file); });
      }
      im.users.push(s); s.img = im; s.ready = false;
    }
    this.load();
  },
  get(key) { const s = ART.sprites[key]; return s && s.ready ? s : null; },
  // 애니메이션 길이(초)
  dur(s, anim) { const a = s.anims[anim]; return a ? (a[2] ? a[2].length : a[1]) / (ART.fps[anim] || 8) : 0; },
  // 그리기. anim 이 없으면 idle 로 대체. t = 애니메이션 시작 후 경과(초). 성공 시 true
  // 이번에 그릴 프레임 (그리지 않고 계산만 — 무기를 몸보다 먼저 그릴 때 머리 위치가 필요)
  frame(key, anim, t, faceA) {
    const s = this.get(key);
    if (!s) return null;
    const d = typeof faceA === 'object' ? faceA : Iso.dir(faceA || 0); // v1.50.6 {x, y} 를 주면 그 방향으로 (좌우 깜빡임 막기)
    if (!s.anims[anim]) anim = s.anims.idle ? 'idle' : Object.keys(s.anims)[0];
    if (d.y < -0.35 && s.anims['back_' + anim]) anim = 'back_' + anim; // 등 돌린 그림이 있으면 사용
    const [row, n0, seq] = s.anims[anim], n = seq ? seq.length : n0, fps = ART.fps[anim.replace('back_', '')] || 8; // v1.49.5 seq = 칸 순서 (어색한 칸 빼기 · 거꾸로 그려진 줄 바로잡기)
    const once = /attack|hit|death/.test(anim);
    const fi = once ? Math.min(n - 1, Math.floor(t * fps)) : Math.floor(t * fps) % n, f = seq ? seq[fi] : fi;
    const sc = (ART.height[key] || ART.height[key.split('_')[0]] || 44) / (s.cell * ART.charFill) * (ART.charScale || 1); // v1.21 실제 스케일
    let hd = s.heads && s.heads[anim] && s.heads[anim][f];
    // v1.15 무기를 머리 위로 휘두르는 프레임은 가공 도구가 무기 끝을 머리로 잡기도 함 → 기본 자세 머리에서 8px 넘게 벗어나면 기본 자세 x
    if (hd && /attack|hit/.test(anim) && s.heads.idle) {
      if (s.headRefX === undefined) { const xs = s.heads.idle.map(h => h[0]).concat((s.heads.walk || []).map(h => h[0])).sort((a, b) => a - b); s.headRefX = xs[xs.length >> 1]; }
      if (Math.abs(hd[0] - s.headRefX) > 8) hd = [s.headRefX, hd[1]];
    }
    return { s, d, anim, row, f, sc, flip: d.x < 0, head: hd ? { x: hd[0], y: hd[1], w: s.headW || 20 } : null };
  },
  // v1.46 적 윤곽선: 그림 한 장마다 한 번만 만들어 둠 (붉은 테두리 · 원래 그림 자리는 비움)
  outline(s) {
    if (s.ol !== undefined) return s.ol;
    s.ol = null;
    try {
      const k = IS_TOUCH ? 0.5 : 1, W = Math.ceil(s.img.width * k), H = Math.ceil(s.img.height * k), c = document.createElement('canvas'); c.width = W; c.height = H; s.olK = k; // v1.50.8 폰은 절반 크기
      const g = c.getContext('2d'), t = 5 * k; g.scale(k, k);
      for (const [dx, dy] of [[t, 0], [-t, 0], [0, t], [0, -t], [t * 0.7, t * 0.7], [-t * 0.7, t * 0.7], [t * 0.7, -t * 0.7], [-t * 0.7, -t * 0.7]]) g.drawImage(s.img, dx, dy);
      g.globalCompositeOperation = 'source-in'; g.fillStyle = '#c8281c'; g.fillRect(0, 0, W / k, H / k);
      g.globalCompositeOperation = 'destination-out'; g.drawImage(s.img, 0, 0);
      s.ol = c;
    } catch (e) { /* 그림을 못 읽으면 윤곽 없이 */ }
    return s.ol;
  },
  draw(key, anim, t, sx, sy, faceA, flash, ol) {
    const fr = this.frame(key, anim, t, faceA);
    if (!fr) return false;
    const { s, d, row, f, sc } = fr;
    anim = fr.anim;
    const size = s.cell * sc, cw = s.w || s.cell; // w: 칸 가로 (없으면 정사각형)
    ctx.save();
    ctx.translate(sx, sy + ART.feetPad * sc);
    if (d.x < 0) ctx.scale(-1, 1); // 그림은 오른쪽을 보는 기준, 왼쪽은 좌우 반전
    if (ol && !flash) { const o = this.outline(s); if (o) { ctx.globalAlpha = ol; const ok = s.olK || 1; Mip.draw(o, f * cw * ok, row * s.cell * ok, cw * ok, s.cell * ok, -cw * sc / 2, -size, cw * sc, size); ctx.globalAlpha = 1; } } // v1.46 적 윤곽
    if (flash && 'filter' in ctx) ctx.filter = flash === 2 ? 'brightness(4) saturate(0.15)' : 'brightness(2.6)'; // v1.40 맞은 순간은 하얗게
    Mip.draw(s.img, f * cw, row * s.cell, cw, s.cell, -cw * sc / 2, -size, cw * sc, size);
    ctx.restore();
    // 머리 위치 (가공 도구가 기록한 프레임별 값, 발 기준 칸 좌표)
    return { anim, sc, flip: fr.flip, head: fr.head };
  },
};

// 엔티티 상태 → 애니메이션 (lastAtk: 마지막 공격 시각)
function animState(moving, hitT, lastAtk, key) {
  const s = Sprites.get(key);
  if (hitT > 0) return ['hit', 0.12 - hitT];
  if (s && lastAtk !== undefined && G.time - lastAtk < Math.max(0.15, Sprites.dur(s, 'attack'))) return ['attack', G.time - lastAtk];
  return moving ? ['walk', G.time] : ['idle', G.time];
}

// ---------------- 캐릭터 ----------------
// v1.49.2 총을 든 몸 그림 고르기: 총 전용(player_shotgun · player_vest_sniper …)이 있으면 그것 → 없으면 그룹(장총·권총…) → 없으면 null
// v1.50.2 위로 겨눌 때: 등 모습 몸 그림(player_back · player_vest_back …, 프롬프트 23)이 있으면 그 몸 + 총을 몸 뒤로 세워 붙임. 없으면 지금처럼 옆모습 (v1.50.1 맨손 몸 + 총 돌리기는 어색해서 뺌)
// 경계에서 깜빡이지 않게 들어갈 때 -0.8 · 나올 때 -0.68
function upAim(p) { const y = Iso.dir(p.aim).y; return (p.upAim = settle(p, 'upAim', p.upAim ? y < -0.6 : y < -0.8, 0.12)); } // v1.50.6 나올 때 -0.6
// v1.50.7 바뀐 상태가 t초 동안 이어져야 실제로 바꿈 (어떤 이유로든 매 프레임 왔다 갔다 하면 화면에서 깜빡이지 않게)
function settle(o, k, want, t) { const cur = o[k] === undefined ? want : o[k], sk = k + 'Since'; if (want === cur) { o[sk] = 0; return cur; } if (!o[sk]) o[sk] = G.time; if (G.time - o[sk] >= t) { o[sk] = 0; return want; } return cur; }
function heldBody(p, w, strict) {
  const arm = p.equip.armor, base = arm && Sprites.get('player_' + arm.key) ? 'player_' + arm.key : 'player', grp = ART.weaponGroup[w.key];
  if (Sprites.get(base + '_' + w.key)) return base + '_' + w.key;
  if (grp && Sprites.get(base + '_' + grp)) return base + '_' + grp;
  return strict ? null : base + '_' + grp;
}
function drawShadow(sx, sy, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.ellipse(sx, sy, r * ISO_K * 1.05, r * ISO_K * 0.55, 0, 0, TAU); ctx.fill();
}

// 서 있는 인물. o: {s 크기, body, skin, helmet, aim, gun(길이), blade(색), swing, flash, walk, claws}
function drawHuman(sx, sy, o) {
  const s = (o.s || 1) * (ART.charScale || 1), d = Iso.dir(o.aim || 0);
  const bob = o.walk ? Math.sin(o.walk * 12) * 1.2 * s : 0;
  const legA = o.walk ? Math.sin(o.walk * 12) * 2.5 * s : 0;
  const body = o.flash ? '#fff' : o.body, skin = o.flash ? '#fff' : o.skin;
  const back = d.y < -0.15; // 화면 위쪽을 볼 때 무기가 몸 뒤로
  const shY = sy - 22 * s + bob;
  const weapon = () => {
    if (o.gun) {
      ctx.strokeStyle = '#151515'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      const rc = -(o.recoil || 0); // 사격 반동으로 총이 뒤로 밀림
      ctx.beginPath(); ctx.moveTo(sx + d.x * (3 + rc) * s, shY + 2 * s + d.y * rc * s); ctx.lineTo(sx + d.x * (3 + rc + o.gun) * s, shY + 2 * s + d.y * (o.gun + rc) * s); ctx.stroke();
    }
    if (o.blade) {
      const dd = Iso.dir((o.aim || 0) + (o.swing || 0));
      ctx.strokeStyle = o.blade; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx + dd.x * 6 * s, shY); ctx.lineTo(sx + dd.x * 30 * s, shY + dd.y * 24 * s - 6 * s); ctx.stroke();
    }
    if (o.claws) {
      ctx.strokeStyle = skin; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx + side * 6 * s, shY + 2 * s);
        ctx.lineTo(sx + side * 6 * s + d.x * 14 * s, shY + 2 * s + d.y * 10 * s); ctx.stroke();
      }
    }
    // 손
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(sx + d.x * 8 * s, shY + 3 * s + d.y * 4 * s, 2.6 * s, 0, TAU); ctx.fill();
    ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  };
  // 다리
  ctx.fillStyle = o.flash ? '#fff' : (o.legs || '#2a2a2e');
  ctx.fillRect(sx - 5 * s, sy - 11 * s + legA, 4 * s, 11 * s - legA);
  ctx.fillRect(sx + 1 * s, sy - 11 * s - legA, 4 * s, 11 * s + legA);
  if (back) weapon();
  // 몸통
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - 7 * s, sy - 27 * s + bob, 14 * s, 17 * s, 4 * s) : ctx.rect(sx - 7 * s, sy - 27 * s + bob, 14 * s, 17 * s); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(sx + 1 * s, sy - 26 * s + bob, 6 * s, 15 * s);
  // 머리
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(sx, sy - 32 * s + bob, 5.5 * s, 0, TAU); ctx.fill();
  if (o.helmet) {
    ctx.fillStyle = o.flash ? '#fff' : o.helmet;
    ctx.beginPath(); ctx.arc(sx, sy - 33 * s + bob, 6.4 * s, Math.PI, TAU); ctx.fill();
    ctx.fillRect(sx - 6.4 * s, sy - 33.5 * s + bob, 12.8 * s, 1.5 * s); // 챙
  } else if (o.hair) {
    ctx.fillStyle = o.flash ? '#fff' : o.hair;
    ctx.beginPath(); ctx.arc(sx, sy - 33.5 * s + bob, 5.6 * s, Math.PI * 1.05, TAU * 0.98); ctx.fill();
  }
  if (o.eyes && !back) {
    ctx.fillStyle = o.eyes;
    ctx.fillRect(sx + d.x * 3 * s - 2.5 * s, sy - 33 * s + bob, 1.8 * s, 1.8 * s);
    ctx.fillRect(sx + d.x * 3 * s + 0.8 * s, sy - 33 * s + bob, 1.8 * s, 1.8 * s);
  }
  if (!back) weapon();
}

function nameTag(sx, y, text, color, font = '11px sans-serif', icon = null) {
  ctx.font = font; ctx.textAlign = 'center';
  if (icon) { const w = ctx.measureText(text).width; Icons.draw(icon, sx - w / 2 - 2, y - 4, 14); sx += 8; } // v1.5.1 캔버스 아이콘
  const small = (parseInt(ctx.font.match(/(\d+)px/)?.[1]) || 12) < 14; // v1.40.1 작은 글씨는 외곽선을 얇게 (두꺼우면 글자가 뭉개짐)
  ctx.lineJoin = 'round'; ctx.lineWidth = small ? 2 : 3; ctx.strokeStyle = 'rgba(12,11,8,0.85)'; ctx.strokeText(text, sx, y); ctx.lineWidth = 1; // v1.39 그림자 대신 외곽선
  ctx.fillStyle = color; ctx.fillText(text, sx, y);
}

function drawPlayer(p) {
  if (p.rollT > 0) { // v1.50.5 회피: 처음 버전처럼 잔상 그림자 + 반투명 (무적 표시) — v1.33 슬라이딩(그림을 눕힘)은 어색해서 되돌림
    ctx.globalAlpha = 0.25; drawShadow(Iso.sx(p.x - Math.cos(p.rollA) * 30, p.y - Math.sin(p.rollA) * 30), Iso.sy(p.x - Math.cos(p.rollA) * 30, p.y - Math.sin(p.rollA) * 30), p.r * 1.2);
    ctx.globalAlpha = 0.55;
  }
  drawPlayerBody(p);
  ctx.globalAlpha = 1;
}
function drawPlayerBody(p, ui = false) { // ui: 초상화·장비창용 (이름표·장전바 없이)
  const sx = Iso.sx(p.x, p.y), sy = Iso.sy(p.x, p.y);
  drawShadow(sx, sy, p.r);
  const w = curWeapon(), b = w ? WEAPONS[w.key] : null;
  const moving = !!moveInput(); // v1.37 바꾼 키도
  // 장비 외형: 방어구 → 옷 색, 헬멧 → 머리 장비 (그림이 없을 때의 코드 그래픽)
  const arm = p.equip.armor, hel = p.equip.helmet;
  const LOOK = { vest: ['#3e5f3a', '#2c3a2c'], tactical: ['#6b6447', '#3e3a2a'], military: ['#3d4a5c', '#262e3a'], exo: ['#7d848c', '#4a4f55'] };
  const look = arm ? LOOK[arm.key] : ['#5a5048', '#3a332c'];
  const HEL = { cap: '#3b4a32', tacHelmet: '#26292c', gasmask: '#4a5a3a', exoHelm: '#9aa2aa' };
  const o = { s: 1.05, body: look[0], skin: '#d9b48f', helmet: hel ? HEL[hel.key] : null, legs: look[1], aim: p.aim, flash: p.hurtT > 0, walk: moving ? G.time : 0,
    eyes: hel && hel.key === 'gasmask' ? '#7fff6a' : hel && hel.key === 'exoHelm' ? '#6cf' : null, hair: '#2a2420' };
  // 고강화(+7) 장비가 있으면 발밑에 빛
  const maxPlus = Math.max(0, ...['w1', 'w2', 'armor', 'helmet'].map(k => (p.equip[k] && p.equip[k].plus) || 0));
  if (maxPlus >= 7) {
    ctx.strokeStyle = `rgba(255,215,106,${0.35 + Math.sin(G.time * 4) * 0.15 + (maxPlus - 7) * 0.08})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 17, 8.5, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  }
  if (b && b.melee) {
    o.blade = w.key === 'katana' ? '#bfe6ff' : w.key === 'axe' ? '#b33' : '#999';
    o.swing = meleeSwing(p, w);
  } else if (b) {
    o.gun = wbase(w.key) === 'sniper' ? 30 : wbase(w.key) === 'pistol' ? 12 : wbase(w.key) === 'lmg' ? 26 : wbase(w.key) === 'shotgun' ? 22 : wbase(w.key) === 'smg' ? 15 : 20;
    if (p.recoilT > 0) o.recoil = (b.pellets || wbase(w.key) === 'sniper' ? 6 : 3) * p.recoilT / 0.07;
  }
  let [anim, at] = animState(moving, p.hurtT, p.lastAtk, w && ART.weaponGroup[w.key] ? heldBody(p, w) : 'player');
  const baseKey = arm && Sprites.get('player_' + arm.key) ? 'player_' + arm.key : 'player'; // 방어구별 몸 그림
  // v1.7.7 무기를 든 몸 그림 (예: player_long, player_vest_pistol) 이 있으면 그걸 쓰고 무기를 따로 붙이지 않음
  const grp = w ? ART.weaponGroup[w.key] : null, backKey = baseKey + '_back', useBack = !ui && !!(grp && grp !== 'blade' && grp !== 'heavy' && Sprites.get(backKey) && upAim(p)); // v1.50.5 초상화(ui)는 조준 상태를 건드리지 않음 — 0.4초마다 오른쪽 보는 초상화가 상태를 지워 깜빡이던 것
  if (!ui) p.backBody = useBack; const heldKey = grp && !useBack ? heldBody(p, w, true) : null; // v1.49.2 총마다 몸 그림 (없으면 장총 그룹) · v1.50.2 등 모습
  const bodyKey = useBack ? backKey : heldKey || baseKey;
  let sxb = sx; // 몸을 그릴 x (총 반동으로 살짝 밀림)
  if (heldKey && (grp === 'long' || grp === 'pistol')) {
    // v1.7.9 총을 든 몸: 사격 동작(고개가 크게 젖혀짐 · 연사 때 계속 재시작)은 쓰지 않고 조준 자세 그대로 몸만 뒤로 1~3px
    if (anim === 'attack') [anim, at] = moving ? ['walk', G.time] : ['idle', G.time];
    if (p.recoilT > 0) sxb = sx - (p.faceX || (Iso.dir(p.aim).x < 0 ? -1 : 1)) * (b.pellets || wbase(w.key) === 'sniper' ? 3 : 1.5) * p.recoilT / 0.07;
  }
  if (Sprites.get(bodyKey)) {
    // 몸 그림(무기·헬멧 없음) + 헬멧을 머리에, 무기를 손에 붙여 그림. 화면 위쪽을 보면 무기가 몸 뒤로
    // v1.7.5 무기는 이번 프레임의 머리 위치를 따라감 (걷기 흔들림·피격 젖힘과 함께 움직임) · 쓰러지는 중엔 손에서 놓음
    // v1.50.6 좌우 보는 방향에 여유: 거의 정면 위·아래를 겨누면 커서가 몸 가운데를 살짝만 넘어도 몸·총이 좌우로 뒤집혀 깜빡이던 것 (카메라가 따라 움직이는 동안 특히)
    const ad = Iso.dir(p.aim); if (!ui) p.faceX = settle(p, 'faceX', ad.x > 0.12 ? 1 : ad.x < -0.12 ? -1 : (p.faceX || 1), 0.08);
    const fx = ui ? (ad.x < 0 ? -1 : 1) : p.faceX, face = { x: fx * Math.max(0.01, Math.abs(ad.x)), y: ad.y };
    if (!ui) p.gunBack = settle(p, 'gunBack', p.gunBack ? ad.y < -0.05 : ad.y < -0.25, 0.1); // v1.50.6 총을 몸 뒤/앞에 그리는 기준에도 여유 (-0.15 한 줄이라 그 근처에서 앞뒤로 깜빡)
    const back = ui ? ad.y < -0.15 : p.gunBack, fr = Sprites.frame(bodyKey, anim, at, face), hold = w && !heldKey && !p.dead && fr.anim.indexOf('death') < 0;
    if (back && hold) drawWeaponOverlay(sx, sy, w, p, fr);
    const info = Sprites.draw(bodyKey, anim, at, sxb, sy, face, p.hurtT > 0);
    if (hel && info.anim.indexOf('death') < 0) drawHelmetOverlay(sxb, sy, info, hel, o.helmet);
    if (!back && hold) drawWeaponOverlay(sx, sy, w, p, info);
  } else drawHuman(sx, sy, o);
  if (p.buffs.adren > 0 || p.buffs.rapid > 0) {
    ctx.strokeStyle = p.buffs.adren > 0 ? 'rgba(255,120,40,0.7)' : 'rgba(120,255,220,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 20, 10, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  }
  if (!ui && (p.buffs.shield > 0 || p.invT > 0 || p.plate > 0)) { // v1.11 방어막 · 두 번째 숨 무적
    ctx.strokeStyle = `rgba(120,184,255,${0.45 + Math.sin(G.time * 10) * 0.2})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy - 22, 20, 30, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  }
  if (ui) return;
  if (World.map === 'camp') nameTag(sx, sy - 48 * (ART.charScale || 1) - 4, p.name, '#9fe08f', '12px sans-serif'); // v1.28 출격 중엔 내 이름표 없이
  if (p.reloadT > 0) {
    const b2 = WEAPONS[w.key];
    ctx.fillStyle = '#000'; ctx.fillRect(sx - 18, sy + 8, 36, 4);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(sx - 18, sy + 8, 36 * (1 - p.reloadT / (p.reloadMax || b2.reload)), 4);
  }
}

// HUD 초상화 · 장비창 인물 (v1.1): 플레이어를 작은 캔버스에 그림 (발 위치 footY, 배율 sc)
function drawPlayerInto(cv, sc, footY, aim = 0.6) {
  const cs0 = ART.charScale; ART.charScale = 1; try { drawPlayerIntoInner(cv, sc, footY, aim); } finally { ART.charScale = cs0; } // 초상화·장비창은 원래 크기
}
function drawPlayerIntoInner(cv, sc, footY, aim) {
  const g = cv.getContext('2d'), p = G.player, saved = ctx, cam = { x: G.cam.x, y: G.cam.y }, a0 = p.aim, k0 = input.keys;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
  ctx = g; g.setTransform(sc, 0, 0, sc, 0, 0);
  G.cam.x = (p.x - p.y) * ISO_K - cv.width / sc / 2; G.cam.y = (p.x + p.y) * ISO_K / 2 - footY / sc;
  p.aim = aim; input.keys = {};
  try { drawPlayerBody(p, true); } finally { ctx = saved; G.cam.x = cam.x; G.cam.y = cam.y; p.aim = a0; input.keys = k0; }
}

// 무기 아이콘 (옆모습): 무기 그림이 있으면 그 그림, 없으면 코드로 그린 실루엣
function drawWeaponIcon(cv, w) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  if (!w) return;
  const art = ART.weapons[w.key] || ART.weapons[wbase(w.key)];
  if (art && art.ready) {
    const [rx, ry, rw, rh] = art.rect || [0, 0, art.img.width, art.img.height], sc = Math.min(W * 0.9 / rw, H * 0.9 / rh);
    g.drawImage(art.img, rx, ry, rw, rh, (W - rw * sc) / 2, (H - rh * sc) / 2, rw * sc, rh * sc); return;
  }
  // 실루엣: [몸통 길이, 총열, 개머리, 탄창, 조준경, 손잡이] 비율
  const S = { pistol: [0.32, 0.12, 0, 0.18, 0, 1], smg: [0.45, 0.15, 0.12, 0.22, 0, 1], rifle: [0.5, 0.25, 0.2, 0.2, 0, 1], lmg: [0.55, 0.28, 0.2, 0.15, 0, 1],
    shotgun: [0.5, 0.32, 0.22, 0, 0, 1], sniper: [0.48, 0.38, 0.22, 0.12, 1, 1] }[wbase(w.key)];
  const cy = H * 0.42, col = RARITIES[w.rarity || 0].color, dark = '#5d636d', mid = '#8a919b';
  g.save(); g.shadowColor = col; g.shadowBlur = 6;
  if (!S) { // 근접: 손잡이 + 날/머리
    const L = W * 0.85, x0 = (W - L) / 2;
    g.fillStyle = w.key === 'katana' ? '#2a2a30' : '#5a3a22'; g.fillRect(x0, cy - 3, L * 0.35, 7);
    g.fillStyle = w.key === 'katana' ? '#bfe6ff' : w.key === 'axe' ? '#b33' : '#8a8a8a';
    if (w.key === 'axe') { g.fillRect(x0 + L * 0.35, cy - 3, L * 0.45, 6); g.beginPath(); g.moveTo(x0 + L * 0.72, cy - 22); g.lineTo(x0 + L * 0.95, cy - 18); g.lineTo(x0 + L * 0.95, cy + 20); g.lineTo(x0 + L * 0.72, cy + 14); g.fill(); }
    else g.fillRect(x0 + L * 0.35, cy - (w.key === 'katana' ? 3 : 4), L * 0.62, w.key === 'katana' ? 5 : 8);
    g.restore(); return;
  }
  const [body, barrel, stock, mag, scope] = S, L = W * 0.88, x0 = (W - L) / 2 + L * stock;
  g.fillStyle = dark; g.fillRect(x0, cy - 8, L * body, 14);                                   // 몸통
  g.fillStyle = mid; g.fillRect(x0 + L * body, cy - 5, L * barrel, 5);                         // 총열
  if (stock) { g.fillStyle = dark; g.beginPath(); g.moveTo(x0, cy - 6); g.lineTo(x0 - L * stock, cy - 2); g.lineTo(x0 - L * stock, cy + 12); g.lineTo(x0, cy + 6); g.fill(); }
  g.fillStyle = dark; g.fillRect(x0 + L * body * 0.18, cy + 6, 8, 14);                          // 손잡이
  if (mag) { g.fillStyle = mid; g.fillRect(x0 + L * body * 0.42, cy + 6, 10, H * mag); }        // 탄창
  if (scope) { g.fillStyle = '#111'; g.fillRect(x0 + L * body * 0.3, cy - 16, L * body * 0.45, 7); }
  if (wbase(w.key) === 'lmg') { g.fillStyle = '#5a5030'; g.fillRect(x0 + L * body * 0.35, cy + 6, 20, 14); } // 탄통
  g.restore();
}

// 몸 그림의 머리 위치에 헬멧 씌우기 (헬멧 그림이 없으면 코드로 그린 반구)
function drawHelmetOverlay(sx, sy, info, hel, color) {
  const sc = info.sc, hd = info.head || { x: 0, y: -(ART.height.player || 44) / sc, w: 20 };
  const hx = sx + hd.x * sc * (info.flip ? -1 : 1), hy = sy + hd.y * sc, hw = hd.w * sc * ART.helmetFit.w;
  const art = ART.helmets[hel.key];
  if (art && art.ready) {
    const [rx, ry, rw, rh] = art.rect || [0, 0, art.img.width, art.img.height];
    const h = rh * hw / rw;
    ctx.save(); ctx.translate(hx, hy - hw * ART.helmetFit.up); if (info.flip) ctx.scale(-1, 1);
    ctx.drawImage(art.img, rx, ry, rw, rh, -hw / 2, 0, hw, h);
    ctx.restore();
  } else {
    ctx.fillStyle = color || '#333';
    ctx.beginPath(); ctx.ellipse(hx, hy + hw * 0.32, hw / 2, hw * 0.42, 0, Math.PI, TAU); ctx.fill();
  }
}

// v1.19 건물 질감: 외벽은 층마다 반복 (1층은 상가), 옥상은 위에서 본 질감. 높이별로 외벽 한 줄을 미리 합쳐 캐시
const TexCache = { strips: new Map() };
// v1.31.1 상가(들어갈 수 있는 건물) 외벽: 가게 종류별 앞모습 그림(sf_…)이 있으면 1층, 위층은 지역 외벽 — 없으면 null (코드 그림)
function shopFront(i) {
  const bd = World.buildings[World.bid[i]], sa = bd && ART.shopArt[bd.name], fk = sa && sa.front;
  if (!fk || !ART.tex[fk] || !ART.tex[fk].ready) return null;
  const tx = i % World.W, ty = Math.floor(i / World.W), upper = facadeVariant(tx, ty, false, tileHeight(tx, ty)) || fk;
  const nd = bd.door ? Math.min(...bd.door.map(([dx, dy]) => Math.max(Math.abs(dx - tx), Math.abs(dy - ty)))) : 0;
  return { front: nd <= 2 ? fk : null, upper }; // v1.32 가게 앞모습은 문 양옆 2칸까지만 (건물 둘레 전체가 같은 진열창이던 것) — 나머지는 일반 1층
}
const LOW_ONLY = new Set(['f_vines', 'f_scaffold', 'f_motel', 'f_villa', 'f_burnt']); // v1.40.2 불탄 벽(구멍)도 낮은 건물에만 // v1.32 담쟁이·비계·모텔·빌라는 4층 이하에만 (고층 전체를 덮으면 인위적)
function facadeVariant(tx, ty, glass, ht = 0) {
  if (!ART.tex) return null;
  const ok = k => { const a = ART.tex[k]; return a && a.ready ? k : null; };
  if (glass) { const gl = ['f_glass', 'f_glass2'].filter(ok); if (gl.length) return gl[Math.floor(hash2(Math.floor(tx / World.BLOCK) * 5 + 1, Math.floor(ty / World.BLOCK) * 3 + 7) * gl.length)]; } // v1.31 유리 외벽 2종
  let list = (ART.texZones[World.zoneIndex(tx * TILE, ty * TILE)] || ART.texZones[1]).filter(ok);
  if (ht > FLOOR_H * 4.2) { const hi = list.filter(k => !LOW_ONLY.has(k)); if (hi.length) list = hi; }
  if (!list.length) return null;
  return list[Math.floor(hash2(Math.floor(tx / World.BLOCK) * 7 + 3, Math.floor(ty / World.BLOCK) * 11 + 5) * list.length)]; // 같은 블록은 같은 외벽
}
// v1.31.1 1층 상가 그림: 칸·면마다 다른 가게 (가게가 줄지어 있는 거리처럼). 유리 고층은 1층도 유리
function groundVariant(tx, ty, f, v) {
  if (v.startsWith('f_glass')) return null;
  if (!TexCache.gList || G.time - TexCache.gT > 2) { TexCache.gT = G.time; TexCache.gList = (ART.groundSet || ['f_shop']).filter(k => ART.tex[k] && ART.tex[k].ready); } // 2초마다만 다시 거름
  const list = TexCache.gList;
  if (!list.length) return null;
  const run = f === 's' ? [Math.floor(tx / 3), ty] : [tx, Math.floor(ty / 3)]; // v1.32 가게 하나 = 3칸 (칸마다 다른 가게면 벽지처럼 보임)
  return list[Math.floor(hash2(run[0] * 13 + (f === 's' ? 1 : 7), run[1] * 7 + 3) * list.length)];
}
function facadeStrip(v, ht, gk) {
  const key = v + '|' + ht + '|' + gk;
  let c = TexCache.strips.get(key);
  if (c) return c;
  const a = ART.tex[v], shop = gk && ART.tex[gk] && ART.tex[gk].ready ? ART.tex[gk] : null; // v1.31.1 1층 = 고른 상가 그림
  const PX = 2, W = TILE * PX, FH = FLOOR_H * PX, H = Math.ceil(ht * PX); // 월드 1 = 2px
  c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const seed = hash2(v.length * 7 + (v.charCodeAt(2) || 0), v.charCodeAt(v.length - 1) || 1);
  for (let f = 0, y = H - FH; y > -FH; f++, y -= FH) { // 아래층부터
    const src = f === 0 && shop ? shop : a, [rx, ry, rw, rh] = src.rect || [0, 0, src.img.width, src.img.height];
    const flip = f > 0 && hash2(f * 3 + 1, Math.floor(seed * 97)) < 0.5; // v1.32 층마다 좌우 뒤집기 → 같은 얼룩이 위아래로 반복되지 않게
    if (flip) { g.save(); g.translate(W, 0); g.scale(-1, 1); }
    g.drawImage(src.img, rx, ry, rw, rh, 0, y, W, FH);
    if (flip) g.restore();
    const j = hash2(f * 5 + 2, Math.floor(seed * 53)); // 층마다 밝기 조금씩
    g.fillStyle = j < 0.5 ? `rgba(0,0,0,${(0.5 - j) * 0.16})` : `rgba(255,240,220,${(j - 0.5) * 0.06})`; g.fillRect(0, y, W, FH);
    if (f > 0) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + FH - 3, W, 3); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y + FH - 5, W, 2); } // 층 사이 슬래브 선
  }
  g.globalCompositeOperation = 'saturation'; g.fillStyle = 'rgba(128,128,128,0.28)'; g.fillRect(0, 0, W, H); // 채도 ↓ (밤 거리와 어울리게)
  g.globalCompositeOperation = 'source-over';
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,14,8,0.22)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); // 아래로 갈수록 때
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, W, 4); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(0, 4, W, 2); // 옥상 난간 턱
  TexCache.strips.set(key, c);
  if (TexCache.strips.size > 240) TexCache.strips.delete(TexCache.strips.keys().next().value); // v1.31.1 1층 변형만큼 넉넉히
  return c;
}
function drawTexBuilding(tx, ty, x0, y0, x1, y1, ht, sz, ez, v, shade, front) {
  const PX = 2, dk = 0.12 - shade * 0.1; // 건물마다 밝기 조금 다르게
  const mir = hash2(Math.floor(tx / World.BLOCK) * 3 + 11, Math.floor(ty / World.BLOCK) * 5 + 2) < 0.5; // v1.31.1 블록 절반은 외벽을 좌우로 뒤집어 같은 그림도 달라 보이게
  const face = (f, zb) => {
    if (zb < 0 || zb >= ht) return;
    const strip = facadeStrip(v, ht, front || groundVariant(tx, ty, f, v)); // v1.31.1 front = 들어갈 수 있는 상가의 가게 앞모습
    const alt = mir !== (((f === 's' ? tx : ty) & 1) === 1); // v1.32 칸마다 번갈아 뒤집기 → 이웃 칸과 가장자리가 이어짐 (칸마다 보이던 이음매)
    ctx.save(); City.faceTransform(tx, ty, f, ht); if (alt) { ctx.translate(TILE, 0); ctx.scale(-1, 1); }
    const off = 0;
    ctx.drawImage(strip, (off * PX) % strip.width, 0, strip.width - (off * PX) % strip.width, (ht - zb) * PX, 0, 0, TILE - off % TILE, ht - zb);
    if (off) ctx.drawImage(strip, 0, 0, (off * PX) % strip.width, (ht - zb) * PX, TILE - off, 0, off, ht - zb);
    ctx.fillStyle = `rgba(0,0,0,${(f === 's' ? 0.32 : 0.14) + dk})`; ctx.fillRect(0, 0, TILE, ht - zb); // 면마다 명암
    ctx.restore();
  };
  face('s', sz); face('e', ez);
  // 옥상
  const roofs = ['r_concrete', 'r_gravel', 'r_tar'].filter(k => ART.tex[k] && ART.tex[k].ready);
  if (roofs.length) {
    const r = ART.tex[roofs[Math.floor(hash2(Math.floor(tx / World.BLOCK) * 5 + 1, Math.floor(ty / World.BLOCK) * 3 + 7) * roofs.length)]];
    const [rx, ry, rw, rh] = r.rect || [0, 0, r.img.width, r.img.height], q = 4, z = ZOOM * RES; // 질감 하나를 4×4칸에 걸쳐 펼침
    ctx.save(); ctx.setTransform(ISO_K * z, ISO_K / 2 * z, -ISO_K * z, ISO_K / 2 * z, -G.cam.x * z, (-G.cam.y - ht * ISO_K) * z);
    ctx.drawImage(r.img, rx + (((tx % q) + q) % q) * rw / q, ry + (((ty % q) + q) % q) * rh / q, rw / q, rh / q, x0, y0, TILE + 0.5, TILE + 0.5);
    ctx.fillStyle = `rgba(0,0,0,${0.05 + dk})`; ctx.fillRect(x0, y0, TILE + 0.5, TILE + 0.5);
    ctx.restore();
  } else {
    const b = 72 + Math.floor(shade * 38);
    poly([Iso.sx(x0, y0), Iso.sy(x0, y0, ht), Iso.sx(x1, y0), Iso.sy(x1, y0, ht), Iso.sx(x1, y1), Iso.sy(x1, y1, ht), Iso.sx(x0, y1), Iso.sy(x0, y1, ht)], `rgb(${b},${b - 3},${b - 8})`);
  }
}

// v1.18 소품 그림: 등록돼 있고 읽혔으면 바닥 점 (sx, sy) 위에 그리고 true. flip = 좌우 반전, k = 크기 배율
function propArt(key) { const a = ART.props && ART.props[key]; return a && a.ready ? a : null; }
function drawPropArt(key, sx, sy, flip = false, k = 1) {
  const a = propArt(key); if (!a) return false;
  const [rx, ry, rw, rh] = a.rect || [0, 0, a.img.width, a.img.height], fit = ART.propFit[key] || { w: 40, y: 4 };
  const w = fit.w * k, h = rh * w / rw;
  ctx.save(); ctx.translate(sx, sy + fit.y * k); if (flip !== !!a.mirror) ctx.scale(-1, 1); // v1.31 mirror: 반대 방향으로 그려진 그림
  Mip.draw(a.img, rx, ry, rw, rh, -w * (a.ax ?? 0.5), -h, w, h); // v1.49 축소 캐시 · ax = 바닥 점이 그림 가로 어디인지 (기본 가운데)
  ctx.restore();
  return true;
}

// v1.17 맞은 방향: 화면 가장자리 쪽 붉은 부채꼴 (0.9초)
function drawHitDirs(psx, psy) {
  const p = G.player;
  G.hitDirs = (G.hitDirs || []).filter(h => G.time - h.t < 0.9);
  for (const h of G.hitDirs) {
    const dx = Iso.sx(h.x, h.y) - psx, dy = Iso.sy(h.x, h.y) - psy;
    if (Math.abs(dx) < VW * 0.38 && Math.abs(dy) < VH * 0.38) continue; // 화면 안에서 보이는 적이면 표시 안 함
    const a = Math.atan2(dy, dx), k = 1 - (G.time - h.t) / 0.9, r = Math.min(VW, VH) * 0.42;
    ctx.save(); ctx.translate(psx, psy - 20); ctx.rotate(a);
    ctx.fillStyle = `rgba(255,50,40,${0.55 * k})`;
    ctx.beginPath(); ctx.moveTo(r + 26, 0); ctx.lineTo(r, -16); ctx.lineTo(r + 6, 0); ctx.lineTo(r, 16); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// v1.9 근접 휘두르기 각도 (2타는 반대로, 3타 회전 베기는 한 바퀴, 찌르기는 거의 정면)
function meleeSwing(p, w) {
  if (!(p.swingT > 0)) return -0.5;
  const k = p.swingT / (p.swingMax || 0.18), arc = Math.min(p.swingArc || meleeReach(w).arc, Math.PI * 2);
  if (p.swingFin === 'katana') return 0;
  return (k - 0.5) * arc * (p.swingDir || 1);
}

// 플레이어 손에 무기 그리기 (무기 그림이 있으면 그림, 없으면 코드로 그린 총·칼)
function drawWeaponOverlay(sx, sy, w, p, fr) {
  const b = WEAPONS[w.key], len = (ART.weaponLen[w.key] || 26) * (ART.charScale || 1);
  const swing = b.melee ? meleeSwing(p, w) : 0;
  const d = Iso.dir(p.aim + swing);
  let ang = Math.atan2(d.y, d.x);
  const bk = !b.melee && p.backBody; // v1.50.3 등 모습: 총을 조준 방향 그대로 (세워도 어색하지 않음)
  if (!b.melee && !bk) { // v1.7.5 총은 수평에 가깝게: 몸 그림은 좌우만 보므로 거의 수직으로 세우면 몸과 따로 놀아 보임 (총알 방향은 그대로)
    const right = Math.cos(ang) >= 0, rel = right ? ang : Math.atan2(d.y, -d.x), r2 = clamp(rel * 0.75, -0.96, 0.96);
    ang = right ? r2 : Math.PI - r2; d.x = Math.cos(ang); d.y = Math.sin(ang);
  }
  const rc = !b.melee && p.recoilT > 0 ? (b.pellets || wbase(w.key) === 'sniper' ? 6 : 3) * p.recoilT / 0.07 : 0; // 반동
  const H = ART.height.player || 44, fw = H * (ART.handX ?? 0.1);
  // 손(가슴) 위치: 몸 그림의 이번 프레임 머리 위치 기준 (없으면 예전처럼 키 비율)
  let cx = sx, cy = sy - H * ART.handY;
  if (fr && fr.head) {
    const hf = ART.handFromHead;
    cx = sx + fr.head.x * fr.sc * (fr.flip ? -1 : 1) + (fr.flip ? -1 : 1) * H * hf.x;
    cy = sy + fr.head.y * fr.sc + H * hf.y;
    if (bk) { cx = sx + fr.head.x * fr.sc * (fr.flip ? -1 : 1) + (fr.flip ? -1 : 1) * H * 0.1; cy = sy + fr.head.y * fr.sc + H * 0.26; } // 등 모습: 오른쪽 어깨 (개머리판을 어깨에 대고 총구는 화면 위 = 멀어지는 쪽)
  }
  const hx = cx + d.x * (fw - rc), hy = cy + d.y * (fw * 0.5 - rc);
  const art = ART.weapons[w.key] || ART.weapons[wbase(w.key)];
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  if (bk) ctx.scale(0.7, 1); // 등 모습: 카메라에서 멀어지는 쪽이라 짧아 보이게
  if ((p.faceX ? p.faceX < 0 : Math.cos(ang) < 0) && !b.melee || b.melee && Math.cos(ang) < 0) ctx.scale(1, -1); // 왼쪽을 겨눌 때 무기가 뒤집혀 보이지 않게 · v1.50.6 몸과 같은 좌우 기준
  if (art && art.ready) {
    const [rx, ry, rw, rh] = art.rect || [0, 0, art.img.width, art.img.height]; // rect: 한 장 안의 위치
    const sc = len / rw, grip = art.grip ?? ART.weaponGrip[w.key] ?? 0.3, h = rh * sc * (ART.weaponThickArt ?? 1); // v1.7.6 그림은 원래 두께 그대로 (과장은 코드 총용)
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 2; // 어두운 테두리로 몸·바닥과 구분
    ctx.drawImage(art.img, rx, ry, rw, rh, -rw * sc * grip, -h / 2, rw * sc, h);
  } else {
    ctx.lineCap = 'round';
    if (b.melee) { ctx.strokeStyle = w.key === 'katana' ? '#bfe6ff' : w.key === 'axe' ? '#b33' : '#999'; ctx.lineWidth = 3; }
    else { ctx.strokeStyle = '#151515'; ctx.lineWidth = 4; }
    ctx.beginPath(); ctx.moveTo(-len * 0.2, 0); ctx.lineTo(len * 0.8, 0); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  }
  ctx.restore();
}

// v1.6 은신 변이체: 가까이(150px) 오거나, 맞았거나(2.5초), 공격 준비·경직 중이면 보임
function enemyCloaked(e) {
  return !armorLegend('nightVision') && e.def.cloak && !e.bossName && !e.elite && !e.affix && !(e.revealT > 0) && e.stunT <= 0 && !(e.pounceT > 0) && !(e.leapT > 0) && !(e.windT > 0)
    && dist(e, G.player) > 150;
}
// v1.32 맞은 반응: 휘청(맞은 쪽 반대로 기울었다 돌아옴) · 넘어짐(쓰러졌다가 일어남)
// v1.46 적 표시: 발밑 붉은 고리(쫓아올 때 진하게) + 작은 빛 (어두운 곳·어지러운 바닥에서도 보이게)
function enemyMark(e, sx, sy, k, hz) {
  if (Settings.outline === false) return;
  const ch = e.state === 'chase', rx = e.r * 1.25 / k, ry = e.r * 0.62 / k;
  ctx.strokeStyle = ch ? 'rgba(235,60,40,0.75)' : 'rgba(220,70,50,0.38)'; ctx.lineWidth = ch ? 2 : 1.4;
  ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  if (Light.list.length < 90) addLight(sx, sy - 14 - (hz || 0), 52, ch ? 0.5 : 0.35);
}
function drawEnemy(e) {
  const down = e.downT > 0 ? e.downT : 0, fl = e.flinchT > 0 ? e.flinchT / 0.16 : 0;
  if (e.joltT > 0) { e.joltT -= 1 / 60; } // v1.40 맞으면 그림이 맞은 쪽으로 툭 밀렸다 돌아옴
  if (e.joltT > 0 && !down && !e.nest) { const d = Iso.dir(e.joltA || 0), k = (e.joltT / 0.09) * (e.joltK || 3); ctx.save(); ctx.translate(d.x * k, d.y * k * 0.6); try { drawEnemyInner(e, down, fl); } finally { ctx.restore(); } return; }
  drawEnemyInner(e, down, fl);
}
function drawEnemyInner(e, down, fl) {
  if ((!down && !fl) || e.nest) return drawEnemyBody(e);
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y), dir = Iso.dir(e.flinchA || 0), sg = dir.x >= 0 ? 1 : -1;
  let rot, ox = 0;
  // v1.49.6 크게 맞으면: 서 있는 그림을 77° 눕히던 것(뻣뻣하게 뒤로 드러눕는 것처럼 보임) → 뒤로 크게 휘청 + 머리 위 별 (경직 1초는 그대로)
  if (down) { const t = 1.05 - down, env = t < 0.1 ? t / 0.1 : down < 0.3 ? down / 0.3 : 1; rot = sg * 0.16 * env; ox = dir.x * 8 * env; }
  else { rot = sg * 0.22 * fl; ox = dir.x * 3 * fl; }
  ctx.save(); ctx.translate(sx + ox, sy); ctx.rotate(rot); ctx.translate(-sx, -sy);
  e._noTags = true; try { drawEnemyBody(e); } finally { ctx.restore(); e._noTags = false; }
  const topY = e._topY ?? sy - 44;
  if (down && !enemyCloaked(e)) for (let i = 0; i < 3; i++) { const a = G.time * 6 + i * TAU / 3; ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(sx + ox + Math.cos(a) * 9, topY + 2 + Math.sin(a) * 3, 1.8, 0, TAU); ctx.fill(); }
  if (!enemyCloaked(e)) drawEnemyTags(e, sx, sy, topY);
}
function drawEnemyBody(e) {
  if (e.nest) return drawNest(e); // v1.10
  const sx = Iso.sx(e.x, e.y) + (e.stunT > 0 && !(e.downT > 0) ? Math.sin(G.time * 70) * 2 : 0), sy = Iso.sy(e.x, e.y); // 경직 중 흔들림
  if (sx < -120 || sy < -160 || sx > VW + 120 || sy > VH + 80) return;
  const flash = e.hitT > 0, f = e.face || 0;
  const walk = e.state === 'chase' || e.wandering ? G.time + e.x * 0.01 : 0;
  if (enemyCloaked(e)) { // v1.6 은신: 공기가 일렁이는 윤곽 + 희미한 눈빛만
    const wob = Math.sin(G.time * 9 + e.x) * 2;
    ctx.strokeStyle = 'rgba(210,170,255,0.28)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(sx + wob * 0.5, sy - 22, 8 + wob, 21, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = `rgba(230,80,255,${0.35 + Math.sin(G.time * 5 + e.y) * 0.2})`; ctx.fillRect(sx - 4, sy - 38, 2, 2); ctx.fillRect(sx + 2, sy - 38, 2, 2);
    return;
  }
  let topY = sy - 44;
  if (e.affix) { // 엘리트 오라
    const c = ELITE_AFFIXES[e.affix].color;
    ctx.strokeStyle = c; ctx.globalAlpha = 0.55 + Math.sin(G.time * 5 + e.x) * 0.25; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(sx, sy, e.r * 1.5, e.r * 0.75, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    if (e.affix === 'commander') { ctx.strokeStyle = 'rgba(255,215,106,0.18)'; ctx.beginPath(); ctx.ellipse(sx, sy, 230 * ISO_K, 115 * ISO_K, 0, 0, TAU); ctx.stroke(); }
  }
  // 보스 전용 그림(e.art)이 있으면 그 그림을 제 크기로, 없으면 기본 적 그림을 e.scale 배로
  const ak = e.art && Sprites.get(e.art) ? e.art : e.type;
  const k = ak === e.type ? e.scale || 1 : 1; // 네임드·엘리트: 크게
  if (k !== 1) { ctx.save(); ctx.translate(sx, sy); ctx.scale(k, k); ctx.translate(-sx, -sy); }
  if (Sprites.get(ak)) {
    const hz = e.def.flying ? (34 + Math.sin(G.time * 5 + e.x) * 4) * ISO_K : 0;
    drawShadow(sx, sy, e.r * (e.def.flying ? 0.8 : 1) / k);
    enemyMark(e, sx, sy, k, hz);
    if (e.def.boss) { ctx.fillStyle = 'rgba(80,255,90,0.16)'; ctx.beginPath(); ctx.ellipse(sx, sy, e.r * 1.7, e.r * 0.85, 0, 0, TAU); ctx.fill(); }
    const [anim, at] = animState(walk !== 0 && e.stunT <= 0, e.stunT > 0 ? Math.min(0.1, e.stunT) : e.hitT, e.lastAtk, ak);
    Sprites.draw(ak, anim, at, sx, sy - hz, f, e.flashT > 0 ? 2 : flash, Settings.outline !== false && !e.minion ? (e.state === 'chase' ? 0.95 : 0.7) : 0); if (e.flashT > 0) e.flashT -= 1 / 60;
    topY = sy - hz - (ART.height[ak] || 44) * (ART.charScale || 1) - 6;
  } else switch (e.type) {
    case 'zombie':
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy + 1, { s: 1, body: '#4f5e3a', skin: '#7f9a5c', legs: '#3b3328', aim: f, claws: true, flash, walk: walk * 0.6, eyes: '#e33' });
      break;
    case 'raider':
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy, { s: 1, body: '#7a3a2a', skin: '#c49a78', helmet: '#a82020', legs: '#2c2620', aim: f, gun: 20, flash, walk });
      break;
    case 'brute':
      drawShadow(sx, sy, e.r);
      if (e.elite === 'babel') drawHuman(sx, sy, { s: 1.7, body: '#2a1a3a', skin: '#7a4a9a', legs: '#1a0e24', aim: f, claws: true, flash, walk: walk * 0.5, eyes: '#ff50ff' }); // v1.6 바벨
      else if (e.labBoss) drawHuman(sx, sy, { s: 1.7, body: '#7a2a2a', skin: '#d8c0b0', legs: '#3a1a1a', aim: f, claws: true, flash, walk: walk * 0.5, eyes: '#40ff70' }); // 키메라: 벗겨진 피부 · 초록 눈
      else drawHuman(sx, sy, { s: 1.7, body: '#6a4578', skin: '#9a72a8', legs: '#3a2840', aim: f, claws: true, flash, walk: walk * 0.5, eyes: '#ff0' });
      topY = sy - 70;
      break;
    case 'dog': {
      drawShadow(sx, sy, e.r);
      const d = Iso.dir(f), ang = Math.atan2(d.y, d.x), leg = walk ? Math.sin(walk * 18) * 3 : 0;
      ctx.save(); ctx.translate(sx, sy - 11); ctx.rotate(ang * 0.35);
      ctx.fillStyle = flash ? '#fff' : '#5a3a26';
      ctx.fillRect(-9, 4, 3, 7 + leg); ctx.fillRect(6, 4, 3, 7 - leg);
      ctx.restore();
      ctx.fillStyle = flash ? '#fff' : e.def.color;
      ctx.beginPath(); ctx.ellipse(sx, sy - 12, 14, 7, ang * 0.35, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + d.x * 14, sy - 16 + d.y * 6, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff4'; ctx.fillRect(sx + d.x * 17 - 1, sy - 18 + d.y * 6, 2, 2);
      topY = sy - 28;
      break;
    }
    case 'drone': {
      const hz = 34 + Math.sin(G.time * 5 + e.x) * 4;
      drawShadow(sx, sy, e.r * 0.8);
      const y = sy - hz * ISO_K;
      ctx.fillStyle = flash ? '#fff' : '#6d7f92'; ctx.fillRect(sx - 9, y - 5, 18, 10);
      ctx.fillStyle = flash ? '#fff' : e.def.color; ctx.fillRect(sx - 9, y - 9, 18, 5);
      ctx.fillStyle = 'rgba(200,220,240,0.45)';
      for (const ox of [-13, 13]) { ctx.beginPath(); ctx.ellipse(sx + ox, y - 10, 9, 3, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = e.state === 'chase' ? '#f33' : '#3f3'; ctx.beginPath(); ctx.arc(sx, y + 1, 2.5, 0, TAU); ctx.fill();
      topY = y - 18;
      break;
    }
    case 'merc': // v1.6 블랙선 용병: 검은 전술복 · 노란 견장 · 소총
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy, { s: 1.05, body: '#24272e', skin: '#b08a6a', helmet: '#1a1c20', legs: '#1c1e22', aim: f, gun: 24, flash, walk });
      ctx.fillStyle = '#d4a640'; ctx.fillRect(sx - 9, sy - 34, 4, 3);
      break;
    case 'shield': { // v1.6 방패 돌격병: 몸 앞에 큰 방패 (방패가 향한 쪽 = 정면)
      drawShadow(sx, sy, e.r);
      const d = Iso.dir(f), front = d.y > -0.2; // 방패가 화면 앞쪽이면 몸 위에 그림
      const shieldDraw = () => {
        const cx = sx + d.x * 14, cy = sy - 20 + d.y * 7, w = 13, perpX = -d.y, perpY = d.x * 0.5;
        poly([cx - perpX * w, cy - perpY * w - 16, cx + perpX * w, cy + perpY * w - 16, cx + perpX * w, cy + perpY * w + 14, cx - perpX * w, cy - perpY * w + 14], flash ? '#fff' : e.stunT > 0 ? '#6a6e74' : '#4a5260');
        ctx.strokeStyle = '#c9a24a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - perpX * w * 0.7, cy - perpY * w * 0.7 - 6); ctx.lineTo(cx + perpX * w * 0.7, cy + perpY * w * 0.7 - 6); ctx.stroke(); ctx.lineWidth = 1;
      };
      if (!front) shieldDraw();
      drawHuman(sx, sy, { s: 1.12, body: '#3a3e46', skin: '#b08a6a', helmet: '#24272e', legs: '#24272e', aim: f, flash, walk: walk * 0.6 });
      if (front) shieldDraw();
      topY = sy - 54;
      break;
    }
    case 'stalker': // v1.6 은신 변이체: 가늘고 긴 팔다리, 보라빛 피부
      drawShadow(sx, sy, e.r * 0.8);
      drawHuman(sx, sy + 2, { s: 1.08, body: '#3a2a4a', skin: '#6a5a7a', legs: '#2a1e34', aim: f, claws: true, flash, walk: walk * 1.1, eyes: '#e050ff' });
      break;
    case 'subject': // v1.5 탈주 실험체: 창백한 피부, 구속복 조각, 긴 발톱
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy + 2, { s: 1.02, body: '#d8d4c8', skin: '#c8b8b0', legs: '#4a4644', aim: f, claws: true, flash, walk: walk * 0.9, eyes: '#ff3030' });
      break;
    case 'spitter': { // 산성 실험체: 부푼 초록 몸, 목에 빛나는 주머니
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy, { s: 1.15, body: '#5a7a34', skin: '#8fd14a', legs: '#33421e', aim: f, flash, walk: walk * 0.5, eyes: '#eaff5a' });
      const gl = 0.6 + Math.sin(G.time * 5 + e.x) * 0.3;
      ctx.fillStyle = `rgba(160,255,80,${gl})`; ctx.beginPath(); ctx.arc(sx, sy - 34, 5, 0, TAU); ctx.fill();
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, sy - 30, 60, 0.5, 'rgba(140,255,70,A)');
      topY = sy - 54;
      break;
    }
    case 'sentry': { // 보안 포탑: 바닥 고정 받침 + 회전 포신 + 붉은 눈
      drawShadow(sx, sy, e.r);
      const d = Iso.dir(f), x0 = e.x - 11, y0 = e.y - 11, x1 = e.x + 11, y1 = e.y + 11;
      drawBox(x0, y0, x1, y1, 14, flash ? '#fff' : '#6a727c', '#3a4048', '#4e555e', 0, 0, 0);
      ctx.fillStyle = flash ? '#fff' : '#9aa4b0'; ctx.beginPath(); ctx.ellipse(sx, sy - 20, 10, 7, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = flash ? '#fff' : '#2a2e34'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(sx, sy - 21); ctx.lineTo(sx + d.x * 20, sy - 21 + d.y * 10); ctx.stroke(); ctx.lineWidth = 1;
      const on = e.state === 'chase';
      ctx.fillStyle = on ? '#ff3030' : '#30ff60'; ctx.beginPath(); ctx.arc(sx + d.x * 6, sy - 23 + d.y * 3, 2.5, 0, TAU); ctx.fill();
      if (on && Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, sy - 22, 50, 0.5, 'rgba(255,40,40,A)');
      topY = sy - 36;
      break;
    }
    case 'boss': {
      const pulse = 1 + Math.sin(G.time * 4) * 0.06;
      ctx.fillStyle = 'rgba(80,255,90,0.16)';
      ctx.beginPath(); ctx.ellipse(sx, sy, e.r * 1.7 * pulse, e.r * 0.85 * pulse, 0, 0, TAU); ctx.fill();
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy, { s: 2.8 * pulse, body: '#2f6a3a', skin: '#5fbf5a', legs: '#1f3a24', aim: f, claws: true, flash, walk: walk * 0.4, eyes: '#eaff5a' });
      topY = sy - 115;
      break;
    }
  }
  if (k !== 1) { ctx.restore(); topY = sy - (sy - topY) * k; }
  e._topY = topY; if (!e._noTags) drawEnemyTags(e, sx, sy, topY);
}
// 머리 위 표시 (「!」 · 이름 · 체력 바) — 넘어져 몸이 기울어도 똑바로
function drawEnemyTags(e, sx, sy, topY) {
  if (e.alertT > 0) { // v1.29 처음 알아챔 「!」 (튀어 오르며 나타남)
    const t = 0.9 - e.alertT, pop = t < 0.12 ? t / 0.12 * 1.3 : t < 0.2 ? 1.3 - (t - 0.12) / 0.08 * 0.3 : 1, by = topY - 20 - Math.min(t, 0.12) * 40;
    ctx.save(); ctx.globalAlpha = Math.min(1, e.alertT / 0.2); ctx.translate(sx, by); ctx.scale(pop, pop);
    ctx.fillStyle = FACTION[e.type] === 'machine' ? '#5ad0ff' : '#ff3a2a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.font = '18px BlackHan, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('!', 0, 0); ctx.fillText('!', 0, 0); ctx.restore();
  }
  if (e.elite || e.bossName) {
    nameTag(sx, topY - 2, `★ ${e.bossName || ELITES[e.elite].name}`, '#ffa53a', 'bold 12px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
  } else if (e.affix) {
    const A = ELITE_AFFIXES[e.affix];
    nameTag(sx, topY - 4, `◆ Lv${e.level} ${A.name} ${e.def.name}`, A.color, 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
    ctx.fillStyle = '#300'; ctx.fillRect(sx - 20, topY + 1, 40, 4);
    ctx.fillStyle = A.color; ctx.fillRect(sx - 20, topY + 1, 40 * e.hp / e.maxHp, 4);
  } else if (!e.def.boss) { // v1.28 일반 적은 이름표 없이 (마우스를 올리면 이름 · 레벨이 훨씬 높으면 붉은 !! · 맞으면 체력 바)
    const lvDiff = e.level - G.player.level, hover = !IS_TOUCH && Math.abs(input.mx - sx) < 26 && input.my > topY - 6 && input.my < sy + 6;
    if (hover) nameTag(sx, topY, `Lv${e.level} ${e.def.name}`, lvDiff >= 4 ? '#f66' : lvDiff >= 1 ? '#fc8' : lvDiff <= -4 ? '#999' : '#eee');
    else if (lvDiff >= 4) nameTag(sx, topY, '!!', '#f66', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#300'; ctx.fillRect(sx - 16, topY + 4, 32, 4);
      ctx.fillStyle = '#e33'; ctx.fillRect(sx - 16, topY + 4, 32 * e.hp / e.maxHp, 4);
    }
  }
}

function drawNpc(n) {
  const sx = Iso.sx(n.x, n.y), sy = Iso.sy(n.x, n.y);
  drawShadow(sx, sy, 12);
  const look = {
    merchant: { body: '#7a6420', helmet: '#3a2a10', legs: '#3a3020' },
    captain: { body: '#35507a', helmet: '#22324a', legs: '#262c36', gun: 18 },
    medic: { body: '#e8e8e8', helmet: '#c33', legs: '#555' },
    mechanic: { body: '#5a5a62', helmet: '#c98a20', legs: '#33333a', blade: '#aaa' },
  }[n.id];
  if (!Sprites.draw(n.id, 'idle', G.time + n.x * 0.01, sx, sy, angleTo(n, G.player), false))
    drawHuman(sx, sy, { s: 1.05, skin: '#d9b48f', aim: angleTo(n, G.player), ...look });
  const foc = Tut.focusNpc(); // v1.54 출격 차례엔 윤씨만 또렷하게 (다른 사람 이름은 흐리게)
  if (foc && foc !== n.id) ctx.globalAlpha = 0.3;
  nameTag(sx, sy - 50 * (ART.charScale || 1) - 4, n.name, '#ffd76a', 'bold 12px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
  ctx.globalAlpha = 1;
  if (foc === n.id) { const k = 0.5 + 0.5 * Math.sin(G.time * 4); ctx.strokeStyle = `rgba(127,224,138,${0.5 + 0.4 * k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy, 26 + 6 * k, 13 + 3 * k, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; }
  let mark = null;
  if (n.id === 'captain') {
    const p = G.player, c = Story.chapter(p);
    if (c && !p.quest.active && p.level >= c.minLevel) mark = ['!', '#ffd700']; // 새 장 시작 가능
  } else if (n.id === 'merchant') mark = ['₵', '#bbb'];
  else if (n.id === 'medic') mark = ['✚', '#f55'];
  else if (n.id === 'mechanic') mark = ['@settings', '#ddd'];
  if (mark && mark[0][0] === '@') Icons.draw(mark[0].slice(1), sx, sy - 72 + Math.sin(G.time * 3) * 3, 22); // 아이콘 표시
  else if (mark) {
    ctx.font = '20px BlackHan, sans-serif'; ctx.fillStyle = mark[1];
    ctx.fillText(mark[0], sx, sy - 66 + Math.sin(G.time * 3) * 3);
  }
}

// ---------------- 조명 ----------------
// 어둠 레이어를 깔고 광원 위치만 지워서 밝힘. color 가 있는 광원은 색 번짐(가산)도 더함
const Light = { cv: document.createElement('canvas'), list: [] };
function addLight(x, y, r, a = 1, color = null) { Light.list.push({ x, y, r, a, color }); }
function isBurningCar(tx, ty) { return hash2(tx * 7, ty * 13) < 0.18 && World.distTiles(tx * TILE, ty * TILE) > World.safeR + 4; }

function renderLighting(dark) {
  if (!Settings.light) { // 조명 끔: 단순 어둠만 (저사양·모바일)
    ctx.fillStyle = `rgba(4,5,12,${dark * 0.45})`; ctx.fillRect(0, 0, VW, VH);
    Light.list.length = 0; return;
  }
  // 어둠 레이어는 부드러운 그라데이션뿐이라 절반 해상도로 그리고 확대 (성능)
  const c = Light.cv, LW = Math.ceil(VW / 2), LH = Math.ceil(VH / 2);
  if (c.width !== LW || c.height !== LH) { c.width = LW; c.height = LH; }
  const g = c.getContext('2d');
  g.setTransform(0.5, 0, 0, 0.5, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, VW, VH);
  g.fillStyle = `rgba(4,5,12,${dark})`; g.fillRect(0, 0, VW, VH);
  g.globalCompositeOperation = 'destination-out';
  for (const l of Light.list) {
    if (l.x < -l.r || l.y < -l.r || l.x > VW + l.r || l.y > VH + l.r) continue;
    g.save(); g.translate(l.x, l.y); g.scale(1, 0.62); // 쿼터뷰 바닥에 맞춰 타원형
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, l.r);
    gr.addColorStop(0, `rgba(0,0,0,${l.a})`); gr.addColorStop(0.55, `rgba(0,0,0,${l.a * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(-l.r, -l.r, l.r * 2, l.r * 2);
    g.restore();
  }
  ctx.drawImage(c, 0, 0, VW, VH);
  // 색 번짐
  ctx.globalCompositeOperation = 'lighter';
  for (const l of Light.list) {
    if (!l.color || l.x < -l.r || l.y < -l.r || l.x > VW + l.r || l.y > VH + l.r) continue;
    const gr2 = l.r * 0.5;
    const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, gr2);
    gr.addColorStop(0, l.color.replace('A', (0.35 * l.a).toFixed(2))); gr.addColorStop(1, l.color.replace('A', '0'));
    ctx.fillStyle = gr; ctx.fillRect(l.x - gr2, l.y - gr2, gr2 * 2, gr2 * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  Light.list.length = 0;
}

// 불타는 폐차: 불꽃·연기 파티클 (월드가 멈춘 히트스톱 중에는 생성 안 함)
function burnFx(tx, ty) {
  const x = tx * TILE + 16, y = ty * TILE + 16, fl = 0.85 + Math.sin(G.time * 13 + tx) * 0.08 + Math.sin(G.time * 7.3 + ty) * 0.07;
  addLight(Iso.sx(x, y), Iso.sy(x, y, 18), 170 * fl, 0.85, 'rgba(255,140,40,A)');
  if (G.hitstop > 0 || G.particles.length > 500) return;
  if (Math.random() < 0.5) G.particles.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-8, 8), vy: rand(-8, 8), z: 16, vz: rand(30, 60), t: 0, life: rand(0.35, 0.7), color: pick(['#ff9a30', '#ffcf5a', '#ff6a20']), size: rand(3, 6) });
  if (Math.random() < 0.12) G.particles.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-5, 5), vy: rand(-5, 5), z: 30, vz: rand(20, 32), t: 0, life: rand(1.2, 2), color: 'rgba(55,55,60,0.55)', size: rand(8, 13) });
}

// ---------------- 메인 렌더 ----------------
// v1.46 나무 뒤에 사람·적이 있으면 나무를 반투명하게 (잎에 가려 적이 안 보이던 것)
const Behind = {
  rf: -1, list: [],
  actors() {
    if (this.rf === G.rf) return this.list;
    this.rf = G.rf; const L = this.list; L.length = 0;
    const add = (o, imp) => { const sx = Iso.sx(o.x, o.y), sy = Iso.sy(o.x, o.y); if (sx > -60 && sx < VW + 60 && sy > -40 && sy < VH + 80) L.push({ sx, sy, d: (o.x + o.y) / TILE, imp }); };
    if (G.player && !G.player.dead) add(G.player, 1);
    if (G.comp && G.comp.state !== 'gone' && G.comp.map === World.map) add(G.comp, 1);
    for (const e of G.enemies) if (e.hp > 0 && !enemyCloaked(e)) add(e, e.state === 'chase' ? 1 : 0.6);
    return L;
  },
  // v1.47.1 탈것: 그림이 차지하는 화면 사각형 안에, 그림보다 먼저(뒤에) 그려지는 사람·적이 있으면 반투명
  vehicle(o, ak, px, py) {
    const a = propArt(ak); if (!a) return 1;
    const fit = ART.propFit[ak] || { w: 40, y: 4 }, [, , rw, rh] = a.rect || [0, 0, a.img.width, a.img.height], w = fit.w, h = rh * w / rw, base = py + fit.y, d = o.front + 1.1;
    for (const t of this.actors()) if (t.d < d && Math.abs(t.sx - px) < w * 0.5 && t.sy - 14 < base && t.sy - 14 > base - h) return 0.35;
    return 1;
  },
  // 나무 바닥점(o) · 화면 위치 · 잎 폭/높이 → 0.3~1 투명도
  alpha(o, sx, sy, w, h) {
    const d = (o.x + o.y) / TILE;
    for (const a of this.actors()) if (a.d < d + 0.3 && Math.abs(a.sx - sx) < w * 0.5 && a.sy < sy + 4 && a.sy > sy - h * 0.92) return 0.32;
    return 1;
  },
};

function render() {
  const p = G.player;
  G.rf = (G.rf || 0) + 1;
  Iso.reset();
  ctx.fillStyle = '#08080a'; ctx.fillRect(0, 0, VW, VH);

  // 화면에 보이는 타일 범위 (높은 건물을 위해 아래쪽 여유)
  const corners = [Iso.toWorld(0, -40), Iso.toWorld(VW, -40), Iso.toWorld(0, VH + 220), Iso.toWorld(VW, VH + 220)];
  const tx0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c.x)) / TILE) - 1);
  const tx1 = Math.min(World.W - 1, Math.ceil(Math.max(...corners.map(c => c.x)) / TILE) + 1);
  const ty0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c.y)) / TILE) - 1);
  const ty1 = Math.min(World.H - 1, Math.ceil(Math.max(...corners.map(c => c.y)) / TILE) + 1);
  const inView = (tx, ty, extraTop) => {
    const cx = (tx * TILE + 16), cy = (ty * TILE + 16);
    const sx = Iso.sx(cx, cy), sy = Iso.sy(cx, cy);
    return sx > -60 && sx < VW + 60 && sy > -40 && sy < VH + 40 + extraTop;
  };

  // 1) 바닥 (캐시된 청크) + 바닥 위 효과 (변환 행렬 사용)
  { // 바닥은 맵 바깥(OUT_PAD 칸)까지
    const gx = c => Math.floor(c / TILE);
    GroundCache.draw(Math.max(-OUT_PAD, gx(Math.min(...corners.map(c => c.x))) - 1), Math.max(-OUT_PAD, gx(Math.min(...corners.map(c => c.y))) - 1),
      Math.min(World.W + OUT_PAD, gx(Math.max(...corners.map(c => c.x))) + 1), Math.min(World.H + OUT_PAD, gx(Math.max(...corners.map(c => c.y))) + 1));
  }
  const solids = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const t = World.tiles[ty * World.W + tx];
    const roof = (t === T.FLOOR || t === T.DOOR) && !insideBid(tx, ty); // 바깥에서 본 상가 지붕·문틀
    if ((!SOLID.has(t) && !roof) || t === T.LANDMARK || (t === T.LWALL && !World.height[ty * World.W + tx])) continue; // 연구소 암반(높이 0)은 그리지 않음
    const tall = t === T.BUILDING || t === T.WALL || t === T.PROP || t === T.LWALL || t === T.LPROP || roof ? tileHeight(tx, ty) * ISO_K + 20 : 30;
    if (inView(tx, ty, tall)) solids.push({ d: tx + ty + 1, tx, ty, t });
  }
  Iso.groundTransform();
  for (const d of G.decals) {
    ctx.fillStyle = d.drop ? 'rgba(110,12,12,0.6)' : 'rgba(90,10,10,0.45)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, d.a, 0, TAU); ctx.fill();
  }
  for (const h of World.hazards) { // 방사능 웅덩이
    const pul = 0.75 + Math.sin(G.time * 2.5 + h.x) * 0.15;
    const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
    g.addColorStop(0, `rgba(120,255,80,${0.55 * pul})`); g.addColorStop(0.7, `rgba(60,200,40,${0.35 * pul})`); g.addColorStop(1, 'rgba(40,120,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
  }
  for (const f of G.fires) { // v1.11 소이탄 불길
    const a = Math.min(1, (f.life - f.t) / 0.6), fl = 0.85 + Math.sin(G.time * 13 + f.x) * 0.15;
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    g.addColorStop(0, `rgba(255,190,70,${0.55 * a * fl})`); g.addColorStop(0.7, `rgba(240,90,30,${0.4 * a})`); g.addColorStop(1, 'rgba(120,30,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
  }
  for (const pl of G.pools) { // 산성 장판
    const a = Math.min(1, (pl.life - pl.t) / 0.6);
    ctx.fillStyle = `rgba(120,200,60,${0.4 * a})`; ctx.beginPath(); ctx.arc(pl.x, pl.y, pl.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(170,255,90,${0.6 * a})`; ctx.lineWidth = 2; ctx.stroke(); ctx.lineWidth = 1;
  }
  for (const s of G.strikes) { // 예고 원: 테두리 + 안쪽이 차오름
    const k = Math.min(1, s.t / s.delay);
    ctx.strokeStyle = s.color + (0.5 + Math.sin(G.time * 20) * 0.2) + ')'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = s.color + '0.3)'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * k, 0, TAU); ctx.fill();
  }
  if (G.assault) { // 어설트 봉쇄선
    const l = G.assault.l;
    ctx.strokeStyle = `rgba(255,90,60,${0.45 + Math.sin(G.time * 5) * 0.2})`; ctx.lineWidth = 4; ctx.setLineDash([18, 12]);
    ctx.beginPath(); ctx.arc(l.x, l.y, ASSAULT_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
  }
  if (World.bossTile) {
    const bx = World.bossTile.x * TILE + 16, by = World.bossTile.y * TILE + 16;
    ctx.strokeStyle = 'rgba(80,255,90,0.3)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(bx, by, 7.5 * TILE, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  }
  for (const e of G.exits || []) { // v1.3 탈출 지점: 초록 원 + 맥박
    const k = (G.time * 0.8) % 1;
    if (e.locked) { // v1.10 잠긴 특수 탈출: 주황 점선
      ctx.strokeStyle = 'rgba(255,170,60,0.6)'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.arc(e.x, e.y, EXTRACT_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255,170,60,0.08)'; ctx.beginPath(); ctx.arc(e.x, e.y, EXTRACT_R, 0, TAU); ctx.fill();
      continue;
    }
    ctx.strokeStyle = 'rgba(110,240,130,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, EXTRACT_R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(110,240,130,${0.6 * (1 - k)})`; ctx.beginPath(); ctx.arc(e.x, e.y, EXTRACT_R * k, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(110,240,130,0.12)'; ctx.beginPath(); ctx.arc(e.x, e.y, EXTRACT_R, 0, TAU); ctx.fill();
  }
  // 근접 공격 궤적
  const w = curWeapon();
  if (w && WEAPONS[w.key].melee && p.swingT > 0 && !p.dead && !p.swingFin) {
    const rc = meleeReach(w), arc = p.swingArc || rc.arc, r = (p.swingRange || rc.range) * 0.85;
    ctx.strokeStyle = `rgba(255,255,255,${p.swingT * 3})`; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, p.aim - arc / 2, p.aim + arc / 2); ctx.stroke(); ctx.lineWidth = 1;
  }
  for (const ef of G.effects) if (ef.type === 'slash') { // v1.9 근접 마무리 궤적
    const k = ef.t / ef.life, al = 1 - k;
    if (ef.kind === 'katana') { // 찌르기: 앞으로 뻗는 빛줄기
      const c = Math.cos(ef.a), sn = Math.sin(ef.a);
      ctx.strokeStyle = `rgba(190,230,255,${al})`; ctx.lineWidth = 10 * al + 2;
      ctx.beginPath(); ctx.moveTo(ef.x - c * 10, ef.y - sn * 10); ctx.lineTo(ef.x + c * ef.r * (0.6 + k * 0.4), ef.y + sn * ef.r * (0.6 + k * 0.4)); ctx.stroke();
    } else {
      const full = ef.arc >= Math.PI * 1.9;
      ctx.strokeStyle = ef.kind === 'axe' ? `rgba(255,170,120,${al})` : `rgba(255,240,200,${al})`; ctx.lineWidth = 9 * al + 2;
      ctx.beginPath(); if (full) ctx.arc(ef.x, ef.y, ef.r * (0.7 + k * 0.3), 0, Math.PI * 2); else ctx.arc(ef.x, ef.y, ef.r * (0.75 + k * 0.25), ef.a - ef.arc / 2, ef.a + ef.arc / 2); ctx.stroke();
      if (ef.kind === 'pipe') { ctx.fillStyle = `rgba(255,230,160,${0.35 * al})`; ctx.beginPath(); ctx.arc(ef.x + Math.cos(ef.a) * ef.r * 0.7, ef.y + Math.sin(ef.a) * ef.r * 0.7, 26 * (0.5 + k), 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.lineWidth = 1;
  }
  for (const ef of G.effects) {
    const k = ef.t / ef.life;
    if (ef.type === 'boom') {
      ctx.fillStyle = `rgba(255,170,60,${0.55 * (1 - k)})`; ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r * (0.4 + k * 0.6), 0, TAU); ctx.fill();
    } else if (ef.type === 'ring') {
      ctx.strokeStyle = ef.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r * k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
  }
  for (const e of G.enemies) { // v0.16 일반 적 예고: 변이견 도약선 · 원거리 조준선
    if (e.pounceT > 0) {
      ctx.strokeStyle = `rgba(255,80,60,${0.3 + (0.7 - e.pounceT) * 0.8})`; ctx.lineWidth = e.r * 1.4;
      ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.leapA) * 140, e.y + Math.sin(e.leapA) * 140); ctx.stroke(); ctx.lineWidth = 1; // v1.33 도약 거리에 맞춤
    }
  }
  for (const e of G.enemies) if (e.charge > 0.8) { // 돌진 예고선 (타이탄 · 필드 보스)
    ctx.strokeStyle = 'rgba(255,60,60,0.5)'; ctx.lineWidth = e.r * 1.6;
    ctx.beginPath(); ctx.moveTo(e.x, e.y);
    ctx.lineTo(e.x + Math.cos(e.chargeA) * 270, e.y + Math.sin(e.chargeA) * 270); ctx.stroke(); ctx.lineWidth = 1;
  }
  // 아이템 바닥 빛
  for (const d of G.drops) if (d.kind === 'item') {
    ctx.fillStyle = RARITIES[d.item.rarity || 0].color; ctx.globalAlpha = 0.25 + Math.sin(G.time * 5) * 0.1;
    ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  Iso.reset();

  // 2) 입체 오브젝트 + 캐릭터 깊이 정렬
  const objs = solids;
  const pd = (p.x + p.y) / TILE, psx = Iso.sx(p.x, p.y), psy = Iso.sy(p.x, p.y, 18);
  // 플레이어와 추격 중인 적을 가리는 앞쪽 건물은 반투명 (v0.11 고층 건물 대응)
  const watch = [{ d: pd, sx: psx, sy: psy, w: 110 }, { d: pd, sx: psx, sy: psy - 50, w: 90 }, { d: pd, sx: psx, sy: psy + 40, w: 90 }]; // v1.49.10 플레이어 둘레를 넓게 (위·아래 점까지): 가까운 건물이 시야를 막던 것
  for (const n of G.npcs) watch.push({ d: (n.x + n.y) / TILE, sx: Iso.sx(n.x, n.y), sy: Iso.sy(n.x, n.y, 18), w: 34 }); // v1.24 NPC도 가리면 반투명
  for (const e of G.enemies) { // v1.32 쫓지 않는 적도 (건물 뒤 배회하는 적이 안 보이던 것) · 가려진 적은 아래에서 투시 윤곽
    e.occl = false; if (e.hp <= 0 || e.nest) continue;
    const esx = Iso.sx(e.x, e.y), esy = Iso.sy(e.x, e.y, 18); if (esx < -80 || esx > VW + 80 || esy < -80 || esy > VH + 120) continue;
    watch.push({ d: (e.x + e.y) / TILE, sx: esx, sy: esy, w: 40 + e.r, ent: e });
  }
  for (const o of solids) {
    if (o.t !== T.BUILDING && o.t !== T.LWALL && !SHOP_TILES.has(o.t)) continue;
    const cx = o.tx * TILE + 16, cy = o.ty * TILE + 16;
    const sx = Iso.sx(cx, cy), ht = tileHeight(o.tx, o.ty), top = Iso.sy(cx, cy, ht) - 20, bot = Iso.sy(cx, cy) + 20;
    for (const v of watch) if (o.d > v.d + 0.3 && Math.abs(sx - v.sx) < v.w && v.sy > top && v.sy < bot) { o.fade = true; if (v.ent) v.ent.occl = true; else break; }
  }
  const depth = e => (e.x + e.y) / TILE;
  for (const n of G.npcs) objs.push({ d: depth(n), draw: drawNpc, ent: n });
  for (const e of G.enemies) objs.push({ d: depth(e) + (e.def.flying ? 0.5 : 0), draw: drawEnemy, ent: e });
  for (const t of G.turrets) objs.push({ d: depth(t), draw: Turrets.drawOne, ent: t }); // v1.26 포탑
  Companion.collect(objs); // v1.41 동료
  Settlement.collect(objs); // v1.43 캠프 사람들 · 커지는 캠프
  for (const d of G.drops) objs.push({ d: depth(d), draw: drawDrop, ent: d });
  for (const c of G.corpses) objs.push({ d: depth(c) - 0.3, draw: drawCorpse, ent: c });
  if (G.inside) { for (const c of G.inside.crates) objs.push({ d: depth(c), draw: drawCrate, ent: c }); for (const o of interiorDeco(G.inside)) objs.push({ d: depth(o), draw: q => drawPropArt(q.key, Iso.sx(q.x, q.y), Iso.sy(q.x, q.y), q.flip), ent: o }); } // v1.25 실내 장식 (그림이 있을 때만)
  if (World.map !== 'camp') { Scavenge.collect(objs); RaidEvents.collect(objs); } // v1.4 뒤질 곳 · 시체 가방 · v1.10 사건
  City.collect(objs, (x, y) => { const sx = Iso.sx(x, y), sy = Iso.sy(x, y); return sx > -120 && sx < VW + 120 && sy > -40 && sy < VH + 140; });
  for (const l of World.landmarks) {
    const sx = Iso.sx(l.x, l.y);
    if (sx < -400 || sx > VW + 400) continue;
    // 플레이어가 뒤에 있으면 반투명
    const top = Iso.sy(l.x, l.y, 380), bot = Iso.sy(l.x + l.size * 16, l.y + l.size * 16);
    l.fade = l.tx + l.ty + l.size > pd && Math.abs(psx - sx) < l.size * TILE * ISO_K && psy > top && psy < bot;
    objs.push({ d: l.tx + l.ty + l.size, draw: drawLandmark, ent: l });
  }
  if (!p.dead) objs.push({ d: pd, draw: drawPlayer, ent: p });
  objs.sort((a, b) => a.d - b.d);
  for (const o of objs) {
    if (o.draw) o.draw(o.ent);
    else { drawSolidTile(o); if (o.t === T.CAR && isBurningCar(o.tx, o.ty) && !City.carSkip.has(o.ty * World.W + o.tx)) burnFx(o.tx, o.ty); }
  }

  drawShopSigns();
  drawXray();
  drawThrown();

  // v0.16 공격 예고: 조준선(원거리) · 붉은 ! (근접)
  for (const e of G.enemies) {
    if (e.hp <= 0) continue;
    if (e.aimT > 0) {
      const k = 1 - e.aimT / (Monsters.TELE[e.type] || 0.3), len = Math.min(e.def.range, 600);
      ctx.strokeStyle = `rgba(255,40,40,${0.25 + k * 0.6})`; ctx.lineWidth = 1 + k * 1.5;
      ctx.beginPath(); ctx.moveTo(Iso.sx(e.x, e.y), Iso.sy(e.x, e.y, 22));
      ctx.lineTo(Iso.sx(e.x + Math.cos(e.aimA) * len, e.y + Math.sin(e.aimA) * len), Iso.sy(e.x + Math.cos(e.aimA) * len, e.y + Math.sin(e.aimA) * len, 22)); ctx.stroke(); ctx.lineWidth = 1;
    }
    if (e.windT > 0) {
      const k = 1 - e.windT / (e.windMax || 0.3), sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y);
      ctx.strokeStyle = `rgba(255,60,40,${0.4 + k * 0.5})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(sx, sy, (e.r + 16) * (1.4 - k * 0.4), (e.r + 16) * (0.7 - k * 0.2), 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#ff4030'; ctx.font = '16px BlackHan, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', sx, sy - (ART.height[e.type] || 44) * (e.scale || 1) - 10);
    }
  }
  drawDropBeams();

  // 3) 투사체 / 파티클 (위에 그림)
  for (const b of G.bullets) {
    const sx = Iso.sx(b.x, b.y), sy = Iso.sy(b.x, b.y, 22);
    if (b.from === 'p') {
      const tx = b.x - b.vx * 0.032, ty = b.y - b.vy * 0.032, ex = Iso.sx(tx, ty), ey = Iso.sy(tx, ty, 22); // v1.40 더 길고 밝은 예광
      ctx.lineCap = 'round'; ctx.globalAlpha = 0.35; ctx.strokeStyle = b.color; ctx.lineWidth = b.crit ? 5 : 4;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff8e0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo((sx + ex) / 2, (sy + ey) / 2); ctx.stroke(); ctx.lineCap = 'butt';
    } else {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(sx, sy, (b.r || 3) + 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(sx, sy, (b.r || 3) * 0.4, 0, TAU); ctx.fill();
    }
  }
  ctx.lineWidth = 1;
  for (const ef of G.effects) if (ef.type === 'tracer') {
    ctx.strokeStyle = ef.color; ctx.globalAlpha = 1 - ef.t / ef.life; ctx.lineWidth = ef.w || 1.5;
    ctx.beginPath(); ctx.moveTo(Iso.sx(ef.x, ef.y), Iso.sy(ef.x, ef.y, 22)); ctx.lineTo(Iso.sx(ef.x2, ef.y2), Iso.sy(ef.x2, ef.y2, 18)); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
  }
  for (const ef of G.effects) if (ef.type === 'zap') { // 연쇄 타격 번개
    ctx.strokeStyle = `rgba(150,220,255,${1 - ef.t / ef.life})`; ctx.lineWidth = 3;
    const ax = Iso.sx(ef.x, ef.y), ay = Iso.sy(ef.x, ef.y, 20), bx = Iso.sx(ef.x2, ef.y2), by = Iso.sy(ef.x2, ef.y2, 20);
    ctx.beginPath(); ctx.moveTo(ax, ay);
    for (let k = 1; k < 4; k++) ctx.lineTo(lerp(ax, bx, k / 4) + rand(-6, 6), lerp(ay, by, k / 4) + rand(-6, 6));
    ctx.lineTo(bx, by); ctx.stroke(); ctx.lineWidth = 1;
  }
  Gadgets.draw(); // v1.14 지뢰
  Juice.drawWorld(); // v1.28 탄피 · 총구 섬광
  for (const g of G.grenades) {
    drawShadow(Iso.sx(g.x, g.y), Iso.sy(g.x, g.y), 4);
    const gx = Iso.sx(g.x, g.y), gy = Iso.sy(g.x, g.y, 6 + g.h * 1.5);
    ctx.fillStyle = g.kind === 'molotov' ? '#6a8a4a' : g.kind === 'flash' ? '#8a919b' : '#4a5a3a'; ctx.beginPath(); ctx.arc(gx, gy, 4, 0, TAU); ctx.fill();
    if (g.kind === 'molotov') { ctx.fillStyle = `rgba(255,${140 + Math.random() * 80},40,0.9)`; ctx.beginPath(); ctx.arc(gx + 2, gy - 4, 2.5, 0, TAU); ctx.fill(); }
  }
  for (const pt of G.particles) {
    ctx.globalAlpha = 1 - pt.t / pt.life; ctx.fillStyle = pt.color;
    ctx.fillRect(Iso.sx(pt.x, pt.y) - pt.size / 2, Iso.sy(pt.x, pt.y, pt.z ?? 16) - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // 4) 분위기 / 조명
  if (!p.dead) addLight(psx, psy, Math.max(VW, VH) * (World.def && World.def.lab ? 0.4 : 0.62), 0.97); // 연구소는 시야가 좁음
  if (p.recoilT > 0 && World.def && World.def.lab) addLight(psx + Math.cos(p.aim) * 20, psy - 6, 260, 0.9); // 총구 섬광이 어둠을 밝힘
  for (const a of World.alarms) { // v1.5 붉은 비상등 (격리실은 빠르게)
    const sx = Iso.sx(a.x, a.y), sy = Iso.sy(a.x, a.y, 30);
    if (sx < -200 || sx > VW + 200 || sy < -200 || sy > VH + 200) continue;
    const k = 0.55 + 0.45 * Math.sin(G.time * (a.boss ? 6 : 2.2) + a.ph);
    addLight(sx, sy, 210, 0.55 + k * 0.4, 'rgba(255,30,20,A)');
  }
  if (p.recoilT > 0) addLight(psx + Math.cos(p.aim) * 20, psy - 6, 150, 0.9, 'rgba(255,200,110,A)');
  const cc = World.campCenter();
  if (World.map === 'camp') addLight(Iso.sx(cc.x, cc.y), Iso.sy(cc.x, cc.y), 420, 0.8); // 캠프 조명 (넓어서 색 번짐은 생략)
  for (const e of G.exits || []) if (!e.locked) addLight(Iso.sx(e.x, e.y), Iso.sy(e.x, e.y), 160, 0.9, 'rgba(110,240,130,A)'); // 탈출 지점
  for (const f of G.fires) addLight(Iso.sx(f.x, f.y), Iso.sy(f.x, f.y), f.r * 2.2, 0.8, 'rgba(255,130,50,A)'); // v1.11 불길
  for (const ef of G.effects) if (ef.type === 'boom') addLight(Iso.sx(ef.x, ef.y), Iso.sy(ef.x, ef.y), ef.r * 2.4 * (1 - ef.t / ef.life), 1, 'rgba(255,150,50,A)');
  for (const b of G.bullets) if (b.from === 'e') addLight(Iso.sx(b.x, b.y), Iso.sy(b.x, b.y, 22), 36, 0.6, b.r > 4 ? 'rgba(120,255,100,A)' : 'rgba(255,90,60,A)');
  for (const s of G.strikes) addLight(Iso.sx(s.x, s.y), Iso.sy(s.x, s.y), s.r * 1.8, 0.5 + 0.4 * s.t / s.delay, s.pool ? 'rgba(140,230,70,A)' : 'rgba(255,90,50,A)');
  for (const h of World.hazards) addLight(Iso.sx(h.x, h.y), Iso.sy(h.x, h.y), h.r * 2.6, 0.75, 'rgba(110,255,80,A)');
  for (const l of World.landmarks) {
    const lc = { cathedral: 'rgba(255,190,120,A)', bosingak: 'rgba(255,90,60,A)', base: 'rgba(230,240,255,A)', tower63: 'rgba(255,210,100,A)', coex: 'rgba(255,80,140,A)', lotte: 'rgba(200,120,255,A)' }[l.id];
    addLight(Iso.sx(l.x, l.y), Iso.sy(l.x, l.y, 20), l.size * 70, 0.8, lc);
  }
  if (G.boss) addLight(Iso.sx(G.boss.x, G.boss.y), Iso.sy(G.boss.x, G.boss.y), 230, 0.7, 'rgba(90,255,100,A)');
  for (const d of G.drops) if (d.kind === 'item' && (d.item.rarity || 0) >= 2) addLight(Iso.sx(d.x, d.y), Iso.sy(d.x, d.y), 70, 0.8, RARITIES[d.item.rarity].color.replace(/^#(..)(..)(..)$/, (m, r, g, b) => `rgba(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)},A)`));
  renderLighting(Math.min(0.9, G.darkness + 0.32));
  if (!(World.def && World.def.lab)) Ash.draw(); // v1.2 재 날림 (지하는 없음)
  const tint = ZONES[G.zone].tint;
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, VW, VH); }
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(200,0,0,${p.hurtT})`; ctx.fillRect(0, 0, VW, VH); }
  if ((G.tension || 0) > 0.15) { // v1.29 긴장도: 가장자리가 어둡고 붉어짐 (화면 가운데는 그대로)
    const T = G.tension, gv = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.95);
    gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(1, `rgba(${Math.round(30 + T * 40)},0,0,${(T - 0.15) * 0.55})`);
    ctx.fillStyle = gv; ctx.fillRect(0, 0, VW, VH);
  }
  if (G.flash) { // v1.7.1 영웅·전설 드랍 번쩍임
    const f = G.flash; f.t += 1 / 60;
    if (f.t >= f.life) G.flash = null;
    else { ctx.globalAlpha = f.a * (1 - f.t / f.life); ctx.fillStyle = f.color; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  }
  if (!p.dead && p.hp < PlayerStats.maxHp(p) * 0.3) { // 저체력: 붉은 테두리가 맥박처럼
    const k = 0.25 + Math.max(0, Math.sin(G.time * 6)) * 0.25;
    const g3 = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VH * 0.85);
    g3.addColorStop(0, 'rgba(160,0,0,0)'); g3.addColorStop(1, `rgba(160,0,0,${k})`);
    ctx.fillStyle = g3; ctx.fillRect(0, 0, VW, VH);
  }
  drawHitDirs(psx, psy); // v1.17 화면 밖에서 맞은 방향
  Juice.drawApproach(psx, psy); // v1.29 다가오는 적
  Juice.drawHUD(); canvas.classList.toggle('aim', G.running && !p.dead); // v1.28 조준선

  if (G.fade) { // v1.17 출격·귀환 화면 전환 (검게 → 밝게)
    G.fade.t += 1 / 60; const k = G.fade.t / G.fade.life;
    if (k >= 1) G.fade = null; else { ctx.fillStyle = `rgba(4,5,8,${1 - k})`; ctx.fillRect(0, 0, VW, VH); if (G.fade.text && k < 0.7) { ctx.globalAlpha = 1 - k / 0.7; ctx.fillStyle = '#e8dcc0'; ctx.font = '26px BlackHan, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(G.fade.text, VW / 2, VH / 2 - 10); ctx.font = '13px sans-serif'; ctx.fillStyle = '#a89c80'; ctx.fillText(G.fade.sub || '', VW / 2, VH / 2 + 16); ctx.globalAlpha = 1; } }
  }

  // 목표 방향 화살표 + 거리
  const tg = !p.dead && Story.target(p);
  if (!tg) FirstRun.drawArrow(psx, psy); // v1.45 첫 캠프: 윤씨 · 첫 출격: 가까운 탈출 지점
  if (tg && dist(p, tg) > 260) {
    const dx = Iso.sx(tg.x, tg.y) - psx, dy = Iso.sy(tg.x, tg.y) - (psy - 6), l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l;
    const ax = psx + ux * 54, ay = psy - 6 + uy * 40, bob = Math.sin(G.time * 5) * 3;
    ctx.save(); ctx.translate(ax + ux * bob, ay + uy * bob); ctx.rotate(Math.atan2(uy, ux));
    ctx.fillStyle = '#ffd76a'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-6, -7); ctx.lineTo(-2, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.stroke(); ctx.fill();
    ctx.restore(); ctx.lineWidth = 1;
    nameTag(ax + ux * 22, ay + uy * 16 + 4, `${Math.round(dist(p, tg) / TILE * 2)}m`, '#ffd76a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
  }

  // 5) 떠오르는 텍스트
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    const sx = Iso.sx(t.x, t.y), sy = Iso.sy(t.x, t.y, t.z);
    ctx.globalAlpha = 1 - t.t / t.life;
    ctx.font = t.size >= 14 ? `${t.size}px BlackHan, sans-serif` : `bold ${t.size}px "Malgun Gothic", sans-serif`; ctx.lineJoin = 'round'; // v1.39 포스터 글꼴 + 외곽선 (v1.40.1 작은 글씨는 일반 굵은 글꼴)
    ctx.lineWidth = t.size >= 14 ? 3 : 2; ctx.strokeStyle = '#0c0b08'; ctx.strokeText(t.text, sx, sy); ctx.lineWidth = 1;
    ctx.fillStyle = t.color; ctx.fillText(t.text, sx, sy);
  }
  ctx.globalAlpha = 1;
}

// ---------------- 랜드마크 ----------------
// 여러 칸에 걸친 면에 32px 간격으로 창문
function boxWin(x0, y0, x1, y1, h, top, south, east, seed, z0 = 0) {
  drawBox(x0, y0, x1, y1, h, top, south, east, z0, z0, 0);
  if (!seed) return;
  for (let x = x0; x < x1 - 8; x += 32) drawWindows(x, y1, Math.min(x + 32, x1), y1, z0, h, seed + x, 0);
  for (let y = y0; y < y1 - 8; y += 32) drawWindows(x1, y, x1, Math.min(y + 32, y1), z0, h, seed + y * 3, 1);
}

function drawLandmark(l) {
  const x0 = l.tx * TILE, y0 = l.ty * TILE;
  let x1 = x0 + l.size * TILE, y1 = y0 + l.size * TILE;
  if (l.fade) ctx.globalAlpha = 0.35;
  const art = ART.landmarks[l.id];
  ctx.save();
  if (art && art.ready) { // Gemini 그림: 발판 너비에 맞춰 남쪽 꼭짓점 기준으로 그림
    const w = 2 * l.size * TILE * ISO_K, sc = w / art.img.width;
    ctx.drawImage(art.img, Iso.sx(l.x, l.y) - w / 2, Iso.sy(x1, y1) + 2 - art.img.height * sc, w, art.img.height * sc);
  } else {
    // 기본 그래픽은 base 크기 기준으로 그리고 화면에서 size/base 배 확대 (등각 투영은 선형이라 그대로 커짐)
    const k = l.size / (l.base || l.size), ax = Iso.sx(x0, y0), ay = Iso.sy(x0, y0);
    ctx.translate(ax, ay); ctx.scale(k, k); ctx.translate(-ax, -ay);
    x1 = x0 + (l.base || l.size) * TILE; y1 = y0 + (l.base || l.size) * TILE;
  }
  if (art && art.ready) { /* 그림 사용 */ } else if (l.id === 'cathedral') {
    drawBox(x0 + 4, y0 + 4, x1 - 4, y1 - 4, 8, '#5a524a', '#3a342e', '#4a433c', 0, 0, 0);
    boxWin(x0 + 14, y0 + 10, x1 - 10, y1 - 30, 70, '#7a4636', '#4e2a20', '#633628', 911);
    drawBox(x0 + 26, y0 + 20, x1 - 22, y1 - 40, 96, '#3a2a26', '#2a1e1a', '#33241f', 70, 70, 0);
    boxWin(x0 + 12, y1 - 46, x0 + 50, y1 - 8, 150, '#80503c', '#52301f', '#6a3c2b', 313);
    drawBox(x0 + 22, y1 - 36, x0 + 40, y1 - 18, 210, '#3a2a26', '#2a1e1a', '#33241f', 150, 150, 0);
    const cx = Iso.sx(x0 + 31, y1 - 27), cy = Iso.sy(x0 + 31, y1 - 27, 210);
    ctx.strokeStyle = '#d9c9a0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 22); ctx.moveTo(cx - 7, cy - 15); ctx.lineTo(cx + 7, cy - 15); ctx.stroke(); ctx.lineWidth = 1;
    drawBox(x1 - 40, y1 - 22, x1 - 6, y1 - 4, 14, '#5d5048', '#3a322c', '#4a3f38', 0, 0, 0); // 무너진 잔해
  } else if (l.id === 'bosingak') {
    drawBox(x0 + 4, y0 + 4, x1 - 4, y1 - 4, 16, '#8a8a84', '#5a5a56', '#6e6e6a', 0, 0, 0);
    for (const [px, py] of [[x0 + 20, y0 + 20], [x1 - 28, y0 + 20], [x0 + 20, y1 - 28], [x1 - 28, y1 - 28]])
      drawBox(px, py, px + 8, py + 8, 66, '#a8322a', '#6e1e18', '#8a2820', 16, 16, 0);
    drawBox(x0 + 44, y0 + 44, x1 - 44, y1 - 44, 56, '#5a3a20', '#3a2410', '#4a2e18', 16, 16, 0); // 종
    drawBox(x0 - 8, y0 - 8, x1 + 8, y1 + 8, 80, '#3c4a44', '#28322e', '#323e38', 66, 66, 0);
    drawBox(x0 + 14, y0 + 14, x1 - 14, y1 - 14, 100, '#2e3a35', '#1f2824', '#26302c', 80, 80, 0);
  } else if (l.id === 'base') {
    drawBox(x0 + 4, y0 + 4, x1 - 4, y0 + 14, 14, '#7a6a48', '#4e4430', '#625639', 0, 0, 0);
    drawBox(x0 + 4, y0 + 4, x0 + 14, y1 - 4, 14, '#7a6a48', '#4e4430', '#625639', 0, 0, 0);
    boxWin(x0 + 22, y0 + 22, x0 + 92, y0 + 78, 36, '#55603f', '#353d27', '#454f33', 0);
    drawBox(x1 - 34, y0 + 10, x1 - 14, y0 + 30, 92, '#4a4a44', '#2e2e2a', '#3c3c36', 0, 0, 0);
    drawBox(x1 - 40, y0 + 4, x1 - 8, y0 + 36, 106, '#55554e', '#33332e', '#44443e', 92, 92, 0);
    drawBox(x0 + 86, y0 + 96, x1 - 14, y1 - 26, 20, '#4b5530', '#2f361c', '#3d4526', 0, 0, 0); // 전차 차체
    drawBox(x0 + 100, y0 + 104, x0 + 130, y0 + 128, 32, '#525d36', '#343c22', '#434c2c', 20, 20, 0);
    ctx.strokeStyle = '#2f361c'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(Iso.sx(x0 + 115, y0 + 116), Iso.sy(x0 + 115, y0 + 116, 28)); ctx.lineTo(Iso.sx(x0 + 115, y0 + 170), Iso.sy(x0 + 115, y0 + 170, 28)); ctx.stroke(); ctx.lineWidth = 1;
  } else if (l.id === 'coex') { // v1.6 무너진 무역센터(코엑스풍): 넓은 저층 몰 + 유리 아트리움 + 꺼진 대형 전광판
    boxWin(x0 + 6, y0 + 6, x1 - 6, y1 - 6, 52, '#5a6470', '#363e48', '#46505c', 1717);
    drawBox(x0 + 40, y0 + 40, x1 - 40, y1 - 40, 84, 'rgba(120,170,220,0.55)', 'rgba(70,110,150,0.6)', 'rgba(90,140,190,0.6)', 52, 52, 0);
    drawBox(x0 + 10, y1 - 30, x0 + 64, y1 - 20, 130, '#1a1c22', '#0e1014', '#14161a', 52, 52, 0);
    const k = Math.sin(G.time * 7) > 0.6; // 깜빡이는 전광판
    const S = Iso.sx, Y = Iso.sy;
    poly([S(x0 + 12, y1 - 20), Y(x0 + 12, y1 - 20, 76), S(x0 + 62, y1 - 20), Y(x0 + 62, y1 - 20, 76), S(x0 + 62, y1 - 20), Y(x0 + 62, y1 - 20, 126), S(x0 + 12, y1 - 20), Y(x0 + 12, y1 - 20, 126)], k ? '#ff3a6a' : '#3a1a2a');
    drawBox(x1 - 50, y0 + 10, x1 - 14, y0 + 40, 64, '#4a4048', '#2e282e', '#3a343a', 52, 52, 0); // 무너진 잔해
  } else if (l.id === 'lotte') { // v1.6 스카이타워 잔해: 가늘어지는 초고층 (꼭대기 부러짐) + 붉은 신호등
    boxWin(x0 + 8, y0 + 8, x1 - 8, y1 - 8, 220, '#8a96a8', '#4e5868', '#6a7688', 5555);
    boxWin(x0 + 18, y0 + 18, x1 - 18, y1 - 18, 420, '#9aa6b8', '#56606e', '#76829a', 777, 220);
    boxWin(x0 + 30, y0 + 30, x1 - 34, y1 - 30, 560, '#a8b4c4', '#5e6878', '#7e8aa0', 0, 420);
    const tx = Iso.sx(x0 + 60, y0 + 60), ty = Iso.sy(x0 + 60, y0 + 60, 590), on = Math.sin(G.time * 3) > 0;
    ctx.strokeStyle = '#3a3e46'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, ty + 24); ctx.lineTo(tx + 6, ty - 10); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = on ? '#ff3030' : '#4a1010'; ctx.beginPath(); ctx.arc(tx + 6, ty - 12, 4, 0, TAU); ctx.fill();
    if (on && Settings.light) addLight(tx + 6, ty - 12, 160, 0.8, 'rgba(255,40,40,A)');
  } else if (l.id === 'tower63') {
    boxWin(x0 + 6, y0 + 6, x1 - 6, y1 - 6, 330, '#b8902a', '#7a5c16', '#9c7a20', 6363);
    boxWin(x0 + 22, y0 + 14, x1 - 34, y1 - 30, 372, '#c49a30', '#806018', '#a68226', 0, 330);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  if (G.player.found.includes(l.id)) nameTag(Iso.sx(l.x, l.y), Iso.sy(l.x, l.y) + l.size * 9, '★ ' + l.name, '#ffd76a', 'bold 12px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
}

// 희귀 이상 장비 빛기둥 (v0.16): 멀리서도 보이게
function drawDropBeams() {
  for (const d of G.drops) {
    if (d.kind !== 'item' || d.item.kind === 'cons' || !d.landed) continue; // v1.29 장비가 귀해진 만큼 일반·고급도 낮은 빛기둥
    if (d.item.rarity >= 4 && G.hitstop <= 0 && G.particles.length < 500 && Math.random() < 0.5) // 전설: 빛 입자가 계속 솟아오름
      G.particles.push({ x: d.x + rand(-10, 10), y: d.y + rand(-10, 10), vx: 0, vy: 0, z: 6, vz: rand(50, 90), t: 0, life: rand(0.8, 1.4), color: pick(['#ffa53a', '#ffd76a', '#fff3c0']), size: rand(2, 4) });
    const r = d.item.rarity || 0, sx = Iso.sx(d.x, d.y), sy = Iso.sy(d.x, d.y), h = r < 2 ? 28 + r * 14 : 60 + r * 30, pul = (0.7 + Math.sin(G.time * 4 + d.x) * 0.3) * (r < 2 ? 0.5 : 1);
    const g = ctx.createLinearGradient(0, sy, 0, sy - h);
    const c = d.item.unique ? '#ff5aa0' : d.item.set ? SETS[d.item.set].color : RARITIES[r].color; // v1.12 고유 · 세트 색
    g.addColorStop(0, c + 'cc'); g.addColorStop(1, c + '00');
    ctx.globalAlpha = pul; ctx.fillStyle = g; ctx.fillRect(sx - 3 - r, sy - h, 6 + r * 2, h); ctx.globalAlpha = 1;
  }
}

// 보급 상자 (건물 안)
// v1.25 실내 바닥 질감: 상가 이름에 맞는 질감(2×2칸에 한 장) — 그림이 없으면 false (코드 마루)
function floorTex(tx, ty, x, y) {
  const bi = World.bid && World.bid[ty * World.W + tx]; if (bi === undefined || bi < 0) return false;
  const bd = World.buildings[bi], sa = bd && ART.shopArt[bd.name], tex = sa && ART.tex[sa.floor];
  if (!tex || !tex.ready) return false;
  const [rx, ry, rw, rh] = tex.rect || [0, 0, tex.img.width, tex.img.height], hw = rw / 2, hh = rh / 2;
  ctx.drawImage(tex.img, rx + (tx & 1) * hw, ry + (ty & 1) * hh, hw, hh, x, y, TILE + 0.6, TILE + 0.6);
  return true;
}
// v1.25 실내 장식: 바닥 칸에 드물게 (넘어진 의자 · 상자 · 잔해 · 상가별 장식). 그림이 있는 것만 · 충돌 없음
function interiorDeco(b) {
  if (!b.deco) {
    b.deco = []; const extra = ART.shopArt[b.name] && ART.shopArt[b.name].deco;
    for (let ty = b.y0 + 1; ty < b.y1; ty++) for (let tx = b.x0 + 1; tx < b.x1; tx++) {
      if (World.tileAt(tx, ty) !== T.FLOOR || b.crates.some(c => c.tx === tx && c.ty === ty)) continue;
      const h = hash2(tx * 31 + 7, ty * 17 + 3);
      const key = extra && h < 0.04 ? extra : h < 0.07 ? 'in_chair' : h < 0.1 ? 'in_boxes' : h < 0.13 ? 'in_debris' : null;
      if (key) b.deco.push({ key, x: tx * TILE + 16, y: ty * TILE + 16, flip: h * 1000 % 2 < 1 });
    }
  }
  return b.deco.filter(o => propArt(o.key));
}

function drawCrate(c) {
  const x0 = c.x - 11, y0 = c.y - 9, x1 = c.x + 11, y1 = c.y + 9, open = G.time - c.openT <= CRATE_RESTOCK;
  drawShadow(Iso.sx(c.x, c.y), Iso.sy(c.x, c.y), 14);
  if (drawPropArt(open ? 'in_crate_open' : 'in_crate', Iso.sx(c.x, c.y), Iso.sy(c.x, c.y))) { // v1.25 그림
    if (!open) { ctx.fillStyle = '#e0c070'; ctx.globalAlpha = 0.5 + Math.sin(G.time * 4) * 0.3; ctx.beginPath(); ctx.arc(Iso.sx(c.x, c.y), Iso.sy(c.x, c.y, 26), 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    return;
  }
  drawBox(x0, y0, x1, y1, 16, open ? '#3a3024' : '#8a6a3a', '#5a4424', '#6e5430', 0, 0, 0);
  if (!open) {
    ctx.fillStyle = '#e0c070'; ctx.globalAlpha = 0.5 + Math.sin(G.time * 4) * 0.3;
    ctx.beginPath(); ctx.arc(Iso.sx(c.x, c.y), Iso.sy(c.x, c.y, 26), 3, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
}

// v1.47 가게 종류 → 문 위 판 (0 노란 철판 · 1 관공서 파랑·흰색 · 2 초록+차양 · 3 나무)
const DOOR_SIGN = { 파출소: 1, 병원: 1, 은행: 1, 약국: 1, 카페: 3, 서점: 3, 분식집: 2, 세탁소: 2, 마트: 2, PC방: 0, 전자상가: 0, 편의점: 0 };
function doorSignVar(name) { return DOOR_SIGN[name] ?? 0; }
// 상가 이름 (바깥에서 가까이 가면 출입문 위에 표시)
function drawShopSigns() {
  const p = G.player;
  for (const b of World.buildings) {
    if (b === G.inside || Math.hypot(p.x - b.doorX, p.y - b.doorY) > 420) continue;
    const ready = b.crates.some(c => G.time - c.openT > CRATE_RESTOCK);
    const [dx, dy] = b.door[0]; // 문 위 노란 간판에 상호
    ctx.save(); City.faceTransform(dx, dy, b.south ? 's' : 'e', 54 + 22); if (!b.south) ctx.translate(-TILE, 0);
    const da = City.signArt('door'); ctx.fillStyle = da ? da.ink[doorSignVar(b.name)] : '#2a1c08'; // v1.47 판 색에 맞는 글자색
    ctx.font = 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(b.name, TILE, 8); ctx.restore();
    nameTag(Iso.sx(b.doorX, b.doorY), Iso.sy(b.doorX, b.doorY, 92), `${b.name}${ready ? ' ·상자' : ''}`, '#e0c070', 'bold 12px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif', 'door');
  }
}

// v1.32 건물에 가려진 적: 건물 위에 붉은 투시 윤곽 (모습은 그대로 보이게 반투명으로 한 번 더)
const Xray = { c: null };
function drawXray() {
  if (!Settings.xray) return; // v1.37 설정
  const list = G.enemies.filter(e => e.occl && e.hp > 0 && !enemyCloaked(e));
  if (!list.length) return;
  const W = canvas.width, H = canvas.height;
  if (!Xray.c || Xray.c.width !== W || Xray.c.height !== H) { Xray.c = document.createElement('canvas'); Xray.c.width = W; Xray.c.height = H; }
  const g = Xray.c.getContext('2d'), saved = ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.setTransform(ZOOM * RES, 0, 0, ZOOM * RES, 0, 0);
  ctx = g; try { for (const e of list) drawEnemy(e); } finally { ctx = saved; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,70,50,0.5)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.62; ctx.drawImage(Xray.c, 0, 0); ctx.restore();
}

function drawCorpse(c) {
  const t = G.time - c.t0, s = Sprites.get(c.key);
  if (!s) return;
  const fade = Math.max(0, 1 - Math.max(0, t - Sprites.dur(s, 'death') - 2.5) / 1.5);
  const sx = Iso.sx(c.x, c.y), sy = Iso.sy(c.x, c.y), at = c.kind === 'fin' ? t * 1.7 : c.kind === 'blast' && c.z > 0 ? 0 : t; // v1.32 죽는 모습 종류별
  if (c.z > 0) drawShadow(sx, sy, 9);
  ctx.save(); ctx.globalAlpha = fade;
  if (c.kind === 'burn') ctx.filter = `brightness(${Math.max(0.35, 1 - t * 1.4)}) sepia(0.5)`; // 불: 검게 그을림
  if (c.kind === 'blast' && c.z > 0) { const py = Iso.sy(c.x, c.y, c.z); ctx.translate(sx, py - 14); ctx.rotate(t * c.spin); ctx.translate(-sx, -(py - 14)); Sprites.draw(c.key, 'hit', 0, sx, py, c.face, false); }
  else Sprites.draw(c.key, 'death', at, sx, Iso.sy(c.x, c.y, c.z || 0), c.face, false);
  ctx.restore();
  if (c.kind === 'burn' && t < 2.2 && Math.random() < 0.35) G.particles.push({ x: c.x + rand(-6, 6), y: c.y + rand(-6, 6), vx: 0, vy: 0, t: 0, life: 0.6, color: Math.random() < 0.5 ? '#ff8a2a' : '#555', size: rand(2, 4), z: rand(4, 14), vz: 40 });
}
// v1.32 던진 수류탄: 포물선으로 날아감 (떨어질 자리엔 이미 주황 원 예고)
function drawThrown() {
  for (const ef of G.effects) {
    if (ef.type !== 'nade') continue;
    const k = Math.min(1, ef.t / ef.life), x = lerp(ef.x, ef.x2, k), y = lerp(ef.y, ef.y2, k), z = 18 + Math.sin(Math.PI * k) * 90 - k * 18;
    if (k >= 1) continue;
    drawShadow(Iso.sx(x, y), Iso.sy(x, y), 3);
    const sx = Iso.sx(x, y), sy = Iso.sy(x, y, z);
    ctx.fillStyle = '#3a4030'; ctx.beginPath(); ctx.arc(sx, sy, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb040'; ctx.fillRect(sx - 0.8 + Math.cos(G.time * 30) * 2, sy - 0.8 + Math.sin(G.time * 30) * 2, 1.6, 1.6);
  }
}

function drawDrop(d) {
  const air = d.landed ? 0 : d.z || 0, sx = Iso.sx(d.x, d.y), sy = Iso.sy(d.x, d.y, 6 + (d.landed ? Math.sin(G.time * 4 + d.x) * 2 : 0) + air);
  if (air > 2) drawShadow(sx, Iso.sy(d.x, d.y), 5 * Math.max(0.4, 1 - air / 120)); // 공중: 바닥 그림자
  if (d.kind === 'credits') {
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a07a10'; ctx.stroke();
  } else if (d.kind === 'ammo') {
    if (!d.ammo) d.ammo = ammoPick(G.player); // v1.33 떨어질 때 종류가 정해짐 (색으로 구분)
    ctx.fillStyle = '#4a4a2a'; ctx.fillRect(sx - 6, sy - 5, 12, 8);
    ctx.fillStyle = AMMO[d.ammo].color; ctx.fillRect(sx - 4, sy - 3, 8, 3);
  } else {
    const r = d.item.rarity || 0, c = RARITIES[r].color;
    if (r >= 2 && d.landed) { // 희귀 이상: 멀리서도 보이는 빛기둥 (착지 후)
      const gy = Iso.sy(d.x, d.y), hgt = 40 + r * 25;
      const g = ctx.createLinearGradient(0, gy - hgt, 0, gy);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c);
      ctx.globalAlpha = 0.35 + Math.sin(G.time * 4) * 0.1; ctx.fillStyle = g;
      ctx.fillRect(sx - 3 - r, gy - hgt, 6 + r * 2, hgt); ctx.globalAlpha = 1;
    }
    Icons.draw(d.item.key, sx, sy - 8, 20 + (r >= 3 ? 4 : 0)); // v1.5.1 캔버스 아이콘
    if (d.landed) nameTag(sx, sy - 20 - (r >= 3 ? 4 : 0), itemName(d.item), c, r >= 3 ? 'bold 12px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif' : undefined);
  }
}

// 미니맵 (쿼터뷰 방향에 맞춰 회전)
function drawMinimapIso(mm) {
  const g = mm.getContext('2d'), p = G.player, k = 1.25;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, mm.width, mm.height);
  const px = p.x / TILE, py = p.y / TILE;
  g.setTransform(k, k / 2, -k, k / 2, mm.width / 2 - (px - py) * k, mm.height / 2 - (px + py) * k / 2);
  g.imageSmoothingEnabled = false;
  g.drawImage(World.minimapBase, 0, 0);
  const dot = (x, y, c, r) => { g.fillStyle = c; g.fillRect(x / TILE - r / 2, y / TILE - r / 2, r, r); };
  for (const n of G.npcs) dot(n.x, n.y, '#ffd76a', 3);
  for (const e of G.enemies) if (!enemyCloaked(e)) dot(e.x, e.y, e.def.boss ? '#d4f' : '#f44', e.def.boss ? 6 : 2.5); // 은신 중이면 미니맵에도 없음
  if (G.fieldBoss && Math.sin(G.time * 8) > -0.3) dot(G.fieldBoss.x, G.fieldBoss.y, '#ff3020', 8); // 필드 보스 깜빡임
  if (World.bossTile) dot(World.bossTile.x * TILE, World.bossTile.y * TILE, 'rgba(80,255,90,0.85)', 5);
  const lb = World.labBoss; // v1.5 격리실 (키메라를 잡기 전까지 붉은 테두리)
  if (lb && !G.labBossDone) { g.strokeStyle = `rgba(255,50,40,${0.5 + Math.sin(G.time * 5) * 0.3})`; g.lineWidth = 1; g.strokeRect(lb.x0, lb.y0, lb.x1 - lb.x0 + 1, lb.y1 - lb.y0 + 1); }
  if (G.labBoss && G.labBoss.hp > 0) dot(G.labBoss.x, G.labBoss.y, '#ff3020', 7);
  for (const d of G.drops) if (d.kind === 'item' && (d.item.rarity || 0) >= 3 && d.landed && Math.sin(G.time * 7) > -0.2) dot(d.x, d.y, RARITIES[d.item.rarity].color, 5); // 영웅 이상 드랍 위치
  if (G.grave && Math.sin(G.time * 5) > -0.3) { g.fillStyle = '#ff3030'; g.fillRect(G.grave.x / TILE - 0.6, G.grave.y / TILE - 2.5, 1.2, 5); g.fillRect(G.grave.x / TILE - 2.5, G.grave.y / TILE - 0.6, 5, 1.2); } // 시체 가방
  RaidEvents.minimap(g); // v1.10 사건
  Pop.minimap(g); // v1.17 마지막 적들
  if (Math.sin(G.time * 4) > -0.5) for (const e of G.exits || []) { g.strokeStyle = e.locked ? '#ffaa3c' : '#6ef082'; g.lineWidth = 1; g.beginPath(); g.arc(e.x / TILE, e.y / TILE, 3, 0, TAU); g.stroke(); } // 탈출 지점
  for (const h of World.hazards) dot(h.x, h.y, 'rgba(120,255,80,0.6)', 3);
  for (const l of World.landmarks) dot(l.x, l.y, p.found.includes(l.id) ? '#ffd76a' : '#888', 5);
  const tg = Story.target(p); // 현재 목표 (깜빡임)
  if (tg && Math.sin(G.time * 6) > -0.3) { g.strokeStyle = '#ffd76a'; g.lineWidth = 0.8; g.beginPath(); g.arc(tg.x / TILE, tg.y / TILE, 4, 0, TAU); g.stroke(); }
  dot(p.x, p.y, '#fff', 4);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
