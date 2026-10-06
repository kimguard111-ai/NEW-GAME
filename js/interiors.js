// 건물 내부 (v0.13): 들어가면 지붕·벽이 잘려 보이고, 실내 적과 보급 상자가 있음
// 모든 건물이 아니라 큰 단독 건물 일부(상가)만 입장 가능 — 출입문 위 간판으로 구분

const CRATE_RESTOCK = 600; // 상자 재보급 (초)
const SHOP_RESPAWN = 300;  // (v1.16부터 쓰지 않음: 실내 적은 출격당 한 번)

const Interiors = {
  // 플레이어가 지금 들어가 있는 건물 (실내 바닥·출입문 위)
  update() {
    const p = G.player, b = World.buildingAt(p.x, p.y);
    const prev = G.inside;
    G.inside = b && !p.dead ? b : null;
    if (G.inside && G.inside !== prev) this.enter(G.inside);
  },

  enter(b) {
    const p = G.player, z = World.zoneIndex(b.cx, b.cy), zone = ZONES[z];
    const ready = b.crates.filter(c => G.time - c.openT > CRATE_RESTOCK).length;
    if (!b.spawned && zone.spawns.length) { // 실내 적 (출입문에서 먼 곳) · v1.16 출격당 한 번 (재등장 없음)
      b.spawned = true; b.spawnT = G.time;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0, tries = 0; i < n && tries < 40; tries++) {
        const tx = b.x0 + 1 + Math.floor(Math.random() * (b.x1 - b.x0 - 1)), ty = b.y0 + 1 + Math.floor(Math.random() * (b.y1 - b.y0 - 1));
        const x = tx * TILE + 16, y = ty * TILE + 16;
        if (World.tileAt(tx, ty) !== T.FLOOR || Math.hypot(x - p.x, y - p.y) < 200) continue;
        const type = weighted(zone.spawns.filter(s => s[0] !== 'drone')) || 'zombie';
        const lvl = zone.lvl[0] + Math.floor(Math.random() * (zone.lvl[1] - zone.lvl[0] + 1));
        const e = makeEnemy(type, x, y, lvl);
        if (World.circleBlocked(x, y, e.r)) continue;
        G.enemies.push(e); i++;
      }
    }
    log(`${ICON('door')} ${b.name} 안으로 들어왔다.${ready ? ` 보급 상자 ${ready}개` : ''}`, '#c9b27a');
  },

  // 같은 공간(같은 건물 안 / 둘 다 바깥)에 있는지 — 다르면 적이 쫓아오지 않음
  sameSpace(e) {
    const b = World.buildingAt(e.x, e.y);
    return (b || null) === (G.inside || null);
  },

  nearCrate() {
    const p = G.player, b = G.inside;
    if (!b || p.dead) return null;
    for (const c of b.crates) if (G.time - c.openT > CRATE_RESTOCK && Math.hypot(p.x - c.x, p.y - c.y) < 48) return c;
    return null;
  },

  openCrate(c) {
    const p = G.player, b = G.inside, z = Math.max(1, World.zoneIndex(b.cx, b.cy)), zone = ZONES[z];
    c.openT = G.time;
    const lvl = Math.max(p.level, zone.lvl[0]);
    const drop = (kind, extra) => G.drops.push({ x: c.x + rand(-18, 18), y: c.y + rand(-18, 18), kind, t: 0, ...extra });
    drop('credits', { amount: Math.round(zone.lvl[1] * rand(8, 16)) });
    if (Math.random() < 0.6) drop('ammo', { amount: randInt(20, 45) });
    if (Math.random() < 0.3) drop('item', { item: makeConsumable('medkit', 1) });
    if (Math.random() < 0.07 * ECON.gear) drop('item', { item: randomGear(lvl, 0.9, 0, zone.gear) }); // v1.7.1 0.12 → 0.07
    if (Math.random() < 0.15) drop('item', { item: randomAttach(lvl) }); // v1.50 부품: 건물 안 보급 상자 15%
    Workshop.gain(randInt(2, 4), Math.random() < 0.15 ? 1 : 0);
    floatText(c.x, c.y - 30, '보급 상자', '#e0c070', 14);
    burst(c.x, c.y, '#c9a24a', 10, 100, 0.4);
    log(`${b.name}의 보급 상자를 열었다.`, '#c9b27a');
    Bounty.on('crate');
  },
};
