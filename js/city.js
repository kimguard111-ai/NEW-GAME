// 도시 연출 (v1.2): 한글 네온 간판 · 거리 소품(가로등·나무·쓰레기·고깔·불타는 드럼통·버스·경찰차) · 재 날림
// 맵 생성 끝에 City.generate 가 한 번 배치. 소품은 장식(충돌 없음), 버스·경찰차는 기존 폐차 칸(막힌 칸)을 대신 그림

const SIGN_TEXT = {
  1: ['약국', '명동', '환전', '화장품', '카페', '편의점', '분식', '서울약국'],
  2: ['호프', '치킨', '노래방', '금은방', '한의원', '포차', '당구장', '부동산'],
  3: ['전자', 'PC방', '게임', '모텔', '수리', '24시', '전자상가', '중고'],
  4: ['증권', '은행', '오피스', '방송국', '빌딩', '보험', '병원', '연구소'],
  6: ['강남역', '성형외과', '피부과', '오피스텔', '카페', '라운지', '클럽', '어학원', '타워', '블랙선'], // v1.6 강남
  7: ['잠실', '마트', '놀이공원', '야구장', '호수공원', '치킨', '노래방', '아파트'],            // v1.6 잠실
};
const NEON = ['#ff3b5c', '#3bd6ff', '#ff4fd8', '#5dff6a', '#ffd23b', '#ff8a2a'];

