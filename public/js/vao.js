/* vao.js — AMBIENT OCCLUSION POR VÉRTICE para a geometria procedural dos mapas.
 *
 * PORQUE ESTE ARQUIVO EXISTE
 * O critério A1 do BAR ("queda monotônica de ΔL* ≥ 8 nos ~15 cm finais antes da junção
 * parede–chão") reprovou em base, r1 e r2. Medido em /root/shots/r2 com tools/eval/vao_a1.py:
 * mediana de ΔL* na parede = 0.00 (p90 = 2.59) nos 32 frames. Ou seja: a luminância é
 * literalmente CONSTANTE até a aresta e o degrau que existe é só troca de material.
 * É esse zero que faz tudo parecer adesivo colado no chão.
 *
 * O SSAO de pós que existe no bloom.js não resolve isso e não é meu nesta rodada. Diagnóstico
 * curto (medido/lido, não chutado): (a) `aoRadius` = 0,6 m contra uma janela de medida de
 * 0,15 m — o AO que ele produz é de MACRO-oclusão e varia devagar demais para aparecer no
 * perfil; (b) meia resolução + blur bilateral 4×4 na meia-res = ±4 px em full-res, que borra
 * exatamente a linha de contato; (c) o passe é gated em quality med/high e só na cena com
 * vmPass, então some silenciosamente em boa parte das execuções.
 *
 * A SOLUÇÃO AQUI é independente do pós: escurecimento gravado no atributo `color` da própria
 * geometria (BAR §3.1c). Custo: ZERO draw call novo por caixa, ZERO textura, ZERO VRAM de
 * imagem; funciona em r160, em quality 'low' e com o composer desligado.
 *
 * DOIS LADOS DA JUNÇÃO (é isso que produz gradiente, não só escurecer a parede):
 *   1. FAIXAS NA CAIXA  — a face vertical é subdividida em faixas de altura e cada anel de
 *      vértices recebe um multiplicador de albedo.
 *   2. SAIA DE CONTATO  — um anel de vértices no CHÃO em volta da base de cada caixa, com
 *      alpha caindo em quadrática. Tudo vira UMA malha mesclada por mapa = 1 draw call.
 *
 * KILL-SWITCH: `?vao=0` desliga as duas coisas.
 */
import * as THREE from 'three';

const _qp = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
export const VAO_ON = _qp.get('vao') !== '0';
// `?vao=skirt` / `?vao=band` isolam um lado do efeito para A/B do agente de captura
const _only = _qp.get('vao');
export const VAO_BANDS = VAO_ON && _only !== 'skirt';
export const VAO_SKIRT = VAO_ON && _only !== 'band';

