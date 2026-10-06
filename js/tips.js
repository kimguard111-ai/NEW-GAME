// 상황별 도움말 (v1.0): 처음 겪는 순간에 한 번만 보여줌. 본 팁은 세이브에 기록
const tipKey = (pc, mobile) => (IS_TOUCH ? mobile : pc);
// v1.39 말투: 설명서 대신 캠프 사람들이 건네는 짧은 한마디
const TIPS = {
  telegraph: () => `한씨: "머리 위에 붉은 느낌표, 바닥에 붉은 원이 보이면 곧 들어온다는 뜻이야. 급하면 ${tipKey('Space', `${ICON('roll')}`)}로 미끄러져 빠져. 대신 5초에 한 번뿐이다."`,
  noise:     () => '한씨: "총은 시끄러워. 쏘는 순간 근처 놈들이 다 몰려온다. 조용히 가려면 쇠파이프가 낫지."',
  levelup:   () => `몸이 한결 가볍다. ${tipKey('C', '능력치 버튼')}에서 포인트 3개를 나눠 주자.`,
  upgrade:   () => `가방에 지금 것보다 나은 장비가 있다. ${tipKey('I', '가방 버튼')}에서 갈아입자. 초록 ▲가 붙은 것.`,
  lowhp:     () => `피가 많이 빠졌다. 벨트의 ${ICON('medkit')} 구급상자를 쓰거나 캠프로 돌아가자.`,
  noammo:    () => `탄창이 비었다. 총마다 쓰는 탄이 다르다. 권총탄, 기관총탄, 산탄, 저격탄. ${tipKey('Q', 'Q 버튼')}로 다른 무기를 들고, 탄은 윤씨한테 사자.`,
  elite:     () => '이름 앞에 ◆가 붙은 놈은 엘리트다. 질기지만 잡으면 경험치도 장비도 넉넉하다.',
  shop:      () => ICON('door') + ' 간판 달린 가게는 들어갈 수 있다. 안에 놈들도 있고, 뒤질 상자도 있다.',
  combo:     () => '3초 안에 연달아 쓰러뜨리면 경험치가 조금씩 더 붙는다.',
  workshop:  () => '최씨: "가방 꽉 찼지? 안 쓰는 건 가져와. 뜯어서 쓸 만한 걸로 바꿔 줄게."',
  bounty:    () => `오늘 들어온 의뢰가 세 건 있다 (${tipKey('J', '임무 버튼')}). 다 끝내면 좋은 장비를 준다.`,
  fieldboss: () => '미니맵에 붉게 깜빡이는 게 있다. 큰 놈이다. 잡으면 좋은 장비가 확실히 나온다.',
  deploy:    () => '나가려면 작전 장교 윤씨를 찾아가자. 창고 정씨한테 맡긴 물건은 죽어도 안 잃는다.',
  lab:       () => '여긴 빛이 거의 없다. 총을 쏘면 그 불빛에 잠깐 주변이 보인다. 포탑은 움직이지 않으니 벽 뒤로 돌고, 초록 웅덩이는 밟지 말 것.',
  shield:    () => '방패 든 놈은 앞에서 쏘면 거의 안 들어간다. 돌아서는 게 느리니까 옆이나 뒤를 잡자. 폭발엔 방패도 소용없다.',
  cloak:     () => '공기가 일렁이면 거기 뭔가 있다. 보랏빛 눈을 찾아. 덤벼들기 직전에 붉은 선이 그어진다.',
  water:     () => '물에 들어가면 나도 놈들도 느려진다. 쫓길 때는 피하고, 달려드는 놈들은 물가로 끌어들이자.',
  melee:     () => `근접 무기는 세 번째 휘두를 때 크게 들어간다. ${tipKey('Space', '회피')}으로 파고든 직후 휘두르면 바로 그 한 방이 나간다.`,
  events:    () => '무전에 뭔가 잡혔다. 미니맵의 노란 ◆. 오래 머물수록 놈들이 늘어나니 욕심은 적당히. 주황 ◎은 조건을 채워야 열리는 탈출구다.',
  perk:      () => '특성을 하나 고를 수 있다. 능력치 창(C)이나 패시브 트리에서. 의무병 이씨가 나중에 초기화해 준다.',
  camp:      () => '한씨: "이제 캠프에 뭘 좀 지을 수 있겠어. 나한테 와서 「캠프 시설」을 봐."',
  gadget:    () => `화염병·자극제 같은 소모품은 <b>벨트</b>(아래 가운데)에 들어간다${tipKey(' (5~0 키)', '')}. 벨트가 좋을수록 칸이 많고, 바꾸려면 ${tipKey('B', '「등록」 칸')}.`, // v1.50
  skillshop: () => '스킬은 스킬 포인트로 배운다. 레벨이 오르거나 장을 끝낼 때마다 하나씩. 다 배울 순 없으니 골라서.',
  sp:        () => `스킬 포인트가 남았다. ${tipKey('K', '스킬 버튼')}에서 새로 배우거나 올리자.`, // v1.30
  belt:      () => `벨트(소모품 칸)가 꽉 찼다. 더 좋은 벨트를 차면 칸이 늘어난다. 넣을 것은 ${tipKey('B', '「등록」 칸')}로 바꾼다.`, // v1.50
  extract:   () => '주운 건 아직 내 것이 아니다. 맵 끝 초록 ◎에서 5초 버텨야 챙길 수 있다. 죽으면 그것만 잃는다.',
};

