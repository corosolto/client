// ESCADÃO (fy_escadao) — spec plans/12-ESCADAO.md: comunidade cortada por uma ESCADARIA
// MONUMENTAL de azulejo colorido (estilo Selarón, genérico). Um time nasce EMBAIXO (rua com
// bar e mercadinho); o outro nasce EM CIMA (laje-mirante). Entre os dois: o escadão, com
// BARRICADAS nos patamares e um CAVEIRÃO atravessado no patamar central.
//
// PLANTA (eixo longo = z; norte = -z, subida). Faixas em x:
//   beco O   x ∈ [-15, -9]    escada x ∈ [-2,5, 2,5]    beco L   x ∈ [9, 15]
//   BASE     z ∈ [14, 40]  y=0
//   ESCADA   z ∈ [-5, 14]  y sobe 0 -> 6,12 em 3 lances com 3 patamares
//   TOPO     z ∈ [-40, -5] y=6,12
//
// O QUE FAZ A CTF2 FECHAR: os dois BECOS laterais têm escadas PRÓPRIAS que sobem do nível da
// rua (y=0) até o PATAMAR 1 (y=2,04). Cada beco é uma rota independente separada por ≥ 6 m
// do eixo da escada central — é o que dá as 2+ rotas separadas entre spawn e bandeira.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 18, HALF_Z = 40;

export const ESCADAO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas'];

