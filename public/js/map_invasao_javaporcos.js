/* INVASÃO DOS JAVAPORCOS — cidade do interior cercada por mata fechada. A mata É o limite
   do mapa; o contrato do mundo e o custo do groundHeightAt estão em docs/maps/invasao-javaporcos.md. */
import * as THREE from 'three';
import { aplicaSombraSol } from './mapquality.js';
import { preloadJavaporcos } from './mode_javaporcos.js';
import { AMB_LOOPS } from './soundscape.js';
import { detailFor } from './textures.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { setMapSky } from './map_sky.js';
import { CampoDeAltura, malhaTerreno, HALF, CIDADE, MATA_R, EIXOS, CORREGO_MEIA, corregoZ, corteCorrego, distPasto, PASSO } from './map_javaporcos_relevo.js';
import { construirMata, construirPasto } from './map_javaporcos_mata.js';
import { construirCidade, amassaSaco, CIDADE_R, AV, CAL } from './map_javaporcos_cidade.js';
import { construirRefugios, pisoDosRefugios, pisosElevados, tetoDosInteriores } from './map_javaporcos_refugios.js';
import { agruparConstrucoes } from './map_javaporcos_lotes.js';
import * as TX from './map_javaporcos_texturas.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
const GLB_ON = QP.get('glb') !== '0';

/* Carros: só scan (1 primitiva) e junk_car (5, repintado por instância); [id, comprimento,
   altura]. Licença NC (saveiro_robust, byd_dolphin, gol g2) fica fora; chevette custava 12 materiais. */
const JUNK = ['junk_car', 4.0, 1.4];
const CARROS_GLB = [JUNK, JUNK, JUNK, ['carro_batido_scan_03', 4.3, 1.35], JUNK, JUNK, JUNK, ['perua_pichada_scan', 4.35, 1.5],
  JUNK, JUNK, JUNK, ['carro_batido_scan_07', 4.0, 1.4]];
// pintura de carro popular: azul, branco, vermelho, verde, bege, prata; C* ≥ 20 nos quatro primeiros
export const CORES_CARRO = [0x2a5ca8, 0xe2dfd6, 0xb0302a, 0x2f6e46, 0xcdb084, 0x9a9c9e];
export const CARROS_MIN = 16;
const SOLIDOS_GLB = new Set([...CARROS_GLB.map((c) => c[0]), 'arvore_mata', 'tronco_caido', 'toco_arvore', 'pedra_mata', 'poste_luz_praca']);
export const INVASAO_JAVAPORCOS_PROPS = ['carro_batido_scan_03', 'perua_pichada_scan', 'junk_car', 'carro_batido_scan_07',
  'dumpster', 'porta_aco', 'arvore_mata', 'shopping_cart',
  'capim_touceira_a', 'capim_touceira_b', 'arbusto_mata_a', 'arbusto_mata_b', 'samambaia_mata', 'calathea_mata',
  'galhos_secos', 'toco_arvore', 'tronco_caido', 'pedra_mata', 'saco_lixo', 'caixa_papelao', 'engradado_plastico',
  'cadeira_plastico', 'pneu_velho', 'tambor_metal', 'tampa_bueiro', 'lixeira_metal', 'lata_enferrujada',
  'poste_luz_praca', 'caixote_madeira'];
export { preloadJavaporcos };

const PASSO_NAV = 1.0;             // grade de navegação: 1,5 m deixava aresta cruzando muro de 0,15 m
const RAIO_NAV = 0.45;             // meio corpo de javaporco adulto, com folga
const semente = (s) => () => ((s = Math.imul(s, 1664525) + 1013904223 >>> 0) / 4294967296);

