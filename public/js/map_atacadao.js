// Atacadão da Treta: galpão de atacado (paródia) com estacionamento ao sul (spawn E) e loja
// fechada ao norte (spawn B). Colisão só AABB. Mesmo contrato de build(scene, T) da Loja H.
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { fabricasUV } from './map_uv.js';

export const ATACADAO_PROPS = [
  'gondola_mercado', 'gondola_eletro', 'shopping_cart', 'caixa_cobranca', 'arara_roupas',
  'manequim', 'painel_tvs', 'cooler', 'pilha_pneus', 'dumpster', 'vw_9150',
  // estacionamento + entorno (bairro/cidade de fundo)
  'fileira_carros', 'kombi', 'saveiro', 'opala', 'fiat_uno', 'chevette', 'brasilia_vw', 'fusca',
  'fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio',
];

const HALF_X = 26, WALL_H = 8, PARK_H = 2.4;
const ZF = -6;    // fachada (separa estacionamento × loja)
const ZN = 33;    // fundo da loja (norte)
const ZS = -42;   // fundo do estacionamento (sul, a rua)

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

export function buildAtacadao(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  scene.add(root);

  const lam = (opts) => new THREE.MeshLambertMaterial(opts);
  const tex = (k, fallback) => (T && T[k]) ? { map: T[k] } : { color: fallback };
  const MAT = {
    piso: lam(tex('concrete', 0xcfd3d8)), parede: lam(tex('concrete', 0xb9bdc2)), metal: lam({ color: 0x9aa0a6 }),
    pilar: lam(tex('concrete', 0xdfe3e7)), pilarBase: lam({ color: 0xe0b83a }), prat: lam({ color: 0x8a9096 }),
    caixa: lam({ color: 0x2e6f9e }), esteira: lam({ color: 0x2a2d31 }), faixa: lam({ color: 0xe0b83a }),
    asfalto: lam(tex('asphalt', 0x2b2e33)), muro: lam(tex('concrete', 0xc2b8a6)), vidro: lam({ color: 0x9fd0e6, transparent: true, opacity: 0.45 }),
    predio: lam({ color: 0xa7a29a }), janela: lam({ color: 0x35404e }), faixaRua: lam({ color: 0xd8b83a }),
  };
  const PROD = [lam({ color: 0xd23b3b }), lam({ color: 0xe0b83a }), lam({ color: 0x2e8b57 }), lam({ color: 0x2e6f9e }), lam({ color: 0xe86a1e }), lam({ color: 0xe8e2d4 })];

  /* UV em metros (map_uv.js): densidade de texel pelo tamanho no mundo.
     Só muda UV — geometria, posição e colisor do autor ficam intactos. */
  const { box: geoBox, plano: geoPlano } = fabricasUV();
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(geoBox(w, h, d, mat), mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    root.add(m);
    if (opts.collide !== false) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 }); occluders.push(m); }
    return m;
  }
  function addFloor(w, d, mat, x, z, y = 0.01) { const m = new THREE.Mesh(geoPlano(w, d, mat), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; }
  const col = (x, z, hx, hz, h) => colliders.push({ minX: x - hx, maxX: x + hx, minY: 0, maxY: h, minZ: z - hz, maxZ: z + hz });
  function prop(id, x, z, targetH, ry, hx, hz, h) { const o = placeProp(id, { x, z, y: 0, targetH, ry }); if (o) { root.add(o); occluders.push(o); } if (hx) col(x, z, hx, hz, h); return o; }
  const gprop = (id, x, z, h, ry) => { const o = placeProp(id, { x, z, y: 0, targetH: h, ry }); if (o) { root.add(o); occluders.push(o); } return o; };
  const shelfUnit = (id, x, z) => { if (!gprop(id, x, z, 1.9, Math.PI / 2)) addBox(2.1, 1.9, 1.0, MAT.prat, x, 0, z); col(x, z, 1.05, 0.55, 1.9); };
  const signMesh = (w, h, tx2, x, y, z, ry) => {
    const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(w, h);
    const f = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); f.position.z = 0.02;
    const bk = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); bk.position.z = -0.02; bk.rotation.y = Math.PI;
    g.add(f, bk); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); return g;
  };
  const wX = HALF_X - 0.5;

  scene.background = new THREE.Color(0xdfe6ec); scene.fog = null;
  addFloor(HALF_X * 2, ZN - ZF, MAT.piso, 0, (ZF + ZN) / 2);       // loja
  addFloor(HALF_X * 2, ZF - ZS, MAT.asfalto, 0, (ZS + ZF) / 2);    // estacionamento

  addBox(HALF_X * 2, WALL_H, 0.8, MAT.parede, 0, 0, ZN);                          // parede norte
  for (const sx of [-1, 1]) addBox(0.8, WALL_H, ZN - ZF, MAT.parede, sx * wX, 0, (ZF + ZN) / 2);  // laterais (loja)
  addBox(HALF_X * 2, 0.4, ZN - ZF, MAT.metal, 0, WALL_H, (ZF + ZN) / 2, { collide: false, cast: false });   // teto
  { const sky = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X, (ZN - ZF) * 0.5), lam({ color: 0xdff0f7, transparent: true, opacity: 0.4 })); sky.rotation.x = Math.PI / 2; sky.position.set(0, WALL_H - 0.05, (ZF + ZN) / 2); root.add(sky); }
  for (let z = ZF + 3; z <= ZN; z += 6) addBox(HALF_X * 2, 0.3, 0.3, MAT.metal, 0, WALL_H - 0.4, z, { collide: false, cast: false });   // vigas
  for (const px of [-18, 18]) for (const pz of [2, 14, 26]) { addBox(0.7, WALL_H, 0.7, MAT.pilar, px, 0, pz); addBox(0.9, 0.5, 0.9, MAT.pilarBase, px, 0, pz, { collide: false }); }

  // A verga (minY=3) sobre os vãos das portas não pode virar colisor: barra o tiro, não o player.
  {
    const gaps = [[-15, -9], [-3, 3], [9, 15]];   // 3 vãos: esq, CENTRO (libera 2ª rota CTF2 pelo corredor central), dir
    let xc = -wX;
    for (const [g0, g1] of gaps) {
      if (g0 > xc) { addBox(g0 - xc, 2.6, 0.6, MAT.parede, (xc + g0) / 2, 0, ZF); addBox(g0 - xc, WALL_H - 2.6, 0.12, MAT.vidro, (xc + g0) / 2, 2.6, ZF, { collide: false }); }
      addBox(g1 - g0, WALL_H - 3, 0.6, MAT.parede, (g0 + g1) / 2, 3, ZF, { collide: false });   // verga sobre a porta
      xc = g1;
    }
    if (wX > xc) { addBox(wX - xc, 2.6, 0.6, MAT.parede, (xc + wX) / 2, 0, ZF); addBox(wX - xc, WALL_H - 2.6, 0.12, MAT.vidro, (xc + wX) / 2, 2.6, ZF, { collide: false }); }
    // portais de ENTRADA e SAÍDA
    signMesh(5.4, 1.0, signTex('#1f5fbf', '#ffffff', 'ENTRADA', 'ENTRE E TRETE', 640, 160), -12, 3.3, ZF - 0.1, 0);
    signMesh(5.4, 1.0, signTex('#1f5fbf', '#ffffff', 'SAÍDA', 'JÁ VAI?', 640, 160), 12, 3.3, ZF - 0.1, 0);
    // letreiro grande ATACADÃO acima da vitrine (vê da rua e de dentro)
    signMesh(16, 3.0, signTex('#c0392b', '#ffd23f', 'ATACADÃO DA TRETA', 'PREÇO DE ATACADO... OU NEM TANTO', 900, 180), 0, 6.4, ZF, 0);
  }
  // parede de fundo (norte) também com o letreiro
  signMesh(16, 3.0, signTex('#c0392b', '#ffd23f', 'ATACADÃO DA TRETA', 'ABERTO ATÉ A TRETA ACABAR', 900, 180), 0, 5.6, ZN - 0.5, Math.PI);

  const PLACA_CORR = ['MERCEARIA', 'BEBIDAS', 'LIMPEZA', 'HORTIFRÚTI', 'BAZAR'];
  for (let r = 0; r < 5; r++) {
    const z = 3 + r * 6;                                                          // fileiras z = 3,9,15,21,27
    const id = r === 2 ? 'gondola_eletro' : 'gondola_mercado';
    for (const gx of [-7.4, -5.26, -3.12, 3.12, 5.26, 7.4]) shelfUnit(id, gx, z);  // 3+3, vão central x∈[-2,2]
    signMesh(2.4, 0.7, signTex('#1f5fbf', '#ffffff', PLACA_CORR[r % PLACA_CORR.length], '', 512, 150), 0, 2.9, z, Math.PI / 2);
  }
  for (const sx of [-1, 1]) for (const z of [4, 10, 16, 22, 28]) shelfUnit(sx > 0 ? 'gondola_mercado' : 'gondola_eletro', sx * 15, z);   // fileiras laterais

  for (const cx of [-7.5, -3.75, 3.75, 7.5]) {   // caixas fora das portas (±12) E do vão central (x=0) — senão bloqueia a 2ª rota (CTF2)
    addBox(1.4, 1.0, 2.6, MAT.caixa, cx, 0, ZF + 4);
    addBox(2.4, 0.06, 0.5, MAT.esteira, cx, 1.0, ZF + 5.4, { collide: false });
    signMesh(0.7, 1.0, signTex('#111417', '#ff4d4d', 'CAIXA', '99', 260, 360), cx + 0.9, 2.2, ZF + 5.2, 0);
  }
  for (const [cx, cz] of [[-9, ZF + 2], [3, ZF + 2.5], [10, ZF + 1.5]]) prop('shopping_cart', cx, cz, 1.0, (cx * 7) % 3, 0.5, 0.6, 0.9);

  prop('painel_tvs', -22, 12, 2.2, Math.PI / 2, 1.2, 0.4, 2.2);
  prop('gondola_eletro', -22, 18, 2.0, Math.PI / 2, 1.4, 0.6, 2.0);
  for (const az of [8, 16, 24]) prop('arara_roupas', 22, az, 1.9, -Math.PI / 2, 0.9, 0.6, 1.8);
  prop('manequim', 20.5, 12, 1.8, -Math.PI / 2, 0.4, 0.4, 1.8);
  for (const [cx, cz] of [[-22, 28], [22, 30]]) prop('cooler', cx, cz, 1.3, 0, 0.8, 0.6, 1.2);
  prop('pilha_pneus', 22, 2, 1.5, 0, 1.0, 1.0, 1.4);

  for (const [dx, dz] of [[-21, 28], [-21, 24], [21, 28]]) { addBox(1.6, 1.5, 1.6, PROD[(Math.abs(dx) | 0) % PROD.length], dx, 0, dz); addBox(1.7, 0.2, 1.7, MAT.metal, dx, 0, dz, { collide: false }); }
  prop('dumpster', 21, 24, 1.7, 0, 1.4, 1.0, 1.6);

  const promo = ['LEVE 3 PAGUE 5', 'ARROZ R$ 49,90', 'SÓ HOJE: MAIS CARO', 'FEIJÃO A OURO'];
  promo.forEach((t, i) => { const px = [-16, 16, -16, 16][i], pz = [8, 8, 22, 22][i]; addBox(0.1, 1.6, 0.1, MAT.metal, px, 0, pz, { collide: false }); signMesh(2.4, 1.0, signTex('#e0b83a', '#c0392b', t, '', 512, 220), px, 2.2, pz, Math.PI / 2); });

  for (const sx of [-1, 1]) addBox(0.6, PARK_H, ZF - ZS, MAT.muro, sx * wX, 0, (ZS + ZF) / 2);   // muros laterais baixos
  // muro do fundo com VÃOS de ENTRADA (x∈[-14,-8]) e SAÍDA (x∈[8,14]): a saída de carro pra rua
  { const gaps = [[-14, -8], [8, 14]]; let xc = -wX; for (const [g0, g1] of gaps) { if (g0 > xc) addBox(g0 - xc, PARK_H, 0.6, MAT.muro, (xc + g0) / 2, 0, ZS); xc = g1; } if (wX > xc) addBox(wX - xc, PARK_H, 0.6, MAT.muro, (xc + wX) / 2, 0, ZS); }
  // RUA além do muro (backdrop): só asfalto + faixa central (os carros vêm do laço de trânsito abaixo)
  { const rua = new THREE.Mesh(geoPlano(HALF_X * 2 + 30, 18, MAT.asfalto), MAT.asfalto); rua.rotation.x = -Math.PI / 2; rua.position.set(0, 0.02, ZS - 9); root.add(rua);
    for (let x = -28; x <= 28; x += 4) addBox(2.2, 0.02, 0.35, MAT.faixa, x, 0.03, ZS - 9, { collide: false, cast: false }); }   // faixa central da rua (ao longo de X)
  const cars = ['kombi', 'saveiro', 'opala', 'fiat_uno', 'chevette', 'brasilia_vw'];
  let cix = 0;
  for (const fz of [ZF - 8, ZF - 16, ZF - 24]) {                                                  // 3 fileiras de vaga
    for (let x = -22; x <= 22; x += 5.2) addBox(0.14, 0.02, 4.4, MAT.faixa, x, 0.03, fz, { collide: false, cast: false });
    for (let x = -19.5; x <= 19.5; x += 5.2) prop(cars[cix++ % cars.length], x, fz, 1.6, (cix % 2) ? 0 : Math.PI, 1.0, 2.1, 1.5);   // carros COLIDEM (cover)
  }
  prop('fileira_carros', 0, ZS + 3, 2.0, 0, 1.6, 6, 1.9);
  // faixa de pedestre da fachada (entrada da loja)
  for (let i = -3; i <= 3; i++) addBox(0.5, 0.02, 2.4, lam({ color: 0xd8d2c0 }), i * 0.9, 0.04, ZF - 3, { collide: false, cast: false });
  // portais de ENTRADA/SAÍDA na rua (sul)
  for (const [sx, txt, sub] of [[-1, 'ENTRADA', 'ESTACIONE E TRETE'], [1, 'SAÍDA', 'DIRIJA COM TRETA']]) {
    for (const d of [-2.8, 2.8]) addBox(0.3, 4.4, 0.3, MAT.metal, sx * 11 + d, 0, ZS + 1.5, { collide: false });
    addBox(6, 0.4, 0.4, MAT.metal, sx * 11, 4.4, ZS + 1.5, { collide: false });
    signMesh(5.4, 1.3, signTex('#1f5fbf', '#ffffff', txt, sub, 640, 200), sx * 11, 3.4, ZS + 1.5, 0);
  }

  // Entorno é backdrop: fica fora dos bounds e sem colisor, o player vê mas não alcança.
  {
    const casas = ['fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio'];
    let hi = 0;
    // favela dos LADOS (bem AFASTADA dos muros, x=±36, casas baixas pra não invadir)
    for (const sx of [-1, 1]) for (let z = ZS + 6; z <= ZF - 4; z += 7) prop(casas[hi++ % casas.length], sx * (HALF_X + 11), z, 6, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
    // casas atrás da LOJA (bem ao NORTE, longe do telhado)
    for (let x = -18; x <= 18; x += 9) prop(casas[hi++ % casas.length], x, ZN + 14, 6, Math.PI);
    // PRÉDIOS do outro lado da RUA (skyline procedural, ALÉM do asfalto — não na rua)
    const building = (x, z, w, d, h) => {
      addBox(w, h, d, MAT.predio, x, 0, z, { collide: false, cast: false });
      for (let y = 2.2; y < h - 1; y += 2.4) addBox(w + 0.06, 1.1, d + 0.06, MAT.janela, x, y, z, { collide: false, cast: false });
    };
    for (let x = -34; x <= 34; x += 8.5) building(x, ZS - 27, 6.5, 6, 9 + (Math.abs(x * 5) % 9));
    // TRÂNSITO na rua (dois sentidos), SÓ carros (nada de prédio na pista)
    const ruaCars = ['opala', 'chevette', 'fiat_uno', 'saveiro', 'brasilia_vw', 'kombi', 'fusca'];
    let ri = 0;
    for (let x = -30; x <= 30; x += 6.5) prop(ruaCars[ri++ % ruaCars.length], x, ZS - 9 + (ri % 2 ? 3.2 : -3.2), 1.6, (ri % 2) ? Math.PI / 2 : -Math.PI / 2, 0, 0, 0);
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
    g.position.set(x, 0.02, z); g.rotation.y = yaw; g.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(g); return g;
  }
  const place = (kind, x, z, yaw = 0) => { const mesh = buildGun(kind, x, z, yaw); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh }); };
  const ARSENAL = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
  // Time E (estacionamento): perto do spawn, entre os carros. x pula [-2,2] (estrutura
  // do fundo do estacionamento — colisor x[-1.6..1.6] z[-45..-33]; x=0 enterrava o shotgun).
  const EX = [-12, -9, -6, -3, 3, 6, 9];
  ARSENAL.forEach((k, i) => place(k, EX[i], ZS + 7, 0));
  // Time B (loja): perto do fundo
  ARSENAL.forEach((k, i) => place(k, -9 + i * 3, ZN - 4, Math.PI));
  // disputadas na fachada (a porta)
  place('ak', -12, ZF - 1, 0); place('m4', 12, ZF - 1, 0);

  const hemi = new THREE.HemisphereLight(0xf2f7fb, 0xc0c6cc, 1.25); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(-12, 42, -20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -36; sun.shadow.camera.right = 36; sun.shadow.camera.top = 46; sun.shadow.camera.bottom = -46;
  sun.shadow.camera.far = 150; sun.shadow.bias = -0.0004; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfeeff, 0.5); fill.position.set(14, 30, 20); scene.add(fill);

  const groundHeightAt = () => 0;
  const slowAt = () => false;

  const nodes = [], adj = [];
  const STEP = 3.2;
  const B = { minX: -HALF_X + 2, maxX: HALF_X - 2, minZ: ZS + 2, maxZ: ZN - 2 };
  const blocked = (x, z, inflate) => { for (const c of colliders) if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.6 && c.maxY > 0.15) return true; return false; };
  for (let gx = B.minX; gx <= B.maxX; gx += STEP) for (let gz = B.minZ; gz <= B.maxZ; gz += STEP) if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; } return true; };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, d2 = dx * dx + dz * dz; if (d2 < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z) { let best = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1); const q = [fromIdx]; prev[fromIdx] = fromIdx;
    while (q.length) { const n = q.shift(); for (const m of adj[n]) if (prev[m] === -1) { prev[m] = n; if (m === toIdx) { const path = [m]; let c = n; while (c !== fromIdx) { path.unshift(c); c = prev[c]; } path.unshift(fromIdx); return path; } q.push(m); } }
    return [fromIdx];
  }

  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-selvagem.png', 'or-graf-treta.png', 'or-graf-coro.png']);
  const D_BOMBA = decalIds(T, ['peca-bolha.png', 'alfabeto-bolha.png', 'alfabeto-grosso-01.png', 'tag-flop.png']);
  grafitar({
    id: 'atacadao_treta', root, T, waypoints: nodes, seed: 5151, passo: 2.0, alcance: 8, cobre: 0.05, minLarg: 0.35,
    bandas: [
      { y0: 0.9, y1: 2.4, larg: 1.7, alturas: [1.4, 1.1], chance: 18, fonte: 'poster', pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.5, y1: 2.5, larg: 2.6, alturas: [1.5, 1.1, 0.8], chance: 45, pool: D_TAG },
      { y0: 4.5, y1: 7.0, larg: 3.6, alturas: [1.6, 1.1], chance: 55, pool: D_BOMBA.concat(D_TAG) },
    ],
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 71, separacao: 18 },
  });

  const spawns = {
    E: [6, 14, -6, -14].map(x => ({ x, z: ZS + 5, yaw: 0 })),     // estacionamento, olhando pra loja
    B: [-8, -2, 4, 10].map(x => ({ x, z: ZN - 4, yaw: Math.PI })), // loja, olhando pra fachada
  };

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    ctfPoints: [
      { id: 'E', label: 'ESTACIONAMENTO', x: -8, z: ZS + 12 },
      { id: 'MID', label: 'PORTA', x: 10, z: ZF - 2 },
      { id: 'B', label: 'DOCA', x: -8, z: ZN - 9 },   // corredor entre fileiras; ZN-6 caía dentro da gôndola
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: ZS + 1, maxZ: ZN - 1 },
  };
}