// ---- parâmetros da escada (NBR 9077 / Blondel: 2h+p = 0,63) ----
const ESC = { larg: 5.0, espelho: 0.17, piso: 0.29, n: 12 };
const RISE = ESC.espelho * ESC.n;    // 2,04 m por lance
const RUN  = ESC.piso   * ESC.n;     // 3,48 m por lance
const H_TOP = RISE * 3;              // 6,12 m

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
const B_STAIR = { z0: 7.5, z1: 11 };   // 3,5 m de corrida

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
    const cores = ['#3a7ca5', '#5a8fa8', '#b8c4a0', '#d4a347', '#a85c4a', '#6d8b5a', '#c0b280', '#8a4a6a'];
    const az = 32;
    for (let py = 0; py < S; py += az) for (let px = 0; px < S; px += az) {
      x.fillStyle = cores[(rnd() * cores.length) | 0]; x.fillRect(px, py, az, az);
      x.fillStyle = cores[(rnd() * cores.length) | 0];
      x.beginPath(); x.arc(px + az / 2, py + az / 2, 6 + rnd() * 8, 0, 6.283); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.15)'; x.lineWidth = 1; x.strokeRect(px, py, az, az);
    }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(60,55,45,${0.1 + rnd() * 0.2})`; x.beginPath(); x.arc(rnd() * S, rnd() * S, 2 + rnd() * 8, 0, 6.283); x.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex });
  }
  const MAT_AZ = azulejoTex(7019);

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
  const PAREDES = [
    paredeTex('#c4a87a', 0.3, 201), paredeTex('#a89d8a', 0.4, 402),
    paredeTex('#8d6e5a', 0.5, 603), paredeTex('#b0a06a', 0.35, 804),
  ];

  const GLB_ON = QP.get('glb') !== '0';
  const PB = new PropBatch({ bucket: 24 });

  /* ===================== CÉU / LUZ ===================== */
  scene.background = T.sky || new THREE.Color(0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_escadao');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x54483c, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.5); sun.position.set(25, 40, 20); sun.castShadow = true;
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
  function casa(x, z, w, d, h, matIdx) {
    const mat = PAREDES[matIdx % PAREDES.length];
    addBox(w, h, d, mat, x, 0, z);
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    addBox(w + 0.3, 0.12, d + 0.3, MAT.concreteDark, x, h, z, { collide: false });
  }

  // constrói um lance de escada (piso + espelho + muros laterais)
  function buildFlight(flight, yBase, mat) {
    const { z0, z1 } = flight;
    for (let i = 0; i < ESC.n; i++) {
      const zBot = z1 - i * ESC.piso, zTop = z1 - (i + 1) * ESC.piso;
      const yStep = yBase + i * ESC.espelho;
      addBox(ESC.larg, 0.04, ESC.piso + 0.02, mat, 0, yStep, (zBot + zTop) / 2);
      addBox(ESC.larg, ESC.espelho + 0.01, 0.02, mat, 0, yStep, zTop, { collide: false });
    }
    for (const sx of [X0 - 0.15, X1 + 0.15])
      addBox(0.3, yBase + RISE + 0.5, RUN + 0.3, MAT_AZ, sx, 0, (z0 + z1) / 2);
    solids.push({ x0: X0 - 0.5, x1: X0, z0, z1 });
    solids.push({ x0: X1, x1: X1 + 0.5, z0, z1 });
  }

  // patamar (laje plana com muros laterais)
  function buildLanding(z0, z1, y) {
    const w = ESC.larg + 1.0, d = z1 - z0;
    addFloor(w, d, 0, (z0 + z1) / 2, MAT.concrete, y + 0.02);
    addBox(w, 0.12, d, lam({ color: 0x909088 }), 0, y, (z0 + z1) / 2);
  }

  // escada de beco (mais estreita, 3 m de largura)
  function buildBecoStair(xCenter, z1, yBase, yTop) {
    const w = 3.0, n = Math.round((yTop - yBase) / ESC.espelho), p = (B_STAIR.z1 - B_STAIR.z0) / n;
    for (let i = 0; i < n; i++) {
      const z = z1 - i * p, y = yBase + (yTop - yBase) * (i / n);
      addBox(w, 0.04, p + 0.02, MAT.concrete, xCenter, y, z);
    }
  }

  /* ===================== ESCADA CENTRAL (3 lances + 3 patamares) ===================== */
  buildFlight(F1, 0, MAT_AZ);
  buildLanding(P1.z0, P1.z1, RISE);
  buildFlight(F2, RISE, MAT_AZ);
  buildLanding(P2.z0, P2.z1, RISE * 2);
  buildFlight(F3, RISE * 2, MAT_AZ);

  // muros laterais dos patamares (proteção + bloqueio de visão)
  for (const [pz0, pz1, py] of [[P1.z0, P1.z1, RISE], [P2.z0, P2.z1, RISE * 2]]) {
    for (const sx of [X0 - 0.65, X1 + 0.65]) {
      addBox(0.3, 1.5, pz1 - pz0, MAT_AZ, sx, py, (pz0 + pz1) / 2);
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
     (y=0) até a altura do PATAMAR 1 (y=RISE). A escada do beco ocupa z ∈ [7,5 , 11].
     O beco desemboca numa plataforma de conexão (x ∈ [±5, ±9]) que liga ao patamar 1.
     Isto é o que dá as 2+ rotas separadas (CTF2): a rota central (escadão) e a rota lateral
     (beco) ficam separadas por ≥ 6 m. */
  function buildBeco(bx0, bx1, dir) {
    const cx = (bx0 + bx1) / 2;   // centro do beco em x
    // piso do beco (corredor plano na base)
    addFloor(bx1 - bx0, 14 - 7.5, cx, (7.5 + 14) / 2, MAT.concrete, 0.01);
    // escada do beco
    buildBecoStair(cx, B_STAIR.z1, 0, RISE);
    // plataforma de conexão beco → patamar 1 (y=RISE)
    const pcx = bx0 + dir * 2;   // x do centro da plataforma de conexão (puxa pra dentro)
    addFloor(Math.abs(bx1 - 5), 4.5, pcx + dir * 1.5, (P1.z0 + P1.z1) / 2, MAT.concrete, RISE + 0.02);
    addBox(Math.abs(bx1 - 5), 0.12, 4.5, lam({ color: 0x909088 }), pcx + dir * 1.5, RISE, (P1.z0 + P1.z1) / 2);
    // muros das paredes do beco (casas de um e outro lado)
    for (const wx of [bx0, bx1]) {
      addBox(0.4, 4, 7, PAREDES[0], wx, 0, 10.5);
      solids.push({ x0: wx - 0.2, x1: wx + 0.2, z0: 7, z1: 14 });
    }
  }
  buildBeco(BW.x0, BW.x1, 1);   // oeste, dir=+1 (conecta pra direita/centro)
  buildBeco(BE.x0, BE.x1, -1);  // leste, dir=-1 (conecta pra esquerda/centro)

  /* ===================== CASAS LATERAIS ===================== */
  // casas ao longo da escada (janelas = posições de atirador)
  casa(5.5, 12, 3, 4, 4, 0);
  casa(-5.5, 12, 3, 4, 4, 1);
  casa(5.5, 2, 3, 4, 4, 2);
  casa(-5.5, 2, 3, 4, 4, 0);
  casa(5.5, -2, 3, 4, 4, 1);
  casa(-5.5, -2, 3, 4, 4, 2);

  /* ===================== CAVEIRÃO (patamar central) ===================== */
  {
    const cy = RISE * 2;
    const cvX = -0.8;
    addBox(4.0, 2.0, 2.2, lam({ color: 0x1a1a1e, roughness: 0.7, metalness: 0.3 }), cvX, cy, (P2.z0 + P2.z1) / 2);
    addBox(1.5, 2.4, 2.2, lam({ color: 0x15151a, roughness: 0.7, metalness: 0.3 }), cvX - 1.2, cy, (P2.z0 + P2.z1) / 2);
    for (const [wx, wz] of [[cvX - 1.3, P2.z0 + 0.5], [cvX + 1.3, P2.z0 + 0.5], [cvX - 1.3, P2.z1 - 0.5], [cvX + 1.3, P2.z1 - 0.5]])
      addBox(0.8, 0.8, 0.5, lam({ color: 0x0a0a0a, roughness: 0.9 }), wx, cy, wz);
  }

  /* ===================== BARRICADAS ===================== */
  // patamar 1: pneus
  for (let i = 0; i < 3; i++)
    addBox(1.6, 0.8, 1.0, lam({ color: 0x1a1a1a, roughness: 0.9 }), -1.5 + i * 0.7, RISE, (P1.z0 + P1.z1) / 2);
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
  casa(0, 25, 3, 4, 3.5, 2);
  // mesas do bar
  for (const [mx, mz] of [[-9, 29], [-7, 30]]) addBox(1.2, 0.75, 1.2, lam({ color: 0xcca060 }), mx, 0, mz);
  // carros
  for (const [cx, cz, cry] of [[7, 30, 0.1], [-7, 36, -0.05]])
    addBox(1.8, 1.4, 4.0, lam({ color: cry > 0 ? 0x8a2020 : 0x202060, roughness: 0.3, metalness: 0.5 }), cx, 0, cz, { ry: cry });

  /* ===================== TOPO (mirante) =====================
     Spawn B precisa de cobertura contra tiros da escada. */
  // caixa d'água (cover alto)
  addBox(2.5, 3.0, 2.5, lam({ color: 0x1a1a1a, roughness: 0.8 }), -7, H_TOP, -20);
  // barraco de obra (cover)
  casa(7, -25, 5, 4, 3, 3);
  // prédios de cobertura entre a escada e o spawn do topo (barreira escalonada)
  casa(-5, -12, 4, 4, 3.5, 1);
  casa(5, -12, 4, 4, 3.5, 0);
  casa(0, -14, 3, 4, 3.5, 2);
  casa(-9, -15, 3, 5, 3, 0);
  casa(9, -15, 3, 5, 3, 1);
  casa(0, -20, 4, 4, 3, 2);
  casa(-7, -22, 3, 4, 3, 1);
  // muretas de mirante (cover agachado) — longe dos slots de spawn (z=-28)
  for (const [mx, mz] of [[3, -34], [-3, -36], [6, -38], [-6, -22]])
    addBox(2.0, 1.0, 0.5, MAT.concrete, mx, H_TOP, mz);
  // antena
  addBox(0.08, 4.0, 0.08, lam({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.3 }), 6, H_TOP, -30, { collide: false });

  /* ===================== MUROS DE CONTENÇÃO ===================== */
  for (const sx of [-HALF_X, HALF_X])
    addBox(0.5, H_TOP + 2, 40, MAT.concrete, sx, 0, 0);
  addBox(HALF_X * 2 + 1, H_TOP + 2, 0.5, MAT.concrete, 0, 0, -HALF_Z);
  addBox(HALF_X * 2 + 1, 2, 0.5, MAT.concrete, 0, 0, HALF_Z);
  // muro do mirante (lado escada) com vão de entrada
  addBox(7, 1.2, 0.4, MAT.concrete, -HALF_X + 3.5, H_TOP, TOP_Z);
  addBox(7, 1.2, 0.4, MAT.concrete, HALF_X - 3.5, H_TOP, TOP_Z);

  /* ===================== GROUND HEIGHT (multinível) ===================== */
  function rampHeight(z, z1, yBase) {
    return yBase + RISE * Math.max(0, Math.min(1, (z1 - z) / RUN));
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
    if (z >= P2.z0 && z <= P2.z1) return RISE * 2;
    if (z >= P1.z0 && z <= P1.z1) {
      // patamar 1: a própria laje OU a plataforma de conexão do beco
      if (inConexao(x) || (x >= X0 && x <= X1)) return RISE;
      return RISE;   // todo o patamar 1 está em RISE
    }
    if (z >= F3.z0 && z <= F3.z1) return rampHeight(z, F3.z1, RISE * 2);
    if (z >= F2.z0 && z <= F2.z1) return rampHeight(z, F2.z1, RISE);
    if (z >= F1.z0 && z <= F1.z1) return rampHeight(z, F1.z1, 0);
    // beco: escada própria entre z=7,5 e z=11
    if (inBeco(x) && z >= B_STAIR.z0 && z <= B_STAIR.z1) return becoRampHeight(z);
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
  // patamares: cruzeta de um lado ao outro
  linha(-2.5, P1.z1, 2.5, P1.z0, 1.2);
  linha(-2.5, P2.z1, 2.5, P2.z0, 1.2);
  // beco oeste: escada própria + conexão ao patamar 1
  linha(-12, 14, -12, 7.5, 1.0);   // escada do beco
  linha(-12, 7.5, -3, 9, 1.2);     // conexão beco → patamar 1
  // beco leste
  linha(12, 14, 12, 7.5, 1.0);
  linha(12, 7.5, 3, 9, 1.2);
  // base
  for (const bz of [20, 25, 30, 35]) linha(-15, bz, 15, bz, 3.0);
  // topo
  for (const bz of [-10, -18, -26, -34]) linha(-15, bz, 15, bz, 3.0);
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
    E: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 36, yaw: 0 })),
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -28, yaw: Math.PI })),
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
  place('m4', 1.5, 9);      place('shotgun', -1.5, 1.5);
  place('mp5', 0, -2);      place('awp', -6, -22);
  place('m400', 7, -28);    place('ak', 0, -33);
  place('deagle', 10, -25); place('mp5', -12, 10);
  place('mp5', 12, 10);

  PB.build(root);
  SKIRT.build(root);

  /* ===================== GRAFFITI ===================== */
  const D_PIXO = decalIds(T, ['folha-pixaca-01.png', 'folha-pixaca-02.png', 'folha-pixaca-03.png', 'folha-pixaca-04.png', 'folha-pixaca-05.png']);
  const D_THROW = decalIds(T, ['folha-throwu-01.png', 'folha-throwu-02.png', 'folha-throwu-03.png', 'folha-throwu-04.png', 'folha-throwu-05.png']);
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png']);
  const D_MURAL = decalIds(T, ['personagem-muro.png', 'personagens-graffiti-01.png', 'personagens-graffiti-02.png', 'personagens-graffiti-03.png']);
  const D_CARA = decalIds(T, ['caras-cartoon-02.png', 'caras-cartoon-05.png', 'caras-cartoon-08.png']);
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png']);
  const D_PERSO = decalIds(T, ['folha-person-01.png', 'folha-person-02.png', 'folha-person-03.png']);
  const D_CARTAZERA = decalIds(T, ['folha-lambes.png', 'folha-stenci.png']);
  const D_ADESIVO = decalIds(T, ['tags-treino-01.png', 'tags-treino-02.png', 'tags-treino-03.png']);
  grafitar({
    id: 'fy_escadao',
    root, T, waypoints: nodes, seed: 8012, passo: 0.72, alcance: 9, cobre: 0.06, minLarg: 0.3,
    bandas: [
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 30, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.25, y1: 2.35, larg: 3.6, alturas: [2.0, 1.5, 1.1, 0.8, 0.6],
        pool: D_PIXO.concat(D_THROW, D_TAG, D_CARTAZERA, D_LAMBE, D_PERSO) },
      { y0: 2.3, y1: 4.3, larg: 4.4, alturas: [1.9, 1.4, 1.0],
        pool: D_MURAL.concat(D_CARA, D_PERSO, D_THROW) },
      { y0: 0.3, y1: 2.9, larg: 1.7, alturas: [0.95, 0.7, 0.5, 0.38], planura: 0.5,
        pool: D_TAG.concat(D_ADESIVO) },
    ],
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
