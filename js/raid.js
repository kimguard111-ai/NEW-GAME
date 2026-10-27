// 출격 · 탈출 (v1.3, Escape from Duckov 방식)
// 캠프(거점)에서 맵을 골라 출격 → 맵 가장자리의 탈출 지점에 5초 머물면 귀환
// 이번 출격에서 주운 장비(it.raid)·크레딧은 탈출해야 확정. 죽으면 그것만 잃음 (장착하고 있어도 이번 출격에서 주운 것이면 잃음)
// 캠프에서 가져간 장비·창고·이야기 보상·재료는 안전

const EXTRACT_TIME = 5;   // 탈출 지점에 머무는 시간 (초)
const EXTRACT_R = 70;     // 탈출 지점 반경 (px)
const STASH_SIZE = 48; // 기본값 — v1.13부터 실제 크기는 Camp.stashSize() (창고 증축)

// v1.56 맵마다 첫 재난문자 (실제 기관·상호 없이 그 시절 문자 말투)
const MAP_SMS = {
  myeongdong: '[서울특별시] 중구 일대 감염체 무리 이동 중. 지하상가 진입 금지. 생존자는 시청역 대피소로 이동 바랍니다.',
  jongno: '[서울특별시] 종로구 무장 약탈 집단 출몰. 단독 이동을 자제하고 큰길을 이용하십시오.',
  yongsan: '[군 당국] 용산 일대 무인 경비 체계 오작동. 철조망·검문소 접근 금지.',
  yeouido: '[서울특별시] 영등포구 방사능 수치 위험 단계. 방독면 없이 장시간 체류 금지.',
  gangnam: '[서울특별시] 강남구 민간 군사회사 무단 점거. 교전 위험 지역입니다.',
  jamsil: '[서울특별시] 송파구 변이체 둥지 확산. 호수 주변 접근을 금지합니다.',
  lab: '[방역 당국] 지하 연구시설 격리 해제 경보. 생물학적 위험. 즉시 대피하십시오.',
};
const Raid = {
  unlocked(id) { const d = MAPS[id]; return !!d && (V2_OPEN || id !== 'hangang') && (d.chapter === undefined || G.player.quest.ch >= d.chapter) && (!d.minLv || G.player.level >= d.minLv) && (!d.needLab || (G.player.labKills || 0) >= 1); }, // v1.77 연구소는 Lv30부터 · v1.78 타워는 키메라 처치 뒤
  inRaid() { return World.map !== 'camp'; },

  // 출격 지도 (작전 장교 대화)
  openMap() {
    const p = G.player, btns = [], med = (p.inventory.find(i => i.key === 'medkit') || { count: 0 }).count;
    let h = '<div class="mc-intro">"어디로 나갈 건가? 뭘 줍든 살아서 돌아와야 네 거야." <span class="muted">카드를 누르면 바로 나간다</span></div>'
      + `<div class="prep">출격 준비: 체력 <b style="color:${p.hp < PlayerStats.maxHp(p) * 0.7 ? '#ff8a8a' : 'inherit'}">${Math.round(p.hp)}/${PlayerStats.maxHp(p)}</b>${p.hp < PlayerStats.maxHp(p) * 0.7 ? ' <span style="color:#ff8a8a">(의무병 이씨에게 치료부터)</span>' : ''} · ${ICON('medkit')} 구급상자 <b>${med}</b> · 탄약 ${Object.entries(AMMO).map(([k, a]) => `${a.name} <b>${fmt(p.ammo[k] || 0)}</b>`).join(' ')} · 가방 <b>${Bag.used()}/${Bag.cells()}칸</b> · ₵${fmt(p.credits)}</div>`;
    btns.push([`${ICON('medkit')} +3 (120₵)`, () => { if (p.credits < 120) return log('크레딧이 부족합니다.', '#f88'); if (!addItem(makeConsumable('medkit', 3))) return log('가방이 가득 찼습니다.', '#f88'); p.credits -= 120; SFX.play('coin'); this.openMap(); }]);
    for (const [k, a] of Object.entries(AMMO)) btns.push([`${ICON('ammo_' + k)} ${a.name} +${a.pack} (${a.price}₵)`, () => { if ((p.ammo[k] || 0) >= ammoCap(p, k)) return log(`${a.name}은(는) 더 들 수 없다 (최대 ${ammoCap(p, k)})`, '#f88'); if (p.credits < a.price) return log('크레딧이 부족합니다.', '#f88'); addAmmo(p, k, a.pack); p.credits -= a.price; SFX.play('ammo'); this.openMap(); }]); // v1.33 탄약 4종
    h += `<div class="sum-head">${ICON('map')} 출격할 곳</div>`; // v1.45.2 맵 목록을 먼저 · 계약은 그 아래
    // v1.53.1 3×2 카드 (지하 연구소는 아래 가로 한 줄) · 지금 갈 곳에 「추천」 — 한 줄 목록이라 출격 버튼을 못 찾던 것
    const story = CHAPTER_MAP[p.quest.ch], rec = story && this.unlocked(story) ? story : [...MAP_ORDER].reverse().find(id => !MAPS[id].lab && this.unlocked(id) && ZONES[MAPS[id].zone].lvl[0] <= p.level) || 'myeongdong';
    const card = id => {
      const d = MAPS[id], z = ZONES[d.zone], ok = this.unlocked(id), gr = p.graves[id], lm = d.card ? { file: d.card } : d.landmark && ART.landmarks[d.landmark];
      const ev = ok && Camp.lv('radio') >= 1 ? `<div class="mc-ev">${ICON('radio')} ${Camp.planFor(id).map(k => EVENT_DEFS[k].name).join(' · ')}</div>` : ''; // v1.13 무전실 미리 보기
      return `<div class="map-card${ok ? ' go' : ' locked'}${id === rec && ok ? ' rec' : ''}${d.lab ? ' wide' : ''}"${ok ? ` data-map="${id}"` : ''}>`
        + (lm ? `<img class="mc-art${d.card ? ' scene' : ''}" src="${artURL(lm.file)}" alt="">` : `<div class="mc-art ico-art">${ICON(d.tower ? 'warn' : d.lab ? 'chip' : 'map')}</div>`)
        + `<div class="mc-body"><div class="mc-name">${ok ? '' : ICON('lock') + ' '}${d.name}${id === rec && ok ? ' <span class="mc-rec">추천</span>' : ''}</div>`
        + `<div class="mc-lv">${d.lab ? (D => `도전 · ${D.label(1)}~${D.label(D.floors)} · 적 Lv${D.lv(1)}~${D.lv(D.floors)}${p[D.best] ? ` · 최고 ${D.label(p[D.best])}` : ''}${gr && gr.floor ? ` · 가방 ${D.label(gr.floor)}` : ''}`)(DUNGEONS[id]) : `Lv${z.lvl[0]}~${z.lvl[1]}`}</div><div class="mc-desc">${ok ? z.desc : d.lock || `「${CHAPTERS[d.chapter].title}」에서 해금`}</div>`
        + (gr ? `<div class="mc-grave">${ICON('skull')} 시체 가방 (장비 ${gr.items.length})</div>` : '') + ev
        + (ok && id === DIFF_MAP && diffOpen(p) > 0 ? `<div class="mc-diff">${DIFFS.map((D, i) => i > diffOpen(p) ? `<span class="dbtn off">${ICON('lock')} ${D.name}</span>` : `<span class="dbtn" data-diff="${i}" style="border-color:${D.color};color:${D.color}">${D.name}${i ? ` <small>경험치 ×${D.exp} · 신화 ×${D.myth}</small>` : ''}</span>`).join('')}</div>${diffOpen(p) < 2 ? '<div class="muted" style="font-size:11px">헬: 하드에서 바벨을 쓰러뜨리면</div>' : ''}` : '') // v1.66 잠실 난이도
        + (ok ? '<div class="mc-go">▶ 출격</div>' : '') + '</div></div>';
    };
    h += `<div class="map-grid">${MAP_ORDER.filter(id => !MAPS[id].lab).map(card).join('')}</div>` + `<div class="map-grid dun">${MAP_ORDER.filter(id => MAPS[id].lab).map(card).join('')}</div>`; // v1.83.1 도전 던전 두 장을 한 줄에
    btns.push(['닫기', () => UI.close('dialog')]);
    UI.dialog('작전 장교 윤씨', h, btns); $('panel-dialog').classList.add('mapdlg');
    $('dialog-text').querySelectorAll('[data-map]').forEach(r => { r.onclick = () => { UI.close('dialog'); FirstRun.rules(() => this.deploy(r.dataset.map)); }; }); // v1.22 맵 이름을 눌러 바로 출격
    $('dialog-text').querySelectorAll('[data-diff]').forEach(b => { b.onclick = ev => { ev.stopPropagation(); UI.close('dialog'); FirstRun.rules(() => this.deploy(DIFF_MAP, +b.dataset.diff)); }; }); // v1.66 난이도 골라 출격
  },

  deploy(id, diff = 0) {
    const p = G.player; G.hurtLog = []; // v1.70 사망 원인 기록 초기화
    // v1.7 비상 보급: 구급상자도 돈도 없으면 2개, 예비 탄약이 바닥이면 120발 (죽음의 악순환 방지 — 봇 측정에서 발견)
    const med = p.inventory.find(i => i.key === 'medkit');
    if (!med && p.credits < 120 && addItem(makeConsumable('medkit', 2))) log('작전 장교 윤씨: "빈손으로 보낼 순 없지." (비상 구급상자 2개)', '#8cf');
    for (const t of gunAmmoTypes(p)) if ((p.ammo[t] || 0) < AMMO[t].pack / 2) { addAmmo(p, t, AMMO[t].pack); log(`작전 장교 윤씨: 비상 ${AMMO[t].name} ${AMMO[t].pack}발 지급`, '#8cf'); }
    if (Camp.medkits() && addItem(makeConsumable('medkit', Camp.medkits()))) log(`의무실: 구급상자 ${Camp.medkits()}개 지급`, '#8cf'); // v1.13
    saveGame();
    if (MAPS[id].lab) this.labFloor(1, id); // v1.77 첫 층부터 (v1.78 타워 포함)
    World.generate(id);
    this.resetWorld();
    const pts = World.edgePts, start = pts[Math.floor(Math.random() * pts.length)];
    G.exits = pts.filter(q => q !== start);
    if (MAPS[id].lab) G.exits = [dunExitPick(G.exits, start)];
    else { const n = FirstRun.rookie() ? 2 : Math.random() < 0.5 ? 1 : 2; G.exits = G.exits.sort(() => Math.random() - 0.5).slice(0, n); } // v1.82 일반 맵 탈출 지점 3 → 1~2 (첫 출격은 2) // v1.81 도전 던전: 탈출구 하나 (시작 자리에서 가장 먼 방)
    p.x = start.x; p.y = start.y; p.hp = Math.max(1, Math.min(p.hp, PlayerStats.maxHp(p))); p.stam = 100; // v1.57 출격 때 체력을 채워 주지 않음 (의무병 · 구급상자 의미)
    p.raid = { map: id, credits: 0, items: 0, t: 0, kills: 0, diff: id === DIFF_MAP ? Math.max(0, Math.min(diff, diffOpen(p))) : 0, floor: MAPS[id].lab ? 1 : 0 }; // v1.66 잠실 난이도 · v1.77 연구소 층
    if (FirstRun.rookie()) G.fbT = 1e9; // v1.45 첫 출격엔 필드 보스 없음
    G.extractT = 0; G.search = null;
    Scavenge.generate(); // v1.4 뒤질 곳
    G.grave = p.graves[id] || null; // v1.4 지난번 시체 가방
    if (G.grave && MAPS[id].lab && (G.grave.floor || 1) !== 1) G.grave = null; // v1.77 연구소: 쓰러진 층까지 내려가야 보임
    if (G.grave && World.def.lab) { // v1.5 연구소는 출격마다 구조가 바뀜 → 가장 가까운 바닥으로 옮김
      let best = null, bd = 1e9;
      for (let ty = 1; ty < World.H - 1; ty++) for (let tx = 1; tx < World.W - 1; tx++) {
        if (World.tiles[ty * World.W + tx] !== T.LFLOOR) continue;
        const d = Math.hypot(tx * TILE + 16 - G.grave.x, ty * TILE + 16 - G.grave.y);
        if (d < bd) { bd = d; best = [tx * TILE + 16, ty * TILE + 16]; }
      }
      if (best) [G.grave.x, G.grave.y] = best;
    }
    if (G.grave) log(`${ICON('skull')} 지난번에 쓰러진 자리에 시체 가방이 남아 있다. (미니맵 붉은 ✚)`, '#ff8a8a');
    { const D = DIFFS[p.raid.diff]; UI.toast(MAPS[id].name + (p.raid.diff ? ` · ${D.name}` : ''), p.raid.diff ? `적 Lv+${D.lv} · 체력 ×${D.hp} · 피해 ×${D.dmg} · 경험치 ×${D.exp} · 신화 ×${D.myth} · 바벨이 스카이타워에 나타남` : `탈출구 ${G.exits.length}곳, 미니맵 초록 ◎`); } // v1.39 · v1.66 난이도
    UI.smsQ = []; if (MAP_SMS[id]) UI.sms(MAP_SMS[id], 2.5); // v1.56 출격 시작 재난문자
    log(`${MAPS[id].name}. 나갈 길은 ${G.exits.filter(e => e.side).map(e => ({ N: '북', E: '동', S: '남', W: '서' })[e.side]).join(', ')}쪽 ${World.def.lab ? "비상구" : "끝"}.`, '#8cf'); // v1.39
    RaidEvents.generate(); // v1.10 돌발 사건 · 특수 탈출
    if (World.def.lab) { this.labLiftEvent(); const D = DUNGEONS[id]; p[D.best] = Math.max(p[D.best] || 0, 1); } // v1.77 승강기
    Pop.generate(start); // v1.16 맵 인구 (무한 스폰 없음)
    Hangang.reset(); // v2.0
    G.fade = { t: 0, life: 1.4, text: MAPS[id].name + (p.raid.diff ? ' · ' + DIFFS[p.raid.diff].name : '') + (p.raid.floor ? ' ' + DUNGEONS[id].label(p.raid.floor) : ''), sub: `Lv${ZONES[MAPS[id].zone].lvl[0]}~${ZONES[MAPS[id].zone].lvl[1]} · 적 약 ${Pop.total || '?'} · 탈출 지점 ${G.exits.length}곳` }; // v1.17
    if (World.def.lab) log(World.def.tower ? `스카이타워 20층. 바벨의 뿌리가 벽을 타고 올라간다. 가운데 방의 위층 계단(미니맵 ▲)으로 오를수록 강해진다 · 옥상에 무언가 있다 · 어느 층이든 비상구(초록 원) 한 곳으로 나갈 수 있다.` : `비상 전원만 남은 연구소 B1. 가운데 방의 승강기(미니맵 하늘색)로 내려갈수록 강해진다 · B${LAB_FLOORS} 격리실에 무언가 있다 · 어느 층이든 비상구(초록 원) 한 곳으로 나갈 수 있다.`, '#ff8a8a'); // v1.77 · v1.78
    saveGame();
  },

  // ---------- v1.77 지하 연구소 층 · v1.78 도전 던전 공통 (연구소 ▼ · 스카이타워 ▲) ----------
  labFloor(f, id = World.map) { World.labFloor = f; const D = DUNGEONS[id], lv = D.lv(f), Z = ZONES[MAPS[id].zone]; Z.lvl = [lv, f >= D.floors ? lv : lv + 1]; Z.spawns0 = Z.spawns0 || Z.spawns; Z.spawns = D.extra && f >= D.extra.f ? [...Z.spawns0, D.extra.spawn] : Z.spawns0; }, // v1.83 깊은 층부터 전용 적
  labLiftEvent() {
    for (const ex of G.exits || []) if (ex.side) RaidEvents.list.push({ ext: true, kind: 'dun_exit', x: ex.door ? ex.door.x : ex.x - 40, y: ex.door ? ex.door.y : ex.y - 40, face: ex.door && ex.door.face, draw: drawDunExit }); // v1.79 비상 계단 그림 · v1.80 뒷벽에 붙임
    const L = World.labLift, p = G.player; if (!L || !p.raid) return;
    const f = p.raid.floor, D = DUNGEONS[World.map];
    const P = World.labLiftSpot; // v1.80 뒷벽 자리 (없으면 방 가운데)
    RaidEvents.list.push({ ext: true, kind: 'lab_lift', x: P ? (P.x + P.fx) / 2 : (L.cx + 0.5) * TILE, y: P ? (P.y + P.fy) / 2 : (L.cy + 0.5) * TILE, ax: P ? P.x : null, ay: P ? P.y : null, face: P && P.face, /* [E] 는 벽 앞에서 · 그림은 벽에 */ hint: `[E] ${D.lift} — ${D.label(f + 1)}로 ${D.verb} (3초 · 적 Lv${D.lv(f + 1)})`, dur: 3, open: true,
      onFinish: e => { e.done = true; this.descend(); },
      track: () => `${D.label(f)} · ${D.lift}(미니맵 ${D.arrow})로 ${D.label(f + 1)} · 또는 비상구(초록 원)로 탈출`,
      mini: (g, e, b) => { g.fillStyle = b ? D.col : '#555'; g.fillRect(e.x / TILE - 3, e.y / TILE - 3, 6, 6); },
      draw: drawLabLift });
  },
  // 다음 층: 주운 것 · 크레딧 · 체력은 그대로, 층만 새로 (더 강한 적 · 더 좋은 전리품)
  descend() {
    const p = G.player, r = p.raid; if (!r) return;
    const id = r.map, D = DUNGEONS[id], last = () => r.floor >= D.floors;
    r.floor++; this.labFloor(r.floor, id);
    const rec = r.floor > (p[D.best] || 1); // v1.84 처음 오른(내려간) 층이면 신기록 알림
    p[D.best] = Math.max(p[D.best] || 0, r.floor);
    const bonus = r.floor * (id === 'tower' ? 500 : 400); r.credits += bonus; p.credits += bonus; // 층 보상 (탈출해야 확정 — 죽으면 이번 출격 크레딧처럼 잃음)
    World.generate(id); this.resetWorld();
    const pts = World.edgePts, start = pts[Math.floor(Math.random() * pts.length)];
    G.exits = [dunExitPick(pts.filter(q => q !== start), start)]; p.x = start.x; p.y = start.y; // v1.81 탈출구 하나
    G.grave = p.graves[id] && (p.graves[id].floor || 1) === r.floor ? p.graves[id] : null; // 이 층에서 쓰러졌던 가방
    if (G.grave) { let best = null, bd = 1e9; for (let ty = 1; ty < World.H - 1; ty++) for (let tx = 1; tx < World.W - 1; tx++) { if (World.tiles[ty * World.W + tx] !== T.LFLOOR) continue; const d = Math.hypot(tx * TILE + 16 - G.grave.x, ty * TILE + 16 - G.grave.y); if (d < bd) { bd = d; best = [tx * TILE + 16, ty * TILE + 16]; } } if (best) [G.grave.x, G.grave.y] = best; log(`${ICON('skull')} 이 층에 지난번 시체 가방이 있다. (미니맵 붉은 ✚)`, '#ff8a8a'); }
    if (G.comp && G.comp.state !== 'gone' && G.comp.state !== 'down') { G.comp.x = p.x + 30; G.comp.y = p.y + 20; }
    Scavenge.generate(); RaidEvents.generate(); this.labLiftEvent(); Pop.generate(start);
    const bossName = id === 'tower' ? '바벨 원형체' : '키메라';
    G.fade = { t: 0, life: 1.6, text: `${MAPS[id].name} ${D.label(r.floor)}`, sub: `적 Lv${ZONES[MAPS[id].zone].lvl[0]}${last() ? ` · 마지막 층 · ${D.bossRoom}에 ${bossName}` : ''} · 층 보상 ₵${fmt(bonus)} (탈출해야 내 것)` };
    if (rec) setTimeout(() => UI.toast(`신기록 · ${MAPS[id].name} ${D.label(r.floor)}`, last() ? '마지막 층' : '최고 기록 갱신'), 1700);
    const nf = D.extra && r.floor === D.extra.f && ENEMIES[D.extra.spawn[0]]; // v1.84 전용 적이 처음 섞이는 층에서 한 줄 안내
    if (nf) log(`${ICON('warn')} 이 층부터 「${nf.name}」 출현 — ${nf.gasDeath ? '쓰러지면 등의 가스통이 터져 보라 독가스가 남는다. 근접 처치 뒤엔 바로 물러서자.' : '정면 장갑이 두껍다. 옆이나 뒤를 노리거나 폭발물로.'}`, '#ffc890');
    SFX.play('quest'); log(`${ICON('warn')} ${D.label(r.floor)}. ${last() ? `마지막 층 — ${D.bossRoom}(미니맵 붉은 방)에 ${bossName}가 있다.` : `적이 강해졌다.`} 비상구는 층마다 한 곳 (미니맵 초록 원).`, '#ff8a8a');
    saveGame();
  },

  // 맵을 바꿀 때 월드 상태 초기화
  resetWorld() {
    G.enemies = []; G.bullets = []; G.drops = []; G.particles = []; G.texts = []; G.effects = []; G.decals = []; G.grenades = []; G.fires = []; G.mines = []; G.turrets = []; G.corpses = []; Juice.reset(); G.camF = null;
    G.boss = null; G.elite = null; G.strikes = []; G.pools = []; G.assault = null; G.fieldBoss = null; G.fbT = 150; G.inside = null;
    G.labBoss = null; G.labBossDone = false; G.grave = null; // v1.5 · v1.84.1 캠프로 돌아와도 지난 출격의 가방 표시가 남던 것 (출격·층 이동 땐 이 뒤에 다시 연결)
    G.exits = []; Pop.cells = []; RaidEvents.list = []; RaidEvents.alert = 0; G.extractT = 0; G.zone = World.zoneIndex(); G.bossT = Math.min(G.bossT, 0);
    if (World.map === 'camp') setupCampNpcs(); else G.npcs = [];
    GroundCache.clear(); Nav.dist = null; Nav.t = 0;
  },

  // 매 프레임: 탈출 지점에 머물기
  update(dt) {
    const p = G.player;
    if (!this.inRaid() || p.dead || !p.raid) return;
    p.raid.t += dt;
    const ex = G.exits.find(e => !e.locked && Math.hypot(p.x - e.x, p.y - e.y) < EXTRACT_R); // v1.10 잠긴 특수 탈출은 안 됨
    if (!ex || G.assault) { if (G.extractT > 0) log('탈출이 취소되었다.', '#aaa'); G.extractT = 0; return; }
    const need = ex.time || EXTRACT_TIME; G.extractNeed = need;
    if (G.extractT === 0) log(`탈출 중... ${need}초 동안 머무르세요.`, '#7fe08a');
    G.extractT += dt;
    if (G.extractT >= need) this.extract();
  },

  // 주운 것 확정 후 캠프로
  extract() {
    const p = G.player, r = p.raid;
    Companion.onExtract(r); // v1.44 동료 개인 부탁
    Settlement.onExtract(r); // v1.43 구한 사람 합류 · 캠프 사람들이 물건을 모아 둠
    const items = this.allItems().filter(it => it.raid);
    for (const it of items) delete it.raid;
    Journal.onExtract(r, r.credits); // v1.15 기록
    p.raid = null;
    this.toCamp();
    this.summary(true, r, items);
    Journal.onMythSecured(items); // v1.63 신화 확보 (캠프로 돌아온 뒤 — 출격 중이면 알림이 밀림)
    log(`탈출 성공! 이번 출격: 장비 ${items.length}개, 크레딧 ${fmt(r.credits)} 확보.`, '#7fe08a');
    SFX.play('quest'); Music.sting('sting_extract'); // v1.76 탈출 음악
    Bounty.on('extract');
    saveGame();
  },

  // 사망: 이번 출격에서 주운 것을 잃음 (playerDie 에서 호출)
  onDeath() {
    const p = G.player, r = p.raid;
    if (!r) return '';
    const lostItems = [], kept = [];
    for (const k of Object.keys(p.equip)) { const it = p.equip[k]; if (it && it.raid && it.rarity === 5) { delete it.raid; kept.push(it); } } // v1.69 장착한 신화 무기는 죽어도 지킴 (손에 든 채로 확보)
    for (const k of Object.keys(p.equip)) if (p.equip[k] && p.equip[k].raid) { lostItems.push(p.equip[k]); p.equip[k] = null; }
    lostItems.push(...p.inventory.filter(it => it.raid));
    p.inventory = p.inventory.filter(it => !it.raid);
    if (!p.equip.w1) p.equip.w1 = makeWeapon('pistol', 1, 0); // 주무기가 비면 기본 권총
    if (!p.equip[p.active]) p.active = 'w1';
    const lost = Math.min(p.credits, r.credits);
    p.credits -= lost;
    for (const it of lostItems) delete it.raid;
    Scavenge.makeGrave(lostItems, lost); // v1.4: 다음 출격 때 같은 맵에서 회수
    p.raid = null;
    this.lastDeath = { r, items: lostItems, credits: lost, kept };
    return lostItems.length || lost ? `이번 출격의 장비 ${lostItems.length}개와 ₵${fmt(lost)}가 시체 가방에 남았다. 다음에 「${MAPS[r.map].name}」에 출격해 회수할 수 있다.` : '캠프로 돌아갑니다.';
  },

  toCamp() {
    const p = G.player;
    World.generate('camp');
    this.resetWorld();
    Object.assign(p, World.campCenter());
    G.fade = { t: 0, life: 1.1, text: '시청역 생존자 캠프', sub: '' }; // v1.17
    p.dead = false; p.hp = Math.max(1, Math.min(p.hp, PlayerStats.maxHp(p))); p.stam = 100; // v1.57 돌아와도 체력 그대로 → 의무병 이씨(무료 · 바로) 또는 캠프에서 천천히 회복
    if (p.hp < PlayerStats.maxHp(p) * 0.7) log('의무병 이씨에게 가면 바로 치료해 준다. (캠프에 있으면 천천히 회복)', '#8f8');
    UI.refreshAll();
  },

  // 출격 결과 (탈출 성공 / 사망)
  summary(ok, r, items) {
    const li = items.length ? items.map(it => `<div class="r${it.rarity || 0}">${itemIcon(it)} ${itemName(it)}</div>`).join('') : '<span class="muted">없음</span>';
    $('summary-title').textContent = ok ? '탈출 성공' : '사망';
    $('summary-title').className = ok ? 'ok' : 'bad';
    const myth = ok ? items.filter(it => it.rarity === 5) : (this.lastDeath && this.lastDeath.kept) || [], mc = RARITIES[5].color; // v1.63 신화 확보는 결과 카드 맨 위에
    $('summary-body').innerHTML = myth.map(it => `<div class="sum-row" style="border:1px solid ${mc};padding:4px 6px;margin-bottom:6px"><span style="color:${mc}">◆ 신화 무기 ${ok ? '확보' : '지킴 (장착 중)'}</span><b style="color:${mc}">${itemName(it)}</b></div>`).join('') + `<div class="sum-row"><span>맵</span><b>${MAPS[r.map].name}${(D => D ? ` · ${D.label(r.floor || 1)}${G.player[D.best] ? ` <span class="muted" style="font-weight:normal">(최고 ${D.label(G.player[D.best])})</span>` : ''}` : '')(DUNGEONS[r.map])}</b></div>`
      + (ok ? '' : (dc => dc.length ? `<div class="sum-row"><span>쓰러뜨린 것</span><b style="color:#ff8a6a">${dc.map(([n, d], i) => i ? `<span class="muted" style="font-weight:normal">${n} ${fmt(Math.round(d))}</span>` : `${n} ${fmt(Math.round(d))}`).join(' · ')}</b></div>` : '')(deathCause())) // v1.70 사망 원인 (마지막 6초 피해)
      + `<div class="sum-row"><span>시간</span><b>${Math.floor(r.t / 60)}분 ${Math.floor(r.t % 60)}초</b></div>`
      + `<div class="sum-row"><span>처치</span><b>${r.kills || 0}</b></div>`
      + `<div class="sum-row"><span>${ok ? '확보한 크레딧' : '잃은 크레딧'}</span><b>₵${fmt(ok ? r.credits : this.lastDeath.credits)}</b></div>`
      + `<div class="sum-head">${ok ? '가져온 장비' : '시체 가방에 남은 장비'} (${items.length})</div><div class="sum-items">${li}</div>`
      + (ok ? '' : `<div class="muted">다음에 「${MAPS[r.map].name}」에 출격하면 쓰러진 자리(미니맵 붉은 ✚)에서 회수할 수 있습니다. 다시 죽으면 새 가방으로 바뀝니다.</div>`);
    $('raid-summary').classList.toggle('ok', !!ok); $('raid-summary').classList.toggle('bad', !ok); // v1.83 50절 배경 그림
    $('raid-summary').classList.remove('hidden');
  },

  allItems() { const p = G.player; return [...p.inventory, ...Object.values(p.equip).filter(Boolean)]; },

  trackerLine() {
    const p = G.player;
    if (!p.raid) return '';
    const loot = this.allItems().filter(it => it.raid), n = loot.length, val = loot.reduce((v, it) => v + itemSellPrice(it), 0), ex = G.extractT > 0 ? ` · <b style="color:#7fe08a">탈출 ${Math.ceil((G.extractNeed || EXTRACT_TIME) - G.extractT)}초</b>` : '';
    return `<br><span class="muted">${ICON('box')} 미확정 장비 ${n}개 (₵${fmt(val)}) · 크레딧 ₵${fmt(p.raid.credits)} — 탈출 지점 ◎${ex}</span>`
      + (Pop.total ? `<br><span class="muted">${ICON('skull')} 남은 적 약 ${Pop.remaining()} / ${Pop.total}</span>` : ''); // v1.16
  },
};

