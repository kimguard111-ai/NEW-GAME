// 상황별 도움말 (v1.0): 처음 겪는 순간에 한 번만 보여줌. 본 팁은 세이브에 기록
const tipKey = (pc, mobile) => (IS_TOUCH ? mobile : pc);
const TIPS = {
  telegraph: () => `적 머리 위 붉은 「!」, 바닥의 붉은 원·선 = 곧 공격합니다. ${tipKey('Space', '💨 버튼')}로 구르면 잠깐 무적!`,
  noise:     () => '총소리를 들은 적들이 몰려옵니다. 근접 무기(쇠파이프·도끼·블레이드)는 조용합니다.',
  levelup:   () => `레벨 업! ${tipKey('C(능력치)', '능력치 버튼')}에서 포인트 3개를 분배하세요.`,
  upgrade:   () => `더 좋은 장비(▲)가 가방에 있습니다. ${tipKey('I(인벤토리)', '인벤토리 버튼')}에서 장착하세요.`,
  lowhp:     () => `체력이 낮습니다! ${tipKey('5번', '💊 칸')} 구급상자, 또는 캠프(안전 지대)로 돌아가면 회복됩니다.`,
  noammo:    () => `예비 탄약이 없습니다. ${tipKey('Q', 'Q 버튼')}로 권총(탄약 무한)이나 근접 무기로 바꾸고, 상점에서 탄약을 사세요.`,
  elite:     () => '◆ 엘리트 몬스터: 강하지만 경험치 4배 + 장비를 더 떨어뜨립니다. 접두어를 보고 대처하세요.',
  shop:      () => '🚪 간판이 있는 건물은 들어갈 수 있습니다. 안에 적과 보급 상자가 있어요.',
  combo:     () => '연속 처치! 3초 안에 이어 잡으면 경험치 보너스가 쌓입니다 (최대 +50%).',
  workshop:  () => '가방이 차고 있습니다. 캠프의 정비공 최씨에게서 안 쓰는 장비를 분해해 재료로 바꾸세요.',
  bounty:    () => `오늘의 의뢰 3개가 있습니다 (${tipKey('J', '임무 버튼')}). 끝내면 희귀 이상 장비를 받습니다.`,
  fieldboss: () => '필드 보스는 미니맵의 붉은 깜빡임을 따라가세요. 희귀 이상 장비 확정!',
  deploy:    () => '캠프의 작전 장교 윤씨(출격 지도)에게서 맵을 골라 출격하세요. 창고 관리인에게 맡긴 물건은 안전합니다.',
  extract:   () => '이번 출격에서 주운 장비·크레딧은 맵 끝의 초록 ◎ 탈출 지점에 5초 머물러야 확정됩니다. 죽으면 그것만 잃어요.',
};

const Tips = {
  t: 0,
  show(id) {
    const p = G.player;
    if (!Settings.tips || !p || p.tips.includes(id)) return;
    p.tips.push(id);
    const el = $('tip');
    el.innerHTML = `💡 ${TIPS[id]()}`;
    el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this.hideT); this.hideT = setTimeout(() => el.classList.add('hidden'), 8000);
    SFX.play('ui');
  },
  // 0.5초마다 상황 확인 (한 번에 하나만)
  update(dt) {
    if ((this.t -= dt) > 0) return;
    this.t = 0.5;
    const p = G.player;
    if (!p || p.dead || !Settings.tips) return;
    const near = (e, r) => e.hp > 0 && dist(e, p) < r;
    const w = curWeapon(), mh = PlayerStats.maxHp(p);
    if (World.map === 'camp' && p.level >= 1) { this.show('deploy'); if (World.map === 'camp') return; }
    if (p.raid && p.raid.t > 4) this.show('extract');
    if (G.enemies.some(e => near(e, 400) && (e.windT > 0 || e.pounceT > 0 || e.aimT > 0)) || G.strikes.some(s => Math.hypot(s.x - p.x, s.y - p.y) < 300)) return this.show('telegraph');
    if (G.enemies.filter(e => e.heard && near(e, 600)).length >= 2) return this.show('noise');
    if (p.statPoints > 0 && p.level >= 2) return this.show('levelup');
    if (p.inventory.some(it => it.kind !== 'cons' && p.level >= itemReqLevel(it) && isUpgrade(p, it))) return this.show('upgrade');
    if (p.hp < mh * 0.3) return this.show('lowhp');
    if (p.reserve <= 0 && w && !WEAPONS[w.key].melee && !WEAPONS[w.key].infinite) return this.show('noammo');
    if (G.enemies.some(e => e.affix && near(e, 500))) return this.show('elite');
    if (!G.inside && World.buildings.some(b => Math.hypot(b.doorX - p.x, b.doorY - p.y) < 260)) return this.show('shop');
    if (G.combo >= 3 && G.time - G.comboT < 3) return this.show('combo');
    if (p.inventory.filter(it => it.kind !== 'cons').length >= 12) return this.show('workshop');
    if (p.level >= 3 && p.bounty) return this.show('bounty');
    if (G.fieldBoss) return this.show('fieldboss');
  },
};
