// Atacadão da Treta: ARMAZÉM DE CLUBE DE ATAQUE. O dono recusou o átrio de loja de
// departamento em 27/08/2026 — "nao deixar tanto aberto, e sim colocar mais elementos
// pro mapa aumentar um pouco de complexidade" e "o atacadao nao queria tanto igual o
// lojas havan, tem que fazer algo de diferente". A resposta não é decoração: o miolo
// virou LABIRINTO DE RACK DE PALLET (estante_pallets.glb, kit atacadao_r3 do Mint),
// seis fileiras de 3 m de altura formando corredores de ~4 m com ENTRADAS ALTERNADAS,
// ilha de caixa como cover de peito nos cruzamentos e parede fria de freezer na
// lateral leste. Perímetro FECHADO de galpão (sem vitrine de vidro), pé-direito de
// 11 m e luminária industrial pendurada — idioma emprestado do galpão do campomorro
// (public/js/map_campomorro.js:355), porque teto opaco não pode depender do sol.
// O estacionamento ao sul (spawn E) e a rua de fundo continuam iguais: é lá que o
// CTF respira. Régua: tools/eval/atacadao-check.mjs (ATA1..ATA5, LOS média <= 10,5 m).
// Colisão só AABB. Mesmo contrato de build(scene, T) da Loja H.
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { decalIds } from './map_decals.js';
import { grafitar } from './graffiti_pass.js';
import { createFavelaAmbience } from './ambientlife.js';
import { AMB_LOOPS } from './soundscape.js';

export const ATACADAO_PROPS = [
  // armazém (kit atacadao_r3, Mint ~4,5k tris cada)
  'estante_pallets', 'freezer', 'ilha_caixas',
  // doca e chão de loja
  'shopping_cart', 'cooler', 'pilha_pneus', 'dumpster', 'vw_9150',
  // estacionamento + entorno (bairro/cidade de fundo)
  'fileira_carros', 'kombi', 'saveiro', 'opala', 'fiat_uno', 'chevette', 'brasilia_vw', 'fusca',
  'fav_house', 'fav_modular', 'fav_brasileira', 'fachada_comercio',
];

const HALF_X = 26, WALL_H = 11, PARK_H = 2.4;   // WALL_H 8 -> 11: pé-direito de galpão, o rack tem 3 m
/* ── LATTICE DO ARMAZÉM ─────────────────────────────────────────────────────────
   Tudo aqui é múltiplo de STEP/2 = 1,6 m DE PROPÓSITO. O grafo de navegação deste
   mapa é uma grade de 3,2 m; se a fileira de rack cai em cima do nó, o corredor
   existe na imagem e não existe para o bot (e a régua ATA1 exige nó andável dentro
   do vão). Fileiras nos x ÍMPARES do lattice, corredores nos PARES. */
const FILA_X = [-17.6, -11.2, -4.8, 4.8, 11.2, 17.6];   // 6 fileiras de rack
const RACK_Z = [1.6, 4.8, 8.0, 11.2, 14.4, 17.6, 20.8, 24.0, 27.2];   // 9 slots por fileira
const VAO_PAR = 11.2, VAO_IMPAR = 20.8;   // slot vazado: entrada ALTERNADA por fileira
const RACK_HX = 1.15, RACK_HZ = 1.6, RACK_H = 3.0;   // meio-bloco: rack GLB + pallets atrás

const ZF = -12;   // fachada (separa estacionamento × loja). Era -6: a praça de caixas
                  // não cabia no lattice de navegação e o flanco oeste virava componente ilhado.
