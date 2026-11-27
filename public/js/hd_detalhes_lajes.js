// Detalhe brasileiro do kit HD do Lajes (só com ?hd=1): atlas de janelas e de portas (cor + altura no alfa)
// e pichação em decalque. Arte reaproveitada de public/img/decals; o resto é desenhado aqui em canvas.
import * as THREE from 'three';

const N = 1024, CEL = N / 3, COL = N / 5;
const rngDe = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const tela = (w = N, h = N) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const cinza = (v) => { const n = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${n},${n},${n})`; };
const tom = (rgb, g) => `rgb(${rgb.map((v) => Math.round(Math.min(255, v * g))).join(',')})`;

// Dois canvas em paralelo: cor e altura. Sólido grava 0,55..1 no alfa; vidro grava 0..0,45 (0 = liso).
function par() {
  const cc = tela(), ch = tela(), C = cc.getContext('2d'), H = ch.getContext('2d', { willReadFrequently: true });
  H.fillStyle = cinza(.8); H.fillRect(0, 0, N, N);
  return { cc, ch,
    celula(x, y, w, h, fn) { for (const g of [C, H]) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y); g.scale(w, h); } fn(); C.restore(); H.restore(); },
    ret(x, y, w, h, cor, alt = .5, vidro = false) { C.fillStyle = cor; C.fillRect(x, y, w, h); H.fillStyle = cinza(vidro ? alt * .45 : .55 + alt * .45); H.fillRect(x, y, w, h); },
    linha(x0, y0, x1, y1, esp, cor, alt = .5) { for (const [g, s] of [[C, cor], [H, cinza(.55 + alt * .45)]]) { g.strokeStyle = s; g.lineWidth = esp; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); } },
    so(fn) { fn(C); } };
}
// O canvas 2D premultiplica a cor pelo alfa, então a altura vem de outro canvas e os dois viram um RGBA só.
function funde(P, nome) {
  const a = P.cc.getContext('2d').getImageData(0, 0, N, N).data, h = P.ch.getContext('2d').getImageData(0, 0, N, N).data, d = new Uint8Array(N * N * 4);
  d.set(a); for (let i = 0; i < N * N; i++) d[i * 4 + 3] = h[i * 4];
  P.cc.width = P.cc.height = P.ch.width = P.ch.height = 0;
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; t.name = nome; t.needsUpdate = true;
  t.onUpdate = () => { t.source.data = { data: null, width: N, height: N }; t.onUpdate = null; };
  return t;
}

const AL = '#a9acab', AL2 = '#8b8f8e', AL3 = '#5f6362', VID = '#1d2a30', FER = '#2a2623', CANEL = [126, 140, 134];
function canelado(P, x, y, w, h, cor = CANEL, passo = .016) {
  const n = Math.max(1, Math.round(w / passo)), d = w / n;
  for (let i = 0; i < n; i++) { P.ret(x + i * d, y, d * .52, h, tom(cor, 1.08), 1, true); P.ret(x + (i + .5) * d, y, d * .52, h, tom(cor, .78), .25, true); }
}
function vidroLiso(P, r, x, y, w, h, pano) {
  P.ret(x, y, w, h, VID, 0, true);
  P.so((C) => { const g = C.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(150,172,186,.34)'); g.addColorStop(.6, 'rgba(120,140,150,.04)'); C.fillStyle = g; C.fillRect(x, y, w, h);
    if (pano) for (let i = 0; i < 9; i++) { C.fillStyle = `rgba(${pano},${.22 + .2 * r()})`; C.fillRect(x + w * i / 9, y, w / 9 * (.5 + r() * .5), h * (.82 + r() * .14)); } });
}
function suja(P, r, n) {
  P.so((C) => { for (let i = 0; i < n; i++) { C.fillStyle = `rgba(${r() < .65 ? '38,34,30' : '58,54,48'},${.04 + r() * .09})`; C.fillRect(r(), r() * .6, .006 + r() * .03, .12 + r() * .5); }
    const g = C.createLinearGradient(0, .8, 0, 1); g.addColorStop(0, 'rgba(30,26,22,0)'); g.addColorStop(1, 'rgba(30,26,22,.35)'); C.fillStyle = g; C.fillRect(0, .8, 1, .2); });
}

function correr(P, r, { fantasia = false, aberta = false, papelao = false } = {}) {
  P.ret(0, 0, 1, 1, AL, .95); P.ret(.035, .035, .93, .895, '#2a2f31', .05);
  if (aberta) P.so((C) => { for (let i = 0; i < 5; i++) { C.fillStyle = `rgba(150,160,120,${.25 + .3 * r()})`; C.fillRect(.78 + i * .035, .05, .022, .8); } });
  (aberta ? [[.035, .46, .5], [.30, .47, .75]] : [[.035, .47, .5], [.495, .47, .75]]).forEach(([x, w, alt], i) => {
    P.ret(x, .035, w, .895, i ? AL : AL2, alt);
    const gx = x + .034, gy = .07, gw = w - .068, gh = .825;
    if (fantasia) canelado(P, gx, gy, gw, gh); else vidroLiso(P, r, gx, gy, gw, gh, i === 0 ? '186,178,158' : '150,160,168');
    if (papelao && i === 1) { P.ret(gx, gy + gh * .38, gw, gh * .62, '#857c6a', .3); P.ret(gx, gy + gh * .36, gw, .03, '#b9b29c', .36); P.ret(gx + gw * .45, gy + gh * .38, .028, gh * .62, '#b9b29c', .36);
      P.so((C) => { C.strokeStyle = 'rgba(210,220,225,.5)'; C.lineWidth = .004; C.beginPath(); C.moveTo(gx + gw * .2, gy + gh * .36); C.lineTo(gx + gw * .5, gy + gh * .12); C.lineTo(gx + gw * .9, gy + gh * .2); C.moveTo(gx + gw * .5, gy + gh * .12); C.lineTo(gx + gw * .42, gy); C.stroke(); }); }
    P.ret(x + (i ? .008 : w - .02), .42, .012, .12, AL3, 1);
  });
  P.ret(0, .93, 1, .07, AL, 1); P.ret(.02, .948, .96, .007, AL3, .6); P.ret(.02, .972, .96, .007, AL3, .6);
}
function basculante(P) {
  const cor = '#44525a';
  P.ret(0, 0, 1, 1, cor, .9);
  for (let c = 0; c < 2; c++) for (let l = 0; l < 4; l++) {
    const x = .05 + c * .46, y = .05 + l * .23, w = .44, h = .21, abre = (c + l * 2) % 5 === 3, hv = (h - .024) * (abre ? .62 : 1);
    P.ret(x, y, w, h, '#0b0d0e', 0); canelado(P, x + .012, y + .012, w - .024, hv, [118, 134, 128]);
    P.so((C) => { const g = C.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(0,0,0,.30)'); C.fillStyle = g; C.fillRect(x, y, w, hv + .012); });
    P.ret(x, y + hv + .012, w, .014, cor, 1);
  }
  P.ret(.488, .05, .024, .9, cor, 1); P.ret(.494, .30, .012, .34, '#23292d', 1);
}
function veneziana(P, r) {
  P.ret(0, 0, 1, 1, '#6a7a6e', .95);
  for (let f = 0; f < 2; f++) { const x = .05 + f * .455, w = .445; P.ret(x, .05, w, .9, '#566258', .6);
    for (let y = .075; y < .9; y += .034) { if (r() < .05) { P.ret(x + .03, y, w - .06, .03, '#0c0e0d', .1); continue; }
      P.ret(x + .03, y, w - .06, .02, tom([132, 146, 134], .85 + r() * .3), .95); P.ret(x + .03, y + .02, w - .06, .014, '#465149', .25); } }
  P.ret(.47, .45, .06, .035, FER, 1);
}
function vitro(P, r) {
  P.ret(0, 0, 1, 1, '#4f5a5c', .85);
  const fora = Math.floor(r() * 12);
  for (let c = 0; c < 3; c++) for (let l = 0; l < 4; l++) { const x = .045 + c * .31, y = .045 + l * .2325, w = .29, h = .2125;
    if (c * 4 + l === fora) P.ret(x, y, w, h, '#101416', 0); else canelado(P, x, y, w, h, [128 + r() * 10, 142 + r() * 8, 136 + r() * 8], .02);
    P.so((C) => { const g = C.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(1, 'rgba(0,0,0,.22)'); C.fillStyle = g; C.fillRect(x, y, w, h); }); }
  for (let k = -5; k <= 6; k++) { P.linha(k * .2, 0, k * .2 + 1, 1, .009, FER, 1); P.linha(k * .2 + 1, 0, k * .2, 1, .009, FER, 1); }
  for (const e of [.012, .988]) { P.linha(e, 0, e, 1, .024, FER, 1); P.linha(0, e, 1, e, .024, FER, 1); }
}
// Vão fechado com bloco de cimento: cinza, nunca cor de tijolo (a célula cai na faixa do corpo e leria como remendo de tijolo).
function blocos(P, r) {
  P.ret(0, 0, 1, 1, '#7d7a74', .35);
  const h = .158, w = .262; let l = 0;
  for (let y = .012; y < 1; y += h + .018, l++) for (let x = -(l % 2) * w * .5 - .01; x < 1; x += w + .016) {
    const g = .84 + r() * .3, yy = y + (r() - .5) * .008;
    P.ret(x, yy, w, h, tom([132, 130, 124], g), .75);
    P.ret(x + w * .18, yy + h * .22, w * .22, h * .56, tom([112, 110, 104], g), .6); P.ret(x + w * .6, yy + h * .22, w * .22, h * .56, tom([112, 110, 104], g), .6);
  }
  for (let i = 0; i < 44; i++) P.ret(r(), r(), .02 + r() * .06, .008 + r() * .02, '#9a968c', .85);
}
function madeirite(P, r) {
  P.ret(0, 0, 1, 1, '#0b0c0c', 0); P.ret(.02, .015, .955, .97, '#8c8474', .55);
  P.so((C) => { for (let i = 0; i < 90; i++) { C.fillStyle = `rgba(${r() < .5 ? '52,44,34' : '176,166,146'},${.05 + r() * .12})`; C.fillRect(.02, .015 + r() * .97, .955, .002 + r() * .006); }
    for (let i = 0; i < 7; i++) { C.fillStyle = `rgba(40,36,30,${.08 + r() * .1})`; C.fillRect(.02 + r() * .8, r() * .5, .05 + r() * .18, .3 + r() * .5); } });
  for (const [y, h] of [[.2, .1], [.66, .11]]) { P.ret(0, y, 1, h, '#5f574a', .95); P.ret(0, y + h, 1, .012, '#26221c', .4); for (const x of [.06, .5, .94]) P.ret(x - .008, y + h / 2 - .008, .016, .016, '#1d1a17', 1); }
}
function cortina(P) {
  P.ret(0, 0, 1, 1, '#5e574d', .9); P.ret(.05, .05, .9, .9, '#0a0b0c', 0); P.ret(.05, .085, .9, .008, '#c9c5b8', .3);
  for (let i = 0; i < 14; i++) { const g = .7 + .45 * Math.abs(Math.sin(i * 1.9)), b = i % 3 === 0;
    P.ret(.06 + i * .048, .09, .05, .70 + .05 * Math.sin(i * .9), tom(b ? [196, 190, 170] : [92, 122, 150], g), .2 + .25 * Math.abs(Math.sin(i * 1.9))); }
  P.ret(.62, .58, .33, .37, '#cfccc2', .8); P.ret(.645, .605, .28, .32, '#16181a', .3);
  P.so((C) => { C.strokeStyle = '#bdb9ae'; C.lineWidth = .006;
    for (let k = 1; k <= 4; k++) { C.beginPath(); C.arc(.785, .765, k * .034, 0, 6.3); C.stroke(); }
    for (let k = 0; k < 8; k++) { C.beginPath(); C.moveTo(.785, .765); C.lineTo(.785 + Math.cos(k * .785) * .14, .765 + Math.sin(k * .785) * .14); C.stroke(); }
    C.fillStyle = '#8a8880'; C.beginPath(); C.arc(.785, .765, .03, 0, 6.3); C.fill(); });
}
function barras(P) { for (let x = .09; x < .95; x += .117) P.ret(x, 0, .016, .93, FER, 1); for (const y of [.14, .5, .8]) P.ret(0, y, 1, .02, FER, 1); }
function peitoril(P) {
  P.ret(.12, .81, .11, .12, '#6f6f6a', .9); P.ret(.11, .80, .13, .025, '#85857f', 1);
  for (const [x, y, s] of [[.13, .72, .09], [.10, .75, .06], [.19, .74, .07], [.15, .67, .06]]) P.ret(x, y, s, s, '#3f6a35', .8);
  P.ret(.72, .78, .055, .15, '#3f7a4a', .9); P.ret(.737, .73, .021, .05, '#3f7a4a', .9); P.ret(.735, .722, .025, .012, '#d8d4c8', 1);
}
// Ar-condicionado de janela (caixa 55 x 38 cm no canto inferior direito do vão, grelha, pingadeira escura) sobre o correr de vidro liso.
function arCondicionado(P, r) {
  P.ret(.52, .50, .44, .40, '#b8bab6', 1); P.ret(.535, .515, .41, .37, '#9ea09c', .95);
  // Grelha com lâminas recuadas (altura 0,55, 3 px de sombra e 1 px de fio claro) e gotejo fino (1 cm) sob a pingadeira.
  for (let y = .54; y < .84; y += .028) { P.ret(.55, y, .25, .012, '#4e504d', .55); P.ret(.55, y + .011, .25, .004, '#c4c6c2', .95); }
  P.ret(.82, .54, .10, .30, '#86888a', .95); P.ret(.845, .60, .05, .05, '#2b2d2e', 1);
  P.so((C) => { C.fillStyle = 'rgba(40,36,30,.35)'; C.fillRect(.56, .90, .36, .02 + r() * .03); C.fillStyle = 'rgba(0,0,0,.25)'; C.fillRect(.52, .88, .44, .02);
    C.fillStyle = 'rgba(46,42,36,.42)'; C.fillRect(.60 + r() * .2, .92, .012, .08); });
}
// 9 tipos numa grade 3x3; o shader escolhe a célula pelo hash da posição do vão.
export const JANELA_TIPOS = ['correr de alumínio, vidro liso', 'correr de alumínio com ar-condicionado de janela', 'basculante de ferro', 'veneziana', 'vitrô de ferro com grade em losango',
  'vão fechado com bloco de cimento', 'vão fechado com madeirite e tábua', 'lençol por dentro e ventilador', 'correr remendada com papelão, barras retas, vaso e garrafa'];
export function atlasJanelas() {
  const P = par(), r = rngDe(4471);
  [() => correr(P, r), () => { correr(P, r); arCondicionado(P, r); }, () => basculante(P), () => veneziana(P, r), () => vitro(P, r), () => blocos(P, r), () => madeirite(P, r), () => cortina(P),
    () => { correr(P, r, { papelao: true }); barras(P); peitoril(P); }]
    .forEach((f, k) => P.celula((k % 3) * CEL, Math.floor(k / 3) * CEL, CEL, CEL, () => { f(); suja(P, r, 26); }));
  return funde(P, 'hd-janelas');
}

function chapaFriso(P) {
  P.ret(0, 0, 1, 1, '#4d626d', .9); P.ret(.06, .02, .88, .965, '#6f8b98', .6);
  P.ret(.2, .09, .6, .25, '#33434b', .9); canelado(P, .24, .105, .52, .22, CANEL, .05);
  for (let x = .3; x < .75; x += .105) P.ret(x, .105, .028, .22, FER, 1);
  P.ret(.24, .21, .52, .012, FER, 1); P.ret(.1, .385, .8, .014, '#3f545e', .35);
  for (let y = .42; y < .93; y += .052) { P.ret(.1, y, .8, .01, '#7c96a2', .85); P.ret(.1, y + .01, .8, .012, '#3f545e', .35); }
  P.ret(.8, .47, .1, .05, '#1f2224', 1); P.ret(.83, .44, .04, .012, '#8c8f90', 1);
}
function esquadria(P) {
  P.ret(0, 0, 1, 1, AL, .95);
  for (const x of [.09, .52]) canelado(P, x, .04, .39, .36, CANEL, .04);
  P.ret(.48, .04, .04, .36, AL2, .9); P.ret(.09, .40, .82, .03, AL, 1);
  for (let x = .09; x < .9; x += .082) { P.ret(x, .43, .06, .53, '#9b9e9d', .8); P.ret(x + .06, .43, .022, .53, '#5d6160', .3); }
  P.ret(.09, .69, .82, .022, AL2, 1); P.ret(.8, .44, .05, .2, '#4a4d4e', 1); P.ret(.09, .96, .82, .04, AL2, .9);
}
function madeiraVelha(P, r) {
  P.ret(0, 0, 1, 1, '#2a2622', .1);
  // Cada tábua com tom próprio (2–3 tons: cru, cinza-lavado, mel) e rodapé de tinta velha (0–60 cm, fora da faixa do corpo) descascando por tábua.
  const TONS = [[134, 122, 106], [118, 114, 104], [146, 126, 100]], tinta = r() < .5 ? [96, 118, 112] : [104, 112, 128];
  for (let i = 0; i < 6; i++) { const x = .008 + i * .166, w = .158, g = .84 + r() * .28, base = TONS[Math.floor(r() * 2.999)]; P.ret(x, .006 + r() * .01, w, .988, tom(base, g), .6);
    P.so((C) => { for (let k = 0; k < 70; k++) { C.fillStyle = `rgba(${r() < .7 ? '44,36,28' : '188,176,156'},${.10 + r() * .2})`; C.fillRect(x + r() * w, r(), .0025 + r() * .004, .05 + r() * .35); }
      for (let k = 0; k < 60; k++) { const y = Math.pow(r(), 1.7) * .9; C.fillStyle = `rgba(${112 + r() * 20 | 0},${124 + r() * 16 | 0},${118 + r() * 16 | 0},${.35 + r() * .35})`; C.fillRect(x + r() * (w - .012), y, .003 + r() * .007, .03 + r() * .11); }
      const y0 = .70 + r() * .04; C.fillStyle = `rgba(${tinta.join(',')},${.55 + r() * .25})`; C.fillRect(x + .004, y0, w - .008, 1 - y0);
      for (let k = 0; k < 14; k++) { C.fillStyle = `rgba(${base.join(',')},${.5 + r() * .5})`; C.fillRect(x + .01 + r() * (w - .05), y0 - .01 + r() * .12, .01 + r() * .035, .006 + r() * .03); }
      if (r() < .5) { C.fillStyle = 'rgba(30,24,18,.75)'; C.beginPath(); C.ellipse(x + w * (.3 + r() * .4), .15 + r() * .7, .012, .009, 0, 0, 6.3); C.fill(); } }); }
  // Travessas de 4,6 cm com parafuso em cada tábua; trava de ferro chato com suporte e argola de cadeado.
  for (const y of [.1, .5, .87]) { P.ret(0, y, 1, .022, '#6e6454', .95); P.ret(0, y + .022, 1, .005, '#1c1611', .3);
    for (let i = 0; i < 6; i++) { const x = .008 + i * .166 + .072; P.ret(x, y + .006, .012, .011, '#2a2420', 1); P.ret(x + .003, y + .008, .005, .004, '#8a857c', 1); } }
  P.ret(.52, .452, .46, .022, '#3a3835', 1); P.ret(.56, .443, .04, .04, FER, 1); P.ret(.9, .443, .04, .04, FER, 1); P.ret(.93, .474, .03, .034, '#6a6560', 1); P.ret(.935, .486, .02, .018, '#2a2623', .6);
  P.so((C) => { const g = C.createLinearGradient(0, .82, 0, 1); g.addColorStop(0, 'rgba(22,18,14,0)'); g.addColorStop(1, 'rgba(22,18,14,.3)'); C.fillStyle = g; C.fillRect(0, .82, 1, .18); });
}
// Aço de enrolar: lâminas galvanizadas, metade de cima pintada com corte em linha contínua e 2–3 lascas; ferrugem em
// gradiente no pé. NADA por pixel: ruído de canvas ampliado vira bloco na captura. Ver docs/hd-kit/lajes.md#porta-de-enrolar.
function enrolar(P, r) {
  P.ret(0, 0, 1, 1, '#50565a', .95);
  // Dois tons com luma ±20 % (galvanizado ≈ 156; tinta ≈ 95): com menos contraste a porta lê como chapa uniforme a 3 m.
  const tinta = r() < .5 ? [84, 98, 104] : [80, 92, 118], corte = .50 + r() * .06, fase = r() * 6.28, lascas = 2 + Math.floor(r() * 2);
  // Cada lâmina com sombra escura na dobra de baixo (altura 0,3 = recuo no relevo) e fio claro no topo; 3 amassados
  // nos 40 cm do pé (v ≥ 0,8), mais escuros e recuados (altura 0,5), com borda de baixo clara.
  for (let y = .012; y < .93; y += .043) { const g = .92 + r() * .12; P.ret(.07, y, .86, .028, tom([150, 158, 162], g), .85); P.ret(.07, y + .001, .86, .004, tom([176, 184, 188], g), .9); P.ret(.07, y + .028, .86, .015, '#3e4347', .3); P.ret(.07, y + .039, .86, .004, '#585e62', .5); }
  for (let i = 0; i < 3; i++) { const u = .12 + r() * .7, v = .80 + r() * .12, w = .05 + r() * .04, h = .03 + r() * .025; P.ret(u, v, w, h, '#454b4f', .5); P.ret(u, v + h - .006, w, .006, '#8a9094', .7); }
  P.so((C) => {
    // Tinta: polígono da borda superior até a linha de corte senoidal (amplitude 0,01 = 2 cm); as lascas são elipses de galvanizado por cima.
    C.save(); C.beginPath(); C.moveTo(0, 0); C.lineTo(1, 0);
    for (let i = 40; i >= 0; i--) { const u = i / 40; C.lineTo(u, corte + .01 * Math.sin(u * 7.0 + fase) + .004 * Math.sin(u * 17.0 + fase * 2.0)); }
    C.closePath(); C.clip();
    for (let y = .012; y < .93; y += .043) { const g = .92 + r() * .12; C.fillStyle = tom(tinta, g); C.fillRect(.07, y, .86, .028); C.fillStyle = tom(tinta, g * 1.2); C.fillRect(.07, y + .001, .86, .004); C.fillStyle = '#2f3638'; C.fillRect(.07, y + .028, .86, .011); C.fillStyle = '#46504f'; C.fillRect(.07, y + .039, .86, .004); }
    C.restore();
    for (let i = 0; i < lascas; i++) { const u = .12 + r() * .76, rx = .045 + r() * .04, ry = .02 + r() * .016, a = (r() - .5) * .5;
      C.fillStyle = tom([150, 158, 162], .95 + r() * .1); C.beginPath(); C.ellipse(u, corte - .006 + r() * .012, rx, ry, a, 0, 6.3); C.fill();
      C.fillStyle = 'rgba(102,108,112,.55)'; C.beginPath(); C.ellipse(u, corte - .006 + r() * .012, rx * .55, ry * .5, a, 0, 6.3); C.fill(); }
    // Ferrugem no pé (≤ 45 cm = v 0,78–1): gradiente contínuo mais fechado, com 6–9 manchas de óxido de 3–8 cm sobre as lâminas.
    const gv = C.createLinearGradient(0, .78, 0, 1); gv.addColorStop(0, 'rgba(96,62,38,0)'); gv.addColorStop(.3, 'rgba(104,66,40,.38)'); gv.addColorStop(.7, 'rgba(88,56,32,.72)'); gv.addColorStop(1, 'rgba(60,38,22,.92)');
    C.fillStyle = gv; C.fillRect(.07, .78, .86, .22);
    for (let i = 0, n = 6 + Math.floor(r() * 4); i < n; i++) { const u = .1 + r() * .8, vv = .80 + r() * .17, rx = .02 + r() * .03; C.fillStyle = `rgba(${r() < .5 ? '110,64,34' : '78,48,28'},${.45 + r() * .35})`; C.beginPath(); C.ellipse(u, vv, rx, rx * (.4 + r() * .5), (r() - .5) * .8, 0, 6.3); C.fill(); }
    const gh = C.createLinearGradient(.07, 0, .93, 0); gh.addColorStop(0, 'rgba(80,52,30,.35)'); gh.addColorStop(.3, 'rgba(80,52,30,0)'); gh.addColorStop(.62, 'rgba(80,52,30,.3)'); gh.addColorStop(1, 'rgba(80,52,30,.05)');
    C.save(); C.globalAlpha = 1; C.fillStyle = gh; C.beginPath(); C.rect(.07, .84, .86, .16); C.fill(); C.restore();
  });
  P.ret(.07, .955, .86, .03, '#3f4447', 1); for (const x of [.22, .72]) P.ret(x, .96, .07, .018, '#1d1f20', 1);
  P.ret(.455, .545, .09, .036, '#1c1e1f', 1); P.ret(.49, .553, .02, .012, '#8c8f90', 1); P.ret(.4, .558, .05, .012, '#2c2f30', 1);
}
function ondulada(P, r) {
  P.ret(0, 0, 1, 1, '#45484a', .9);
  for (let i = 0; i < 9; i++) [[0, '#7c8083', .35], [.025, '#a4a8aa', .9], [.05, '#8e9294', .7], [.075, '#5c6063', .15]].forEach(([dx, c, a]) => P.ret(.05 + i * .1 + dx, .025, .0255, .95, c, a));
  P.ret(0, .49, 1, .022, '#45484a', 1);
  // Tinta de baixo (verde ou vermelho desbotado, S ≈ 0,25) aparecendo rasgada só fora da faixa do corpo (acima de 1,9 m e abaixo de 0,45 m):
  // cachos de elipses de raio irregular, nunca retângulo.
  const fundo = r() < .5 ? [96, 110, 90] : [118, 90, 84];
  P.so((C) => {
    for (let i = 0; i < 16; i++) { const alto = r() < .4, x0 = .06 + r() * .88, y0 = alto ? .01 + r() * .045 : .80 + r() * .17;
      for (let k = 0; k < 5; k++) { C.fillStyle = `rgba(${fundo.join(',')},${.22 + r() * .3})`; C.beginPath();
        C.ellipse(x0 + (r() - .5) * .05, y0 + (r() - .5) * .025, .006 + r() * .022, .004 + r() * .012, r() * 3.14, 0, 6.3); C.fill(); } }
    // Ferrugem de base: gradiente contínuo de 1 m (0 em 1,03 m) até -25 % de luminância no pé, por onda e seguindo a corrugação.
    for (let i = 0; i < 9; i++) for (let k = 0; k < 4; k++) { const x = .05 + i * .1 + k * .025, a = [.6, .3, .4, .75][k] * (.75 + r() * .4), g = C.createLinearGradient(0, .50, 0, 1);
      g.addColorStop(0, 'rgba(96,62,38,0)'); g.addColorStop(.45, `rgba(100,64,40,${(a * .22).toFixed(2)})`); g.addColorStop(.8, `rgba(84,54,32,${(a * .6).toFixed(2)})`); g.addColorStop(1, `rgba(62,40,24,${a.toFixed(2)})`); C.fillStyle = g; C.fillRect(x, .50, .0255, .50); }
    // Escorrido fino (0,5–1 cm) só na metade de baixo, das arestas das ondas abaixo de 0,8 m até sumir no pé:
    // nada de mancha na faixa do corpo.
    for (let i = 0; i < 14; i++) { const x = .05 + Math.floor(r() * 9) * .1 + (r() < .5 ? .0 : .05), y0 = .60 + r() * .2, len = .08 + r() * .22, g = C.createLinearGradient(0, y0, 0, y0 + len);
      g.addColorStop(0, `rgba(92,60,36,${(.3 + r() * .3).toFixed(2)})`); g.addColorStop(1, 'rgba(92,60,36,0)'); C.fillStyle = g; C.fillRect(x, y0, .006 + r() * .005, len); }
    const g = C.createLinearGradient(0, .93, 0, 1); g.addColorStop(0, 'rgba(40,32,26,0)'); g.addColorStop(1, 'rgba(40,32,26,.55)'); C.fillStyle = g; C.fillRect(0, .93, 1, .07);
  });
  P.ret(.06, .5, .07, .035, '#a89a52', 1);
}
export const PORTA_TIPOS = ['chapa de ferro com frisos e postigo de vidro canelado com grade', 'esquadria de alumínio', 'madeira velha com tramela', 'chapa ondulada com ferrugem', 'aço de enrolar'];
export function atlasPortas() {
  const P = par(), r = rngDe(9127);
  [() => chapaFriso(P), () => esquadria(P), () => madeiraVelha(P, r), () => ondulada(P, r), () => enrolar(P, r)].forEach((f, k) => P.celula(k * COL, 0, COL, N, () => { f(); suja(P, r, 22); }));
  return funde(P, 'hd-portas');
}

// Pichação: [arquivo em /img/decals, altura no atlas (px), tinta de uma cor só ou null, categoria]. `reto` = pixo reto
// paulista (alto da empena); `xarpi` = assinatura carioca. Tinta "preta" é cinza-escuro: docs/hd-kit/lajes.md#pichacao.
const PRETO = '#2a2927', ARTE = [['or-graf-coro', 300, null, 'graf'], ['or-graf-treta', 300, null, 'graf'], ['or-mitico-mural', 380, null, 'graf'], ['or-stencil-capivara', 220, PRETO, 'estencil'], ['or-stencil-pomba', 220, PRETO, 'estencil'],
  ...['telha', 'varal', 'tijolo', 'escada', 'reboco', 'ladeira', 'telhado', 'quintal', 'muro', 'travessa', 'esquina', 'janela', 'laje', 'morro', 'antena', 'andaime'].map((n) => [`or-pixo-sp-${n}`, 270, PRETO, 'reto']),
  ...['subida', 'colina', 'encosta', 'alto', 'fundo', 'lua'].map((n, i) => [`or-pixo-rj-${n}`, n === 'lua' ? 200 : 100, i % 3 === 1 ? '#1b3a80' : PRETO, 'xarpi'])];
export const FRASES = [['VENDE-SE', 'GELO', '#363430'], ['DISK GÁS', '', '#1d3f8a'], ['CONSERTA-SE', 'FOGÃO', '#363430'], ['PROIBIDO', 'JOGAR LIXO', '#363430'], ['GELADINHO', 'R$1', '#1f6a3a'], ['DEUS É FIEL', '', '#1d3f8a'], ['LAVA JATO', '', '#1d3f8a'], ['NÃO', 'ESTACIONE', '#363430'], ['ÁGUA E GÁS', 'ENTREGA', '#1d3f8a'], ['CUIDADO', 'CÃO BRAVO', '#363430']];
const NA = 2048;
// Alfabeto de letrista em traço (caixa 10 x 14, linha de base em 14): sem fonte do sistema, condensado, sem serifa.
// Acentos vêm da decomposição NFD (agudo U+0301, til U+0303, cedilha U+0327) e entram como traço extra.
const O_ = [[3, 0], [7, 0], [10, 3], [10, 11], [7, 14], [3, 14], [0, 11], [0, 3], [3, 0]];
const P_ = [[0, 14], [0, 0], [7, 0], [10, 3], [10, 5], [7, 8], [0, 8]];
const S_ = [[10, 3], [7, 0], [3, 0], [0, 3], [0, 5], [3, 7], [7, 7], [10, 9], [10, 11], [7, 14], [3, 14], [0, 11]];
const GLIFOS = {
  A: [[[0, 14], [5, 0], [10, 14]], [[2, 9.5], [8, 9.5]]], B: [[[0, 0], [0, 14]], [[0, 0], [7, 0], [9, 2], [9, 5], [7, 7], [0, 7]], [[0, 7], [8, 7], [10, 9], [10, 12], [8, 14], [0, 14]]],
  C: [[[10, 3], [8, 0.5], [3, 0], [0, 3], [0, 11], [3, 14], [8, 13.5], [10, 11]]], D: [[[0, 0], [0, 14]], [[0, 0], [6, 0], [10, 4], [10, 10], [6, 14], [0, 14]]],
  E: [[[10, 0], [0, 0], [0, 14], [10, 14]], [[0, 7], [8, 7]]], F: [[[10, 0], [0, 0], [0, 14]], [[0, 7], [8, 7]]],
  G: [[[10, 3], [8, 0.5], [3, 0], [0, 3], [0, 11], [3, 14], [8, 14], [10, 11], [10, 8], [5, 8]]], H: [[[0, 0], [0, 14]], [[10, 0], [10, 14]], [[0, 7], [10, 7]]],
  I: [[[2, 0], [2, 14]]], J: [[[10, 0], [10, 11], [8, 14], [3, 14], [0, 11]]], K: [[[0, 0], [0, 14]], [[10, 0], [0, 8]], [[3, 6], [10, 14]]], L: [[[0, 0], [0, 14], [10, 14]]],
  M: [[[0, 14], [0, 0], [5, 8], [10, 0], [10, 14]]], N: [[[0, 14], [0, 0], [10, 14], [10, 0]]], O: [O_], P: [P_], Q: [O_, [[6, 10], [10, 14.5]]], R: [P_, [[4, 8], [10, 14]]], S: [S_],
  T: [[[0, 0], [10, 0]], [[5, 0], [5, 14]]], U: [[[0, 0], [0, 11], [3, 14], [7, 14], [10, 11], [10, 0]]], V: [[[0, 0], [5, 14], [10, 0]]], W: [[[0, 0], [2.5, 14], [5, 4], [7.5, 14], [10, 0]]],
  X: [[[0, 0], [10, 14]], [[10, 0], [0, 14]]], Y: [[[0, 0], [5, 7], [10, 0]], [[5, 7], [5, 14]]], Z: [[[0, 0], [10, 0], [0, 14], [10, 14]]],
  0: [O_], 1: [[[1, 3], [4, 0], [4, 14]]], 2: [[[0, 3], [3, 0], [7, 0], [10, 3], [10, 5], [0, 14], [10, 14]]], 3: [[[0, 0], [10, 0], [5, 6], [10, 9], [10, 11], [7, 14], [3, 14], [0, 12]]],
  4: [[[8, 14], [8, 0], [0, 10], [10, 10]]], 5: [[[10, 0], [0, 0], [0, 6], [7, 6], [10, 9], [10, 11], [7, 14], [3, 14], [0, 12]]], 6: [[[9, 0], [3, 0], [0, 4], [0, 11], [3, 14], [7, 14], [10, 11], [10, 9], [7, 6], [0, 7]]],
  7: [[[0, 0], [10, 0], [4, 14]]], 8: [[[3, 7], [0, 4], [0, 3], [3, 0], [7, 0], [10, 3], [10, 4], [7, 7], [3, 7], [0, 10], [0, 11], [3, 14], [7, 14], [10, 11], [10, 10], [7, 7]]],
  9: [[[10, 7], [3, 7], [0, 4], [0, 3], [3, 0], [7, 0], [10, 3], [10, 10], [7, 14], [1, 14]]],
  '-': [[[1, 7.5], [9, 7.5]]], '·': [[[4.5, 7], [5.5, 7]]], '$': [S_, [[5, -1], [5, 15]]], '!': [[[5, 0], [5, 9.5]], [[5, 12.5], [5, 14]]],
  '\u0301': [[[4, -4.5], [7, -2]]], '\u0303': [[[1, -3], [3.5, -4.5], [6.5, -2.5], [9, -4]]], '\u0327': [[[5, 14], [6, 15.5], [4, 16.5]]],
};
const LARG = { I: 4, 1: 6, '-': 10, '·': 6, '!': 6, ' ': 5 };
// Letra pintada à mão: pincel redondo com duas passadas desencontradas, altura e giro por letra, escorrido e falha.
function letreiro(g, r, texto, x, y, larg, px, cor) {
  const letras = [...texto.normalize('NFD')].reduce((l, ch) => { if (GLIFOS[ch] && ch.charCodeAt(0) < 0x300) l.push({ ch, acentos: [] }); else if (ch === ' ') l.push({ ch: ' ', acentos: [] }); else if (GLIFOS[ch] && l.length) l[l.length - 1].acentos.push(ch); return l; }, []);
  const e = px / 14, cond = .68, avanco = (ch) => ((LARG[ch] ?? 10) + 4.5) * e * cond;
  const total = letras.reduce((s, l) => s + avanco(l.ch), 0), k = Math.min(1, larg / total); let cx = x + (larg - total * k) / 2;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = cor; g.fillStyle = cor;
  for (const l of letras) {
    const w = avanco(l.ch) * k; if (l.ch !== ' ') {
      const esc = .9 + r() * .18, giro = (r() - .5) * .06, sub = (r() - .5) * px * .07, pincel = px * (.105 + r() * .03);
      g.save(); g.translate(cx + w / 2, y + sub); g.rotate(giro); g.scale(k * cond * e, esc * e); g.translate(-(LARG[l.ch] ?? 10) / 2, -7);
      const tracos = [...GLIFOS[l.ch], ...l.acentos.flatMap((a) => GLIFOS[a])];
      for (const [passo, alfa, dx, dy] of [[1, 1, 0, 0], [.72, .55, .35 * (r() - .5), .45 * (r() - .5)]]) {
        g.lineWidth = pincel * passo / (e * Math.min(k * cond, esc)); g.globalAlpha = alfa; g.beginPath();
        for (const t of tracos) t.forEach(([px0, py0], i) => { const jx = px0 + dx + (r() - .5) * .35, jy = py0 + dy + (r() - .5) * .35; if (i) g.lineTo(jx, jy); else g.moveTo(jx, jy); });
        g.stroke();
      }
      // Escorrido: tinta demais no pé de algumas letras.
      if (r() < .3) { const sx = (LARG[l.ch] ?? 10) * r(), h = 2 + r() * r() * 9; g.globalAlpha = .55; g.lineWidth = .9; g.beginPath(); g.moveTo(sx, 13.5); g.lineTo(sx + (r() - .5) * .6, 14 + h); g.stroke(); g.globalAlpha = .8; g.beginPath(); g.arc(sx, 14 + h, .7, 0, 6.3); g.fill(); }
      g.restore(); }
    cx += w;
  }
  g.restore();
}
export const pintaLetreiro = letreiro;
function gasta(g, r, x, y, w, h, n) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${.15 + r() * .5})`; g.fillRect(x + r() * w, y + r() * h, 1 + r() * w * .06, 1 + r() * 2.5); }
  g.restore();
}
// Falha de pincel seco: riscos horizontais finos que tiram tinta, mais no pé das letras.
function falhas(g, r, x, y, w, h, n) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) { const yy = y + h * (1 - r() * r()); g.fillStyle = `rgba(0,0,0,${.25 + r() * .6})`; g.fillRect(x + r() * w, yy, 12 + r() * w * .12, .8 + r() * 1.6); }
  g.restore();
}
function montaAtlas(imgs) {
  const c = tela(NA, NA), g = c.getContext('2d'), r = rngDe(3301), itens = [], fora = [];
  ARTE.forEach(([nome, h, tinta, cat], i) => { const im = imgs[i]; if (!im) return; const w = Math.round(h * im.width / im.height);
    itens.push({ id: nome, cat, w, h, pinta(x, y) { if (!tinta) { g.drawImage(im, x, y, w, h); return; }
      const t = tela(w, h), tg = t.getContext('2d'); tg.drawImage(im, 0, 0, w, h); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = tinta; tg.fillRect(0, 0, w, h); g.drawImage(t, x, y); t.width = t.height = 0; } }); });
  FRASES.forEach(([a, b, cor], i) => itens.push({ id: `frase${i}`, cat: 'frase', w: 520, h: 132, pinta(x, y) {
    if (b) { letreiro(g, r, a, x + 8, y + 36, 504, 58, cor); letreiro(g, r, b, x + 8, y + 96, 504, 62, cor); } else letreiro(g, r, a, x + 8, y + 68, 504, 84, cor);
    gasta(g, r, x, y, 520, 132, 60); falhas(g, r, x, y, 520, 132, 70); } }));
  itens.push({ id: 'fogao', cat: 'fixa', w: 800, h: 112, pinta(x, y) { letreiro(g, r, 'CONSERTA-SE FOGÃO', x + 10, y + 64, 780, 76, '#363430'); gasta(g, r, x, y, 800, 112, 70); falhas(g, r, x, y, 800, 112, 120); } });
  // Placa do mercadinho pintada direto no reboco: fundo amarelo-ocre irregular e letras verde-escuras à mão, sem marca.
  itens.push({ id: 'mercadinho', cat: 'fixa', w: 920, h: 104, pinta(x, y) { g.fillStyle = 'rgba(196,172,88,.92)'; g.fillRect(x + 3, y + 3, 914, 98);
    for (let i = 0; i < 9; i++) { g.fillStyle = `rgba(150,130,60,${.12 + r() * .18})`; g.fillRect(x + 3 + r() * 880, y + 3, 10 + r() * 60, 98); }
    letreiro(g, r, 'MERCADINHO 2 IRMÃOS', x + 22, y + 58, 876, 70, '#1e4a2a'); gasta(g, r, x, y, 920, 104, 90); falhas(g, r, x, y, 920, 104, 60); } });
  itens.push({ id: 'reclame', cat: 'reclame', w: 684, h: 252, pinta(x, y) { g.fillStyle = 'rgba(206,190,104,.94)'; g.fillRect(x + 4, y + 4, 676, 244); g.strokeStyle = 'rgba(29,63,138,.95)'; g.lineWidth = 7; g.strokeRect(x + 14, y + 14, 656, 224);
    letreiro(g, r, 'MATERIAL DE CONSTRUÇÃO', x + 28, y + 68, 628, 60, '#1d3f8a'); letreiro(g, r, 'AREIA · PEDRA · CIMENTO', x + 28, y + 140, 628, 50, '#1c1c1c'); letreiro(g, r, 'ENTREGA NA LAJE', x + 28, y + 202, 628, 46, '#1d3f8a');
    gasta(g, r, x, y, 684, 252, 500); } });
  itens.push({ id: 'escorrido', cat: 'esc', w: 96, h: 128, pinta(x, y) { for (let i = 0; i < 26; i++) { const sx = x + 4 + r() * 86, h = 30 + r() * r() * 94, gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, `rgba(26,24,20,${.25 + r() * .4})`); gr.addColorStop(1, 'rgba(26,24,20,0)'); g.fillStyle = gr; g.fillRect(sx, y + 1, 1 + r() * 4, h); } } });
  itens.sort((p, q) => q.h - p.h);
  let x = 2, y = 2, linha = 0; const ok = [];
  for (const it of itens) { if (x + it.w + 2 > NA) { x = 2; y += linha + 4; linha = 0; } if (y + it.h + 2 > NA) { fora.push(it.id); continue; }
    it.pinta(x, y); it.uv = [x / NA, 1 - (y + it.h) / NA, (x + it.w) / NA, 1 - y / NA]; ok.push(it); x += it.w + 4; linha = Math.max(linha, it.h); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.name = 'hd-pichacao';
  t.onUpdate = () => { c.width = c.height = 0; t.onUpdate = null; };
  return { t, itens: ok, fora };
}

