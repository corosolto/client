// LAJES (fy_lajes) — spec plans/10-LAJES.md: comunidade carioca em DUAS CAMADAS — lajes
// em cima, becos embaixo. Um time nasce nas lajes e se move pulando de telhado em telhado;
// o outro nos becos e domina o nível da rua. O mapa é a luta pela VERTICAL: quem está em
// cima vê longe mas se expõe; quem está embaixo tem cover mas não vê nada.
//
// PLANTA (eixo longo = z; norte = -z). Duas fileiras de prédios com becos estreitos:
//   ROW N   z ∈ [-35, -10]  lajes a y=3,5 (spawn A no topo)
//   BECO C  z ∈ [-10, 10]   y=0 (corredor central largo, conecta todos os becos)
//   ROW S   z ∈ [10, 35]    lajes a y=3,5 (spawn B embaixo)
//
// O MULTINÍVEL funciona como no havan: cada prédio é SÓLIDO (caixa de y=0 a y=3,5), o topo
// é a laje andável, e os becos correm ENTRE os prédios a y=0. Escadas em 4 pontos conectam
// as camadas. groundHeightAt retorna 3,5 sobre prédios e 0 nos becos.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { GRAFITE } from './graffiti_layout.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 22, HALF_Z = 38;
const LAJE_H = 3.5;     // altura da laje (topo do prédio)

// parâmetros de escada (NBR 9077)
const ESC = { espelho: 0.17, piso: 0.29 };
const N_STAIR = Math.round(LAJE_H / ESC.espelho);  // ~21 degraus
const STAIR_RUN = N_STAIR * ESC.piso;               // ~6,1 m

// O recorte azul de `folha-person-01.png` leu como Rick Sánchez nas duas capturas
// de 11/08. A troca é nominal, preserva as vagas assadas e usa o mural original do
// time Mítico; assim o gerador pode ser reexecutado depois sem reintroduzir a peça.
export const LAJES_ARTE_SUBSTITUICOES = Object.freeze({
  'folha-person-01.png': 'or-mitico-mural.png',
  'personagens-graffiti-01.png': 'or-mitico-mural.png',
  'folha-person-02.png': 'or-mitico-mural.png',
});
for (const [antes, depois] of Object.entries(LAJES_ARTE_SUBSTITUICOES)) {
  const arquivos = GRAFITE?.fy_lajes?.arquivos || [];
  for (let i = 0; i < arquivos.length; i++) if (arquivos[i] === antes) arquivos[i] = depois;
}

// grid de prédios: cada entrada = { x, z, w, d, h } — footprint + altura
const EDIFICIOS = [];
function predio(x, z, w, d, h = LAJE_H) { EDIFICIOS.push({ x, z, w, d, h }); }

// FILEIRA NORTE (lajes onde o spawn A nasce):
// prédio central LARGO (segura os 4 slots de spawn a 1,5 m da borda) + 2 laterais
predio(-14, -22, 8, 18, LAJE_H);             // NW
predio(0, -22, 12, 18, LAJE_H + 1.5);        // centro (mais alto, spawn A no topo)
predio(14, -22, 8, 18, LAJE_H);              // NE
// FILEIRA SUL (lajes):
predio(-14, 20, 8, 14, LAJE_H);              // SW
predio(0, 20, 8, 14, LAJE_H);               // centro-sul
predio(14, 20, 8, 14, LAJE_H);               // SE
// Fileiras intermediárias fecham o vazio central e formam duas rotas longitudinais de laje.
predio(-14, -8, 8, 8, LAJE_H);
predio(14, -8, 8, 8, LAJE_H);
predio(-14, 8, 8, 8, LAJE_H);
predio(14, 8, 8, 8, LAJE_H);
// Um zigue-zague central liga norte e sul sem transformar o piso baixo num corredor reto.
predio(-5, -8, 4, 8, LAJE_H);
predio(5, 8, 4, 8, LAJE_H);
// ilha no beco central (cover)
predio(0, 0, 3, 3, LAJE_H);

