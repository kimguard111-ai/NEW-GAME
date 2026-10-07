// v1.41 동료 생존자: 캠프 대장 한씨에게서 고용 → 출격에 한 명 데리고 감. 알아서 따라오고 쏨
// 쓰러지면 [E]로 일으킴 (25초 안에) · 못 일으키면 이번 출격만 빠짐 (영영 잃지 않음)
// v1.44 동료 2차: 총 쥐여 주기 (탄 무한) · 동료 레벨 (함께 잡으면 오름) · 명령 (따라와/대기/조용히) · 개인 부탁 → 전용 능력
const COMP_MAX_LV = 10, COMP_CMDS = ['follow', 'hold', 'quiet'], COMP_CMD_NAMES = { follow: '따라와', hold: '여기서 대기', quiet: '조용히' };
const COMPANIONS = {
  assault: { sprite: 'comp_assault', tint: 'none', name: '박 상병', role: '돌격', lvl: 5, price: 1500, hpMul: 1.4, dmg: 9, rate: 0.17, range: 420, spread: 0.06, speed: 950, gun: 20, snd: 'rifle',
    look: { body: '#4a5a3a', helmet: '#3a4a2a', legs: '#2a2e22' }, desc: '소총으로 꾸준히 쏜다. 맷집이 좋다.',
    bark: { hire: '"박 상병, 따라가겠습니다."', kill: ['하나 처리!', '정리됐습니다.', '다음!'], hurt: ['윽, 맞았습니다!', '엄호 바랍니다!'], down: '"…먼저 가십시오…"', up: '"고맙습니다. 아직 싸울 수 있습니다."', lv: '"감이 돌아옵니다."' },
    quest: { what: '부대 인식표', map: 'jongno', ask: '"종로에서 우리 분대가 끊겼습니다. 분대장 인식표만이라도 찾아 주십시오."', perk: '엄호 사격', perkDesc: '내 체력이 30% 아래로 떨어지면 5초 동안 두 배 빠르게 쏜다 (30초마다)', thanks: '"…이제 분대장님 몫까지 싸우겠습니다."' } },
  sniper: { sprite: 'comp_sniper', tint: 'none', name: '윤 저격수', role: '저격', lvl: 10, price: 3000, hpMul: 0.8, dmg: 58, rate: 1.5, range: 720, spread: 0.008, speed: 1500, pierce: 1, gun: 28, snd: 'sniper',
    look: { body: '#5a5040', helmet: '#3a3226', legs: '#2a261e' }, desc: '멀리서 한 방씩. 관통한다. 몸은 약하다.',
    bark: { hire: '"멀리 있는 건 내가 맡지."', kill: ['명중.', '하나.', '쓰러졌다.'], hurt: ['가까이 붙었어!', '거리 좀 벌려 줘!'], down: '"…총 좀… 챙겨 줘…"', up: '"빚졌네."', lv: '"손이 좀 풀렸어."' },
    quest: { what: '부서진 조준경', map: 'jongno', ask: '"종로 옥상에 두고 온 조준경이 있어. 부서졌어도 그게 있어야 눈이 맞아."', perk: '표적 지정', perkDesc: '맞힌 적은 5초 동안 내가 주는 피해 +25%', thanks: '"좋아. 이제 내가 찍으면 네가 끝내."' } },
  medic: { sprite: 'comp_medic', tint: 'none', name: '서 간호사', role: '의무', lvl: 8, price: 2500, hpMul: 1.0, dmg: 8, rate: 0.5, range: 380, spread: 0.05, speed: 950, gun: 12, snd: 'pistol', heal: true,
    look: { body: '#d8d0c0', helmet: null, legs: '#4a4a52' }, desc: '권총은 약하지만 내 체력이 70% 아래면 12초마다 15% 치료해 준다.',
    bark: { hire: '"다치면 바로 말해요."', kill: ['휴…', '맞았다!'], hurt: ['아파요!', '저 좀 지켜 줘요!'], down: '"…괜찮아요… 가요…"', up: '"고마워요. 이번엔 제가 지킬게요."', heal: ['가만있어 봐요, 붕대 감을게요.', '피 좀 멈추고 가요.', '움직이지 마요!'], lv: '"이제 손이 덜 떨려요."' },
    quest: { what: '의약품 상자', map: 'myeongdong', ask: '"명동 약국 창고에 상자 하나가 남아 있대요. 그게 있으면 훨씬 많이 고칠 수 있어요."', perk: '야전 치료', perkDesc: '치료가 15% → 25%, 12초 → 9초마다', thanks: '"이걸로 사람 여럿 살려요. 고마워요."' } },
};

