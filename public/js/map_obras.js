// Obras da Prefeitura: canteiro de obra eterna (paródia), simétrico em z=0 (E ao sul, B ao
// norte). Colisão só AABB. Mesmo contrato build(scene, T) da Loja H.
import * as THREE from 'three';
import { placeProp, PropBatch, InstBatch } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

export const OBRAS_PROPS = [
  'construction_rubble', 'guindaste', 'concrete_roadblock', 'jersey_barrier', 'sandbags',
  'dumpster', 'botijao_gas', 'pilha_pneus', 'vw_9150', 'kombi',
  'junkyard_container', 'caixa_dagua_azul', 'tent',
  // entorno
  'fav_house', 'fav_modular', 'fachada_comercio', 'opala', 'fiat_uno', 'chevette',
];

const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
// TEXEL4 reprova superfície horizontal com anisotropia abaixo do mínimo; toda textura de
// canvas deste mapa sai daqui já com o valor.
const ANISO = 8;
const aniso = (t) => { t.anisotropy = ANISO; return t; };
const cvs = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const canvasTex = (c, tile) => {
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (tile) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return aniso(t);
};

const HALF_X = 28, HALF_Z = 35;

function signTex(bg, fg, title, sub, W = 512, H = 160) {
  const c = cvs(W, H);
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = fg; x.lineWidth = W * 0.02; x.strokeRect(W * 0.015, H * 0.05, W * 0.97, H * 0.9);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg;
  const pad = W * 0.08;
  const fit = (t, base, fam) => { let fs = base; x.font = `bold ${fs}px ${fam}`; while (x.measureText(t).width > W - pad && fs > 8) { fs -= 2; x.font = `bold ${fs}px ${fam}`; } };
  fit(title, H * 0.42, '"Arial Black",Impact,sans-serif'); x.fillText(title, W / 2, sub ? H * 0.4 : H * 0.5);
  if (sub) { fit(sub, H * 0.2, 'Arial,sans-serif'); x.fillText(sub, W / 2, H * 0.72); }
  return canvasTex(c, false);
}
// placa de obra da prefeitura: o gabarito oficial (verba, prazo, recurso) em faixa azul/amarela
function placaObraTex() {
  const W = 512, H = 340, c = cvs(W, H), x = c.getContext('2d');
  x.fillStyle = '#f2f0e8'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1a4d8f'; x.fillRect(0, 0, W, 78);
  x.fillStyle = '#ffd23f'; x.fillRect(0, 78, W, 10);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = '#ffd23f'; x.font = 'bold 34px "Arial Black",Impact,sans-serif';
  x.fillText('PREFEITURA', W / 2, 30);
  x.font = 'bold 20px Arial,sans-serif'; x.fillText('SECRETARIA DE OBRAS E SERVIÇOS', W / 2, 60);
  x.textAlign = 'left'; x.fillStyle = '#17253a';
  const linhas = [
    ['OBRA:', 'REQUALIFICAÇÃO DO CANTEIRO CENTRAL'],
    ['VALOR:', 'R$ 48.212.900,00'],
    ['PRAZO:', '18 MESES'],
    ['TÉRMINO PREVISTO:', '12/03/2019'],
    ['RECURSO:', 'EMENDA PARLAMENTAR'],
  ];
  linhas.forEach(([k, v], i) => {
    const y = 116 + i * 44;
    x.font = 'bold 19px Arial,sans-serif'; x.fillStyle = '#5a6472'; x.fillText(k, 26, y);
    x.font = 'bold 23px Arial,sans-serif'; x.fillStyle = '#17253a'; x.fillText(v, 214, y);
  });
  x.strokeStyle = '#1a4d8f'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6);
  return canvasTex(c, false);
}
// listra de perigo amarela/preta (a cara de canteiro de obra)
function hazardTex() {
  const c = cvs(128, 32); const x = c.getContext('2d');
  x.fillStyle = '#e8b81a'; x.fillRect(0, 0, 128, 32);
  x.fillStyle = '#1a1a1a'; for (let i = -32; i < 160; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 16, 0); x.lineTo(i - 16, 32); x.lineTo(i - 32, 32); x.closePath(); x.fill(); }
  const t = canvasTex(c, true); t.repeat.set(6, 1);
  return t;
}
/* As três texturas que tiram 13.700 m² de cor chapada do mapa (SUP2). Todas TILAM: com
   `aoBoxGeo`+`aoMat` a UV sai em metros (128 px/m), então 1 volta = 2 m de mundo. */
