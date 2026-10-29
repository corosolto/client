/* INVASÃO DOS JAVAPORCOS — cidade do interior cercada por mata fechada. A mata É o limite
   do mapa; o contrato do mundo e o custo do groundHeightAt estão em docs/maps/invasao-javaporcos.md. */
import * as THREE from 'three';
import { aplicaSombraSol } from './mapquality.js';
import { preloadJavaporcos } from './mode_javaporcos.js';
import { AMB_LOOPS } from './soundscape.js';
import { detailFor } from './textures.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { CampoDeAltura, malhaTerreno, HALF, CIDADE, EIXOS } from './map_javaporcos_relevo.js';
import { construirMata } from './map_javaporcos_mata.js';
import { construirCidade, CIDADE_R, AV, CAL } from './map_javaporcos_cidade.js';
import * as TX from './map_javaporcos_texturas.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
const GLB_ON = QP.get('glb') !== '0';

export const INVASAO_JAVAPORCOS_PROPS = ['arvore_mata', 'palmeira_babacu', 'grama_corrego_01', 'grama_corrego_02', 'planta_corrego_taboa',
  'planta_corrego_taioba', 'samambaia', 'bananeira', 'heliconia', 'ixora', 'agave',
  'fachada_comercio', 'fav_house', 'fav_brasileira', 'fav_modular', 'casa_geminada', 'igrejinha',
  'loja_conveniencia', 'stall', 'arara_roupas', 'drinkstand', 'quiosque', 'mesa_guardasol', 'guarda_sol',
  'banco_jardim', 'poste_jardim', 'lampiao_fachada', 'caixa_dagua', 'botijao_gas', 'varal_roupas',
  'dumpster', 'junkyard_container', 'ilha_hortifruti', 'cooler', 'shopping_cart', 'pilha_pneus', 'tires',
  'construction_rubble', 'fusca', 'uno_mille', 'fiat_uno', 'kombi', 'saveiro', 'opala', 'chevette',
  'brasilia_vw', 'moto_cg', 'vw_9150', 'jersey_barrier', 'concrete_roadblock', 'sandbags'];
export { preloadJavaporcos };

const PASSO_NAV = 1.0;             // grade de navegação: 1,5 m deixava aresta cruzando muro de 0,15 m
const RAIO_NAV = 0.45;             // meio corpo de javaporco adulto, com folga
const semente = (s) => () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296);

