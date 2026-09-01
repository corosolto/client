// SÍTIO DA TRETA (sitio) — resgate do mapa do PR #4 (Atibaia): casa sede com
// varanda, lago com pedalinhos e patos NADANDO, horta com galinha-d'angola,
// pomar com cavalinho pastando, muro de pedra e porteira sul. Sátira fictícia.
import * as THREE from 'three';
import { PropBatch } from './mapprops.js';
import { applyLook } from './map_sky.js';
import { createFavelaAmbience, createSitioAmbience, SITIO_FAUNA_ASSETS, loadSitioFauna } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch { return false; } })();

export const SITIO_AMBIENCE = SITIO_FAUNA_ASSETS;   // base (rato/pombo/caramelo) + kit sitio_fauna_r3
export const SITIO_PROPS = ['caixa_dagua_fibra', 'bananeira', 'churrasqueira', 'mesa_guardasol', 'banco_jardim', 'palmeira_imperial'];

export const HALF_X = 34, HALF_Z = 42;

/* Lago central: lâmina a -0,08, fundo -0,28 — RASO DE PROPÓSITO: 0,28 é um
   degrau que o corpo sobe (0,30), então quem entra sai andando; lago fundo é
   armadilha (o "quando se cai trava" do córrego antes das rampas). */
const LAGO = { minX: -12, maxX: 12, minZ: -5, maxZ: 10, aguaY: -0.08, fundo: -0.28 };

const CASA = { x: -10, z: -26, w: 16, d: 9, h: 4.2 };
const VARANDA = { x0: CASA.x - 1, x1: CASA.x + 10.5, z0: CASA.z + 4.2, z1: CASA.z + 9.2, y: 0.9 };

