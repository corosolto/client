import * as THREE from 'three';
import { placeProp, PropBatch } from './mapprops.js';
import { makeAerialFog } from './bloom.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { createFavelaAmbience, FAVELA_AMBIENCE_ASSETS } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch { return false; } })();
const ARCHITECTURE_ON = true;

export const LAJES_AUTHORED_ASSETS = Object.freeze([
  'lajes_casa_01', 'lajes_casa_02', 'lajes_casa_03', 'lajes_casa_04',
  'lajes_casa_05', 'lajes_casa_06', 'lajes_casa_07', 'lajes_varal', 'caixa_dagua',
]);
export const LAJES_CONNECTIONS = Object.freeze([
  'ESCADARIA', 'BECO DO VARAL', 'ACESSO SUL',
  'ROTA DE MADEIRA OESTE', 'ROTA DE MADEIRA LESTE',
]);
export const LAJES_LOOPS = Object.freeze({
  beco: 'espinha sinuosa inferior com três ramais e retornos pelas escadas',
  laje: 'duas travessias superiores independentes ligadas por tábuas ancoradas',
});
export const LAJES_AMBIENCE = FAVELA_AMBIENCE_ASSETS;
export const LAJES_PROPS = [...LAJES_AUTHORED_ASSETS,
  'moto_cg', 'stall', 'dumpster', 'pilha_pneus', 'botijao_gas'];

const ROOF_H = 5.2;
const HALF_X = 15.5;
const MIN_Z = -39;
const MAX_Z = 39;
const HOUSE_IDS = Object.freeze([
  'lajes_casa_01', 'lajes_casa_02', 'lajes_casa_03', 'lajes_casa_04',
  'lajes_casa_05', 'lajes_casa_06', 'lajes_casa_07',
]);
const ROOFS = Object.freeze([
  { name: 'CN', label: 'LAJE NORTE', x0: -4.6, x1: 4.6, z0: -36, z1: -28.5 },
  { name: 'NW', label: 'LAJE DA CAIXA', x0: -13.2, x1: -7.4, z0: -29, z1: -18, parts: [[-29, -24.1], [-22.9, -18]] },
  { name: 'NE', label: 'LAJE DO VARAL', x0: 7.4, x1: 13.2, z0: -29, z1: -18, parts: [[-29, -24.1], [-22.9, -18]] },
  { name: 'WN', label: 'LAJE OESTE NORTE', x0: -13.2, x1: -7.4, z0: -16.5, z1: -6, parts: [[-16.5, -11.9], [-10.7, -6]] },
  { name: 'EN', label: 'LAJE LESTE NORTE', x0: 7.4, x1: 13.2, z0: -16.5, z1: -6, parts: [[-16.5, -11.9], [-10.7, -6]] },
  { name: 'WS', label: 'LAJE OESTE MEIO', x0: -13.2, x1: -7.4, z0: -4.5, z1: 6, parts: [[-4.5, .1], [1.3, 6]] },
  { name: 'ES', label: 'LAJE LESTE MEIO', x0: 7.4, x1: 13.2, z0: -4.5, z1: 6, parts: [[-4.5, .1], [1.3, 6]] },
  { name: 'SW', label: 'LAJE DO CHURRASCO', x0: -13.2, x1: -7.4, z0: 7.5, z1: 27, parts: [[7.5, 13.2], [14.4, 20], [21.2, 27]] },
  { name: 'SE', label: 'LAJE DA PISCINA', x0: 7.4, x1: 13.2, z0: 7.5, z1: 27, parts: [[7.5, 13.2], [14.4, 20], [21.2, 27]] },
  { name: 'CS', label: 'LAJE SUL', x0: -4.6, x1: 4.6, z0: 28.5, z1: 36 },
  { name: 'MN', label: 'MIRANTE NORTE', x0: -5.9, x1: -1.5, z0: -13.5, z1: -8.5, tunnel: true },
  { name: 'MS', label: 'MIRANTE SUL', x0: -.6, x1: 3.8, z0: 23, z1: 27, tunnel: true },
]);
/* Pegadas nativas dos GLB do kit (minX,maxX,minZ,maxZ,altura), medidas com gltf-transform
   getBounds() em 16/08/2026 — o harness node não carrega GLB, então o colisor não pode
   nascer do Box3 em runtime: nasce desta tabela, idêntica nos dois mundos. */
const HOUSE_BOUNDS = Object.freeze({
  lajes_casa_01: [-1.15, 1.15, -3.22, 3.22, 6.15],
  lajes_casa_02: [-1.10, 1.10, -3.11, 3.11, 4.20],
  lajes_casa_03: [-1.20, 1.17, -2.28, 2.28, 6.75],
  lajes_casa_04: [-1.23, 1.30, -2.41, 4.01, 6.65],
  lajes_casa_05: [-1.16, 1.16, -3.13, 3.13, 6.11],
  lajes_casa_06: [-1.15, 1.15, -2.17, 2.17, 6.33],
  lajes_casa_07: [-1.10, 1.10, -3.27, 3.27, 6.18],
});
const ROOF_BY_NAME = new Map(ROOFS.map((roof) => [roof.name, roof]));
const ROOF_PARTS = Object.freeze(ROOFS.flatMap((roof) => (roof.parts || [[roof.z0, roof.z1]])
  .map(([z0, z1], part) => ({ ...roof, z0, z1, part }))));
const PLANKS = Object.freeze([
  { id: 'NW-WN', a: [-10.3, -18], b: [-10.3, -16.5] },
  { id: 'WN-WS', a: [-10.3, -6], b: [-10.3, -4.5] },
  { id: 'WS-SW', a: [-10.3, 6], b: [-10.3, 7.5] },
  { id: 'NE-EN', a: [10.3, -18], b: [10.3, -16.5] },
  { id: 'EN-ES', a: [10.3, -6], b: [10.3, -4.5] },
  { id: 'ES-SE', a: [10.3, 6], b: [10.3, 7.5] },
  { id: 'SW-CS', a: [-7.4, 27], b: [-2.5, 28.5] },
  { id: 'CS-SE', a: [2.5, 28.5], b: [7.4, 27] },
  { id: 'NW-CN', a: [-7.4, -27.2], b: [-2.5, -28.5] },
  { id: 'CN-NE', a: [2.5, -28.5], b: [7.4, -27.2] },
  { id: 'WN-MN', a: [-7.4, -11], b: [-5.9, -11] },
  { id: 'MS-SE', a: [3.8, 25], b: [7.4, 25] },
  { id: 'CS-MS', a: [3, 28.5], b: [3, 27] },
]);
const INTERNAL_PLANKS = Object.freeze(ROOFS.flatMap((roof) => {
  if (!roof.parts) return [];
  const x = roof.x1 < 0 ? -10.3 : roof.x0 > 0 ? 10.3 : (roof.x0 + roof.x1) / 2;
  return roof.parts.slice(1).map((part, index) => ({ id: `internal-${roof.name}-${index + 1}`,
    roof: roof.name, a: [x, roof.parts[index][1]], b: [x, part[0]] }));
}));
const MAIN_BECO = Object.freeze([
  [0, -27], [0, -18], [-3, -18], [-3, -10], [-3, -3],
  [2.5, -3], [2.5, 2], [2.5, 10], [-2, 10], [-2, 22], [1.5, 22], [1.5, 27.5],
]);
const BRANCHES = Object.freeze([
  [[-3, -10], [4.2, -10]], [[2.5, 2], [-4.2, 2]], [[1.5, 22], [4.2, 22]],
]);
const STAIR_CONFIGS = Object.freeze([
  { name: 'ESCADARIA', side: 1, bottomZ: -10, dirZ: 1 },
  { name: 'BECO DO VARAL', side: -1, bottomZ: 2, dirZ: 1 },
  { name: 'ACESSO SUL', side: 1, bottomZ: 22, dirZ: -1 },
]);

function setSky(scene) {
  if (typeof document === 'undefined') { scene.background = new THREE.Color(0xb8c8d2); return; }
  const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#9ebdd2'); gradient.addColorStop(.55, '#bacbd2'); gradient.addColorStop(1, '#d6c8af');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter; scene.background = texture;
}

