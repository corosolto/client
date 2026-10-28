import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { preloadCharacterAssets } from './glbchars.js';
import { assetUrl } from './data/asseturl.js';
import { aplicaSombraSol } from './mapquality.js';
import { AMB_LOOPS } from './soundscape.js';
import { detailFor } from './textures.js';

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

const ESCORT_PATH = [
  { x: -20, z: -48 }, { x: -14, z: -44 }, { x: -14, z: -40 }, { x: -14, z: -34 },
  { x: -8, z: -34 }, { x: 0, z: -28 }, { x: 0, z: -20 }, { x: 0, z: -12 },
  { x: -4, z: 0 }, { x: 2, z: 16 }, { x: 2, z: 36 }, { x: 0, z: 52 },
];

function texturaProcedural(base, detalhe, tipo = 'placas') {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 256, 256);
  if (tipo === 'placas') {
    x.strokeStyle = detalhe; x.lineWidth = 4;
    for (let p = 0; p <= 256; p += 64) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 256); x.stroke(); }
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1;
    for (let p = 16; p < 256; p += 32) { x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 256); x.stroke(); }
  } else if (tipo === 'piso') {
    x.strokeStyle = detalhe; x.lineWidth = 2;
    for (let p = 0; p <= 256; p += 32) {
      x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 256); x.stroke();
      x.beginPath(); x.moveTo(0, p); x.lineTo(256, p); x.stroke();
    }
  } else {
    for (let i = 0; i < 900; i++) {
      const v = 25 + (i * 37 % 30); x.fillStyle = `rgba(${v},${v},${v},.13)`;
      x.fillRect((i * 73) % 256, (i * 151) % 256, 1 + (i % 3), 1 + (i % 2));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(8, 8); detailFor(t);
  return t;
}

function texturaPlaca(titulo, subtitulo, fundo = '#123250', destaque = '#f5b83b') {
  const c = document.createElement('canvas'); c.width = 768; c.height = 192;
  const x = c.getContext('2d');
  x.fillStyle = fundo; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = destaque; x.fillRect(0, 0, 18, c.height); x.fillRect(0, c.height - 12, c.width, 12);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f6f4ed';
  x.font = '900 70px Arial Black, sans-serif'; x.fillText(titulo, c.width / 2, subtitulo ? 72 : 96);
  if (subtitulo) { x.fillStyle = destaque; x.font = '700 30px Arial, sans-serif'; x.fillText(subtitulo, c.width / 2, 139); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
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

const material = (color, roughness = 0.82, metalness = 0.03, map = null) => new THREE.MeshStandardMaterial({
  color, roughness, metalness, map, ...(detailFor(map) || {}),
});

export function buildOperacaoFlavio(scene, T = {}) {
  const root = new THREE.Group();
  root.name = 'operacao-flavio';
  scene.add(root);
  scene.background = new THREE.Color(0x6687a0);
  scene.fog = new THREE.Fog(0x90a9b4, 138, 252);

  const skyGeo = new THREE.SphereGeometry(240, 24, 12);
  const skyColors = [];
  const alto = new THREE.Color(0x294c73), horizonte = new THREE.Color(0xa8bbc1);
  for (let i = 0; i < skyGeo.attributes.position.count; i++) {
    const y = skyGeo.attributes.position.getY(i);
    const cor = horizonte.clone().lerp(alto, THREE.MathUtils.clamp((y + 18) / 176, 0, 1));
    skyColors.push(cor.r, cor.g, cor.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(skyColors, 3));
  const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.name = 'ceu-degrade-aeroporto'; sky.raycast = () => {}; root.add(sky);

  const colliders = [];
  const occluders = [];
  const pickups = [];
  const cloneTexture = (source, rx, ry) => {
    if (!source) return null;
    const t = source.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true;
    return t;
  };
  const texAsfalto = cloneTexture(T.asphalt, 11, 15) || texturaProcedural('#303940', '#576168', 'ruido');
  const texConcreto = cloneTexture(T.concrete, 9, 9) || texturaProcedural('#8e9699', '#6f777a', 'ruido');
  const texPiso = texturaProcedural('#c8c0ad', 'rgba(63,70,75,.28)', 'piso');
  const texMetal = texturaProcedural('#41576a', '#20384d', 'placas');
  const mats = {
    piso: material(0xc5bba6, 0.78, 0.02, texPiso), asfalto: material(0x454d52, 0.93, 0.02, texAsfalto),
    concreto: material(0x9aa1a3, 0.88, 0.02, texConcreto), parede: material(0xd5cfc1, 0.78),
    interno: material(0x8a5b38, 0.72, 0.03), madeira: material(0x5f3b25, 0.66),
    marinho: material(0x15324b, 0.7, 0.18), hangar: material(0x6c8292, 0.66, 0.35, texMetal),
    metal: material(0x71808b, 0.46, 0.62), preto: material(0x161d24, 0.62, 0.2),
    amarelo: material(0xf5b83b, 0.56, 0.05), laranja: material(0xe96836, 0.55),
    verde: material(0x365b45, 0.9), grama: material(0x4d6952, 0.96),
    branco: material(0xe9e3d5, 0.65), vidro: new THREE.MeshPhysicalMaterial({
      color: 0x9ed8e8, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.36,
      transmission: 0.24, depthWrite: false,
    }),
    tela: new THREE.MeshStandardMaterial({ color: 0x65c9d5, emissive: 0x1b7185, emissiveIntensity: 1.15, roughness: 0.28 }),
    luz: new THREE.MeshStandardMaterial({ color: 0xfff1c2, emissive: 0xffc76a, emissiveIntensity: 2.4, roughness: 0.35 }),
    baliza: new THREE.MeshStandardMaterial({ color: 0x7fdfff, emissive: 0x168ed0, emissiveIntensity: 4.2, roughness: 0.2 }),
  };

  const bloco = (nome, x, y, z, w, h, d, mat, solid = true, sombra = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.name = nome; mesh.position.set(x, y, z); mesh.castShadow = sombra; mesh.receiveShadow = true; root.add(mesh);
    if (solid) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(mesh);
    }
    return mesh;
  };
  const cilindro = (nome, x, y, z, raio, h, mat, solid = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, h, 12), mat);
    mesh.name = nome; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    if (solid) {
      colliders.push({ minX: x - raio, maxX: x + raio, minY: y - h / 2, maxY: y + h / 2, minZ: z - raio, maxZ: z + raio });
      occluders.push(mesh);
    }
    return mesh;
  };
  const placa = (nome, titulo, subtitulo, x, y, z, w, h, yaw = 0, fundo, destaque) => {
    const mat = new THREE.MeshBasicMaterial({ map: texturaPlaca(titulo, subtitulo, fundo, destaque), side: THREE.FrontSide, toneMapped: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.name = nome; mesh.position.set(x, y, z); mesh.rotation.y = yaw; root.add(mesh); return mesh;
  };
  const faixaEntre = (nome, a, b, largura, mat, y = 0.075) => {
    const dx = b.x - a.x, dz = b.z - a.z, comprimento = Math.hypot(dx, dz);
    const mesh = bloco(nome, (a.x + b.x) / 2, y, (a.z + b.z) / 2, largura, 0.035, comprimento, mat, false, false);
    mesh.rotation.y = Math.atan2(dx, dz); return mesh;
  };
  const barraEntre = (nome, a, b, espessura, mat) => {
    const vetor = new THREE.Vector3().subVectors(b, a), comprimento = vetor.length();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(espessura, comprimento, espessura), mat);
    mesh.name = nome; mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vetor.normalize());
    mesh.castShadow = true; root.add(mesh); return mesh;
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
  const planta = (x, z) => {
    cilindro('vaso-terminal', x, 0.38, z, 0.5, 0.76, mats.interno);
    const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), mats.verde);
    copa.name = 'planta-terminal'; copa.position.set(x, 1.25, z); copa.castShadow = true; root.add(copa);
  };
  const baliza = (x, z) => {
    cilindro('baliza-apron', x, 0.16, z, 0.09, 0.32, mats.metal);
    const lampada = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mats.baliza);
    lampada.position.set(x, 0.38, z); lampada.name = 'luz-balizamento'; root.add(lampada);
  };

  // O terminal deixa de ser um labirinto neutro: materiais, sinalização e horizonte formam quatro zonas legíveis.
  bloco('solo-aeroporto', 0, -0.2, 0, 94, 0.4, 124, mats.asfalto);
  bloco('gramado-oeste', -56, -0.23, 0, 18, 0.34, 146, mats.grama, false);
  bloco('gramado-leste', 56, -0.23, 0, 18, 0.34, 146, mats.grama, false);
  bloco('piso-terminal-executivo', 0, 0.02, -34, 58, 0.08, 36, mats.piso, false);
  bloco('piso-controle-acesso', 0, 0.035, 1, 70, 0.07, 30, mats.concreto, false);
  bloco('piso-hangar', 0, 0.04, 35, 72, 0.12, 27, mats.concreto, false);
  bloco('pista-distante', 0, -0.14, 78, 118, 0.1, 23, mats.preto, false, false);
  for (let x = -52; x <= 52; x += 13) {
    bloco('marca-pista-distante', x, -0.07, 78, 7, 0.03, 0.34, mats.branco, false, false);
  }

  // Terminal executivo: fachada azul, divisórias claras, madeira e vidro aquecem a primeira etapa.
  paredeX('fachada-sul', 0, -52, 58, [-20, 20]);
  paredeX('fachada-norte', 0, -16, 58, [-17, 0, 17]);
  paredeZ('lateral-oeste', -29, -34, 36, [-43, -25]);
  paredeZ('lateral-leste', 29, -34, 36, [-43, -25]);
  paredeZ('divisoria-oeste', -10, -34, 36, [-46, -34, -22]);
  paredeZ('divisoria-leste', 10, -34, 36, [-46, -34, -22]);
  paredeX('anel-sul', 0, -40, 38, [-14, 0, 14]);
  paredeX('anel-norte', 0, -28, 38, [-14, 0, 14]);
  bloco('faixa-fachada-sul', 0, 2.9, -52.18, 58, 0.58, 0.16, mats.marinho, false);
  bloco('faixa-fachada-norte', 0, 2.9, -15.82, 58, 0.58, 0.16, mats.marinho, false);
  for (const x of [-26, -18, -10, 10, 18, 26]) {
    bloco('montante-vidro-terminal', x, 1.65, -15.72, 0.18, 3.1, 0.18, mats.marinho, false);
    bloco('janela-terminal', x, 1.75, -15.69, 7.3, 1.7, 0.05, mats.vidro, false, false);
  }
  for (const [x, z] of [[-21,-46],[-2,-46],[18,-46],[-20,-34],[0,-34],[20,-34],[-20,-22],[0,-22],[20,-22]]) {
    bloco('base-mesa-terminal', x, 0.43, z, 2.4, 0.78, 0.9, mats.marinho);
    bloco('tampo-mesa-terminal', x, 0.88, z, 3.3, 0.12, 1.5, mats.madeira, false);
    bloco('monitor-terminal', x, 1.48, z - 0.18, 1.05, 0.72, 0.12, mats.preto, false);
    bloco('tela-terminal', x, 1.48, z - 0.25, 0.84, 0.5, 0.025, mats.tela, false, false);
    cilindro('cadeira-terminal', x, 0.45, z + 1.25, 0.42, 0.7, mats.preto);
    bloco('encosto-cadeira-terminal', x, 1.05, z + 1.42, 0.9, 1.05, 0.18, mats.preto, false);
  }
  for (const x of [-6.4, 6.4]) {
    bloco('balcao-recepcao', x, 0.64, -18.6, 7.6, 1.28, 1.15, mats.madeira);
    bloco('frente-balcao-recepcao', x, 0.66, -19.19, 7.15, 0.82, 0.08, mats.marinho, false);
    bloco('friso-balcao-recepcao', x, 1.08, -19.24, 7.15, 0.08, 0.04, mats.amarelo, false, false);
  }
  planta(-26, -18.5); planta(26, -18.5); planta(-3.2, -25); planta(3.2, -25);
  for (const z of [-47, -35, -23]) {
    bloco('perfil-teto-terminal', 0, 3.55, z, 57, 0.16, 0.3, mats.marinho, false);
    for (const x of [-20, 0, 20]) bloco('luminaria-terminal', x, 3.42, z, 8.5, 0.05, 0.26, mats.luz, false, false);
  }
  placa('placa-recepcao', 'RECEPÇÃO', 'CREDENCIAMENTO', 0, 2.5, -19.29, 5.5, 1.35, Math.PI);
  placa('placa-terminal', 'TERMINAL EXECUTIVO', 'OPERAÇÃO FLÁVIO', 0, 3.85, -15.62, 14, 3.5, Math.PI);
  // Controle de acesso: pistas baixas, scanners, guaritas envidraçadas e fila clara.
  for (const x of [-31, 31]) {
    bloco('guarita-base', x, 0.55, 1, 10, 1.1, 15, mats.marinho);
    bloco('guarita-corpo', x, 1.9, 1, 9.2, 1.7, 14.2, mats.parede);
    bloco('janela-guarita-frente', x, 2.05, -6.15, 6.2, 1.05, 0.05, mats.vidro, false, false);
    bloco('janela-guarita-lateral', x + (x < 0 ? 4.65 : -4.65), 2.05, 1, 0.05, 1.05, 8, mats.vidro, false, false);
    bloco('cobertura-guarita', x, 3.05, 1, 10.8, 0.22, 15.8, mats.marinho, false);
  }
  bloco('separador-seguranca-oeste', -18, 0.52, 1, 0.52, 1.04, 28, mats.marinho);
  bloco('separador-seguranca-leste', 18, 0.52, 1, 0.52, 1.04, 28, mats.marinho);
  for (const x of [-7, 7]) {
    bloco('scanner-seguranca', x, 0.82, -10.5, 4.3, 1.64, 2.4, mats.marinho);
    bloco('esteira-scanner', x, 1.06, -8.65, 4.3, 0.22, 1.3, mats.preto, false);
    bloco('tela-scanner', x + (x < 0 ? 1.45 : -1.45), 1.82, -10.5, 0.85, 0.58, 0.08, mats.tela, false, false);
  }
  for (const z of [-5, 1, 7]) for (const x of [-5.5, 5.5]) {
    cilindro('poste-fila', x, 0.55, z, 0.11, 1.1, mats.metal);
    bloco('fita-fila', 0, 0.95, z, 11, 0.06, 0.06, mats.laranja, false, false);
  }
  for (const [x, z] of [[-11,-1],[11,3],[-11,10],[11,14]]) {
    bloco('carro-bagagem', x, 0.62, z, 4.4, 1.24, 2.25, mats.amarelo);
    for (const dx of [-1.45, 1.45]) cilindro('roda-carro-bagagem', x + dx, 0.23, z + 1.12, 0.25, 0.18, mats.preto);
  }
  bloco('portico-controle', 0, 3.9, -13, 25, 0.36, 0.7, mats.marinho, false);
  bloco('coluna-portico-oeste', -12.2, 2, -13, 0.5, 4, 0.7, mats.marinho, false);
  bloco('coluna-portico-leste', 12.2, 2, -13, 0.5, 4, 0.7, mats.marinho, false);
  placa('placa-controle-acesso', 'CONTROLE DE ACESSO', 'PASSAGEIROS E TRIPULAÇÃO', 0, 4.08, -13.38, 13.5, 3.35, Math.PI);

  // Hangar aeronáutico: estrutura azul, pórticos aparentes e piso técnico amarelo.
  bloco('parede-hangar-oeste', -36, 3.6, 35, 0.5, 7.2, 28, mats.hangar);
  bloco('parede-hangar-leste', 36, 3.6, 35, 0.5, 7.2, 28, mats.hangar);
  bloco('frente-hangar-oeste', -27, 3.6, 22, 18, 7.2, 0.5, mats.hangar);
  bloco('frente-hangar-leste', 27, 3.6, 22, 18, 7.2, 0.5, mats.hangar);
  bloco('verga-porta-hangar', 0, 6.6, 22, 36, 1.2, 0.5, mats.hangar);
  for (const z of [22, 28.5, 35, 41.5, 48]) {
    barraEntre('tesoura-hangar-esquerda', new THREE.Vector3(-36, 6.8, z), new THREE.Vector3(0, 10.4, z), 0.32, mats.marinho);
    barraEntre('tesoura-hangar-direita', new THREE.Vector3(0, 10.4, z), new THREE.Vector3(36, 6.8, z), 0.32, mats.marinho);
    bloco('travessa-hangar', 0, 6.7, z, 72, 0.28, 0.28, mats.marinho, false);
    bloco('luz-hangar', 0, 7.1, z + 0.25, 28, 0.07, 0.22, mats.luz, false, false);
  }
  for (const x of [-35.7, 35.7]) for (let z = 24; z <= 46; z += 4) {
    bloco('nervura-hangar', x, 3.4, z, 0.12, 6.2, 0.18, mats.marinho, false);
  }
  const coberturaEsquerda = bloco('cobertura-hangar-esquerda', -18, 8.58, 35, 36.2, 0.18, 26, mats.hangar, false);
  coberturaEsquerda.rotation.z = 0.1; occluders.push(coberturaEsquerda);
  const coberturaDireita = bloco('cobertura-hangar-direita', 18, 8.58, 35, 36.2, 0.18, 26, mats.hangar, false);
  coberturaDireita.rotation.z = -0.1; occluders.push(coberturaDireita);
  bloco('claraboia-hangar', 0, 10.38, 35, 4.2, 0.08, 26, mats.vidro, false, false);
  for (const [x, z] of [[-27,28],[27,28],[-26,39],[27,40]]) {
    bloco('bancada-hangar', x, 0.82, z, 5.2, 1.64, 1.8, mats.preto);
    bloco('tampo-bancada-hangar', x, 1.45, z, 5.4, 0.12, 2, mats.metal, false);
    bloco('painel-ferramentas', x, 2.5, z + (z < 34 ? -1 : 1), 5.2, 1.7, 0.12, mats.laranja, false);
  }
  for (const x of [-24, -12, 12, 24]) faixaEntre('faixa-box-hangar', { x, z: 23 }, { x, z: 47 }, 0.18, mats.amarelo);
  faixaEntre('eixo-hangar', { x: 0, z: 21 }, { x: 0, z: 50 }, 0.24, mats.amarelo);
  for (const z of [26, 34, 42]) faixaEntre('travessa-box-hangar', { x: -24, z }, { x: 24, z }, 0.18, mats.amarelo);

  placa('placa-hangar', 'HANGAR 01', 'AVIAÇÃO EXECUTIVA', 0, 6.7, 21.72, 11, 2.75, Math.PI);
  for (let x = -40; x <= 40; x += 8) bloco('faixa-apron', x, 0.075, 51, 4.2, 0.035, 0.22, mats.amarelo, false, false);
  faixaEntre('eixo-taxiamento', { x: 0, z: 47 }, { x: 0, z: 62 }, 0.26, mats.amarelo);
  for (let z = 49; z <= 64; z += 3) { baliza(-17, z); baliza(17, z); }
  for (const x of [-31, -23, 23, 31]) bloco('barreira-apron', x, 0.52, 52, 3.4, 1.04, 0.9, mats.branco);
  const spot = new THREE.Mesh(new THREE.RingGeometry(7.5, 7.85, 48), mats.branco);
  spot.name = 'marca-estacionamento-aeronave'; spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.075, 55); root.add(spot);
  placa('placa-embarque', 'EMBARQUE', 'PORTÃO 01', 20, 2.9, 49.8, 8, 2, Math.PI / 2);

  // Volumes além do limite fecham o horizonte como um aeroporto, não como uma arena vazia.
  for (const [x, z, w, h, d] of [[-57,-32,18,7,34],[57,-28,20,9,42],[-62,28,26,10,30],[62,34,25,8,34]]) {
    bloco('terminal-distante', x, h / 2 - 0.1, z, w, h, d, mats.marinho, false, false);
    bloco('janela-terminal-distante', x + (x < 0 ? w / 2 + 0.03 : -w / 2 - 0.03), h * 0.58, z, 0.05, h * 0.22, d * 0.78, mats.vidro, false, false);
  }
  cilindro('torre-controle-base', -52, 7, 15, 2.4, 14, mats.concreto);
  cilindro('torre-controle-cabine', -52, 14.7, 15, 4.7, 2.3, mats.vidro);
  bloco('torre-controle-teto', -52, 16.05, 15, 10.5, 0.3, 10.5, mats.marinho, false);
  for (let z = -62; z <= 70; z += 9) {
    cilindro('poste-perimetro', -45.5, 2.6, z, 0.09, 5.2, mats.metal);
    cilindro('poste-perimetro', 45.5, 2.6, z, 0.09, 5.2, mats.metal);
    bloco('luz-poste-perimetro', -45.5, 5.15, z, 0.9, 0.18, 0.4, mats.luz, false, false);
    bloco('luz-poste-perimetro', 45.5, 5.15, z, 0.9, 0.18, 0.4, mats.luz, false, false);
  }

  for (let i = 0; i < ESCORT_PATH.length - 1; i++) faixaEntre('rota-operacao-flavio', ESCORT_PATH[i], ESCORT_PATH[i + 1], 0.16, mats.amarelo, 0.09);

  const usarProp = (id, pos, scale, fallback, yaw = 0) => {
    const template = templates.get(id);
    if (!template) return bloco(`fallback-${id}`, pos[0], fallback[1] / 2, pos[2], fallback[0], fallback[1], fallback[2], mats.metal);
    const model = template.clone(true);
    model.name = id; model.position.set(...pos); model.rotation.y = yaw; model.scale.setScalar(scale);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true; occluders.push(o);
    });
    root.add(model); return model;
  };
  const objectivePlane = usarProp('aviao_executivo', [0, 0, 55], 13, [18, 5, 8], Math.PI);
  usarProp('escada_embarque', [4.2, 0, 52], 3.2, [3, 2.4, 4], -Math.PI / 2);
  usarProp('trator_bagagem', [-20, 0, 50], 3.1, [4.2, 2, 2.4], Math.PI / 2);
  usarProp('carrinho_ferramentas', [27, 0, 38], 2.4, [2.2, 1.4, 1.2], Math.PI / 2);
  usarProp('arco_seguranca', [0, 0, -13], 2.9, [3, 3, 0.8], 0);
  const colliderDoProp = (id, x, y, z, w, h, d) => {
    if (!templates.has(id)) return;
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
  };
  colliderDoProp('aviao_executivo', 0, 0, 55, 18, 4.6, 8);
  colliderDoProp('escada_embarque', 4.2, 0, 52, 3, 2.4, 4);
  colliderDoProp('trator_bagagem', -20, 0, 50, 4.2, 2, 2.4);
  colliderDoProp('carrinho_ferramentas', 27, 0, 38, 2.2, 1.4, 1.2);
  colliderDoProp('arco_seguranca', 0, 0, -13, 3, 3, 0.8);

  const sun = new THREE.DirectionalLight(0xffd2a1, 2.05);
  sun.position.set(-44, 68, -28); sun.castShadow = true; aplicaSombraSol(sun); root.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfdaf1, 0x354335, 0.82); root.add(hemi);
  const fill = new THREE.DirectionalLight(0x8cbbe1, 0.4); fill.position.set(34, 26, 46); root.add(fill);
  for (const [z, cor, intensidade, altura] of [[-46,0xffd39a,0.7,3.1],[-34,0xffd39a,0.7,3.1],[-22,0xffd39a,0.7,3.1],[-2,0xd6efff,0.6,4.2],[29,0xcbe9ff,0.82,7.1],[42,0xcbe9ff,0.82,7.1]]) {
    const light = new THREE.PointLight(cor, intensidade, 21, 2);
    light.position.set(0, altura, z); root.add(light);
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

  const escortPath = ESCORT_PATH.map((p) => ({ ...p }));
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
