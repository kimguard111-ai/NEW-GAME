// 맵 생성 및 지형 쿼리
const T = { ROAD: 0, BUILDING: 1, RUBBLE: 2, CAR: 3, GRASS: 4, CAMP: 5, BARRICADE: 6, WALK: 7 };
const SOLID = new Set([T.BUILDING, T.CAR, T.BARRICADE]);

const World = {
  W: 160, H: 160, BLOCK: 14,
  tiles: null, shade: null,
  cx: 80, cy: 80, safeR: 11,
  bossTile: { x: 22, y: 22 },

  generate(seed) {
    const W = this.W, H = this.H, B = this.BLOCK;
    const rng = mulberry32(seed);
    this.tiles = new Uint8Array(W * H);
    this.shade = new Float32Array(W * H);
    const set = (x, y, t) => { if (x >= 0 && y >= 0 && x < W && y < H) this.tiles[y * W + x] = t; };

    // 도로와 블록
    for (let by = 0; by < Math.ceil(H / B); by++) {
      for (let bx = 0; bx < Math.ceil(W / B); bx++) {
        const ox = bx * B, oy = by * B;
        for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) {
          set(ox + x, oy + y, (x < 3 || y < 3) ? T.ROAD : T.WALK);
        }
        const kind = rng();
        const shade = rng();
        const fillB = (x0, y0, x1, y1, s) => {
          for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            set(ox + x, oy + y, T.BUILDING);
            if (ox + x < W && oy + y < H) this.shade[(oy + y) * W + ox + x] = s;
          }
        };
        if (kind < 0.12) {
          // 공원
          for (let y = 4; y <= 12; y++) for (let x = 4; x <= 12; x++) set(ox + x, oy + y, T.GRASS);
        } else if (kind < 0.3) {
          // 붕괴된 건물
          for (let y = 4; y <= 12; y++) for (let x = 4; x <= 12; x++) {
            set(ox + x, oy + y, rng() < 0.22 ? T.BUILDING : T.RUBBLE);
            this.shade[(oy + y) * W + ox + x] = shade;
          }
        } else if (kind < 0.55) {
          // 두 동 + 골목
          if (rng() < 0.5) { fillB(4, 4, 7, 12, shade); fillB(10, 4, 12, 12, rng()); }
          else { fillB(4, 4, 12, 7, shade); fillB(4, 10, 12, 12, rng()); }
        } else {
          fillB(4, 4, 12, 12, shade);
          // 입구처럼 보이는 홈
          if (rng() < 0.5) set(ox + 8, oy + 12, T.RUBBLE);
        }
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

    // 외곽 벽
    for (let i = 0; i < W; i++) { set(i, 0, T.BUILDING); set(i, H - 1, T.BUILDING); }
    for (let i = 0; i < H; i++) { set(0, i, T.BUILDING); set(W - 1, i, T.BUILDING); }

    this.buildMinimap();
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