const LIGHT_CAP = 36; // 소품·간판 조명은 프레임당 이 개수까지만 (성능)
const City = {
  props: [], signs: new Map(), carSkip: new Set(),

  generate(seed) {
    const W = World.W, H = World.H, rng = mulberry32(seed + 99), T_ = World.tiles, B = World.BLOCK, RW = World.ROADW;
    this.props = []; this.signs = new Map(); this.carSkip = new Set();
    const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? T.BUILDING : T_[y * W + x]);
    const near = (x, y) => World.distTiles(x * TILE + 16, y * TILE + 16) < World.safeR + 2; // 캠프 안은 비움
    const add = (type, x, y, extra) => this.props.push({ type, x, y, ...extra });
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const t = at(x, y), h = hash2(x * 3 + 7, y * 5 + 11), zone = World.zoneIndex(x * TILE, y * TILE);
      if (near(x, y)) continue;
      if (t === T.WALK) {
        const lx = x % B, ly = y % B, curb = lx === RW || ly === RW; // 도로와 맞닿은 보도
        if (curb && (lx === RW ? y : x) % 7 === 0) add('lamp', x * TILE + 16, y * TILE + 16, { broken: h < 0.35, side: lx === RW ? 'x' : 'y' });
        else if (curb && h < 0.06) add('tree', x * TILE + 16, y * TILE + 16, { dead: zone >= 3 || h < 0.02, s: 0.8 + h * 4 });
        else if (h > 0.965) add('trash', x * TILE + rand2(h, 8, 24), y * TILE + rand2(h * 7, 8, 24), { n: 2 + Math.floor(h * 100) % 3 });
        else if (h > 0.955 && zone >= 1) add('barrel', x * TILE + 16, y * TILE + 16);
      } else if (t === T.GRASS && h < 0.12) add('tree', x * TILE + 16, y * TILE + 16, { dead: zone >= 3, s: 1 + h * 3 });
      else if (t === T.ROAD && h > 0.985) add('cone', x * TILE + 16, y * TILE + 16);
      else if (t === T.CAR && h < 0.12 && zone >= 1) { add('police', x * TILE + 16, y * TILE + 16, { vertical: x % B < RW }); this.carSkip.add(y * W + x); }
    }
    // 버스: 도로 한 차선 위 3칸 (막힌 칸으로 만들어 엄폐물이 됨)
    for (let n = 0, tries = 0; n < 14 && tries < 600; tries++) {
      const vert = rng() < 0.5, bx = Math.floor(rng() * (W / B)) * B, by = Math.floor(rng() * (H / B)) * B;
      const lane = 1 + Math.floor(rng() * 2), off = RW + 2 + Math.floor(rng() * (B - RW - 6));
      const cells = [0, 1, 2].map(k => vert ? [bx + lane, by + off + k] : [bx + off + k, by + lane]);
      if (!cells.every(([x, y]) => at(x, y) === T.ROAD && !near(x, y))) continue;
      for (const [x, y] of cells) { T_[y * W + x] = T.CAR; this.carSkip.add(y * W + x); }
      const [fx, fy] = cells[2];
      add('bus', (cells[0][0] + fx + 1) / 2 * TILE, (cells[0][1] + fy + 1) / 2 * TILE, { vertical: vert, front: fx + fy, color: rng() < 0.6 ? 0 : 1, burnt: rng() < 0.3 });
      n++;
    }
    // 간판: 길가 건물의 남쪽·동쪽 벽 (화면에 보이는 면)
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (at(x, y) !== T.BUILDING || World.height[y * W + x] < 70) continue;
      const h = hash2(x * 13 + 1, y * 17 + 3), zone = Math.max(1, World.zoneIndex(x * TILE, y * TILE));
      const sOpen = at(x, y + 1) === T.WALK || at(x, y + 1) === T.ROAD, eOpen = at(x + 1, y) === T.WALK || at(x + 1, y) === T.ROAD;
      if ((!sOpen && !eOpen) || h > 0.2) continue;
      const words = SIGN_TEXT[zone] || SIGN_TEXT[4], text = words[Math.floor(h * 997) % words.length];
      this.signs.set(y * W + x, { face: sOpen && (!eOpen || h < 0.1) ? 's' : 'e', text, color: NEON[Math.floor(h * 331) % NEON.length],
        vert: text.length >= 3 && h < 0.08, z: 30 + Math.floor(h * 1000) % 3 * 14, flick: h < 0.03 });
    }
  },

  // ---------------- 그리기 ----------------
  // 벽면 위에 2D 그리기: 남쪽면(+x 방향) 또는 동쪽면(-y 방향)을 평면처럼 펼쳐 그림. (0,0) = 왼쪽 위, 아래로 z 감소
  faceTransform(tx, ty, face, ztop) {
    const K = ISO_K;
    if (face === 's') { const x = tx * TILE, y = (ty + 1) * TILE; ctx.translate(Iso.sx(x, y), Iso.sy(x, y, ztop)); ctx.transform(K, K / 2, 0, K, 0, 0); }
    else { const x = (tx + 1) * TILE, y = (ty + 1) * TILE; ctx.translate(Iso.sx(x, y), Iso.sy(x, y, ztop)); ctx.transform(K, -K / 2, 0, K, 0, 0); }
  },
  drawSign(tx, ty) {
    const s = this.signs.get(ty * World.W + tx);
    if (!s) return;
    const on = !s.flick || Math.sin(G.time * 13 + tx) > -0.6 || Math.sin(G.time * 2.3 + ty) > 0.2; // 고장 난 간판 깜빡임
    ctx.save();
    if (s.vert) { // 세로 간판
      const w = 11, h = s.text.length * 12 + 6;
      this.faceTransform(tx, ty, s.face, s.z + h + 10); ctx.translate(TILE - w - 3, 0);
      ctx.fillStyle = '#0d0d10'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = on ? s.color : '#333'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      ctx.fillStyle = on ? s.color : '#444'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      [...s.text].forEach((ch, i) => ctx.fillText(ch, w / 2, 4 + i * 12));
    } else {
      const w = TILE - 2, h = 16;
      this.faceTransform(tx, ty, s.face, s.z + h);
      ctx.translate(1, 0);
      ctx.fillStyle = '#0d0d10'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = on ? s.color : '#333'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      ctx.fillStyle = on ? s.color : '#444'; ctx.font = `bold ${s.text.length >= 4 ? 8 : s.text.length === 3 ? 10 : 12}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.text, w / 2, h / 2 + 0.5);
    }
    ctx.restore();
    if (on && Settings.light && Light.list.length < LIGHT_CAP) { const x = (tx + (s.face === 's' ? 0.5 : 1)) * TILE, y = (ty + (s.face === 's' ? 1 : 0.5)) * TILE; addLight(Iso.sx(x, y), Iso.sy(x, y, s.z + 8), 46, 0.45, hexA(s.color)); }
  },

  // 화면 근처 소품을 깊이 정렬 목록에 넣음
  collect(objs, inView) {
    for (const p of this.props) {
      if (!inView(p.x, p.y)) continue;
      objs.push({ d: (p.type === 'bus' ? p.front + 1 : (p.x + p.y) / TILE) + 0.1, draw: drawCityProp, ent: p });
    }
  },
};

// '#rrggbb' → 'rgba(r,g,b,A)' (조명 색 형식)
function hexA(hex) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`; }
function rand2(h, a, b) { return a + (h * 9301 % 1) * (b - a); }

function drawCityProp(o) {
  const sx = Iso.sx(o.x, o.y), sy = Iso.sy(o.x, o.y), K = ISO_K;
  switch (o.type) {
    case 'lamp': {
      const top = sy - 74 * K;
      ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, top); ctx.stroke();
      const dx = o.side === 'x' ? -12 : 12, dy = 6;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, top); ctx.lineTo(sx + dx, top + dy * 0.3); ctx.stroke(); ctx.lineWidth = 1;
      const lit = !o.broken || Math.sin(G.time * 17 + o.x) > 0.7;
      ctx.fillStyle = lit ? '#ffe9b0' : '#444'; ctx.beginPath(); ctx.ellipse(sx + dx, top + dy * 0.3 + 2, 5, 2.5, 0, 0, TAU); ctx.fill();
      if (lit && Settings.light && Light.list.length < LIGHT_CAP) addLight(sx + dx, sy + 6, 110, 0.75, 'rgba(255,220,150,A)');
      break;
    }
    case 'tree': {
      const s = o.s || 1;
      drawShadow(sx, sy, 10 * s);
      ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 26 * s); ctx.stroke();
      if (o.dead) { // 죽은 나무: 가지만
        ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.5; ctx.beginPath(); ctx.moveTo(sx, sy - 20 * s); ctx.lineTo(sx + Math.cos(a) * 14 * s, sy - 20 * s + Math.sin(a) * 14 * s); ctx.stroke(); }
      } else {
        for (const [ox, oy, r, c] of [[-6, -30, 11, '#1e3a1e'], [6, -32, 10, '#25472a'], [0, -40, 11, '#2c5232']]) {
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + ox * s, sy + oy * s, r * s, 0, TAU); ctx.fill();
        }
      }
      ctx.lineWidth = 1;
      break;
    }
    case 'trash':
      for (let i = 0; i < o.n; i++) { ctx.fillStyle = i % 2 ? '#1a1a1c' : '#26262a'; ctx.beginPath(); ctx.ellipse(sx + (i - 1) * 7, sy - 4 - (i % 2) * 2, 7, 5.5, 0, 0, TAU); ctx.fill(); }
      break;
    case 'cone':
      ctx.fillStyle = '#e06020'; ctx.beginPath(); ctx.moveTo(sx, sy - 14); ctx.lineTo(sx - 5, sy); ctx.lineTo(sx + 5, sy); ctx.fill();
      ctx.fillStyle = '#eee'; ctx.fillRect(sx - 3, sy - 8, 6, 2);
      break;
    case 'barrel': {
      drawBox(o.x - 7, o.y - 7, o.x + 7, o.y + 7, 22, '#2a1a12', '#5a3420', '#6e4228', 0, 0, 0);
      const ft = Iso.sy(o.x, o.y, 22);
      for (let i = 0; i < 3; i++) { const k = (G.time * 2 + i / 3 + o.x * 0.01) % 1; ctx.fillStyle = `rgba(255,${120 + i * 40},40,${1 - k})`; ctx.beginPath(); ctx.arc(sx + Math.sin(G.time * 5 + i) * 3, ft - k * 18, 4 * (1 - k) + 2, 0, TAU); ctx.fill(); }
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, ft, 120, 0.9, 'rgba(255,140,60,A)');
      break;
    }
    case 'bus': {
      const L = 46, Wd = 13, cols = o.burnt ? ['#2a2420', '#1a1614', '#221d1a'] : o.color ? ['#3a6aa8', '#244a7a', '#2e5a92'] : ['#4a9a52', '#2f6a36', '#3c8244'];
      const [x0, y0, x1, y1] = o.vertical ? [o.x - Wd, o.y - L, o.x + Wd, o.y + L] : [o.x - L, o.y - Wd, o.x + L, o.y + Wd];
      drawShadow(sx, sy, 40);
      drawBox(x0, y0, x1, y1, 8, '#111', '#151515', '#151515', 0, 0, 0);                   // 바퀴 높이
      drawBox(x0, y0, x1, y1, 40, cols[0], cols[1], cols[2], 8, 8, 0);                       // 차체
      // 창문 띠
      const S = Iso.sx, Y = Iso.sy;
      if (o.vertical) poly([S(x1, y0 + 6), Y(x1, y0 + 6, 22), S(x1, y1 - 6), Y(x1, y1 - 6, 22), S(x1, y1 - 6), Y(x1, y1 - 6, 34), S(x1, y0 + 6), Y(x1, y0 + 6, 34)], o.burnt ? '#0a0a0a' : '#1b2430');
      else poly([S(x0 + 6, y1), Y(x0 + 6, y1, 22), S(x1 - 6, y1), Y(x1 - 6, y1, 22), S(x1 - 6, y1), Y(x1 - 6, y1, 34), S(x0 + 6, y1), Y(x0 + 6, y1, 34)], o.burnt ? '#0a0a0a' : '#1b2430');
      if (o.burnt) { burnFx(Math.floor(o.x / TILE), Math.floor(o.y / TILE)); }
      break;
    }
    case 'police': {
      const [ix, iy] = o.vertical ? [8, 2] : [2, 8], tx = Math.floor(o.x / TILE) * TILE, ty = Math.floor(o.y / TILE) * TILE;
      drawBox(tx + ix, ty + iy, tx + TILE - ix, ty + TILE - iy, 13, '#e8e8ec', '#9a9aa2', '#b8b8c0', 0, 0, 0);
      drawBox(tx + ix + 3, ty + iy + 6, tx + TILE - ix - 3, ty + TILE - iy - 6, 21, '#1d2024', '#151719', '#1a1c1f', 13, 13, 0);
      const blink = Math.sin(G.time * 10 + o.x) > 0, ly = Iso.sy(o.x, o.y, 23);
      ctx.fillStyle = blink ? '#ff2a2a' : '#3a0a0a'; ctx.fillRect(sx - 6, ly - 2, 5, 3);
      ctx.fillStyle = blink ? '#1a1a3a' : '#2a6aff'; ctx.fillRect(sx + 1, ly - 2, 5, 3);
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, ly, 70, 0.6, blink ? 'rgba(255,40,40,A)' : 'rgba(40,100,255,A)');
      break;
    }
  }
}

// 재 날림 (화면 좌표): 지역마다 색이 다름, 여의도는 초록빛 방사능 먼지
const Ash = {
  list: [],
  draw() {
    if (!Settings.light) return;
    const n = 70;
    while (this.list.length < n) this.list.push({ x: Math.random(), y: Math.random(), v: 0.02 + Math.random() * 0.04, s: 1 + Math.random() * 1.6, ph: Math.random() * 6 });
    const z = G.zone, col = z === 4 ? '150,255,120' : z === 0 ? '200,200,210' : '190,180,170';
    for (const a of this.list) {
      const y = ((a.y + G.time * a.v) % 1 + 1) % 1, x = ((a.x + Math.sin(G.time * 0.6 + a.ph) * 0.015 - G.time * 0.008) % 1 + 1) % 1;
      ctx.fillStyle = `rgba(${col},${0.25 + Math.sin(G.time * 2 + a.ph) * 0.12})`;
      ctx.fillRect(x * VW, y * VH, a.s, a.s);
    }
  },
};