function fachadaTex() {
  const c = cvs(256, 256), x = c.getContext('2d');
  x.fillStyle = '#a7a29a'; x.fillRect(0, 0, 256, 256);
  x.fillStyle = 'rgba(116,110,100,0.22)';                                  // escorrido de chuva
  for (let i = 0; i < 28; i++) x.fillRect((i * 37) % 256, (i * 61) % 190, 3, 46 + (i % 5) * 24);
  x.fillStyle = '#8e8a82'; x.fillRect(44, 50, 168, 138);                   // requadro da janela
  x.fillStyle = '#35404e'; x.fillRect(52, 58, 152, 122);                   // vidro
  x.fillStyle = '#4c5a6b'; x.fillRect(52, 58, 152, 34);                    // céu refletido em cima
  x.fillStyle = '#8e8a82'; x.fillRect(124, 58, 8, 122); x.fillRect(52, 112, 152, 7);   // caixilho
  x.fillStyle = '#b8b2a8'; x.fillRect(36, 188, 184, 11);                   // peitoril
  x.fillStyle = 'rgba(40,36,30,0.18)'; x.fillRect(36, 199, 184, 5);
  return canvasTex(c, true);
}
function tapumeTex() {
  const c = cvs(256, 128), x = c.getContext('2d');
  x.fillStyle = '#2f5fa8'; x.fillRect(0, 0, 256, 128);
  x.fillStyle = 'rgba(255,255,255,0.055)';                                 // veio do compensado
  for (let i = 0; i < 26; i++) x.fillRect(0, (i * 19) % 128, 256, 1);
  x.fillStyle = '#20406f'; x.fillRect(0, 0, 3, 128); x.fillRect(126, 0, 3, 128);   // junta de folha
  x.fillStyle = 'rgba(18,30,52,0.32)';                                     // respingo e maresia
  for (let i = 0; i < 16; i++) x.fillRect((i * 53) % 248, (i * 91) % 118, 6 + (i % 4) * 6, 3 + (i % 3) * 5);
  x.fillStyle = 'rgba(228,232,238,0.10)'; x.fillRect(0, 104, 256, 24);     // barra de poeira no pé
  return canvasTex(c, true);
}
function tabuaTex() {
  const c = cvs(128, 128), x = c.getContext('2d');
  x.fillStyle = '#9c7b4a'; x.fillRect(0, 0, 128, 128);
  const tons = ['#a8875a', '#8d6d3f', '#a07e4d', '#94743f'];
  for (let i = 0; i < 4; i++) {
    x.fillStyle = tons[i]; x.fillRect(0, i * 32, 128, 30);
    x.fillStyle = '#5d451f'; x.fillRect(0, i * 32 + 30, 128, 2);           // junta entre tábuas
    x.fillStyle = 'rgba(70,52,24,0.30)';
    for (let k = 0; k < 5; k++) x.fillRect((i * 23 + k * 27) % 120, i * 32 + 4 + (k % 4) * 6, 22 + (k % 3) * 14, 1);
    x.fillStyle = '#4a3a22'; x.fillRect(6 + i * 29, i * 32 + 13, 3, 3); x.fillRect(104 - i * 17, i * 32 + 15, 3, 3);   // prego
  }
  return canvasTex(c, true);
}
function lonaTex() {
  const c = cvs(128, 128), x = c.getContext('2d');
  x.fillStyle = '#2f8b57'; x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(255,255,255,0.09)';
  for (let i = 0; i < 64; i += 4) { x.fillRect(i, 0, 2, 128); x.fillRect(0, i * 2, 128, 2); }   // trama
  x.fillStyle = 'rgba(16,58,36,0.35)';
  for (let i = 0; i < 10; i++) x.fillRect((i * 41) % 120, (i * 67) % 120, 3, 26 + (i % 3) * 18);
  x.fillStyle = '#6f6a60';                                                 // ilhós
  for (let i = 0; i < 4; i++) { x.fillRect(4, 10 + i * 34, 6, 6); x.fillRect(118, 10 + i * 34, 6, 6); }
  return canvasTex(c, true);
}

