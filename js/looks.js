// v2.0.30 외형(스킨) · 성능은 하나도 안 바뀌는 꾸미기 — 머리 장식 9종 + 총알 궤적 색 5종
// 해금은 저장하지 않고 조건으로 바로 계산 (레벨 · 처치 · 보스 · 도전 던전). 고른 것만 p.look 에 저장
// 나중에 일부를 판매 아이템으로 돌릴 땐 각 항목의 ok 조건 앞에 「p.owned 에 있으면 해금」 한 줄만 더하면 됨
const LOOK_HEADS = [
  { key: 'beanie',    name: '털모자',          desc: '레벨 5',                ok: p => p.level >= 5 },
  { key: 'bandana',   name: '반다나 · 선글라스', desc: '적 100마리 처치',        ok: p => p.totalKills >= 100 },
  { key: 'cap',       name: '야구 모자',        desc: '레벨 10',               ok: p => p.level >= 10 },
  { key: 'balaclava', name: '복면',            desc: '보스 5마리 처치',        ok: p => p.bossKills >= 5 },
  { key: 'hardhat',   name: '안전모 · 랜턴',    desc: '지하 연구소 키메라 처치',  ok: p => (p.labKills || 0) >= 1 },
  { key: 'fox',       name: '여우 가면',        desc: '레벨 20',               ok: p => p.level >= 20 },
  { key: 'straw',     name: '밀짚모자',         desc: '적 1,000마리 처치',      ok: p => p.totalKills >= 1000 },
  { key: 'aviator',   name: '비행모 · 고글',    desc: '레벨 30',               ok: p => p.level >= 30 },
  { key: 'beret',     name: '베레모',          desc: '레벨 40 (만렙)',         ok: p => p.level >= 40 },
];
const LOOK_TRACE = [
  { key: '',       name: '황금 (기본)', color: '#ffd27a', desc: '기본',                 ok: () => true },
  { key: 'cyan',   name: '청록',       color: '#6fe3ff', desc: '적 300마리 처치',        ok: p => p.totalKills >= 300 },
  { key: 'violet', name: '보라',       color: '#c58aff', desc: '레벨 15',               ok: p => p.level >= 15 },
  { key: 'pink',   name: '분홍',       color: '#ff8ad0', desc: '보스 10마리 처치',       ok: p => p.bossKills >= 10 },
  { key: 'white',  name: '순백',       color: '#ffffff', desc: '레벨 35',               ok: p => p.level >= 35 },
];
const Looks = {
  head(p) { const k = p.look && p.look.head; const h = k && LOOK_HEADS.find(x => x.key === k); return h && h.ok(p) ? h : null; },
  trace(p) { const k = p.look && p.look.trace; const t = k && LOOK_TRACE.find(x => x.key === k); return t && t.ok(p) ? t : null; },
  bulletColor(p, dflt) { const t = this.trace(p); return t ? t.color : dflt; },
  set(p, kind, key) { if (!p.look) p.look = { head: '', trace: '' }; p.look[kind] = key; },
  open() {
    const p = G.player; if (!p) return;
    const heads = LOOK_HEADS.map(h => { const on = h.ok(p), sel = (p.look && p.look.head) === h.key;
      return `<button class="look-it${sel ? ' sel' : ''}${on ? '' : ' lock'}" data-kind="head" data-key="${h.key}" ${on ? '' : 'disabled'} title="${h.name} — ${h.desc}"><canvas width="64" height="64" data-head="${h.key}"></canvas><span>${on ? h.name : '🔒 ' + h.desc}</span></button>`; }).join('');
    const tr = LOOK_TRACE.map(t => { const on = t.ok(p), sel = ((p.look && p.look.trace) || '') === t.key;
      return `<button class="look-it look-tr${sel ? ' sel' : ''}${on ? '' : ' lock'}" data-kind="trace" data-key="${t.key}" ${on ? '' : 'disabled'} title="${t.name} — ${t.desc}"><i style="background:${t.color}"></i><span>${on ? t.name : '🔒 ' + t.desc}</span></button>`; }).join('');
    const none = `<button class="look-it${p.look && p.look.head ? '' : ' sel'}" data-kind="head" data-key=""><span style="margin-top:22px">쓰지 않음</span></button>`;
    UI.dialog('외형', `<div class="muted" style="margin-bottom:6px">성능은 바뀌지 않는 꾸미기입니다. 조건을 채우면 열립니다.</div><div class="st2-head">머리 장식</div><div class="look-grid">${none}${heads}</div><div class="st2-head" style="margin-top:8px">총알 궤적 색</div><div class="look-grid tr">${tr}</div>`, [['닫기', () => UI.close('dialog')]]);
    const root = document.getElementById('dialog-text');
    root.querySelectorAll('canvas[data-head]').forEach(c => { const a = ART.heads && ART.heads[c.dataset.head]; if (!a || !a.ready) return; const [rx, ry, rw, rh] = a.rect, s = Math.min(60 / rw, 60 / rh), g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(a.img, rx, ry, rw, rh, (64 - rw * s) / 2, (64 - rh * s) / 2, rw * s, rh * s); });
    root.querySelectorAll('.look-it').forEach(b => { b.onclick = () => { if (b.disabled) return; Looks.set(G.player, b.dataset.kind, b.dataset.key); SFX.play('click'); saveGame(); Looks.open(); }; });
  },
};
