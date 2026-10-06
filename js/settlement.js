// v1.43 캠프가 자람: 구한 사람들이 캠프에 남고, 사람이 늘수록 캠프 모습이 바뀌고, 출격하고 돌아오면 저마다 물건을 모아 둠
const RES_JOBS = {
  farmer: { name: '텃밭지기', what: '구급상자', line: ['상추가 좀 올라왔어요.', '흙만 있으면 뭐든 길러요.'] },
  scav:   { name: '고물상', what: '고철', line: ['쓸 만한 거 주워 왔어요.', '나사 하나도 버리면 안 돼요.'] },
  hunter: { name: '사냥꾼', what: '탄약', line: ['총알 좀 모아 뒀어.', '밖은 조용하던데… 너무 조용해.'] },
  trader: { name: '장사꾼', what: '크레딧', line: ['딴 캠프랑 거래 좀 텄어요.', '물건값이 또 올랐어요.'] },
  tinker: { name: '수리공', what: '전자 부품', line: ['라디오 고쳐 봤는데요.', '부품 좀 건졌어요.'] },
  cook:   { name: '취사병', what: '자극제', line: ['밥은 먹고 다녀요?', '오늘은 국이 좀 됐어요.'] },
};
const RES_NAMES = ['김 씨', '이 할머니', '박 군', '최 아주머니', '정 선생', '강 씨', '조 형', '윤 누나', '장 씨', '임 아저씨', '한 꼬마', '오 씨', '서 씨', '신 할아버지', '권 씨', '황 군'];
const RES_CAP = 12;
// 사람 수에 따라 생기는 것 (캠프 중심 기준 px)
const CAMP_GROWTH = [
  { n: 2, add: [['laundry', -300, -10], ['garden', 70, 215]] },
  { n: 5, add: [['tent', -305, 70, { color: 1 }], ['tent', 300, -55, { color: 2 }], ['lights', -40, -40]] },
  { n: 8, add: [['pocha', 120, 245], ['sandbags', 300, 160], ['container', -290, 200]] },
  { n: 11, add: [['flag', -40, -300], ['tent', 110, -290, {}]] },
];

