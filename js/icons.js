// 아이콘 (v1.5.1): 이모지 대신 캔버스로 직접 그린 아이콘. 기기·글꼴마다 이모지 모양이 달라지는 문제를 없앰
// 모두 32×32 좌표로 그리고 96px 캔버스에 3배로 그림 → HTML 에는 <img>(dataURL), 게임 화면에는 drawImage
// 사용: ICON('medkit') → <img class="ico">, Icons.cv('skull') → 캔버스, itemIcon(it) → 아이템 아이콘

const ICON_PX = 96;
const Icons = {
  cache: {}, urls: {}, code: {},
  cv(key) {
    // v1.7.1 무기·헬멧 그림(assets.js)을 등록하면 아이콘도 그 그림으로 (읽히기 전엔 코드 아이콘)
    const art = typeof ART !== 'undefined' && (ART.weapons[key] || ART.helmets[key] || (ART.icons && ART.icons[key])); // v1.35.1 방어구·소모품·탄약·스킬 아이콘 그림 (프롬프트 17)
    const useArt = !!(art && art.ready);
    const old = this.cache[key];
    if (old && old.art === useArt) return old;
    if (old) delete this.urls[key]; // 그림이 막 읽혔으면 새로 만듦
    const c = document.createElement('canvas'); c.width = c.height = ICON_PX; c.art = useArt;
    const g = c.getContext('2d');
    if (useArt) {
      const [rx, ry, rw, rh] = art.rect || [0, 0, art.img.width, art.img.height];
      const tilt = rw > rh * 2 ? -0.6 : 0, cs = Math.abs(Math.cos(tilt)), sn = Math.abs(Math.sin(tilt)); // 긴 무기는 비스듬히 (칸을 넓게 씀)
      const sc = Math.min(ICON_PX * 0.96 / (rw * cs + rh * sn), ICON_PX * 0.96 / (rw * sn + rh * cs));
      g.translate(ICON_PX / 2, ICON_PX / 2); g.rotate(tilt);
      g.drawImage(art.img, rx, ry, rw, rh, -rw * sc / 2, -rh * sc / 2, rw * sc, rh * sc);
    } else {
      g.scale(ICON_PX / 32, ICON_PX / 32); g.lineJoin = 'round'; g.lineCap = 'round';
      (ICON_DRAW[key] || ICON_DRAW[key.split('_')[0]] || ICON_DRAW.unknown)(icoKit(g)); // ammo_pistol 등은 그림이 없으면 ammo
    }
    return (this.cache[key] = c);
  },
  url(key) {
    let c = this.cv(key);
    if (c.art && this.noExport) c = this.codeCv(key);
    if (this.urls[key] && this.urls[key].art === c.art) return this.urls[key].u;
    let u;
    try { u = c.toDataURL(); }
    catch (e) { // file:// 로 열면 그림이 다른 출처로 취급돼 내보내기 금지 → HTML 아이콘은 코드 그림 (게임 화면은 그림 그대로)
      this.noExport = true; c = this.codeCv(key); u = c.toDataURL();
    }
    return (this.urls[key] = { u, art: c.art }).u;
  },
  codeCv(key) { // 코드로 그린 아이콘만 (그림 무시)
    if (this.code[key]) return this.code[key];
    const c = document.createElement('canvas'); c.width = c.height = ICON_PX; c.art = false;
    const g = c.getContext('2d'); g.scale(ICON_PX / 32, ICON_PX / 32); g.lineJoin = 'round'; g.lineCap = 'round';
    (ICON_DRAW[key] || ICON_DRAW.unknown)(icoKit(g));
    return (this.code[key] = c);
  },
  // 정적 HTML 의 <span data-ico="key"> 를 아이콘으로 채움
  fill(root = document) { for (const el of root.querySelectorAll('[data-ico]')) if (!el.firstChild) el.innerHTML = ICON(el.dataset.ico); },
  // 게임 화면(캔버스)에 그리기: 중심 (x, y), 크기 s(px)
  draw(key, x, y, s) { ctx.drawImage(this.cv(key), x - s / 2, y - s / 2, s, s); },
};
function ICON(key, cls = '') { return `<img class="ico${cls ? ' ' + cls : ''}" src="${Icons.url(key)}" alt="">`; }
function itemIcon(it, cls) { return ICON(it.key, cls); }

