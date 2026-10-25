// v1.91 게임패드 (PC · 스팀덱 · 폰 블루투스 패드) — 브라우저 표준 배치 (엑스박스 글자 · 플스 패드는 ✕○□△)
// 출격: 왼쪽 스틱 이동 · 오른쪽 스틱 조준 (조준 보정) · RT 사격 · LT 정밀 조준 · A 회피 · B 상호작용 · X 재장전 · Y 무기 교체
//       LB 구급상자 · RB 투척물 · 십자키 스킬 1~4 · L3 유탄 · R3 동료 명령 · Start 일시정지 · Back 가방
// 창 · 타이틀 · 일시정지: 화면에 패드 커서 — 왼쪽 스틱(십자키)으로 옮기고 A 누르기 · 오른쪽 스틱 스크롤 · B 닫기
// 마우스 · 키보드를 만지면 바로 그쪽으로 돌아감 (Pad.on = 패드를 마지막으로 쓴 중)
const PAD_DEAD = 0.22;
const PAD_LABEL = {
  xbox: { dodge: 'A', interact: 'B', reload: 'X', swap: 'Y', useMed: 'LB', inventory: 'Back', settings: 'Start', compCmd: 'R3', gl: 'L3', belt: 'Back', fire: 'RT', aim: 'LT', throw: 'RB' },
  ps: { dodge: '✕', interact: '○', reload: '□', swap: '△', useMed: 'L1', inventory: 'Share', settings: 'Options', compCmd: 'R3', gl: 'L3', belt: 'Share', fire: 'R2', aim: 'L2', throw: 'R1' },
};
const Pad = {
  on: false, kind: 'xbox', id: '', prev: [], move: null, aim: null, lastAim: { x: 1, y: 0 }, lock: null, rt: false, lt: false,
  cur: { x: 0, y: 0, el: null, hover: [] },
  label(act) { return (PAD_LABEL[this.kind] || PAD_LABEL.xbox)[act]; },
  get() { try { for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected && g.mapping === 'standard') return g; for (const g of navigator.getGamepads ? navigator.getGamepads() : []) if (g && g.connected) return g; } catch (e) { /* 막힘 */ } return null; },
  stick(g, i) { const x = g.axes[i] || 0, y = g.axes[i + 1] || 0, m = Math.hypot(x, y); if (m < PAD_DEAD) return null; const k = Math.min(1, (m - PAD_DEAD) / (1 - PAD_DEAD)); return { x: x / m, y: y / m, mag: k }; },
  btn(g, i) { const b = g.buttons[i]; return !!b && (b.pressed || b.value > 0.4); },
  uiMode() { return !G.running || G.paused || !G.player || G.player.dead || UI.anyOpen() || !!document.querySelector('.overlay:not(.hidden)'); },
  setOn(v) {
    if (this.on === v) return; this.on = v;
    if (!v) { this.move = this.aim = this.lock = null; if (this.rt) input.down = false; if (this.lt) input.aim = false; this.rt = this.lt = false; }
    this.showCursor();
  },
  poll(dt) {
    const g = this.get();
    if (!g) { if (this.on) this.setOn(false); this.prev = []; return; }
    if (g.id !== this.id) { this.id = g.id; this.kind = !/xbox|045e|xinput/i.test(g.id) && /054c|playstation|dualsense|dualshock|wireless controller/i.test(g.id) ? 'ps' : 'xbox'; }
    const L = this.stick(g, 0), R = this.stick(g, 2), btn = g.buttons.map((b, i) => this.btn(g, i));
    const was = this.prev, hit = i => btn[i] && !was[i]; // 이번 프레임에 새로 누른 버튼
    this.prev = btn;
    if (!this.on) { if (L || R || btn.some(Boolean)) { this.setOn(true); if (!this.toldOnce) { this.toldOnce = true; if (G.running) log(`게임패드 연결: ${this.kind === 'ps' ? '플레이스테이션' : '엑스박스'} 배치 · 창에서는 커서를 ${this.label('dodge')}로 누름 · ${this.label('interact')} 닫기`, '#9fd0ff'); } } else return; }
    if (this.uiMode()) return this.uiPoll(dt, g, L, R, btn, hit);
    this.showCursor();
    const p = G.player;
    this.move = L;
    this.aim = R; if (R) this.lastAim = { x: R.x, y: R.y };
    this.rt = btn[7]; this.lt = btn[6];
    input.down = this.rt; input.aim = this.lt;
    if (hit(9)) return Pause.toggle(); // Start
    if (hit(8)) return UI.toggle('inventory'); // Back
    if (p.dead) return;
    if (hit(0)) dodge();
    if (hit(1)) interact();
    if (hit(2)) startReload();
    if (hit(3)) swapWeapon();
    if (hit(4)) quickMedkit();
    if (hit(5)) Gadgets.use('throw');
    if (hit(10)) fireGL();
    if (hit(11)) Companion.command();
    [12, 15, 13, 14].forEach((b, i) => { if (hit(b)) Hotbar.useSkill(i); }); // 십자키 ↑ → ↓ ← = 스킬 1~4
  },
  // 출격 중 조준점 (Touch.aimUpdate 와 같은 방식: 스틱 방향 ±30° 안의 가장 가까운 적에 붙음)
  aimUpdate(p) {
    if (!this.on || this.uiMode()) return;
    const sx = Iso.sx(p.x, p.y), sy = Iso.sy(p.x, p.y, 20), a = this.aim || this.lastAim;
    let tx = sx + a.x * 200, ty = sy + a.y * 200, best = null;
    if (this.aim) {
      const w = curWeapon(), range = w ? WEAPONS[w.key].range : 400; let bd = range;
      for (const e of G.enemies) {
        if (e.hp <= 0) continue;
        const ex = Iso.sx(e.x, e.y) - sx, ey = Iso.sy(e.x, e.y, 20) - sy, el = Math.hypot(ex, ey) || 1, d = dist(p, e);
        if ((ex * a.x + ey * a.y) / el > 0.87 && d < bd && World.lineOfSight(p, e)) { bd = d; best = e; }
      }
      if (best) { tx = Iso.sx(best.x, best.y); ty = Iso.sy(best.x, best.y, 20); }
    }
    this.lock = best; input.mx = tx; input.my = ty; input.down = this.rt; input.aim = this.lt; // 폰 + 패드: 터치 조준이 끈 것을 다시
  },
  // 창 · 타이틀: 커서
  uiPoll(dt, g, L, R, btn, hit) {
    this.move = this.aim = null; if (this.rt) { input.down = false; this.rt = false; } if (this.lt) { input.aim = false; this.lt = false; }
    const c = this.cur; if (!c.x && !c.y) { c.x = innerWidth / 2; c.y = innerHeight / 2; }
    let vx = L ? L.x * L.mag : 0, vy = L ? L.y * L.mag : 0;
    if (btn[12]) vy -= 1; if (btn[13]) vy += 1; if (btn[14]) vx -= 1; if (btn[15]) vx += 1;
    const sp = 900 * (btn[6] || btn[4] ? 0.4 : 1); // LT · LB 누르고 있으면 천천히
    c.x = clamp(c.x + vx * sp * dt, 2, innerWidth - 2); c.y = clamp(c.y + vy * sp * dt, 2, innerHeight - 2);
    this.showCursor();
    const el = document.elementFromPoint(c.x, c.y);
    this.hoverTo(el);
    if (R && Math.abs(R.y) > 0.3 && el) { let s = el; while (s && s !== document.body && !(s.scrollHeight > s.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(s).overflowY))) s = s.parentElement; if (s && s !== document.body) s.scrollTop += R.y * R.mag * 900 * dt; }
    if (hit(0) && el) this.click(el, c.x, c.y);
    if (hit(1)) { if (UI.anyOpen()) UI.closeAll(); else if (G.paused) Pause.toggle(); }
    if (hit(9)) { if (UI.anyOpen()) UI.closeAll(); else if (G.running && G.player && !G.player.dead) Pause.toggle(); }
    if (hit(8) && G.running && G.player && !G.player.dead && !G.paused) UI.toggle('inventory');
  },
  click(el, x, y) {
    const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 9, pointerType: 'mouse', view: window };
    if (el.tagName === 'INPUT' && el.type === 'range') { const r = el.getBoundingClientRect(), k = clamp((x - r.left) / r.width, 0, 1), mn = +el.min || 0, mx = +el.max || 1; el.value = mn + (mx - mn) * k; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return; }
    el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new MouseEvent('mousedown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o)); window.dispatchEvent(new PointerEvent('pointerup', o)); el.dispatchEvent(new MouseEvent('mouseup', o));
    if (typeof el.click === 'function') el.click(); else el.dispatchEvent(new MouseEvent('click', o));
    SFX.play('ui');
  },
  // 툴팁 (mouseenter 로 뜨는 것들) — 커서가 올라간 요소에
  hoverTo(el) {
    const chain = []; for (let e = el; e && e !== document.documentElement; e = e.parentElement) chain.push(e);
    const old = this.cur.hover;
    for (const e of old) if (!chain.includes(e)) e.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    for (const e of chain) if (!old.includes(e)) e.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    this.cur.hover = chain;
  },
  showCursor() {
    const show = this.on && this.uiMode();
    let el = this.cur.el;
    if (!el) { if (!show) return; el = this.cur.el = document.createElement('div'); el.id = 'pad-cursor'; document.body.appendChild(el); }
    el.style.display = show ? 'block' : 'none';
    if (show) el.style.transform = `translate(${this.cur.x}px, ${this.cur.y}px)`;
    else if (this.cur.hover.length) this.hoverTo(null);
  },
  rumble(ms, strong) {
    const g = this.on && this.get(), a = g && g.vibrationActuator;
    if (!a || typeof a.playEffect !== 'function') return false;
    try { a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: Math.min(1, strong + 0.3) }); } catch (e) { return false; }
    return true;
  },
};
// 마우스 · 키보드를 쓰면 패드 모드 끝
window.addEventListener('mousemove', e => { if (Pad.on && (Math.abs(e.movementX) + Math.abs(e.movementY) > 3)) Pad.setOn(false); });
window.addEventListener('mousedown', e => { if (Pad.on && e.isTrusted) Pad.setOn(false); });
window.addEventListener('keydown', () => { if (Pad.on) Pad.setOn(false); });
window.addEventListener('touchstart', () => { if (Pad.on) Pad.setOn(false); }, { passive: true });
window.addEventListener('gamepaddisconnected', () => { if (!Pad.get()) { Pad.setOn(false); if (G.running) log('게임패드 연결이 끊겼다.', '#aaa'); } });