export function buildInvasaoJavaporcos(scene, T, ambiente='cidade') {
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
  const comPbr = (id, proc, o = {}, opt = {}) => {
    const p = TX.pbr(id, opt);
    return p ? lam({ ...o, ...p, roughness: 1 }) : lam({ map: proc, ...o });
  };
  const claro = (c, f = 0.4) => new THREE.Color(c).lerp(new THREE.Color(0xffffff), f);
  const MAT = {
    asfalto: comPbr('asphalt_02', TX.asfaltoTex(), {}, { repeat: 0.5 }),
    calcada: comPbr('concrete_pavement', TX.calcadaTex(), {}, { repeat: 0.8 }),
    bloquete: comPbr('patterned_cobblestone', TX.bloqueteTex(), {}, { repeat: 0.9 }),
    terra: comPbr('dirt', TX.terraTex(), {}, { repeat: 0.7 }),
    // cor linear > 1: sob o dossel só o hemi alcança, e a 1,15/0,9/0,58 a trilha lia L* 20
    terraTrilha: comPbr('dirt', TX.terraTex(), { color: new THREE.Color(2.3, 1.95, 1.6), alphaMap: TX.manchaAlphaTex(), alphaTest: 0.42,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    terraQuintal: comPbr('dirt', TX.terraTex(), { color: 0xa09684 }, { repeat: 0.7 }),
    grama: comPbr('forest_leaves_02', TX.gramaTex()),
    pasto: comPbr('leafy_grass', TX.pastoTex(), { vertexColors: true }),
    capimPasto: lam({ map: TX.capimPastoTex(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 }),
    touceira: lam({ map: TX.capimAltoTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 }),
    cupim: comPbr('dirt', TX.terraTex(), { color: new THREE.Color(1.6, 1.22, 0.96), vertexColors: true }),   // barro de cupim é ocre, o dirt é L* 36
    mourao: lam({ map: TX.cascaTex(), color: 0xb0a490 }),
    cimento: lam({ map: TX.cimentoTex(), color: 0xd8d2c6 }),
    medidor: lam({ map: TX.lataTex('#9a9c98', 8), metalness: 0.3, roughness: 0.5 }),
    roupa: lam({ map: TX.tecidoTex(), side: THREE.DoubleSide }),
    botijao: lam({ map: TX.lataTex('#2f5f9a', 10), metalness: 0.25, roughness: 0.45 }),
    lixeiraAmarela: lam({ map: TX.lataTex('#d1a92a', 11), roughness: 0.6 }),
    rebocoDesc: [comPbr('damaged_plaster', TX.rebocoDescascadoTex('#c9a86a', 1), { color: claro('#d8b06a', 0.15) }, { metros: 2.6 }),
      comPbr('damaged_plaster', TX.rebocoDescascadoTex('#7f9db0', 2), { color: claro('#7f9db0', 0.15) }, { metros: 2.6 })],
    gramaCidade: comPbr('sparse_grass', TX.gramaTex(), {}, {}),
    // muro de bloco: mancha de umidade do reboco musgoso e a junta do bloco só no relevo (sdL 2,8 com o liso)
    // albedo claro no lugar de luz de preenchimento: a cena já está no teto de 9 luzes (muro na sombra L* 14 → 18)
    bloco: (() => {
      const cor = TX.pbr('worn_mossy_plasterwall', { metros: 3 }), junta = TX.pbr('concrete_pavement', { repeat: 3, metros: 3 });
      const m = cor ? lam({ ...cor, normalMap: junta.normalMap, roughness: 1, color: 0xebe6de }) : lam({ map: TX.blocoTex(), color: 0xece7dd });
      m.name = 'muro-bloco';
      return m;
    })(),
    telha: lam({ map: TX.telhaTex() }),
    fibrocimento: lam({ map: TX.fibrocimentoTex() }),
    zinco: lam({ map: TX.zincoTex(), metalness: 0.35, roughness: 0.62 }),
    madeira: lam({ map: TX.madeiraTex() }),
    ceramica: lam({ map: TX.ceramicaTex() }),
    caixote: lam({ map: TX.madeiraTex(), color: 0xb5794a }),
    prateleira: lam({ map: TX.madeiraTex(), color: 0xa08a70 }),
    cacamba: lam({ map: TX.lataTex(TX.COR.cacamba, 1) }),
    lixeira: lam({ map: TX.lataTex(TX.COR.lixeira, 2) }),
    saco: lam({ map: TX.lataTex(TX.COR.saco, 3), roughness: 0.35 }),
    entulho: lam({ map: TX.terraTex(), color: 0x9a9088 }),
    racao: lam({ map: TX.lataTex('#b99b63', 4) }),
    poste: comPbr('concrete046', TX.blocoTex(), { color: 0xb9b5ad }, { metros: 2.5 }),
    cabo: lam({ map: TX.lataTex('#3a3630', 5), roughness: 0.8 }),
    metal: lam({ map: T.metal, color: 0x8d8880, metalness: 0.42, roughness: 0.55 }),
    vao: lam({ map: TX.ceramicaTex(), color: 0x1c1f22, roughness: 1 }),
    janela: lam({ map: TX.janelaTex(), emissiveMap: TX.janelaTex(), roughness: 0.22, emissive: 0x120f0c, emissiveIntensity: 1 }),
    janelaAcesa: lam({ map: TX.janelaTex(), emissiveMap: TX.janelaTex(), roughness: 0.22, emissive: 0xffb066, emissiveIntensity: 1.5 }),
    // só projeta sombra: o passe de cor não escreve nada (sombra de caixa no lugar do GLB)
    soSombra: new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    // o peeling_painted_wall tem sdL 1,8: na sombra o rodapé do beco lia placa lisa (flat8 99,7%)
    barra: (() => {
      const n = TX.pbr('damaged_plaster', { repeat: 3 });
      const m = lam({ map: TX.rebocoDescascadoTex('#8c4e46', 9), roughness: 1, ...(n ? { normalMap: n.normalMap } : {}) });
      m.normalScale.set(3, 3); m.name = 'barra-reboco';
      return m;
    })(),
    caixaDagua: lam({ map: TX.lataTex('#4d6f86', 6) }),
    rebocoLoja: comPbr('paintedplaster017', TX.rebocoTex(TX.COR.rebocoMenta, 5), { color: claro(TX.COR.rebocoMenta, 0.1) }, { metros: 3 }),
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
    decal: lam({ ...TX.decalAtlasTex(), transparent: true, depthWrite: false, alphaTest: 0.02, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    letreiro: lam({ map: TX.letreiroAtlasTex(), roughness: 0.8 }),
    luminaria: new THREE.MeshStandardMaterial({ color: 0xffd8a8, emissive: 0xffc48a, emissiveIntensity: 4, roughness: 0.4 }),
    reboco: [TX.COR.rebocoOcre, TX.COR.rebocoMenta, TX.COR.rebocoRosa, TX.COR.rebocoPalha]
      .map((c, i) => comPbr('worn_mossy_plasterwall', TX.rebocoTex(c, i + 1), { color: claro(c, 0.3) }, { metros: 3 })),
    toldo: [TX.COR.toldoA, TX.COR.toldoB, TX.COR.toldoC].map((c, i) => lam({ map: TX.toldoTex(c, i + 1) })),
  };
  /* Cartão de capim com normal para cima nas DUAS faces: o three inverte a normal no verso
     em DoubleSide, e o verso do tufo saía preto. */
  for (const m of [MAT.capimPasto, MAT.touceira, MAT.mato]) {
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>',
        THREE.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0'));
    };
    m.customProgramCacheKey = () => 'jp-cartao-sem-verso';
  }
  MAT.vidro = lam({ map: TX.ceramicaTex(), color: 0x46525a, roughness: 0.12, metalness: 0.35 });
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
    m.userData.construcaoImovel = true;
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
    m.userData.construcaoImovel = true;
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z); m.receiveShadow = true; m.name = nome;
    root.add(m);
    return m;
  };

  const placa = (w, h, d, mat, x, y, z, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.userData.construcaoImovel = true;
    m.position.set(x, y + h / 2, z);
    m.rotation.set(0, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    root.add(m); occluders.push(m);
    return m;
  };

  const orlaGLB = GLB_ON && typeof document !== 'undefined' && hasProp('samambaia_mata');
  const kit = { root, colliders, occluders, MAT, caixa, piso, placa, colisor, orlaGLB, aoMat: VAO_BANDS ? aoMat : null };

  // ── Relevo. A malha do terreno sai da MESMA grade que o groundHeightAt lê.
  const campo = new CampoDeAltura(ambiente==='vila'?(x,z,h)=>h+Math.max(0,1-Math.max(0,Math.max(Math.abs(x),Math.abs(z))-36)/16)*Math.min(3.6,Math.max(0,(z+36)*.05)):null);
  const cidade = construirCidade(kit,campo,rnd,ambiente);
  const P = MATA_R, C = CIDADE;
  const terreno = [
    [-HALF, HALF, -HALF, -P, MAT.grama], [-HALF, HALF, P, HALF, MAT.grama],
    [-HALF, -P, -P, P, MAT.grama], [P, HALF, -P, P, MAT.grama],
    [-P, P, -P, -45, MAT.pasto, 2], [-P, -8, -45, -38, MAT.pasto, 1], [-8, 1, -45, -38, MAT.pasto, PASSO],
    [1, P, -45, -38, MAT.pasto, 1],
    [-P, P, -38, -C, MAT.pasto, 2], [-P, P, C, P, MAT.pasto, 2],
    [-P, -C, -C, C, MAT.pasto, 2], [C, P, -C, C, MAT.pasto, 2],
    [-C, C, -C, C, MAT.gramaCidade],
  ];
  for (const [x0, x1, z0, z1, mat, pasto] of terreno) {
    const m = pasto ? malhaTerreno(campo, mat, x0, x1, z0, z1, pasto, 3.0, corPasto) : malhaTerreno(campo, mat, x0, x1, z0, z1, mat === MAT.gramaCidade ? (ambiente==='cidade'?2:PASSO) : 1);
    m.name = pasto ? 'chao-pasto' : 'chao-terreno';
    root.add(m);
  }
  agua(root, campo);

  // ── Cidade primeiro (ela escreve as plataformas no campo), depois a mata.
  const pisoElevado = pisosElevados(colliders, root, [MAT.telha, MAT.fibrocimento]);
  const mata = construirMata(kit, campo, rnd);
  const pasto = construirPasto(kit, campo, rnd);
  const PB = GLB_ON && typeof document !== 'undefined' ? new PropBatch({ bucket: 16, cortes: { tampa_bueiro: 40, lata_enferrujada: 30, saco_lixo: 28, caixa_papelao: 28, cadeira_plastico: 45, engradado_plastico: 45, pneu_velho: 40, toco_arvore: 45, tronco_caido: 50, galhos_secos: 30, pedra_mata: 45 } }) : null;
  if(ambiente==='cidade') {
    carros(kit, campo, rnd, PB);
    vegetacaoUrbana(kit, campo, rnd, cidade.becoAreas);
  }
  if (SKIRT.build) SKIRT.build(root);
  propsOpcionais(root, occluders, campo, rnd, cidade, PB);

  // ── Luz e céu do entardecer medido nas referências de arte.
  setMapSky(scene, T, '/img/textures/sky_javaporcos.webp', 0x9a8a80);
  scene.fog = new THREE.Fog(0x9a8a80, 70, 260);
  const sun = new THREE.DirectionalLight(0xffc58a, 2.8);
  sun.position.set(-46, 22, 34);
  sun.castShadow = true;
  const sc = sun.shadow.camera;
  sc.left = -76; sc.right = 76; sc.top = 76; sc.bottom = -76; sc.near = 1; sc.far = 190;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.035;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xa2a4c0, 0x4c4844, 1.35);
  scene.add(hemi);
  aplicaSombraSol(sun);

  // ── Navegação
  const hordeRefuges = construirRefugios(kit, campo);
  agruparConstrucoes(root, occluders);
  const nav = navegacao(colliders, campo, cidade.portas, hordeRefuges,root.userData.torre);

  const groundHeightAt = (x, z, yRef) => pisoDosRefugios(hordeRefuges, x, z, yRef, pisoElevado(x,z,yRef,campo.amostra(x, z)));
  const armasCampo = ['ak','m4','shotgun','mp5','awp','svd','scar','lmg','deagle','carbine','sks','p90'];
  const pontosArmas=Array.from({length:12},(_,i)=>[Math.sin(i*Math.PI/6)*44,Math.cos(i*Math.PI/6)*44]);
  if(ambiente==='cidade')pontosArmas.push([-28,-22],[28,-22],[-28,22],[28,22],[-6,-28],[6,28],[-6,12],[6,-12],[-18,-6],[18,6],[-6,-18],[6,18]);
  for (let i=0;i<pontosArmas.length;i++) {
    const [x,z]=pontosArmas[i],n=nav.nodes[nav.nearestWaypoint(x,z)],arma=armasCampo[i%armasCampo.length];
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.14,.12,1),MAT.metal);
    mesh.position.set(n.x,campo.amostra(n.x,n.z)+.1,n.z);root.add(mesh);
    pickups.push({x:n.x,z:n.z,weapon:arma,kind:arma,readyAt:0,mesh});
  }
  /* Spawns no eixo da avenida, longe da fila de carros: o MAP2B cobra 1,20 m de folga de
     parede e 40 m² de chão contíguo, e nascer encostado em lataria reprova os dois. */
  const spawns = {
    E: [[-2.0, 10.6], [2.0, 10.6], [-2.0, 14.2], [2.0, 14.2], [0, 12.4], [0, ambiente === 'vila' ? 16.4 : 17.0]]
      .map(([x, z]) => ({ x, z, yaw: Math.PI })),
    B: [[-2.0, -10.6], [2.0, -10.6], [-2.0, -14.2], [2.0, -14.2]].map(([x, z]) => ({ x, z, yaw: 0 })),
  };

  return {
    mode: 'horde', root, colliders, occluders, pickups, sun, hemi, spawns,
    jumpImpulse: 10,
    crossingFloor: true,
    groundHeightAt,
    terrainHeightAt: (x,z) => campo.amostra(x,z),
    ceilingHeightAt:(x,z,y,altura)=>tetoDosInteriores(root,x,z,y,altura),
    hordeRefuges,
    stairs: [...hordeRefuges.map(r=>({nome:`escada refúgio ${r.team}`,x0:r.x-1,x1:r.x+1,z0:r.z+4.66,z1:r.z+9.98,topo:r.y-.45})),
      ...(root.userData.torre?[-.8,.8].map((dx,i)=>({nome:`escada torre ${i+1}`,x0:root.userData.torre.x+dx-.675,x1:root.userData.torre.x+dx+.675,z0:root.userData.torre.z-4.24,z1:root.userData.torre.z+.8,topo:root.userData.torre.base+(i+1)*3.1})):[])],
    waypoints: { nodes: nav.nodes, adj: nav.adj },
    nearestWaypoint: nav.nearestWaypoint,
    findPath: nav.findPath,
    boarEntrances: mata.boarEntrances,
    horda: contratoHorda(cidade),
    cupinzeiros: pasto.cupinzeiros,
    hordeObjectives: cidade.hordeObjectives,
    foodSpots: cidade.foodSpots,
    lojas: cidade.lojas,
    /* `r` já é a distância do CENTRO do ponto em que o focinho alcança (meia-extensão do
       colisor + 0,40): quem consome NÃO soma folga de corpo. Acordo com o modo, 29/10. */
    foodMesh: (id) => cidade.foodMeshes.get(id) || null,
    foodCollider: (id) => cidade.foodColliders.get(id) || null,
    cityBounds: { minX: -CIDADE_R, maxX: CIDADE_R, minZ: -CIDADE_R, maxZ: CIDADE_R },
    bounds: { minX: -HALF, maxX: HALF, minZ: -HALF, maxZ: HALF },
    censo: { ...cidade.censo, ...mata.censo, ...pasto.censo, nos: nav.nodes.length, nosPodados: nav.ilhados, colisores: colliders.length },
    sound: { bioma: 'campo', loops: [
      { src: AMB_LOOPS.passaros, pos: [0, 6, -50], radius: 90, vol: 0.28 },
      { src: AMB_LOOPS.grilos, pos: [0, 2, 44], radius: 80, vol: 0.2 },
      { src: AMB_LOOPS.corrego, pos: [0, 1, -42], radius: 34, vol: 0.26 },
      { src: AMB_LOOPS.cidade, pos: [0, 3, 0], radius: 40, vol: 0.12 },
    ] },
  };
}

