// 출격 돌발 사건 (v1.10): 매 출격마다 맵에 1~2개 무작위 사건 + 특수 탈출 1곳 + 오래 머물수록 올라가는 경보
// 사건: 보급 투하 · 부상당한 생존자 · 잠긴 금고(열쇠 소지자) · 변이 둥지 · 떠돌이 상인
// 특수 탈출: 유료 탈출(크레딧 지불) · 전원 탈출(발전기를 켜야 열림) — 기본 탈출보다 가깝게 놓임
// 상호작용은 뒤지기와 같은 [E] 누르고 버티기(움직이면 취소)를 씀 (Scavenge.near / start / update)

const EVENT_DEFS = {
  airdrop:  { name: '보급 투하',     lab: false },
  survivor: { name: '부상당한 생존자', lab: true, off: true }, // v1.59 삭제 (캠프 합류는 탈출할 때 찾아오는 피난민으로)
  safe:     { name: '잠긴 금고',     lab: true },
  nest:     { name: '변이 둥지',     lab: true },
  trader:   { name: '떠돌이 상인',   lab: false, off: true }, // v1.51 삭제 (예전 세이브의 무전실 계획에 남은 것도 무시)
};
// 경보: 출격 시간(초) → 단계. 단계마다 적 밀도·출현 속도·엘리트 확률 상승, 3단계는 추적대
const ALERT_AT = [240, 420, 600];

