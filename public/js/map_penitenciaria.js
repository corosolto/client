// Penitenciária da Treta: pátio central exposto, celas transitáveis e flancos de serviço.
// Rebuild USANTOS (25/08/2026): reboco, holofotes, varandas, hélice de arame — ver eval:penitenciariavida.
import * as THREE from 'three';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';
import { applyLook } from './map_sky.js';
import { placeProp } from './mapprops.js';

const HALF_X = 38;
const HALF_Z = 48;

/* Subset da fauna que o main.js pré-carrega para este mapa (maps.js ambience). */
export const PENITENCIARIA_AMBIENCE = ['rat', 'pigeonGround'];
export const PENITENCIARIA_PROPS = ['torre_vigilancia'];

export function buildPenitenciaria(scene, T) {
  const root = new THREE.Group();
  root.name = 'penitenciaria-da-treta';
  scene.add(root);
  const colliders = [], occluders = [], pickups = [];
  const geometryCache = new Map();
  const boxGeo = (w, h, d) => {
    const key = `b:${w}:${h}:${d}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.BoxGeometry(w, h, d));
    return geometryCache.get(key);
  };
  const cylGeo = (r, h, segments = 12) => {
    const key = `c:${r}:${h}:${segments}`;
    if (!geometryCache.has(key)) geometryCache.set(key, new THREE.CylinderGeometry(r, r, h, segments));
    return geometryCache.get(key);
  };

  /* Texturas medidas em node: DataTexture pixel-a-pixel (idioma texProcedural da
     mansão). Canvas é stub no harness — textura que a régua mede nasce aqui. */
  const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function valueNoise(S, cells, seed) {
    const rand = lcg(seed), g = [];
    for (let y = 0; y <= cells; y++) { g[y] = []; for (let x = 0; x <= cells; x++) g[y][x] = rand(); }
    for (let i = 0; i <= cells; i++) { g[i][cells] = g[i][0]; g[cells][i] = g[0][i]; }
    return (x, y) => {
      const fx = (x / S) * cells, fy = (y / S) * cells;
      const ix = Math.min(cells - 1, Math.floor(fx)), iy = Math.min(cells - 1, Math.floor(fy));
      const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[iy][ix], b = g[iy][ix + 1], c = g[iy + 1][ix], d = g[iy + 1][ix + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }
  function dataTex(name, S, fn, repeatX = 1, repeatY = 1) {
    const data = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) data.set([...fn(x, y), 255], (y * S + x) * 4);
    const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    t.name = name; t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY);
    t.anisotropy = 8; t.needsUpdate = true; return t;
  }
  /* Reboco creme descascando: manchas de value-noise abrem o concreto e, nas fundas,
     o tijolo; borda escura no contorno da placa; fiadas de fôrma a cada 32 px;
     umidade escurecendo a base (faixa y<64 — a NV1 mede o gradiente). */
  function texturaReboco() {
    const S = 256, mancha = valueNoise(S, 6, 1977), trecho = valueNoise(S, 3, 5551), grao = valueNoise(S, 28, 3313);
    return dataTex('penitenciaria-reboco-descascado', S, (x, y) => {
      /* trecho (oitava grossa) desloca o limiar: uns panos do muro descascam
         quase inteiros, outros ficam quase intactos — muro uniforme é low poly. */
      const n = mancha(x, y) + (trecho(x, y) - .5) * .22, g = (grao(x, y) - .5) * 18;
      let r, gg, b;
      if (n > .68) {                       // tijolo aparente no fundo da placa caída
        const linha = y % 8 < 1, desloca = (Math.floor(y / 8) % 2) * 6;
        const junta = linha || (x + desloca) % 13 < 1;
        const t = junta ? 148 : 118 + g;
        r = t; gg = junta ? 140 : t * .66; b = junta ? 128 : t * .5;
      } else if (n > .575) {               // concreto do substrato
        const c = 146 + g * 1.2; r = c; gg = c - 5; b = c - 13;
      } else if (n > .54) {                // sombra da borda da placa de reboco
        const c = 118 + g; r = c; gg = c - 4; b = c - 12;
      } else {                             // reboco creme
        const c = 204 + g; r = c; gg = c - 7; b = c - 24;
      }
      if (y % 32 < 2 && n <= .54) { r -= 16; gg -= 16; b -= 14; }   // fiada de fôrma
      if (y < 64) {                        // umidade subindo da base
        const u = (64 - y) / 64, f = 1 - .34 * u;
        r = r * f - 6 * u; gg *= f; b = b * f - 10 * u;
      }
      return [r, gg, b].map((v) => Math.max(0, Math.min(255, Math.round(v))));
    }, 12, 1);
  }
  const texturaGalvanizado = () => dataTex('penitenciaria-metal-galvanizado', 128, (x, y) => {
    const vago = valueNoise(128, 10, 771)(x, y), c = 148 + (vago - .5) * 26 + (x % 16 < 1 ? -22 : 0);
    return [c - 4, c, c + 4].map((v) => Math.max(0, Math.min(255, Math.round(v))));
  }, 4, 4);
  const texturaArame = () => dataTex('penitenciaria-arame-farpado', 64, (x, y) => {
    const farpa = (x + y * 2) % 16 < 3, c = farpa ? 132 : 74 + ((x * 7 + y * 13) % 9) * 3;
    return [c, c * .62, c * .42].map((v) => Math.max(0, Math.min(255, Math.round(v))));
  }, 160, 2);
  const texturaGrade = () => dataTex('penitenciaria-grade-cela', 128, (x, y) => {
    const barra = x % 16 < 3 || y % 42 < 4, c = barra ? 128 + ((x + y) % 5) * 4 : 16 + ((x * 3 + y * 7) % 4) * 2;
    return barra ? [c - 6, c, c + 4] : [c, c + 2, c + 4];
  }, 1, 1);
  const texturaTijolo = () => dataTex('penitenciaria-tijolo-aparente', 128, (x, y) => {
    const linha = y % 16 < 2, desloca = (Math.floor(y / 16) % 2) * 16;
    const junta = linha || (x + desloca) % 32 < 2;
    const tom = ((Math.floor(x / 32) * 5 + Math.floor(y / 16) * 3) % 5 - 2) * 6 + ((x * 11 + y * 17) % 7) - 3;
    return junta ? [142 + tom, 134 + tom, 122 + tom] : [120 + tom, 76 + tom * .7, 58 + tom * .5];
  }, 10, 2);
  const texturaPoca = () => dataTex('penitenciaria-poca', 64, (x, y) => {
    const c = 22 + valueNoise(64, 8, 99)(x, y) * 14;
    return [c * .8, c * .95, c * 1.25].map((v) => Math.round(v));
  }, 1, 1);
  const texturaCaixaDagua = () => dataTex('penitenciaria-caixa-dagua', 128, (x, y) => {
    const faixa = y % 32 < 3, escorrido = valueNoise(128, 12, 551)(x, y) > .78;
    const c = 92 + ((x * 5 + y * 3) % 7) * 2;
    return faixa || escorrido ? [c * .8, c * .62, c * .4].map(Math.round) : [c * .75, c * .85, c * .95].map(Math.round);
  }, 2, 1);
  const texturaMesa = () => dataTex('penitenciaria-mesa-inox', 128, (x, y) => {
    const c = 156 + (valueNoise(128, 20, 881)(x, y) - .5) * 22 + (y % 64 < 2 ? -30 : 0);
    return [c - 6, c - 2, c + 2].map((v) => Math.max(0, Math.min(255, Math.round(v))));
  }, 2, 1);
  const texturaPatio = () => {
    const S = 256, mancha = valueNoise(S, 5, 4242), grao = valueNoise(S, 30, 777);
    return dataTex('penitenciaria-patio-concreto-gasto', S, (x, y) => {
      const junta = x % 64 < 2 || y % 64 < 2;
      let c = junta ? 52 : 84 + (grao(x, y) - .5) * 20;
      if (mancha(x, y) > .68) c -= 14;
      return [c, c + 2, c].map((v) => Math.max(0, Math.min(255, Math.round(v))));
    }, 8, 8);
  };

  function proceduralTexture(name, base, detail, mode, repeatX = 4, repeatY = repeatX) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
    let seed = [...name].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 1977);
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    if (mode === 'concrete') {
      for (let i = 0; i < 700; i++) { const a = .025 + rand() * .08; ctx.fillStyle = rand() > .5 ? `rgba(255,255,255,${a})` : `rgba(15,20,22,${a})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 3, 1 + rand() * 2); }
      ctx.strokeStyle = detail; ctx.globalAlpha = .25; for (let y = 32; y < 128; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
      ctx.globalAlpha = .42; ctx.lineWidth = .8;
      for (let i = 0; i < 9; i++) { let x = rand()*128, y = rand()*128; ctx.beginPath(); ctx.moveTo(x,y); for (let j=0;j<4;j++){x+=rand()*18-9;y+=rand()*15;ctx.lineTo(x,y);} ctx.stroke(); }
      ctx.globalAlpha = .12; for (let i=0;i<18;i++){ctx.fillStyle=rand()>.5?'#28332c':'#141716';ctx.beginPath();ctx.ellipse(rand()*128,rand()*128,3+rand()*13,1+rand()*5,rand()*Math.PI,0,Math.PI*2);ctx.fill();}
    } else if (mode === 'metal') {
      const gradient = ctx.createLinearGradient(0, 0, 128, 0); gradient.addColorStop(0, base); gradient.addColorStop(.45, detail); gradient.addColorStop(.55, base); gradient.addColorStop(1, detail); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(92,45,23,${.08 + rand() * .2})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 8, 1 + rand() * 3); }
    } else {
      for (let i = 0; i < 500; i++) { ctx.fillStyle = `rgba(30,22,12,${.025 + rand() * .09})`; ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 4, 1 + rand() * 4); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.name = name; texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeatX, repeatY); texture.anisotropy = 8; return texture;
  }
  function ammoCrateTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#58613d'); gradient.addColorStop(.52, '#73764b'); gradient.addColorStop(1, '#353d2a');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
    let seed = 1977; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = 'rgba(20,25,16,.32)';
    for (let i=0;i<170;i++) ctx.fillRect(rand()*256,rand()*256,1+rand()*9,1+rand()*3);
    ctx.strokeStyle = '#242a1c'; ctx.lineWidth = 11; ctx.strokeRect(8,8,240,240);
    ctx.strokeStyle = '#a39d6a'; ctx.lineWidth = 3; ctx.strokeRect(20,20,216,216);
    for (const y of [52,204]) { ctx.fillStyle='#252b1d'; ctx.fillRect(0,y,256,10); ctx.fillStyle='rgba(190,182,116,.45)'; ctx.fillRect(0,y+2,256,2); }
    ctx.fillStyle='rgba(25,29,20,.78)'; ctx.fillRect(31,82,194,96);
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#d6cc86';
    ctx.font='900 38px Arial,sans-serif'; ctx.fillText('MUNIÇÃO',128,112);
    ctx.font='bold 17px Arial,sans-serif'; ctx.fillText('7.62 MM · 120 CART.',128,151);
    for (const x of [48,208]) { ctx.fillStyle='#b39943'; ctx.fillRect(x-5,188,10,29); ctx.fillStyle='#d5bf68'; ctx.beginPath(); ctx.arc(x,188,5,Math.PI,0); ctx.fill(); }
    const texture = new THREE.CanvasTexture(canvas); texture.name='penitenciaria-caixa-municao'; texture.colorSpace=THREE.SRGBColorSpace;
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping; texture.anisotropy=8; return texture;
  }
  const tex = {
    concrete: proceduralTexture('penitenciaria-concreto', '#777b78', '#343936', 'concrete', 6),
    darkConcrete: proceduralTexture('penitenciaria-concreto-escuro', '#343a3b', '#15191a', 'concrete', 5),
    yard: texturaPatio(),
    steel: proceduralTexture('penitenciaria-aco-enferrujado', '#565d5e', '#8b6b49', 'metal', 3),
    ammo: ammoCrateTexture(),
    reboco: texturaReboco(),
    galvanizado: texturaGalvanizado(),
    arame: texturaArame(),
    grade: texturaGrade(),
    tijolo: texturaTijolo(),
    poca: texturaPoca(),
    caixaDagua: texturaCaixaDagua(),
    mesa: texturaMesa(),
  };
  const MAT = {
    concrete: new THREE.MeshStandardMaterial({ map: tex.concrete, bumpMap: tex.concrete, bumpScale: .045, color: 0xb8bbb5, roughness: .93 }),
    darkConcrete: new THREE.MeshStandardMaterial({ map: tex.darkConcrete, bumpMap: tex.darkConcrete, bumpScale: .035, color: 0x747b7b, roughness: .97 }),
    yard: new THREE.MeshStandardMaterial({ map: tex.yard, bumpMap: tex.yard, bumpScale: .055, color: 0x8b8f89, roughness: 1 }),
    steel: new THREE.MeshStandardMaterial({ map: tex.steel, bumpMap: tex.steel, bumpScale: .025, color: 0x8a9292, metalness: .72, roughness: .5 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x714529, metalness: .42, roughness: .82 }),
    white: new THREE.MeshStandardMaterial({ map: tex.concrete, bumpMap: tex.concrete, bumpScale: .025, color: 0xe6e2cf, roughness: .75 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe5a92f, roughness: .7 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb42d25, roughness: .65 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x173f79, roughness: .5 }),
    black: new THREE.MeshStandardMaterial({ color: 0x111519, roughness: .66 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x8fb2c0, roughness: .2, metalness: .1, transparent: true, opacity: .68 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: .96 }),
    grass: new THREE.MeshStandardMaterial({ color: 0x52643c, roughness: 1 }),
    ammo: new THREE.MeshStandardMaterial({ map: tex.ammo, bumpMap: tex.ammo, bumpScale: .035, color: 0xffffff, roughness: .76, metalness: .18 }),
    reboco: new THREE.MeshStandardMaterial({ map: tex.reboco, bumpMap: tex.reboco, bumpScale: .06, color: 0xcfc8ba, roughness: .9 }),
    galvanizado: new THREE.MeshStandardMaterial({ map: tex.galvanizado, bumpMap: tex.galvanizado, bumpScale: .02, color: 0xb9c0c4, metalness: .68, roughness: .44 }),
    arame: new THREE.MeshStandardMaterial({ map: tex.arame, color: 0x9a7a5c, metalness: .55, roughness: .6 }),
    grade: new THREE.MeshStandardMaterial({ map: tex.grade, color: 0xaab2b6, metalness: .6, roughness: .5 }),
    tijolo: new THREE.MeshStandardMaterial({ map: tex.tijolo, bumpMap: tex.tijolo, bumpScale: .05, color: 0xbd9e88, roughness: .92 }),
    poca: new THREE.MeshStandardMaterial({ map: tex.poca, color: 0x39434e, metalness: .4, roughness: .07 }),
    caixaDagua: new THREE.MeshStandardMaterial({ map: tex.caixaDagua, bumpMap: tex.caixaDagua, bumpScale: .03, color: 0x9fb2bd, metalness: .35, roughness: .6 }),
    mesa: new THREE.MeshStandardMaterial({ map: tex.mesa, bumpMap: tex.mesa, bumpScale: .015, color: 0xc4c9cc, metalness: .7, roughness: .38 }),
  };
  function addBox(w, h, d, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d), material); mesh.position.set(x, y + h / 2, z);
    if (opts.ry) mesh.rotation.y = opts.ry; if (opts.rx) mesh.rotation.x = opts.rx; if (opts.rz) mesh.rotation.z = opts.rz;
    mesh.castShadow = opts.cast !== false; mesh.receiveShadow = true; if (opts.name) mesh.name = opts.name; root.add(mesh);
    if (opts.collide !== false) {
      const hx = Math.abs(Math.cos(opts.ry || 0)) * w / 2 + Math.abs(Math.sin(opts.ry || 0)) * d / 2;
      const hz = Math.abs(Math.sin(opts.ry || 0)) * w / 2 + Math.abs(Math.cos(opts.ry || 0)) * d / 2;
      const collider = { minX: x - hx, maxX: x + hx, minY: y, maxY: y + h, minZ: z - hz, maxZ: z + hz, tag: opts.tag };
      colliders.push(collider); mesh.userData.collider = collider; if (h > 1.2) occluders.push(mesh);
    }
    return mesh;
  }
  function addCylinder(r, h, material, x, y, z, opts = {}) {
    const mesh = new THREE.Mesh(cylGeo(r, h, opts.segments || 12), material); mesh.position.set(x, y + h / 2, z);
    if (opts.rx) mesh.rotation.x = opts.rx; if (opts.rz) mesh.rotation.z = opts.rz; mesh.castShadow = true; mesh.receiveShadow = true; if (opts.name) mesh.name = opts.name; root.add(mesh);
    if (opts.collide) { const collider = { minX: x-r, maxX: x+r, minY: y, maxY: y+h, minZ: z-r, maxZ: z+r, tag: opts.tag }; colliders.push(collider); mesh.userData.collider = collider; }
    return mesh;
  }
  /* Caixas repetidas (barras de cela, postes, mísulas): 1 InstancedMesh por
     (dimensão,material) em vez de 1 mesh por peça — era o que inflava o mapa
     para 1.167 meshes. Collider e occluder seguem a mesma regra do addBox. */
  const instGroups = new Map();
  function ibox(w, h, d, material, x, y, z, opts = {}) {
    const key = `${w}|${h}|${d}|${material.uuid}|${opts.cast === false ? 0 : 1}`;
    let g = instGroups.get(key);
    if (!g) { g = { geo: boxGeo(w, h, d), mat: material, list: [], cast: opts.cast !== false, occluder: false }; instGroups.set(key, g); }
    const o = new THREE.Object3D(); o.position.set(x, y + h / 2, z);
    if (opts.ry) o.rotation.y = opts.ry; o.updateMatrix();
    g.list.push(o.matrix.clone());
    if (opts.collide) {
      const hx = Math.abs(Math.cos(opts.ry || 0)) * w / 2 + Math.abs(Math.sin(opts.ry || 0)) * d / 2;
      const hz = Math.abs(Math.sin(opts.ry || 0)) * w / 2 + Math.abs(Math.cos(opts.ry || 0)) * d / 2;
      colliders.push({ minX: x - hx, maxX: x + hx, minY: y, maxY: y + h, minZ: z - hz, maxZ: z + hz, tag: opts.tag });
      if (h > 1.2) g.occluder = true;
    }
  }
  function buildInstanced() {
    for (const g of instGroups.values()) {
      const im = new THREE.InstancedMesh(g.geo, g.mat, g.list.length);
      g.list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = g.cast; im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
      root.add(im);
      if (g.occluder) occluders.push(im);
    }
    instGroups.clear();
  }

  /* Look de fim de tarde azul-chumbo (LOOK.penitenciaria): céu/fog/sol/hemi de uma
     fonte só; o shadow fica no builder porque ele conhece os limites do mapa. */
  const { hemi, sun } = applyLook(scene, T, 'penitenciaria');
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
  sun.shadow.camera.top = 58; sun.shadow.camera.bottom = -58;
  sun.shadow.camera.far = 180; sun.shadow.bias = -.0004;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150, 175), MAT.darkConcrete); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; root.add(ground);

  /* Muro de reboco descascado sobre embasamento de concreto: a faixa escura de
     umidade da textura encontra o embasamento físico — a junção reboco↔concreto
     é lida nos dois níveis. Platibanda escura fecha o topo. */
  const MURO_H = 5.8;
  for (const [w, d, x, z, tag] of [
    [76, 1, 0, -HALF_Z, 'muro-sul'], [76, 1, 0, HALF_Z, 'muro-norte'],
    [1, 96, -HALF_X, 0, 'muro-oeste'], [1, 96, HALF_X, 0, 'muro-leste'],
  ]) {
    addBox(w, MURO_H, d, MAT.reboco, x, 0, z, { tag });
    addBox(w === 1 ? 1.3 : w + .4, .9, d === 1 ? 1.3 : d + .4, MAT.darkConcrete, x, 0, z, { collide: false, cast: false });
    addBox(w === 1 ? 1.4 : w + .5, .3, d === 1 ? 1.4 : d + .5, MAT.darkConcrete, x, MURO_H, z, { collide: false });
  }
  function fence(name, axis, fixed, from, to) {
    const group = new THREE.Group(); group.name = `penitenciaria-cerca-${name}`; root.add(group);
    for (let p = from; p <= to; p += 3) {
      axis === 'x' ? ibox(.08, 2.5, .08, MAT.steel, p, MURO_H, fixed) : ibox(.08, 2.5, .08, MAT.steel, fixed, MURO_H, p);
    }
    for (const y of [6.2, 7.25, 8.1]) {
      axis === 'x' ? ibox(to - from, .06, .06, MAT.steel, (from + to) / 2, y, fixed) : ibox(.06, .06, to - from, MAT.steel, fixed, y, (from + to) / 2);
    }
  }
  fence('sul', 'x', -HALF_Z, -HALF_X, HALF_X); fence('norte', 'x', HALF_Z, -HALF_X, HALF_X);
  fence('oeste', 'z', -HALF_X, -HALF_Z, HALF_Z); fence('leste', 'z', HALF_X, -HALF_Z, HALF_Z);

  /* Arame farpado em hélice contínua (NV4): um TubeGeometry por lado no lugar dos
     432 torus clonados. A curva é local ao mesh, que fica posicionado no lado. */
  class HelixCurve extends THREE.Curve {
    constructor(axis, from, to, r, pitch) { super(); this.axis = axis; this.from = from; this.to = to; this.r = r; this.pitch = pitch; }
    getPoint(t, target = new THREE.Vector3()) {
      const p = this.from + (this.to - this.from) * t;
      const a = ((p - this.from) / this.pitch) * Math.PI * 2;
      return this.axis === 'x' ? target.set(p, this.r * Math.cos(a), this.r * Math.sin(a)) : target.set(this.r * Math.sin(a), this.r * Math.cos(a), p);
    }
  }
  for (const [name, axis, mx, mz, from, to] of [
    ['sul', 'x', 0, -HALF_Z, -HALF_X, HALF_X], ['norte', 'x', 0, HALF_Z, -HALF_X, HALF_X],
    ['oeste', 'z', -HALF_X, 0, -HALF_Z, HALF_Z], ['leste', 'z', HALF_X, 0, -HALF_Z, HALF_Z],
  ]) {
    const turns = (to - from) / .7;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new HelixCurve(axis, from, to, .34, .7), Math.ceil(turns) * 8, .028, 4, false), MAT.arame);
    tube.name = `penitenciaria-arame-${name}`;
    tube.position.set(mx, 8.45, mz); tube.castShadow = false; root.add(tube);
  }

  /* Guaritas com holofote REAL que varre o pátio (NV2). SpotLight SEM sombra e sem
     .map: o SB2 já mede 8/8 no piso WebGL1 (mutantes sombra-pontual/spot-map provam). */
  const holofotes = [];
  const coneGeo = new THREE.ConeGeometry(3.4, 30, 12, 1, true);
  coneGeo.translate(0, -15, 0); coneGeo.rotateX(-Math.PI / 2);   // ápice na origem, boca a +Z
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffc07a, transparent: true, opacity: .055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  function guardTower(index, x, z) {
    const group = new THREE.Group(); group.name = `penitenciaria-guarita-${index}`; root.add(group);
    group.userData.molde = 'torre_vigilancia';   // NV7: a régua lê o USO registrado, não a declaração
    const sx = Math.sign(x), sz = Math.sign(z);
    /* GLB da torre (Mint, FONTE.md): no arnês node placeProp devolve null e a
       torre procedural cobre — colisores idênticos nos dois mundos (lição 3). */
    const glb = placeProp('torre_vigilancia', { x, y: 0, z, targetH: 9.6, targetLen: 5.6, ry: Math.atan2(-x, -z) });
    if (glb) root.add(glb);
    const pecas = [];
    for (const dx of [-1.8, 1.8]) for (const dz of [-1.8, 1.8]) pecas.push(addBox(.38, 7.2, .38, MAT.steel, x+dx, 0, z+dz, { tag: `guarita-${index}` }));
    pecas.push(addBox(4.8, .45, 4.8, MAT.concrete, x, 6.5, z, { tag: `guarita-${index}` }));
    pecas.push(addBox(4.2, 2.4, .25, MAT.steel, x, 6.95, z-sz*2, { tag: `guarita-${index}` }));
    pecas.push(addBox(.25, 2.4, 4.2, MAT.steel, x-sx*2, 6.95, z, { tag: `guarita-${index}` }));
    pecas.push(addBox(4.8, .4, 4.8, MAT.darkConcrete, x, 9.35, z, { collide: false }));
    for (const side of [-1, 1]) pecas.push(addBox(.08, 5.8, .08, MAT.steel, x+sx*(2.25+side*.35), .2, z-sz*2.2, { collide: false }));
    if (glb) for (const p of pecas) { p.visible = false; const o = occluders.indexOf(p); if (o >= 0) occluders.splice(o, 1); }

    const cabeca = new THREE.Group(); cabeca.name = `penitenciaria-holofote-${index}`;
    cabeca.position.set(x - sx * .8, 8.6, z - sz * .8); root.add(cabeca);
    const corpo = new THREE.Mesh(boxGeo(.5, .42, .62), MAT.black); corpo.castShadow = false; cabeca.add(corpo);
    const lente = new THREE.Mesh(new THREE.CircleGeometry(.2, 12), new THREE.MeshBasicMaterial({ color: 0xffd9a0, fog: false }));
    lente.position.z = .32; cabeca.add(lente);
    const spot = new THREE.SpotLight(0xffc07a, 2.6, 85, .34, .5, 0);
    cabeca.add(spot);
    const alvo = new THREE.Object3D(); root.add(alvo); spot.target = alvo;
    const cone = new THREE.Mesh(coneGeo, coneMat); cone.renderOrder = 9; cabeca.add(cone);
    holofotes.push({ cabeca, alvo, cone, fase: index * Math.PI * .5, giro: index % 2 ? 1 : -1, cx: sx * 9, cz: sz * 11 });
  }
  guardTower(0, -33.5, -43.5); guardTower(1, 33.5, -43.5); guardTower(2, -33.5, 43.5); guardTower(3, 33.5, 43.5);

  /* Celas do térreo (contrato PEN1/PEN2 intacto) + beliche no fundo e porta de
     grade entreaberta. Estrutura repetida sai instanciada; o que tem nome de
     contrato continua mesh próprio. */
  function cell(side, index, z) {
    const faceX = side * 25, backX = side * 34.2, insideX = side * 29.3;
    const group = new THREE.Group(); group.name = `penitenciaria-cela-aberta-${side < 0 ? 'o' : 'l'}-${index}`;
    group.userData = { doorwayX: side * 24.8, doorwayZ: z, insideX, insideZ: z }; root.add(group);
    ibox(9.2, .35, 7.2, MAT.concrete, (faceX+backX)/2, 4.1, z);
    ibox(.5, 4.1, 7.2, MAT.concrete, backX, 0, z, { collide: true });
    ibox(9.2, 4.1, .42, MAT.concrete, (faceX+backX)/2, 0, z-3.6, { collide: true });
    ibox(9.2, 4.1, .42, MAT.concrete, (faceX+backX)/2, 0, z+3.6, { collide: true });
    const barX = faceX;
    for (const dz of [-3.25,-2.7,-2.15,2.15,2.7,3.25]) ibox(.12, 3.85, .12, MAT.steel, barX, 0, z+dz);
    for (const y of [.6,2,3.35]) { ibox(.12, .1, 2.9, MAT.steel, barX, y, z-2.15); ibox(.12, .1, 2.9, MAT.steel, barX, y, z+2.15); }
    addBox(.45, 1.1, 2.6, MAT.concrete, side*31.6, 0, z, { name: `penitenciaria-banco-${side}-${index}` });
    ibox(.1, .08, 1.5, MAT.white, backX-side*.27, 2.1, z);
    // porta de grade entreaberta, encostada na ombreira (decorativa: a passagem fica livre)
    ibox(.04, 3.3, 1.35, MAT.grade, barX - side * .5, 0, z - 2.85, { ry: side * .5, cast: false });
    // beliche no fundo da cela: cala o canto morto sem tocar porta nem centro (PEN2)
    const bx = side * 32.7, bz = z - 2.1;
    for (const px of [-.42, .42]) for (const pz of [-.95, .95]) ibox(.08, 1.65, .08, MAT.galvanizado, bx + px, 0, bz + pz);
    for (const by of [.45, 1.35]) { ibox(.95, .07, 2.05, MAT.galvanizado, bx, by, bz); ibox(.85, .12, 1.9, MAT.grass, bx, by + .07, bz); }
    colliders.push({ minX: bx - .5, maxX: bx + .5, minY: 0, maxY: 1.7, minZ: bz - 1.05, maxZ: bz + 1.05, tag: 'beliche' });
  }
  [-30,-20,-10,10,20,30].forEach((z, i) => { cell(-1, i, z); cell(1, i, z); });

  /* 1º pavimento das duas alas (NV3): pavimento superior em tijolo aparente com
     portas de grade para a passarela, varanda metálica galvanizada com
     guarda-corpo e escada de acesso visual na ponta sul. */
  for (const side of [-1, 1]) {
    const ala = side < 0 ? 'o' : 'l';
    addBox(9.2, 4.15, 70.4, MAT.tijolo, side * 29.9, 4.45, 0);
    addBox(9.6, .35, 71.2, MAT.darkConcrete, side * 29.9, 8.6, 0, { collide: false });
    for (const z of [-30,-20,-10,10,20,30]) {
      ibox(.3, 2.3, 1.5, MAT.black, side * 25.15, 4.6, z, { cast: false });
      ibox(.05, 2.2, 1.3, MAT.grade, side * 25.05, 4.65, z, { cast: false });
      ibox(.05, .9, .9, MAT.grade, side * 25.05, 5.65, z + 5, { cast: false });
    }
    const varanda = new THREE.Group(); varanda.name = `penitenciaria-varanda-${ala}`; root.add(varanda);
    const piso = new THREE.Mesh(boxGeo(2.4, .18, 70.4), MAT.galvanizado);
    piso.position.set(side * 23.55, 4.54, 0); piso.castShadow = true; piso.receiveShadow = true; varanda.add(piso);
    for (let z = -33; z <= 33; z += 3.3) {
      ibox(.1, .1, 1.6, MAT.galvanizado, side * 24.6, 4.28, z, { ry: 0, cast: false });   // mísula
      ibox(.07, 1.1, .07, MAT.galvanizado, side * 22.5, 4.63, z);                        // balaústre
    }
    for (const y of [5.15, 5.68]) ibox(.08, .07, 70.4, MAT.galvanizado, side * 22.5, y, 0);
    const guardaNome = `penitenciaria-varanda-${ala}-guarda-corpo`;
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(70.4, 1.05), MAT.grade);
    tela.name = guardaNome; tela.position.set(side * 22.5, 5.15, 0); tela.rotation.y = Math.PI / 2;
    tela.castShadow = false; varanda.add(tela);
    // escada de acesso visual na ponta sul (decorative: sem colisor novo)
    for (let d = 0; d < 10; d++) ibox(2.0, .16, .5, MAT.galvanizado, side * 23.55, d * .46, -36.2 - d * .42, { cast: false });
    ibox(.07, 4.6, .07, MAT.galvanizado, side * 22.6, 0, -36.4); ibox(.07, 4.6, .07, MAT.galvanizado, side * 24.5, 0, -36.4);
  }

  // Pátio bruto: concreto remendado, manchas de umidade e drenagem, sem marcação esportiva.
  const yard = new THREE.Mesh(new THREE.PlaneGeometry(35, 43), MAT.yard); yard.name = 'penitenciaria-patio'; yard.rotation.x = -Math.PI/2; yard.position.y = .018; yard.receiveShadow = true; root.add(yard);
  for (const [x,z,sx,sz] of [[-11,-14,4,1.8],[9,-12,5,2.4],[-13,10,3,5],[11,14,5,2],[-2,17,7,1.4]]) {
    const stain = new THREE.Mesh(new THREE.CircleGeometry(1,18), new THREE.MeshBasicMaterial({color:0x252c27,transparent:true,opacity:.2,depthWrite:false}));
    stain.scale.set(sx,sz,1); stain.rotation.x=-Math.PI/2; stain.position.set(x,.032,z); root.add(stain);
  }
  for (const z of [-18,18]) { ibox(29,.055,.22,MAT.steel,0,.02,z,{cast:false}); for(let x=-13;x<=13;x+=1.1)ibox(.06,.065,1.1,MAT.black,x,.025,z,{cast:false}); }
  // juntas de dilatação do piso e poças que devolvem a luz dos holofotes
  for (const x of [-14, -7, 0, 7, 14]) ibox(.16, .02, 43, MAT.black, x, .012, 0, { cast: false });
  for (const z of [-14, -7, 0, 7, 14]) ibox(35, .02, .16, MAT.black, 0, .013, z, { cast: false });
  for (const [x, z, r] of [[-6, -9, 2.2], [8, 4, 1.7], [-3, 12, 1.4], [12, -15, 1.2]]) {
    const poca = new THREE.Mesh(new THREE.CircleGeometry(r, 22), MAT.poca);
    poca.rotation.x = -Math.PI / 2; poca.position.set(x, .026, z); poca.receiveShadow = true; root.add(poca);
  }

  function ammoCrate(index, x, z, ry=0) {
    const group = new THREE.Group(); group.name = `penitenciaria-caixa-municao-${index}`; root.add(group);
    const body = addBox(2.2, 1.25, 1.55, MAT.ammo, x, 0, z, { ry, tag: `municao-${index}` }); group.userData.collider = body.userData.collider;
    for (const y of [.18,.92]) ibox(2.28,.1,1.63,MAT.steel,x,y,z,{ry});
    for (const dx of [-.65,0,.65]) ibox(.08,.7,1.65,MAT.black,x+dx*Math.cos(ry),.27,z-dx*Math.sin(ry),{ry});
  }
  [[-8,-7,.2],[8,-7,-.2],[-8,7,-.15],[8,7,.15],[-16,0,1.57],[16,0,1.57]].forEach((p,i)=>ammoCrate(i,...p));

  function centerObstacle(index, kind, x, z, ry=0) {
    const marker = new THREE.Group(); marker.name = `penitenciaria-obstaculo-centro-${index}-${kind}`; marker.position.set(x,0,z); root.add(marker);
    if (kind === 'barreira') {
      addBox(4.2,1.25,.75,MAT.concrete,x,0,z,{ry,tag:`centro-${index}`});
      addBox(3.7,.16,.82,MAT.yellow,x,1.04,z,{ry,collide:false});
      for(const side of [-1,1]) addBox(.55,.3,1.25,MAT.darkConcrete,x+side*Math.cos(ry)*1.65,.02,z-side*Math.sin(ry)*1.65,{ry});
    } else if (kind === 'barris') {
      for(const [dx,dz] of [[-.7,0],[.7,0],[0,.75]]) { addCylinder(.48,1.35,MAT.rust,x+dx,0,z+dz,{collide:true,tag:`centro-${index}`,segments:16}); addCylinder(.5,.06,MAT.steel,x+dx,1.28,z+dz,{segments:16}); }
    } else if (kind === 'gaiola') {
      addBox(3.1,.25,2.1,MAT.steel,x,0,z,{ry,tag:`centro-${index}`});
      for(const dx of [-1.4,1.4])for(const dz of [-.9,.9])addBox(.12,1.65,.12,MAT.steel,x+dx*Math.cos(ry)+dz*Math.sin(ry),.2,z-dx*Math.sin(ry)+dz*Math.cos(ry),{collide:false});
      addBox(3.1,.12,2.1,MAT.steel,x,1.72,z,{ry,collide:false}); addBox(2.5,.75,1.5,MAT.white,x,.27,z,{ry,collide:false});
    } else {
      addBox(3.5,.35,2.2,MAT.rust,x,0,z,{ry,tag:`centro-${index}`});
      addBox(2.8,.8,1.8,MAT.darkConcrete,x,.35,z,{ry}); addBox(2.3,.65,1.5,MAT.concrete,x,.95,z,{ry});
    }
  }
  [['barreira',-12,-16,.15],['barris',11,-16,0],['gaiola',-14,-2,-.2],['entulho',13,1,.25],['barreira',-11,16,-.18],['barris',12,16,0],['gaiola',-3,-13,.12],['entulho',4,13,-.2],['barreira',-2,7,1.45],['gaiola',3,-6,1.5]].forEach((p,i)=>centerObstacle(i,...p));

  function policeCar(x,z,ry) {
    const group = new THREE.Group(); group.name = 'penitenciaria-carro-policia'; group.position.set(x,0,z); group.rotation.y=ry; root.add(group);
    const part=(w,h,d,m,px,py,pz)=>{const mesh=new THREE.Mesh(boxGeo(w,h,d),m);mesh.position.set(px,py+h/2,pz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
    part(2.7,.75,5.4,MAT.white,0,.55,0); part(2.55,.12,3.4,MAT.blue,0,1.05,0); part(2.35,1.05,2.65,MAT.white,0,1.12,.05);
    part(2.38,.72,.08,MAT.glass,0,1.35,-1.35); part(2.38,.72,.08,MAT.glass,0,1.35,1.35);
    for(const sx of [-1,1]) for(const sz of [-1.75,1.75]) { const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.28,16),MAT.rubber);wheel.rotation.z=Math.PI/2;wheel.position.set(sx*1.35,.55,sz);group.add(wheel); }
    part(1.45,.18,.28,MAT.black,0,2.2,0); part(.65,.22,.3,MAT.red,-.42,2.35,0); part(.65,.22,.3,MAT.blue,.42,2.35,0);
    const hx=Math.abs(Math.cos(ry))*1.55+Math.abs(Math.sin(ry))*2.8,hz=Math.abs(Math.sin(ry))*1.55+Math.abs(Math.cos(ry))*2.8;
    const collider={minX:x-hx,maxX:x+hx,minY:0,maxY:2.5,minZ:z-hz,maxZ:z+hz,tag:'carro-policia'};colliders.push(collider);group.userData.collider=collider;occluders.push(group);
  }
  policeCar(17,-25,-.35);

  function punchingBag(index,x,z) {
    const group=new THREE.Group();group.name=`penitenciaria-saco-boxe-${index}`;root.add(group);
    addBox(3.6,.25,2.4,MAT.steel,x,3.4,z,{collide:false}); addBox(.22,3.5,.22,MAT.steel,x-1.55,0,z); addBox(.22,3.5,.22,MAT.steel,x+1.55,0,z);
    addCylinder(.08,.85,MAT.steel,x,2.9,z,{collide:false}); addCylinder(.48,1.9,MAT.red,x,1,z,{collide:true,tag:`saco-${index}`});
  }
  punchingBag(0,-18,38); punchingBag(1,-13,38);

  function dynamite(index,x,z,ry=0) {
    const group=new THREE.Group();group.name=`penitenciaria-dinamite-${index}`;group.position.set(x,0,z);group.rotation.y=ry;root.add(group);
    for(let i=0;i<6;i++){const stick=new THREE.Mesh(cylGeo(.11,1.25,8),MAT.red);stick.rotation.z=Math.PI/2;stick.position.set(0,.18+(i%2)*.2,(i-2.5)*.24);group.add(stick);} const band=new THREE.Mesh(boxGeo(.18,.65,1.65),MAT.black);band.position.y=.25;group.add(band);
  }
  dynamite(0,-19,-16,.2); dynamite(1,19,17,-.25); dynamite(2,4,23,1.1);

  // Bancos externos e barreiras quebram linhas longas sem fechar as três rotas.
  [[-18,-26],[18,27],[-18,24],[18,-20]].forEach(([x,z],i)=>{
    addBox(4.4,.38,1.05,MAT.concrete,x,.72,z,{name:`penitenciaria-banco-patio-${i}`});
    for(const dx of [-1.65,1.65]) addBox(.45,.72,.8,MAT.darkConcrete,x+dx,0,z);
  });

  /* Refeitório coberto no canto sudoeste: mesa coletiva de inox com bancos —
     a cena do dia a dia que tira o pátio do abstrato. */
  {
    const rx = -26, rz = -42;
    addBox(8.4, .22, 6.2, MAT.darkConcrete, rx, 3.05, rz, { collide: false });
    for (const dx of [-3.8, 3.8]) for (const dz of [-2.7, 2.7]) addBox(.22, 3.05, .22, MAT.galvanizado, rx + dx, 0, rz + dz, { tag: 'refeitorio' });
    for (const dz of [-1.8, 0, 1.8]) {
      addBox(4.2, .09, 1.0, MAT.mesa, rx, .78, rz + dz, { tag: 'refeitorio' });
      for (const dx of [-1.7, 1.7]) ibox(.14, .78, .9, MAT.galvanizado, rx + dx, 0, rz + dz, { collide: true });
      for (const s of [-1, 1]) { ibox(4.2, .07, .4, MAT.galvanizado, rx, .45, rz + dz + s * .85); for (const dx of [-1.7, 1.7]) ibox(.12, .45, .35, MAT.galvanizado, rx + dx, 0, rz + dz + s * .85); }
    }
  }

  /* Caixa d'água de aço sobre cavaletes, rente ao muro leste. */
  {
    const cx = 31, cz = -36;
    for (const dx of [-1.2, 1.2]) for (const dz of [-1.2, 1.2]) addBox(.18, 3.6, .18, MAT.steel, cx + dx, 0, cz + dz, { tag: 'caixa-dagua' });
    addCylinder(1.7, 2.3, MAT.caixaDagua, cx, 3.6, cz, { segments: 18 });
    addCylinder(1.78, .18, MAT.steel, cx, 5.82, cz, { segments: 18 });
  }

  /* Postes com fios e luminárias quentes: ritmo vertical no pátio vazio. */
  const posteTopo = [];
  for (const [x, z] of [[-18, -10], [18, -10], [-18, 10], [18, 10]]) {
    addBox(.22, 7, .22, MAT.galvanizado, x, 0, z, { tag: 'poste' });
    addBox(1.6, .12, .12, MAT.galvanizado, x, 6.6, z, { collide: false });
    const lamp = new THREE.Mesh(boxGeo(.5, .18, .3), new THREE.MeshStandardMaterial({ color: 0x2a2d2e, emissive: 0xffb35c, emissiveIntensity: 1.6, roughness: .5 }));
    lamp.position.set(x + .55, 6.62, z); root.add(lamp);
    posteTopo.push([x, 6.55, z]);
  }
  for (let i = 0; i < posteTopo.length - 1; i++) {
    const [ax, ay, az] = posteTopo[i], [bx, by, bz] = posteTopo[i + 1];
    const sag = Math.hypot(bx - ax, bz - az) * .04;
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(ax, ay, az), new THREE.Vector3((ax + bx) / 2, Math.min(ay, by) - sag, (az + bz) / 2), new THREE.Vector3(bx, by, bz),
    ]);
    const fio = new THREE.Mesh(new THREE.TubeGeometry(curva, 20, .016, 4, false), MAT.black);
    fio.castShadow = false; root.add(fio);
  }

  const GM={dark:MAT.black,steel:MAT.steel,wood:MAT.rust};
  function gun(kind,x,z,yaw){const g=new THREE.Group();g.name=`arma-central-${kind}`;g.position.set(x,.1,z);g.rotation.y=yaw;root.add(g);const long=['awp','ak','m4','shotgun','mp5'].includes(kind);const body=new THREE.Mesh(boxGeo(.13,.13,long?1:.42),kind==='shotgun'?GM.wood:GM.dark);body.position.y=.1;g.add(body);if(long){const barrel=new THREE.Mesh(boxGeo(.08,.08,.55),GM.steel);barrel.position.set(0,.13,-.62);g.add(barrel);}const grip=new THREE.Mesh(boxGeo(.11,.25,.14),GM.wood);grip.position.set(0,-.02,long?.25:.12);g.add(grip);pickups.push({x,z,kind,weapon:kind,readyAt:0,mesh:g});}
  /* `kind` é ID de arma (chave de WEAPONS), não CLASSE: o 8º era 'smg' e crashava
     o `_updatePickups` todo quadro. KNOWN-BUGS BUG-70 / #366. */
  ['awp','ak','m4','shotgun','mp5','deagle','pistol','uzi'].forEach((kind,i)=>gun(kind,-10+i*(20/7),i%2?-2.2:2.2,i*.42));
  ['ak','m4','shotgun','deagle'].forEach((kind,i)=>{gun(kind,-15+i*10,-41,0);gun(kind,15-i*10,41,Math.PI);});

  buildInstanced();

  /* Varredura LENTA dos holofotes (NV2): cada cabeça gira num quadrante do pátio,
     ~55 s por volta; o spot real e o cone falso miram o mesmo alvo. */
  function update(dt, time) {
    for (const h of holofotes) {
      const a = time * .115 * h.giro + h.fase;
      h.alvo.position.set(h.cx + Math.cos(a) * 13, 0, h.cz + Math.sin(a) * 15);
      h.cabeca.lookAt(h.alvo.position.x, 1.1, h.alvo.position.z);
    }
  }

  const groundHeightAt=()=>0, slowAt=()=>false;
  const bounds={minX:-HALF_X+.9,maxX:HALF_X-.9,minZ:-HALF_Z+.9,maxZ:HALF_Z-.9};
  const blocked=(x,z,inflate=.44)=>colliders.some(c=>x>c.minX-inflate&&x<c.maxX+inflate&&z>c.minZ-inflate&&z<c.maxZ+inflate&&c.minY<1.7&&c.maxY>.1);
  const nodes=[],adj=[],step=3.2;
  for(let x=bounds.minX+1;x<=bounds.maxX-1;x+=step)for(let z=bounds.minZ+1;z<=bounds.maxZ-1;z+=step)if(!blocked(x,z))nodes.push({x,z});
  for(let i=0;i<nodes.length;i++)adj.push([]);
  const clear=(a,b)=>{for(let i=1;i<7;i++){const t=i/7;if(blocked(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.25))return false;}return true;};
  for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dz=nodes[i].z-nodes[j].z;if(dx*dx+dz*dz<=step*step*2.3&&clear(nodes[i],nodes[j])){adj[i].push(j);adj[j].push(i);}}
  for(let i=0;i<nodes.length;i++)if(adj[i].length===0){let nearest=-1,distance=Infinity;for(let j=0;j<nodes.length;j++){if(i===j||!clear(nodes[i],nodes[j]))continue;const dx=nodes[i].x-nodes[j].x,dz=nodes[i].z-nodes[j].z,d=dx*dx+dz*dz;if(d<distance){distance=d;nearest=j;}}if(nearest>=0){adj[i].push(nearest);adj[nearest].push(i);}}
  function nearestWaypoint(x,z){let best=0,distance=Infinity;for(let i=0;i<nodes.length;i++){const dx=nodes[i].x-x,dz=nodes[i].z-z,d=dx*dx+dz*dz;if(d<distance){distance=d;best=i;}}return best;}
  function findPath(fromIdx,toIdx){if(fromIdx===toIdx)return[toIdx];const prev=new Int16Array(nodes.length).fill(-1),queue=[fromIdx];prev[fromIdx]=fromIdx;while(queue.length){const n=queue.shift();for(const next of adj[n])if(prev[next]<0){prev[next]=n;if(next===toIdx){const path=[next];let p=n;while(p!==fromIdx){path.unshift(p);p=prev[p];}path.unshift(fromIdx);return path;}queue.push(next);}}return[fromIdx];}
  /* BUG-57: pombo de pátio de presídio e rato de cela. */
  const ambience = createFavelaAmbience(root, {
    map: 'penitenciaria',
    rats: [
      { pos: [-18, 0, -38], to: [-15.5, 0, -35.5], phase: .3 },
      { pos: [18, 0, 38], to: [15.5, 0, 35.5], phase: 1.4 },
      { pos: [-3, 0, 8], to: [-.5, 0, 10.5], phase: 2.2 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-12, 0, 6], phase: .5 }, { mode: 'ground', pos: [12, 0, -6], phase: 1.6 },
      { mode: 'ground', pos: [-10.8, 0, 5], phase: .8 },
    ],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.vento,pos:[0,3,0],radius:70,vol:.22},{src:AMB_LOOPS.hum,pos:[0,3,0],radius:70,vol:.16}],bioma:'urbano'},root,colliders,occluders,decalSolids:[root],groundHeightAt,slowAt,update,pickups,sun,hemi,
    spawns:{E:[-15,-5,5,15].map(x=>({x,z:-42,yaw:0})),B:[15,5,-5,-15].map(x=>({x,z:42,yaw:Math.PI}))},
    ctfPoints:[{id:'E',label:'ALA SUL',x:0,z:-39},{id:'MID',label:'PÁTIO',x:0,z:0},{id:'B',label:'ALA NORTE',x:0,z:39}],
    waypoints:{nodes,adj},nearestWaypoint,findPath,bounds};
}
