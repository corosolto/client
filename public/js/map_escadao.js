// ESCADÃO (escadao) — spec plans/12-ESCADAO.md. Invariante CTF2: os dois becos laterais
// têm escada própria rua → patamar 1, separados ≥ 6 m do eixo central (2+ rotas spawn→bandeira).
import * as THREE from 'three';
import { placeProp, InstBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience, FAVELA_AMBIENCE_ASSETS } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';
import { buildEscadaoHome, escadaoHomeGround } from './map_escadao_home.js';
import { buildEscadaoDetails } from './map_escadao_details.js';
import { buildEscadaoContour, contourHeight, ESCADAO_CONTOUR } from './map_escadao_contour.js';
import { buildEscadaoHorizon } from './map_escadao_horizon.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 18, HALF_Z = 40;
export const ESCADAO_AMBIENCE = [...FAVELA_AMBIENCE_ASSETS.filter(id => id !== 'cat'), 'escadaoCat'];

export const ESCADAO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_dagua', 'varal_roupas_01', 'varal_roupas_02',
  'casa_favela_azul', 'casa_favela_tijolo', 'varal_roupas', 'samambaia', 'grama_corrego_02', 'escadao_casa_r3', 'escadao_varanda_r4', 'escadao_eletrica_r4'];

/* bbox dos moldes (GLB em disco): é a razão entre eixos que decide o quanto cada
   instância estica. `eval:escala-casario` relê os arquivos e reprova se derivar. */
export const CASARIO_MOLDES = Object.freeze({
  casa_favela_azul: { larg: 0.955, alt: 0.998, prof: 0.764 },
  casa_favela_tijolo: { larg: 0.943, alt: 0.936, prof: 0.998 },
});

// Escadão íngreme de morro: 35,9°, espelho abaixo do passo máximo do jogador (0,30 m).
// Conserva o traçado horizontal dos lances e das conexões laterais.
const ESC = { larg: 3.6, espelho: 0.21, piso: 0.29, n: 12 };
const RISE = ESC.espelho * ESC.n;
const RUN  = ESC.piso   * ESC.n;
const H_TOP = RISE * 3;

// fronteiras dos lances (z diminui subindo)
const F1 = { z0: 14 - RUN, z1: 14 };
const P1 = { z0: F1.z0 - 4.0, z1: F1.z0 };       // patamar 1 (4 m de fundura)
const F2 = { z0: P1.z0 - RUN, z1: P1.z0 };
const P2 = { z0: F2.z0 - 5.0, z1: F2.z0 };       // patamar 2 / casa de esquina (5 m)
const F3 = { z0: P2.z0 - RUN, z1: P2.z0 };
const TOP_Z = F3.z0;

// bordas da escada central em x
const X0 = -ESC.larg / 2, X1 = ESC.larg / 2;
const BW = { x0: -15, x1: -9 };   // beco oeste
const BE = { x0: 9,   x1: 15 };   // beco leste
const B_STAIR = { z0: 11 - RUN, z1: 11 };
// Laje de chegada da escada do beco (a "boca" de cima do lance).
const CHEGADA_D = 2.2;
// Plataforma de conexão beco → patamar 1: tem de descer até a testa da chegada do beco,
// senão a laje vira ilha sem saída (medido pela régua escadao-rota).
const CONEX = { z0: B_STAIR.z0 - CHEGADA_D, z1: P1.z1 };
// Continuação física do flanco oeste: P1 -> P2 -> mirante, 12 m afastada do eixo central.
const AUX_X = -12, AUX_W = 3;
const AUX_F2 = { z0: CONEX.z0 - RUN, z1: CONEX.z0 };
const AUX_P2 = { z0: P2.z0, z1: AUX_F2.z0 };
const AUX_F3 = { z0: TOP_Z, z1: AUX_P2.z0 };