/* Lâmina do córrego: nível = fundo + 0,42 m onde há corte, enterrada no aterro da trilha.
   Nome começando em `agua` para a régua de superfície e a sonda a ignorarem. */
function agua(root, campo) {
  const larg = 2 * CORREGO_MEIA * 0.72;
  const geo = new THREE.PlaneGeometry(2 * HALF, larg, Math.round(2 * HALF / PASSO), 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let v = 0; v < pos.count; v++) {
    const x = pos.getX(v), zc = corregoZ(x);
    const fundo = campo.amostra(x, zc);
    pos.setXYZ(v, x, corteCorrego(x, zc) > 0.3 ? fundo + 0.42 : fundo - 0.4, zc + pos.getZ(v));
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0x4d6150, roughness: 0.22, metalness: 0.1, transparent: true, opacity: 0.82 });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'agua-corrego';
  m.userData.nonSolidSurface = true;
  root.add(m);
}

/* Cor por vértice do pasto: mancha seca larga, borda pisada junto da cidade e terra na
   trilha. É o que tira a leitura de plano verde repetido. */
function corPasto(x, z) {
  const seco = 0.5 + 0.5 * Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.13 - 0.4);
  const fino = 0.06 * Math.sin(x * 1.7 + z * 0.9) * Math.cos(z * 1.3 - x * 0.4);
  const r = Math.max(Math.abs(x), Math.abs(z));
  const pisado = Math.max(0, 1 - (r - CIDADE) / 1.6) * 0.5 + Math.max(0, 1 - distPasto(x, z) / 1.5) * 0.8;
  const t = Math.min(1, pisado);
  const g = [0.9 + 0.28 * seco + fino, 0.96 + 0.04 * seco + fino, 0.82 - 0.16 * seco];
  return [g[0] + (1.25 - g[0]) * t, g[1] + (0.98 - g[1]) * t, g[2] + (0.8 - g[2]) * t];
}

