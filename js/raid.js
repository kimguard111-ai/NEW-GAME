// 출격 · 탈출 (v1.3, Escape from Duckov 방식)
// 캠프(거점)에서 맵을 골라 출격 → 맵 가장자리의 탈출 지점에 5초 머물면 귀환
// 이번 출격에서 주운 장비(it.raid)·크레딧은 탈출해야 확정. 죽으면 그것만 잃음 (장착하고 있어도 이번 출격에서 주운 것이면 잃음)
// 캠프에서 가져간 장비·창고·이야기 보상·재료는 안전

const EXTRACT_TIME = 5;   // 탈출 지점에 머무는 시간 (초)
const EXTRACT_R = 70;     // 탈출 지점 반경 (px)
const STASH_SIZE = 48;

const Raid = {
  unlocked(id) { const d = MAPS[id]; return !!d && (d.chapter === undefined || G.player.quest.ch >= d.chapter); },
  inRaid() { return World.map !== 'camp'; },

  // 출격 지도 (작전 장교 대화)
  openMap() {
    const p = G.player, btns = [];
    let h = '"어디로 나갈 건가? 탈출 지점까지 살아서 돌아와야 주운 걸 챙길 수 있어."<br><br>';
    for (const id of MAP_ORDER) {
      const d = MAPS[id], z = ZONES[d.zone], ok = this.unlocked(id);
      h += `<div class="map-row${ok ? '' : ' locked'}"><b>${ok ? '🗺' : '🔒'} ${d.name}</b> <span class="muted">Lv${z.lvl[0]}~${z.lvl[1]} · ${ok ? z.desc : `「${CHAPTERS[d.chapter].title}」에서 해금`}</span></div>`;
      if (ok) btns.push([`${d.name} 출격`, () => { UI.close('dialog'); this.deploy(id); }]);
    }
    btns.push(['닫기', () => UI.close('dialog')]);
    UI.dialog('작전 장교 윤씨 — 출격 지도', h, btns);
  },

  deploy(id) {
    const p = G.player;
    saveGame();
    World.generate(id);
    this.resetWorld();
    const pts = World.edgePts, start = pts[Math.floor(Math.random() * pts.length)];
    G.exits = pts.filter(q => q !== start);
    p.x = start.x; p.y = start.y; p.hp = PlayerStats.maxHp(p); p.stam = 100;
    p.raid = { map: id, credits: 0, items: 0, t: 0 };
    G.extractT = 0;
    UI.toast(`출격 — ${MAPS[id].name}`, `탈출 지점 ${G.exits.length}곳 (미니맵 초록 ◎) · 주운 것은 탈출해야 확정`);
    log(`${MAPS[id].name}에 진입했다. 탈출 지점: ${G.exits.map(e => ({ N: '북', E: '동', S: '남', W: '서' })[e.side]).join(' · ')}쪽 끝`, '#8cf');
    saveGame();
  },

  // 맵을 바꿀 때 월드 상태 초기화
  resetWorld() {
    G.enemies = []; G.bullets = []; G.drops = []; G.particles = []; G.texts = []; G.effects = []; G.decals = []; G.grenades = []; G.corpses = [];
    G.boss = null; G.elite = null; G.strikes = []; G.pools = []; G.assault = null; G.fieldBoss = null; G.fbT = 150; G.inside = null;
    G.exits = []; G.extractT = 0; G.zone = World.zoneIndex(); G.bossT = Math.min(G.bossT, 0);
    if (World.map === 'camp') setupCampNpcs(); else G.npcs = [];
    GroundCache.map.clear(); Nav.dist = null; Nav.t = 0;
  },

  // 매 프레임: 탈출 지점에 머물기
  update(dt) {
    const p = G.player;
    if (!this.inRaid() || p.dead || !p.raid) return;
    p.raid.t += dt;
    const ex = G.exits.find(e => Math.hypot(p.x - e.x, p.y - e.y) < EXTRACT_R);
    if (!ex || G.assault) { if (G.extractT > 0) log('탈출이 취소되었다.', '#aaa'); G.extractT = 0; return; }
    if (G.extractT === 0) log(`탈출 중... ${EXTRACT_TIME}초 동안 머무르세요.`, '#7fe08a');
    G.extractT += dt;
    if (G.extractT >= EXTRACT_TIME) this.extract();
  },

  // 주운 것 확정 후 캠프로
  extract() {
    const p = G.player, r = p.raid;
    const items = this.allItems().filter(it => it.raid);
    for (const it of items) delete it.raid;
    p.raid = null;
    this.toCamp();
    UI.toast('탈출 성공', `장비 ${items.length}개 · ₵${fmt(r.credits)} 확보 · ${Math.floor(r.t / 60)}분 ${Math.floor(r.t % 60)}초`);
    log(`탈출 성공! 이번 출격: 장비 ${items.length}개, 크레딧 ${fmt(r.credits)} 확보.`, '#7fe08a');
    SFX.play('quest');
    Bounty.on('extract');
    saveGame();
  },

  // 사망: 이번 출격에서 주운 것을 잃음 (playerDie 에서 호출)
  onDeath() {
    const p = G.player, r = p.raid;
    if (!r) return '';
    let n = 0;
    for (const k of Object.keys(p.equip)) if (p.equip[k] && p.equip[k].raid) { p.equip[k] = null; n++; }
    const before = p.inventory.length;
    p.inventory = p.inventory.filter(it => !it.raid); n += before - p.inventory.length;
    if (!p.equip.w1) p.equip.w1 = makeWeapon('pistol', 1, 0); // 주무기가 비면 기본 권총
    if (!p.equip[p.active]) p.active = 'w1';
    const lost = Math.min(p.credits, r.credits);
    p.credits -= lost;
    p.raid = null;
    return `이번 출격에서 얻은 장비 ${n}개와 ₵${fmt(lost)}를 잃었다.`;
  },

  toCamp() {
    const p = G.player;
    World.generate('camp');
    this.resetWorld();
    Object.assign(p, World.campCenter());
    p.dead = false; p.hp = PlayerStats.maxHp(p); p.stam = 100;
    UI.refreshAll();
  },

  allItems() { const p = G.player; return [...p.inventory, ...Object.values(p.equip).filter(Boolean)]; },

  trackerLine() {
    const p = G.player;
    if (!p.raid) return '';
    const n = this.allItems().filter(it => it.raid).length, ex = G.extractT > 0 ? ` · <b style="color:#7fe08a">탈출 ${Math.ceil(EXTRACT_TIME - G.extractT)}초</b>` : '';
    return `<br><span class="muted">📦 미확정 장비 ${n} · ₵${fmt(p.raid.credits)} — 탈출 지점 ◎${ex}</span>`;
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
        if (it) { c.innerHTML = UI.itemCell(it); c.title = itemName(it); c.onclick = () => onClick(it); }
        el.appendChild(c);
      }
    };
    $('stash-bag-n').textContent = `${p.inventory.length} / 24`; $('stash-n').textContent = `${p.stash.length} / ${STASH_SIZE}`;
    grid($('stash-bag'), p.inventory, 24, it => { if (p.stash.length >= STASH_SIZE) return log('창고가 가득 찼습니다.', '#f88'); removeItem(it); p.stash.push(it); this.after(); });
    grid($('stash-grid'), p.stash, STASH_SIZE, it => { if (p.inventory.length >= 24) return log('가방이 가득 찼습니다.', '#f88'); p.stash.splice(p.stash.indexOf(it), 1); p.inventory.push(it); this.after(); });
  },
  after() { this.render(); UI.refreshInventory(); saveGame(); SFX.play('ui'); },
};
