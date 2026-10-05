// 상황별 도움말 (v1.0): 처음 겪는 순간에 한 번만 보여줌. 본 팁은 세이브에 기록
const tipKey = (pc, mobile) => (IS_TOUCH ? mobile : pc);
const TIPS = {
  telegraph: () => `적 머리 위 붉은 「!」, 바닥의 붉은 원·선 = 곧 공격합니다. ${tipKey('Space', `${ICON('roll')} 버튼`)}로 구르면 잠깐 무적!`,
  noise:     () => '총소리를 들은 적들이 몰려옵니다. 근접 무기(쇠파이프·도끼·블레이드)는 조용합니다.',
  levelup:   () => `레벨 업! ${tipKey('C(능력치)', '능력치 버튼')}에서 포인트 3개를 분배하세요.`,
  upgrade:   () => `더 좋은 장비(▲)가 가방에 있습니다. ${tipKey('I(인벤토리)', '인벤토리 버튼')}에서 장착하세요.`,
  lowhp:     () => `체력이 낮습니다! 벨트의 ${ICON('medkit')} 구급상자 칸, 또는 캠프(안전 지대)로 돌아가면 회복됩니다.`,
  noammo:    () => `예비 탄약이 없습니다. ${tipKey('Q', 'Q 버튼')}로 권총(탄약 무한)이나 근접 무기로 바꾸고, 상점에서 탄약을 사세요.`,
  elite:     () => '◆ 엘리트 몬스터: 강하지만 경험치 4배 + 장비를 더 떨어뜨립니다. 접두어를 보고 대처하세요.',
  shop:      () => ICON('door') + ' 간판이 있는 건물은 들어갈 수 있습니다. 안에 적과 보급 상자가 있어요.',
  combo:     () => '연속 처치! 3초 안에 이어 잡으면 경험치 보너스가 쌓입니다 (최대 +50%).',
  workshop:  () => '가방이 차고 있습니다. 캠프의 정비공 최씨에게서 안 쓰는 장비를 분해해 재료로 바꾸세요.',
  bounty:    () => `오늘의 의뢰 3개가 있습니다 (${tipKey('J', '임무 버튼')}). 끝내면 희귀 이상 장비를 받습니다.`,
  fieldboss: () => '필드 보스는 미니맵의 붉은 깜빡임을 따라가세요. 희귀 이상 장비 확정!',
  deploy:    () => '캠프의 작전 장교 윤씨(출격 지도)에게서 맵을 골라 출격하세요. 창고 관리인에게 맡긴 물건은 안전합니다.',
  lab:       () => '지하 연구소는 어둡고 시야가 좁습니다. 총을 쏘면 섬광이 주변을 비춥니다. 보안 포탑은 움직이지 않으니 벽 뒤로 돌아가고, 초록 원(산성)은 굴러서 피하세요.',
  shield:    () => '방패 돌격병은 정면 피해를 65% 막습니다. 천천히 돌아서니 구르기로 옆·뒤를 잡거나, 수류탄·폭발로 공격하세요. 경직 중엔 방패가 내려갑니다.',
  cloak:     () => '은신 변이체는 가까이 오거나 맞기 전엔 공기가 일렁이는 윤곽만 보입니다. 보랏빛 눈과 일렁임을 찾고, 도약 예고선이 보이면 구르세요.',
  water:     () => '얕은 물에서는 사람도 적도 느려집니다. 쫓길 땐 물을 피하고, 근접형 적을 물가로 끌어들이세요.',
  melee:     () => `근접 무기는 계속 휘두르면 3타째에 강한 마무리(쇠파이프 강타 · 도끼 회전 베기 · 블레이드 돌진 찌르기)가 나갑니다. ${tipKey('Space', '구르기')} 직후 바로 공격하면 곧장 마무리 일격!`,
  events:    () => '이번 출격에 사건이 있습니다 (미니맵 노란 ◆ · 목표 창). 보급 투하·금고·둥지는 좋은 보상, 오래 머물면 경보 단계가 올라 적이 늘어납니다. 주황 점선 ◎은 조건을 채우면 열리는 특수 탈출.',
  perk:      () => '특성을 고를 수 있습니다! 능력치 창(C) 가운데의 특성 칸에서 하나를 고르세요. 스킬마다 갈래(오른쪽 버튼 2개)도 캠프에서 고를 수 있습니다.',
  camp:      () => '캠프 시설을 지을 수 있습니다! 생존자 대장 한씨 → 「캠프 시설」. 의무실·사격장·창고 증축·작업대·무전실 — 크레딧과 고철·전자 부품이 듭니다.',
  gadget:    () => `투척물·보조 소모품을 얻었습니다! 벨트의 투척 칸(화염병·섬광탄·지뢰) · 보조 칸(자극제·방탄판)에서 씁니다 — 칸이 없으면 ${tipKey('B', '벨트 버튼')}로 등록. 종류 바꾸기: ${tipKey('T / Y', '칸 모서리 ↻')}`,
  skillshop: () => '스킬은 스킬 포인트로 배웁니다 (레벨 업마다 +1 · 장 완료마다 +1). 능력치 창(C) → 「스킬 트리」. 레벨이 되면 새 스킬이 열리고, 스킬마다 갈래 2개·숙련·궁극도 스킬 포인트로 배웁니다.',
  extract:   () => '이번 출격에서 주운 장비·크레딧은 맵 끝의 초록 ◎ 탈출 지점에 5초 머물러야 확정됩니다. 죽으면 그것만 잃어요.',
};

