// ESCADÃO (escadao) — spec plans/12-ESCADAO.md. Invariante CTF2: os dois becos laterais
// têm escada própria rua → patamar 1, separados ≥ 6 m do eixo central (2+ rotas spawn→bandeira).
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience, FAVELA_AMBIENCE_ASSETS } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 18, HALF_Z = 40;
export const ESCADAO_AMBIENCE = FAVELA_AMBIENCE_ASSETS;

export const ESCADAO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_dagua', 'varal_roupas_01', 'varal_roupas_02',
  'casa_favela_azul', 'casa_favela_tijolo', 'varal_roupas'];

/* PROPORÇÃO NATURAL DOS MOLDES DE CASA (kit Mint `favela_r3`).
   bbox do GLB em disco, medido com @gltf-transform em 27/08/2026 — os moldes vêm
   normalizados em ~1 m no maior eixo, então o que importa aqui é a RAZÃO entre eixos:
   é dela que sai o quanto cada instância precisa esticar para caber na planta pedida.
   `eval:escala-casario` relê os dois arquivos e reprova se estes números derivarem —
   trocar o GLB por outro sem reconferir a escala é exatamente o defeito que o dono
   apontou ("tem que ver a escala dos predios sempre"). */
export const CASARIO_MOLDES = Object.freeze({
  casa_favela_azul: { larg: 0.955, alt: 0.998, prof: 0.764 },
  casa_favela_tijolo: { larg: 0.943, alt: 0.936, prof: 0.998 },
});

// ---- parâmetros da escada (NBR 9077 / Blondel: 2h+p = 0,63) ----
const ESC = { larg: 5.0, espelho: 0.17, piso: 0.29, n: 12 };
const RISE = ESC.espelho * ESC.n;
const RUN  = ESC.piso   * ESC.n;
const H_TOP = RISE * 3;

