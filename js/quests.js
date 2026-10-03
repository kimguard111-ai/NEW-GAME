// 메인 퀘스트 · 챕터 (v0.7)
// 장 시작만 캠프의 한씨에게 받고, 장 안의 단계는 완료하면 무전으로 보상 → 바로 다음 단계
// 단계 종류: kill(처치) · reach(랜드마크 도착) · collect(처치 시 확률로 회수) · hunt(네임드 적 사냥)

// 네임드 적: 랜드마크 근처에 나타나는 강한 개체
const ELITES = {
  glutton: { name: '거대 감염체 「먹보」', base: 'zombie', level: 5, at: 'cathedral', hpMul: 9, dmgMul: 1.6, scale: 1.45, speedMul: 0.85 },
  panther: { name: '약탈자 두목 「흑표」', base: 'raider', level: 10, at: 'bosingak', hpMul: 8, dmgMul: 1.4, scale: 1.25, fireMul: 0.45 },
  argos:   { name: '자율 전투 드론 「아르고스」', base: 'drone', level: 15, at: 'base', hpMul: 9, dmgMul: 1.3, scale: 1.7, fireMul: 0.4 },
};

const CHAPTERS = [
  { title: '제1장 · 첫 발걸음', minLevel: 1,
    intro: '명동은 캠프에서 가장 가까운 폐허지. 먼저 감염자를 정리하고, 명동성당 쪽에서 끊긴 정찰조 신호를 확인해 주게.',
    outro: '먹보를 쓰러뜨렸다고? 명동이 숨을 돌리겠군. 다음은 종로야. 준비되면 캠프로 오게.',
    steps: [
      { type: 'kill', target: 'zombie', count: 8, text: '캠프 밖 명동 잔해의 감염자를 정리하라.',
        reward: { exp: 90, credits: 150, items: [['medkit', 2]], equip: 'vest' } },
      { type: 'reach', landmark: 'cathedral', text: '정찰조의 마지막 신호가 잡힌 명동성당으로 가라.',
        reward: { exp: 150, credits: 150 } },
      { type: 'hunt', elite: 'glutton', text: '성당에 둥지를 튼 거대 감염체 「먹보」를 처치하라.',
        reward: { exp: 400, credits: 400, gear: 1 } },
    ] },
  { title: '제2장 · 약탈자의 거리', minLevel: 5,
    intro: '종로의 약탈자들이 우리 보급로를 끊었네. 길을 열고, 빼앗긴 보급품을 되찾아 오게.',
    outro: '흑표가 쓰러졌으니 종로 보급로가 다시 열렸어. 용산 쪽에서 이상한 기계음이 들린다더군.',
    steps: [
      { type: 'kill', target: 'dog', count: 8, text: '보급로를 막고 있는 변이견 무리를 처치하라.',
        reward: { exp: 300, credits: 300, items: [['ammo', 3]] } },
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
    outro: '해냈군. 타이탄이 쓰러졌어. 서울에 다시 사람이 살 수 있게 될 거야. 고맙네, 영웅.',
    steps: [
      { type: 'reach', landmark: 'tower63', text: '여의도의 63빌딩 잔해로 가라. (방독면 헬멧 권장)',
        reward: { exp: 5000, credits: 2000 } },
      { type: 'collect', from: 'brute', zone: 4, item: '방사능 시료', count: 5, chance: 0.5, text: '여의도의 변이 거한에게서 방사능 시료를 채취하라.',
        reward: { exp: 8000, credits: 3000 } },
      { type: 'kill', target: 'boss', count: 1, text: '방사능 군주 타이탄을 처치하라.',
        reward: { exp: 20000, credits: 10000, gear: 4 } },
    ] },
];

function radio(msg) { log(`📻 한씨: "${msg}"`, '#8cf'); }

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
    if (lmId) { const l = World.landmarks.find(x => x.id === lmId); return { x: l.x, y: l.y }; }
    if (st.type === 'kill' && st.target === 'boss') return { x: World.bossTile.x * TILE, y: World.bossTile.y * TILE };
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
    const p = G.player, st = this.step(p);
    if (!st || p.dead) return;
    if (st.type === 'reach') {
      const l = World.landmarks.find(x => x.id === st.landmark);
      if (dist(p, l) < l.size * TILE / 2 + 170) p.quest.progress = 1;
    }
    if (st.type === 'hunt' && !G.elite && p.quest.progress < 1) { // 처치 후 다시 생기지 않게
      const def = ELITES[st.elite], l = World.landmarks.find(x => x.id === def.at);
      if (dist(p, l) < 950) this.spawnElite(st.elite, l);
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
      log(`⚠ ${def.name} 출현!`, '#ffa53a');
      return;
    }
  },

  grant(r, level) {
    const p = G.player;
    p.credits += r.credits;
    if (r.items) for (const [k, n] of r.items) addItem(makeConsumable(k, n));
    const give = it => { if (!addItem(it)) G.drops.push({ x: p.x, y: p.y + 20, kind: 'item', item: it, t: 0 }); return it; };
    if (r.equip) { const it = give(makeGear(r.equip, Math.max(p.level, 1), 0)); log(`보상 장비: ${it.name} — 인벤토리(I)에서 장착하세요`, '#8cf'); }
    if (r.gear) { const it = give(randomGear(Math.max(p.level, level), r.gear)); log(`보상 장비: ${itemName(it)}`, RARITIES[it.rarity].color); }
    log(`보상: EXP ${fmt(r.exp)}, ${fmt(r.credits)}₵`, '#8cf');
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
    } else {
      const next = c.steps[p.quest.step];
      radio(next.text);
      UI.toast('다음 목표', this.objective(next));
    }
    UI.refreshQuest(); saveGame();
  },
};