const Tips = {
  t: 0,
  COMBAT: new Set(['telegraph', 'lowhp', 'noammo', 'elite', 'shield', 'cloak', 'melee', 'water']), // v1.47.1 전투 중에 보여도 되는 팁
  show(id) {
    const p = G.player;
    if (!Settings.tips || !p || p.tips.includes(id)) return;
    if (G.combat && !this.COMBAT.has(id)) return; // 싸우는 중엔 나중에
    p.tips.push(id);
    const el = $('tip');
    el.innerHTML = `${ICON('tip')} ${TIPS[id]()}<span class="kh-x">✕</span>`; // v1.48.1 눌러서 닫기
    el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    clearTimeout(this.hideT); this.hideT = setTimeout(() => el.classList.add('hidden'), 6000); // v1.48.1 8초 → 6초
    SFX.play('ui');
  },
  // 0.5초마다 상황 확인 (한 번에 하나만)
  update(dt) {
    if ((this.t -= dt) > 0) return;
    this.t = 0.5;
    const p = G.player;
    if (!p || p.dead || !Settings.tips || FirstRun.busy()) return; // v1.45 키 그림이 떠 있거나 곧 뜰 차례면 기다림
    const near = (e, r) => e.hp > 0 && dist(e, p) < r;
    const w = curWeapon(), mh = PlayerStats.maxHp(p);
    if (World.map === 'camp' && !p.tips.includes('growth') && ((p.rec && p.rec.extracts) || p.deaths)) return Growth.show(); // v1.30 첫 출격 뒤 성장 안내 (한 번)
    if (!p.tips.includes('sp') && (p.sp || 0) >= 1 && SKILLS.some(s => (!p.skills[s.id] && p.level >= s.lvl) || (p.skills[s.id] && srank(s.id) < SKILL_RANKS && p.level >= rankLvl(s, srank(s.id) + 1))) && !UI.anyOpen()) return this.show('sp');
    if (!p.tips.includes('belt') && BELT_ITEMS.some(k => k !== 'ammo' && consCount(k) && !p.hotbar.slice(0, beltSlots(p)).includes(k)) && !p.hotbar.slice(0, beltSlots(p)).includes(null)) return this.show('belt'); // v1.50
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
    if (w && !WEAPONS[w.key].melee && !WEAPONS[w.key].infinite && (p.ammo[WEAPONS[w.key].ammo] || 0) <= 0) return this.show('noammo');
    if (G.enemies.some(e => e.affix && near(e, 500))) return this.show('elite');
    if (!G.inside && World.buildings.some(b => Math.hypot(b.doorX - p.x, b.doorY - p.y) < 260)) return this.show('shop');
    if (G.combo >= 3 && G.time - G.comboT < 3) return this.show('combo');
    if (p.inventory.filter(it => it.kind !== 'cons').length >= 12) return this.show('workshop');
    if (p.level >= 3 && p.bounty) return this.show('bounty');
    if (G.fieldBoss) return this.show('fieldboss');
  },
};

// v1.30 성장 안내: 첫 출격(탈출이든 사망이든)을 마치고 캠프에 돌아오면 한 번 — 이 게임에서 강해지는 길 6가지를 한 화면에
const Growth = {
  show() {
    const p = G.player; if (UI.anyOpen()) return; p.tips.push('growth');
    const k = (pc, m) => tipKey(pc, m), row = (ic, t, d) => `<div class="gw-row">${ICON(ic)} <b>${t}</b><span>${d}</span></div>`;
    UI.dialog('생존자 대장 한씨', `"살아 돌아왔군. 여기서 오래 버티려면 몇 가지는 알아 둬."<div class="growth">` // v1.39 말투
      + row('stats', `능력치 ${k('(C)', '')}`, '레벨이 오를 때마다 3점. 힘, 사격, 체력, 민첩 중에 네 싸움에 맞게.')
      + row('rapid', `스킬 ${k('(K)', '')}`, '레벨마다 스킬 포인트가 하나 생겨. 전부는 못 배우니까 골라.')
      + row('tip', '특성', '5레벨마다 하나씩 고를 수 있다. 같은 갈래로 셋 모으면 덤이 붙고.')
      + row('belt', `벨트 ${k('(B)', '')}`, '좋은 벨트일수록 손에 바로 쥘 칸이 늘어. 스킬이든 약이든 거기 넣어.')
      + row('settings', '정비공 최씨', '장비를 손봐 주고, 못 쓰는 건 뜯어서 재료로 바꿔 준다.')
      + row('map', '캠프 시설', '나한테 오면 의무실이나 사격장 같은 걸 지을 수 있어.')
      + `</div><span class="muted">"좋은 물건은 가게보다 밖에서 나와. 대신 살아서 돌아와야 네 거다."</span>`, [['알겠어요', () => UI.close('dialog')]]);
    SFX.play('ui');
  },
};
