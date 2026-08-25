// AMAZONIA (amazonia) — retrato do "Treta no Vietnã" (PR #375) como comunidade
// ribeirinha: igarapé, palafitas de palha, market flutuante, madeireira. Spec: ~/map2/prompt-opencode.md.
import * as THREE from 'three';
import { placeProp, hasProp } from './mapprops.js';
import { applyLook } from './map_sky.js';
import { createWater } from './water.js';
import { createFavelaAmbience, placeFauna, CORREGO_FAUNA_ASSETS } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 32, HALF_Z = 44;
export const AMAZONIA_AMBIENCE = CORREGO_FAUNA_ASSETS;   // + jacaré/capivara (este mapa baixa)

/* ── IGARAPÉ: rio em x ∈ [−9,75, 9,75]; centro fundo (−0,6), margens em rampa até −0,28 —
   quem cai da ponte vadeia e sai pela margem (lição das rampas do córrego). */
const RIO_MEIA_LARGURA = 9.75;
const RIO_FUNDO = -0.6, RIO_MARGEM = -0.28, RIO_AGUA = 0.20;
const RIO_CAMPO = 6.5;                       // além daqui a rampa começa
const PONTE_W = 3.4, PONTE_Y = 0.18;

export const AMAZONIA_PROPS = ['samambaia', 'heliconia', 'planta_corrego_taboa',
  'planta_corrego_taioba', 'grama_corrego_01', 'grama_corrego_02', 'stall', 'arara_roupas',
  'caixa_dagua', 'botijao_gas', 'pilha_pneus', 'tires', 'dumpster'];

/* Palafitas: (x, z, ry). Espalhadas pelas duas margens para o MAP5 não ter quadrante
   deserto — os esteios finos são a densidade de cover barata e legível do mapa. */
const PALAFITAS = [
  { x: 14, z: -26, ry: 0.21, cor: 0xc4a577 }, { x: 21, z: -18, ry: -0.14, cor: 0xb39468 },
  { x: 27, z: -7, ry: 0.09, cor: 0xcdaf7f }, { x: 15.5, z: -9, ry: 0.28, cor: 0xbd9d6d },
  { x: 14, z: 9, ry: -0.19, cor: 0xc9a97a }, { x: 21, z: 17, ry: 0.15, cor: 0xb6975f },
  { x: 27, z: 7, ry: -0.26, cor: 0xc0a06c }, { x: 15.5, z: 26, ry: 0.11, cor: 0xccae7d },
  { x: -14, z: -22, ry: 0.18, cor: 0xb99a66 }, { x: -15, z: 20, ry: -0.16, cor: 0xc7a878 },
  { x: -27, z: -25, ry: 0.24, cor: 0xbf9f6a },
];
const ESTACA_H = 2.5, DECK_E = 0.4;          // dequee em ESTACA_H, espessura DECK_E
/* Booms de lenha boiando: cada tronco é colisor de verdade — a travessia de barco
   do igarapé é cover no meio da água (MAP5 cobra o quadrante do rio também). */
const BOOMS = [
  { z: -26, x0: -9.4, n: 8 }, { z: -14, x0: -8.6, n: 6 }, { z: -33, x0: 2.2, n: 6 },
  { z: 12, x0: -8.6, n: 6 }, { z: 26, x0: -9.4, n: 8 }, { z: 33, x0: 2.2, n: 6 },
];