const Settlement = {
  list: [],
  residents() { const p = G.player; return (p && p.residents) || []; },
  // 출격 중 구함 → 탈출하면 합류
  rescue(name) { const p = G.player; if (!p.raid) return; (p.raid.rescued = p.raid.rescued || []).push(name || pick(RES_NAMES)); log(`구한 사람이 캠프로 따라가겠다고 한다. 살아서 나가면 합류.`, '#9fd0ff'); },
  join(name) {
    const p = G.player; p.residents = p.residents || [];
    if (p.residents.length >= RES_CAP) { const cr = Math.round(p.level * 40); p.credits += cr; log(`캠프가 꽉 찼다. ${name}은(는) 다른 캠프로 보냈다. 고맙다며 ₵${cr}을 남겼다.`, '#aaa'); return; }
    const used = new Set(p.residents.map(r => r.job)), jobs = Object.keys(RES_JOBS), job = jobs.find(j => !used.has(j)) || pick(jobs);
    p.residents.push({ name, job, since: Date.now() });
    const n = p.residents.length, tier = CAMP_GROWTH.find(g => g.n === n);
    UI.toast(`${name} 합류`, `${RES_JOBS[job].name} — 캠프 사람 ${n}명${tier ? ' · 캠프가 커졌다' : ''}`);
    log(`${name}이(가) 캠프에 자리를 잡았다. ${RES_JOBS[job].name}을(를) 맡는다.`, '#9fd0ff');
  },
  // 탈출 (Raid.extract): 구한 사람 합류 + 사람들이 물건을 모아 둠
  onExtract(r) {
    for (const n of (r && r.rescued) || []) this.join(n);
    const p = G.player; p.campGifts = p.campGifts || [];
    for (const res of this.residents()) if (Math.random() < 0.55 && p.campGifts.length < 24) p.campGifts.push(res.job);
  },

  // ---------- 캠프에서 ----------
  homes() { const c = World.campCenter(), rs = this.residents(); return rs.map((r, i) => { const a = i / Math.max(1, rs.length) * TAU + 0.4, rr = 190 + (i % 3) * 35; return { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.85 }; }); },
  update(dt) {
    if (World.map !== 'camp') { this.list = []; return; }
    const rs = this.residents(), hs = this.homes(), p = G.player;
    if (this.list.length !== rs.length) this.list = rs.map((r, i) => ({ r, x: hs[i].x, y: hs[i].y, hx: hs[i].x, hy: hs[i].y, tx: hs[i].x, ty: hs[i].y, t: rand(0, 3), face: rand(0, TAU), walk: 0, sayT: 0, say: null, look: i % 4 }));
    for (const m of this.list) {
      if ((m.t -= dt) <= 0) { m.t = rand(3, 7); const a = rand(0, TAU), rr = rand(0, 60); m.tx = m.hx + Math.cos(a) * rr; m.ty = m.hy + Math.sin(a) * rr; }
      const d = Math.hypot(m.tx - m.x, m.ty - m.y);
      if (d > 4) { const a = Math.atan2(m.ty - m.y, m.tx - m.x), nx = m.x + Math.cos(a) * 26 * dt, ny = m.y + Math.sin(a) * 26 * dt; if (!World.solidAt(nx, ny)) { m.x = nx; m.y = ny; } m.face = a; m.walk += dt; m.moving = true; } else m.moving = false;
      m.sayT -= dt; if (m.say && (m.say.t -= dt) <= 0) m.say = null;
      if (Math.hypot(p.x - m.x, p.y - m.y) < 70 && m.sayT <= 0) { m.sayT = 25; m.say = { text: pick(RES_JOBS[m.r.job].line), t: 2.6 }; }
    }
  },
  crate() { const c = World.campCenter(); return { x: c.x - 70, y: c.y + 40 }; },
  near(p) { if (World.map !== 'camp' || !(p.campGifts && p.campGifts.length)) return null; const k = this.crate(); return Math.hypot(p.x - k.x, p.y - k.y) < 50 ? k : null; },
  hint() { return `[E] 캠프 사람들이 모아 둔 것 챙기기 (${G.player.campGifts.length})`; },
  take() {
    const p = G.player, got = {};
    for (const job of p.campGifts) {
      if (job === 'farmer') addItem(makeConsumable('medkit', 1)) && (got.medkit = (got.medkit || 0) + 1);
      else if (job === 'scav') { Workshop.gain(2, 0, ''); got.scrap = (got.scrap || 0) + 2; }
      else if (job === 'hunter') { const [t, n] = giveAmmoUnits(p, 60); got[AMMO[t].name] = (got[AMMO[t].name] || 0) + n; }
      else if (job === 'trader') { const cr = Math.round(p.level * 15); p.credits += cr; got.cr = (got.cr || 0) + cr; }
      else if (job === 'tinker') { Workshop.gain(0, 1, ''); got.chip = (got.chip || 0) + 1; }
      else if (job === 'cook') addItem(makeConsumable('stim', 1)) && (got.stim = (got.stim || 0) + 1);
    }
    p.campGifts = [];
    const names = { medkit: '구급상자', scrap: '고철', cr: '크레딧', chip: '전자 부품', stim: '자극제' };
    const txt = Object.entries(got).map(([k, v]) => `${names[k] || k} ${k === 'cr' ? '₵' + fmt(v) : v}`).join(', ');
    UI.toast('캠프 사람들 몫', txt || '가방이 꽉 차서 못 챙겼다'); SFX.play('item', 2); UI.refreshInventory(); saveGame();
  },
  open() { // 한씨 대화: 캠프 사람들
    const rs = this.residents(), p = G.player, next = CAMP_GROWTH.find(g => g.n > rs.length);
    let h = `"사람이 늘었어. 다 자네가 데려온 사람들이지."<br><span class="muted">밖에서 구한 사람(부상당한 생존자 · 호위)을 데리고 살아 나오면 캠프에 남는다. 출격하고 돌아올 때마다 저마다 뭔가를 모아 둔다 (모닥불 옆 상자).</span><br>`;
    h += rs.length ? rs.map(r => `<div class="sum-row"><span>${r.name}</span><b>${RES_JOBS[r.job].name} · ${RES_JOBS[r.job].what}</b></div>`).join('') : '<div class="muted">아직 아무도 없다.</div>';
    h += `<div class="muted" style="margin-top:6px">${rs.length} / ${RES_CAP}명${next ? ` · ${next.n}명이 되면 캠프가 커진다` : ''}</div>`;
    UI.dialog('생존자 대장 한씨 — 캠프 사람들', h, [['닫기', () => UI.close('dialog')]]);
  },

  // ---------- 그리기 ----------
  collect(objs) {
    if (World.map !== 'camp') return;
    const c = World.campCenter(), n = this.residents().length;
    for (const g of CAMP_GROWTH) if (n >= g.n) for (const [type, dx, dy, extra] of g.add) { const x = c.x + dx, y = c.y + dy; if (type !== 'lights' && World.solidAt(x, y)) continue; objs.push({ d: (x + y) / TILE, draw: () => this.drawDecor(type, x, y, extra || {}), ent: null }); }
    for (const m of this.list) objs.push({ d: (m.x + m.y) / TILE, draw: () => this.drawRes(m), ent: m });
    const p = G.player; if (p.campGifts && p.campGifts.length) { const k = this.crate(); objs.push({ d: (k.x + k.y) / TILE, draw: () => this.drawCrate(k), ent: k }); }
  },
  drawDecor(type, x, y, ex) {
    const sx = Iso.sx(x, y), sy = Iso.sy(x, y), c = World.campCenter();
    if (['tent', 'pocha', 'sandbags', 'container'].includes(type)) { if (!drawPropArt(type, sx, sy)) drawBox(x - 16, y - 12, x + 16, y + 12, 20, '#5a5a42', '#3a3a2a', '#4a4a36', 0, 0, 0); return; }
    if (['laundry', 'garden', 'flag'].includes(type) && drawPropArt('camp_' + type, sx, sy)) return; // v1.49.3 그림이 있으면 그림
    if (type === 'lights' && propArt('camp_lights')) { // 모닥불 뒤 전구 줄 기둥 2개 · 전구 자리에 불빛
      const a = sx, b = sy, r = ART.props.camp_lights.rect, f = ART.propFit.camp_lights, h = r[3] * f.w / r[2];
      drawPropArt('camp_lights', a, b);
      for (const [nx, ny] of [[0.22, 0.4], [0.31, 0.42], [0.42, 0.39], [0.58, 0.35], [0.72, 0.27], [0.79, 0.21]]) { const px = a - f.w / 2 + nx * f.w, py = b + f.y - h + ny * h + 2; ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill(); if (Settings.light && Light.list.length < LIGHT_CAP) addLight(px, py, 22, 0.4, 'rgba(255,210,140,A)'); }
      return;
    }
    if (type === 'laundry') { // 빨랫줄
      const x2 = x + 70, y2 = y - 50; ctx.strokeStyle = '#3a3428'; ctx.lineWidth = 2;
      for (const [px, py] of [[x, y], [x2, y2]]) { ctx.beginPath(); ctx.moveTo(Iso.sx(px, py), Iso.sy(px, py)); ctx.lineTo(Iso.sx(px, py), Iso.sy(px, py, 34)); ctx.stroke(); }
      ctx.lineWidth = 1; ctx.strokeStyle = '#8a8070'; ctx.beginPath(); ctx.moveTo(Iso.sx(x, y), Iso.sy(x, y, 32)); ctx.quadraticCurveTo(Iso.sx((x + x2) / 2, (y + y2) / 2), Iso.sy((x + x2) / 2, (y + y2) / 2, 26), Iso.sx(x2, y2), Iso.sy(x2, y2, 32)); ctx.stroke();
      ['#7a5a4a', '#5a6a7a', '#8a8a6a', '#6a4a5a'].forEach((col, i) => { const k = (i + 1) / 5, px = lerp(x, x2, k), py = lerp(y, y2, k), w = Math.sin(G.time * 2 + i) * 1.5; ctx.fillStyle = col; ctx.fillRect(Iso.sx(px, py) - 4 + w, Iso.sy(px, py, 29) - 1, 8, 10); });
      return;
    }
    if (type === 'garden') { // 텃밭
      ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.moveTo(Iso.sx(x - 40, y - 24), Iso.sy(x - 40, y - 24)); ctx.lineTo(Iso.sx(x + 40, y - 24), Iso.sy(x + 40, y - 24)); ctx.lineTo(Iso.sx(x + 40, y + 24), Iso.sy(x + 40, y + 24)); ctx.lineTo(Iso.sx(x - 40, y + 24), Iso.sy(x - 40, y + 24)); ctx.fill();
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { const px = x - 30 + i * 20, py = y - 16 + j * 16, s1 = Iso.sx(px, py), s2 = Iso.sy(px, py); ctx.fillStyle = (i + j) % 2 ? '#4a7a3a' : '#5a8a42'; ctx.beginPath(); ctx.ellipse(s1, s2 - 3, 4, 3, 0, 0, TAU); ctx.fill(); }
      return;
    }
    if (type === 'lights') { // 모닥불 위 전구 줄
      const pts = [[-120, -40], [-40, -90], [60, -80], [140, -20]].map(([dx, dy]) => [c.x + dx, c.y + dy]);
      ctx.strokeStyle = 'rgba(30,26,20,0.8)'; ctx.beginPath(); pts.forEach(([px, py], i) => { const a = Iso.sx(px, py), b = Iso.sy(px, py, 60); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.stroke();
      for (let i = 0; i < pts.length - 1; i++) for (let k = 0.2; k < 1; k += 0.3) { const px = lerp(pts[i][0], pts[i + 1][0], k), py = lerp(pts[i][1], pts[i + 1][1], k), a = Iso.sx(px, py), b = Iso.sy(px, py, 58 - Math.sin(k * Math.PI) * 6); ctx.fillStyle = (i + k * 3) % 2 < 1 ? '#ffd27a' : '#ff9a5a'; ctx.beginPath(); ctx.arc(a, b, 1.8, 0, TAU); ctx.fill(); if (Settings.light && Light.list.length < LIGHT_CAP) addLight(a, b, 26, 0.45, 'rgba(255,210,140,A)'); }
      return;
    }
    if (type === 'flag') { // 깃대
      ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 90); ctx.stroke(); ctx.lineWidth = 1;
      const w = Math.sin(G.time * 3) * 3; ctx.fillStyle = '#b8352a'; ctx.beginPath(); ctx.moveTo(sx, sy - 88); ctx.quadraticCurveTo(sx + 14, sy - 84 + w, sx + 30, sy - 86 + w); ctx.lineTo(sx + 30, sy - 70 + w); ctx.quadraticCurveTo(sx + 14, sy - 68 + w, sx, sy - 72); ctx.fill();
      ctx.fillStyle = '#e6dfcc'; ctx.fillRect(sx + 10, sy - 82 + w * 0.6, 8, 4);
    }
  },
  drawRes(m) {
    const sx = Iso.sx(m.x, m.y), sy = Iso.sy(m.x, m.y); if (sx < -60 || sx > VW + 60 || sy < -80 || sy > VH + 60) return;
    drawShadow(sx, sy, 10);
    const key = ['resident_a', 'resident_b', 'resident_c', 'resident_a'][m.look], tint = ['none', 'none', 'none', 'sepia(0.45) brightness(0.95)'][m.look]; // v1.49.3 주민 그림 3종 (넷째는 아저씨 그림 색만 바꿈)
    if (Sprites.get(key)) { ctx.save(); if ('filter' in ctx) ctx.filter = tint; Sprites.draw(key, m.moving ? 'walk' : 'idle', m.moving ? G.time : G.time + m.hx, sx, sy, m.face, false); ctx.restore(); }
    else drawHuman(sx, sy, { s: 0.95, body: '#6a5a4a', skin: '#c49a78', legs: '#3a3428', aim: m.face, walk: m.moving ? m.walk * 6 : 0 });
    if (Math.hypot(G.player.x - m.x, G.player.y - m.y) < 140) nameTag(sx, sy - 52, `${m.r.name} · ${RES_JOBS[m.r.job].name}`, '#cfc6b0', 'bold 11px "Malgun Gothic", sans-serif');
    if (m.say) { ctx.globalAlpha = Math.min(1, m.say.t * 2); nameTag(sx, sy - 66, m.say.text, '#e6dfcc', 'bold 12px "Malgun Gothic", sans-serif'); ctx.globalAlpha = 1; }
  },
  drawCrate(k) {
    const sx = Iso.sx(k.x, k.y), sy = Iso.sy(k.x, k.y);
    if (!drawPropArt('crates', sx, sy)) drawBox(k.x - 12, k.y - 10, k.x + 12, k.y + 10, 16, '#7a6a4a', '#4a3e2a', '#5a4e34', 0, 0, 0);
    const b = Math.sin(G.time * 4) * 2; ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.moveTo(sx, sy - 40 + b); ctx.lineTo(sx - 5, sy - 48 + b); ctx.lineTo(sx + 5, sy - 48 + b); ctx.fill();
    nameTag(sx, sy - 54, `모아 둔 것 ${G.player.campGifts.length}`, '#ffd27a', 'bold 11px "Malgun Gothic", sans-serif');
  },
};
