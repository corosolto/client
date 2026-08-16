// Velho Oeste da Treta: cidade de madeira ao pôr do sol, com três rotas e cobertura baixa.
import * as THREE from 'three';

const HALF_X = 34;
const HALF_Z = 46;

export function buildVelhoOeste(scene) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  root.name = 'velho-oeste-da-treta';
  scene.add(root);

  const geometryCache = new Map();
  const boxGeo = (w, h, d) => {
    const key = `box:${w}:${h}:${d}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
    return geometryCache.get(key);
  };
  const cylGeo = (r, h, n = 12) => {
    const key = `cyl:${r}:${h}:${n}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.CylinderGeometry(r, r, h, n));
    return geometryCache.get(key);
  };

  function texture(kind, base, detail, repeat = 4) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
    let seed = Array.from(kind).reduce((n, c) => (n * 33 + c.charCodeAt(0)) >>> 0, 1776);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    if (kind.startsWith('wood')) {
      ctx.strokeStyle = detail; ctx.lineWidth = 2;
      for (let y = 8; y < 128; y += kind === 'wood-pale' ? 16 : 13) {
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= 128; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.12 + y) * 1.7);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(45,20,7,.45)';
      for (let i = 0; i < 24; i++) { ctx.beginPath(); ctx.ellipse(rand() * 128, rand() * 128, 1 + rand() * 3, 1, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = 'rgba(242,190,112,.13)'; ctx.lineWidth = 1;
      for (let i = 0; i < 46; i++) { const y = rand() * 128; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(35, y - 3, 88, y + 4, 128, y); ctx.stroke(); }
    } else if (kind === 'sand') {
      for (let i = 0; i < 780; i++) {
        const v = 90 + Math.floor(rand() * 75); ctx.fillStyle = `rgba(${v},${Math.floor(v * .74)},${Math.floor(v * .42)},${.08 + rand() * .2})`;
        ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 2, 1 + rand() * 2);
      }
      ctx.strokeStyle = detail; ctx.globalAlpha = .2;
      for (let i = 0; i < 18; i++) { const y = rand() * 128; ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(35, y + 8, 80, y - 8, 128, y + 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else if (kind === 'roof') {
      for (let y = -8; y < 136; y += 18) for (let x = -12; x < 140; x += 24) {
        const ox = ((y / 18) & 1) * 12; ctx.fillStyle = (x + y) % 3 ? base : '#55301f';
        ctx.fillRect(x + ox, y, 23, 17); ctx.strokeStyle = detail; ctx.lineWidth = 2; ctx.strokeRect(x + ox, y, 23, 17);
        ctx.fillStyle = 'rgba(255,190,110,.12)'; ctx.fillRect(x + ox + 2, y + 2, 19, 2);
      }
    } else if (kind === 'cactus') {
      ctx.strokeStyle = detail; ctx.lineWidth = 4;
      for (let x = 4; x < 132; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 2, 128); ctx.stroke(); }
      ctx.fillStyle = '#d9d2a5';
      for (let i = 0; i < 90; i++) { const x = rand() * 128, y = rand() * 128; ctx.fillRect(x, y, 1.5, 1.5); ctx.strokeStyle = 'rgba(237,224,178,.55)'; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - .5) * 7, y - 3 - rand() * 4); ctx.stroke(); }
    } else if (kind === 'hay') {
      ctx.strokeStyle = detail; ctx.lineWidth = 1;
      for (let i = 0; i < 420; i++) { const x = rand() * 128, y = rand() * 128, len = 6 + rand() * 22; ctx.globalAlpha = .25 + rand() * .6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (rand() - .5) * 6); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.strokeStyle = '#74501c'; ctx.lineWidth = 3;
      for (const y of [31, 96]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
    } else if (kind === 'metal') {
      ctx.strokeStyle = detail; ctx.lineWidth = 1;
      for (let y = 0; y <= 128; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y + 2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(220,205,175,.22)';
      for (let i = 0; i < 160; i++) ctx.fillRect(rand() * 128, rand() * 128, .7 + rand() * 2, .7 + rand() * 2);
    } else {
      ctx.strokeStyle = detail; ctx.globalAlpha = .32;
      for (let i = 0; i < 180; i++) { ctx.beginPath(); ctx.moveTo(rand() * 128, rand() * 128); ctx.lineTo(rand() * 128, rand() * 128); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; t.name = `oeste-${kind}`;
    return t;
  }

  const TX = {
    sand: texture('sand', '#b98243', '#704420', 10), wood: texture('wood', '#8a4f28', '#4c2714', 4),
    paleWood: texture('wood-pale', '#b77943', '#69401f', 4), roof: texture('roof', '#71442c', '#3d2419', 5),
    cactus: texture('cactus', '#4b8950', '#25592e', 3), hay: texture('hay', '#c4963e', '#805a20', 5),
    metal: texture('metal', '#77716a', '#302b27', 3),
  };
  function realTexture(file, name, repeatX, repeatY = repeatX) {
    const loaded = new THREE.TextureLoader().load(`/img/textures/velho_oeste/${file}`);
    loaded.colorSpace = THREE.SRGBColorSpace; loaded.wrapS = loaded.wrapT = THREE.RepeatWrapping;
    loaded.repeat.set(repeatX, repeatY); loaded.anisotropy = 8; loaded.name = name; return loaded;
  }
  if (typeof window !== 'undefined') {
    TX.wood = realTexture('wood-real-v1.webp', 'oeste-wood-real', 3, 5);
    TX.paleWood = realTexture('wood-real-v1.webp', 'oeste-wood-pale-real', 3, 5);
    TX.sand = realTexture('dirt-real-v1.webp', 'oeste-sand-real', 12, 14);
    TX.roof = realTexture('roof-real-v1.webp', 'oeste-roof-real', 4, 7);
    TX.cactus = realTexture('cactus-real-v1.webp', 'oeste-cactus-real', 2, 4);
    TX.hay = realTexture('hay-real-v1.webp', 'oeste-hay-real', 3, 3);
    TX.metal = realTexture('metal-real-v1.webp', 'oeste-metal-real', 3, 4);
  }
  const mat = (color, map = TX.wood, roughness = .9, metalness = 0, bumpScale = .045) => new THREE.MeshStandardMaterial({ color, map, bumpMap: map, bumpScale, roughness, metalness });
  const MAT = {
    sand: mat(0xffffff, TX.sand, 1, 0, .12), wood: mat(0xffffff), pale: mat(0xd9b17a, TX.paleWood), dark: mat(0x3b2115),
    roof: mat(0xffffff, TX.roof, .94, 0, .1), trim: mat(0xd8ad6b, TX.paleWood), metal: mat(0x8c8174, TX.metal, .55, .35, .035),
    black: mat(0x191411, TX.metal, .6, .25), cactus: mat(0xffffff, TX.cactus, 1, 0, .075), cactusLight: mat(0xaed09a, TX.cactus, 1, 0, .075),
    hay: mat(0xffffff, TX.hay, 1, 0, .09), red: mat(0x7e271f, TX.wood), blue: mat(0x2d5361, TX.wood), glass: mat(0x87b2ba, TX.metal, .25, .05, .01),
    windowVoid: new THREE.MeshBasicMaterial({ color: 0x1b110b }),
  };

  function addBox(w, h, d, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), material); mesh.position.set(x, y + h / 2, z);
    if (opts.ry) mesh.rotation.y = opts.ry;
    mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true; root.add(mesh);
    if (opts.name) mesh.name = opts.name;
    if (opts.collide !== false) {
      const hx = Math.abs(Math.cos(opts.ry || 0)) * w / 2 + Math.abs(Math.sin(opts.ry || 0)) * d / 2;
      const hz = Math.abs(Math.sin(opts.ry || 0)) * w / 2 + Math.abs(Math.cos(opts.ry || 0)) * d / 2;
      colliders.push({ minX: x - hx, maxX: x + hx, minY: y, maxY: y + h, minZ: z - hz, maxZ: z + hz, tag: opts.tag });
      occluders.push(mesh);
    }
    return mesh;
  }
  function addCylinder(r, h, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(cylGeo(r, h, opts.segments || 12), material); mesh.position.set(x, y + h / 2, z);
    if (opts.rx) mesh.rotation.x = opts.rx; if (opts.rz) mesh.rotation.z = opts.rz;
    mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
    if (opts.collide) { colliders.push({ minX: x - r, maxX: x + r, minY: y, maxY: y + h, minZ: z - r, maxZ: z + r }); occluders.push(mesh); }
    return mesh;
  }
  function signTexture(title, sub = '') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 180; const x = c.getContext('2d');
    x.fillStyle = '#3a1c10'; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = '#d6a35e'; x.lineWidth = 12; x.strokeRect(8, 8, 496, 164);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f0c87d';
    x.font = 'bold 58px Georgia,serif'; x.fillText(title, 256, sub ? 70 : 90);
    if (sub) { x.font = 'bold 25px Georgia,serif'; x.fillText(sub, 256, 132); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function addSign(title, sub, x, y, z, ry = 0, w = 6, h = 2.1) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: signTexture(title, sub), roughness: .85 }));
    mesh.position.set(x, y, z); mesh.rotation.y = ry; root.add(mesh); return mesh;
  }
  function wantedTexture(outlaw, reward, seed, portraitIndex, gender) {
    const c = document.createElement('canvas'); c.width = 384; c.height = 512; const x = c.getContext('2d');
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let texture;
    const draw = atlas => {
      const paper = x.createLinearGradient(0, 0, 384, 512); paper.addColorStop(0, '#e3c27f'); paper.addColorStop(.55, '#cda562'); paper.addColorStop(1, '#b8894e');
      x.fillStyle = paper; x.fillRect(0, 0, 384, 512);
      for (let i = 0; i < 950; i++) { const shade = rand() > .5 ? 58 : 238; x.fillStyle = `rgba(${shade},${Math.floor(shade * .72)},${Math.floor(shade * .4)},${.025 + rand() * .07})`; x.fillRect(rand() * 384, rand() * 512, 1 + rand() * 4, 1 + rand() * 3); }
      x.strokeStyle = '#4b2b16'; x.lineWidth = 11; x.strokeRect(13, 13, 358, 486); x.lineWidth = 3; x.strokeRect(25, 25, 334, 462);
      const heading = gender === 'feminino' ? 'PROCURADA' : 'PROCURADO';
      x.textAlign = 'center'; x.fillStyle = '#3b2113'; x.font = '900 52px Georgia,serif'; x.fillText(heading, 192, 75);
      x.font = 'bold 20px Georgia,serif'; x.fillText('VIVO OU DESARMADO', 192, 106);
      x.fillStyle = '#4b2b16'; x.fillRect(66, 122, 252, 222);
      if (atlas) {
        const cellW = atlas.width / 4, cellH = atlas.height / 2, col = portraitIndex % 4, row = Math.floor(portraitIndex / 4);
        x.drawImage(atlas, col * cellW + 3, row * cellH + 3, cellW - 6, cellH - 6, 72, 128, 240, 210);
      } else { x.fillStyle = '#b58b51'; x.fillRect(72, 128, 240, 210); }
      x.fillStyle = '#3b2113'; x.font = '900 29px Georgia,serif'; x.fillText(outlaw.toUpperCase(), 192, 382);
      const danger = gender === 'feminino' ? 'PERIGOSA' : 'PERIGOSO';
      x.font = 'bold 19px Georgia,serif'; x.fillText(`${danger} · BOM DE MIRA`, 192, 414);
      x.font = '900 27px Georgia,serif'; x.fillText(`RECOMPENSA $${reward}`, 192, 462);
      if (texture) texture.needsUpdate = true;
    };
    draw(null);
    texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; texture.name = `oeste-procurado-${outlaw}`;
    if (typeof Image !== 'undefined') { const atlas = new Image(); atlas.onload = () => draw(atlas); atlas.src = '/img/textures/velho_oeste/procurados-atlas-v1.jpg'; }
    return texture;
  }
  function addWanted(index, outlaw, reward, gender, side, x, y, z) {
    addBox(.18, 2.35, 2.05, MAT.dark, x, .15, z, { collide: false });
    for (const dz of [-.87, .87]) addBox(.16, 2.7, .16, MAT.pale, x + side * .05, 0, z + dz, { collide: false });
    const material = new THREE.MeshBasicMaterial({ map: wantedTexture(outlaw, reward, 1776 + index * 97, index, gender), polygonOffset: true, polygonOffsetFactor: -2 });
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.8), material);
    poster.name = `procurado-${index}`; poster.userData = {
      outlaw, gender, heading: gender === 'feminino' ? 'PROCURADA' : 'PROCURADO', danger: gender === 'feminino' ? 'PERIGOSA' : 'PERIGOSO', reward,
      portraitIndex: index, portraitAsset: 'procurados-atlas-v1.jpg',
    }; poster.position.set(x - side * .1, y, z);
    poster.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; poster.receiveShadow = true; root.add(poster);
  }
  let westernWindowIndex = 0;
  function westernWindow(x, y, z, ry, w, h) {
    const index = westernWindowIndex++, state = index % 2 ? 'aberta' : 'fechada';
    const group = new THREE.Group(); group.name = `janela-oeste-${index}`; group.userData = { state, material: 'madeira' }; group.position.set(x, y + h / 2, z); group.rotation.y = ry; root.add(group);
    const piece = (pw, ph, pd, material, px, py, pz) => {
      const mesh = new THREE.Mesh(boxGeo(pw, ph, pd), material); mesh.position.set(px, py, pz); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    };
    if (state === 'aberta') {
      piece(w, h, .08, MAT.windowVoid, 0, 0, -.03);
      for (const px of [-w * .78, w * .78]) piece(w * .46, h + .08, .16, MAT.pale, px, 0, .01);
    } else {
      for (const px of [-w * .25, w * .25]) piece(w * .48, h, .16, px < 0 ? MAT.pale : MAT.wood, px, 0, .01);
      piece(w * .92, .1, .2, MAT.dark, 0, h * .24, .11); piece(w * .92, .1, .2, MAT.dark, 0, -h * .24, .11);
    }
    return group;
  }

  scene.background = new THREE.Color(0xd88b55);
  scene.fog = new THREE.Fog(0xc7804e, 68, 150);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 180), MAT.sand); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  for (let z = -HALF_Z; z <= HALF_Z; z += 8) addBox(8, .025, .11, MAT.pale, 0, .02, z, { collide: false, cast: false });

  function building(side, z, w, d, h, title, color = MAT.wood, doors = 1) {
    const x = side * (HALF_X - d / 2 - 1); const faceX = x - side * (d / 2 + .03); const ry = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const g = new THREE.Group(); g.name = `predio-${title.toLowerCase().replace(/\s/g, '-')}`; root.add(g);
    addBox(d, h, w, color, x, 0, z);
    addBox(d + 1.4, .45, w + 1.2, MAT.roof, x, h, z, { collide: false });
    addBox(2.5, h + 1.5, .28, MAT.trim, faceX, 0, z, { collide: false, ry });
    addBox(1.5, 2.55, .32, MAT.dark, faceX - side * .04, 0, z, { collide: false, ry });
    if (doors > 1) addBox(1.5, 2.55, .32, MAT.dark, faceX - side * .04, 0, z + 2.4, { collide: false, ry });
    for (const wz of [-w * .3, w * .3]) westernWindow(faceX - side * .05, 2.2, z + wz, ry, 1.35, 1.25);
    for (let pz = z - w / 2; pz <= z + w / 2; pz += 2.3) addCylinder(.12, 1.4, MAT.dark, faceX - side * 2.3, 0, pz, { collide: false });
    addBox(.22, .22, w + .8, MAT.pale, faceX - side * 2.2, 1.4, z, { tag: `varanda-${title.toLowerCase()}` });
    addSign(title, title === 'SALOON' ? 'BEBIDA · BARALHO · TRETA' : '', faceX - side * .2, h - .55, z, ry, Math.min(7, w - 1), 1.8);
    return g;
  }
  building(-1, -29, 12, 8, 6.6, 'SALOON', MAT.red, 2);
  building(-1, -11, 11, 7, 5.8, 'BANCO', MAT.pale);
  building(-1, 8, 12, 8, 6.2, 'ARMAZÉM', MAT.wood);
  building(-1, 29, 12, 7, 5.5, 'HOTEL', MAT.blue, 2);
  building(1, -28, 12, 8, 5.8, 'XERIFE', MAT.pale);
  building(1, -9, 12, 7, 5.6, 'BARBEIRO', MAT.blue);
  building(1, 11, 12, 8, 6.2, 'EMPÓRIO', MAT.wood, 2);
  building(1, 31, 10, 7, 5.5, 'ESTÁBULO', MAT.red, 2);

  function streetHouse(side, z, title, color) {
    const x = side * 15, faceX = x - side * 2.78, ry = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const group = new THREE.Group(); group.name = `predio-${title.toLowerCase().replace(/\s/g, '-')}`; root.add(group);
    addBox(5.5, 4.7, 7.2, color, x, 0, z);
    addBox(6.2, .38, 8, MAT.roof, x, 4.7, z, { collide: false });
    addBox(1.35, 2.35, .28, MAT.dark, faceX, 0, z, { collide: false, ry });
    for (const dz of [-2.2, 2.2]) westernWindow(faceX - side * .03, 2, z + dz, ry, 1.15, 1.05);
    addBox(.22, .22, 7.6, MAT.pale, faceX - side * 1.05, 1.25, z, { tag: `varanda-${title.toLowerCase()}` });
    addBox(2.3, .22, 8, MAT.roof, faceX - side * 1.05, 3.05, z, { collide: false });
    for (const dz of [-3.35, 3.35]) addBox(.18, 3.05, .18, MAT.dark, faceX - side * 1.9, 0, z + dz, { collide: false });
    addSign(title, 'CASA DE MADEIRA', faceX - side * .14, 3.8, z, ry, 4.8, 1.25);
  }
  streetHouse(-1, -20, 'OFICINA', MAT.pale);
  streetHouse(1, -20, 'CASA DO FERREIRO', MAT.wood);
  streetHouse(-1, 20, 'PENSÃO', MAT.blue);
  streetHouse(1, 20, 'CASA DO PISTOLEIRO', MAT.red);

  const wanted = [
    ['Zé Faísca', 500, 'masculino', -1, -18.5, 1.55, -34], ['Lola Fumaça', 900, 'feminino', 1, 18.5, 1.55, -34],
    ['Neco Cascavel', 750, 'masculino', -1, -18.5, 1.55, -8], ['Cida Cartucho', 1200, 'feminino', 1, 18.5, 1.55, -8],
    ['Beto Poeira', 400, 'masculino', -1, -18.5, 1.55, 8], ['Joana Brasa', 1100, 'feminino', 1, 18.5, 1.55, 8],
    ['Tonho Espora', 800, 'masculino', -1, -18.5, 1.55, 34], ['Rita Bala', 1500, 'feminino', 1, 18.5, 1.55, 34],
  ];
  wanted.forEach((poster, index) => addWanted(index, ...poster));

  // Cercas delimitam a arena, mas deixam duas entradas por ponta e flancos amplos.
  for (const sx of [-1, 1]) for (let z = -HALF_Z; z <= HALF_Z; z += 4) {
    addBox(.16, 1.5, .16, MAT.dark, sx * (HALF_X - .7), 0, z, { collide: false });
    if (z < HALF_Z - 2) for (const y of [.45, 1.15]) addBox(.16, .14, 4, MAT.pale, sx * (HALF_X - .7), y, z + 2, { collide: false });
  }
  for (const z of [-HALF_Z, HALF_Z]) {
    addBox(22, 1.5, .22, MAT.pale, -22, 0, z); addBox(22, 1.5, .22, MAT.pale, 22, 0, z);
    addSign('VELHO OESTE', 'DA TRETA', 0, 6.4, z, z > 0 ? Math.PI : 0, 10, 3);
    for (const x of [-6, 6]) addBox(.35, 7.6, .35, MAT.dark, x, 0, z);
    addBox(12.4, .35, .35, MAT.dark, 0, 7.3, z, { collide: false });
  }

  function cactus(x, z, scale = 1, light = false) {
    const material = light ? MAT.cactusLight : MAT.cactus;
    addCylinder(.38 * scale, 3.8 * scale, material, x, 0, z, { collide: true, segments: 10 });
    for (const dir of [-1, 1]) {
      addCylinder(.22 * scale, 1.5 * scale, material, x + dir * .65 * scale, 1.35 * scale, z, { segments: 9 });
      const arm = addCylinder(.2 * scale, .85 * scale, material, x + dir * .35 * scale, 1.25 * scale, z, { segments: 9 }); arm.rotation.z = Math.PI / 2;
    }
  }
  [[-21,-39,1], [22,-38,.8], [-22,-20,.7], [23,1,1], [-21,18,.9], [22,41,1.1], [17,24,.65], [-18,40,.7]].forEach((p, i) => cactus(...p, i % 2));

  function wagon(x, z, ry = 0) {
    const g = new THREE.Group(); g.name = 'carroca'; g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    const box = (w, h, d, material, px, py, pz) => { const m = new THREE.Mesh(boxGeo(w, h, d), material); m.position.set(px, py, pz); m.castShadow = true; g.add(m); };
    box(3.8, .65, 2.2, MAT.pale, 0, 1.25, 0); box(.18, .25, 5, MAT.dark, 0, .8, -2.3);
    for (const wx of [-1.7, 1.7]) for (const wz of [-.9, .9]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(.72, .09, 6, 16), MAT.dark); wheel.position.set(wx, .75, wz); wheel.rotation.y = Math.PI / 2; g.add(wheel);
      for (let i = 0; i < 8; i++) { const spoke = new THREE.Mesh(boxGeo(.05, 1.2, .05), MAT.dark); spoke.position.set(wx, .75, wz); spoke.rotation.x = i * Math.PI / 4; g.add(spoke); }
    }
    const hx = Math.abs(Math.cos(ry)) * 2.3 + Math.abs(Math.sin(ry)) * 3.2, hz = Math.abs(Math.sin(ry)) * 2.3 + Math.abs(Math.cos(ry)) * 3.2;
    colliders.push({ minX: x - hx, maxX: x + hx, minY: 0, maxY: 2, minZ: z - hz, maxZ: z + hz }); occluders.push(g); return g;
  }
  wagon(-6, -20, .18); wagon(7, 2, -2.7); wagon(-5, 25, 2.9);

  function obstacle(name, x, z, ry, hx, hz, height, build) {
    const group = new THREE.Group(); group.name = `obstaculo-${name}`; group.position.set(x, 0, z); group.rotation.y = ry; root.add(group);
    const part = (w, h, d, material, px, py, pz, opts = {}) => {
      const mesh = new THREE.Mesh(boxGeo(w, h, d), material); mesh.position.set(px, py + h / 2, pz);
      if (opts.rx) mesh.rotation.x = opts.rx; if (opts.ry) mesh.rotation.y = opts.ry; if (opts.rz) mesh.rotation.z = opts.rz;
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    const cylinder = (r, h, material, px, py, pz, opts = {}) => {
      const mesh = new THREE.Mesh(cylGeo(r, h, opts.segments || 10), material); mesh.position.set(px, py + h / 2, pz);
      if (opts.rx) mesh.rotation.x = opts.rx; if (opts.rz) mesh.rotation.z = opts.rz;
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    build(part, cylinder, group);
    const worldHX = Math.abs(Math.cos(ry)) * hx + Math.abs(Math.sin(ry)) * hz;
    const worldHZ = Math.abs(Math.sin(ry)) * hx + Math.abs(Math.cos(ry)) * hz;
    colliders.push({ minX: x - worldHX, maxX: x + worldHX, minY: 0, maxY: height, minZ: z - worldHZ, maxZ: z + worldHZ });
    occluders.push(group); return group;
  }

  // Coberturas do miolo: quatro silhuetas distintas, espaçadas para manter três corredores.
  obstacle('bebedouro', -8, 1, .08, 2.25, .85, 1.05, (part) => {
    part(4.5, .28, 1.7, MAT.dark, 0, 0, 0); part(4.15, .55, .16, MAT.pale, 0, .28, -.75); part(4.15, .55, .16, MAT.pale, 0, .28, .75);
    for (const px of [-2.05, 2.05]) part(.16, .55, 1.35, MAT.pale, px, .28, 0);
    part(3.8, .04, 1.15, MAT.glass, 0, .31, 0); for (const px of [-1.65, 1.65]) part(.18, .5, .18, MAT.dark, px, 0, 0);
  });
  obstacle('caixas-dinamite', -3, 9, -.12, 1.45, 1.1, 1.75, (part, cylinder) => {
    part(1.8, 1.05, 1.55, MAT.pale, -.45, 0, 0); part(1.35, .85, 1.35, MAT.wood, .65, 1.02, .05);
    for (const pz of [-.42, 0, .42]) cylinder(.09, .9, MAT.red, .65, 1.43, pz, { rz: Math.PI / 2, segments: 8 });
    part(1.42, .08, .12, MAT.dark, .65, 1.84, 0);
  });
  obstacle('amarra-cavalos', 4, -8, .04, 2.7, .35, 1.45, (part) => {
    for (const px of [-2.35, 0, 2.35]) { part(.25, 1.45, .25, MAT.dark, px, 0, 0); part(.46, .12, .46, MAT.metal, px, 1.45, 0); }
    part(5.2, .22, .22, MAT.pale, 0, .88, 0); part(5.2, .12, .12, MAT.dark, 0, 1.08, 0);
  });
  obstacle('barricada', 10, -10, -.28, 2.15, .55, 1.65, (part) => {
    part(4.2, .32, .34, MAT.pale, 0, .55, 0, { rz: .23 }); part(4.2, .32, .34, MAT.wood, 0, 1.02, 0, { rz: -.18 });
    for (const px of [-1.75, 1.75]) part(.28, 1.65, .3, MAT.dark, px, 0, 0);
    for (const px of [-1.6, 1.6]) part(1.35, .22, .25, MAT.dark, px, .05, 0, { rz: px < 0 ? .55 : -.55 });
  });
  obstacle('caixotes-carga', -9, -8, .16, 1.65, 1.15, 1.8, (part) => {
    part(1.8, 1.1, 1.7, MAT.wood, -.65, 0, 0); part(1.55, 1.05, 1.5, MAT.pale, .75, 0, .15);
    part(1.25, .72, 1.25, MAT.dark, .15, 1.08, -.05);
  });
  obstacle('barris-empilhados', 8, 3, -.12, 1.55, 1.05, 1.9, (part, cylinder) => {
    for (const px of [-.72, .72]) cylinder(.62, 1.25, MAT.dark, px, 0, 0, { segments: 12 });
    cylinder(.62, 1.25, MAT.wood, 0, .65, 0, { segments: 12 });
    part(3.1, .1, .18, MAT.metal, 0, .42, 0);
  });
  obstacle('fardos-cobertura', -1, -3, .22, 2.05, 1.25, 1.75, (part, cylinder) => {
    for (const px of [-1.15, 0, 1.15]) cylinder(.57, 1.08, MAT.hay, px, 0, 0, { rz: Math.PI / 2, segments: 14 });
    for (const px of [-.58, .58]) cylinder(.57, 1.08, MAT.hay, px, .72, 0, { rz: Math.PI / 2, segments: 14 });
    part(4.1, .1, 2.4, MAT.dark, 0, .02, 0);
  });
  obstacle('cerca-quebrada', 8, 9, -.25, 2.45, .55, 1.65, (part) => {
    for (const px of [-2.1, 0, 2.1]) part(.25, 1.65, .28, MAT.dark, px, 0, 0, { rz: px === 0 ? .16 : 0 });
    part(4.7, .22, .24, MAT.pale, 0, .5, 0, { rz: -.12 }); part(4.25, .22, .24, MAT.wood, .15, 1.08, 0, { rz: .2 });
  });

  for (const [x, z] of [[13,-31],[-14,-4],[14,17],[-13,36]]) {
    for (let i = 0; i < 3; i++) addCylinder(.65, 1.15, MAT.hay, x + (i - 1) * 1.25, 0, z, { collide: true, segments: 14, rz: Math.PI / 2 });
  }
  for (const [x, z] of [[-12,-33],[12,-12],[-13,13],[12,34]]) {
    addCylinder(.62, 1, MAT.dark, x, 0, z, { collide: true, segments: 12 });
    addCylinder(.67, .1, MAT.metal, x, .98, z, { segments: 12 });
  }

  // Plantas rolantes: malhas abertas, sem colisão, atravessando a rua com rajadas diferentes.
  const tumbleweeds = [];
  function tumbleweed(index, z, radius) {
    const group = new THREE.Group(); group.name = `tumbleweed-${index}`; root.add(group);
    const twigMat = new THREE.MeshStandardMaterial({ color: 0x76502a, roughness: 1 });
    for (let i = 0; i < 9; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * (.62 + (i % 3) * .15), .035, 5, 14), twigMat);
      ring.rotation.set(i * .61, i * .93, i * .37); group.add(ring);
    }
    const collider = { minX: 0, maxX: 0, minY: 0, maxY: radius * 2 + .36, minZ: 0, maxZ: 0 };
    group.userData = { index, z, radius, speed: 3.2 + index * .65, phase: index * 19.7, collider };
    colliders.push(collider);
    tumbleweeds.push(group); return group;
  }
  tumbleweed(0, -12, .75); tumbleweed(1, 9, .58); tumbleweed(2, 32, .88);

  const GM = { dark: MAT.black, steel: MAT.metal, wood: MAT.pale };
  function gun(kind, x, z, yaw) {
    const g = new THREE.Group(); g.position.set(x, .08, z); g.rotation.y = yaw; root.add(g);
    const part = (w, h, d, material, px, py, pz) => { const m = new THREE.Mesh(boxGeo(w, h, d), material); m.position.set(px, py, pz); m.castShadow = true; g.add(m); };
    const long = ['awp','ak','m4','shotgun','mp5'].includes(kind); part(.11, .12, long ? .95 : .35, kind === 'shotgun' ? GM.wood : GM.dark, 0, .08, 0);
    part(.1, .2, .12, GM.wood, 0, -.02, long ? .22 : .12); if (long) part(.08, .08, .5, GM.steel, 0, .1, -.55);
    pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: g });
  }
  const arsenal = ['awp','ak','m4','shotgun','mp5','deagle','pistol'];
  arsenal.forEach((kind, i) => gun(kind, -12 + i * 4, -40, 0));
  arsenal.forEach((kind, i) => gun(kind, 12 - i * 4, 40, Math.PI));
  gun('deagle', -2, 0, Math.PI / 2); gun('shotgun', 2, 0, -Math.PI / 2);

  const hemi = new THREE.HemisphereLight(0xffd2a3, 0x5b3828, 1.45); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc27b, 2.05); sun.position.set(-35, 42, -28); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -48; sun.shadow.camera.right = 48; sun.shadow.camera.top = 58; sun.shadow.camera.bottom = -58; sun.shadow.camera.far = 160; sun.shadow.bias = -.00045; scene.add(sun);
  const fill = new THREE.DirectionalLight(0x86a5c9, .42); fill.position.set(24, 22, 35); scene.add(fill);

  const groundHeightAt = () => 0;
  const slowAt = () => false;
  const bounds = { minX: -HALF_X + .8, maxX: HALF_X - .8, minZ: -HALF_Z + .8, maxZ: HALF_Z - .8 };
  const blocked = (x, z, inflate = .45) => colliders.some(c => x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.7 && c.maxY > .1);
  const nodes = [], adj = [], step = 3.4;
  for (let x = bounds.minX + 1; x <= bounds.maxX - 1; x += step) for (let z = bounds.minZ + 1; z <= bounds.maxZ - 1; z += step) if (!blocked(x, z)) nodes.push({ x, z });
  for (let i = 0; i < nodes.length; i++) adj.push([]);
  const clear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6; if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, .25)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz <= step * step * 2.25 && clear(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); } }
  function nearestWaypoint(x, z) { let best = 0, distance = Infinity; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < distance) { distance = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1); const queue = [fromIdx]; prev[fromIdx] = fromIdx;
    while (queue.length) { const n = queue.shift(); for (const next of adj[n]) if (prev[next] < 0) { prev[next] = n; if (next === toIdx) { const path = [next]; let p = n; while (p !== fromIdx) { path.unshift(p); p = prev[p]; } path.unshift(fromIdx); return path; } queue.push(next); } }
    return [fromIdx];
  }
  function update(dt, elapsed) {
    for (const weed of tumbleweeds) {
      const { index, z, radius, speed, phase, collider } = weed.userData;
      weed.position.x = -29 + ((elapsed * speed + phase) % 58);
      weed.position.z = z + Math.sin(elapsed * .72 + index * 2.3) * 2.1;
      weed.position.y = radius + Math.abs(Math.sin(elapsed * 2.4 + index)) * .18;
      weed.rotation.z = -elapsed * speed / radius; weed.rotation.x = Math.sin(elapsed + index) * .28;
      const footprint = radius * .72;
      collider.minX = weed.position.x - footprint; collider.maxX = weed.position.x + footprint;
      collider.minZ = weed.position.z - footprint; collider.maxZ = weed.position.z + footprint;
    }
  }

  update(0, 0);

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, pickups, sun, hemi, update,
    spawns: {
      E: [-12, -4, 4, 12].map(x => ({ x, z: -41, yaw: 0 })),
      B: [12, 4, -4, -12].map(x => ({ x, z: 41, yaw: Math.PI })),
    },
    ctfPoints: [
      { id: 'E', label: 'SALOON', x: -12, z: -34 },
      { id: 'MID', label: 'RUA PRINCIPAL', x: 0, z: 0 },
      { id: 'B', label: 'ESTÁBULO', x: 12, z: 34 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath, bounds,
  };
}
