// Havan (loja_h) — CTF, v2: estacionamento MAIOR (76×116, 40+ vagas, 34 modelos de carro)
// e texturas ricas (asfalto c/ óleo+rachadura, azul Havan c/ sujeira). G2-R3: fachada
// GRECO-ROMANA (frontão c/ logo, colunata, cornija, banners) como skin sobre a estrutura.
// Time B spawnam
// DENTRO da loja (gôndolas, caixas, mezanino-sniper, porta com sensor); o outro time spawna
// no ESTACIONAMENTO (carros GLB texturizados + Estátua da Liberdade). 3 bandeiras:
// estacionamento, estátua, gôndolas. Contrato buildWorld + A*. Props de /Users/ruben/glb.
import * as THREE from 'three';
import { placeProp, PropBatch, StaticBatch, PROP_BATCH } from './mapprops.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';   // névoa exponencial + cor por direção do olhar
import { detailFor, registerDetail } from './textures.js';   // normal+rough por Sobel (ver lam)
import { decalIds, paredeAtras } from './map_decals.js';     // pool por NOME + raycast de parede
import { grafitar, esconderSeFaltar } from './graffiti_pass.js';               // cobertura medida, não coordenada à mão

const HALF_X = 38, HALF_Z = 58;
// Carros do estacionamento (ids otimizados em public/models/props). Forte cara BR.
export const HAVAN_PROPS = [
  'statue_liberty', 'shopping_cart',
  '1968_volkswagen_beetle', '1969_dodge_charger_rt', '1976_volkswagen_golf_gti_mk1',
  '1986_ford_escort_xr3', '1989_ford_fiesta_xr2i_mk3', '1999_volkswagen_gol_2000_gti_g2',
  '2006_chevrolet_cobalt_lt', '2006_hyundai_sonata', 'car_a', 'dirty_lada_lowpoly_from_scan',
  'jeep_cherokee', 'peugeot_3008', 'reliant_k_car', 'small_price_car', 'fiat_toro',
  '2021_nissan_kicks', 'fiat_uno', 'peugeot_405',
  // v2: +16 modelos (sedãs, hatches, esportivos, picapes)
  '1965_ford_mustang_coupe_289', '1981_dmc_delorean', '1999_mercedes_benz_s600',
  '2002_volkswagen_golf_r32_mk4', '2014_mini_cooper_s_f56', '2015_nissan_versa_sedan_1.6',
  '2017_kia_picanto_gt-line', '2019_ford_fiesta_st', '2020_bmw_m8_coupe',
  '2020_nissan_sentra_sylphy', '2021_volkswagen_polo_plus', '2022_chevrolet_tracker_rs_335t',
  '2023_nissan_altima__teana', '2023_toyota_rav4_hybrid', 'old_vw_bug', 'uno_mille',
  // v3: carros BR Mint estilizados (kombi/opala/chevette/brasília/saveiro/fusca/CG/ônibus)
  'kombi', 'opala', 'chevette', 'brasilia_vw', 'saveiro', 'fusca', 'moto_cg', 'onibus_urbano',
  // v3: mobília da loja Mint (gôndolas cheias, caixas, eletro, roupas)
  'gondola_mercado', 'gondola_eletro', 'arara_roupas', 'caixa_cobranca', 'painel_tvs', 'manequim',
];
// `car_a` fora da frota: bbox mais ALTA que comprida, então nenhuma escala o deixa certo
// (ver a régua). Reentra corrigindo o .glb, tirando-o daqui e dando-lhe linha no CAR_DIM.
const CARS = HAVAN_PROPS.filter(id => !['statue_liberty', 'shopping_cart', 'onibus_urbano', 'car_a',
  'gondola_mercado', 'gondola_eletro', 'arara_roupas', 'caixa_cobranca', 'painel_tvs', 'manequim'].includes(id));
// modelos Mint BR com o comprimento no eixo X — giram 90° pra alinhar na vaga
const RY_FIX = { brasilia_vw: Math.PI / 2, saveiro: Math.PI / 2, moto_cg: Math.PI / 2 };

/* Ficha de fábrica [comprimento, altura] em metros — é a REFERÊNCIA da escala dos veículos,
   conferida por tools/eval/escala-veiculo-check.mjs. Fora da tabela cai no padrão de sedã. */
const CAR_DIM = {
  moto_cg: [2.02, 1.08],
  fusca: [4.03, 1.50], '1968_volkswagen_beetle': [4.03, 1.50], old_vw_bug: [4.03, 1.50],
  brasilia_vw: [4.03, 1.40], kombi: [4.51, 1.94], opala: [4.60, 1.39],
  chevette: [4.14, 1.36], saveiro: [4.24, 1.47],
  fiat_uno: [3.72, 1.44], uno_mille: [3.66, 1.44], fiat_toro: [4.92, 1.78],
  '1969_dodge_charger_rt': [5.28, 1.35], '1976_volkswagen_golf_gti_mk1': [3.82, 1.39],
  '1986_ford_escort_xr3': [4.06, 1.36], '1989_ford_fiesta_xr2i_mk3': [3.74, 1.32],
  '1999_volkswagen_gol_2000_gti_g2': [3.81, 1.41], '2006_chevrolet_cobalt_lt': [4.48, 1.48],
  '2006_hyundai_sonata': [4.80, 1.47], dirty_lada_lowpoly_from_scan: [4.04, 1.44],
  jeep_cherokee: [4.44, 1.78], peugeot_3008: [4.45, 1.62], peugeot_405: [4.41, 1.41],
  reliant_k_car: [4.50, 1.35], small_price_car: [3.70, 1.45],
  '2021_nissan_kicks': [4.30, 1.59], '1965_ford_mustang_coupe_289': [4.61, 1.30],
  '1981_dmc_delorean': [4.27, 1.14], '1999_mercedes_benz_s600': [5.16, 1.44],
  '2002_volkswagen_golf_r32_mk4': [4.15, 1.44], '2014_mini_cooper_s_f56': [3.85, 1.41],
  '2015_nissan_versa_sedan_1.6': [4.50, 1.50], '2017_kia_picanto_gt-line': [3.60, 1.49],
  '2019_ford_fiesta_st': [4.07, 1.47], '2020_bmw_m8_coupe': [4.87, 1.35],
  '2020_nissan_sentra_sylphy': [4.64, 1.45], '2021_volkswagen_polo_plus': [4.06, 1.45],
  '2022_chevrolet_tracker_rs_335t': [4.27, 1.66], '2023_nissan_altima__teana': [4.90, 1.44],
  '2023_toyota_rav4_hybrid': [4.60, 1.69],
};
const CAR_DIM_PADRAO = [4.20, 1.50];
const carDim = (id) => CAR_DIM[id] || CAR_DIM_PADRAO;

// Seleção de carros POR PARTIDA (peso: 12 modelos leves ≈ 8MB em vez de 81MB).
// A seed é setada no startGame (main.js) ANTES do preload — menu e jogo veem a mesma seleção.
// HEAVY = >1.5MB mesmo após otimização — ficam fora da rotação (e são os sedãs internacionais;
// os leves são justamente os de cara mais BR: fusca, uno, gol, cobalt, towner...).
const HEAVY = new Set(['1965_ford_mustang_coupe_289', '1981_dmc_delorean', '2015_nissan_versa_sedan_1.6',
  '2017_kia_picanto_gt-line', '2019_ford_fiesta_st', '2021_volkswagen_polo_plus', '2022_chevrolet_tracker_rs_335t',
  '2023_nissan_altima__teana', '2023_toyota_rav4_hybrid', 'old_vw_bug', 'uno_mille', '2020_bmw_m8_coupe']);
const LIGHT_CARS = CARS.filter(id => !HEAVY.has(id));
// carros BR Mint SEMPRE entram na partida (a "cara brasileira"); o resto sorteia dos leves
const MINT_BR = ['kombi', 'opala', 'chevette', 'brasilia_vw', 'saveiro', 'fusca', 'moto_cg'];
/* ===== CUSTO DE GPU POR MODELO (rodada 3) =====
   O filtro HEAVY acima e de BYTES (tempo de download). O que estourou a regua foi outra
   coisa: TRIANGULO e NUMERO DE MATERIAIS. Medido nos .glb (tools/eval/glbinfo):
   um `2006_hyundai_sonata` tem 13,7 k tris em 12 materiais; um `jeep_cherokee` tem
   1,4 k tris em 1 material — e no patio, a 20 m, os dois lem como "um carro na vaga".
   Com 59 vagas ocupadas, trocar a rotacao pelos modelos baratos derrubou os carros de
   ~510 k para ~200 k triangulos SEM tirar um carro do estacionamento e mantendo os
   mesmos 12 modelos distintos por partida.
   [triangulos, materiais] — materiais viram draw calls depois do instancing. */
const CAR_COST = {
  jeep_cherokee: [1376, 1], dirty_lada_lowpoly_from_scan: [1716, 1], reliant_k_car: [2034, 1],
  kombi: [2797, 1], fusca: [2854, 1], chevette: [2872, 1], opala: [2891, 1], brasilia_vw: [2894, 1],
  saveiro: [2904, 1], moto_cg: [3369, 1],
  '2006_chevrolet_cobalt_lt': [7009, 15], small_price_car: [7353, 17],
  '1969_dodge_charger_rt': [9672, 29], '1999_volkswagen_gol_2000_gti_g2': [10627, 13],
  '1968_volkswagen_beetle': [10732, 13], '1976_volkswagen_golf_gti_mk1': [11256, 24],
  '2002_volkswagen_golf_r32_mk4': [11342, 12], '1989_ford_fiesta_xr2i_mk3': [12957, 19],
  '2006_hyundai_sonata': [13686, 12], fiat_toro: [14661, 18], '1986_ford_escort_xr3': [15121, 15],
  peugeot_3008: [16461, 25], '2021_nissan_kicks': [16943, 12], peugeot_405: [20177, 17],
  fiat_uno: [22553, 26], car_a: [27142, 2],
};
// 1 material ≈ 1 draw call no passe principal + 1 na sombra; 8 k tris ≈ o mesmo peso.
const carCost = (id) => { const c = CAR_COST[id]; return c ? c[1] * 8 + c[0] / 1000 : 200; };
const carTris = (id) => (CAR_COST[id] ? CAR_COST[id][0] : 20000);
const EXTRA_TRI_BUDGET = 26000;   // teto de triangulos para os 5 modelos sorteados
let _carSeed = 1;
export function setHavanCarSeed(s) { _carSeed = (s | 0) || 1; }
export function havanCarSelection(n = 12) {
  // candidatos ordenados por CUSTO (nao mais sorteio uniforme na lista inteira): o sorteio
  // antigo podia trazer 5 sedas de 20 k tris e 25 materiais cada e dobrar o custo do mapa.
  const arr = LIGHT_CARS.filter(id => !MINT_BR.includes(id)).sort((a, b) => carCost(a) - carCost(b));
  const pool = arr.slice(0, 8);             // janela dos 8 mais baratos: ainda ha variedade
  let s = _carSeed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [...MINT_BR];
  let tri = 0;
  const want = Math.max(n, MINT_BR.length);
  while (out.length < want && pool.length) {
    const i = (rnd() * pool.length) | 0, id = pool[i];
    pool.splice(i, 1);
    if (tri + carTris(id) > EXTRA_TRI_BUDGET) continue;   // estourou o teto: pula esse modelo
    tri += carTris(id); out.push(id);
  }
  // se o teto barrou demais, completa com os mais baratos que sobraram (sem estourar de novo)
  for (const id of arr) { if (out.length >= want) break; if (!out.includes(id) && tri + carTris(id) <= EXTRA_TRI_BUDGET * 1.35) { tri += carTris(id); out.push(id); } }
  return out;
}
// props p/ preload da partida atual (maps.js consome via getter)
const STORE_PROPS = ['gondola_mercado', 'gondola_eletro', 'arara_roupas', 'caixa_cobranca', 'painel_tvs', 'manequim', 'onibus_urbano'];
export function havanPropsForMatch() { return ['statue_liberty', 'shopping_cart', ...STORE_PROPS, ...havanCarSelection()]; }

function tileTex(base, line, n, rx, rz) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 128, 128); x.strokeStyle = line; x.lineWidth = 3;
  const s = 128 / n; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, 128); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(128, i * s); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
}
// textura rica: manchas + rachaduras + pontos (asfalto/concreto pintado, sem cara de low-poly)
function noiseTex(base, blotches, rx, rz, opts = {}) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  let seed = opts.seed || 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const [color, n, rMin, rMax, alpha] of blotches) {
    x.fillStyle = color;
    for (let i = 0; i < n; i++) {
      x.globalAlpha = alpha * (0.5 + rnd() * 0.5);
      const r = rMin + rnd() * (rMax - rMin);
      x.beginPath(); x.ellipse(rnd() * S, rnd() * S, r, r * (0.4 + rnd() * 0.8), rnd() * Math.PI, 0, Math.PI * 2); x.fill();
    }
  }
  if (opts.cracks) {
    x.strokeStyle = opts.cracks; x.globalAlpha = 0.35; x.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      let px = rnd() * S, py = rnd() * S; x.beginPath(); x.moveTo(px, py);
      for (let j = 0; j < 5; j++) { px += (rnd() - 0.5) * 46; py += (rnd() - 0.5) * 46; x.lineTo(px, py); }
      x.stroke();
    }
  }
  if (opts.pebbles) {
    for (let i = 0; i < 240; i++) { x.globalAlpha = 0.25 + rnd() * 0.3; x.fillStyle = rnd() > 0.5 ? opts.pebbles : base; x.fillRect(rnd() * S, rnd() * S, 1.6, 1.6); }
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz);
  // registra normal+roughness derivados DESTE canvas (textures.js `registerDetail`): sem
  // isto o `detailFor` do `lam()` nao acha nada, porque as texturas deste mapa sao canvas
  // locais e nunca passaram pelo textures.js. strength/lo/hi seguem a familia do map.js.
  return registerDetail(t, c, 2.2, 0.58, 0.98);
}
// painel ACM azul da fachada Havan: chapas com emendas verticais + variação + sujeira embaixo
function acmTex(rx, rz) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#2f3a8c'; x.fillRect(0, 0, S, S);
  let seed = 41; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 60; i++) { x.fillStyle = rnd() > 0.5 ? 'rgba(42,51,110,0.5)' : 'rgba(58,70,160,0.35)'; x.fillRect(rnd() * S, rnd() * S, 8 + rnd() * 20, 8 + rnd() * 20); }
  x.strokeStyle = 'rgba(20,26,60,0.8)'; x.lineWidth = 2;
  for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, S); x.stroke(); }
  x.strokeStyle = 'rgba(20,26,60,0.5)'; x.beginPath(); x.moveTo(0, S / 2); x.lineTo(S, S / 2); x.stroke();
  const gr = x.createLinearGradient(0, S * 0.8, 0, S); gr.addColorStop(0, 'rgba(10,14,30,0)'); gr.addColorStop(1, 'rgba(10,14,30,0.45)');
  x.fillStyle = gr; x.fillRect(0, S * 0.8, S, S * 0.2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz);
  return registerDetail(t, c, 1.8, 0.35, 0.80);   // ACM e chapa pintada: relevo baixo, lustro alto
}

// ===== v4 (crítica de fidelidade): kill-switch + gate de qualidade =====
// ?deco=0 desliga TODA a camada decorativa nova (letreiro, Casa Branca, postes de luz
// completos, marcação de vagas, quebra-molas). Nada aqui cria collider novo nem mexe em
// A*/LOS, então desligar só empobrece o visual — o jogo continua idêntico.
const QP = new URLSearchParams(location.search);
let _q = 'med';
try { _q = JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality || 'med'; } catch (e) { /* storage bloqueado */ }
const DECO = QP.get('deco') !== '0';
const DECO_HI = DECO && _q !== 'low';   // extras caros (Casa Branca, dentículos, carrinhos extras)

