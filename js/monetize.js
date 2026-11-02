// v2.0.32 수익화 준비 (광고 보기 · 결제로 외형 얻기) — 지금은 스위치가 꺼져 있어 화면에 아무것도 안 보임
// 1차 출시는 「광고 없음 · 결제 없음」 (스토어 설문 · 개인정보처리방침이 그렇게 적혀 있음). 켜기 전에 docs/MONETIZE.md 체크리스트를 먼저 할 것.
//
// 구조
//  MONEY      스위치 (ads · iap) 와 공급자 이름. 둘 다 false 면 아래 코드는 전혀 동작하지 않음 (테스트 주소에서만 켜서 흐름 확인)
//  Monetize   공급자 어댑터: rewardedAd() → Promise<boolean> (끝까지 봤나) · purchase(sku) → Promise<boolean> · restore()
//             공급자 'none' (끄기) · 'dev' (테스트 주소용 가짜 광고 · 가짜 결제). 실제 공급자(구글 플레이 결제 · 광고 SDK)는 여기 한 곳에만 붙임
//  Unlocks    「이 꾸미기를 가졌나」 = 무료 조건(레벨 · 업적) 달성 OR 산 것(p.own) — 광고 시청 횟수는 p.adProg 에 저장
//  항목 정의에 ad: N (광고 N회) · sku: '상품 ID' 만 적으면 그 항목이 팔리는 항목이 됨 (구글 플레이 콘솔의 상품 ID 와 같게)
const MONEY = { ads: false, iap: false, provider: 'none' };
if (typeof TEST_BUILD !== 'undefined' && TEST_BUILD) { MONEY.ads = MONEY.iap = true; MONEY.provider = 'dev'; } // 테스트 주소에서만 켜서 흐름 확인

const Monetize = {
  busy: false,
  // 보상형 광고: 끝까지 봤을 때만 true
  rewardedAd() {
    if (!MONEY.ads || this.busy) return Promise.resolve(false);
    this.busy = true; const done = v => { this.busy = false; return v; };
    if (MONEY.provider === 'dev') return this.devOverlay('광고 (테스트) — 3초 뒤 보상', 3000).then(done);
    // TODO 실제 공급자: 구글 H5 게임 광고(adBreak type:'reward') 또는 앱 광고 SDK — 끝까지 봤을 때만 resolve(true)
    return Promise.resolve(done(false));
  },
  // 결제: 성공하면 true (영수증 확인은 실제 공급자 쪽에서)
  purchase(sku) {
    if (!MONEY.iap || this.busy) return Promise.resolve(false);
    if (MONEY.provider === 'dev') return Promise.resolve(typeof confirm === 'function' ? confirm('[테스트 결제] ' + sku + ' 를 산 것으로 칩니다. 진행할까요?') : true);
    // TODO 실제 공급자: 구글 플레이 결제 (TWA 는 Digital Goods API + Payment Request) → 성공하면 resolve(true)
    return Promise.resolve(false);
  },
  // 이미 산 것 복원 (기기를 바꾸거나 지웠을 때) — 실제 공급자에서 산 상품 목록을 읽어 Unlocks.grant
  restore() { return Promise.resolve([]); },
  devOverlay(text, ms) {
    return new Promise(res => {
      const el = document.createElement('div'); el.className = 'dev-ad'; el.innerHTML = `<div>${text}</div><div class="dev-ad-bar"><i></i></div>`; document.body.appendChild(el);
      requestAnimationFrame(() => { el.querySelector('i').style.width = '100%'; el.querySelector('i').style.transitionDuration = ms + 'ms'; });
      setTimeout(() => { el.remove(); res(true); }, ms + 80);
    });
  },
};

const Unlocks = {
  own(p, id) { return !!(p.own && p.own[id]); },
  grant(p, id, how) { p.own = p.own || {}; p.own[id] = how || 1; },
  adCount(p, id) { return (p.adProg && p.adProg[id]) || 0; },
  has(p, d) { return !!d.ok(p) || this.own(p, d.id); },
  canAd(d) { return MONEY.ads && d.ad > 0; },
  canBuy(d) { return MONEY.iap && !!d.sku; },
  canGet(d) { return this.canAd(d) || this.canBuy(d); },
  // 잠긴 항목을 눌렀을 때: 광고 → (아니오면) 구매 순서로 물어봄. done(바뀌었나) 로 화면 갱신
  offer(p, d, done) {
    const buy = () => { if (!this.canBuy(d)) return; Ask.show(`${d.name} — 구매할까요?${d.price ? ' (' + d.price + ')' : ''}`, () => Monetize.purchase(d.sku).then(ok => { if (ok) { this.grant(p, d.id, 'buy'); saveGame(); SFX.play('coin'); } done(ok); })); };
    if (this.canAd(d)) {
      const n = this.adCount(p, d.id);
      Ask.show(`${d.name} — 광고를 끝까지 보면 얻을 수 있어요 (${n}/${d.ad}). 지금 볼까요?`, () => Monetize.rewardedAd().then(ok => {
        if (ok) { p.adProg = p.adProg || {}; p.adProg[d.id] = n + 1; if (p.adProg[d.id] >= d.ad) { this.grant(p, d.id, 'ad'); SFX.play('coin'); } saveGame(); }
        done(ok); }), () => buy());
    } else buy();
  },
};
