// 정비공 작업대: 강화 · 분해 · 옵션 재조정 (v0.12 경제·제작)
// 재료 2종: 고철(모든 장비) · 전자 부품(희귀 이상 장비, 필드 보스·어설트 보상)

const MATS = {
  scrap: { name: '고철', icon: 'scrap' },
  chip:  { name: '전자 부품', icon: 'chip' },
};
// 등급별 분해 결과 (일반 · 고급 · 희귀 · 영웅 · 전설)
const SALVAGE = { scrap: [2, 4, 7, 12, 20], chip: [0, 0, 1, 3, 6] };
// 소모품 제작
const CRAFTS = {
  medkit: { scrap: 4 },
  ammo:   { scrap: 3 },
  // v1.14 작업대(캠프 시설) 단계에 따라 제작 목록이 늘어남
  molotov: { scrap: 3, bench: 1 },
  plate:   { scrap: 6, bench: 1 },
  flash:   { scrap: 2, chip: 1, bench: 2 },
  mine:    { scrap: 5, chip: 1, bench: 2 },
  stim:    { scrap: 2, chip: 2, bench: 3 },
};

const Workshop = {
  mode: 'enhance', sel: null,

  salvageYield(it) {
    const r = it.rarity || 0, plus = it.plus || 0;
    const m = Camp.salvageMul(); // v1.13 작업대 2단계
    return { scrap: Math.round((SALVAGE.scrap[r] + plus * 2) * m), chip: Math.round((SALVAGE.chip[r] + Math.floor(plus / 3)) * m) };
  },
  // 옵션 재조정 비용. full: 옵션 종류까지 바꿈 / 아니면 수치만 다시 굴림
  rerollCost(it, full) {
    const r = it.rarity || 0;
    return full ? { scrap: 5 * (r + 1), chip: [0, 0, 1, 2, 4][r], credits: 10 * it.ilvl }
                : { scrap: 3 * (r + 1), chip: [0, 0, 0, 1, 2][r], credits: 5 * it.ilvl };
  },
  canPay(c) { const p = G.player; return p.mats.scrap >= (c.scrap || 0) && p.mats.chip >= (c.chip || 0) && p.credits >= (c.credits || 0); },
  pay(c) { const p = G.player; p.mats.scrap -= c.scrap || 0; p.mats.chip -= c.chip || 0; p.credits -= c.credits || 0; },
  costText(c) {
    const p = G.player, part = (have, need, txt) => need ? `<span style="color:${have >= need ? '#ddd' : '#f66'}">${txt}</span>` : '';
    return [part(p.mats.scrap, c.scrap, `${ICON('scrap')}${c.scrap}`), part(p.mats.chip, c.chip, `${ICON('chip')}${c.chip}`),
      part(p.credits, c.credits, `${fmt(c.credits || 0)}₵`)].filter(Boolean).join(' ');
  },
  gain(scrap, chip, why) {
    const p = G.player;
    p.mats.scrap += scrap; p.mats.chip += chip;
    if (why) log(`${why}: ${ICON('scrap')} 고철 +${scrap}${chip ? `, ${ICON('chip')} 전자 부품 +${chip}` : ''}`, '#9fd');
  },
  matsText() { const m = G.player.mats; return `${ICON('scrap')} 고철 ${m.scrap} · ${ICON('chip')} 전자 부품 ${m.chip}`; },

  // ---------------- 화면 ----------------
  open(mode) {
    this.mode = mode;
    if (mode === 'enhance') { UI.openEnhance(); return; }
    UI.open('enhance');
    this.render();
  },
  tabs() {
    for (const b of document.querySelectorAll('#ws-tabs button')) {
      b.classList.toggle('on', b.dataset.ws === this.mode);
      b.onclick = () => this.open(b.dataset.ws);
    }
    $('ws-hint').innerHTML = (this.mode === 'enhance' ? '최씨: "한 단계마다 무기 피해·방어력이 8%씩 오른다. +10까지. 실패해도 부서지진 않아."'
      : this.mode === 'salvage' ? '최씨: "안 쓰는 건 뜯어서 고철·부품으로. 몸에 걸친 건 못 뜯는다."'
      : '최씨: "옵션 하나만 골라서 다시 맞춰 주지. 나머지는 그대로 둔다."') + `<br><b>${this.matsText()}</b>`;
  },
  render() {
    this.tabs();
    if (this.mode === 'enhance') return UI.renderEnhance();
    const p = G.player, list = $('enh-list'), box = $('enh-detail');
    const items = this.mode === 'salvage' ? p.inventory.filter(i => i.kind !== 'cons')
      : UI.enhanceList().filter(i => i.affixes && i.affixes.length);
    if (!items.includes(this.sel)) this.sel = items[0] || null;
    list.innerHTML = '';
    for (const it of items) {
      const slot = Object.keys(p.equip).find(k => p.equip[k] === it), y = this.salvageYield(it);
      const d = document.createElement('div');
      d.className = 'shop-item' + (it === this.sel ? ' sel' : '');
      d.innerHTML = `<span>${itemIcon(it)} <span class="r${it.rarity}">${itemName(it)}</span>${slot ? ' <span class="tag">장착</span>' : ''}${isUpgrade(p, it) ? ' <span class="mark up">▲</span>' : ''}</span>`
        + (this.mode === 'salvage' ? `<span class="muted">${ICON('scrap')}${y.scrap}${y.chip ? ' ' + ICON('chip') + y.chip : ''}</span>` : `<span class="muted">옵션 ${it.affixes.length}</span>`);
      d.onclick = () => { this.sel = it; this.render(); };
      list.appendChild(d);
    }
    if (this.mode === 'salvage') this.renderSalvage(box); else this.renderReroll(box);
  },

  renderSalvage(box) {
    const it = this.sel;
    let h = '';
    if (it) {
      const y = this.salvageYield(it);
      h += `<b class="r${it.rarity}">${itemIcon(it)} ${itemName(it)}</b><br>${itemHtml(it)}<br>분해 시 ${ICON('scrap')} 고철 ${y.scrap}${y.chip ? `, ${ICON('chip')} 전자 부품 ${y.chip}` : ''}`
        + `<div class="btns"><button id="ws-salvage">분해</button></div>`;
    } else h += '<span class="muted">분해할 장비가 없습니다.</span>';
    h += `<div class="btns"><button id="ws-bulk">일반·고급 일괄 분해</button></div><hr style="border-color:#333">소모품 제작`;
    for (const k of Object.keys(CRAFTS)) {
      const need = CRAFTS[k].bench || 0;
      if (need > Camp.lv('bench')) { h += `<div class="btns"><button disabled>${ICON(CONSUMABLES[k].icon)} ${CONSUMABLES[k].name} <span class="muted">— 작업대 ${need}단계 필요 (캠프 시설)</span></button></div>`; continue; }
      h += `<div class="btns"><button data-craft="${k}" ${this.canPay(CRAFTS[k]) ? '' : 'disabled'}>${ICON(CONSUMABLES[k].icon)} ${CONSUMABLES[k].name} 제작 (${this.costText(CRAFTS[k])})</button></div>`;
    }
    box.innerHTML = h;
    if (it) $('ws-salvage').onclick = () => this.salvage(it);
    $('ws-bulk').onclick = () => this.bulkSalvage();
    box.querySelectorAll('button[data-craft]').forEach(b => { b.onclick = () => this.craft(b.dataset.craft); });
  },
  salvage(it) {
    const p = G.player;
    if (Object.values(p.equip).includes(it)) return;
    if (it.locked) { log('잠긴 장비는 분해할 수 없습니다. (가방에서 잠금 해제)', '#f88'); return; } // v1.15
    if ((it.rarity >= 3 || it.plus >= 3) && !confirm(`${itemName(it)}을(를) 분해할까요? 되돌릴 수 없습니다.`)) return;
    const y = this.salvageYield(it);
    removeItem(it); this.gain(y.scrap, y.chip, `분해: ${itemName(it)}`);
    this.sel = null; this.after();
  },
  // 일반·고급 일괄 분해 (▲ 표시·강화된 장비 제외, 상점 일괄 판매와 같은 기준)
  bulkSalvage() {
    const p = G.player, junk = p.inventory.filter(it => it.kind !== 'cons' && it.rarity <= 1 && !it.plus && !it.locked && !it.set && !isUpgrade(p, it));
    if (!junk.length) { log('분해할 일반·고급 장비가 없습니다. (▲ 표시·강화된 장비는 제외)', '#aaa'); return; }
    let s = 0, c = 0;
    for (const it of junk) { const y = this.salvageYield(it); s += y.scrap; c += y.chip; removeItem(it); }
    this.gain(s, c, `장비 ${junk.length}개 일괄 분해`);
    this.sel = null; this.after();
  },
  craft(k) {
    if (!this.canPay(CRAFTS[k]) || (CRAFTS[k].bench || 0) > Camp.lv('bench')) return;
    if (!addItem(makeConsumable(k, 1))) { log('인벤토리가 가득 찼습니다.', '#f88'); return; }
    this.pay(CRAFTS[k]);
    log(`제작: ${CONSUMABLES[k].name}`, '#9fd');
    this.after();
  },

  renderReroll(box) {
    const it = this.sel;
    if (!it) { box.innerHTML = '<span class="muted">추가 옵션이 있는 장비(고급 이상)가 없습니다.</span>'; return; }
    const full = this.rerollCost(it, true), val = this.rerollCost(it, false);
    let h = `<b class="r${it.rarity}">${itemIcon(it)} ${itemName(it)}</b><br><span class="muted">${itemDesc(it)}</span>`;
    it.affixes.forEach((a, i) => {
      const d = AFFIXES[a.k], lo = rollAffixRange(a.k, it, 0), hi = rollAffixRange(a.k, it, 1);
      h += `<div class="ws-affix"><span class="affix">◆ ${affixText(a)}</span> <span class="muted">(범위 ${fmtAffix(d, lo)} ~ ${fmtAffix(d, hi)})</span><br>`
        + `<button data-i="${i}" data-full="0" ${this.canPay(val) ? '' : 'disabled'}>수치 재조정 ${this.costText(val)}</button> `
        + `<button data-i="${i}" data-full="1" ${this.canPay(full) ? '' : 'disabled'}>옵션 변경 ${this.costText(full)}</button></div>`;
    });
    if (it.legend) h += `<span class="legend">★ ${LEGENDARY[it.legend].name}: ${LEGENDARY[it.legend].desc}</span> <span class="muted">(고유 효과는 바뀌지 않음)</span>`;
    if (it.unique) h += `<span class="unique">◈ ${UNIQUES[it.unique].desc}</span> <span class="muted">(고유 효과는 바뀌지 않음)</span>`; // v1.12
    box.innerHTML = h;
    box.querySelectorAll('button[data-i]').forEach(b => { b.onclick = () => this.reroll(it, +b.dataset.i, b.dataset.full === '1'); });
  },
  reroll(it, i, full) {
    const c = this.rerollCost(it, full);
    if (!this.canPay(c)) return;
    this.pay(c);
    const old = it.affixes[i];
    let k = old.k;
    if (full) { // 다른 옵션과 겹치지 않는 새 종류 (가능하면 지금과 다른 것)
      const others = it.affixes.filter((_, j) => j !== i).map(a => a.k);
      let pool = affixPool(it.kind, it.key).filter(x => !others.includes(x));
      if (pool.length > 1) pool = pool.filter(x => x !== old.k);
      k = pick(pool);
    }
    it.affixes[i] = rollAffix(k, it.rarity, it.ilvl);
    log(`옵션 재조정: ${affixText(old)} → ${affixText(it.affixes[i])}`, '#c7a0ff');
    floatText(G.player.x, G.player.y - 40, affixText(it.affixes[i]), '#c7a0ff', 15);
    this.after();
  },

  after() { this.render(); UI.refreshInventory(); UI.refreshStats(); saveGame(); },
};

// 옵션 수치 범위 표시용 (t=0 최소, t=1 최대)
function rollAffixRange(k, it, t) {
  const a = AFFIXES[k];
  let v = lerp(a.min, a.max, t);
  if (a.perLvl) v *= 1 + it.ilvl * a.perLvl;
  return a.int ? v : a.pct ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
}
function fmtAffix(d, v) { return d.pct ? `${Math.round(v * 100)}%` : `${v}${d.unit || ''}`; }
