// 메인 퀘스트 · 챕터 (v0.7)
// 장 시작만 캠프의 한씨에게 받고, 장 안의 단계는 완료하면 무전으로 보상 → 바로 다음 단계
// 단계 종류: kill(처치) · reach(랜드마크 도착) · collect(처치 시 확률로 회수) · hunt(네임드 적 사냥)

// 네임드 적: 랜드마크 근처에 나타나는 강한 개체
const ELITES = {
  glutton: { name: '거대 감염체 「먹보」', base: 'zombie', level: 5, at: 'cathedral', hpMul: 9, dmgMul: 1.6, scale: 1.45, speedMul: 0.85 },
  panther: { name: '약탈자 두목 「흑표」', base: 'raider', level: 10, at: 'bosingak', hpMul: 8, dmgMul: 1.4, scale: 1.25, fireMul: 0.45 },
  argos:   { name: '자율 전투 드론 「아르고스」', base: 'drone', level: 13, at: 'base', hpMul: 9, dmgMul: 1.3, scale: 1.7, fireMul: 0.4 }, // v1.62 Lv15 → 13 (3장에 오는 Lv10~12가 봇 기준 8번 연속 사망)
  raven:   { name: '블랙선 용병대장 「레이븐」', base: 'merc', level: 25, at: 'coex', hpMul: 12, dmgMul: 1.3, scale: 1.3, fireMul: 0.5 }, // v1.6
  babel:   { name: '변이 군주 「바벨」', base: 'brute', level: 30, at: 'lotte', hpMul: 16, dmgMul: 1.4, scale: 1.8, speedMul: 1.15 },
};

