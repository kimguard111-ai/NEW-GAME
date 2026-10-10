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
  { id: 'cx2',    name: '희귀 도감',       desc: '도감 희귀 등급 장비 칸 모두 밝히기', ok: p => Journal.gearKeys().every(k => (p.codex.items[k] ?? -1) >= 2), r: { credits: 3000, chip: 5 } }, // v1.68 도감 등급 완성
  { id: 'cx3',    name: '영웅 도감',       desc: '도감 영웅 등급 장비 칸 모두 밝히기', ok: p => Journal.gearKeys().every(k => (p.codex.items[k] ?? -1) >= 3), r: { credits: 10000, chip: 15 } },
  { id: 'cx4',    name: '전설 도감',       desc: '도감 전설 등급 장비 칸 모두 밝히기', ok: p => Journal.gearKeys().every(k => (p.codex.items[k] ?? -1) >= 4), r: { credits: 40000, chip: 40 } },
  { id: 'cxFoe',  name: '서울 생태 보고서', desc: '도감의 적 모두 쓰러뜨리기', ok: p => Journal.foeList().every(f => p.codex.kills[f.name]), r: { credits: 15000, chip: 15 } },
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
    for (const k of ['kills', 'items', 'uniq', 'sets', 'myth']) p.codex[k] = p.codex[k] || {}; // v1.63 myth = 탈출해서 확보한 신화 무기
    if (!p.mythChk) { p.mythChk = true; for (const it of [...(p.inventory || []), ...Object.values(p.equip || {}), ...(p.stash || [])]) if (it && it.rarity === 5 && !it.raid && WEAPONS[it.key]) p.codex.myth[it.key] = true; } // 이미 가진 것
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
  // v1.63 신화 확보: 들고 탈출한 순간 (주웠을 때가 아니라 내 것이 됐을 때) — 처음이면 크게
  onMythSecured(items) {
    const p = G.player; this.ensure(p);
    for (const it of items.filter(it => it.rarity === 5 && WEAPONS[it.key] && WEAPONS[it.key].myth)) {
      const first = !p.codex.myth[it.key]; p.codex.myth[it.key] = true;
      const n = Object.keys(p.codex.myth).length, all = Object.keys(WEAPONS).filter(k => WEAPONS[k].myth).length, mc = RARITIES[5].color;
      UI.toast(`◆ 신화 무기 확보 ◆${first ? '' : ' (중복)'}`, `${itemName(it)} · 신화 ${n} / ${all}${n === all && first ? ' · 전부 모았다!' : ''}`);
      log(`신화 무기를 들고 살아 돌아왔다: ${itemName(it)} (${n}/${all})`, mc);
      if (first) { G.flash = { color: mc, t: 0, life: 1.0, a: 0.4 }; SFX.play('legend', 3); }
    }
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
  gearKeys() { return [...Object.keys(WEAPONS).filter(k => !WEAPONS[k].myth), ...Object.keys(ARMORS), ...Object.keys(HELMETS)]; }, // v1.68 도감 장비 목록
  // v1.68 도감 적 목록: g = 등급 (0 일반 · 1 정예 · 2 필드 보스 · 3 어설트 보스 · 4 최종) · art = 초상화 그림 키
  foeList() {
    if (this._foes) return this._foes;
    const L = [], seen = new Set(), add = (name, art, g, hint) => { if (!seen.has(name)) { seen.add(name); L.push({ name, art, g, hint }); } };
    for (const [k, d] of Object.entries(ENEMIES)) if (!d.boss) add(d.name, d.art || k, 0);
    for (const [k, d] of Object.entries(ELITES)) add(d.name, k, 1, '??? · 이야기 중 나타나는 정예');
    for (const d of Object.values(FIELD_BOSSES)) add(d.name, d.art, 2, '??? · 지역 어딘가의 필드 보스');
    for (const a of Object.values(ASSAULTS)) add(a.boss.name, a.boss.art, 3, '??? · 어설트 작전의 끝');
    for (const [k, d] of Object.entries(ENEMIES)) if (d.boss) add(d.name, d.art || k, 4, '??? · 방사능 지대의 군주');
    add(LAB_BOSS.name, LAB_BOSS.art, 4, '??? · 격리 연구소 깊은 곳');
    return (this._foes = L);
  },
  // v1.68 적 초상화: 서 있는 그림 첫 칸을 작게 (그림이 없거나 덜 읽혔으면 빈 칸 · 다음에 다시)
  portrait(key) {
    const P = this._por || (this._por = {}); if (P[key]) return P[key];
    const s = ART.sprites[key];
    if (!s || !s.ready) return 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    try {
      const cw = s.w || s.cell, row = (s.anims.idle || Object.values(s.anims)[0])[0], t = document.createElement('canvas'); t.width = cw; t.height = s.cell;
      const tg = t.getContext('2d'); tg.drawImage(s.img, 0, row * s.cell, cw, s.cell, 0, 0, cw, s.cell);
      const d = tg.getImageData(0, 0, cw, s.cell).data; let x0 = cw, y0 = s.cell, x1 = 0, y1 = 0; // 그림이 있는 범위만 잘라 크게
      for (let y = 0; y < s.cell; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < x0) { x0 = y0 = 0; x1 = cw - 1; y1 = s.cell - 1; }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, k = 60 / Math.max(bw, bh), c = document.createElement('canvas'); c.width = c.height = 64;
      c.getContext('2d').drawImage(t, x0, y0, bw, bh, (64 - bw * k) / 2, 62 - bh * k, bw * k, bh * k);
      return (P[key] = c.toDataURL());
    } catch (e) { return (P[key] = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='); }
  },
  bodyHtml() {
    const p = G.player; this.ensure(p);
    if (this.tab === 'codex') { // v1.68 도감: 장비는 등급(티어)별 · 못 찾은 것은 실루엣 · 적은 등급별 초상화
      const sub = this.cxTab || 'gear', st = (id, name) => `<button class="jtab cxsub${sub === id ? ' on' : ''}" data-cxtab="${id}">${name}</button>`;
      const tile = (on, img, name, col, tip, extra = '') => `<div class="cxt${on ? '' : ' no'}" title="${tip}" style="${on && col ? `border-color:${col}55` : ''}">${img}<span style="${on && col ? `color:${col}` : ''}">${on ? name : '???'}</span>${extra}</div>`;
      const head = (name, got, all, col, note = '') => `<div class="cxh"><b style="color:${col}">${name}</b> <span class="muted">${got} / ${all}${note ? ' · ' + note : ''}</span>${got >= all ? ' <span class="cxdone">완성</span>' : ''}</div><div class="cxbar"><i style="width:${Math.round(got / all * 100)}%;background:${col}"></i></div>`;
      const gk = this.gearKeys(), cnt = t => gk.filter(k => (p.codex.items[k] ?? -1) >= t).length;
      const fs = this.foeList(), fGot = fs.filter(f => p.codex.kills[f.name]).length;
      let h = `<div class="jtabs cxsubs">${st('gear', `장비 ${gk.reduce((a, k) => a + Math.max(0, (p.codex.items[k] ?? -1) + 1), 0)}/${gk.length * 5}`)}${st('foe', `적 ${fGot}/${fs.length}`)}</div>`;
      if (sub === 'foe') {
        for (const [g, gname, col] of [[0, '일반 적', '#cfcfcf'], [1, '정예', '#ffd76a'], [2, '필드 보스', '#ff9a4a'], [3, '어설트 보스', '#ff6a5a'], [4, '최종 보스', RARITIES[5].color]]) {
          const L = fs.filter(f => f.g === g); if (!L.length) continue;
          h += head(gname, L.filter(f => p.codex.kills[f.name]).length, L.length, col) + '<div class="cxg foe">';
          for (const f of L) { const c = p.codex.kills[f.name]; h += tile(c, `<img class="cxp" src="${this.portrait(f.art)}" alt="">`, f.name, col, c ? `${f.name} · ${fmt(c)}마리 처치` : (f.hint || '아직 쓰러뜨리지 못한 적'), c ? `<em>${fmt(c)}</em>` : ''); }
          h += '</div>';
        }
        return h;
      }
      h += '<div class="muted cxnote">같은 장비라도 더 높은 등급을 손에 넣어야 칸이 밝혀집니다. 실루엣의 정체를 찾아보세요.</div>';
      for (let t = 0; t < 5; t++) {
        const R = RARITIES[t]; h += head(R.name, cnt(t), gk.length, R.color) + '<div class="cxg">';
        for (const k of gk) { const D = GEAR_DEFS(k), on = (p.codex.items[k] ?? -1) >= t; h += tile(on, ICON(D.icon || k), D.name, R.color, on ? `${R.name} ${D.name}` : `??? · Lv${D.lvl || 1}+ 장비`); }
        h += '</div>';
      }
      const uk = Object.keys(UNIQUES), ug = uk.filter(k => p.codex.uniq[k]).length;
      h += head('고유', ug, uk.length, '#ff5aa0', '필드·지역 보스 전용') + '<div class="cxg">';
      for (const k of uk) { const U = UNIQUES[k], on = p.codex.uniq[k]; h += tile(on, ICON(WEAPONS[U.key] ? WEAPONS[U.key].icon || U.key : U.key), U.name, '#ff5aa0', on ? `${U.name} — ${U.desc}` : `??? · ${U.boss}에게서`); }
      const mk = Object.keys(WEAPONS).filter(k => WEAPONS[k].myth), mc = RARITIES[5].color, mg = mk.filter(k => p.codex.myth[k]).length;
      h += '</div>' + head('신화', mg, mk.length, mc, '바벨·타이탄·키메라 · 어설트 위협 5+ A 이상 · 탈출해야 등록') + '<div class="cxg myth">';
      for (const k of mk) { const on = p.codex.myth[k]; h += tile(on, ICON(WEAPONS[k].icon || k), WEAPONS[k].name, mc, on ? `${WEAPONS[k].name} — ${WEAPONS[k].role || ''}` : '??? · 신화 무기'); }
      h += '</div><div class="cxh"><b>세트</b></div><div class="codex">';
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
        + row('고유 장비', `${Object.keys(p.codex.uniq).length} / ${Object.keys(UNIQUES).length}`) + row('신화 무기', `${Object.keys(p.codex.myth || {}).length} / ${Object.keys(WEAPONS).filter(k => WEAPONS[k].myth).length}`) // v1.63
        + row('어설트 최고 위협 · S 등급', (() => { const a = Object.values(p.assaults || {}); return a.length ? `위협 ${Math.max(...a.map(x => x.tier || 1))} · S ${a.filter(x => x.best === 'S').length}곳` : '-'; })()) + row('업적', `${ACHIEVEMENTS.filter(a => p.ach[a.id]).length} / ${ACHIEVEMENTS.length}`);
    }
    return null; // 임무 탭은 기존 내용
  },
  bind(root) {
    root.querySelectorAll('[data-jtab]').forEach(b => { b.onclick = () => { this.tab = b.dataset.jtab; SFX.play('ui'); UI.refreshQuest(); }; });
    root.querySelectorAll('[data-cxtab]').forEach(b => { b.onclick = () => { this.cxTab = b.dataset.cxtab; SFX.play('ui'); UI.refreshQuest(); }; }); // v1.68 도감 장비 / 적
  },
};
