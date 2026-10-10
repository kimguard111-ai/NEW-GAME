// 캠프 시설 (v1.13): 크레딧 · 고철 · 전자 부품으로 시설을 올리면 출격이 편해지고, 캠프 맵에 실제로 지어짐
// 관리: 생존자 대장 한씨 → 「캠프 시설」. 시설마다 3단계

const FAC_COST = [ // 단계별 비용 · 요구 레벨
  { credits: 1500, scrap: 15, chip: 0, lvl: 5 },
  { credits: 6000, scrap: 40, chip: 6, lvl: 12 },
  { credits: 18000, scrap: 90, chip: 20, lvl: 20 },
];
const FACILITIES = {
  med:   { name: '의무실', icon: 'medkit', fx: ['출격할 때 구급상자 1개', '출격할 때 구급상자 2개', '출격할 때 구급상자 3개 · 출격 중 최대 체력 +5%'] },
  range: { name: '사격장', icon: 'rifle', fx: ['모든 무기 피해 +3%', '모든 무기 피해 +6%', '모든 무기 피해 +10%'] },
  store: { name: '창고 증축', icon: 'box', fx: ['창고 칸 +16', '창고 칸 +32 · 가방 칸 +4', '창고 칸 +48 · 가방 칸 +8'] },
  bench: { name: '작업대', icon: 'scrap', fx: ['강화 비용 -15%', '강화 비용 -15% · 분해 재료 +30%', '강화 비용 -15% · 분해 재료 +30% · 강화 성공 +5%p'] },
  radio: { name: '무전실', icon: 'radio', fx: ['출격 지도에서 맵마다 이번 사건 미리 보기', '+ 경보가 1분 늦게 시작', '+ 사건이 항상 2개'] },
};

