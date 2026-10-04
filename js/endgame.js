// 일일 의뢰 (v0.14 엔드게임): 하루(기기 날짜 기준)마다 의뢰 3개, 다 끝내면 추가 보상
// 진행은 처치·어설트·필드 보스·보급 상자·강화 등에서 Bounty.on(종류, 값) 으로 올림

const BOUNTIES = {
  kill:      { text: n => `적 ${n}마리 처치`, n: [40, 60], minLv: 1 },
  elite:     { text: n => `엘리트 몬스터 ${n}마리 처치`, n: [2, 4], minLv: 3 },
  crate:     { text: n => `건물 안 보급 상자 ${n}개 열기`, n: [3, 5], minLv: 1 },
  fieldBoss: { text: () => '필드 보스 1마리 처치', n: [1, 1], minLv: 4 },
  assault:   { text: () => '어설트 1회 클리어', n: [1, 1], minLv: 3 },
  hardAssault: { text: () => '위협 3 이상 어설트 클리어', n: [1, 1], minLv: 12 },
  enhance:   { text: n => `장비 강화 ${n}회 시도`, n: [3, 5], minLv: 1 },
  extract:   { text: n => `출격 후 탈출 ${n}회 성공`, n: [1, 2], minLv: 1 },
  titan:     { text: () => '방사능 군주 타이탄 처치', n: [1, 1], minLv: 18 },
};

const Bounty = {
  today() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },

  // 날짜가 바뀌면 새 의뢰 3개 (레벨에 맞는 종류 중에서)
  refresh() {
    const p = G.player, day = this.today();
    if (p.bounty && p.bounty.day === day) return;
    const keys = Object.keys(BOUNTIES).filter(k => p.level >= BOUNTIES[k].minLv), list = [];
    while (list.length < 3 && keys.length) {
      const k = keys.splice(Math.floor(Math.random() * keys.length), 1)[0], b = BOUNTIES[k];
      list.push({ k, need: randInt(b.n[0], b.n[1]), have: 0, done: false });
    }
    p.bounty = { day, list, bonus: false };
    if (G.running) log(`${ICON('bounty')} 오늘의 의뢰가 갱신되었습니다. (임무 창 J)`, '#8cf');
  },

  on(kind, v = 1) {
    const p = G.player;
    if (typeof Weekly !== 'undefined' && kind !== 'assault') Weekly.on(kind, v); // v1.15 주간 도전도 같은 신호로
    if (!p || !p.bounty) return;
    for (const b of p.bounty.list) {
      if (b.done) continue;
      if (b.k === kind || (b.k === 'hardAssault' && kind === 'assault' && v >= 3)) {
        b.have = Math.min(b.need, b.have + (b.k === 'hardAssault' || b.k === 'assault' ? 1 : v));
        if (b.have >= b.need) this.complete(b);
      }
    }
  },
  onKill(e) {
    if (e.minion) return;
    this.on('kill');
    if (e.affix) this.on('elite');
    if (e.def.boss) this.on('titan');
    if (e.fieldBoss) this.on('fieldBoss');
  },

  complete(b) {
    const p = G.player, lv = p.level;
    b.done = true;
    const hard = ['fieldBoss', 'hardAssault', 'titan'].includes(b.k);
    p.credits += lv * 100;
    Workshop.gain(6, hard ? 3 : 2);
    const it = randomGear(lv, 1.2, hard ? 3 : 2);
    if (!addItem(it)) G.drops.push({ x: p.x, y: p.y, kind: 'item', t: 0, item: it });
    UI.toast('의뢰 완료', `${BOUNTIES[b.k].text(b.need)} · +${fmt(lv * 100)}₵ · ${itemName(it)}`);
    log(`${ICON('bounty')} 의뢰 완료: ${BOUNTIES[b.k].text(b.need)} → ${itemName(it)}`, '#8cf');
    if (!p.bounty.bonus && p.bounty.list.every(x => x.done)) { // 3개 모두: 영웅 이상 + 전자 부품
      p.bounty.bonus = true;
      const big = randomGear(lv, 2, 3);
      if (!addItem(big)) G.drops.push({ x: p.x, y: p.y, kind: 'item', t: 0, item: big });
      Workshop.gain(10, 5);
      log(`${ICON('bounty')} 오늘의 의뢰 모두 완료! 보너스: ${itemName(big)}`, '#ffd76a');
    }
    saveGame();
  },

  trackerLine() {
    const bt = G.player.bounty;
    if (!bt) return '';
    const n = bt.list.filter(b => b.done).length;
    const cur = bt.list.find(b => !b.done);
    return `<br><span class="muted">${ICON('bounty')} 의뢰 ${n}/${bt.list.length}${cur ? ` · ${BOUNTIES[cur.k].text(cur.need)} ${cur.have}/${cur.need}` : ' · 완료'}</span>`;
  },
  panelHtml() {
    const bt = G.player.bounty;
    if (!bt) return '';
    let h = '<hr style="border-color:#333"><b>오늘의 의뢰</b> <span class="muted">— 매일 갱신 · 하나마다 크레딧·재료·희귀 이상 장비, 모두 완료 시 영웅 장비</span>';
    for (const b of bt.list) h += `<div class="step-row${b.done ? '' : ' cur'}">${b.done ? '✓' : '▶'} ${BOUNTIES[b.k].text(b.need)} <b>${b.have} / ${b.need}</b></div>`;
    if (bt.bonus) h += '<div class="step-row">★ 보너스 수령 완료</div>';
    return h;
  },
};

