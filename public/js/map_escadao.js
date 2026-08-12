// ESCADÃO (fy_escadao) — spec plans/12-ESCADAO.md: comunidade cortada por uma ESCADARIA
// MONUMENTAL de azulejo colorido (estilo Selarón, genérico). Um time nasce EMBAIXO (rua com
// bar e mercadinho); o outro nasce EM CIMA (laje-mirante). Entre os dois: o escadão, com
// BARRICADAS nos patamares e um CAVEIRÃO atravessado no patamar central.
//
// PLANTA (eixo longo = z; norte = -z, subida). Faixas em x:
//   beco O   x ∈ [-15, -9]    escada x ∈ [-2,5, 2,5]    beco L   x ∈ [9, 15]
//   BASE     z ∈ [14, 40]  y=0
//   ESCADA   termina em TOP_Z e sobe até H_TOP em 3 lances com patamares
//   TOPO     z ∈ [-40, TOP_Z] y=H_TOP
//
// O QUE FAZ A CTF2 FECHAR: os dois BECOS laterais têm escadas PRÓPRIAS que sobem do nível da
// rua (y=0) até o PATAMAR 1 (y=RISE). Cada beco é uma rota independente separada por ≥ 6 m
// do eixo da escada central — é o que dá as 2+ rotas separadas entre spawn e bandeira.
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';
import { setMapSky } from './map_sky.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 18, HALF_Z = 40;

