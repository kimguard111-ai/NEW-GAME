// v1.50 총기 부품 (프롬프트 22): 총마다 4칸 — 조준경 · 총구 · 손잡이 · 탄창
// 부품은 총에 붙어 다님 (총을 잃으면 부품도 같이) · 출격에서 주운 부품은 탈출해야 끼울 수 있음
// 효과 수치는 모두 곱하는 값 (1 = 그대로). adsMove 는 조준 중 이동 속도(기본 60%)에 곱함
const ATT_SLOTS = { scope: '조준경', muzzle: '총구', grip: '손잡이', mag: '탄창' };
const ATTACHMENTS = {
  reddot:     { slot: 'scope', name: '도트 조준경', r: 1, lvl: 3, price: 180, guns: ['smg', 'shotgun', 'rifle', 'lmg'], desc: '조준 퍼짐 -15% · 조준이 빨라짐', adsSpread: 0.85, adsTime: 0.6 },
  scope2:     { slot: 'scope', name: '2배 조준경', r: 2, lvl: 6, price: 320, guns: ['rifle', 'lmg', 'sniper'], desc: '조준 퍼짐 -30% · 조준할 때 더 멀리 봄', adsSpread: 0.7, adsLead: 1.35 },
  scope4:     { slot: 'scope', name: '4배 저격 조준경', r: 3, lvl: 10, price: 600, guns: ['rifle', 'sniper'], desc: '조준 퍼짐 -50% · 조준할 때 아주 멀리 봄 · 조준 중 더 느림', adsSpread: 0.5, adsLead: 1.8, adsMove: 0.75, adsTime: 1.4 },
  suppressor: { slot: 'muzzle', name: '소음기', r: 2, lvl: 4, price: 300, guns: ['pistol', 'smg', 'rifle', 'sniper'], desc: '총소리로 적이 몰려오는 거리 -60% · 피해 -5%', noise: 0.4, dmg: 0.95 },
  comp:       { slot: 'muzzle', name: '보정기', r: 1, lvl: 3, price: 200, guns: ['smg', 'rifle', 'lmg'], desc: '연사할 때 퍼짐 -20% · 화면 반동 -40%', autoSpread: 0.8, kick: 0.6 },
  choke:      { slot: 'muzzle', name: '산탄 조임쇠', r: 1, lvl: 5, price: 220, guns: ['shotgun'], desc: '산탄 퍼짐 -30% (멀리서도 맞음)', spread: 0.7 },
  vgrip:      { slot: 'grip', name: '수직 손잡이', r: 1, lvl: 3, price: 180, guns: ['smg', 'rifle', 'lmg', 'shotgun'], desc: '연사할 때 퍼짐 -20%', autoSpread: 0.8 },
  agrip:      { slot: 'grip', name: '앵글 손잡이', r: 1, lvl: 4, price: 200, guns: ['smg', 'rifle', 'shotgun'], desc: '조준 중 이동 속도 60% → 75% · 조준이 빨라짐', adsMove: 1.25, adsTime: 0.75 },
  laser:      { slot: 'grip', name: '레이저', r: 1, lvl: 2, price: 160, guns: ['pistol', 'smg', 'shotgun', 'rifle', 'sniper', 'lmg'], desc: '조준하지 않고 쏠 때 퍼짐 -25%', hipSpread: 0.75 },
  extmag:     { slot: 'mag', name: '확장 탄창', r: 1, lvl: 3, price: 200, guns: ['pistol', 'smg', 'rifle', 'sniper'], desc: '장탄 +50% · 재장전 15% 느림', mag: 1.5, reload: 1.15 },
  dualmag:    { slot: 'mag', name: '쌍탄창', r: 2, lvl: 5, price: 280, guns: ['smg', 'rifle'], desc: '재장전 30% 빠름', reload: 0.7 },
  drum:       { slot: 'mag', name: '드럼 탄창', r: 2, lvl: 7, price: 380, guns: ['smg', 'rifle', 'lmg', 'shotgun'], desc: '장탄 +100% · 재장전 35% 느림 · 들고 있으면 이동 -5%', mag: 2, reload: 1.35, move: 0.95 },
};
const GUN_NAMES = { pistol: '권총', smg: '기관단총', shotgun: '산탄총', rifle: '소총', sniper: '저격총', lmg: '기관총' };

