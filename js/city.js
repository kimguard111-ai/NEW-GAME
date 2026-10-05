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
        else if (lx === RW && ly === RW && h < 0.6) add('signal', x * TILE + 8, y * TILE + 8, { ph: h * 10 }); // v1.11 교차로 모서리 신호등
        else if (curb && h > 0.3 && h < 0.33) add('bench', x * TILE + 16, y * TILE + 16, { side: lx === RW ? 'x' : 'y' });
        else if (curb && h > 0.4 && h < 0.415) add('hydrant', x * TILE + 16, y * TILE + 16);
        else if (h > 0.935 && h < 0.955) add('paper', x * TILE + 16, y * TILE + 16, { s: h });
        else if (h > 0.965) add('trash', x * TILE + rand2(h, 8, 24), y * TILE + rand2(h * 7, 8, 24), { n: 2 + Math.floor(h * 100) % 3 });
        else if (h > 0.955 && zone >= 1) add('barrel', x * TILE + 16, y * TILE + 16);
      } else if (t === T.RUBBLE && h > 0.9) add('deco', x * TILE + 16, y * TILE + 16, { key: ['rubble_a', 'rubble_b', 'slab', 'debris', 'tires'][Math.floor(h * 1000) % 5] }); // v1.18 잔해 장식 (그림이 있을 때만 보임)
      else if (t === T.WALK && h > 0.88 && h < 0.885) add('deco', x * TILE + 16, y * TILE + 16, { key: 'cart' });
      else if (t === T.GRASS && h < 0.12) add('tree', x * TILE + 16, y * TILE + 16, { dead: zone >= 3, s: 1 + h * 3 });
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
    // v1.10 캠프 소품: NPC마다 일하는 자리 + 모닥불 · 천막 · 발전기 (장식, 충돌 없음)
    if (World.map === 'camp') {
      const c = World.campCenter(), C = (type, dx, dy, extra) => add(type, c.x + dx, c.y + dy, extra);
      C('campfire', 40, 10);
      C('tent', -260, -110, { medic: true }); C('tent', -160, -215, {}); C('tent', 215, -170, { color: 1 }); C('tent', -10, -255, { color: 2 });
      C('crates', -175, -120, { n: 3 }); C('crates', 70, -190, { n: 4 }); C('crates', -60, -175, { n: 2 });
      C('bench', -200, 95); C('maptable', 205, 110); C('radio', 175, -120); C('generator', 255, 30);
      C('crates', 245, 160, { n: 2 });
      for (const [fac, pos] of Object.entries(CAMP_FAC_POS)) C('facility', pos[0], pos[1], { fac }); // v1.13 캠프 시설
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

function burstSpark(x, y) { ctx.fillStyle = '#ffd27a'; for (let i = 0; i < 3; i++) ctx.fillRect(x + Math.sin(G.time * 50 + i) * 5, y - Math.abs(Math.cos(G.time * 37 + i)) * 6, 1.5, 1.5); }
// '#rrggbb' → 'rgba(r,g,b,A)' (조명 색 형식)
function hexA(hex) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`; }
function rand2(h, a, b) { return a + (h * 9301 % 1) * (b - a); }

// v1.18 소품 그림 키 (등록돼 있으면 코드 그림 대신). 차량 그림은 오른쪽 아래(+x)를 향하게 그림 → 세로 차선은 뒤집음
const CITY_ART = { lamp: 'lamp', trash: 'trash', cone: 'cone', barrel: 'barrel', hydrant: 'hydrant', bench: 'bench', signal: 'signal', bus: 'bus', police: 'police',
  tent: 'tent', crates: 'crates', bench_w: 'workbench', maptable: 'maptable', radio: 'radio', campfire: 'campfire', generator: 'generator', deco: null };
function cityArt(o) {
  if (o.type === 'tree') return o.dead ? 'deadtree' : 'tree';
  if (o.type === 'tent' && o.medic) return 'tent_medic';
  if (o.type === 'deco') return o.key;
  if (o.type === 'bench' && World.map === 'camp') return 'workbench'; // 캠프의 bench = 정비 작업대
  return CITY_ART[o.type] || null;
}
// 그림 위에 계속 코드로 얹는 것: 불빛 · 불꽃 · 경광등
function cityArtExtras(o, sx, sy) {
  const K = ISO_K, L = Settings.light && Light.list.length < LIGHT_CAP;
  if (o.type === 'lamp') { const lit = !o.broken || Math.sin(G.time * 17 + o.x) > 0.7; if (lit && L) addLight(sx + (o.side === 'x' ? -14 : 14), sy + 6, 110, 0.75, 'rgba(255,220,150,A)'); }
  else if (o.type === 'barrel' || o.type === 'campfire') {
    const top = o.type === 'barrel' ? sy - 20 * K : sy - 4;
    for (let i = 0; i < 4; i++) { const k = (G.time * 2 + i / 4 + o.x * 0.01) % 1; ctx.fillStyle = `rgba(255,${110 + i * 35},40,${1 - k})`; ctx.beginPath(); ctx.arc(sx + Math.sin(G.time * 5 + i) * 3, top - k * 20, 4.5 * (1 - k) + 2, 0, TAU); ctx.fill(); }
    if (L) addLight(sx, top, o.type === 'campfire' ? 170 : 120, o.type === 'campfire' ? 1 : 0.9, 'rgba(255,140,60,A)');
  } else if (o.type === 'police') {
    const tx = Math.floor(o.x / TILE) * TILE + 16, ty = Math.floor(o.y / TILE) * TILE + 16, blink = Math.sin(G.time * 10 + o.x) > 0, lx = Iso.sx(tx, ty), ly = Iso.sy(tx, ty, 22);
    ctx.fillStyle = blink ? '#ff2a2a' : '#2a6aff'; ctx.fillRect(lx - 3, ly - 3, 6, 3);
    if (L) addLight(lx, ly, 70, 0.6, blink ? 'rgba(255,40,40,A)' : 'rgba(40,100,255,A)');
  } else if (o.type === 'signal') { if (Math.sin(G.time * 3 + o.ph) > 0 && L) addLight(sx - 20, sy - 70 * K, 40, 0.5, 'rgba(255,190,60,A)'); }
  else if (o.type === 'maptable') { if (L) addLight(sx, sy - 16, 60, 0.6, 'rgba(255,220,150,A)'); }
}

function drawCityProp(o) {
  const sx = Iso.sx(o.x, o.y), sy = Iso.sy(o.x, o.y), K = ISO_K;
  const ak = cityArt(o);
  if (ak && propArt(ak)) { // v1.18 그림
    let px = sx, py = sy;
    if (o.type === 'police') { const tx = Math.floor(o.x / TILE) * TILE + 16, ty = Math.floor(o.y / TILE) * TILE + 16; px = Iso.sx(tx, ty); py = Iso.sy(tx, ty); }
    drawShadow(px, py, (ART.propFit[ak] || { w: 40 }).w * 0.4);
    drawPropArt(ak, px, py, o.type === 'bus' || o.type === 'police' ? !!o.vertical : o.type === 'bench' ? o.side === 'x' : false, o.type === 'tree' ? (o.s || 1) : 1);
    if (o.type === 'bus' && o.burnt) burnFx(Math.floor(o.x / TILE), Math.floor(o.y / TILE));
    cityArtExtras(o, sx, sy);
    return;
  }
  if (o.type === 'deco') return; // 장식은 그림이 있을 때만
  switch (o.type) {
    case 'lamp': { // v1.11 받침대 + 굵은 기둥 + 등갓
      const top = sy - 74 * K, dx = o.side === 'x' ? -14 : 14;
      ctx.fillStyle = '#1e2024'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(sx - 2.5, top, 5, sy - top); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sx - 2.5, top, 1.5, sy - top);
      ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, top + 2); ctx.quadraticCurveTo(sx + dx * 0.5, top - 6, sx + dx, top + 1); ctx.stroke(); ctx.lineWidth = 1;
      const lit = !o.broken || Math.sin(G.time * 17 + o.x) > 0.7;
      ctx.fillStyle = '#1a1c20'; ctx.beginPath(); ctx.moveTo(sx + dx - 7, top + 1); ctx.lineTo(sx + dx + 7, top + 1); ctx.lineTo(sx + dx + 4, top + 5); ctx.lineTo(sx + dx - 4, top + 5); ctx.fill();
      ctx.fillStyle = lit ? '#ffe9b0' : '#3a3a3a'; ctx.beginPath(); ctx.ellipse(sx + dx, top + 5, 4, 1.6, 0, 0, TAU); ctx.fill();
      if (lit && Settings.light && Light.list.length < LIGHT_CAP) addLight(sx + dx, sy + 6, 110, 0.75, 'rgba(255,220,150,A)');
      break;
    }
    case 'tree': { // v1.11 굵어지는 줄기 + 명암 있는 잎 덩어리 / 죽은 나무는 갈라진 가지
      const s = o.s || 1;
      drawShadow(sx, sy, 12 * s);
      ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.moveTo(sx - 3 * s, sy); ctx.lineTo(sx - 1.2 * s, sy - 26 * s); ctx.lineTo(sx + 1.2 * s, sy - 26 * s); ctx.lineTo(sx + 3 * s, sy); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(sx, sy - 24 * s, 1.5 * s, 24 * s);
      if (o.dead) {
        ctx.strokeStyle = '#3a2a1e';
        const br = (x, y, a, l, d) => { if (d > 2) return; const ex = x + Math.cos(a) * l, ey = y + Math.sin(a) * l; ctx.lineWidth = (3 - d) * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke(); br(ex, ey, a - 0.45, l * 0.6, d + 1); br(ex, ey, a + 0.4, l * 0.55, d + 1); };
        br(sx, sy - 22 * s, -Math.PI / 2 - 0.5, 12 * s, 0); br(sx, sy - 24 * s, -Math.PI / 2 + 0.45, 11 * s, 0);
      } else {
        for (const [ox, oy, r, c] of [[-8, -30, 11, '#1a331b'], [8, -31, 10, '#1e3a20'], [0, -38, 12, '#244527'], [-5, -44, 9, '#2c5232'], [6, -42, 8, '#2f5a35']]) {
          ctx.fillStyle = c; ctx.beginPath(); ctx.arc(sx + ox * s, sy + oy * s, r * s, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = 'rgba(140,200,120,0.18)'; ctx.beginPath(); ctx.arc(sx - 4 * s, sy - 46 * s, 5 * s, 0, TAU); ctx.fill(); // 빛 받는 쪽
      }
      ctx.lineWidth = 1;
      break;
    }
    case 'trash': // v1.11 묶은 쓰레기봉투 + 흩어진 종이
      for (let i = 0; i < o.n; i++) {
        const bx = sx + (i - 1) * 7, by = sy - 4 - (i % 2) * 2;
        ctx.fillStyle = i % 2 ? '#1a1a1c' : '#26262a'; ctx.beginPath(); ctx.ellipse(bx, by, 7, 5.5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.ellipse(bx - 2, by - 2, 3, 2, -0.4, 0, TAU); ctx.fill();
        ctx.fillStyle = i % 2 ? '#26262a' : '#1a1a1c'; ctx.beginPath(); ctx.moveTo(bx - 2, by - 5); ctx.lineTo(bx + 2, by - 5); ctx.lineTo(bx, by - 8); ctx.fill();
      }
      ctx.fillStyle = 'rgba(200,195,180,0.5)'; ctx.fillRect(sx + 10, sy - 1, 5, 3); ctx.fillRect(sx - 14, sy + 2, 4, 2.5);
      break;
    case 'cone': // v1.11 받침 + 줄무늬
      ctx.fillStyle = '#b04a18'; ctx.beginPath(); ctx.moveTo(sx - 7, sy); ctx.lineTo(sx, sy - 3.5); ctx.lineTo(sx + 7, sy); ctx.lineTo(sx, sy + 3.5); ctx.fill();
      ctx.fillStyle = '#e06020'; ctx.beginPath(); ctx.moveTo(sx, sy - 15); ctx.lineTo(sx - 4.5, sy - 1); ctx.lineTo(sx + 4.5, sy - 1); ctx.fill();
      ctx.fillStyle = '#eee'; ctx.fillRect(sx - 2.8, sy - 9, 5.6, 2); ctx.fillRect(sx - 3.8, sy - 5, 7.6, 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.moveTo(sx, sy - 15); ctx.lineTo(sx + 4.5, sy - 1); ctx.lineTo(sx + 1, sy - 1); ctx.fill();
      break;
    case 'barrel': { // v1.11 원통 드럼통 (테두리 · 녹) + 불
      const r = 8, hh = 20 * K, top = sy - hh;
      ctx.fillStyle = '#4a2a1a'; ctx.fillRect(sx - r, top, r * 2, hh); ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(sx + r * 0.3, top, r * 0.7, hh);
      ctx.strokeStyle = '#2a1810'; ctx.lineWidth = 1.2; for (const k of [0.3, 0.7]) { ctx.beginPath(); ctx.ellipse(sx, top + hh * k, r, r / 2, 0, 0, Math.PI); ctx.stroke(); } ctx.lineWidth = 1;
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(sx - r + 2, top + hh * 0.45, 3, 4); // 녹
      ctx.fillStyle = '#1a0e08'; ctx.beginPath(); ctx.ellipse(sx, top, r, r / 2, 0, 0, TAU); ctx.fill();
      for (let i = 0; i < 4; i++) { const k = (G.time * 2 + i / 4 + o.x * 0.01) % 1; ctx.fillStyle = `rgba(255,${110 + i * 35},40,${1 - k})`; ctx.beginPath(); ctx.arc(sx + Math.sin(G.time * 5 + i) * 3, top - k * 20, 4.5 * (1 - k) + 2, 0, TAU); ctx.fill(); }
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, top, 120, 0.9, 'rgba(255,140,60,A)');
      break;
    }
    case 'signal': { // v1.11 신호등: 기둥 + 길 쪽으로 뻗은 팔 + 깜빡이는 노란불(고장)
      const top = sy - 80 * K;
      ctx.fillStyle = '#26282c'; ctx.fillRect(sx - 2, top, 4, sy - top);
      ctx.strokeStyle = '#26282c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, top + 3); ctx.lineTo(sx - 26, top + 13); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#16181b'; ctx.fillRect(sx - 34, top + 9, 16, 7);
      const on = Math.sin(G.time * 3 + o.ph) > 0;
      ctx.fillStyle = '#3a1010'; ctx.beginPath(); ctx.arc(sx - 30, top + 12.5, 2, 0, TAU); ctx.fill();
      ctx.fillStyle = on ? '#ffc23a' : '#3a2e10'; ctx.beginPath(); ctx.arc(sx - 26, top + 12.5, 2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#10301a'; ctx.beginPath(); ctx.arc(sx - 22, top + 12.5, 2, 0, TAU); ctx.fill();
      if (on && Settings.light && Light.list.length < LIGHT_CAP) addLight(sx - 26, top + 12, 40, 0.5, 'rgba(255,190,60,A)');
      break;
    }
    case 'bench': { // v1.11 벤치 (나무 판 + 쇠다리)
      const [L, Wd] = o.side === 'x' ? [3, 11] : [11, 3];
      for (const k of [-1, 1]) { const lx = o.side === 'x' ? o.x : o.x + k * 8, ly = o.side === 'x' ? o.y + k * 8 : o.y; drawBox(lx - 1, ly - 1, lx + 1, ly + 1, 8, '#222', '#151515', '#1a1a1a', 0, 0, 0); }
      drawBox(o.x - L - 1, o.y - Wd - 1, o.x + L + 1, o.y + Wd + 1, 10, '#6a4a2e', '#4a321e', '#5a3e26', 8, 8, 0);
      const bx = o.side === 'x' ? o.x - L - 1 : o.x, by = o.side === 'x' ? o.y : o.y - Wd - 1; // 등받이
      drawBox(o.side === 'x' ? bx - 1 : o.x - L - 1, o.side === 'x' ? o.y - Wd - 1 : by - 1, o.side === 'x' ? bx + 1 : o.x + L + 1, o.side === 'x' ? o.y + Wd + 1 : by + 1, 18, '#5a3e26', '#3e2a18', '#4a3420', 10, 10, 0);
      break;
    }
    case 'hydrant': // v1.11 소화전
      drawShadow(sx, sy, 5);
      ctx.fillStyle = '#9a1e1e'; ctx.fillRect(sx - 3.5, sy - 13, 7, 13); ctx.fillStyle = '#c42828'; ctx.beginPath(); ctx.ellipse(sx, sy - 13, 3.5, 2.2, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a1414'; ctx.fillRect(sx - 6, sy - 9, 12, 3); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(sx + 1, sy - 13, 2.5, 13);
      break;
    case 'paper': // v1.11 바람에 흩날린 신문지
      for (let i = 0; i < 3; i++) { const a = o.s * 40 + i * 2.1, px = sx + Math.cos(a) * 10, py = sy + Math.sin(a) * 4; ctx.fillStyle = i % 2 ? 'rgba(200,195,175,0.6)' : 'rgba(170,165,150,0.55)'; ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px, py - 2); ctx.lineTo(px + 4, py); ctx.lineTo(px, py + 2); ctx.fill(); }
      break;
    case 'bus': { // v1.11 바퀴 · 창문 칸 · 문 · 지붕 냉방기 · 행선지 표시
      const L = 46, Wd = 13, cols = o.burnt ? ['#2a2420', '#1a1614', '#221d1a'] : o.color ? ['#3a6aa8', '#244a7a', '#2e5a92'] : ['#4a9a52', '#2f6a36', '#3c8244'];
      const [x0, y0, x1, y1] = o.vertical ? [o.x - Wd, o.y - L, o.x + Wd, o.y + L] : [o.x - L, o.y - Wd, o.x + L, o.y + Wd];
      const S = Iso.sx, Y = Iso.sy;
      drawShadow(sx, sy, 44);
      for (const a of [-L + 8, L - 14]) for (const b of [-Wd, Wd - 4]) { const r = o.vertical ? [o.x + b, o.y + a, o.x + b + 4, o.y + a + 6] : [o.x + a, o.y + b, o.x + a + 6, o.y + b + 4]; drawBox(r[0], r[1], r[2], r[3], 8, '#111', '#0a0a0a', '#0e0e0e', 0, 0, 0); }
      drawBox(x0, y0, x1, y1, 40, cols[0], cols[1], cols[2], 5, 5, 0);
      // 옆면 (화면에 보이는 긴 면) 창문 칸 · 문
      const side = (u0, u1, z0, z1, c) => o.vertical ? poly([S(x1, lerp(y0, y1, u0)), Y(x1, lerp(y0, y1, u0), z0), S(x1, lerp(y0, y1, u1)), Y(x1, lerp(y0, y1, u1), z0), S(x1, lerp(y0, y1, u1)), Y(x1, lerp(y0, y1, u1), z1), S(x1, lerp(y0, y1, u0)), Y(x1, lerp(y0, y1, u0), z1)], c)
        : poly([S(lerp(x0, x1, u0), y1), Y(lerp(x0, x1, u0), y1, z0), S(lerp(x0, x1, u1), y1), Y(lerp(x0, x1, u1), y1, z0), S(lerp(x0, x1, u1), y1), Y(lerp(x0, x1, u1), y1, z1), S(lerp(x0, x1, u0), y1), Y(lerp(x0, x1, u0), y1, z1)], c);
      for (let i = 0; i < 6; i++) { const u0 = 0.06 + i * 0.15, broken = !o.burnt && hash2(o.x + i, o.y) < 0.25; side(u0, u0 + 0.12, 22, 34, o.burnt ? '#0a0a0a' : broken ? '#0e1218' : '#1b2430'); if (!o.burnt && !broken) side(u0, u0 + 0.04, 30, 34, 'rgba(160,190,220,0.18)'); }
      side(0.88, 0.97, 6, 34, o.burnt ? '#0d0c0b' : '#151a20'); // 문
      if (!o.burnt) side(0.02, 0.98, 14, 16, 'rgba(255,255,255,0.15)'); // 띠
      const rt = o.vertical ? [o.x - 7, o.y - 12, o.x + 7, o.y + 12] : [o.x - 12, o.y - 7, o.x + 12, o.y + 7];
      drawBox(rt[0], rt[1], rt[2], rt[3], 45, '#8a8e94', '#55585c', '#6a6e72', 40, 40, 0); // 지붕 냉방기
      if (!o.burnt) { // 앞쪽 행선지 표시
        const fz = 34, fe = o.vertical ? y1 : x1;
        if (o.vertical) poly([S(x0 + 4, fe), Y(x0 + 4, fe, fz), S(x1 - 4, fe), Y(x1 - 4, fe, fz), S(x1 - 4, fe), Y(x1 - 4, fe, fz + 4), S(x0 + 4, fe), Y(x0 + 4, fe, fz + 4)], '#d88a1a');
        else poly([S(fe, y0 + 4), Y(fe, y0 + 4, fz), S(fe, y1 - 4), Y(fe, y1 - 4, fz), S(fe, y1 - 4), Y(fe, y1 - 4, fz + 4), S(fe, y0 + 4), Y(fe, y0 + 4, fz + 4)], '#d88a1a');
      }
      if (o.burnt) { burnFx(Math.floor(o.x / TILE), Math.floor(o.y / TILE)); }
      break;
    }
    case 'facility': drawFacility(o); break; // v1.13
    case 'campfire': { // 돌 테두리 + 장작 + 불꽃 + 연기
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.fillStyle = i % 2 ? '#5a5650' : '#6a665e'; ctx.beginPath(); ctx.ellipse(sx + Math.cos(a) * 12, sy + Math.sin(a) * 6, 4, 2.5, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#3a2618'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx - 8, sy + 2); ctx.lineTo(sx + 7, sy - 3); ctx.moveTo(sx - 7, sy - 3); ctx.lineTo(sx + 8, sy + 2); ctx.stroke(); ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const k = (G.time * 1.8 + i / 5) % 1; ctx.fillStyle = `rgba(255,${100 + i * 30},30,${0.9 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(G.time * 6 + i * 2) * 3, sy - 2 - k * 20, 5 * (1 - k) + 1.5, 0, TAU); ctx.fill(); }
      for (let i = 0; i < 3; i++) { const k = (G.time * 0.4 + i / 3) % 1; ctx.fillStyle = `rgba(90,90,95,${0.25 * (1 - k)})`; ctx.beginPath(); ctx.arc(sx + k * 10 + Math.sin(G.time + i) * 4, sy - 22 - k * 40, 4 + k * 8, 0, TAU); ctx.fill(); }
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, sy - 6, 170 + Math.sin(G.time * 9) * 8, 1, 'rgba(255,150,70,A)');
      break;
    }
    case 'tent': { // 삼각 천막 (의무 천막은 흰색 + 붉은 십자)
      const col = o.medic ? ['#d8d8d0', '#a8a8a0', '#bcbcb4'] : [['#4a5a3a', '#2e3a24', '#3c4a30'], ['#5a4a32', '#3a2e1e', '#4a3c28'], ['#3a4a5a', '#24303c', '#2e3c4a']][o.color || 0];
      const L = 30, Wd = 22, Hh = 34, S = Iso.sx, Y = Iso.sy;
      drawShadow(sx, sy, 34);
      const A = [o.x - L, o.y - Wd], B = [o.x + L, o.y - Wd], Cc = [o.x + L, o.y + Wd], D = [o.x - L, o.y + Wd], R0 = [o.x - L, o.y], R1 = [o.x + L, o.y];
      poly([S(...A), Y(...A, 0), S(...B), Y(...B, 0), S(...R1), Y(...R1, Hh), S(...R0), Y(...R0, Hh)], col[2]);  // 뒷면
      poly([S(...D), Y(...D, 0), S(...Cc), Y(...Cc, 0), S(...R1), Y(...R1, Hh), S(...R0), Y(...R0, Hh)], col[0]); // 앞면
      poly([S(...B), Y(...B, 0), S(...Cc), Y(...Cc, 0), S(...R1), Y(...R1, Hh)], col[1]);                         // 옆 삼각
      poly([S(o.x + L, o.y - 7), Y(o.x + L, o.y - 7, 0), S(o.x + L, o.y + 7), Y(o.x + L, o.y + 7, 0), S(o.x + L, o.y), Y(o.x + L, o.y, 20)], '#141210'); // 입구
      if (o.medic) { const mx = S(o.x, o.y + Wd * 0.5), my = Y(o.x, o.y + Wd * 0.5, Hh * 0.5); ctx.fillStyle = '#c82828'; ctx.fillRect(mx - 7, my - 2.5, 14, 5); ctx.fillRect(mx - 2.5, my - 7, 5, 14); }
      break;
    }
    case 'crates': // 나무 상자 더미
      for (let i = 0; i < o.n; i++) {
        const ox = (i % 2) * 18 - 9, oy = Math.floor(i / 2) * 16 - 8, z = i >= 2 && o.n === 3 ? 0 : 0, hh = 14 + (i % 2) * 4;
        drawBox(o.x + ox - 8, o.y + oy - 8, o.x + ox + 8, o.y + oy + 8, z + hh, '#8a6a3e', '#5a4224', '#6e5230', z, z, 0);
        ctx.strokeStyle = 'rgba(40,26,12,0.6)'; ctx.beginPath(); ctx.moveTo(Iso.sx(o.x + ox - 8, o.y + oy + 8), Iso.sy(o.x + ox - 8, o.y + oy + 8, z + hh / 2)); ctx.lineTo(Iso.sx(o.x + ox + 8, o.y + oy + 8), Iso.sy(o.x + ox + 8, o.y + oy + 8, z + hh / 2)); ctx.stroke();
      }
      if (o.n >= 3) drawBox(o.x - 6, o.y - 6, o.x + 6, o.y + 6, 30, '#2e4a2e', '#1c2e1c', '#243a24', 18, 18, 0); // 위에 군용 상자
      break;
    case 'bench': // 정비 작업대: 철판 + 공구 + 바이스
      drawBox(o.x - 22, o.y - 10, o.x + 22, o.y + 10, 18, '#5a5e64', '#34373c', '#44484e', 0, 0, 0);
      ctx.fillStyle = '#c84a2a'; ctx.fillRect(Iso.sx(o.x - 8, o.y) - 5, Iso.sy(o.x - 8, o.y, 18) - 2, 10, 3);
      ctx.fillStyle = '#9a9aa2'; ctx.fillRect(Iso.sx(o.x + 10, o.y) - 2, Iso.sy(o.x + 10, o.y, 18) - 8, 4, 8);
      if (Math.sin(G.time * 2) > 0.85) { burstSpark(sx + 6, Iso.sy(o.x + 10, o.y, 22)); }
      break;
    case 'maptable': { // 작전 탁자: 지도 + 등
      drawBox(o.x - 18, o.y - 14, o.x + 18, o.y + 14, 16, '#6a5238', '#3e2e1c', '#523e28', 0, 0, 0);
      const S = Iso.sx, Y = Iso.sy;
      poly([S(o.x - 13, o.y - 10), Y(o.x - 13, o.y - 10, 16.5), S(o.x + 13, o.y - 10), Y(o.x + 13, o.y - 10, 16.5), S(o.x + 13, o.y + 10), Y(o.x + 13, o.y + 10, 16.5), S(o.x - 13, o.y + 10), Y(o.x - 13, o.y + 10, 16.5)], '#c8b88a');
      ctx.strokeStyle = '#c83a2a'; ctx.beginPath(); ctx.moveTo(S(o.x - 8, o.y), Y(o.x - 8, o.y, 17)); ctx.lineTo(S(o.x + 6, o.y + 4), Y(o.x + 6, o.y + 4, 17)); ctx.stroke();
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, Y(o.x, o.y, 20), 60, 0.6, 'rgba(255,220,150,A)');
      break;
    }
    case 'radio': { // 무전 안테나 + 장비 상자
      drawBox(o.x - 10, o.y - 8, o.x + 10, o.y + 8, 16, '#3a4a3a', '#222c22', '#2c382c', 0, 0, 0);
      const ax = Iso.sx(o.x + 4, o.y), ay = Iso.sy(o.x + 4, o.y, 16);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 60); ctx.stroke(); ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(120,120,120,0.5)'; ctx.beginPath(); ctx.moveTo(ax, ay - 60); ctx.lineTo(ax - 20, ay + 10); ctx.moveTo(ax, ay - 60); ctx.lineTo(ax + 18, ay + 14); ctx.stroke();
      const on = Math.sin(G.time * 4) > 0; ctx.fillStyle = on ? '#40ff70' : '#1a4a24'; ctx.fillRect(Iso.sx(o.x - 4, o.y + 8) - 2, Iso.sy(o.x - 4, o.y + 8, 10) - 2, 4, 3);
      if (Math.sin(G.time * 2.5) > 0.5) { ctx.fillStyle = '#ff3030'; ctx.fillRect(ax - 1.5, ay - 62, 3, 3); }
      break;
    }
    case 'generator': { // 발전기 (덜덜 떨림) + 전선
      const j = Math.sin(G.time * 40) * 0.5;
      drawBox(o.x - 14 + j, o.y - 10, o.x + 14 + j, o.y + 10, 18, '#8a7a2a', '#5a4e18', '#6e6020', 0, 0, 0);
      drawBox(o.x - 4 + j, o.y - 4, o.x + 4 + j, o.y + 4, 24, '#333', '#222', '#2a2a2a', 18, 18, 0);
      if ((G.time * 3) % 1 < 0.5) { ctx.fillStyle = 'rgba(80,80,80,0.3)'; ctx.beginPath(); ctx.arc(Iso.sx(o.x, o.y) + 2, Iso.sy(o.x, o.y, 30) - (G.time * 20 % 10), 4, 0, TAU); ctx.fill(); }
      break;
    }
    case 'police': { // v1.11 흰 차체 + 검은 보닛 + 경광등
      const tx = Math.floor(o.x / TILE) * TILE + 16, ty = Math.floor(o.y / TILE) * TILE + 16;
      drawCarShape(tx, ty, o.vertical, ['#e8e8ec', '#9a9aa2', '#b8b8c0'], hash2(tx, ty), { roof: '#e8e8ec' });
      const blink = Math.sin(G.time * 10 + o.x) > 0, ly = Iso.sy(tx, ty, 20), lx = Iso.sx(tx, ty);
      ctx.fillStyle = '#222'; ctx.fillRect(lx - 7, ly - 1, 14, 3);
      ctx.fillStyle = blink ? '#ff2a2a' : '#3a0a0a'; ctx.fillRect(lx - 6, ly - 3, 5, 3);
      ctx.fillStyle = blink ? '#1a1a3a' : '#2a6aff'; ctx.fillRect(lx + 1, ly - 3, 5, 3);
      ctx.fillStyle = '#1a2a6a'; ctx.fillRect(Iso.sx(tx + (o.vertical ? 8 : 0), ty + (o.vertical ? 0 : 8)) - 4, Iso.sy(tx + (o.vertical ? 8 : 0), ty + (o.vertical ? 0 : 8), 8) - 1.5, 8, 2); // 옆 줄무늬
      if (Settings.light && Light.list.length < LIGHT_CAP) addLight(lx, ly, 70, 0.6, blink ? 'rgba(255,40,40,A)' : 'rgba(40,100,255,A)');
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
