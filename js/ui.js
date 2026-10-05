// DOM 기반 UI (HUD, 패널, 상점, 대화)
const $ = id => document.getElementById(id);

// 일시정지 · 엔딩 (v1.0)
const Pause = {
  toggle() {
    if (!G.running || G.player.dead) return;
    G.paused = !G.paused; input.down = false; input.keys = {};
    $('pause-screen').classList.toggle('hidden', !G.paused);
    if (G.paused) { UI.closeAll(); $('pause-stats').innerHTML = Pause.statsHtml(); saveGame(); }
  },
  statsHtml() {
    const p = G.player, m = Math.floor(p.playTime / 60);
    return `${p.name} · Lv${p.level} · 플레이 ${Math.floor(m / 60)}시간 ${m % 60}분 · 처치 ${fmt(p.totalKills)} · 사망 ${p.deaths} · 최고 콤보 ${p.bestCombo}`;
  },
  ending() {
    const p = G.player, best = Object.values(p.assaults).reduce((a, r) => Math.max(a, r.tier || 1), 0);
    G.paused = true; input.down = false;
    $('ending-stats').innerHTML = `<p>${Pause.statsHtml()}<br>필드 보스 ${p.fieldBossKills || 0} · 어설트 최고 위협 ${best || '-'} · 타이탄 처치 ${p.bossKills} · 키메라 처치 ${p.labKills || 0}</p>`;
    $('ending-screen').classList.remove('hidden');
    SFX.play('levelup');
  },
  init() {
    $('btn-resume').onclick = () => Pause.toggle();
    $('btn-pause').onclick = () => Pause.toggle();
    $('btn-save').onclick = () => { saveGame(false); $('pause-stats').innerHTML = Pause.statsHtml() + '<br>저장했습니다.'; };
    $('btn-pause-settings').onclick = () => { Pause.toggle(); UI.open('settings'); };
    $('btn-title').onclick = () => { saveGame(); location.reload(); };
    $('btn-summary-ok').onclick = () => $('raid-summary').classList.add('hidden');
    $('btn-ending-continue').onclick = () => { $('ending-screen').classList.add('hidden'); G.paused = false; };
  },
};

