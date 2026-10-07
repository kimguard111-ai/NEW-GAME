// 도감 · 업적 · 기록 (v1.15): 임무 창(J)의 탭
// 도감: 처치한 적(이름 기준) · 손에 넣은 장비 종류(최고 등급) · 고유 장비 · 세트 조각
// 업적: 조건을 채우면 알림 + 작은 보상 (2초마다 확인)

const ACHIEVEMENTS = [
  { id: 'k100',   name: '첫 소탕',        desc: '적 100마리 처치',       ok: p => p.totalKills >= 100, r: { credits: 300 } },
  { id: 'k1000',  name: '도시의 청소부',   desc: '적 1,000마리 처치',     ok: p => p.totalKills >= 1000, r: { credits: 2000, chip: 3 } },
  { id: 'k5000',  name: '전설의 생존자',   desc: '적 5,000마리 처치',     ok: p => p.totalKills >= 5000, r: { credits: 10000, chip: 10 } },
  { id: 'combo25', name: '연쇄 반응',      desc: '연속 처치 25',          ok: p => (p.bestCombo || 0) >= 25, r: { credits: 1000 } },
  { id: 'combo50', name: '멈추지 않는 손', desc: '연속 처치 50',          ok: p => (p.bestCombo || 0) >= 50, r: { credits: 3000, chip: 3 } },
  { id: 'ext1',   name: '살아 돌아오다',   desc: '첫 탈출 성공',          ok: p => (p.rec.extracts || 0) >= 1, r: { credits: 200 } },
  { id: 'ext50',  name: '베테랑 수색대',   desc: '탈출 50회',             ok: p => (p.rec.extracts || 0) >= 50, r: { credits: 5000, chip: 5 } },
  { id: 'raid10m', name: '오래 버티기',    desc: '한 출격에서 10분 이상 버티고 탈출', ok: p => (p.rec.longRaid || 0) >= 600, r: { credits: 2000 } },
  { id: 'rich',   name: '한탕',            desc: '한 출격에서 크레딧 5,000 이상 들고 탈출', ok: p => (p.rec.bestRaidCr || 0) >= 5000, r: { chip: 4 } },
  { id: 'fb1',    name: '사냥꾼',          desc: '필드 보스 처치',        ok: p => (p.fieldBossKills || 0) >= 1, r: { credits: 500 } },
  { id: 'fb25',   name: '보스 사냥 전문가', desc: '필드 보스 25마리 처치', ok: p => (p.fieldBossKills || 0) >= 25, r: { credits: 6000, chip: 6 } },
  { id: 'titan',  name: '군주 토벌',       desc: '타이탄 처치',           ok: p => (p.bossKills || 0) >= 1, r: { credits: 3000, chip: 4 } },
  { id: 'chimera', name: '격리 해제',      desc: '키메라 처치',           ok: p => (p.labKills || 0) >= 1, r: { credits: 3000, chip: 4 } },
  { id: 'story',  name: '서울의 영웅',     desc: '이야기 6장 완료',       ok: p => Story.done(p), r: { credits: 10000, chip: 10 } },
  { id: 'lv30',   name: '정점',            desc: 'Lv30 달성',             ok: p => p.level >= 30, r: { chip: 10 } },
  { id: 'leg1',   name: '빛나는 것',       desc: '전설 장비 손에 넣기',   ok: p => Object.values(p.codex.items).some(r => r >= 4), r: { credits: 1000 } },
  { id: 'uniq1',  name: '전리품',          desc: '보스 고유 장비 손에 넣기', ok: p => Object.keys(p.codex.uniq).length >= 1, r: { chip: 5 } },
  { id: 'uniqAll', name: '수집가',         desc: '보스 고유 장비 9종 모두', ok: p => Object.keys(p.codex.uniq).length >= Object.keys(UNIQUES).length, r: { credits: 30000, chip: 30 } },
  { id: 'set3',   name: '세트 완성',       desc: '세트 3부위 착용',       ok: p => Object.keys(SETS).some(k => setCount(p, k) >= 3), r: { chip: 5 } },
  { id: 'plus10', name: '장인의 손길',     desc: '+10 강화 장비',         ok: p => Raid.allItems().concat(p.stash).some(it => (it.plus || 0) >= 10), r: { chip: 8 } },
  { id: 'camp',   name: '재건',            desc: '캠프 시설 하나를 3단계로', ok: p => Object.values(p.camp || {}).some(l => l >= 3), r: { credits: 3000 } },
  { id: 'campAll', name: '서울의 새 심장', desc: '캠프 시설 전부 3단계',  ok: p => Object.keys(FACILITIES).every(k => (p.camp || {})[k] >= 3), r: { credits: 20000, chip: 20 } },
  { id: 'tier5',  name: '위협 제압',       desc: '어설트 위협 5 클리어',  ok: p => Object.values(p.assaults || {}).some(a => (a.tier || 1) >= 5), r: { chip: 6 } },
  { id: 'tier10', name: '불가능한 작전',   desc: '어설트 위협 10 클리어', ok: p => Object.values(p.assaults || {}).some(a => (a.tier || 1) >= 10), r: { credits: 20000, chip: 20 } },
  { id: 'ev20',   name: '현장 대응',       desc: '출격 사건 20개 완료',   ok: p => (p.rec.events || 0) >= 20, r: { credits: 3000, chip: 3 } },
  { id: 'clear1', name: '완전 소탕',       desc: '출격 맵의 적을 모두 처치', ok: p => (p.rec.clears || 0) >= 1, r: { credits: 3000, chip: 4 } },
  { id: 'perk6',  name: '완성된 생존자',   desc: '특성 6개 모두 선택',    ok: p => p.perks.filter(Boolean).length >= 6, r: { chip: 6 } },
];

