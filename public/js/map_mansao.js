// MANSAO JOÁ (fy_mansao) — spec plans/14-MANSAO_JOA.md. Eixo longo = z; norte = -z
// (terraço/mar, spawn B), sul = +z (portão/jardim, spawn A); planta e dimensões na spec.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch, InstBatch, memoTex } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { detailFor } from './textures.js';
import { applyLook } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { createWater } from './water.js';
import { AMB_LOOPS } from './soundscape.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
export const HALF_X = 22, HALF_Z = 36;
const LAJE_H = 4.5;  // pé-direito duplo

/* Frota da garagem (BUG-56): dimensões de fábrica, mesma ficha do CAR_DIM do map_havan.js
   (tools/eval/escala-veiculo-check.mjs); cada carro tem que caber no colisor da vaga (4,10 m). */
const GARAGEM = [
  ['1968_volkswagen_beetle', 4.03, 1.50],
  ['2014_mini_cooper_s_f56', 3.85, 1.41],
  ['2002_volkswagen_golf_r32_mk4', 4.15, 1.44],
];

/* Piscina ENTRÁVEL (plans/13): fundo -1,85 abaixo do guarda-corpo MAP6 (QUEDA_ANDAR 2,0);
   z1=-26,5 porque a 2ª fileira do armário nasce em -25,6 NO DECK (pickup-check H_MIN). */
export const PISCINA = { x0: -5.5, x1: 5.5, z0: -32.5, z1: -26.5, raso: -0.85, fundo: -1.85 };

/* Jardim BUG-64: 8 espécies tropicais em GLB (lote 4 do props/FONTE.md); o
   procedural vira fallback de node/?glb=0 — zonas e colisores não mudam. */
const JARDIM_VEG = ['palmeira_imperial', 'palmeira_ravenala', 'heliconia', 'costela_adao', 'bananeira', 'ixora', 'agave', 'samambaia'];

export const MANSAO_PROPS = ['mesa_guardasol', 'guarda_sol', ...GARAGEM.map(([id]) => id), ...JARDIM_VEG,
  // BUG-56, pack Mint "Mansão do Joá — jardim e casa": set dressing de jardim/fachada
  'banco_jardim', 'poste_jardim', 'escultura_jardim', 'vaso_tropical', 'lounge_externo', 'lampiao_fachada'];

