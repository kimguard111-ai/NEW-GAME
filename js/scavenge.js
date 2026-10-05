// 뒤지기 · 시체 가방 회수 (v1.4)
// 출격할 때마다 맵 곳곳에 뒤질 곳(쓰레기통·차 트렁크·배낭·군용 보관함)이 새로 놓이고, [E]로 잠깐 뒤져야 열림
// 출격 중 죽으면 이번에 주운 것이 그 자리의 "시체 가방"에 남음 → 다음에 같은 맵에 출격해서 회수 (한 맵에 하나, 다시 죽으면 새것으로 바뀜)

const CACHES = {
  dumpster: { name: '쓰레기 수거함', dur: 1.4, gear: 0.03, med: 0.10, ammo: 0.5, scrap: [1, 3], cr: 4 },
  trunk:    { name: '차 트렁크',     dur: 1.6, gad: 0.2, gear: 0.04, med: 0.30, ammo: 0.6, scrap: [0, 2], cr: 6 },
  bag:      { name: '버려진 배낭',   dur: 0.9, gear: 0.07, med: 0.25, ammo: 0.3, scrap: [0, 1], cr: 8 },
  locker:   { name: '군용 보관함',   dur: 2.2, gad: 0.4, gear: 0.10, med: 0.20, ammo: 0.8, scrap: [1, 3], cr: 10, chip: 0.25, bonus: 0.6 },
  labcase:  { name: '연구 장비함',   dur: 1.8, gad: 0.3, gear: 0.08, med: 0.35, ammo: 0.4, scrap: [1, 2], cr: 12, chip: 0.4, bonus: 0.8 }, // v1.5 연구소
};
const GRAVE_DUR = 2.0;