export function buildEscadao(scene, T) {
  const colliders = [], occluders = [], pickups = [];
  const solids = [];
  const root = new THREE.Group(); scene.add(root);
  buildEscadaoHorizon(root, { low: LOWQ });

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
    asphalt: lam({ map: T.asphalt }),
    concrete: lam({ map: T.concrete }),
    concreteDark: lam({ map: T.concreteDark }),
    dirt: lam({ map: T.dirt }),
    grass: lam({ map: T.grass }),
  };

  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  // Arestas mínimas recebem chanfro: evita faces inferiores de um pixel alternando
  // preto/claro em portas e encontros de fachadas vistos de baixo.
  const caixaChanfrada = (w,h,d,r) => {
    const forma=new THREE.Shape();
    forma.moveTo(-w/2+r,-h/2+r); forma.lineTo(w/2-r,-h/2+r);
    forma.lineTo(w/2-r,h/2-r); forma.lineTo(-w/2+r,h/2-r); forma.closePath();
    const geo=new THREE.ExtrudeGeometry(forma,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:1});
    geo.translate(0,0,-d/2+r); return geo;
  };
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = opts.bevel ? caixaChanfrada(w,h,d,.025) : vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    if (mat === MAT_AZ_LONG || mat.userData?.metricTile) {
      const uv = geo.attributes.uv, pos = geo.attributes.position, normal = geo.attributes.normal;
      for (let i = 0; i < uv.count; i++) {
        const axis = Math.abs(normal.getX(i)) > 0.5 ? pos.getZ(i) : pos.getX(i);
        const tile = mat.userData?.metricTile || 2;
        const u = axis + (Math.abs(normal.getX(i)) > .5 ? z : x);
        const v = Math.abs(normal.getY(i)) > .5 ? pos.getZ(i) + z : pos.getY(i) + y + h / 2;
        uv.setXY(i, u / tile, v / tile);
      }
      uv.needsUpdate = true;
    }
    root.add(m);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(m);
    }
    return m;
  }
  const col = (x0, x1, y0, y1, z0, z1) => colliders.push({ minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minY: y0, maxY: y1, minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1) });
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; };

  // ---- texturas procedurais ----
  function azulejoTex(seed) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cores = ['#087fbd', '#20a6a1', '#f0c332', '#e56b43', '#1767a7', '#55a85a', '#f0e3a7', '#bd3f67'];
    const az = 32;
    for (let py = 0; py < S; py += az) for (let px = 0; px < S; px += az) {
      x.fillStyle = cores[(rnd() * cores.length) | 0]; x.fillRect(px, py, az, az);
      x.fillStyle = cores[(rnd() * cores.length) | 0];
      x.beginPath(); x.arc(px + az / 2, py + az / 2, 6 + rnd() * 8, 0, 6.283); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.55)'; x.lineWidth = 2; x.strokeRect(px, py, az, az);
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,55,45,${0.1 + rnd() * 0.2})`; x.beginPath(); x.arc(rnd() * S, rnd() * S, 2 + rnd() * 8, 0, 6.283); x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex });
  }
  const MAT_AZ_FALLBACK = azulejoTex(7019);
  let MAT_AZ = MAT_AZ_FALLBACK, MAT_AZ_LONG;
  if (typeof document !== 'undefined') {
    const tex = new THREE.TextureLoader().load('/img/textures/escadao_streetart_azulejo.webp', undefined, undefined, () => {
      MAT_AZ.map = MAT_AZ_FALLBACK.map; MAT_AZ.needsUpdate = true;
      if (MAT_AZ_LONG) { MAT_AZ_LONG.map = MAT_AZ_FALLBACK.map; MAT_AZ_LONG.needsUpdate = true; }
    });
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    MAT_AZ = lam({ map: tex });
  }
  // Espelhos pontuais recebem UV em metros; pisos e muretas usam concreto.
  const faixaAz = MAT_AZ.map.clone();
  faixaAz.wrapS = faixaAz.wrapT = THREE.RepeatWrapping; faixaAz.repeat.set(1, 1);
  faixaAz.needsUpdate = true;
  MAT_AZ_LONG = lam({ map: faixaAz, emissive: 0x151006, emissiveIntensity: 0.12 });
  const AZ_CAPS = [
    lam({ color: 0x657d7b, roughness: 0.95 }), lam({ color: 0xb7a16f, roughness: 0.95 }),
    lam({ color: 0xa87559, roughness: 0.95 }), lam({ color: 0xc5bca9, roughness: 0.95 }),
  ];

  // Reboco claro de grão fino: a textura de piso rachado não serve de fachada.
  const rebocoCanvas = document.createElement('canvas'); rebocoCanvas.width = rebocoCanvas.height = 128;
  const rebocoCtx = rebocoCanvas.getContext('2d'); rebocoCtx.fillStyle = '#e5e3dc'; rebocoCtx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 800; i++) {
    rebocoCtx.fillStyle = i % 2 ? 'rgba(65,59,48,.06)' : 'rgba(255,255,255,.12)';
    rebocoCtx.fillRect((i * 73) % 128, (i * 47 + Math.floor(i / 128) * 19) % 128, 1, 1);
  }
  const reboco = new THREE.CanvasTexture(rebocoCanvas); reboco.colorSpace = THREE.SRGBColorSpace;
  reboco.wrapS = reboco.wrapT = THREE.RepeatWrapping;
  const PAREDES = [
    lam({ color: 0x8ba7a4, map: reboco }), lam({ color: 0xd7ccb1, map: reboco }),
    lam({ color: 0xbf9176, map: reboco }), lam({ color: 0xa9b38d, map: reboco }),
  ];
  const MAT_GUARDA = lam({ color: 0xc2baa7, map: T.concrete });
  const MAT_PORTA = lam({ color: 0x49372a, roughness: 0.88 });
  const MAT_VIDRO = lam({ color: 0x273b42, roughness: 0.22, metalness: 0.18 });
  const MAT_ZINCO = lam({ color: 0x777a76, roughness: 0.72, metalness: 0.35 });

  // Referências do dono: concreto gasto e alvenaria aparente. UV em metros impede
  // que cada degrau repita a mesma rachadura inteira. Nenhuma foto foi usada como textura.
  const cimentoCanvas = document.createElement('canvas'); cimentoCanvas.width = cimentoCanvas.height = 256;
  const cimentoCtx = cimentoCanvas.getContext('2d');
  cimentoCtx.fillStyle = '#aca99d'; cimentoCtx.fillRect(0, 0, 256, 256);
  let pedraSeed = 22091;
  const pedraRand = () => (pedraSeed = Math.imul(pedraSeed, 1664525) + 1013904223 >>> 0) / 4294967296;
  for (let i = 0; i < 7200; i++) {
    const gray = Math.floor(115 + pedraRand() * 100);
    cimentoCtx.fillStyle = `rgba(${gray},${gray},${gray - 6},.22)`;
    cimentoCtx.fillRect(pedraRand() * 256, pedraRand() * 256, 1 + pedraRand() * 2, 1);
  }
  for (let i = 0; i < 45; i++) {
    cimentoCtx.fillStyle = i % 3 ? 'rgba(59,66,46,.035)' : 'rgba(235,226,211,.045)';
    cimentoCtx.beginPath(); cimentoCtx.ellipse(pedraRand()*256, pedraRand()*256, 5+pedraRand()*35, 3+pedraRand()*13, pedraRand()*3, 0, Math.PI*2); cimentoCtx.fill();
  }
  const cimento = new THREE.CanvasTexture(cimentoCanvas); cimento.colorSpace = THREE.SRGBColorSpace;
  cimento.wrapS = cimento.wrapT = THREE.RepeatWrapping;
  const MAT_DEGRAU = lam({ map: cimento, color: 0xc5c2b9 }); MAT_DEGRAU.userData.metricTile = 1.6;
  const MAT_CIMENTO = lam({ map: cimento, color: 0xb5b2a8 }); MAT_CIMENTO.userData.metricTile = 1.6;
  // Acervo autoral existente, public/img/FONTE.md: Bloco cerâmico do Lajes.
  const tijolo = new THREE.TextureLoader().load('/img/textures/lajes_tijolo_baiano_color.webp');
  tijolo.colorSpace = THREE.SRGBColorSpace; tijolo.wrapS = tijolo.wrapT = THREE.RepeatWrapping;
  const MAT_TIJOLO = lam({ map: tijolo, color: 0xc8b3a1 }); MAT_TIJOLO.userData.metricTile = 1.65;
  const MAT_FERRO = lam({ color: 0x38413c, roughness: .85, metalness: .15 });
  const detalhesCasa = new InstBatch(), detalheGeo = caixaChanfrada(1,1,1,.015), detalhePose = new THREE.Object3D();
  const detalhe = (w, h, d, mat, x, y, z) => {
    detalhePose.position.set(x, y + h / 2, z); detalhePose.rotation.set(0, 0, 0); detalhePose.scale.set(w, h, d);
    detalhesCasa.add(detalheGeo, mat, detalhePose, null, { cast: false });
  };
  const colDetalhe = (w,h,d,x,y,z) => {
    col(x-w/2,x+w/2,y,y+h,z-d/2,z+d/2);
    colliders[colliders.length-1].escadaoFachadaDetalhe=true;
  };
  const detalheSolido = (w,h,d,mat,x,y,z) => {
    detalhe(w,h,d,mat,x,y,z); colDetalhe(w,h,d,x,y,z);
  };
  function frenteMoradia(face, z, d, h, lado, y, variante) {
    // Face interior de uma parede sólida; a volumetria alcança a casa e nunca flutua.
    const paredeMat = variante % 3 === 0 ? MAT_TIJOLO : (variante % 3 === 1 ? MAT_CIMENTO : PAREDES[1]);
    const parede = addBox(.62, y + h, d, paredeMat, face + lado * .31, 0, z, { vao: false, bevel: true });
    parede.userData.escadaoMoradia = true;
    // Pavimento superior tem profundidade e laje inteira: não é uma fachada-cenário.
    const casaD = 3.25, altoBase = y + 3.05;
    addBox(casaD+.04, y+h-altoBase, d+.08, paredeMat, face+lado*(casaD/2-.02), altoBase, z, { vao: false, bevel: true });
    // Margem do acabamento chanfrado: o ombro não pode tangenciar o beiral por dentro.
    const colAlto = colliders[colliders.length - 1];
    colAlto.minX -= .02; colAlto.maxX += .02; colAlto.minZ -= .02; colAlto.maxZ += .02;
    addBox(casaD+.14,.14,d+.15,MAT_CIMENTO,face+lado*casaD/2,y+h,z,{collide:false,skirt:false,vao:false});
    if (variante % 3 !== 0) addBox(.025,1.25,d*.43,MAT_TIJOLO,face-lado*.017,y+h-1.3,z-d*.26,{collide:false,cast:false,skirt:false,vao:false});
    const patch = PAREDES[variante % PAREDES.length];
    // Reboco parcial em uma porção da fachada, não uma cor plana cobrindo toda a casa.
    const pw = d*.57, ph = h*.46, rebocoForma = new THREE.Shape();
    rebocoForma.moveTo(-pw/2,0); rebocoForma.lineTo(pw/2,0);
    rebocoForma.lineTo(pw/2,ph*.93);
    for (let k=31;k>=0;k--) {
      const irregular=Math.sin(k*17.13+variante*39.7)*.5+.5;
      rebocoForma.lineTo(-pw/2+pw*k/31,ph*(.93+Math.sin(k*.41+variante)*.017+irregular*.007));
    }
    rebocoForma.lineTo(-pw/2,0);
    const remendo = new THREE.Mesh(new THREE.ShapeGeometry(rebocoForma),patch);
    remendo.position.set(face-lado*.032,y+.1,z+d*.19); remendo.rotation.y=-lado*Math.PI/2;
    remendo.receiveShadow=true; remendo.userData.nonSolidSurface=true; root.add(remendo);
    for (const zz of [z-d/2+.09, z+d/2-.09]) detalheSolido(.065, y+h+.15, .17, MAT_CIMENTO, face-lado*.04, 0, zz);
    detalheSolido(.10, .18, d+.07, MAT_CIMENTO, face-lado*.03, y+2.72, z);
    // Porta cega fechada com marco; não promete interior navegável.
    const dz = z + d * (variante % 2 ? .19 : .29), portaCor = variante % 2 ? MAT_FERRO : MAT_PORTA;
    detalhe(.05, y+2.08, .91, MAT_CIMENTO, face-lado*.04, 0, dz);
    detalhe(.05, 1.9, .77, portaCor, face-lado*.075, y+.10, dz);
    for (const zz of [dz-.25,dz,dz+.25]) detalhe(.012,1.75,.018,MAT_ZINCO,face-lado*.11,y+.17,zz);
    colDetalhe(.116,y+2.08,.91,face-lado*.058,0,dz);
    const wz = z - d * (variante % 2 ? .21 : .29), ww = variante % 3 === 0 ? .68 : 1.04;
    for (const wy of [y+(variante % 2 ? 1.64 : 1.15), ...(h>5.1 ? [y+4.05+(variante%2)*.35] : [])]) {
      detalhe(.06, 1.16, ww+.18, MAT_CIMENTO, face-lado*.045, wy, wz);
      detalhe(.06, .96, ww, variante%3===1 ? MAT_FERRO : MAT_VIDRO, face-lado*.08, wy+.10, wz);
      if (variante % 3 === 1) {
        for (let k=0;k<6;k++) detalhe(.028,.025,ww,MAT_ZINCO,face-lado*.125,wy+.17+k*.14,wz);
      } else for (const q of [-ww*.35,0,ww*.35]) detalhe(.028,.99,.025,MAT_FERRO,face-lado*.125,wy+.09,wz+q);
      colDetalhe(.139,1.16,ww+.18,face-lado*.0695,wy,wz);
      detalheSolido(.18,.07,1.2,MAT_CIMENTO,face-lado*.08,wy-.03,wz);
    }
    // Lajes, cano aderido e pequeno beiral: repetidos em um lote, sem sombra extra.
    detalheSolido(.07,h-.5,.07,MAT_CIMENTO,face-lado*.10,y+.15,z-d*.41);
    if (variante % 2 === 0) detalheSolido(.38,.055,1.34,MAT_ZINCO,face-lado*.12,y+2.39,wz);
  }

  // Mantém o canvas como fallback até o download terminar. TextureLoader deixa textura
  // branca em erro; trocar só no onLoad evita que falha de asset apague a superfície.
  if (typeof document !== 'undefined') {
    const loader = new THREE.TextureLoader();
    const external = (mat, url, rx, ry) => {
      const tex = loader.load(url, () => {
        mat.map = tex;
        const det = detailFor(tex);
        if (det && det.normalMap) { mat.normalMap = det.normalMap; mat.normalScale.set(0.65, 0.65); }
        if (det && det.roughnessMap) mat.roughnessMap = det.roughnessMap;
        mat.needsUpdate = true;
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(rx, ry);
    };
    external(MAT.asphalt, '/img/textures/asphalt_br.webp', 6, 6);
    external(MAT.concrete, '/img/textures/concrete_br.webp', 4, 4);
    external(MAT.concreteDark, '/img/textures/concrete_br.webp', 5, 5);
    external(MAT_ZINCO, '/img/textures/tex_zinco.webp', 3, 3);

  }

  const GLB_ON = QP.get('glb') !== '0';
  const gprop = (id, x, y, z, targetH, ry = 0, escuro = false) => {
    if (!GLB_ON) return null;
    const o = placeProp(id, { y, targetH, ry });
    if (!o) return null;
    o.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(o);
    o.position.x += x - (b.min.x + b.max.x) / 2;
    o.position.z += z - (b.min.z + b.max.z) / 2;
    if (escuro) o.traverse((m) => {
      if (!m.isMesh || !m.material) return;
      m.material = Array.isArray(m.material) ? m.material.map((a) => a.clone()) : m.material.clone();
      for (const a of (Array.isArray(m.material) ? m.material : [m.material])) if (a.color) a.color.multiplyScalar(0.18);
    });
    root.add(o);
    // GLB é Group e o raycast de bala/LOS é NÃO-recursivo: quem segura a bala são as
    // malhas filhas — occluder = malha visível (BUG-54), não a caixa do propAt.
    o.traverse((m) => { if (m.isMesh) occluders.push(m); });
    return o;
  };
  const propAt = (id, x, z, targetH, w, d, mat, ry = 0, y = 0) => {
    const proxy = addBox(w, targetH, d, mat, x, y, z, { ry });
    const o = gprop(id, x, y, z, targetH, ry);
    if (o) {
      proxy.visible = false;
      occluders.splice(occluders.indexOf(proxy), 1);   // corpo continua na caixa; bala bate na malha
    }
    return o;
  };

  /* ===================== CÉU / LUZ ===================== */
  setMapSky(scene, T, '/img/textures/sky_rj.webp', 0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('escadao');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x54483c, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.65); sun.position.set(25, 40, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X - 5; sun.shadow.camera.right = HALF_X + 5;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO BASE ===================== */
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, MAT.dirt, -0.01);
  addFloor(HALF_X * 2, 40 - 14, 0, (14 + 40) / 2, MAT.asphalt, 0.01);
  addFloor(HALF_X * 2, 40 - Math.abs(TOP_Z), 0, (TOP_Z + (-40)) / 2, MAT.concrete, H_TOP + 0.02);
  // O mirante é terreno elevado, não uma folha transparente vista do vale. A contenção
  // termina na chegada dos lances; não preenche vãos sob os patamares/conexões.
  const aterro = addBox(HALF_X * 2, H_TOP, HALF_Z + TOP_Z, MAT.concreteDark,
    0, 0, (TOP_Z - HALF_Z) / 2);
  aterro.userData.escadaoStructure = 'mirante';

  /* ===================== HELPERS DE GEOMETRIA ===================== */
  /* ===== CASARIO DE MOLDE (kit Mint favela_r3) =====
     O molde é pele sobre o prisma: o colisor invisível segue em `occluders` (BUG-54) e
     sem GLB a fachada procedural volta. Régua: `eval:escala-casario`, via `casario`. */
  const casario = [];
  function instanciaCasa(spec, x, z, y, w, h, d, col) {
    const nat = CASARIO_MOLDES[spec.molde];
    const sy = h / nat.alt;                       // placeProp já escala uniforme pela altura
    // Duas orientações cabem na planta; fica a que menos distorce o molde.
    const opcao = (alvoX, alvoZ) => ({ sx: alvoX / (nat.larg * sy), sz: alvoZ / (nat.prof * sy) });
    const desvio = (e) => Math.max(e.sx, e.sz) / Math.min(e.sx, e.sz);
    const reto = opcao(w, d), girado = opcao(d, w);
    const usaGirado = desvio(girado) < desvio(reto);
    const e = usaGirado ? girado : reto;
    const ry = (spec.ry || 0) + (usaGirado ? Math.PI / 2 : 0);
    const obj = GLB_ON ? placeProp(spec.molde, { y, targetH: h, ry: 0 }) : null;
    if (obj) {
      obj.scale.x *= e.sx; obj.scale.z *= e.sz;
      obj.rotation.y = ry;
      obj.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(obj);
      obj.position.x += x - (b.min.x + b.max.x) / 2;
      obj.position.z += z - (b.min.z + b.max.z) / 2;
      obj.userData.casario = spec.molde;
      root.add(obj);
    }
    const reg = { molde: spec.molde, pav: spec.pav, x, z, y, ry, larg: w, prof: d, alt: h, sx: e.sx, sz: e.sz, col, obj };
    casario.push(reg);
    return reg;
  }

  // casa sólida (mesmo motivo do quebrada: nenhum interior acessível)
  function casa(x, z, w, d, h, matIdx, y = 0, glb = null) {
    const mat = PAREDES[matIdx % PAREDES.length];
    // A fundação vira fachada inferior vista do vale e impede casa flutuante nos terraços.
    if (y > 0.05) addBox(w, y, d, MAT.concreteDark, x, 0, z);
    const corpo = addBox(w, h, d, mat, x, y, z);
    const col = colliders[colliders.length - 1];
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    if (glb) {
      const reg = instanciaCasa(glb, x, z, y, w, h, d, col);
      // O molde traz porta, janela, telhado e beiral próprios: a fachada procedural sai
      // de cena inteira, senão viram duas portas na mesma parede.
      if (reg.obj) { corpo.visible = false; return; }
    }
    addBox(w + 0.3, 0.12, d + 0.3, MAT.concreteDark, x, y + h, z, { collide: false });
    // Fachada rasa: porta, janela com verga e marquise quebram a leitura de caixa sem
    // acrescentar volume de gameplay ao prédio sólido.
    const frente = z - d / 2 - 0.035;
    addBox(Math.min(1.0, w * 0.28), 2.05, 0.07, MAT_PORTA, x - w * 0.24, y + 0.04, frente, { collide: false, cast: false, skirt: false });
    addBox(Math.min(1.15, w * 0.3), 0.9, 0.06, MAT_VIDRO, x + w * 0.2, y + 1.35, frente - 0.01, { collide: false, cast: false, skirt: false });
    addBox(Math.min(1.45, w * 0.38), 0.09, 0.42, MAT_ZINCO, x + w * 0.18, y + 2.42, frente - 0.16, { collide: false, skirt: false });
    if (h > 3.3) addBox(w * 0.56, 0.72, 0.06, MAT_VIDRO, x, y + h - 1.12, frente - 0.01, { collide: false, cast: false, skirt: false });
    // Telhado de duas águas e puxadinho curto quebram o prisma sem mudar a massa de jogo.
    for (const lado of [-1, 1]) {
      const telha = new THREE.Mesh(new THREE.BoxGeometry(w * 0.56 + 0.18, 0.09, d + 0.34), MAT_ZINCO);
      telha.rotation.z = lado * 0.18; telha.position.set(x + lado * w * 0.245, y + h + 0.28, z);
      telha.castShadow = telha.receiveShadow = true; root.add(telha);
    }
    addBox(w * 0.32, 0.72, d * 0.38, mat, x + w * 0.18, y + h + 0.08, z - d * 0.12, { collide: false, skirt: false });
  }

  // constrói um lance de escada (piso + espelho + muros laterais)
  function fundacaoDegrau(w, yTop, d, x, z) {
    // Massa abaixo do revestimento fecha a visão lateral entre espelhos. Seu topo fica
    // abaixo da superfície de caminhada; a física da rampa continua em groundHeightAt.
    const m = addBox(w, yTop - .06, d, MAT.concreteDark, x, 0, z, { collide: false });
    occluders.push(m);
    m.userData.escadaoStructure = 'degrau';
  }
  function buildFlight(flight, yBase, mat) {
    const { z0, z1 } = flight;
    for (let k = 1; k <= ESC.n; k++) {
      const yTop = yBase + k * ESC.espelho;
      const zc = z1 - (k - 0.5) * ESC.piso;
      const zNariz = z1 - (k - 1) * ESC.piso;
      const pisoMat = MAT_DEGRAU;
      fundacaoDegrau(ESC.larg, yTop, ESC.piso, 0, zc);
      // degrau é massa visível na faixa do collider do muro: vira occluder (BUG-54)
      occluders.push(addBox(ESC.larg, 0.06, ESC.piso, pisoMat, 0, yTop - 0.06, zc, { collide: false }));
      occluders.push(addBox(ESC.larg, ESC.espelho, 0.04, MAT_DEGRAU, 0, yTop - ESC.espelho, zNariz, { collide: false }));
    }
    // Reparos pontuais na face do espelho: perfil físico permanece regular.
    for (const [k,dx,w] of [[3,-.7,.43],[8,.5,.72],[11,-.25,.32]]) {
      const y=yBase+k*ESC.espelho;
      detalhe(w,.055,.008,MAT_CIMENTO,dx,y-.10,z1-(k-1)*ESC.piso+.026);
    }
    // O AABB contínuo preserva o bloqueio físico anterior; visualmente, o paredão alto é
    // substituído por muretas que acompanham a subida em módulos de quatro degraus.
    for (const sx of [X0 - 0.15, X1 + 0.15]) {
      col(sx - 0.15, sx + 0.15, 0, yBase + RISE + 0.5, z0 - 0.15, z1 + 0.15);
      for (let k = 0; k < ESC.n; k += 4) {
        const n = Math.min(4, ESC.n - k), d = n * ESC.piso + 0.05;
        const z = z1 - (k + n / 2) * ESC.piso;
        // face visível dentro do collider do muro: vira occluder (BUG-54)
        occluders.push(addBox(0.28, 1.08, d, MAT_GUARDA, sx, yBase + (k + 1) * ESC.espelho, z, { collide: false, skirt: false }));
        occluders.push(addBox(0.28, 0.055, d + 0.04, MAT_CIMENTO,
          sx, yBase + (k + 1) * ESC.espelho + 1.08, z, { collide: false, cast: false, skirt: false }));
      }
    }
    solids.push({ x0: X0 - 0.5, x1: X0, z0, z1 });
    solids.push({ x0: X1, x1: X1 + 0.5, z0, z1 });
  }

  // patamar (laje plana com muros laterais)
  function buildLanding(z0, z1, y) {
    const w = ESC.larg + 1.0, d = z1 - z0;
    addFloor(w, d, 0, (z0 + z1) / 2, MAT.concrete, y + 0.01);
    addBox(w, 0.12, d, lam({ color: 0x909088 }), 0, y - 0.12, (z0 + z1) / 2);
  }

  // escada de beco (mais estreita, 3 m de largura)
  function buildBecoStair(xCenter, z1, yBase, yTop) {
    const w = 3.0, n = Math.round((yTop - yBase) / ESC.espelho), p = (B_STAIR.z1 - B_STAIR.z0) / n;
    for (let k = 1; k <= n; k++) {
      const y = yBase + k * ESC.espelho, z = z1 - (k - 0.5) * p;
      fundacaoDegrau(w, y, p, xCenter, z);
      occluders.push(addBox(w, 0.06, p, MAT_DEGRAU, xCenter, y - 0.06, z, { collide: false }));
      occluders.push(addBox(w, ESC.espelho, 0.04, MAT_DEGRAU, xCenter, y - ESC.espelho, z1 - (k - 1) * p, { collide: false }));
    }
  }

  // Mesmo perfil da escada central, mas em viela estreita. As muretas seguem os
  // degraus em módulos, de modo que a rota alternativa seja geometria real e segura.
  function buildAuxFlight(flight, yBase) {
    for (let k = 1; k <= ESC.n; k++) {
      const yTop = yBase + k * ESC.espelho;
      const zc = flight.z1 - (k - 0.5) * ESC.piso;
      const zNariz = flight.z1 - (k - 1) * ESC.piso;
      fundacaoDegrau(AUX_W, yTop, ESC.piso, AUX_X, zc);
      occluders.push(addBox(AUX_W, 0.06, ESC.piso, MAT_DEGRAU, AUX_X, yTop - 0.06, zc, { collide: false }));
      occluders.push(addBox(AUX_W, ESC.espelho, 0.04, MAT_DEGRAU, AUX_X, yTop - ESC.espelho, zNariz, { collide: false }));
    }
    for (const sx of [AUX_X - AUX_W / 2 - 0.15, AUX_X + AUX_W / 2 + 0.15]) {
      for (let k = 0; k < ESC.n; k += 4) {
        const n = Math.min(4, ESC.n - k), d = n * ESC.piso + 0.05;
        const z = flight.z1 - (k + n / 2) * ESC.piso;
        addBox(0.28, 1.08, d, MAT_GUARDA, sx, yBase + (k + 1) * ESC.espelho, z);
      }
    }
  }

  /* ===================== ESCADA CENTRAL (3 lances + 3 patamares) ===================== */
  buildFlight(F1, 0, MAT.concrete);
  buildLanding(P1.z0, P1.z1, RISE);
  buildFlight(F2, RISE, MAT.concrete);
  buildLanding(P2.z0, P2.z1, RISE * 2);
  buildFlight(F3, RISE * 2, MAT.concrete);

  // Muros laterais dos patamares (proteção + bloqueio de visão). O vão de 2 m no muro do
  // PATAMAR 1 é a rota beco → patamar 1; o do PATAMAR 2 fica inteiro porque fora é queda.
  const VAO_P1 = 2.0;
  for (const [pz0, pz1, py] of [[P1.z0, P1.z1, RISE], [P2.z0, P2.z1, RISE * 2]]) {
    const trechos = py === RISE
      ? [[pz0, (pz0 + pz1) / 2 - VAO_P1 / 2], [(pz0 + pz1) / 2 + VAO_P1 / 2, pz1]]
      : [[pz0, pz1]];
    for (const sx of [X0 - 0.65, X1 + 0.65]) {
      for (const [tz0, tz1] of trechos) {
        addBox(0.3, 1.5, tz1 - tz0, MAT_GUARDA, sx, py, (tz0 + tz1) / 2);
        addBox(0.38, 0.06, tz1 - tz0 + 0.08, AZ_CAPS[((sx > 0 ? 1 : 3) + (py > RISE ? 0 : 1)) % AZ_CAPS.length],
          sx, py + 1.5, (tz0 + tz1) / 2, { collide: false, cast: false, skirt: false });
      }
    }
  }

  /* ===================== CORRIMÃOS ===================== */
  function corrimao(z0, z1, yBase) {
    const sx = X0 + .03;
    for (let i = 0; i <= ESC.n; i += 4) detalhe(.035, .90, .035, MAT_FERRO, sx, yBase + i * ESC.espelho, z1 - i * ESC.piso);
    const a = new THREE.Vector3(sx,yBase+.94,z1), b = new THREE.Vector3(sx,yBase+RISE+.94,z0), v=b.clone().sub(a);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,v.length(),5),MAT_FERRO);
    rail.position.copy(a.add(b).multiplyScalar(.5));rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    root.add(rail); // aderido à guarda, fora da seção útil
  }
  corrimao(F1.z0,F1.z1,0); corrimao(F2.z0,F2.z1,RISE); corrimao(F3.z0,F3.z1,RISE*2);

  /* ===================== BECOS LATERAIS =====================
     Flancos com escada própria rua → patamar 1; são as 2+ rotas da invariante CTF2. */
  function buildBeco(bx0, bx1, dir) {
    const cx = (bx0 + bx1) / 2;   // centro do beco em x
    // piso do beco (corredor plano na base)
    addFloor(bx1 - bx0, 14 - B_STAIR.z1, cx, (B_STAIR.z1 + 14) / 2, MAT.concrete, 0.01);
    // escada do beco
    buildBecoStair(cx, B_STAIR.z1, 0, RISE);
    // Patamar de chegada: a escada termina numa laje legível antes de virar para o centro.
    const chegadaD = CHEGADA_D, chegadaZ = B_STAIR.z0 - chegadaD / 2;
    addFloor(bx1 - bx0, chegadaD, cx, chegadaZ, MAT.concrete, RISE + 0.01);
    addBox(bx1 - bx0, 0.12, chegadaD, MAT.concreteDark, cx, RISE - 0.12, chegadaZ);
    if (dir > 0) {
      // O flanco oeste continua subindo; fecha só as sobras de 1,5 m ao lado do novo lance.
      for (const x of [bx0 + 0.75, bx1 - 0.75]) addBox(1.5, 1.05, 0.22, MAT_GUARDA, x, RISE, B_STAIR.z0 - chegadaD);
    } else addBox(bx1 - bx0, 1.05, 0.22, MAT_GUARDA, cx, RISE, B_STAIR.z0 - chegadaD);
    const outer = dir > 0 ? bx0 : bx1;
    addBox(0.22, 1.05, chegadaD, MAT_GUARDA, outer, RISE, chegadaZ);
    // plataforma de conexão beco → patamar 1 (y=RISE)
    const inner = dir > 0 ? bx1 : bx0, alvo = dir > 0 ? X0 : X1;
    const pw = Math.abs(alvo - inner), pcx = (alvo + inner) / 2;
    // A laje agora vai de CONEX.z0 (testa da chegada do beco) a CONEX.z1 (fundo do patamar 1):
    // encosta na laje do beco em toda a frente de 2,2 m, em vez de parar 1,2 m antes dela.
    const pd = CONEX.z1 - CONEX.z0, pcz = (CONEX.z0 + CONEX.z1) / 2;
    addFloor(pw, pd, pcx, pcz, MAT.concrete, RISE + 0.01);
    addBox(pw, 0.12, pd, lam({ color: 0x909088 }), pcx, RISE - 0.12, pcz);
    // Muretas fecham as bordas de queda (2,04 m) — MAP6 exige guarda em borda com queda ≥ 2 m.
    for (const z of [CONEX.z0 + 0.11, CONEX.z1 - 0.11])
      addBox(pw, 1.05, 0.22, MAT_GUARDA, pcx, RISE, z);
    addBox(0.42, 0.12, 2.2, AZ_CAPS[dir > 0 ? 0 : 2], inner, RISE + 0.04, chegadaZ, { collide: false, cast: false, skirt: false });
    // Fundo das moradias conserva o fechamento antigo: a rampa fora do corredor
    // não pode deixar uma faixa fantasma navegável nem abrir visão para o spawn.
    for (const wx of [bx0,bx1]) addBox(.4,4,7,MAT_TIJOLO,wx,0,10.5,{vao:false});
    // Três frentes contíguas por lado: parede alta junto à escada, como nas fotos2/3.
    // O vão físico fica em3.8m (escada3m); a saída z6.1 continua livre.
    for (const lado of [-1, 1]) for (let i=0;i<3;i++) {
      const face=cx+lado*1.9, z=12.8-i*2.4, y=i===0?0:ESC.espelho*(i===1?4:10);
      frenteMoradia(face,z,2.4,4.7+((i+(lado>0?1:0))%3)*.8,lado,y,i+(dir>0?0:2)+(lado>0?1:0));
    }

  }
  buildBeco(BW.x0, BW.x1, 1);   // oeste, dir=+1 (conecta pra direita/centro)
  buildBeco(BE.x0, BE.x1, -1);  // leste, dir=-1 (conecta pra esquerda/centro)

  /* ===================== FLANCO OESTE ATÉ O MIRANTE ===================== */
  buildAuxFlight(AUX_F2, RISE);
  addFloor(AUX_W, AUX_P2.z1 - AUX_P2.z0, AUX_X, (AUX_P2.z0 + AUX_P2.z1) / 2, MAT.concrete, RISE * 2 + 0.01);
  addBox(AUX_W, 0.12, AUX_P2.z1 - AUX_P2.z0, MAT.concreteDark, AUX_X, RISE * 2 - 0.12, (AUX_P2.z0 + AUX_P2.z1) / 2);
  // À direita há o patamar contínuo do objetivo; guarda somente na borda de queda.
  for (const sx of [AUX_X - AUX_W / 2 - 0.15])
    addBox(0.28, 1.08, AUX_P2.z1 - AUX_P2.z0, MAT_GUARDA, sx, RISE * 2, (AUX_P2.z0 + AUX_P2.z1) / 2);
  buildAuxFlight(AUX_F3, RISE * 2);

  /* ===================== CASAS LATERAIS ===================== */
  // Cada par acompanha o nível do lance vizinho; o embasamento fecha o volume até a rua.
  for (const [z, y, ml, mr, alto] of [[12, 0, 1, 0, -1], [5, RISE, 0, 2, 1], [-3.7, RISE * 2, 2, 1, -1]]) {
    const sobrado = { molde: 'casa_favela_azul', pav: 2 }, terreo = { molde: 'casa_favela_tijolo', pav: 1 };
    const esq = alto < 0 ? sobrado : terreo, dir = alto < 0 ? terreo : sobrado;
    casa(-4.0, z, 3, 4.4, esq.pav === 2 ? 5.9 : 3.05, ml, y, { ...esq, ry: 0 });
    casa(4.0, z, 3, 4.4, dir.pav === 2 ? 5.9 : 3.05, mr, y, { ...dir, ry: 0 });
    frenteMoradia(-2.2,z,4.4,alto<0?7.1:5.2,-1,y,ml);
    frenteMoradia(2.2,z,4.4,alto<0?5.3:7.3,1,y,mr);
  }

  for (const lado of [-1,1]) {
    addBox(1.8,RISE*2,4.4,MAT_CIMENTO,lado*6.4,0,-3.7,{vao:false});
    addBox(1.8,3.2,4.4,lado<0?MAT_CIMENTO:PAREDES[3],lado*6.4,RISE*2,-3.7,{vao:false});
    detalhe(1.96,.12,4.54,MAT_CIMENTO,lado*6.4,RISE*2+3.2,-3.7);
    detalhe(.72,.85,.04,MAT_FERRO,lado*6.4,RISE*2+1.3,-1.48);
  }
  // Frentes continuam no segundo trecho oeste; a esquina leste indica o retorno ao patamar.
  frenteMoradia(-13.9,2.3,3.0,4.3,-1,RISE,2);
  frenteMoradia(-10.1,-1.3,3.0,5.2,1,RISE*2,0);
  frenteMoradia(13.9,3.0,3.0,5.4,1,RISE,1);

  // Pequenos puxadinhos e caixas d'água criam uma silhueta escalonada ao redor do eixo.
  for (const [x, z, y, w, h, mi] of [
    [-7.85, 8.12, RISE, 2.5, 2.8, 3], [6.1, 6.2, RISE, 2.8, 3.2, 0],
    [-7.1, -7.4, H_TOP, 2.6, 3.0, 1], [7.3, -9.1, H_TOP, 2.5, 2.6, 2],
  ]) {
    if (y > 0.05) addBox(w, y, 3.0, MAT.concreteDark, x, 0, z);
    addBox(w, h, 3.0, PAREDES[mi], x, y, z);
    // O caixilho avança 5,5 cm: o corpo precisa respeitar também essa face.
    col(x-w/2-(x>0?.075:0),x+w/2+(x<0?.075:0),y,y+h,z-1.5,z+1.5);
    addBox(w + 0.22, 0.1, 3.22, MAT_ZINCO, x, y + h, z, { collide: false, skirt: false });
    addBox(0.05, 0.75, 0.95, MAT_VIDRO, x + (x < 0 ? w / 2 + 0.03 : -w / 2 - 0.03), y + 1.3, z, { collide: false, cast: false, skirt: false });
  }

  /* ===================== CASA DE ESQUINA DO PATAMAR ===================== */
  {
    const cy=RISE*2, cz=(P2.z0+P2.z1)/2;
    const anexo=new THREE.Group();anexo.userData.escadaoPatamarCover='alvenaria';root.add(anexo);
    const corpo=addBox(4.6,2.5,2.2,MAT_TIJOLO,-2.2,cy,cz);anexo.add(corpo);
    // Continuação da moradia oeste: guarda a massa de cobertura e libera a metade leste.
    anexo.add(addBox(4.6,.16,2.2,MAT_CIMENTO,-2.2,cy+2.34,cz,{collide:false,cast:false,skirt:false}));
    anexo.add(addBox(.025,1.7,1.1,PAREDES[1],.12,cy+.1,cz,{collide:false,cast:false,skirt:false}));
    anexo.add(addBox(.035,1.87,.78,MAT_PORTA,.145,cy+.1,cz,{collide:false,cast:false,skirt:false}));
    anexo.add(addBox(1.2,.9,.035,MAT_CIMENTO,-1.6,cy+1.2,cz+1.12,{collide:false,cast:false,skirt:false}));
    anexo.add(addBox(1.04,.72,.035,MAT_VIDRO,-1.6,cy+1.29,cz+1.14,{collide:false,cast:false,skirt:false}));
    for (const x of [-1.95,-1.6,-1.25]) detalhe(.035,.77,.035,MAT_FERRO,x,cy+1.27,cz+1.18);
  }

  /* ===================== BARRICADAS ===================== */
  // patamar 1: pneus
  const MAT_PNEU = lam({ color: 0x1a1a1a, roughness: 0.95 });
  propAt('pilha_pneus', -1.2, P1.z1-.75, 0.9, 1.6, 1.2, MAT_PNEU, 0, RISE);
  // base: portão arrancado
  addBox(2.5, 1.2, 0.8, lam({ color: 0x4a4a3a, roughness: 0.8 }), 1.5, 0, 14.5);

  /* ===================== BASE (rua) ====================== */
  /* Bar e mercadinho viram DUAS geminadas cada um: 6 m de frente com um molde só
     esticado viraria galpão; o volume que tampa a visão dos becos é o mesmo. */
  // bar de esquina (bloqueia visão do beco oeste)
  casa(-13.5, 32, 3, 4.6, 3.05, 0, 0, { molde: 'casa_favela_azul', pav: 1, ry: 0 });
  casa(-10.5, 32, 3, 4.6, 3.05, 2, 0, { molde: 'casa_favela_tijolo', pav: 1, ry: 0 });
  addBox(6, 0.8, 0.3, lam({ color: 0x8a4a2a }), -12, 3.05, 29.6, { collide: false });
  // mercadinho (bloqueia visão do beco leste)
  casa(10.5, 34, 3, 4.6, 3.05, 2, 0, { molde: 'casa_favela_tijolo', pav: 1, ry: 0 });
  casa(13.5, 34, 3, 4.6, 3.05, 0, 0, { molde: 'casa_favela_azul', pav: 1, ry: 0 });
  addBox(6, 0.8, 0.3, lam({ color: 0x2a6a4a }), 12, 3.05, 31.6, { collide: false });
  // BLOQUEIO CENTRAL: prédio entre a escada e o spawn (corta a linha de visão do escadão)
  casa(-5, 22, 4, 5, 5.9, 1, 0, { molde: 'casa_favela_tijolo', pav: 2, ry: 0.017 });
  casa(5, 22, 4, 5, 5.9, 0, 0, { molde: 'casa_favela_azul', pav: 2, ry: -0.026 });

  /* ---- LAJE SOBRE A BOCA DO ESCADÃO (abrigo do spawn E; BUG-32, régua escadao-rota) ----
     Invariante: NÃO é piso — `groundHeightAt` não a conhece, senão vira plataforma sem saída. */
  {
    const LAJE_Z = 15.5, LAJE_D = 2.6, LAJE_W = 17.2, LAJE_Y = 2.35, LAJE_H = 0.40;
    const marca = (m) => { m.userData.escadaoAbrigo = true; return m; };
    // pilotis: 4 pilares deixam 7,2 m de vão central e 4,1 m de cada lado — a rua continua
    // larga o bastante para o spawn sair sem funil.
    for (const px of [-8.2, -3.6, 3.6, 8.2])
      marca(addBox(0.5, LAJE_Y, 0.5, MAT.concreteDark, px, 0, LAJE_Z));
    // O último 1,20 m vira passagem vertical para a casa frontal: a laje ainda
    // protege o respawn, mas não fecha a nova entrada alta como uma parede invisível.
    const lajeMinX = (1.35 - LAJE_W / 2) / 2 - (LAJE_W / 2 + 1.35) / 2;
    const acessoAltoX = .15;
    marca(addBox(acessoAltoX - lajeMinX, LAJE_H, LAJE_D, MAT.concrete, (lajeMinX + acessoAltoX) / 2, LAJE_Y, LAJE_Z));
    const piso = LAJE_Y + LAJE_H;
    // Shell procedural autoritativo (PR 529): o molde fechado `escadao_casa_r3`
    // selava a casa tática. Régua: `eval:escadao-casa-central`.
    for (const [x, w, h, mat] of [[-5.975, 5.25, 3.1, MAT_TIJOLO], [-1, 4.7, 2.85, MAT_CIMENTO]]) {
      for (const dz of [-1, 1]) {
        const frente = LAJE_Z + dz * (LAJE_D / 2);
        const faceEscada = x === -1 && dz === -1;   // geminada leste: face da boca do escadão
        if (faceEscada) {
          // Janela REAL para a escada: peitoril e verga sólidos, vão livre de tiro
          // (x -2,2..-0,7, banda de 1,2 m). Fecha fora da abertura, do piso ao teto.
          marca(addBox(1.15, h, .25, mat, -2.775, piso, frente - dz * .125, { vao: false }));
          marca(addBox(.8, h, .25, mat, -.3, piso, frente - dz * .125, { vao: false }));
          marca(addBox(1.5, 1, .25, mat, -1.45, piso, frente - dz * .125, { vao: false }));
          marca(addBox(1.5, h - 2.2, .25, mat, -1.45, piso + 2.2, frente - dz * .125, { vao: false }));
          detalhe(1.7, .09, .18, MAT_CIMENTO, -1.45, piso + 1, frente + dz * .075);
          detalhe(1.7, .09, .18, MAT_CIMENTO, -1.45, piso + 2.2, frente + dz * .075);
          // Porta da passarela: entrada alta vinda do PATAMAR 1, na borda leste.
          marca(addBox(1.25, h - 2.1, .25, mat, .725, piso + 2.1, frente - dz * .125, { vao: false }));
        } else marca(addBox(w, h, .25, mat, x, piso, frente - dz * .125, { vao: false }));
        for (const dx of (faceEscada ? [] : [-w * .24, w * .24])) {
          const wx = x + dx, wy = piso + 1.0;
          detalhe(1.34, 1.28, .08, MAT_CIMENTO, wx, wy - .08, frente + dz * .045);
          detalhe(1.18, 1.1, .06, MAT_VIDRO, wx, wy, frente + dz * .10);
          for (const barra of [-.39, 0, .39])
            detalhe(.035, 1.1, .035, MAT_FERRO, wx + barra, wy, frente + dz * .15);
          detalhe(1.18, .035, .035, MAT_FERRO, wx, wy + .55, frente + dz * .15);
          detalhe(1.42, .09, .18, MAT_CIMENTO, wx, wy - .12, frente + dz * .075);
        }
        for (const dx of [-w / 2 + .09, w / 2 - .09])
          detalhe(.18, h, .04, MAT_CIMENTO, x + dx, piso, frente + dz * .025);
      }
      for (const dx of [-w / 2 + .125, w / 2 - .125]) {
        const wx = x + dx;
        // Vão na parede compartilhada das geminadas: a casa central se alcança
        // pela passarela sem cruzar fachada opaca (mesmo perfil do vão da casa frontal).
        const entreGeminadas = Math.abs(wx + 3.35) < .3;
        if (x === -1 && dx > 0) {
          marca(addBox(.25, h, 1.05, mat, wx, piso, 16.025, { vao: false }));
          marca(addBox(.25, h - 2.1, 1.1, mat, wx, piso + 2.1, 14.95, { vao: false }));
        } else if (entreGeminadas) {
          marca(addBox(.25, h, 1.05, mat, wx, piso, 16.025, { vao: false }));
          marca(addBox(.25, h - 2.1, 1.1, mat, wx, piso + 2.1, 14.95, { vao: false }));
        } else marca(addBox(.25, h, LAJE_D - .5, mat, wx, piso, LAJE_Z, { vao: false }));
      }
      marca(addBox(w + .12, .14, LAJE_D + .16, MAT_CIMENTO, x, piso + h, LAJE_Z, { vao: false }));
      detalhe(w - .2, .23, .14, mat, x, piso + h + .14, LAJE_Z + LAJE_D / 2 - .12);
    }
    // Cauda da geminada leste sem laje era o vazio de piso visto pela porta da
    // passarela; complementa sem tocar a passagem vertical da casa frontal.
    marca(addBox(.35, LAJE_H, LAJE_D, MAT.concrete, .325, LAJE_Y, LAJE_Z));
    marca(addBox(1.2, LAJE_H, 1.7, MAT.concrete, .75, LAJE_Y, LAJE_Z + .45));
  }
  buildEscadaoHome({ addBox, occluders, wall: PAREDES[1], concrete: MAT_CIMENTO, dark: MAT.concreteDark, metal: MAT_FERRO, glass: MAT_VIDRO });
  buildEscadaoDetails({ root, addBox, occluders, enabled: GLB_ON });
  // A casa nova fecha a saída sul deste recuo. Sua fundação agora completa o volume
  // entre moradias; não deixa um bolsão térreo sem saída nem um nó de bot isolado.
  addBox(3.3, 3.05, 14.2-CONEX.z1, MAT.concreteDark, 7.15, 0, (14.2+CONEX.z1)/2);
  // Fecha os vazios térreos sem entrada sob as moradias oeste. A circulação fica
  // no beco/auxiliar em sua cota real; bots não recebem destinos dentro da fundação.
  addBox(8,RISE,8.5,MAT.concreteDark,-6,0,-1.2);
  // O objetivo PATAMAR 2 conserva x/z e ganha piso na mesma cota do lance
  // auxiliar oeste, com acesso contínuo até a cobertura central.
  addBox(X0-(AUX_X+AUX_W/2),RISE*2,P2.z1-P2.z0,MAT_CIMENTO,
    (X0+AUX_X+AUX_W/2)/2,0,(P2.z0+P2.z1)/2);
  for(const z of [P2.z0+.12,P2.z1-.12])
    addBox(X0-(AUX_X+AUX_W/2),1.05,.24,MAT_GUARDA,(X0+AUX_X+AUX_W/2)/2,RISE*2,z);
  // GLB com cadeiras ocupa 2,124 m; proxy de 1,2 m deixava o corpo atravessar (EV3).
  for (const [mx, mz] of [[-9, 29], [-7, 30]]) propAt('mesa_guardasol', mx, mz, 2.3, 2.13, 2.13, lam({ color: 0xcca060 }));
  // carros
  for (const [cx, cz, cry] of [[7, 30, 0.1], [-7, 36, -0.05]])
    propAt('fusca', cx, cz, 1.4, 1.8, 4.0, lam({ color: cry > 0 ? 0x8a2020 : 0x202060, roughness: 0.3, metalness: 0.5 }), cry);

  /* ===================== TOPO (mirante) =====================
     Spawn B precisa de cobertura contra tiros da escada. */
  // Caixa d'água Tripo PBR: o proxy mantém o mesmo cover e é fallback se o GLB não carrega.
  propAt('caixa_dagua', -12, -32, 3.0, 2.5, 2.5,
    lam({ color: 0x1a1a1a, roughness: 0.8 }), 0, H_TOP);
  /* Varais reais do acervo: roupa é silhueta leve no horizonte, nunca cover nem occluder. */
  const varal = (id, x, z, h, ry = 0, y = H_TOP) => {
    const o = GLB_ON ? placeProp(id, { x, y, z, targetH: h, ry }) : null;
    if (o) {
      o.userData.escadaoVaral = id;
      o.traverse((m) => { if (m.isMesh) m.userData.nonSolidSurface = true; });
      root.add(o);
      return;
    }
    const linha = new THREE.Mesh(new THREE.BoxGeometry(2.7, .035, .035), lam({ color: 0x1a1817, roughness: 1 }));
    linha.position.set(x, y + h * .72, z); linha.rotation.y = ry; linha.userData.escadaoVaral = id;
    // Sem esta marca a corda vira "corpo dentro de sólido" no MAP1 (o ponto de 1,098 m).
    linha.userData.nonSolidSurface = true;
    root.add(linha);
    for (const dx of [-.75, 0, .75]) {
      const roupa = new THREE.Mesh(new THREE.BoxGeometry(.35, .52, .035), [PAREDES[0], PAREDES[2], PAREDES[3]][Math.round((dx + 1) * 2) % 3]);
      roupa.position.set(x + Math.cos(ry) * dx, y + h * .48, z - Math.sin(ry) * dx); roupa.rotation.y = ry; roupa.userData.nonSolidSurface = true; root.add(roupa);
    }
  };
  // Varais apoiados nas lajes das casas: roupas fora da circulação do armário do spawn.
  varal('varal_roupas_01', -12, -26, 1.5, .12, H_TOP + 3.05);
  varal('varal_roupas_02', 12, -27, 1.45, -Math.PI / 2, H_TOP + 3.05);
  /* Varal do kit Mint fora do mirante: dois becos e duas lajes baixas, sem colisor
     (roupa é silhueta, nunca cover). Cobrado por `eval:escadao-contract`. */
  varal('varal_roupas', -14.2, 12.6, 1.55, -Math.PI / 2, 0);
  varal('varal_roupas', 14.1, 12.9, 1.5, Math.PI / 2, 0);
  varal('varal_roupas', -14.2, 6.6, 1.5, -Math.PI / 2, RISE);
  varal('varal_roupas', 6.2, 9.8, 1.45, -.08, RISE);
  // barraco de obra (cover)
  casa(12, -33, 5, 4, 3.05, 3, H_TOP, { molde: 'casa_favela_azul', pav: 1, ry: 0.024 });
  // cobertura lateral preserva a visada do spawn para o cartão-postal central
  casa(-7, -24, 4.2, 4.2, 3.1, 1, H_TOP, { molde: 'casa_favela_tijolo', pav: 1, ry: -0.021 });
  casa(7, -24, 4.2, 4.2, 3.1, 0, H_TOP, { molde: 'casa_favela_azul', pav: 1, ry: 0.033 });
  casa(-12, -26, 4.2, 4.2, 3.05, 0, H_TOP, { molde: 'casa_favela_tijolo', pav: 1, ry: 0.015 });
  casa(12, -27, 4.2, 4.2, 3.05, 1, H_TOP, { molde: 'casa_favela_azul', pav: 1, ry: -0.028 });
  // O centro do mirante era piso sem decisão. Este abrigo recebe a subida por duas
  // portas opostas e abre a janela somente para a descida, não para os slots B.
  {
    const y = H_TOP, z = -21.5, tag = mesh => { mesh.userData.escadaoMiranteAbrigo = true; return mesh; };
    const abrigoBox = (...args) => tag(addBox(...args));
    addFloor(4.4, 3.6, 0, z, MAT.concrete, y + .02);
    abrigoBox(4.4, 1.1, .25, MAT_TIJOLO, 0, y, z + 1.8 - .125);
    abrigoBox(1.6, 1.1, .25, MAT_TIJOLO, -1.4, y + 1.1, z + 1.8 - .125);
    abrigoBox(1.6, 1.1, .25, MAT_TIJOLO, 1.4, y + 1.1, z + 1.8 - .125);
    abrigoBox(4.4, 1.0, .25, MAT_TIJOLO, 0, y + 2.2, z + 1.8 - .125);
    abrigoBox(4.4, 3.2, .25, MAT_CIMENTO, 0, y, z - 1.8 + .125);
    for (const x of [-2.2, 2.2]) {
      abrigoBox(.25, 3.2, .8, MAT_CIMENTO, x, y, z - 1.4);
      abrigoBox(.25, 3.2, .8, MAT_CIMENTO, x, y, z + 1.4);
      abrigoBox(.25, .9, 2, MAT_CIMENTO, x, y + 2.3, z);
    }
    abrigoBox(4.65, .18, 3.85, MAT_CIMENTO, 0, y + 3.2, z);
  }
  // muretas de mirante (cover agachado), afastadas dos slots centrais de spawn
  for (const [mx, mz] of [[6, -38], [-6, -38], [9, -22], [-9, -22]])
    addBox(2.0, 1.0, 0.5, MAT.concrete, mx, H_TOP, mz);
  // antena
  addBox(0.08, 4.0, 0.08, lam({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.3 }), 6, H_TOP, -30, { collide: false });

  /* Cobertura rala nas bordas: três peças baixas por quadrante mantêm a MAP5 sem transformar
     o mirante e a rua em depósito. No browser entram os GLBs; node e ?glb=0 usam o volume. */
  for (const [x, z, id] of [
    [-14, -36, 'pilha_pneus'], [-14, -29, 'dumpster'], [-14, -22, 'pilha_pneus'],
    [14, -36, 'dumpster'], [14, -30, 'pilha_pneus'], [14, -22, 'dumpster'],
    [-7, -29, 'pilha_pneus'], [-4.5, -20, 'dumpster'], [7, -29, 'dumpster'], [4.5, -20, 'pilha_pneus'], [4, -14, 'dumpster'],
    [-14, -15, 'dumpster'], [-14, -11, 'pilha_pneus'], [-14, -6, 'pilha_pneus'], [-14, 5, 'dumpster'], [-14, 13, 'pilha_pneus'],
    [14, -15, 'pilha_pneus'], [14, -11, 'dumpster'], [14, -6, 'dumpster'], [14, 5, 'pilha_pneus'], [14, 13, 'dumpster'],
    [-14, 24, 'pilha_pneus'], [-14, 31, 'dumpster'], [-14, 37, 'pilha_pneus'],
    [3, 36, 'pilha_pneus'], [14, 24, 'dumpster'], [14, 31, 'pilha_pneus'], [14, 37, 'dumpster'],
  ]) {
    const y = groundHeightAt(x, z);
    propAt(id, x, z, id === 'dumpster' ? 1.3 : 1.0, id === 'dumpster' ? 1.3 : 1.4,
      id === 'dumpster' ? 2.2 : 1.4, id === 'dumpster' ? MAT.concreteDark : MAT_PNEU, 0, y);
  }

  // Ramais ancorados nas fachadas acompanham a subida; arcos suaves substituem os
  // seis V soltos no céu. Lotes sem sombra e sem colisão mantêm o corpo e a mira livres.
  const MAT_FIO = new THREE.MeshBasicMaterial({ color: 0x242323, fog: true });
  const MAT_FIO_DISTANTE = new THREE.LineBasicMaterial({ color: 0x242323, fog: true });
  const cabos = new InstBatch({ bucket: 8 }), caboGeo = new THREE.CylinderGeometry(1, 1, 1, 5);
  const caboPose = new THREE.Object3D(), eixoCabo = new THREE.Vector3(0, 1, 0);
  const fiacao = new THREE.Group(); fiacao.name = 'escadao_fiacao'; root.add(fiacao);
  const ramais = [];
  const fio = (a, b, queda = .25, raio = .011) => {
    // Abaixo de 4 cm de diâmetro os ramais distantes viravam pontos no frame 3:2.
    raio = Math.max(raio, Math.hypot(b[0]-a[0],b[2]-a[2]) > 12 ? .025 : .020);
    ramais.push({ a, b, queda, raio });
    // Travessias e alimentadores precisam de cobertura contínua de um pixel:
    // cilindros subpixel perdiam fragmentos no beco e na vista distante do mirante.
    const linha = Math.hypot(b[0]-a[0],b[2]-a[2]) > 12 || a[0]*b[0] < 0;
    const pontos = [new THREE.Vector3(...a)];
    let anterior = new THREE.Vector3(...a);
    for (let i = 1; i <= 10; i++) {
      const t = i / 10;
      const atual = new THREE.Vector3(a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t-4*queda*t*(1-t), a[2]+(b[2]-a[2])*t);
      pontos.push(atual);
      const v = atual.clone().sub(anterior);
      caboPose.position.copy(anterior).add(atual).multiplyScalar(.5);
      caboPose.quaternion.setFromUnitVectors(eixoCabo, v.clone().normalize());
      caboPose.scale.set(raio, v.length(), raio);
      if (!linha) cabos.add(caboGeo, MAT_FIO, caboPose, null, { cast: false });
      anterior = atual;
    }
    if (linha) fiacao.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pontos), MAT_FIO_DISTANTE));
  };
  for (const lado of [-1, 1]) {
    const pontos = [[lado*2.07,4.6,12.8],[lado*2.07,6.4,5],[lado*2.07,8.5,-3.7]];
    for (let j=0;j<pontos.length-1;j++) for (let n=0;n<3;n++) {
      const a=pontos[j].map((v,k)=>v+(k===1?n*.065:0)), b=pontos[j+1].map((v,k)=>v+(k===1?n*.065:0));
      fio(a,b,.22+n*.035);
    }
    for (const [x,y,z] of pontos) {
      detalhe(.19,.06,.16,MAT_FERRO,lado*2.16,y,z);
      detalhe(.08,.24,.08,MAT_CIMENTO,x,y,z);
    }
  }
  // Ligações transversais ficam acima dos jogadores; o restante corre junto à parede.
  for (const [z,y] of [[11.8,5.3],[3.7,7.1],[-4.1,9.5]]) {
    fio([-2.1,y,z],[2.1,y+.10,z-.18],.30,.013);
    fio([-2.1,y+.12,z],[2.1,y+.22,z-.18],.34,.009);
  }
  for (const [a,b] of [
    [[-15,5.8,32],[15,6.1,34]], [[-15,6.5,12],[-2.1,5.0,12.8]],
    [[15,6.6,12],[2.1,5.0,12.8]], [[-14,H_TOP+5,-27],[14,H_TOP+5.2,-27]],
    [[-14,H_TOP+5.4,-36],[14,H_TOP+5.1,-34]],
  ]) {
    for (const [x,y,z] of [a,b]) if (Math.abs(x) >= 14) {
      const base = groundHeightAt(x,z), h = y-base+.35;
      addBox(.16,h,.16,MAT_CIMENTO,x,base,z,{vao:false});
      detalhe(.36,.08,.12,MAT_FERRO,x,y+.08,z);
      detalhe(.07,.28,.07,MAT_CIMENTO,x,y-.04,z);
    }
    for (let n=0;n<2;n++) fio(a.map((v,k)=>v+(k===1?n*.11:0)),b.map((v,k)=>v+(k===1?n*.11:0)),.45,.012);
  }
  cabos.build(fiacao);
  fiacao.userData.escadaoRamais = ramais;
  fiacao.traverse(m=>{ if(m.isMesh) m.userData.nonSolidSurface=true; });

  /* ===================== MUROS DE CONTENÇÃO ===================== */
  for (const sx of [-HALF_X, HALF_X]) {
    col(sx - 0.25, sx + 0.25, 0, H_TOP + 2, -HALF_Z, HALF_Z);
    // A contenção continua física, mas deixa de ser um plano único de concreto: módulos
    // pintados, alturas variadas e telhas recortam a borda como uma fileira de fachadas.
    for (let z = -18; z <= 18; z += 6) {
      const i = Math.round((z + 18) / 6), h = 3.2 + (i % 3) * 0.85;
      // dentro do collider da contenção: a face visível tem que parar a bala (BUG-54)
      occluders.push(addBox(0.42, h, 5.55, PAREDES[(i + (sx > 0 ? 1 : 0)) % PAREDES.length], sx, 0, z, { collide: false }));
      addBox(0.62, 0.1, 5.75, MAT_ZINCO, sx, h, z, { collide: false, skirt: false });
      addBox(0.05, 0.82, 1.05, MAT_VIDRO, sx - Math.sign(sx) * 0.24, 1.42, z - 1.25, { collide: false, cast: false, skirt: false });
      addBox(0.05, 1.92, 0.86, MAT_PORTA, sx - Math.sign(sx) * 0.24, 0.04, z + 1.35, { collide: false, cast: false, skirt: false });
    }
  }
  // Parapeitos do mirante: toda aresta com queda de um andar ganha malha e collider. Só a
  // largura real do último lance permanece aberta no lado sul.
  const topoD = TOP_Z + HALF_Z, topoCz = (-HALF_Z + TOP_Z) / 2;
  for (const sx of [-HALF_X, HALF_X]) addBox(0.48, 1.25, topoD, MAT.concrete, sx, H_TOP, topoCz);
  addBox(HALF_X * 2, 1.25, 0.48, MAT.concrete, 0, H_TOP, -HALF_Z);
  col(-HALF_X - 0.5, HALF_X + 0.5, 0, H_TOP + 2, -HALF_Z - 0.25, -HALF_Z + 0.25);
  for (let x = -15; x <= 15; x += 6) {
    const h = H_TOP + 0.8 + ((x + 15) / 6 % 2) * 1.2;
    // idem: face visível dentro do collider do fundo vira occluder (BUG-54)
    occluders.push(addBox(5.6, h, 0.42, PAREDES[Math.abs(x / 3) % PAREDES.length], x, 0, -HALF_Z, { collide: false }));
    addBox(5.8, 0.1, 0.62, MAT_ZINCO, x, h, -HALF_Z, { collide: false, skirt: false });
  }
  addBox(HALF_X * 2 + 1, 2, 0.5, MAT.concrete, 0, 0, HALF_Z);
  // muro do mirante (lado escada) com um único vão de 5 m, exatamente o acesso do lance.
  // Oeste tem dois trechos porque o flanco auxiliar também chega ao mirante.
  addBox(1.8, 1.2, 0.4, MAT_GUARDA, -14.4, H_TOP, TOP_Z);
  for(const x of [-17.75,17.75])addBox(.5,1.2,.4,MAT_GUARDA,x,H_TOP,TOP_Z);
  addBox(10.5 + X0, 1.2, 0.4, MAT_GUARDA, (-10.5 + X0) / 2, H_TOP, TOP_Z);
  const guardaTopoW = 15.3 - X1;
  addBox(guardaTopoW, 1.2, 0.4, MAT_GUARDA, (X1 + 15.3) / 2, H_TOP, TOP_Z);

  buildEscadaoContour({root,colliders,occluders,concrete:MAT.concreteDark,guard:MAT_GUARDA});

  /* ===================== GROUND HEIGHT (multinível) ===================== */
  function rampHeight(z, z1, yBase) {
    return Math.min(yBase + RISE, yBase + ESC.espelho / 2 + RISE * Math.max(0, Math.min(1, (z1 - z) / RUN)));
  }
  function becoRampHeight(z) {
    return RISE * Math.max(0, Math.min(1, (B_STAIR.z1 - z) / (B_STAIR.z1 - B_STAIR.z0)));
  }
  function inBeco(x) {
    return (x >= BW.x0 && x <= BW.x1) || (x >= BE.x0 && x <= BE.x1);
  }
  function inConexao(x) {
    // plataforma de conexão beco → patamar 1
    return (x >= BW.x1 && x <= X0) || (x >= X1 && x <= BE.x0);
  }
  function groundHeightAt(x, z, yRef) {
    const contour = contourHeight(x,z);
    if(contour!==undefined)return contour;
    const underLanding = (x >= X0 && x <= X1 && z >= P1.z0 && z <= P1.z1)
      || (inConexao(x) && z >= CONEX.z0 && z <= CONEX.z1)
      || (inBeco(x) && z >= CONEX.z0 && z < B_STAIR.z0);
    if (underLanding && yRef != null && yRef + .3 < RISE) return 0;
    const houseFloor = escadaoHomeGround(x, z);
    if (houseFloor !== undefined) return houseFloor;
    // Interiores das geminadas (PR 529): na laje pisa-se 2,75; na rua embaixo
    // continua 0 — mesma regra do underLanding.
    if (x >= -8.6 && x <= 1.35 && z >= 14.2 && z <= 16.8) {
      if (yRef == null || yRef + .3 >= 2.75) return 2.75;
      return 0;
    }
    if (z <= TOP_Z) return H_TOP;
    if (x >= AUX_X - AUX_W / 2 && x <= AUX_X + AUX_W / 2) {
      if (z >= AUX_F3.z0 && z <= AUX_F3.z1) return rampHeight(z, AUX_F3.z1, RISE * 2);
      if (z >= AUX_P2.z0 && z <= AUX_P2.z1) return RISE * 2;
      if (z >= AUX_F2.z0 && z <= AUX_F2.z1) return rampHeight(z, AUX_F2.z1, RISE);
    }
    if (z >= P2.z0 && z <= P2.z1 && x >= AUX_X + AUX_W/2 && x <= X1 + 0.5) return RISE * 2;
    if (inBeco(x) && z >= B_STAIR.z0 && z <= B_STAIR.z1) return becoRampHeight(z);
    if (inBeco(x) && z >= CONEX.z0 && z < B_STAIR.z0) return RISE;
    // A conexão vai até a testa da chegada do beco (CONEX.z0), não só até P1.z0: é isso que
    // dá frente comum de 2,2 m entre a laje do beco e a plataforma, na mesma cota.
    if (inConexao(x) && z >= CONEX.z0 && z <= CONEX.z1) return RISE;
    if (z >= P1.z0 && z <= P1.z1) {
      if (x >= X0 && x <= X1) return RISE;   // patamar 1 propriamente dito
      return 0;
    }
    if (x >= X0 && x <= X1) {
      if (z >= F3.z0 && z <= F3.z1) return rampHeight(z, F3.z1, RISE * 2);
      if (z >= F2.z0 && z <= F2.z1) return rampHeight(z, F2.z1, RISE);
      if (z >= F1.z0 && z <= F1.z1) return rampHeight(z, F1.z1, 0);
    }
    return 0;
  }

  /* ===================== WAYPOINTS + A* ===================== */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf, yRef) => {
    if (insideSolid(x, z, inf)) return true;
    const g = groundHeightAt(x, z, yRef);
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.5 && c.maxY > g + 0.3) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });

  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.38) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  // escada central: 3 colunas paralelas dentro da largura de 5 m
  for (const xl of [-1.5, 0, 1.5]) {
    linha(xl, F1.z1, xl, F1.z0, 0.9);
    linha(xl, F2.z1, xl, F2.z0, 0.9);
    linha(xl, F3.z1, xl, F3.z0, 0.9);
  }
  linha(AUX_X, AUX_F2.z1, AUX_X, AUX_F2.z0, 0.6);
  linha(AUX_X, AUX_P2.z1, AUX_X, AUX_P2.z0, 0.9);
  linha(AUX_X, AUX_F3.z1, AUX_X, AUX_F3.z0, 0.6);
  linha(AUX_X,1.5,-5.8,1.5,.6);
  // patamares: cruzeta de um lado ao outro
  linha(-2.5, P1.z1, 2.5, P1.z0, 1.2);
  linha(-2.5, P2.z1, 2.5, P2.z0, 1.2);
  // Porta alta da casa frontal: do patamar 1 pela passarela, sem usar o acesso da rua.
  linha(.3, P1.z1 - .4, .9, P1.z1 - .4, .45);
  linha(.9, P1.z1 - .4, .9, 14.9, .55);
  // Interior das geminadas da laje (PR 529): entra pela porta da casa frontal, na
  // fresta z 14,8–15,1 entre as paredes, e corre até a geminada oeste pelos vãos.
  linha(1.45, 14.94, 4.4, 15.0, .5);
  linha(1.45, 14.94, -5.975, 15.05, .45);
  // becos: escada própria + conexão ao patamar 1. A rota é cotovelada porque a reta
  // beco → patamar corta muros e o `blocked` derrubava os nós do meio.
  const CONEX_Z = CONEX.z0 + 0.9, P1_MEIO = (P1.z0 + P1.z1) / 2;
  const rotaBeco = (bx, mx, alvo) => {
    linha(bx, 14, bx, B_STAIR.z0, 1.0);
    linha(bx, B_STAIR.z0, bx, CONEX_Z, 0.8);
    linha(bx, CONEX_Z, mx, CONEX_Z, 1.2);        // frente comum: única cota onde as lajes se encostam
    linha(mx, CONEX_Z, mx, P1_MEIO, 1.2);
    linha(mx, P1_MEIO, alvo, P1_MEIO, 1.2);      // entra pelo vão da mureta do patamar 1
  };
  rotaBeco(-12, -6, X0);
  rotaBeco(12, 8, X1);   // desvio leste contorna a fundação da casa
  linha(15.75,26,15.75,6.75,.75);
  linha(15.75,6.75,15.25,4.25,.5);
  linha(15.25,4.25,15,1,.5);
  linha(15,1,15,-4,.75);
  // Liga o fundo da rua pelo vão entre as moradias e o carro.
  linha(-8.5, 26, -8.5, 38, 0.8);
  linha(9.2, 24, 9.2, 16, .4);
  linha(9.2, 16, 7, 16, .4);
  // base
  for (const bz of [20, 26, 32, 37]) linha(-15, bz, 15, bz, 3.0);
  // topo
  for (const bz of [-22, -28, -34, -38]) linha(-15, bz, 15, bz, 3.0);
  // bordas e cantos do topo (cobertura MAP5: sem estes os quadrantes das quinas ficam vazios)
  linha(-16.5, -38, 16.5, -38, 3.0);
  linha(-16.5, -10, -16.5, -38, 3.0);
  linha(16.5, -10, 16.5, -38, 3.0);
  // bordas da base
  linha(-16.5, 20, -16.5, 38, 3.0);
  linha(16.5, 20, 16.5, 38, 3.0);
  linha(-16.5, 38, 16.5, 38, 3.0);

  for(const side of [-1,1])linha(side*ESCADAO_CONTOUR.x,8,side*ESCADAO_CONTOUR.x,-8,.5);
  for (const n of nodes) n.y = groundHeightAt(n.x,n.z);
  const lowerRoute = [[-6,19],[-6,11],[-6,8.5],[8,8.5],[8,6.22],[15.75,6.22],[15.75,20]];
  for(let k=1;k<lowerRoute.length;k++) {
    const [ax,az]=lowerRoute[k-1],[bx,bz]=lowerRoute[k],steps=Math.ceil(Math.hypot(bx-ax,bz-az)/.6);
    for(let i=0;i<=steps;i++) {
      const x=ax+(bx-ax)*i/steps,z=az+(bz-az)*i/steps;
      if(!blocked(x,z,.38,0)&&groundHeightAt(x,z,0)===0)nodes.push({x,y:0,z});
    }
  }
  const segClear = (a, b) => {
    const steps = Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));
    let previous = a.y;
    for (let i=1;i<=steps;i++) {
      const t=i/steps, x=a.x+(b.x-a.x)*t, z=a.z+(b.z-a.z)*t, y=groundHeightAt(x,z,previous);
      if (blocked(x,z,.38,previous) || Math.abs(y-previous)>.3) return false;
      previous=y;
    }
    return Math.abs(previous-b.y)<.3;
  };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z, yRef) { const y=yRef ?? groundHeightAt(x,z); let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, dy=nodes[i].y-y, d = dx * dx + dz * dz + dy * dy * 16; if (d < bd) { bd = d; b = i; } } return b; }
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
    E: [-2.4, -0.8, 0.8, 2.4].map(x => ({ x, z: 26, yaw: 0 })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -34, yaw: Math.PI })),
  };

  /* ===================== CTF — 4 BANDEIRAS =====================
     Alternadas em x: CTF1 pede altura de triângulo ≥ raio de captura (4,5 m). */
  const ctfPoints = [
    { id: 'R', label: 'MIRANTE',     x: 7,   z: -25 },
    { id: 'E', label: 'PATAMAR 2',   x: -7,  z: 1.5 },
    { id: 'P', label: 'PATAMAR 1',   x: 7,   z: 9 },
    { id: 'B', label: 'RUA',         x: -7,  z: 28 },
  ];

  /* ===================== ARSENAL NO CHÃO ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.userData.nonSolidSurface = true; m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  place('ak', 6, 30);       place('shotgun', -9, 32);
  place('mp5', 10, 36);     place('deagle', -10, 38);
  place('m4', 1.5, (P1.z0 + P1.z1) / 2); place('shotgun', 1.5, (P2.z0 + P2.z1) / 2);
  place('mp5', 0, TOP_Z - 2); place('awp', -6, -22);
  place('m400', 7, -28);    place('ak', 0, -33);
  place('deagle', 10, -25); place('mp5', 0.6, (P1.z0 + P1.z1) / 2);
  place('mp5', 1.8, (P1.z0 + P1.z1) / 2);

  const placa = (texto, x, y, z, largura, ry = 0) => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e1d4b9'; ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = '#493f32'; ctx.font = 'bold 42px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(texto, 256, 63);
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(largura, largura * 96 / 512), lam({ map: tex }));
    m.name = 'placa_comercio'; m.position.set(x, y, z); m.rotation.y = ry; m.userData.nonSolidSurface = true; root.add(m);
  };
  placa('BAR DO PATAMAR', -12, 3.45, 29.42, 4.8, Math.PI);
  placa('MERCEARIA DA SUBIDA', 12, 3.45, 31.42, 4.8, Math.PI);
  placa('BECO DAS PLANTAS', -13.64, 4.95, 8.0, 1.85, Math.PI / 2);
  placa('BECO DO VARAL', 13.64, 4.95, 8.0, 1.85, -Math.PI / 2);
  // Samambaia e mato rasteiro são GLBs Mint do acervo documentado em FONTE.md.
  // Repetições viram instâncias por setor, sem sombra; folhas não são cobertura sólida.
  const folhas = new InstBatch({ bucket: 8 }), vasos = new InstBatch();
  const vegetacao = new THREE.Group(); vegetacao.name = 'escadao_vegetacao'; root.add(vegetacao);
  const plantios = [];
  const folhaForma = new THREE.Shape(); folhaForma.moveTo(0,0);
  folhaForma.quadraticCurveTo(-.15,.38,0,.75); folhaForma.quadraticCurveTo(.15,.38,0,0);
  const folhaGeo = new THREE.ShapeGeometry(folhaForma,6), vasoGeo = new THREE.CylinderGeometry(.22,.16,.32,12);
  const folhaMat = lam({ color: 0x596c3f, side: THREE.DoubleSide }), vasoMat = lam({ color: 0x947359 });
  const pose = new THREE.Object3D();
  const plantar = (id,x,y,z,h,ry) => {
    const o=GLB_ON ? placeProp(id,{x,y,z,targetH:h,ry}) : null;
    plantios.push({id,x,y,z,h,source:o?'mint-glb':'fallback'});
    if(o) {
      o.updateMatrixWorld(true);
      o.traverse(m=>{if(m.isMesh) folhas.add(m.geometry,m.material,m.matrixWorld,null,{cast:false});});
    } else for(let i=0;i<5;i++) {
      pose.position.set(x,y,z);pose.rotation.set(.35,i*Math.PI*.4+ry,.18);pose.scale.setScalar(h/.75);
      folhas.add(folhaGeo,folhaMat,pose,null,{cast:false});
    }
  };
  for (const [x,y,z] of [[-13.65,2.8,8.8],[-13.65,4.2,7.2],[-2.0,groundHeightAt(0,5)+2.05,5],
    [2.0,groundHeightAt(0,-3.7)+2.05,-3.7],[-7,H_TOP+2.1,-21.85],[7,H_TOP+2.1,-21.85]]) {
    addBox(.48,.06,.48,MAT_ZINCO,x,y-.2,z,{collide:false,cast:false,skirt:false});
    pose.position.set(x,y,z);pose.rotation.set(0,0,0);pose.scale.set(1,1,1);vasos.add(vasoGeo,vasoMat,pose,null,{cast:false});
    plantar('samambaia',x,y+.16,z,.52,z);
  }
  // Mato de 12–18 cm nos encontros com a parede, sem encobrir pés ou bordas do degrau.
  let tufo=0;
  for (const f of [F1,F2,F3]) for (const [n,lado] of [[2,-1],[6,1],[10,-1]]) {
    if(LOWQ && n===6) continue;
    const x=lado*1.72,z=f.z1-(n+.7)*ESC.piso;
    const base=f===F1?0:f===F2?RISE:RISE*2;
    plantar('grama_corrego_02',x,base+(n+1)*ESC.espelho+.005,z,.14+(tufo%3)*.02,tufo++*1.9);
  }
  for (const [x,z] of [[-13.6,12.2],[13.6,11.8],[-13.6,9.1],[13.6,8.7],[-8.5,16.8],[8.5,16.8]]) {
    if(LOWQ && z<10) continue;
    plantar('grama_corrego_02',x,groundHeightAt(x,z)+.02,z,.16,tufo++*1.9);
  }
  vegetacao.userData.escadaoPlantios=plantios;
  for (const [x, z, h] of [[-7.1, -7.4, 3.0], [7.3, -9.1, 2.6]]) {
    const frente = z - 1.52;
    addBox(.85, 2.0, .035, MAT_PORTA, x - .55, H_TOP + .04, frente, { collide: false, cast: false, skirt: false });
    addBox(.75, .75, .04, MAT_VIDRO, x + .55, H_TOP + 1.25, frente - .01, { collide: false, cast: false, skirt: false });
    addBox(2.3, .07, .55, MAT_ZINCO, x, H_TOP + h - .12, frente - .2, { collide: false, cast: false, skirt: false });
  }
  // Solo visual sob o casario externo: fecha o vazio de céu além da arena.
  addFloor(HALF_X * 2 + 40, HALF_Z * 2 + 40, 0, 0, MAT.dirt, -.05);
  const bairro = new InstBatch();
  const blocoGeo = new THREE.BoxGeometry(1, 1, 1);
  // Construções geminadas fora da arena: bairro contínuo, com lajes escalonadas.
  // A circulação e os abrigos do mirante ficam livres; estes volumes estão além dos limites.
  const quarteirao = [];
  for (const lado of [-1,1]) for (let i=0;i<13;i++) {
    const w=4.7+(i%3)*.35, d=5.6, z=-34+i*5.5;
    quarteirao.push([lado*(20.5+w/2),z,w,10.5+((i*3+(lado>0?2:0))%7)*1.05,d,(i+(lado>0?2:0))%4]);
  }
  for (let i=0;i<9;i++) quarteirao.push([-22+i*5.4,46+(i%2)*1.3,5.5,10+(i*5%9),6.5,i%4]);
  const reservatorioGeo = new THREE.CylinderGeometry(.72,.66,.8,10);
  for (let i=0;i<quarteirao.length;i++) {
    const [x,z,w,h,d,variante] = quarteirao[i], cor = PAREDES[variante];
    pose.position.set(x,h/2,z); pose.rotation.set(0,0,0); pose.scale.set(w,h,d);
    bairro.add(blocoGeo,cor,pose,null,{cast:false});
    const orientZ = z > HALF_Z;
    // Algumas casas têm último pavimento em tijolo; o restante conserva reboco e pintura.
    if (i%3===0) {
      const m=orientZ
        ? addBox(w-.25,2.5,.03,MAT_TIJOLO,x,h-2.55,z-d/2-.02,{collide:false,cast:false,skirt:false,vao:false})
        : addBox(.03,2.5,d-.25,MAT_TIJOLO,x-Math.sign(x)*(w/2+.02),h-2.55,z,{collide:false,cast:false,skirt:false,vao:false});
      m.userData.nonSolidSurface=true;
    }
    for(let andar=0;andar<Math.floor(h/2.9);andar++) for(const off of [-1.25,1.1]) {
      if ((i+andar*3+(off>0?1:0))%7===0) continue;
      const altura=1.4+andar*2.9+(variante%2)*.22, janelaW=.65+((i+andar)%3)*.26, janelaH=i%4===0?.74:1.10;
      pose.position.set(x+off,altura,z-d/2-.045); pose.scale.set(janelaW,janelaH,.04);
      bairro.add(blocoGeo,MAT_VIDRO,pose,null,{cast:false});
      if(!orientZ) {
        pose.position.set(x-Math.sign(x)*(w/2+.045),altura,z+off); pose.scale.set(.04,janelaH,janelaW);
        bairro.add(blocoGeo,MAT_VIDRO,pose,null,{cast:false});
      }
    }
    pose.position.set(x,h+.08,z); pose.scale.set(w+.18,.16,d+.18);
    bairro.add(blocoGeo,MAT_CIMENTO,pose,null,{cast:false});
    if(i%3===1) {
      pose.position.set(x+.7,h+.56,z-.8); pose.scale.set(1,1,1);
      bairro.add(reservatorioGeo,MAT_FERRO,pose,null,{cast:false});
    }
    if(i%4===0) {
      pose.position.set(x,h+.42,z-d/2); pose.scale.set(w,.7,.14);
      bairro.add(blocoGeo,cor,pose,null,{cast:false});
      pose.position.set(x+w/2,h+.42,z); pose.scale.set(.14,.7,d);
      bairro.add(blocoGeo,cor,pose,null,{cast:false});
    } else if(i%4===2) {
      pose.position.set(x+.25,h+.45,z); pose.rotation.z=.08; pose.scale.set(w*.76,.09,d+.24);
      bairro.add(blocoGeo,MAT_ZINCO,pose,null,{cast:false}); pose.rotation.z=0;
      for(const zz of [z-d*.4,z+d*.4]) {
        pose.position.set(x-w*.25,h+.22,zz); pose.scale.set(.07,.44,.07);
        bairro.add(blocoGeo,MAT_FERRO,pose,null,{cast:false});
      }
    }
    // Segundo plano de casas mais altas impede um horizonte de blocos isolados.
    if(i<26 && i%2===0) {
      pose.position.set(x+Math.sign(x)*4.7,(h+3.2)/2,z+1.5); pose.scale.set(5,h+3.2,5.5);
      bairro.add(blocoGeo,PAREDES[(variante+1)%4],pose,null,{cast:false});
      pose.position.y=h+3.28; pose.scale.set(5.15,.16,5.65);
      bairro.add(blocoGeo,MAT_CIMENTO,pose,null,{cast:false});
    }
  }
  bairro.build(root);
  detalhesCasa.build(root);
  folhas.build(vegetacao); vasos.build(vegetacao);
  vegetacao.traverse(m=>{if(m.isMesh)m.userData.nonSolidSurface=true;});
  SKIRT.build(root);

  /* ===================== GRAFFITI ===================== */
  const D_PIXO = decalIds(T, ['folha-pixaca-01.png', 'folha-pixaca-02.png', 'folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  const D_THROW = decalIds(T, ['folha-throwu-01.png', 'folha-throwu-02.png', 'folha-throwu-03.png', 'folha-throwu-04.png', 'folha-throwu-05.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  const D_MURAL = decalIds(T, ['or-mitico-mural.png', 'personagem-muro.png', 'personagens-graffiti-01.png', 'personagens-graffiti-02.png', 'personagens-graffiti-03.png']);
  const D_CARA = decalIds(T, ['caras-cartoon-02.png', 'caras-cartoon-05.png', 'caras-cartoon-08.png']);
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png']);
  const D_PERSO = decalIds(T, ['folha-person-01.png', 'folha-person-02.png', 'folha-person-03.png']);
  const D_CARTAZERA = decalIds(T, ['folha-lambes.png', 'folha-stenci.png']);
  const D_ADESIVO = decalIds(T, ['tags-treino-01.png', 'tags-treino-02.png', 'tags-treino-03.png']);
  grafitar({
    id: 'escadao',
    root, T, waypoints: nodes, seed: 8012, passo: 1.8, alcance: 9, cobre: 0.20, minLarg: 0.3,
    // Respiro nas bocas de escada e nas fachadas comerciais; murais ficam entre patamares.
    limpo: [{ x0: -6, x1: 6, z0: -7, z1: 16 }, { x0: -16, x1: -9, z0: 5, z1: 14 }, { x0: 9, x1: 16, z0: 5, z1: 14 },
      { x0: -16, x1: 16, z0: 28, z1: 33 }],
    bandas: [
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6], chance: 28,
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0], chance: 32,
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], chance: 30, planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  const ambience = createFavelaAmbience(root, {
    map: 'escadao', low: LOWQ,
    rats: [
      { pos: [11.2, groundHeightAt(11.2, 24.2), 24.2], to: [11.8, groundHeightAt(11.8, 23.5), 23.5], phase: .2 },
      { pos: [8.2, groundHeightAt(8.2, 34), 34], to: [9.35, groundHeightAt(9.35, 32.8), 32.8], phase: .45 },
      { pos: [-9.4, groundHeightAt(-9.4, 22.5), 22.5], to: [-8.3, groundHeightAt(-8.3, 21.3), 21.3], phase: 1.7 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-2, groundHeightAt(-2, -36), -36], phase: .8 },
      { mode: 'ground', pos: [-3.4, groundHeightAt(-3.4, -35), -35], phase: 1.1 },
      { mode: 'ground', pos: [-.6, groundHeightAt(-.6, -34.6), -34.6], phase: 2.9 },
    ],
    /* O gato mudou de faixa: a casa de molde do mirante leste ocupou a planta antiga e o
       AR3 do ambience-registry acendeu. Agora anda entre a mureta e a caçamba. */
    cats: [{ assetId: 'escadaoCat', speed: { walk: .55, flee: 1.5 }, pos: [10.8, groundHeightAt(10.8, -22.8), -22.8], to: [11.9, groundHeightAt(11.9, -20.9), -20.9], phase: .65 }],
    chickens: [{ pos: [-9.4, groundHeightAt(-9.4, -30), -30], to: [-7.8, groundHeightAt(-7.8, -32), -32], phase: 1.9 }],
    /* Duas espécies novas do acervo `models/ambient/`: caramelo na calçada e no mirante,
       barata onde tem lixo (caçamba do topo e beco leste). */
    dogs: [
      { pos: [-8.6, groundHeightAt(-8.6, 26.5), 26.5], to: [-7.2, groundHeightAt(-7.2, 24.2), 24.2], phase: .35 },
      { pos: [3.6, groundHeightAt(3.6, -31.4), -31.4], to: [2.1, groundHeightAt(2.1, -29.6), -29.6], phase: 2.2 },
    ],
    cockroaches: [
      { pos: [11.1, groundHeightAt(11.1, 24.8), 24.8], to: [11.5, groundHeightAt(11.5, 24.3), 24.3], phase: .35 },
      { pos: [12.6, groundHeightAt(12.6, -30.2), -30.2], to: [11.9, groundHeightAt(11.9, -29.5), -29.5], phase: 1.05 },
      { pos: [-13.2, groundHeightAt(-13.2, 13.1), 13.1], to: [-13.8, groundHeightAt(-13.8, 12.4), 12.4], phase: 2.6 },
    ],
  });

  // Recorta as faces nas fronteiras do terreno antes de projetar o anel (ER1/ER3).
  // Ajuste visual local: raio e regras de captura permanecem iguais.
  const anelNoPiso = (ring) => {
    const geo = new THREE.TorusGeometry(1, .008, 8, 128), vertices = geo.attributes.position;
    const cortesX = [...new Set([BW.x0, BW.x1, BE.x0, BE.x1, X0, X1, X0 - .5, X1 + .5, AUX_X - AUX_W / 2, AUX_X + AUX_W / 2])];
    const lances = [F1, F2, F3, AUX_F2, AUX_F3];
    const cortesZ = [...new Set([TOP_Z, ...[P1, P2, B_STAIR, CONEX, AUX_P2, ...lances].flatMap(p => [p.z0, p.z1]),
      ...lances.map(p => p.z1 - RUN + ESC.piso / 2)])];
    const metade = (poly, axis, cut, side) => {
      const out = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const da = side * (a[axis] - cut), db = side * (b[axis] - cut);
        if (da >= 0) out.push(a);
        if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
          const t = da / (da - db); out.push(a.map((v, k) => v + (b[k] - v) * t));
        }
      }
      return out;
    };
    const pos = [], scale = ring.scale.x, centroY = groundHeightAt(ring.position.x, ring.position.z);
    for (let face = 0; face < geo.index.count; face += 3) {
      let polys = [Array.from({ length: 3 }, (_, i) => {
        const n = geo.index.getX(face + i);
        return [ring.position.x + vertices.getX(n) * scale, ring.position.z + vertices.getY(n) * scale, vertices.getZ(n)];
      })];
      for (const [axis, cuts] of [[0, cortesX], [1, cortesZ]]) for (const cut of cuts) {
        polys = polys.flatMap(poly => {
          const values = poly.map(p => p[axis]);
          return Math.min(...values) < cut - 1e-9 && Math.max(...values) > cut + 1e-9
            ? [metade(poly, axis, cut, 1), metade(poly, axis, cut, -1)].filter(p => p.length >= 3) : [poly];
        });
      }
      for (const poly of polys) {
        const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
        const projected = poly.map(([x, z, tube]) => {
          // Recuo submilimétrico para o Float32 não escolher a região vizinha na borda.
          const interior = (v, center, cuts) => {
            for (const cut of cuts) v = center > cut ? Math.max(v, cut + 1e-5) : Math.min(v, cut - 1e-5);
            return v;
          };
          x = interior(x, cx, cortesX); z = interior(z, cz, cortesZ);
          return [(x - ring.position.x) / scale, (z - ring.position.z) / scale, tube - (groundHeightAt(x, z) - centroY) / scale];
        });
        for (let i = 1; i < projected.length - 1; i++) pos.push(...projected[0], ...projected[i], ...projected[i + 1]);
      }
    }
    geo.dispose();
    const result = new THREE.BufferGeometry(); result.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    result.computeVertexNormals(); result.computeBoundingBox(); result.computeBoundingSphere(); return result;
  };
  let aneisNoPiso = [];
  const update = () => {
    if (aneisNoPiso.length === ctfPoints.length && aneisNoPiso.every(m => m.parent === scene)) return;
    for (const old of aneisNoPiso) if (old.parent !== scene) old.geometry.dispose();
    aneisNoPiso = scene.children.filter(m => (m.userData.escadaoNoPiso || (m.geometry?.type === 'TorusGeometry'
      && m.geometry.parameters.radius === 1 && m.geometry.parameters.tube === .045))
      && m.scale.x === 4.5 && ctfPoints.some(p => p.x === m.position.x && p.z === m.position.z));
    for (const ring of aneisNoPiso) {
      if (ring.userData.escadaoNoPiso) continue;
      ring.geometry = anelNoPiso(ring); ring.userData.escadaoNoPiso = true;
    }
  };

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, snapDownSteps: true, layeredNavigation: true, spawns, sun, hemi, pickups, ctfPoints, ambience, update, casario, casarioMoldes: CASARIO_MOLDES,
    /* Som por cota: duas fontes no centro com raio 70 m tocavam igual no beco e no
       mirante. Agora baile na rua, cidade subindo do vale e passarada no topo. */
    sound: { loops: [
      { src: AMB_LOOPS.funk, pos: [0, 3, 30], radius: 42, vol: .34 },
      { src: AMB_LOOPS.cidade, pos: [0, 2, 38], radius: 55, vol: .16 },
      { src: AMB_LOOPS.passaros, pos: [0, H_TOP + 3, -30], radius: 45, vol: .22 },
    ], bioma: 'favela' },
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    tacticalPoints: [{ x: 7, z: 16, label: 'Janela da casa' }],
    stairs: [
      // Inclui um piso da chegada inferior: ele é a superfície antes do primeiro dos 12
      // espelhos e permite que a régua conte a primeira transição, não só as 11 internas.
      { nome: 'lance inferior', x0: X0, x1: X1, z0: F1.z0, z1: F1.z1 + ESC.piso, topo: RISE },
      // A casa de esquina ocupa a metade oeste do patamar; passagem permanece a leste.
      { nome: 'lance central', x0: 0, x1: X1, z0: F2.z0, z1: F2.z1 + ESC.piso, topo: RISE * 2 },
      { nome: 'lance superior', x0: X0, x1: X1, z0: F3.z0, z1: F3.z1 + ESC.piso, topo: H_TOP },
      { nome: 'flanco oeste central', x0: AUX_X - AUX_W / 2, x1: AUX_X + AUX_W / 2, z0: AUX_F2.z0, z1: AUX_F2.z1 + ESC.piso, topo: RISE * 2 },
      { nome: 'flanco oeste superior', x0: AUX_X - AUX_W / 2, x1: AUX_X + AUX_W / 2, z0: AUX_F3.z0, z1: AUX_F3.z1 + ESC.piso, topo: H_TOP },
    ],
    levels: [{ nome: 'mirante', x0: -16, x1: 16, z0: -39, z1: TOP_Z, dePartida: 'E' }],
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
