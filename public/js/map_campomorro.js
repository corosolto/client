// CAMPO DO MORRO (fy_campomorro) — campo de varzea rebaixado, oito becos
// convergentes e galpao do baile elevado. Spec: plans/11-CAMPO-DO-MORRO.md.
import * as THREE from 'three';
import { PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch { return false; } })();

export const HALF_X = 36, HALF_Z = 30;
// Mantém a várzea ligeiramente abaixo das ruas, mas ainda dentro do piso jogável
// global da VM14 (−0,10 m). Em −0,50 m as 25 armas do rack nasciam num "buraco"
// proibido pelo contrato, embora estivessem fisicamente assentadas e alcançáveis.
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

export const CAMPOMORRO_PROPS = [
  'arquibancada', 'junkyard_container', 'caixa_som_baile', 'stall',
  'fav_house', 'pilha_pneus', 'moto_cg', 'fusca',
];

function laneHeight(x, z) {
  for (const l of LANES) {
    const u = x * l.dx + z * l.dz;
    const v = -x * l.dz + z * l.dx;
    if (u >= l.r0 && u <= l.r0 + RAMP_L && Math.abs(v) <= RAMP_W / 2)
      return FIELD_Y + (u - l.r0) / RAMP_L * -FIELD_Y;
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
    steel: lam({ color: 0x536069, metalness: 0.35, roughness: 0.7 }),
    steelRust: lam({ color: 0x6f4935, metalness: 0.28, roughness: 0.84 }),
    white: lam({ color: 0xe8e2cf }),
    glass: lam({ color: 0x24383f, metalness: 0.18, roughness: 0.24 }),
    door: lam({ color: 0x4a3325, roughness: 0.9 }),
    roof: lam({ color: 0x777a76, metalness: 0.32, roughness: 0.75 }),
    galpaoRoof: lam({ color: 0x426f78, emissive: 0x0b1b20, emissiveIntensity: .12, metalness: 0.42, roughness: 0.58 }),
    galpaoFloor: lam({ map: texturaPisoGalpao, color: 0xa6a298, roughness: 0.92 }),
    galpaoCeiling: lam({ map: texturaForroGalpao, color: 0x9aa8a9, emissive: 0x17282a, emissiveIntensity: .18, roughness: .8 }),
    sound: lam({ color: 0x252b2f, metalness: 0.14, roughness: 0.76 }),
    soundRing: lam({ color: 0xd8a928, metalness: 0.2, roughness: 0.55 }),
    exitLight: lam({ color: 0xffc95c, emissive: 0xff9f28, emissiveIntensity: .82, roughness: .48 }),
    proxy: lam({ color: 0x6f6256, roughness: 0.92 }),
    gun: lam({ color: 0x20242a }),
  };
  if (typeof document !== 'undefined') {
    const loader = new THREE.TextureLoader();
    const external = (mat, url, rx, ry) => {
      const tex = loader.load(url, () => {
        mat.map = tex;
        const det = detailFor(tex);
        if (det && det.normalMap) { mat.normalMap = det.normalMap; mat.normalScale.set(0.55, 0.55); }
        if (det && det.roughnessMap) mat.roughnessMap = det.roughnessMap;
        mat.needsUpdate = true;
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rx, ry);
    };
    external(MAT.dirt, '/img/textures/dirt_field.webp', 8, 7);
    external(MAT.asphalt, '/img/textures/asphalt_br.webp', 5, 5);
    external(MAT.wall, '/img/textures/favela_wall.webp', 3, 3);
    external(MAT.concrete, '/img/textures/concrete_br.webp', 3, 3);
    external(MAT.roof, '/img/textures/tex_zinco.webp', 3, 3);
    MAT.baile = lam({ map: MAT.wall.map, roughness: 1 });
    external(MAT.baile, '/img/textures/campomorro_streetart_baile.webp', 1.5, 1);
  } else MAT.baile = MAT.wall;

  const addBox = (w, h, d, mat, x, y, z, opts = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    root.add(m);
    if (opts.proxy) m.userData.proxyGLB = opts.proxy;
    if (opts.collide !== false) {
      const c = { minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 };
      colliders.push(c); occluders.push(m);
    }
    return m;
  };

  // A geometria de jogo continua sendo a caixa sólida; estes planos rasos dão escala e
  // direção às construções sem criar quinas ou obstáculos novos.
  const fachadaCasa = (x, z, w, d, h, seed = 0) => {
    const eixoX = Math.abs(x) > Math.abs(z), lado = eixoX ? Math.sign(x || 1) : Math.sign(z || 1);
    if (eixoX) {
      const fx = x - lado * (w / 2 + 0.035);
      addBox(0.07, 1.95, 0.86, MAT.door, fx, 0.04, z + (seed % 2 ? -d * 0.22 : d * 0.22), { collide: false, cast: false });
      addBox(0.06, 0.82, 1.12, MAT.glass, fx - lado * 0.01, 1.35, z + (seed % 2 ? d * 0.18 : -d * 0.18), { collide: false, cast: false });
      addBox(0.58, 0.08, 1.45, MAT.roof, fx - lado * 0.28, 2.4, z + (seed % 2 ? d * 0.18 : -d * 0.18), { collide: false });
    } else {
      const fz = z - lado * (d / 2 + 0.035);
      addBox(0.86, 1.95, 0.07, MAT.door, x + (seed % 2 ? -w * 0.22 : w * 0.22), 0.04, fz, { collide: false, cast: false });
      addBox(1.12, 0.82, 0.06, MAT.glass, x + (seed % 2 ? w * 0.18 : -w * 0.18), 1.35, fz - lado * 0.01, { collide: false, cast: false });
      addBox(1.45, 0.08, 0.58, MAT.roof, x + (seed % 2 ? w * 0.18 : -w * 0.18), 2.4, fz - lado * 0.28, { collide: false });
    }
    addBox(w + 0.28, 0.11, d + 0.28, seed % 3 ? MAT.roof : MAT.concrete, x, h, z, { collide: false });
    if (seed % 3 === 0) addBox(w * 0.46, 0.85, d * 0.42, MAT.wall, x + w * 0.12, h + 0.1, z - d * 0.16, { collide: false });
    // Chapa inclinada, remendo de reboco e conduíte tiram a leitura de prefab repetido.
    const telha = new THREE.Mesh(new THREE.BoxGeometry(w + 0.42, 0.08, d * 0.58), MAT.roof);
    telha.position.set(x, h + 0.22, z + (seed % 2 ? -d * 0.18 : d * 0.18));
    telha.rotation.z = (seed % 2 ? -1 : 1) * (0.035 + (seed % 3) * 0.018);
    telha.castShadow = telha.receiveShadow = true; root.add(telha);
    if (eixoX) {
      const fx = x - lado * (w / 2 + 0.045);
      addBox(0.045, 0.62, 1.45, MAT.steelRust, fx - lado * 0.01, 0.72 + (seed % 3) * 0.3, z, { collide: false, cast: false });
      addBox(0.035, 2.5, 0.035, MAT.steel, fx - lado * 0.03, 0.15, z - d * 0.32, { collide: false, cast: false });
    } else {
      const fz = z - lado * (d / 2 + 0.045);
      addBox(1.45, 0.62, 0.045, MAT.steelRust, x, 0.72 + (seed % 3) * 0.3, fz - lado * 0.01, { collide: false, cast: false });
      addBox(0.035, 2.5, 0.035, MAT.steel, x - w * 0.32, 0.15, fz - lado * 0.03, { collide: false, cast: false });
    }
  };

  const groundHeightAt = (x, z) => {
    if (x >= GALPAO.x0 && x <= GALPAO.x1 && z >= GALPAO.z0 && z <= GALPAO.z1) return GALPAO.y;
    if (x >= 18 && x <= GALPAO.x0 && z >= -21.8 && z <= -18.2) return (x - 18) / (GALPAO.x0 - 18);
    if (x >= 26.2 && x <= 29.8 && z >= GALPAO.z1 && z <= -12) return (-12 - z) / (-12 - GALPAO.z1);
    if (Math.abs(x) <= FIELD_X && Math.abs(z) <= FIELD_Z) return FIELD_Y;
    const h = laneHeight(x, z);
    return h === null ? 0 : h;
  };

  // Uma malha de altura evita quatro contas divergentes para campo, rampas e galpao.
  const terrainGeo = new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2, 72, 120);
  const pos = terrainGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, groundHeightAt(pos.getX(i), -pos.getY(i)));
  pos.needsUpdate = true; terrainGeo.computeVertexNormals();
  const terrain = new THREE.Mesh(terrainGeo, MAT.dirt);
  terrain.rotation.x = -Math.PI / 2; terrain.receiveShadow = true; root.add(terrain);

  // Ruas periféricas: material diferente do campo deixa o bowl legível de relance.
  for (const [w, d, x, z] of [[68, 4.2, 0, -27.4], [68, 4.2, 0, 27.4], [4.2, 50, -33.2, 0], [4.2, 50, 33.2, 0]]) {
    const rua = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.asphalt);
    rua.rotation.x = -Math.PI / 2; rua.position.set(x, 0.025, z); rua.receiveShadow = true; root.add(rua);
  }
  // Cal gasto, ainda legível: dá escala imediata ao bowl sem criar qualquer obstáculo.
  const cal = lam({ color: 0xd5d0b9, roughness: 1, transparent: true, opacity: 0.68 });
  for (const [w, d, x, z] of [[39.2, 0.09, 0, -11.9], [39.2, 0.09, 0, 11.9], [0.09, 23.8, -19.5, 0], [0.09, 23.8, 19.5, 0], [0.08, 23.8, 0, 0]])
    addBox(w, 0.018, d, cal, x, FIELD_Y + 0.012, z, { collide: false, cast: false });
  const circulo = new THREE.Mesh(new THREE.RingGeometry(2.35, 2.46, 36), cal);
  circulo.rotation.x = -Math.PI / 2; circulo.position.y = FIELD_Y + 0.025; root.add(circulo);

  setMapSky(scene, T, '/img/textures/sky_rj.webp', 0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_campomorro');
  const hemi = new THREE.HemisphereLight(0xeaf2f6, 0x67584a, 1.16); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.65); sun.position.set(30, 42, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006; scene.add(sun); scene.add(sun.target);

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

  // Alambrado e estrutura povoam as bordas sem transformar o campo aberto em labirinto.
  for (const x of [-17, -12, -7, -2, 3, 8, 13, 18]) {
    addBox(0.12, 2.2, 0.12, MAT.steel, x, 0, -13.8);
    addBox(0.12, 2.2, 0.12, MAT.steel, x, 0, 13.8);
  }
  for (const z of [-10, -6, -2, 4, 8]) {
    addBox(0.12, 2.2, 0.12, MAT.steel, -21.4, 0, z);
    addBox(0.12, 2.2, 0.12, MAT.steel, 21.4, 0, z);
  }
  // Alambrado remendado: barras de alturas e materiais alternados, com vãos preservados.
  for (const z of [-13.8, 13.8]) for (const [a, b, rust] of [
    [-19.5, -15.3, 1], [-13.8, -8.5, 0], [-6.5, -1.1, 1], [1.2, 6.2, 0], [8.1, 13.1, 1], [14.7, 19.5, 0],
  ]) {
    const y = rust ? 0.72 : 1.08;
    addBox(b - a, 0.07, 0.06, rust ? MAT.steelRust : MAT.steel, (a + b) / 2, y, z, { collide: false, cast: false });
    if (!rust) addBox(b - a, 0.05, 0.05, MAT.steel, (a + b) / 2, 1.82, z, { collide: false, cast: false });
  }
  for (const x of [-21.4, 21.4]) for (const [a, b, rust] of [[-11.2, -7.2, 0], [-5.2, -1.2, 1], [1.1, 5.2, 0], [6.9, 11.2, 1]]) {
    addBox(0.06, 0.07, b - a, rust ? MAT.steelRust : MAT.steel, x, rust ? 0.78 : 1.2, (a + b) / 2, { collide: false, cast: false });
  }
  // Uma única LineSegments desenha tela torta e remendada; os postes físicos continuam sendo
  // a colisão. Diagonais incompletas evitam o alambrado perfeito de estádio novo.
  {
    const pts = [];
    const fio = (x0, y0, z0, x1, y1, z1) => pts.push(x0, y0, z0, x1, y1, z1);
    for (const z of [-13.8, 13.8]) for (let x = -19; x < 19; x += 2.1) {
      const h = 1.45 + ((Math.round(x * 10) & 3) * 0.16);
      if (Math.abs(x) < 2.8 || (x > 9.5 && x < 15.5)) continue;
      fio(x, 0.1, z, x + 2.0, h, z); fio(x + 0.1, h, z, x + 1.8, 0.18, z);
    }
    for (const x of [-21.4, 21.4]) for (let z = -10.5; z < 10.5; z += 2.2) {
      if (Math.abs(z) < 2.8) continue;
      fio(x, 0.12, z, x, 1.65, z + 2.0); fio(x, 1.58, z, x, 0.2, z + 1.9);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const tela = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x4b514f, transparent: true, opacity: 0.68, fog: true }));
    root.add(tela);
  }

  const prop = (id, p, box) => {
    const usaGLB = QP.get('glb') !== '0' && PB.add(id, p);
    const m = addBox(box[0], box[1], box[2], MAT.proxy, p.x, p.y || 0, p.z, { proxy: id });
    m.visible = !usaGLB;
    return m;
  };
  prop('arquibancada', { x: -7, y: 0, z: 20, targetH: 3.2, ry: Math.PI }, [12, 3.2, 3.5]);
  prop('junkyard_container', { x: 18, y: 0, z: 18, targetH: 2.7, ry: Math.PI / 2 }, [5.8, 2.7, 2.5]);
  prop('stall', { x: -27, y: 0, z: -8, targetH: 2.7, ry: Math.PI / 2 }, [3.5, 2.7, 2.8]);
  prop('fusca', { x: 28, y: 0, z: 8, targetH: 1.5, ry: 0 }, [1.9, 1.5, 4]);
  prop('moto_cg', { x: -27, y: 0, z: 21, targetH: 1.3, ry: 0.4 }, [0.9, 1.3, 2]);

  // Arquibancada de um lado só, assentada numa base antiga e irregular acima da rua.
  addBox(11.8, 0.55, 3.3, MAT.concrete, -7, 0, 20, { collide: false });
  for (let i = 0; i < 3; i++)
    addBox(11.4 - i * 0.5, 0.34 + i * 0.28, 0.18, MAT.concrete, -7, 0, 18.36 + i * 0.08, { collide: false });

  // Fachadas do beco oeste quebram a visada antes da entrada do campo.
  const CASAS = [[-32, 2], [-32, 18], [-24.5, 23], [-13, 24], [7, 24], [29, 21], [31, -5], [13, -24], [-8, -24], [-27, -21], [-33, -10]];
  for (let i = 0; i < CASAS.length; i++) {
    const [x, z] = CASAS[i], h = 3.6 + ((x + z) & 1), w = 5.5, d = 4.5;
    addBox(w, h, d, MAT.wall, x, 0, z);
    fachadaCasa(x, z, w, d, h, i);
    if (i % 4 === 1) {
      const tanque = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.66, 1.15, 12), MAT.proxy);
      tanque.position.set(x + (i % 2 ? 1.25 : -1.25), h + 0.66, z); tanque.castShadow = true; root.add(tanque);
    }
  }
  for (const [x, z] of [[-24, 12], [-16, 18], [5, 18], [27, 14], [29, 1], [16, -19], [4, -22], [-18, -18], [-29, -15]])
    addBox(1.8, 1.1, 1.4, MAT.concrete, x, 0, z);
  addBox(0.35, 3, 7, MAT.wall, -24, 0, 10.5);

  // Galpao +1 m. As paredes oeste e sul deixam, respectivamente, uma saida por rampa.
  addBox(12, 0.18, 10, MAT.concrete, 28, 0.82, -21, { collide: false });
  // Piso próprio + iluminação local: o galpão não pode depender do sol atravessar o teto.
  // A revisão em 3:2 media teto, paredão e piso quase no mesmo preto.
  const pisoGalpao = addBox(11.4, .045, 9.4, MAT.galpaoFloor, 28, 1.005, -21, { collide: false, cast: false });
  pisoGalpao.userData.galpaoSurface = 'floor';
  addBox(0.35, 3.2, 10, MAT.wall, GALPAO.x1, GALPAO.y, -21);
  addBox(12, 3.2, 0.35, MAT.wall, 28, GALPAO.y, GALPAO.z0);
  addBox(0.35, 3.2, 3.7, MAT.wall, GALPAO.x0, GALPAO.y, -24.15);
  addBox(0.35, 3.2, 3.7, MAT.wall, GALPAO.x0, GALPAO.y, -17.85);
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
    const frame = addBox(w,3.2,d,MAT.steelRust,x,1,z,{ collide:false }); frame.userData.galpaoFrame = id;
  }
  addBox(12, 0.18, 10, MAT.steel, 28, 4.2, -21, { collide: false, cast: false });
  const forro = addBox(11.45,.06,9.45,MAT.galpaoCeiling,28,4.08,-21,{ collide:false,cast:false });
  forro.userData.galpaoSurface = 'ceiling';
  // Duas águas azul-petróleo separam a silhueta do galpão dos telhados de barraco.
  for (const [x, rz] of [[25.05, -0.17], [30.95, 0.17]]) {
    const agua = new THREE.Mesh(new THREE.BoxGeometry(6.7, 0.16, 11.4), MAT.galpaoRoof);
    agua.position.set(x, 4.78, -21); agua.rotation.z = rz; agua.castShadow = true; agua.receiveShadow = true;
    root.add(agua);
  }
  for (const [x, z] of [[21.85, -25.7], [34.15, -25.7], [34.15, -16.3]])
    addBox(0.32, 4.35, 0.32, MAT.steelRust, x, 0, z, { collide: false });
  // Marquise e letreiro enfatizam que este volume pertence ao baile e está acima do campo.
  addBox(8.4, 0.18, 1.35, MAT.steelRust, 28, 3.55, -15.55, { collide: false });
  addBox(6.8, 0.85, 0.08, MAT.baile, 28, 2.35, -15.29, { collide: false, cast: false });
  addBox(0.05, 2.65, 6.2, MAT.baile, GALPAO.x1 - 0.2, GALPAO.y + 0.25, -21, { collide: false, cast: false });
  addBox(5.1, 2.4, 0.05, MAT.baile, -32, 0.45, 20.26, { collide: false, cast: false });
  // A fachada oeste encara o campo: duas torres de som prolongam as paredes existentes,
  // enquanto o letreiro alto cruza somente o vazio acima da passagem jogável.
  for (const z of [-24.15, -17.85]) {
    addBox(0.38, 5.9, 3.45, MAT.sound, GALPAO.x0 - 0.02, GALPAO.y, z, { collide: false });
    for (const y of [1.75, 3.15, 4.55]) {
      const aro = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 20), MAT.soundRing);
      aro.rotation.z = Math.PI / 2; aro.position.set(GALPAO.x0 - 0.29, GALPAO.y + y, z);
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.62, 0.18, 20), MAT.sound);
      cone.rotation.z = Math.PI / 2; cone.position.set(GALPAO.x0 - 0.39, GALPAO.y + y, z);
      aro.castShadow = cone.castShadow = true; root.add(aro, cone);
    }
  }
  addBox(0.34, 0.32, 9.8, MAT.steelRust, GALPAO.x0, GALPAO.y + 6.0, -21, { collide: false });
  addBox(0.06, 1.25, 5.4, MAT.baile, GALPAO.x0 - 0.2, GALPAO.y + 4.85, -21, { collide: false, cast: false });
  for (const z of [-24.3, -17.7])
    addBox(0.6, 1.05, 0.6, MAT.roof, GALPAO.x0, GALPAO.y + 6.28, z, { collide: false });
  prop('caixa_som_baile', { x: 26, y: GALPAO.y, z: -21, targetH: 2.8 }, [2.4, 2.8, 4.4]);
  prop('pilha_pneus', { x: 23.5, y: GALPAO.y, z: -24, targetH: 1.2 }, [1.4, 1.2, 1.4]);

  // Três marcos volumétricos e cromaticamente distintos orientam as alas sem
  // depender da repetição dos mesmos decals assados.
  for (const [x,z,w,h,d,cor,id] of [[-15,-12.28,3.2,.72,.12,0x2c75a0,'placar-norte'],
    [-19.72,7.2,.12,1.8,2.4,0xc76b32,'totem-oeste'],[19.72,-7.6,.12,1.35,2.8,0x4c8b55,'mural-leste']]) {
    const marco = addBox(w,h,d,lam({ color:cor,roughness:.72 }),x,FIELD_Y+.15,z,{ collide:false,cast:false });
    marco.userData.fieldLandmark = id;
  }

  // Cover de beco distribuido pelos quadrantes que a planta deixa fora do campo.
  for (const [x, z] of [
    [-31, -26], [-21, -25], [-16, -26], [-12, -18], [-7, -26], [-3, -18],
    [3, -26], [9, -18], [-31, 26], [-16, 18], [3, 26], [12, 18], [16, 26],
    [22, 26], [28, 26], [32, 17], [8, -11], [8, 11],
  ]) addBox(1.5, 1.05, 1.3, MAT.concrete, x, 0, z);

  // Cinco bocas estreitas e distintas. Os montantes assentam nos taludes já sólidos; as
  // vergas ficam acima do peito, portanto a seção navegável e os AABBs continuam intactos.
  // Norte: portal enferrujado e cartaz de baile.
  for (const x of [-2.48, 2.48]) addBox(0.5, 3.0, 0.42, MAT.steelRust, x, FIELD_Y, -FIELD_Z, { collide: false });
  addBox(5.45, 0.3, 0.52, MAT.steelRust, 0, 2.35, -FIELD_Z, { collide: false });
  addBox(3.3, 0.62, 0.06, MAT.baile, 0, 2.58, -FIELD_Z + 0.24, { collide: false, cast: false });
  // Sul: concreto pintado e marquise amarela.
  for (const x of [-2.48, 2.48]) addBox(0.5, 2.6, 0.42, MAT.concrete, x, FIELD_Y, FIELD_Z, { collide: false });
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

  for (const sx of [-HALF_X, HALF_X]) {
    addBox(0.5, 3, HALF_Z * 2, MAT.concrete, sx, 0, 0);
    for (let z = -26; z <= 26; z += 6.5) {
      const i = Math.round((z + 26) / 6.5), h = 3.2 + (i % 3) * 0.72;
      addBox(0.12, h, 5.9, i % 2 ? MAT.wall : MAT.baile, sx - Math.sign(sx) * 0.31, 0, z, { collide: false });
      addBox(0.38, 0.1, 6.15, MAT.roof, sx - Math.sign(sx) * 0.25, h, z, { collide: false });
      addBox(0.05, 0.82, 1.15, MAT.glass, sx - Math.sign(sx) * 0.39, 1.25 + (i % 2) * 0.42, z - 1.25, { collide: false, cast: false });
      addBox(0.05, 1.92, 0.82, MAT.door, sx - Math.sign(sx) * 0.39, 0.02, z + 1.45, { collide: false, cast: false });
    }
  }
  for (const sz of [-HALF_Z, HALF_Z]) {
    addBox(HALF_X * 2, 3, 0.5, MAT.concrete, 0, 0, sz);
    for (let x = -31.5; x <= 31.5; x += 7) {
      const i = Math.round((x + 31.5) / 7), h = 3.0 + ((i + (sz > 0 ? 1 : 0)) % 4) * 0.55;
      addBox(6.4, h, 0.12, i % 3 ? MAT.wall : MAT.concrete, x, 0, sz - Math.sign(sz) * 0.31, { collide: false });
      addBox(6.65, 0.1, 0.38, MAT.roof, x, h, sz - Math.sign(sz) * 0.25, { collide: false });
      addBox(1.08, 0.78, 0.05, MAT.glass, x - 1.4, 1.25 + (i % 2) * 0.38, sz - Math.sign(sz) * 0.39, { collide: false, cast: false });
      addBox(0.84, 1.92, 0.05, MAT.door, x + 1.45, 0.02, sz - Math.sign(sz) * 0.39, { collide: false, cast: false });
    }
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

  const segClear = (a, b) => {
    let h = groundHeightAt(a.x, a.z);
    for (let i = 1; i <= 8; i++) {
      const t = i / 8, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
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

  PB.build(root);
  const D_PIXO = decalIds(T, ['folha-pixaca-02.png', 'folha-pixaca-03.png']);
  const D_MURAL = decalIds(T, ['or-mitico-mural.png', 'personagem-muro.png']);
  grafitar({
    id: 'fy_campomorro', root, T, waypoints: nodes, seed: 5077, passo: 1.05, alcance: 8, cobre: 0.045, minLarg: 0.4,
    bandas: [
      { y0: 0.3, y1: 2.4, larg: 3.2, alturas: [1.8, 1.2, 0.8], chance: 24, pool: D_PIXO },
      { y0: 1.6, y1: 3.4, larg: 4.2, alturas: [1.8, 1.3], chance: 28, pool: D_MURAL },
    ],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    levels: [{ nome: 'galpao', x0: GALPAO.x0, x1: GALPAO.x1, z0: GALPAO.z0, z1: GALPAO.z1, dePartida: 'B' }],
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
