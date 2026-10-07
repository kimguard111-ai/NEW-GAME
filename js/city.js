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
// v1.21 맵마다 지하철역 (이름 · 노선 · 노선 색)
const SUBWAY = { myeongdong: ['명동', '4', '#00a5de'], jongno: ['종각', '1', '#0052a4'], yongsan: ['용산', '1', '#0052a4'], yeouido: ['여의도', '5', '#996cac'],
  gangnam: ['강남', '2', '#00a84d'], jamsil: ['잠실', '2', '#00a84d'] };
const NEON = ['#ff3b5c', '#3bd6ff', '#ff4fd8', '#5dff6a', '#ffd23b', '#ff8a2a'];

const LIGHT_CAP = 36; // 소품·간판 조명은 프레임당 이 개수까지만 (성능)
const City = {
  props: [], signs: new Map(), carSkip: new Set(), busCells: new Set(),

  generate(seed) {
    const W = World.W, H = World.H, rng = mulberry32(seed + 99), T_ = World.tiles, B = World.BLOCK, RW = World.ROADW;
    this.props = []; this.signs = new Map(); this.carSkip = new Set(); this.busCells = new Set();
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
        else if (curb && (lx === RW ? y : x) % 9 === 4 && lx !== ly && h > 0.25) add('pole', x * TILE + 16, y * TILE + 16, { side: lx === RW ? 'x' : 'y', tf: h > 0.8 }); // v1.21 전봇대 (전선은 다음 전봇대까지)
        else if (curb && h > 0.6 && h < 0.615) add('busstop', x * TILE + 16, y * TILE + 16, { side: lx === RW ? 'x' : 'y', n: 100 + Math.floor(h * 9000) % 700 });
        else if (!curb && h > 0.7 && h < 0.708 && (zone === 1 || zone === 2 || zone === 7)) add('pocha', x * TILE + 16, y * TILE + 16, { c: Math.floor(h * 1000) % 2 });
        else if (h > 0.5 && h < 0.507) add('scooter', x * TILE + 16, y * TILE + 16, { a: h * 40 });
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
    }
    // 버스: 도로 한 차선 위 5칸 (v1.21 실제 스케일: 3칸 → 5칸 ≈ 8m · 막힌 칸으로 만들어 엄폐물이 됨)
    for (let n = 0, tries = 0; n < 12 && tries < 600; tries++) {
      const vert = rng() < 0.5, bx = Math.floor(rng() * (W / B)) * B, by = Math.floor(rng() * (H / B)) * B;
      const lane = 1 + Math.floor(rng() * 2), off = RW + 2 + Math.floor(rng() * (B - RW - 8));
      // v1.47.1 버스 폭도 2칸 (그림이 2칸 폭이라 1칸만 막으면 옆구리로 파고들던 것)
      const cells = [];
      for (const w of [0, 1]) for (let k = 0; k < 5; k++) cells.push(vert ? [bx + lane + w, by + off + k] : [bx + off + k, by + lane + w]);
      if (!cells.every(([x, y]) => at(x, y) === T.ROAD && !near(x, y))) continue;
      for (const [x, y] of cells) { T_[y * W + x] = T.CAR; this.carSkip.add(y * W + x); this.busCells.add(y * W + x); }
      const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]), fx = Math.max(...xs), fy = Math.max(...ys);
      add('bus', (Math.min(...xs) + fx + 1) / 2 * TILE, (Math.min(...ys) + fy + 1) / 2 * TILE, { vertical: vert, front: fx + fy, color: rng() < 0.6 ? 0 : 1, burnt: rng() < 0.3 });
      n++;
    }
    // v1.21 승용차·경찰차: 폐차 칸을 차선 방향으로 2칸(≈3.4m)으로 늘려 소품으로 그림
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (T_[i] !== T.CAR || this.carSkip.has(i)) continue;
      const vert = x % B < RW, nx = vert ? x : x + 1, ny = vert ? y + 1 : y, cells = [[x, y]];
      if (at(nx, ny) === T.ROAD && !near(nx, ny)) { T_[ny * W + nx] = T.CAR; cells.push([nx, ny]); }
      for (const [cx, cy] of cells) this.carSkip.add(cy * W + cx);
      const h = hash2(x * 5 + 3, y * 9 + 1), zone = World.zoneIndex(x * TILE, y * TILE), [lx, ly] = cells[cells.length - 1];
      add('car', (x + lx + 1) / 2 * TILE, (y + ly + 1) / 2 * TILE, { vertical: vert, front: lx + ly, len: cells.length, h, police: h < 0.12 && zone >= 1, burnt: isBurningCar(x, y), tx: x, ty: y });
    }
    // v1.21 전봇대끼리 전선 잇기 (같은 줄, 9칸 간격)
    const poles = this.props.filter(p => p.type === 'pole');
    for (const p of poles) p.next = poles.find(q => q !== p && q.side === p.side && (p.side === 'x' ? q.x === p.x && q.y > p.y && q.y - p.y <= 9 * TILE + 1 : q.y === p.y && q.x > p.x && q.x - p.x <= 9 * TILE + 1)) || null;
    // v1.21 지하철 입구: 교차로 근처 보도에 맵마다 3~5곳 (역 이름 · 노선 색)
    if (World.map !== 'camp') {
      const st = SUBWAY[World.map] || SUBWAY.myeongdong;
      for (let n = 0, tries = 0; n < 4 && tries < 400; tries++) {
        const bx = Math.floor(rng() * (W / B)) * B, by = Math.floor(rng() * (H / B)) * B, x = bx + RW + 1 + Math.floor(rng() * 3), y = by + RW;
        if (at(x, y) !== T.WALK || near(x, y) || this.props.some(p => Math.hypot(p.x - (x * TILE + 16), p.y - (y * TILE + 16)) < 60)) continue;
        add('subway', x * TILE + 16, y * TILE + 16, { name: st[0], line: st[1], color: st[2] }); n++;
      }
    } else { const c = World.campCenter(); add('subway', c.x + 300, c.y + 230, { name: '시청', line: '1', color: '#0052a4', line2: '2', color2: '#00a84d' }); }
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
  // v1.47 간판 판 그림: 양 끝(네온 모서리)은 비율 그대로, 가운데만 늘림 — 5:1 판을 2:1 자리에 붙여도 안 찌그러짐
  signArt(kind) { const a = ART.signs && ART.signs[kind]; return a && a.ready ? a : null; },
  draw3(img, [rx, ry, rw, rh], x, y, w, h, vert) {
    if (!vert) { let cs = rh * 0.55, cd = cs * h / rh; if (cd * 2 > w * 0.8) { cd = w * 0.4; }
      ctx.drawImage(img, rx, ry, cs, rh, x, y, cd, h); ctx.drawImage(img, rx + cs, ry, rw - cs * 2, rh, x + cd, y, w - cd * 2, h); ctx.drawImage(img, rx + rw - cs, ry, cs, rh, x + w - cd, y, cd, h); }
    else { let cs = rw * 0.55, cd = cs * w / rw; if (cd * 2 > h * 0.8) { cd = h * 0.4; }
      ctx.drawImage(img, rx, ry, rw, cs, x, y, w, cd); ctx.drawImage(img, rx, ry + cs, rw, rh - cs * 2, x, y + cd, w, h - cd * 2); ctx.drawImage(img, rx, ry + rh - cs, rw, cs, x, y + h - cd, w, cd); }
  },
  drawSign(tx, ty) {
    const s = this.signs.get(ty * World.W + tx);
    if (!s) return;
    const on = !s.flick || Math.sin(G.time * 13 + tx) > -0.6 || Math.sin(G.time * 2.3 + ty) > 0.2; // 고장 난 간판 깜빡임
    const art = this.signArt(s.flick && !s.vert ? 'broken' : s.vert ? 'tall' : 'wide');
    if (art) return this.drawSignArt(s, tx, ty, art, on);
    ctx.save();
    if (s.vert) { // 세로 간판
      const w = 11, h = s.text.length * 12 + 6;
      this.faceTransform(tx, ty, s.face, s.z + h + 10); ctx.translate(TILE - w - 3, 0);
      ctx.fillStyle = '#0d0d10'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = on ? s.color : '#333'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
      ctx.fillStyle = on ? s.color : '#444'; ctx.font = 'bold 10px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
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

  drawSignArt(s, tx, ty, art, on) {
    const n = art.rects.length, v = s.v ?? (s.v = Math.floor(hash2(tx * 7 + 3, ty * 11 + 5) * 997) % n), r = art.rects[v];
    const ink = on ? art.ink[v] : '#3a3632', glow = art.glow && art.glow[v];
    ctx.save();
    if (s.vert) {
      const w = 12, h = s.text.length * 12 + 12;
      this.faceTransform(tx, ty, s.face, s.z + h + 8); ctx.translate(TILE - w - 2, 0);
      if (!on) ctx.globalAlpha = 0.75;
      this.draw3(art.img, r, 0, 0, w, h, true); ctx.globalAlpha = 1;
      ctx.fillStyle = ink; ctx.font = 'bold 9px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      if (on && glow) { ctx.shadowColor = glow; ctx.shadowBlur = 4; }
      [...s.text].forEach((ch, i) => ctx.fillText(ch, w / 2, 6 + i * 12));
    } else {
      const w = TILE - 2, h = 17;
      this.faceTransform(tx, ty, s.face, s.z + h); ctx.translate(1, 0);
      if (!on) ctx.globalAlpha = 0.75;
      if (s.flick) ctx.drawImage(art.img, r[0], r[1], r[2], r[3], 0, -1, w, h + 2); else this.draw3(art.img, r, 0, 0, w, h, false);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink; ctx.font = `bold ${s.text.length >= 4 ? 7 : s.text.length === 3 ? 8.5 : 10}px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (on && glow) { ctx.shadowColor = glow; ctx.shadowBlur = 4; }
      ctx.fillText(s.text, w / 2, h / 2 + 0.5);
    }
    ctx.restore();
    if (on && glow && Settings.light && Light.list.length < LIGHT_CAP) { const x = (tx + (s.face === 's' ? 0.5 : 1)) * TILE, y = (ty + (s.face === 's' ? 1 : 0.5)) * TILE; addLight(Iso.sx(x, y), Iso.sy(x, y, s.z + 8), 46, 0.45, hexA(glow)); }
  },

  // 화면 근처 소품을 깊이 정렬 목록에 넣음
  collect(objs, inView) {
    for (const p of this.props) {
      if (!inView(p.x, p.y)) continue;
      if (p.type === 'bus') { for (let k = 0; k < 5; k++) objs.push({ d: p.front - (4 - k) + 1.1, draw: o => drawBusSlice(o, k), ent: p }); continue; } // v1.48.1 5조각 (긴 버스가 옆 건물 옥상 위로 그려지던 것)
      objs.push({ d: (p.type === 'car' ? p.front + 1 : (p.x + p.y) / TILE) + 0.1, draw: drawCityProp, ent: p });
    }
  },
};

function burstSpark(x, y) { ctx.fillStyle = '#ffd27a'; for (let i = 0; i < 3; i++) ctx.fillRect(x + Math.sin(G.time * 50 + i) * 5, y - Math.abs(Math.cos(G.time * 37 + i)) * 6, 1.5, 1.5); }
// '#rrggbb' → 'rgba(r,g,b,A)' (조명 색 형식)
function hexA(hex) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},A)`; }
function rand2(h, a, b) { return a + (h * 9301 % 1) * (b - a); }

// v1.18 소품 그림 키 (등록돼 있으면 코드 그림 대신). 차량 그림은 오른쪽 아래(+x)를 향하게 그림 → 세로 차선은 뒤집음
const CITY_ART = { lamp: 'lamp', trash: 'trash', cone: 'cone', barrel: 'barrel', hydrant: 'hydrant', bench: 'bench', signal: 'signal', bus: 'bus', police: 'police',
  tent: 'tent', crates: 'crates', bench_w: 'workbench', maptable: 'maptable', radio: 'radio', campfire: 'campfire', generator: 'generator', deco: null,
  pole: 'pole', busstop: 'busstop', pocha: 'pocha', scooter: 'scooter', subway: 'subway' }; // v1.22 서울 거리 소품 그림
function cityArt(o) {
  if (o.type === 'tree') return o.dead ? 'deadtree' : 'tree';
  if (o.type === 'car') { // v1.21 2칸 승용차
    if (o.burnt && propArt('car_burnt')) return 'car_burnt';
    if (o.police) return propArt('police') ? 'police' : null;
    const ks = ['car_a', 'car_b', 'car_c'].filter(k => propArt(k)); return ks.length ? ks[Math.floor(o.h * 97) % ks.length] : null;
  }
  if (o.type === 'tent' && o.medic) return 'tent_medic';
  if (o.type === 'deco') return o.key;
  if (o.type === 'bench' && World.map === 'camp') return 'workbench'; // 캠프의 bench = 정비 작업대
  return CITY_ART[o.type] || null;
}
// v1.22 그림이 있어도 코드로 얹는 것: 전봇대 전선 · 지하철 역 이름 기둥
function poleWires(o, sx, sy) {
  if (!o.next) return; // 다음 전봇대까지 처지는 전선 3가닥
  const K = ISO_K, top = sy - 128 * K, nx = Iso.sx(o.next.x, o.next.y), ny = Iso.sy(o.next.x, o.next.y) - 128 * K;
  ctx.strokeStyle = 'rgba(20,20,22,0.85)'; ctx.lineWidth = 1;
  for (const [ox, oy, sag] of [[-12, 8, 18], [12, 8, 22], [-8, 18, 26]]) { ctx.beginPath(); ctx.moveTo(sx + ox, top + oy); ctx.quadraticCurveTo((sx + nx) / 2 + ox, (top + ny) / 2 + oy + sag, nx + ox, ny + oy); ctx.stroke(); }
}
function subwaySign(o) { // v1.50.8 깨끗한 흰 판 → 폐허에 맞게: 어두운 판 + 위쪽 노선 색 띠 · 기울어짐 · 녹·때 · 바랜 글씨 · 전기는 대부분 끊김 (새것 같아 AI 티 나던 것)
  const S = Iso.sx, Y = Iso.sy, px = S(o.x + 30, o.y - 18), py = Y(o.x + 30, o.y - 18), h = hash2(Math.floor(o.x), Math.floor(o.y));
  ctx.fillStyle = '#25272b'; ctx.fillRect(px - 2, py - 72, 4, 72); ctx.fillStyle = 'rgba(120,70,40,0.5)'; ctx.fillRect(px - 2, py - 30, 4, 12); // 기둥 + 녹
  ctx.save(); ctx.translate(px, py - 82); ctx.rotate((h - 0.5) * 0.16);
  const lines = [[o.line, o.color]].concat(o.line2 ? [[o.line2, o.color2]] : []), w = 34, ht = 18;
  ctx.fillStyle = '#16181b'; ctx.fillRect(-w / 2 - 1, -ht / 2 - 1, w + 2, ht + 2);
  ctx.fillStyle = '#3b4048'; ctx.fillRect(-w / 2, -ht / 2, w, ht);
  ctx.globalAlpha = 0.7; ctx.fillStyle = lines[0][1]; ctx.fillRect(-w / 2, -ht / 2, w, 3); ctx.globalAlpha = 1; // 노선 색 띠
  ctx.fillStyle = 'rgba(110,70,40,0.45)'; ctx.fillRect(-w / 2 + 4 + h * 18, -ht / 2 + 3, 2, ht - 3); ctx.fillRect(-w / 2 + 22 - h * 10, ht / 2 - 5, 7, 3); // 녹 줄 · 때
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-w / 2, ht / 2 - 4, w, 4);
  lines.forEach(([ln, col], i) => { const cx = -w / 2 + 6 + i * 8; ctx.fillStyle = '#16181b'; ctx.beginPath(); ctx.arc(cx, 2, 4.6, 0, TAU); ctx.fill(); ctx.globalAlpha = 0.75; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, 2, 3.8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = '#e6e0d0'; ctx.font = 'bold 6px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ln, cx, 2.3); });
  ctx.fillStyle = 'rgba(214,206,186,0.82)'; ctx.font = '7px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.name, (o.line2 ? 7 : 4), 2.5);
  ctx.restore();
  if (h > 0.72 && Settings.light && Light.list.length < LIGHT_CAP && Math.sin(G.time * 13 + h * 50) > 0.2) addLight(px, py - 82, 34, 0.3, 'rgba(200,220,240,A)'); // 몇 곳만 깜빡이는 고장 난 불
}

// 그림 위에 계속 코드로 얹는 것: 불빛 · 불꽃 · 경광등
function cityArtExtras(o, sx, sy) {
  const K = ISO_K, L = Settings.light && Light.list.length < LIGHT_CAP;
  if (o.type === 'lamp') { const lit = !o.broken || Math.sin(G.time * 17 + o.x) > 0.7; if (lit && L) { const dx = (o.side === 'x' ? -1 : 1) * (propArt('lamp') ? 48 : 22); addLight(sx + dx, sy + 6, 140, 0.75, 'rgba(255,220,150,A)'); if (propArt('lamp')) addLight(sx + dx, sy - 78, 26, 0.9, 'rgba(255,230,170,A)'); } }
  else if (o.type === 'barrel' || o.type === 'campfire') {
    const top = o.type === 'barrel' ? sy - 20 * K : sy - 4;
    for (let i = 0; i < 4; i++) { const k = (G.time * 2 + i / 4 + o.x * 0.01) % 1; ctx.fillStyle = `rgba(255,${110 + i * 35},40,${1 - k})`; ctx.beginPath(); ctx.arc(sx + Math.sin(G.time * 5 + i) * 3, top - k * 20, 4.5 * (1 - k) + 2, 0, TAU); ctx.fill(); }
    if (L) addLight(sx, top, o.type === 'campfire' ? 170 : 120, o.type === 'campfire' ? 1 : 0.9, 'rgba(255,140,60,A)');
  } else if (o.type === 'police') {
    const tx = Math.floor(o.x / TILE) * TILE + 16, ty = Math.floor(o.y / TILE) * TILE + 16, blink = Math.sin(G.time * 10 + o.x) > 0, lx = Iso.sx(tx, ty), ly = Iso.sy(tx, ty, 22);
    ctx.fillStyle = blink ? '#ff2a2a' : '#2a6aff'; ctx.fillRect(lx - 3, ly - 3, 6, 3);
    if (L) addLight(lx, ly, 70, 0.6, blink ? 'rgba(255,40,40,A)' : 'rgba(40,100,255,A)');
  } else if (o.type === 'signal') { if (Math.sin(G.time * 3 + o.ph) > 0 && L) addLight(sx - 26, sy - 100 * K, 40, 0.5, 'rgba(255,190,60,A)'); }
  else if (o.type === 'pole') poleWires(o, sx, sy);
  else if (o.type === 'subway') subwaySign(o);
  else if (o.type === 'maptable') { if (L) addLight(sx, sy - 16, 60, 0.6, 'rgba(255,220,150,A)'); }
}

// v1.48.1 버스는 길이 방향으로 5칸 — 화면 가로 띠로 잘라 칸마다 제 깊이로 그림
function drawBusSlice(o, k) {
  const sx = Iso.sx(o.x, o.y), step = ISO_K * TILE * (o.vertical ? -1 : 1), c = sx + (k - 2) * step;
  let a = c - Math.abs(step) / 2, b = c + Math.abs(step) / 2;
  const lo = o.vertical ? 4 : 0, hi = o.vertical ? 0 : 4; // 화면 왼쪽 끝 · 오른쪽 끝 조각
  if (k === lo) a = -1e4; if (k === hi) b = 1e4;
  ctx.save(); ctx.beginPath(); ctx.rect(a, -1e4, b - a, 2e4); ctx.clip();
  o._noFx = k !== 4; try { drawCityProp(o); } finally { o._noFx = false; ctx.restore(); }
}
function drawCityProp(o) {
  const sx = Iso.sx(o.x, o.y), sy = Iso.sy(o.x, o.y), K = ISO_K;
  const ak = cityArt(o);
  if (ak && propArt(ak)) { // v1.18 그림
    let px = sx, py = sy;
    if (o.type === 'police') { const tx = Math.floor(o.x / TILE) * TILE + 16, ty = Math.floor(o.y / TILE) * TILE + 16; px = Iso.sx(tx, ty); py = Iso.sy(tx, ty); }
    drawShadow(px, py, (ART.propFit[ak] || { w: 40 }).w * 0.4);
    const fade = o.type === 'tree' ? Behind.alpha(o, px, py, (ART.propFit[ak] || { w: 40 }).w * (o.s || 1), (ART.propFit[ak] || { w: 40 }).w * (o.s || 1) * 1.6) // v1.46
      : o.type === 'bus' || o.type === 'car' || o.type === 'police' ? Behind.vehicle(o, ak, px, py) : 1; // v1.47.1 버스·차 뒤에 사람·적이 있으면 반투명
    ctx.globalAlpha = fade;
    drawPropArt(ak, px, py, o.type === 'bus' || o.type === 'police' || o.type === 'car' ? !!o.vertical : o.type === 'bench' || o.type === 'busstop' || o.type === 'lamp' ? o.side === 'x' : false, o.type === 'tree' ? (o.s || 1) : 1);
    ctx.globalAlpha = 1;
    if (o.type === 'car' && o.burnt) burnFx(o.tx, o.ty);
    if (o._noFx) return;
    if (o.type === 'bus' && o.burnt) burnFx(Math.floor(o.x / TILE), Math.floor(o.y / TILE));
    cityArtExtras(o, sx, sy);
    return;
  }
  if (o.type === 'deco') return; // 장식은 그림이 있을 때만
  switch (o.type) {
    case 'lamp': { // v1.11 받침대 + 굵은 기둥 + 등갓
      const top = sy - 118 * K, dx = o.side === 'x' ? -22 : 22; // v1.21 실제 스케일 ≈ 6m
      ctx.fillStyle = '#1e2024'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2c30'; ctx.fillRect(sx - 3, top, 6, sy - top); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sx - 3, top, 1.5, sy - top);
      ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, top + 2); ctx.quadraticCurveTo(sx + dx * 0.5, top - 6, sx + dx, top + 1); ctx.stroke(); ctx.lineWidth = 1;
      const lit = !o.broken || Math.sin(G.time * 17 + o.x) > 0.7;
      ctx.fillStyle = '#1a1c20'; ctx.beginPath(); ctx.moveTo(sx + dx - 7, top + 1); ctx.lineTo(sx + dx + 7, top + 1); ctx.lineTo(sx + dx + 4, top + 5); ctx.lineTo(sx + dx - 4, top + 5); ctx.fill();
      ctx.fillStyle = lit ? '#ffe9b0' : '#3a3a3a'; ctx.beginPath(); ctx.ellipse(sx + dx, top + 5, 4, 1.6, 0, 0, TAU); ctx.fill();
      if (lit && Settings.light && Light.list.length < LIGHT_CAP) addLight(sx + dx, sy + 6, 140, 0.75, 'rgba(255,220,150,A)');
      break;
    }
    case 'tree': { // v1.11 굵어지는 줄기 + 명암 있는 잎 덩어리 / 죽은 나무는 갈라진 가지
      const s = (o.s || 1) * 1.5; // v1.21 실제 스케일 (가로수 ≈ 5~7m)
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
      const top = sy - 112 * K; // v1.21 ≈ 5.5m
      ctx.fillStyle = '#26282c'; ctx.fillRect(sx - 2.5, top, 5, sy - top);
      ctx.strokeStyle = '#26282c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(sx, top + 3); ctx.lineTo(sx - 30, top + 15); ctx.stroke(); ctx.lineWidth = 1;
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
      const L = 80, Wd = 20, Z = 64, k = 1.6, /* v1.21 실제 스케일 ≈ 8m × 2m × 3.2m */ cols = o.burnt ? ['#2a2420', '#1a1614', '#221d1a'] : o.color ? ['#3a6aa8', '#244a7a', '#2e5a92'] : ['#4a9a52', '#2f6a36', '#3c8244'];
      const [x0, y0, x1, y1] = o.vertical ? [o.x - Wd, o.y - L, o.x + Wd, o.y + L] : [o.x - L, o.y - Wd, o.x + L, o.y + Wd];
      const S = Iso.sx, Y = Iso.sy;
      drawShadow(sx, sy, 72);
      for (const a of [-L + 14, L - 26]) for (const b of [-Wd, Wd - 6]) { const r = o.vertical ? [o.x + b, o.y + a, o.x + b + 6, o.y + a + 10] : [o.x + a, o.y + b, o.x + a + 10, o.y + b + 6]; drawBox(r[0], r[1], r[2], r[3], 12, '#111', '#0a0a0a', '#0e0e0e', 0, 0, 0); }
      drawBox(x0, y0, x1, y1, Z, cols[0], cols[1], cols[2], 8, 8, 0);
      // 옆면 (화면에 보이는 긴 면) 창문 칸 · 문
      const side = (u0, u1, z0, z1, c) => o.vertical ? poly([S(x1, lerp(y0, y1, u0)), Y(x1, lerp(y0, y1, u0), z0), S(x1, lerp(y0, y1, u1)), Y(x1, lerp(y0, y1, u1), z0), S(x1, lerp(y0, y1, u1)), Y(x1, lerp(y0, y1, u1), z1), S(x1, lerp(y0, y1, u0)), Y(x1, lerp(y0, y1, u0), z1)], c)
        : poly([S(lerp(x0, x1, u0), y1), Y(lerp(x0, x1, u0), y1, z0), S(lerp(x0, x1, u1), y1), Y(lerp(x0, x1, u1), y1, z0), S(lerp(x0, x1, u1), y1), Y(lerp(x0, x1, u1), y1, z1), S(lerp(x0, x1, u0), y1), Y(lerp(x0, x1, u0), y1, z1)], c);
      for (let i = 0; i < 8; i++) { const u0 = 0.05 + i * 0.105, broken = !o.burnt && hash2(o.x + i, o.y) < 0.25; side(u0, u0 + 0.085, 34, 54, o.burnt ? '#0a0a0a' : broken ? '#0e1218' : '#1b2430'); if (!o.burnt && !broken) side(u0, u0 + 0.03, 48, 54, 'rgba(160,190,220,0.18)'); }
      side(0.9, 0.97, 10, 54, o.burnt ? '#0d0c0b' : '#151a20'); // 문
      if (!o.burnt) side(0.02, 0.98, 22, 25, 'rgba(255,255,255,0.15)'); // 띠
      const rt = o.vertical ? [o.x - 10, o.y - 20, o.x + 10, o.y + 20] : [o.x - 20, o.y - 10, o.x + 20, o.y + 10];
      drawBox(rt[0], rt[1], rt[2], rt[3], Z + 7, '#8a8e94', '#55585c', '#6a6e72', Z, Z, 0); // 지붕 냉방기
      if (!o.burnt) { // 앞쪽 행선지 표시
        const fz = 54, fe = o.vertical ? y1 : x1;
        if (o.vertical) poly([S(x0 + 4, fe), Y(x0 + 4, fe, fz), S(x1 - 4, fe), Y(x1 - 4, fe, fz), S(x1 - 4, fe), Y(x1 - 4, fe, fz + 6), S(x0 + 4, fe), Y(x0 + 4, fe, fz + 6)], '#d88a1a');
        else poly([S(fe, y0 + 4), Y(fe, y0 + 4, fz), S(fe, y1 - 4), Y(fe, y1 - 4, fz), S(fe, y1 - 4), Y(fe, y1 - 4, fz + 6), S(fe, y0 + 4), Y(fe, y0 + 4, fz + 6)], '#d88a1a');
      }
      if (o.burnt) { burnFx(Math.floor(o.x / TILE), Math.floor(o.y / TILE)); }
      break;
    }
    case 'facility': drawFacility(o); break; // v1.13
    case 'pole': { // v1.21 전봇대 + 변압기 + 늘어진 전선 (서울 골목)
      const top = sy - 128 * K, S = Iso.sx, Y = Iso.sy;
      ctx.fillStyle = '#5a5650'; ctx.fillRect(sx - 3, top, 6, sy - top); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(sx - 3, top, 2, sy - top);
      ctx.fillStyle = '#3a3836'; ctx.fillRect(sx - 14, top + 8, 28, 3); ctx.fillRect(sx - 10, top + 18, 20, 2.5);
      if (o.tf) { ctx.fillStyle = '#6a6e74'; ctx.fillRect(sx + 3, top + 26, 9, 14); ctx.fillStyle = '#4a4e54'; ctx.fillRect(sx + 3, top + 26, 9, 3); }
      ctx.fillStyle = '#c8b030'; ctx.fillRect(sx - 3, sy - 26, 6, 10); // 노란 표시띠
      poleWires(o, sx, sy);
      break;
    }
    case 'busstop': { // v1.21 버스 정류장: 지붕 · 뒤 유리판 · 노선 표지판
      const [L, Wd] = o.side === 'x' ? [6, 24] : [24, 6], S = Iso.sx, Y = Iso.sy;
      for (const [px, py] of [[o.x - L, o.y - Wd], [o.x + L, o.y + Wd], [o.x - L, o.y + Wd], [o.x + L, o.y - Wd]]) drawBox(px - 1, py - 1, px + 1, py + 1, 50, '#3a3e44', '#2a2e34', '#32363c', 0, 0, 0);
      if (o.side === 'x') poly([S(o.x - L, o.y - Wd), Y(o.x - L, o.y - Wd, 8), S(o.x - L, o.y + Wd), Y(o.x - L, o.y + Wd, 8), S(o.x - L, o.y + Wd), Y(o.x - L, o.y + Wd, 46), S(o.x - L, o.y - Wd), Y(o.x - L, o.y - Wd, 46)], 'rgba(140,180,200,0.25)');
      else poly([S(o.x - L, o.y - Wd), Y(o.x - L, o.y - Wd, 8), S(o.x + L, o.y - Wd), Y(o.x + L, o.y - Wd, 8), S(o.x + L, o.y - Wd), Y(o.x + L, o.y - Wd, 46), S(o.x - L, o.y - Wd), Y(o.x - L, o.y - Wd, 46)], 'rgba(140,180,200,0.25)');
      drawBox(o.x - L - 3, o.y - Wd - 3, o.x + L + 3, o.y + Wd + 3, 54, '#2a6a4a', '#1a4a32', '#22583e', 50, 50, 0);
      const px = S(o.x + (o.side === 'x' ? L + 8 : -Wd), o.y + (o.side === 'x' ? -Wd : L + 8)), py = Y(o.x + (o.side === 'x' ? L + 8 : -Wd), o.y + (o.side === 'x' ? -Wd : L + 8));
      ctx.fillStyle = '#3a3e44'; ctx.fillRect(px - 1.5, py - 70, 3, 70);
      ctx.fillStyle = '#1f6fbf'; ctx.fillRect(px - 9, py - 78, 18, 14); ctx.fillStyle = '#fff'; ctx.font = 'bold 7px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('정류장', px, py - 74); ctx.fillText(String(o.n), px, py - 67);
      break;
    }
    case 'pocha': { // v1.21 포장마차: 주황 천막 + 플라스틱 의자 (버려진)
      const S = Iso.sx, Y = Iso.sy, c = o.c ? ['#d86a2a', '#a04a1a', '#bc5a22'] : ['#c83a3a', '#902828', '#ac3030'];
      drawBox(o.x - 18, o.y - 12, o.x + 18, o.y + 12, 22, '#5a4a3a', '#3a2e22', '#4a3c2e', 0, 0, 0); // 조리대
      poly([S(o.x - 24, o.y - 18), Y(o.x - 24, o.y - 18, 52), S(o.x + 24, o.y - 18), Y(o.x + 24, o.y - 18, 52), S(o.x + 24, o.y + 18), Y(o.x + 24, o.y + 18, 40), S(o.x - 24, o.y + 18), Y(o.x - 24, o.y + 18, 40)], c[0]);
      poly([S(o.x - 24, o.y + 18), Y(o.x - 24, o.y + 18, 40), S(o.x + 24, o.y + 18), Y(o.x + 24, o.y + 18, 40), S(o.x + 24, o.y + 18), Y(o.x + 24, o.y + 18, 30), S(o.x - 24, o.y + 18), Y(o.x - 24, o.y + 18, 30)], c[1]);
      for (const [dx, dy] of [[-26, 24], [-10, 28], [14, 26]]) { ctx.fillStyle = dx > 0 ? '#3a7ac8' : '#c8402a'; const qx = S(o.x + dx, o.y + dy), qy = Y(o.x + dx, o.y + dy); ctx.fillRect(qx - 3, qy - 8, 6, 2); ctx.fillRect(qx - 2.5, qy - 6, 1.2, 6); ctx.fillRect(qx + 1.3, qy - 6, 1.2, 6); }
      break;
    }
    case 'scooter': { // v1.21 배달 오토바이 + 배달통 (쓰러져 있거나 서 있음)
      const a = o.a % TAU, cx = Math.cos(a) * 12, cy = Math.sin(a) * 12, S = Iso.sx, Y = Iso.sy;
      ctx.strokeStyle = '#1a1a1c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(S(o.x - cx, o.y - cy), Y(o.x - cx, o.y - cy, 5)); ctx.lineTo(S(o.x + cx, o.y + cy), Y(o.x + cx, o.y + cy, 5)); ctx.stroke(); ctx.lineWidth = 1;
      drawBox(o.x - 5, o.y - 5, o.x + 5, o.y + 5, 16, '#c83a2a', '#8a2418', '#a82e20', 4, 4, 0);
      drawBox(o.x - cx * 0.8 - 6, o.y - cy * 0.8 - 6, o.x - cx * 0.8 + 6, o.y - cy * 0.8 + 6, 28, '#e8e2d0', '#a8a290', '#c8c2b0', 14, 14, 0); // 배달통
      break;
    }
    case 'subway': { // v1.21 지하철 입구: 유리 지붕 계단 입구 + 노선 번호 기둥 (역 이름)
      const S = Iso.sx, Y = Iso.sy;
      drawBox(o.x - 26, o.y - 14, o.x + 26, o.y + 14, 10, '#4a4e54', '#2e3236', '#3a3e44', 0, 0, 0);
      poly([S(o.x - 18, o.y + 14), Y(o.x - 18, o.y + 14, 0), S(o.x + 18, o.y + 14), Y(o.x + 18, o.y + 14, 0), S(o.x + 18, o.y + 14), Y(o.x + 18, o.y + 14, 8), S(o.x - 18, o.y + 14), Y(o.x - 18, o.y + 14, 8)], '#0a0b0e'); // 계단 입구
      for (let i = 0; i < 3; i++) poly([S(o.x - 16, o.y + 10 - i * 6), Y(o.x - 16, o.y + 10 - i * 6, 2 - i * 3), S(o.x + 16, o.y + 10 - i * 6), Y(o.x + 16, o.y + 10 - i * 6, 2 - i * 3), S(o.x + 16, o.y + 8 - i * 6), Y(o.x + 16, o.y + 8 - i * 6, 2 - i * 3), S(o.x - 16, o.y + 8 - i * 6), Y(o.x - 16, o.y + 8 - i * 6, 2 - i * 3)], i % 2 ? '#2a2c30' : '#3a3c40');
      drawBox(o.x - 28, o.y - 16, o.x + 28, o.y + 16, 56, 'rgba(160,200,220,0.28)', 'rgba(90,120,140,0.3)', 'rgba(110,140,160,0.3)', 46, 10, 0); // 유리 지붕 + 옆 유리벽 (앞은 트여 계단이 보임)
      for (const dx of [-27, 27]) { const fx = S(o.x + dx, o.y + 15), fy = Y(o.x + dx, o.y + 15, 0); ctx.fillStyle = '#3a4048'; ctx.fillRect(fx - 1.5, fy - 50 * ISO_K, 3, 40 * ISO_K); } // 앞 기둥
      subwaySign(o);
      break;
    }
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
    case 'car': { // v1.21 2칸 승용차 · 경찰차 (실제 스케일 ≈ 3.4m × 1.6m × 1.5m)
      const cols = [['#7b4a32', '#4b2a1a', '#5f3824'], ['#56626e', '#333b44', '#454f5a'], ['#6d6a44', '#43412a', '#575536'], ['#44566a', '#28323e', '#364556'], ['#8a8a86', '#555552', '#6e6e6a'], ['#6a2a2a', '#401818', '#552020']];
      const c = o.burnt ? ['#2a2624', '#171514', '#201d1b'] : o.police ? ['#e8e8ec', '#9a9aa2', '#b8b8c0'] : cols[Math.floor(o.h * cols.length)];
      const L = o.len === 2 ? 30 : 15;
      drawCarShape(o.x, o.y, o.vertical, c, o.h, { burnt: o.burnt, L, W: 13, k: 1.45, roof: o.police ? '#e8e8ec' : undefined });
      if (o.police && !o.burnt) {
        const blink = Math.sin(G.time * 10 + o.x) > 0, lx = sx, ly = Iso.sy(o.x, o.y, 30 * 1.0);
        ctx.fillStyle = '#222'; ctx.fillRect(lx - 8, ly - 1, 16, 3);
        ctx.fillStyle = blink ? '#ff2a2a' : '#3a0a0a'; ctx.fillRect(lx - 7, ly - 3, 6, 3);
        ctx.fillStyle = blink ? '#1a1a3a' : '#2a6aff'; ctx.fillRect(lx + 1, ly - 3, 6, 3);
        if (Settings.light && Light.list.length < LIGHT_CAP) addLight(lx, ly, 80, 0.6, blink ? 'rgba(255,40,40,A)' : 'rgba(40,100,255,A)');
      }
      if (o.burnt) burnFx(o.tx, o.ty);
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