// 그리기 도구: 모든 도형은 채운 뒤 어두운 테두리 (작게 보여도 모양이 또렷하게)
function icoKit(g) {
  const OL = '#0d0e12';
  const k = {
    g,
    // 다각형 [x,y, x,y, ...]
    P(pts, fill, lw = 1.4) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); k.F(fill, lw); },
    R(x, y, w, h, fill, lw = 1.4) { g.beginPath(); g.rect(x, y, w, h); k.F(fill, lw); },
    RR(x, y, w, h, r, fill, lw = 1.4) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); k.F(fill, lw); },
    C(x, y, r, fill, lw = 1.4) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); k.F(fill, lw); },
    E(x, y, rx, ry, fill, lw = 1.4) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); k.F(fill, lw); },
    L(x1, y1, x2, y2, w, col) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = OL; g.lineWidth = w + 2.4; g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.stroke(); },
    l(x1, y1, x2, y2, w, col) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col; g.lineWidth = w; g.stroke(); }, // 테두리 없는 선 (하이라이트)
    F(fill, lw) { if (fill) { g.fillStyle = fill; g.fill(); } if (lw) { g.strokeStyle = OL; g.lineWidth = lw; g.stroke(); } },
    // 회전된 그리기
    rot(cx, cy, a, fn) { g.save(); g.translate(cx, cy); g.rotate(a); fn(); g.restore(); },
  };
  return k;
}