// fronteiras dos lances (z diminui subindo)
const F1 = { z0: 14 - RUN, z1: 14 };
const P1 = { z0: F1.z0 - 4.0, z1: F1.z0 };       // patamar 1 (4 m de fundura)
const F2 = { z0: P1.z0 - RUN, z1: P1.z0 };
const P2 = { z0: F2.z0 - 5.0, z1: F2.z0 };       // patamar 2 / caveirão (5 m)
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
  // Uma única fileira da textura ocupa cada espelho/mureta. Evita que o mosaico seja
  // reamostrado como ruído cinza nas capturas aéreas e conserva blocos de cor legíveis.
  const faixaAz = MAT_AZ.map.clone();
  faixaAz.wrapS = faixaAz.wrapT = THREE.RepeatWrapping; faixaAz.repeat.set(1, 0.125);
  faixaAz.needsUpdate = true;
  MAT_AZ_LONG = lam({ map: faixaAz, emissive: 0x151006, emissiveIntensity: 0.12 });
  const AZ_CAPS = [
    lam({ color: 0x078ac2, roughness: 0.82 }), lam({ color: 0xf1bd27, roughness: 0.82 }),
    lam({ color: 0xd94f45, roughness: 0.82 }), lam({ color: 0x289b6c, roughness: 0.82 }),
  ];

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
        x.fillStyle = 'rgba(40,26,20,0.5)';
        for (let h2 = 0; h2 < 3; h2++) x.fillRect(bx + 6 + h2 * 15, by + 6, 9, 12);
      }
      x.restore();
    }
    for (let i = 0; i < 14; i++) { const px = rnd() * S; const g = x.createLinearGradient(0, 0, 0, 60 + rnd() * 150); g.addColorStop(0, 'rgba(48,44,38,0.42)'); g.addColorStop(1, 'rgba(48,44,38,0)'); x.fillStyle = g; x.fillRect(px, 0, 3 + rnd() * 8, 60 + rnd() * 150); }
    const g2 = x.createLinearGradient(0, S * 0.72, 0, S); g2.addColorStop(0, 'rgba(40,50,30,0)'); g2.addColorStop(1, 'rgba(40,50,30,0.25)'); x.fillStyle = g2; x.fillRect(0, S * 0.72, S, S * 0.28);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex });
  }
  let PAREDES = [
    paredeTex('#c4a87a', 0.3, 201), paredeTex('#a89d8a', 0.4, 402),
    paredeTex('#8d6e5a', 0.5, 603), paredeTex('#b0a06a', 0.35, 804),
  ];
  const MAT_PORTA = lam({ color: 0x49372a, roughness: 0.88 });
  const MAT_VIDRO = lam({ color: 0x273b42, roughness: 0.22, metalness: 0.18 });
  const MAT_ZINCO = lam({ color: 0x777a76, roughness: 0.72, metalness: 0.35 });

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
    external(MAT_AZ, '/img/textures/azulejo.webp', 3, 3);
    for (let i = 0; i < PAREDES.length; i++) external(PAREDES[i], '/img/textures/favela_wall.webp', 2.5 + i * 0.25, 2.8);
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

  /* ===================== HELPERS DE GEOMETRIA ===================== */
  /* ===================== CASARIO DE MOLDE (kit Mint favela_r3) =====================
     O dono, 20/08: "os mapas de favela so o lajes tem cordao de roupas do model, os
     outros nao e tudo generico low poly". As casas do escadão continuam sendo o MESMO
     volume de jogo (o colisor não muda de dono): o molde entra como pele por cima do
     prisma, que fica invisível mas SEGUE em `occluders` — bala e linha de visão param
     onde sempre pararam, e não na malha vazada do GLB (a lição do BUG-54 ao contrário).
     Sem GLB (node, `?glb=0`, molde que não baixou) a fachada procedural de sempre volta.
     O registro `casario` guarda a REFERÊNCIA do colisor: é por ele que a régua
     `eval:escala-casario` mede pé-direito, fachada e distorção no mundo construído. */
  const casario = [];
  function instanciaCasa(spec, x, z, y, w, h, d, col) {
    const nat = CASARIO_MOLDES[spec.molde];
    const sy = h / nat.alt;                       // placeProp já escala uniforme pela altura
    // Duas orientações cabem na mesma planta; fica a que menos distorce o molde.
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

  // Casas que abraçam o escadão recebem a fachada no plano X, voltada para os degraus.
  function fachadaEscada(x, z, d, h, lado, y = 0, matIdx = 0) {
    const fx = x - lado * 1.52;
    addBox(0.08, h - 0.28, d - 0.18, PAREDES[matIdx % PAREDES.length], fx, y + 0.08, z, { collide: false, skirt: false });
    addBox(0.06, 1.95, 0.92, MAT_PORTA, fx - lado * 0.05, y + 0.05, z + d * 0.24, { collide: false, cast: false, skirt: false });
    addBox(0.05, 0.86, 1.08, MAT_VIDRO, fx - lado * 0.06, y + 1.48, z - d * 0.2, { collide: false, cast: false, skirt: false });
    addBox(0.72, 0.08, 1.38, MAT_ZINCO, fx - lado * 0.34, y + 2.5, z - d * 0.2, { collide: false, skirt: false });
  }

  // constrói um lance de escada (piso + espelho + muros laterais)
  function buildFlight(flight, yBase, mat) {
    const { z0, z1 } = flight;
    for (let k = 1; k <= ESC.n; k++) {
      const yTop = yBase + k * ESC.espelho;
      const zc = z1 - (k - 0.5) * ESC.piso;
      const zNariz = z1 - (k - 1) * ESC.piso;
      const pisoMat = k % 4 === 0 ? AZ_CAPS[(k / 4 + Math.round(yBase / RISE)) % AZ_CAPS.length] : mat;
      // degrau é massa visível na faixa do collider do muro: vira occluder (BUG-54)
      occluders.push(addBox(ESC.larg, 0.06, ESC.piso, pisoMat, 0, yTop - 0.06, zc, { collide: false }));
      occluders.push(addBox(ESC.larg, ESC.espelho, 0.04, MAT_AZ_LONG, 0, yTop - ESC.espelho, zNariz, { collide: false }));
    }
    // O AABB contínuo preserva o bloqueio físico anterior; visualmente, o paredão alto é
    // substituído por muretas que acompanham a subida em módulos de quatro degraus.
    for (const sx of [X0 - 0.15, X1 + 0.15]) {
      col(sx - 0.15, sx + 0.15, 0, yBase + RISE + 0.5, z0 - 0.15, z1 + 0.15);
      for (let k = 0; k < ESC.n; k += 4) {
        const n = Math.min(4, ESC.n - k), d = n * ESC.piso + 0.05;
        const z = z1 - (k + n / 2) * ESC.piso;
        // face visível dentro do collider do muro: vira occluder (BUG-54)
        occluders.push(addBox(0.28, 1.08, d, MAT_AZ_LONG, sx, yBase + (k + 1) * ESC.espelho, z, { collide: false, skirt: false }));
        occluders.push(addBox(0.34, 0.055, d + 0.04, AZ_CAPS[(k / 4 + Math.round(yBase / RISE)) % AZ_CAPS.length],
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
      occluders.push(addBox(w, 0.06, p, MAT.concrete, xCenter, y - 0.06, z, { collide: false }));
      occluders.push(addBox(w, ESC.espelho, 0.04, MAT.concrete, xCenter, y - ESC.espelho, z1 - (k - 1) * p, { collide: false }));
    }
  }

  // Mesmo perfil Blondel da escada central, mas em viela estreita. As muretas seguem os
  // degraus em módulos, de modo que a rota alternativa seja geometria real e segura.
  function buildAuxFlight(flight, yBase) {
    for (let k = 1; k <= ESC.n; k++) {
      const yTop = yBase + k * ESC.espelho;
      const zc = flight.z1 - (k - 0.5) * ESC.piso;
      const zNariz = flight.z1 - (k - 1) * ESC.piso;
      occluders.push(addBox(AUX_W, 0.06, ESC.piso, MAT.concrete, AUX_X, yTop - 0.06, zc, { collide: false }));
      occluders.push(addBox(AUX_W, ESC.espelho, 0.04, MAT_AZ_LONG, AUX_X, yTop - ESC.espelho, zNariz, { collide: false }));
    }
    for (const sx of [AUX_X - AUX_W / 2 - 0.15, AUX_X + AUX_W / 2 + 0.15]) {
      for (let k = 0; k < ESC.n; k += 4) {
        const n = Math.min(4, ESC.n - k), d = n * ESC.piso + 0.05;
        const z = flight.z1 - (k + n / 2) * ESC.piso;
        addBox(0.28, 1.08, d, MAT_AZ_LONG, sx, yBase + (k + 1) * ESC.espelho, z);
      }
    }
  }

  /* ===================== ESCADA CENTRAL (3 lances + 3 patamares) ===================== */
  buildFlight(F1, 0, MAT_AZ);
  buildLanding(P1.z0, P1.z1, RISE);
  buildFlight(F2, RISE, MAT_AZ);
  buildLanding(P2.z0, P2.z1, RISE * 2);
  buildFlight(F3, RISE * 2, MAT_AZ);

  // Muros laterais dos patamares (proteção + bloqueio de visão). O vão de 2 m no muro do
  // PATAMAR 1 é a rota beco → patamar 1; o do PATAMAR 2 fica inteiro porque fora é queda.
  const VAO_P1 = 2.0;
  for (const [pz0, pz1, py] of [[P1.z0, P1.z1, RISE], [P2.z0, P2.z1, RISE * 2]]) {
    const trechos = py === RISE
      ? [[pz0, (pz0 + pz1) / 2 - VAO_P1 / 2], [(pz0 + pz1) / 2 + VAO_P1 / 2, pz1]]
      : [[pz0, pz1]];
    for (const sx of [X0 - 0.65, X1 + 0.65]) {
      for (const [tz0, tz1] of trechos) {
        addBox(0.3, 1.5, tz1 - tz0, MAT_AZ_LONG, sx, py, (tz0 + tz1) / 2);
        addBox(0.38, 0.06, tz1 - tz0 + 0.08, AZ_CAPS[((sx > 0 ? 1 : 3) + (py > RISE ? 0 : 1)) % AZ_CAPS.length],
          sx, py + 1.5, (tz0 + tz1) / 2, { collide: false, cast: false, skirt: false });
      }
    }
  }

  /* ===================== CORRIMÃOS ===================== */
  function corrimao(z0, z1, yBase) {
    for (const sx of [X0, X1])
      for (let i = 0; i <= ESC.n; i++)
        // idem: poste visível na faixa do collider lateral
        occluders.push(addBox(0.04, 1.0, 0.04, lam({ color: 0x3a3a3a, metalness: 0.6, roughness: 0.4 }), sx, yBase + i * ESC.espelho, z1 - i * ESC.piso, { collide: false, skirt: false }));
  }
  corrimao(F1.z0, F1.z1, 0);
  corrimao(F2.z0, F2.z1, RISE);
  corrimao(F3.z0, F3.z1, RISE * 2);

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
      for (const x of [bx0 + 0.75, bx1 - 0.75]) addBox(1.5, 1.05, 0.22, MAT_AZ_LONG, x, RISE, B_STAIR.z0 - chegadaD);
    } else addBox(bx1 - bx0, 1.05, 0.22, MAT_AZ_LONG, cx, RISE, B_STAIR.z0 - chegadaD);
    const outer = dir > 0 ? bx0 : bx1;
    addBox(0.22, 1.05, chegadaD, MAT_AZ_LONG, outer, RISE, chegadaZ);
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
      addBox(pw, 1.05, 0.22, MAT_AZ_LONG, pcx, RISE, z);
    addBox(0.42, 0.12, 2.2, AZ_CAPS[dir > 0 ? 0 : 2], inner, RISE + 0.04, chegadaZ, { collide: false, cast: false, skirt: false });
    // muros das paredes do beco (casas de um e outro lado)
    for (const wx of [bx0, bx1]) {
      addBox(0.4, 4, 7, PAREDES[0], wx, 0, 10.5);
      solids.push({ x0: wx - 0.2, x1: wx + 0.2, z0: 7, z1: 14 });
    }
  }
  buildBeco(BW.x0, BW.x1, 1);   // oeste, dir=+1 (conecta pra direita/centro)
  buildBeco(BE.x0, BE.x1, -1);  // leste, dir=-1 (conecta pra esquerda/centro)

  /* ===================== FLANCO OESTE ATÉ O MIRANTE ===================== */
  buildAuxFlight(AUX_F2, RISE);
  addFloor(AUX_W, AUX_P2.z1 - AUX_P2.z0, AUX_X, (AUX_P2.z0 + AUX_P2.z1) / 2, MAT.concrete, RISE * 2 + 0.01);
  addBox(AUX_W, 0.12, AUX_P2.z1 - AUX_P2.z0, MAT.concreteDark, AUX_X, RISE * 2 - 0.12, (AUX_P2.z0 + AUX_P2.z1) / 2);
  for (const sx of [AUX_X - AUX_W / 2 - 0.15, AUX_X + AUX_W / 2 + 0.15])
    addBox(0.28, 1.08, AUX_P2.z1 - AUX_P2.z0, MAT_AZ_LONG, sx, RISE * 2, (AUX_P2.z0 + AUX_P2.z1) / 2);
  buildAuxFlight(AUX_F3, RISE * 2);

  /* ===================== CASAS LATERAIS ===================== */
  // Cada par acompanha o nível do lance vizinho; o embasamento fecha o volume até a rua.
  /* A planta segue estreita (3,0 × 4,4 m): mexer no x destas seis abriria/estreitaria o
     corredor do lance. Quem varia é a ALTURA — sobrado de 2×2,95 m de um lado, casa de
     um pavimento (3,05 m) do outro, alternando de nível em nível. É a escada de laje que
     o dono cobra, e é também a proporção em que cada molde cabe sem virar panqueca: o
     tijolo (planta quase quadrada) não entra em 3,0 m de frente com 5,9 m de altura sem
     ser espremido a 0,50× — foi a régua `eval:escala-casario` que disse isso, não o olho. */
  for (const [z, y, ml, mr, alto] of [[12, 0, 1, 0, -1], [5, RISE, 0, 2, 1], [-3.7, RISE * 2, 2, 1, -1]]) {
    const sobrado = { molde: 'casa_favela_azul', pav: 2 }, terreo = { molde: 'casa_favela_tijolo', pav: 1 };
    const esq = alto < 0 ? sobrado : terreo, dir = alto < 0 ? terreo : sobrado;
    casa(-5.5, z, 3, 4.4, esq.pav === 2 ? 5.9 : 3.05, ml, y, { ...esq, ry: 0.028 });
    casa(5.5, z, 3, 4.4, dir.pav === 2 ? 5.9 : 3.05, mr, y, { ...dir, ry: -0.034 });
    fachadaEscada(-5.5, z, 4, 4, -1, y, ml); fachadaEscada(5.5, z, 4, 4, 1, y, mr);
  }

  // Pequenos puxadinhos e caixas d'água criam uma silhueta escalonada ao redor do eixo.
  for (const [x, z, y, w, h, mi] of [
    [-7.2, 7.5, RISE, 2.5, 2.8, 3], [7.4, 6.2, RISE, 2.8, 3.2, 0],
    [-7.1, -7.4, H_TOP, 2.6, 3.0, 1], [7.3, -9.1, H_TOP, 2.5, 2.6, 2],
  ]) {
    if (y > 0.05) addBox(w, y, 3.0, MAT.concreteDark, x, 0, z, { collide: false });
    addBox(w, h, 3.0, PAREDES[mi], x, y, z, { collide: false });
    addBox(w + 0.22, 0.1, 3.22, MAT_ZINCO, x, y + h, z, { collide: false, skirt: false });
    addBox(0.05, 0.75, 0.95, MAT_VIDRO, x + (x < 0 ? w / 2 + 0.03 : -w / 2 - 0.03), y + 1.3, z, { collide: false, cast: false, skirt: false });
  }

  /* ===================== CAVEIRÃO (patamar central) ===================== */
  {
    const cy = RISE * 2;
    const cvX = -2.2, cvZ = (P2.z0 + P2.z1) / 2;
    colliders.push({ minX: cvX - 2.3, maxX: cvX + 2.3, minY: cy, maxY: cy + 2.5, minZ: cvZ - 1.1, maxZ: cvZ + 1.1 });
    const blindado = lam({ color: 0x181d20, roughness: 0.67, metalness: 0.34 });
    const vidro = lam({ color: 0x466371, roughness: 0.2, metalness: 0.58 });
    const caveirao = new THREE.Group();
    caveirao.userData.landmark = 'caveirao';
    caveirao.position.set(cvX, cy + .18, cvZ);
    // Casco monovolume genérico, sem logo, caveira ou insígnia oficial (linha editorial).
    const L = 4.6, W = 2.1, H = 2.18, xf = L / 2, xt = xf - .62, xr = -L / 2;
    const vertices = new Float32Array([
      xr,0,-W/2,  xr,0,W/2,  xf,0,-W/2,  xf,0,W/2,
      xr,H,-W/2,  xr,H,W/2,  xt,H,-W/2,  xt,H,W/2,
    ]);
    const indices = [0,2,1, 1,2,3, 4,5,6, 5,7,6, 0,1,4, 1,5,4,
      2,6,3, 3,6,7, 0,4,2, 2,4,6, 1,3,5, 3,7,5];
    const hullGeo = new THREE.BufferGeometry();
    hullGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    hullGeo.setIndex(indices); hullGeo.computeVertexNormals();
    const hull = new THREE.Mesh(hullGeo, blindado); hull.castShadow = hull.receiveShadow = true; caveirao.add(hull);
    // Para-lamas salientes e entre-eixos curto vendem veículo blindado, não baú.
    const pneu = lam({ color: 0x0b0b0b, roughness: 0.96 });
    for (const [wx, wz] of [[-1.25,-1.08],[1.15,-1.08],[-1.25,1.08],[1.15,1.08]]) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(.44,.44,.34,14), pneu);
      r.rotation.x = Math.PI / 2; r.position.set(wx,.42,wz); r.castShadow = true; caveirao.add(r);
      const f = new THREE.Mesh(new THREE.BoxGeometry(1.08,.38,.12), blindado);
      f.position.set(wx,.83,wz); f.castShadow = true; caveirao.add(f);
    }
    const paraBrisa = new THREE.Mesh(new THREE.BoxGeometry(.055,.72,1.5), vidro);
    paraBrisa.rotation.z = -.26; paraBrisa.position.set(1.99,1.47,0); caveirao.add(paraBrisa);
    const grade = lam({ color: 0x566065, metalness: .72, roughness: .42 });
    const farol = lam({ color: 0xd8c991, emissive: 0x4a411f, emissiveIntensity: .42, roughness: .28 });
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(.18,.24,2.28), grade);
    bumper.position.set(2.30,.34,0); caveirao.add(bumper);
    for (const z of [-.66,.66]) {
      const luz = new THREE.Mesh(new THREE.BoxGeometry(.07,.24,.34), farol);
      luz.position.set(2.31,.76,z); caveirao.add(luz);
    }
    for (let z = -.42; z <= .42; z += .21) {
      const barra = new THREE.Mesh(new THREE.BoxGeometry(.07,.36,.055), grade);
      barra.position.set(2.31,.72,z); caveirao.add(barra);
    }
    for (const wz of [-1,1]) {
      const lateral = new THREE.Mesh(new THREE.BoxGeometry(1.15,.52,.055), vidro);
      lateral.position.set(.92,1.48,wz*1.055); caveirao.add(lateral);
    }
    const placa = new THREE.Mesh(new THREE.BoxGeometry(.72,.11,.18), AZ_CAPS[1]);
    placa.position.set(2.08,.43,-1.04); caveirao.add(placa);
    root.add(caveirao);
    // Torre baixa: sem mastro, para o landmark não virar caminhão de transmissão.
    const teto = new THREE.Mesh(new THREE.BoxGeometry(1.75,.58,1.42), blindado);
    teto.position.set(-.55,2.18,0); teto.castShadow = true; caveirao.add(teto);
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.66, 0.52, 10), blindado);
    torre.position.set(-.55,2.7,0); torre.castShadow = true; caveirao.add(torre);
    // todas as peças visíveis seguram a bala (BUG-54), não só o casco
    caveirao.traverse((m) => { if (m.isMesh) occluders.push(m); });
  }

  /* ===================== BARRICADAS ===================== */
  // patamar 1: pneus
  const MAT_PNEU = lam({ color: 0x1a1a1a, roughness: 0.95 });
  propAt('pilha_pneus', -1.2, (P1.z0 + P1.z1) / 2, 0.9, 1.6, 1.2, MAT_PNEU, 0, RISE);
  // base: portão arrancado
  addBox(2.5, 1.2, 0.8, lam({ color: 0x4a4a3a, roughness: 0.8 }), 1.5, 0, 14.5);

  /* ===================== BASE (rua) ====================== */
  /* Bar e mercadinho viram DUAS geminadas cada um: a fita de 6 m de fachada é o que a
     rua tem, mas um molde só esticado nela viraria galpão. Duas casas de 3,0 × 4,6 m
     dividem a mesma frente e mantêm o volume que tampa a visão dos becos. */
  // bar de esquina (bloqueia visão do beco oeste)
  casa(-13.5, 32, 3, 4.6, 3.05, 0, 0, { molde: 'casa_favela_azul', pav: 1, ry: -0.03 });
  casa(-10.5, 32, 3, 4.6, 3.05, 2, 0, { molde: 'casa_favela_tijolo', pav: 1, ry: 0.022 });
  addBox(6, 0.8, 0.3, lam({ color: 0x8a4a2a }), -12, 3.05, 29.6, { collide: false });
  // mercadinho (bloqueia visão do beco leste)
  casa(10.5, 34, 3, 4.6, 3.05, 2, 0, { molde: 'casa_favela_tijolo', pav: 1, ry: 0.031 });
  casa(13.5, 34, 3, 4.6, 3.05, 0, 0, { molde: 'casa_favela_azul', pav: 1, ry: -0.019 });
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
    marca(addBox(LAJE_W, LAJE_H, LAJE_D, MAT.concrete, 0, LAJE_Y, LAJE_Z));
    // Mureta nas duas testas: é ela que pega as visadas mais altas (as de quem está na
    // beirada do mirante, que chegam aqui a ~3,7 m).
    for (const dz of [-1, 1])
      marca(addBox(LAJE_W, 1.25, 0.25, PAREDES[1], 0, LAJE_Y + LAJE_H, LAJE_Z + dz * (LAJE_D / 2 - 0.125)));
    marca(addBox(LAJE_W + 0.4, 0.10, LAJE_D + 0.3, MAT_ZINCO, 0, LAJE_Y + LAJE_H + 1.25, LAJE_Z));
    // Fachada rasa nas duas testas: janelas impedem que a mureta leia como caixa lisa.
    for (const dz of [-1, 1]) for (const jx of [-6.2, -1.4, 1.4, 6.2])
      addBox(0.9, 0.7, 0.06, MAT_VIDRO, jx, LAJE_Y + LAJE_H + 0.3,
        LAJE_Z + dz * (LAJE_D / 2 + 0.04), { collide: false, cast: false, skirt: false });
  }
  // mesas do bar
  for (const [mx, mz] of [[-9, 29], [-7, 30]]) propAt('mesa_guardasol', mx, mz, 2.3, 1.2, 1.2, lam({ color: 0xcca060 }));
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
    /* Corda é corda: sem esta marca a sonda MAP1 do map-check lê o varal como geometria
       visível com o corpo dentro (era o único ponto vermelho do escadão, 1,098 m — a
       altura exata desta linha sobre o mirante). As roupas já nasciam marcadas. */
    linha.userData.nonSolidSurface = true;
    root.add(linha);
    for (const dx of [-.75, 0, .75]) {
      const roupa = new THREE.Mesh(new THREE.BoxGeometry(.35, .52, .035), [PAREDES[0], PAREDES[2], PAREDES[3]][Math.round((dx + 1) * 2) % 3]);
      roupa.position.set(x + Math.cos(ry) * dx, y + h * .48, z - Math.sin(ry) * dx); roupa.rotation.y = ry; roupa.userData.nonSolidSurface = true; root.add(roupa);
    }
  };
  varal('varal_roupas_01', -5.8, -34.6, 1.5, .12);
  varal('varal_roupas_02', 8.1, -25.2, 1.45, -Math.PI / 2);
  /* Varal do kit Mint `favela_r3` espalhado FORA do mirante: dois nos corredores de beco e
     dois nas lajes baixas (chegada do beco oeste e plataforma de conexão leste). O dono,
     20/08: "so o lajes tem cordao de roupas do model". Nenhum ganha colisor — roupa é
     silhueta, nunca cover (mesma doutrina dos dois do topo). */
  varal('varal_roupas', -12.6, 12.6, 1.55, -Math.PI / 2, 0);
  varal('varal_roupas', 11.6, 12.9, 1.5, Math.PI / 2, 0);
  varal('varal_roupas', -12, 6.6, 1.5, .05, RISE);
  varal('varal_roupas', 6.2, 9.2, 1.45, -.08, RISE);
  // barraco de obra (cover)
  casa(12, -33, 5, 4, 3.05, 3, H_TOP, { molde: 'casa_favela_azul', pav: 1, ry: 0.024 });
  // cobertura lateral preserva a visada do spawn para o cartão-postal central
  casa(-7, -24, 4.2, 4.2, 3.1, 1, H_TOP, { molde: 'casa_favela_tijolo', pav: 1, ry: -0.021 });
  casa(7, -24, 4.2, 4.2, 3.1, 0, H_TOP, { molde: 'casa_favela_azul', pav: 1, ry: 0.033 });
  casa(-12, -26, 4.2, 4.2, 3.05, 0, H_TOP, { molde: 'casa_favela_tijolo', pav: 1, ry: 0.015 });
  casa(12, -27, 4.2, 4.2, 3.05, 1, H_TOP, { molde: 'casa_favela_azul', pav: 1, ry: -0.028 });
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
    [-7, -29, 'pilha_pneus'], [-2, -22, 'dumpster'], [7, -29, 'dumpster'], [2, -22, 'pilha_pneus'], [4, -14, 'dumpster'],
    [-14, -15, 'dumpster'], [-14, -11, 'pilha_pneus'], [-14, -6, 'pilha_pneus'], [-14, 5, 'dumpster'], [-14, 13, 'pilha_pneus'],
    [14, -15, 'pilha_pneus'], [14, -11, 'dumpster'], [14, -6, 'dumpster'], [14, 5, 'pilha_pneus'], [14, 13, 'dumpster'],
    [-14, 24, 'pilha_pneus'], [-14, 31, 'dumpster'], [-14, 37, 'pilha_pneus'],
    [3, 36, 'pilha_pneus'], [14, 24, 'dumpster'], [14, 31, 'pilha_pneus'], [14, 37, 'dumpster'],
  ]) {
    const y = groundHeightAt(x, z);
    propAt(id, x, z, id === 'dumpster' ? 1.3 : 1.0, id === 'dumpster' ? 1.3 : 1.4,
      id === 'dumpster' ? 2.2 : 1.4, id === 'dumpster' ? MAT.concreteDark : MAT_PNEU, 0, y);
  }

  // Fiação sem colisor: seis catenárias baratas quebram o céu plano e amarram as fachadas.
  const MAT_FIO = new THREE.MeshBasicMaterial({ color: 0x151515, fog: true });
  const fio = (x0, y0, z0, x1, y1, z1) => {
    const pts = [[x0, y0, z0], [(x0 + x1) / 2, (y0 + y1) / 2 - 0.55, (z0 + z1) / 2], [x1, y1, z1]];
    for (let i = 0; i < 2; i++) {
      const a = pts[i], b = pts[i + 1], v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, v.length(), 4), MAT_FIO);
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); root.add(m);
    }
  };
  fio(-15, 5.2, 32, 15, 5.5, 34); fio(-15, 6.6, 12, 15, 6.9, 12);
  fio(-6, 8.6, 7, 6, 8.8, 7); fio(-6, 12.0, -4, 6, 12.2, -4);
  fio(-14, H_TOP + 5.0, -27, 14, H_TOP + 5.2, -27);
  fio(-14, H_TOP + 5.4, -36, 14, H_TOP + 5.1, -34);

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
  addBox(4.5, 1.2, 0.4, MAT_AZ_LONG, -15.75, H_TOP, TOP_Z);
  addBox(8.0, 1.2, 0.4, MAT_AZ_LONG, -6.5, H_TOP, TOP_Z);
  const guardaTopoW = HALF_X - X1;
  addBox(guardaTopoW, 1.2, 0.4, MAT_AZ_LONG, (X1 + HALF_X) / 2, H_TOP, TOP_Z);

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
    if (z <= TOP_Z) return H_TOP;
    if (x >= AUX_X - AUX_W / 2 && x <= AUX_X + AUX_W / 2) {
      if (z >= AUX_F3.z0 && z <= AUX_F3.z1) return rampHeight(z, AUX_F3.z1, RISE * 2);
      if (z >= AUX_P2.z0 && z <= AUX_P2.z1) return RISE * 2;
      if (z >= AUX_F2.z0 && z <= AUX_F2.z1) return rampHeight(z, AUX_F2.z1, RISE);
    }
    if (z >= P2.z0 && z <= P2.z1 && x >= X0 - 0.5 && x <= X1 + 0.5) return RISE * 2;
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
  // escada central: 3 colunas paralelas dentro da largura de 5 m
  for (const xl of [-1.5, 0, 1.5]) {
    linha(xl, F1.z1, xl, F1.z0, 0.9);
    linha(xl, F2.z1, xl, F2.z0, 0.9);
    linha(xl, F3.z1, xl, F3.z0, 0.9);
  }
  linha(AUX_X, AUX_F2.z1, AUX_X, AUX_F2.z0, 0.6);
  linha(AUX_X, AUX_P2.z1, AUX_X, AUX_P2.z0, 0.9);
  linha(AUX_X, AUX_F3.z1, AUX_X, AUX_F3.z0, 0.6);
  // patamares: cruzeta de um lado ao outro
  linha(-2.5, P1.z1, 2.5, P1.z0, 1.2);
  linha(-2.5, P2.z1, 2.5, P2.z0, 1.2);
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
  rotaBeco(12, 6, X1);   // beco leste
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
    root, T, waypoints: nodes, seed: 8012, passo: 0.95, alcance: 9, cobre: 0.03, minLarg: 0.3,
    bandas: [
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6], chance: 62,
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0], chance: 74,
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], chance: 30, planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  const ambience = createFavelaAmbience(root, {
    map: 'escadao', low: LOWQ,
    rats: [
      { pos: [8.2, groundHeightAt(8.2, 34), 34], to: [9.35, groundHeightAt(9.35, 32.8), 32.8], phase: .45 },
      { pos: [-9.4, groundHeightAt(-9.4, 22.5), 22.5], to: [-8.3, groundHeightAt(-8.3, 21.3), 21.3], phase: 1.7 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-2, groundHeightAt(-2, -36), -36], phase: .8 },
      { mode: 'ground', pos: [-3.4, groundHeightAt(-3.4, -35), -35], phase: 1.1 },
      { mode: 'ground', pos: [-.6, groundHeightAt(-.6, -34.6), -34.6], phase: 2.9 },
    ],
    /* O gato andava em (10,4;-26) → (12,1;-29): a casa de molde do mirante leste passou a
       ocupar essa planta (4,2 × 4,2 m) e o AR3 do ambience-registry acendeu na hora. Ele
       mudou para a faixa livre entre a mureta e a caçamba, mesma cota. */
    cats: [{ pos: [10.8, groundHeightAt(10.8, -22.8), -22.8], to: [11.9, groundHeightAt(11.9, -20.9), -20.9], phase: .65 }],
    chickens: [{ pos: [-9.4, groundHeightAt(-9.4, -30), -30], to: [-7.8, groundHeightAt(-7.8, -32), -32], phase: 1.9 }],
    /* Duas espécies novas, as duas já no acervo `public/models/ambient/`: o caramelo é o
       bicho de rua do morro (um na calçada do bar, outro tomando sol no mirante) e a
       barata mora onde tem lixo — ao lado das caçambas do topo e no beco leste. */
    dogs: [
      { pos: [-8.6, groundHeightAt(-8.6, 26.5), 26.5], to: [-7.2, groundHeightAt(-7.2, 24.2), 24.2], phase: .35 },
      { pos: [3.6, groundHeightAt(3.6, -31.4), -31.4], to: [2.1, groundHeightAt(2.1, -29.6), -29.6], phase: 2.2 },
    ],
    cockroaches: [
      { pos: [12.6, groundHeightAt(12.6, -30.2), -30.2], to: [11.9, groundHeightAt(11.9, -29.5), -29.5], phase: 1.05 },
      { pos: [-13.2, groundHeightAt(-13.2, 13.1), 13.1], to: [-13.8, groundHeightAt(-13.8, 12.4), 12.4], phase: 2.6 },
    ],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints, ambience, casario, casarioMoldes: CASARIO_MOLDES,
    /* Som revisado (vida 1): as duas fontes moravam no centro do mapa com raio 70 m, então
       o funk do baile e os pássaros tocavam IGUAL no beco lá embaixo e no mirante 6 m acima
       — mapa de três cotas com som chapado apaga a subida. Agora cada fonte fica onde a
       cena está: baile na rua (z≈30), rumor da cidade subindo do vale e passarada no topo. */
    sound: { loops: [
      { src: AMB_LOOPS.funk, pos: [0, 3, 30], radius: 42, vol: .34 },
      { src: AMB_LOOPS.cidade, pos: [0, 2, 38], radius: 55, vol: .16 },
      { src: AMB_LOOPS.passaros, pos: [0, H_TOP + 3, -30], radius: 45, vol: .22 },
    ], bioma: 'favela' },
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    stairs: [
      // Inclui um piso da chegada inferior: ele é a superfície antes do primeiro dos 12
      // espelhos e permite que a régua conte a primeira transição, não só as 11 internas.
      { nome: 'lance inferior', x0: X0, x1: X1, z0: F1.z0, z1: F1.z1 + ESC.piso, topo: RISE },
      // O caveirão atravessa a metade oeste; a metade leste continua com largura normativa.
      { nome: 'lance central', x0: 0, x1: X1, z0: F2.z0, z1: F2.z1 + ESC.piso, topo: RISE * 2 },
      { nome: 'lance superior', x0: X0, x1: X1, z0: F3.z0, z1: F3.z1 + ESC.piso, topo: H_TOP },
      { nome: 'flanco oeste central', x0: AUX_X - AUX_W / 2, x1: AUX_X + AUX_W / 2, z0: AUX_F2.z0, z1: AUX_F2.z1 + ESC.piso, topo: RISE * 2 },
      { nome: 'flanco oeste superior', x0: AUX_X - AUX_W / 2, x1: AUX_X + AUX_W / 2, z0: AUX_F3.z0, z1: AUX_F3.z1 + ESC.piso, topo: H_TOP },
    ],
    levels: [{ nome: 'mirante', x0: -16, x1: 16, z0: -39, z1: TOP_Z, dePartida: 'E' }],
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