// ASFALTO (crítico: "textura manchada estranha"): o noiseTex antigo desenhava elipses
// chapadas de contorno duro = bolhas cinza de 1m repetindo pelo pátio. Aqui a variação
// tonal é feita com gradiente RADIAL (sem borda), e o que dá a leitura de asfalto é o
// AGREGADO fino (brita) em alta densidade + remendos de recape + trincas capilares.
function asfaltoTex(rx, rz) {
  const S = _q === 'low' ? 256 : 512, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  let seed = 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#4c5057'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 26; i++) {                     // manchas LARGAS e suaves (sem contorno)
    const px = rnd() * S, py = rnd() * S, r = S * (0.08 + rnd() * 0.17);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rnd() > 0.5 ? 'rgba(38,41,46,0.26)' : 'rgba(108,114,122,0.18)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 14; i++) {                     // remendos de recape (retângulo mais escuro)
    x.globalAlpha = 0.10 + rnd() * 0.10; x.fillStyle = rnd() > 0.5 ? '#33373d' : '#5d636b';
    x.fillRect(rnd() * S, rnd() * S, S * (0.06 + rnd() * 0.22), S * (0.05 + rnd() * 0.18));
  }
  x.globalAlpha = 1;
  const grains = S === 256 ? 3000 : 11000;           // brita: é ela que faz "asfalto" de perto
  for (let i = 0; i < grains; i++) {
    const v = rnd();
    x.fillStyle = v > 0.66 ? 'rgba(128,134,142,0.5)' : v > 0.33 ? 'rgba(30,32,36,0.45)' : 'rgba(86,92,100,0.35)';
    x.fillRect(rnd() * S, rnd() * S, 1, rnd() > 0.85 ? 2 : 1);
  }
  x.strokeStyle = 'rgba(28,30,34,0.5)'; x.lineWidth = 1;   // trincas capilares
  for (let i = 0; i < 10; i++) {
    let px = rnd() * S, py = rnd() * S; x.beginPath(); x.moveTo(px, py);
    for (let j = 0; j < 6; j++) { px += (rnd() - 0.5) * S * 0.18; py += (rnd() - 0.5) * S * 0.18; x.lineTo(px, py); }
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz);
  return registerDetail(t, c, 2.6, 0.66, 0.99);   // asfalto: brita da mais relevo e menos lustro
}
// REBOCO da fachada: o "branco" liso lia como cinza chapado. Mottle sutil + escorrimento
// vertical de chuva (é o que dá idade a fachada pintada no Brasil).
function reboco(rx, rz) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  let seed = 23; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#f7f4ec'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    x.globalAlpha = 0.05 + rnd() * 0.08; x.fillStyle = rnd() > 0.5 ? '#dcd8cc' : '#ffffff';
    const r = 6 + rnd() * 30; x.beginPath(); x.ellipse(rnd() * S, rnd() * S, r, r * 0.7, 0, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 16; i++) {                    // escorrimento de chuva descendo
    x.globalAlpha = 0.05 + rnd() * 0.07; x.fillStyle = '#b9b8ac';
    const px = rnd() * S; x.fillRect(px, rnd() * S * 0.4, 1 + rnd() * 3, S * (0.3 + rnd() * 0.6));
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz);
  return registerDetail(t, c, 2.0, 0.70, 0.99);   // reboco: mottle vira micro-relevo
}
// CANELURAS da coluna: 20 estrias verticais. O CylinderGeometry mapeia u 0..1 na volta,
// então uma faixa por estria já dá a leitura clássica sem custo de geometria.
function caneluraTex() {
  const W = 256, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  x.fillStyle = '#f7f4ec'; x.fillRect(0, 0, W, H);
  const n = 20, s = W / n;
  for (let i = 0; i < n; i++) {
    const g = x.createLinearGradient(i * s, 0, (i + 1) * s, 0);
    g.addColorStop(0, 'rgba(150,146,134,0.55)'); g.addColorStop(0.35, 'rgba(255,255,255,0.15)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(150,146,134,0.55)');
    x.fillStyle = g; x.fillRect(i * s, 0, s, H);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/* ===== MURO DO ESTACIONAMENTO — reescrito (B1 / B5 / B6) =====
   MEDIÇÃO DA R1: 77,8% dos blocos 16×16 do frame com desvio-padrão de L* < 2. O muro
   ganhou blocos e faixa azul na rodada 1, mas continuava chapado. Três causas, todas de
   calibração e não de conteúdo:
     (a) ESCALA. `repeat.set(19, 1)` sobre uma parede de 78 × 3 m dava um tile de
         4,1 × 3,0 m; o "bloco" desenhado tinha ~1,0 m de largura, quando o bloco de
         concreto real tem 39 × 19 cm. Sem a frequência certa, junta nenhuma aparece.
     (b) AMPLITUDE. A variação por bloco estava em alpha 0,05–0,14 sobre um fundo quase
         branco — depois do ACES vira ruído abaixo do quantum de 8 bits.
     (c) AUSÊNCIA DE MICRO-DETALHE. Sem agregado, sem relevo, sem dano: nada acontece
         entre 1 cm e 40 cm, que é exatamente a banda que o B5 mede.
   AGORA: tile de 2,0 × 1,0 m em 512×256 = **256 px/m** nos dois eixos (alvo de playspace
   do BAR §1.8), 5 × 5 blocos de 40 × 20 cm com junta rebaixada e lábio claro (o mesmo
   canvas serve de bumpMap), tom por bloco com amplitude de verdade, agregado fino,
   eflorescência, escorrimento a partir das juntas e lascas de batida de carrinho.
   A FAIXA AZUL saiu daqui: com repeat.y = 3 ela apareceria três vezes na altura do muro
   — virou geometria (ver o bloco do estacionamento). O encardido da base também saiu,
   pelo mesmo motivo, e virou AO de vértice na geometria do muro. */
function muroTex(seed0) {
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  let seed = seed0 || 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#b4b0a2'; x.fillRect(0, 0, W, H);                     // argamassa no fundo da junta
  const COLS = 5, ROWS = 5, bw = W / COLS, bh = H / ROWS, j = 3;
  for (let r = 0; r < ROWS; r++) {
    const off = (r % 2) * bw * 0.5;                                     // meia-junta alternada
    for (let i = -1; i <= COLS; i++) {
      const bx = i * bw + off, by = r * bh;
      // tom por bloco: bloco pintado nunca sai igual ao vizinho — é daqui que vem o
      // desvio-padrão de L* ≥ 6 que o B1 cobra
      const v = 0.84 + rnd() * 0.30, warm = rnd() * 14;
      x.fillStyle = `rgb(${Math.min(255, 226 * v) | 0},${Math.min(255, 221 * v - warm * 0.25) | 0},${Math.min(255, 205 * v - warm) | 0})`;
      x.fillRect(bx + j, by + j, bw - j * 2, bh - j * 2);
      // lábio claro em cima + sombra embaixo/direita = relevo de junta rebaixada.
      // Como o mesmo canvas entra como bumpMap, isso vira relevo de verdade no shader.
      x.fillStyle = 'rgba(255,255,252,0.34)'; x.fillRect(bx + j, by + j, bw - j * 2, 2);
      x.fillStyle = 'rgba(88,84,74,0.36)'; x.fillRect(bx + j, by + bh - j - 2.5, bw - j * 2, 2.5);
      x.fillStyle = 'rgba(88,84,74,0.24)'; x.fillRect(bx + bw - j - 2, by + j, 2, bh - j * 2);
      if (rnd() > 0.88) {                                               // lasca de batida (carrinho/caçamba)
        x.fillStyle = 'rgba(146,140,126,0.92)';
        const cw = 6 + rnd() * 14, ch = 4 + rnd() * 8;
        x.fillRect(bx + (rnd() > 0.5 ? bw - j - cw : j), by + bh - j - ch, cw, ch);
      }
    }
  }
  // AGREGADO fino do bloco de concreto: é o que existe na escala de centímetros (B5)
  for (let i = 0; i < 8000; i++) {
    const v = rnd();
    x.fillStyle = v > 0.62 ? 'rgba(255,253,246,0.30)' : v > 0.31 ? 'rgba(116,112,100,0.26)' : 'rgba(174,168,154,0.22)';
    x.fillRect(rnd() * W, rnd() * H, 1, rnd() > 0.87 ? 2 : 1);
  }
  // EFLORESCÊNCIA (salitre branco) e mancha de umidade: manchas grandes sem contorno
  for (let i = 0; i < 24; i++) {
    const px = rnd() * W, py = rnd() * H, r = 20 + rnd() * 62;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, rnd() > 0.45 ? 'rgba(255,254,250,0.28)' : 'rgba(118,120,100,0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 6.3); x.fill();
  }
  // ESCORRIMENTO DE CHUVA: sempre nasce numa junta horizontal e sempre desce
  for (let i = 0; i < 28; i++) {
    const px = rnd() * W, py = ((rnd() * ROWS) | 0) * bh;
    const g = x.createLinearGradient(0, py, 0, py + 26 + rnd() * 120);
    g.addColorStop(0, `rgba(102,100,86,${0.14 + rnd() * 0.2})`); g.addColorStop(1, 'rgba(102,100,86,0)');
    x.fillStyle = g; x.fillRect(px, py, 1 + rnd() * 4, 26 + rnd() * 120);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  // o muro ja usa este MESMO canvas como bumpMap (ver MAT.muro); o normal derivado troca o
  // bump por um mapa de normal de verdade, que responde a luz lateral em vez de so a frontal
  return registerDetail(t, c, 2.4, 0.72, 0.99);
}
// TINTA DE DEMARCAÇÃO gasta: faixa branca com falhas (o alpha come pedaços da linha).
// Usada como plano fino no asfalto em vez de caixinhas cinza chapadas.
function tintaTex(color) {
  const W = 32, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let seed = 97; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = color; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 130; i++) {                   // desgaste: pneu comeu a tinta
    x.globalAlpha = 0.25 + rnd() * 0.6;
    x.beginPath(); x.ellipse(rnd() * W, rnd() * H, 1 + rnd() * 5, 1 + rnd() * 7, rnd() * 3, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// LETREIRO HAVAN: caixa azul com letras AMARELAS (a identidade nº1 da loja, e o que
// faltava — o logo antigo era azul sobre branco e sumia na fachada branca).
// NOME DA LOJA — pedido do dono (31/07): "vamos tirar o nome Havan do mapa e por loja H,
// e no prédio por loja H também". Uma constante só, usada no letreiro da fachada, nos
// letreiros das alas e na parede do fundo, pra não sobrar nenhum "HAVAN" perdido numa
// textura. O mapa segue sendo a paródia da loja de rodovia com colunata e estátua.
const LOJA_NOME = 'LOJA H';

function letreiroTex(txt, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = '#1f2a70'; x.fillRect(0, 0, w, h);
  x.fillStyle = '#2f3a8c'; x.fillRect(4, 4, w - 8, h - 8);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  let px = h * 0.78; x.font = `bold ${px}px "Arial Black",Impact,sans-serif`;
  while (x.measureText(txt).width > w * 0.88 && px > 12) { px -= 4; x.font = `bold ${px}px "Arial Black",Impact,sans-serif`; }
  x.lineWidth = Math.max(2, px * 0.06); x.strokeStyle = '#ffffff'; x.strokeText(txt, w / 2, h * 0.54);
  x.fillStyle = '#f4c020'; x.fillText(txt, w / 2, h * 0.54);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildHavan(scene, T) {
  const colliders = [], occluders = [], pickups = [], doors = [];
  const root = new THREE.Group(); scene.add(root);
  /* PBR DE SUPERFÍCIE — o MESMO caminho do map.js:17-28, que era o único mapa a ter.
     MEDIDO antes desta rodada, varrendo a cena dos 5 mapas reais em runtime: 877 materiais,
     70 normalMap e 70 roughnessMap, TODOS no praca_old (o único que chamava `detailFor`).
     Este mapa tinha ZERO. Depois: 113/113 no total. O `detailFor`
     pendura normal+roughness derivados do PRÓPRIO albedo por Sobel (textures.js), então a
     superfície deixa de ser cor chapada e passa a reagir ao sol e ao env map — sem asset
     externo e sem textura nova: os dois mapas derivados são gerados UMA vez por canvas de
     albedo e cacheados num WeakMap, e materiais que compartilham o mesmo albedo compartilham
     os mesmos derivados.
     CUSTO NA MÁQUINA FRACA (a preocupação do dono): zero. O `withDetail` do textures.js já
     sai fora em quality 'low' e com ?detail=0, e nesses casos `detailFor` devolve null e o
     material fica exatamente como era. normalScale 0,65 é o mesmo do map.js — relevo por
     Sobel exagera fácil e vira plástico. */
  const lam = (o) => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };
  /* ===== TEXTURAS CANVAS COMPARTILHADAS (custo de carga — item 7 da revisão) =====
     A r1 saiu de 12 para 26 texturas canvas e o mapa estourou o teto de 300 s do harness
     (268 s → 343 s). Rasterizar canvas debaixo de SwiftShader é caro, e boa parte delas
     era literalmente a MESMA imagem gerada de novo (muro lateral, pilarete, letreiro das
     alas, 7 manchas de óleo idênticas, 8 banners que são 4).
     REGRA daqui pra frente: UM canvas por imagem. Variação de escala/posição vem de
     `clone()`, que compartilha o `source` — logo é UMA textura na GPU também, e nenhuma
     rasterização a mais. Nada disso muda o que aparece na tela. */
  const MURO_TEX = muroTex(3);
  const REBOCO_TEX = reboco(3, 3);
  const reTile = (t, rx, rz) => { const c = t.clone(); c.repeat.set(rx, rz); return c; };
  /* TEX1 — SUJEIRA MULTIPLICATIVA PARA AS SUPERFÍCIES DE COR CHAPADA.
     O dono: "placas e bandeiras brancas sem textura, retângulos brancos grandes e lisos".
     Medido (tools/eval/mat-check.mjs): 11 superfícies VISÍVEIS deste mapa com albedo claro
     (luminância ≥ 0,55), sem `map`, com triângulo único de 6 a 920 m² — o pátio da Casa
     Branca sozinho é um plano de 920 m² de cor lisa. O maior é o pior, mas o defeito é o
     mesmo em todos: cor constante não tem microcontraste, então a superfície não tem escala
     e o olho lê "papel".
     POR QUE UMA TEXTURA SÓ, BRANCA: o mapa tem 5 cores diferentes nesse estado (bege do
     meio-fio, cinza do mezanino, amarelo Havan, branco e creme da Casa Branca). Uma textura
     por cor seriam 5 canvas. Como o three MULTIPLICA `map` × `color`, uma única textura de
     base BRANCA com manchas neutras serve às cinco: cada material mantém a `color` dele e
     ganha a variação. É a regra que este arquivo já tinha escrita logo acima ("UM canvas por
     imagem; variação vem de clone()"), aplicada a uma imagem a mais — 1 canvas 256², e os
     `reTile` compartilham `source`, logo continua UMA textura na GPU. */
  const GESSO_TEX = noiseTex('#ffffff', [
    ['#e6e6e4', 44, 10, 28, 0.50],   // manchas grandes: variação de macro-escala
    ['#f7f7f5', 26, 8, 20, 0.40],    // clareado (sol/lavagem)
    ['#d2d2cf', 16, 5, 14, 0.45],    // encardido
  ], 1, 1, { seed: 21 });
  // repeat calculado pra dar 2,0 × 1,0 m por tile nas duas paredes (= 256 px/m)
  const muroMap = reTile(MURO_TEX, (2 * HALF_X + 2) / 2, 3);      // fundo: 78 m → 39 tiles
  const muroSMap = reTile(MURO_TEX, (HALF_Z - -6) / 2, 3);        // laterais: 64 m → 32 tiles
  const MAT = {
    lot: lam({ map: asfaltoTex(13, 11) }),   // v4: asfalto com brita+recape (as "bolhas" sumiram)
    // piso da loja: porcelanato POLIDO — roughness baixa dá o brilho de espelho sob a
    // fluorescente, que é metade da leitura "estou dentro de uma loja" (contra o sol fosco)
    floor: lam({ map: noiseTex('#c9cfd6', [['#b2b9c0', 40, 8, 22, 0.45], ['#dde2e7', 30, 6, 18, 0.35], ['#8a929a', 14, 4, 12, 0.4]], 16, 16, { cracks: '#9aa2aa', pebbles: '#eef1f4', seed: 9 }), roughness: 0.22, metalness: 0.10, envMapIntensity: 1.6 }),
    wall: lam({ map: acmTex(8, 2) }),                                    // painel ACM azul c/ emendas
    trim: lam({ color: 0xf4c020, map: reTile(GESSO_TEX, 3, 3) }),   // TEX1: amarelo Havan com desgaste
    shelf: lam({ color: 0xb9bec4 }), goods: lam({ color: 0xe07a3a }), rack: lam({ color: 0x3a3f45 }),
    caixa: lam({ color: 0xdfe4e8 }),
    /* VIDRO DE VITRINE — R9. `lam` tem roughness 0.9 por padrão, então as seis vitrines da
       fachada e as duas folhas da porta eram VIDRO FOSCO: nenhum reflexo de sol, nenhum
       pixel acima de L* 97 na frente inteira da loja. 0.10/0.55 devolve a lâmina de sol que
       corre pelo painel quando a câmera passa, e o envMap 2.4 devolve o céu refletido que é
       o que faz vidro LER como vidro (senão é um plano azul translúcido). */
    glass: lam({ color: 0x9fd0e8, roughness: 0.20, metalness: 0.45, envMapIntensity: 2.4, transparent: true, opacity: 0.4 }),
    // aço da estrutura/prateleira: era metalness 0 (o default do `lam`) — literalmente plástico cinza
    steel: lam({ color: 0x8a9096, roughness: 0.32, metalness: 0.85, envMapIntensity: 1.8 }),
    // TEX1: mezanino (145 m² de laje lisa) e meio-fio/pátio (920 m² no maior plano) ganham o
    // GESSO_TEX multiplicativo. `patio` é o mesmo material com repeat de PLANO GRANDE — sem
    // ele o pátio da Casa Branca teria tiles de 8 m e a variação sumiria na distância.
    mez: lam({ color: 0xc7ccd2, map: reTile(GESSO_TEX, 8, 8) }),
    curb: lam({ color: 0xd8d2c0, map: reTile(GESSO_TEX, 4, 4) }),
    patio: lam({ color: 0xd8d2c0, map: reTile(GESSO_TEX, 23, 20) }),   // 46 × 40 m -> tile de 2 m
    // muro do estacionamento: bloco de concreto pintado na escala real (40 × 20 cm).
    // O MESMO canvas entra como bumpMap: a junta rebaixada vira relevo no shader sem
    // custo de textura nova, que é o que dá micro-detalhe a < 2 m da câmera (B5).
    // vertexColors: o encardido/AO da base vem da geometria (ver bakeMuroAO).
    muro: lam({ map: muroMap, bumpMap: muroMap, bumpScale: 0.45, roughness: 0.93, vertexColors: true }),
    muroS: lam({ map: muroSMap, bumpMap: muroSMap, bumpScale: 0.45, roughness: 0.93, vertexColors: true }),
    paintW: new THREE.MeshBasicMaterial({ map: tintaTex('#e8e6dd'), transparent: true, depthWrite: false }),
    paintY: new THREE.MeshBasicMaterial({ map: tintaTex('#e0b028'), transparent: true, depthWrite: false }),
  };
  /* AO DE VÉRTICE (critério A1) — ver vao.js. A r2 já tinha isso SÓ nos 3 muros do
     perímetro (bakeMuroAO); agora vale para toda caixa procedural do mapa. */
  const LOWQ = _q === 'low';
  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
  /* ================= ORÇAMENTO DE DRAW CALL (rodada 3) =================
     MEDIDO na r2: 4.347 draw calls e 3,65 M triângulos contra um teto de régua de
     300-800 calls / 500 k tris. O mapa não tem conteúdo demais — ele tem MALHA demais
     pra mesma imagem. Três frentes, todas sem tirar um pixel da tela:

       1. DECO_BATCH — toda caixa/cilindro DECORATIVO (collide:false: colunata, cornija,
          pilaretes, vitrines, letreiros, Casa Branca, luminárias, degraus) vira UMA malha
          mesclada por material. Eram ~400 meshes; viram ~15. Nada disso é occluder nem
          collider, então A-estrela, LOS e hitscan continuam idênticos — e o raycast fica mais
          barato, porque a lista de occluders não muda mas o grafo de cena encolhe.
       2. PROPS — os GLB repetidos (59 carros de 12 modelos, 35 gôndolas, 10 carrinhos)
          viram InstancedMesh agrupado por material. Um carro de 60 primitivas custava 60
          draw calls por cópia; agora custa ~1-15 pro modelo inteiro, com a cor de lataria
          indo por instanceColor (a repintura BR continua carro a carro).
       3. PAINT_BATCH — as ~78 faixas de tinta do asfalto viram 4 malhas (uma por material).

     `?batch=0` desliga tudo e volta ao caminho antigo, mesh por mesh — é o A/B que prova
     que o frame não mudou. Em quality 'low' o mapa ainda corta props (ver DECO_HI/LOWQ). */
  const BATCH = PROP_BATCH;
  const DECO_BATCH = new StaticBatch({ name: 'havan-deco' });
  const PAINT_BATCH = new StaticBatch({ name: 'havan-tinta' });
  // carros: bucket 0 (uma instância por modelo+material cobrindo o pátio inteiro). Com os
  // modelos baratos da nova seleção o pátio todo dá ~200 k tris — não compensa fatiar em
  // blocos pra ganhar culling e pagar 3× em draw call.
  const PROPS = new PropBatch({
    tag: 'havan',
    // lataria: mesma regra do paintBR (nome de material de carroceria e SEM textura assada)
    paintTest: (m) => !!m && !Array.isArray(m) && BODY_RE.test(m.name || '') && !SKIP_RE.test(m.name || '') && !m.map && CARPAINT,
    /* LATARIA / CROMADO / VIDRO DOS GLB — R9. Antes só se SOMAVA 0,16 de roughness à
       pintura, o que empurrava o verniz pra 0,55-0,75: um pátio com 59 carros ao sol de
       meio-dia sem UM reflexo estourado. Agora a pintura vai pra 0,30 (pico do GGX ~40, o
       suficiente pra clipar num capô curvo) e o cromado/vidro — que o SKIP_RE já preserva
       da repintura — recebe o tratamento de metal polido que o glTF não trouxe. */
    matTweak: (m, paint) => {
      if (!m) return;
      // ganho de IBL modesto no geral (1,25): envMapIntensity mexe TAMBÉM na irradiância
      // difusa, então um blanket alto aqui viraria "ambiente a mais" em 35 gôndolas e 59
      // carros. O ganho grande fica só onde há reflexão especular pra sustentar.
      m.envMapIntensity = 1.25;
      if (paint) { m.roughness = 0.30; m.metalness = Math.max(m.metalness ?? 0, 0.45); return; }
      const n = m.name || '';
      if (/chrome|crom|metal|steel|aco|aço|rim|roda|escapa|exhaust|carrinho|cart/i.test(n)) {
        m.roughness = 0.24; m.metalness = 0.90; m.envMapIntensity = 2.0;
      } else if (/glass|vidro|window|janela|farol|lente|lens/i.test(n)) {
        m.roughness = 0.18; m.metalness = 0.45; m.envMapIntensity = 2.4;
      }
    },
    // peças com menos de 6% dos triângulos do modelo (emblema, retrovisor, friso) não mudam
    // a silhueta projetada e custavam metade do passe de sombra
    shadowMin: 0.06,
  });
  /* Manda um mesh AVULSO (cilindro, extrude, plano) pro merge estático em vez da cena.
     Retorna o mesh mesmo assim, pra quem quiser continuar mexendo nele antes do build. */
  function deco(m, batch) {
    const b = batch || DECO_BATCH;
    if (!BATCH || Array.isArray(m.material)) { root.add(m); return m; }
    m.updateMatrix();
    if (!b.add(m.geometry, m.matrix, m.material, { cast: m.castShadow, receive: m.receiveShadow, order: m.renderOrder })) root.add(m);
    return m;
  }
  function addBox(w, h, d, mat, x, y, z, opts = {}) {
    const vao = VAO_BANDS && opts.vao !== false && mat && mat.visible !== false;
    // `solo` é geométrico, não depende do gate de faixas — assim `?vao=skirt` (A/B do
    // agente de captura) ainda emite a saia. SKIRT.add já checa o próprio kill-switch.
    const solo = onGround(y, h) && !opts.rx && !opts.rz;
    const geo = vao ? aoBoxGeo(w, h, d, { low: LOWQ, base: solo ? undefined : BASE_FLOATING })
      : new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, vao ? aoMat(mat) : mat);
    m.position.set(x, y + h / 2, z); m.castShadow = opts.cast !== false; m.receiveShadow = true;
    if (opts.ry) m.rotation.y = opts.ry;
    if (solo && opts.skirt !== false) SKIRT.add(x, y, z, w, d, opts.ry || 0);
    const collide = opts.collide !== false;
    // só entra no merge quem NÃO é occluder (o raycast de LOS/hitscan precisa de meshes
    // separados pra ter early-out por bounding sphere) e quem não vai ser animado depois
    if (collide || opts.batch === false || Array.isArray(m.material)) {
      root.add(m);
      if (collide) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 }); occluders.push(m); }
      return m;
    }
    return deco(m, DECO_BATCH);
  }
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); };

  /* ===================== DECALQUE DE RUA (public/img/decals) =====================
     Pedido do dono (04/08): aplicar os 179 recortes de `public/img/decals` "na textura de
     todos mapas onde faz sentido ... e num tamanho MAIOR que os posters atuais".

     ONDE FAZ SENTIDO NESTE MAPA, e por que só ali: a loja é um TEMPLO GRECO-ROMANO branco
     com colunata, frontão e logo — é o marco de orientação do mapa inteiro (C23 da
     BAR-CONSISTENCIA) e pichar a fachada apagaria justamente o que a torna reconhecível. O
     que recebe tinta é o MURO DO ESTACIONAMENTO: 78 m de bloco de concreto de fundo de
     estacionamento de loja de rodovia, que no Brasil é a superfície pichada por definição.
     Loja limpa + muro pichado é a leitura certa; os dois pichados seria só ruído.

     TETO DE ALTURA MEDIDO, não escolhido: o muro tem 3,00 m e a FAIXA AZUL HAVAN ocupa de
     2,56 a 3,00 m, com o filete dourado em 2,48. Sobram 2,48 m de bloco livre — por isso o
     decalque vai com base em 0,15 e 2,30 m de altura (topo em 2,45, 3 cm abaixo do filete).
     Continua MAIOR que os 2,2 m dos cartazes do Piscinão, e a folga vem da LARGURA: as tags
     deste pool são deitadas (aspecto 1,3-3,0), então a peça sai com 3 a 5,5 m de base.

     REGRAS (cada uma com defeito real atrás):
     1. `T.decals[i]` lido por ÍNDICE — getter memoizado (textures.js:696). Spread/`.map()`
        acordaria os 179 PNG (7 MB) de uma vez.
     2. `transparent: true` — sem isso o alpha vira retângulo preto no bloco.
     3. PLANO, fora de `colliders` e de `occluders`: decalque com colisor vira parede
        invisível (BUG-21, o ônibus da Brasília), e occluder sem colisor é o que a MAP4 mede.
     4. 8 cm de afastamento da face + polygonOffset (o muro tem bumpMap; coplanar cintila).
     5. Escolha determinística por posição — o `botsim` é determinístico.
     Fora do pool: as 47 folhas de 'alfabeto' (letra fina e clara, some a 10 m) e os
     recortes de olho/boca soltos (mancha abstrata quando ampliados). */
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png',
    'tag-pingo.png', 'tag-selvagem.png', 'tags-treino-02.png', 'tags-treino-05.png']);
  const D_MURAL = decalIds(T, ['personagem-muro.png', 'personagens-graffiti-01.png',
    'personagens-graffiti-02.png', 'personagens-graffiti-03.png', 'personagens-graffiti-04.png',
    'personagens-graffiti-05.png', 'personagens-graffiti-06.png', 'personagens-graffiti-07.png',
    'peca-bolha.png', 'or-graf-treta.png', 'or-graf-coro.png',          // originais versionados
    'or-stencil-capivara.png', 'or-stencil-pomba.png']);                // (únicos vivos em prod)
  const _dmix = (n) => { let v = (n * 2654435761) >>> 0; v ^= v >>> 15; v = Math.imul(v, 2246822519) >>> 0; v ^= v >>> 13; v = Math.imul(v, 3266489917) >>> 0; return (v ^ (v >>> 16)) >>> 0; };
  const _dmat = new Map(), _usados = [];
  function decal(pool, x, y, z, ry, alt, larg = 99) {
    if (!T.decals || !T.decalAspects || !pool.length) return null;
    const k = _dmix(_dmix(Math.round(x * 10) + 9973) + Math.round(z * 10) * 131 + 7);
    let i = pool[k % pool.length];                       // anti-repetição a menos de 16 m:
    for (let t = 0; t < pool.length; t++) {              // arte repetida perto lê como falha
      const j = pool[(k + t) % pool.length];             // de asset, não como muro pichado
      if (!_usados.some((u) => u.i === j && Math.hypot(u.x - x, u.z - z) < 16)) { i = j; break; }
    }
    const a = T.decalAspects[i] || 1;
    let h = alt, w = alt * a;
    if (w > larg) { w = larg; h = larg / a; }             // encolhe inteiro; NUNCA estica
    /* PAREDE ATRÁS ANTES DE DESENHAR (map_decals.js). Vem antes do `_usados` e do
       material de propósito: peça reprovada não pode gastar a vaga da anti-repetição
       nem acordar o getter memoizado de uma textura que ninguém vai ver. */
    /* `[root]` e não `colliders`: o critério mede a MALHA DESENHADA, não a lista de caixas
       declaradas — caixa declarada é maior que o prop e deixou 16 peças nascerem no ar na
       Brasília e 21 sem parede na Quebrada. Ver a docstring do map_decals.js. */
    if (!paredeAtras([root], x, y + h / 2, z, ry, w, h)) return null;
    _usados.push({ i, x, z });
    let m = _dmat.get(i);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        map: T.decals[i], transparent: true, alphaTest: 0.22, roughness: 0.95, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      });
      _dmat.set(i, m);
    }
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    q.position.set(x, y + h / 2, z); q.rotation.y = ry; q.renderOrder = 2;
    q.receiveShadow = true;                               // tinta escurece junto com o muro
    q.name = 'decal:' + (T.decalFiles ? T.decalFiles[i] : i);
    esconderSeFaltar(q, T.decals[i]);   // PNG 404 em prod vira BRANCO CHAPADO se não sumir (ver graffiti_pass.esconderSeFaltar)
    root.add(q);
    return q;
  }
  /* PROPS DA LOJA — lote separado, SEM sombra de sol.
     PORQUE: desde a r2 a laje do teto tem castShadow (foi o que criou a identidade de
     interior: dentro da loja só existe a fluorescente fria). Ou seja, TODO o piso da loja
     já está na sombra do teto — e as ~40 gôndolas/araras/caixas/manequins continuavam
     sendo desenhadas no shadow map do sol pra projetar sombra sobre sombra. São ~124 k
     triângulos e ~10 draw calls por frame que não produzem UM pixel. Com `?teto=0` (o sol
     volta a entrar) elas voltam a projetar, senão o interior ficaria sem sombra nenhuma. */
  const TETO = QP.get('teto') !== '0';
  const PROPS_LOJA = new PropBatch({ tag: 'havan', shadowMin: 0.06, cast: !TETO });
  // gprop agora só REGISTRA no PropBatch (a malha nasce no build lá embaixo). O retorno
  // continua sendo "o GLB existe?", que é o que os ~40 fallbacks do mapa consultam.
  // z < -6 = dentro da loja (SF): vai pro lote sem sombra.
  const gprop = (id, x, z, h, ry = 0, y = 0) => {
    if (BATCH) return (z < -6 ? PROPS_LOJA : PROPS).add(id, { x, y, z, targetH: h, ry });
    const o = placeProp(id, { x, y, z, targetH: h, ry }); if (o) root.add(o); return !!o;
  };
  // fallback enquanto o GLB não carrega (ou falha): mini-carro colorido por hash do id —
  // substitui a caixa preta que fazia o estacionamento parecer quebrado no menu/loading.
  // Paleta REAL da frota brasileira (~67% neutros: branco 21,9 / preto 19,0 / prata 16,3 /
  // cinza 10,8; vermelho 15,4 é a única cor forte relevante). O fallback antigo era um
  // arco-íris (roxo, laranja, verde) que dava cara de pista de kart.
  const BR_PAINT = [[0xe9e9e6, 22], [0x16181b, 19], [0xb9bcc0, 16], [0x74797e, 11],
    [0x9d2320, 15], [0x1f3a6b, 6], [0x6b5340, 5], [0x2f5a3a, 3], [0xd8c33a, 3]];
  const PAINT_BAG = []; for (const [c, w] of BR_PAINT) for (let i = 0; i < w; i++) PAINT_BAG.push(c);
  const CAR_COLORS = PAINT_BAG;
  // REPINTURA DOS GLB: placeProp faz tpl.clone(true), que COMPARTILHA material — por isso
  // clonamos o material antes de mexer. Só materiais cujo NOME é lataria/carpaint e que
  // NÃO têm textura baked entram (nos carros Mint a pintura está assada no mapa: multiplicar
  // a cor só sujaria a textura). ?carpaint=0 desliga.
  const CARPAINT = QP.get('carpaint') !== '0';
  const BODY_RE = /lataria|carpaint|car_paint|carroc|pintura|^paint$|_paint|^body/i;
  const SKIP_RE = /trim|chrome|plastic|glass|vidro|rubber|pneu|tire/i;
  const WORN = new THREE.Color(0xb9b4a8);
  let _paintI = (_carSeed * 7) % PAINT_BAG.length;
  function paintBR(o) {
    if (!CARPAINT) return;
    _paintI = (_paintI + 37) % PAINT_BAG.length;     // 37 e 100 são coprimos: espalha as cores
    const hex = PAINT_BAG[_paintI], worn = ((_paintI * 13) % 10) < 4;   // ~40% com verniz queimado
    o.traverse((m) => {
      if (!m.isMesh || !m.material || Array.isArray(m.material)) return;
      const n = m.material.name || '';
      if (!BODY_RE.test(n) || SKIP_RE.test(n) || m.material.map) return;
      const mat = m.material.clone(); mat.color.setHex(hex);
      // verniz descascado: sem máscara por peça, o honesto é queimar o brilho e "cretar"
      // a cor — é exatamente como um capô descascado de sol lê à distância de jogo.
      // mesma calibração do matTweak do PropBatch (ver lá o porquê do 0,34)
      mat.envMapIntensity = 1.25;
      if (worn) { mat.roughness = 0.62; mat.metalness = Math.max(0, (mat.metalness ?? 0.3) - 0.25); mat.color.lerp(WORN, 0.18); }
      else { mat.roughness = 0.30; mat.metalness = Math.max(mat.metalness ?? 0, 0.45); }
      m.material = mat;
    });
  }
  // sorteia a cor de UM carro (mesma sequência de antes: 37 e 100 são coprimos)
  const nextPaint = () => { _paintI = (_paintI + 37) % PAINT_BAG.length; return PAINT_BAG[_paintI]; };
  // coloca 1 carro (GLB repintado) ou cai no mini-carro de fallback.
  // Com BATCH a cor da lataria vai por instanceColor (ver PropBatch.paintTest): 59 carros
  // continuam com 59 pinturas diferentes, mas custam ~1 draw call por material do MODELO.
  const placeCar = (id, x, z, ry) => {
    const [cl, ch] = carDim(id);   // ficha de fábrica; ver CAR_DIM lá em cima
    if (BATCH) { const col = CARPAINT ? nextPaint() : null; if (PROPS.add(id, { x, y: 0, z, targetLen: cl, targetH: ch, ry, color: col })) return; fallbackCar(id, x, z, ry); return; }
    const o = placeProp(id, { x, y: 0, z, targetLen: cl, targetH: ch, ry });
    if (!o) { fallbackCar(id, x, z, ry); return; }
    paintBR(o); root.add(o);
  };
  function fallbackCar(id, x, z, ry) {
    let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
    // o fallback segue a ficha: senão a moto sem GLB volta como caixa de 4,20 m
    const [cl, calt] = carDim(id);
    const kl = cl / CAR_DIM_PADRAO[0], ka = calt / CAR_DIM_PADRAO[1];
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8 * kl, 0.55 * ka, 4.2 * kl), lam({ color: CAR_COLORS[Math.abs(h) % CAR_COLORS.length], metalness: 0.55, roughness: 0.32, envMapIntensity: 1.8 }));
    body.position.y = 0.55 * ka; body.castShadow = body.receiveShadow = true; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6 * kl, 0.5 * ka, 2.1 * kl), lam({ color: 0x20242a, metalness: 0.45, roughness: 0.18, envMapIntensity: 2.2 }));   // vidro do carro
    cabin.position.set(0, 1.05 * ka, -0.2 * kl); cabin.castShadow = true; g.add(cabin);
    g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
  }

  // ===== chão: estacionamento (z>-6) + loja (z<-6) =====
  addFloor(HALF_X * 2, HALF_Z + 6, 0, (HALF_Z - 6) / 2 + 3, MAT.lot);      // estacionamento
  addFloor(HALF_X * 2, HALF_Z - 6, 0, -(HALF_Z - 6) / 2 - 3, MAT.floor);   // piso da loja

  // ===== LOJA (prédio fechado no fundo, z ∈ [-42,-6]) =====
  const SF = -6, SB = -42, SW = 28;   // frente / fundo / meia-largura
  /* ===== FRENTE DA LOJA: TRÊS VÃOS DE PORTA, NÃO UM =====
     Pedido literal do dono: "vamos adicionar mais 2 PORTAS, uma em cada CANTO, você percebe
     que a loja fica VAZIA DOS CANTOS?". Ele diagnosticou a causa junto com o sintoma: com um
     vão só, no centro (x ∈ [−4,4]), TODO mundo que entra ou sai da loja passa pelo mesmo
     ponto — e os 20 m de loja de cada lado do eixo viram fundo de cenário.
     Agora a fachada é uma lista de VÃOS e a parede é o que sobra entre eles. Os dois novos
     ficam a 3,6 m de largura, encostados nas pontas (x ∈ ±[20,2 , 23,8]), alinhados com os
     corredores laterais novos das gôndolas — cada canto ganha uma entrada própria que
     desemboca num corredor norte-sul de 4,2 m que corre até o fundo da loja.
     O EIXO CENTRAL NÃO MUDOU (regra do dono: "o meio continua sendo o caminho principal"):
     o vão de 8 m em x ∈ [−4,4] segue lá, é o mais largo dos três e o único no eixo do
     estacionamento. As portas novas são ROTA LATERAL, não substituição. */
  const PORTAS_FRENTE = [[-23.8, -20.2], [-4, 4], [20.2, 23.8]];
  {
    let x = -SW;
    for (const [g0, g1] of PORTAS_FRENTE) {
      if (g0 > x) addBox(g0 - x, 5, 1, MAT.wall, (x + g0) / 2, 0, SF);
      x = g1;
    }
    if (SW > x) addBox(SW - x, 5, 1, MAT.wall, (x + SW) / 2, 0, SF);
  }
  addBox(2 * SW, 5, 1, MAT.wall, 0, 0, SB);               // fundo
  addBox(1, 5, SF - SB, MAT.wall, -SW, 0, (SF + SB) / 2); // lateral esq
  addBox(1, 5, SF - SB, MAT.wall, SW, 0, (SF + SB) / 2);  // lateral dir
  // ===== FACHADA GRECO-ROMANA (G2-R3: "a loja da havan é estilo greco romano") =====
  // Skin arquitetônica SOBRE a estrutura de gameplay: tudo collide:false e nenhum
  // collider novo — paredes/vão da porta/A*/LOS intactos. Templo branco: reboco sobre
  // o ACM azul, cornija corrida avançada sobre a colunata, frontão triangular c/ logo
  // HAVAN azul, 10 colunas (base + fuste + capitel simples) e banners coloridos.
  {
    // reboco branco TEXTURIZADO (era cor chapada = "paredão liso"): mottle + escorrimento
    const plaster = lam({ map: REBOCO_TEX, roughness: 0.85 });   // canvas de reboco ÚNICO no mapa
    const plasterCol = lam({ map: caneluraTex(), roughness: 0.8 });   // fuste canelado
    const FZ = SF + 0.5;   // face frontal da parede da fachada (z=-5.5)
    // reboco branco por cima do ACM azul (frente da loja + fechos laterais de corredor)
    // — fica ATRÁS das vitrines (z=-5.45), que continuam visíveis entre as colunas
    /* O reboco segue a MESMA lista de vãos da parede (PORTAS_FRENTE). Antes eram dois panos
       de 24 m colados em [-28,-4] e [4,28]; com as portas de canto eles taparam os vãos
       novos por fora — porta que existe pra física e não existe pros olhos é o defeito que a
       invariante MAP4 mede do outro lado (malha sem colisor é tão mentiroso quanto colisor
       sem malha). */
    {
      let x = -SW;
      for (const [g0, g1] of PORTAS_FRENTE) {
        if (g0 > x) addBox(g0 - x, 5, 0.03, plaster, (x + g0) / 2, 0, FZ + 0.015, { collide: false });
        x = g1;
      }
      if (SW > x) addBox(SW - x, 5, 0.03, plaster, (x + SW) / 2, 0, FZ + 0.015, { collide: false });
    }
    for (const [cx, w] of [[-33, HALF_X - SW + 1], [33, HALF_X - SW + 1]])
      addBox(w, 5, 0.03, plaster, cx, 0, FZ + 0.015, { collide: false });
    // pilastras rasas nas seções laterais (ritmo de templo, como nas fotos)
    for (const sx of [-1, 1]) for (const px of [28.5, 33, 37.5])
      addBox(0.6, 5, 0.24, plaster, sx * px, 0, FZ + 0.1, { collide: false });
    // COLUNATA da entrada: 10 colunas a 1.4m da parede (vão da porta x∈[-4,4] livre)
    for (const sx of [-1, 1]) for (const ax of [5, 10, 15, 20, 25]) {
      const x = sx * ax, z = SF + 1.9;
      addBox(1.1, 0.18, 1.1, plaster, x, 0, z, { collide: false });                     // plinto
      addBox(0.92, 0.20, 0.92, plaster, x, 0.18, z, { collide: false });                // base (toro)
      // fuste CANELADO (16 lados p/ a estria ler no perfil; a textura faz o resto de graça)
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 4.12, 16), plasterCol);
      shaft.position.set(x, 0.38 + 4.12 / 2, z); shaft.castShadow = shaft.receiveShadow = true; deco(shaft);
      const ech = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.30, 0.22, 16), plaster);  // équino do capitel
      ech.position.set(x, 4.61, z); ech.castShadow = true; deco(ech);
      addBox(1.0, 0.26, 1.0, plaster, x, 4.72, z, { collide: false });                  // ábaco do capitel sob a cornija
    }
    /* BANNERS verticais entre as colunas. Eram 8 canvas de 256×512 pra 4 imagens (o laço
       de sx repetia os mesmos 4 rótulos). Agora é UM atlas 1024×512 com as 4 tiras lado a
       lado; cada banner é um clone com repeat 0,25 e offset — mesmo `source`, uma textura
       na GPU, 1 rasterização em vez de 8. */
    const bannerDefs = [['#2f3a8c', 'OFERTAS'], ['#c8342e', 'ELETRO'], ['#e9a614', 'MERCADO'], ['#2e7d4f', 'MODA']];
    const bannerAtlas = (() => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x2 = c.getContext('2d');
      bannerDefs.forEach(([bg, label], i) => {
        const ox = i * 256;
        x2.fillStyle = bg; x2.fillRect(ox, 0, 256, 512);
        x2.fillStyle = 'rgba(255,255,255,0.18)'; x2.fillRect(ox, 0, 256, 36); x2.fillRect(ox, 476, 256, 36);
        x2.fillStyle = '#ffffff'; x2.textAlign = 'center';
        x2.save(); x2.translate(ox + 128, 256); x2.rotate(-Math.PI / 2);
        x2.font = 'bold 76px "Arial Black",Impact,sans-serif'; x2.fillText(label, 0, 27); x2.restore();
      });
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    /* Os 8 banners eram 8 clones de textura + 8 materiais + 8 draw calls. Como todos
       saem do MESMO atlas, dá pra assar o recorte no UV da própria geometria — aí os 8
       compartilham UM material e o merge estático junta tudo num draw call só. Mesma
       imagem na tela, 1/8 do custo. */
    const bannerMat = new THREE.MeshStandardMaterial({ map: bannerAtlas, roughness: 0.8, side: THREE.DoubleSide });
    const subUV = (geo, ox, sx2) => { const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setX(k, ox + uv.getX(k) * sx2); uv.needsUpdate = true; return geo; };
    // 22,5 -> 26,5: o 4º banner de cada lado ficava EM FRENTE ao vão da porta de canto nova
    // (x ∈ ±[20,2 , 23,8]); passou pra ala, entre a porta e a quina do prédio.
    for (const sx of [-1, 1]) [7.5, 12.5, 17.5, 26.5].forEach((bx, i) => {
      const b = new THREE.Mesh(subUV(new THREE.PlaneGeometry(1.9, 2.9), i * 0.25, 0.25), bannerMat);
      b.position.set(sx * bx, 3.35, SF + 1.9); b.castShadow = true; deco(b);
    });
    // CORNIJA corrida no topo, avançando da parede até cobrir a colunata
    addBox(2 * HALF_X + 1, 0.55, 2.3, plaster, 0, 5.0, SF + 1.05, { collide: false });
    addBox(2 * HALF_X + 1, 0.2, 1.6, plaster, 0, 5.55, SF + 0.7, { collide: false });   // filete superior
    // DENTÍCULOS sob a cornija: 1 InstancedMesh p/ ~150 blocos (1 draw call) — é o detalhe
    // que faz a cornija ler como cornija e não como laje. Só em quality >= med.
    if (DECO_HI) {
      const n = 150, dm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.26, 0.3), plaster, n);
      const mtx = new THREE.Matrix4();
      for (let i = 0; i < n; i++) {
        mtx.setPosition(-HALF_X + 0.5 + i * ((2 * HALF_X - 1) / (n - 1)), 4.86, SF + 2.05);
        dm.setMatrixAt(i, mtx);
      }
      dm.castShadow = true; dm.frustumCulled = false;   // bounding sphere do InstancedMesh some com a fachada inteira
      root.add(dm);
    }
    // FRONTÃO triangular central (tímpano branco) + LETREIRO AMARELO (a identidade Havan:
    // caixa azul, letras amarelas gigantes — o logo antigo era azul-sobre-branco e sumia)
    {
      const tri = new THREE.Shape(); tri.moveTo(-13, 0); tri.lineTo(13, 0); tri.lineTo(0, 3.8); tri.closePath();
      const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.6, bevelEnabled: false }), plaster);
      ped.position.set(0, 5.75, SF + 0.1); ped.castShadow = true; deco(ped);
      const map = letreiroTex(LOJA_NOME, 1024, 256);
      // emissive: o letreiro é luminoso (é de acrílico retroiluminado na loja real) —
      // em quality low cai pra Basic, que não paga o custo de emissive no shader
      const mat = _q === 'low' ? new THREE.MeshBasicMaterial({ map })
        : new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.6 });
      const s = new THREE.Mesh(new THREE.BoxGeometry(12, 3.0, 0.35), mat);
      s.position.set(0, 6.85, SF + 1.85); s.castShadow = true; deco(s);
      // letreiros menores nas alas laterais: um canvas só, o mesmo material nos dois lados
      // (eram duas rasterizações idênticas do mesmo texto)
      if (DECO) {
        const alaMat = new THREE.MeshBasicMaterial({ map: letreiroTex(LOJA_NOME, 512, 128) });
        for (const sx of [-1, 1]) {
          const m2 = new THREE.Mesh(new THREE.BoxGeometry(7.5, 1.5, 0.25), alaMat);
          m2.position.set(sx * 33, 4.0, SF + 0.72); deco(m2);
        }
      }
    }
  }
  // VITRINES da fachada (crítico gauntlet: "parede única lisa"): painéis de vidro c/ moldura
  // branca dos 2 lados da porta, como na Havan real — sem collider (a parede está atrás)
  {
    const frame = lam({ color: 0xe8ecef });
    // 3 -> 2 vitrines por lado. A terceira ficava centrada em x = ±20,5, com 6,2 m de
    // moldura: exatamente por cima do vão da porta de canto nova. Vitrine sobre porta é o
    // mesmo defeito do reboco — o jogador vê parede de vidro onde a física tem passagem.
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) {
      const x = sx * (7.5 + i * 6.5);
      addBox(0.15, 3.4, 0.15, frame, x - 3.1, 0.6, SF + 0.55, { collide: false });
      addBox(6.2, 0.15, 0.15, frame, x, 4.0, SF + 0.55, { collide: false });
      addBox(6.2, 0.15, 0.15, frame, x, 0.62, SF + 0.55, { collide: false });
      const v = new THREE.Mesh(new THREE.PlaneGeometry(6.0, 3.3), MAT.glass);
      v.position.set(x, 2.3, SF + 0.55); deco(v);
    }
  }
  // teto (alto, sem colisão) — DoubleSide: antes virado só pra cima = céu aparecendo DENTRO da loja
  { const t = new THREE.Mesh(new THREE.PlaneGeometry(2 * SW, SF - SB), new THREE.MeshStandardMaterial({ map: tileTex('#c7ccd2', '#aab1b8', 6, 8, 5), roughness: 0.9, side: THREE.DoubleSide }));
    t.rotation.x = -Math.PI / 2; t.position.set(0, 6.2, (SF + SB) / 2); t.receiveShadow = true;
    /* IDENTIDADE DE INTERIOR (item 9): o teto não estava marcado como castShadow, então o
       SOL atravessava a laje e iluminava o chão da loja igual ao estacionamento — com a
       mesma luz nos dois lados não existe "entrei na loja", e as fluorescentes frias que a
       r1 instalou não tinham contra o que contrastar. Com o teto tapando o sol, o interior
       passa a ser iluminado SÓ pela fluorescente fria, o porcelanato polido reflete essas
       calhas e o vão da porta vira um retângulo quente — que é exatamente a leitura que se
       quer. Custa 1 quad a mais no shadow map. ?teto=0 volta ao comportamento anterior. */
    if (QP.get('teto') !== '0') t.castShadow = true;
    root.add(t); }

  // PORTA COM SENSOR (2 folhas de vidro no vão; game.js abre ao chegar perto — ver world.doors)
  {
    // batch:false — estas duas folhas SÃO animadas (game.js desliza panelL/panelR): mesclar
    // congelaria a porta fechada
    const pl = addBox(4, 4, 0.2, MAT.glass, -2, 0, SF, { cast: false, collide: false, batch: false });
    const pr = addBox(4, 4, 0.2, MAT.glass, 2, 0, SF, { cast: false, collide: false, batch: false });
    doors.push({ panelL: pl, panelR: pr, x: 0, z: SF, closedL: -2, closedR: 2, openL: -6, openR: 6, open: 0 });
    /* AS DUAS PORTAS DE CANTO (pedido do dono). Mesmo mecanismo da central — duas folhas de
       vidro que o game.js desliza pelo sensor de proximidade — só que 1,8 m por folha, no vão
       de 3,6 m. Elas abrem PRA FORA do vão (openL/openR levam a folha pra trás da parede),
       senão a folha aberta ficaria atravessada no meio da passagem. */
    for (const [g0, g1] of PORTAS_FRENTE) {
      const cxp = (g0 + g1) / 2, meia = (g1 - g0) / 2;
      if (Math.abs(cxp) < 1) continue;                     // a central já está montada acima
      const a2 = addBox(meia, 4, 0.2, MAT.glass, cxp - meia / 2, 0, SF, { cast: false, collide: false, batch: false });
      const b2 = addBox(meia, 4, 0.2, MAT.glass, cxp + meia / 2, 0, SF, { cast: false, collide: false, batch: false });
      doors.push({ panelL: a2, panelR: b2, x: cxp, z: SF,
        closedL: cxp - meia / 2, closedR: cxp + meia / 2,
        openL: cxp - meia * 1.5, openR: cxp + meia * 1.5, open: 0 });
    }
  }

  // CAIXAS DE COBRANÇA (esteira+visor Mint, fileira logo dentro da porta, z=-10)
  for (let i = 0; i < 5; i++) {
    const x = -12 + i * 6;
    if (!gprop('caixa_cobranca', x, -10, 1.1)) addBox(2.4, 1.1, 1.2, MAT.caixa, x, 0, -10);
    colliders.push({ minX: x - 0.95, maxX: x + 0.95, minY: 0, maxY: 1.1, minZ: -10.8, maxZ: -9.2 });
  }
  // manequins de entrada (flanqueando o corredor da porta)
  for (const x of [-6, 6]) { gprop('manequim', x, -8, 1.8); colliders.push({ minX: x - 0.3, maxX: x + 0.3, minY: 0, maxY: 1.8, minZ: -8.3, maxZ: -7.7 }); }
  // GÔNDOLAS CHEIAS Mint (mercado + eletro) = cover; 4 fileiras, 2 grupos c/ vão central p/ bots
  for (let r = 0; r < 4; r++) {
    const z = -15 - r * 6;
    const id = r === 2 ? 'gondola_eletro' : 'gondola_mercado';
    for (const gx of [-7.4, -5.26, -3.12, 3.12, 5.26, 7.4]) {   // 3+3, vão central x∈[-2,2]
      if (!gprop(id, gx, z, 1.8, Math.PI / 2)) addBox(2.1, 1.8, 1.0, MAT.shelf, gx, 0, z);
      colliders.push({ minX: gx - 1.05, maxX: gx + 1.05, minY: 0, maxY: 1.8, minZ: z - 0.55, maxZ: z + 0.55 });
    }
  }
  // ilha central na 2ª fileira (tampa a linha de visão spawn↔spawn pela porta; bots contornam pelas pontas)
  if (!gprop('gondola_mercado', 0, -21, 1.8, Math.PI / 2)) addBox(2.1, 1.8, 1.0, MAT.shelf, 0, 0, -21);
  colliders.push({ minX: -1.05, maxX: 1.05, minY: 0, maxY: 1.8, minZ: -21.55, maxZ: -20.45 });
  // REFORÇO DE RESPAWN B (G2-R6B): gôndola tapando o vão central da fileira z=-27 + peças
  // escalonadas nos flancos (±12) — o spawn da loja vira um bolso de gôndolas. A* contorna
  // pelos lados (corredores ≥4m); LOS spawn↔spawn segue 0 (só adiciona cover alto).
  if (!gprop('gondola_eletro', 0, -27, 1.8, Math.PI / 2)) addBox(2.1, 1.8, 1.0, MAT.shelf, 0, 0, -27);
  colliders.push({ minX: -1.05, maxX: 1.05, minY: 0, maxY: 1.8, minZ: -27.55, maxZ: -26.45 });
  for (const sx of [-1, 1]) {
    if (!gprop('gondola_mercado', sx * 12, -28.5, 1.8, Math.PI / 2)) addBox(2.1, 1.8, 1.0, MAT.shelf, sx * 12, 0, -28.5);
    colliders.push({ minX: sx * 12 - 1.05, maxX: sx * 12 + 1.05, minY: 0, maxY: 1.8, minZ: -29.05, maxZ: -27.95 });
  }
  /* ===== FILEIRAS LATERAIS (pedido do dono: "bora adicionar mais gôndolas dos lados") =====
     O miolo da loja tinha 4 fileiras de gôndola em x ∈ [−8,45 , 8,45] e as araras encostadas
     em x = ±24. Entre uma coisa e outra sobravam DOIS vazios de 13 m de largura por 27 m de
     fundo — a metade da área da loja onde não havia nada pra usar, pra se esconder atrás nem
     pra ir buscar. Medido por quadrante (invariante MAP5, tools/eval/map-check.mjs): antes,
     os quadrantes das pontas da loja tinham 0,67× a densidade de prop do quadrante mediano.
     Cada lado ganha 3 gôndolas por fileira, nas MESMAS 4 fileiras do miolo, ocupando
     x ∈ ±[12,85 , 19,23]. O que sobra são DOIS corredores norte-sul novos por lado:
       interno  |x| ∈ [8,45 , 12,85] — 4,40 m, ligando as pontas das fileiras;
       externo  |x| ∈ [19,23 , 22,80] — 3,57 m, que é onde a PORTA DE CANTO desemboca.
     O eixo central (x ∈ [−2,2], o vão das fileiras) continua sendo o caminho mais curto de
     porta a porta — a regra do dono ("o meio continua sendo o caminho principal") é
     respeitada por construção: nenhuma peça nova entra em |x| < 12,85. */
  for (let r = 0; r < 4; r++) {
    const z = -15 - r * 6;
    const id = r === 1 ? 'gondola_eletro' : 'gondola_mercado';
    for (const sx of [-1, 1]) for (const gx of [sx * 13.3, sx * 15.44, sx * 17.58]) {
      if (!gprop(id, gx, z, 1.8, Math.PI / 2)) addBox(2.1, 1.8, 1.0, MAT.shelf, gx, 0, z);
      colliders.push({ minX: gx - 1.05, maxX: gx + 1.05, minY: 0, maxY: 1.8, minZ: z - 0.55, maxZ: z + 0.55 });
    }
  }
  /* ILHAS DE PROMOÇÃO no corredor externo (o da porta de canto). Baixas (1,0 m): dão
     cobertura de agachar e quebram a reta de 27 m do corredor sem fechá-lo — um corredor
     lateral que é um tubo reto seria trocar o funil do meio por dois funis nas pontas.
     ONDE, exatamente: encostadas no lado das gôndolas (x = ±20,0) e com 1,2 m de pegada, não
     no eixo do corredor com 1,6 m. A primeira versão ficava em ±20,7 com 1,6 m e MATAVA o
     corredor no grafo: a única coluna de waypoints que cabe entre as gôndolas (x ≤ 19,23) e
     as araras (x ≥ 22,80) é a de x = 21,8, e o colisor da ilha mais a inflação de 0,5 m do
     `blocked` a apagava em 3 dos 4 z — o corredor externo virava uma sequência de pedaços
     desconexos e o A* não podia usá-lo. Medido: 1 rota separada até a bandeira LOJA L. */
  for (const sx of [-1, 1]) for (const z of [-12, -18, -30]) {
    if (!gprop('caixa_cobranca', sx * 20.0, z, 1.0)) addBox(1.2, 1.0, 1.2, MAT.caixa, sx * 20.0, 0, z);
    colliders.push({ minX: sx * 20.0 - 0.6, maxX: sx * 20.0 + 0.6, minY: 0, maxY: 1.0, minZ: z - 0.6, maxZ: z + 0.6 });
  }
  // ARARAS de roupa Mint nas laterais
  for (const sx of [-1, 1]) for (const z of [-18, -24, -30]) {
    if (!gprop('arara_roupas', sx * 24, z, 1.7)) addBox(2.4, 1.7, 1.6, MAT.rack, sx * 24, 0, z);
    colliders.push({ minX: sx * 24 - 1.2, maxX: sx * 24 + 1.2, minY: 0, maxY: 1.7, minZ: z - 0.8, maxZ: z + 0.8 });
  }
  // painéis de TV nas paredes laterais (alto, sem collider) — encostados na parede (x=±27.7;
  // antes a 0.8m da parede = "flutuando" visto do spawn B)
  for (const sx of [-1, 1]) for (const z of [-16, -28]) gprop('painel_tvs', sx * 27.7, z, 1.8, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 1.3);

  // LUZ INTERNA DA LOJA (o teto apagava tudo — reclamação do dono): fileiras de painéis
  // de luz emissivos + point lights suaves. Sem collider.
  // v4: a luz de dentro agora é FLUORESCENTE FRIA (era 0xfff0dd, quente igual ao sol —
  // sem contraste, o interior lia como "parte de fora com teto"). Fria dentro + sol quente
  // fora = a troca de temperatura na porta é o que vende "entrei na loja".
  const lightPanel = new THREE.MeshBasicMaterial({ color: 0xeaf2ff });
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf4f8ff });
  const bodyMat = lam({ color: 0xb9c0c8, roughness: 0.34, metalness: 0.65, envMapIntensity: 1.6 });   // calha de alumínio
  for (const z of [-14, -24, -34]) {
    for (const x of [-14, 0, 14]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.6), lightPanel);
      p.rotation.x = Math.PI / 2; p.position.set(x, 6.1, z); p.castShadow = false; deco(p);
    }
    // calhas de tubo corridas atravessando a loja (o "teto de galpão de varejo")
    if (DECO_HI) for (const tz of [z - 2.4, z + 2.4]) {
      const cal = new THREE.Mesh(new THREE.BoxGeometry(2 * SW - 6, 0.16, 0.34), bodyMat);
      cal.position.set(0, 6.05, tz); cal.castShadow = false; deco(cal);
      const tb = new THREE.Mesh(new THREE.BoxGeometry(2 * SW - 6.4, 0.06, 0.2), tubeMat);
      tb.position.set(0, 5.95, tz); tb.castShadow = false; deco(tb);
    }
    // +12%: com o teto agora tapando o sol (ver acima), a fluorescente passou a ser a
    // ÚNICA fonte de dentro — o interior tem que continuar legível pro C1 (silhueta do
    // inimigo contra a gôndola), não virar caverna.
    const pt = new THREE.PointLight(0xcfe0ff, 54, 34, 1.6); pt.position.set(0, 5.4, z); root.add(pt);
  }

  // FECHA OS CORREDORES LATERAIS (x 28..38 ao longo da loja = "corredores sem sentido"):
  // parede na linha da fachada (z=-6) dos dois lados — vira fundo de loja inacessível.
  for (const sx of [-1, 1]) addBox(HALF_X - SW + 1, 5, 1, MAT.wall, sx * (SW + (HALF_X - SW) / 2), 0, SF);

  /* ===================== MEZANINO = O ANDAR DE CIMA DA LOJA =====================
     Pedido literal do dono: "o RESPAWN DE DENTRO DA LOJA tinha q ser NO ANDAR DE CIMA e a
     ESCADA tinha q ser MELHOR FEITA". Antes o time B nascia no térreo (z=-31), entre
     gôndolas, com 36,9 m de linha de visão a partir do estacionamento — o "respawn visível
     de fora" que ele reclamou em rodada anterior (medido em tools/eval/map-check.mjs).
     O mezanino cresceu de 6,4 m para 10,4 m de profundidade pra caber as DUAS coisas que um
     andar de cima precisa ter: um DEPÓSITO fechado (onde o time nasce, sem linha de visão de
     fora) e uma SACADA à frente dele (o perch de sniper que já existia). */
  /* Pé-direito mínimo para um vão contar como andável (chão multinível — ver
     groundHeightAt). 1,95 m = jogador em pé (~1,7 m de olho + folga). Abaixo disso o vão
     existe visualmente mas não é espaço: entrar ali é andar com a cabeça na geometria. */
  const ALTURA_LIVRE = 1.95;
  const MZ = { x0: -14, x1: 14, z0: SB + 0.6, z1: SB + 11, h: 3.4 };          // footprint do mezanino
  /* ESCADA DE VERDADE. O que existia era uma RAMPA com lábios de 10 cm: 10 m de corrida pra
     3,4 m de subida = 19,3°, espelho 20,3 cm, piso 57,8 cm, 2h+p = 98,3 cm (números MEDIDOS
     por raycast na geometria construída, não declarados). Nenhum é de escada — e o
     comentário da rodada anterior dizia "escada real fica entre 30 e 40%" confundindo
     PORCENTO com GRAU: 34% é 18,8°, inclinação de rampa de garagem.
     Agora ela é dimensionada pela NBR 9077 + fórmula de Blondel (2·espelho + piso = 63 cm):
       espelho 17 cm · piso 29 cm · 20 degraus · 2,60 m de largura de vão (2,35 m livres
       entre os corrimãos, que é a medida que a norma cobra e a que a régua mede).
       Inclinação de projeto atan(3,40/5,80) = 30,4°; a régua mede 31,6° porque a corrida
       dela vai do PRIMEIRO ao ÚLTIMO piso e perde meio degrau em cada ponta — os dois
       números descrevem a mesma escada e os dois estão na faixa [25°, 40°].
     E deixou de ser "uma caixa por degrau derivada do groundHeightAt": tem PISO e ESPELHO
     separados, viga lateral (limão), corrimão dos dois lados com montantes e faixa
     antiderrapante no nariz — que é o que faz ler como escada e não como rampa escalonada. */
  const ESC = { larg: 2.60, espelho: 0.17, piso: 0.29, n: 20 };               // n·espelho = 3,40 = MZ.h
  const RAMP = { x0: 8.2, x1: 8.2 + ESC.larg, z0: MZ.z1, z1: MZ.z1 + ESC.n * ESC.piso };
  /* SEGUNDA ESCADA (map_havan.js:827). O mezanino tinha UMA descida — e o depósito tinha
     DUAS portas que desembocavam nela. Ou seja: as duas saídas do respawn eram a mesma
     saída 6 m adiante, e todo caminho do time B pra qualquer bandeira passava pelo mesmo
     degrau. Medido no grafo de navegação (invariante CTF2): 1 rota separada entre o spawn B
     e cada uma das 4 bandeiras, contra as 2 do time P.
     A nova é o ESPELHO da existente (mesmo espelho/piso/largura/inclinação, então a MAP3
     mede as duas contra a mesma NBR 9077), deslocada 0,6 m pra fora do espelho perfeito pra
     não encostar na gôndola de x = −7,4 da fileira z = −27. Cada porta do depósito passa a
     ter a SUA descida, que é o que "duas saídas" queria dizer desde o começo. */
  const RAMP2 = { x0: -11.4, x1: -11.4 + ESC.larg, z0: MZ.z1, z1: MZ.z1 + ESC.n * ESC.piso };
  const RAMPAS = [RAMP, RAMP2];
  /* PROFUNDIDADE DO DEPÓSITO — 4,80 m -> 6,00 m (map_havan.js:828).
     A rodada anterior deixou o respawn do time B numa FRESTA: parede de portas em
     z = MZ.z0+4,8 e uma chicana-parede de 19 m a 1,80 m atrás dela, com os 4 spawns em
     z = −39 — ou seja, 2,6 m de profundidade útil, e as duas fileiras do armário (25 armas,
     z −40,6 e −37,4) em LADOS OPOSTOS da chicana. A régua de exposição (MAP2) ficava 0,0%
     por emparedamento, que é a maneira mais fácil e mais burra de zerá-la.
     Medido na fresta (tools/eval/map-check.mjs, invariante MAP2B): folga até a parede mais
     próxima 0,50 m (o corpo tem 0,38 m de RAIO: nascia-se encostado) e 17,4 m² de chão
     contíguo num raio de 5 m. Agora: 6,60 m de fundura × 28 m de largura, com as duas
     fileiras do armário do MESMO lado e as duas portas nas pontas. A sacada (o perch de
     sniper à frente) cai de 5,60 m para 4,40 m — continua com 1,12 m de circulação atrás
     das gôndolas de cover e 2,05 m na frente delas, contra o guarda-corpo. */
  const DEP_Z = MZ.z0 + 6.0;                                                  // parede de portas do depósito
  addFloor(MZ.x1 - MZ.x0, MZ.z1 - MZ.z0, (MZ.x0 + MZ.x1) / 2, (MZ.z0 + MZ.z1) / 2, MAT.mez, MZ.h + 0.02);  // piso do mezanino
  // BUG FIX (crítico: "gôndola e rifle flutuando na parede do fundo"): o piso do mezanino é
  // um plano single-sided — some visto de baixo (do spawn B) e os props do mezanino flutuam.
  // FASCIA na borda frontal + colunas de suporte = a estrutura lê como mezanino de verdade.
  {
    const mezUnder = new THREE.MeshBasicMaterial({ color: 0xb0b6be });   // unlit: a face de baixo do contrapiso lia como faixa PRETA
    addBox(MZ.x1 - MZ.x0, 0.45, 0.25, mezUnder, (MZ.x0 + MZ.x1) / 2, MZ.h - 0.45, MZ.z1, { collide: false });   // viga de borda
    /* CONTRAPISO SÓLIDO (era collide:false). O piso do mezanino é um `addFloor`, que não
       entra em `occluders` — ou seja, LOS e bala ATRAVESSAVAM a laje: medido, 0,4% dos
       pontos a ≥ 25 m viam a cabeça de quem nascia no depósito atirando de baixo, pelo vão
       lateral (x > 14) e através do piso. O colisor da laje (y 3,28-3,40) não atrapalha
       ninguém — `_collide` só empurra um corpo cujo intervalo [y+0,3 , y+1,5] cruze o do
       colisor, e nem quem anda embaixo (y=0) nem quem anda em cima (y=3,4) cruza. */
    addBox(MZ.x1 - MZ.x0, 0.12, MZ.z1 - MZ.z0, mezUnder, (MZ.x0 + MZ.x1) / 2, MZ.h - 0.12, (MZ.z0 + MZ.z1) / 2);   // contrapiso
    for (const cx of [-9, 9]) {   // colunas até o chão da loja (collider fino)
      addBox(0.28, MZ.h - 0.12, 0.28, MAT.steel, cx, 0, MZ.z1 - 0.2, { collide: false });
      colliders.push({ minX: cx - 0.16, maxX: cx + 0.16, minY: 0, maxY: MZ.h, minZ: MZ.z1 - 0.36, maxZ: MZ.z1 - 0.04 });
    }
  }
  /* GUARDA-CORPO que COLIDE (era collide:false). Um parapeito atravessável é o mesmo defeito
     do pedestal da estátua visto de lado: o corpo do jogador fica DENTRO da geometria (a
     régua MAP1 mede exatamente isso). Ele fecha a borda da frente e as duas laterais, com
     DOIS vãos de propósito: o da ESCADA (por onde se sobe) e um VÃO DE CARGA no meio
     (x ∈ [-3,3]) — sem ele o mezanino teria uma saída só e viraria ratoeira. */
  {
    const GC = (w, cx2, cz, d = 0.2) => addBox(w, 1.0, d, MAT.steel, cx2, MZ.h, cz);
    const gap = [[RAMP2.x0, RAMP2.x1], [-3, 3], [RAMP.x0, RAMP.x1]];   // escada O + vão de carga + escada L
    let x = MZ.x0;
    for (const [g0, g1] of gap) { if (g0 > x) GC(g0 - x, (x + g0) / 2, MZ.z1); x = g1; }
    if (MZ.x1 > x) GC(MZ.x1 - x, (x + MZ.x1) / 2, MZ.z1);
    for (const sx of [MZ.x0, MZ.x1]) GC(0.2, sx, (MZ.z0 + MZ.z1) / 2, MZ.z1 - MZ.z0);   // laterais
  }
  /* DEPÓSITO (o respawn do andar de cima). Parede inteira até a laje com DOIS vãos de porta
     de 2,8 m — quem nasce aqui não tem linha de visão pra loja nem pro estacionamento, e
     tem duas saídas. É este muro que transforma "spawn no andar de cima" em "spawn que não
     é visível de fora": medido, a exposição do time B caiu de 1,5% dos pontos a ≥ 25 m
     (maior visada 36,9 m) para 0,0% (0 m). */
  {
    const PORTA = 2.8;
    const vaos = [[-12.4, -12.4 + PORTA], [12.4 - PORTA, 12.4]];
    let x = MZ.x0;
    for (const [g0, g1] of vaos) {
      if (g0 > x) addBox(g0 - x, 2.8, 0.25, MAT.wall, (x + g0) / 2, MZ.h, DEP_Z);
      x = g1;
    }
    if (MZ.x1 > x) addBox(MZ.x1 - x, 2.8, 0.25, MAT.wall, (x + MZ.x1) / 2, MZ.h, DEP_Z);
    // faixa amarela do estoque: 54 m -> 28 m. Ela era mais LARGA que o mezanino (2·SW−2 = 54
    // contra 28) e sobravam 13 m de fita boiando no ar de cada lado, fora da laje.
    addBox(MZ.x1 - MZ.x0, 0.4, 0.1, MAT.trim, 0, MZ.h + 2.2, DEP_Z + 0.2, { collide: false });

    /* ANTEPARO DAS PORTAS = PORTA-PALETES, NÃO CHICANA (substitui map_havan.js:895).
       O que existia: `addBox(19.0, 2.8, 0.3, MAT.wall, 0, MZ.h, DEP_Z − 1.8)` — uma parede
       cega de 19 m atravessada 1,80 m atrás das portas. Ela zerava a exposição, sim, e
       criava três defeitos de uma vez: (1) o respawn virou uma fresta de 2,6 m; (2) a
       fileira da frente do armário (12 das 25 armas) ficou do LADO DE FORA dela; (3) quem
       entrava por uma porta andava num cano de 1,8 m até dobrar na ponta.
       O que entra no lugar: DOIS porta-paletes (a estante de estoque de verdade — montante,
       longarina, palete e caixa) encostados na parede de portas, um em cada BORDA INTERNA de
       porta (x = ∓9,6), avançando 3,20 m para dentro. Eles fazem a mesma coisa por geometria
       de verdade, e a conta é fechada, não é gosto:
         toda reta que entra por uma porta (x_d ∈ [−12,4 , −9,6], z = DEP_Z) e termina num dos
         4 slots (x_s ∈ [−8 , 5], z = −39) cruza o plano x = −9,6 em
           z = DEP_Z − 3,6·(−9,6 − x_d)/(x_s − x_d),
         cujo pior caso (x_d = −12,4, x_s = −6) é z = −36,98 — dentro do trecho coberto pelo
         porta-palete, que vai até −37,60 (0,62 m de folga). Espelhado no lado +x. O caminho
         continua existindo: entra-se pela porta, anda-se 2,2 m colado na estante e dobra-se
         para dentro — um L, que é o que um depósito de loja tem, e não um cano.
         O comprimento é 2,20 m e não 3,20 m por causa do GRAFO, não da visada: com 3,20 m a
         estante alcançava a fileira de waypoints de z = −38,5 e o depósito ficava sem
         ligação nenhuma com a própria porta no A* — os bots do time B saíam todos pela porta
         oeste (medido: 1 rota separada até cada bandeira, CTF2). Encurtar 1 m devolve a volta
         por trás da estante e mantém 0,62 m de margem na conta da visada.
       Efeito lateral desejado: cada porta ganha um canto cego próprio, então as duas saídas
       deixam de ser intercambiáveis e o defensor tem de escolher qual cobre. */
    for (const sx of [-1, 1]) {
      const cx = sx * 9.6, z0 = DEP_Z - 2.2, z1 = DEP_Z;
      const zc = (z0 + z1) / 2, comp = z1 - z0;
      // montantes (4 colunas de aço) + longarinas (3 níveis) + a carga que ocupa o vão
      for (const oz of [-comp / 2 + 0.2, -comp / 2 + comp / 3, comp / 2 - comp / 3, comp / 2 - 0.2])
        addBox(0.62, 2.8, 0.12, MAT.steel, cx, MZ.h, zc + oz, { collide: false });
      for (const ny of [0.02, 0.95, 1.88]) {
        addBox(0.66, 0.12, comp, MAT.steel, cx, MZ.h + ny, zc, { collide: false });
        // palete + caixaria em cada nível: é a carga que TAPA a visada (a estante vazia não tapa nada)
        addBox(0.60, 0.10, comp - 0.3, MAT.rack, cx, MZ.h + ny + 0.12, zc, { collide: false });
        addBox(0.56, 0.68, comp - 0.4, MAT.goods, cx, MZ.h + ny + 0.22, zc, { collide: false });
      }
      // MASSA SÓLIDA da estante: é ela que a bala e o corpo encontram (addBox com colisão
      // registra colisor E occluder e vai pro root — a peça decorativa acima é `collide:false`
      // e entra no merge estático, que NÃO pode virar occluder: malha mesclada não tem
      // matrixWorld próprio e o raycast leria a posição errada).
      addBox(0.66, 2.8, comp, MAT.rack, cx, MZ.h, zc);
    }

    /* ESTOQUE DE FUNDO — as duas pontas do depósito eram chão liso. Prateleira de 2,20 m
       (acima da linha do olho: 1,62 m) encostada na parede do fundo, nos dois cantos, fora
       do disco de 5 m dos spawns e fora das duas fileiras do armário (z −40,6 e −37,4). */
    for (const sx of [-1, 1]) for (const [cxp, zc] of [[sx * 11.9, MZ.z0 + 0.6]]) {
      addBox(3.4, 2.2, 1.0, MAT.shelf, cxp, MZ.h, zc);
      for (const ny of [0.7, 1.45]) addBox(3.2, 0.55, 0.9, MAT.goods, cxp, MZ.h + ny, zc, { collide: false });
    }
    /* PALETES DE CHÃO (0,90 m) encostados na parede de portas: cobertura de AGACHAR no meio
       do depósito. z = DEP_Z − 0,45 é o único lugar que não briga com nada — a fileira da
       frente do armário fica em z = −37,4 (game.js `_resetPositions`, 1,6 m à frente do
       spawn) e um colisor em cima dela empurraria as armas, que foi como a rodada do
       "critério de alcance a pé" esticou uma fileira de 12,65 m para 17,88 m. */
    for (const [cxp, zc] of [[-3.6, DEP_Z - 0.45], [3.6, DEP_Z - 0.45]]) {
      addBox(1.4, 0.14, 1.2, MAT.rack, cxp, MZ.h, zc, { collide: false });
      addBox(1.3, 0.76, 1.1, MAT.goods, cxp, MZ.h + 0.14, zc, { collide: false });
      colliders.push({ minX: cxp - 0.7, maxX: cxp + 0.7, minY: MZ.h, maxY: MZ.h + 0.9, minZ: zc - 0.6, maxZ: zc + 0.6 });
    }
  }
  /* DEGRAUS: PISO + ESPELHO separados, com o topo de cada piso em MÚLTIPLO EXATO do espelho.
     O chão andável (groundHeightAt) continua sendo uma rampa CONTÍNUA — 20 saltos de 17 cm
     na câmera seria pior que o defeito — mas alinhada com o MEIO de cada piso: o desvio
     entre o pé e o degrau em que se pisa é ≤ 8,5 cm em qualquer ponto da escada (era 11,1 cm
     medido, e 23 cm na versão anterior à anterior). É por isso que o groundHeightAt da rampa
     leva o `+ espelho/2`. */
  for (const R of RAMPAS) {
    const cx = (R.x0 + R.x1) / 2, Z1 = R.z1;
    /* ZEBRA DESFEITA (pedido literal do dono: "as faixas antiderrapantes amarelas e azuis da
       escada nova ficaram zebradas — faixa SÓ NO NARIZ do degrau, discreta").
       A zebra não vinha da faixa: vinha do ESPELHO. Cada espelho era `MAT.wall`, o ACM AZUL
       da fachada, entre um piso cinza e uma faixa amarela — 20 listras azuis e 20 amarelas
       em 5,80 m de corrida. Agora o espelho usa o MESMO cinza do piso (MAT.mez), a escada
       vira uma peça só e sobra UMA marcação: o nariz.
       E a faixa fica discreta: 6 cm -> 4 cm de largura de nariz, e o amarelo saturado
       (0xe8c22a) cede lugar ao amarelo-segurança sujo do piso industrial (0xc9a63e), que é
       o que uma fita antiderrapante gasta de loja realmente é. */
    const antid = lam({ color: 0xc9a63e, roughness: 0.85 });         // fita antiderrapante do nariz
    const limao = lam({ color: 0x8d939b, roughness: 0.7, metalness: 0.3 });   // viga lateral
    for (let k = 1; k <= ESC.n; k++) {
      const yTop = ESC.espelho * k;                                  // topo do piso k (k = n -> piso do mezanino)
      const zc = Z1 - (k - 0.5) * ESC.piso;                          // centro do piso
      const zNariz = Z1 - (k - 1) * ESC.piso;                        // nariz do degrau (face do espelho)
      if (k < ESC.n) addBox(ESC.larg, 0.06, ESC.piso, MAT.mez, cx, yTop - 0.06, zc, { collide: false });
      addBox(ESC.larg, ESC.espelho, 0.04, MAT.mez, cx, yTop - ESC.espelho, zNariz, { collide: false });
      // faixa antiderrapante EMBUTIDA (topo 2 mm acima do piso, não 12 mm): saliente demais
      // ela vira um segundo patamar e a régua MAP3 lê 35 degraus de 10 cm em vez de 20 de 17.
      addBox(ESC.larg, 0.012, 0.04, antid, cx, yTop - 0.010, zNariz - 0.03, { collide: false, cast: false });
    }
    // viga lateral (limão) + corrimão: caixas INCLINADAS, então vão como malha própria
    const ang = Math.atan2(MZ.h, R.z1 - R.z0);                       // 30,4°
    const comp = Math.hypot(MZ.h, R.z1 - R.z0);
    for (const sx of [R.x0 + 0.05, R.x1 - 0.05]) {
      const lm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.42, comp), limao);
      lm.position.set(sx, ESC.espelho / 2 + MZ.h / 2 - 0.16, (R.z0 + R.z1) / 2); lm.rotation.x = ang;
      lm.castShadow = true; deco(lm);
      const cr = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, comp + 0.24), MAT.steel);
      cr.position.set(sx, ESC.espelho / 2 + MZ.h / 2 + 0.95, (R.z0 + R.z1) / 2); cr.rotation.x = ang;
      cr.castShadow = true; deco(cr);
      for (let k = 1; k < ESC.n; k += 4) {                           // montantes do corrimão
        const y = ESC.espelho * k;
        addBox(0.05, 0.95, 0.05, MAT.steel, sx, y, R.z1 - (k - 0.5) * ESC.piso, { collide: false });
      }
    }
    /* COLISOR da escada: o corrimão é INCLINADO e um colisor AABB inclinado não existe —
       então cada lado vira UM colisor vertical fino que fecha a caixa da escada de ponta a
       ponta. Efeito: a escada é um canal de 1,74 m de largura livre (corpo = 0,76 m), não dá
       pra entrar nela de lado atravessando o corrimão, e não dá pra cair dela. */
    for (const sx of [R.x0 - 0.05, R.x1 + 0.05])
      colliders.push({ minX: sx - 0.05, maxX: sx + 0.05, minY: 0, maxY: MZ.h + 1.0, minZ: R.z0, maxZ: R.z1 });
  }
  // MEZANINO MOBILIADO: a SACADA (entre o depósito e o guarda-corpo) é o perch de sniper —
  // é lá que ficam as gôndolas de cover. O painel de TVs e o manequim (estoque) ficam DENTRO
  // do depósito e agora TÊM COLISOR: prop sem colisor sobre chão andável = corpo dentro de
  // sólido, o mesmo defeito do pedestal (invariante MAP1).
  for (const gx of [-8, -2]) {
    const gz = MZ.z1 - 2.6;
    if (!gprop('gondola_eletro', gx, gz, 1.8, Math.PI / 2, MZ.h)) addBox(2.1, 1.8, 1.0, MAT.shelf, gx, MZ.h, gz);
    colliders.push({ minX: gx - 1.05, maxX: gx + 1.05, minY: MZ.h, maxY: MZ.h + 1.8, minZ: gz - 0.55, maxZ: gz + 0.55 });
  }
  /* PAINEL DE TVs: saiu do canto de trás do depósito (era x 6,6-9,4 / z −40,8..−40,2) e foi
     pra face da SACADA da parede de portas. Motivo medido: encostado no fundo ele fechava,
     junto com o anteparo da porta, a única volta que o grafo tinha entre o miolo do depósito
     e a porta leste — a fileira de waypoints de z = −40,2 morria nele e a de −38,5 morria na
     estante. Onde ele está agora ele também faz mais sentido de loja: é a parede de TVs que
     quem está embaixo, na loja, vê acesa lá em cima. */
  gprop('painel_tvs', 0, DEP_Z + 0.45, 1.8, Math.PI, MZ.h + 0.2);
  colliders.push({ minX: -1.4, maxX: 1.4, minY: MZ.h, maxY: MZ.h + 2.0, minZ: DEP_Z + 0.2, maxZ: DEP_Z + 0.7 });
  gprop('manequim', 12, MZ.z0 + 2.5, 1.8, 2.4, MZ.h);
  colliders.push({ minX: 11.7, maxX: 12.3, minY: MZ.h, maxY: MZ.h + 1.8, minZ: MZ.z0 + 2.2, maxZ: MZ.z0 + 2.8 });
  // PAREDE DO FUNDO DA LOJA (crítico: "azul monolítico"): faixa amarela Havan + letreiros
  // de seção + pôsteres de oferta — a fantasia da loja, sem redesenhar o mapa
  {
    addBox(2 * SW - 2, 0.5, 0.1, MAT.trim, 0, 3.85, SB + 0.56, { collide: false });   // faixa amarela
    // LETREIROS DE SEÇÃO: eram 4 canvas de 512×128. Viraram UM atlas 512×512 com as 4
    // faixas empilhadas; cada placa é um clone com repeat (1, 0,25) e offset em V.
    // (V do UV cresce pra cima e a linha 0 do canvas é o topo, daí o 0.75 - i*0.25.)
    const SECOES = [['ELETRO', -19], ['CAMA MESA BANHO', -6], ['MERCADO', 7], ['MODA', 19]];
    const secAtlas = (() => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 512;
      const x = c.getContext('2d');
      x.fillStyle = '#2f3a8c'; x.fillRect(0, 0, 512, 512);
      x.textAlign = 'center'; x.fillStyle = '#f4c020';
      SECOES.forEach(([title], i) => {
        let px = 56; x.font = `bold ${px}px "Arial Black",Impact,sans-serif`;
        while (x.measureText(title).width > 466 && px > 24) { px -= 4; x.font = `bold ${px}px "Arial Black",Impact,sans-serif`; }
        x.fillText(title, 256, i * 128 + 82);
      });
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    // igual aos banners: o recorte do atlas vai pro UV da geometria em vez de virar 4
    // clones de textura + 4 materiais. Um material, um draw call pras 4 placas.
    const secMat = new THREE.MeshBasicMaterial({ map: secAtlas });
    SECOES.forEach(([t2, x], i) => {
      const g = new THREE.PlaneGeometry(10, 1.4), uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setY(k, (0.75 - i * 0.25) + uv.getY(k) * 0.25);
      uv.needsUpdate = true;
      const s = new THREE.Mesh(g, secMat);
      s.position.set(x, 2.55, SB + 0.56); s.castShadow = false; deco(s);
    });
    if (T.posters && T.posters.length) {   // pôsteres de oferta (1 material por textura distinta)
      const pmat = new Map();
      for (let i = 0; i < 4; i++) {
        const tex = T.posters[i % T.posters.length];
        if (!pmat.has(tex)) pmat.set(tex, lam({ map: tex }));
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.0), pmat.get(tex));
        p.position.set(-12.5 + i * 8.4, 1.3, SB + 0.56); p.castShadow = false; deco(p);
      }
    }
  }

  // PISO DA LOJA (crítico: "lê liso sob luz ambiente"): trilhas de rodinha de carrinho nos
  // corredores + AO sob cada fileira de gôndola
  {
    const track = new THREE.MeshBasicMaterial({ color: 0x5a6066, transparent: true, opacity: 0.3 });
    for (const z of [-18, -24, -30]) for (const tx of [-5.4, -0.9, 0.9, 5.4]) {
      const t2 = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 5.4), track);
      t2.rotation.x = -Math.PI / 2; t2.position.set(tx, 0.012, z); t2.castShadow = false; deco(t2);
    }
    const ao = new THREE.MeshBasicMaterial({ color: 0x3a3e44, transparent: true, opacity: 0.28 });
    for (let r = 0; r < 4; r++) {
      const t3 = new THREE.Mesh(new THREE.PlaneGeometry(19, 1.9), ao);
      t3.rotation.x = -Math.PI / 2; t3.position.set(0, 0.011, -15 - r * 6); t3.castShadow = false; deco(t3);
    }
  }

  // ===== ESTACIONAMENTO (z ∈ [-6, HALF_Z]) — v2: o dobro de área =====
  const wZ = HALF_Z + 0.5;
  /* AO DE VÉRTICE NO MURO (BAR §3.1c e critério A1: "queda monotônica de ΔL* ≥ 8 nos
     ~15 cm antes da junção parede–chão"). O muro é a superfície que o jogador mais encosta
     o corpo no mapa e era justamente onde não havia contato nenhum — a parede simplesmente
     encostava no asfalto sem escurecer. Escurecer os vértices de baixo custa ZERO textura e
     ZERO draw call, e ainda devolve o encardido de rodapé que tive que tirar da textura
     (ele repetiria três vezes com repeat.y = 3). */
  const bakeMuroAO = (geo, h) => {
    const pos = geo.attributes.position, n = pos.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = pos.getY(i) + h / 2;                                  // 0 = base do muro
      const k = Math.pow(Math.min(1, y / (h * 0.34)), 0.6);           // só os 34% de baixo
      // amplitude calibrada pelo A1: entre 0 e 15 cm dá ΔL* ≈ 9 num concreto claro
      const v = 0.42 + 0.58 * k;
      col[i * 3] = v; col[i * 3 + 1] = v * 0.99; col[i * 3 + 2] = v * 0.95;   // sombra levemente quente
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  };
  // mesmo mesh, mesmo collider e mesmo occluder do addBox — só a geometria é subdividida
  // em 8 faixas de altura pra o gradiente de AO ter onde interpolar
  const muroBox = (w, h, d, mat, mx, mz) => {
    const geo = new THREE.BoxGeometry(w, h, d, 1, 8, 1); bakeMuroAO(geo, h);
    const m = new THREE.Mesh(geo, mat); m.position.set(mx, h / 2, mz);
    m.castShadow = m.receiveShadow = true; root.add(m);
    // o bakeMuroAO já resolve o LADO DA PAREDE; a saia resolve o lado do ASFALTO — sem os
    // dois o perfil do A1 continua tendo metade da junção chapada
    SKIRT.add(mx, 0, mz, w, d, 0);
    colliders.push({ minX: mx - w / 2, maxX: mx + w / 2, minY: 0, maxY: h, minZ: mz - d / 2, maxZ: mz + d / 2 });
    occluders.push(m); return m;
  };
  muroBox(2 * HALF_X + 2, 3, 1, MAT.muro, 0, wZ);                   // muro do fundo do estacionamento
  muroBox(1, 3, HALF_Z - SF, MAT.muroS, -(HALF_X + 0.5), (wZ + SF) / 2);
  muroBox(1, 3, HALF_Z - SF, MAT.muroS, (HALF_X + 0.5), (wZ + SF) / 2);
  /* FAIXA AZUL HAVAN + FILETE DOURADO: a r1 acertou em pôr a marca no muro e isso fica.
     Só saiu da TEXTURA (onde repetiria 3× na altura) e virou geometria — 6 caixas rasas,
     sem collider, sem cast de sombra, sem textura nenhuma. Sobressai 3 cm da parede, que
     é como faixa pintada sobre rufo lê de verdade. */
  {
    const azul = lam({ color: 0x2f3a8c, roughness: 0.68 });
    const BY = 2.56, BH = 0.44;   // BY = base da faixa; topo bate exatamente no rufo (y=3)
    addBox(2 * HALF_X + 2.16, BH, 1.06, azul, 0, BY, wZ, { collide: false, cast: false });
    addBox(2 * HALF_X + 2.18, 0.08, 1.08, MAT.trim, 0, BY - 0.08, wZ, { collide: false, cast: false });
    for (const sx of [-1, 1]) {
      addBox(1.06, BH, HALF_Z - SF, azul, sx * (HALF_X + 0.5), BY, (wZ + SF) / 2, { collide: false, cast: false });
      addBox(1.08, 0.08, HALF_Z - SF, MAT.trim, sx * (HALF_X + 0.5), BY - 0.08, (wZ + SF) / 2, { collide: false, cast: false });
    }
  }
  /* PICHAÇÃO NO MURO DO ESTACIONAMENTO — ver o bloco `decal` lá em cima pro porquê de ser
     aqui e só aqui. Nos laterais as vagas caem no MEIO do vão entre pilaretes (eles ficam
     em z = -2, 6, 14 … de 8 em 8 e avançam 0,35 m sobre o asfalto): peça centrada em cima
     de um pilarete ficaria com um talho de concreto no meio da arte. */
  for (const x of [-30, -17, -4, 11, 26]) decal(D_MURAL, x, 0.15, wZ - 0.58, Math.PI, 2.3, 5.5);
  for (const z of [2, 18, 34, 50]) decal(D_TAG, -(HALF_X - 0.08), 0.15, z, Math.PI / 2, 2.3, 5.5);
  for (const z of [10, 26, 42]) decal(D_TAG, HALF_X - 0.08, 0.15, z, -Math.PI / 2, 2.3, 5.5);
  /* ADENSAMENTO (dono, 07/08: "70-80% das superfícies, parede branca é desperdício").
     Preenche os vãos ENTRE as vagas grandes acima com escrita menor em duas faixas —
     o passo de 5,3 m intercala com as peças de 5,5 m sem sobrepor, e o pilarete de
     8 em 8 m continua respeitado porque a peça pequena cabe no vão. */
  {
    let hk = 17;
    for (const x of [-27, -21, -11, -8, 4, 8, 18, 23, 29]) {
      const k = (hk = (hk * 2654435761) >>> 0) >>> 8;
      decal(k % 3 === 0 ? D_TAG : D_MURAL, x, k % 2 ? 0.3 : 1.35, wZ - 0.58, Math.PI, 1.5, 2.6);
    }
    for (const z of [6, 12, 22, 28, 38, 44, 47]) {
      const k = (hk = (hk * 2654435761) >>> 0) >>> 8;
      decal(D_TAG, -(HALF_X - 0.08), k % 2 ? 0.3 : 1.3, z, Math.PI / 2, 1.5, 2.6);
      decal(D_TAG, HALF_X - 0.08, k % 3 ? 0.35 : 1.3, z + 3, -Math.PI / 2, 1.5, 2.6);
    }
  }
  // RITMO NO MURO (crítico: "paredão liso" — 64m de parede sem nenhuma quebra de massa):
  // pilaretes salientes a cada 8m + rufo de coroamento. Tudo collide:false: a caixa de
  // colisão do muro continua exatamente a mesma, só a silhueta melhora.
  if (DECO) {
    // rufo de coroamento: era `color` chapado numa faixa de 78 m. Ganha o reboco (clone da
    // MESMA imagem, nenhum canvas novo) pra não virar mais uma barra lisa no topo do frame.
    const cap = lam({ map: reTile(REBOCO_TEX, 26, 1), color: 0xd2cdbd, roughness: 0.85 });
    /* PILARETE — este é o "coluna cinza solta no meio do estacionamento" do relatório:
       `reboco(1,2)` numa face de 0,9 m dá uma mancha branca praticamente uniforme, e como
       o reboco (#f7f4ec) é bem MAIS CLARO que o bloco do muro, ele lia como uma peça de
       outro material largada ali — geometria órfã.
       Correção: é a MESMA alvenaria do muro (clone da textura, repeat calculado pra o
       bloco sair em 40 × 20 cm também numa face de 0,9 m), com um capitel que avança e um
       plinto na base. Vira pilastra do muro, que é o que ela sempre quis ser. */
    const pil = lam({ map: reTile(MURO_TEX, 0.45, 3.1), bumpMap: reTile(MURO_TEX, 0.45, 3.1), bumpScale: 0.4, roughness: 0.93 });
    addBox(2 * HALF_X + 2.4, 0.22, 1.4, cap, 0, 3, wZ, { collide: false });
    for (const sx of [-1, 1]) addBox(1.4, 0.22, HALF_Z - SF, cap, sx * (HALF_X + 0.5), 3, (wZ + SF) / 2, { collide: false });
    // passo maior em quality low: metade dos pilaretes, mesma leitura, metade dos draw calls
    const PSTEP = DECO_HI ? 8 : 16;
    // capitel EM CIMA + plinto EMBAIXO: sem a base, a pilastra "flutua" (critério A2 —
    // todo objeto apoiado precisa de escurecimento encostado no chão) e volta a ler como
    // peça solta. O plinto é o mesmo concreto do rufo, 20 cm mais largo que o fuste.
    for (let pz = SF + 4; pz < wZ; pz += PSTEP) for (const sx of [-1, 1]) {
      addBox(0.5, 3.1, 0.9, pil, sx * (HALF_X - 0.1), 0, pz, { collide: false });
      addBox(0.75, 0.18, 1.15, cap, sx * (HALF_X - 0.1), 3.1, pz, { collide: false });
      addBox(0.66, 0.3, 1.06, cap, sx * (HALF_X - 0.1), 0, pz, { collide: false, cast: false });
    }
    for (let px = -HALF_X + 4; px <= HALF_X - 4; px += PSTEP) {
      addBox(0.9, 3.1, 0.5, pil, px, 0, wZ - 0.4, { collide: false });
      addBox(1.15, 0.18, 0.75, cap, px, 3.1, wZ - 0.4, { collide: false });
      addBox(1.06, 0.3, 0.66, cap, px, 0, wZ - 0.4, { collide: false, cast: false });
    }
  }
  // Estátua da Liberdade (centro do estacionamento — bandeira + marco).
  // ry=-π/2: fica DE COSTAS pra loja, de frente pro spawn do estacionamento (+z).
  // (o GLB de fábrica olha +x; ry=+π/2 virava ela pra loja — confirmado pelo print do dono)
  // Estátua da Liberdade: era 11m (a réplica real da Havan passa de 30m e é O landmark).
  // 15m dá a silhueta de marco sem estourar o sombreamento nem o campo de jogo; o collider
  // acompanha a altura (ela continua tampando bala/visão no miolo do mapa).
  const STAT_H = 15;
  gprop('statue_liberty', 0, 20, STAT_H, -Math.PI / 2) || addBox(3, STAT_H, 3, MAT.trim, 0, 0, 20);
  colliders.push({ minX: -1.5, maxX: 1.5, minY: 0, maxY: STAT_H, minZ: 18.5, maxZ: 21.5 });
  /* PEDESTAL QUE COLIDE (era collide:false nos dois degraus). ESTE é o "os jogadores estão
     SUBMERSOS EMBAIXO DA ESTÁTUA": dois blocos de 0,35 m e 0,60 m de altura sem colisor
     nenhum sobre chão andável, e o groundHeightAt em volta da estátua devolvendo 0 — quem
     andasse até o monumento entrava DENTRO do pedestal até o joelho, e os bots pareciam
     brotar de cima dele. Medido pela sonda vertical da régua MAP1: 48 pontos andáveis com o
     corpo dentro de sólido, penetração de até 0,60 m; todos aqui.
     A correção é o pedestal virar o que ele parece: um bloco sólido. De quebra vira cover de
     0,60 m no miolo do estacionamento, que é o que um monumento com base faz num mapa.
     A bandeira MID saiu de cima dele (ver ctfPoints) — era ela que impedia o pedestal de
     "crescer" e que fazia o anel de captura atravessar a geometria. */
  addBox(7, 0.35, 7, MAT.curb, 0, 0, 20);
  addBox(5.4, 0.6, 5.4, MAT.curb, 0, 0, 20);

  // ===== DEMARCAÇÃO DO ASFALTO (tinta gasta, não caixinha cinza chapada) =====
  // planos finos com alpha furado pelo desgaste. Zero collider, cast:false.
  // ~78 planos de tinta eram ~78 draw calls por 4 imagens. Como nenhum deles se move nem
  // colide, todos vão pro PAINT_BATCH: 4 malhas mescladas (uma por material), mesma tinta
  // na mesma vaga. O renderOrder 1 entra na chave do grupo, então a ordem de blend não muda.
  const paint = (w, d, x, z, mat, ry = 0, y = 0.02) => {
    const g = new THREE.PlaneGeometry(w, d);
    const m = new THREE.Mesh(g, mat); m.rotation.x = -Math.PI / 2; if (ry) m.rotation.z = ry;
    m.position.set(x, y, z); m.renderOrder = 1; m.castShadow = false; m.receiveShadow = false;
    return deco(m, PAINT_BATCH);
  };
  // a mesma tinta em orientações/comprimentos diferentes precisa de repeat próprio, senão
  // o desgaste vira borrão esticado numa linha de 28m. Clone só a textura (mesma imagem).
  const cloneMat = (m, rx, rz) => { const t = m.map.clone(); t.needsUpdate = true; t.repeat.set(rx, rz); return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }); };
  MAT.paintW.map.repeat.set(1, 3);
  const paintWH = cloneMat(MAT.paintW, 16, 1), paintYL = cloneMat(MAT.paintY, 1, 30), paintYH = cloneMat(MAT.paintY, 22, 1);
  const ROWS = [10, 18, 28, 36, 44, 52];
  // linhas de vaga contíguas (7m): compartilham a linha entre vagas vizinhas — Set evita
  // dois planos coplanares no mesmo x (z-fighting).
  const lineX = new Set();
  for (const g of [[-32, -25, -18, -11], [11, 18, 25, 32]]) {
    for (const xc of g) lineX.add(xc - 3.5);
    lineX.add(g[g.length - 1] + 3.5);
  }
  for (const zc of ROWS) {
    for (const lx of lineX) paint(0.14, 5.2, lx, zc, MAT.paintW);
    if (DECO_HI) for (const sx of [-1, 1]) paint(28, 0.14, sx * 21.5, zc + 2.6, paintWH);   // cabeceira da fileira
  }
  // guias amarelas: meio-fio pintado à frente da colunata e nos muros laterais
  paint(2 * SW, 0.3, 0, SF + 3.5, paintYH);
  for (const sx of [-1, 1]) paint(0.3, HALF_Z - SF - 4, sx * (HALF_X - 1.4), (wZ + SF) / 2, paintYL);
  // setas de fluxo no corredor central (dão direção de leitura ao pátio)
  if (DECO_HI) for (const az of [16, 32, 48]) {
    paint(0.42, 2.6, 0, az, MAT.paintW);                                  // haste
    for (const sx of [-1, 1]) paint(0.4, 1.5, sx * 0.42, az + 1.55, MAT.paintW, sx * 0.62);   // ponta da seta
  }
  // QUEBRA-MOLAS zebrado (0.1m: passa por cima, não vira collider nem quebra o A*)
  if (DECO) {
    const zebra = (() => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 16; const x = c.getContext('2d');
      x.fillStyle = '#e8c22a'; x.fillRect(0, 0, 128, 16);
      x.fillStyle = '#26282c'; for (let i = 0; i < 4; i++) x.fillRect(i * 32, 0, 16, 16);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); return t;
    })();
    const zm = lam({ map: zebra, roughness: 0.85 });
    for (const bz of [23, 41]) addBox(19, 0.1, 0.75, zm, 0, 0, bz, { collide: false, cast: false });
  }
  // manchas de óleo: gradiente radial (a borda dura do CircleGeometry lia como "adesivo").
  // As 7 manchas eram 7 canvas com EXATAMENTE o mesmo gradiente — agora um material só;
  // a variação já vinha do tamanho e da rotação do plano, não da imagem.
  {
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const cx = c.getContext('2d');
    const g = cx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(14,15,18,0.85)'); g.addColorStop(0.55, 'rgba(20,22,26,0.45)'); g.addColorStop(1, 'rgba(20,22,26,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, S, S);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const oilMat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
    for (const [x, z, r, sd] of [[-14, 26, 1.9, 1], [8, 40, 1.3, 2], [22, 16, 2.1, 3], [-26, 46, 1.5, 4], [4, 8, 1.2, 5], [-19, 12, 1.6, 6], [30, 38, 1.4, 7]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2 * (0.7 + (sd % 3) * 0.15)), oilMat);
      p.rotation.x = -Math.PI / 2; p.rotation.z = sd; p.position.set(x, 0.016, z); p.renderOrder = 1;
      p.castShadow = false; p.receiveShadow = false; deco(p, PAINT_BATCH);
    }
  }
  // CARRINHOS DE COMPRAS espalhados + baia de devolução (a assinatura de estacionamento
  // de loja: carrinho abandonado atravessado na vaga)
  const carts = [[-20, 48, 0], [24, 12, 0.8], [-30, 30, 2.1], [15.5, 24, 1.4], [-8.5, 34, 0.3], [27, 47, 2.6]];
  if (DECO_HI) carts.push([-15.5, 15, 1.9], [33, 29, 0.5], [-3.5, 47, 2.2], [20, 55, 1.1]);
  for (const [cx, cz, cry] of carts) gprop('shopping_cart', cx, cz, 1.0, cry);
  if (DECO) for (const [bx, bz] of [[-8.5, 30], [8.5, 42]]) {   // baia: dois trilhos + placa
    for (const sx of [-1, 1]) addBox(0.12, 1.1, 5, MAT.steel, bx + sx * 1.3, 0, bz, { collide: false });
    addBox(2.8, 0.12, 0.12, MAT.steel, bx, 1.1, bz - 2.4, { collide: false });
  }
  // CARROS: grade de vagas nos dois lados, contornando a estátua e o caminho central.
  // Usa a SELEÇÃO da partida (12 modelos leves sorteados por seed — ver havanCarSelection).
  let ci = 0;
  const carPool = havanCarSelection();
  const parkSpots = [];
  let _spot = 0;
  for (const zc of [10, 18, 28, 36, 44, 52]) for (const xc of [-32, -25, -18, -11, 11, 18, 25, 32]) {
    if (Math.hypot(xc, zc - 20) < 9) continue;   // deixa espaço ao redor da estátua
    /* FLANCOS DO RESPAWN P LIVRES. A fileira de waypoints mais ao norte é z = 52,8 (a grade
       de 3,4 m termina em HALF_Z−2 = 56 e o último múltiplo é 52,8), e os spawns estão em
       z = 55: ou seja, TUDO que sai do respawn P passa por essa fileira. Com carro em
       (±11, 52) a coluna x = ∓12,2 caía dentro do colisor inflado e sobrava UMA coluna útil
       (x = ∓8,8) — todo caminho do time P nascia pela mesma porta. Medido: 1 rota separada
       até a bandeira LOJA L (CTF2). Duas vagas VAZIAS aqui (com a tinta de demarcação à
       mostra, que é conteúdo que já existe) valem mais que dois carros. */
    if (zc === 52 && Math.abs(xc) === 11) continue;
    // GATE DE QUALIDADE (item 5 da auditoria de custo): em 'low' o pátio fica com METADE
    // dos carros, em xadrez — continua lendo como estacionamento cheio, com metade da
    // geometria. As vagas vazias mostram a tinta de demarcação, que é conteúdo que já existe.
    if (LOWQ && (_spot++ % 2)) continue;
    parkSpots.push([xc, zc]);
  }
  for (const [x, z] of parkSpots) {
    const id = carPool[ci % carPool.length]; ci++;
    const ry = (z > 28 ? 0 : Math.PI) + (RY_FIX[id] || 0) + (Math.random() - 0.5) * 0.12;   // fileiras retas, quase alinhadas
    placeCar(id, x, z, ry);
    colliders.push({ minX: x - 1.2, maxX: x + 1.2, minY: 0, maxY: 1.4, minZ: z - 2.2, maxZ: z + 2.2 });  // collider do carro
  }
  /* MAIS CARROS NO PÁTIO (pedido do dono: "enchemos o estacionamento de mais carros ...
     assim o mapa fica mais preenchido e utilizável"). +14 carros, net +12 (duas vagas do
     flanco do respawn P ficaram vazias de propósito — ver o laço da grade acima).
     ONDE, e por quê exatamente aqui: a grade de vagas já está no LIMITE de empacotamento —
     fileiras a cada 8 m com carro de 4,4 m de comprimento dão 3,6 m de corredor. A primeira
     versão desta rodada enfiou fileiras intercaladas a 4 m das vizinhas: os colisores se
     sobrepunham 0,40 m e a planta mostrava uma PAREDE contínua de carro de z 8 a z 54 em
     |x| = 25 e 32. Carro dentro de carro não é "mais preenchido", é bug.
     Os dois lugares que estavam realmente vazios são:
       • a faixa da FRENTE, z ∈ [−6, 8], entre a fachada da loja e a 1ª fileira (z = 3, com
         2,6 m de corredor para a fileira de z = 10);
       • as duas faixas LATERAIS, |x| ∈ [33, 38], entre a última coluna de vagas e o muro
         (x = ±35,5, três carros por lado, espaçados 16 m — não fecham a faixa). */
  for (const [xc, zc] of [[-32, 3], [-25, 3], [-18, 3], [-11, 3], [11, 3], [18, 3], [25, 3], [32, 3]]) {
    if (LOWQ && ((xc + zc) % 7 < 3)) continue;   // mesmo gate de qualidade da grade principal
    const id = carPool[ci++ % carPool.length];
    const ry = Math.PI + (RY_FIX[id] || 0) + (Math.random() - 0.5) * 0.12;
    placeCar(id, xc, zc, ry);
    colliders.push({ minX: xc - 1.2, maxX: xc + 1.2, minY: 0, maxY: 1.4, minZ: zc - 2.2, maxZ: zc + 2.2 });
  }
  /* Os 6 das faixas laterais entram ENCOSTADOS no muro (nariz pra parede) e com colisor
     QUADRADO de 4,4 × 4,4 m. Não é preguiça: o `ry` de cada carro leva o `RY_FIX` DO MODELO
     (uns GLB nascem girados 90°) e a faixa lateral só tem 4,8 m de largura — com o colisor
     retangular de sempre (2,4 × 4,4, comprimento no eixo z) um modelo girado ficava com 2 m
     de carroceria PARA FORA do colisor, sobre chão que continuava andável. Medido pela
     invariante MAP1: 2 pontos com o corpo dentro do carro em (−33,5 , 13,5) e (−33,5 , 14,5),
     penetração 0,825 m. O colisor quadrado cobre a maior dimensão do carro em QUALQUER
     rotação — 4,4/2 = 2,2 m contra 2,1 m de meia-carroceria. */
  for (const [xc, zc] of [[-35.5, 14], [-35.5, 30], [-35.5, 46], [35.5, 14], [35.5, 30], [35.5, 46]]) {
    if (LOWQ && ((xc + zc) % 7 < 3)) continue;
    const id = carPool[ci++ % carPool.length];
    placeCar(id, xc, zc, (xc < 0 ? -Math.PI / 2 : Math.PI / 2) + (RY_FIX[id] || 0));
    colliders.push({ minX: xc - 2.2, maxX: xc + 2.2, minY: 0, maxY: 1.4, minZ: zc - 2.2, maxZ: zc + 2.2 });
  }
  // CARROS NA FAIXA CENTRAL (G2-R14B, pedido do dono): pares escalonados no corredor
  // x∈[-7,7] entre o spawn do estacionamento e a loja — quebram a lane aberta de tiro.
  // Cover baixo (h=1.4 < 1.6: LOS spawn↔spawn segue 0) e escalonado: o miolo x∈[-3.3,3.3]
  // e os flancos ficam livres pro A* (vãos ≥4m).
  for (const [cx, cz] of [[-5, 8], [5, 13], [-5, 26], [5, 31], [-5, 38], [5, 43]]) {
    const id = carPool[ci++ % carPool.length];
    const ry = (cz > 28 ? 0 : Math.PI) + (RY_FIX[id] || 0) + (Math.random() - 0.5) * 0.12;
    placeCar(id, cx, cz, ry);
    colliders.push({ minX: cx - 1.2, maxX: cx + 1.2, minY: 0, maxY: 1.4, minZ: cz - 2.2, maxZ: cz + 2.2 });
  }
  // ônibus urbanos no fundo do estacionamento (marco + cover grande)
  for (const bx of [-28, 28]) {
    if (!gprop('onibus_urbano', bx, 50, 2.8, 0.05)) addBox(2.9, 2.8, 7.6, MAT.trim, bx, 0, 50);
    colliders.push({ minX: bx - 1.5, maxX: bx + 1.5, minY: 0, maxY: 2.8, minZ: 46.1, maxZ: 53.9 });
  }
  // POSTES DE LUZ — antes eram addBox(0.4,4,0.4) cinza puro: a tal "coluna solta flutuando
  // no meio do estacionamento" da crítica era isto (um paralelepípedo sem luminária, sem
  // base, sem braço, do nada). O tronco de colisão continua o MESMO (0.4×4, collider +
  // occluder idênticos); tudo que foi somado é collide:false.
  const poleMat = lam({ color: 0x53595f, roughness: 0.30, metalness: 0.80, envMapIntensity: 1.7 });   // poste galvanizado: cilindro = risco de sol vertical
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xdfe7f2 });
  for (const [x, z] of [[-34, 22], [34, 22], [-34, 46], [34, 46], [-14, 54], [14, 54], [-14, 34], [14, 34]]) {
    addBox(0.4, 4, 0.4, poleMat, x, 0, z);                                  // tronco (collider/LOS inalterados)
    if (!DECO) continue;
    addBox(0.9, 0.35, 0.9, MAT.curb, x, 0, z, { collide: false });          // sapata de concreto
    const up = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 2.6, 8), poleMat);
    up.position.set(x, 5.3, z); up.castShadow = true; deco(up);             // continuação afinando
    const dir = x < 0 ? 1 : -1;                                             // braço aponta pro pátio
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.5, 6), poleMat);
    arm.rotation.z = dir * Math.PI / 2.6; arm.position.set(x + dir * 0.62, 6.5, z); arm.castShadow = true; deco(arm);
    addBox(0.9, 0.2, 0.42, poleMat, x + dir * 1.25, 6.55, z, { collide: false });   // luminária
    const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.36), lampMat);
    bulb.rotation.x = Math.PI / 2; bulb.position.set(x + dir * 1.25, 6.54, z); bulb.castShadow = false; deco(bulb);
  }

  // ===== RÉPLICA DA CASA BRANCA (gabarito: toda Havan tem uma ao lado da Estátua) =====
  // CENÁRIO PURO: fica FORA do muro (x≈-58), collide:false e sem collider algum — não entra
  // no A*, não bloqueia bala, não muda o campo de jogo. Só existe como marco no horizonte.
  if (DECO_HI) {
    const CW = { x: -72, z: 18 };   // bem fora do muro (x=-38.5): o pátio dela não pode invadir o asfalto
    // TEX1: os dois brancos da Casa Branca eram cor chapada em painéis de 132 e 150 m² —
    // eram eles os "retângulos brancos grandes e lisos" mais visíveis do horizonte do mapa.
    const wh = lam({ color: 0xf2efe6, roughness: 0.8, map: reTile(GESSO_TEX, 6, 6) });
    const whRoof = lam({ color: 0xd8d4c6, roughness: 0.85, map: reTile(GESSO_TEX, 6, 6) });
    addFloor(46, 40, CW.x, CW.z, MAT.patio, 0.02);                             // terreno/pátio
    addBox(24, 7.5, 11, wh, CW.x, 0, CW.z, { collide: false });                // corpo central
    for (const sx of [-1, 1]) addBox(9, 5.5, 8, wh, CW.x + sx * 16, 0, CW.z, { collide: false });   // alas
    addBox(25, 0.6, 12, whRoof, CW.x, 7.5, CW.z, { collide: false });          // platibanda
    for (const sx of [-1, 1]) addBox(9.5, 0.5, 8.5, whRoof, CW.x + sx * 16, 5.5, CW.z, { collide: false });
    // pórtico: 6 colunas + frontão, virado pro estacionamento (+x)
    const px0 = CW.x + 12.4;
    for (let i = 0; i < 6; i++) {
      const cz = CW.z - 4.5 + i * 1.8;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 7.2, 10), wh);
      col.position.set(px0, 3.6, cz); col.castShadow = true; deco(col);
    }
    addBox(2.2, 0.7, 12, whRoof, px0, 7.2, CW.z, { collide: false });
    const tri = new THREE.Shape(); tri.moveTo(-6, 0); tri.lineTo(6, 0); tri.lineTo(0, 2.2); tri.closePath();
    const fr = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.6, bevelEnabled: false }), wh);
    fr.rotation.y = Math.PI / 2; fr.position.set(px0 + 1.1, 7.9, CW.z); fr.castShadow = true; deco(fr);
    // rotunda + cúpula rasa no miolo (a leitura de "Casa Branca" vem daqui de longe)
    const rot = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 2.4, 20), wh);
    rot.position.set(CW.x, 9.2, CW.z); rot.castShadow = true; deco(rot);
    // hemisfério inteiro achatado: a calota parcial anterior lia como uma "foice" flutuando
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), whRoof);
    dome.scale.y = 0.72; dome.position.set(CW.x, 10.4, CW.z); dome.castShadow = true; deco(dome);
    const lant = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 1.8, 10), wh);   // lanternim
    lant.position.set(CW.x, 13.6, CW.z); lant.castShadow = true; deco(lant);
  }

  // ===== luz / céu / névoa leve =====
  // CONTRASTE SOL x INTERIOR: o sol era 0xffffff e a fluorescente 0xfff0dd (quente) — as
  // duas iguais, sem troca de temperatura na porta. Agora sol QUENTE de meio-dia brasileiro
  // + rebote do asfalto quente vindo de baixo, contra a fluorescente FRIA lá dentro.
  scene.background = T.sky || new THREE.Color(0x9fb8cc);
  /* NÉVOA R9: linear 85→210 era o mesmo que NÃO TER névoa — o estacionamento inteiro cabe
     dentro dos primeiros 85 m, então nenhum pixel do mapa jogável recebia um grama de haze
     e o muro do fundo lia com o MESMO microcontraste do meio-fio a 3 m. Agora FogExp2
     ρ = 0,0088: 6,7 % a 30 m, 24 % a 60 m, 54 % a 100 m e 92 % a 180 m. A cor-base saiu de
     0xb9c8d2 (chute) pro azul MEDIDO do céu logo acima da silhueta do muro, que é o que
     apaga a aresta; o calor volta pelo termo de contraluz. ?nofog=1 / ?fog2=0. */
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('loja_h');
  /* RAZÃO SOL/HEMI (item 8 da revisão; alvo: ΔL* sol↔sombra ≥ 26 no asfalto).
     Estava sol 1,65 / hemi 1,15 — razão 1,43. Com o sol quase a pino (elevação ~65°, ou
     seja N·L ≈ 0,90 no chão), o asfalto iluminado ficava só ~3,1× a sombra, que depois do
     ACES vira ΔL* na casa dos 20: sombra "lavada", o mapa inteiro num degrau de valor só.
     Agora 2,02 / 0,82 → razão 2,46 e ~4,9× de contraste no chão, que cai perto de ΔL* 30.
     O hemi NÃO vai a zero de propósito: o A3 proíbe sombra chapada em preto, e a sombra
     precisa continuar azulada (A6) — ela ainda recebe hemi + o IBL do PMREM do game.js.
     Meio-dia de cidade média brasileira é exatamente isto: sombra curta, dura e legível. */
  const hemi = new THREE.HemisphereLight(0xcfe0f5, 0x6d6455, 0.82); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d2, 2.02); sun.position.set(18, 55, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(_q === 'low' ? 1024 : 2048, _q === 'low' ? 1024 : 2048); sun.shadow.camera.left = -60; sun.shadow.camera.right = 60; sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60; sun.shadow.camera.far = 200; sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ===== ground height (mezanino elevado + rampa) =====
  function groundHeightAt(x, z, yRef) {
    /* LIMITES INCLUSIVOS nas bordas que se ENCOSTAM (MZ.z1 == RAMP.z0). Com `<` e `>`
       estritos sobrava um FURO de medida zero exatamente em z = MZ.z1, onde a função
       devolvia 0 entre dois patamares de 3,4 m. No jogo é um ponto que quase nunca é
       pisado; em toda régua discreta ele é fatal — o flood-fill de andabilidade (grade de
       0,25 m, que caía justamente em z = -35,00) não subia UMA célula no mezanino por causa
       dele, e o andar de cima aparecia como inalcançável a pé.
       O `+ ESC.espelho/2` na rampa põe o chão andável no MEIO de cada piso da escada: é o
       que limita o desvio pé↔degrau a meio espelho (8,5 cm) em vez de um espelho inteiro. */
    /* ── CHÃO MULTINÍVEL (04/08) ────────────────────────────────────────────────
       Defeito do dono: "não dá pra andar debaixo das escadas do respawn da loja".

       Por que era impossível ANTES: esta função devolvia UM Y por (x, z). Dentro da
       pegada da escada o chão ERA a escada, na altura dela — não existia "embaixo" para
       o motor. E como `tryAxis` (game.js) trata subida acima de STEP_H como parede, andar
       do piso em direção ao vão dava numa parede invisível na boca da escada.

       O QUE MUDA: a função passa a aceitar `yRef` — o Y de quem está perguntando — e
       responde "qual superfície é o SEU chão", escolhendo entre as camadas daquele ponto.
       Sem `yRef` ela devolve a camada mais alta, que é exatamente o comportamento antigo:
       toda régua e todo chamador que ainda não passa o Y continuam funcionando igual.

       PÉ-DIREITO É PARTE DA REGRA, não detalhe: só vale descer para a camada de baixo se
       couber gente em pé ali (ALTURA_LIVRE). Sem isso o jogador entraria embaixo do
       primeiro degrau — 17 cm de vão — e andaria com a cabeça dentro da escada. É por isso
       que só o fundo da escada abre: perto do piso ela é baixa demais, e lá o motor
       continua mandando subir. */
    /* ── SEGUNDA RODADA (05/08): O VÃO DA ESCADA NÃO TINHA PORTA ─────────────────
       A correção anterior abriu a camada 0 SÓ debaixo das escadas, e o teste numérico
       confirmou: jogador em y=0 sob a parte alta recebe chão 0. No jogo continuava
       impossível — e o defeito não era nenhum dos suspeitos óbvios (não é colisor: o
       contrapiso mora em y 3,28-3,40 e o `_collide` não morde quem anda em y=0; não é
       o `yRef`, que o `_updatePlayer` passa nos três lugares; não é o step-up).

       Era a PEGADA: reproduzido andando com o `_updatePlayer` de verdade, o único
       acesso ao vão da escada é POR BAIXO DO MEZANINO — e a pegada do mezanino não
       tinha camada nenhuma. `groundHeightAt` devolvia 3,40 para todo mundo dentro de
       (x −14..14, z −41,4..−31), inclusive para quem anda no piso da loja em y=0.
       Ou seja: o bolsão que a rodada passada abriu (16,3 m² sob as duas escadas) era
       um quarto lacrado, e havia uma parede invisível de 28 m de largura na linha
       z = −31, cortando a loja em duas.

       MEDIDO no harness (o mesmo `_updatePlayer` que o jogador usa):
         · 294,0 m² de piso de loja inalcançáveis sob a laje;
         · 9 gôndolas (18 colisores, y 0-1,80) desenhadas nesse piso, que nenhum
           jogador jamais alcançou;
         · andando reto de z = −22 para o fundo, o corpo subia a escada e parava
           colado em z = −34,89 (dentro da laje), nunca em y=0.

       A CORREÇÃO é a mesma regra, aplicada à laje: o mezanino é uma PLATAFORMA, e
       plataforma com pé-direito tem chão embaixo. `MZ_SOB` é a face de baixo do
       contrapiso (MZ.h − 0,12 = 3,28 m), bem acima do ALTURA_LIVRE de 1,95. */
    const MZ_SOB = MZ.h - 0.12;
    const camadas = [];   // do mais baixo para o mais alto
    let topo = 0;
    if (x > MZ.x0 && x < MZ.x1 && z >= MZ.z0 && z <= MZ.z1) {
      topo = MZ.h;
      if (MZ_SOB >= ALTURA_LIVRE) camadas.push(0);
    }
    for (const R of RAMPAS)
      if (x >= R.x0 && x <= R.x1 && z >= R.z0 && z <= R.z1) {
        const h = Math.min(MZ.h, ESC.espelho / 2 + MZ.h * Math.max(0, Math.min(1, (R.z1 - z) / (R.z1 - R.z0))));
        topo = Math.max(topo, h);
        if (h >= ALTURA_LIVRE) camadas.push(0);   // há vão utilizável DEBAIXO desta escada
      }
    if (yRef == null || !camadas.length) return topo;

    /* Escolha da camada: a mais alta que o corpo alcança de um passo (STEP_TOL, o mesmo
       0,55 m do step-up do game.js). Quem está no piso fica no piso e passa por baixo;
       quem já está na escada continua na escada. Empate nunca acontece porque as camadas
       aqui diferem por pelo menos ALTURA_LIVRE. */
    const STEP_TOL = 0.55;
    let melhor = camadas[0];
    for (const c of [...camadas, topo]) if (c <= yRef + STEP_TOL && c > melhor) melhor = c;
    return melhor;
  }

  // ===== waypoints + A* =====
  const nodes = [], adj = [], STEP = 3.4;
  const blocked = (x, z, inf) => { const g = groundHeightAt(x, z); for (const c of colliders) { if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < g + 1.6 && c.maxY > g + 0.15) return true; } return false; };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  // ADENSAMENTO NA RAMPA: com STEP 3,4 m só 2 nós caíam sobre uma rampa de 6 m — dois pontos
  // não fazem caminho. Rampa precisa de passo proporcional à inclinação (mesma conclusão do
  // protótipo em tools/mapdesign/favela.py: escada a 1,1 m contra rua a 3,4 m).
  /* 1,7 m -> 0,8 m: a escada nova tem 2,60 m de largura (era 6,00) e 5,80 m de corrida (era
     10,00), e o corrimão virou colisor. Com passo 1,7 sobrava UMA coluna de nós dentro do
     canal livre de 1,74 m — uma fila de pontos não é grafo. Com 0,8 são 3 colunas × 7
     fileiras dentro da escada. */
  /* O laço vai até `R.z1 + 2.4`, ou seja, 2,4 m ALÉM do último degrau, já no piso da loja.
     Motivo medido: a grade grossa de 3,4 m não tem coluna nenhuma alinhada com a boca da
     escada nova (os x da grade são −12,2 e −8,8; o canal da escada é [−11,4 , −8,8]), e a
     aresta que ligaria o pé da escada ao nó de fora ATRAVESSA o colisor do corrimão — o
     `segClear` a rejeita, com razão. Resultado antes: a escada O tinha 21 waypoints e ZERO
     ligação para baixo; o A* do time B descia toda partida pela escada L, do outro lado do
     mezanino, e a régua CTF2 media 1 rota separada. Com o desembarque em frente à escada, o
     grafo sai dela pela FRENTE, que é por onde se sai de uma escada. */
  const RSTEP = 0.8;
  for (const R of RAMPAS)
    for (let gx = R.x0 + RSTEP / 2; gx < R.x1; gx += RSTEP)
      for (let gz = R.z0 + RSTEP / 2; gz < R.z1 + 2.4; gz += RSTEP)
        if (!blocked(gx, gz, 0.35)) nodes.push({ x: gx, z: gz });
  // ADENSAMENTO NO MEZANINO: o andar de cima tem 28 × 10,4 m e é onde o time B nasce. Com o
  // STEP de 3,4 m do térreo, o depósito (4,8 m de fundura) ganhava 1 fileira de nós e as
  // portas de 2,8 m caíam entre dois nós — o A* saía do spawn andando em linha reta.
  for (let gx = MZ.x0 + 1.2; gx < MZ.x1; gx += 1.7)
    for (let gz = MZ.z0 + 1.2; gz < MZ.z1; gz += 1.7)
      if (!blocked(gx, gz, 0.35)) nodes.push({ x: gx, z: gz });
  // TETO POR DEGRAU, não por subida TOTAL. A forma antiga comparava cada amostra com o ponto
  // inicial `a` — isto é, limitava o desnível ACUMULADO da aresta inteira a 0,7 m, o que
  // travava a inclinação em 0,7/3,4 = 20,6% por mais suave que a rampa fosse. Comparando
  // amostra com amostra (0,57 m entre elas), 0,30 m de degrau libera rampa contínua de até
  // ~53% e continua barrando parede: parede aparece como salto de METROS entre vizinhas.
  const segClear = (a, b) => {
    /* AMOSTRAGEM DE PASSO FIXO (era sempre 6 amostras, qualquer que fosse o comprimento).
       Com 6 amostras numa aresta de 3,4 m o espaçamento é 0,57 m — e numa escada de 30,4°
       isso dá 0,33 m de desnível ENTRE AMOSTRAS, acima do teto de 0,30 m: a escada nova
       seria rejeitada inteira pelo próprio teto que existe pra barrar parede. Fixando o
       espaçamento em 0,28 m o teste passa a medir a INCLINAÇÃO (0,16 m por amostra na
       escada) e não o comprimento da aresta, e ainda apalpa `blocked` mais vezes. */
    const passos = Math.max(6, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.28));
    let hp = groundHeightAt(a.x, a.z);
    for (let i = 1; i <= passos; i++) {
      const t = i / passos, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (blocked(x, z, 0.25)) return false;
      const h = groundHeightAt(x, z);
      if (Math.abs(h - hp) > 0.30) return false;
      hp = h;
    }
    return true;
  };
  for (let i = 0; i < nodes.length; i++) { adj.push([]); for (let j = 0; j < nodes.length; j++) { if (i === j) continue; const dx = nodes[i].x - nodes[j].x, dz = nodes[i].z - nodes[j].z; if (dx * dx + dz * dz < STEP * STEP * 2.4 && segClear(nodes[i], nodes[j])) adj[i].push(j); } }
  function nearestWaypoint(x, z) { let b = 0, bd = 1e9; for (let i = 0; i < nodes.length; i++) { const dx = nodes[i].x - x, dz = nodes[i].z - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; b = i; } } return b; }
  const _D = (a, b) => { const dx = nodes[a].x - nodes[b].x, dz = nodes[a].z - nodes[b].z; return Math.sqrt(dx * dx + dz * dz); };
  function findPath(fromIdx, toIdx) {
    if (fromIdx === toIdx) return [toIdx];
    const n = nodes.length, g = new Float32Array(n).fill(Infinity), f = new Float32Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), open = new Uint8Array(n);
    g[fromIdx] = 0; f[fromIdx] = _D(fromIdx, toIdx); open[fromIdx] = 1; let oc = 1;   // sem o open[fromIdx] o A* falha SEMPRE (bots andavam em linha reta!)
    while (oc > 0) { let cur = -1, bf = Infinity; for (let i = 0; i < n; i++) if (open[i] && f[i] < bf) { bf = f[i]; cur = i; } if (cur === -1) break;
      if (cur === toIdx) { const p = [cur]; let c = prev[cur]; while (c !== -1) { p.unshift(c); c = prev[c]; } return p; }
      open[cur] = 0; oc--; for (const m of adj[cur]) { const t = g[cur] + _D(cur, m); if (t < g[m]) { prev[m] = cur; g[m] = t; f[m] = t + _D(m, toIdx); if (!open[m]) { open[m] = 1; oc++; } } } }
    return [fromIdx];
  }

  // spawns: Time B (B) DENTRO da loja ATRÁS da última gôndola (cover da fileira);
  // o outro time (P) no estacionamento, flanqueado por carros (cover dos veículos).
  const spawns = {
    /* B NASCE NO ANDAR DE CIMA, DENTRO DO DEPÓSITO (pedido literal do dono). Era z=-31 no
       térreo, entre gôndolas. O slot 0 vai em x=0 de propósito: o armário do spawn é
       ancorado nele (game.js `_resetPositions`, `cx = spawns[0].x`) e uma fileira de 13
       armas com passo 1,15 m tem 13,8 m — centrada em x=0 ela cabe inteira nos 28 m do
       mezanino; ancorada em x=-10 metade dela cairia pela borda, no térreo. */
    /* os 4 slots ficam ATRÁS do trecho CHEIO da parede do depósito (x ∈ [-9,6 , 9,6]), nunca
       na frente de uma porta: medido, o slot em x=-12 (dentro do vão de 2,8 m) era visto de
       14,0% dos pontos a ≥ 25 m e tinha 103 m de linha de tiro limpa — a bala entrava pela
       porta do depósito, atravessava a loja e saía no estacionamento. Os outros três, atrás
       da parede cheia, estavam em 0,9-1,5%. */
    /* [0, −5, 5, −8] -> [0, −6, 6, 3]. O slot em x = −8 era o que MANDAVA no comprimento do
       anteparo das portas: quanto mais perto de −9,6 (a borda interna da porta oeste) fica o
       spawn mais fundo a estante precisa entrar pra tapar a reta, e com −8 ela precisava de
       3,2 m, o que estrangulava o grafo (ver o bloco DEPÓSITO). Com |x| ≤ 6 a conta fecha em
       2,2 m. Continua simétrico e continua com o slot 0 em x = 0, que é onde o armário das 25
       armas se ancora (game.js `_resetPositions`, `cx = spawns[0].x`). */
    B: [0, -6, 6, 3].map(x => ({ x, z: MZ.z0 + 2.4, yaw: 0 })),        // depósito do mezanino
    E: [-8, -3, 3, 8].map(x => ({ x, z: HALF_Z - 3, yaw: Math.PI })), // fundo do estacionamento
  };
  // carros de proteção do spawn P (flanqueiam a bandeira ESTACIONAMENTO, fora do anel).
  // G2-R6B: linha alargada (±13) + carro de frente (0, 44.5) — o respawn do estacionamento
  // nasce atrás de uma BARREIRA de veículos (cover físico imediato; A* contorna, h=1.4
  // não interfere no LOS spawn↔spawn que já é 0).
  /* ±13 -> ±14,5 nos carros de fora (map_havan.js:1531). A barreira continua a mesma coisa
     (5 carros, mesmos vãos de 4,6 m entre eles), mas a COLUNA de waypoints de x = ∓12,2 —
     a única que existe entre o carro de fora e o de dentro na grade de 3,4 m — deixa de cair
     dentro do colisor inflado do carro. Sem ela o respawn do estacionamento tinha UMA saída
     útil no grafo (x = ∓8,8) e todo caminho do time P começava por ela: medido, 1 rota
     separada até a bandeira LOJA L (invariante CTF2). */
  for (const [cx, cz, cry] of [[-6, 50.5, 0.1], [6, 50.5, -0.1], [-14.5, 50.5, 0.06], [14.5, 50.5, -0.06], [0, 44.5, 0.04]]) {
    const id = carPool[ci++ % carPool.length];
    placeCar(id, cx, cz, Math.PI + cry);
    colliders.push({ minX: cx - 1.2, maxX: cx + 1.2, minY: 0, maxY: 1.4, minZ: cz - 2.2, maxZ: cz + 2.2 });
  }
  // 3 bandeiras: estacionamento, estátua, gôndolas (corredor central da loja)
  /* 3 bandeiras — DISTRIBUÍDAS, não enfileiradas. As três estavam em x=0: a mesma reta que
     liga o spawn do estacionamento ao spawn da loja. Duas consequências MEDIDAS:
       • altura do triângulo das bandeiras = 0,00 m. Com as três colineares, o caminho mais
         curto entre as duas pontas ATRAVESSA o anel do meio (raio 4,5 m) — é literalmente o
         "os bots da loja ficam todos na bandeira do meio" que o dono reclamou: o A* que vai
         de uma base à outra passa dentro da zona de captura central.
       • a do estacionamento ficava a 5,83 m do spawn P e a das gôndolas a 7,00 m do spawn B
         (menos que o raio de captura + o corpo): dava pra capturar de dentro do respawn.
       • a do meio estava CRAVADA na estátua (0,20): 0,0 m de linha de tiro limpa medida —
         ninguém conseguia atirar nela — e o anel de captura atravessava o pedestal, que é o
         "anel rosa cortando a geometria" dos prints.
     Agora: uma em cada quadrante, nenhuma na linha central, todas fora do pedestal e a
     ≥ 12 m do spawn mais próximo (medido: 21,5 / 28,3 / 17,2 m; altura do triângulo 14,5 m). */
  /* 3 -> 4 BANDEIRAS, DUAS DE CADA LADO (pedido literal do dono, palavra por palavra):
       "ao invés de ter UMA BANDEIRA NO MEIO DA LOJA colocamos UMA BANDEIRA DE CADA LADO. a
        mesma coisa no estacionamento: ao invés de ter uma bandeira NA ESTÁTUA, ... bandeiras,
        UMA DE CADA LADO, assim o mapa fica mais preenchido e utilizável, e O MEIO CONTINUA
        SENDO O CAMINHO PRINCIPAL mas aí os bots e jogadores têm mais opções de jogar."
     A leitura de projeto é direta: bandeira no EIXO é bandeira que todo mundo disputa no
     mesmo metro quadrado. Com uma de cada lado, o eixo central deixa de ser o único destino
     e passa a ser o que o dono quer que ele seja — o TRÂNSITO entre os dois lados.
     Onde ficam:
       LOJA O / LOJA L  (±20,5 , −24): dentro dos corredores laterais novos, o que dá função
         às portas de canto e aos 13 m de loja que eram vazio de cenário.
       PÁTIO O / PÁTIO L (±21,5 , 32): nas faixas livres entre as colunas de vaga (x livre
         [19,2 , 23,8], z livre [30,2 , 33,8]), fora do eixo do estacionamento.
     A da ESTÁTUA sai (era a "do meio"), e a antiga ESTACIONAMENTO (−19, 41) vira a PÁTIO O.
     Altura mínima do triângulo entre as 4: 32,8 m de projeto (raio de captura 4,5). */
  const ctfPoints = [
    { id: 'PO', label: 'PÁTIO O', x: -21.5, z: 32 },
    { id: 'PL', label: 'PÁTIO L', x: 21.5, z: 32 },
    { id: 'BO', label: 'LOJA O', x: -20.5, z: -24 },
    { id: 'BL', label: 'LOJA L', x: 20.5, z: -24 },
  ];

  // arsenal: rifles nas gôndolas/loja, snipers no mezanino, pistolas nos spawns
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, groundHeightAt(x, z) + 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  ['ak', 'm4', 'mp5', 'shotgun'].forEach((k, i) => place(k, -9 + i * 6, -13));
  /* snipers NO CHÃO (dono: não dá pra subir no mezanino/mesa pra pegar). "z fora do footprint
     do mezanino -> groundHeightAt=0 -> chão, alcançável" era VERDADE pela metade: fora do
     footprint tem chão, sim, mas `MZ.z0 - 3.5` = z −44,9 cai ATRÁS do muro do fundo da loja
     (o colisor {x −28..28, z −42,5..−41,5} de map_havan.js:881) — um BOLSÃO FECHADO. Medido
     por flood-fill de andabilidade a partir dos spawns dos dois times (tools/eval/pickup-check.mjs):
     26.412 células andáveis lá dentro, 0 alcançadas; a célula alcançável mais próxima da awp
     ficava a 9,81 m. Nenhum jogador e nenhum bot jamais pegou estas duas armas.
     Passaram despercebidas porque as duas réguas antigas davam VERDE: o grafo TEM waypoints
     no bolsão (a 0,92 m da awp), só que numa componente desconexa; e a reta do spawn até lá
     não cruza o muro, cruza o vão ao lado dele.
     CORREÇÃO, o menor deslocamento que resolve: a mesma ideia ("no chão, rente ao mezanino,
     fora do footprint"), só que pela borda da FRENTE (MZ.z1, lado da loja) em vez da de trás
     (MZ.z0, lado do muro). z: −44,9 -> −34,5 (10,40 m); x intocado (5 e −6). Medido depois:
     distância ao chão alcançado = 0,00 m nas duas. */
  place('awp', 5, MZ.z1 + 0.5); place('m400', -6, MZ.z1 + 0.5);
  /* DUAS ARMAS NOS CANTOS NOVOS DA LOJA. Duas razões, nesta ordem:
     (1) o dono vetou reduzir o número de armas no chão, e apagar a praça clássica levou as 2
         que ela tinha — estas duas devolvem o total de 246 sem mexer em mapa nenhum vivo;
     (2) corredor lateral sem motivo continua vazio por mais gôndola que se ponha nele. Loot
         é o motivo: quem entra pela porta de canto agora pega uma arma no caminho.
     x = ±20,7 é o meio do corredor externo (livre entre 19,23 e 22,80) e z = −22 cai entre as
     ilhas de promoção (z −18 e −30), longe de qualquer colisor. */
  place('mp5', -20.7, -22); place('deagle', 20.7, -22);
  /* estacionamento. Era `-25 + i*10` = x −25/−15/−5/5/15/25 — e três desses x caem DENTRO de
     um carro: as vagas de map_havan.js:1024 ficam em x ±11/±18/±25/±32 (colisor ±1,2 m) e o
     par da faixa central de map_havan.js:1042 põe mais um carro em (5, 43). Medido: deagle
     (x −25), shotgun (x 5) e awp (x 25) ficavam a 1,75 m do chão andável mais próximo — fora
     até do raio de 1,7 m com que o bot coleta andando por cima (game.js `_updatePickups`).
     Agora os 6 x são CENTROS DE FAIXA entre as vagas (±7,5 / ±14,5 / ±21,5): deslocamento
     máximo 3,5 m, simetria preservada, e distância ao chão alcançado = 0,00 m nos seis. */
  ['deagle', 'ak', 'm4', 'shotgun', 'mp5', 'awp'].forEach((k, i) => place(k, [-21.5, -14.5, -7.5, 7.5, 14.5, 21.5][i], 44));

  // saia de contato: todas as bases registradas viram UMA malha mesclada = 1 draw call
  SKIRT.build(root);
  /* MERGE + INSTANCING (têm que rodar DEPOIS de todo mundo registrar).
     Ordem importa só pro PAINT_BATCH: ele carrega renderOrder 1 e materiais transparentes,
     e sai da mesma forma que os planos individuais saíam. */
  DECO_BATCH.build(root);
  PAINT_BATCH.build(root);
  PROPS.build(root);
  PROPS_LOJA.build(root);

  /* ═══ PASSADA DE GRAFITE (07/08) ══════════════════════════════════════════
     Pedido literal do dono: "na loja h seria em todo estacionamento no muro e na
     estátua". As 35 peças à mão cobriam a fachada da loja e paravam ali.
     A passada mira dos waypoints do estacionamento, e a Estátua da Liberdade entra
     sozinha: ela é malha vertical no caminho do raio como qualquer muro. Nada de
     caso especial pra ela — caso especial é o que não sobrevive à próxima mudança. */
  grafitar({
    id: 'loja_h',
    root, T, waypoints: nodes, seed: 5501, passo: 1.0, alcance: 9, cobre: 0.06, minLarg: 0.32,
    /* SÓ DO LADO DE FORA (dono, 07/08: "pode tirar os graffitis de dentro da loja,
       pode deixar só na parte de fora que ficou boa"). O interior da loja é z < -6;
       74% das peças do mapa estavam lá dentro, e 7 dos 8 murais de homenagem também.
       O corte fica em -6,4 pra que a FACHADA (z ≈ -6, virada pro estacionamento)
       continue pichada — ela é a parte de fora, e é a que ele aprovou.
       Declarado aqui e só aqui: a `graffiti-census` lê esta mesma zona do layout
       assado, senão ela cobraria pra sempre tinta de parede que ninguém quer. */
    limpo: [{ x0: -1e4, x1: 1e4, z0: -1e4, z1: -6.4 }],
    bandas: [
      /* CARTAZ DA COLEÇÃO (07/08). Reprovação: "tem diversos posters da minha coleção
         e tb que vc gerou que não estão em nenhum mapa". Eram 30 arquivos vivendo em
         2 dos 5 mapas, e mesmo nesses só ~6 entravam por rodada (a vaga era fixa).
         Aqui eles entram como lambe-lambe: banda do olho, tamanho de papel colado, e
         `chance` baixa de propósito — cartaz é tempero, parede de cartaz vira outdoor. */
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 22, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.35, y1: 2.6, larg: 3.6, alturas: [2.1, 1.55, 1.1, 0.8],
        pool: D_TAG.concat(D_MURAL) },
      { y0: 2.5, y1: 5.2, larg: 4.8, alturas: [2.3, 1.6, 1.1],
        pool: D_MURAL.concat(D_TAG) },
      { y0: 0.35, y1: 3.0, larg: 1.6, alturas: [0.9, 0.65, 0.45], planura: 0.5,
        pool: D_TAG },
    ],
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 29, separacao: 15 },
  });

  return {
    root, colliders, occluders, decalSolids: [root], groundHeightAt, spawns, sun, hemi, pickups, doors, ctfPoints,
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    /* DECLARAÇÃO PRA RÉGUA (tools/eval/map-check.mjs) — não é usada pelo jogo.
       `stairs` diz ONDE fica a escada; o perfil (espelho, piso, largura, inclinação) é
       MEDIDO por raycast na geometria construída, então declarar errado não maquia nada:
       a medida some e a invariante MAP3 fica vermelha. `levels` diz qual patamar precisa
       ser ALCANÇADO a pé e pelo A* — é o que transforma "tem um mezanino" em "dá pra subir
       no mezanino", que foi o defeito real (o mezanino era uma ILHA no grafo). */
    stairs: [{ nome: 'escada L do mezanino', x0: RAMP.x0, x1: RAMP.x1, z0: RAMP.z0, z1: RAMP.z1, topo: MZ.h },
      { nome: 'escada O do mezanino', x0: RAMP2.x0, x1: RAMP2.x1, z0: RAMP2.z0, z1: RAMP2.z1, topo: MZ.h }],
    levels: [{ nome: 'mezanino', x0: MZ.x0, x1: MZ.x1, z0: MZ.z0, z1: MZ.z1, dePartida: 'P' }],
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
