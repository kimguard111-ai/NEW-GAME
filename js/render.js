// 2.5D 쿼터뷰(아이소메트릭) 렌더러
// 월드 좌표 (x, y, 높이 z) → 화면: sx = (x - y)·K, sy = (x + y)·K/2 - z·K
const ISO_K = 0.9;

const Iso = {
  sx: (x, y) => (x - y) * ISO_K - G.cam.x,
  sy: (x, y, z = 0) => (x + y) * ISO_K / 2 - z * ISO_K - G.cam.y,
  // 화면 좌표 → 지면(z) 위 월드 좌표
  toWorld(mx, my, z = 0) {
    const ix = (mx + G.cam.x) / ISO_K, iy = (my + G.cam.y) / ISO_K + z;
    return { x: (ix + 2 * iy) / 2, y: (2 * iy - ix) / 2 };
  },
  // 월드 방향 각도 → 화면상의 단위 방향
  dir(a) {
    const dx = Math.cos(a) - Math.sin(a), dy = (Math.cos(a) + Math.sin(a)) / 2, l = Math.hypot(dx, dy) || 1;
    return { x: dx / l, y: dy / l };
  },
  // 바닥 그리기용 변환 (월드 좌표 그대로 그리면 투영됨)
  groundTransform() { ctx.setTransform(ISO_K, ISO_K / 2, -ISO_K, ISO_K / 2, -G.cam.x, -G.cam.y); },
  reset() { ctx.setTransform(1, 0, 0, 1, 0, 0); },
};

const TILE_COLORS = {
  [T.ROAD]: '#2a2c30', [T.WALK]: '#45464b', [T.RUBBLE]: '#3d3833', [T.GRASS]: '#2c3824',
  [T.CAMP]: '#363c45', [T.CAR]: '#2a2c30', [T.BARRICADE]: '#363c45', [T.BUILDING]: '#1d1d20',
};

// ---------------- 바닥 ----------------
function drawGroundTile(tx, ty, t) {
  const x = tx * TILE, y = ty * TILE, h = hash2(tx, ty);
  ctx.fillStyle = TILE_COLORS[t];
  ctx.fillRect(x, y, TILE + 0.6, TILE + 0.6);
  if (t === T.ROAD || t === T.CAR) {
    const lx = tx % World.BLOCK, ly = ty % World.BLOCK;
    ctx.fillStyle = '#8a7a3a';
    if (lx === 1 && ly >= 3 && ty % 2 === 0) ctx.fillRect(x + 14, y + 4, 4, 18);
    if (ly === 1 && lx >= 3 && tx % 2 === 0) ctx.fillRect(x + 4, y + 14, 18, 4);
    if (h < 0.06) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + h * 200, y + 10, 10, 6); }
  } else if (t === T.WALK) {
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  } else if (t === T.RUBBLE) {
    ctx.fillStyle = '#58524a';
    for (let i = 0; i < 3; i++) {
      const hh = hash2(tx * 3 + i, ty * 7 - i);
      ctx.fillRect(x + hh * 24, y + hash2(ty + i, tx) * 24, 4 + hh * 6, 3 + hh * 4);
    }
  } else if (t === T.GRASS) {
    ctx.fillStyle = '#3a4a2c';
    if (h < 0.5) ctx.fillRect(x + h * 50, y + 8, 3, 3);
    if (h > 0.4) ctx.fillRect(x + 6, y + h * 26, 3, 3);
  } else if (t === T.CAMP) {
    ctx.strokeStyle = 'rgba(120,150,190,0.14)'; ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }
}