// v1.56 캠프 안내방송 (아파트 관리사무소 · 지하철 안내 말투) — 캠프에 있으면 2분쯤마다 한 줄
const CAMP_PA = [
  '시청역 캠프에서 알려드립니다. 오늘 배급은 저녁 여섯 시, 2번 출구 앞입니다.',
  '정수 시설 점검으로 오후에는 물 사용을 자제해 주시기 바랍니다.',
  '분실물 안내입니다. 파란 배낭을 잃어버리신 분은 창고 관리인에게 와 주십시오.',
  '지상 출입은 작전 장교의 허가를 받은 분만 가능합니다. 협조 부탁드립니다.',
  '주민 여러분, 밤에는 불빛이 밖으로 새지 않도록 해 주시기 바랍니다.',
  '의무실 진료는 오전 열 시부터입니다. 물린 상처가 있으면 즉시 신고해 주십시오.',
  '발전기 연료가 부족합니다. 고철과 전자 부품을 모아 오시는 분께 보상해 드립니다.',
  '이번 정차 역은 시청, 시청역입니다. …라는 방송이 아직도 가끔 저절로 나온다.',
];
const Camp = {
  paT: 40,
  broadcast(dt) { // v1.56
    if (World.map !== 'camp' || !G.running || G.paused) return;
    if ((this.paT -= dt) > 0) return;
    this.paT = 110 + Math.random() * 60;
    log(`📢 ${pick(CAMP_PA)}`, '#b9c7d6'); SFX.play('ui', 0.5);
  },
  lv(id) { const p = G.player; return (p && p.camp && p.camp[id]) || 0; },

  // 효과 수치
  dmgMul() { return 1 + [0, 0.03, 0.06, 0.10][this.lv('range')]; },
  stashSize() { return 48 + this.lv('store') * 16; },
  bagSize() { return 24 + [0, 0, 4, 8][this.lv('store')]; },
  enhanceMul() { return this.lv('bench') >= 1 ? 0.85 : 1; },
  salvageMul() { return this.lv('bench') >= 2 ? 1.3 : 1; },
  enhanceBonus() { return this.lv('bench') >= 3 ? 0.05 : 0; },
  medkits() { return this.lv('med'); },
  raidHpMul() { return this.lv('med') >= 3 && G.player.raid ? 1.05 : 1; },
  alertDelay() { return (this.lv('radio') >= 2 ? 60 : 0) + (FirstRun.rookie() ? 120 : 0); }, // v1.45 첫 출격은 경보 2분 늦게

  // 무전실: 맵마다 다음 출격의 사건을 미리 정해 둠 (출격하면 그대로 나옴)
  plan: {},
  planFor(id) {
    if (this.plan[id]) this.plan[id] = this.plan[id].filter(k => EVENT_DEFS[k] && !EVENT_DEFS[k].off); // v1.51 지운 사건
    if (!this.plan[id]) {
      const lab = !!MAPS[id].lab;
      const pool = Object.keys(EVENT_DEFS).filter(k => !EVENT_DEFS[k].off && (lab ? EVENT_DEFS[k].lab : true)), out = [];
      const n = this.lv('radio') >= 3 ? 2 : 1; // v1.46 사건이 너무 많아 복잡하던 것: 한 출격 1개 (무전실 3단계만 2개)
      for (let i = 0; i < n && pool.length; i++) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      this.plan[id] = out;
    }
    return this.plan[id];
  },
  takePlan(id) { const pl = this.planFor(id); delete this.plan[id]; return pl; },

  // 대장 대화 → 시설 목록
  open() {
    const p = G.player;
    let h = `<div class="muted">재료: ${Workshop.matsText()} · ₵${fmt(p.credits)}</div>`;
    const btns = [];
    for (const id of Object.keys(FACILITIES)) {
      const F = FACILITIES[id], l = this.lv(id), c = FAC_COST[l];
      h += `<div class="fac-row"><b>${ICON(F.icon)} ${F.name}</b> <span class="fac-lv">${'■'.repeat(l)}${'□'.repeat(3 - l)}</span>`
        + `<br><span class="stat-eff">${l ? F.fx[l - 1] : '<span class="muted">아직 없음</span>'}</span>`
        + (c ? `<br><span class="muted">다음 단계: ${F.fx[l]} (${Workshop.costText(c)})${p.level < c.lvl ? ` <span style="color:#f66">Lv${c.lvl} 필요</span>` : ''}</span>` : '<br><span class="muted">최고 단계</span>') + '</div>';
      if (c) btns.push([`${F.name} ${l + 1}단계`, () => this.upgrade(id)]);
    }
    btns.push(['닫기', () => UI.close('dialog')]);
    UI.dialog('생존자 대장 한씨', '"자네가 가져온 것들로 캠프를 키워 보세. 시설이 생기면 다들 자네를 더 도울 수 있어."<br>' + h, btns);
  },
  upgrade(id) {
    const p = G.player, l = this.lv(id), c = FAC_COST[l], F = FACILITIES[id];
    if (!c) return;
    if (p.level < c.lvl) { log(`${F.name} ${l + 1}단계는 Lv${c.lvl}부터 지을 수 있습니다.`, '#f88'); return; }
    if (!Workshop.canPay(c)) { log('재료나 크레딧이 부족합니다.', '#f88'); SFX.play('empty'); return; }
    Workshop.pay(c);
    p.camp = p.camp || {}; p.camp[id] = l + 1;
    if (id === 'radio') this.plan = {}; // 사건 수가 바뀔 수 있으니 다시 굴림
    UI.toast(`${F.name} ${l + 1}단계 완공`, F.fx[l]);
    log(`${F.name} ${l + 1}단계. ${F.fx[l]}`, '#ffd76a');
    SFX.play('levelup');
    const pos = CAMP_FAC_POS[id], cc = World.campCenter();
    if (pos && World.map === 'camp') { const x = cc.x + pos[0], y = cc.y + pos[1]; burst(x, y, '#ffd76a', 30, 160, 0.7, 3); G.effects.push({ type: 'ring', x, y, t: 0, life: 0.7, color: '#ffd76a', r: 120 }); }
    UI.refreshAll(); saveGame(); this.open();
  },
};

// 캠프 맵의 시설 자리 (캠프 중심 기준)
const CAMP_FAC_POS = { med: [-285, 45], range: [-70, 215], store: [115, -255], bench: [-235, 160], radio: [175, -120] };