const Scavenge = {
  list: [],

  // 출격 맵에 뒤질 곳 배치 (매 출격 무작위)
  generate() {
    this.list = [];
    if (World.map === 'camp') return;
    const W = World.W, H = World.H, lab = World.def && World.def.lab, n = Math.round(W * H / (lab ? 300 : 380)), zone = World.zoneIndex();
    for (let tries = 0; tries < 4000 && this.list.length < n; tries++) {
      const tx = 2 + Math.floor(Math.random() * (W - 4)), ty = 2 + Math.floor(Math.random() * (H - 4)), t = World.tileAt(tx, ty);
      const x = tx * TILE + 16, y = ty * TILE + 16;
      if (World.buildingAt(x, y) || (G.exits || []).some(e => Math.hypot(e.x - x, e.y - y) < 300)) continue;
      if (this.list.some(c => Math.hypot(c.x - x, c.y - y) < 260)) continue;
      let type = null;
      const wallNear = tt => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => World.tileAt(tx + dx, ty + dy) === tt);
      if (lab) { if (t === T.LFLOOR) type = wallNear(T.LWALL) ? 'labcase' : Math.random() < 0.3 ? 'bag' : null; } // 연구소: 벽 쪽 장비함
      else if (t === T.CAR && !City.busCells.has(ty * W + tx)) type = 'trunk'; // v1.21 승용차는 모두 소품(2칸)으로 그림 — 버스만 제외
      else if (t === T.WALK && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => World.tileAt(tx + dx, ty + dy) === T.BUILDING)) type = zone === 3 && Math.random() < 0.5 ? 'locker' : 'dumpster';
      else if ((t === T.WALK || t === T.RUBBLE || t === T.GRASS) && Math.random() < 0.3) type = 'bag';
      if (type) this.list.push({ type, x, y, tx, ty, looted: false });
    }
  },

  // [E] 대상: 가까운 안 뒤진 곳 또는 시체 가방
  near() {
    const p = G.player;
    if (G.grave && Math.hypot(p.x - G.grave.x, p.y - G.grave.y) < 50) return { grave: true };
    const ev = RaidEvents.near(p); if (ev) return ev; // v1.10 사건
    let best = null, bd = 50;
    for (const c of this.list) { if (c.looted) continue; const d = Math.hypot(p.x - c.x, p.y - c.y); if (d < bd) { bd = d; best = c; } }
    return best;
  },
  hint(t) { return t.hint ? t.hint : t.grave ? '[E] 내 시체 가방 회수' : `[E] ${CACHES[t.type].name} 뒤지기`; },

  start(t) {
    const p = G.player;
    if (G.search) return;
    if (t.hint && !RaidEvents.onStart(t)) return;
    G.search = { target: t, t: 0, dur: t.hint ? t.dur : t.grave ? GRAVE_DUR : CACHES[t.type].dur * (perk('scavenger') ? 0.6 : 1) * (pas('t5') ? 0.8 : 1), x: p.x, y: p.y };
    SFX.play('ui');
  },

  update(dt) {
    const s = G.search, p = G.player;
    if (!s) return;
    if (p.dead || Math.hypot(p.x - s.x, p.y - s.y) > 26) { G.search = null; return; } // 움직이면 취소
    s.t += dt;
    if (s.t < s.dur) return;
    G.search = null;
    if (s.target.hint) RaidEvents.finish(s.target); else if (s.target.grave) this.recover(); else this.loot(s.target);
  },

  loot(c) {
    const C = CACHES[c.type], z = ZONES[World.zoneIndex()], p = G.player;
    c.looted = true;
    const lvl = randInt(z.lvl[0], z.lvl[1]);
    const drop = (kind, extra) => G.drops.push({ x: c.x + rand(-16, 16), y: c.y + rand(-16, 16), kind, t: 0, ...extra });
    drop('credits', { amount: Math.round(lvl * C.cr * rand(0.6, 1.4) * (perk('scavenger') ? 1.5 : 1)) });
    if (Math.random() < C.ammo) drop('ammo', { amount: randInt(15, 40) });
    if (Math.random() < C.med) drop('item', { item: makeConsumable('medkit', 1) });
    if (Math.random() < C.gear * (perk('treasure') ? 1.25 : 1)) drop('item', { item: randomGear(lvl, (C.bonus || 0.3) + 0.3, 0, z.gear) });
    if (Math.random() < (c.type === 'locker' ? 0.06 : c.type === 'bag' ? 0.05 : 0.02)) { // v1.24 벨트: 지역이 깊을수록 좋은 벨트
      const r = Math.random(), t = lvl >= 18 && r < 0.15 ? 3 : lvl >= 10 && r < 0.45 ? 2 : 1;
      drop('item', { item: makeBelt(t) });
    }
    if (Math.random() < (C.gad || 0.15)) { // v1.14 투척물·보조 소모품
      const k = c.type === 'locker' ? pick(['mine', 'flash', 'plate', 'molotov']) : c.type === 'labcase' ? pick(['stim', 'flash', 'plate']) : c.type === 'trunk' ? pick(['molotov', 'plate', 'molotov']) : pick(['molotov', 'flash', 'stim', 'plate', 'mine']);
      drop('item', { item: makeConsumable(k, 1) });
    }
    const sc = randInt(C.scrap[0], C.scrap[1]), ch = C.chip && Math.random() < C.chip ? 1 : 0;
    if (sc || ch) Workshop.gain(sc, ch);
    burst(c.x, c.y, '#c9a24a', 8, 90, 0.4);
    floatText(c.x, c.y - 24, C.name, '#e0c070', 12);
    Bounty.on('crate');
  },

  // 사망 시 이번 출격의 장비·크레딧을 시체 가방으로 (Raid.onDeath)
  makeGrave(items, credits) {
    const p = G.player;
    if (!items.length && !credits) return;
    p.graves[World.map] = { x: p.x, y: p.y, items, credits };
  },
  recover() {
    const p = G.player, g = p.graves[World.map];
    if (!g) return;
    let back = 0;
    for (const it of g.items) {
      it.raid = true; // 다시 들고 나가야 확정
      if (addItem(it)) back++; else G.drops.push({ x: g.x + rand(-20, 20), y: g.y + rand(-20, 20), kind: 'item', t: 0, item: it });
    }
    if (g.credits) { p.credits += g.credits; if (p.raid) p.raid.credits += g.credits; }
    delete p.graves[World.map]; G.grave = null;
    UI.toast('시체 가방 회수', `장비 ${g.items.length}개 · ₵${fmt(g.credits)} — 탈출해야 확정`);
    log(`시체 가방을 찾았다! 장비 ${g.items.length}개, ₵${fmt(g.credits)}`, '#ffd76a');
    SFX.play('item', 3);
  },

  // 그리기: 뒤질 곳 (반짝임) · 시체 가방
  collect(objs) {
    for (const c of this.list) objs.push({ d: (c.x + c.y) / TILE + 0.05, draw: drawCache, ent: c });
    if (G.grave) objs.push({ d: (G.grave.x + G.grave.y) / TILE, draw: drawGrave, ent: G.grave });
  },
};

