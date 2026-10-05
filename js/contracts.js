// v1.34 출격 목표 다양화: 출격 계약 (회수 · 표적 처치 · 생존자 호위) · 맵마다 고유 사건
// 사건 목록(RaidEvents.list)에 ext: true 로 들어가고, 자기 함수(onStart · onFinish · tick · track · mini · draw)를 가짐

const CONTRACT_TYPES = {
  retrieve: { name: '물건 회수', icon: 'box', desc: '물건을 찾아 들고 나올 것', items: ['비행 기록 장치', '백신 샘플 상자', '암호 장부', '정찰 드론 메모리', '구호 물자 목록'] },
  target:   { name: '표적 처치', icon: 'skull', desc: '현상금 걸린 놈을 잡고 나올 것', names: ['「흉터」', '「까마귀」', '「도살꾼 박」', '「붉은 손」', '「외눈」', '「검은 개」'] },
  escort:   { name: '생존자 호위', icon: 'medkit', desc: '갇힌 사람을 데리고 나올 것. 죽게 두면 끝', names: ['김 간호사', '정비공 이씨', '꼬마 민준', '라디오 기사 한씨', '할머니 순자'] },
};

const Contracts = {
  // 출격 지도에 걸리는 계약 3개 (탈출·사망하고 돌아오면 새로 걸림)
  board() {
    const p = G.player;
    if (p.cboard && p.cboard.length) return p.cboard;
    const maps = MAP_ORDER.filter(id => Raid.unlocked(id) && !MAPS[id].lab), out = [], types = Object.keys(CONTRACT_TYPES).sort(() => Math.random() - 0.5); // 세 종류 하나씩
    for (let i = 0; i < 3 && maps.length; i++) {
      const map = maps[Math.max(0, maps.length - 1 - Math.floor(Math.random() * Math.min(3, maps.length)))]; // 최근 맵 위주
      const type = types[i];
      const lvl = ZONES[MAPS[map].zone].lvl[1], C = CONTRACT_TYPES[type];
      const what = type === 'retrieve' ? pick(C.items) : type === 'target' ? pick(C.names) : pick(C.names);
      out.push({ type, map, what, lvl, cr: Math.round(lvl * (type === 'escort' ? 150 : 110) * ECON.cr * 2), exp: type === 'escort' ? 0.16 : 0.12, rare: type === 'escort' ? 2 : 1 });
    }
    p.cboard = out; return out;
  },
  title(c) { return c.type === 'retrieve' ? `${c.what} 회수` : c.type === 'target' ? `현상범 ${c.what} 처치` : `${c.what} 호위`; },
  // 출격 지도 위쪽에 붙는 계약 칸 (HTML) · 누르면 수락/취소
  html() {
    const p = G.player, cur = p.contract;
    let h = `<div class="sum-head">${ICON('bounty')} 계약 게시판 <span class="muted">하나만 받을 수 있다. 끝내고 살아 돌아와야 돈을 준다.</span></div>`; // v1.39
    if (cur) h += `<div class="map-row cx" data-cx="cancel"><b style="color:#e0a060">받은 계약: ${this.title(cur)}</b> <span class="muted">${MAPS[cur.map].name}, ₵${fmt(cur.cr)}</span></div>`;
    else this.board().forEach((c, i) => {
      h += `<div class="map-row cx" data-cx="${i}"><b>${ICON(CONTRACT_TYPES[c.type].icon)} ${this.title(c)}</b> <span class="muted">${MAPS[c.map].name}. ${CONTRACT_TYPES[c.type].desc}. ₵${fmt(c.cr)}과 ${c.rare >= 2 ? '희귀' : '쓸 만한'} 장비.</span></div>`;
    });
    return h;
  },
  bind(root, again) {
    root.querySelectorAll('[data-cx]').forEach(r => { r.onclick = () => {
      const p = G.player, v = r.dataset.cx;
      if (v === 'cancel') { log(`계약 포기: ${this.title(p.contract)}`, '#aaa'); p.contract = null; }
      else { p.contract = p.cboard.splice(+v, 1)[0]; log(`계약 수락: ${this.title(p.contract)} — 「${MAPS[p.contract.map].name}」에 출격하면 시작`, '#ffd76a'); SFX.play('quest'); }
      saveGame(); again();
    }; });
  },

  // 출격 직후 (RaidEvents.generate)
  setup() {
    const p = G.player, c = p.contract;
    if (!c || c.map !== World.map || !p.raid) return;
    p.raid.contract = { done: false };
    const s = RaidEvents.spot(c.type === 'escort' ? 800 : 1000); if (!s) { p.raid.contract = null; return; }
    const area = { ax: s.x + rand(-220, 220), ay: s.y + rand(-220, 220) }; // 미니맵엔 대략적인 범위만
    if (c.type === 'retrieve') {
      RaidEvents.list.push({ ext: true, kind: 'c_item', ...s, ...area, hint: `[E] ${c.what} 회수 (2초)`, dur: 2, open: true,
        onFinish: e => { e.done = true; p.raid.contract.done = true; floatText(p.x, p.y - 36, `${c.what} 확보!`, '#ffd76a', 15); UI.toast('계약 물건 확보', '들고 탈출하면 보상 — 죽으면 잃음'); SFX.play('item', 3); },
        track: e => `계약: ${c.what} 찾기 (미니맵 노란 원)`, mini: (g, e, b) => this.miniArea(g, e, b), draw: drawContractItem });
      RaidEvents.squad(s.x, s.y, 3, { r0: 60, r1: 150 });
    } else if (c.type === 'target') {
      const z = ZONES[World.zoneIndex()], type = weighted(z.spawns), t = makeEnemy(type, s.x, s.y, RaidEvents.maxLvl() + 1);
      Monsters.makeElite(t, Monsters.rollAffix(type)); t.bossName = `현상범 ${c.what}`; t.evGuard = true; t.hp = t.maxHp = Math.round(t.maxHp * 1.4);
      G.enemies.push(t);
      RaidEvents.list.push({ ext: true, kind: 'c_target', ...s, ...area, carrier: t,
        tick: e => { if (!e.done && t.hp <= 0) { e.done = true; p.raid.contract.done = true; UI.toast('현상범 처치', '탈출하면 계약 보상'); log(`현상범 ${c.what}을(를) 쓰러뜨렸다. 이제 탈출하자.`, '#ffd76a'); } },
        track: e => `계약: 현상범 ${c.what} 처치 (미니맵 붉은 원)`, mini: (g, e, b) => this.miniArea(g, e, b, '#ff6a5a', t) });
      RaidEvents.squad(s.x, s.y, 3, { r0: 60, r1: 160 });
    } else if (c.type === 'escort') {
      const es = { ext: true, kind: 'c_escort', ...s, ...area, r: 10, hp: 160 + p.level * 12, maxHp: 160 + p.level * 12, state: 'wait', name: c.what, hint: `[E] ${c.what}에게 말 걸기 — 호위 시작`, dur: 1, open: true, walk: 0,
        onFinish: e => { e.state = 'follow'; e.hint = null; log(`${c.what}: "따라갈게요. 탈출 지점까지만 부탁해요."`, '#8cf'); UI.toast('호위 시작', `${c.what}이(가) 따라온다 — 함께 탈출 지점에 서면 완료`); },
        tick: (e, dt) => this.escortTick(e, dt), track: e => e.state === 'wait' ? `계약: ${c.what} 찾기 (미니맵 하늘색 원)` : `계약: ${c.what} 호위 (체력 ${Math.ceil(e.hp)})`,
        mini: (g, e, b) => e.state === 'wait' ? this.miniArea(g, e, b, '#7ad0ff') : (g.fillStyle = '#7ad0ff', g.fillRect(e.x / TILE - 2, e.y / TILE - 2, 4, 4)), draw: drawEscort };
      RaidEvents.list.push(es); p.raid.contract.escort = es;
      RaidEvents.squad(s.x, s.y, 2, { r0: 120, r1: 220 });
    }
    log(`${ICON('bounty')} 계약 시작: ${this.title(c)}`, '#ffd76a');
  },
  miniArea(g, e, blink, color = '#ffd76a', ent) {
    const p = G.player, near = Math.hypot(p.x - e.x, p.y - e.y) < 380, x = ent ? ent.x : e.x, y = ent ? ent.y : e.y;
    if (ent && ent.hp <= 0) return;
    g.strokeStyle = color; g.globalAlpha = blink ? 0.8 : 0.4; g.lineWidth = 1; g.beginPath(); g.arc(e.ax / TILE, e.ay / TILE, 11, 0, TAU); g.stroke(); g.globalAlpha = 1;
    if (near) { g.fillStyle = color; g.fillRect(x / TILE - 2, y / TILE - 2, 4, 4); }
  },
  // 호위: 플레이어를 따라오고, 가까운 적·총알·폭발에 다침
  escortTick(e, dt) {
    const p = G.player;
    if (e.state !== 'follow' || e.dead) return;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d > 460) { for (let i = 0; i < 12; i++) { const a = rand(0, TAU), x = p.x + Math.cos(a) * 40, y = p.y + Math.sin(a) * 40; if (!World.circleBlocked(x, y, 12) && Interiors.sameSpace({ x, y })) { e.x = x; e.y = y; break; } } } // 너무 떨어지면 따라잡음 (v1.37 벽 안으로 안 들어가게)
    else if (d > 48) { const sp = PlayerStats.speed(p) * 0.95 * dt, a = Math.atan2(p.y - e.y, p.x - e.x); World.move(e, Math.cos(a) * sp, Math.sin(a) * sp); e.walk += dt; e.face = a; }
    let hurt = 0;
    for (const o of G.enemies) if (o.hp > 0 && o.state === 'chase' && !o.def.ranged && Math.hypot(o.x - e.x, o.y - e.y) < o.r + 14 && (o.escT = (o.escT || 0) - dt) <= 0) { o.escT = o.def.atkCd * 1.2; hurt += o.dmg * 0.8; }
    for (const b of G.bullets) if (b.from === 'e' && b.life > 0 && Math.hypot(b.x - e.x, b.y - e.y) < 12) { hurt += b.dmg; b.life = 0; }
    for (const s of G.strikes) if (s.t < s.delay && s.t + dt >= s.delay && Math.hypot(s.x - e.x, s.y - e.y) < s.r + 10) hurt += s.dmg;
    if (hurt > 0) { e.hp -= hurt; e.hitT = 0.1; floatText(e.x, e.y - 34, Math.round(hurt), '#ff9a7a', 12); if (G.time - (e.cryT || 0) > 6) { e.cryT = G.time; log(`${e.name}: "으악! 도와줘요!"`, '#ff9a7a'); } }
    e.hitT = (e.hitT || 0) - dt;
    if (e.hp <= 0) { e.dead = true; e.done = true; this.fail(`${e.name}이(가) 쓰러졌다`); }
  },
  fail(why) {
    const p = G.player; if (!p.contract) return;
    UI.toast('계약 실패', why); log(`${ICON('warn')} 계약 실패: ${why}`, '#ff8a5a');
    p.contract = null; if (p.raid) p.raid.contract = null;
  },
  // 탈출 (Raid.extract 전에): 완료했으면 보상
  onExtract() {
    const p = G.player, r = p.raid, c = p.contract;
    if (!c || !r || !r.contract) return;
    let ok = r.contract.done;
    if (c.type === 'escort') { const es = r.contract.escort; ok = es && es.state === 'follow' && !es.dead && Math.hypot(es.x - p.x, es.y - p.y) < 220; if (es && es.state === 'follow' && !ok && !es.dead) log(`${c.what}을(를) 두고 나왔다 — 계약은 그대로 남는다.`, '#aaa'); }
    if (!ok) return;
    p.credits += c.cr; gainExp(Math.round(PlayerStats.expNext(p.level) * c.exp));
    const g = randomGear(Math.max(c.lvl, p.level - 2), 1.0, c.rare, ZONES[MAPS[c.map].zone].gear);
    const where = addItem(g) ? '가방' : (p.stash.push(g), '창고');
    Workshop.gain(randInt(2, 4), c.type === 'escort' ? 2 : 1, '계약');
    UI.toast(`계약 완료 — ${this.title(c)}`, `₵${fmt(c.cr)} · 경험치 · ${itemName(g)} (${where})`);
    log(`${ICON('bounty')} 계약 완료: ₵${fmt(c.cr)} · ${itemName(g)}`, '#ffd76a'); SFX.play('quest');
    Weekly.on('events'); Journal.onEvent();
    p.contract = null; p.cboard = null;
  },
  onDeath() { const p = G.player; if (p.contract && p.raid && p.raid.contract) this.fail('출격 중 쓰러졌다'); p.cboard = null; },
  trackerLine() {
    const p = G.player, r = p.raid, c = p.contract;
    if (!r || !r.contract || !c) return '';
    return r.contract.done ? `<br><span style="color:#ffd76a">${ICON('bounty')} 계약 완료 — 탈출하면 보상 (₵${fmt(c.cr)})</span>` : '';
  },
};