const GUN = '#5d636d', GUN2 = '#8a919b', WOOD = '#8a5a32', OLIVE = '#5e6b3a', OLIVE2 = '#7d8a4e';
const ICON_DRAW = {
  unknown: k => { k.RR(5, 5, 22, 22, 4, '#555'); k.l(11, 12, 21, 12, 3, '#ccc'); },

  // ---------------- 무기 ----------------
  pipe: k => k.rot(16, 16, -Math.PI / 4, () => {
    k.RR(-13, -3, 26, 6, 2, '#8d939b'); k.R(-4, -4.5, 5, 9, '#6a7078'); k.R(8, -4, 4, 8, '#6a7078');
    k.l(-11, -1.5, 6, -1.5, 1.2, 'rgba(255,255,255,0.45)');
  }),
  pistol: k => {
    k.P([5, 10, 27, 10, 27, 16, 13, 16, 12, 26, 6, 26, 7, 16, 5, 16], GUN);
    k.R(5, 9, 22, 4, GUN2, 1.2); k.P([13, 16, 16, 16, 16, 19, 13, 19], null); k.l(14, 17.5, 15.5, 19, 1.4, OLIVE);
    k.l(8, 19, 11, 19, 1, 'rgba(255,255,255,0.25)'); k.l(8, 22, 10.5, 22, 1, 'rgba(255,255,255,0.25)');
  },
  axe: k => {
    k.L(9, 28, 22, 6, 3.2, WOOD);
    k.P([17, 4, 27, 8, 29, 17, 24, 16, 21, 11, 15, 9], '#c8382c');
    k.l(25, 9, 27.5, 15, 1.4, '#eee');
  },
  smg: k => {
    k.R(6, 11, 18, 7, GUN); k.R(24, 13, 5, 3, GUN2, 1.2);
    k.P([13, 18, 17, 18, 17, 28, 13, 28], '#3a3e44'); k.P([8, 18, 11, 18, 10, 24, 7, 24], GUN);
    k.P([2, 12, 6, 12, 6, 17, 2, 19], '#3a3e44'); k.l(8, 13, 22, 13, 1, 'rgba(255,255,255,0.3)');
  },
  shotgun: k => {
    k.R(10, 11, 20, 3.4, GUN2, 1.2); k.R(14, 14.4, 12, 3.4, '#7a4a28', 1.2); k.R(8, 11, 7, 7, GUN);
    k.P([1, 13, 9, 11, 9, 18, 2, 22], WOOD); k.P([9, 18, 12, 18, 11, 22, 8, 22], GUN);
  },
  rifle: k => {
    k.R(7, 11, 16, 6, GUN); k.R(23, 12.5, 7, 2.5, GUN2, 1.1); k.R(13, 9, 7, 2, '#3a3e44', 1);
    k.P([14, 17, 18, 17, 20, 26, 16, 27], '#3a3e44'); k.P([9, 17, 12, 17, 11, 23, 8, 23], GUN);
    k.P([1, 12, 7, 11, 7, 17, 2, 19], '#3a3e44'); k.l(9, 13, 21, 13, 1, 'rgba(255,255,255,0.3)');
  },
  katana: k => k.rot(16, 16, -Math.PI / 4, () => {
    k.g.shadowColor = '#5ff'; k.g.shadowBlur = 3;
    k.P([-4, -2, 13, -2, 15, 0, 13, 2, -4, 2], '#d8eef4'); k.g.shadowBlur = 0;
    k.l(-3, -0.8, 12, -0.8, 0.9, '#7ff');
    k.R(-6, -4, 2, 8, '#d4a640', 1.1); k.RR(-14, -2, 8, 4, 1, '#222');
    k.l(-13, 0, -7, 0, 0.8, '#a33');
  }),
  sniper: k => {
    k.R(9, 13, 21, 2.6, GUN2, 1.1); k.R(6, 12, 11, 5, GUN); k.RR(9, 7, 10, 4, 1.5, '#2a2e34'); k.C(19, 9, 1.6, '#5ad', 0.8);
    k.P([0, 13, 6, 12, 6, 17, 1, 20], OLIVE); k.P([9, 17, 12, 17, 11, 23, 8, 23], GUN); k.L(25, 15.5, 27, 22, 1, '#3a3e44');
  },
  lmg: k => {
    k.R(6, 10, 18, 8, GUN); k.R(24, 12, 7, 3, GUN2, 1.1); k.RR(10, 18, 9, 7, 1, OLIVE);
    k.l(11.5, 21.5, 17.5, 21.5, 1, '#c9a24a'); k.P([1, 11, 6, 11, 6, 17, 1, 20], '#3a3e44');
    k.L(24, 15, 22, 25, 1, '#3a3e44'); k.L(26, 15, 28, 25, 1, '#3a3e44'); k.R(10, 7, 8, 3, '#3a3e44', 1);
  },

  // ---------------- 방어구 · 헬멧 ----------------
  vest: k => { k.P([9, 4, 13, 4, 16, 8, 19, 4, 23, 4, 26, 9, 26, 28, 6, 28, 6, 9], OLIVE); k.R(9, 17, 5, 5, OLIVE2, 1.1); k.R(18, 17, 5, 5, OLIVE2, 1.1); k.l(16, 10, 16, 27, 1, 'rgba(0,0,0,0.35)'); },
  tactical: k => { k.P([9, 4, 13, 4, 16, 8, 19, 4, 23, 4, 26, 9, 26, 28, 6, 28, 6, 9], '#3d4148'); k.R(9, 11, 14, 8, '#565c66', 1.1); for (const x of [8, 13, 18]) k.R(x + 0.5, 21, 4.5, 5, '#2c3036', 1); k.l(10, 13, 22, 13, 1, '#8a6a3a'); },
  military: k => { k.P([4, 9, 10, 4, 22, 4, 28, 9, 26, 14, 24, 13, 24, 28, 8, 28, 8, 13, 6, 14], '#4d5a40'); k.RR(11, 9, 10, 12, 2, '#66744f', 1.1); k.l(12, 24, 20, 24, 1.5, '#2e3626'); k.C(6, 9, 2.5, '#66744f', 1); k.C(26, 9, 2.5, '#66744f', 1); },
  exo: k => { k.P([5, 8, 11, 4, 21, 4, 27, 8, 25, 15, 23, 15, 23, 28, 9, 28, 9, 15, 7, 15], '#7a838e'); k.R(12, 21, 8, 2.5, '#4a525c', 1); k.R(12, 25, 8, 2, '#4a525c', 1); k.g.shadowColor = '#4ff'; k.g.shadowBlur = 4; k.C(16, 13, 3.5, '#5ef', 1.1); k.g.shadowBlur = 0; },
  cap: k => { k.P([4, 22, 6, 13, 11, 8, 21, 8, 26, 13, 28, 22], OLIVE); k.R(3, 21, 26, 4, '#4a5530', 1.2); k.l(10, 12, 15, 10, 1.2, 'rgba(255,255,255,0.3)'); },
  tacHelmet: k => { k.P([4, 21, 6, 12, 11, 7, 21, 7, 26, 12, 28, 21], '#3d4148'); k.R(3, 20, 26, 3.5, '#2c3036', 1.2); k.R(13, 5, 6, 3, '#565c66', 1); k.RR(20, 13, 6, 4, 1, '#2c3036', 1); k.C(24, 15, 1.2, '#5f5', 0); },
  gasmask: k => { k.E(16, 13, 10, 9, '#4a4e44'); k.E(11.5, 12, 3.5, 3, '#9bd', 1.1); k.E(20.5, 12, 3.5, 3, '#9bd', 1.1); k.RR(12, 18, 8, 6, 2, '#2a2c28'); k.C(8, 23, 4, '#6a6e5c'); k.C(24, 23, 4, '#6a6e5c'); k.l(8, 21, 8, 25, 1, '#2a2c28'); k.l(24, 21, 24, 25, 1, '#2a2c28'); },
  exoHelm: k => { k.P([5, 24, 5, 12, 10, 6, 22, 6, 27, 12, 27, 24, 21, 27, 11, 27], '#7a838e'); k.g.shadowColor = '#4ff'; k.g.shadowBlur = 4; k.P([8, 14, 24, 14, 22, 18, 10, 18], '#5ef', 1); k.g.shadowBlur = 0; k.l(16, 7, 16, 12, 1.4, '#4a525c'); },

  // ---------------- 소모품 · 재료 ----------------
  belt: k => { k.R(2, 12, 28, 6, '#5a4a30', 1); k.R(13, 10.5, 6, 9, '#c9a24a', 1.2); k.R(15, 13, 2, 3, '#5a4a30', 0); for (const x of [4, 21]) k.RR(x, 17, 7, 9, 1.5, '#4d5a40', 1.1); }, // v1.24
  medkit: k => { k.RR(4, 8, 24, 19, 3, '#f2f2f2'); k.R(12, 4, 8, 4, '#b9bdc4', 1.2); k.R(14, 11, 4, 13, '#e23a3a', 0); k.R(9.5, 15.5, 13, 4, '#e23a3a', 0); },
  ammo: k => { k.RR(4, 13, 24, 15, 2, '#59663a'); k.l(6, 18, 26, 18, 1, '#3a4426'); for (const x of [8, 13, 18, 23]) { k.RR(x - 1.8, 4, 3.6, 10, 1.5, '#d4a640', 1); k.R(x - 1.8, 10, 3.6, 4, '#a07a2a', 1); } },
  scrap: k => { const pts = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; pts.push(16 + Math.cos(a) * 12, 16 + Math.sin(a) * 12); } k.P(pts, '#9aa0a8'); k.C(16, 16, 5, '#3a3e44'); k.l(9, 9, 13, 7, 1.3, 'rgba(255,255,255,0.45)'); },
  chip: k => { for (let i = 0; i < 4; i++) { const y = 8 + i * 5.3; k.l(3, y, 29, y, 1.6, '#c9a24a'); } k.RR(7, 5, 18, 22, 2, '#2e6a3a'); k.R(11, 10, 10, 12, '#1c3a22', 1); k.l(12, 12, 16, 12, 1, '#7ec08a'); },

  // ---------------- 스킬 ----------------
  turret: k => { k.l(8, 28, 16, 18, 1.6, '#3a3e44'); k.l(24, 28, 16, 18, 1.6, '#3a3e44'); k.RR(9, 11, 14, 9, 2, '#4a6a8a', 1.1); k.R(21, 13.5, 9, 3.5, '#2a2c30', 1); k.C(16, 15.5, 2, '#9fe0ff', 0); }, // v1.26
  rapid: k => { k.g.shadowColor = '#ff0'; k.g.shadowBlur = 3; k.P([18, 2, 6, 18, 14, 18, 11, 30, 26, 12, 17, 12, 21, 2], '#ffd84a'); k.g.shadowBlur = 0; },
  star: k => { k.P([16.0, 4.0, 19.2, 12.6, 28.4, 13.0, 21.2, 18.7, 23.6, 27.5, 16.0, 22.5, 8.4, 27.5, 10.8, 18.7, 3.6, 13.0, 12.8, 12.6], '#ffd76a'); k.l(13, 12, 16, 7, 1.2, 'rgba(255,255,255,0.5)'); }, // v1.15 업적
  // v1.14 소모품
  molotov: k => { k.RR(10, 11, 12, 17, 3, '#6a8a4a'); k.R(13, 6, 6, 6, '#4a5a3a', 1.2); k.l(12, 15, 20, 15, 1, 'rgba(255,255,255,0.3)'); k.P([14, 6, 18, 6, 21, 1, 16, 3, 12, 0], '#ff8a2a', 1); k.P([15, 5, 17, 5, 18, 2, 15.5, 3], '#ffd76a', 0); k.R(10, 18, 12, 6, '#c9a24a', 1); },
  flash: k => { k.RR(10, 8, 12, 20, 3, '#5a6068'); k.R(10, 13, 12, 3, '#d8d8d8', 0); k.R(13, 4, 6, 5, '#8a919b', 1.2); k.l(19, 6, 25, 8, 1.4, '#c9a24a'); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.l(16 + Math.cos(a) * 11, 18 + Math.sin(a) * 11, 16 + Math.cos(a) * 14, 18 + Math.sin(a) * 14, 1.4, '#fff3a0'); } },
  mine: k => { k.E(16, 20, 12, 6, '#4a5a3a'); k.E(16, 17, 12, 6, '#5e6b3a'); k.C(16, 15, 3, '#2a2e24', 1.2); k.C(16, 15, 1.4, '#e33', 0); k.l(7, 17, 25, 17, 1, 'rgba(255,255,255,0.18)'); },
  stim: k => k.rot(16, 16, -Math.PI / 4, () => { k.RR(-10, -4, 16, 8, 2, '#e8e8ec'); k.R(-8, -2.5, 10, 5, '#3ad8a0', 0); k.R(6, -2, 4, 4, '#8a919b', 1.2); k.l(10, 0, 15, 0, 1.2, '#ccc'); k.R(-13, -5, 3, 10, '#5a6068', 1.2); }),
  plate: k => { k.P([16, 3, 27, 7, 26, 18, 16, 29, 6, 18, 5, 7], '#3a4a5e'); k.P([16, 6, 24, 9, 23, 17, 16, 25, 9, 17, 8, 9], '#5a7090', 0); k.l(16, 7, 16, 24, 1.2, 'rgba(255,255,255,0.3)'); },
  grenade: k => { k.E(15, 19, 9, 10, '#4f6a34'); k.l(9, 15, 21, 15, 1, '#2e3e1e'); k.l(8, 20, 22, 20, 1, '#2e3e1e'); k.l(9, 25, 21, 25, 1, '#2e3e1e'); k.R(12, 6, 6, 4, '#6a7078', 1.2); k.P([18, 7, 26, 9, 25, 11, 18, 9], '#8a919b', 1); k.g.beginPath(); k.g.arc(24, 5, 3, 0, Math.PI * 2); k.g.strokeStyle = '#c9a24a'; k.g.lineWidth = 1.4; k.g.stroke(); },
  heal: k => { k.C(16, 16, 13, '#e8f4ea'); k.R(13, 7, 6, 18, '#3aaa4a', 0); k.R(7, 13, 18, 6, '#3aaa4a', 0); },
  adren: k => { k.g.shadowColor = '#f80'; k.g.shadowBlur = 3; k.P([16, 2, 22, 10, 25, 7, 27, 17, 25, 25, 16, 30, 7, 25, 5, 17, 9, 9, 12, 13], '#ff7a20'); k.g.shadowBlur = 0; k.P([16, 12, 20, 18, 21, 24, 16, 28, 11, 24, 12, 18], '#ffd84a', 0); },

  // ---------------- UI ----------------
  roll: k => { for (const [y, x0] of [[9, 4], [16, 2], [23, 6]]) k.L(x0, y, x0 + 13, y, 2.4, '#bfe6ff'); k.P([18, 6, 30, 16, 18, 26, 21, 16], '#e8f6ff'); },
  bag: k => { k.RR(6, 8, 20, 21, 5, '#8a5a32'); k.g.beginPath(); k.g.arc(16, 9, 5, Math.PI, 0); k.g.strokeStyle = '#0d0e12'; k.g.lineWidth = 3.6; k.g.stroke(); k.g.strokeStyle = '#6a4424'; k.g.lineWidth = 2; k.g.stroke(); k.RR(10, 17, 12, 8, 2, '#a8713e', 1.1); k.R(15, 15, 2, 4, '#d4a640', 0.8); },
  quest: k => { k.R(7, 6, 18, 20, '#e8d9b0'); k.E(7, 6, 3, 3, '#cdb984', 1.2); k.E(25, 26, 3, 3, '#cdb984', 1.2); for (let i = 0; i < 4; i++) k.l(10, 11 + i * 4, i === 3 ? 17 : 22, 11 + i * 4, 1.3, '#8a7a5a'); },
  stats: k => { k.l(4, 28, 28, 28, 1.6, '#ccc'); k.R(6, 18, 5, 9, '#5aa8ff', 1.1); k.R(13.5, 11, 5, 16, '#6fdc6f', 1.1); k.R(21, 5, 5, 22, '#ffd76a', 1.1); },
  settings: k => { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 10 : 13; pts.push(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); } k.P(pts, '#a8b0ba'); k.C(16, 16, 4.5, '#2a2e34'); },
  lock: k => { k.g.beginPath(); k.g.arc(16, 13, 6, Math.PI, 0); k.g.lineTo(22, 15); k.g.moveTo(10, 15); k.g.lineTo(10, 13); k.g.strokeStyle = '#0d0e12'; k.g.lineWidth = 4.8; k.g.stroke(); k.g.strokeStyle = '#9aa0a8'; k.g.lineWidth = 2.6; k.g.stroke(); k.RR(7, 14, 18, 14, 2, '#d4a640'); k.C(16, 20, 2, '#3a2e10', 0); k.R(15.2, 20, 1.6, 4, '#3a2e10', 0); },
  map: k => { k.P([3, 8, 11, 5, 21, 8, 29, 5, 29, 25, 21, 28, 11, 25, 3, 28], '#d8c89a'); k.l(11, 5, 11, 25, 1, '#8a7a5a'); k.l(21, 8, 21, 28, 1, '#8a7a5a'); k.g.setLineDash([2, 2]); k.l(6, 22, 14, 14, 1.3, '#c23'); k.l(14, 14, 24, 16, 1.3, '#c23'); k.g.setLineDash([]); k.l(22, 12, 26, 16, 1.6, '#c23'); k.l(26, 12, 22, 16, 1.6, '#c23'); },
  skull: k => { k.P([7, 14, 9, 7, 16, 4, 23, 7, 25, 14, 23, 20, 22, 25, 10, 25, 9, 20], '#ece8dc'); k.E(12, 15, 3, 3.2, '#1a1a1a', 0); k.E(20, 15, 3, 3.2, '#1a1a1a', 0); k.P([16, 18, 14.5, 21, 17.5, 21], '#1a1a1a', 0); for (const x of [12.5, 16, 19.5]) k.l(x, 23, x, 26, 1.1, '#1a1a1a'); },
  box: k => { k.P([4, 11, 16, 6, 28, 11, 16, 16], '#d9a85e'); k.P([4, 11, 16, 16, 16, 29, 4, 24], '#b9884a'); k.P([28, 11, 16, 16, 16, 29, 28, 24], '#c9965a'); k.l(10, 8.5, 22, 13.5, 2, '#e8cfa0'); },
  door: k => { k.R(8, 3, 16, 26, '#7a4a28'); k.R(11, 6, 10, 8, '#8f5c34', 1); k.R(11, 17, 10, 9, '#8f5c34', 1); k.C(20, 17, 1.4, '#d4a640', 0.8); k.l(5, 29, 27, 29, 2, '#555'); },
  shield: k => { k.P([16, 3, 27, 7, 26, 18, 16, 29, 6, 18, 5, 7], '#3a78c8'); k.P([16, 7, 23, 10, 22, 18, 16, 25], '#5aa0ea', 0); k.l(16, 7, 16, 25, 1, 'rgba(255,255,255,0.35)'); },
  warn: k => { k.P([16, 3, 30, 28, 2, 28], '#ffc83a'); k.R(14.5, 11, 3, 9, '#1a1a1a', 0); k.C(16, 24, 1.8, '#1a1a1a', 0); },
  rad: k => { k.C(16, 16, 14, '#ffd84a'); const g = k.g; g.fillStyle = '#1a1a1a'; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 3; g.beginPath(); g.moveTo(16, 16); g.arc(16, 16, 11, a - 0.52, a + 0.52); g.closePath(); g.fill(); } k.C(16, 16, 3.6, '#ffd84a', 0); k.C(16, 16, 2.2, '#1a1a1a', 0); },
  radio: k => { k.L(21, 3, 21, 10, 1.6, '#555'); k.RR(9, 9, 15, 20, 3, '#3a3e44'); k.R(12, 12, 9, 6, '#7ec08a', 1); for (const y of [21, 24]) k.l(12.5, y, 20.5, y, 1.2, '#22252a'); k.C(12, 9, 1.4, '#e33', 0.6); },
  bounty: k => { k.RR(6, 5, 20, 24, 2, '#a8713e'); k.R(9, 8, 14, 18, '#f2ead6', 1); k.RR(12, 3, 8, 5, 1.5, '#9aa0a8', 1.1); for (let i = 0; i < 3; i++) { k.l(11, 13 + i * 4, 13, 15 + i * 4, 1.3, '#3aaa4a'); k.l(13, 15 + i * 4, 15.5, 11.5 + i * 4, 1.3, '#3aaa4a'); k.l(17, 13.5 + i * 4, 21, 13.5 + i * 4, 1.2, '#8a7a5a'); } },
  tip: k => { k.g.shadowColor = '#ff6'; k.g.shadowBlur = 5; k.C(16, 13, 9, '#ffe066'); k.g.shadowBlur = 0; k.R(12, 21, 8, 6, '#9aa0a8', 1.2); k.l(12.5, 23.5, 19.5, 23.5, 1, '#555'); k.l(13, 13, 15, 9, 1.4, '#fff8c0'); },
  phone: k => { k.RR(9, 3, 14, 26, 3, '#2a2e34'); k.R(11, 6, 10, 18, '#5aa8ff', 0.8); k.C(16, 26.5, 1, '#888', 0); },
  compass: k => { k.C(16, 16, 13, '#e8e4d8'); k.C(16, 16, 10.5, '#2a3a4a', 0); k.P([16, 6, 19, 16, 13, 16], '#e23a3a', 0.8); k.P([16, 26, 19, 16, 13, 16], '#e8e4d8', 0.8); k.C(16, 16, 1.4, '#d4a640', 0); },
  swords: k => { for (const s of [1, -1]) k.rot(16, 16, s * Math.PI / 4, () => { k.P([-1.6, -14, 1.6, -14, 1.6, 6, 0, 8, -1.6, 6], '#d8e0e8'); k.R(-5, 7, 10, 2.4, '#d4a640', 1); k.R(-1.5, 9.4, 3, 5, '#5a3a22', 1); }); },
  growth: k => { k.l(4, 28, 28, 28, 1.6, '#ccc'); k.l(4, 28, 4, 4, 1.6, '#ccc'); k.L(7, 23, 13, 16, 2.2, '#6fdc6f'); k.L(13, 16, 18, 19, 2.2, '#6fdc6f'); k.L(18, 19, 26, 8, 2.2, '#6fdc6f'); k.P([27, 5, 27, 12, 21, 7], '#6fdc6f', 1); },
  credits: k => { k.C(16, 16, 12, '#d4a640'); k.C(16, 16, 8.5, '#e8c060', 1); k.g.font = 'bold 13px sans-serif'; k.g.textAlign = 'center'; k.g.textBaseline = 'middle'; k.g.fillStyle = '#7a5a1a'; k.g.fillText('₵', 16, 16.5); },
};

Icons.fill(); // 정적 HTML 아이콘 (스크립트는 body 끝에서 읽히므로 요소가 이미 있음)
