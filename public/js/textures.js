// Procedural canvas textures — zero external assets.
import * as THREE from 'three';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

/* Anisotropia 8 (4 em `q=low`): sem ela o chão visto em ângulo rasteiro vira papa.
   Espelho dos tetos: tools/eval/texel-tetos.mjs (ANISO_ALVO/ANISO_MIN); kill-switch `?texel=0`. */
const _texQS = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
const TEXEL_ON = _texQS.get('texel') !== '0';
const ANISO_TEX = !TEXEL_ON ? 1 : (_texQS.get('q') === 'low' ? 4 : 8);

function tex(c, repeat = 1, ry = null) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  /* NearestFilter fica: decisão travada de direção de arte (look pixel CS 1.6);
     trocar por Linear mudaria o look do jogo inteiro. */
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = ANISO_TEX;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, ry === null ? repeat : ry);
  return t;
}

/* TILE PURO: declara que a textura não tem desenho (só ruído/mancha), então o vao.js
   pode recortar a UV além da guarda MIN_TILES. Contexto: texel-check TEXEL3b, BAR-CONSISTENCIA §3.1. */
function puro(t) {
  if (Array.isArray(t)) { t.forEach(puro); return t; }
  if (t) t.userData.tilePuro = true;
  return t;
}

/* CHÃO é PlaneGeometry com UV 0→1 criada em cada map_*.js: a única alavanca dos 10
   mapas é o `repeat` daqui (caixas têm densidade via aoBoxGeo no vao.js). Banda: BAR §1.8. */
const CHAO_PX = 512;

/* DETALHE DE SUPERFÍCIE: normalMap (Sobel do albedo) e roughnessMap derivados do MESMO
   canvas, cacheados em WeakMaps por textura. Quem cria material chama detailFor(t) — ver `lam()` no map.js. */
const NORMALS = new WeakMap();
const ROUGHS = new WeakMap();
// indexado pelo `source` da textura (o que o `clone()` compartilha) — ver detailFor
const BY_SOURCE = new WeakMap();
const MAX_DETAIL = 512;

function normalFromCanvas(src, strength) {
  const w = Math.min(src.width, MAX_DETAIL), h = Math.min(src.height, MAX_DETAIL);
  const tmp = canvas(w, h); const tctx = tmp.getContext('2d');
  tctx.drawImage(src, 0, 0, w, h);
  const s = tctx.getImageData(0, 0, w, h).data;
  const out = canvas(w, h), octx = out.getContext('2d');
  const img = octx.createImageData(w, h), d = img.data;
  const L = (x, y) => { x = (x + w) % w; y = (y + h) % h; const i = (y * w + x) * 4; return (s[i] * 0.299 + s[i + 1] * 0.587 + s[i + 2] * 0.114) / 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (L(x + 1, y) - L(x - 1, y)) * strength;
    const dy = (L(x, y + 1) - L(x, y - 1)) * strength;
    const nx = -dx, ny = dy, nz = 1, l = Math.sqrt(nx * nx + ny * ny + 1);
    const i = (y * w + x) * 4;
    d[i] = (nx / l * 0.5 + 0.5) * 255; d[i + 1] = (ny / l * 0.5 + 0.5) * 255; d[i + 2] = (nz / l * 0.5 + 0.5) * 255; d[i + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  return out;
}
function roughFromCanvas(src, lo, hi) {
  const w = Math.min(src.width, MAX_DETAIL), h = Math.min(src.height, MAX_DETAIL);
  const tmp = canvas(w, h), tctx = tmp.getContext('2d');
  tctx.drawImage(src, 0, 0, w, h);
  const im = tctx.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    const r = (hi + (lo - hi) * lum) * 255;   // claro = menos áspero (mais lustro)
    d[i] = d[i + 1] = d[i + 2] = r; d[i + 3] = 255;
  }
  tctx.putImageData(im, 0, 0);
  return tmp;
}
// registra normal+roughness derivados do canvas de albedo, com o MESMO repeat da base
let _detailOn = null;
function withDetail(t, src, strength = 2.2, lo = 0.55, hi = 0.98) {
  // kill-switch ?detail=0: gerar normal+roughness custa ~100 ms de boot (Sobel em JS).
  // Em quality 'low' também pula — GPU fraca não paga 2 samplers extras por material.
  if (_detailOn === null) {
    let q = 'med';
    try { q = JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality || 'med'; } catch (e) { /* noop */ }
    _detailOn = new URLSearchParams(location.search).get('detail') !== '0' && q !== 'low';
  }
  if (!_detailOn) return t;
  try {
    const mk = (c) => {
      const n = new THREE.CanvasTexture(c);
      n.colorSpace = THREE.NoColorSpace;
      n.wrapS = n.wrapT = t.wrapS; n.repeat.copy(t.repeat);
      n.minFilter = THREE.LinearMipmapLinearFilter; n.magFilter = THREE.LinearFilter;
      return n;
    };
    const n = mk(normalFromCanvas(src, strength)), r = mk(roughFromCanvas(src, lo, hi));
    NORMALS.set(t, n); ROUGHS.set(t, r);
    // ...e também pela FONTE, para os clones (ver detailFor). O `source` é o objeto que o
    // three usa como identidade de imagem na GPU, e é o que `Texture.clone()` compartilha.
    BY_SOURCE.set(t.source, { normalMap: n, roughnessMap: r });
  } catch (e) { /* canvas tainted / sem 2d: segue sem detalhe */ }
  return t;
}
/* REGISTRO DE DETALHE PARA TEXTURAS DE FORA DESTE ARQUIVO.
   MEDIDO (tools/eval/mat-check.mjs, varrendo os 5 mapas reais): 877 materiais, e só o
   praca_old (map.js:20-28) tinha normal+roughness — 70 e 70. Os outros quatro tinham ZERO,
   e ligar o `detailFor` no `lam()` deles não resolvia: as texturas deles não passam por
   AQUI, são canvas LOCAIS de cada map_*.js (muroTex, acmTex, noiseTex...), então não estão
   nos WeakMaps e o `detailFor` devolvia null para 100% delas (medido: praca_poderes 41 materiais
   com map e 0 candidatos, loja_h 47 e 0).
   Ou seja o caminho certo existia mas terminava numa parede. Esta função é a porta: quem
   gera um canvas fora daqui registra o par normal+roughness derivado dele e passa a ser
   atendido pelo MESMO `detailFor`. Um caminho só, um kill-switch só (?detail=0), um gate de
   qualidade só ('low' pula) — que é o ponto: máquina fraca não paga por isto em lugar
   nenhum, e não em quatro lugares diferentes que alguém tem que lembrar de sincronizar. */
export function registerDetail(t, canvas, strength = 2.2, lo = 0.55, hi = 0.98) {
  return withDetail(t, canvas, strength, lo, hi);
}

/* DETALHE PARA CLONES DE TEXTURA — sem isto, metade do ganho não acontecia.
   Os mapas seguem a regra "UM canvas por imagem; variação de escala vem de `clone()`"
   (map_havan.js:341), então a MAIORIA dos materiais recebe um CLONE da textura registrada,
   com outro `repeat`. O WeakMap é indexado pela textura, e o clone é outro objeto: medido,
   o loja_h ficou com 5 normalMaps de 47 materiais com albedo — o resto caía aqui e saía
   null. A busca por `source` fecha esse buraco.
   E o clone do DERIVADO não é opcional: o normal/roughness precisa do MESMO `repeat` do
   albedo, senão o relevo tila numa escala diferente da textura e fica pior do que não ter.
   `Texture.clone()` compartilha `source`, então é ZERO upload novo pra GPU — o custo é um
   objeto JS e um binding de sampler, e ele é pago UMA vez por textura (fica cacheado nos
   mesmos WeakMaps). */
export function detailFor(t) {
  if (!t) return null;
  /* Alavanca comum dos 10 mapas: texturas nascidas fora de `tex()` (4 mapas montam
     canvas próprio) também ganham anisotropia aqui. Só sobe quem está no default (1). */
  if (TEXEL_ON && t.anisotropy <= 1) t.anisotropy = ANISO_TEX;
  let n = NORMALS.get(t), r = ROUGHS.get(t);
  if (!n && !r && t.source && BY_SOURCE.has(t.source)) {
    const d = BY_SOURCE.get(t.source);
    const mk = (x) => {
      if (!x) return null;
      const c = x.clone();
      c.wrapS = t.wrapS; c.wrapT = t.wrapT; c.repeat.copy(t.repeat); c.offset.copy(t.offset);
      c.needsUpdate = true;
      return c;
    };
    n = mk(d.normalMap); r = mk(d.roughnessMap);
    NORMALS.set(t, n); ROUGHS.set(t, r);
  }
  return (n || r) ? { normalMap: n || null, roughnessMap: r || null } : null;
}

/* Contact AO por vértice — o AO "quase de graça" que o crítico pediu (§2 GAP 2.1).
   Escurece os vértices perto da base do objeto: a junção parede/chão deixa de ser uma
   aresta com salto de luminância ZERO. Funciona até em quality 'low' (não depende do
   SSAO do composer) e custa zero draw call / zero memória de textura.
   `baseLocalY` = y local do "chão" do objeto (para BoxGeometry centrada, -h/2). */
export function applyContactAO(geom, baseLocalY, reach = 0.45, floor = 0.62) {
  const pos = geom.attributes.position;
  if (!pos) return geom;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const dy = pos.getY(i) - baseLocalY;
    let k = dy <= 0 ? floor : floor + (1 - floor) * Math.min(1, dy / reach);
    k = Math.min(1, Math.max(floor, k));
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geom;
}

function noiseOver(ctx, w, h, alpha, colors) {
  for (let i = 0; i < w * h / 14; i++) {
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.globalAlpha = Math.random() * alpha;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  ctx.globalAlpha = 1;
}
// manchas GRANDES (metade a um terço do tile): variação de macro-escala. Sem ela o olho
// lê a repetição do tile como padrão; com ela cada repetição parece um trecho diferente.
function macro(ctx, w, h, n, cols) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = w * (0.25 + Math.random() * 0.35);
    const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    const c = cols[(Math.random() * cols.length) | 0];
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}
function stains(ctx, w, h, n, col) {
  for (let i = 0; i < n; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 12 + Math.random() * 42;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export const GRAFFITI = [
  'É TRETA!', 'PASTEL > TUDO', 'CAPIVARA LIVRE', 'ABAXO O IMPOSTO DO PASTEL',
  'ZÉ CAPIVARA 99', 'FEIJOADA SUPREMA', 'TRETA 4 EVER', 'VOTE NINGUÉM',
  'SNIPER SEM CAUSA', 'O MURO É FAKE NEWS', 'BORA PRO CLÁSSICO', 'MIOJO 3 ESTRELAS'
];
const GCOLORS = ['#ff3b3b', '#ffd23f', '#3bd1ff', '#ff7ad9', '#7dff9a', '#ff8a3b'];

/* ============================================================================
   PIXAÇÃO PAULISTANA — alfabeto PROCEDURAL (pedido do dono, 04/08)
   ----------------------------------------------------------------------------
   POR QUE DESENHADO E NÃO BAIXADO
   O pedido foi "pesquisar na internet e baixar". Não dá, e o motivo é o mesmo que já
   apareceu no `soundtrack/`: foto de muro tem dois donos — o fotógrafo (direito de imagem
   da foto) e o pixador (a assinatura é a obra dele, e no Brasil pixação tem autoria
   reconhecida). Num jogo AGPL, monetizado e indo pra portal, baixar isso é o mesmo risco
   das faixas do Sepultura, com o agravante de o repo ser público.

   Desenhar é melhor por dois motivos, não só por licença:
     · o traço vira NOSSO, e vem em variação infinita (semente por parede, sem repetir);
     · fica mais FIEL. Foto de muro traz perspectiva, sombra e reboco de outro lugar
       coladas junto; o que a gente quer é a LETRA.

   O QUE DEFINE A LETRA DE SP (e por que o T.graffiti que já existia não é pixação)
   O `T.graffiti` daqui usa Arial Black — isso é grafite genérico de jogo. Pixação paulistana
   é outra coisa, e é um tipo reconhecível:
     · deriva de logotipo de banda de rock/metal dos anos 80, não de bolha nova-iorquina;
     · letra ALTA E ESTREITA (aqui: 2,4× mais alta que larga), traço reto de espessura
       constante, quase sem curva;
     · haste vertical dominante, barra horizontal curta, corte na diagonal;
     · ganchos que viram pra DENTRO em ângulo agudo;
     · monocromática (rolo preto ou branco), pichada de baixo pra cima e apertada, sem
       espaço entre letras.
   O alfabeto abaixo é isso em polilinhas normalizadas [0..1]²: cada glifo é uma lista de
   traços, e o desenho é `stroke` com ponta reta. Sem fonte externa, sem download. */
const PIXO_GLYPHS = {
  A: [[[0, 1], [.5, 0], [1, 1]], [[.2, .62], [.8, .62]]],
  B: [[[0, 0], [0, 1]], [[0, 0], [.85, .12], [.85, .38], [0, .5]], [[0, .5], [.9, .62], [.9, .88], [0, 1]]],
  C: [[[1, 0], [.2, 0], [0, .22], [0, 1], [1, 1]]],
  D: [[[0, 0], [0, 1]], [[0, 0], [.9, .2], [.9, .8], [0, 1]]],
  E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, .5], [.7, .5]]],
  F: [[[1, 0], [0, 0], [0, 1]], [[0, .5], [.7, .5]]],
  G: [[[1, 0], [.2, 0], [0, .22], [0, 1], [1, 1], [1, .52], [.45, .52]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, .5], [1, .5]]],
  I: [[[.5, 0], [.5, 1]], [[.1, 0], [.9, 0]], [[.1, 1], [.9, 1]]],
  J: [[[1, 0], [1, .82], [.55, 1], [.05, .82], [.05, .66]]],
  K: [[[0, 0], [0, 1]], [[1, 0], [0, .5], [1, 1]]],
  L: [[[0, 0], [0, 1], [1, 1]]],
  M: [[[0, 1], [0, 0], [.5, .55], [1, 0], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  O: [[[.25, 0], [1, 0], [1, .75], [.75, 1], [0, 1], [0, .25], [.25, 0]]],
  P: [[[0, 1], [0, 0], [.9, .15], [.9, .45], [0, .58]]],
  Q: [[[.25, 0], [1, 0], [1, .75], [.75, 1], [0, 1], [0, .25], [.25, 0]], [[.55, .62], [1, 1]]],
  R: [[[0, 1], [0, 0], [.9, .15], [.9, .45], [0, .58]], [[.35, .58], [1, 1]]],
  S: [[[1, .05], [0, .05], [0, .42], [1, .55], [1, .95], [0, .95]]],
  T: [[[0, 0], [1, 0]], [[.5, 0], [.5, 1]]],
  U: [[[0, 0], [0, .78], [.2, 1], [.8, 1], [1, .78], [1, 0]]],
  V: [[[0, 0], [.5, 1], [1, 0]]],
  X: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]],
  Y: [[[0, 0], [.5, .5], [1, 0]], [[.5, .5], [.5, 1]]],
  Z: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
  '2': [[[0, .15], [.5, 0], [1, .2], [0, 1], [1, 1]]],
  '3': [[[0, .05], [.9, .1], [.3, .5], [.9, .6], [0, .95]]],
  '5': [[[1, 0], [0, 0], [0, .45], [.85, .5], [1, .75], [.75, .97], [0, .9]]],
  '7': [[[0, 0], [1, 0], [.35, 1]]],
  '9': [[[.9, .55], [.1, .5], [0, .25], [.15, .05], [.85, .08], [.95, .3], [.6, 1]]],
  ' ': [],
};
/* Frases curtas, no registro do jogo. Pixo real é assinatura de grupo — inventar as nossas
   evita colar a marca de alguém numa parede que a gente monetiza. */