// 창고 (캠프): 가방 ↔ 창고 옮기기
const Stash = {
  open() { UI.open('stash'); this.render(); },
  render() {
    const p = G.player;
    const grid = (el, list, size, onClick) => {
      el.innerHTML = '';
      for (let i = 0; i < size; i++) {
        const it = list[i], c = document.createElement('div');
        c.className = 'inv-cell' + (it ? ' bc' + (it.rarity || 0) : '');
        if (it) { c.innerHTML = UI.itemCell(it); c.onclick = () => { ItemTip.hide(); onClick(it); }; ItemTip.attach(c, it); } // v1.47 툴팁
        el.appendChild(c);
      }
    };
    $('stash-bag-n').textContent = `${Bag.used()} / ${Bag.cells()}칸`; $('stash-n').textContent = `${p.stash.length} / ${Camp.stashSize()}`;
    Bag.render($('stash-bag'), it => { if (!p.inventory.includes(it)) return; if (p.stash.length >= Camp.stashSize()) return log('창고가 가득 찼습니다.', '#f88'); removeItem(it); delete it.gx; delete it.gy; p.stash.push(it); this.after(); }, { drag: true }); // v1.87 가방은 칸 격자 (PC 끌어 놓기 · 누르면 창고로)
    grid($('stash-grid'), p.stash, Camp.stashSize(), it => { if (!p.stash.includes(it) || p.inventory.includes(it)) return; /* v1.96.3 두 번 눌림 */ if (!Bag.place(it)) return log('가방에 자리가 없습니다.', '#f88'); p.stash.splice(p.stash.indexOf(it), 1); p.inventory.push(it); this.after(); });
  },
  after() { this.render(); UI.refreshInventory(); saveGame(); SFX.play('ui'); },
};

