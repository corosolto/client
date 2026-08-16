// Parque da Treta: arena CTF simétrica, colorida e inteiramente procedural.
import * as THREE from 'three';

const HALF_X = 32;
const HALF_Z = 42;
const WHEEL_X = -19;
const WHEEL_Y = 14.5;
const WHEEL_FRAME_Z = -1.2;

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
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); texture.anisotropy = 4;
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

  scene.background = new THREE.Color(0x75cef2);
  scene.fog = new THREE.Fog(0x92d9ef, 76, 155);
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
  for (const [x, z] of [[-7, -12], [7, -12], [-7, 12], [7, 12], [-27, -18], [27, -18], [-27, 18], [27, 18]]) {
    addCylinder(0.11, 4.2, MAT.dark, x, 0, z, { collide: false, segments: 7 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 7), MAT.yellow); lamp.position.set(x, 4.25, z); root.add(lamp);
  }
  for (const [x, z] of [[-16, -12], [16, -12], [-16, 12], [16, 12]]) {
    addCylinder(1.25, 0.45, MAT.wood, x, 0, z, { collide: false, segments: 12 });
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4;
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), COLORS[(i + (x > 0 ? 2 : 0)) % COLORS.length]);
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
  for (const p of coasterPoints) addCylinder(0.14, p.y, MAT.dark, p.x, 0, p.z, { collide: false, segments: 7 });

  // Quiosques espelhados dão cobertura de cintura e quebram linhas de tiro.
  function kiosk(x, z, mat, title) {
    addBox(5.2, 2.6, 3.8, mat, x, 0, z);
    addBox(6.0, 0.4, 4.6, MAT.white, x, 2.6, z, { collide: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.0), new THREE.MeshLambertMaterial({ map: signTexture(title, 'É AQUI!', '#ff4f9a', '#fff7e8') }));
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
    const pond = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), MAT.water); pond.rotation.x = -Math.PI / 2; pond.position.set(-21, 0.045, sz * 31); root.add(pond);
    for (let i = 0; i < 4; i++) addCylinder(0.32, 0.7 + i * 0.18, MAT.white, -23 + i * 1.35, 0, sz * 31, { collide: false, segments: 8 });
  }

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

  return {
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
