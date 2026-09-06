// AMAZONIA — comunidade fictícia de várzea brasileira na vazante.
// Direção e limites verificáveis: plans/AMAZONIA-VISUAL.md.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch, StaticBatch } from './mapprops.js';
import { applyLook } from './map_sky.js';
import { createWater } from './water.js';
import { createCabinShells } from './amazonia_cabins.js';
import { clearCabinFoliage } from './amazonia_foliage_clearance.js';
import { createAmazoniaFaunaMotion } from './amazonia_fauna_motion.js';
import { createFavelaAmbience, placeFauna, CORREGO_FAUNA_ASSETS, AMAZONIA_FAUNA_ASSETS } from './ambientlife.js';
import { createSkyLife } from './skylife.js';
import { AMB_LOOPS } from './soundscape.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 32, HALF_Z = 44;
export const AMAZONIA_AMBIENCE = Object.freeze([...CORREGO_FAUNA_ASSETS, ...AMAZONIA_FAUNA_ASSETS]);   // + jacaré/capivara e o elenco novo (este mapa baixa)

/* ── IGARAPÉ: rio em x ∈ [−9,75, 9,75]; centro fundo (−0,6), margens em rampa até o chão seco (0) —
   quem cai da ponte vadeia e sai pela margem (lição das rampas do córrego). */
const RIO_MEIA_LARGURA = 9.75;
const RIO_FUNDO = -0.6, RIO_MARGEM = 0, RIO_AGUA = -0.12;
const RIO_CAMPO = 6.5;                       // além daqui a rampa começa
const PONTE_W = 3.4, PONTE_Y = 0.18;
const margemY = x => RIO_FUNDO + (Math.abs(x) - RIO_CAMPO) /
  (RIO_MEIA_LARGURA - RIO_CAMPO) * (RIO_MARGEM - RIO_FUNDO);

export const AMAZONIA_PROPS = ['samambaia', 'heliconia', 'planta_corrego_taboa',
  'planta_corrego_taioba', 'grama_corrego_01', 'grama_corrego_02', 'stall', 'arara_roupas',
  'caixa_dagua', 'botijao_gas', 'pilha_pneus', 'tires', 'dumpster',
  'galinha_mint_amazonia', 'pintinho_mint_amazonia', 'canoa_rabeta_amazonia', 'palafita_aberta_amazonia', 'arvore_mata_amazonia', 'palmeira_babacu_amazonia'];

/* ── PALAFITAS DE VERDADE (molde palafita_pro.glb): "subir na madeira pra atravessar" —
    cada estação tem patamar e escada andáveis + corrimão `passarela`; rede = rota alta. */
const DECK_Y = 2.3;                 // vão livre: 2,12 m sobre a ponte, maior que mantle de 1,95 m
const PILA_GLB = 1.1;              // offset do molde acompanha a subida da passarela; estacas estendidas abaixo
const CASA_A = 3.0;
const PAT_A = 1.6;
const ESC_N = 12, ESC_PISO = 0.26;  // espelho ~0,15: 2 espelhos cabem no pé de 0,30 do corpo
export const AMAZONIA_NAV_STEP = 3.2;
const ESTACOES = [
  { x: 14, z: -26, d: [-1, 0], e: -1, rede: true },   // A — pé da bandeira E
  { x: 25, z: -18, d: [-1, 0], e: -1 },
  { x: 14, z: -9, d: [-1, 0], e: 0, rede: true },     // C — passagem (sem escada: sobe pela rede)
  { x: 14, z: 6, d: [-1, 0], e: 1, rede: true },      // D — virada pro igarapé
  { x: 21, z: 17, d: [-1, 0], e: 1 },
  { x: 27, z: 7, d: [-1, 0], e: 1 },
  { x: 17, z: 29, d: [-1, 0], e: 1 },                 // B: lance abre para o respawn norte
  { x: 27, z: -7, d: [-1, 0], e: 1 },
  { x: -14, z: 6, d: [1, 0], e: -1, rede: true },     // F — cabeça oeste da travessia
  { x: -14, z: -22, d: [1, 0], e: -1 },
  { x: -27, z: -25, d: [1, 0], e: -1 },
];
for (const st of ESTACOES) { st.p = [st.d[1], -st.d[0]]; }   // p = lateral esquerda de d
/* Pranchas da rota alta (eixos alinhados): patamar→patamar/plataforma a DECK_Y. */
const PONTES_ALTA = [
  { ax: 9.4, az: -24.4, bx: 9.4, bz: -10.6 },   // A→C →D →M →F: a travessia alta
  { ax: 9.4, az: -7.4, bx: 9.4, bz: 4.4 },
  { ax: 7.8, az: 6, bx: 1.6, bz: 6 },
  { ax: -1.6, az: 6, bx: -7.8, bz: 6 },
];
const PLATA_M = { x: 0, z: 6 };                 // platforma no meio do igarapé

/* ── MATA DENSA NO PERÍMETRO (arvore_mata.glb + palmeira_babacu.glb): horizonte de
    floresta — os Arrays alimentam GLB, fallback e AMZ6 (mesma fonte, sem segunda verdade). */
const MATA_ARVORES = [];
{
  // W/E pulam o vão do galpão da madeireira (z −3,6..3,6): árvore no telhão é muro atravessando muro
  const fileira = (fix, axis, posicoes) => {
    for (let i = 0; i < posicoes.length; i++) {
      const v = posicoes[i], jit = Math.sin(i * 12.9898 + v * 78.233 + fix) * 1.3;
      const s = 10 + ((i * 37 + Math.abs(Math.round(fix))) % 5) * 1.1;
      MATA_ARVORES.push(axis === 'x' ? { x: v + jit, z: fix, s } : { x: fix + jit, z: v, s });
    }
  };
  fileira(-43.2, 'x', [-24, -8, 8, 24]);
  fileira(43.2, 'x', [-24, -8, 8, 24]);
  fileira(-30.6, 'z', [-38, -28, -19, -10, 10, 19, 28, 38]);
  fileira(30.6, 'z', [-38, -28, -18, -9, 0, 9, 18, 28, 38]);
}
// Segunda camada fora da área jogável: fecha clareiras do horizonte sem ocupar rotas.
const MATA_FUNDO = [-1, 1].flatMap(lado => [-36, -24, -12, 0, 12, 24, 36].map((z, i) =>
  ({ x: lado * (36 + (i % 2)), z, s: 10.5 + (i % 3) * 1.4 })));
for (const lado of [-1, 1]) for (const z of [-56, -48, 48, 56])
  for (const x of [15, 28]) MATA_FUNDO.push({x:lado*x,z,s:12.5+(Math.abs(z)%3)*1.4});
const MATA_PALMEIRAS = [
  { x: -26.5, z: -40, s: 5.5 }, { x: 26.5, z: -40, s: 6 }, { x: -26.5, z: 40, s: 6.5 }, { x: 26.5, z: 40, s: 5.5 },
  { x: -28.8, z: -14, s: 5 }, { x: 28.8, z: -10, s: 6 }, { x: -28.8, z: 12, s: 5.5 }, { x: 28.8, z: 16, s: 5 },
  { x: -12, z: -41.5, s: 6 }, { x: 12, z: 41.5, s: 5.5 }, { x: 20, z: -41.5, s: 5 }, { x: -20, z: 41.5, s: 6 },
  { x: -30, z: 26, s: 5.5 }, { x: 30, z: -26, s: 6 },
];
/* Booms de lenha boiando: cada tronco é colisor de verdade — a travessia de barco
    do igarapé é cover no meio da água (MAP5 cobra o quadrante do rio também). */
const BOOMS = [
  { z: -26, x0: -9.4, n: 8 }, { z: -14, x0: -8.6, n: 6 }, { z: -33, x0: 2.2, n: 6 },
  { z: 12, x0: -8.6, n: 6 }, { z: 26, x0: -9.4, n: 8 }, { z: 33, x0: 2.2, n: 6 },
];

/* ── MATA INTERIOR (ronda 3): "mais matas, no mapa em si jogável" — grade peneirada
     pelas zonas vivas; os Arrays alimentam GLB, colisor e AMZ7 (mesma fonte). */