const RaidEvents = {
  list: [], alert: 0, huntT: 0,

  // 출격 직후 (Raid.deploy) — 사건·특수 탈출 배치
  generate() {
    this.list = []; this.alert = 0; this.huntT = 0; this.cleared = false;
    if (World.map === 'camp') return;
    const lab = !!(World.def && World.def.lab);
    for (const k of Camp.takePlan(World.map)) this['make_' + k](); // v1.13 미리 정해 둔 사건 (무전실에서 미리 보기)
    if (Math.random() < 0.5) this.makeExit(); // v1.46 특수 탈출은 출격 절반만
    if (!FirstRun.rookie() && Math.random() < 0.35) MapEvents.make(); Companion.setupRaid(); // 맵 고유 사건 · v1.47.1 출격 계약 게시판 삭제 · v1.45 첫 출격은 단순하게 (맵 고유 사건 없음)
    const names = this.list.filter(e => !e.exitPart && !e.ext).map(e => EVENT_DEFS[e.kind].name);
    if (names.length) log(`${ICON('radio')} 무전: "${names.join(', ')} 신호가 잡힌다." (미니맵 노란 ◆)`, '#ffd76a');
  },

  lvl() { const z = ZONES[World.zoneIndex()]; return randInt(z.lvl[0], z.lvl[1]); },
  maxLvl() { return ZONES[World.zoneIndex()].lvl[1]; },
  gearBias() { return ZONES[World.zoneIndex()].gear; },

  // 맵에서 빈 바닥 한 곳 (플레이어·탈출 지점과 떨어진 곳)
  spot(minD = 700, maxD = 1e9) {
    const p = G.player, W = World.W, H = World.H, ok = new Set([T.ROAD, T.WALK, T.RUBBLE, T.GRASS, T.LFLOOR]);
    for (let tries = 0; tries < 3000; tries++) {
      const tx = 3 + Math.floor(Math.random() * (W - 6)), ty = 3 + Math.floor(Math.random() * (H - 6));
      const x = tx * TILE + 16, y = ty * TILE + 16, d = Math.hypot(x - p.x, y - p.y);
      if (!ok.has(World.tileAt(tx, ty)) || d < minD || d > maxD || World.buildingAt(x, y) || World.circleBlocked(x, y, 24)) continue;
      if ((G.exits || []).some(e => Math.hypot(e.x - x, e.y - y) < 320)) continue;
      let hidden = false; // 화면 앞쪽(남·동)에 높은 건물이 있으면 가려지므로 피함
      for (let dy = 0; dy <= 3 && !hidden; dy++) for (let dx = 0; dx <= 3; dx++) if (dx + dy && SOLID.has(World.tileAt(tx + dx, ty + dy)) && World.tileAt(tx + dx, ty + dy) !== T.CAR) { hidden = true; break; }
      if (hidden) continue;
      if (this.list.some(e => Math.hypot(e.x - x, e.y - y) < 400)) continue;
      return { x, y };
    }
    return null;
  },

  // 사건 주변에 적 무리
  squad(x, y, n, opts = {}) {
    const z = ZONES[World.zoneIndex()];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 8; k++) {
        const a = rand(0, TAU), r = rand(opts.r0 || 60, opts.r1 || 160), ex = x + Math.cos(a) * r, ey = y + Math.sin(a) * r;
        if (World.circleBlocked(ex, ey, 22) || World.buildingAt(ex, ey)) continue;
        const e = makeEnemy(weighted(z.spawns), ex, ey, this.lvl());
        e.evGuard = true; if (opts.chase) { e.state = 'chase'; e.heard = true; }
        G.enemies.push(e); break;
      }
    }
  },

  // ---------- 사건 만들기 ----------
  make_airdrop() { // 출격 35~80초 뒤 무전 → 12초 뒤 낙하 → 지키는 적 · [E] 3초
    const s = this.spot(600); if (!s) return;
    this.list.push({ kind: 'airdrop', ...s, state: 'wait', t: rand(35, 80), fall: 0, open: false, hint: '[E] 보급 상자 열기', dur: 3 });
  },
  make_survivor() { // [E] 4초 치료 — 치료를 시작하면 매복
    const s = this.spot(700); if (!s) return;
    this.list.push({ kind: 'survivor', ...s, state: 'idle', open: false, hint: '[E] 생존자 치료하기 (4초)', dur: 4 });
  },
  make_safe() { // 맵 어딘가의 열쇠 소지자(엘리트)를 잡아야 열림
    const s = this.spot(500), k = s && this.spot(900); if (!s || !k) return;
    const z = ZONES[World.zoneIndex()], type = weighted(z.spawns), e = makeEnemy(type, k.x, k.y, this.maxLvl());
    Monsters.makeElite(e, Monsters.rollAffix(type)); e.keyCarrier = true; e.evGuard = true;
    G.enemies.push(e);
    this.list.push({ kind: 'safe', ...s, state: 'locked', open: false, carrier: e, hint: '[E] 금고 열기 (2.5초)', dur: 2.5 });
  },
  make_nest() { // 둥지(움직이지 않는 적) — 살아 있으면 근처에 적을 계속 낳음
    const s = this.spot(800); if (!s) return;
    const lvl = this.maxLvl(), e = makeEnemy('brute', s.x, s.y, lvl);
    e.type = 'nest'; e.nest = true; e.evGuard = true; e.weight = 0; e.r = 30;
    e.def = { ...ENEMIES.brute, name: World.def && World.def.lab ? '배양 둥지' : '변이 둥지', speed: 0, aggro: 0, weight: 0, exp: ENEMIES.brute.exp * 2.5 };
    e.hp = e.maxHp = Math.round(e.maxHp * 3.2); e.spawnT = 3; e.kids = [];
    G.enemies.push(e);
    this.list.push({ kind: 'nest', ...s, state: 'alive', nest: e, open: true });
  },
  make_trader() { // 상인 NPC (총을 쏘지 않음 · 적이 노리지 않음)
    const s = this.spot(500); if (!s) return;
    const lvl = this.maxLvl(), gear = randomGear(lvl, 1.0, 2, this.gearBias());
    G.npcs.push({ id: 'trader', name: '떠돌이 상인 오씨', x: s.x, y: s.y, color: '#b08a4a', stock: { gear, sold: false, price: Math.round(lvl * (90 + gear.rarity * 40)) } });
    this.list.push({ kind: 'trader', ...s, state: 'idle', open: true });
  },

  // 특수 탈출: 맵 안쪽 (시작점에서 700~1600px). 유료 or 전원
  makeExit() {
    const s = this.spot(700, 1600); if (!s) return;
    const lab = World.def && World.def.lab, r = Math.random();
    if (!lab && r < 0.3) { Heli.make(s); return; } // v1.34 시간 제한 탈출 (헬기)
    if (!lab && r < 0.65) {
      const cost = Math.round(this.maxLvl() * 30);
      G.exits.push({ ...s, special: 'pay', locked: true, cost, time: 2, label: `유료 탈출 (₵${fmt(cost)})` });
    } else {
      const g = this.spot(500); if (!g) return;
      const ex = { ...s, special: 'power', locked: true, time: 3, label: '전원 탈출 (발전기 필요)' };
      G.exits.push(ex);
      this.list.push({ kind: 'generator', ...g, state: 'off', exit: ex, exitPart: true, hint: '[E] 발전기 켜기 (4초 · 시끄러움)', dur: 4 });
    }
  },

  // ---------- [E] 대상 ----------
  near(p) {
    let best = null, bd = 56;
    for (const e of this.list) {
      if (!e.hint || e.done) continue;
      if (e.kind === 'airdrop' && e.state !== 'landed') continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y); if (d < bd) { bd = d; best = e; }
    }
    for (const ex of G.exits || []) if (ex.special === 'pay' && ex.locked && Math.hypot(p.x - ex.x, p.y - ex.y) < EXTRACT_R) return { payExit: ex, hint: `[E] 탈출 차량 호출 (₵${fmt(ex.cost)})`, dur: 0.6 };
    return best;
  },
  // 버티기 시작 순간 (매복 등)
  onStart(e) {
    if (e.ext) return e.onStart ? e.onStart(e) !== false : true; // v1.34 계약 · 고유 사건
    if (e.kind === 'survivor' && !e.ambushed) { e.ambushed = true; log('생존자: "놈들이 소리를 들었어요...!" 매복이다!', '#ff8a5a'); this.squad(e.x, e.y, 4, { r0: 300, r1: 420, chase: true }); }
    if (e.kind === 'generator' && !e.loud) { e.loud = true; for (const o of G.enemies) if (!o.def.boss && dist(o, e) < 750) { o.state = 'chase'; o.heard = true; } log('발전기가 덜컹거리며 돈다. 근처 적들이 몰려온다!', '#ff8a5a'); }
    if (e.kind === 'safe' && e.state === 'locked') { log('잠겨 있다. 열쇠 소지자(미니맵 노란 점)를 찾아야 한다.', '#aaa'); SFX.play('empty'); return false; }
    return true;
  },
  // 버티기 끝
  finish(e) {
    const p = G.player, lvl = this.maxLvl(), bias = this.gearBias();
    const drop = (kind, extra) => G.drops.push({ x: e.x + rand(-20, 20), y: e.y + rand(-20, 20), kind, t: 0, ...extra });
    if (e.payExit) {
      const ex = e.payExit;
      if (p.credits < ex.cost) { log(`크레딧이 부족하다 (₵${fmt(ex.cost)} 필요).`, '#f88'); SFX.play('empty'); return; }
      p.credits -= ex.cost; ex.locked = false; SFX.play('coin');
      log('무전: "차 보낸다. 2초만 버텨!"', '#7fe08a'); return;
    }
    if (e.ext) { e.onFinish && e.onFinish(e); return; } // v1.34
    e.done = true;
    if (e.kind === 'airdrop') {
      drop('item', { item: randomGear(lvl, 1.2, 2, bias) });
      if (Math.random() < 0.5 * ECON.gear) drop('item', { item: randomGear(lvl, 0.8, 0, bias) });
      drop('item', { item: makeConsumable('medkit', 2) }); drop('ammo', { amount: randInt(60, 100) }); drop('credits', { amount: lvl * 60 });
      Workshop.gain(randInt(2, 4), 1, '보급 상자');
      UI.toast('보급 상자 확보', '희귀 이상 장비. 탈출해야 내 것');
    } else if (e.kind === 'survivor') {
      drop('credits', { amount: lvl * 45 }); drop('item', { item: makeConsumable('medkit', 2) });
      if (Math.random() < 0.6 * ECON.gear) drop('item', { item: randomGear(lvl, 1.0, 1, bias) });
      gainExp(Math.round(PlayerStats.expNext(p.level) * 0.06));
      // 보답: 근처 뒤질 곳 3곳을 미니맵에 표시
      const near = Scavenge.list.filter(c => !c.looted).sort((a, b) => dist(a, p) - dist(b, p)).slice(0, 3);
      for (const c of near) c.marked = true;
      UI.toast('생존자 구조', `보답으로 근처 보급품 위치 ${near.length}곳을 알려 줬다 (미니맵 노란 점)`);
      Settlement.rescue(); // v1.43 살아 나가면 캠프에 합류
      log('생존자: "고마워요. 이 근처에 숨겨 둔 물건이 있어요."', '#8cf');
    } else if (e.kind === 'safe') {
      drop('item', { item: randomGear(lvl, 1.5, 2, bias) }); drop('credits', { amount: lvl * 90 });
      if (Math.random() < 0.35 * ECON.gear) drop('item', { item: randomGear(lvl, 1.0, 1, bias) });
      Workshop.gain(1, 2, '금고');
      UI.toast('금고를 열었다', '희귀 이상 장비 · 크레딧 · 전자 부품');
    } else if (e.kind === 'generator') {
      e.state = 'on'; e.exit.locked = false;
      UI.toast('발전기 가동', '전원 탈출 지점이 열렸다 (미니맵 초록 ◎)');
    }
    SFX.play('item', 3); burst(e.x, e.y, '#ffd76a', 14, 140, 0.5);
    Bounty.on('crate'); Weekly.on('events'); Journal.onEvent(); // v1.15
  },

  // ---------- 매 프레임 ----------
  update(dt) {
    const p = G.player;
    if (!p.raid || World.map === 'camp') return;
    // 경보 단계
    const a = ALERT_AT.filter(t => p.raid.t >= t + Camp.alertDelay()).length; // v1.13 무전실 2단계: 1분 늦게
    if (a > this.alert) {
      this.alert = a;
      const msg = ['', '소란을 듣고 주변 무리가 몰려오기 시작했다. 2분마다 증원.', '증원이 잦아지고 엘리트가 섞인다. 75초마다.', '추적대가 투입됐다! 50초마다 온다. 지금 나가는 게 좋다.'][a];
      UI.sms(`[서울특별시] ${MAPS[World.map] ? MAPS[World.map].name : ''} 일대 경보 ${a}단계 발령. ${msg}`); log(`${ICON('warn')} 경보 ${a}단계: ${msg}`, '#ff8a5a'); SFX.play('roar', 0.6); // v1.56 재난문자로
      this.huntT = 8;
    }
    // v1.16 맵 인구는 정해져 있고(js/pop.js) 증원은 경보 때만: 1단계 120초마다 2명 · 2단계 75초 3명 · 3단계 50초 4명, 바로 추격
    if (this.alert >= 1 && !this.cleared && (this.huntT -= dt) <= 0) { // v1.17 맵을 다 비우면 증원 없음
      this.huntT = [0, 120, 75, 50][this.alert];
      for (let i = 0; i < 16; i++) { // 막히지 않은 방향을 찾아서
        const ang = rand(0, TAU), r = rand(560, 720), hx = p.x + Math.cos(ang) * r, hy = p.y + Math.sin(ang) * r;
        if (World.circleBlocked(hx, hy, 30) || World.buildingAt(hx, hy) || (Nav.dist && Nav.dist[Math.floor(hy / TILE) * World.W + Math.floor(hx / TILE)] < 0)) continue;
        this.squad(hx, hy, 1 + this.alert, { r0: 0, r1: 90, chase: true }); break;
      }
      log(this.alert >= 3 ? '추적대가 다가온다!' : '증원이 다가온다!', '#ff5a5a');
    }
    Heli.update(dt); // v1.34
    for (const e of this.list) {
      if (e.ext) { if (e.tick) e.tick(e, dt); continue; } // v1.34
      if (e.kind === 'airdrop') {
        if (e.state === 'wait' && (e.t -= dt) <= 0) { e.state = 'falling'; e.fall = 12; log(`${ICON('radio')} 무전: "보급기가 상자를 떨어뜨린다! 12초 뒤 낙하." (미니맵 노란 ◆)`, '#ffd76a'); UI.toast('보급 투하', '12초 뒤 떨어진다. 먼저 가는 쪽이 갖는다'); }
        else if (e.state === 'falling' && (e.fall -= dt) <= 0) {
          e.state = 'landed'; G.shake = Math.max(G.shake, 4); burst(e.x, e.y, '#c9a24a', 16, 160, 0.5, 3); SFX.play('boom', 0.5);
          this.squad(e.x, e.y, 4 + Math.min(3, World.zoneIndex()), { r0: 70, r1: 200 }); // 연기를 보고 몰려온 무리
        }
      } else if (e.kind === 'safe' && e.state === 'locked' && e.carrier && e.carrier.hp <= 0) {
        e.state = 'unlocked'; floatText(e.carrier.x, e.carrier.y - 40, '금고 열쇠 획득!', '#ffd76a', 15); log('금고 열쇠를 손에 넣었다! 금고(미니맵 노란 ◆)로 가자.', '#ffd76a'); SFX.play('item', 2);
      } else if (e.kind === 'nest' && e.state === 'alive' && e.nest.hp <= 0) {
        e.state = 'dead';
      }
    }
  },
  // 둥지 (updateEnemies 에서): 플레이어가 가까우면 7초마다 1~2마리 (최대 6마리)
  nestTick(e, dt, d) {
    if (e.egg) { e.hitT -= dt; return; } // v1.34 잠실 변이 알: 낳지 않음
    e.hitT -= dt; e.kids = e.kids.filter(k => k.hp > 0);
    if (d > 750 || (e.spawnT -= dt) > 0) return;
    e.spawnT = 7;
    const z = ZONES[World.zoneIndex()], lab = World.def && World.def.lab;
    for (let i = 0, n = randInt(1, 2); i < n && e.kids.length < 6; i++) {
      const a = rand(0, TAU), x = e.x + Math.cos(a) * 46, y = e.y + Math.sin(a) * 46;
      if (World.circleBlocked(x, y, 16)) continue;
      const k = makeEnemy(lab ? 'subject' : pick(z.spawns.map(s => s[0]).filter(t => FACTION[t] === 'infected')) || 'zombie', x, y, e.level - 1);
      k.state = 'chase'; k.evGuard = true; G.enemies.push(k); e.kids.push(k);
      burst(x, y, '#6a1a2a', 8, 90, 0.4);
    }
  },
  // 둥지 처치 보상 (killEnemy)
  onKill(e, dropAt) {
    if (!e.nest) return;
    if (e.egg) { burst(e.x, e.y, '#6a1a2a', 12, 130, 0.4); floatText(e.x, e.y - 30, '알 파괴', '#ff9a3a', 13); return; } // v1.34
    Weekly.on('events'); Journal.onEvent(); // v1.15
    if (Math.random() < 0.5) dropAt('item', { item: randomGear(e.level, 1.2, 1, this.gearBias()) }); // v1.25 확정 → 50%
    dropAt('credits', { amount: e.level * 50 });
    for (const k of e.kids) if (k.hp > 0) { k.hp = 0; killFx(k); burst(k.x, k.y, '#6a1a2a', 10, 120, 0.4); }
    UI.toast(`${e.def.name} 파괴`, '근처에서 태어난 것들도 함께 쓰러졌다');
    hitstop(0.12); G.shake = Math.max(G.shake, 10);
  },

  // 떠돌이 상인 대화
  openTrader(npc) {
    const p = G.player, st = npc.stock, g = st.gear, again = () => this.openTrader(npc);
    const btns = [];
    btns.push([`${ICON('medkit')} +3 (180₵)`, () => { if (p.credits < 180) return log('크레딧이 부족합니다.', '#f88'); if (!addItem(makeConsumable('medkit', 3))) return log('가방이 가득 찼습니다.', '#f88'); p.credits -= 180; SFX.play('coin'); again(); }]);
    btns.push([`${ICON('ammo')} 들고 있는 총 탄약 (70₵)`, () => { if (p.credits < 70) return log('크레딧이 부족합니다.', '#f88'); const [t, n] = giveAmmoUnits(p, 150); log(`${AMMO[t].name} +${n}`, '#cc8'); p.credits -= 70; SFX.play('ammo'); again(); }]);
    if (!st.sold) btns.push([`${itemIcon(g)} ${itemName(g)} (₵${fmt(st.price)})`, () => {
      if (p.credits < st.price) return log('크레딧이 부족합니다.', '#f88');
      if (!addItem(g)) return log('가방이 가득 찼습니다.', '#f88');
      p.credits -= st.price; st.sold = true; SFX.play('coin'); log(`${itemName(g)} 샀다. 산 물건은 탈출 안 해도 내 것.`, '#ffd76a'); again();
    }]);
    btns.push(['닫기', () => UI.close('dialog')]);
    const desc = st.sold ? '"좋은 물건은 다 팔렸어. 약이나 탄약은 아직 있지."' : `"캠프까지 갈 필요 없지. 오늘의 물건은 <span class="r${g.rarity}">${itemName(g)}</span>. Lv${itemReqLevel(g)}부터 쓸 수 있어."`;
    UI.dialog(npc.name, `${desc}<br><span class="muted">₵${fmt(p.credits)} 보유 · 캠프보다 조금 비쌈</span>`, btns);
  },

  // 임무 창 추적 줄
  trackerLine() {
    const p = G.player; if (!p.raid) return '';
    const out = [];
    for (const e of this.list) {
      if (e.done || e.state === 'dead') continue;
      if (e.ext) { out.push(e.track ? e.track(e) : null); continue; } // v1.34
      if (e.kind === 'airdrop') out.push(e.state === 'wait' ? null : e.state === 'falling' ? `보급 투하 ${Math.ceil(e.fall)}초` : '보급 상자 열기');
      else if (e.kind === 'survivor') out.push('부상당한 생존자 구조');
      else if (e.kind === 'safe') out.push(e.state === 'locked' ? '금고: 열쇠 소지자 처치' : '금고 열기');
      else if (e.kind === 'nest') out.push(`${e.nest.def.name} 파괴`);
      else if (e.kind === 'generator') out.push('발전기 켜기 → 전원 탈출');
    }
    const s = out.filter(Boolean);
    const al = this.alert ? ` · <b style="color:#ff8a5a">경보 ${this.alert}단계</b>` : ` · 경보까지 ${Math.max(0, Math.ceil((ALERT_AT[0] + Camp.alertDelay() - p.raid.t) / 60))}분`;
    return Companion.trackerLine() + `<br><span class="muted">${ICON('radio')} ${s.length ? s.join(' · ') : '사건 없음'}${al}${Heli.line()}</span>`;
  },

  // 미니맵 표시
  minimap(g) {
    const blink = Math.sin(G.time * 5) > -0.3;
    const dia = (x, y, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x / TILE, y / TILE - 3); g.lineTo(x / TILE + 3, y / TILE); g.lineTo(x / TILE, y / TILE + 3); g.lineTo(x / TILE - 3, y / TILE); g.fill(); };
    for (const e of this.list) {
      if (e.ext) { if (e.mini && !e.done) e.mini(g, e, blink); continue; } // v1.34
      if (e.done || e.state === 'dead' || (e.kind === 'airdrop' && e.state === 'wait')) continue;
      if (blink) dia(e.x, e.y, '#ffd76a');
      if (e.kind === 'safe' && e.state === 'locked' && e.carrier.hp > 0 && blink) { g.fillStyle = '#ffd76a'; g.fillRect(e.carrier.x / TILE - 2, e.carrier.y / TILE - 2, 4, 4); }
    }
    for (const c of Scavenge.list) if (c.marked && !c.looted) { g.fillStyle = '#ffd76a'; g.fillRect(c.x / TILE - 1.5, c.y / TILE - 1.5, 3, 3); }
  },

  // ---------- 그리기 ----------
  collect(objs) {
    for (const e of this.list) if (e.ext) { if (e.draw) objs.push({ d: (e.x + e.y) / TILE + 0.05, draw: e.draw, ent: e }); } else if (e.kind !== 'nest' && e.kind !== 'trader') objs.push({ d: (e.x + e.y) / TILE + 0.05, draw: drawRaidEvent, ent: e });
    for (const ex of G.exits || []) if (ex.special) objs.push({ d: (ex.x + ex.y) / TILE, draw: drawSpecialExit, ent: ex });
    for (const e of this.list) if (e.kind === 'safe' && e.state === 'locked' && e.carrier.hp > 0) objs.push({ d: (e.carrier.x + e.carrier.y) / TILE + 0.6, draw: drawKeyMark, ent: e.carrier });
  },
};