/* ===========================================================================
   ESCALA DE TEXEL — a UV da caixa passa a saber o tamanho do mundo.
   ---------------------------------------------------------------------------
   O DEFEITO, medido antes do conserto (tools/eval/texel-check.mjs, os 10 mapas):
   `aoBoxGeo` criava `BoxGeometry(w,h,d,1,segs,1)` e mexia SÓ em `uv.setY` para as
   bandas de AO. Um muro de 36 m e um engradado de 0,6 m recebiam UV 0→1 IDÊNTICOS,
   e como o `repeat` mora na textura COMPARTILHADA (textures.js), os dois ficavam com
   a mesma quantidade de texels. Números do fy_quebrada:
       chão .............. 8,18 px/m   (256 px × repeat 3 sobre 94 m)
       parede de tijolo .. 628  px/m
       dispersão ......... 10,3×  contra o portão de 1,5× da BAR-CONSISTENCIA §3.1
   52% da área estrutural do mapa abaixo dos 64 px/m que a BAR §1.8 chama de piso.

   O CONSERTO, e por que ele é de graça:
   a UV vai para a GEOMETRIA, não para a textura. Escalar `map.repeat` por superfície
   exigiria `map.clone()` por caixa — 1.608 objetos de textura novos só nas caixas, num
   projeto que JÁ TEVE crash de OOM. Escalando a UV que já existe na BoxGeometry o custo
   é ZERO textura nova, ZERO material novo, ZERO draw call nova: os mesmos 24 vértices,
   com outros números no atributo `uv`. Medido em tools/eval/texel-custo.mjs.

   A CONTA. Queremos que UMA volta da textura ocupe sempre a mesma quantidade de
   metros de MUNDO, de modo que a densidade final seja constante:
       tile(m)   = pixels_efetivos / ALVO_PXM        (pixels_efetivos = canvas × repeat)
       spanUV    = extensão_da_face(m) / tile
       densidade = pixels_efetivos × spanUV / extensão = pixels_efetivos / tile = ALVO_PXM
   Ou seja: dividir pelo `repeat` que já está na textura é o que faz a conta ser
   INDEPENDENTE do valor que cada mapa escolheu. Sem isso, uma textura local com
   repeat 3 sairia a 3× a densidade do concreto e a dispersão continuaria vermelha —
   trocaríamos um defeito por outro.

   AS DUAS GUARDAS (as duas formas de este conserto virar um defeito novo):

   (a) `ClampToEdgeWrapping` é a declaração "ESTA TEXTURA NÃO TILA". Não é acidente:
       os mapas a escrevem à mão em mural, placa e faixa (map_ferrovelho.js:178,
       map_lajes.js:110, map_piscinao_ramos.js:312 e mais 15 lugares). Fora da volta
       o WebGL repete a ÚLTIMA COLUNA DE TEXELS pelo resto da face, e o mural vira
       borrão esticado. Medido: 38 das 1.608 caixas com textura (2,4%) estão nesse
       caso, quase todas painéis finos de 0,04 × 1,5 × 4 m. A cláusula TEXEL6 da régua
       existe só para vigiar esta guarda.

   (b) MIN_TILES: abaixo de 2 voltas inteiras a face fica com a UV original. Uma caixa
       menor que o tile mostraria só um RECORTE da textura, e recorte estraga arte
       desenhada que tila (a caixa dos Correios, o grafite de 512 px). Com o corte em
       2 voltas, engradado de 1,6 m e peça de grafite de 4,1 m ficam intactos, e muro
       de 36 m e laje de 20 m entram no conserto — que é onde o defeito vive.

   POR QUE O `map.image` PODE FALTAR: textura carregada por `TextureLoader` ainda não
   resolveu no primeiro frame. Nesse caso não escalamos — errar para o lado do estado
   de hoje é melhor que escalar por um palpite de resolução.

   KILL-SWITCH: `?texel=0` devolve o comportamento antigo inteiro, para A/B de captura
   e para socorro em produção sem deploy.
   =========================================================================== */
export const TEXEL_ON = _qp.get('texel') !== '0';
/* 128 px/m: o exemplo literal da BAR-CONSISTENCIA §3.1 ("uma densidade de texel para o
   mapa inteiro, declarada por mapa (ex.: 128 px/m)") e o teto da faixa de fundo da
   BAR §1.8 — o menor valor que não é borrão em lugar nenhum. Subir daqui custa canvas
   maior, que é CPU de boot e heap. O espelho deste número mora em
   tools/eval/texel-tetos.mjs e a régua MORRE se os dois divergirem. */
export const ALVO_PXM = 128;
/* Teto de hero prop da BAR §1.8 (512-1024 px/m). Uma caixa MENOR que um tile fica, sem
   conserto, com a textura inteira espremida no seu tamanho: medido, um parafuso de 0,13 m
   com canvas de 512 px dá 3.940 px/m, e o fy_lajes chegou a 5.130. Não é nitidez — é
   desperdício que estoura a dispersão da BAR-CONSISTENCIA §3.1 e mostra um nível de
   detalhe que não existe em mais lugar nenhum da tela. Quando a densidade natural passa
   deste teto, a UV é RECORTADA o mínimo necessário para encostar nele. Recorte só acontece
   abaixo de uma volta inteira, ou seja, só em prop menor que o tile — arte desenhada que
   tila (a caixa dos Correios a 1,6 m, o grafite de 4,1 m) fica de fora nos dois lados. */
export const TETO_PXM = 512;
const MIN_TILES = 2;