export function buildLajes(scene, T) {
  const root = new THREE.Group(); root.name = 'LAJES_ROOF_FIRST'; scene.add(root);
  const colliders = [], occluders = [], pickups = [], stairSurfaces = [], plankSurfaces = [], mapStairs = [];
  const architectureBatch = new PropBatch({ bucket: 28, tag: 'lajes-roof-first' });

  const externalTexture = (path, repeatX, repeatY, fallback) => {
    if (typeof document === 'undefined') return fallback;
    const texture = new THREE.TextureLoader().load(path);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace; return texture;
  };
  const concrete = externalTexture('/img/textures/concrete_br.webp', 8, 14, T.concrete);
  const brick = externalTexture('/img/textures/lajes_tijolo_baiano_color.webp', 3, 2, T.dirt);
  const corrugated = externalTexture('/img/textures/pbr_corrugatedsteel009_color.webp', 4, 8, concrete);
  const mat = (options) => new THREE.MeshStandardMaterial({ roughness: .92, metalness: 0, ...options });
  const MAT = {
    ground: mat({ map: concrete, color: 0x777268 }), alley: mat({ map: concrete, color: 0x5d5d58 }),
    roof: mat({ map: concrete, color: 0xd8d2c8 }), stair: mat({ map: concrete, color: 0xa9a093 }),
    corrugated: mat({ map: corrugated, color: 0xb9b7ae, roughness: .82, metalness: .08 }),
    brick: mat({ map: brick, color: 0xad765e, roughness: .98 }), wood: mat({ color: 0x6d472b, roughness: .93 }),
    woodDark: mat({ color: 0x3e291d, roughness: .96 }), metal: mat({ color: 0x252728, metalness: .3, roughness: .75 }),
    proxy: new THREE.MeshBasicMaterial({ visible: false }), water: mat({ color: 0x3d4f43, roughness: .5 }),
    plaster: mat({ map: concrete, color: 0xcfc0a8, roughness: .95 }),
    pool: mat({ color: 0x2877a5, roughness: .55 }), poolWater: mat({ color: 0x62bed1, roughness: .25, transparent: true, opacity: .72 }),
    charcoal: mat({ color: 0x25211e, roughness: 1 }), kiteRed: mat({ color: 0xd63b42, side: THREE.DoubleSide }),
    kiteBlue: mat({ color: 0x2f70c1, side: THREE.DoubleSide }), kiteYellow: mat({ color: 0xf0bd2b, side: THREE.DoubleSide }),
  };

  const addFloor = (w, d, x, z, material, y = 0) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); mesh.receiveShadow = true;
    mesh.userData.nonSolidSurface = y < .05; root.add(mesh); return mesh;
  };
  const wallMatCache = new Map();
  const wallMat = (base, w, h) => {   // textura em escala de parede, não de piso
    const key = `${base.uuid}:${w.toFixed(1)}:${h.toFixed(1)}`;
    if (!wallMatCache.has(key)) {
      const m = base.clone();
      if (base.map) {
        m.map = base.map.clone();
        m.map.repeat.set(Math.max(1, Math.round(w / 1.9)), Math.max(1, Math.round(h / 1.9)));
        m.map.needsUpdate = true;
      }
      wallMatCache.set(key, m);
    }
    return wallMatCache.get(key);
  };
  /* Muro longo de fundo/beco com alívio de construção real: viga de coroamento, janela
     cega escura, remendo de reboco — a parede plana de 5,6 m lia como caixa cinza.
     R27 (crítico): o térreo lê plano demais — porta cega e medidor na altura do olho. */
  const wallWithRelief = (w, h, d, baseMat, x, z, seed) => {
    const mesh = addBox(w, h, d, wallMat(baseMat, Math.max(w, d), h), x, 0, z, { cast: false });
    mesh.userData.muroFundo = true;
    const alongX = w > d, face = (alongX ? d : w) / 2 + .015;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? w : .1, .14, alongX ? .1 : d), wallMat(MAT.stair, Math.max(w, d), .3));
    cap.position.set(x, h + .02, z); root.add(cap); occluders.push(cap);   // a viga de coroamento para bala também
    const len = Math.max(w, d), count = Math.max(1, Math.floor(len / 2.3));
    for (let k = 0; k < count; k++) {
      const t = (k + .5) / count - .5;
      /* Toda parede tem pelo menos uma porta E uma janela na altura do olho; o resto
         sorteia. Adesivo preto não lê porta — a porta tem batente e soleira. */
      const kind = k === 0 && count > 1 ? 2 : k === 1 ? 4 : (seed + k * 7) % 5;
      const ox = alongX ? x + t * len : x, oz = alongX ? z : z + t * len;
      const px = ox + (alongX ? 0 : face), pz = oz + (alongX ? face : 0);
      if (kind === 0) {   // janela cega alta
        const win = new THREE.Mesh(new THREE.BoxGeometry(alongX ? .72 : .05, .9, alongX ? .05 : .72), MAT.charcoal);
        win.position.set(px, 2.5 + (k % 2) * .8, pz); root.add(win);
      } else if (kind === 1) {   // remendo de reboco orgulhado
        const patch = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 1.3 : .06, .8, alongX ? .06 : 1.3), wallMat(MAT.roof, 1.3, .8));
        patch.position.set(px, 1.2 + (k % 3) * 1.1, pz); root.add(patch);
      } else if (kind === 2) {   // porta cega com batente e soleira
        const frame = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 1.14 : .09, 2.14, alongX ? .09 : 1.14), wallMat(MAT.stair, 1.2, 2.1));
        frame.position.set(px, 1.08, pz); root.add(frame);
        const door = new THREE.Mesh(new THREE.BoxGeometry(alongX ? .92 : .1, 1.98, alongX ? .1 : .92), MAT.charcoal);
        door.position.set(px + (alongX ? 0 : .015), 1.0, pz + (alongX ? .015 : 0)); root.add(door);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(alongX ? 1.2 : .22, .13, alongX ? .22 : 1.2), wallMat(MAT.stair, 1.2, .2));
        sill.position.set(px + (alongX ? 0 : .07), .065, pz + (alongX ? .07 : 0)); root.add(sill);
      } else if (kind === 3) {   // medidor de luz + conduite
        const meter = new THREE.Mesh(new THREE.BoxGeometry(alongX ? .3 : .1, .38, alongX ? .1 : .3), MAT.metal);
        meter.position.set(px, 1.75, pz); root.add(meter);
        const conduit = new THREE.Mesh(new THREE.BoxGeometry(alongX ? .05 : .04, h - 1.9, alongX ? .04 : .05), MAT.metal);
        conduit.position.set(px, (h + 1.75) / 2 + .05, pz); root.add(conduit);
      } else {   // janela com peitoril na altura do olho
        const win = new THREE.Mesh(new THREE.BoxGeometry(alongX ? .8 : .07, 1.0, alongX ? .07 : .8), MAT.charcoal);
        win.position.set(px, 1.55, pz); root.add(win);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(alongX ? .95 : .16, .1, alongX ? .16 : .95), wallMat(MAT.stair, .95, .15));
        sill.position.set(px + (alongX ? 0 : .05), 1.0, pz + (alongX ? .05 : 0)); root.add(sill);
      }
    }
    return mesh;
  };
  const addBox = (w, h, d, material, x, y, z, options = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y + h / 2, z); mesh.castShadow = options.cast !== false; mesh.receiveShadow = true;
    if (material === MAT.proxy) mesh.userData.proxyGLB = true;
    root.add(mesh);
    if (options.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h,
        minZ: z - d / 2, maxZ: z + d / 2 });
      if (!options.semBala) occluders.push(mesh);
    } else if (options.bala) occluders.push(mesh);   // laje/fáscia: para bala, não para corpo
    return mesh;
  };
  const batchHouse = (id, options) => {
    const sample = placeProp(id, { x: 0, y: options.y || 0, z: 0, targetH: options.targetH, ry: options.ry || 0 });
    if (!sample) return false;
    sample.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(sample);
    return architectureBatch.add(id, { ...options,
      x: options.x - (box.min.x + box.max.x) / 2,
      z: options.z - (box.min.z + box.max.z) / 2 });
  };
  /* Casa com corpo: o mesmo posicionamento do batchHouse, mas registrando colisor +
     occluder da pegada REAL (tabela HOUSE_BOUNDS — mesma matemática do placeProp). É o
     fim da caixa invisível maior que a fachada: bala, corpo e pixel veem a mesma parede. */
  const solidHouse = (id, options) => {
    const native = HOUSE_BOUNDS[id];
    if (!native) throw new Error(`casa sem pegada medida: ${id}`);
    const s = options.targetH / native[4];
    const ry = options.ry || 0;
    const hxL = (native[1] - native[0]) / 2 * s, hzL = (native[3] - native[2]) / 2 * s;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const hx = Math.abs(hxL * cs) + Math.abs(hzL * sn);
    const hz = Math.abs(-hxL * sn) + Math.abs(hzL * cs);
    const x = options.x, z = options.z;   // batchHouse centraliza a Box3 exatamente no alvo
    const y = options.y || 0;
    colliders.push({ minX: x - hx, maxX: x + hx, minY: y, maxY: y + options.targetH,
      minZ: z - hz, maxZ: z + hz });
    /* Sem proxy de bala: o occluder da casa é a PRÓPRIA malha instanciada (empurrada em
       build()). Caixa sólida divergia da silhueta real nos recuos e pergolados do kit —
       era o "bala=9 m, visível=26 m" da régua. */
    return batchHouse(id, options);
  };
  const detailFallback = (detail, targetH) => {
    const group = new THREE.Group();
    if (detail === 'tank') {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(.7, .66, targetH, 18), MAT.pool);
      body.position.y = targetH / 2; group.add(body);
      for (const y of [.3, .75].filter((v) => v < targetH)) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.69, .025, 6, 18), MAT.pool);
        ring.rotation.x = Math.PI / 2; ring.position.y = y; group.add(ring);
      }
    } else if (detail === 'clothesline') {
      for (const x of [-1.1, 1.1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, targetH, 8), MAT.metal);
        pole.position.set(x, targetH / 2, 0); group.add(pole);
      }
      const line = new THREE.Mesh(new THREE.BoxGeometry(2.2, .02, .02), MAT.metal); line.position.y = targetH * .87; group.add(line);
      for (let i = 0; i < 4; i++) {
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(.38, .5), [MAT.kiteRed, MAT.kiteBlue, MAT.kiteYellow][i % 3]);
        cloth.position.set(-.7 + i * .46, targetH * .65, .015); group.add(cloth);
      }
    }
    return group.children.length ? group : null;
  };
  const centerProp = (id, { x, y = 0, z, targetH, ry = 0, detail = '', solidRadius = 0, occlude = false }) => {
    const object = placeProp(id, { x: 0, y, z: 0, targetH, ry }) || detailFallback(detail, targetH);
    if (!object) return null;
    object.rotation.y = ry; object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    object.position.x += x - (box.min.x + box.max.x) / 2; object.position.z += z - (box.min.z + box.max.z) / 2;
    object.userData.lajesAuthored = id; if (detail) object.userData.rooftopDetail = detail;
    root.add(object);
    if (solidRadius) colliders.push({ minX: x - solidRadius, maxX: x + solidRadius, minY: y,
      maxY: y + targetH, minZ: z - solidRadius, maxZ: z + solidRadius });
    if (occlude) object.traverse((m) => { if (m.isMesh) occluders.push(m); });   // caixa d'água: a bala vê o tambor
    return object;
  };

  setSky(scene);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_lajes');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x635648, 1.18); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.75); sun.position.set(25, 45, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -34; sun.shadow.camera.right = 34; sun.shadow.camera.top = 44; sun.shadow.camera.bottom = -44;
  sun.shadow.camera.far = 180; sun.shadow.bias = -.0006; scene.add(sun); scene.add(sun.target);

  addFloor(48, 92, 0, 0, MAT.ground, -.04);

  /* Fileira de casas encostada no beco: a fachada GLB É a parede — colisor e occluder
     nascem da pegada real (solidHouse), e um muro de fundo visível sela os vãos entre
     casas. Nenhuma caixa invisível maior que a fachada (o "tiro no ar" do BUG-54). */
  const SHALLOW_HOUSES = ['lajes_casa_03', 'lajes_casa_06'];
  const tunnelPartAt = (x, z, margin = .45) => ROOF_PARTS.find((part) => part.tunnel
    && x > part.x0 - margin && x < part.x1 + margin && z > part.z0 - margin && z < part.z1 + margin);
  /* Faixa ocupada pelas escadarias (parede lateral + poço): casa nenhuma pode invadir,
     senão o fundo da casa aparece dentro do lance. */
  const stairBandAt = (x, z, hx, hz) => STAIR_CONFIGS.some((config) => {
    const sx0 = Math.min(config.side * 3.55, config.side * 7.1), sx1 = Math.max(config.side * 3.55, config.side * 7.1);
    const sz0 = Math.min(config.bottomZ - .7, config.bottomZ + config.dirZ * 4.9);
    const sz1 = Math.max(config.bottomZ - .7, config.bottomZ + config.dirZ * 4.9);
    return x + hx > sx0 && x - hx < sx1 && z + hz > sz0 && z - hz < sz1;
  });
  const addAlleySegment = (a, b, index, width = 1.75) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const tx = dx / length, tz = dz / length, nx = -tz, nz = tx;
    const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
    addFloor(Math.abs(dx) > Math.abs(dz) ? length + .5 : width,
      Math.abs(dx) > Math.abs(dz) ? width : length + .5, cx, cz, MAT.alley, .002);
    for (const side of [-1, 1]) {
      const hBase = 4.2 + ((index * 3 + (side > 0 ? 1 : 0)) % 4) * .38;
      const ry = Math.atan2(-(nx * side), -(nz * side));   // fachada (+z nativo) virada ao beco
      /* Folga real atrás da fileira: o miolo do mapa é zigue-zague, e uma casa de 4 m
         de fundo invade o beco vizinho. Mede a distância até a faixa livre de QUALQUER
         outro trecho/escada/bloco e só planta casa onde ela cabe; onde não cabe, o muro
         visível encosta no beco (muro rente de comunidade, não caixa invisível). */
      let clearance = 3.55;
      for (const other of alleySegments) {
        if (other === alleySegments[index]) continue;
        const [oa, ob] = other;
        if (Math.hypot(oa[0] - a[0], oa[1] - a[1]) < .01 || Math.hypot(oa[0] - b[0], oa[1] - b[1]) < .01
          || Math.hypot(ob[0] - a[0], ob[1] - a[1]) < .01 || Math.hypot(ob[0] - b[0], ob[1] - b[1]) < .01)
          continue;   // vizinho de esquina: a curva é fechada pela mitra, não pela folga
        for (let t = 0; t <= 1.0001; t += .1) {
          const px = a[0] + tx * length * t + nx * side * (width / 2);
          const pz = a[1] + tz * length * t + nz * side * (width / 2);
          const odx = ob[0] - oa[0], odz = ob[1] - oa[1], olen = Math.hypot(odx, odz);
          const proj = Math.max(0, Math.min(olen, ((px - oa[0]) * odx + (pz - oa[1]) * odz) / olen));
          const dist = Math.hypot(px - (oa[0] + odx * proj / olen), pz - (oa[1] + odz * proj / olen)) - 1.76 / 2;
          if (dist < clearance) clearance = dist;
        }
      }
      for (const part of ROOF_PARTS) {
        if (part.tunnel) continue;
        for (let t = 0; t <= 1.0001; t += .1) {
          const px = a[0] + tx * length * t + nx * side * (width / 2);
          const pz = a[1] + tz * length * t + nz * side * (width / 2);
          const qx = Math.max(part.x0, Math.min(px, part.x1)), qz = Math.max(part.z0, Math.min(pz, part.z1));
          const dist = Math.hypot(px - qx, pz - qz);
          if (dist < clearance) clearance = dist;
        }
      }
      for (const config of STAIR_CONFIGS) {
        const sx0 = Math.min(config.side * 3.55, config.side * 7.1), sx1 = Math.max(config.side * 3.55, config.side * 7.1);
        const sz0 = Math.min(config.bottomZ - .7, config.bottomZ + config.dirZ * 4.9);
        const sz1 = Math.max(config.bottomZ - .7, config.bottomZ + config.dirZ * 4.9);
        for (let t = 0; t <= 1.0001; t += .1) {
          const px = a[0] + tx * length * t + nx * side * (width / 2);
          const pz = a[1] + tz * length * t + nz * side * (width / 2);
          const qx = Math.max(sx0, Math.min(px, sx1)), qz = Math.max(sz0, Math.min(pz, sz1));
          const dist = Math.hypot(px - qx, pz - qz);
          if (dist < clearance) clearance = dist;
        }
      }
      let cursor = .95;
      let i = 0;
      let placedAny = false;
      while (clearance >= 1.6) {
        const pool = clearance < 3.2 ? SHALLOW_HOUSES : HOUSE_IDS;
        let id = pool[(index * 2 + i + (side > 0 ? 3 : 0)) % pool.length];
        let targetH = hBase + .2 + (i % 2) * .35;
        let native = HOUSE_BOUNDS[id];
        let s = targetH / native[4];
        const front = width / 2 + .02 + (i % 2) * .04;
        if (front + (native[3] - native[2]) * s > clearance + .45) {
          /* Não coube em altura cheia: térrea do modelo raso — sobrado ao lado de casa
             térrea é a textura real da comunidade, e cabe na folga medida (a folga já
             desconta a faixa livre do vizinho; +0,45 é o raio do corpo que ninguém usa). */
          id = SHALLOW_HOUSES[(index + i) % SHALLOW_HOUSES.length];
          native = HOUSE_BOUNDS[id];
          targetH = 4.2 + (i % 2) * .5;   // raso em altura plena: feição grande, fundo curto
          s = targetH / native[4];
        }
        const halfAlong = (native[1] - native[0]) / 2 * s;   // largura nativa: ao longo do beco
        const halfOut = (native[3] - native[2]) / 2 * s;     // profundidade nativa: de costas
        if (cursor + halfAlong * 2 > length - .95) break;
        const centro = cursor + halfAlong;
        const ux = a[0] + tx * centro + nx * side * (front + halfOut);
        const uz = a[1] + tz * centro + nz * side * (front + halfOut);
        if (!tunnelPartAt(ux, uz) && !stairBandAt(ux, uz, halfAlong, halfOut) && front + halfOut * 2 <= clearance + .45) {
          solidHouse(id, { x: ux, z: uz, targetH, ry });
          placedAny = true;
        } else if (cursor >= 1.3 && cursor + halfAlong * 2 <= length - 1.3) {
          /* Slot vetado (escada/túnel/folga) LONGE da boca: painel de muro rente cobre o
             vão, senão a fileira abre buraco na beira do beco. Perto da esquina o bolso
             da curva manda — nada de painel ali (regressão medida pelo LC2/LC4). */
          const pw = Math.abs(dx) > Math.abs(dz) ? halfAlong * 2 : .26;
          const pd = Math.abs(dx) > Math.abs(dz) ? .26 : halfAlong * 2;
          wallWithRelief(pw, 2.9 + ((index + i) % 3) * .45, pd, (index + i) % 2 ? MAT.brick : MAT.roof,
            a[0] + tx * centro + nx * side * (front + .01),
            a[1] + tz * centro + nz * side * (front + .01), index + i);
          placedAny = true;
        }
        cursor += halfAlong * 2 + .12;
        i++;
      }
      /* O muro não nasce aqui: cada lado vira uma wallLine e os intervalos são cortados
         depois — boca de ramal abre, faixa de túnel desconta, esquina fecha com poste.
         É o fim da caixa independente por trecho selando cotovelo (BUG-54). Lado sem
         casa ganha muro rente; lado com casa ganha muro de fundo atrás da fileira. */
      wallLines.push({ a, b, width, side, index, branch: index >= MAIN_BECO.length - 1,
        backOff: (placedAny ? Math.max(1.2, Math.min(3.55, clearance)) : .19) - .12 });
    }
  };
  const alleySegments = [];
  for (let i = 1; i < MAIN_BECO.length; i++) alleySegments.push([MAIN_BECO[i - 1], MAIN_BECO[i]]);
  alleySegments.push(...BRANCHES);
  const wallLines = [];
  alleySegments.forEach((segment, i) => addAlleySegment(segment[0], segment[1], i, i % 5 === 1 ? 1.62 : 1.76));

  /* Boca de ramal: o vértice é compartilhado com o beco principal; a parede do lado do
     ramal abre 0,95 m para cada lado do vértice. */
  const branchMouthAt = new Map();
  for (const branch of BRANCHES) {
    const dx = branch[1][0] - branch[0][0], dz = branch[1][1] - branch[0][1];
    const len = Math.hypot(dx, dz);
    branchMouthAt.set(`${branch[0][0]},${branch[0][1]}`, { dx: dx / len, dz: dz / len });
  }
  for (const wall of wallLines) {
    const [a, b] = [wall.a, wall.b];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const tx = dx / length, tz = dz / length, nx = -tz, nz = tx;
    const intervals = [[0, 1]];
    const corta = (t0, t1) => {
      for (let i = intervals.length - 1; i >= 0; i--) {
        const [s0, s1] = intervals[i];
        if (t1 <= s0 || t0 >= s1) continue;
        intervals.splice(i, 1);
        if (s0 < t0) intervals.push([s0, t0]);
        if (s1 > t1) intervals.push([t1, s1]);
      }
    };
    const cortaFaixas = () => {
      for (const part of ROOF_PARTS.filter((roof) => roof.tunnel)) {
        let lo = Infinity, hi = -Infinity;
        for (const [cxn, czn] of [[part.x0, part.z0], [part.x1, part.z0], [part.x0, part.z1], [part.x1, part.z1]]) {
          const t = ((cxn - a[0]) * tx + (czn - a[1]) * tz) / length;
          lo = Math.min(lo, t); hi = Math.max(hi, t);
        }
        const mx = a[0] + tx * length * (lo + hi) / 2, mz = a[1] + tz * length * (lo + hi) / 2;
        const qx = Math.max(part.x0, Math.min(mx, part.x1)), qz = Math.max(part.z0, Math.min(mz, part.z1));
        if (Math.hypot(mx - qx, mz - qz) < 1.2 && hi > lo) corta(lo, hi);
      }
      /* Faixa de escada: o muro para na entrada do poço — atravessar a boca isolava o pé
         da escada (o "X" do flood no primeiro lance da ESCADARIA). Roda DEPOIS da mitra
         também: a extensão externa não pode cruzar o poço. */
      for (const config of STAIR_CONFIGS) {
        const sx0 = Math.min(config.side * 3.55, config.side * 7.1) - .1, sx1 = Math.max(config.side * 3.55, config.side * 7.1) + .1;
        const sz0 = Math.min(config.bottomZ - .7, config.bottomZ + config.dirZ * 4.9);
        const sz1 = Math.max(config.bottomZ - .7, config.bottomZ + config.dirZ * 4.9);
        let lo = Infinity, hi = -Infinity;
        for (const [cxn, czn] of [[sx0, sz0], [sx1, sz0], [sx0, sz1], [sx1, sz1]]) {
          const t = ((cxn - a[0]) * tx + (czn - a[1]) * tz) / length;
          lo = Math.min(lo, t); hi = Math.max(hi, t);
        }
        const mx = a[0] + tx * length * (lo + hi) / 2, mz = a[1] + tz * length * (lo + hi) / 2;
        const qx = Math.max(sx0, Math.min(mx, sx1)), qz = Math.max(sz0, Math.min(mz, sz1));
        if (Math.hypot(mx - qx, mz - qz) < 1.0 && hi > lo) corta(lo, hi);
      }
    };
    cortaFaixas();
    /* Vértice de curva do beco principal: o muro do lado INTERNO para na faixa do
       vizinho; o do lado EXTERNO estende além do vértice até cruzar o muro vizinho
       (mitra) — a diagonal de fora da curva fica selada por malha visível. */
    for (const [ponto, t] of [[a, 0], [b, 1]]) {
      const mouth = branchMouthAt.get(`${ponto[0]},${ponto[1]}`);
      if (mouth) {
        const ladoDoRamal = (mouth.dx * nx + mouth.dz * nz) * wall.side > 0;
        if (ladoDoRamal) corta(t === 0 ? 0 : 1 - .95 / length, t === 0 ? .95 / length : 1);
        const recua = (mouth.dx * tx + mouth.dz * tz) * (t === 0 ? 1 : -1) > 0;
        if (recua) corta(t === 0 ? 0 : 1 - 1.05 / length, t === 0 ? 1.05 / length : 1);
      }
      for (const other of alleySegments) {
        if (other[0] === a && other[1] === b) continue;
        const share = (Math.hypot(other[0][0] - ponto[0], other[0][1] - ponto[1]) < .01 ? other[0]
          : Math.hypot(other[1][0] - ponto[0], other[1][1] - ponto[1]) < .01 ? other[1] : null);
        if (!share) continue;
        const odir = other[0] === share
          ? [other[1][0] - share[0], other[1][1] - share[1]] : [other[0][0] - share[0], other[0][1] - share[1]];
        const ol = Math.hypot(odir[0], odir[1]);
        const dot = (odir[0] / ol) * tx + (odir[1] / ol) * tz;
        if (Math.abs(dot) > .95) continue;   // colinear: o muro segue reto
        if (dot < -.95) continue;            // mesmo trecho ao contrário: segue reto
        const cross = tx * (odir[1] / ol) - tz * (odir[0] / ol);
        const outerSide = cross < 0 ? 1 : -1;   // incoming×outgoing: mesma regra nas duas pontas
        /* Junção em T (boca de ramal no mesmo vértice): nunca estender — a mitra
           atravessaria o corredor do ramal. */
        if (wall.branch || branchMouthAt.has(`${ponto[0]},${ponto[1]}`)) {
          corta(t === 0 ? 0 : 1 - 1.03 / length, t === 0 ? 1.03 / length : 1);
        } else if (wall.side === outerSide) {
          const offOutro = wallLines.find((wl) => wl.a === other[0] && wl.b === other[1] && wl.side === outerSide)?.backOff ?? .38;
          const ext = (1.76 / 2 + offOutro + .25) / length;
          if (t === 1) intervals.push([1, 1 + ext]); else intervals.push([-ext, 0]);
        } else {
          corta(t === 0 ? 0 : 1 - 1.03 / length, t === 0 ? 1.03 / length : 1);
        }
      }
    }
    cortaFaixas();   // segunda passada: a mitra estendida também respeita túnel e poço
    for (const [t0, t1] of intervals) {
      if ((t1 - t0) * length < .7) continue;
      const off = wall.width / 2 + wall.backOff;
      const wcx = a[0] + tx * length * (t0 + t1) / 2 + nx * wall.side * off;
      const wcz = a[1] + tz * length * (t0 + t1) / 2 + nz * wall.side * off;
      const wlen = (t1 - t0) * length + .24;
      const wh = 2.9 + ((wall.index * 7) % 4) * .45;
      const wallBase = [MAT.brick, MAT.roof, MAT.plaster, MAT.stair][wall.index % 4];
      wallWithRelief(Math.abs(dx) > Math.abs(dz) ? wlen : .24, wh,
        Math.abs(dx) > Math.abs(dz) ? .24 : wlen, wallBase, wcx, wcz, wall.index);
    }
  }
  /* (sem postes de canto: a mitra dos muros externos fecha a diagonal — ver acima) */
  /* Pilastra no canto INTERNO da curva: enquadra a boca do bolso (contrato: bolsa ≤ 2,4 m)
     sem fechar a curva — o corpo de 0,76 m passa pelos dois lados. */
  for (let i = 1; i < MAIN_BECO.length - 1; i++) {
    const A = MAIN_BECO[i - 1], V = MAIN_BECO[i], B = MAIN_BECO[i + 1];
    if (branchMouthAt.has(`${V[0]},${V[1]}`)) continue;
    const d1 = [V[0] - A[0], V[1] - A[1]], d2 = [B[0] - V[0], B[1] - V[1]];
    const l1 = Math.hypot(d1[0], d1[1]), l2 = Math.hypot(d2[0], d2[1]);
    const cross = (d1[0] / l1) * (d2[1] / l2) - (d1[1] / l1) * (d2[0] / l2);
    if (Math.abs(cross) < .3) continue;
    const inner = cross < 0 ? -1 : 1;
    const n1 = [-d1[1] / l1 * inner, d1[0] / l1 * inner], n2 = [-d2[1] / l2 * inner, d2[0] / l2 * inner];
    const mx = n1[0] + n2[0], mz = n1[1] + n2[1], ml = Math.hypot(mx, mz) || 1;
    const pil = addBox(.3, 2.9 + (i % 3) * .4, .3, MAT.brick, V[0] + (mx / ml) * 1.13, 0, V[1] + (mz / ml) * 1.13);
    pil.userData.muroFundo = true;
  }

  const TUNNEL_H = 2.5;
  const STAIR_TOPS = STAIR_CONFIGS.map((c) => [c.side * 7.4, c.bottomZ]);
  const roofAccessNear = (x, z) => STAIR_TOPS.some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.35);

  for (const roof of ROOFS) {
    const roofGroup = new THREE.Group(); roofGroup.name = `LAJE_${roof.name}`;
    roofGroup.userData.lajesRoof = roof.name; root.add(roofGroup);
    for (const part of ROOF_PARTS.filter((item) => item.name === roof.name)) {
      const w = part.x1 - part.x0, d = part.z1 - part.z0;
      const x = (part.x0 + part.x1) / 2, z = (part.z0 + part.z1) / 2;
      const roofIndex = ROOFS.indexOf(roof) + part.part;
      const slabMaterial = roofIndex % 4 === 1 ? MAT.corrugated : roofIndex % 4 === 2 ? MAT.stair : MAT.roof;
      if (part.tunnel) {
        /* Mirante sobre pilotis: o beco passa POR BAIXO em passagem coberta de ~2,1 m
           (pé-direito 2,5 m). As paredes laterais do túnel fecham a face do vão; as
           colunas de canto seguram o balanço da casa acima. */
        const body = addBox(w, ROOF_H - TUNNEL_H, d, MAT.proxy, x, TUNNEL_H, z, { semBala: true }); roofGroup.add(body);
        for (const cxn of [part.x0 + .3, part.x1 - .3]) for (const czn of [part.z0 + .3, part.z1 - .3]) {
          const col = addBox(.34, TUNNEL_H, .34, MAT.brick, cxn, 0, czn); roofGroup.add(col);
        }
        let corridorX = x;
        for (let mi = 1; mi < MAIN_BECO.length; mi++) {
          const [ma, mb] = [MAIN_BECO[mi - 1], MAIN_BECO[mi]];
          if (ma[0] === mb[0] && ma[0] > part.x0 && ma[0] < part.x1
            && Math.min(ma[1], mb[1]) < part.z1 && Math.max(ma[1], mb[1]) > part.z0) corridorX = ma[0];
        }
        for (const wx of [corridorX - 1.17, corridorX + 1.17]) {
          /* A parede lateral do túnel abre vão onde um ramal cruza (a boca do ramal 1
             ficava tapada pela parede leste do mirante norte — o jogador via parede onde
             o mapa diz passagem). */
          let spans = [[part.z0, part.z1]];
          for (const branch of BRANCHES) {
            const [ba, bb] = branch;
            if (Math.abs(ba[1] - bb[1]) > .1) continue;          // ramal ao longo de x
            const bz = ba[1];
            if (bz < part.z0 + .5 || bz > part.z1 - .5) continue;
            if (Math.max(ba[0], bb[0]) < part.x0 || Math.min(ba[0], bb[0]) > part.x1) continue;
            const next = [];
            for (const [s0, s1] of spans) {
              if (bz - .95 > s0 + .3) next.push([s0, bz - .95]);
              if (bz + .95 < s1 - .3) next.push([bz + .95, s1]);
            }
            spans = next;
          }
          for (const [z0i, z1i] of spans) {
            const infill = addBox(.24, TUNNEL_H, z1i - z0i, MAT.stair, wx, 0, (z0i + z1i) / 2);
            roofGroup.add(infill);
          }
        }
        batchHouse(HOUSE_IDS[(ROOFS.indexOf(roof) + 3) % HOUSE_IDS.length],
          { x, y: TUNNEL_H + .02, z, targetH: ROOF_H - TUNNEL_H - .07, ry: (roofIndex % 4) * Math.PI / 2 });
      } else {
        /* Corpo do bloco: colisor de corpo INTEGRAL (ninguém entra no prédio), mas NÃO
           occluder — a bala obedece às fachadas reais (solidHouse) e à laje (bala:true).
           Era a caixa invisível que matava o tiro no ar sobre as fachadas. */
        const body = addBox(w, ROOF_H, d, MAT.proxy, x, 0, z, { semBala: true });
        roofGroup.add(body);
        /* Faixa de fachada no perímetro do bloco: cada face do volume ganha casas reais
           do chão à laje (fim da laje flutuando sobre uma casa solta — C3). A face fica
           rente à do proxy, então bala, corpo e pixel concordam. */
        let fi = 0;
        for (const face of [
          { cx: x, cz: part.z0, dx: 1, dz: 0, len: w, outward: [0, -1], gap: part.z0 > roof.z0 },
          { cx: x, cz: part.z1, dx: 1, dz: 0, len: w, outward: [0, 1], gap: part.z1 < roof.z1 },
          { cx: part.x0, cz: z, dx: 0, dz: 1, len: d, outward: [-1, 0], gap: false },
          { cx: part.x1, cz: z, dx: 0, dz: 1, len: d, outward: [1, 0], gap: false },
        ]) {
          if (face.gap) {
            /* Face que mira o vão entre partes (a passagem de serviço sob a tábua
               interna): parede de divisa VISÍVEL rente, nunca casa profunda — casa ali
               estrangulava a passagem a 0,2 m (medido no flood do LC2). */
            const divisa = wallWithRelief(w, 4.35 + (roofIndex % 3) * .3, .12,
              roofIndex % 2 ? MAT.brick : MAT.plaster, x,
              face.cz - face.outward[1] * .09, roofIndex);
            roofGroup.add(divisa);
            continue;
          }
          let cursor = -face.len / 2 + .06;   // cursor = borda do slot; casa centrada no slot
          while (true) {
            let id = HOUSE_IDS[(roofIndex * 3 + fi) % HOUSE_IDS.length];
            let native = HOUSE_BOUNDS[id];
            const targetH = ROOF_H - .05;
            let s = targetH / native[4];
            const depthLimit = (face.dx ? part.z1 - part.z0 : part.x1 - part.x0) - .12;
            if ((native[3] - native[2]) * s > depthLimit) {
              id = SHALLOW_HOUSES[(roofIndex + fi) % SHALLOW_HOUSES.length];   // modelo fundo atravessa o bloco
              native = HOUSE_BOUNDS[id];
              s = targetH / native[4];
            }
            const halfAlong = (native[1] - native[0]) / 2 * s;
            const halfOut = (native[3] - native[2]) / 2 * s;
            if (cursor + halfAlong * 2 > face.len / 2 - .06) break;
            const centro = cursor + halfAlong;
            const hx = face.cx + face.dx * centro - face.outward[0] * (halfOut - .03);
            const hz = face.cz + face.dz * centro - face.outward[1] * (halfOut - .03);
            const ry = face.outward[1] === -1 ? Math.PI : face.outward[1] === 1 ? 0
              : face.outward[0] === 1 ? Math.PI / 2 : -Math.PI / 2;
            const hxW = face.dx ? halfAlong : halfOut, hzW = face.dx ? halfOut : halfAlong;
            const invadeGap = (part.z0 > roof.z0 && hz - hzW < part.z0 + .06)
              || (part.z1 < roof.z1 && hz + hzW > part.z1 - .06);
            if (!invadeGap && !stairBandAt(hx, hz, hxW, hzW) && !roofAccessNear(hx, hz))
              solidHouse(id, { x: hx, z: hz, targetH, ry });
            cursor += halfAlong * 2 + .14;
            fi++;
          }
        }
      }
      const slab = addBox(w, .16, d, slabMaterial, x, ROOF_H - .16, z, { collide: false, bala: true });
      roofGroup.add(slab);
      /* Borda quebrada (C2): fascia orgulhada da face, altura e material variando por
         trecho, mais remendos de reboco/tijolo — a laje deixa de ler como retângulo. */
      const fasciaH = .3 + (roofIndex % 3) * .07;
      const fasciaMat = [MAT.stair, MAT.brick, MAT.corrugated, MAT.roof][roofIndex % 4];
      for (const [fx, fz, fw, fd] of [
        [x, part.z0 - .02, w + .1, .2], [x, part.z1 + .02, w + .1, .2],
        [part.x0 - .02, z, .2, d + .1], [part.x1 + .02, z, .2, d + .1],
      ]) {
        const band = addBox(fw, fasciaH, fd, fasciaMat, fx, ROOF_H - fasciaH - .02, fz, { collide: false, bala: true, cast: false });
        band.userData.lajesFascia = true; roofGroup.add(band);
      }
      for (let patch = 0; patch < 3; patch++) {
        const sideIdx = (roofIndex + patch) % 4;
        const along = .25 + ((roofIndex * 7 + patch * 13) % 50) / 100;
        const px = sideIdx < 2 ? part.x0 + w * along : (sideIdx === 2 ? part.x0 - .06 : part.x1 + .06);
        const pz = sideIdx < 2 ? (sideIdx === 0 ? part.z0 - .06 : part.z1 + .06) : part.z0 + d * along;
        const pw = sideIdx < 2 ? .9 + (patch % 2) * .5 : .14;
        const pd = sideIdx < 2 ? .14 : .9 + (patch % 2) * .5;
        const remendo = addBox(pw, .22 + (patch % 3) * .11, pd, patch % 2 ? MAT.brick : MAT.stair,
          px, ROOF_H - .18, pz, { collide: false, bala: true, cast: false });
        remendo.userData.lajesFascia = true; roofGroup.add(remendo);
      }
    }
  }

  const plankAt = (x, z) => {
    for (const p of plankSurfaces) {
      const lx = (x - p.cx) * p.cos - (z - p.cz) * p.sin;
      const lz = (x - p.cx) * p.sin + (z - p.cz) * p.cos;
      if (Math.abs(lx) <= p.length / 2 && Math.abs(lz) <= p.width / 2) return p;
    }
    return null;
  };
  const addPlank = (config, index) => {
    const [ax, az] = config.a, [bx, bz] = config.b, dx = bx - ax, dz = bz - az;
    const spawnAccess = /(?:CN|CS)/.test(config.id);
    const rawLength = Math.hypot(dx, dz), length = rawLength + (spawnAccess ? 1.7 : 1.3), width = spawnAccess ? 2.15 : 1.8;
    const angle = -Math.atan2(dz, dx), cx = (ax + bx) / 2, cz = (az + bz) / 2;
    const group = new THREE.Group(); group.position.set(cx, ROOF_H, cz); group.rotation.y = angle; root.add(group);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(length, .11, width), MAT.wood);
    deck.position.y = -.055; deck.castShadow = true; deck.receiveShadow = true;
    deck.userData[config.id.startsWith('internal-') ? 'lajesInternalTabua' : 'lajesTabua'] = config.id; group.add(deck);
    occluders.push(deck);   // a tábua para bala também (o último atravessa-parede da régua)
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(length, .38, .07), MAT.woodDark);
      rail.position.set(0, .19, side * (width / 2 - .035)); rail.castShadow = true; group.add(rail);
      occluders.push(rail);   // guarda-corpo da tábua para bala também (era o atravessa da régua)
      const offset = side * (width / 2 - .035), cs = Math.cos(angle), sn = Math.sin(angle);
      const rcx = cx + offset * sn, rcz = cz + offset * cs, hx = length / 2, hz = .035;
      const ex = Math.abs(cs) * hx + Math.abs(sn) * hz, ez = Math.abs(sn) * hx + Math.abs(cs) * hz;
      colliders.push({ minX: rcx - ex, maxX: rcx + ex, minY: ROOF_H, maxY: ROOF_H + .38,
        minZ: rcz - ez, maxZ: rcz + ez, cx: rcx, cz: rcz, hx, hz, ry: angle, cos: cs, sin: sn });
    }
    for (let x = -length / 2 + .35; x < length / 2; x += .48) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(.025, .012, width - .12), MAT.woodDark);
      seam.position.set(x, .008, 0); group.add(seam);
    }
    const cos = Math.cos(angle), sin = Math.sin(angle);
    plankSurfaces.push({ ...config, cx, cz, length, width, cos, sin });
    if (index % 4 === 0) {
      const brace = addBox(.12, ROOF_H, .12, MAT.woodDark, cx, 0, cz, { collide: false });
      brace.userData.plankSupport = true;
    }
  };
  [...PLANKS, ...INTERNAL_PLANKS].forEach(addPlank);

  const addStaircase = (config) => {
    const width = 1.28, run = 4.2, steps = 15, tread = run / steps, halfRise = ROOF_H / 2;
    const innerX = config.side * 4.6, outerX = config.side * 6.05, topX = config.side * 7.4;
    const flights = [
      { x: innerX, z: config.bottomZ, dx: 0, dz: config.dirZ, base: 0, top: halfRise },
      { x: outerX, z: config.bottomZ + config.dirZ * run, dx: 0, dz: -config.dirZ, base: halfRise, top: ROOF_H },
    ];
    flights.forEach((flight, flightIndex) => {
      for (let i = 0; i < steps; i++) {
        const height = flight.base + (i + 1) * (flight.top - flight.base) / steps;
        const x = flight.x + flight.dx * (i + .5) * tread, z = flight.z + flight.dz * (i + .5) * tread;
        const step = addBox(width, height, tread + .01, MAT.stair, x, 0, z, { collide: false });
        step.userData.lajesStair = config.name; step.userData.stairFlight = flightIndex;
      }
      stairSurfaces.push({ type: 'flight', ...flight, width, run, steps });
      mapStairs.push({ nome: `${config.name} L${flightIndex + 1}`,
        x0: flight.x - width / 2, x1: flight.x + width / 2,
        z0: Math.min(flight.z, flight.z + flight.dz * run), z1: Math.max(flight.z, flight.z + flight.dz * run) });
    });
    const midX = (innerX + outerX) / 2, midZ = config.bottomZ + config.dirZ * run;
    addBox(Math.abs(outerX - innerX) + width, .16, width, MAT.stair, midX, halfRise - .16, midZ, { collide: false, bala: true });
    stairSurfaces.push({ type: 'landing', x0: Math.min(innerX, outerX) - width / 2,
      x1: Math.max(innerX, outerX) + width / 2, z0: midZ - width / 2, z1: midZ + width / 2, y: halfRise });
    const topMidX = (outerX + topX) / 2;
    addBox(Math.abs(topX - outerX) + width, .16, width, MAT.stair, topMidX, ROOF_H - .16, config.bottomZ, { collide: false, bala: true });
    stairSurfaces.push({ type: 'landing', x0: Math.min(outerX, topX) - width / 2,
      x1: Math.max(outerX, topX) + width / 2, z0: config.bottomZ - width / 2, z1: config.bottomZ + width / 2, y: ROOF_H });
    /* Guarda nas bordas laterais do patamar de topo (MAP6): a borda de CHEGADA do lance
       fica aberta só no trecho do lance; o restante da borda e a borda oposta levam guarda. */
    const chegadaZ = config.bottomZ + config.dirZ * width / 2;
    const opostaZ = config.bottomZ - config.dirZ * width / 2;
    addBox(Math.abs(topX - outerX) + width, .62, .14, MAT.brick, topMidX, ROOF_H, opostaZ);
    const livreAte = outerX + Math.sign(topX - outerX) * width / 2;
    const bordaAte = topX + Math.sign(topX - outerX) * width / 2;
    const gA = Math.min(livreAte, bordaAte), gB = Math.max(livreAte, bordaAte);
    if (gB - gA > .3) addBox(gB - gA, .62, .14, MAT.brick, (gA + gB) / 2, ROOF_H, chegadaZ);
    const left = Math.min(innerX, outerX) - width / 2 - .12, right = Math.max(innerX, outerX) + width / 2 + .12;
    /* Paredes do poço da escada são VISÍVEIS (tijolo) e PARAM 1,8 m depois do pé do
       lance: cruzar a faixa do ramal isolava o pé da escada num enclave de 14 células. */
    for (const x of [left, right]) addBox(.18, 5.9, run + .65 - 1.8, wallMat(MAT.brick, run, 5.9), x, 0,
      config.bottomZ + config.dirZ * (1.8 + (run + .65 - 1.8) / 2));
    addBox(.14, 5.7, run - 1.25, MAT.stair, (innerX + outerX) / 2, 0,
      config.bottomZ + config.dirZ * (run / 2 - .1));
    const facadeX = config.side > 0 ? right + 4.2 : left - 4.2;
    batchHouse(HOUSE_IDS[(STAIR_CONFIGS.indexOf(config) * 2 + 1) % HOUSE_IDS.length],
      { x: facadeX, z: config.bottomZ + config.dirZ * (run / 2 + .45), targetH: 6.45,
        ry: config.side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    return {
      nome: config.name, width,
      flights: [{ steps, direction: [0, config.dirZ] }, { steps, direction: [0, -config.dirZ] }],
      landings: [{ x: midX, z: midZ }, { x: topMidX, z: config.bottomZ }],
      bottom: { x: innerX, z: config.bottomZ }, top: { x: topX, z: config.bottomZ }, topo: ROOF_H,
    };
  };
  const stairs = STAIR_CONFIGS.map(addStaircase);

  /* CHÃO MULTINÍVEL (yRef): a mesma regra da Havan (map_havan.js:1632). Laje e tábua
     têm chão embaixo quando há pé-direito; quem cai de cima pousa na laje, quem já está
     no beco fica no térreo. Mirantes (tunnel) abrem vão de 2,5 m sobre o beco.
     Sem yRef devolve o topo — comportamento antigo de todas as réguas. */
  const ALTURA_LIVRE = 1.95, STEP_TOL = .55;
  function groundHeightAt(x, z, yRef) {
    let topo = 0;
    const camadas = [];
    for (const roof of ROOF_PARTS) {
      if (x >= roof.x0 && x <= roof.x1 && z >= roof.z0 && z <= roof.z1) {
        topo = Math.max(topo, ROOF_H);
        if (roof.tunnel && TUNNEL_H >= ALTURA_LIVRE) camadas.push(0);
      }
    }
    if (plankAt(x, z)) { topo = Math.max(topo, ROOF_H); camadas.push(0); }
    for (const surface of stairSurfaces) {
      let h = 0;
      if (surface.type === 'landing') {
        if (x >= surface.x0 && x <= surface.x1 && z >= surface.z0 && z <= surface.z1) h = surface.y;
      } else {
        const along = (x - surface.x) * surface.dx + (z - surface.z) * surface.dz;
        const lateral = Math.abs(-(x - surface.x) * surface.dz + (z - surface.z) * surface.dx);
        if (along >= 0 && along <= surface.run && lateral <= surface.width / 2) {
          const step = Math.min(surface.steps, Math.floor(along / (surface.run / surface.steps)) + 1);
          h = surface.base + step * (surface.top - surface.base) / surface.steps;
        }
      }
      if (h > 0) {
        topo = Math.max(topo, h);
        if (h >= ALTURA_LIVRE) camadas.push(0);
      }
    }
    if (yRef == null || !camadas.length) return topo;
    let melhor = camadas[0];
    for (const c of [...camadas, topo]) if (c <= yRef + STEP_TOL && c > melhor) melhor = c;
    return melhor;
  }

  const guardKeys = new Set();
  const accessPoints = [...PLANKS, ...INTERNAL_PLANKS].flatMap((plank) => [plank.a, plank.b]);
  accessPoints.push(...stairs.map((stair) => [stair.top.x, stair.top.z]));
  const roofAccessOnHorizontal = (x, z) => accessPoints.some(([px, pz]) => Math.abs(pz - z) < .1 && Math.abs(px - x) < .9);
  const roofAccessOnVertical = (x, z) => accessPoints.some(([px, pz]) => Math.abs(px - x) < .1 && Math.abs(pz - z) < .9);
  const guard = (x, z, alongX, length, index) => {
    const key = `${x.toFixed(2)}:${z.toFixed(2)}:${alongX ? 'x' : 'z'}`;
    if (guardKeys.has(key)) return; guardKeys.add(key);
    const spawnFront = Math.abs(Math.abs(z) - 28.5) < .08;
    const height = spawnFront ? .44 : index % 5 === 0 ? .76 : .62;
    addBox(alongX ? length : .14, height, alongX ? .14 : length,
      index % 5 === 0 ? MAT.brick : index % 5 === 3 ? MAT.woodDark : MAT.stair, x, ROOF_H, z);
  };
  for (let partIndex = 0; partIndex < ROOF_PARTS.length; partIndex++) {
    const part = ROOF_PARTS[partIndex], step = .82;
    for (let x = part.x0 + step / 2; x < part.x1; x += step) {
      const length = Math.min(step + .03, part.x1 - x + step / 2);
      if (groundHeightAt(x, part.z0 - .34) < 4 && !roofAccessOnHorizontal(x, part.z0)) guard(x, part.z0, true, length, partIndex);
      if (groundHeightAt(x, part.z1 + .34) < 4 && !roofAccessOnHorizontal(x, part.z1)) guard(x, part.z1, true, length, partIndex + 1);
    }
    for (let z = part.z0 + step / 2; z < part.z1; z += step) {
      const length = Math.min(step + .03, part.z1 - z + step / 2);
      if (groundHeightAt(part.x0 - .34, z) < 4 && !roofAccessOnVertical(part.x0, z)) guard(part.x0, z, false, length, partIndex + 2);
      if (groundHeightAt(part.x1 + .34, z) < 4 && !roofAccessOnVertical(part.x1, z)) guard(part.x1, z, false, length, partIndex + 3);
    }
  }

  /* MURO DE PERÍMETRO VISÍVEL (o "limite legível" do teste do dono): o casario de fundo
     continua além dele como cenário, mas o chão jogável termina numa parede que existe
     no pixel — nada de clamp invisível em campo aberto. As faixas laterais entre os
     blocos e o muro viram o beco de fundo do circuito inferior. */
  const perimeterMats = [MAT.brick, MAT.stair, MAT.corrugated, MAT.roof];
  let periIdx = 0;
  const perimeterRun = (alongX, fixed, from, to) => {
    let cursor = from;
    while (cursor < to - .3) {
      const seg = Math.min(5.2 + (periIdx % 3) * 1.4, to - cursor);
      const h = 2.7 + (periIdx % 4) * .22;
      const x = alongX ? cursor + seg / 2 : fixed;
      const z = alongX ? fixed : cursor + seg / 2;
      const mesh = addBox(alongX ? seg + .06 : .3, h, alongX ? .3 : seg + .06,
        wallMat(perimeterMats[periIdx % perimeterMats.length], seg, h), x, 0, z);
      mesh.userData.muroPerimetro = true;
      if (periIdx % 5 === 2) {   // portão de zinco encostado: varia a leitura do limite
        const gate = addBox(alongX ? 1.7 : .1, 2.1, alongX ? .1 : 1.7, MAT.metal,
          alongX ? x : fixed - Math.sign(fixed) * .22, 0,
          alongX ? fixed - Math.sign(fixed) * .22 : z, { collide: false, cast: false });
        gate.userData.muroPerimetro = true;
      }
      cursor += seg - .04;
      periIdx++;
    }
  };
  perimeterRun(false, -15.32, MIN_Z + .3, MAX_Z - .3);
  perimeterRun(false, 15.32, MIN_Z + .3, MAX_Z - .3);
  perimeterRun(true, MIN_Z + .32, -HALF_X + .3, HALF_X - .3);
  perimeterRun(true, MAX_Z - .32, -HALF_X + .3, HALF_X - .3);

  const addAntenna = (x, y, z, rotation = 0) => {
    const group = new THREE.Group(); group.position.set(x, y, z); group.rotation.y = rotation;
    group.userData.rooftopDetail = 'antenna';
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, 2.25, 8), MAT.metal); mast.position.y = 1.125; group.add(mast);
    const boom = new THREE.Mesh(new THREE.BoxGeometry(1.2, .045, .045), MAT.metal); boom.position.y = 2; group.add(boom);
    for (let i = -2; i <= 2; i++) {
      const rod = new THREE.Mesh(new THREE.BoxGeometry(.035, .035, .62 - Math.abs(i) * .06), MAT.metal);
      rod.position.set(i * .23, 2, 0); group.add(rod);
    }
    root.add(group); return group;
  };
  const roofDetails = [
    [-12.05, -25], [12.05, -25], [-12.05, -9], [12.05, -9],
    [-12.05, 2.4], [12.05, 2.4], [-12.05, 18], [12.05, 18],
  ];
  roofDetails.forEach(([x, z], i) => {
    const tank = centerProp('caixa_dagua', { x, y: ROOF_H, z,
      targetH: 1.35 + (i % 3) * .13, ry: i * .21, detail: 'tank', solidRadius: .64, occlude: true });
    if (!tank) return;
    /* Variação preta/azul + ligação de PVC: a caixa genérica cinza lia como tambor.
       Multiplica o albedo do clone (placeProp clona; o material é clonado de novo aqui
       para não tingir o template compartilhado). */
    const tinte = [0x555b61, 0x35689c, 0x555b61, 0x6b7076, 0x35689c][i % 5];
    tank.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      m.material.color.multiply(new THREE.Color(tinte));
    });
    const part = ROOF_PARTS.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
    if (part) {
      const pvc = MAT.stair.clone(); pvc.color = new THREE.Color(0xd8d5ce);
      const edgeX = x - part.x0 < part.x1 - x ? part.x0 + .12 : part.x1 - .12;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, ROOF_H + .5, 8), pvc);
      pipe.position.set(edgeX, (ROOF_H + .5) / 2 - .25, z); pipe.castShadow = true;
      pipe.userData.rooftopDetail = 'pvc'; root.add(pipe);
      const elbow = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, Math.abs(x - edgeX) + .1, 8), pvc);
      elbow.rotation.z = Math.PI / 2; elbow.position.set((x + edgeX) / 2, ROOF_H + .22, z);
      elbow.userData.rooftopDetail = 'pvc'; root.add(elbow);
    }
  });
  for (const [x, z, r] of [[-11.8, -20, .2], [11.7, -20, -.2], [-11.8, 8.8, .4], [11.7, 9, -.35], [-3.5, 33, .1], [3.2, -33, -.1]])
    addAntenna(x, ROOF_H, z, r);
  for (const [x, z, ry] of [[-9.4, -14, 0], [9.4, -2, 0], [-9.4, 15.5, 0], [9.4, 24, 0], [-1.5, 32, Math.PI / 2]])
    centerProp('lajes_varal', { x, y: ROOF_H, z, targetH: 1.4, ry, detail: 'clothesline' });
  centerProp('lajes_varal', { x: -2.62, z: 12.2, targetH: 1.55, ry: 0 });

  const addPool = (x, z) => {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, .55, 24, 1, true), MAT.pool);
    shell.position.set(x, ROOF_H + .275, z); shell.castShadow = true; root.add(shell); occluders.push(shell);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1.28, 24), MAT.poolWater);
    water.rotation.x = -Math.PI / 2; water.position.set(x, ROOF_H + .49, z); root.add(water);
    colliders.push({ minX: x - 1.36, maxX: x + 1.36, minY: ROOF_H, maxY: ROOF_H + .58,
      minZ: z - 1.36, maxZ: z + 1.36 });
  };
  addPool(8.3, 17.5); addPool(-9.6, 3.9);   // a leste era (9.7,15.7): em cima do pouso da tábua interna (VM14)
  const addBarbecue = (x, z) => {
    addBox(.78, .72, .6, MAT.brick, x, ROOF_H, z, { collide: false, bala: true });
    addBox(.58, .08, .42, MAT.charcoal, x, ROOF_H + .66, z, { collide: false, bala: true });
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(.11, .14, 1.3, 10), MAT.metal);
    chimney.position.set(x + .23, ROOF_H + 1.31, z); root.add(chimney); occluders.push(chimney);
    colliders.push({ minX: x - .42, maxX: x + .42, minY: ROOF_H, maxY: ROOF_H + 1.96,
      minZ: z - .34, maxZ: z + .34 });
  };
  addBarbecue(-11.9, 11.2); addBarbecue(3.55, 34.5);
  for (const [x, z, color] of [[-11.5, 14.8, 0xe05f39], [-8.5, 16.2, 0x2c79a0], [-3.55, 34.5, 0xf0b52e], [3.55, -34.5, 0x3d8b62]]) {
    const seat = addBox(.55, .08, .55, mat({ color }), x, ROOF_H + .42, z, { collide: false, bala: true });
    seat.userData.rooftopUse = 'cadeira';
    addBox(.08, .45, .55, seat.material, x, ROOF_H + .45, z + .27, { collide: false, bala: true });
    for (const sx of [-.21, .21]) for (const sz of [-.21, .21]) addBox(.06, .42, .06, seat.material,
      x + sx, ROOF_H, z + sz, { collide: false });
    colliders.push({ minX: x - .32, maxX: x + .32, minY: ROOF_H, maxY: ROOF_H + .95,
      minZ: z - .32, maxZ: z + .58 });
  }

  for (const segment of alleySegments) {
    const [a, b] = segment, dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    if (length < 3) continue;
    const water = addFloor(Math.abs(dx) > Math.abs(dz) ? length - .6 : .24,
      Math.abs(dx) > Math.abs(dz) ? .24 : length - .6, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, MAT.water, .018);
    water.userData.runningDrain = true;
  }
  for (const [x, z] of [[0, -23], [-3, -14], [2.5, 6], [-2, 16], [0, 25]]) {
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .035, 18), MAT.metal);
    cover.rotation.x = Math.PI / 2; cover.position.set(x, .035, z); cover.userData.manhole = true; root.add(cover);
  }

  const poles = [[-5.8, -26], [5.7, -21], [-5.8, -13], [5.7, -5], [-5.8, 4], [5.7, 12], [-5.8, 21], [5.7, 28]];
  for (const [x, z] of poles) addBox(.14, 9.8, .14, MAT.metal, x, 0, z, { collide: false });
  const addWire = (a, b, sag, offset) => {
    const A = new THREE.Vector3(a[0], a[1] + offset, a[2]), B = new THREE.Vector3(b[0], b[1] + offset, b[2]);
    const mid = A.clone().lerp(B, .5); mid.y -= sag;
    const curve = new THREE.CatmullRomCurve3([A, mid, B]);
    const wire = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, .032, 5, false), MAT.metal);
    wire.userData.overheadCable = true; wire.userData.cableDiameter = .064; root.add(wire);
  };
  for (let i = 1; i < poles.length; i++) {
    const a = [poles[i - 1][0], 9.45, poles[i - 1][1]], b = [poles[i][0], 9.35, poles[i][1]];
    for (const offset of [-.12, 0, .12]) addWire(a, b, .45 + (i % 3) * .12, offset);
  }
  for (const [x, z] of [[-13.4, -10], [13.4, -2], [-13.4, 17], [13.4, 20]])
    addWire([x < 0 ? -5.8 : 5.7, 9.3, z - 2], [x, 8.4, z], .7, 0);

  const kiteMaterials = [MAT.kiteRed, MAT.kiteBlue, MAT.kiteYellow];
  const addKite = (x, y, z, scale, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      0, scale, 0, -scale * .72, 0, 0, 0, -scale * 1.08, 0,
      0, scale, 0, 0, -scale * 1.08, 0, scale * .72, 0, 0,
    ], 3)); geometry.computeVertexNormals();
    const kite = new THREE.Mesh(geometry, kiteMaterials[index % kiteMaterials.length]);
    kite.position.set(x, y, z); kite.rotation.set(.08 * (index % 3), .35 * index, -.12 + .04 * index);
    kite.userData.skyLife = 'pipa'; root.add(kite);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, y - scale, z), new THREE.Vector3(x + .3, y - scale * 2.1, z + .15),
      new THREE.Vector3(x - .15, y - scale * 3.2, z + .25),
    ]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 8, .012, 4), MAT.woodDark); root.add(tail);
  };
  const kites = [[-15, 15, -30], [-8, 18, -20], [2, 16, -25], [11, 20, -14], [17, 17, -4],
    [-17, 19, 7], [-9, 14, 15], [1, 21, 7], [8, 17, 21], [15, 22, 29], [-3, 15, 34], [5, 19, 37]];
  kites.forEach((kite, i) => addKite(kite[0], kite[1], kite[2], .42 + (i % 3) * .1, i));
  for (const [x, z] of [[-8.7, 20], [2, -30]]) {
    const reel = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, .34, 16), MAT.wood);
    reel.rotation.z = Math.PI / 2; reel.position.set(x, ROOF_H + .22, z); reel.userData.rooftopUse = 'carretel'; root.add(reel);
  }

  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(-.2, -1.5); arrowShape.lineTo(.2, -1.5); arrowShape.lineTo(.2, .48);
  arrowShape.lineTo(.62, .48); arrowShape.lineTo(0, 1.5); arrowShape.lineTo(-.62, .48);
  arrowShape.lineTo(-.2, .48); arrowShape.closePath();
  const addRouteArrow = (from, to, color) => {
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), mat({ color, transparent: true, opacity: .72,
      polygonOffset: true, polygonOffsetFactor: -2 }));
    const dx = to[0] - from[0], dz = to[1] - from[1];
    arrow.rotation.x = -Math.PI / 2; arrow.rotation.y = Math.atan2(-dx, -dz);
    arrow.position.set((from[0] + to[0]) / 2, ROOF_H + .012, (from[1] + to[1]) / 2);
    arrow.userData.routeCue = true; root.add(arrow);
  };
  addRouteArrow([-1.2, -32.2], [-2.45, -28.7], 0x2f7394);
  addRouteArrow([1.2, -32.2], [2.45, -28.7], 0x4d8651);
  addRouteArrow([-1.2, 32.2], [-2.45, 28.7], 0x2f7394);
  addRouteArrow([1.2, 32.2], [2.45, 28.7], 0x4d8651);

  for (const [wing, color, x, z] of [['oeste', 0x2f7394, -11.8, -33], ['norte-sul', 0xc36c35, 0, -34], ['leste', 0x4d8651, 11.8, -33]]) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(.48, .52, 1.45, 14), mat({ color }));
    marker.position.set(x, ROOF_H + .725, z); marker.userData.lajesWing = wing; root.add(marker);
  }

  /* Contrato do tiro (BUG-54): a malha instanciada das casas É o occluder — coletado
     ANTES do backdrop existir, para o pano de fundo ficar fora do raycast da bala
     (100 instâncias de cenário custavam 0,58 ms/raio, medido em 16/08). */
  architectureBatch.build(root);
  const batchMeshes = [];
  root.traverse((o) => { if (o.isInstancedMesh) batchMeshes.push(o); });
  occluders.push(...batchMeshes);

  if (ARCHITECTURE_ON) {
    /* Cenário de fundo em batch PRÓPRIO: continua desenhado (a silhueta aprovada), mas
       fora de `occluders` — 100 instâncias de pano de fundo custavam 0,58 ms/raio no
       raycast da bala (medido em 16/08, perf-raycast), e o muro de perímetro já para o
       tiro a nível de rua. */
    const backdropBatch = new PropBatch({ bucket: 28, tag: 'lajes-backdrop' });
    const backdropHouse = (id, options) => {
      const sample = placeProp(id, { x: 0, y: options.y || 0, z: 0, targetH: options.targetH, ry: options.ry || 0 });
      if (!sample) return false;
      sample.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(sample);
      return backdropBatch.add(id, { ...options,
        x: options.x - (box.min.x + box.max.x) / 2,
        z: options.z - (box.min.z + box.max.z) / 2 });
    };
    for (const side of [-1, 1]) for (let i = 0; i < 17; i++) {
      const x = side * (17.2 + (i % 3) * .7), z = -37 + i * 4.7 + ((i % 3) - 1) * .35;
      backdropHouse(HOUSE_IDS[(i * 3 + (side > 0 ? 2 : 0)) % HOUSE_IDS.length],
        { x, z, targetH: 5.5 + (i % 5) * .52, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
    for (const end of [-1, 1]) for (let i = 0; i < 12; i++) {
      const x = -18 + i * 3.25 + Math.sin(i * 1.7) * .35, z = end < 0 ? -42.5 - (i % 3) * .45 : 42 + (i % 3) * .45;
      backdropHouse(HOUSE_IDS[(i * 2 + (end > 0 ? 1 : 0)) % HOUSE_IDS.length],
        { x, z, targetH: 5.6 + ((i * 3) % 5) * .48, ry: end < 0 ? 0 : Math.PI });
    }
    for (const side of [-1, 1]) for (let i = 0; i < 20; i++) {
      const x = side * (20.8 + (i % 4) * .55), z = -43 + i * 4.5 + ((i % 3) - 1) * .5;
      backdropHouse(HOUSE_IDS[(i * 5 + (side > 0 ? 3 : 0)) % HOUSE_IDS.length],
        { x, z, targetH: 5.3 + ((i * 7) % 6) * .52, ry: side > 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
    for (const end of [-1, 1]) for (let i = 0; i < 16; i++) {
      const x = -22.5 + i * 3 + Math.sin(i * 1.3) * .45, z = end * (46 + (i % 4) * .5);
      backdropHouse(HOUSE_IDS[(i * 4 + (end > 0 ? 2 : 0)) % HOUSE_IDS.length],
        { x, z, targetH: 5.1 + ((i * 5) % 7) * .47, ry: end < 0 ? 0 : Math.PI });
    }
    backdropBatch.build(root);
  }

  const nodes = [], adj = [], nodeKey = new Map();
  const addNode = (x, z, y) => {
    const key = `${x.toFixed(2)}:${z.toFixed(2)}:${y.toFixed(2)}`;
    if (nodeKey.has(key)) return nodeKey.get(key);
    const id = nodes.length; nodes.push({ x, z, y }); adj.push([]); nodeKey.set(key, id); return id;
  };
  const link = (a, b) => {
    if (a === b) return;
    if (!adj[a].includes(b)) adj[a].push(b); if (!adj[b].includes(a)) adj[b].push(a);
  };
  /* yRef explícito: linha de térreo consulta a camada de baixo (0), linha de tábua a de
     cima (1e3). Sem isso o nó sob o mirante nasce a 5,2 m e o bot "sobe" no túnel. */
  const line = (a, b, spacing = .75, yRef = 0) => {
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1]), count = Math.max(1, Math.ceil(distance / spacing));
    let previous = addNode(a[0], a[1], groundHeightAt(a[0], a[1], yRef)); const out = [previous];
    for (let i = 1; i <= count; i++) {
      const t = i / count, nx2 = a[0] + (b[0] - a[0]) * t, nz2 = a[1] + (b[1] - a[1]) * t;
      const next = addNode(nx2, nz2, groundHeightAt(nx2, nz2, yRef));
      link(previous, next); previous = next; out.push(next);
    }
    return out;
  };
  for (let i = 1; i < MAIN_BECO.length; i++) line(MAIN_BECO[i - 1], MAIN_BECO[i]);
  for (const branch of BRANCHES) line(branch[0], branch[1]);

  const roofPartNodes = new Map();
  for (const roof of ROOFS) roofPartNodes.set(roof.name, ROOF_PARTS.filter((part) => part.name === roof.name)
    .map((part) => addNode((part.x0 + part.x1) / 2, (part.z0 + part.z1) / 2, ROOF_H)));
  const nearestRoofNode = (name, point) => {
    let best = roofPartNodes.get(name)?.[0], distance = Infinity;
    for (const node of roofPartNodes.get(name) || []) {
      const d = Math.hypot(nodes[node].x - point[0], nodes[node].z - point[1]);
      if (d < distance) { distance = d; best = node; }
    }
    return best;
  };
  for (const plank of [...PLANKS, ...INTERNAL_PLANKS]) {
    const [aName, bName] = plank.id.split('-');
    const path = line(plank.a, plank.b, .58, 1e3);
    const firstName = plank.roof || aName, secondName = plank.roof || bName;
    link(nearestRoofNode(firstName, plank.a), path[0]);
    link(path[path.length - 1], nearestRoofNode(secondName, plank.b));
  }
  for (const stair of stairs) {
    const groundNode = addNode(stair.bottom.x, stair.bottom.z, 0), topNode = addNode(stair.top.x, stair.top.z, ROOF_H);
    let previous = groundNode;
    for (const config of STAIR_CONFIGS.filter((item) => item.name === stair.nome)) {
      const innerX = config.side * 4.6, outerX = config.side * 6.05, run = 4.2;
      for (let i = 1; i <= 15; i++) { const n = addNode(innerX, config.bottomZ + config.dirZ * run * i / 15,
        ROOF_H / 2 * i / 15); link(previous, n); previous = n; }
      const landing = addNode(outerX, config.bottomZ + config.dirZ * run, ROOF_H / 2); link(previous, landing); previous = landing;
      for (let i = 1; i <= 15; i++) { const n = addNode(outerX, config.bottomZ + config.dirZ * run * (1 - i / 15),
        ROOF_H / 2 + ROOF_H / 2 * i / 15); link(previous, n); previous = n; }
    }
    link(previous, topNode);
    let closestGround = 0, gd = Infinity;
    for (let i = 0; i < nodes.length; i++) if (nodes[i].y < 1) {
      const d = Math.hypot(nodes[i].x - stair.bottom.x, nodes[i].z - stair.bottom.z);
      if (d < gd) { gd = d; closestGround = i; }
    }
    link(groundNode, closestGround);
    const roofName = stair.nome === 'ESCADARIA' ? 'EN' : stair.nome === 'BECO DO VARAL' ? 'WS' : 'SE';
    link(topNode, nearestRoofNode(roofName, [stair.top.x, stair.top.z]));
  }

  function nearestWaypoint(x, z) {
    let best = 0, distance = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2;
      if (d < distance) { distance = d; best = i; }
    }
    return best;
  }
  function findPath(from, to) {
    if (from === to) return [to];
    const distance = new Float64Array(nodes.length).fill(Infinity), previous = new Int32Array(nodes.length).fill(-1);
    const open = new Uint8Array(nodes.length); distance[from] = 0; open[from] = 1;
    for (;;) {
      let current = -1, best = Infinity;
      for (let i = 0; i < nodes.length; i++) if (open[i] && distance[i] < best) { current = i; best = distance[i]; }
      if (current < 0 || current === to) break; open[current] = 0;
      for (const next of adj[current]) {
        const A = nodes[current], B = nodes[next], weight = Math.hypot(B.x - A.x, B.z - A.z, B.y - A.y);
        if (distance[current] + weight < distance[next]) { distance[next] = distance[current] + weight; previous[next] = current; open[next] = 1; }
      }
    }
    if (!Number.isFinite(distance[to])) return [from];
    const path = [to]; for (let current = previous[to]; current >= 0; current = previous[current]) path.unshift(current); return path;
  }

  const spawns = {
    E: [-1.9, -.65, .65, 1.9].map((x) => ({ x, z: -32.3, yaw: 0 })),
    B: [-1.9, -.65, .65, 1.9].map((x) => ({ x, z: 32.3, yaw: Math.PI })),
  };
  const ctfPoints = [
    { id: 'R', label: 'LAJE DA CAIXA', x: -10.2, z: -23.5 },
    { id: 'E', label: 'LAJE DO VARAL', x: 10.2, z: -23.5 },
    { id: 'P', label: 'LAJE DO CHURRASCO', x: -10.2, z: 15.5 },
    { id: 'B', label: 'LAJE DA PISCINA', x: 10.2, z: 15.5 },
  ];
  const placeWeapon = (kind, x, z) => {
    const y = groundHeightAt(x, z), mesh = new THREE.Mesh(new THREE.BoxGeometry(.14, .12, 1), MAT.charcoal);
    mesh.position.set(x, y + .1, z); mesh.castShadow = true; root.add(mesh);
    pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh });
  };
  for (const [kind, x, z] of [
    ['ak', -2, -34], ['m4', 2, -34], ['awp', -11.3, -25], ['mp5', 11.3, -20],
    ['shotgun', -11.2, -10], ['deagle', 11.2, -10], ['ak', -11.2, 2], ['m4', 11.2, 2],
    ['mp5', -11.2, 18], ['shotgun', 10.2, 18.3], ['deagle', -2, 34], ['m400', 2, 34],
  ]) placeWeapon(kind, x, z);

  const D_LAJES = decalIds(T, ['pixo-lajes-01.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  grafitar({
    id: 'fy_lajes', root, T, waypoints: nodes, seed: 6088, passo: 1.2, alcance: 9, cobre: 0.025, minLarg: 0.3,
    limpo: mapStairs,
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
    map: 'fy_lajes', low: LOWQ,
    rats: [
      { pos: [0, 0, -23], to: [0, 0, -19], phase: .2 }, { pos: [-3, 0, -14], to: [-2.3, 0, -11], phase: 1.1 },
      { pos: [2.5, 0, 5], to: [2.1, 0, 8], phase: 2.1 }, { pos: [-2, 0, 15], to: [-1.7, 0, 19], phase: 2.8 },
      { pos: [0, 0, 24], to: [1.1, 0, 26], phase: 3.5 }, { pos: [4, 0, 22], to: [2.8, 0, 22], phase: 4.2 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-11.4, ROOF_H, -26], phase: .3 }, { mode: 'ground', pos: [11.2, ROOF_H, -20], phase: 1.3 },
      { mode: 'ground', pos: [-11.5, ROOF_H, 20], phase: 2.1 }, { mode: 'ground', pos: [11.4, ROOF_H, 11], phase: 2.9 },
      /* v2.1: os três voos viraram pomba pousada na PONTA de outras lajes (NW/ES/CS) */
      { mode: 'ground', pos: [-11.3, ROOF_H, -19.5], phase: 4.6 },
      { mode: 'ground', pos: [10.9, ROOF_H, -2.2], phase: 5.3 },
      { mode: 'ground', pos: [1.6, ROOF_H, 30.5], phase: 6.1 },
    ],
    /* Caramelo do circuito inferior: trecho do beco [-2,10]→[-2,22], verificado livre
       pelo lajes-circuito-check (LC4). Não é collider nem occluder. */
    dogs: [{ pos: [-2, 0, 12.5], to: [-2, 0, 18.5], phase: .6 }],
    /* Gato de telhado (BUG-57): ronda a laje do churrasco, parte sul [21.2,27] */
    cats: [{ pos: [-11.5, ROOF_H, 22.2], to: [-9.3, ROOF_H, 24.5], phase: 1.2 }],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi,
    pickups, ctfPoints, ambience,sound:{loops:[{src:AMB_LOOPS.funk,pos:[0,3,0],radius:60,vol:.3},{src:AMB_LOOPS.passaros,pos:[0,3,0],radius:60,vol:.2}],bioma:'favela'}, waypoints: { nodes, adj }, nearestWaypoint, findPath,
    stairs: mapStairs, staircases: stairs,
    jumpImpulse: 5.85,
    levels: ROOFS.filter((roof) => roof.name !== 'MN' && roof.name !== 'MS').map((roof) => ({ nome: roof.label,
      x0: roof.x0 + .6, x1: roof.x1 - .6, z0: roof.z0 + .6, z1: roof.z1 - .6,
      dePartida: roof.name === 'CS' ? 'E' : 'B' })),
    bounds: { minX: -HALF_X, maxX: HALF_X, minZ: MIN_Z, maxZ: MAX_Z },
  };
}
