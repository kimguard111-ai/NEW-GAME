// v1.87 가방 = 격자 (디아블로식): 아이템마다 모양(가로×세로 칸)이 다름 · 가로 8칸 고정, 세로는 창고 시설 단계로 늘어남
// PC: 끌어서 원하는 자리에 놓음 / 모바일: 같은 격자에 자동으로 채움 (끌기 없음) — 담을 수 있는 양은 둘이 같음 (세이브를 같이 씀)
// 자리는 아이템에 it.gx · it.gy 로 저장. 빈자리가 없으면 가방 전체를 다시 정리해 자리를 만들어 봄 (그래도 없으면 꽉 참)
const BAG_COLS = 8;
const BAG_SHAPE = { // 무기는 계열(wbase)로 · 그림이 가로로 길어서 가로로 눕힘
  pistol: [2, 1], smg: [3, 1], shotgun: [4, 1], rifle: [4, 1], sniper: [5, 1], lmg: [4, 2],
  pipe: [3, 1], axe: [3, 1], katana: [4, 1], blaster: [4, 2], ox20: [4, 2], f20: [4, 1],
};
const Bag = {
  rows() { return 5 + [0, 0, 1, 2][Camp.lv('store')]; }, // 40 · 40 · 48 · 56칸 (예전 24 · 24 · 28 · 32개)
  cells() { return BAG_COLS * this.rows(); },
  shape(it) {
    if (!it) return [1, 1];
    if (it.kind === 'weapon') return BAG_SHAPE[it.key] || BAG_SHAPE[wbase(it.key)] || [3, 1];
    return { armor: [2, 3], helmet: [2, 2], belt: [2, 1] }[it.kind] || [1, 1]; // 소모품 · 부품 1칸
  },
  area(it) { const [w, h] = this.shape(it); return w * h; },
  used(list = G.player.inventory) { return list.reduce((s, it) => s + this.area(it), 0); },
  // 자리표: 칸마다 차지한 아이템 (ignore 는 빼고)
  occ(list, ignore) {
    const R = this.rows(), m = Array.from({ length: R }, () => new Array(BAG_COLS).fill(null));
    for (const it of list) {
      if (it === ignore || it.gx == null) continue;
      const [w, h] = this.shape(it);
      for (let y = it.gy; y < it.gy + h; y++) for (let x = it.gx; x < it.gx + w; x++) if (m[y] && x < BAG_COLS) m[y][x] = it;
    }
    return m;
  },
  fitsAt(it, x, y, m) {
    const [w, h] = this.shape(it);
    if (x < 0 || y < 0 || x + w > BAG_COLS || y + h > m.length) return false;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (m[yy][xx]) return false;
    return true;
  },
  findSpot(it, m) { for (let y = 0; y < m.length; y++) for (let x = 0; x < BAG_COLS; x++) if (this.fitsAt(it, x, y, m)) return { x, y }; return null; },
  // 전부 다시 놓아 봄 (큰 것부터) — 되면 자리표, 안 되면 null
  plan(list) {
    const R = this.rows(), m = Array.from({ length: R }, () => new Array(BAG_COLS).fill(null)), pos = new Map();
    const order = [...list].sort((a, b) => (this.shape(b)[1] - this.shape(a)[1]) || (this.area(b) - this.area(a)));
    for (const it of order) {
      const s = this.findSpot(it, m); if (!s) return null;
      const [w, h] = this.shape(it); for (let y = s.y; y < s.y + h; y++) for (let x = s.x; x < s.x + w; x++) m[y][x] = it;
      pos.set(it, s);
    }
    return pos;
  },
  apply(pos) { for (const [it, s] of pos) { it.gx = s.x; it.gy = s.y; } },
  // 새 아이템 자리 잡기 (가방 배열에 넣기 전에 부름) — 넣을 수 있으면 true
  place(it, list = G.player.inventory) {
    const s = this.findSpot(it, this.occ(list, it));
    if (s) { it.gx = s.x; it.gy = s.y; return true; }
    const pos = this.plan([...list.filter(o => o !== it), it]); if (!pos) return false;
    this.apply(pos); if (G.running) log('가방을 정리해서 자리를 만들었다.', '#9fd0ff');
    return true;
  },
  // 옮기기 (PC 끌어 놓기)
  moveTo(it, x, y) { const m = this.occ(G.player.inventory, it); if (!this.fitsAt(it, x, y, m)) return false; it.gx = x; it.gy = y; return true; },
  // 정리 버튼: 정렬 순서대로 위에서부터 다시 (안 되면 큰 것부터)
  sortPack(list) {
    const R = this.rows(), m = Array.from({ length: R }, () => new Array(BAG_COLS).fill(null)), pos = new Map();
    for (const it of list) { const s = this.findSpot(it, m); if (!s) { const p2 = this.plan(list); if (p2) this.apply(p2); return; } const [w, h] = this.shape(it); for (let y = s.y; y < s.y + h; y++) for (let x = s.x; x < s.x + w; x++) m[y][x] = it; pos.set(it, s); }
    this.apply(pos);
  },
  // 자리 검사: 자리가 없거나 겹친 아이템은 다시 놓고, 그래도 안 들어가는 것은 창고(캠프) · 발밑으로 — 옛 세이브(24칸 목록)를 처음 불러올 때도 이것
  normalize(quiet) {
    const p = G.player, inv = p.inventory; if (!inv) return;
    const m = Array.from({ length: this.rows() }, () => new Array(BAG_COLS).fill(null)), loose = [];
    for (const it of inv) {
      const [w, h] = this.shape(it);
      if (it.gx == null || !this.fitsAt(it, it.gx, it.gy, m)) { loose.push(it); continue; }
      for (let y = it.gy; y < it.gy + h; y++) for (let x = it.gx; x < it.gx + w; x++) m[y][x] = it;
    }
    if (!loose.length) return;
    for (const it of [...loose]) { const s = this.findSpot(it, m); if (!s) continue; it.gx = s.x; it.gy = s.y; const [w, h] = this.shape(it); for (let y = s.y; y < s.y + h; y++) for (let x = s.x; x < s.x + w; x++) m[y][x] = it; loose.splice(loose.indexOf(it), 1); }
    if (!loose.length) return;
    const all = this.plan(inv); if (all) { this.apply(all); return; }
    // 다 안 들어감: 작은 것부터 남기고 큰 것을 뺌
    const keep = [...inv].sort((a, b) => this.area(a) - this.area(b)); const out = [];
    while (keep.length && !this.plan(keep)) out.push(keep.pop());
    this.apply(this.plan(keep));
    for (const it of out) { inv.splice(inv.indexOf(it), 1); delete it.gx; delete it.gy; if (World.map === 'camp' || !p.raid) p.stash.push(it); else G.drops.push({ x: p.x + rand(-24, 24), y: p.y + rand(-24, 24), kind: 'item', t: 0, item: it }); }
    if (!quiet || out.length) log(`가방이 칸 격자로 바뀌어 ${out.length}개를 ${World.map === 'camp' || !p.raid ? '창고로' : '발밑에'} 옮겼다.`, '#ffd76a');
  },
  // 격자 그리기 (가방 창 · 창고 창 공용) — opts.drag: PC 끌어 놓기
  render(el, onClick, opts = {}) {
    const p = G.player, inv = p.inventory, R = this.rows();
    this.normalize(true);
    el.classList.add('bag-grid'); el.style.setProperty('--bag-rows', R); el.innerHTML = '';
    for (let i = 0; i < BAG_COLS * R; i++) { const c = document.createElement('div'); c.className = 'bag-slot'; c.style.gridColumn = (i % BAG_COLS) + 1; c.style.gridRow = Math.floor(i / BAG_COLS) + 1; el.appendChild(c); }
    for (const it of inv) {
      const [w, h] = this.shape(it), c = document.createElement('div');
      c.className = 'inv-cell bag-item bc' + (it.rarity || 0) + (opts.sel === it ? ' sel' : '') + (w >= 3 ? ' wide' : '') + (h >= 2 ? ' tall' : '');
      c.style.gridColumn = `${it.gx + 1} / span ${w}`; c.style.gridRow = `${it.gy + 1} / span ${h}`;
      c.innerHTML = UI.itemCell(it);
      if (opts.drag && !IS_TOUCH) this.dragable(c, it, el, onClick); else c.onclick = () => { ItemTip.hide(); onClick(it); };
      if (!IS_TOUCH) ItemTip.attach(c, it);
      el.appendChild(c);
    }
  },
  dragable(c, it, el, onClick) {
    c.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY, r0 = c.getBoundingClientRect(), offX = e.clientX - r0.left, offY = e.clientY - r0.top;
      let ghost = null, hint = null, tgt = null;
      const cellAt = (cx, cy) => { const g = el.getBoundingClientRect(), cw = g.width / BAG_COLS, ch = g.height / this.rows(); return { x: Math.round((cx - offX - g.left) / cw), y: Math.round((cy - offY - g.top) / ch), cw, ch, g }; };
      const move = ev => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!ghost) { ItemTip.hide(); ghost = c.cloneNode(true); ghost.classList.add('bag-ghost'); ghost.style.width = r0.width + 'px'; ghost.style.height = r0.height + 'px'; document.body.appendChild(ghost); c.classList.add('dragging'); hint = document.createElement('div'); hint.className = 'bag-hint'; el.appendChild(hint); }
        ghost.style.left = (ev.clientX - offX) + 'px'; ghost.style.top = (ev.clientY - offY) + 'px';
        const q = cellAt(ev.clientX, ev.clientY), [w, h] = this.shape(it); q.x = clamp(q.x, 0, BAG_COLS - w); q.y = clamp(q.y, 0, this.rows() - h); // 가장자리 밖으로 끌면 안쪽 끝으로
        const ok = this.fitsAt(it, q.x, q.y, this.occ(G.player.inventory, it));
        tgt = ok ? q : null; hint.classList.toggle('bad', !ok);
        hint.style.gridColumn = `${q.x + 1} / span ${w}`; hint.style.gridRow = `${q.y + 1} / span ${h}`;
      };
      const up = () => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        if (!ghost) { ItemTip.hide(); onClick(it); return; } // 끌지 않았으면 누르기
        ghost.remove(); if (hint) hint.remove(); c.classList.remove('dragging');
        if (tgt && this.moveTo(it, tgt.x, tgt.y)) SFX.play('ui');
        UI.refreshInventory(); if (UI.isOpen('stash')) Stash.render();
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
  },
};