// 정적인 바닥을 청크 단위로 미리 그려 캐시 (LRU)
const GroundCache = {
  CH: 16, map: new Map(), LIMIT: 28,
  get(cx, cy) {
    const key = cx + ',' + cy;
    let c = this.map.get(key);
    if (c) { this.map.delete(key); this.map.set(key, c); return c; }
    const CH = this.CH, x0 = cx * CH * TILE, y0 = cy * CH * TILE, span = CH * TILE;
    const left = Math.floor((x0 - y0 - span) * ISO_K) - 2, top = Math.floor((x0 + y0) * ISO_K / 2) - 2;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(2 * span * ISO_K) + 4; cv.height = Math.ceil(span * ISO_K) + 4;
    const g = cv.getContext('2d');
    const saved = ctx; ctx = g;
    g.setTransform(ISO_K, ISO_K / 2, -ISO_K, ISO_K / 2, -left, -top);
    // 경계 이음매 방지를 위해 한 칸씩 더 그림
    for (let ty = cy * CH - 1; ty <= cy * CH + CH; ty++) for (let tx = cx * CH - 1; tx <= cx * CH + CH; tx++) {
      if (tx < 0 || ty < 0 || tx >= World.W || ty >= World.H) continue;
      drawGroundTile(tx, ty, World.tiles[ty * World.W + tx]);
    }
    ctx = saved;
    c = { cv, left, top };
    this.map.set(key, c);
    if (this.map.size > this.LIMIT) this.map.delete(this.map.keys().next().value);
    return c;
  },
  draw(tx0, ty0, tx1, ty1) {
    const CH = this.CH, ox = Math.round(G.cam.x), oy = Math.round(G.cam.y);
    for (let cy = Math.floor(ty0 / CH); cy <= Math.floor(ty1 / CH); cy++)
      for (let cx = Math.floor(tx0 / CH); cx <= Math.floor(tx1 / CH); cx++) {
        const x0 = cx * CH * TILE, y0 = cy * CH * TILE, span = CH * TILE;
        const sl = (x0 - y0 - span) * ISO_K - G.cam.x, st = (x0 + y0) * ISO_K / 2 - G.cam.y;
        if (sl > VW || sl + 2 * span * ISO_K < 0 || st > VH || st + span * ISO_K < 0) continue;
        const c = this.get(cx, cy);
        ctx.drawImage(c.cv, c.left - ox, c.top - oy);
      }
  },
};

// ---------------- 입체 박스 ----------------
function poly(pts, fill) {
  ctx.fillStyle = fill; ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath(); ctx.fill();
}

// (x0,y0)-(x1,y1) 월드 사각형, 높이 h. sz/ez: 남쪽/동쪽 면이 시작되는 높이(이웃 건물에 가려진 부분 제외, -1 = 안 보임)
function drawBox(x0, y0, x1, y1, h, top, south, east, sz, ez, win) {
  const S = Iso.sx, Y = Iso.sy;
  if (sz >= 0 && sz < h) {
    poly([S(x0, y1), Y(x0, y1, sz), S(x1, y1), Y(x1, y1, sz), S(x1, y1), Y(x1, y1, h), S(x0, y1), Y(x0, y1, h)], south);
    if (win) drawWindows(x0, y1, x1, y1, sz, h, win, 0);
  }
  if (ez >= 0 && ez < h) {
    poly([S(x1, y0), Y(x1, y0, ez), S(x1, y1), Y(x1, y1, ez), S(x1, y1), Y(x1, y1, h), S(x1, y0), Y(x1, y0, h)], east);
    if (win) drawWindows(x1, y0, x1, y1, ez, h, win, 1);
  }
  poly([S(x0, y0), Y(x0, y0, h), S(x1, y0), Y(x1, y0, h), S(x1, y1), Y(x1, y1, h), S(x0, y1), Y(x0, y1, h)], top);
}

// 벽면 창문 (층마다 2개)
function drawWindows(ax, ay, bx, by, z0, h, seed, side) {
  for (let fz = 10; fz + 12 < h; fz += 24) {
    if (fz < z0) continue;
    for (let k = 0; k < 2; k++) {
      const u0 = 0.18 + k * 0.42, u1 = u0 + 0.24;
      const lit = hash2(seed * 31 + k + side * 7, fz) < 0.12;
      const ax0 = lerp(ax, bx, u0), ay0 = lerp(ay, by, u0), ax1 = lerp(ax, bx, u1), ay1 = lerp(ay, by, u1);
      poly([Iso.sx(ax0, ay0), Iso.sy(ax0, ay0, fz), Iso.sx(ax1, ay1), Iso.sy(ax1, ay1, fz),
        Iso.sx(ax1, ay1), Iso.sy(ax1, ay1, fz + 11), Iso.sx(ax0, ay0), Iso.sy(ax0, ay0, fz + 11)], lit ? '#c9a24a' : '#16181c');
    }
  }
}

function tileHeight(tx, ty) {
  const t = World.tileAt(tx, ty);
  if (t === T.BUILDING) return World.height[ty * World.W + tx] || 60;
  return 0;
}

