// 소모품 · 투척물 (v1.14): 투척 칸(v1.24부터 벨트에 등록) = 투척물 (화염병 · 섬광탄 · 지뢰, T로 바꿈) · 보조 칸 = 보조 (전투 자극제 · 방탄판, Y로 바꿈)
// 얻는 곳: 뒤지기 · 암시장 상인 · 정비공 작업대 제작 (캠프 시설 작업대 단계에 따라)

const GADGET_SLOTS = { throw: ['molotov', 'flash', 'mine'], util: ['stim', 'plate'] };
const MINE_MAX = 4;

const Gadgets = {
  count(k) { const it = G.player.inventory.find(i => i && i.kind === 'cons' && i.key === k); return it ? it.count : 0; },
  sel(slot) {
    const p = G.player; p.gsel = p.gsel || {};
    let k = p.gsel[slot];
    if (!k || !this.count(k)) k = GADGET_SLOTS[slot].find(x => this.count(x)) || k || GADGET_SLOTS[slot][0]; // 가진 것으로 자동 전환
    return (p.gsel[slot] = k);
  },
  cycle(slot) {
    const p = G.player, list = GADGET_SLOTS[slot], cur = this.sel(slot);
    let i = list.indexOf(cur);
    for (let n = 0; n < list.length; n++) { i = (i + 1) % list.length; if (this.count(list[i]) || n === list.length - 1) break; }
    p.gsel[slot] = list[i]; SFX.play('ui');
    floatText(p.x, p.y - 40, CONSUMABLES[list[i]].name, '#cfe', 12);
    UI.buildHotbar();
  },
  take(k) {
    const it = G.player.inventory.find(i => i && i.kind === 'cons' && i.key === k);
    if (!it) return false;
    if (--it.count <= 0) removeItem(it);
    UI.refreshInventory();
    return true;
  },
  use(slot) {
    const p = G.player, k = this.sel(slot);
    if (p.dead) return;
    if (!this.count(k)) { log(`${CONSUMABLES[k].name}이(가) 없습니다. 뒤지기·상인·작업대 제작으로 얻을 수 있습니다.`, '#aaa'); SFX.play('empty'); return; }
    if ((p.gadgetCd || 0) > G.time) return;
    if (World.map === 'camp' && slot === 'throw') { log('캠프에서는 쓸 수 없습니다.', '#aaa'); return; }
    p.gadgetCd = G.time + 0.4;
    if (k === 'molotov' || k === 'flash') {
      const { x: tx, y: ty } = Iso.toWorld(input.mx, input.my);
      const a = Math.atan2(ty - p.y, tx - p.x), d = Math.min(380, Math.hypot(tx - p.x, ty - p.y));
      G.grenades.push({ sx: p.x, sy: p.y, x: p.x, y: p.y, tx: p.x + Math.cos(a) * d, ty: p.y + Math.sin(a) * d, t: 0, dur: 0.5, kind: k });
      SFX.play('swing', 0.6);
    } else if (k === 'mine') {
      if (G.mines.length >= MINE_MAX) G.mines.shift();
      G.mines.push({ x: p.x, y: p.y, arm: 0.8, t: 0 });
      floatText(p.x, p.y - 30, '지뢰 설치', '#cfe', 12); SFX.play('reload');
    } else if (k === 'stim') {
      p.buffs.stim = 12; floatText(p.x, p.y - 30, '전투 자극제!', '#3ad8a0', 15); SFX.play('skill'); burst(p.x, p.y, '#3ad8a0', 12, 90);
    } else if (k === 'plate') {
      const mh = PlayerStats.maxHp(p); p.plate = Math.min(mh * 0.5, (p.plate || 0) + mh * 0.25);
      floatText(p.x, p.y - 30, `방탄판 +${Math.round(mh * 0.25)}`, '#7ab8ff', 15); SFX.play('metal', 1);
    }
    this.take(k);
    Bounty.on && Bounty.on('gadget');
    UI.buildHotbar();
  },

  // 투척물이 땅에 닿았을 때 (updateGrenades)
  land(g) {
    const p = G.player, demo = perk('demolition') ? 1.3 : 1;
    if (g.kind === 'molotov') {
      G.fires.push({ x: g.x, y: g.y, r: 95, t: 0, life: 5, tick: 0, dmg: (10 + p.level * 5) * 0.5 * demo * Camp.dmgMul() });
      burst(g.x, g.y, '#ff8a2a', 20, 160, 0.5, 3); SFX.play('boom', 0.4);
    } else if (g.kind === 'flash') {
      const R = 170;
      for (const e of G.enemies) {
        if (e.hp <= 0 || Math.hypot(e.x - g.x, e.y - g.y) > R + e.r || !World.lineOfSight(g, e)) continue;
        const t = e.def.boss || e.fieldBoss || e.labBoss ? 0.6 : e.nest ? 0 : 2.5;
        if (!t) continue;
        e.stunT = Math.max(e.stunT || 0, t); e.state = 'chase'; e.revealT = 4; Monsters.interrupt(e);
        floatText(e.x, e.y - e.r - 14, '기절', '#fff3a0', 12);
      }
      G.effects.push({ type: 'ring', x: g.x, y: g.y, t: 0, life: 0.35, color: '#ffffff', r: R });
      burst(g.x, g.y, '#ffffff', 24, 220, 0.3, 3); SFX.play('crit', 1.2);
      if (Math.hypot(p.x - g.x, p.y - g.y) < 260) G.flash = { color: '#ffffff', t: 0, life: 0.35, a: 0.55 };
    }
  },

  // 지뢰: 0.8초 뒤 작동, 적이 밟으면 폭발
  update(dt) {
    const p = G.player;
    for (const m of G.mines) {
      m.t += dt; if (m.arm > 0) { m.arm -= dt; continue; }
      if (G.enemies.some(e => e.hp > 0 && !e.def.flying && Math.hypot(e.x - m.x, e.y - m.y) < 30 + e.r)) {
        m.done = true;
        explode(m.x, m.y, (40 + p.level * 32) * (perk('demolition') ? 1.3 : 1) * Camp.dmgMul(), 120 * (perk('demolition') ? 1.3 : 1), { knock: 36, stagger: 0.8 });
        hitstop(0.06); G.shake = Math.max(G.shake, 8);
      }
    }
    G.mines = G.mines.filter(m => !m.done);
  },
  draw() {
    for (const m of G.mines) {
      const sx = Iso.sx(m.x, m.y), sy = Iso.sy(m.x, m.y);
      if (drawPropArt('mine', sx, sy)) { const on = m.arm <= 0 && Math.sin(G.time * 8 + m.x) > 0; ctx.fillStyle = m.arm > 0 ? '#665' : on ? '#ff3030' : '#601010'; ctx.fillRect(sx - 1.5, sy - 6, 3, 2); continue; } // v1.18 그림
      ctx.fillStyle = '#3a4430'; ctx.beginPath(); ctx.ellipse(sx, sy, 9, 4.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5e6b3a'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 8, 4, 0, 0, TAU); ctx.fill();
      const on = m.arm <= 0 && Math.sin(G.time * 8 + m.x) > 0;
      ctx.fillStyle = m.arm > 0 ? '#665' : on ? '#ff3030' : '#601010'; ctx.fillRect(sx - 1.5, sy - 4, 3, 2);
      if (on && Settings.light) addLight(sx, sy, 26, 0.4, 'rgba(255,40,40,A)');
    }
  },
};
