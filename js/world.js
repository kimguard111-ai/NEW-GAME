// 맵 생성 및 지형 쿼리
const T = { ROAD: 0, BUILDING: 1, RUBBLE: 2, CAR: 3, GRASS: 4, CAMP: 5, BARRICADE: 6, WALK: 7, LANDMARK: 8,
  WALL: 9, FLOOR: 10, DOOR: 11, PROP: 12, // v0.13 들어갈 수 있는 건물: 외벽·실내 바닥·출입문 · v0.15 실내 소품
  LWALL: 13, LFLOOR: 14, LPROP: 15, // v1.5 연구소 벽·바닥·실험 장비
  WATER: 16 }; // v1.6 얕은 물 (석촌호수): 지나갈 수 있지만 느려짐, 총알은 통과
const SOLID = new Set([T.BUILDING, T.CAR, T.BARRICADE, T.LANDMARK, T.WALL, T.PROP, T.LWALL, T.LPROP]);
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
const FLOOR_H = 54; // 한 층 높이 (v0.13: 24 → 36 · v1.21 → 54 = 2.7m, 1m = 20단위 실제 스케일)
const SHOP_NAMES = ['편의점', '약국', '은행', '카페', '병원', '마트', 'PC방', '파출소', '분식집', '전자상가', '서점', '세탁소'];