function drawSolidTile(o) {
  const { tx, ty, t } = o, x0 = tx * TILE, y0 = ty * TILE, x1 = x0 + TILE, y1 = y0 + TILE;
  const h = hash2(tx, ty);
  if (o.fade) ctx.globalAlpha = 0.3;
  if (t === T.BUILDING) {
    const s = World.shade[ty * World.W + tx], ht = World.height[ty * World.W + tx] || 60;
    const b = 72 + Math.floor(s * 38);
    const ruin = ht < 44;
    const top = ruin ? `rgb(${b - 8},${b - 14},${b - 20})` : `rgb(${b},${b - 3},${b - 8})`;
    const south = `rgb(${b - 34},${b - 37},${b - 42})`, east = `rgb(${b - 20},${b - 23},${b - 28})`;
    drawBox(x0, y0, x1, y1, ht, top, south, east, tileHeight(tx, ty + 1), tileHeight(tx + 1, ty), ruin ? 0 : tx * 977 + ty);
    if (!ruin && h < 0.04) { // 옥상 환풍기
      drawBox(x0 + 9, y0 + 9, x1 - 9, y1 - 9, ht + 8, '#4a4a4e', '#2e2e32', '#3a3a3e', ht, ht, 0);
    }
  } else if (t === T.CAR) {
    const cols = [['#7b4a32', '#4b2a1a', '#5f3824'], ['#56626e', '#333b44', '#454f5a'], ['#6d6a44', '#43412a', '#575536'], ['#44566a', '#28323e', '#364556']];
    const c = cols[Math.floor(h * 4)];
    const vertical = (tx % World.BLOCK) < 3;
    const [ix, iy] = vertical ? [8, 2] : [2, 8];
    drawBox(x0 + ix, y0 + iy, x1 - ix, y1 - iy, 13, c[0], c[1], c[2], 0, 0, 0);
    drawBox(x0 + ix + 3, y0 + iy + 6, x1 - ix - 3, y1 - iy - 6, 21, '#1d2024', '#151719', '#1a1c1f', 13, 13, 0);
  } else if (t === T.BARRICADE) {
    drawBox(x0 + 1, y0 + 1, x1 - 1, y1 - 1, 18, '#9a7e52', '#6a5434', '#7e6640', 0, 0, 0);
  }
  ctx.globalAlpha = 1;
}

// ---------------- 캐릭터 ----------------
function drawShadow(sx, sy, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath(); ctx.ellipse(sx, sy, r * ISO_K * 1.05, r * ISO_K * 0.55, 0, 0, TAU); ctx.fill();
}

// 서 있는 인물. o: {s 크기, body, skin, helmet, aim, gun(길이), blade(색), swing, flash, walk, claws}
function drawHuman(sx, sy, o) {
  const s = o.s || 1, d = Iso.dir(o.aim || 0);
  const bob = o.walk ? Math.sin(o.walk * 12) * 1.2 * s : 0;
  const legA = o.walk ? Math.sin(o.walk * 12) * 2.5 * s : 0;
  const body = o.flash ? '#fff' : o.body, skin = o.flash ? '#fff' : o.skin;
  const back = d.y < -0.15; // 화면 위쪽을 볼 때 무기가 몸 뒤로
  const shY = sy - 22 * s + bob;
  const weapon = () => {
    if (o.gun) {
      ctx.strokeStyle = '#151515'; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      const rc = -(o.recoil || 0); // 사격 반동으로 총이 뒤로 밀림
      ctx.beginPath(); ctx.moveTo(sx + d.x * (3 + rc) * s, shY + 2 * s + d.y * rc * s); ctx.lineTo(sx + d.x * (3 + rc + o.gun) * s, shY + 2 * s + d.y * (o.gun + rc) * s); ctx.stroke();
    }
    if (o.blade) {
      const dd = Iso.dir((o.aim || 0) + (o.swing || 0));
      ctx.strokeStyle = o.blade; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx + dd.x * 6 * s, shY); ctx.lineTo(sx + dd.x * 30 * s, shY + dd.y * 24 * s - 6 * s); ctx.stroke();
    }
    if (o.claws) {
      ctx.strokeStyle = skin; ctx.lineWidth = 4 * s; ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx + side * 6 * s, shY + 2 * s);
        ctx.lineTo(sx + side * 6 * s + d.x * 14 * s, shY + 2 * s + d.y * 10 * s); ctx.stroke();
      }
    }
    // 손
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(sx + d.x * 8 * s, shY + 3 * s + d.y * 4 * s, 2.6 * s, 0, TAU); ctx.fill();
    ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  };
  // 다리
  ctx.fillStyle = o.flash ? '#fff' : (o.legs || '#2a2a2e');
  ctx.fillRect(sx - 5 * s, sy - 11 * s + legA, 4 * s, 11 * s - legA);
  ctx.fillRect(sx + 1 * s, sy - 11 * s - legA, 4 * s, 11 * s + legA);
  if (back) weapon();
  // 몸통
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(sx - 7 * s, sy - 27 * s + bob, 14 * s, 17 * s, 4 * s) : ctx.rect(sx - 7 * s, sy - 27 * s + bob, 14 * s, 17 * s); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(sx + 1 * s, sy - 26 * s + bob, 6 * s, 15 * s);
  // 머리
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(sx, sy - 32 * s + bob, 5.5 * s, 0, TAU); ctx.fill();
  if (o.helmet) {
    ctx.fillStyle = o.flash ? '#fff' : o.helmet;
    ctx.beginPath(); ctx.arc(sx, sy - 33 * s + bob, 6 * s, Math.PI, TAU); ctx.fill();
  }
  if (o.eyes && !back) {
    ctx.fillStyle = o.eyes;
    ctx.fillRect(sx + d.x * 3 * s - 2.5 * s, sy - 33 * s + bob, 1.8 * s, 1.8 * s);
    ctx.fillRect(sx + d.x * 3 * s + 0.8 * s, sy - 33 * s + bob, 1.8 * s, 1.8 * s);
  }
  if (!back) weapon();
}

