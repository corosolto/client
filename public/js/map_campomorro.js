// CAMPO DO MORRO (fy_campomorro) — campo de varzea rebaixado, oito becos
// convergentes e galpao do baile elevado. Spec: plans/11-CAMPO-DO-MORRO.md.
import * as THREE from 'three';
import { PropBatch, InstBatch, StaticBatch, mergeParts, hasProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { detailFor } from './textures.js';
import { applyLook } from './map_sky.js';
import { aplicaVento, updateVento } from './wind.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, BASE_FLOATING } from './vao.js';
import { GPUParticles } from './gpuparticles.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch { return false; } })();

export const HALF_X = 36, HALF_Z = 30;
// Piso jogável da VM14: chão ≥ −0,10 m sob todo pickup — FIELD_Y não pode descer mais.
const FIELD_X = 20, FIELD_Z = 12.5, FIELD_Y = -0.08;
const RAMP_L = 4, RAMP_W = 4;
const S2 = Math.SQRT1_2;
const LANES = [
  { name: 'E',  dx: 1, dz: 0, r0: FIELD_X },
  { name: 'NE', dx: S2, dz: -S2, r0: FIELD_Z / S2 },
  { name: 'N',  dx: 0, dz: -1, r0: FIELD_Z },
  { name: 'NW', dx: -S2, dz: -S2, r0: FIELD_Z / S2 },
  { name: 'W',  dx: -1, dz: 0, r0: FIELD_X },
  { name: 'SW', dx: -S2, dz: S2, r0: FIELD_Z / S2 },
  { name: 'S',  dx: 0, dz: 1, r0: FIELD_Z },
  { name: 'SE', dx: S2, dz: S2, r0: FIELD_Z / S2 },
];

const GALPAO = { x0: 22, x1: 34, z0: -26, z1: -16, y: 1 };

/* TOPOGRAFIA: o campo é platô plano; o relevo mora fora dele e cresce com a distância.
   Gradiente máx ~0,37, abaixo do que `segClear` e o step-up (0,55 m) toleram; nada desce abaixo de FIELD_Y (VM14). */
const encosta = (d) => (d <= 0 ? 0 : d * d / (d + 5));
const morroBase = (x, z) => FIELD_Y
  + 0.34 * encosta(-x - FIELD_X)
  + 0.20 * encosta(-z - FIELD_Z)
  + 0.11 * encosta(z - FIELD_Z)
  + 0.07 * encosta(x - FIELD_X);

export const CAMPOMORRO_PROPS = [
  'arquibancada', 'junkyard_container', 'caixa_som_baile', 'stall',
  'fav_house', 'pilha_pneus', 'moto_cg', 'fusca',
  // várzea: bar de esquina, faixa de serviço do alambrado e veículos do anel
  'churrasqueira', 'mesa_guardasol', 'cooler', 'dumpster', 'botijao_gas',
  'kombi', 'onibus_urbano', 'vw_9150',
  // RC4: grama da frente E (e-models) — o piloto do vento mora nela
  'grama_corrego_01', 'grama_corrego_02', 'planta_corrego_taboa', 'planta_corrego_taioba',
];

function laneHeight(x, z) {
  for (const l of LANES) {
    const u = x * l.dx + z * l.dz;
    const v = -x * l.dz + z * l.dx;
    // Interpola contra a cota real do terreno: sem degrau na entrada nem na saída das oito bocas.
    if (u >= l.r0 && u <= l.r0 + RAMP_L && Math.abs(v) <= RAMP_W / 2)
      return FIELD_Y + (morroBase(x, z) - FIELD_Y) * ((u - l.r0) / RAMP_L);
  }
  return null;
}

export function buildCampoMorro(scene, T = {}) {
  const colliders = [], occluders = [], pickups = [];
  const root = new THREE.Group(); scene.add(root);
  const PB = new PropBatch({ bucket: 20, shadowMin: 0.02 });

  const lam = (opts) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0, ...opts });
    const d = m.map && detailFor(m.map);
    if (d && d.normalMap) { m.normalMap = d.normalMap; m.normalScale.set(0.55, 0.55); }
    if (d && d.roughnessMap) m.roughnessMap = d.roughnessMap;
    return m;
  };
  /* AO de vértice + UV em METROS (vao.js). `aoMat` CLONA o material, então o par
     original→clone fica registrado: é por ele que `external` upgrada os dois. */
  const aoCache = aoMatFactory(), aoPar = new Map();
  const aoMat = (m) => { const a = aoCache(m); if (a && a !== m) aoPar.set(m, a); return a; };
  // Textura procedural pequena, repetível e sem dependência de rede. O quadriculado
  // irregular dá escala ao cimento queimado/forro mesmo no arnês node do contrato.
  const texturaSuperficie = (a, b, repeatX, repeatY) => {
    const dados = new Uint8Array(4 * 4 * 4);
    const rgb = (hex) => [hex >> 16 & 255, hex >> 8 & 255, hex & 255];
    for (let i = 0; i < 16; i++) {
      const cor = rgb((i + Math.floor(i / 4)) % 3 ? a : b);
      dados.set([...cor, 255], i * 4);
    }
    const tex = new THREE.DataTexture(dados, 4, 4, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY); tex.needsUpdate = true;
    return tex;
  };
  const texturaPisoGalpao = texturaSuperficie(0x7d796f, 0x625f59, 5, 4);
  const texturaForroGalpao = texturaSuperficie(0x67777a, 0x4b5d61, 4, 3);
  const MAT = {
    dirt: lam({ map: T.dirt || T.grass, color: 0x9a7a4c }),
    asphalt: lam({ map: T.asphalt, color: 0x77736c }),
    wall: lam({ map: T.concrete, color: 0x9b8268 }),
    concrete: lam({ map: T.concrete, color: 0x8b8b83 }),
    /* SUP1/SUP2: todo material do mapa nasce COM `map` — `external()` só roda no browser,
       então quem dependia dele lia como plástico chapado. As cores abaixo são a cor ANTIGA
       DIVIDIDA pela média da textura (em linear): sem isso `map` escuro × cor média deixou
       poste, zinco e pórtico PRETOS na captura da boca oeste. */
    steel: lam({ map: T.metal, color: 0xe8f4fb, metalness: 0.35, roughness: 0.7 }),
    steelRust: lam({ map: T.metal, color: 0xffc990, metalness: 0.28, roughness: 0.84 }),
    white: lam({ map: T.concrete, color: 0xffffff }),
    glass: lam({ map: T.metal, color: 0x719fa8, metalness: 0.18, roughness: 0.24 }),
    // porta de chapa: a família de textura não tem madeira, e chapa é o que o morro usa
    door: lam({ map: T.metal, color: 0xd1926a, roughness: 0.9 }),
    roof: lam({ map: T.metal, color: 0xd0dbe2, metalness: 0.32, roughness: 0.75 }),
    galpaoRoof: lam({ map: T.metal, color: 0xb6f2ff, emissive: 0x0b1b20, emissiveIntensity: .12, metalness: 0.42, roughness: 0.58 }),
    galpaoFloor: lam({ map: texturaPisoGalpao, color: 0xa6a298, roughness: 0.92 }),
    galpaoCeiling: lam({ map: texturaForroGalpao, color: 0x9aa8a9, emissive: 0x17282a, emissiveIntensity: .18, roughness: .8 }),
    sound: lam({ map: T.concreteDark, color: 0x5d7082, metalness: 0.14, roughness: 0.76 }),
    soundRing: lam({ map: T.metal, color: 0xffe878, metalness: 0.2, roughness: 0.55 }),
    exitLight: lam({ map: T.metal, color: 0xffffec, emissive: 0xff9f28, emissiveIntensity: .82, roughness: .48 }),
    proxy: lam({ map: T.crate, color: 0xd8cdba, roughness: 0.92 }),
    gun: lam({ map: T.metal, color: 0x676d76 }),
    // lona de patrocínio do alambrado (§1.1): fecha o anel sem colisor nenhum
    lona: lam({ map: T.awning || T.concrete, color: 0xcfc7b4, roughness: 0.88 }),
  };
  if (typeof document !== 'undefined') {
    const loader = new THREE.TextureLoader();
    const external = (mat, url, rx, ry) => {
      const tex = loader.load(url, () => {
        for (const alvo of [mat, aoPar.get(mat)]) {
          if (!alvo) continue;
          alvo.map = tex;
          const det = detailFor(tex);
          if (det && det.normalMap) { alvo.normalMap = det.normalMap; alvo.normalScale.set(0.55, 0.55); }
          if (det && det.roughnessMap) alvo.roughnessMap = det.roughnessMap;
          alvo.needsUpdate = true;
        }
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rx, ry);
    };
    /* `external` tem de upgradar TAMBÉM o clone de AO (`aoMat`), senão a textura de rede
       chega só no material original e a caixa continua com a textura de fábrica.
       `repeat` 1 no que passa por `addBox`: ali a UV já está em METROS (aoBoxGeo). */
    external(MAT.dirt, '/img/textures/dirt_field.webp', 8, 7);
    external(MAT.asphalt, '/img/textures/asphalt_br.webp', 5, 5);
    external(MAT.wall, '/img/textures/favela_wall.webp', 1, 1);
    external(MAT.concrete, '/img/textures/concrete_br.webp', 1, 1);
    external(MAT.roof, '/img/textures/tex_zinco.webp', 1, 1);
    MAT.baile = lam({ map: MAT.wall.map, roughness: 1 });
    external(MAT.baile, '/img/textures/campomorro_streetart_baile.webp', 1.5, 1);
  } else MAT.baile = MAT.wall;

  /* Superfície grande usa material próprio com repetição ajustada (TEXEL2): o clone
     divide a `Source` do bitmap, então não custa upload novo nem afeta os outros mapas. */
  const repetido = (base, rx, ry) => {
    const m = lam({ color: base.color.getHex(), roughness: base.roughness, metalness: base.metalness });
    if (base.map) {
      const t = base.map.clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true;
      m.map = t; m.needsUpdate = true;
    }
    return m;
  };
  MAT.muralha = repetido(MAT.concrete, 20, 3);
  MAT.morroFundo = repetido(MAT.wall, 3, 2);

  /* TEXEL2: a UV da caixa passa a saber o tamanho do mundo (`aoBoxGeo`+`aoMat`, o conserto
     que textures.js:347 nomeia para este mapa). `vao:false` é a saída para arte AUTORADA
     (letreiro, faixa de cal, placa): ali o desenho cabe UMA vez no painel e a banda de AO
     sujaria a tinta chapada. */
  const addBox = (w, h, d, mat, x, y, z, opts = {}) => {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = h >= 0.25 && Math.abs(y - groundHeightAt(x, z)) <= 0.35;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z);
    if (opts.ry) m.rotation.y = opts.ry;
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    root.add(m);
    if (opts.proxy) m.userData.proxyGLB = opts.proxy;
    if (opts.collide !== false) {
      // AABB da caixa GIRADA (envolvente, nunca menor que a massa): ORT1 pede `ry` em toda
      // massa nova, e um colisor menor que o desenho é corpo entrando em parede.
      const co = Math.abs(Math.cos(opts.ry || 0)), si = Math.abs(Math.sin(opts.ry || 0));
      const hx = w / 2 * co + d / 2 * si, hz = w / 2 * si + d / 2 * co;
      const c = { minX: x - hx, maxX: x + hx, minY: y, maxY: y + h, minZ: z - hz, maxZ: z + hz };
      colliders.push(c); occluders.push(m);
    } else if (opts.bala) occluders.push(m);   // visível dentro de colisor alheio: a bala para nele (BUG-54)
    return m;
  };

  // Planos rasos: não criam colisão nem obstáculo. `base` é a cota do terreno sob a
  // casa — sem ela, porta e janela flutuam na encosta ou afundam na baixada.
  const fachadaCasa = (x, z, w, d, h, seed = 0, base = 0) => {
    const eixoX = Math.abs(x) > Math.abs(z), lado = eixoX ? Math.sign(x || 1) : Math.sign(z || 1);
    if (eixoX) {
      const fx = x - lado * (w / 2 + 0.035);
      addBox(0.07, 1.95, 0.86, MAT.door, fx, base + 0.04, z + (seed % 2 ? -d * 0.22 : d * 0.22), { collide: false, cast: false, bala: true });
      addBox(0.06, 0.82, 1.12, MAT.glass, fx - lado * 0.01, base + 1.35, z + (seed % 2 ? d * 0.18 : -d * 0.18), { collide: false, cast: false });
      addBox(0.58, 0.08, 1.45, MAT.roof, fx - lado * 0.28, base + 2.4, z + (seed % 2 ? d * 0.18 : -d * 0.18), { collide: false });
    } else {
      const fz = z - lado * (d / 2 + 0.035);
      addBox(0.86, 1.95, 0.07, MAT.door, x + (seed % 2 ? -w * 0.22 : w * 0.22), base + 0.04, fz, { collide: false, cast: false, bala: true });
      addBox(1.12, 0.82, 0.06, MAT.glass, x + (seed % 2 ? w * 0.18 : -w * 0.18), base + 1.35, fz - lado * 0.01, { collide: false, cast: false });
      addBox(1.45, 0.08, 0.58, MAT.roof, x + (seed % 2 ? w * 0.18 : -w * 0.18), base + 2.4, fz - lado * 0.28, { collide: false });
    }
    addBox(w + 0.28, 0.11, d + 0.28, seed % 3 ? MAT.roof : MAT.concrete, x, base + h, z, { collide: false });
    if (seed % 3 === 0) addBox(w * 0.46, 0.85, d * 0.42, MAT.wall, x + w * 0.12, base + h + 0.1, z - d * 0.16, { collide: false });
    // Chapa inclinada, remendo de reboco e conduíte tiram a leitura de prefab repetido.
    // Inclinada, então fora do `addBox` — mas a UV em metros vale igual (era 55 px/m).
    const telha = new THREE.Mesh(aoBoxGeo(w + 0.42, 0.08, d * 0.58, { low: LOWQ, base: BASE_FLOATING }), aoMat(MAT.roof));
    telha.position.set(x, base + h + 0.22, z + (seed % 2 ? -d * 0.18 : d * 0.18));
    telha.rotation.z = (seed % 2 ? -1 : 1) * (0.035 + (seed % 3) * 0.018);
    telha.castShadow = telha.receiveShadow = true; root.add(telha);
    if (eixoX) {
      const fx = x - lado * (w / 2 + 0.045);
      addBox(0.045, 0.62, 1.45, MAT.steelRust, fx - lado * 0.01, base + 0.72 + (seed % 3) * 0.3, z, { collide: false, cast: false });
      addBox(0.035, 2.5, 0.035, MAT.steel, fx - lado * 0.03, base + 0.15, z - d * 0.32, { collide: false, cast: false });
    } else {
      const fz = z - lado * (d / 2 + 0.045);
      addBox(1.45, 0.62, 0.045, MAT.steelRust, x, base + 0.72 + (seed % 3) * 0.3, fz - lado * 0.01, { collide: false, cast: false });
      addBox(0.035, 2.5, 0.035, MAT.steel, x - w * 0.32, base + 0.15, fz - lado * 0.03, { collide: false, cast: false });
    }
  };

  // Galpão é platô cortado na encosta: as rampas interpolam contra a cota do morro.
  const rampaGalpao = (x, z, t) => {
    const m = morroBase(x, z);
    return m + (GALPAO.y - m) * t;
  };
  const groundHeightAt = (x, z) => {
    if (x >= GALPAO.x0 && x <= GALPAO.x1 && z >= GALPAO.z0 && z <= GALPAO.z1) return GALPAO.y;
    if (x >= 18 && x <= GALPAO.x0 && z >= -21.8 && z <= -18.2) return rampaGalpao(x, z, (x - 18) / (GALPAO.x0 - 18));
    if (x >= 26.2 && x <= 29.8 && z >= GALPAO.z1 && z <= -12) return rampaGalpao(x, z, (-12 - z) / (-12 - GALPAO.z1));
    if (Math.abs(x) <= FIELD_X && Math.abs(z) <= FIELD_Z) return FIELD_Y;
    const h = laneHeight(x, z);
    return h === null ? morroBase(x, z) : h;
  };

  // Uma malha de altura evita quatro contas divergentes para campo, rampas e galpao.
  const terrainGeo = new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2, 72, 120);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, groundHeightAt(pos.getX(i), -pos.getY(i)));
  pos.needsUpdate = true; terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, MAT.dirt);
  terrain.rotation.x = -Math.PI / 2; terrain.receiveShadow = true; root.add(terrain);
  occluders.push(terrain);   // a bala para na encosta: sem isto o tiro atravessa o morro (BUG-54)

  // Ruas sobem junto com a encosta. As do lado do baile PARAM no galpão: subindo,
  // passariam acima do piso dele — a MAP1 caça corpo dentro de geometria visível.
  for (const [w, d, x, z] of [[56, 4.2, -6, -27.4], [68, 4.2, 0, 27.4], [4.2, 50, -33.2, 0], [4.2, 38, 33.2, 6]]) {
    const geo = new THREE.PlaneGeometry(w, d, Math.round(w / 2), Math.round(d / 2));
    const p = geo.attributes.position;
    // `morroBase` e não `groundHeightAt`: a rua acompanha a encosta natural e não sobe
    // no platô do galpão, que ela margeia — senão apareceria um degrau sob a parede norte.
    for (let i = 0; i < p.count; i++) p.setZ(i, morroBase(x + p.getX(i), z - p.getY(i)) + 0.025);
    p.needsUpdate = true; geo.computeVertexNormals();
    const rua = new THREE.Mesh(geo, MAT.asphalt);
    rua.rotation.x = -Math.PI / 2; rua.position.set(x, 0, z); rua.receiveShadow = true; root.add(rua);
    occluders.push(rua);   // acompanha a encosta como o terreno: mesmo contrato de bala
  }
  // Cal gasto, ainda legível: dá escala imediata ao bowl sem criar qualquer obstáculo.
  const cal = lam({ map: T.concrete, color: 0xfffbf0, roughness: 1, transparent: true, opacity: 0.68 });
  for (const [w, d, x, z] of [[39.2, 0.09, 0, -11.9], [39.2, 0.09, 0, 11.9], [0.09, 23.8, -19.5, 0], [0.09, 23.8, 19.5, 0], [0.08, 23.8, 0, 0]])
    addBox(w, 0.018, d, cal, x, FIELD_Y + 0.012, z, { collide: false, cast: false, vao: false });
  const circulo = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.46, 36), cal);
  circulo.rotation.x = -Math.PI / 2; circulo.position.y = FIELD_Y + 0.025; root.add(circulo);

  const { hemi, sun } = applyLook(scene, T, 'fy_campomorro', { nofog: QP.get('nofog') === '1' });
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;

  // Talude do campo: oito aberturas ficam livres; os trechos restantes sao cover baixo.
  for (const [a, b] of [[-20, -14.8], [-10.2, -2.2], [2.2, 10.2], [14.8, 20]]) {
    addBox(b - a, 1.05, 0.35, MAT.wall, (a + b) / 2, FIELD_Y, -FIELD_Z);
    addBox(b - a, 1.05, 0.35, MAT.wall, (a + b) / 2, FIELD_Y, FIELD_Z);
  }
  for (const [a, b] of [[-FIELD_Z, -2.2], [2.2, FIELD_Z]]) {
    addBox(0.35, 1.05, b - a, MAT.wall, -FIELD_X, FIELD_Y, (a + b) / 2);
    addBox(0.35, 1.05, b - a, MAT.wall, FIELD_X, FIELD_Y, (a + b) / 2);
  }

  // Traves leves: nao existe GLB de trave no acervo; o fallback visivel custa seis caixas.
  for (const x of [-18.2, 18.2]) {
    for (const z of [-3, 3]) addBox(0.14, 2.4, 0.14, MAT.white, x, FIELD_Y, z);
    addBox(0.14, 0.14, 6.14, MAT.white, x, FIELD_Y + 2.4, 0, { collide: false });
    const pontos = [];
    for (let z = -3; z <= 3.01; z += .5) pontos.push(x, FIELD_Y + .08, z, x, FIELD_Y + 2.34, z);
    for (let y = FIELD_Y + .08; y <= FIELD_Y + 2.35; y += .4) pontos.push(x, y, -3, x, y, 3);
    const rede = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',
      new THREE.Float32BufferAttribute(pontos, 3)), new THREE.LineBasicMaterial({ color: 0xdad6c6, transparent: true, opacity: .64 }));
    rede.position.x = x < 0 ? -.12 : .12; rede.userData.goalNet = x < 0 ? 'oeste' : 'leste'; root.add(rede);
  }
  // Banco de reservas no quadrante sudeste: é o primeiro cover alcançável do
  // centro em menos de 3 s mesmo com AWP (5,35×0,78 m/s), sem tornar o meio seguro.
  const bancoReservas = addBox(3.2, 1.0, .8, MAT.concrete, 9.5, FIELD_Y, 9.6);
  bancoReservas.userData.fieldBench = 'reservas-sudeste';

  // Alambrado assenta na cota local do terreno: a borda oeste já pega a subida do morro.
  for (const x of [-17, -12, -7, -2, 3, 8, 13, 18]) {
    addBox(0.12, 2.2, 0.12, MAT.steel, x, groundHeightAt(x, -13.8), -13.8);
    addBox(0.12, 2.2, 0.12, MAT.steel, x, groundHeightAt(x, 13.8), 13.8);
  }
  for (const z of [-10, -6, -2, 4, 8]) {
    addBox(0.12, 2.2, 0.12, MAT.steel, -21.4, groundHeightAt(-21.4, z), z);
    addBox(0.12, 2.2, 0.12, MAT.steel, 21.4, groundHeightAt(21.4, z), z);
  }
  // Alambrado remendado: barras de alturas e materiais alternados, com vãos preservados.
  for (const z of [-13.8, 13.8]) for (const [a, b, rust] of [
    [-19.5, -15.3, 1], [-13.8, -8.5, 0], [-6.5, -1.1, 1], [1.2, 6.2, 0], [8.1, 13.1, 1], [14.7, 19.5, 0],
  ]) {
    const g = groundHeightAt((a + b) / 2, z), y = g + (rust ? 0.72 : 1.08);
    addBox(b - a, 0.07, 0.06, rust ? MAT.steelRust : MAT.steel, (a + b) / 2, y, z, { collide: false, cast: false });
    if (!rust) addBox(b - a, 0.05, 0.05, MAT.steel, (a + b) / 2, g + 1.82, z, { collide: false, cast: false });
  }
  for (const x of [-21.4, 21.4]) for (const [a, b, rust] of [[-11.2, -7.2, 0], [-5.2, -1.2, 1], [1.1, 5.2, 0], [6.9, 11.2, 1]]) {
    const g = groundHeightAt(x, (a + b) / 2);
    addBox(0.06, 0.07, b - a, rust ? MAT.steelRust : MAT.steel, x, g + (rust ? 0.78 : 1.2), (a + b) / 2, { collide: false, cast: false });
  }
  // Uma única LineSegments desenha tela torta e remendada; os postes físicos continuam sendo
  // a colisão. Diagonais incompletas evitam o alambrado perfeito de estádio novo.
  {
    const pts = [];
    const fio = (x0, y0, z0, x1, y1, z1) => pts.push(x0, y0, z0, x1, y1, z1);
    for (const z of [-13.8, 13.8]) for (let x = -19; x < 19; x += 2.1) {
      const h = 1.45 + ((Math.round(x * 10) & 3) * 0.16), g = groundHeightAt(x, z), g2 = groundHeightAt(x + 2, z);
      if (Math.abs(x) < 2.8 || (x > 9.5 && x < 15.5)) continue;
      fio(x, g + 0.1, z, x + 2.0, g2 + h, z); fio(x + 0.1, g + h, z, x + 1.8, g2 + 0.18, z);
    }
    for (const x of [-21.4, 21.4]) for (let z = -10.5; z < 10.5; z += 2.2) {
      if (Math.abs(z) < 2.8) continue;
      const g = groundHeightAt(x, z), g2 = groundHeightAt(x, z + 2);
      fio(x, g + 0.12, z, x, g2 + 1.65, z + 2.0); fio(x, g + 1.58, z, x, g2 + 0.2, z + 1.9);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const tela = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x4b514f, transparent: true, opacity: 0.68, fog: true }));
    root.add(tela);
  }

  /* LONA DE PATROCÍNIO NO ALAMBRADO (§1.1 da receita). Diagnóstico medido: dos 377
     observadores a ≥25 m do spawn E, 242 enxergavam a cabeça — e 240 deles estavam FORA do
     campo, olhando por cima de um talude de 1,05 m. A ficha proíbe isso (plans/11:48-50:
     "fatias do campo pelos vãos — nunca o campo inteiro de uma boca só").
     Occluder PURO: para bala e visão, NÃO cria colisor — nav, cover, MAP5 e MAP2B ficam
     intactos por construção. Os vãos são os MESMOS que a tela declara acima, e o rasgo de
     2,2 m em x[-12,1..-9,9] é o alambrado arrombado da ficha (plans/11:16). */
  {
    const SBL = new StaticBatch({ name: 'lona' });
    // Patrocínio de comércio de esquina não vem todo da mesma cor. O tom entra no atributo
    // `color` (que o AO já usa), então as 10 lonas continuam custando UM draw call.
    const TONS = [0xf0e4d2, 0xd8e9f2, 0xe9f0d6, 0xf3dcd4, 0xe4dcf0];
    let nl = 0;
    const painel = (x0, z0, x1, z1) => {
      let lo = Infinity, hi = -Infinity;
      for (let t = 0; t <= 1.0001; t += 0.1) {
        const g = groundHeightAt(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t);
        lo = Math.min(lo, g); hi = Math.max(hi, g);
      }
      const h = 2.15 + (hi - lo);
      const geo = aoBoxGeo(Math.max(0.06, x1 - x0), h, Math.max(0.06, z1 - z0), { low: LOWQ, base: BASE_FLOATING });
      const mat = aoMat(MAT.lona);
      const tom = new THREE.Color(TONS[nl++ % TONS.length]).convertSRGBToLinear(), col = geo.attributes.color;
      for (let i = 0; i < col.count; i++)
        col.setXYZ(i, col.getX(i) * tom.r, col.getY(i) * tom.g, col.getZ(i) * tom.b);
      col.needsUpdate = true;
      SBL.add(geo, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, lo + h / 2, (z0 + z1) / 2), mat);
    };
    for (const z of [-13.8, 13.8])
      for (const [a, b] of (z < 0 ? [[-19.5, -12.1], [-9.9, -2.8], [2.8, 9.5], [15.5, 19.5]] : [[-19.5, -2.8], [2.8, 19.5]]))
        painel(a, z, b, z);
    for (const x of [-21.4, 21.4]) for (const [a, b] of [[-11.2, -2.8], [2.8, 11.2]]) painel(x, a, x, b);
    for (const m of SBL.build(root)) occluders.push(m);
  }

  const prop = (id, p, box) => {
    const usaGLB = QP.get('glb') !== '0' && PB.add(id, p);
    const m = addBox(box[0], box[1], box[2], MAT.proxy, p.x, p.y || 0, p.z, { proxy: id });
    /* BUG-54: GLB na tela = proxy sai de `occluders` (a bala testa a malha visível do
       lote, que entra no build abaixo); o AABB continua valendo para o corpo. */
    if (usaGLB) {
      m.visible = false;
      const i = occluders.indexOf(m); if (i >= 0) occluders.splice(i, 1);
    }
    return m;
  };
  // Todo prop de rua passa a nascer na cota do terreno: com o morro, `y: 0` deixaria
  // o fusca enterrado na baixada e a moto voando no flanco oeste.
  prop('arquibancada', { x: -7, y: groundHeightAt(-7, 20), z: 20, targetH: 3.2, ry: Math.PI }, [12, 3.2, 3.5]);
  prop('junkyard_container', { x: 18, y: groundHeightAt(18, 18), z: 18, targetH: 2.7, ry: Math.PI / 2 }, [5.8, 2.7, 2.5]);
  prop('stall', { x: -27, y: groundHeightAt(-27, -8), z: -8, targetH: 2.7, ry: Math.PI / 2 }, [3.5, 2.7, 2.8]);
  prop('fusca', { x: 28, y: groundHeightAt(28, 8), z: 8, targetH: 1.5, ry: 0 }, [1.9, 1.5, 4]);
  prop('moto_cg', { x: -27, y: groundHeightAt(-27, 21), z: 21, targetH: 1.3, ry: 0.4 }, [0.9, 1.3, 2]);

  /* PROPS DE QUADRANTE E DE RUA (§1.5-1.8) + brasilidade de várzea (§4).
     REGRA MEDIDA que governa cada coordenada abaixo: veículo vai ENCOSTADO NA GUIA e prop
     nenhum entra em z∈[16,18] nem em z=-17 — ali correm os corredores de waypoint
     `linha(-27,±17,...)`, e prop no eixo da rua custou de 6 a 31 becos cegos nos testes. */
  // Bar de esquina do campo (q0,3): churrasco, barraca e o mototáxi do morro.
  prop('churrasqueira', { x: -28.3, y: groundHeightAt(-28.3, 18.6), z: 18.6, targetH: 1.1, ry: -0.25 }, [1.2, 1.1, 0.9]);
  prop('stall', { x: -29.5, y: groundHeightAt(-29.5, 21.8), z: 21.8, targetH: 2.7, ry: 0.22 }, [3.5, 2.7, 2.8]);
  prop('moto_cg', { x: -31.8, y: groundHeightAt(-31.8, 22.5), z: 22.5, targetH: 1.3, ry: 0.35 }, [0.9, 1.3, 2]);
  prop('pilha_pneus', { x: -20.5, y: groundHeightAt(-20.5, 25.5), z: 25.5, targetH: 1.2 }, [1.4, 1.2, 1.4]);
  // Depois do jogo (q1,3): mesa com guarda-sol e o fusca de quem veio ver a pelada.
  prop('mesa_guardasol', { x: -8.5, y: groundHeightAt(-8.5, 23), z: 23, targetH: 2.3, ry: -0.3 }, [2.2, 2.3, 2.2]);
  prop('fusca', { x: -3.5, y: groundHeightAt(-3.5, 24.2), z: 24.2, targetH: 1.5, ry: 0.08 }, [1.9, 1.5, 4]);
  /* Trave velha sobressalente encostada atrás da arquibancada — não existe GLB de trave no
     acervo, então vale o mesmo fallback de seis caixas das traves do campo. */
  {
    const gt = groundHeightAt(-17, 21.2);
    for (const dx of [-3.05, 3.05]) addBox(0.13, 2.4, 0.13, MAT.steelRust, -17 + dx, gt, 21.2, { ry: 0.06 });
    addBox(6.24, 0.13, 0.13, MAT.steelRust, -17, gt + 2.4, 21.2, { collide: false, ry: 0.06 });
  }
  // Faixa de serviço entre alambrado e talude: cover fora do campo, dentro dos quadrantes.
  for (const [id, x, z, w, h, d, ry] of [
    ['pilha_pneus', -16.5, -14.9, 1.4, 1.2, 1.4, 0.3],
    ['dumpster', -7.5, -14.9, 1.9, 1.4, 1.3, -0.12],
    ['moto_cg', 5.5, -14.9, 2.0, 1.3, 0.9, Math.PI / 2],
    ['botijao_gas', 17.2, -14.9, 1.2, 1.2, 1.2, 0.4],
    ['pilha_pneus', -16.5, 14.9, 1.4, 1.2, 1.4, -0.28],
    ['kombi', -6.5, 15, 4, 1.5, 1.9, Math.PI / 2],
    ['cooler', 9.5, 14.9, 1.2, 1.1, 1.2, 0.18],
    ['pilha_pneus', 16.5, 14.9, 1.4, 1.2, 1.4, 0.5],
  ]) prop(id, { x, y: groundHeightAt(x, z), z, targetH: h, ry }, [w, h, d]);
  // Veículos do anel: ENCOSTADOS NA GUIA (no eixo da rua eles cortam o anel de waypoints).
  for (const [id, x, z, w, h, d, ry] of [
    ['onibus_urbano', -14, -28.6, 11, 3.1, 1.9, Math.PI / 2],
    ['kombi', 6, 27.6, 4.6, 2.2, 1.8, Math.PI / 2],
    ['fusca', -34.5, -3.5, 1.8, 1.5, 4.2, 0.04],
    ['vw_9150', 22, 28.6, 4.6, 2.4, 1.6, Math.PI / 2],
  ]) prop(id, { x, y: groundHeightAt(x, z), z, targetH: h, ry }, [w, h, d]);
  // O baile joga som PARA FORA: a caixa encosta na fachada sul, virada para o campo.
  prop('caixa_som_baile', { x: 25.6, y: groundHeightAt(25.6, -15.1), z: -15.1, targetH: 1.8, ry: -0.3 }, [1.4, 1.8, 1.2]);
  // Placa do ponto de mototáxi (plano fino: nem colisor nem occluder).
  addBox(0.62, 0.4, 0.05, lam({ map: T.signBoteco || T.concrete, color: 0xf2ecdd, roughness: .8 }),
    -30.8, groundHeightAt(-30.8, 21.5) + 1.05, 21.5, { collide: false, cast: false, vao: false, ry: 0.35 });

  /* POSTES DE LUZ DO CAMPO (§2.1): todo campo de várzea tem quatro, e a silhueta contra o
     céu é metade da leitura do lugar. `ry` em todos: ORT1 é razão, massa de esquadro afunda. */
  for (const [x, z, ry] of [[-22.9, -15.3, 0.18], [22.9, -15.3, -0.18], [-22.9, 15.3, -0.22], [22.9, 15.3, 0.22]]) {
    const g = groundHeightAt(x, z);
    addBox(0.34, 10.6, 0.34, MAT.steel, x, g, z, { ry });
    addBox(2.3, 0.75, 0.6, MAT.steelRust, x, g + 10.45, z, { collide: false, ry });
  }

  // Arquibancada de um lado só, assentada numa base antiga e irregular acima da rua.
  const gArq = groundHeightAt(-7, 20);
  addBox(11.8, 0.55, 3.3, MAT.concrete, -7, gArq, 20, { collide: false, bala: true });
  for (let i = 0; i < 3; i++)
    addBox(11.4 - i * 0.5, 0.34 + i * 0.28, 0.18, MAT.concrete, -7, groundHeightAt(-7, 18.36 + i * 0.08), 18.36 + i * 0.08, { collide: false, bala: true });

  // Fachadas do beco oeste quebram a visada antes da entrada do campo.
  const CASAS = [[-32, 2], [-32, 18], [-24.5, 23], [-13, 24], [7, 24], [29, 21], [31, -5], [13, -24], [-8, -24], [-27, -21], [-33, -10]];
  for (let i = 0; i < CASAS.length; i++) {
    const [x, z] = CASAS[i], base = groundHeightAt(x, z), w = 5.5, d = 4.5;
    // Casa de morro ganha laje: quem está no alto do flanco cresce mais um pavimento.
    // É o que faz a encosta LER como favela empilhada em vez de fileira de blocos.
    const h = 3.6 + ((x + z) & 1) + (base > 2 ? 2.7 : 0);
    addBox(w, h, d, MAT.wall, x, base, z);
    fachadaCasa(x, z, w, d, h, i, base);
    if (i % 4 === 1) {
      const tanque = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 1.15, 12), MAT.concrete);
      tanque.position.set(x + (i % 2 ? 1.25 : -1.25), base + h + 0.66, z); tanque.castShadow = true; root.add(tanque);
    }
  }
  for (const [x, z] of [[-24, 12], [-16, 18], [5, 18], [27, 14], [29, 1], [16, -19], [4, -22], [-18, -18], [-29, -15]])
    addBox(1.8, 1.1, 1.4, MAT.concrete, x, groundHeightAt(x, z), z);
  addBox(0.35, 3, 7, MAT.wall, -24, groundHeightAt(-24, 10.5), 10.5);

  // Galpão NÃO acompanha a encosta: as alturas partem de GALPAO.y — o contrato de
  // spawn/luz/saída do campo-contract-check depende disso parado. Saídas: oeste e sul.
  addBox(12, 0.18, 10, MAT.concrete, 28, 0.82, -21, { collide: false });
  // Piso próprio + iluminação local: o galpão não pode depender do sol atravessar o teto.
  // A revisão em 3:2 media teto, paredão e piso quase no mesmo preto.
  const pisoGalpao = addBox(11.4, .045, 9.4, MAT.galpaoFloor, 28, 1.005, -21, { collide: false, cast: false });
  pisoGalpao.userData.galpaoSurface = 'floor';
  addBox(0.35, 3.2, 10, MAT.wall, GALPAO.x1, GALPAO.y, -21);
  addBox(12, 3.2, 0.35, MAT.wall, 28, GALPAO.y, GALPAO.z0);
  addBox(0.35, 3.2, 3.7, MAT.wall, GALPAO.x0, GALPAO.y, -24.15);
  /* BASCULANTE (§1.3): a parede oeste-sul vira peitoril + verga com vão de 0,70 m em
     y 2,10–2,80. É a "visão picada do campo" que a ficha promete ao time B (plans/11:51):
     o corpo continua barrado (peitoril tapa 1,0–2,1), só o olho e a bala passam. */
  addBox(0.35, 1.10, 3.7, MAT.wall, GALPAO.x0, GALPAO.y, -17.85);
  addBox(0.35, 1.40, 3.7, MAT.wall, GALPAO.x0, GALPAO.y + 1.80, -17.85);
  addBox(3.8, 3.2, 0.35, MAT.wall, 24.1, GALPAO.y, GALPAO.z1);
  addBox(3.8, 3.2, 0.35, MAT.wall, 31.9, GALPAO.y, GALPAO.z1);
  for (const [x, z] of [[23.2, -21], [28, -17.2], [31.4, -23.2]]) {
    const luz = new THREE.PointLight(0xffd6a0, 1.65, 16, 1.55);
    luz.position.set(x, 3.2, z); luz.userData.mapLight = 'galpao'; scene.add(luz);
    const luminaria = addBox(1.15,.055,.38,MAT.exitLight,x,3.92,z,{ collide:false,cast:false });
    luminaria.userData.galpaoLuminaire = true;
  }
  const faixaOeste = addBox(.08, .18, 2.25, MAT.exitLight, 21.78, 3.72, -21, { collide: false, cast: false });
  const faixaSul = addBox(3.65, .18, .08, MAT.exitLight, 28, 3.72, -15.78, { collide: false, cast: false });
  faixaOeste.userData.galpaoExitBand = 'west'; faixaSul.userData.galpaoExitBand = 'south';
  faixaOeste.userData.galpaoBandAnchored = faixaSul.userData.galpaoBandAnchored = true;
  for (const [w,d,x,z,id] of [[.22,.3,21.73,-22.32,'west-a'],[.22,.3,21.73,-19.68,'west-b'],
    [.3,.22,25.98,-15.73,'south-a'],[.3,.22,30.02,-15.73,'south-b']]) {
    const frame = addBox(w,3.2,d,MAT.steelRust,x,1,z,{ collide:false, bala:true }); frame.userData.galpaoFrame = id;
  }
  addBox(12, 0.18, 10, MAT.steel, 28, 4.2, -21, { collide: false, cast: false });
  const forro = addBox(11.45,.06,9.45,MAT.galpaoCeiling,28,4.08,-21,{ collide:false,cast:false });
  forro.userData.galpaoSurface = 'ceiling';
  // Duas águas azul-petróleo separam a silhueta do galpão dos telhados de barraco.
  for (const [x, rz] of [[25.05, -0.17], [30.95, 0.17]]) {
    // 158 m² de telhado a 24,9 px/m era a pior superfície do mapa: entra na UV em metros.
    const agua = new THREE.Mesh(aoBoxGeo(6.7, 0.16, 11.4, { low: LOWQ, base: BASE_FLOATING }), aoMat(MAT.galpaoRoof));
    agua.position.set(x, 4.78, -21); agua.rotation.z = rz; agua.castShadow = true; agua.receiveShadow = true;
    root.add(agua);
  }
  // Pilares do galpão: cada um nasce na SUA cota de encosta e o topo continua no mesmo lugar.
  for (const [x, z] of [[21.85, -25.7], [34.15, -25.7], [34.15, -16.3]]) {
    const g = morroBase(x, z);
    addBox(0.32, Math.max(0.7, 4.35 - g), 0.32, MAT.steelRust, x, g, z, { collide: false });
  }
  // Marquise e letreiro enfatizam que este volume pertence ao baile e está acima do campo.
  addBox(8.4, 0.18, 1.35, MAT.steelRust, 28, 3.55, -15.55, { collide: false });
  addBox(6.8, 0.85, 0.08, MAT.baile, 28, 2.35, -15.29, { collide: false, cast: false, vao: false });
  addBox(0.05, 2.65, 6.2, MAT.baile, GALPAO.x1 - 0.2, GALPAO.y + 0.25, -21, { collide: false, cast: false, vao: false });
  addBox(5.1, 2.4, 0.05, MAT.baile, -32, 0.45, 20.26, { collide: false, cast: false, vao: false });
  // A fachada oeste encara o campo: duas torres de som prolongam as paredes existentes,
  // enquanto o letreiro alto cruza somente o vazio acima da passagem jogável.
  // A torre sul é mais estreita e encostada na quina: cobrir o basculante com paredão de
  // som devolveria a parede que o vão acabou de abrir.
  for (const [z, prof] of [[-24.15, 3.45], [-16.9, 1.7]]) {
    addBox(0.38, 5.9, prof, MAT.sound, GALPAO.x0 - 0.02, GALPAO.y, z, { collide: false });
    for (const y of [1.75, 3.15, 4.55]) {
      const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 20), MAT.soundRing);
      aro.rotation.z = Math.PI / 2; aro.position.set(GALPAO.x0 - 0.29, GALPAO.y + y, z);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.18, 20), MAT.sound);
      cone.rotation.z = Math.PI / 2; cone.position.set(GALPAO.x0 - 0.39, GALPAO.y + y, z);
      aro.castShadow = cone.castShadow = true; root.add(aro, cone);
    }
  }
  addBox(0.34, 0.32, 9.8, MAT.steelRust, GALPAO.x0, GALPAO.y + 6.0, -21, { collide: false });
  addBox(0.06, 1.25, 5.4, MAT.baile, GALPAO.x0 - 0.2, GALPAO.y + 4.85, -21, { collide: false, cast: false, vao: false });
  for (const z of [-24.3, -17.7])
    addBox(0.6, 1.05, 0.6, MAT.roof, GALPAO.x0, GALPAO.y + 6.28, z, { collide: false });
  prop('caixa_som_baile', { x: 26, y: GALPAO.y, z: -21, targetH: 2.8 }, [2.4, 2.8, 4.4]);
  prop('pilha_pneus', { x: 23.5, y: GALPAO.y, z: -24, targetH: 1.2 }, [1.4, 1.2, 1.4]);

  // Três marcos volumétricos e cromaticamente distintos orientam as alas sem
  // depender da repetição dos mesmos decals assados.
  for (const [x,z,w,h,d,tx,cor,id] of [[-15,-12.28,3.2,.72,.12,T.billboard,0xd7e0e6,'placar-norte'],
    [-19.72,7.2,.12,1.8,2.4,T.signPastel,0xf0e6cc,'totem-oeste'],[19.72,-7.6,.12,1.35,2.8,T.signBoteco,0xdfe8d8,'mural-leste']]) {
    const marco = addBox(w,h,d,lam({ map:tx||T.concrete,color:cor,roughness:.72 }),x,FIELD_Y+.15,z,{ collide:false,cast:false,vao:false });
    marco.userData.fieldLandmark = id;
  }

  // Cover de beco distribuido pelos quadrantes que a planta deixa fora do campo.
  for (const [x, z] of [
    [-31, -26], [-21, -25], [-16, -26], [-12, -18], [-7, -26], [-3, -18],
    [3, -26], [9, -18], [-31, 26], [-16, 18], [3, 26], [12, 18], [16, 26],
    [22, 26], [28, 26], [32, 17], [8, -11], [8, 11],
  ]) addBox(1.5, 1.05, 1.3, MAT.concrete, x, groundHeightAt(x, z), z);

  // Vergas acima do peito: seção navegável e AABBs das bocas continuam intactos.
  // Norte: portal enferrujado e cartaz de baile.
  for (const x of [-2.48, 2.48]) addBox(0.5, 3.0, 0.42, MAT.steelRust, x, FIELD_Y, -FIELD_Z, { collide: false });
  addBox(5.45, 0.3, 0.52, MAT.steelRust, 0, 2.35, -FIELD_Z, { collide: false });
  addBox(3.3, 0.62, 0.06, MAT.baile, 0, 2.58, -FIELD_Z + 0.24, { collide: false, cast: false });
  // Sul: concreto pintado e marquise amarela.
  for (const x of [-2.48, 2.48]) addBox(0.5, 2.6, 0.42, MAT.concrete, x, FIELD_Y, FIELD_Z, { collide: false, bala: true });
  addBox(5.45, 0.34, 0.68, MAT.concrete, 0, 1.92, FIELD_Z, { collide: false });
  addBox(3.5, 0.12, 1.1, MAT.white, 0, 2.24, FIELD_Z - 0.28, { collide: false });
  // Oeste: cobertura de zinco baixa e remendada.
  for (const z of [-2.48, 2.48]) addBox(0.42, 2.45, 0.5, MAT.roof, -FIELD_X, FIELD_Y, z, { collide: false });
  addBox(0.72, 0.22, 5.45, MAT.roof, -FIELD_X, 1.72, 0, { collide: false });
  addBox(0.08, 0.72, 3.1, MAT.wall, -FIELD_X + 0.24, 1.95, 0, { collide: false, cast: false });
  // Leste: pórtico de aço azul, vertical e mais alto.
  for (const z of [-2.48, 2.48]) addBox(0.42, 3.35, 0.5, MAT.steel, FIELD_X, FIELD_Y, z, { collide: false });
  addBox(0.72, 0.28, 5.45, MAT.steel, FIELD_X, 2.55, 0, { collide: false });
  addBox(0.07, 1.0, 3.25, MAT.glass, FIELD_X - 0.24, 2.82, 0, { collide: false, cast: false });
  // Nordeste: duas empenas desencontradas enquadram a entrada diagonal.
  for (const [x, h, mat] of [[9.92, 2.75, MAT.wall], [15.08, 3.65, MAT.concrete]])
    addBox(0.5, h, 0.42, mat, x, FIELD_Y, -FIELD_Z, { collide: false });
  addBox(5.7, 0.3, 0.58, MAT.roof, 12.5, 2.62, -FIELD_Z, { collide: false });
  addBox(2.8, 0.64, 0.06, MAT.baile, 12.5, 2.86, -FIELD_Z + 0.26, { collide: false, cast: false });

  /* GUARDA DA BORDA: cada trecho assenta na cota MÍNIMA do seu pedaço e sobra 3 m acima
     da MÁXIMA, com sobreposição entre trechos — sem fresta na guarda (MAP6). */
  const guardaBorda = (x, z, w, d) => {
    let min = Infinity, max = -Infinity;
    for (let t = -0.5; t <= 0.5001; t += 0.02) {
      const g = morroBase(x + (d > w ? 0 : w * t), z + (d > w ? d * t : 0));
      min = Math.min(min, g); max = Math.max(max, g);
    }
    addBox(w, (max - min) + 3, d, MAT.muralha, x, min, z);
  };
  for (const sx of [-HALF_X, HALF_X]) {
    guardaBorda(sx, 0, 0.5, HALF_Z * 2);
    for (let z = -26; z <= 26; z += 6.5) {
      const i = Math.round((z + 26) / 6.5), base = morroBase(sx, z), h = 3.2 + (i % 3) * 0.72;
      addBox(0.12, h, 5.9, i % 2 ? MAT.wall : MAT.baile, sx - Math.sign(sx) * 0.31, base, z, { collide: false });
      addBox(0.38, 0.1, 6.15, MAT.roof, sx - Math.sign(sx) * 0.25, base + h, z, { collide: false });
      addBox(0.05, 0.82, 1.15, MAT.glass, sx - Math.sign(sx) * 0.39, base + 1.25 + (i % 2) * 0.42, z - 1.25, { collide: false, cast: false });
      addBox(0.05, 1.92, 0.82, MAT.door, sx - Math.sign(sx) * 0.39, base + 0.02, z + 1.45, { collide: false, cast: false });
    }
  }
  for (const sz of [-HALF_Z, HALF_Z]) {
    guardaBorda(0, sz, HALF_X * 2, 0.5);
    for (let x = -31.5; x <= 31.5; x += 7) {
      const i = Math.round((x + 31.5) / 7), base = morroBase(x, sz), h = 3.0 + ((i + (sz > 0 ? 1 : 0)) % 4) * 0.55;
      addBox(6.4, h, 0.12, i % 3 ? MAT.wall : MAT.concrete, x, base, sz - Math.sign(sz) * 0.31, { collide: false });
      addBox(6.65, 0.1, 0.38, MAT.roof, x, base + h, sz - Math.sign(sz) * 0.25, { collide: false });
      addBox(1.08, 0.78, 0.05, MAT.glass, x - 1.4, base + 1.25 + (i % 2) * 0.38, sz - Math.sign(sz) * 0.39, { collide: false, cast: false });
      addBox(0.84, 1.92, 0.05, MAT.door, x + 1.45, base + 0.02, sz - Math.sign(sz) * 0.39, { collide: false, cast: false });
    }
  }

  /* SILHUETA DO MORRO: estas lajes ficam ALÉM da muralha (fora de `bounds`) — não tocam
     navegação nem colisão, são só a favela continuando morro acima. */
  for (const [x, z, andares] of [
    [-40, -6, 3], [-40.5, 8, 2], [-39.5, -20, 3], [-44, -2, 3], [-44.5, 14, 2],
    [-43, -26, 4], [-38, 22, 2], [-48, 6, 4], [-47, -14, 4], [-33, -35, 3], [-19, -36, 2], [-6, -37, 3],
  ]) {
    let y = morroBase(x, z);
    for (let a = 0; a < andares; a++) {
      const w = 6.2 - a * 0.9, d = 5.4 - a * 0.8, alt = 3.3 - a * 0.25;
      const laje = addBox(w, alt, d, MAT.morroFundo,
        x + (a % 2 ? 0.7 : -0.6), y, z + (a % 2 ? -0.5 : 0.6), { collide: false, cast: false });
      laje.receiveShadow = false;
      y += alt;
    }
    addBox(1.5, 0.16, 1.5, MAT.roof, x, y, z, { collide: false, cast: false });
  }

  const blocked = (x, z, inf = 0.38, y = groundHeightAt(x, z)) => {
    for (const c of colliders)
      if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && y + 1.6 > c.minY && y + 0.15 < c.maxY) return true;
    return false;
  };

  /* Waypoints: grade simples + eixos das oito rampas. A altura e amostrada durante a
     ligacao, portanto campo, anel e galpao nao se conectam atraves de salto vertical. */
  const nodes = [], adj = [], STEP = 3;
  for (let x = -33; x <= 33; x += STEP) for (let z = -27; z <= 27; z += STEP)
    if (!blocked(x, z, 0.5)) nodes.push({ x, z });
  const linha = (x0, z0, x1, z1, passo = 1.5) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / passo));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
      if (!blocked(x, z, 0.45)) nodes.push({ x, z });
    }
  };
  for (const l of LANES) linha(l.dx * (l.r0 + RAMP_L + 6), l.dz * (l.r0 + RAMP_L + 6), 0, 0);
  linha(29, -21, 16, -20); linha(28, -21, 28, -10);
  linha(-32, 10, -20, 0); linha(-32, 10, -18, 18);
  linha(-31, 8, -25, 0, 1); linha(-25, 0, -20, 0, 1);
  linha(-27, -17, 18, -17, 2); linha(-27, 17, 27, 17, 2);
  linha(-27, -17, -27, 17, 2); linha(27, -10, 27, 17, 2);

  /* 16 amostras medem RESSALTO, não inclinação: o limite de 0,28 m segue reprovando
     desnível seco de laje sem recusar ladeira andável. */
  const SEG_AMOSTRAS = 16;
  const segClear = (a, b) => {
    let h = groundHeightAt(a.x, a.z);
    for (let i = 1; i <= SEG_AMOSTRAS; i++) {
      const t = i / SEG_AMOSTRAS, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const nh = groundHeightAt(x, z);
      if (Math.abs(nh - h) > 0.28 || blocked(x, z, 0.28, nh)) return false;
      h = nh;
    }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) adj.push([]);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz <= 4.6 * 4.6 && segClear(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); }
    }
  }
  function nearestWaypoint(x, z) { let best = 0, bd = Infinity; for (let i = 0; i < nodes.length; i++) { const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
  const dist = (a, b) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
  function findPath(from, to) {
    if (from === to) return [to];
    const g = new Float32Array(nodes.length).fill(Infinity), f = new Float32Array(nodes.length).fill(Infinity);
    const prev = new Int32Array(nodes.length).fill(-1), open = new Set([from]); g[from] = 0; f[from] = dist(from, to);
    while (open.size) {
      let cur = -1, score = Infinity; for (const n of open) if (f[n] < score) { score = f[n]; cur = n; }
      if (cur === to) { const p = [cur]; while (prev[cur] !== -1) { cur = prev[cur]; p.unshift(cur); } return p; }
      open.delete(cur);
      for (const n of adj[cur] || []) { const ng = g[cur] + dist(cur, n); if (ng < g[n]) { prev[n] = cur; g[n] = ng; f[n] = ng + dist(n, to); open.add(n); } }
    }
    return [from];
  }

  const spawns = {
    // Contrato da ficha: E começa exposto no centro, não no beco oeste. Os quatro
    // slots evitam bandeiras/traves e olham em diagonal para o galpão do time B.
    E: [{ x: -4, z: -3 }, { x: -1, z: -3 }, { x: -4, z: 1 }, { x: -1, z: 1 }].map(s => ({ ...s, yaw: 2.2 })),
    B: [{ x: 29, z: -22 }, { x: 31, z: -22 }, { x: 29, z: -19 }, { x: 31, z: -19 }].map(s => ({ ...s, yaw: -Math.PI / 2 })),
  };
  const ctfPoints = [
    { id: 'R', label: 'N', x: -12, z: -8 }, { id: 'E', label: 'W', x: -15, z: 7 },
    { id: 'P', label: 'SE', x: 13, z: 8 }, { id: 'B', label: 'S', x: 12, z: -7 },
  ];

  const placePickup = (kind, x, z) => {
    const y = groundHeightAt(x, z), m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1), MAT.gun);
    m.position.set(x, y + 0.07, z); m.castShadow = true; root.add(m);
    pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m });
  };
  [
    ['ak', -30, 0], ['m4', -22, 18], ['shotgun', -17, 20], ['mp5', 10, 20],
    ['awp', 27, 12], ['deagle', 30, 0], ['m400', 18, -20], ['mp5', 5, -22],
    ['akm', -15, -20], ['shotgun', -29, -18], ['deagle', 19, 15], ['m4', -19, 16],
  ].forEach(p => placePickup(...p));

  const preLote = new Set(root.children);
  PB.build(root);
  /* O lote nasce InstancedMesh visível e fora de `occluders`: sem isto a bala atravessa
     o prop que o corpo respeita (BUG-54, cláusula atravessa-parede). Vidro fica de fora. */
  for (const c of root.children) {
    if (preLote.has(c) || !c.isInstancedMesh) continue;
    const ms = Array.isArray(c.material) ? c.material : [c.material];
    if (ms.some((m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9)))) occluders.push(c);
  }

  /* MATO COM VENTO (RC4, plans/23): GLB e fallback procedural usam o MESMO material de
     vento que a régua mede. Sem collider nem occluder: mato não para bala nem corpo. */
  {
    const matVentoGLB = (m) => aplicaVento(m, { amp: 0.05, freq: 1.25, altRef: 0.75 });
    const PBV = new PropBatch({ bucket: 14, cast: false, matTweak: matVentoGLB });
    const IBV = new InstBatch({ bucket: 14 });
    const geoTufo = mergeParts([0, 1, 2].map((i) => {
      const p = new THREE.PlaneGeometry(0.65, 0.7);
      p.translate(0, 0.35, 0); p.rotateY(i * Math.PI / 3);
      return p;
    }));
    // `T.grass` vem com repeat 30 (chão de 150 m); num tufo de 0,65 m isso vira ruído puro.
    const texTufo = T.grass && T.grass.clone();
    if (texTufo) { texTufo.wrapS = texTufo.wrapT = THREE.RepeatWrapping; texTufo.repeat.set(0.22, 0.22); texTufo.needsUpdate = true; }
    const matTufo = new THREE.MeshStandardMaterial({ map: texTufo, color: 0x8fa870, roughness: 1, side: THREE.DoubleSide });
    aplicaVento(matTufo, { amp: 0.05, freq: 1.25, altRef: 0.75 });
    const hashT = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    const IDS = ['grama_corrego_01', 'grama_corrego_02'];
    const plantaTufo = (x, z, id, alvo) => {
      const y = groundHeightAt(x, z), ry = hashT(x * 7 + z * 13) * Math.PI * 2;
      if (!PBV.add(id, { x, y, z, targetH: alvo, ry })) {
        const d = new THREE.Object3D();
        d.position.set(x, y, z); d.rotation.y = ry; d.scale.setScalar(alvo / 0.7);
        IBV.add(geoTufo, matTufo, d);
      }
    };
    let nt = 0;
    const jitter = () => (hashT(nt++ * 3 + 17) - 0.5) * 1.6;
    const moita = (x, z, n, alvo) => {   // tufo solto não lê: 2-3 juntos viram moita
      for (let k = 0; k < n; k++)
        plantaTufo(x + (hashT(nt * 11 + k) - 0.5) * 0.9, z + (hashT(nt * 13 + k) - 0.5) * 0.9,
          IDS[(nt + k) % 2], alvo + hashT(nt + k * 7) * 0.25);
    };
    // anel junto ao alambrado (fora das bocas de rampa)
    for (const z of [-14.6, 14.6]) for (let x = -17; x <= 17; x += 3.8)
      moita(x + jitter(), z + jitter() * 0.5, 2, 0.55 + hashT(nt) * 0.3);
    for (const x of [-21.9, 21.9]) for (let z = -9; z <= 9; z += 4.2)
      moita(x + jitter() * 0.4, z + jitter(), 2, 0.5 + hashT(nt) * 0.3);
    // cantos do campo (miolo morto, fora das lanes)
    for (const [x, z] of [[-16.5, -10.6], [16.8, -10.4], [-16.2, 10.7], [16.5, 10.5]])
      moita(x + jitter() * 0.5, z + jitter() * 0.5, 3, 0.6 + hashT(nt) * 0.25);
    // taboa/taioba na baixada sul e base de casa — textura de margem de várzea
    for (const [x, z, id, h] of [[-27.5, 15.5, 'planta_corrego_taboa', 1.35], [-25.9, 16.2, 'planta_corrego_taboa', 1.2],
      [30.6, 12.8, 'planta_corrego_taioba', 0.85], [-13.4, 22.6, 'planta_corrego_taioba', 0.9],
      [6.2, 22.9, 'planta_corrego_taboa', 1.3], [28.4, -13.2, 'planta_corrego_taioba', 0.8]])
      plantaTufo(x, z, id, h);
    PBV.build(root);
    IBV.build(root);
  }

  /* VARAL DE BANDEIRINHA (§4.7) — a única coisa que se mexe no céu do mapa além da poeira.
     Mesmo material de vento que a régua RC4 mede. Corda e bandeirinha não têm colisor:
     passam por cima dos corredores de waypoint sem tocar em nav. */
  {
    const IBB = new InstBatch({ bucket: 24 });
    const geoBand = new THREE.PlaneGeometry(0.22, 0.26);
    geoBand.translate(0, -0.13, 0);
    const CORES = [0xe0483a, 0xf2c437, 0x3f8fd0, 0x4fae56, 0xe7effa];
    // `T.awning` tem 256 px por volta: num retalho de 0,22 m a UV crua daria 1160 px/m.
    const texBand = (T.awning || T.concrete).clone();
    texBand.wrapS = texBand.wrapT = THREE.RepeatWrapping; texBand.repeat.set(0.12, 0.55); texBand.needsUpdate = true;
    const matBand = new THREE.MeshStandardMaterial({ map: texBand, roughness: .92, side: THREE.DoubleSide });
    aplicaVento(matBand, { amp: 0.05, freq: 1.25, altRef: 0.75 });
    const pts = [], dummy = new THREE.Object3D();
    let nb = 0;
    for (const [x0, z0, x1, z1, alt] of [[-31.6, 22.8, -26, 18.6, 3.1], [-24, 16, -18, 18, 3.4]]) {
      const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(L / 0.8));
      const y0 = groundHeightAt(x0, z0) + alt, y1 = groundHeightAt(x1, z1) + alt;
      const rumo = Math.atan2(x1 - x0, z1 - z0);
      // catenária rasa: corda esticada demais lê como arame, não como varal de festa
      const ponto = (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - 0.42 * Math.sin(Math.PI * t), z0 + (z1 - z0) * t];
      let ant = ponto(0);
      for (let i = 1; i <= n; i++) {
        const p = ponto(i / n);
        pts.push(ant[0], ant[1], ant[2], p[0], p[1], p[2]);
        ant = p;
        if (i < n) {
          dummy.position.set(p[0], p[1] - 0.03, p[2]);
          dummy.rotation.set(0, rumo + (nb % 2 ? 0.25 : -0.25), 0);
          IBB.add(geoBand, matBand, dummy, CORES[nb % CORES.length]);
        }
        nb++;
      }
    }
    const geoCorda = new THREE.BufferGeometry();
    geoCorda.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    root.add(new THREE.LineSegments(geoCorda, new THREE.LineBasicMaterial({ color: 0x6a6255, transparent: true, opacity: .8, fog: true })));
    IBB.build(root);
  }
  const D_PIXO = decalIds(T, ['folha-pixaca-02.png', 'folha-pixaca-03.png']);
  const D_MURAL = decalIds(T, ['or-mitico-mural.png', 'personagem-muro.png']);
  grafitar({
    id: 'fy_campomorro', root, T, waypoints: nodes, seed: 5077, passo: 1.05, alcance: 8, cobre: 0.045, minLarg: 0.4,
    bandas: [
      { y0: 0.3, y1: 2.4, larg: 3.2, alturas: [1.8, 1.2, 0.8], chance: 24, pool: D_PIXO },
      { y0: 1.6, y1: 3.4, larg: 4.2, alturas: [1.8, 1.3], chance: 28, pool: D_MURAL },
    ],
  });

  /* BUG-57: campo de várzea tem caramelo na lateral, pombo na arquibancada e rato no galpão. */
  const ambience = createFavelaAmbience(root, {
    map: 'fy_campomorro',
    rats: [
      { pos: [24, 1, -18], to: [26.5, 1, -16], phase: .4 },
      { pos: [-25, 0, 12], to: [-22.5, 0, 14.5], phase: 1.5 },
    ],
    /* vida 2 (14/09): duas das três pombas de meio de campo saem e pagam a fauna de sítio
       abaixo (−13.856 +14.895 = +1.039 tri, praticamente neutro). Ficou a da arquibancada. */
    pigeons: [
      { mode: 'ground', pos: [14, 0, 21], phase: 1.4 },
    ],
    dogs: [{ pos: [-17, 0, 21], to: [-13, 0, 21], phase: .6 }],
    /* BUG-57 v2.1: galinha do campinho e vaca da várzea (Quaternius CC0) */
    chickens: [
      { pos: [8, 0, 18], to: [10.5, 0, 19.5], phase: .3 }, { pos: [-8, 0, 19], to: [-5.5, 0, 20.5], phase: 1.9 },
    ],
    cows: [{ pos: [-20, 0, 17], to: [-15, 0, 17], phase: 1.1 }],
    /* tatu: posições usam groundHeightAt — y=0 cravado enterrava o bicho na encosta. */
    armadillos: [
      { pos: [11, groundHeightAt(11, 20), 20], to: [13.5, groundHeightAt(13.5, 21.5), 21.5], phase: .9 },
      { pos: [-6, groundHeightAt(-6, 16), 16], to: [-9, groundHeightAt(-9, 17.5), 17.5], phase: 2.4 },
    ],
    /* vida 2 (14/09) — sítio de várzea. Alturas por `groundHeightAt` pelo mesmo motivo dos
       tatus: y=0 cravado enterra o bicho na encosta. Folga ao colisor medida em /tmp:
       galinha 2,25 m · pinto 1,85 m · capote 1,82 m · cavalo 3,11 m · cabra 3,32 m. */
    hens: [{ pos: [-11, groundHeightAt(-11, 16), 16], to: [-9.8, groundHeightAt(-9.8, 16.6), 16.6], phase: .7 }],
    chicks: [{ pos: [-10.4, groundHeightAt(-10.4, 16.4), 16.4], to: [-10.9, groundHeightAt(-10.9, 15.9), 15.9], phase: 2.1 }],
    /* capote é bicho de TERREIRO: fica no canto de fora do campo, perto das galinhas */
    guineas: [{ pos: [-2.6, groundHeightAt(-2.6, 15.6), 15.6], to: [-1.4, groundHeightAt(-1.4, 16.2), 16.2], phase: 1.3 }],
    /* cavalo PASTANDO na encosta: sem `to` de propósito — o GLB é de cabeça baixa no capim,
       e cavalo pastando que anda sem mexer a pata é patinação. Ele fica e reage ao susto. */
    horses: [{ pos: [-28, groundHeightAt(-28, 11), 11], phase: .2 }],
    goats: [{ pos: [-16, groundHeightAt(-16, 9), 9], to: [-14.8, groundHeightAt(-14.8, 9.6), 9.6], phase: 1.8 }],
  });

  /* POEIRA DE RUA (RC3, plans/23): spawner determinístico — o harness mede vida por ele.
     Soft particles: o fade vem da cópia de depth do DepthPass (sem composer, comportamento de sempre). */
  const poeira = new GPUParticles(scene, null, {
    tex: typeof document !== 'undefined'
      ? (() => { const t = new THREE.TextureLoader().load('/img/textures/poeira_puff.webp'); t.colorSpace = THREE.SRGBColorSpace; return t; })()
      : null,
    additive: false, max: 96, fadeDist: 0.8, lumAlpha: true, ambiente: 'poeira',
  });
  const RUAS_POEIRA = [
    { x0: -30, z0: -27.4, x1: 18, z1: -27.4 }, { x0: -30, z0: 27.4, x1: 30, z1: 27.4 },
    { x0: -33.2, z0: -22, x1: -33.2, z1: 22 }, { x0: 33.2, z0: -10, x1: 33.2, z1: 22 },
  ];
  let poeiraT = 0, poeiraN = 0;
  const hashP = (i) => { const s = Math.sin(i * 269.3 + 117.7) * 43758.5453; return s - Math.floor(s); };
  function updatePoeira(dt) {
    poeiraT += dt;
    while (poeiraT > 0.14) {
      poeiraT -= 0.14;
      const r = RUAS_POEIRA[poeiraN % RUAS_POEIRA.length], t = hashP(poeiraN * 3 + 1), h2 = hashP(poeiraN * 7 + 2);
      const x = r.x0 + (r.x1 - r.x0) * t, z = r.z0 + (r.z1 - r.z0) * t;
      const dx = Math.sign(r.x1 - r.x0), dz = Math.sign(r.z1 - r.z0);
      poeira.spawn({ x, y: groundHeightAt(x, z) + 0.25 + h2 * 1.3, z }, {
        vel: new THREE.Vector3(dx * (0.5 + h2 * 0.7), 0.06 + h2 * 0.1, dz * (0.5 + hashP(poeiraN * 5) * 0.7)),
        life: 5 + h2 * 4, size: 0.45 + h2 * 0.55, grow: 0.09,
      });
      poeiraN++;
    }
    poeira.update(dt);
  }

  /* FUMAÇA DA CHURRASQUEIRA (§4.5) — o churrasco do troféu da ficha (plans/11:17). Mesmo
     spawner determinístico da poeira, 1 partícula a cada 0,6 s e teto de 24. */
  const fumaca = new GPUParticles(scene, null, {
    tex: poeira.uniforms.uTex.value || null, additive: false, max: 24, fadeDist: 0.8, lumAlpha: true, ambiente: 'fumaca',
  });
  const CHURRAS = { x: -28.3, z: 18.6 };
  let fumacaT = 0, fumacaN = 0;
  function updateFumaca(dt) {
    fumacaT += dt;
    while (fumacaT > 0.6) {
      fumacaT -= 0.6;
      const a = hashP(fumacaN * 11 + 3), b = hashP(fumacaN * 17 + 5);
      fumaca.spawn({ x: CHURRAS.x + (a - 0.5) * 0.3, y: groundHeightAt(CHURRAS.x, CHURRAS.z) + 1.05, z: CHURRAS.z + (b - 0.5) * 0.3 }, {
        vel: new THREE.Vector3((a - 0.5) * 0.22, 0.5 + b * 0.3, (b - 0.5) * 0.22),
        life: 4.5 + b * 2, size: 0.3 + a * 0.25, grow: 0.28,
      });
      fumacaN++;
    }
    fumaca.update(dt);
  }

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.funk,pos:[28,2,-21],radius:24,vol:.5},{src:AMB_LOOPS.grilos,pos:[0,3,0],radius:80,vol:.26}],bioma:'campo'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    update(dt) { updateVento(dt); updatePoeira(dt); updateFumaca(dt); },
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    levels: [{ nome: 'galpao', x0: GALPAO.x0, x1: GALPAO.x1, z0: GALPAO.z0, z1: GALPAO.z1, dePartida: 'B' }],
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
