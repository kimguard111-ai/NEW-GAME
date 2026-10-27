// v2.0 한강 다리 (7장 · Lv30~34): 물가에 있으면 깊은 물에서 물귀신 변이체가 올라옴
// 강 둑(둔치) 근처에 있을 때만 · 20초 안팎마다 2~3마리 · 보스전 중엔 안 올라옴 · 첫 번에만 알림
const Hangang = {
  t: 14, told: false,
  update(dt) {
    const p = G.player, R = World.river;
    if (World.map !== 'hangang' || !R || !p.raid || p.dead || bossFight()) return;
    if ((this.t -= dt) > 0) return;
    const ty = p.y / TILE, near = ty > R.r0 - 9 && ty < R.r1 + 9;
    this.t = near ? rand(24, 36) : 5; if (!near) return;
    const north = ty < (R.r0 + R.r1) / 2, by = north ? R.r0 - 2 : R.r1 + 2, z = ZONES[World.zoneIndex()], n = 2 + (Math.random() < 0.25 ? 1 : 0);
    let made = 0;
    for (let k = 0; k < 24 && made < n; k++) {
      const x = p.x + rand(-340, 340), y = (by + rand(-0.4, 0.4)) * TILE + 16;
      if (!World.groundOk(x, y) || World.circleBlocked(x, y, 14)) continue;
      const d = Math.hypot(x - p.x, y - p.y); if (d < 170 || d > 420) continue;
      const e = makeEnemy('drowned', x, y, randInt(z.lvl[0], z.lvl[1])); e.state = 'chase'; e.heard = true; G.enemies.push(e); made++;
      burst(x, y - (north ? 30 : -30), '#7ab8d8', 14, 120, 0.5, 3); // 물보라 (강 쪽에서)
    }
    if (made) { SFX.play('water', 1.4); SFX.play('growl', 0.7); floatText(p.x, p.y - 40, '물에서 무언가 올라온다', '#7ab8d8', 14); if (!this.told) { this.told = true; log('물가에선 깊은 물에서 물귀신 변이체가 올라온다. 둔치에서 멀어지면 덜 온다.', '#7ab8d8'); } }
  },
  reset() { this.t = 14; },
};
