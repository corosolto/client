// CÓRREGO (fy_corrego) — spec plans/13-CORREGO.md: favela de São Paulo sobre um córrego
// a céu aberto. Água escura corta o mapa no meio; pontes de madeira ligam os dois lados.
// Casas de madeira com telhado de zinco, antena parabólica, caixas d'água. Jacaré no
// córrego, capivara na margem, ratos no lixo. É o mapa mais brasileiro do elenco.
//
// PLANTA (eixo longo = z; norte = -z).
//   MARGEM O  x ∈ [-24, -3]   spawn B (casas de madeira, vielas)
//   CÓREGO    x ∈ [-3, 3]     água a y=-0,3; intransponível (colisor)
//   MARGEM L  x ∈ [3, 24]     spawn E (espelho do oeste)
//   3 pontes em z = -22, 0, 22
//   Alagado em z ∈ [-40,-34] e [34,40] (chão com textura de água)
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

export const HALF_X = 24, HALF_Z = 40;
const CORREGO_W = 10;         // eixo largo o bastante para dominar a leitura aérea e em FPS
const CORREGO_X0 = -CORREGO_W / 2, CORREGO_X1 = CORREGO_W / 2;

export const CORREGO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_som', 'fav_house'];

export const CORREGO_ARTE_SUBSTITUICOES = Object.freeze({
  'folha-person-02.png': 'or-mitico-mural.png',
  'personagens-graffiti-01.png': 'or-mitico-mural.png',
  'poster:despisque-leao.jpg': 'poster:or-quebrada-vive.jpg',
  'poster:ashtar-meme.jpg': 'poster:or-quebrada-vive.jpg',
  'poster:ashtar.png': 'poster:or-quebrada-vive.jpg',
  'personagens-graffiti-02.png': 'or-graf-treta.png',
  'personagens-graffiti-03.png': 'or-graf-treta.png',
});
for (const [antes, depois] of Object.entries(CORREGO_ARTE_SUBSTITUICOES)) {
  const arquivos = GRAFITE?.fy_corrego?.arquivos || [];
  for (let i = 0; i < arquivos.length; i++) if (arquivos[i] === antes) arquivos[i] = depois;
}