export const LAJES_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas'];

export function buildLajes(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };
  const MAT = {
    asphalt: lam({ map: T.asphalt }), concrete: lam({ map: T.concrete }),
    concreteDark: lam({ map: T.concreteDark }), dirt: lam({ map: T.dirt }),
    grass: lam({ map: T.grass }), wall: lam({ map: T.concrete }),
    zinc: lam({ color: 0x777b78, metalness: 0.34, roughness: 0.7 }),
    route: lam({ color: 0xe0b52e, emissive: 0x6b4300, emissiveIntensity: .42, roughness: .72 }),
  };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 3, ry = 3) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    };
    MAT.asphalt = lam({ map: load('/img/textures/asphalt_br.webp', 5, 9), roughness: 0.96 });
    MAT.concrete = lam({ map: load('/img/textures/concrete_br.webp', 4, 7), roughness: 0.94 });
    MAT.concreteDark = lam({ map: load('/img/textures/concrete_br.webp', 3, 5), color: 0x77746d, roughness: 0.98 });
    MAT.dirt = lam({ map: load('/img/textures/dirt_field.webp', 5, 9), roughness: 1 });
    MAT.wall = lam({ map: load('/img/textures/favela_wall.webp', 3, 4), roughness: 0.98 });
    MAT.zinc = lam({ map: load('/img/textures/tex_zinco.webp', 3, 3), metalness: 0.34, roughness: 0.7 });
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
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
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
  const PAREDES = [
    MAT.wall, paredeTex('#a89d8a', 0.4, 602),
    paredeTex('#8d6e5a', 0.5, 803), paredeTex('#b0a06a', 0.35, 1004),
  ];

  const PB = new PropBatch({ bucket: 24 });

  /* ===================== CÉU / LUZ ===================== */
  setMapSky(scene, T, '/img/textures/sky_rj.webp', 0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_lajes');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x54483c, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.65); sun.position.set(25, 45, 15); sun.castShadow = true;
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
    addBox(e.w, e.h, e.d, mat, e.x, 0, e.z);
    solids.push({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, z0: e.z - e.d / 2, z1: e.z + e.d / 2 });
    // laje no topo (piso andável)
    const roof = addFloor(e.w, e.d, e.x, e.z, MAT.concrete, e.h + 0.02);
    if (i === 3) roof.userData.jumpSurface = 'south-west-building';
    if (i === 4) roof.userData.jumpSurface = 'south-center-building';
    if (i === 5) roof.userData.jumpSurface = 'south-east-building';
    // contrapiso da laje (para que a bala não atravesse)
    addBox(e.w, 0.12, e.d, lam({ color: 0x909088 }), e.x, e.h, e.z);
    footprints.push({ x0: e.x - e.w / 2, x1: e.x + e.w / 2, z0: e.z - e.d / 2, z1: e.z + e.d / 2, h: e.h });
  }
  addBox(8.5, 4.2, 0.05, MAT.mural, 0, 0.65, -12.82, { collide: false, cast: false, skirt: false });
  addBox(6.2, 3.2, 0.05, MAT.mural, -14, 0.55, 12.82, { collide: false, cast: false, skirt: false });

  // Os vãos crus eram 4 m no norte e 6 m no sul. As quatro ilhas deixam saltos de 0,9/1,5 m.
  const PONTES_LAJE = [
    { x: -8, z: -22, w: 4.0, h: LAJE_H + 0.75 }, { x: 8, z: -22, w: 4.0, h: LAJE_H + 0.75 },
    { x: -7, z: 20, w: 3.0, h: LAJE_H }, { x: 7, z: 20, w: 3.0, h: LAJE_H },
    { x: -14, z: -12.5, w: 3.2, d: 1.2, h: LAJE_H }, { x: 14, z: -12.5, w: 3.2, d: 1.2, h: LAJE_H },
    { x: -14, z: 12.5, w: 3.2, d: 1.2, h: LAJE_H }, { x: 14, z: 12.5, w: 3.2, d: 1.2, h: LAJE_H },
    { x: -5, z: -12.5, w: 4.0, d: 1.2, h: LAJE_H + 0.75 },
  ];
  for (let i = 0; i < PONTES_LAJE.length; i++) {
    const p = PONTES_LAJE[i];
    const d = p.d || 3.0;
    const jump = addBox(p.w, 0.12, d, MAT.concreteDark, p.x, p.h, p.z);
    if (i === 2) jump.userData.jumpSurface = 'south-west-island';
    if (i === 3) jump.userData.jumpSurface = 'south-east-island';
    footprints.push({ x0: p.x - p.w / 2, x1: p.x + p.w / 2, z0: p.z - d / 2, z1: p.z + d / 2, h: p.h });
    // A faixa frontal continua visível quando a câmera olha a rota no sentido do
    // salto; antes só as laterais amarelas apareciam e a ilha lia como placa contínua.
    const landing = addBox(p.w, .035, .18, MAT.route, p.x, p.h + .125, p.z - d / 2 + .09,
      { collide:false, cast:false, skirt:false, vao:false });
    landing.userData.jumpLandingEdge = `bridge-${i + 1}`; landing.userData.jumpEdgeWidth = .18;
  }
  // O salto continuava mecanicamente correto (1,50 m), porém a captura lia uma placa
  // contínua. Oito bordas de 18 cm revelam o ar em ambos os lados dos quatro vãos.
  for (const [i, x] of [-10, -8.5, -5.5, -4, 4, 5.5, 8.5, 10].entries()) {
    const edge = addBox(.18, .035, 2.72, MAT.route, x, LAJE_H + .125, 20, { collide: false, cast: false, skirt: false, vao: false });
    edge.userData.jumpEdge = `south-${i + 1}`; edge.userData.jumpEdgeWidth = .18;
  }
  // Três eixos discretos conectam visualmente as coberturas sem virar corrimão ou
  // obstáculo: são tinta no piso, não uma nova rota mecânica.
  for (const [x, nome] of [[-14, 'west'], [0, 'center'], [14, 'east']]) {
    const route = addBox(.18, .025, 8.5, MAT.route, x, LAJE_H + .125, 20, { collide: false, cast: false, skirt: false, vao: false });
    route.userData.roofRoute = nome;
  }
  // Um volume/cor por ala é orientação de jogo, não decoração repetida.
  for (const [x, cor, nome, h] of [[-14,0x2f7394,'west',1.7],[0,0xc36c35,'center',1.25],[14,0x4d8651,'east',2.05]]) {
    const marco = addBox(1.35,h,1.35,lam({ color:cor,roughness:.76 }),x,LAJE_H + .14,-18,
      { collide:false,cast:true,skirt:false,vao:false });
    marco.userData.lajesWing = nome;
  }

  /* A massa jogável continua nos footprints acima. Esta segunda pele quebra
     as caixas em puxadinhos, portas e platibandas menores sem alterar colisão ou A*. */
  const tijolo = lam({ color: 0x9b5438, roughness: 1 });
  const zinco = MAT.zinc;
  const porta = lam({ color: 0x365458, roughness: 0.82 });
  const janela = lam({ color: 0x18262b, metalness: 0.18, roughness: 0.32 });
  const fachadas = [
    [-14, -12.91, 2.4, 0.16, 2.75, tijolo], [-10.8, -12.91, 1.5, 0.22, 2.15, PAREDES[3]],
    [-3.8, -12.91, 2.1, 0.18, 2.45, PAREDES[1]], [2.0, -12.91, 2.8, 0.2, 3.1, tijolo],
    [14, -12.91, 2.7, 0.16, 2.55, PAREDES[0]], [-14, 12.91, 2.3, 0.18, 2.6, PAREDES[2]],
    [-1.8, 12.91, 2.1, 0.16, 2.3, tijolo], [14, 12.91, 2.5, 0.18, 2.85, PAREDES[3]],
  ];
  for (const [x, z, w, d, h, mat] of fachadas)
    addBox(w, h, d, mat, x, 0.05, z, { collide: false, skirt: false });
  for (const [x, z, cor] of [[-14, -12.79, porta], [-2.5, -12.79, porta], [14, -12.79, porta], [-14, 12.79, porta], [2.2, 12.79, porta], [14, 12.79, porta]]) {
    addBox(0.92, 1.85, 0.05, cor, x, 0.04, z, { collide: false, cast: false, skirt: false });
    addBox(1.22, 0.11, 0.62, zinco, x, 1.9, z + (z < 0 ? 0.27 : -0.27), { collide: false, skirt: false });
  }
  for (const [x, z, y] of [[-10.8, -12.78, 1.25], [3.2, -12.78, 1.35], [11.8, -12.78, 1.2], [-11.2, 12.78, 1.3], [-1.2, 12.78, 1.15], [11.4, 12.78, 1.4]])
    addBox(1.1, 0.75, 0.05, janela, x, y, z, { collide: false, cast: false, skirt: false });

  // As faces laterais continuam a rua em L: módulos estreitos, marquises e uma saia
  // úmida interrompem a leitura de dois corredores ortogonais abertos.
  const umidade = lam({ color: 0x394336, roughness: 1 });
  const laterais = [
    [-9.91,-26,.05,5.4,2.5,PAREDES[2]],[-9.91,-18,.05,4.2,3.0,tijolo],
    [-6.09,-26,.05,4.6,2.8,PAREDES[0]],[6.09,-18,.05,5.0,2.35,PAREDES[3]],
    [9.91,-26,.05,5.2,2.7,tijolo],[9.91,-18,.05,4.0,3.15,PAREDES[1]],
    [-9.91,17,.05,4.8,2.9,PAREDES[0]],[-9.91,24,.05,3.8,2.3,tijolo],
    [-4.09,17,.05,4.6,2.55,PAREDES[3]],[4.09,23,.05,4.0,3.0,PAREDES[1]],
    [9.91,17,.05,4.5,2.7,tijolo],[9.91,24,.05,3.8,2.45,PAREDES[2]],
  ];
  for (const [x,z,w,d,h,mat] of laterais) {
    addBox(w, h, d, mat, x, .04, z, { collide: false, skirt: false });
    addBox(.7, .09, d + .35, zinco, x + (x < 0 ? .31 : -.31), h - .06, z,
      { collide: false, skirt: false });
  }
  for (const [x,z,w,d] of [[-14,-12.73,8,.08],[0,-12.73,12,.08],[14,-12.73,8,.08],[-14,12.73,8,.08],[0,12.73,8,.08],[14,12.73,8,.08],[-9.84,-22,.08,17.5],[9.84,-22,.08,17.5],[-9.84,20,.08,13.5],[9.84,20,.08,13.5]])
    addBox(w, .24, d, umidade, x, .02, z, { collide: false, cast: false, skirt: false });
  // Toldos altos ocupam o enquadramento, mas ficam acima do peito e não mudam o corredor.
  for (const [x,z,w,d,ry,cor] of [[-12,-9.9,3.6,1.5,.04,0xb66b35],[5.5,-10.1,4.2,1.35,-.05,0x3b7a68],[-5.5,10.1,3.8,1.4,.06,0xc2a43e],[12,9.9,3.4,1.55,-.04,0x9c493c]])
    addBox(w, .08, d, lam({ color: cor, roughness: .88 }), x, 2.65, z, { collide: false, skirt: false, ry });

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
  const caixaMat = lam({ color: 0x151718, roughness: 0.82 });
  function caixaDagua(x, z, y, s = 1) {
    const r = 0.86 * s, h = 2.05 * s;
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.96, h, 16), caixaMat);
    tank.position.set(x, y + h / 2, z); tank.castShadow = tank.receiveShadow = true; rooftopDetail(tank, 'tank'); root.add(tank);
    col(x - r, x + r, y, y + h, z - r, z + r); occluders.push(tank);
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(r * .86, r * .94, .16, 16), caixaMat);
    tampa.position.set(x, y + h + .08, z); tampa.castShadow = true; root.add(tampa);
  }
  for (const [ex, ez, ey] of [[-15,-25,LAJE_H],[4,-29,LAJE_H+1.5],[15,-25,LAJE_H]]) caixaDagua(ex, ez, ey);
  // Clusters de caixas cilíndricas e parabólicas criam o ritmo de telhado carioca.
  // As silhuetas adicionais ficam sobre covers já físicos; a sonda MAP1 não pode
  // confundir decoração atravessável com espaço onde o jogador deveria caber.
  for (const [x, z, y, s] of [[-15,-25,LAJE_H,0.72],[-14.45,-24.65,LAJE_H,0.58],[4,-29,LAJE_H+1.5,0.8],[4.45,-28.7,LAJE_H+1.5,0.55],[15,-25,LAJE_H,0.65],[14.45,-24.7,LAJE_H,0.52],[6.65,25,LAJE_H+2,0.55],[7.35,25,LAJE_H+2,0.48]]) {
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
  for (const [x,z,y] of [[-15,-25,LAJE_H+2.5],[4,-29,LAJE_H+4],[15,-25,LAJE_H+2.5],[7,25,LAJE_H+4]]) {
    const tampa = new THREE.Mesh(new THREE.CylinderGeometry(.76, .84, .16, 16), tampaCaixa);
    tampa.position.set(x, y + .08, z); tampa.castShadow = true; root.add(tampa);
    addBox(.08, .7, .08, metal, x + .48, y, z + .35, { collide: false, skirt: false });
  }
  for (const [x, z, y, ry] of [[-7,-30,LAJE_H,0.2],[7,-30,LAJE_H+1.5,-0.4],[-15,17,LAJE_H,0.6],[14,24,LAJE_H,-0.7],[2,1,LAJE_H,0.1]]) {
    addBox(0.06, 2.5, 0.06, metal, x, y, z, { collide: false, skirt: false });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 6, 0, Math.PI), metal);
    dish.scale.set(1, 0.32, 1); dish.rotation.set(-Math.PI / 2.8, ry, 0); dish.position.set(x, y + 2.1, z); rooftopDetail(dish, 'antenna'); root.add(dish);
  }
  // varal (decoração)
  for (const [ex, ey] of [[-15, LAJE_H + 1.5], [0, LAJE_H + 3.0]]) {
    rooftopDetail(addBox(0.04, 0.04, 4.0, lam({ color: 0x8a8a8a }), ex, ey, -20, { collide: false }), 'clothesline');
    for (let i = 0; i < 4; i++) addBox(0.55, 0.65, 0.03, lam({ color: i % 2 ? 0xb6a77e : 0x66745b }), ex, ey - 0.62, -21.2 + i * 0.8, { collide: false, cast: false });
  }
  for (const [x, z, y, rz] of [[-13,20,LAJE_H+2.2,0],[3,20,LAJE_H+2.0,0],[13,-22,LAJE_H+2.1,0]]) {
    rooftopDetail(addBox(4.2, 0.025, 0.025, lam({ color: 0x57534d }), x, y, z, { collide: false, cast: false, skirt: false }), 'clothesline');
    for (let i = 0; i < 5; i++) addBox(0.52 + (i % 2) * 0.18, 0.7 + (i % 3) * 0.14, 0.025,
      lam({ color: [0x2f6b9b,0xd8b040,0xb74435,0xe6dfc7,0x567b4d][i] }), x - 1.65 + i * 0.82, y - 0.78, z + rz,
      { collide: false, cast: false, skirt: false });
  }
  // Fiação alta dá escala aos becos sem criar cover nem interferir na bala.
  for (const [w, d, x, z] of [[18, 0.025, 0, -7], [18, 0.025, 0, 7], [0.025, 16, -11, -22], [0.025, 16, 11, -22]])
    addBox(w, 0.025, d, lam({ color: 0x25231f }), x, 4.8, z, { collide: false, cast: false, skirt: false });
  // barraco de obra numa laje sul
  addBox(3.0, 2.0, 3.0, PAREDES[2], 7, LAJE_H, 25);
  solids.push({ x0: 5.5, x1: 8.5, z0: 23.5, z1: 26.5, h: LAJE_H + 2.0 });

  /* ===================== ESCADAS (4 conexões entre camadas) =====================
     Cada escada sobe de y=0 a y=LAJE_H. São o ponto de estrangulamento — posições
     contestáveis dos dois lados. A CTF2 pede ≥ 2 rotas separadas entre cada spawn
     e cada bandeira; as escadas nas pontas leste/oeste dão essa separação. */
  const ESCADAS = [
    { nome: 'noroeste', x: -19.5, z: -10, dz: -1 },
    { nome: 'nordeste', x: 19.5, z: -10, dz: -1 },
    { nome: 'sudoeste', x: -19.5, z: 10, dz: 1 },
    { nome: 'sudeste', x: 19.5, z: 10, dz: 1 },
  ];
  function buildStair(es) {
    const w = 2.5;
    for (let i = 0; i < N_STAIR; i++) {
      const z = es.z + es.dz * i * ESC.piso;
      const y = i * ESC.espelho;
      addBox(w, 0.04, ESC.piso, MAT.concrete, es.x, y, z, { collide: false });
    }
    // muro lateral da escada
    const z = es.z + es.dz * STAIR_RUN / 2;
    addBox(0.2, LAJE_H, STAIR_RUN, MAT.concrete, es.x - w / 2, 0, z);
    addBox(0.2, LAJE_H, STAIR_RUN, MAT.concrete, es.x + w / 2, 0, z);
  }
  for (const es of ESCADAS) buildStair(es);

  // registrar zonas de escada para groundHeightAt
  const stairZones = ESCADAS.map((es) => ({
    x0: es.x - 1.25, x1: es.x + 1.25,
    z0: Math.min(es.z, es.z + es.dz * STAIR_RUN), z1: Math.max(es.z, es.z + es.dz * STAIR_RUN),
    inicio: es.z, dz: es.dz,
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

  // Toda borda com queda de andar recebe platibanda física; pontes e topo das escadas
  // ficam abertos porque o piso amostrado do outro lado continua na mesma cota.
  function guardaTrechos(e, eixo, sinal) {
    const inicio = eixo === 'x' ? e.z - e.d / 2 : e.x - e.w / 2;
    const fim = eixo === 'x' ? e.z + e.d / 2 : e.x + e.w / 2;
    const passo = 0.5, abertos = [];
    for (let q = inicio + passo / 2; q < fim; q += passo) {
      const x = eixo === 'x' ? e.x + sinal * (e.w / 2 + 1.0) : q;
      const z = eixo === 'x' ? q : e.z + sinal * (e.d / 2 + 1.0);
      if (e.h - groundHeightAt(x, z, e.h) >= 2) abertos.push(q);
    }
    if (!abertos.length) return;
    let a = abertos[0] - passo / 2, b = abertos[0] + passo / 2;
    const flush = () => {
      if (eixo === 'x') addBox(0.34, 1.02, b - a, MAT.concreteDark, e.x + sinal * e.w / 2, e.h, (a + b) / 2);
      else addBox(b - a, 1.02, 0.34, MAT.concreteDark, (a + b) / 2, e.h, e.z + sinal * e.d / 2);
    };
    for (let i = 1; i < abertos.length; i++) {
      if (abertos[i] - abertos[i - 1] <= passo + 0.01) b = abertos[i] + passo / 2;
      else { flush(); a = abertos[i] - passo / 2; b = abertos[i] + passo / 2; }
    }
    flush();
  }
  for (const e of EDIFICIOS) {
    guardaTrechos(e, 'x', -1); guardaTrechos(e, 'x', 1);
    guardaTrechos(e, 'z', -1); guardaTrechos(e, 'z', 1);
  }

  /* ===================== MUROS EXTERNOS ===================== */
  for (const sx of [-HALF_X, HALF_X])
    addBox(0.5, 4, HALF_Z * 2, MAT.concrete, sx, 0, 0);
  addBox(HALF_X * 2 + 1, 4, 0.5, MAT.concrete, 0, 0, -HALF_Z);
  addBox(HALF_X * 2 + 1, 4, 0.5, MAT.concrete, 0, 0, HALF_Z);

  /* ===================== COVER NOS BECOS ===================== */
  // helper de casa sólida (mesma do quebrada: nenhum interior acessível)
  function casa(x, z, w, d, h, matIdx) {
    const mat = PAREDES[matIdx % PAREDES.length];
    addBox(w, h, d, mat, x, 0, z);
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    addBox(w + 0.3, 0.12, d + 0.3, MAT.concreteDark, x, h, z, { collide: false });
  }
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
    for (const f of footprints) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) return f.h;
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
      return Math.min(N_STAIR - 1, Math.round(dist / ESC.piso)) * ESC.espelho + 0.04;
    }
    // laje (topo de prédio)
    const fh = inFootprint(x, z);
    if (fh > 0) return fh;
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
    const y = groundHeightAt(x, z);
    const proxy = addBox(0.9, 0.9, 0.9, coverMat, x, y, z);
    if (id) glbSobre(proxy, id, x, y, z, 0.9);
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
  // lajes (topos de prédios) — adensamento para cobertura de waypoints
  for (const e of EDIFICIOS) {
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
  // As arestas dirigidas abaixo descrevem os desníveis de 0,75 m das passarelas.
  // O jogador cai sobre elas sem atravessar platibanda; o teste genérico de segmento,
  // que só conhece AABB em 2D, confundia a face do prédio com uma parede intransponível.
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

  /* ===================== GRAFFITI ===================== */
  const D_PIXO = decalIds(T, ['folha-pixaca-01.png', 'folha-pixaca-02.png', 'folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  const D_THROW = decalIds(T, ['folha-throwu-01.png', 'folha-throwu-02.png', 'folha-throwu-03.png', 'folha-throwu-04.png', 'folha-throwu-05.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  const D_MURAL = decalIds(T, ['or-mitico-mural.png', 'personagem-muro.png', 'personagens-graffiti-02.png', 'personagens-graffiti-03.png']);
  const D_CARA = decalIds(T, ['caras-cartoon-02.png', 'caras-cartoon-05.png', 'caras-cartoon-08.png']);
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png']);
  const D_PERSO = decalIds(T, ['folha-person-03.png']);
  const D_CARTAZERA = decalIds(T, ['folha-lambes.png', 'folha-stenci.png']);
  const D_ADESIVO = decalIds(T, ['tags-treino-01.png', 'tags-treino-02.png', 'tags-treino-03.png']);
  grafitar({
    id: 'fy_lajes',
    root, T, waypoints: nodes, seed: 6088, passo: 0.95, alcance: 9, cobre: 0.025, minLarg: 0.3,
    limpo: stairZones,
    bandas: [
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6], chance: 45,
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0], chance: 38,
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], chance: 28, planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    stairs: ESCADAS.map((es) => ({ nome: es.nome, x0: es.x - 1.25, x1: es.x + 1.25,
      z0: Math.min(es.z, es.z + es.dz * STAIR_RUN), z1: Math.max(es.z, es.z + es.dz * STAIR_RUN), topo: LAJE_H })),
    levels: ESCADAS.map((es) => { const z = es.z + es.dz * STAIR_RUN; return { nome: `laje ${es.nome}`, x0: es.x - 1.5, x1: es.x + 1.5,
      z0: z - 1.5, z1: z + 1.5, dePartida: 'B' }; }),
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