const ZN = 33;    // fundo da loja (norte)
const ZS = -42;   // fundo do estacionamento (sul, a rua)
const LOJA_Z0 = ZF, LOJA_Z1 = ZN;   // faixa que a régua ATA5 chama de "dentro do galpão"

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

  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    root.add(m);
    if (opts.collide !== false) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 }); occluders.push(m); }
    return m;
  }
  function addFloor(w, d, mat, x, z, y = 0.01) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); return m; }
  const col = (x, z, hx, hz, h) => colliders.push({ minX: x - hx, maxX: x + hx, minY: 0, maxY: h, minZ: z - hz, maxZ: z + hz });
  function prop(id, x, z, targetH, ry, hx, hz, h) { const o = placeProp(id, { x, z, y: 0, targetH, ry }); if (o) { root.add(o); occluders.push(o); } if (hx) col(x, z, hx, hz, h); return o; }
  const gprop = (id, x, z, h, ry) => { const o = placeProp(id, { x, z, y: 0, targetH: h, ry }); if (o) { root.add(o); occluders.push(o); } return o; };
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

  /* ── CASCA DO GALPÃO ────────────────────────────────────────────────────────
     Perímetro FECHADO: a vitrine de vidro de 5,4 m que existia sobre as portas era
     o que fazia a loja ler como shopping. Some inteira; sobra alvenaria cega até os
     11 m, laje opaca (sem o plano de "céu" que entrava pelo teto) e treliça. */
  addBox(HALF_X * 2, WALL_H, 0.8, MAT.parede, 0, 0, ZN);                          // parede norte
  for (const sx of [-1, 1]) addBox(0.8, WALL_H, ZN - ZF, MAT.parede, sx * wX, 0, (ZF + ZN) / 2);  // laterais (loja)
  addBox(HALF_X * 2, 0.5, ZN - ZF, MAT.metal, 0, WALL_H, (ZF + ZN) / 2, { collide: false, cast: false });   // laje opaca
  for (let z = ZF + 3; z <= ZN; z += 6.4) addBox(HALF_X * 2, 0.34, 0.34, MAT.metal, 0, WALL_H - 0.5, z, { collide: false, cast: false });   // terças
  /* Tirante baixo a 5 m: é o VIGAMENTO onde a pomba de galpão pousa (ambiência, adiante). */
  const vigas = [];
  for (const z of [1.6, 14.4, 27.2]) vigas.push(addBox(HALF_X * 2 - 2, 0.26, 0.26, MAT.metal, 0, 5.0, z, { collide: false, cast: false }));
  for (const px of [-22.4, 22.4]) for (const pz of [1.6, 14.4, 27.2]) { addBox(0.7, WALL_H, 0.7, MAT.pilar, px, 0, pz); addBox(0.9, 0.5, 0.9, MAT.pilarBase, px, 0, pz, { collide: false }); }

  // A verga (minY=3) sobre os vãos das portas não pode virar colisor: barra o tiro, não o player.
  {
    const gaps = [[-15, -9], [-3, 3], [9, 15]];   // 3 vãos: esq, CENTRO (libera 2ª rota CTF2 pelo corredor central), dir
    let xc = -wX;
    for (const [g0, g1] of gaps) {
      if (g0 > xc) { addBox(g0 - xc, 2.6, 0.6, MAT.parede, (xc + g0) / 2, 0, ZF); addBox(g0 - xc, WALL_H - 2.6, 0.6, MAT.parede, (xc + g0) / 2, 2.6, ZF, { collide: false }); }
      addBox(g1 - g0, WALL_H - 3, 0.6, MAT.parede, (g0 + g1) / 2, 3, ZF, { collide: false });   // verga sobre a porta
      xc = g1;
    }
    if (wX > xc) { addBox(wX - xc, 2.6, 0.6, MAT.parede, (xc + wX) / 2, 0, ZF); addBox(wX - xc, WALL_H - 2.6, 0.6, MAT.parede, (xc + wX) / 2, 2.6, ZF, { collide: false }); }
    // portais de ENTRADA e SAÍDA
    signMesh(5.4, 1.0, signTex('#1f5fbf', '#ffffff', 'ENTRADA', 'ENTRE E TRETE', 640, 160), -12, 3.3, ZF - 0.1, 0);
    signMesh(5.4, 1.0, signTex('#1f5fbf', '#ffffff', 'SAÍDA', 'JÁ VAI?', 640, 160), 12, 3.3, ZF - 0.1, 0);
    // letreiro grande ATACADÃO acima da alvenaria (vê da rua e de dentro)
    signMesh(16, 3.0, signTex('#c0392b', '#ffd23f', 'ATACADÃO DA TRETA', 'PREÇO DE ATACADO... OU NEM TANTO', 900, 180), 0, 7.4, ZF, 0);
  }
  // parede de fundo (norte) também com o letreiro
  signMesh(16, 3.0, signTex('#c0392b', '#ffd23f', 'ATACADÃO DA TRETA', 'ABERTO ATÉ A TRETA ACABAR', 900, 180), 0, 7.2, ZN - 0.5, Math.PI);

  /* ══════════════════════════════════════════════════════════════════════════
     LABIRINTO DE RACK — o coração da frente.
     Cada SLOT é rack de pallet (GLB, 3 m) + carga paletizada encostada atrás: o
     bloco fica com 2,3 m de profundidade, que é o que fecha a linha de visão de
     verdade. Um rack sozinho tem 1,1 m e o jogador enxerga o corredor seguinte
     por cima da carga — foi o primeiro layout medido e a LOS mal caiu.
     ENTRADA ALTERNADA: fileira par vaza o slot z=11,2; ímpar vaza o z=20,8. Quem
     corre um corredor inteiro não sai do outro lado no mesmo lugar do vizinho.
     ══════════════════════════════════════════════════════════════════════════ */
  const PALLET = [lam({ color: 0x8a6a3c }), lam({ color: 0xb8b2a4 }), lam({ color: 0x2e6f9e }), lam({ color: 0xc0392b })];
  const racks = [];
  /* A geometria do slot mora DENTRO do Group marcado, não solta no `root`. Não é
     arrumação: a régua (e qualquer mutação futura) remove o Group para provar que o
     labirinto é o que fecha a linha de visão. Com as malhas soltas no root, tirar o
     marcador não tirava um pixel e a ATA5 media a mesma LOS com e sem rack — número
     de instrumento quebrado é pior que número nenhum (docs/LICOES.md). */
  const rackBox = (g, w, h, d, mat, dx, dy, dz, sombra = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(dx, dy + h / 2, dz); m.castShadow = sombra; m.receiveShadow = true;
    g.add(m); occluders.push(m); return m;
  };
  FILA_X.forEach((fx, fi) => {
    const vaoDaFila = fi % 2 === 0 ? VAO_PAR : VAO_IMPAR;
    const paraDentro = fx < 0 ? 1 : -1;     // o rack encara o corredor CENTRAL; a carga fica do lado de fora
    RACK_Z.forEach((rz, zi) => {
      if (rz === vaoDaFila) return;         // o vão: entrada alternada
      const g = new THREE.Group(); g.position.set(fx, 0, rz); root.add(g);
      const estante = placeProp('estante_pallets', { x: -paraDentro * 0.58, z: 0, y: 0, targetH: RACK_H, ry: Math.PI / 2 });
      if (estante) { g.add(estante); occluders.push(estante); }
      else rackBox(g, 1.1, RACK_H, 3.1, MAT.prat, -paraDentro * 0.58, 0, 0);
      // carga paletizada: altura alternada dá silhueta e evita parede lisa de 3 m
      const hCarga = [2.5, 1.9, 2.9][(fi + zi) % 3];
      rackBox(g, 1.12, hCarga, 2.9, PALLET[(fi + zi) % PALLET.length], paraDentro * 0.58, 0, 0);
      rackBox(g, 1.16, 0.16, 3.0, MAT.metal, paraDentro * 0.58, hCarga, 0, false);
      g.userData.atacadaoRack = { fila: fi, indice: zi };
      g.userData.collider = { minX: fx - RACK_HX, maxX: fx + RACK_HX, minY: 0, maxY: RACK_H, minZ: rz - RACK_HZ, maxZ: rz + RACK_HZ };
      colliders.push(g.userData.collider);
      racks.push(g);
    });
    // placa de corredor pendurada na cabeceira de cada fileira
    signMesh(2.6, 0.8, signTex('#1f5fbf', '#ffffff', ['MERCEARIA', 'BEBIDAS', 'LIMPEZA', 'HORTIFRÚTI', 'BAZAR', 'DESCARTÁVEL'][fi], '', 512, 150), fx, 4.2, -0.6, 0);
  });

  /* Espinha central: torre de promoção no eixo x=0. Sem ela o "corredor central" que a
     rota CTF2 usa vira um tubo de 39 m com visada limpa da porta até a doca. A torre é
     estreita (0,9 m de meia-largura) de propósito: os nós do grafo em x=±1,6 continuam
     andáveis, então sobram duas pistas de 2,7 m em vez de um átrio. */
  for (const tz of [3.2, 9.6, 16.0, 22.4, 28.8]) {
    addBox(1.8, 2.4, 2.2, PALLET[(tz | 0) % PALLET.length], 0, 0, tz);
    addBox(1.9, 0.14, 2.3, MAT.metal, 0, 2.4, tz, { collide: false, cast: false });
  }

  /* ── ILHAS DE CAIXA: cover de PEITO (1,15 m) nos cruzamentos ────────────────
     Meia-altura de verdade: cobre o corpo e não a cabeça, então dá para trocar tiro
     por cima. Ficam na boca de cada vão alternado e nas duas pontas do galpão. */
  const ilhas = [];
  const ilha = (x, z) => {
    const o = placeProp('ilha_caixas', { x, z, y: 0, targetH: 1.15, ry: (x * 3 + z) % 2 ? 0 : Math.PI / 2 });
    const alvo = o || addBox(0.9, 1.15, 0.9, PALLET[(Math.abs(x) | 0) % PALLET.length], x, 0, z, { collide: false });
    if (o) { root.add(o); occluders.push(o); }
    const c = { minX: x - 0.45, maxX: x + 0.45, minY: 0, maxY: 1.15, minZ: z - 0.45, maxZ: z + 0.45 };
    colliders.push(c); alvo.userData.collider = c; alvo.userData.atacadaoCover = true;
    ilhas.push(alvo); return alvo;
  };
  /* ONDE a ilha pode ficar não é gosto: o grafo é uma grade de 3,2 m e o `blocked()`
     usa folga de 0,5 m, então prop a menos de 0,95 m de uma linha de nó APAGA o nó. No
     corredor de 4,1 m só existe UMA linha de nó (o eixo), e apagá-la corta o corredor em
     dois. Por isso toda ilha entra encostada na face do rack, a 1,5 m do eixo: sobra
     3,1 m de passagem livre e o nó continua de pé. Foi o que partiu o flanco oeste em
     componente ilhado na primeira medição (eval:mapcontrato, MC3: 22 nós). */
  FILA_X.forEach((fx, fi) => {
    const vz = fi % 2 === 0 ? VAO_PAR : VAO_IMPAR;
    const eixo = fx + (fx < 0 ? 3.2 : -3.2);          // eixo do corredor vizinho ao vão
    ilha(eixo + (fx < 0 ? -1.5 : 1.5), vz);           // encostada na face do rack, na boca do vão
  });
  for (const [ix, iz] of [[-6.4, ZF + 8.0], [6.4, ZF + 8.0], [-8.0, 28.8], [8.0, 28.8], [-22.6, 11.2], [-22.6, 20.8]]) ilha(ix, iz);

  /* ── PAREDE FRIA: corrida de freezer na lateral leste ──────────────────────── */
  const freezers = [];
  [3.2, 7.2, 11.2, 15.2, 19.2, 23.2].forEach((fz, i) => {
    const o = placeProp('freezer', { x: 24.2, z: fz, y: 0, targetH: 2.2, ry: -Math.PI / 2 });
    const alvo = o || addBox(1.8, 2.2, 3.4, MAT.metal, 24.2, 0, fz, { collide: false });
    if (o) { root.add(o); occluders.push(o); }
    const c = { minX: 23.3, maxX: 25.1, minY: 0, maxY: 2.2, minZ: fz - 1.7, maxZ: fz + 1.7 };
    colliders.push(c); alvo.userData.collider = c; alvo.userData.atacadaoFreezer = i;
    freezers.push(alvo);
  });
  for (const cz of [5.2, 13.2, 21.2]) {                       // luz FRIA da parede de geladeira
    const luz = new THREE.PointLight(0x9fd8ff, 1.25, 15, 1.5);
    luz.position.set(22.6, 4.4, cz); luz.userData.mapLight = 'atacadao-frio'; scene.add(luz);
    addBox(0.5, 0.1, 3.2, lam({ color: 0xdff0ff, emissive: 0x8fd0ff, emissiveIntensity: 0.9 }), 23.4, 4.5, cz, { collide: false, cast: false });
  }
  prop('cooler', 21.2, 27.2, 1.3, 0, 0.8, 0.6, 1.2);

  /* ── LUZ DE GALPÃO ─────────────────────────────────────────────────────────
     Idioma do galpão do campomorro: teto opaco tem luminária local, não fé no sol.
     15 luminárias penduradas por haste; 9 delas carregam PointLight (o resto é
     desenho — 24 luzes dinâmicas num mapa custam mais do que iluminam). */
  const LUMI = lam({ color: 0xfff4e0, emissive: 0xffe8bc, emissiveIntensity: 0.95 });
  for (const lx of [-14.4, -8.0, 0, 8.0, 14.4]) for (const lz of [4.8, 14.4, 24.0]) {
    addBox(0.12, 3.2, 0.12, MAT.metal, lx, 7.8, lz, { collide: false, cast: false });    // haste
    const lum = addBox(1.5, 0.22, 0.6, LUMI, lx, 7.6, lz, { collide: false, cast: false });
    lum.userData.atacadaoLuminaire = true;
    if (lx === 0 || Math.abs(lx) === 14.4) {
      const luz = new THREE.PointLight(0xffeccc, 1.35, 24, 1.4);
      luz.position.set(lx, 7.3, lz); luz.userData.mapLight = 'atacadao-galpao'; scene.add(luz);
    }
  }

  /* ── FRENTE DE CAIXA (z de -6 a 0) ─────────────────────────────────────────
     Balcão de 1 m não quebra visada (o olho está a 1,62). Os PAINÉIS DE OFERTA de
     2,8 m entre os caixas é que fecham a faixa da frente no eixo X — sem eles a
     entrada inteira é uma linha limpa de 50 m de parede a parede. */
  const ZCAIXA = ZF + 5.6, ZPAINEL = ZF + 2.4;   // múltiplos de 3,2: caem NO MEIO de duas linhas de nó
  for (const cx of [-19.2, -12.8, -6.4, 6.4, 12.8, 19.2]) {
    addBox(1.4, 1.0, 1.8, MAT.caixa, cx, 0, ZCAIXA);
    addBox(1.2, 0.06, 1.6, MAT.esteira, cx, 1.0, ZCAIXA, { collide: false });
    signMesh(0.7, 1.0, signTex('#111417', '#ff4d4d', 'CAIXA', String(90 + Math.abs(cx | 0)), 260, 360), cx + 0.9, 2.2, ZCAIXA, 0);
  }
  const PROMO = ['LEVE 3 PAGUE 5', 'ARROZ R$ 49,90', 'SÓ HOJE: MAIS CARO', 'FEIJÃO A OURO', 'FARDO DE TRETA', 'PIX NÃO PARCELA'];
  [-22.4, -16.0, -6.4, 6.4, 16.0, 22.4].forEach((px, i) => {
    addBox(3.0, 2.8, 0.5, MAT.parede, px, 0, ZPAINEL);
    signMesh(2.6, 1.1, signTex('#e0b83a', '#c0392b', PROMO[i], '', 512, 220), px, 2.0, ZPAINEL - 0.3, 0);
  });
  for (const [cx, cz] of [[-9.6, ZF + 3.2], [3.2, ZF + 4.0], [9.6, ZF + 1.6]]) prop('shopping_cart', cx, cz, 1.0, (cx * 7) % 3, 0.4, 0.4, 0.9);
  /* TERCEIRA FILA DA PRAÇA: pilha de fardo de 2,4 m entre a porta e a boca dos corredores.
     Sem ela a praça de caixas (12 × 51 m) devolvia sozinha quase todo o ganho do labirinto —
     a LOS média voltava a 10,46 m contra um teto de 10,50, margem que não é margem. Fica nos
     x que NÃO são boca de porta (as portas são x∈[-15,-9], [-3,3], [9,15]) para não mexer nas
     duas rotas separadas que o CTF2 exige. Todos os z em múltiplo de 3,2: caem no meio de
     duas linhas de nó e não apagam nenhuma. */
  for (const [fx, fz, fw] of [[-21.6, ZF + 8.8, 2.8], [-6.4, ZF + 8.8, 2.8], [6.4, ZF + 8.8, 2.8], [21.6, ZF + 8.8, 2.8],
                              [-19.2, ZF + 2.4, 2.0], [-6.4, ZF + 2.4, 2.0], [6.4, ZF + 2.4, 2.0], [19.2, ZF + 2.4, 2.0]]) {
    const h = fw > 2.4 ? 2.4 : 2.0;
    addBox(fw, h, 1.2, PALLET[(Math.abs(fx) | 0) % PALLET.length], fx, 0, fz);
    addBox(fw + 0.1, 0.14, 1.3, MAT.metal, fx, h, fz, { collide: false, cast: false });
  }

  /* ── DOCA (z de 28,8 a 32,6): fundo do galpão, spawn B ─────────────────────── */
  for (const [dx, dh] of [[-19.2, 2.6], [-9.6, 2.2], [3.2, 2.8], [12.8, 2.2], [22.4, 2.6]]) {
    addBox(2.6, dh, 1.2, PALLET[(Math.abs(dx) | 0) % PALLET.length], dx, 0, 32.0);
    addBox(2.7, 0.16, 1.3, MAT.metal, dx, dh, 32.0, { collide: false, cast: false });
  }
  prop('vw_9150', -25.0, 24.0, 3.0, 0, 0, 0, 0);   // carreta encostada na doca oeste, fora da faixa andável
  prop('dumpster', 19.2, 32.0, 1.7, 0, 1.0, 0.7, 1.6);
  prop('pilha_pneus', -21.6, 2.4, 1.5, 0, 1.0, 1.0, 1.4);

  /* ── FLANCO OESTE: travessas que impedem a pista lateral de virar corredor de
     39 m com visada limpa (o flanco leste já é fechado pela parede de freezer). */
  for (const tz of [6.4, 16.0, 25.6]) addBox(2.7, 2.6, 1.2, MAT.prat, -23.75, 0, tz);
  for (const tz of [9.6, 22.4]) addBox(1.9, 2.2, 1.2, PALLET[(tz | 0) % PALLET.length], -22.4, 0, tz);

  for (const sx of [-1, 1]) addBox(0.6, PARK_H, ZF - ZS, MAT.muro, sx * wX, 0, (ZS + ZF) / 2);   // muros laterais baixos
  // muro do fundo com VÃOS de ENTRADA (x∈[-14,-8]) e SAÍDA (x∈[8,14]): a saída de carro pra rua
  { const gaps = [[-14, -8], [8, 14]]; let xc = -wX; for (const [g0, g1] of gaps) { if (g0 > xc) addBox(g0 - xc, PARK_H, 0.6, MAT.muro, (xc + g0) / 2, 0, ZS); xc = g1; } if (wX > xc) addBox(wX - xc, PARK_H, 0.6, MAT.muro, (xc + wX) / 2, 0, ZS); }
  // RUA além do muro (backdrop): só asfalto + faixa central (os carros vêm do laço de trânsito abaixo)
  { const rua = new THREE.Mesh(new THREE.PlaneGeometry(HALF_X * 2 + 30, 18), MAT.asfalto); rua.rotation.x = -Math.PI / 2; rua.position.set(0, 0.02, ZS - 9); root.add(rua);
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
  // Time B (doca): a faixa livre entre a ponta das fileiras (z=28,8) e a parede norte.
  // Antes ficavam em z=ZN-4=29 espalhados de 3 em 3 — dentro do rack no layout novo.
  ARSENAL.forEach((k, i) => place(k, -18 + i * 6, 29.6, Math.PI));
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
  /* A grade nasce ANCORADA no lattice do armazém (múltiplos de 1,6 m a partir de
     x=1,6), não na borda do mapa. Ancorada na borda, os nós caíam a 0,45 m da face
     do rack e o `blocked(...,0.5)` derrubava o corredor inteiro: o labirinto existia
     na imagem e não existia para o bot. Ver tools/eval/atacadao-check.mjs (ATA1). */
  const ancora = (v) => Math.ceil((v - 1.6) / STEP) * STEP + 1.6;
  for (let gx = ancora(B.minX); gx <= B.maxX; gx += STEP) for (let gz = ancora(B.minZ); gz <= B.maxZ; gz += STEP) if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
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
    B: [-14.4, -4.8, 6.4, 16.0].map(x => ({ x, z: 30.2, yaw: Math.PI })), // doca do galpão, olhando pros corredores
  };

  /* BUG-57 + frente ATACADÃO: rato e barata na doca, e a POMBA NO VIGAMENTO — bicho de
     galpão de atacado mora no tirante, não no chão da gôndola. Os tirantes de 5 m
     (`vigas`, acima) existem em z = 1,6 / 14,4 / 27,2; a pomba pousa no topo (y = 5,13).
     Modo continua 'ground' de propósito: `flight` está depreciado desde o BUG-57 (AR5 da
     eval:ambience-registry) porque o GLB de voo é estático de asas abertas. */
  const ambience = createFavelaAmbience(root, {
    map: 'atacadao_treta',
    rats: [
      { pos: [-16, 0, -27], to: [-13.5, 0, -24.5], phase: .3 },
      { pos: [-20.8, 0, 30.4], to: [-18.4, 0, 28.8], phase: 1.5 },   // doca, faixa livre atrás das fileiras
    ],
    /* vida 1: barata da doca do atacadão (fauna 2) */
    cockroaches: [
      { pos: [-15, 0, -26], to: [-12.8, 0, -23.8], phase: .8 },
      { pos: [22.6, 0, 25.6], to: [20.4, 0, 27.2], phase: 2.2 },     // pé da parede fria
    ],
    pigeons: [
      { mode: 'ground', pos: [-8.0, 5.13, 14.4], to: [-4.8, 5.13, 14.4], phase: .4 },   // vigamento central
      { mode: 'ground', pos: [8.0, 5.13, 27.2], to: [11.2, 5.13, 27.2], phase: 1.3 },   // vigamento da doca
      { mode: 'ground', pos: [1.2, 0, -9], phase: .8 },                                  // estacionamento
    ],
  });

  return {
    /* AMBIÊNCIA SONORA. `hum` (hum-indoor) é a ventilação de galpão: um loop no miolo
       das fileiras e outro COLADO na parede fria, que é onde o compressor do freezer
       ronca — dois pontos posicionais dão ao jogador a noção de que ele está andando de
       um clima para o outro. `cidade` fica no estacionamento, não no centro do mapa.
       PENDÊNCIA DECLARADA: o anúncio de alto-falante distorcido SEM palavra reconhecível
       (pedido da frente) não entrou. O pacote de áudio não vem no git por licenciamento
       (scripts/fetch-audio.sh, release audio-pack-v6) e não existe nele nenhuma faixa de
       PA; declarar um `src` que o manifesto não serve daria 404 silencioso, que é o
       BUG-19 de novo. Registrado no KNOWN-BUGS.md em vez de fingido aqui. */
    ambience, sound: { loops: [
      { src: AMB_LOOPS.hum, pos: [0, 3.4, 14.4], radius: 46, vol: .22 },       // ventilação do galpão
      { src: AMB_LOOPS.hum, pos: [23.4, 2.6, 13.2], radius: 20, vol: .26 },    // compressor da parede fria
      { src: AMB_LOOPS.cidade, pos: [0, 3, ZS + 10], radius: 52, vol: .18 },   // rua/estacionamento
    ], bioma: 'urbano' },
    root, colliders, occluders, decalSolids: [root], groundHeightAt, slowAt, spawns, sun, hemi, pickups,
    ctfPoints: [
      { id: 'E', label: 'ESTACIONAMENTO', x: -8, z: ZS + 12 },
      { id: 'MID', label: 'PORTA', x: 10, z: ZF - 2 },
      { id: 'B', label: 'DOCA', x: 0, z: 25.6 },   // espinha central entre duas torres de promoção (x=0 é corredor, não fileira)
    ],
    lojaZ: { z0: LOJA_Z0, z1: LOJA_Z1 },
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: ZS + 1, maxZ: ZN - 1 },
  };
}
