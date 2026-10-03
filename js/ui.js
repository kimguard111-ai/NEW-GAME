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
  closeAll() { ['inventory', 'stats', 'quest', 'shop', 'dialog', 'enhance'].forEach(n => UI.close(n)); },
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
      d.title = `${s.name} (Lv${s.lvl}) - ${skillDesc(s, p)}\n연동 능력치: ${STAT_NAMES[s.stat]} (올릴수록 강해짐)`;
      d.innerHTML = `<span class="key">${i + 1}</span><div class="icon">${s.icon}</div>${s.name}<span class="sk-stat">${STAT_NAMES[s.stat]}</span><div class="cd" id="cd${i}"></div>`;
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
    $('hud-zone').innerHTML = G.zone === 0 ? z.name : `${z.name}  ·  Lv${z.lvl[0]}~${z.lvl[1]}<div class="zone-sub">${z.desc} · 특산 ${z.gearText}</div>`
      + (p.inRad ? '<div class="zone-rad">☢ 방사능 피폭 중! 웅덩이에서 벗어나세요</div>' : '');

    const w = curWeapon();
    if (w) {
      const b = WEAPONS[w.key];
      $('weapon-name').innerHTML = `<span style="color:${RARITIES[w.rarity].color}">${w.icon} ${itemName(w)}</span> <span class="muted">[Q]</span>`;
      $('weapon-ammo').textContent = b.melee ? '근접 무기' : p.reloadT > 0 ? '재장전 중...' : `${w.loaded} / ${magSize(w)}${b.infinite ? '  ∞' : ''}`;
      $('weapon-role').textContent = `${b.role} · DPS ${Math.round(weaponDps(p, w))}`;
    } else { $('weapon-name').textContent = '맨손'; $('weapon-ammo').textContent = '-'; $('weapon-role').textContent = ''; }

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

  drawMinimap() { drawMinimapIso($('minimap')); },

  // ---------------- 인벤토리 ----------------
  itemCell(it) {
    const r = it.rarity || 0, p = G.player;
    let mark = '';
    if (it.kind !== 'cons') {
      if (p.level < itemReqLevel(it)) mark = '<span class="mark lvl">Lv' + itemReqLevel(it) + '</span>';
      else if (isUpgrade(p, it)) mark = '<span class="mark up">▲</span>';
      if (it.isNew) mark += '<span class="mark new">N</span>';
    }
    return `${mark}<span class="icon">${it.icon}</span><span class="r${r}">${itemName(it)}</span>` + (it.count > 1 ? `<span class="cnt">${it.count}</span>` : '');
  },

  refreshInventory() {
    if (!G.player) return;
    const p = G.player;
    document.querySelectorAll('.equip-slot').forEach(el => {
      const it = p.equip[el.dataset.slot];
      el.classList.toggle('active', el.dataset.slot === p.active);
      el.className = el.className.replace(/ ?bc\d/g, '') + (it ? ' bc' + it.rarity : '');
      el.querySelector('div').innerHTML = it ? `${it.icon} <span class="r${it.rarity}">${itemName(it)}</span>` + (it.affixes && it.affixes.length ? `<br><span class="affix">◆ 옵션 ${it.affixes.length}개${it.legend ? ' ★' : ''}</span>` : '') : '<span class="muted">비어 있음</span>';
    });
    const grid = $('inv-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const it = p.inventory[i];
      const c = document.createElement('div');
      c.className = 'inv-cell' + (it ? ' bc' + (it.rarity || 0) : '') + (it && UI.selected === it ? ' sel' : '');
      if (it) { c.innerHTML = UI.itemCell(it); c.onclick = () => { UI.selected = it; it.isNew = false; UI.refreshInventory(); }; }
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
    if (!it) { box.innerHTML = '<span class="muted">아이템을 선택하세요. ▲ = 지금 장비보다 좋음</span>'; return; }
    const equippedSlot = Object.keys(p.equip).find(k => p.equip[k] === it);
    const sellPrice = itemSellPrice(it);
    const diffSpan = (a, b, unit = '') => {
      const d = b - a, pct = a > 0 ? ` (${d >= 0 ? '+' : ''}${Math.round(d / a * 100)}%)` : '';
      return `<span style="color:${d >= 0 ? '#6f6' : '#f66'}">${d >= 0 ? '+' : ''}${Math.round(d)}${unit}${pct}</span>`;
    };
    let cmp = '';
    if (it.kind === 'weapon') {
      const dps = weaponDps(p, it);
      cmp = `<div class="cmp">초당 피해(DPS) <b>${Math.round(dps)}</b>`;
      if (!equippedSlot) {
        for (const sl of ['w1', 'w2']) {
          const cur = p.equip[sl];
          if (cur) cmp += `<br><span class="muted">vs ${sl === 'w1' ? '주무기' : '보조무기'} ${itemName(cur)} (${Math.round(weaponDps(p, cur))}):</span> ${diffSpan(weaponDps(p, cur), dps)}`;
        }
      }
      cmp += '</div>';
    } else if ((it.kind === 'armor' || it.kind === 'helmet') && !equippedSlot) {
      const cur = p.equip[it.kind];
      cmp = `<div class="cmp">방어력 ${cur ? diffSpan(armorDef(cur), armorDef(it)) : '+' + armorDef(it)} · 버티는 체력 ${diffSpan(armorEhp(p), armorEhp(p, it))}`;
      if (cur && cur.affixes.length) cmp += `<br><span class="muted">장착 중 옵션: ${cur.affixes.map(affixText).join(', ')}</span>`;
      cmp += '</div>';
    }
    const req = itemReqLevel(it);
    box.innerHTML = `<b class="r${it.rarity || 0}">${it.icon} ${itemName(it)}</b> ${it.ilvl ? `<span class="muted">(아이템 Lv${it.ilvl})</span>` : ''}`
      + (req > p.level ? ` <span style="color:#f66">요구 Lv${req}</span>` : '') + `<br>${itemHtml(it)}${cmp}<div class="btns"></div>`;
    const btns = box.querySelector('.btns');
    const add = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; btns.appendChild(b); };
    if (equippedSlot) {
      add('장착 해제', () => UI.unequip(equippedSlot));
      return;
    }
    if (it.kind === 'weapon') { add('주무기로 장착', () => UI.equip(it, 'w1')); add('보조무기로 장착', () => UI.equip(it, 'w2')); }
    if (it.kind === 'armor') add('장착', () => UI.equip(it, 'armor'));
    if (it.kind === 'helmet') add('장착', () => UI.equip(it, 'helmet'));
    if (it.kind === 'cons') add('사용', () => useItem(it));
    if (UI.shopOpen) add(`판매 (${fmt(sellPrice)}₵)`, () => UI.sell(it, sellPrice));
    add('버리기', () => { if (confirm(`${itemName(it)}을(를) 버릴까요?`)) { removeItem(it); UI.selected = null; UI.refreshInventory(); } });
  },

  equip(it, slot) {
    const p = G.player;
    if (p.level < itemReqLevel(it)) { log(`레벨이 부족합니다. (요구 Lv${itemReqLevel(it)})`, '#f88'); return; }
    const idx = p.inventory.indexOf(it);
    const old = p.equip[slot];
    p.equip[slot] = it;
    if (old) p.inventory[idx] = old; else p.inventory.splice(idx, 1);
    if (p.active === slot) p.reloadT = 0;
    it.isNew = false;
    if (it.kind === 'weapon' && !WEAPONS[it.key].melee) it.loaded = Math.min(it.loaded, magSize(it));
    p.hp = Math.min(p.hp, PlayerStats.maxHp(p));
    log(`장착: ${itemName(it)}`, RARITIES[it.rarity].color);
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
    p.hp = Math.min(p.hp, PlayerStats.maxHp(p));
    UI.refreshInventory(); UI.refreshStats();
    saveGame();
  },

  sell(it, price) {
    removeItem(it);
    G.player.credits += price;
    log(`${itemName(it)} 판매: +${fmt(price)}₵`, '#ffd76a');
    UI.selected = null;
    UI.refreshInventory();
    saveGame();
  },

  // ---------------- 능력치 ----------------
  refreshStats() {
    if (!G.player) return;
    const p = G.player, st = p.stats, up = k => Math.max(0, st[k] - 5);
    const pc = v => Math.round(v * 100) + '%';
    const rows = {
      str: ['근력', '근접형', `근접 피해 +${pc(up('str') * 0.06)} · 방어력 +${up('str')}`, '포인트당 근접 피해 +6%, 방어력 +1'],
      dex: ['사격', '총잡이', `총기 피해 +${pc(up('dex') * 0.04)} · 재장전 +${pc(up('dex') * 0.015)}`, '포인트당 총기 피해 +4%, 재장전 +1.5%'],
      vit: ['체력', '생존형', `최대 체력 +${up('vit') * 15} · 재생 +${(up('vit') * 0.25).toFixed(1)}/초`, '포인트당 최대 체력 +15, 재생 +0.25/초'],
      agi: ['민첩', '기동형', `이동·공속 +${pc(PlayerStats.agiMul(p))} · 치명타 +${(up('agi') * 0.8).toFixed(1)}%`, '포인트당 이동·공격속도 +0.8%, 치명타 +0.8% (속도 최대 30%)'],
    };
    let h = `<div class="stat-row"><span>남은 포인트</span><b style="color:#ffd76a">${p.statPoints}</b></div><hr style="border-color:#333">`;
    for (const k of Object.keys(rows)) {
      const [n, role, eff, tip] = rows[k];
      h += `<div class="stat-row" title="${tip}"><span>${n} <span class="tag">${role}</span></span><span><b>${st[k]}</b> <button data-stat="${k}" ${p.statPoints ? '' : 'disabled'}>+</button></span></div>
        <div class="stat-eff">${eff}${(() => { const sk = SKILLS.find(s => s.stat === k); return sk ? ` · <span class="sk-link">${sk.icon} ${sk.name} 강화</span>` : ''; })()}</div>`;
    }
    const wline = sl => { const w = p.equip[sl]; return w ? `<div class="stat-row"><span>${sl === 'w1' ? '주무기' : '보조무기'} DPS <span class="muted">${itemName(w)}</span></span><b>${Math.round(weaponDps(p, w))}</b></div>` : ''; };
    h += '<hr style="border-color:#333"><div class="muted">스킬 (연동 능력치를 올리면 강해짐)</div>';
    for (const s of SKILLS) {
      const locked = p.level < s.lvl;
      h += `<div class="skill-row${locked ? ' locked' : ''}">${s.icon} <b>${s.name}</b> <span class="tag">${STAT_NAMES[s.stat]}</span>${locked ? ` <span class="muted">Lv${s.lvl} 습득</span>` : ''}<br><span class="stat-eff">${skillDesc(s, p)}</span></div>`;
    }
    h += `<hr style="border-color:#333">${wline('w1')}${wline('w2')}
      <div class="stat-row"><span>최대 체력</span><span>${PlayerStats.maxHp(p)}</span></div>
      <div class="stat-row"><span>방어력</span><span>${PlayerStats.def(p)} (피해 -${(PlayerStats.dmgReduce(p) * 100).toFixed(0)}%)</span></div>
      <div class="stat-row"><span>치명타 확률 / 피해</span><span>${(PlayerStats.crit(p) * 100).toFixed(1)}% / x${PlayerStats.critMul(p, curWeapon()).toFixed(2)}</span></div>
      <div class="stat-row"><span>이동 속도</span><span>${PlayerStats.speed(p).toFixed(0)}</span></div>
      <div class="stat-row"><span>체력 재생</span><span>${PlayerStats.regen(p).toFixed(1)}/초</span></div>
      ${gearBonus(p, 'exp') ? `<div class="stat-row"><span>경험치 획득</span><span>+${pc(gearBonus(p, 'exp'))}</span></div>` : ''}
      <div class="stat-row" title="몬스터 장비 드랍이 ${PITY_DROPS}번 연속 영웅 미만이면 다음은 영웅 이상 확정"><span>영웅 장비 확정까지</span><span class="r3">${Math.max(0, PITY_DROPS - (p.pity || 0))}개</span></div>
      <div class="stat-row"><span>처치 수</span><span>${fmt(p.totalKills)} (보스 ${p.bossKills})</span></div>
      <div class="muted" style="margin-top:6px">능력치 초기화: 캠프의 의무병 이씨 (${respecCost(p) ? fmt(respecCost(p)) + '₵' : '첫 1회 무료'})</div>`;
    $('stats-body').innerHTML = h;
    $('stats-body').querySelectorAll('button[data-stat]').forEach(b => {
      b.onclick = () => {
        if (p.statPoints <= 0) return;
        const before = PlayerStats.maxHp(p);
        p.stats[b.dataset.stat]++; p.statPoints--;
        p.hp += PlayerStats.maxHp(p) - before;
        UI.refreshStats(); UI.refreshInventory(); UI.buildHotbar();
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
      h += `<br><span class="muted">보상: EXP ${fmt(q.reward.exp)}, ${fmt(q.reward.credits)}₵${q.reward.equip ? ', ' + GEAR_DEFS(q.reward.equip).name : q.reward.gear ? ', 장비' : ''}</span>`;
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
      const cost = respecCost(p);
      UI.dialog(npc.name, (p.hp < mh ? '"많이 다쳤군. 이리 와, 치료해 줄게."' : '"멀쩡해 보이네. 몸 조심하고."')
        + '<br><span class="muted">신체 재조정: 모든 능력치를 5로 되돌리고 포인트를 돌려받습니다. ' + (cost ? `비용 ${fmt(cost)}₵` : '첫 1회 무료') + '</span>', [
        ['치료받기 (무료)', () => { p.hp = mh; log('의무병이 상처를 치료해 주었다.', '#6f6'); UI.close('dialog'); }],
        [`능력치 초기화 (${cost ? fmt(cost) + '₵' : '무료'})`, () => UI.respec()], bye]);
    } else if (npc.id === 'captain') UI.captainDialog(npc);
    else if (npc.id === 'mechanic') {
      UI.dialog(npc.name, '"총이든 조끼든 가져와. 손보면 훨씬 쓸만해지지. 다만 +7부터는 실패하면 한 단계 떨어질 수도 있어."', [
        ['장비 강화', () => { UI.close('dialog'); UI.openEnhance(); }], bye]);
    }
  },

  // ---------------- 강화 ----------------
  enhSel: null,
  openEnhance() {
    const p = G.player;
    if (!UI.enhSel || !UI.enhanceList().includes(UI.enhSel)) UI.enhSel = p.equip[p.active] || p.equip.w1;
    UI.renderEnhance();
    UI.open('enhance');
  },
  enhanceList() {
    const p = G.player;
    return [p.equip.w1, p.equip.w2, p.equip.armor, p.equip.helmet, ...p.inventory.filter(i => i.kind !== 'cons')].filter(Boolean);
  },
  renderEnhance() {
    const p = G.player, list = $('enh-list'), box = $('enh-detail');
    list.innerHTML = '';
    for (const it of UI.enhanceList()) {
      const slot = Object.keys(p.equip).find(k => p.equip[k] === it);
      const d = document.createElement('div');
      d.className = 'shop-item' + (it === UI.enhSel ? ' sel' : '');
      d.innerHTML = `<span>${it.icon} <span class="r${it.rarity}">${itemName(it)}</span>${slot ? ' <span class="tag">장착</span>' : ''}</span>`
        + `<span class="plus">${it.plus >= ENHANCE.max ? 'MAX' : '+' + it.plus}</span>`;
      d.onclick = () => { UI.enhSel = it; UI.renderEnhance(); };
      list.appendChild(d);
    }
    const it = UI.enhSel;
    if (!it) { box.innerHTML = '<span class="muted">강화할 장비를 선택하세요.</span>'; return; }
    let h = `<b class="r${it.rarity}">${it.icon} ${itemName(it)}</b><br>`;
    if (it.plus >= ENHANCE.max) { box.innerHTML = h + '<span class="plus">최대 강화 단계입니다.</span>'; return; }
    const next = Object.assign({}, it, { plus: it.plus + 1 });
    if (it.kind === 'weapon') {
      h += `피해 ${Math.round(it.dmg * plusMul(it) * 10) / 10} → <b class="up">${Math.round(it.dmg * plusMul(next) * 10) / 10}</b>`;
      h += `<br>DPS ${Math.round(weaponDps(p, it))} → <b class="up">${Math.round(weaponDps(p, next))}</b>`;
    } else h += `방어력 ${armorDef(it)} → <b class="up">${armorDef(next)}</b>`;
    const rate = enhanceRate(it), cost = enhanceCost(it);
    h += `<br>성공 확률 <b style="color:${rate >= 0.7 ? '#6f6' : rate >= 0.4 ? '#fc6' : '#f66'}">${Math.round(rate * 100)}%</b>`;
    if (it.fails) h += ` <span class="muted">(실패 보정 +${Math.round(it.fails * ENHANCE.failBonus * 100)}%)</span>`;
    h += `<br><span class="muted">실패 시: ${it.plus >= ENHANCE.dropFrom ? '<span style="color:#f88">강화 단계 -1</span>' : '단계 유지'} · 장비는 파괴되지 않음</span>`;
    box.innerHTML = h + `<div class="btns"><button id="btn-enhance" ${p.credits < cost ? 'disabled' : ''}>강화 (${fmt(cost)}₵)</button></div>`
      + (p.credits < cost ? '<span style="color:#f88;font-size:12px">크레딧이 부족합니다.</span>' : '');
    $('btn-enhance').onclick = () => UI.doEnhance(it);
  },
  doEnhance(it) {
    const p = G.player, cost = enhanceCost(it);
    if (p.credits < cost || it.plus >= ENHANCE.max) return;
    p.credits -= cost;
    if (Math.random() < enhanceRate(it)) {
      it.plus++; it.fails = 0;
      log(`강화 성공! ${itemName(it)}`, '#ffd76a');
      floatText(p.x, p.y - 40, `+${it.plus} 강화 성공!`, '#ffd76a', 20);
      G.effects.push({ type: 'ring', x: p.x, y: p.y, t: 0, life: 0.8, color: '#ffd76a', r: 70 + it.plus * 6 });
    } else {
      it.fails = (it.fails || 0) + 1;
      const down = it.plus >= ENHANCE.dropFrom;
      if (down) it.plus--;
      log(`강화 실패... ${down ? `단계 하락 → ${itemName(it)}` : '단계 유지'} (다음 확률 +${Math.round(ENHANCE.failBonus * 100)}%)`, '#f88');
      floatText(p.x, p.y - 40, down ? '실패! 단계 하락' : '실패', '#ff6060', 18);
      G.shake = Math.max(G.shake, 5);
    }
    UI.renderEnhance(); UI.refreshInventory(); UI.refreshStats();
    saveGame();
  },

  respec() {
    const p = G.player, cost = respecCost(p);
    const spent = Object.values(p.stats).reduce((a, v) => a + Math.max(0, v - 5), 0);
    if (!spent) { log('초기화할 능력치가 없습니다.', '#aaa'); return; }
    if (p.credits < cost) { log('크레딧이 부족합니다.', '#f88'); return; }
    if (!confirm(`능력치 ${spent}포인트를 모두 돌려받습니다.${cost ? ` 비용 ${fmt(cost)}₵` : ''} 진행할까요?`)) return;
    p.credits -= cost; p.respecs++;
    for (const k of Object.keys(p.stats)) p.stats[k] = Math.min(p.stats[k], 5);
    p.statPoints += spent;
    p.hp = Math.min(p.hp, PlayerStats.maxHp(p));
    log(`능력치 초기화 완료: 포인트 ${spent} 반환. 능력치 창(C)에서 다시 분배하세요.`, '#8cf');
    UI.close('dialog'); UI.open('stats'); UI.buildHotbar(); UI.refreshInventory(); saveGame();
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
      UI.dialog(npc.name, `<b style="color:#e0b23a">[${q.title}]</b><br>"${q.text}"<br><br><span class="muted">보상: EXP ${fmt(q.reward.exp)}, ${fmt(q.reward.credits)}₵${q.reward.equip ? ', ' + GEAR_DEFS(q.reward.equip).name : q.reward.gear ? ', 장비 아이템' : ''}</span>`, [
        ['수락', () => { p.quest.active = true; p.quest.progress = 0; log(`임무 수락: ${q.title}`, '#8cf'); UI.close('dialog'); UI.refreshQuest(); saveGame(); }],
        ['거절', () => UI.close('dialog')]]);
    }
  },

  completeQuest() {
    const p = G.player, q = QUESTS[p.quest.idx], r = q.reward;
    p.credits += r.credits;
    log(`임무 완료 보상: EXP ${fmt(r.exp)}, ${fmt(r.credits)}₵`, '#8cf');
    if (r.items) for (const [k, n] of r.items) addItem(makeConsumable(k, n));
    if (r.equip) { // 정해진 장비 보상 (첫 임무: 방탄 조끼)
      const it = makeGear(r.equip, Math.max(p.level, 1), 0);
      if (!addItem(it)) G.drops.push({ x: p.x, y: p.y + 20, kind: 'item', item: it, t: 0 });
      log(`보상 장비: ${it.name} — 인벤토리(I)에서 장착하세요`, '#8cf');
    }
    if (r.gear) {
      const it = randomGear(Math.max(p.level, q.minLevel), r.gear);
      if (!addItem(it)) G.drops.push({ x: p.x, y: p.y + 20, kind: 'item', item: it, t: 0 });
      log(`보상 장비: ${itemName(it)}`, RARITIES[it.rarity].color);
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
      for (const k of Object.keys(HELMETS)) if (HELMETS[k].lvl <= p.level + 2) stock.push(makeHelmet(k, p.level, rr));
      G.shopStock = stock;
    }
    UI.shopOpen = true;
    $('btn-sell-junk').onclick = () => UI.sellJunk();
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
      row(`${it.icon} <span class="r${it.rarity}">${itemName(it)}</span>` + (req > p.level ? ` <span style="color:#f66">(Lv${req} 필요)</span>` : '') + `<br>${itemHtml(it)}`,
        it.value, () => {
          // 진열품과 같은 옵션 그대로 구매
          const copy = JSON.parse(JSON.stringify(it));
          copy.id = nextItemId++; copy.isNew = true;
          UI.buy(copy, it.value);
        });
    }
  },

  // 일반·고급 장비 일괄 판매 (파밍 중 인벤토리 정리)
  sellJunk() {
    const p = G.player;
    const junk = p.inventory.filter(it => it.kind !== 'cons' && it.rarity <= 1 && !it.plus && !isUpgrade(p, it));
    if (!junk.length) { log('판매할 일반·고급 장비가 없습니다. (▲ 표시·강화된 장비는 제외)', '#aaa'); return; }
    let total = 0;
    for (const it of junk) { total += itemSellPrice(it); removeItem(it); }
    p.credits += total;
    log(`장비 ${junk.length}개 일괄 판매: +${fmt(total)}₵`, '#ffd76a');
    UI.selected = null; UI.refreshInventory(); saveGame();
  },

  buy(it, price) {
    const p = G.player;
    if (p.credits < price) { log('크레딧이 부족합니다.', '#f88'); return; }
    if (!addItem(it)) { log('인벤토리가 가득 찼습니다.', '#f88'); return; }
    p.credits -= price;
    log(`구매: ${itemName(it)} (-${fmt(price)}₵)`, '#ffd76a');
    saveGame();
  },
};
