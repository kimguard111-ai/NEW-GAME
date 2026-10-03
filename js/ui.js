// DOM 기반 UI (HUD, 패널, 상점, 대화)
const $ = id => document.getElementById(id);

const UI = {
  selected: null, hudT: 0, shopOpen: false,

  init() {
    document.querySelectorAll('.panel .close').forEach(el => {
      el.onclick = () => UI.close(el.closest('.panel').id.replace('panel-', ''));
    });
    document.querySelectorAll('#menu-buttons button').forEach(b => { b.onclick = () => UI.toggle(b.dataset.panel); });
    document.querySelectorAll('.equip-slot').forEach(el => { el.onclick = () => UI.selectEquip(el.dataset.slot); });
  },

  isOpen(name) { return !$('panel-' + name).classList.contains('hidden'); },
  open(name) {
    $('panel-' + name).classList.remove('hidden');
    if (name === 'inventory') UI.refreshInventory();
    if (name === 'stats') UI.refreshStats();
    if (name === 'quest') UI.refreshQuest();
  },
  close(name) {
    $('panel-' + name).classList.add('hidden');
    if (name === 'shop') { UI.shopOpen = false; UI.refreshInventory(); }
  },
  toggle(name) { UI.isOpen(name) ? UI.close(name) : UI.open(name); },
  closeAll() { ['inventory', 'stats', 'quest', 'shop', 'dialog'].forEach(n => UI.close(n)); },
  refreshAll() { UI.refreshInventory(); UI.refreshStats(); UI.refreshQuest(); },

  log(msg, color) {
    const el = document.createElement('div');
    el.textContent = msg; el.style.color = color;
    const box = $('log');
    box.appendChild(el);
    while (box.children.length > 8) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity 1s'; el.style.opacity = '0'; }, 9000);
    setTimeout(() => el.remove(), 10000);
  },

  // ---------------- HUD ----------------
  buildHotbar() {
    const p = G.player, hb = $('hotbar');
    hb.innerHTML = '';
    SKILLS.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'hot' + (p.level < s.lvl ? ' locked' : '');
      d.title = `${s.name} (Lv${s.lvl}) - ${s.desc}`;
      d.innerHTML = `<span class="key">${i + 1}</span><div class="icon">${s.icon}</div>${s.name}<div class="cd" id="cd${i}"></div>`;
      hb.appendChild(d);
    });
    const m = document.createElement('div');
    m.className = 'hot'; m.title = '구급상자 사용';
    m.innerHTML = `<span class="key">5</span><div class="icon">💊</div>구급상자<span class="cnt" id="medcnt"></span>`;
    hb.appendChild(m);
  },

  updateHUD(dt) {
    UI.hudT -= dt;
    UI.drawMinimap();
    if (UI.hudT > 0) return;
    UI.hudT = 0.08;
    const p = G.player, mh = PlayerStats.maxHp(p), next = PlayerStats.expNext(p.level);
    $('hud-name').textContent = `Lv${p.level} ${p.name}`;
    $('hp-fill').style.width = clamp(100 * p.hp / mh, 0, 100) + '%';
    $('hp-text').textContent = `${Math.ceil(Math.max(0, p.hp))} / ${mh}`;
    $('exp-fill').style.width = (100 * p.exp / next) + '%';
    $('exp-text').textContent = `EXP ${fmt(p.exp)} / ${fmt(next)} (${(100 * p.exp / next).toFixed(1)}%)`;
    $('hud-credits').textContent = `₵ ${fmt(p.credits)} 크레딧   ·   예비 탄약 ${fmt(p.reserve)}` + (p.statPoints ? `   ·   ★ 포인트 ${p.statPoints}` : '');
    const buffs = [];
    if (p.buffs.rapid > 0) buffs.push(`⚡집중 사격 ${p.buffs.rapid.toFixed(1)}s`);
    if (p.buffs.adren > 0) buffs.push(`🔥아드레날린 ${p.buffs.adren.toFixed(1)}s`);
    if (World.inSafe(p.x, p.y)) buffs.push('🛡 안전 지대 (체력 회복)');
    $('hud-buffs').textContent = buffs.join('  ');
    const z = ZONES[G.zone];
    $('hud-zone').textContent = G.zone === 0 ? z.name : `${z.name}  ·  Lv${z.lvl[0]}~${z.lvl[1]}`;

    const w = curWeapon();
    if (w) {
      const b = WEAPONS[w.key];
      $('weapon-name').innerHTML = `<span style="color:${RARITIES[w.rarity].color}">${w.icon} ${w.name}</span> <span class="muted">[Q]</span>`;
      $('weapon-ammo').textContent = b.melee ? '근접 무기' : p.reloadT > 0 ? '재장전 중...' : `${w.loaded} / ${b.mag}`;
    } else { $('weapon-name').textContent = '맨손'; $('weapon-ammo').textContent = '-'; }

    SKILLS.forEach((s, i) => {
      const el = $('cd' + i);
      if (el) el.style.height = (100 * p.skillCd[i] / s.cd) + '%';
    });
    const med = p.inventory.find(i => i && i.key === 'medkit');
    if ($('medcnt')) $('medcnt').textContent = med ? med.count : 0;

    // 보스 바
    const boss = G.boss;
    if (boss && boss.hp > 0 && dist(boss, p) < 900) {
      $('boss-bar').classList.remove('hidden');
      $('boss-name').textContent = `Lv${boss.level} ${boss.def.name}  ${fmt(boss.hp)} / ${fmt(boss.maxHp)}`;
      $('boss-fill').style.width = (100 * boss.hp / boss.maxHp) + '%';
    } else $('boss-bar').classList.add('hidden');

    const npc = !p.dead && nearestNpc();
    if (npc) { $('interact-hint').classList.remove('hidden'); $('interact-hint').textContent = `[E] ${npc.name}와(과) 대화`; }
    else $('interact-hint').classList.add('hidden');

    // 임무 추적
    const q = QUESTS[p.quest.idx];
    let qt = '';
    if (q && p.quest.active) {
      qt = `<b>${q.title}</b><br>${ENEMIES[q.target].name} 처치 ${p.quest.progress} / ${q.count}`;
      if (p.quest.progress >= q.count) qt += '<br><span style="color:#8cf">완료! 한씨에게 보고</span>';
    } else if (q && p.level >= q.minLevel) qt = '<b>새 임무</b><br>캠프의 한씨에게 말을 거세요';
    $('quest-tracker').innerHTML = qt;
  },

  drawMinimap() {
    const mm = $('minimap'), g = mm.getContext('2d'), p = G.player;
    const span = 80, sx = p.x / TILE - span / 2, sy = p.y / TILE - span / 2, k = mm.width / span;
    g.fillStyle = '#000'; g.fillRect(0, 0, mm.width, mm.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(World.minimapBase, sx, sy, span, span, 0, 0, mm.width, mm.height);
    const dot = (x, y, c, r) => { g.fillStyle = c; g.fillRect((x / TILE - sx) * k - r / 2, (y / TILE - sy) * k - r / 2, r, r); };
    for (const n of G.npcs) dot(n.x, n.y, '#ffd76a', 4);
    for (const e of G.enemies) dot(e.x, e.y, e.def.boss ? '#d4f' : '#f44', e.def.boss ? 8 : 3);
    // 보스 위치 표시
    dot(World.bossTile.x * TILE, World.bossTile.y * TILE, 'rgba(80,255,90,0.8)', 6);
    dot(p.x, p.y, '#fff', 5);
  },

  // ---------------- 인벤토리 ----------------
  itemCell(it) {
    const r = it.rarity || 0;
    return `<span class="icon">${it.icon}</span><span class="r${r}">${it.name}</span>` + (it.count > 1 ? `<span class="cnt">${it.count}</span>` : '');
  },

  refreshInventory() {
    if (!G.player) return;
    const p = G.player;
    document.querySelectorAll('.equip-slot').forEach(el => {
      const it = p.equip[el.dataset.slot];
      el.classList.toggle('active', el.dataset.slot === p.active);
      el.className = el.className.replace(/ ?bc\d/g, '') + (it ? ' bc' + it.rarity : '');
      el.querySelector('div').innerHTML = it ? `${it.icon} <span class="r${it.rarity}">${it.name}</span>` : '<span class="muted">비어 있음</span>';
    });
    const grid = $('inv-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const it = p.inventory[i];
      const c = document.createElement('div');
      c.className = 'inv-cell' + (it ? ' bc' + (it.rarity || 0) : '') + (it && UI.selected === it ? ' sel' : '');
      if (it) { c.innerHTML = UI.itemCell(it); c.onclick = () => { UI.selected = it; UI.refreshInventory(); }; }
      grid.appendChild(c);
    }
    if (UI.selected && !p.inventory.includes(UI.selected) && !Object.values(p.equip).includes(UI.selected)) UI.selected = null;
    UI.renderDetail();
  },

  selectEquip(slot) {
    const it = G.player.equip[slot];
    if (it) { UI.selected = it; UI.refreshInventory(); }
  },

  renderDetail() {
    const box = $('item-detail'), it = UI.selected, p = G.player;
    if (!it) { box.innerHTML = '<span class="muted">아이템을 선택하세요.</span>'; return; }
    const equippedSlot = Object.keys(p.equip).find(k => p.equip[k] === it);
    const sellPrice = Math.max(1, Math.floor((it.value || 0) * 0.3)) * (it.count || 1);
    let cmp = '';
    if (it.kind === 'weapon' && !equippedSlot && p.equip[p.active]) {
      const cur = p.equip[p.active];
      const diff = it.dmg * (WEAPONS[it.key].pellets || 1) / WEAPONS[it.key].rate - cur.dmg * (WEAPONS[cur.key].pellets || 1) / WEAPONS[cur.key].rate;
      cmp = `<br><span class="muted">초당 피해 비교(현재 무기): </span><span style="color:${diff >= 0 ? '#6f6' : '#f66'}">${diff >= 0 ? '+' : ''}${diff.toFixed(1)}</span>`;
    }
    box.innerHTML = `<b class="r${it.rarity || 0}">${it.icon} ${it.name}</b> ${it.ilvl ? `<span class="muted">(아이템 Lv${it.ilvl})</span>` : ''}<br>${itemDesc(it)}${cmp}<div class="btns"></div>`;
    const btns = box.querySelector('.btns');
    const add = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; btns.appendChild(b); };
    if (equippedSlot) {
      add('장착 해제', () => UI.unequip(equippedSlot));
      return;
    }
    if (it.kind === 'weapon') { add('주무기로 장착', () => UI.equip(it, 'w1')); add('보조무기로 장착', () => UI.equip(it, 'w2')); }
    if (it.kind === 'armor') add('장착', () => UI.equip(it, 'armor'));
    if (it.kind === 'cons') add('사용', () => useItem(it));
    if (UI.shopOpen) add(`판매 (${fmt(sellPrice)}₵)`, () => UI.sell(it, sellPrice));
    add('버리기', () => { if (confirm(`${it.name}을(를) 버릴까요?`)) { removeItem(it); UI.selected = null; UI.refreshInventory(); } });
  },

  equip(it, slot) {
    const p = G.player;
    if (p.level < itemReqLevel(it)) { log(`레벨이 부족합니다. (요구 Lv${itemReqLevel(it)})`, '#f88'); return; }
    const idx = p.inventory.indexOf(it);
    const old = p.equip[slot];
    p.equip[slot] = it;
    if (old) p.inventory[idx] = old; else p.inventory.splice(idx, 1);
    if (p.active === slot) p.reloadT = 0;
    log(`장착: ${it.name}`, RARITIES[it.rarity].color);
    UI.selected = it;
    UI.refreshInventory(); UI.refreshStats();
    saveGame();
  },

  unequip(slot) {
    const p = G.player;
    if (p.inventory.length >= 24) { log('인벤토리가 가득 찼습니다.', '#f88'); return; }
    p.inventory.push(p.equip[slot]);
    p.equip[slot] = null;
    if (slot === p.active) { const o = slot === 'w1' ? 'w2' : 'w1'; if (p.equip[o]) p.active = o; }
    UI.refreshInventory(); UI.refreshStats();
  },

  sell(it, price) {
    removeItem(it);
    G.player.credits += price;
    log(`${it.name} 판매: +${fmt(price)}₵`, '#ffd76a');
    UI.selected = null;
    UI.refreshInventory();
    saveGame();
  },

  // ---------------- 능력치 ----------------
  refreshStats() {
    if (!G.player) return;
    const p = G.player;
    const names = { str: ['근력', '근접 피해 +5%'], dex: ['사격', '총기 피해 +3.5%'], vit: ['체력', '최대 체력 +14'], agi: ['민첩', '치명타·이동·공속 증가'] };
    let h = `<div class="stat-row"><span>남은 포인트</span><b style="color:#ffd76a">${p.statPoints}</b></div><hr style="border-color:#333">`;
    for (const k of Object.keys(names)) {
      h += `<div class="stat-row"><span>${names[k][0]} <span class="muted">${names[k][1]}</span></span><span><b>${p.stats[k]}</b> <button data-stat="${k}" ${p.statPoints ? '' : 'disabled'}>+</button></span></div>`;
    }
    h += `<hr style="border-color:#333">
      <div class="stat-row"><span>최대 체력</span><span>${PlayerStats.maxHp(p)}</span></div>
      <div class="stat-row"><span>방어력</span><span>${PlayerStats.def(p)} (피해 -${(PlayerStats.dmgReduce(p) * 100).toFixed(0)}%)</span></div>
      <div class="stat-row"><span>총기 피해 배율</span><span>x${PlayerStats.gunMul(p).toFixed(2)}</span></div>
      <div class="stat-row"><span>근접 피해 배율</span><span>x${PlayerStats.meleeMul(p).toFixed(2)}</span></div>
      <div class="stat-row"><span>치명타 확률</span><span>${(PlayerStats.crit(p) * 100).toFixed(1)}%</span></div>
      <div class="stat-row"><span>이동 속도</span><span>${PlayerStats.speed(p).toFixed(0)}</span></div>
      <div class="stat-row"><span>처치 수</span><span>${fmt(p.totalKills)} (보스 ${p.bossKills})</span></div>`;
    $('stats-body').innerHTML = h;
    $('stats-body').querySelectorAll('button[data-stat]').forEach(b => {
      b.onclick = () => {
        if (p.statPoints <= 0) return;
        const before = PlayerStats.maxHp(p);
        p.stats[b.dataset.stat]++; p.statPoints--;
        p.hp += PlayerStats.maxHp(p) - before;
        UI.refreshStats();
      };
    });
  },

  // ---------------- 임무 ----------------
  refreshQuest() {
    if (!G.player) return;
    const p = G.player, q = QUESTS[p.quest.idx];
    let h = '';
    if (!q) h = '모든 임무를 완료했습니다. 당신은 서울의 영웅입니다!<br><span class="muted">타이탄은 4분마다 부활합니다.</span>';
    else if (p.quest.active) {
      h = `<b style="color:#e0b23a">${q.title}</b><br>${q.text}<br><br>목표: ${ENEMIES[q.target].name} 처치 <b>${p.quest.progress} / ${q.count}</b>`;
      h += `<br><span class="muted">보상: EXP ${fmt(q.reward.exp)}, ${fmt(q.reward.credits)}₵${q.reward.gear ? ', 장비' : ''}</span>`;
    } else {
      h = `진행 중인 임무가 없습니다.<br><span class="muted">다음 임무: ${q.title} (Lv${q.minLevel} 이상) — 캠프의 생존자 대장 한씨에게 받으세요.</span>`;
    }
    h += `<hr style="border-color:#333"><span class="muted">진행도: ${Math.min(p.quest.idx, QUESTS.length)} / ${QUESTS.length} 임무 완료</span>`;
    $('quest-body').innerHTML = h;
  },

  // ---------------- NPC ----------------
  dialog(name, text, buttons) {
    $('dialog-name').textContent = name;
    $('dialog-text').innerHTML = text;
    const box = $('dialog-buttons');
    box.innerHTML = '';
    for (const [label, fn] of buttons) {
      const b = document.createElement('button'); b.textContent = label; b.onclick = fn; box.appendChild(b);
    }
    UI.open('dialog');
  },

  openNpc(npc) {
    const p = G.player, bye = ['닫기', () => UI.close('dialog')];
    if (npc.id === 'merchant') {
      UI.dialog(npc.name, '"총알이든 약이든, 크레딧만 있으면 다 구해다 주지. 쓸만한 물건 있으면 사 주겠네."', [
        ['거래하기', () => { UI.close('dialog'); UI.openShop(); }], bye]);
    } else if (npc.id === 'medic') {
      const mh = PlayerStats.maxHp(p);
      UI.dialog(npc.name, p.hp < mh ? '"많이 다쳤군. 이리 와, 치료해 줄게."' : '"멀쩡해 보이네. 몸 조심하고."', [
        ['치료받기 (무료)', () => { p.hp = mh; log('의무병이 상처를 치료해 주었다.', '#6f6'); UI.close('dialog'); }], bye]);
    } else if (npc.id === 'captain') UI.captainDialog(npc);
  },

  captainDialog(npc) {
    const p = G.player, q = QUESTS[p.quest.idx], bye = ['닫기', () => UI.close('dialog')];
    if (!q) {
      UI.dialog(npc.name, '"자네 덕분에 서울에 다시 사람이 살 수 있게 됐어. 고맙네, 영웅."', [bye]);
    } else if (p.quest.active) {
      if (p.quest.progress >= q.count) {
        UI.dialog(npc.name, `"훌륭해! '${q.title}' 임무를 완수했군. 약속한 보상이네."`, [['보상 받기', () => UI.completeQuest()]]);
      } else {
        UI.dialog(npc.name, `"${q.text}"<br><br><span class="muted">진행: ${ENEMIES[q.target].name} ${p.quest.progress} / ${q.count}</span>`, [bye]);
      }
    } else if (p.level < q.minLevel) {
      UI.dialog(npc.name, `"아직은 자네에게 맡길 일이 없어. 좀 더 강해져서 오게."<br><span class="muted">다음 임무 요구 레벨: Lv${q.minLevel}</span>`, [bye]);
    } else {
      UI.dialog(npc.name, `<b style="color:#e0b23a">[${q.title}]</b><br>"${q.text}"<br><br><span class="muted">보상: EXP ${fmt(q.reward.exp)}, ${fmt(q.reward.credits)}₵${q.reward.gear ? ', 장비 아이템' : ''}</span>`, [
        ['수락', () => { p.quest.active = true; p.quest.progress = 0; log(`임무 수락: ${q.title}`, '#8cf'); UI.close('dialog'); UI.refreshQuest(); saveGame(); }],
        ['거절', () => UI.close('dialog')]]);
    }
  },

  completeQuest() {
    const p = G.player, q = QUESTS[p.quest.idx], r = q.reward;
    p.credits += r.credits;
    log(`임무 완료 보상: EXP ${fmt(r.exp)}, ${fmt(r.credits)}₵`, '#8cf');
    if (r.items) for (const [k, n] of r.items) addItem(makeConsumable(k, n));
    if (r.gear) {
      const it = randomGear(Math.max(p.level, q.minLevel), r.gear);
      if (!addItem(it)) G.drops.push({ x: p.x, y: p.y + 20, kind: 'item', item: it, t: 0 });
      log(`보상 장비: ${it.name}`, RARITIES[it.rarity].color);
    }
    p.quest.idx++; p.quest.active = false; p.quest.progress = 0;
    gainExp(r.exp);
    UI.close('dialog'); UI.refreshQuest(); saveGame();
  },

  // ---------------- 상점 ----------------
  openShop() {
    const p = G.player;
    if (G.shopLevel !== p.level || !G.shopStock) {
      G.shopLevel = p.level;
      const stock = [];
      const rr = p.level >= 12 ? 2 : p.level >= 6 ? 1 : 0;
      for (const k of Object.keys(WEAPONS)) if (WEAPONS[k].lvl <= p.level + 2) stock.push(makeWeapon(k, p.level, rr));
      for (const k of Object.keys(ARMORS)) if (ARMORS[k].lvl <= p.level + 2) stock.push(makeArmor(k, p.level, rr));
      G.shopStock = stock;
    }
    UI.shopOpen = true;
    UI.renderShop();
    UI.open('shop'); UI.open('inventory');
  },

  renderShop() {
    const list = $('shop-list'), p = G.player;
    list.innerHTML = '';
    const row = (html, price, fn) => {
      const d = document.createElement('div');
      d.className = 'shop-item';
      d.innerHTML = `<span>${html}</span><span class="price">${fmt(price)}₵</span>`;
      d.onclick = fn;
      list.appendChild(d);
    };
    for (const k of Object.keys(CONSUMABLES)) {
      const c = CONSUMABLES[k];
      row(`${c.icon} ${c.name} <span class="muted">${c.desc}</span>`, c.price, () => UI.buy(makeConsumable(k, 1), c.price));
    }
    for (const it of G.shopStock) {
      const req = itemReqLevel(it);
      row(`${it.icon} <span class="r${it.rarity}">${it.name}</span><br><span class="muted">${itemDesc(it)}</span>` + (req > p.level ? ` <span style="color:#f66">(Lv${req} 필요)</span>` : ''),
        it.value, () => {
          const copy = it.kind === 'weapon' ? makeWeapon(it.key, it.ilvl, it.rarity) : makeArmor(it.key, it.ilvl, it.rarity);
          UI.buy(copy, it.value);
        });
    }
  },

  buy(it, price) {
    const p = G.player;
    if (p.credits < price) { log('크레딧이 부족합니다.', '#f88'); return; }
    if (!addItem(it)) { log('인벤토리가 가득 찼습니다.', '#f88'); return; }
    p.credits -= price;
    log(`구매: ${it.name} (-${fmt(price)}₵)`, '#ffd76a');
    saveGame();
  },
};