const MX = -24.5;
const fract = (v) => v - Math.floor(v);
const SPAWN_E = [[-18, -39.3], [-12, -39.3], [-15, -40], [-13.5, -37.9], [-16.5, -37.9]];
const SPAWN_B = [[18, 39.3], [12, 39.3], [15, 40], [13.5, 37.9], [16.5, 37.9]];
const CTF_PTS = [
  { id: 'E', label: 'PALAFITAS', x: 20.5, z: -28 },
  { id: 'MID', label: 'MERCADO FLUTUANTE', x: 7.4, z: 0.6 },
  { id: 'B', label: 'MADEIREIRA', x: MX, z: 18 },
];
const MATA_INTERIOR = [], BABACU_INTERIOR = [], GRAMA_INTERIOR = [];
{
  const ANEL_LIM = 28.6, Z_LIM = 41;   // 0,4 m antes da faixa do AMZ6
  const discos = [];
  const poe = (x, z, r) => discos.push([x, z, r]);
  for (const [x, z] of [...SPAWN_E, ...SPAWN_B]) poe(x, z, 6.5);
  for (const p of CTF_PTS) poe(p.x, p.z, 5);
  for (const [x, z] of [[-26, -33], [26, -33], [-26, 33], [26, 33], [-16, 38], [16, -38]]) poe(x, z, 4.6);
  for (const [x, z] of [[-13, -12], [13, 13], [-12, 30], [11.5, -31.5], [-22, 30], [22, 10], [-20, -30], [20, 32]]) poe(x, z, 3.2);
  poe(24, -33, 4); poe(12.5, -33.5, 2.8); poe(25, 20, 3.5); poe(23, 33, 3.5); poe(-14.7, 0, 3);
  // estação viva em RETÂNGULO (casa + patamar + escada + caixa d'água) — disco r8
  // esterilizava 211 m² por palafita e deixava o lado leste sem mata nenhuma
  const retangEstacao = (st) => (st.d[0] < 0
    ? { x0: st.x - 7.1, x1: st.x + 3.4 }
    : { x0: st.x - 3.4, x1: st.x + 7.1 });
  const galpao = (x, z) => x > -30.5 && x < -15.5 && z > -6 && z < 6;
  // margem viva: fora das cabeceiras das pontes a mata desce até 11,3 m do eixo —
  // na faixa da ponte recua p/ 12,6 (tronco não nasce no vão do deck)
  const naCabecaDePonte = (z) => [0, -24, 24].some((pz) => Math.abs(z - pz) < 2.4);
  const naMargem = (x, z) => Math.abs(x) >= (naCabecaDePonte(z) ? 12.6 : 11.3);
  const vive = (x, z) => {
    if (!naMargem(x, z) || Math.abs(x) > ANEL_LIM || Math.abs(z) > Z_LIM || galpao(x, z)) return false;
    if (discos.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) return false;
    return !ESTACOES.some((st) => {
      const r = retangEstacao(st);
      return x > r.x0 && x < r.x1 && z > st.z - 5.2 && z < st.z + 5.2;
    });
  };
  const P = 4.9;
  let linha = 0;
  for (let gz = -38.5 + P / 2; gz <= 38.5; gz += P, linha++) {
    const desl = (linha % 2) * P / 2;
    for (let gx = -ANEL_LIM + P / 2 + desl; gx <= ANEL_LIM - P / 2 + 0.01; gx += P) {
      const x = +(gx + (fract(Math.sin(gx * 12.9898 + gz * 78.233) * 43758.5453) * 2.2 - 1.1)).toFixed(1);
      const z = +(gz + (fract(Math.sin(gx * 39.346 + gz * 11.135) * 24634.6345) * 2.2 - 1.1)).toFixed(1);
      if (!vive(x, z)) continue;
      MATA_INTERIOR.push({ x, z, s: +(6.4 + fract(Math.sin(x * 3.7 + z * 7.1) * 1234.5) * 2.8).toFixed(1) });
    }
  }
  // capões de bolso: a grade não alcança os vazios entre palafitas do leste —
  // bosques autorados, peneirados pelo MESMO vive() da grade
  const CAPOES = [
    [21, -39.2], [23.2, -39.6], [25.4, -39.3], [27.3, -38.3], [27.9, -35.6], [24.6, -37.3], [21.9, -36.9],
    [26.6, -29.8], [27.6, -28.2], [25.9, -26.9], [27.7, -25.3],
    [25.2, 14.9], [27.2, 13.7], [26.6, 16.2], [25.9, 0.9], [27.9, 0.5], [28.3, 18.7], [24.7, 1.1],
    [18.3, -8.5], [18.7, -4.6], [18.1, -12.2],
    [11.9, -40.4],
    [21, 22.6], [22.9, 23.4], [24.8, 39.6], [28.4, 37.2],
    [-28.5, -40.5], [-27.8, -37.4], [-25, -38.6], [-24.4, -37.2], [-21.8, -35.6], [-28.9, -36.4], [-26.7, -40.2],
  ];
  for (const [cx0, cz0] of CAPOES) {
    const x = +(cx0 + (fract(Math.sin(cx0 * 1.7 + cz0 * 4.3) * 999.7) * 0.8 - 0.4)).toFixed(1);
    const z = +(cz0 + (fract(Math.sin(cx0 * 8.9 + cz0 * 2.6) * 777.3) * 0.8 - 0.4)).toFixed(1);
    if (!vive(x, z)) continue;
    MATA_INTERIOR.push({ x, z, s: +(6.4 + fract(Math.sin(x * 3.7 + z * 7.1) * 1234.5) * 2.8).toFixed(1) });
  }
  // babacu da margem (a varzea começa na beira da água) + buriti baixo de sub-bosque
  for (const lado of [-1, 1]) for (let gz = -36; gz <= 36; gz += 6.2) {
    const x = +(lado * (10.6 + fract(Math.sin(gz * 91.17 + lado * 31.7) * 31337.7) * 1.0)).toFixed(1);
    const z = +(gz + (fract(Math.sin(gz * 12.1 + lado * 7.7) * 4578.3) * 1.8 - 0.9)).toFixed(1);
    if (naCabecaDePonte(z)) continue;
    if (discos.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r * 0.7)) continue;
    if (ESTACOES.some((st) => Math.hypot(x - st.x, z - st.z) < 6)) continue;
    BABACU_INTERIOR.push({ x, z, s: +(4.2 + fract(Math.sin(z * 5.9) * 777.7) * 1.6).toFixed(1) });
  }
  for (let i = 2; i < MATA_INTERIOR.length; i += 3) {
    const a = MATA_INTERIOR[i];
    const bx = +(a.x + 1.6 - fract(a.x * 7.7) * 3.2).toFixed(1), bz = +(a.z + 1.6 - fract(a.z * 5.3) * 3.2).toFixed(1);
    // buriti conta como instância na AMZ7: mesma peneira da árvore-mãe, sem vazar pro leito
    if (!vive(bx, bz)) continue;
    BABACU_INTERIOR.push({ x: bx, z: bz, s: +(2.6 + fract(a.x + a.z) * 1.0).toFixed(1), baixo: true });
  }
  for (let i = 1; i < MATA_INTERIOR.length; i += 2) {
    const a = MATA_INTERIOR[i];
    const gx2 = +(a.x + 1.4 - fract(a.z * 9.1) * 2.8).toFixed(1), gz2 = +(a.z + 1.4 - fract(a.x * 4.3) * 2.8).toFixed(1);
    if (Math.abs(gx2) < 10.6 || Math.abs(gx2) > 28.6 || Math.abs(gz2) > 41) continue;   // grama é de terra
    GRAMA_INTERIOR.push({ x: gx2, z: gz2, id: i % 4 ? 'grama_corrego_01' : 'grama_corrego_02' });
  }
}