export function buildAmazonia(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const root = new THREE.Group();
  root.name = 'treta-na-amazonia';
  scene.add(root);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };

  let TEX = {
    selva: lam({ map: T.dirt, roughness: 1 }), madeira: lam({ map: T.dirt }),
    serragem: lam({ map: T.dirt }), palha: lam({ map: T.dirt }),
    agua: lam({ map: T.dirt, color: 0x42543b, roughness: 0.24, metalness: 0.12 }),
  };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 4, ry = 4) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    };
    TEX.selva = lam({ map: load('/img/textures/tex_selva.webp', 10, 14), roughness: 1 });
    TEX.madeira = lam({ map: load('/img/textures/tex_madeira.webp', 2, 2) });
    TEX.serragem = lam({ map: load('/img/textures/tex_madeira_serragem.webp', 5, 3), roughness: 1 });
    TEX.palha = lam({ map: load('/img/textures/tex_palha.webp', 3, 2), roughness: 0.98 });
    TEX.agua = lam({ map: load('/img/textures/tex_agua_poluida.webp', 2, 6), color: 0x42543b, roughness: 0.24, metalness: 0.12 });
  }
  const texDe = (src, rx, ry) => {
    if (!src.map) return src.map;
    const t = src.map.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return t;
  };
  const matSelva = lam({ map: texDe(TEX.selva, 10, 14) || T.dirt, roughness: 1 });
  const matFundo = lam({ map: texDe(TEX.selva, 6, 10) || T.dirt, color: 0x51604a, roughness: 1 });
  const matMata = lam({ map: texDe(TEX.selva, 7, 3) || T.dirt, color: 0x4f7a45, roughness: 1 });
  const matMataEscura = lam({ map: texDe(TEX.selva, 6, 2) || T.dirt, color: 0x39573a, roughness: 1 });
  const matPoste = lam({ map: texDe(TEX.madeira, 1, 3) || T.dirt, color: 0x9c7c55, roughness: 0.95 });
  const matDeck = lam({ map: texDe(TEX.madeira, 3, 3) || T.dirt, color: 0xa98a5f, roughness: 0.92 });
  const matPalha = lam({ map: TEX.palha.map || T.dirt, roughness: 0.98 });
  const matSerragem = lam({ map: TEX.serragem.map || T.dirt, roughness: 1 });
  const matZinco = lam({ map: T.metal, color: 0x7d7a72, metalness: 0.4, roughness: 0.6 });
  const matLona = [0xc23b4e, 0x2f7fbf, 0xd9a521, 0x3f9455].map((c) => lam({ map: texDe(TEX.palha, 2, 2) || T.dirt, color: c, roughness: 0.85 }));
  const matCasca = lam({ map: texDe(TEX.madeira, 1, 2) || T.dirt, color: 0x8a7258, roughness: 1 });
  const matTroncoBoiando = lam({ map: texDe(TEX.madeira, 2, 1) || T.dirt, color: 0x7c6a50, roughness: 1 });

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rz) m.rotation.z = opts.rz;
    if (opts.rx) m.rotation.x = opts.rx;
    root.add(m);
    if (opts.collide !== false) {
      const cs = Math.abs(Math.cos(opts.ry || 0)), sn = Math.abs(Math.sin(opts.ry || 0));
      const ax = w / 2 * cs + d / 2 * sn, az = w / 2 * sn + d / 2 * cs;
      colliders.push({ minX: x - ax, maxX: x + ax, minY: y, maxY: y + h, minZ: z - az, maxZ: z + az });
      occluders.push(m);
    }
    return m;
  }
  function addCyl(r, h, mat, x, y, z, opts = {}) {
    /* deitado (rx ≈ 90°): a barriga fica em y e o topo em y+2r — CylinderGeometry
       centraliza no eixo; sem isto o tronco deitado boiava a h/2 do chão. */
    const along = Math.abs(opts.rx || 0) > Math.PI / 4;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, opts.seg || 8), mat);
    m.rotation.order = 'YXZ';
    m.rotation.y = opts.ry || 0;
    m.rotation.x = opts.rx || 0;
    m.position.set(x, y + (along ? r : h / 2), z);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    root.add(m);
    if (opts.collide !== false) {
      const lenX = Math.abs(Math.sin(opts.ry || 0)) * h / 2, lenZ = Math.abs(Math.cos(opts.ry || 0)) * h / 2;
      const ext = along ? { x: lenX + r, z: lenZ + r } : { x: r, z: r };
      colliders.push({ minX: x - ext.x, maxX: x + ext.x, minY: y, maxY: y + (along ? 2 * r : h), minZ: z - ext.z, maxZ: z + ext.z });
      occluders.push(m);
    }
    return m;
  }
  function addFloor(w, d, mat, x, z, y, ry = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = ry;
    m.position.set(x, y, z); m.receiveShadow = true;
    root.add(m);
    return m;
  }

  /* ── CHÃO: duas faixas de terra — plano a y=0 sob o rio era 0,6 m de MAP1 em toda a lâmina. */
  const FAIXA = HALF_X - RIO_MEIA_LARGURA;
  addFloor(FAIXA, HALF_Z * 2, matSelva, -(RIO_MEIA_LARGURA + FAIXA / 2), 0, 0);
  addFloor(FAIXA, HALF_Z * 2, matSelva, RIO_MEIA_LARGURA + FAIXA / 2, 0, 0);
  const fundo = addFloor(RIO_MEIA_LARGURA * 2, HALF_Z * 2, matFundo, 0, 0, RIO_FUNDO);
  fundo.userData.nonSolidSurface = true;

  /* ── ÁGUA VIVA: o idioma do córrego (createWater + sobreposições de reflexo).
     Escala de igarapé: célula de 1 m, lâmina preta-esverdeada, fluxo para −z. */
  const agua = createWater(scene, T, 'amazonia', {
    nivel: RIO_AGUA, centro: [0, 0], tamanho: [RIO_MEIA_LARGURA * 2 - 0.6, HALF_Z * 2], segmentos: 12,
    raso: 0x51755a, fundo: 0x1c2b22, marLonge: 0x40554a,
    profEscala: 0.4, espumaFaixa: 0.35, espumaMiolo: 0.12,
    profFallback: 0.35, fluxo: [0, 0.09], ampEscala: 0.1,
    /* albedo poluído como tMapa (mesmo idioma do córrego): o shader amostra de
       verdade E a lâmina conta como área texturizada no texel-check. */
    mapa: TEX.agua.map || T.dirt, mapaEscala: [3, 13.3], mapaForca: 0.55,
    parent: root,
  });
  agua.mesh.userData.nonSolidSurface = true;
  const mapaAgua = lam({ map: texDe(TEX.selva, 2, 12) || T.dirt, color: 0x9fc4ae, transparent: true, opacity: 0.22, roughness: 0.06, metalness: 0.3, depthWrite: false });
  for (const [x, z, w, d, ry] of [[-4.5, -18, 8, 14, 0.04], [4, 10, 9, 16, -0.05], [-2, 32, 7, 12, 0.03]]) {
    const r = addFloor(w, d, mapaAgua, x, z, RIO_AGUA + 0.015, ry);
    r.userData.nonSolidSurface = true; r.renderOrder = 2;
  }

  /* ── LOOK: o céu equatorial úmido mora no LOOK[amazonia] (look.js) — applyLook
     devolve hemi/sun e a névoa densa verde-água. */
  const { hemi, sun } = applyLook(scene, T, 'amazonia', { nofog: QP.get('nofog') === '1' });

  /* ── PONTES: três travessias (z 0 larga, ±24 estreitas); o piso NÃO é colisor —
     quem anda é o groundHeightAt (lição do canal do córrego: colisor no vão trava). */
  const ponte = (z, w) => {
    addBox(RIO_MEIA_LARGURA * 2 + 3.5, 0.16, w, matDeck, 0, PONTE_Y - 0.16, z, { collide: false });
    for (const sx of [-1, 1]) {
      addBox(0.16, 0.5, w, matPoste, sx * (RIO_MEIA_LARGURA + 1.2), PONTE_Y, z, { collide: false, cast: false });
    }
    for (const px of [-7, -3.4, 3.4, 7]) addCyl(0.14, PONTE_Y - RIO_FUNDO, matPoste, px, RIO_FUNDO, z, { collide: false });
  };
  ponte(0, PONTE_W); ponte(-24, 2.6); ponte(24, 2.6);

  /* ── PALAFITAS: esteios + dequee a 2,5 m + casa + telhado de palha em duas águas.
     O dequee é cover aéreo — o piso de jogo continua no chão. */
  const palafita = ({ x, z, ry, cor }) => {
    const w = 4.6, d = 4.2;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const local = (lx, lz) => [x + lx * cs - lz * sn, z + lx * sn + lz * cs];
    for (const [lx, lz] of [[-w / 2 + 0.3, -d / 2 + 0.3], [w / 2 - 0.3, -d / 2 + 0.3], [-w / 2 + 0.3, d / 2 - 0.3], [w / 2 - 0.3, d / 2 - 0.3], [0, 0]])
      addCyl(0.16, ESTACA_H, matPoste, ...local(lx, lz), { seg: 6 });
    addBox(w, DECK_E, d, matDeck, x, ESTACA_H, z, { ry, collide: false });
    const parede = lam({ map: texDe(TEX.madeira, 3, 2) || T.dirt, color: cor, roughness: 0.95 });
    addBox(w, 2.7, d, parede, x, ESTACA_H + DECK_E, z, { ry });
    // beiral de palha: dois planos inclinados — nunca colisor, sempre ocorrível
    for (const s of [-1, 1]) {
      const telhado = new THREE.Mesh(new THREE.BoxGeometry(w + 1.3, 0.09, d / 2 + 0.9), matPalha);
      const [cx, cz] = local(0, s * d / 4);
      telhado.position.set(cx, ESTACA_H + DECK_E + 2.7 + 0.62, cz);
      telhado.rotation.y = ry; telhado.rotation.x = s * 0.42;
      telhado.castShadow = true; telhado.receiveShadow = true;
      root.add(telhado); occluders.push(telhado);
      colliders.push({ minX: cx - (w / 2 + 0.6), maxX: cx + (w / 2 + 0.6), minY: telhado.position.y - 0.3, maxY: telhado.position.y + 0.35, minZ: cz - (d / 2 + 0.6), maxZ: cz + (d / 2 + 0.6) });
    }
    // caixa d'água e varal de rede: quintal de ribeirinho
    addCyl(0.55, 0.9, matZinco, ...local(w / 2 + 0.9, d / 2 + 0.6), { seg: 10 });
  };
  for (const p of PALAFITAS) palafita(p);

  /* ── MARKET FLUTUANTE: pontões amarrados na margem leste (degrau de 0,28 m — chega-se
     andando), barracas de lona e canoas. A bandeira MID mora no pontão norte. */
  const pontoes = [
    { x0: 4.2, x1: 10.4, z0: -2, z1: 3 },     // principal — MID
    { x0: 4.0, x1: 9.6, z0: 8, z1: 13 },
    { x0: 4.4, x1: 9.8, z0: -14, z1: -9 },
  ];
  const barraca = (x, z, ry, cor) => {
    addBox(1.9, 0.85, 1.1, matDeck, x, 0.4, z, { ry });
    for (const s of [-1, 1]) addCyl(0.07, 2.1, matPoste, x + s * 0.85 * Math.cos(ry), 0.4, z - s * 0.85 * Math.sin(ry), { seg: 5 });
    const tarp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.9), cor);
    tarp.position.set(x, 2.55, z); tarp.rotation.y = ry; tarp.rotation.z = 0.16;
    tarp.castShadow = true; root.add(tarp); occluders.push(tarp);
  };
  const PONTAO_Y = 0.28;
  const pontao = ({ x0, x1, z0, z1 }, stalls) => {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0;
    addBox(w, 0.14, d, matDeck, cx, PONTAO_Y - 0.14, cz, { collide: false });
    /* ancoragem: pinta acima da água mas não é degrau nem cover — o topo dela
       fora do pé do pontão seria 1 m de "corpo dentro de sólido" pro MAP1. */
    for (const sx of [x0 + 0.3, x1 - 0.3]) for (const sz of [z0 + 0.3, z1 - 0.3]) {
      const a = addCyl(0.2, 0.9, matPoste, sx, -0.5, sz, { seg: 6, collide: false });
      a.userData.nonSolidSurface = true;
    }
    stalls();
  };
  pontao(pontoes[0], () => {
    barraca(5.6, 0.4, 0.24, matLona[0]); barraca(7.4, 1.8, -0.18, matLona[1]); barraca(9.2, 0.2, 0.31, matLona[2]);
  });
  pontao(pontoes[1], () => { barraca(5.4, 9.2, -0.26, matLona[3]); barraca(7.8, 11.6, 0.2, matLona[0]); });
  pontao(pontoes[2], () => { barraca(5.8, -12.6, 0.15, matLona[2]); barraca(8.2, -10.8, -0.29, matLona[1]); });
  // canoas amarradas: casco de tábua com banco
  const canoa = (x, z, ry, cor) => {
    addBox(3.4, 0.5, 0.9, lam({ map: texDe(TEX.madeira, 3, 1) || T.dirt, color: cor, roughness: 0.9 }), x, RIO_AGUA - 0.2, z, { ry });
    addBox(0.9, 0.08, 0.8, matPoste, x, RIO_AGUA + 0.3, z, { ry, collide: false, cast: false });
  };
  canoa(-3.2, -24.5, 0.34, 0xb54a3c); canoa(2.6, 18.5, -0.22, 0x3c6fb0); canoa(-5.2, 6.5, 1.35, 0xb5892e);
  canoa(11.8, -4.6, 0.42, 0x4a8a5c); canoa(-2.2, -6.5, 1.52, 0x8a5a2e);
  // booms de lenha: troncos amarrados boiando — cover no meio do canal
  for (const b of BOOMS) for (let i = 0; i < b.n; i++) {
    addCyl(0.35, 3.6, matTroncoBoiando, b.x0 + i * 1.18, RIO_AGUA - 0.32, b.z + (i % 2) * 0.5, { rx: Math.PI / 2, seg: 7 });
  }

  /* ── MADEIREIRA ABANDONADA (o galpão do CTF): telhadão de zinco sobre postes,
     sem paredes — serragem no chão, serras, pilhas de tora e pranchas empilhadas. */
  const MX = -24.5;
  addFloor(15, 8, matSerragem, MX, 0, 0.012);
  for (const px of [-7, -3.5, 0, 3.5, 7]) for (const pz of [-3.6, 3.6])
    addCyl(0.22, 5.2, matPoste, MX + px, 0, pz, { seg: 7 });
  for (const s of [-1, 1]) {
    const telhado = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.12, 5.4), matZinco);
    telhado.position.set(MX, 5.7, s * 2.55); telhado.rotation.x = s * 0.3;
    telhado.castShadow = true; telhado.receiveShadow = true;
    root.add(telhado); occluders.push(telhado);
    colliders.push({ minX: MX - 8.2, maxX: MX + 8.2, minY: 5.4, maxY: 6.1, minZ: s * 2.55 - 2.9, maxZ: s * 2.55 + 2.9 });
  }
  // serras/bancadas: mesas pesadas de madeira
  addBox(4.2, 0.95, 1.3, matDeck, MX - 1.5, 0, -1.6, { ry: 0.06 });
  addBox(3.2, 0.95, 1.2, matDeck, MX + 3.4, 0, 1.8, { ry: -0.12 });
  addBox(2.2, 0.85, 1.1, matDeck, MX - 5, 0, 2.2, { ry: 0.3 });
  // pilhas de tora: pirâmides de 3+2
  const pilhaTora = (x, z, ry) => {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let i = 0; i < 3; i++) addCyl(0.38, 4, matCasca, x + (i - 1) * 0.8 * cs, 0, z + (i - 1) * 0.8 * sn, { rx: Math.PI / 2, ry, seg: 7 });
    for (let i = 0; i < 2; i++) addCyl(0.38, 4, matCasca, x + (i - 0.5) * 0.8 * cs, 0.66, z + (i - 0.5) * 0.8 * sn, { rx: Math.PI / 2, ry, seg: 7 });
  };
  pilhaTora(MX + 7.5, -6, 0.12); pilhaTora(MX + 7.5, 6, -0.18); pilhaTora(MX, 18, 0.24); pilhaTora(24, -33, -0.3);
  // pranchas empilhadas
  const pranchas = (x, z, ry) => { for (let i = 0; i < 4; i++) addBox(2.6, 0.14, 0.9, matDeck, x, 0.14 * i, z, { ry: ry + i * 0.04 }); };
  pranchas(MX - 6.5, -4.5, 0.34); pranchas(MX + 4.5, -4.8, -0.28); pranchas(20.5, 30, 0.18);
  // scrap da madeireira: pneus e entulho herdam o vocabulário do ferro-velho
  for (const [id, x, z, h, ry] of [['pilha_pneus', MX - 8.5, 5.5, 1.1, 0.2], ['dumpster', MX + 9.8, 0, 1.4, -0.34], ['tires', 12.5, -33.5, 0.8, 0.4], ['pilha_pneus', 25, 20, 1.1, -0.26]]) {
    if (hasProp(id)) { const p = placeProp(id, { x, z, y: 0, targetH: h, ry }); if (p) { root.add(p); colliders.push({ minX: x - 1.2, maxX: x + 1.2, minY: 0, maxY: h, minZ: z - 1.2, maxZ: z + 1.2 }); occluders.push(p); } }
  }

  /* ── CERCA VIVA / MATA DE FUNDO: parede verde com ruído de yaw e duas alturas —
     é o horizonte fechado do mapa e a massa alta do ALT1. */
  const matas = [];
  for (let i = 0; i < 12; i++) {
    const x = -HALF_X + 1.3 + i * (HALF_X * 2 - 2.6) / 11;
    matas.push([x, -HALF_Z + 0.9, 8 + (i % 3) * 1.5, (i * 0.37) % 0.5 - 0.25]);
    matas.push([x, HALF_Z - 0.9, 6.5 + (i % 4) * 1.4, -((i * 0.29) % 0.5) + 0.25]);
  }
  for (let j = 0; j < 10; j++) {
    const z = -HALF_Z + 4.5 + j * (HALF_Z * 2 - 9) / 9;
    matas.push([-HALF_X + 1.2, z, 7 + (j % 3) * 1.6, ((j * 0.31) % 0.5) - 0.25]);
    matas.push([HALF_X - 1.2, z, 9 + (j % 2) * 1.3, -((j * 0.23) % 0.45) + 0.22]);
  }
  for (const [x, z, h, ry] of matas) {
    addBox(6.2, h, 2.4, (h + x + z) % 2 > 1 ? matMata : matMataEscura, x, 0, z, { ry });
    // copa em sanfona quebra a silhueta de muro
    addBox(3.4, 2.2, 2.8, matMataEscura, x + Math.sin(ry * 7 + z) * 1.4, h, z + Math.cos(ry * 5 + x) * 1.1, { ry: ry + 0.4, collide: false, cast: true });
  }

  /* ── SUMAÚMAS: tronco alto + copa em guardanapo — seis marcos de silhueta. */
  const sumauma = (x, z, s) => {
    addCyl(0.75 * s, 8.4 * s, matCasca, x, 0, z, { seg: 9 });
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + x;
      const copa = new THREE.Mesh(new THREE.SphereGeometry(2.6 * s, 8, 6), matMata);
      copa.position.set(x + Math.cos(a) * 2.4 * s, (8.4 + Math.sin(i * 2.1) * 1.2) * s, z + Math.sin(a) * 2.4 * s);
      copa.scale.y = 0.62; copa.castShadow = true; copa.receiveShadow = true;
      root.add(copa); occluders.push(copa);
      colliders.push({ minX: copa.position.x - 2, maxX: copa.position.x + 2, minY: copa.position.y - 1.2, maxY: copa.position.y + 1.2, minZ: copa.position.z - 2, maxZ: copa.position.z + 2 });
    }
  };
  sumauma(-26, -33, 1.15); sumauma(26, -33, 0.95); sumauma(-26, 33, 1.05); sumauma(26, 33, 1.2); sumauma(-16, 38, 0.9); sumauma(16, -38, 0.85);

  /* ── SUB-BOSQUE: props de mata do acervo quando o GLB carrega, bucha procedural
     quando não carrega — o mapa não pode depender de download para ter volume. */
  const FX = [
    ['samambaia', 1.1], ['heliconia', 1.3], ['planta_corrego_taboa', 1.6], ['planta_corrego_taioba', 0.9],
    ['grama_corrego_01', 0.8], ['grama_corrego_02', 0.7],
  ];
  const moita = (x, z, s) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55 * s, 1), matMata);
    m.position.set(x, 0.3 * s, z); m.scale.y = 0.75; m.castShadow = true; m.receiveShadow = true;
    m.userData.nonSolidSurface = true;
    root.add(m);
  };
  let fi = 0;
  for (const [x, z] of [[-29, -20], [-28.2, -6], [-29.5, 10], [-28, 24], [29, -18], [28.3, -4], [29.4, 12], [28.1, 26], [-12, -32], [12, 33], [-11, 34], [11, -33], [-22, -27], [22, 28], [-20, 28], [19, -28]]) {
    const [id, h] = FX[fi++ % FX.length];
    if (hasProp(id)) { const p = placeProp(id, { x, z, y: 0, targetH: h * (0.85 + (fi % 4) * 0.1), ry: fi * 1.7 }); if (p) { p.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; }); root.add(p); } }
    else moita(x + 1.2, z + 0.8, h);
    if (fi % 2 === 0) moita(x - 1.4, z - 0.6, h * 0.8);
  }
  // troncos caídos no chão de jogo: cover baixo orgânico
  const troncoNoChao = (x, z, ry, len = 4.4, r = 0.42) => {
    addCyl(r, len, matCasca, x, 0, z, { rx: Math.PI / 2, ry, seg: 8 });
  };
  troncoNoChao(-13, -12, 0.32); troncoNoChao(13, 13, -0.38); troncoNoChao(-12, 30, 1.22); troncoNoChao(12, -30, 0.44, 5);
  troncoNoChao(-22, 30, 0.18); troncoNoChao(22, 10, 1.38); troncoNoChao(-20, -30, 0.5); troncoNoChao(20, 32, -0.2);

  /* ── FAUNA ESTÁTICA: jacaré no igarapé, capivaras na margem (o sistema do córrego). */
  const jacare = placeFauna('jacare', { x: 6.8, y: RIO_FUNDO, z: -30.5, ry: 2.8, targetLen: 1.8, submerge: 0.1 });
  if (jacare) root.add(jacare);
  const capivara = placeFauna('capivara', { x: -10.8, y: 0.02, z: 14.5, ry: 0.6, targetLen: 1.0 });
  if (capivara) root.add(capivara);
  const capivara2 = placeFauna('capivara', { x: 11.2, y: 0.02, z: -20.5, ry: -0.9, targetLen: 0.95 });
  if (capivara2) root.add(capivara2);

  /* ── PICKUPS: arsenal completo por spawn (veto do dono) + miolo; materiais de arma
     COMPARTILHADOS — um material novo por pickup derruba o SUP1. */
  const GM = { black: lam({ color: 0x202735 }), steel: lam({ color: 0xaab4c0 }), wood: lam({ color: 0x6b4a2a }), verde: lam({ color: 0x315b43 }) };
  const place = (kind, x, z, yaw = 0) => {
    const g = new THREE.Group();
    const long = ['awp', 'ak', 'm4', 'shotgun', 'mp5'].includes(kind);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, long ? 1.0 : 0.38), kind === 'awp' ? GM.verde : GM.black);
    b1.position.y = 0.1; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, long ? 0.28 : 0.12), kind === 'shotgun' ? GM.wood : GM.steel);
    b2.position.set(0, 0.03, long ? 0.38 : 0.12); g.add(b2);
    g.position.set(x, groundHeightAt(x, z) + 0.06, z); g.rotation.y = yaw;
    root.add(g); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: g });
  };
  const arsenal = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
  /* Arsenal no pé de cada spawn — o rio corre no meio do mapa, os times nascem
     nas cabeceras NW e SE, em terra (nascer na água foi folga 0,45 m no MAP2B). */
  for (const sz of [-1, 1]) arsenal.forEach((kind, i) => place(kind, sz < 0 ? -20 + i * 2 : 12 + i * 2, sz * 39, sz < 0 ? 0.6 : Math.PI - 0.6));
  place('ak', 5.6, 1.4, 1.2); place('awp', 9.2, -0.2, 0.4);          // market (pontão)
  place('shotgun', MX + 1, -1.4, 2.2); place('mp5', MX, 18.5, -0.6);  // madeireira
  place('deagle', 0, -24.2, 0); place('m4', 0, 24.2, Math.PI);        // pontes estreitas

  /* ── NAVEGAÇÃO: grade própria (idioma do parque), rio vadeável incluso. Nó sem
     vizinho alcançável é PODADO: ilhado reprova o MC3 do map-contrato. */
  const blocked = (x, z, inflate = 0.45) => colliders.some((c) => c.minY < 1.6 && c.maxY > 0.15
    && x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate);
  const STEP = 3.2;
  const crusos = [];
  for (let x = -HALF_X + 2.5; x <= HALF_X - 2.5; x += STEP) for (let z = -HALF_Z + 2.5; z <= HALF_Z - 2.5; z += STEP) if (!blocked(x, z)) crusos.push({ x, z });
  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6; if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.2)) return false; } return true; };
  const vizinhos = (i) => {
    const out = [];
    for (let j = 0; j < crusos.length; j++) {
      if (i === j) continue;
      const dx = crusos[i].x - crusos[j].x, dz = crusos[i].z - crusos[j].z;
      if (dx * dx + dz * dz < STEP * STEP * 2.45 && segClear(crusos[i], crusos[j])) out.push(j);
    }
    return out;
  };
  const adjCrusos = crusos.map((_, i) => vizinhos(i));
  const componente = new Uint8Array(crusos.length);
  {
    const fila = [0]; componente[0] = 1;
    while (fila.length) {
      const i = fila.pop();
      for (const j of adjCrusos[i]) if (!componente[j]) { componente[j] = 1; fila.push(j); }
    }
  }
  const mantidos = [];
  for (let i = 0; i < crusos.length; i++) if (componente[i]) mantidos.push(i);
  const remapa = new Int16Array(crusos.length).fill(-1);
  mantidos.forEach((i, novo) => { remapa[i] = novo; });
  const nodes = mantidos.map((i) => crusos[i]);
  const adj = mantidos.map((i) => adjCrusos[i].map((j) => remapa[j]));
  function nearestWaypoint(x, z) { let best = 0, bd = Infinity; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1), queue = [fromIdx]; prev[fromIdx] = fromIdx;
    while (queue.length) {
      const n = queue.shift();
      for (const next of adj[n]) if (prev[next] === -1) { prev[next] = n; if (next === toIdx) { const path = [next]; let cur = n; while (cur !== fromIdx) { path.unshift(cur); cur = prev[cur]; } path.unshift(fromIdx); return path; } queue.push(next); }
    }
    return [fromIdx];
  }

  /* ── VIDA: capivaras passeando na margem, galinha no quintal da palafita,
     papagaio de poleiro na barraca do market, rato e pomba na madeireira. */
  const ambience = createFavelaAmbience(root, {
    map: 'amazonia', low: LOWQ,
    /* posições fora dos AABBs das bancadas/pilhas da madeireira (AR3): o galpão é
       serragem livre entre os móveis, os bichos ficam nas clareiras dele. */
    rats: [
      { pos: [-27.5, 0, -4.8], to: [-26.5, 0, -5.6], phase: 0.3 },
      { pos: [-19.5, 0, -3.4], to: [-18.5, 0, -2.6], phase: 1.8 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-22.5, 0, -6.2], phase: 0.9 },
      { mode: 'ground', pos: [-29.5, 0, -6.5], phase: 2.1 },
    ],
    chickens: [{ pos: [16.8, 0, 7.4], to: [18.4, 0, 8.8], phase: 1.4 }],
    parrots: [
      { pos: [5.6, 2.62, 0.4], phase: 0.6 },      // poleiro da barraca do market
      { pos: [21.6, 2.62, 17.4], phase: 2.4 },
      { pos: [-26, 0.95, 20.6], phase: 3.1 },      // caixa d'água da palafita oeste
    ],
    dogs: [{ pos: [-14.8, 0, -20.4], to: [-13.2, 0, -19.2], phase: 0.7 }],
  });

  function groundHeightAt(x, z) {
    for (const p of pontoes) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) return PONTAO_Y;
    for (const pz of [0, -24, 24]) if (Math.abs(z - pz) < (pz === 0 ? PONTE_W : 2.6) / 2 && Math.abs(x) <= RIO_MEIA_LARGURA + 1.75) return PONTE_Y;
    const ax = Math.abs(x);
    if (ax > RIO_MEIA_LARGURA) return 0;
    if (ax <= RIO_CAMPO) return RIO_FUNDO;
    return RIO_FUNDO + (ax - RIO_CAMPO) / (RIO_MEIA_LARGURA - RIO_CAMPO) * (RIO_MARGEM - RIO_FUNDO);
  }
  const slowAt = (x, z) => Math.abs(x) <= RIO_MEIA_LARGURA + 0.6 && Math.abs(z) < HALF_Z - 2
    && ![0, -24, 24].some((pz) => Math.abs(z - pz) < (pz === 0 ? PONTE_W : 2.6) / 2 + 0.4);

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns: {
      /* 0,4 m além da face da mata girada: o AABB conservador da copa com yaw
         projeta a quina ~0,5 m para dentro da caixa e a folga do MAP2B mede
         contra o AABB, não contra a malha. */
      E: [[-15, -40], [-12, -39.3], [-18, -39.3], [-13.5, -37.9], [-16.5, -37.9]].map(([x, z]) => ({ x, z, yaw: 0.6 })),
      B: [[15, 40], [12, 39.3], [18, 39.3], [13.5, 37.9], [16.5, 37.9]].map(([x, z]) => ({ x, z, yaw: Math.PI - 0.6 })),
    },
    ctfPoints: [
      { id: 'E', label: 'PALAFITAS', x: 20.5, z: -28 },
      { id: 'MID', label: 'MERCADO FLUTUANTE', x: 7.4, z: 0.6 },
      { id: 'B', label: 'MADEIREIRA', x: MX, z: 18 },
    ],
    pickups, sun, hemi, ambience,
    sound: {
      loops: [
        { src: AMB_LOOPS.corrego, pos: [0, 0.3, -22], radius: 26, vol: 0.38 },
        { src: AMB_LOOPS.corrego, pos: [0, 0.3, 22], radius: 26, vol: 0.38 },
        { src: AMB_LOOPS.passaros, pos: [0, 5, 0], radius: 85, vol: 0.3 },
        { src: AMB_LOOPS.grilos, pos: [0, 3, 0], radius: 85, vol: 0.14 },
      ],
      bioma: 'campo',
    },
    update(dt) { agua.update(dt); },
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.8, maxX: HALF_X - 0.8, minZ: -HALF_Z + 0.8, maxZ: HALF_Z - 0.8 },
  };
}