export function buildInvasaoJavaporcos(scene, T) {
  const root = new THREE.Group();
  root.name = 'invasao-javaporcos';
  scene.add(root);
  const colliders = [], occluders = [], pickups = [];
  const rnd = semente(0x6a7a0c);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.45, 0.45); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };

  /* Toda superfície estrutural nasce COM `map` e com `repeat` 1: a densidade de texel vem
     da UV POR TAMANHO DE MUNDO (vao.js nas caixas, `piso`/`malhaTerreno` nos planos). */
  const MAT = {
    asfalto: lam({ map: TX.asfaltoTex() }),
    calcada: lam({ map: TX.calcadaTex() }),
    bloquete: lam({ map: TX.bloqueteTex() }),
    terra: lam({ map: TX.terraTex() }),
    terraTrilha: lam({ map: TX.terraTex(), color: 0xb6a894 }),
    terraQuintal: lam({ map: TX.terraTex(), color: 0xa09684 }),
    grama: lam({ map: TX.gramaTex() }),
    gramaCidade: lam({ map: TX.gramaTex(), color: 0x9a9272 }),
    bloco: lam({ map: TX.blocoTex() }),
    telha: lam({ map: TX.telhaTex() }),
    fibrocimento: lam({ map: TX.fibrocimentoTex() }),
    zinco: lam({ map: TX.zincoTex(), metalness: 0.35, roughness: 0.62 }),
    madeira: lam({ map: TX.madeiraTex() }),
    ceramica: lam({ map: TX.ceramicaTex() }),
    caixote: lam({ map: TX.madeiraTex(), color: 0xb5794a }),
    prateleira: lam({ map: TX.madeiraTex(), color: 0xa08a70 }),
    cacamba: lam({ map: TX.lataTex(TX.COR.cacamba, 1) }),
    lixeira: lam({ map: TX.lataTex(TX.COR.lixeira, 2) }),
    saco: lam({ map: TX.lataTex(TX.COR.saco, 3), roughness: 0.62 }),
    entulho: lam({ map: TX.terraTex(), color: 0x9a9088 }),
    racao: lam({ map: TX.lataTex('#b99b63', 4) }),
    poste: lam({ map: TX.blocoTex(), color: 0xb9b5ad }),
    cabo: lam({ map: TX.lataTex('#3a3630', 5), roughness: 0.8 }),
    metal: lam({ map: T.metal, color: 0x8d8880, metalness: 0.42, roughness: 0.55 }),
    vao: lam({ map: TX.ceramicaTex(), color: 0x241f1a, roughness: 1 }),
    barra: lam({ map: TX.rebocoTex('#6f6354', 9) }),
    caixaDagua: lam({ map: TX.lataTex('#4d6f86', 6) }),
    rebocoLoja: lam({ map: TX.rebocoTex(TX.COR.rebocoMenta, 5) }),
    rebocoIgreja: lam({ map: TX.rebocoTex('#e4dcc6', 6) }),
    tronco: lam({ map: TX.cascaTex() }),
    copa: lam({ map: TX.folhagemTex(TX.COR.folhagem, 1) }),
    copaEscura: lam({ map: TX.folhagemTex('#141f14', 2) }),
    copaClara: lam({ map: TX.folhagemTex(TX.COR.folhagemClara, 3) }),
    moita: lam({ map: TX.folhagemTex('#1e2c2e', 4) }),
    cipo: lam({ map: TX.cascaTex(), color: 0x6b5b3c }),
    mato: lam({ map: TX.capimTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 }),
    billboard: lam({ map: T.billboard }),
    signBoteco: lam({ map: T.signBoteco }),
    signPastel: lam({ map: T.signPastel }),
    signSindicato: lam({ map: T.signSindicato }),
    truckSide: lam({ map: T.truckSide }),
    reboco: [TX.COR.rebocoOcre, TX.COR.rebocoMenta, TX.COR.rebocoRosa, TX.COR.rebocoPalha]
      .map((c, i) => lam({ map: TX.rebocoTex(c, i + 1) })),
    toldo: [TX.COR.toldoA, TX.COR.toldoB, TX.COR.toldoC].map((c, i) => lam({ map: TX.toldoTex(c, i + 1) })),
  };
  MAT.vidro = lam({ map: TX.ceramicaTex(), color: 0x7f949c, roughness: 0.18, metalness: 0.12 });
  MAT.pneu = lam({ map: TX.lataTex('#2a2825', 7, 1, 1) });
  /* Lataria memoizada por cor: cinco carros da mesma cor compartilham material, então a
     paleta não vira cinco programas de shader nem cinco linhas no SUP1. */
  const _lataria = new Map();
  MAT.lataria = (cor) => {
    let m = _lataria.get(cor);
    if (!m) { m = lam({ map: TX.ceramicaTex(), color: cor, roughness: 0.42, metalness: 0.28 }); _lataria.set(cor, m); }
    return m;
  };

  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });

  function caixa(w, h, d, mat, x, y, z, opts = {}) {
    const solo = onGround(y, h) && !opts.ry;
    const geo = VAO_BANDS ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, VAO_BANDS ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z);
    if (opts.ry) m.rotation.y = opts.ry;
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.nome) m.name = opts.nome;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) { colisor(x, z, w / 2, d / 2, y, y + h, opts.ry || 0); occluders.push(m); }
    else if (opts.bala) occluders.push(m);
    return m;
  }

  /* Colisor girado portado do padrão da casa (map_brasilia/map_corrego): sem ele a AABB de
     casa girada projeta canto para fora e o MAP1 acusa corpo dentro de sólido. */
  function colisor(cx, cz, hx, hz, minY, maxY, ry) {
    if (!ry || Math.abs(Math.sin(2 * ry)) < 1e-6) {
      const troca = ry ? Math.abs(Math.cos(ry)) < 0.5 : false;
      const ax = troca ? hz : hx, az = troca ? hx : hz;
      colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az });
      return;
    }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const ax = Math.abs(hx * cs) + Math.abs(hz * sn), az = Math.abs(hx * sn) + Math.abs(hz * cs);
    colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az, ry, cx, cz, hx, hz, cos: cs, sin: sn });
  }

  /* Chão com UV POR METRO: a PlaneGeometry nasce com UV 0→1, e um asfalto de 72 m assim
     rende 3,5 px/m — era isso que fazia a avenida ler como areia lavada. 2 m por volta. */
  const TILE_PISO = 2.0;
  const piso = (w, d, mat, x, z, y = 0, nome = 'chao', tile = TILE_PISO) => {
    const geo = new THREE.PlaneGeometry(w, d);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (d / tile));
    uv.needsUpdate = true;
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z); m.receiveShadow = true; m.name = nome;
    root.add(m);
    return m;
  };

  const placa = (w, h, d, mat, x, y, z, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.rotation.set(0, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    root.add(m); occluders.push(m);
    return m;
  };

  const kit = { root, colliders, occluders, MAT, caixa, piso, placa, colisor };

  // ── Relevo. A malha do terreno sai da MESMA grade que o groundHeightAt lê.
  const campo = new CampoDeAltura();
  const terreno = [
    [-HALF, HALF, -HALF, -CIDADE, MAT.grama], [-HALF, HALF, CIDADE, HALF, MAT.grama],
    [-HALF, -CIDADE, -CIDADE, CIDADE, MAT.grama], [CIDADE, HALF, -CIDADE, CIDADE, MAT.grama],
    [-CIDADE, CIDADE, -CIDADE, CIDADE, MAT.gramaCidade],
  ];
  for (const [x0, x1, z0, z1, mat] of terreno) {
    const m = malhaTerreno(campo, mat, x0, x1, z0, z1);
    m.name = 'chao-terreno';
    root.add(m);
  }
  agua(root, MAT, campo);

  // ── Cidade primeiro (ela escreve as plataformas no campo), depois a mata.
  const cidade = construirCidade(kit, campo, rnd);
  const mata = construirMata(kit, campo, rnd);
  carros(kit, campo, rnd);
  vegetacaoUrbana(kit, campo, rnd);
  if (SKIRT.build) SKIRT.build(root);
  propsOpcionais(root, occluders, campo, rnd, mata, cidade);

  // ── Luz e céu do entardecer medido nas referências de arte.
  scene.background = new THREE.Color(0xbb8559);
  scene.fog = new THREE.Fog(0xc08b60, 38, 150);
  const sun = new THREE.DirectionalLight(0xffd3a0, 2.4);
  sun.position.set(-46, 22, 34);
  sun.castShadow = true;
  const sc = sun.shadow.camera;
  sc.left = -76; sc.right = 76; sc.top = 76; sc.bottom = -76; sc.near = 1; sc.far = 190;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xc79872, 0x3a3328, 0.82);
  scene.add(hemi);
  aplicaSombraSol(sun);

  // ── Navegação
  const nav = navegacao(colliders, campo, cidade.portas);

  const groundHeightAt = (x, z) => campo.amostra(x, z);
  /* Spawns no eixo da avenida, longe da fila de carros: o MAP2B cobra 1,20 m de folga de
     parede e 40 m² de chão contíguo, e nascer encostado em lataria reprova os dois. */
  const spawns = {
    E: [[-2.0, 10.6], [2.0, 10.6], [-2.0, 14.2], [2.0, 14.2], [0, 12.4], [0, 17.0]]
      .map(([x, z]) => ({ x, z, yaw: Math.PI })),
    B: [[-2.0, -10.6], [2.0, -10.6], [-2.0, -14.2], [2.0, -14.2]].map(([x, z]) => ({ x, z, yaw: 0 })),
  };

  return {
    mode: 'horde', root, colliders, occluders, pickups, sun, hemi, spawns,
    groundHeightAt,
    waypoints: { nodes: nav.nodes, adj: nav.adj },
    nearestWaypoint: nav.nearestWaypoint,
    findPath: nav.findPath,
    boarEntrances: mata.boarEntrances,
    hordeObjectives: cidade.hordeObjectives,
    foodSpots: cidade.foodSpots,
    lojas: cidade.lojas,
    /* `r` já é a distância do CENTRO do ponto em que o focinho alcança (meia-extensão do
       colisor + 0,40): quem consome NÃO soma folga de corpo. Acordo com o modo, 29/10. */
    foodMesh: (id) => cidade.foodMeshes.get(id) || null,
    foodCollider: (id) => cidade.foodColliders.get(id) || null,
    cityBounds: { minX: -CIDADE_R, maxX: CIDADE_R, minZ: -CIDADE_R, maxZ: CIDADE_R },
    bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
    censo: { ...cidade.censo, ...mata.censo, nos: nav.nodes.length, nosPodados: nav.ilhados, colisores: colliders.length },
    sound: { bioma: 'campo', loops: [
      { src: AMB_LOOPS.passaros, pos: [0, 6, -44], radius: 90, vol: 0.28 },
      { src: AMB_LOOPS.grilos, pos: [0, 2, 44], radius: 80, vol: 0.2 },
      { src: AMB_LOOPS.corrego, pos: [4, 1, -39], radius: 34, vol: 0.26 },
      { src: AMB_LOOPS.cidade, pos: [0, 3, 0], radius: 40, vol: 0.12 },
    ] },
  };
}