/* Handoff entre `aoBoxGeo` e `aoMat`. POR QUE ele existe em vez de um argumento:
   a escala de UV precisa do MATERIAL (resolução do canvas, `repeat` e, sobretudo, o
   `wrapS` que declara se a textura tila), e o material só aparece uma linha depois,
   em `aoMat(mat)`. Os 9 mapas que usam `aoBoxGeo` escrevem exatamente este par:
       const geo = aoBoxGeo(w, h, d, {...});
       const m   = new THREE.Mesh(geo, aoMat(mat));
   Mudar a assinatura de `aoBoxGeo` exigiria editar os 9 arquivos de mapa, que estão
   em outras mãos nesta rodada. O handoff é de UMA posição e é consumido na primeira
   chamada de `aoMat`; se ninguém consumir, a próxima caixa o sobrescreve e nada
   acontece — a UV simplesmente fica como estava. `geo.userData.texelEscalada` torna
   a operação idempotente, então uma chamada dupla não escala duas vezes. */
let _pendente = null;

/* O fator de UV de UM eixo de UMA face.
     r     voltas de textura que o alvo pediria (extensão / tile)
     px    pixels efetivos do eixo (canvas × repeat)
     ext   extensão de mundo do eixo, em metros
     puro  a textura DECLAROU que seu conteúdo é ruído (textures.js `puro()`)
   Quatro regimes, e o terceiro é a guarda (b):
     r >= MIN_TILES ...... a face cabe 2+ voltas: escala e acerta ALVO_PXM na mosca
     puro ................ ruído sem leitura: recortar não estraga nada, então acerta
                           ALVO_PXM também abaixo de uma volta (ver o bloco TILE PURO
                           em textures.js). SEM isto, `repeat` alto empurra toda caixa
                           para o ramo do teto e ela para colada em 512,0 px/m —
                           medido no fy_quebrada: 4,6× a mediana, TEXEL3b vermelha.
     natural > TETO_PXM .. prop menor que o tile e denso demais: recorta até o teto
     resto ............... deixa como está — arte desenhada não é cortada nem tilada */
function fator(r, px, ext, puro) {
  if (r >= MIN_TILES) return r;
  if (puro) return r;
  const natural = px / ext;                       // densidade se a UV ficar 0→1
  if (natural > TETO_PXM) return TETO_PXM * ext / px;
  return 1;
}

function escalaUVporMundo(geo, w, h, d, mat) {
  if (!TEXEL_ON || !geo || geo.userData.texelEscalada) return false;
  const t = mat && mat.map;
  if (!t || !t.image || !t.image.width || !t.image.height) return false;
  // guarda (a): o autor do mapa declarou que esta textura não tila
  if (t.wrapS !== THREE.RepeatWrapping || t.wrapT !== THREE.RepeatWrapping) return false;
  const uv = geo.attributes.uv, idx = geo.index;
  if (!uv || !idx || !geo.groups.length) return false;

  const pxU = t.image.width * (t.repeat ? t.repeat.x : 1);
  const pxV = t.image.height * (t.repeat ? t.repeat.y : 1);
  if (!(pxU > 0) || !(pxV > 0)) return false;
  const tileU = pxU / ALVO_PXM, tileV = pxV / ALVO_PXM;   // metros por volta de UV

  /* Extensão de mundo (u, v) de cada par de faces, na ordem em que a BoxGeometry monta
     os planos: +X, -X, +Y, -Y, +Z, -Z. Lateral em X percorre `d` no u e `h` no v;
     tampa em Y percorre `w` e `d`; lateral em Z percorre `w` e `h`. Indexado pelo
     `materialIndex` do grupo, e não pela ordem do array, para não depender da ordem
     interna do three continuar a mesma. */
  const EXT = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const visto = new Uint8Array(uv.count);   // o índice repete vértice entre os 2 triângulos
  const ehPuro = !!(t.userData && t.userData.tilePuro);
  let mudou = false;
  for (const gp of geo.groups) {
    const e = EXT[gp.materialIndex | 0];
    if (!e) continue;
    const fu = fator(e[0] / tileU, pxU, e[0], ehPuro);
    const fv = fator(e[1] / tileV, pxV, e[1], ehPuro);
    if (fu === 1 && fv === 1) continue;
    const fim = gp.start + gp.count;
    for (let k = gp.start; k < fim; k++) {
      const vi = idx.getX(k);
      if (visto[vi]) continue;
      visto[vi] = 1;
      uv.setXY(vi, uv.getX(vi) * fu, uv.getY(vi) * fv);
    }
    mudou = true;
  }
  if (mudou) { uv.needsUpdate = true; geo.userData.texelEscalada = true; }
  return mudou;
}