function nameTag(sx, y, text, color, font = '11px sans-serif') {
  ctx.font = font; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(text, sx + 1, y + 1);
  ctx.fillStyle = color; ctx.fillText(text, sx, y);
}

function drawPlayer(p) {
  const sx = Iso.sx(p.x, p.y), sy = Iso.sy(p.x, p.y);
  drawShadow(sx, sy, p.r);
  const w = curWeapon(), b = w ? WEAPONS[w.key] : null;
  const moving = input.keys['w'] || input.keys['a'] || input.keys['s'] || input.keys['d'];
  const o = { s: 1.05, body: '#3e5f3a', skin: '#d9b48f', helmet: '#2b332a', legs: '#2c3a2c', aim: p.aim, flash: p.hurtT > 0, walk: moving ? G.time : 0 };
  if (b && b.melee) {
    o.blade = w.key === 'katana' ? '#bfe6ff' : w.key === 'axe' ? '#b33' : '#999';
    o.swing = p.swingT > 0 ? (p.swingT / 0.18 - 0.5) * meleeReach(w).arc : -0.5;
  } else if (b) {
    o.gun = w.key === 'sniper' ? 30 : w.key === 'pistol' ? 12 : w.key === 'lmg' ? 26 : w.key === 'shotgun' ? 22 : w.key === 'smg' ? 15 : 20;
    if (p.recoilT > 0) o.recoil = (b.pellets || w.key === 'sniper' ? 6 : 3) * p.recoilT / 0.07;
  }
  drawHuman(sx, sy, o);
  if (p.buffs.adren > 0 || p.buffs.rapid > 0) {
    ctx.strokeStyle = p.buffs.adren > 0 ? 'rgba(255,120,40,0.7)' : 'rgba(120,255,220,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 20, 10, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  }
  nameTag(sx, sy - 48, p.name, '#9fe08f', '12px sans-serif');
  if (p.reloadT > 0) {
    const b2 = WEAPONS[w.key];
    ctx.fillStyle = '#000'; ctx.fillRect(sx - 18, sy + 8, 36, 4);
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(sx - 18, sy + 8, 36 * (1 - p.reloadT / (p.reloadMax || b2.reload)), 4);
  }
}

function drawEnemy(e) {
  const sx = Iso.sx(e.x, e.y) + (e.stunT > 0 ? Math.sin(G.time * 70) * 2 : 0), sy = Iso.sy(e.x, e.y); // 경직 중 흔들림
  if (sx < -120 || sy < -160 || sx > VW + 120 || sy > VH + 80) return;
  const flash = e.hitT > 0, f = e.face || 0;
  const walk = e.state === 'chase' || e.wandering ? G.time + e.x * 0.01 : 0;
  let topY = sy - 44;
  switch (e.type) {
    case 'zombie':
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy + 1, { s: 1, body: '#4f5e3a', skin: '#7f9a5c', legs: '#3b3328', aim: f, claws: true, flash, walk: walk * 0.6, eyes: '#e33' });
      break;
    case 'raider':
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy, { s: 1, body: '#7a3a2a', skin: '#c49a78', helmet: '#a82020', legs: '#2c2620', aim: f, gun: 20, flash, walk });
      break;
    case 'brute':
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy, { s: 1.7, body: '#6a4578', skin: '#9a72a8', legs: '#3a2840', aim: f, claws: true, flash, walk: walk * 0.5, eyes: '#ff0' });
      topY = sy - 70;
      break;
    case 'dog': {
      drawShadow(sx, sy, e.r);
      const d = Iso.dir(f), ang = Math.atan2(d.y, d.x), leg = walk ? Math.sin(walk * 18) * 3 : 0;
      ctx.save(); ctx.translate(sx, sy - 11); ctx.rotate(ang * 0.35);
      ctx.fillStyle = flash ? '#fff' : '#5a3a26';
      ctx.fillRect(-9, 4, 3, 7 + leg); ctx.fillRect(6, 4, 3, 7 - leg);
      ctx.restore();
      ctx.fillStyle = flash ? '#fff' : e.def.color;
      ctx.beginPath(); ctx.ellipse(sx, sy - 12, 14, 7, ang * 0.35, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + d.x * 14, sy - 16 + d.y * 6, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff4'; ctx.fillRect(sx + d.x * 17 - 1, sy - 18 + d.y * 6, 2, 2);
      topY = sy - 28;
      break;
    }
    case 'drone': {
      const hz = 34 + Math.sin(G.time * 5 + e.x) * 4;
      drawShadow(sx, sy, e.r * 0.8);
      const y = sy - hz * ISO_K;
      ctx.fillStyle = flash ? '#fff' : '#6d7f92'; ctx.fillRect(sx - 9, y - 5, 18, 10);
      ctx.fillStyle = flash ? '#fff' : e.def.color; ctx.fillRect(sx - 9, y - 9, 18, 5);
      ctx.fillStyle = 'rgba(200,220,240,0.45)';
      for (const ox of [-13, 13]) { ctx.beginPath(); ctx.ellipse(sx + ox, y - 10, 9, 3, 0, 0, TAU); ctx.fill(); }
      ctx.fillStyle = e.state === 'chase' ? '#f33' : '#3f3'; ctx.beginPath(); ctx.arc(sx, y + 1, 2.5, 0, TAU); ctx.fill();
      topY = y - 18;
      break;
    }
    case 'boss': {
      const pulse = 1 + Math.sin(G.time * 4) * 0.06;
      ctx.fillStyle = 'rgba(80,255,90,0.16)';
      ctx.beginPath(); ctx.ellipse(sx, sy, e.r * 1.7 * pulse, e.r * 0.85 * pulse, 0, 0, TAU); ctx.fill();
      drawShadow(sx, sy, e.r);
      drawHuman(sx, sy, { s: 2.8 * pulse, body: '#2f6a3a', skin: '#5fbf5a', legs: '#1f3a24', aim: f, claws: true, flash, walk: walk * 0.4, eyes: '#eaff5a' });
      topY = sy - 115;
      break;
    }
  }
  if (!e.def.boss) {
    const lvDiff = e.level - G.player.level;
    nameTag(sx, topY, `Lv${e.level} ${e.def.name}`, lvDiff >= 4 ? '#f66' : lvDiff >= 1 ? '#fc8' : lvDiff <= -4 ? '#999' : '#eee');
    if (e.hp < e.maxHp) {
      ctx.fillStyle = '#300'; ctx.fillRect(sx - 16, topY + 4, 32, 4);
      ctx.fillStyle = '#e33'; ctx.fillRect(sx - 16, topY + 4, 32 * e.hp / e.maxHp, 4);
    }
  }
}

