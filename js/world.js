// 맵 생성 및 지형 쿼리
const T = { ROAD: 0, BUILDING: 1, RUBBLE: 2, CAR: 3, GRASS: 4, CAMP: 5, BARRICADE: 6, WALK: 7, LANDMARK: 8,
  WALL: 9, FLOOR: 10, DOOR: 11, PROP: 12 }; // v0.13 들어갈 수 있는 건물: 외벽·실내 바닥·출입문 · v0.15 실내 소품
const SOLID = new Set([T.BUILDING, T.CAR, T.BARRICADE, T.LANDMARK, T.WALL, T.PROP]);
const SHOP_TILES = new Set([T.WALL, T.FLOOR, T.DOOR, T.PROP]);
// 상가 종류별 실내 소품: style = 배치 방식, h = 높이, c = [윗면, 남쪽면, 동쪽면]
const SHOP_STYLES = {
  shelf:   { h: 40, c: ['#7a6a52', '#4a3e2e', '#5e503c'] },  // 진열대 (긴 줄)
  table:   { h: 22, c: ['#8a6a44', '#54402a', '#6a5236'] },  // 식탁 (한 칸씩)
  counter: { h: 30, c: ['#6a7078', '#3e4248', '#52585e'] },  // 창구·카운터 (문 앞 긴 줄 + 책상)
  desk:    { h: 24, c: ['#3a3e46', '#24272c', '#2e3238'] },  // 컴퓨터 책상 (모니터 불빛)
  washer:  { h: 30, c: ['#c8ccd0', '#8a8e92', '#a8acb0'] },  // 세탁기 (벽 따라)
};
const SHOP_STYLE_OF = { 편의점: 'shelf', 약국: 'shelf', 마트: 'shelf', 서점: 'shelf', 전자상가: 'shelf', 카페: 'table', 분식집: 'table',
  은행: 'counter', 병원: 'counter', 파출소: 'counter', PC방: 'desk', 세탁소: 'washer' };
const FLOOR_H = 36; // 한 층 높이 (v0.13: 24 → 36, 실제 스케일에 가깝게)
const SHOP_NAMES = ['편의점', '약국', '은행', '카페', '병원', '마트', 'PC방', '파출소', '분식집', '전자상가', '서점', '세탁소'];

