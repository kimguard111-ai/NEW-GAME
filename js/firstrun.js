// v1.45 처음 15분: 설명서 대신 "그 순간에" 키 그림 한 장
// 한 번에 하나만 · 해 보면 사라짐 · 본 것은 세이브(p.hints)에 기록 · 첫 출격 전엔 「탈출해야 내 것」 카드 한 장
const MOUSE_SVG = '<svg class="kc-mouse" viewBox="0 0 20 28" width="18" height="26"><rect x="1.5" y="1.5" width="17" height="25" rx="8.5" fill="#e8dcc0" stroke="#0c0b08" stroke-width="2"/><path d="M10 1.5 V11 M1.5 11 H18.5" stroke="#0c0b08" stroke-width="1.6"/><path d="M3 10 V8 A7 7 0 0 1 10 3 V10 Z" fill="#d9a441"/></svg>';

const HINTS = [
  { id: 'move', when: p => World.map === 'camp', keys: ['up', 'left', 'down', 'right'], text: '움직이기', touch: '화면 왼쪽을 끌어서 움직이기',
    done: (p, h) => Math.hypot(p.x - h.x0, p.y - h.y0) > 110 },
  { id: 'yun', when: p => World.map === 'camp' && FirstRun.rookie(), keys: ['interact'], text: '작전 장교 윤씨에게 말 걸어 출격', touch: '윤씨 곁에서 E 버튼으로 출격', max: 1e9,
    far: '노란 화살표를 따라 <b>작전 장교 윤씨</b>에게', guide: () => G.npcs.find(n => n.id === 'deploy'), done: p => World.map !== 'camp' },
  { id: 'grave', when: p => p.raid && G.grave, keys: [], text: '내 시체 가방이 이 맵에 있다. 붉은 화살표를 따라가자', touch: '', max: 7, ring: '✚',
    guide: () => G.grave, done: () => !G.grave },
  { id: 'aim', when: p => p.raid && G.enemies.some(e => e.hp > 0 && dist(e, p) < 420 && !enemyCloaked(e) && World.lineOfSight(p, e)), keys: ['mouse'], text: '클릭으로 쏜다. 오른쪽 클릭을 누르고 있으면 정확하게 조준', touch: '화면 오른쪽을 끌어서 조준 · 사격 (놓으면 멈춤)',
    done: p => G.time - (p.lastShot || -9) < 0.3 },
  { id: 'reload', when: p => { const w = curWeapon(); return p.raid && w && !WEAPONS[w.key].melee && !WEAPONS[w.key].infinite && w.loaded <= magSize(w) * 0.3 && !(p.reloadT > 0); }, keys: ['reload'], text: '탄창이 비기 전에 재장전', touch: '탄창 그림을 눌러 재장전',
    done: p => p.reloadT > 0 },
  { id: 'slide', when: p => p.raid && (G.enemies.some(e => e.hp > 0 && dist(e, p) < 400 && (e.windT > 0 || e.pounceT > 0 || e.aimT > 0)) || G.strikes.some(s => Math.hypot(s.x - p.x, s.y - p.y) < 300)),
    keys: ['dodge'], text: '붉은 예고가 보이면 슬라이딩 (5초에 한 번)', touch: '슬라이딩 (5초에 한 번)', done: p => G.time - (p.lastRoll || -9) < 0.5, max: 7 },
  { id: 'loot', when: p => p.raid && !G.search && Scavenge.near() && !Scavenge.near().hint, keys: ['interact'], text: '뒤지는 동안은 가만히', touch: 'E 버튼으로 뒤지기. 끝날 때까지 가만히',
    done: p => !!G.search },
  { id: 'heal', when: p => p.raid && p.hp < PlayerStats.maxHp(p) * 0.45 && (p.inventory.find(i => i.key === 'medkit') || {}).count > 0,
    keys: ['useMed'], text: '구급상자', touch: '아래 소모품 칸의 구급상자', done: (p, h) => p.hp > h.hp0 + 5, max: 8 },
  { id: 'extract', when: p => p.raid && FirstRun.rookie() && (p.raid.t > 240 || Raid.allItems().filter(it => it.raid).length >= 3 || p.raid.kills >= 12), keys: [], text: '이만하면 됐다. 초록 ◎ 탈출 지점에 5초 서 있으면 주운 게 내 것이 된다', touch: '',
    max: 7, guide: () => FirstRun.nearestExit(), done: () => G.extractT > 0 },
];

