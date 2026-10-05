// v1.41 동료 생존자: 캠프 대장 한씨에게서 고용 → 출격에 한 명 데리고 감. 알아서 따라오고 쏨
// 쓰러지면 [E]로 일으킴 (25초 안에) · 못 일으키면 이번 출격만 빠짐 (영영 잃지 않음)
const COMPANIONS = {
  assault: { sprite: 'player_military_long', tint: 'hue-rotate(-25deg) saturate(0.8) brightness(0.92)', name: '박 상병', role: '돌격', lvl: 5, price: 1500, hpMul: 1.4, dmg: 9, rate: 0.17, range: 420, spread: 0.06, speed: 950, gun: 20, snd: 'rifle',
    look: { body: '#4a5a3a', helmet: '#3a4a2a', legs: '#2a2e22' }, desc: '소총으로 꾸준히 쏜다. 맷집이 좋다.',
    bark: { hire: '"박 상병, 따라가겠습니다."', kill: ['하나 처리!', '정리됐습니다.', '다음!'], hurt: ['윽, 맞았습니다!', '엄호 바랍니다!'], down: '"…먼저 가십시오…"', up: '"고맙습니다. 아직 싸울 수 있습니다."' } },
  sniper: { sprite: 'player_tactical_long', tint: 'sepia(0.35) brightness(0.9)', name: '윤 저격수', role: '저격', lvl: 10, price: 3000, hpMul: 0.8, dmg: 58, rate: 1.5, range: 720, spread: 0.008, speed: 1500, pierce: 1, gun: 28, snd: 'sniper',
    look: { body: '#5a5040', helmet: '#3a3226', legs: '#2a261e' }, desc: '멀리서 한 방씩. 관통한다. 몸은 약하다.',
    bark: { hire: '"멀리 있는 건 내가 맡지."', kill: ['명중.', '하나.', '쓰러졌다.'], hurt: ['가까이 붙었어!', '거리 좀 벌려 줘!'], down: '"…총 좀… 챙겨 줘…"', up: '"빚졌네."' } },
  medic: { sprite: 'player_vest_pistol', tint: 'saturate(0.4) brightness(1.12)', name: '서 간호사', role: '의무', lvl: 8, price: 2500, hpMul: 1.0, dmg: 8, rate: 0.5, range: 380, spread: 0.05, speed: 950, gun: 12, snd: 'pistol', heal: true,
    look: { body: '#d8d0c0', helmet: null, legs: '#4a4a52' }, desc: '권총은 약하지만 내 체력이 70% 아래면 12초마다 15% 치료해 준다.',
    bark: { hire: '"다치면 바로 말해요."', kill: ['휴…', '맞았다!'], hurt: ['아파요!', '저 좀 지켜 줘요!'], down: '"…괜찮아요… 가요…"', up: '"고마워요. 이번엔 제가 지킬게요."', heal: ['가만있어 봐요, 붕대 감을게요.', '피 좀 멈추고 가요.', '움직이지 마요!'] } },
};

