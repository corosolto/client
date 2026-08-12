// Loader for static GLB map props (statues, monuments) placed by procedural maps.
// Mirrors the glbchars pattern: preload templates once, then clone per placement.
// Props are OPTIONAL — placeProp returns null if the GLB isn't loaded, so a map
// renders fine before (or without) the Mint-generated assets exist.
import * as THREE from 'three';
import { VERSION } from './version.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader();
const loadGLB = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const _base = new Map(); // id -> template scene

/* ===================== CUSTO DE CENA (rodada 3) =====================
   MEDIDO em /root/shots/r2/_metrics-draw.json: loja_h 4.347 draw calls e 3,65 M
   triangulos, contra um teto de regua de 300-800 calls e 500 k tris. Duas causas
   dominantes, as duas resolvidas aqui e nao no mapa:

   (a) TODO prop GLB tinha `frustumCulled = false`. Com 59 carros no patio da Havan
       isso significa que os carros ATRAS da camera continuavam sendo desenhados —
       no passe principal E no passe de sombra. Culling ligado nao muda um pixel.
   (b) Cada prop GLB e um `clone(true)` da cena do glTF: um carro de 60 primitivas
       vira 60 draw calls, vezes 59 carros = ~1.500 calls so de lataria (e outros
       tantos na sombra). A repeticao e enorme (12 modelos para 59 vagas), entao o
       lugar certo e InstancedMesh: mesma imagem, 1 draw call por material do modelo.

   Kill-switches: `?cull=0` volta ao comportamento antigo de nao cortar nada;
   `?batch=0` desliga o instancing e o merge (cada prop volta a ser um clone). Os dois
   servem de A/B para o agente de captura provar que nao houve perda visual. */
const _qp = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
export const PROP_CULL = _qp.get('cull') !== '0';
export const PROP_BATCH = _qp.get('batch') !== '0';

export async function preloadMapProps(ids) {
  await Promise.all([...new Set(ids)].filter((id) => !_base.has(id)).map(async (id) => {
    try { const g = await loadGLB(`models/props/${id}.glb?v=${VERSION}`); _base.set(id, g.scene); }
    catch (e) { console.warn('map prop load failed', id, e); }
  }));
}

export function hasProp(id) { return _base.has(id); }

// Clone a prop, normalized so its height == targetH (metres), feet at y (default 0),
// centred on (x,z) and yawed by ry. Returns the Object3D, or null if not loaded.
//
// `targetLen` (metros, o maior eixo horizontal) liga a normalização por FICHA TÉCNICA: a
// escala passa a ser a média geométrica entre bater o comprimento e bater a altura, em vez
// de bater a altura e deixar o comprimento cair onde cair.
//
// Serve para acervo de veículo, onde altura sozinha é a régua errada: a razão
// altura/comprimento é justo o que mais varia entre eles (0,53 numa moto, 0,30 num sedã),
// então uma altura-alvo única multiplica cada modelo por um fator diferente. Medido nos 41
// veículos do Havan contra ficha de fábrica (erro = média do erro de comprimento e altura):
//
//     targetH 1,55 fixo .......... 10,3% de erro médio, pior caso moto_cg com 36%
//     só comprimento .............  4,1%, pior caso 22%
//     média geométrica ...........  3,8%, pior caso 18%   <- este
//
// Nenhum chamador antigo muda: sem `targetLen` o caminho é o targetH de sempre.
export function placeProp(id, { x = 0, y = 0, z = 0, targetH = 2.4, targetLen = 0, ry = 0 } = {}) {
  const tpl = _base.get(id);
  if (!tpl) return null;
  const o = tpl.clone(true);
  o.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(o);
  const h = (box.max.y - box.min.y) || 1;
  const len = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
  const s = targetLen ? Math.sqrt((targetLen / len) * (targetH / h)) : targetH / h;
  o.scale.setScalar(s);
  o.position.set(x, y - box.min.y * s, z);
  o.rotation.y = ry;
  // PROP_CULL: os props sao estaticos e tem bounding sphere correta vinda do accessor
  // do glTF — nao ha motivo para desligar o culling. Era o item de maior retorno da
  // auditoria de custo e nao tira nenhum pixel do frame.
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = PROP_CULL; } });
  return o;
}

