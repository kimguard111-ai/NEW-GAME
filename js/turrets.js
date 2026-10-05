// 엔지니어 포탑 (v1.26): 스킬 「포탑 설치」로 커서 근처에 자동 포탑을 세움. 지속 시간이 지나면 사라짐 (적은 포탑을 노리지 않음)
// 갈래 a 화염 포탑 (짧은 사거리 · 앞쪽 적 여럿을 태움) / b 박격 포탑 (느리지만 범위 폭발)
// 숙련: 지속 +6초 · 숙달: 동시에 2개 · 궁극: 사라질 때 자폭
const TURRET = { range: 320, flameR: 150, mortarR: 420, rate: 0.3, flameRate: 0.2, mortarRate: 1.6, place: 150 };

const Turrets = {
  place(p) {
    const m = smod('turret'), max = stree('turret', 'r2') ? 2 : 1;
    let { x, y } = Iso.toWorld(input.mx, input.my);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > TURRET.place) { x = p.x + (x - p.x) / d * TURRET.place; y = p.y + (y - p.y) / d * TURRET.place; }
    if (World.circleBlocked(x, y, 12) || !World.lineOfSight(p, { x, y })) { x = p.x + Math.cos(p.aim) * 30; y = p.y + Math.sin(p.aim) * 30; if (World.circleBlocked(x, y, 12)) { x = p.x; y = p.y; } }
    while (G.turrets.length >= max) this.end(G.turrets.shift());
    G.turrets.push({ x, y, t: 0, life: SkillCalc.turretDur(p), cd: 0.4, a: p.aim, mod: m, flash: 0 });
    burst(x, y, '#9fe0ff', 10, 90, 0.3); SFX.play('reload');
    floatText(x, y - 30, m === 'a' ? '화염 포탑' : m === 'b' ? '박격 포탑' : '포탑 설치', '#9fe0ff', 13);
  },
  end(t) {
    if (stree('turret', 'cap')) { // 궁극: 자폭 프로토콜
      explode(t.x, t.y, SkillCalc.turretDmg(G.player) * 6, 130, { knock: 30, stagger: 0.6 });
      floatText(t.x, t.y - 30, '자폭!', '#ff8a3a', 14);
    } else burst(t.x, t.y, '#888', 8, 70, 0.4);
  },
  update(dt) {
    const p = G.player;
    for (const t of G.turrets) {
      t.t += dt; t.cd -= dt; t.flash = Math.max(0, t.flash - dt);
      if (t.t >= t.life) { t.done = true; this.end(t); continue; }
      const R = t.mod === 'a' ? TURRET.flameR : t.mod === 'b' ? TURRET.mortarR : TURRET.range;
      let best = null, bd = R;
      for (const e of G.enemies) {
        if (e.hp <= 0 || e.hidden) continue;
        const d = Math.hypot(e.x - t.x, e.y - t.y) - e.r;
        if (d < bd && World.lineOfSight(t, e)) { bd = d; best = e; }
      }
      if (!best) continue;
      const a = Math.atan2(best.y - t.y, best.x - t.x); t.a = a;
      if (t.cd > 0) continue;
      const dmg = SkillCalc.turretDmg(p);
      if (t.mod === 'a') { // 화염: 앞쪽 60° 안의 적 모두
        t.cd = TURRET.flameRate;
        for (const e of G.enemies) {
          if (e.hp <= 0 || Math.hypot(e.x - t.x, e.y - t.y) > R + e.r) continue;
          const da = Math.abs(((Math.atan2(e.y - t.y, e.x - t.x) - a + Math.PI * 3) % TAU) - Math.PI);
          if (da < 0.55) damageEnemy(e, dmg * 0.55, false, a, { knock: 1, noProc: true });
        }
        for (let i = 0; i < 4; i++) { const q = a + rand(-0.45, 0.45), v = rand(200, 420); G.particles.push({ x: t.x, y: t.y, vx: Math.cos(q) * v, vy: Math.sin(q) * v, t: 0, life: 0.35, color: i % 2 ? '#ff8a2a' : '#ffd27a', size: 4 }); }
      } else if (t.mod === 'b') { // 박격: 포물선으로 날아가 범위 폭발
        t.cd = TURRET.mortarRate;
        G.grenades.push({ sx: t.x, sy: t.y, x: t.x, y: t.y, tx: best.x, ty: best.y, t: 0, dur: 0.6, tdmg: dmg * 2.4, tr: 70 });
        SFX.play('boom', 0.25);
      } else { // 기본: 기관포
        t.cd = TURRET.rate;
        const s = 900, life = R / s * 1.15;
        G.bullets.push({ x: t.x + Math.cos(a) * 12, y: t.y + Math.sin(a) * 12, vx: Math.cos(a) * s, vy: Math.sin(a) * s, from: 'p', life, maxLife: life, dmg, crit: false, pierce: 0, hit: [], color: '#9fe0ff' });
        SFX.play('shoot', 0.25);
      }
      t.flash = 0.06;
    }
    G.turrets = G.turrets.filter(t => !t.done);
  },
  drawOne(t) {
    const sx = Iso.sx(t.x, t.y), sy = Iso.sy(t.x, t.y), K = ISO_K, col = t.mod === 'a' ? '#c8642a' : t.mod === 'b' ? '#6a7a4a' : '#4a6a8a';
    drawShadow(sx, sy, 14);
    const ak = t.mod === 'a' ? 'turret_flame' : t.mod === 'b' ? 'turret_mortar' : 'turret';
    if (propArt(ak)) { // v1.31.2 포탑 그림 (총구가 오른쪽) — 조준 방향이 왼쪽이면 뒤집음 · 섬광·남은 시간은 코드
      drawPropArt(ak, sx, sy, Math.cos(t.a) - Math.sin(t.a) < 0);
      const d = Iso.dir(t.a);
      if (t.flash > 0 && t.mod !== 'a') { ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(sx + d.x * 16, sy - 20 * K + d.y * 8, 3.5, 0, TAU); ctx.fill(); }
      const k2 = 1 - t.t / t.life; ctx.strokeStyle = k2 < 0.25 ? '#ff6a4a' : '#9fe0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - 40 * K, 4, -Math.PI / 2, -Math.PI / 2 + TAU * k2); ctx.stroke(); ctx.lineWidth = 1;
      return;
    }
    ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 2; // 삼각대
    for (const q of [-2.2, -0.9, 0.6]) { ctx.beginPath(); ctx.moveTo(sx, sy - 10 * K); ctx.lineTo(sx + Math.cos(q) * 11, sy + Math.sin(q) * 5); ctx.stroke(); }
    drawBox(t.x - 7, t.y - 7, t.x + 7, t.y + 7, 22, col, '#2a2e34', '#3a3e44', 10, 10, 0);
    const bx = sx, by = sy - 18 * K, dx = Math.cos(t.a) - Math.sin(t.a), dy = (Math.cos(t.a) + Math.sin(t.a)) / 2, L = t.mod === 'b' ? 12 : 16;
    ctx.strokeStyle = '#1e2024'; ctx.lineWidth = t.mod === 'b' ? 5 : 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + dx * L * 0.75, by + dy * L * 0.75 - (t.mod === 'b' ? 6 : 0)); ctx.stroke(); ctx.lineWidth = 1;
    if (t.flash > 0 && t.mod !== 'a') { ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(bx + dx * L * 0.8, by + dy * L * 0.8, 3.5, 0, TAU); ctx.fill(); }
    const k = 1 - t.t / t.life; // 남은 시간
    ctx.strokeStyle = k < 0.25 ? '#ff6a4a' : '#9fe0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - 34 * K, 4, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.lineWidth = 1;
    if (Settings.light && Light.list.length < LIGHT_CAP) addLight(sx, sy - 20, 40, 0.35, t.mod === 'a' ? 'rgba(255,140,60,A)' : 'rgba(140,220,255,A)');
  },
};