const World = {
  W: 72, H: 72, BLOCK: 18, ROADW: 4, // v0.13 블록 18 (4차선 도로, 큰 건물) · v1.3 맵마다 크기 다름 (MAPS)
  tiles: null, shade: null, height: null,
  cx: 20, cy: 20, safeR: 11,
  map: 'camp', def: null, edgePts: [],
  bossTile: null,
  landmarks: [], hazards: [], buildings: [], bid: null,
  rooms: [], alarms: [], labBoss: null, // v1.5 연구소: 방 · 비상등 · 보스 방

  generate(mapId) {
    const def = MAPS[mapId];
    this.map = mapId; this.def = def; this.W = this.H = def.size; this.cx = this.cy = Math.floor(def.size / 2);
    this.bossTile = def.boss ? { x: 18, y: 18 } : null;
    this.rooms = []; this.alarms = []; this.labBoss = null;
    if (def.lab) return this.generateLab(def);
    const seed = def.seed, W = this.W, H = this.H, B = this.BLOCK;
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
        const bz = def.zone;
        const fillB = (x0, y0, x1, y1, s) => {
          const tall = def.tall ? rng() < def.tall[0] : (bz === 2 || bz === 3) && rng() < 0.3; // v1.6 강남: 유리 고층 빌딩 숲
          const h = FLOOR_H * (tall ? (def.tall ? def.tall[1] + Math.floor(rng() * def.tall[2]) : 6 + Math.floor(rng() * 4)) : 3 + Math.floor(rng() * 4)); // v1.21 층이 높아진 만큼 고층 층수 ↓ (8~12 → 6~9)
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            set(ox + x, oy + y, T.BUILDING);
            if (ox + x < W && oy + y < H) { this.shade[(oy + y) * W + ox + x] = s; this.height[(oy + y) * W + ox + x] = h; }
          }
        };
        // v1.49.10 건물 블록 ↓ · 트인 블록 ↑ (공원 10→14% · 광장 주차장 새로 13% · 무너진 터 14→12% · 큰 건물 한 덩어리·상가 44→34%) — 빽빽해서 시야가 막히던 것
        if (kind < 0.14) {
          // 공원
          for (let y = L0; y <= L1; y++) for (let x = L0; x <= L1; x++) set(ox + x, oy + y, T.GRASS);
        } else if (kind < 0.27) {
          // 광장 · 주차장: 보도 바닥 + 버려진 차 몇 대 (엄폐물)
          for (let y = L0; y <= L1; y++) for (let x = L0; x <= L1; x++) set(ox + x, oy + y, (x - L0) % 4 === 1 && (y - L0) % 3 === 1 && rng() < 0.35 ? T.CAR : T.WALK);
        } else if (kind < 0.39) {
          // 붕괴된 건물
          for (let y = L0; y <= L1; y++) for (let x = L0; x <= L1; x++) {
            if (ox + x >= W || oy + y >= H) continue;
            const edge = x === L0 || x === L1 || y === L0 || y === L1; // v1.49.4 막힌 잔해 더미는 가장자리 위주 · 안쪽은 드문드문 (22% 무작위 → 싸움터가 미로 같던 것)
            set(ox + x, oy + y, rng() < (edge ? 0.2 : 0.04) ? T.BUILDING : T.RUBBLE);
            this.shade[(oy + y) * W + ox + x] = shade;
            this.height[(oy + y) * W + ox + x] = 10 + rng() * 34; // 무너진 잔해 벽
          }
        } else if (kind < 0.55) {
          // 두 동 + 골목
          if (rng() < 0.5) { fillB(L0, L0, L0 + 4, L1, shade); fillB(L0 + 7, L0, L1, L1, rng()); }
          else { fillB(L0, L0, L1, L0 + 4, shade); fillB(L0, L0 + 7, L1, L1, rng()); }
        } else if (kind < 0.66) {
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

    // 생존자 캠프 (거점 맵에만): 바리케이드로 둘러싼 광장, 바깥은 폐허 풍경
    if (mapId === 'camp') {
      for (let y = this.cy - 13; y <= this.cy + 13; y++) for (let x = this.cx - 13; x <= this.cx + 13; x++) {
        const d = Math.hypot(x - this.cx, y - this.cy);
        if (d < this.safeR) set(x, y, T.CAMP);
        else if (d < this.safeR + 1.2) set(x, y, T.BARRICADE);
        else if (d < this.safeR + 3 && (this.tiles[y * W + x] === T.BUILDING || this.tiles[y * W + x] === T.CAR)) set(x, y, T.RUBBLE);
      }
      // v1.24 카메라 쪽(남·동) 건물이 광장의 NPC를 가리지 않게 낮춤 (2층)
      for (let y = this.cy - 22; y <= this.cy + 22; y++) for (let x = this.cx - 22; x <= this.cx + 22; x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || this.tiles[y * W + x] !== T.BUILDING) continue;
        if ((x - this.cx) + (y - this.cy) > 2) this.height[y * W + x] = Math.min(this.height[y * W + x], FLOOR_H * 2);
      }
    }

    // v1.6 석촌호수 (잠실): 맵 남동쪽 타원 호수 + 물가 산책로. 걸쳐진 상가는 validateShops 가 잔해로 바꿈
    if (def.lake) {
      const lx = W * 0.7, ly = H * 0.68, rx = 11, ry = 8;
      for (let y = Math.floor(ly - ry - 3); y <= ly + ry + 3; y++) for (let x = Math.floor(lx - rx - 3); x <= lx + rx + 3; x++) {
        const d = Math.hypot((x - lx) / rx, (y - ly) / ry);
        if (d < 1) { set(x, y, T.WATER); if (x >= 0 && y >= 0 && x < W && y < H) this.height[y * W + x] = 0; }
        else if (d < 1.28) set(x, y, T.WALK);
      }
    }

    // 보스 아레나 (여의도)
    const bt = this.bossTile;
    if (bt) for (let y = bt.y - 8; y <= bt.y + 8; y++) for (let x = bt.x - 8; x <= bt.x + 8; x++) {
      const d = Math.hypot(x - bt.x, y - bt.y);
      if (d < 8) set(x, y, d < 2 ? T.GRASS : T.RUBBLE);
    }

    // 랜드마크: 자리와 주변 2칸을 비우고 발판을 고체 타일로
    // 맵의 랜드마크 하나를 맵 가운데에
    this.landmarks = LANDMARKS.filter(l => l.id === def.landmark).map(l => {
      const tx = Math.floor(W / 2 - l.size / 2), ty = Math.floor(H / 2 - l.size / 2);
      return { ...l, tx, ty, x: (tx + l.size / 2) * TILE, y: (ty + l.size / 2) * TILE };
    });
    for (const l of this.landmarks) {
      for (let y = l.ty - 2; y < l.ty + l.size + 2; y++) for (let x = l.tx - 2; x < l.tx + l.size + 2; x++) {
        const inside = x >= l.tx && y >= l.ty && x < l.tx + l.size && y < l.ty + l.size;
        set(x, y, inside ? T.LANDMARK : T.WALK);
      }
    }

    // 여의도 방사능 웅덩이 (지나갈 수 있는 바닥 위)
    this.hazards = [];
    const hr = mulberry32(seed + 77);
    for (let tries = 0; tries < 4000 && def.hazards && this.hazards.length < 16; tries++) {
      const tx = 2 + Math.floor(hr() * (W - 4)), ty = 2 + Math.floor(hr() * (H - 4));
      const px = tx * TILE + 16, py = ty * TILE + 16;
      if (SOLID.has(this.tiles[ty * W + tx]) || this.bid[ty * W + tx] >= 0) continue;
      if (bt && Math.hypot(tx - bt.x, ty - bt.y) < 9) continue;
      if (Math.hypot(tx - W / 2, ty - H / 2) < 8) continue; // 랜드마크 앞은 비움
      if (this.hazards.some(h => Math.hypot(h.x - px, h.y - py) < 260)) continue;
      this.hazards.push({ x: px, y: py, r: 40 + hr() * 40 });
    }

    // 외곽 벽
    for (let i = 0; i < W; i++) { set(i, 0, T.BUILDING); set(i, H - 1, T.BUILDING); }
    for (let i = 0; i < H; i++) { set(0, i, T.BUILDING); set(W - 1, i, T.BUILDING); }
    this.validateShops();
    // 출격 맵마다 상가 최소 3곳: 랜드마크·보스 아레나와 겹치지 않는 부지를 상가로
    const r2 = mulberry32(seed + 5);
    let have = this.buildings.length;
    for (const [x0, y0, x1, y1, sh] of bigLots) {
      if (mapId === 'camp' || have >= 3) break;
      let ok = x1 < W - 1 && y1 < H - 1 && (!bt || Math.hypot((x0 + x1) / 2 - bt.x, (y0 + y1) / 2 - bt.y) > 16);
      for (const l of this.landmarks) if (x0 <= l.tx + l.size + 2 && x1 >= l.tx - 2 && y0 <= l.ty + l.size + 2 && y1 >= l.ty - 2) ok = false;
      for (let y = y0; y <= y1 && ok; y++) for (let x = x0; x <= x1; x++) if (this.bid[y * W + x] >= 0) { ok = false; break; }
      if (!ok) continue;
      this.makeShop(x0, y0, x1, y1, sh, r2); have++;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (this.tiles[i] === T.BUILDING && !this.height[i]) this.height[i] = 60;
    }
    this.makeEdgePoints();
    City.generate(seed); // v1.2 간판·거리 소품·버스

    this.buildMinimap();
  },

  // v1.5 지하 연구소: 격자마다 방 하나 → 이웃 방을 3칸 복도로 잇는 신장 트리 + 고리 몇 개
  // 출격마다 구조가 바뀜 (seed 무작위). 가장자리 쪽 방 4개 = 비상 계단(시작·탈출), 가운데 방 = 키메라 격리실
  generateLab(def) {
    const W = this.W, H = this.H, rng = mulberry32((def.seed * 7919 + Math.floor(Math.random() * 1e6)) >>> 0);
    this.tiles = new Uint8Array(W * H).fill(T.LWALL);
    this.shade = new Float32Array(W * H);
    this.height = new Float32Array(W * H);
    this.bid = new Int16Array(W * H).fill(-1);
    this.buildings = []; this.landmarks = []; this.hazards = [];
    const set = (x, y, t) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) this.tiles[y * W + x] = t; };
    const CELL = 16, N = Math.floor((W - 2) / CELL), grid = [];
    const bgx = (N >> 1) - (rng() < 0.5 ? 1 : 0), bgy = (N >> 1) - (rng() < 0.5 ? 1 : 0); // 격리실 칸 (가운데 넷 중 하나)
    for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
      const center = gx === bgx && gy === bgy;
      const rw = center ? 13 : 7 + Math.floor(rng() * 6), rh = center ? 13 : 7 + Math.floor(rng() * 6);
      const x0 = 1 + gx * CELL + 1 + Math.floor(rng() * (CELL - rw - 1)), y0 = 1 + gy * CELL + 1 + Math.floor(rng() * (CELL - rh - 1));
      const r = { gx, gy, x0, y0, x1: x0 + rw - 1, y1: y0 + rh - 1, cx: x0 + (rw >> 1), cy: y0 + (rh >> 1) };
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) set(x, y, T.LFLOOR);
      grid.push(r);
    }
    this.rooms = grid;
    const at = (gx, gy) => grid[gy * N + gx];
    const corridor = (a, b) => { // L자 복도 (폭 3)
      const horizFirst = rng() < 0.5, mx = horizFirst ? b.cx : a.cx, my = horizFirst ? a.cy : b.cy;
      const line = (x0, y0, x1, y1) => {
        for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let k = -1; k <= 1; k++) set(x, y0 + k, T.LFLOOR);
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let k = -1; k <= 1; k++) set(x1 + k, y, T.LFLOOR);
      };
      line(a.cx, a.cy, mx, my); line(mx, my, b.cx, b.cy);
    };
    // 신장 트리 (무작위 DFS) + 고리
    const seen = new Set([0]), stack = [grid[0]], edges = new Set();
    while (stack.length) {
      const r = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [r.gx + dx, r.gy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < N && y < N && !seen.has(y * N + x));
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = nb[Math.floor(rng() * nb.length)], o = at(nx, ny);
      seen.add(ny * N + nx); corridor(r, o); edges.add([r, o].map(q => q.gy * N + q.gx).sort().join('-')); stack.push(o);
    }
    for (let i = 0; i < N; i++) { // 고리: 막다른 길만 있으면 쫓길 때 답답하므로
      const a = grid[Math.floor(rng() * grid.length)], dirs = [[1, 0], [0, 1]], [dx, dy] = dirs[Math.floor(rng() * 2)];
      if (a.gx + dx < N && a.gy + dy < N) corridor(a, at(a.gx + dx, a.gy + dy));
    }
    // 실험 장비 (방 안 기둥·작업대). 길을 막지 않게 방 가장자리 한 칸 안쪽, 문 앞(복도 끝)은 피함
    for (const r of grid) {
      const n = Math.floor((r.x1 - r.x0) * (r.y1 - r.y0) / 22);
      for (let i = 0; i < n; i++) {
        const x = r.x0 + 1 + Math.floor(rng() * (r.x1 - r.x0 - 1)), y = r.y0 + 1 + Math.floor(rng() * (r.y1 - r.y0 - 1));
        if (Math.abs(x - r.cx) < 2 && Math.abs(y - r.cy) < 2) continue;
        let open = true;
        for (let yy = y - 1; yy <= y + 1 && open; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (this.tiles[yy * W + xx] !== T.LFLOOR) { open = false; break; }
        if (open) { this.tiles[y * W + x] = T.LPROP; this.height[y * W + x] = rng() < 0.5 ? 26 : 44; this.shade[y * W + x] = rng(); }
      }
    }
    // 벽: 바닥에 닿은 벽만 높이를 줌 (나머지는 검은 암반)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (this.tiles[i] !== T.LWALL) continue;
      let edge = false;
      for (let oy = -1; oy <= 1 && !edge; oy++) for (let ox = -1; ox <= 1; ox++) {
        const t = this.tileAt(x + ox, y + oy);
        if (t === T.LFLOOR || t === T.LPROP) { edge = true; break; }
      }
      this.height[i] = edge ? 50 : 0;
    }
    // 시작·탈출: 네 변 가운데에 가장 가까운 방 / 보스: 가운데 방
    const pickNear = (tx, ty, used) => grid.filter(r => !used.includes(r)).sort((a, b) => Math.hypot(a.cx - tx, a.cy - ty) - Math.hypot(b.cx - tx, b.cy - ty))[0];
    const used = [], c = at(bgx, bgy); used.push(c);
    this.labBoss = c; c.boss = true;
    this.edgePts = [];
    for (const [tx, ty, side] of [[W >> 1, 0, 'N'], [W, H >> 1, 'E'], [W >> 1, H, 'S'], [0, H >> 1, 'W']]) {
      const r = pickNear(tx, ty, used); used.push(r); r.exit = side;
      this.edgePts.push({ x: r.cx * TILE + 16, y: r.cy * TILE + 16, side });
    }
    // 비상등: 방마다 1~2개 (붉게 깜빡임). 보스 방은 4개
    for (const r of grid) {
      const n = r.boss ? 4 : 1 + (rng() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) this.alarms.push({ x: (r.x0 + rng() * (r.x1 - r.x0 + 1)) * TILE, y: (r.y0 + rng() * (r.y1 - r.y0 + 1)) * TILE, ph: rng() * TAU, boss: !!r.boss });
    }
    City.generate(def.seed);
    this.buildMinimap();
  },

  // 맵 네 변의 가운데 근처 길 (출격 시작점 하나 + 나머지는 탈출 지점). 주변 막힌 칸을 치움
  makeEdgePoints() {
    const W = this.W, H = this.H;
    this.edgePts = [];
    if (this.map === 'camp') return;
    for (const [tx, ty, side] of [[W >> 1, 3, 'N'], [W - 4, H >> 1, 'E'], [W >> 1, H - 4, 'S'], [3, H >> 1, 'W']]) {
      for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) {
        const i = y * W + x;
        if (SOLID.has(this.tiles[i]) || this.bid[i] >= 0) { this.tiles[i] = T.ROAD; this.bid[i] = -1; }
      }
      this.edgePts.push({ x: tx * TILE + 16, y: ty * TILE + 16, side });
    }
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
  zoneIndex() { return this.def ? this.def.zone : 0; }, // v1.3: 맵 하나 = 지역 하나
  slow(px, py) { return this.tileAt(Math.floor(px / TILE), Math.floor(py / TILE)) === T.WATER ? 0.6 : 1; }, // v1.6 물속 이동 배율
  inSafe(px, py) { return this.map === 'camp' && this.distTiles(px, py) < this.safeR + 1.5; },
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
      [T.LWALL]: [22, 24, 28], [T.LFLOOR]: [78, 84, 92], [T.LPROP]: [60, 66, 74], [T.WATER]: [40, 80, 110],
    };
    for (let i = 0; i < this.tiles.length; i++) {
      const c3 = col[this.tiles[i]];
      img.data[i * 4] = c3[0]; img.data[i * 4 + 1] = c3[1]; img.data[i * 4 + 2] = c3[2]; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.minimapBase = c;
  },
};