function drawRaidEvent(e) {
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y);
  if (sx < -80 || sx > VW + 80 || sy < -200 || sy > VH + 80) return;
  const k = 0.5 + Math.sin(G.time * 4 + e.x) * 0.5;
  if (e.kind === 'airdrop') {
    if (e.state === 'wait') return;
    // 연막 (위치 표시)
    for (let i = 0; i < 4; i++) { const q = (G.time * 0.35 + i / 4) % 1; ctx.fillStyle = `rgba(255,${e.done ? 140 : 90},60,${0.22 * (1 - q)})`; ctx.beginPath(); ctx.arc(sx + 14 + q * 18 + Math.sin(G.time + i) * 4, sy - 8 - q * 90, 6 + q * 16, 0, TAU); ctx.fill(); }
    const z = e.state === 'falling' ? e.fall / 12 * 320 : 0;
    if (e.state === 'falling') { drawShadow(sx, sy, 16 * (1 - e.fall / 12) + 6); ctx.strokeStyle = 'rgba(255,90,60,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 22, 0, TAU); ctx.stroke(); ctx.lineWidth = 1; }
    if (propArt('airdrop')) { if (e.done) ctx.globalAlpha = 0.6; drawPropArt('airdrop', sx, Iso.sy(e.x, e.y, z)); ctx.globalAlpha = 1; } // v1.18 그림
    else drawBox(e.x - 12, e.y - 12, e.x + 12, e.y + 12, z + 22, e.done ? '#4a4a3a' : '#5a6a3a', '#34401e', '#46542a', z, z, 0);
    if (!e.done && !propArt('airdrop')) { ctx.fillStyle = '#e8e8e0'; ctx.fillRect(sx - 6, Iso.sy(e.x, e.y + 12, z + 12) - 2, 12, 4); }
    if (e.state === 'falling') { // 낙하산
      const ty = Iso.sy(e.x, e.y, z + 70);
      ctx.fillStyle = '#d8d0b8'; ctx.beginPath(); ctx.ellipse(sx, ty, 30, 14, 0, Math.PI, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,190,170,0.7)'; ctx.beginPath(); ctx.moveTo(sx - 28, ty); ctx.lineTo(sx - 8, Iso.sy(e.x, e.y, z + 22)); ctx.moveTo(sx + 28, ty); ctx.lineTo(sx + 8, Iso.sy(e.x, e.y, z + 22)); ctx.stroke();
    }
    if (Settings.light && !e.done) addLight(sx, sy - 10, 120, 0.8, 'rgba(255,110,60,A)');
    if (e.state === 'landed' && !e.done) nameTag(sx, sy - 40, '보급 상자', '#ffd76a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif', 'box');
  } else if (e.kind === 'survivor') {
    drawShadow(sx, sy, 14);
    if (!e.done) { // 벽에 기대 앉은 부상자 + 흰 천
      ctx.fillStyle = 'rgba(120,10,10,0.5)'; ctx.beginPath(); ctx.ellipse(sx + 4, sy + 2, 14, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#4a5a6a'; ctx.fillRect(sx - 8, sy - 16, 14, 14); ctx.fillStyle = '#2a2a30'; ctx.fillRect(sx - 2, sy - 4, 16, 5);
      ctx.fillStyle = '#d9b48f'; ctx.beginPath(); ctx.arc(sx - 1, sy - 21, 5.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eee'; ctx.fillRect(sx - 6, sy - 12, 10, 3);
      ctx.strokeStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(sx + 10, sy - 8); ctx.lineTo(sx + 10, sy - 40); ctx.stroke(); ctx.fillStyle = `rgba(240,240,240,${0.7 + k * 0.3})`; ctx.fillRect(sx + 10, sy - 40, 12, 8);
      nameTag(sx, sy - 52, '부상당한 생존자', '#8cf', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
    } else { ctx.fillStyle = '#eee'; ctx.fillRect(sx + 10, sy - 40, 12, 8); }
  } else if (e.kind === 'safe') {
    if (!drawPropArt('safe', sx, sy)) drawBox(e.x - 12, e.y - 10, e.x + 12, e.y + 10, 30, '#5a5e64', '#34373c', '#44484e', 0, 0, 0); // v1.18 그림
    ctx.fillStyle = e.done ? '#222' : e.state === 'locked' ? '#c83a2a' : '#40d070'; ctx.beginPath(); ctx.arc(Iso.sx(e.x, e.y + 10), Iso.sy(e.x, e.y + 10, 16), 4, 0, TAU); ctx.fill();
    if (!e.done) nameTag(sx, sy - 44, e.state === 'locked' ? '잠긴 금고' : '금고 (열쇠 있음)', '#ffd76a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
  } else if (e.kind === 'generator') {
    const j = e.state === 'on' ? Math.sin(G.time * 40) * 0.6 : 0;
    if (!drawPropArt('generator', sx + j, sy)) drawBox(e.x - 14 + j, e.y - 10, e.x + 14 + j, e.y + 10, 20, '#8a7a2a', '#5a4e18', '#6e6020', 0, 0, 0); // v1.18 그림
    ctx.fillStyle = e.state === 'on' ? '#40ff70' : `rgba(255,60,40,${0.5 + k * 0.5})`; ctx.fillRect(sx - 3, Iso.sy(e.x, e.y, 20) - 4, 6, 3);
    if (e.state !== 'on') nameTag(sx, sy - 38, '발전기', '#ffd76a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
    else if (Settings.light) addLight(sx, sy - 12, 90, 0.6, 'rgba(120,255,140,A)');
  }
}

// 특수 탈출 표시: 유료 = 신호탄 든 픽업 지점, 전원 = 꺼진/켜진 조명탑
function drawSpecialExit(ex) {
  const sx = Iso.sx(ex.x, ex.y), sy = Iso.sy(ex.x, ex.y);
  if (sx < -80 || sx > VW + 80 || sy < -160 || sy > VH + 80) return;
  const on = !ex.locked;
  ctx.strokeStyle = '#2a2c30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sx + 30, sy); ctx.lineTo(sx + 30, sy - 70); ctx.stroke(); ctx.lineWidth = 1;
  ctx.fillStyle = on ? '#9fffb0' : ex.special === 'pay' ? '#ffb040' : ex.special === 'heli' && !ex.gone ? '#7ad0ff' : '#444'; ctx.fillRect(sx + 24, sy - 76, 12, 6);
  if (ex.special === 'heli' && !ex.gone) { ctx.strokeStyle = on ? '#9fffb0' : 'rgba(122,208,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(sx, sy, 30, 15, 0, 0, TAU); ctx.stroke(); ctx.font = '14px BlackHan, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ctx.strokeStyle; ctx.fillText('H', sx, sy + 5); ctx.lineWidth = 1; } // 헬기 착륙장
  if (on && Settings.light) addLight(sx + 30, sy - 60, 140, 0.8, 'rgba(140,255,160,A)');
  else if (ex.special === 'pay' && Settings.light && Math.sin(G.time * 6) > 0) addLight(sx + 30, sy - 70, 70, 0.6, 'rgba(255,170,60,A)');
  nameTag(sx, sy - 88, on ? '탈출 지점 (열림)' : ex.label, on ? '#7fe08a' : '#ffb060', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
}
function drawKeyMark(e) {
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y) - 70 - Math.sin(G.time * 4) * 3;
  ctx.fillStyle = '#ffd76a'; ctx.beginPath(); ctx.arc(sx - 4, sy, 4, 0, TAU); ctx.fill(); ctx.fillRect(sx - 1, sy - 1.5, 10, 3); ctx.fillRect(sx + 5, sy, 2, 4); ctx.fillRect(sx + 8, sy, 2, 3);
  ctx.fillStyle = '#3a2a0a'; ctx.beginPath(); ctx.arc(sx - 4, sy, 1.5, 0, TAU); ctx.fill();
}

// 변이 둥지: 맥박 치는 살덩이 + 촉수 (drawEnemy 대신)
function drawNest(e) {
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y);
  if (sx < -100 || sx > VW + 100 || sy < -120 || sy > VH + 80) return;
  const lab = World.def && World.def.lab, pul = 1 + Math.sin(G.time * 3) * 0.06, fl = e.hitT > 0;
  if (propArt('nest')) { // v1.18 그림 (맥박 · 맞으면 번쩍)
    ctx.save(); if (fl && 'filter' in ctx) ctx.filter = 'brightness(2.4)'; drawPropArt('nest', sx, sy, false, pul); ctx.restore();
    if (Settings.light) addLight(sx, sy - 18, 110, 0.7, lab ? 'rgba(100,255,140,A)' : 'rgba(255,60,90,A)');
    const w = 60, hp = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - w / 2, sy - 70, w, 5); ctx.fillStyle = '#d33'; ctx.fillRect(sx - w / 2, sy - 70, w * hp, 5);
    nameTag(sx, sy - 76, e.def.name, '#ff8a8a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
    return;
  }
  ctx.fillStyle = 'rgba(60,10,20,0.5)'; ctx.beginPath(); ctx.ellipse(sx, sy, 46, 22, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 6; i++) { // 촉수
    const a = i / 6 * TAU + Math.sin(G.time * 1.5 + i) * 0.2;
    ctx.strokeStyle = lab ? '#3a6a4a' : '#5a1a28'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, sy - 10);
    ctx.quadraticCurveTo(sx + Math.cos(a) * 30, sy - 22 + Math.sin(a) * 8, sx + Math.cos(a) * 44, sy + Math.sin(a) * 20); ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.fillStyle = fl ? '#fff' : lab ? '#4a8a5a' : '#7a2a3a'; ctx.beginPath(); ctx.ellipse(sx, sy - 18 * pul, 26 * pul, 22 * pul, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = fl ? '#fff' : lab ? '#6aba7a' : '#a83a4a'; ctx.beginPath(); ctx.ellipse(sx - 6, sy - 26 * pul, 12 * pul, 9 * pul, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,${lab ? 255 : 200},${lab ? 120 : 80},${0.5 + Math.sin(G.time * 4 + i * 1.7) * 0.4})`; ctx.beginPath(); ctx.arc(sx - 14 + i * 9, sy - 16 + (i % 2) * 6, 2.5, 0, TAU); ctx.fill(); }
  if (Settings.light) addLight(sx, sy - 18, 110, 0.7, lab ? 'rgba(100,255,140,A)' : 'rgba(255,60,90,A)');
  const w = 60, hp = Math.max(0, e.hp / e.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - w / 2, sy - 58, w, 5); ctx.fillStyle = '#d33'; ctx.fillRect(sx - w / 2, sy - 58, w * hp, 5);
  nameTag(sx, sy - 64, e.def.name, '#ff8a8a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
}