/* ---------------------------------------------------------------------------
   CALIBRAÇÃO DOS MULTIPLICADORES — feita por INVERSÃO NUMÉRICA do pipeline real,
   não a olho. Script: tools/eval/vao_predict.py (replica o COMPOSITE do bloom.js —
   matrizes REC2020, inset/outset do AgX, curva de contraste, piso de ambiente e a
   exposição por mapa da tabela LOOKS) e roda:
     L* medido no PNG da r2 → radiância de cena → × multiplicador → L* previsto.

   O detalhe que muda TUDO: o tonemap final não é o ACES do renderer (main.js põe
   NoToneMapping quando o composer está ligado) e sim o AgX do composite, que é MUITO mais
   compressivo no meio-tom. Com os valores literais da receita (0,55 / 0,80 nas fronteiras
   0,2 / 0,6 m) o resultado previsto é ΔL* = 6,2 nos 15 cm finais — reprovaria de novo em A1
   mesmo "tendo AO". Daí a base descer para 0,40 e a primeira fronteira subir para 0,15 m:

     altura   0,30   0,25   0,20   0,15   0,10   0,05   0,00   (concreto claro do awp, L* 78)
     L*       76,3   75,9   75,5   75,1   72,2   68,5   63,4   → ΔL* nos 15 cm = 11,7

   Pior caso entre 7 combinações mapa × material testadas: ΔL* = 9,2 (fachada branca da
   Havan a L* 88, onde o AgX é mais chato). Gate do A1 = 8.
--------------------------------------------------------------------------- */
// [altura acima da base (m), multiplicador de albedo]
const BANDS = [[0.00, 0.40], [0.15, 0.82], [0.55, 1.00]];
// quality 'low': UMA faixa de AO em vez de três (2 segmentos de altura em vez de 3).
// A fronteira sobe para 0,24 m para o gradiente ainda existir dentro da janela de 15 cm com
// metade dos anéis: pior caso previsto ΔL* ≈ 8,3 (contra 9,2 em med/high).
const BANDS_LOW = [[0.00, 0.42], [0.24, 1.00]];
// Caixa que NÃO nasce no chão (marquise, faixa pintada, laje de cobertura): a face de baixo
// ainda ocluí, mas nada perto dela oclui de volta. Base bem mais fraca para não pintar de
// cinza cada laje suspensa do mapa.
export const BASE_FLOATING = 0.74;

/* Saia de contato — mesma calibração, do outro lado da junção. 21 cm de alcance (o BAR
   §1.4 descreve o sinal como "gradiente escuro de ~5–20 cm") e 0,56 de opacidade encostada
   na parede, o que dá ΔL* previsto de 8,8 (asfalto escuro do awp) a 13,0 (calçada clara)
   nos 15 cm finais. Alcance maior que isso ESPALHA o gradiente e ele volta a não caber na
   janela de medida — foi exatamente esse o erro do SSAO de raio 0,6 m. */
export const SKIRT_REACH = 0.21;   // m — alcance da sombra de contato no chão
export const SKIRT_ALPHA = 0.56;   // opacidade no encosto da parede

function bandK(y, bands, base) {
  if (y <= 0) return base;
  for (let i = 1; i < bands.length; i++) {
    if (y <= bands[i][0]) {
      const y0 = bands[i - 1][0];
      const k0 = (i === 1) ? base : bands[i - 1][1];
      const t = (y - y0) / Math.max(1e-6, bands[i][0] - y0);
      return k0 + (bands[i][1] - k0) * t;
    }
  }
  return bands[bands.length - 1][1];
}

