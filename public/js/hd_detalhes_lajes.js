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

const AL = '#a3a6a5', AL2 = '#858988', AL3 = '#5f6362', VID = '#0d1417', FER = '#2a2623', CANEL = [126, 140, 134];
function canelado(P, x, y, w, h, cor = CANEL, passo = .016) {
  const n = Math.max(1, Math.round(w / passo)), d = w / n;
  for (let i = 0; i < n; i++) { P.ret(x + i * d, y, d * .52, h, tom(cor, 1.08), 1, true); P.ret(x + (i + .5) * d, y, d * .52, h, tom(cor, .78), .25, true); }
}
function vidroLiso(P, r, x, y, w, h, pano) {
  P.ret(x, y, w, h, VID, 0, true);
  P.so((C) => { const g = C.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(120,140,150,.16)'); g.addColorStop(.5, 'rgba(120,140,150,0)'); C.fillStyle = g; C.fillRect(x, y, w, h);
    if (pano) for (let i = 0; i < 9; i++) { C.fillStyle = `rgba(${pano},${.22 + .2 * r()})`; C.fillRect(x + w * i / 9, y, w / 9 * (.5 + r() * .5), h * (.82 + r() * .14)); } });
}
function suja(P, r, n) {
  P.so((C) => { for (let i = 0; i < n; i++) { C.fillStyle = `rgba(${r() < .65 ? '38,32,26' : '104,58,30'},${.04 + r() * .09})`; C.fillRect(r(), r() * .6, .006 + r() * .03, .12 + r() * .5); }
    const g = C.createLinearGradient(0, .8, 0, 1); g.addColorStop(0, 'rgba(30,26,22,0)'); g.addColorStop(1, 'rgba(30,26,22,.35)'); C.fillStyle = g; C.fillRect(0, .8, 1, .2); });
}