/* Lâmina do córrego: nome começando em `agua` para a régua de superfície e a sonda do
   map-check a ignorarem — água não é chão nem teto. */
function agua(root, MAT, campo) {
  const geo = new THREE.PlaneGeometry(2 * HALF, 6.4, 116, 4);
  const pos = geo.attributes.position;
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), z = -39 - pos.getY(v);
    pos.setZ(v, campo.amostra(x, z) + 0.18);
  }
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ color: 0x4d6150, roughness: 0.22, metalness: 0.1, transparent: true, opacity: 0.82 });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0, 0, -39);
  m.name = 'agua-corrego';
  m.userData.nonSolidSurface = true;
  root.add(m);
}

/* Carro parado é escala e cobertura de rua. Fica colado na calçada e NUNCA no
   cruzamento: a primeira versão estacionava um carro no meio da avenida central. */
function carros(kit, campo, rnd) {
  const { MAT, caixa } = kit;
  const vagas = [];
  for (let t = -30; t <= 30; t += 7.5) {
    if (Math.abs(t) < AV + 3) continue;
    for (const s of [-1, 1]) { vagas.push([s * (AV - 1.1), t, 0]); vagas.push([t, s * (AV - 1.1), Math.PI / 2]); }
  }
  let n = 0;
  for (const [x, z, ry] of vagas) {
    if (rnd() > 0.38) continue;
    const y = campo.amostra(x, z);
    const giro = ry + (rnd() - 0.5) * 0.18;
    const cor = [0x9c9a95, 0x7d4a3c, 0x4e5d6b, 0xbfb49a, 0x53504c][(rnd() * 5) | 0];
    const cs = Math.cos(giro), sn = Math.sin(giro);
    const desloca = (ox, oz) => [x + ox * cs + oz * sn, z - ox * sn + oz * cs];
    caixa(1.72, 0.72, 4.1, MAT.lataria(cor), x, y + 0.26, z, { ry: giro });
    const [kx, kz] = desloca(0, -0.2);
    caixa(1.5, 0.62, 1.95, MAT.lataria(cor), kx, y + 0.98, kz, { ry: giro, collide: false });
    for (const lado of [-1, 1]) {
      const [vx, vz] = desloca(lado * 0.76, -0.2);
      kit.placa(0.06, 0.48, 1.6, MAT.vidro, vx, y + 1.06, vz, giro);
    }
    const [fx, fz] = desloca(0, 0.78);
    kit.placa(1.42, 0.5, 0.08, MAT.vidro, fx, y + 1.02, fz, giro, 0.3);
    for (const [ox, oz] of [[-0.78, -1.4], [0.78, -1.4], [-0.78, 1.4], [0.78, 1.4]]) {
      const rx = x + ox * Math.cos(giro) + oz * Math.sin(giro), rz = z - ox * Math.sin(giro) + oz * Math.cos(giro);
      kit.placa(0.26, 0.6, 0.6, MAT.pneu, rx, y, rz, giro);
    }
    n++;
  }
  return n;
}

