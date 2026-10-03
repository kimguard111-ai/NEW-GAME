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
  [T.CAMP]: '#363c45', [T.CAR]: '#2a2c30', [T.BARRICADE]: '#363c45', [T.BUILDING]: '#1d1d20', [T.LANDMARK]: '#3a3833',
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

// ---------------- 스프라이트 (js/assets.js 에 등록된 그림) ----------------
const Sprites = {
  load() {
    for (const s of [...Object.values(ART.sprites), ...Object.values(ART.landmarks)]) {
      const im = new Image(); s.ready = false; // 다시 읽을 때 이전 상태가 남지 않게
      im.onload = () => { s.ready = true; };
      im.onerror = () => console.warn('에셋을 불러오지 못해 기본 그래픽을 사용합니다:', ART.dir + s.file);
      im.src = ART.dir + s.file; s.img = im;
    }
  },
  loadAll() { // 무기·헬멧 그림까지 포함
    const cache = {}; // 한 파일에 여러 무기·헬멧(rect)이 들어 있으면 한 번만 읽음
    for (const s of [...Object.values(ART.weapons), ...Object.values(ART.helmets)]) {
      let im = cache[s.file];
      if (!im) {
        im = cache[s.file] = new Image(); im.users = [];
        im.onload = () => im.users.forEach(u => { u.ready = true; });
        im.onerror = () => console.warn('무기·헬멧 그림을 불러오지 못해 기본 그래픽을 사용합니다:', ART.dir + s.file);
        im.src = ART.dir + s.file;
      }
      im.users.push(s); s.img = im; s.ready = false;
    }
    this.load();
  },
  get(key) { const s = ART.sprites[key]; return s && s.ready ? s : null; },
  // 애니메이션 길이(초)
  dur(s, anim) { return s.anims[anim] ? s.anims[anim][1] / (ART.fps[anim] || 8) : 0; },
  // 그리기. anim 이 없으면 idle 로 대체. t = 애니메이션 시작 후 경과(초). 성공 시 true
  draw(key, anim, t, sx, sy, faceA, flash) {
    const s = this.get(key);
    if (!s) return false;
    const d = Iso.dir(faceA || 0);
    if (!s.anims[anim]) anim = s.anims.idle ? 'idle' : Object.keys(s.anims)[0];
    if (d.y < -0.35 && s.anims['back_' + anim]) anim = 'back_' + anim; // 등 돌린 그림이 있으면 사용
    const [row, n] = s.anims[anim], fps = ART.fps[anim.replace('back_', '')] || 8;
    const once = /attack|hit|death/.test(anim);
    const f = once ? Math.min(n - 1, Math.floor(t * fps)) : Math.floor(t * fps) % n;
    const sc = (ART.height[key] || ART.height[key.split('_')[0]] || 44) / (s.cell * ART.charFill), size = s.cell * sc, cw = s.w || s.cell; // w: 칸 가로 (없으면 정사각형)
    ctx.save();
    ctx.translate(sx, sy + ART.feetPad * sc);
    if (d.x < 0) ctx.scale(-1, 1); // 그림은 오른쪽을 보는 기준, 왼쪽은 좌우 반전
    if (flash && 'filter' in ctx) ctx.filter = 'brightness(2.6)';
    ctx.drawImage(s.img, f * cw, row * s.cell, cw, s.cell, -cw * sc / 2, -size, cw * sc, size);
    ctx.restore();
    // 머리 위치 (가공 도구가 기록한 프레임별 값, 발 기준 칸 좌표)
    const hd = s.heads && s.heads[anim] && s.heads[anim][f];
    return { anim, sc, flip: d.x < 0, head: hd ? { x: hd[0], y: hd[1], w: s.headW || 20 } : null };
  },
};