function drawNpc(n) {
  const sx = Iso.sx(n.x, n.y), sy = Iso.sy(n.x, n.y);
  drawShadow(sx, sy, 12);
  const look = {
    merchant: { body: '#7a6420', helmet: '#3a2a10', legs: '#3a3020' },
    captain: { body: '#35507a', helmet: '#22324a', legs: '#262c36', gun: 18 },
    medic: { body: '#e8e8e8', helmet: '#c33', legs: '#555' },
    mechanic: { body: '#5a5a62', helmet: '#c98a20', legs: '#33333a', blade: '#aaa' },
  }[n.id];
  drawHuman(sx, sy, { s: 1.05, skin: '#d9b48f', aim: angleTo(n, G.player), ...look });
  nameTag(sx, sy - 50, n.name, '#ffd76a', 'bold 12px sans-serif');
  let mark = null;
  if (n.id === 'captain') {
    const p = G.player, q = QUESTS[p.quest.idx];
    if (q && p.quest.active && p.quest.progress >= q.count) mark = ['?', '#ffd700'];
    else if (q && !p.quest.active && p.level >= q.minLevel) mark = ['!', '#ffd700'];
  } else if (n.id === 'merchant') mark = ['₵', '#bbb'];
  else if (n.id === 'medic') mark = ['✚', '#f55'];
  else if (n.id === 'mechanic') mark = ['⚙', '#ddd'];
  if (mark) {
    ctx.font = 'bold 20px sans-serif'; ctx.fillStyle = mark[1];
    ctx.fillText(mark[0], sx, sy - 66 + Math.sin(G.time * 3) * 3);
  }
}