// AMZ5: a árvore na boca da escada norte (17,29) bloqueava a entrada com guardas.
// Deslocamento autorado de 1,2m preserva a instância e a densidade dos quadrantes.
const arvoreNoAcesso = MATA_INTERIOR.find(a => a.x === 13 && a.z === 22.7);
if (arvoreNoAcesso) arvoreNoAcesso.z = 21.5;

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
  const matSelva = lam({ map: texDe(TEX.selva, 28, 36) || T.dirt, color: 0xadb4a2, roughness: 1 });
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
  const PAISAGEM_X = 48, PAISAGEM_Z = 60; // chão sob a mata externa, fora dos bounds físicos
  const FAIXA = PAISAGEM_X - RIO_MEIA_LARGURA;
  addFloor(FAIXA, PAISAGEM_Z * 2, matSelva, -(RIO_MEIA_LARGURA + FAIXA / 2), 0, 0);
  addFloor(FAIXA, PAISAGEM_Z * 2, matSelva, RIO_MEIA_LARGURA + FAIXA / 2, 0, 0);
  const fundo = addFloor(RIO_MEIA_LARGURA * 2, PAISAGEM_Z * 2, matFundo, 0, 0, RIO_FUNDO);
  fundo.userData.nonSolidSurface = true;

  // A mesma rampa alimenta malha e pés: sem degrau invisível na saída da água.
  for (const side of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(RIO_MEIA_LARGURA - RIO_CAMPO, PAISAGEM_Z * 2);
    geo.rotateX(-Math.PI / 2);
    geo.translate(side * (RIO_CAMPO + RIO_MEIA_LARGURA) / 2, 0, 0);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, margemY(p.getX(i)));
    geo.computeVertexNormals();
    const bank = new THREE.Mesh(geo, matFundo);
    bank.name = 'margem-amazonia'; bank.receiveShadow = true; root.add(bank);
  }

  /* Canal de várzea na vazante: sedimento em suspensão e espuma discreta.
     Raso próximo ao fundo evita faixas claras artificiais no contato com madeira.
     A lâmina termina onde encontra a rampa, abaixo das três pontes. */
  const aguaMeiaLargura = RIO_CAMPO + (RIO_AGUA - RIO_FUNDO) /
    (RIO_MARGEM - RIO_FUNDO) * (RIO_MEIA_LARGURA - RIO_CAMPO);
  const agua = createWater(scene, T, 'amazonia', {
    nivel: RIO_AGUA, centro: [0, 0], tamanho: [aguaMeiaLargura * 2, PAISAGEM_Z * 2], segmentos: 12,
    raso: 0x3b3b29, fundo: 0x302f22, marLonge: 0x585c41,
    profEscala: 0.4, espumaFaixa: 0.06, espumaMiolo: 0.01,
    profFallback: RIO_AGUA - RIO_FUNDO, fluxo: [0, 0.09], ampEscala: 0.06,
    mapa: TEX.agua.map || T.dirt, mapaEscala: [3, 13.3], mapaForca: 0.08,
    parent: root,
  });
  agua.mesh.userData.nonSolidSurface = true;
  agua.mesh.material.uniforms.uCorEspuma.value.setHex(0x85856b);

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

  /* ── PONTÕES DO MARKET: guardados antes das estações porque o pé da escada de
     palafita mede o chão-base (pontão conta como chão) no momento do build. */
  const pontoes = [
    { x0: 4.2, x1: 8.0, z0: -2, z1: 3 },     // principal — MID (x1 < corredor da rota alta)
    { x0: 4.0, x1: 8.6, z0: 8, z1: 13 },
    { x0: 3.8, x1: 7.8, z0: -16, z1: -11 },
  ];
  const PONTAO_Y = 0.28;