// ---------- 시간 제한 탈출: 헬기 (출격 5~7분 사이에 90초 동안만) ----------
const Heli = {
  make(s) {
    const t0 = Math.round(rand(300, 420)), ex = { ...s, special: 'heli', locked: true, time: 3, t0, t1: t0 + 90, label: `헬기 탈출 (${this.mmss(t0)}~${this.mmss(t0 + 90)})` };
    G.exits.push(ex); return ex;
  },
  mmss(t) { return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; },
  update(dt) {
    const p = G.player; if (!p.raid) return;
    for (const ex of G.exits) {
      if (ex.special !== 'heli' || ex.gone) continue;
      const t = p.raid.t;
      if (ex.locked && t >= ex.t0 && t < ex.t1) { ex.locked = false; UI.toast('헬기 도착', '90초 동안만 — 미니맵 초록 ◎'); log(`${ICON('radio')} 무전: "헬기 착륙했다. 90초 기다린다!"`, '#7fe08a'); SFX.play('quest'); }
      if (!ex.locked && t >= ex.t1) { ex.locked = true; ex.gone = true; ex.label = '헬기 떠남'; log('헬기가 떠났다.', '#aaa'); }
      if (!ex.locked && t >= ex.t1 - 15 && !ex.warned) { ex.warned = true; log('무전: "15초 뒤 이륙한다!"', '#ffb060'); }
    }
  },
  line() {
    const p = G.player, ex = (G.exits || []).find(e => e.special === 'heli' && !e.gone); if (!ex || !p.raid) return '';
    return ex.locked ? ` · 헬기 ${this.mmss(Math.max(0, ex.t0 - p.raid.t))} 뒤 도착` : ` · <b style="color:#7fe08a">헬기 이륙까지 ${Math.ceil(ex.t1 - p.raid.t)}초</b>`;
  },
};

