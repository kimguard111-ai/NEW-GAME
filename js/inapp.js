// v2.0.36 앱 안 브라우저(카카오톡 · 인스타그램 · 네이버 앱 등) 경고 — 그 안에서 열면 크롬과 저장 공간이 달라서 세이브가 따로이고, 앱 정리 때 지워지기도 함
// 타이틀 화면에 한 줄 경고 + 「크롬(기본 브라우저)에서 열기」 버튼. 카카오톡은 외부 열기 주소를 쓰고, 안드로이드 다른 앱은 크롬 인텐트, 그 외(아이폰 등)는 메뉴 안내문
const InApp = {
  RE: /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\/|DaumApps|Snapchat|; wv\)/i,
  ua() { return (typeof navigator !== 'undefined' && navigator.userAgent) || ''; },
  detect(ua = this.ua()) { return this.RE.test(ua); },
  kind(ua = this.ua()) { return /KAKAOTALK/i.test(ua) ? 'kakao' : /NAVER\(inapp/i.test(ua) ? 'naver' : /Instagram/i.test(ua) ? 'insta' : /FBAN|FBAV|FB_IAB/i.test(ua) ? 'fb' : 'other'; },
  // 외부 브라우저로 여는 주소 (못 만들면 null → 메뉴 안내만)
  externalUrl(ua = this.ua(), href = typeof location !== 'undefined' ? location.href : '') {
    if (!href) return null;
    const clean = href.split('#')[0];
    if (/KAKAOTALK/i.test(ua)) return 'kakaotalk://web/openExternal?url=' + encodeURIComponent(clean);
    if (/Android/i.test(ua)) { try { const u = new URL(clean); return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.replace(':', '')};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(clean)};end`; /* 크롬이 없으면 그냥 지금 창에서 열림 */ } catch (e) { return null; } }
    return null;
  },
  go(url) { location.href = url; },
  help(ua = this.ua()) {
    const k = this.kind(ua), ios = /iPhone|iPad|iPod/i.test(ua);
    if (k === 'naver') return '화면 오른쪽 아래 「⋯」 → 「기본 브라우저로 열기」';
    return ios ? '화면 아래(또는 위) 「⋯」 → 「Safari로 열기」' : '화면 오른쪽 위 「⋮」 → 「다른 브라우저로 열기」';
  },
  show() {
    if (!this.detect()) return;
    let dismissed = false; try { dismissed = sessionStorage.getItem('seoul2049-inapp') === '1'; } catch (e) { /* 막힘 */ }
    if (dismissed) return;
    const el = document.getElementById('inapp-warn'); if (!el) return;
    const url = this.externalUrl();
    el.classList.remove('hidden');
    el.innerHTML = `<b>앱 안 브라우저로 열었어요.</b> 여기서는 <b>저장이 크롬과 따로</b>이고, 앱을 정리하면 <b>세이브가 사라질 수 있어요.</b>`
      + (url ? ` <button id="btn-inapp-go">크롬에서 열기</button>` : `<div class="inapp-help">${this.help()}</div>`)
      + ` <button id="btn-inapp-no" class="inapp-no">그대로 할게요</button>`;
    const go = document.getElementById('btn-inapp-go'); if (go) go.onclick = () => { this.go(url); setTimeout(() => { const h = el.querySelector('.inapp-help'); if (!h) el.insertAdjacentHTML('beforeend', `<div class="inapp-help">안 열리면: ${this.help()}</div>`); }, 1200); };
    document.getElementById('btn-inapp-no').onclick = () => { try { sessionStorage.setItem('seoul2049-inapp', '1'); } catch (e) { /* 막힘 */ } el.classList.add('hidden'); };
  },
};
window.addEventListener('load', () => InApp.show());