/* Geometria de caixa com as faixas de AO já gravadas no atributo `color`.
   Os anéis da BoxGeometry são uniformes, então as posições Y dos anéis INTERNOS são
   remapeadas para as fronteiras de faixa — e o `uv.y` das faces laterais é reescrito junto,
   senão a textura da parede esticaria/comprimiria justamente no rodapé (v = (y+h/2)/h nas
   laterais da BoxGeometry, porque buildPlane usa vdir = -1 e uv.v = 1 - iy/gridY). */
export function aoBoxGeo(w, h, d, opts = {}) {
  const bands = opts.low ? BANDS_LOW : BANDS;
  const base = (opts.base != null) ? opts.base : bands[0][1];
  const rings = [0];
  for (let i = 1; i < bands.length; i++) if (bands[i][0] < h * 0.9) rings.push(bands[i][0]);
  if (rings[rings.length - 1] < h) rings.push(h); else rings[rings.length - 1] = h;
  const segs = rings.length - 1;
  const geo = new THREE.BoxGeometry(w, h, d, 1, segs, 1);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  const half = h / 2, step = h / segs;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i);
    // |y| < h/2 só acontece em anel interno, que só existe nas 4 faces laterais
    if (Math.abs(Math.abs(y) - half) > 1e-4) {
      const idx = Math.min(rings.length - 1, Math.max(0, Math.round((y + half) / step)));
      y = rings[idx] - half;
      pos.setY(i, y);
      uv.setY(i, rings[idx] / h);
    }
    const k = bandK(y + half, bands, base);
    // sombra levemente quente: oclusão real recebe bounce do chão, não é cinza neutro
    col[i * 3] = k; col[i * 3 + 1] = k * 0.994; col[i * 3 + 2] = k * 0.982;
  }
  pos.needsUpdate = true; uv.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  /* deixa a caixa "pendurada" para a próxima chamada de aoMat, que é quem enxerga o
     material e portanto a resolução, o `repeat` e o `wrapS` da textura */
  _pendente = TEXEL_ON ? { geo, w, h, d } : null;
  return geo;
}

/* Fábrica de material com vertexColors.
   PORQUE clonar em vez de ligar no original: `vertexColors = true` num material usado também
   por um PlaneGeometry (que não tem o atributo `color`) faz o atributo faltante virar
   vec3(0) no WebGL — o plano fica PRETO. O clone isola quem tem AO de quem não tem, e o
   Map garante UM clone por material original (textura e mapas continuam compartilhados por
   referência, então não há custo de VRAM; o custo é um programa de shader a mais). */
export function aoMatFactory() {
  const cache = new Map();
  const one = (m) => {
    if (!m || m.visible === false) return m;
    let a = cache.get(m);
    if (!a) {
      a = m.clone(); a.vertexColors = true;
      cache.set(m, a); cache.set(a, a);   // idempotente: aoMat(aoMat(x)) === aoMat(x)
    }
    return a;
  };
  return (m) => {
    /* consome o handoff de aoBoxGeo ANTES de clonar: a UV é da geometria, não do
       material, então quem escala é a caixa que acabou de nascer. Um array de
       materiais (caixa com face diferente por lado) escala pela primeira face que
       tenha mapa — as 6 faces do mesmo prop usam a mesma família de textura nesta
       base, e escalar por face exigiria um handoff por grupo, que é complexidade
       sem defeito medido para justificá-la. */
    const p = _pendente;
    _pendente = null;
    if (p) escalaUVporMundo(p.geo, p.w, p.h, p.d, Array.isArray(m) ? m.find((x) => x && x.map) : m);

    if (Array.isArray(m)) {
      let a = cache.get(m);
      if (!a) { a = m.map(one); cache.set(m, a); }
      return a;
    }
    return one(m);
  };
}

/* SAIA DE CONTATO — o anel de vértices no CHÃO em volta da base de cada caixa.
   Sem ele o gradiente existe só de um lado da junção e o perfil do A1 continua chapado no
   piso. É um decal de multiply barato: quad preto com alpha por vértice (itemSize 4 ⇒
   USE_COLOR_ALPHA no r160), blend normal sobre HDR linear ⇒ resultado = piso × (1 - alpha),
   que é exatamente uma máscara de oclusão aplicada ANTES do tonemap. */
