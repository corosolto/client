// MANSAO JOÁ (fy_mansao) — spec plans/14-MANSAO_JOA.md: mansão de ultra-luxo no Joá, RJ.
// Combate assimétrico original: um time invade pelo jardim tropical; o outro defende do
// terraço/piscina com vista pro oceano. Interior modernista jogável: hall de pé-direito
// duplo, sala, cozinha gourmet, mezanino com escada. Piscina infinita na borda do penhasco.
//
// PLANTA (eixo longo = z; norte = -z = terraço/mar, sul = +z = portão/jardim):
//   PORTÃO/JARDIM  z ∈ [15, 35]  spawn A (invasor)
//   GARAGEM        z ∈ [8, 15]   3 vagas abertas, carros
//   CASA           z ∈ [-15, 8]  hall + sala + cozinha + mezanino
//   TERRAÇO/PISCINA z ∈ [-35, -15] spawn B (defensor), vista pro mar
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
export const HALF_X = 22, HALF_Z = 36;
const LAJE_H = 4.5;  // pé-direito duplo

export const MANSAO_PROPS = ['mesa_guardasol', 'guarda_sol'];

export function buildMansao(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);

  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) { if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); } if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap; }
    return m;
  };
  const texturaLaje = (base,junta,rx,ry) => {
    // Placas de grande formato com junta fina e variação mínima. O antigo 4×4
    // alternava quadrados e lia como o mesmo xadrez provisório do galpão.
    const S=16, data=new Uint8Array(S*S*4), rgb=(hex)=>[hex>>16&255,hex>>8&255,hex&255];
    const baseRgb=rgb(base), juntaRgb=rgb(junta);
    for(let y=0;y<S;y++) for(let x=0;x<S;x++) {
      const grout=x===0 || y===0 || x===8 || y===8;
      const variation=((x*13+y*7)%5)-2;
      const c=(grout?juntaRgb:baseRgb).map((v)=>Math.max(0,Math.min(255,v+(grout?0:variation))));
      data.set([...c,255],(y*S+x)*4);
    }
    const tex=new THREE.DataTexture(data,S,S,THREE.RGBAFormat); tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(rx,ry); tex.needsUpdate=true; return tex;
  };
  const pisoInterior=lam({ map:texturaLaje(0xc9c1b2,0x8e887f,3,2),color:0xf0ede7,roughness:.34 });
  const forroInterior=lam({ map:texturaLaje(0xe7e1d7,0xc8c2b8,2,2),color:0xf8f4ed,roughness:.82,side:THREE.DoubleSide });
  let TEX = {
    concrete: lam({ map: T.concrete }), grass: lam({ map: T.grass }), dirt: lam({ map: T.dirt }),
    marble: lam({ map: T.concrete, color: 0xeee9df, roughness: 0.22 }),
    garden: lam({ map: T.grass, roughness: 1 }), deck: lam({ map: T.dirt, color: 0x9a7654, roughness: 0.72 }),
  };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 3, ry = 3) => { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
    TEX.marble = lam({ map: load('/img/textures/mansao_streetart_marble.webp', 4, 4), roughness: 0.15, metalness: 0.05 });
    TEX.garden = lam({ map: load('/img/textures/tex_garden.webp', 5, 5), roughness: 1.0 });
    TEX.deck = lam({ map: load('/img/textures/tex_deck.webp', 3, 6), roughness: 0.7 });
    TEX.concrete = lam({ map: load('/img/textures/concrete_br.webp', 2, 2) });
  }
  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING }) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    root.add(m);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      // vidro segura o corpo mas não a bala: transparente fica fora de occluders (BUG-54)
      if (!(mat && mat.transparent && (mat.opacity === undefined || mat.opacity < 0.9))) occluders.push(m);
    } else if (opts.bala) occluders.push(m);   // visível dentro de colisor alheio: a bala tem que parar nele
    return m;
  }
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };
  const PB = new PropBatch({ bucket: 24 });
  const GLB_ON = QP.get('glb') !== '0';
  function propComFallback(id, x, z, h, ry, fallback) {
    const proxy = fallback();
    const obj = GLB_ON && hasProp(id) ? placeProp(id, { x, z, targetH: h, ry }) : null;
    if (obj) {
      proxy.visible = false; root.add(obj);
      // a bala testa a malha visível: proxy sai de occluders (corpo fica no collider), GLB entra
      const pi = occluders.indexOf(proxy); if (pi >= 0) occluders.splice(pi, 1);
      obj.traverse((m) => { if (m.isMesh && !(m.material && m.material.transparent && (m.material.opacity === undefined || m.material.opacity < 0.9))) occluders.push(m); });
    }
    return obj;
  }

  /* CÉU */
  setMapSky(scene, T, '/img/textures/sky_joa.webp', 0xf0d4a8);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_mansao');
  const hemi = new THREE.HemisphereLight(0xf6f3ea, 0x665c50, 1.02); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffefd8, 1.8); sun.position.set(15, 30, -15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 150; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* CHÃO */
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, TEX.garden || lam({ map: T.grass }), -0.01);

  /* ===================== CASA (interior jogável) =====================
     Planta: retângulo de 30×16 m. Paredes externas com vãos de porta/janela.
     Mezanino parcial (escritório) a y=4,5. Piso de mármore. */
  const CASA = { x0: -15, x1: 15, z0: -15, z1: 8 };
  // piso de mármore
  const pisoCasa=addFloor(CASA.x1 - CASA.x0, CASA.z1 - CASA.z0, (CASA.x0 + CASA.x1) / 2, (CASA.z0 + CASA.z1) / 2, pisoInterior, 0.02);
  pisoCasa.userData.mansaoFeature='interior-surface'; pisoCasa.userData.surfaceType='floor';
  // contrapiso sólido (bala não atravessa)
  addBox(CASA.x1 - CASA.x0, 0.12, CASA.z1 - CASA.z0, lam({ color: 0x909088 }), (CASA.x0 + CASA.x1) / 2, -0.12, (CASA.z0 + CASA.z1) / 2);

  // paredes externas (com vãos de porta)
  const MAT_WALL = lam({ map: TEX.concrete.map || null, color: 0xf5f0e8, roughness: 0.9 });  // branco modernista texturizado
  function paredeComVao(x, z, w, d, h, vaoCentro, vaoLarg) {
    if (vaoLarg >= w) return;
    const antes = vaoCentro - w/2 + vaoLarg/2;
    const depois = w/2 + w/2 - (vaoCentro + vaoLarg/2);
    if (antes > 0.5) addBox(antes, h, d, MAT_WALL, x - w/2 + antes/2, 0, z);
    if (depois > 0.5) addBox(depois, h, d, MAT_WALL, x + vaoCentro + vaoLarg/2 + depois/2, 0, z);
    // sólido das paredes (não do vão)
    if (antes > 0.5) solids.push({ x0: x - w/2, x1: x - w/2 + antes, z0: z - d/2, z1: z + d/2 });
    if (depois > 0.5) solids.push({ x0: x + vaoCentro + vaoLarg/2, x1: x + vaoCentro + vaoLarg/2 + depois, z0: z - d/2, z1: z + d/2 });
  }
  // parede sul (frente — porta central de 4 m)
  paredeComVao(0, CASA.z1, CASA.x1 - CASA.x0, 0.3, 4.0, 0, 4.0);
  // parede norte (fundo — porta pro terraço de 6 m)
  paredeComVao(0, CASA.z0, CASA.x1 - CASA.x0, 0.3, 4.0, 0, 6.0);
  // parede leste (janela grande — vão de 5 m no centro)
  paredeComVao(CASA.x1, 0, 0.3, CASA.z1 - CASA.z0, 4.0, 0, 5.0);
  // parede oeste (porta da garagem — vão de 3 m)
  paredeComVao(CASA.x0, 0, 0.3, CASA.z1 - CASA.z0, 4.0, 2.0, 3.0);
  // As laterais usam segmentos no eixo z; a função acima trabalha no eixo x.
  for (const [x, z, d] of [[CASA.x1, -10, 10], [CASA.x1, 6.5, 3], [CASA.x0, -7.25, 15.5], [CASA.x0, 6, 4]])
    addBox(0.3, 4.0, d, MAT_WALL, x, 0, z);
  // O vidro é fechamento real: segura corpo/tiro, enquanto as portas continuam vazadas.
  for (const [vx, vz, vw, vd] of [[CASA.x1 - 0.02, 0, 0.06, 5.0]]) {
    addBox(vw, 3.5, vd, lam({ color: 0xa0c8e0, transparent: true, opacity: 0.2 }), vx, 0.3, vz);
  }
  // Divisórias deixam cozinha, sala e home theater reconhecíveis sem criar becos cegos.
  for (const [x, z, w, d] of [[-9.5,-6.5,11,.18],[9.75,-6.5,3.5,.18],[14.5,-6.5,1,.18],[-4,4.5,.18,7],[-4,-4.5,.18,3]])
    addBox(w, 3.1, d, MAT_WALL, x, 0, z);
  // Vergas e painéis ripados quebram o branco contínuo e enquadram as passagens.
  const ripado = lam({ color: 0x72513b, roughness: 0.72 });
  for (let x = -13; x <= 13; x += 0.42) addBox(0.12, 2.7, 0.08, ripado, x, 0.2, CASA.z0 + 0.24, { collide: false, skirt: false, bala: true });

  // Casca modernista: lajes finas em balanço e vidro contínuo fecham a leitura de "planta aberta".
  const glass = lam({ color: 0x9bd0df, transparent: true, opacity: 0.24, metalness: 0.08, roughness: 0.12, side: THREE.DoubleSide });
  const concretoClaro = lam({ map: TEX.concrete.map || null, color: 0xe8e4dc, roughness: 0.72 });
  // O vazio central e a faixa de vidro recortam a cobertura que antes parecia uma placa única.
  for (const [x,z,w,d] of [[-11.4,2.6,9.7,10.5],[11.4,2.6,9.7,10.5],[0,6.15,13.1,3.4],[0,-.35,13.1,2.4]])
    addBox(w, .22, d, concretoClaro, x, 4.03, z, { skirt: false });
  for (const [x,z,w,d] of [[-11.4,2.6,9.55,10.35],[11.4,2.6,9.55,10.35],[0,6.15,12.95,3.25],[0,-.35,12.95,2.25]]) {
    const forro=addFloor(w,d,x,z,forroInterior,4.025); forro.userData.mansaoFeature='interior-surface'; forro.userData.surfaceType='ceiling';
  }
  // Pilares e fáscias revelam o caminho estrutural das lajes em balanço. Sem eles,
  // a captura 3:2 lia quatro placas brancas flutuando, não arquitetura modernista.
  for (const [x,z] of [[-14.1,-1.8],[-8.7,7.2],[8.7,7.2],[14.1,-1.8],[-5.8,-1.4],[5.8,-1.4]])
    addBox(.34, 4.03, .34, concretoClaro, x, 0, z);
  for (const [x,z,w,d] of [[-11.4,7.82,9.7,.34],[11.4,7.82,9.7,.34],[-16.08,2.6,.34,10.5],[16.08,2.6,.34,10.5]])
    addBox(w, .42, d, concretoClaro, x, 3.82, z, { collide: false, skirt: false });
  addBox(9.2, .06, 4.2, glass, 0, 4.08, 2.55, { collide: false, cast: false, skirt: false });
  for (const x of [-4.6,0,4.6]) addBox(.055,.12,4.25,lam({ color: 0x596263, metalness: .7, roughness: .25 }),x,4.06,2.55,
    { collide: false, skirt: false });
  for (const [x,w] of [[-7.7,10.1],[7.7,10.1]]) addBox(w, .24, 8.2, concretoClaro, x, 6.18, -11.4,
    { skirt: false });
  addBox(4.8, .07, 8.0, glass, 0, 6.2, -11.4, { collide: false, cast: false, skirt: false });
  addBox(7.0, 0.18, 15.0, concretoClaro, -15.7, 3.95, -3.0, { skirt: false });
  addBox(7.0, 0.18, 12.0, concretoClaro, 15.7, 3.95, -1.5, { skirt: false });
  // Panos segmentados: 4 m livres na entrada e 6 m livres para o terraço.
  for (const [x, z, w, d, h] of [[-7,7.82,10,.06,3.3],[7,7.82,10,.06,3.3],[-8.5,-14.78,5,.06,3.45],[8.5,-14.78,5,.06,3.45]]) {
    addBox(w, h, d, glass, x, .38, z, { cast: false, skirt: false });
    const horizontal = w > d;
    for (let i = -2; i <= 2; i++) addBox(horizontal ? .045 : .06, h, horizontal ? .06 : .045,
      lam({ color: 0x3b4244, metalness: .7, roughness: .28 }), horizontal ? x + i * w / 5 : x, .38,
      horizontal ? z : z + i * d / 5, { collide: false, skirt: false, bala: true });
  }
  // Brises profundos modulam a ala direita, antes uma placa branca sem escala.
  const madeiraNobre = lam({ color: 0x704a31, roughness: .66 });
  for (let x = 3.2; x <= 13; x += .82)
    addBox(.12, 3.45, .72, madeiraNobre, x, .28, 8.17, { collide: false, skirt: false, bala: true });
  for (let z = -12; z <= 5.8; z += 1.15)
    addBox(.82, 3.25, .1, madeiraNobre, 15.18, .35, z, { collide: false, skirt: false, bala: true });
  const pedraFachada = lam({ map: TEX.concrete.map || null, color: 0xb2aa98, roughness: .86 });
  for (const [z,h,y] of [[-10,1.0,.2],[-6.6,.72,1.55],[-2.8,1.1,.15],[4.7,.82,1.7]])
    addBox(.08, h, 2.5, pedraFachada, 15.2, y, z, { collide: false, cast: false, skirt: false });

  // MEZANINO parcial (escritório — z ∈ [-15, -8])
  {
    const MZ = { x0: -12, x1: 12, z0: -15, z1: -8 };
    // Poço aberto x[-4.25,-1.75]: a laje não pode atravessar a escada.
    for (const [x0, x1] of [[MZ.x0, -4.25], [-1.75, MZ.x1]]) {
      addFloor(x1 - x0, MZ.z1 - MZ.z0, (x0 + x1) / 2, (MZ.z0 + MZ.z1) / 2, TEX.marble || lam({ color: 0xe8e8e0 }), LAJE_H + 0.02);
      addBox(x1 - x0, 0.12, MZ.z1 - MZ.z0, lam({ color: 0xa0a098 }), (x0 + x1) / 2, LAJE_H, (MZ.z0 + MZ.z1) / 2);
    }
    // guarda-corpo do mezanino (vão da escada no centro)
    addBox(0.2, 1.0, MZ.z1 - MZ.z0, lam({ color: 0x333333, metalness: 0.6 }), MZ.x0, LAJE_H, (MZ.z0 + MZ.z1) / 2);
    // A lateral leste reserva 1,5 m para a escada de serviço.
    addBox(0.2, 1.0, 5.5, lam({ color: 0x333333, metalness: 0.6 }), MZ.x1, LAJE_H, -10.75);
    addBox(MZ.x1 - MZ.x0, 1.0, 0.2, lam({ color: 0x333333, metalness: 0.6 }), (MZ.x0 + MZ.x1) / 2, LAJE_H, MZ.z0);
    // Sul fechado em toda a largura, salvo a saída exata da escada x[-4,25,-1,75].
    addBox(7.6, 1.0, 0.2, lam({ color: 0x333333, metalness: 0.6 }), -8.2, LAJE_H, MZ.z1);
    addBox(13.6, 1.0, 0.2, lam({ color: 0x333333, metalness: 0.6 }), 5.2, LAJE_H, MZ.z1);
    // Guarda do poço: a saída fica no topo norte, não no trecho baixo da escada.
    for (const sx of [-4.25, -1.75]) addBox(.16, 1.0, 4.8, lam({ color: 0x333333, metalness: .6 }), sx, LAJE_H, -10.4);
    // colunas de apoio
    for (const cx of [-8, 8]) addBox(0.4, LAJE_H, 0.4, concretoClaro, cx, 0, MZ.z0 + 0.5);
  }

  /* ESCADA (NBR 9077) subindo pro mezanino */
  const STAIR = { x0: -4.25, x1: -1.75, z0: -14.91, z1: -7.34 };
  const STAIR_SERVICE = { x0: 12.25, x1: 14.75, z0: -14.91, z1: -7.34 };
  {
    const ESC = { espelho: 0.18, piso: 0.29, n: 26 };
    const sx = -3, sz0 = -7.5, sz1 = sz0 - ESC.n * ESC.piso;
    for (let i = 0; i < ESC.n; i++) { const z = sz0 - i * ESC.piso; const y = i * ESC.espelho; addBox(2.5, 0.04, ESC.piso + 0.02, TEX.marble || lam({ color: 0xe0e0d8 }), sx, y - 0.04, z, { collide: false }); }
    // Corrimãos acompanham os degraus e deixam a saída lateral livre no patamar alto.
    const ferro = lam({ color: 0x292825, metalness: 0.72, roughness: 0.42 });
    for (const lx of [sx - 1.25, sx + 1.25]) for (let i = 0; i < ESC.n; i += 3) {
      const y = i * ESC.espelho, z = sz0 - i * ESC.piso;
      const desembarque = lx === sx - 1.25 && i >= 18;
      addBox(0.09, 0.9, 0.09, ferro, lx, y, z, { collide: !desembarque, skirt: false });
      if (i + 3 < ESC.n) addBox(0.09, 0.09, ESC.piso * 3 + 0.1, ferro, lx, y + 0.88, z - ESC.piso * 1.5,
        { collide: !desembarque, skirt: false });
    }
  }
  // Escada de serviço no flanco leste: segunda rota física para o escritório/mezanino.
  {
    const ESC = { espelho: 0.18, piso: 0.29, n: 26 }, sx = 13.5, sz0 = -7.5;
    const ferro = lam({ color: 0x292825, metalness: 0.72, roughness: 0.42 });
    for (let i = 0; i < ESC.n; i++) {
      const z = sz0 - i * ESC.piso, y = i * ESC.espelho;
      addBox(2.5, .04, ESC.piso + .02, TEX.marble, sx, y - .04, z, { collide: false });
      if (i % 3 === 0) for (const lx of [sx - 1.25, sx + 1.25]) {
        const desembarque = lx === sx - 1.25 && i >= 18;
        addBox(.09, .9, .09, ferro, lx, y, z, { collide: !desembarque, skirt: false });
      }
    }
    addBox(1.0, .12, 1.4, TEX.marble, 12.25, LAJE_H - .12, -14.75);
  }

  /* COVER INTERIOR: móveis de luxo */
  const tecidoClaro = lam({ color: 0x77756f, roughness: .78 });
  const tecidoEscuro = lam({ color: 0x31333a, roughness: .82 });
  // sofá (sala)
  const estarA = addBox(4.0, 0.8, 1.5, tecidoClaro, 4, 0, 0); estarA.userData.mansaoFeature = 'estar';
  const estarB = addBox(2.4, 0.82, 1.5, tecidoEscuro, 0, 0, 4); estarB.userData.mansaoFeature = 'estar';
  solids.push({ x0: 2, x1: 6, z0: -0.75, z1: 0.75 }, { x0: -1.2, x1: 1.2, z0: 3.25, z1: 4.75 });
  // Encostos, braços e tapetes dão silhueta de mobiliário em vez de caixas soltas.
  for (const [x,z,w,d,ry,mat] of [[4,-.62,3.7,.18,0,tecidoClaro],[2.12,0,.18,1.35,0,tecidoClaro],[5.88,0,.18,1.35,0,tecidoClaro],
    [0,3.38,2.2,.18,0,tecidoEscuro],[-1.12,4,.18,1.3,0,tecidoEscuro],[1.12,4,.18,1.3,0,tecidoEscuro]])
    addBox(w, .72, d, mat, x, .5, z, { collide: false, skirt: false, ry });
  addFloor(5.6, 3.4, 3.1, 1.55, lam({ color: 0x9a744f, roughness: .92 }), .035);
  const gourmetPart=(object,tipo)=>{ object.userData.mansaoFeature='gourmet-part'; object.userData.gourmetPart=tipo; return object; };
  const theaterPart=(object,tipo)=>{ object.userData.mansaoFeature='theater-part'; object.userData.theaterPart=tipo; return object; };
  // Ilha gourmet funcional: bancada inteira, cuba/torneira, cooktop, três
  // banquetas e pendentes. A captura anterior só provava um plano cortado.
  const ilha = addBox(4.2, 1.0, 1.35, TEX.marble || lam({ color: 0xe8e8e0, roughness: 0.15 }), -8, 0, -10);
  ilha.userData.mansaoFeature = 'ilha-gourmet'; solids.push({ x0: -10.1, x1: -5.9, z0: -10.68, z1: -9.32 });
  gourmetPart(addBox(4.55,.14,1.62,TEX.marble || lam({color:0xf0ece3,roughness:.16}),-8,1.0,-10,{collide:false,skirt:false}),'countertop');
  const metalCozinha=lam({color:0x667174,metalness:.75,roughness:.24});
  gourmetPart(addBox(.82,.045,.54,lam({color:0x181c1e,metalness:.2,roughness:.2}),-9.15,1.15,-10,{collide:false,cast:false,skirt:false}),'cooktop');
  gourmetPart(addBox(.72,.04,.48,metalCozinha,-7.25,1.15,-10,{collide:false,cast:false,skirt:false}),'sink');
  const torneira=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,7,12,Math.PI),metalCozinha);
  torneira.rotation.z=Math.PI/2; torneira.position.set(-7.25,1.35,-10.12); gourmetPart(torneira,'faucet'); root.add(torneira);
  for (const x of [-9.2,-8,-6.8]) {
    gourmetPart(addBox(.48,.52,.48,tecidoEscuro,x,0,-8.85,{ collide: false }),'stool');
    addBox(.16,.42,.16,lam({ color: 0x3a332b, metalness: .4 }),x,.48,-8.85,{ collide: false, skirt: false });
  }
  const pendente=lam({color:0xa56f3c,metalness:.45,roughness:.42,emissive:0x4d2d12,emissiveIntensity:.24});
  for(const x of [-9.3,-8,-6.7]) {
    addBox(.025,1.05,.025,lam({color:0x272521,metalness:.55}),x,2.5,-10,{collide:false,cast:false,skirt:false});
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.24,.34,10,1,true),pendente); shade.position.set(x,2.55,-10); shade.rotation.x=Math.PI; gourmetPart(shade,'pendant'); root.add(shade);
  }
  // Home theater inequívoco: tela preta, console, painéis acústicos e quatro
  // recliners com encosto/braços, não quatro caixas sem contexto.
  const tela=theaterPart(addBox(5.1,2.35,.08,lam({color:0x090b0d,roughness:.18}),9,.65,-14.55,{collide:false,cast:false,skirt:false}),'screen');
  const consoleMidia=theaterPart(addBox(3.4,.42,.48,lam({color:0x2c2724,roughness:.5}),9,0,-14.08,{collide:false}),'media-console');
  for(const [px,pz] of [[8,-9.2],[10,-9.2],[8,-11.35],[10,-11.35]]) {
    const cadeira=theaterPart(addBox(1.08,.52,1.02,tecidoEscuro,px,0,pz),'recliner');
    addBox(.96,.86,.24,tecidoEscuro,px,.42,pz-.39,{collide:false,skirt:false});
    for(const ax of [-.53,.53]) addBox(.16,.62,.9,tecidoEscuro,px+ax,.05,pz,{collide:false,skirt:false});
    solids.push({x0:px-.62,x1:px+.62,z0:pz-.58,z1:pz+.58});
  }
  for(const x of [6.75,9,11.25]) theaterPart(addBox(1.55,1.25,.06,lam({color:0x465056,roughness:.86}),x,2.05,-14.46,{collide:false,cast:false,skirt:false}),'acoustic-panel');
  // mesa de jantar
  addBox(3.0, 0.9, 1.5, lam({ color: 0x4a3a2a, roughness: 0.3 }), 8, 0, 4); solids.push({ x0: 6.5, x1: 9.5, z0: 3.25, z1: 4.75 });
  const divisoriaBaixa = addBox(4.8, .82, .22, ripado, -1.55, 0, 2.1);
  divisoriaBaixa.userData.mansaoFeature = 'divisoria-baixa';
  const propVivo=(object,tipo)=>{ object.userData.mansaoFeature='lived-prop'; object.userData.propType=tipo; return object; };
  // Sete famílias, pequenas e sem colisão, tiram o hall do estado de showroom vazio.
  const almofadas=new THREE.Group(); propVivo(almofadas,'almofadas');
  for(const [x,z,c] of [[3.1,-.25,0xb66e4a],[4.1,-.24,0xd0b989],[5.05,-.24,0x6c8490]]) {
    const a=new THREE.Mesh(new THREE.BoxGeometry(.62,.18,.52),lam({color:c,roughness:1})); a.position.set(x,.84,z); a.rotation.y=(x-4)*.12; almofadas.add(a);
  } root.add(almofadas);
  const tapete=addFloor(4.9,2.8,3.2,1.55,lam({color:0x805f49,roughness:1}),.047); propVivo(tapete,'tapete');
  const luminariaPe=new THREE.Group(); propVivo(luminariaPe,'luminaria-de-piso');
  const haste=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,2.25,8),lam({color:0x3b3935,metalness:.55})); haste.position.y=1.12; luminariaPe.add(haste);
  const cupula=new THREE.Mesh(new THREE.ConeGeometry(.42,.62,12,1,true),lam({color:0xe4cda5,emissive:0x5d4426,emissiveIntensity:.25,side:THREE.DoubleSide})); cupula.position.y=2.12; luminariaPe.add(cupula); luminariaPe.position.set(6.7,0,1.3); root.add(luminariaPe);
  const quadro=addBox(.07,1.45,2.35,lam({color:0x315f68,roughness:.7}),-14.76,1.25,-2.5,{collide:false,cast:false,skirt:false}); propVivo(quadro,'arte-original');
  const fruteira=new THREE.Group(); propVivo(fruteira,'fruteira'); fruteira.position.set(-8,1.12,-10); root.add(fruteira);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.42,.28,.16,14),lam({color:0x755642,roughness:.68})); fruteira.add(bowl);
  for(const [x,z,c] of [[-.18,0,0xd5a33b],[.12,.08,0xb84935],[.03,-.13,0x6e9a48]]) { const f=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),lam({color:c})); f.position.set(x,.15,z); fruteira.add(f); }
  const louca=new THREE.Group(); propVivo(louca,'louca-cozinha'); louca.position.set(-6.8,1.04,-10); root.add(louca);
  for(const x of [-.3,0,.3]) { const copo=new THREE.Mesh(new THREE.CylinderGeometry(.075,.06,.28,10),lam({color:0xbad5d8,transparent:true,opacity:.7,roughness:.18})); copo.position.set(x,.14,0); louca.add(copo); }
  const vaso=new THREE.Group(); propVivo(vaso,'vaso-interno'); vaso.position.set(-11.8,0,-3.7); root.add(vaso);
  // MAP1 "corpo dentro de sólido": em (-11,5, -3,5) a sonda achava 0,859 m de geometria
  // visível. Medido antes de mexer — ZERO colisor cobrindo o ponto e `_collide` empurrando
  // 0,0000 m: o corpo do jogador ficava DENTRO do pote. O pote é CERÂMICA, volume rígido;
  // marcá-lo `nonSolidSurface` seria mentir pra régua e manter o defeito. O certo é o que
  // os vasos do deck (linha ~580) e os troncos de árvore já fazem aqui: colisor de verdade.
  const pote=new THREE.Mesh(new THREE.CylinderGeometry(.28,.36,.5,12),lam({color:0x9b6b4a,roughness:.9})); pote.position.y=.25; vaso.add(pote);
  col(-12.1,-11.5,0,.5,-4.0,-3.4); occluders.push(pote);   // a bala para na cerâmica que o corpo já não atravessa
  // As FOLHAS, ao contrário do pote, são folhagem atravessável — é o que todo o resto do
  // paisagismo deste arquivo já declara (garden-cluster, garden-mass, palmeira, folhagem
  // instanciada, forração). Estavam sem a marca por esquecimento, não por decisão.
  for(let i=0;i<7;i++){ const folha=new THREE.Mesh(new THREE.SphereGeometry(.25,8,5),lam({color:i%2?0x386b42:0x4e8050,roughness:1})); const a=i*Math.PI*2/7; folha.scale.set(.34,.14,1.4); folha.rotation.y=a; folha.position.set(Math.sin(a)*.25,.78+Math.cos(a)*.08,Math.cos(a)*.25); folha.userData.nonSolidSurface=true; vaso.add(folha); }
  // Luz quente local impede que a cobertura do mezanino transforme os móveis em
  // silhuetas pretas; sem sombra dinâmica, o custo em mobile é pequeno.
  for (const [x,z] of [[-8,-9],[3,1],[9,-10],[-5,4]]) {
    const luz = new THREE.PointLight(0xffe0b5, 1.25, 14, 1.65); luz.position.set(x, 3.15, z);
    luz.userData.mansaoFeature='interior-fill'; root.add(luz);
  }
  // escultura modernista (cover alto)
  addBox(0.6, 2.5, 0.6, lam({ color: 0x8a7a6a, metalness: 0.3 }), 0, 0, -12); solids.push({ x0: -0.3, x1: 0.3, z0: -12.3, z1: -11.7 });

  /* ===================== GARAGEM (aberta) ===================== */
  // piso diferente (cimento queimado)
  addFloor(20, 7, 0, 11.5, TEX.concrete || lam({ map: T.concrete }), 0.03);
  // Três desenhos esportivos originais: roadster aberto, cupê fastback e targa.
  // Não copiam grade, farol ou perfil de marca real e diferem por estrutura — não
  // apenas pela cor. Rodas dianteiras ultrapassam a carroceria no close frontal.
  const carroGenerico = (cx, cor, estilo, ry = 0) => {
    const familias=['aurora-roadster','mare-fastback','serra-targa'];
    const g = new THREE.Group(); g.position.set(cx, 0, 11); g.rotation.y = ry;
    g.userData.mansaoFeature = 'carro-generico'; g.userData.originalDesign = `joa-${familias[estilo]}`;
    g.userData.sportsFamily=familias[estilo];
    g.userData.genericFront = true; g.userData.hoodHeight = .74;
    const pintura = lam({ color: cor, roughness: .28, metalness: .42 });
    const vidro = lam({ color: 0x172b34, transparent:true, opacity:.82, roughness: .12, metalness: .28 });
    const borracha = lam({ color: 0x171717, roughness: .96 });
    const aro = lam({color:0xa8ada8,metalness:.82,roughness:.22});
    const parte = (geo, mat, x, y, z, tipo) => { const m = new THREE.Mesh(geo, mat); m.position.set(x,y,z); m.castShadow = true; m.receiveShadow = true; if(tipo)m.userData.carPart=tipo; g.add(m); return m; };
    const dims=[[1.9,.42,4.25],[1.96,.48,4.05],[1.88,.5,3.82]][estilo];
    parte(new THREE.BoxGeometry(...dims), pintura, 0,.43,0,'body');
    if(estilo===0){
      // capô longo e cockpit aberto com dois arcos independentes
      parte(new THREE.BoxGeometry(1.72,.2,1.22),pintura,0,.72,1.32,'long-hood');
      parte(new THREE.BoxGeometry(1.48,.44,.86),vidro,0,.82,-.42,'windshield');
      for(const x of [-.48,.48]) { const arco=parte(new THREE.TorusGeometry(.23,.045,7,12,Math.PI),aro,x,1.12,-.82,'roll-hoop'); arco.rotation.y=Math.PI/2; }
    } else if(estilo===1){
      // fastback comprido em dois volumes recuados
      parte(new THREE.BoxGeometry(1.62,.58,1.28),vidro,0,.84,.05,'windshield');
      const traseira=parte(new THREE.BoxGeometry(1.58,.42,1.12),vidro,0,.72,-1.02,'fastback-roof'); traseira.rotation.x=-.13;
      parte(new THREE.BoxGeometry(1.78,.18,.82),pintura,0,.7,1.55,'short-hood');
    } else {
      // targa curto, barra estrutural clara e cobertura destacada
      parte(new THREE.BoxGeometry(1.5,.5,.82),vidro,0,.82,.22,'windshield');
      parte(new THREE.BoxGeometry(1.68,.18,.18),aro,0,1.12,-.44,'targa-bar');
      parte(new THREE.BoxGeometry(1.48,.12,.78),pintura,0,1.08,-.86,'targa-roof');
      parte(new THREE.BoxGeometry(1.72,.24,.72),pintura,0,.76,1.43,'raised-hood');
    }
    parte(new THREE.BoxGeometry(1.7,.13,.5), pintura, 0,.68,-1.7,'rear-deck');
    for (const x of [-.97,.97]) for (const z of [-1.27,1.27]) {
      const frente=z>0, wheel = parte(new THREE.CylinderGeometry(.31,.31,.2,14), borracha,x,.32,z,frente?'front-wheel':'wheel'); wheel.rotation.z = Math.PI/2;
      const hub=parte(new THREE.CylinderGeometry(.14,.14,.215,12),aro,x,.32,z,'rim'); hub.rotation.z=Math.PI/2;
    }
    const lamp = lam({ color: 0xf6e6bd, emissive: 0x705c22, emissiveIntensity: .45, roughness: .35 });
    for (const x of [-.56,.56]) parte(new THREE.BoxGeometry(estilo===1?.5:.34,.14,.075), lamp,x,.57,2.06,'headlight');
    const grade=lam({color:0x303538,metalness:.45,roughness:.46});
    if(estilo===0) for(const x of [-.48,0,.48]) parte(new THREE.BoxGeometry(.3,.085,.09),grade,x,.34,2.09,'grille');
    else if(estilo===1) parte(new THREE.BoxGeometry(1.18,.12,.09),grade,0,.34,2.09,'grille');
    else for(const x of [-.58,.58]) parte(new THREE.BoxGeometry(.42,.12,.09),grade,x,.34,1.96,'grille');
    parte(new THREE.BoxGeometry(1.48,.1,.1),lam({color:0x777b7c,metalness:.75,roughness:.3}),0,.21,2.08,'bumper');
    root.add(g); col(cx - 1, cx + 1, 0, 1.3, 8.95, 13.05); solids.push({ x0: cx - 1, x1: cx + 1, z0: 8.95, z1: 13.05 });
    // a bala testa a malha visível do carro (vidro atravessa) — BUG-54, mesmo padrão do propComFallback
    g.traverse((m) => { if (m.isMesh && !(m.material && m.material.transparent && (m.material.opacity === undefined || m.material.opacity < 0.9))) occluders.push(m); });
    return g;
  };
  carroGenerico(-6, 0xa84132, 0, .04);
  carroGenerico(0, 0x31506a, 1, 0);
  carroGenerico(6, 0xb8b6aa, 2, -.04);

  /* ===================== JARDIM TROPICAL MODERNISTA ===================== */
  // Caminho sinuoso de pedras irregulares quebra a malha ortogonal da casa.
  const pedraJardim = lam({ color: 0x9a998a, roughness: 0.94 });
  for (const [px, pz, sx, sz, ry] of [[-1.2,18,1.3,.75,.3],[.2,20.1,1.05,.82,-.2],[-1.8,22.3,1.45,.72,.45],[.6,24.4,1.25,.68,-.35],[-.7,26.7,1.5,.8,.15],[1.0,29.2,1.2,.72,-.5],[-.2,32,1.55,.75,.28]]) {
    const pedra = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.08, .08, 7), pedraJardim);
    pedra.scale.set(sx, 1, sz); pedra.rotation.y = ry; pedra.position.set(px, .035, pz); pedra.receiveShadow = true; root.add(pedra);
  }
  // Espelho deslocado do eixo: base escura + lâmina translúcida deixam profundidade
  // e quebram a simetria de catálogo sem fechar a rota central.
  const eixoX=-4.2;
  addFloor(3.45,13.2,eixoX,24.8,lam({color:0x163f4b,roughness:.5}),-.055);
  const aguaEixo = lam({ color: 0x4eaabd, roughness: .055, metalness: .14,
    emissive: 0x095367, emissiveIntensity: .24, transparent: true, opacity: .68,depthWrite:false });
  const eixoAgua = addFloor(3.25, 13.2, eixoX, 24.8, aguaEixo, .025);
  eixoAgua.userData.nonSolidSurface = true;
  for (const x of [eixoX-1.78,eixoX+1.78]) addBox(.16,.08,13.2,TEX.marble,x,.01,24.8,{ collide:false,cast:false,skirt:false });
  // espelho d'água (retangular, raso)
  addFloor(6, 4, -8, 25, lam({ color: 0x2a4a6a, roughness: 0.05, metalness: 0.3 }), 0.02);
  col(-11, -5, -0.5, 0.65, 23, 27);  // topo acima dos pés: _collide realmente expulsa o corpo
  // Árvores mantêm o tronco-colisor, mas as copas deixam de ser cubos.
  const folhaA = lam({ color: 0x28582f, roughness: 1 });
  const folhaB = lam({ color: 0x3f773b, roughness: 1 });
  const jardimAssimetrico=new THREE.Group(); jardimAssimetrico.userData.mansaoFeature='garden-asymmetry'; root.add(jardimAssimetrico);
  // Seis maciços autorados, sem pares espelhados e com três famílias de silhueta.
  // Cada grupo é geometria real; o contrato mede posição e diversidade, não um selo vazio.
  const clusterSpecs=[[-14.7,18.2,'heliconia'],[-9.9,22.8,'filodendro'],[13.5,19.7,'agave'],[8.7,29.6,'heliconia'],[-15.8,31.4,'agave'],[5.6,25.1,'filodendro']];
  clusterSpecs.forEach(([gx,gz,familia],clusterIndex)=>{
    const cluster=new THREE.Group(); cluster.position.set(gx,0,gz);
    cluster.userData.mansaoFeature='garden-cluster'; cluster.userData.gardenFamily=familia; cluster.userData.clusterIndex=clusterIndex;
    if(familia==='heliconia') for(let i=0;i<7;i++) {
      const a=-.9+i*.3, caule=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.75+i*.09,6),lam({color:0x397343,roughness:1}));
      caule.position.set((i-3)*.12,(.75+i*.09)/2,Math.sin(a)*.18); cluster.add(caule);
      const flor=new THREE.Mesh(new THREE.ConeGeometry(.13,.38,6),lam({color:i%2?0xd64d32:0xf09a35,roughness:.9})); flor.rotation.z=(i-3)*.09; flor.position.set((i-3)*.12,.82+i*.09,Math.sin(a)*.18); cluster.add(flor);
    } else if(familia==='filodendro') for(let i=0;i<9;i++) {
      const a=i*Math.PI*2/9, folha=new THREE.Mesh(new THREE.SphereGeometry(.34,8,5),lam({color:i%2?0x347b45:0x4b9253,roughness:1}));
      folha.scale.set(.36,.08,1.65); folha.rotation.set(-.48,a,0); folha.position.set(Math.sin(a)*.45,.42+(i%3)*.12,Math.cos(a)*.45); cluster.add(folha);
    } else for(let i=0;i<10;i++) {
      const a=i*Math.PI*2/10, folha=new THREE.Mesh(new THREE.ConeGeometry(.16,.95,6),lam({color:i%2?0x64834a:0x78994f,roughness:1}));
      folha.rotation.set(.68,a,0); folha.position.set(Math.sin(a)*.31,.34,Math.cos(a)*.31); cluster.add(folha);
    }
    cluster.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.userData.nonSolidSurface=true;}}); root.add(cluster);
  });
  // Três maciços densos deslocados: volumes contínuos enquadram a aproximação e
  // retiram o jardim da leitura axial/rala sem invadir o corredor central.
  const massSpecs=[[-12.4,20.4,1.18],[11.2,25.8,.92],[-8.7,31.4,1.34]];
  massSpecs.forEach(([mx,mz,rot],mi)=>{
    const mass=new THREE.Group(); mass.position.set(mx,0,mz); mass.rotation.y=rot;
    mass.userData.mansaoFeature='garden-mass';
    for(let i=0;i<24;i++) {
      const a=i*Math.PI*2/24+mi*.31,r=.38+(i%6)*.17;
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(.42,8,5),lam({color:i%3===0?0x255f36:i%3===1?0x3d8245:0x527d3e,roughness:1}));
      leaf.scale.set(.28,.10,1.45+(i%4)*.16); leaf.rotation.set(-.42+(i%3)*.1,a,(i%2?1:-1)*.12);
      leaf.position.set(Math.sin(a)*r,.42+(i%5)*.13,Math.cos(a)*r); leaf.userData.nonSolidSurface=true; mass.add(leaf);
    }
    for(let i=0;i<6;i++) {
      const flower=new THREE.Mesh(new THREE.ConeGeometry(.12,.52,6),lam({color:i%2?0xe06a34:0xc94334,roughness:.9}));
      flower.position.set((i-2.5)*.19,.72+(i%3)*.18,Math.sin(i)*.32); flower.rotation.z=(i-2.5)*.07;
      flower.userData.nonSolidSurface=true; mass.add(flower);
    }
    root.add(mass);
  });
  for (const [tx, tz, h] of [[-12.8,19.2,3.7],[10.7,21.4,4.3],[-15.2,27.1,4.8],[13.1,29.6,3.9],[-8.7,33.1,4.2]]) {
    const tronco=new THREE.Mesh(new THREE.CylinderGeometry(.22,.34,h,9),lam({color:0x63482f,roughness:1})); tronco.position.set(tx,h/2,tz); root.add(tronco);
    occluders.push(tronco);   // tronco visível dentro do próprio colisor: a bala para nele
    for (const [ox, oy, oz, s] of [[0,0,0,1],[-.85,-.15,.15,.72],[.8,-.08,-.2,.76],[.1,.48,.2,.68]]) {
      const copa = new THREE.Mesh(new THREE.IcosahedronGeometry(1.55 * s, 1), (ox + oz) > 0 ? folhaB : folhaA);
      copa.scale.set(1.05, .78, .94); copa.position.set(tx + ox, h + .1 + oy, tz + oz); copa.castShadow = true; root.add(copa);
    }
    col(tx-.3,tx+.3,0,h,tz-.3,tz+.3); solids.push({ x0: tx - 0.3, x1: tx + 0.3, z0: tz - 0.3, z1: tz + 0.3 });
  }
  // Bromélias em manchas curvas amarram canteiros, espelho d'água e caminho.
  for (const [x, z, c] of [[-11.2,19.4,0xb84132],[-7.4,20.8,0xd1842f],[6.7,21.7,0xb84132],[10.6,24.1,0xd1842f],[-13.3,28.9,0xb84132],[-6.1,31.2,0xd1842f],[7.9,27.4,0xb84132],[14.1,32.2,0xd1842f]]) {
    const g = new THREE.Group();
    g.userData.mansaoFeature = 'bromelia';
    for (let i = 0; i < 11; i++) {
      const a = i * Math.PI * 2 / 11, externo = i % 2 === 0;
      const folha = new THREE.Mesh(new THREE.ConeGeometry(.16,externo?.92:.68,6), lam({ color: i % 4 === 0 ? c : 0x376f3b, roughness: 1 }));
      folha.rotation.set(externo ? .82 : .55,a,0);
      folha.position.set(Math.sin(a) * (externo ? .34 : .2), externo ? .34 : .42, Math.cos(a) * (externo ? .34 : .2));
      g.add(folha);
    }
    const miolo = new THREE.Mesh(new THREE.SphereGeometry(.22, 9, 6), lam({ color: c, roughness: .9 }));
    miolo.position.y = .32; g.add(miolo);
    // MAP1: a bromélia é a MESMA construção do `garden-cluster` (cones de folha sem
    // colisor), mas nasceu sem a marca que o cluster tem. Resultado: a sonda vertical
    // lia 0,43-0,64 m de "sólido" em cima do jogador em 72 células de 0,25 m — três dos
    // cinco pontos reprovados eram só a fase da grade de 1 m caindo aqui. A marca é a
    // verdade medida: não há colisor nenhum, o corpo atravessa a folhagem.
    g.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    g.position.set(x, 0, z); root.add(g);
  }
  // Duas palmeiras assimétricas enquadram a fachada; folhas alongadas têm três
  // inclinações para não ler como as copas esféricas existentes.
  const folhaPalma = lam({ color: 0x2c713c, roughness: 1 });
  for (const [px,pz,sgn] of [[-17.2,22.5,1],[17.2,24,-1]]) {
    const palm = new THREE.Group(); palm.position.set(px,0,pz); palm.userData.mansaoFeature = 'palmeira';
    const tropicalTag=new THREE.Group(); tropicalTag.userData.mansaoFeature='tropical-3d'; palm.add(tropicalTag);
    for (let i=0;i<5;i++) {
      const tronco = new THREE.Mesh(new THREE.CylinderGeometry(.18+i*.015,.24+i*.018,.9,8), lam({ color: 0x80613d, roughness: 1 }));
      tronco.position.set(sgn*i*.07,.45+i*.82,0); tronco.rotation.z = -sgn*.055;
      tronco.userData.nonSolidSurface = true; palm.add(tronco);
    }
    for (let i=0;i<10;i++) {
      const a=i*Math.PI*2/10, leaf=new THREE.Mesh(new THREE.SphereGeometry(.58,8,5),folhaPalma);
      leaf.scale.set(.24,.09,2.35); leaf.rotation.set(-.42,a,Math.sin(a)*.18);
      leaf.position.set(sgn*.32+Math.sin(a)*.55,4.45+Math.cos(a)*.14,Math.cos(a)*.55);
      leaf.userData.nonSolidSurface = true; palm.add(leaf);
    }
    root.add(palm);
  }
  // Bananeiras no primeiro plano: folhas altas, largas e em leque, não estrelas 2D.
  for(const [bx,bz,ry] of [[-9.8,24.8,.3],[11.6,26.5,-.45]]){
    const banana=new THREE.Group(); banana.position.set(bx,0,bz); banana.rotation.y=ry;
    banana.userData.mansaoFeature='tropical-3d';
    for(let i=0;i<7;i++){ const a=-1.1+i*.36, folha=new THREE.Mesh(new THREE.SphereGeometry(.52,9,5),lam({color:i%2?0x4b8b45:0x35783c,roughness:1})); folha.scale.set(.28,.08,2.25); folha.rotation.set(-.55,a,0); folha.position.set(Math.sin(a)*.55,1.45+i*.12,Math.cos(a)*.55); banana.add(folha); }
    const caule=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,1.45,8),lam({color:0x6f8744,roughness:1})); caule.position.y=.72; banana.add(caule);
    // MAP1: era a PIOR penetração do mapa inteiro (1,384 m em (11,5, 26,5)) e a única
    // acima de 1 m nos dez mapas. Bananeira é `tropical-3d`, a mesma taxonomia da palmeira
    // e da folhagem instanciada — que já declaram tronco E folha como atravessáveis. O
    // pseudocaule da bananeira não é cover (as árvores de tronco lenhoso é que levam
    // `col()` na linha ~442); ficar sem a marca era divergência de plantio, não decisão.
    banana.traverse((o) => { if (o.isMesh) o.userData.nonSolidSurface = true; });
    root.add(banana);
  }
  // Encosta verde lateral em dois planos de profundidade: o horizonte deixa de
  // terminar numa linha oceânica reta, sem bloquear o eixo central de combate.
  const encosta = new THREE.Group(); encosta.userData.mansaoFeature = 'encosta';
  for (const [x,z,sx,sy,sz] of [[-20.8,26,1.2,.46,2.2],[20.8,29,1.15,.4,1.9]]) {
    const morro = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5,1), lam({ color: 0x356438, roughness: 1 }));
    morro.scale.set(sx,sy,sz); morro.position.set(x,.55,z); morro.rotation.y = x < 0 ? .24 : -.3; morro.receiveShadow = true;
    morro.userData.nonSolidSurface = true; encosta.add(morro);
  }
  root.add(encosta);
  // Pergolado do lounge: quatro pilares chegam ao solo; cinco travessas e duas
  // longarinas formam uma estrutura legível, eliminando as vigas soltas no céu.
  const pergolaMat=lam({color:0x765039,roughness:.66});
  const marcaPergola=(o,tipo)=>{o.userData.mansaoFeature='pergola-part';o.userData.pergolaPart=tipo;return o;};
  for(const [x,z] of [[-13.8,14.7],[-8.2,14.7],[-13.8,18.3],[-8.2,18.3]]) marcaPergola(addBox(.22,3.05,.22,pergolaMat,x,0,z,{collide:false,skirt:false}),'pillar');
  for(const z of [14.7,18.3]) marcaPergola(addBox(5.85,.18,.22,pergolaMat,-11,2.96,z,{collide:false,skirt:false}),'beam');
  for(let z=15;z<=18;z+=.75) marcaPergola(addBox(.16,.14,3.8,pergolaMat,-13.3+(z-15)*1.52,3.13,16.5,{collide:false,skirt:false}),'beam');
  // Maciços tropicais instanciados: volume nas bordas, corredor de combate preservado.
  const folhaGeo = new THREE.SphereGeometry(.48, 8, 5);
  const folhagem = new THREE.InstancedMesh(folhaGeo, lam({ color: 0x2f7040, roughness: 1 }), 72);
  const dummy = new THREE.Object3D(); let folhaIdx = 0;
  const macicos = [[-17.4,17.1],[-12.1,18.3],[-18.1,24.8],[-13.4,34],[-7.2,32.9],[16.2,18.6],[11.4,20.2],[17.7,26.1],[14.2,33.5],[7.8,30.8],[-9.3,27.6],[6.4,25.4]];
  for (let c = 0; c < macicos.length; c++) for (let i = 0; i < 6; i++) {
    const a = i * Math.PI * 2 / 6 + c * .37, r = .35 + (i % 3) * .22;
    dummy.position.set(macicos[c][0] + Math.cos(a) * r, .55 + (i % 2) * .2, macicos[c][1] + Math.sin(a) * r);
    dummy.rotation.set(-.18 + (i % 3) * .13, a, .18 * Math.sin(a));
    dummy.scale.set(.38 + (i % 2) * .15, .25, 1.15 + (i % 3) * .18); dummy.updateMatrix();
    folhagem.setMatrixAt(folhaIdx++, dummy.matrix);
  }
  folhagem.instanceMatrix.needsUpdate = true; folhagem.castShadow = true;
  folhagem.userData.nonSolidSurface = true; folhagem.userData.mansaoFeature='tropical-3d'; root.add(folhagem);
  const forracao = lam({ color: 0x416f38, roughness: 1 });
  for (const [x,z,s] of [[-16.4,18.1,2.2],[-14.8,25.6,2.5],[-10.7,33.2,2.8],[15.7,19.1,2.0],[16.4,27.2,2.4],[10.9,31.7,2.6]]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(s, 14), forracao);
    m.rotation.x = -Math.PI / 2; m.position.set(x,.018,z); m.receiveShadow = true;
    m.userData.nonSolidSurface = true; root.add(m);
  }
  // muretas dos canteiros (cover agachado)
  for (const [mx, mz,ry] of [[5.4,23.3,.08],[-6.2,24.8,-.12],[7.1,30.5,.16],[-4.8,29.1,-.06]]) { addBox(3.0, 0.6, 0.4, lam({ color: 0x8a8a7a }), mx, 0, mz,{ry}); solids.push({ x0: mx - 1.5, x1: mx + 1.5, z0: mz - 0.2, z1: mz + 0.2 }); }
  // portão da frente
  addBox(8.0, 3.0, 0.3, lam({ color: 0x2a2a2a, metalness: 0.5 }), 0, 0, 34);
  // Guarita e biombo protegem o respawn, deixando rotas laterais independentes.
  addBox(3.2, 2.8, 3.2, TEX.concrete, -17.5, 0, 31.5);
  // Cada biombo tem passagem alinhada aos spawns internos. Antes eram painéis cegos:
  // o primeiro spawn E (-4,5) só conseguia sair pela ponta oeste, colapsando E→JARDIM
  // e E→PISCINA numa única faixa de navegação apesar de CTF2 apenas imprimir a falha.
  for (const x of [-6.75, -2.25, 2.25, 6.75]) addBox(2.5, 2.1, 0.35, ripado, x, 0, 29);

  /* ===================== TERRAÇO + PISCINA INFINITA ===================== */
  // Deck recortado nas laterais: não existe madeira depois da borda infinita central.
  const deckMat = TEX.deck || lam({ color: 0x8a6a4a });
  addFloor(HALF_X * 2 - 2, 9, 0, -19.5, deckMat, 0.03);
  addFloor(15, 11, -13.5, -29.5, deckMat, 0.03);
  addFloor(15, 11, 13.5, -29.5, deckMat, 0.03);
  // piscina (não entrável — colisor)
  addFloor(11.8,7.8,0,-28,lam({color:0x174b60,roughness:.56}),-.12);
  // Uma única cuba cobre a lâmina principal e o vertedouro até a borda infinita.
  // A máscara curta anterior terminava em z=-32 e deixava o gramado aparecer sob
  // a continuação transparente vista da câmera do terraço.
  const mascaraCuba=addFloor(12.2,12.0,0,-29.9,lam({color:0x1b5267,roughness:.34}),.045);
  mascaraCuba.userData.mansaoFeature='pool-basin-mask'; mascaraCuba.userData.nonSolidSurface=true;
  const aguaPiscina = lam({ color: 0x419bb3, roughness: .045, metalness: .16,
    emissive: 0x0b6074, emissiveIntensity: .22, transparent: true, opacity: .86,depthWrite:false });
  const piscina = addFloor(12, 8, 0, -28, aguaPiscina, .08);
  piscina.userData.nonSolidSurface = true;
  col(-6, 6, -0.5, 0.65, -32, -24);
  const bordaPiscina = lam({ map: TEX.marble.map || null, color: 0xf0eadc, roughness: .3 });
  for (const x of [-6.2,6.2]) addBox(.32,.18,8.5,bordaPiscina,x,.01,-28,{ collide:false, skirt:false });
  addBox(12.7,.18,.32,bordaPiscina,0,.01,-23.85,{ collide:false, skirt:false });
  for (const x of [-5.95,5.95]) addBox(.08,.52,8.0,lam({ color:0x208cab,transparent:true,opacity:.55,roughness:.1 }),x,-.42,-28,
    { collide:false,cast:false,skirt:false });
  // A lâmina termina exatamente na borda norte; o vertedouro azul continua a linha do mar.
  addFloor(12, .55, 0, -31.74, lam({ color: 0x59c9df, roughness: .08, metalness: .08 }), .075);
  addBox(12, .42, .08, lam({ color: 0x2a91ae, transparent: true, opacity: .72, roughness: .16 }), 0, -.35, -32.02,
    { collide: false, cast: false, skirt: false });
  addFloor(12, 3.8, 0, -33.9, lam({ color: 0x247d9d, roughness: .16, metalness: .08, transparent: true, opacity: .9 }), .015);
  // espreguiçadeiras
  for (const [ex, ez, ry] of [[-12, -22, 0.2], [12, -22, -0.2], [-12, -28, 0.1], [12, -28, -0.1]])
    propComFallback('guarda_sol', ex, ez, 2.2, ry, () => addBox(0.8, 0.4, 2.0, lam({ color: 0xf0e8d0 }), ex, 0, ez));
  // mesa externa
  propComFallback('mesa_guardasol', 0, -20, 2.3, 0, () => addBox(2.0, 0.9, 1.0, lam({ color: 0xe0d0b0 }), 0, 0, -20));
  solids.push({ x0: -1, x1: 1, z0: -20.5, z1: -19.5 });
  // heliponto (H) — decoração
  addBox(0.3, 0.05, 8.0, lam({ color: 0xffffff }), -15, 0, -30, { collide: false });
  addBox(8.0, 0.05, 0.3, lam({ color: 0xffffff }), -15, 0, -30, { collide: false });

  /* MUROS */
  for (const sx of [-HALF_X, HALF_X]) addBox(0.5, 2.5, HALF_Z * 2, MAT_WALL, sx, 0, 0);
  addBox(HALF_X * 2, 2.5, 0.5, MAT_WALL, 0, 0, HALF_Z);
  // Vasos e balizadores dão escala ao deck e às circulações sem virarem paredes de cover.
  const vasos = [
    [-19,-33,1.0],[-19,-29,.8],[-19,-25,.8],[-19,-19,.9],[-10,-34,.8],[-10,-29,.75],[-10,-25,.75],[-10,-19,.8],
    [10,-34,.8],[10,-29,.75],[10,-25,.75],[10,-19,.8],[19,-33,1.0],[19,-29,.8],[19,-25,.8],[19,-19,.9],
    [-19,-14,.75],[-19,-8,.7],[-19,-2,.8],[-19,5,.75],[-19,11,.8],[19,-14,.75],[19,-8,.7],[19,-2,.8],[19,5,.75],[19,11,.8],
    [-10,-4,.65],[-10,3,.65],[-10,9,.65],[-10,15,.65],[10,-4,.65],[10,3,.65],[-19,15,.65],[-18,18,.8],[18,18,.8],[-18,27,.7],[18,27,.7]
  ];
  for (const [x, z, s] of vasos) {
    addBox(0.72 * s, 0.7, 0.72 * s, TEX.concrete, x, 0, z);
    addBox(0.65 * s, 1.15 * s, 0.65 * s, lam({ color: 0x2e6636, roughness: 1 }), x, 0.5 * s, z, { collide: false, skirt: false });
  }

  /* GROUND HEIGHT (multinível: mezanino) */
  const MZ = { x0: -12, x1: 12, z0: -15, z1: -8 };
  function groundHeightAt(x, z, yRef) {
    if (((x >= STAIR.x0 && x <= STAIR.x1) || (x >= STAIR_SERVICE.x0 && x <= STAIR_SERVICE.x1)) &&
        z >= STAIR.z0 && z <= STAIR.z1) {
      const i = THREE.MathUtils.clamp(Math.round((-7.5 - z) / 0.29), 0, 25);
      return i * 0.18;
    }
    // Sem referência, preserva a camada superior usada por bandeira/pickup. Com yRef,
    // o hall sob o escritório permanece no térreo e o mezanino continua em 4,5 m.
    if (x >= MZ.x0 && x <= MZ.x1 && z >= MZ.z0 && z <= MZ.z1 &&
        (yRef === undefined || yRef >= LAJE_H * .5)) return LAJE_H;
    return 0;
  }

  /* WAYPOINTS */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf, yRef = 0) => {
    const g = groundHeightAt(x, z, yRef);
    if (g < 1 && insideSolid(x, z, inf)) return true;
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5, 0)) nodes.push({ x: gx, z: gz, y: groundHeightAt(gx, gz, 0) });
  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35, yRef = 0) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
      if (!blocked(x, z, inf, yRef)) nodes.push({ x, z, y: groundHeightAt(x, z, yRef) });
    }
  };
  // escada (passo apertado)
  linha(-3, -7.5, -3, -14.5, 0.9, 0.25, null);
  linha(13.5, -7.5, 13.5, -14.5, 0.9, 0.25, null);
  linha(13.5, -7.5, 13.5, -4.8, .7, .2, 0);
  // mezanino
  for (const mz of [-14, -12, -9]) linha(-11, mz, 11, mz, 3.0, 0.3, LAJE_H);
  linha(-3, -14.5, -5.2, -14.5, .55, .2, LAJE_H);
  linha(13.5, -14.5, 11, -14.5, .55, .2, LAJE_H);
  // interior
  for (const iz of [-12, -6, 0, 6]) linha(-14, iz, 14, iz, 3.0);
  // jardim
  for (const jz of [18, 24, 30]) linha(-20, jz, 20, jz, 3.0);
  // O STEP global (3,4 m) caía exatamente sobre os montantes dos biombos e não
  // amostrava os vãos de 2 m. Estas duas linhas são o eixo navegável das portas.
  linha(-4.5, 32, -4.5, 26.5, .9, .2);
  linha(4.5, 32, 4.5, 26.5, .9, .2);
  // terraço
  for (const tz of [-20, -25, -30]) linha(-18, tz, 18, tz, 3.0);

  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t; if (blocked(x, z, 0.25, y)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, dy = Math.abs(nodes[i].y - nodes[j].y); if (dy <= .72 && dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z, yRef) { const y = groundHeightAt(x, z, yRef); let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, dy = nodes[i].y - y, d = dx * dx + dz * dz + dy * dy; if (d < bd) { bd = d; b = i; } } return b; }
  const _D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z, dy = nodes[a].y - nodes[b].y; return Math.sqrt(dx * dx + dz * dz + dy * dy); };
  function findPath(fromIdx, toIdx) { if (fromIdx === toIdx) return [toIdx]; const n = nodes.length, g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), open = new Uint8Array(n); g[fromIdx] = 0; f[fromIdx] = _D(fromIdx, toIdx); open[fromIdx] = 1; let oc = 1; while (oc > 0) { let cur = -1, bf = Infinity; for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; } if (cur === -1) break; if (cur === toIdx) { const p = [cur]; let c = prev[cur]; while (c !== -1) { p.unshift(c); c = prev[c]; } return p; } open[cur] = 0; oc--; for (const m of adj[cur]) { const t = g[cur] + _D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + _D(m, toIdx); if (!open[m]) { open[m] = 1; oc++; } } } } return [fromIdx]; }

  /* SPAWNS: A no PORTÃO (jardim), B no TERRAÇO (piscina) */
  const spawns = {
    E: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 32, yaw: Math.PI })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -22, yaw: 0 })),
  };

  /* CTF */
  const ctfPoints = [
    { id: 'R', label: 'JARDIM',   x: 10,  z: 28 },
    { id: 'E', label: 'SALA',     x: -10, z: 2 },
    { id: 'P', label: 'MEZZO',    x: 8,   z: -11 },
    { id: 'B', label: 'PISCINA',  x: -10, z: -25 },
  ];

  /* ARSENAL */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.userData.nonSolidSurface = true; m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  place('ak', 9, 1);       place('m4', -8, -4);
  place('awp', 0, -11);    place('shotgun', 8, -10);
  place('mp5', -8, 31);    place('deagle', 10, 28);
  place('m400', 0, -22);   place('mp5', -12, -22);
  place('deagle', 4, 4);   place('ak', -8, 11);
  place('shotgun', 0, 32); place('m4', 6, -20);

  PB.build(root);
  SKIRT.build(root);

  /* Pixo no muro externo, sem o folha-pixaca-01 ("MORTE" — veto editorial da mansão,
     cobrado no eval:grafite-editorial). */
  const D_PIXO_M = decalIds(T, ['folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  grafitar({ id: 'fy_mansao', root, T, waypoints: nodes, seed: 14000, passo: 1.0, alcance: 4, cobre: 0.01, minLarg: 0.3, bandas: [{ y0: 0.3, y1: 1.5, larg: 1.5, alturas: [0.8], chance: 5, pool: D_PIXO_M }] });

  /* BUG-57: mansão tem pombo de cobertura e um rato só — no jardim, longe da sala. */
  const ambience = createFavelaAmbience(root, {
    map: 'fy_mansao',
    rats: [{ pos: [-14, 0, 30], to: [-11.5, 0, 32], phase: .7 }],
    pigeons: [
      { mode: 'ground', pos: [6, 0, 33], phase: .4 }, { mode: 'ground', pos: [-16, 0, 20], phase: 1.5 },
      { mode: 'flight', pos: [0, 9, 12], radius: [7, 5], phase: .9 },
    ],
  });

  return {
    ambience,
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    stairs: [{ nome: 'escada do mezanino', ...STAIR, topo: LAJE_H },
      { nome: 'escada de serviço', ...STAIR_SERVICE, topo: LAJE_H }],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
