import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from '../vendor/draco-r160/DRACOLoader.js';
import { preloadCharacterAssets } from './glbchars.js';
import { assetUrl } from './data/asseturl.js';
import { aplicaSombraSol, ehBaixa } from './mapquality.js';
import { AMB_LOOPS } from './soundscape.js';
import { detailFor } from './textures.js';

const PROP_ROOT = 'models/props/operacao_decola/';
export const PROP_FILES = {
  aviao_executivo: 'aviao_executivo.glb',
  trator_bagagem: 'trator_bagagem.glb',
  carrinho_ferramentas: 'carrinho_ferramentas.glb',
  arco_seguranca: 'arco_seguranca.glb',
  escada_embarque: 'escada_embarque.glb',
  terminal_fachada: 'terminal_fachada.glb',
  terminal_portal: 'terminal_portal.glb',
  balcao_recepcao: 'balcao_recepcao.glb',
  assentos_aeroporto: 'assentos_aeroporto.glb',
  scanner_bagagem: 'scanner_bagagem.glb',
  carro_servico: 'carro_servico.glb',
  energia_solo: 'energia_solo.glb',
  torre_iluminacao: 'torre_iluminacao.glb',
  barreiras_aeroporto: 'barreiras_aeroporto.glb',
  estacao_manutencao: 'estacao_manutencao.glb',
  containers_carga: 'containers_carga.glb',
  jardineira: 'jardineira.glb',
};
const templates = new Map();
let preloadPromise = null;
// Registro confiável interno por id: o servidor headless injeta os 17 GLB antes da sala existir.
export const registerOperacaoFlavioTemplate = (id, scene) => templates.set(id, scene);

const ESCORT_PATH = [
  { x: -20, z: -48 }, { x: -17, z: -44 }, { x: -14, z: -40 }, { x: -14, z: -34 },
  { x: -9, z: -31 }, { x: 0, z: -27 }, { x: 0, z: -20 }, { x: 0, z: -12 },
  { x: -4, z: 0 }, { x: 2, z: 15 }, { x: 2, z: 31 }, { x: 5, z: 42 },
  { x: 7.2, z: 49.2 },
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
  const draco = new DRACOLoader();
  draco.setDecoderPath('/vendor/draco-r160/');
  loader.setDRACOLoader(draco);
  const assets = Object.entries(PROP_FILES).map(([id, file]) => new Promise((resolve) => {
    loader.load(assetUrl(`${PROP_ROOT}${file}`), (gltf) => { templates.set(id, gltf.scene); resolve(); }, undefined, () => resolve());
  }));
  preloadPromise = Promise.all([preloadCharacterAssets(['senador']), ...assets]).finally(() => draco.dispose());
  return preloadPromise;
}

const material = (color, roughness = 0.82, metalness = 0.03, map = null) => new THREE.MeshStandardMaterial({
  color, roughness, metalness, map, ...(detailFor(map) || {}),
});