/* ── ESTAÇÕES DE PALAFITA (molde palafita_pro.glb; bucha procedural sem GLB): patamar
     andável no groundHeightAt (idioma das pontes) + corrimão `passarela` nas bordas livres. */
  const PB = new PropBatch({ bucket: 16, shadowMin: 0.02 });
  const SB = new StaticBatch({ name: 'madeira-amazonia' });
  const geoPrancha = new THREE.BoxGeometry(1, 1, 1);
  const pieceBox = (mat, w, h, d, x, y, z, ry = 0) => {
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    m.scale(new THREE.Vector3(w, h, d));
    SB.add(geoPrancha, m, mat);
  };
  const trilhoCol = (x0, z0, x1, z1) => {
    colliders.push({
      minX: Math.min(x0, x1) - 0.14, maxX: Math.max(x0, x1) + 0.14,
      minZ: Math.min(z0, z1) - 0.14, maxZ: Math.max(z0, z1) + 0.14,
      minY: DECK_Y, maxY: DECK_Y + 0.52, passarela: true,
    });
  };
  const CS = createCabinShells({root,colliders,occluders,wallMaterial:matDeck,floorMaterial:matDeck});
  const CAIXAS_AGUA = [];
  const estacao = (st) => {
    const [dx, dz] = st.d, [px, pz] = st.p;
    const W = (u, v) => [st.x + dx * u + px * v, st.z + dz * u + pz * v];
    const yaw = Math.atan2(-dz, dx);
    const casaChapa = (st.x === 14 && st.z === -9) || (st.x === -14 && st.z === 6);
    const cabin=CS.add(st,casaChapa);
    if(hasProp('palafita_aberta_amazonia')&&!casaChapa) PB.add('palafita_aberta_amazonia',{x:st.x,z:st.z,y:PILA_GLB,targetH:6,ry:dx<0?0:Math.PI});
    else {
      for(const [u,v] of [[-2.6,-2.6],[2.6,-2.6],[-2.6,2.6],[2.6,2.6]]){
        const [x,z]=W(u,v);addCyl(.16,cabin.floorY,matPoste,x,0,z,{seg:6});
      }
      for(const side of [-1,1]){
        const roof=new THREE.Mesh(new THREE.BoxGeometry(6.7,.1,3.3),casaChapa?matZinco:matPalha);
        roof.position.set(st.x,cabin.floorY+cabin.height+.30,st.z+side*1.55-(casaChapa?0:(st.x>0?1:-1)*2));
        roof.rotation.x=side*.18;roof.castShadow=true;root.add(roof);occluders.push(roof);
      }
    }
    if(!casaChapa){
      const sign=st.x>0?1:-1;
      // Varanda medida no GLB; o lance substitui a escada estreita sem piso físico.
      for(let i=0;i<12;i++) {
        const lx=-3.3+(i+.5)*.28, top=DECK_Y+(3.85-DECK_Y)*(i+1)/12;
        const x=st.x+sign*lx,z=st.z+sign*.7;
        pieceBox(matDeck,.28,.09,1.6,x,top-.045,z);
        colliders.push({minX:x-.14,maxX:x+.14,minZ:z-.8,maxZ:z+.8,minY:DECK_Y-.12,maxY:top});
        for(const side of [-1,1]) {
          pieceBox(matPoste,.28,.12,.09,x,top+.5,z+side*.86);
          colliders.push({minX:x-.14,maxX:x+.14,minZ:z+side*.86-.045,maxZ:z+side*.86+.045,minY:top,maxY:top+.56,passarela:true});
          if(i%3===0) pieceBox(matPoste,.07,.56,.07,x,top+.28,z+side*.86);
        }
      }
      // A casa recuada deixa a borda interna do deck exposta; guarda com vão do lance.
      for (const [a, b] of [[-1.6, -.1], [1.5, 1.6]]) {
        const x = st.x - sign * 3.02, z = st.z + sign * (a + b) / 2;
        pieceBox(matPoste, .09, .12, b-a, x, DECK_Y+.5, z);
        colliders.push({minX:x-.045,maxX:x+.045,minZ:z-(b-a)/2,maxZ:z+(b-a)/2,minY:DECK_Y,maxY:DECK_Y+.56,passarela:true});
      }
      // Piso frontal ligado à porta; guarda somente na borda externa.
      pieceBox(matDeck,1.2,.08,1.6,st.x+sign*.6,3.81,st.z+sign*.7);
      for(const zz of [1.56]) {
        pieceBox(matPoste,1.2,.12,.09,st.x+sign*.6,4.35,st.z+sign*zz);
        colliders.push({minX:st.x+sign*.6-.6,maxX:st.x+sign*.6+.6,minZ:st.z+sign*zz-.045,maxZ:st.z+sign*zz+.045,minY:3.85,maxY:4.41,passarela:true});
      }
      pieceBox(matPoste,.09,.12,1.72,st.x+sign*1.23,4.35,st.z+sign*.7);
      colliders.push({minX:st.x+sign*1.23-.045,maxX:st.x+sign*1.23+.045,minZ:st.z+sign*.7-.86,maxZ:st.z+sign*.7+.86,minY:3.85,maxY:4.41,passarela:true});
    }
    // patamar: prancha a DECK_Y + viga embaixo (corpo não anda sob a madeira)
    const [pcx, pcz] = W(CASA_A + PAT_A, 0);
    pieceBox(matDeck, 2 * PAT_A + 0.4, 0.12, 2 * PAT_A, pcx, DECK_Y - 0.06, pcz, yaw);
    for (const [u, v] of [[CASA_A + 0.2, -PAT_A + 0.2], [CASA_A + 2 * PAT_A - 0.2, -PAT_A + 0.2], [CASA_A + 0.2, PAT_A - 0.2], [CASA_A + 2 * PAT_A - 0.2, PAT_A - 0.2]]) {
      const [cx, cz] = W(u, v);
      addCyl(0.13, DECK_Y + 0.7, matPoste, cx, -0.6, cz, { seg: 6, collide: false });
    }
    // corrimões: laterais com vão da escada/das pranchas, testa (u+) inteira menos vão da rede
    const subtrai = (pecas, vao) => {
      const out = [];
      for (const [a, b] of pecas) {
        const cortes = [[a, b]];
        for (const [g0, g1] of vao) for (let i = cortes.length - 1; i >= 0; i--) {
          const [c0, c1] = cortes[i];
          if (g1 <= c0 || g0 >= c1) continue;
          cortes.splice(i, 1);
          if (c0 < g0 - 0.05) cortes.push([c0, g0]);
          if (g1 < c1 - 0.05) cortes.push([g1, c1]);
        }
        out.push(...cortes);
      }
      return out;
    };
    const VAN_O = [3.5, 5.7], VAN_E = [3.55, 5.25];   // vão da prancha da rede / da escada
    for (const lado of [-1, 1]) {
      const v = lado * PAT_A;
      const vaos = [];
      if (st.e === lado) vaos.push(VAN_E);
      // vãos da rede: A sai pro sul, C entra e sai, D entra
      if (st.rede && st.z < -20 && lado === 1) vaos.push(VAN_O);
      if (st.rede && st.x === 14 && st.z === -9) vaos.push(VAN_O);
      if (st.rede && st.z === 6 && st.x === 14 && lado === -1) vaos.push(VAN_O);
      for (const [u0, u1] of subtrai([[CASA_A, CASA_A + 2 * PAT_A]], vaos)) {
        const [ax, az] = W(u0, v), [bx, bz] = W(u1, v);
        trilhoCol(ax, az, bx, bz);
        pieceBox(matPoste, u1 - u0, 0.16, 0.14, (ax + bx) / 2, DECK_Y + 0.44, (az + bz) / 2, yaw);
      }
    }
    {
      const uf = CASA_A + 2 * PAT_A;
      const vaos = st.rede && (st.x === 14 ? st.z === 6 : true) ? [[-1.25, 1.25]] : [];   // D e F: testa abre pr'as pranchas
      for (const [v0, v1] of subtrai([[-PAT_A, PAT_A]], vaos)) {
        const [ax, az] = W(uf, v0), [bx, bz] = W(uf, v1);
        trilhoCol(ax, az, bx, bz);
        pieceBox(matPoste, 0.14, 0.16, v1 - v0, (ax + bx) / 2, DECK_Y + 0.44, (az + bz) / 2, yaw);
      }
    }
    if (st.e) {
      // escada: degraus quantizados no gh (idioma do mezanino) + bloco sólido embaixo;
      // espelho <=0,15 -> dois espelhos <=0,30 do pé: sobe sem empurrão do lance de cima
      const g0 = chaoBase(...W(4.4, st.e * (PAT_A + 2.4)));
      const n = Math.max(8, Math.ceil((DECK_Y - g0) / 0.149));
      const esp = (DECK_Y - g0) / n, run = n * ESC_PISO;
      for (let i = 0; i < n; i++) {
        const vC = st.e * (PAT_A + (i + 0.5) * ESC_PISO);
        const top = g0 + esp * (n - i);
        const [cx, cz] = W(4.4, vC);
        colliders.push({ minX: cx - 0.8, maxX: cx + 0.8, minY: g0 - 0.6, maxY: top, minZ: cz - 0.19, maxZ: cz + 0.19 });
        pieceBox(matDeck, 1.6, 0.09, 0.3, cx, top - 0.045, cz, yaw);
        // MAP6: elevar o deck tornou a queda lateral >2m; guarda acompanha cada degrau.
        for (const ladoGuarda of [-1, 1]) {
          const [gx, gz] = W(4.4 + ladoGuarda * .86, vC);
          colliders.push({minX:gx-.055,maxX:gx+.055,minZ:gz-.19,maxZ:gz+.19,minY:top,maxY:top+.52,passarela:true});
          pieceBox(matPoste,.11,.16,.3,gx,top+.44,gz,yaw);
          if(i%3===0)pieceBox(matPoste,.09,.5,.09,gx,top+.25,gz,yaw);
        }
      }
      st.escada = { g0, esp, n, run };
    }
    CAIXAS_AGUA.push(W(CASA_A + 2 * PAT_A + 0.7, st.e * 1.35));
  };
  for (const st of ESTACOES) estacao(st);

  /* ── ROTA ALTA: pranchas A→C→D→M→F a DECK_Y — a travessia do igarapé POR CIMA da
     madeira. Corrimão-collider dos dois lados; embaixo só travessa visual (1,45 m) —
     quem vadeia o igarapé passa por baixo, sem parede invisível (CTF2). */
  for (const p of PONTES_ALTA) {
    const L = Math.hypot(p.bx - p.ax, p.bz - p.az);
    const dir = [(p.bx - p.ax) / L, (p.bz - p.az) / L], per = [dir[1], -dir[0]];
    const yaw = Math.atan2(-dir[1], dir[0]);
    for (let s = 0.28; s < L; s += 0.56) pieceBox(matDeck, 0.5, 0.09, 2.2, p.ax + dir[0] * s, DECK_Y - 0.045, p.az + dir[1] * s, yaw);
    for (const lado of [-1, 1]) for (let s = 0; s < L; s += 2.3) {
      const e = Math.min(s + 2.3, L), half = (e - s) / 2;
      const cx = p.ax + dir[0] * (s + half) + per[0] * lado * 1.1, cz = p.az + dir[1] * (s + half) + per[1] * lado * 1.1;
      trilhoCol(cx - dir[0] * half, cz - dir[1] * half, cx + dir[0] * half, cz + dir[1] * half);
      pieceBox(matPoste, e - s, 0.16, 0.14, cx, DECK_Y + 0.44, cz, yaw);
    }
    for (let s = 0.8; s < L; s += 1.6) pieceBox(matPoste, 0.16, 0.14, 2.4, p.ax + dir[0] * s, DECK_Y - 0.30, p.az + dir[1] * s, yaw);
    for (let s = 0.9; s < L; s += 2.9) for (const lado of [-1, 1])
      addCyl(0.13, DECK_Y + 0.6, matPoste, p.ax + dir[0] * s + per[0] * lado, -0.6, p.az + dir[1] * s + per[1] * lado, { seg: 6, collide: false });
  }
  // platforma no meio do igarapé: patamar sem casa — desembarque da travessia alta
  pieceBox(matDeck, 3.2, 0.12, 3.2, PLATA_M.x, DECK_Y - 0.06, PLATA_M.z);
  for (const zz of [PLATA_M.z - 1.6, PLATA_M.z + 1.6]) {
    trilhoCol(PLATA_M.x - 1.6, zz, PLATA_M.x + 1.6, zz);
    pieceBox(matPoste, 3.2, 0.16, 0.14, PLATA_M.x, DECK_Y + 0.44, zz);
  }
  for (const sx of [-1.5, 1.5]) for (const sz of [PLATA_M.z - 1.4, PLATA_M.z + 1.4])
    addCyl(0.15, DECK_Y + 0.6, matPoste, PLATA_M.x + sx, -0.6, sz, { seg: 6, collide: false });
  for (const [cx, cz] of CAIXAS_AGUA) addCyl(0.5, 0.9, matZinco, cx, chaoBase(cx, cz) - 0.05, cz, { seg: 10 });
  const preMadeira = new Set(root.children);
  PB.build(root); SB.build(root); CS.build();
  const estacas = new Map();
  for (const c of root.children) if (!preMadeira.has(c)) c.traverse(o => {
    if (!o.isMesh || !o.material.name.includes('Palafita com passarela')) return;
    if (!estacas.has(o.geometry)) {
      const geo = o.geometry.clone(); geo.computeBoundingBox();
      const p = geo.attributes.position, {min,max} = geo.boundingBox, h = max.y-min.y;
      for (let i=0;i<p.count;i++) {
        const peso = Math.max(0, 1 - (p.getY(i)-min.y)/(h*.2));
        p.setY(i, p.getY(i)-PILA_GLB*h/6*peso);
      }
      p.needsUpdate=true; geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
      estacas.set(o.geometry,geo);
    }
    o.geometry=estacas.get(o.geometry);
    if(o.isInstancedMesh) o.computeBoundingSphere();
  });
  for (const c of root.children) {
    if (preMadeira.has(c)) continue;
    if (c.isInstancedMesh || c.isMesh) occluders.push(c);   // molde e madeira seguram bala (idioma da mansão)
  }

  /* ── MARKET FLUTUANTE: pontões amarrados na margem leste (degrau de 0,28 m — chega-se
      andando), barracas de lona e canoas. A bandeira MID mora no pontão norte. */
  const barraca = (x, z, ry, cor) => {
    addBox(1.9, 0.85, 1.1, matDeck, x, 0.4, z, { ry });
    for (const s of [-1, 1]) addCyl(0.07, 2.1, matPoste, x + s * 0.85 * Math.cos(ry), 0.4, z - s * 0.85 * Math.sin(ry), { seg: 5 });
    const tarp = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.05, 1.9), cor);
    tarp.position.set(x, 2.55, z); tarp.rotation.y = ry; tarp.rotation.z = 0.16;
    tarp.castShadow = true; root.add(tarp); occluders.push(tarp);
  };
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
    barraca(5.2, 2.3, 0, matLona[0]); barraca(7.2, 2.3, 0, matLona[1]); barraca(5.2, -1.25, 0, matLona[2]);
  });
  pontao(pontoes[1], () => { barraca(5.4, 9.2, -0.26, matLona[3]); barraca(7.8, 11.6, 0.2, matLona[0]); });
  pontao(pontoes[2], () => { barraca(5.2, -14.8, 0.15, matLona[2]); barraca(6.6, -12.4, -0.29, matLona[1]); });
  const canoasAmarradas = [];
  const canoa = (x, z, ry) => {
    const model=placeProp('canoa_rabeta_amazonia',{x,z,ry:ry+1.04,y:RIO_AGUA-.025,targetH:.62});
    if(model){
      model.name='canoa-amarrada';
      model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.userData.nonSolidSurface=true;}});
      root.add(model); canoasAmarradas.push(model);
    }
  };
  canoa(-3.2,-24.5,.34); canoa(2.6,18.5,-.22); canoa(-4.5,15,1.35);
  canoa(7.8,-4.6,.42); canoa(-2.2,-6.5,1.52);
  // booms de lenha: troncos amarrados boiando — cover no meio do canal
  for (const b of BOOMS) for (let i = 0; i < b.n; i++) {
    addCyl(0.35, 3.6, matTroncoBoiando, b.x0 + i * 1.18, RIO_AGUA - 0.32, b.z + (i % 2) * 0.5, { rx: Math.PI / 2, seg: 7 });
  }

  /* ── MADEIREIRA ABANDONADA (o galpão do CTF): telhadão de zinco sobre postes,
      sem paredes — serragem no chão, serras, pilhas de tora e pranchas empilhadas. */
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
  pranchas(MX - 6.5, -4.5, 0.34); pranchas(MX + 4.5, -4.8, -0.28); pranchas(23, 33, 0.18);
  // Madeira armazenada protege os spawns; duas saídas laterais e borda do canal livres.
  for (const side of [-1, 1]) {
    const z = side * 35.7;
    const stacks = side > 0 ? [[11.15, 0.5], [16.6, 5.0]] : [[-15, 8.2]];
    for (const [x, w] of stacks) {
      addBox(w, 1.9, 0.8, matDeck, x, 0, z);
      for (let i = 1; i < 6; i++) pieceBox(matCasca, w, 0.025, 0.025, x, i * 0.3, z - side * 0.411);
    }
  }
  // scrap da madeireira: pneus e entulho herdam o vocabulário do ferro-velho
  for (const [id, x, z, h, ry] of [['pilha_pneus', MX - 8.5, 5.5, 1.1, 0.2], ['dumpster', MX + 9.8, 0, 1.4, -0.34], ['tires', 12.5, -33.5, 0.8, 0.4], ['pilha_pneus', 25, 20, 1.1, -0.26]]) {
    if (hasProp(id)) { const p = placeProp(id, { x, z, y: 0, targetH: h, ry }); if (p) { root.add(p); colliders.push({ minX: x - 1.2, maxX: x + 1.2, minY: 0, maxY: h, minZ: z - 1.2, maxZ: z + 1.2 }); occluders.push(p); } }
  }

  // Copas em duas camadas usam o mesmo molde do bosque. O fundo não projeta sombras.

  /* ── MATA DENSA (molde arvore_mata.glb + palmeira_babacu.glb, kit Mint r2): fileira
      de árvores de verdade por cima da cerca — o horizonte vira floresta, não cidade.
      Instanciado no PropBatch (1 draw call por material) e com tronco-collider. */
  const PBM = new PropBatch({ bucket: 18, tag: 'amazonia-bosque', shadowMin: 0.02, cast: !LOWQ });
  const mataPerimetroBatch = new PropBatch({ bucket: 18, tag: 'amazonia-perimetro', cast: false });
  const mataFundoBatch = new PropBatch({ bucket: 18, tag: 'amazonia-fundo', cast: false });
  for (const a of MATA_FUNDO) mataFundoBatch.add('arvore_mata_amazonia', {x:a.x,z:a.z,targetH:a.s,ry:fract(a.z*.31)*6.283});
  const antesFundo = new Set(root.children);
  mataFundoBatch.build(root);
  for (const o of root.children) if (!antesFundo.has(o)) o.traverse(c => { if(c.isMesh)c.castShadow=false; });
  for (const a of MATA_ARVORES) {
    mataPerimetroBatch.add('arvore_mata_amazonia', { x: a.x, z: a.z, y: 0, targetH: a.s });
    const r = 0.45 * a.s / 11.4;
    colliders.push({ minX: a.x - r, maxX: a.x + r, minY: 0, maxY: 2.6, minZ: a.z - r, maxZ: a.z + r });
  }
  for (const pa of MATA_PALMEIRAS) mataPerimetroBatch.add('palmeira_babacu_amazonia', { x: pa.x, z: pa.z, y: 0, targetH: pa.s });
  // interior (r3): colisor de tronco INCONDICIONAL — em node o GLB não carrega e o
  // arnês tem que medir o mesmo tronco que o browser instancia (sem segunda verdade)
  for (const a of MATA_INTERIOR) {
    PBM.add('arvore_mata_amazonia', { x: a.x, z: a.z, y: 0, targetH: a.s, ry: fract(a.x * 3.1 + a.z * 1.7) * 6.283 });
    const r = 0.45 * a.s / 11.4;
    colliders.push({ minX: a.x - r, maxX: a.x + r, minY: 0, maxY: 2.6, minZ: a.z - r, maxZ: a.z + r });
  }
  for (const pa of BABACU_INTERIOR) PBM.add('palmeira_babacu_amazonia', { x: pa.x, z: pa.z, y: 0, targetH: pa.s, ry: fract(pa.z * 2.9) * 6.283 });
  for (const gr of GRAMA_INTERIOR) PBM.add(gr.id, { x: gr.x, z: gr.z, y: 0, targetH: 0.75 + fract(gr.x) * 0.5, ry: fract(gr.z * 5.5) * 6.283 });
  const preMata = new Set(root.children);
  mataPerimetroBatch.build(root);
  PBM.build(root);
  const troncos = new Map();
  const ajustarTronco = c => {
    if (c.isMesh && c.material.name.includes('Árvore de mata')) {
      // Derivação local do molde: sapopemas do GLB chegavam a 2,26 m fora do
      // colisor. Mantém copa/UV, estreita apenas a seção baixa de todas as instâncias.
      if (!troncos.has(c.geometry)) {
        const geo = c.geometry.clone(); geo.computeBoundingBox();
        const p = geo.attributes.position, { min, max } = geo.boundingBox;
        const h = max.y - min.y, radius = h * 0.45 / 11.4;
        for (let i = 0; i < p.count; i++) {
          const y = (p.getY(i) - min.y) / h;
          const r = Math.hypot(p.getX(i), p.getZ(i));
          const blend = THREE.MathUtils.smoothstep(y, 0.41, 0.62);
          const scale = r > radius ? radius / r + (1 - radius / r) * blend : 1;
          p.setXYZ(i, p.getX(i) * scale, p.getY(i), p.getZ(i) * scale);
        }
        p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingBox(); geo.computeBoundingSphere();
        troncos.set(c.geometry, geo);
      }
      c.geometry = troncos.get(c.geometry);
      if (c.isInstancedMesh) c.computeBoundingSphere();
    }
  };
  for (const c of root.children) if (!preMata.has(c)) {
    c.traverse(ajustarTronco);
    c.traverse(m => { if (m.isMesh && (LOWQ || c.name.includes('amazonia-perimetro') || (!m.isInstancedMesh && (Math.abs(c.position.x)>=29 || Math.abs(c.position.z)>=41.5)))) m.castShadow=false; });
    occluders.push(c);
  }

  const foliageClearance=clearCabinFoliage(root,CS.cabins,occluders);

  /* ── CHÃO DE MATA (r3): serapilheira sob o bosque, raiz de sustentação nos
      troncos e tora fina no chão — o piso de terra vira chão de floresta. */
  const SBS = new StaticBatch({ name: 'chao-de-mata' });
  const matSerapilheira = lam({ map: texDe(TEX.serragem, 5, 4) || T.dirt, color: 0x76604a, roughness: 1 });
  const geoRaiz = new THREE.CylinderGeometry(0.5, 0.22, 1, 6).rotateZ(Math.PI / 2);
  const raiz = (x, z, ry, len) => {
    // topo ≤ 0,28 m: raiz é degrau de tornozelo, não sólido (MAP1 mede raycast, não collider)
    const m = new THREE.Matrix4().makeRotationY(ry).multiply(new THREE.Matrix4().makeRotationZ(0.09));
    m.setPosition(x, 0.07, z);
    m.scale(new THREE.Vector3(len, 0.18, 0.32));
    SBS.add(geoRaiz, m, matCasca);
  };
  for (let i = 0; i < MATA_INTERIOR.length; i += 4) {
    const a = MATA_INTERIOR[i], r = fract(a.x * 1.3 + a.z * 2.1);
    const m = addFloor(4.2 + r * 3, 3.4 + fract(a.z - a.x) * 2.4, matSerapilheira,
      a.x, a.z, 0.012, r * 3.1);
    m.geometry.dispose();
    m.geometry = new THREE.CircleGeometry(1, 11);
    const p = m.geometry.attributes.position;
    for (let j = 1; j < p.count; j++) {
      const k = 0.75 + fract(j * 3.1 + a.x) * 0.25;
      p.setXYZ(j, p.getX(j) * k, p.getY(j) * k, 0);
    }
    m.scale.set(1.4 + r * 0.5, 1.1 + r * 0.4, 1);
    m.userData.nonSolidSurface = true;
  }
  for (let i = 0; i < MATA_INTERIOR.length; i += 3) {
    const a = MATA_INTERIOR[i], y = fract(a.x * 4.4 + a.z * 6.6) * Math.PI;
    raiz(a.x + Math.cos(y) * 0.7, a.z + Math.sin(y) * 0.7, y + 0.4, 1.4 + fract(a.z * 2.2) * 0.8);
    raiz(a.x - Math.cos(y) * 0.6, a.z - Math.sin(y) * 0.6, y - 1.9, 1.1 + fract(a.x * 3.3) * 0.7);
  }
  const preChao = new Set(root.children);
  SBS.build(root);
  for (const c of root.children) if (!preChao.has(c) && c.isMesh) occluders.push(c);

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
  troncoNoChao(-13, -12, 0.32); troncoNoChao(13, 13, -0.38); troncoNoChao(-12, 30, 1.22);
  // Toco largo e plano sustenta patas/barriga da onça; tronco estreito deixava as pontas no ar.
  addCyl(1.05,.84,matCasca,11.5,0,-31.5,{seg:12}).name='toco-onca';
  troncoNoChao(-22, 30, 0.18); troncoNoChao(22, 10, 1.38); troncoNoChao(-20, -30, 0.5); troncoNoChao(20, 32, -0.2);

  // Poleiros ligados ao chão/pontão: o galho incorporado ao GLB não é um suporte do mapa.
  for(const [x,y,z] of [[5.6,2.62,.4],[14.1,.95,18.35],[-7.1,.62,-23.35],
    [4.77,2.5,.6],[7.38,2.5,-12.63],[-7.1,.58,4.65],[20.1,.92,8.35]]){
    const base=chaoBase(x,z);
    addCyl(.075,y-base-.04,matPoste,x,base,z,{seg:6,collide:false}).name='poste-poleiro';
    addBox(.65,.06,.42,matCasca,x,y-.06,z,{collide:false}).name='apoio-poleiro';
  }

  /* ── FAUNA: jacaré e capivaras na margem. */
  const jacare = placeFauna('jacare', { x: 11.1, y: 0, z: 18.8, ry: 2.8, targetLen: 2.1 });
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
  for (const sz of [-1, 1]) arsenal.forEach((kind, i) => place(kind, sz < 0 ? -21 + i * 1.7 : 12 + i * 2, sz * 39, sz < 0 ? 0.6 : Math.PI - 0.6));
  // miolo: market, madeireira e pontes estreitas
  place('ak', 5.6, 1.4, 1.2); place('awp', 7.0, -0.5, 0.4);
  place('shotgun', MX + 1, -1.4, 2.2); place('mp5', MX + 3, 18.5, -0.6);
  place('deagle', 0, -24.2, 0); place('m4', 0, 24.2, Math.PI);
  place('deagle', 0, 6, 0.4);   // platforma do meio do igarapé: a rota alta paga a subida

  /* ── NAVEGAÇÃO: grade de chão + nós NA MADEIRA (patamar, prancha, escada) com y —
     idioma do mezanino da mansão. Nó sem vizinho alcançável é PODADO: ilhado reprova
     o MC3 do map-contrato. */
  const blocked = (x, z, inflate = 0.45, yRef = 0) => {
    const g = groundHeightAt(x, z, yRef);
    // O bot usa o piso mais alto; caminhos baixos sob madeira causam teleporte e prisão na casa.
    for (const [ox, oz] of [[0, 0], [-inflate, 0], [inflate, 0], [0, -inflate], [0, inflate]]) {
      const px = x + ox, pz = z + oz, top = groundHeightAt(px, pz);
      if (top > g + 1.5 && (top > DECK_Y + .35 || CS.cabins.some(c => c.chapa && c.contains(px, pz)))) return true;
    }
    return colliders.some((c) => c.minY < g + 1.5 && c.maxY > g + 0.3
      && x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate);
  };
  const STEP = AMAZONIA_NAV_STEP;
  const crusos = [];
  for (let x = -HALF_X + 2.5; x <= HALF_X - 2.5; x += STEP) for (let z = -HALF_Z + 2.5; z <= HALF_Z - 2.5; z += STEP)
    if (!blocked(x, z)) crusos.push({ x, z, y: groundHeightAt(x, z, 0) });
  /* Faixa externa transitável do spawn B; causa, prova e limites estão no ledger da Amazônia. */
  const ROTA_LATERAL_B = [
    [18, 38.2], [19.6, 36.6], [21.2, 35], [21.2, 33.4], [21.2, 31.8], [21.2, 30.2],
    [22.8, 28.6], [22.8, 27], [21.2, 25.4], [21.2, 23.8], [21.2, 22.2], [21.2, 20.6],
    [21.2, 19], [21.2, 17.4], [19.6, 15.8], [19.6, 14.2], [18, 12.6], [16.4, 11], [14.8, 9.4],
    [13.2, 7.8], [11.6, 6.2], [10, 4.6], [8.4, 3], [8.4, 1.4],
  ];
  const rotaLateralB = (QP.get('amzctf2lane') === '0' ? [] : ROTA_LATERAL_B).map(([x, z]) => {
    crusos.push({ x, z, y: groundHeightAt(x, z, 0), rotaLateralB: true });
    return crusos.length - 1;
  });
  for (const st of ESTACOES) {
    const uc = CASA_A + PAT_A;
    for (const [u, v] of [[uc, 0], [uc + 1.1, 0], [uc - 1.1, 0], [uc, 1.0], [uc, -1.0]])
      if (!blocked(st.x + st.d[0] * u + st.p[0] * v, st.z + st.d[1] * u + st.p[1] * v, 0.3, DECK_Y))
        crusos.push({ x: st.x + st.d[0] * u + st.p[0] * v, z: st.z + st.d[1] * u + st.p[1] * v, y: DECK_Y });
    if (st.escada) {
      const run = st.escada.run;
      for (const d of [0, run * 0.25, run * 0.5, run * 0.75, run, run + 0.8]) {
        const v = st.e * (PAT_A + d);
        const x = st.x + st.d[0] * 4.4 + st.p[0] * v, z = st.z + st.d[1] * 4.4 + st.p[1] * v;
        const y = groundHeightAt(x, z, 99);   // altura do PRÓPRIO degrau, não do chão-base
        if (!blocked(x, z, 0.3, y)) crusos.push({ x, z, y });
      }
    }
  }
  for (const p of PONTES_ALTA) {
    const L = Math.hypot(p.bx - p.ax, p.bz - p.az), n = Math.max(1, Math.round(L / 2.2));
    for (let i = 0; i <= n; i++) {
      const x = p.ax + (p.bx - p.ax) * i / n, z = p.az + (p.bz - p.az) * i / n;
      if (!blocked(x, z, 0.3, DECK_Y)) crusos.push({ x, z, y: DECK_Y });
    }
  }
  for(const c of CS.cabins){
    const routes=[c.door.outside,c.door.threshold,c.door.inside,
      ...c.windows.map(w=>[w.center[0]-w.normal[0]*.6,c.floorY,w.center[2]-w.normal[1]*.6])];
    if(!c.chapa){const sign=c.x>0?1:-1;for(const lx of [-3.3,-2.1,-.9,.1,.6]){const x=c.x+sign*lx,z=c.z+sign*.7;routes.push([x,groundHeightAt(x,z,99),z]);}}
    for(const [x,y,z] of routes)if(!blocked(x,z,.2,y))crusos.push({x,y,z});
  }
  if (!blocked(PLATA_M.x, PLATA_M.z, 0.3, DECK_Y)) crusos.push({ x: PLATA_M.x, z: PLATA_M.z, y: DECK_Y });
  const segClear = (a, b) => {
    for (let i = 1; i < 6; i++) {
      const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (blocked(x, z, 0.2, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  };
  const vizinhos = (i) => {
    const out = [];
    for (let j = 0; j < crusos.length; j++) {
      if (i === j) continue;
      // A faixa B é uma rota declarada: só as 25 ligações auditadas abaixo podem
      // tocá-la. Sem isto a vizinhança automática cria atalhos para o interior.
      if (crusos[i].rotaLateralB || crusos[j].rotaLateralB) continue;
      const dx = crusos[i].x - crusos[j].x, dz = crusos[i].z - crusos[j].z, dy = Math.abs(crusos[i].y - crusos[j].y);
      if (dy <= 0.75 && dx * dx + dz * dz < STEP * STEP * 2.45 && segClear(crusos[i], crusos[j])) out.push(j);
    }
    return out;
  };
  const adjCrusos = crusos.map((_, i) => vizinhos(i));
  const ligacoesLateraisB = [];
  const liga = (a, b, lateralB = false) => {
    if (!adjCrusos[a].includes(b)) adjCrusos[a].push(b);
    if (!adjCrusos[b].includes(a)) adjCrusos[b].push(a);
    if (lateralB) ligacoesLateraisB.push([a, b]);
  };
  for (let i = 1; i < rotaLateralB.length; i++) liga(rotaLateralB[i - 1], rotaLateralB[i], true);
  for (const ponta of rotaLateralB.length ? [rotaLateralB[0], rotaLateralB.at(-1)] : []) {
    let melhor = -1, dist = Infinity;
    for (let i = 0; i < crusos.length; i++) if (!crusos[i].rotaLateralB) {
      if (Math.abs(crusos[i].y - crusos[ponta].y) > .55) continue;
      const d = Math.hypot(crusos[i].x - crusos[ponta].x, crusos[i].z - crusos[ponta].z);
      if (d < dist) { melhor = i; dist = d; }
    }
    if (dist <= STEP) liga(ponta, melhor, true);
  }
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
  const rotaLateralBNodos = rotaLateralB.map(i => remapa[i]).filter(i => i >= 0);
  const rotaLateralBLigacoes = ligacoesLateraisB.map(([a, b]) => [remapa[a], remapa[b]]).filter(([a, b]) => a >= 0 && b >= 0);
  function nearestWaypoint(x, z, yRef) {
    const y = groundHeightAt(x, z, yRef);
    let best = 0, bd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const dx = nodes[i].x - x, dz = nodes[i].z - z, dy = nodes[i].y - y, d = dx * dx + dz * dz + dy * dy * 4;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1), queue = [fromIdx]; prev[fromIdx] = fromIdx;
    for (let head = 0; head < queue.length; head++) {
      const n = queue[head];
      for (const next of adj[n]) if (prev[next] === -1) { prev[next] = n; if (next === toIdx) { const path = [next]; let cur = n; while (cur !== fromIdx) { path.unshift(cur); cur = prev[cur]; } path.unshift(fromIdx); return path; } queue.push(next); }
    }
    return [fromIdx];
  }

  if (typeof location === 'undefined' || new URLSearchParams(location.search).get('amzbatch') !== '0') {
    const lots=new Map();
    for(const mesh of [...root.children]) {
      if(!mesh.isMesh||mesh.userData.nonSolidSurface||mesh.isInstancedMesh||!['BoxGeometry','CylinderGeometry','SphereGeometry','IcosahedronGeometry'].includes(mesh.geometry.type)||Array.isArray(mesh.material)||mesh.material.transparent) continue;
      const key=`${Math.floor(mesh.position.x/14)},${Math.floor(mesh.position.z/14)}`;
      let lot=lots.get(key);if(!lot){lot=new StaticBatch({name:'amazonia-estatica'});lots.set(key,lot);}
      mesh.updateMatrixWorld(true);
      lot.add(mesh.geometry,mesh.matrixWorld,mesh.material,{cast:mesh.castShadow,receive:mesh.receiveShadow});
      root.remove(mesh);
    }
    for(const lot of lots.values()) lot.build(root);
  }

  /* ── VIDA: capivaras passeando na margem, galinha no quintal da palafita,
     papagaio de poleiro na barraca do market, rato e pomba na madeireira. */
  const ambience = createFavelaAmbience(root, {
    map: 'amazonia', low: LOWQ,
    /* posições fora dos AABBs das bancadas/pilhas e DENTRO do retângulo do galpão
       (AR3): o retângulo é peneira da mata interior — pombo ali nunca acorda em tronco. */
    rats: [
      { pos: [-27.5, 0, -4.8], to: [-26.5, 0, -5.6], phase: 0.3 },
      { pos: [-19.5, 0, -3.4], to: [-18.5, 0, -2.6], phase: 1.8 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-23.9, 0, -5.4], phase: 0.9 },
      { mode: 'ground', pos: [-29.2, 0, -5.6], phase: 2.1 },
    ],
    chickens: [],
    parrots: [
      { pos: [5.6, 2.62, 0.4], phase: 0.6 },      // poleiro do market
      { pos: [14.1, 0.95, 18.35], phase: 2.4 },   // caixa d'água (21,17)
      { pos: [-7.1, 0.62, -23.35], phase: 3.1 },
    ],
    dogs: [{ pos: [-12.6, 0, -17.8], to: [-11.2, 0, -16.9], phase: 0.7 }],
    /* elenco da mata (PR #439): 9 espécies Mint com vida no ambientlife.js; posições
       fora de AABB de colisor (AR3) — caixa d'água, poste, beiral e tronco por altura. */
    botos: [{ pos: [2.5, -0.38, -12], to: [2.5, -0.38, 14], phase: 0.4, mode: 'swim' }],
    piranhas: Array.from({ length: 7 }, (_, i) => (
      { pos: [-4, RIO_AGUA - 0.24, -20.5], radius: [1.2 + (i % 3) * 0.35, 1], phase: i * 0.87 }
    )),
    araras: [
      { pos: [4.77, 2.5, 0.6], phase: Math.PI },          // poste da barraca do MID
      { pos: [7.38, 2.5, -12.63], phase: Math.PI - 0.5 }, // poste do pontão sul
    ],
    tucanos: [
      { pos: [-7.1, 0.58, 4.65], phase: 0 },              // caixa d'água da cabeceira oeste (F)
      { pos: [20.1, 0.92, 8.35], phase: Math.PI },        // caixa d'água da palafita (27, 7)
    ],
    preguicas: [{ pos: [16.2, 6.2, -7.4], phase: 0 }],    // beiral da palafita C (14, -9)
    macacos: [
      { pos: [MX + 0.5, 6.05, 3.5], to: [MX + 7, 6.05, 3.5], phase: 0.8 },        // cumeeira do galpão
      { pos: [MX - 1.5, 0.95, -1.6], to: [MX + 3.4, 0.95, 1.8], phase: 2.2 },   // bancadas do serrado
    ],
    oncas: [{ pos: [11.5, 0.86, -31.5], phase: 2.4 }],    // tronco caído da margem leste
    antas: [
      { pos: [-25.5, 0, -31.5], to: [-25, 0, -16], phase: 0.5 },
      { pos: [26, 0, 12], to: [27, 0, 16], phase: 2.8 },
    ],
    carcaras: [{ pos: [-20.5, 0, -6.8], to: [-19.8, 0, -6.2], phase: 1.9 }],
  });

  /* ── CHÃO MULTINÍVEL (idioma da mansão): chãoBase = pontões/pontes/igarapé; a madeira
     da palafita entra por CIMA quando o pé de quem pergunta já está na altura dela. */
  function chaoBase(x, z) {
    // A malha agrupada usa Float32; a borda pode passar o bound duplo por ~2e-7m.
    const edgeEpsilon = 1e-6;
    for (const p of pontoes) if (x >= p.x0-edgeEpsilon && x <= p.x1+edgeEpsilon && z >= p.z0-edgeEpsilon && z <= p.z1+edgeEpsilon) return PONTAO_Y;
    for (const pz of [0, -24, 24]) if (Math.abs(z - pz) < (pz === 0 ? PONTE_W : 2.6) / 2 && Math.abs(x) <= RIO_MEIA_LARGURA + 1.75) return PONTE_Y;
    const ax = Math.abs(x);
    if (ax > RIO_MEIA_LARGURA) return 0;
    if (ax <= RIO_CAMPO) return RIO_FUNDO;
    return margemY(x);
  }
  function madeiraAt(x, z) {
    const cabinFloor=CS.floorAt(x,z);if(cabinFloor!==null)return cabinFloor;
    for (const st of ESTACOES) {
      const rx = x - st.x, rz = z - st.z;
      const u = rx * st.d[0] + rz * st.d[1], v = rx * st.p[0] + rz * st.p[1];
      if (!((st.x===14&&st.z===-9)||(st.x===-14&&st.z===6))) {
        const sign=st.x>0?1:-1,lx=rx*sign,lz=rz*sign;
        if(lz>=-.1&&lz<=1.5) {
          if(lx>=.06&&lx<=1.2) return 3.85;
          if(lx>=-3.3&&lx<.06) return DECK_Y+(3.85-DECK_Y)*Math.min(12,Math.floor((lx+3.3)/.28)+1)/12;
        }
      }
      if (u >= CASA_A && u <= CASA_A + 2 * PAT_A && Math.abs(v) <= PAT_A) return DECK_Y;
      if (st.escada && v * st.e > 0 && Math.abs(v) >= PAT_A && Math.abs(v) <= PAT_A + st.escada.run
        && u >= 3.6 && u <= 5.2) {
        const i = Math.min(st.escada.n - 1, Math.floor((Math.abs(v) - PAT_A) / ESC_PISO));
        return st.escada.g0 + st.escada.esp * (st.escada.n - i);
      }
    }
    if (Math.abs(x - PLATA_M.x) <= 1.6 && Math.abs(z - PLATA_M.z) <= 1.6) return DECK_Y;
    for (const p of PONTES_ALTA) {
      const dx = p.bx - p.ax, dz = p.bz - p.az, L2 = dx * dx + dz * dz;
      let t = L2 ? ((x - p.ax) * dx + (z - p.az) * dz) / L2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = p.ax + dx * t - x, qz = p.az + dz * t - z;
      if (qx * qx + qz * qz <= 1.21) return DECK_Y;
    }
    return null;
  }
  function groundHeightAt(x, z, yRef) {
    const m = madeiraAt(x, z);
    if (m === null) return chaoBase(x, z);
    if (yRef === undefined || yRef >= m - 0.35) return m;   // na madeira: a um degrau da superfície dela
    return chaoBase(x, z);
  }
  const naMadeiraAlta = (x, z) => PONTES_ALTA.some((p) => {
    const dx = p.bx - p.ax, dz = p.bz - p.az, L2 = dx * dx + dz * dz;
    let t = L2 ? ((x - p.ax) * dx + (z - p.az) * dz) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return (p.ax + dx * t - x) ** 2 + (p.az + dz * t - z) ** 2 <= 2.9;
  });
  const waterAt = (x, z) => !naMadeiraAlta(x, z) && Math.abs(x) < aguaMeiaLargura && Math.abs(z) < HALF_Z - 2
    && ![0, -24, 24].some((pz) => Math.abs(z - pz) < (pz === 0 ? PONTE_W : 2.6) / 2 + 0.4);

  const slowAt = (x,z) => QP.get('amzwaterslow') === '1' && waterAt(x,z);
  const footstepSurfaceAt = (x,z) => waterAt(x,z) ? 'water' : undefined;
  const quintal = new THREE.Group(); quintal.name='galinha-e-pintinhos'; root.add(quintal);
  const hen=placeProp('galinha_mint_amazonia',{x:19.4,z:12.1,y:0,targetH:.55,ry:.5});
  if(hen) quintal.add(hen);
  for(const [x,z,ry] of [[18.9,12.45,.3],[19.5,12.85,-.6],[20,12.3,-1.2]]){
    const chick=placeProp('pintinho_mint_amazonia',{x,z,y:0,targetH:.17,ry});
    if(chick) quintal.add(chick);
  }
  quintal.traverse(o=>{if(o.isMesh){o.castShadow=!LOWQ;o.userData.nonSolidSurface=true;}});
  const faunaMotion=createAmazoniaFaunaMotion({ambience,quintal,jacare,capivaras:[capivara,capivara2]});
  const peixesSaltando=[];
  for(const [x,z,phase] of (LOWQ ? [[-3.4,19,.3]] : [[-3.4,19,.3],[4,-16,3.7]])){
    const fish=placeFauna('piranha',{targetLen:.38});
    if(!fish) continue;
    const pivot=new THREE.Group();pivot.name='peixe-saltando';pivot.add(fish);root.add(pivot);
    fish.traverse(o=>{if(o.isMesh)o.castShadow=false;});
    peixesSaltando.push({root:pivot,x,z,phase});
  }
  function updatePeixes(time){
    for(const f of peixesSaltando){
      const t=((time+f.phase)%8)/1.05, airborne=t<1;
      f.root.visible=airborne;
      if(!airborne) continue;
      f.root.position.set(f.x+(t-.5)*1.2,RIO_AGUA-.16+Math.sin(t*Math.PI)*.85,f.z);
      f.root.rotation.z=Math.atan2(.85*Math.PI*Math.cos(t*Math.PI),1.2);
    }
  }

  // Rabeta ao fundo: a elipse inteira fica além de HALF_Z, sobre a água existente.
  // Sem colisor móvel/rota de bot: é navegação de paisagem, fora das travessias.
  const barco = new THREE.Group(); barco.name = 'rabeta-navegando';
  const rabetaModel = QP.get('amzlife') !== '0' && placeProp('canoa_rabeta_amazonia', {targetH:.8,ry:1.04,y:-.025});
  if (rabetaModel) {
    rabetaModel.traverse(o => {if(o.isMesh){o.castShadow=false;o.userData.nonSolidSurface=true;}});
    barco.add(rabetaModel); root.add(barco);
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(.11,2.5),new THREE.MeshBasicMaterial({color:0x92937c,transparent:true,opacity:.2,depthWrite:false}));
    wake.rotation.x=-Math.PI/2;wake.position.set(0,.015,-2.6);wake.userData.nonSolidSurface=true;
    barco.add(wake);
  }
  let lifeTime = 0;
  const updateBarco = time => {
    const a = time * .09;
    barco.position.set(Math.cos(a)*5,RIO_AGUA+Math.sin(time*1.7)*.012,50+Math.sin(a)*2.4);
    barco.rotation.y = Math.atan2(-5*Math.sin(a),2.4*Math.cos(a));
  };
  updateBarco(0);
  const skyLife = createSkyLife(root, {map:'amazonia', low:LOWQ,
    birds: QP.get('amzlife') === '0' ? [] : [
      {center:[-12,18,-12],radius:12,speed:.16,phase:.3,subida:1.2},
      {center:[-12,18.6,-12],radius:13,speed:.16,phase:.43,subida:1.2},
      {center:[14,20,20],radius:11,speed:.14,phase:2.1,subida:1.4},
      {center:[14,20.5,20],radius:12,speed:.14,phase:2.26,subida:1.4},
    ]});
  // O Game já encerra ambience; cancela também a montagem assíncrona das aves.
  const disposeAmbience = ambience.dispose.bind(ambience);
  ambience.dispose = () => { skyLife._disposed = true; faunaMotion.dispose(); disposeAmbience(); };
  return {
    // Contrato: grafo com camadas, consultas de piso/nó com yRef e curvas precisas no CTF.
    botLayeredNavigation: true,
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, footstepSurfaceAt,     spawns: {
      /* 0,4 m além da face da mata girada: o AABB conservador da copa com yaw
         projeta a quina ~0,5 m para dentro da caixa e a folga do MAP2B mede
         contra o AABB, não contra a malha. */
      E: SPAWN_E.map(([x, z]) => ({ x, z, yaw: 0.6 })),
      B: SPAWN_B.map(([x, z]) => ({ x, z, yaw: Math.PI - 0.6 })),
    },
    ctfPoints: CTF_PTS,
    pickups, sun, hemi, ambience, skyLife, barco, quintal, peixesSaltando, canoasAmarradas, jacare, cabins:CS.cabins, faunaMotion, foliageClearance,
    amazonia: {
      deckY: DECK_Y,
      estacoes: ESTACOES.map(({ x, z, d, p, e, rede, escada }) => ({
        x, z, rede, temEscada: !!escada,
        varanda: !((x===14&&z===-9)||(x===-14&&z===6)) ? {y:3.85,from:[x+(x>0?1:-1)*-3.3,DECK_Y,z+(x>0?1:-1)*.7],to:[x+(x>0?1:-1)*.6,3.85,z+(x>0?1:-1)*.7]} : null,
        peEscada: escada ? { x:x+d[0]*4.4+p[0]*e*(PAT_A+escada.run+.3), z:z+d[1]*4.4+p[1]*e*(PAT_A+escada.run+.3) } : null,
        patamar: { x: x + d[0] * (CASA_A + PAT_A), z: z + d[1] * (CASA_A + PAT_A) },
      })),
      pontes: PONTES_ALTA,
      rotaLateralB: { nodes: rotaLateralBNodos, links: rotaLateralBLigacoes },
      perimetro: { arvores: MATA_ARVORES, palmeiras: MATA_PALMEIRAS, fundo: MATA_FUNDO },
      interior: { arvores: MATA_INTERIOR, palmeiras: BABACU_INTERIOR, subbosque: BABACU_INTERIOR.length + GRAMA_INTERIOR.length },
    },
    sound: {
      loops: [
        { src: AMB_LOOPS.corrego, pos: [0, 0.3, -22], radius: 26, vol: 0.38 },
        { src: AMB_LOOPS.corrego, pos: [0, 0.3, 22], radius: 26, vol: 0.38 },
        { src: AMB_LOOPS.passaros, pos: [0, 5, 0], radius: 85, vol: 0.3 },
        { src: AMB_LOOPS.grilos, pos: [0, 3, 0], radius: 85, vol: 0.14 },
      ],
      bioma: 'campo',
    },
    update(dt, time) { lifeTime = Number.isFinite(time) ? time : lifeTime + dt; agua.update(dt); skyLife.update(dt, lifeTime); updateBarco(lifeTime); updatePeixes(lifeTime); faunaMotion.update(lifeTime); },
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.8, maxX: HALF_X - 0.8, minZ: -HALF_Z + 0.8, maxZ: HALF_Z - 0.8 },
  };
}