// ---------------- 메인 렌더 ----------------
function render() {
  const p = G.player;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#08080a'; ctx.fillRect(0, 0, VW, VH);

  // 화면에 보이는 타일 범위 (높은 건물을 위해 아래쪽 여유)
  const corners = [Iso.toWorld(0, -40), Iso.toWorld(VW, -40), Iso.toWorld(0, VH + 220), Iso.toWorld(VW, VH + 220)];
  const tx0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c.x)) / TILE) - 1);
  const tx1 = Math.min(World.W - 1, Math.ceil(Math.max(...corners.map(c => c.x)) / TILE) + 1);
  const ty0 = Math.max(0, Math.floor(Math.min(...corners.map(c => c.y)) / TILE) - 1);
  const ty1 = Math.min(World.H - 1, Math.ceil(Math.max(...corners.map(c => c.y)) / TILE) + 1);
  const inView = (tx, ty, extraTop) => {
    const cx = (tx * TILE + 16), cy = (ty * TILE + 16);
    const sx = Iso.sx(cx, cy), sy = Iso.sy(cx, cy);
    return sx > -60 && sx < VW + 60 && sy > -40 && sy < VH + 40 + extraTop;
  };

  // 1) 바닥 (캐시된 청크) + 바닥 위 효과 (변환 행렬 사용)
  GroundCache.draw(tx0, ty0, tx1, ty1);
  const solids = [];
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const t = World.tiles[ty * World.W + tx];
    if (!SOLID.has(t)) continue;
    const tall = t === T.BUILDING ? World.height[ty * World.W + tx] * ISO_K + 20 : 30;
    if (inView(tx, ty, tall)) solids.push({ d: tx + ty + 1, tx, ty, t });
  }
  Iso.groundTransform();
  for (const d of G.decals) {
    ctx.fillStyle = 'rgba(90,10,10,0.45)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, d.a, 0, TAU); ctx.fill();
  }
  const bx = World.bossTile.x * TILE + 16, by = World.bossTile.y * TILE + 16;
  ctx.strokeStyle = 'rgba(80,255,90,0.3)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(bx, by, 7.5 * TILE, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  // 근접 공격 궤적
  const w = curWeapon();
  if (w && WEAPONS[w.key].melee && p.swingT > 0 && !p.dead) {
    const b = WEAPONS[w.key];
    ctx.strokeStyle = `rgba(255,255,255,${p.swingT * 3})`; ctx.lineWidth = 4;
    const rc = meleeReach(w);
    ctx.beginPath(); ctx.arc(p.x, p.y, rc.range * 0.85, p.aim - rc.arc / 2, p.aim + rc.arc / 2); ctx.stroke(); ctx.lineWidth = 1;
  }
  for (const ef of G.effects) {
    const k = ef.t / ef.life;
    if (ef.type === 'boom') {
      ctx.fillStyle = `rgba(255,170,60,${0.55 * (1 - k)})`; ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r * (0.4 + k * 0.6), 0, TAU); ctx.fill();
    } else if (ef.type === 'ring') {
      ctx.strokeStyle = ef.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(ef.x, ef.y, ef.r * k, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
  }
  if (G.boss && G.boss.charge > 0.8) {
    ctx.strokeStyle = 'rgba(255,60,60,0.5)'; ctx.lineWidth = G.boss.r * 1.6;
    ctx.beginPath(); ctx.moveTo(G.boss.x, G.boss.y);
    ctx.lineTo(G.boss.x + Math.cos(G.boss.chargeA) * 330, G.boss.y + Math.sin(G.boss.chargeA) * 330); ctx.stroke(); ctx.lineWidth = 1;
  }
  // 아이템 바닥 빛
  for (const d of G.drops) if (d.kind === 'item') {
    ctx.fillStyle = RARITIES[d.item.rarity || 0].color; ctx.globalAlpha = 0.25 + Math.sin(G.time * 5) * 0.1;
    ctx.beginPath(); ctx.arc(d.x, d.y, 14, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  Iso.reset();

  // 2) 입체 오브젝트 + 캐릭터 깊이 정렬
  const objs = solids;
  const pd = (p.x + p.y) / TILE, psx = Iso.sx(p.x, p.y), psy = Iso.sy(p.x, p.y, 18);
  for (const o of solids) {
    // 플레이어를 가리는 앞쪽 건물은 반투명
    if (o.t === T.BUILDING && o.d > pd + 0.3) {
      const cx = o.tx * TILE + 16, cy = o.ty * TILE + 16;
      const sx = Iso.sx(cx, cy), ht = World.height[o.ty * World.W + o.tx];
      if (Math.abs(sx - psx) < 60 && psy > Iso.sy(cx, cy, ht) - 20 && psy < Iso.sy(cx, cy) + 20) o.fade = true;
    }
  }
  const depth = e => (e.x + e.y) / TILE;
  for (const n of G.npcs) objs.push({ d: depth(n), draw: drawNpc, ent: n });
  for (const e of G.enemies) objs.push({ d: depth(e) + (e.def.flying ? 0.5 : 0), draw: drawEnemy, ent: e });
  for (const d of G.drops) objs.push({ d: depth(d), draw: drawDrop, ent: d });
  if (!p.dead) objs.push({ d: pd, draw: drawPlayer, ent: p });
  objs.sort((a, b) => a.d - b.d);
  for (const o of objs) o.draw ? o.draw(o.ent) : drawSolidTile(o);

  // 3) 투사체 / 파티클 (위에 그림)
  for (const b of G.bullets) {
    const sx = Iso.sx(b.x, b.y), sy = Iso.sy(b.x, b.y, 22);
    if (b.from === 'p') {
      const tx = b.x - b.vx * 0.018, ty = b.y - b.vy * 0.018;
      ctx.strokeStyle = b.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(Iso.sx(tx, ty), Iso.sy(tx, ty, 22)); ctx.stroke();
    } else {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(sx, sy, (b.r || 3) + 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(sx, sy, (b.r || 3) * 0.4, 0, TAU); ctx.fill();
    }
  }
  ctx.lineWidth = 1;
  for (const ef of G.effects) if (ef.type === 'zap') { // 연쇄 타격 번개
    ctx.strokeStyle = `rgba(150,220,255,${1 - ef.t / ef.life})`; ctx.lineWidth = 3;
    const ax = Iso.sx(ef.x, ef.y), ay = Iso.sy(ef.x, ef.y, 20), bx = Iso.sx(ef.x2, ef.y2), by = Iso.sy(ef.x2, ef.y2, 20);
    ctx.beginPath(); ctx.moveTo(ax, ay);
    for (let k = 1; k < 4; k++) ctx.lineTo(lerp(ax, bx, k / 4) + rand(-6, 6), lerp(ay, by, k / 4) + rand(-6, 6));
    ctx.lineTo(bx, by); ctx.stroke(); ctx.lineWidth = 1;
  }
  for (const g of G.grenades) {
    drawShadow(Iso.sx(g.x, g.y), Iso.sy(g.x, g.y), 4);
    ctx.fillStyle = '#4a5a3a'; ctx.beginPath(); ctx.arc(Iso.sx(g.x, g.y), Iso.sy(g.x, g.y, 6 + g.h * 1.5), 4, 0, TAU); ctx.fill();
  }
  for (const pt of G.particles) {
    ctx.globalAlpha = 1 - pt.t / pt.life; ctx.fillStyle = pt.color;
    ctx.fillRect(Iso.sx(pt.x, pt.y) - pt.size / 2, Iso.sy(pt.x, pt.y, pt.z ?? 16) - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  // 4) 분위기 / 조명
  const grd = ctx.createRadialGradient(psx, psy, 140, psx, psy, Math.max(VW, VH) * 0.75);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(1, `rgba(0,0,0,${G.darkness + 0.25})`);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = `rgba(10,8,20,${G.darkness * 0.35})`; ctx.fillRect(0, 0, VW, VH);
  const tint = ZONES[G.zone].tint;
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, VW, VH); }
  if (p.hurtT > 0) { ctx.fillStyle = `rgba(200,0,0,${p.hurtT})`; ctx.fillRect(0, 0, VW, VH); }
  const mh = PlayerStats.maxHp(p);
  if (!p.dead && p.hp < mh * 0.3) {
    const a = 0.25 + Math.sin(G.time * 6) * 0.1;
    const g2 = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.8);
    g2.addColorStop(0, 'rgba(120,0,0,0)'); g2.addColorStop(1, `rgba(140,0,0,${a})`);
    ctx.fillStyle = g2; ctx.fillRect(0, 0, VW, VH);
  }

  // 5) 떠오르는 텍스트
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    const sx = Iso.sx(t.x, t.y), sy = Iso.sy(t.x, t.y, t.z);
    ctx.globalAlpha = 1 - t.t / t.life;
    ctx.font = `bold ${t.size}px sans-serif`;
    ctx.fillStyle = '#000'; ctx.fillText(t.text, sx + 1, sy + 1);
    ctx.fillStyle = t.color; ctx.fillText(t.text, sx, sy);
  }
  ctx.globalAlpha = 1;
}

function drawDrop(d) {
  const sx = Iso.sx(d.x, d.y), sy = Iso.sy(d.x, d.y, 6 + Math.sin(G.time * 4 + d.x) * 2);
  if (d.kind === 'credits') {
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.ellipse(sx, sy, 5, 5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a07a10'; ctx.stroke();
  } else if (d.kind === 'ammo') {
    ctx.fillStyle = '#7a7a3a'; ctx.fillRect(sx - 6, sy - 5, 12, 8);
    ctx.fillStyle = '#cc8'; ctx.fillRect(sx - 4, sy - 3, 8, 2);
  } else {
    const r = d.item.rarity || 0, c = RARITIES[r].color;
    if (r >= 2) { // 희귀 이상: 멀리서도 보이는 빛기둥
      const gy = Iso.sy(d.x, d.y), hgt = 40 + r * 25;
      const g = ctx.createLinearGradient(0, gy - hgt, 0, gy);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, c);
      ctx.globalAlpha = 0.35 + Math.sin(G.time * 4) * 0.1; ctx.fillStyle = g;
      ctx.fillRect(sx - 3 - r, gy - hgt, 6 + r * 2, hgt); ctx.globalAlpha = 1;
    }
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.item.icon, sx, sy - 2);
    nameTag(sx, sy - 20, itemName(d.item), c);
  }
}

// 미니맵 (쿼터뷰 방향에 맞춰 회전)
function drawMinimapIso(mm) {
  const g = mm.getContext('2d'), p = G.player, k = 1.25;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, mm.width, mm.height);
  const px = p.x / TILE, py = p.y / TILE;
  g.setTransform(k, k / 2, -k, k / 2, mm.width / 2 - (px - py) * k, mm.height / 2 - (px + py) * k / 2);
  g.imageSmoothingEnabled = false;
  g.drawImage(World.minimapBase, 0, 0);
  const dot = (x, y, c, r) => { g.fillStyle = c; g.fillRect(x / TILE - r / 2, y / TILE - r / 2, r, r); };
  for (const n of G.npcs) dot(n.x, n.y, '#ffd76a', 3);
  for (const e of G.enemies) dot(e.x, e.y, e.def.boss ? '#d4f' : '#f44', e.def.boss ? 6 : 2.5);
  dot(World.bossTile.x * TILE, World.bossTile.y * TILE, 'rgba(80,255,90,0.85)', 5);
  dot(p.x, p.y, '#fff', 4);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
