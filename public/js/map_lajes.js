// LAJES (lajes) — spec plans/10-LAJES.md: lajes em cima, becos embaixo; a luta é pela VERTICAL.
// Multinível como no havan: prédio SÓLIDO com topo andável; groundHeightAt dá 3,5 sobre prédio e 0 no beco.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { GRAFITE } from './graffiti_layout.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { makeHorizon, horizonTerrainHeight } from './horizon.js';
import { loadShell } from './shell.js';
import { createFavelaAmbience, FAVELA_AMBIENCE_ASSETS } from './ambientlife.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 22, HALF_Z = 38;
export const LAJES_AMBIENCE = FAVELA_AMBIENCE_ASSETS;
const LAJE_H = 3.5;     // altura da laje (topo do prédio)
const HERO_BLOCOS_SEM_FRISO = true;
const ENTORNO_EM_TERRENO_CONTINUO = true;

// parâmetros de escada (NBR 9077)
const ESC = { espelho: 0.17, piso: 0.29 };
const N_STAIR = Math.round(LAJE_H / ESC.espelho);  // ~21 degraus
/* Espelho EFETIVO: 21 × 0,17 = 3,57 ≠ 3,5 — com o espelho nominal o último degrau
   nasce 7 cm acima da laje e a rampa andável diverge do degrau (MAP3). */
const ESP = LAJE_H / N_STAIR;
const STAIR_RUN = N_STAIR * ESC.piso;               // ~6,1 m