export function buildMansao(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) { if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); } if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap; }
    return m;
  };
  /* Hardscape do jardim (crítico v2.1: cor chapada = Minecraft): texturas DataTexture
     — existem em node, que é onde as réguas G5/SUP1/SUP2 medem. Em addBox a UV sai em
     METROS (vao.js escalaUVporMundo → 128 px/m); em addFloor o `repeat` vem do tamanho
     do mundo (TILE_M), senão a UV 0→1 borra o piso (era o TEXEL2 deste mapa). */
  const TILE_M = 2.0;   // metros por volta de UV — texel-tetos.mjs METROS_POR_TILE
  const texProcedural = memoTex((S, fn) => {
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) data.set([...fn(x, y), 255], (y * S + x) * 4);
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = LOWQ ? 4 : 8;   // chão é visto rasante o tempo todo (texel-tetos ANISO_MIN 4)
    t.needsUpdate = true;
    return t;
  });
  /* SUP1/SUP2 (mapa-novo-gate): 95,7% dos materiais deste mapa nasciam SEM `map` — o pior
     do acervo. A cor de cada peça agora é a cor ANTIGA DIVIDIDA PELA MÉDIA DA TEXTURA EM
     LINEAR: `map` escuro × cor média deixa a peça PRETA (map_campomorro.js:103-140 conserta
     isso à mão; aqui a divisão é feita pela aritmética, que não erra ao trocar a textura). */
  const s2l = (b) => { const c = b / 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  const mediaLin = (tex) => {
    if (tex.userData.mediaLin) return tex.userData.mediaLin;
    const d = tex.image.data; let r = 0, g = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += s2l(d[i]); g += s2l(d[i + 1]); b += s2l(d[i + 2]); }
    const n = d.length / 4;
    const m = [r / n, g / n, b / n].map((v) => Math.max(.02, v));
    tex.userData.mediaLin = m; return m;
  };
  const _alvo = new THREE.Color();
  const corSobreTex = (hex, tex) => {
    const m = mediaLin(tex);
    _alvo.set(hex);   // ColorManagement: .r/.g/.b já em LINEAR, que é onde a divisão vale
    return new THREE.Color().setRGB(Math.min(1, _alvo.r / m[0]), Math.min(1, _alvo.g / m[1]), Math.min(1, _alvo.b / m[2]));
  };
  const matTex = (tex, hex, extra) => lam({ map: tex, color: corSobreTex(hex, tex), ...extra });
  // PlaneGeometry tem UV 0→1: sem repeat pelo tamanho, um piso de 30 m fica a 1,5 px/m.
  const matPiso = (tex, hex, w, d, extra) => {
    const t = tex.clone();
    t.repeat.set(Math.max(1, Math.abs(w) / TILE_M), Math.max(1, Math.abs(d) / TILE_M));
    t.needsUpdate = true;
    return lam({ map: t, color: corSobreTex(hex, tex), ...extra });
  };
  // concreto de fôrma: fiadas de 0,5 m + junta de painel + nuance; tile 2 m (S=256)
  const texturaMuro = () => texProcedural(256, (x, y) => {
    const junta = x < 3 || (y % 64) < 2, n = ((x * 17 + y * 31) % 19) - 9;
    const b = junta ? 138 : 196 + n;
    return [b, b - 3, b - 8];
  });
  const MAT_MURO = lam({ map: texturaMuro(), roughness: .85 });
  // ripado de madeira: ripa de 12,5 cm com fresta escura e tom por tábua; tile 1 m
  const texturaRipado = () => texProcedural(128, (x, y) => {
    const fresta = (x % 16) < 2, tom = (((x >> 4) * 37) % 5 - 2) * 5, n = ((x * 5 + y * 11) % 9) - 4;
    return fresta ? [40, 27, 19] : [114 + tom + n * 2, 81 + tom + n, 59 + tom + n];
  });
  // portão de aço: lâminas horizontais grafite-azuladas com fio de luz, não o #2a2a2a chapado
  const texturaPortao = () => texProcedural(128, (x, y) => {
    const lam2 = y % 16, n = ((x * 7 + y * 13) % 7) - 3;
    const b = lam2 < 3 ? 24 : 58 + n + (lam2 === 4 ? 16 : 0);
    return [b - 2, b, b + 5];
  });
  /* PALETA — uma textura por família de superfície, compartilhada por todas as peças
     (o "COMPARTILHAR o material entre as repetições" do corrego-superficie-check). Base
     clara de propósito: a cor da peça multiplica o mapa, e textura escura só serve a
     alvo escuro. */
  const TX = {
    // reboco fino de fachada/laje: nuance de desempenadeira, sem desenho legível
    estuque: texProcedural(256, (x, y) => {
      const n = ((x * 13 + y * 29) % 11) - 5, faixa = Math.round(Math.sin((x + y * .35) * .08) * 4);
      const b = 247 + n + faixa; return [b, b - 2, b - 5];
    }),
    // placa de grande formato: junta de 1 m (S=256, tile 2 m) — a antiga era 16² = 1,5 px/m
    laje: texProcedural(256, (x, y) => {
      const junta = x % 128 < 2 || y % 128 < 2, n = ((x * 7 + y * 17) % 9) - 4;
      const b = junta ? 176 : 222 + n; return [b, b - 3, b - 9];
    }),
    forro: texProcedural(256, (x, y) => {
      const junta = x % 85 < 2 || y % 128 < 2, n = ((x * 11 + y * 5) % 7) - 3;
      const b = junta ? 198 : 238 + n; return [b, b - 1, b - 4];
    }),
    // areia/rocha molhada do leito: mancha grande + grão fino
    areia: texProcedural(256, (x, y) => {
      const grao = ((x * 31 + y * 17) % 23) - 11;
      const mancha = Math.round(Math.sin(x * .05) * Math.cos(y * .043) * 16);
      const b = 176 + grao + mancha; return [b, b - 6, b - 18];
    }),
    // granito/pedra: salpico de dois tamanhos
    pedra: texProcedural(256, (x, y) => {
      const p = ((x * 41 + y * 23) % 29) - 14, q = ((x >> 3) * 13 + (y >> 3) * 7) % 17 - 8;
      const b = 196 + p + q; return [b, b - 2, b - 7];
    }),
    // azulejo de piscina: pastilha de 10 cm com rejunte (tile 2 m ⇒ 12,8 px por pastilha)
    azulejo: texProcedural(256, (x, y) => {
      const rej = (x % 13) < 2 || (y % 13) < 2, n = ((x * 19 + y * 11) % 13) - 6;
      const b = rej ? 168 : 226 + n; return [b - 6, b, b];
    }),
    // folha: nervura central e sombreado — o verde vem da cor da peça
    folha: texProcedural(128, (x, y) => {
      const nerv = Math.abs((y % 32) - 16) < 1.5, veia = Math.abs(((x + (y % 16) * 2) % 24) - 12) < 1;
      const n = ((x * 7 + y * 13) % 15) - 7;
      const b = nerv ? 232 : veia ? 186 : 208 + n; return [b - 8, b, b - 12];
    }),
    // trama de tecido: urdidura e trama em xadrez fino
    tecido: texProcedural(128, (x, y) => {
      const trama = ((x >> 1) + (y >> 1)) % 2 === 0, n = ((x * 5 + y * 23) % 9) - 4;
      const b = (trama ? 243 : 226) + n; return [b, b - 2, b - 4];
    }),
    // metal escovado: risco horizontal fino
    metal: texProcedural(128, (x, y) => {
      const risco = ((x * 37 + (y % 3) * 11) % 19) - 9, n = ((y * 7) % 5) - 2;
      const b = 214 + risco * .7 + n; return [b - 3, b, b + 4];
    }),
    // pintura/plástico: grão de verniz, só para a peça não ser cor pura
    liso: texProcedural(64, (x, y) => {
      const n = ((x * 17 + y * 31) % 9) - 4; const b = 250 + n; return [b, b, b - 1];
    }),
    /* tábua CLARA para tingir: o ripado de fachada tem média 0,15 em linear (madeira
       escura), e servir de base para uma peça mais clara que ele só entrega a peça
       escurecida — a cor não pode passar de 1. Esta é a mesma ripa, em tom de base. */
    tabua: texProcedural(128, (x, y) => {
      const fresta = (x % 16) < 2, tom = (((x >> 4) * 37) % 5 - 2) * 6, n = ((x * 5 + y * 11) % 9) - 4;
      const veio = Math.abs(((x * 3 + y * 7) % 37) - 18) < 2 ? -12 : 0;
      const b = fresta ? 176 : 238 + tom + n + veio; return [b, b - 3, b - 8];
    }),
  };
  TX.aco = texturaPortao();
  TX.concreto = texturaMuro();
  /* Materiais compartilhados: a peça repetida usa a MESMA referência (o corrego-superficie
     -check cobra isso por escrito — SUP1 conta material, não malha). */
  const MAT = {
    metal: matTex(TX.metal, 0x9aa0a4, { metalness: .68, roughness: .34 }),
    ferro: matTex(TX.metal, 0x292825, { metalness: .72, roughness: .42 }),
    madeira: matTex(TX.tabua, 0x8a7654, { roughness: .8 }),
    pedra: matTex(TX.pedra, 0x9a998a, { roughness: .94 }),
    tecidoClaro: matTex(TX.tecido, 0x77756f, { roughness: .78 }),
    tecidoEscuro: matTex(TX.tecido, 0x31333a, { roughness: .82 }),
  };
  /* Cor por INSTÂNCIA também tem que ser dividida pela média do mapa: o InstancedMesh
     multiplica cor da instância × cor do material × textura. */
  const _corCache = new Map();
  const corTex = (hex, tex) => {
    const k = `${hex}|${tex.uuid}`;
    let c = _corCache.get(k);
    if (!c) { c = corSobreTex(hex, tex); _corCache.set(k, c); }
    return c;
  };
  /* Folhagem procedural (o fallback de `?glb=0` e de node): geometria UNITÁRIA escalada
     na matriz, para cada família caber num draw call só. */
  const IB_FOLHA = new InstBatch();
  const GEO_FOLHA_ESF = new THREE.SphereGeometry(1, 8, 5);
  const GEO_FOLHA_CONE = new THREE.ConeGeometry(1, 1, 6);
  const GEO_COPA = new THREE.IcosahedronGeometry(1, 1);
  const GEO_CAULE = new THREE.CylinderGeometry(.75, 1, 1, 8);
  const MAT_FOLHA = matTex(TX.folha, 0xffffff, { roughness: 1 });      // tom vem da instância
  const MAT_CAULE = matTex(TX.tabua, 0xffffff, { roughness: 1 });
  const MAT_FLOR = matTex(TX.liso, 0xffffff, { roughness: .9 });   // pétala é lisa, e o verniz claro aceita tinta viva
  /* Massa grande (copa, encosta, forração) tem UV 0→1 numa peça de 3 a 15 m: com repeat 1
     a folha estica para 8 px/m (borrão, texel-check TEXEL2). O tile de 3 põe todas na banda
     sem tocar na folha pequena, que já sai a 256 px/m. */
  const TEX_FOLHA_TILE = (() => { const t = TX.folha.clone(); t.repeat.set(3, 3); t.needsUpdate = true; return t; })();
  const MAT_FOLHA_MASSA = lam({ map: TEX_FOLHA_TILE, color: corSobreTex(0xffffff, TX.folha), roughness: 1 });
  const GEO_MIOLO = new THREE.SphereGeometry(1, 9, 6);
  const GEO_MORRO = new THREE.DodecahedronGeometry(3.5, 1);
  const GEO_FORRACAO = new THREE.CircleGeometry(1, 14);
  const GEO_PEDRA_COSTAO = new THREE.DodecahedronGeometry(1, 0);
  /* Material COMPARTILHADO por (textura, cor): a folha dentro do laço criava um material
     por iteração — 486 dos 508 materiais do mapa nasciam assim, sem `map`. */
  const _matMemo = new Map();
  const matPor = (tex, hex, extra) => {
    const k = `${tex.uuid}|${hex}|${extra ? JSON.stringify(extra) : ''}`;
    let m = _matMemo.get(k);
    if (!m) { m = matTex(tex, hex, extra); _matMemo.set(k, m); }
    return m;
  };
  /* Lote LOCAL — InstancedMesh filha do PRÓPRIO grupo. O maciço e a bromélia são medidos
     pelo Box3 do grupo (mansao-garden-check G3) e pela varredura de geometria do
     mansao-water-check, então a folha não pode migrar para um lote global. */
  const loteLocal = (pai, geo, mat, lista) => {
    const im = new THREE.InstancedMesh(geo, mat, lista.length);
    lista.forEach((t, i) => {
      _obj.position.set(t.p[0], t.p[1], t.p[2]);
      _obj.rotation.set(t.r[0], t.r[1], t.r[2]);
      _obj.scale.set(t.s[0], t.s[1], t.s[2]);
      _obj.updateMatrix(); im.setMatrixAt(i, _obj.matrix);
      if (t.c) im.setColorAt(i, t.c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = true; im.receiveShadow = true;
    im.userData.nonSolidSurface = true;   // folhagem não é sólido: MAP1 não pode lê-la como chão
    im.computeBoundingBox(); im.computeBoundingSphere();
    pai.add(im);
    return im;
  };
  /* 0xb3a997 = o albedo MEDIDO do piso anterior (mapa 16² × cor, com 23% de junta grossa
     dentro da média): a troca é de densidade (16² → 256² com tile de 2 m e junta fina),
     não de tom. */
  const pisoInterior = matPiso(TX.laje, 0xb3a997, 30, 23, { roughness: .34 });
  let TEX = {
    concrete: lam({ map: T.concrete }), grass: lam({ map: T.grass }), dirt: lam({ map: T.dirt }),
    marble: lam({ map: T.concrete, color: 0xeee9df, roughness: 0.22 }),
    garden: lam({ map: T.grass, roughness: 1 }), deck: lam({ map: T.dirt, color: 0x9a7654, roughness: 0.72 }),
  };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 3, ry = 3) => { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
    TEX.marble = lam({ map: load('/img/textures/mansao_streetart_marble.webp', 4, 4), roughness: 0.15, metalness: 0.05 });
    TEX.garden = lam({ map: load('/img/textures/tex_mansao_lawn.webp', 11, 15.6), roughness: 1.0 });   // grama limpa v2.1: tex_garden tinha flor 2D gigante e xadrez de pedra assados
    TEX.garden.map.wrapS = TEX.garden.map.wrapT = THREE.MirroredRepeatWrapping;   // tile 4 m sem emenda
    TEX.deck = lam({ map: load('/img/textures/tex_deck.webp', 3, 6), roughness: 0.7 });
    TEX.concrete = lam({ map: load('/img/textures/concrete_br.webp', 2, 2) });
  }
  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING }) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      // vidro segura o corpo mas não a bala: transparente fica fora de occluders (BUG-54)
      if (!(mat && mat.transparent && (mat.opacity === undefined || mat.opacity < 0.9))) occluders.push(m);
    } else if (opts.bala) occluders.push(m);   // visível dentro de colisor alheio: a bala tem que parar nele
    return m;
  }
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  const PB = new PropBatch({ bucket: 24 });
  /* LOTES INSTANCIADOS (mapprops InstBatch) — ripa, brise, degrau, corrimão, vaso e
     folhagem repetem a MESMA caixa dezenas de vezes; solta, cada uma é um draw call (o
     mapa mediu 2.038 no #589, o teto do jogo). O lote é POR TAMANHO porque a UV em metros
     e a banda de AO são assadas na geometria (vao.js aoBoxGeo), não na matriz.
     IB_BALA é varrido para `occluders` junto com o PB (a bala tem que parar na ripa);
     IB_LEVE fica fora — degrau e folhagem nunca pararam bala neste mapa. */
  const IB_BALA = new InstBatch();
  const IB_LEVE = new InstBatch();
  const _mtx = new THREE.Matrix4();
  const loteGeo = new Map();
  const loteBox = (lote, w, h, d, mat, x, y, z, opts = {}) => {
    const solo = onGround(y, h) && !opts.ry;
    const k = `${w}|${h}|${d}|${solo ? 1 : 0}|${mat.uuid}`;
    let e = loteGeo.get(k);
    // aoMat consome o handoff de UV da aoBoxGeo ANTERIOR: os dois ficam colados de propósito
    if (!e) { const geo = aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING }); e = { geo, mat: aoMat(mat) }; loteGeo.set(k, e); }
    _mtx.makeRotationY(opts.ry || 0); _mtx.setPosition(x, y + h / 2, z);
    lote.add(e.geo, e.mat, _mtx, opts.cor ?? null, { cast: opts.cast !== false });
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    if (opts.collide) colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
  };
  /* Malha repetida que não é caixa (folha, copa, caule): mesma geometria, mesma
     referência de material, cor por instância. */
  const _obj = new THREE.Object3D();
  const lotePeca = (lote, geo, mat, pos, rot, esc, cor = null, cast = true) => {
    _obj.position.set(pos[0], pos[1], pos[2]);
    _obj.rotation.set(rot[0], rot[1], rot[2]);
    _obj.scale.set(esc[0], esc[1], esc[2]);
    _obj.updateMatrix();
    lote.add(geo, mat, _obj.matrix, cor, { cast });
  };
  const GLB_ON = QP.get('glb') !== '0';
  function propComFallback(id, x, z, h, ry, fallback) {
    const proxy = fallback();
    const obj = GLB_ON && hasProp(id) ? placeProp(id, { x, z, targetH: h, ry }) : null;
    if (obj) {
      proxy.visible = false; root.add(obj);
      // a bala testa a malha visível: proxy sai de occluders (corpo fica no collider), GLB entra
      const pi = occluders.indexOf(proxy); if (pi >= 0) occluders.splice(pi, 1);
      obj.traverse((m) => { if (m.isMesh && !(m.material && m.material.transparent && (m.material.opacity === undefined || m.material.opacity < 0.9))) occluders.push(m); });
    }
    return obj;
  }
  /* Prop do pack Mint (BUG-56) no lote PB. Colisor SEMPRE pelo chamador — a pegada não
     depende do download; fallback com a dimensão real, senão é corpo-em-sólido no MAP1. */
  const jardimProp = (id, x, z, targetH, ry, y = 0, fb = null, fallback = null) => {
    if (GLB_ON && PB.add(id, { x, y, z, targetH, ry })) return true;
    if (fallback) { fallback(); return false; }
    const [w, d, h] = fb || [0.6, 0.6, targetH];
    addBox(w, h, d, MAT.madeira, x, y, z, { ry, collide: false });
    return false;
  };

  /* CÉU */
  const { hemi, sun } = applyLook(scene, T, 'fy_mansao', { nofog: QP.get('nofog') === '1' });
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 150; sun.shadow.bias = -0.0006;

  /* CHÃO — gramado cortado no recorte da piscina/vertedouro: sem o corte o plano de
     grass atravessa a cuba. Mesmo corte do córrego (map_corrego.js:428-435). */
  const gramado = TEX.garden || lam({ map: T.grass });
  addFloor(HALF_X * 2, 62.45, 0, 4.775, gramado, -0.01);
  addFloor(15.65, 9.05, -14.175, -30.975, gramado, -0.01);
  addFloor(15.65, 9.05, 14.175, -30.975, gramado, -0.01);

  /* ===================== CASA (interior jogável) =====================
     Planta: retângulo de 30×16 m. Paredes externas com vãos de porta/janela.
     Mezanino parcial (escritório) a y=4,5. Piso de mármore. */
  const CASA = { x0: -15, x1: 15, z0: -15, z1: 8 };
  // piso de mármore
  const pisoCasa=addFloor(CASA.x1 - CASA.x0, CASA.z1 - CASA.z0, (CASA.x0 + CASA.x1) / 2, (CASA.z0 + CASA.z1) / 2, pisoInterior, 0.02);
  pisoCasa.userData.mansaoFeature='interior-surface'; pisoCasa.userData.surfaceType='floor';
  // contrapiso sólido (bala não atravessa)
  addBox(CASA.x1 - CASA.x0, 0.12, CASA.z1 - CASA.z0, matTex(TX.concreto, 0x909088), (CASA.x0 + CASA.x1) / 2, -0.12, (CASA.z0 + CASA.z1) / 2);

  // paredes externas (com vãos de porta)
  const MAT_WALL = lam({ map: TEX.concrete.map || null, color: 0xf5f0e8, roughness: 0.9 });  // branco modernista texturizado
  function paredeComVao(x, z, w, d, h, vaoCentro, vaoLarg) {
    if (vaoLarg >= w) return;
    const antes = vaoCentro - w/2 + vaoLarg/2;
    const depois = w/2 + w/2 - (vaoCentro + vaoLarg/2);
    if (antes > 0.5) addBox(antes, h, d, MAT_WALL, x - w/2 + antes/2, 0, z);
    if (depois > 0.5) addBox(depois, h, d, MAT_WALL, x + vaoCentro + vaoLarg/2 + depois/2, 0, z);
    // sólido das paredes (não do vão)
    if (antes > 0.5) solids.push({ x0: x - w/2, x1: x - w/2 + antes, z0: z - d/2, z1: z + d/2 });
    if (depois > 0.5) solids.push({ x0: x + vaoCentro + vaoLarg/2, x1: x + vaoCentro + vaoLarg/2 + depois, z0: z - d/2, z1: z + d/2 });
  }
  // parede sul (frente — porta central de 4 m)
  paredeComVao(0, CASA.z1, CASA.x1 - CASA.x0, 0.3, 4.0, 0, 4.0);
  // parede norte (fundo — porta pro terraço de 6 m)
  paredeComVao(0, CASA.z0, CASA.x1 - CASA.x0, 0.3, 4.0, 0, 6.0);
  // parede leste (janela grande — vão de 5 m no centro)
  paredeComVao(CASA.x1, 0, 0.3, CASA.z1 - CASA.z0, 4.0, 0, 5.0);
  // parede oeste (porta da garagem — vão de 3 m)
  paredeComVao(CASA.x0, 0, 0.3, CASA.z1 - CASA.z0, 4.0, 2.0, 3.0);
  // As laterais usam segmentos no eixo z; a função acima trabalha no eixo x.
  for (const [x, z, d] of [[CASA.x1, -10, 10], [CASA.x1, 6.5, 3], [CASA.x0, -7.25, 15.5], [CASA.x0, 6, 4]])
    addBox(0.3, 4.0, d, MAT_WALL, x, 0, z);
  // O vidro é fechamento real: segura corpo/tiro, enquanto as portas continuam vazadas.
  for (const [vx, vz, vw, vd] of [[CASA.x1 - 0.02, 0, 0.06, 5.0]]) {
    addBox(vw, 3.5, vd, matTex(TX.liso, 0xa0c8e0, { transparent: true, opacity: 0.2 }), vx, 0.3, vz);
  }
  // Divisórias deixam cozinha, sala e home theater reconhecíveis sem criar becos cegos.
  for (const [x, z, w, d] of [[-9.5,-6.5,11,.18],[9.75,-6.5,3.5,.18],[14.5,-6.5,1,.18],[-4,4.5,.18,7],[-4,-4.5,.18,3]])
    addBox(w, 3.1, d, MAT_WALL, x, 0, z);
  // Vergas e painéis ripados quebram o branco contínuo e enquadram as passagens.
  const ripado = lam({ map: texturaRipado(), roughness: 0.72 });
  for (let x = -13; x <= 13; x += 0.42) loteBox(IB_BALA, 0.12, 2.7, 0.08, ripado, x, 0.2, CASA.z0 + 0.24, { skirt: false });

  // Casca modernista: lajes finas em balanço e vidro contínuo fecham a leitura de "planta aberta".
  const glass = matTex(TX.liso, 0x9bd0df, { transparent: true, opacity: 0.24, metalness: 0.08, roughness: 0.12, side: THREE.DoubleSide });
  const caixilho = matTex(TX.metal, 0x596263, { metalness: .7, roughness: .25 });
  const caixilhoEscuro = matTex(TX.metal, 0x3b4244, { metalness: .7, roughness: .28 });
  const concretoClaro = lam({ map: TEX.concrete.map || null, color: 0xe8e4dc, roughness: 0.72 });
  // O vazio central e a faixa de vidro recortam a cobertura que antes parecia uma placa única.
  for (const [x,z,w,d] of [[-11.4,2.6,9.7,10.5],[11.4,2.6,9.7,10.5],[0,6.15,13.1,3.4],[0,-.35,13.1,2.4]])
    addBox(w, .22, d, concretoClaro, x, 4.03, z, { skirt: false });
  for (const [x,z,w,d] of [[-11.4,2.6,9.55,10.35],[11.4,2.6,9.55,10.35],[0,6.15,12.95,3.25],[0,-.35,12.95,2.25]]) {
    // 0xdbd3c3 = produto exato do estado anterior (mapa 0xe7e1d7 × cor 0xf8f4ed) em linear
    const forro=addFloor(w,d,x,z,matPiso(TX.forro,0xdbd3c3,w,d,{ roughness:.82, side:THREE.DoubleSide }),4.025);
    forro.userData.mansaoFeature='interior-surface'; forro.userData.surfaceType='ceiling';
  }
  // Pilares e fáscias revelam o caminho estrutural das lajes em balanço. Sem eles,
  // a captura 3:2 lia quatro placas brancas flutuando, não arquitetura modernista.
  for (const [x,z] of [[-14.1,-1.8],[-8.7,7.2],[8.7,7.2],[14.1,-1.8],[-5.8,-1.4],[5.8,-1.4]])
    addBox(.34, 4.03, .34, concretoClaro, x, 0, z);
  for (const [x,z,w,d] of [[-11.4,7.82,9.7,.34],[11.4,7.82,9.7,.34],[-16.08,2.6,.34,10.5],[16.08,2.6,.34,10.5]])
    addBox(w, .42, d, concretoClaro, x, 3.82, z, { collide: false, skirt: false });
  addBox(9.2, .06, 4.2, glass, 0, 4.08, 2.55, { collide: false, cast: false, skirt: false });
  for (const x of [-4.6,0,4.6]) addBox(.055,.12,4.25,caixilho,x,4.06,2.55,
    { collide: false, skirt: false });
  for (const [x,w] of [[-7.7,10.1],[7.7,10.1]]) addBox(w, .24, 8.2, concretoClaro, x, 6.18, -11.4,
    { skirt: false });
  addBox(4.8, .07, 8.0, glass, 0, 6.2, -11.4, { collide: false, cast: false, skirt: false });
  addBox(7.0, 0.18, 15.0, concretoClaro, -15.7, 3.95, -3.0, { skirt: false });
  addBox(7.0, 0.18, 12.0, concretoClaro, 15.7, 3.95, -1.5, { skirt: false });
  // Beiral fino e claro coroando cada laje (crítico r3: aérea lia placa sem acabamento)
  const beiralMat = matTex(TX.estuque, 0xf5f1e6, { roughness: .6 });
  for (const [bx, bz, bw, bd, by] of [[-11.4, 2.6, 9.7, 10.5, 4.25], [11.4, 2.6, 9.7, 10.5, 4.25], [0, 6.15, 13.1, 3.4, 4.25], [0, -.35, 13.1, 2.4, 4.25],
    [-7.7, -11.4, 10.1, 8.2, 6.42], [7.7, -11.4, 10.1, 8.2, 6.42], [-15.7, -3, 7, 15, 4.13], [15.7, -1.5, 7, 12, 4.13]])
    addBox(bw + .14, .08, bd + .14, beiralMat, bx, by, bz, { collide: false, cast: false, skirt: false }).userData.mansaoFeature = 'beiral';
  // Panos segmentados: 4 m livres na entrada e 6 m livres para o terraço.
  for (const [x, z, w, d, h] of [[-7,7.82,10,.06,3.3],[7,7.82,10,.06,3.3],[-8.5,-14.78,5,.06,3.45],[8.5,-14.78,5,.06,3.45]]) {
    addBox(w, h, d, glass, x, .38, z, { cast: false, skirt: false });
    const horizontal = w > d;
    for (let i = -2; i <= 2; i++) loteBox(IB_BALA, horizontal ? .045 : .06, h, horizontal ? .06 : .045,
      caixilhoEscuro, horizontal ? x + i * w / 5 : x, .38,
      horizontal ? z : z + i * d / 5, { skirt: false });
  }
  // Brises profundos modulam a ala direita, antes uma placa branca sem escala.
  const madeiraNobre = matTex(TX.tabua, 0x704a31, { roughness: .66 });
  for (let x = 3.2; x <= 13; x += .82)
    loteBox(IB_BALA, .12, 3.45, .72, madeiraNobre, x, .28, 8.17, { skirt: false });
  for (let z = -12; z <= 5.8; z += 1.15)
    loteBox(IB_BALA, .82, 3.25, .1, madeiraNobre, 15.18, .35, z, { skirt: false });
  const matLampiao = matTex(TX.metal, 0xb98a4a, { emissive: 0x6b4a1c, emissiveIntensity: .35 });
  // Lampiões Mint (BUG-56) na fachada, sem colisor: colados à parede que já é sólida.
  for (const [lx, lz, ry] of [[-6, 8.32, 0], [6, 8.32, 0], [-8, -14.62, Math.PI], [8, -14.62, Math.PI]]) {
    jardimProp('lampiao_fachada', lx, lz, .52, ry, 2.3, null, () => addBox(.3, .42, .16, matLampiao, lx, 2.3, lz, { collide: false, cast: false, skirt: false }));
  }
  const pedraFachada = lam({ map: TEX.concrete.map || null, color: 0xb2aa98, roughness: .86 });
  for (const [z,h,y] of [[-10,1.0,.2],[-6.6,.72,1.55],[-2.8,1.1,.15],[4.7,.82,1.7]])
    addBox(.08, h, 2.5, pedraFachada, 15.2, y, z, { collide: false, cast: false, skirt: false });

  // MEZANINO parcial (escritório — z ∈ [-15, -8])
  {
    const MZ = { x0: -12, x1: 12, z0: -15, z1: -8 };
    // Poço aberto x[-4.25,-1.75]: a laje não pode atravessar a escada.
    for (const [x0, x1] of [[MZ.x0, -4.25], [-1.75, MZ.x1]]) {
      addFloor(x1 - x0, MZ.z1 - MZ.z0, (x0 + x1) / 2, (MZ.z0 + MZ.z1) / 2, TEX.marble || lam({ color: 0xe8e8e0 }), LAJE_H + 0.02);
      addBox(x1 - x0, 0.12, MZ.z1 - MZ.z0, matTex(TX.concreto, 0xa0a098), (x0 + x1) / 2, LAJE_H, (MZ.z0 + MZ.z1) / 2);
    }
    // guarda-corpo do mezanino (vão da escada no centro)
    const guarda = matTex(TX.metal, 0x333333, { metalness: 0.6 });
    addBox(0.2, 1.0, MZ.z1 - MZ.z0, guarda, MZ.x0, LAJE_H, (MZ.z0 + MZ.z1) / 2);
    // A lateral leste reserva 1,5 m para a escada de serviço.
    addBox(0.2, 1.0, 5.5, guarda, MZ.x1, LAJE_H, -10.75);
    addBox(MZ.x1 - MZ.x0, 1.0, 0.2, guarda, (MZ.x0 + MZ.x1) / 2, LAJE_H, MZ.z0);
    // Sul fechado em toda a largura, salvo a saída exata da escada x[-4,25,-1,75].
    addBox(7.6, 1.0, 0.2, guarda, -8.2, LAJE_H, MZ.z1);
    addBox(13.6, 1.0, 0.2, guarda, 5.2, LAJE_H, MZ.z1);
    // Guarda do poço: a saída fica no topo norte, não no trecho baixo da escada.
    for (const sx of [-4.25, -1.75]) addBox(.16, 1.0, 4.8, guarda, sx, LAJE_H, -10.4);
    // colunas de apoio
    for (const cx of [-8, 8]) addBox(0.4, LAJE_H, 0.4, concretoClaro, cx, 0, MZ.z0 + 0.5);
  }

  /* ESCADA (NBR 9077) subindo pro mezanino */
  const STAIR = { x0: -4.25, x1: -1.75, z0: -14.91, z1: -7.34 };
  const STAIR_SERVICE = { x0: 12.25, x1: 14.75, z0: -14.91, z1: -7.34 };
  {
    const ESC = { espelho: 0.18, piso: 0.29, n: 26 };
    const sx = -3, sz0 = -7.5, sz1 = sz0 - ESC.n * ESC.piso;
    for (let i = 0; i < ESC.n; i++) { const z = sz0 - i * ESC.piso; const y = i * ESC.espelho; loteBox(IB_LEVE, 2.5, 0.04, ESC.piso + 0.02, TEX.marble, sx, y - 0.04, z); }
    // Corrimãos acompanham os degraus e deixam a saída lateral livre no patamar alto.
    for (const lx of [sx - 1.25, sx + 1.25]) for (let i = 0; i < ESC.n; i += 3) {
      const y = i * ESC.espelho, z = sz0 - i * ESC.piso;
      const desembarque = lx === sx - 1.25 && i >= 18;
      loteBox(IB_BALA, 0.09, 0.9, 0.09, MAT.ferro, lx, y, z, { collide: !desembarque, skirt: false });
      if (i + 3 < ESC.n) loteBox(IB_BALA, 0.09, 0.09, ESC.piso * 3 + 0.1, MAT.ferro, lx, y + 0.88, z - ESC.piso * 1.5,
        { collide: !desembarque, skirt: false });
    }
  }
  // Escada de serviço no flanco leste: segunda rota física para o escritório/mezanino.
  {
    const ESC = { espelho: 0.18, piso: 0.29, n: 26 }, sx = 13.5, sz0 = -7.5;
    for (let i = 0; i < ESC.n; i++) {
      const z = sz0 - i * ESC.piso, y = i * ESC.espelho;
      loteBox(IB_LEVE, 2.5, .04, ESC.piso + .02, TEX.marble, sx, y - .04, z);
      if (i % 3 === 0) for (const lx of [sx - 1.25, sx + 1.25]) {
        const desembarque = lx === sx - 1.25 && i >= 18;
        loteBox(IB_BALA, .09, .9, .09, MAT.ferro, lx, y, z, { collide: !desembarque, skirt: false });
      }
    }
    addBox(1.0, .12, 1.4, TEX.marble, 12.25, LAJE_H - .12, -14.75);
  }

  /* COVER INTERIOR: móveis de luxo */
  const tecidoClaro = MAT.tecidoClaro;
  const tecidoEscuro = MAT.tecidoEscuro;
  // sofá (sala)
  const estarA = addBox(4.0, 0.8, 1.5, tecidoClaro, 4, 0, 0); estarA.userData.mansaoFeature = 'estar';
  const estarB = addBox(2.4, 0.82, 1.5, tecidoEscuro, 0, 0, 4); estarB.userData.mansaoFeature = 'estar';
  solids.push({ x0: 2, x1: 6, z0: -0.75, z1: 0.75 }, { x0: -1.2, x1: 1.2, z0: 3.25, z1: 4.75 });
  // Encostos, braços e tapetes dão silhueta de mobiliário em vez de caixas soltas.
  for (const [x,z,w,d,ry,mat] of [[4,-.62,3.7,.18,0,tecidoClaro],[2.12,0,.18,1.35,0,tecidoClaro],[5.88,0,.18,1.35,0,tecidoClaro],
    [0,3.38,2.2,.18,0,tecidoEscuro],[-1.12,4,.18,1.3,0,tecidoEscuro],[1.12,4,.18,1.3,0,tecidoEscuro]])
    addBox(w, .72, d, mat, x, .5, z, { collide: false, skirt: false, ry });
  addFloor(5.6, 3.4, 3.1, 1.55, matPiso(TX.tecido, 0x9a744f, 5.6, 3.4, { roughness: .92 }), .035);
  const gourmetPart=(object,tipo)=>{ object.userData.mansaoFeature='gourmet-part'; object.userData.gourmetPart=tipo; return object; };
  const theaterPart=(object,tipo)=>{ object.userData.mansaoFeature='theater-part'; object.userData.theaterPart=tipo; return object; };
  // Ilha gourmet funcional: bancada inteira, cuba/torneira, cooktop, três
  // banquetas e pendentes. A captura anterior só provava um plano cortado.
  const ilha = addBox(4.2, 1.0, 1.35, TEX.marble || lam({ color: 0xe8e8e0, roughness: 0.15 }), -8, 0, -10);
  ilha.userData.mansaoFeature = 'ilha-gourmet'; solids.push({ x0: -10.1, x1: -5.9, z0: -10.68, z1: -9.32 });
  gourmetPart(addBox(4.55,.14,1.62,TEX.marble || lam({color:0xf0ece3,roughness:.16}),-8,1.0,-10,{collide:false,skirt:false}),'countertop');
  const metalCozinha=matTex(TX.metal,0x667174,{metalness:.75,roughness:.24});
  gourmetPart(addBox(.82,.045,.54,matTex(TX.metal,0x181c1e,{metalness:.2,roughness:.2}),-9.15,1.15,-10,{collide:false,cast:false,skirt:false}),'cooktop');
  gourmetPart(addBox(.72,.04,.48,metalCozinha,-7.25,1.15,-10,{collide:false,cast:false,skirt:false}),'sink');
  const torneira=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,7,12,Math.PI),metalCozinha);
  torneira.rotation.z=Math.PI/2; torneira.position.set(-7.25,1.35,-10.12); gourmetPart(torneira,'faucet'); root.add(torneira);
  const pernaBanqueta=matTex(TX.metal,0x3a332b,{metalness:.4});
  for (const x of [-9.2,-8,-6.8]) {
    gourmetPart(addBox(.48,.52,.48,tecidoEscuro,x,0,-8.85,{ collide: false }),'stool');
    addBox(.16,.42,.16,pernaBanqueta,x,.48,-8.85,{ collide: false, skirt: false });
  }
  const pendente=matTex(TX.metal,0xa56f3c,{metalness:.45,roughness:.42,emissive:0x4d2d12,emissiveIntensity:.24});
  const fioPendente=matTex(TX.metal,0x272521,{metalness:.55});
  for(const x of [-9.3,-8,-6.7]) {
    addBox(.025,1.05,.025,fioPendente,x,2.5,-10,{collide:false,cast:false,skirt:false});
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.24,.34,10,1,true),pendente); shade.position.set(x,2.55,-10); shade.rotation.x=Math.PI; gourmetPart(shade,'pendant'); root.add(shade);
  }
  // Home theater inequívoco: tela preta, console, painéis acústicos e quatro
  // recliners com encosto/braços, não quatro caixas sem contexto.
  const tela=theaterPart(addBox(5.1,2.35,.08,matTex(TX.metal,0x090b0d,{roughness:.18}),9,.65,-14.55,{collide:false,cast:false,skirt:false}),'screen');
  const consoleMidia=theaterPart(addBox(3.4,.42,.48,matTex(TX.tabua,0x2c2724,{roughness:.5}),9,0,-14.08,{collide:false}),'media-console');
  for(const [px,pz] of [[8,-9.2],[10,-9.2],[8,-11.35],[10,-11.35]]) {
    const cadeira=theaterPart(addBox(1.08,.52,1.02,tecidoEscuro,px,0,pz),'recliner');
    addBox(.96,.86,.24,tecidoEscuro,px,.42,pz-.39,{collide:false,skirt:false});
    for(const ax of [-.53,.53]) addBox(.16,.62,.9,tecidoEscuro,px+ax,.05,pz,{collide:false,skirt:false});
    solids.push({x0:px-.62,x1:px+.62,z0:pz-.58,z1:pz+.58});
  }
  const painelAcustico=matTex(TX.tecido,0x465056,{roughness:.86});
  for(const x of [6.75,9,11.25]) theaterPart(addBox(1.55,1.25,.06,painelAcustico,x,2.05,-14.46,{collide:false,cast:false,skirt:false}),'acoustic-panel');
  // mesa de jantar
  addBox(3.0, 0.9, 1.5, matTex(TX.tabua, 0x4a3a2a, { roughness: 0.3 }), 8, 0, 4); solids.push({ x0: 6.5, x1: 9.5, z0: 3.25, z1: 4.75 });
  const divisoriaBaixa = addBox(4.8, .82, .22, ripado, -1.55, 0, 2.1);
  divisoriaBaixa.userData.mansaoFeature = 'divisoria-baixa';
  const propVivo=(object,tipo)=>{ object.userData.mansaoFeature='lived-prop'; object.userData.propType=tipo; return object; };
  // Sete famílias, pequenas e sem colisão, tiram o hall do estado de showroom vazio.
  const almofadas=new THREE.Group(); propVivo(almofadas,'almofadas');
  for(const [x,z,c] of [[3.1,-.25,0xb66e4a],[4.1,-.24,0xd0b989],[5.05,-.24,0x6c8490]]) {
    const a=new THREE.Mesh(new THREE.BoxGeometry(.62,.18,.52),matTex(TX.tecido,c,{roughness:1})); a.position.set(x,.84,z); a.rotation.y=(x-4)*.12; almofadas.add(a);
  } root.add(almofadas);
  const tapete=addFloor(4.9,2.8,3.2,1.55,matPiso(TX.tecido,0x805f49,4.9,2.8,{roughness:1}),.047); propVivo(tapete,'tapete');
  const luminariaPe=new THREE.Group(); propVivo(luminariaPe,'luminaria-de-piso');
  const haste=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,2.25,8),matTex(TX.metal,0x3b3935,{metalness:.55})); haste.position.y=1.12; luminariaPe.add(haste);
  const cupula=new THREE.Mesh(new THREE.ConeGeometry(.42,.62,12,1,true),matTex(TX.liso,0xe4cda5,{emissive:0x5d4426,emissiveIntensity:.25,side:THREE.DoubleSide})); cupula.position.y=2.12; luminariaPe.add(cupula); luminariaPe.position.set(6.7,0,1.3); root.add(luminariaPe);
  const quadro=addBox(.07,1.45,2.35,matTex(TX.tecido,0x315f68,{roughness:.7}),-14.76,1.25,-2.5,{collide:false,cast:false,skirt:false}); propVivo(quadro,'arte-original');
  const fruteira=new THREE.Group(); propVivo(fruteira,'fruteira'); fruteira.position.set(-8,1.12,-10); root.add(fruteira);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.42,.28,.16,14),matTex(TX.tabua,0x755642,{roughness:.68})); fruteira.add(bowl);
  const geoFruta=new THREE.SphereGeometry(.13,8,6);
  for(const [x,z,c] of [[-.18,0,0xd5a33b],[.12,.08,0xb84935],[.03,-.13,0x6e9a48]]) { const f=new THREE.Mesh(geoFruta,matTex(TX.liso,c)); f.position.set(x,.15,z); fruteira.add(f); }
  const louca=new THREE.Group(); propVivo(louca,'louca-cozinha'); louca.position.set(-6.8,1.04,-10); root.add(louca);
  const vidroCopo=matTex(TX.liso,0xbad5d8,{transparent:true,opacity:.7,roughness:.18});
  const geoCopo=new THREE.CylinderGeometry(.075,.06,.28,10);
  for(const x of [-.3,0,.3]) { const copo=new THREE.Mesh(geoCopo,vidroCopo); copo.position.set(x,.14,0); louca.add(copo); }
  const vaso=new THREE.Group(); propVivo(vaso,'vaso-interno'); vaso.position.set(-11.8,0,-3.7); root.add(vaso);
  // MAP1: o pote é cerâmica rígida — colisor de verdade, como os vasos do deck e os
  // troncos; `nonSolidSurface` aqui seria mentir pra régua e manter o defeito.
  const pote=new THREE.Mesh(new THREE.CylinderGeometry(.28,.36,.5,12),matTex(TX.pedra,0x9b6b4a,{roughness:.9})); pote.position.y=.25; vaso.add(pote);
  col(-12.1,-11.5,0,.5,-4.0,-3.4); occluders.push(pote);   // a bala para na cerâmica que o corpo já não atravessa
  // As FOLHAS são atravessáveis como todo o paisagismo do arquivo (cluster, palmeira, folhagem).
  for(let i=0;i<7;i++){ const a=i*Math.PI*2/7;
    lotePeca(IB_FOLHA, GEO_FOLHA_ESF, MAT_FOLHA, [-11.8+Math.sin(a)*.25,.78+Math.cos(a)*.08,-3.7+Math.cos(a)*.25], [0,a,0], [.085,.035,.35], corTex(i%2?0x386b42:0x4e8050,TX.folha)); }
  // Luz quente local impede que a cobertura do mezanino transforme os móveis em
  // silhuetas pretas; sem sombra dinâmica, o custo em mobile é pequeno.
  for (const [x,z] of [[-8,-9],[3,1],[9,-10],[-5,4]]) {
    const luz = new THREE.PointLight(0xffe0b5, 1.25, 14, 1.65); luz.position.set(x, 3.15, z);
    luz.userData.mansaoFeature='interior-fill'; root.add(luz);
  }
  // escultura modernista (cover alto)
  addBox(0.6, 2.5, 0.6, matTex(TX.pedra, 0x8a7a6a, { metalness: 0.3 }), 0, 0, -12); solids.push({ x0: -0.3, x1: 0.3, z0: -12.3, z1: -11.7 });

  /* ===================== GARAGEM (aberta) ===================== */
  // piso diferente (cimento queimado)
  addFloor(20, 7, 0, 11.5, TEX.concrete || lam({ map: T.concrete }), 0.03);
  /* Desenhos procedurais ORIGINAIS, sem traço de marca real (linha editorial); desde
     BUG-56 são o fallback do lote GLB, com o mesmo colisor da vaga. */
  /* Materiais e rodas do lote inteiro: 3 carros × 7 materiais viravam 21 materiais sem
     `map` (SUP1). A pintura é a única que muda por carro. */
  const TEX_PINTURA = (() => { const t = TX.liso.clone(); t.repeat.set(4, 4); t.needsUpdate = true; return t; })();
  const CARRO = {
    vidro: matTex(TX.metal, 0x172b34, { transparent: true, opacity: .82, roughness: .12, metalness: .28 }),
    borracha: matTex(TX.metal, 0x171717, { roughness: .96 }),
    aro: matTex(TX.metal, 0xa8ada8, { metalness: .82, roughness: .22 }),
    lamp: matTex(TX.liso, 0xf6e6bd, { emissive: 0x705c22, emissiveIntensity: .45, roughness: .35 }),
    // grade e faixas são peças de 8 cm: com o canvas de 128 a UV 0→1 dá 904 px/m (hero prop
    // sem ser hero, texel-check TEXEL3b). O canvas de 64 as põe abaixo do teto de 512.
    grade: matTex(TX.liso, 0x303538, { metalness: .45, roughness: .46 }),
    parachoque: matTex(TX.liso, 0x777b7c, { metalness: .75, roughness: .3 }),
    geoPneu: new THREE.CylinderGeometry(.31, .31, .2, 14),
    geoAro: new THREE.CylinderGeometry(.14, .14, .215, 12),
  };
  const carroGenerico = (cx, cor, estilo, ry = 0) => {
    const familias=['aurora-roadster','mare-fastback','serra-targa'];
    const g = new THREE.Group(); g.position.set(cx, 0, 11); g.rotation.y = ry;
    g.userData.mansaoFeature = 'carro-generico'; g.userData.originalDesign = `joa-${familias[estilo]}`;
    g.userData.sportsFamily=familias[estilo];
    g.userData.genericFront = true; g.userData.hoodHeight = .74;
    const pintura = matPor(TEX_PINTURA, cor, { roughness: .28, metalness: .42 });
    const vidro = CARRO.vidro, borracha = CARRO.borracha, aro = CARRO.aro;
    const parte = (geo, mat, x, y, z, tipo) => { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; if(tipo)m.userData.carPart=tipo; g.add(m); return m; };
    const dims=[[1.9,.42,4.25],[1.96,.48,4.05],[1.88,.5,3.82]][estilo];
    parte(new THREE.BoxGeometry(...dims), pintura, 0,.43,0,'body');
    if(estilo===0){
      // capô longo e cockpit aberto com dois arcos independentes
      parte(new THREE.BoxGeometry(1.72,.2,1.22),pintura,0,.72,1.32,'long-hood');
      parte(new THREE.BoxGeometry(1.48,.44,.86),vidro,0,.82,-.42,'windshield');
      for(const x of [-.48,.48]) { const arco=parte(new THREE.TorusGeometry(.23,.045,7,12,Math.PI),aro,x,1.12,-.82,'roll-hoop'); arco.rotation.y=Math.PI/2; }
    } else if(estilo===1){
      // fastback comprido em dois volumes recuados
      parte(new THREE.BoxGeometry(1.62,.58,1.28),vidro,0,.84,.05,'windshield');
      const traseira=parte(new THREE.BoxGeometry(1.58,.42,1.12),vidro,0,.72,-1.02,'fastback-roof'); traseira.rotation.x=-.13;
      parte(new THREE.BoxGeometry(1.78,.18,.82),pintura,0,.7,1.55,'short-hood');
    } else {
      // targa curto, barra estrutural clara e cobertura destacada
      parte(new THREE.BoxGeometry(1.5,.5,.82),vidro,0,.82,.22,'windshield');
      parte(new THREE.BoxGeometry(1.68,.18,.18),aro,0,1.12,-.44,'targa-bar');
      parte(new THREE.BoxGeometry(1.48,.12,.78),pintura,0,1.08,-.86,'targa-roof');
      parte(new THREE.BoxGeometry(1.72,.24,.72),pintura,0,.76,1.43,'raised-hood');
    }
    parte(new THREE.BoxGeometry(1.7,.13,.5), pintura, 0,.68,-1.7,'rear-deck');
    for (const x of [-.97,.97]) for (const z of [-1.27,1.27]) {
      const frente=z>0, wheel = parte(CARRO.geoPneu, borracha,x,.32,z,frente?'front-wheel':'wheel'); wheel.rotation.z = Math.PI/2;
      const hub=parte(CARRO.geoAro,aro,x,.32,z,'rim'); hub.rotation.z=Math.PI/2;
    }
    for (const x of [-.56,.56]) parte(new THREE.BoxGeometry(estilo===1?.5:.34,.14,.075), CARRO.lamp,x,.57,2.06,'headlight');
    const grade=CARRO.grade;
    if(estilo===0) for(const x of [-.48,0,.48]) parte(new THREE.BoxGeometry(.3,.085,.09),grade,x,.34,2.09,'grille');
    else if(estilo===1) parte(new THREE.BoxGeometry(1.18,.12,.09),grade,0,.34,2.09,'grille');
    else for(const x of [-.58,.58]) parte(new THREE.BoxGeometry(.42,.12,.09),grade,x,.34,1.96,'grille');
    parte(new THREE.BoxGeometry(1.48,.1,.1),CARRO.parachoque,0,.21,2.08,'bumper');
    root.add(g); col(cx - 1, cx + 1, 0, 1.3, 8.95, 13.05); solids.push({ x0: cx - 1, x1: cx + 1, z0: 8.95, z1: 13.05 });
    // a bala testa a malha visível do carro (vidro atravessa) — BUG-54, mesmo padrão do propComFallback
    g.traverse((m) => { if (m.isMesh && !(m.material && m.material.transparent && (m.material.opacity === undefined || m.material.opacity < 0.9))) occluders.push(m); });
    return g;
  };
  /* BUG-56: GLB do acervo no PropBatch, mesmo eixo e colisor da vaga; os InstancedMesh
     entram em `occluders` no PB.build sem o vidro (BUG-54, padrão do map_havan.js). */
  const carroAcervo = (cx, [id, cl, ch], cor, estilo, ry) => {
    if (!(GLB_ON && PB.add(id, { x: cx, y: 0, z: 11, targetLen: cl, targetH: ch, ry }))) carroGenerico(cx, cor, estilo, ry);
    else { col(cx - 1, cx + 1, 0, 1.3, 8.95, 13.05); solids.push({ x0: cx - 1, x1: cx + 1, z0: 8.95, z1: 13.05 }); }
  };
  carroAcervo(-6, GARAGEM[0], 0xa84132, 0, .04);
  carroAcervo(0, GARAGEM[1], 0x31506a, 1, 0);
  carroAcervo(6, GARAGEM[2], 0xb8b6aa, 2, -.04);

  /* ===================== JARDIM TROPICAL MODERNISTA ===================== */
  // Cadeia portão→porta (plans/13): pedras a ≤3 m uma da outra — régua G2.a do mansao-garden-check.
  const geoPedraCaminho = new THREE.CylinderGeometry(1, 1.08, .08, 7);
  for (const [px, pz, sx, sz, ry] of [[.3,33.6,1.25,.7,-.25],[-.2,32,1.55,.75,.28],[.2,30.6,1.2,.72,.4],[1.0,29.2,1.2,.72,-.5],[.2,28,1.15,.7,.35],[-.7,26.7,1.5,.8,.15],[.6,24.4,1.25,.68,-.35],[-.6,23.35,1.35,.7,.2],[-1.8,22.3,1.45,.72,.45],[.2,20.1,1.05,.82,-.2],[-1.2,18,1.3,.75,.3],[-.1,16.2,1.3,.75,.15]]) {
    const pedra = new THREE.Mesh(geoPedraCaminho, MAT.pedra);
    pedra.scale.set(sx, 1, sz); pedra.rotation.y = ry; pedra.position.set(px, .035, pz); pedra.receiveShadow = true;
    pedra.userData.mansaoFeature = 'pedra-caminho'; pedra.userData.nonSolidSurface = true; root.add(pedra);
  }
  // Espelho deslocado do eixo: base escura + lâmina viva (água da water.js, mesma
  // família RC2 do oceano/córrego) — o plano azul chapado foi reprovo do crítico.
  const eixoX=-4.2;
  addFloor(3.45,13.2,eixoX,24.8,matPiso(TX.azulejo,0x163f4b,3.45,13.2,{roughness:.5}),-.055);
  const LAMINA = { segmentos: 4, raso: 0x4eaabd, fundo: 0x16323e, profEscala: .3,
    espumaFaixa: .12, espumaMiolo: .05, profFallback: .25, ampEscala: .05, parent: root };
  const aguaEixo = createWater(scene, T, 'fy_mansao', { nivel: .025, centro: [eixoX, 24.8], tamanho: [3.25, 13.2], ...LAMINA });
  aguaEixo.mesh.userData.nonSolidSurface = true;
  for (const x of [eixoX-1.78,eixoX+1.78]) addBox(.16,.08,13.2,TEX.marble,x,.01,24.8,{ collide:false,cast:false,skirt:false });
  // espelho d'água (retangular, raso): cuba escura sob a lâmina viva
  addFloor(6, 4, -8, 25, matPiso(TX.azulejo, 0x14313d, 6, 4, { roughness: .5 }), -.04);
  const aguaEspelho = createWater(scene, T, 'fy_mansao', { nivel: .02, centro: [-8, 25], tamanho: [6, 4], ...LAMINA });
  aguaEspelho.mesh.userData.nonSolidSurface = true;
  col(-11, -5, -0.5, 0.65, 23, 27);  // topo acima dos pés: _collide realmente expulsa o corpo
  // Árvores mantêm o tronco-colisor, mas as copas deixam de ser cubos.
  const jardimAssimetrico=new THREE.Group(); jardimAssimetrico.userData.mansaoFeature='garden-asymmetry'; root.add(jardimAssimetrico);
  // Seis maciços autorados, sem pares espelhados e com três famílias de silhueta.
  // Cada grupo é geometria real; o contrato mede posição e diversidade, não um selo vazio.
  const clusterSpecs=[[-14.7,18.2,'heliconia'],[-9.9,22.8,'filodendro'],[13.5,19.7,'agave'],[8.7,29.6,'heliconia'],[-15.8,31.4,'agave'],[5.6,25.1,'filodendro']];
  clusterSpecs.forEach(([gx,gz,familia],clusterIndex)=>{
    const cluster=new THREE.Group(); cluster.position.set(gx,0,gz);
    cluster.userData.mansaoFeature='garden-cluster'; cluster.userData.gardenFamily=familia; cluster.userData.clusterIndex=clusterIndex;
    const glbOk = familia==='heliconia' ? GLB_ON && PB.add('heliconia',{x:gx,z:gz,targetH:1.35,ry:clusterIndex*1.7})
      : familia==='filodendro' ? GLB_ON && PB.add('costela_adao',{x:gx,z:gz,targetH:1.15,ry:clusterIndex*2.3})
      : GLB_ON && PB.add('agave',{x:gx,z:gz,targetH:.95,ry:clusterIndex*1.1});
    if (!glbOk) {
      /* Uma InstancedMesh POR MACIÇO (filha do próprio grupo): o Box3 do grupo e a
         varredura de geometria do mansao-water-check continuam enxergando a família,
         e o maciço inteiro sai num draw call em vez de 7–10. */
      if(familia==='heliconia') {
        const caules=[], flores=[];
        for(let i=0;i<7;i++) {
          const a=-.9+i*.3, h=.75+i*.09;
          caules.push({ p:[(i-3)*.12,h/2,Math.sin(a)*.18], r:[0,0,0], s:[.05,h,.05], c:corTex(0x397343,TX.tabua) });
          flores.push({ p:[(i-3)*.12,.82+i*.09,Math.sin(a)*.18], r:[0,0,(i-3)*.09], s:[.13,.38,.13], c:corTex(i%2?0xd64d32:0xf09a35,TX.liso) });
        }
        loteLocal(cluster, GEO_CAULE, MAT_CAULE, caules);
        loteLocal(cluster, GEO_FOLHA_CONE, MAT_FLOR, flores);
      } else if(familia==='filodendro') {
        const folhas=[];
        for(let i=0;i<9;i++) {
          const a=i*Math.PI*2/9;
          folhas.push({ p:[Math.sin(a)*.45,.42+(i%3)*.12,Math.cos(a)*.45], r:[-.48,a,0], s:[.1224,.0272,.561], c:corTex(i%2?0x347b45:0x4b9253,TX.folha) });
        }
        loteLocal(cluster, GEO_FOLHA_ESF, MAT_FOLHA, folhas);
      } else {
        const folhas=[];
        for(let i=0;i<10;i++) {
          const a=i*Math.PI*2/10;
          folhas.push({ p:[Math.sin(a)*.31,.34,Math.cos(a)*.31], r:[.68,a,0], s:[.16,.95,.16], c:corTex(i%2?0x64834a:0x78994f,TX.folha) });
        }
        loteLocal(cluster, GEO_FOLHA_CONE, MAT_FOLHA, folhas);
      }
    }
    root.add(cluster);
  });
  // Três maciços densos deslocados: volumes contínuos enquadram a aproximação e
  // retiram o jardim da leitura axial/rala sem invadir o corredor central.
  const massSpecs=[[-12.4,20.4,1.18],[11.2,25.8,.92],[-8.7,31.4,1.34]];
  massSpecs.forEach(([mx,mz,rot],mi)=>{
    const mass=new THREE.Group(); mass.position.set(mx,0,mz); mass.rotation.y=rot;
    mass.userData.mansaoFeature='garden-mass';
    const glbMass = GLB_ON && hasProp('costela_adao') && hasProp('heliconia') && hasProp('agave');
    if (glbMass) {
      PB.add('costela_adao',{x:mx,z:mz,targetH:1.5,ry:rot});
      PB.add('heliconia',{x:mx+.9,z:mz+.45,targetH:1.6,ry:rot+2.1});
      if (!LOWQ) PB.add('agave',{x:mx-.85,z:mz+.6,targetH:.8,ry:rot+4.2});
    } else {
      /* O maciço DENSO é medido malha a malha (mansao-water-check: ≥20 malhas visíveis
         por grupo), então aqui a economia é de MATERIAL, não de draw call. */
      for(let i=0;i<24;i++) {
        const a=i*Math.PI*2/24+mi*.31,r=.38+(i%6)*.17;
        const leaf=new THREE.Mesh(GEO_FOLHA_ESF,matPor(TX.folha,i%3===0?0x255f36:i%3===1?0x3d8245:0x527d3e,{roughness:1}));
        leaf.scale.set(.42*.28,.42*.10,.42*(1.45+(i%4)*.16)); leaf.rotation.set(-.42+(i%3)*.1,a,(i%2?1:-1)*.12);
        leaf.position.set(Math.sin(a)*r,.42+(i%5)*.13,Math.cos(a)*r); leaf.userData.nonSolidSurface=true; leaf.castShadow=true; mass.add(leaf);
      }
      for(let i=0;i<6;i++) {
        const flower=new THREE.Mesh(GEO_FOLHA_CONE,matPor(TX.liso,i%2?0xe06a34:0xc94334,{roughness:.9}));
        flower.scale.set(.12,.52,.12);
        flower.position.set((i-2.5)*.19,.72+(i%3)*.18,Math.sin(i)*.32); flower.rotation.z=(i-2.5)*.07;
        flower.userData.nonSolidSurface=true; flower.castShadow=true; mass.add(flower);
      }
    }
    root.add(mass);
  });
  const geoTronco = new Map();
  for (const [tx, tz, h] of [[-12.8,19.2,3.7],[10.7,21.4,4.3],[-15.2,27.1,4.8],[13.1,29.6,3.9],[-8.7,33.1,4.2]]) {
    if (!geoTronco.has(h)) geoTronco.set(h, new THREE.CylinderGeometry(.22,.34,h,9));
    const tronco=new THREE.Mesh(geoTronco.get(h),matPor(TX.tabua,0x63482f,{roughness:1})); tronco.position.set(tx,h/2,tz); root.add(tronco);
    tronco.userData.mansaoFeature = 'arvore';   // G3 do mansao-garden-check: 3,0–6,8 m
    occluders.push(tronco);   // tronco visível dentro do próprio colisor: a bala para nele
    if (GLB_ON && PB.add('palmeira_imperial', { x: tx, z: tz, targetH: h + 1.6, ry: (tx * 7 + tz * 3) % 6.283 })) tronco.visible = false;
    // copa: geometria unitária escalada, 20 esferas de folhagem em 1 lote (eram 20 draw calls)
    else for (const [ox, oy, oz, s] of [[0,0,0,1],[-.85,-.15,.15,.72],[.8,-.08,-.2,.76],[.1,.48,.2,.68]])
      lotePeca(IB_FOLHA, GEO_COPA, MAT_FOLHA_MASSA, [tx + ox, h + .1 + oy, tz + oz], [0, 0, 0],
        [1.55 * s * 1.05, 1.55 * s * .78, 1.55 * s * .94], corTex((ox + oz) > 0 ? 0x3f773b : 0x28582f, TX.folha));
    col(tx-.3,tx+.3,0,h,tz-.3,tz+.3); solids.push({ x0: tx - 0.3, x1: tx + 0.3, z0: tz - 0.3, z1: tz + 0.3 });
  }
  // Bromélias em manchas curvas amarram canteiros, espelho d'água e caminho.
  for (const [x, z, c] of [[-11.2,19.4,0xb84132],[-7.4,20.8,0xd1842f],[6.7,21.7,0xb84132],[10.6,24.1,0xd1842f],[-13.3,28.9,0xb84132],[-6.1,31.2,0xd1842f],[7.9,27.4,0xb84132],[14.1,32.2,0xd1842f]]) {
    if (GLB_ON && PB.add('ixora', { x, z, targetH: .95, ry: (x * 5 + z * 11) % 6.283 })) continue;   // BUG-64: ixora florida no lugar dos cones
    const g = new THREE.Group();
    g.userData.mansaoFeature = 'bromelia';
    const folhas = [];
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI * 2 / 11, externo = i % 2 === 0;
      folhas.push({ p: [Math.sin(a) * (externo ? .34 : .2), externo ? .34 : .42, Math.cos(a) * (externo ? .34 : .2)],
        r: [externo ? .82 : .55, a, 0], s: [.16, externo ? .92 : .68, .16], c: corTex(i % 4 === 0 ? c : 0x376f3b, TX.folha) });
    }
    loteLocal(g, GEO_FOLHA_CONE, MAT_FOLHA, folhas);
    const miolo = new THREE.Mesh(GEO_MIOLO, matPor(TX.liso, c, { roughness: .9 }));
    miolo.scale.setScalar(.22); miolo.position.y = .32; g.add(miolo);
    // MAP1: bromélia é a mesma construção do `garden-cluster` (cones sem colisor) —
    // a marca é a verdade medida: o corpo atravessa a folhagem.
    g.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    g.position.set(x, 0, z); root.add(g);
  }
  // Duas palmeiras assimétricas enquadram a fachada; folhas alongadas têm três
  // inclinações para não ler como as copas esféricas existentes.
  for (const [px,pz,sgn] of [[-17.2,22.5,1],[17.2,24,-1]]) {
    if (GLB_ON && PB.add('palmeira_ravenala', { x: px, z: pz, targetH: 5.0, ry: sgn > 0 ? .45 : 2.69 })) continue;   // BUG-64: ravenala em leque no lugar das esferas
    const palm = new THREE.Group(); palm.position.set(px,0,pz); palm.userData.mansaoFeature = 'palmeira';
    const tropicalTag=new THREE.Group(); tropicalTag.userData.mansaoFeature='tropical-3d'; palm.add(tropicalTag);
    /* Estipe e folhas em dois lotes locais: a conicidade de cada anel era 0,75 em todos
       os cinco, então a geometria unitária escalada devolve o MESMO tronco. */
    const aneis = [], folhasPalma = [];
    for (let i=0;i<5;i++) aneis.push({ p:[sgn*i*.07,.45+i*.82,0], r:[0,0,-sgn*.055], s:[.24+i*.018,.9,.24+i*.018], c:corTex(0x80613d,TX.tabua) });
    for (let i=0;i<10;i++) {
      const a=i*Math.PI*2/10;
      folhasPalma.push({ p:[sgn*.32+Math.sin(a)*.55,4.45+Math.cos(a)*.14,Math.cos(a)*.55],
        r:[-.42,a,Math.sin(a)*.18], s:[.58*.24,.58*.09,.58*2.35], c:corTex(0x2c713c,TX.folha) });
    }
    loteLocal(palm, GEO_CAULE, MAT_CAULE, aneis);
    loteLocal(palm, GEO_FOLHA_ESF, MAT_FOLHA, folhasPalma);
    root.add(palm);
  }
  // Bananeiras no primeiro plano: folhas altas, largas e em leque, não estrelas 2D.
  for(const [bx,bz,ry] of [[-9.8,24.8,.3],[11.6,26.5,-.45]]){
    if (GLB_ON && PB.add('bananeira', { x: bx, z: bz, targetH: 2.3, ry })) continue;   // BUG-64
    const banana=new THREE.Group(); banana.position.set(bx,0,bz); banana.rotation.y=ry;
    banana.userData.mansaoFeature='tropical-3d';
    const folhasBanana=[];
    for(let i=0;i<7;i++){ const a=-1.1+i*.36;
      folhasBanana.push({ p:[Math.sin(a)*.55,1.45+i*.12,Math.cos(a)*.55], r:[-.55,a,0], s:[.52*.28,.52*.08,.52*2.25], c:corTex(i%2?0x4b8b45:0x35783c,TX.folha) }); }
    loteLocal(banana, GEO_FOLHA_ESF, MAT_FOLHA, folhasBanana);
    const caule=new THREE.Mesh(GEO_CAULE,matPor(TX.tabua,0x6f8744,{roughness:1})); caule.scale.set(.2,1.45,.2); caule.position.y=.72; banana.add(caule);
    // MAP1: bananeira é `tropical-3d`, mesma taxonomia da palmeira — tronco e folha
    // atravessáveis; o pseudocaule não é cover (árvore lenhosa é que leva `col()`).
    banana.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    root.add(banana);
  }
  /* SET DRESSING MINT (BUG-56): fora do corredor central e das linhas de waypoint
     z=18/24/30 — colisores de borda, A* e fluxo de spawn inalterados. */
  for (const [bx, bz, ry] of [[-14.9, 16.6, .28], [16.6, 22.6, -2.86]]) {
    jardimProp('banco_jardim', bx, bz, .82, ry, 0, [1.8, .55, .5]);
    const horiz = Math.abs(Math.cos(ry)) > Math.abs(Math.sin(ry));
    col(bx - (horiz ? .95 : .35), bx + (horiz ? .95 : .35), 0, .5, bz - (horiz ? .35 : .95), bz + (horiz ? .35 : .95));
    solids.push({ x0: bx - (horiz ? .95 : .35), x1: bx + (horiz ? .95 : .35), z0: bz - (horiz ? .35 : .95), z1: bz + (horiz ? .35 : .95) });
  }
  // Postes em x=±2,3 com col ±0,18 (base real 0,34 m, mansao-glb-fit): colisor mais
  // largo mata nós da grade pela inflação de 0,5 m do blocked() e derruba rota do CTF2.
  for (const [px, pz] of [[-2.3, 17.4], [2.3, 22.6], [-2.3, 27.4], [2.3, 32.6]]) {
    jardimProp('poste_jardim', px, pz, 2.4, 0, 0, [.26, .26, 2.4]);
    col(px - .18, px + .18, 0, 2.4, pz - .18, pz + .18);
  }
  jardimProp('escultura_jardim', 18.6, 32.2, 2.2, -.6, 0, [.9, .9, 2.2]);
  col(18.0, 19.2, 0, 2.2, 31.6, 32.8); solids.push({ x0: 18.0, x1: 19.2, z0: 31.6, z1: 32.8 });
  // Vaso com col 0,70 m = base rígida medida 0,67 (mansao-glb-fit); a folhagem do GLB
  // é atravessável por doutrina (mesma regra da bananeira) e leva nonSolidSurface.
  for (const [vx, vz] of [[-18.9, 20.4], [19.6, 26.2], [-20.2, -21.4], [20.2, -21.4]]) {
    const v = propComFallback('vaso_tropical', vx, vz, 1.05, (vx + vz) * .3,
      () => addBox(.7, 1.05, .7, matPor(TX.folha, 0x2e6636, { roughness: 1 }), vx, 0, vz));
    if (v) v.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
  }
  // Encosta verde lateral em dois planos de profundidade: o horizonte deixa de
  // terminar numa linha oceânica reta, sem bloquear o eixo central de combate.
  const encosta = new THREE.Group(); encosta.userData.mansaoFeature = 'encosta';
  for (const [x,z,sx,sy,sz] of [[-20.8,26,1.2,.46,2.2],[20.8,29,1.15,.4,1.9]]) {
    const morro = new THREE.Mesh(GEO_MORRO, matPor(TEX_FOLHA_TILE, 0x356438, { roughness: 1 }));
    morro.scale.set(sx,sy,sz); morro.position.set(x,.55,z); morro.rotation.y = x < 0 ? .24 : -.3; morro.receiveShadow = true;
    morro.userData.nonSolidSurface = true; encosta.add(morro);
    // BUG-64: coroamento quebra a silhueta de poliedro chapado
    if (GLB_ON) { PB.add('agave', { x: x * .96, y: 1.0, z: z - 1.1, targetH: .9, ry: x }); PB.add('samambaia', { x: x * .98, y: .8, z: z + 1.5, targetH: .85, ry: z }); }
  }
  root.add(encosta);
  // Pergolado do lounge: quatro pilares chegam ao solo; cinco travessas e duas
  // longarinas formam uma estrutura legível, eliminando as vigas soltas no céu.
  const pergolaMat=matTex(TX.tabua,0x765039,{roughness:.66});
  const marcaPergola=(o,tipo)=>{o.userData.mansaoFeature='pergola-part';o.userData.pergolaPart=tipo;return o;};
  for(const [x,z] of [[-13.8,14.7],[-8.2,14.7],[-13.8,18.3],[-8.2,18.3]]) marcaPergola(addBox(.22,3.05,.22,pergolaMat,x,0,z,{collide:false,skirt:false}),'pillar');
  for(const z of [14.7,18.3]) marcaPergola(addBox(5.85,.18,.22,pergolaMat,-11,2.96,z,{collide:false,skirt:false}),'beam');
  for(let z=15;z<=18;z+=.75) marcaPergola(addBox(.16,.14,3.8,pergolaMat,-13.3+(z-15)*1.52,3.13,16.5,{collide:false,skirt:false}),'beam');
  /* FOLHAGEM INSTANCIADA (plans/13): drifts de ângulo áureo nas bordas, régua G1 do
     mansao-garden-check. BUG-64: com GLB os drifts são touceiras via PropBatch. */
  const rndJardim = (() => { let s = 20260818 >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();
  const driftsJardim = [
    [-17.6, 16.8], [-13.2, 18.6], [-18.4, 24.9], [-14.1, 33.6], [-8.3, 33.2],
    [16.8, 17.8], [12.1, 19.9], [18.2, 27.4], [14.8, 33.9], [7.6, 32.7], [-9.8, 28.3],
  ];
  if (GLB_ON && hasProp('samambaia') && hasProp('ixora') && hasProp('heliconia')) {
    for (const [dx, dz] of driftsJardim) {
      const n = LOWQ ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const a = i * 2.399963 + rndJardim() * .6, r = .34 * Math.sqrt(i + .6) + rndJardim() * .2;
        const fx = dx + Math.cos(a) * r, fz = dz + Math.sin(a) * r, fh = .55 + rndJardim() * .45, fry = rndJardim() * 6.283;
        if (i % 3 === 0) PB.add('samambaia', { x: fx, z: fz, targetH: fh, ry: fry });
        else if (i % 3 === 1) PB.add('ixora', { x: fx, z: fz, targetH: fh + .15, ry: fry });
        else PB.add('heliconia', { x: fx, z: fz, targetH: fh + .5, ry: fry });
      }
    }
  } else {
  const paletaFolha = [0x2f7040, 0x3d8a4a, 0x529a4b, 0x2a6b3a, 0x6aa14e].map((c) => new THREE.Color(c));
  const criaFolhagem = (geo) => {
    const mesh = new THREE.InstancedMesh(geo, MAT_FOLHA, 30);   // tom vem do instanceColor
    mesh.userData.mansaoFeature = 'folhagem-instanciada';
    mesh.userData.nonSolidSurface = true;
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  };
  const dummyFolha = new THREE.Object3D();
  const corFolha = new THREE.Color();
  const mlFolha = mediaLin(TX.folha);   // a cor por instância também divide pela média do mapa
  const famA = criaFolhagem(new THREE.SphereGeometry(.48, 8, 5));
  const famB = criaFolhagem(new THREE.ConeGeometry(.30, 1.05, 6));
  let iA = 0, iB = 0;
  for (const [dx, dz] of driftsJardim) {
    const n = 4 + Math.floor(rndJardim() * 3);   // drift de 4-6 plantas misturando famílias
    for (let i = 0; i < n; i++) {
      const a = i * 2.399963 + rndJardim() * .6, r = .34 * Math.sqrt(i + .6) + rndJardim() * .2;
      dummyFolha.position.set(dx + Math.cos(a) * r, .48 + rndJardim() * .3, dz + Math.sin(a) * r);
      dummyFolha.rotation.set(rndJardim() * .4, rndJardim() * Math.PI * 2, rndJardim() * .4);
      const s = .65 + rndJardim() * .8;
      dummyFolha.scale.set(s, s * (.9 + rndJardim() * .35), s);
      dummyFolha.updateMatrix();
      const mesh = i % 2 ? famB : famA;
      const idx = mesh === famA ? iA : iB;
      if (idx >= 30) continue;
      mesh === famA ? iA++ : iB++;
      mesh.setMatrixAt(idx, dummyFolha.matrix);
      corFolha.copy(paletaFolha[Math.floor(rndJardim() * paletaFolha.length)])
        .offsetHSL((rndJardim() - .5) * .03, (rndJardim() - .5) * .15, (rndJardim() - .5) * .08);
      corFolha.setRGB(Math.min(1, corFolha.r / mlFolha[0]), Math.min(1, corFolha.g / mlFolha[1]), Math.min(1, corFolha.b / mlFolha[2]));
      mesh.setColorAt(idx, corFolha);
    }
  }
  famA.count = iA; famB.count = iB;
  famA.instanceMatrix.needsUpdate = true; famB.instanceMatrix.needsUpdate = true;
  if (famA.instanceColor) famA.instanceColor.needsUpdate = true;
  if (famB.instanceColor) famB.instanceColor.needsUpdate = true;
  }
  const forracaoCor = corTex(0x416f38, TX.folha);
  for (const [x,z,s] of [[-16.4,18.1,2.2],[-14.8,25.6,2.5],[-10.7,33.2,2.8],[15.7,19.1,2.0],[16.4,27.2,2.4],[10.9,31.7,2.6]])
    lotePeca(IB_FOLHA, GEO_FORRACAO, MAT_FOLHA_MASSA, [x,.018,z], [-Math.PI/2,0,0], [s,s,s], forracaoCor, false);
  // muretas dos canteiros (cover agachado); a de (-7,4;22,6) saiu de cima do espelho —
  // sobre a água ela lia como viga flutuando (crítico v2.1)
  const matMureta = matPor(TX.concreto, 0xffffff, { roughness: .9 });
  for (const [mx, mz,ry] of [[5.4,23.3,.08],[-7.4,22.55,-.12],[7.1,30.5,.16],[-4.8,29.1,-.06]]) { loteBox(IB_BALA, 3.0, 0.6, 0.4, matMureta, mx, 0, mz,{ ry, collide: true }); solids.push({ x0: mx - 1.5, x1: mx + 1.5, z0: mz - 0.2, z1: mz + 0.2 }); }
  // Portão de correr: o colisor único 8×3 fica (gameplay); o visual ganha trilho,
  // mourões, motor e folha de aço flutuando 12 cm — a "laje preta" morreu (crítico r3).
  col(-4, 4, 0, 3.0, 33.85, 34.15);
  const marcaParte = (o, k, t) => { o.userData[k] = t; return o; };
  marcaParte(addBox(8.3, .05, .14, matTex(TX.metal, 0x4a4f55, { metalness: .6, roughness: .4 }), 0, 0, 34, { collide: false, cast: false, skirt: false }), 'portaoPart', 'trilho');
  /* MAP1 (12/09): mourão e motor eram VOLUME VISÍVEL sem colisor fora do colisor 8×3 da
     folha — a calçada de fora do portão é andável (x além de ±4) e a sonda do peito
     achava o motor a 0,90 m do chão em (4,5; 34,5): o corpo entrava na caixa de aço.
     Alvenaria e motor são sólidos de verdade; o conserto é o colisor, não mover a sonda. */
  for (const mx of [-4.15, 4.15]) marcaParte(addBox(.35, 2.6, .5, MAT_MURO, mx, 0, 34), 'portaoPart', 'mourao');
  marcaParte(addBox(.5, .9, .35, matTex(TX.metal, 0x3a4046, { metalness: .5, roughness: .5 }), 4.62, 0, 34.55), 'portaoPart', 'motor');
  const portaoObj = propComFallback('portao_correr', 0, 34, 2.3, 0, () => {
    const folha = addBox(7.9, 2.1, .12, lam({ map: texturaPortao(), metalness: .45, roughness: .55 }), 0, .12, 34, { collide: false, skirt: false });
    folha.userData.portaoPart = 'folha'; folha.userData.mansaoFeature = 'portao'; occluders.push(folha);
    return folha;
  });
  if (portaoObj) portaoObj.userData.mansaoFeature = 'portao';
  // Guarita e biombo protegem o respawn, deixando rotas laterais independentes.
  addBox(3.2, 2.8, 3.2, TEX.concrete, -17.5, 0, 31.5);
  // Biombo com estrutura (crítico r3: "caixa flutuando"): mourões a cada ~1,2 m
  // descendo ao chão e travessa coroando — painéis e passagens dos spawns (CTF2) intactos.
  const travessaBiombo = matPor(TX.tabua, 0x5c4030, { roughness: .7 });
  for (const x of [-6.75, -2.25, 2.25, 6.75]) {
    addBox(2.5, 2.1, 0.35, ripado, x, 0, 29).userData.mansaoFeature = 'biombo';
    for (const px of [x - 1.22, x, x + 1.22]) marcaParte(addBox(.14, 2.3, .44, ripado, px, 0, 29, { collide: false }), 'biomboPart', 'mourao');
    marcaParte(addBox(2.62, .09, .42, travessaBiombo, x, 2.1, 29, { collide: false, cast: false, skirt: false }), 'biomboPart', 'travessa');
  }

  /* ===================== TERRAÇO + PISCINA INFINITA ===================== */
  // Deck recortado nas laterais: não existe madeira depois da borda infinita central.
  const deckMat = TEX.deck || lam({ color: 0x8a6a4a });
  addFloor(HALF_X * 2 - 2, 9, 0, -19.5, deckMat, 0.03);
  addFloor(15, 11, -13.5, -29.5, deckMat, 0.03);
  addFloor(15, 11, 13.5, -29.5, deckMat, 0.03);
  // piscina ENTRÁVEL (plans/13): piso andável via groundHeightAt, paredes de colisor só
  // até y=0 (em cima _collide não pega); degraus 0,28 m < STEP_H 0,55 — quem cai, SAI.
  const azulejoCuba = matTex(TX.azulejo, 0x256d84, { roughness: .38 });
  const degCuba = (h, d, z, yBase) => {
    const m = addBox(11, h, d, azulejoCuba, 0, yBase, z, { collide: false, cast: false, skirt: false });
    m.userData.mansaoFeature = 'pool-tread'; m.userData.nonSolidSurface = true;
  };
  degCuba(.567, .284, -26.642, PISCINA.raso);   // degraus de entrada (largura total)
  degCuba(.283, .284, -26.926, PISCINA.raso);
  degCuba(.75, .288, -29.744, PISCINA.fundo);   // escada submersa raso→fundo
  degCuba(.50, .288, -30.031, PISCINA.fundo);
  degCuba(.25, .288, -30.319, PISCINA.fundo);
  const pisoRaso = addFloor(11, 2.53, 0, -28.334, matPiso(TX.azulejo, 0x1d5a74, 11, 2.53, { roughness: .5 }), PISCINA.raso - .01);
  const pisoFundo = addFloor(11, 1.75, 0, -31.625, matPiso(TX.azulejo, 0x123f54, 11, 1.75, { roughness: .55 }), PISCINA.fundo - .01);
  for (const p of [pisoRaso, pisoFundo]) { p.userData.mansaoFeature = 'pool-basin-floor'; p.userData.nonSolidSurface = true; }
  const paredeCuba = (x, z, w, d) => {
    const m = addBox(w, 1.95, d, azulejoCuba, x, PISCINA.fundo - .1, z);
    m.userData.mansaoFeature = 'pool-wall';
  };
  paredeCuba(0, -26.25, 12, .5);   // sul (borda de entrada)
  paredeCuba(0, -32.75, 12, .5);   // norte (sob a borda infinita)
  paredeCuba(-5.75, -29.5, .5, 6);
  paredeCuba(5.75, -29.5, .5, 6);
  // Piscina com a MESMA água viva RC2 (crítico r3: "retângulo turquesa fosco") —
  // fade na profundidade real da cuba (1,93 m); o contrato entrável não muda.
  const aguaPiscina = createWater(scene, T, 'fy_mansao', { nivel: .08, centro: [0, -29.5], tamanho: [11, 6],
    segmentos: 6, raso: 0x419bb3, fundo: 0x1a5a72, profEscala: 1.9, espumaFaixa: .3, espumaMiolo: .1,
    profFallback: .55, ampEscala: .06, parent: root });
  aguaPiscina.mesh.userData.nonSolidSurface = true;
  aguaPiscina.material.side = THREE.DoubleSide;   // piscina é entrável: de dentro o fundo lê a película da superfície
  const bordaPiscina = lam({ map: TEX.marble.map || null, color: 0xf0eadc, roughness: .3 });
  for (const x of [-6.2,6.2]) addBox(.32,.18,7.6,bordaPiscina,x,.01,-29.5,{ collide:false, skirt:false });
  // borda sul sobre o TOPO da parede (z∈[-26,31,-25,99]): dentro da cuba o chão é o
  // degrau a -0,283 e a pedra a +0,19 virava penetração de 0,47 m no MAP1
  addBox(12.7,.18,.32,bordaPiscina,0,.01,-26.15,{ collide:false, skirt:false });
  // Subleito OPACO em y=0 cobre o gramado cortado sob o vertedouro translúcido;
  // a máscara de cuba saiu — dentro da piscina ela virava teto do nadador.
  addFloor(12, 2.9, 0, -34.45, matPiso(TX.azulejo, 0x0f3a4c, 12, 2.9, { roughness: .4 }), 0);
  addFloor(12, .55, 0, -33.74, matPiso(TX.liso, 0x59c9df, 12, .55, { roughness: .08, metalness: .08 }), .075);
  addBox(12, .42, .08, matTex(TX.azulejo, 0x2a91ae, { transparent: true, opacity: .72, roughness: .16 }), 0, -.35, -33.02,
    { collide: false, cast: false, skirt: false });
  addFloor(12, 2.9, 0, -34.45, matPiso(TX.azulejo, 0x247d9d, 12, 2.9, { roughness: .16, metalness: .08, transparent: true, opacity: .9 }), .015);
  // espreguiçadeiras
  for (const [ex, ez, ry] of [[-12, -22, 0.2], [12, -22, -0.2], [-12, -28, 0.1], [12, -28, -0.1]])
    propComFallback('guarda_sol', ex, ez, 2.2, ry, () => addBox(0.8, 0.4, 2.0, matPor(TX.tecido, 0xf0e8d0), ex, 0, ez));
  // mesa externa
  propComFallback('mesa_guardasol', 0, -20, 2.3, 0, () => addBox(2.0, 0.9, 1.0, matPor(TX.tecido, 0xe0d0b0), 0, 0, -20));
  solids.push({ x0: -1, x1: 1, z0: -20.5, z1: -19.5 });
  // heliponto (H) — decoração
  const tintaHeliponto = matPor(TX.liso, 0xffffff);
  addBox(0.3, 0.05, 8.0, tintaHeliponto, -15, 0, -30, { collide: false });
  addBox(8.0, 0.05, 0.3, tintaHeliponto, -15, 0, -30, { collide: false });
  // Lounge Mint (BUG-56): colisor 1,9 = malha real 1,91×1,06 (mansao-glb-fit), em
  // janela entre nós da grade — não apaga waypoint nem a linha do terraço.
  jardimProp('lounge_externo', -14.9, -18.5, 1.05, 1.57, 0, [1.7, 1.7, .8]);
  col(-15.85, -13.95, 0, .8, -19.45, -17.55); solids.push({ x0: -15.85, x1: -13.95, z0: -19.45, z1: -17.55 });

  /* MUROS — concreto de fôrma com junta (G5); o volume e o colisor não mudam */
  for (const sx of [-HALF_X, HALF_X]) addBox(0.5, 2.5, HALF_Z * 2, MAT_MURO, sx, 0, 0).userData.mansaoFeature = 'muro-perimetro';
  addBox(HALF_X * 2, 2.5, 0.5, MAT_MURO, 0, 0, HALF_Z).userData.mansaoFeature = 'muro-perimetro';

  /* COSTÃO E OCEANO (RC2, plans/23): o leito desce 4,4 m sob a água — a régua de
     depth-fade da water.js faz o turquesa de raso e a espuma nas pedras que a furam. */
  {
    const leitoGeo = new THREE.PlaneGeometry(200, 44.5, 1, 1);
    /* 8.900 m² de leito eram 58% de toda a "área sem textura" do mapa (SUP2). O
       `repeat` sai do tamanho do mundo: UV 0→1 num plano de 200 m é 1 px/m. */
    const areiaLeito = TX.areia.clone();
    areiaLeito.repeat.set(200 / TILE_M, 44.5 / TILE_M); areiaLeito.needsUpdate = true;
    const leito = new THREE.Mesh(leitoGeo, lam({ map: areiaLeito, color: corSobreTex(0x6f6350, TX.areia), roughness: .95 }));   // areia/rocha MOLHADA: clara demais lavava o raso pelo alfa
    leito.rotation.x = -Math.PI / 2 - Math.atan2(4.38, 44);
    leito.position.set(0, -2.21, -58);
    leito.receiveShadow = true; root.add(leito);
    const pedraMat = matPor(TX.pedra, 0x7d7468, { roughness: .9 });
    for (const [px, pz, pr, py] of [[-9, -41, 1.6, -1.5], [7, -44, 2.2, -1.8], [-22, -47, 2.8, -2.0], [16, -52, 1.9, -2.2], [30, -43, 1.3, -1.4]]) {
      const pedra = new THREE.Mesh(GEO_PEDRA_COSTAO, pedraMat);
      pedra.position.set(px, py, pz); pedra.rotation.set(pr, pz, px); pedra.scale.setScalar(pr);
      pedra.castShadow = true; root.add(pedra);
    }
  }
  createWater(scene, T, 'fy_mansao');   // oceano; o update() tica todas as scene.userData.waters

  // Vasos e balizadores dão escala ao deck e às circulações sem virarem paredes de cover.
  const vasos = [
    [-19,-33,1.0],[-19,-29,.8],[-19,-25,.8],[-19,-19,.9],[-10,-34,.8],[-10,-29,.75],[-10,-25,.75],[-10,-19,.8],
    [10,-34,.8],[10,-29,.75],[10,-25,.75],[10,-19,.8],[19,-33,1.0],[19,-29,.8],[19,-25,.8],[19,-19,.9],
    [-19,-14,.75],[-19,-8,.7],[-19,-2,.8],[-19,5,.75],[-19,11,.8],[19,-14,.75],[19,-8,.7],[19,-2,.8],[19,5,.75],[19,11,.8],
    [-10,-4,.65],[-10,3,.65],[-10,9,.65],[-10,15,.65],[10,-4,.65],[10,3,.65],[-19,15,.65],[-18,18,.8],[18,18,.8],[-18,27,.7],[18,27,.7]
  ];
  /* 37 vasos = 74 caixas soltas. O lote é por TAMANHO (6 tamanhos), porque a banda de AO
     e a UV em metros são assadas na geometria: 74 draw calls viram 12, com o MESMO
     colisor e a MESMA saia de contato de antes. */
  const plantaVaso = matPor(TX.folha, 0x2e6636, { roughness: 1 });
  for (const [x, z, s] of vasos) {
    loteBox(IB_BALA, 0.72 * s, 0.7, 0.72 * s, TEX.concrete, x, 0, z, { collide: true });
    loteBox(IB_FOLHA, 0.65 * s, 1.15 * s, 0.65 * s, plantaVaso, x, 0.5 * s, z, { skirt: false });
  }

  /* GROUND HEIGHT (multinível: mezanino) */
  const MZ = { x0: -12, x1: 12, z0: -15, z1: -8 };
  function groundHeightAt(x, z, yRef) {
    if (((x >= STAIR.x0 && x <= STAIR.x1) || (x >= STAIR_SERVICE.x0 && x <= STAIR_SERVICE.x1)) &&
        z >= STAIR.z0 && z <= STAIR.z1) {
      const i = THREE.MathUtils.clamp(Math.round((-7.5 - z) / 0.29), 0, 25);
      return i * 0.18;
    }
    // piscina entrável: degraus de entrada ao sul (largura total), raso, escada
    // submersa e fundo — cada subida ≤0,28 m, então a saída é andando (anti-trap)
    if (x >= PISCINA.x0 && x <= PISCINA.x1 && z >= PISCINA.z0 && z <= PISCINA.z1) {
      if (z > -27.068) return -0.2834 * Math.min(2, Math.floor((-z - 26.5) / 0.284) + 1);
      if (z > -29.6) return PISCINA.raso;
      if (z > -30.75) return PISCINA.raso - 0.25 * Math.min(4, Math.floor((-z - 29.6) / 0.2875) + 1);
      return PISCINA.fundo;
    }
    // Sem referência, preserva a camada superior usada por bandeira/pickup. Com yRef,
    // o hall sob o escritório permanece no térreo e o mezanino continua em 4,5 m.
    if (x >= MZ.x0 && x <= MZ.x1 && z >= MZ.z0 && z <= MZ.z1 &&
        (yRef === undefined || yRef >= LAJE_H * .5)) return LAJE_H;
    return 0;
  }

  /* WAYPOINTS */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf, yRef = 0) => {
    const g = groundHeightAt(x, z, yRef);
    if (g < 1 && insideSolid(x, z, inf)) return true;
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5, 0)) nodes.push({ x: gx, z: gz, y: groundHeightAt(gx, gz, 0) });
  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35, yRef = 0) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
      if (!blocked(x, z, inf, yRef)) nodes.push({ x, z, y: groundHeightAt(x, z, yRef) });
    }
  };
  // escada (passo apertado)
  linha(-3, -7.5, -3, -14.5, 0.9, 0.25, null);
  linha(13.5, -7.5, 13.5, -14.5, 0.9, 0.25, null);
  linha(13.5, -7.5, 13.5, -4.8, .7, .2, 0);
  // mezanino
  for (const mz of [-14, -12, -9]) linha(-11, mz, 11, mz, 3.0, 0.3, LAJE_H);
  linha(-3, -14.5, -5.2, -14.5, .55, .2, LAJE_H);
  linha(13.5, -14.5, 11, -14.5, .55, .2, LAJE_H);
  // interior
  for (const iz of [-12, -6, 0, 6]) linha(-14, iz, 14, iz, 3.0);
  // jardim
  for (const jz of [18, 24, 30]) linha(-20, jz, 20, jz, 3.0);
  // O STEP global (3,4 m) caía exatamente sobre os montantes dos biombos e não
  // amostrava os vãos de 2 m. Estas duas linhas são o eixo navegável das portas.
  linha(-4.5, 32, -4.5, 26.5, .9, .2);
  linha(4.5, 32, 4.5, 26.5, .9, .2);
  // terraço
  for (const tz of [-20, -25, -30]) linha(-18, tz, 18, tz, 3.0);
  // piscina entrável: lane pelo raso e pelo fundo, degrau a degrau (dy por nó ≤0,29)
  linha(0, -26.9, 0, -32.2, 0.42, 0.22);

  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t; if (blocked(x, z, 0.25, y)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, dy = Math.abs(nodes[i].y - nodes[j].y); if (dy <= .72 && dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z, yRef) { const y = groundHeightAt(x, z, yRef); let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, dy = nodes[i].y - y, d = dx * dx + dz * dz + dy * dy; if (d < bd) { bd = d; b = i; } } return b; }
  const _D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z, dy = nodes[a].y - nodes[b].y; return Math.sqrt(dx * dx + dz * dz + dy * dy); };
  function findPath(fromIdx, toIdx) { if (fromIdx === toIdx) return [toIdx]; const n = nodes.length, g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), open = new Uint8Array(n); g[fromIdx] = 0; f[fromIdx] = _D(fromIdx, toIdx); open[fromIdx] = 1; let oc = 1; while (oc > 0) { let cur = -1, bf = Infinity; for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; } if (cur === -1) break; if (cur === toIdx) { const p = [cur]; let c = prev[cur]; while (c !== -1) { p.unshift(c); c = prev[c]; } return p; } open[cur] = 0; oc--; for (const m of adj[cur]) { const t = g[cur] + _D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + _D(m, toIdx); if (!open[m]) { open[m] = 1; oc++; } } } } return [fromIdx]; }

  /* SPAWNS: A no PORTÃO (jardim), B no TERRAÇO (piscina) */
  const spawns = {
    E: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 32, yaw: Math.PI })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -22, yaw: 0 })),
  };

  /* CTF */
  const ctfPoints = [
    { id: 'R', label: 'JARDIM',   x: 10,  z: 28 },
    { id: 'E', label: 'SALA',     x: -10, z: 2 },
    { id: 'P', label: 'MEZZO',    x: 8,   z: -11 },
    { id: 'B', label: 'PISCINA',  x: -10, z: -25 },
  ];

  /* ARSENAL */
  const gmat = matTex(TX.metal, 0x20242a);
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.userData.nonSolidSurface = true; m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  place('ak', 9, 1);       place('m4', -8, -4);
  place('awp', 0, -11);    place('shotgun', 8, -10);
  place('mp5', -8, 31);    place('deagle', 10, 28);
  place('m400', 0, -22);   place('mp5', -12, -22);
  place('deagle', 4, 4);   place('ak', -8, 11);
  place('shotgun', 0, 32); place('m4', 6, -20);

  /* O lote de carros nasce InstancedMesh em root mas fora de `occluders`: sem isto a
     bala atravessava carro que o corpo respeita (BUG-54, cláusula atravessa-parede).
     Vidro (transparente) fica de fora — mesmo teste de superfície do map_havan.js.
     ORDEM: IB_BALA entra ANTES da varredura (ripa, brise, corrimão, mureta e vaso param
     bala, como paravam soltos); IB_LEVE e IB_FOLHA entram DEPOIS — degrau e folhagem
     nunca estiveram em `occluders`, e pôr folha lá seria parede invisível (BUG-54). */
  const preProps = new Set(root.children);
  PB.build(root);
  IB_BALA.build(root);
  for (const c of root.children) {
    if (preProps.has(c) || !c.isInstancedMesh) continue;
    const ms = Array.isArray(c.material) ? c.material : [c.material];
    if (ms.some((m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9)))) occluders.push(c);
  }
  IB_LEVE.build(root);
  const preFolha = new Set(root.children);
  IB_FOLHA.build(root);
  // folhagem instanciada é atravessável: a sonda vertical do MAP1 não pode lê-la como chão
  for (const c of root.children) if (!preFolha.has(c) && c.isInstancedMesh) c.userData.nonSolidSurface = true;
  SKIRT.build(root);

  /* Pixo no muro externo, sem o folha-pixaca-01 ("MORTE" — veto editorial da mansão,
     cobrado no eval:grafite-editorial). */
  const D_PIXO_M = decalIds(T, ['folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  grafitar({ id: 'fy_mansao', root, T, waypoints: nodes, seed: 14000, passo: 1.0, alcance: 4, cobre: 0.01, minLarg: 0.3, bandas: [{ y0: 0.3, y1: 1.5, larg: 1.5, alturas: [0.8], chance: 5, pool: D_PIXO_M }] });

  /* BUG-57: mansão tem pombo de cobertura e um rato só — no jardim, longe da sala. */
  const ambience = createFavelaAmbience(root, {
    map: 'fy_mansao',
    rats: [{ pos: [-14, 0, 30], to: [-11.5, 0, 32], phase: .7 }],
    /* vida 2 (14/09): a pomba de (7,4 / 32) era clone da de (6 / 33) a 1,4 m; sai e paga o
       pato do espelho d'água (−6.928 +2.676 = −4.252 tri). */
    pigeons: [
      { mode: 'ground', pos: [6, 0, 33], phase: .4 }, { mode: 'ground', pos: [-16, 0, 20], phase: 1.5 },
    ],
    /* vida 1: papagaio de poleiro no topo da sebe (y=1,24) — mais baixo fica dentro
       dela ou flutua no céu (BUG-57). */
    parrots: [
      { pos: [10, 1.24, -25], phase: .5 }, { pos: [-10, 1.24, -29], phase: 1.9 },
    ],
    /* PATO na PISCINA (`:985`, lâmina 11 × 6 em (0, −29,5), nivel 0,08). O espelho d'água do
       jardim seria o lugar óbvio e está ERRADO: ele tem colisor sólido de −0,5 a 0,7 m
       (medido), então bicho boiando ali nasce DENTRO de sólido e a AR3 acusa — foi o que
       aconteceu na primeira tentativa. A piscina é cuba de verdade (fundo em −0,85) e está
       livre de colisor. y = lâmina − 0,075 m de casco submerso: a linha d'água do GLB fica
       0,0975 acima do fundo do modelo e a escala do alvo de 0,40 m é 0,772. */
    ducks: [{ pos: [2, .005, -28], to: [.5, .005, -29.2], phase: 1.1 }],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.ondas,pos:[0,0,-45],radius:35,vol:.4},{src:AMB_LOOPS.piscina,pos:[0,.5,-28],radius:10,vol:.3}],bioma:'praia'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    update(dt) { for (const w of scene.userData.waters || []) w.update(dt); },
    stairs: [{ nome: 'escada do mezanino', ...STAIR, topo: LAJE_H },
      { nome: 'escada de serviço', ...STAIR_SERVICE, topo: LAJE_H }],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
