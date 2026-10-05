// 모바일 터치 조작 (v0.14)
// 왼쪽 절반: 이동 조이스틱 · 오른쪽 절반: 조준·사격 조이스틱 (당기면 그 방향으로 연사, 가까운 적에 살짝 보정)
// 오른쪽 버튼: 재장전 · 무기 교체 · 상호작용 · 화면 확대/축소, 하단 스킬 칸은 눌러서 사용

const Touch = {
  move: null,   // { x, y, mag } 화면 기준 이동 방향
  aim: null,    // { x, y, mag } 화면 기준 조준 방향
  lastAim: { x: 1, y: 0 },
  sticks: {},   // touch identifier → { side, ox, oy, el }
  R: 56,        // 조이스틱 반지름 (px)

  init() {
    if (!IS_TOUCH) return;
    document.body.classList.add('touch');
    const c = document.getElementById('game');
    const opts = { passive: false };
    c.addEventListener('touchstart', e => this.start(e), opts);
    c.addEventListener('touchmove', e => this.moveEv(e), opts);
    c.addEventListener('touchend', e => this.end(e), opts);
    c.addEventListener('touchcancel', e => this.end(e), opts);
    // 버튼
    const bar = document.createElement('div');
    bar.id = 'touch-buttons';
    const btn = (label, fn, cls = '') => {
      const b = document.createElement('button'); b.innerHTML = label; b.className = cls;
      b.addEventListener('touchstart', e => { e.preventDefault(); this.tapT = performance.now(); if (G.running && !G.player.dead) fn(); }, opts);
      b.addEventListener('click', () => { if (performance.now() - (this.tapT || 0) > 600 && G.running && !G.player.dead) fn(); }); // 스타일러스·마우스 (터치 직후 합성 클릭은 무시)
      bar.appendChild(b);
    };
    btn('－', () => setZoom(ZOOM - 0.1), 'small');
    btn('＋', () => setZoom(ZOOM + 0.1), 'small');
    btn('Q', () => swapWeapon());
    btn('R', () => startReload());
    btn('E', () => interact(), 'big');
    btn(ICON('roll'), () => dodge(), 'big roll'); // v0.16 구르기
    document.getElementById('hud').appendChild(bar);
    // 스킬 칸 터치
    document.getElementById('hotbar').addEventListener('touchstart', e => {
      const hot = e.target.closest('.hot');
      if (!hot) return;
      e.preventDefault();
      const act = hot.dataset.act || '', cyc = e.target.closest('[data-cyc]'); // v1.14 칸 종류로 구분
      if (cyc) Gadgets.cycle(cyc.dataset.cyc);
      else if (act === 'edit' || act === 'empty') Hotbar.edit(); // v1.24 벨트 칸
      else if (act === 'roll') dodge(); else Hotbar.use(+hot.dataset.slot);
    }, opts);
    // 시작 시 전체 화면 + 가로 고정 시도 (지원하는 브라우저만)
    for (const id of ['btn-new', 'btn-continue', 'btn-respawn']) document.getElementById(id).addEventListener('click', () => this.fullscreen());
  },

  fullscreen() {
    const d = document.documentElement;
    try {
      if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } catch (e) { /* 미지원 */ }
  },

  start(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const side = t.clientX < window.innerWidth / 2 ? 'L' : 'R';
      if (Object.values(this.sticks).some(s => s.side === side)) continue;
      const el = document.createElement('div');
      el.className = 'stick ' + side;
      el.innerHTML = '<div class="knob"></div>';
      el.style.left = t.clientX + 'px'; el.style.top = t.clientY + 'px';
      document.body.appendChild(el);
      this.sticks[t.identifier] = { side, ox: t.clientX, oy: t.clientY, el };
      this.apply(this.sticks[t.identifier], t.clientX, t.clientY);
    }
  },
  moveEv(e) {
    e.preventDefault();
    for (const t of e.changedTouches) { const s = this.sticks[t.identifier]; if (s) this.apply(s, t.clientX, t.clientY); }
  },
  end(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = this.sticks[t.identifier];
      if (!s) continue;
      s.el.remove(); delete this.sticks[t.identifier];
      if (s.side === 'L') this.move = null; else { this.aim = null; input.down = false; }
    }
  },
  apply(s, x, y) {
    let dx = x - s.ox, dy = y - s.oy;
    const d = Math.hypot(dx, dy), mag = d / this.R;
    if (d > this.R) { // 손가락이 멀리 가면 받침이 따라감
      s.ox = x - dx / d * this.R; s.oy = y - dy / d * this.R;
      dx = x - s.ox; dy = y - s.oy;
      s.el.style.left = s.ox + 'px'; s.el.style.top = s.oy + 'px';
    }
    s.el.firstChild.style.transform = `translate(${dx}px, ${dy}px)`;
    const v = d > 6 ? { x: dx / (d || 1), y: dy / (d || 1), mag: Math.min(1, mag) } : null;
    if (s.side === 'L') this.move = v && mag > 0.2 ? v : null;
    else { this.aim = v; if (v) this.lastAim = v; }
  },

  // 매 프레임: 조준점(input.mx/my, 가상 화면 좌표)을 플레이어 기준으로 갱신, 당기면 사격
  aimUpdate(p) {
    const sx = Iso.sx(p.x, p.y), sy = Iso.sy(p.x, p.y, 20), a = this.aim || this.lastAim;
    let tx = sx + a.x * 160, ty = sy + a.y * 160;
    if (this.aim) { // 조준 보정: 조이스틱 방향 ±40° 안의 가장 가까운 적
      const w = curWeapon(), range = w ? WEAPONS[w.key].range : 400;
      let best = null, bd = range;
      for (const e of G.enemies) {
        if (e.hp <= 0) continue;
        const ex = Iso.sx(e.x, e.y) - sx, ey = Iso.sy(e.x, e.y, 20) - sy, el = Math.hypot(ex, ey) || 1;
        const cos = (ex * a.x + ey * a.y) / el, d = dist(p, e);
        if (cos > 0.77 && d < bd && World.lineOfSight(p, e)) { bd = d; best = e; }
      }
      if (best) { tx = Iso.sx(best.x, best.y); ty = Iso.sy(best.x, best.y, 20); }
    }
    input.mx = tx; input.my = ty;
    input.down = !!this.aim && this.aim.mag > 0.35;
  },
};
Touch.init();