const CHAPTERS = [
  { title: '제1장 · 첫 발걸음', minLevel: 1,
    intro: '명동은 캠프에서 가장 가까운 폐허지. 먼저 감염자를 정리하고, 언덕 위 성당에서 끊긴 정찰조 신호를 확인해 주게.',
    outro: '먹보를 쓰러뜨렸다고? 명동이 숨을 돌리겠군. 다음은 종로야. 준비되면 캠프로 오게.',
    steps: [
      { type: 'kill', target: 'zombie', count: 8, text: '캠프 밖 명동 잔해의 감염자를 정리하라.',
        reward: { exp: 90, credits: 150, items: [['medkit', 2]], equip: 'vest' } },
      { type: 'reach', landmark: 'cathedral', text: '정찰조의 마지막 신호가 잡힌 언덕 위 성당으로 가라.',
        reward: { exp: 150, credits: 150, equip: 'smg' } }, // v1.30 정찰조가 남긴 기관단총 — 권총만으로 버티는 초반을 짧게
      { type: 'hunt', elite: 'glutton', text: '성당에 둥지를 튼 거대 감염체 「먹보」를 처치하라.',
        reward: { exp: 400, credits: 400, gear: 1 } },
    ] },
  { title: '제2장 · 약탈자의 거리', minLevel: 5,
    intro: '종로의 약탈자들이 우리 보급로를 끊었네. 길을 열고, 빼앗긴 보급품을 되찾아 오게.',
    outro: '흑표가 쓰러졌으니 종로 보급로가 다시 열렸어. 용산 쪽에서 이상한 기계음이 들린다더군.',
    steps: [
      { type: 'kill', target: 'dog', count: 8, text: '보급로를 막고 있는 변이견 무리를 처치하라.',
        reward: { exp: 300, credits: 300, items: [['ammo', 3]], equip: 'shotgun' } }, // v1.46 개떼엔 산탄총 — Lv1~10 무기 흐름: 권총 → 기관단총(1장) → 산탄총(2장) → 소총(Lv8 상점·드랍)
      { type: 'collect', from: 'raider', item: '약탈당한 보급품', count: 6, chance: 0.4, text: '종로의 약탈자에게서 빼앗긴 보급품을 되찾아라.',
        reward: { exp: 700, credits: 600 } },
      { type: 'reach', landmark: 'bosingak', text: '약탈자들의 거점, 보신각으로 가라.',
        reward: { exp: 600, credits: 300 } },
      { type: 'hunt', elite: 'panther', text: '약탈자 두목 「흑표」를 처치하라.',
        reward: { exp: 1500, credits: 1200, gear: 2 } },
    ] },
  { title: '제3장 · 기계의 눈', minLevel: 10,
    intro: '용산 기지의 경비 시스템이 아직 살아 있어. 드론을 움직이는 중앙 기체가 있을 거야. 놈을 찾아 꺼 주게.',
    outro: '아르고스의 데이터에 여의도 지하 시설 기록이 있었네. 방사능 지대... 그곳에 모든 원흉이 있어.',
    steps: [
      { type: 'kill', target: 'brute', count: 6, text: '용산 진입로를 막는 변이 거한을 처치하라.',
        reward: { exp: 3000, credits: 1500 } },
      { type: 'collect', from: 'drone', item: '드론 데이터칩', count: 5, chance: 0.45, text: '경비 드론을 격추해 데이터칩을 회수하라.',
        reward: { exp: 3500, credits: 1500 } },
      { type: 'reach', landmark: 'base', text: '신호가 모이는 버려진 용산 기지로 가라.',
        reward: { exp: 2000, credits: 800 } },
      { type: 'hunt', elite: 'argos', text: '기지를 지키는 자율 전투 드론 「아르고스」를 격추하라.',
        reward: { exp: 6000, credits: 3000, gear: 3 } },
    ] },
  { title: '제4장 · 방사능 지대', minLevel: 15,
    intro: '여의도는 방사능 웅덩이투성이야. 방독면 헬멧 없이는 오래 못 버티니 꼭 챙기게. 그리고... 타이탄을 끝내 주게.',
    outro: '해냈군. 타이탄이 쓰러졌어. 그런데 여의도 지하에서 연구소 입구가 나왔고, 거기 기록에 강남의 「블랙선」이라는 이름이 있었네. 아직 끝이 아니야.',
    steps: [
      { type: 'reach', landmark: 'tower63', text: '여의도의 금빛타워 잔해로 가라. (방독면 헬멧 권장)',
        reward: { exp: 5000, credits: 2000 } },
      { type: 'collect', from: 'brute', zone: 4, item: '방사능 시료', count: 5, chance: 0.5, text: '여의도의 변이 거한에게서 방사능 시료를 채취하라.',
        reward: { exp: 8000, credits: 3000 } },
      { type: 'kill', target: 'boss', count: 1, text: '방사능 군주 타이탄을 처치하라.',
        reward: { exp: 20000, credits: 10000, gear: 4 } },
    ] },
  // v1.6 강남 · 잠실
  { title: '제5장 · 강남의 그림자', minLevel: 20,
    intro: '연구소 기록에 나온 민간 군사 회사 「블랙선」이 강남을 틀어쥐고 있네. 놈들이 실험체를 실어 나르고 있었어. 방패병은 정면으로 상대하지 말고 뒤로 돌거나 수류탄을 쓰게.',
    outro: '레이븐의 단말기에 잠실 좌표가 찍혀 있었네. 스카이타워 꼭대기에서 신호가 나와. 모든 변이의 근원이 거기 있어.',
    steps: [
      { type: 'kill', target: 'merc', count: 12, text: '강남 업무지구의 블랙선 용병을 처치하라.',
        reward: { exp: 9000, credits: 4000, items: [['medkit', 3]] } },
      { type: 'collect', from: 'merc', item: '블랙선 반출 기록', count: 6, chance: 0.4, text: '용병에게서 실험체 반출 기록을 회수하라.',
        reward: { exp: 12000, credits: 5000 } },
      { type: 'reach', landmark: 'coex', text: '블랙선 본부가 있는 무너진 무역센터로 가라.',
        reward: { exp: 8000, credits: 3000 } },
      { type: 'hunt', elite: 'raven', text: '블랙선 용병대장 「레이븐」을 처치하라.',
        reward: { exp: 25000, credits: 12000, gear: 3 } },
    ] },
  { title: '제6장 · 바벨의 탑', minLevel: 25,
    intro: '잠실은 변이체 소굴이야. 눈에 안 보이는 놈들도 있다더군. 공기가 일렁이면 바로 몸을 날려 피하게. 석촌호수 물가에선 발이 느려지니 조심하고.',
    outro: '바벨이 쓰러졌다. 탑의 신호도 끊겼어. 이제 정말로 끝이야... 서울은 다시 우리 것이네.',
    steps: [
      { type: 'kill', target: 'stalker', count: 10, text: '잠실의 은신 변이체를 처치하라. (일렁임을 보라)',
        reward: { exp: 15000, credits: 6000 } },
      { type: 'collect', from: 'brute', zone: 7, item: '변이 핵', count: 6, chance: 0.45, text: '잠실의 변이 거한에게서 변이 핵을 채취하라.',
        reward: { exp: 20000, credits: 8000 } },
      { type: 'reach', landmark: 'lotte', text: '신호가 나오는 스카이타워 잔해로 가라.',
        reward: { exp: 12000, credits: 5000 } },
      { type: 'hunt', elite: 'babel', text: '모든 변이의 근원, 변이 군주 「바벨」을 처치하라.',
        reward: { exp: 40000, credits: 20000, gear: 4 } },
    ] },
];

