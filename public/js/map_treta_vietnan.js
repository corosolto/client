// Treta no Vietnã — arena de selva úmida com vilarejo e guaritas elevadas.
// Materiais são procedurais e originais; o pacote GoldSrc anexado serviu só de referência.
import * as THREE from 'three';

const HALF = 42;
const TOWER_TOP = 3.2;

function canvasTexture(draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  draw(ctx, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 4;
  return texture;
}

function seededNoise(seed) {
  let n = seed >>> 0;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

function makeLeafTextures() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rnd = seededNoise(1973);
  ctx.fillStyle = '#849772';
  ctx.fillRect(0, 0, 256, 256);
  ctx.beginPath();
  ctx.moveTo(128, 15);
  ctx.bezierCurveTo(202, 48, 221, 151, 128, 241);
  ctx.bezierCurveTo(35, 151, 54, 48, 128, 15);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  const gradient = ctx.createLinearGradient(42, 20, 210, 235);
  gradient.addColorStop(0, '#d5e2bd');
  gradient.addColorStop(0.48, '#9eb57d');
  gradient.addColorStop(1, '#6f8956');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) {
    const shade = 95 + Math.floor(rnd() * 90);
    ctx.fillStyle = `rgba(${shade},${shade + 12},${shade - 8},${0.05 + rnd() * 0.13})`;
    ctx.beginPath();
    ctx.ellipse(rnd() * 256, rnd() * 256, 2 + rnd() * 9, 1 + rnd() * 5, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  for (let i = 0; i < 58; i++) {
    const x = rnd() * 256, y = rnd() * 256, angle = rnd() * Math.PI;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = `rgba(${82 + rnd() * 55},${105 + rnd() * 65},${66 + rnd() * 42},${0.12 + rnd() * 0.2})`;
    ctx.beginPath(); ctx.ellipse(0, 0, 3 + rnd() * 8, 1.2 + rnd() * 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(45,63,35,.32)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(46,66,32,.75)';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(128, 232); ctx.quadraticCurveTo(122, 124, 128, 23); ctx.stroke();
  ctx.lineWidth = 2;
  for (let y = 48; y <= 205; y += 23) {
    const reach = 39 + (1 - Math.abs(y - 128) / 128) * 31;
    ctx.beginPath(); ctx.moveTo(126, y + 8); ctx.quadraticCurveTo(91, y - 4, 128 - reach, y - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, y + 8); ctx.quadraticCurveTo(165, y - 5, 128 + reach, y - 17); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(222,232,197,.42)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const color = new THREE.CanvasTexture(canvas);
  color.colorSpace = THREE.SRGBColorSpace;
  color.anisotropy = 4;
  const bump = new THREE.CanvasTexture(canvas);
  bump.colorSpace = THREE.NoColorSpace;
  bump.anisotropy = 4;
  return { color, bump };
}

function makeWarSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const rnd = seededNoise(1968);
  const dusk = ctx.createLinearGradient(0, 0, 0, 512);
  dusk.addColorStop(0, '#111820');
  dusk.addColorStop(0.48, '#273039');
  dusk.addColorStop(0.78, '#4b4c47');
  dusk.addColorStop(1, '#75634c');
  ctx.fillStyle = dusk; ctx.fillRect(0, 0, 1024, 512);
  ctx.save();
  ctx.filter = 'blur(24px)';
  for (let layer = 0; layer < 4; layer++) {
    const yBase = 78 + layer * 76;
    for (let i = 0; i < 78; i++) {
      const shade = 17 + layer * 9 + Math.floor(rnd() * 18);
      ctx.fillStyle = `rgba(${shade},${shade + 6},${shade + 9},${0.10 + rnd() * 0.18})`;
      ctx.beginPath();
      ctx.ellipse(rnd() * 1024, yBase + (rnd() - 0.5) * 110,
        28 + rnd() * 110, 12 + rnd() * 38, rnd() * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  for (let i = 0; i < 145; i++) {
    const x = rnd() * 1024, y = 250 + rnd() * 230;
    ctx.strokeStyle = `rgba(182,194,195,${0.025 + rnd() * 0.045})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 19 + rnd() * 23); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 2;
  return texture;
}

function makeMaterials() {
  const dirt = canvasTexture((ctx, w, h) => {
    const rnd = seededNoise(1948);
    ctx.fillStyle = '#625039'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1250; i++) {
      const light = 45 + Math.floor(rnd() * 36);
      ctx.fillStyle = `rgba(${light + 25},${light + 17},${light},${0.08 + rnd() * 0.16})`;
      const r = 1 + rnd() * 5;
      ctx.fillRect(rnd() * w, rnd() * h, r * 2.4, r);
    }
    for (let i = 0; i < 58; i++) {
      ctx.fillStyle = `rgba(${48 + rnd() * 20},${72 + rnd() * 24},${35 + rnd() * 14},${0.10 + rnd() * 0.16})`;
      ctx.beginPath(); ctx.ellipse(rnd() * w, rnd() * h, 5 + rnd() * 20, 3 + rnd() * 12, rnd() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
  }, 11, 11);
  const wood = canvasTexture((ctx, w, h) => {
    const rnd = seededNoise(1969);
    ctx.fillStyle = '#6f4a28'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32) {
      ctx.fillStyle = x % 64 ? '#76502d' : '#644222'; ctx.fillRect(x, 0, 29, h);
      ctx.fillStyle = 'rgba(30,18,9,.42)'; ctx.fillRect(x + 28, 0, 4, h);
      for (let i = 0; i < 10; i++) {
        ctx.strokeStyle = `rgba(38,20,8,${0.12 + rnd() * 0.18})`; ctx.lineWidth = 1 + rnd() * 2;
        ctx.beginPath(); ctx.moveTo(x + 3, rnd() * h); ctx.bezierCurveTo(x + 10, rnd() * h, x + 20, rnd() * h, x + 26, rnd() * h); ctx.stroke();
      }
    }
  }, 3, 2);
  const bamboo = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#a39256'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 18) {
      ctx.fillStyle = x % 36 ? '#b8a767' : '#958348'; ctx.fillRect(x, 0, 14, h);
      ctx.fillStyle = 'rgba(43,45,20,.45)'; ctx.fillRect(x + 14, 0, 4, h);
      for (let y = 18; y < h; y += 50) { ctx.fillStyle = 'rgba(60,55,24,.55)'; ctx.fillRect(x, y, 15, 4); }
    }
  }, 4, 2);
  const metal = canvasTexture((ctx, w, h) => {
    const rnd = seededNoise(1975);
    ctx.fillStyle = '#6f765f'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 20) {
      ctx.fillStyle = x % 40 ? '#7f856c' : '#626956'; ctx.fillRect(x, 0, 17, h);
      ctx.fillStyle = 'rgba(25,29,24,.35)'; ctx.fillRect(x + 17, 0, 3, h);
    }
    for (let i = 0; i < 75; i++) {
      ctx.fillStyle = `rgba(112,52,25,${0.16 + rnd() * 0.25})`;
      ctx.beginPath(); ctx.arc(rnd() * w, rnd() * h, 2 + rnd() * 8, 0, Math.PI * 2); ctx.fill();
    }
  }, 4, 2);
  const stone = canvasTexture((ctx, w, h) => {
    const rnd = seededNoise(1972);
    ctx.fillStyle = '#777968'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(37,40,31,.5)'; ctx.lineWidth = 5;
    for (let y = 0; y <= h; y += 42) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      const off = (Math.floor(y / 42) % 2) * 31;
      for (let x = off; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 42); ctx.stroke(); }
    }
    for (let i = 0; i < 150; i++) { ctx.fillStyle = `rgba(175,170,135,${rnd() * 0.12})`; ctx.fillRect(rnd() * w, rnd() * h, 4, 3); }
  }, 3, 2);

  const foliage = makeLeafTextures();
  const woodBump = wood.clone(); woodBump.colorSpace = THREE.NoColorSpace;
  const bambooBump = bamboo.clone(); bambooBump.colorSpace = THREE.NoColorSpace;
  const leafMaterial = (color) => new THREE.MeshStandardMaterial({
    color, map: foliage.color, bumpMap: foliage.bump, bumpScale: 0.055,
    roughness: 0.88, metalness: 0, side: THREE.DoubleSide,
  });
  const lam = (map, color = 0xffffff) => new THREE.MeshLambertMaterial({ map, color });
  return {
    dirt: lam(dirt, 0xa59b8c), wood: lam(wood, 0xb89570), bamboo: lam(bamboo), metal: lam(metal), stone: lam(stone),
    towerWood: new THREE.MeshStandardMaterial({ map: wood, bumpMap: woodBump, bumpScale: 0.075, color: 0xa17a59, roughness: 0.92, metalness: 0 }),
    towerBamboo: new THREE.MeshStandardMaterial({ map: bamboo, bumpMap: bambooBump, bumpScale: 0.055, color: 0xa29575, roughness: 0.9, metalness: 0 }),
    mud: new THREE.MeshLambertMaterial({ color: 0x443a25 }),
    darkWood: new THREE.MeshLambertMaterial({ color: 0x392719 }),
    sandbag: new THREE.MeshLambertMaterial({ color: 0x8e8259 }),
    leaf: leafMaterial(0x315b27),
    leafLight: leafMaterial(0x4d7835),
    trunk: new THREE.MeshLambertMaterial({ color: 0x49351f }),
    water: new THREE.MeshLambertMaterial({ color: 0x536f50, transparent: true, opacity: 0.78 }),
    black: new THREE.MeshLambertMaterial({ color: 0x20231f }),
    steel: new THREE.MeshLambertMaterial({ color: 0x626963 }),
    smoke: new THREE.MeshLambertMaterial({ color: 0x303638, transparent: true, opacity: 0.12, depthWrite: false }),
  };
}

export function buildTretaVietnam(scene) {
  const root = new THREE.Group();
  root.name = 'treta-no-vietnan';
  scene.add(root);
  const colliders = [], occluders = [], pickups = [];
  const M = makeMaterials();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(145, 32, 16), new THREE.MeshBasicMaterial({
    map: makeWarSkyTexture(), side: THREE.BackSide, fog: false, depthWrite: false,
  }));
  sky.name = 'ceu-tempestade-vietnan'; sky.renderOrder = -1000; scene.add(sky);
  const boxGeometries = new Map();

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const geometryKey = `${w}:${h}:${d}`;
    let geometry = boxGeometries.get(geometryKey);
    if (!geometry) { geometry = new THREE.BoxGeometry(w, h, d); boxGeometries.set(geometryKey, geometry); }
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y + h / 2, z);
    if (opts.rx) mesh.rotation.x = opts.rx;
    if (opts.ry) mesh.rotation.y = opts.ry;
    if (opts.rz) mesh.rotation.z = opts.rz;
    mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true;
    mesh.name = opts.name || '';
    root.add(mesh);
    if (opts.occlude !== false) occluders.push(mesh);
    if (opts.collide !== false) {
      const ex = opts.ex ?? (opts.ry ? Math.abs(Math.cos(opts.ry)) * w / 2 + Math.abs(Math.sin(opts.ry)) * d / 2 : w / 2);
      const ez = opts.ez ?? (opts.ry ? Math.abs(Math.sin(opts.ry)) * w / 2 + Math.abs(Math.cos(opts.ry)) * d / 2 : d / 2);
      colliders.push({ minX: x - ex, maxX: x + ex, minY: y, maxY: y + h, minZ: z - ez, maxZ: z + ez });
    }
    return mesh;
  }

  function addCylinder(rt, rb, h, seg, mat, x, y, z, collide = false) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    mesh.position.set(x, y + h / 2, z); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    occluders.push(mesh);
    if (collide) colliders.push({ minX: x - rb, maxX: x + rb, minY: y, maxY: y + h, minZ: z - rb, maxZ: z + rb });
    return mesh;
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), M.dirt);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'terra-selva'; root.add(ground);
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(7, 62), M.water);
  stream.rotation.x = -Math.PI / 2; stream.position.set(0, 0.025, 0); root.add(stream);
  for (const z of [-28, -9, 10, 29]) {
    addBox(9, 0.22, 3.2, M.wood, 0, 0.02, z, { collide: false, name: 'ponte-madeira' });
    for (const x of [-3.8, 3.8]) addBox(0.18, 0.8, 3.2, M.darkWood, x, 0.2, z, { collide: false, occlude: false });
  }

  addBox(HALF * 2 + 2, 2.6, 1.1, M.stone, 0, 0, -HALF - 0.5);
  addBox(HALF * 2 + 2, 2.6, 1.1, M.stone, 0, 0, HALF + 0.5);
  addBox(1.1, 2.6, HALF * 2, M.stone, -HALF - 0.5, 0, 0);
  addBox(1.1, 2.6, HALF * 2, M.stone, HALF + 0.5, 0, 0);

  function hut(x, z, ry = 0) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = ry; root.add(group);
    const part = (w, h, d, mat, px, py, pz) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, py + h / 2, pz); m.castShadow = true; m.receiveShadow = true; group.add(m); occluders.push(m); return m;
    };
    part(7.2, 0.12, 5.2, M.wood, 0, 0.02, 0);
    for (const px of [-3.1, 3.1]) for (const pz of [-2.1, 2.1]) part(0.35, 0.18, 0.35, M.darkWood, px, 0, pz);
    part(0.35, 2.8, 5.2, M.bamboo, -3.45, 0.14, 0);
    part(0.35, 2.8, 5.2, M.bamboo, 3.45, 0.14, 0);
    part(4.8, 2.8, 0.35, M.bamboo, -1.2, 0.14, -2.45);
    part(1.4, 2.8, 0.35, M.bamboo, 2.9, 0.14, -2.45);
    part(7.5, 0.22, 3.2, M.metal, 0, 3.08, -1.55).rotation.x = -0.23;
    part(7.5, 0.22, 3.2, M.metal, 0, 3.08, 1.55).rotation.x = 0.23;
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const collider = (lx, lz, hx, hz, h = 3.8) => {
      const wx = x + lx * cs + lz * sn, wz = z - lx * sn + lz * cs;
      colliders.push({ minX: wx - hx, maxX: wx + hx, minY: 0, maxY: h, minZ: wz - hz, maxZ: wz + hz });
    };
    collider(-3.45, 0, 0.35, 2.6); collider(3.45, 0, 0.35, 2.6);
    collider(-1.2, -2.45, 2.4, 0.35); collider(2.9, -2.45, 0.7, 0.35);
  }
  hut(-13, -16, 0.12); hut(14, 15, Math.PI + 0.12); hut(-14, 15, Math.PI - 0.08); hut(13, -16, -0.08);

  function spawnPalisade(z, direction) {
    for (let i = 0; i < 4; i++) {
      const x = -12 + i * 8;
      const offsetZ = (i % 2 ? 0.55 : -0.55) * direction;
      addBox(5.6, 2.35, 0.48, M.bamboo, x, 0, z + offsetZ, { name: 'barreira-spawn-bambu' });
      addBox(5.9, 0.16, 0.18, M.darkWood, x, 0.45, z + offsetZ - 0.27 * direction,
        { collide: false, occlude: false, name: 'travessa-barreira-spawn' });
      addBox(5.9, 0.16, 0.18, M.darkWood, x, 1.65, z + offsetZ - 0.27 * direction,
        { collide: false, occlude: false, name: 'travessa-barreira-spawn' });
    }
  }
  spawnPalisade(-32, 1);
  spawnPalisade(32, -1);

  function sandbagWall(x, z, count, alongX, ry = 0) {
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * 1.25;
      const px = x + (alongX ? offset : 0), pz = z + (alongX ? 0 : offset);
      const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.72, 3, 7), M.sandbag);
      bag.rotation.z = Math.PI / 2; bag.rotation.y = ry; bag.scale.z = 0.68;
      bag.position.set(px, 0.38, pz); bag.castShadow = true; bag.receiveShadow = true; root.add(bag); occluders.push(bag);
    }
    const w = alongX ? count * 1.25 : 0.9, d = alongX ? 0.9 : count * 1.25;
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: 0, maxY: 0.85, minZ: z - d / 2, maxZ: z + d / 2 });
  }
  sandbagWall(-9, -3, 6, true); sandbagWall(10, 3, 6, true);
  sandbagWall(-20, 5, 5, false, Math.PI / 2); sandbagWall(21, -6, 5, false, Math.PI / 2);
  sandbagWall(-5, 27, 5, true); sandbagWall(6, -28, 5, true);

  function crate(x, z, size = 1.8, h = 1.6) {
    const m = addBox(size, h, size, M.wood, x, 0, z, { name: 'caixa-suprimentos' });
    for (const y of [0.18, h - 0.18]) {
      addBox(size + 0.05, 0.14, 0.12, M.darkWood, x, y, z + size / 2 + 0.02, { collide: false, occlude: false });
      addBox(size + 0.05, 0.14, 0.12, M.darkWood, x, y, z - size / 2 - 0.02, { collide: false, occlude: false });
    }
    return m;
  }
  [[-7,-27],[8,27],[-24,-18],[24,18],[-7,7],[8,-8],[-30,18],[30,-19]].forEach(([x,z], i) => crate(x, z, i % 3 ? 1.7 : 2.1, i % 2 ? 1.45 : 1.8));
  [
    [-17,-29],[-12,-23],[-3,-30],[4,-25],[12,-30],[18,-23],
    [-18,23],[-12,30],[-4,25],[3,30],[12,23],[17,29],
  ].forEach(([x,z], i) => crate(x, z, 1.35 + (i % 2) * 0.2, 1.05 + (i % 3) * 0.12));

  function tree(x, z, scale = 1) {
    addCylinder(0.26 * scale, 0.38 * scale, 4.8 * scale, 7, M.trunk, x, 0, z, true);
    for (let i = 0; i < 3; i++) {
      const crown = new THREE.Mesh(new THREE.DodecahedronGeometry((1.65 - i * 0.15) * scale, 1), i % 2 ? M.leafLight : M.leaf);
      crown.position.set(x + (i - 1) * 0.65 * scale, (4.3 + i * 0.55) * scale, z + (i % 2 ? 0.55 : -0.35) * scale);
      crown.scale.y = 0.72; crown.castShadow = true; root.add(crown);
    }
  }
  function undergrowth(x, z, scale = 1) {
    const group = new THREE.Group(); group.position.set(x, 0.05, z); root.add(group);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28 * scale, (0.9 + (i % 3) * 0.18) * scale, 4), i % 2 ? M.leafLight : M.leaf);
      const a = i * Math.PI * 2 / 7;
      leaf.position.set(Math.cos(a) * 0.32 * scale, 0.35 * scale, Math.sin(a) * 0.32 * scale);
      leaf.rotation.z = (i % 2 ? 0.38 : -0.34); leaf.rotation.y = -a; leaf.castShadow = true; group.add(leaf);
    }
  }
  function rock(x, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), M.stone);
    mesh.scale.set(sx, sy, sz); mesh.position.set(x, sy * 0.85, z); mesh.rotation.set(0.12, x * 0.17, -0.08);
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); occluders.push(mesh);
    colliders.push({ minX: x - sx, maxX: x + sx, minY: 0, maxY: sy * 1.8, minZ: z - sz, maxZ: z + sz });
  }
  const TREES = [[-37,-34],[37,-34],[-37,34],[37,34],[-31,-27],[31,-27],[-31,27],[31,27],[-38,-9],[38,10],[-25,37],[25,-37],[-36,19],[36,-18],[-39,-23],[39,24],[-14,39],[14,-39],[-40,2],[40,-3],[-27,-39],[28,39]];
  TREES.forEach(([x,z], i) => tree(x, z, 0.85 + (i % 4) * 0.08));
  const SHRUBS = [
    [-34,-13],[-33,12],[34,-12],[33,13],[-25,-22],[25,22],[-23,25],[23,-25],
    [-17,4],[18,-4],[-9,21],[10,-21],[-5,-5],[5,6],[-30,31],[30,-31],
    [-35,-29],[-29,-34],[-35,-19],[-29,-12],[-36,6],[-29,16],[-35,26],[-27,35],
    [-18,-34],[-12,-25],[-20,-10],[-11,-2],[-19,11],[-11,24],[-18,33],[-7,30],
    [18,-34],[12,-25],[20,-10],[11,-2],[19,11],[11,24],[18,33],[7,30],
    [35,-29],[29,-34],[35,-19],[29,-12],[36,6],[29,16],[35,26],[27,35],
  ];
  SHRUBS.forEach(([x,z], i) => undergrowth(x, z, 0.68 + (i % 4) * 0.12));
  [[-22,-8,1.4,1.1,1.0],[23,9,1.2,0.9,1.4],[-10,5,1.0,0.75,1.2],[11,-5,1.2,0.85,1.0],[-34,24,1.5,1.2,1.2],[34,-25,1.4,1.0,1.5]].forEach((v) => rock(...v));
  [
    [-35,-31],[-30,-24],[-24,-35],[-36,-22],[-35,31],[-30,24],[-24,35],[-36,21],
    [35,-31],[30,-24],[24,-35],[36,-21],[35,31],[30,24],[24,35],[36,22],
    [-34,-14],[-34,14],[34,-14],[34,14],
    [-17,-9],[-9,-18],[-17,9],[-9,18],[17,-9],[9,-18],[17,9],[9,18],
    [-7,-35],[7,-35],[-7,35],[7,35],
    [-30,-6],[-15,-26],[-5,-22],[-14,26],[14,-26],[15,26],[5,22],
  ].forEach(([x,z], i) => rock(x, z, 0.58 + (i % 3) * 0.12, 0.42 + (i % 2) * 0.14, 0.62 + (i % 4) * 0.08));

  function tower(id, x, z, direction) {
    const topY = TOWER_TOP;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(0.42, topY, 0.42, M.darkWood, x + sx * 3.2, 0, z + sz * 3.2, { name: `${id}-poste` });
    const deck = addBox(7.5, 0.35, 7.5, M.towerWood, x, topY - 0.18, z, { collide: false, name: `${id}-piso` });
    deck.userData.vietnamTower = id;
    const outerX = x + direction * 3.55;
    addBox(0.25, 2.2, 7.2, M.towerBamboo, outerX, topY, z, { name: `${id}-parede` });
    addBox(5.2, 1.15, 0.22, M.towerBamboo, x + direction * 0.8, topY + 1.05, z - 3.48, { name: `${id}-parapeito` });
    addBox(5.2, 1.15, 0.22, M.towerBamboo, x + direction * 0.8, topY + 1.05, z + 3.48, { name: `${id}-parapeito` });
    const roof = addBox(8.3, 0.22, 8.3, M.metal, x, topY + 3.25, z, { collide: false, name: `${id}-telhado` });
    roof.rotation.z = direction * 0.05;
    const roofBottom = topY + 3.25;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      addBox(0.34, roofBottom - topY, 0.34, M.towerWood, x + sx * 3.2, topY, z + sz * 3.2,
        { name: `${id}-coluna-telhado` });
    }
    for (const sz of [-1, 1]) {
      addBox(6.75, 0.3, 0.3, M.towerWood, x, roofBottom - 0.3, z + sz * 3.2,
        { name: `${id}-viga-lateral` });
      const braceLength = Math.hypot(5.6, 2.7);
      addBox(braceLength, 0.18, 0.16, M.darkWood, x, topY + 1.35, z + sz * 3.22,
        { collide: false, occlude: false, rz: sz * Math.atan2(2.7, 5.6), name: `${id}-contraventamento` });
    }
    for (const sx of [-1, 1]) {
      addBox(0.3, 0.3, 6.75, M.towerWood, x + sx * 3.2, roofBottom - 0.3, z,
        { name: `${id}-viga-lateral` });
      const braceLength = Math.hypot(5.6, 2.7);
      addBox(0.16, 0.18, braceLength, M.darkWood, x + sx * 3.22, topY + 1.35, z,
        { collide: false, occlude: false, rx: sx * Math.atan2(2.7, 5.6), name: `${id}-contraventamento` });
    }

    const startX = x - direction * 11;
    const endX = x - direction * 4.0;
    const run = Math.abs(endX - startX);
    const length = Math.hypot(run, topY);
    const slope = Math.atan2(topY, run);
    const ramp = addBox(length, 0.24, 3.6, M.towerWood, (startX + endX) / 2, topY / 2 - 0.12, z,
      { collide: false, name: `${id}-rampa`, rz: direction * slope });
    ramp.userData.vietnamRamp = { towerId: id, start: { x: startX, z }, end: { x: endX, z }, topY };
    for (const dz of [-1.72, 1.72]) {
      const rail = addBox(length, 0.16, 0.14, M.darkWood, (startX + endX) / 2, topY / 2 + 0.42, z + dz,
        { collide: false, occlude: false, rz: direction * slope });
      rail.castShadow = false;
    }
  }
  tower('guarita-oeste', -30, 0, -1);
  tower('guarita-leste', 30, 0, 1);

  function smokePlume(x, z, scale = 1) {
    for (let i = 0; i < 7; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry((1.2 + i * 0.28) * scale, 12, 8), M.smoke);
      puff.position.set(x + Math.sin(i * 1.7) * 0.8, 2.1 + i * 1.35, z + Math.cos(i * 1.3) * 0.55);
      puff.scale.set(1.35, 0.8, 1); puff.rotation.y = i * 0.74; scene.add(puff);
    }
  }
  smokePlume(-37, -17, 0.9);
  smokePlume(36, 23, 0.72);

  function barrel(x, z, color) {
    const mat = new THREE.MeshLambertMaterial({ color });
    const b = addCylinder(0.48, 0.48, 1.15, 16, mat, x, 0, z, true); b.name = 'tambor-metal';
    for (const y of [0.18, 0.92]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.035, 6, 16), M.steel); ring.rotation.x = Math.PI / 2; ring.position.set(x, y, z); root.add(ring); }
  }
  [[-18,-27,0x3d6042],[18,27,0x766029],[-18,25,0x5d4932],[18,-25,0x3f5650],[-5,-12,0x66552c],[6,12,0x3d6042]].forEach((v) => barrel(...v));

  function insideRamp(r, x, z) {
    const dx = r.end.x - r.start.x, dz = r.end.z - r.start.z;
    const len2 = dx * dx + dz * dz;
    const t = ((x - r.start.x) * dx + (z - r.start.z) * dz) / len2;
    const px = r.start.x + Math.max(0, Math.min(1, t)) * dx;
    const pz = r.start.z + Math.max(0, Math.min(1, t)) * dz;
    return { t, distance: Math.hypot(x - px, z - pz) };
  }
  const rampDefs = [
    { towerId: 'guarita-oeste', start: { x: -19, z: 0 }, end: { x: -26, z: 0 }, topY: TOWER_TOP, platform: { x: -30, z: 0 } },
    { towerId: 'guarita-leste', start: { x: 19, z: 0 }, end: { x: 26, z: 0 }, topY: TOWER_TOP, platform: { x: 30, z: 0 } },
  ];
  function groundHeightAt(x, z) {
    for (const r of rampDefs) {
      const p = insideRamp(r, x, z);
      if (p.t >= 0 && p.t <= 1 && p.distance <= 1.72) return r.topY * p.t;
      if (Math.abs(x - r.platform.x) <= 3.7 && Math.abs(z - r.platform.z) <= 3.7) return r.topY;
    }
    return 0;
  }
  const slowAt = (x, z) => Math.abs(x) < 3.25 && Math.abs(z) < 31;

  const gunMat = { dark: M.black, wood: M.darkWood, steel: M.steel };
  function gun(kind, x, z, yaw = 0) {
    const g = new THREE.Group();
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, kind === 'deagle' ? 0.45 : 0.92), gunMat.dark);
    receiver.position.y = 0.13; g.add(receiver);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.32), kind === 'ak' || kind === 'shotgun' ? gunMat.wood : gunMat.dark);
    stock.position.set(0, 0.11, 0.5); g.add(stock);
    const barrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, kind === 'awp' ? 0.7 : 0.45, 8), gunMat.steel);
    barrelMesh.rotation.x = Math.PI / 2; barrelMesh.position.set(0, 0.14, -0.62); g.add(barrelMesh);
    g.position.set(x, groundHeightAt(x, z) + 0.04, z); g.rotation.y = yaw; g.name = `pickup-${kind}`;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); root.add(g);
    pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: g });
  }
  const arsenal = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol', 'g3', 'uzi'];
  arsenal.forEach((kind, i) => gun(kind, -16 + i * 4, -34, 0));
  arsenal.forEach((kind, i) => gun(kind, 16 - i * 4, 34, Math.PI));
  gun('ak', -16.5, 0, Math.PI / 2); gun('m4', 16.5, 0, -Math.PI / 2);

  const bounds = { minX: -HALF + 1.5, maxX: HALF - 1.5, minZ: -HALF + 1.5, maxZ: HALF - 1.5 };
  const nodes = [], adj = [];
  const STEP = 3;
  const blocked = (x, z, inflate = 0.48) => colliders.some((c) => x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.6 && c.maxY > 0.15);
  for (let x = -39; x <= 39; x += STEP) for (let z = -39; z <= 39; z += STEP) if (!blocked(x, z)) nodes.push({ x, z });
  const clear = (a, b) => {
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, 0.28)) return false;
    }
    return Math.abs(groundHeightAt(a.x, a.z) - groundHeightAt(b.x, b.z)) <= 1.45;
  };
  for (let i = 0; i < nodes.length; i++) adj[i] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz <= STEP * STEP * 2.05 && clear(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); }
    }
  }
  function nearestWaypoint(x, z) {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [fromIdx];
    const prev = new Int32Array(nodes.length).fill(-1), queue = [fromIdx]; prev[fromIdx] = fromIdx;
    for (let h = 0; h < queue.length; h++) {
      const n = queue[h];
      for (const next of adj[n]) if (prev[next] < 0) {
        prev[next] = n;
        if (next === toIdx) {
          const path = [next]; let cur = n;
          while (cur !== fromIdx) { path.unshift(cur); cur = prev[cur]; }
          path.unshift(fromIdx); return path;
        }
        queue.push(next);
      }
    }
    return [fromIdx];
  }

  scene.background = new THREE.Color(0x1c252d);
  scene.fog = new THREE.Fog(0x374047, 44, 96);
  const hemi = new THREE.HemisphereLight(0xabb7bb, 0x2d3328, 1.16); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xebdabe, 1.18); sun.position.set(-26, 48, -20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50; sun.shadow.camera.far = 150; sun.shadow.bias = -0.0004; scene.add(sun);

  const spawns = {
    E: [-12, -4, 4, 12].map((x) => ({ x, z: -36.5, yaw: 0 })),
    B: [12, 4, -4, -12].map((x) => ({ x, z: 36.5, yaw: Math.PI })),
  };
  return {
    root, colliders, occluders, decalSolids: [root], spawns, bounds, pickups, sun, hemi,
    groundHeightAt, slowAt,
    ctfPoints: [
      { id: 'E', label: 'TRILHA SUL', x: -14, z: -29 },
      { id: 'MID', label: 'VILAREJO', x: 8, z: 0 },
      { id: 'B', label: 'TRILHA NORTE', x: 14, z: 29 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
  };
}