// 길찾기 (v0.16): 플레이어 칸에서 퍼져 나가는 거리 지도. 시야가 막힌 적은 숫자가 줄어드는 쪽으로 이동 → 건물을 돌아서 옴
const Nav = {
  dist: null, q: null, t: 0, ptx: -1, pty: -1, MAX: 48,
  update(dt) {
    const W = World.W, H = World.H, p = G.player;
    if (!this.dist || this.dist.length !== W * H) { this.dist = new Int16Array(W * H); this.q = new Int32Array(W * H); }
    this.t -= dt;
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    if (this.t > 0 && tx === this.ptx && ty === this.pty) return;
    this.t = 0.4; this.ptx = tx; this.pty = ty;
    const d = this.dist, q = this.q; d.fill(-1);
    let h = 0, n = 0; d[ty * W + tx] = 0; q[n++] = ty * W + tx;
    while (h < n) {
      const i = q[h++], x = i % W, y = (i - x) / W, nd = d[i] + 1;
      if (nd > this.MAX) continue;
      if (x > 0 && d[i - 1] < 0 && !SOLID.has(World.tiles[i - 1])) { d[i - 1] = nd; q[n++] = i - 1; }
      if (x < W - 1 && d[i + 1] < 0 && !SOLID.has(World.tiles[i + 1])) { d[i + 1] = nd; q[n++] = i + 1; }
      if (y > 0 && d[i - W] < 0 && !SOLID.has(World.tiles[i - W])) { d[i - W] = nd; q[n++] = i - W; }
      if (y < H - 1 && d[i + W] < 0 && !SOLID.has(World.tiles[i + W])) { d[i + W] = nd; q[n++] = i + W; }
    }
  },
  // 적이 가야 할 방향(각도). 길이 없으면 null
  dir(e) {
    if (!this.dist) return null;
    const W = World.W, tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE), d = this.dist;
    const here = d[ty * W + tx];
    let best = here >= 0 ? here : 9999, bx = 0, by = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      if (!ox && !oy) continue;
      const nx = tx + ox, ny = ty + oy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= World.H) continue;
      const v = d[ny * W + nx];
      if (v < 0 || v >= best) continue;
      if (ox && oy && (SOLID.has(World.tiles[ty * W + nx]) || SOLID.has(World.tiles[ny * W + tx]))) continue; // 모서리 끼임 방지
      best = v; bx = ox; by = oy;
    }
    if (!bx && !by) return null;
    return Math.atan2((ty + by + 0.5) * TILE - e.y, (tx + bx + 0.5) * TILE - e.x);
  },
};
