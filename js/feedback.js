// v1.89 피드백 코드: 설정 → 「피드백 복사」 — 테스터가 커뮤니티 댓글에 그대로 붙여 넣는 한 덩어리
// 서버로 보내는 것은 없음 (개인정보처리방침 그대로). 기기 · 프레임 · 진행 · 최근 오류만, 이 기기 안에서 모아 글자로 만듦
const Feedback = {
  errs: [], fps: {}, win: { n: 0, t: 0 }, low: null,
  // 매 프레임 — 출격 중 맵별 평균 · 1초 묶음 중 가장 낮은 값
  tick(dt) {
    const p = G.player; if (!p || !p.raid || G.paused || dt <= 0) { this.win.n = this.win.t = 0; return; }
    const F = this.fps[World.map] || (this.fps[World.map] = { n: 0, t: 0 }); F.n++; F.t += dt;
    const w = this.win; w.n++; w.t += dt;
    if (w.t >= 1) { const v = w.n / w.t; if (F.t > 5 && (this.low === null || v < this.low)) this.low = v; w.n = w.t = 0; } // 출격 첫 5초(불러오기)는 빼고
  },
  err(msg, where) { this.errs.push(`${msg} ${where || ''}`.trim().slice(0, 200)); if (this.errs.length > 5) this.errs.shift(); },
  device() {
    const ua = navigator.userAgent, m = s => (ua.match(s) || [])[1];
    const os = m(/Android ([\d.]+)/) ? 'Android ' + m(/Android ([\d.]+)/) : m(/OS (\d+[_\d]*) like Mac/) ? 'iOS ' + m(/OS (\d+[_\d]*) like Mac/).replace(/_/g, '.') : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '?';
    const model = (ua.match(/Android [\d.]+; ([^;)]+)/) || [])[1]; // 안드로이드 기종 (새 크롬은 「K」로 가려져 있음)
    const br = m(/SamsungBrowser\/([\d]+)/) ? '삼성 인터넷 ' + m(/SamsungBrowser\/([\d]+)/) : m(/Whale\/([\d]+)/) ? '웨일 ' + m(/Whale\/([\d]+)/) : m(/Edg\/([\d]+)/) ? '엣지 ' + m(/Edg\/([\d]+)/) : m(/Firefox\/([\d]+)/) ? '파이어폭스 ' + m(/Firefox\/([\d]+)/) : m(/Chrome\/([\d]+)/) ? '크롬 ' + m(/Chrome\/([\d]+)/) : m(/Version\/([\d]+).*Safari/) ? '사파리 ' + m(/Version\/([\d]+).*Safari/) : '?';
    const app = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches ? ' · 앱(홈 화면)' : '';
    return `${os}${model && model !== 'K' ? ' ' + model : ''} · ${br}${app} · 화면 ${innerWidth}×${innerHeight} @${(devicePixelRatio || 1).toFixed(1)}x${IS_TOUCH ? ' · 터치' : ''}${navigator.hardwareConcurrency ? ` · 코어 ${navigator.hardwareConcurrency}` : ''}${navigator.deviceMemory ? ` · 메모리 ${navigator.deviceMemory}GB` : ''}`;
  },
  text() {
    const p = G.player, S = Settings, on = v => v ? '켬' : '끔';
    const maps = Object.entries(this.fps).filter(([, f]) => f.t > 10).map(([k, f]) => `${(MAPS[k] && MAPS[k].name || k).split(' ')[0]} ${Math.round(f.n / f.t)}`);
    const all = Object.values(this.fps).reduce((a, f) => [a[0] + f.n, a[1] + f.t], [0, 0]);
    const fps = all[1] > 10 ? `출격 평균 ${Math.round(all[0] / all[1])} · 가장 낮을 때 ${Math.round(this.low)}${maps.length > 1 ? ` (${maps.join(' / ')})` : ''}` : '아직 잰 것 없음 (출격을 1분쯤 하고 다시 복사)';
    const pt = Math.round((p && p.playTime || 0) / 60), h = Math.floor(pt / 60);
    const prog = p ? `Lv${p.level} · ${Story.chapter(p) ? Story.chapter(p).title.split(' · ')[0] : '이야기 끝'} · 플레이 ${h ? h + '시간 ' : ''}${pt % 60}분 · 탈출 ${(p.rec && p.rec.extracts) || 0} · 사망 ${p.deaths || 0}${World.map && World.map !== 'camp' ? ` · 지금 ${(MAPS[World.map] && MAPS[World.map].name) || World.map}` : ''}` : '시작 전';
    return [
      `[서울 2049 피드백] ${GAME_VERSION}`,
      `기기: ${this.device()}`,
      `프레임: ${fps}`,
      `설정: 조명 ${on(S.light)} · 세부 ${on(S.detail)} · 흔들림 ${on(S.shake)} · 글자 ${S.textScale || 1}${(() => { try { return localStorage.getItem('seoul2049-autolow') ? ' · 자동 저사양 켜진 적 있음' : ''; } catch (e) { return ''; } })()}`,
      `진행: ${prog}`,
      `오류: ${this.errs.length ? this.errs.map((e, i) => `${i + 1}) ${e}`).join(' / ') : '없음'}`,
      '하고 싶은 말: ',
    ].join('\n');
  },
  // 복사 (안 되면 글 상자에 띄워 길게 눌러 복사)
  copy(ta) {
    const t = this.text(); ta.value = t; ta.classList.remove('hidden'); ta.rows = 7; ta.select();
    const ok = () => log('피드백을 복사했다. 커뮤니티 댓글에 붙여 넣고 「하고 싶은 말」만 채워 주세요.', '#8f8'), manual = () => log('아래 글을 길게 눌러 전체 선택 → 복사해 주세요.', '#8cf');
    try { navigator.clipboard.writeText(t).then(ok, manual); } catch (e) { manual(); }
  },
};
