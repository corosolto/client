import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { preloadCharacterAssets } from './glbchars.js';
import { assetUrl } from './data/asseturl.js';
import { aplicaSombraSol } from './mapquality.js';
import { AMB_LOOPS } from './soundscape.js';

const PROP_ROOT = 'models/props/operacao_decola/';
const PROP_FILES = {
  aviao_executivo: 'aviao_executivo.glb',
  trator_bagagem: 'trator_bagagem.glb',
  carrinho_ferramentas: 'carrinho_ferramentas.glb',
  arco_seguranca: 'arco_seguranca.glb',
  escada_embarque: 'escada_embarque.glb',
};
const templates = new Map();
let preloadPromise = null;

export const OPERACAO_FLAVIO_PROPS = [];

export function preloadOperacaoFlavio() {
  if (preloadPromise) return preloadPromise;
  const loader = new GLTFLoader();
  const assets = Object.entries(PROP_FILES).map(([id, file]) => new Promise((resolve) => {
    loader.load(assetUrl(`${PROP_ROOT}${file}`), (gltf) => { templates.set(id, gltf.scene); resolve(); }, undefined, () => resolve());
  }));
  preloadPromise = Promise.all([preloadCharacterAssets(['senador']), ...assets]);
  return preloadPromise;
}

const material = (color, roughness = 0.82, metalness = 0.03) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