const Tips = {
  t: 0,
  show(id) {
    const p = G.player;
    if (!Settings.tips || !p || p.tips.includes(id)) return;
    p.tips.push(id);
    const el = $('tip');
    el.innerHTML = `${ICON('tip')} ${TIPS[id]()}`;
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
    if (World.map === 'camp' && !p.tips.includes('skillshop') && SKILLS.some(s => p.level >= s.lvl && !p.skills[s.id] && (p.sp || 0) >= SKILL_SP.root)) return this.show('skillshop');
    if (World.map === 'camp' && p.level >= 5 && p.credits >= FAC_COST[0].credits && !Object.values(p.camp || {}).some(Boolean) && !p.tips.includes('camp')) return this.show('camp');
    if (World.map === 'camp' && p.level >= 1) { this.show('deploy'); if (World.map === 'camp') return; }
    if (p.raid && p.raid.t > 4) this.show('extract');
    if (p.raid && p.raid.t > 14 && RaidEvents.list.length && !p.tips.includes('events')) return this.show('events');
    if (G.enemies.some(e => e.type === 'shield' && near(e, 450))) return this.show('shield');
    if (G.enemies.some(e => e.type === 'stalker' && near(e, 400))) return this.show('cloak');
    if (World.slow(p.x, p.y) < 1) return this.show('water');
    if (World.def && World.def.lab && p.raid && p.raid.t > 12 && !p.tips.includes('lab')) return this.show('lab');
    if (G.enemies.some(e => near(e, 400) && (e.windT > 0 || e.pounceT > 0 || e.aimT > 0)) || G.strikes.some(s => Math.hypot(s.x - p.x, s.y - p.y) < 300)) return this.show('telegraph');
    if (G.enemies.filter(e => e.heard && near(e, 600)).length >= 2) return this.show('noise');
    if (w && WEAPONS[w.key].melee && G.enemies.some(e => near(e, 300))) return this.show('melee');
    if (PERK_TIERS.some((t, i) => p.level >= t.lvl && !p.perks[i])) return this.show('perk');
    if (!p.tips.includes('gadget') && Object.keys(GADGET_SLOTS).some(s => GADGET_SLOTS[s].some(k => Gadgets.count(k)))) return this.show('gadget');
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