/* Contrato com a mecânica (docs/maps/invasao-javaporcos.md, "world.horda"): frentes com
   rota da clareira até a cidade, becos que abrem na onda 3 e setores de domínio. */
function contratoHorda(cidade) {
  const p = ([x, z]) => ({ x: +x.toFixed(2), z: +z.toFixed(2) });
  return {
    frentes: EIXOS.map((e) => ({ id: e.id, nome: e.nome, lado: e.lado, boca: p(e.boca), clareira: p(e.clareira), rota: e.rota.map(p) })),
    becos: cidade.becos,
    setores: cidade.setores,
  };
}

/* Carro parado é escala e cobertura de rua. Fica colado na calçada e NUNCA no
   cruzamento: a primeira versão estacionava um carro no meio da avenida central. */
function carros(kit, campo, rnd, PB) {
  const { MAT, caixa } = kit;
  const vagas = [];
  for (let t = -30; t <= 30; t += 7.5) {
    if (Math.abs(t) < AV + 3) continue;
    for (const s of [-1, 1]) { vagas.push([s * (AV - 1.2), t, 0]); vagas.push([t, s * (AV - 1.2), Math.PI / 2]); }
  }
  /* Os sorteios do `rnd` ficam na mesma ordem de antes (a mata vem depois e lê o mesmo
     gerador); quem completa as vagas até CARROS_MIN é um gerador próprio. */
  let semVaga = 0x0ca770;
  const meu = () => ((semVaga = Math.imul(semVaga, 1664525) + 1013904223 >>> 0) / 4294967296);
  const sorteio = vagas.map(() => { const v = rnd(); return v > 0.38 ? null : [rnd(), rnd()]; });
  const braco = ([x, z, ry]) => (ry ? (x < 0 ? 'O' : 'L') : (z < 0 ? 'N' : 'S'));
  /* Braço norte é o eixo da câmera do centro: fila cheia nas duas guias, desviando da
     caçamba leste (z −18,75), e três carros na faixa norte da avenida leste-oeste. */
  for (let i = vagas.length - 1; i >= 0; i--) if (braco(vagas[i]) === 'N') { vagas.splice(i, 1); sorteio.splice(i, 1); }
  const NORTE = [[-1, -9.9], [-1, -15.6], [-1, -20.3], [-1, -25.0], [-1, -29.7], [1, -10.9], [1, -15.3], [1, -22.3], [1, -27.0], [1, -31.6]];
  NORTE.forEach(([s, t], k) => { vagas.push([s * (AV - 1.2), t, 0]); sorteio.push([meu(), ((k * 7) % 6 + 0.5) / 6]); });
  for (const t of [15, -15]) { const k = vagas.findIndex(([x, z]) => x === t && z === -(AV - 1.2)); if (k >= 0) sorteio[k] = sorteio[k] || [meu(), meu()]; }
  vagas.push([10.75, -(AV - 1.2), Math.PI / 2]); sorteio.push([meu(), 2.5 / 6]);
  for (const b of ['N', 'S', 'O', 'L']) {
    const doBraco = vagas.map((v, i) => i).filter((i) => braco(vagas[i]) === b);
    const livres = doBraco.filter((i) => !sorteio[i]).sort(() => meu() - 0.5);
    const falta = CARROS_MIN / 4 - doBraco.filter((i) => sorteio[i]).length;
    for (const i of livres.slice(0, Math.max(0, falta))) sorteio[i] = [meu(), meu()];
  }
  /* junk_car repintado: a textura de ferrugem vira só sujeira (luminância) e a cor vem da
     instância. Sem isso 5 de cada 8 carros saíam carvão (C* 4); a tag isola do ferro-velho. */
  const tinta = (m, pinta) => {
    if (!pinta) return;
    m.roughness = 0.55; m.metalness = 0;
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        float sujo = dot( sampledDiffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
        diffuseColor.rgb *= mix( sampledDiffuseColor.rgb * 3.0, vec3( clamp( 0.42 + sujo * 7.0, 0.3, 1.0 ) ), 0.85 );
      #endif`);
    };
    m.customProgramCacheKey = () => 'jp-tinta-carro';
  };
  /* O GLB do carro não projeta sombra: uma caixa de lataria + cabine, 0,1 m por dentro dele,
     faz isso por 24 triângulos. Com 23 carros a sombra do GLB custava ~270 mil tri por vista. */
  const PC = PB ? new PropBatch({ bucket: 40, tag: 'jp-pintura', cast: false, paintTest: (m) => /^Material_\d+$/.test(m.name || ''), matTweak: tinta }) : null;
  const sombras = [];
  const lista = (kit.root.userData.carros = []);
  let n = 0;
  for (let i = 0; i < vagas.length; i++) {
    if (!sorteio[i]) continue;
    const [x, z, ry] = vagas[i];
    const y = campo.amostra(x, z);
    const giro = ry + (sorteio[i][0] - 0.5) * 0.08;
    const cor = CORES_CARRO[(sorteio[i][1] * CORES_CARRO.length) | 0];
    const cs = Math.cos(giro), sn = Math.sin(giro);
    const desloca = (ox, oz) => [x + ox * cs + oz * sn, z - ox * sn + oz * cs];
    const glb = braco(vagas[i]) === 'N' ? JUNK : CARROS_GLB[n % CARROS_GLB.length];
    const pinta = glb[0] === 'junk_car';
    lista.push({ id: glb[0], x, z, ry: giro, cor: pinta ? cor : null });
    if (PC && hasProp(glb[0])) {
      kit.colisor(x, z, 0.86, 2.05, y + 0.26, y + 0.98, giro);
      sombras.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro), new THREE.Vector3(1, 1, glb[1] / 4)));
      PC.add(glb[0], { x, z, y, targetLen: glb[1], targetH: glb[2], ry: giro + eixoCarro(glb[0]) + (n % 2) * Math.PI, color: pinta ? cor : null });
      n++;
      continue;
    }
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
  if (PC) PC.build(kit.root);
  for (const geo of sombras.length ? [new THREE.BoxGeometry(1.55, 0.62, 3.75).translate(0, 0.62, 0), new THREE.BoxGeometry(1.3, 0.48, 1.7).translate(0, 1.15, -0.15)] : []) {
    const caixas = new THREE.InstancedMesh(geo, MAT.soSombra, sombras.length);
    sombras.forEach((m, i) => caixas.setMatrixAt(i, m));
    caixas.name = 'carro-sombra'; caixas.castShadow = true; caixas.receiveShadow = false; caixas.userData.nonSolidSurface = true;
    caixas.instanceMatrix.needsUpdate = true; caixas.computeBoundingSphere();
    kit.root.add(caixas);
  }
  return n;
}

