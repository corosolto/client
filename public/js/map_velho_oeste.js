// SERTÃO DA TRETA (velho_oeste) — r2: RECONSTRUÇÃO, não repintura. O dono reprovou a
// r1 ("continua com visual do velho oeste so mudou o nome do mapa"): o casario de
// fachada faroeste saiu e entrou arraial de pau a pique em volta da praça da matriz
// (igrejinha no adro é o gesto de cidade PE pequena). Gameplay/rotas seguem medidos
// pela eval:velhooeste; identidade pela eval:sertao (ST1-ST5). Referências da r2:
// pau a pique = troncos verticais + barro, caiação clara, base de pedra (Wikipédia
// "Pau a pique"); caatinga = "mata branca" espinhosa e DENSA, não deserto (idem
// "Caatinga"); mandacaru = castiçal colunar (idem "Mandacaru"); juazeiro = ramos
// tortuosos (idem "Juazeiro"); praça brasileira nasce do adro da igreja (idem "Praça").
import * as THREE from 'three';
import { createFavelaAmbience, placeFauna, FAVELA_AMBIENCE_ASSETS } from './ambientlife.js';
import { placeProp, hasProp } from './mapprops.js';
import { applyLook } from './map_sky.js';
import { AMB_LOOPS } from './soundscape.js';

const HALF_X = 34;
const HALF_Z = 46;

export const VELHO_OESTE_PROPS = ['sertao_mandacaru', 'sertao_macambira', 'sertao_juazeiro',
  'sertao_xique_xique', 'sertao_poco_roda', 'sertao_capelinha', 'sertao_palhoca_forro', 'caixa_som_baile',
  'casa_pau_a_pique', 'igrejinha', 'caminhao_antigo'];
export const VELHO_OESTE_AMBIENCE = Object.freeze([...FAVELA_AMBIENCE_ASSETS, 'lagarto', 'calango']);