function correr(P, r, { fantasia = false, aberta = false, papelao = false } = {}) {
  P.ret(0, 0, 1, 1, AL, .95); P.ret(.035, .035, .93, .895, '#1b1e1f', .05);
  if (aberta) P.so((C) => { for (let i = 0; i < 5; i++) { C.fillStyle = `rgba(150,160,120,${.25 + .3 * r()})`; C.fillRect(.78 + i * .035, .05, .022, .8); } });
  (aberta ? [[.035, .46, .5], [.30, .47, .75]] : [[.035, .47, .5], [.495, .47, .75]]).forEach(([x, w, alt], i) => {
    P.ret(x, .035, w, .895, i ? AL : AL2, alt);
    const gx = x + .034, gy = .07, gw = w - .068, gh = .825;
    if (fantasia) canelado(P, gx, gy, gw, gh); else vidroLiso(P, r, gx, gy, gw, gh, i === 0 ? '176,168,150' : null);
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
  P.ret(0, 0, 1, 1, '#55685a', .95);
  for (let f = 0; f < 2; f++) { const x = .05 + f * .455, w = .445; P.ret(x, .05, w, .9, '#39463c', .6);
    for (let y = .075; y < .9; y += .034) { if (r() < .05) { P.ret(x + .03, y, w - .06, .03, '#0c0e0d', .1); continue; }
      P.ret(x + .03, y, w - .06, .02, tom([104, 124, 108], .85 + r() * .3), .95); P.ret(x + .03, y + .02, w - .06, .014, '#2f3a31', .25); } }
  P.ret(.47, .45, .06, .035, FER, 1);
}
function vitro(P, r) {
  P.ret(0, 0, 1, 1, '#b9b4a2', .85);
  for (let c = 0; c < 3; c++) for (let l = 0; l < 4; l++) { const x = .045 + c * .31, y = .045 + l * .2325, w = .29, h = .2125, s = r();
    if (s < .12) P.ret(x, y, w, h, '#090a0b', 0); else if (s < .45) canelado(P, x, y, w, h, [132, 142, 130], .02); else vidroLiso(P, r, x, y, w, h, s > .8 ? '160,150,120' : null); }
  P.so((C) => { for (let i = 0; i < 40; i++) { C.fillStyle = `rgba(104,58,30,${.2 + r() * .4})`; const v = r() < .5; C.fillRect(v ? .04 + Math.floor(r() * 4) * .31 - .008 + r() * .01 : r(), v ? r() : .04 + Math.floor(r() * 5) * .2325 - .008 + r() * .01, v ? .012 : .05, v ? .06 : .012); } });
  for (let k = -5; k <= 6; k++) { P.linha(k * .2, 0, k * .2 + 1, 1, .016, FER, 1); P.linha(k * .2 + 1, 0, k * .2, 1, .016, FER, 1); }
  for (const e of [.012, .988]) { P.linha(e, 0, e, 1, .024, FER, 1); P.linha(0, e, 1, e, .024, FER, 1); }
}
function tijolos(P, r) {
  P.ret(0, 0, 1, 1, '#8d8980', .35);
  const h = .158, w = .262; let l = 0;
  for (let y = .012; y < 1; y += h + .018, l++) for (let x = -(l % 2) * w * .5 - .01; x < 1; x += w + .016) {
    const g = .8 + r() * .38, yy = y + (r() - .5) * .008;
    P.ret(x, yy, w, h, tom([150, 90, 66], g), .75);
    for (let k = 1; k < 6; k++) P.ret(x, yy + k * h / 6, w, .006, tom([116, 68, 52], g), .6);
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
// 9 tipos numa grade 3x3; o shader escolhe a célula pelo hash da posição do vão.
export const JANELA_TIPOS = ['correr de alumínio, vidro liso', 'correr de alumínio, vidro canelado, folha aberta', 'basculante de ferro', 'veneziana', 'vitrô de ferro com grade em losango',
  'vão fechado com tijolo baiano', 'vão fechado com madeirite e tábua', 'lençol por dentro e ventilador', 'correr remendada com papelão, barras retas, vaso e garrafa'];
export function atlasJanelas() {
  const P = par(), r = rngDe(4471);
  [() => correr(P, r), () => correr(P, r, { fantasia: true, aberta: true }), () => basculante(P), () => veneziana(P, r), () => vitro(P, r), () => tijolos(P, r), () => madeirite(P, r), () => cortina(P),
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
  for (let i = 0; i < 5; i++) { const x = .01 + i * .198; P.ret(x, .008 + r() * .012, .188, .985, tom([128, 120, 108], .8 + r() * .36), .6);
    P.so((C) => { for (let k = 0; k < 16; k++) { C.fillStyle = `rgba(36,30,24,${.08 + r() * .14})`; C.fillRect(x + r() * .18, r(), .006 + r() * .012, .08 + r() * .3); }
      for (let k = 0; k < 9; k++) { C.fillStyle = `rgba(96,132,112,${.5 + r() * .35})`; C.fillRect(x + .004, r() * .62, .18, .03 + r() * .1); } }); }
  for (const y of [.1, .5, .87]) { P.ret(0, y, 1, .045, '#6a6052', .95); P.ret(0, y + .045, 1, .006, '#1c1611', .3); }
  P.ret(.74, .455, .2, .014, '#a79f8c', 1); P.ret(.83, .447, .03, .03, FER, 1);
  P.so((C) => { const g = C.createLinearGradient(0, .82, 0, 1); g.addColorStop(0, 'rgba(22,18,14,0)'); g.addColorStop(1, 'rgba(22,18,14,.3)'); C.fillStyle = g; C.fillRect(0, .82, 1, .18); });
}
function ondulada(P, r) {
  P.ret(0, 0, 1, 1, '#45484a', .9);
  for (let i = 0; i < 9; i++) [[0, '#7c8083', .35], [.025, '#a4a8aa', .9], [.05, '#8e9294', .7], [.075, '#5c6063', .15]].forEach(([dx, c, a]) => P.ret(.05 + i * .1 + dx, .025, .0255, .95, c, a));
  P.ret(0, .49, 1, .022, '#45484a', 1);
  P.so((C) => { for (let i = 0; i < 70; i++) { const y = Math.pow(r(), .45); C.fillStyle = `rgba(${92 + r() * 22 | 0},${50 + r() * 14 | 0},${26 + r() * 10 | 0},${.18 + r() * .4})`; C.fillRect(.05 + r() * .9, y * .97, .01 + r() * .05, (.01 + r() * .06) * (1 + y)); } });
  P.ret(.06, .5, .07, .035, '#a89a52', 1);
}
function enrolar(P, r) {
  P.ret(0, 0, 1, 1, '#50565a', .95);
  for (let y = .012; y < .955; y += .0215) { P.ret(.07, y, .86, .012, tom([134, 142, 146], .9 + r() * .16), .85); P.ret(.07, y + .012, .86, .0095, '#565c60', .3); }
  P.ret(.07, .955, .86, .03, '#3f4447', 1); for (const x of [.22, .72]) P.ret(x, .96, .07, .018, '#1d1f20', 1);
}
export const PORTA_TIPOS = ['chapa de ferro com frisos e postigo de vidro canelado com grade', 'esquadria de alumínio', 'madeira velha com tramela', 'chapa ondulada com ferrugem', 'aço de enrolar'];
export function atlasPortas() {
  const P = par(), r = rngDe(9127);
  [() => chapaFriso(P), () => esquadria(P), () => madeiraVelha(P, r), () => ondulada(P, r), () => enrolar(P, r)].forEach((f, k) => P.celula(k * COL, 0, COL, N, () => { f(); suja(P, r, 22); }));
  return funde(P, 'hd-portas');
}

// Pichação. [arquivo em /img/decals, altura no atlas (px), tinta de uma cor só ou null, categoria]
const ARTE = [['or-graf-coro', 150, null, 'graf'], ['or-graf-treta', 150, null, 'graf'], ['or-mitico-mural', 200, null, 'graf'], ['or-stencil-capivara', 140, null, 'alto'], ['or-stencil-pomba', 140, null, 'alto'],
  ['or-pixo-rj-subida', 56, null, 'fino'], ['or-pixo-rj-colina', 56, '#20418c', 'fino'], ['or-pixo-rj-encosta', 56, null, 'fino'],
  ['or-pixo-rj-baile', 60, null, 'tag'], ['or-pixo-rj-pipa', 64, '#20418c', 'tag'], ['or-pixo-rj-samba', 68, null, 'tag'], ['or-pixo-rj-bonde', 64, '#e4e2da', 'tag'], ['or-pixo-rj-grau', 80, null, 'tag'],
  ['or-pixo-rj-funk', 60, '#b4b8bc', 'tag'], ['or-pixo-rj-zn', 60, '#20418c', 'tag'], ['or-pixo-rj-pique', 60, null, 'tag'],
  ['or-pixo-sp-antena', 170, null, 'alto'], ['or-pixo-sp-andaime', 150, null, 'alto'], ['or-pixo-sp-norte26', 170, '#e4e2da', 'alto'], ['or-pixo-sp-zl26', 170, null, 'alto'],
  ['or-pixo-sp-dupla-portao-grade', 120, '#20418c', 'alto'], ['or-pixo-sp-laje', 170, null, 'alto'], ['or-pixo-sp-morro', 170, '#b4b8bc', 'alto']];
export const FRASES = [['PROIBIDO', 'JOGAR LIXO', '#1c1c1c'], ['VENDE-SE', 'GELO', '#1d3f8a'], ['GELADINHO', 'R$1', '#1f6a3a'], ['CONSERTA-SE', 'FOGÃO', '#1c1c1c'], ['DEUS É FIEL', '', '#1d3f8a'], ['LAVA JATO', '', '#e6e4dc'], ['NÃO', 'ESTACIONE', '#e6e4dc'], ['ÁGUA E GÁS', 'ENTREGA', '#1d3f8a'], ['CUIDADO', 'CÃO BRAVO', '#1c1c1c']];
const NUMEROS = ['27', '112', '9-A', '48'];
const FONTE = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
// Letra pintada à mão: cada letra com giro, altura e peso de pincel próprios.
function letreiro(g, r, texto, x, y, larg, px, cor) {
  g.font = `900 ${px}px ${FONTE}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = cor;
  const total = [...texto].reduce((s, ch) => s + g.measureText(ch).width * 1.04, 0), k = Math.min(1, larg / total); let cx = x + (larg - total * k) / 2;
  for (const ch of texto) { const w = g.measureText(ch).width * 1.04 * k; g.save(); g.translate(cx + w / 2, y + (r() - .5) * px * .08); g.rotate((r() - .5) * .07); g.scale(k * (.94 + r() * .1), .92 + r() * .16);
    g.textAlign = 'center'; g.fillText(ch, 0, 0); g.restore(); cx += w; }
}
function gasta(g, r, x, y, w, h, n) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${.15 + r() * .5})`; g.fillRect(x + r() * w, y + r() * h, 1 + r() * w * .06, 1 + r() * 2.5); }
  g.restore();
}
function montaAtlas(imgs) {
  const c = tela(), g = c.getContext('2d'), r = rngDe(3301), itens = [];
  ARTE.forEach(([nome, h, tinta, cat], i) => { const im = imgs[i]; if (!im) return; const w = Math.round(h * im.width / im.height);
    itens.push({ id: nome, cat, w, h, pinta(x, y) { if (!tinta) { g.drawImage(im, x, y, w, h); return; }
      const t = tela(w, h), tg = t.getContext('2d'); tg.drawImage(im, 0, 0, w, h); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = tinta; tg.fillRect(0, 0, w, h); g.drawImage(t, x, y); t.width = t.height = 0; } }); });
  FRASES.forEach(([a, b, cor], i) => itens.push({ id: `frase${i}`, cat: 'frase', w: 290, h: 74, pinta(x, y) {
    if (b) { letreiro(g, r, a, x + 4, y + 20, 282, 32, cor); letreiro(g, r, b, x + 4, y + 54, 282, 34, cor); } else letreiro(g, r, a, x + 4, y + 38, 282, 46, cor);
    gasta(g, r, x, y, 290, 74, 160); } }));
  itens.push({ id: 'reclame', cat: 'reclame', w: 380, h: 140, pinta(x, y) { g.fillStyle = 'rgba(196,182,104,.62)'; g.fillRect(x + 2, y + 2, 376, 136); g.strokeStyle = 'rgba(29,63,138,.7)'; g.lineWidth = 4; g.strokeRect(x + 8, y + 8, 364, 124);
    letreiro(g, r, 'MATERIAL DE CONSTRUÇÃO', x + 16, y + 38, 348, 34, 'rgba(29,63,138,.85)'); letreiro(g, r, 'AREIA · PEDRA · CIMENTO', x + 16, y + 78, 348, 28, 'rgba(28,28,28,.8)'); letreiro(g, r, 'ENTREGA NA LAJE', x + 16, y + 112, 348, 26, 'rgba(29,63,138,.85)');
    gasta(g, r, x, y, 380, 140, 900); } });
  NUMEROS.forEach((n, i) => itens.push({ id: `num${i}`, cat: 'num', w: 78, h: 44, pinta(x, y) { g.fillStyle = i % 2 ? '#1d3f8a' : '#e6e4dc'; g.fillRect(x + 2, y + 3, 74, 38); letreiro(g, r, n, x + 6, y + 23, 66, 30, i % 2 ? '#e6e4dc' : '#1c1c1c'); gasta(g, r, x, y, 78, 44, 40); } }));
  itens.push({ id: 'escorrido', cat: 'esc', w: 96, h: 128, pinta(x, y) { for (let i = 0; i < 26; i++) { const sx = x + 4 + r() * 86, h = 30 + r() * r() * 94, gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, `rgba(26,24,20,${.25 + r() * .4})`); gr.addColorStop(1, 'rgba(26,24,20,0)'); g.fillStyle = gr; g.fillRect(sx, y + 1, 1 + r() * 4, h); } } });
  itens.sort((p, q) => q.h - p.h);
  let x = 2, y = 2, linha = 0; const ok = [];
  for (const it of itens) { if (x + it.w + 2 > N) { x = 2; y += linha + 4; linha = 0; } if (y + it.h + 2 > N) continue;
    it.pinta(x, y); it.uv = [x / N, 1 - (y + it.h) / N, (x + it.w) / N, 1 - y / N]; ok.push(it); x += it.w + 4; linha = Math.max(linha, it.h); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.name = 'hd-pichacao';
  t.onUpdate = () => { c.width = c.height = 0; t.onUpdate = null; };
  return { t, itens: ok };
}

const PAREDES = new Set(['cream', 'ochre', 'rose', 'sage', 'adobe', 'brick', 'concrete']), TIJOLO = new Set(['brick', 'ochre', 'rose']), UMA_COR = new Set(['tag', 'fino', 'alto', 'frase']);
const MEDIDAS = { tag: [1.3, 1.9, 1.25, 2.0], fino: [1.3, 1.8, 1.2, 1.8], frase: [1.7, 2.3, 1.5, 2.1], alto: [0, 0, 0, 0], graf: [3.0, 3.6, 0, 0], reclame: [2.9, 3.3, 0, 0] };
// Decalques colados à parede (8 mm), sem colisão. Cada lugar é conferido com raios: 15 pontos na mesma parede lisa.
// Na faixa do corpo só entra traço fino: tag de spray com mais de 80 cm de largura sobe para acima de 2 m.
export function pichacoes(scene, mundo, U, portas = [], janelas = []) {
  let vivo = true, malha = null, tex = null, mat = null; const info = { n: 0, usados: [] };
  const carrega = (nome) => new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = `/img/decals/${nome}.png`; });
  Promise.all(ARTE.map(([nome]) => carrega(nome))).then((imgs) => {
    if (!vivo || !mundo) return;
    const { t, itens } = montaAtlas(imgs); tex = t;
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
      for (const a of [-.46, -.23, 0, .23, .46]) for (const b of [-.44, 0, .44]) { const d = toca(x + tx * a * w, yc + b * h, z + tz * a * w, nx, nz); if (d === null) return false; mn = Math.min(mn, d); mx = Math.max(mx, d); }
      if (mx - mn > .012) return false;
      if (TIJOLO.has(parede) && UMA_COR.has(it.cat)) op = -op;
      const f = .5 - mn + .008, P = (a, b) => [x + nx * f + tx * a * w / 2, yc + b * h / 2, z + nz * f + tz * a * w / 2], [u0, v0, u1, v1] = it.uv, s = x * tx + z * tz;
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
    const fila = []; for (const it of itens) { if (it.cat === 'num' || it.cat === 'esc') continue; fila.push(it); if (it.cat === 'tag' || it.cat === 'frase' || it.cat === 'reclame') fila.push(it); }
    for (let i = fila.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [fila[i], fila[j]] = [fila[j], fila[i]]; }
    const postas = [];
    // Grafite grande primeiro, em parede alta (acima de 2,1 m), antes que as tags ocupem o lugar.
    for (const it of itens.filter((q) => q.cat === 'graf')) for (const f of faces) { if (f.teto < f.b + 5 || postas.some((p) => Math.hypot(p.x - f.x, p.z - f.z) < 4 && Math.abs(p.b - f.b) < 1)) continue;
      const w = 3.0 + r() * .6, h = w * it.h / it.w; if (!cola(it, f.x, f.b + 2.15 + h / 2, f.z, f.nx, f.nz, w, h, .95) && !cola(it, f.x, f.b + 2.15 + h * .4, f.z, f.nx, f.nz, w * .8, h * .8, .95)) continue;
      postas.push(f); fila.splice(fila.indexOf(it), 1); break; }
    for (const f of faces) { if (!fila.length || info.n >= 70) break;
      if (postas.some((p) => Math.hypot(p.x - f.x, p.z - f.z) < 1.9 && Math.abs(p.b - f.b) < 1)) continue;
      feito: for (let k = 0; k < Math.min(3, fila.length); k++) for (const esc of f.centro < 2 ? [1, .72, .52] : [1, .55]) { const it = fila[k], m = MEDIDAS[it.cat], asp = it.w / it.h; let w, h, yc;
        if (it.cat === 'alto') { h = (1.5 + r() * .4) * esc; w = h * asp; yc = f.b + 2.15 + r() * .35 + h / 2; }
        else { w = (m[0] + r() * (m[1] - m[0])) * esc; h = w / asp; yc = m[2] ? f.b + m[2] + r() * (m[3] - m[2]) : f.b + 2.1 + r() * .3 + h / 2;
          if (it.cat === 'tag' && w > .8) yc = f.b + 2.0 + r() * .3 + h / 2; }
        if (yc + h / 2 > f.teto - .15) continue;
        if (cola(it, f.x, yc, f.z, f.nx, f.nz, w, h, it.cat === 'reclame' ? .75 : it.cat === 'graf' ? .95 : .9 + r() * .1)) { fila.splice(k, 1); postas.push(f); break feito; } } }
    // Número da casa pintado à mão ao lado de algumas portas.
    const nums = itens.filter((it) => it.cat === 'num'), v = new THREE.Vector3();
    portas.forEach((p, i) => { const n = p.userData.facadeNormal; if (!n || !nums.length || r() > .5) return; p.getWorldPosition(v);
      cola(nums[i % nums.length], v.x - n[0] * .07, v.y + 1.24, v.z + (r() < .5 ? .78 : -.78), n[0], n[2], .3, .17, .95); });
    // Escorrido sob o peitoril: tenta os dois lados do vão, o raio só acha parede pelo lado de fora.
    const esc = itens.find((it) => it.cat === 'esc'); info.escorridos = 0;
    if (esc) for (const j of janelas) for (const sn of [1, -1]) { const nx = j.eixo === 0 ? sn : 0, nz = j.eixo === 0 ? 0 : sn;
      if (cola(esc, j.x, j.y - j.h / 2 - .34, j.z, nx, nz, j.w * .92, .4, .6)) { info.escorridos++; info.n--; info.usados.pop(); break; } }
    if (!pos.length) { t.dispose(); tex = null; return; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('hdW', new THREE.Float32BufferAttribute(hw, 3)); geo.computeVertexNormals(); geo.computeBoundingSphere(); for (const a of Object.values(geo.attributes)) a.onUpload(function () { this.array = null; });
    mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: .95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, name: 'hd-pichacao' });
    // A tinta some em manchas e perto do pé da parede, como spray velho sobre reboco.
    mat.onBeforeCompile = (s) => { s.uniforms.hdRuido = U.hdRuido;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 hdW; varying vec3 vHdW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvHdW = hdW;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vHdW; uniform sampler2D hdRuido;')
        .replace('#include <map_fragment>', `#include <map_fragment>
          { vec4 hdN = texture2D(hdRuido, vHdW.xy * 0.71); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.81, 0.77), step(vHdW.z, 0.0)); diffuseColor.a *= abs(vHdW.z) * (0.68 + 0.32 * smoothstep(0.25, 0.55, hdN.r * 0.55 + hdN.b * 0.45)); diffuseColor.rgb *= 0.88; }`); };
    mat.customProgramCacheKey = () => 'hd-pichacao4';
    malha = new THREE.Mesh(geo, mat); malha.name = 'hd-pichacao'; malha.castShadow = false; malha.raycast = () => {}; malha.receiveShadow = true; malha.renderOrder = 2; scene.add(malha);
  }).catch(() => {});
  return { info, desliga() { vivo = false; if (malha) { scene.remove(malha); malha.geometry.dispose(); } mat?.dispose(); tex?.dispose(); } };
}