export function buildOperacaoFlavio(scene) {
  const root = new THREE.Group();
  root.name = 'operacao-flavio';
  scene.add(root);
  scene.background = new THREE.Color(0x8193a8);
  scene.fog = new THREE.Fog(0x8794a3, 72, 165);

  const colliders = [];
  const occluders = [];
  const pickups = [];
  const mats = {
    piso: material(0x7d8184, 0.92), asfalto: material(0x343a40, 0.96),
    parede: material(0xe7dfcc, 0.88), interno: material(0xb2aa98, 0.9),
    hangar: material(0x526273, 0.73, 0.18), metal: material(0x6a737b, 0.55, 0.55),
    amarelo: material(0xe9b83f, 0.7), vidro: new THREE.MeshStandardMaterial({ color: 0x8ec7dc, roughness: 0.18, metalness: 0.08, transparent: true, opacity: 0.48 }),
    verde: material(0x415e43, 0.95), branco: material(0xf2efe6, 0.75),
  };

  const bloco = (nome, x, y, z, w, h, d, mat, solid = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.name = nome;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (solid) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(mesh);
    }
    return mesh;
  };
  const paredeX = (nome, x, z, w, portas = []) => {
    const abertos = [...portas].sort((a, b) => a - b);
    let cursor = x - w / 2;
    for (const porta of abertos) {
      const left = porta - 1.15;
      if (left > cursor) bloco(nome, (cursor + left) / 2, 1.65, z, left - cursor, 3.3, 0.28, mats.parede);
      cursor = porta + 1.15;
    }
    const fim = x + w / 2;
    if (cursor < fim) bloco(nome, (cursor + fim) / 2, 1.65, z, fim - cursor, 3.3, 0.28, mats.parede);
  };
  const paredeZ = (nome, x, z, d, portas = []) => {
    const abertos = [...portas].sort((a, b) => a - b);
    let cursor = z - d / 2;
    for (const porta of abertos) {
      const low = porta - 1.15;
      if (low > cursor) bloco(nome, x, 1.65, (cursor + low) / 2, 0.28, 3.3, low - cursor, mats.parede);
      cursor = porta + 1.15;
    }
    const fim = z + d / 2;
    if (cursor < fim) bloco(nome, x, 1.65, (cursor + fim) / 2, 0.28, 3.3, fim - cursor, mats.parede);
  };

  bloco('solo-aeroporto', 0, -0.2, 0, 88, 0.4, 116, mats.asfalto);
  bloco('piso-escritorio', 0, 0.02, -34, 58, 0.08, 36, mats.piso, false);
  bloco('piso-hangar', 0, 0.04, 35, 72, 0.12, 26, mats.piso, false);

  // Escritório em anel: cada sala tem duas saídas e o corredor central permanece legível.
  paredeX('fachada-sul', 0, -52, 58, [-20, 20]);
  paredeX('fachada-norte', 0, -16, 58, [-17, 0, 17]);
  paredeZ('lateral-oeste', -29, -34, 36, [-43, -25]);
  paredeZ('lateral-leste', 29, -34, 36, [-43, -25]);
  paredeZ('divisoria-oeste', -10, -34, 36, [-46, -34, -22]);
  paredeZ('divisoria-leste', 10, -34, 36, [-46, -34, -22]);
  paredeX('anel-sul', 0, -40, 38, [-14, 0, 14]);
  paredeX('anel-norte', 0, -28, 38, [-14, 0, 14]);
  for (const [x, z] of [[-21,-46],[-2,-46],[18,-46],[-20,-34],[0,-34],[20,-34],[-20,-22],[0,-22],[20,-22]]) {
    bloco('mesa-escritorio', x, 0.55, z, 3.2, 1.1, 1.4, mats.interno);
    bloco('armario-arquivo', x + 3.1, 1.05, z + 1.8, 1.1, 2.1, 0.65, mats.metal);
  }
  bloco('balcao-recepcao', 0, 0.65, -18.5, 8, 1.3, 1.1, mats.interno);
  bloco('vidro-recepcao', 0, 2.05, -18.7, 8, 1.4, 0.08, mats.vidro, false);

  // Transição de segurança e pátio de serviço com três rotas paralelas.
  bloco('guarita-oeste', -31, 1.5, 1, 10, 3, 15, mats.parede);
  bloco('guarita-leste', 31, 1.5, 1, 10, 3, 15, mats.parede);
  bloco('corredor-seguranca-oeste', -18, 1.35, 1, 2, 2.7, 28, mats.metal);
  bloco('corredor-seguranca-leste', 18, 1.35, 1, 2, 2.7, 28, mats.metal);
  for (const [x, z] of [[-8,-8],[8,-2],[-10,8],[10,13],[-1,17]]) {
    bloco('pallet-servico', x, 0.75, z, 3.6, 1.5, 2.2, mats.amarelo);
  }

  // Hangar: volume aberto, mezanino e cobertura que quebra as visadas longas.
  bloco('parede-hangar-oeste', -36, 3.5, 35, 0.45, 7, 28, mats.hangar);
  bloco('parede-hangar-leste', 36, 3.5, 35, 0.45, 7, 28, mats.hangar);
  bloco('fundo-hangar', 0, 3.5, 22, 72, 7, 0.45, mats.hangar);
  bloco('viga-hangar', 0, 6.4, 35, 72, 0.35, 0.5, mats.metal);
  bloco('mezanino', -28, 3.15, 34, 12, 0.35, 19, mats.metal);
  bloco('guarda-corpo-mezanino', -21.8, 4.05, 34, 0.18, 1.8, 19, mats.metal);
  for (const [x, z] of [[-15,28],[15,28],[-14,39],[15,40],[0,32],[0,44]]) {
    bloco('bancada-hangar', x, 0.8, z, 4.5, 1.6, 1.8, mats.metal);
  }

  // Apron, balizamento e faixa final.
  for (let x = -38; x <= 38; x += 8) bloco('faixa-apron', x, 0.025, 51, 4.2, 0.03, 0.22, mats.amarelo, false);
  for (const x of [-28, -14, 14, 28]) bloco('barreira-apron', x, 0.55, 52, 3.4, 1.1, 0.9, mats.branco);
  bloco('zona-embarque', 0, 0.04, 55, 8, 0.04, 5, mats.verde, false);

  const usarProp = (id, pos, scale, fallback, yaw = 0) => {
    const template = templates.get(id);
    if (!template) return bloco(`fallback-${id}`, pos[0], fallback[1] / 2, pos[2], fallback[0], fallback[1], fallback[2], mats.metal);
    const model = template.clone(true);
    model.name = id;
    model.position.set(...pos);
    model.rotation.y = yaw;
    model.scale.setScalar(scale);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      occluders.push(o);
    });
    root.add(model);
    return model;
  };
  const objectivePlane = usarProp('aviao_executivo', [0, 0, 55], 13, [18, 5, 8], Math.PI);
  usarProp('escada_embarque', [4.2, 0, 52], 3.2, [3, 2.4, 4], -Math.PI / 2);
  usarProp('trator_bagagem', [-20, 0, 50], 3.1, [4.2, 2, 2.4], Math.PI / 2);
  usarProp('carrinho_ferramentas', [20, 0, 38], 2.4, [2.2, 1.4, 1.2], Math.PI / 2);
  usarProp('arco_seguranca', [0, 0, -13], 2.9, [3, 3, 0.8], 0);
  const colliderDoProp = (id, x, y, z, w, h, d) => {
    if (!templates.has(id)) return;
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
  };
  colliderDoProp('aviao_executivo', 0, 0, 55, 18, 4.6, 8);
  colliderDoProp('escada_embarque', 4.2, 0, 52, 3, 2.4, 4);
  colliderDoProp('trator_bagagem', -20, 0, 50, 4.2, 2, 2.4);
  colliderDoProp('carrinho_ferramentas', 20, 0, 38, 2.2, 1.4, 1.2);
  colliderDoProp('arco_seguranca', 0, 0, -13, 3, 3, 0.8);

  const sun = new THREE.DirectionalLight(0xffd9a3, 2.15);
  sun.position.set(-35, 62, -18); sun.castShadow = true; aplicaSombraSol(sun);
  root.add(sun);
  const hemi = new THREE.HemisphereLight(0xaecbea, 0x514332, 1.3); root.add(hemi);
  for (const z of [-46, -34, -22, 0, 30, 42]) {
    const light = new THREE.PointLight(z > 20 ? 0xadcfff : 0xffd8a8, 1.7, 22, 2);
    light.position.set(0, z > 20 ? 5.4 : 2.8, z); root.add(light);
  }

  const blocked = (x, z, inflate = 0.55) => colliders.some((c) => x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.8 && c.maxY > 0.1);
  const nodes = [];
  const adj = [];
  const step = 3.5;
  for (let x = -40; x <= 40; x += step) for (let z = -55; z <= 55; z += step) if (!blocked(x, z)) nodes.push({ x, z });
  for (let i = 0; i < nodes.length; i++) {
    adj[i] = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz <= step * step * 2.2) adj[i].push(j);
    }
  }
  const nearestWaypoint = (x, z) => {
    let best = 0, distance = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const dx = nodes[i].x - x, dz = nodes[i].z - z, current = dx * dx + dz * dz;
      if (current < distance) { best = i; distance = current; }
    }
    return best;
  };
  const findPath = (from, to) => {
    if (from === to) return [to];
    const previous = new Int32Array(nodes.length).fill(-1);
    const queue = [from]; previous[from] = from;
    for (let qi = 0; qi < queue.length; qi++) {
      const current = queue[qi];
      for (const next of adj[current]) if (previous[next] === -1) {
        previous[next] = current;
        if (next === to) {
          const path = [next]; let cursor = current;
          while (cursor !== from) { path.unshift(cursor); cursor = previous[cursor]; }
          path.unshift(from); return path;
        }
        queue.push(next);
      }
    }
    return [from];
  };

  const escortPath = [
    { x: -20, z: -48 }, { x: -13, z: -43 }, { x: -4, z: -38 }, { x: 4, z: -32 },
    { x: 13, z: -25 }, { x: 6, z: -18 }, { x: 0, z: -10 }, { x: -5, z: 0 },
    { x: 4, z: 12 }, { x: 10, z: 25 }, { x: 5, z: 38 }, { x: 0, z: 52 },
  ];
  const spawns = {
    B: [{ x: -24, z: -49, yaw: 0 }, { x: -17, z: -49, yaw: 0 }, { x: -10, z: -48, yaw: 0 }, { x: -3, z: -48, yaw: 0 }],
    E: [{ x: -32, z: 13, yaw: 0 }, { x: 32, z: 13, yaw: 0 }, { x: -30, z: 45, yaw: Math.PI }, { x: 30, z: 45, yaw: Math.PI }],
  };

  return {
    root, colliders, occluders, decalSolids: [root], pickups, sun, hemi, spawns,
    mode: 'escort', escortPath, objectivePlane,
    groundHeightAt: () => 0, slowAt: () => false,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -43, maxX: 43, minZ: -57, maxZ: 57 },
    sound: { bioma: 'industrial', loops: [
      { src: AMB_LOOPS.hum, pos: [0, 3, -12], radius: 42, vol: 0.2 },
      { src: AMB_LOOPS.cidade, pos: [0, 4, 34], radius: 70, vol: 0.14 },
      { src: AMB_LOOPS.vento, pos: [0, 5, 48], radius: 38, vol: 0.18 },
    ] },
  };
}