const Journal = {
  t: 0, tab: 'quest',

  // ---------- 기록 ----------
  ensure(p) {
    p.codex = p.codex || { kills: {}, items: {}, uniq: {}, sets: {} };
    for (const k of ['kills', 'items', 'uniq', 'sets']) p.codex[k] = p.codex[k] || {};
    p.rec = p.rec || {}; p.ach = p.ach || {};
  },
  enemyName(e) { return e.bossName || (e.elite && ELITES[e.elite] && ELITES[e.elite].name) || (e.nest ? e.def.name : null) || e.def.name; },
  onKill(e) {
    const p = G.player; this.ensure(p);
    const n = this.enemyName(e); p.codex.kills[n] = (p.codex.kills[n] || 0) + 1;
  },
  onItem(it) {
    const p = G.player; if (!p || !it || it.kind === 'cons') return; this.ensure(p);
    p.codex.items[it.key] = Math.max(p.codex.items[it.key] ?? -1, it.rarity || 0);
    if (it.unique) p.codex.uniq[it.unique] = true;
    if (it.set) for (const [slot, key] of Object.entries(SETS[it.set].pieces)) if (key === it.key) p.codex.sets[it.set + ':' + slot] = true;
  },
  onExtract(r, credits) {
    const p = G.player; this.ensure(p);
    p.rec.extracts = (p.rec.extracts || 0) + 1;
    p.rec.longRaid = Math.max(p.rec.longRaid || 0, Math.round(r.t));
    p.rec.bestRaidCr = Math.max(p.rec.bestRaidCr || 0, credits);
    p.rec.bestRaidKills = Math.max(p.rec.bestRaidKills || 0, r.kills || 0);
  },
  onEvent() { const p = G.player; this.ensure(p); p.rec.events = (p.rec.events || 0) + 1; },

  // ---------- 업적 확인 ----------
  update(dt) {
    if ((this.t -= dt) > 0) return;
    this.t = 2;
    const p = G.player; if (!p || p.dead) return;
    this.ensure(p);
    for (const a of ACHIEVEMENTS) {
      if (p.ach[a.id]) continue;
      let ok = false; try { ok = a.ok(p); } catch (e) { ok = false; }
      if (!ok) continue;
      p.ach[a.id] = Date.now();
      if (a.r.credits) p.credits += a.r.credits;
      if (a.r.chip) Workshop.gain(0, a.r.chip);
      const rw = [a.r.credits ? `+${fmt(a.r.credits)}₵` : '', a.r.chip ? `전자 부품 +${a.r.chip}` : ''].filter(Boolean).join(' · ');
      UI.toast(`업적: ${a.name}`, `${a.desc} · ${rw}`);
      log(`${ICON('star')} 업적: ${a.name} (${a.desc}) ${rw}`, '#ffd76a');
      SFX.play('quest');
      return; // 한 번에 하나씩
    }
  },

  // ---------- 화면 (임무 창 탭) ----------
  tabsHtml() {
    const t = (id, name) => `<button class="jtab${this.tab === id ? ' on' : ''}" data-jtab="${id}">${name}</button>`;
    const p = G.player; this.ensure(p);
    const n = ACHIEVEMENTS.filter(a => p.ach[a.id]).length;
    return `<div class="jtabs">${t('quest', '임무')}${t('codex', '도감')}${t('ach', `업적 ${n}/${ACHIEVEMENTS.length}`)}${t('rec', '기록')}</div>`;
  },
  bodyHtml() {
    const p = G.player; this.ensure(p);
    if (this.tab === 'codex') {
      const names = new Set();
      for (const k of Object.keys(ENEMIES)) names.add(ENEMIES[k].name);
      for (const k of Object.keys(ELITES)) names.add(ELITES[k].name);
      for (const k of Object.keys(FIELD_BOSSES)) names.add(FIELD_BOSSES[k].name);
      names.add(LAB_BOSS.name);
      for (const k of Object.keys(ASSAULTS)) names.add(ASSAULTS[k].boss.name);
      const all = [...names], seen = all.filter(n => p.codex.kills[n]).length;
      let h = `<b>적</b> <span class="muted">${seen} / ${all.length}</span><div class="codex">`;
      for (const n of all) { const c = p.codex.kills[n]; h += `<div class="cx${c ? '' : ' no'}">${c ? n : '???'}<span>${c ? fmt(c) : ''}</span></div>`; }
      h += '</div>';
      const keys = [...Object.keys(WEAPONS).filter(k => !WEAPONS[k].illegal), ...Object.keys(ARMORS), ...Object.keys(HELMETS)], got = keys.filter(k => p.codex.items[k] !== undefined).length;
      h += `<b>장비</b> <span class="muted">${got} / ${keys.length} · 색 = 손에 넣은 최고 등급</span><div class="codex">`;
      for (const k of keys) { const r = p.codex.items[k]; h += `<div class="cx${r === undefined ? ' no' : ''}">${ICON(GEAR_DEFS(k).icon || k)} <span class="r${r ?? 0}">${r === undefined ? '???' : GEAR_DEFS(k).name}</span></div>`; }
      h += '</div>';
      const uk = Object.keys(UNIQUES);
      h += `<b style="color:#ff5aa0">고유 장비</b> <span class="muted">${uk.filter(k => p.codex.uniq[k]).length} / ${uk.length}</span><div class="codex">`;
      for (const k of uk) h += `<div class="cx${p.codex.uniq[k] ? '' : ' no'}"><span style="color:${p.codex.uniq[k] ? '#ff5aa0' : ''}">${p.codex.uniq[k] ? UNIQUES[k].name : `??? (${UNIQUES[k].boss})`}</span></div>`;
      h += '</div><b>세트</b><div class="codex">';
      for (const [sid, S] of Object.entries(SETS)) h += `<div class="cx"><span style="color:${S.color}">${S.name}</span><span>${['weapon', 'armor', 'helmet'].map(sl => p.codex.sets[sid + ':' + sl] ? '■' : '□').join('')}</span></div>`;
      return h + '</div>';
    }
    if (this.tab === 'ach') {
      let h = '<div class="muted">조건을 채우면 자동으로 보상을 받습니다.</div>';
      for (const a of ACHIEVEMENTS) {
        const ok = p.ach[a.id], rw = [a.r.credits ? `${fmt(a.r.credits)}₵` : '', a.r.chip ? `전자 부품 ${a.r.chip}` : ''].filter(Boolean).join(' · ');
        h += `<div class="ach${ok ? ' ok' : ''}">${ok ? '★' : '☆'} <b>${a.name}</b> <span class="muted">${a.desc} (${rw})</span></div>`;
      }
      return h;
    }
    if (this.tab === 'rec') {
      const r = p.rec, pt = p.playTime || 0;
      const row = (k, v) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`;
      return row('플레이 시간', `${Math.floor(pt / 3600)}시간 ${Math.floor(pt % 3600 / 60)}분`) + row('처치', fmt(p.totalKills)) + row('최대 연속 처치', p.bestCombo || 0)
        + row('사망', p.deaths || 0) + row('탈출 성공', r.extracts || 0) + row('가장 오래 버틴 출격', `${Math.floor((r.longRaid || 0) / 60)}분 ${(r.longRaid || 0) % 60}초`)
        + row('한 출격 최대 크레딧', `₵${fmt(r.bestRaidCr || 0)}`) + row('한 출격 최대 처치', r.bestRaidKills || 0) + row('완료한 출격 사건', r.events || 0) + row('맵 완전 소탕', r.clears || 0)
        + row('필드 보스 / 타이탄 / 키메라', `${p.fieldBossKills || 0} / ${p.bossKills || 0} / ${p.labKills || 0}`)
        + row('고유 장비', `${Object.keys(p.codex.uniq).length} / ${Object.keys(UNIQUES).length}`) + row('업적', `${ACHIEVEMENTS.filter(a => p.ach[a.id]).length} / ${ACHIEVEMENTS.length}`);
    }
    return null; // 임무 탭은 기존 내용
  },
  bind(root) {
    root.querySelectorAll('[data-jtab]').forEach(b => { b.onclick = () => { this.tab = b.dataset.jtab; SFX.play('ui'); UI.refreshQuest(); }; });
  },
};