const UI = {
  selected: null, hudT: 0, shopOpen: false,

  init() {
    Pause.init();
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
    if (name === 'settings') UI.refreshSettings();
    if (name === 'skills') UI.renderSkills(); // v1.26
  },
  close(name) {
    $('panel-' + name).classList.add('hidden');
    if (name === 'shop') { UI.shopOpen = false; UI.refreshInventory(); }
  },
  toggle(name) { UI.isOpen(name) ? UI.close(name) : UI.open(name); },
  anyOpen() { return ['inventory', 'stats', 'skills', 'quest', 'shop', 'dialog', 'enhance', 'settings', 'stash'].some(n => UI.isOpen(n)); },
  closeAll() { ['inventory', 'stats', 'skills', 'quest', 'shop', 'dialog', 'enhance', 'settings', 'stash'].forEach(n => UI.close(n)); },
  refreshAll() { UI.refreshInventory(); UI.refreshStats(); UI.refreshQuest(); },

  // 내용이 바뀔 때만 innerHTML 교체 (아이콘 이미지 다시 읽기·깜빡임 방지)
  html(id, h) { const el = $(id); if (el._h !== h) { el._h = h; el.innerHTML = h; } },
  log(msg, color) {
    const el = document.createElement('div');
    el.innerHTML = msg; el.style.color = color; // v1.5.1 아이콘(<img>) 포함 가능
    const box = $('log');
    box.appendChild(el);
    while (box.children.length > 8) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity 1s'; el.style.opacity = '0'; }, 9000);
    setTimeout(() => el.remove(), 10000);
  },

  // ---------------- HUD ----------------
  buildHotbar() { // v1.24 벨트 칸 수만큼, 등록한 것만 (1~8 키) + 칸 등록 버튼 + 슬라이딩
    const p = G.player, hb = $('hotbar'), n = beltSlots(p);
    hb.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const act = p.hotbar[i], d = document.createElement('div'), key = `<span class="key">${i + 1}</span>`;
      d.dataset.slot = i; d.dataset.act = act || 'empty';
      if (act && act.startsWith('sk')) {
        const si = +act.slice(2), s = SKILLS[si];
        d.className = 'hot' + (p.skills[s.id] ? '' : ' locked');
        d.title = `${s.name} - ${skillDesc(s, p)}\n연동 능력치: ${STAT_NAMES[s.stat]} (올릴수록 강해짐)`;
        d.innerHTML = `${key}<div class="icon">${ICON(s.icon)}</div>${s.name}<span class="sk-stat">${STAT_NAMES[s.stat]}</span><div class="cd" id="cd${si}"></div>`;
      } else if (act === 'med') {
        d.className = 'hot'; d.title = '구급상자 사용';
        d.innerHTML = `${key}<div class="icon">${ICON('medkit')}</div>구급상자<span class="cnt" id="medcnt"></span>`;
      } else if (act === 'throw' || act === 'util') { // v1.14 투척물 · 보조
        const cyc = act === 'throw' ? 'T' : 'Y', k = Gadgets.sel(act), c = CONSUMABLES[k], cnt = Gadgets.count(k);
        d.className = 'hot gad' + (cnt ? '' : ' empty');
        d.title = `${c.name} — ${c.desc}\n${cyc}: 종류 바꾸기 (${GADGET_SLOTS[act].map(x => CONSUMABLES[x].name).join(' · ')})`;
        d.innerHTML = `${key}<div class="icon">${ICON(c.icon)}</div>${c.name}<span class="cnt" id="${act}cnt">${cnt}</span><span class="cyc" data-cyc="${act}">${IS_TOUCH ? '↻' : cyc}</span>`;
      } else { d.className = 'hot free'; d.title = '빈 칸 — 눌러서 스킬·구급상자·소모품 등록 (B)'; d.innerHTML = `${key}<div class="icon">＋</div>등록`; }
      hb.appendChild(d);
    }
    const ed = document.createElement('div'); // 칸 등록 (벨트)
    ed.className = 'hot edit'; ed.dataset.act = 'edit'; ed.title = `벨트 「${p.equip.belt ? p.equip.belt.name : '맨몸'}」 ${n}칸 — 칸 등록 (B)`;
    ed.innerHTML = `<span class="key">${IS_TOUCH ? '' : 'B'}</span><div class="icon">${ICON('belt')}</div>${n}칸`;
    hb.appendChild(ed);
    const r = document.createElement('div'); // v0.16 슬라이딩 (벨트와 상관없이 항상)
    r.className = 'hot'; r.dataset.act = 'roll'; r.title = '슬라이딩: 무적으로 미끄러져 빠져나감 · 재사용 5초 (위급할 때)';
    r.innerHTML = `<span class="key">${IS_TOUCH ? '' : 'SPC'}</span><div class="icon">${ICON('roll')}</div>슬라이딩<div class="cd" id="cdroll"></div>`;
    hb.appendChild(r);
    if (!IS_TOUCH) hb.onclick = e => { // PC: 칸을 눌러도 사용 · 빈 칸·벨트 칸은 등록 창
      const hot = e.target.closest('.hot'); if (!hot) return;
      const cyc = e.target.closest('[data-cyc]'); if (cyc) return Gadgets.cycle(cyc.dataset.cyc);
      if (hot.dataset.act === 'edit' || hot.dataset.act === 'empty') return Hotbar.edit();
      if (hot.dataset.act === 'roll') return dodge();
      Hotbar.use(+hot.dataset.slot);
    };
  },

  updateHUD(dt) {
    UI.hudT -= dt;
    UI.drawMinimap();
    if (UI.hudT > 0) return;
    UI.hudT = 0.08;
    const p = G.player, mh = PlayerStats.maxHp(p), next = PlayerStats.expNext(p.level);
    $('hud-name').textContent = p.name;
    $('hud-lv').textContent = `Lv.${p.level}`;
    { const cd = Math.max(0, p.rollCd || 0), mx = p.rollCdMax || ROLL.cd; $('st-fill').style.width = (100 * (1 - cd / mx)) + '%'; $('st-text').textContent = cd > 0 ? `슬라이딩 ${cd.toFixed(1)}초` : '슬라이딩 준비'; } // v1.33 기력 막대 → 슬라이딩 재사용
    if ((UI.portT = (UI.portT || 0) - 0.08) <= 0) { UI.portT = 0.4; drawPlayerInto($('portrait'), 3.6, 210, 0.75); } // 초상화 (상반신)
    $('mm-label').textContent = ZONES[G.zone].name.split(' ')[0];
    $('hp-fill').style.width = clamp(100 * p.hp / mh, 0, 100) + '%';
    $('hp-text').textContent = `${Math.ceil(Math.max(0, p.hp))} / ${mh}`;
    $('exp-fill').style.width = (100 * p.exp / next) + '%';
    $('exp-text').textContent = p.level >= MAX_LEVEL ? `최대 레벨 (Lv${MAX_LEVEL})` : `EXP ${fmt(p.exp)} / ${fmt(next)} (${(100 * p.exp / next).toFixed(1)}%)`;
    UI.html('hud-credits', `<span class="cr">₵ ${fmt(p.credits)}</span>` + (p.statPoints ? ` <span class="pt">★ ${p.statPoints}</span>` : '') + (p.sp ? ` <span class="pt" style="color:#5aa8ff">SP ${p.sp}</span>` : '')
      + (p.mats.scrap || p.mats.chip ? ` <span class="mt">${ICON('scrap')}${p.mats.scrap} ${ICON('chip')}${p.mats.chip}</span>` : ''));
    const buffs = [];
    if (p.buffs.rapid > 0) buffs.push(`${ICON('rapid')}집중 사격 ${p.buffs.rapid.toFixed(1)}s`);
    if (p.buffs.adren > 0) buffs.push(`${ICON('adren')}아드레날린 ${p.buffs.adren.toFixed(1)}s`);
    if (p.buffs.regen > 0) buffs.push(`${ICON('heal')}재생 ${p.buffs.regen.toFixed(1)}s`);
    if (p.buffs.shield > 0) buffs.push(`${ICON('shield')}방어막 ${p.buffs.shield.toFixed(1)}s`);
    if (p.buffs.stim > 0) buffs.push(`${ICON('stim')}자극제 ${p.buffs.stim.toFixed(1)}s`);
    if (p.plate > 0) buffs.push(`${ICON('plate')}방탄판 ${Math.ceil(p.plate)}`);
    if (PERK_TIERS.some((t, i) => p.level >= t.lvl && !p.perks[i])) buffs.push(`<b style="color:#ffd76a">${ICON('tip')}특성 선택 가능 (C)</b>`);
    if (World.inSafe(p.x, p.y)) buffs.push(`${ICON('shield')} 안전 지대 (체력 회복)`);
    UI.html('hud-buffs', buffs.join('&nbsp; '));
    const z = ZONES[G.zone];
    UI.html('hud-zone', (G.zone === 0 ? z.name : `${z.name}  ·  Lv${z.lvl[0]}~${z.lvl[1]}<div class="zone-sub">${z.desc} · 특산 ${z.gearText}</div>`)
      + (p.inRad ? `<div class="zone-rad">${ICON('rad')} 방사능 피폭 중! 웅덩이에서 벗어나세요</div>` : ''));

    const w = curWeapon();
    if (w) {
      const b = WEAPONS[w.key];
      $('weapon-name').innerHTML = `<span style="color:${RARITIES[w.rarity].color}">${itemName(w)}</span>`;
      $('weapon-ammo').innerHTML = b.melee ? '<small>근접</small>' : p.reloadT > 0 ? '<small>재장전…</small>' : `${w.loaded} <small>/ ${b.infinite ? '∞' : fmt(p.ammo[b.ammo] || 0)} ${b.ammo ? AMMO[b.ammo].name : ''}</small>`;
      if (UI.iconFor !== w || UI.iconPlus !== w.plus) { UI.iconFor = w; UI.iconPlus = w.plus; drawWeaponIcon($('weapon-icon'), w); }
      $('weapon-role').textContent = `${b.role} · DPS ${Math.round(weaponDps(p, w))}`;
    } else { $('weapon-name').textContent = '맨손'; $('weapon-ammo').textContent = '-'; $('weapon-role').textContent = ''; drawWeaponIcon($('weapon-icon'), null); UI.iconFor = null; }

    SKILLS.forEach((s, i) => {
      const el = $('cd' + i);
      if (el) el.style.height = (100 * p.skillCd[i] / ((p.skillCdMax && p.skillCdMax[i]) || s.cd)) + '%';
    });
    const prog = G.search ? [G.search.t / G.search.dur, G.search.target.grave ? '시체 가방 회수 중…' : '뒤지는 중…'] : G.extractT > 0 ? [G.extractT / EXTRACT_TIME, '탈출 중…'] : null; // 진행 바
    $('extract-bar').classList.toggle('hidden', !prog);
    if (prog) { $('extract-fill').style.width = (100 * prog[0]) + '%'; $('extract-label').textContent = prog[1]; }
    if ($('cdroll')) $('cdroll').style.height = (100 * Math.max(0, p.rollCd || 0) / (p.rollCdMax || ROLL.cd)) + '%'; // v1.33 슬라이딩 재사용
    const live = G.combo >= 3 && G.time - G.comboT < 3; // 연속 처치 표시
    $('combo').classList.toggle('hidden', !live);
    if (live) { $('combo-n').textContent = `x${G.combo}`; $('combo-bar').style.width = (100 * (1 - (G.time - G.comboT) / 3)) + '%'; $('combo').style.color = G.combo >= 25 ? '#ffa53a' : G.combo >= 10 ? '#c77dff' : '#ffd76a'; }
    const med = p.inventory.find(i => i && i.key === 'medkit');
    if ($('medcnt')) $('medcnt').textContent = med ? med.count : 0;
    for (const slot of ['throw', 'util']) { const el = $(slot + 'cnt'); if (el) { const n = Gadgets.count(Gadgets.sel(slot)); el.textContent = n; el.parentNode.classList.toggle('empty', !n); } } // v1.14

    // 보스 바
    const fb = G.fieldBoss && dist(G.fieldBoss, p) < 900 ? G.fieldBoss : G.labBoss && G.labBoss.hp > 0 && dist(G.labBoss, p) < 900 ? G.labBoss : null;
    const boss = (G.boss && G.boss.hp > 0 && dist(G.boss, p) < 900) ? G.boss : (G.assault && G.assault.boss) || fb || G.elite; // 보스 · 어설트 보스 · 필드 보스 · 네임드
    if (boss && boss.hp > 0 && dist(boss, p) < 900) {
      $('boss-bar').classList.remove('hidden');
      $('boss-name').textContent = `Lv${boss.level} ${boss.bossName || (boss.elite ? ELITES[boss.elite].name : boss.def.name)}${boss.def.boss ? ` · ${Bosses.titanPhase(boss)}페이즈${boss.invulnT > 0 ? ' (무적)' : ''}` : ''}  ${fmt(boss.hp)} / ${fmt(boss.maxHp)}`;
      $('boss-fill').style.width = (100 * boss.hp / boss.maxHp) + '%';
    } else $('boss-bar').classList.add('hidden');

    const npc = !p.dead && nearestNpc();
    const crate = !npc && Interiors.nearCrate(), sc = !npc && !crate && Raid.inRaid() && !G.search && Scavenge.near(), asl = !npc && !crate && !sc && Assault.available();
    if (npc || crate || sc || asl) { $('interact-hint').classList.remove('hidden'); $('interact-hint').textContent = npc ? `[E] ${npc.name}와(과) 대화` : crate ? '[E] 보급 상자 열기' : sc ? Scavenge.hint(sc) : Assault.hint(asl); }
    else $('interact-hint').classList.add('hidden');

    // 임무 추적 (챕터)
    UI.html('quest-tracker', G.assault ? Assault.trackerHtml() : UI.trackerHtml(p) + Raid.trackerLine() + RaidEvents.trackerLine() + Bounty.trackerLine());
  },

  trackerHtml(p) {
    const c = Story.chapter(p);
    if (!c) return `<b>모든 장 완료</b><br>${p.labKills ? `키메라 처치 ${p.labKills}회 · 지하 연구소는 출격마다 구조가 바뀝니다` : `<span style="color:#ff8a8a">${ICON('map')} 지하 연구소 해금 — 격리실의 「키메라」를 처치하라</span>`}`;
    if (!p.quest.active) return p.level >= c.minLevel ? `<b>${c.title}</b><br>한씨에게 말을 걸거나, 「${MAPS[CHAPTER_MAP[p.quest.ch]].name}」에 출격하면 시작` : `<b>다음: ${c.title}</b><br>Lv${c.minLevel} 이상`;
    const st = c.steps[p.quest.step], tg = Story.target(p), mapId = CHAPTER_MAP[p.quest.ch];
    let h = `<b>${c.title} (${p.quest.step + 1}/${c.steps.length})</b><br>${Story.objective(st)}`;
    if (mapId && World.map !== mapId) h += `<br><span style="color:#8cf">${ICON('map')} ${World.map === 'camp' ? '작전 장교 윤씨에게서' : '탈출 후 캠프에서'} 「${MAPS[mapId].name}」 출격</span>`;
    if (st.type === 'kill' || st.type === 'collect') h += ` <b>${p.quest.progress} / ${st.count}</b>`;
    if (tg) h += `<br><span class="muted">▶ ${Math.round(dist(p, tg) / TILE * 2)}m</span>`;
    return h;
  },

  toast(title, sub) {
    $('toast-title').textContent = title; $('toast-sub').textContent = sub || '';
    const el = $('toast'); el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(UI.toastT); UI.toastT = setTimeout(() => el.classList.add('hidden'), 3500);
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
    const nc = it.unique ? ' style="color:#ff5aa0"' : it.set ? ` style="color:${SETS[it.set].color}"` : ''; // v1.12 고유 · 세트
    if (it.locked) mark += `<span class="mark lock">${ICON('lock')}</span>`; // v1.15
    return `${mark}<span class="icon">${itemIcon(it)}</span><span class="r${r}"${nc}>${itemName(it)}</span>` + (it.count > 1 ? `<span class="cnt">${it.count}</span>` : '');
  },

  refreshInventory() {
    if (!G.player) return;
    const p = G.player;
    document.querySelectorAll('.equip-slot').forEach(el => {
      const it = p.equip[el.dataset.slot];
      el.classList.toggle('active', el.dataset.slot === p.active);
      el.className = el.className.replace(/ ?bc\d/g, '') + (it ? ' bc' + it.rarity : '');
      el.querySelector('div').innerHTML = it ? `${itemIcon(it)} <span class="r${it.rarity}">${itemName(it)}</span>` + (it.affixes && it.affixes.length ? `<br><span class="affix">◆ 옵션 ${it.affixes.length}개${it.legend ? ' ★' : ''}</span>` : '') : '<span class="muted">비어 있음</span>';
    });
    if (UI.isOpen('inventory')) { // 장비창 인물 · 요약
      drawPlayerInto($('doll'), 5.2, 290, 0.75);
      const w = p.equip[p.active];
      $('doll-stats').innerHTML = `<b>Lv.${p.level}</b> ${p.name}<br><span class="muted">체력</span> ${Math.ceil(p.hp)} / ${PlayerStats.maxHp(p)}`
        + `<br><span class="muted">방어</span> ${PlayerStats.def(p)} (-${Math.round(PlayerStats.dmgReduce(p) * 100)}%)<br><span class="muted">DPS</span> ${w ? Math.round(weaponDps(p, w)) : 0}`
        + `<br><span class="muted">₵</span> ${fmt(p.credits)} · ${ICON('scrap')}${p.mats.scrap} ${ICON('chip')}${p.mats.chip}`;
      $('bag-count').textContent = `${p.inventory.length} / ${Camp.bagSize()}`;
      $('btn-sort').onclick = () => UI.sortBag(); // v1.15
    }
    const grid = $('inv-grid');
    grid.innerHTML = '';
    for (let i = 0; i < Camp.bagSize(); i++) {
      const it = p.inventory[i];
      const c = document.createElement('div');
      c.className = 'inv-cell' + (it ? ' bc' + (it.rarity || 0) : '') + (it && UI.selected === it ? ' sel' : '');
      if (it) { c.innerHTML = UI.itemCell(it); c.onclick = () => { UI.selected = it; it.isNew = false; UI.refreshInventory(); }; }
      grid.appendChild(c);
    }
    if (UI.selected && !p.inventory.includes(UI.selected) && !Object.values(p.equip).includes(UI.selected)) UI.selected = null;
    UI.renderDetail();
  },

  // v1.15 가방 정렬: 소모품 → 무기 → 방어구 → 헬멧, 각각 고유·세트 → 등급 → 강화 → 레벨 높은 순
  sortBag() {
    const p = G.player, ord = { cons: 0, weapon: 1, armor: 2, helmet: 3, belt: 4 };
    p.inventory.sort((a, b) => (ord[a.kind] - ord[b.kind]) || ((b.unique ? 2 : b.set ? 1 : 0) - (a.unique ? 2 : a.set ? 1 : 0)) || ((b.rarity || 0) - (a.rarity || 0)) || ((b.plus || 0) - (a.plus || 0)) || ((b.ilvl || 0) - (a.ilvl || 0)) || String(a.key).localeCompare(String(b.key)));
    SFX.play('ui'); UI.refreshInventory();
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
    box.innerHTML = `<b class="r${it.rarity || 0}">${itemIcon(it)} ${itemName(it)}</b> ${it.ilvl ? `<span class="muted">(아이템 Lv${it.ilvl})</span>` : ''}`
      + (req > p.level ? ` <span style="color:#f66">요구 Lv${req}</span>` : '') + `<br>${itemHtml(it)}${cmp}<div class="btns"></div>`;
    const btns = box.querySelector('.btns');
    const add = (label, fn) => { const b = document.createElement('button'); b.innerHTML = label; b.onclick = fn; btns.appendChild(b); };
    if (it.kind !== 'cons') add(it.locked ? `${ICON('lock')} 잠금 해제` : `${ICON('lock')} 잠금`, () => { it.locked = !it.locked; SFX.play('ui'); UI.refreshInventory(); }); // v1.15 잠금: 판매·분해·버리기 막음
    if (equippedSlot === 'belt') { add('칸 등록 (B)', () => Hotbar.edit()); return; } // v1.24 벨트는 바꿔 차기만
    if (equippedSlot) {
      add('장착 해제', () => UI.unequip(equippedSlot));
      return;
    }
    if (it.kind === 'weapon') { add('주무기로 장착', () => UI.equip(it, 'w1')); add('보조무기로 장착', () => UI.equip(it, 'w2')); }
    if (it.kind === 'armor') add('장착', () => UI.equip(it, 'armor'));
    if (it.kind === 'helmet') add('장착', () => UI.equip(it, 'helmet'));
    if (it.kind === 'belt') add('차기', () => { UI.equip(it, 'belt'); SKILLS.forEach((sk, i) => { if (G.player.skills[sk.id]) Hotbar.autoAdd('sk' + i); }); UI.buildHotbar(); }); // 칸이 늘면 못 넣었던 스킬을 채움
    if (it.kind === 'cons') add('사용', () => useItem(it));
    if (it.locked) return; // 잠긴 장비는 판매·버리기 버튼 없음
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
    if (p.inventory.length >= Camp.bagSize()) { log('인벤토리가 가득 찼습니다.', '#f88'); return; }
    p.inventory.push(p.equip[slot]);
    p.equip[slot] = null;
    if (slot === p.active) { const o = slot === 'w1' ? 'w2' : 'w1'; if (p.equip[o]) p.active = o; }
    p.hp = Math.min(p.hp, PlayerStats.maxHp(p));
    UI.refreshInventory(); UI.refreshStats();
    saveGame();
  },

  sell(it, price) {
    if (it.locked) return; // v1.15
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
        <div class="stat-eff">${eff}${(() => { const sk = SKILLS.find(s => s.stat === k); return sk ? ` · <span class="sk-link">${ICON(sk.icon)} ${sk.name} 강화</span>` : ''; })()}</div>`;
    }
    const wline = sl => { const w = p.equip[sl]; return w ? `<div class="stat-row"><span>${sl === 'w1' ? '주무기' : '보조무기'} DPS <span class="muted">${itemName(w)}</span></span><b>${Math.round(weaponDps(p, w))}</b></div>` : ''; };
    // v1.11 특성: 단계마다 3개 중 1개
    h += '<hr style="border-color:#333"><div class="muted">특성 (5레벨마다 하나 선택 · 의무병의 능력치 초기화 때 함께 초기화) <button id="btn-ptree" class="smod">패시브 트리</button></div>';
    PERK_TIERS.forEach((t, i) => {
      const got = p.perks[i], open = p.level >= t.lvl;
      h += `<div class="perk-tier${open ? '' : ' locked'}"><span class="tag">Lv${t.lvl}</span>`;
      for (const k of t.perks) {
        const sel = got === k.id, can = open && !got;
        h += `<button class="perk${sel ? ' sel' : ''}" ${can ? `data-perk="${i}:${k.id}"` : 'disabled'} title="${k.desc}"><b>${k.name}</b><span>${k.desc}</span></button>`;
      }
      h += '</div>';
    });
    { // v1.23 단련 · 갈래 보너스 요약
      const own = Object.values(PASSIVES).flat().filter(n => pas(n.id)).map(n => n.name), bon = Object.keys(PASSIVE_BRANCHES).filter(branchOn).map(b => `<span style="color:${PASSIVE_BRANCHES[b].color}">★ ${PASSIVE_BRANCHES[b].name}: ${PASSIVE_BRANCHES[b].bonus}</span>`);
      if (own.length || bon.length) h += `<div class="stat-eff">${own.length ? '단련: ' + own.join(' · ') : ''}${bon.length ? (own.length ? '<br>' : '') + bon.join('<br>') : ''}</div>`;
    }
    h += `<hr style="border-color:#333"><div class="muted">스킬은 따로 — <button id="btn-stree" class="smod">스킬 창 (K)${p.sp ? ` <b class="r2">SP ${p.sp}</b>` : ''}</button></div>`; // v1.26 스킬 창 분리
    const learned = SKILLS.filter(s => p.skills[s.id]);
    if (learned.length) h += `<div class="stat-eff">${learned.map(s => `${ICON(s.icon)} ${s.name} ${srank(s.id)}등급${p.skillMods[s.id] ? ` <span class="r2">[${SKILL_MODS[s.id][p.skillMods[s.id]].name}]</span>` : ''}`).join(' · ')}</div>`;
    const sets = Object.keys(SETS).filter(k => setCount(p, k) > 0); // v1.12 착용 중인 세트
    if (sets.length) h += '<hr style="border-color:#333">' + sets.map(k => { const S = SETS[k], n = setCount(p, k); return `<div class="setname" style="color:${S.color}">▣ ${S.name} 세트 ${n}/3</div><div class="setb${n >= 2 ? ' on' : ''}">(2) ${S.b2}</div><div class="setb${n >= 3 ? ' on' : ''}">(3) ${S.b3}</div>`; }).join('');
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
    $('stats-body').querySelectorAll('button[data-perk]').forEach(b => {
      b.onclick = () => {
        const [i, id] = b.dataset.perk.split(':'), t = PERK_TIERS[+i], k = t.perks.find(q => q.id === id);
        if (p.perks[+i] || p.level < t.lvl) return;
        if (!confirm(`특성 「${k.name}」 — ${k.desc}\n선택할까요? (의무병에게서 초기화 가능)`)) return;
        UI.choosePerk(+i, id);
      };
    });
    $('btn-stree').onclick = () => UI.skillTree(); // v1.22
    $('btn-ptree').onclick = () => UI.passiveTree(); // v1.23
    $('stats-body').querySelectorAll('button[data-smod]').forEach(b => {
      b.onclick = () => {
        const [id, k] = b.dataset.smod.split(':');
        if (!p.smodOwned[id + '_' + k]) return;
        p.skillMods[id] = p.skillMods[id] === k ? null : k; // 다시 누르면 기본형
        SFX.play('ui'); UI.refreshStats(); UI.buildHotbar(); saveGame();
      };
    });
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

  // ---------------- 설정 ----------------
  refreshSettings() {
    const opt = (k, label, desc) => `<label class="set-row"><input type="checkbox" data-set="${k}" ${Settings[k] ? 'checked' : ''}> <b>${label}</b> <span class="muted">${desc}</span></label>`;
    $('settings-body').innerHTML = opt('light', '조명 효과', '끄면 가벼워짐 (저사양·모바일 권장)')
      + opt('detail', '세부 묘사', '옥상·1층·도로·차 디테일 (끄면 가벼워짐)')
      + opt('shake', '화면 흔들림', '타격·폭발 시 화면 흔들림')
      + opt('camLead', '조준 방향 시야', '마우스 쪽으로 화면이 조금 따라감 (어지러우면 끄기)')
      + opt('dmgNum', '피해 숫자', '적에게 준 피해 표시')
      + opt('sound', '효과음', '총소리·타격·획득 소리')
      + opt('bgm', '배경 음악', '맵 분위기 음악 · 적이 쫓아오면 전투 음악 (v1.17)')
      + `<div class="set-row"><b>음악 음량</b> <span id="mus-val">${Math.round((Settings.musicVol ?? 0.5) * 100)}%</span><br><input type="range" id="mus-range" min="0" max="1" step="0.05" value="${Settings.musicVol ?? 0.5}"></div>`
      + `<div class="set-row"><b>음량</b> <span id="vol-val">${Math.round(Settings.volume * 100)}%</span><br><input type="range" id="vol-range" min="0" max="1" step="0.05" value="${Settings.volume}"></div>`
      + `<div class="set-row"><b>화면 확대</b> <span id="zoom-val">${ZOOM.toFixed(1)}배</span><br><input type="range" id="zoom-range" min="${ZOOM_MIN}" max="2.2" step="0.1" value="${ZOOM}"></div>`
      + opt('tips', '도움말 팁', '처음 겪는 상황에서 한 번씩 안내')
      + `<hr style="border-color:#333"><b>세이브 백업</b> <span class="muted">— 다른 기기·브라우저로 옮길 때</span><br>`
      + `<button id="btn-export">세이브 코드 만들기</button> <button id="btn-import">세이브 코드 불러오기</button>`
      + `<textarea id="save-code" class="hidden" rows="3" spellcheck="false"></textarea>`
      + `<div class="muted">${IS_TOUCH ? '확대는 오른쪽 ＋/－ 버튼으로도 조절됩니다.' : '확대는 마우스 휠로도 조절됩니다.'} 설정은 이 기기에 저장됩니다. · ${GAME_VERSION}</div>`;
    $('settings-body').querySelectorAll('input[data-set]').forEach(el => { el.onchange = () => { Settings[el.dataset.set] = el.checked; Settings.save(); SFX.setVolume(); if (el.dataset.set === 'detail') GroundCache.map.clear(); }; });
    $('mus-range').oninput = e => { Settings.musicVol = +e.target.value; Settings.save(); $('mus-val').textContent = Math.round(Settings.musicVol * 100) + '%'; };
    $('vol-range').oninput = e => { Settings.volume = +e.target.value; Settings.save(); SFX.setVolume(); $('vol-val').textContent = Math.round(Settings.volume * 100) + '%'; SFX.play('coin'); };
    $('btn-export').onclick = () => {
      saveGame(); const ta = $('save-code'), raw = localStorage.getItem(SAVE_KEY) || '';
      ta.value = btoa(unescape(encodeURIComponent(raw))); ta.classList.remove('hidden'); ta.select();
      const ok = () => log('세이브 코드를 복사했습니다. 다른 기기의 설정 → 불러오기에 붙여넣으세요.', '#8f8'), manual = () => log('아래 코드를 직접 복사하세요 (길게 눌러 전체 선택).', '#8cf');
      try { navigator.clipboard.writeText(ta.value).then(ok, manual); } catch (e) { manual(); }
    };
    $('btn-import').onclick = () => {
      const ta = $('save-code');
      if (ta.classList.contains('hidden') || !ta.value.trim()) { ta.value = ''; ta.classList.remove('hidden'); ta.placeholder = '여기에 세이브 코드를 붙여넣고 다시 [불러오기]'; ta.focus(); return; }
      try {
        const raw = decodeURIComponent(escape(atob(ta.value.trim()))), s = JSON.parse(raw);
        if (!s || !s.p || !s.p.name) throw new Error('bad');
        if (!confirm(`${s.p.name} Lv${s.p.level} 세이브로 바꿀까요? 지금 진행은 덮어씌워집니다.`)) return;
        G.running = false; localStorage.setItem(SAVE_KEY, raw); location.reload();
      } catch (e) { log('세이브 코드가 올바르지 않습니다.', '#f66'); }
    };
    $('zoom-range').oninput = e => { setZoom(+e.target.value); $('zoom-val').textContent = ZOOM.toFixed(1) + '배'; };
  },

  // ---------------- 임무 ----------------
  refreshQuest() {
    if (!G.player) return;
    const p = G.player;
    const jb = Journal.bodyHtml(); // v1.15 도감 · 업적 · 기록 탭
    if (jb !== null) { $('quest-body').innerHTML = Journal.tabsHtml() + jb; Journal.bind($('quest-body')); return; }
    let h = Journal.tabsHtml();
    CHAPTERS.forEach((c, i) => {
      const state = i < p.quest.ch ? '✓' : i === p.quest.ch ? (p.quest.active ? '▶' : p.level >= c.minLevel ? '!' : ICON('lock')) : ICON('lock');
      h += `<div class="ch-row${i === p.quest.ch ? ' cur' : ''}">${state} <b>${c.title}</b> <span class="muted">Lv${c.minLevel}+</span></div>`;
      if (i !== p.quest.ch) return;
      if (!p.quest.active) { h += `<div class="muted" style="margin-left:18px">${p.level >= c.minLevel ? '캠프의 생존자 대장 한씨에게 말을 걸어 시작하세요.' : `Lv${c.minLevel}이 되면 시작할 수 있습니다.`}</div>`; return; }
      c.steps.forEach((st, j) => {
        const mark = j < p.quest.step ? '✓' : j === p.quest.step ? '▶' : '·';
        h += `<div class="step-row${j === p.quest.step ? ' cur' : ''}">${mark} ${Story.objective(st)}${j === p.quest.step && (st.type === 'kill' || st.type === 'collect') ? ` <b>${p.quest.progress} / ${st.count}</b>` : ''}</div>`;
        if (j === p.quest.step) {
          const r = st.reward;
          h += `<div class="step-text">${st.text}<br><span class="muted">보상: EXP ${fmt(r.exp)}, ${fmt(Math.round(r.credits * ECON.cr))}₵${r.equip ? ', ' + GEAR_DEFS(r.equip).name : r.gear ? ', 장비' : ''}</span></div>`;
        }
      });
    });
    if (Story.done(p)) h += '<hr style="border-color:#333">모든 장을 완료했습니다. 당신은 서울의 영웅입니다!<br><span class="muted">타이탄은 4분마다 부활합니다.</span>';
    h += Bounty.panelHtml() + Weekly.panelHtml() + Assault.panelHtml(p);
    $('quest-body').innerHTML = h; Journal.bind($('quest-body'));
  },

  // ---------------- NPC ----------------
  dialog(name, text, buttons) {
    $('dialog-name').textContent = name;
    $('dialog-text').innerHTML = text;
    const box = $('dialog-buttons');
    box.innerHTML = '';
    for (const [label, fn] of buttons) {
      const b = document.createElement('button'); b.innerHTML = label; b.onclick = fn; box.appendChild(b); // 아이콘 포함 가능
    }
    UI.open('dialog');
  },

  openNpc(npc) {
    const p = G.player, bye = ['닫기', () => UI.close('dialog')];
    if (npc.id === 'trader') return RaidEvents.openTrader(npc); // v1.10 떠돌이 상인
    if (npc.id === 'merchant') {
      UI.dialog(npc.name, '"총알이든 약이든, 크레딧만 있으면 다 구해다 주지. 쓸만한 물건 있으면 사 주겠네. 기술을 다시 익히고 싶으면 교범을 봐."', [
        ['거래하기', () => { UI.close('dialog'); UI.openShop(); }], ['스킬 트리 · 초기화', () => UI.skillShop()], bye]);
    } else if (npc.id === 'medic') {
      const mh = PlayerStats.maxHp(p);
      const cost = respecCost(p);
      UI.dialog(npc.name, (p.hp < mh ? '"많이 다쳤군. 이리 와, 치료해 줄게."' : '"멀쩡해 보이네. 몸 조심하고."')
        + '<br><span class="muted">신체 재조정: 모든 능력치를 5로 되돌리고 포인트를 돌려받습니다. ' + (cost ? `비용 ${fmt(cost)}₵` : '첫 1회 무료') + '</span>', [
        ['치료받기 (무료)', () => { p.hp = mh; log('의무병이 상처를 치료해 주었다.', '#6f6'); UI.close('dialog'); }],
        [`능력치 초기화 (${cost ? fmt(cost) + '₵' : '무료'})`, () => UI.respec()], bye]);
    } else if (npc.id === 'captain') UI.captainDialog(npc);
    else if (npc.id === 'deploy') Raid.openMap();
    else if (npc.id === 'stash') { UI.closeAll(); Stash.open(); }
    else if (npc.id === 'mechanic') {
      UI.dialog(npc.name, '"총이든 조끼든 가져와. 손보면 훨씬 쓸만해지지. 못 쓰는 건 뜯어서 부품으로 쓰고, 옵션이 마음에 안 들면 다시 손봐 주지."', [
        ['장비 강화', () => { UI.close('dialog'); Workshop.open('enhance'); }],
        ['분해 · 제작', () => { UI.close('dialog'); Workshop.open('salvage'); }],
        ['옵션 재조정', () => { UI.close('dialog'); Workshop.open('reroll'); }], bye]);
    }
  },

  // ---------------- 강화 ----------------
  enhSel: null,
  openEnhance() {
    const p = G.player; Workshop.mode = 'enhance';
    if (!UI.enhSel || !UI.enhanceList().includes(UI.enhSel)) UI.enhSel = p.equip[p.active] || p.equip.w1;
    UI.renderEnhance();
    UI.open('enhance');
  },
  enhanceList() {
    const p = G.player;
    return [p.equip.w1, p.equip.w2, p.equip.armor, p.equip.helmet, ...p.inventory.filter(i => i.kind !== 'cons' && i.kind !== 'belt')].filter(Boolean); // v1.24 벨트는 강화 없음
  },
  renderEnhance() {
    const p = G.player, list = $('enh-list'), box = $('enh-detail');
    Workshop.tabs();
    list.innerHTML = '';
    for (const it of UI.enhanceList()) {
      const slot = Object.keys(p.equip).find(k => p.equip[k] === it);
      const d = document.createElement('div');
      d.className = 'shop-item' + (it === UI.enhSel ? ' sel' : '');
      d.innerHTML = `<span>${itemIcon(it)} <span class="r${it.rarity}">${itemName(it)}</span>${slot ? ' <span class="tag">장착</span>' : ''}</span>`
        + `<span class="plus">${it.plus >= ENHANCE.max ? 'MAX' : '+' + it.plus}</span>`;
      d.onclick = () => { UI.enhSel = it; UI.renderEnhance(); };
      list.appendChild(d);
    }
    const it = UI.enhSel;
    if (!it) { box.innerHTML = '<span class="muted">강화할 장비를 선택하세요.</span>'; return; }
    let h = `<b class="r${it.rarity}">${itemIcon(it)} ${itemName(it)}</b><br>`;
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
    Bounty.on('enhance');
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
    const spent = Object.values(p.stats).reduce((a, v) => a + Math.max(0, v - 5), 0), np = p.perks.filter(Boolean).length;
    if (!spent && !np) { log('초기화할 능력치·특성이 없습니다.', '#aaa'); return; }
    if (p.credits < cost) { log('크레딧이 부족합니다.', '#f88'); return; }
    if (!confirm(`능력치 ${spent}포인트와 특성 ${np}개를 모두 돌려받습니다.${cost ? ` 비용 ${fmt(cost)}₵` : ''} 진행할까요?`)) return;
    p.credits -= cost; p.respecs++; p.perks = []; // v1.11 특성도 초기화
    for (const k of Object.keys(p.stats)) p.stats[k] = Math.min(p.stats[k], 5);
    p.statPoints += spent;
    p.hp = Math.min(p.hp, PlayerStats.maxHp(p));
    log(`능력치 초기화 완료: 포인트 ${spent} 반환. 능력치 창(C)에서 다시 분배하세요.`, '#8cf');
    UI.close('dialog'); UI.open('stats'); UI.buildHotbar(); UI.refreshInventory(); saveGame();
  },

  // v1.26 스킬 창 (K): 능력치 창에서 분리. 스킬마다 세로 한 갈래 — 1~5등급 → 숙련(2등급) → 숙달(4등급) → 갈래 a/b(5등급) → 궁극
  // 모두 스킬 포인트(SP). 갈래 바꾸기 · 초기화는 캠프에서
  skillShop() { UI.close('dialog'); UI.open('skills'); },
  skillTree() { UI.close('stats'); UI.open('skills'); },
  treeNode(s, k) { // 노드 정보: 이름 · 설명 · SP · 레벨 · 보유 · 선행 충족
    const p = G.player, T = SKILL_TREE[s.id], rk = srank(s.id);
    if (k === 'root') {
      const next = Math.min(SKILL_RANKS, rk + 1), max = rk >= SKILL_RANKS;
      return { name: s.name, rank: rk, max, desc: `${skillBaseDesc(s, p)} · 재사용 ${s.cd}초 · ${STAT_NAMES[s.stat]} 능력치로 강해짐<br>등급마다 위력 +${Math.round(RANK_BONUS * 100)}% (지금 ${rk}등급${rk ? ` · +${Math.round((rankMul(s.id) - 1) * 100)}%` : ''})`,
        sp: SKILL_SP.root, lvl: rankLvl(s, next), own: max, pre: true, icon: s.icon, label: rk ? `${rk}/${SKILL_RANKS}` : '' };
    }
    if (k === 'a' || k === 'b') return { name: SKILL_MODS[s.id][k].name, desc: SKILL_MODS[s.id][k].desc + ' · 둘 다 배우면 캠프에서 바꿈', sp: SKILL_SP[k], lvl: rankLvl(s, SKILL_RANKS), own: !!p.smodOwned[s.id + '_' + k], pre: rk >= SKILL_RANKS, preTxt: `${s.name} ${SKILL_RANKS}등급`, mod: true };
    const n = T[k], own = stree(s.id, k);
    const pre = k === 'r1' ? rk >= 2 : k === 'r2' ? stree(s.id, 'r1') && rk >= 4 : stree(s.id, 'r2') && (p.smodOwned[s.id + '_a'] || p.smodOwned[s.id + '_b']);
    return { name: n.name, desc: n.desc, sp: SKILL_SP[k], lvl: n.lvl, own, pre: !!pre, preTxt: k === 'r1' ? `${s.name} 2등급` : k === 'r2' ? `${T.r1.name} + ${s.name} 4등급` : `${T.r2.name} + 갈래 하나`, cap: k === 'cap' };
  },
  treeSel: null,
  renderSkills() {
    const p = G.player, inCamp = World.map === 'camp';
    let h = `<div class="st-head"><b class="r2">스킬 포인트 ${p.sp || 0}</b> <span class="muted">· 레벨 업마다 +1 · 장 완료마다 +1 · 칸을 눌러 설명 · 위에서부터 차례로 열림 · 전부 배울 수는 없음</span></div><div class="stree sk5">`;
    for (const s of SKILLS) {
      const node = k => {
        const n = this.treeNode(s, k), up = k === 'root' && n.rank && !n.max && n.pre && p.level >= n.lvl;
        const st = n.own ? 'own' : k === 'root' && n.rank ? (up ? 'own up' : 'own') : !n.pre ? 'lock' : p.level < n.lvl ? 'lvl' : 'avail', sel = this.treeSel === s.id + ':' + k;
        const using = n.mod && p.skillMods[s.id] === k;
        const lab = k === 'root' && n.rank ? n.label + (up ? ` · ＋${n.sp}SP` : n.max ? ' 최대' : ` · Lv${n.lvl}`) : n.own ? (using ? '사용 중' : '보유') : st === 'avail' ? n.sp + ' SP' : st === 'lvl' ? 'Lv' + n.lvl : ICON('lock');
        return `<button class="tn ${st}${n.cap ? ' cap' : ''}${using ? ' use' : ''}${sel ? ' sel' : ''}" data-tn="${s.id}:${k}">${n.icon ? ICON(n.icon) + ' ' : ''}<b>${n.name}</b><span>${lab}</span></button>`;
      };
      const line = on => `<i class="tl${on ? ' on' : ''}"></i>`, own = k => k === 'root' ? srank(s.id) >= 2 : this.treeNode(s, k).own;
      h += `<div class="st-col"><div class="st-title">${s.eng ? '엔지니어' : STAT_NAMES[s.stat]}</div>${node('root')}${line(own('root'))}${node('r1')}${line(own('r1'))}${node('r2')}${line(own('a') || own('b'))}<div class="st-pair">${node('a')}${node('b')}</div>${line(own('cap'))}${node('cap')}</div>`;
    }
    h += '</div>';
    const btns = [];
    if (this.treeSel) {
      const [id, k] = this.treeSel.split(':'), s = SKILLS.find(q => q.id === id), n = this.treeNode(s, k);
      const isRoot = k === 'root', done = isRoot ? n.max : n.own;
      const why = done ? (isRoot ? '최대 등급' : '보유 중') : !n.pre ? `먼저 「${n.preTxt}」` : p.level < n.lvl ? `Lv${n.lvl}부터` : (p.sp || 0) < n.sp ? `스킬 포인트 부족 (${n.sp} SP 필요)` : '';
      h += `<div class="st-detail"><b class="${n.cap ? 'r4' : 'r2'}">${n.name}</b> <span class="muted">${s.name}${isRoot ? ` · ${n.rank}/${SKILL_RANKS}등급` : ''} · Lv${n.lvl} · ${n.sp} SP</span><br>${n.desc}${why ? `<br><span class="muted">${why}</span>` : ''}</div>`;
      if (!why) btns.push([isRoot && n.rank ? `${n.rank + 1}등급 올리기 (${n.sp} SP)` : `${n.name} 배우기 (${n.sp} SP)`, () => this.buyNode(s, k)]);
      if (n.mod && n.own) { // 갈래 바꾸기 (캠프)
        const on = p.skillMods[s.id] === k;
        if (inCamp) btns.push([on ? '기본형으로 쓰기' : '이 갈래로 쓰기', () => { p.skillMods[s.id] = on ? null : k; SFX.play('ui'); UI.buildHotbar(); saveGame(); this.renderSkills(); }]);
        else h += '<div class="muted">갈래는 캠프에서 바꿀 수 있습니다.</div>';
      }
    }
    if (inCamp && Object.keys(p.skills).length) btns.push([`스킬 초기화 (₵${fmt(skillResetCost(p))})`, () => this.resetSkills()]);
    btns.push(['닫기', () => { this.treeSel = null; UI.close('skills'); }]);
    const body = $('skills-body'), keep = body.scrollTop;
    body.innerHTML = h; body.scrollTop = keep;
    const box = $('skills-buttons'); box.innerHTML = '';
    for (const [label, fn] of btns) { const b = document.createElement('button'); b.innerHTML = label; b.onclick = fn; box.appendChild(b); }
    body.querySelectorAll('[data-tn]').forEach(b => { b.onclick = () => { this.treeSel = b.dataset.tn; SFX.play('ui'); this.renderSkills(); }; });
  },
  buyNode(s, k) {
    const p = G.player;
    if (k === 'root') return this.buySkill(s);
    if (k === 'a' || k === 'b') return this.buySkill(s, k);
    const n = SKILL_TREE[s.id][k];
    if ((p.sp || 0) < SKILL_SP[k]) { log('스킬 포인트가 부족합니다.', '#f88'); SFX.play('empty'); return; }
    p.sp -= SKILL_SP[k]; p.stree[s.id + '_' + k] = true;
    log(`스킬 트리: ${s.name} — ${n.name} (${n.desc})`, '#7fd'); UI.toast(k === 'cap' ? '궁극 기술' : '스킬 강화', `${s.name} — ${n.name}`);
    SFX.play('levelup'); UI.refreshStats(); saveGame(); this.renderSkills();
  },
  // v1.25 스킬 초기화 (캠프 · 크레딧): 배운 스킬·등급·갈래·트리를 지우고 SP를 전부 돌려줌
  resetSkills() {
    const p = G.player, cost = skillResetCost(p);
    if (p.credits < cost) { log('크레딧이 부족합니다.', '#f88'); SFX.play('empty'); return; }
    if (!confirm(`스킬을 모두 초기화하고 스킬 포인트를 돌려받을까요? (₵${fmt(cost)})`)) return;
    const back = spSpent(p);
    p.credits -= cost; p.sp = (p.sp || 0) + back; p.skills = {}; p.srank = {}; p.smodOwned = {}; p.skillMods = {}; p.stree = {};
    p.hotbar = p.hotbar.map(a => a && a.startsWith('sk') ? null : a);
    log(`스킬 초기화 — 스킬 포인트 ${back} 반환`, '#7fd'); SFX.play('ui');
    UI.buildHotbar(); UI.refreshStats(); saveGame(); this.renderSkills();
  },
  // v1.23 특성 고르기 (능력치 창 · 패시브 트리 공용)
  choosePerk(i, id) {
    const p = G.player, t = PERK_TIERS[i], k = t.perks.find(q => q.id === id);
    if (!k || p.perks[i] || p.level < t.lvl) return;
    const before = PlayerStats.maxHp(p); p.perks[i] = id; p.hp += Math.max(0, PlayerStats.maxHp(p) - before);
    log(`특성 획득: ${k.name} — ${k.desc}`, '#ffd76a'); SFX.play('levelup');
    const b = PERK_BRANCH[id]; if (branchOn(b) && p.perks.filter(q => q && PERK_BRANCH[q] === b).length === 3) UI.toast('갈래 보너스', `${PASSIVE_BRANCHES[b].name} — ${PASSIVE_BRANCHES[b].bonus}`);
    UI.refreshStats(); UI.refreshInventory(); saveGame();
  },
  // v1.23 패시브 트리: 세 갈래(공격 · 전술 · 생존). 특성(Lv5마다 한 단계에서 1개, 무료) 사이에 단련 노드(크레딧, 캠프에서)
  ptNode(b, kind, i) {
    const p = G.player;
    if (kind === 'k') {
      const t = PERK_TIERS[i], k = t.perks.find(q => PERK_BRANCH[q.id] === b), got = p.perks[i];
      const st = got === k.id ? 'own' : got ? 'lock' : p.level < t.lvl ? 'lvl' : 'avail';
      return { name: k.name, desc: k.desc, lvl: t.lvl, st, label: st === 'own' ? '선택함' : st === 'lock' ? '다른 특성' : st === 'lvl' ? 'Lv' + t.lvl : '선택 (무료)', why: st === 'lock' ? `이 단계는 「${t.perks.find(q => q.id === got).name}」을(를) 골랐음 · 의무병에게서 초기화` : st === 'lvl' ? `Lv${t.lvl}부터` : st === 'own' ? '선택함' : '', perk: k.id };
    }
    const n = PASSIVES[b][i], own = pas(n.id), pre = i === 0 || pas(PASSIVES[b][i - 1].id);
    const st = own ? 'own' : !pre ? 'lock' : p.level < n.lvl ? 'lvl' : 'avail';
    return { name: n.name, desc: n.desc, lvl: n.lvl, price: n.price, st, label: st === 'own' ? '보유' : st === 'lock' ? ICON('lock') : st === 'lvl' ? 'Lv' + n.lvl : fmt(n.price) + '₵',
      why: st === 'own' ? '보유 중' : st === 'lock' ? `먼저 「${PASSIVES[b][i - 1].name}」` : st === 'lvl' ? `Lv${n.lvl}부터` : p.credits < n.price ? `크레딧 부족 (${fmt(n.price)}₵)` : World.map !== 'camp' ? '캠프에서 구입' : '' };
  },
  ptSel: null,
  passiveTree() {
    const p = G.player;
    let h = `<div class="st-head"><span class="muted">₵${fmt(p.credits)} 보유 · <b>큰 칸 = 특성</b> (Lv5마다 한 단계에서 하나, 무료) · <b>작은 칸 = 단련</b> (크레딧, 캠프에서 위부터) · 같은 갈래 특성 3개 → 갈래 보너스</span></div><div class="stree pt">`;
    for (const b of Object.keys(PASSIVE_BRANCHES)) {
      const B = PASSIVE_BRANCHES[b], n = p.perks.filter(id => id && PERK_BRANCH[id] === b).length;
      h += `<div class="st-col"><div class="st-title" style="color:${B.color}"><b>${B.name}</b> · 특성 ${n}/6</div><div class="pt-bonus${n >= 3 ? ' on' : ''}" title="같은 갈래 특성 3개">${n >= 3 ? '★' : '☆'} ${B.bonus}</div>`;
      for (let i = 0; i < PERK_TIERS.length; i++) {
        for (const kind of i < PASSIVES[b].length ? ['k', 'm'] : ['k']) {
          const o = this.ptNode(b, kind, i), key = `${b}:${kind}:${i}`;
          if (i || kind === 'm') h += `<i class="tl${o.st === 'own' ? ' on' : ''}"></i>`;
          h += `<button class="tn ${o.st}${kind === 'k' ? ' key' : ' minor'}${this.ptSel === key ? ' sel' : ''}" data-pt="${key}"><b>${o.name}</b><span>${o.label}</span></button>`;
        }
      }
      h += '</div>';
    }
    h += '</div>';
    const btns = [];
    if (this.ptSel) {
      const [b, kind, si] = this.ptSel.split(':'), i = +si, o = this.ptNode(b, kind, i);
      h += `<div class="st-detail"><b style="color:${PASSIVE_BRANCHES[b].color}">${o.name}</b> <span class="muted">${PASSIVE_BRANCHES[b].name} · ${kind === 'k' ? '특성' : '단련'} · Lv${o.lvl}${o.price ? ' · ' + fmt(o.price) + '₵' : ''}</span><br>${o.desc}${o.why ? `<br><span class="muted">${o.why}</span>` : ''}</div>`;
      if (kind === 'k' && o.st === 'avail') btns.push([`특성 「${o.name}」 선택`, () => { UI.choosePerk(i, o.perk); this.passiveTree(); }]);
      if (kind === 'm' && !o.why) btns.push([`${o.name} 구입 (${fmt(o.price)}₵)`, () => this.buyPassive(b, i)]);
    }
    btns.push(['닫기', () => { this.ptSel = null; UI.close('dialog'); }]);
    const keep = $('dialog-text').scrollTop, same = $('dialog-name').textContent.startsWith('패시브 트리'); // 노드를 누를 때 스크롤 위치 유지
    UI.dialog('패시브 트리 — 특성 · 단련', h, btns); if (same) $('dialog-text').scrollTop = keep;
    $('dialog-text').querySelectorAll('[data-pt]').forEach(el => { el.onclick = () => { this.ptSel = el.dataset.pt; SFX.play('ui'); this.passiveTree(); }; });
  },
  buyPassive(b, i) {
    const p = G.player, n = PASSIVES[b][i];
    if (p.credits < n.price) { log('크레딧이 부족합니다.', '#f88'); SFX.play('empty'); return; }
    const before = PlayerStats.maxHp(p);
    p.credits -= n.price; p.passive[n.id] = true; p.hp += Math.max(0, PlayerStats.maxHp(p) - before);
    log(`단련: ${n.name} — ${n.desc}`, '#7fd'); UI.toast('패시브 단련', `${PASSIVE_BRANCHES[b].name} — ${n.name}`);
    SFX.play('levelup'); UI.refreshStats(); saveGame(); this.passiveTree();
  },
  buySkill(s, k) {
    const p = G.player, cost = k ? SKILL_SP[k] : SKILL_SP.root; // v1.25 스킬 포인트
    if ((p.sp || 0) < cost) { log('스킬 포인트가 부족합니다.', '#f88'); SFX.play('empty'); return; }
    p.sp -= cost; p.srank = p.srank || {};
    if (k) { p.smodOwned[s.id + '_' + k] = true; if (!p.skillMods[s.id]) p.skillMods[s.id] = k; log(`스킬 갈래 획득: ${s.name} — ${SKILL_MODS[s.id][k].name}`, '#7fd'); }
    else if (p.skills[s.id]) { p.srank[s.id] = srank(s.id) + 1; log(`${s.name} ${p.srank[s.id]}등급 — 위력 +${Math.round((rankMul(s.id) - 1) * 100)}%`, '#7fd'); } // v1.26 등급
    else { p.skills[s.id] = true; p.srank[s.id] = 1; const on = Hotbar.autoAdd('sk' + SKILLS.indexOf(s)), k = p.hotbar.indexOf('sk' + SKILLS.indexOf(s)) + 1; log(`스킬을 배웠다: ${s.name}${on ? ` [${k}번 칸]` : ' — 벨트 칸이 가득: B로 등록'}`, '#7fd'); UI.toast('스킬 습득', on ? `${s.name} — ${k}번 칸` : `${s.name} — 벨트 칸이 가득합니다 (B로 바꾸기)`); }
    SFX.play('levelup'); UI.buildHotbar(); UI.refreshStats(); saveGame(); if (UI.isOpen('skills')) this.renderSkills();
  },


  // v1.15 첫 플레이 안내: 이 게임의 한 판 흐름 + 조작 (한 번만)
  welcome() {
    if (UI.anyOpen()) return;
    const k = (pc, m) => IS_TOUCH ? m : pc;
    UI.dialog('생존 수칙 — 시청역 캠프', `<div class="welcome">`
      + `<b>1. 출격</b> 캠프의 <b>작전 장교 윤씨</b>에게서 맵을 골라 나간다.<br>`
      + `<b>2. 뒤지고 싸운다</b> 노란 반짝임 = 뒤질 곳 ${k('[E]', '(E 버튼)')} · 미니맵 노란 ◆ = 사건 · 붉은 예고(「!」·원·선)가 보이면 ${k('Space', '슬라이딩 버튼')}로 슬라이딩.<br>`
      + `<b>3. 탈출해야 내 것</b> 주운 장비·크레딧은 맵 끝 초록 ◎에 5초 머물러야 확정. 죽으면 그 자리에 시체 가방.<br>`
      + `<b>4. 캠프에서 성장</b> 레벨 업 능력치·특성 ${k('(C)', '(능력치 버튼)')} · 정비공 강화 · 대장 한씨의 캠프 시설 · 창고에 귀중품 보관.<br><br>`
      + `<span class="muted">${k('WASD 이동 · 마우스 조준·클릭 공격 · R 재장전 · Q 무기 교체 · 1~8 벨트 칸 (스킬·구급상자·소모품, B로 등록) · K 스킬 · I 가방 · J 임무', '왼쪽 끌기 이동 · 오른쪽 끌기 조준·공격 · 아래 칸 스킬·소모품')}</span></div>`,
      [['출발하자', () => UI.close('dialog')]]);
  },

  captainDialog(npc) {
    const p = G.player, c = Story.chapter(p), bye = ['닫기', () => UI.close('dialog')], fac = ['캠프 시설', () => Camp.open()]; // v1.13
    if (!c) {
      UI.dialog(npc.name, '"자네 덕분에 서울에 다시 사람이 살 수 있게 됐어. 고맙네, 영웅."', [fac, bye]);
    } else if (p.quest.active) {
      const st = c.steps[p.quest.step];
      UI.dialog(npc.name, `<b style="color:#e0b23a">[${c.title}]</b><br>"${st.text}"<br><span class="muted">끝나면 무전으로 연락하지. 캠프로 돌아올 필요 없네.</span>`, [fac, bye]);
    } else if (p.level < c.minLevel) {
      UI.dialog(npc.name, `"아직은 위험해. 좀 더 강해져서 오게."<br><span class="muted">${c.title} — Lv${c.minLevel} 이상</span>`, [fac, bye]);
    } else {
      UI.dialog(npc.name, `<b style="color:#e0b23a">[${c.title}]</b><br>"${c.intro}"<br><br><span class="muted">${c.steps.map((st, i) => `${i + 1}. ${Story.objective(st)}`).join('<br>')}</span>`, [
        ['수락', () => { UI.close('dialog'); Story.start(p); }],
        fac, ['나중에', () => UI.close('dialog')]]);
    }
  },

  // ---------------- 상점 ----------------
  openShop() {
    const p = G.player;
    if (G.shopLevel !== p.level || !G.shopStock) {
      G.shopLevel = p.level;
      const stock = [];
      const rr = p.level >= 10 ? 1 : 0; // v1.25 상점은 일반·고급까지만 (좋은 장비는 파밍으로)
      for (const k of Object.keys(WEAPONS)) if (WEAPONS[k].lvl <= p.level + 2) stock.push(makeWeapon(k, p.level, rr));
      for (const k of Object.keys(ARMORS)) if (ARMORS[k].lvl <= p.level + 2) stock.push(makeArmor(k, p.level, rr));
      for (const k of Object.keys(HELMETS)) if (HELMETS[k].lvl <= p.level + 2) stock.push(makeHelmet(k, p.level, rr));
      for (let t = 1; t <= 2; t++) if (BELTS[t].lvl <= p.level + 2) stock.push(makeBelt(t)); // v1.24 벨트 (특수부대 장구류는 뒤지기에서만)
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
      row(`${ICON(c.icon)} ${c.name} <span class="muted">${c.desc}</span>`, c.price, () => UI.buy(makeConsumable(k, 1), c.price));
    }
    for (const it of G.shopStock) {
      const req = itemReqLevel(it);
      row(`${itemIcon(it)} <span class="r${it.rarity}">${itemName(it)}</span>` + (req > p.level ? ` <span style="color:#f66">(Lv${req} 필요)</span>` : '') + `<br>${itemHtml(it)}`,
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
    const junk = p.inventory.filter(it => it.kind !== 'cons' && it.rarity <= 1 && !it.plus && !it.locked && !it.set && !isUpgrade(p, it));
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

// v1.24 벨트 칸 (핫바). p.hotbar[i] = 'sk0'~'sk3' | 'med' | 'throw' | 'util' | null. 보이는 칸 = 벨트 등급 (2 · 4 · 6 · 8)
const HOT_ACTS = () => SKILLS.map((s, i) => G.player.skills[s.id] ? ['sk' + i, s.name] : null).filter(Boolean).concat([['med', '구급상자'], ['throw', '투척물 (화염병·섬광탄·지뢰)'], ['util', '보조 (자극제·방탄판)']]);
const Hotbar = {
  use(i) {
    const p = G.player;
    if (i >= beltSlots(p)) { log(`${i + 1}번 칸이 없습니다 — 더 좋은 벨트가 필요합니다 (지금 ${beltSlots(p)}칸).`, '#aaa'); return; }
    const act = p.hotbar[i];
    if (!act) { log(`${i + 1}번 칸이 비어 있습니다 — B 또는 벨트 칸을 눌러 등록하세요.`, '#aaa'); return; }
    if (act.startsWith('sk')) useSkill(+act.slice(2));
    else if (act === 'med') quickMedkit();
    else Gadgets.use(act);
  },
  assign(i, act) {
    const p = G.player;
    if (act) { const j = p.hotbar.indexOf(act); if (j >= 0) p.hotbar[j] = null; } // 한 가지는 한 칸에만
    p.hotbar[i] = act || null;
    UI.buildHotbar(); saveGame();
  },
  autoAdd(act) { // 새로 배운 스킬: 빈 칸이 있으면 자동 등록
    const p = G.player;
    if (p.hotbar.includes(act)) return true;
    for (let i = 0; i < beltSlots(p); i++) if (!p.hotbar[i]) { p.hotbar[i] = act; UI.buildHotbar(); return true; }
    return false;
  },
  edit() {
    const p = G.player, n = beltSlots(p), acts = HOT_ACTS();
    let h = `<div class="muted">벨트 「${p.equip.belt ? p.equip.belt.name : '맨몸'}」 · <b>${n}칸</b> (벨트 등급마다 2 · 4 · 6 · 8칸) · 칸에 넣을 것을 고르세요. 슬라이딩은 항상 따로 있습니다.</div><div class="hb-edit">`;
    for (let i = 0; i < HOT_MAX; i++) {
      if (i >= n) { h += `<div class="hb-row off"><span class="tag">${i + 1}</span> <span class="muted">${ICON('lock')} ${BELTS.find(b => b.slots > i).name} 이상</span></div>`; continue; }
      h += `<div class="hb-row"><span class="tag">${i + 1}</span> <select data-hb="${i}"><option value="">— 비움 —</option>${acts.map(([a, nm]) => `<option value="${a}"${p.hotbar[i] === a ? ' selected' : ''}>${nm}</option>`).join('')}</select></div>`;
    }
    h += '</div>';
    if (SKILLS.some(s => !p.skills[s.id])) h += '<div class="muted">스킬은 스킬 창(K)에서 스킬 포인트로 배우면 여기 목록에 나옵니다.</div>';
    UI.dialog('벨트 — 칸 등록', h, [['닫기', () => UI.close('dialog')]]);
    $('dialog-text').querySelectorAll('select[data-hb]').forEach(el => { el.onchange = () => { Hotbar.assign(+el.dataset.hb, el.value); SFX.play('ui'); Hotbar.edit(); }; });
  },
};
