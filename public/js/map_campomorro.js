// CAMPO DO MORRO (fy_campomorro) — spec plans/11-CAMPO-DO-MORRO.md: morro carioca com
// CAMPO DE VÁRZEA no centro — todos os becos convergem pra ele. Um time nasce no campo
// (centro, exposto); o outro nasce no GALPÃO DO BAILE FUNK (periferia, protegido, tem que
// descer). O mapa é CONVERGÊNCIA: todo caminho leva ao campo, e quem segura o campo segura
// o jogo.
//
// PLANTA (eixo longo = z; norte = -z). Faixas em x:
//   GALPÃO    z ∈ [-42, -26]  y=0   spawn B (paredão de som, portão de aço)
//   BECOS     z ∈ [-26, -10]  y=0   4 vielas convergindo do galpão pro campo
//   CAMPO     z ∈ [-10, 15]   y=0   campo de várzea (~40 × 25 m jogáveis)
//   ARQUIBANC z ∈ [15, 20]    y=0   arquibancada de cimento + vestiário container
//   MURO SUL  z ∈ [20, 25]    y=0   muro com grafite de homenagem
//
// O DESENHO é assimétrico de propósito: centro exposto × periferia protegida. O
// balanceamento mora no número de saídas do galpão: o time B precisa vigiar 4 bocas de
// beco, e cada uma chega numa borda diferente do campo.
import * as THREE from 'three';
import { placeProp, hasProp, PropBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 24, HALF_Z = 42;

export const CAMPOMORRO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_som', 'arquibancada'];

// fronteiras das zonas
const GALP = { z0: -HALF_Z, z1: -26 };
const ALLEY = { z0: -26, z1: -10 };
const CAMPO = { z0: -10, z1: 15 };
const ARQ = { z0: 15, z1: 20 };

export function buildCampoMorro(scene, T) {
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
  // terra de campo de várzea (mais verde que o dirt genérico)
  const MAT_CAMPO = lam({ map: T.grass, color: 0x8a8a5a, roughness: 1.0 });

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

  // ---- textura de parede de comunidade ----
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
    paredeTex('#c4a87a', 0.3, 301), paredeTex('#a89d8a', 0.4, 502),
    paredeTex('#8d6e5a', 0.5, 703), paredeTex('#b0a06a', 0.35, 904),
  ];
  // textura do alambrado (malha de ferro)
  function alambradoTex() {
    const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, S, S);
    x.strokeStyle = 'rgba(120,120,110,0.6)'; x.lineWidth = 1;
    for (let i = 0; i <= S; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, S); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(S, i); x.stroke(); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return lam({ map: tex, transparent: true, side: THREE.DoubleSide });
  }
  const MAT_ALAM = alambradoTex();

  const PB = new PropBatch({ bucket: 24 });

  /* ===================== CÉU / LUZ ===================== */
  scene.background = T.sky || new THREE.Color(0xb9c6d2);
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_campomorro');
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x54483c, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 1.5); sun.position.set(30, 40, 10); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X - 5; sun.shadow.camera.right = HALF_X + 5;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO ===================== */
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, MAT.dirt, -0.01);
  // campo de várzea (terra/sintético gasto)
  addFloor(40, 25, 0, (CAMPO.z0 + CAMPO.z1) / 2, MAT_CAMPO, 0.01);
  // piso do galpão (cimento)
  addFloor(HALF_X * 2, GALP.z1 - GALP.z0, 0, (GALP.z0 + GALP.z1) / 2, MAT.concrete, 0.01);

  /* ===================== HELPERS ===================== */
  function casa(x, z, w, d, h, matIdx) {
    const mat = PAREDES[matIdx % PAREDES.length];
    addBox(w, h, d, mat, x, 0, z);
    solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    addBox(w + 0.3, 0.12, d + 0.3, MAT.concreteDark, x, h, z, { collide: false });
  }

  // alambrado como parede parcial (não colide mas é visível — cover visual)
  function alambrado(x, z, w, h, d) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), MAT_ALAM);
    if (d) { m.position.set(x, h / 2, z); } else { m.position.set(x, h / 2, z); m.rotation.y = Math.PI / 2; }
    root.add(m);
  }

  /* ===================== GALPÃO DO BAILE (spawn B) =====================
     Estrutura no extremo norte. Interior jogável com paredão de som como
     cover central. Duas saídas para becos distintos. O portão de aço fica
     meio aberto — é a boca principal pro campo. */
  // paredes do galpão: norte (cheia) + sul (com portão). Laterais FICAM ABERTAS —
  // é um galpão de baile, não uma fortaleza. Sem isto, as laterais bloqueavam os becos
  // e TODO caminho do spawn B saía pelo portão sul, dando 1 rota só na CTF2.
  addBox(HALF_X * 2, 5, 0.4, MAT.concrete, 0, 0, GALP.z0 + 0.2);    // parede norte
  // telhado do galpão
  addBox(HALF_X * 2, 0.2, GALP.z1 - GALP.z0, lam({ color: 0x3a3a3a, roughness: 0.8, metalness: 0.3 }), 0, 5, (GALP.z0 + GALP.z1) / 2, { collide: false });
  // parede sul do galpão com PORTÃO central + VÃOS DOS BECOS nos pontos onde os
  // becos NW (-16) e NE (16) desembocam. Sem estes vãos, TODO caminho dos becos
  // ao galpão é forçado pelo portão central, e a CTF2 vê 1 rota só.
  {
    const z = GALP.z1;
    // segmentos sólidos da parede: tudo exceto os vãos
    const vaos = [[-19, -13], [-3, 3], [13, 19]].sort((a, b) => a[0] - b[0]);
    let x = -HALF_X + 0.2;
    for (const [g0, g1] of vaos) {
      if (g0 > x) {
        addBox(g0 - x, 4, 0.4, MAT.concrete, (x + g0) / 2, 0, z);
        solids.push({ x0: x, x1: g0, z0: z - 0.3, z1: z + 0.3 });
      }
      x = g1;
    }
    if (HALF_X - 0.2 > x) {
      addBox(HALF_X - 0.2 - x, 4, 0.4, MAT.concrete, (x + HALF_X - 0.2) / 2, 0, z);
      solids.push({ x0: x, x1: HALF_X - 0.2, z0: z - 0.3, z1: z + 0.3 });
    }
  }
  // pilares de canto do galpão
  for (const cx of [-HALF_X + 0.5, HALF_X - 0.5])
    addBox(0.6, 5, 0.6, MAT.concreteDark, cx, 0, GALP.z1);

  // PAREDÃO DE SOM — cover central do galpão
  addBox(8.0, 3.0, 1.0, lam({ color: 0x1a1a1a, roughness: 0.9 }), 0, 0, -35);
  // caixas de equipamento
  addBox(2.0, 1.2, 1.5, lam({ color: 0x2a2a2a }), -8, 0, -36);
  addBox(1.5, 1.0, 1.5, lam({ color: 0x2a2a2a }), 8, 0, -36);
  // mesa de DJ
  addBox(2.5, 1.0, 0.8, lam({ color: 0x1a1a1a }), 0, 0, -40);
  // luz estroboscópica (decoração — cilindro escuro no teto)
  addBox(0.3, 0.3, 0.3, lam({ color: 0x0a0a0a }), 0, 4.6, -35, { collide: false });

  /* ===================== BECOS (4 vielas convergindo) =====================
     Cada beco é um corredor de ~3 m de largura com casas dos dois lados.
     Todos terminam numa borda DIFERENTE do campo — é o que faz a convergência.
     O afastamento entre becos é ≥ 6 m (CTF2). */
  function beco(cx, z0, z1, matBase) {
    const w = 3.5, mw = w / 2;
    // paredes (casas) dos dois lados
    for (const [wx, side] of [[cx - mw - 2, -1], [cx + mw + 2, 1]]) {
      casa(wx, (z0 + z1) / 2 - 4, 4, 4, 3.5, matBase);
      casa(wx, (z0 + z1) / 2 + 4, 4, 4, 3 + ((wx * 3) % 2), matBase + 1);
      if (Math.abs(z1 - z0) > 14) casa(wx, (z0 + z1) / 2, 4, 4, 3.5, matBase + 2);
    }
  }
  // 4 becos, bem separados em x (≥ 6 m entre centros)
  beco(-16, -26, -10, 0);   // NW
  beco(-5, -26, -10, 1);    // centro-O
  beco(6, -26, -10, 2);     // centro-L
  beco(16, -26, -10, 0);    // NE

  /* ===================== CAMPO DE VÁRZEA ===================== */
  // TRAVES (gol) — na diagonal menor do campo
  // trave oeste
  for (const sx of [-18, -17]) { addBox(0.1, 2.4, 0.1, lam({ color: 0xffffff }), sx, 0, CAMPO.z0 + 2); addBox(0.1, 0.1, 1.5, lam({ color: 0xffffff }), sx, 2.4, CAMPO.z0 + 2); }
  // trave leste
  for (const sx of [17, 18]) { addBox(0.1, 2.4, 0.1, lam({ color: 0xffffff }), sx, 0, CAMPO.z1 - 2); addBox(0.1, 0.1, 1.5, lam({ color: 0xffffff }), sx, 2.4, CAMPO.z1 - 2); }
  // rede (caixa fina atrás da trave)
  // ALAMBRADO nas laterais do campo (parede parcial)
  for (const fx of [-20, 20]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(25, 2.5), MAT_ALAM);
    m.position.set(fx, 1.25, (CAMPO.z0 + CAMPO.z1) / 2); m.rotation.y = Math.PI / 2; root.add(m);
    // postes do alambrado
    for (const pz of [CAMPO.z0, CAMPO.z0 + 8, (CAMPO.z0 + CAMPO.z1) / 2, CAMPO.z1 - 8, CAMPO.z1])
      addBox(0.08, 2.5, 0.08, lam({ color: 0x3a3a3a, metalness: 0.5 }), fx, 0, pz, { collide: false });
  }
  // trecho de alambrado DERRUBADO (cover improvisado no campo)
  addBox(4.0, 1.0, 0.1, MAT_ALAM, -14, 0, 2, { ry: 0.3, collide: false });
  // BANCO DE RESERVAS
  addBox(3.0, 0.5, 0.6, lam({ color: 0x8a6a3a }), -8, 0, CAMPO.z1 - 4);
  // CONTAINER do vestiário
  addBox(6.0, 2.5, 2.5, lam({ color: 0x4a6a4a, roughness: 0.7 }), 12, 0, CAMPO.z1 - 3);
  solids.push({ x0: 9, x1: 15, z0: CAMPO.z1 - 4.25, z1: CAMPO.z1 - 1.75 });

  /* ===================== ARQUIBANCADA ===================== */
  // degraus de cimento (3 níveis)
  for (let i = 0; i < 3; i++)
    addBox(HALF_X * 2, 0.5, 1.5, MAT.concrete, 0, 0, ARQ.z0 + i * 1.5 + 0.75);
  // placa de "churrasco do troféu"
  addBox(3.0, 1.5, 0.1, lam({ color: 0x8a4a2a }), -10, 1.5, ARQ.z1 - 0.5, { collide: false });

  /* ===================== MURO SUL (com grafite de homenagem) ===================== */
  addBox(HALF_X * 2, 3, 0.4, MAT.concrete, 0, 0, HALF_Z - 0.2);
  // muros laterais (norte já tem o galpão; sul tem muro)
  for (const sx of [-HALF_X, HALF_X]) {
    addBox(0.5, 3, HALF_Z * 2, MAT.concrete, sx, 0, 0);
  }

  /* ===================== BARRACAS E COMÉRCIO PERTO DO CAMPO ===================== */
  // barraquinha de lanche (na borda do campo)
  casa(-12, 5, 3, 3, 2.5, 1);
  addBox(3, 0.5, 0.1, lam({ color: 0xcc4422 }), -12, 2.5, 3.6, { collide: false });
  // barraca de camelô
  casa(10, -5, 3, 3, 2.5, 0);

  /* ===================== CARROS ===================== */
  for (const [cx, cz, cry] of [[-15, -20, 0.2], [14, -22, -0.1]])
    addBox(1.8, 1.4, 4.0, lam({ color: cry > 0 ? 0x8a2020 : 0x202060, roughness: 0.3, metalness: 0.5 }), cx, 0, cz, { ry: cry });

  /* ===================== GROUND HEIGHT (plano) ===================== */
  const groundHeightAt = () => 0;

  /* ===================== WAYPOINTS + A* ===================== */
  const nodes = [], adj = [], STEP = 3.4;
  const insideSolid = (x, z, inf) => { for (const s of solids) if (x > s.x0 - inf && x < s.x1 + inf && z > s.z0 - inf && z < s.z1 + inf) return true; return false; };
  const blocked = (x, z, inf) => {
    if (insideSolid(x, z, inf)) return true;
    for (const c of colliders) if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < 1.6 && c.maxY > 0.15) return true;
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });

  const linha = (x0, z0, x1, z1, passo = 2.4, inf = 0.35) => {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / passo));
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; if (!blocked(x, z, inf)) nodes.push({ x, z }); }
  };
  // adensamento nos becos (corredores estreitos não pegam nós da grade 3,4 m)
  for (const bx of [-16, -5, 6, 16]) linha(bx, -26, bx, -10, 2.0);
  // dentro do galpão (incluindo as laterais abertas que conectam aos becos)
  for (const bz of [-40, -37, -34, -31, -28]) linha(-20, bz, 20, bz, 3.0);
  // bordas laterais do galpão (conectam becos NW/NE ao interior)
  linha(-20, -26, -20, -40, 3.0);
  linha(20, -26, 20, -40, 3.0);
  // adensamento nos cantos do galpão (pickups)
  linha(-12, -40, -12, -34, 2.0);
  linha(12, -40, 12, -34, 2.0);
  linha(-8, -40, -8, -34, 2.0);
  linha(8, -40, 8, -34, 2.0);
  // travessias do campo
  for (const bz of [-8, -4, 0, 4, 8, 12]) linha(-19, bz, 19, bz, 3.0);
  // arquibancada
  linha(-20, 16, 20, 16, 3.0);
  linha(-20, 18, 20, 18, 3.0);
  // bordas do campo
  linha(-20, -8, -20, 14, 3.0);
  linha(20, -8, 20, 14, 3.0);
  // conexões beco → campo
  for (const bx of [-16, -5, 6, 16]) linha(bx, -10, bx, -7, 2.0);
  // portas laterais do galpão (garantem 3 saídas separadas para CTF2)
  linha(-HALF_X + 0.5, -32, -20, -32, 2.0);
  linha(HALF_X - 0.5, -32, 20, -32, 2.0);

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

  /* ===================== SPAWNS =====================
     Time A (E) no CAMPO (centro, exposto por desenho)
     Time B (B) no GALPÃO (protegido, tem que descer) */
  const spawns = {
    E: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: 3, yaw: Math.PI })),   // olhando pra cima (norte)
    B: [-4.5, -1.5, 1.5, 4.5].map(x => ({ x, z: -38, yaw: 0 })),       // olhando pra baixo (sul)
  };

  /* ===================== CTF — 4 BANDEIRAS =====================
     Convergência: as bandeiras cobrem o caminho do galpão ao fundo do campo.
     Alternam lados para evitar colinearidade. */
  const ctfPoints = [
    { id: 'R', label: 'GALPAO',     x: 10,  z: -32 },
    { id: 'C', label: 'CAMPO',      x: -10, z: -2 },
    { id: 'P', label: 'TRAVE',      x: 10,  z: 10 },
    { id: 'B', label: 'ARQUIBANC',  x: -10, z: 17 },
  ];

  /* ===================== ARSENAL NO CHÃO ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  // dentro do galpão
  place('ak', -8, -36);    place('mp5', 8, -36);
  place('shotgun', -5, -38); place('deagle', 5, -34);
  // becos
  place('mp5', -16, -18);  place('m4', 16, -18);
  place('shotgun', -5, -20); place('mp5', 6, -20);
  // campo
  place('ak', -10, 0);     place('m4', 10, 5);
  place('awp', -15, -8);   place('m400', 15, 12);
  place('deagle', 0, 8);   place('shotgun', -8, 12);
  // arquibancada
  place('ak', 8, 16);      place('mp5', -8, 16);

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
    id: 'fy_campomorro',
    root, T, waypoints: nodes, seed: 5077, passo: 0.72, alcance: 9, cobre: 0.06, minLarg: 0.3,
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 71, separacao: 15 },
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