/* Mato de calçada, bananeira de quintal e grama de beira: é o que tira o chão chapado
   entre o asfalto e a mata, e tudo instanciado em duas chamadas de desenho. */
function vegetacaoUrbana(kit, campo, rnd) {
  const { MAT } = kit;
  const tufos = [], arbustos = [];
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const mtx = (x, y, z, ry, sx, sy) => {
    _e.set(0, ry, 0); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sx);
    return new THREE.Matrix4().compose(_p, _q, _s);
  };
  for (let x = -CIDADE_R + 0.6; x < CIDADE_R; x += 1.1) {
    for (let z = -CIDADE_R + 0.6; z < CIDADE_R; z += 1.1) {
      const naRua = Math.abs(x) < AV + CAL || Math.abs(z) < AV + CAL;
      const perto = Math.min(Math.abs(Math.abs(x) - CIDADE_R), Math.abs(Math.abs(z) - CIDADE_R));
      if (naRua && rnd() > 0.06) continue;
      if (!naRua && perto > 6 && rnd() > 0.1) continue;
      const px = x + (rnd() - 0.5) * 0.9, pz = z + (rnd() - 0.5) * 0.9;
      const y = campo.amostra(px, pz);
      // acima de 0,17 m é piso construído (praça 0,18, loja 0,33): capim ali é mato em
      // cima de bloquete e dentro de loja, que foi o que a primeira captura mostrou.
      if (y > 0.17) continue;
      tufos.push(mtx(px, y + 0.12, pz, rnd() * 6.283, 0.55 + rnd() * 0.5, 0.26 + rnd() * 0.16));
      if (rnd() < 0.08) arbustos.push(mtx(px, y + 0.42, pz, rnd() * 6.283, 0.8 + rnd() * 0.6, 0.8 + rnd() * 0.5));
    }
  }
  const add = (lista, geo, mat, nome) => {
    if (!lista.length) return;
    const m = new THREE.InstancedMesh(geo, mat, lista.length);
    for (let i = 0; i < lista.length; i++) m.setMatrixAt(i, lista[i]);
    m.name = nome; m.receiveShadow = true; m.instanceMatrix.needsUpdate = true;
    m.userData.nonSolidSurface = true; m.computeBoundingSphere();
    kit.root.add(m);
  };
  add(tufos, new THREE.PlaneGeometry(1, 1), MAT.mato, 'cidade-mato');
  add(arbustos, new THREE.IcosahedronGeometry(1, 0), MAT.moita, 'cidade-arbusto');
}