export class ContactSkirt {
  constructor(opts = {}) {
    this.low = !!opts.low;
    this.reach = opts.reach != null ? opts.reach : SKIRT_REACH;
    this.alpha = opts.alpha != null ? opts.alpha : SKIRT_ALPHA;
    this.items = [];
    // low: 2 anéis (queda linear). med/high: 3 anéis, o do meio a 40 % do alcance com 40 %
    // da opacidade — aproxima a queda quadrática (1-t)² e concentra o escuro no contato.
    this.loops = this.low ? [[0, 1], [1, 0]] : [[0, 1], [0.40, 0.40], [1, 0]];
  }
  /* x,z centro da caixa; y base; w,d footprint; ry rotação */
  add(x, y, z, w, d, ry = 0) {
    if (!VAO_SKIRT) return;
    this.items.push([x, y, z, w * 0.5, d * 0.5, ry || 0]);
  }
  get vertexCount() { return this.items.length * this.loops.length * 4; }
  get triangleCount() { return this.items.length * (this.loops.length - 1) * 8; }
  build(root) {
    if (!VAO_SKIRT || !this.items.length) return null;
    const L = this.loops.length, N = this.items.length;
    const vcount = N * L * 4;
    const pos = new Float32Array(vcount * 3);
    const col = new Float32Array(vcount * 4);
    const idxArr = (vcount > 65535) ? new Uint32Array(N * (L - 1) * 24) : new Uint16Array(N * (L - 1) * 24);
    // ordem dos cantos em XZ escolhida para a normal sair em +Y (side DoubleSide cobre o resto)
    const CX = [-1, -1, 1, 1], CZ = [-1, 1, 1, -1];
    let vp = 0, cp = 0, ip = 0, vbase = 0;
    for (const [x, y, z, hw, hd, ry] of this.items) {
      const cs = Math.cos(ry), sn = Math.sin(ry);
      const yy = y + 0.015;   // 1,5 cm acima do piso: sem z-fight e sem flutuar visível
      for (let l = 0; l < L; l++) {
        const o = this.loops[l][0] * this.reach;
        const a = this.alpha * this.loops[l][1];
        for (let c = 0; c < 4; c++) {
          const lx = CX[c] * (hw + o), lz = CZ[c] * (hd + o);
          pos[vp++] = x + lx * cs + lz * sn;
          pos[vp++] = yy;
          pos[vp++] = z - lx * sn + lz * cs;
          col[cp++] = 1; col[cp++] = 1; col[cp++] = 1; col[cp++] = a;
        }
      }
      for (let l = 0; l < L - 1; l++) {
        for (let c = 0; c < 4; c++) {
          const a0 = vbase + l * 4 + c, b0 = vbase + l * 4 + ((c + 1) & 3);
          const a1 = vbase + (l + 1) * 4 + c, b1 = vbase + (l + 1) * 4 + ((c + 1) & 3);
          idxArr[ip++] = a0; idxArr[ip++] = b0; idxArr[ip++] = b1;
          idxArr[ip++] = a0; idxArr[ip++] = b1; idxArr[ip++] = a1;
        }
      }
      vbase += L * 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.setIndex(new THREE.BufferAttribute(idxArr, 1));
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000, vertexColors: true, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      // fog LIGADO de propósito: a oclusão de contato tem que sumir com a perspectiva aérea,
      // senão vira linha preta desenhada em prop a 80 m
    });
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = false; m.receiveShadow = false;
    m.renderOrder = -2;              // antes de água/fumaça, que também são transparentes
    m.frustumCulled = false;         // malha única do mapa inteiro
    m.name = 'contactSkirt';
    root.add(m);
    return m;
  }
}

/* Regra única de "essa caixa encosta no chão?" — usada pelos 5 mapas para decidir entre a
   base forte (contato real) e a base fraca (laje suspensa), e para emitir ou não a saia. */
export function onGround(y, h) { return y >= -0.15 && y <= 0.35 && h >= 0.25; }
