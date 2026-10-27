// v1.85 서비스 워커: 한 번 켠 뒤로는 인터넷이 없어도 실행 · 다시 켤 때 빠르게
// - 화면 틀(index.html · js · css · manifest): 네트워크 먼저 → 실패하면 저장본 (온라인이면 늘 최신 패치)
// - 그림 · 소리 · 글꼴(assets/): 저장본 먼저 → 뒤에서 새로 받아 다음 실행 때 반영 (주소의 ?v= 는 무시하고 같은 파일로 봄)
// VERSION 은 tools/bump-cache.sh 가 바꿈 — 바뀌면 옛 화면 틀 저장본을 지움 (그림 저장본은 그대로 · 바뀐 그림은 뒤에서 갱신)
const VERSION = 'v1.98.6';
const CORE = 'seoul2049-core-' + VERSION, ART = 'seoul2049-art';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(['./', './index.html', './manifest.json', './privacy.html'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('seoul2049-core-') && k !== CORE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 다른 사이트(구글 글꼴 등)는 건드리지 않음
  if (url.pathname.includes('/assets/')) { // 그림 · 소리: 저장본 먼저
    const key = url.origin + url.pathname; // ?v= 를 뺀 주소 하나로만 저장 (버전마다 같은 그림이 쌓이지 않게)
    e.respondWith(caches.open(ART).then(c => c.match(key).then(hit => {
      const net = fetch(req).then(r => { if (r && r.ok && r.status === 200) c.put(key, r.clone()); return r; }).catch(() => hit);
      if (hit) { try { e.waitUntil(net.catch(() => {})); } catch (er) { /* 이미 끝난 이벤트 */ } return hit; }
      return net;
    })));
    return;
  }
  // 화면 틀: 네트워크 먼저
  e.respondWith(fetch(req).then(r => { if (r && r.ok && r.status === 200) { const cp = r.clone(); caches.open(CORE).then(c => c.put(req, cp)); } return r; })
    .catch(() => caches.open(CORE).then(c => c.match(req).then(hit => hit || c.match(req, { ignoreSearch: true })).then(hit => hit || (req.mode === 'navigate' ? c.match('./index.html') : undefined)))));
});