// v1.77 연구소 승강기 (그림이 오기 전까지 코드 그림: 철제 문 + 노란 경고 띠 + 하늘색 불)
function drawLabLift(e) {
  if (e.done) return;
  const ex = e.ax ?? e.x, ey = e.ay ?? e.y, sx = Iso.sx(ex, ey), sy = Iso.sy(ex, ey); if (sx < -80 || sx > VW + 80 || sy < -140 || sy > VH + 60) return;
  const k = 0.5 + Math.sin(G.time * 3) * 0.5, tw = World.def && World.def.tower;
  if (!drawPropArt(tw ? 'dx_up' : 'dx_lift', sx, sy, e.face === 'w')) { // 서쪽 벽이면 좌우 뒤집어 벽을 등지게 // v1.79 그림 (45절) · 없으면 코드 상자
    drawBox(ex - 22, ey - 14, ex + 22, ey + 14, 56, '#5a6068', '#2e3238', '#444a52', 0, 0, 0);
    ctx.fillStyle = '#d8b030'; ctx.fillRect(sx - 18, sy - 6, 36, 4);
    ctx.fillStyle = `rgba(122,208,255,${0.5 + k * 0.5})`; ctx.fillRect(sx - 3, sy - 62, 6, 4);
  }
  if (Settings.light) addLight(sx, sy - 30, 110, 0.5 + k * 0.2, tw ? 'rgba(255,200,110,A)' : 'rgba(122,208,255,A)');
  { const D = DUNGEONS[World.map] || DUNGEONS.lab, f = G.player.raid ? G.player.raid.floor : 1; nameTag(sx, sy - 72, `${D.lift} ${D.arrow} ${D.label(f + 1)}`, D.col, 'bold 12px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'); }
}

// v1.79 던전 비상 계단 (탈출 지점 뒤에 세움 · 45절)
function drawDunExit(e) {
  const sx = Iso.sx(e.x, e.y), sy = Iso.sy(e.x, e.y); if (sx < -90 || sx > VW + 90 || sy < -160 || sy > VH + 60) return;
  if (!drawPropArt('tw_door', sx, sy, e.face === 'w')) drawPropArt(World.def && World.def.tower ? 'dx_twexit' : 'dx_labexit', sx, sy, e.face === 'w'); // v1.81 계단 없는 비상구 문 (위층 계단과 헷갈리지 않게)
}

// v1.81 도전 던전 탈출구: 후보 중 시작 자리에서 가장 먼 하나
function dunExitPick(list, start) { return list.slice().sort((a, b) => Math.hypot(b.x - start.x, b.y - start.y) - Math.hypot(a.x - start.x, a.y - start.y))[0]; }