export function buildCorrego(scene, T) {
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

  // Texturas reais no browser, canvas fallback em node
  let TEX = {
    dirt: lam({ map: T.dirt }), concrete: lam({ map: T.concrete }),
    asphalt: lam({ map: T.asphalt }), concreteDark: lam({ map: T.concreteDark }),
    wall: lam({ map: T.dirt, color: 0x9a7658 }),
    zinco: lam({ color: 0x77746d, metalness: 0.4, roughness: 0.6 }),
    agua: lam({ color: 0x42543b, roughness: 0.24, metalness: 0.12 }),
    pixo: lam({ map: T.concreteDark, roughness: 0.98 }),
  };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 4, ry = 4) => {
      const t = new THREE.TextureLoader().load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    };
    TEX.dirt = lam({ map: load('/img/textures/dirt_field.webp', 5, 8), roughness: 1.0 });
    TEX.wall = lam({ map: load('/img/textures/tex_madeira.webp', 2, 2) });         // parede de madeira
    TEX.zinco = lam({ map: load('/img/textures/tex_zinco.webp', 3, 3), metalness: 0.4, roughness: 0.6 });
    TEX.asphalt = lam({ map: load('/img/textures/asphalt_br.webp', 5, 8) });
    TEX.concrete = lam({ map: load('/img/textures/concrete_br.webp', 3, 5) });
    TEX.agua = lam({ map: load('/img/textures/tex_agua_poluida.webp', 2, 6), color: 0x42543b, roughness: 0.24, metalness: 0.12 });
    TEX.pixo = lam({ map: load('/img/textures/corrego_streetart_pixo.webp', 2, 2), roughness: 0.98 });
  }

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
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });

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
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex });
  }
  const PAREDES = [paredeTex('#c4a87a', 0.3, 301), paredeTex('#a89d8a', 0.4, 502),
    paredeTex('#8d6e5a', 0.5, 703), paredeTex('#b0a06a', 0.35, 904)];

  const PB = new PropBatch({ bucket: 24 });
  const GLB_ON = QP.get('glb') !== '0';
  function propComFallback(id, x, z, h, ry, fallback) {
    const proxy = fallback();
    if (!GLB_ON || !hasProp(id)) return proxy;
    const o = placeProp(id, { x, z, targetH: h, ry });
    if (!o) return proxy;
    proxy.visible = false; // collider/LOS continuam idênticos no A/B procedural.
    root.add(o);
    return proxy;
  }

  /* ===================== CÉU / LUZ ===================== */
  setMapSky(scene, T, '/img/textures/sky_sp.webp', 0xb9a08a);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_corrego');
  const hemi = new THREE.HemisphereLight(0xd8b89a, 0x4a3830, 0.85); scene.add(hemi);   // mais quente/amarelado
  const sun = new THREE.DirectionalLight(0xffc888, 1.7); sun.position.set(20, 35, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO DAS MARGENS ===================== */
  // asfalto nas vielas principais de cada margem
  addFloor(21, HALF_Z * 2, -13.5, 0, TEX.asphalt || lam({ map: T.asphalt }), 0.01);
  addFloor(21, HALF_Z * 2, 13.5, 0, TEX.asphalt || lam({ map: T.asphalt }), 0.01);

  /* ===================== O CÓRREGO =====================
     Água escura no centro do mapa. É um colisor (não dá pra atravessar a pé),
     mas as PONTES passam por cima. O jacaré é decoração dentro da água. */
  // água (plano baixo com textura poluída)
  const aguaViva = lam({ map: TEX.agua.map || null, color: 0xa0b49a, roughness: .12, metalness: .18,
    emissive: 0x16281d, emissiveIntensity: .28 });
  const lamina = addFloor(CORREGO_W, HALF_Z * 2, 0, 0, aguaViva, -0.36);
  lamina.userData.nonSolidSurface = true; lamina.userData.corregoWaterSurface = 'base';
  // Uma segunda lâmina translúcida devolve o céu e impede que o canal leia como asfalto verde.
  const reflexoAgua = lam({ color: 0x8fc4b4, transparent: true, opacity: .24, roughness: .06,
    metalness: .32, emissive: 0x14372f, emissiveIntensity: .24, depthWrite: false });
  const reflexo = addFloor(CORREGO_W - .35, HALF_Z * 2 - .6, 0, 0, reflexoAgua, -0.345);
  reflexo.userData.nonSolidSurface = true; reflexo.userData.corregoWaterSurface = 'reflection'; reflexo.renderOrder = 2;
  // Prateleiras molhadas cobrem visualmente o topo do talude e ampliam a leitura da água.
  const aguaRasa = lam({ color: 0x73927a, transparent: true, opacity: .78, roughness: .12, metalness: .18,
    emissive: 0x172d20, emissiveIntensity: .26, depthWrite: false });
  for (const x of [-4, 4]) {
    const m = addFloor(2.0, HALF_Z * 2 - 1, x, 0, aguaRasa, 0.025);
    m.userData.nonSolidSurface = true; m.renderOrder = 2;
  }
  // Reflexos compridos quebram a faixa uniforme sem aumentar o custo de geometria.
  const brilho = lam({ color: 0xc2e0d5, emissive: 0x315d50, emissiveIntensity: .35,
    transparent: true, opacity: .28, roughness: .04, depthWrite: false });
  for (const [x,z,w,d,ry] of [[-1.6,-27,1.0,12,.035],[1.8,-12,.75,9,-.045],[-1.3,4,.9,13,.025],[1.65,22,.8,12,-.035]]) {
    const r = addBox(w, .012, d, brilho, x, -.338, z, { collide: false, cast: false, skirt: false, ry });
    r.userData.nonSolidSurface = true; r.renderOrder = 3;
  }
  // taludes (margens inclinadas de concreto)
  for (const [tx, tz] of [[CORREGO_X0, 0], [CORREGO_X1, 0]]) {
    const paredeCanal = addBox(2.0, 1.0, HALF_Z * 2, TEX.concrete || lam({ map: T.concrete }), tx + (tx < 0 ? 1 : -1), -1.0, 0);
    paredeCanal.userData.corregoDepthWall = tx < 0 ? 'oeste' : 'leste';
  }
  const limo = lam({ color: 0x293a2a, roughness: 1 });
  for (const x of [CORREGO_X0 - 0.18, CORREGO_X1 + 0.18]) addBox(0.36, 0.08, HALF_Z * 2, limo, x, -0.04, 0, { collide: false, cast: false });
  // Espuma, sacolas e garrafas quebram a lâmina reta; tudo flutua sem colisão.
  const espuma = lam({ color: 0xf0ecd3, emissive: 0x4b4a35, emissiveIntensity: .28, transparent: true, opacity: 0.9, roughness: 0.72 });
  for (const [x, z, w, d, ry] of [[-1.2,-31,3.2,.82,.3],[1.35,-25,2.7,.7,-.4],[-.65,-16,3.5,.78,.15],[1.2,-9,2.9,.72,-.25],[-1.2,7,3.4,.76,.2],[1.05,15,3.2,.82,-.15],[-.8,28,3.1,.74,.35]])
    addBox(w, 0.018, d, espuma, x, -0.34, z, { collide: false, cast: false, skirt: false, ry });
  for (const [x,z,s] of [[-2.8,-19,.5],[2.7,-12,.42],[-2.9,12,.48],[2.85,24,.4]]) {
    const bolha = new THREE.Mesh(new THREE.CircleGeometry(s, 12), espuma);
    bolha.rotation.x = -Math.PI / 2; bolha.position.set(x, .036, z); root.add(bolha);
  }
  const lixoAgua = [0xc74c36, 0xe0d59a, 0x47709a, 0xddd7c9, 0x5b7546].map(color => lam({ color, roughness: 0.82 }));
  for (const [i, x, z, ry] of [[0,-1.8,-27,.5],[1,1.6,-18,-.3],[2,-1.1,-9,.8],[3,1.8,5,-.7],[4,-1.5,13,.4],[0,1.2,26,-.5]])
    addBox(0.32, 0.045, 0.18, lixoAgua[i], x, -0.32, z, { collide: false, cast: false, skirt: false, ry });
  // colisor do córrego (intransponível)
  col(CORREGO_X0, CORREGO_X1, -2.0, -0.12, -HALF_Z + 6, HALF_Z - 6);
  // ALAGADO nas pontas (não tem colisor — anda por cima, só é visual de água rasa)
  // norte
  addFloor(CORREGO_W + 4, 6, 0, -HALF_Z + 3, TEX.agua || lam({ color: 0x2a3a1a }), 0.02);
  addFloor(CORREGO_W + 4, 6, 0, HALF_Z - 3, TEX.agua || lam({ color: 0x2a3a1a }), 0.02);
  // remover colisor do córrego nos trechos alagados (substituir por chão andável)
  // — o col() acima já exclui as 6m de cada ponta ([-HALF_Z+6, HALF_Z-6])
  // Escadarias de contenção: descem da margem até a lâmina rasa nas duas pontas.
  for (const sz of [-1, 1]) for (let i = 0; i < 4; i++) {
    addBox(1.8, 0.04, 0.34, TEX.concrete, sz * (3.55 - i * 0.42), -i * 0.11, sz < 0 ? -36.2 : 36.2,
      { collide: false, skirt: false });
  }

  /* ===================== JACARÉ (decoração no córrego) ===================== */
  {
    const jx = 0.8, jz = -7;
    const gJacare = new THREE.Group();
    const matJ = lam({ color: 0x526238, roughness: .92 });
    const matBarriga = lam({ color: 0x899060, roughness: 1 });
    const matOlho = lam({ color: 0xe7c84b, emissive: 0x574200, emissiveIntensity: .35 });
    const corpo = new THREE.Mesh(new THREE.SphereGeometry(.58, 14, 8), matJ);
    corpo.scale.set(1.15,.48,2.25); corpo.position.z = -.25; gJacare.add(corpo);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(.9,.34,.82), matJ); cab.position.set(0,.04,1.18); gJacare.add(cab);
    const foc = new THREE.Mesh(new THREE.BoxGeometry(.78,.22,1.08), matBarriga); foc.position.set(0,-.02,2.05); gJacare.add(foc);
    const cauda = new THREE.Mesh(new THREE.ConeGeometry(.42,2.45,10), matJ);
    cauda.rotation.x = -Math.PI / 2; cauda.position.set(.12,-.03,-2.35); gJacare.add(cauda);
    for (const [lx,lz,rz] of [[-.58,.45,-.45],[.58,.45,.45],[-.56,-.75,.5],[.56,-.75,-.5]]) {
      const pata = new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.72,7), matJ);
      pata.rotation.z = rz; pata.position.set(lx,-.2,lz); gJacare.add(pata);
    }
    for (const ex of [-.28,.28]) {
      const ol = new THREE.Mesh(new THREE.SphereGeometry(.09,8,6), matOlho); ol.position.set(ex,.28,1.45); gJacare.add(ol);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(.035,6,4), lam({ color: 0x080806 })); pup.position.set(ex,.31,1.52); gJacare.add(pup);
    }
    for (let i = 0; i < 8; i++) { const d = new THREE.Mesh(new THREE.ConeGeometry(.08,.2,5), matJ); d.position.set(0,.35,-1.2+i*.36); gJacare.add(d); }
    gJacare.scale.set(1.05,1.05,1.05);
    gJacare.position.set(jx, -.08, jz); gJacare.rotation.y = .22;
    gJacare.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    root.add(gJacare);
  }

  /* ===================== CAPIVARA (na margem alagada sul) ===================== */
  {
    const cx = -5.2, cz = -38;
    const gCap = new THREE.Group();
    const matC = lam({ color: 0x6a4a3a, roughness: 0.9 });
    // Barril afunilado contínuo: o eixo do CylinderGeometry vira longitudinal.
    // O estado anterior (esfera + caixa + cilindros-pino) foi reprovado no pixel
    // mesmo com escala correta; as peças abaixo se sobrepõem de propósito na junta.
    const corpo = new THREE.Mesh(new THREE.CylinderGeometry(.43,.48,1.25,16,2), matC);
    corpo.rotation.x = Math.PI / 2; corpo.position.set(0,-.01,-.16);
    corpo.userData.capivaraPart='rounded-body-core'; gCap.add(corpo);
    for(const z of [-.78,.46]) {
      const tampa=new THREE.Mesh(new THREE.SphereGeometry(.47,14,9),matC);
      tampa.scale.set(1,.91,.58); tampa.position.set(0,-.01,z);
      tampa.userData.capivaraPart='body-cap'; gCap.add(tampa);
    }
    const garupa = new THREE.Mesh(new THREE.SphereGeometry(.44,12,8),matC);
    garupa.scale.set(1.04,.96,.72); garupa.position.set(0,.08,-.72);
    garupa.userData.capivaraPart='raised-rump'; gCap.add(garupa);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(.38,14,9), matC);
    cab.scale.set(1,.8,.92); cab.position.set(0,.06,.70);
    cab.userData.capivaraPart='blunt-head'; gCap.add(cab);
    const focinho = new THREE.Mesh(new THREE.SphereGeometry(.23,12,8), matC);
    focinho.scale.set(1,.72,.58); focinho.position.set(0,-.02,1.04);
    focinho.userData.capivaraPart='blunt-muzzle'; gCap.add(focinho);
    const nariz = new THREE.Mesh(new THREE.SphereGeometry(.075,8,5), lam({ color: 0x211b17, roughness: .8 })); nariz.position.set(0,-.01,1.18); gCap.add(nariz);
    for (const ex of [-.22,.22]) { const olho = new THREE.Mesh(new THREE.SphereGeometry(.048,7,5), lam({ color: 0x15100d })); olho.position.set(ex,.27,.78); olho.userData.capivaraPart='high-eyes'; gCap.add(olho); }
    for (const ex of [-0.21, 0.21]) { const orelha = new THREE.Mesh(new THREE.SphereGeometry(.075, 8, 6), matC); orelha.scale.set(1,.45,.72); orelha.position.set(ex,.34,.52); orelha.userData.capivaraPart='high-ears'; gCap.add(orelha); }
    // A tomada lateral olha ao longo de X: quatro Z distintos evitam que os pares
    // dianteiro/traseiro se fundam em apenas dois apoios no pixel.
    for (const [lx, lz] of [[-0.3, -0.30], [0.3, -1.05], [-0.3, 0.20], [0.3, 1.0]]) {
      const perna = new THREE.Mesh(new THREE.CylinderGeometry(.065,.085,.24,8), matC);
      perna.position.set(lx,-.43,lz); perna.userData.capivaraPart='short-leg'; gCap.add(perna);
      const pata = new THREE.Mesh(new THREE.SphereGeometry(.10,8,6), matC);
      pata.scale.set(.78,.42,.82); pata.position.set(lx,-.575,lz+.018);
      pata.userData.capivaraPart='rounded-foot'; gCap.add(pata);
    }
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(1.0,20),lam({ color:0x15130f,transparent:true,opacity:.38,depthWrite:false }));
    sombra.rotation.x=-Math.PI/2; sombra.scale.set(.62,1.05,1); sombra.position.y=-.63;
    sombra.userData.capivaraPart='contact-shadow'; sombra.userData.nonSolidSurface=true; gCap.add(sombra);
    // 45% da escala reprovada: comprimento 3,94 → ~1,78 m. A posição deixa folga
    // real para o pneu em (-6,-36), sem tirar a capivara da margem oeste alagada.
    gCap.scale.set(.665, .665, .665);
    gCap.position.set(cx, .43, cz);
    // Três-quartos leve + passada escalonada: os quatro apoios aparecem na tomada
    // lateral, sem deslocar o animal da margem nem alongar as pernas.
    gCap.rotation.y = .35;
    gCap.userData.fauna = 'capivara';
    gCap.userData.nonCollider = true;
    gCap.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    root.add(gCap);
  }
  // Contexto material do trio: manilha e sacos no canto evitam a leitura de três
  // objetos soltos no meio de uma esplanada limpa.
  {
    const contexto = new THREE.Group(); contexto.position.set(-18.05,0,-3.05);
    contexto.userData.corregoRatContext='manilha-e-lixo';
    const concretoManilha=lam({color:0x77726a,roughness:1});
    const tubo=new THREE.Mesh(new THREE.TorusGeometry(.34,.075,7,14,Math.PI*1.55),concretoManilha);
    tubo.rotation.y=Math.PI/2; tubo.position.set(-.78,.34,.12); tubo.userData.nonSolidSurface=true; contexto.add(tubo);
    for(const [x,z,s,c] of [[.35,.28,.42,0x252925],[.72,-.12,.34,0x3d4435],[.18,-.42,.3,0x24211f]]) {
      const saco=new THREE.Mesh(new THREE.DodecahedronGeometry(s,1),lam({color:c,roughness:1}));
      saco.scale.set(.75,1,.62); saco.position.set(x,s*.62,z); saco.userData.nonSolidSurface=true; contexto.add(saco);
    }
    root.add(contexto);
  }
  // Ratos decorativos perto do lixo; pequenos, sem collider e fora da leitura de cover.
  let ratIndex = 0;
  for (const [rx, rz, rr] of [[-16.95,-2.25,.2],[-16.95,-2.85,-.4],[-17.35,-1.95,.7],[17.5,16.6,1.1]]) {
    const rato = new THREE.Group();
    const albedoId = ratIndex % 2 ? 'castanho' : 'cinza';
    const poseId = ratIndex % 2 ? 'fareja' : 'corre';
    const mat = lam({ color: ratIndex % 2 ? 0x55463c : 0x373431, roughness: 1 });
    const corpo = new THREE.Mesh(new THREE.SphereGeometry(.065, 9, 6), mat);
    corpo.scale.set(.5, .43, 1.12); corpo.position.y=.01; corpo.userData.faunaPart = 'body'; rato.add(corpo);
    const cabeca = new THREE.Mesh(new THREE.ConeGeometry(.038,.085,8), mat);
    cabeca.rotation.x=-Math.PI/2; cabeca.position.set(ratIndex % 2 ? .012 : 0,ratIndex % 2 ? .024 : .01,.088); cabeca.userData.faunaPart = 'head'; rato.add(cabeca);
    for (const ex of [-.026, .026]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(.021, 7, 5), lam({color:0xa77a72,roughness:1}));
      ear.scale.set(1, .36, 1); ear.position.set(ex, .052, .066); ear.userData.faunaPart = 'ear'; rato.add(ear);
    }
    for (const [lx, lz] of [[-.035,-.04],[.035,-.04],[-.032,.045],[.032,.045]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.022,.012,.034), mat);
      leg.position.set(lx,-.035,lz); leg.userData.faunaPart = 'leg'; rato.add(leg);
    }
    const pontosCauda = ratIndex % 2
      ? [[0,-.01,-.06],[-.03,-.015,-.11],[-.055,-.008,-.16],[-.025,0,-.205]]
      : [[0,-.01,-.06],[.035,-.018,-.11],[.06,-.01,-.16],[.025,0,-.205]];
    for (let i=0;i<3;i++) {
      const curva = new THREE.CatmullRomCurve3(pontosCauda.slice(i,i+2).map((p)=>new THREE.Vector3(...p)));
      const cauda = new THREE.Mesh(new THREE.TubeGeometry(curva,3,[.0065,.0045,.0025][i],4,false),mat);
      cauda.userData.faunaPart = 'curved-tail'; rato.add(cauda);
    }
    const sombraRato=new THREE.Mesh(new THREE.CircleGeometry(.09,12),lam({color:0x161410,transparent:true,opacity:.38,depthWrite:false}));
    sombraRato.rotation.x=-Math.PI/2; sombraRato.position.y=-.048; sombraRato.scale.set(.55,1.2,1); sombraRato.userData.nonSolidSurface=true; rato.add(sombraRato);
    rato.position.set(rx, .052, rz); rato.rotation.y = rr;
    rato.userData.fauna = 'rato';
    rato.userData.bodyLength = .142;
    rato.userData.bodyAspect = 2.05;
    rato.userData.taperedTail = true;
    rato.userData.poseId = poseId;
    rato.userData.albedoId = albedoId;
    rato.userData.nonCollider = true;
    rato.userData.motion = 'deterministic-run-idle';
    rato.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    // 3,2 s de corrida circular curta + 1,8 s de idle. A trajetória depende apenas
    // do tempo e do índice, não de aleatoriedade nem de estado global do jogo.
    const phase = ratIndex++ * 1.17;
    corpo.onBeforeRender = () => {
      // O capturador abre mapview com `?capture=<sha>`: nele a fauna permanece na
      // pose inicial autorada, para o frame não depender do relógio da máquina.
      if (QP.has('capture')) return;
      const t = ((typeof performance !== 'undefined' ? performance.now() : 0) / 1000 + phase) % 5;
      if (t >= 3.2) return;
      const a = t / 3.2 * Math.PI * 2;
      rato.position.set(rx + Math.cos(a) * .18, .052, rz + Math.sin(a) * .12);
      rato.rotation.y = -a;
    };
    root.add(rato);
  }

  /* ===================== PONTES DE MADEIRA =====================
     3 pontes cruzando o córrego. Cada uma é um tablado de madeira a y=0.1. */
  function ponte(z, largura = 3, comGuarda = false) {
    // Colisão contínua invisível mantém a rota justa; a malha servida são tábuas
    // independentes com lacunas, empeno e desalinhamento.
    const matMadeira = TEX.wall || lam({ color: 0x8a6a4a, roughness: 0.9 });
    const tablado = addBox(CORREGO_W + 2, .18, largura, new THREE.MeshBasicMaterial({visible:false}), 0, 0, z,{skirt:false});
    tablado.userData.bridgeReadable = `ponte-${z}`; tablado.userData.grounded = true;
    tablado.userData.corregoBridgeCollider=z===-22?'norte':`ponte-${z}`;
    let i=0;
    for(let bx=-5.55;bx<=5.55;bx+=.74,i++) {
      if(z===-22&&(i===4||i===11)) continue;
      const y=.035+(i%3)*.022, dz=((i%4)-1.5)*.065, d=largura-.16-(i%3)*.09;
      const board=addBox(.64,.16,d,matMadeira,bx,y,z+dz,{collide:false,skirt:false,ry:(i%2?1:-1)*.012});
      board.userData.corregoBridgeBoard=z===-22?'norte':`ponte-${z}`;
    }
    for (const x of [-CORREGO_W/2-.65,CORREGO_W/2+.65])
      addBox(.18,.42,largura-.18,lam({ color:0x4c3525,roughness:1 }),x,-.2,z,{ collide:false,cast:false });
    // guarda-corpo opcional
    if (comGuarda) {
      for (const gx of [CORREGO_X0 - 1.15, CORREGO_X1 + 1.15]) {
        addBox(0.08, 0.9, largura, lam({ color: 0x4a3a20 }), gx, 0.15, z);
      }
    }
  }
  ponte(-22, 3.0, true);    // norte: larga, com guarda-corpo (rota principal)
  ponte(0, 1.8, false);     // central: estreita, sem guarda (risco)
  ponte(22, 3.0, false);    // sul: passagem coberta por uma palafita
  addBox(CORREGO_W + 2.8, 0.12, 3.8, TEX.zinco || lam({ color: 0x77746d }), 0, 2.5, 22);
  for (const px of [-3.6, 3.6]) addBox(0.16, 2.5, 0.16, TEX.concrete, px, 0, 22);

  /* ===================== CASAS DE MADEIRA (palafitas) =====================
     Cada casa: parede de madeira + telhado de zinco + caixa d'água + antena.
     Algumas sobre pilotis (vão embaixo = atira por baixo). */
  function palafita(x, z, w, d, h, matIdx, comPilotis = false) {
    const matParede = TEX.wall || PAREDES[matIdx % PAREDES.length];
    if (comPilotis) {
      const vaoLivre = 2.2;
      // pilotis (4 postes de concreto)
      for (const [px, pz] of [[-w/2+0.3, -d/2+0.3], [w/2-0.3, -d/2+0.3], [-w/2+0.3, d/2-0.3], [w/2-0.3, d/2-0.3]])
        addBox(0.25, vaoLivre, 0.25, TEX.concrete || lam({ map: T.concrete }), x + px, 0, z + pz);
      // O vão precisa comportar o corpo inteiro; a casa não entra em `solids`.
      addBox(w, Math.max(0.8, h - vaoLivre), d, matParede, x, vaoLivre, z);
    } else {
      addBox(w, h, d, matParede, x, 0, z);
      solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    }
    // Duas chapas tortas formam telhado de duas águas, em vez de uma tampa plana.
    const roofMat = TEX.zinco || lam({ color: 0x888888, metalness: 0.5, roughness: 0.5 });
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56 + 0.25, 0.09, d + 0.45), roofMat);
      roof.rotation.z = side * 0.22; roof.rotation.y = ((x * 13 + z * 7) % 5) * 0.004;
      roof.position.set(x + side * w * 0.245, h + 0.29, z); roof.castShadow = true; roof.receiveShadow = true; root.add(roof);
    }
    // caixa d'água
    if ((Math.abs(x) + Math.abs(z * 3)) % 4 < 2)
      addBox(1.5, 1.5, 1.5, lam({ color: 0x2a6a8a, roughness: 0.8 }), x + w/3, h, z - d/3, { collide: false });
    // antena parabólica
    if (Math.abs(x * 7 + z * 3) % 5 < 2) {
      const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI), lam({ color: 0xcccccc, metalness: 0.6, roughness: 0.3 }));
      dish.position.set(x - w/4, h + 0.5, z + d/4); dish.rotation.x = -Math.PI / 3;
      root.add(dish);
      addBox(0.05, 0.6, 0.05, lam({ color: 0x333333 }), x - w/4, h, z + d/4, { collide: false });
    }
  }

  // MARGEM LESTE (x ∈ [3, 24])
  for (const [cx, cz, w, d, h, mi, pil] of [
    [8, -32, 5, 4, 3.5, 0, false], [15, -30, 6, 5, 4, 1, true],
    [10, -22, 5, 4, 3, 2, false], [18, -18, 5, 5, 3.5, 0, true],
    [8, -12, 6, 4, 3.5, 1, false], [16, -8, 5, 4, 3, 2, false],
    [10, 0, 5, 5, 3.5, 0, true], [18, 5, 6, 4, 4, 1, false],
    [8, 12, 5, 4, 3, 2, false], [15, 18, 5, 5, 3.5, 0, true],
    [10, 25, 6, 4, 3.5, 1, false], [18, 30, 5, 4, 3, 2, false],
    [8, 35, 5, 4, 3.5, 0, false],
  ]) palafita(cx, cz, w, d, h, mi, pil);

  // Puxadinhos realmente invadem o canal, apoiados em estacas e sem engrossar a margem jogável.
  for (const [x, z, w, d, h, mi, lean] of [
    [-5.8,-27,4.6,4.4,3.2,0,-.04], [6.6,-19,4.8,4.6,3.5,2,.06],
    [-6.5,18,4.7,4.2,3.0,1,.03], [6.4,24,4.5,4.8,3.7,0,-.05],
    [-4.55,29,4.8,4.3,3.25,2,.04], [4.55,32,4.6,4.1,3.0,1,-.03],
  ]) {
    const baseY = 1.85; // 23 cm acima do olho: o vão sob a palafita continua atravessável.
    for (const px of [-w * .38, w * .38]) for (const pz of [-d * .38, d * .38])
      addBox(.16, baseY, .16, TEX.concrete, x + px, -0.36, z + pz, { skirt: false, ry: lean });
    // A casa bloqueia corpo e bala; não entra em `solids`, preservando o vão do pilotis.
    addBox(w, h - baseY, d, TEX.wall || PAREDES[mi], x, baseY, z, { skirt: false, ry: lean });
    for (const side of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w * .56 + .2, .08, d + .35), TEX.zinco);
      roof.rotation.z = side * .24 + lean; roof.position.set(x + side * w * .245, h + .27, z); roof.castShadow = true; root.add(roof);
    }
    // Ripas de reparo desencontradas deixam a madeira menos modular.
    for (let i = -2; i <= 2; i++) addBox(.1, 1.1 + (i & 1) * .35, d * .72, PAREDES[(mi + i + 4) & 3],
      x + i * .55, baseY + .25, z + d * .47, { collide: false, skirt: false, ry: lean + i * .018 });
  }

  // Emaranhado de ligações clandestinas cruza o canal e desfaz a simetria das duas fileiras.
  const fio = lam({ color: 0x1d1b19, roughness: 0.72 });
  for (const [z, y, ry] of [[-34,5.4,.02],[-24,4.9,-.025],[-13,5.7,.03],[9,5.5,.025],[20,4.8,-.03],[31,5.6,.02]]) {
    const cable = addBox(31, .025, .025, fio, 0, y, z, { collide: false, cast: false, skirt: false, ry });
    cable.rotation.z = (z % 3) * .004;
  }

  // MARGEM OESTE (x ∈ [-24, -3])
  for (const [cx, cz, w, d, h, mi, pil] of [
    [-8, -32, 5, 4, 3.5, 1, false], [-15, -30, 6, 5, 4, 0, true],
    [-10, -22, 5, 4, 3, 2, false], [-18, -18, 5, 5, 3.5, 1, true],
    [-8, -12, 6, 4, 3.5, 0, false], [-16, -8, 5, 4, 3, 2, false],
    [-10, 0, 5, 5, 3.5, 1, true], [-18, 5, 6, 4, 4, 0, false],
    [-8, 12, 5, 4, 3, 2, false], [-15, 18, 5, 5, 3.5, 1, true],
    [-10, 25, 6, 4, 3.5, 0, false], [-18, 30, 5, 4, 3, 2, false],
    [-8, 35, 5, 4, 3.5, 1, false],
  ]) palafita(cx, cz, w, d, h, mi, pil);

  /* ===================== COVER NAS MARGENS ===================== */
  // sofá velho, geladeira, pneus
  for (const [x, z, mat] of [[5, -15, lam({ color: 0x6a4a3a })], [-5, 15, lam({ color: 0x4a3a2a })]])
    addBox(2.0, 0.8, 0.8, mat, x, 0, z);
  addBox(1.5, 1.8, 1.5, lam({ color: 0xdddddd, roughness: 0.4 }), 5, 0, 10);   // geladeira
  addBox(1.5, 1.8, 1.5, lam({ color: 0xdddddd, roughness: 0.4 }), -5, 0, -10);
  for (const [x, z] of [[12, -5], [-12, 5]]) { addBox(2.0, 1.0, 1.5, lam({ color: 0x1a1a1a, roughness: 0.9 }), x, 0, z); } // pneus
  // varal (decoração)
  for (const [x, z] of [[10, -28], [-10, 28]]) addBox(0.02, 0.02, 5.0, lam({ color: 0x8a8a8a }), x, 3.5, z, { collide: false });
  // barraca de camelô
  addBox(2.0, 2.0, 2.0, PAREDES[2], 12, 0, -2);
  solids.push({ x0: 11, x1: 13, z0: -3, z1: -1 });
  addBox(2.0, 2.0, 2.0, PAREDES[0], -12, 0, 2);
  solids.push({ x0: -13, x1: -11, z0: 1, z1: 3 });

  // Props pequenos distribuídos por quadrante: identidade e cover sem alterar o proxy físico.
  const propsRua = [
    ['dumpster', -20.5, -33, 1.35, 0], ['moto_cg', -20.5, -12, 1.05, 0.4],
    ['pilha_pneus', -20.5, 10, 1.1, 0], ['stall', -20.5, 30, 2.3, 0],
    ['tires', 20.5, -31, 0.8, 0], ['moto_cg', 20.5, -10, 1.05, -0.5],
    ['dumpster', 20.5, 12, 1.35, Math.PI], ['stall', 20.5, 31, 2.3, Math.PI],
    ['tires', -6, -36, 0.8, 0], ['pilha_pneus', 6, -36, 1.1, 0],
  ];
  for (const [id, x, z, h, ry] of propsRua) {
    propComFallback(id, x, z, h, ry, () => addBox(1.35, h, 1.35, PAREDES[(Math.abs(z) / 10 | 0) & 3], x, 0, z));
  }

  // Quatro empenas de pixação SP viram marcos, em vez de repetir decal pequeno em tudo.
  if (TEX.pixo) for (const [x, z, ry] of [[-23.72, -20, Math.PI / 2], [-23.72, 20, Math.PI / 2], [23.72, -20, -Math.PI / 2], [23.72, 20, -Math.PI / 2]])
    addBox(0.04, 2.7, 6.0, TEX.pixo, x, 0.12, z, { collide: false, ry, skirt: false });

  /* ===================== MUROS EXTERNOS ===================== */
  for (const sx of [-HALF_X, HALF_X])
    addBox(0.5, 3, HALF_Z * 2, TEX.concrete || lam({ map: T.concrete }), sx, 0, 0);
  for (const sz of [-HALF_Z, HALF_Z])
    addBox(HALF_X * 2, 3, 0.5, TEX.concrete || lam({ map: T.concrete }), 0, 0, sz);

  /* ===================== GROUND HEIGHT ===================== */
  function groundHeightAt(x, z) {
    const ax = Math.abs(x);
    const ponte = ax <= CORREGO_W / 2 + 0.2 && (Math.abs(z + 22) <= 1.6 || Math.abs(z) <= 1.0 || Math.abs(z - 22) <= 1.6);
    if (ponte) return 0.15;
    if (ax <= 5 && Math.abs(z) >= HALF_Z - 6) return 0.05;
    if (ax < CORREGO_W / 2) return -0.4;
    return 0;
  }

  /* ===================== WAYPOINTS + A* ===================== */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    if (insideSolid(x, z, inf)) return true;
    const g = groundHeightAt(x, z);
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });

  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  // adensamento nas 3 pontes (passo apertado — corredor estreito)
  for (const bz of [-22, 0, 22]) linha(0, bz - 2, 0, bz + 2, 1.0);
  // adensamento nas vielas de cada margem (paralelas ao córrego)
  for (const mx of [-12, 12]) linha(mx, -HALF_Z + 3, mx, HALF_Z - 3, 2.5);
  for (const mx of [-18, 18]) linha(mx, -HALF_Z + 3, mx, HALF_Z - 3, 2.5);
  // travessias nas margens
  for (const bz of [-30, -15, 0, 15, 30]) { linha(4, bz, HALF_X - 3, bz, 3.0); linha(-4, bz, -HALF_X + 3, bz, 3.0); }
  // trechos alagados (andáveis)
  for (const bz of [-37, 37]) linha(-5, bz, 5, bz, 2.0);
  // bordas
  for (const mx of [-HALF_X + 2, HALF_X - 2]) linha(mx, -HALF_Z + 2, mx, HALF_Z - 2, 3.0);

  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
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

  /* ===================== SPAWNS ===================== */
  const spawns = {
    E: [-25, -5, 15, 35].map(z => ({ x: 21, z, yaw: -Math.PI / 2 })),
    B: [-25, -5, 15, 35].map(z => ({ x: -21, z, yaw: Math.PI / 2 })),
  };

  /* ===================== CTF — 4 BANDEIRAS ===================== */
  const ctfPoints = [
    { id: 'R', label: 'OESTE',   x: -12, z: -15 },
    { id: 'C', label: 'PONTE C', x: -4,  z: 8 },
    { id: 'P', label: 'LESTE',   x: 12,  z: 15 },
    { id: 'B', label: 'PONTE N', x: 4,   z: -22 },
  ];

  /* ===================== ARSENAL ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  // margem leste
  place('ak', 12, -28);    place('m4', 8, -15);
  place('shotgun', 15, 0); place('mp5', 10, 12);
  place('awp', 18, -5);    place('deagle', 8, 28);
  // margem oeste
  place('ak', -12, 28);    place('m4', -8, 15);
  place('shotgun', -15, 0); place('mp5', -12, -15);
  place('m400', -20, 15);   place('deagle', -8, -28);
  // pontes
  place('mp5', 0, -22);    place('mp5', 0, 22);

  PB.build(root);
  SKIRT.build(root);

  /* ===================== GRAFFITI ===================== */
  const D_PIXO = decalIds(T, ['folha-pixaca-01.png', 'folha-pixaca-02.png', 'folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  const D_THROW = decalIds(T, ['folha-throwu-01.png', 'folha-throwu-02.png', 'folha-throwu-03.png', 'folha-throwu-04.png', 'folha-throwu-05.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  const D_MURAL = decalIds(T, ['or-mitico-mural.png', 'or-graf-treta.png', 'personagem-muro.png']);
  const D_CARA = decalIds(T, ['caras-cartoon-02.png', 'caras-cartoon-05.png', 'caras-cartoon-08.png']);
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png']);
  const D_PERSO = decalIds(T, ['folha-person-01.png', 'folha-person-03.png']);
  const D_CARTAZERA = decalIds(T, ['folha-lambes.png', 'folha-stenci.png']);
  const D_ADESIVO = decalIds(T, ['tags-treino-01.png', 'tags-treino-02.png', 'tags-treino-03.png']);
  grafitar({
    id: 'fy_corrego',
    root, T, waypoints: nodes, seed: 13007, passo: 0.95, alcance: 9, cobre: 0.025, minLarg: 0.3,
    murais: { texturas: (T && T.muraisHom) || [], nomes: (T && T.muraisHomNomes) || [], seed: 13, separacao: 15 },
    bandas: [
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: ((T && T.posterFiles) || []).map((nome, i) => [nome, i]).filter(([nome]) => !['despisque-leao.jpg','ashtar-meme.jpg','ashtar.png'].includes(nome)).map(([,i]) => i) },
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6], chance: 45,
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0], chance: 38,
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], chance: 28, planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  const slowAt = (x, z) => Math.abs(z) >= HALF_Z - 6 && Math.abs(x) <= CORREGO_W / 2 + 2;

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
