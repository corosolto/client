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
