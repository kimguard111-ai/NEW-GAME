// 손맛 (v1.28): 총구 섬광 · 탄피 · 조준선(반동에 따라 벌어짐) · 명중 표시(맞히면 흰 X, 처치하면 붉은 X)
const Juice = {
  flashes: [], casings: [], hm: null, spread: 0,
  reset() { this.flashes = []; this.casings = []; this.hm = null; },
  shot(p, w, mx, my, a) {
    const b = WEAPONS[w.key], big = b.pellets || w.key === 'sniper';
    this.flashes.push({ x: mx, y: my, a, t: 0, life: big ? 0.07 : 0.045, s: big ? 15 : w.key === 'lmg' || w.key === 'rifle' ? 11 : 8 });
    this.spread = Math.min(1, this.spread + (big ? 0.7 : w.key === 'pistol' ? 0.35 : 0.18));
    if (Math.random() < (w.key === 'smg' || w.key === 'lmg' ? 0.6 : 1)) { // 탄피: 총 오른쪽으로 튀어 바닥에 굴러 떨어짐
      const side = a + Math.PI / 2 + rand(-0.4, 0.4), v = rand(60, 120);
      this.casings.push({ x: p.x, y: p.y, z: 16, vx: Math.cos(side) * v, vy: Math.sin(side) * v, vz: rand(90, 160), t: 0, rest: false, rot: rand(0, TAU), shell: !!b.pellets });
      if (this.casings.length > 80) this.casings.shift();
    }
  },
  hit(kill) { this.hm = { t: 0, kill: kill || (this.hm && this.hm.kill && this.hm.t < 0.05) }; },
  update(dt) {
    this.spread = Math.max(0, this.spread - dt * 2.2);
    if (this.hm && (this.hm.t += dt) > (this.hm.kill ? 0.28 : 0.14)) this.hm = null;
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter(f => f.t < f.life);
    for (const c of this.casings) {
      c.t += dt;
      if (c.rest) continue;
      c.vz -= 620 * dt; c.z += c.vz * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += dt * 18;
      if (c.z <= 0) { c.z = 0; if (c.vz < -60) { c.vz *= -0.35; c.vx *= 0.5; c.vy *= 0.5; if (Math.random() < 0.35) SFX.play('casing', 0.25); } else c.rest = true; }
      if (World.solidAt(c.x, c.y)) { c.vx = -c.vx * 0.3; c.vy = -c.vy * 0.3; }
    }
    this.casings = this.casings.filter(c => c.t < 6);
  },
  drawWorld() { // 바닥 위 (캐릭터보다 먼저 그려지는 층이 아니라 총알과 같은 층)
    for (const c of this.casings) {
      const sx = Iso.sx(c.x, c.y), sy = Iso.sy(c.x, c.y, c.z), fade = c.t > 4.5 ? 1 - (c.t - 4.5) / 1.5 : 1;
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(sx, sy); ctx.rotate(c.rot);
      ctx.fillStyle = c.shell ? '#b8342a' : '#d8a842'; ctx.fillRect(-1.6, -0.8, 3.2, 1.6);
      if (c.shell) { ctx.fillStyle = '#d8a842'; ctx.fillRect(0.8, -0.8, 0.8, 1.6); }
      ctx.restore();
    }
    for (const f of this.flashes) {
      const sx = Iso.sx(f.x, f.y), sy = Iso.sy(f.x, f.y, 22), d = Iso.dir(f.a), k = 1 - f.t / f.life, s = f.s * (0.7 + k * 0.5);
      ctx.save(); ctx.translate(sx + d.x * s * 0.4, sy + d.y * s * 0.4); ctx.rotate(Math.atan2(d.y, d.x));
      ctx.globalAlpha = k; ctx.fillStyle = '#ffcf5a';
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(0, -s * 0.32); ctx.lineTo(s * 1.15, 0); ctx.lineTo(0, s * 0.32); ctx.closePath(); ctx.fill(); // 앞으로 뻗는 불꽃
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.35, -s * 0.55); ctx.lineTo(s * 0.45, 0); ctx.lineTo(s * 0.35, s * 0.55); ctx.closePath(); ctx.fill(); // 옆 불꽃
      ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(0, 0, s * 0.22, 0, TAU); ctx.fill();
      ctx.restore();
    }
  },
  drawHUD() { // 조준선 · 명중 표시 (화면 좌표 = 마우스)
    if (IS_TOUCH || !G.player || G.player.dead || G.paused) return;
    const p = G.player, w = curWeapon(), b = w && WEAPONS[w.key], x = input.mx, y = input.my;
    ctx.save(); ctx.lineCap = 'round';
    if (!b || b.melee) { // 근접: 작은 점 + 사거리 원 느낌의 짧은 호
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.stroke();
    } else {
      const reload = p.reloadT > 0, gap = 5 + (b.spread || 0) * 70 * (1 - gearBonus(p, 'accuracy', w)) + this.spread * 10, len = 6;
      for (const pass of [0, 1]) {
        ctx.strokeStyle = pass ? (reload ? '#8a8a8a' : '#f2ecd8') : 'rgba(0,0,0,0.55)'; ctx.lineWidth = pass ? 1.6 : 3.4;
        ctx.beginPath();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(x + dx * gap, y + dy * gap); ctx.lineTo(x + dx * (gap + len), y + dy * (gap + len)); }
        ctx.stroke();
      }
      ctx.fillStyle = '#f2ecd8'; ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      if (reload) { const k = 1 - p.reloadT / (p.reloadMax || 1); ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, gap + len + 4, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k, 0, 1)); ctx.stroke(); }
    }
    if (this.hm) { // 명중 X
      const k = this.hm.kill, t = this.hm.t, r1 = 5 + t * 30, r2 = r1 + (k ? 8 : 5);
      ctx.strokeStyle = k ? '#ff3a2a' : '#ffffff'; ctx.lineWidth = k ? 2.6 : 1.8; ctx.globalAlpha = 1 - t / (k ? 0.28 : 0.14);
      ctx.beginPath();
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { ctx.moveTo(x + dx * r1 * 0.7, y + dy * r1 * 0.7); ctx.lineTo(x + dx * r2 * 0.7, y + dy * r2 * 0.7); }
      ctx.stroke();
    }
    ctx.restore();
  },
};
