// POSTO DA TRETA — posto de gasolina na beira de rodovia. Mesmo contrato build(scene,T) dos outros mapas.
// Colisão só AABB (sem colisor girado — BUG-21); marquise/beirais collide:false, pilar/bomba/carro colidem.
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { createFavelaAmbience } from './ambientlife.js';

// props GLB que este mapa usa (main.js pré-carrega MAPS[id].props)
export const POSTO_PROPS = [
  'kombi', 'saveiro', 'fusca', 'dumpster', 'quiosque', 'botijao_gas',
  'jersey_barrier', 'concrete_roadblock', 'sandbags', 'pilha_pneus', 'tires',
  // fila/congestionamento fora do posto (a treta) + mais carros no pátio
  'fileira_carros', 'opala', 'chevette', 'brasilia_vw', 'fiat_uno', 'uno_mille', 'moto_cg',
  // miúdos do pátio
  'cooler', 'caixa_som', 'guarda_sol', 'mesa_guardasol', 'shopping_cart',
  // GREVE dos caminhoneiros (reflete o Brasil): caminhão parado + manifestantes
  'vw_9150', 'manequim',
  // BAIRRO em volta (casas de favela peekando por cima do muro) + fila de caminhão na pista
  'fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio', 'bus', 'onibus_urbano',
];

const HALF_X = 28, HALF_Z = 36;

