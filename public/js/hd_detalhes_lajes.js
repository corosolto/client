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
  P.so((C) => { for (let i = 0; i < n; i++) { C.fillStyle = `rgba(${r() < .65 ? '38,32,26' : '104,58,30'},${.04 + r() * .09})`; C.fillRect(r(), r() * .6, .006 + r() * .03, .12 + r() * .5); }
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
  P.ret(0, 0, 1, 1, '#55685a', .95);
  for (let f = 0; f < 2; f++) { const x = .05 + f * .455, w = .445; P.ret(x, .05, w, .9, '#39463c', .6);
    for (let y = .075; y < .9; y += .034) { if (r() < .05) { P.ret(x + .03, y, w - .06, .03, '#0c0e0d', .1); continue; }
      P.ret(x + .03, y, w - .06, .02, tom([104, 124, 108], .85 + r() * .3), .95); P.ret(x + .03, y + .02, w - .06, .014, '#2f3a31', .25); } }
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
  for (let i = 0; i < 6; i++) { const x = .008 + i * .166, w = .158, g = .82 + r() * .32; P.ret(x, .006 + r() * .01, w, .988, tom([134, 122, 106], g), .6);
    P.so((C) => { for (let k = 0; k < 70; k++) { C.fillStyle = `rgba(${r() < .7 ? '44,36,28' : '188,176,156'},${.10 + r() * .2})`; C.fillRect(x + r() * w, r(), .0025 + r() * .004, .05 + r() * .35); }
      for (let k = 0; k < 60; k++) { const y = Math.pow(r(), 1.7) * .9; C.fillStyle = `rgba(${96 + r() * 20 | 0},${122 + r() * 16 | 0},${128 + r() * 16 | 0},${.45 + r() * .4})`; C.fillRect(x + r() * (w - .03), y, .008 + r() * .03, .006 + r() * .045); }
      if (r() < .5) { C.fillStyle = 'rgba(30,24,18,.75)'; C.beginPath(); C.ellipse(x + w * (.3 + r() * .4), .15 + r() * .7, .012, .009, 0, 0, 6.3); C.fill(); } }); }
  for (const y of [.1, .5, .87]) { P.ret(0, y, 1, .045, '#746a5a', .95); P.ret(0, y + .045, 1, .006, '#1c1611', .3);
    for (let i = 0; i < 6; i++) P.ret(.008 + i * .166 + .07, y + .017, .012, .008, '#2a2420', 1); }
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
// `reto` = pixo reto paulista (alto da empena, preto ou branco); `xarpi` = assinatura carioca de traço único.
const PRETO = '#141414', ARTE = [['or-graf-coro', 300, null, 'graf'], ['or-graf-treta', 300, null, 'graf'], ['or-mitico-mural', 380, null, 'graf'], ['or-stencil-capivara', 220, PRETO, 'estencil'], ['or-stencil-pomba', 220, PRETO, 'estencil'],
  ...['telha', 'varal', 'tijolo', 'escada', 'reboco', 'ladeira', 'telhado', 'quintal', 'muro', 'travessa', 'esquina', 'janela', 'laje', 'morro', 'antena', 'andaime'].map((n) => [`or-pixo-sp-${n}`, 270, PRETO, 'reto']),
  ...['subida', 'colina', 'encosta', 'alto', 'fundo', 'lua'].map((n, i) => [`or-pixo-rj-${n}`, n === 'lua' ? 200 : 100, i % 3 === 1 ? '#1b3a80' : PRETO, 'xarpi'])];
export const FRASES = [['VENDE-SE', 'GELO', '#1c1c1c'], ['DISK GÁS', '', '#1d3f8a'], ['CONSERTA-SE', 'FOGÃO', '#1c1c1c'], ['PROIBIDO', 'JOGAR LIXO', '#1c1c1c'], ['GELADINHO', 'R$1', '#1f6a3a'], ['DEUS É FIEL', '', '#1d3f8a'], ['LAVA JATO', '', '#1d3f8a'], ['NÃO', 'ESTACIONE', '#1c1c1c'], ['ÁGUA E GÁS', 'ENTREGA', '#1d3f8a'], ['CUIDADO', 'CÃO BRAVO', '#1c1c1c']];
const FONTE = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', NA = 2048;
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
  const c = tela(NA, NA), g = c.getContext('2d'), r = rngDe(3301), itens = [], fora = [];
  ARTE.forEach(([nome, h, tinta, cat], i) => { const im = imgs[i]; if (!im) return; const w = Math.round(h * im.width / im.height);
    itens.push({ id: nome, cat, w, h, pinta(x, y) { if (!tinta) { g.drawImage(im, x, y, w, h); return; }
      const t = tela(w, h), tg = t.getContext('2d'); tg.drawImage(im, 0, 0, w, h); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = tinta; tg.fillRect(0, 0, w, h); g.drawImage(t, x, y); t.width = t.height = 0; } }); });
  FRASES.forEach(([a, b, cor], i) => itens.push({ id: `frase${i}`, cat: 'frase', w: 520, h: 132, pinta(x, y) {
    if (b) { letreiro(g, r, a, x + 8, y + 36, 504, 58, cor); letreiro(g, r, b, x + 8, y + 96, 504, 62, cor); } else letreiro(g, r, a, x + 8, y + 68, 504, 84, cor);
    gasta(g, r, x, y, 520, 132, 60); } }));
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
// Decalques colados à parede (1 cm), sem colisão. Cada lugar é conferido com raios a cada 12 cm de altura e 22 cm
// de largura, com 4 cm de folga: cinta, viga ou pilar no caminho recusa o lugar. Na faixa do corpo só entra xarpi.
export function pichacoes(scene, mundo, U, evita = [], janelas = []) {
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
    const fila = []; for (const it of itens) { if (it.cat === 'esc' || it.cat === 'graf') continue; fila.push(it); if (it.cat !== 'estencil') fila.push(it); }
    for (let i = fila.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [fila[i], fila[j]] = [fila[j], fila[i]]; }
    const postas = [], perto = (f, d) => postas.some((p) => Math.hypot(p.x - f.x, p.z - f.z) < d && Math.abs(p.b - f.b) < 1);
    // Grafite grande primeiro, em parede alta (acima de 2,1 m), antes que o resto ocupe o lugar.
    for (const it of itens.filter((q) => q.cat === 'graf')) achou: for (const f of faces) { if (f.teto < f.b + 4 || perto(f, 4)) continue;
      for (const esc of [1, .8, .62]) { const w = (3.0 + r() * .5) * esc, h = w * it.h / it.w;
        for (const y0 of [f.b + 2.15, f.b + 3.35, f.teto - .2 - h]) if (y0 >= f.b + 2.1 && y0 + h < f.teto - .1 && cola(it, f.x, y0 + h / 2, f.z, f.nx, f.nz, w, h, 2)) { postas.push(f); break achou; } } }
    for (const f of faces) { if (!fila.length || info.n >= 84) break;
      if (perto(f, 1.9)) continue;
      feito: for (let k = 0; k < Math.min(4, fila.length); k++) for (const esc of f.centro < 2 ? [1, .78, .6] : [1, .7]) { const it = fila[k], m = MEDIDAS[it.cat], asp = it.w / it.h; let w, h; const ys = [];
        if (it.cat === 'reto') { h = (1.0 + r() * .4) * esc; w = h * asp; ys.push(f.teto - .22 - h / 2, f.teto - .75 - h / 2); if (f.b < 1) ys.push(2.92 - h / 2); }
        else { w = (m[0] + r() * (m[1] - m[0])) * esc; h = w / asp; ys.push(m[2] ? f.b + m[2] + r() * (m[3] - m[2]) : f.b + 2.15 + r() * .3 + h / 2); }
        for (const yc of ys) { if (yc + h / 2 > f.teto - .1 || yc - h / 2 < f.b + (it.cat === 'xarpi' ? .9 : 1.95)) continue;
          if (!cola(it, f.x, yc, f.z, f.nx, f.nz, w, h, CHEIA.has(it.cat) ? 2 : .92 + r() * .08)) continue;
          fila.splice(k, 1); postas.push(f);
          // Pixo reto anda em fileira: tenta mais dois nomes na mesma altura, lado a lado.
          if (it.cat === 'reto') { let lado = w / 2; for (let q = 0; q < 2; q++) { const j = fila.findIndex((o) => o.cat === 'reto'); if (j < 0) break; const o = fila[j], w2 = h * o.w / o.h, s = lado + .14 + w2 / 2;
            if (!cola(o, f.x - f.nz * s, yc, f.z + f.nx * s, f.nx, f.nz, w2, h, .92 + r() * .08)) break; fila.splice(j, 1); lado = s + w2 / 2; } }
          break feito; } } }
    // Escorrido sob o peitoril: tenta os dois lados do vão, o raio só acha parede pelo lado de fora.
    const esc = itens.find((it) => it.cat === 'esc'); info.escorridos = 0;
    if (esc) for (const j of janelas) for (const sn of [1, -1]) { const nx = j.eixo === 0 ? sn : 0, nz = j.eixo === 0 ? 0 : sn;
      if (cola(esc, j.x, j.y - j.h / 2 - .36, j.z, nx, nz, j.w * .9, .4, .6)) { info.escorridos++; info.n--; info.usados.pop(); break; } }
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
