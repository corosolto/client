// Atacadão da Treta: galpão de atacado (paródia) com estacionamento ao sul (spawn E) e loja
// fechada ao norte (spawn B). Colisão só AABB. Mesmo contrato de build(scene, T) da Loja H.
import * as THREE from 'three';
import { placeProp, PropBatch, InstBatch } from './mapprops.js';
import { CAR_DIM } from './map_havan.js';   // ficha de fábrica dos veículos: UMA fonte (map_havan.js:50)
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';
import { setMapSky } from './map_sky.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, BASE_FLOATING, onGround } from './vao.js';

export const ATACADAO_PROPS = [
  'gondola_mercado', 'gondola_eletro', 'shopping_cart', 'caixa_cobranca', 'arara_roupas',
  'manequim', 'painel_tvs', 'cooler', 'pilha_pneus', 'dumpster', 'vw_9150',
  // pátio de carga e ilhas do estacionamento
  'onibus_urbano', 'junkyard_container', 'quiosque', 'guarda_sol', 'moto_cg', 'botijao_gas',
  // estacionamento + entorno (bairro/cidade de fundo)
  'fileira_carros', 'kombi', 'saveiro', 'opala', 'fiat_uno', 'chevette', 'brasilia_vw', 'fusca',
  'fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio',
];

const HALF_X = 26, WALL_H = 8, PARK_H = 2.4;
const ZF = -6;    // fachada (separa estacionamento × loja)
const ZN = 33;    // fundo da loja (norte)
const ZS = -42;   // fundo do estacionamento (sul, a rua)
/* 25 inteiros distintos em graus: o ORT1 conta ÂNGULOS DISTINTOS (piso 20) e fração de massa
   girada (piso 15%). Só entra onde o giro é verdade — pátio, entorno, fardo empilhado à mão. */
const ANG = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 26, 28, 31, 35, 41]
  .map((d) => d * Math.PI / 180);

/* Faixa de vidraça do skyline. LCG semeada (nunca Math.random): o entorno tem de ser o MESMO
   em dois boots, senão a captura A/B compara mapas diferentes. */
function janelaTex(W = 1024, H = 160) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#242c38'; x.fillRect(0, 0, W, H);
  let s = 20260913;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const cols = 16, rows = 2, pw = W / cols, ph = H / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const r = rnd();
    x.fillStyle = r > 0.74 ? '#f4dd9c' : r > 0.48 ? '#5f6e80' : '#161d27';
    x.fillRect(i * pw + pw * 0.12, j * ph + ph * 0.18, pw * 0.76, ph * 0.64);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* `mao = true`: cartaz de pincel atômico — moldura de traço irregular, fonte de mão e texto
   fora do prumo. É a leitura instantânea de atacarejo brasileiro, e nenhuma régua a mede. */