/* ---------------------------------------------------------------------------
   NORMALIZACAO DE GEOMETRIA PARA MERGE/INSTANCING
   mergeGeometries() exige que todas as geometrias tenham EXATAMENTE o mesmo conjunto
   de atributos, o mesmo itemSize e todas indexadas (ou nenhuma). Geometria de glTF
   real nao cumpre nada disso: uma primitiva tem tangent, outra tem uv2, outra vem
   interleaved, outra sem indice. Aqui toda geometria e reescrita em
   {position, normal, uv} + indice Uint32 — o que tambem joga fora tangent/uv2 que
   nenhum material destes props usa (economia de VRAM de brinde).
   Uso de getX/getY/getZ de proposito: funciona igual para BufferAttribute e para
   InterleavedBufferAttribute, que e o que o GLTFLoader produz em modelo otimizado.
--------------------------------------------------------------------------- */
const _AXES = ['getX', 'getY', 'getZ', 'getW'];
function pullAttr(attr, size, count) {
  const out = new Float32Array(count * size);
  if (!attr) return out;
  const n = Math.min(size, attr.itemSize);
  for (let i = 0; i < count; i++) for (let k = 0; k < n; k++) out[i * size + k] = attr[_AXES[k]](i);
  return out;
}
export function normalizeGeo(src, mtx, opts = {}) {
  const pos = src && src.attributes && src.attributes.position;
  if (!pos || !pos.count) return null;
  const n = pos.count;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pullAttr(pos, 3, n), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(pullAttr(src.attributes.normal, 3, n), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(pullAttr(src.attributes.uv, 2, n), 2));
  if (opts.color) {
    const src3 = src.attributes.color;
    const c = src3 ? pullAttr(src3, 3, n) : new Float32Array(n * 3).fill(1);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  }
  if (src.index) {
    const ix = new Uint32Array(src.index.count);
    for (let i = 0; i < src.index.count; i++) ix[i] = src.index.getX(i);
    g.setIndex(new THREE.BufferAttribute(ix, 1));
  } else {
    const ix = new Uint32Array(n);
    for (let i = 0; i < n; i++) ix[i] = i;
    g.setIndex(new THREE.BufferAttribute(ix, 1));
  }
  if (!src.attributes.normal) g.computeVertexNormals();
  if (mtx) g.applyMatrix4(mtx);
  return g;
}

/* Mescla uma lista de geometrias JA POSICIONADAS num molde unico (mesmo material).
   Serve pra transformar um prop procedural de N pecas (cadeira de plastico, guarda-sol,
   poste) em UMA geometria que depois pode ser instanciada N vezes. */
export function mergeParts(list) {
  const norm = list.map((g) => normalizeGeo(g, null)).filter(Boolean);
  if (!norm.length) return null;
  return norm.length === 1 ? norm[0] : mergeGeometries(norm, false);
}

/* Merge de geometria ESTATICA por material. Serve para tudo que nunca se move (muro,
   colunata, meio-fio, guias pintadas, degraus): mesma imagem na tela, 1 draw call por
   material em vez de 1 por caixa. Nao mexe em collider — o mapa continua registrando
   os colliders que sempre registrou; aqui so entra a malha. */
export class StaticBatch {
  constructor(opts = {}) { this.groups = new Map(); this.name = opts.name || 'batch'; }
  /* geo: BufferGeometry ja no espaco local do objeto; mtx: Matrix4 de mundo;
     mat: material (unico); opts.cast/receive/order agrupam por comportamento. */
  add(geo, mtx, mat, opts = {}) {
    if (!geo || !mat) return false;
    const cast = opts.cast !== false, recv = opts.receive !== false, order = opts.order || 0;
    const key = `${mat.uuid}|${cast ? 1 : 0}|${recv ? 1 : 0}|${order}`;
    let g = this.groups.get(key);
    if (!g) { g = { mat, cast, recv, order, list: [] }; this.groups.set(key, g); }
    // color: os materiais de AO de vértice (vao.js) usam vertexColors — sem o atributo o
    // shader lê vec3(0) e a peça sai PRETA. Emitir sempre branco custa 12 B/vértice e
    // deixa qualquer material mesclável com qualquer outro do mesmo grupo.
    const nb = normalizeGeo(geo, mtx, { color: true });
    if (!nb) return false;
    g.list.push(nb);
    return true;
  }
  build(root) {
    const out = [];
    for (const g of this.groups.values()) {
      let mesh;
      if (g.list.length === 1) mesh = new THREE.Mesh(g.list[0], g.mat);
      else {
        const merged = mergeGeometries(g.list, false);
        if (!merged) { for (const geo of g.list) { const m = new THREE.Mesh(geo, g.mat); m.castShadow = g.cast; m.receiveShadow = g.recv; m.renderOrder = g.order; root.add(m); out.push(m); } continue; }
        mesh = new THREE.Mesh(merged, g.mat);
      }
      mesh.castShadow = g.cast; mesh.receiveShadow = g.recv; mesh.renderOrder = g.order;
      mesh.name = this.name;
      root.add(mesh); out.push(mesh);
    }
    this.groups.clear();
    return out;
  }
}