const World = {
  W: 128, H: 128, BLOCK: 18, ROADW: 4, // v0.11 맵 128 · v0.13 블록 14 → 18 (4차선 도로, 큰 건물)
  tiles: null, shade: null, height: null,
  cx: 64, cy: 64, safeR: 11,
  bossTile: { x: 18, y: 18 },
  landmarks: [], hazards: [], buildings: [], bid: null,

  generate(seed) {
    const W = this.W, H = this.H, B = this.BLOCK;
    const rng = mulberry32(seed);
    this.tiles = new Uint8Array(W * H);
    this.shade = new Float32Array(W * H);
    this.height = new Float32Array(W * H);
    this.bid = new Int16Array(W * H).fill(-1); // 들어갈 수 있는 건물 번호
    this.buildings = [];
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) this.tiles[y * W + x] = t; };

    // 도로와 블록 (v0.13: 블록 18칸 = 4차선 도로 + 보도 1칸 + 건물 부지 12×12)
    const RW = this.ROADW, L0 = RW + 1, L1 = B - 2, bigLots = [];
    for (let by = 0; by < Math.ceil(H / B); by++) {
      for (let bx = 0; bx < Math.ceil(W / B); bx++) {
        const ox = bx * B, oy = by * B;
        for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
          set(ox + x, oy + y, (x < RW || y < RW) ? T.ROAD : T.WALK);
        }
        const kind = rng();
        const shade = rng();
        // 도심(종로·용산)일수록 고층: 기본 3~6층, 도심 블록 일부는 8~12층
        const bz = this.zoneIndex((ox + B / 2) * TILE, (oy + B / 2) * TILE);
        const fillB = (x0, y0, x1, y1, s) => {
          const tall = (bz === 2 || bz === 3) && rng() < 0.3;
          const h = FLOOR_H * (tall ? 8 + Math.floor(rng() * 5) : 3 + Math.floor(rng() * 4));
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            set(ox + x, oy + y, T.BUILDING);
            if (ox + x < W && oy + y < H) { this.shade[(oy + y) * W + ox + x] = s; this.height[(oy + y) * W + ox + x] = h; }
          }
        };
        if (kind < 0.1) {
          // 공원
          for (let y = L0; y <= L1; y++) for (let x = L0; x <= L1; x++) set(ox + x, oy + y, T.GRASS);
        } else if (kind < 0.24) {
          // 붕괴된 건물
          for (let y = L0; y <= L1; y++) for (let x = L0; x <= L1; x++) {
            if (ox + x >= W || oy + y >= H) continue;
            set(ox + x, oy + y, rng() < 0.22 ? T.BUILDING : T.RUBBLE);
            this.shade[(oy + y) * W + ox + x] = shade;
            this.height[(oy + y) * W + ox + x] = 10 + rng() * 34; // 무너진 잔해 벽
          }
        } else if (kind < 0.44) {
          // 두 동 + 골목
          if (rng() < 0.5) { fillB(L0, L0, L0 + 4, L1, shade); fillB(L0 + 7, L0, L1, L1, rng()); }
          else { fillB(L0, L0, L1, L0 + 4, shade); fillB(L0, L0 + 7, L1, L1, rng()); }
        } else if (kind < 0.56) {
          // 작은 건물 4동 + 십자 골목
          fillB(L0, L0, L0 + 4, L0 + 4, shade); fillB(L0 + 7, L0, L1, L0 + 4, rng());
          fillB(L0, L0 + 7, L0 + 4, L1, rng()); fillB(L0 + 7, L0 + 7, L1, L1, shade);
        } else if (rng() < 0.75 && bz >= 1) {
          this.makeShop(ox + L0, oy + L0, ox + L1, oy + L1, shade, rng);
        } else {
          fillB(L0, L0, L1, L1, shade);
        }
        bigLots.push([ox + L0, oy + L0, ox + L1, oy + L1, shade]); // 상가 후보 (지역별 최소 개수 보장용)
      }
    }

    // 도로 위 폐차와 잔해
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = this.tiles[y * W + x];
      if (t === T.ROAD) {
        const r = rng();
        if (r < 0.025) set(x, y, T.CAR);
        else if (r < 0.06) set(x, y, T.RUBBLE);
      }
    }

    // 생존자 캠프
    for (let y = this.cy - 13; y <= this.cy + 13; y++) for (let x = this.cx - 13; x <= this.cx + 13; x++) {
      const d = Math.hypot(x - this.cx, y - this.cy);
      if (d < this.safeR) set(x, y, T.CAMP);
      else if (d < this.safeR + 1.2) {
        // 바리케이드 (네 방향 출입구)
        const gate = Math.abs(x - this.cx) <= 1 || Math.abs(y - this.cy) <= 1;
        set(x, y, gate ? T.CAMP : T.BARRICADE);
      } else if (d < this.safeR + 3) {
        if (this.tiles[y * W + x] === T.BUILDING || this.tiles[y * W + x] === T.CAR) set(x, y, T.RUBBLE);
      }
    }
    // 출입구에서 이어지는 길 확보
    for (let i = this.safeR; i < this.safeR + 8; i++) {
      for (let k = -1; k <= 1; k++) {
        for (const [x, y] of [[this.cx + i, this.cy + k], [this.cx - i, this.cy + k], [this.cx + k, this.cy + i], [this.cx + k, this.cy - i]]) {
          if (SOLID.has(this.tiles[y * W + x])) set(x, y, T.RUBBLE);
        }
      }
    }

    // 보스 아레나
    const bt = this.bossTile;
    for (let y = bt.y - 8; y <= bt.y + 8; y++) for (let x = bt.x - 8; x <= bt.x + 8; x++) {
      const d = Math.hypot(x - bt.x, y - bt.y);
      if (d < 8) set(x, y, d < 2 ? T.GRASS : T.RUBBLE);
    }

    // 랜드마크: 자리와 주변 2칸을 비우고 발판을 고체 타일로
    this.landmarks = LANDMARKS.map(l => ({ ...l, x: (l.tx + l.size / 2) * TILE, y: (l.ty + l.size / 2) * TILE }));
    for (const l of this.landmarks) {
      for (let y = l.ty - 2; y < l.ty + l.size + 2; y++) for (let x = l.tx - 2; x < l.tx + l.size + 2; x++) {
        const inside = x >= l.tx && y >= l.ty && x < l.tx + l.size && y < l.ty + l.size;
        set(x, y, inside ? T.LANDMARK : T.WALK);
      }
    }

    // 여의도 방사능 웅덩이 (지나갈 수 있는 바닥 위)
    this.hazards = [];
    const hr = mulberry32(seed + 77);
    for (let tries = 0; tries < 4000 && this.hazards.length < 18; tries++) {
      const tx = 2 + Math.floor(hr() * (W - 4)), ty = 2 + Math.floor(hr() * (H - 4));
      const px = tx * TILE + 16, py = ty * TILE + 16;
      if (this.zoneIndex(px, py) !== 4 || SOLID.has(this.tiles[ty * W + tx]) || this.bid[ty * W + tx] >= 0) continue;
      if (Math.hypot(tx - this.bossTile.x, ty - this.bossTile.y) < 9) continue;
      if (this.hazards.some(h => Math.hypot(h.x - px, h.y - py) < 260)) continue;
      this.hazards.push({ x: px, y: py, r: 40 + hr() * 40 });
    }

    // 외곽 벽
    for (let i = 0; i < W; i++) { set(i, 0, T.BUILDING); set(i, H - 1, T.BUILDING); }
    for (let i = 0; i < H; i++) { set(0, i, T.BUILDING); set(W - 1, i, T.BUILDING); }
    this.validateShops();
    // 지역마다 상가 최소 3곳: 훼손되지 않은 큰 단독 건물을 상가로 바꿈
    const r2 = mulberry32(seed + 5);
    for (let z = 1; z < ZONES.length; z++) {
      let have = this.buildings.filter(b => this.zoneIndex(b.cx, b.cy) === z).length;
      for (const [x0, y0, x1, y1, sh] of bigLots) {
        if (have >= 3) break;
        if (this.zoneIndex((x0 + x1) / 2 * TILE, (y0 + y1) / 2 * TILE) !== z) continue;
        // 캠프·랜드마크·보스 아레나·기존 상가와 겹치지 않는 부지만
        let ok = x1 < W - 1 && y1 < H - 1 && Math.hypot((x0 + x1) / 2 - this.bossTile.x, (y0 + y1) / 2 - this.bossTile.y) > 16;
        for (const l of this.landmarks) if (x0 <= l.tx + l.size + 2 && x1 >= l.tx - 2 && y0 <= l.ty + l.size + 2 && y1 >= l.ty - 2) ok = false;
        for (let y = y0; y <= y1 && ok; y++) for (let x = x0; x <= x1; x++) {
          const t = this.tiles[y * W + x];
          const dc = this.distTiles(x * TILE, y * TILE), gate = Math.abs(x - this.cx) <= 2 || Math.abs(y - this.cy) <= 2; // 캠프 출입로
          if (this.bid[y * W + x] >= 0 || t === T.CAMP || t === T.BARRICADE || dc < this.safeR + 3.5 || (gate && dc < this.safeR + 9)) { ok = false; break; }
        }
        if (!ok) continue;
        this.makeShop(x0, y0, x1, y1, sh, r2); have++;
      }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (this.tiles[i] === T.BUILDING && !this.height[i]) this.height[i] = 60;
    }

    this.buildMinimap();
  },

  // 들어갈 수 있는 건물: 외벽(WALL) + 실내(FLOOR) + 출입문(DOOR, 남쪽 또는 동쪽 2칸) + 칸막이 벽
  makeShop(x0, y0, x1, y1, shade, rng) {
    const W = this.W, id = this.buildings.length;
    if (x1 >= W - 1 || y1 >= this.H - 1) return;
    const h = FLOOR_H * (2 + Math.floor(rng() * 2));
    const put = (x, y, t) => { const i = y * W + x; this.tiles[i] = t; this.bid[i] = id; this.height[i] = h; this.shade[i] = shade; };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, x === x0 || x === x1 || y === y0 || y === y1 ? T.WALL : T.FLOOR);
    // 칸막이: 가운데 세로 벽 + 한쪽 방에 가로 벽 (각각 2칸 통로)
    const mx = x0 + 4 + Math.floor(rng() * (x1 - x0 - 7)), gy = y0 + 2 + Math.floor(rng() * (y1 - y0 - 4));
    for (let y = y0 + 1; y < y1; y++) if (y !== gy && y !== gy + 1) put(mx, y, T.WALL);
    const left = rng() < 0.5, my = y0 + 4 + Math.floor(rng() * (y1 - y0 - 7));
    const ax = left ? x0 + 1 : mx + 1, bx2 = left ? mx - 1 : x1 - 1, gx = ax + Math.floor(rng() * Math.max(1, bx2 - ax - 1));
    for (let x = ax; x <= bx2; x++) if (x !== gx && x !== gx + 1) put(x, my, T.WALL);
    // 출입문: 화면에서 보이는 남쪽 또는 동쪽 벽 가운데
    const south = rng() < 0.5, door = [];
    if (south) { const dx = Math.floor((x0 + x1) / 2); door.push([dx, y1], [dx + 1, y1]); }
    else { const dy = Math.floor((y0 + y1) / 2); door.push([x1, dy], [x1, dy + 1]); }
    for (const [x, y] of door) {
      put(x, y, T.DOOR);
      for (let k = 1; k <= 2; k++) put(south ? x : x - k, south ? y - k : y, T.FLOOR); // 문 안쪽 2칸은 항상 비움 (칸막이와 겹침 방지)
    }
    // 실내 소품 (v0.15): 길을 막으면 그 줄은 취소
    const name = SHOP_NAMES[Math.floor(rng() * SHOP_NAMES.length)], style = SHOP_STYLE_OF[name];
    this.placeProps(id, x0, y0, x1, y1, door, style, rng, h);
    // 보급 상자 2~3개 (출입문에서 먼 실내 바닥)
    const crates = [];
    for (let tries = 0; tries < 60 && crates.length < 2 + (rng() < 0.5 ? 1 : 0); tries++) {
      const cx = x0 + 1 + Math.floor(rng() * (x1 - x0 - 1)), cy = y0 + 1 + Math.floor(rng() * (y1 - y0 - 1));
      if (this.tiles[cy * W + cx] !== T.FLOOR || Math.hypot(cx - door[0][0], cy - door[0][1]) < 4 || crates.some(c => Math.abs(c.tx - cx) + Math.abs(c.ty - cy) < 3)) continue;
      crates.push({ tx: cx, ty: cy, x: cx * TILE + 16, y: cy * TILE + 16, openT: -1e9 });
    }
    this.buildings.push({ id, x0, y0, x1, y1, h, south, door, crates, name, style,
      doorX: (door[0][0] + door[1][0] + 1) / 2 * TILE, doorY: (door[0][1] + door[1][1] + 1) / 2 * TILE, spawnT: -1e9,
      cx: (x0 + x1 + 1) / 2 * TILE, cy: (y0 + y1 + 1) / 2 * TILE });
  },
  placeProps(id, x0, y0, x1, y1, door, style, rng, roofH) {
    const W = this.W, S = SHOP_STYLES[style], runs = [];
    const nearDoor = (x, y) => door.some(([dx, dy]) => Math.abs(dx - x) + Math.abs(dy - y) <= 2);
    if (style === 'shelf') for (let y = y0 + 2; y < y1 - 1; y += 3) for (let x = x0 + 2; x < x1 - 2; x += 4) runs.push([[x, y], [x + 1, y], [x + 2, y]]);
    if (style === 'table') for (let y = y0 + 2; y < y1 - 1; y += 3) for (let x = x0 + 2; x < x1 - 1; x += 3) runs.push([[x, y]]);
    if (style === 'desk') for (let y = y0 + 2; y < y1 - 1; y += 2) for (let x = x0 + 2; x < x1 - 2; x += 4) runs.push([[x, y], [x + 1, y]]);
    if (style === 'washer') { for (let x = x0 + 2; x < x1 - 1; x++) runs.push([[x, y0 + 1]]); for (let y = y0 + 3; y < y1 - 1; y++) runs.push([[x0 + 1, y]]); }
    if (style === 'counter') {
      const [dx, dy] = door[0], south = dy === y1;
      runs.counterAt = runs.length; // 창구: 문에서 3~6칸 안쪽 중 먼저 들어가는 줄 하나
      for (const k of [4, 3, 5, 6]) runs.push(south ? [[dx - 2, dy - k], [dx - 1, dy - k], [dx, dy - k], [dx + 1, dy - k]] : [[dx - k, dy - 2], [dx - k, dy - 1], [dx - k, dy], [dx - k, dy + 1]]);
      for (let y = y0 + 2; y < y1 - 1; y += 4) for (let x = x0 + 2; x < x1 - 1; x += 4) runs.push([[x, y]]);
    }
    // 출입문에서 실내 바닥 전체가 이어지는지 (소품 배치 후 확인)
    const connected = () => {
      const seen = new Set(), q = [door[0]];
      while (q.length) {
        const [x, y] = q.pop(), k = y * W + x;
        if (seen.has(k)) continue; seen.add(k);
        for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ax, ny = y + ay, t = this.tiles[ny * W + nx];
          if (this.bid[ny * W + nx] === id && (t === T.FLOOR || t === T.DOOR)) q.push([nx, ny]);
        }
      }
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (this.tiles[y * W + x] === T.FLOOR && !seen.has(y * W + x)) return false;
      return true;
    };
    let counterDone = false;
    for (let ri = 0; ri < runs.length; ri++) {
      const run = runs[ri], isCounter = runs.counterAt !== undefined && ri >= runs.counterAt && ri < runs.counterAt + 4;
      if (isCounter && counterDone) continue;
      if (!isCounter && rng() < 0.15) continue; // 조금씩 비워 폐허 느낌
      if (!run.every(([x, y]) => this.tiles[y * W + x] === T.FLOOR && this.bid[y * W + x] === id && !nearDoor(x, y))) continue;
      for (const [x, y] of run) { this.tiles[y * W + x] = T.PROP; this.height[y * W + x] = S.h; }
      if (!connected()) for (const [x, y] of run) { this.tiles[y * W + x] = T.FLOOR; this.height[y * W + x] = roofH; }
      else if (isCounter) counterDone = true;
    }
  },
  // 캠프·랜드마크·아레나에 덮여 훼손된 건물은 일반 건물/잔해로 바꿈
  validateShops() {
    const W = this.W, keep = [];
    for (const b of this.buildings) {
      let ok = true;
      for (let y = b.y0; y <= b.y1 && ok; y++) for (let x = b.x0; x <= b.x1; x++) {
        const t = this.tiles[y * W + x];
        if (this.bid[y * W + x] !== b.id || !SHOP_TILES.has(t)) { ok = false; break; }
      }
      if (ok) { keep.push(b); continue; }
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
        const i = y * W + x;
        if (this.bid[i] !== b.id) continue;
        this.bid[i] = -1;
        if (SHOP_TILES.has(this.tiles[i])) this.tiles[i] = T.RUBBLE;
      }
    }
    keep.forEach((b, i) => { // 번호 다시 매김
      for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) this.bid[y * W + x] = i;
      b.id = i;
    });
    this.buildings = keep;
  },
  // 위치가 속한 건물 (실내·출입문·외벽), 없으면 null
  buildingAt(px, py) {
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return null;
    const i = this.bid[ty * this.W + tx];
    return i >= 0 ? this.buildings[i] : null;
  },

  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return T.BUILDING;
    return this.tiles[ty * this.W + tx];
  },
  solidAt(px, py) { return SOLID.has(this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE))); },

  // 원형 충돌체가 벽과 겹치는지
  circleBlocked(x, y, r) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (!SOLID.has(this.tileAt(tx, ty))) continue;
      const nx = clamp(x, tx * TILE, tx * TILE + TILE), ny = clamp(y, ty * TILE, ty * TILE + TILE);
      if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
    }
    return false;
  },

  // 축 분리 이동 (벽 미끄러짐)
  move(ent, dx, dy) {
    let moved = false;
    if (dx && !this.circleBlocked(ent.x + dx, ent.y, ent.r)) { ent.x += dx; moved = true; }
    if (dy && !this.circleBlocked(ent.x, ent.y + dy, ent.r)) { ent.y += dy; moved = true; }
    return moved;
  },

  lineOfSight(a, b) {
    const d = dist(a, b), steps = Math.ceil(d / 12);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.solidAt(lerp(a.x, b.x, t), lerp(a.y, b.y, t))) return false;
    }
    return true;
  },

  distTiles(px, py) { return Math.hypot(px / TILE - this.cx, py / TILE - this.cy); },
  zoneIndex(px, py) {
    const d = this.distTiles(px, py);
    for (let i = 0; i < ZONES.length; i++) if (d < ZONES[i].maxDist) return i;
    return ZONES.length - 1;
  },
  inSafe(px, py) { return this.distTiles(px, py) < this.safeR + 1.5; },
  campCenter() { return { x: this.cx * TILE + TILE / 2, y: this.cy * TILE + TILE / 2 }; },

  buildMinimap() {
    const c = document.createElement('canvas');
    c.width = this.W; c.height = this.H;
    const g = c.getContext('2d');
    const img = g.createImageData(this.W, this.H);
    const col = {
      [T.ROAD]: [45, 47, 52], [T.BUILDING]: [95, 92, 88], [T.RUBBLE]: [70, 64, 56], [T.CAR]: [110, 60, 40],
      [T.GRASS]: [48, 70, 40], [T.CAMP]: [60, 90, 120], [T.BARRICADE]: [140, 110, 60], [T.WALK]: [62, 62, 66],
      [T.LANDMARK]: [200, 170, 90], [T.WALL]: [120, 100, 80], [T.FLOOR]: [80, 68, 56], [T.DOOR]: [230, 200, 110], [T.PROP]: [96, 84, 70],
    };
    for (let i = 0; i < this.tiles.length; i++) {
      const c3 = col[this.tiles[i]];
      img.data[i * 4] = c3[0]; img.data[i * 4 + 1] = c3[1]; img.data[i * 4 + 2] = c3[2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // 지역 경계
    g.strokeStyle = 'rgba(224,178,58,0.35)';
    for (let i = 1; i < ZONES.length - 1; i++) {
      g.beginPath(); g.arc(this.cx, this.cy, ZONES[i].maxDist, 0, TAU); g.stroke();
    }
    this.minimapBase = c;
  },
};
