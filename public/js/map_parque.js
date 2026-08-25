// Parque da Treta: arena CTF simétrica em fim de tarde, inteiramente procedural.
// Rebuild USANTOS (25/08): vegetação instanciada, coreto, trenzinho, mobiliário —
// o mapa não pode mais parecer low poly (régua: tools/eval/parque-vida-check.mjs).
import * as THREE from 'three';
import { InstBatch, mergeParts } from './mapprops.js';
import { applyLook } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

const HALF_X = 32;
const HALF_Z = 42;
const WHEEL_X = -19;
const WHEEL_Y = 14.5;
const WHEEL_FRAME_Z = -1.2;
const CORETO = { x: -25, z: -22.5 };
const ESTACAO = { x: 24.5, z: 16.5 };

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
    } else if (kind === 'folha') {
      for (let i = 0; i < 90; i++) {
        const x = rand() * 128, y = rand() * 128, r = 3 + rand() * 7;
        ctx.fillStyle = accent; ctx.globalAlpha = 0.25 + rand() * 0.45;
        ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.45 + rand() * 0.4), rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(12,42,18,.8)'; ctx.lineWidth = 1;
      for (let i = 0; i < 40; i++) { const x = rand() * 128, y = rand() * 128; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 9, y + (rand() - 0.5) * 9); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (kind === 'casca') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
      for (let x = 4; x < 128; x += 9) { ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y <= 128; y += 8) ctx.lineTo(x + Math.sin(y * 0.11 + x) * 2.5, y); ctx.stroke(); }
      ctx.fillStyle = 'rgba(28,14,6,.4)'; for (let i = 0; i < 14; i++) ctx.fillRect(rand() * 128, rand() * 128, 2 + rand() * 3, 5 + rand() * 9);
    } else if (kind === 'terra') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 650; i++) { ctx.globalAlpha = 0.15 + rand() * 0.3; ctx.fillRect(rand() * 128, rand() * 128, 0.6 + rand() * 2.4, 0.6 + rand() * 2.4); }
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(60,42,26,.5)';
      for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(rand() * 128, rand() * 128, 0.8 + rand() * 1.8, 0, Math.PI * 2); ctx.fill(); }
    } else if (kind === 'lona') {
      ctx.fillStyle = accent;
      for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 16, 128);
      ctx.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 15; x < 128; x += 32) ctx.fillRect(x, 0, 2, 128);
      ctx.fillStyle = 'rgba(255,255,255,.10)'; for (let i = 0; i < 40; i++) ctx.fillRect(rand() * 128, rand() * 128, 2, 1);
    } else if (kind === 'telhado') {
      ctx.strokeStyle = accent; ctx.lineWidth = 3;
      for (let y = 10; y < 140; y += 18) for (let x = -8; x < 140; x += 20) { ctx.beginPath(); ctx.arc(x + (y % 36 ? 10 : 0), y, 10, Math.PI, 0); ctx.stroke(); }
      ctx.fillStyle = 'rgba(40,12,6,.22)'; for (let i = 0; i < 60; i++) ctx.fillRect(rand() * 128, rand() * 128, 2, 2);
    } else if (kind === 'lata') {
      ctx.strokeStyle = accent; ctx.lineWidth = 3;
      for (let x = 6; x < 128; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(255,255,255,.20)'; ctx.lineWidth = 1.5;
      for (let x = 11; x < 128; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,34,38,.35)'; for (let i = 0; i < 40; i++) ctx.fillRect(rand() * 128, rand() * 128, 1.5, 1.5);
    } else if (kind === 'pedra') {
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
      for (let y = 0; y <= 128; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= 128; x += 16) ctx.lineTo(x, y + (rand() - 0.5) * 5); ctx.stroke(); }
      for (let y = 0; y < 128; y += 22) for (let x = (y % 44 ? 12 : 30); x < 128; x += 34) { ctx.beginPath(); ctx.moveTo(x + (rand() - 0.5) * 4, y); ctx.lineTo(x + (rand() - 0.5) * 4, y + 22); ctx.stroke(); }
      ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 90; i++) ctx.fillRect(rand() * 128, rand() * 128, 2, 2);
    } else if (kind === 'asfalto') {
      ctx.fillStyle = accent;
      for (let i = 0; i < 700; i++) { ctx.globalAlpha = 0.12 + rand() * 0.25; ctx.fillRect(rand() * 128, rand() * 128, 0.5 + rand() * 1.6, 0.5 + rand() * 1.6); }
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(20,21,24,.5)'; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { let x = rand() * 128, y = rand() * 128; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rand() - 0.5) * 22; y += (rand() - 0.5) * 22; ctx.lineTo(x, y); } ctx.stroke(); }
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
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); texture.anisotropy = 4;
    texture.name = `parque-${kind}`; return texture;
  }

  const SURFACE = {
    grass: surfaceTexture('grass', '#58a94c', '#2e7f36', 10), concrete: surfaceTexture('concrete', '#e3d2ad', '#aa9878', 7),
    tiles: surfaceTexture('tiles', '#dba93f', '#b77e27', 5), paint: surfaceTexture('paint', '#eeeeea', '#5e6772', 3),
    metal: surfaceTexture('metal', '#aeb6bd', '#2f3942', 3), wood: surfaceTexture('wood', '#9b6039', '#5d321f', 4),
    hedge: surfaceTexture('hedge', '#287b48', '#174e33', 5), water: surfaceTexture('water', '#43c9f2', 'rgba(230,255,255,.6)', 3),
    folha: surfaceTexture('folha', '#2e7f36', '#5cb85a', 2), casca: surfaceTexture('casca', '#6a4a30', '#3d2716', 2),
    terra: surfaceTexture('terra', '#8a6a48', '#a98a5e', 6), lona: surfaceTexture('lona', '#e8506a', '#fff2e2', 2),
    telhado: surfaceTexture('telhado', '#a8472f', '#6e2a1a', 3), lata: surfaceTexture('lata', '#7f8c94', '#4a545c', 2),
    pedra: surfaceTexture('pedra', '#9a938a', '#6e6862', 4), asfalto: surfaceTexture('asfalto', '#4a4d52', '#65686e', 6),
  };
  const lam = (opts = {}) => new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, map: SURFACE.paint, ...opts });
  const material = (color, surface = SURFACE.paint, roughness = 0.62, metalness = 0) => new THREE.MeshStandardMaterial({ color, map: surface, roughness, metalness });
  const MAT = {
    grass: material(0xffffff, SURFACE.grass, 1), path: material(0xffffff, SURFACE.concrete, 0.92), plaza: material(0xffffff, SURFACE.tiles, 0.78),
    pink: material(0xff4f9a, SURFACE.paint, 0.46), blue: material(0x22a7e8, SURFACE.paint, 0.42), cyan: material(0x56e0e0, SURFACE.paint, 0.4),
    yellow: material(0xffd84d, SURFACE.paint, 0.48), red: material(0xf04b4b, SURFACE.paint, 0.44), purple: material(0x7b55d9, SURFACE.paint, 0.5),
    green: material(0x3ec67d, SURFACE.paint, 0.55), white: material(0xfff7e8, SURFACE.paint, 0.58), dark: material(0x39445a, SURFACE.metal, 0.34, 0.62),
    wood: material(0xffffff, SURFACE.wood, 0.88), hedge: material(0xffffff, SURFACE.hedge, 1),
    trunk: material(0xffffff, SURFACE.casca, 0.95), leaf: material(0xffffff, SURFACE.folha, 1),
    dirt: material(0xffffff, SURFACE.terra, 1),
    roof: material(0xffffff, SURFACE.telhado, 0.82), tin: material(0xffffff, SURFACE.lata, 0.48, 0.35),
    stone: material(0xffffff, SURFACE.pedra, 0.9), asphalt: material(0xffffff, SURFACE.asfalto, 0.95),
    rail: material(0x9aa4ac, SURFACE.metal, 0.3, 0.75),
    water: new THREE.MeshStandardMaterial({ color: 0xffffff, map: SURFACE.water, roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.76 }),
    cloud: new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 1 }),
  };
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

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(boxGeometry(w, h, d), mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = opts.cast !== false;
    mesh.receiveShadow = opts.receive !== false;
    if (opts.ry) mesh.rotation.y = opts.ry;
    root.add(mesh);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
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

  function addTube(points, radius, mat, tubular = 80, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.2);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubular, radius, 7, closed), mat);
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

  function signTexture(title, subtitle, bg, fg) {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = fg; ctx.lineWidth = 14; ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg;
    ctx.font = 'bold 76px "Arial Black", sans-serif'; ctx.fillText(title, canvas.width / 2, 94);
    ctx.font = 'bold 32px Arial, sans-serif'; ctx.fillText(subtitle, canvas.width / 2, 174);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /* Look de fim de tarde (LOOK.parque_treta): céu/fog/sol/hemi de uma fonte só;
     o shadow fica no builder porque ele conhece os limites do mapa. */
  const { hemi, sun } = applyLook(scene, T, 'parque_treta');
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -46; sun.shadow.camera.right = 46;
  sun.shadow.camera.top = 54; sun.shadow.camera.bottom = -54;
  sun.shadow.camera.far = 220; sun.shadow.bias = -0.0005;

  addCloud(-34, 22, -24, 2.2, 0.55);
  addCloud(8, 27, -34, 1.8, 0.38);
  addCloud(30, 20, -18, 1.65, 0.68);
  addCloud(-12, 24, 30, 1.75, 0.44);
  addBird(-28, 18, -20, 2.4, 2.0, 0.0);
  addBird(-20, 20, -25, 2.0, 2.3, 1.4);
  addBird(18, 22, -28, 1.8, 1.7, 2.8);

  // Pisos: grama, caminhos e praça ganham meio-fio, borda e manchas de terra batida.
  addFloor(HALF_X * 2, HALF_Z * 2, MAT.grass, 0, 0);
  addFloor(12, HALF_Z * 2, MAT.path, 0, 0, 0.025);
  addFloor(HALF_X * 2, 10, MAT.path, 0, 0, 0.03);
  addFloor(24, 24, MAT.plaza, 0, 0, 0.04);
  for (const sx of [-1, 1]) addFloor(8, HALF_Z * 2 - 6, MAT.path, sx * 22, 0, 0.025);
  for (const sx of [-1, 1]) {
    addBox(0.28, 0.13, HALF_Z * 2 - 6, MAT.stone, sx * 6.15, 0, 0, { collide: false });
    addBox(HALF_X * 2 - 6, 0.13, 0.28, MAT.stone, 0, 0, sx * 5.15, { collide: false });
    addBox(0.28, 0.12, HALF_Z * 2 - 8, MAT.stone, sx * 26.15, 0, 0, { collide: false });
  }
  for (const [x, z, w, d, ry] of [[0, -33, 9, 5, 0], [0, 33, 9, 5, 0], [-14, -16.5, 6, 4, 0.3], [14, 16.5, 6, 4, -0.3], [CORETO.x + 4.5, CORETO.z + 4.5, 5, 4, 0.5]]) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.dirt);
    patch.rotation.x = -Math.PI / 2; patch.rotation.z = ry; patch.position.set(x, 0.045, z);
    patch.receiveShadow = true; root.add(patch);
  }
  for (const s of [-1, 1]) {
    addBox(0.5, 0.1, 24.4, MAT.stone, s * 12.2, 0, 0, { collide: false });
    addBox(24.4, 0.1, 0.5, MAT.stone, 0, 0, s * 12.2, { collide: false });
  }

  // Cerca viva perimetral: contém a arena sem esconder o céu e os brinquedos.
  addBox(HALF_X * 2, 2.2, 0.8, MAT.hedge, 0, 0, -HALF_Z + 0.4);
  addBox(HALF_X * 2, 2.2, 0.8, MAT.hedge, 0, 0, HALF_Z - 0.4);
  addBox(0.8, 2.2, HALF_Z * 2, MAT.hedge, -HALF_X + 0.4, 0, 0);
  addBox(0.8, 2.2, HALF_Z * 2, MAT.hedge, HALF_X - 0.4, 0, 0);

  // Portal de entrada em cada base.
  for (const sz of [-1, 1]) {
    for (const sx of [-1, 1]) addBox(1.1, 7, 1.1, sx < 0 ? MAT.pink : MAT.blue, sx * 7, 0, sz * 35);
    addBox(15, 1.1, 1.1, MAT.yellow, 0, 7, sz * 35, { collide: false });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.1), new THREE.MeshLambertMaterial({ map: signTexture('PARQUE DA TRETA', sz < 0 ? 'ENTRADA DO TIME E' : 'ENTRADA DO TIME B', '#6b3fc5', '#fff7a8') }));
    board.position.set(0, 6.5, sz * 34.4); board.rotation.y = sz > 0 ? Math.PI : 0; root.add(board);
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
  for (const [x, z] of [[-7, -12], [7, -12], [-7, 12], [7, 12], [-23.5, -20], [23.5, -20], [-23.5, 20], [23.5, 20]]) {
    addCylinder(0.11, 4.2, MAT.dark, x, 0, z, { collide: false, segments: 7 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 7), MAT.yellow); lamp.position.set(x, 4.25, z); root.add(lamp);
  }
  for (const [x, z] of [[-16, -12], [16, -12], [-16, 12], [16, 12]]) {
    addCylinder(1.25, 0.45, MAT.wood, x, 0, z, { collide: false, segments: 12 });
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), lam({ color: COLORS[(i + (x > 0 ? 2 : 0)) % COLORS.length].color, map: SURFACE.folha, roughness: 0.85 }));
      flower.position.set(x + Math.cos(a) * 0.68, 0.62, z + Math.sin(a) * 0.68); root.add(flower);
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

  // Castelo inflável no flanco leste: silhueta grande, cover fragmentado, costuras e bocais.
  {
    const cx = 24, cz = 0;
    addBox(8.8, 4.4, 7.4, MAT.purple, cx, 0, cz);
    for (const dx of [-4.2, 4.2]) for (const dz of [-3.5, 3.5]) {
      addCylinder(1.45, 6.2, (dx + dz > 0) ? MAT.pink : MAT.blue, cx + dx, 0, cz + dz);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.0, 2.6, 10), MAT.yellow); roof.position.set(cx + dx, 7.5, cz + dz); root.add(roof);
    }
    addBox(2.4, 3.2, 0.4, MAT.dark, cx, 0, cz - 3.72, { collide: false });
    for (const dx of [-2.2, 0, 2.2]) addBox(0.09, 4.35, 0.06, MAT.purple, cx + dx, 0.02, cz - 3.72, { collide: false, cast: false });
    for (const dx of [-1.6, 1.6]) {
      const bocal = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 10), MAT.blue);
      bocal.rotation.x = Math.PI / 2; bocal.position.set(cx + dx, 0.5, cz - 4.15); bocal.castShadow = true; root.add(bocal);
    }
  }

  // Montanha-russa envolve o fundo sem fechar rotas nem criar colisão complexa.
  const coasterPoints = [
    new THREE.Vector3(-28, 4, -28), new THREE.Vector3(-17, 12, -31), new THREE.Vector3(-5, 7, -29),
    new THREE.Vector3(8, 16, -30), new THREE.Vector3(20, 6, -30), new THREE.Vector3(29, 10, -25),
  ];
  addTube(coasterPoints, 0.23, MAT.red);
  addTube(coasterPoints.map(p => new THREE.Vector3(p.x, p.y, p.z + 1.25)), 0.23, MAT.yellow);
  for (const p of coasterPoints) addCylinder(0.14, p.y, MAT.trunk, p.x, 0, p.z, { collide: false, segments: 7 });

  // Quiosques espelhados dão cobertura de cintura e quebram linhas de tiro; toldo e balcão tiram a cara de caixa.
  function kiosk(x, z, mat, title) {
    addBox(5.2, 2.6, 3.8, mat, x, 0, z);
    addBox(6.0, 0.4, 4.6, MAT.white, x, 2.6, z, { collide: false });
    const front = z < 0 ? 1 : -1;
    addBox(4.6, 0.9, 0.5, MAT.wood, x, 0, z + front * 2.05);
    const awning = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.7), new THREE.MeshStandardMaterial({ map: SURFACE.lona, roughness: 0.7, side: THREE.DoubleSide }));
    awning.position.set(x, 2.85, z + front * 2.35); awning.rotation.x = front * 1.12; awning.castShadow = true; root.add(awning);
    for (const sx of [-1, 1]) addCylinder(0.05, 2.5, MAT.dark, x + sx * 2.6, 0, z + front * 2.9, { collide: false, segments: 6 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.0), new THREE.MeshLambertMaterial({ map: signTexture(title, 'É AQUI!', '#ff4f9a', '#fff7e8') }));
    sign.position.set(x, 2.15, z + (z < 0 ? 1.93 : -1.93)); sign.rotation.y = z < 0 ? 0 : Math.PI; root.add(sign);
  }
  kiosk(-13, -19, MAT.blue, 'PIPOCA'); kiosk(13, 19, MAT.green, 'ALGODÃO DOCE');
  kiosk(13, -19, MAT.pink, 'PESCARIA'); kiosk(-13, 19, MAT.yellow, 'ARGOLA');

  // Barreiras de fila formam três rotas legíveis, sem labirinto.
  for (const sz of [-1, 1]) {
    for (const x of [-8, 8]) for (const z of [13, 17, 25, 29]) addBox(3.2, 1.15, 0.55, MAT.white, x, 0, sz * z);
  }
  for (const [x, z, mat] of [[-18, -10, MAT.pink], [18, 10, MAT.blue], [18, -10, MAT.yellow], [-18, 10, MAT.green]]) {
    addCylinder(0.18, 4.4, MAT.dark, x, 0, z);
    const balloon = new THREE.Mesh(new THREE.SphereGeometry(1.15, 14, 10), mat); balloon.scale.y = 1.2; balloon.position.set(x, 5.3, z); root.add(balloon);
  }

  // Espelhos d'água rasos decoram as bases sem alterar navegação.
  for (const sz of [-1, 1]) {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), MAT.water); pond.rotation.x = -Math.PI / 2; pond.position.set(-19, 0.045, sz * 29); root.add(pond);
    for (let i = 0; i < 4; i++) addCylinder(0.32, 0.7 + i * 0.18, MAT.white, -20.8 + i * 1.25, 0, sz * 29, { collide: false, segments: 8 });
  }

  // Coreto no quadrante sudoeste: palco octogonal, 8 colunas, telhado e bandeirolas.
  {
    const g = new THREE.Group(); g.name = 'parque-coreto'; g.position.set(CORETO.x, 0, CORETO.z); root.add(g);
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.65, 0.45, 8), MAT.stone);
    stage.position.y = 0.225; stage.castShadow = stage.receiveShadow = true; g.add(stage);
    colliders.push({ minX: CORETO.x - 2.9, maxX: CORETO.x + 2.9, minY: 0, maxY: 0.45, minZ: CORETO.z - 2.9, maxZ: CORETO.z + 2.9 });
    occluders.push(stage);
    const rimTiles = new THREE.Mesh(new THREE.CylinderGeometry(3.42, 3.42, 0.08, 8), MAT.plaza);
    rimTiles.position.y = 0.49; rimTiles.receiveShadow = true; g.add(rimTiles);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8, cx = Math.cos(a) * 2.9, cz = Math.sin(a) * 2.9;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 8), MAT.white);
      col.position.set(cx, 1.65, cz); col.castShadow = true; g.add(col);
      colliders.push({ minX: CORETO.x + cx - 0.16, maxX: CORETO.x + cx + 0.16, minY: 0.45, maxY: 2.85, minZ: CORETO.z + cz - 0.16, maxZ: CORETO.z + cz + 0.16 });
      occluders.push(col);
    }
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 4.5, 1.7, 8), MAT.roof);
    roof.position.y = 3.75; roof.castShadow = true; g.add(roof);
    const finial = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), MAT.yellow); finial.position.y = 4.75; g.add(finial);
    for (let i = 0; i < 8; i++) {
      const a0 = i * Math.PI / 4 + Math.PI / 8, a1 = (i + 1) * Math.PI / 4 + Math.PI / 8;
      for (let k = 1; k <= 3; k++) {
        const a = a0 + (a1 - a0) * k / 4;
        const flag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), COLORS[(i + k) % COLORS.length]);
        flag.rotation.z = Math.PI; flag.position.set(Math.cos(a) * 2.9, 2.72 - Math.sin(Math.PI * k / 4) * 0.22, Math.sin(a) * 2.9); g.add(flag);
      }
    }
  }

  // Trenzinho: circuito contornando o parque (barriga a leste desvia do castelo),
  // dois trilhos paralelos + dormentes instanciados + estação com plataforma e placa.
  const ringPts = [];
  {
    const R = 6, X = 27, Z = 34;
    for (let z = Z - R; z >= -(Z - R); z -= 2.4) ringPts.push(new THREE.Vector3(X + 2.8 * Math.max(0, Math.cos(Math.PI * z / 14)), 0, z));
    const arc = (cx, cz, a0, a1) => { const n = 8; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; ringPts.push(new THREE.Vector3(cx + R * Math.cos(a), 0, cz + R * Math.sin(a))); } };
    arc(X - R, -(Z - R), 0, -Math.PI / 2);
    for (let x = X - R; x >= -(X - R); x -= 2.4) ringPts.push(new THREE.Vector3(x, 0, -Z));
    arc(-(X - R), -(Z - R), -Math.PI / 2, -Math.PI);
    for (let z = -(Z - R); z <= Z - R; z += 2.4) ringPts.push(new THREE.Vector3(-X, 0, z));
    arc(-(X - R), Z - R, Math.PI, Math.PI / 2);
    for (let x = -(X - R); x <= X - R; x += 2.4) ringPts.push(new THREE.Vector3(x, 0, Z));
    arc(X - R, Z - R, Math.PI / 2, 0);
  }
  const ringCurve = new THREE.CatmullRomCurve3(ringPts, true, 'catmullrom', 0.15);
  const ringSamples = ringCurve.getSpacedPoints(300);
  for (const off of [-0.35, 0.35]) {
    const pts = ringSamples.map((p, i) => {
      const t = ringCurve.getTangent(i / ringSamples.length);
      const n = new THREE.Vector3(t.z, 0, -t.x).normalize();
      return new THREE.Vector3(p.x + n.x * off, 0.16, p.z + n.z * off);
    });
    const rail = addTube(pts, 0.055, MAT.rail, 300, true);
    rail.name = `parque-trilho-${off < 0 ? 0 : 1}`;
  }
  const dormBatch = new InstBatch({ name: 'parque-dormentes' });
  {
    const dummy = new THREE.Object3D();
    const step = Math.max(1, Math.floor(ringSamples.length / (ringCurve.getLength() / 0.9)));
    for (let i = 0; i < ringSamples.length; i += step) {
      const p = ringSamples[i], t = ringCurve.getTangent(i / ringSamples.length);
      dummy.position.set(p.x, 0.045, p.z);
      dummy.rotation.set(0, Math.atan2(t.x, t.z), 0);
      dummy.scale.setScalar(1); dummy.updateMatrix();
      dormBatch.add(boxGeometry(1.05, 0.07, 0.26), MAT.wood, dummy.matrix);
    }
  }
  dormBatch.build(root);
  {
    const g = new THREE.Group(); g.name = 'parque-estacao'; g.position.set(ESTACAO.x, 0, ESTACAO.z); root.add(g);
    const platform = new THREE.Mesh(boxGeometry(3.2, 0.4, 2.2), MAT.asphalt);
    platform.position.y = 0.2; platform.castShadow = platform.receiveShadow = true; g.add(platform);
    colliders.push({ minX: ESTACAO.x - 1.6, maxX: ESTACAO.x + 1.6, minY: 0, maxY: 0.4, minZ: ESTACAO.z - 1.1, maxZ: ESTACAO.z + 1.1 });
    occluders.push(platform);
    for (const dz of [-0.85, 0.85]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.3, 7), MAT.dark);
      post.position.set(-0.9, 1.55, dz); post.castShadow = true; g.add(post);
    }
    const roofE = new THREE.Mesh(boxGeometry(2.6, 0.12, 2.6), MAT.roof);
    roofE.position.set(-0.9, 2.75, 0); roofE.rotation.z = 0.1; roofE.castShadow = true; g.add(roofE);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshLambertMaterial({ map: signTexture('ESTAÇÃO', 'TRENZINHO DO PARQUE', '#2a6e3f', '#fff7a8') }));
    board.position.set(-1.05, 2.1, 0); board.rotation.y = -Math.PI / 2; g.add(board);
  }

  // Lixeiras instanciadas com variação de cor; bancos de praça, três deles quebrados.
  const binGeo = mergeParts([
    new THREE.CylinderGeometry(0.3, 0.26, 0.82, 10).translate(0, 0.41, 0),
    new THREE.CylinderGeometry(0.33, 0.33, 0.09, 10).translate(0, 0.87, 0),
  ]);
  const binBatch = new InstBatch({ name: 'parque-lixeira-lote' });
  const BIN_CORES = [0x2e7d32, 0xf9a825, 0x1565c0];
  {
    const dummy = new THREE.Object3D();
    [[-9.5, -13.5], [9.5, 13.5], [-13.5, 17], [13.5, -17], [-24, -9], [24, 9], [-8, 27.5], [8, -27.5]].forEach(([x, z], i) => {
      dummy.position.set(x, 0, z); dummy.rotation.set(0, i * 1.3, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
      binBatch.add(binGeo, MAT.tin, dummy.matrix, BIN_CORES[i % BIN_CORES.length]);
      colliders.push({ minX: x - 0.32, maxX: x + 0.32, minY: 0, maxY: 0.92, minZ: z - 0.32, maxZ: z + 0.32 });
    });
  }
  occluders.push(...binBatch.build(root));

  const BANCOS = [
    { x: -22, z: 12, ry: Math.PI / 2 }, { x: 22, z: -12, ry: -Math.PI / 2 },
    { x: -22, z: -24, ry: Math.PI / 2, quebrado: 'torta' }, { x: 22, z: 24, ry: -Math.PI / 2 },
    { x: -7.4, z: -21, ry: Math.PI / 2 }, { x: 7.4, z: 21, ry: -Math.PI / 2, quebrado: 'sem-tabua' },
    { x: -25.5, z: 6, ry: 0, quebrado: 'sem-encosto' },
  ];
  BANCOS.forEach((cfg, bi) => {
    const g = new THREE.Group(); g.name = `parque-banco-${bi}`;
    g.position.set(cfg.x, 0, cfg.z); g.rotation.y = cfg.ry; root.add(g);
    for (const lx of [-0.75, 0.75]) {
      const leg = new THREE.Mesh(boxGeometry(0.12, 0.44, 0.55), MAT.dark); leg.position.set(lx, 0.22, 0); leg.castShadow = true; g.add(leg);
    }
    for (let p = 0; p < 3; p++) {
      if (cfg.quebrado === 'sem-tabua' && p === 1) continue;
      const plank = new THREE.Mesh(boxGeometry(1.8, 0.06, 0.16), MAT.wood);
      plank.position.set(0, 0.47, -0.18 + p * 0.18); plank.castShadow = true;
      if (cfg.quebrado === 'torta' && p === 2) { plank.rotation.z = 0.16; plank.position.y = 0.43; }
      g.add(plank);
    }
    for (let p = 0; p < 2; p++) {
      if (cfg.quebrado === 'sem-encosto' && p === 1) continue;
      const back = new THREE.Mesh(boxGeometry(1.8, 0.15, 0.05), MAT.wood);
      back.position.set(0, 0.78 + p * 0.22, -0.32); back.rotation.x = -0.14; back.castShadow = true; g.add(back);
    }
    colliders.push({ minX: cfg.x - 0.95, maxX: cfg.x + 0.95, minY: 0, maxY: 0.52, minZ: cfg.z - 0.35, maxZ: cfg.z + 0.35 });
    occluders.push(g.children[2]);
  });

  /* Vegetação densa instanciada. Troncos têm colisor fino; copas e arbustos não
     têm colisor nenhum — a grade de waypoints é derivada dos colisores no fim
     do build e as rotas não podem morrer. Candidatos a árvore ficam a ≥0,9 m
     do reticulado de nós (STEP 3,2) para não derrubar nó. */
  const jitterGeo = (geo, amp, seed) => {
    let s = seed >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + (rnd() - 0.5) * amp, pos.getY(i) + (rnd() - 0.5) * amp, pos.getZ(i) + (rnd() - 0.5) * amp);
    geo.computeVertexNormals();
    return geo;
  };
  const trunkPain = new THREE.CylinderGeometry(0.16, 0.24, 2.4, 7).translate(0, 1.2, 0);
  const canopyPain = jitterGeo(new THREE.SphereGeometry(1.9, 10, 8).scale(1, 0.82, 1).translate(0, 3.05, 0), 0.34, 7101);
  const trunkPalm = new THREE.CylinderGeometry(0.11, 0.17, 4.6, 7).translate(0, 2.3, 0);
  const crownPalm = mergeParts((() => {
    const parts = [];
    for (let i = 0; i < 7; i++) {
      const f = new THREE.BoxGeometry(0.16, 0.05, 2.1).translate(0, 0, 0.85);
      f.rotateX(0.52); f.rotateY(i * Math.PI * 2 / 7); f.translate(0, 4.72, 0);
      parts.push(f);
    }
    parts.push(new THREE.SphereGeometry(0.22, 7, 5).translate(0, 4.68, 0));
    return parts;
  })());
  const shrubGeo = jitterGeo(new THREE.SphereGeometry(0.7, 8, 6).scale(1, 0.72, 1).translate(0, 0.42, 0), 0.22, 4402);

  const CLEAR_RECT = [
    [-6.8, -HALF_Z, 6.8, HALF_Z], [-HALF_X, -5.8, HALF_X, 5.8],
    [-13.8, 31.5, 13.8, HALF_Z], [-13.8, -HALF_Z, 13.8, -31.5],
  ];
  const CLEAR_CIRC = [
    [18, -33, 4.5], [-18, 33, 4.5], [0, 10, 4],
    [WHEEL_X, 0, 6.5], [24, 0, 7.5], [CORETO.x, CORETO.z, 5.8], [ESTACAO.x, ESTACAO.z, 4],
    [-19, 29, 4.8], [-19, -29, 4.8],
    [-13, -19, 4.2], [13, 19, 4.2], [13, -19, 4.2], [-13, 19, 4.2],
  ];
  const NODE0_X = -HALF_X + 2, NODE0_Z = -HALF_Z + 2, NSTEP = 3.2;
  const pertoDeNo = (x, z) => {
    const lx = NODE0_X + Math.round((x - NODE0_X) / NSTEP) * NSTEP;
    const lz = NODE0_Z + Math.round((z - NODE0_Z) / NSTEP) * NSTEP;
    return Math.hypot(x - lx, z - lz) < 0.9;
  };
  const emColisor = (x, z, pad) => colliders.some(c => x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad);
  const pertoDoTrilho = (x, z) => {
    for (let i = 0; i < ringSamples.length; i += 4) if (Math.hypot(x - ringSamples[i].x, z - ringSamples[i].z) < 1.3) return true;
    return false;
  };
  const livreVeg = (x, z, pad = 0.7) =>
    !pertoDeNo(x, z) && !emColisor(x, z, pad) && !pertoDoTrilho(x, z)
    && !CLEAR_RECT.some(r => x > r[0] && x < r[2] && z > r[1] && z < r[3])
    && !CLEAR_CIRC.some(c => Math.hypot(x - c[0], z - c[1]) < c[2]);

  let vegSeed = 20260825;
  const vrnd = () => ((vegSeed = (vegSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const candidatos = [];
  for (let z = -38.5; z <= 38.5; z += 3.4) {
    candidatos.push([-29.5 + vrnd() * 0.8, z + (vrnd() - 0.5) * 1.4]);
    candidatos.push([29.5 - vrnd() * 0.8, z + (vrnd() - 0.5) * 1.4]);
  }
  for (let x = -28.5; x <= 28.5; x += 3.4) {
    candidatos.push([x + (vrnd() - 0.5) * 1.4, -39.5 + vrnd() * 0.9]);
    candidatos.push([x + (vrnd() - 0.5) * 1.4, 39.5 - vrnd() * 0.9]);
  }
  for (let z = -30; z <= 30; z += 6.8) {
    candidatos.push([-18.6, z + (vrnd() - 0.5) * 2.2]); candidatos.push([18.6, z + (vrnd() - 0.5) * 2.2]);
    candidatos.push([-25.6, z + 3.4 + (vrnd() - 0.5) * 2.2]); candidatos.push([25.6, z + 3.4 + (vrnd() - 0.5) * 2.2]);
  }
  for (const [cx, cz] of [[-27, -36], [27, -36], [-27, 36], [27, 36]])
    for (let i = 0; i < 4; i++) candidatos.push([cx + (vrnd() - 0.5) * 5.5, cz + (vrnd() - 0.5) * 4.5]);

  const batPainT = new InstBatch({ name: 'parque-arvores-paineira' });
  const batPainC = new InstBatch({ name: 'parque-copas-paineira' });
  const batPalmT = new InstBatch({ name: 'parque-arvores-palmeira' });
  const batPalmC = new InstBatch({ name: 'parque-copas-palmeira' });
  const batArbA = new InstBatch({ name: 'parque-arbustos-buxinho' });
  const batArbB = new InstBatch({ name: 'parque-arbustos-flor' });
  const CORES_COPA = [0x2f8f3f, 0x57a83e, 0x3f9e58, 0x6fae4a, 0x2a7a46];
  const dummy = new THREE.Object3D();
  const plantadas = [];
  let nArvore = 0;
  for (const [x, z] of candidatos) {
    if (!livreVeg(x, z)) continue;
    if (plantadas.some(p => Math.hypot(x - p[0], z - p[1]) < 2.3)) continue;
    plantadas.push([x, z]);
    const palmeira = nArvore % 4 === 3;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(palmeira ? (vrnd() - 0.5) * 0.09 : 0, vrnd() * Math.PI * 2, palmeira ? (vrnd() - 0.5) * 0.09 : 0);
    const s = 0.85 + vrnd() * 0.45;
    dummy.scale.set(s, s * (0.9 + vrnd() * 0.3), s); dummy.updateMatrix();
    const cor = CORES_COPA[Math.floor(vrnd() * CORES_COPA.length)];
    if (palmeira) { batPalmT.add(trunkPalm, MAT.trunk, dummy.matrix); batPalmC.add(crownPalm, MAT.leaf, dummy.matrix, cor); }
    else { batPainT.add(trunkPain, MAT.trunk, dummy.matrix); batPainC.add(canopyPain, MAT.leaf, dummy.matrix, cor); }
    const hTronco = (palmeira ? 4.6 : 2.4) * dummy.scale.y;
    colliders.push({ minX: x - 0.2, maxX: x + 0.2, minY: 0, maxY: Math.min(hTronco, 2.4), minZ: z - 0.2, maxZ: z + 0.2 });
    nArvore++;
    if (vrnd() < 0.9) {
      const aa = vrnd() * Math.PI * 2, dd = 1.5 + vrnd() * 0.9, sx = x + Math.cos(aa) * dd, sz = z + Math.sin(aa) * dd;
      if (livreVeg(sx, sz, 0.3)) {
        dummy.position.set(sx, 0, sz); dummy.rotation.set(0, vrnd() * Math.PI * 2, 0);
        const ss = 0.7 + vrnd() * 0.8; dummy.scale.set(ss, ss * (0.8 + vrnd() * 0.4), ss); dummy.updateMatrix();
        (vrnd() < 0.72 ? batArbA : batArbB).add(shrubGeo, MAT.leaf, dummy.matrix, vrnd() < 0.72 ? 0x2c7a38 : 0x9e6fb8);
      }
    }
  }
  // Faixa de arbustos rente à cerca viva, fechando o rodapé da sebe.
  for (let z = -39; z <= 39; z += 2.4) for (const sx of [-30.4, 30.4]) {
    const x = sx + (vrnd() - 0.5) * 0.7, zz = z + (vrnd() - 0.5) * 1.1;
    if (!livreVeg(x, zz, 0.3)) continue;
    dummy.position.set(x, 0, zz); dummy.rotation.set(0, vrnd() * Math.PI * 2, 0);
    const ss = 0.75 + vrnd() * 0.7; dummy.scale.set(ss, ss * (0.8 + vrnd() * 0.4), ss); dummy.updateMatrix();
    (vrnd() < 0.8 ? batArbA : batArbB).add(shrubGeo, MAT.leaf, dummy.matrix, vrnd() < 0.8 ? 0x2c7a38 : 0x9e6fb8);
  }
  for (let x = -28; x <= 28; x += 2.4) for (const sz of [-40.3, 40.3]) {
    const z = sz + (vrnd() - 0.5) * 0.7, xx = x + (vrnd() - 0.5) * 1.1;
    if (!livreVeg(xx, z, 0.3)) continue;
    dummy.position.set(xx, 0, z); dummy.rotation.set(0, vrnd() * Math.PI * 2, 0);
    const ss = 0.75 + vrnd() * 0.7; dummy.scale.set(ss, ss * (0.8 + vrnd() * 0.4), ss); dummy.updateMatrix();
    (vrnd() < 0.8 ? batArbA : batArbB).add(shrubGeo, MAT.leaf, dummy.matrix, vrnd() < 0.8 ? 0x2c7a38 : 0x9e6fb8);
  }
  occluders.push(...batPainT.build(root));
  batPainC.build(root);
  occluders.push(...batPalmT.build(root));
  batPalmC.build(root);
  batArbA.build(root);
  batArbB.build(root);

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

  const blocked = (x, z, inflate = 0.45) => colliders.some(c => c.minY < 1.6 && c.maxY > 0.15 && x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate);
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
    pigeons: [
      { mode: 'ground', pos: [-6, 0, -10], phase: .2 }, { mode: 'ground', pos: [8, 0, -4], phase: 1.0 },
      { mode: 'ground', pos: [-4, 0, 12], phase: 1.9 },
      { mode: 'ground', pos: [-4.6, 0, 10.6], phase: .7 },
    ],
    dogs: [{ pos: [-4, 0, 24], to: [0, 0, 24], phase: .5 }],
    /* vida 1: papagaio de poleiro no topo do globo dos postes do parque (fauna 2).
       y=4,62 = topo do globo (poste 0→4,2, globo →4,63); iterado por captura
       mapview 19/08: y=1,02 flutuava no ar, y=4,45 ficava atrás do globo */
    parrots: [
      { pos: [7, 4.62, 12], phase: 1.2 }, { pos: [-7, 4.62, -12], phase: 2.6 },
    ],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.passaros,pos:[0,3,0],radius:70,vol:.28},{src:AMB_LOOPS.grilos,pos:[0,3,0],radius:70,vol:.16}],bioma:'campo'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt: () => 0, slowAt: () => false, update, sun, hemi, pickups,
    spawns: {
      E: [-9, -3, 3, 9].map(x => ({ x, z: -38.5, yaw: 0 })),
      B: [-9, -3, 3, 9].map(x => ({ x, z: 38.5, yaw: Math.PI })),
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
