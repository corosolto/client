// Obras da Prefeitura: canteiro de obra eterna (paródia), simétrico em z=0 (E ao sul, B ao
// norte). Colisão só AABB. Mesmo contrato build(scene, T) da Loja H.
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

export const OBRAS_PROPS = [
  'construction_rubble', 'guindaste', 'concrete_roadblock', 'jersey_barrier', 'sandbags',
  'dumpster', 'botijao_gas', 'pilha_pneus', 'vw_9150', 'kombi',
  // entorno
  'fav_house', 'fav_modular', 'fachada_comercio', 'opala', 'fiat_uno', 'chevette',
];

const HALF_X = 28, HALF_Z = 35;

function signTex(bg, fg, title, sub, W = 512, H = 160) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = fg; x.lineWidth = W * 0.02; x.strokeRect(W * 0.015, H * 0.05, W * 0.97, H * 0.9);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg;
  const pad = W * 0.08;
  const fit = (t, base, fam) => { let fs = base; x.font = `bold ${fs}px ${fam}`; while (x.measureText(t).width > W - pad && fs > 8) { fs -= 2; x.font = `bold ${fs}px ${fam}`; } };
  fit(title, H * 0.42, '"Arial Black",Impact,sans-serif'); x.fillText(title, W / 2, sub ? H * 0.4 : H * 0.5);
  if (sub) { fit(sub, H * 0.2, 'Arial,sans-serif'); x.fillText(sub, W / 2, H * 0.72); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// listra de perigo amarela/preta (a cara de canteiro de obra)
function hazardTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const x = c.getContext('2d');
  x.fillStyle = '#e8b81a'; x.fillRect(0, 0, 128, 32);
  x.fillStyle = '#1a1a1a'; for (let i = -32; i < 160; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i - 16, 32); x.lineTo(i - 32, 32); x.closePath(); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(6, 1);
  return t;
}