const Companion = {
  def() { const p = G.player; return p && p.comp && COMPANIONS[p.comp] || null; },
  maxHp(p) { const d = this.def(); return Math.round((70 + p.level * 24) * d.hpMul); },

  // ---------- 캠프: 고용 · 고르기 ----------
  open() {
    const p = G.player; p.compHired = p.compHired || [];
    let h = '"혼자 다니면 오래 못 가. 같이 나갈 사람을 붙여 주지. 한 번에 한 명만."<br>';
    const btns = [];
    for (const [id, d] of Object.entries(COMPANIONS)) {
      const hired = p.compHired.includes(id), on = p.comp === id, lock = p.level < d.lvl;
      h += `<div class="map-row${on ? '' : ''}" style="padding:4px 6px;border:1px solid #2f2b22;margin:4px 0"><b style="color:${on ? '#9fbf6a' : '#e6dfcc'}">${d.name}</b> <span class="muted">${d.role}</span>${on ? ' <span style="color:#9fbf6a">· 함께 가는 중</span>' : ''}<br><span class="muted">${d.desc}${hired ? '' : ` 고용 ₵${fmt(d.price)}`}${lock ? ` (Lv${d.lvl}부터)` : ''}</span></div>`;
      if (lock) continue;
      if (!hired) btns.push([`${d.name} 고용 (₵${fmt(d.price)})`, () => {
        if (p.credits < d.price) return log('크레딧이 부족합니다.', '#f88');
        p.credits -= d.price; p.compHired.push(id); p.comp = id; G.comp = null; SFX.play('buy'); log(`${d.name}: ${d.bark.hire}`, '#9fd0ff'); saveGame(); this.open();
      }]);
      else if (!on) btns.push([`${d.name} 데려가기`, () => { p.comp = id; G.comp = null; SFX.play('equip'); log(`${d.name}: ${d.bark.hire}`, '#9fd0ff'); saveGame(); this.open(); }]);
    }
    if (p.comp) btns.push(['혼자 가기', () => { p.comp = null; G.comp = null; saveGame(); this.open(); }]);
    btns.push(['닫기', () => UI.close('dialog')]);
    UI.dialog('생존자 대장 한씨 — 동료', h, btns);
  },

  // ---------- 매 프레임 ----------
  spawn(p) {
    const d = this.def(); let x = p.x, y = p.y;
    for (let i = 0; i < 16; i++) { const a = rand(0, TAU), r = rand(36, 70), nx = p.x + Math.cos(a) * r, ny = p.y + Math.sin(a) * r; if (!World.circleBlocked(nx, ny, 12)) { x = nx; y = ny; break; } }
    G.comp = { id: p.comp, map: World.map, x, y, r: 10, def: { flying: false }, sideDir: 1, hp: this.maxHp(p), state: 'follow', atkT: 1, tgtT: 0, face: 0, walk: 0, hitT: 0, lastHurt: -9, healT: 6, barkT: 3, say: null, apart: 0 };
  },
  update(dt) {
    const p = G.player, d = this.def();
    if (!d || p.dead) return;
    if (!G.comp || G.comp.map !== World.map || G.comp.id !== p.comp) this.spawn(p);
    const c = G.comp;
    c.hitT -= dt; c.barkT -= dt; if (c.say && (c.say.t -= dt) <= 0) c.say = null;
    if (c.state === 'gone') return;
    if (c.state === 'down') {
      if ((c.downT -= dt) <= 0) { c.state = 'gone'; if (c.rev) c.rev.done = true; log(`${d.name}이(가) 부상을 입고 물러났다. 다음 출격엔 다시 온다.`, '#ff9a7a'); }
      return;
    }
    const mh = this.maxHp(p); c.hp = Math.min(c.hp, mh);
    // 따라가기: 플레이어 뒤쪽 50px · 멀면 따라잡기 · 다른 공간(건물 안팎)이면 잠시 뒤 따라 들어옴
    const dd = Math.hypot(p.x - c.x, p.y - c.y), same = Interiors.sameSpace(c);
    c.apart = same ? 0 : c.apart + dt;
    if (dd > 480 || c.apart > 1.2) { for (let i = 0; i < 16; i++) { const a = rand(0, TAU), nx = p.x + Math.cos(a) * 40, ny = p.y + Math.sin(a) * 40; if (!World.circleBlocked(nx, ny, 12) && Interiors.sameSpace({ x: nx, y: ny })) { c.x = nx; c.y = ny; c.apart = 0; break; } } }
    else {
      const gx = p.x - Math.cos(p.aim) * 50, gy = p.y - Math.sin(p.aim) * 50, gd = Math.hypot(gx - c.x, gy - c.y);
      if (gd > 26 && dd > 46) { const a = Math.atan2(gy - c.y, gx - c.x), sp = PlayerStats.speed(p) * (dd > 160 ? 1.25 : 0.95) * dt; this.move(c, a, sp); c.walk += dt; c.movedT = G.time; if (!c.tgt) c.face = a; }
    }
    // 쏘기: 가까운 적 (보이는 것)
    if ((c.tgtT -= dt) <= 0) {
      c.tgtT = 0.3; c.tgt = null; let bd = d.range;
      for (const e of G.enemies) { if (e.hp <= 0 || enemyCloaked(e)) continue; const ed = Math.hypot(e.x - c.x, e.y - c.y); if (ed < bd && (e.state === 'chase' || ed < 260) && World.lineOfSight(c, e)) { bd = ed; c.tgt = e; } }
    }
    c.atkT -= dt;
    if (c.tgt && c.tgt.hp > 0 && !World.inSafe(p.x, p.y)) {
      const e = c.tgt, a = Math.atan2(e.y - c.y, e.x - c.x); c.face = a;
      if (c.atkT <= 0) {
        c.atkT = d.rate * rand(0.9, 1.15); c.lastAtk = G.time;
        const aa = a + rand(-d.spread, d.spread), mx = c.x + Math.cos(a) * 14, my = c.y + Math.sin(a) * 14, crit = Math.random() < 0.08;
        const dmg = d.dmg * (1 + (p.level - 1) * 0.14) * (crit ? 1.8 : 1);
        G.bullets.push({ x: mx, y: my, vx: Math.cos(aa) * d.speed, vy: Math.sin(aa) * d.speed, from: 'p', ally: true, life: d.range / d.speed, maxLife: d.range / d.speed, dmg, crit, pierce: d.pierce || 0, hit: [], w: null, color: '#9fd0ff', sid: -1 });
        Juice.flashes.push({ x: mx, y: my, a, t: 0, life: 0.05, s: d.snd === 'sniper' ? 16 : 10 });
        SFX.playAt(d.snd, c.x, c.y, 0.55, 1000);
        if (d.snd === 'sniper') G.effects.push({ type: 'tracer', x: mx, y: my, x2: e.x, y2: e.y, t: 0, life: 0.25, color: 'rgba(160,210,255,0.7)', w: 2 });
      }
    }
    if (c.tgt && c.tgt.hp <= 0) { if (c.barkT <= 0 && Math.random() < 0.35) this.bark(pick(d.bark.kill)); c.tgt = null; }
    // 의무: 치료
    if (d.heal && (c.healT -= dt) <= 0 && p.hp < PlayerStats.maxHp(p) * 0.7 && dd < 260) {
      c.healT = 12; const amt = Math.round(PlayerStats.maxHp(p) * 0.15); p.hp = Math.min(PlayerStats.maxHp(p), p.hp + amt);
      floatText(p.x, p.y - 34, '+' + amt, '#6f6', 15); SFX.play('heal'); this.bark(pick(d.bark.heal));
    }
    // 맞기: 붙은 적 · 적 총알 · 폭발 (캠프·안전 지대는 안전)
    if (World.inSafe(c.x, c.y)) { c.hp = Math.min(mh, c.hp + mh * 0.1 * dt); return; }
    let hurt = 0;
    for (const o of G.enemies) if (o.hp > 0 && o.state === 'chase' && !o.def.ranged && Math.hypot(o.x - c.x, o.y - c.y) < o.r + 14 && (o.compT = (o.compT || 0) - dt) <= 0) { o.compT = o.def.atkCd * 1.3; hurt += o.dmg * 0.7; }
    for (const b of G.bullets) if (b.from === 'e' && b.life > 0 && Math.hypot(b.x - c.x, b.y - c.y) < 12) { hurt += b.dmg * 0.8; b.life = 0; }
    for (const s of G.strikes) if (s.t < s.delay && s.t + dt >= s.delay && Math.hypot(s.x - c.x, s.y - c.y) < s.r + 10) hurt += s.dmg * 0.8;
    if (hurt > 0) { c.hp -= hurt; c.hitT = 0.1; c.lastHurt = G.time; floatText(c.x, c.y - 34, Math.round(hurt), '#ff9a7a', 12); if (c.barkT <= 0 && c.hp < mh * 0.5) this.bark(pick(d.bark.hurt)); }
    else if (G.time - c.lastHurt > 6) c.hp = Math.min(mh, c.hp + mh * 0.03 * dt); // 싸움이 멎으면 조금씩 회복
    if (c.hp <= 0) this.down(c, d);
  },
  move(c, a, step) { // 적용 길찾기와 달리 안전 지대(캠프)에도 들어감 · 막히면 옆으로 비켜 감
    step *= World.slow(c.x, c.y);
    for (const off of [0, c.sideDir * 0.8, -c.sideDir * 0.8, c.sideDir * 1.6, -c.sideDir * 1.6]) {
      const ox = c.x, oy = c.y; World.move(c, Math.cos(a + off) * step, Math.sin(a + off) * step);
      if (Math.hypot(c.x - ox, c.y - oy) > step * 0.5) return;
    }
    c.sideDir *= -1;
  },
  bark(text) { const c = G.comp; if (!c) return; c.say = { text, t: 2.2 }; c.barkT = 5; },
  down(c, d) {
    c.state = 'down'; c.hp = 0; c.downT = 25; c.tgt = null; this.bark(d.bark.down); SFX.play('ehit');
    UI.toast(`${d.name} 쓰러짐`, '25초 안에 다가가서 [E]로 일으키자');
    c.rev = { ext: true, kind: 'c_revive', x: c.x, y: c.y, hint: `[E] ${d.name} 일으키기 (2.5초)`, dur: 2.5, open: true,
      onFinish: e => { e.done = true; c.state = 'follow'; c.hp = Math.round(this.maxHp(G.player) * 0.4); c.rev = null; this.bark(d.bark.up); SFX.play('heal'); },
      track: () => `${d.name} 쓰러짐 — ${Math.ceil(c.downT)}초`, mini: (g, e, b) => { if (b) { g.fillStyle = '#7ad0ff'; g.fillRect(e.x / TILE - 2, e.y / TILE - 2, 4, 4); } } };
    if (G.player.raid) RaidEvents.list.push(c.rev);
  },
  trackerLine() {
    const c = G.comp, d = this.def(); if (!c || !d || !G.player.raid) return '';
    if (c.state === 'gone') return `<br><span class="muted">${d.name} — 물러남</span>`;
    if (c.state === 'down') return '';
    return `<br><span class="muted">동료 ${d.name} · 체력 ${Math.round(100 * c.hp / this.maxHp(G.player))}%</span>`;
  },

  // ---------- 그리기 ----------
  collect(objs) { const c = G.comp; if (c && c.state !== 'gone' && this.def() && c.map === World.map) objs.push({ d: (c.x + c.y) / TILE, draw: () => this.draw(c), ent: c }); },
  draw(c) {
    const d = this.def(), sx = Iso.sx(c.x, c.y), sy = Iso.sy(c.x, c.y); if (sx < -60 || sx > VW + 60 || sy < -80 || sy > VH + 60) return;
    drawShadow(sx, sy, 11);
    const o = { s: 1, body: d.look.body, skin: '#c49a78', helmet: d.look.helmet, legs: d.look.legs, aim: c.face || 0, gun: d.gun, flash: c.hitT > 0, walk: c.state === 'follow' ? c.walk * 6 : 0 };
    if (c.state === 'down') { ctx.save(); ctx.translate(sx, sy); ctx.rotate(1.35); ctx.translate(-sx, -sy); if (Sprites.get(d.sprite)) { if ('filter' in ctx) ctx.filter = d.tint; Sprites.draw(d.sprite, 'idle', 0, sx, sy, 0, false); } else drawHuman(sx, sy, o); ctx.restore();
      const k = c.downT / 25; ctx.strokeStyle = '#7ad0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - 6, 16, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.lineWidth = 1;
      nameTag(sx, sy - 30, `${d.name} — [E] 일으키기`, '#7ad0ff', 'bold 12px "Malgun Gothic", sans-serif'); return; }
    if (Sprites.get(d.sprite)) { // v1.41 플레이어 그림을 색만 바꿔 씀 (없으면 코드 그림)
      const [anim, at] = animState(c.state === 'follow' && c.walk > 0 && G.time - (c.movedT || -9) < 0.15, c.hitT, c.lastAtk, d.sprite);
      ctx.save(); if ('filter' in ctx) ctx.filter = d.tint; Sprites.draw(d.sprite, anim, at, sx, sy, c.face || 0, c.hitT > 0); ctx.restore();
    } else drawHuman(sx, sy, o);
    const mh = this.maxHp(G.player);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 14, sy - 50, 28, 3); ctx.fillStyle = '#7ad0ff'; ctx.fillRect(sx - 14, sy - 50, 28 * Math.max(0, c.hp / mh), 3);
    nameTag(sx, sy - 54, d.name, '#9fd0ff', 'bold 11px "Malgun Gothic", sans-serif');
    if (c.say) { ctx.globalAlpha = Math.min(1, c.say.t * 2); nameTag(sx, sy - 68, c.say.text, '#e6dfcc', 'bold 12px "Malgun Gothic", sans-serif'); ctx.globalAlpha = 1; }
  },
};
