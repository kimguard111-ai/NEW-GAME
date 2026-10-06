// 출격 · 탈출 (v1.3, Escape from Duckov 방식)
// 캠프(거점)에서 맵을 골라 출격 → 맵 가장자리의 탈출 지점에 5초 머물면 귀환
// 이번 출격에서 주운 장비(it.raid)·크레딧은 탈출해야 확정. 죽으면 그것만 잃음 (장착하고 있어도 이번 출격에서 주운 것이면 잃음)
// 캠프에서 가져간 장비·창고·이야기 보상·재료는 안전

const EXTRACT_TIME = 5;   // 탈출 지점에 머무는 시간 (초)
const EXTRACT_R = 70;     // 탈출 지점 반경 (px)
const STASH_SIZE = 48; // 기본값 — v1.13부터 실제 크기는 Camp.stashSize() (창고 증축)

const Raid = {
  unlocked(id) { const d = MAPS[id]; return !!d && (d.chapter === undefined || G.player.quest.ch >= d.chapter); },
  inRaid() { return World.map !== 'camp'; },

  // 출격 지도 (작전 장교 대화)
  openMap() {
    const p = G.player, btns = [], med = (p.inventory.find(i => i.key === 'medkit') || { count: 0 }).count;
    let h = '"어디로 나갈 건가? 뭘 줍든 살아서 돌아와야 네 거야." <span class="muted">맵을 누르면 바로 나간다</span><br>'
      + `<div class="prep">출격 준비: ${ICON('medkit')} 구급상자 <b>${med}</b> · 탄약 ${Object.entries(AMMO).map(([k, a]) => `${a.name} <b>${fmt(p.ammo[k] || 0)}</b>`).join(' ')} · 가방 <b>${p.inventory.length}/${Camp.bagSize()}</b> · ₵${fmt(p.credits)}</div>`;
    btns.push([`${ICON('medkit')} +3 (120₵)`, () => { if (p.credits < 120) return log('크레딧이 부족합니다.', '#f88'); if (!addItem(makeConsumable('medkit', 3))) return log('가방이 가득 찼습니다.', '#f88'); p.credits -= 120; SFX.play('coin'); this.openMap(); }]);
    for (const [k, a] of Object.entries(AMMO)) btns.push([`${ICON('ammo_' + k)} ${a.name} +${a.pack} (${a.price}₵)`, () => { if (p.credits < a.price) return log('크레딧이 부족합니다.', '#f88'); addAmmo(p, k, a.pack); p.credits -= a.price; SFX.play('ammo'); this.openMap(); }]); // v1.33 탄약 4종
    h += `<div class="sum-head">${ICON('map')} 출격할 곳</div>`; // v1.45.2 맵 목록을 먼저 · 계약은 그 아래
    for (const id of MAP_ORDER) {
      const d = MAPS[id], z = ZONES[d.zone], ok = this.unlocked(id);
      const gr = p.graves[id];
      const ev = ok && Camp.lv('radio') >= 1 ? ` <span style="color:#ffd76a">${ICON('radio')} ${Camp.planFor(id).map(k => EVENT_DEFS[k].name).join(' · ')}</span>` : ''; // v1.13 무전실 미리 보기
      h += `<div class="map-row${ok ? ' go' : ' locked'}"${ok ? ` data-map="${id}"` : ''}><b>${ok ? ICON('map') : ICON('lock')} ${d.name}</b> <span class="muted">Lv${z.lvl[0]}~${z.lvl[1]} · ${ok ? z.desc : d.lock || `「${CHAPTERS[d.chapter].title}」에서 해금`}</span>${gr ? ` <span style="color:#ff8a8a">${ICON('skull')} 시체 가방 (장비 ${gr.items.length})</span>` : ''}${p.contract && p.contract.map === id ? ` <span style="color:#ffd76a">${ICON('bounty')} 계약</span>` : ''}${ev}</div>`;
    }
    h += Contracts.html(); // v1.34 출격 계약
    btns.push(['닫기', () => UI.close('dialog')]);
    UI.dialog('작전 장교 윤씨 — 출격 지도', h, btns);
    Contracts.bind($('dialog-text'), () => this.openMap());
    $('dialog-text').querySelectorAll('[data-map]').forEach(r => { r.onclick = () => { UI.close('dialog'); FirstRun.rules(() => this.deploy(r.dataset.map)); }; }); // v1.22 맵 이름을 눌러 바로 출격
  },

  deploy(id) {
    const p = G.player;
    // v1.7 비상 보급: 구급상자도 돈도 없으면 2개, 예비 탄약이 바닥이면 120발 (죽음의 악순환 방지 — 봇 측정에서 발견)
    const med = p.inventory.find(i => i.key === 'medkit');
    if (!med && p.credits < 120 && addItem(makeConsumable('medkit', 2))) log('작전 장교 윤씨: "빈손으로 보낼 순 없지." — 비상 구급상자 2개', '#8cf');
    for (const t of gunAmmoTypes(p)) if ((p.ammo[t] || 0) < AMMO[t].pack / 2) { addAmmo(p, t, AMMO[t].pack); log(`작전 장교 윤씨: 비상 ${AMMO[t].name} ${AMMO[t].pack}발 지급`, '#8cf'); }
    if (Camp.medkits() && addItem(makeConsumable('medkit', Camp.medkits()))) log(`의무실: 구급상자 ${Camp.medkits()}개 지급`, '#8cf'); // v1.13
    saveGame();
    World.generate(id);
    this.resetWorld();
    const pts = World.edgePts, start = pts[Math.floor(Math.random() * pts.length)];
    G.exits = pts.filter(q => q !== start);
    p.x = start.x; p.y = start.y; p.hp = PlayerStats.maxHp(p); p.stam = 100;
    p.raid = { map: id, credits: 0, items: 0, t: 0, kills: 0 };
    if (FirstRun.rookie()) G.fbT = 1e9; // v1.45 첫 출격엔 필드 보스 없음
    G.extractT = 0; G.search = null;
    Scavenge.generate(); // v1.4 뒤질 곳
    G.grave = p.graves[id] || null; // v1.4 지난번 시체 가방
    if (G.grave && World.def.lab) { // v1.5 연구소는 출격마다 구조가 바뀜 → 가장 가까운 바닥으로 옮김
      let best = null, bd = 1e9;
      for (let ty = 1; ty < World.H - 1; ty++) for (let tx = 1; tx < World.W - 1; tx++) {
        if (World.tiles[ty * World.W + tx] !== T.LFLOOR) continue;
        const d = Math.hypot(tx * TILE + 16 - G.grave.x, ty * TILE + 16 - G.grave.y);
        if (d < bd) { bd = d; best = [tx * TILE + 16, ty * TILE + 16]; }
      }
      if (best) [G.grave.x, G.grave.y] = best;
    }
    if (G.grave) log(`${ICON('skull')} 지난번에 쓰러진 자리에 시체 가방이 남아 있다. (미니맵 붉은 ✚)`, '#ff8a8a');
    UI.toast(MAPS[id].name, `탈출구 ${G.exits.length}곳 — 미니맵 초록 ◎`); // v1.39
    log(`${MAPS[id].name}. 나갈 길은 ${G.exits.filter(e => e.side).map(e => ({ N: '북', E: '동', S: '남', W: '서' })[e.side]).join(', ')}쪽 ${World.def.lab ? '비상 계단' : '끝'}.`, '#8cf'); // v1.39
    RaidEvents.generate(); // v1.10 돌발 사건 · 특수 탈출
    Pop.generate(start); // v1.16 맵 인구 (무한 스폰 없음)
    G.fade = { t: 0, life: 1.4, text: MAPS[id].name, sub: `Lv${ZONES[MAPS[id].zone].lvl[0]}~${ZONES[MAPS[id].zone].lvl[1]} · 적 약 ${Pop.total || '?'} · 탈출 지점 ${G.exits.length}곳` }; // v1.17
    if (World.def.lab) log('비상 전원만 남은 연구소다. 붉은 비상등 아래가 그나마 밝다. 격리실(미니맵 붉은 방)에 무언가 있다.', '#ff8a8a');
    saveGame();
  },

  // 맵을 바꿀 때 월드 상태 초기화
  resetWorld() {
    G.enemies = []; G.bullets = []; G.drops = []; G.particles = []; G.texts = []; G.effects = []; G.decals = []; G.grenades = []; G.fires = []; G.mines = []; G.turrets = []; G.corpses = []; Juice.reset(); G.camF = null;
    G.boss = null; G.elite = null; G.strikes = []; G.pools = []; G.assault = null; G.fieldBoss = null; G.fbT = 150; G.inside = null;
    G.labBoss = null; G.labBossDone = false; // v1.5
    G.exits = []; Pop.cells = []; RaidEvents.list = []; RaidEvents.alert = 0; G.extractT = 0; G.zone = World.zoneIndex(); G.bossT = Math.min(G.bossT, 0);
    if (World.map === 'camp') setupCampNpcs(); else G.npcs = [];
    GroundCache.map.clear(); Nav.dist = null; Nav.t = 0;
  },

  // 매 프레임: 탈출 지점에 머물기
  update(dt) {
    const p = G.player;
    if (!this.inRaid() || p.dead || !p.raid) return;
    p.raid.t += dt;
    const ex = G.exits.find(e => !e.locked && Math.hypot(p.x - e.x, p.y - e.y) < EXTRACT_R); // v1.10 잠긴 특수 탈출은 안 됨
    if (!ex || G.assault) { if (G.extractT > 0) log('탈출이 취소되었다.', '#aaa'); G.extractT = 0; return; }
    const need = ex.time || EXTRACT_TIME; G.extractNeed = need;
    if (G.extractT === 0) log(`탈출 중... ${need}초 동안 머무르세요.`, '#7fe08a');
    G.extractT += dt;
    if (G.extractT >= need) this.extract();
  },

  // 주운 것 확정 후 캠프로
  extract() {
    const p = G.player, r = p.raid;
    Contracts.onExtract(); // v1.34 계약 보상 (탈출 직전 판정: 호위 생존자가 곁에 있어야)
    Companion.onExtract(r); // v1.44 동료 개인 부탁
    Settlement.onExtract(r); // v1.43 구한 사람 합류 · 캠프 사람들이 물건을 모아 둠
    const items = this.allItems().filter(it => it.raid);
    for (const it of items) delete it.raid;
    Journal.onExtract(r, r.credits); // v1.15 기록
    p.raid = null;
    this.toCamp();
    this.summary(true, r, items);
    log(`탈출 성공! 이번 출격: 장비 ${items.length}개, 크레딧 ${fmt(r.credits)} 확보.`, '#7fe08a');
    SFX.play('quest');
    Bounty.on('extract');
    saveGame();
  },

  // 사망: 이번 출격에서 주운 것을 잃음 (playerDie 에서 호출)
  onDeath() {
    const p = G.player, r = p.raid;
    if (!r) return '';
    Contracts.onDeath(); // v1.34
    const lostItems = [];
    for (const k of Object.keys(p.equip)) if (p.equip[k] && p.equip[k].raid) { lostItems.push(p.equip[k]); p.equip[k] = null; }
    lostItems.push(...p.inventory.filter(it => it.raid));
    p.inventory = p.inventory.filter(it => !it.raid);
    if (!p.equip.w1) p.equip.w1 = makeWeapon('pistol', 1, 0); // 주무기가 비면 기본 권총
    if (!p.equip[p.active]) p.active = 'w1';
    const lost = Math.min(p.credits, r.credits);
    p.credits -= lost;
    for (const it of lostItems) delete it.raid;
    Scavenge.makeGrave(lostItems, lost); // v1.4: 다음 출격 때 같은 맵에서 회수
    p.raid = null;
    this.lastDeath = { r, items: lostItems, credits: lost };
    return lostItems.length || lost ? `이번 출격의 장비 ${lostItems.length}개와 ₵${fmt(lost)}가 시체 가방에 남았다. 다음에 「${MAPS[r.map].name}」에 출격해 회수할 수 있다.` : '캠프로 돌아갑니다.';
  },

  toCamp() {
    const p = G.player;
    World.generate('camp');
    this.resetWorld();
    Object.assign(p, World.campCenter());
    G.fade = { t: 0, life: 1.1, text: '시청역 생존자 캠프', sub: '' }; // v1.17
    p.cboard = null; // v1.34 돌아올 때마다 새 계약
    p.dead = false; p.hp = PlayerStats.maxHp(p); p.stam = 100;
    UI.refreshAll();
  },

  // 출격 결과 (탈출 성공 / 사망)
  summary(ok, r, items) {
    const li = items.length ? items.map(it => `<span class="r${it.rarity || 0}">${itemIcon(it)} ${itemName(it)}</span>`).join('<br>') : '<span class="muted">없음</span>';
    $('summary-title').textContent = ok ? '탈출 성공' : '사망';
    $('summary-title').className = ok ? 'ok' : 'bad';
    $('summary-body').innerHTML = `<div class="sum-row"><span>맵</span><b>${MAPS[r.map].name}</b></div>`
      + `<div class="sum-row"><span>시간</span><b>${Math.floor(r.t / 60)}분 ${Math.floor(r.t % 60)}초</b></div>`
      + `<div class="sum-row"><span>처치</span><b>${r.kills || 0}</b></div>`
      + `<div class="sum-row"><span>${ok ? '확보한 크레딧' : '잃은 크레딧'}</span><b>₵${fmt(ok ? r.credits : this.lastDeath.credits)}</b></div>`
      + `<div class="sum-head">${ok ? '가져온 장비' : '시체 가방에 남은 장비'} (${items.length})</div><div class="sum-items">${li}</div>`
      + (ok ? '' : `<div class="muted">다음에 「${MAPS[r.map].name}」에 출격하면 쓰러진 자리(미니맵 붉은 ✚)에서 회수할 수 있습니다. 다시 죽으면 새 가방으로 바뀝니다.</div>`);
    $('raid-summary').classList.remove('hidden');
  },

  allItems() { const p = G.player; return [...p.inventory, ...Object.values(p.equip).filter(Boolean)]; },

  trackerLine() {
    const p = G.player;
    if (!p.raid) return '';
    const n = this.allItems().filter(it => it.raid).length, ex = G.extractT > 0 ? ` · <b style="color:#7fe08a">탈출 ${Math.ceil((G.extractNeed || EXTRACT_TIME) - G.extractT)}초</b>` : '';
    return `<br><span class="muted">${ICON('box')} 미확정 장비 ${n} · ₵${fmt(p.raid.credits)} — 탈출 지점 ◎${ex}</span>`
      + (Pop.total ? `<br><span class="muted">${ICON('skull')} 남은 적 약 ${Pop.remaining()} / ${Pop.total}</span>` : ''); // v1.16
  },
};

