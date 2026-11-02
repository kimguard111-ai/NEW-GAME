// v2.0.30 외형(스킨) · 성능은 하나도 안 바뀌는 꾸미기 — 머리 장식 9종 + 총알 궤적 색 5종
// 해금은 레벨(털모자 · 야구 모자) 아니면 업적 달성(p.ach)으로 계산 — 따로 저장하지 않음. 고른 것만 p.look 에 저장
// v2.0.32 팔 수 있는 항목은 ad(광고 횟수) · sku(상품 ID) 가 적혀 있음 — js/monetize.js 스위치(MONEY)가 켜져야 보임. 비행모 · 베레모 · 순백은 업적 전용(안 팖)
const ach = id => p => !!(p.ach && p.ach[id]); // 업적(도감 · 업적 창)을 달성했는지 — 달성은 저장되고 이미 한 것도 인정
const LOOK_HEADS = [
  { key: 'beanie', id: 'head_beanie', ad: 3, sku: 'head_beanie', price: '₩1,100',    name: '털모자',          desc: '레벨 5',                         ok: p => p.level >= 5 },
  { key: 'cap', id: 'head_cap', ad: 4, sku: 'head_cap', price: '₩1,100',       name: '야구 모자',        desc: '레벨 15',                        ok: p => p.level >= 15 },
  { key: 'bandana', id: 'head_bandana', ad: 6, sku: 'head_bandana', price: '₩1,100',   name: '반다나 · 선글라스', desc: '적 1,000마리 처치',               ok: ach('k1000') },
  { key: 'balaclava', id: 'head_balaclava', ad: 8, sku: 'head_balaclava', price: '₩1,500', name: '복면',            desc: '필드 보스 25마리 처치',            ok: ach('fb25') },
  { key: 'fox', id: 'head_fox', ad: 10, sku: 'head_fox', price: '₩1,900',       name: '여우 가면',        desc: '탈출 50회',                      ok: ach('ext50') },
  { key: 'hardhat', id: 'head_hardhat', ad: 12, sku: 'head_hardhat', price: '₩1,900',   name: '안전모 · 랜턴',    desc: '지하 연구소 B5 도달',              ok: ach('labB5') },
  { key: 'straw', id: 'head_straw', ad: 12, sku: 'head_straw', price: '₩1,500',     name: '밀짚모자',         desc: '적 5,000마리 처치',               ok: ach('k5000') },
  { key: 'aviator', id: 'head_aviator',   name: '비행모 · 고글',    desc: '스카이타워 옥상 보스 처치',         ok: ach('towerTop') },
  { key: 'beret', id: 'head_beret',     name: '베레모',          desc: '제7장 완료 · 서울 편 끝',          ok: ach('seoulEnd') },
];
const LOOK_TRACE = [
  { key: '', id: 'trace_gold',       name: '황금 (기본)', color: '#ffd27a', desc: '기본',                  ok: () => true },
  { key: 'cyan', id: 'trace_cyan', ad: 5, sku: 'trace_cyan', price: '₩1,100',   name: '청록',       color: '#6fe3ff', desc: '연속 처치 25',            ok: ach('combo25') },
  { key: 'violet', id: 'trace_violet', ad: 8, sku: 'trace_violet', price: '₩1,500', name: '보라',       color: '#c58aff', desc: '출격 맵의 적 모두 처치',   ok: ach('clear1') },
  { key: 'pink', id: 'trace_pink', ad: 10, sku: 'trace_pink', price: '₩1,500',   name: '분홍',       color: '#ff8ad0', desc: '어설트 위협 5 클리어',     ok: ach('tier5') },
  { key: 'white', id: 'trace_white',  name: '순백',       color: '#ffffff', desc: '연속 처치 50',            ok: ach('combo50') },
];
const Looks = {
  head(p) { const k = p.look && p.look.head; const h = k && LOOK_HEADS.find(x => x.key === k); return h && Unlocks.has(p, h) ? h : null; },
  trace(p) { const k = p.look && p.look.trace; const t = k && LOOK_TRACE.find(x => x.key === k); return t && Unlocks.has(p, t) ? t : null; },
  bulletColor(p, dflt) { const t = this.trace(p); return t ? t.color : dflt; },
  set(p, kind, key) { if (!p.look) p.look = { head: '', trace: '' }; p.look[kind] = key; },
  // 잠긴 항목 밑줄: 조건 · (광고/구매가 켜져 있으면) 얻는 방법
  lab(p, d, on) {
    if (on) return d.name;
    let t = '🔒 ' + d.desc;
    if (Unlocks.canAd(d)) t += `<br>📺 ${Unlocks.adCount(p, d.id)}/${d.ad}`;
    if (Unlocks.canBuy(d)) t += `${Unlocks.canAd(d) ? ' · ' : '<br>'}${d.price || '구매'}`;
    return t;
  },
  open() {
    const p = G.player; if (!p) return;
    const item = (d, kind, extra, inner) => { const on = Unlocks.has(p, d), sel = ((p.look && p.look[kind]) || '') === d.key, get = !on && Unlocks.canGet(d);
      return `<button class="look-it${extra}${sel ? ' sel' : ''}${on ? '' : ' lock'}${get ? ' get' : ''}" data-kind="${kind}" data-key="${d.key}" data-id="${d.id}" ${on || get ? '' : 'disabled'} title="${d.name} — ${d.desc}">${inner(d)}<span>${this.lab(p, d, on)}</span></button>`; };
    const heads = LOOK_HEADS.map(h => item(h, 'head', '', d => `<canvas width="64" height="64" data-head="${d.key}"></canvas>`)).join('');
    const tr = LOOK_TRACE.map(t => item(t, 'trace', ' look-tr', d => `<i style="background:${d.color}"></i>`)).join('');
    const none = `<button class="look-it${p.look && p.look.head ? '' : ' sel'}" data-kind="head" data-key=""><span style="margin-top:22px">쓰지 않음</span></button>`;
    UI.dialog('외형', `<div class="muted" style="margin-bottom:6px">성능은 바뀌지 않는 꾸미기입니다. 조건을 채우면 열립니다.${MONEY.ads || MONEY.iap ? ' 잠긴 것을 누르면 다른 방법으로도 얻을 수 있어요.' : ''}</div><div class="st2-head">머리 장식</div><div class="look-grid">${none}${heads}</div><div class="st2-head" style="margin-top:8px">총알 궤적 색</div><div class="look-grid tr">${tr}</div>`, [['닫기', () => UI.close('dialog')]]);
    const root = document.getElementById('dialog-text');
    root.querySelectorAll('canvas[data-head]').forEach(c => { const a = ART.heads && ART.heads[c.dataset.head]; if (!a || !a.ready) return; const [rx, ry, rw, rh] = a.rect, s = Math.min(60 / rw, 60 / rh), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a.img, rx, ry, rw, rh, (64 - rw * s) / 2, (64 - rh * s) / 2, rw * s, rh * s); });
    root.querySelectorAll('.look-it').forEach(b => { b.onclick = () => { if (b.disabled) return;
      const list = b.dataset.kind === 'head' ? LOOK_HEADS : LOOK_TRACE, d = list.find(x => x.id === b.dataset.id);
      if (d && !Unlocks.has(G.player, d)) { Unlocks.offer(G.player, d, () => Looks.open()); return; } // 잠긴 것 → 광고 · 구매
      Looks.set(G.player, b.dataset.kind, b.dataset.key); SFX.play('click'); saveGame(); Looks.open(); }; });
  },
};