// ---------- 맵마다 고유 사건 ----------
const MAP_EVENTS = {
  myeongdong: { name: '지하상가 셔터', desc: '셔터를 뜯으려면 6초, 그 소리에 감염자들이 몰려온다' },
  jongno:     { name: '약탈자 검문소', desc: '약탈자 다섯이 지키는 보급함이 있다' },
  yongsan:    { name: '잠긴 무기고', desc: '출입 카드는 순찰 드론이 갖고 있다. 안에 총과 탄약' },
  yeouido:    { name: '방사능 정화 장치', desc: '돌리는 데 8초, 실험체들이 냄새를 맡고 온다' },
  gangnam:    { name: '블랙선 서버 탈취', desc: '서버를 빼내는 데 10초, 용병들이 바로 출동한다' },
  jamsil:     { name: '변이 알 무더기', desc: '알 세 개가 곧 깨어난다. 60초 안에 깨부숴라' },
};
const MapEvents = {
  make() {
    const id = World.map, D = MAP_EVENTS[id]; if (!D) return;
    const s = RaidEvents.spot(700); if (!s) return;
    const lvl = RaidEvents.maxLvl(), bias = RaidEvents.gearBias(), p = G.player;
    const drop = (e, kind, extra) => G.drops.push({ x: e.x + rand(-24, 24), y: e.y + rand(-24, 24), kind, t: 0, ...extra });
    const base = { ext: true, kind: 'u_' + id, ...s, name: D.name, open: true, mini: (g, e, b) => { if (b && !e.done) { g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(e.x / TILE, e.y / TILE - 4); g.lineTo(e.x / TILE + 4, e.y / TILE); g.lineTo(e.x / TILE, e.y / TILE + 4); g.lineTo(e.x / TILE - 4, e.y / TILE); g.fill(); } }, draw: drawMapEvent };
    const done = (e, title, sub) => { e.done = true; UI.toast(title, sub); SFX.play('item', 3); burst(e.x, e.y, '#ffd76a', 16, 150, 0.5); Weekly.on('events'); Journal.onEvent(); Bounty.on('crate'); };
    let e;
    if (id === 'myeongdong') e = { ...base, hint: '[E] 지하상가 셔터 뜯기 (6초 · 시끄러움)', dur: 6,
      onStart: e => { if (!e.loud) { e.loud = true; for (const o of G.enemies) if (FACTION[o.type] === 'infected' && dist(o, e) < 900) { o.state = 'chase'; o.heard = true; } RaidEvents.squad(e.x, e.y, 5, { r0: 320, r1: 440, chase: true }); log('셔터가 끼익거린다 — 감염자 떼가 몰려온다!', '#ff8a5a'); } return true; },
      onFinish: e => { drop(e, 'item', { item: makeConsumable('medkit', 2) }); drop(e, 'ammo', { amount: 70 }); drop(e, 'ammo', { amount: 70 }); drop(e, 'credits', { amount: lvl * 50 }); if (Math.random() < 0.6) drop(e, 'item', { item: randomGear(lvl, 1.0, 1, bias) }); done(e, '지하상가 털기', '구급상자 · 탄약 · 크레딧'); } };
    else if (id === 'jongno') { const guards = []; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU, g = makeEnemy('raider', s.x + Math.cos(a) * 90, s.y + Math.sin(a) * 90, lvl); if (World.circleBlocked(g.x, g.y, 14)) { g.x = s.x + rand(-30, 30); g.y = s.y + rand(-30, 30); } g.evGuard = true; G.enemies.push(g); guards.push(g); }
      e = { ...base, guards, hint: '[E] 검문소 보급함 열기 (2초)', dur: 2,
        onStart: e => { const n = e.guards.filter(g => g.hp > 0).length; if (n) { log(`경비가 ${n}명 남아 있다. 모두 쓰러뜨려야 열 수 있다.`, '#aaa'); SFX.play('empty'); return false; } return true; },
        onFinish: e => { drop(e, 'item', { item: randomGear(lvl, 1.3, 2, bias) }); drop(e, 'credits', { amount: lvl * 70 }); drop(e, 'ammo', { amount: 90 }); done(e, '검문소 보급함', '희귀 이상 장비 · 크레딧 · 탄약'); },
        track: e => { const n = e.guards.filter(g => g.hp > 0).length; return n ? `약탈자 검문소: 경비 ${n}명` : '검문소 보급함 열기'; } }; }
    else if (id === 'yongsan') { const k = RaidEvents.spot(900) || s, c = makeEnemy('drone', k.x, k.y, lvl); Monsters.makeElite(c, Monsters.rollAffix('drone')); c.keyCarrier = true; c.evGuard = true; c.bossName = '순찰 드론 (출입 카드)'; G.enemies.push(c);
      e = { ...base, carrier: c, hint: '[E] 무기고 열기 (3초)', dur: 3,
        onStart: e => { if (e.carrier.hp > 0) { log('출입 카드가 필요하다. 순찰 드론(미니맵 주황 점)을 격추하자.', '#aaa'); SFX.play('empty'); return false; } return true; },
        onFinish: e => { const guns = ['smg', 'shotgun', 'rifle', 'sniper', 'lmg'].filter(k => WEAPONS[k].lvl <= lvl + 2); drop(e, 'item', { item: makeWeapon(pick(guns), lvl, Math.random() < 0.5 ? 2 : 3) }); for (const t of Object.keys(AMMO)) drop(e, 'ammo', { amount: 80, ammo: t }); done(e, '무기고', '총기 · 탄약 4종'); },
        mini: (g, e, b) => { base.mini(g, e, b); if (b && e.carrier.hp > 0) { g.fillStyle = '#ff9a3a'; g.fillRect(e.carrier.x / TILE - 2, e.carrier.y / TILE - 2, 4, 4); } },
        track: e => e.carrier.hp > 0 ? '잠긴 무기고: 순찰 드론 격추' : '무기고 열기' }; }
    else if (id === 'yeouido' || id === 'gangnam') { const yeo = id === 'yeouido';
      e = { ...base, hint: yeo ? '[E] 정화 장치 가동 (8초)' : '[E] 서버 내려받기 (10초)', dur: yeo ? 8 : 10,
        onStart: e => { if (!e.waves) { e.waves = 1; RaidEvents.squad(e.x, e.y, 3, { r0: 300, r1: 420, chase: true }); e.wave2 = 4; log(yeo ? '정화 장치가 웅웅거린다 — 실험체가 몰려온다!' : '서버 경보가 울린다 — 블랙선 용병이 출동했다!', '#ff8a5a'); } return true; },
        tick: (e, dt) => { if (e.wave2 > 0 && (e.wave2 -= dt) <= 0) RaidEvents.squad(e.x, e.y, yeo ? 3 : 4, { r0: 320, r1: 440, chase: true }); },
        onFinish: e => { if (yeo) { gainExp(Math.round(PlayerStats.expNext(p.level) * 0.1)); Workshop.gain(2, 2, '정화 장치'); drop(e, 'credits', { amount: lvl * 50 }); done(e, '정화 장치 가동', '경험치 · 부품 · 크레딧'); }
          else { Workshop.gain(1, 3, '서버'); drop(e, 'item', { item: randomGear(lvl, 1.4, 2, bias) }); drop(e, 'credits', { amount: lvl * 80 }); done(e, '서버 탈취', '전자 부품 · 희귀 이상 장비'); } } };
      if (!yeo) for (const k of [0, 1]) { const m = makeEnemy('merc', s.x + rand(-80, 80), s.y + rand(-80, 80), lvl); if (!World.circleBlocked(m.x, m.y, 14)) { m.evGuard = true; G.enemies.push(m); } } }
    else if (id === 'jamsil') { const eggs = [];
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU, x = s.x + Math.cos(a) * 70, y = s.y + Math.sin(a) * 70; if (World.circleBlocked(x, y, 20)) continue;
        const g = makeEnemy('brute', x, y, lvl); g.type = 'nest'; g.nest = true; g.egg = true; g.evGuard = true; g.weight = 0; g.r = 20; g.def = { ...ENEMIES.brute, name: '변이 알', speed: 0, aggro: 0, weight: 0, exp: ENEMIES.brute.exp }; g.hp = g.maxHp = Math.round(g.maxHp * 1.2); G.enemies.push(g); eggs.push(g); }
      e = { ...base, eggs, state: 'idle', t: 60,
        tick: (e, dt) => { if (e.done) return; const alive = e.eggs.filter(g => g.hp > 0);
          if (!alive.length) { drop(e, 'item', { item: randomGear(lvl, 1.3, 2, bias) }); drop(e, 'credits', { amount: lvl * 60 }); Workshop.gain(2, 1, '변이 알'); done(e, '변이 알 제거', '부화 전에 모두 깼다'); return; }
          if (e.state === 'idle' && dist(p, e) < 520) { e.state = 'count'; UI.toast('변이 알 무더기', '60초 안에 알 3개를 깨라 — 못 깨면 부화'); log('알이 꿈틀거린다… 60초 뒤 부화한다!', '#ff8a5a'); }
          if (e.state === 'count' && (e.t -= dt) <= 0) { e.done = true; e.failed = true; for (const g of alive) { for (let k = 0; k < 3; k++) { const n = makeEnemy(Math.random() < 0.5 ? 'stalker' : 'subject', g.x + rand(-20, 20), g.y + rand(-20, 20), lvl); n.state = 'chase'; n.heard = true; G.enemies.push(n); } g.hp = 0; burst(g.x, g.y, '#6a1a2a', 14, 140, 0.5); } UI.toast('부화', '알에서 변이체가 쏟아져 나왔다!'); } },
        track: e => e.state === 'count' ? `변이 알: ${Math.ceil(e.t)}초 · ${e.eggs.filter(g => g.hp > 0).length}개 남음` : '변이 알 무더기 (미니맵 주황 ◆)' }; }
    if (!e) return;
    e.track = e.track || (e => `${D.name} (미니맵 주황 ◆)`);
    RaidEvents.list.push(e);
    log(`${ICON('radio')} 무전: "${D.name} 쪽에 뭔가 있다. ${D.desc}." (미니맵 주황 ◆)`, '#ff9a3a'); // v1.39 말투
  },
};