// 창고 (캠프): 가방 ↔ 창고 옮기기
const Stash = {
  open() { UI.open('stash'); this.render(); },
  render() {
    const p = G.player;
    const grid = (el, list, size, onClick) => {
      el.innerHTML = '';
      for (let i = 0; i < size; i++) {
        const it = list[i], c = document.createElement('div');
        c.className = 'inv-cell' + (it ? ' bc' + (it.rarity || 0) : '');
        if (it) { c.innerHTML = UI.itemCell(it); c.onclick = () => { ItemTip.hide(); onClick(it); }; ItemTip.attach(c, it); } // v1.47 툴팁
        el.appendChild(c);
      }
    };
    $('stash-bag-n').textContent = `${p.inventory.length} / ${Camp.bagSize()}`; $('stash-n').textContent = `${p.stash.length} / ${Camp.stashSize()}`;
    grid($('stash-bag'), p.inventory, Camp.bagSize(), it => { if (p.stash.length >= Camp.stashSize()) return log('창고가 가득 찼습니다.', '#f88'); removeItem(it); p.stash.push(it); this.after(); });
    grid($('stash-grid'), p.stash, Camp.stashSize(), it => { if (p.inventory.length >= Camp.bagSize()) return log('가방이 가득 찼습니다.', '#f88'); p.stash.splice(p.stash.indexOf(it), 1); p.inventory.push(it); this.after(); });
  },
  after() { this.render(); UI.refreshInventory(); saveGame(); SFX.play('ui'); },
};