export function buildObras(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  scene.add(root);

  const lam = (opts) => new THREE.MeshLambertMaterial(opts);
  const tex = (k, fallback) => (T && T[k]) ? { map: T[k] } : { color: fallback };
  // `map` × cor: a chave de textura existe e a cor vira tinta sobre ela (SUP1/SUP2).
  const texCor = (k, cor) => (T && T[k]) ? { map: T[k], color: cor } : { color: cor };
  const MAT = {
    terra: lam(tex('dirt', 0x6f5a42)), concreto: lam(tex('concrete', 0x9aa0a6)), asfalto: lam(tex('asphalt', 0x2b2e33)),
    concRaw: lam(texCor('concrete', 0xe2d9c3)), rebar: lam(texCor('metal', 0xd8a868)), metal: lam(tex('metal', 0x9aa0a6)),
    tapume: lam({ map: tapumeTex() }), tabua: lam({ map: tabuaTex() }), areia: lam(texCor('dirt', 0xe8d7a6)),
    hazard: lam({ map: hazardTex() }), predio: lam({ map: fachadaTex() }),
    caixaDagua: lam(texCor('concrete', 0x4f86c6)), tambor: lam(texCor('metal', 0xf6c04a)),
    cone: lam(texCor('concrete', 0xf07030)),
    lona: lam({ map: lonaTex(), transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  };
  const RUBB = [lam(texCor('concrete', 0xcfc6ba)), lam(texCor('dirt', 0xa78a66)), lam(texCor('concrete', 0xe8ded0))];

  // O grafo de waypoints depende destes dois números: exclui célula < -1,0 m e corta ladeira > 0,7 m.
  const PITS = [[-7, -15, 7, 1.6], [12, -2, 6.5, 1.5], [-13, 12, 6, 1.4], [8, 20, 6.5, 1.5]];
  function groundHeightAt(x, z) {
    const edge = Math.max(0, Math.min(1, (HALF_X - 3 - Math.abs(x)) / 7)) * Math.max(0, Math.min(1, (HALF_Z - 3 - Math.abs(z)) / 7));
    let h = (Math.sin(x * 0.17) * 0.3 + Math.sin(z * 0.15 + 1.3) * 0.3 + Math.sin((x + z) * 0.09) * 0.18) * edge;
    for (const [cx, cz, r, d] of PITS) { const dist = Math.hypot(x - cx, z - cz); if (dist < r) h -= d * (0.5 + 0.5 * Math.cos(Math.PI * dist / r)); }
    return h;
  }
  const gy = (x, z) => groundHeightAt(x, z);

  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  /* Colisor de caixa GIRADA (idioma de map_atacadao.js:91). Sem `ry/cx/cz/hx/hz` o
     `_collideRot` não roda e o jogador é empurrado pela AABB — ar sólido na quina. */
  function colRot(cx, cz, hx, hz, minY, maxY, ry) {
    if (!ry) { colliders.push({ minX: cx - hx, maxX: cx + hx, minY, maxY, minZ: cz - hz, maxZ: cz + hz }); return; }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const ax = Math.abs(hx * cs) + Math.abs(hz * sn), az = Math.abs(hx * sn) + Math.abs(hz * cs);
    colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az, ry, cx, cz, hx, hz, cos: cs, sin: sn });
  }
  /* Occluder é MALHA VISÍVEL, nunca Group: bala (game.js:3310), LOS de bot (:5914) e
     auto-mira (:2101) usam `intersectObjects(occluders, false)` — Group não tem geometria.
     E aqui TODA caixa desenhada entra, tenha colisor ou não: era o `collide:false` que
     deixava laje, lona, faixa e andaime transparentes para o tiro. */
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && mat && mat.visible !== false && !opts.rz;
    const solo = onGround(y, h) && !opts.ry && !opts.rz;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry; if (opts.rz) m.rotation.z = opts.rz;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, 0);
    root.add(m);
    if (opts.occ !== false) occluders.push(m);
    if (opts.collide !== false) colRot(x, z, w / 2, d / 2, y, y + h, opts.ry || 0);
    return m;
  }
  function addFloor(w, d, mat, x, z, y = 0.01) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; }
  const col = (x, z, hx, hz, h, ry = 0) => { const y0 = gy(x, z); colRot(x, z, hx, hz, y0, y0 + h, ry); };
  const occMesh = (o) => { if (!o) return o; o.traverse((m) => { if (m.isMesh) occluders.push(m); }); return o; };
  /* Procuração invisível para o GLB PESADO (guindaste, caminhão, contêiner): o raycast é
     não-recursivo e levar centenas de malhas de GLB para a lista custa por tiro.
     `userData.proxyGLB` é a marca que a MAP4 pula — em node nenhum GLB carrega. */
  const invis = new THREE.MeshBasicMaterial({ visible: false });
  function occBox(w, h, d, x, y, z, ry, id) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), invis);
    b.position.set(x, y + h / 2, z); b.rotation.y = ry || 0; b.userData.proxyGLB = id;
    root.add(b); occluders.push(b); return b;
  }
  /* `hx/hz` continuam sendo extensões de MUNDO (é como as 12 chamadas de :275 foram escritas);
     `proxy` é [w, h, d, ry] no eixo LOCAL da peça — só para o GLB pesado. */
  function prop(id, x, z, targetH, ry, hx, hz, h, proxy) {
    const o = placeProp(id, { x, z, y: gy(x, z), targetH, ry });
    if (o) { root.add(o); if (!proxy) occMesh(o); }
    if (proxy) occBox(proxy[0], proxy[1], proxy[2], x, gy(x, z), z, proxy[3] || 0, id);
    if (hx) col(x, z, hx, hz, h);
    return o;
  }
  /* Peça GLB grande e GIRADA (contêiner, caminhão): colisor no eixo da PRÓPRIA peça e
     procuração de bala do mesmo tamanho — colisão e tiro concordam sobre onde a lataria está.
     Nos modelos deste catálogo o comprimento está no Z LOCAL (map_quebrada.js:1251). */
  const pecaGLB = (id, x, z, w, h, d, ry) => {
    const b = gy(x, z);
    const o = placeProp(id, { x, z, y: b, targetH: h, targetLen: Math.max(w, d), ry });
    if (o) root.add(o);
    occBox(w, h, d, x, b, z, ry, id);
    colRot(x, z, w / 2, d / 2, b, b + h, ry);
    return o;
  };
  const signMesh = (w, h, tx2, x, y, z, ry) => {
    const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(w, h);
    const f = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); f.position.z = 0.02;
    const bk = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); bk.position.z = -0.02; bk.rotation.y = Math.PI;
    g.add(f, bk); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); occMesh(g); return g;
  };
  // placa em poste (mastro termina na base — não corta o texto)
  const postSign = (x, z, cy, w, h, tx2, ry) => { const b = groundHeightAt(x, z); addBox(0.16, cy - h / 2, 0.16, MAT.metal, x, b, z); signMesh(w, h, tx2, x, b + cy, z, ry); };
  const PLACA_OBRA_TEX = placaObraTex();
  /* Placa de obra oficial: painel em DOIS postes (é o gabarito da prefeitura, não um aviso
     de poste único) — e o "TÉRMINO PREVISTO: 12/03/2019" é a piada que os avisos de :151
     já contam sem o objeto certo. */
  const placaObra = (x, z, ry) => {
    const b = groundHeightAt(x, z), cs = Math.cos(ry), sn = Math.sin(ry);
    for (const lx of [-0.6, 0.6]) addBox(0.16, 3.4, 0.16, MAT.metal, x + lx * cs, b, z - lx * sn);
    signMesh(2.4, 1.6, PLACA_OBRA_TEX, x, b + 2.5, z, ry);
  };
  const wX = HALF_X - 0.5, wZ = HALF_Z - 0.5;

  /* Céu de SP encoberto: obra de prefeitura parada não acontece em dia de cartão-postal.
     A névoa fecha na MESMA cor do horizonte (look-check mede ΔE76 névoa↔horizonte). */
  setMapSky(scene, T, '/img/textures/sky_sp.webp', 0xd6dad9);
  scene.fog = new THREE.Fog(0xd6dad9, 70, 160);
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
  /* TAPUME DO CANTEIRO (§1.2): tira o respawn da linha de tiro do mapa inteiro. DUAS saídas
     por lado, e cada uma cai numa coluna de waypoint LIVRE (x −16,4 e 12,4) — o `blocked()`
     de :194 infla 0,5 m, então painel colado no nó fecha a porta para o bot e não para o
     jogador. O flanco oeste PARA na linha da frente (z ∓26): a primeira versão o levava até
     z ∓21,5 e as duas saídas desembocavam no MESMO corredor leste — CTF2 caiu de 4 rotas
     separadas para 1, que é reprovação dura. Medido: com o flanco curto volta a 3/4. */
  for (const sz of [-1, 1]) {
    tapume(24.0, 0.25, -2, sz * 26);          // frente oeste-centro: x −14…10
    tapume(14.0, 0.25, 20.5, sz * 26);        // frente leste: x 13,5…27,5 (encosta no perímetro)
    tapume(0.25, 8.5, -17.2, sz * 30.25);     // flanco oeste: z ∓26…∓34,5
  }
  // portão + letreiro OBRAS DA PREFEITURA na entrada norte e sul
  for (const sz of [-1, 1]) signMesh(14, 2.4, signTex('#1a4d8f', '#ffd23f', 'OBRAS DA PREFEITURA', 'PREVISÃO DE ENTREGA: 2050', 820, 160), 0, 4.2, sz * (wZ - 0.2), sz < 0 ? 0 : Math.PI);

  // pilares só nos CANTOS (2×2) — o miolo fica ABERTO pra atravessar (o eixo do duelo)
  for (const px of [-8, 8]) for (const pz of [-8, 8]) {
    addBox(0.8, 6, 0.8, MAT.concRaw, px, gy(px, pz), pz);
    for (const [rx, rz] of [[-0.22, -0.22], [0.22, 0.22], [-0.22, 0.22]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), MAT.rebar); r.position.set(px + rx, gy(px, pz) + 6.45, pz + rz); root.add(r); occluders.push(r); }
  }
  addBox(18, 0.4, 8, MAT.concRaw, 0, 4.2, -8, { collide: false, cast: false });   // laje parcial ao NORTE (não sobre o vão central)
  for (let z = -9; z <= -7; z += 1) addBox(18, 0.12, 0.12, MAT.rebar, 0, 4.7, z, { collide: false, cast: false });   // vergalhões
  /* A rampa de tábua decorativa que estava aqui (3 × 0,16 × 5 em (9; 1,5; 2), `rz:-0.5`,
     `collide:false`) FOI REMOVIDA: era a causa exata dos 8 pontos de MAP1 — varria de
     y≈0,8 a 2,3 m sobre chão andável, com a bandeira MID (9,0) no pé dela. */
  // lona verde de obra pendurada num lado da estrutura
  { const lo = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), MAT.lona); lo.position.set(-8.1, 3, -3.5); lo.rotation.y = Math.PI / 2; root.add(lo); occluders.push(lo); }

  const scaffold = (x, z, w, d, h) => {
    const b = gy(x, z);
    for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) addBox(0.14, h, 0.14, MAT.metal, x + dx, gy(x + dx, z + dz), z + dz);   // montantes (colidem)
    for (let y = 1.9; y < h; y += 1.9) { addBox(w, 0.08, 0.08, MAT.metal, x, b + y, z - d / 2, { collide: false }); addBox(w, 0.08, 0.08, MAT.metal, x, b + y, z + d / 2, { collide: false }); addBox(w, 0.1, d, MAT.tabua, x, b + y, z, { collide: false, cast: false }); }
  };
  scaffold(-16, -8, 3, 2, 5.7); scaffold(-16, 8, 3, 2, 5.7); scaffold(16, 6, 3, 2, 5.7);

  const monteAreia = (x, z, r) => { const m = new THREE.Mesh(new THREE.ConeGeometry(r, r * 0.8, 12), MAT.areia); m.position.set(x, gy(x, z) + r * 0.4, z); m.castShadow = true; root.add(m); occluders.push(m); col(x, z, r * 0.8, r * 0.8, r * 0.6); };
  // a PILHA inteira gira (ORT1): o cano solto girado em Y é a mesma imagem, a pilha não.
  const canos = (x, z, ry) => {
    const b = gy(x, z), g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2 - (i % 2); j++) {
      const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 3.6, 12), MAT.concreto);
      c2.rotation.x = Math.PI / 2; c2.position.set((j - (i % 2) * 0.5) * 0.75, b + 0.35 + i * 0.62, 0);
      c2.castShadow = true; g.add(c2); occluders.push(c2);
    }
    colRot(x, z, 1.0, 1.8, b, b + 1.8, ry);
  };
  const blocos = (x, z) => { const b = gy(x, z); addBox(1.6, 1.1, 1.2, MAT.concRaw, x, b, z); addBox(1.2, 0.5, 1.0, RUBB[0], x, b + 1.1, z, { collide: false }); };
  const betoneira = (x, z, ry) => {
    const b = gy(x, z);
    addBox(1.0, 0.7, 1.4, MAT.metal, x, b, z, { ry, collide: false });
    const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 1.2, 12), MAT.tambor);
    tb.rotation.set(0, ry, 0.5); tb.position.set(x, b + 1.2, z); tb.castShadow = true; root.add(tb); occluders.push(tb);
    colRot(x, z, 0.5, 0.7, b, b + 1.4, ry);
  };
  for (const sz of [-1, 1]) {
    // areia FORA das covas (§1.5a): o cone de r 2,4 em (−12, ±14) cobria as duas bandeiras
    monteAreia(-14, sz * 19, 2.4); monteAreia(14, sz * 16, 2.2);
    canos(20, sz * 4, sz > 0 ? 0.23 : 0.58); blocos(-4, sz * 12); blocos(6, sz * 18);
    prop('construction_rubble', 10, sz * 10, 1.4, sz, 1.3, 1.3, 1.3);
    prop('jersey_barrier', -14, sz * 4, 1.0, 0, 0.5, 1.6, 1.0);
    prop('jersey_barrier', 2, sz * 8, 1.0, Math.PI / 2, 1.6, 0.5, 1.0);
    prop('sandbags', 16, sz * 24, 0.9, 0, 1.6, 0.8, 0.8);
    prop('concrete_roadblock', -8, sz * 22, 1.0, 0, 1.2, 0.5, 1.0);
    prop('botijao_gas', 18, sz * 10, 0.9, 0, 1.2, 0.7, 0.9);
    betoneira(-11, sz * 19.5, sz > 0 ? 0.61 : 0.37);   // betoneiras nº 2 e nº 3
  }
  // guindaste (marco) num canto + caminhão de obra + dumpster de entulho + betoneira
  prop('guindaste', -20, 22, 8, 0.4, 2.0, 2.0, 3.0, [2.6, 8.0, 2.6, 0]);
  prop('vw_9150', 20, -22, 3.2, Math.PI / 2, 3.4, 1.2, 3.0, [2.5, 3.0, 6.6, Math.PI / 2]);
  prop('dumpster', 22, 26, 1.7, 0, 1.4, 1.0, 1.6);
  prop('pilha_pneus', -20, -12, 1.5, 0, 1.0, 1.0, 1.4);
  betoneira(-18, 2, 0.33);
  // banheiro químico (procedural, azul)
  addBox(1.1, 2.2, 1.1, lam(texCor('metal', 0x4f8fd0)), 24, gy(24, 0), 0);

  const avisos = [['OBRA PARADA', ''], ['DESCULPE O TRANSTORNO', 'OU NEM TANTO'], ['A VERBA ACABOU', ''], ['HOMEM (NÃO) TRABALHANDO', ''], ['DESVIO', 'DE DINHEIRO PÚBLICO'], ['EM BREVE', '2050']];
  avisos.forEach(([t, sub], i) => { const px = [-18, 18, -6, 6, -14, 14][i], pz = [-6, -10, 26, -26, 18, 6][i]; postSign(px, pz, 2.3, 3.4, 1.1, signTex('#e8b81a', '#1a1a1a', t, sub, 512, 210), (i % 2) ? Math.PI / 2 : 0); });
  // cones laranja espalhados (NÃO giram: cone girado em Y é a mesma imagem — ORT1 premiaria o nada)
  for (const [cx, cz] of [[0, -4], [10, 2], [-2, 6], [8, 14], [2, -14], [-10, 0], [14, -8], [-6, -20]]) {
    const cb = gy(cx, cz); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), MAT.cone); cone.position.set(cx, cb + 0.35, cz); cone.castShadow = true; root.add(cone); occluders.push(cone);
    addBox(0.5, 0.05, 0.5, MAT.hazard, cx, cb + 0.02, cz, { collide: false, cast: false });
  }

  /* ===================== ESCORAMENTO DAS CAVAS (§1.5i / §3.3a-b) =====================
     A cava deixa de ser bacia lisa de cosseno e vira VALA ESCORADA: 1,15 m de prancha acima
     do terreno local (cobertura de peito por fora, parede por dentro), 12 painéis por cava em
     TRÊS faces — a face que dá para o miolo fica ABERTA, e é por ela que se entra e se sai.
     `InstBatch` e não `StaticBatch`: o segundo assa a matriz nos vértices e cega o ORT1. */
  const IB = new InstBatch({ bucket: 0 });
  const geoPainel = new THREE.BoxGeometry(2.75, 2.4, 0.15);
  const _mtx = new THREE.Matrix4(), _eul = new THREE.Euler(), _qt = new THREE.Quaternion();
  const _vp = new THREE.Vector3(), _vs = new THREE.Vector3(1, 1, 1);
  const inst = (geo, mat, x, y, z, ry, cast) => {
    _qt.setFromEuler(_eul.set(0, ry, 0));
    IB.add(geo, mat, _mtx.compose(_vp.set(x, y, z), _qt, _vs), null, { cast });
  };
  const painel = (x, z, ry) => {
    const b = gy(x, z) - 1.25;                       // topo 1,15 m acima do terreno local
    inst(geoPainel, MAT.tabua, x, b + 1.2, z, ry, true);
    colRot(x, z, 1.375, 0.075, b, b + 2.4, ry);
  };
  const GRAU = Math.PI / 180;
  // face: [eixo, coordenada fixa, início, ângulo base]; os desvios são TODOS distintos (ORT1)
  const escora = (fixo, de, eixoZ, base, desvios) => {
    desvios.forEach((g, k) => {
      const t = de + 2.75 * (k + 0.5);
      painel(eixoZ ? fixo : t, eixoZ ? t : fixo, base + g * GRAU);
    });
  };
  escora(-20.5, -12.5, false, 0, [4, 6, 8, 9]);                    // cava E — face sul
  escora(-12.5, -20.5, true, Math.PI / 2, [11, 13, 14, 16]);       // cava E — face oeste
  escora(-1.5, -20.5, true, Math.PI / 2, [18, 19, 21, 23]);        // cava E — face leste
  escora(17.5, -18.5, false, 0, [5, 7, 10, 12]);                   // cava B — face norte
  escora(-18.5, 6.5, true, Math.PI / 2, [15, 17, 20, 22]);         // cava B — face oeste
  escora(-7.5, 6.5, true, Math.PI / 2, [24, 26, 28, 31]);          // cava B — face leste

  /* CAVALETE de sinalização: o anteparo baixo que enche o miolo (MAP5) sem fechar o eixo do
     duelo — 1,0 m de painel listrado, agachou está coberto, de pé não está. */
  const cavalete = (x, z, ry) => {
    const b = gy(x, z);
    addBox(1.8, 1.0, 0.12, MAT.hazard, x, b, z, { ry });
    addBox(0.14, 0.16, 0.7, MAT.tabua, x, b, z, { ry, collide: false, cast: false });
  };
  for (const sz of [-1, 1]) {
    cavalete(3, sz * 13, sz * 25 * GRAU); cavalete(8, sz * 11, sz * 33 * GRAU); cavalete(2, sz * 6, sz * 41 * GRAU);
    cavalete(-3, sz * 3, sz * 27 * GRAU); cavalete(16, sz * 8, sz * 35 * GRAU);
  }
  /* BIOMBO DA FRENTE DE SERVIÇO: três painéis descontínuos a leste de cada bandeira, na faixa
     x ≈ −18 (entre as colunas de waypoint −19,6 e −16,4, pra não apagar nó). Não é muro — dá
     pra atirar entre eles; o que eles cortam é a diagonal de 61 m que chegava da ponta leste.
     Medido: linha de tiro até a bandeira E 61,3 → ver recibo. */
  const biombo = (x, z, ry) => {
    const b = gy(x, z);
    addBox(2.0, 2.6, 0.22, MAT.tapume, x, b, z, { ry });
    addBox(2.05, 0.4, 0.27, MAT.hazard, x, b + 2.2, z, { ry, collide: false });
  };
  // pilha de fôrma de laje: cobertura de agachar no vazio entre a cava e o portão
  const pilhaForma = (x, z, ry) => {
    const b = gy(x, z);
    addBox(2.6, 0.9, 1.2, MAT.tabua, x, b, z, { ry });
    addBox(2.2, 0.55, 0.9, MAT.tabua, x, b + 0.9, z, { ry: ry + 0.12, collide: false });
  };
  for (const sz of [-1, 1]) {
    biombo(-18, sz * 12.2, sz * 38 * GRAU); biombo(-18, sz * 15.4, sz * -22 * GRAU); biombo(-18, sz * 18.6, sz * 30 * GRAU);
    pilhaForma(2, sz * 24, sz * 43 * GRAU);
  }

  /* ===================== CANTEIRO: BARRACÃO, CONTÊINER, CAMINHÃO (§1.3, §4) ===================== */
  const barracao = (x, z, ry, tex2) => {
    const b = gy(x, z), cs = Math.cos(ry), sn = Math.sin(ry);
    const face = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    addBox(6.0, 2.8, 3.0, MAT.tabua, x, b, z, { ry });
    addBox(6.4, 0.14, 3.4, MAT.metal, x, b + 2.8, z, { ry, collide: false });          // telha
    const [px, pz] = face(-1.7, 1.56); addBox(0.9, 2.0, 0.08, MAT.metal, px, b, pz, { ry, collide: false });
    const [jx, jz] = face(1.4, 1.56); addBox(1.2, 0.8, 0.08, MAT.metal, jx, b + 1.5, jz, { ry, collide: false });
    const [sx2, sz2] = face(0, 1.66); signMesh(3.0, 0.62, tex2, sx2, b + 2.45, sz2, ry);
  };
  const TEX_ALOJ = signTex('#1a4d8f', '#ffd23f', 'ALOJAMENTO', 'USO DE EPI OBRIGATÓRIO', 512, 110);
  const TEX_REFE = signTex('#1a4d8f', '#ffd23f', 'REFEITÓRIO', 'MARMITA ÀS 11H30', 512, 110);
  /* Barracão COLADO no tapume do fundo e props do corredor oeste na faixa x ≈ −25,3: o grafo
     tem passo de 3,2 m e `blocked()` infla 0,5 m, então peça de 6 m no meio da faixa apaga a
     coluna inteira de nós e ilha o canto. As colunas x −22,8 e −19,6 ficam livres de propósito.
     A placa idem: em (11,5; 26) os postes fechavam a saída LESTE do tapume (CTF2 caiu a 1 rota). */
  barracao(-21.5, -32.4, 6 * GRAU, TEX_ALOJ);
  barracao(-21.5, 32.4, -9 * GRAU, TEX_REFE);
  for (const sz of [-1, 1]) {
    pecaGLB('junkyard_container', 22, sz * 21, 2.4, 2.6, 3.2, sz > 0 ? 31 * GRAU : -24 * GRAU);
    pecaGLB('vw_9150', 6, sz * 27, 2.5, 3.0, 6.6, sz > 0 ? 37 * GRAU : -19 * GRAU);
    placaObra(10.9, sz * 25.2, sz < 0 ? 0.18 : Math.PI - 0.18);
    /* faixa do sindicato na face de FORA do tapume (a que dá para o campo, não para o
       respawn): a 1ª versão ficou em z ∓26,15 com a normal +Z e o texto saía espelhado —
       conferido na captura do browser. Sem colisor: leitura, não obstáculo. */
    { const fx = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 0.9), new THREE.MeshLambertMaterial({ map: T && T.signSindicato, color: T && T.signSindicato ? 0xffffff : 0x8f1d1d, side: THREE.DoubleSide }));
      fx.position.set(-8, gy(-8, sz * 26) + 1.7, sz * 25.85); fx.rotation.y = sz > 0 ? Math.PI : 0;
      root.add(fx); occluders.push(fx); }
  }

  /* ===================== PROPS DE QUADRANTE (§1.4 / §4.5-4.8) =====================
     UM PropBatch para os 12 GLB (padrão map_campomorro.js:65) — clone solto é o que produziu
     os 2.038 draw calls do fy_mansao. O COLISOR é próprio e existe com ou sem GLB: é ele que a
     MAP5 conta e é ele que o corpo sente (em node nenhum GLB carrega). */
  const PB = new PropBatch({ bucket: 12 });
  const qprop = (id, x, z, targetH, ry, hx, hz, h) => {
    const b = gy(x, z);
    PB.add(id, { x, z, y: b, targetH, ry });
    if (hx) colRot(x, z, hx, hz, b, b + h, ry);
  };
  for (const sz of [-1, 1]) {
    qprop('dumpster', -25.3, sz * 22, 1.7, sz * 22 * GRAU, 1.0, 1.5, 1.7);
    /* Kombi FORA do fundo do corredor: em (−25,3; ∓30) ela apagava o nó (−26; ∓29,8) e o
       canto (−26; ∓33) ficava sem UMA aresta — 247 nós ilhados na BFS do nó 0 (MC3).
       Estacionada a meia-faixa (x −24,4, entre as colunas −26 e −22,8) não apaga nó nenhum. */
    qprop('kombi', -24.4, sz * 17, 1.9, sz * 4 * GRAU, 0.85, 2.3, 1.9);
    qprop('pilha_pneus', 18, sz * 30, 1.5, sz * 26 * GRAU, 1.0, 1.0, 1.4);
    qprop('construction_rubble', 24, sz * 30, 1.4, sz * 17 * GRAU, 1.3, 1.3, 1.3);
    qprop('tent', 24, sz * 12, 2.4, sz * 13 * GRAU, 1.5, 1.5, 2.4);
    // caixa d'água do canteiro sobre cavalete de tábua (o cavalete é a massa e o colisor)
    addBox(1.6, 1.2, 1.6, MAT.tabua, -25.4, gy(-25.4, sz * 26.4), sz * 26.4, { ry: sz * 30 * GRAU });
    qprop('caixa_dagua_azul', -25.4, sz * 26.4, 2.2, sz * 30 * GRAU, 0, 0, 0);
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
    /* UMA caixa por prédio, com `fachadaTex` tilando a 128 px/m: as 63 faixas de `MAT.janela`
       que existiam aqui eram 6.758 m² de cor chapada (o maior infrator de SUP2 do mapa) e 63
       draw calls. A caixa d'água no topo entra por instância — 1 draw call para as 14. */
    const geoCaixaDagua = new THREE.BoxGeometry(1.5, 1.2, 1.5);
    let bi = 0;
    const building = (x, z, h) => {
      addBox(6.5, h, 6, MAT.predio, x, 0, z, { collide: false, cast: false, skirt: false });
      inst(geoCaixaDagua, MAT.caixaDagua, x + 1.4, h + 0.6, z - 1.2, (30 + (bi++ * 5) % 15 + (bi % 7) * 2) * GRAU, false);
    };
    for (let x = -30; x <= 30; x += 9) { building(x, -(HALF_Z + 12), 10 + (Math.abs(x * 5) % 8)); building(x, HALF_Z + 12, 9 + (Math.abs(x * 3) % 7)); }
    const ruaCars = ['opala', 'chevette', 'fiat_uno', 'kombi'];
    let ri = 0;
    for (let x = -26; x <= 26; x += 8) prop(ruaCars[ri++ % ruaCars.length], x, HALF_Z + 6, 1.6, Math.PI / 2, 0, 0, 0);
  }

  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-selvagem.png', 'or-graf-treta.png', 'or-graf-coro.png']);
  const D_BOMBA = decalIds(T, ['peca-bolha.png', 'alfabeto-bolha.png', 'alfabeto-grosso-01.png', 'tag-flop.png']);
  grafitar({
    id: 'obras_prefeitura', root, T, waypoints: nodes, seed: 6262, passo: 1.9, alcance: 8, cobre: 0.09, minLarg: 0.35,
    bandas: [
      { y0: 0.4, y1: 2.3, larg: 2.6, alturas: [1.5, 1.1, 0.8], chance: 50, pool: D_TAG },
      { y0: 0.9, y1: 2.3, larg: 1.7, alturas: [1.3, 1.0], chance: 20, fonte: 'poster', pool: (T.posterFiles || []).map((_, i) => i) },
    ],
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 81, separacao: 20 },
  });

  /* Lotes: escoramento + caixas d'água num InstBatch (matriz por cópia, o ORT1 continua
     enxergando cada peça), os 12 GLB de quadrante num PropBatch, e a saia de contato do mapa
     inteiro em 1 draw call. O PropBatch sai num Group próprio só para `occMesh` alcançar as
     malhas instanciadas — sem isso a bala atravessaria a kombi e a caçamba. */
  { const gi = new THREE.Group(); IB.build(gi); root.add(gi); occMesh(gi); }
  { const gp = new THREE.Group(); PB.build(gp); root.add(gp); occMesh(gp); }
  SKIRT.build(root);

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
    ambience,
    sound: {
      loops: [
        { src: AMB_LOOPS.obra, pos: [0, 3, 0], radius: 70, vol: .35 },
        { src: AMB_LOOPS.cidade, pos: [0, 3, 0], radius: 70, vol: .2 },
        // rádio do peão no barracão: marco sonoro, diz de que lado do mapa você está
        { src: AMB_LOOPS.funk, pos: [-21.5, 1.6, -32.4], radius: 16, vol: .26 },
        { src: AMB_LOOPS.funk, pos: [-21.5, 1.6, 32.4], radius: 16, vol: .26 },
      ],
      bioma: 'urbano',
    },
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    /* BANDEIRAS FORA DAS COVAS. Estavam em (∓10, ∓14): chão −1,58 m e −0,79 m, `slowAt` true
       nas duas e penetração 1,017 na E (a borda do monte de areia de :132, agora mudado).
       (−21, ∓15) é chão firme fora das quatro PITS, com nó do grafo a 1,9 m. */
    ctfPoints: [
      { id: 'E', label: 'CANTEIRO SUL', x: -21, z: -15 },
      { id: 'MID', label: 'A OBRA', x: 9, z: 0 },
      { id: 'B', label: 'CANTEIRO NORTE', x: -21, z: 15 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