export function buildOperacaoFlavio(scene, T = {}) {
  const lowProfile = ehBaixa();
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
    branco: material(0xe9e3d5, 0.65), vidro: lowProfile
      ? new THREE.MeshStandardMaterial({
        color: 0x9ed8e8, roughness: 0.2, metalness: 0.05, transparent: true, opacity: 0.36, depthWrite: false,
      })
      : new THREE.MeshPhysicalMaterial({
        color: 0x9ed8e8, roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.36,
        transmission: 0.24, depthWrite: false,
      }),
    tela: new THREE.MeshStandardMaterial({ color: 0x65c9d5, emissive: 0x1b7185, emissiveIntensity: 1.15, roughness: 0.28 }),
    luz: new THREE.MeshStandardMaterial({ color: 0xfff1c2, emissive: 0xffc76a, emissiveIntensity: 2.4, roughness: 0.35 }),
    baliza: new THREE.MeshStandardMaterial({ color: 0x7fdfff, emissive: 0x168ed0, emissiveIntensity: 4.2, roughness: 0.2 }),
  };

  const bloco = (nome, x, y, z, w, h, d, mat, solid = true, sombra = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.name = nome; mesh.position.set(x, y, z); mesh.castShadow = sombra && (solid || !lowProfile); mesh.receiveShadow = true; root.add(mesh);
    if (solid) {
      colliders.push({ id: nome, minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(mesh);
    }
    return mesh;
  };
  const cilindro = (nome, x, y, z, raio, h, mat, solid = false) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(raio, raio, h, 12), mat);
    mesh.name = nome; mesh.position.set(x, y, z); mesh.castShadow = solid || !lowProfile; mesh.receiveShadow = true; root.add(mesh);
    if (solid) {
      colliders.push({ id: nome, minX: x - raio, maxX: x + raio, minY: y - h / 2, maxY: y + h / 2, minZ: z - raio, maxZ: z + raio });
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
    mesh.castShadow = !lowProfile; root.add(mesh); return mesh;
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
  const baliza = (x, z) => {
    cilindro('baliza-apron', x, 0.16, z, 0.09, 0.32, mats.metal);
    const lampada = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mats.baliza);
    lampada.position.set(x, 0.38, z); lampada.name = 'luz-balizamento'; root.add(lampada);
  };

  // O terminal deixa de ser um labirinto neutro: materiais, sinalização e horizonte formam quatro zonas legíveis.
  const soloAeroporto = bloco('solo-aeroporto', 0, -0.2, 0, 94, 0.4, 124, mats.asfalto);
  bloco('gramado-oeste', -56, -0.23, 0, 18, 0.34, 146, mats.grama, false);
  bloco('gramado-leste', 56, -0.23, 0, 18, 0.34, 146, mats.grama, false);
  bloco('piso-terminal-executivo', 0, 0.02, -34, 58, 0.08, 36, mats.piso, false);
  bloco('piso-controle-acesso', 0, 0.035, 1, 70, 0.07, 30, mats.concreto, false);
  bloco('piso-hangar', 0, 0.04, 35, 72, 0.12, 27, mats.concreto, false);
  const pistaDistante = bloco('pista-distante', 0, -0.14, 78, 118, 0.1, 23, mats.preto, false, false);
  // Ligação render-only da lacuna central: 4 vértices, 2 triângulos, winding com normal +Y,
  // derivada apenas de position/BoxGeometry.parameters dos dois blocos vizinhos preservados.
  const pA = soloAeroporto.geometry.parameters, pP = pistaDistante.geometry.parameters;
  const z0 = soloAeroporto.position.z + pA.depth / 2;
  const z1 = pistaDistante.position.z - pP.depth / 2;
  const x0 = Math.max(soloAeroporto.position.x - pA.width / 2, pistaDistante.position.x - pP.width / 2);
  const x1 = Math.min(soloAeroporto.position.x + pA.width / 2, pistaDistante.position.x + pP.width / 2);
  const y0 = soloAeroporto.position.y + pA.height / 2;
  const y1 = pistaDistante.position.y + pP.height / 2;
  // UV por extrapolação do topface original do solo-aeroporto: u=(x+47)/94, v=(62-z)/124.
  const uvTopo = (x, z) => [(x - soloAeroporto.position.x) / pA.width + 0.5, (z0 - z) / pA.depth];
  const posConector = new Float32Array([
    x0, y0, z0, x0, y1, z1, x1, y1, z1,
    x0, y0, z0, x1, y1, z1, x1, y0, z0,
  ]);
  const uvConector = new Float32Array([
    ...uvTopo(x0, z0), ...uvTopo(x0, z1), ...uvTopo(x1, z1),
    ...uvTopo(x0, z0), ...uvTopo(x1, z1), ...uvTopo(x1, z0),
  ]);
  const geoConector = new THREE.BufferGeometry();
  geoConector.setAttribute('position', new THREE.BufferAttribute(posConector, 3));
  geoConector.setAttribute('uv', new THREE.BufferAttribute(uvConector, 2));
  geoConector.computeVertexNormals();
  const conector = new THREE.Mesh(geoConector, soloAeroporto.material); // mesmo mats.asfalto, sem novo material/textura/repeat
  conector.name = 'ligacao-piso-central';
  conector.receiveShadow = true; conector.castShadow = false;
  root.add(conector); // sem bloco(): render-only, não registra colisor nem occluder
  for (let x = -52; x <= 52; x += 13) {
    bloco('marca-pista-distante', x, -0.07, 78, 7, 0.03, 0.34, mats.branco, false, false);
  }

  // Terminal executivo aberto: os móveis PBR dão abrigo sem transformar a primeira etapa em labirinto.
  const fachadaSul = { x: 0, z: -52, w: 58, portas: [-20, 20] };
  paredeX('fachada-sul', fachadaSul.x, fachadaSul.z, fachadaSul.w, fachadaSul.portas);
  const fachadaNorte = { x: 0, z: -16, w: 58, portas: [-17, 0, 17] };
  paredeX('fachada-norte', fachadaNorte.x, fachadaNorte.z, fachadaNorte.w, fachadaNorte.portas);
  const lateraisTerminal = [
    { nome: 'lateral-oeste', x: -29, z: -34, d: 36, portas: [-43, -25], normal: -1 },
    { nome: 'lateral-leste', x: 29, z: -34, d: 36, portas: [-43, -25], normal: 1 },
  ];
  for (const lateral of lateraisTerminal) paredeZ(lateral.nome, lateral.x, lateral.z, lateral.d, lateral.portas);
  bloco('faixa-fachada-sul', 0, 2.9, -52.18, 58, 0.58, 0.16, mats.marinho, false);
  bloco('faixa-fachada-norte', 0, 2.9, -15.82, 58, 0.58, 0.16, mats.marinho, false);
  for (const x of [-26, -18, -10, 10, 18, 26]) {
    bloco('montante-vidro-terminal', x, 1.65, -15.72, 0.18, 3.1, 0.18, mats.marinho, false);
    bloco('janela-terminal', x, 1.75, -15.69, 7.3, 1.7, 0.05, mats.vidro, false, false);
  }
  for (const z of [-47, -35, -23]) {
    bloco('perfil-teto-terminal', 0, 3.55, z, 57, 0.16, 0.3, mats.marinho, false);
    for (const x of [-20, 0, 20]) bloco('luminaria-terminal', x, 3.42, z, 8.5, 0.05, 0.26, mats.luz, false, false);
  }
  placa('placa-rota-patio', 'PÁTIO', 'EMBARQUE ↑', 0, 4.25, -15.62, 6.8, 1.7, Math.PI);
  // A proteção do embarque vem de objetos reais (balcões, jardineiras, bancos), não de caixas:
  // as peças altas escondem o VIP de 1,72 m e quebram as lanes norte/laterais do terminal.
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
  for (const [lado, x] of [['oeste', -23], ['leste', 23]]) {
    bloco(`cobertura-tatica-servico-${lado}`, x, 0.725, 3, 4.8, 1.45, 1.2, mats.interno);
    bloco(`faixa-cobertura-servico-${lado}`, x, 1.465, 3, 4.55, 0.03, 0.9, mats.amarelo, false, false);
  }
  for (const [lado, x, z] of [['oeste', -12, 5], ['leste', 12, 4]]) {
    bloco(`cobertura-tatica-acesso-${lado}`, x, 0.725, z, 3.2, 1.45, 1.2, mats.metal);
    bloco(`faixa-cobertura-acesso-${lado}`, x, 1.465, z, 2.95, 0.03, 0.9, mats.amarelo, false, false);
  }
  for (const z of [-5, 1, 7]) for (const x of [-5.5, 5.5]) {
    cilindro('poste-fila', x, 0.55, z, 0.11, 1.1, mats.metal);
    // Cinto em dois segmentos com vão central de 1,8 m: a fila não vira trilho
    // atravessando o campo da câmera (achado do gauntlet na captura do pátio).
    for (const lado of [-3.2, 3.2]) bloco('fita-fila', lado, 0.95, z, 4.6, 0.06, 0.06, mats.laranja, false, false);
  }
  bloco('portico-controle', 0, 3.9, -13, 25, 0.36, 0.7, mats.marinho, false);
  bloco('coluna-portico-oeste', -12.2, 2, -13, 0.5, 4, 0.7, mats.marinho, false);
  bloco('coluna-portico-leste', 12.2, 2, -13, 0.5, 4, 0.7, mats.marinho, false);

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
  for (const x of [-24, -12, 12, 24]) faixaEntre('faixa-box-hangar', { x, z: 23 }, { x, z: 47 }, 0.18, mats.amarelo);
  faixaEntre('eixo-hangar', { x: 0, z: 21 }, { x: 0, z: 50 }, 0.24, mats.amarelo);
  for (const z of [26, 34, 42]) faixaEntre('travessa-box-hangar', { x: -24, z }, { x: 24, z }, 0.18, mats.amarelo);
  bloco('cobertura-tatica-hangar', -3, 0.725, 37, 5, 1.45, 1.4, mats.metal);
  bloco('faixa-cobertura-hangar', -3, 1.465, 37, 4.7, 0.03, 1.1, mats.amarelo, false, false);
  bloco('cobertura-tatica-hangar-leste', 10, 0.725, 37, 4, 1.45, 1.4, mats.metal);
  bloco('faixa-cobertura-hangar-leste', 10, 1.465, 37, 3.7, 0.03, 1.1, mats.amarelo, false, false);
  // No apron a proteção também é objeto real: GPU, bay de containers e trator emolduram
  // a zona de embarque e cortam as lanes leste/oeste dos spawns E sem tocar a escada.

  placa('placa-hangar', 'HANGAR', 'ROTA ↑', 0, 6.65, 21.72, 6, 1.4, Math.PI);
  for (let x = -40; x <= 40; x += 8) bloco('faixa-apron', x, 0.075, 51, 4.2, 0.035, 0.22, mats.amarelo, false, false);
  // Horizonte norte/sul: serra baixa além da pista, já dentro da faixa de névoa, devolve
  // contraste entre o avião claro e o céu pálido (gauntlet: separação flat do céu).
  for (const [x, w, h, z] of [[-70, 70, 7, 196], [25, 90, 9, 201], [85, 60, 6, 191], [-30, 80, 6, -192], [55, 70, 8, -197]]) {
    bloco('serra-distante', x, h / 2 - 0.1, z, w, h, 9, mats.verde, false, false);
  }
  faixaEntre('eixo-taxiamento', { x: 0, z: 47 }, { x: 0, z: 62 }, 0.26, mats.amarelo);
  for (let z = 49; z <= 64; z += 3) { baliza(-17, z); baliza(17, z); }
  const spot = new THREE.Mesh(new THREE.RingGeometry(7.5, 7.85, 48), mats.branco);
  spot.name = 'marca-estacionamento-aeronave'; spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.075, 55); root.add(spot);
  placa('placa-embarque', 'EMBARQUE 01', 'AVIÃO →', -12, 2.2, 49.8, 4.4, 1.1, Math.PI / 2);

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


  const usarProp = (id, pos, desiredSize, fallback, yaw = 0, fallbackSolid = true) => {
    const template = templates.get(id);
    // O fallback não duplica o proxy explícito; sua sombra acompanha fallbackSolid, como no GLB.
    if (!template) {
      const caixa = bloco(`fallback-${id}`, pos[0], fallback[1] / 2, pos[2], fallback[0], fallback[1], fallback[2], mats.metal, false, fallbackSolid);
      caixa.castShadow = fallbackSolid || !lowProfile;
      caixa.rotation.y = yaw;
      if (fallbackSolid) occluders.push(caixa);
      return caixa;
    }
    const model = template.clone(true);
    model.name = id;
    model.rotation.y = 0;
    model.scale.setScalar(1);
    model.updateMatrixWorld(true);
    const original = new THREE.Box3().setFromObject(model);
    const size = original.getSize(new THREE.Vector3());
    // Arrays fixam largura/altura/profundidade em metros; os demais props preservam a escala uniforme.
    if (Array.isArray(desiredSize)) {
      model.scale.set(
        desiredSize[0] / Math.max(size.x, 0.001),
        desiredSize[1] / Math.max(size.y, 0.001),
        desiredSize[2] / Math.max(size.z, 0.001),
      );
    } else {
      const maior = Math.max(size.x, size.y, size.z, 0.001);
      model.scale.setScalar(desiredSize / maior);
    }
    model.rotation.y = yaw;
    model.position.set(pos[0], 0, pos[2]);
    model.updateMatrixWorld(true);
    const scaled = new THREE.Box3().setFromObject(model);
    model.position.y = pos[1] - scaled.min.y;
    model.userData.groundY = pos[1];
    model.updateMatrixWorld(true);
    const placed = new THREE.Box3().setFromObject(model);
    if (Array.isArray(desiredSize)) {
      model.position.x += pos[0] - (placed.min.x + placed.max.x) / 2;
      model.position.z += pos[2] - (placed.min.z + placed.max.z) / 2;
      model.updateMatrixWorld(true);
      placed.setFromObject(model);
    }
    model.userData.groundClearance = placed.min.y - pos[1];
    model.userData.placedHeight = placed.max.y - placed.min.y;
    const semTransmissao = (source) => {
      if (!lowProfile || !source.isMeshPhysicalMaterial || !(source.transmission > 0)) return source;
      const standard = new THREE.MeshStandardMaterial();
      standard.copy(source);
      return standard;
    };
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(semTransmissao) : semTransmissao(o.material);
      o.castShadow = fallbackSolid || !lowProfile; o.receiveShadow = true; occluders.push(o);
    });
    root.add(model); return model;
  };
  const objectivePlane = usarProp('aviao_executivo', [0, 0.08, 55], 18, [18, 5, 8], Math.PI);
  usarProp('escada_embarque', [-3.2, 0.08, 52.5], 4, [3, 2.4, 4], Math.PI / 2);
  usarProp('trator_bagagem', [-20, 0.08, 50], 4.2, [4.2, 2, 2.4], Math.PI / 2);
  usarProp('carrinho_ferramentas', [27, 0.08, 38], 2.2, [2.2, 1.4, 1.2], Math.PI / 2);
  usarProp('arco_seguranca', [0, 0.08, -13], 3, [3, 3, 0.8], 0, false);
  const colliderDoProp = (id, x, y, z, w, h, d, yaw = 0) => {
    // AABB envolvente do retângulo rotacionado: física idêntica com ou sem GLB.
    const cos = Math.abs(Math.cos(yaw)), sin = Math.abs(Math.sin(yaw));
    const halfW = (w * cos + d * sin) / 2, halfD = (w * sin + d * cos) / 2;
    colliders.push({ id, yaw, minX: x - halfW, maxX: x + halfW, minY: y, maxY: y + h, minZ: z - halfD, maxZ: z + halfD });
  };
  colliderDoProp('aviao_executivo_fuselagem', 0, 0, 55, 3.4, 4.6, 12, Math.PI);
  colliderDoProp('aviao_executivo_asas', 0, 0.8, 55.4, 16, 1.4, 3.2, Math.PI);
  colliderDoProp('escada_embarque', -3.2, 0, 52.5, 3, 2.4, 4, Math.PI / 2);
  colliderDoProp('trator_bagagem', -20, 0, 50, 4.2, 2, 2.4, Math.PI / 2);
  colliderDoProp('carrinho_ferramentas', 27, 0, 38, 2.2, 1.4, 1.2, Math.PI / 2);
  for (const x of [-1.28, 1.28]) colliders.push({
    minX: x - 0.24, maxX: x + 0.24, minY: 0, maxY: 3,
    minZ: -13.45, maxZ: -12.55,
  });

  // Marcação semântica: anel âmbar emissivo por checkpoint da escolta — distinto das
  // faixas amarelas de pintura e do anel branco do estacionamento. Render-only.
  const anelCheckpoint = new THREE.MeshBasicMaterial({ color: 0xffc76a, toneMapped: false, transparent: true, opacity: 0.92 });
  for (let i = 0; i < ESCORT_PATH.length; i++) {
    const anel = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 28), anelCheckpoint);
    anel.name = 'marca-checkpoint-escolta';
    anel.rotation.x = -Math.PI / 2; anel.position.set(ESCORT_PATH[i].x, 0.06, ESCORT_PATH[i].z);
    root.add(anel);
  }
  const equipamentos = [
    ['terminal_fachada', -18, -15.82, 16, 0, 16, 5, 1, false],
    ['terminal_fachada', 18, -15.82, 16, 0, 16, 5, 1, false],
    ['terminal_portal', 0, -52.15, 6, Math.PI, 5, 4, 2, false],
    ['balcao_recepcao', -6.4, -19, 7.2, 0, 7, 1.4, 2.2, true],
    ['balcao_recepcao', 6.4, -19, 7.2, 0, 7, 1.4, 2.2, true],
    ['assentos_aeroporto', -20, -34, [2.6, 1.05, 0.9], Math.PI / 2, 2.6, 1.05, 0.9, true],
    ['assentos_aeroporto', 20, -34, [2.6, 1.05, 0.9], -Math.PI / 2, 2.6, 1.05, 0.9, true],
    ['assentos_aeroporto', -24, -43, [2.6, 1.05, 0.9], 0, 2.6, 1.05, 0.9, true],
    ['assentos_aeroporto', 13, -43, [2.6, 1.05, 0.9], Math.PI, 2.6, 1.05, 0.9, true],
    ['jardineira', -5, -25, 2.5, 0, 2.5, 1.8, 1.4, true],
    ['jardineira', 5, -25, 2.5, Math.PI, 2.5, 1.8, 1.4, true],
    ['jardineira', -20, -38, 2.5, Math.PI / 2, 2.5, 1.8, 1.4, true],
    ['jardineira', 18, -28, 2.5, -Math.PI / 2, 2.5, 1.8, 1.4, true],
    ['scanner_bagagem', -7, -10.5, 4.5, 0, 4.3, 2.2, 2.8, true],
    ['scanner_bagagem', 7, -10.5, 4.5, Math.PI, 4.3, 2.2, 2.8, true],
    ['barreiras_aeroporto', -10, 4, 5, Math.PI / 2, 4.5, 1.4, 1.2, true],
    ['barreiras_aeroporto', 10, 10, 5, Math.PI / 2, 4.5, 1.4, 1.2, true],
    ['barreiras_aeroporto', 7, 16, 5, 0, 4.5, 1.4, 1.2, true],
    ['barreiras_aeroporto', 8, 31, 5, 0, 4.5, 1.4, 1.2, true],
    ['carro_servico', -16, 15, 5, Math.PI / 2, 5, 2.4, 2.4, true],
    ['carro_servico', -18, 38, 5, Math.PI / 2, 5, 2.4, 2.4, true],
    ['energia_solo', 15, 14, 4, -Math.PI / 2, 4, 2, 2, true],
    ['energia_solo', 16, 35, 4, -Math.PI / 2, 4, 2, 2, true],
    ['estacao_manutencao', -26, 29, 5, Math.PI / 2, 5, 2.4, 2.4, true],
    ['estacao_manutencao', 26, 40, 5, -Math.PI / 2, 5, 2.4, 2.4, true],
    ['estacao_manutencao', -20, 46, 5, Math.PI / 2, 5, 2.4, 2.4, true],
    ['containers_carga', -13, 29, 5, Math.PI / 2, 5, 2.6, 2.5, true],
    ['containers_carga', 14, 41, 5, -Math.PI / 2, 5, 2.6, 2.5, true],
    ['containers_carga', -13, 42, 5, Math.PI / 2, 5, 2.6, 2.5, true],
    ['containers_carga', 18, 28, 5, -Math.PI / 2, 5, 2.6, 2.5, true],
    ['carrinho_ferramentas', -9, 37, 2.2, 0, 2.2, 1.4, 1.2, true],
    ['carrinho_ferramentas', 21, 46, 2.2, Math.PI, 2.2, 1.4, 1.2, true],
    ['jardineira', 21, -46, 2.5, 0, 2.5, 1.8, 1.4, true],
    ['energia_solo', 24, 18, 4, Math.PI / 2, 4, 2, 2, true],
    ['containers_carga', -28, 39, 5, Math.PI / 2, 5, 2.6, 2.5, true],
    ['barreiras_aeroporto', -8, 49, 5, Math.PI / 2, 4.5, 1.4, 1.2, true],
    ['torre_iluminacao', -31, 49, 8, 0, 2.2, 8, 2.2, true],
    ['torre_iluminacao', 31, 49, 8, Math.PI, 2.2, 8, 2.2, true],
    // Barreira oeste recuada para (−27,53): protege a lane do spawn E e mantém o corredor
    // norte do apron navegável (o grafo perdeu um beco quando ela ficava mais a leste).
    ['barreiras_aeroporto', 23, 53, 5, 0, 4.5, 1.4, 1.2, true],
    ['barreiras_aeroporto', 11, 45, 5, Math.PI / 2, 4.5, 1.4, 1.2, true],
    // Embarque: balcão central quebra a canyon da porta norte; plantas altas (1,8 m)
    // escondem o VIP de 1,72 m e quebram as lanes norte e laterais do terminal.
    ['balcao_recepcao', 0, -32, 7.2, Math.PI / 2, 7, 1.4, 2.2, true],
    ['jardineira', -7.2, -38.6, 2.5, 0, 2.5, 1.8, 1.4, true],
    ['assentos_aeroporto', -7.2, -35.8, [2.6, 1.05, 0.9], 0, 2.6, 1.05, 0.9, true],
    ['jardineira', 8.2, -38.6, 2.5, 0, 2.5, 1.8, 1.4, true],
    ['assentos_aeroporto', 8.2, -35.8, [2.6, 1.05, 0.9], 0, 2.6, 1.05, 0.9, true],
    // Cerca viva oeste: duas jardineiras cobrem CP2/CP3 da porta lateral sul.
    ['jardineira', -22.5, -41.3, 2.5, 0, 2.5, 1.8, 1.4, true],
    ['jardineira', -22.5, -39.8, 2.5, 0, 2.5, 1.8, 1.4, true],
    ['jardineira', 17.5, -43, 2.5, Math.PI / 2, 2.5, 1.8, 1.4, true],
    ['assentos_aeroporto', 9, -25.5, [2.6, 1.05, 0.9], Math.PI / 2, 2.6, 1.05, 0.9, true],
    ['assentos_aeroporto', -9, -25.5, [2.6, 1.05, 0.9], Math.PI / 2, 2.6, 1.05, 0.9, true],
    ['balcao_recepcao', 15, -39, 7.2, 0, 7, 1.4, 2.2, true],
    ['jardineira', -28, -45.5, 2.5, Math.PI / 2, 2.5, 1.8, 1.4, true],
    ['jardineira', 24, -44.5, 2.5, 0, 2.5, 1.8, 1.4, true],
    // Apron: GPU e bay de containers fecham as lanes dos spawns E sem tocar a escada.
    ['energia_solo', -1, 44.6, 4, 0, 4, 2, 2, true],
    ['containers_carga', -12, 51.4, 5, 0, 5, 2.6, 2.5, true],
    ['containers_carga', -12, 53.6, 5, 0, 5, 2.6, 2.5, true],
    ['containers_carga', 16.5, 52, 5, 0, 5, 2.6, 2.5, true],
    ['energia_solo', 24, 50, 4, Math.PI / 2, 4, 2, 2, true],
    // Ilhas escalonadas (gauntlet): cadeia de cobertura real a cada ~8-12 m no pátio,
    // na boca do hangar e no apron; nada disso toca a escolta nem os relés das cinco rotas.
    ['barreiras_aeroporto', 5, -4, 5, 0, 4.5, 1.4, 1.2, true],
    ['barreiras_aeroporto', -6.2, 4, 5, 0, 4.5, 1.4, 1.2, true],
    ['carro_servico', 18, 10, 5, 0, 5, 2.4, 2.4, true],
    ['trator_bagagem', -19, 9, 4.2, 0, 4.2, 2, 2.4, true],
    ['barreiras_aeroporto', -11, 24, 5, 0, 4.5, 1.4, 1.2, true],
    ['barreiras_aeroporto', 11, 24, 5, 0, 4.5, 1.4, 1.2, true],
    ['carrinho_ferramentas', -1.5, 26, 2.2, Math.PI / 2, 2.2, 1.4, 1.2, true],
    ['carrinho_ferramentas', 8.6, 47, 2.2, Math.PI / 2, 2.2, 1.4, 1.2, true],
    ['barreiras_aeroporto', -24, 47, 5, Math.PI / 2, 4.5, 1.4, 1.2, true],
    ['carro_servico', -8, 54.5, 5, Math.PI / 2, 5, 2.4, 2.4, true],
    ['barreiras_aeroporto', 25.5, 55, 5, 0, 4.5, 1.4, 1.2, true],
    ['jardineira', -18, -34.8, 2.5, Math.PI / 2, 2.5, 1.8, 1.4, true],
  ];
  for (const [id, x, z, size, yaw, w, h, d, solid] of equipamentos) {
    usarProp(id, [x, 0.08, z], size, [w, h, d], yaw, solid);
    if (solid) colliderDoProp(id, x, 0, z, w, h, d, yaw);
  }

  const sun = new THREE.DirectionalLight(0xffd2a1, 2.05);
  sun.position.set(-44, 68, -28); sun.castShadow = true; aplicaSombraSol(sun); root.add(sun);
  const hemi = new THREE.HemisphereLight(0xbfdaf1, 0x354335, 0.82); root.add(hemi);
  const fill = new THREE.DirectionalLight(0x8cbbe1, 0.4); fill.position.set(34, 26, 46); root.add(fill);
  for (const [z, cor, intensidade, altura] of [[-46,0xffd39a,0.7,3.1],[-34,0xffd39a,0.7,3.1],[-22,0xffd39a,0.7,3.1],[-2,0xd6efff,0.6,4.2],[29,0xcbe9ff,0.82,7.1],[42,0xcbe9ff,0.82,7.1]]) {
    const light = new THREE.PointLight(cor, intensidade, 21, 2);
    light.position.set(0, altura, z); root.add(light);
    if (z === 29 || z === 42) light.name = `luz-hangar-${z}`;   // nomes estáveis p/ cinemática E
  }

  const blocked = (x, z, inflate = 0.55) => colliders.some((c) => x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.8 && c.maxY > 0.1);
  const segmentBlocked = (a, b, inflate = 0.55) => {
    const dx = b.x - a.x, dz = b.z - a.z;
    return colliders.some((c) => {
      if (c.minY >= 1.8 || c.maxY <= 0.1) return false;
      const minX = c.minX - inflate, maxX = c.maxX + inflate;
      const minZ = c.minZ - inflate, maxZ = c.maxZ + inflate;
      let enter = 0, exit = 1;
      if (Math.abs(dx) < 1e-12) {
        if (a.x <= minX || a.x >= maxX) return false;
      } else {
        let near = (minX - a.x) / dx, far = (maxX - a.x) / dx;
        if (near > far) { const swap = near; near = far; far = swap; }
        enter = Math.max(enter, near); exit = Math.min(exit, far);
        if (enter >= exit) return false;
      }
      if (Math.abs(dz) < 1e-12) {
        if (a.z <= minZ || a.z >= maxZ) return false;
      } else {
        let near = (minZ - a.z) / dz, far = (maxZ - a.z) / dz;
        if (near > far) { const swap = near; near = far; far = swap; }
        enter = Math.max(enter, near); exit = Math.min(exit, far);
        if (enter >= exit) return false;
      }
      return exit > 0 && enter < 1;
    });
  };
  const nodes = [];
  const adj = [];
  const step = 3.5;
  for (let x = -40; x <= 40; x += step) for (let z = -55; z <= 55; z += step) if (!blocked(x, z)) nodes.push({ x, z });
  const addNode = (x, z) => {
    if (blocked(x, z)) return -1;
    const existing = nodes.findIndex((node) => Math.abs(node.x - x) < 0.001 && Math.abs(node.z - z) < 0.001);
    if (existing >= 0) return existing;
    nodes.push({ x, z });
    return nodes.length - 1;
  };
  const doors = [
    ...fachadaSul.portas.map((x) => ({ x, z: fachadaSul.z, nx: 0, nz: 1 })),
    ...fachadaNorte.portas.map((x) => ({ x, z: fachadaNorte.z, nx: 0, nz: 1 })),
    ...lateraisTerminal.flatMap((lateral) => lateral.portas.map((z) => ({ x: lateral.x, z, nx: lateral.normal, nz: 0 }))),
  ];
  for (const door of doors) {
    addNode(door.x, door.z);
    addNode(door.x - door.nx * 1.1, door.z - door.nz * 1.1);
    addNode(door.x + door.nx * step, door.z + door.nz * step);
  }
  const serviceRoutes = [
    [{ x: -17, z: -16 }, { x: -23, z: -10 }, { x: -23, z: 0 }, { x: -19.4, z: 1.8 }, { x: -19.4, z: 4.2 }, { x: -23, z: 8 }, { x: -23, z: 15 }, { x: -23, z: 18 }, { x: -16, z: 20 }, { x: -14, z: 23 }],
    [{ x: 0, z: -16 }, { x: 0, z: -12 }, { x: -4, z: 0 }, { x: 2, z: 15 }, { x: 0, z: 20 }, { x: 0, z: 23 }],
    [{ x: 17, z: -16 }, { x: 23, z: -10 }, { x: 23, z: 0 }, { x: 19.4, z: 1.8 }, { x: 19.4, z: 4.2 }, { x: 23, z: 8 }, { x: 21, z: 14 }, { x: 21, z: 18 }, { x: 16, z: 20 }, { x: 14, z: 23 }],
    // As vielas internas contornam as novas coberturas pelo lado de fora e convergem sem becos.
    [{ x: 0, z: -16 }, { x: 0, z: -14.5 }, { x: -12, z: -14.5 }, { x: -12, z: -7 }, { x: -15.5, z: -3 }, { x: -15.5, z: 2 }, { x: -15.5, z: 8 }, { x: -13.5, z: 11 }, { x: -13.5, z: 19 }, { x: -9, z: 20 }, { x: -7, z: 23 }],
    [{ x: 0, z: -16 }, { x: 0, z: -14.5 }, { x: 12, z: -14.5 }, { x: 12, z: -7 }, { x: 15.5, z: -3 }, { x: 15.5, z: 1 }, { x: 15.5, z: 7 }, { x: 13, z: 9 }, { x: 11.8, z: 18 }, { x: 9, z: 20 }, { x: 7, z: 23 }],
  ];
  const addRoute = (points) => {
    for (let i = 0; i < points.length; i++) {
      addNode(points[i].x, points[i].z);
      if (i === 0) continue;
      const a = points[i - 1], b = points[i], distance = Math.hypot(b.x - a.x, b.z - a.z);
      const subdivisions = Math.ceil(distance / (step * 0.85));
      for (let n = 1; n < subdivisions; n++) addNode(a.x + (b.x - a.x) * n / subdivisions, a.z + (b.z - a.z) * n / subdivisions);
    }
  };
  addRoute(ESCORT_PATH);
  for (const route of serviceRoutes) addRoute(route);

  // Só vizinhos de células adjacentes podem estar dentro do raio; não há varredura N².
  const maxEdgeDistanceSq = step * step * 2.2;
  const cellSize = Math.sqrt(maxEdgeDistanceSq);
  const cellOf = (value) => Math.floor(value / cellSize);
  const buckets = new Map();
  for (let i = 0; i < nodes.length; i++) {
    adj[i] = [];
    const key = `${cellOf(nodes[i].x)},${cellOf(nodes[i].z)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(i);
  }
  let candidatePairs = 0;
  for (let i = 0; i < nodes.length; i++) {
    const cx = cellOf(nodes[i].x), cz = cellOf(nodes[i].z);
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
      const candidates = buckets.get(`${cx + ox},${cz + oz}`) || [];
      for (const j of candidates) {
        if (j <= i) continue;
        candidatePairs++;
        const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
        if (dx * dx + dz * dz > maxEdgeDistanceSq) continue;
        if (segmentBlocked(nodes[i], nodes[j])) continue;
        adj[i].push(j); adj[j].push(i);
      }
    }
  }
  const navigationStats = {
    candidatePairs, totalPairs: nodes.length * (nodes.length - 1) / 2,
    edges: adj.reduce((total, neighbours) => total + neighbours.length, 0) / 2,
    doorCount: doors.length, routeCount: serviceRoutes.length,
  };
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
  // Slots de cobertura por zona com papel declarado: suportam 6 defensores (4 guardas
  // diretos junto à rota + 2 roamers de flanco) em qualquer trecho da escolta. Os pontos
  // ficam a ≤1,6 m de colisor alto, nunca colados em checkpoint e ligados ao grafo.
  const escortCoverPoints = [
    { x: -7.2, z: -40.0, role: 'guard', zone: 'embarque' },
    { x: 8.2, z: -40.0, role: 'guard', zone: 'embarque' },
    { x: 0, z: -36.3, role: 'guard', zone: 'embarque' },
    { x: -20.5, z: -40.5, role: 'guard', zone: 'embarque' },
    { x: 13, z: -41, role: 'guard', zone: 'embarque' },
    { x: -6, z: -21.4, role: 'guard', zone: 'embarque' },
    { x: 6, z: -21.4, role: 'guard', zone: 'embarque' },
    { x: -26.4, z: -47.1, role: 'roamer', zone: 'embarque' },
    { x: 24.6, z: -46.6, role: 'roamer', zone: 'embarque' },
    { x: -20, z: -40.3, role: 'guard', zone: 'embarque' },
    { x: -17.9, z: -32.6, role: 'guard', zone: 'embarque' },
    { x: -17.5, z: -36.9, role: 'guard', zone: 'embarque' },
    { x: -2.5, z: -33.5, role: 'guard', zone: 'embarque' },
    { x: -5, z: -26.9, role: 'guard', zone: 'embarque' },
    { x: 5, z: -26.5, role: 'guard', zone: 'embarque' },
    { x: 7, z: -8.4, role: 'guard', zone: 'servico' },
    { x: -7, z: -8.4, role: 'guard', zone: 'servico' },
    { x: 2.2, z: -2.6, role: 'guard', zone: 'servico' },
    { x: 6.2, z: -2.6, role: 'guard', zone: 'servico' },
    { x: -5, z: 2.4, role: 'guard', zone: 'servico' },
    { x: -23, z: 1.2, role: 'guard', zone: 'servico' },
    { x: -23, z: 4.8, role: 'guard', zone: 'servico' },
    { x: 23, z: 1.2, role: 'guard', zone: 'servico' },
    { x: 23, z: 4.8, role: 'guard', zone: 'servico' },
    { x: -12, z: 3.6, role: 'guard', zone: 'servico' },
    { x: -12, z: 6.4, role: 'guard', zone: 'servico' },
    { x: 12, z: 2.6, role: 'guard', zone: 'servico' },
    { x: 12, z: 5.4, role: 'guard', zone: 'servico' },
    { x: 7, z: 14.4, role: 'guard', zone: 'servico' },
    { x: 4, z: 14.4, role: 'guard', zone: 'servico' },
    { x: -3, z: 35.5, role: 'guard', zone: 'hangar' },
    { x: -3, z: 38.5, role: 'guard', zone: 'hangar' },
    { x: 10, z: 35.5, role: 'guard', zone: 'hangar' },
    { x: 10, z: 38.5, role: 'guard', zone: 'hangar' },
    { x: -1.5, z: 28.4, role: 'guard', zone: 'hangar' },
    { x: -1, z: 46.9, role: 'guard', zone: 'apron' },
    { x: -6.6, z: 49, role: 'guard', zone: 'apron' },
    { x: -3.2, z: 49.9, role: 'guard', zone: 'apron' },
    { x: 12.6, z: 50.4, role: 'guard', zone: 'apron' },
    { x: 8.6, z: 45, role: 'guard', zone: 'apron' },
    { x: 10.8, z: 48.3, role: 'roamer', zone: 'apron' },
    { x: -20.5, z: 53.2, role: 'roamer', zone: 'apron' },
    { x: -24, z: 43.9, role: 'roamer', zone: 'apron' },
  ];
  const spawns = {
    B: [{ x: -20, z: -48, yaw: Math.PI }, { x: -17.8, z: -46.5, yaw: Math.PI }, { x: -22.2, z: -47.5, yaw: Math.PI }, { x: -20, z: -50.5, yaw: Math.PI }],
    E: [{ x: -33, z: 16, yaw: 0 }, { x: 33, z: 16, yaw: 0 }, { x: -32, z: 54, yaw: 0 }, { x: 32, z: 54, yaw: 0 }],
  };

  return {
    root, colliders, occluders, decalSolids: [root], pickups, sun, hemi, spawns,
    mode: 'escort', escortPath, escortCoverPoints, objectivePlane,
    groundHeightAt: () => 0, slowAt: () => false,
    waypoints: { nodes, adj, stats: navigationStats }, nearestWaypoint, findPath,
    bounds: { minX: -43, maxX: 43, minZ: -57, maxZ: 57 },
    sound: { bioma: 'industrial', loops: [
      { src: AMB_LOOPS.hum, pos: [0, 3, -12], radius: 42, vol: 0.2 },
      { src: AMB_LOOPS.cidade, pos: [0, 4, 34], radius: 70, vol: 0.14 },
      { src: AMB_LOOPS.vento, pos: [0, 5, 48], radius: 38, vol: 0.18 },
    ] },
  };
}