/* Mato de calçada, bananeira de quintal e grama de beira: é o que tira o chão chapado
   entre o asfalto e a mata, e tudo instanciado em duas chamadas de desenho. */
function vegetacaoUrbana(kit, campo, rnd, becoAreas = []) {
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
      const noBeco = becoAreas.some(([x0, x1, z0, z1]) => px > x0 - 0.6 && px < x1 + 0.6 && pz > z0 - 0.6 && pz < z1 + 0.6);
      if (rnd() < 0.08 && !noBeco) {
        const a = rnd(), b = rnd(), c = rnd();
        if (!naRua) arbustos.push({ x: px, y, z: pz, ry: a * 6.283, h: 0.9 + b * 0.5 + c * 0.3 });
      }
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
  /* Arbusto de quintal só com GLB de verdade (um a cada três, 8 k tris cada); sem GLB fica
     o capim. Lote próprio de bloco largo: bloco de 12 m virava uma chamada por quintal. */
  if (!GLB_ON || typeof document === 'undefined' || !hasProp('arbusto_mata_a')) return;
  const PA = new PropBatch({ bucket: 36, cast: false, cortes: { arbusto_mata_a: 36, arbusto_mata_b: 36 } });
  arbustos.forEach((a, i) => { if (i % 3 === 0) PA.add(i % 2 ? 'arbusto_mata_b' : 'arbusto_mata_a', { x: a.x, y: a.y, z: a.z, ry: a.ry, targetH: a.h }); });
  PA.build(kit.root);
}