// ---------- 그리기 ----------
function drawContractItem(e) {
  if (e.done) return;
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y); if (sx < -60 || sx > VW + 60 || sy < -80 || sy > VH + 60) return;
  if (!drawPropArt('labcase', sx, sy)) drawBox(e.x - 9, e.y - 7, e.x + 9, e.y + 7, 12, '#c8a040', '#7a6020', '#9a7a2a', 0, 0, 0);
  const k = 0.5 + Math.sin(G.time * 5) * 0.5; ctx.fillStyle = `rgba(255,215,106,${0.25 + k * 0.3})`; ctx.beginPath(); ctx.ellipse(sx, sy, 18, 9, 0, 0, TAU); ctx.fill();
  if (Settings.light) addLight(sx, sy - 8, 70, 0.6, 'rgba(255,215,106,A)');
  nameTag(sx, sy - 34, G.player.contract ? G.player.contract.what : '계약 물건', '#ffd76a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
}
function drawEscort(e) {
  if (e.dead) return;
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y); if (sx < -60 || sx > VW + 60 || sy < -80 || sy > VH + 60) return;
  drawShadow(sx, sy, 11);
  drawHuman(sx, sy, { s: 0.95, body: '#4a6a8a', skin: '#d9b48f', legs: '#3a3a44', aim: e.face || 0, flash: e.hitT > 0, walk: e.state === 'follow' ? e.walk * 6 : 0 });
  if (e.state === 'wait') { ctx.fillStyle = `rgba(122,208,255,${0.5 + Math.sin(G.time * 4) * 0.3})`; ctx.font = '16px BlackHan, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', sx, sy - 52); }
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 16, sy - 46, 32, 4); ctx.fillStyle = '#7ad0ff'; ctx.fillRect(sx - 16, sy - 46, 32 * Math.max(0, e.hp / e.maxHp), 4);
  nameTag(sx, sy - 50, e.name, '#7ad0ff', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
}
function drawMapEvent(e) {
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y); if (sx < -80 || sx > VW + 80 || sy < -160 || sy > VH + 80) return;
  const k = 0.5 + Math.sin(G.time * 4 + e.x) * 0.5, id = e.kind.slice(2);
  if (id === 'jamsil') { if (!e.done && e.state === 'count') nameTag(sx, sy - 70, `부화까지 ${Math.ceil(e.t)}초`, '#ff6a5a', 'bold 13px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'); return; } // 알은 적(둥지)으로 그려짐
  const art = { myeongdong: 'container', jongno: 'crates', yongsan: 'locker', yeouido: 'generator', gangnam: 'radio' }[id];
  if (id === 'jongno' && !drawPropArt('sandbags', sx - 40, sy + 10)) drawBox(e.x - 40, e.y + 10, e.x - 10, e.y + 22, 10, '#6a5a3a', '#4a3e28', '#5a4e30', 0, 0, 0);
  if (!art || !drawPropArt(art, sx, sy)) drawBox(e.x - 14, e.y - 12, e.x + 14, e.y + 12, id === 'yongsan' ? 34 : 24, e.done ? '#3a3a3a' : '#6a6050', '#3a3428', '#4a4434', 0, 0, 0);
  if (!e.done) {
    ctx.fillStyle = `rgba(255,154,58,${0.4 + k * 0.5})`; ctx.fillRect(sx - 3, sy - 44, 6, 4);
    if (Settings.light) addLight(sx, sy - 20, 90, 0.6, 'rgba(255,154,58,A)');
    nameTag(sx, sy - 54, e.name, '#ff9a3a', 'bold 11px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif');
  }
}