function radio(msg) { log(`${ICON('radio')} 한씨: "${msg}"`, '#8cf'); }

const Story = {
  chapter(p) { return CHAPTERS[p.quest.ch]; },
  step(p) { const c = CHAPTERS[p.quest.ch]; return c && p.quest.active ? c.steps[p.quest.step] : null; },
  count(st) { return st.type === 'reach' || st.type === 'hunt' ? 1 : st.count; },
  done(p) { return p.quest.ch >= CHAPTERS.length; },

  // v0.6 이전 세이브: 6개 단일 임무 번호 → 장·단계
  migrate(q) {
    if (q && 'ch' in q) return q;
    const map = [[0, 0], [1, 0], [1, 1], [2, 0], [2, 1], [3, 2], [4, 0]];
    const [ch, step] = map[Math.min(q ? q.idx || 0 : 0, 6)];
    return { ch, step, active: !!(q && q.active) && ch < CHAPTERS.length, progress: 0 };
  },

  objective(st) {
    if (st.type === 'kill') return `${ENEMIES[st.target].name} 처치`;
    if (st.type === 'reach') return `${LANDMARKS.find(l => l.id === st.landmark).name}에 도착`;
    if (st.type === 'collect') return `${st.item} 회수 (${ENEMIES[st.from].name})`;
    return `${ELITES[st.elite].name} 처치`;
  },

  // 목표 위치 (방향 화살표·미니맵). 없으면 null
  target(p) {
    const st = this.step(p);
    if (!st) return null;
    const lmId = st.type === 'reach' ? st.landmark : st.type === 'hunt' ? ELITES[st.elite].at : null;
    if (lmId) { const l = World.landmarks.find(x => x.id === lmId); return l ? { x: l.x, y: l.y } : null; } // 다른 맵이면 없음
    if (st.type === 'kill' && st.target === 'boss') return World.bossTile ? { x: World.bossTile.x * TILE, y: World.bossTile.y * TILE } : null;
    return null;
  },

  start(p) {
    const c = this.chapter(p);
    p.quest.active = true; p.quest.progress = 0;
    radio(c.intro);
    UI.toast(c.title, this.objective(c.steps[p.quest.step]));
    UI.refreshQuest(); saveGame();
  },

  onKill(e) {
    const p = G.player, st = this.step(p);
    if (!st) return;
    if (st.type === 'kill' && st.target === e.type) p.quest.progress++;
    else if (st.type === 'hunt' && e.elite === st.elite) p.quest.progress = 1;
    else if (st.type === 'collect' && st.from === e.type && (!st.zone || World.zoneIndex(e.x, e.y) === st.zone) && Math.random() < st.chance) {
      p.quest.progress++;
      floatText(e.x, e.y - 20, `+${st.item}`, '#8cf', 14);
    } else return;
    UI.refreshQuest();
  },

  update() {
    const p = G.player, c0 = this.chapter(p);
    // v1.0: 다음 장은 레벨이 되면 무전으로 바로 시작 (캠프 왕복 없음)
    if (c0 && !p.quest.active && p.level >= c0.minLevel && !p.dead && World.map === CHAPTER_MAP[p.quest.ch] && G.time - (this.autoT || -99) > 5) { this.autoT = G.time; this.start(p); }
    const st = this.step(p);
    if (!st || p.dead) return;
    if (st.type === 'reach') {
      const l = World.landmarks.find(x => x.id === st.landmark);
      if (l && dist(p, l) < l.size * TILE / 2 + 170) p.quest.progress = 1;
    }
    if (st.type === 'hunt' && !G.elite && p.quest.progress < 1) { // 처치 후 다시 생기지 않게
      const def = ELITES[st.elite], l = World.landmarks.find(x => x.id === def.at);
      if (l && dist(p, l) < 950) this.spawnElite(st.elite, l);
    }
    if (p.quest.progress >= this.count(st)) this.completeStep();
  },

  spawnElite(id, l) {
    const def = ELITES[id];
    for (let i = 0; i < 24; i++) { // 랜드마크 주변 빈 자리
      const a = i / 24 * TAU, r = l.size * TILE / 2 + 70;
      const x = l.x + Math.cos(a) * r, y = l.y + Math.sin(a) * r;
      if (World.circleBlocked(x, y, ENEMIES[def.base].r * def.scale) || World.buildingAt(x, y)) continue;
      const e = makeEnemy(def.base, x, y, def.level);
      e.elite = id; e.scale = def.scale; e.art = id; // 전용 그림 키 (assets.js)
      e.hp = e.maxHp = Math.round(e.maxHp * def.hpMul); e.dmg *= def.dmgMul;
      e.r = Math.round(e.r * def.scale); e.speed *= def.speedMul || 1; e.fireMul = def.fireMul || 1;
      e.weight = e.def.weight * 4; // 잘 밀리지 않음
      G.enemies.push(e); G.elite = e;
      log(`${ICON('warn')} ${def.name} 출현!`, '#ffa53a');
      return;
    }
  },

  grant(r, level) {
    const p = G.player;
    const cr = Math.round(r.credits * ECON.cr); p.credits += cr; // v1.25 이야기 보상 크레딧도 절반
    if (r.items) for (const [k, n] of r.items) addItem(makeConsumable(k, n));
    const give = it => { if (!addItem(it)) G.drops.push({ x: p.x, y: p.y + 20, kind: 'item', item: it, t: 0 }); return it; };
    if (r.equip) { const it = give(makeGear(r.equip, Math.max(p.level, 1), 0)); log(`보상 장비: ${it.name}. 인벤토리(I)에서 장착`, '#8cf'); }
    if (r.gear) { let g = null; for (let k = 0; k < 8 && (!g || (g.kind === 'weapon' && WEAPONS[g.key].melee) || [...p.inventory, ...Object.values(p.equip)].some(o => o && o.key === g.key && o.rarity >= g.rarity)); k++) g = randomGear(Math.max(p.level, level), r.gear); // v1.57 이미 가진 것(도끼 등)·근접은 피해서
      const it = give(g); log(`보상 장비: ${itemName(it)}`, RARITIES[it.rarity].color); }
    log(`보상: EXP ${fmt(r.exp)}, ${fmt(cr)}₵`, '#8cf');
    gainExp(r.exp);
  },

  completeStep() {
    const p = G.player, c = this.chapter(p), st = c.steps[p.quest.step];
    SFX.play('quest');
    radio(`좋아, "${this.objective(st)}" 확인했네. 보상을 보내지.`);
    this.grant(st.reward, c.minLevel);
    p.quest.step++; p.quest.progress = 0;
    if (p.quest.step >= c.steps.length) {
      radio(c.outro);
      UI.toast(`${c.title} 완료!`, CHAPTERS[p.quest.ch + 1] ? `다음 장: Lv${CHAPTERS[p.quest.ch + 1].minLevel} 이상 · 캠프의 한씨` : '모든 장을 완료했습니다');
      p.quest.ch++; p.quest.step = 0; p.quest.active = false;
      p.sp = (p.sp || 0) + 1; log('장 완료 보상: 스킬 포인트 +1', '#7fd'); // v1.25
      if (!CHAPTERS[p.quest.ch] && !p.finalEnd) { p.ended = p.finalEnd = true; setTimeout(() => Pause.ending(), 2500); } // v1.0 엔딩 · v1.6 제6장 뒤로 (4장에서 본 사람도 다시 봄)
    } else {
      const next = c.steps[p.quest.step];
      radio(next.text);
      UI.toast('다음 목표', this.objective(next));
    }
    UI.refreshQuest(); saveGame();
  },
};