/* Props GLB entram POR CIMA do procedural e só no browser: em node (onde o portão mede)
   `hasProp` é falso e a geometria autoral é a que vale. */
function propsOpcionais(root, occluders, campo, rnd, mata, cidade) {
  if (!GLB_ON || typeof document === 'undefined') return 0;
  const PB = new PropBatch({ bucket: 24, cortes: { grama_corrego_01: 46, grama_corrego_02: 46, arvore_mata: 92 } });
  let n = 0;
  for (const e of EIXOS) {
    for (const s of [-1, 1]) {
      const x = e.clareira[0] + s * 4.2, z = e.clareira[1] + s * 2.6;
      if (PB.add('arvore_mata', { x, z, y: campo.amostra(x, z), targetH: 11 + rnd() * 4, ry: rnd() * 6.283 })) n++;
    }
  }
  for (let i = 0; i < 90; i++) {
    const x = (rnd() - 0.5) * 2 * CIDADE_R, z = (rnd() - 0.5) * 2 * CIDADE_R;
    if (PB.add(i % 2 ? 'grama_corrego_01' : 'grama_corrego_02', { x, z, y: campo.amostra(x, z), targetH: 0.6, ry: rnd() * 6.283 })) n++;
  }
  for (const l of cidade.lojas) {
    const [x, z] = l.interior;
    if (hasProp('gondola_mercado') && placeProp) { /* catálogo do mercado fica para o PropBatch */ }
    if (PB.add('shopping_cart', { x: x + 1.4, z: z + 1.2, y: 0.33, targetH: 1.0, ry: rnd() * 6.283 })) n++;
  }
  PB.build(root);
  root.traverse((o) => { if (o.isMesh && o.userData.mapPropId) occluders.push(o); });
  void mata;
  return n;
}