// v1.15 주간 도전: 주(월요일)마다 3개 — 하나마다 영웅 장비, 셋 다 끝내면 전설 장비 확정
const WEEKLIES = {
  elite:    { text: n => `엘리트 몬스터 ${n}마리 처치`, n: [25, 35], minLv: 5 },
  events:   { text: n => `출격 사건 ${n}개 완료 (보급·생존자·금고·둥지·발전기)`, n: [5, 7], minLv: 3 },
  fieldBoss:{ text: n => `필드 보스 ${n}마리 처치`, n: [3, 4], minLv: 6 },
  extract:  { text: n => `출격 후 탈출 ${n}회 성공`, n: [8, 10], minLv: 1 },
  mutator:  { text: () => '위협 6 이상 어설트 클리어 (변형 규칙)', n: [1, 1], minLv: 22 },
  kill:     { text: n => `적 ${n}마리 처치`, n: [600, 800], minLv: 1 },
};
const Weekly = {
  refresh() {
    const p = G.player, wk = weekNo();
    if (p.weekly && p.weekly.week === wk) return;
    const keys = Object.keys(WEEKLIES).filter(k => p.level >= WEEKLIES[k].minLv), list = [];
    while (list.length < 3 && keys.length) { const k = keys.splice(Math.floor(Math.random() * keys.length), 1)[0], b = WEEKLIES[k]; list.push({ k, need: randInt(b.n[0], b.n[1]), have: 0, done: false }); }
    p.weekly = { week: wk, list, bonus: false };
    if (G.running) log(`${ICON('bounty')} 이번 주 도전이 갱신되었습니다. (임무 창 J)`, '#ffb07a');
  },
  on(kind, v = 1) {
    const p = G.player; if (!p || !p.weekly) return;
    for (const b of p.weekly.list) {
      if (b.done || b.k !== kind) continue;
      if (kind === 'mutator' && v < 6) continue;
      b.have = Math.min(b.need, b.have + (kind === 'mutator' ? 1 : v));
      if (b.have >= b.need) this.complete(b);
    }
  },
  complete(b) {
    const p = G.player, lv = p.level; b.done = true;
    p.credits += lv * 300; Workshop.gain(10, 4);
    const it = randomGear(lv, 1.5, 3); if (!addItem(it)) G.drops.push({ x: p.x, y: p.y, kind: 'item', t: 0, item: it });
    UI.toast('주간 도전 완료', `${WEEKLIES[b.k].text(b.need)} · +${fmt(lv * 300)}₵ · ${itemName(it)}`);
    log(`${ICON('bounty')} 주간 도전 완료: ${WEEKLIES[b.k].text(b.need)} → ${itemName(it)}`, '#ffb07a');
    if (!p.weekly.bonus && p.weekly.list.every(x => x.done)) {
      p.weekly.bonus = true;
      const big = randomGear(lv, 2, 4); if (!addItem(big)) G.drops.push({ x: p.x, y: p.y, kind: 'item', t: 0, item: big });
      Workshop.gain(20, 10); SFX.play('legend');
      UI.toast('★ 주간 도전 전부 완료 ★', `전설 장비: ${itemName(big)}`);
    }
    saveGame();
  },
  panelHtml() {
    const w = G.player.weekly; if (!w) return '';
    const left = Math.ceil(((weekNo() + 1) * 7 - 3) - Date.now() / 864e5);
    let h = `<hr style="border-color:#333"><b style="color:#ffb07a">이번 주 도전</b> <span class="muted">— ${left}일 남음 · 하나마다 영웅 장비, 모두 완료 시 전설 장비</span>`;
    for (const b of w.list) h += `<div class="step-row${b.done ? '' : ' cur'}">${b.done ? '✓' : '▶'} ${WEEKLIES[b.k].text(b.need)} <b>${b.have} / ${b.need}</b></div>`;
    if (w.bonus) h += '<div class="step-row">★ 전설 보상 수령 완료</div>';
    return h;
  },
};