// 시설 그리기 (단계에 따라 커짐) — City 소품 'facility'
function drawFacility(o) {
  const l = Camp.lv(o.fac), sx = Iso.sx(o.x, o.y), sy = Iso.sy(o.x, o.y), S = Iso.sx, Y = Iso.sy;
  if (!l && o.fac !== 'radio') { // 공사 예정 표지 · v1.64 처음 할 일 중엔 숨기고, 그 뒤엔 가까이 갔을 때만 (첫 화면이 빽빽하던 것)
    if (Tut.on() || Math.hypot(o.x - G.player.x, o.y - G.player.y) > 220) return;
    ctx.strokeStyle = '#5a4a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 22); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#8a6a3e'; ctx.fillRect(sx - 14, sy - 32, 28, 12); ctx.fillStyle = '#2a1e10'; ctx.font = 'bold 8px "Malgun Gothic", "Apple SD Gothic Neo", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('공사 예정', sx, sy - 26);
    ctx.strokeStyle = 'rgba(255,200,60,0.35)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(sx, sy, 34, 17, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    return;
  }
  switch (o.fac) {
    case 'med': { // 1: 들것 2개 · 2: 컨테이너 진료소 · 3: + 붉은 십자 조명 · 발전기 연결
      for (let i = 0; i < 2; i++) drawBox(o.x - 34 + i * 18, o.y + 22, o.x - 22 + i * 18, o.y + 46, 8, '#d8d8d0', '#9a9a92', '#b8b8b0', 0, 0, 0);
      if (l >= 2) {
        drawBox(o.x - 22, o.y - 30, o.x + 22, o.y + 14, 34, '#d0d4d8', '#8a8e94', '#a8acb2', 0, 0, 0);
        const cx = S(o.x + 22, o.y - 8), cy = Y(o.x + 22, o.y - 8, 20); ctx.fillStyle = '#c82828'; ctx.fillRect(cx - 6, cy - 2, 12, 4); ctx.fillRect(cx - 2, cy - 6, 4, 12);
        poly([S(o.x - 10, o.y + 14), Y(o.x - 10, o.y + 14, 0), S(o.x + 4, o.y + 14), Y(o.x + 4, o.y + 14, 0), S(o.x + 4, o.y + 14), Y(o.x + 4, o.y + 14, 24), S(o.x - 10, o.y + 14), Y(o.x - 10, o.y + 14, 24)], '#2a3038');
      }
      if (l >= 3) { const lx = S(o.x, o.y - 8), ly = Y(o.x, o.y - 8, 40); ctx.fillStyle = Math.sin(G.time * 2) > 0 ? '#ff4040' : '#802020'; ctx.fillRect(lx - 3, ly - 3, 6, 6); if (Settings.light) addLight(lx, ly + 20, 120, 0.8, 'rgba(255,90,90,A)'); }
      break;
    }
    case 'range': { // 1: 모래주머니 사대 + 표적 1 · 2: 표적 3 · 3: 지붕 + 조명
      drawBox(o.x - 40, o.y - 8, o.x + 40, o.y + 4, 12, '#958050', '#6a5434', '#7e6640', 0, 0, 0);
      const n = l >= 2 ? 3 : 1;
      for (let i = 0; i < n; i++) { // 표적 (기둥 + 원판)
        const tx = o.x - 30 + i * 30 + (n === 1 ? 30 : 0), ty = o.y - 60, px = S(tx, ty), py = Y(tx, ty);
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py - 16); ctx.stroke(); ctx.lineWidth = 1;
        for (const [r, c] of [[8, '#e8e0d0'], [6, '#c83a2a'], [4, '#e8e0d0'], [2, '#c83a2a']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py - 22, r, 0, TAU); ctx.fill(); }
      }
      if (l >= 3) { drawBox(o.x - 44, o.y - 2, o.x + 44, o.y + 10, 40, '#4a4e54', '#2e3236', '#3a3e44', 36, 36, 0); if (Settings.light) addLight(sx, sy - 20, 140, 0.7, 'rgba(255,230,180,A)'); }
      break;
    }
    case 'store': { // 1: 컨테이너 1 · 2: 2단 · 3: 3개 + 지게차
      const box = (x, y, z, c) => propArt('container') ? drawPropArt('container', Iso.sx(x, y), Iso.sy(x, y, z)) : drawBox(x - 26, y - 12, x + 26, y + 12, z + 26, c[0], c[1], c[2], z, z, 0); // v1.18 그림
      const cols = [['#2e5a8a', '#1a3a5a', '#244a72'], ['#8a4a2e', '#5a2e1a', '#723e24'], ['#3e6a3e', '#244424', '#305830']];
      box(o.x, o.y, 0, cols[0]);
      if (l >= 2) box(o.x, o.y, 26, cols[1]);
      if (l >= 3) { box(o.x + 60, o.y + 4, 0, cols[2]); drawBox(o.x - 70, o.y + 10, o.x - 50, o.y + 26, 16, '#d8a830', '#8a6a1a', '#b08820', 0, 0, 0); }
      break;
    }
    case 'bench': { // 1: 공구 선반 · 2: + 드릴 프레스 · 3: + 크레인 · 용접 불꽃
      drawBox(o.x - 24, o.y - 6, o.x + 24, o.y + 6, 30, '#5a4a3a', '#3a2e22', '#4a3c2e', 0, 0, 0);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = ['#c84a2a', '#9a9aa2', '#d8b040', '#4a8ac8'][i]; ctx.fillRect(S(o.x - 16 + i * 10, o.y + 6) - 2, Y(o.x - 16 + i * 10, o.y + 6, 22) - 3, 4, 5); }
      if (l >= 2) { drawBox(o.x + 34, o.y - 6, o.x + 46, o.y + 6, 34, '#6a6e74', '#3e4246', '#52565c', 0, 0, 0); }
      if (l >= 3) {
        const bx = S(o.x - 40, o.y - 30), by = Y(o.x - 40, o.y - 30);
        ctx.strokeStyle = '#d8a830'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by - 70); ctx.lineTo(bx + 50, by - 62); ctx.stroke(); ctx.lineWidth = 1;
        ctx.strokeStyle = '#333'; ctx.beginPath(); ctx.moveTo(bx + 46, by - 62); ctx.lineTo(bx + 46, by - 34); ctx.stroke();
        if (Math.sin(G.time * 7) > 0.3) { burstSpark(S(o.x, o.y), Y(o.x, o.y, 34)); if (Settings.light) addLight(S(o.x, o.y), Y(o.x, o.y, 34), 60, 0.6, 'rgba(160,200,255,A)'); }
      }
      break;
    }
    case 'radio': { // 0: 기본 (캠프 소품 radio) · 1: + 접시 · 2: 높은 철탑 · 3: + 레이더 회전
      if (l >= 1) { const dx = S(o.x - 26, o.y + 10), dy = Y(o.x - 26, o.y + 10, 0); ctx.fillStyle = '#9a9ea4'; ctx.beginPath(); ctx.ellipse(dx, dy - 18, 11, 7, -0.5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#444'; ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx, dy - 14); ctx.stroke(); }
      if (l >= 2) {
        const tx = S(o.x + 30, o.y - 20), ty = Y(o.x + 30, o.y - 20);
        ctx.strokeStyle = '#5a5e64'; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(tx - 8, ty); ctx.lineTo(tx, ty - 110); ctx.lineTo(tx + 8, ty);
        for (let k = 0; k < 6; k++) { const yy = ty - k * 18; ctx.moveTo(tx - 8 + k * 1.3, yy); ctx.lineTo(tx + 8 - (k + 1) * 1.3, yy - 18); }
        ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = Math.sin(G.time * 3) > 0 ? '#ff3030' : '#601010'; ctx.fillRect(tx - 2, ty - 114, 4, 4);
        if (l >= 3) { const a = G.time * 2; ctx.strokeStyle = '#b8bcc2'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx - Math.cos(a) * 12, ty - 100 - Math.sin(a) * 3); ctx.lineTo(tx + Math.cos(a) * 12, ty - 100 + Math.sin(a) * 3); ctx.stroke(); ctx.lineWidth = 1; }
      }
      break;
    }
  }
  const F = FACILITIES[o.fac];
  if (l) nameTag(sx, sy - (o.fac === 'radio' ? 130 : 66), `${F.name} ${'★'.repeat(l)}`, '#c9b07a', '10px sans-serif');
}
