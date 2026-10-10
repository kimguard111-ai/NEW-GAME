// 맵 인구 (v1.16): 무한 스폰 대신 출격할 때 맵 전체의 적 수를 정해 둠
// 맵을 12×12칸 구역으로 나눠 구역마다 적 수(예산)를 정하고, 플레이어가 가까이 가면 그 구역의 적이 나타남 (화면 밖에서)
// 잡은 적은 다시 생기지 않음 → 맵을 비워 가는 맛. 오래 머물면 경보 단계에 따라 증원 부대만 옴 (js/events.js)

const POP_CELL = 12;          // 구역 크기 (칸)
const POP_WAKE = 1150;        // 이 거리 안의 구역이 깨어남 (px)
const POP_MIN_D = 520;        // 플레이어에게서 최소 이만큼 떨어진 곳에 나타남
const POP_DENS = [0, 0.041, 0.042, /* v1.57 종로 0.05 → 0.042 */ 0.062, 0.05, 0.09, 0.045, 0.045]; // v1.16 봇 측정 후 ×1.5 · v1.31 용산 0.048 → 0.062 (분당 처치 5.7 · 수입 최저) · v1.33.1 명동 0.048 → 0.041 (이동 -30% 뒤 초반 사망 50%) // 구역 걷는 칸당 적 수 (지역별)