export const ESCADAO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_dagua'];

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
// becos
const BW = { x0: -15, x1: -9 };   // beco oeste
const BE = { x0: 9,   x1: 15 };   // beco leste
// escada do beco: sobe de y=0 a y=RISE
const B_STAIR = { z0: 11 - RUN, z1: 11 };
// Laje de chegada da escada do beco (a "boca" de cima do lance).
const CHEGADA_D = 2.2;
// PLATAFORMA DE CONEXÃO beco -> patamar 1. Ia só de P1.z0 a P1.z1, e a laje de chegada do beco
// morria 1,2 m antes dela: sobrava uma fresta de 0,62 m em x=±9 — menos que o diâmetro do corpo
// (raio 0,42 m). Resultado medido pela régua escadao-rota: a escada do beco leste terminava
// numa laje de 7 m² sem saída e a própria plataforma de conexão (com a bandeira PATAMAR 1 em
// cima) era uma ilha inalcançável. Agora a conexão desce até a testa da chegada do beco, o que
// abre uma frente de 2,2 m entre as duas lajes na mesma cota (y = RISE).
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
    root.add(o); occluders.push(o);
    return o;
  };
  const propAt = (id, x, z, targetH, w, d, mat, ry = 0, y = 0) => {
    const proxy = addBox(w, targetH, d, mat, x, y, z, { ry });
    const o = gprop(id, x, y, z, targetH, ry);
    if (o) proxy.visible = false;
    return o;
  };

  /* ===================== CÉU / LUZ ===================== */
  setMapSky(scene, T, '/img/textures/sky_rj.webp', 0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_escadao');
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
  // casa sólida (mesmo motivo do quebrada: nenhum interior acessível)
  function casa(x, z, w, d, h, matIdx, y = 0) {
    const mat = PAREDES[matIdx % PAREDES.length];
    // A fundação vira fachada inferior vista do vale e impede casa flutuante nos terraços.
    if (y > 0.05) addBox(w, y, d, MAT.concreteDark, x, 0, z);
    addBox(w, h, d, mat, x, y, z);
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
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
      addBox(ESC.larg, 0.06, ESC.piso, pisoMat, 0, yTop - 0.06, zc, { collide: false });
      addBox(ESC.larg, ESC.espelho, 0.04, MAT_AZ_LONG, 0, yTop - ESC.espelho, zNariz, { collide: false });
    }
    // O AABB contínuo preserva o bloqueio físico anterior; visualmente, o paredão alto é
    // substituído por muretas que acompanham a subida em módulos de quatro degraus.
    for (const sx of [X0 - 0.15, X1 + 0.15]) {
      col(sx - 0.15, sx + 0.15, 0, yBase + RISE + 0.5, z0 - 0.15, z1 + 0.15);
      for (let k = 0; k < ESC.n; k += 4) {
        const n = Math.min(4, ESC.n - k), d = n * ESC.piso + 0.05;
        const z = z1 - (k + n / 2) * ESC.piso;
        addBox(0.28, 1.08, d, MAT_AZ_LONG, sx, yBase + (k + 1) * ESC.espelho, z, { collide: false, skirt: false });
        addBox(0.34, 0.055, d + 0.04, AZ_CAPS[(k / 4 + Math.round(yBase / RISE)) % AZ_CAPS.length],
          sx, yBase + (k + 1) * ESC.espelho + 1.08, z, { collide: false, cast: false, skirt: false });
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
      addBox(w, 0.06, p, MAT.concrete, xCenter, y - 0.06, z, { collide: false });
      addBox(w, ESC.espelho, 0.04, MAT.concrete, xCenter, y - ESC.espelho, z1 - (k - 1) * p, { collide: false });
    }
  }

  // Mesmo perfil Blondel da escada central, mas em viela estreita. As muretas seguem os
  // degraus em módulos, de modo que a rota alternativa seja geometria real e segura.
  function buildAuxFlight(flight, yBase) {
    for (let k = 1; k <= ESC.n; k++) {
      const yTop = yBase + k * ESC.espelho;
      const zc = flight.z1 - (k - 0.5) * ESC.piso;
      const zNariz = flight.z1 - (k - 1) * ESC.piso;
      addBox(AUX_W, 0.06, ESC.piso, MAT.concrete, AUX_X, yTop - 0.06, zc, { collide: false });
      addBox(AUX_W, ESC.espelho, 0.04, MAT_AZ_LONG, AUX_X, yTop - ESC.espelho, zNariz, { collide: false });
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

  // Muros laterais dos patamares (proteção + bloqueio de visão).
  // O muro do PATAMAR 1 corria os 4 m inteiros e era ele que selava o patamar das duas
  // plataformas de conexão — a escada do beco leste morria numa laje de 7 m² e a bandeira
  // PATAMAR 1 ficava numa ilha. Agora ele é partido em dois trechos com um VÃO de 2 m no
  // meio: a rota beco → conexão → patamar 1 que o mapa sempre declarou passa a existir de
  // verdade. O muro do PATAMAR 2 continua inteiro: ali fora não há laje nenhuma, é queda
  // de 4 m para a rua, e o muro é a guarda.
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
        addBox(0.04, 1.0, 0.04, lam({ color: 0x3a3a3a, metalness: 0.6, roughness: 0.4 }), sx, yBase + i * ESC.espelho, z1 - i * ESC.piso, { collide: false, skirt: false });
  }
  corrimao(F1.z0, F1.z1, 0);
  corrimao(F2.z0, F2.z1, RISE);
  corrimao(F3.z0, F3.z1, RISE * 2);

  /* ===================== BECOS LATERAIS (flancos com escada própria) =====================
     Cada beco é um corredor de 6 m de largura (x ∈ [±9, ±15]) que sobe do nível da rua
     (y=0) até a altura do PATAMAR 1 (y=RISE). A escada do beco usa a mesma corrida da central.
     O beco desemboca numa plataforma de conexão (x ∈ [±5, ±9]) que liga ao patamar 1.
     Isto é o que dá as 2+ rotas separadas (CTF2): a rota central (escadão) e a rota lateral
     (beco) ficam separadas por ≥ 6 m. */
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
    // As duas bordas de queda (2,04 m) ficam fechadas por mureta — MAP6 exige guarda em toda
    // borda alcançável com queda ≥ 2 m. O acesso continua aberto pela chegada do beco (x=±9)
    // e pelo vão da mureta do patamar central.
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
  for (const [z, y, ml, mr] of [[12, 0, 1, 0], [5, RISE, 0, 2], [-3.7, RISE * 2, 2, 1]]) {
    casa(-5.5, z, 3, 4, 4, ml, y); casa(5.5, z, 3, 4, 4, mr, y);
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
    // Casco monovolume com frente inclinada. A versão anterior vestia um caminhão-baú
    // com torre/mastro; no frame 3:2 continuava lendo caminhão. Aqui cabine e carroceria
    // são uma única cunha blindada, sem logo, caveira ou insígnia oficial.
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
    const hull = new THREE.Mesh(hullGeo, blindado); hull.castShadow = hull.receiveShadow = true; caveirao.add(hull); occluders.push(hull);
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
  }

  /* ===================== BARRICADAS ===================== */
  // patamar 1: pneus
  const MAT_PNEU = lam({ color: 0x1a1a1a, roughness: 0.95 });
  propAt('pilha_pneus', -1.2, (P1.z0 + P1.z1) / 2, 0.9, 1.6, 1.2, MAT_PNEU, 0, RISE);
  // base: portão arrancado
  addBox(2.5, 1.2, 0.8, lam({ color: 0x4a4a3a, roughness: 0.8 }), 1.5, 0, 14.5);

  /* ===================== BASE (rua) ======================
     Spawn A (E) precisa de cobertura contra tiros da escada e becos.
     A exposição medida é alta (53%) porque a base é um tabuleiro aberto
     visto de cima pela escada. A correção é FECHAR a linha de visão da
     escada para o spawn com prédios no caminho. */
  // bar de esquina (bloqueia visão do beco oeste)
  casa(-12, 32, 6, 5, 3.5, 0);
  addBox(6, 0.8, 0.3, lam({ color: 0x8a4a2a }), -12, 3.5, 29.8, { collide: false });
  // mercadinho (bloqueia visão do beco leste)
  casa(12, 34, 6, 5, 3.5, 2);
  addBox(6, 0.8, 0.3, lam({ color: 0x2a6a4a }), 12, 3.5, 31.8, { collide: false });
  // BLOQUEIO CENTRAL: prédio entre a escada e o spawn (corta a linha de visão do escadão)
  casa(-5, 22, 4, 5, 4, 1);
  casa(5, 22, 4, 5, 4, 0);

  /* ---------- LAJE SOBRE A BOCA DO ESCADÃO (abrigo do spawn E) ----------
     O dono: "dá pra ver o andar do respawn de cima". Medido pela régua escadao-rota:
     205 pontos altos liam o spawn E, 134 deles no mirante inteiro. A causa é simples e não
     tinha nada de exótico: o escadão é uma calha aberta que desce 6,12 m em linha reta até a
     rua, e o parapeito do mirante tem 1,20 m — abaixo dos 1,62 m do olho. Quem está em cima
     olha POR CIMA da própria mureta e enxerga a rua inteira lá embaixo.

     Não dá pra fechar isso na origem sem emparedar o mirante, e mover o spawn era exatamente
     o erro do BUG-32 (esconde o defeito e ele volta no próximo mapa com plataforma). O que
     resolve é atravessar a calha: todas essas visadas passam por z ≈ 15,5 numa faixa estreita
     de altura (≈ 2,4 m a 3,7 m), porque convergem nos 4 slots do spawn, que ocupam menos de
     5 m em x. Uma laje sobre pilotis nessa cota corta a faixa inteira e deixa a passagem a pé
     livre por baixo — que é como uma favela resolve isso na vida real (casa sobre a rua).

     A laje NÃO é piso: `groundHeightAt` não a conhece, então ninguém sobe nela e ela não vira
     plataforma sem saída (a cláusula 1 da régua checaria). Ela é massa e occluder. */
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
  // Caixa d'água Tripo PBR: o cubo preto anterior passava colisão/MAP5, mas na captura
  // 3:2 lia literalmente como um bloco sem autoria. O proxy conserva o mesmo cover e
  // vira fallback quando o GLB não carrega; o asset só substitui os pixels.
  propAt('caixa_dagua', -12, -32, 3.0, 2.5, 2.5,
    lam({ color: 0x1a1a1a, roughness: 0.8 }), 0, H_TOP);
  // barraco de obra (cover)
  casa(12, -33, 5, 4, 3, 3, H_TOP);
  // cobertura lateral preserva a visada do spawn para o cartão-postal central
  casa(-7, -24, 4, 4, 3.5, 1, H_TOP);
  casa(7, -24, 4, 4, 3.5, 0, H_TOP);
  casa(-12, -26, 3, 4, 3, 0, H_TOP);
  casa(12, -27, 3, 4, 3, 1, H_TOP);
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
  fio(-15, 5.2, 32, 15, 5.5, 34); fio(-15, 5.0, 12, 15, 5.3, 12);
  fio(-6, 7.0, 7, 6, 7.2, 7); fio(-6, 12.0, -4, 6, 12.2, -4);
  fio(-14, H_TOP + 5.0, -27, 14, H_TOP + 5.2, -27);
  fio(-14, H_TOP + 5.4, -36, 14, H_TOP + 5.1, -34);

  /* ===================== MUROS DE CONTENÇÃO ===================== */
  for (const sx of [-HALF_X, HALF_X]) {
    col(sx - 0.25, sx + 0.25, 0, H_TOP + 2, -HALF_Z, HALF_Z);
    // A contenção continua física, mas deixa de ser um plano único de concreto: módulos
    // pintados, alturas variadas e telhas recortam a borda como uma fileira de fachadas.
    for (let z = -18; z <= 18; z += 6) {
      const i = Math.round((z + 18) / 6), h = 3.2 + (i % 3) * 0.85;
      addBox(0.42, h, 5.55, PAREDES[(i + (sx > 0 ? 1 : 0)) % PAREDES.length], sx, 0, z, { collide: false });
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
    addBox(5.6, h, 0.42, PAREDES[Math.abs(x / 3) % PAREDES.length], x, 0, -HALF_Z, { collide: false });
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
  // becos: escada própria + conexão ao patamar 1.
  // A reta antiga beco → patamar 1 cortava o muro do beco (x=±9) e o muro do patamar, e por
  // isso `blocked` derrubava os nós do meio: os bots nunca tiveram essa rota. Agora ela é uma
  // cotovelada que segue a geometria real — desce a laje de chegada, atravessa a frente comum
  // em z≈6,2 (única cota onde as duas lajes se encostam) e entra pelo vão da mureta do patamar.
  const CONEX_Z = CONEX.z0 + 0.9, P1_MEIO = (P1.z0 + P1.z1) / 2;
  const rotaBeco = (bx, mx, alvo) => {
    linha(bx, 14, bx, B_STAIR.z0, 1.0);          // escada do beco
    linha(bx, B_STAIR.z0, bx, CONEX_Z, 0.8);     // laje de chegada
    linha(bx, CONEX_Z, mx, CONEX_Z, 1.2);        // frente comum (passa por x=±9)
    linha(mx, CONEX_Z, mx, P1_MEIO, 1.2);        // plataforma de conexão
    linha(mx, P1_MEIO, alvo, P1_MEIO, 1.2);      // vão da mureta → patamar 1
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
     Alternando lados agressivamente (CTF1 pede altura de triângulo ≥ raio de
     captura = 4,5 m). A separação máxima em x entre bandeiras adjacentes é o que
     evita colinearidade. */
  const ctfPoints = [
    { id: 'R', label: 'MIRANTE',     x: 7,   z: -25 },
    { id: 'E', label: 'PATAMAR 2',   x: -7,  z: 1.5 },
    { id: 'P', label: 'PATAMAR 1',   x: 7,   z: 9 },
    { id: 'B', label: 'RUA',         x: -7,  z: 28 },
  ];

  /* ===================== ARSENAL NO CHÃO ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const y = groundHeightAt(x, z); const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, y + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
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
    id: 'fy_escadao',
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

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
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