export function buildSitio(scene, T = {}) {
  const colliders = [], occluders = [], pickups = [];
  const root = new THREE.Group();
  root.name = 'sitio-da-treta';
  scene.add(root);
  const PB = new PropBatch({ bucket: 20, shadowMin: 0.02 });

  const lam = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.94, metalness: 0, ...opts });
  const mkCanvas = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; };
  const noiseOver = (x, w, h, alpha, colors) => {
    for (let i = 0; i < w * h / 14; i++) {
      x.fillStyle = colors[(Math.random() * colors.length) | 0];
      x.globalAlpha = Math.random() * alpha;
      x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    x.globalAlpha = 1;
  };
  const texOf = (c, rx = 1, ry = 1) => {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return t;
  };

  /* texturas locais (harness stuba canvas 2D — build roda em node) */
  const waterTex = texOf(mkCanvas(256, 256, x => {
    x.fillStyle = '#2a6b7a'; x.fillRect(0, 0, 256, 256);
    noiseOver(x, 256, 256, 0.3, ['#35808f', '#1f5a68', '#4a98a5']);
  }), 6, 4);
  const woodTex = texOf(mkCanvas(128, 128, x => {
    x.fillStyle = '#7a5c38'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#6b4f2e' : '#87673f'; x.fillRect(i * 32, 0, 30, 128); }
    noiseOver(x, 128, 128, 0.2, ['#5c4426']);
  }), 2, 1);
  const roofTex = texOf(mkCanvas(128, 128, x => {
    x.fillStyle = '#a8503a'; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#8f4030';
    for (let r = 0; r < 128; r += 16) for (let c = (r / 16 % 2) * 8; c < 128; c += 16) x.fillRect(c, r, 14, 14);
  }), 4, 3);
  const wallTex = texOf(mkCanvas(256, 256, x => {
    x.fillStyle = '#e8ddc8'; x.fillRect(0, 0, 256, 256);
    noiseOver(x, 256, 256, 0.15, ['#d8ccb4', '#f2e9d8']);
    x.fillStyle = '#7a4a3a'; x.fillRect(0, 236, 256, 20);
  }), 2, 1);
  const pedraTex = texOf(mkCanvas(256, 256, x => {
    x.fillStyle = '#8d8578'; x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 256; r += 42) for (let c = (r / 42 % 2) * 26; c < 256; c += 52) {
      x.fillStyle = ['#9a9284', '#7f7768', '#a49a8a'][(r + c) % 3];
      x.fillRect(c + 2, r + 2, 48, 38);
    }
    noiseOver(x, 256, 256, 0.18, ['#6f675a']);
  }), 8, 2);
  const signTex = (lines, bg, fg) => texOf(mkCanvas(256, 96, x => {
    x.fillStyle = bg; x.fillRect(0, 0, 256, 96);
    x.strokeStyle = fg; x.lineWidth = 5; x.strokeRect(4, 4, 248, 88);
    x.fillStyle = fg; x.textAlign = 'center';
    x.font = `bold ${lines.length > 1 ? 26 : 30}px Arial Black,sans-serif`;
    lines.forEach((l, i) => x.fillText(l, 128, lines.length > 1 ? 40 + i * 34 : 58));
  }));
  const signSitio = signTex(['SÍTIO SANTA TRETA'], '#2a4a2a', '#f2ead8');
  const signPedal = signTex(['PEDALINHO', 'NÃO É PROVA'], '#e03232', '#f2ead8');
  const signHorta = signTex(['HORTA ORGÂNICA', '(CONFIANÇA)'], '#3a5a2a', '#f2ead8');

  const MAT = {
    grass: lam({ map: T.grass || null }),
    dirt: lam({ map: T.dirt || null, color: T.dirt ? 0xffffff : 0x9a7a4c }),
    pedra: lam({ map: pedraTex }),
    wood: lam({ map: woodTex }),
    roof: lam({ map: roofTex }),
    wall: lam({ map: wallTex }),
    concrete: lam({ map: T.concrete || null, color: T.concrete ? 0xffffff : 0x8b8b83 }),
    water: new THREE.MeshStandardMaterial({ map: waterTex, transparent: true, opacity: 0.82, roughness: 0.25 }),
    glass: lam({ color: 0x2a3a4a, roughness: 0.24 }),
    gun: lam({ color: 0x20242a }),
    palha: lam({ color: 0xc9a24a }),
    folha: lam({ color: 0x3f6b2a }),
    folha2: lam({ color: 0x4a7d32 }),
    folha3: lam({ color: 0x55703c }),
    tronco: lam({ color: 0x6b4f2c }),
  };

  const addBox = (w, h, d, mat, x, y, z, opts = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (opts.rx) m.rotation.x = opts.rx;
    if (opts.rz) m.rotation.z = opts.rz;
    root.add(m);
    if (opts.proxy) m.userData.proxyGLB = opts.proxy;
    if (opts.collide !== false) {
      const pad = opts.pad || 0;
      const ex = (opts.ry || opts.rz) ? Math.max(w, d) / 2 : w / 2;
      const ez = (opts.ry || opts.rz) ? Math.max(w, d) / 2 : d / 2;
      colliders.push({ minX: x - ex - pad, maxX: x + ex + pad, minY: y, maxY: y + h, minZ: z - ez - pad, maxZ: z + ez + pad });
      occluders.push(m);
    } else if (opts.bala) occluders.push(m);
    return m;
  };
  const addPlane = (w, h, mat, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x, y, z); m.rotation.y = ry; m.rotation.x = rx;
    m.receiveShadow = true; root.add(m); return m;
  };

  /* ---------------- campo ----------------
     O gramado é um Shape com BURACO no lago e no tanque: plano inteiro a y=0
     tapava a água (pen 0,31 no MAP1 de TODO o lago — defeito invisível do
     mapa original do PR #4, a grama flutuava sobre a lâmina). */
  T.grass && T.grass.repeat.set(16, 20);
  const grassSitio = lam({ map: T.grass || null });
  if (T.grass) {
    const t = T.grass.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.1, 0.1); t.needsUpdate = true;
    grassSitio.map = t; grassSitio.needsUpdate = true;
  }
  {
    const shape = new THREE.Shape();
    shape.moveTo(-HALF_X, -HALF_Z); shape.lineTo(HALF_X, -HALF_Z);
    shape.lineTo(HALF_X, HALF_Z); shape.lineTo(-HALF_X, HALF_Z); shape.closePath();
    const buraco = (minX, maxX, minZ, maxZ) => {
      const p = new THREE.Path();
      p.moveTo(minX, -minZ); p.lineTo(minX, -maxZ); p.lineTo(maxX, -maxZ); p.lineTo(maxX, -minZ);
      p.closePath();
      shape.holes.push(p);
    };
    buraco(LAGO.minX + 1, LAGO.maxX - 1, LAGO.minZ + 1, LAGO.maxZ - 1);   // margem de 1 m fica em pé
    buraco(-30.5, -23.5, -14.25, -9.75);
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(shape), grassSitio);
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
    occluders.push(ground);
  }
  // estrada de terra: porteira → contorna o lago pela margem leste → casa
  for (const [dx, dz, w, l] of [[5, 33, 5, 14], [5, 18, 5, 8], [13, 13, 6, 4], [15, 4, 5, 13], [1, -12, 5, 11], [-4, -20, 14, 5], [22, 6, 5, 24]])
    addPlane(w, l, MAT.dirt, dx, 0.04, dz, 0, -Math.PI / 2);

  /* ---------------- LAGO (pedalinhos + patos) ---------------- */
  {
    const bed = addPlane(LAGO.maxX - LAGO.minX, LAGO.maxZ - LAGO.minZ, lam({ color: 0x1a3a42 }), 0, LAGO.fundo, 2.5, 0, -Math.PI / 2);
    bed.receiveShadow = true;
    const water = addPlane(LAGO.maxX - LAGO.minX, LAGO.maxZ - LAGO.minZ, MAT.water, 0, LAGO.aguaY, 2.5, 0, -Math.PI / 2);
    water.userData.isWater = true;
    for (const [bx, bz, bw, bl] of [[0, LAGO.minZ - 1, 28, 2], [0, LAGO.maxZ + 1, 28, 2], [LAGO.minX - 1.5, 2.5, 3, 18], [LAGO.maxX + 1.5, 2.5, 3, 18]])
      addPlane(bw, bl, MAT.dirt, bx, 0.03, bz, 0, -Math.PI / 2);
    const pedalinho = (x, z, ry, cor) => {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.8), lam({ color: 0xf0f0f0 }));
      hull.position.y = 0.05; g.add(hull);
      const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.5, 3), lam({ color: 0xf0f0f0 }));
      nose.rotation.set(0, 0, Math.PI / 2); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0.05, 1.4); g.add(nose);
      const seat1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.4), lam({ color: cor })); seat1.position.set(0, 0.34, 0.5); g.add(seat1);
      const seat2 = seat1.clone(); seat2.position.z = -0.6; g.add(seat2);
      for (const [px, pz] of [[-0.6, 0.9], [0.6, 0.9], [-0.6, -0.9], [0.6, -0.9]]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), lam({ color: 0x888888 }));
        post.position.set(px, 0.9, pz); g.add(post);
      }
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 2.2), lam({ color: cor }));
      canopy.position.y = 1.45; canopy.castShadow = true; g.add(canopy);
      g.position.set(x, LAGO.aguaY - 0.17, z); g.rotation.y = ry;
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      root.add(g);
      colliders.push({ minX: x - 1.2, maxX: x + 1.2, minY: LAGO.fundo, maxY: LAGO.aguaY + 2.0, minZ: z - 1.6, maxZ: z + 1.6 });
      occluders.push(canopy);
      return g;
    };
    pedalinho(-6, 4, 0.4, 0x2b4d8f);
    pedalinho(6, 7, -0.5, 0xe03232);
    pedalinho(7, -3, 1.1, 0xffd23f);
    addPlane(2.4, 0.9, lam({ map: signPedal }), 13.6, 1.0, LAGO.maxZ + 2.2, Math.PI * 0.95);
    addBox(0.14, 1.0, 0.14, MAT.wood, 14.8, 0, LAGO.maxZ + 2.2);
  }

  /* ---------------- CASA SEDE (norte) + varanda jogável ---------------- */
  {
    const { x: HX, z: HZ, w: HW, d: HD, h: HH } = CASA;
    addBox(HW, HH, HD, MAT.wall, HX, 0, HZ);
    addBox(HW + 1, 0.3, HD * 0.62, MAT.roof, HX, HH, HZ - HD * 0.205, { rx: 0.42, collide: false });
    addBox(HW + 1, 0.3, HD * 0.62, MAT.roof, HX, HH, HZ + HD * 0.205, { rx: -0.42, collide: false });
    addPlane(1.4, 2.2, lam({ color: 0x3a2a1e }), HX + 2, 1.1, HZ + HD / 2 + 0.03, 0);
    for (const wx of [-5, -1, 5]) addPlane(1.6, 1.2, MAT.glass, HX + wx, 1.6, HZ + HD / 2 + 0.03, 0);
    addBox(VARANDA.x1 - VARANDA.x0, 0.1, VARANDA.z1 - VARANDA.z0, MAT.wood, (VARANDA.x0 + VARANDA.x1) / 2, VARANDA.y - 0.1, (VARANDA.z0 + VARANDA.z1) / 2, { collide: false, bala: true });
    addBox(VARANDA.x1 - VARANDA.x0, VARANDA.y, 0.35, MAT.concrete, (VARANDA.x0 + VARANDA.x1) / 2, 0, VARANDA.z0, { bala: true });
    for (let i = 0; i < 6; i++)
      addBox(0.18, 2.6, 0.18, MAT.wood, VARANDA.x0 + 0.5 + i * ((VARANDA.x1 - VARANDA.x0 - 1) / 5), VARANDA.y, VARANDA.z1, { collide: false });
    addBox(VARANDA.x1 - VARANDA.x0, 0.15, 5, MAT.roof, (VARANDA.x0 + VARANDA.x1) / 2, VARANDA.y + 2.6, (VARANDA.z0 + VARANDA.z1) / 2, { collide: false });
    const RX0 = VARANDA.x0, RX1 = VARANDA.x0 + 2.6;
    for (let i = 0; i < 8; i++)
      addBox(RX1 - RX0, 0.12, 0.62, MAT.wood, (RX0 + RX1) / 2, VARANDA.y * (1 - (i + 1) / 8) - 0.06, VARANDA.z1 + 0.31 + i * 0.62, { collide: false, bala: true });
  }

  /* ---------------- ÁREA GOURMET (NE) ---------------- */
  {
    const GX = 13, GZ = -24;
    addBox(5, 1.1, 2, lam({ color: 0x8f4a3a }), GX, 0, GZ - 3);
    addBox(1.2, 0.5, 1.2, lam({ color: 0x2a2a2a }), GX - 1, 1.1, GZ - 3);
    for (const [px, pz] of [[-3.2, -1.2], [3.2, -1.2], [-3.2, 3.2], [3.2, 3.2]])
      addBox(0.16, 2.6, 0.16, MAT.wood, GX + px, 0, GZ + pz, { collide: false });
    addBox(7, 0.15, 5.4, MAT.roof, GX, 2.6, GZ + 1, { collide: false });
    addPlane(3.2, 1.2, lam({ map: signTex(['CHURRASCO É', 'SÓ NO DOMINGO'], '#5c2a2a', '#ffd23f') }), GX, 2.0, GZ + 3.7, 0);
  }

  /* ---------------- TANQUE DE PLÁSTICO (raso, perto da casa) ----------------
     Fundo -0,12 + borda 0,18 = degrau de 0,30 exato: piscininha de fibra
     funda aqui seria pocinho-armadilha (o degrau do corpo é 0,30). */
  {
    const PX = -27, PZ = -12;
    addPlane(7, 4.5, MAT.water, PX, -0.05, PZ, 0, -Math.PI / 2);
    for (const [cx, cz, w, d] of [[PX, PZ - 2.45, 7.8, 0.3], [PX, PZ + 2.45, 7.8, 0.3], [PX - 3.75, PZ, 0.3, 5.2], [PX + 3.75, PZ, 0.3, 5.2]])
      addBox(w, 0.18, d, lam({ color: 0x3a6fa8 }), cx, 0, cz);
  }

  /* ---------------- HORTA (oeste) — canteiros + angolas ---------------- */
  const HORTA = { x0: -24, x1: -12, z0: 4, z1: 18 };
  {
    for (let i = 0; i < 4; i++) {
      const cz = HORTA.z0 + 1.6 + i * 3.6;
      addBox(HORTA.x1 - HORTA.x0 - 2, 0.5, 1.6, MAT.wood, (HORTA.x0 + HORTA.x1) / 2, 0, cz);
      for (let j = 0; j < 8; j++) {
        const vx = HORTA.x0 + 1.5 + j * 1.5;
        const folha = new THREE.Mesh(new THREE.SphereGeometry(0.34, 7, 5), i % 2 ? MAT.folha : MAT.folha2);
        folha.scale.set(1, 0.7, 1);
        folha.position.set(vx, 0.85, cz + (j % 2 ? 0.3 : -0.3));
        folha.castShadow = true;
        folha.userData.nonSolidSurface = true;   // folhagem não é teto (mesma doutrina da água)
        root.add(folha);
      }
    }
    addBox(0.16, 2.2, 0.16, MAT.wood, HORTA.x0 + 2, 0, (HORTA.z0 + HORTA.z1) / 2);
    const cabeca = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lam({ color: 0xd8c060 }));
    cabeca.position.set(HORTA.x0 + 2, 2.5, (HORTA.z0 + HORTA.z1) / 2); cabeca.castShadow = true; root.add(cabeca);
    addBox(1.4, 0.14, 0.14, MAT.wood, HORTA.x0 + 2, 1.7, (HORTA.z0 + HORTA.z1) / 2, { collide: false });
    addPlane(2.4, 0.9, lam({ map: signHorta }), HORTA.x0 - 0.8, 1.0, HORTA.z1 + 0.6, Math.PI / 2);
    /* Cercas ALINHADAS aos eixos (ry=0): cerca rotacionada tem AABB quadrado
       cheio e vira paredão invisível — ilhou pickups dentro da horta (VM14). */
    addBox(0.1, 0.9, 10, MAT.wood, HORTA.x0 - 1, 0, 11);
    addBox(11, 0.9, 0.1, MAT.wood, (HORTA.x0 + HORTA.x1) / 2, 0, HORTA.z1 + 1.2);
  }

  /* ---------------- POMAR (leste) — árvores + cavalinho ---------------- */
  {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const tx = 18 + i * 4.6, tz = -6 + j * 9.5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.8, 7), MAT.tronco);
      trunk.position.set(tx, 0.9, tz); trunk.castShadow = true; root.add(trunk); occluders.push(trunk);
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 6), MAT.folha);
      c1.position.set(tx, 2.6, tz); c1.castShadow = true; root.add(c1);
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), MAT.folha2);
      c2.position.set(tx + 0.7, 3.3, tz + 0.4); root.add(c2);
      colliders.push({ minX: tx - 0.35, maxX: tx + 0.35, minY: 0, maxY: 1.8, minZ: tz - 0.35, maxZ: tz + 0.35 });
    }
    /* ry=0 nas cercas do pomar: AABB de cerca rotacionada é paredão (VM14). */
    addBox(14, 0.9, 0.1, MAT.wood, 24, 0, -12);
    addBox(14, 0.9, 0.1, MAT.wood, 24, 0, 12);
  }

  /* ---------------- MURO DE PEDRA (perímetro) + PORTEIRA SUL ---------------- */
  {
    const MURO_H = 2.2;
    addBox(HALF_X * 2 - 2, MURO_H, 0.8, MAT.pedra, 0, 0, -HALF_Z + 1);
    // muro sul em dois segmentos: o vão de 8 m é a PORTEIRA de verdade
    addBox(30.4, MURO_H, 0.8, MAT.pedra, -17.8, 0, HALF_Z - 1);
    addBox(22.4, MURO_H, 0.8, MAT.pedra, 21.8, 0, HALF_Z - 1);
    addBox(0.8, MURO_H, HALF_Z * 2 - 2, MAT.pedra, -HALF_X + 1, 0, 0);
    addBox(0.8, MURO_H, HALF_Z * 2 - 2, MAT.pedra, HALF_X - 1, 0, 0);
    const GX = 5, GZ = HALF_Z - 1;
    addBox(0.5, 3.4, 0.5, MAT.concrete, GX - 4.6, 0, GZ);
    addBox(0.5, 3.4, 0.5, MAT.concrete, GX + 4.6, 0, GZ);
    addPlane(7, 1.4, lam({ map: signSitio }), GX, 3.2, GZ - 0.2, Math.PI);
    addPlane(7, 1.4, lam({ map: signSitio }), GX, 3.2, GZ + 0.2, 0);
    addBox(2.2, 1.8, 0.3, MAT.wall, GX - 8.2, 0, GZ);
  }

  /* ---------------- cobertura rural distribuída (MAP5) ---------------- */
  const eucalipto = (x, z) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 3.4, 7), MAT.tronco);
    trunk.position.set(x, 1.7, z); trunk.castShadow = true; root.add(trunk); occluders.push(trunk);
    for (let k = 0; k < 3; k++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(1.15 - k * 0.18, 7, 5), k % 2 ? MAT.folha3 : MAT.folha);
      c.position.set(x + (k - 1) * 0.32, 3.4 + k * 0.62, z + (k === 1 ? 0.3 : -0.2));
      c.castShadow = true; root.add(c);
    }
    colliders.push({ minX: x - 0.3, maxX: x + 0.3, minY: 0, maxY: 2.2, minZ: z - 0.3, maxZ: z + 0.3 });
  };
  const arbusto = (x, z, s = 1) => {
    addBox(1.3 * s, 1.0 * s, 1.3 * s, MAT.folha3, x, 0, z, { ry: x * 0.7 + z });
  };
  const pedraCampo = (x, z, s = 1.1) => {
    const pedra = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), MAT.pedra);
    pedra.position.set(x, s * 0.55, z); pedra.scale.y = 0.72;
    pedra.rotation.y = x * 0.37 + z;
    pedra.castShadow = pedra.receiveShadow = true; root.add(pedra); occluders.push(pedra);
    colliders.push({ minX: x - s * 0.8, maxX: x + s * 0.8, minY: 0, maxY: s * 1.1, minZ: z - s * 0.8, maxZ: z + s * 0.8 });
  };
  const fardo = (x, z, ry = 0) => {
    const hay = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.6, 12), MAT.palha);
    hay.rotation.set(Math.PI / 2, 0, ry); hay.position.set(x, 1.0, z);
    hay.castShadow = hay.receiveShadow = true; root.add(hay); occluders.push(hay);
    colliders.push({ minX: x - 1, maxX: x + 1, minY: 0, maxY: 2, minZ: z - 1, maxZ: z + 1 });
  };
  const pilhaToras = (x, z, n = 3) => {
    for (let i = 0; i < n; i++) for (const off of [-0.55, 0.55]) {
      const tora = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.4, 9), MAT.tronco);
      tora.rotation.z = Math.PI / 2; tora.position.set(x + i * 0.05, 0.44 + i * 0.78, z + off + i * 0.16);
      tora.castShadow = true; root.add(tora); occluders.push(tora);
    }
    colliders.push({ minX: x - 1.3, maxX: x + 1.3, minY: 0, maxY: 0.44 + n * 0.78, minZ: z - 1.2, maxZ: z + 1.2 });
  };
  const troncoCaido = (x, z, vertical = false) => {
    /* Sem rotação: AABB de tronco girado é bloco 3,2×3,2 — paredão (VM14). */
    if (vertical) addBox(0.75, 0.75, 3.2, MAT.tronco, x, 0, z);
    else addBox(3.2, 0.75, 0.75, MAT.tronco, x, 0, z);
  };
  const cocho = (x, z, ry = 0) => {
    addBox(1.8, 0.65, 0.9, MAT.wood, x, 0, z, { ry });
  };
  const moyo = (x, z) => addBox(0.16, 1.5, 0.16, MAT.wood, x, 0, z);

  // pasto norte
  for (const [x, z] of [[-28, -36], [-21, -33], [-18, -40], [22, -34], [29, -30]]) eucalipto(x, z);
  pilhaToras(-28, -26, 3); pilhaToras(27, -22, 2);
  pedraCampo(-19, -38); pedraCampo(31, -36); pedraCampo(16, -38);
  fardo(-25, -19); fardo(20, -18, 0.4);
  arbusto(-16, -19); arbusto(25, -27, 0.9); arbusto(8, -38, 1.1); arbusto(-31, -22, 0.8);
  troncoCaido(2, -37);
  // telheiro/garagem aberta (NW)
  {
    const ZX = -27, ZZ = -31;
    for (const [px, pz] of [[-4, -2.5], [4, -2.5], [-4, 2.5], [4, 2.5]])
      addBox(0.3, 3, 0.3, MAT.wood, ZX + px, 0, ZZ + pz);
    addBox(9.5, 0.2, 6, MAT.roof, ZX, 3, ZZ, { collide: false });
    addBox(2.8, 1.5, 4.5, MAT.wood, ZX - 2.5, 0, ZZ);
  }
  // faixa oeste
  for (const [x, z] of [[-30, 2], [-29, 20], [-31, -6]]) eucalipto(x, z);
  pedraCampo(-28, 26, 1.3); pedraCampo(-30, 12, 1.2); pedraCampo(-19, 26);
  fardo(-23, 26, 0.7); fardo(-20, -2, 1.1);
  arbusto(-28, 33, 1.2); arbusto(-17, 28); arbusto(-24, 22, 0.8);
  troncoCaido(-20, 34); cocho(-27, 7);
  moyo(-25, 29); moyo(-15, 24);
  // miolo (entre lago e muros)
  pedraCampo(-16, -8, 1.0); pedraCampo(16, -8, 1.1); pedraCampo(28, 18, 1.2); pedraCampo(6, 26, 0.9);
  fardo(9, 20, 0.2); fardo(-7, 30, 0.5);
  arbusto(-15, 22); arbusto(10, 26, 1.1); arbusto(18, 24); arbusto(-9, -12, 0.9); arbusto(16, 14, 0.8);
  cocho(-6, 15); cocho(14, 26, 0.5);
  pilhaToras(24, 28, 2);
  // reforço do miolo: os quadrantes centrais eram deserto (MAP5 media espaçamento
  // de 10-17 m — hoje cobertos com o mesmo vocabulário rural, sem item urbano)
  arbusto(-3, -16); pedraCampo(-14, -14, 0.9); troncoCaido(-8, -19); moyo(-1, -19);
  arbusto(4, -13); pedraCampo(13, -17, 0.9); fardo(11, -8, 0.9); arbusto(2, -9);
  arbusto(-1, 12); pedraCampo(-15, 20, 0.8); moyo(-2, 17); troncoCaido(-15, 3, true);
  arbusto(12, 12); pedraCampo(1, 18, 0.8); arbusto(4, 16);
  // reforço dos quadrantes de borda (mesmo teto MAP5 da família dos mapas novos).
  // Faixa norte fica RENTE AO MURO (z ~-40,5) e os slots E desviados das
  // diagonais: o primeiro lote cercou o spawn — CTF2 caiu a 0 rota e folga a 0,3.
  eucalipto(-5, -40.6); pedraCampo(-11, -40.4, 0.9); cocho(-4, -40.6); troncoCaido(-12, -40.9); arbusto(-1, -40.5, 0.8); moyo(-8.75, -40.8);
  pedraCampo(5, -33, 1.0); arbusto(12, -33, 1.0);
  pedraCampo(-21, -16, 1.0); arbusto(-29, -14, 1.1); troncoCaido(-24, -11, true);
  arbusto(-10, 14, 0.8);
  /* Nota MAP5 (report-only): q1,0 (quintal da casa) mede 9,14 m de espaçamento
     contra 6,4-6,7 da família dos mapas novos — cada cover extra ali fechou
     rota CTF2 do spawn E (cláusula DURA). Dívida de densidade registrada, não
     de silêncio: quem for fechar, abre passagem >= 3,4 m no eixo E→V. */
  // bebedouro dos cavalos + poço
  addBox(3.4, 0.6, 1.0, MAT.wood, 2, 0, 22);
  {
    const WX = -8, WZ = 24;
    const well = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 1.0, 10), MAT.pedra);
    well.position.set(WX, 0.5, WZ); well.castShadow = true; root.add(well); occluders.push(well);
    colliders.push({ minX: WX - 1.2, maxX: WX + 1.2, minY: 0, maxY: 1.0, minZ: WZ - 1.2, maxZ: WZ + 1.2 });
    for (const px of [-1, 1]) addBox(0.12, 1.8, 0.12, MAT.wood, WX + px, 0.5, WZ, { collide: false });
    addBox(2.8, 0.12, 2.2, MAT.roof, WX, 2.3, WZ, { collide: false });
  }
  // trator velho (SE)
  {
    const TX = 20, TZ = 33, TR = -0.4;
    addBox(2.2, 1.2, 3.2, lam({ color: 0x8f2a2a }), TX, 0.6, TZ, { ry: TR });
    addBox(1.6, 1.4, 1.6, lam({ color: 0x8f2a2a }), TX - 0.2, 1.8, TZ + 0.5, { ry: TR });
    addBox(1.8, 0.5, 2.2, lam({ color: 0x2a2a2a }), TX, 0, TZ - 0.3, { ry: TR, collide: false });
    for (const [wx, wz, r] of [[-1.2, -1, 0.55], [1.2, -1, 0.55], [-1.2, 1.1, 0.75], [1.2, 1.1, 0.75]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.4, 10), lam({ color: 0x1a1a1a }));
      wheel.rotation.z = Math.PI / 2; wheel.rotation.y = TR;
      wheel.position.set(TX + wx, r, TZ + wz); wheel.castShadow = true; root.add(wheel);
    }
  }
  // cercas do pasto sul — a da coluna do meio é CURTA de propósito: AABB de
  // cerca rotacionada engole a diagonal e virava muro na saída leste do spawn B
  for (const [fx, fz, w, d] of [[-20, 36, 10, 0.1], [-6, 38, 8, 0.1], [15, 36.5, 7, 0.1], [28, 26, 7, 0.1]]) {
    addBox(w, 0.12, d, MAT.wood, fx, 0.85, fz);
    addBox(w, 0.12, d, MAT.wood, fx, 0.45, fz);
  }

  /* ---------------- PROPS do acervo (GLB + proxy) ---------------- */
  const prop = (id, p, box) => {
    const usaGLB = QP.get('glb') !== '0' && PB.add(id, p);
    const m = addBox(box[0], box[1], box[2], lam({ color: 0x6f6256, roughness: 0.92 }), p.x, p.y || 0, p.z, { proxy: id, ry: p.ry || 0 });
    if (usaGLB) {
      m.visible = false;
      const i = occluders.indexOf(m); if (i >= 0) occluders.splice(i, 1);
    }
    return m;
  };
  prop('caixa_dagua_fibra', { x: CASA.x - 6, y: CASA.h + 0.25, z: CASA.z - 1, targetH: 2.2 }, [1.8, 2.2, 1.8]);  // na laje da casa
  prop('caixa_dagua_fibra', { x: -30, y: 0, z: -26, targetH: 3.4 }, [1.8, 3.4, 1.8]);                            // torre do telheiro
  prop('churrasqueira', { x: 9, y: 0, z: -27, targetH: 1.3, ry: 1.2 }, [1.2, 1.3, 1.0]);
  prop('mesa_guardasol', { x: 16, y: 0, z: -21, targetH: 2.2 }, [2.0, 2.2, 2.0]);
  prop('banco_jardim', { x: -17, y: 0, z: -12, targetH: 0.8, ry: 0.4 }, [1.8, 0.8, 0.6]);
  prop('banco_jardim', { x: 0, y: 0, z: LAGO.maxZ + 3, targetH: 0.8, ry: Math.PI }, [1.8, 0.8, 0.6]);
  for (const [bx, bz, ry] of [[28, 8, 0.3], [31, -2, 1.1], [26, 20, 0.7], [-29, 38, 0.2]])
    prop('bananeira', { x: bx, y: 0, z: bz, targetH: 2.6, ry }, [1.2, 2.6, 1.2]);
  for (const [px, pz] of [[-30, 38], [30, 38]])
    prop('palmeira_imperial', { x: px, y: 0, z: pz, targetH: 5 }, [1.0, 5, 1.0]);

  /* ---------------- pickups (veto do dono: armas no chão) ---------------- */
  const placePickup = (kind, x, z) => {
    const y = groundHeightAt(x, z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1), MAT.gun);
    m.position.set(x, y + 0.07, z); m.rotation.y = (x * 7 + z * 13) % Math.PI;
    m.castShadow = true; root.add(m);
    pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m });
  };
  [
    ['awp', 12.6, LAGO.maxZ + 1.8],     // na areia, ao lado do pedalinho (meme do PR #4)
    ['ak', -6, -14], ['m4', 16, -16], ['awp', 24, -10], ['deagle', 11, -24],
    ['shotgun', 18, -27], ['mp5', -15, -9], ['m400', -30, -19], ['akm', -26, -33],
    ['g3', -5, -7], ['revolver38', -3, -10], ['md97', -20, 10.6], ['uzi', -28, 11],
    ['p90', -11, 28], ['mosin', -2, 34], ['scar', 9, 31], ['tavor', 21, 16],
    ['famas', 28, 4], ['deagle', 31, -33], ['shotgun', 14, 23], ['mp5', -22, 33],
    ['m4', 4, 24], ['ak', -31, 0], ['awp', 27, 24],
  ].forEach(p => placePickup(...p));

  /* ---------------- chão / água ---------------- */
  function groundHeightAt(x, z) {
    /* fundo só 1 m pra dentro: a faixa da borda é MARGEM em pé (y 0) — a
       areia a 0,03 cobre grama de verdade, não o fundo do lago. */
    if (x >= LAGO.minX + 1 && x <= LAGO.maxX - 1 && z >= LAGO.minZ + 1 && z <= LAGO.maxZ - 1) return LAGO.fundo;
    if (x >= VARANDA.x0 && x <= VARANDA.x1) {
      if (z >= VARANDA.z0 && z <= VARANDA.z1) return VARANDA.y;
      if (x <= VARANDA.x0 + 2.6 && z > VARANDA.z1 && z <= VARANDA.z1 + 5.0)
        return VARANDA.y * (1 - (z - VARANDA.z1) / 5.0);
    }
    if (x >= -30.5 && x <= -23.5 && z >= -14.25 && z <= -9.75) return -0.12;   // tanque
    return 0;
  }
  const slowAt = (x, z) => x >= LAGO.minX - 1 && x <= LAGO.maxX + 1 && z >= LAGO.minZ - 1 && z <= LAGO.maxZ + 1;

  /* ---------------- waypoints (A* dos bots) ---------------- */
  const nodes = [], adj = [], STEP = 4;
  const blocked = (x, z, inflate) => {
    const g = groundHeightAt(x, z);
    for (const c of colliders) {
      if (x > c.minX - inflate && x < c.maxX + inflate &&
          z > c.minZ - inflate && z < c.maxZ + inflate &&
          c.minY < g + 1.6 && c.maxY > g + 0.15) return true;
    }
    return false;
  };
  for (let gx = -30; gx <= 30; gx += STEP)
    for (let gz = -38; gz <= 38; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const linha = (x0, z0, x1, z1, passo = 2) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / passo));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n;
      if (!blocked(x, z, 0.45)) nodes.push({ x, z });
    }
  };
  linha(-8, -38, 5, 38);           // espinha da estrada
  linha(-8, -38, -30, -10); linha(-30, -10, -22, 36);
  linha(5, 38, 30, 6); linha(30, 6, 24, -30);
  linha(30, 6, 30, 36);            // corredor leste
  linha(-16, -30, -16, 10); linha(-16, 10, -18, 36);
  linha(-6, -14, 18, -10); linha(18, -10, 18, 30);
  linha(-22, 12, -12, 12); linha(-12, 30, 14, 30);
  const SEG_AMOSTRAS = 16;
  const segClear = (a, b) => {
    let h = groundHeightAt(a.x, a.z);
    for (let i = 1; i <= SEG_AMOSTRAS; i++) {
      const t = i / SEG_AMOSTRAS, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const nh = groundHeightAt(x, z);
      if (Math.abs(nh - h) > 0.28 || blocked(x, z, 0.28)) return false;
      h = nh;
    }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) adj.push([]);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dz * dz <= 6.0 * 6.0 && segClear(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); }
    }
  }
  function nearestWaypoint(x, z) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = (nodes[i].x - x) ** 2 + (nodes[i].z - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }
  const dist = (a, b) => Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
  function findPath(from, to) {
    if (from === to) return [to];
    const g = new Float32Array(nodes.length).fill(Infinity), f = new Float32Array(nodes.length).fill(Infinity);
    const prev = new Int32Array(nodes.length).fill(-1), open = new Set([from]); g[from] = 0; f[from] = dist(from, to);
    while (open.size) {
      let cur = -1, score = Infinity; for (const n of open) if (f[n] < score) { score = f[n]; cur = n; }
      if (cur === to) { const p = [cur]; while (prev[cur] !== -1) { cur = prev[cur]; p.unshift(cur); } return p; }
      open.delete(cur);
      for (const n of adj[cur] || []) { const ng = g[cur] + dist(cur, n); if (ng < g[n]) { prev[n] = cur; g[n] = ng; f[n] = ng + dist(n, to); open.add(n); } }
    }
    return [from];
  }

  /* ---------------- spawns + CTF ---------------- */
  const spawns = {
    E: [-16, -12.5, -9, -5.5].map(x => ({ x, z: -38, yaw: 0 })),
    B: [0, 2.5, 5, 7.5].map(x => ({ x, z: 35, yaw: Math.PI })),
  };
  const ctfPoints = [
    { id: 'V', label: 'Varanda', x: -4, z: -13 },
    { id: 'H', label: 'Horta', x: -17, z: 11.2 },
    { id: 'P', label: 'Pomar', x: 23, z: 1 },
    { id: 'G', label: 'Gourmet', x: 15, z: -15 },
  ];

  /* ---------------- luz + névoa (LOOK sitio) ---------------- */
  const { hemi, sun } = applyLook(scene, T, 'sitio', { nofog: QP.get('nofog') === '1' }) || {};
  if (sun) {
    sun.shadow.mapSize.set(LOWQ ? 1024 : 2048, LOWQ ? 1024 : 2048);
    sun.shadow.camera.left = -HALF_X; sun.shadow.camera.right = HALF_X;
    sun.shadow.camera.top = HALF_Z; sun.shadow.camera.bottom = -HALF_Z;
    sun.shadow.camera.far = 200; sun.shadow.bias = -0.0006;
  }

  /* ---------------- lote de props ---------------- */
  const preLote = new Set(root.children);
  PB.build(root);
  for (const c of root.children) {
    if (preLote.has(c) || !c.isInstancedMesh) continue;
    const ms = Array.isArray(c.material) ? c.material : [c.material];
    if (ms.some((m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9)))) occluders.push(c);
  }

  /* ---------------- FAUNA: pato NADA, angola CISCA, cavalinho PASTA ---------------- */
  if (typeof document !== 'undefined') loadSitioFauna();
  const base = createFavelaAmbience(root, {
    map: 'sitio', low: LOWQ,
    rats: [
      { pos: [-26.5, 0, -28.2], to: [-25.7, 0, -27.3], phase: .3 },
      { pos: [7.5, 0, 38.5], to: [8.8, 0, 37.4], phase: 1.8 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-8, VARANDA.y, -18.5], phase: .5 },
      { mode: 'ground', pos: [4, 0, 33], phase: 1.6 },
    ],
    dogs: [{ pos: [-16, 0, -4], to: [-11, 0, -2], phase: .9 }],
  });
  const ambience = createSitioAmbience(root, {
    map: 'sitio', lake: LAGO, base,
    patos: [
      { pos: [-9, LAGO.aguaY, 4], to: [-3, LAGO.aguaY, 8], phase: .2 },
      { pos: [8, LAGO.aguaY, 0], to: [-4, LAGO.aguaY, -2], phase: 1.4 },
      { pos: [-3, LAGO.aguaY, 8], to: [1, LAGO.aguaY, 0], phase: 2.6 },
      { pos: [0, LAGO.aguaY, -2], to: [-8, LAGO.aguaY, 5], phase: 3.8 },
    ],
    angolas: [
      { pos: [-20, 0, 7.4], to: [-15.5, 0, 11.2], phase: .4 },
      { pos: [-15, 0, 14.8], to: [-19, 0, 11.2], phase: 1.7 },
      { pos: [-22, 0, 18.4], to: [-17, 0, 14.8], phase: 2.9 },
    ],
    cavalos: [
      { pos: [5, 0, 25], to: [0, 0, 28], phase: .8 },
      { pos: [8, 0, 26], to: [4, 0, 29], phase: 2.1 },
    ],
  });

  let aguaT = 0;
  return {
    root, colliders, occluders, decalSolids: [root],
    groundHeightAt, slowAt, spawns, sun, hemi, pickups, ctfPoints, ambience,
    lake: LAGO,
    sound: {
      loops: [
        { src: AMB_LOOPS.passaros, pos: [-12, 3, -22], radius: 36, vol: .4 },
        { src: AMB_LOOPS.passaros, pos: [22, 3, 6], radius: 32, vol: .32 },
        { src: AMB_LOOPS.grilos, pos: [0, 2, 26], radius: 55, vol: .22 },
        { src: AMB_LOOPS.vento, pos: [0, 6, 0], radius: 80, vol: .18 },
      ],
      bioma: 'campo',
    },
    update(dt) { aguaT += dt; waterTex.offset.set(aguaT * 0.02, aguaT * 0.013); },
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 2, maxX: HALF_X - 2, minZ: -HALF_Z + 2, maxZ: HALF_Z - 2 },
  };
}