export function buildVelhoOeste(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  root.name = 'velho-oeste-da-treta';   // id do mapa: 'sertao-*' é prefixo da régua ST1
  scene.add(root);
  const GLB_ON = typeof window !== 'undefined';

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

  /* Adobe (taipa): DataTexture no idioma do texturaMuro do map_mansao.js — existe
     em node, que é onde a ST2 da eval:sertao lê o material da parede. */
  const texProcedural = (S, fn) => {
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) data.set([...fn(x, y)], 255, (y * S + x) * 4);
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
    return t;
  };
  const texturaAdobe = () => {
    const t = texProcedural(128, (x, y) => {
      const fiada = (y % 21) < 2, palha = ((x * 13 + y * 29) % 37) < 2, n = ((x * 17 + y * 31) % 19) - 9;
      if (fiada) return [125, 96, 66];
      if (palha) return [214, 186, 138];
      const b = 187 + n;
      return [b, b - 26, b - 58];
    });
    t.repeat.set(3, 2); t.name = 'oeste-adobe'; return t;
  };
  /* Pau a pique (r2): troncos verticais ~25 cm entre face e face e varas horizontais
     mais finas achatadas no barro (Wikipédia "Pau a pique"). Nome oeste-adobe-paupique
     porque pau a pique É taipa de mão — a ST2 da eval:sertao lê o prefixo. */
  const texturaPaupique = () => {
    const t = texProcedural(128, (x, y) => {
      const tronco = (x % 32) < 4, vara = (y % 17) < 2, n = ((x * 23 + y * 11) % 15) - 7;
      if (tronco) { const b = 112 + n; return [b, b - 24, b - 48]; }
      if (vara) return [150, 121, 90];
      const b = 190 + n;
      return [b, b - 22, b - 52];
    });
    t.repeat.set(2, 2); t.name = 'oeste-adobe-paupique'; return t;
  };
  /* Solo rachado da caatinga seca (r2): rede de rachaduras poligonais sobre a terra —
     bump forte no chão, no idioma do texturaMuro/texturaAdobe. */
  const texturaRachado = () => {
    const S = 256;
    const data = new Uint8Array(S * S * 4);
    const trincha = [];
    for (let i = 0; i < 46; i++) {
      const a = (i * 137.5) % 360 * Math.PI / 180;
      trincha.push({ x: (i * 61) % S, y: (i * 97) % S, dx: Math.cos(a), dy: Math.sin(a), passos: 40 + (i * 31) % 50 });
    }
    const altura = new Float32Array(S * S);
    for (const t of trincha) {
      let x = t.x, y = t.y;
      for (let p = 0; p < t.passos; p++) {
        for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
          const px = (x + ox | 0), py = (y + oy | 0);
          if (px >= 0 && px < S && py >= 0 && py < S) altura[py * S + px] = Math.max(altura[py * S + px], 1 - p / t.passos);
        }
        x += t.dx + Math.sin(p * 2.3 + t.passos) * .6; y += t.dy + Math.cos(p * 1.7) * .6;
      }
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const v = altura[i] > .34 ? 40 : 165 + ((x * 7 + y * 13) % 21);
      data.set([v, v - 12, v - 34, 255], i * 4);
    }
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 7); t.needsUpdate = true; t.name = 'oeste-rachado';
    return t;
  };

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
  if (GLB_ON) {
    TX.wood = realTexture('wood-real-v1.webp', 'oeste-wood-real', 3, 5);
    TX.paleWood = realTexture('wood-real-v1.webp', 'oeste-wood-pale-real', 3, 5);
    TX.sand = realTexture('dirt-real-v1.webp', 'oeste-sand-real', 12, 14);
    TX.roof = realTexture('roof-real-v1.webp', 'oeste-roof-real', 4, 7);
    TX.cactus = realTexture('cactus-real-v1.webp', 'oeste-cactus-real', 2, 4);
    TX.hay = realTexture('hay-real-v1.webp', 'oeste-hay-real', 3, 3);
    TX.metal = realTexture('metal-real-v1.webp', 'oeste-metal-real', 3, 4);
    TX.adobe = new THREE.TextureLoader().load('/img/textures/tex_adobe.webp');
    TX.adobe.colorSpace = THREE.SRGBColorSpace; TX.adobe.wrapS = TX.adobe.wrapT = THREE.RepeatWrapping;
    TX.adobe.repeat.set(3, 2); TX.adobe.anisotropy = 8; TX.adobe.name = 'oeste-adobe-real';
  }
  const mat = (color, map = TX.wood, roughness = .9, metalness = 0, bumpScale = .045) => new THREE.MeshStandardMaterial({ color, map, bumpMap: map, bumpScale, roughness, metalness });
  const adobeDe = (color) => mat(color, TX.adobe || (TX.adobe = texturaAdobe()), .96, 0, .05);
  const paupiqueDe = (color) => mat(color, TX.paupique || (TX.paupique = texturaPaupique()), .97, 0, .06);
  const MAT = {
    sand: new THREE.MeshStandardMaterial({ color: 0xffffff, map: TX.sand, bumpMap: TX.rachado || (TX.rachado = texturaRachado()), bumpScale: .22, roughness: 1, metalness: 0 }),
    wood: mat(0xffffff), pale: mat(0xd9b17a, TX.paleWood), dark: mat(0x3b2115),
    roof: mat(0xffffff, TX.roof, .94, 0, .1), trim: mat(0xd8ad6b, TX.paleWood), metal: mat(0x8c8174, TX.metal, .55, .35, .035),
    black: mat(0x191411, TX.metal, .6, .25), cactus: mat(0xffffff, TX.cactus, 1, 0, .075), cactusLight: mat(0xaed09a, TX.cactus, 1, 0, .075),
    hay: mat(0xffffff, TX.hay, 1, 0, .09), red: mat(0x7e271f, TX.wood), blue: mat(0x2d5361, TX.wood), glass: mat(0x87b2ba, TX.metal, .25, .05, .01),
    windowVoid: new THREE.MeshBasicMaterial({ color: 0x1b110b }),
    adobe: adobeDe(0xffffff), adobeCaiado: adobeDe(0xf3ecdc), adobeOcre: adobeDe(0xd8b98c),
    paupiqueCru: paupiqueDe(0xffffff), paupiqueCaiado: paupiqueDe(0xf6efdd), paupiqueOcre: paupiqueDe(0xd8b98c),
    pedra: mat(0x9a8d7c, TX.sand, 1, 0, .14),
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
    if (opts.name) mesh.name = opts.name;
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
  /* r2: cartazes de PROCURADO e janelas western SAÍRAM com o saloon — a sátira do
     sertão é outra (leilão, forró, vaquejada) e o casario agora é molde Mint. */

  /* CÉU/NÉVOA/SOL do LOOK['velho_oeste'] (fim de tarde de sertão) — o shadow
     fica aqui porque o builder conhece os limites (idioma do map_mansao.js). */
  const { sun } = applyLook(scene, T, 'velho_oeste');
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -48; sun.shadow.camera.right = 48;
  sun.shadow.camera.top = 58; sun.shadow.camera.bottom = -58; sun.shadow.camera.far = 160; sun.shadow.bias = -.00045;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 180), MAT.sand); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);
  for (let z = -HALF_Z; z <= HALF_Z; z += 8) addBox(8, .025, .11, MAT.pale, 0, .02, z, { collide: false, cast: false });

  /* ── O ARRAIAL r2 ───────────────────────────────────────────────────────
     Demolição do faroeste (r1): saloon/banco/delegacia/carroças saíram. No lugar,
     casa de pau a pique (molde Mint) em 2-3 ruas de terra ao redor da PRAÇA DA
     MATRIZ — igrejinha de frente pro largo é o gesto de cidade PE pequena. */

  // Cercas delimitam a arena, mas deixam duas entradas por ponta e flancos amplos.
  for (const sx of [-1, 1]) for (let z = -HALF_Z; z <= HALF_Z; z += 4) {
    addBox(.16, 1.5, .16, MAT.dark, sx * (HALF_X - .7), 0, z, { collide: false });
    if (z < HALF_Z - 2) for (const y of [.45, 1.15]) addBox(.16, .14, 4, MAT.pale, sx * (HALF_X - .7), y, z + 2, { collide: false });
  }
  for (const z of [-HALF_Z, HALF_Z]) {
    addBox(22, 1.5, .22, MAT.pale, -22, 0, z); addBox(22, 1.5, .22, MAT.pale, 22, 0, z);
    addSign('SERTÃO', 'DA TRETA', 0, 6.4, z, z > 0 ? Math.PI : 0, 10, 3);
    for (const x of [-6, 6]) addBox(.35, 7.6, .35, MAT.dark, x, 0, z);
    addBox(12.4, .35, .35, MAT.dark, 0, 7.3, z, { collide: false });
  }

  /* GLB (Mint) OU proxy procedural, nunca os dois: mesh invisível como occluder
     é o defeito que o MAP4 pega. Colisor manual igual nos dois ramos. opts.ry
     casa o casario com a rua (a r1 girava tudo por id*1.7 — sem controle de face). */
  function sertaoElement(name, id, x, z, buildProxy, propId, targetH, collider, opts = {}) {
    const group = new THREE.Group(); group.name = `sertao-${name}-${id}`; group.position.set(x, 0, z); root.add(group);
    let visualRoot = group;
    if (GLB_ON && propId && hasProp(propId)) {
      const prop = placeProp(propId, { x, z, targetH: opts.targetH ?? targetH, targetLen: opts.targetLen ?? 0, ry: opts.ry ?? id * 1.7 });
      if (prop) { root.add(prop); visualRoot = prop; }
    }
    if (visualRoot === group) {
      group.rotation.y = opts.ry ?? id * 1.7;
      buildProxy(group, opts);
    }
    if (collider) {
      const c = Math.abs(Math.cos(group.rotation.y)), s = Math.abs(Math.sin(group.rotation.y));
      const hx = c * collider[0] + s * collider[2], hz = s * collider[0] + c * collider[2];
      colliders.push({ minX: x - hx, maxX: x + hx, minY: 0, maxY: collider[1], minZ: z - hz, maxZ: z + hz, tag: opts.tag });
      const base = visualRoot === group ? group : visualRoot;
      occluders.push(base);
    }
    return group;
  }

  /* ── CASAS DE PAU A PIQUE — proxy do que o molde Mint desenha: troncos verticais
     afogados no barro, base de pedra (balança), telhado de telha e alpendre com
     esteios. A parede principal é mesh nomeado parede-casa-N com taipa oeste-adobe-*,
     que é o que a ST2 mede em node (GLB é enfeite; posição/colisor são os dois ramos). */
  const CAIACOES = [MAT.paupiqueCaiado, MAT.paupiqueCru, MAT.paupiqueOcre];
  function casaProxy(group, opts = {}) {
    const cor = CAIACOES[opts.variante ?? 0], w = opts.w ?? 5.4, d = opts.d ?? 6.8, h = 3.1;
    const parede = new THREE.Mesh(boxGeo(w, h, d), cor);
    parede.name = `parede-casa-${opts.id ?? 0}`; parede.position.y = .55 + h / 2;
    parede.castShadow = true; parede.receiveShadow = true; group.add(parede);
    const base = new THREE.Mesh(boxGeo(w + .25, .55, d + .25), MAT.pedra);
    base.position.y = .275; base.castShadow = true; base.receiveShadow = true; group.add(base);
    for (const sx of [-1, 1]) {
      const agua = new THREE.Mesh(boxGeo(w * .56, .3, d + 1), MAT.roof);
      agua.position.set(sx * w * .27, .55 + h + .15, 0); agua.rotation.z = sx * .16; agua.castShadow = true; group.add(agua);
    }
    const cumeeira = new THREE.Mesh(boxGeo(.34, .22, d + 1.25), MAT.dark);
    cumeeira.position.set(0, .55 + h + w * .28, 0); cumeeira.castShadow = true; group.add(cumeeira);
    const porta = new THREE.Mesh(boxGeo(1.15, 2.05, .14), MAT.dark);
    porta.position.set(0, .55 + 1.02, d / 2 + .02); group.add(porta);
    for (const sx of [-1.55, 1.55]) {
      const jan = new THREE.Mesh(boxGeo(.8, .8, .12), MAT.windowVoid);
      jan.position.set(sx, .55 + 1.9, d / 2 + .02); group.add(jan);
      const moldura = new THREE.Mesh(boxGeo(.98, .98, .1), MAT.pale);
      moldura.position.set(sx, .55 + 1.9, d / 2 - .01); group.add(moldura);
    }
    for (const sx of [-1, 1]) {
      const esteio = new THREE.Mesh(boxGeo(.16, 2.55, .16), MAT.dark);
      esteio.position.set(sx * (w / 2 - .5), 1.27, d / 2 + 1.1); esteio.castShadow = true; group.add(esteio);
    }
    const beiral = new THREE.Mesh(boxGeo(w + .7, .16, 1.5), MAT.roof);
    beiral.position.set(0, 2.85, d / 2 + 1.05); beiral.rotation.x = -.14; beiral.castShadow = true; group.add(beiral);
  }
  /* 8 casas, 3 ruas de terra ao redor da praça. A rotação de cada casa aponta a
     porta pro largo; a deriva de ±0.2 rad é a tortura de esquadro que o ORT1 cobra
     de mapa organico — vila de interior não nasce de esquadro. */
  const CASAS = [
    { x: -9.2, z: -25.5, ry: Math.PI + .12, v: 0 }, { x: 9.6, z: -26, ry: Math.PI - .17, v: 1 },   // rua de cima, atr´s da matriz
    { x: -17.2, z: -7, ry: Math.PI / 2 + .08, v: 2 }, { x: -17.6, z: 7.5, ry: Math.PI / 2 - .13, v: 0 }, // rua do lado oeste
    { x: 17.1, z: -7.4, ry: -Math.PI / 2 - .09, v: 1 }, { x: 17.5, z: 7, ry: -Math.PI / 2 + .15, v: 2 }, // rua do lado leste
    { x: -8.4, z: 24.2, ry: .14, v: 2 }, { x: 8.8, z: 24.7, ry: -.1, v: 0 },                       // rua de baixo
  ];
  CASAS.forEach((c, i) => {
    sertaoElement('casa', i, c.x, c.z, casaProxy, 'casa_pau_a_pique', 4.1 + (i % 3) * .28,
      [2.9, 3.9, 3.55], { ry: c.ry, variante: c.v, id: i, targetLen: 6.6 });
    /* Alpendre com colisor PRÓPRIO e fino (idioma dos bancos da palhoça e das
       varandas da r1): o corpo no meio dele é ejetado inteiro numa passada do
       _collide — no colisor grosso da casa o empurrão para a 0,38 do centro e a
       cláusula de colisão de alpendre morre (medido: push 0,38 vs ejeção).
       oz fica FORA da parede (casa vai até 3,55): colisor sobreposto ao da casa
       espreme o corpo entre os dois AABBs e a ejeção cai a 0,16 (medido). */
    const oz = 4.4, aw = 2.6, ad = .8;
    const cx = c.x + Math.sin(c.ry) * oz, cz = c.z + Math.cos(c.ry) * oz;
    const ca = Math.abs(Math.cos(c.ry)), sa = Math.abs(Math.sin(c.ry));
    colliders.push({ minX: cx - (ca * aw + sa * ad), maxX: cx + (ca * aw + sa * ad), minY: 0, maxY: 2.6,
      minZ: cz - (sa * aw + ca * ad), maxZ: cz + (sa * aw + ca * ad), tag: `varanda-casa-${i}` });
  });

  /* ── IGREJINHA DA MATRIZ — landmark da praça, porta pro sul (pro largo). Proxy:
     nave caiada, porta dupla, torre sineira com cruz. Molde: igrejinha.glb. */
  sertaoElement('igrejinha', 0, 0, -15.5, (group) => {
    const nave = new THREE.Mesh(boxGeo(6.4, 4, 8.2), MAT.paupiqueCaiado);
    nave.name = 'parede-igrejinha-0'; nave.position.y = 2; nave.castShadow = true; nave.receiveShadow = true; group.add(nave);
    for (const sx of [-1, 1]) {
      const agua = new THREE.Mesh(boxGeo(3.6, .3, 9), MAT.roof);
      agua.position.set(sx * 1.65, 4.15, 0); agua.rotation.z = sx * .2; agua.castShadow = true; group.add(agua);
    }
    const torre = new THREE.Mesh(boxGeo(2.3, 6.6, 2.3), MAT.paupiqueCaiado);
    torre.position.set(0, 3.3, 3.4); torre.castShadow = true; group.add(torre);
    const oculo = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .16, 12), MAT.windowVoid);
    oculo.rotation.x = Math.PI / 2; oculo.position.set(0, 5.4, 4.58); group.add(oculo);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.6, 4), MAT.roof);
    cone.position.set(0, 7.4, 3.4); cone.rotation.y = Math.PI / 4; cone.castShadow = true; group.add(cone);
    const cruzV = new THREE.Mesh(boxGeo(.12, .95, .12), MAT.dark); cruzV.position.set(0, 8.55, 3.4); group.add(cruzV);
    const cruzH = new THREE.Mesh(boxGeo(.55, .12, .12), MAT.dark); cruzH.position.set(0, 8.72, 3.4); group.add(cruzH);
    for (const sx of [-.75, .75]) {
      const porta = new THREE.Mesh(boxGeo(1.3, 2.6, .14), MAT.dark);
      porta.position.set(sx, 1.3, 4.12); group.add(porta);
    }
    const adro = new THREE.Mesh(boxGeo(8.6, .18, 2.2), MAT.pedra);
    adro.position.set(0, .09, 5.4); adro.receiveShadow = true; group.add(adro);
  }, 'igrejinha', 7.2, [4.4, 7.4, 6.7], { ry: 0, targetLen: 0 });

  /* ── CAMINHÃO ANTIGO estacionado na lateral leste — cover grande do mapa.
     Genérico anos 60 SEM marca (linha editorial: nada de marca real). O visual
     vive num sub-grupo deslocado para o CENTRO do colisor: capô de 4,9 m de
     bico a caçamba fora de um colisor simétrico era corpo dentro de sólido
     (MAP1 mediu 1,18 m de penetração antes do conserto). */
  sertaoElement('caminhao', 0, 24.6, -18.6, (group) => {
    const carroceria = new THREE.Group(); carroceria.position.z = -0.9; group.add(carroceria);
    const cabine = new THREE.Mesh(boxGeo(2.3, 1.75, 2.1), MAT.blue);
    cabine.position.set(0, 1.62, 2.35); cabine.castShadow = true; carroceria.add(cabine);
    const capo = new THREE.Mesh(boxGeo(2.15, .8, 1.5), MAT.blue);
    capo.position.set(0, 1.15, 4.05); capo.castShadow = true; carroceria.add(capo);
    const grade = new THREE.Mesh(boxGeo(1.9, .8, .18), MAT.metal);
    grade.position.set(0, 1.2, 4.83); carroceria.add(grade);
    const paraBrisa = new THREE.Mesh(boxGeo(2, .7, .12), MAT.glass);
    paraBrisa.position.set(0, 2, 3.28); paraBrisa.rotation.x = -.18; carroceria.add(paraBrisa);
    const cacamba = new THREE.Mesh(boxGeo(2.45, 1.15, 4.1), MAT.pale);
    cacamba.position.set(0, 1.85, -.95); cacamba.castShadow = true; carroceria.add(cacamba);
    for (const sx of [-1.28, 1.28]) {
      const lateral = new THREE.Mesh(boxGeo(.12, .55, 4.1), MAT.dark);
      lateral.position.set(sx, 2.65, -.95); carroceria.add(lateral);
    }
    const tampa = new THREE.Mesh(boxGeo(2.45, .1, 4.1), MAT.wood);
    tampa.position.set(0, 2.48, -.95); carroceria.add(tampa);
    for (const [wx, wz] of [[-1.15, 2.5], [1.15, 2.5], [-1.2, -1.5], [1.2, -1.5]]) {
      const roda = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .4, 14), MAT.black);
      roda.rotation.z = Math.PI / 2; roda.position.set(wx, .62, wz); roda.castShadow = true; carroceria.add(roda);
      const calota = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .44, 10), MAT.metal);
      calota.rotation.z = Math.PI / 2; calota.position.set(wx, .62, wz); carroceria.add(calota);
    }
    const estepe = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, .36, 12), MAT.black);
    estepe.rotation.z = Math.PI / 2; estepe.position.set(0, 1.35, -3.15); carroceria.add(estepe);
  }, 'caminhao_antigo', 2.9, [1.55, 2.9, 3.45], { ry: .14, targetLen: 6.8 });
  const mandacaruProxy = (scale, light) => (group) => {
    const material = light ? MAT.cactusLight : MAT.cactus;
    const trunk = new THREE.Mesh(cylGeo(.38 * scale, 3.8 * scale, 10), material); trunk.position.y = 3.8 * scale / 2; trunk.castShadow = true; group.add(trunk);
    for (const dir of [-1, 1]) {
      const arm = new THREE.Mesh(cylGeo(.22 * scale, 1.5 * scale, 9), material); arm.position.set(dir * .65 * scale, 1.35 * scale + .75 * scale, 0); arm.castShadow = true; group.add(arm);
      const elbow = new THREE.Mesh(cylGeo(.2 * scale, .85 * scale, 9), material); elbow.rotation.z = Math.PI / 2; elbow.position.set(dir * .35 * scale, 1.25 * scale + .425 * scale, 0); elbow.castShadow = true; group.add(elbow);
    }
  };
  /* Caatinga DENSA (r2): "mata branca" espinhosa, não deserto de faroeste — o dono
     pediu leitura de CATINGA. Mandacaru em moitas, xique-xique em touceira,
     juazeiro tortuoso e macambira fechando as faixas além do casario. */
  [[-21,-39,1],[22,-38,.8],[-22,-20,.7],[23,1,1],[-21,18,.9],[22,41,1.1],[17,24,.65],[-18,40,.7],
   [-28,-33,1.2],[28,-30,.9],[-29,-10,.75],[29,-24,1],[-28,6,1.05],[29,12,.8],[-27,30,.95],[28,34,.7],
   [-25.5,-22,.85],[25.5,20,1],[-19,-44,.9],[14,-40,.75]].forEach((p, i) =>
    sertaoElement('mandacaru', i, p[0], p[1], mandacaruProxy(p[2], i % 2), 'sertao_mandacaru', 3.8 * p[2] + .5, [.38 * p[2], 3.8 * p[2], .38 * p[2]]));
  const macambiraProxy = (group) => {
    const material = new THREE.MeshStandardMaterial({ color: 0x93a06b, map: TX.cactus, bumpMap: TX.cactus, bumpScale: .06, roughness: 1 });
    for (let i = 0; i < 10; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(.09, 1.05 + (i % 3) * .22, 5), material);
      const a = i / 10 * Math.PI * 2;
      leaf.position.set(Math.cos(a) * .26, .5, Math.sin(a) * .26);
      leaf.rotation.set(Math.sin(a) * .55, 0, -Math.cos(a) * .55);
      leaf.castShadow = true; group.add(leaf);
    }
  };
  [[-19.5, -36], [-24, 6], [19.5, -3], [25, 26], [-27.5, -25], [15.5, 30]].forEach((p, i) =>
    sertaoElement('macambira', i, p[0], p[1], macambiraProxy, 'sertao_macambira', 1.15, [.55, 1.25, .55]));
  const juazeiroProxy = (group) => {
    const bark = new THREE.MeshStandardMaterial({ color: 0x9c8a72, map: TX.wood, bumpMap: TX.wood, bumpScale: .07, roughness: 1 });
    const trunk = new THREE.Mesh(cylGeo(.3, 3.2, 8), bark); trunk.position.y = 1.6; trunk.rotation.z = .07; trunk.castShadow = true; group.add(trunk);
    for (const [ax, az, ay, len, tilt] of [[-.9, .5, 3.1, 1.9, .75], [.8, -.6, 3.2, 2.2, -.7], [.2, .9, 3.4, 1.6, .35], [-.4, -.9, 3.5, 1.4, -.3]]) {
      const branch = new THREE.Mesh(cylGeo(.12, len, 6), bark);
      branch.position.set(ax * .5, ay + len * .35, az * .5);
      branch.rotation.set(az * tilt, 0, -ax * tilt);
      branch.castShadow = true; group.add(branch);
    }
    /* juazeiro é das poucas folhas que ficam na caatinga seca (Wikipédia "Juazeiro"):
       copa verde-clara miúda por cima dos ramos tortuosos. */
    const folha = new THREE.MeshStandardMaterial({ color: 0x8fae6f, roughness: 1 });
    for (let i = 0; i < 5; i++) {
      const tufo = new THREE.Mesh(new THREE.SphereGeometry(.62, 7, 5), folha);
      tufo.scale.set(1, .62, 1);
      tufo.position.set(Math.sin(i * 2.1) * .9, 3.9 + (i % 3) * .3, Math.cos(i * 1.7) * .9);
      tufo.castShadow = true; group.add(tufo);
    }
  };
  [[-25.5, -13], [25.5, 14], [-20.5, 34], [27, -8]].forEach((p, i) =>
    sertaoElement('juazeiro', i, p[0], p[1], juazeiroProxy, 'sertao_juazeiro', 4.6, [.3, 3.2, .3]));
  const xiqueProxy = (group) => {
    const material = new THREE.MeshStandardMaterial({ color: 0x5e7d5a, map: TX.cactus, bumpMap: TX.cactus, bumpScale: .05, roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const stem = new THREE.Mesh(cylGeo(.07, 1.6 + (i % 3) * .3, 6), material);
      stem.position.set(Math.cos(i / 7 * Math.PI * 2) * .22, (1.6 + (i % 3) * .3) / 2, Math.sin(i / 7 * Math.PI * 2) * .22);
      stem.castShadow = true; group.add(stem);
    }
  };
  [[-27, -31], [27.5, 3], [-27, 38], [24, -33], [-15.5, -40], [20.5, 8]].forEach((p, i) =>
    sertaoElement('xique', i, p[0], p[1], xiqueProxy, 'sertao_xique_xique', 2.1, [.4, 1.9, .4]));

  /* Pedras de granito; colisor cobre o footprint do visual — menor que a malha
     é o "anel atravessável" que o MAP1 pega. O lagarto baska em duas delas. */
  const pedras = [[26.5, -25, 1.5, 1.1], [-26.5, -27, 1.2, .9], [26, 36, 1.7, 1.25], [-25, 25, 1.1, .8], [20, -12.5, .9, .65]];
  pedras.forEach((p, i) => sertaoElement('pedra', i, p[0], p[1], (group) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(p[2], 0), MAT.pedra);
    rock.scale.set(1, p[3] / p[2], .82); rock.position.y = p[3] * .42; rock.rotation.y = i * 1.3;
    rock.castShadow = true; rock.receiveShadow = true; group.add(rock);
  }, null, 0, [p[2], p[3] * 1.42, p[2] * .82]));
  function lagarto(i, pedraIdx) {
    const [px, pz, , ph] = pedras[pedraIdx];
    const group = new THREE.Group(); group.name = `sertao-lagarto-${i}`; group.position.set(px, ph * 1.1, pz); root.add(group);
    const glb = GLB_ON ? placeFauna('lagarto', { x: px, y: ph * 1.1, z: pz, targetLen: .3 }) : null;
    if (glb) { root.add(glb); return group; }
    const skin = new THREE.MeshStandardMaterial({ color: 0x8d7a5f, roughness: .9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), skin); body.scale.set(.7, .55, 1.5); body.position.y = .05; group.add(body);
    const head = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 6), skin); head.rotation.x = Math.PI / 2; head.position.set(0, .05, .17); group.add(head);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.035, .18, 5), skin); tail.rotation.x = -Math.PI / 2; tail.position.set(0, .04, -.18); group.add(tail);
    return group;
  }
  lagarto(0, 0); lagarto(1, 2);

  /* ── MARCOS DE SERTÃO ─────────────────────────────────────────────────── */
  const pedraMat = MAT.pedra;
  sertaoElement('poco', 0, -22, -16, (group) => {
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const stone = new THREE.Mesh(boxGeo(.8, 1.0, .42), pedraMat);
      stone.position.set(Math.cos(a) * 1.05, .5, Math.sin(a) * 1.05); stone.rotation.y = -a + Math.PI / 2;
      stone.castShadow = true; stone.receiveShadow = true; group.add(stone);
    }
    for (const sx of [-.85, .85]) {
      const post = new THREE.Mesh(boxGeo(.18, 2.3, .18), MAT.dark); post.position.set(sx, 1.15, 0); post.castShadow = true; group.add(post);
    }
    const beam = new THREE.Mesh(boxGeo(2.1, .16, .16), MAT.dark); beam.position.set(0, 2.25, 0); beam.castShadow = true; group.add(beam);
    const rope = new THREE.Mesh(cylGeo(.025, 1.1, 4), MAT.black); rope.position.set(.35, 1.7, 0); group.add(rope);
    const bucket = new THREE.Mesh(cylGeo(.22, .35, 8), MAT.wood); bucket.position.set(.35, 1.1, 0); bucket.castShadow = true; group.add(bucket);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.85, .09, 6, 14), MAT.dark);
    wheel.position.set(-1.35, .9, 0); wheel.rotation.y = Math.PI / 2; wheel.castShadow = true; group.add(wheel);
    const wheelSpokes = new THREE.Group(); wheelSpokes.position.copy(wheel.position);
    for (let i = 0; i < 6; i++) { const spoke = new THREE.Mesh(boxGeo(.06, 1.6, .06), MAT.dark); spoke.rotation.z = i * Math.PI / 6; wheelSpokes.add(spoke); }
    group.add(wheelSpokes);
  }, 'sertao_poco_roda', 3.1, [1.6, 2.4, 1.5]);

  sertaoElement('capelinha', 0, 22.5, 30, (group) => {
    const corpo = new THREE.Mesh(boxGeo(2.4, 2.2, 2.4), MAT.adobeCaiado); corpo.position.y = 1.1; corpo.castShadow = true; corpo.receiveShadow = true; group.add(corpo);
    const frontao = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.1, 4), MAT.roof); frontao.position.y = 2.75; frontao.rotation.y = Math.PI / 4; frontao.castShadow = true; group.add(frontao);
    const porta = new THREE.Mesh(boxGeo(.8, 1.5, .12), MAT.dark); porta.position.set(0, .75, 1.22); group.add(porta);
    const janela = new THREE.Mesh(boxGeo(.5, .5, .1), MAT.windowVoid); janela.position.set(0, 1.6, 1.22); group.add(janela);
    const cruzV = new THREE.Mesh(boxGeo(.1, .7, .1), MAT.dark); cruzV.position.set(0, 3.6, 0); group.add(cruzV);
    const cruzH = new THREE.Mesh(boxGeo(.42, .1, .1), MAT.dark); cruzH.position.set(0, 3.72, 0); group.add(cruzH);
  }, 'sertao_capelinha', 3.4, [1.3, 2.4, 1.3]);

  sertaoElement('palhoca', 0, -22, 20, (group) => {
    const piso = new THREE.Mesh(boxGeo(9, .14, 7), MAT.pale); piso.position.y = .07; piso.receiveShadow = true; group.add(piso);
    const palco = new THREE.Mesh(boxGeo(3.6, .55, 2.2), MAT.wood); palco.position.set(0, .14 + .275, 0); palco.castShadow = true; group.add(palco);
    for (const px of [-1.55, 1.55]) for (const pz of [-.6, .6]) {
      const poste = new THREE.Mesh(boxGeo(.16, 2.9, .16), MAT.dark); poste.position.set(px, .69 + 1.45, pz); poste.castShadow = true; group.add(poste);
    }
    const telhadoPalha = new THREE.Mesh(new THREE.ConeGeometry(3.1, 1.15, 4), MAT.hay);
    telhadoPalha.position.set(0, 3.55, 0); telhadoPalha.rotation.y = Math.PI / 4; telhadoPalha.castShadow = true; group.add(telhadoPalha);
    for (let i = 0; i < 7; i++) {
      const bandeirola = new THREE.Mesh(new THREE.PlaneGeometry(.22, .3), new THREE.MeshStandardMaterial({ color: [0xc23b4e, 0x2f7fbf, 0xd9a521, 0x3f9455][i % 4], side: THREE.DoubleSide, roughness: .8 }));
      const fx = -3.9 + i * 1.3;
      bandeirola.position.set(fx, 2.45, 3.3); bandeirola.rotation.z = .18; group.add(bandeirola);
      if (i < 6) { const corda = new THREE.Mesh(boxGeo(1.3, .02, .02), MAT.black); corda.position.set(fx + .65, 2.55, 3.3); group.add(corda); }
    }
    for (const bx of [-3.4, 3.4]) {
      const banco = new THREE.Mesh(boxGeo(1.8, .1, .45), MAT.pale); banco.position.set(bx, .14 + .42, 1.6); banco.castShadow = true; group.add(banco);
      for (const lx of [bx - .75, bx + .75]) { const perna = new THREE.Mesh(boxGeo(.12, .42, .4), MAT.dark); perna.position.set(lx, .14 + .21, 1.6); group.add(perna); }
    }
    const caixa = GLB_ON && hasProp('caixa_som_baile') ? placeProp('caixa_som_baile', { x: -22, z: 19.6, y: .69, targetH: 1.05 }) : null;
    if (caixa) root.add(caixa);
    else { const caixaProxy = new THREE.Mesh(boxGeo(1.0, .95, .6), MAT.black); caixaProxy.position.set(0, .69 + .475, -.4); caixaProxy.castShadow = true; group.add(caixaProxy); }
  }, 'sertao_palhoca_forro', 4.4, [1.9, .95, .85]);
  /* bancos da quadra: colisor próprio — topo .66 m é cover de corpo agachado,
     atravessá-lo é o mesmo defeito do palco (MAP1). */
  for (const bx of [-25.4, -18.6]) {
    colliders.push({ minX: bx - .9, maxX: bx + .9, minY: 0, maxY: .66, minZ: 21.6 - .225, maxZ: 21.6 + .225 });
  }

  function placaDistancias() {
    const group = new THREE.Group(); group.name = 'sertao-placa-0'; group.position.set(-13.5, 0, 1.8); root.add(group);
    const poste1 = new THREE.Mesh(boxGeo(.2, 3.4, .2), MAT.dark); poste1.position.set(-2.1, 1.7, 0); poste1.castShadow = true; group.add(poste1);
    const poste2 = new THREE.Mesh(boxGeo(.2, 2.7, .2), MAT.dark); poste2.position.set(2.1, 1.35, 0); poste2.castShadow = true; group.add(poste2);
    const c = document.createElement('canvas'); c.width = 512; c.height = 170; const x = c.getContext('2d');
    x.fillStyle = '#7a5a33'; x.fillRect(0, 0, 512, 170);
    for (let i = 0; i < 260; i++) { const v = 70 + (i * 37 % 50); x.fillStyle = `rgba(${v + 60},${v + 30},${v},${.2})`; x.fillRect((i * 89) % 512, (i * 53) % 170, 2, 2); }
    x.textAlign = 'left'; x.fillStyle = '#2e1c0c'; x.font = 'bold 40px Georgia,serif';
    x.fillText('SÃO PAULO  3.022 km', 26, 62);
    x.font = 'bold 40px Georgia,serif'; x.fillText('FORTALEZA  789 km', 26, 116);
    x.textAlign = 'right'; x.fillStyle = '#5a2e14'; x.font = '900 52px Georgia,serif';
    x.fillText('TRETA 0 km', 486, 150);
    x.strokeStyle = '#3d2812'; x.lineWidth = 8; x.strokeRect(6, 6, 500, 158);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.name = 'oeste-placa-distancias';
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.55), new THREE.MeshStandardMaterial({ map: t, roughness: .9 }));
    placa.position.set(0, 2.55, .12); group.add(placa);
    const seta = new THREE.Mesh(new THREE.ConeGeometry(.5, .9, 3), new THREE.MeshStandardMaterial({ color: 0x6b4a26, roughness: .95 }));
    seta.rotation.z = -Math.PI / 2; seta.position.set(3.1, 2.55, 0); seta.castShadow = true; group.add(seta);
    colliders.push({ minX: -15.8, maxX: -15.4, minY: 0, maxY: 3.4, minZ: 1.6, maxZ: 2.0 });
    colliders.push({ minX: -11.6, maxX: -11.2, minY: 0, maxY: 2.7, minZ: 1.6, maxZ: 2.0 });
    return group;
  }
  placaDistancias();

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

  // Miolo da praça: mobiliário de largo de interior — bebedouro de gado, banca de
  // feira, amarra de montaria (vaquejada), barricada, barril d'água, fardos de palha.
  obstacle('bebedouro', -8, 1, .08, 2.25, .85, 1.05, (part) => {
    part(4.5, .28, 1.7, MAT.dark, 0, 0, 0); part(4.15, .55, .16, MAT.pale, 0, .28, -.75); part(4.15, .55, .16, MAT.pale, 0, .28, .75);
    for (const px of [-2.05, 2.05]) part(.16, .55, 1.35, MAT.pale, px, .28, 0);
    part(3.8, .04, 1.15, MAT.glass, 0, .31, 0); for (const px of [-1.65, 1.65]) part(.18, .5, .18, MAT.dark, px, 0, 0);
  });
  obstacle('caixas-feira', -3, 9, -.12, 1.45, 1.1, 1.75, (part, cylinder) => {
    part(1.8, 1.05, 1.55, MAT.pale, -.45, 0, 0); part(1.35, .85, 1.35, MAT.wood, .65, 1.02, .05);
    for (const pz of [-.42, 0, .42]) cylinder(.16, .35, MAT.red, .65 + (pz === 0 ? .3 : -.1), 1.44, pz, { rz: Math.PI / 2, segments: 9 });
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

  const groundHeightAt = () => 0;
  const slowAt = () => false;
  const bounds = { minX: -HALF_X + .8, maxX: HALF_X - .8, minZ: -HALF_Z + .8, maxZ: HALF_Z - .8 };
  const blocked = (x, z, inflate = .45) => colliders.some(c => x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.7 && c.maxY > .1);
  const nodes = [], adj = [], step = 3.4;
  for (let x = bounds.minX + 1; x <= bounds.maxX - 1; x += step) for (let z = bounds.minZ + 1; z <= bounds.maxZ - 1; z += step) if (!blocked(x, z)) nodes.push({ x, z });
  for (let i = 0; i < nodes.length; i++) adj.push([]);
  const clear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6; if (blocked(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, .25)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz <= step * step * 2.25 && clear(nodes[i], nodes[j])) { adj[i].push(j); adj[j].push(i); } }
  /* Poda de ilhados (MC3): colliders do retheme cercaram células que o grid
     ainda gera; só o maior componente sobrevive — ilha não é pathfinding. */
  {
    const visto = new Uint8Array(nodes.length); let maior = [];
    for (let i = 0; i < nodes.length; i++) {
      if (visto[i]) continue;
      const comp = []; const fila = [i]; visto[i] = 1;
      while (fila.length) { const n = fila.pop(); comp.push(n); for (const m of adj[n]) if (!visto[m]) { visto[m] = 1; fila.push(m); } }
      if (comp.length > maior.length) maior = comp;
    }
    const mapa = new Int16Array(nodes.length).fill(-1);
    maior.forEach((velho, novo) => { mapa[velho] = novo; });
    const novosNodes = maior.map((velho) => nodes[velho]);
    const novasAdj = maior.map(v => adj[v].map(m => mapa[m]).filter(m => m >= 0));
    nodes.length = 0; nodes.push(...novosNodes);
    adj.length = 0; adj.push(...novasAdj);
  }
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

  /* BUG-57 + r2: o arraial tem ave de poleiro (palhoça e capelinha), galinha de
     capoeira, rato de armazém, rolinha no terreiro e CALANGO correndo em rajadas
     entre as pedras (pedras 0↔4 a leste, 2↔3 pelo sul — o bicho é de pedreira). */
  const ambience = createFavelaAmbience(root, {
    map: 'velho_oeste',
    rats: [
      { pos: [-16, 0, -34], to: [-13.5, 0, -31.5], phase: .3 },
      { pos: [16, 0, 34], to: [13.5, 0, 31.5], phase: 1.5 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-8, 0, -6], phase: .5 }, { mode: 'ground', pos: [4, 0, 14], phase: 1.4 },
      { mode: 'ground', pos: [-6.8, 0, -5], phase: .9 },
    ],
    chickens: [
      { pos: [14.5, 0, 24], to: [16.5, 0, 26], phase: .2 }, { pos: [-14, 0, 28], to: [-12, 0, 30], phase: 1.1 },
      { pos: [12, 0, 33], to: [14, 0, 35], phase: 2 },
    ],
    parrots: [
      { pos: [-21, 3.4, 17.8], phase: .4 }, { pos: [22.5, 2.9, 28.9], phase: 1.8 },
    ],
    calangos: [
      { pos: [19.5, 0, -21], to: [20.5, 0, -14.5], phase: .2 },
      { pos: [25, 0, 33], to: [21, 0, 29], phase: 1.6 },
      { pos: [-23.5, 0, 23], to: [-20, 0, 27], phase: 2.7 },
    ],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.vento,pos:[0,3,0],radius:70,vol:.34},{src:AMB_LOOPS.passaros,pos:[0,3,0],radius:70,vol:.22},{src:AMB_LOOPS.sanfona,pos:[-22,2.6,19.6],radius:26,vol:.4}],bioma:'campo'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, pickups, sun, update,
    spawns: {
      E: [-12, -4, 4, 12].map(x => ({ x, z: -41, yaw: 0 })),
      B: [12, 4, -4, -12].map(x => ({ x, z: 41, yaw: Math.PI })),
    },
    ctfPoints: [
      { id: 'E', label: 'ADRO', x: -12, z: -34 },
      { id: 'MID', label: 'PRAÇA DA MATRIZ', x: 0, z: 2 },
      { id: 'B', label: 'FORRÓ', x: 12, z: 34 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath, bounds,
  };
}