// 엔티티 상태 → 애니메이션 (lastAtk: 마지막 공격 시각)
function animState(moving, hitT, lastAtk, key) {
  const s = Sprites.get(key);
  if (hitT > 0) return ['hit', 0.12 - hitT];
  if (s && lastAtk !== undefined && G.time - lastAtk < Math.max(0.15, Sprites.dur(s, 'attack'))) return ['attack', G.time - lastAtk];
  return moving ? ['walk', G.time] : ['idle', G.time];
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
    ctx.beginPath(); ctx.arc(sx, sy - 33 * s + bob, 6.4 * s, Math.PI, TAU); ctx.fill();
    ctx.fillRect(sx - 6.4 * s, sy - 33.5 * s + bob, 12.8 * s, 1.5 * s); // 챙
  } else if (o.hair) {
    ctx.fillStyle = o.flash ? '#fff' : o.hair;
    ctx.beginPath(); ctx.arc(sx, sy - 33.5 * s + bob, 5.6 * s, Math.PI * 1.05, TAU * 0.98); ctx.fill();
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
  // 장비 외형: 방어구 → 옷 색, 헬멧 → 머리 장비 (그림이 없을 때의 코드 그래픽)
  const arm = p.equip.armor, hel = p.equip.helmet;
  const LOOK = { vest: ['#3e5f3a', '#2c3a2c'], tactical: ['#6b6447', '#3e3a2a'], military: ['#3d4a5c', '#262e3a'], exo: ['#7d848c', '#4a4f55'] };
  const look = arm ? LOOK[arm.key] : ['#5a5048', '#3a332c'];
  const HEL = { cap: '#3b4a32', tacHelmet: '#26292c', gasmask: '#4a5a3a', exoHelm: '#9aa2aa' };
  const o = { s: 1.05, body: look[0], skin: '#d9b48f', helmet: hel ? HEL[hel.key] : null, legs: look[1], aim: p.aim, flash: p.hurtT > 0, walk: moving ? G.time : 0,
    eyes: hel && hel.key === 'gasmask' ? '#7fff6a' : hel && hel.key === 'exoHelm' ? '#6cf' : null, hair: '#2a2420' };
  // 고강화(+7) 장비가 있으면 발밑에 빛
  const maxPlus = Math.max(0, ...['w1', 'w2', 'armor', 'helmet'].map(k => (p.equip[k] && p.equip[k].plus) || 0));
  if (maxPlus >= 7) {
    ctx.strokeStyle = `rgba(255,215,106,${0.35 + Math.sin(G.time * 4) * 0.15 + (maxPlus - 7) * 0.08})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 17, 8.5, 0, 0, TAU); ctx.stroke(); ctx.lineWidth = 1;
  }
  if (b && b.melee) {
    o.blade = w.key === 'katana' ? '#bfe6ff' : w.key === 'axe' ? '#b33' : '#999';
    o.swing = p.swingT > 0 ? (p.swingT / 0.18 - 0.5) * meleeReach(w).arc : -0.5;
  } else if (b) {
    o.gun = w.key === 'sniper' ? 30 : w.key === 'pistol' ? 12 : w.key === 'lmg' ? 26 : w.key === 'shotgun' ? 22 : w.key === 'smg' ? 15 : 20;
    if (p.recoilT > 0) o.recoil = (b.pellets || w.key === 'sniper' ? 6 : 3) * p.recoilT / 0.07;
  }
  const [anim, at] = animState(moving, p.hurtT, p.lastAtk, 'player');
  const bodyKey = arm && Sprites.get('player_' + arm.key) ? 'player_' + arm.key : 'player'; // 방어구별 몸 그림
  if (Sprites.get(bodyKey)) {
    // 몸 그림(무기·헬멧 없음) + 헬멧을 머리에, 무기를 손에 붙여 그림. 화면 위쪽을 보면 무기가 몸 뒤로
    const back = Iso.dir(p.aim).y < -0.15;
    if (back && w) drawWeaponOverlay(sx, sy, w, p);
    const info = Sprites.draw(bodyKey, anim, at, sx, sy, p.aim, p.hurtT > 0);
    if (hel && info.anim.indexOf('death') < 0) drawHelmetOverlay(sx, sy, info, hel, o.helmet);
    if (!back && w) drawWeaponOverlay(sx, sy, w, p);
  } else drawHuman(sx, sy, o);
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

// 몸 그림의 머리 위치에 헬멧 씌우기 (헬멧 그림이 없으면 코드로 그린 반구)
function drawHelmetOverlay(sx, sy, info, hel, color) {
  const sc = info.sc, hd = info.head || { x: 0, y: -(ART.height.player || 44) / sc, w: 20 };
  const hx = sx + hd.x * sc * (info.flip ? -1 : 1), hy = sy + hd.y * sc, hw = hd.w * sc * ART.helmetFit.w;
  const art = ART.helmets[hel.key];
  if (art && art.ready) {
    const [rx, ry, rw, rh] = art.rect || [0, 0, art.img.width, art.img.height];
    const h = rh * hw / rw;
    ctx.save(); ctx.translate(hx, hy - hw * ART.helmetFit.up); if (info.flip) ctx.scale(-1, 1);
    ctx.drawImage(art.img, rx, ry, rw, rh, -hw / 2, 0, hw, h);
    ctx.restore();
  } else {
    ctx.fillStyle = color || '#333';
    ctx.beginPath(); ctx.ellipse(hx, hy + hw * 0.32, hw / 2, hw * 0.42, 0, Math.PI, TAU); ctx.fill();
  }
}

// 플레이어 손에 무기 그리기 (무기 그림이 있으면 그림, 없으면 코드로 그린 총·칼)
function drawWeaponOverlay(sx, sy, w, p) {
  const b = WEAPONS[w.key], len = ART.weaponLen[w.key] || 26;
  const swing = b.melee ? (p.swingT > 0 ? (p.swingT / 0.18 - 0.5) * meleeReach(w).arc : -0.5) : 0;
  const d = Iso.dir(p.aim + swing), ang = Math.atan2(d.y, d.x);
  const rc = !b.melee && p.recoilT > 0 ? (b.pellets || w.key === 'sniper' ? 6 : 3) * p.recoilT / 0.07 : 0; // 반동
  const H = ART.height.player || 44, fw = H * (ART.handX ?? 0.1);
  const hx = sx + d.x * (fw - rc), hy = sy - H * ART.handY + d.y * (fw * 0.5 - rc);
  const art = ART.weapons[w.key];
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  if (Math.cos(ang) < 0) ctx.scale(1, -1); // 왼쪽을 겨눌 때 무기가 뒤집혀 보이지 않게
  if (art && art.ready) {
    const [rx, ry, rw, rh] = art.rect || [0, 0, art.img.width, art.img.height]; // rect: 한 장 안의 위치
    const sc = len / rw, grip = art.grip ?? ART.weaponGrip[w.key] ?? 0.3, h = rh * sc * ART.weaponThick;
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 2; // 어두운 테두리로 몸·바닥과 구분
    ctx.drawImage(art.img, rx, ry, rw, rh, -rw * sc * grip, -h / 2, rw * sc, h);
  } else {
    ctx.lineCap = 'round';
    if (b.melee) { ctx.strokeStyle = w.key === 'katana' ? '#bfe6ff' : w.key === 'axe' ? '#b33' : '#999'; ctx.lineWidth = 3; }
    else { ctx.strokeStyle = '#151515'; ctx.lineWidth = 4; }
    ctx.beginPath(); ctx.moveTo(-len * 0.2, 0); ctx.lineTo(len * 0.8, 0); ctx.stroke();
    ctx.lineCap = 'butt'; ctx.lineWidth = 1;
  }
  ctx.restore();
}

function drawEnemy(e) {
  const sx = Iso.sx(e.x, e.y) + (e.stunT > 0 ? Math.sin(G.time * 70) * 2 : 0), sy = Iso.sy(e.x, e.y); // 경직 중 흔들림
  if (sx < -120 || sy < -160 || sx > VW + 120 || sy > VH + 80) return;
  const flash = e.hitT > 0, f = e.face || 0;
  const walk = e.state === 'chase' || e.wandering ? G.time + e.x * 0.01 : 0;
  let topY = sy - 44;
  if (Sprites.get(e.type)) {
    const hz = e.def.flying ? (34 + Math.sin(G.time * 5 + e.x) * 4) * ISO_K : 0;
    drawShadow(sx, sy, e.r * (e.def.flying ? 0.8 : 1));
    if (e.def.boss) { ctx.fillStyle = 'rgba(80,255,90,0.16)'; ctx.beginPath(); ctx.ellipse(sx, sy, e.r * 1.7, e.r * 0.85, 0, 0, TAU); ctx.fill(); }
    const [anim, at] = animState(walk !== 0 && e.stunT <= 0, e.stunT > 0 ? Math.min(0.1, e.stunT) : e.hitT, e.lastAtk, e.type);
    Sprites.draw(e.type, anim, at, sx, sy - hz, f, flash);
    topY = sy - hz - ART.height[e.type] - 6;
  } else switch (e.type) {
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
  if (!Sprites.draw(n.id, 'idle', G.time + n.x * 0.01, sx, sy, angleTo(n, G.player), false))
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

// ---------------- 조명 ----------------
// 어둠 레이어를 깔고 광원 위치만 지워서 밝힘. color 가 있는 광원은 색 번짐(가산)도 더함
const Light = { cv: document.createElement('canvas'), list: [] };
function addLight(x, y, r, a = 1, color = null) { Light.list.push({ x, y, r, a, color }); }
function isBurningCar(tx, ty) { return hash2(tx * 7, ty * 13) < 0.18 && World.distTiles(tx * TILE, ty * TILE) > World.safeR + 4; }

function renderLighting(dark) {
  // 어둠 레이어는 부드러운 그라데이션뿐이라 절반 해상도로 그리고 확대 (성능)
  const c = Light.cv, LW = Math.ceil(VW / 2), LH = Math.ceil(VH / 2);
  if (c.width !== LW || c.height !== LH) { c.width = LW; c.height = LH; }
  const g = c.getContext('2d');
  g.setTransform(0.5, 0, 0, 0.5, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, VW, VH);
  g.fillStyle = `rgba(4,5,12,${dark})`; g.fillRect(0, 0, VW, VH);
  g.globalCompositeOperation = 'destination-out';
  for (const l of Light.list) {
    if (l.x < -l.r || l.y < -l.r || l.x > VW + l.r || l.y > VH + l.r) continue;
    g.save(); g.translate(l.x, l.y); g.scale(1, 0.62); // 쿼터뷰 바닥에 맞춰 타원형
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, l.r);
    gr.addColorStop(0, `rgba(0,0,0,${l.a})`); gr.addColorStop(0.55, `rgba(0,0,0,${l.a * 0.55})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(-l.r, -l.r, l.r * 2, l.r * 2);
    g.restore();
  }
  ctx.drawImage(c, 0, 0, VW, VH);
  // 색 번짐
  ctx.globalCompositeOperation = 'lighter';
  for (const l of Light.list) {
    if (!l.color || l.x < -l.r || l.y < -l.r || l.x > VW + l.r || l.y > VH + l.r) continue;
    const gr2 = l.r * 0.5;
    const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, gr2);
    gr.addColorStop(0, l.color.replace('A', (0.35 * l.a).toFixed(2))); gr.addColorStop(1, l.color.replace('A', '0'));
    ctx.fillStyle = gr; ctx.fillRect(l.x - gr2, l.y - gr2, gr2 * 2, gr2 * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  Light.list.length = 0;
}

// 불타는 폐차: 불꽃·연기 파티클 (월드가 멈춘 히트스톱 중에는 생성 안 함)
function burnFx(tx, ty) {
  const x = tx * TILE + 16, y = ty * TILE + 16, fl = 0.85 + Math.sin(G.time * 13 + tx) * 0.08 + Math.sin(G.time * 7.3 + ty) * 0.07;
  addLight(Iso.sx(x, y), Iso.sy(x, y, 18), 170 * fl, 0.85, 'rgba(255,140,40,A)');
  if (G.hitstop > 0 || G.particles.length > 500) return;
  if (Math.random() < 0.5) G.particles.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-8, 8), vy: rand(-8, 8), z: 16, vz: rand(30, 60), t: 0, life: rand(0.35, 0.7), color: pick(['#ff9a30', '#ffcf5a', '#ff6a20']), size: rand(3, 6) });
  if (Math.random() < 0.12) G.particles.push({ x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-5, 5), vy: rand(-5, 5), z: 30, vz: rand(20, 32), t: 0, life: rand(1.2, 2), color: 'rgba(55,55,60,0.55)', size: rand(8, 13) });
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
    if (!SOLID.has(t) || t === T.LANDMARK) continue;
    const tall = t === T.BUILDING ? World.height[ty * World.W + tx] * ISO_K + 20 : 30;
    if (inView(tx, ty, tall)) solids.push({ d: tx + ty + 1, tx, ty, t });
  }
  Iso.groundTransform();
  for (const d of G.decals) {
    ctx.fillStyle = 'rgba(90,10,10,0.45)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, d.a, 0, TAU); ctx.fill();
  }
  for (const h of World.hazards) { // 방사능 웅덩이
    const pul = 0.75 + Math.sin(G.time * 2.5 + h.x) * 0.15;
    const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
    g.addColorStop(0, `rgba(120,255,80,${0.55 * pul})`); g.addColorStop(0.7, `rgba(60,200,40,${0.35 * pul})`); g.addColorStop(1, 'rgba(40,120,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
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
  for (const c of G.corpses) objs.push({ d: depth(c) - 0.3, draw: drawCorpse, ent: c });
  for (const l of World.landmarks) {
    const sx = Iso.sx(l.x, l.y);
    if (sx < -400 || sx > VW + 400) continue;
    // 플레이어가 뒤에 있으면 반투명
    const top = Iso.sy(l.x, l.y, 380), bot = Iso.sy(l.x + l.size * 16, l.y + l.size * 16);
    l.fade = l.tx + l.ty + l.size > pd && Math.abs(psx - sx) < l.size * TILE * ISO_K && psy > top && psy < bot;
    objs.push({ d: l.tx + l.ty + l.size, draw: drawLandmark, ent: l });
  }
  if (!p.dead) objs.push({ d: pd, draw: drawPlayer, ent: p });
  objs.sort((a, b) => a.d - b.d);
  for (const o of objs) {
    if (o.draw) o.draw(o.ent);
    else { drawSolidTile(o); if (o.t === T.CAR && isBurningCar(o.tx, o.ty)) burnFx(o.tx, o.ty); }
  }

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
  if (!p.dead) addLight(psx, psy, Math.max(VW, VH) * 0.62, 0.97);
  if (p.recoilT > 0) addLight(psx + Math.cos(p.aim) * 20, psy - 6, 150, 0.9, 'rgba(255,200,110,A)');
  const cc = World.campCenter();
  addLight(Iso.sx(cc.x, cc.y), Iso.sy(cc.x, cc.y), 420, 0.8); // 캠프 조명 (넓어서 색 번짐은 생략)
  for (const ef of G.effects) if (ef.type === 'boom') addLight(Iso.sx(ef.x, ef.y), Iso.sy(ef.x, ef.y), ef.r * 2.4 * (1 - ef.t / ef.life), 1, 'rgba(255,150,50,A)');
  for (const b of G.bullets) if (b.from === 'e') addLight(Iso.sx(b.x, b.y), Iso.sy(b.x, b.y, 22), 36, 0.6, b.r > 4 ? 'rgba(120,255,100,A)' : 'rgba(255,90,60,A)');
  for (const h of World.hazards) addLight(Iso.sx(h.x, h.y), Iso.sy(h.x, h.y), h.r * 2.6, 0.75, 'rgba(110,255,80,A)');
  for (const l of World.landmarks) {
    const lc = { cathedral: 'rgba(255,190,120,A)', bosingak: 'rgba(255,90,60,A)', base: 'rgba(230,240,255,A)', tower63: 'rgba(255,210,100,A)' }[l.id];
    addLight(Iso.sx(l.x, l.y), Iso.sy(l.x, l.y, 20), l.size * 70, 0.8, lc);
  }
  if (G.boss) addLight(Iso.sx(G.boss.x, G.boss.y), Iso.sy(G.boss.x, G.boss.y), 230, 0.7, 'rgba(90,255,100,A)');
  for (const d of G.drops) if (d.kind === 'item' && (d.item.rarity || 0) >= 2) addLight(Iso.sx(d.x, d.y), Iso.sy(d.x, d.y), 70, 0.8, RARITIES[d.item.rarity].color.replace(/^#(..)(..)(..)$/, (m, r, g, b) => `rgba(${parseInt(r, 16)},${parseInt(g, 16)},${parseInt(b, 16)},A)`));
  renderLighting(Math.min(0.9, G.darkness + 0.32));
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

// ---------------- 랜드마크 ----------------
// 여러 칸에 걸친 면에 32px 간격으로 창문
function boxWin(x0, y0, x1, y1, h, top, south, east, seed, z0 = 0) {
  drawBox(x0, y0, x1, y1, h, top, south, east, z0, z0, 0);
  if (!seed) return;
  for (let x = x0; x < x1 - 8; x += 32) drawWindows(x, y1, Math.min(x + 32, x1), y1, z0, h, seed + x, 0);
  for (let y = y0; y < y1 - 8; y += 32) drawWindows(x1, y, x1, Math.min(y + 32, y1), z0, h, seed + y * 3, 1);
}

function drawLandmark(l) {
  const x0 = l.tx * TILE, y0 = l.ty * TILE, x1 = x0 + l.size * TILE, y1 = y0 + l.size * TILE;
  if (l.fade) ctx.globalAlpha = 0.35;
  const art = ART.landmarks[l.id];
  if (art && art.ready) { // Gemini 그림: 발판 너비에 맞춰 남쪽 꼭짓점 기준으로 그림
    const w = 2 * l.size * TILE * ISO_K, sc = w / art.img.width;
    ctx.drawImage(art.img, Iso.sx(l.x, l.y) - w / 2, Iso.sy(x1, y1) + 2 - art.img.height * sc, w, art.img.height * sc);
  } else if (l.id === 'cathedral') {
    drawBox(x0 + 4, y0 + 4, x1 - 4, y1 - 4, 8, '#5a524a', '#3a342e', '#4a433c', 0, 0, 0);
    boxWin(x0 + 14, y0 + 10, x1 - 10, y1 - 30, 70, '#7a4636', '#4e2a20', '#633628', 911);
    drawBox(x0 + 26, y0 + 20, x1 - 22, y1 - 40, 96, '#3a2a26', '#2a1e1a', '#33241f', 70, 70, 0);
    boxWin(x0 + 12, y1 - 46, x0 + 50, y1 - 8, 150, '#80503c', '#52301f', '#6a3c2b', 313);
    drawBox(x0 + 22, y1 - 36, x0 + 40, y1 - 18, 210, '#3a2a26', '#2a1e1a', '#33241f', 150, 150, 0);
    const cx = Iso.sx(x0 + 31, y1 - 27), cy = Iso.sy(x0 + 31, y1 - 27, 210);
    ctx.strokeStyle = '#d9c9a0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 22); ctx.moveTo(cx - 7, cy - 15); ctx.lineTo(cx + 7, cy - 15); ctx.stroke(); ctx.lineWidth = 1;
    drawBox(x1 - 40, y1 - 22, x1 - 6, y1 - 4, 14, '#5d5048', '#3a322c', '#4a3f38', 0, 0, 0); // 무너진 잔해
  } else if (l.id === 'bosingak') {
    drawBox(x0 + 4, y0 + 4, x1 - 4, y1 - 4, 16, '#8a8a84', '#5a5a56', '#6e6e6a', 0, 0, 0);
    for (const [px, py] of [[x0 + 20, y0 + 20], [x1 - 28, y0 + 20], [x0 + 20, y1 - 28], [x1 - 28, y1 - 28]])
      drawBox(px, py, px + 8, py + 8, 66, '#a8322a', '#6e1e18', '#8a2820', 16, 16, 0);
    drawBox(x0 + 44, y0 + 44, x1 - 44, y1 - 44, 56, '#5a3a20', '#3a2410', '#4a2e18', 16, 16, 0); // 종
    drawBox(x0 - 8, y0 - 8, x1 + 8, y1 + 8, 80, '#3c4a44', '#28322e', '#323e38', 66, 66, 0);
    drawBox(x0 + 14, y0 + 14, x1 - 14, y1 - 14, 100, '#2e3a35', '#1f2824', '#26302c', 80, 80, 0);
  } else if (l.id === 'base') {
    drawBox(x0 + 4, y0 + 4, x1 - 4, y0 + 14, 14, '#7a6a48', '#4e4430', '#625639', 0, 0, 0);
    drawBox(x0 + 4, y0 + 4, x0 + 14, y1 - 4, 14, '#7a6a48', '#4e4430', '#625639', 0, 0, 0);
    boxWin(x0 + 22, y0 + 22, x0 + 92, y0 + 78, 36, '#55603f', '#353d27', '#454f33', 0);
    drawBox(x1 - 34, y0 + 10, x1 - 14, y0 + 30, 92, '#4a4a44', '#2e2e2a', '#3c3c36', 0, 0, 0);
    drawBox(x1 - 40, y0 + 4, x1 - 8, y0 + 36, 106, '#55554e', '#33332e', '#44443e', 92, 92, 0);
    drawBox(x0 + 86, y0 + 96, x1 - 14, y1 - 26, 20, '#4b5530', '#2f361c', '#3d4526', 0, 0, 0); // 전차 차체
    drawBox(x0 + 100, y0 + 104, x0 + 130, y0 + 128, 32, '#525d36', '#343c22', '#434c2c', 20, 20, 0);
    ctx.strokeStyle = '#2f361c'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(Iso.sx(x0 + 115, y0 + 116), Iso.sy(x0 + 115, y0 + 116, 28)); ctx.lineTo(Iso.sx(x0 + 115, y0 + 170), Iso.sy(x0 + 115, y0 + 170, 28)); ctx.stroke(); ctx.lineWidth = 1;
  } else if (l.id === 'tower63') {
    boxWin(x0 + 6, y0 + 6, x1 - 6, y1 - 6, 330, '#b8902a', '#7a5c16', '#9c7a20', 6363);
    boxWin(x0 + 22, y0 + 14, x1 - 34, y1 - 30, 372, '#c49a30', '#806018', '#a68226', 0, 330);
  }
  ctx.globalAlpha = 1;
  if (G.player.found.includes(l.id)) nameTag(Iso.sx(l.x, l.y), Iso.sy(l.x, l.y) + l.size * 9, '★ ' + l.name, '#ffd76a', 'bold 12px sans-serif');
}

function drawCorpse(c) {
  const t = G.time - c.t0, s = Sprites.get(c.key);
  if (!s) return;
  const fade = Math.max(0, 1 - Math.max(0, t - Sprites.dur(s, 'death') - 2.5) / 1.5);
  ctx.globalAlpha = fade;
  Sprites.draw(c.key, 'death', t, Iso.sx(c.x, c.y), Iso.sy(c.x, c.y), c.face, false);
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
  for (const h of World.hazards) dot(h.x, h.y, 'rgba(120,255,80,0.6)', 3);
  for (const l of World.landmarks) dot(l.x, l.y, p.found.includes(l.id) ? '#ffd76a' : '#888', 5);
  dot(p.x, p.y, '#fff', 4);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