function signTex(bg, fg, title, sub, W = 512, H = 160) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = fg; x.lineWidth = W * 0.02; x.strokeRect(W * 0.015, H * 0.05, W * 0.97, H * 0.9);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fg;
  const pad = W * 0.08;
  // auto-ajuste: encolhe a fonte até o texto CABER na largura (sem cortar como antes)
  const fit = (txt, base, family) => { let fs = base; x.font = `bold ${fs}px ${family}`; while (x.measureText(txt).width > W - pad && fs > 8) { fs -= 2; x.font = `bold ${fs}px ${family}`; } };
  fit(title, H * 0.42, '"Arial Black",Impact,sans-serif'); x.fillText(title, W / 2, sub ? H * 0.4 : H * 0.5);
  if (sub) { fit(sub, H * 0.2, 'Arial,sans-serif'); x.fillText(sub, W / 2, H * 0.72); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// PAINEL DE PREÇO do totem — preços ABSURDOS (é o que causou a treta). Layout de placa de
// posto: logo em cima, 3 combustíveis com preço grande, e uma tarja "AUMENTOU DE NOVO!".
function priceTex() {
  const W = 440, H = 580, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.textBaseline = 'middle';
  x.fillStyle = '#0c0f13'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#ffd23f'; x.lineWidth = 10; x.strokeRect(10, 10, W - 20, H - 20);
  // cabeçalho
  x.fillStyle = '#111417'; x.fillRect(18, 18, W - 36, 78);
  x.textAlign = 'center'; x.fillStyle = '#ffd23f'; x.font = 'bold 38px "Arial Black",Impact,sans-serif';
  x.fillText('POSTO DA TRETA', W / 2, 58);
  // 3 combustíveis: rótulo à ESQUERDA (pequeno) e preço à DIREITA (grande) — sem sobrepor
  const rows = [['COMUM', '13,99'], ['ADITIVADA', '15,49'], ['DIESEL', '12,79']];
  rows.forEach(([lab, val], i) => {
    const y = 178 + i * 104;
    x.textAlign = 'left'; x.fillStyle = '#e8ecef'; x.font = 'bold 28px Arial,sans-serif'; x.fillText(lab, 30, y);
    x.textAlign = 'right'; x.fillStyle = '#ff4d4d'; x.font = 'bold 56px "Arial Black",Impact,sans-serif'; x.fillText(val, W - 30, y);
  });
  // tarja da treta
  x.fillStyle = '#c0392b'; x.fillRect(20, H - 92, W - 40, 62);
  x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = 'bold 34px "Arial Black",Impact,sans-serif';
  x.fillText('AUMENTOU DE NOVO!', W / 2, H - 61);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildPosto(scene, T) {
  const colliders = [];
  const occluders = [];
  const pickups = [];
  const root = new THREE.Group();
  scene.add(root);

  const lam = (opts) => new THREE.MeshLambertMaterial(opts);
  const tex = (k, fallback) => (T && T[k]) ? { map: T[k] } : { color: fallback };
  const MAT = {
    asfalto: lam(tex('asphalt', 0x2b2e33)),
    apron: lam(tex('concrete', 0x9aa0a6)),     // concreto claro do pátio
    curb: lam({ color: 0xb7a94a }),            // meio-fio amarelo da ilha de bomba
    loja: lam(tex('concrete', 0xe4dccb)),
    lojaBanda: lam({ color: 0xc0392b }),
    marquise: lam(tex('concrete', 0xd7dbe0)),
    marquiseBaixo: lam(tex('concrete', 0xb8bdc4)),
    fascia: lam({ color: 0xe03c3c }),
    pilar: lam({ color: 0xe9ecef }),
    bomba: lam({ color: 0xcf3b3b }),
    bombaTopo: lam({ color: 0x1b1d21 }),
    aco: lam({ color: 0x8a9096 }),
    grama: lam({ color: 0x596b39 }),
    vidro: lam({ color: 0x9fd0e6, transparent: true, opacity: 0.5 }),
  };

  // addBox: empurra AABB + occluder por padrão (collide:false pula os dois)
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    root.add(m);
    if (opts.collide !== false) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
      occluders.push(m);
    }
    return m;
  }
  function addFloor(w, d, mat, x, z, y = 0.01) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m;
  }
  // col: colisor AABB SEM malha (pros props GLB — colisão vale mesmo se o GLB não carregar)
  const col = (x, z, hx, hz, h) => colliders.push({ minX: x - hx, maxX: x + hx, minY: 0, maxY: h, minZ: z - hz, maxZ: z + hz });
  // prop: coloca GLB (se carregou) + colisor manual da pegada
  function prop(id, x, z, targetH, ry, hx, hz, h) {
    const o = placeProp(id, { x, z, y: 0, targetH, ry });
    if (o) { root.add(o); occluders.push(o); }
    if (hx) col(x, z, hx, hz, h);
    return o;
  }

  /* ---------------- chão: asfalto + pátio de concreto + gramados ---------------- */
  scene.background = new THREE.Color(0xf1b063);   // céu de fim de tarde (laranja)
  scene.fog = new THREE.Fog(0xe6a35a, 60, 150);
  addFloor(HALF_X * 2, HALF_Z * 2, MAT.asfalto, 0, 0, 0.01);
  addFloor(34, 30, MAT.apron, 2, 0, 0.03);                              // pátio de concreto (acima do asfalto: sem z-fight)
  for (const sx of [-1, 1]) addFloor(6, HALF_Z * 2, MAT.grama, sx * 25, 0, 0.02);   // gramado das bordas
  // manchas de óleo no pátio + faixas de vaga (decoração, sem colisão)
  const oleo = lam({ color: 0x3a3d42, transparent: true, opacity: 0.5 });
  for (const [ox, oz, r] of [[-6, -7, 1.4], [12, 6, 1.1], [8, -10, 1.3], [-2, 9, 1.0], [4, 12, 1.2]]) {
    const s = new THREE.Mesh(new THREE.CircleGeometry(r, 16), oleo);
    s.rotation.x = -Math.PI / 2; s.position.set(ox, 0.035, oz); root.add(s);
  }
  const faixa = lam({ color: 0xd8d2c0 });
  for (const sz of [-1, 1]) for (let i = -3; i <= 3; i++)
    addBox(0.35, 0.02, 2.2, faixa, i * 3, 0.02, sz * 26, { collide: false, cast: false });   // faixas da rodovia
  for (const sx of [-1, 1]) for (const iz of [-11, -4, 3, 10])                                // vagas do pátio
    addBox(0.14, 0.02, 4.5, faixa, 15 * sx, 0.04, iz, { collide: false, cast: false });

  /* ---------------- muro perimetral (mantém o duelo dentro do posto) ---------------- */
  const wX = HALF_X - 0.5, wZ = HALF_Z - 0.5;
  addBox(HALF_X * 2, 3.2, 0.6, MAT.loja, 0, 0, -wZ);
  addBox(HALF_X * 2, 3.2, 0.6, MAT.loja, 0, 0, wZ);
  addBox(0.35, 1.4, HALF_Z * 2, MAT.aco, wX, 0, 0);       // guarda-corpo leste: a RODOVIA fica visível além (bounds seguram o player)
  addBox(0.6, 3.2, HALF_Z * 2, MAT.loja, -wX, 0, 0);

  /* ---------------- LOJA DE CONVENIÊNCIA (corredor oeste, fundo de cover) ----------------
     Volume de 8×24 encostado no muro oeste, fachada de vidro virada pro pátio (+x). Deixa
     um vão de porta no centro (z ∈ [-2,2]) pra não virar um paredão de 24 m. */
  {
    const LX = -21, LD = 8, LH = 5;
    // paredes: duas metades deixando a porta central
    for (const [z0, z1] of [[-12, -2], [2, 12]]) {
      const len = z1 - z0, cz = (z0 + z1) / 2;
      addBox(LD, LH, len, MAT.loja, LX, 0, cz);
    }
    addBox(LD, LH, 24, MAT.loja, LX, 0, 0, { collide: false, cast: false });   // fundo/teto visual
    addBox(LD + 0.6, 0.5, 25, MAT.lojaBanda, LX, LH, 0, { collide: false });   // beiral vermelho
    // fachada de vidro virada pro pátio (face leste), nas duas metades
    for (const cz of [-7, 7]) addBox(0.1, 3.2, 9, MAT.vidro, LX + LD / 2, 0.2, cz, { collide: false });
    // letreiro "POSTO DA TRETA" no topo da fachada (canvas com aspecto casado = não corta)
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.4), new THREE.MeshLambertMaterial({ map: signTex('#111417', '#ffd23f', 'POSTO DA TRETA', 'CONVENIÊNCIA 24H', 792, 172) }));
    sign.position.set(LX + LD / 2 + 0.05, 4.2, 0); sign.rotation.y = Math.PI / 2; root.add(sign);
  }

  /* ---------------- MARQUISE central sobre as ilhas de bomba (corredor central) ----------------
     Teto plano a 5,5 m sobre 6 pilares. Teto e fáscia collide:false (passa por baixo);
     os 6 pilares colidem. É o pátio disputado — a bandeira MID mora aqui. */
  {
    const CY = 5.5, cx = 4;
    addBox(20, 0.5, 22, MAT.marquise, cx, CY, 0, { collide: false });
    addBox(19.2, 0.08, 21.2, MAT.marquiseBaixo, cx, CY - 0.09, 0, { collide: false, cast: false });   // forro
    for (const bz of [-9, -3, 3, 9]) addBox(19.2, 0.18, 0.2, MAT.aco, cx, CY - 0.2, bz, { collide: false, cast: false });   // vigas do forro
    for (const s of [-1, 1]) {   // fáscia (borda) N/S e L/O
      addBox(20, 0.9, 0.4, MAT.fascia, cx, CY - 0.2, s * 11, { collide: false });
      addBox(0.4, 0.9, 22, MAT.fascia, cx + s * 10, CY - 0.2, 0, { collide: false });
    }
    for (const px of [cx - 8, cx + 8]) for (const pz of [-9, 0, 9]) {
      addBox(0.55, CY, 0.55, MAT.pilar, px, 0, pz);   // pilar (colide)
    }
    // 3 ILHAS DE BOMBA sob a marquise (cover de peito): meio-fio + 2 bombas cada
    for (const iz of [-8, 0, 8]) {
      addBox(4.4, 0.22, 1.8, MAT.curb, cx, 0, iz, { collide: false });        // meio-fio baixo (não trava tiro)
      for (const dx of [-1.1, 1.1]) {
        addBox(0.7, 1.5, 0.55, MAT.bomba, cx + dx, 0.22, iz);                 // corpo da bomba (colide)
        addBox(0.72, 0.4, 0.57, MAT.bombaTopo, cx + dx, 1.72, iz, { collide: false });   // visor
        const mang = addBox(0.08, 0.9, 0.08, MAT.aco, cx + dx + 0.4, 0.5, iz, { collide: false }); mang.rotation.z = 0.3;
      }
    }
  }

  /* ---------------- postes de luz da hora dourada (4 cantos) ---------------- */
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = sx * 20, pz = sz * 24;
    addBox(0.35, 8, 0.35, MAT.aco, px, 0, pz);
    const head = addBox(2.2, 0.3, 0.6, MAT.aco, px - sx * 1, 8, pz, { collide: false });
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.4), new THREE.MeshBasicMaterial({ color: 0xfff2c4 }));
    lamp.position.set(px - sx * 1.2, 7.9, pz); root.add(lamp);
  }

  /* ---------------- COVER: props GLB + colisores manuais (simétrico em z) ----------------
     A pegada de colisão é declarada à mão (col) pra não depender do GLB carregar. */
  // veículos parados no corredor oeste e leste
  prop('kombi', -14, -9, 2.2, Math.PI / 2, 1.1, 2.3, 2.0);
  prop('saveiro', -14, 9, 1.7, Math.PI / 2, 1.1, 2.3, 1.6);
  prop('fusca', 18, -10, 1.6, -0.4, 1.0, 1.9, 1.5);
  prop('fusca', 18, 10, 1.6, 0.4 + Math.PI, 1.0, 1.9, 1.5);
  // botijões de gás encostados na loja (cover baixo)
  for (const sz of [-1, 1]) prop('botijao_gas', -16, sz * 5, 0.9, 0, 1.2, 0.7, 0.9);
  // dumpster nas pontas da loja
  for (const sz of [-1, 1]) prop('dumpster', -16.5, sz * 14, 1.7, Math.PI / 2, 1.4, 1.0, 1.6);
  // pilhas de pneu nos cantos do pátio
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) prop('pilha_pneus', 12 + sx * 4, sz * 12, 1.5, 0, 1.0, 1.0, 1.4);
  // jersey barriers dividindo o pátio leste (medianas)
  for (const sz of [-1, 1]) { prop('jersey_barrier', 14, sz * 4, 1.0, 0, 0.5, 1.6, 1.0); }
  // sandbags de proteção nas aproximações dos spawns
  for (const sz of [-1, 1]) for (const dx of [-6, 0, 6]) prop('sandbags', dx, sz * 22, 0.9, dx === 0 ? Math.PI / 2 : 0, 1.6, 0.8, 0.8);
  // concrete roadblocks nas entradas
  for (const sz of [-1, 1]) for (const dx of [-3, 9]) prop('concrete_roadblock', dx, sz * 27, 1.0, 0, 1.2, 0.5, 1.0);
  // quiosque de conveniência no pátio leste
  prop('quiosque', 16, 0, 2.6, -Math.PI / 2, 1.6, 1.6, 2.4);

  /* ---------------- FILA / CONGESTIONAMENTO fora do posto (a TRETA começou na fila) ----------------
     Carros enfileirados nos dois acessos (norte/sul), do lado leste, bico apontando pras bombas —
     bumper a bumper. Colidem (viram cover na aproximação). É a história: preço alto → fila → treta. */
  const carPool = ['opala', 'chevette', 'brasilia_vw', 'fiat_uno', 'uno_mille', 'fusca'];
  let ci = 0;
  for (const sz of [-1, 1]) {
    for (const [cz, cx, jit] of [[31, 17, 0.12], [25.5, 17.6, -0.1], [20, 18, 0.14], [16, 16.4, -0.08]]) {
      prop(carPool[ci++ % carPool.length], cx, sz * cz, 1.5, (sz < 0 ? 0 : Math.PI) + jit, 1.0, 2.2, 1.4);
    }
    // parede de carros no fundo leste (fileira pronta) = o congestionamento seguindo na rodovia
    prop('fileira_carros', 24.5, sz * 22, 2.0, Math.PI / 2, 1.5, 6, 1.9);
  }

  /* ---------------- BAIRRO EM VOLTA + RODOVIA (complementa o entorno, estilo favela) ----------------
     Casas de favela ALÉM dos muros O/N/S (só backdrop, peekando por cima do muro de 3,2 m). A LESTE
     o muro é baixo e além dele a RODOVIA: fila de caminhão da greve travando a pista + carros. Tudo
     fora dos bounds → sem colisor, não afeta spawn/waypoint (o player é contido pelos bounds). */
  const casas = ['fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio'];
  let hi = 0;
  for (let z = -33; z <= 33; z += 7) prop(casas[hi++ % casas.length], -(HALF_X + 5 + (hi % 2) * 2.5), z, 7 + (hi % 3), Math.PI / 2);   // oeste
  for (let x = -22; x <= 22; x += 7) {                                                                                                  // norte/sul
    prop(casas[hi++ % casas.length], x, -(HALF_Z + 5 + (hi % 2) * 2.5), 7 + (hi % 3), 0);
    prop(casas[hi++ % casas.length], x, (HALF_Z + 5 + (hi % 2) * 2.5), 7 + (hi % 3), Math.PI);
  }
  // RODOVIA a leste (asfalto + faixas) + fila de caminhão da greve + carros
  const hwFaixa = lam({ color: 0xd8d2c0 });
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(22, HALF_Z * 2), MAT.asfalto);
  hw.rotation.x = -Math.PI / 2; hw.position.set(HALF_X + 11, 0.02, 0); root.add(hw);
  for (let z = -34; z <= 34; z += 4) addBox(0.3, 0.02, 2.2, hwFaixa, HALF_X + 11, 0.03, z, { collide: false, cast: false });
  const hwPool = ['vw_9150', 'bus', 'onibus_urbano', 'vw_9150'];
  let ti = 0;
  for (let z = -32; z <= 32; z += 8) prop(hwPool[ti++ % hwPool.length], HALF_X + 5.5, z, 3.6, -Math.PI / 2);   // fila de caminhão (pista de dentro)
  for (let z = -30; z <= 30; z += 6.5) prop(carPool[ci++ % carPool.length], HALF_X + 14, z, 1.5, -Math.PI / 2); // carros (pista de fora)

  /* ---------------- MAIS ELEMENTOS NO PÁTIO ---------------- */
  prop('moto_cg', 6, 4, 1.1, -0.3, 0.5, 1.0, 1.0);            // moto abastecendo numa bomba
  prop('cooler', -9, -1, 0.9, 0, 0.6, 0.6, 0.8);              // cooler de bebida na frente da loja
  prop('caixa_som', -9, 1.4, 1.1, 0, 0.5, 0.5, 1.0);
  prop('shopping_cart', 8, -5, 1.0, 0.5, 0.5, 0.5, 0.9);      // carrinho largado
  for (const sz of [-1, 1]) prop('mesa_guardasol', -8, sz * 9, 2.3, 0, 1.3, 1.3, 2.2);   // mesas da conveniência
  // cones de sinalização (procedural, laranja) espalhados pelo pátio
  const coneMat = lam({ color: 0xe0551e });
  for (const [cx, cz] of [[0, -5], [10, 2], [-2, 6], [8, 9], [2, -11], [12, -3]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 10), coneMat);
    cone.position.set(cx, 0.35, cz); cone.castShadow = true; root.add(cone);
    addBox(0.5, 0.05, 0.5, lam({ color: 0xded4c0 }), cx, 0.02, cz, { collide: false, cast: false });
  }
  // tambores de óleo (procedural) encostados na loja
  const drumMat = lam({ color: 0x2e6f9e });
  for (const sz of [-1, 1]) for (const d of [-0.5, 0.5]) {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), drumMat);
    drum.position.set(-15.5 + d * 0.75, 0.45, sz * 10.5); drum.castShadow = true; root.add(drum);
    col(-15.5 + d * 0.75, sz * 10.5, 0.4, 0.4, 0.9);
  }

  /* ---------------- PLACAS (totem de preço, rótulos das bombas, avisos, outdoor) ---------------- */
  // placa de DOIS LADOS: duas faces costa-a-costa (cada uma FrontSide), então o texto lê
  // CERTO dos dois lados — nada de espelhado como um plano DoubleSide faz por trás.
  const signMesh = (w, h, tx2, x, y, z, ry) => {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(w, h);
    const front = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); front.position.z = 0.02;
    const back = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tx2 })); back.position.z = -0.02; back.rotation.y = Math.PI;
    g.add(front, back); g.position.set(x, y, z); g.rotation.y = ry; root.add(g); return g;
  };
  {
    // TOTEM DE PREÇO na entrada leste (o marco de longe do posto): painel VERTICAL bem alto
    // com preços absurdos — é a propaganda do preço que causou a treta. Duas faces FrontSide
    // (cada uma virada pro seu lado) pra o texto NÃO espelhar como antes.
    const tx = 24, tz = 0, CY = 7.5, BH = 5.8, BW = 4.4, BD = 0.6;
    addBox(0.4, CY + BH / 2 + 0.3, 0.4, MAT.aco, tx, 0, tz);                  // mastro FINO (atrás do painel), sobe até o topo do board
    addBox(BD, BH, BW, MAT.bombaTopo, tx, CY - BH / 2, tz, { collide: false }); // board (moldura) centrado em CY — mesmo centro do painel
    const preco = priceTex();
    const face = (fx, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 5.2), new THREE.MeshLambertMaterial({ map: preco })); m.position.set(tx + fx, CY, tz); m.rotation.y = ry; root.add(m); };
    face(-(BD / 2 + 0.03), -Math.PI / 2);   // face pátio (-x): painel FICA na frente do mastro
    face(BD / 2 + 0.03, Math.PI / 2);        // face rodovia (+x)
  }
  // FAIXA de protesto contra o preço (reforça a história), pendurada no muro leste
  signMesh(9, 1.6, signTex('#111417', '#ff4d4d', 'GASOLINA A 14,99?!', 'ISSO QUE DEU TRETA', 700, 128), wX - 0.5, 2.4, 10, -Math.PI / 2);
  // rótulos coloridos nas 3 ilhas de bomba (COMUM / ADITIVADA / DIESEL)
  const rotulos = [['COMUM', '#2e8b57'], ['ADITIVADA', '#c0392b'], ['DIESEL', '#111417']];
  rotulos.forEach(([txt, cor], i) => {
    const tz = [-8, 0, 8][i];
    signMesh(2.2, 0.7, signTex(cor, '#ffffff', txt, ''), 4, 2.5, tz, -Math.PI / 2);
  });
  // placa em poste: o mastro termina na BASE da placa (não cruza o texto)
  const postSign = (x, z, cy, w, h, tx2, ry, poleW = 0.16) => {
    addBox(poleW, cy - h / 2, poleW, MAT.aco, x, 0, z);   // mastro sobe só até a base da placa
    signMesh(w, h, tx2, x, cy, z, ry);
  };
  // placas de aviso (entradas norte/sul)
  for (const sz of [-1, 1]) postSign(-13, sz * 30, 2.6, 2.2, 1.1, signTex('#1f5fbf', '#ffffff', 'ENTRADA', 'DEVAGAR'), sz < 0 ? 0 : Math.PI, 0.18);
  // aviso "PROIBIDO FUMAR" perto das bombas
  postSign(-3, -2, 2.0, 1.4, 1.4, signTex('#c0392b', '#ffffff', 'PROIBIDO', 'FUMAR'), Math.PI / 2, 0.14);
  // OUTDOOR grande no muro leste (usa um poster da coleção, se houver; senão um letreiro)
  {
    const imgs = (T && T.posterImgs) || [], asp = (T && T.posterAspects) || [];
    const board = new THREE.MeshLambertMaterial(imgs.length
      ? { map: imgs[0], side: THREE.DoubleSide }
      : { map: signTex('#111417', '#e03c3c', 'TRETA SUPREMA', 'ABASTECE E VAZA'), side: THREE.DoubleSide });
    const A = imgs.length ? (asp[0] || 0.7) : 2.2;
    const H = 5;
    addBox(0.3, 6, H * A + 1, MAT.aco, wX - 0.4, 3, -18, { collide: false });   // moldura
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(H * A, H), board);
    bm.position.set(wX - 0.6, 5.5, -18); bm.rotation.y = -Math.PI / 2; root.add(bm);
  }

  /* ---------------- GREVE DOS CAMINHONEIROS (reflete o Brasil: preço alto → greve → protesto) ----------------
     FORA do "quadrado da treta" (o pátio das bombas), nas duas aproximações onde os times
     nascem: caminhão parado atravessado (o bloqueio da greve), placas de protesto fincadas
     (de DOIS lados, com gíria) e manequins-manifestantes. Simétrico = greve nacional, CTF justa.
     Placas e cabos são collide:false → decoração pura, não travam spawn nem rota de bot. */
  const placard = (x, z, ry, txt) => {
    addBox(0.08, 2.15 - 0.85 / 2, 0.08, MAT.aco, x, 0, z, { collide: false });            // cabo até a base do cartaz
    signMesh(1.5, 0.85, signTex('#f2f2f2', '#111417', txt, '', 512, 290), x, 2.15, z, ry);  // cartaz (2 lados)
  };
  /* Cada acesso pega a PAUTA de um campo (sem citar político nenhum — sátira do jogo, cujos
     times já são PETISTAS × BOLSONARISTAS). Frases de protesto reais de cada lado:
       · SUL  = Time E (PETISTAS)     → ESQUERDA: taxar ricos, culpa da gestão passada, auxílio…
       · NORTE = Time B (BOLSONARISTAS) → DIREITA: menos imposto, imposto é roubo, estado mínimo… */
  const ESQUERDA = ['TAXAR OS RICOS', 'CULPA DA GESTÃO PASSADA', 'AUXÍLIO PRO POVO', 'RICO PAGA POUCO IMPOSTO', 'QUEM QUEBROU O PAÍS?', 'DIREITOS JÁ'];
  const DIREITA = ['MENOS IMPOSTO JÁ', 'IMPOSTO É ROUBO', 'CHEGA DE CORRUPÇÃO', 'ESTADO MÍNIMO', 'CHEGA DE GASTANÇA', 'PRIVATIZA JÁ'];
  const bannerL = signTex('#c0392b', '#ffffff', 'TAXA OS RICOS', 'NÃO O TRABALHADOR', 700, 160);   // esquerda (vermelho)
  const bannerR = signTex('#1f5fbf', '#ffd23f', 'IMPOSTO É ROUBO', 'MENOS ESTADO, MAIS LIBERDADE', 700, 160);   // direita (azul/amarelo)
  for (const sz of [-1, 1]) {
    const yaw = sz < 0 ? 0 : Math.PI;
    const pool = sz < 0 ? ESQUERDA : DIREITA;   // sul = esquerda, norte = direita
    prop('vw_9150', -3, sz * 34.3, 3.0, Math.PI / 2, 3.6, 1.3, 2.8);                       // caminhão da greve, atravessado
    [[-14, 30], [-12, 25], [13, 30], [11, 25], [-6, 33], [7, 33]].forEach(([px, pz], i) =>
      placard(px, sz * pz, yaw + (i % 2 ? 0.3 : -0.3), pool[i % pool.length]));
    for (const [mx, mz] of [[-14, 27], [13, 27], [-13, 32]]) prop('manequim', mx, sz * mz, 1.8, yaw, 0.4, 0.4, 1.8);
    // faixa-manifesto na parede do fundo, virada pro time daquele lado
    signMesh(7, 1.6, sz < 0 ? bannerL : bannerR, -6, 2.5, sz * (wZ - 0.3), sz < 0 ? 0 : Math.PI);
  }

  /* ---------------- ARMAS NO CHÃO (pickups, simétrico) ---------------- */
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
  // ARSENAL na frente de cada spawn (fileira no chão, igual os outros mapas): cada time saca
  // suas armas perto de onde nasce. Espelhado em z pra E (sul) e B (norte).
  const ARSENAL = ['awp', 'ak', 'm4', 'shotgun', 'mp5', 'deagle', 'pistol'];
  for (const sz of [-1, 1]) {
    const z = sz * 29, yaw = sz < 0 ? 0 : Math.PI;
    ARSENAL.forEach((k, i) => place(k, -9 + i * 3, z, yaw));
  }
  // 2 fuzis DISPUTADOS no centro (sob a marquise) — o motivo de correr pro meio
  place('ak', 1, -2, 0); place('m4', 7, 2, 0);

  /* ---------------- luz de fim de tarde ---------------- */
  const hemi = new THREE.HemisphereLight(0xffe0b0, 0x40352a, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd39a, 1.6);
  sun.position.set(-38, 26, 14); sun.castShadow = true;   // sol baixo no oeste (atrás da loja)
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 42; sun.shadow.camera.bottom = -42;
  sun.shadow.camera.far = 140; sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xbcd0ff, 0.35);
  fill.position.set(20, 30, -10); scene.add(fill);

  /* ---------------- contrato de terreno ---------------- */
  const groundHeightAt = () => 0;
  const slowAt = () => false;

  /* ---------------- waypoints (grade sobre o piso, bloqueada por colisor) ---------------- */
  const nodes = [], adj = [];
  const STEP = 3.4;
  const blocked = (x, z, inflate) => {
    for (const c of colliders) {
      if (x > c.minX - inflate && x < c.maxX + inflate && z > c.minZ - inflate && z < c.maxZ + inflate && c.minY < 1.6 && c.maxY > 0.15) return true;
    }
    return false;
  };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => {
    for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) {
    adj.push([]);
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z, d2 = dx * dx + dz * dz;
      if (d2 < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j);
    }
  }
  // Mantém só o maior componente: a grade deixa nó isolado em bolsão de colisor (sem rota).
  {
    const par = nodes.map((_, i) => i);
    const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    for (let i = 0; i < adj.length; i++) for (const j of adj[i]) { const ri = f(i), rj = f(j); if (ri !== rj) par[ri] = rj; }
    const cnt = new Map(); for (let i = 0; i < nodes.length; i++) { const r = f(i); cnt.set(r, (cnt.get(r) || 0) + 1); }
    let big = 0, bn = -1; for (const [r, c] of cnt) if (c > bn) { bn = c; big = r; }
    const keep = nodes.map((_, i) => f(i) === big);
    const idx = new Int32Array(nodes.length); let n = 0;
    for (let i = 0; i < nodes.length; i++) idx[i] = keep[i] ? n++ : -1;
    const nn = [], na = [];
    for (let i = 0; i < nodes.length; i++) if (keep[i]) { nn.push(nodes[i]); na.push(adj[i].filter((j) => keep[j]).map((j) => idx[j])); }
    nodes.length = 0; nodes.push(...nn); adj.length = 0; adj.push(...na);
  }
  function nearestWaypoint(x, z) { let best = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } return best; }
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const prev = new Int16Array(nodes.length).fill(-1);
    const q = [fromIdx]; prev[fromIdx] = fromIdx;
    while (q.length) {
      const n = q.shift();
      for (const m of adj[n]) if (prev[m] === -1) {
        prev[m] = n;
        if (m === toIdx) { const path = [m]; let c = n; while (c !== fromIdx) { path.unshift(c); c = prev[c]; } path.unshift(fromIdx); return path; }
        q.push(m);
      }
    }
    return [fromIdx];
  }

  /* ---------------- PIXAÇÃO (mesma passada dos outros mapas) ----------------
     Acha parede por raio a partir dos waypoints e pinta tag/bomba/cartaz na loja e nos
     muros. Roda DEPOIS dos waypoints. É decalque: não muda colisão nem rota de bot. */
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-selvagem.png', 'tag-money.png', 'tag-pingo.png', 'or-graf-treta.png', 'or-graf-coro.png']);
  const D_BOMBA = decalIds(T, ['peca-bolha.png', 'alfabeto-bolha.png', 'alfabeto-bolha2.png', 'alfabeto-grosso-01.png', 'tag-flop.png', 'tags-treino-04.png']);
  const D_CARTAZ = (T && T.decalsDoTipo) ? T.decalsDoTipo('cartaz') : [];
  grafitar({
    id: 'posto_treta', root, T, waypoints: nodes, seed: 4242, passo: 1.9, alcance: 8.5, cobre: 0.05, minLarg: 0.35,
    bandas: [
      // CARTAZES DA COLEÇÃO (public/posters/) — lambe-lambe na altura do olho, ESPAÇADO (não amontoa)
      { y0: 0.9, y1: 2.3, larg: 1.7, alturas: [1.4, 1.1], chance: 20, fonte: 'poster', pool: (T.posterFiles || []).map((_, i) => i) },
      // tag na banda do olho, mais espaçada
      { y0: 0.5, y1: 2.4, larg: 2.6, alturas: [1.5, 1.1, 0.8], chance: 55, pool: D_TAG.concat(D_CARTAZ) },
      // bomba na banda alta (acima da linha do duelo)
      { y0: 2.6, y1: 4.2, larg: 3.4, alturas: [1.5, 1.1], chance: 60, pool: D_BOMBA.concat(D_TAG) },
    ],
    // MURAIS DE HOMENAGEM (or-mural-*.jpg) — as peças grandes coloridas, bem separadas
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 61, separacao: 18 },
  });

  /* ---------------- spawns (E sul / B norte) + bandeiras CTF (triângulo) ---------------- */
  const mk = s => [-8, -2, 4, 10].map(x => ({ x, z: (HALF_Z - 6) * s, yaw: s < 0 ? 0 : Math.PI }));
  const spawns = { E: mk(-1), B: mk(1) };

  /* BUG-57: posto de estrada tem caramelo dormindo perto da bomba e pombo na marquise. */
  const ambience = createFavelaAmbience(root, {
    map: 'posto_treta',
    rats: [
      { pos: [-12, 0, -26], to: [-9.5, 0, -23.5], phase: .3 },
      { pos: [12, 0, 26], to: [9.5, 0, 23.5], phase: 1.6 },
    ],
    pigeons: [
      { mode: 'ground', pos: [-15, 0, 6], phase: .5 }, { mode: 'ground', pos: [16, 0, -6], phase: 1.4 },
      { mode: 'flight', pos: [0, 9, 0], radius: [7, 5], phase: .8 },
    ],
    dogs: [{ pos: [-4, 0, 20], to: [0, 0, 20], phase: .5 }],
  });

  return {
    ambience,
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    // triângulo (NÃO-colinear): MID sob a marquise (x=4), E/B no pátio oeste (x=-10)
    ctfPoints: [
      { id: 'E', label: 'PÁTIO SUL', x: -10, z: -12 },
      { id: 'MID', label: 'MARQUISE', x: 4, z: 0 },
      { id: 'B', label: 'PÁTIO NORTE', x: -10, z: 12 },
    ],
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