const Companion = {
  def() { const p = G.player; return p && p.comp && COMPANIONS[p.comp] || null; },
  data(id) { const p = G.player; p.compData = p.compData || {}; id = id || p.comp; return p.compData[id] || (p.compData[id] = { lv: 1, xp: 0, gun: null, quest: null }); },
  maxHp(p) { const d = this.def(); return Math.round((70 + p.level * 24) * d.hpMul * (1 + 0.08 * (this.data().lv - 1))); },
  dmgMul() { return 1 + 0.06 * (this.data().lv - 1); },
  perk(id) { return G.player.comp === id && this.data(id).quest === 'done'; },
  cmd() { return G.player.compCmd || 'follow'; },

  // ---------- v1.44 레벨: 동료가 잡으면 +3 · 내가 잡을 때 곁에 있으면 +1 ----------
  onKill(e) {
    const c = G.comp, d = this.def(); if (!c || !d || e.minion || c.state === 'down' || c.state === 'gone' || c.map !== World.map) return;
    if (!(e.lastHit && e.lastHit.ally) && Math.hypot(c.x - e.x, c.y - e.y) > 600) return;
    this.gainXp(e.lastHit && e.lastHit.ally ? 3 : 1);
  },
  gainXp(n) {
    const d = this.def(), cd = this.data(); if (!d || cd.lv >= COMP_MAX_LV) return;
    cd.xp += n;
    while (cd.lv < COMP_MAX_LV && cd.xp >= cd.lv * 12) {
      cd.xp -= cd.lv * 12; cd.lv++; if (cd.lv >= COMP_MAX_LV) cd.xp = 0;
      if (G.comp && G.comp.state !== 'down') G.comp.hp = this.maxHp(G.player);
      UI.toast(`${d.name} Lv${cd.lv}`, `체력 +8% · 피해 +6%${cd.lv === 3 && !cd.quest ? ' · 한씨에게 가면 개인 부탁을 들을 수 있다' : ''}`);
      this.bark(d.bark.lv); SFX.play('levelup', 0.6); log(`${d.name}이(가) Lv${cd.lv}이 되었다.`, '#9fd0ff');
    }
  },

  // ---------- v1.44 명령: [F] 따라와 → 여기서 대기 → 조용히 ----------
  command() {
    const p = G.player, d = this.def(), c = G.comp; if (!d || !c || c.state === 'down' || c.state === 'gone') return;
    p.compCmd = COMP_CMDS[(COMP_CMDS.indexOf(this.cmd()) + 1) % COMP_CMDS.length];
    if (p.compCmd === 'hold') { c.holdX = c.x; c.holdY = c.y; }
    const say = { follow: '"따라가겠습니다."', hold: '"여기서 지키고 있겠습니다."', quiet: '"알겠어요. 먼저 쏘진 않을게요."' }[p.compCmd];
    this.bark(say); SFX.play('click'); floatText(c.x, c.y - 40, COMP_CMD_NAMES[p.compCmd], '#9fd0ff', 13);
  },

  // ---------- v1.44 총 쥐여 주기 (캠프에서만 · 탄 무한 · 피해는 총 수치의 70%) ----------
  canGive(it) { return it && it.kind === 'weapon' && !WEAPONS[it.key].melee && G.player.comp && !it.raid && World.map === 'camp'; },
  give(it) {
    const p = G.player, d = this.def(), cd = this.data(); if (!this.canGive(it)) return;
    if (it.locked) return log('잠긴 장비는 넘길 수 없습니다.', '#f88');
    removeItem(it); if (cd.gun) p.inventory.push(cd.gun);
    cd.gun = it; it.isNew = false; SFX.play('equip');
    log(`${d.name}에게 ${itemName(it)}을(를) 넘겼다.`, '#9fd0ff'); this.bark('"좋은 총이군요. 아껴 쓰겠습니다."');
    UI.selected = null; UI.refreshInventory(); saveGame();
  },
  takeBack(id) {
    const p = G.player, cd = this.data(id); if (!cd.gun) return;
    if (p.inventory.length >= Camp.bagSize()) return log('가방이 가득 찼습니다.', '#f88');
    p.inventory.push(cd.gun); log(`${itemName(cd.gun)}을(를) 돌려받았다.`, '#9fd0ff'); cd.gun = null; SFX.play('equip'); saveGame();
  },
  gunStats(p, d) {
    const g = this.data().gun, wb = g && WEAPONS[g.key], m = this.dmgMul();
    if (!wb) return { dmg: d.dmg * (1 + (p.level - 1) * 0.14) * m, rate: d.rate, spread: d.spread, speed: d.speed, range: d.range, pellets: 1, pierce: d.pierce || 0, snd: d.snd, gun: d.gun };
    return { dmg: g.dmg * plusMul(g) * 0.7 * m, rate: wb.rate * 1.25, spread: wb.spread * 1.2, speed: wb.speed, range: Math.min(wb.range, 720), pellets: wb.pellets || 1, pierce: wb.pierce || 0, falloff: wb.falloff,
      snd: { smg: 'smg', rifle: 'rifle', lmg: 'lmg', shotgun: 'shotgun', sniper: 'sniper' }[wbase(g.key)] || 'pistol', gun: wb.mag > 20 ? 20 : wb.pellets ? 16 : 12 };
  },

  // ---------- 캠프: 고용 · 고르기 ----------
  open() {
    const p = G.player; p.compHired = p.compHired || [];
    let h = '"혼자 다니면 오래 못 가. 같이 나갈 사람을 붙여 주지. 한 번에 한 명만."<br>';
    const btns = [];
    for (const [id, d] of Object.entries(COMPANIONS)) {
      const hired = p.compHired.includes(id), on = p.comp === id, lock = p.level < d.lvl, cd = hired ? this.data(id) : null;
      let info = '';
      if (cd) { // v1.44 레벨 · 쥔 총 · 개인 부탁
        info = `<br><span style="color:#9fd0ff">Lv${cd.lv}</span>${cd.lv < COMP_MAX_LV ? ` <span class="muted">(${cd.xp}/${cd.lv * 12})</span>` : ' <span class="muted">(최고)</span>'}`
          + ` · <span class="muted">총:</span> ${cd.gun ? `<b class="r${cd.gun.rarity || 0}">${itemName(cd.gun)}</b>` : '<span class="muted">기본 총</span>'}`;
        if (cd.quest === 'done') info += `<br><span style="color:#9fbf6a">전용 능력 「${d.quest.perk}」</span> <span class="muted">${d.quest.perkDesc}</span>`;
        else if (cd.quest === 'active') info += `<br><span style="color:#ffd76a">부탁: 「${MAPS[d.quest.map].name}」에서 ${d.quest.what} 찾아오기 (함께 출격)</span>`;
        else info += `<br><span class="muted">${cd.lv >= 3 ? '할 얘기가 있는 눈치다.' : 'Lv3이 되면 개인 부탁을 꺼낸다.'}</span>`;
      }
      h += `<div class="map-row" style="padding:4px 6px;border:1px solid #2f2b22;margin:4px 0"><b style="color:${on ? '#9fbf6a' : '#e6dfcc'}">${d.name}</b> <span class="muted">${d.role}</span>${on ? ' <span style="color:#9fbf6a">· 함께 가는 중</span>' : ''}<br><span class="muted">${d.desc}${hired ? '' : ` 고용 ₵${fmt(d.price)}`}${lock ? ` (Lv${d.lvl}부터)` : ''}</span>${info}</div>`;
      if (lock) continue;
      if (!hired) btns.push([`${d.name} 고용 (₵${fmt(d.price)})`, () => {
        if (p.credits < d.price) return log('크레딧이 부족합니다.', '#f88');
        p.credits -= d.price; p.compHired.push(id); p.comp = id; G.comp = null; SFX.play('buy'); log(`${d.name}: ${d.bark.hire}`, '#9fd0ff'); saveGame(); this.open();
      }]);
      else if (!on) btns.push([`${d.name} 데려가기`, () => { p.comp = id; G.comp = null; SFX.play('equip'); log(`${d.name}: ${d.bark.hire}`, '#9fd0ff'); saveGame(); this.open(); }]);
      if (cd && cd.lv >= 3 && !cd.quest) btns.push([`${d.name}의 부탁 듣기`, () => {
        cd.quest = 'active'; SFX.play('quest'); log(`${d.name}: ${d.quest.ask}`, '#9fd0ff');
        UI.toast(`부탁: ${d.quest.what}`, `${d.name}을(를) 데리고 「${MAPS[d.quest.map].name}」에 출격`); saveGame(); this.open();
      }]);
      if (cd && cd.gun) btns.push([`${d.name}에게서 총 돌려받기`, () => { this.takeBack(id); this.open(); }]);
    }
    if (p.comp) btns.push(['혼자 가기', () => { p.comp = null; G.comp = null; saveGame(); this.open(); }]);
    btns.push(['닫기', () => UI.close('dialog')]);
    h += `<span class="muted">총은 가방에서 골라 「동료에게 주기」 · 출격 중 [${keyLabel(keyOf('compCmd'))}] 로 명령 (따라와 / 여기서 대기 / 조용히)</span>`;
    UI.dialog('생존자 대장 한씨', h, btns);
  },

  // ---------- 매 프레임 ----------
  spawn(p) {
    const d = this.def(); let x = p.x, y = p.y;
    for (let i = 0; i < 16; i++) { const a = rand(0, TAU), r = rand(36, 70), nx = p.x + Math.cos(a) * r, ny = p.y + Math.sin(a) * r; if (!World.circleBlocked(nx, ny, 12)) { x = nx; y = ny; break; } }
    G.comp = { id: p.comp, map: World.map, x, y, r: 10, def: { flying: false }, sideDir: 1, hp: this.maxHp(p), state: 'follow', atkT: 1, tgtT: 0, face: 0, walk: 0, hitT: 0, lastHurt: -9, healT: 6, barkT: 3, say: null, apart: 0 };
  },
  update(dt) {
    const p = G.player, d = this.def();
    if (!d || p.dead) return;
    if (!G.comp || G.comp.map !== World.map || G.comp.id !== p.comp) this.spawn(p);
    const c = G.comp;
    c.hitT -= dt; c.barkT -= dt; if (c.say && (c.say.t -= dt) <= 0) c.say = null;
    if (c.state === 'gone') return;
    if (c.state === 'down') {
      if ((c.downT -= dt) <= 0) { c.state = 'gone'; if (c.rev) c.rev.done = true; log(`${d.name}이(가) 부상을 입고 물러났다. 다음 출격엔 다시 온다.`, '#ff9a7a'); }
      return;
    }
    const mh = this.maxHp(p); c.hp = Math.min(c.hp, mh);
    // 따라가기: 플레이어 뒤쪽 50px · 멀면 따라잡기 · 다른 공간(건물 안팎)이면 잠시 뒤 따라 들어옴
    const dd = Math.hypot(p.x - c.x, p.y - c.y), same = Interiors.sameSpace(c);
    c.apart = same ? 0 : c.apart + dt;
    const cmd = this.cmd();
    if (cmd === 'hold' && c.holdX === undefined) { c.holdX = c.x; c.holdY = c.y; }
    if (cmd === 'hold' && c.apart < 8 && dd < 1400) { // v1.44 대기: 그 자리 지킴 (너무 멀어지거나 다른 공간에 오래 있으면 다시 따라붙음)
      const hd = Math.hypot(c.holdX - c.x, c.holdY - c.y);
      if (hd > 14) { this.move(c, Math.atan2(c.holdY - c.y, c.holdX - c.x), PlayerStats.speed(p) * 0.9 * dt); c.walk += dt; c.movedT = G.time; }
    } else if (dd > 480 || c.apart > 1.2) { for (let i = 0; i < 16; i++) { const a = rand(0, TAU), nx = p.x + Math.cos(a) * 40, ny = p.y + Math.sin(a) * 40; if (!World.circleBlocked(nx, ny, 12) && Interiors.sameSpace({ x: nx, y: ny })) { c.x = nx; c.y = ny; c.apart = 0; break; } } }
    else {
      const gx = p.x - Math.cos(p.aim) * 50, gy = p.y - Math.sin(p.aim) * 50, gd = Math.hypot(gx - c.x, gy - c.y);
      if (gd > 26 && dd > 46) { const a = Math.atan2(gy - c.y, gx - c.x), sp = PlayerStats.speed(p) * (dd > 160 ? 1.25 : 0.95) * dt; this.move(c, a, sp); c.walk += dt; c.movedT = G.time; if (!c.tgt) c.face = a; }
    }
    // 쏘기: 가까운 적 (보이는 것)
    const st = this.gunStats(p, d), quiet = cmd === 'quiet' && G.time - c.lastHurt > 3 && G.time - (p.lastHurt || -9) > 3; // v1.44 조용히: 먼저 쏘지 않음 (맞으면 응사)
    if ((c.tgtT -= dt) <= 0) {
      c.tgtT = 0.3; c.tgt = null; let bd = quiet ? 0 : st.range;
      for (const e of G.enemies) { if (e.hp <= 0 || enemyCloaked(e)) continue; const ed = Math.hypot(e.x - c.x, e.y - c.y); if (ed < bd && (e.state === 'chase' || ed < 260) && World.lineOfSight(c, e)) { bd = ed; c.tgt = e; } }
    }
    c.atkT -= dt;
    if (c.tgt && c.tgt.hp > 0 && !World.inSafe(p.x, p.y)) {
      const e = c.tgt, a = Math.atan2(e.y - c.y, e.x - c.x); c.face = a;
      if (c.atkT <= 0) {
        const cover = (c.coverT || 0) > G.time; // v1.44 박 상병 전용: 엄호 사격
        c.atkT = st.rate * rand(0.9, 1.15) * (cover ? 0.5 : 1); c.lastAtk = G.time;
        const mx = c.x + Math.cos(a) * 14, my = c.y + Math.sin(a) * 14, crit = Math.random() < 0.08, mark = this.perk('sniper');
        for (let i = 0; i < st.pellets; i++) {
          const aa = a + rand(-st.spread, st.spread), sp = st.speed * (st.pellets > 1 ? rand(0.9, 1.05) : 1);
          G.bullets.push({ x: mx, y: my, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, from: 'p', ally: true, mark, life: st.range / st.speed, maxLife: st.range / st.speed, dmg: st.dmg * (crit ? 1.8 : 1), crit, pierce: st.pierce, falloff: st.falloff, hit: [], w: null, color: '#9fd0ff', sid: -1 });
        }
        Juice.flashes.push({ x: mx, y: my, a, t: 0, life: 0.05, s: st.snd === 'sniper' || st.snd === 'shotgun' ? 16 : 10 });
        SFX.playAt(st.snd, c.x, c.y, 0.55, 1000);
        if (st.snd === 'sniper') G.effects.push({ type: 'tracer', x: mx, y: my, x2: e.x, y2: e.y, t: 0, life: 0.25, color: 'rgba(160,210,255,0.7)', w: 2 });
      }
    }
    if (c.tgt && c.tgt.hp <= 0) { if (c.barkT <= 0 && Math.random() < 0.35) this.bark(pick(d.bark.kill)); c.tgt = null; }
    // v1.44 박 상병 전용: 내 체력 30% 아래 → 5초 엄호 사격 (30초마다)
    if (this.perk('assault') && p.hp < PlayerStats.maxHp(p) * 0.3 && G.time > (c.coverCd || 0) && !World.inSafe(p.x, p.y)) { c.coverT = G.time + 5; c.coverCd = G.time + 30; this.bark('"엄호합니다! 빠지십시오!"'); }
    // 의무: 치료 (v1.44 야전 치료: 25% · 9초)
    const fieldMed = this.perk('medic');
    if (d.heal && (c.healT -= dt) <= 0 && p.hp < PlayerStats.maxHp(p) * 0.7 && dd < 260) {
      c.healT = fieldMed ? 9 : 12; const amt = Math.round(PlayerStats.maxHp(p) * (fieldMed ? 0.25 : 0.15)); p.hp = Math.min(PlayerStats.maxHp(p), p.hp + amt);
      floatText(p.x, p.y - 34, '+' + amt, '#6f6', 15); SFX.play('heal'); this.bark(pick(d.bark.heal));
    }
    // 맞기: 붙은 적 · 적 총알 · 폭발 (캠프·안전 지대는 안전)
    if (World.inSafe(c.x, c.y)) { c.hp = Math.min(mh, c.hp + mh * 0.1 * dt); return; }
    let hurt = 0;
    for (const o of G.enemies) if (o.hp > 0 && o.state === 'chase' && !o.def.ranged && Math.hypot(o.x - c.x, o.y - c.y) < o.r + 14 && (o.compT = (o.compT || 0) - dt) <= 0) { o.compT = o.def.atkCd * 1.3; hurt += o.dmg * 0.7; }
    for (const b of G.bullets) if (b.from === 'e' && b.life > 0 && Math.hypot(b.x - c.x, b.y - c.y) < 12) { hurt += b.dmg * 0.8; b.life = 0; }
    for (const s of G.strikes) if (s.t < s.delay && s.t + dt >= s.delay && Math.hypot(s.x - c.x, s.y - c.y) < s.r + 10) hurt += s.dmg * 0.8;
    if (hurt > 0) { c.hp -= hurt; c.hitT = 0.1; c.lastHurt = G.time; floatText(c.x, c.y - 34, Math.round(hurt), '#ff9a7a', 12); if (c.barkT <= 0 && c.hp < mh * 0.5) this.bark(pick(d.bark.hurt)); }
    else if (G.time - c.lastHurt > 6) c.hp = Math.min(mh, c.hp + mh * 0.03 * dt); // 싸움이 멎으면 조금씩 회복
    if (c.hp <= 0) this.down(c, d);
  },
  move(c, a, step) { // 적용 길찾기와 달리 안전 지대(캠프)에도 들어감 · 막히면 옆으로 비켜 감
    step *= World.slow(c.x, c.y);
    for (const off of [0, c.sideDir * 0.8, -c.sideDir * 0.8, c.sideDir * 1.6, -c.sideDir * 1.6]) {
      const ox = c.x, oy = c.y; World.move(c, Math.cos(a + off) * step, Math.sin(a + off) * step);
      if (Math.hypot(c.x - ox, c.y - oy) > step * 0.5) return;
    }
    c.sideDir *= -1;
  },
  bark(text) { const c = G.comp; if (!c) return; c.say = { text, t: 2.2 }; c.barkT = 5; },
  down(c, d) {
    c.state = 'down'; c.hp = 0; c.downT = 25; c.tgt = null; this.bark(d.bark.down); SFX.play('ehit');
    UI.toast(`${d.name} 쓰러짐`, '25초 안에 다가가서 [E]로 일으키자');
    c.rev = { ext: true, kind: 'c_revive', x: c.x, y: c.y, hint: `[E] ${d.name} 일으키기 (2.5초)`, dur: 2.5, open: true,
      onFinish: e => { e.done = true; c.state = 'follow'; c.hp = Math.round(this.maxHp(G.player) * 0.4); c.rev = null; this.bark(d.bark.up); SFX.play('heal'); },
      track: () => `${d.name} 쓰러짐 ${Math.ceil(c.downT)}초`, mini: (g, e, b) => { if (b) { g.fillStyle = '#7ad0ff'; g.fillRect(e.x / TILE - 2, e.y / TILE - 2, 4, 4); } } };
    if (G.player.raid) RaidEvents.list.push(c.rev);
  },
  // ---------- v1.44 개인 부탁: 그 동료를 데리고 그 맵에 출격하면 물건이 하나 놓임 → 들고 탈출 ----------
  setupRaid() {
    const p = G.player, d = this.def(); if (!d || !p.raid) return;
    const cd = this.data(); if (cd.quest !== 'active' || d.quest.map !== World.map) return;
    const s = RaidEvents.spot(900); if (!s) return;
    const area = { ax: s.x + rand(-200, 200), ay: s.y + rand(-200, 200) }, q = d.quest;
    RaidEvents.list.push({ ext: true, kind: 'c_item', ...s, ...area, hint: `[E] ${q.what} 줍기 (2초)`, dur: 2, open: true,
      onFinish: e => { e.done = true; p.raid.compQ = p.comp; floatText(p.x, p.y - 36, `${q.what}!`, '#9fd0ff', 15); UI.toast(`${q.what} 찾음`, `${d.name}에게 가져갈 것. 들고 탈출하면 끝`); this.bark('"…찾았네요. 고맙습니다."'); SFX.play('item', 3); },
      track: e => e.done ? `${d.name}의 부탁: ${q.what} 들고 탈출` : `${d.name}의 부탁: ${q.what} 찾기 (미니맵 하늘색 원)`,
      mini: (g, e, b) => Contracts.miniArea(g, e, b, '#7ad0ff'), draw: drawContractItem });
    RaidEvents.squad(s.x, s.y, 3, { r0: 60, r1: 150 });
    log(`${d.name}: "여기 어딘가에 ${q.what}이(가) 있을 겁니다."`, '#9fd0ff');
  },
  onExtract(r) {
    const id = r && r.compQ, d = COMPANIONS[id]; if (!d) return;
    const cd = this.data(id); if (cd.quest === 'done') return;
    cd.quest = 'done'; this.gainXp(12);
    UI.toast(`${d.name} 전용 능력: ${d.quest.perk}`, d.quest.perkDesc); log(`${d.name}: ${d.quest.thanks}`, '#9fd0ff'); SFX.play('quest');
  },
  trackerLine() {
    const c = G.comp, d = this.def(); if (!c || !d || !G.player.raid) return '';
    if (c.state === 'gone') return `<br><span class="muted">${d.name} 물러남</span>`;
    if (c.state === 'down') return '';
    return `<br><span class="muted">동료 ${d.name} Lv${this.data().lv} · 체력 ${Math.round(100 * c.hp / this.maxHp(G.player))}% · ${COMP_CMD_NAMES[this.cmd()]} [${keyLabel(keyOf('compCmd'))}]</span>`;
  },

  // ---------- 그리기 ----------
  collect(objs) { const c = G.comp; if (c && c.state !== 'gone' && this.def() && c.map === World.map) objs.push({ d: (c.x + c.y) / TILE, draw: () => this.draw(c), ent: c }); },
  draw(c) {
    const d = this.def(), sx = Iso.sx(c.x, c.y), sy = Iso.sy(c.x, c.y); if (sx < -60 || sx > VW + 60 || sy < -80 || sy > VH + 60) return;
    drawShadow(sx, sy, 11);
    const o = { s: 1, body: d.look.body, skin: '#c49a78', helmet: d.look.helmet, legs: d.look.legs, aim: c.face || 0, gun: this.gunStats(G.player, d).gun, flash: c.hitT > 0, walk: c.state === 'follow' ? c.walk * 6 : 0 };
    if (c.state === 'down') { if (Sprites.get(d.sprite)) Sprites.draw(d.sprite, 'death', 9, sx, sy, c.face || 0, false); /* v1.49.3 쓰러진 그림 = 죽는 동작 마지막 칸 */ else { ctx.save(); ctx.translate(sx, sy); ctx.rotate(1.35); ctx.translate(-sx, -sy); drawHuman(sx, sy, o); ctx.restore(); }
      const k = c.downT / 25; ctx.strokeStyle = '#7ad0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy - 6, 16, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.lineWidth = 1;
      nameTag(sx, sy - 30, `[E] ${d.name} 일으키기`, '#7ad0ff', 'bold 12px "Malgun Gothic", sans-serif'); return; }
    if (Sprites.get(d.sprite)) { // v1.49.3 동료 전용 그림 (없으면 코드 그림)
      const [anim, at] = animState(c.state === 'follow' && c.walk > 0 && G.time - (c.movedT || -9) < 0.15, c.hitT, c.lastAtk, d.sprite);
      ctx.save(); if ('filter' in ctx) ctx.filter = d.tint; Sprites.draw(d.sprite, anim, at, sx, sy, c.face || 0, c.hitT > 0); ctx.restore();
    } else drawHuman(sx, sy, o);
    const mh = this.maxHp(G.player);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(sx - 14, sy - 50, 28, 3); ctx.fillStyle = '#7ad0ff'; ctx.fillRect(sx - 14, sy - 50, 28 * Math.max(0, c.hp / mh), 3);
    nameTag(sx, sy - 54, d.name, '#9fd0ff', 'bold 11px "Malgun Gothic", sans-serif');
    if (c.say) { ctx.globalAlpha = Math.min(1, c.say.t * 2); nameTag(sx, sy - 68, c.say.text, '#e6dfcc', 'bold 12px "Malgun Gothic", sans-serif'); ctx.globalAlpha = 1; }
  },
};