function makeAttach(key) {
  const A = ATTACHMENTS[key];
  return { id: nextItemId++, kind: 'att', key, rarity: A.r, name: A.name, value: A.price, ilvl: A.lvl, isNew: true };
}
// 레벨에 맞는 부품 하나 (좋은 부품일수록 드묾)
function randomAttach(level) {
  const keys = Object.keys(ATTACHMENTS).filter(k => ATTACHMENTS[k].lvl <= level + 2);
  const w = keys.map(k => [1, 3, 2, 1][ATTACHMENTS[k].r] || 1), tot = w.reduce((a, b) => a + b, 0);
  let x = Math.random() * tot; for (let i = 0; i < keys.length; i++) { if ((x -= w[i]) <= 0) return makeAttach(keys[i]); }
  return makeAttach(keys[0] || 'laser');
}
// 끼운 부품들의 효과를 곱함 (w 가 없거나 근접 무기면 1)
function attMul(w, prop) {
  if (!w || !w.att) return 1;
  let m = 1;
  for (const s in w.att) { const it = w.att[s], A = it && ATTACHMENTS[it.key]; if (A && A[prop] !== undefined) m *= A[prop]; }
  return m;
}
function attFits(w, part) { return !!(w && w.kind === 'weapon' && part && part.kind === 'att' && !WEAPONS[w.key].melee && ATTACHMENTS[part.key].guns.includes(w.key)); }
function attSlotsOf(w) { return Object.keys(ATT_SLOTS).filter(s => Object.values(ATTACHMENTS).some(A => A.slot === s && A.guns.includes(w.key))); }

const Attach = {
  // 가방의 부품을 총에 끼움 (그 칸에 있던 부품은 가방으로)
  put(w, part) {
    const p = G.player;
    if (!attFits(w, part)) return false;
    if (part.raid) { log('출격에서 주운 부품은 탈출해야 끼울 수 있다.', '#f88'); return false; }
    const slot = ATTACHMENTS[part.key].slot, old = w.att && w.att[slot];
    const idx = p.inventory.indexOf(part); if (idx < 0) return false;
    p.inventory.splice(idx, 1);
    if (old) p.inventory.push(old);
    w.att = w.att || {}; w.att[slot] = part; part.isNew = false;
    this.fixMag(w);
    SFX.play('equip'); log(`${itemName(w)}에 ${part.name}을(를) 끼웠다.`, '#9fd0ff'); return true;
  },
  // 총에서 빼서 가방으로
  take(w, slot) {
    const p = G.player, part = w.att && w.att[slot];
    if (!part) return false;
    if (p.inventory.length >= Camp.bagSize()) { log('가방이 꽉 찼다.', '#f88'); return false; }
    w.att[slot] = null; p.inventory.push(part);
    this.fixMag(w);
    SFX.play('ui'); return true;
  },
  fixMag(w) { if (w.loaded > magSize(w)) { G.player.ammo[WEAPONS[w.key].ammo] = (G.player.ammo[WEAPONS[w.key].ammo] || 0) + w.loaded - magSize(w); w.loaded = magSize(w); } },
  // 총 상세 창에 붙는 부품 칸 (HTML + 버튼 연결)
  panel(box, w) {
    const p = G.player, slots = attSlotsOf(w);
    if (!slots.length) return;
    const wrap = document.createElement('div'); wrap.className = 'att-box';
    wrap.innerHTML = `<div class="att-head">부품</div>`;
    for (const s of slots) {
      const cur = w.att && w.att[s], row = document.createElement('div'); row.className = 'att-row';
      const fits = p.inventory.filter(it => it && it.kind === 'att' && ATTACHMENTS[it.key].slot === s && attFits(w, it));
      row.innerHTML = `<span class="att-slot">${ATT_SLOTS[s]}</span>` + (cur
        ? `<button class="att-on" title="${ATTACHMENTS[cur.key].desc} · 눌러서 빼기">${itemIcon(cur)} ${cur.name} ✕</button>`
        : `<span class="muted">${fits.length ? '끼울 것 →' : '비어 있음'}</span>`);
      if (cur) row.querySelector('.att-on').onclick = () => { this.take(w, s); UI.refreshInventory(); };
      for (const it of fits) { const b = document.createElement('button'); b.className = 'att-put' + (it.raid ? ' raid' : ''); b.title = ATTACHMENTS[it.key].desc + (it.raid ? ' · 탈출해야 끼울 수 있음' : ''); b.innerHTML = itemIcon(it); b.title = `${cur ? '바꾸기' : '끼우기'}: ${it.name} · ` + b.title; b.onclick = () => { if (this.put(w, it)) UI.refreshInventory(); }; row.appendChild(b); }
      wrap.appendChild(row);
    }
    box.insertBefore(wrap, box.querySelector('.btns'));
  },
  // 부품 상세 창: 지금 든 총에 바로 끼우기
  partButtons(add, part) {
    const p = G.player;
    for (const sl of ['w1', 'w2']) { const w = p.equip[sl]; if (attFits(w, part)) add(`${sl === 'w1' ? '주무기' : '보조무기'}에 끼우기`, () => { if (this.put(w, part)) { UI.selected = w; UI.refreshInventory(); } }); }
  },
  html(part) {
    const A = ATTACHMENTS[part.key];
    return `<span class="muted">${ATT_SLOTS[A.slot]} 부품 · ${A.desc}</span><br><span class="role">끼울 수 있는 총: ${A.guns.map(g => GUN_NAMES[g]).join(' · ')}</span>`;
  },
};