function drawCache(c) {
  const sx = Iso.sx(c.x, c.y), sy = Iso.sy(c.x, c.y);
  if (sx < -60 || sx > VW + 60 || sy < -60 || sy > VH + 60) return;
  if (c.type !== 'trunk' && propArt(c.type)) { // v1.18 그림 (뒤진 곳은 어둡게)
    if (c.looted) ctx.globalAlpha = 0.55; drawPropArt(c.type, sx, sy); ctx.globalAlpha = 1;
  } else if (c.type === 'dumpster') drawBox(c.x - 12, c.y - 8, c.x + 12, c.y + 8, 22, c.looted ? '#2a3a2a' : '#3e5a3a', '#243424', '#2e442e', 0, 0, 0);
  else if (c.type === 'labcase') { drawBox(c.x - 9, c.y - 7, c.x + 9, c.y + 7, 26, c.looted ? '#6a6e72' : '#d8dce0', '#9a9ea4', '#b8bcc2', 0, 0, 0); if (!c.looted) { ctx.fillStyle = '#3a7ad8'; ctx.fillRect(sx - 6, sy - 24, 12, 3); } }
  else if (c.type === 'locker') drawBox(c.x - 8, c.y - 8, c.x + 8, c.y + 8, 34, c.looted ? '#3a3e34' : '#55603f', '#353d27', '#454f33', 0, 0, 0);
  else if (c.type === 'bag') { ctx.fillStyle = c.looted ? '#2a2620' : '#5a4a2e'; ctx.beginPath(); ctx.ellipse(sx, sy - 5, 8, 6, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a2e1c'; ctx.fillRect(sx - 3, sy - 12, 6, 4); }
  // 트렁크는 차 위에 표시만
  if (!c.looted) { // 반짝임
    const k = 0.5 + Math.sin(G.time * 4 + c.x) * 0.5;
    ctx.fillStyle = `rgba(255,220,120,${0.35 + k * 0.5})`;
    ctx.beginPath(); ctx.arc(sx, sy - (c.type === 'locker' ? 40 : c.type === 'trunk' || c.type === 'labcase' ? 32 : 22), 2.5 + k, 0, TAU); ctx.fill();
  }
}
function drawGrave(g) {
  const sx = Iso.sx(g.x, g.y), sy = Iso.sy(g.x, g.y), k = 0.5 + Math.sin(G.time * 3) * 0.5;
  ctx.fillStyle = 'rgba(160,20,20,0.35)'; ctx.beginPath(); ctx.ellipse(sx, sy, 22, 11, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.ellipse(sx, sy - 7, 11, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#d33'; ctx.fillRect(sx - 1.5, sy - 34 - k * 4, 3, 12); ctx.fillRect(sx - 5, sy - 30 - k * 4, 10, 3);
  if (Settings.light) addLight(sx, sy, 90, 0.7, 'rgba(255,60,60,A)');
  nameTag(sx, sy - 46, '내 시체 가방', '#ff8a8a', 'bold 11px sans-serif', 'skull');
}