const FirstRun = {
  cur: null, t: 0,
  busy() { const p = G.player; return !!this.cur || !!G.fade || (Settings.tips && HINTS.some(h => !(p.hints || []).includes(h.id) && h.when(p))); },
  rookie() { const p = G.player; return !(p.rec && p.rec.extracts) && !p.deaths; },
  nearestExit() { const p = G.player; let b = null, bd = 1e9; for (const e of G.exits || []) { if (e.locked) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; b = e; } } return b; },
  keyCap(k) {
    if (k === 'mouse') return MOUSE_SVG;
    const lab = typeof k === 'function' ? k() : KEY_DEFAULTS[k] !== undefined ? keyLabel(keyOf(k)) : k;
    return `<kbd class="kc${lab.length > 2 ? ' wide' : ''}">${lab}</kbd>`;
  },
  html(h) {
    const p = G.player, g = h.guide && h.guide();
    if (h.far && g && Math.hypot(g.x - p.x, g.y - p.y) > 75) return `<span class="kh-text">${h.far}</span>`;
    if (IS_TOUCH) return `<span class="kh-text">${h.touch || h.text}</span>`;
    const keys = h.id === 'move' ? `<span class="kc-wasd">${this.keyCap('up')}<br>${this.keyCap('left')}${this.keyCap('down')}${this.keyCap('right')}</span>` : h.keys.map(k => this.keyCap(k)).join('');
    return `${keys || `<span class="kh-ring${h.ring ? ' red' : ''}">${h.ring || '◎'}</span>`}<span class="kh-text">${h.text}</span>`;
  },
  show(h) {
    const p = G.player, el = $('keyhint');
    this.cur = { h, t: 0, x0: p.x, y0: p.y, hp0: p.hp, last: '' };
    if (h.id === 'slide') p.tips.includes('telegraph') || p.tips.push('telegraph'); // 같은 말 두 번 안 하게
    el.classList.remove('hidden', 'out'); this.paint(); SFX.play('ui', 0.6);
    $('tip').classList.add('hidden'); // v1.47.1 한 번에 한 가지 말만
  },
  paint() { const c = this.cur, s = this.html(c.h); if (s !== c.last) { $('keyhint').innerHTML = s + '<span class="kh-x" title="닫기">✕</span>'; c.last = s; } }, // v1.48.1 눌러서 바로 닫기
  finish(ok) {
    const p = G.player, c = this.cur; if (!c) return;
    if (!p.hints.includes(c.h.id)) p.hints.push(c.h.id);
    if (ok) { const el = $('keyhint'); el.classList.add('out'); setTimeout(() => { if (!this.cur) el.classList.add('hidden'); }, 450); SFX.play('click', 0.5); }
    else $('keyhint').classList.add('hidden');
    this.cur = null; this.t = 1.2;
  },
  update(dt) {
    const p = G.player; if (!p || !Settings.tips) { if (this.cur) this.finish(false); return; }
    p.hints = p.hints || [];
    if (this.cur) {
      const c = this.cur; c.t += dt;
      $('keyhint').style.visibility = UI.anyOpen() ? 'hidden' : ''; // 창이 열리면 잠깐 숨김
      if (p.dead) return this.finish(false);
      if (c.t > 0.6 && c.h.done(p, c)) return this.finish(true);
      if (c.t > (c.h.max || 14) || (!c.h.guide && !c.h.when(p) && c.t > 4)) return this.finish(false);
      this.paint(); return;
    }
    if ((this.t -= dt) > 0 || p.dead || UI.anyOpen() || G.fade) return;
    this.t = 0.25;
    for (const h of HINTS) if (!p.hints.includes(h.id) && h.when(p)) return this.show(h);
  },
  // 노란 안내 화살표 (이야기 목표 화살표가 없을 때만)
  target() { const c = this.cur; return c && c.h.guide ? c.h.guide() : null; },
  drawArrow(psx, psy) {
    const p = G.player, tg = !p.dead && this.target(); if (!tg) return;
    const d = Math.hypot(tg.x - p.x, tg.y - p.y), tx = Iso.sx(tg.x, tg.y), ty = Iso.sy(tg.x, tg.y), bob = Math.sin(G.time * 5) * 4, col = { extract: '#6ef082', grave: '#ff8a8a' }[this.cur.h.id] || '#ffd76a';
    const onScreen = tx > 30 && tx < VW - 30 && ty > 60 && ty < VH - 40;
    if (onScreen && d > 60) { // 대상 머리 위에 아래로 향한 화살표
      ctx.save(); ctx.translate(tx, ty - 74 + bob); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(-10, -2); ctx.lineTo(-4, -2); ctx.lineTo(-4, -12); ctx.lineTo(4, -12); ctx.lineTo(4, -2); ctx.lineTo(10, -2); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); ctx.lineWidth = 1;
    }
    if (d > 200) { // 내 발밑에서 그쪽으로
      const dx = tx - psx, dy = ty - (psy - 6), l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, ax = psx + ux * 58, ay = psy - 6 + uy * 42;
      ctx.save(); ctx.translate(ax + ux * bob, ay + uy * bob); ctx.rotate(Math.atan2(uy, ux)); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore(); ctx.lineWidth = 1;
      nameTag(ax + ux * 24, ay + uy * 18 + 4, `${Math.round(d / TILE * 2)}m`, col, 'bold 11px "Malgun Gothic", sans-serif');
    }
  },

  // 첫 출격 직전 카드 한 장: 줍기 → 탈출 → 죽으면 시체 가방
  rules(go) {
    const p = G.player; p.hints = p.hints || [];
    if (p.hints.includes('rules')) return go();
    p.hints.push('rules');
    UI.dialog('작전 장교 윤씨', `"딱 세 가지만 기억해."<div class="rules3">`
      + `<div class="r3">${ICON('box')}<b>1. 줍는다</b><span>밖에서 주운 건 가방에 <i class="tag-raid">미확정</i> 표시. 아직 네 것이 아니야.</span></div>`
      + `<div class="r3-arrow">→</div><div class="r3"><span class="r3-ring">◎</span><b>2. 탈출한다</b><span>맵 끝 <b style="color:#6ef082">초록 ◎</b>에 5초 서 있으면 확정. 미니맵에도 보인다.</span></div>`
      + `<div class="r3-arrow">→</div><div class="r3">${ICON('skull')}<b>3. 죽으면</b><span>주운 것만 그 자리 <b style="color:#ff8a8a">시체 가방</b>에. 같은 맵에 다시 나가 [E]로 되찾는다. 또 죽으면 새 가방으로 바뀐다.</span></div>`
      + `</div><span class="muted">캠프에서 들고 나간 장비, 창고에 맡긴 물건은 죽어도 안 잃는다.</span>`,
      [['알겠다, 나간다', () => { UI.close('dialog'); go(); }]]);
    SFX.play('ui');
  },
};

// v1.48.1 안내·도움말은 눌러서 바로 닫힘 (시야를 가리던 것)
document.addEventListener('DOMContentLoaded', () => {
  const kh = $('keyhint'), tip = $('tip');
  const closeKh = e => { e.preventDefault(); e.stopPropagation(); if (FirstRun.cur) FirstRun.finish(false); };
  kh.addEventListener('click', closeKh); kh.addEventListener('touchstart', closeKh, { passive: false });
  const closeTip = e => { e.preventDefault(); e.stopPropagation(); tip.classList.add('hidden'); };
  tip.addEventListener('click', closeTip); tip.addEventListener('touchstart', closeTip, { passive: false });
});
