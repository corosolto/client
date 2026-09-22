// Parque da Treta: arena CTF simétrica, colorida e inteiramente procedural.
import * as THREE from 'three';
import { PropBatch, InstBatch } from './mapprops.js';
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

const HALF_X = 32;
const HALF_Z = 42;
const WHEEL_X = -19;
const WHEEL_Y = 14.5;
const WHEEL_FRAME_Z = -1.2;
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
// Anisotropia do acervo (textures.js): 8, 4 em q=low. As 8 texturas locais fixavam 4 na mão.
const ANISO = LOWQ ? 4 : 8;
/* GLB é só a SILHUETA: o colisor é sempre a caixa de procuração, então o parque continua
   jogável com `placeProp` devolvendo null (mapprops.js:48). Registro: maps.js `parque_treta`. */
export const PARQUE_PROPS = ['stall', 'drinkstand', 'quiosque', 'mesa_guardasol', 'guarda_sol',
  'banco_jardim', 'poste_jardim', 'palmeira_imperial', 'caixa_som_baile', 'pipa_papel', 'vw_9150',
  'dumpster', 'cooler'];

export function buildParque(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  root.name = 'parque-da-treta';
  scene.add(root);

  function surfaceTexture(kind, base, accent, repeat = 4) {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
    let seed = Array.from(kind).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    if (kind === 'grass' || kind === 'hedge') {
      ctx.strokeStyle = accent; ctx.lineWidth = kind === 'grass' ? 1 : 2;
      ctx.globalAlpha = kind === 'grass' ? 0.28 : 0.72;
      for (let i = 0; i < 420; i++) {
        const x = rand() * 128, y = rand() * 128, h = 2 + rand() * (kind === 'grass' ? 5 : 9);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 3, y - h); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'concrete') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 500; i++) ctx.fillRect(rand() * 128, rand() * 128, 0.6 + rand() * 1.8, 0.6 + rand() * 1.8);
      ctx.strokeStyle = 'rgba(90,75,58,.25)'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const y = rand() * 128; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y + (rand() - 0.5) * 12); ctx.stroke(); }
    } else if (kind === 'tiles') {
      ctx.strokeStyle = accent; ctx.lineWidth = 3;
      for (let i = 0; i <= 128; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < 80; i++) ctx.fillRect(rand() * 128, rand() * 128, 2, 2);
    } else if (kind === 'wood') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2;
      for (let y = 8; y < 128; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= 128; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12 + y) * 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(50,24,12,.3)'; for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.arc(rand() * 128, rand() * 128, 1 + rand() * 2, 0, Math.PI * 2); ctx.fill(); }
    } else if (kind === 'water') {
      ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
      for (let y = 6; y < 128; y += 10) { ctx.beginPath(); for (let x = 0; x <= 128; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.18 + y) * 2.5); ctx.stroke(); }
    } else {
      ctx.fillStyle = accent;
      for (let i = 0; i < 260; i++) {
        const x = rand() * 128, y = rand() * 128, w = 0.4 + rand() * 2.2;
        ctx.globalAlpha = 0.08 + rand() * 0.18; ctx.fillRect(x, y, w, rand() * 8 + 1);
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const x = rand() * 128, y = rand() * 128; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand() * 16, y + rand() * 3); ctx.stroke(); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); texture.anisotropy = ANISO;
    texture.name = `parque-${kind}`; return texture;
  }

  const SURFACE = {
    grass: surfaceTexture('grass', '#58a94c', '#2e7f36', 10), concrete: surfaceTexture('concrete', '#e3d2ad', '#aa9878', 7),
    tiles: surfaceTexture('tiles', '#dba93f', '#b77e27', 5), paint: surfaceTexture('paint', '#eeeeea', '#5e6772', 3),
    metal: surfaceTexture('metal', '#aeb6bd', '#2f3942', 3), wood: surfaceTexture('wood', '#9b6039', '#5d321f', 4),
    hedge: surfaceTexture('hedge', '#287b48', '#174e33', 5), water: surfaceTexture('water', '#43c9f2', 'rgba(230,255,255,.6)', 3),
  };
  const lam = (opts = {}) => new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, map: SURFACE.paint, ...opts });
  const material = (color, surface = SURFACE.paint, roughness = 0.62, metalness = 0) => new THREE.MeshStandardMaterial({ color, map: surface, roughness, metalness });
  const MAT = {
    grass: material(0xffffff, SURFACE.grass, 1), path: material(0xffffff, SURFACE.concrete, 0.92), plaza: material(0xffffff, SURFACE.tiles, 0.78),
    pink: material(0xff4f9a, SURFACE.paint, 0.46), blue: material(0x22a7e8, SURFACE.paint, 0.42), cyan: material(0x56e0e0, SURFACE.paint, 0.4),
    yellow: material(0xffd84d, SURFACE.paint, 0.48), red: material(0xf04b4b, SURFACE.paint, 0.44), purple: material(0x7b55d9, SURFACE.paint, 0.5),
    green: material(0x3ec67d, SURFACE.paint, 0.55), white: material(0xfff7e8, SURFACE.paint, 0.58), dark: material(0x39445a, SURFACE.metal, 0.34, 0.62),
    wood: material(0xffffff, SURFACE.wood, 0.88), hedge: material(0xffffff, SURFACE.hedge, 1),
    water: new THREE.MeshStandardMaterial({ color: 0xffffff, map: SURFACE.water, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.76 }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xfffdf5, map: surfaceTexture('cloud', '#fffdf5', '#e8eef7', 2), roughness: 1 }),
  };
  /* Chaves do acervo (`textures.js`) para o que é TEMA e não estrutura: toldo, grade do
     guichê, cortiça do prêmio de pelúcia, madeira de engradado. O clone só troca o repeat. */
  const acervo = (k, rep = 1, fb = SURFACE.paint) => {
    const t = T && T[k];
    if (!t || typeof t.clone !== 'function') return fb;
    const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rep, rep);
    c.anisotropy = ANISO; c.needsUpdate = true; return c;
  };
  MAT.lona = material(0xffffff, acervo('awning', 3), 0.9);
  MAT.grade = material(0xbfc6cc, acervo('metal', 2, SURFACE.metal), 0.55, 0.5);
  MAT.cortica = material(0xffffff, acervo('corkboard', 2, SURFACE.wood), 0.95);
  MAT.caixote = material(0xffffff, acervo('crate', 2, SURFACE.wood), 0.92);
  MAT.lata = material(0xe07a2f, SURFACE.metal, 0.6, 0.32);
  MAT.conc = material(0xd8cbb2, SURFACE.concrete, 0.9);
  const COLORS = [MAT.pink, MAT.blue, MAT.yellow, MAT.purple, MAT.green, MAT.red];
  const animated = { wheel: null, cabins: [], carousel: null, horses: [], clouds: [], birds: [] };
  const geometryCache = new Map();
  const boxGeometry = (w, h, d) => {
    const key = `b:${w}:${h}:${d}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
    return geometryCache.get(key);
  };
  const cylinderGeometry = (r, h, segments = 16) => {
    const key = `c:${r}:${h}:${segments}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.CylinderGeometry(r, r, h, segments));
    return geometryCache.get(key);
  };

  /* COLISOR GIRADO — padrão de `map_brasilia.js` / `map_corrego.js:180`, e pré-requisito das
     massas giradas: AABB cega projeta canto para fora e o MAP1 acusa corpo dentro de sólido. */
  const alinhado = (ry) => Math.abs(Math.sin(2 * ry)) < 1e-6;
  function colRot(cx, cz, hx, hz, minY, maxY, ry) {
    if (!ry || alinhado(ry)) {
      const troca = ry ? Math.abs(Math.cos(ry)) < 0.5 : false;
      const ax = troca ? hz : hx, az = troca ? hx : hz;
      colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az });
      return;
    }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const ax = Math.abs(hx * cs) + Math.abs(hz * sn), az = Math.abs(hx * sn) + Math.abs(hz * cs);
    colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az, ry, cx, cz, hx, hz, cos: cs, sin: sn });
  }

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(boxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    if (opts.ry) mesh.rotation.y = opts.ry;
    root.add(mesh);
    if (opts.collide !== false) {
      colRot(x, z, w / 2, d / 2, y, y + h, opts.ry || 0);
      occluders.push(mesh);
    }
    return mesh;
  }

  function addFloor(w, d, mat, x, z, y = 0.01) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  }

  function addCylinder(r, h, mat, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(cylinderGeometry(r, h, opts.segments || 16), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (opts.collide !== false) {
      colliders.push({ minX: x - r, maxX: x + r, minY: y, maxY: y + h, minZ: z - r, maxZ: z + r });
      occluders.push(mesh);
    }
    return mesh;
  }

  function addTube(points, radius, mat, tubular = 80) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubular, radius, 7, false), mat);
    mesh.castShadow = true;
    root.add(mesh);
    return mesh;
  }

  function addCloud(x, y, z, scale, speed) {
    const cloud = new THREE.Group();
    const puffs = [[-1.8, 0, 0, 1.35], [-0.5, 0.55, 0, 1.65], [1.0, 0.2, 0, 1.5], [2.1, -0.05, 0, 1.05], [0.2, -0.35, 0, 1.45]];
    for (const [px, py, pz, r] of puffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), MAT.cloud);
      puff.position.set(px, py, pz); puff.scale.z = 0.75; cloud.add(puff);
    }
    cloud.name = 'nuvem'; cloud.position.set(x, y, z); cloud.scale.setScalar(scale); root.add(cloud);
    animated.clouds.push({ cloud, speed, startX: x, span: HALF_X * 2 + 50 });
  }

  function addBird(x, y, z, scale, speed, phase) {
    const bird = new THREE.Group();
    const feather = lam({ color: 0x253247, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), feather); body.scale.set(1.7, 0.75, 0.7); bird.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), feather); head.position.x = 0.42; bird.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 5), MAT.yellow); beak.rotation.z = -Math.PI / 2; beak.position.set(0.62, -0.01, 0); bird.add(beak);
    const wings = [];
    const wing = (side) => {
      const pivot = new THREE.Group(); pivot.name = `asa-${side < 0 ? 'esquerda' : 'direita'}`;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.18, 0, side * 0.78, 0.32, 0, side * 1.28], 3));
      geo.setIndex([0, 1, 2]); geo.computeVertexNormals();
      pivot.add(new THREE.Mesh(geo, feather)); bird.add(pivot); wings.push({ pivot, side });
    };
    wing(-1); wing(1);
    for (const side of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 4), feather); tail.rotation.z = Math.PI / 2; tail.rotation.x = side * 0.3; tail.position.set(-0.48, 0, side * 0.09); bird.add(tail);
    }
    bird.name = 'passaro'; bird.position.set(x, y, z); bird.scale.setScalar(scale); root.add(bird);
    animated.birds.push({ bird, wings, speed, phase, startX: x, baseY: y, span: HALF_X * 2 + 40 });
  }

  /* PLACA DO PARQUE: letra de pincel, torta, com desvio por letra do mesmo LCG das texturas —
     parque itinerante não tem Arial Black. `aspect` = largura/altura do quad, senão estica. */
  function signTexture(title, subtitle, bg, fg, aspect = 3.2) {
    const canvas = document.createElement('canvas');
    canvas.height = 240; canvas.width = Math.round(240 * aspect);
    const W = canvas.width, ctx = canvas.getContext('2d');
    let seed = Array.from(title + subtitle).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, 240);
    ctx.strokeStyle = 'rgba(0,0,0,.16)'; ctx.lineWidth = 2;
    for (let y = 18; y < 240; y += 36) {
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + y) * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = fg; ctx.lineWidth = 12; ctx.strokeRect(12, 12, W - 24, 216);
    const escreve = (txt, size, baseY) => {
      ctx.font = `bold ${size}px "Trebuchet MS", Verdana, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
      const larg = Array.from(txt).map((c) => ctx.measureText(c).width);
      let x = W / 2 - larg.reduce((a, b) => a + b, 0) / 2;
      for (let i = 0; i < txt.length; i++) {
        ctx.save();
        ctx.translate(x + larg[i] / 2, baseY + (rand() - 0.5) * 7);
        ctx.rotate((rand() - 0.5) * 0.1);
        ctx.fillText(txt[i], 0, 0);
        ctx.restore();
        x += larg[i];
      }
    };
    escreve(title, 82, 92);
    escreve(subtitle, 40, 176);
    ctx.globalAlpha = 0.32; ctx.fillStyle = fg;
    for (let i = 0; i < 14; i++) ctx.fillRect(40 + rand() * (W - 80), 118 + rand() * 10, 2 + rand() * 2, 8 + rand() * 22);
    ctx.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = ANISO; texture.name = `parque-placa-${title.slice(0, 12)}`;
    return texture;
  }

  /* Céu de domingo do Rio em vez de cor chapada. A névoa fica (76-155 m) mas passa a ter a
     COR DO HORIZONTE do webp (#b9daee, tools/eval/look-horizonte.json) — régua eval:look. */
  setMapSky(scene, T, '/img/textures/sky_rj.webp', 0x75cef2);
  scene.fog = new THREE.Fog(0xb9daee, 76, 155);
  addCloud(-34, 22, -24, 2.2, 0.55);
  addCloud(8, 27, -34, 1.8, 0.38);
  addCloud(30, 20, -18, 1.65, 0.68);
  addCloud(-12, 24, 30, 1.75, 0.44);
  addBird(-28, 18, -20, 2.4, 2.0, 0.0);
  addBird(-20, 20, -25, 2.0, 2.3, 1.4);
  addBird(18, 22, -28, 1.8, 1.7, 2.8);
  addFloor(HALF_X * 2, HALF_Z * 2, MAT.grass, 0, 0);
  addFloor(12, HALF_Z * 2, MAT.path, 0, 0, 0.025);
  addFloor(HALF_X * 2, 10, MAT.path, 0, 0, 0.03);
  addFloor(24, 24, MAT.plaza, 0, 0, 0.04);
  for (const sx of [-1, 1]) addFloor(8, HALF_Z * 2 - 6, MAT.path, sx * 22, 0, 0.025);

  // Cerca viva perimetral: contém a arena sem esconder o céu e os brinquedos.
  addBox(HALF_X * 2, 2.2, 0.8, MAT.hedge, 0, 0, -HALF_Z + 0.4);
  addBox(HALF_X * 2, 2.2, 0.8, MAT.hedge, 0, 0, HALF_Z - 0.4);
  addBox(0.8, 2.2, HALF_Z * 2, MAT.hedge, -HALF_X + 0.4, 0, 0);
  addBox(0.8, 2.2, HALF_Z * 2, MAT.hedge, HALF_X - 0.4, 0, 0);

  // Portal de entrada em cada base.
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) addBox(1.1, 7, 1.1, sx < 0 ? MAT.pink : MAT.blue, sx * 7, 0, sz * 35);
    addBox(15, 1.1, 1.1, MAT.yellow, 0, 7, sz * 35, { collide: false });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.1), new THREE.MeshLambertMaterial({ map: signTexture('PARQUE DA TRETA', sz < 0 ? 'ENTRADA DO TIME E' : 'ENTRADA DO TIME B', '#6b3fc5', '#fff7a8', 10 / 3.1) }));
    board.position.set(0, 6.5, sz * 34.4); board.rotation.y = sz > 0 ? Math.PI : 0; root.add(board);
  }

  /* PÓRTICO-BILHETERIA: o bolsão do spawn era varanda aberta para o mapa inteiro. Abertura
     única em x ∈ [-4,4] e painel de 14 m a 1,6 m dela cobrem o ângulo oblíquo. */
  for (const sz of [-1, 1]) {
    const zb = sz * 31.0, face = zb + sz * 1.62, testeira = zb - sz * 1.62;
    for (const sx of [-1, 1]) {
      addBox(8.0, 4.8, 1.6, MAT.conc, sx * 8, 0, sz * 35);
      addBox(8.2, 0.5, 1.8, sx < 0 ? MAT.pink : MAT.blue, sx * 8, 4.8, sz * 35, { collide: false });
      addBox(1.6, 3.2, 5.4, MAT.conc, sx * 12.8, 0, sz * 38.5);
      addBox(7.0, 3.6, 3.2, MAT.conc, sx * 3.5, 0, zb);
      addBox(0.9, 1.2, 0.14, MAT.grade, sx * 3.5, 0.95, face, { collide: false });
      addBox(7.6, 0.22, 1.0, MAT.lona, sx * 3.5, 2.42, face + sz * 0.4, { collide: false });
    }
    const cartaz = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 2.6),
      new THREE.MeshLambertMaterial({ map: signTexture('PARQUE DA TRETA', 'ENTRADA 2 REAIS', '#e8d7a8', '#1d3f8f', 12 / 2.6) }));
    cartaz.position.set(0, 2.0, testeira + sz * 0.02); cartaz.rotation.y = sz > 0 ? Math.PI : 0; root.add(cartaz);
  }

  // Carrossel central: marco de orientação e cobertura circular baixa.
  addCylinder(6.1, 0.55, MAT.purple, 0, 0, 0);
  addCylinder(0.55, 7.8, MAT.yellow, 0, 0.55, 0);
  const carousel = new THREE.Group(); carousel.name = 'carrossel-giratorio'; root.add(carousel); animated.carousel = carousel;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(7, 3.2, 16), MAT.pink);
  canopy.position.set(0, 7.2, 0); canopy.castShadow = true; carousel.add(canopy);
  const canopyTop = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.7, 16), MAT.yellow);
  canopyTop.position.set(0, 8.7, 0); carousel.add(canopyTop);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = Math.cos(a) * 4.25, z = Math.sin(a) * 4.25;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.2, 8), MAT.white); pole.position.set(x, 3.15, z); carousel.add(pole);
    const horse = new THREE.Group(); horse.name = `carrossel-cavalo-${i}`; horse.position.set(x, 2.15, z); horse.rotation.y = -a; carousel.add(horse);
    const horseMat = COLORS[i % COLORS.length];
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.75, 0.48), horseMat); horse.add(body);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.85, 0.38), horseMat); neck.position.set(0.58, 0.5, 0); neck.rotation.z = -0.35; horse.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.4), horseMat); head.position.set(0.82, 0.9, 0); horse.add(head);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.58), MAT.dark); saddle.position.set(-0.1, 0.45, 0); horse.add(saddle);
    for (const lx of [-0.48, 0.42]) for (const lz of [-0.16, 0.16]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.72, 0.13), MAT.white); leg.position.set(lx, -0.62, lz); horse.add(leg);
    }
    animated.horses.push({ horse, phase: i * Math.PI / 2, baseY: 2.15 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), COLORS[(i + 2) % COLORS.length]); bulb.position.set(Math.cos(a) * 6.15, 6.15, Math.sin(a) * 6.15); carousel.add(bulb);
  }

  // Detalhes leves: luminárias, floreiras e bandeirolas sem alterar as rotas do FPS.
  for (const [x, z] of [[-7, -12], [7, -12], [-7, 12], [7, 12], [-27, -18], [27, -18], [-27, 18], [27, 18]]) {
    addCylinder(0.11, 4.2, MAT.dark, x, 0, z, { segments: 7 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 7), MAT.yellow); lamp.position.set(x, 4.25, z); root.add(lamp);
  }
  for (const [x, z] of [[-16, -12], [16, -12], [-16, 12], [16, 12]]) {
    addCylinder(1.25, 0.95, MAT.wood, x, 0, z, { segments: 12 });
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), COLORS[(i + (x > 0 ? 2 : 0)) % COLORS.length]);
      flower.position.set(x + Math.cos(a) * 0.68, 1.12, z + Math.sin(a) * 0.68); root.add(flower);
    }
  }
  for (const sz of [-1, 1]) for (let i = 0; i < 7; i++) {
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.75, 3), COLORS[i % COLORS.length]);
    flag.rotation.z = Math.PI; flag.position.set(-6 + i * 2, 8.15, sz * 35); root.add(flag);
  }

  // Roda-gigante no flanco oeste; estrutura visual fica fora do corredor jogável.
  {
    const wheel = new THREE.Group(); wheel.name = 'roda-gigante'; wheel.position.set(WHEEL_X, WHEEL_Y, 0); root.add(wheel); animated.wheel = wheel;
    const rimMat = MAT.white, hubMat = MAT.yellow;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(10, 0.32, 8, 48), rimMat); rim.name = 'roda-aro'; rim.position.z = WHEEL_FRAME_Z; wheel.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.4, 12), hubMat); hub.name = 'roda-cubo'; hub.rotation.x = Math.PI / 2; wheel.add(hub);
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5, x = Math.cos(a) * 10, y = 12 + Math.sin(a) * 10;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 10, 6), MAT.white);
      spoke.position.set(x / 2, (y - 12) / 2, WHEEL_FRAME_Z); spoke.rotation.z = a - Math.PI / 2; wheel.add(spoke);
      const hanger = new THREE.Group(); hanger.name = `roda-cadeira-${i}`; hanger.position.set(x, y - 12, 0); wheel.add(hanger);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.8, 6), MAT.dark); arm.position.y = -0.9; hanger.add(arm);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.4, 1.5), COLORS[i % COLORS.length]); cabin.name = `roda-cabine-${i}`; cabin.position.y = -2.1; hanger.add(cabin);
      animated.cabins.push({ hanger, phase: a });
    }
    for (const sx of [-1, 1]) addTube([new THREE.Vector3(WHEEL_X, 0.2, sx * 2.2), new THREE.Vector3(WHEEL_X, WHEEL_Y, 0)], 0.28, MAT.dark, 10);
    const wheelBase = addBox(6.5, 1.5, 3.8, MAT.blue, WHEEL_X, 0, 0); wheelBase.name = 'roda-base'; // cobertura jogável sob a atração
  }

  // Castelo inflável no flanco leste: silhueta grande e cover fragmentado.
  {
    const cx = 24, cz = 0;
    addBox(8.8, 4.4, 7.4, MAT.purple, cx, 0, cz);
    for (const dx of [-4.2, 4.2]) for (const dz of [-3.5, 3.5]) {
      addCylinder(1.45, 6.2, (dx + dz > 0) ? MAT.pink : MAT.blue, cx + dx, 0, cz + dz);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.6, 10), MAT.yellow); roof.position.set(cx + dx, 7.5, cz + dz); root.add(roof);
    }
    addBox(2.4, 3.2, 0.4, MAT.dark, cx, 0, cz - 3.72, { collide: false });
  }

  // Montanha-russa envolve o fundo sem fechar rotas nem criar colisão complexa.
  const coasterPoints = [
    new THREE.Vector3(-28, 4, -28), new THREE.Vector3(-17, 12, -31), new THREE.Vector3(-5, 7, -29),
    new THREE.Vector3(8, 16, -30), new THREE.Vector3(20, 6, -30), new THREE.Vector3(29, 10, -25),
  ];
  addTube(coasterPoints, 0.23, MAT.red);
  addTube(coasterPoints.map(p => new THREE.Vector3(p.x, p.y, p.z + 1.25)), 0.23, MAT.yellow);
  for (const p of coasterPoints) addCylinder(0.14, p.y, MAT.dark, p.x, 0, p.z, { segments: 7 });

  // Quiosques espelhados dão cobertura de cintura e quebram linhas de tiro.
  function kiosk(x, z, mat, title) {
    addBox(5.2, 2.6, 3.8, mat, x, 0, z);
    addBox(6.0, 0.4, 4.6, MAT.white, x, 2.6, z, { collide: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.0), new THREE.MeshLambertMaterial({ map: signTexture(title, 'É AQUI!', '#ff4f9a', '#fff7e8', 4.4) }));
    sign.position.set(x, 2.15, z + (z < 0 ? 1.93 : -1.93)); sign.rotation.y = z < 0 ? 0 : Math.PI; root.add(sign);
  }
  kiosk(-13, -19, MAT.blue, 'PIPOCA'); kiosk(13, 19, MAT.green, 'ALGODÃO DOCE');
  kiosk(13, -19, MAT.pink, 'PESCARIA'); kiosk(-13, 19, MAT.yellow, 'ARGOLA');

  // Barreiras de fila e bancos formam três rotas legíveis, sem labirinto.
  for (const sz of [-1, 1]) {
    for (const x of [-8, 8]) for (const z of [13, 17, 25, 29]) addBox(3.2, 1.15, 0.55, MAT.white, x, 0, sz * z);
    for (const x of [-22, 22]) for (const z of [12, 24]) addBox(3.8, 1.0, 1.0, MAT.wood, x, 0, sz * z);
  }
  for (const [x, z, mat] of [[-18, -10, MAT.pink], [18, 10, MAT.blue], [18, -10, MAT.yellow], [-18, 10, MAT.green]]) {
    addCylinder(0.18, 4.4, MAT.dark, x, 0, z);
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10), mat); balloon.scale.y = 1.2; balloon.position.set(x, 5.3, z); root.add(balloon);
  }

  // Espelhos d'água rasos decoram as bases sem alterar navegação.
  for (const sz of [-1, 1]) {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), MAT.water); pond.rotation.x = -Math.PI / 2; pond.position.set(sz * 21, 0.045, sz * 31); root.add(pond);
    for (let i = 0; i < 4; i++) addCylinder(0.32, 0.7 + i * 0.18, MAT.white, sz * (23 - i * 1.35), 0, sz * 31, { segments: 8 });
  }

  /* CANTOS E FLANCOS: os 4 quadrantes que mediam 1 prop e 17,3 m de espaçamento, a fila da
     roda e o miolo. ROTACIONADO a 180° — (x,z) → (−x,−z), ry += π — não espelhado em Z. */
  const PB = new PropBatch({ bucket: 18, shadowMin: 0.02 });
  const IB = new InstBatch({ bucket: 18 });
  /* O GLB veste a caixa de procuração: com modelo na tela a caixa sai de `occluders` (a bala
     testa a malha do lote) e o AABB continua valendo — padrão `map_campomorro.js:309`. */
  const vestir = (id, p, mesh) => {
    if (!id || !PB.add(id, p)) return mesh;
    mesh.visible = false; mesh.userData.proxyGLB = id;
    const i = occluders.indexOf(mesh); if (i >= 0) occluders.splice(i, 1);
    return mesh;
  };
  const MASSAS = [
    /* praça de alimentação, no canto da bandeira. A face leste de TODA massa fica em x ≤ 27,1:
       o corredor de nós em x = 27,6 é o que liga este canto ao resto (MC3 ilhados = 0). */
    ['stall', 22.6, -31.4, 3.6, 2.8, 2.6, 0.22, 'lona', { targetLen: 3.6 }],
    ['drinkstand', 17.0, -29.6, 3.2, 2.8, 2.4, -0.41, 'lona', null],
    ['drinkstand', 20.4, -26.8, 2.4, 2.2, 1.6, 0.63, 'caixote', { targetH: 2.2 }],
    ['mesa_guardasol', 19.2, -35.0, 2.4, 2.3, 2.4, 0.15, 'lona', null],
    ['mesa_guardasol', 24.2, -35.0, 2.4, 2.3, 2.4, -0.33, 'lona', null],
    ['mesa_guardasol', 25.4, -27.2, 2.4, 2.3, 2.4, 0.48, 'lona', null],
    [null, 16.2, -25.4, 2.2, 1.6, 1.4, 0.35, 'lata', null],
    [null, 25.6, -38.4, 2.0, 1.5, 1.6, -0.28, 'caixote', null],
    ['vw_9150', 23.2, -21.6, 7.4, 3.4, 2.6, 0.12, 'lata', { targetLen: 7.4 }],
    // pátio da montanha-russa: contêiner da oficina, vagonetes na fila, bilheteria, gradil
    [null, -27.4, -37.2, 6.2, 2.6, 2.6, 0.16, 'lata', null],
    [null, -22.6, -38.6, 2.4, 1.5, 1.3, 0.52, 'red', null],
    [null, -19.4, -37.0, 2.4, 1.5, 1.3, 0.31, 'yellow', null],
    [null, -16.8, -35.6, 2.4, 1.5, 1.3, 0.74, 'blue', null],
    ['quiosque', -28.8, -30.4, 2.6, 3.0, 2.6, -0.19, 'conc', null],
    [null, -27.0, -24.6, 3.4, 1.15, 0.5, 0.90, 'grade', null],
    [null, -23.6, -21.8, 3.4, 1.15, 0.5, 0.50, 'grade', null],
    // flanco da roda-gigante: cabine de comando, fila, caixa de som, bilheteria
    ['quiosque', -24.0, -5.6, 2.6, 2.6, 2.2, 0.24, 'conc', null],
    [null, -18.4, -6.4, 3.6, 1.15, 0.5, 0.41, 'grade', null],
    [null, -19.4, -8.6, 3.6, 1.15, 0.5, -0.22, 'grade', null],
    [null, -23.2, -10.4, 3.6, 1.15, 0.5, 0.67, 'grade', null],
    ['caixa_som_baile', -28.2, -14.6, 1.6, 2.0, 1.2, 0.33, 'dark', null],
    ['quiosque', -24.8, 9.2, 3.0, 3.0, 2.6, -0.28, 'conc', null],
    // miolo: tiro ao alvo com balcão e prateleira de pelúcia, casa de espelhos, bancos
    ['stall', -12.8, -8.0, 5.0, 2.9, 3.0, 0.27, 'lona', { targetLen: 5.0 }],
    [null, -12.8, -5.8, 5.0, 1.1, 0.5, 0.27, 'caixote', null],
    [null, -12.8, -9.9, 5.0, 2.4, 0.4, 0.27, 'cortica', null],
    [null, 12.8, -8.0, 5.4, 3.2, 4.0, -0.31, 'conc', null],
    [null, 12.8, -5.4, 5.4, 1.1, 0.5, -0.31, 'conc', null],
    [null, 11.4, -13.2, 2.0, 1.5, 1.4, 0.44, 'lata', null],
    ['banco_jardim', -14.2, -3.4, 1.8, 0.9, 0.6, 0.36, 'wood', null],
    ['banco_jardim', -4.6, -16.0, 1.8, 0.9, 0.6, -0.52, 'wood', null],
    ['banco_jardim', 14.6, -3.0, 1.8, 0.9, 0.6, 0.58, 'wood', null],
  ];
  for (const [id, x, z, w, h, d, ry, matKey, po] of MASSAS) for (const s of [1, -1]) {
    const px = s * x, pz = s * z, pry = ry + (s < 0 ? Math.PI : 0);
    vestir(id, { x: px, z: pz, ry: pry, targetH: h, ...(po || {}) },
      addBox(w, h, d, MAT[matKey], px, 0, pz, { ry: pry }));
  }

  // Prêmio de pelúcia na prateleira do tiro ao alvo: acima do peito, fora da sonda de corpo.
  const pelucia = new THREE.SphereGeometry(0.22, 9, 7);
  for (const s of [1, -1]) for (let i = 0; i < 7; i++) {
    const ry = 0.27 + (s < 0 ? Math.PI : 0), lx = -1.8 + i * 0.6;
    const px = s * -12.8 + Math.cos(ry) * lx + Math.sin(ry) * 0.34;
    const pz = s * -9.9 - Math.sin(ry) * lx + Math.cos(ry) * 0.34;
    const o = new THREE.Object3D(); o.position.set(px, 1.78, pz); o.rotation.y = ry;
    IB.add(pelucia, MAT.white, o, COLORS[i % COLORS.length].color.getHex());
  }

  /* Arborização e mobiliário de praça: palmeira imperial com tronco que colide, guarda-sol
     de barraca e poste de jardim vestindo os 8 postes que agora são colisor. */
  for (const [x, z] of [[-29.0, 6.4], [-26.2, 15.8], [29.0, -6.4], [26.2, -15.8]])
    vestir('palmeira_imperial', { x, z, targetH: 9.5 }, addCylinder(0.28, 9.5, MAT.wood, x, 0, z, { segments: 8 }));
  for (const [x, z] of [[-10.0, -20.6], [8.6, -10.6], [23.4, -25.6], [-15.0, -27.0],
    [10.0, 20.6], [-8.6, 10.6], [-23.4, 25.6], [15.0, 27.0]]) {
    vestir('guarda_sol', { x, z, targetH: 2.5 }, addCylinder(0.09, 2.3, MAT.dark, x, 0, z, { segments: 7 }));
    const toldo = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.55, 10), MAT.lona);
    toldo.position.set(x, 2.52, z); toldo.castShadow = true; root.add(toldo);
  }
  for (const [x, z] of [[-7, -12], [7, -12], [-7, 12], [7, 12], [-27, -18], [27, -18], [-27, 18], [27, 18]])
    PB.add('poste_jardim', { x, z, targetH: 4.2 });
  // Pipa presa no fio da roda e no alto do trenzinho: decoração, sem colisor, acima de 1,40 m.
  for (const [x, y, z] of [[-19.6, 9.4, -5.2], [-14.2, 7.2, 4.6], [-24.4, 10.6, 5.4],
    [-8.4, 8.1, -26.2], [6.2, 10.8, -28.4], [18.6, 7.6, -29.6]])
    PB.add('pipa_papel', { x, y, z, targetH: 1.1, ry: (x + z) * 0.07 });
  PB.build(root); IB.build(root);

  const GM = { black: lam({ color: 0x202735 }), steel: lam({ color: 0xaab4c0 }), wood: MAT.wood, green: lam({ color: 0x315b43 }) };
  const gbox = (w, h, d, mat, x, y, z) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); return mesh; };
  function buildGun(kind, x, z, yaw) {
    const g = new THREE.Group();
    const long = ['awp', 'ak', 'm4', 'shotgun', 'mp5'].includes(kind);
    g.add(gbox(0.1, 0.1, long ? 1.0 : 0.38, kind === 'awp' ? GM.green : GM.black, 0, 0.1, 0));
    g.add(gbox(0.11, 0.18, long ? 0.28 : 0.12, kind === 'shotgun' ? GM.wood : GM.steel, 0, 0.03, long ? 0.38 : 0.12));
    g.position.set(x, 0.06, z); g.rotation.y = yaw; root.add(g); return g;
  }
  const place = (kind, x, z, yaw = 0) => { const mesh = buildGun(kind, x, z, yaw); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh }); };
  const arsenal = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
  for (const sz of [-1, 1]) arsenal.forEach((kind, i) => place(kind, -12 + i * 4, sz * 37.5, sz < 0 ? 0 : Math.PI));
  place('ak', -9, -7, 0); place('m4', 9, 7, Math.PI); place('shotgun', 9, -7, 0); place('mp5', -9, 7, Math.PI);

  /* Mesmo teste do lado do A* (padrão `map_corrego.js:192`): sem isto o bot planeja pela
     AABB da caixa girada e contorna ar. */
  const dentroDaCaixaGirada = (c, x, z, inf) => {
    const wx = x - c.cx, wz = z - c.cz;
    const lx = wx * c.cos - wz * c.sin, lz = wx * c.sin + wz * c.cos;
    return Math.abs(lx) <= c.hx + inf && Math.abs(lz) <= c.hz + inf;
  };
  const blocked = (x, z, inflate = 0.45) => colliders.some(c => c.minY < 1.6 && c.maxY > 0.15
    && x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate
    && (!c.ry || dentroDaCaixaGirada(c, x, z, inflate)));
  const nodes = [], adj = [], STEP = 3.2;
  for (let x = -HALF_X + 2; x <= HALF_X - 2; x += STEP) for (let z = -HALF_Z + 2; z <= HALF_Z - 2; z += STEP) if (!blocked(x, z)) nodes.push({ x, z });
  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6; if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.2)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) {
    adj.push([]);
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz < STEP * STEP * 2.45 && segClear(nodes[i], nodes[j])) adj[i].push(j);
    }
  }
  function nearestWaypoint(x, z) { let best = 0, bd = Infinity; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1), queue = [fromIdx]; prev[fromIdx] = fromIdx;
    while (queue.length) {
      const n = queue.shift();
      for (const next of adj[n]) if (prev[next] === -1) { prev[next] = n; if (next === toIdx) { const path = [next]; let cur = n; while (cur !== fromIdx) { path.unshift(cur); cur = prev[cur]; } path.unshift(fromIdx); return path; } queue.push(next); }
    }
    return [fromIdx];
  }

  const hemi = new THREE.HemisphereLight(0xdaf5ff, 0x71a95b, 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d2, 1.35); sun.position.set(-24, 44, -18); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -42; sun.shadow.camera.right = 42; sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50; sun.shadow.camera.far = 150; sun.shadow.bias = -0.0004; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbde7ff, 0.45); fill.position.set(30, 22, 28); scene.add(fill);

  function update(dt, time) {
    SURFACE.water.offset.x = time * 0.018;
    SURFACE.water.offset.y = time * 0.009;
    if (animated.carousel) {
      animated.carousel.rotation.y = time * 0.22;
      for (const { horse, phase, baseY } of animated.horses) horse.position.y = baseY + Math.sin(time * 1.35 + phase) * 0.42;
    }
    if (animated.wheel) {
      animated.wheel.rotation.z = time * 0.075;
      for (const { hanger, phase } of animated.cabins) {
        const sway = Math.sin(time * 0.82 + phase * 0.45) * 0.065 + Math.sin(time * 1.37 + phase) * 0.018;
        hanger.rotation.z = -animated.wheel.rotation.z + sway;
      }
    }
    for (const item of animated.clouds) {
      item.cloud.position.x += item.speed * dt;
      if (item.cloud.position.x > HALF_X + 25) item.cloud.position.x -= item.span;
    }
    for (const item of animated.birds) {
      item.bird.position.x += item.speed * dt;
      const flap = Math.sin(time * 7.4 + item.phase);
      item.bird.position.y = item.baseY + Math.sin(time * 1.6 + item.phase) * 0.55;
      item.bird.rotation.z = Math.sin(time * 1.6 + item.phase) * 0.08;
      for (const { pivot, side } of item.wings) pivot.rotation.x = side * (0.18 + flap * 0.72);
      if (item.bird.position.x > HALF_X + 20) item.bird.position.x -= item.span;
    }
  }

  /* BUG-57: parque é DOS POMBOS — e o caramelo passeia sem coleira. */
  const ambience = createFavelaAmbience(root, {
    map: 'parque_treta',
    rats: [
      { pos: [-16, 0, -30], to: [-13.5, 0, -27.5], phase: .4 },
      { pos: [16, 0, 30], to: [13.5, 0, 27.5], phase: 1.6 },
    ],
    /* vida 2 (14/09): a pomba de (−4,6 / 10,6) era clone da de (−4 / 12) a 1,5 m; sai e paga
       os dois patos dos espelhos d'água (−6.928 +5.352 = −1.576 tri). */
    pigeons: [
      { mode: 'ground', pos: [-6, 0, -10], phase: .2 }, { mode: 'ground', pos: [8, 0, -4], phase: 1.0 },
      { mode: 'ground', pos: [-4, 0, 12], phase: 1.9 },
    ],
    dogs: [{ pos: [-4, 0, 24], to: [0, 0, 24], phase: .5 }],
    /* vida 1: papagaio de poleiro no topo do globo dos postes do parque (fauna 2).
       y=4,62 = topo do globo (poste 0→4,2, globo →4,63); iterado por captura
       mapview 19/08: y=1,02 flutuava no ar, y=4,45 ficava atrás do globo */
    parrots: [
      { pos: [7, 4.62, 12], phase: 1.2 }, { pos: [-7, 4.62, -12], phase: 2.6 },
    ],
    /* PATO NADANDO nos dois espelhos d'água (`:401`, círculo r=4,2 em ±(21,31), lâmina em
       y=0,045). O y é a lâmina MENOS a submersão do casco: a linha d'água do GLB está
       0,0975 acima do fundo do modelo e a escala do alvo de 0,40 m é 0,772, então o casco
       afunda 0,075 m — com y=0,045 o bicho boiaria 7,5 cm acima da água, que é o defeito
       clássico. A lâmina é `transparent`, então a parte submersa aparece por dentro dela.
       Deslizar sem mexer pata é ERRADO em bicho de perna e CERTO em pato nadando: é o único
       do lote em que o GLB estático não mente em movimento. */
    ducks: [
      { pos: [20, -.03, 33], to: [20.8, -.03, 33.6], phase: .4 },
      { pos: [-20.5, -.03, -32.5], to: [-21.4, -.03, -31.8], phase: 2.2 },
    ],
  });

  return {
    /* Grilo é som de noite: o parque é de domingo à tarde. O funk sai do trio elétrico e
       o motor do gerador fica na praça de alimentação, os dois espelhados a 180°. */
    ambience,
    sound: {
      loops: [
        { src: AMB_LOOPS.passaros, pos: [0, 3, 0], radius: 70, vol: .28 },
        { src: AMB_LOOPS.funk, pos: [23.2, 2, -21.6], radius: 30, vol: .30 },
        { src: AMB_LOOPS.funk, pos: [-23.2, 2, 21.6], radius: 30, vol: .30 },
        { src: AMB_LOOPS.obra, pos: [16.2, 1, -25.4], radius: 16, vol: .22 },
        { src: AMB_LOOPS.obra, pos: [-16.2, 1, 25.4], radius: 16, vol: .22 },
      ],
      bioma: 'campo',
    },
    root, colliders, occluders, decalSolids: [root], groundHeightAt: () => 0, slowAt: () => false, update, sun, hemi, pickups,
    spawns: {
      E: [-6, -2, 2, 6].map(x => ({ x, z: -38.5, yaw: 0 })),
      B: [-6, -2, 2, 6].map(x => ({ x, z: 38.5, yaw: Math.PI })),
    },
    ctfPoints: [
      { id: 'E', label: 'PORTAL ROSA', x: 18, z: -33 },
      { id: 'MID', label: 'CARROSSEL', x: 0, z: 10 },
      { id: 'B', label: 'PORTAL AZUL', x: -18, z: 33 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.8, maxX: HALF_X - 0.8, minZ: -HALF_Z + 0.8, maxZ: HALF_Z - 0.8 },
  };
}