/* NAVEGAÇÃO — grade de 1,5 m, costura explícita na porta de cada loja e índice de célula
   para `nearestWaypoint` sair de O(n) para O(1). O modo chama isso ~180×/s. */
function navegacao(colliders, campo, portas) {
  const livre = (x, z) => {
    const y = campo.amostra(x, z);
    for (const c of colliders) {
      if (x < c.minX - RAIO_NAV || x > c.maxX + RAIO_NAV || z < c.minZ - RAIO_NAV || z > c.maxZ + RAIO_NAV) continue;
      if (y + 1.4 <= c.minY || y + 0.3 >= c.maxY) continue;
      if (c.ry) {
        const wx = x - c.cx, wz = z - c.cz;
        const lx = wx * c.cos - wz * c.sin, lz = wx * c.sin + wz * c.cos;
        if (Math.abs(lx) > c.hx + RAIO_NAV || Math.abs(lz) > c.hz + RAIO_NAV) continue;
      }
      return false;
    }
    return true;
  };
  let nodes = [], adj = [];
  const indice = new Map();
  const chave = (i, j) => `${i},${j}`;
  const nI = Math.floor((2 * HALF) / PASSO_NAV);
  for (let i = 0; i <= nI; i++) for (let j = 0; j <= nI; j++) {
    const x = -HALF + i * PASSO_NAV, z = -HALF + j * PASSO_NAV;
    if (!livre(x, z)) continue;
    indice.set(chave(i, j), nodes.length);
    nodes.push({ x, z });
  }
  adj = nodes.map(() => []);
  const liga = (a, b) => { if (a !== b && !adj[a].includes(b)) { adj[a].push(b); adj[b].push(a); } };
  let arestas = 0, ilhados = 0;
  for (let i = 0; i <= nI; i++) for (let j = 0; j <= nI; j++) {
    const a = indice.get(chave(i, j));
    if (a === undefined) continue;
    for (const [di, dj] of [[1, 0], [0, 1]]) {
      const b = indice.get(chave(i + di, j + dj));
      if (b === undefined) continue;
      /* 0,95 m por passo: o barranco (0,58 m/m) sobe, o corte de 1,4 m do córrego sob a
         ponte não. E o MEIO da aresta também tem de estar livre, senão ela cruza muro. */
      if (Math.abs(campo.amostra(nodes[a].x, nodes[a].z) - campo.amostra(nodes[b].x, nodes[b].z)) > 0.95) continue;
      if (!livre((nodes[a].x + nodes[b].x) / 2, (nodes[a].z + nodes[b].z) / 2)) continue;
      liga(a, b); arestas++;
    }
  }
  /* Costura da porta: a grade pode não cair dentro de um vão de 2,7 m, e sem este par de
     arestas a horda para na calçada — foi o caso medido na primeira versão. */
  const maisPerto = (x, z, raio) => {
    let melhor = -1, d2 = raio * raio;
    for (let k = 0; k < nodes.length; k++) {
      const dd = (nodes[k].x - x) ** 2 + (nodes[k].z - z) ** 2;
      if (dd < d2) { d2 = dd; melhor = k; }
    }
    return melhor;
  };
  for (const p of portas || []) {
    const fora = maisPerto(p.x, p.z, 3.6);
    const meio = nodes.length;
    nodes.push({ x: p.x, z: p.z }); adj.push([]);
    const dentroIdx = nodes.length;
    nodes.push({ x: p.dentro[0], z: p.dentro[1] }); adj.push([]);
    if (fora >= 0) liga(fora, meio);
    liga(meio, dentroIdx);
    const interno = maisPerto(p.dentro[0], p.dentro[1], 2.6);
    if (interno >= 0 && interno !== dentroIdx) liga(dentroIdx, interno);
  }

  /* PODA DE ILHA: o contrato de mapa (MC3 do map-contrato-check) faz BFS do nó 0 e exige
     que ele alcance TODOS. Nó sem rota é destino que a horda pede e nunca chega. */
  {
    const comp = new Int32Array(nodes.length).fill(-1);
    let grupos = 0, maior = -1, maiorTam = 0;
    for (let s = 0; s < nodes.length; s++) {
      if (comp[s] >= 0) continue;
      const fila = [s];
      comp[s] = grupos;
      let tam = 1;
      for (let q = 0; q < fila.length; q++) {
        for (const n of adj[fila[q]]) if (comp[n] < 0) { comp[n] = grupos; tam++; fila.push(n); }
      }
      if (tam > maiorTam) { maiorTam = tam; maior = grupos; }
      grupos++;
    }
    ilhados = nodes.length - maiorTam;
    if (grupos > 1) {
      /* A REINDEXAÇÃO é obrigatória: `nearestWaypoint` devolve ÍNDICE, e podar sem
         remapear faria a horda pedir rota para o nó errado. */
      const remap = new Int32Array(nodes.length).fill(-1);
      const novos = [];
      for (let i = 0; i < nodes.length; i++) if (comp[i] === maior) { remap[i] = novos.length; novos.push(nodes[i]); }
      const novaAdj = novos.map(() => []);
      for (let i = 0; i < nodes.length; i++) {
        if (comp[i] !== maior) continue;
        const a = remap[i];
        for (const j of adj[i]) if (remap[j] >= 0) novaAdj[a].push(remap[j]);
      }
      nodes = novos; adj = novaAdj;
    }
  }

  const celula = new Map();
  for (let k = 0; k < nodes.length; k++) {
    const ck = `${Math.round(nodes[k].x / PASSO_NAV)},${Math.round(nodes[k].z / PASSO_NAV)}`;
    let l = celula.get(ck);
    if (!l) { l = []; celula.set(ck, l); }
    l.push(k);
  }
  const nearestWaypoint = (x, z) => {
    const ci = Math.round(x / PASSO_NAV), cj = Math.round(z / PASSO_NAV);
    let melhor = -1, d2 = Infinity;
    for (let anel = 0; anel <= 14; anel++) {
      for (let di = -anel; di <= anel; di++) for (let dj = -anel; dj <= anel; dj++) {
        if (anel && Math.max(Math.abs(di), Math.abs(dj)) !== anel) continue;
        const l = celula.get(`${ci + di},${cj + dj}`);
        if (!l) continue;
        for (const k of l) {
          const dd = (nodes[k].x - x) ** 2 + (nodes[k].z - z) ** 2;
          if (dd < d2) { d2 = dd; melhor = k; }
        }
      }
      // mais um anel depois do primeiro acerto: o vizinho diagonal pode estar mais perto
      if (melhor >= 0 && d2 <= (anel * PASSO_NAV) ** 2) break;
    }
    return melhor < 0 ? 0 : melhor;
  };
  /* BFS com buffers do mapa e marca de geração: `findPath` é chamado ~180×/s pela horda,
     e um Int32Array novo por chamada era lixo de 24 kB por chamada. */
  const visita = new Int32Array(nodes.length);
  const prev = new Int32Array(nodes.length);
  const fila = new Int32Array(nodes.length);
  let geracao = 0;
  const findPath = (from, to) => {
    if (from === to) return [to];
    if (!(from >= 0 && from < nodes.length && to >= 0 && to < nodes.length)) return [from];
    geracao++;
    let cauda = 0, cabeca = 0;
    fila[cauda++] = from; visita[from] = geracao; prev[from] = from;
    while (cabeca < cauda) {
      const atual = fila[cabeca++];
      for (const n of adj[atual]) {
        if (visita[n] === geracao) continue;
        visita[n] = geracao; prev[n] = atual;
        if (n === to) {
          const caminho = [to];
          for (let cur = atual; cur !== from; cur = prev[cur]) caminho.unshift(cur);
          caminho.unshift(from);
          return caminho;
        }
        fila[cauda++] = n;
      }
    }
    return [from];
  };
  return { nodes, adj, nearestWaypoint, findPath, arestas, ilhados };
}
