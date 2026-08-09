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
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';
import { detailFor } from './textures.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();

export const HALF_X = 24, HALF_Z = 40;
const CORREGO_W = 6;          // largura do córrego
const CORREGO_X0 = -CORREGO_W / 2, CORREGO_X1 = CORREGO_W / 2;

export const CORREGO_PROPS = ['pilha_pneus', 'tires', 'dumpster', 'moto_cg', 'fusca',
  'mesa_guardasol', 'guarda_sol', 'stall', 'arara_roupas', 'caixa_som'];

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
  let TEX = { dirt: lam({ map: T.dirt }), concrete: lam({ map: T.concrete }),
    asphalt: lam({ map: T.asphalt }), concreteDark: lam({ map: T.concreteDark }) };
  if (typeof document !== 'undefined') {
    const load = (url, rx = 4, ry = 4) => {
      const t = new THREE.TextureLoader().load(url);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
      return t;
    };
    TEX.dirt = lam({ map: load('/img/textures/dirt_field.webp', 5, 8), roughness: 1.0 });
    TEX.wall = lam({ map: load('/img/textures/madeira.webp', 2, 2) });         // parede de madeira
    TEX.zinco = lam({ map: load('/img/textures/zinco.webp', 3, 3), metalness: 0.4, roughness: 0.6 });
    TEX.asphalt = lam({ map: load('/img/textures/asphalt_br.webp', 5, 8) });
    TEX.concrete = lam({ map: load('/img/textures/concrete_br.webp', 3, 5) });
    TEX.agua = lam({ map: load('/img/textures/agua_poluida.webp', 2, 6), roughness: 0.2, metalness: 0.1 });
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

  /* ===================== CÉU / LUZ ===================== */
  if (typeof document !== 'undefined') {
    scene.background = new THREE.TextureLoader().load('/img/textures/sky_sp.webp');
  } else {
    scene.background = T.sky || new THREE.Color(0xb9a08a);
  }
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('fy_corrego');
  const hemi = new THREE.HemisphereLight(0xd8b89a, 0x4a3830, 0.85); scene.add(hemi);   // mais quente/amarelado
  const sun = new THREE.DirectionalLight(0xffc888, 1.3); sun.position.set(20, 35, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
  sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
  sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
  sun.shadow.camera.far = 180; sun.shadow.bias = -0.0006;
  scene.add(sun); scene.add(sun.target);

  /* ===================== CHÃO DAS MARGENS ===================== */
  // terra batida sob tudo
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, TEX.dirt, -0.01);
  // asfalto nas vielas principais de cada margem
  addFloor(21, HALF_Z * 2, -13.5, 0, TEX.asphalt || lam({ map: T.asphalt }), 0.01);
  addFloor(21, HALF_Z * 2, 13.5, 0, TEX.asphalt || lam({ map: T.asphalt }), 0.01);

  /* ===================== O CÓRREGO =====================
     Água escura no centro do mapa. É um colisor (não dá pra atravessar a pé),
     mas as PONTES passam por cima. O jacaré é decoração dentro da água. */
  // água (plano baixo com textura poluída)
  addFloor(CORREGO_W, HALF_Z * 2, 0, 0, TEX.agua || lam({ color: 0x2a3a1a, roughness: 0.2 }), -0.25);
  // taludes (margens inclinadas de concreto)
  for (const [tx, tz] of [[CORREGO_X0, 0], [CORREGO_X1, 0]]) {
    addBox(1.5, 1.0, HALF_Z * 2, TEX.concrete || lam({ map: T.concrete }), tx + (tx < 0 ? 0.75 : -0.75), -1.0, 0);
  }
  // colisor do córrego (intransponível)
  col(CORREGO_X0, CORREGO_X1, -2.0, 0.1, -HALF_Z + 6, HALF_Z - 6);
  // ALAGADO nas pontas (não tem colisor — anda por cima, só é visual de água rasa)
  // norte
  addFloor(CORREGO_W + 4, 6, 0, -HALF_Z + 3, TEX.agua || lam({ color: 0x2a3a1a }), 0.02);
  addFloor(CORREGO_W + 4, 6, 0, HALF_Z - 3, TEX.agua || lam({ color: 0x2a3a1a }), 0.02);
  // remover colisor do córrego nos trechos alagados (substituir por chão andável)
  // — o col() acima já exclui as 6m de cada ponta ([-HALF_Z+6, HALF_Z-6])

  /* ===================== JACARÉ (decoração no córrego) =====================
     Modelo procedural simples: corpo + cauda + focinho. Verde-marrom, olhos
     vermelhos. Não é colisor (não bloqueia tiro nem movimento). */
  {
    const jx = 0, jz = -5;
    const gJacare = new THREE.Group();
    const matJ = lam({ color: 0x3a4a2a, roughness: 0.9 });
    const matOlho = lam({ color: 0xff3300, emissive: 0xaa0000 });
    gJacare.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 2.5), matJ));    // corpo
    gJacare.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 1.5), matJ)).position?.set(0, 0, 1.8);  // focinho
    const foc = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 1.2), matJ); foc.position.set(0, 0, 2.0); gJacare.add(foc);
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 1.5), matJ); cal.position.set(0, 0, -1.8); cal.rotation.x = -0.3; gJacare.add(cal); // cauda
    for (const ex of [-0.2, 0.2]) { const ol = new THREE.Mesh(new THREE.SphereGeometry(0.05), matOlho); ol.position.set(ex, 0.2, 1.8); gJacare.add(ol); }
    // dentes (espinhos no dorso)
    for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15), matJ); d.position.set(0, 0.2, -0.5 + i * 0.4); gJacare.add(d); }
    gJacare.position.set(jx, -0.15, jz); gJacare.rotation.y = 0.3;
    root.add(gJacare);
  }

  /* ===================== CAPIVARA (na margem alagada sul) ===================== */
  {
    const cx = -4, cz = HALF_Z - 5;
    const gCap = new THREE.Group();
    const matC = lam({ color: 0x6a4a3a, roughness: 0.9 });
    gCap.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.2), matC));   // corpo
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matC); cab.position.set(0, 0.1, 0.7); gCap.add(cab);
    for (const [lx, lz] of [[-0.3, -0.4], [0.3, -0.4], [-0.3, 0.3], [0.3, 0.3]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3), matC); p.position.set(lx, -0.4, lz); gCap.add(p);
    }
    gCap.position.set(cx, 0.35, cz);
    root.add(gCap);
  }

  /* ===================== PONTES DE MADEIRA =====================
     3 pontes cruzando o córrego. Cada uma é um tablado de madeira a y=0.1. */
  function ponte(z, largura = 3, comGuarda = false) {
    // tablado
    const matMadeira = TEX.wall || lam({ color: 0x8a6a4a, roughness: 0.9 });
    addBox(CORREGO_W + 2, 0.15, largura, matMadeira, 0, 0, z);
    // tábuas (linhas visuais)
    for (let bx = -CORREGO_W/2 - 0.5; bx <= CORREGO_W/2 + 0.5; bx += 0.3)
      addBox(0.04, 0.17, largura, lam({ color: 0x6a4a30, roughness: 0.95 }), bx, 0, z, { collide: false });
    // guarda-corpo opcional
    if (comGuarda) {
      for (const gx of [CORREGO_X0 - 0.5, CORREGO_X1 + 0.5]) {
        addBox(0.06, 0.9, largura, lam({ color: 0x4a3a20 }), gx, 0.15, z, { collide: false });
      }
    }
  }
  ponte(-22, 3.0, true);    // norte: larga, com guarda-corpo (rota principal)
  ponte(0, 1.8, false);     // central: estreita, sem guarda (risco)
  ponte(22, 3.0, true);     // sul: larga, com guarda-corpo

  /* ===================== CASAS DE MADEIRA (palafitas) =====================
     Cada casa: parede de madeira + telhado de zinco + caixa d'água + antena.
     Algumas sobre pilotis (vão embaixo = atira por baixo). */
  function palafita(x, z, w, d, h, matIdx, comPilotis = false) {
    const matParede = TEX.wall || PAREDES[matIdx % PAREDES.length];
    if (comPilotis) {
      // pilotis (4 postes de concreto)
      for (const [px, pz] of [[-w/2+0.3, -d/2+0.3], [w/2-0.3, -d/2+0.3], [-w/2+0.3, d/2-0.3], [w/2-0.3, d/2-0.3]])
        addBox(0.25, h, 0.25, TEX.concrete || lam({ map: T.concrete }), x + px, 0, z + pz);
      // corpo da casa acima dos pilotis (a partir de y=1.5)
      addBox(w, h - 1.5, d, matParede, x, 1.5, z);
      solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
      // colisor só do corpo (não dos pilotis — pode andar embaixo)
      colliders.push({ minX: x - w/2, maxX: x + w/2, minY: 1.5, maxY: h, minZ: z - d/2, maxZ: z + d/2 });
    } else {
      addBox(w, h, d, matParede, x, 0, z);
      solids.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 });
    }
    // telhado de zinco (inclinado = caixa achatada)
    addBox(w + 0.4, 0.08, d + 0.4, TEX.zinco || lam({ color: 0x888888, metalness: 0.5, roughness: 0.5 }), x, h, z, { collide: false });
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

  /* ===================== MUROS EXTERNOS ===================== */
  for (const sx of [-HALF_X, HALF_X])
    addBox(0.5, 3, HALF_Z * 2, TEX.concrete || lam({ map: T.concrete }), sx, 0, 0);
  for (const sz of [-HALF_Z, HALF_Z])
    addBox(HALF_X * 2, 3, 0.5, TEX.concrete || lam({ map: T.concrete }), 0, 0, sz);

  /* ===================== GROUND HEIGHT ===================== */
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
    E: [-10.5, -7.5, -13.5, 7.5].map(x => ({ x, z: 35, yaw: Math.PI })),    // margem leste
    B: [-10.5, -7.5, -13.5, 7.5].map(x => ({ x: -x, z: -35, yaw: 0 })),      // margem oeste
  };

  /* ===================== CTF — 4 BANDEIRAS ===================== */
  const ctfPoints = [
    { id: 'R', label: 'OESTE',   x: -12, z: -15 },
    { id: 'C', label: 'PONTE C', x: 0,   z: 0 },
    { id: 'P', label: 'LESTE',   x: 12,  z: 15 },
    { id: 'B', label: 'PONTE N', x: 0,   z: -22 },
  ];

  /* ===================== ARSENAL ===================== */
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  // margem leste
  place('ak', 12, -28);    place('m4', 8, -15);
  place('shotgun', 15, 0); place('mp5', 10, 12);
  place('awp', 18, -5);    place('deagle', 8, 28);
  // margem oeste
  place('ak', -12, 28);    place('m4', -8, 15);
  place('shotgun', -15, 0); place('mp5', -10, -12);
  place('m400', -18, 5);   place('deagle', -8, -28);
  // pontes
  place('mp5', 0, -22);    place('mp5', 0, 22);

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
    id: 'fy_corrego',
    root, T, waypoints: nodes, seed: 13007, passo: 0.72, alcance: 9, cobre: 0.06, minLarg: 0.3,
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 13, separacao: 15 },
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