/* ---------------------------------------------------------------------------
   PropBatch — instancia props GLB repetidos.
   Um "part" e (geometria mesclada de todas as primitivas daquele material) + material.
   Um modelo de carro com 17 materiais vira 17 parts; 5 copias desse carro no patio
   custam 17 draw calls em vez de 5 x 60. Kill-switch `?batch=0`.

   BUCKET: instancia tudo junto mata o frustum culling (a bounding sphere de um
   InstancedMesh que cobre o patio inteiro nunca sai da tela). Por isso as instancias
   sao agrupadas em blocos espaciais de `bucket` metros — assim o bloco atras da
   camera continua sendo cortado, e o custo e so ~1 call por bloco ocupado.
--------------------------------------------------------------------------- */
const _partsCache = new Map();   // id|tag -> parts[]

function templateParts(id, tpl, opts) {
  const tag = opts.tag || '';
  const ck = `${id}|${tag}`;
  if (_partsCache.has(ck)) return _partsCache.get(ck);
  tpl.updateMatrixWorld(true);
  const inv = tpl.matrixWorld.clone().invert();
  const byMat = new Map();
  let bad = false;
  tpl.traverse((m) => {
    if (!m.isMesh || !m.geometry) return;
    // SkinnedMesh/morph: instanciar quebraria a animacao — cai no clone antigo
    if (m.isSkinnedMesh || (m.geometry.morphAttributes && Object.keys(m.geometry.morphAttributes).length)) { bad = true; return; }
    if (Array.isArray(m.material)) { bad = true; return; }
    const local = inv.clone().multiply(m.matrixWorld);
    const geo = normalizeGeo(m.geometry, local);
    if (!geo) return;
    let g = byMat.get(m.material);
    if (!g) { g = { mat: m.material, list: [] }; byMat.set(m.material, g); }
    g.list.push(geo);
  });
  if (bad || !byMat.size) { _partsCache.set(ck, null); return null; }
  const parts = [];
  let total = 0;
  for (const g of byMat.values()) {
    const geo = g.list.length === 1 ? g.list[0] : mergeGeometries(g.list, false);
    if (!geo) continue;
    const tris = geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
    total += tris;
    // material proprio por modelo: quem recebe cor por instancia precisa nascer branco
    // (instanceColor MULTIPLICA o diffuse), e nao podemos sujar o material do template.
    const paint = !!(opts.paintTest && opts.paintTest(g.mat));
    let mat = g.mat;
    if (paint || opts.matTweak) {
      mat = g.mat.clone();
      if (paint) mat.color = new THREE.Color(0xffffff);
      if (opts.matTweak) opts.matTweak(mat, paint);
    }
    parts.push({ geo, mat, paint, tris });
  }
  // sombra: as primitivas minusculas (emblema, retrovisor, friso) nao mudam a silhueta
  // projetada e custam metade do passe de sombra. `shadowMin` e a fracao de triangulos
  // do modelo abaixo da qual a peca deixa de projetar sombra.
  const smin = opts.shadowMin || 0;
  for (const p of parts) p.cast = smin <= 0 || (p.tris / Math.max(1, total)) >= smin;
  _partsCache.set(ck, parts);
  return parts;
}