const Pop = {
  cells: [], t: 0, total: 0, killed: 0, half: false, done: false,

  generate(start) {
    this.cells = []; this.total = 0; this.killed = 0; this.half = false; this.done = false;
    if (World.map === 'camp') return;
    const rk = FirstRun.rookie(), W = World.W, H = World.H, z = World.zoneIndex(), dens = (POP_DENS[z] || 0.03) * (rk ? 0.7 : 1); // v1.45 첫 출격: 적 30% 적게
    const open = t => t === T.ROAD || t === T.WALK || t === T.RUBBLE || t === T.GRASS || t === T.LFLOOR || t === T.WATER;
    for (let cy = 0; cy < H; cy += POP_CELL) for (let cx = 0; cx < W; cx += POP_CELL) {
      const tiles = [];
      for (let y = cy; y < Math.min(H, cy + POP_CELL); y++) for (let x = cx; x < Math.min(W, cx + POP_CELL); x++) if (open(World.tiles[y * W + x])) tiles.push([x, y]);
      if (tiles.length < 8) continue;
      const mx = (cx + POP_CELL / 2) * TILE, my = (cy + POP_CELL / 2) * TILE;
      let n = Math.round(tiles.length * dens * rand(0.6, 1.4));
      if (start && Math.hypot(mx - start.x, my - start.y) < (rk ? 900 : 650)) n = 0; // 시작 지점 주변은 비움 (첫 출격은 더 넓게)
      else if ((G.exits || []).some(e => Math.hypot(mx - e.x, my - e.y) < 300)) n = Math.round(n * 0.4); // 탈출 지점 근처는 적게
      if (n <= 0) continue;
      this.cells.push({ x: mx, y: my, tiles, n, alive: 0 });
      this.total += n;
    }
  },

  // 남은 적 (아직 안 나타난 수 + 이 맵 인구로 나타나 살아 있는 적 — 증원·사건 적은 빼고)
  remaining() { return Math.max(0, this.total - this.killed); },

  // v1.17 처치: 구역 소탕 · 맵 절반 / 전부 소탕 보상
  onKill(e, dropAt) {
    const c = e.popCell; if (!c) return;
    e.popCell = null; c.alive--; this.killed++;
    const p = G.player, lvl = ZONES[World.zoneIndex()].lvl[1];
    if (c.alive <= 0 && c.n <= 0 && !c.cleared) { c.cleared = true; dropAt('credits', { amount: lvl * 8 }); floatText(e.x, e.y - 50, '구역 소탕', '#9fd', 13); }
    if (!this.half && this.killed >= this.total / 2) {
      this.half = true; dropAt('credits', { amount: lvl * 40 }); dropAt('item', { item: makeConsumable(pick(['molotov', 'flash', 'plate', 'stim']), 1) });
      UI.toast('맵 절반 소탕', `남은 적 약 ${this.remaining()}. 크레딧, 소모품`); SFX.play('quest');
    }
    if (!this.done && this.killed >= this.total) {
      this.done = true; RaidEvents.cleared = true; // 증원도 멈춤
      dropAt('item', { item: randomGear(lvl, 1.5, 3, ZONES[World.zoneIndex()].gear) }); dropAt('credits', { amount: lvl * 120 }); Workshop.gain(6, 3, '맵 소탕');
      p.rec = p.rec || {}; p.rec.clears = (p.rec.clears || 0) + 1;
      UI.toast('★ 맵 소탕 완료 ★', '영웅 이상 장비, 크레딧, 재료. 증원도 끊겼다. 천천히 뒤지고 나가자'); SFX.play('legend');
      G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 1.2, color: '#ffd76a', r: 220 });
    }
  },
  // 남은 적이 10 이하면 미니맵에 표시 (마지막 사냥)
  minimap(g) {
    if (!this.total || this.done || this.remaining() > 10 || Math.sin(G.time * 5) < -0.3) return;
    g.fillStyle = 'rgba(255,120,60,0.9)';
    for (const e of G.enemies) if (e.popCell && e.hp > 0) g.fillRect(e.x / TILE - 2, e.y / TILE - 2, 4, 4);
    g.strokeStyle = 'rgba(255,120,60,0.6)'; g.lineWidth = 0.8;
    for (const c of this.cells) if (c.n > 0) g.strokeRect(c.x / TILE - POP_CELL / 2, c.y / TILE - POP_CELL / 2, POP_CELL, POP_CELL);
  },

  update(dt) {
    if (World.map === 'camp' || G.assault || (this.t -= dt) > 0) return;
    this.t = 0.4;
    const p = G.player;
    if (G.boss && G.boss.hp > 0 && dist(G.boss, p) < 1100) return; // 타이탄과 싸우는 중엔 나타나지 않음 (v1.7)
    const z = World.zoneIndex(), zone = ZONES[z];
    // 근처에 이미 이만큼 있으면 남은 적은 구역에서 대기 (한꺼번에 몰리지 않게 — 예전 밀도 상한과 같음, 봇 측정에서 강남 사망률 90%)
    const cap = 18 + Math.min(z, 4) * 4;
    let near = G.enemies.filter(e => e.hp > 0 && !e.def.boss && !e.nest && Math.abs(e.x - p.x) + Math.abs(e.y - p.y) < 1700).length;
    const cells = this.cells.filter(c => c.n && Math.hypot(c.x - p.x, c.y - p.y) <= POP_WAKE).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    for (const c of cells) {
      if (near >= cap) break;
      for (let tries = 0; tries < 12 && c.n > 0; tries++) {
        const [tx, ty] = pick(c.tiles), x = tx * TILE + 16, y = ty * TILE + 16;
        if (Math.hypot(x - p.x, y - p.y) < POP_MIN_D || World.circleBlocked(x, y, 22) || World.buildingAt(x, y)) continue;
        // 맵 가운데(랜드마크)에 가까울수록 레벨 상승
        const t = clamp(1 - Math.hypot(x / TILE - World.cx, y / TILE - World.cy) / (World.W * 0.55), 0, 1);
        const lvl = clamp(Math.round(lerp(zone.lvl[0], zone.lvl[1], t) + rand(-1, 1)), zone.lvl[0], zone.lvl[1]);
        const type = weighted(zone.spawns), e = makeEnemy(type, x, y, lvl);
        if (Math.random() < Monsters.eliteChance(z) + ((RaidEvents.alert || 0) >= 2 ? 0.04 : 0)) Monsters.makeElite(e, Monsters.rollAffix(type));
        e.popCell = c; c.alive++; G.enemies.push(e); c.n--; near++;
        const pk = zone.packs && zone.packs[type]; // 무리 (예산에서 함께 뺌)
        if (pk) for (let i = 1, n = randInt(pk[0], pk[1]); i < n && c.n > 0; i++) {
          const ox = x + rand(-70, 70), oy = y + rand(-70, 70);
          if (!World.circleBlocked(ox, oy, e.r) && !World.inSafe(ox, oy)) { const m = makeEnemy(type, ox, oy, lvl); m.popCell = c; c.alive++; G.enemies.push(m); c.n--; near++; }
        }
      }
    }
  },
};