function setLajesSky(scene) {
  if (typeof document === 'undefined') {
    scene.background = new THREE.Color(0xb9c6d2);
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 2; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#a9c4d7');
  gradient.addColorStop(0.55, '#bccbd0');
  gradient.addColorStop(1, '#d0c6b1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  scene.background = texture;
}

// folha-person-01.png lia como pessoa real nas capturas (veto editorial); a troca é
// nominal, preserva as vagas assadas e deixa o gerador reexecutável sem reintroduzi-la.
export const LAJES_ARTE_SUBSTITUICOES = Object.freeze({
  'folha-person-01.png': 'or-mitico-mural.png',
  'personagens-graffiti-01.png': 'or-mitico-mural.png',
  'folha-person-02.png': 'or-mitico-mural.png',
  // grafite ÚNICO do mapa (dono, 15/08: "grafites repetidos em todos os mapas") —
  // o compartilhado sai, entra o pixo gerado sob medida. Prova de estilo; batch depois.
  'folha-pixaca-02.png': 'pixo-lajes-01.png',
});
for (const [antes, depois] of Object.entries(LAJES_ARTE_SUBSTITUICOES)) {
  const arquivos = GRAFITE?.lajes?.arquivos || [];
  for (let i = 0; i < arquivos.length; i++) if (arquivos[i] === antes) arquivos[i] = depois;
}

// grid de prédios: cada entrada = { x, z, w, d, h } — footprint + altura
export const EDIFICIOS = [];
function predio(x, z, w, d, h = LAJE_H) { EDIFICIOS.push({ x, z, w, d, h }); }
export const NOMES_LAJE = Object.freeze(['NW', 'CN', 'NE', 'SW', 'CS', 'SE', 'WN', 'EN', 'WS', 'ES', 'MN', 'MS', 'MEIO']);

/* MASSA DE FAVELA, não grade de caixas (veto do dono): vãos apertados e ANEXOS
   beliscando os vãos quebram a silhueta — é o engatilhado que lê como morro. */
// FILEIRA NORTE (lajes onde o spawn A nasce):
predio(-13.75, -22, 8.5, 18, LAJE_H);
predio(0, -22, 13.5, 18, LAJE_H + 1.5);
predio(13.75, -22, 8.5, 18, LAJE_H);
// FILEIRA SUL (lajes):
predio(-13.75, 20, 8.5, 14, LAJE_H);
predio(0, 20, 8.5, 14, LAJE_H);
predio(13.75, 20, 8.5, 14, LAJE_H);
// Fileiras intermediárias (mais fundas — beco central de 5 m):
predio(-13.75, -7.25, 8.5, 9.5, LAJE_H);
predio(13.75, -7.25, 8.5, 9.5, LAJE_H);
predio(-13.75, 7.25, 8.5, 9.5, LAJE_H);
predio(13.75, 7.25, 8.5, 9.5, LAJE_H);
// Um zigue-zague central liga norte e sul sem transformar o piso baixo num corredor reto.
predio(-5.1, -7.25, 3.3, 9.5, LAJE_H);
predio(5.1, 7.25, 3.3, 9.5, LAJE_H);
// ilha no beco central (cover)
predio(0, 0, 3, 3, LAJE_H);

/* Puxadinhos: volumes mais baixos (2,3–2,9 m) encostados nas faces de vão e beco.
   Andáveis (entram em footprints) — da laje principal se desce neles, e o mantle
   devolve. É onde o vão aperta de verdade e onde a caixa morre. */
export const ANEXOS = [
  { x: -8.8, z: -24.75, w: 1.4, d: 4.5, h: 2.8 },
  { x: 7.5, z: -17, w: 1.5, d: 4, h: 2.6 },
  { x: 8.9, z: -27, w: 1.2, d: 4, h: 2.9 },
  { x: -8.85, z: -8.25, w: 1.3, d: 3.5, h: 2.7 },
  { x: -8.9, z: 19.5, w: 1.2, d: 5, h: 2.5 },
  { x: 8.85, z: 17, w: 1.3, d: 4, h: 2.8 },
  { x: 8.8, z: 7, w: 1.4, d: 4, h: 2.4 },
  { x: -4.95, z: 18, w: 1.4, d: 4, h: 2.6 },
  { x: 18.65, z: -8, w: 1.3, d: 4, h: 2.5 },
  { x: 5, z: 1.9, w: 2, d: 1.2, h: 2.3 },
];

const FIADAS_TIJOLO_HEROI = Object.freeze([
  [-2, 2], [-3, 2], [-3, 3], [-3, 3], [-3, 2], [-2, 3], [-2, 2], [-1, 2],
]);
export const TIJOLOS_HEROI = Object.freeze(FIADAS_TIJOLO_HEROI.flatMap(([inicio, fim], linha) =>
  Array.from({ length: fim - inicio + 1 }, (_, i) => Object.freeze([linha, inicio + i]))));
export const ROTA_S_NORTE = Object.freeze([
  [20, -34.0], [13, -36.7], [8.8, -36.8], [1.2, -35.2],
  [-3.8, -32.1], [-9.2, -32.0], [-14.5, -34.0], [-20, -34.0],
].map((p) => Object.freeze(p)));

export const ENTORNO_HABITADO = Object.freeze([
  { lado:'oeste', profundidade:1, x:-24.75,z:-34.0,w:4.8,d:6.0,h:3.4,base:.75,mi:0,ry:-.05,sobrado:true,tijolo:true },
  { lado:'oeste', profundidade:1, x:-24.95,z:-24.8,w:5.2,d:6.4,h:2.9,base:1.05,mi:2,ry:.07 },
  { lado:'oeste', profundidade:1, x:-24.65,z:-15.2,w:4.6,d:5.8,h:3.7,base:1.35,mi:1,ry:-.09,sobrado:true },
  { lado:'oeste', profundidade:1, x:-25.05,z:-5.5,w:5.4,d:6.2,h:3.1,base:.95,mi:3,ry:.05 },
  { lado:'oeste', profundidade:1, x:-24.75,z:5.0,w:4.8,d:6.6,h:3.5,base:1.25,mi:0,ry:.08 },
  { lado:'oeste', profundidade:1, x:-25.0,z:15.4,w:5.3,d:6.0,h:2.8,base:.85,mi:2,ry:-.06,sobrado:true,tijolo:true },
  { lado:'oeste', profundidade:1, x:-24.7,z:25.5,w:4.7,d:6.4,h:3.8,base:1.15,mi:1,ry:.09 },
  { lado:'oeste', profundidade:1, x:-24.95,z:34.0,w:5.2,d:5.2,h:3.2,base:.70,mi:3,ry:-.08 },
  { lado:'oeste', profundidade:2, x:-28.9,z:-29.0,w:5.4,d:7.0,h:3.9,base:1.75,mi:1,ry:.12,sobrado:true },
  { lado:'oeste', profundidade:2, x:-29.5,z:-11.0,w:6.0,d:7.2,h:3.1,base:2.05,mi:3,ry:-.11 },
  { lado:'oeste', profundidade:2, x:-28.6,z:8.5,w:5.2,d:6.8,h:3.6,base:1.55,mi:0,ry:.14 },
  { lado:'oeste', profundidade:2, x:-29.4,z:28.0,w:6.2,d:7.0,h:3.3,base:2.20,mi:2,ry:-.13,sobrado:true,tijolo:true },
  { lado:'oeste', profundidade:3, x:-32.5,z:-41.0,w:6.6,d:7.4,h:4.5,base:2.45,mi:1,ry:.17,sobrado:true,tijolo:true },
  { lado:'oeste', profundidade:3, x:-31.8,z:42.0,w:6.2,d:7.0,h:4.1,base:2.15,mi:3,ry:-.18,sobrado:true },

  { lado:'leste', profundidade:1, x:24.85,z:-33.0,w:5.0,d:6.2,h:3.0,base:1.10,mi:3,ry:.08 },
  { lado:'leste', profundidade:1, x:24.7,z:-23.0,w:4.7,d:6.4,h:3.7,base:.80,mi:1,ry:-.06,sobrado:true,tijolo:true },
  { lado:'leste', profundidade:1, x:25.1,z:-12.5,w:5.5,d:6.8,h:3.2,base:1.35,mi:0,ry:.10 },
  { lado:'leste', profundidade:1, x:24.75,z:-1.5,w:4.8,d:6.3,h:3.6,base:1.00,mi:2,ry:-.08 },
  { lado:'leste', profundidade:1, x:24.95,z:9.0,w:5.2,d:6.5,h:2.9,base:1.45,mi:3,ry:.06,sobrado:true },
  { lado:'leste', profundidade:1, x:24.65,z:19.5,w:4.6,d:6.0,h:3.8,base:.90,mi:1,ry:-.10,tijolo:true },
  { lado:'leste', profundidade:1, x:25.0,z:29.5,w:5.3,d:6.5,h:3.3,base:1.20,mi:0,ry:.07 },
  { lado:'leste', profundidade:1, x:24.75,z:36.0,w:4.8,d:4.8,h:2.8,base:.75,mi:2,ry:-.05 },
  { lado:'leste', profundidade:2, x:29.2,z:-28.0,w:5.8,d:7.2,h:3.5,base:2.10,mi:2,ry:-.14,sobrado:true },
  { lado:'leste', profundidade:2, x:29.8,z:-9.0,w:6.2,d:7.0,h:3.9,base:1.65,mi:0,ry:.12 },
  { lado:'leste', profundidade:2, x:28.8,z:11.0,w:5.4,d:7.4,h:3.0,base:2.30,mi:3,ry:-.13 },
  { lado:'leste', profundidade:2, x:29.6,z:29.0,w:6.0,d:7.0,h:3.7,base:1.80,mi:1,ry:.15,sobrado:true,tijolo:true },
  { lado:'leste', profundidade:3, x:32.2,z:-41.5,w:6.4,d:7.2,h:4.2,base:2.30,mi:2,ry:-.16,sobrado:true },
  { lado:'leste', profundidade:3, x:31.8,z:42.0,w:6.8,d:7.5,h:4.7,base:2.65,mi:0,ry:.19,sobrado:true,tijolo:true },

  { lado:'norte', profundidade:1, x:-18.5,z:-40.5,w:5.8,d:5.4,h:3.5,base:.90,mi:1,ry:-.08,tijolo:true },
  { lado:'norte', profundidade:1, x:-11.0,z:-40.8,w:5.4,d:5.8,h:3.0,base:1.25,mi:3,ry:.06,sobrado:true },
  { lado:'norte', profundidade:1, x:-3.7,z:-40.4,w:5.8,d:5.2,h:3.8,base:.75,mi:0,ry:.10 },
  { lado:'norte', profundidade:1, x:4.0,z:-40.9,w:5.6,d:6.0,h:3.2,base:1.45,mi:2,ry:-.07 },
  { lado:'norte', profundidade:1, x:11.5,z:-40.3,w:5.5,d:5.4,h:3.6,base:1.05,mi:1,ry:.09,sobrado:true,tijolo:true },
  { lado:'norte', profundidade:1, x:18.2,z:-40.7,w:5.0,d:5.8,h:2.9,base:.85,mi:3,ry:-.05 },
  { lado:'norte', profundidade:2, x:-15.0,z:-46.5,w:6.0,d:5.8,h:3.9,base:1.85,mi:2,ry:.13,sobrado:true },
  { lado:'norte', profundidade:2, x:-6.5,z:-46.8,w:6.2,d:6.2,h:3.1,base:2.20,mi:0,ry:-.12 },
  { lado:'norte', profundidade:2, x:3.0,z:-46.2,w:6.5,d:5.6,h:3.7,base:1.65,mi:3,ry:.14 },
  { lado:'norte', profundidade:2, x:13.0,z:-46.9,w:6.0,d:6.0,h:3.4,base:2.35,mi:1,ry:-.15,sobrado:true,tijolo:true },
  { lado:'norte', profundidade:3, x:-20.0,z:-50.5,w:6.8,d:6.4,h:4.6,base:2.55,mi:2,ry:.18,sobrado:true,tijolo:true },
  { lado:'norte', profundidade:3, x:19.0,z:-51.0,w:6.2,d:6.8,h:4.0,base:2.25,mi:0,ry:-.17,sobrado:true },

  { lado:'sul', profundidade:1, x:-18.0,z:40.5,w:5.4,d:5.4,h:3.1,base:.80,mi:2,ry:.07 },
  { lado:'sul', profundidade:1, x:-10.5,z:40.9,w:5.8,d:5.8,h:3.8,base:1.20,mi:0,ry:-.09,sobrado:true,tijolo:true },
  { lado:'sul', profundidade:1, x:-2.5,z:40.4,w:6.0,d:5.2,h:3.3,base:.95,mi:3,ry:.05 },
  { lado:'sul', profundidade:1, x:5.5,z:40.8,w:5.6,d:6.0,h:3.6,base:1.40,mi:1,ry:-.08 },
  { lado:'sul', profundidade:1, x:13.0,z:40.3,w:5.5,d:5.5,h:2.9,base:.75,mi:2,ry:.10,sobrado:true,tijolo:true },
  { lado:'sul', profundidade:1, x:19.0,z:40.7,w:4.8,d:5.8,h:3.7,base:1.05,mi:0,ry:-.06 },
  { lado:'sul', profundidade:2, x:-14.0,z:46.5,w:6.2,d:5.8,h:3.4,base:1.90,mi:1,ry:-.13 },
  { lado:'sul', profundidade:2, x:-5.0,z:46.9,w:6.0,d:6.2,h:3.9,base:2.25,mi:3,ry:.14,sobrado:true,tijolo:true },
  { lado:'sul', profundidade:2, x:4.5,z:46.3,w:6.4,d:5.8,h:3.0,base:1.60,mi:0,ry:-.12 },
  { lado:'sul', profundidade:2, x:14.0,z:46.8,w:6.2,d:6.0,h:3.6,base:2.10,mi:2,ry:.15,sobrado:true },
  { lado:'sul', profundidade:3, x:-19.0,z:50.5,w:6.5,d:6.6,h:4.3,base:2.40,mi:1,ry:-.19,sobrado:true },
  { lado:'sul', profundidade:3, x:18.5,z:51.0,w:6.9,d:6.2,h:4.5,base:2.70,mi:3,ry:.16,sobrado:true,tijolo:true },
]);
export const TERRACOS_ENTORNO = Object.freeze([
  Object.freeze({ lado: 'oeste', x: -30.5, z: 0, w: 17.3, d: 76.3 }),
  Object.freeze({ lado: 'leste', x: 30.5, z: 0, w: 17.3, d: 76.3 }),
  Object.freeze({ lado: 'norte', x: 0, z: -48, w: 78.3, d: 20.3 }),
  Object.freeze({ lado: 'sul', x: 0, z: 48, w: 78.3, d: 20.3 }),
]);

export const LAJES_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas'];

export function buildLajes(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);

  const lam = (o) => new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...o });
  const MAT = {
    asphalt: lam({ map: T.asphalt }), concrete: lam({ map: T.concrete }),
    concreteDark: lam({ map: T.concreteDark }), dirt: lam({ map: T.dirt }),
    grass: lam({ map: T.grass }), wall: lam({ map: T.concrete }),
    zinc: lam({ color: 0x8c8f8b, metalness: 0.08, roughness: 0.86, emissive: 0x181a1a, emissiveIntensity: 0.24 }),
    route: lam({ color: 0xe0b52e, emissive: 0x6b4300, emissiveIntensity: .42, roughness: .72 }),
  };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 3, ry = 3) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    };
    const pbr = (nome, rx, ry, extra = {}) => {
      const map = load(`/img/textures/pbr_${nome}_color.webp`, rx, ry);
      const normalMap = load(`/img/textures/pbr_${nome}_normal.webp`, rx, ry);
      const roughnessMap = load(`/img/textures/pbr_${nome}_rough.webp`, rx, ry);
      normalMap.colorSpace = roughnessMap.colorSpace = THREE.NoColorSpace;
      return lam({ map, normalMap, roughnessMap, ...extra });
    };
    /* Bloco cerâmico brasileiro autoral: o Bricks051 era tijolo inglês limpo e,
       mesmo em remendo, lia como ladrilho rosa. A altura deriva do próprio albedo
       e faz junta, friso e cavidade reagirem à luz sem fingir parede inteira crua. */
    const blocoMap = load('/img/textures/lajes_tijolo_baiano_color.webp', 0.68, 0.68);
    const blocoNormal = load('/img/textures/lajes_tijolo_baiano_normal.webp', 0.68, 0.68);
    blocoNormal.colorSpace = THREE.NoColorSpace;
    MAT.brickDetail = lam({ map: blocoMap, normalMap: blocoNormal,
      normalScale: new THREE.Vector2(0.72, 0.72), roughness: 0.98 });
    MAT.pbrTijolo = MAT.brickDetail;
    /* A/B `?kit=pbr` (14/08): troca os 6 materiais-base pelo kit CC0 ambientCG com
       normal/rough de verdade (normalGL). Nasce como experimento de calibração —
       se o dono aprovar nas capturas, vira o padrão e o canvas sai. */
    if (QP.get('kit') === 'pbr') {
      MAT.wall = pbr('paintedplaster017', 3, 4, { roughness: 0.98 });
      MAT.concrete = pbr('concrete046', 4, 7, { roughness: 0.94 });
      MAT.concreteDark = pbr('concrete046', 3, 5, { color: 0x938b7f, roughness: 0.98 });
      MAT.dirt = pbr('ground054', 5, 9, { roughness: 1 });
      MAT.asphalt = pbr('asphalt033', 5, 9, { roughness: 0.96 });
      MAT.zinc = pbr('corrugatedsteel009', 3, 3, { metalness: 0.08, roughness: 0.86,
        emissive: 0x181a1a, emissiveIntensity: 0.24 });
    }
    const mural = load('/img/textures/lajes_streetart_mural.webp', 1, 1);
    mural.wrapS = mural.wrapT = THREE.ClampToEdgeWrapping;
    mural.colorSpace = THREE.SRGBColorSpace; mural.wrapS = mural.wrapT = THREE.ClampToEdgeWrapping;
    MAT.mural = lam({ map: mural, roughness: 1 });
  } else MAT.mural = MAT.concrete;

  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(m);
    }
    return m;
  }
  function escora(ax, ay, az, bx, by, bz, mat) {
    const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
    const dir = b.clone().sub(a), len = dir.length();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.075, len, 0.075), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    m.castShadow = true; m.receiveShadow = true; m.name = 'mao_francesa'; root.add(m);
    return m;
  }
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  const cascaBase = (m) => { m.userData.lajesVisualBase = true; return m; };
  const rooftopDetail = (obj, kind) => { obj.userData.rooftopDetail = kind; return obj; };
  // O GLB troca somente a imagem: o proxy procedural continua sendo colisão, occluder e fallback em node.
  function glbSobre(proxy, id, x, y, z, targetH, ry = 0) {
    if (!hasProp(id)) return;
    const o = placeProp(id, { x, y, z, targetH, ry });
    if (o) { proxy.visible = false; root.add(o); }
  }

  // ---- textura de parede ----
  function paredeTex(pint, crua, seed) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = pint; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 5; i++) {
      if (rnd() > crua) continue;
      const px = rnd() * S, py = rnd() * S, w = 40 + rnd() * 90, h = 30 + rnd() * 80;
      x.save(); x.beginPath();
      for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283, r = 0.5 + rnd() * 0.6; const fx = px + Math.cos(a) * w * r, fy = py + Math.sin(a) * h * r; k ? x.lineTo(fx, fy) : x.moveTo(fx, fy); }
      x.closePath(); x.clip();
      x.fillStyle = '#8d8377'; x.fillRect(px - w, py - h, w * 2, h * 2);
      for (let r2 = -3; r2 < 4; r2++) for (let k = -2; k < 3; k++) {
        const bx = px + k * 60 + (r2 % 2 ? 30 : 0), by = py + r2 * 30, v = rnd();
        x.fillStyle = `rgb(${146 + v * 44 | 0},${84 + v * 32 | 0},${56 + v * 24 | 0})`; x.fillRect(bx, by, 54, 24);
        x.fillStyle = 'rgba(40,26,20,0.5)'; for (let h2 = 0; h2 < 3; h2++) x.fillRect(bx + 6 + h2 * 15, by + 6, 9, 12);
      }
      x.restore();
    }
    for (let i = 0; i < 14; i++) { const px = rnd() * S; const g = x.createLinearGradient(0, 0, 0, 60 + rnd() * 150); g.addColorStop(0, 'rgba(48,44,38,0.42)'); g.addColorStop(1, 'rgba(48,44,38,0)'); x.fillStyle = g; x.fillRect(px, 0, 3 + rnd() * 8, 60 + rnd() * 150); }
    const g2 = x.createLinearGradient(0, S * 0.72, 0, S); g2.addColorStop(0, 'rgba(40,50,30,0)'); g2.addColorStop(1, 'rgba(40,50,30,0.25)'); x.fillStyle = g2; x.fillRect(0, S * 0.72, S, S * 0.28);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex });
  }
  // tijolo cru aparente, fileira desencontrada — paleta e sujeira das referências em references/mapas/world/
  function tijoloTex(seed) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = '#7d6f60'; x.fillRect(0, 0, S, S);
    for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) {
      const bx = k * 60 + (r % 2 ? 30 : 0), by = r * 32, v = rnd();
      x.fillStyle = `rgb(${128 + v * 42 | 0},${78 + v * 27 | 0},${56 + v * 20 | 0})`;
      x.fillRect(bx + 2, by + 2, 56, 28);
      x.fillStyle = 'rgba(42,28,22,0.52)';
      for (let f = 0; f < 3; f++) x.fillRect(bx + 8 + f * 15, by + 9, 8, 11);
    }
    for (let i = 0; i < 12; i++) { const px = rnd() * S; const g = x.createLinearGradient(0, 0, 0, 60 + rnd() * 150); g.addColorStop(0, 'rgba(44,40,34,0.4)'); g.addColorStop(1, 'rgba(44,40,34,0)'); x.fillStyle = g; x.fillRect(px, 0, 3 + rnd() * 8, 60 + rnd() * 150); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 3);
    return lam({ map: tex, roughness: 1 });
  }
  const paredeCanonica = lam({ color: 0x887965, roughness: 0.94 });
  const PAREDES = Array(8).fill(paredeCanonica);

  const PB = new PropBatch({ bucket: 24 });

  /* ===================== CÉU / LUZ ===================== */
  setLajesSky(scene);
  makeHorizon(scene, { seed: 11, chao: 0x7d7560, low: LOWQ });
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('lajes');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x6a5c4c, 1.18); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.75); sun.position.set(25, 45, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X - 5; sun.shadow.camera.right = HALF_X + 5;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO ===================== */
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, MAT.dirt, -0.01);
  // asfalto no beco central
  addFloor(HALF_X * 2, 20, 0, 0, MAT.asphalt, 0.01);

  /* ===================== PRÉDIOS (caixas sólidas + lajes no topo) ===================== */
  // tabela de footprints para groundHeightAt
  const footprints = [];
  for (let i = 0; i < EDIFICIOS.length; i++) {
    const e = EDIFICIOS[i];
    const mat = PAREDES[i % PAREDES.length];
    // caixa sólida do prédio (colisor + occluder)
    cascaBase(addBox(e.w, e.h, e.d, mat, e.x, 0, e.z));
    solids.push({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, z0: e.z - e.d / 2, z1: e.z + e.d / 2 });
    // laje no topo (piso andável)
    const roof = cascaBase(addFloor(e.w, e.d, e.x, e.z, MAT.concrete, e.h + 0.02));
    roof.userData.lajesRoof = NOMES_LAJE[i];
    // contrapiso da laje (para que a bala não atravesse). É ele quem aparece no frame
    // (cobre o addFloor texturizado), então leva a textura de concreto, não cor chapada.
    cascaBase(addBox(e.w, 0.12, e.d, MAT.concreteDark, e.x, e.h, e.z));
    footprints.push({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, z0: e.z - e.d / 2, z1: e.z + e.d / 2, h: e.h });
  }
  // anexos: mesma construção dos prédios, mas baixos — telhado deles é piso bônus
  ANEXOS.forEach((a, i) => {
    cascaBase(addBox(a.w, a.h, a.d, PAREDES[(i + 2) % PAREDES.length], a.x, 0, a.z));
    solids.push({ x0: a.x - a.w / 2, x1: a.x + a.w / 2, z0: a.z - a.d / 2, z1: a.z + a.d / 2 });
    cascaBase(addFloor(a.w, a.d, a.x, a.z, MAT.concrete, a.h + 0.02));
    cascaBase(addBox(a.w, 0.12, a.d, MAT.concreteDark, a.x, a.h, a.z));
    footprints.push({ x0: a.x - a.w / 2, x1: a.x + a.w / 2, z0: a.z - a.d / 2, z1: a.z + a.d / 2, h: a.h });
  });
  addBox(8.5, 4.2, 0.05, MAT.mural, 0, 0.65, -12.82, { collide: false, cast: false, skirt: false });
  addBox(6.2, 3.2, 0.05, MAT.mural, -14, 0.55, 12.82, { collide: false, cast: false, skirt: false });

  /* ===================== TÁBUAS ENTRE LAJES =====================
     Toda ligação é piso andável (bot não pula, é o caminho do A*); ripa lateral = guarda da MAP6. */
  function tabuaTex(seed, repX = 1) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    x.fillStyle = '#3d2e1f'; x.fillRect(0, 0, S, S);
    for (let r = 0; r < 6; r++) {
      const v = rnd();
      x.fillStyle = `rgb(${108 + v * 36 | 0},${78 + v * 26 | 0},${48 + v * 18 | 0})`;
      x.fillRect(0, r * 43 + 2, S, 39);
      x.fillStyle = 'rgba(28,18,10,0.5)';
      for (let k = 0; k < 5; k++) x.fillRect(rnd() * S, r * 43 + 4 + rnd() * 30, 20 + rnd() * 60, 2);
      x.fillRect(rnd() * S, r * 43 + 2, 3, 39);   // junta de topo: tábua não tem 4 m
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repX, 1);
    return lam({ map: tex, roughness: 0.9 });
  }
  const MADEIRA = tabuaTex(577);
  /* id = o par de lajes que a régua mede; plana: {x0,x1,z0,z1,h}; rampa: h→h1 ao longo de x */
  const TABUAS = [
    { id: 'NW-WN', x0: -14.3, x1: -13.2, z0: -13.4, z1: -11.6, h: LAJE_H },
    { id: 'WN-WS', x0: -14.3, x1: -13.2, z0: -3.4, z1: 3.4, h: LAJE_H, poste: true },
    { id: 'WS-SW', x0: -14.3, x1: -13.2, z0: 11.6, z1: 13.4, h: LAJE_H },
    { id: 'NE-EN', x0: 13.2, x1: 14.3, z0: -13.4, z1: -11.6, h: LAJE_H },
    { id: 'EN-ES', x0: 13.2, x1: 14.3, z0: -3.4, z1: 3.4, h: LAJE_H, poste: true },
    { id: 'ES-SE', x0: 13.2, x1: 14.3, z0: 11.6, z1: 13.4, h: LAJE_H },
    { id: 'SW-CS', x0: -9.9, x1: -3.85, z0: 15.5, z1: 16.6, h: LAJE_H },
    { id: 'CS-SE', x0: 3.85, x1: 9.9, z0: 15.5, z1: 16.6, h: LAJE_H },
    { id: 'NW-CN', x0: -9.9, x1: -6.35, z0: -22.75, z1: -21.25, h: LAJE_H, h1: LAJE_H + 1.7 },
    { id: 'CN-NE', x0: 6.35, x1: 9.9, z0: -22.75, z1: -21.25, h: LAJE_H + 1.7, h1: LAJE_H },
    { id: 'WN-MN', x0: -9.9, x1: -6.35, z0: -4.4, z1: -3.3, h: LAJE_H },
    { id: 'MS-ES', x0: 6.35, x1: 9.9, z0: 9.6, z1: 10.7, h: LAJE_H },
    { id: 'CS-MS', x0: 3.5, x1: 4.2, z0: 11.6, z1: 13.4, h: LAJE_H },
  ];
  for (const t of TABUAS) {
    const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
    const w = t.x1 - t.x0, d = t.z1 - t.z0;
    let deck;
    if (t.h1 === undefined) {
      deck = addBox(w, 0.08, d, MADEIRA, cx, t.h - 0.08, cz, { collide: false, skirt: false });
      /* guarda de 0,45 m: abaixo disso o corpo PISA por cima (o `_collide` ignora o que
         fecha abaixo de p.y + 0,3) e a MAP6 cobra a borda. Colide de propósito. */
      for (const sx of [-1, 1]) addBox(w > d ? w : 0.07, 0.45, w > d ? 0.07 : d, MADEIRA,
        cx + (w > d ? 0 : sx * (w / 2 - 0.035)), t.h, cz + (w > d ? sx * (d / 2 - 0.035) : 0), { skirt: false })
        .name = 'guarda_tabua';
    } else {
      const subida = t.h1 - t.h, L = Math.hypot(w, subida);
      /* repeat ao longo do comprimento: sem ele as 6 tábuas do canvas esticam em
         4,8 m e a rampa lê como chapa de compensado */
      const MADEIRA_RAMPA = tabuaTex(578, Math.max(1, Math.round(L / 1.4)));
      deck = addBox(L, 0.08, d, MADEIRA_RAMPA, cx, (t.h + t.h1) / 2 - 0.04, cz, { collide: false, skirt: false });
      deck.rotation.z = Math.asin(subida / L);
      /* guarda da rampa em 4 degraus axis-aligned (o colisor do jogo não gira em z) */
      for (let g = 0; g < 4; g++) {
        const gx = t.x0 + (g + 0.5) * w / 4, gy = t.h + (t.h1 - t.h) * (g + 0.5) / 4;
        for (const sz of [-1, 1]) addBox(w / 4, 0.45, 0.07, MADEIRA, gx, gy, cz + sz * (d / 2 - 0.035), { skirt: false })
          .name = 'guarda_tabua';
      }
    }
    deck.userData.lajesTabua = t.id;
    footprints.push({ x0: t.x0, x1: t.x1, z0: t.z0, z1: t.z1, h: t.h, h1: t.h1 });
    if (t.poste) addBox(0.14, t.h, 0.14, MADEIRA, cx, 0, cz, { skirt: true });
  }
  // Os oito pares de faixas amarelas de salto morreram com as ilhas: a rota agora é
  // madeira de verdade. As três linhas de rota do piso ficam — é tinta, não mecânica.
  for (const [x, nome] of [[-14, 'west'], [0, 'center'], [14, 'east']]) {
    const route = addBox(.18, .025, 8.5, MAT.route, x, LAJE_H + .125, 20, { collide: false, cast: false, skirt: false, vao: false });
    route.userData.roofRoute = nome;
  }
  // Um volume/cor por ala é orientação de jogo; o proxy COLIDE (a pele cilíndrica, não).
  // O marco central fica na laje ALTA (5,0 m) — na cota das outras nascia enterrado no prédio.
  for (const [x, cor, nome, h, yBase, mz] of [[-13.75,0x2f7394,'west',1.7,LAJE_H,-18],[-4.2,0xc36c35,'center',1.25,LAJE_H+1.5,-16.5],[13.75,0x4d8651,'east',2.05,LAJE_H,-18]]) {
    const mat = lam({ color:cor,roughness:.76 });
    const proxy = addBox(1.2,h,1.2,new THREE.MeshBasicMaterial({ visible: false }),x,yBase + .14,mz,
      { cast:false,skirt:false,vao:false });
    proxy.visible = false;
    const marco = new THREE.Mesh(new THREE.CylinderGeometry(.67,.63,h,16),mat);
    marco.position.set(x,yBase + .14 + h / 2,mz); marco.castShadow = true; marco.receiveShadow = true; root.add(marco);
    for (const dy of [-.34, .18, .70].filter((v) => v < h / 2 - .08)) {
      const aro = new THREE.Mesh(new THREE.TorusGeometry(.655,.025,6,16),mat);
      aro.rotation.x = Math.PI / 2; aro.position.set(x,marco.position.y + dy,mz); root.add(aro);
    }
    marco.userData.lajesWing = nome;
  }

  /* A massa jogável continua nos footprints acima. Esta segunda pele quebra
     as caixas em puxadinhos, portas e platibandas menores sem alterar colisão ou A*. */
  const tijolo = MAT.pbrTijolo || tijoloTex(913);
  const tijoloDetalhe = MAT.brickDetail || tijolo;
  const zinco = MAT.zinc;
  const porta = lam({ color: 0x365458, roughness: 0.82 });
  const janela = lam({ color: 0x354247, metalness: 0.12, roughness: 0.42 });
  const fachadas = [
    [-14, -12.91, 2.4, 0.16, 2.75, tijolo], [-10.8, -12.91, 1.5, 0.22, 2.15, PAREDES[3]],
    [-3.8, -12.91, 2.1, 0.18, 2.45, PAREDES[1]], [2.0, -12.91, 2.8, 0.2, 3.1, tijolo],
    [14, -12.91, 2.7, 0.16, 2.55, PAREDES[0]], [-14, 12.91, 2.3, 0.18, 2.6, PAREDES[2]],
    [-1.8, 12.91, 2.1, 0.16, 2.3, tijolo], [14, 12.91, 2.5, 0.18, 2.85, PAREDES[3]],
  ];
  for (const [x, z, w, d, h, mat] of fachadas)
    cascaBase(addBox(w, h, d, mat, x, 0.05, z, { collide: false, skirt: false }));
  for (const [x, z, cor] of [[-14, -12.79, porta], [-2.5, -12.79, porta], [14, -12.79, porta], [-14, 12.79, porta], [2.2, 12.79, porta], [14, 12.79, porta]]) {
    cascaBase(addBox(0.92, 1.85, 0.05, cor, x, 0.04, z, { collide: false, cast: false, skirt: false }));
    cascaBase(addBox(1.22, 0.11, 0.62, zinco, x, 1.9, z + (z < 0 ? 0.27 : -0.27), { collide: false, skirt: false }));
  }
  for (const [x, z, y] of [[-10.8, -12.78, 1.25], [3.2, -12.78, 1.35], [11.8, -12.78, 1.2], [-11.2, 12.78, 1.3], [-1.2, 12.78, 1.15], [11.4, 12.78, 1.4]])
    cascaBase(addBox(1.1, 0.75, 0.05, janela, x, y, z, { collide: false, cast: false, skirt: false }));

  // As faces laterais continuam a rua em L: módulos estreitos, marquises e uma saia
  // úmida interrompem a leitura de dois corredores ortogonais abertos.
  const umidade = lam({ color: 0x394336, roughness: 1 });
  const laterais = [
    [-9.41,-26,.05,5.4,2.5,PAREDES[2]],[-9.41,-18,.05,4.2,3.0,tijolo],
    [-6.66,-26,.05,4.6,2.8,PAREDES[0]],[6.66,-26,.05,4.6,2.35,PAREDES[3]],
    [9.41,-26,.05,5.2,2.7,tijolo],[9.41,-18,.05,4.0,3.15,PAREDES[1]],
    [-9.41,15,.05,4.0,2.9,PAREDES[0]],[-9.41,24,.05,3.8,2.3,tijolo],
    [-4.34,17,.05,4.6,2.55,PAREDES[3]],[4.34,23,.05,4.0,3.0,PAREDES[1]],
    [9.41,25.5,.05,3.0,2.7,tijolo],[9.41,14,.05,1.8,2.45,PAREDES[2]],
  ];
  for (const [x,z,w,d,h,mat] of laterais) {
    cascaBase(addBox(w, h, d, mat, x, .04, z, { collide: false, skirt: false }));
    cascaBase(addBox(.7, .09, d + .35, zinco, x + (x < 0 ? .31 : -.31), h - .06, z,
      { collide: false, skirt: false }));
  }
  for (const [x,z,w,d] of [[-14,-12.73,8,.08],[0,-12.73,12,.08],[14,-12.73,8,.08],[-14,12.73,8,.08],[0,12.73,8,.08],[14,12.73,8,.08],[-9.34,-22,.08,17.5],[9.34,-22,.08,17.5],[-9.34,20,.08,13.5],[9.34,20,.08,13.5]])
    cascaBase(addBox(w, .24, d, umidade, x, .02, z, { collide: false, cast: false, skirt: false }));
  // Toldos altos ocupam o enquadramento, mas ficam acima do peito e não mudam o corredor.
  for (const [x,z,w,d,ry,cor] of [[-12,-9.9,3.6,1.5,.04,0xb66b35],[5.5,-10.1,4.2,1.35,-.05,0x3b7a68],[-5.5,10.1,3.8,1.4,.06,0xc2a43e],[12,9.9,3.4,1.55,-.04,0x9c493c]])
    addBox(w, .08, d, lam({ color: cor, roughness: .88 }), x, 2.65, z, { collide: false, skirt: false, ry });

  /* Janela com profundidade real (vidro rente, esquadria 9 cm, peitoril 16 cm):
     a chapa texturizada sem relevo é o que lia como "2D em 3D" nos prints do dono. */
  const vidro = lam({ color: 0x354247, metalness: 0.12, roughness: 0.42 });
  const esq = lam({ color: 0x968e80, roughness: 0.85 });
  function janela3d(cx, yb, cz, face) {   // face: 0=+z 1=-z 2=+x 3=-x
    const sx = face >= 2, s = (face === 0 || face === 2) ? 1 : -1;
    const box = (w, h, d, dy, out, tan, mat) => {
      const m = addBox(sx ? d : w, h, sx ? w : d, mat,
        cx + (sx ? s * out : tan), yb + dy, cz + (sx ? tan : s * out),
        { collide: false, cast: false, skirt: false, vao: false });
      return cascaBase(m);
    };
    // nomeadas: vidro e esquadria estão no NAO_PINTA da passada — sem nome elas
    // nasciam pintáveis e o cartaz colava no vidro (rebake de 14/08)
    box(1.0, 1.15, 0.05, 0, 0.03, 0, vidro).name = 'janela_vidro';
    box(1.24, 0.1, 0.1, 1.15, 0.05, 0, esq).name = 'janela_esq';
    box(1.24, 0.09, 0.18, -0.09, 0.08, 0, esq).name = 'janela_esq';
    box(0.1, 1.15, 0.09, 0, 0.04, -0.55, esq).name = 'janela_esq';
    box(0.1, 1.15, 0.09, 0, 0.04, 0.55, esq).name = 'janela_esq';
  }
  for (const x of [-16.5, -14, -11.5, -4.5, -1.5, 1.5, 4.5, 11.5, 14, 16.5])
    for (const yb of [0.7, 2.2]) janela3d(x, yb, -31, 1);
  for (const x of [-16.5, -14, -11.5, -2.5, 0, 2.5, 11.5, 14, 16.5])
    for (const yb of [0.7, 2.2]) janela3d(x, yb, 27, 0);
  for (const z of [-27, -22, -17, -10, -6, 6, 10, 16, 20, 24]) {
    janela3d(-18, 1.4, z, 3); janela3d(18, 1.4, z, 2);
  }

  // Barracos e platibandas dão alturas desencontradas às lajes, sem ocupar a rota jogável.
  for (const [x, z, y, w, d, h, mat] of [
    [-14.8, -27.2, LAJE_H, 2.7, 2.2, 1.8, tijolo], [-3.7, -26.6, LAJE_H + 1.5, 2.4, 2.0, 2.1, PAREDES[3]],
    [14.5, -18.2, LAJE_H, 2.5, 2.4, 1.55, PAREDES[1]], [-14.2, 23.5, LAJE_H, 2.8, 2.2, 1.75, PAREDES[0]],
    [0, 17.2, LAJE_H, 2.2, 1.9, 1.35, tijolo], [14.2, 23.5, LAJE_H, 2.5, 2.0, 2.05, PAREDES[2]],
  ]) {
    addBox(w, h, d, mat, x, y, z, { skirt: false });
    addBox(w + 0.32, 0.09, d + 0.32, zinco, x, y + h, z, { collide: false, skirt: false });
  }
  // Puxadinhos nas bordas da laje sul quebram o primeiro plano, mas preservam a faixa central.
  for (const [x, z, w, d, h, mat] of [[-2.7, 20.5, 1.9, 4.2, 1.65, PAREDES[1]], [2.7, 18.8, 1.9, 3.6, 2.05, tijolo]]) {
    addBox(w, h, d, mat, x, LAJE_H, z);
    addBox(w + 0.28, 0.09, d + 0.28, zinco, x, LAJE_H + h, z, { collide: false, skirt: false });
  }

  /* ===================== COBERTURA NAS LAJES ===================== */
  // Caixas cilíndricas físicas substituem os antigos cubos pretos, mantendo cover e LOS.
  const caixaMat = lam({ color: 0x2b3033, roughness: 0.82 });
  function caixaDagua(x, z, y, s = 1) {
    const r = 0.86 * s, h = 2.05 * s;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, h, 16), caixaMat);
    tank.position.set(x, y + h / 2, z); tank.castShadow = tank.receiveShadow = true; rooftopDetail(tank, 'tank'); root.add(tank);
    col(x - r, x + r, y, y + h, z - r, z + r); occluders.push(tank);
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(r * .86, r * .94, .16, 16), caixaMat);
    tampa.position.set(x, y + h + .08, z); tampa.castShadow = true; root.add(tampa);
  }
  for (const [ex, ez, ey] of [[-15,-25,LAJE_H],[4,-29,LAJE_H+1.5],[15,-25,LAJE_H]]) caixaDagua(ex, ez, ey);
  // Silhuetas adicionais ficam sobre covers já físicos: a sonda MAP1 não pode
  // confundir decoração atravessável com espaço onde o jogador deveria caber.
  for (const [x, z, y, s] of [[-15,-25,LAJE_H,0.72],[-14.45,-24.65,LAJE_H,0.58],[4,-29,LAJE_H+1.5,0.8],[4.45,-28.7,LAJE_H+1.5,0.55],[15,-25,LAJE_H,0.65],[14.45,-24.7,LAJE_H,0.52],[2.2,25,LAJE_H+2,0.55],[2.9,25,LAJE_H+2,0.48]]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.82 * s, 0.82 * s, 1.6 * s, 14), caixaMat);
    tank.position.set(x, y + 0.8 * s, z); tank.castShadow = true; rooftopDetail(tank, 'tank'); root.add(tank);
  }
  // O quadrante sudoeste era a placa vazia que sobrevivia à densidade global. Duas
  // caixas menores completam a silhueta sem virar cover nem alterar a rota de salto.
  for (const [x,z,s] of [[-15,18,.62],[-2,23,.5]]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(.82*s,.82*s,1.6*s,14), caixaMat);
    tank.position.set(x, LAJE_H + .8*s, z); tank.castShadow = true; rooftopDetail(tank, 'tank'); root.add(tank);
  }
  const metal = lam({ color: 0x4a4d4c, metalness: 0.62, roughness: 0.48 });
  const tampaCaixa = lam({ color: 0x292c2d, roughness: .72 });
  for (const [x,z,y] of [[-15,-25,LAJE_H+2.5],[4,-29,LAJE_H+4],[15,-25,LAJE_H+2.5],[2.5,25,LAJE_H+4]]) {
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(.76, .84, .16, 16), tampaCaixa);
    tampa.position.set(x, y + .08, z); tampa.castShadow = true; root.add(tampa);
    addBox(.08, .7, .08, metal, x + .48, y, z + .35, { collide: false, skirt: false });
  }
  // x=±11 e não ±7: em ±7 o poste nascia no VÃO entre prédios e flutuava sobre o beco.
  for (const [x, z, y, ry] of [[-11,-30,LAJE_H,0.2],[11,-30,LAJE_H,-0.4],[-15,17,LAJE_H,0.6],[14,24,LAJE_H,-0.7],[0.8,0.8,LAJE_H,0.1]]) {
    addBox(0.06, 2.5, 0.06, metal, x, y, z, { collide: false, skirt: false });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 6, 0, Math.PI), metal);
    dish.scale.set(1, 0.32, 1); dish.rotation.set(-Math.PI / 2.8, ry, 0); dish.position.set(x, y + 2.1, z); rooftopDetail(dish, 'antenna'); root.add(dish);
  }
  // varal (decoração). Fio da laje alta (5,0 m) a partir de z=-18,5: mais ao norte
  // as roupas tapam a câmera de evidência (0,6,65,-22) a 0,8 m dela.
  for (const [ex, ey, wz] of [[-15, LAJE_H + 1.5, -20], [0, LAJE_H + 3.0, -16.5]]) {
    rooftopDetail(addBox(0.04, 0.04, 4.0, lam({ color: 0x8a8a8a }), ex, ey, wz, { collide: false }), 'clothesline');
    for (const pz of [wz - 1.9, wz + 1.9]) addBox(0.07, ey - (ey > 6 ? LAJE_H + 1.5 : LAJE_H), 0.07, metal, ex, ey > 6 ? LAJE_H + 1.5 : LAJE_H, pz, { collide: false, cast: false, skirt: false });
    for (let i = 0; i < 4; i++) addBox(0.55, 0.65, 0.03, lam({ color: [0xb74435, 0xe6dfc7, 0x2f6b9b, 0xd8b040][i] }), ex, ey - 0.62, wz - 1.2 + i * 0.8, { collide: false, cast: false });
  }

  /* Clutter que assina a favela (dono, 15/08: "não caixa d'água, não roupa
     pendurada"): caixas azul/branca espalhadas pelas lajes baixas e varais
     CRUZANDO os vãos — o fio de roupa sobre o beco é a imagem-síntese do morro. */
  const caixaAzul = lam({ color: 0x2f5f9e, roughness: 0.72 });
  const caixaBranca = lam({ color: 0xd8d5cc, roughness: 0.8 });
  for (const [x, z, y, s, m] of [
    [-17, -11, LAJE_H, 0.62, caixaAzul], [17, -11, LAJE_H, 0.55, caixaBranca],
    [-17, 10.5, LAJE_H, 0.58, caixaBranca], [17, 10.5, LAJE_H, 0.62, caixaAzul],
    [-10.3, 25.5, LAJE_H, 0.5, caixaAzul], [10.3, 25.5, LAJE_H, 0.55, caixaBranca],
    [-6.1, -11, LAJE_H, 0.48, caixaBranca], [5.6, 11, LAJE_H, 0.5, caixaAzul],
    [-8.8, -24.75, 2.8, 0.45, caixaAzul], [18.65, -8, 2.5, 0.42, caixaBranca],
  ]) {
    const r = 0.86 * s, h = 2.05 * s;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, h, 14), m);
    tank.position.set(x, y + h / 2, z); tank.castShadow = tank.receiveShadow = true;
    rooftopDetail(tank, 'tank'); root.add(tank);
    col(x - r, x + r, y, y + h, z - r, z + r); occluders.push(tank);
  }
  const CORES_ROUPA = [0xb74435, 0xe6dfc7, 0x2f6b9b, 0xd8b040, 0x567b4d, 0xd97b29];
  const corda = lam({ color: 0x57534d, roughness: 0.9 });
  function varalVao(x0, x1, y, z) {          // fio ao longo de x, de parapeito a parapeito
    addBox(x1 - x0, 0.02, 0.02, corda, (x0 + x1) / 2, y, z, { collide: false, cast: false, skirt: false });
    const n = 3 + Math.round(Math.abs(x1 - x0) / 2);
    for (let i = 0; i < n; i++) {
      const rx = x0 + 0.45 + (x1 - x0 - 0.9) * (i + 0.5) / n;
      addBox(0.5 + (i % 2) * 0.16, 0.6 + (i % 3) * 0.12, 0.025, lam({ color: CORES_ROUPA[(i * 7 + z * 13 | 0) % 6] }),
        rx, y - 0.62 - (i % 3) * 0.12, z, { collide: false, cast: false, skirt: false });
    }
  }
  varalVao(-9.5, -6.75, 3.3, -20); varalVao(-9.5, -6.75, 3.1, -26);
  varalVao(6.75, 9.5, 3.2, -24); varalVao(6.75, 9.5, 3.35, -18);
  varalVao(-9.5, -6.75, 3.25, 17); varalVao(6.75, 9.5, 3.15, 20);
  for (const [x, z] of [[-16, -30.5], [16, -30.5], [-11, 26]]) {   // antena yagi de parapeito
    addBox(0.05, 2.1, 0.05, metal, x, LAJE_H, z, { collide: false, cast: false, skirt: false });
    for (let v = 0; v < 4; v++) addBox(0.7 - v * 0.12, 0.03, 0.03, metal, x, LAJE_H + 1.4 + v * 0.18, z, { collide: false, cast: false, skirt: false });
  }

  for (const [x, z, y, rz] of [[-13,20,LAJE_H+2.2,0],[3,20,LAJE_H+2.0,0],[13,-22,LAJE_H+2.1,0]]) {
    rooftopDetail(addBox(4.2, 0.025, 0.025, lam({ color: 0x57534d }), x, y, z, { collide: false, cast: false, skirt: false }), 'clothesline');
    for (const px of [x - 2.05, x + 2.05]) addBox(0.07, y - LAJE_H, 0.07, metal, px, LAJE_H, z, { collide: false, cast: false, skirt: false });
    for (let i = 0; i < 5; i++) addBox(0.52 + (i % 2) * 0.18, 0.7 + (i % 3) * 0.14, 0.025,
      lam({ color: [0x2f6b9b,0xd8b040,0xb74435,0xe6dfc7,0x567b4d][i] }), x - 1.65 + i * 0.82, y - 0.78, z + rz,
      { collide: false, cast: false, skirt: false });
  }
  // Puxadinho + manchas de uso no sudeste da laje alta, fora da zona de spawn (norte)
  // e da ponte (oeste). Mancha é pele de 1 cm, nunca colisor.
  addBox(2.3, 1.7, 1.9, tijolo, 4.6, LAJE_H + 1.5, -16.2, { skirt: false });
  addBox(2.58, 0.09, 2.18, zinco, 4.6, LAJE_H + 3.2, -16.2, { collide: false, skirt: false });
  for (const [sx, sz, sw, sd] of [[-1.5, -19.5, 4.5, 3.0], [2.0, -15.8, 2.6, 1.8]])
    addBox(sw, 0.012, sd, MAT.concreteDark, sx, LAJE_H + 1.5 + 0.03, sz, { collide: false, cast: false, skirt: false, vao: false });
  // Fiação alta dá escala aos becos sem criar cover nem interferir na bala.
  for (const [w, d, x, z] of [[18, 0.025, 0, -7], [18, 0.025, 0, 7], [0.025, 16, -8.1, -22], [0.025, 16, 8.1, -22]])
    addBox(w, 0.025, d, lam({ color: 0x25231f }), x, 4.8, z, { collide: false, cast: false, skirt: false });
  // barraco de obra numa laje sul
  addBox(3.0, 2.0, 3.0, PAREDES[2], 2.5, LAJE_H, 25);
  solids.push({ x0: 1, x1: 4, z0: 23.5, z1: 26.5, h: LAJE_H + 2.0 });

  /* Caixas de escada nas lajes: o roofline igual a 3,5 + platibanda de 1,02 em todos
     os prédios é o "layout de caixa" dos prints. Cantos longe das âncoras de tábua;
     colidem e entram em `solids` como o barraco acima (honestas pra sonda MAP1). */
  for (const [x, z, w, d, h, mat] of [
    [-16.4, -29.2, 2.4, 2.2, 2.3, tijolo], [16.4, -29.2, 2.2, 2.0, 1.9, PAREDES[1]],
    [-16.4, 24.8, 2.3, 2.0, 2.5, tijolo], [16.4, 24.8, 2.2, 2.1, 2.1, PAREDES[3]],
    [-16.9, -8.0, 1.9, 1.9, 2.0, PAREDES[0]], [16.9, 8.0, 1.9, 1.9, 2.4, tijolo],
  ]) {
    addBox(w, h, d, mat, x, LAJE_H, z);
    addBox(w + 0.3, 0.09, d + 0.3, zinco, x, LAJE_H + h, z, { collide: false, skirt: false });
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, h: LAJE_H + h });
  }

  /* ===================== ESCADAS (4 conexões entre camadas) =====================
     As escadas nas pontas leste/oeste dão as ≥ 2 rotas separadas por spawn/bandeira da CTF2. */
  const ESCADAS = [
    { nome: 'noroeste', x: -19.5, z: -10, dz: -1 },
    { nome: 'nordeste', x: 19.5, z: -10, dz: -1 },
    { nome: 'sudoeste', x: -19.5, z: 10, dz: 1 },
    { nome: 'sudeste', x: 19.5, z: 10, dz: 1 },
  ];
  /* Escada de favela: lance baixo CHEIO, lance alto VAZADO sobre laje inclinada —
     debaixo corre o vão de pedestre (≥ 2,0 m livres a partir do degrau 12). */
  const VAO_DEGRAU = 12;   // 12 × 0,167 = 2,0 m — pé-direito mínimo do vão
  function buildStair(es) {
    const w = 2.5;
    const zc = (i) => es.z + es.dz * (i * ESC.piso);
    for (let i = 0; i < N_STAIR; i++) {
      const z = zc(i), y = i * ESP;
      if (i < VAO_DEGRAU) addBox(w, y + ESP, ESC.piso + 0.015, MAT.concrete, es.x, 0, z, { collide: false });
      else addBox(w, ESP, ESC.piso + 0.015, MAT.concrete, es.x, y, z, { collide: false });
    }
    // laje inclinada sustentando o lance vazado + dintel na boca do vão (visuais)
    const yVao = VAO_DEGRAU * ESP, runVao = (N_STAIR - VAO_DEGRAU) * ESC.piso;
    const laje = addBox(w, 0.09, Math.hypot(runVao, LAJE_H - yVao) + 0.25, MAT.concreteDark, es.x, 0, zc(VAO_DEGRAU) + es.dz * runVao / 2, { collide: false, cast: false, skirt: false });
    laje.position.y = (yVao + LAJE_H) / 2 - 0.10;
    laje.rotation.x = -es.dz * Math.atan2(LAJE_H - yVao, runVao);
    addBox(w + 0.3, 0.16, 0.18, MAT.concreteDark, es.x, yVao - 0.16, zc(VAO_DEGRAU) - es.dz * 0.2, { collide: false, skirt: false });
    // mureta em degraus de 3 pisos, fora do corredor de passagem — COLIDE: é a guarda
    // que a MAP6 cobra na borda da escada (os muros chapados faziam esse papel)
    for (let g = 0; g < N_STAIR; g += 3) {
      const g1 = Math.min(g + 2, N_STAIR - 1);
      const yTop = g1 * ESP + ESP;
      const z0 = zc(g) - es.dz * ESC.piso / 2, z1 = zc(g1) + ESC.piso * es.dz / 2;
      for (const sx of [-1, 1])
        addBox(0.14, 0.92, Math.abs(z1 - z0), MAT.concreteDark, es.x + sx * (w / 2 + 0.07), yTop, (z0 + z1) / 2);
    }
  }
  for (const es of ESCADAS) buildStair(es);

  // registrar zonas de escada para groundHeightAt
  const stairZones = ESCADAS.map((es) => ({
    x0: es.x - 1.25, x1: es.x + 1.25,
    z0: Math.min(es.z, es.z + es.dz * STAIR_RUN), z1: Math.max(es.z, es.z + es.dz * STAIR_RUN),
    inicio: es.z, dz: es.dz,
    cobre: es.z + es.dz * (STAIR_RUN - 0.7),   // daqui ao topo o patamar cobre os degraus
  }));

  // Patamar de retorno: a escada desemboca lateralmente na laje, nunca adiante no vazio.
  for (const es of ESCADAS) {
    const topoZ = es.z + es.dz * STAIR_RUN;
    const paraDentro = -Math.sign(es.x);
    const cx = es.x + paraDentro * 0.75;
    addBox(4.0, 0.12, 1.4, MAT.concreteDark, cx, LAJE_H - .12, topoZ);
    footprints.push({ x0: cx - 2, x1: cx + 2, z0: topoZ - .7, z1: topoZ + .7, h: LAJE_H });
    addBox(.28, 1.02, 1.4, MAT.concreteDark, es.x - paraDentro * 1.25, LAJE_H, topoZ);
    addBox(2.7, 1.02, .28, MAT.concreteDark, es.x - paraDentro * .1, LAJE_H,
      topoZ + es.dz * .7);
  }
  const navColliderCount = colliders.length;

  // Borda com queda de andar recebe platibanda física; pontes e topo de escada ficam
  // abertos (mesma cota). Sonda a 0,55 m da face: < vão de 1 m e < âncora da tábua (MAP6).
  function guardaTrechos(e, eixo, sinal) {
    const inicio = eixo === 'x' ? e.z - e.d / 2 : e.x - e.w / 2;
    const fim = eixo === 'x' ? e.z + e.d / 2 : e.x + e.w / 2;
    const passo = 0.5, abertos = [];
    for (let q = inicio + passo / 2; q < fim; q += passo) {
      const x = eixo === 'x' ? e.x + sinal * (e.w / 2 + 0.55) : q;
      const z = eixo === 'x' ? q : e.z + sinal * (e.d / 2 + 0.55);
      if (e.h - groundHeightAt(x, z, e.h) >= 2) abertos.push(q);
    }
    if (!abertos.length) return;
    let a = abertos[0] - passo / 2, b = abertos[0] + passo / 2;
    const flush = () => {
      // nomeada: a passada de grafite não pinta platibanda — peça nessa faixa de
      // 1,02 m lê como tinta pairando na linha do céu ("cortando o vão", 14/08)
      const m = eixo === 'x'
        ? addBox(0.34, 1.02, b - a, MAT.concreteDark, e.x + sinal * e.w / 2, e.h, (a + b) / 2)
        : addBox(b - a, 1.02, 0.34, MAT.concreteDark, (a + b) / 2, e.h, e.z + sinal * e.d / 2);
      m.name = 'platibanda_laje';
      cascaBase(m);
    };
    for (let i = 1; i < abertos.length; i++) {
      if (abertos[i] - abertos[i - 1] <= passo + 0.01) b = abertos[i] + passo / 2;
      else { flush(); a = abertos[i] - passo / 2; b = abertos[i] + passo / 2; }
    }
    flush();
  }
  EDIFICIOS.forEach((e) => {
    guardaTrechos(e, 'x', -1); guardaTrechos(e, 'x', 1);
    guardaTrechos(e, 'z', -1); guardaTrechos(e, 'z', 1);
  });
  ANEXOS.forEach((a) => {
    guardaTrechos(a, 'x', -1); guardaTrechos(a, 'x', 1);
    guardaTrechos(a, 'z', -1); guardaTrechos(a, 'z', 1);
  });

  /* ===================== MUROS EXTERNOS ===================== */
  /* A barreira física permanece com 4 m, mas não desenha a moldura retangular. */
  for (const sx of [-HALF_X, HALF_X]) {
    col(sx - 0.25, sx + 0.25, 0, 4, -HALF_Z, HALF_Z);
  }
  for (const sz of [-HALF_Z, HALF_Z]) {
    col(-HALF_X - 0.5, HALF_X + 0.5, 0, 4, sz - 0.25, sz + 0.25);
  }

  /* O limite norte/sul continua sendo o collider simples acima, mas deixa de se
     apresentar como muro de arena: fachadas rasas, portas e marquises formam uma
     rua habitada sem inventar interiores ou mudar o contrato de colisao. */
  const limitePorta = lam({ color: 0x5d4334, roughness: 0.92 });
  const limiteMedidor = lam({ color: 0x5b554b, roughness: 0.92 });
  function fachadaHeroiX(plano, z, sinal) {
    const argamassaHeroi = paredeCanonica;
    const fundoForma = new THREE.Shape();
    fundoForma.moveTo(-1.46, 0.08); fundoForma.lineTo(1.48, 0.08);
    fundoForma.lineTo(1.48, 0.36); fundoForma.lineTo(1.66, 0.36);
    fundoForma.lineTo(1.66, 0.98); fundoForma.lineTo(1.42, 0.98);
    fundoForma.lineTo(1.42, 1.18); fundoForma.lineTo(1.10, 1.18);
    fundoForma.lineTo(1.10, 1.58); fundoForma.lineTo(0.86, 1.58);
    fundoForma.lineTo(0.86, 1.80); fundoForma.lineTo(-0.92, 1.80);
    fundoForma.lineTo(-0.92, 1.60); fundoForma.lineTo(-1.30, 1.60);
    fundoForma.lineTo(-1.30, 1.18); fundoForma.lineTo(-1.50, 1.18);
    fundoForma.closePath();
    const fundoGeo = new THREE.ShapeGeometry(fundoForma); fundoGeo.rotateY(sinal * Math.PI / 2);
    const fundo = new THREE.Mesh(fundoGeo, argamassaHeroi);
    fundo.position.set(plano + sinal * 0.025, 0, z); fundo.receiveShadow = true;
    fundo.name = 'argamassa_irregular_heroica'; root.add(fundo);
    function texturaBlocoHeroi(cor, seed) {
      const c = document.createElement('canvas'); c.width = 96; c.height = 48;
      const ctx = c.getContext('2d'); ctx.fillStyle = cor; ctx.fillRect(0, 0, 96, 48);
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = `rgba(72,32,20,${0.12 + (i % 3) * 0.025})`;
        ctx.fillRect(3, 4 + i * 4, 90, 1);
      }
      for (let i = 0; i < 28; i++) {
        const x = (i * 37 + seed * 13) % 94, y = (i * 19 + seed * 7) % 46;
        ctx.fillStyle = i % 2 ? 'rgba(255,226,188,0.08)' : 'rgba(70,34,24,0.07)';
        ctx.fillRect(x, y, 1 + (i % 3), 1);
      }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
      return lam({ map: tex, roughness: 0.98 });
    }
    const blocoMats = [['#c66b3f', 3], ['#b85a35', 7], ['#d17a4c', 11]]
      .map(([cor, seed]) => texturaBlocoHeroi(cor, seed));
    const porMaterial = [[], [], []];
    for (const [linha, coluna] of TIJOLOS_HEROI) {
      const desloca = linha % 2 ? 0.205 : 0;
      porMaterial[Math.abs(linha * 7 + coluna) % 3].push({
        x: plano + sinal * 0.09,
        y: 0.25 + linha * 0.205,
        z: z + coluna * 0.415 + desloca,
        ry: ((linha * 11 + coluna * 5) % 5 - 2) * 0.004,
      });
    }
    const blocoGeo = new THREE.BoxGeometry(0.16, 0.188, 0.395);
    for (let i = 0; i < porMaterial.length; i++) {
      const unidades = porMaterial[i];
      const malha = new THREE.InstancedMesh(blocoGeo, blocoMats[i], unidades.length);
      const dummy = new THREE.Object3D();
      for (let j = 0; j < unidades.length; j++) {
        const b = unidades[j]; dummy.position.set(b.x, b.y, b.z);
        dummy.rotation.set(0, b.ry, 0); dummy.updateMatrix(); malha.setMatrixAt(j, dummy.matrix);
      }
      malha.name = 'bloco_baiano_heroico'; malha.castShadow = true; malha.receiveShadow = true;
      root.add(malha);
    }
    for (const [dz, ry] of [[-0.7, 0.08], [-0.28, -0.11], [0.18, 0.16]])
      addBox(0.16, 0.11, 0.31, blocoMats[(Math.round(dz * 100) + 70) % blocoMats.length], plano + sinal * 0.22, 0.01, z + dz,
        { collide: false, cast: false, skirt: false, ry, vao: false });
  }
  const limiteFachadas = [
    { x: -16.2, w: 5.4, h: 3.1, d: 3.2, r: 0.04 },
    { x: -9.1, w: 5.8, h: 3.7, d: 2.6, r: 0.26 },
    { x: -1.7, w: 6.2, h: 3.0, d: 4.0, r: 0.10 },
    { x: 6.0, w: 5.6, h: 3.5, d: 3.4, r: 0.38 },
    { x: 13.7, w: 6.0, h: 3.2, d: 2.9, r: 0.18 },
  ];
  for (const sz of [-1, 1]) for (const [i, f] of limiteFachadas.entries()) {
    if ((sz < 0 && i === 1) || (sz > 0 && i === 3)) continue;
    const zParede = sz * (HALF_Z - 0.28);
    const zFrente = zParede + sz * f.r;
    const zCentro = zFrente + sz * f.d / 2;
    const espelho = sz < 0 ? f.x : -f.x;
    addFloor(f.w + 0.5, f.d + 0.5, espelho, zCentro, MAT.dirt, -0.13);
    addBox(f.w, f.h, f.d, paredeCanonica, espelho, 0, zCentro,
      { collide: false, skirt: false });
    addBox(f.w + 0.24, 0.12, f.d + 0.22, MAT.concreteDark,
      espelho, f.h, zCentro, { collide: false, skirt: false });
    const portaoW = i % 2 ? 1.8 : 1.15;
    addBox(portaoW, Math.min(2.25, f.h - 0.22), 0.06, limitePorta,
      espelho + (i % 2 ? -0.72 : 0.62), 0.08, zFrente - sz * 0.03,
      { collide: false, cast: false, skirt: false, vao: false });
    addBox(Math.min(3.4, f.w - 0.5), 0.09, 0.86, MAT.zinc,
      espelho, Math.min(2.45, f.h - 0.35), zFrente - sz * 0.36,
      { collide: false, skirt: false, vao: false });
    const awY = Math.min(2.45, f.h - 0.35), awW = Math.min(3.4, f.w - 0.5);
    for (const bx of [-0.34, 0.34]) escora(espelho + bx * awW, awY - 0.7,
      zFrente - sz * 0.02, espelho + bx * awW, awY - 0.04,
      zFrente - sz * 0.70, limiteMedidor);
    addBox(0.32, 0.44, 0.08, limiteMedidor,
      espelho - (i % 2 ? 1.55 : -1.45), 1.05, zFrente - sz * 0.04,
      { collide: false, cast: false, skirt: false, vao: false });
  }
  const limiteLaterais = [
    { z: -34.1, d: 5.6, h: 3.25, p: 3.7, r: 0.00 },
    { z: -27.4, d: 5.4, h: 3.65, p: 2.8, r: 0.28 },
    { z: -20.7, d: 5.8, h: 3.05, p: 4.1, r: 0.08 },
    { z: -8.0, d: 6.0, h: 3.55, p: 3.2, r: 0.35 },
    { z: 0.5, d: 6.2, h: 3.15, p: 2.6, r: 0.12 },
    { z: 10.0, d: 6.0, h: 3.6, p: 4.0, r: 0.22 },
    { z: 20.0, d: 6.4, h: 3.1, p: 3.4, r: 0.05 },
    { z: 30.2, d: 6.0, h: 3.45, p: 2.9, r: 0.31 },
  ];
  for (const sx of [-1, 1]) for (const [i, f] of limiteLaterais.entries()) {
    if ((sx < 0 && (i === 2 || i === 6)) || (sx > 0 && (i === 1 || i === 4))) continue;
    const xParede = sx * (HALF_X - 0.28);
    const xFrente = xParede + sx * f.r;
    const xCentro = xFrente + sx * f.p / 2;
    const espelhoZ = sx < 0 ? f.z : -f.z;
    addFloor(f.p + 0.5, f.d + 0.5, xCentro, espelhoZ, MAT.dirt, -0.13);
    addBox(f.p, f.h, f.d, paredeCanonica, xCentro, 0, espelhoZ,
      { collide: false, skirt: false });
    addBox(f.p + 0.22, 0.12, f.d + 0.24, MAT.concreteDark,
      xCentro, f.h, espelhoZ, { collide: false, skirt: false });
    const portaoD = i % 2 ? 1.75 : 1.15;
    addBox(0.06, Math.min(2.25, f.h - 0.2), portaoD, limitePorta,
      xFrente - sx * 0.03, 0.08, espelhoZ + (i % 2 ? -0.72 : 0.62),
      { collide: false, cast: false, skirt: false, vao: false });
    addBox(0.86, 0.09, Math.min(3.4, f.d - 0.5), MAT.zinc,
      xFrente - sx * 0.36, Math.min(2.45, f.h - 0.35), espelhoZ,
      { collide: false, skirt: false, vao: false });
    const awY = Math.min(2.45, f.h - 0.35), awD = Math.min(3.4, f.d - 0.5);
    for (const bz of [-0.34, 0.34]) escora(xFrente - sx * 0.02, awY - 0.7,
      espelhoZ + bz * awD, xFrente - sx * 0.70, awY - 0.04,
      espelhoZ + bz * awD, limiteMedidor);
    addBox(0.08, 0.44, 0.32, limiteMedidor,
      xFrente - sx * 0.04, 1.05, espelhoZ - (i % 2 ? 1.48 : -1.42),
      { collide: false, cast: false, skirt: false, vao: false });
  }

  /* O bairro continua para fora das quatro bordas em terraços sem física; o
     collider invisível continua exatamente no contrato do mapa. */
  const entornoMats = [
    lam({ color: 0x8b7964, roughness: 0.98 }), lam({ color: 0x637a75, roughness: 0.98 }),
    lam({ color: 0x9a745f, roughness: 0.98 }), lam({ color: 0x8a8877, roughness: 0.98 }),
  ];
  const telhadoEntorno = [MAT.concreteDark, MAT.concrete, MAT.zinc];
  const caixaEntorno = lam({ color: 0x3f5960, roughness: 0.78 });
  const terraEntorno = lam({ color: 0x829589, roughness: 1 });
  const alturaEntorno = (x, z) => horizonTerrainHeight(x, z);
  function terrenoEntornoContinuo(t) {
    const sx = Math.max(2, Math.ceil(t.w / 3.5)), sz = Math.max(2, Math.ceil(t.d / 3.5));
    const geo = new THREE.PlaneGeometry(t.w, t.d, sx, sz); geo.rotateX(-Math.PI / 2);
    const pos = geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + t.x, z = pos.getZ(i) + t.z;
      pos.setY(i, alturaEntorno(x, z) - 0.035);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
    const terreno = new THREE.Mesh(geo, terraEntorno); terreno.position.set(t.x, 0, t.z);
    terreno.name = `terreno_entorno_${t.lado}`; terreno.receiveShadow = true; root.add(terreno);
  }
  if (ENTORNO_EM_TERRENO_CONTINUO) {
    for (const t of TERRACOS_ENTORNO) terrenoEntornoContinuo(t);
  }
  function casaEntorno(x, z, w, d, h, base, mi, ry = 0, sobrado = false, tijoloCru = false) {
    const corpo = tijoloCru ? tijoloDetalhe : entornoMats[mi % entornoMats.length];
    addBox(w, h, d, corpo, x, base, z,
      { collide: false, skirt: false, ry, vao: false });
    if (tijoloCru) addBox(w + 0.08, 0.62, d + 0.08, MAT.concrete, x, base, z,
      { collide: false, cast: false, skirt: false, ry, vao: false });
    addBox(w + 0.28, 0.12, d + 0.28, telhadoEntorno[mi % telhadoEntorno.length], x, base + h, z,
      { collide: false, skirt: false, ry, vao: false });
    let topo = base + h + 0.12, tx = x, tz = z;
    if (sobrado) {
      const uh = 1.75, ux = x + Math.cos(ry) * w * 0.12, uz = z - Math.sin(ry) * w * 0.12;
      addBox(w * 0.62, uh, d * 0.68, tijoloCru ? tijoloDetalhe : entornoMats[(mi + 1) % entornoMats.length], ux, base + h + 0.12, uz,
        { collide: false, skirt: false, ry, vao: false });
      addBox(w * 0.62 + 0.24, 0.1, d * 0.68 + 0.24, MAT.zinc, ux, base + h + 0.12 + uh, uz,
        { collide: false, skirt: false, ry, vao: false });
      topo = base + h + 0.22 + uh; tx = ux; tz = uz;
    }
    if (Math.abs(Math.round(x * 10) + Math.round(z * 10) + mi) % 4 === 0) {
      const caixa = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.70, 10), caixaEntorno);
      caixa.position.set(tx + w * 0.16, topo + 0.35, tz - d * 0.10);
      caixa.castShadow = true; caixa.receiveShadow = true; root.add(caixa);
    }
  }
  for (const e of ENTORNO_HABITADO) {
    const base = alturaEntorno(e.x, e.z) - 0.72;
    casaEntorno(e.x, e.z, e.w, e.d, e.h, base, e.mi, e.ry, e.sobrado, e.tijolo);
  }
  const troncoEntorno = lam({ color: 0x514436, roughness: 1 });
  const copaEntorno = [lam({ color: 0x445e47, roughness: 1 }), lam({ color: 0x5f7652, roughness: 1 })];
  function arvoreEntorno(x, z, base, h, r) {
    const tronco = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h, 7), troncoEntorno);
    tronco.position.set(x, base + h / 2, z); tronco.castShadow = true; root.add(tronco);
    for (const [i, dx, dy, dz, s] of [[0, -0.35, 0.3, 0, 0.82], [1, 0.32, 0.15, 0.18, 0.92], [0, 0, 0.72, -0.15, 0.72]]) {
      const copa = new THREE.Mesh(new THREE.DodecahedronGeometry(r * s, 0), copaEntorno[i]);
      copa.scale.y = 1.12; copa.position.set(x + dx * r, base + h + dy * r, z + dz * r);
      copa.castShadow = true; root.add(copa);
    }
  }
  arvoreEntorno(-27.0, 20.5, 1.35, 3.1, 1.0);
  arvoreEntorno(-32.0, 31.0, 2.20, 3.5, 1.2);
  arvoreEntorno(27.0, -2.0, 1.70, 3.2, 1.15);
  arvoreEntorno(33.0, 12.0, 2.10, 3.8, 1.3);
  arvoreEntorno(-12.0, -44.0, 1.85, 3.0, 1.1);
  arvoreEntorno(5.0, -47.0, 2.05, 3.6, 1.25);

  /* ===================== COVER NOS BECOS ===================== */
  // helper de casa sólida (mesma do quebrada: nenhum interior acessível)
  function casa(x, z, w, d, h, material) {
    const mat = material?.isMaterial ? material : PAREDES[material % PAREDES.length];
    addBox(w, h, d, mat, x, 0, z);
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    addBox(w + 0.3, 0.12, d + 0.3, MAT.concreteDark, x, h, z, { collide: false });
  }
  /* A rua norte agora termina numa casa de esquina em L, não num tampão plano.
     O corpo maior avança 2,25 m para dentro e a asa encosta no limite norte; sobra
     um beco medido entre a casa e o NW, forçando a curva sem fechar a rota. */
  casa(-20.88, -35.2, 2.24, 4.55, 3.25, 0);
  casa(-19.05, -37.05, 1.55, 1.40, 2.55, 0);
  addBox(0.06, 2.1, 1.05, limitePorta, -19.73, 0.08, -34.55,
    { collide: false, cast: false, skirt: false, vao: false });
  addBox(0.78, 0.09, 2.7, MAT.zinc, -19.36, 2.38, -35.2,
    { collide: false, skirt: false, vao: false });
  addBox(0.08, 0.44, 0.32, limiteMedidor, -19.69, 1.05, -36.25,
    { collide: false, cast: false, skirt: false, vao: false });
  casa(-7.8, -35.7, 4.75, 4.6, 3.45, 0);
  addBox(1.05, 2.1, 0.06, limitePorta, -8.65, 0.08, -33.37,
    { collide: false, cast: false, skirt: false, vao: false });
  addBox(2.8, 0.09, 0.78, MAT.zinc, -7.8, 2.42, -32.99,
    { collide: false, skirt: false, vao: false });
  for (const bx of [-8.65, -6.95]) escora(bx, 1.72, -33.39, bx, 2.36, -32.66, limiteMedidor);
  addBox(0.32, 0.44, 0.08, limiteMedidor, -6.45, 1.05, -33.34,
    { collide: false, cast: false, skirt: false, vao: false });
  addBox(0.06, 2.1, 1.05, limitePorta, -5.39, 0.08, -35.6,
    { collide: false, cast: false, skirt: false, vao: false });
  addBox(0.78, 0.09, 2.7, MAT.zinc, -5.01, 2.42, -35.7,
    { collide: false, skirt: false, vao: false });
  casa(6.3, -33.65, 4.2, 4.8, 3.45, paredeCanonica);
  addBox(0.06, 2.05, 1.10, limitePorta, 8.43, 0.08, -33.25,
    { collide: false, cast: false, skirt: false, vao: false });
  addBox(0.82, 0.09, 1.15, MAT.zinc, 8.80, 2.34, -33.15,
    { collide: false, skirt: false, vao: false });
  escora(8.39, 1.66, -33.15, 9.13, 2.28, -33.15, limiteMedidor);
  fachadaHeroiX(8.4, -34.45, 1);
  addBox(1.05, 0.82, 0.06, janela, 5.45, 1.35, -36.08,
    { collide: false, cast: false, skirt: false, vao: false });
  addBox(1.34, 0.10, 0.68, MAT.concrete, 5.45, 2.18, -36.40,
    { collide: false, skirt: false, vao: false });
  const rotaPontos = ROTA_S_NORTE.map(([x, z]) => new THREE.Vector2(x, z));
  const esquerda = [], direita = [], meiaLargura = 0.52;
  for (let i = 0; i < rotaPontos.length; i++) {
    const a = rotaPontos[Math.max(0, i - 1)], b = rotaPontos[Math.min(rotaPontos.length - 1, i + 1)];
    const tangente = b.clone().sub(a).normalize(), normal = new THREE.Vector2(-tangente.y, tangente.x).multiplyScalar(meiaLargura);
    esquerda.push(rotaPontos[i].clone().add(normal)); direita.push(rotaPontos[i].clone().sub(normal));
  }
  const faixaForma = new THREE.Shape();
  faixaForma.moveTo(esquerda[0].x, -esquerda[0].y);
  for (let i = 1; i < esquerda.length; i++) faixaForma.lineTo(esquerda[i].x, -esquerda[i].y);
  for (let i = direita.length - 1; i >= 0; i--) faixaForma.lineTo(direita[i].x, -direita[i].y);
  faixaForma.closePath();
  const faixaGeo = new THREE.ShapeGeometry(faixaForma); faixaGeo.rotateX(-Math.PI / 2);
  const faixaMat = lam({ color: 0x594432, roughness: 1, transparent: true, opacity: 0.48,
    polygonOffset: true, polygonOffsetFactor: -2 });
  const faixaS = new THREE.Mesh(faixaGeo, faixaMat); faixaS.position.y = 0.025;
  faixaS.name = 'trilha_rua_s'; faixaS.receiveShadow = true; root.add(faixaS);
  // Dois volumes autorais de sucata, sem grade/logotipo/perfil de modelo real.
  for (const [cx, cz, cry, cor, tipo] of [[-5,0,.1,0x76613d,'compacto-angular'],[6,2,-.05,0x59636a,'utilitario-reto']]) {
    const grupo = new THREE.Group(); grupo.position.set(cx,0,cz); grupo.rotation.y = cry;
    grupo.userData.originalVehicle = tipo; root.add(grupo);
    const pintura = lam({ color:cor,roughness:.72,metalness:.14 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.8,.58,3.65),pintura); base.position.y=.36; grupo.add(base);
    const cabine = new THREE.Mesh(new THREE.BoxGeometry(tipo === 'compacto-angular' ? 1.52 : 1.62,.62,
      tipo === 'compacto-angular' ? 1.55 : 1.35),lam({ color:0x26353a,roughness:.32 }));
    cabine.position.set(0,.86,tipo === 'compacto-angular' ? -.08 : -.42); grupo.add(cabine);
    for (const x of [-.91,.91]) for (const z of [-1.15,1.15]) {
      const roda = new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.16,10),lam({ color:0x171717,roughness:1 }));
      roda.rotation.z=Math.PI/2; roda.position.set(x,.3,z); grupo.add(roda);
    }
    const proxy = addBox(1.8,1.35,3.7,lam({ visible:false }),cx,0,cz,{ ry:cry });
    proxy.userData.originalVehicle = tipo;
  }
  // caçamba
  {
    const proxy = addBox(2.0, 1.2, 1.5, lam({ color: 0x566856 }), 0, 0, 5);
    glbSobre(proxy, 'dumpster', 0, 0, 5, 1.2);
  }
  // barraca de camelô
  const barraca = addBox(2.0, 2.0, 2.0, PAREDES[1], -10, 0, -3);
  glbSobre(barraca, 'stall', -10, 0, -3, 2.0);
  solids.push({ x0: -11, x1: -9, z0: -4, z1: -2 });
  // motos encostadas
  for (const [mx, mz, ry] of [[12, -5, 0.1], [-12, 5, Math.PI - 0.1]]) {
    const proxy = addBox(0.8, 1.2, 2.0, lam({ color: 0x34312d }), mx, 0, mz);
    glbSobre(proxy, 'moto_cg', mx, 0, mz, 1.2, ry);
  }
  // COVER DO BECO SUL (protege spawn B contra tiros das lajes e do beco central)
  casa(-9, 29, 4, 4, 3.5, 0);
  casa(9, 29, 4, 4, 3.5, 2);
  addBox(6.0, 2.0, 0.5, MAT.concrete, 0, 0, 28);   // mureta divisória entre beco sul e prédios

  /* ===================== GROUND HEIGHT (multinível) ===================== */
  function inFootprint(x, z) {
    for (const f of footprints) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1)
      return f.h1 === undefined ? f.h : f.h + (f.h1 - f.h) * (x - f.x0) / (f.x1 - f.x0);
    return 0;
  }
  function inStair(x, z) {
    for (const s of stairZones) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) return s;
    return null;
  }
  function groundHeightAt(x, z, yRef) {
    // escada: rampa
    const sz = inStair(x, z);
    if (sz) {
      const dist = Math.max(0, Math.min(STAIR_RUN, (z - sz.inicio) * sz.dz));
      /* degrau i tem o topo a (i+1)·espelho (lance cheio/vazado, buildStair) — a rampa
         andável tem que casar com o degrau, ou a MAP3 mede o desvio e o jogador afunda */
      const rampa0 = Math.min(N_STAIR, Math.round(dist / ESC.piso) + 1) * ESP;
      /* sob o patamar (laje de 12 cm com topo a LAJE_H) a superfície andável é o topo
         dele — o degrau embaixo some na laje e o A* lia o patamar como obstáculo */
      const rampa = (z - sz.cobre) * sz.dz > 0 ? LAJE_H : rampa0;
      /* Vão sob o lance alto (mesma regra da Havan): com ≥ 2,0 m livres e o corpo no
         piso, o chão daqui é o beco, não a escada. Sem yRef devolve o topo — as réguas
         e os waypoints continuam medindo a camada de cima. */
      if (rampa >= 2.0 && yRef != null && yRef < rampa - 1.2) return 0;
      return rampa;
    }
    // laje (topo de prédio) e tábua — camada de cima. Com yRef baixo devolve o beco:
    // é o que deixa o jogador andar SOB a tábua do beco e o cover ficar no chão.
    const fh = inFootprint(x, z);
    if (fh > 0) {
      if (yRef != null && yRef < fh - 1.2) return 0;
      return fh;
    }
    // beco (chão)
    return 0;
  }

  /* MAP5: somente os oito quadrantes que a régua mediu abaixo de 2,04 peças/100 m².
     São proxies de cover pequenos; seis recebem GLB quando carregado e todos mantêm o
     mesmo collider no browser e no harness. */
  const coverMat = lam({ color: 0x4d4940, roughness: 0.95 });
  const COBERTURA = [
    [-20.8, -32, 'tires'], [-12, -34], [-20.8, -3, 'pilha_pneus'], [-16, 20], [-12, 24], [-20.8, 34, 'tires'],
    [-8, -34, 'tires'], [-7, -37], [-4, -29], [-1, -29, 'pilha_pneus'], [-4, -17],
    [-8, -8, 'dumpster'], [-3, -5], [-4, -16],
    [-8, 7, 'tires'], [-3, 8], [-2, 16],
    [-3, 23, 'pilha_pneus'], [-7, 34],
    [3, -18], [5, -26, 'tires'], [7, -35],
    [3, -16], [8, -8, 'pilha_pneus'],
    [20.8, -32, 'tires'], [12, -34], [12, 8, 'pilha_pneus'], [12, 23], [16, 19], [20.8, 34, 'tires'],
  ];
  for (const [x, z, id] of COBERTURA) {
    const y = groundHeightAt(x, z, 0.5);   // cover é do beco: sem yRef ele nascia EM CIMA da tábua
    if (id) {
      const proxy = addBox(0.9, 0.9, 0.9, coverMat, x, y, z);
      glbSobre(proxy, id, x, y, z, 0.9);
    } else {
      const alongX = Math.abs(x) < 9 || Math.abs(z) > 28;
      const outer = Math.abs(z) > 28;
      const w = alongX ? (outer ? 2.1 : 1.25) : 0.28, d = alongX ? 0.28 : 1.25;
      addBox(w, 0.88, d, MAT.concreteDark, x, y, z);
      addBox(w + 0.08, 0.06, d + 0.08, MAT.concrete, x, y + 0.88, z, { collide: false, skirt: false });
      if (z === -34 && Math.abs(x) === 12) {
        const lado = x < 0 ? -1 : 1;
        const voltaZ = lado < 0 ? -1 : 1;
        const armD = 1.35, armX = x - lado * (w / 2 - 0.14);
        const armZ = z + voltaZ * (armD / 2 - 0.14);
        addBox(0.28, 0.88, armD, MAT.concreteDark, armX, y, armZ);
        addBox(0.36, 0.06, armD + 0.08, MAT.concrete, armX, y + 0.88, armZ,
          { collide: false, skirt: false });
      }
    }
  }

  const posteMat = lam({ color: 0x4b4842, roughness: 0.94 });
  const fioMat = lam({ color: 0x30302e, roughness: 0.88 });
  for (const x of [-18, 0, 18]) {
    addBox(0.14, 5.2, 0.14, posteMat, x, 0, -36.4, { collide: false, skirt: false });
    addBox(1.05, 0.09, 0.09, posteMat, x, 4.45, -36.4, { collide: false, skirt: false });
    for (const dx of [-0.42, -0.14, 0.14, 0.42]) addBox(0.07, 0.16, 0.07, MAT.concrete, x + dx, 4.54, -36.4,
      { collide: false, cast: false, skirt: false });
  }
  const fio = (pontos) => {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(
      pontos.map((p) => new THREE.Vector3(...p))), 16, 0.032, 6, false), fioMat);
    m.userData.overheadCable = true; m.userData.cableDiameter = 0.064; root.add(m);
  };
  for (const [dz, dy] of [[-0.30,0.08],[-0.10,0.02],[0.12,-0.04],[0.32,0.05]])
    fio([[-18,4.72 + dy,-36.4 + dz],[-9,4.5 + dy,-36.4 + dz],
      [0,4.72 + dy,-36.4 + dz],[9,4.5 + dy,-36.4 + dz],[18,4.72 + dy,-36.4 + dz]]);
  for (const [x, y] of [[-14,3.25],[-7.5,3.65],[0,4.55],[7.5,3.55],[14,3.25]])
    fio([[x,4.68,-36.35],[x,4.25,-33.5],[x,y,-31.18]]);
  for (const x of [-14, 0, 14]) {
    addBox(0.34, 0.46, 0.10, limiteMedidor, x, 1.15, -31.12,
      { collide: false, cast: false, skirt: false, vao: false });
    addBox(0.05, 1.35, 0.05, fioMat, x, 1.58, -31.2,
      { collide: false, cast: false, skirt: false, vao: false });
  }

  for (const z of [-8, 8]) {
    addBox(0.14, 5.0, 0.14, posteMat, 20.4, 0, z, { collide: false, skirt: false });
    addBox(0.09, 0.09, 1.0, posteMat, 20.4, 4.35, z, { collide: false, skirt: false });
  }
  for (const [dx, dy] of [[-0.18,0.06],[0,0],[0.18,-0.05]])
    fio([[20.4 + dx,4.55 + dy,-8],[20.2 + dx,4.34 + dy,0],[20.4 + dx,4.55 + dy,8]]);
  for (const z of [-7, 7]) {
    fio([[20.35,4.5,z],[19.5,3.65,z],[18.18,3.05,z]]);
    addBox(0.10, 0.48, 0.34, limiteMedidor,
      18.16, 1.1, z, { collide: false, cast: false, skirt: false, vao: false });
    addBox(0.05, 1.45, 0.05, fioMat, 18.10, 1.52, z,
      { collide: false, cast: false, skirt: false, vao: false });
  }

  /* ===================== WAYPOINTS + A* ===================== */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    const g = groundHeightAt(x, z);
    // sólidos só bloqueiam no NÍVEL DO CHÃO (g < 1 m). Nas lajes (g = 3,5+), o próprio
    // prédio NÃO é obstáculo — é o chão. Sem isto, todos os waypoints das lajes somem.
    if (g < 1.0) {
      for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true;
    }
    // Platibandas posteriores a `navColliderCount` protegem a queda, mas não apagam
    // os corredores centrais da malha A*: o raio físico continua resolvendo o contato.
    for (let i = 0; i < navColliderCount; i++) { const c = colliders[i]; if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15) return true; }
    return false;
  };
  // grade principal (pega becos e lajes)
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });

  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  // adensamento: becos estreitos entre prédios (não pegam nós da grade 3,4 m)
  // becos z-running entre fileira norte
  for (const bx of [-11, -3.5, 3.5, 11]) linha(bx, -31, bx, -13, 2.0);
  // becos z-running entre fileira sul
  for (const bx of [-11, -3.5, 3.5, 11]) linha(bx, 13, bx, 31, 2.0);
  // beco central (largo)
  for (const bz of [-8, -4, 0, 4, 8]) linha(-20, bz, 20, bz, 3.0);
  // lajes (topos de prédios) — adensamento de waypoints. Bloco do MEIO fora: laje
  // cenográfica sem acesso ensinaria o bot a atravessar parede.
  for (const e of EDIFICIOS.slice(0, 12)) {
    const N = 3;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const lx = e.x - e.w / 2 + (i + 0.5) * e.w / N;
      const lz = e.z - e.d / 2 + (j + 0.5) * e.d / N;
      if (!blocked(lx, lz, 0.3)) nodes.push({ x: lx, z: lz });
    }
  }
  // escadas: passo apertado
  for (const es of ESCADAS) {
    const topoZ = es.z + es.dz * STAIR_RUN;
    linha(es.x, es.z, es.x, topoZ, 0.9);
    linha(es.x, topoZ, es.x - Math.sign(es.x) * 3, topoZ, 0.6);
  }
  // tábuas: um fio de nós sobre cada prancha — é por aqui que o bot cruza de laje em laje
  for (const t of TABUAS) {
    const cx = (t.x0 + t.x1) / 2, cz = (t.z0 + t.z1) / 2;
    if (t.z1 - t.z0 > t.x1 - t.x0) linha(cx, t.z0 + 0.3, cx, t.z1 - 0.3, 1.2, 0.2);
    else linha(t.x0 + 0.3, cz, t.x1 - 0.3, cz, 1.2, 0.2);
  }
  // bordas e cantos
  linha(-HALF_X + 1, -HALF_Z + 1, -HALF_X + 1, HALF_Z - 1, 3.0);
  linha(HALF_X - 1, -HALF_Z + 1, HALF_X - 1, HALF_Z - 1, 3.0);
  linha(-HALF_X + 1, HALF_Z - 1, HALF_X - 1, HALF_Z - 1, 3.0);
  // corredores laterais (entre prédios e muro externo) — rotas alternativas para CTF2
  for (const ex of [-HALF_X + 2.5, HALF_X - 2.5]) {
    linha(ex, -35, ex, 35, 3.0);
  }
  // conexões dos corredores laterais com o beco central e beco sul
  for (const ex of [-HALF_X + 2.5, HALF_X - 2.5]) {
    linha(ex, 0, ex - Math.sign(ex) * 3, 0, 2.0);
    linha(ex, 13, ex, 17, 2.0);
    linha(ex, 28, ex - Math.sign(ex) * 3, 28, 2.0);
  }
  // O barraco de obra fecha o eixo x=7; esta linha mantém a bandeira P ligada pela
  // faixa central realmente livre entre as duas fachadas.
  linha(8.5, 12.8, 8.5, 22.2, 1.5, 0.25);

  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  const perto = (x, z) => { let b = 0, d0 = Infinity; for (let i = 0; i < nodes.length; i++) { const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2; if (d < d0) { d0 = d; b = i; } } return b; };
  const liga = (ax, az, bx, bz) => { const a = perto(ax, az), b = perto(bx, bz); if (!adj[a].includes(b)) adj[a].push(b); if (!adj[b].includes(a)) adj[b].push(a); };
  // Arestas dirigidas dos desníveis de 0,75 m das passarelas: o teste de segmento
  // (AABB 2D) lia a face do prédio como parede intransponível.
  for (const sx of [-1, 1]) {
    liga(sx * 4, -22, sx * 8, -22);
    liga(sx * 8, -22, sx * 12, -22);
    liga(sx * 12, -20, sx * 16, -17);
    liga(sx * 16, -17, sx * 18.9, -16.09);
  }
  liga(7.2, 15, 8.5, 15.8);
  function nearestWaypoint(x, z) { let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; b = i; } } return b; }
  const _D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z; return Math.sqrt(dx * dx + dz * dz); };
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const n = nodes.length, g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), open = new Uint8Array(n);
    g[fromIdx] = 0; f[fromIdx] = _D(fromIdx, toIdx); open[fromIdx] = 1; let oc = 1;
    while (oc > 0) {
      let cur = -1, bf = Infinity; for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; } if (cur === -1) break;
      if (cur === toIdx) { const p = [cur]; let c = prev[cur]; while (c !== -1) { p.unshift(c); c = prev[c]; } return p; }
      open[cur] = 0; oc--;
      for (const m of adj[cur]) { const t = g[cur] + _D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + _D(m, toIdx); if (!open[m]) { open[m] = 1; oc++; } } }
    }
    return [fromIdx];
  }

  /* ===================== SPAWNS =====================
     Time A (E) nas LAJES (norte, alto) — no prédio central largo (x ∈ [-6, 6])
     Time B (B) nos BECOS (sul, baixo) — na área aberta entre os prédios sul e o muro */
  const spawns = {
    E: [-3, -1, 1, 3].map(x => ({ x, z: -22, yaw: 0 })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 32, yaw: Math.PI })),
  };

  /* ===================== CTF — 4 BANDEIRAS ===================== */
  const ctfPoints = [
    { id: 'R', label: 'LAJE NORTE',  x: 7,   z: -22 },
    { id: 'E', label: 'BECO CENTRAL',x: -7,  z: 0 },
    { id: 'P', label: 'BECO SUL',    x: 7,   z: 15 },
    { id: 'B', label: 'FUNDO SUL',   x: -7,  z: 32 },
  ];

  /* ===================== ARSENAL NO CHÃO ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  // lajes norte
  place('ak', 0, -18);     place('m4', 0, -22);
  place('awp', 0, -27);    place('mp5', -4, -28);
  // beco central
  place('shotgun', -2, -6); place('mp5', 9, 6);
  place('deagle', 3, 7);    place('m4', -7, -6);
  // lajes sul
  place('ak', 7, 22);      place('shotgun', -7, 22);
  place('m400', 5, 28);    place('mp5', 0, 28);
  // escadas
  place('deagle', -20, 0); place('deagle', 20, 0);

  PB.build(root);
  SKIRT.build(root);

  if (!LOWQ && QP.get('shell') !== '0' && typeof document !== 'undefined') {
    loadShell(root, '/models/shells/lajes_completa.glb').then(() => {
      root.traverse((o) => { if (o.userData?.lajesVisualBase) o.visible = false; });
      root.getObjectByName('LAJES_SHELL')?.traverse((o) => { if (o.isMesh) occluders.push(o); });
    }).catch(() => {});
  }

  /* ===================== GRAFFITI ===================== */
  const D_LAJES = decalIds(T, ['pixo-lajes-01.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  grafitar({
    id: 'lajes', root, T, waypoints: nodes, seed: 6088, passo: 1.2, alcance: 9, cobre: 0.025, minLarg: 0.3,
    limpo: [...stairZones, { x0: 7.7, x1: 9.1, z0: -36.5, z1: -32.4 }],
    murais: {
      texturas: [T.decals[D_LAJES[0]]],
      nomes: ['pixo-lajes-01.png'], seed: 71, separacao: 20,
      larg: 4.2, alt: 2.2, minLarg: 3.2,
    },
    bandas: [
      { y0: 0.4, y1: 2.5, larg: 1.55, alturas: [0.9, 0.65, 0.45], chance: 9,
        pool: D_TAG },
    ],
  });

  const ambience = createFavelaAmbience(root, {
    map: 'lajes', low: LOWQ,
    rats: [
      { pos: [-8.1, groundHeightAt(-8.1, -1.8), -1.8], to: [-7.15, groundHeightAt(-7.15, -.45), -.45], phase: .2 },
      { pos: [8.25, groundHeightAt(8.25, 1.7), 1.7], to: [7.2, groundHeightAt(7.2, .25), .25], phase: 1.35 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-15, groundHeightAt(-15, -24), -24], phase: .4 },
      { mode: 'flight', pos: [0, 8.8, -7], radius: [5.4, 3.8], phase: .7 },
      { mode: 'flight', pos: [3, 10.2, 19], radius: [4.2, 3.2], phase: 2.4 },
    ],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints, ambience,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    stairs: ESCADAS.map((es) => ({ nome: es.nome, x0: es.x - 1.25, x1: es.x + 1.25,
      z0: Math.min(es.z, es.z + es.dz * STAIR_RUN), z1: Math.max(es.z, es.z + es.dz * STAIR_RUN), topo: LAJE_H })),
    levels: ESCADAS.map((es) => { const z = es.z + es.dz * STAIR_RUN; return { nome: `laje ${es.nome}`, x0: es.x - 1.5, x1: es.x + 1.5,
      z0: z - 1.5, z1: z + 1.5, dePartida: 'B' }; })
      /* cada telhado declarado como nível: a MAP3 prova, um por um, que dá para
         CHEGAR a pé (flood-fill) e pelo A* dos bots — foi o fim do salto que cobrou */
      .concat(EDIFICIOS.slice(0, 12).map((e, i) => ({ nome: `laje ${NOMES_LAJE[i]}`, x0: e.x - e.w / 2 + 0.6, x1: e.x + e.w / 2 - 0.6,
        z0: e.z - e.d / 2 + 0.6, z1: e.z + e.d / 2 - 0.6, dePartida: i === 1 ? 'A' : 'B' }))),
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