const PAREDES = new Set(['cream', 'ochre', 'rose', 'sage', 'adobe', 'brick', 'concrete']), TIJOLO = new Set(['brick', 'ochre', 'rose']), UMA_COR = new Set(['xarpi', 'reto', 'estencil']);
const MEDIDAS = { xarpi: [1.2, 1.7, 1.2, 1.8], frase: [1.7, 2.2, 2.25, 2.5], estencil: [.8, 1.1, 0, 0], reclame: [2.7, 3.1, 0, 0] }, CHEIA = new Set(['frase', 'reclame', 'graf']);
// Decalques colados à parede (1 cm), sem colisão; cada lugar é conferido com raios e recusado se houver cinta, viga
// ou pilar no caminho. Na faixa do corpo só entra xarpi. opts.loja e a grade de raios: docs/hd-kit/lajes.md#decalques.
export function pichacoes(scene, mundo, U, evita = [], janelas = [], opts = {}) {
  let vivo = true, malha = null, tex = null, mat = null; const info = { n: 0, usados: [] };
  const carrega = (nome) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = `/img/decals/${nome}.png`; });
  Promise.all(ARTE.map(([nome]) => carrega(nome))).then((imgs) => {
    if (!vivo || !mundo) return;
    const { t, itens, fora } = montaAtlas(imgs); tex = t; info.fora = fora;
    const alvos = []; scene.traverse((o) => { if (o.isMesh && o.visible && /^lajes-(alvenaria|entorno)/.test(o.name)) alvos.push(o); });
    const raio = new THREE.Raycaster(), de = new THREE.Vector3(), dir = new THREE.Vector3(), r = rngDe(60611), cols = mundo.colliders || [], niveis = mundo.levels || [];
    let parede = '';
    const toca = (x, y, z, nx, nz) => { raio.set(de.set(x + nx * .5, y, z + nz * .5), dir.set(-nx, 0, -nz)); raio.far = .62; let h = null; try { h = raio.intersectObjects(alvos, false)[0]; } catch (e) { h = null; }
      parede = h ? h.object.material.name : ''; return PAREDES.has(parede) ? h.distance : null; };
    const livre = (x, y, z) => Math.abs(x) < 18.6 && Math.abs(z) < 31.6 && !cols.some((c) => x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && y > c.minY && y < c.maxY);
    const base = (x, z) => (niveis.some((l) => x > l.x0 && x < l.x1 && z > l.z0 && z < l.z1) ? 3.1 : 0);
    const pos = [], uv = [], hw = [];
    const cola = (it, x, yc, z, nx, nz, w, h, op) => {
      const tx = -nz, tz = nx; let mn = 9, mx = -9;
      if (evita.some((e) => Math.abs((e[0] - x) * tx + (e[2] - z) * tz) < w / 2 + .3 && Math.abs((e[0] - x) * nx + (e[2] - z) * nz) < .5 && Math.abs(e[1] - yc) < h / 2 + .35)) return false;
      const na = Math.max(2, Math.ceil((w + .08) / .22)), nb = Math.max(2, Math.ceil((h + .08) / .12));
      for (let i = 0; i <= na; i++) for (let k = 0; k <= nb; k++) { const d = toca(x + tx * (i / na - .5) * (w + .08), yc + (k / nb - .5) * (h + .08), z + tz * (i / na - .5) * (w + .08), nx, nz); if (d === null) return false; mn = Math.min(mn, d); mx = Math.max(mx, d); if (mx - mn > .012) return false; }
      if (TIJOLO.has(parede) && UMA_COR.has(it.cat)) op = -op;
      const f = .5 - mn + .01, P = (a, b) => [x + nx * f + tx * a * w / 2, yc + b * h / 2, z + nz * f + tz * a * w / 2], [u0, v0, u1, v1] = it.uv, s = x * tx + z * tz;
      for (const [a, b, u, v] of [[1, -1, u0, v0], [-1, -1, u1, v0], [-1, 1, u1, v1], [1, -1, u0, v0], [-1, 1, u1, v1], [1, 1, u0, v1]]) { pos.push(...P(a, b)); uv.push(u, v); hw.push(s + a * w / 2, yc + b * h / 2, op); }
      info.n++; info.usados.push(`${it.id} ${x.toFixed(1)} ${yc.toFixed(1)} ${z.toFixed(1)} ${w.toFixed(1)}`); return true;
    };
    // Faces de casa viradas para onde se anda; o beco central e a praça vêm primeiro e são varridos de 70 em 70 cm.
    const faces = []; let nf = 0;
    for (const c of cols) { if (c.minY > .5 || c.maxY < 2.6) continue;
      for (const [nx, nz, fx, fz, a0, a1] of [[1, 0, c.maxX, 0, c.minZ, c.maxZ], [-1, 0, c.minX, 0, c.minZ, c.maxZ], [0, 1, 0, c.maxZ, c.minX, c.maxX], [0, -1, 0, c.minZ, c.minX, c.maxX]]) {
        if (a1 - a0 < 2.2) continue; nf++;
        const xm = nx ? fx : (a0 + a1) / 2, zm = nz ? fz : (a0 + a1) / 2, centro = Math.abs(xm) < 1.2 && Math.abs(zm) > 8 ? 0 : Math.abs(xm) < 5.4 && Math.abs(zm) < 9.5 ? 1 : 2;
        for (let s = a0 + .6 + r() * .5; s < a1 - .5; s += centro < 2 ? .7 : 2.3 + r() * 1.6) { const x = nx ? fx : s, z = nz ? fz : s, b = base(x + nx * .7, z + nz * .7);
          if (!livre(x + nx * .7, b + 1.3, z + nz * .7) || c.maxY < b + 2.3) continue;
          faces.push({ x, z, nx, nz, b, s, id: nf, centro, teto: c.maxY, ordem: centro + r() }); } } }
    faces.sort((p, q) => p.ordem - q.ordem);
    const fila = []; for (const it of itens) { if (it.cat === 'esc' || it.cat === 'graf' || it.cat === 'fixa') continue; fila.push(it); if (it.cat !== 'estencil') fila.push(it); }
    for (let i = fila.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [fila[i], fila[j]] = [fila[j], fila[i]]; }
    const postas = [], perto = (f, d) => postas.some((p) => Math.hypot(p.x - f.x, p.z - f.z) < d && Math.abs(p.b - f.b) < 1);
    const fogao = itens.find((q) => q.id === 'fogao'), merc = opts.loja ? itens.find((q) => q.id === 'mercadinho') : null;
    // Letreiro fixo com op 1,25: passa pelo desbote em mancha do shader (com op 2 sai chapado).
    if (fogao) for (const z of [-12.9, -12.3, -13.5, -11.7, -14.1]) if (cola(fogao, -5.2, 5.19, z, -1, 0, 2.5, 2.5 * fogao.h / fogao.w, 1.25)) { postas.push({ x: -5.2, z, b: 3.1 }); break; }
    if (merc) for (const z of [-9.85, -9.6, -10.1]) if (cola(merc, -14.85, 2.76, z, 1, 0, 2.3, 2.3 * merc.h / merc.w, 1.25)) { postas.push({ x: -14.85, z, b: 0 }); info.mercadinho = z; break; }
    // Grafite grande primeiro, em parede alta (acima de 2,1 m), antes que o resto ocupe o lugar.
    for (const it of itens.filter((q) => q.cat === 'graf')) achou: for (const f of faces) { if (f.teto < f.b + 4 || perto(f, 4)) continue;
      for (const esc of [1, .8, .62]) { const w = (3.0 + r() * .5) * esc, h = w * it.h / it.w;
        for (const y0 of [f.b + 2.15, f.b + 3.35, f.teto - .2 - h]) if (y0 >= f.b + 2.1 && y0 + h < f.teto - .1 && cola(it, f.x, y0 + h / 2, f.z, f.nx, f.nz, w, h, 2)) { postas.push(f); break achou; } } }
    for (const f of faces) { if (!fila.length || info.n >= 84) break;
      if (perto(f, 1.9)) continue;
      feito: for (let k = 0; k < Math.min(4, fila.length); k++) for (const esc of fila[k].cat === 'reto' ? [1] : f.centro < 2 ? [1, .78, .6] : [1, .7]) { const it = fila[k], m = MEDIDAS[it.cat], asp = it.w / it.h; let w, h; const ys = [];
        if (it.cat === 'reto') { h = (1.0 + r() * .4) * esc; w = h * asp; ys.push(f.teto - .5 - h / 2, f.teto - .95 - h / 2); if (f.b < 1) ys.push(2.92 - h / 2); }
        else { w = (m[0] + r() * (m[1] - m[0])) * esc; h = w / asp; ys.push(m[2] ? f.b + m[2] + r() * (m[3] - m[2]) : f.b + 2.15 + r() * .3 + h / 2); }
        for (const yc of ys) { if (yc + h / 2 > f.teto - .1 || yc - h / 2 < f.b + (it.cat === 'xarpi' ? .9 : 1.95)) continue;
          if (!cola(it, f.x, yc, f.z, f.nx, f.nz, w, h, it.cat === 'frase' ? 1.3 : CHEIA.has(it.cat) ? 2 : .92 + r() * .08)) continue;
          fila.splice(k, 1); postas.push(f);
          // Pixo reto anda em fileira: tenta mais dois nomes na mesma altura, lado a lado.
          if (it.cat === 'reto') { let lado = w / 2; for (let q = 0; q < 2; q++) { const j = fila.findIndex((o) => o.cat === 'reto'); if (j < 0) break; const o = fila[j], w2 = h * o.w / o.h, s = lado + .14 + w2 / 2;
            if (!cola(o, f.x - f.nz * s, yc, f.z + f.nx * s, f.nx, f.nz, w2, h, .92 + r() * .08)) break; fila.splice(j, 1); lado = s + w2 / 2; } }
          break feito; } } }
    // Escorrido sob o peitoril: tenta os dois lados do vão, o raio só acha parede pelo lado de fora.
    const esc = itens.find((it) => it.cat === 'esc'); info.escorridos = 0;
    if (esc) for (const j of janelas) for (const sn of [1, -1]) { const nx = j.eixo === 0 ? sn : 0, nz = j.eixo === 0 ? 0 : sn;
      if (cola(esc, j.x, j.y - j.h / 2 - .43, j.z, nx, nz, j.w * .9, .55, .85)) { info.escorridos++; info.n--; info.usados.pop(); break; } }
    if (!pos.length) { t.dispose(); tex = null; return; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('hdW', new THREE.Float32BufferAttribute(hw, 3)); geo.computeVertexNormals(); geo.computeBoundingSphere(); for (const a of Object.values(geo.attributes)) a.onUpload(function () { this.array = null; });
    mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: .95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, name: 'hd-pichacao' });
    // A tinta some em manchas e perto do pé da parede, como spray velho sobre reboco.
    mat.onBeforeCompile = (s) => { s.uniforms.hdRuido = U.hdRuido;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdW; varying vec3 vHdW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdW = hdW;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdW; uniform sampler2D hdRuido;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          { vec4 hdN = texture2D(hdRuido, vHdW.xy * 0.71); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.81, 0.77), step(vHdW.z, 0.0)); diffuseColor.a *= min(abs(vHdW.z), 1.0) * mix(0.72 + 0.28 * smoothstep(0.25, 0.55, hdN.r * 0.55 + hdN.b * 0.45), 1.0, step(1.5, abs(vHdW.z))); diffuseColor.rgb *= 0.88; }`); };
    mat.customProgramCacheKey = () => 'hd-pichacao5';
    malha = new THREE.Mesh(geo, mat); malha.name = 'hd-pichacao'; malha.castShadow = false; malha.raycast = () => {}; malha.receiveShadow = true; malha.renderOrder = 2; scene.add(malha);
  }).catch(() => {});
  return { info, desliga() { vivo = false; if (malha) { scene.remove(malha); malha.geometry.dispose(); } mat?.dispose(); tex?.dispose(); } };
}