export class PropBatch {
  /* opts.bucket  — lado do bloco espacial em metros (0 = tudo num grupo so)
     opts.paintTest(material) -> bool  — quais materiais recebem cor por instancia
     opts.matTweak(material, isPaint)  — ajuste fino (roughness etc.)
     opts.shadowMin — fracao minima de triangulos para a peca projetar sombra
     opts.tag — sufixo do cache de parts (dois mapas podem querer tweaks diferentes) */
  constructor(opts = {}) { this.opts = opts; this.bucket = opts.bucket || 0; this.by = new Map(); }
  /* Mesma assinatura de placeProp + `color` (hex) para pintura por instancia.
     Retorna false se o GLB nao carregou — o chamador cai no fallback dele, igual antes. */
  add(id, { x = 0, y = 0, z = 0, targetH = 2.4, targetLen = 0, ry = 0, color = null } = {}) {
    if (!_base.has(id)) return false;
    let l = this.by.get(id);
    if (!l) { l = []; this.by.set(id, l); }
    l.push({ x, y, z, targetH, targetLen, ry, color });
    return true;
  }
  build(root) {
    const dummy = new THREE.Object3D();
    const box = new THREE.Box3();
    for (const [id, list] of this.by) {
      const tpl = _base.get(id);
      if (!tpl) continue;
      const parts = PROP_BATCH ? templateParts(id, tpl, this.opts) : null;
      if (!parts) {   // modelo nao instanciavel (skinned/multi-material) ou ?batch=0
        for (const p of list) { const o = placeProp(id, p); if (o) root.add(o); }
        continue;
      }
      // altura do template medida UMA vez (placeProp media por copia)
      tpl.updateMatrixWorld(true);
      box.setFromObject(tpl);
      const th = (box.max.y - box.min.y) || 1, minY = box.min.y;
      const tlen = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;   // ver targetLen no placeProp
      // agrupa por bloco espacial para o frustum culling continuar valendo
      const buckets = new Map();
      for (const p of list) {
        const k = this.bucket ? `${Math.floor(p.x / this.bucket)}_${Math.floor(p.z / this.bucket)}` : '0';
        let b = buckets.get(k); if (!b) { b = []; buckets.set(k, b); }
        b.push(p);
      }
      for (const items of buckets.values()) {
        for (const part of parts) {
          const im = new THREE.InstancedMesh(part.geo, part.mat, items.length);
          items.forEach((p, i) => {
            const s = p.targetLen ? Math.sqrt((p.targetLen / tlen) * (p.targetH / th)) : p.targetH / th;
            dummy.position.set(p.x, p.y - minY * s, p.z);
            dummy.rotation.set(0, p.ry, 0);
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            im.setMatrixAt(i, dummy.matrix);
            if (part.paint && p.color != null) im.setColorAt(i, new THREE.Color(p.color));
          });
          im.instanceMatrix.needsUpdate = true;
          if (im.instanceColor) im.instanceColor.needsUpdate = true;
          // opts.cast === false: o lote inteiro sai do passe de sombra (usado pelo que ja
          // esta dentro da sombra de outra coisa — ver a loja da Havan)
          im.castShadow = this.opts.cast !== false && part.cast !== false; im.receiveShadow = true;
          im.frustumCulled = PROP_CULL;
          im.computeBoundingSphere();
          root.add(im);
        }
      }
    }
    this.by.clear();
  }
}

/* Instanciador generico de geometria PROCEDURAL repetida (bandeirinha, chinelo,
   cadeira, guarda-sol, laje). Mesma ideia do PropBatch, sem glTF: o mapa registra
   matriz + cor e no fim sai 1 draw call por (geometria, material, bloco). */
export class InstBatch {
  constructor(opts = {}) { this.bucket = opts.bucket || 0; this.by = new Map(); }
  /* geo/mat DEVEM ser sempre as mesmas referencias para o mesmo grupo. */
  add(geo, mat, mtxOrObj, color = null, opts = {}) {
    const m = mtxOrObj.isObject3D ? (mtxOrObj.updateMatrix(), mtxOrObj.matrix.clone()) : mtxOrObj.clone();
    const px = m.elements[12], pz = m.elements[14];
    const bk = this.bucket ? `${Math.floor(px / this.bucket)}_${Math.floor(pz / this.bucket)}` : '0';
    const key = `${geo.uuid}|${mat.uuid}|${bk}|${opts.cast === false ? 0 : 1}`;
    let g = this.by.get(key);
    if (!g) { g = { geo, mat, cast: opts.cast !== false, list: [], cols: [] }; this.by.set(key, g); }
    g.list.push(m); g.cols.push(color);
  }
  build(root) {
    for (const g of this.by.values()) {
      const im = new THREE.InstancedMesh(g.geo, g.mat, g.list.length);
      let anyCol = false;
      g.list.forEach((m, i) => {
        im.setMatrixAt(i, m);
        if (g.cols[i] != null) { im.setColorAt(i, new THREE.Color(g.cols[i])); anyCol = true; }
      });
      im.instanceMatrix.needsUpdate = true;
      if (anyCol && im.instanceColor) im.instanceColor.needsUpdate = true;
      im.castShadow = g.cast; im.receiveShadow = true;
      im.frustumCulled = PROP_CULL;
      im.computeBoundingSphere();
      root.add(im);
    }
    this.by.clear();
  }
}

/* Memo de textura de canvas. PORQUE: rasterizar canvas sob SwiftShader e caro e os
   mapas geravam N vezes a MESMA imagem (mesma funcao, mesmos argumentos) — pool_day
   mede 594 texturas. A chave e a lista de argumentos; quem quiser variacao de escala
   usa clone()+repeat, que compartilha o `source` (1 textura na GPU). */
export function memoTex(fn) {
  const cache = new Map();
  return (...a) => {
    const k = a.join('');
    let t = cache.get(k);
    if (t === undefined) { t = fn(...a); cache.set(k, t); }
    return t;
  };
}