function signTex(bg, fg, title, sub, W = 512, H = 160, mao = false) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = fg; x.lineWidth = W * (mao ? 0.014 : 0.02);
  if (mao) {
    const p = [[W * 0.03, H * 0.09], [W * 0.98, H * 0.05], [W * 0.96, H * 0.94], [W * 0.02, H * 0.97]];
    x.beginPath(); x.moveTo(p[3][0], p[3][1]); for (const [px, py] of p) x.lineTo(px, py); x.stroke();
  } else x.strokeRect(W * 0.015, H * 0.05, W * 0.97, H * 0.9);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg;
  const pad = W * 0.08;
  const fam = mao ? '"Marker Felt","Comic Sans MS",cursive' : '"Arial Black",Impact,sans-serif';
  const fit = (t, base, f2) => { let fs = base; x.font = `bold ${fs}px ${f2}`; while (x.measureText(t).width > W - pad && fs > 8) { fs -= 2; x.font = `bold ${fs}px ${f2}`; } };
  if (mao) { x.translate(W / 2, H / 2); x.rotate(-0.03); x.translate(-W / 2, -H / 2); }
  fit(title, H * 0.42, fam); x.fillText(title, W / 2, sub ? H * 0.4 : H * 0.5);
  if (sub) { fit(sub, H * 0.2, mao ? fam : 'Arial,sans-serif'); x.fillText(sub, W / 2, H * 0.72); }
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
    piso: lam(tex('concrete', 0xcfd3d8)), parede: lam(tex('concrete', 0xb9bdc2)), metal: lam(tex('metal', 0x9aa0a6)),
    pilar: lam(tex('concrete', 0xdfe3e7)), pilarBase: lam({ color: 0xe0b83a }), prat: lam(tex('crate2', 0x8a9096)),
    caixa: lam({ color: 0x2e6f9e }), esteira: lam({ color: 0x2a2d31 }), faixa: lam({ color: 0xe0b83a }),
    asfalto: lam(tex('asphalt', 0x2b2e33)), muro: lam(tex('concrete', 0xc2b8a6)), vidro: lam({ color: 0x9fd0e6, transparent: true, opacity: 0.45 }),
    predio: lam(tex('concreteDark', 0xa7a29a)), janela: lam({ map: janelaTex() }), faixaRua: lam({ color: 0xd8b83a }),
    // pátio de carga: fardo (SEDEX) e engradado (CORREIOS) são as duas silhuetas do atacarejo
    fardo: lam(tex('crate', 0xb08a4e)), engradado: lam(tex('crate2', 0xa8916b)), toldo: lam(tex('awning', 0xc0392b)),
    lanternim: lam({ color: 0xf4fbff, transparent: true, opacity: 0.55 }),
  };
  const PROD = [lam({ color: 0xd23b3b }), lam({ color: 0xe0b83a }), lam({ color: 0x2e8b57 }), lam({ color: 0x2e6f9e }), lam({ color: 0xe86a1e }), lam({ color: 0xe8e2d4 })];
  /* `T.posters` é ARRAY (textures.js:495). Os 3 materiais nascem aqui, UMA vez: um material por
     painel inflaria o censo do SUP1 sem nenhum pixel novo. */
  const POSTER = (T && T.posters && T.posters.length ? T.posters : []).map((tx) => lam({ map: tx }));
  if (!POSTER.length) POSTER.push(MAT.toldo);

  const aoMat = aoMatFactory();
  /* Lotes: prop repetido e caixa repetida saem em 1 draw call por (geometria, material, bloco).
     `build` é chamado no fim e as InstancedMesh nascidas ali entram em `occluders` — sem isso a
     bala atravessa o que o corpo respeita (idioma de map_campomorro.js:636-643). */
  const PB = new PropBatch({ bucket: 20, shadowMin: 0.02 });
  const IB = new InstBatch({ bucket: 20 });
  const _mtx = new THREE.Matrix4(), _eul = new THREE.Euler();
  const inst = (geo, mat, x, y, z, ry) => { _eul.set(0, ry, 0, 'YXZ'); _mtx.makeRotationFromEuler(_eul); _mtx.setPosition(x, y, z); IB.add(geo, mat, _mtx); };
  /* Colisor de caixa GIRADA. Sem os campos `ry/cx/cz/hx/hz` o `_collideRot` do game.js não roda
     e o jogador é empurrado pela AABB — ar sólido na quina de todo prop do pátio. Giro múltiplo
     de 90° sai como AABB TROCADA (o antigo `col` não trocava: o colisor de todo prop de 90°
     estava cruzado) e sem os campos de rotação, que custariam `_collideRot` por quadro. */
  const alinhado = (ry) => Math.abs(Math.sin(2 * ry)) < 1e-6;
  function colRot(cx, cz, hx, hz, minY, maxY, ry) {
    if (!ry || alinhado(ry)) {
      const troca = ry ? Math.abs(Math.cos(ry)) < 0.5 : false;
      const ax0 = troca ? hz : hx, az0 = troca ? hx : hz;
      colliders.push({ minX: cx - ax0, maxX: cx + ax0, minY, maxY, minZ: cz - az0, maxZ: cz + az0 });
      return;
    }
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const ax = Math.abs(hx * cs) + Math.abs(hz * sn), az = Math.abs(hx * sn) + Math.abs(hz * cs);
    colliders.push({ minX: cx - ax, maxX: cx + ax, minY, maxY, minZ: cz - az, maxZ: cz + az, ry, cx, cz, hx, hz, cos: cs, sin: sn });
  }
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    root.add(m);
    if (opts.collide !== false) { colRot(x, z, w / 2, d / 2, y, y + h, opts.ry || 0); occluders.push(m); }
    return m;
  }
  /* Massa nova do pátio: UV em metros (`aoBoxGeo` + `aoMat`, alvo 128 px/m) e faixa de AO no
     rodapé. Toda caixa que nasce daqui já tem textura do `T` — regra de superfície da receita. */
  function massa(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && mat && mat.visible !== false;
    const solo = onGround(y, h) && !opts.ry;
    const geo = vao ? aoBoxGeo(w, h, d, { base: solo ? undefined : BASE_FLOATING }) : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    root.add(m);
    if (opts.collide !== false) { colRot(x, z, w / 2, d / 2, y, y + h, opts.ry || 0); occluders.push(m); }
    return m;
  }
  function addFloor(w, d, mat, x, z, y = 0.01) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; }
  const col = (x, z, hx, hz, h) => colliders.push({ minX: x - hx, maxX: x + hx, minY: 0, maxY: h, minZ: z - hz, maxZ: z + hz });
  /* Occluder é MALHA, nunca Group: `_losClear`/bala usam `intersectObjects(occluders, false)`
     (game.js:5913), e um Group não tem geometria — todo prop GLB era invisível para o tiro. */
  const occlude = (o) => o.traverse((m) => { if (m.isMesh) occluders.push(m); });
  function prop(id, x, z, targetH, ry, hx, hz, h) { const o = placeProp(id, { x, z, y: 0, targetH, ry }); if (o) { root.add(o); occlude(o); } if (hx) colRot(x, z, hx, hz, 0, h, ry || 0); return o; }
  const gprop = (id, x, z, h, ry) => { const o = placeProp(id, { x, z, y: 0, targetH: h, ry }); if (o) { root.add(o); occlude(o); } return o; };
  /* Volume do pátio: GLB quando carregou, caixa texturizada quando não — nos DOIS casos há
     occluder e colisor. É o que faz a massa acima do olho (1,62 m) existir também no portão. */
  function volume(id, x, z, w, h, d, ry, mat) {
    if (PB.add(id, { x, z, targetH: h, targetLen: Math.max(w, d), ry })) colRot(x, z, w / 2, d / 2, 0, h, ry);
    else massa(w, h, d, mat, x, 0, z, { ry });
  }
  const shelfUnit = (id, x, z) => { if (!gprop(id, x, z, 1.9, Math.PI / 2)) addBox(2.1, 1.9, 1.0, MAT.prat, x, 0, z); col(x, z, 1.05, 0.55, 1.9); };
  const signMesh = (w, h, tx2, x, y, z, ry) => {
    const g = new THREE.Group(); const geo = new THREE.PlaneGeometry(w, h);
    const f = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); f.position.z = 0.02;
    const bk = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); bk.position.z = -0.02; bk.rotation.y = Math.PI;
    g.add(f, bk); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); return g;
  };
  const wX = HALF_X - 0.5;

  setMapSky(scene, T, '/img/textures/sky_havan.webp', 0xdfe6ec); scene.fog = null;
  addFloor(HALF_X * 2, ZN - ZF, MAT.piso, 0, (ZF + ZN) / 2);       // loja
  addFloor(HALF_X * 2, ZF - ZS, MAT.asfalto, 0, (ZS + ZF) / 2);    // estacionamento

  addBox(HALF_X * 2, WALL_H, 0.8, MAT.parede, 0, 0, ZN);                          // parede norte
  for (const sx of [-1, 1]) addBox(0.8, WALL_H, ZN - ZF, MAT.parede, sx * wX, 0, (ZF + ZN) / 2);  // laterais (loja)
  /* Laje = PLANO virado para baixo com 3 faixas de TELHA TRANSLÚCIDA (é como galpão de atacado
     se ilumina de dia). A caixa de 6 faces custava 2.100 m² de superfície medida com 5 faces
     que ninguém vê, e a claraboia antiga era plano translúcido DEBAIXO de laje opaca: 507 m²
     de mentira física. Segue sem colisor e sem sombra — a luminária pendurada é do PR #582. */
  {
    const faixas = [[ZF, 2, MAT.metal], [2, 4, MAT.lanternim], [4, 12.5, MAT.metal], [12.5, 14.5, MAT.lanternim],
      [14.5, 23, MAT.metal], [23, 25, MAT.lanternim], [25, ZN, MAT.metal]];
    for (const [z0, z1, mt] of faixas) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2, z1 - z0), mt);
      m.rotation.x = Math.PI / 2; m.position.set(0, WALL_H, (z0 + z1) / 2);
      m.receiveShadow = true; m.castShadow = false; root.add(m);
    }
  }
  for (let z = ZF + 3; z <= ZN; z += 6) addBox(HALF_X * 2, 0.3, 0.3, MAT.metal, 0, WALL_H - 0.4, z, { collide: false, cast: false });   // vigas
  for (const px of [-18, 18]) for (const pz of [2, 14, 26]) { addBox(0.7, WALL_H, 0.7, MAT.pilar, px, 0, pz); addBox(0.9, 0.5, 0.9, MAT.pilarBase, px, 0, pz, { collide: false }); }

  /* A faixa acima de 2,6 m era VIDRO sem colisor e fora de `occluders`: o tiro atravessava o
     que parece parede. Agora ela é painel de oferta opaco + vidraça, os dois em `occluders`.
     Em minY=2,6 o `_collide` (game.js: `pos.y+1.5 > minY`) nunca toca quem anda, e o rodapé
     sólido 0..2,6 já ocupa o mesmo footprint — colisor aqui não muda um passo de ninguém.
     A VERGA continua sem colisor (o footprint dela é o vão da porta, e empurraria quem salta),
     mas entra em `occluders`: bala tem de parar no concreto sobre a porta. */
  {
    const gaps = [[-15, -9], [-3, 3], [9, 15]];   // 3 vãos: esq, CENTRO (libera 2ª rota CTF2 pelo corredor central), dir
    const vitrine = (x0, x1) => {
      const n = Math.max(2, Math.round((x1 - x0) / 2.6)), pw = (x1 - x0) / n;
      for (let i = 0; i < n; i++) {
        const cx = x0 + pw * (i + 0.5);
        if (i % 3 === 2) { addBox(pw, WALL_H - 2.6, 0.12, MAT.vidro, cx, 2.6, ZF); continue; }
        addBox(pw - 0.06, WALL_H - 2.9, 0.16, POSTER[i % POSTER.length], cx, 2.75, ZF);
      }
    };
    let xc = -wX;
    for (const [g0, g1] of gaps) {
      if (g0 > xc) { addBox(g0 - xc, 2.6, 0.6, MAT.parede, (xc + g0) / 2, 0, ZF); vitrine(xc, g0); }
      occluders.push(addBox(g1 - g0, WALL_H - 3, 0.6, MAT.parede, (g0 + g1) / 2, 3, ZF, { collide: false }));   // verga
      xc = g1;
    }
    if (wX > xc) { addBox(wX - xc, 2.6, 0.6, MAT.parede, (xc + wX) / 2, 0, ZF); vitrine(xc, wX); }
    // portais de ENTRADA e SAÍDA
    signMesh(5.4, 1.0, signTex('#1f5fbf', '#ffffff', 'ENTRADA', 'ENTRE E TRETE', 640, 160), -12, 3.3, ZF - 0.1, 0);
    signMesh(5.4, 1.0, signTex('#1f5fbf', '#ffffff', 'SAÍDA', 'JÁ VAI?', 640, 160), 12, 3.3, ZF - 0.1, 0);
    // letreiro grande ATACADÃO acima da vitrine (vê da rua e de dentro). ZF-0,22: os painéis de
    // oferta têm 0,16 de espessura e engoliam o letreiro quando ele ficava no plano da fachada.
    signMesh(16, 3.0, signTex('#c0392b', '#ffd23f', 'ATACADÃO DA TRETA', 'PREÇO DE ATACADO... OU NEM TANTO', 900, 180), 0, 6.4, ZF - 0.22, 0);
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

  // Gôndola e frente de caixa FICAM de esquadro (atacarejo é alinhado; girar rack é mentir).
  // O que torce é a fila: esteira empurrada e carrinho largado — ORT1 legítimo, 7 massas.
  for (const [i, cx] of [-7.5, -3.75, 3.75, 7.5].entries()) {
    addBox(1.4, 1.0, 2.6, MAT.caixa, cx, 0, ZF + 4);
    // esteira SOBRE o balcão (y=1,0 é o topo dele): solta em ZF+5,4 ela era uma caixa de 1,06 m
    // sem colisor sobre chão andável — o MAP1 acusa isso como corpo dentro de sólido.
    addBox(2.4, 0.06, 0.5, MAT.esteira, cx, 1.0, ZF + 4, { collide: false, ry: ANG[(i * 2 + 1) % 6] * (i % 2 ? 1 : -1) });
    signMesh(0.7, 1.0, signTex('#111417', '#ff4d4d', 'CAIXA', '99', 260, 360), cx + 0.9, 2.2, ZF + 5.2, 0);
  }
  for (const [i, [cx, cz]] of [[-9, ZF + 2], [3, ZF + 2.5], [10, ZF + 1.5]].entries())
    prop('shopping_cart', cx, cz, 1.0, ANG[(i * 8 + 5) % ANG.length] * (i % 2 ? -1 : 1), 0.5, 0.6, 0.9);

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
  { const rua = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2 + 30, 18), MAT.asfalto); rua.rotation.x = -Math.PI / 2; rua.position.set(0, 0.02, ZS - 9); root.add(rua);
    for (let x = -28; x <= 28; x += 4) addBox(2.2, 0.02, 0.35, MAT.faixa, x, 0.03, ZS - 9, { collide: false, cast: false }); }   // faixa central da rua (ao longo de X)
  /* Escala dos veículos: ficha de fábrica de `CAR_DIM` (map_havan.js:50), a MESMA que a régua
     tools/eval/escala-veiculo-check.mjs confere — tabela copiada aqui seria dois números para
     o mesmo fato. `targetH: 1,6` para todos punha a Kombi 18% baixa e, pior, o colisor de TODOS
     parava em 1,5 m — abaixo do olho de 1,62 m. Era metade da causa medida da exposição de E
     (a outra metade era o vazio de z=-22). A caixa de reserva só aparece sem GLB, e existe para
     que bala e régua meçam a mesma massa que o jogador vê. */
  const cars = ['kombi', 'saveiro', 'opala', 'fiat_uno', 'chevette', 'brasilia_vw'];
  const carro = (id, x, z, ry) => {
    const [cl, ch] = CAR_DIM[id] || [4.20, 1.50];
    if (!PB.add(id, { x, z, targetH: ch, targetLen: cl, ry }))
      occluders.push(massa(1.72, ch, cl, MAT.metal, x, 0, z, { ry, collide: false }));
    colRot(x, z, 0.88, cl / 2, 0, ch, ry);
  };
  let cix = 0;
  // 2 fileiras de vaga: z = ZF-16 (-22) virou o PÁTIO DE CARGA — era o único trecho de 36 m de
  // asfalto sem nenhuma massa acima do olho (1,62 m), a causa medida da exposição de E.
  for (const fz of [ZF - 8, ZF - 24]) {
    for (let x = -22; x <= 22; x += 5.2) addBox(0.14, 0.02, 4.4, MAT.faixa, x, 0.03, fz, { collide: false, cast: false });
    for (let x = -19.5; x <= 19.5; x += 5.2) { cix++; carro(cars[cix % cars.length], x, fz, (cix % 2) ? 0 : Math.PI); }
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

  /* ================= PÁTIO DE CARGA, ILHAS E TORRES DE FARDO =================
     CAUSA MEDIDA da assimetria de exposição (E 45,9% × B 7,8%): os 24 carros têm colisor
     `maxY = 1,5 m` e o olho da régua está em 1,62 m (map-check.mjs:63) — não havia UMA massa
     acima da linha do olho em 36 m de asfalto. Não é o spawn (não toco em `spawns`), é
     geometria. Coordenada em MIDWAY do lattice de navegação (x ≡ 1,6 mod 3,2 desde −24;
     z ≡ 0 mod 3,2 desde −40). REGRA DURA que o CTF2 cobrou: massa em midway tem de ter
     `ax + 0,5 < 1,6` (a inflação do `blocked` do grafo), senão ela mata o NÓ vizinho e a
     segunda rota morre com ele — foi assim que `E→MID`, `E→B`, `B→E` e `B→MID` caíram a
     1 rota na 1ª medição deste bloco. Para lado 1,6 m isso significa giro ≤ 17°. */
  {
    const G_FARDO = aoBoxGeo(1.6, 0.55, 1.6, { base: BASE_FLOATING }), M_FARDO = aoMat(MAT.fardo);
    const G_SACO = aoBoxGeo(1.2, 0.55, 0.9, { base: BASE_FLOATING }), M_SACO = aoMat(MAT.fardo);
    const G_PALETE = aoBoxGeo(1.0, 0.6, 1.2, { base: BASE_FLOATING }), M_PALETE = aoMat(MAT.engradado);
    const G_CX = aoBoxGeo(0.5, 0.3, 0.35, { base: BASE_FLOATING }), M_CX = aoMat(MAT.engradado);
    /* Torre de fardo: 4 fardos de 0,55 m com giro PRÓPRIO por camada — fardo empilhado à mão
       torce, e é a silhueta que define atacarejo. 16 torres = 1 draw call. */
    const torreFardo = (x, z, ry) => {
      for (let k = 0; k < 4; k++)
        inst(G_FARDO, M_FARDO, x + (k % 2 ? 0.07 : -0.07), 0.275 + k * 0.55, z + (k % 2 ? -0.06 : 0.06), ry * (1 - 0.18 * k) * (k % 2 ? 1 : -1));
      colRot(x, z, 0.8, 0.8, 0, 2.2, ry);   // 0,8 = o fardo real (1,6 m); 0,9 matava o nó vizinho
    };
    // pilha empilhada: caixa texturizada (massa medida, occluder) + peças soltas no topo
    const pilha = (w, h, d, mat, x, z, ry, geo, gmat, n, gh2) => {
      massa(w, h, d, mat, x, 0, z, { ry });
      for (let k = 0; k < n; k++) {
        const a = ry + ANG[(k * 5 + 3) % ANG.length] * (k % 2 ? 1 : -1);
        inst(geo, gmat, x + (k - (n - 1) / 2) * (w / n), h + gh2 / 2, z + (k % 2 ? 0.18 : -0.22), a);
      }
    };

    // 1-4 · pátio de carga em z = -22,4: baú, ônibus de sacoleiro, torre de arroz, 2º baú.
    volume('vw_9150', -16.0, -22.4, 5.2, 3.2, 2.2, ANG[0], MAT.metal);
    signMesh(3.2, 0.9, signTex('#1f5fbf', '#ffd23f', 'DISTRIBUIDORA TRETA', 'ENTREGA NO ATACADO', 640, 180),
      -16.0, 2.1, -21.2, ANG[0]);
    volume('onibus_urbano', -4.8, -22.4, 8.4, 3.2, 2.2, -ANG[3], MAT.metal);
    massa(5.2, 0.2, 2.2, MAT.engradado, 6.4, 0, -22.4, { ry: ANG[2], collide: false });   // palete da torre
    pilha(4.8, 2.2, 2.0, MAT.fardo, 6.4, -22.4, ANG[2], G_SACO, M_SACO, 4, 0.55);
    volume('vw_9150', 16.0, -22.4, 5.2, 3.2, 2.2, -ANG[1], MAT.metal);
    // 5-6 · engradado de cerveja fechando as pistas de muro
    pilha(1.8, 2.4, 2.0, MAT.engradado, -24.0, -22.4, ANG[4], G_CX, M_CX, 4, 0.3);
    pilha(1.8, 2.4, 2.0, MAT.engradado, 24.0, -22.4, -ANG[6], G_CX, M_CX, 4, 0.3);

    // 7-10 · ilhas das pistas laterais
    volume('junkyard_container', -24.0, -30.4, 2.2, 2.6, 6.4, ANG[1], MAT.metal);
    pilha(2.0, 2.4, 6.0, MAT.engradado, -24.0, -12.8, ANG[8], G_PALETE, M_PALETE, 4, 0.6);
    volume('quiosque', 24.0, -12.8, 2.4, 2.8, 4.0, -ANG[11], MAT.muro);
    PB.add('guarda_sol', { x: 22.6, z: -11.0, targetH: 2.4, ry: ANG[12] });
    // corral coberto: o carrinho volta pra algum lugar
    for (const [px, pz] of [[23.1, -33.6], [24.9, -33.6], [23.1, -27.2], [24.9, -27.2]])
      massa(0.14, 2.6, 0.14, MAT.metal, px, 0, pz, { ry: -ANG[4] });
    massa(2.4, 0.14, 6.8, MAT.metal, 24.0, 2.6, -30.4, { ry: -ANG[4], collide: false });
    for (let k = 0; k < 6; k++) PB.add('shopping_cart', { x: 24.0, z: -33.0 + k * 1.05, targetH: 1.0, ry: -ANG[(k * 3 + 4) % ANG.length] });

    // 11-12 · ilha de oferta coberta. x = ∓17,6 (midway) e largura 4,8: em ±16 a ilha entrava
    // no vão de porta [-15,-9]/[9,15] e estrangulava a rota do CTF2.
    for (const [sx, mt, a] of [[-1, MAT.engradado, ANG[2]], [1, MAT.fardo, -ANG[1]]]) {
      const ix = sx * 17.6;
      for (const [dx, dz] of [[-2.4, -1.1], [2.4, -1.1], [-2.4, 1.1], [2.4, 1.1]])
        massa(0.12, 2.6, 0.12, MAT.metal, ix + dx, 0, -9.6 + dz, { ry: a });
      massa(4.8, 0.1, 2.4, MAT.toldo, ix, 2.6, -9.6, { ry: a, collide: false });
      massa(1.8, 2.2, 1.8, mt, ix - 1.4, 0, -9.6, { ry: a });
      massa(1.8, 2.2, 1.8, mt, ix + 1.4, 0, -9.6, { ry: -a });
      // pendurado na borda SUL do toldo (y 2,25), que é o lado de onde o jogador chega do pátio
      signMesh(2.4, 1.0, signTex('#f4e7c0', '#b32a1f', sx < 0 ? 'LEVE 3 PAGUE 2' : 'ARROZ 5KG R$ 24,90', '', 512, 220, true),
        ix, 2.25, -9.6 - 1.25, a);
    }
    // 13 · totem de preço. O -1,6 da receita cai no corredor central do CTF2 (e vira parede se
    // o PR #582 mover ZF para -12): o totem fica na ilha central do estacionamento.
    for (const dx of [-1.6, 1.6]) massa(0.25, 1.8, 0.3, MAT.metal, -6.4 + dx, 0, -19.2, { ry: ANG[3] });
    massa(4.0, 2.4, 0.45, MAT.muro, -6.4, 1.8, -19.2, { ry: ANG[3] });
    signMesh(3.6, 2.0, signTex('#e0b83a', '#c0392b', 'OFERTA DO DIA', 'FEIRA DO ATACADO · SÓ HOJE', 640, 360),
      -6.4, 3.0, -19.2 + 0.3, ANG[3]);

    // 14-15 · flancos da linha de spawn E (sobravam 8+8 pares de tiro cruzado em z≈-38,4).
    // Nada entra em z∈[-40,-34] ∩ x∈[-16,16]: é a folga de 6,0 m que o MAP2B cobra.
    massa(2.4, 2.5, 2.4, MAT.muro, -20.8, 0, -35.2, { ry: ANG[5] });
    massa(3.6, 0.14, 3.6, MAT.metal, -20.8, 2.5, -35.2, { ry: ANG[5], collide: false });
    signMesh(2.0, 0.6, signTex('#111417', '#ffd23f', 'REVISTA NA SAÍDA', '', 512, 150), -20.8, 1.9, -33.9, ANG[5]);
    for (const [gw, gd, gx, gz] of [[3.0, 0.12, 0, -1.5], [3.0, 0.12, 0, 1.5], [0.12, 3.0, -1.5, 0]])
      massa(gw, 2.2, gd, MAT.metal, 20.8 + gx, 0, -35.2 + gz, { ry: -ANG[7] });
    for (let k = 0; k < 6; k++) PB.add('botijao_gas', { x: 20.0 + (k % 3) * 0.8, z: -36.0 + Math.floor(k / 3) * 1.0, targetH: 0.85, ry: ANG[(k * 4 + 2) % ANG.length] });

    // 16-18 · carrinho largado torto na vaga (MAP5 q1,0)
    for (const [cx, cz, a] of [[-11.2, -29.0, ANG[18]], [-6.4, -31.5, ANG[21]], [-8.0, -25.4, -ANG[23]]]) {
      PB.add('shopping_cart', { x: cx, z: cz, targetH: 1.0, ry: a });
      colRot(cx, cz, 0.5, 0.6, 0, 0.95, a);
    }
    /* 19-20 · poste de pátio de 9,6 m. A receita pedia 2 de 6,0 m; são 13 (mais a caixa d'água
       do telhado) porque o ALT1 é PERCENTIL: as ~200 massas baixas deste bloco derrubam o h90
       de 10,5 m para 8,0 m, e o pé-direito 8→11 m (receita §2) é do passo 2, que não entra
       nesta rodada. Mastro de 9-12 m a cada ~13 m é o que um pátio de atacarejo tem mesmo. */
    const G_POSTE = aoBoxGeo(0.32, 9.6, 0.32, { base: BASE_FLOATING }), M_POSTE = aoMat(MAT.metal);
    const G_BRACO = aoBoxGeo(1.7, 0.16, 0.18, { base: BASE_FLOATING }), M_BRACO = aoMat(MAT.metal);
    const G_LUM = aoBoxGeo(1.2, 0.18, 0.44, { base: BASE_FLOATING }), M_LUM = aoMat(MAT.lanternim);
    const mastro = (px, pz, a) => {
      inst(G_POSTE, M_POSTE, px, 4.8, pz, a);
      inst(G_BRACO, M_BRACO, px + Math.cos(a) * 0.6, 9.52, pz - Math.sin(a) * 0.6, a);
      inst(G_LUM, M_LUM, px + Math.cos(a) * 1.15, 9.35, pz - Math.sin(a) * 1.15, a);
      colRot(px, pz, 0.16, 0.16, 0, 9.6, a);
    };
    for (const pz of [-19.2, -25.6]) for (const px of [-19.2, -9.6, 0, 9.6, 19.2])
      mastro(px, pz, ANG[(Math.round(Math.abs(px) / 3.2) + (pz < -22 ? 4 : 1)) % ANG.length]);
    // os dois da beira fecham o rasante que sobrava entre a fileira de vaga e o muro lateral
    for (const px of [-22.4, 22.4]) mastro(px, -25.6, ANG[(Math.round(Math.abs(px) / 3.2) + 4) % ANG.length]);
    // calçada da fachada: os 3 da frente iluminam a entrada e seguram o h90 do ALT1
    for (const px of [-12.8, 0, 12.8]) mastro(px, -8.0, ANG[(Math.round(Math.abs(px) / 3.2) + 9) % ANG.length]);
    /* Caixa d'água elevada no telhado: a silhueta que todo galpão brasileiro tem, e 5 massas
       acima de 9 m pelo preço de 5 caixas. Sem colisor e sem occluder — ninguém sobe lá. */
    {
      const cx0 = -14.4, cz0 = 3.2, aC = ANG[6];   // z=3,2: em z=21 ela ficava na linha do beiral
      for (const [lx, lz] of [[-1.3, -1.0], [1.3, -1.0], [-1.3, 1.0], [1.3, 1.0]])
        massa(0.26, 3.2, 0.26, MAT.metal, cx0 + lx, WALL_H, cz0 + lz, { ry: aC, collide: false, cast: false });
      massa(3.4, 2.4, 2.6, MAT.muro, cx0, WALL_H + 3.2, cz0, { ry: aC, collide: false, cast: false });
      signMesh(2.6, 0.9, signTex('#1f5fbf', '#ffffff', 'ATACADÃO', 'DA TRETA', 512, 180), cx0, WALL_H + 4.6, cz0 - 1.4, aC);
    }
    // 21-26 · pneu, caçamba e as 4 motos da vaga coberta (MAP5 q2,0 e q3,0)
    volume('pilha_pneus', 9.6, -32.0, 2.0, 1.4, 2.0, ANG[13], MAT.metal);
    volume('dumpster', 4.8, -19.2, 2.4, 1.6, 1.8, -ANG[9], MAT.metal);
    for (const [mx, mz, a] of [[19.2, -35.2, ANG[12]], [22.4, -35.2, -ANG[15]], [19.2, -28.8, ANG[19]], [22.4, -28.8, -ANG[10]]]) {
      PB.add('moto_cg', { x: mx, z: mz, targetH: 1.15, ry: a });
      colRot(mx, mz, 0.45, 0.95, 0, 1.15, a);
    }

    // 27-42 · torres de fardo nos corredores da loja: matam as alamedas de 62-69 m
    for (const [tx, tz, a] of [
      [-19.2, 0, ANG[13]], [19.2, 0, -ANG[10]], [-19.2, 12.8, ANG[9]], [19.2, 12.8, -ANG[12]],
      [-19.2, 25.6, ANG[11]], [19.2, 25.6, -ANG[2]],
      [-22.4, 6.4, ANG[8]], [22.4, 6.4, -ANG[6]], [-22.4, 19.2, -ANG[4]], [22.4, 19.2, ANG[7]],
      [-12.8, 6.4, ANG[1]], [12.8, 6.4, -ANG[3]], [-12.8, 19.2, ANG[7]], [12.8, 19.2, -ANG[5]],
      [-9.6, -3.2, ANG[5]], [9.6, -3.2, -ANG[0]],
      // a alameda de 68 m que sobrava: da linha de spawn E, pelo vão de porta, até a parede
      // norte pelo corredor x ≈ ±10,9. Estas duas cortam exatamente essa linha.
      [-11.2, 16.0, ANG[6]], [11.2, 16.0, -ANG[9]],
    ]) torreFardo(tx, tz, a);
    /* Coletor de papelão no flanco da linha de spawn E (x = ±19,2, fora da janela
       z∈[-40,-34] ∩ x∈[-16,16] que o MAP2B protege): tira o tiro cruzado rasante que saía de
       um spawn de ponta e varria a fileira inteira até o outro lado do pátio. */
    for (const sx of [-1, 1]) {
      massa(1.8, 2.3, 1.6, MAT.engradado, sx * 19.2, 0, -38.4, { ry: sx > 0 ? ANG[4] : -ANG[9] });
      signMesh(1.4, 0.6, signTex('#f4e7c0', '#1f5fbf', 'SÓ PAPELÃO', '', 512, 200, true),
        sx * 19.2, 1.5, -37.55, sx > 0 ? ANG[4] : -ANG[9]);
    }
    // apoiado no topo da torre (2,2 m), não flutuando: cartaz de fardo fica em cima da pilha
    for (const sx of [-1, 1])
      signMesh(2.4, 1.0, signTex('#f4e7c0', '#b32a1f', sx < 0 ? 'FARDO 30KG' : 'PREÇO DE FARDO', '', 512, 220, true),
        sx * 19.2, 2.62, 12.8 - 0.7, sx < 0 ? ANG[9] : -ANG[13]);
  }

  // Entorno é backdrop: fica fora dos bounds e sem colisor, o player vê mas não alcança.
  {
    const casas = ['fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio'];
    let hi = 0;
    /* `prop()` não tem fallback: sem o GLB o casario SOME e o entorno vira vazio branco. A
       caixa de concreto entra no lugar, e com giro próprio — a cidade não está na grade da loja. */
    const casa = (id, x, z, ry0, i) => {
      const ry = ry0 + (i % 2 ? ANG[i % ANG.length] : -ANG[(i + 7) % ANG.length]);
      if (!prop(id, x, z, 6, ry)) massa(6.2, 6, 6.2, MAT.predio, x, 0, z, { ry, collide: false, cast: false });
    };
    // favela dos LADOS (bem AFASTADA dos muros, x=±36, casas baixas pra não invadir)
    for (const sx of [-1, 1]) for (let z = ZS + 6; z <= ZF - 4; z += 7) { casa(casas[hi % casas.length], sx * (HALF_X + 11), z, sx < 0 ? Math.PI / 2 : -Math.PI / 2, hi); hi++; }
    // casas atrás da LOJA (bem ao NORTE, longe do telhado)
    for (let x = -18; x <= 18; x += 9) { casa(casas[hi % casas.length], x, ZN + 14, Math.PI, hi); hi++; }
    /* PRÉDIOS do outro lado da RUA. A faixa de vidraça era uma CAIXA em volta do prédio e 74%
       dela ficava enterrada: 4.827 m² medidos, o maior ofensor de superfície do mapa. Agora é
       plano só na face +z, que é a única que o jogador vê, e o grupo inteiro sai da grade. */
    const building = (x, z, w, d, h, ry) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
      const box = new THREE.Mesh(aoBoxGeo(w, h, d, { base: BASE_FLOATING }), aoMat(MAT.predio));
      box.position.y = h / 2; box.castShadow = false; box.receiveShadow = true; g.add(box);
      for (let y = 2.2; y < h - 1; y += 2.4) {
        const jan = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, 1.1), MAT.janela);
        jan.position.set(0, y + 0.55, d / 2 + 0.04); g.add(jan);
      }
    };
    let bi = 0;
    for (let x = -34; x <= 34; x += 8.5) building(x, ZS - 27, 6.5, 6, 9 + (Math.abs(x * 5) % 9), ANG[bi++ % 9]);
    // TRÂNSITO na rua (dois sentidos), SÓ carros (nada de prédio na pista). Backdrop: entra no
    // lote (1 draw call por material) e sem colisor — está fora dos bounds, ninguém alcança.
    const ruaCars = ['opala', 'chevette', 'fiat_uno', 'saveiro', 'brasilia_vw', 'kombi', 'fusca'];
    let ri = 0;
    for (let x = -30; x <= 30; x += 6.5) {
      const id = ruaCars[ri++ % ruaCars.length], [cl, ch] = CAR_DIM[id] || [4.03, 1.50];
      PB.add(id, { x, z: ZS - 9 + (ri % 2 ? 3.2 : -3.2), targetH: ch, targetLen: cl, ry: (ri % 2) ? Math.PI / 2 : -Math.PI / 2 });
    }
  }

  /* Fecha os lotes. A InstancedMesh nasce fora de `occluders` e sem isso a bala atravessa o
     fardo que o corpo respeita (BUG-54; idioma de map_campomorro.js:636-643). Vidro fica fora. */
  {
    const antes = new Set(root.children);
    PB.build(root); IB.build(root);
    for (const c of root.children) {
      if (antes.has(c)) continue;
      const ms = Array.isArray(c.material) ? c.material : [c.material];
      const opaca = ms.some((m) => m && m.visible !== false && !(m.transparent && (m.opacity === undefined || m.opacity < 0.9)));
      if (c.isInstancedMesh && opaca) occluders.push(c);
    }
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

  /* BUG-57: pombo de estacionamento de atacado e rato de doca. */
  const ambience = createFavelaAmbience(root, {
    map: 'atacadao_treta',
    rats: [
      { pos: [-16, 0, -27], to: [-13.5, 0, -24.5], phase: .3 },
      { pos: [14, 0, 24], to: [11.5, 0, 21.5], phase: 1.5 },
    ],
    /* vida 1: barata da doca do atacadão (fauna 2) */
    cockroaches: [
      { pos: [-15, 0, -26], to: [-12.8, 0, -23.8], phase: .8 },
      { pos: [13, 0, 22.5], to: [10.8, 0, 20.2], phase: 2.2 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-8, 0, 20], phase: .4 }, { mode: 'ground', pos: [10, 0, 16], phase: 1.3 },
      { mode: 'ground', pos: [1.2, 0, -9], phase: .8 },
    ],
  });

  return {
    ambience,sound:{loops:[{src:AMB_LOOPS.hum,pos:[0,3,0],radius:60,vol:.2},{src:AMB_LOOPS.cidade,pos:[0,3,0],radius:60,vol:.18}],bioma:'urbano'},
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    /* CTF1 cobra ≥9 m da bandeira ao spawn mais próximo. Medido: E estava a 7,28 m e B a
       5,00 m do PRÓPRIO spawn — defendia-se de dentro do respawn. E foi para o bolso entre os
       carrinhos largados, B para o corredor entre as fileiras z=15 e z=21, MID saiu da calçada
       de E e entrou na loja ao lado do caixa x=7,5. */
    ctfPoints: [
      { id: 'E', label: 'ESTACIONAMENTO', x: -11.2, z: -26.4 },
      { id: 'MID', label: 'PORTA', x: 10, z: -2 },
      { id: 'B', label: 'DOCA', x: -8, z: 18 },   // corredor entre fileiras; ZN-6 caía dentro da gôndola
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: ZS + 1, maxZ: ZN - 1 },
  };
}