/* Giro que põe o eixo longo do GLB no z local do carro procedural (medido uma vez). */
const _eixo = new Map();
function eixoCarro(id) {
  if (!_eixo.has(id)) {
    const o = placeProp(id, { targetH: 1 });
    const b = o ? new THREE.Box3().setFromObject(o) : null;
    _eixo.set(id, b && (b.max.x - b.min.x) > (b.max.z - b.min.z) ? Math.PI / 2 : 0);
  }
  return _eixo.get(id);
}

/* Props GLB entram POR CIMA do procedural e só no browser, sem colisor: em node (onde o
   portão mede) `hasProp` é falso e a geometria autoral é a que vale. */
function propsOpcionais(root, occluders, campo, rnd, cidade, PB) {
  if (!PB) return 0;
  const PV = new PropBatch({ bucket: 12, cast: false, cortes: { capim_touceira_a: 24, capim_touceira_b: 24, samambaia_mata: 32, calathea_mata: 32, arbusto_mata_a: 38, arbusto_mata_b: 38,
    toco_arvore: 40, tronco_caido: 45, saco_lixo: 24, caixa_papelao: 24, engradado_plastico: 40, cadeira_plastico: 40, pneu_velho: 35, lata_enferrujada: 25, lixeira_metal: 40, tambor_metal: 40 } });
  let n = 0;
  const poe = (lote, id, o) => { if (lote.add(id, { ry: rnd() * 6.283, ...o, y: o.y ?? campo.amostra(o.x, o.z) })) n++; };
  const r = (x, z) => Math.max(Math.abs(x), Math.abs(z));
  for (const e of EIXOS) {
    const [cx, cz] = e.clareira;
    const a0 = rnd() * 6.283;
    poe(PB, 'tronco_caido', { x: cx + Math.cos(a0) * 2.6, z: cz + Math.sin(a0) * 2.6, targetLen: 3.6, targetH: 0.45, ry: a0 + Math.PI / 2 });
    poe(PB, 'toco_arvore', { x: cx + Math.cos(a0 + 2.2) * 2.5, z: cz + Math.sin(a0 + 2.2) * 2.5, targetH: 0.6 });
    poe(PB, 'pedra_mata', { x: cx + Math.cos(a0 + 4) * 2.4, z: cz + Math.sin(a0 + 4) * 2.4, targetH: 0.45 });
    poe(PB, 'galhos_secos', { x: cx + Math.cos(a0 + 1) * 1.6, z: cz + Math.sin(a0 + 1) * 1.6, targetLen: 1.6, targetH: 0.25 });
  }
  /* Orla da mata virada para o pasto: samambaia, calathea e arbusto na frente da moita
     procedural, que é o que o jogador vê da borda da cidade. */
  const pertoDeTrilha = (x, z) => distPasto(x, z) < 2.8 || EIXOS.some((e) => Math.hypot(x - e.boca[0], z - e.boca[1]) < 3.2);
  for (const lado of ['N', 'S', 'O', 'L']) {
    for (let u = -MATA_R; u <= MATA_R; u += 2.4) {
      const v = MATA_R - 0.4 + rnd() * 1.1, uu = u + (rnd() - 0.5) * 1.1;
      const [x, z] = lado === 'N' ? [uu, -v] : lado === 'S' ? [uu, v] : lado === 'O' ? [-v, uu] : [v, uu];
      if (pertoDeTrilha(x, z)) continue;
      const k = rnd();
      if (k < 0.86) poe(PV, 'samambaia_mata', { x, z, targetH: 1.1 + rnd() * 0.6 });
      else if (k < 0.93) poe(PV, 'calathea_mata', { x, z, targetH: 0.9 + rnd() * 0.5 });
      else poe(PV, rnd() < 0.5 ? 'arbusto_mata_a' : 'arbusto_mata_b', { x, z, targetH: 1.4 + rnd() * 0.7 });
      if (rnd() < 0.03) poe(PV, rnd() < 0.5 ? 'toco_arvore' : 'tronco_caido', { x: x * 0.985, z: z * 0.985, targetH: 0.5, targetLen: rnd() < 0.5 ? 0 : 3 });
    }
  }
  // touceira realista no pasto, longe da trilha, do córrego e da linha da cerca
  for (let i = 0, tent = 0; i < 90 && tent < 2000; tent++) {
    const a = rnd() * 6.283, alvo = CIDADE + 1.2 + rnd() * (MATA_R - CIDADE - 1.6);
    const esc = alvo / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
    const x = Math.cos(a) * esc, z = Math.sin(a) * esc;
    if (distPasto(x, z) < 1.8 || corteCorrego(x, z) > 0.3 || Math.abs(r(x, z) - CIDADE - 1.2) < 0.5) continue;
    poe(PV, i % 2 ? 'capim_touceira_a' : 'capim_touceira_b', { x, z, targetH: 0.6 + rnd() * 0.45 });
    i++;
  }
  // praça: postes de luz nos cantos e caixote de feira; avenida: tampa de bueiro
  const P0 = -(20.25), P1 = -8;
  for (const [x, z] of [[P0 + 0.7, P0 + 0.7], [P1 - 0.7, P0 + 0.7], [P1 - 0.7, P1 - 0.7], [P0 + 0.7, P1 - 0.7]]) poe(PB, 'poste_luz_praca', { x, z, y: 0.18, targetH: 3.8, ry: 0 });
  for (const [x, z] of [[-19.4, -12.6], [-8.9, -15.4], [-8.9, -11.2]]) poe(PB, 'caixote_madeira', { x, z, y: 0.18, targetH: 0.45 });
  for (const [x, z] of [[-3, -15], [3, 22], [15, 3], [-24, -3], [2.5, -28], [-29, 2]]) poe(PB, 'tampa_bueiro', { x, z, y: 0.015, targetLen: 0.75, targetH: 0.06, ry: 0 });
  // porta de loja: engradado, cadeira de plástico e tambor encostados na fachada
  for (const l of cidade.lojas) {
    const nx = l.eixo === 'z' ? 0 : l.sinal, nz = l.eixo === 'z' ? l.sinal : 0, lx = nz, lz = nx;
    const em = (lat, nor) => ({ x: l.porta.x + lx * lat - nx * nor, z: l.porta.z + lz * lat - nz * nor });
    poe(PV, 'engradado_plastico', { ...em(2.3, 0.75), targetH: 0.3 });
    poe(PV, 'engradado_plastico', { ...em(2.3, 0.75), y: campo.amostra(em(2.3, 0.75).x, em(2.3, 0.75).z) + 0.3, targetH: 0.3 });
    poe(PV, l.papel === 'boteco' ? 'cadeira_plastico' : 'caixa_papelao', { ...em(-2.4, 0.6), targetH: l.papel === 'boteco' ? 0.85 : 0.45 });
    poe(PV, 'tambor_metal', { ...em(-3.4, 0.7), targetH: 0.9 });
  }
  // lixo de beco e de esquina, posição vinda da cidade
  for (const g of cidade.glb || []) {
    const a = g.id === 'saco_lixo' ? (g.esc ? g : amassaSaco(g.x, g.z)) : null;
    poe(PV, g.id, { x: g.x, z: g.z, targetH: g.h, ry: g.ry, ...(a ? { rx: a.rx, rz: a.rz, esc: a.esc, y: campo.amostra(g.x, g.z) + (a.dy || 0) } : {}) });
  }
  for (let i = 0; i < 14; i++) {
    const s = rnd() < 0.5 ? -1 : 1, t = (rnd() - 0.5) * 2 * (CIDADE_R - 6), o = s * (AV + CAL - 0.35);
    const [x, z] = rnd() < 0.5 ? [o, t] : [t, o];
    if (Math.abs(t) < AV + CAL + 1) continue;
    poe(PV, ['saco_lixo', 'pneu_velho', 'lata_enferrujada', 'caixa_papelao'][i % 4], { x, z, targetH: [0.6, 0.62, 0.32, 0.42][i % 4], ...(i % 4 ? {} : amassaSaco(x, z)) });
  }
  for (const l of cidade.lojas) {
    const [x, z] = l.interior;
    poe(PB, 'shopping_cart', { x: x + 1.4, z: z + 1.2, y: 0.33, targetH: 1.0 });
  }
  PB.build(root);
  PV.build(root);
  root.traverse((o) => { if (o.isMesh && SOLIDOS_GLB.has(o.userData.mapPropId)) occluders.push(o); });
  return n;
}

/* NAVEGAÇÃO — grade de 1,5 m, costura explícita na porta de cada loja e índice de célula
   para `nearestWaypoint` sair de O(n) para O(1). O modo chama isso ~180×/s. */
function navegacao(colliders, campo, portas, refugios,torre) {
  const livre = (x, z) => {
    if(torre&&x>torre.x0-.4&&x<torre.x1+.4&&z>torre.z0-.4&&z<torre.z1+.4)return false;
    if (refugios.some(r=>Math.abs(x-r.x)<3.5 && z>r.z-3.5 && z<r.z+10.5)) return false;
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