const PIXO_WORDS = ['CORO SOLTO', 'TRETA', 'ZONA LESTE', 'CAPIVARA', 'PIXELANDIA',
  'BONDE DO PASTEL', 'SP 011', 'FIM DE FEIRA', 'GERAL NA ATIVA', 'VAI TER TRETA'];

/* Desenha uma pichação numa faixa da parede. `seed` faz cada parede ser diferente e
   REPRODUTÍVEL (mesmo mapa, mesmo muro, mesmo pixo — nada de tremer entre recargas). */
function pixoLine(x, texto, x0, y0, alturaLetra, cor = '#111', seed = 1) {
  const rnd = (() => { let s = seed * 9301 + 49297; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
  const larg = alturaLetra / 3.1;          // a proporção alta-e-estreita é a assinatura do estilo
  const passo = larg * 1.02;               // letras APERTADAS, quase encostando (traço grosso já fecha o vão)
  x.save();
  x.strokeStyle = cor;
  x.lineWidth = Math.max(2, alturaLetra * 0.085);
  x.lineCap = 'butt'; x.lineJoin = 'miter'; x.miterLimit = 8;
  let cx = x0;
  for (const ch of texto.toUpperCase()) {
    const g = PIXO_GLYPHS[ch];
    if (!g) { cx += passo * 0.55; continue; }   // espaço curto: pixo aperta palavra também
    const lean = (rnd() - 0.5) * 0.10;     // cada letra torta pro seu lado: mão humana, não fonte
    const jy = (rnd() - 0.5) * alturaLetra * 0.06;
    for (const traco of g) {
      x.beginPath();
      traco.forEach(([px, py], i) => {
        const gx = cx + (px + lean * (1 - py)) * larg, gy = y0 + jy + py * alturaLetra;
        if (i === 0) x.moveTo(gx, gy); else x.lineTo(gx, gy);
      });
      x.stroke();
    }
    cx += passo;
  }
  x.restore();
  return cx - x0;   // largura ocupada, pra quem quiser encadear
}

function concreteBase(w = 256, h = 256, base = '#9a938a', dark = '#7d766d') {
  const c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  noiseOver(x, w, h, 0.25, [dark, '#aaa398', '#8a847c']);
  stains(x, w, h, 5, 'rgba(60,50,40,0.20)');
  // cracks
  x.strokeStyle = 'rgba(50,45,40,0.5)'; x.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    x.beginPath(); let px = Math.random() * w, py = Math.random() * h; x.moveTo(px, py);
    for (let s = 0; s < 5; s++) { px += (Math.random() - .5) * 46; py += Math.random() * 26; x.lineTo(px, py); }
    x.stroke();
  }
  return c;
}

/* R3 — DESSATURAÇÃO DE ALBEDO (critério C2 da RÉGUA: cenário em S 0,10-0,30 e no máximo
   5 % dos pixels acima de S 0,55, com esses 5 % reservados a elemento FUNCIONAL).
   O que estava errado: as texturas de TERRA e MATO nasciam com S 0,48-0,54 no albedo.
   Como todo mapa tem sol quente, croma de albedo MULTIPLICA croma de luz e a superfície
   mais extensa do frame saía acima de 0,55 sozinha — com o teto estourado pelo chão, a
   bandeira de captura e a placa vermelha param de significar alguma coisa.
   Kill-switch: ?texsat=1 volta os albedos quentes anteriores. Custo zero (é hex): não há
   nada a degradar em quality 'low'. */
const TEX_SAT_HOT = new URLSearchParams(location.search).get('texsat') === '1';

export function initTextures() {
  const T = {};

  // --- ground / structure ---
  const gc = concreteBase(1024, 1024, '#a89e90', '#8d8375');
  { const x = gc.getContext('2d');
    stains(x, 1024, 1024, 22, TEX_SAT_HOT ? 'rgba(120,80,40,0.16)' : 'rgba(120,102,84,0.16)');   // poeira (R3: S 0,67 → 0,30)
    stains(x, 1024, 1024, 8, 'rgba(35,33,30,0.22)');              // oil stains
    x.strokeStyle = 'rgba(60,55,48,0.5)'; x.lineWidth = 3;        // expansion joints
    for (let i = 0; i <= 4; i++) {
      x.beginPath(); x.moveTo(i * 256, 0); x.lineTo(i * 256, 1024); x.stroke();
      x.beginPath(); x.moveTo(0, i * 256); x.lineTo(1024, i * 256); x.stroke();
    }
    x.strokeStyle = 'rgba(40,38,36,0.13)'; x.lineWidth = 24;      // tire tracks
    x.beginPath(); x.moveTo(120, -20); x.bezierCurveTo(340, 300, 180, 700, 520, 1050); x.stroke();
    x.beginPath(); x.moveTo(760, -20); x.bezierCurveTo(620, 380, 880, 640, 700, 1050); x.stroke();
    // macro: nuvens grandes de sujeira/desbotado quebrando a leitura do tile (10 repetições
    // do mesmo 1024 num piso de 180 m liam como xadrez)
    macro(x, 1024, 1024, 7, ['rgba(120,110,95,0.20)', 'rgba(70,64,56,0.16)', 'rgba(150,142,128,0.14)']);
  }
  T.ground = puro(withDetail(tex(gc, 10, 10), gc, 2.6, 0.60, 0.98));

  /* T.concrete FICA em 256²: a família se espalha de 28 a 314 px/m (campomorro sem aoBoxGeo,
     escadão a 7,3), e nenhum K global cabe na banda 64-512 da BAR §1.8 — conserto é por superfície no map_*.js. */
  { const c = concreteBase(); T.concrete = puro(withDetail(tex(c, 1, 1), c, 2.4, 0.58, 0.97)); }
  { /* T.concreteDark SOBE para 512²: o piso de 36×240 m do praca_poderes (76% da área abaixo
       do piso do mapa) só é alcançado pelo canvas; 1024 jogaria a piscina acima do teto 512 — ver texel-custo.mjs. */
    /* Gated pelo TEXEL_ON: `?texel=0` tem que devolver o comportamento antigo INTEIRO,
       senão o A/B mede meia mudança. (Dívida não consertada: CHAO_PX não é gated.) */
    const CD_PX = TEXEL_ON ? 512 : 256;
    const c = concreteBase(CD_PX, CD_PX, '#6f6a62', '#57534c');
    T.concreteDark = puro(withDetail(tex(c, 1, 1), c, 2.4, 0.60, 0.98));
  }

  { /* asphalt — CHÃO: canvas 512² e repeat 4. Dobrar o canvas basta para trazer as 8
       extensões medidas (14-127 m) para dentro da banda 64-512 px/m da BAR §1.8. */
    const P = CHAO_PX;
    const c = canvas(P, P), x = c.getContext('2d');
    x.fillStyle = '#5c5a58'; x.fillRect(0, 0, P, P);
    noiseOver(x, P, P, 0.3, ['#4c4a48', '#6b6967', '#413f3d']);
    // 2ª oitava fina: o asfalto tinha sd de luminância ~1.7 (alvo do crítico: > 2 em
    // qualquer região que ocupe > 5 % do frame)
    noiseOver(x, P, P, 0.18, ['#6f6d6b', '#3a3836']);
    stains(x, P, P, 4, 'rgba(30,28,26,0.3)');
    macro(x, P, P, 5, ['rgba(150,148,146,0.13)', 'rgba(25,24,23,0.16)']);
    T.asphalt = puro(withDetail(tex(c, 4, 4), c, 2.0, 0.66, 0.99));
  }
  { /* dirt (MST camp) — R3: base #8a6b48 tinha S 0,478. Terra é a superfície mais EXTENSA
       onde ela aparece, e croma de albedo multiplica croma de luz (todos os mapas têm sol
       quente): 0,478 no albedo vira 0,65+ na tela e sozinha estoura o teto de 5 % de C2.
       Alvo do gabarito para textura base de terra/areia/asfalto: S 0,20-0,30. Aqui: 0,26,
       matiz 31° intacto — é o hue que diz "terra brasileira", não a saturação. */
    /* CHÃO: canvas 512² e repeat 17 põem as 5 extensões medidas (28-94 m) na banda 64-512 da BAR §1.8.
       17 É TETO: subir acende a dispersão de 1,5× do escadão/campomorro (BAR-CONSISTENCIA §3.1). */
    const P = CHAO_PX;
    const c = canvas(P, P), x = c.getContext('2d');
    x.fillStyle = TEX_SAT_HOT ? '#8a6b48' : '#8a7866'; x.fillRect(0, 0, P, P);
    noiseOver(x, P, P, 0.35, TEX_SAT_HOT ? ['#75583a', '#9c7d56', '#63482e'] : ['#756654', '#9c8e7c', '#63584a']);
    macro(x, P, P, 5, TEX_SAT_HOT ? ['rgba(60,44,26,0.22)', 'rgba(170,140,100,0.16)'] : ['rgba(60,50,38,0.22)', 'rgba(170,152,128,0.16)']);
    T.dirt = puro(withDetail(tex(c, TEXEL_ON ? 17 : 3, TEXEL_ON ? 17 : 3), c, 3.0, 0.80, 1.0));
  }
  { /* grass patches — R3: base #5f7d3a tinha S 0,536. Mato é o único verde do cenário e
       precisa contrastar com a terra, mas esse contraste vem do MATIZ (85° contra 31°),
       não do croma. S 0,32: fica acima do teto de terra (é vegetação viva) e ainda assim
       longe de 0,55, que fica reservado a bandeira/placa/barril/cone. */
    /* CHÃO: canvas 512² e repeat 30, mirados no gramado de 158 m (25 000 dos 29 700 m² do
       jogo): ele fica a 97 px/m e os canteiros (31-38 m) cabem abaixo do teto de 512. */
    const P = CHAO_PX;
    const c = canvas(P, P), x = c.getContext('2d');
    x.fillStyle = TEX_SAT_HOT ? '#5f7d3a' : '#677d55'; x.fillRect(0, 0, P, P);
    noiseOver(x, P, P, 0.4, TEX_SAT_HOT ? ['#4c682e', '#73924a', '#87a355'] : ['#556848', '#7b9265', '#8ea37a']);
    macro(x, P, P, 4, TEX_SAT_HOT ? ['rgba(40,58,24,0.24)', 'rgba(140,160,90,0.14)'] : ['rgba(46,58,38,0.24)', 'rgba(148,160,124,0.14)']);
    T.grass = puro(withDetail(tex(c, TEXEL_ON ? 30 : 2, TEXEL_ON ? 30 : 2), c, 2.4, 0.80, 1.0));
  }
  { // Caixa dos Correios (SEDEX) — papelão com a faixa amarela e o "C" azul
    const correiosBox = (label, sub) => {
      const c = canvas(128, 128), x = c.getContext('2d');
      x.fillStyle = '#b9905a'; x.fillRect(0, 0, 128, 128);
      noiseOver(x, 128, 128, 0.25, ['#a37c48', '#c69e68', '#8f6f3f']);
      // fita amarela dos Correios atravessando
      x.fillStyle = '#ffcd00'; x.fillRect(0, 44, 128, 40);
      // "C" azul estilizado (arco) + seta
      x.strokeStyle = '#00416b'; x.lineWidth = 9; x.lineCap = 'round';
      x.beginPath(); x.arc(30, 64, 13, Math.PI * 0.35, Math.PI * 1.65); x.stroke();
      x.fillStyle = '#00416b';
      x.beginPath(); x.moveTo(44, 64); x.lineTo(56, 56); x.lineTo(56, 72); x.closePath(); x.fill();
      x.font = 'bold 16px Arial Black,sans-serif'; x.textAlign = 'left';
      x.fillText(label, 56, 72);
      x.font = 'bold 10px Arial,sans-serif'; x.fillStyle = 'rgba(30,20,8,0.75)'; x.textAlign = 'center';
      x.fillText(sub, 64, 22);
      x.strokeStyle = 'rgba(90,60,25,0.5)'; x.lineWidth = 3; x.strokeRect(3, 3, 122, 122);
      stains(x, 128, 128, 2, 'rgba(0,0,0,0.18)');
      return tex(c);
    };
    T.crate = correiosBox('SEDEX', 'ENCOMENDA · ENTREGA RÁPIDA');
    T.crate2 = correiosBox('CORREIOS', 'SEDEX 10 · CUIDADO COM A TRETA');
  }

  /* --- PIXAÇÃO: 4 faixas transparentes pra colar em qualquer parede ---------------
     Textura com fundo TRANSPARENTE de propósito: vai como plano por cima do muro que já
     existe, então serve pro azulejo do Piscinão e pra chapa do Ferro Velho sem precisar de
     variante de material por mapa. Preto de rolo é o padrão (é o que se vê em SP); a
     variante 3 é branca, pra parede escura. */
  T.pixo = [0, 1, 2, 3].map(v => {
    const W = 512, H = 128;
    const c = canvas(W, H), x = c.getContext('2d');
    const cor = v === 3 ? 'rgba(238,238,238,0.92)' : 'rgba(17,17,17,0.9)';
    // 1-2 frases por faixa, alturas diferentes: pixo real não vem alinhado
    const n = 1 + (v % 2);
    for (let i = 0; i < n; i++) {
      const palavra = PIXO_WORDS[(v * 3 + i * 5) % PIXO_WORDS.length];
      const alt = H * (0.5 - i * 0.12);
      pixoLine(x, palavra, 12 + i * 40, H * 0.18 + i * H * 0.34, alt, cor, v * 17 + i * 7 + 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  });

  // --- graffiti walls (3 variants) ---
  T.graffiti = [0, 1, 2].map(v => {
    const c = concreteBase(512, 256, '#8f8880', '#76706a'), x = c.getContext('2d');
    // grime at the base
    const gr = x.createLinearGradient(0, 170, 0, 256);
    gr.addColorStop(0, 'rgba(40,32,22,0)'); gr.addColorStop(1, 'rgba(40,32,22,0.45)');
    x.fillStyle = gr; x.fillRect(0, 170, 512, 86);
    // faded old posters
    for (let i = 0; i < 3; i++) {
      x.fillStyle = ['#c8bfae', '#b8c0c8', '#cfc4b8'][i]; x.globalAlpha = 0.7;
      x.fillRect(30 + i * 160 + Math.random() * 20, 30 + Math.random() * 30, 90, 120); x.globalAlpha = 1;
    }
    const used = [...GRAFFITI].sort(() => Math.random() - .5).slice(0, 4);
    used.forEach((s, i) => {
      x.save();
      x.translate(60 + i * 120, 60 + (i % 2) * 90 + Math.random() * 20);
      x.rotate((Math.random() - .5) * .3);
      x.font = `bold ${26 + (i % 2) * 10}px Arial Black,Impact,sans-serif`;
      x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,0.85)';
      x.strokeText(s, 0, 0);
      x.fillStyle = GCOLORS[(v * 3 + i) % GCOLORS.length];
      x.fillText(s, 0, 0);
      x.restore();
    });
    // spray tags
    for (let i = 0; i < 5; i++) {
      x.strokeStyle = GCOLORS[(Math.random() * GCOLORS.length) | 0]; x.lineWidth = 3; x.globalAlpha = .8;
      x.beginPath(); const px = Math.random() * 480, py = 170 + Math.random() * 70;
      x.moveTo(px, py); x.bezierCurveTo(px + 30, py - 25, px + 50, py + 25, px + 80, py - 10); x.stroke();
    }
    x.globalAlpha = 1;
    // macro no muro: concreto pintado nunca é uniforme (chuva, sol, remendo)
    macro(x, 512, 256, 4, ['rgba(120,112,100,0.16)', 'rgba(55,50,44,0.16)']);
    const t = tex(c);
    return withDetail(t, c, 2.0, 0.62, 0.98);
  });

  // --- fictional campaign posters ---
  const poster = (bg, fg, lines, big) => {
    const c = canvas(128, 192), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 128, 192);
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.fillRect(10, 10, 108, 92);
    x.fillStyle = fg; x.beginPath(); x.arc(64, 52, 26, 0, 7); x.fill(); // fictional candidate "face" circle
    x.fillStyle = '#222'; x.fillRect(48, 84, 32, 6);
    x.textAlign = 'center'; x.fillStyle = fg;
    x.font = `bold ${big ? 22 : 16}px Arial Black,sans-serif`;
    lines.forEach((l, i) => x.fillText(l, 64, 128 + i * 22));
    stains(x, 128, 192, 2, 'rgba(0,0,0,0.15)');
    return tex(c);
  };
  T.posters = [
    poster('#c62f2f', '#fff', ['ZÉ', 'CAPIVARA', '99'], true),
    poster('#1faa4d', '#ffd23f', ['DONA', 'MARIA', '77'], true),
    poster('#2b4d8f', '#fff', ['CANDIDATO', 'FICTÍCIO', 'PROMETO NADA']),
  ];

  // --- poster art (public/posters): pool satírico; personagens e marcas protegidas não entram.
  // Dimensões/aspecto reproduzidos por `node tools/eval/poster-aspect-check.mjs --json`.
  const POSTER_FILES = [
    ['ashtar.png', 0.5625, 1.35],
    ['ashtar-meme.jpg', 0.98, 1.2],   // o MEME original — o dono mandou voltar ('estava bom tb')
    ['despisque-leao.jpg', 0.86, 1.2], // o par do meme (leão 'despisque') — voltou junto, pedido de 06/08
    ['DOLLYNHO.png', 0.5625], ['New Project (1).png', 0.5625],
    ['New Project (2).png', 0.5625], ['New Project (3).png', 0.5625],
    ['25c9112229edfcfbb1eae4137ecc151a.jpg', 0.6],
    ['26268061ca13b4dc4a871c1163cbeb6d.jpg', 1.0],
    ['3300c39038dd97ad6a20342038c008b0.jpg', 1.0],
    ['78c38b895431ac393f96036507060be1.jpg', 0.708],
    ['51edbafcf2eebbb2dc157f66bb1a2d66.jpg', 1.019],  // #79: era 0.72 (577×566, arte esticada)
    ['574381edb80801aaff5e9a1cdd88bc4b.jpg', 0.844],  // #79: era 0.72 (735×871)
    ['6f2bbbe03a6c5a16af15fe12ebea0d6c.jpg', 1.338],  // #79: era 0.72 (570×426, é paisagem)
    ['82f8dcbb0547719bfc4dbb27aed9f583.jpg', 0.72],
    ['8445c0ca193d22b4d6a9af66409b0dda.jpg', 0.851],  // #79: era 0.72 (681×800)
    ['dafac3c979a935aea80adb8b90f6ef1b.jpg', 0.72],
    ['dc58fe69ac56037026f1bf6181b7f71c.jpg', 0.667],  // #79: era 0.72 (736×1104)
    ['eabfe479653f0e9c94a618858e8667bc.jpg', 0.72],
    ['f0deec032dd1777bc681179fb74a29b0.jpg', 0.72],
    ['images.png', 0.695],  // #79: era 0.9 (187×269)
    // originais OpenRouter 07/08 (obra própria, versionados — ver bloco or-* dos decals)
    ['or-baile.jpg', 0.605], ['or-compro-ouro.jpg', 0.423],
    ['or-quebrada-vive.jpg', 0.522], ['or-show-funk.jpg', 0.644],
  ];
  const _tl = new THREE.TextureLoader();
  T.posterImgs = POSTER_FILES.map(([f]) => {
    const t = _tl.load('posters/' + f);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  });
  /* Nome do arquivo por índice — a passada de grafite guarda NOME no layout assado
     (índice desliza quando alguém mexe no POSTER_FILES, e aí o mapa cola outro
     cartaz sem erro nenhum; é a mesma lição do `decalFiles`). */
  T.posterFiles = POSTER_FILES.map(([f]) => f);
  T.posterAspects = POSTER_FILES.map(([, a]) => a);
  T.posterEscala = POSTER_FILES.map(([, , e]) => e || 1);   // multiplicador de altura por cartaz

  /* --- murais DEDICADOS (pedido do dono, 06/08) -----------------------------------
     Não entram no POSTER_FILES: não são cartaz de rotação, são peça com vaga fixa
     (becos da Quebrada, parede de armários do Piscinão) e tamanho grande (~2,3 × 4,2 m).
     Personagens FICTÍCIOS gerados por IA no espírito dos murais de muro da periferia —
     a regra editorial (LICENSE, /sobre) proíbe pessoa real, então o "Zoi de Gato" vira
     personagem original. O dono pode trocar o ARQUIVO mantendo o nome e a vaga segue.
     Aspecto medido: 1408×768 = 1,8333. */
  const _mural = (f) => {
    const t = _tl.load('posters/' + f);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    return t;
  };
  T.muralEternamente = _mural('mural-eternamente.jpg');  // "ETERNAMENTE EM NOSSOS CORAÇÕES"
  T.muralLesteVive = _mural('mural-leste-vive.jpg');     // "DA LESTE VIVE"
  // T.muralBilu = _mural('bilu.jpg');  // VHS do Bilu — esperando o arquivo do dono

  /* --- graffiti decals (public/img/decals) — elementos recortados com fundo
     transparente por `tools/gen-graffiti-decals.mjs` a partir de `references/graffiti/`.
     Mesmo formato dos cartazes: `T.decals[i]` é a textura e `T.decalAspects[i]` o w/h.

     DUAS DIFERENÇAS que importam pra quem for usar:
     1. CARREGAM SOB DEMANDA. São centenas de arquivos (folha de alfabeto vira 26
        recortes); pedir todos no boot seriam centenas de requisições por nada. Cada
        índice é um getter que só chama o loader na primeira leitura, então
        `T.decals[7]` funciona igual `T.posterImgs[7]` — mas NÃO faça spread nem
        `.map()` no array, que isso acorda o pacote inteiro.
     2. TÊM ALPHA. O material precisa de `transparent: true` (ou `alphaTest`), senão
        o fundo transparente vira retângulo preto na parede.

     `T.decalTipos[i]`  : 'alfabeto' | 'tag' | 'peca' | 'ilustracao' | 'cartaz'
     `T.decalClaro[i]`  : true = tinta clara (só legível em parede escura)
     `T.decalFiles[i]`  : nome do arquivo, pra depurar
     A lista abaixo é GERADA — edite o script, não ela.                              */
  /* DECALS:GERADO-INICIO */
  const DECAL_FILES = [
    ['alfabeto-bolha.png', 0.598, 'alfabeto', 1],
    ['alfabeto-bolha2.png', 0.555, 'alfabeto', 1],
    ['alfabeto-escuro-01.png', 1.643, 'alfabeto', 1],
    ['alfabeto-escuro-02.png', 1.361, 'alfabeto', 1],
    ['alfabeto-escuro-03.png', 1.806, 'alfabeto', 1],
    ['alfabeto-escuro-04.png', 1.6, 'alfabeto', 1],
    ['alfabeto-escuro-05.png', 1.4, 'alfabeto', 1],
    ['alfabeto-escuro-06.png', 0.897, 'alfabeto', 1],
    ['alfabeto-escuro-07.png', 0.69, 'alfabeto', 1],
    ['alfabeto-escuro-08.png', 1, 'alfabeto', 1],
    ['alfabeto-escuro-09.png', 1.549, 'alfabeto', 1],
    ['alfabeto-escuro-10.png', 1.429, 'alfabeto', 1],
    ['alfabeto-fino-01.png', 2.151, 'alfabeto', 0],
    ['alfabeto-fino-02.png', 0.6, 'alfabeto', 0],
    ['alfabeto-fino-03.png', 0.945, 'alfabeto', 0],
    ['alfabeto-fino-04.png', 0.644, 'alfabeto', 0],
    ['alfabeto-fino-05.png', 0.684, 'alfabeto', 0],
    ['alfabeto-fino-06.png', 0.6, 'alfabeto', 0],
    ['alfabeto-gotico-01.png', 0.595, 'alfabeto', 0],
    ['alfabeto-gotico-02.png', 0.676, 'alfabeto', 1],
    ['alfabeto-gotico-03.png', 0.649, 'alfabeto', 0],
    ['alfabeto-gotico-04.png', 0.564, 'alfabeto', 0],
    ['alfabeto-gotico-05.png', 0.763, 'alfabeto', 0],
    ['alfabeto-gotico-06.png', 0.632, 'alfabeto', 0],
    ['alfabeto-gotico-07.png', 0.579, 'alfabeto', 1],
    ['alfabeto-gotico-08.png', 0.676, 'alfabeto', 0],
    ['alfabeto-gotico-09.png', 0.789, 'alfabeto', 0],
    ['alfabeto-gotico-10.png', 1.4, 'alfabeto', 0],
    ['alfabeto-gotico-11.png', 0.629, 'alfabeto', 0],
    ['alfabeto-gotico-12.png', 0.629, 'alfabeto', 0],
    ['alfabeto-grosso-01.png', 1.07, 'alfabeto', 0],
    ['alfabeto-grosso-02.png', 2.119, 'alfabeto', 0],
    ['alfabeto-grosso-03.png', 3.348, 'alfabeto', 0],
    ['alfabeto-grosso-04.png', 3.956, 'alfabeto', 0],
    ['alfabeto-reto-01.png', 0.735, 'alfabeto', 0],
    ['alfabeto-reto-02.png', 0.706, 'alfabeto', 0],
    ['alfabeto-reto-03.png', 0.701, 'alfabeto', 0],
    ['alfabeto-reto-04.png', 0.647, 'alfabeto', 0],
    ['alfabeto-reto-05.png', 1.353, 'alfabeto', 0],
    ['alfabeto-reto-06.png', 0.667, 'alfabeto', 0],
    ['alfabeto-reto-07.png', 1.118, 'alfabeto', 0],
    ['alfabeto-reto-08.png', 0.676, 'alfabeto', 0],
    ['alfabeto-reto-09.png', 0.647, 'alfabeto', 0],
    ['alfabeto-reto-10.png', 0.735, 'alfabeto', 0],
    ['alfabeto-reto-11.png', 0.697, 'alfabeto', 0],
    ['bandeira-vira-lata.png', 0.967, 'ilustracao', 0],
    ['bola-amarela.png', 0.719, 'ilustracao', 1],
    ['caras-cartoon-01.png', 0.828, 'ilustracao', 0],
    ['caras-cartoon-02.png', 0.914, 'ilustracao', 0],
    ['caras-cartoon-03.png', 0.875, 'ilustracao', 0],
    ['caras-cartoon-04.png', 1.395, 'ilustracao', 0],
    ['caras-cartoon-05.png', 0.82, 'ilustracao', 0],
    ['caras-cartoon-06.png', 0.962, 'ilustracao', 0],
    ['caras-cartoon-07.png', 0.926, 'ilustracao', 0],
    ['caras-cartoon-08.png', 1.085, 'ilustracao', 0],
    ['caras-cartoon-09.png', 0.509, 'ilustracao', 0],
    ['caras-cartoon-10.png', 0.894, 'ilustracao', 0],
    ['caras-cartoon-11.png', 1.211, 'ilustracao', 1],
    ['caras-cartoon-12.png', 1.625, 'ilustracao', 0],
    ['caras-cartoon-13.png', 0.897, 'ilustracao', 0],
    ['caras-cartoon-14.png', 1.25, 'ilustracao', 0],
    ['caras-cartoon-15.png', 0.978, 'ilustracao', 0],
    ['caras-cartoon-16.png', 0.978, 'ilustracao', 1],
    ['caras-cartoon-17.png', 1.19, 'ilustracao', 0],
    ['caras-cartoon-18.png', 0.809, 'ilustracao', 0],
    ['caras-cartoon-19.png', 1.045, 'ilustracao', 1],
    ['caras-cartoon-20.png', 1.091, 'ilustracao', 0],
    ['caras-cartoon-21.png', 0.978, 'ilustracao', 1],
    ['caras-cartoon-22.png', 0.723, 'ilustracao', 0],
    ['caras-cartoon-23.png', 1.279, 'ilustracao', 0],
    ['caras-cartoon-24.png', 1.047, 'ilustracao', 0],
    ['caras-cartoon-25.png', 1.023, 'ilustracao', 0],
    ['caras-vintage-01.png', 0.832, 'ilustracao', 0],
    ['caras-vintage-02.png', 0.843, 'ilustracao', 0],
    ['caras-vintage-03.png', 1.019, 'ilustracao', 0],
    ['caras-vintage-04.png', 0.505, 'ilustracao', 0],
    ['caras-vintage-05.png', 0.322, 'ilustracao', 0],
    ['caras-vintage-06.png', 0.556, 'ilustracao', 0],
    ['caras-vintage-07.png', 1.036, 'ilustracao', 0],
    ['caras-vintage-08.png', 0.778, 'ilustracao', 0],
    ['caras-vintage-09.png', 1.154, 'ilustracao', 0],
    ['caras-vintage-10.png', 2.48, 'ilustracao', 0],
    ['caras-vintage-11.png', 0.606, 'ilustracao', 0],
    ['caras-vintage-12.png', 0.96, 'ilustracao', 0],
    ['caras-vintage-13.png', 1.133, 'ilustracao', 0],
    ['caras-vintage-14.png', 0.929, 'ilustracao', 0],
    ['caras-vintage-15.png', 0.855, 'ilustracao', 0],
    ['caras-vintage-16.png', 1.103, 'ilustracao', 0],
    ['cartaz-america-latina.png', 0.805, 'cartaz', 0],
    ['cartaz-medo.png', 0.703, 'cartaz', 1],
    ['cartaz-neutro.png', 0.762, 'cartaz', 0],
    ['coelho-rosa.png', 0.736, 'ilustracao', 1],
    ['dont-overthink.png', 0.637, 'cartaz', 1],
    ['folha-lambes.png', 1.753, 'peca', 0],
    ['folha-person-01.png', 1.011, 'peca', 0],
    ['folha-person-02.png', 0.785, 'peca', 0],
    ['folha-person-03.png', 0.898, 'peca', 0],
    ['folha-person-04.png', 1.033, 'peca', 1],
    ['folha-person-05.png', 0.878, 'peca', 0],
    ['folha-person-06.png', 1.196, 'peca', 0],
    ['folha-pixaca-01.png', 1.157, 'peca', 0],
    ['folha-pixaca-02.png', 1.216, 'peca', 0],
    ['folha-pixaca-03.png', 1.404, 'peca', 0],
    ['folha-pixaca-04.png', 1.396, 'peca', 0],
    ['folha-pixaca-05.png', 1.37, 'peca', 0],
    ['folha-pixaca-06.png', 1.463, 'peca', 0],
    ['folha-pixaca-07.png', 4, 'peca', 0],
    ['folha-pixaca-08.png', 1.442, 'peca', 0],
    ['folha-stenci.png', 1.875, 'peca', 0],
    ['folha-throwu-01.png', 1.86, 'peca', 1],
    ['folha-throwu-02.png', 1.86, 'peca', 0],
    ['folha-throwu-03.png', 1.889, 'peca', 0],
    ['folha-throwu-04.png', 1.828, 'peca', 0],
    ['folha-throwu-05.png', 1.821, 'peca', 0],
    ['folha-throwu-06.png', 1.893, 'peca', 0],
    ['gratidao-sol.png', 0.836, 'cartaz', 1],
    ['malabares-smiley.png', 0.652, 'ilustracao', 1],
    ['meio-ano.png', 0.828, 'cartaz', 0],
    ['olhos-bocas-01.png', 0.668, 'ilustracao', 0],
    ['olhos-bocas-02.png', 0.375, 'ilustracao', 1],
    ['olhos-bocas-03.png', 0.314, 'ilustracao', 0],
    ['olhos-bocas-04.png', 3.177, 'ilustracao', 0],
    ['olhos-bocas-05.png', 0.689, 'ilustracao', 1],
    ['olhos-bocas-06.png', 1.331, 'ilustracao', 1],
    ['olhos-bocas-07.png', 0.844, 'ilustracao', 0],
    ['olhos-bocas-08.png', 0.713, 'ilustracao', 0],
    ['olhos-bocas-09.png', 0.576, 'ilustracao', 0],
    ['olhos-bocas-10.png', 0.949, 'ilustracao', 0],
    ['olhos-bocas-11.png', 2.309, 'ilustracao', 0],
    ['olhos-bocas-12.png', 0.229, 'ilustracao', 0],
    ['olhos-bocas-13.png', 2.524, 'ilustracao', 0],
    ['olhos-bocas-14.png', 1.258, 'ilustracao', 1],
    ['olhos-bocas-15.png', 0.511, 'ilustracao', 0],
    ['olhos-bocas-16.png', 1.163, 'ilustracao', 0],
    ['olhos-bocas-17.png', 1.199, 'ilustracao', 1],
    ['olhos-bocas-18.png', 1, 'ilustracao', 1],
    ['olhos-bocas-19.png', 0.669, 'ilustracao', 0],
    ['olhos-bocas-20.png', 1.405, 'ilustracao', 0],
    ['olhos-bocas-21.png', 0.409, 'ilustracao', 1],
    ['olhos-bocas-22.png', 1.197, 'ilustracao', 0],
    ['olhos-bocas-23.png', 1.097, 'ilustracao', 0],
    ['olhos-bocas-24.png', 1.885, 'ilustracao', 1],
    ['olhos-bocas-25.png', 0.505, 'ilustracao', 0],
    ['olhos-bocas-26.png', 0.489, 'ilustracao', 1],
    ['olhos-bocas-27.png', 0.978, 'ilustracao', 0],
    ['olhos-bocas-28.png', 1.175, 'ilustracao', 1],
    ['olhos-cartoon-01.png', 1.403, 'ilustracao', 1],
    ['olhos-cartoon-02.png', 1.108, 'ilustracao', 1],
    ['olhos-cartoon-03.png', 2.053, 'ilustracao', 0],
    ['olhos-cartoon-04.png', 1.882, 'ilustracao', 0],
    ['olhos-cartoon-05.png', 1.722, 'ilustracao', 1],
    ['olhos-cartoon-06.png', 1.253, 'ilustracao', 1],
    ['olhos-cartoon-07.png', 1.213, 'ilustracao', 1],
    ['olhos-cartoon-08.png', 2, 'ilustracao', 0],
    ['olhos-cartoon-09.png', 2.2, 'ilustracao', 0],
    ['olhos-cartoon-10.png', 2.727, 'ilustracao', 0],
    ['olhos-cartoon-11.png', 2.256, 'ilustracao', 1],
    ['olhos-cartoon-12.png', 1.319, 'ilustracao', 1],
    ['olhos-cartoon-13.png', 1.823, 'ilustracao', 1],
    ['olhos-cartoon-14.png', 1.803, 'ilustracao', 1],
    ['olhos-cartoon-15.png', 1.472, 'ilustracao', 1],
    ['olhos-cartoon-16.png', 1.2, 'ilustracao', 1],
    ['olhos-cartoon-17.png', 1.13, 'ilustracao', 1],
    ['olhos-cartoon-18.png', 2.405, 'ilustracao', 0],
    ['olhos-cartoon-19.png', 2.612, 'ilustracao', 0],
    ['olhos-cartoon-20.png', 3.108, 'ilustracao', 0],
    ['olhos-cartoon-21.png', 2.548, 'ilustracao', 0],
    ['olhos-cartoon-22.png', 2.214, 'ilustracao', 0],
    ['olhos-cartoon-23.png', 3.75, 'ilustracao', 0],
    ['palhaco-azul.png', 1.073, 'ilustracao', 0],
    ['palhaco-bobo.png', 0.703, 'ilustracao', 1],
    ['palhaco-classico.png', 0.953, 'ilustracao', 0],
    ['palhaco-meiotom.png', 0.666, 'ilustracao', 0],
    ['palhaco-vintage.png', 0.846, 'ilustracao', 0],
    ['peca-bolha.png', 1.209, 'peca', 0],
    ['personagem-muro.png', 0.699, 'ilustracao', 1],
    ['personagens-graffiti-01.png', 1.423, 'ilustracao', 1],
    ['personagens-graffiti-02.png', 0.83, 'ilustracao', 1],
    ['personagens-graffiti-03.png', 0.765, 'ilustracao', 0],
    ['personagens-graffiti-04.png', 0.991, 'ilustracao', 1],
    ['personagens-graffiti-05.png', 1.159, 'ilustracao', 1],
    ['personagens-graffiti-06.png', 0.879, 'ilustracao', 1],
    ['personagens-graffiti-07.png', 1.121, 'ilustracao', 0],
    ['pra-gringo.png', 0.707, 'cartaz', 1],
    ['tag-fina.png', 1.5, 'tag', 0],
    ['tag-flop.png', 1.299, 'tag', 0],
    ['tag-larga.png', 1.5, 'tag', 0],
    ['tag-money.png', 1.336, 'tag', 0],
    ['tag-pingo.png', 1.5, 'tag', 0],
    ['tag-selvagem.png', 1.444, 'tag', 0],
    ['tags-treino-01.png', 1.111, 'tag', 0],
    ['tags-treino-02.png', 0.798, 'tag', 0],
    ['tags-treino-03.png', 0.504, 'tag', 0],
    ['tags-treino-04.png', 2.992, 'tag', 0],
    ['tags-treino-05.png', 1.313, 'tag', 0],
    ['tags-treino-06.png', 0.375, 'tag', 1],
  ];
  /* DECALS:GERADO-FIM */
  /* ORIGINAIS `or-*` (07/08): gerados via OpenRouter (tools/gen-image.mjs), obra própria —
     por isso são os ÚNICOS decals VERSIONADOS (exceção no .gitignore) e os únicos que
     existem no deploy de produção, que builda do git puro e não tem os recortes de
     references/. Bloco separado do gerado de propósito: o gen-graffiti-decals reescreve
     a lista acima e não pode engolir estes. */
  DECAL_FILES.push(
    ['or-graf-treta.png', 1.99, 'peca', 0],
    ['or-graf-coro.png', 2.163, 'peca', 0],
    ['or-mitico-mural.png', 1.0, 'peca', 0],
    ['or-stencil-capivara.png', 1.0, 'ilustracao', 0],
    ['or-stencil-pomba.png', 1.181, 'ilustracao', 0],
  );
  /* PACK PIXO SP×RJ (frente F, v2.1): obra própria, estilo sem assinatura — references/graffiti/PIXACAO-SP-RJ.md.
     5º campo = cidade (portão GRAFFITI-EDITORIAL). GERADO por tools/gen-graffiti-decals.mjs --pack — edite o script. */
  /* PIXO-PACK:GERADO-INICIO */
  DECAL_FILES.push(
    ['or-pixo-rj-alto.png', 3.346, 'tag', 0, 'RJ'],
    ['or-pixo-rj-areia.png', 2.86, 'tag', 0, 'RJ'],
    ['or-pixo-rj-arena.png', 3.346, 'tag', 0, 'RJ'],
    ['or-pixo-rj-asa.png', 2.844, 'tag', 0, 'RJ'],
    ['or-pixo-rj-baile.png', 3.122, 'tag', 0, 'RJ'],
    ['or-pixo-rj-baixada.png', 3.303, 'tag', 0, 'RJ'],
    ['or-pixo-rj-barco.png', 2.709, 'tag', 0, 'RJ'],
    ['or-pixo-rj-bike.png', 2.142, 'tag', 0, 'RJ'],
    ['or-pixo-rj-bola.png', 2.844, 'tag', 0, 'RJ'],
    ['or-pixo-rj-bonde.png', 2.709, 'tag', 0, 'RJ'],
    ['or-pixo-rj-brisa.png', 2.599, 'tag', 0, 'RJ'],
    ['or-pixo-rj-calcada.png', 2.599, 'tag', 0, 'RJ'],
    ['or-pixo-rj-calor.png', 2.943, 'tag', 0, 'RJ'],
    ['or-pixo-rj-campo.png', 2.723, 'tag', 0, 'RJ'],
    ['or-pixo-rj-coco.png', 2.681, 'tag', 0, 'RJ'],
    ['or-pixo-rj-colina.png', 4.096, 'tag', 0, 'RJ'],
    ['or-pixo-rj-descida.png', 3.18, 'tag', 0, 'RJ'],
    ['or-pixo-rj-duna.png', 3.282, 'tag', 0, 'RJ'],
    ['or-pixo-rj-duo-letra.png', 2.547, 'tag', 0, 'RJ'],
    ['or-pixo-rj-duo-mancha.png', 2.96, 'tag', 0, 'RJ'],
    ['or-pixo-rj-duo-rabisco.png', 2.783, 'tag', 0, 'RJ'],
    ['or-pixo-rj-duo-spray.png', 2.535, 'tag', 0, 'RJ'],
    ['or-pixo-rj-duo-traco.png', 2.813, 'tag', 0, 'RJ'],
    ['or-pixo-rj-dupla-baile-funk.png', 3.765, 'tag', 0, 'RJ'],
    ['or-pixo-rj-dupla-praia-mar.png', 3.18, 'tag', 0, 'RJ'],
    ['or-pixo-rj-dupla-zn-zs.png', 2.86, 'tag', 0, 'RJ'],
    ['or-pixo-rj-encosta.png', 4.491, 'tag', 0, 'RJ'],
    ['or-pixo-rj-estacao.png', 3.391, 'tag', 0, 'RJ'],
    ['or-pixo-rj-faixa.png', 2.626, 'tag', 0, 'RJ'],
    ['or-pixo-rj-ferro.png', 2.876, 'tag', 0, 'RJ'],
    ['or-pixo-rj-fundo.png', 3.938, 'tag', 0, 'RJ'],
    ['or-pixo-rj-funk.png', 2.977, 'tag', 0, 'RJ'],
    ['or-pixo-rj-grau.png', 2.016, 'tag', 0, 'RJ'],
    ['or-pixo-rj-lagoa.png', 3.048, 'tag', 0, 'RJ'],
    ['or-pixo-rj-leste.png', 2.404, 'tag', 0, 'RJ'],
    ['or-pixo-rj-mare.png', 3.122, 'tag', 0, 'RJ'],
    ['or-pixo-rj-mureta.png', 3.303, 'tag', 0, 'RJ'],
    ['or-pixo-rj-norte.png', 3.22, 'tag', 0, 'RJ'],
    ['or-pixo-rj-oeste.png', 2.844, 'tag', 0, 'RJ'],
    ['or-pixo-rj-onda.png', 1.882, 'tag', 0, 'RJ'],
    ['or-pixo-rj-ce.png', 0.939, 'peca', 0, 'RJ'],
    ['or-pixo-rj-copa.png', 1.145, 'peca', 0, 'RJ'],
    ['or-pixo-rj-lua.png', 1.101, 'peca', 0, 'RJ'],
    ['or-pixo-rj-rio.png', 1.191, 'peca', 0, 'RJ'],
    ['or-pixo-rj-sol.png', 1.03, 'peca', 0, 'RJ'],
    ['or-pixo-rj-voo.png', 1.177, 'peca', 0, 'RJ'],
    ['or-pixo-rj-zn.png', 0.977, 'peca', 0, 'RJ'],
    ['or-pixo-rj-pedra.png', 2.909, 'tag', 0, 'RJ'],
    ['or-pixo-rj-pier.png', 3.938, 'tag', 0, 'RJ'],
    ['or-pixo-rj-pipa.png', 2.723, 'tag', 0, 'RJ'],
    ['or-pixo-rj-pique.png', 2.438, 'tag', 0, 'RJ'],
    ['or-pixo-rj-pista.png', 3.368, 'tag', 0, 'RJ'],
    ['or-pixo-rj-praia.png', 2.473, 'tag', 0, 'RJ'],
    ['or-pixo-rj-prancha.png', 3.325, 'tag', 0, 'RJ'],
    ['or-pixo-rj-quadra.png', 3.765, 'tag', 0, 'RJ'],
    ['or-pixo-rj-raia.png', 2.133, 'tag', 0, 'RJ'],
    ['or-pixo-rj-rede.png', 2.573, 'tag', 0, 'RJ'],
    ['or-pixo-rj-regata.png', 2.639, 'tag', 0, 'RJ'],
    ['or-pixo-rj-remo.png', 2.359, 'tag', 0, 'RJ'],
    ['or-pixo-rj-sal.png', 2.612, 'tag', 0, 'RJ'],
    ['or-pixo-rj-samba.png', 2.427, 'tag', 0, 'RJ'],
    ['or-pixo-rj-sinal.png', 2.612, 'tag', 0, 'RJ'],
    ['or-pixo-rj-skate.png', 3.483, 'tag', 0, 'RJ'],
    ['or-pixo-rj-solto.png', 2.081, 'tag', 0, 'RJ'],
    ['or-pixo-rj-subida.png', 4.096, 'tag', 0, 'RJ'],
    ['or-pixo-rj-suburbio.png', 3.58, 'tag', 0, 'RJ'],
    ['or-pixo-rj-sul.png', 2.876, 'tag', 0, 'RJ'],
    ['or-pixo-rj-surfe.png', 3.793, 'tag', 0, 'RJ'],
    ['or-pixo-rj-torcida.png', 2.798, 'tag', 0, 'RJ'],
    ['or-pixo-rj-trem.png', 2.098, 'tag', 0, 'RJ'],
    ['or-pixo-rj-trilha.png', 4.491, 'tag', 0, 'RJ'],
    ['or-pixo-rj-trilho.png', 2.738, 'tag', 0, 'RJ'],
    ['or-pixo-rj-vela.png', 2.462, 'tag', 0, 'RJ'],
    ['or-pixo-rj-vento.png', 2.485, 'tag', 0, 'RJ'],
    ['or-pixo-rj-verao.png', 2.926, 'tag', 0, 'RJ'],
    ['or-pixo-sp-andaime.png', 1.193, 'tag', 0, 'SP'],
    ['or-pixo-sp-antena.png', 0.75, 'tag', 0, 'SP'],
    ['or-pixo-sp-asfalto.png', 1.862, 'tag', 0, 'SP'],
    ['or-pixo-sp-avenida.png', 0.686, 'tag', 0, 'SP'],
    ['or-pixo-sp-beco.png', 1.24, 'tag', 0, 'SP'],
    ['or-pixo-sp-bloco.png', 0.57, 'tag', 0, 'SP'],
    ['or-pixo-sp-caixa.png', 0.873, 'tag', 0, 'SP'],
    ['or-pixo-sp-cal.png', 0.496, 'tag', 0, 'SP'],
    ['or-pixo-sp-cerca.png', 0.625, 'tag', 0, 'SP'],
    ['or-pixo-sp-cimento.png', 0.973, 'tag', 0, 'SP'],
    ['or-pixo-sp-cinza.png', 0.777, 'tag', 0, 'SP'],
    ['or-pixo-sp-coluna.png', 0.939, 'tag', 0, 'SP'],
    ['or-pixo-sp-concreto.png', 1.004, 'tag', 0, 'SP'],
    ['or-pixo-sp-coro.png', 1.33, 'tag', 0, 'SP'],
    ['or-pixo-sp-duo-alicate.png', 1.255, 'tag', 0, 'SP'],
    ['or-pixo-sp-duo-chave.png', 0.836, 'tag', 0, 'SP'],
    ['or-pixo-sp-duo-martelo.png', 1.082, 'tag', 0, 'SP'],
    ['or-pixo-sp-duo-serrote.png', 1.018, 'tag', 0, 'SP'],
    ['or-pixo-sp-duo-trator.png', 1.135, 'tag', 0, 'SP'],
    ['or-pixo-sp-dupla-garoa-cinza.png', 1.816, 'tag', 0, 'SP'],
    ['or-pixo-sp-dupla-portao-grade.png', 1.809, 'tag', 0, 'SP'],
    ['or-pixo-sp-dupla-viaduto-tunel.png', 2.286, 'tag', 0, 'SP'],
    ['or-pixo-sp-escada.png', 0.58, 'tag', 0, 'SP'],
    ['or-pixo-sp-esquina.png', 0.826, 'tag', 0, 'SP'],
    ['or-pixo-sp-ferrugem.png', 1.225, 'tag', 0, 'SP'],
    ['or-pixo-sp-fumaca.png', 0.953, 'tag', 0, 'SP'],
    ['or-pixo-sp-galpao.png', 0.775, 'tag', 0, 'SP'],
    ['or-pixo-sp-garoa.png', 0.863, 'tag', 0, 'SP'],
    ['or-pixo-sp-giz.png', 0.445, 'tag', 0, 'SP'],
    ['or-pixo-sp-grade.png', 0.873, 'tag', 0, 'SP'],
    ['or-pixo-sp-guincho.png', 0.74, 'tag', 0, 'SP'],
    ['or-pixo-sp-janela.png', 0.793, 'tag', 0, 'SP'],
    ['or-pixo-sp-ladeira.png', 0.836, 'tag', 0, 'SP'],
    ['or-pixo-sp-laje.png', 1.467, 'tag', 0, 'SP'],
    ['or-pixo-sp-lata.png', 0.848, 'tag', 0, 'SP'],
    ['or-pixo-sp-marginal.png', 1.261, 'tag', 0, 'SP'],
    ['or-pixo-sp-mercado.png', 1.182, 'tag', 0, 'SP'],
    ['or-pixo-sp-morro.png', 1.561, 'tag', 0, 'SP'],
    ['or-pixo-sp-muro.png', 0.736, 'tag', 0, 'SP'],
    ['or-pixo-sp-obra.png', 0.586, 'tag', 0, 'SP'],
    ['or-pixo-sp-oficina.png', 0.93, 'tag', 0, 'SP'],
    ['or-pixo-sp-padaria.png', 1.299, 'tag', 0, 'SP'],
    ['or-pixo-sp-coroa.png', 0.574, 'peca', 0, 'SP'],
    ['or-pixo-sp-estrela.png', 0.857, 'peca', 0, 'SP'],
    ['or-pixo-sp-flecha.png', 1.202, 'peca', 0, 'SP'],
    ['or-pixo-sp-leste26.png', 0.549, 'peca', 0, 'SP'],
    ['or-pixo-sp-norte26.png', 0.596, 'peca', 0, 'SP'],
    ['or-pixo-sp-raio.png', 0.635, 'peca', 0, 'SP'],
    ['or-pixo-sp-zl26.png', 0.334, 'peca', 0, 'SP'],
    ['or-pixo-sp-pilar.png', 0.91, 'tag', 0, 'SP'],
    ['or-pixo-sp-pintura.png', 1.188, 'tag', 0, 'SP'],
    ['or-pixo-sp-poco.png', 0.527, 'tag', 0, 'SP'],
    ['or-pixo-sp-poeira.png', 0.844, 'tag', 0, 'SP'],
    ['or-pixo-sp-ponte.png', 0.738, 'tag', 0, 'SP'],
    ['or-pixo-sp-porta.png', 0.895, 'tag', 0, 'SP'],
    ['or-pixo-sp-portao.png', 0.895, 'tag', 0, 'SP'],
    ['or-pixo-sp-porteira.png', 1.45, 'tag', 0, 'SP'],
    ['or-pixo-sp-prumo.png', 0.709, 'tag', 0, 'SP'],
    ['or-pixo-sp-quintal.png', 0.934, 'tag', 0, 'SP'],
    ['or-pixo-sp-reboco.png', 0.916, 'tag', 0, 'SP'],
    ['or-pixo-sp-risco.png', 0.541, 'tag', 0, 'SP'],
    ['or-pixo-sp-rodovia.png', 0.996, 'tag', 0, 'SP'],
    ['or-pixo-sp-rolo.png', 0.801, 'tag', 0, 'SP'],
    ['or-pixo-sp-tampa.png', 1.228, 'tag', 0, 'SP'],
    ['or-pixo-sp-telha.png', 0.781, 'tag', 0, 'SP'],
    ['or-pixo-sp-telhado.png', 1.004, 'tag', 0, 'SP'],
    ['or-pixo-sp-terra.png', 0.637, 'tag', 0, 'SP'],
    ['or-pixo-sp-terreno.png', 0.982, 'tag', 0, 'SP'],
    ['or-pixo-sp-tijolo.png', 0.73, 'tag', 0, 'SP'],
    ['or-pixo-sp-tinta.png', 0.844, 'tag', 0, 'SP'],
    ['or-pixo-sp-travessa.png', 0.977, 'tag', 0, 'SP'],
    ['or-pixo-sp-tunel.png', 0.912, 'tag', 0, 'SP'],
    ['or-pixo-sp-varal.png', 0.754, 'tag', 0, 'SP'],
    ['or-pixo-sp-viaduto.png', 0.846, 'tag', 0, 'SP'],
    ['or-pixo-sp-viga.png', 0.795, 'tag', 0, 'SP'],
  );
  /* PIXO-PACK:GERADO-FIM */
  /* As homenagens or-hom-* (pessoa real) saíram do pool E do disco em 17/08 —
     contrato editorial; o portão GRAFFITI-EDITORIAL impede a reintrodução. */
  /* Galeria desativada por contrato editorial: os mapas não geram arte de pessoa
     real. Os arquivos históricos permanecem no disco por enquanto, fora de todos
     os pools; o portão GRAFFITI-EDITORIAL impede a reintrodução no jogo. */
  const MURAIS_HOM = [];
  T.muraisHomNomes = MURAIS_HOM.map((n) => 'homenagem-' + n);
  T.muraisHom = [];
  MURAIS_HOM.forEach((n, i) => {
    Object.defineProperty(T.muraisHom, i, {
      enumerable: true, configurable: true,
      get() {
        const t = _tl.load('posters/or-mural-' + n + '.jpg');
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        Object.defineProperty(T.muraisHom, i, { value: t, enumerable: true, configurable: true, writable: true });
        return t;
      },
    });
  });
  T.decals = [];
  DECAL_FILES.forEach(([f], i) => {
    Object.defineProperty(T.decals, i, {
      enumerable: true, configurable: true,
      get() {
        /* ── ARQUIVO QUE NÃO EXISTE EM PROD NÃO PODE VIRAR RETÂNGULO BRANCO ──────
           Só 12 dos 209 PNG de `public/img/decals` estão no git: o resto é
           gitignored por procedência (.gitignore:104) e chega pelo `fetch-decals.sh`.
           Prod builda de clone puro, então lá esses arquivos dão 404 — e textura que
           falha no three não some, ela fica SEM `image`, o que o material desenha
           como BRANCO CHAPADO. Ou seja: o modo de falha era pintar a parede de
           retângulos brancos, que é pior que parede pelada e é exatamente a classe de
           defeito que o dono já reprovou uma vez ("o do chorão está com fundo branco").
           `faltou` deixa quem usa a textura sumir com a peça — ver `_juntar` em
           graffiti_pass.js. Vale pras peças à mão e pras da passada. */
        const t = _tl.load('img/decals/' + f, undefined, undefined, () => {
          t.userData.faltou = true;
          if (t.userData.aoFaltar) t.userData.aoFaltar();
          console.warn('[decals] 404 em "' + f + '" — peça escondida (rode scripts/fetch-decals.sh)');
        });
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        // memoiza: troca o getter pela textura, então a 2ª leitura não repete nada
        Object.defineProperty(T.decals, i, { value: t, enumerable: true, configurable: true, writable: true });
        return t;
      },
    });
  });
  T.decalAspects = DECAL_FILES.map(([, a]) => a);
  T.decalTipos = DECAL_FILES.map(([, , k]) => k);
  T.decalClaro = DECAL_FILES.map(([, , , c]) => !!c);
  T.decalFiles = DECAL_FILES.map(([f]) => f);
  /* 'SP' | 'RJ' | null — só o pack or-pixo-* declara (5º campo); o resto é null. */
  T.decalCidades = DECAL_FILES.map(([, , , , cd]) => cd || null);
  /* Índices de um tipo — `T.decalsDoTipo('tag')`. Devolve índice, não textura, de
     propósito: assim dá pra sortear e carregar só o que a parede vai usar. */
  T.decalsDoTipo = (tipo) => T.decalTipos.reduce((a, k, i) => (k === tipo && a.push(i), a), []);

  // --- billboard: fictional social network ---
  {
    const c = canvas(512, 256), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 512, 256);
    g.addColorStop(0, '#1b2a4a'); g.addColorStop(1, '#3b1b4a');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    x.strokeStyle = '#ffd23f'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 244);
    x.textAlign = 'center';
    x.font = 'bold 64px Arial Black,sans-serif'; x.fillStyle = '#fff';
    x.fillText('TretaTok', 256, 110);
    x.font = 'bold 22px Arial,sans-serif'; x.fillStyle = '#ffd23f';
    x.fillText('a rede social da treta™ — 40 milhões de tretas/dia', 256, 155);
    x.font = '18px Arial,sans-serif'; x.fillStyle = '#9adcff';
    x.fillText('@zecapivara segue você', 256, 200);
    for (let i = 0; i < 3; i++) { x.fillStyle = ['#ff3b3b', '#7dff9a', '#ff7ad9'][i]; x.beginPath(); x.arc(70 + i * 30, 200, 9, 0, 7); x.fill(); }
    T.billboard = tex(c);
  }

  // --- graffiti "PERDEU, MANÉ" (referência 8 de janeiro) — fundo transparente ---
  {
    const c = canvas(512, 256), x = c.getContext('2d');
    x.translate(256, 128); x.rotate(-0.07);
    x.textAlign = 'center'; x.fillStyle = '#4a1010';
    x.font = '900 96px Arial Black, sans-serif';
    x.fillText('PERDEU,', 0, -8);
    x.fillText('MANÉ', 0, 92);
    T.perdeuMane = tex(c);
  }

  // --- urna eletrônica front (fictional, generic) ---
  {
    const c = canvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#3a3f45'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#2b2f34'; x.fillRect(0, 0, 256, 30);
    x.fillStyle = '#bfe8c8'; x.fillRect(18, 44, 220, 90);            // screen
    x.fillStyle = '#22331f'; x.font = 'bold 20px monospace'; x.textAlign = 'center';
    x.fillText('VOTAÇÃO', 128, 82); x.fillText('ENCERRADA', 128, 108);
    x.fillText('FIM ⏻', 128, 128);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) {          // keypad
      x.fillStyle = '#d8d8d8'; x.fillRect(30 + k * 70, 150 + r * 24, 56, 18);
      x.fillStyle = '#333'; x.fillRect(30 + k * 70 + 22, 150 + r * 24 + 5, 12, 8);
    }
    x.fillStyle = '#57e05a'; x.fillRect(196, 150, 44, 18); x.fillStyle = '#e03232'; x.fillRect(196, 174, 44, 18);
    x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 2;          // cracks (broken prop)
    x.beginPath(); x.moveTo(10, 10); x.lineTo(90, 120); x.lineTo(60, 250); x.stroke();
    x.beginPath(); x.moveTo(250, 30); x.lineTo(170, 130); x.lineTo(210, 246); x.stroke();
    T.urna = tex(c);
  }

  // --- Brazil flag (simplified) ---
  {
    const c = canvas(180, 126), x = c.getContext('2d');
    x.fillStyle = '#159a3f'; x.fillRect(0, 0, 180, 126);
    x.fillStyle = '#ffd23f'; x.beginPath();
    x.moveTo(90, 12); x.lineTo(166, 63); x.lineTo(90, 114); x.lineTo(14, 63); x.closePath(); x.fill();
    x.fillStyle = '#2b4d8f'; x.beginPath(); x.arc(90, 63, 24, 0, 7); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(90, 95, 42, -2.2, -0.9); x.stroke();
    T.flagBR = tex(c);
  }

  // --- truck side ---
  {
    const c = canvas(512, 128), x = c.getContext('2d');
    x.fillStyle = '#1faa4d'; x.fillRect(0, 0, 512, 128);
    x.fillStyle = '#ffd23f'; x.fillRect(0, 88, 512, 40);
    x.font = 'bold 44px Arial Black,sans-serif'; x.fillStyle = '#fff'; x.textAlign = 'center';
    x.strokeStyle = '#0d5c28'; x.lineWidth = 8;
    x.strokeText('FRETE SUPREMO', 256, 58); x.fillText('FRETE SUPREMO', 256, 58);
    x.font = 'bold 17px Arial,sans-serif'; x.fillStyle = '#0d5c28';
    x.fillText('ENTREGA RÁPIDA · SÓ NÃO ENTREGA O JOGO', 256, 112);
    T.truckSide = tex(c);
  }

  // --- signs ---
  const sign = (bg, fg, text, sub) => {
    const c = canvas(256, 64), x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 64);
    x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(3, 3, 250, 58);
    x.font = 'bold 26px Arial Black,sans-serif'; x.fillStyle = fg; x.textAlign = 'center';
    x.fillText(text, 128, sub ? 30 : 42);
    if (sub) { x.font = 'bold 13px Arial,sans-serif'; x.fillText(sub, 128, 52); }
    return tex(c);
  };
  T.signSindicato = sign('#8f1d1d', '#ffd23f', 'SINDICATO DOS SNIPERS', 'CATEGORIA T-1337 · FUNDADO EM PIXELÂNDIA');
  T.signBoteco = sign('#22331f', '#ffe9c4', 'BOTECO DO ZÉ', 'PASTEL · CALDO · TRETA NO FIADO');
  T.signPastel = sign('#e8bd25', '#8f1d1d', 'PASTEL DA TRETA', 'DE QUEIJO · DE CARNE · DE CLÍMAX');

  // striped awning
  {
    const c = canvas(128, 64), x = c.getContext('2d');
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#e03232' : '#f2ead8'; x.fillRect(i * 16, 0, 16, 64); }
    T.awning = tex(c, 2, 1);
  }
  // tent fabric
  {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#b03030'; x.fillRect(0, 0, 128, 128);
    noiseOver(x, 128, 128, 0.25, ['#992626', '#c24343']);
    x.fillStyle = 'rgba(255,255,255,0.85)'; x.font = 'bold 20px Arial Black,sans-serif'; x.textAlign = 'center';
    x.fillText('ACAMP.', 64, 58); x.fillText('TRETA LIVRE', 64, 84);
    T.tent = tex(c);
  }
  // conspiracy corkboard
  {
    const c = canvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#a97f4e'; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = '#5c3d1e'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 122);
    const notes = ['XÊROX', 'ZAP', '51??', 'PRINT', 'ÁUDIO'];
    notes.forEach((n, i) => {
      const px = 12 + (i % 3) * 40, py = 14 + ((i / 3) | 0) * 52;
      x.save(); x.translate(px, py); x.rotate((Math.random() - .5) * .4);
      x.fillStyle = '#f2ecd8'; x.fillRect(0, 0, 34, 26);
      x.fillStyle = '#333'; x.font = 'bold 8px Arial'; x.textAlign = 'center'; x.fillText(n, 17, 15);
      x.restore();
    });
    x.strokeStyle = '#d33'; x.lineWidth = 1.5;
    x.beginPath(); x.moveTo(28, 26); x.lineTo(70, 70); x.lineTo(30, 78); x.lineTo(106, 30); x.lineTo(28, 26); x.stroke();
    T.corkboard = tex(c);
  }
  // metal — normal forte + roughness baixa: é onde o env map novo (disco solar HDR) paga
  { const c = concreteBase(128, 128, '#5a5f66', '#464b52'); T.metal = withDetail(tex(c), c, 3.2, 0.28, 0.72); }

  // --- soft sprites (sun / cloud / muzzle flash) ---
  const clampTex = t => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.magFilter = THREE.LinearFilter; return t; };
  {
    const c = canvas(128, 128), x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,244,214,1)'); g.addColorStop(0.35, 'rgba(255,214,140,0.55)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    T.sunSprite = clampTex(tex(c));
  }
  {
    const c = canvas(256, 128), x = c.getContext('2d');
    for (let i = 0; i < 15; i++) {
      const px = 30 + Math.random() * 196, py = 42 + Math.random() * 44, r = 18 + Math.random() * 26;
      const g = x.createRadialGradient(px, py, 2, px, py, r);
      g.addColorStop(0, 'rgba(255,252,246,0.55)'); g.addColorStop(1, 'rgba(255,252,246,0)');
      x.fillStyle = g; x.fillRect(0, 0, 256, 128);
    }
    T.cloud = clampTex(tex(c));
  }
  {
    const c = canvas(64, 64), x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.3, 'rgba(255,210,110,0.9)'); g.addColorStop(1, 'rgba(255,160,40,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    // star spikes
    x.strokeStyle = 'rgba(255,230,150,0.9)'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(32, 2); x.lineTo(32, 62); x.moveTo(2, 32); x.lineTo(62, 32); x.stroke();
    T.flash = clampTex(tex(c));
  }

  // --- warm sky gradient ---
  {
    const c = canvas(16, 256), x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#6fa8e0'); g.addColorStop(0.45, '#a8c8e8');
    g.addColorStop(0.72, '#ffd9a0'); g.addColorStop(1, '#ffb877');
    x.fillStyle = g; x.fillRect(0, 0, 16, 256);
    T.sky = tex(c);
    T.sky.wrapS = T.sky.wrapT = THREE.ClampToEdgeWrapping;
  }
  return T;
}