export function buildObras(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  scene.add(root);

  const lam = (opts) => new THREE.MeshLambertMaterial(opts);
  const tex = (k, fallback) => (T && T[k]) ? { map: T[k] } : { color: fallback };
  const MAT = {
    terra: lam(tex('dirt', 0x6f5a42)), concreto: lam(tex('concrete', 0x9aa0a6)), asfalto: lam(tex('asphalt', 0x2b2e33)),
    concRaw: lam({ color: 0xb3ab97 }), rebar: lam({ color: 0x8a6a3a }), metal: lam({ color: 0x9aa0a6 }),
    tapume: lam({ color: 0x2f5fa8 }), tabua: lam({ color: 0x9c7b4a }), areia: lam({ color: 0xcbb27a }),
    hazard: lam({ map: hazardTex() }), predio: lam({ color: 0xa7a29a }), janela: lam({ color: 0x35404e }),
    lona: lam({ color: 0x2f8b57, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  };
  const RUBB = [lam({ color: 0x8a8078 }), lam({ color: 0x6f5a42 }), lam({ color: 0xa39a8c })];

  // O grafo de waypoints depende destes dois números: exclui célula < -1,0 m e corta ladeira > 0,7 m.
  const PITS = [[-7, -15, 7, 1.6], [12, -2, 6.5, 1.5], [-13, 12, 6, 1.4], [8, 20, 6.5, 1.5]];
  function groundHeightAt(x, z) {
    const edge = Math.max(0, Math.min(1, (HALF_X - 3 - Math.abs(x)) / 7)) * Math.max(0, Math.min(1, (HALF_Z - 3 - Math.abs(z)) / 7));
    let h = (Math.sin(x * 0.17) * 0.3 + Math.sin(z * 0.15 + 1.3) * 0.3 + Math.sin((x + z) * 0.09) * 0.18) * edge;
    for (const [cx, cz, r, d] of PITS) { const dist = Math.hypot(x - cx, z - cz); if (dist < r) h -= d * (0.5 + 0.5 * Math.cos(Math.PI * dist / r)); }
    return h;
  }
  const gy = (x, z) => groundHeightAt(x, z);

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry; if (opts.rz) m.rotation.z = opts.rz;
    root.add(m);
    if (opts.collide !== false) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 }); occluders.push(m); }
    return m;
  }
  function addFloor(w, d, mat, x, z, y = 0.01) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; }
  const col = (x, z, hx, hz, h) => { const y0 = gy(x, z); colliders.push({ minX: x - hx, maxX: x + hx, minY: y0, maxY: y0 + h, minZ: z - hz, maxZ: z + hz }); };
  function prop(id, x, z, targetH, ry, hx, hz, h) { const o = placeProp(id, { x, z, y: gy(x, z), targetH, ry }); if (o) { root.add(o); occluders.push(o); } if (hx) col(x, z, hx, hz, h); return o; }
  const signMesh = (w, h, tx2, x, y, z, ry) => {
    const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(w, h);
    const f = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); f.position.z = 0.02;
    const bk = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); bk.position.z = -0.02; bk.rotation.y = Math.PI;
    g.add(f, bk); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); return g;
  };
  // placa em poste (mastro termina na base — não corta o texto)
  const postSign = (x, z, cy, w, h, tx2, ry) => { const b = groundHeightAt(x, z); addBox(0.16, cy - h / 2, 0.16, MAT.metal, x, b, z); signMesh(w, h, tx2, x, b + cy, z, ry); };
  const wX = HALF_X - 0.5, wZ = HALF_Z - 0.5;

  scene.background = new THREE.Color(0xc7bfa8); scene.fog = new THREE.Fog(0xc7bfa8, 70, 160);
  {
    const geo = new THREE.PlaneGeometry(HALF_X * 2, HALF_Z * 2, 56, 70); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeightAt(pos.getX(i), pos.getZ(i)));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, MAT.terra); ground.receiveShadow = true; root.add(ground);
  }

  // dimensões X/Z EXPLÍCITAS (sem ry) pra o colisor do addBox sair certo (ry não gira o AABB)
  const tapume = (dimX, dimZ, x, z) => {
    addBox(dimX, 2.6, dimZ, MAT.tapume, x, 0, z);
    addBox(dimX + 0.05, 0.5, dimZ + 0.05, MAT.hazard, x, 2.1, z, { collide: false });   // faixa de perigo no topo
  };
  tapume(HALF_X * 2, 0.2, 0, -wZ); tapume(HALF_X * 2, 0.2, 0, wZ);   // norte/sul
  tapume(0.2, HALF_Z * 2, -wX, 0); tapume(0.2, HALF_Z * 2, wX, 0);   // leste/oeste
  // portão + letreiro OBRAS DA PREFEITURA na entrada norte e sul
  for (const sz of [-1, 1]) signMesh(14, 2.4, signTex('#1a4d8f', '#ffd23f', 'OBRAS DA PREFEITURA', 'PREVISÃO DE ENTREGA: 2050', 820, 160), 0, 4.2, sz * (wZ - 0.2), sz < 0 ? 0 : Math.PI);

  // pilares só nos CANTOS (2×2) — o miolo fica ABERTO pra atravessar (o eixo do duelo)
  for (const px of [-8, 8]) for (const pz of [-8, 8]) {
    addBox(0.8, 6, 0.8, MAT.concRaw, px, gy(px, pz), pz);
    for (const [rx, rz] of [[-0.22, -0.22], [0.22, 0.22], [-0.22, 0.22]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), MAT.rebar); r.position.set(px + rx, gy(px, pz) + 6.45, pz + rz); root.add(r); }
  }
  addBox(18, 0.4, 8, MAT.concRaw, 0, 4.2, -8, { collide: false, cast: false });   // laje parcial ao NORTE (não sobre o vão central)
  for (let z = -9; z <= -7; z += 1) addBox(18, 0.12, 0.12, MAT.rebar, 0, 4.7, z, { collide: false, cast: false });   // vergalhões
  // rampa de tábua de acesso à laje (decorativa)
  addBox(3, 0.16, 5, MAT.tabua, 9, 1.5, 2, { collide: false, rz: -0.5 });
  // lona verde de obra pendurada num lado da estrutura
  { const lo = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), MAT.lona); lo.position.set(-8.1, 3, -3.5); lo.rotation.y = Math.PI / 2; root.add(lo); }

  const scaffold = (x, z, w, d, h) => {
    const b = gy(x, z);
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) addBox(0.14, h, 0.14, MAT.metal, x + dx, gy(x + dx, z + dz), z + dz);   // montantes (colidem)
    for (let y = 1.9; y < h; y += 1.9) { addBox(w, 0.08, 0.08, MAT.metal, x, b + y, z - d / 2, { collide: false }); addBox(w, 0.08, 0.08, MAT.metal, x, b + y, z + d / 2, { collide: false }); addBox(w, 0.1, d, MAT.tabua, x, b + y, z, { collide: false, cast: false }); }
  };
  scaffold(-16, -8, 3, 2, 5.7); scaffold(-16, 8, 3, 2, 5.7); scaffold(16, 6, 3, 2, 5.7);

  const monteAreia = (x, z, r) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.8, 12), MAT.areia); m.position.set(x, gy(x, z) + r * 0.4, z); m.castShadow = true; root.add(m); col(x, z, r * 0.8, r * 0.8, r * 0.6); };
  const canos = (x, z) => { const b = gy(x, z); for (let i = 0; i < 3; i++) for (let j = 0; j < 2 - (i % 2); j++) { const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.6, 12), MAT.concreto); c2.rotation.x = Math.PI / 2; c2.position.set(x + (j - (i % 2) * 0.5) * 0.75, b + 0.35 + i * 0.62, z); c2.castShadow = true; root.add(c2); } col(x, z, 1.0, 1.8, 1.8); };
  const blocos = (x, z) => { const b = gy(x, z); addBox(1.6, 1.1, 1.2, MAT.concRaw, x, b, z); addBox(1.2, 0.5, 1.0, RUBB[0], x, b + 1.1, z, { collide: false }); };
  for (const sz of [-1, 1]) {
    monteAreia(-12, sz * 14, 2.4); monteAreia(14, sz * 16, 2.2);
    canos(20, sz * 4); blocos(-4, sz * 12); blocos(6, sz * 18);
    prop('construction_rubble', 10, sz * 10, 1.4, sz, 1.3, 1.3, 1.3);
    prop('jersey_barrier', -14, sz * 4, 1.0, 0, 0.5, 1.6, 1.0);
    prop('jersey_barrier', 2, sz * 8, 1.0, Math.PI / 2, 1.6, 0.5, 1.0);
    prop('sandbags', 16, sz * 24, 0.9, 0, 1.6, 0.8, 0.8);
    prop('concrete_roadblock', -8, sz * 22, 1.0, 0, 1.2, 0.5, 1.0);
    prop('botijao_gas', 18, sz * 10, 0.9, 0, 1.2, 0.7, 0.9);
  }
  // guindaste (marco) num canto + caminhão de obra + dumpster de entulho + betoneira
  prop('guindaste', -20, 22, 8, 0.4, 2.0, 2.0, 3.0);
  prop('vw_9150', 20, -22, 3.2, Math.PI / 2, 3.4, 1.2, 3.0);
  prop('dumpster', 22, 26, 1.7, 0, 1.4, 1.0, 1.6);
  prop('pilha_pneus', -20, -12, 1.5, 0, 1.0, 1.0, 1.4);
  // betoneira (procedural): tambor cônico + base
  { const b = gy(-18, 2); addBox(1.0, 0.7, 1.4, MAT.metal, -18, b, 2); const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 1.2, 12), lam({ color: 0xe0a020 })); tb.rotation.z = 0.5; tb.position.set(-18, b + 1.2, 2); tb.castShadow = true; root.add(tb); col(-18, 2, 0.7, 0.8, 1.4); }
  // banheiro químico (procedural, azul)
  addBox(1.1, 2.2, 1.1, lam({ color: 0x2f6fb0 }), 24, gy(24, 0), 0);

  const avisos = [['OBRA PARADA', ''], ['DESCULPE O TRANSTORNO', 'OU NEM TANTO'], ['A VERBA ACABOU', ''], ['HOMEM (NÃO) TRABALHANDO', ''], ['DESVIO', 'DE DINHEIRO PÚBLICO'], ['EM BREVE', '2050']];
  avisos.forEach(([t, sub], i) => { const px = [-18, 18, -6, 6, -14, 14][i], pz = [-6, -10, 26, -26, 18, 6][i]; postSign(px, pz, 2.3, 3.4, 1.1, signTex('#e8b81a', '#1a1a1a', t, sub, 512, 210), (i % 2) ? Math.PI / 2 : 0); });
  // cones laranja espalhados
  const coneMat = lam({ color: 0xe0551e });
  for (const [cx, cz] of [[0, -4], [10, 2], [-2, 6], [8, 14], [2, -14], [-10, 0], [14, -8], [-6, -20]]) {
    const cb = gy(cx, cz); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), coneMat); cone.position.set(cx, cb + 0.35, cz); cone.castShadow = true; root.add(cone);
    addBox(0.5, 0.05, 0.5, MAT.hazard, cx, cb + 0.02, cz, { collide: false, cast: false });
  }

  const GM = { black: lam({ color: 0x1b1d21 }), steel: lam({ color: 0x9aa0a6 }), wood: lam({ color: 0x7a5326 }), tan: lam({ color: 0xb39a63 }), green: lam({ color: 0x16432a }) };
  const gbox = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };
  const gcyl = (r, len, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); return m; };
  function buildGun(kind, x, z, yaw) {
    const g = new THREE.Group(); const add = (...ms) => ms.forEach(m => g.add(m));
    switch (kind) {
      case 'awp': add(gbox(0.11, 0.1, 1.35, GM.green, 0, 0.09, 0.05), gbox(0.11, 0.16, 0.36, GM.green, 0, 0.1, 0.6), gcyl(0.05, 0.36, GM.black, 0, 0.19, 0.05)); break;
      case 'ak': add(gbox(0.1, 0.1, 1.05, GM.black, 0, 0.09, 0), gbox(0.11, 0.13, 0.34, GM.wood, 0, 0.1, 0.46), gbox(0.09, 0.24, 0.14, GM.black, 0, -0.02, -0.02)); break;
      case 'm4': add(gbox(0.09, 0.1, 1.0, GM.black, 0, 0.09, 0), gbox(0.1, 0.14, 0.32, GM.black, 0, 0.1, 0.45), gbox(0.08, 0.2, 0.13, GM.black, 0, 0, -0.05)); break;
      case 'mp5': add(gbox(0.09, 0.11, 0.62, GM.black, 0, 0.09, 0), gbox(0.09, 0.1, 0.22, GM.black, 0, 0.09, 0.36), gbox(0.07, 0.22, 0.1, GM.black, 0, 0, -0.02)); break;
      case 'shotgun': add(gbox(0.1, 0.11, 1.0, GM.black, 0, 0.11, 0), gbox(0.1, 0.09, 0.9, GM.wood, 0, 0.02, 0.02), gbox(0.11, 0.15, 0.34, GM.wood, 0, 0.1, 0.5)); break;
      case 'deagle': add(gbox(0.09, 0.13, 0.4, GM.steel, 0, 0.1, 0), gbox(0.09, 0.2, 0.11, GM.tan, 0, 0.02, 0.15)); break;
      default: add(gbox(0.08, 0.12, 0.3, GM.black, 0, 0.09, 0), gbox(0.08, 0.16, 0.1, GM.black, 0, 0.03, 0.11));
    }
    g.position.set(x, gy(x, z) + 0.02, z); g.rotation.y = yaw; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(g); return g;
  }
  const place = (kind, x, z, yaw = 0) => { const mesh = buildGun(kind, x, z, yaw); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh }); };
  const ARSENAL = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
  for (const sz of [-1, 1]) { const z = sz * 30, yaw = sz < 0 ? 0 : Math.PI; ARSENAL.forEach((k, i) => place(k, -9 + i * 3, z, yaw)); }
  place('ak', -4, 0, 0); place('m4', 4, 0, 0);   // x=±4: chão firme (±0,04); em ±10 afundava (VM14)

  const hemi = new THREE.HemisphereLight(0xfff0d8, 0x4a4030, 1.05); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.5);
  sun.position.set(24, 40, -14); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -38; sun.shadow.camera.right = 38; sun.shadow.camera.top = 44; sun.shadow.camera.bottom = -44;
  sun.shadow.camera.far = 150; sun.shadow.bias = -0.0004; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfeeff, 0.4); fill.position.set(-18, 30, 12); scene.add(fill);

  const slowAt = (x, z) => groundHeightAt(x, z) < -0.7;   // lama no fundo dos buracos

  const nodes = [], adj = [];
  const STEP = 3.2;
  const blocked = (x, z, inflate) => { const g = groundHeightAt(x, z); for (const c of colliders) if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < g + 1.6 && c.maxY > g + 0.15) return true; return false; };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP) for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP) if (!blocked(gx, gz, 0.5) && groundHeightAt(gx, gz) > -1.1) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; if (Math.abs(groundHeightAt(x, z) - groundHeightAt(a.x, a.z)) > 0.75) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, d2 = dx * dx + dz * dz; if (d2 < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z) { let best = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1); const q = [fromIdx]; prev[fromIdx] = fromIdx;
    while (q.length) { const n = q.shift(); for (const m of adj[n]) if (prev[m] === -1) { prev[m] = n; if (m === toIdx) { const path = [m]; let c = n; while (c !== fromIdx) { path.unshift(c); c = prev[c]; } path.unshift(fromIdx); return path; } q.push(m); } }
    return [fromIdx];
  }

  {
    const casas = ['fav_house', 'fav_modular', 'fachada_comercio'];
    let hi = 0;
    for (const sx of [-1, 1]) for (let z = -26; z <= 26; z += 9) prop(casas[hi++ % casas.length], sx * (HALF_X + 9), z, 6, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
    const building = (x, z, h) => { addBox(6.5, h, 6, MAT.predio, x, 0, z, { collide: false, cast: false }); for (let y = 2.2; y < h - 1; y += 2.4) addBox(6.56, 1.1, 6.06, MAT.janela, x, y, z, { collide: false, cast: false }); };
    for (let x = -30; x <= 30; x += 9) { building(x, -(HALF_Z + 12), 10 + (Math.abs(x * 5) % 8)); building(x, HALF_Z + 12, 9 + (Math.abs(x * 3) % 7)); }
    const ruaCars = ['opala', 'chevette', 'fiat_uno', 'kombi'];
    let ri = 0;
    for (let x = -26; x <= 26; x += 8) prop(ruaCars[ri++ % ruaCars.length], x, HALF_Z + 6, 1.6, Math.PI / 2, 0, 0, 0);
  }

  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-selvagem.png', 'or-graf-treta.png', 'or-graf-coro.png']);
  const D_BOMBA = decalIds(T, ['peca-bolha.png', 'alfabeto-bolha.png', 'alfabeto-grosso-01.png', 'tag-flop.png']);
  grafitar({
    id: 'obras_prefeitura', root, T, waypoints: nodes, seed: 6262, passo: 1.9, alcance: 8, cobre: 0.05, minLarg: 0.35,
    bandas: [
      { y0: 0.4, y1: 2.3, larg: 2.6, alturas: [1.5, 1.1, 0.8], chance: 50, pool: D_TAG },
      { y0: 0.9, y1: 2.3, larg: 1.7, alturas: [1.3, 1.0], chance: 20, fonte: 'poster', pool: (T.posterFiles || []).map((_, i) => i) },
    ],
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 81, separacao: 20 },
  });

  // Slot 0 é onde o jogador NASCE e onde o armário ancora (game.js _resetPositions):
  // em x=4 o chão do rack (z=±29,4) fica ≥ −0,01 — em x=−8 afundava a −0,11 (VM14).
  const mk = s => [4, -2, 10, -8].map(x => ({ x, z: (HALF_Z - 4) * s, yaw: s < 0 ? 0 : Math.PI }));
  const spawns = { E: mk(-1), B: mk(1) };

  /* BUG-57: obra parada cria bicho — rato no entulho, pombo no andaime. */
  const ambience = createFavelaAmbience(root, {
    map: 'obras_prefeitura',
    rats: [
      { pos: [-12, 0, -24], to: [-9.5, 0, -21.5], phase: .2 },
      { pos: [12, 0, 24], to: [9.5, 0, 21.5], phase: 1.3 },
      { pos: [-2, 0, 6], to: [.5, 0, 8.5], phase: 2.4 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-16, 0, 10], phase: .6 },
      { mode: 'ground', pos: [-14.6, 0, 9], phase: 1.0 },
    ],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.obra,pos:[0,3,0],radius:70,vol:.35},{src:AMB_LOOPS.cidade,pos:[0,3,0],radius:70,vol:.2}],bioma:'urbano'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    ctfPoints: [
      { id: 'E', label: 'CANTEIRO SUL', x: -10, z: -14 },
      { id: 'MID', label: 'A OBRA', x: 9, z: 0 },
      { id: 'B', label: 'CANTEIRO NORTE', x: -10, z: 14 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
