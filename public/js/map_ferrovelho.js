// Ferro Velho do Zé (ferro_velho) — CTF 4 bandeiras, v2 LABIRINTO. P spawna no PORTÃO (sul),
// B no GALPÃO (norte). O pátio é um labirinto de MUROS DE CARROS EMPILHADOS (wall_of_cars) e
// fileiras de carros prensados (crushed_classic) — scans reais texturizados, corredores ≥5m.
// 4 bandeiras: portão, beco oeste, pátio leste, galpão. Contrato buildWorld + A*.
// v3 BECO OESTE (08/2026): o flanco oeste vira o CÂNION da imagem-conceito do dono — muros
// DUPLOS de carros (~5,6 m) contínuos de z=+33 a z=-25, placa suspensa na boca sul, bandeira
// W no miolo do beco. ?beco=0 restaura o layout antigo. Props otimizados de /Users/ruben/glb
// (tools/optimize-static.mjs).
import * as THREE from 'three';
import { placeProp } from './mapprops.js';
import { VAO_BANDS, aoBoxGeo, aoMatFactory, ContactSkirt, BASE_FLOATING, onGround } from './vao.js';
import { makeAerialFog } from './bloom.js';   // névoa exponencial + cor por direção do olhar
import { detailFor } from './textures.js';   // normal+rough por Sobel (ver lam)
import { decalIds, paredeAtras, caixaGirada } from './map_decals.js';   // pool por NOME + raycast de parede
import { grafitar, esconderSeFaltar } from './graffiti_pass.js';                         // cobertura medida, não coordenada à mão
import { setMapSky } from './map_sky.js';
import { createFavelaAmbience } from './ambientlife.js';

// kill-switches (padrão do projeto): ?nofog=1 sem névoa, ?rays=0 sem god rays,
// ?dust=0 sem poeira em suspensão, ?mato=0 sem vegetação invasora.
const QP = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
// quality vem do localStorage (o buildFerroVelho recebe só scene+T; game.js não passa
// settings). 'low' = notebook fraco: cortamos contagem de painéis, mato e partículas.
const LOWQ = (() => { try { return JSON.parse(localStorage.getItem('awpbr_settings') || '{}').quality === 'low'; } catch (e) { return false; } })();
// BECO OESTE (08/2026): flanco oeste vira o cânion da imagem-conceito do dono. ?beco=0
// restaura o layout antigo (padrão kill-switch do projeto, segue o modelo do ?rack=old).
const BECO = QP.get('beco') !== '0';

const HALF_X = 32, HALF_Z = 36;
export const FERRO_PROPS = [
  // pilhas/máquinas Mint estilizadas (substituem os photoscans que destoavam + pesavam)
  'muro_carros', 'fileira_carros', 'monte_carros', 'guindaste', 'prensa_carros', 'pilha_pneus',
  // wrecks unitários (scans escuros — leem bem no tema)
  'abandoned_car', 'broken_car', 'broken_car_2', 'carro_danificado', 'destroyed_car', 'junk_car',
  // miúdos
  'dumpster', 'jersey_barrier', 'sandbags', 'concrete_roadblock',
];
const SINGLES = ['abandoned_car', 'broken_car', 'carro_danificado', 'junk_car'];   // destroyed_car/broken_car_2 = scans pretos brilhantes ("blob" do crítico) — fora

// ----- texturas canvas ricas (sem low-poly flat: manchas, rachaduras, óleo, pedras) -----
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
  if (opts.cracks) {   // rachaduras: polilinhas escuras finas
    x.strokeStyle = opts.cracks; x.globalAlpha = 0.35; x.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      let px = rnd() * S, py = rnd() * S; x.beginPath(); x.moveTo(px, py);
      for (let j = 0; j < 5; j++) { px += (rnd() - 0.5) * 46; py += (rnd() - 0.5) * 46; x.lineTo(px, py); }
      x.stroke();
    }
  }
  if (opts.pebbles) {  // pedrinhas/pontos claros
    for (let i = 0; i < (opts.pebbleN || 240); i++) { x.globalAlpha = 0.25 + rnd() * 0.3; x.fillStyle = rnd() > 0.5 ? opts.pebbles : base; x.fillRect(rnd() * S, rnd() * S, 1.6, 1.6); }
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
}
// ZINCO GALVANIZADO — a assinatura nº1 do ferro velho (BAR §4.4). A versão antiga era
// marrom-chocolate e lia como madeira/ferrugem chapada; o gabarito pede chapa
// CINZA-AZULADA onde ainda tem zinco, MANCHADA DE BRANCO-GIZ (óxido de zinco) e
// CORROÍDA NA BASE, onde encosta na terra molhada. A ondulação é vertical: é ela que
// pega o specular anisotrópico do sol rasante de fim de tarde.
function zincTex(rx, rz, seed = 71, opts = {}) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const period = opts.period || 16, rustAmt = opts.rust == null ? 1 : opts.rust;
  const hi = opts.hi || '#b3bec4', mid = opts.mid || '#8d99a1', lo = opts.lo || '#5f6a72';
  for (let i = 0; i * period < S; i++) {   // ondas: claro na crista, escuro no vale
    const g = x.createLinearGradient(i * period, 0, (i + 1) * period, 0);
    g.addColorStop(0, lo); g.addColorStop(0.28, mid); g.addColorStop(0.5, hi); g.addColorStop(0.74, mid); g.addColorStop(1, lo);
    x.fillStyle = g; x.fillRect(i * period, 0, period, S);
  }
  // manchas de branco-giz (óxido de zinco) — o que diferencia galvanizada de aço pintado
  for (let i = 0; i < 34; i++) {
    x.globalAlpha = 0.14 + rnd() * 0.3; x.fillStyle = rnd() > 0.35 ? '#e2e6e0' : '#c6ccc6';
    const r = 6 + rnd() * 26;
    x.beginPath(); x.ellipse(rnd() * S, rnd() * S, r, r * (0.3 + rnd() * 0.9), rnd() * 3.14, 0, 6.3); x.fill();
  }
  // escorrimento vertical de sujeira a partir dos rebites/emendas
  x.globalAlpha = 1;
  for (let i = 0; i < 20 * rustAmt; i++) {
    const px = rnd() * S, py = rnd() * S * 0.6;
    const g = x.createLinearGradient(0, py, 0, py + 40 + rnd() * 90);
    g.addColorStop(0, `rgba(126,72,38,${0.30 + rnd() * 0.35})`); g.addColorStop(1, 'rgba(126,72,38,0)');
    x.fillStyle = g; x.fillRect(px, py, 2 + rnd() * 5, 40 + rnd() * 90);
  }
  // CORROSÃO NA BASE: gradiente laranja subindo do rodapé + pitting (furos)
  if (rustAmt > 0) {
    const g = x.createLinearGradient(0, S * 0.58, 0, S);
    g.addColorStop(0, 'rgba(150,74,30,0)'); g.addColorStop(0.6, `rgba(150,74,30,${0.4 * rustAmt})`); g.addColorStop(1, `rgba(96,44,20,${0.82 * rustAmt})`);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 46 * rustAmt; i++) {
      x.globalAlpha = 0.35 + rnd() * 0.5; x.fillStyle = rnd() > 0.4 ? '#7a3a18' : '#2c1a10';
      const r = 1.5 + rnd() * 5; x.beginPath(); x.arc(rnd() * S, S * (0.7 + rnd() * 0.3), r, 0, 6.3); x.fill();
    }
  }
  // emendas horizontais (chapas de origens diferentes, sobrepostas)
  x.globalAlpha = 0.35; x.fillStyle = '#3c4348';
  for (const yy of [S * 0.34, S * 0.71]) x.fillRect(0, yy, S, 2);
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
}
// FIBROCIMENTO ondulado cinza (telhado do barraco — BAR §4.4 pede fibrocimento, não zinco):
// onda mais larga e macia, cinza-esverdeado, com limo/lodo escuro nas juntas.
function fibroTex(rx, rz, seed = 907) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i * 21 < S; i++) {
    const g = x.createLinearGradient(i * 21, 0, (i + 1) * 21, 0);
    g.addColorStop(0, '#6e726c'); g.addColorStop(0.5, '#a3a69d'); g.addColorStop(1, '#63665f');
    x.fillStyle = g; x.fillRect(i * 21, 0, 21, S);
  }
  for (let i = 0; i < 30; i++) {   // limo e poeira
    x.globalAlpha = 0.12 + rnd() * 0.28; x.fillStyle = rnd() > 0.5 ? '#4d5a42' : '#3e423c';
    const r = 5 + rnd() * 22; x.beginPath(); x.ellipse(rnd() * S, rnd() * S, r, r * 0.5, 0, 0, 6.3); x.fill();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
}
// ALVENARIA DE BLOCO CERÂMICO SEM REBOCO (BAR §4.4: o barraco do Zé não é pintado) —
// bloco vermelho-terra com os 6 furos, junta de argamassa cinza mal passada e escorrido.
function blocoTex(rx, rz, seed = 449) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#8d8377'; x.fillRect(0, 0, S, S);                  // argamassa
  const bw = S / 2, bh = S / 4;
  for (let r = 0; r < 4; r++) for (let k = -1; k < 2; k++) {
    const bx = k * bw + (r % 2 ? bw / 2 : 0) + 3, by = r * bh + 3;
    const v = rnd();
    x.fillStyle = `rgb(${150 + v * 46 | 0},${86 + v * 34 | 0},${58 + v * 26 | 0})`;
    x.fillRect(bx, by, bw - 6, bh - 6);
    x.fillStyle = 'rgba(40,26,20,0.55)';                            // furos do bloco
    for (let h = 0; h < 3; h++) for (let g = 0; g < 2; g++) x.fillRect(bx + 8 + h * (bw - 24) / 3, by + 10 + g * (bh - 26) / 2, (bw - 30) / 3, (bh - 30) / 2);
  }
  for (let i = 0; i < 40; i++) {   // sujeira/limo escorrido
    x.globalAlpha = 0.1 + rnd() * 0.25; x.fillStyle = rnd() > 0.55 ? '#4a4436' : '#2f2a24';
    x.fillRect(rnd() * S, rnd() * S, 3 + rnd() * 9, 20 + rnd() * 70);
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
}
// barril (azul desbotado c/ faixa + ferrugem no fundo)
function barrelTex() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  let seed = 83; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#3a5a8c'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${30 + rnd() * 60 | 0},${50 + rnd() * 40 | 0},${100 + rnd() * 40 | 0},${0.2 + rnd() * 0.3})`; x.fillRect(rnd() * S, rnd() * S, 3 + rnd() * 10, 2 + rnd() * 6); }
  x.fillStyle = 'rgba(230,225,210,0.75)'; x.fillRect(0, 26, S, 10);   // faixa
  const g = x.createLinearGradient(0, S * 0.6, 0, S);   // ferrugem subindo do fundo
  g.addColorStop(0, 'rgba(120,60,30,0)'); g.addColorStop(1, 'rgba(120,60,30,0.75)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// decal de mancha (óleo/poeira) — alpha radial irregular
function blobTex(r, g, b, aMax, seed = 101) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 7; i++) {
    const px = S / 2 + (rnd() - 0.5) * 50, py = S / 2 + (rnd() - 0.5) * 50, rr = 18 + rnd() * 34;
    const gr = x.createRadialGradient(px, py, 2, px, py, rr);
    gr.addColorStop(0, `rgba(${r},${g},${b},${aMax})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr; x.beginPath(); x.arc(px, py, rr, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/* ===================================================================================
   FERRUGEM EM 3 ESTÁGIOS + TINTA CALCINADA (BAR §4.4 — "usar todos os três, senão
   fica chapado"). Estágio por PEÇA (seed pelo índice), nunca a mesma textura em tudo:
     0 — laranja VIVO e granulado: corrosão ativa, recente.
     1 — marrom-avermelhado ESCURO com crostas escamando.
     2 — VÉU alaranjado fino sobre metal ainda claro (o único que ainda reflete).
   `paint` = tinta original MORTA, verniz totalmente ido: vermelho vira ROSA-SALMÃO,
   azul vira CINZA-AZULADO LEITOSO. Ela nunca vem sozinha — vem com escorrimento de
   ferrugem descendo de cada parafuso e dobra, que é o que "cola" a tinta na chapa.
   =================================================================================== */
/* R3 — DESSATURAÇÃO MEDIDA DA FERRUGEM (critério C2).
   O sol do ferro velho é 0xffd39a (S 0,40) e o composite do bloom.js aplica sat 1,12:
   albedo quente × luz quente COMPÕE croma. Medido: albedo S 0,81 no estágio 0 saía a
   S 0,82 na tela, e o pátio inteiro ficava acima de S 0,55 — com tudo saturado, nada
   é saturado, e a bandeira de captura deixa de significar alguma coisa.
   Os valores abaixo mantêm o MATIZ de cada estágio (é o hue que faz o contraste
   ferrugem × mato de que fala o BAR §4.4) e cortam ~55 % do croma; os estágios escuros
   também SOBEM de valor, porque em HSV pixel escuro infla S artificialmente.
   Alvo por estágio na tela (previsto em tools/eval/r3_sim.py): 0 → S 0,48 · 1 → S 0,53 ·
   2 → S 0,18. Nenhum passa de 0,55.
   Kill-switch: ?ferrosat=1 devolve a paleta quente da r2 (ferrugem E terra), pra A/B
   direto na captura. Custo zero: é hex, não muda canvas, draw call nem shader — por isso
   não há degradação separada em quality 'low'. */
const FERRO_SAT_HOT = new URLSearchParams(location.search).get('ferrosat') === '1';
const RUST_STAGE = FERRO_SAT_HOT ? [
  { base: '#a3541f', blot: [['#c1702c', 44, 6, 26, 0.55], ['#d98a38', 30, 4, 16, 0.5], ['#7c3c14', 26, 5, 20, 0.5], ['#e8a55c', 22, 2, 8, 0.45]], grain: 820, rough: 0.98, metal: 0.05 },
  { base: '#4a281a', blot: [['#371d12', 38, 8, 30, 0.6], ['#6a3a20', 30, 6, 22, 0.5], ['#8c4a24', 18, 4, 14, 0.45], ['#241410', 20, 5, 18, 0.5]], crust: true, rough: 0.95, metal: 0.1 },
  { base: '#9aa2a4', blot: [['#8b9396', 26, 10, 30, 0.45], ['#b8571f', 30, 3, 12, 0.32], ['#c98f4e', 16, 8, 26, 0.22], ['#6f7679', 14, 5, 16, 0.35]], veil: 'rgba(190,105,42,0.24)', rough: 0.62, metal: 0.45 },
] : [
  // 0 — corrosão ativa: continua sendo o mais LARANJA dos três (hue 26), só não é mais neon
  { base: '#a8866f', blot: [['#c19d7f', 44, 6, 26, 0.55], ['#d9b998', 30, 4, 16, 0.5], ['#7a6152', 26, 5, 20, 0.5], ['#e8cbac', 22, 2, 8, 0.45]], grain: 820, rough: 0.98, metal: 0.05 },
  // 1 — crosta escura: valor sobe de 0,29 para 0,43 (era o campeão de S: em HSV, pixel
  //     escuro infla saturação, então dessaturar sem clarear não resolvia)
  { base: '#6e5d54', blot: [['#594e47', 38, 8, 30, 0.6], ['#8c786c', 30, 6, 22, 0.5], ['#a68c79', 18, 4, 14, 0.45], ['#4d423f', 20, 5, 18, 0.5]], crust: true, rough: 0.95, metal: 0.1 },
  // 2 — véu fino sobre metal claro: já era o estágio dessaturado; só o véu e a mancha
  //     laranja perdem croma pra não reintroduzir o pico que os outros dois abriram mão
  { base: '#9aa2a4', blot: [['#8b9396', 26, 10, 30, 0.45], ['#b08a6f', 30, 3, 12, 0.32], ['#c9ae91', 16, 8, 26, 0.22], ['#6f7679', 14, 5, 16, 0.35]], veil: 'rgba(176,132,102,0.24)', rough: 0.62, metal: 0.45 },
];
// tinta calcinada: vermelho→rosa-salmão, azul→cinza-azulado leitoso, amarelo/verde/bege gizados
const PAINT_DEAD = ['#c98d84', '#93a5ae', '#c3ab63', '#8ea38a', '#bfae9d', '#b06e63'];

/* HASH DE AVALANCHE (xorshift-multiply, estilo murmur finalizer).
   PORQUÊ: o sorteio de estágio usava `(i * 40503) % 3` e 40503 = 3 × 13501 — ou seja, é
   DIVISÍVEL POR 3 e o resultado dava SEMPRE 0. Na prática TODAS as carcaças saíam no
   estágio "laranja vivo": exatamente o "chapado" que o BAR §4.4 manda evitar e o que a
   medição de D2 acusou. Um multiplicador sozinho não embaralha bit baixo; misturar os
   bits altos de volta (xor-shift + imul) distribui os 3 estágios quase uniformemente e
   continua 100% determinístico (mesmo pátio a cada boot). */
function mix32(n) {
  let v = (n * 2654435761) >>> 0;
  v ^= v >>> 15; v = Math.imul(v, 2246822519) >>> 0;
  v ^= v >>> 13; v = Math.imul(v, 3266489917) >>> 0;
  return (v ^ (v >>> 16)) >>> 0;
}

function rustStageTex(stage, seed = 7, paint = null, rx = 1, rz = 1) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const P = RUST_STAGE[stage % 3];
  x.fillStyle = P.base; x.fillRect(0, 0, S, S);
  for (const [col, n, rMin, rMax, a] of P.blot) {
    x.fillStyle = col;
    for (let i = 0; i < n; i++) {
      x.globalAlpha = a * (0.5 + rnd() * 0.5);
      const r = rMin + rnd() * (rMax - rMin);
      x.beginPath(); x.ellipse(rnd() * S, rnd() * S, r, r * (0.4 + rnd() * 0.8), rnd() * 3.14, 0, 6.3); x.fill();
    }
  }
  if (P.grain) {   // granulado da corrosão ativa: o estágio 1 é o mais "areia grossa"
    // R3: grão dessaturado junto com a base (era '#e6a45c' / '#6d3312')
    for (let i = 0; i < P.grain; i++) { x.globalAlpha = 0.18 + rnd() * 0.4; x.fillStyle = rnd() > 0.5 ? '#e6c9aa' : '#755d50'; x.fillRect(rnd() * S, rnd() * S, 1.4, 1.4); }
  }
  if (P.crust) {   // crostas escamando: polígono claro com borda escura levantada
    for (let i = 0; i < 34; i++) {
      const px = rnd() * S, py = rnd() * S, r = 4 + rnd() * 13;
      x.globalAlpha = 0.5 + rnd() * 0.35; x.fillStyle = '#856a5a';   // R3: crosta dessaturada
      x.beginPath();
      for (let k = 0; k < 6; k++) { const an = k / 6 * 6.28, rr = r * (0.6 + rnd() * 0.6); const fx = px + Math.cos(an) * rr, fy = py + Math.sin(an) * rr; k ? x.lineTo(fx, fy) : x.moveTo(fx, fy); }
      x.closePath(); x.fill();
      x.globalAlpha = 0.6; x.strokeStyle = '#2a2220'; x.lineWidth = 1.4; x.stroke();   // R3: borda menos preta (A3)
    }
  }
  if (P.veil) { x.globalAlpha = 1; x.fillStyle = P.veil; x.fillRect(0, 0, S, S); }   // véu fino uniforme
  // TINTA CALCINADA: manchas grandes de tinta morta, bordas lascadas, giz por cima
  if (paint) {
    for (let i = 0; i < 7; i++) {
      x.globalAlpha = 0.62 + rnd() * 0.3; x.fillStyle = paint;
      const px = rnd() * S, py = rnd() * S, r = 26 + rnd() * 52;
      x.beginPath();
      for (let k = 0; k < 11; k++) { const an = k / 11 * 6.28, rr = r * (0.55 + rnd() * 0.65); const fx = px + Math.cos(an) * rr, fy = py + Math.sin(an) * rr; k ? x.lineTo(fx, fy) : x.moveTo(fx, fy); }
      x.closePath(); x.fill();
    }
    x.globalAlpha = 0.18; x.fillStyle = '#e8e4dc';   // calcinação: pó de giz sobre a cor
    for (let i = 0; i < 90; i++) { const r = 3 + rnd() * 12; x.beginPath(); x.arc(rnd() * S, rnd() * S, r, 0, 6.3); x.fill(); }
  }
  // ESCORRIMENTO a partir de parafusos/dobras — presente em todos os estágios
  x.globalAlpha = 1;
  for (let i = 0; i < 12; i++) {
    const px = 8 + rnd() * (S - 16), py = 10 + rnd() * (S * 0.55);
    x.globalAlpha = 0.55; x.fillStyle = '#2a1710';
    x.beginPath(); x.arc(px, py, 2.2 + rnd() * 1.6, 0, 6.3); x.fill();   // parafuso
    const g = x.createLinearGradient(0, py, 0, py + 50 + rnd() * 90);
    g.addColorStop(0, 'rgba(146,110,88,0.75)'); g.addColorStop(1, 'rgba(146,110,88,0)');   // R3: escorrimento dessaturado
    x.globalAlpha = 1; x.fillStyle = g; x.fillRect(px - 2, py, 4 + rnd() * 3, 50 + rnd() * 90);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, rz); return t;
}

/* ===================================================================================
   PLACA PINTADA À MÃO — elemento identitário OBRIGATÓRIO do BAR §4.4.
   "A característica formal do letreiramento vernacular brasileiro é o distanciamento
   de convenções tipográficas, com pouco ou nenhum respeito por entrelinha, hierarquia
   de espaços e dimensões" — baseline irregular, letras que APERTAM no fim da linha,
   espacejamento desigual. Uma fonte digital limpa e centralizada REPROVA no critério.
   Por isso NADA de fillText de linha inteira: cada letra é desenhada individualmente
   com jitter próprio de baseline, rotação, escala e avanço, mais contorno e sombra
   projetada em cor contrastante, sobre campo de esmalte sintético a pincel.
   =================================================================================== */
function handSignTex(lines, opts = {}) {
  const W = opts.w || 1024, H = opts.h || 320;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  let seed = opts.seed || 1337; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const field = opts.bg || '#b3261d';
  // campo: esmalte a pincel — base + passadas de pincel de tom variado (nunca chapado)
  x.fillStyle = field; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    x.globalAlpha = 0.05 + rnd() * 0.1; x.fillStyle = rnd() > 0.5 ? '#ffffff' : '#000000';
    x.fillRect(rnd() * W, rnd() * H, 40 + rnd() * 260, 3 + rnd() * 9);   // marca da cerda
  }
  x.globalAlpha = 1;
  const rows = lines.length, pad = H * 0.06;
  const rowH = (H - pad * 2) / rows;
  for (let li = 0; li < rows; li++) {
    const L = lines[li];
    const size = (L.size || 0.72) * rowH;
    const baseY = pad + rowH * li + rowH * 0.78;
    const slant = L.italic === false ? 0 : -(0.14 + rnd() * 0.12);   // bastão condensada itálica
    x.font = `900 ${size | 0}px "Arial Black",Impact,"Haettenschweiler",sans-serif`;
    const txt = L.t;
    // 1ª passada: largura natural de cada letra
    const wch = [];
    let natural = 0;
    for (const ch of txt) { const w = x.measureText(ch).width * (L.cond || 0.82); wch.push(w); natural += w; }
    const avail = W - pad * 2 - W * 0.02;
    // "apertar no fim da linha": o avanço encolhe progressivamente do 60% pro fim
    const squeeze = Math.min(0.34, Math.max(0, (natural - avail) / Math.max(1, natural)) + 0.08);
    let adv = 0; const advs = [];
    for (let i = 0; i < wch.length; i++) {
      const p = i / Math.max(1, wch.length - 1);
      const k = 1 - squeeze * Math.pow(Math.max(0, p - 0.45) / 0.55, 1.5);
      advs.push(wch[i] * k * (0.94 + rnd() * 0.13)); adv += advs[i];
    }
    const sx = Math.min(1, avail / Math.max(1, adv));   // se ainda estourar, comprime tudo
    // margem esquerda irregular (placa de pincel começa na esquerda, não centralizada)
    let px = pad + (L.center ? Math.max(0, (avail - adv * sx) / 2) : 0) + (rnd() - 0.5) * W * 0.012;
    const shadow = L.shadow || '#140b06', outline = L.outline || '#140b06';
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (ch !== ' ') {
        const jy = (rnd() - 0.5) * size * 0.13;         // BASELINE IRREGULAR
        const jr = (rnd() - 0.5) * 0.075;               // letra torta
        const js = 0.9 + rnd() * 0.2;                   // altura desigual
        x.save();
        x.translate(px, baseY + jy); x.rotate(jr);
        x.transform(sx * (L.cond || 0.82), 0, slant, js, 0, 0);
        x.fillStyle = shadow; x.fillText(ch, size * 0.06, size * 0.07);   // sombra projetada
        x.lineWidth = size * 0.11; x.strokeStyle = outline; x.strokeText(ch, 0, 0);   // contorno
        x.fillStyle = L.color || '#f5f0e2'; x.fillText(ch, 0, 0);
        x.restore();
      }
      px += advs[i] * sx;
    }
  }
  // escorrimento de tinta (pinta em pé, escorre) + ferrugem nas bordas + furos de parafuso
  for (let i = 0; i < 16; i++) {
    x.globalAlpha = 0.16 + rnd() * 0.2; x.fillStyle = field;
    const dx = rnd() * W, dy = rnd() * H * 0.7; x.fillRect(dx, dy, 2 + rnd() * 4, 12 + rnd() * 46);
  }
  for (let i = 0; i < 30; i++) {
    x.globalAlpha = 0.1 + rnd() * 0.3; x.fillStyle = '#7a3d1a';
    const edge = rnd(); const px = edge < 0.5 ? rnd() * W : (rnd() > 0.5 ? rnd() * W * 0.12 : W - rnd() * W * 0.12);
    const py = edge < 0.5 ? (rnd() > 0.5 ? rnd() * H * 0.12 : H - rnd() * H * 0.12) : rnd() * H;
    const r = 4 + rnd() * 18; x.beginPath(); x.ellipse(px, py, r, r * 0.7, 0, 0, 6.3); x.fill();
  }
  x.globalAlpha = 0.75; x.fillStyle = '#2a1a12';
  for (const [fx, fy] of [[W * 0.03, H * 0.1], [W * 0.97, H * 0.1], [W * 0.03, H * 0.9], [W * 0.97, H * 0.9]]) { x.beginPath(); x.arc(fx, fy, 5, 0, 6.3); x.fill(); }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4; return t;
}

// PIXAÇÃO em preto/prata sobre o zinco (BAR §4.4) — letra reta, alta e angular, sem serifa,
// nada a ver com o grafite colorido: é traço de rolinho/spray, uma passada só.
function pixacaoTex(seed = 555) {
  const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.clearRect(0, 0, W, H);
  x.strokeStyle = rnd() > 0.5 ? '#141414' : '#9aa0a6'; x.lineCap = 'square';
  for (let g = 0; g < 7; g++) {   // "letras": hastes verticais com ganchos
    const bx = 14 + g * 34 + (rnd() - 0.5) * 8, top = 18 + rnd() * 12, bot = H - 18 - rnd() * 10;
    x.lineWidth = 5 + rnd() * 4;
    x.beginPath(); x.moveTo(bx, top); x.lineTo(bx + (rnd() - 0.5) * 6, bot); x.stroke();
    x.beginPath(); x.moveTo(bx, top + rnd() * 10); x.lineTo(bx + 12 + rnd() * 10, top + rnd() * 22); x.stroke();
    if (rnd() > 0.4) { x.beginPath(); x.moveTo(bx, bot); x.lineTo(bx + 10 + rnd() * 12, bot - 8 - rnd() * 14); x.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/* ===== VEGETAÇÃO INVASORA — o contraste que DEFINE o mapa =====
   BAR §4.4: "o verde vivo e saturado do mato contra o laranja da ferrugem é o contraste
   cromático que define este mapa (complementares diretos). Um ferro velho sem mato lê
   como cenário de estúdio." Por isso o verde aqui é MAIS saturado que o T.grass padrão. */
function bladeTex(seed = 401, tall = false) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.clearRect(0, 0, S, S);
  const n = tall ? 30 : 24;
  for (let i = 0; i < n; i++) {
    const px = 6 + rnd() * (S - 12), h = (tall ? 0.62 : 0.42) * S + rnd() * S * 0.36;
    // verde SATURADO (capim-colonião ao sol) com algumas folhas secas amareladas
    const dry = rnd() > 0.82;
    x.strokeStyle = dry
      ? `rgba(${170 + rnd() * 40 | 0},${150 + rnd() * 40 | 0},${60 + rnd() * 30 | 0},0.95)`
      : `rgba(${44 + rnd() * 54 | 0},${132 + rnd() * 74 | 0},${28 + rnd() * 34 | 0},0.96)`;
    x.lineWidth = 1.6 + rnd() * 2.4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(px, S);
    x.quadraticCurveTo(px + (rnd() - 0.5) * 22, S - h * 0.55, px + (rnd() - 0.5) * 40, S - h);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// trepadeira: manta de folhas que cobre a pilha inteira (alpha, bordas recortadas)
function vineTex(seed = 733) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.clearRect(0, 0, S, S);
  x.strokeStyle = 'rgba(72,96,40,0.9)'; x.lineWidth = 2.4;   // ramos
  for (let i = 0; i < 9; i++) {
    let px = rnd() * S, py = -6; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < 7; k++) { px += (rnd() - 0.5) * 46; py += S / 6; x.lineTo(px, py); }
    x.stroke();
  }
  for (let i = 0; i < 300; i++) {   // folhas — densas em cima, ralas embaixo (a trepadeira desce)
    const py = Math.pow(rnd(), 0.55) * S;
    if (py > S * 0.82 && rnd() > 0.35) continue;
    const px = rnd() * S, r = 4 + rnd() * 9;
    x.fillStyle = `rgba(${40 + rnd() * 58 | 0},${118 + rnd() * 82 | 0},${26 + rnd() * 42 | 0},${0.8 + rnd() * 0.2})`;
    x.save(); x.translate(px, py); x.rotate(rnd() * 6.3);
    x.beginPath(); x.ellipse(0, 0, r, r * 0.62, 0, 0, 6.3); x.fill(); x.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// copa de árvore (mangueira do quintal) — cachos de folha, silhueta irregular
function canopyTex(seed = 811) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.clearRect(0, 0, S, S);
  for (let i = 0; i < 150; i++) {
    const a = rnd() * 6.283, d = Math.pow(rnd(), 0.6) * S * 0.46;
    const px = S / 2 + Math.cos(a) * d, py = S / 2 + Math.sin(a) * d * 0.86, r = 9 + rnd() * 22;
    const sh = d / (S * 0.46);   // borda mais clara (sol), miolo escuro
    x.fillStyle = `rgba(${(30 + sh * 62) | 0},${(78 + sh * 96) | 0},${(24 + sh * 42) | 0},${0.85 + rnd() * 0.15})`;
    x.beginPath(); x.ellipse(px, py, r, r * (0.6 + rnd() * 0.5), rnd() * 6.3, 0, 6.3); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// POÇA: água escura espelhando o céu + IRIDESCÊNCIA de óleo (BAR §4.4)
function puddleTex(seed = 617) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.clearRect(0, 0, S, S);
  const g = x.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(58,66,64,0.95)'); g.addColorStop(0.72, 'rgba(40,44,42,0.92)'); g.addColorStop(1, 'rgba(40,44,42,0)');
  x.fillStyle = g; x.beginPath(); x.ellipse(S / 2, S / 2, S * 0.47, S * 0.42, 0, 0, 6.3); x.fill();
  // reflexo do céu de fim de tarde (a poça é o único espelho do pátio)
  x.globalAlpha = 0.45; x.fillStyle = '#c9a678';
  x.beginPath(); x.ellipse(S * 0.42, S * 0.38, S * 0.2, S * 0.09, -0.4, 0, 6.3); x.fill();
  // anéis de iridescência do óleo
  const IRI = ['rgba(190,90,180,0.30)', 'rgba(90,190,190,0.28)', 'rgba(210,180,70,0.26)', 'rgba(120,110,210,0.24)'];
  for (let i = 0; i < 9; i++) {
    x.globalAlpha = 1; x.strokeStyle = IRI[i % IRI.length]; x.lineWidth = 2 + rnd() * 5;
    x.beginPath(); x.ellipse(S / 2 + (rnd() - 0.5) * 28, S / 2 + (rnd() - 0.5) * 28, 10 + rnd() * 34, 8 + rnd() * 28, rnd() * 3, 0, 6.3); x.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function buildFerroVelho(scene, T) {
  const colliders = [], occluders = [], pickups = [];
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
    const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, ...o });
    const det = m.map && detailFor(m.map);
    if (det) {
      if (det.normalMap && !m.normalMap) { m.normalMap = det.normalMap; m.normalScale.set(0.65, 0.65); }
      if (det.roughnessMap && !m.roughnessMap) m.roughnessMap = det.roughnessMap;
    }
    return m;
  };
  const MAT = {
    // terra batida: tiling FINO (crítico R6: "chão borrão de baixa frequência") — cascalho,
    // óxido e tonalidade em escala de ~1.4m por tile (antes ~3.2m = manchão)
    /* R3 — TERRA DESSATURADA. Medido no recorte x200-900 / y560-760 do frame 169-d:
       RGB (98,68,38), S 0,611, 95,5 % dos pixels acima de S 0,55 — ou seja, o chão inteiro
       gastava sozinho o orçamento de 5 % de C2, e com ele estourado a bandeira verde de
       captura e a placa vermelha param de significar qualquer coisa.
       A conta: o albedo #6b5a44 tem S 0,36, mas o sol daqui é 0xffd39a e croma de albedo
       multiplica croma de luz — mesmo um cinza NEUTRO sairia a S 0,29 nesta iluminação.
       Base nova: S 0,21 e valor um pouco mais alto (V 0,42 → 0,47, o mapa era o mais
       escuro dos quatro). Previsão do r3_sim.py: tela S ≈ 0,45 — o mesmo patamar da r1,
       que mediu 3,9 % acima de 0,55. O matiz (31°, argila) não muda: o que faz o chão ler
       como terra batida brasileira é o hue, não a saturação. */
    dirt: lam({ map: FERRO_SAT_HOT
      ? noiseTex('#6b5a44', [['#584a38', 60, 8, 26, 0.5], ['#7a6a52', 50, 6, 20, 0.4], ['#3a3230', 14, 5, 14, 0.45], ['#8a4a2a', 26, 2, 6, 0.4], ['#4a3f30', 34, 2, 7, 0.4]], 46, 52, { pebbles: '#8a7a62', pebbleN: 620, seed: 11 })
      : noiseTex('#786d5f', [['#585046', 60, 8, 26, 0.5], ['#7a7163', 50, 6, 20, 0.4], ['#3a3331', 14, 5, 14, 0.45], ['#946c59', 26, 2, 6, 0.4], ['#4a443b', 34, 2, 7, 0.4]], 46, 52, { pebbles: '#8a7d69', pebbleN: 620, seed: 11 }) }),
    wall: lam({ map: noiseTex('#7d7468', [['#6a6258', 40, 10, 30, 0.5], ['#8d8478', 30, 8, 22, 0.4], ['#4a443c', 10, 6, 16, 0.4]], 6, 2, { cracks: '#55504a', seed: 23 }) }),
    /* ESPECULARES — R9. O BAR §4.4 pede nominalmente "o specular correndo pelas chapas
       onduladas" com o sol rasante, e o mapa entregava ZERO pixel acima de L* 97 em 24
       frames. Não era falta de sol: era roughness alta demais (0,52-0,70) nas chapas e
       baixa demais (0,08-0,16) nas poças/cacos. Nos dois extremos o brilho some — num
       porque o lóbulo é largo e fraco, no outro porque é forte e sub-pixel. A faixa útil
       com uma luz direcional é 0,22-0,38, e é onde tudo aqui foi parar. */
    steel: lam({ map: noiseTex('#8a9096', [['#787e84', 30, 6, 20, 0.4], ['#9aa0a8', 20, 4, 14, 0.3], ['#6a5a48', 8, 3, 10, 0.3]], 2, 2, { seed: 137 }), metalness: 0.82, roughness: 0.34, envMapIntensity: 1.8 }),
    office: lam({ map: blocoTex(4, 2) }),   // barraco = bloco cerâmico SEM reboco (era verde chapado)
    roof: lam({ map: fibroTex(5, 3) }),   // BAR §4.4: barraco tem telhado de FIBROCIMENTO, não zinco
    // zinco da cerca/portão: chapa cinza-azulada, giz de óxido, base corroída
    // a onda da telha é curva: com 0,30 o risco de sol percorre CADA canaleta (é a imagem
    // que o BAR pede pelo nome) em vez de virar um cinza uniforme.
    zinc: lam({ map: zincTex(1, 1, 71, { rust: 1 }), metalness: 0.72, roughness: 0.30, envMapIntensity: 1.9 }),
    zincOld: lam({ map: zincTex(1, 1, 313, { rust: 1, hi: '#9aa39f', mid: '#77817e', lo: '#4e5654' }), metalness: 0.58, roughness: 0.32, envMapIntensity: 1.7 }),
    zincDark: lam({ map: zincTex(3, 1.4, 907, { rust: 0.6, hi: '#5d666a', mid: '#48504f', lo: '#31393a' }), metalness: 0.50, roughness: 0.38, envMapIntensity: 1.6 }),
    tire: lam({ color: 0x22252a }),
    barrel: lam({ map: barrelTex(), metalness: 0.4, roughness: 0.7 }),
    // óleo BRILHA (crítico R6: "lê como buraco preto fosco") — specular do sol na poça
    // óleo é FILME DIELÉTRICO sobre asfalto: quem faz o brilho é o Fresnel na rasante
    // (F ~ 0,14 com o sol a 20°), então a roughness tem que ficar baixa pro pico passar
    // do ponto branco — 0,28 derrubava o pico pra 4,2 (limiar 4,2: em cima da linha).
    oil: new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0.20, roughness: 0.20, envMapIntensity: 2.2, transparent: true, opacity: 0.82 }),
  };
  /* ===== POOL DE FERRUGEM: 3 ESTÁGIOS × variantes, escolhido por ÍNDICE DA PEÇA =====
     O erro que o BAR chama de "chapado" é usar UMA textura de ferrugem em tudo. Aqui cada
     peça pega um material determinístico pelo índice (mesmo pátio todo boot, sem surpresa),
     e ~40% delas vêm com TINTA CALCINADA por cima. Pool fixo (não um material por peça):
     em 'low' são 6 texturas, senão 12 — ~3 MB de VRAM, e o batching não sofre. */
  const RUST_POOL = [];
  {
    const variants = LOWQ ? 2 : 4;
    for (let s = 0; s < 3; s++) for (let v = 0; v < variants; v++) {
      const paint = (v % 2 === 1) ? PAINT_DEAD[(s * 2 + v) % PAINT_DEAD.length] : null;
      const P = RUST_STAGE[s];
      RUST_POOL.push(lam({ map: rustStageTex(s, 101 + s * 37 + v * 913, paint), roughness: P.rough, metalness: P.metal }));
    }
  }
  // hash de avalanche → índice do pool: peças vizinhas caem em estágios diferentes
  const rustMat = (i) => RUST_POOL[mix32(i) % RUST_POOL.length];
  let _rc = 0; const nextRust = () => rustMat(_rc++);   // contador de peça (fallbacks sem GLB)
  /* AO DE VÉRTICE (critério A1) — ver vao.js. No ferro velho é o que separa a cerca de
     zinco da terra batida: as duas superfícies têm luminância parecida e, sem contato, a
     chapa lê como recorte colado no chão. */
  const aoMat = aoMatFactory();
  const SKIRT = new ContactSkirt({ low: LOWQ });
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
    root.add(m);
    if (opts.collide !== false) { colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 }); occluders.push(m); }
    return m;
  }
  const addFloor = (w, d, x, z, mat, y = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; root.add(m); };
  const gprop = (id, x, z, h, ry = 0) => {
    const o = placeProp(id, { x, z, targetH: h, ry });
    if (o) { root.add(o); o.traverse((m) => { if (m.isMesh) occluders.push(m); }); }
    return !!o;
  };
  /* Variação de painel (crítico gauntlet: "mesmo módulo repetido") + ESTÁGIO DE FERRUGEM.
     Os GLB de carcaça já vêm com map próprio, então não dá pra trocar a textura sem perder
     o scan — o que dá é puxar a COR do material para o alvo do estágio (lerp) e mexer em
     rough/metal. Resultado: a mesma pilha lida como laranja-vivo, marrom-crosta ou
     metal-com-véu conforme o índice, que é exatamente o que o BAR pede. */
  // R3: mesma dessaturação da RUST_STAGE, senão o lerp dos GLB reinjetava o laranja neon
  const STAGE_TINT = FERRO_SAT_HOT
    ? [new THREE.Color(0xb0601f), new THREE.Color(0x4f2c1c), new THREE.Color(0x9fa6a6)]
    : [new THREE.Color(0xb08f77), new THREE.Color(0x5e4c43), new THREE.Color(0x9fa6a6)];
  const STAGE_PBR = [[0.98, 0.05], [0.95, 0.08], [0.6, 0.4]];
  let _pv = 0;
  const vary = (o) => {
    const i = ++_pv;
    // um único hash de avalanche alimenta TODAS as decisões da peça, cada uma lendo uma
    // faixa de bits diferente — assim estágio, tinta e jitter não ficam correlacionados
    const h = mix32(i);
    const s = (h % 97) / 97;
    const st = (h >>> 7) % 3;
    const painted = (h >>> 13) % 5 < 2;   // ~40% guardam tinta calcinada
    const tint = painted ? new THREE.Color(PAINT_DEAD[(h >>> 19) % PAINT_DEAD.length]) : STAGE_TINT[st];
    // sem tinta, o lerp vai mais fundo: é o que separa "laranja vivo" de "marrom-crosta"
    // de "metal com véu" à distância de jogo (BAR §4.4, os TRÊS estágios)
    const k = painted ? 0.5 : 0.72;
    o.traverse((m) => {
      if (!m.isMesh || !m.material) return;
      m.material = m.material.clone();   // clone(true) compartilha material entre instâncias
      if (m.material.color) {
        m.material.color.lerp(tint, k);
        m.material.color.offsetHSL((s - 0.5) * 0.04, (s - 0.5) * 0.1, (s - 0.5) * 0.07);
      }
      if (m.material.roughness !== undefined) m.material.roughness = STAGE_PBR[st][0];
      if (m.material.metalness !== undefined) m.material.metalness = STAGE_PBR[st][1];
      if (m.material.emissive) m.material.emissive.offsetHSL((s - 0.5) * 0.05, (s - 0.5) * 0.12, (s - 0.5) * 0.09);
    });
    return o;
  };
  const gpropV = (id, x, z, h, ry = 0) => { const flip = _pv % 2 ? Math.PI : 0; const o = placeProp(id, { x, z, targetH: h, ry: ry + flip }); if (o) { vary(o); root.add(o); o.traverse((m) => { if (m.isMesh) occluders.push(m); }); } return !!o; };
  // collider AABB por footprint (props só entram em ry 0 ou π/2, então o AABB é exato).
  // SÓ corpo: a bala é das malhas visíveis (gprop/gpropV/traverse no call site) — BUG-54.
  const collide = (x, z, hw, hd, h) => {
    colliders.push({ minX: x - hw, maxX: x + hw, minY: 0, maxY: h, minZ: z - hd, maxZ: z + hd });
  };

  /* ===================== DECALQUE DE RUA (public/img/decals) =====================
     Pedido do dono (04/08): aplicar os recortes de `public/img/decals` "na textura de todos
     mapas onde faz sentido: laterais de prédios, portas, portões, carros, pilastras, paredes"
     e "num tamanho MAIOR que os posters atuais para serem bem visíveis".

     ESTE MAPA JÁ TINHA DOIS SISTEMAS DE TINTA, e o novo NÃO substitui nenhum:
       · `T.graffiti` — 9 murais 6,2 × 2,7 m em escala arquitetônica nos muros internos;
       · `pixacaoTex` — 6 pixações procedurais de traço reto nas chapas.
     O que faltava era o acervo recortado de verdade (179 PNG com alpha). Ele entra onde os
     outros dois NÃO estão: chapa livre do perímetro, galpão do Zé e as duas folhas do portão.

     CINCO REGRAS, cada uma com um defeito real atrás:
     1. `T.decals[i]` é getter memoizado (textures.js:696): ler por ÍNDICE baixa UM PNG.
        Spread/`.map()` acordaria os 179 (7 MB) de uma vez.
     2. `transparent: true` — sem isso o alpha vira retângulo preto na chapa.
     3. PLANO, nunca `collide`: decalque com colisor vira parede invisível (BUG-21).
     4. 6-8 cm de afastamento da face + polygonOffset contra z-fighting.
     5. Escolha determinística por posição — o `botsim` é determinístico e mapa que muda a
        cada carregamento é defeito.
     Fora do pool: as 47 folhas de 'alfabeto' (uma letra fina e clara, some a 10 m — BAR
     §2.1) e os recortes de olho/boca soltos (viram mancha abstrata ampliados a 3 m). */
  const D_MURAL = decalIds(T, ['personagem-muro.png', 'personagens-graffiti-01.png',
    'personagens-graffiti-02.png', 'personagens-graffiti-03.png', 'personagens-graffiti-04.png',
    'personagens-graffiti-05.png', 'personagens-graffiti-06.png', 'personagens-graffiti-07.png',
    'peca-bolha.png', 'or-graf-treta.png', 'or-graf-coro.png']);   // originais versionados
  const D_TAG = decalIds(T, ['tag-fina.png', 'tag-flop.png', 'tag-larga.png', 'tag-money.png',
    'tag-pingo.png', 'tag-selvagem.png', 'tags-treino-02.png', 'tags-treino-05.png',
    'or-stencil-capivara.png', 'or-stencil-pomba.png']);           // originais versionados
  const D_LAMBE = decalIds(T, ['cartaz-america-latina.png', 'cartaz-medo.png', 'cartaz-neutro.png',
    'dont-overthink.png', 'gratidao-sol.png', 'meio-ano.png', 'pra-gringo.png']);
  /* Sólidos que NÃO são collider e ainda assim são parede legítima de decalque. Hoje: as
     duas folhas do portão, que são caixas GIRADAS (ry = ∓0,9) — o collider delas é a AABB
     não-girada, então o raio de `paredeAtras` sai pela lateral e reprovaria a peça certa.
     MEDIDO: 5 de 25 amostras batiam antes desta lista existir. */
  const decalSolids = [];
  const _dmat = new Map(), _usados = [];
  const decalMat = (i) => {
    let m = _dmat.get(i);
    if (!m) {
      m = new THREE.MeshStandardMaterial({
        map: T.decals[i], transparent: true, alphaTest: 0.22, roughness: 0.98, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      });
      _dmat.set(i, m);
    }
    return m;
  };
  function decal(pool, x, y, z, ry, alt, larg = 99) {
    if (!T.decals || !T.decalAspects || !pool.length) return null;
    const k = mix32(mix32(Math.round(x * 10) + 9973) + Math.round(z * 10) * 131 + 7);
    // anti-repetição local: pool de 7-11 peças com 13 vagas no perímetro repete por
    // aniversário, e arte repetida a 10 m lê como falha de asset, não como pátio.
    let i = pool[k % pool.length];
    for (let t = 0; t < pool.length; t++) {
      const j = pool[(k + t) % pool.length];
      if (!_usados.some((u) => u.i === j && Math.hypot(u.x - x, u.z - z) < 16)) { i = j; break; }
    }
    const a = T.decalAspects[i] || 1;
    let h = alt, w = alt * a;
    if (w > larg) { w = larg; h = larg / a; }          // encolhe inteiro; NUNCA estica
    /* PAREDE ATRÁS ANTES DE DESENHAR (map_decals.js). Antes do `_usados` de propósito:
       peça reprovada não gasta a vaga da anti-repetição. */
    if (!paredeAtras(colliders.concat(decalSolids), x, y + h / 2, z, ry, w, h)) return null;
    _usados.push({ i, x, z });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decalMat(i));
    m.position.set(x, y + h / 2, z); m.rotation.y = ry; m.renderOrder = 2;
    m.receiveShadow = true;                            // tinta escurece junto com a chapa
    m.name = 'decal:' + (T.decalFiles ? T.decalFiles[i] : i);
    esconderSeFaltar(m, T.decals[i]);   // PNG 404 em prod vira BRANCO CHAPADO se não sumir (ver graffiti_pass.esconderSeFaltar)
    root.add(m);            // NUNCA em `occluders`/`colliders`: é tinta, não é peça
    return m;
  }
  /* Face de uma caixa GIRADA (as duas folhas do portão têm ry = ∓0,9). A normal da face
     local ±x de uma caixa com `rotation.y = ryBox` é (±cos ry, 0, ∓sin ry); um PlaneGeometry
     com `rotation.y = θ` tem normal (sin θ, 0, cos θ), daí o `atan2(nx, nz)`. Sem esta
     conversão o decalque sai atravessado na folha — o mesmo erro de eixo local que produziu
     o aerofólio 1,9 m ao lado do carro na Quebrada. */
  const decalFace = (pool, cx, cz, ryBox, lado, off, y0, alt, larg) => {
    const nx = lado * Math.cos(ryBox), nz = -lado * Math.sin(ryBox);
    return decal(pool, cx + nx * off, y0, cz + nz * off, Math.atan2(nx, nz), alt, larg);
  };

  /* ===== TERRENO VIZINHO (regressão medida: "massa branca/cinza gigante em ~25% do frame")
     O chão do pátio termina em x=±32 / z=±36. Além dessa borda não havia NADA: o frame
     mostrava o fundo do céu abaixo da linha do horizonte — um chapado sem textura, que é
     reprovação direta em B6 ("nenhuma área ampla de cor plana sem textura") e o que fazia
     as pilhas do anel externo e os cartões de skyline parecerem recortes flutuando.
     Solução mais barata possível: UM avental de 360 m com a MESMA terra num tiling grosso
     (fundo/não-jogável = 64–128 px/m pelo BAR §1.8), puxado pra cor da névoa. Fica 8 cm
     abaixo do piso do pátio (sem z-fight), não recebe sombra, não tem collider:
     1 draw call, 2 triângulos, e o mundo deixa de "acabar". ===== */
  {
    const apron = MAT.dirt.map.clone(); apron.needsUpdate = true; apron.repeat.set(100, 100);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), lam({ map: apron, color: 0xc0ab8c }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, -0.08, 0); root.add(m);
  }
  // ===== chão de terra =====
  addFloor(HALF_X * 2, HALF_Z * 2, 0, 0, MAT.dirt);
  // As seis poças CircleGeometry antigas liam como discos pretos perfeitos. As manchas
  // orgânicas texturizadas do passe de sujeira abaixo já cobrem esta função sem repetição.
  // trilhas de pneu na terra (crítico gauntlet: "chão sem vida") — pares de faixas escuras
  {
    const trackMat = new THREE.MeshBasicMaterial({ color: 0x2a241c, transparent: true, opacity: 0.35 });
    for (const [cx, cz, len, ry] of [[-4, 14, 30, 0.15], [6, 2, 32, -0.2], [-16, -12, 24, 0.35], [14, 22, 20, 0.1]]) {
      for (const off of [-0.5, 0.5]) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(0.35, len), trackMat);
        t.rotation.x = -Math.PI / 2; t.rotation.z = ry;
        t.position.set(cx + Math.cos(ry) * off, 0.015, cz + Math.sin(ry) * off);
        root.add(t);
      }
    }
  }

  /* ===== PERÍMETRO: CERCA DE TELHA ONDULADA DE ZINCO =====
     Correção do gap nº1 apontado pelo crítico ("muro de CONCRETO — falta a assinatura nº1
     do lugar, que é o zinco"). O BAR §4.4 é literal: chapa galvanizada em mourões de
     madeira torta, ALTURAS IRREGULARES, chapas de origens diferentes, remendos, corroída
     na base. Implementação: o collider continua sendo UM box por lado (idêntico ao de
     antes — A*, LOS e bounds não mudam nada), com material escuro; por cima dele vão os
     painéis de zinco em InstancedMesh (1 draw call pros ~200 painéis) com altura, giro e
     tint por instância. O topo serrilhado dos painéis é o que quebra o horizonte reto. */
  const fenceP = [], fencePost = [];   // {x,z,ry,w,h,tint} / {x,z,ry,h}
  const zincFence = (cx, cz, ry, len) => {
    const step = LOWQ ? 2.2 : 1.25;    // 'low': metade dos painéis, mesma silhueta
    const n = Math.max(1, Math.round(len / step)), w = len / n;
    const dx = Math.cos(ry), dz = -Math.sin(ry);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5, px = cx + dx * t * len, pz = cz + dz * t * len;
      const s = ((i * 2654435761 + (cx * 71 + cz * 13)) >>> 0) % 1000 / 1000;
      fenceP.push({ x: px, z: pz, ry: ry + (s - 0.5) * 0.09, w: w * 1.06, h: 2.9 + s * 1.25, tint: s });
      if (i % (LOWQ ? 3 : 2) === 0) fencePost.push({ x: px - dx * w * 0.5, z: pz - dz * w * 0.5, ry, h: 3.4 + s * 0.9, lean: (s - 0.5) * 0.1 });
    }
  };
  addBox(2 * HALF_X, 3.2, 1, MAT.zincDark, 0, 0, -HALF_Z);                 // fundo (norte)
  addBox(HALF_X - 5, 3.2, 1, MAT.zincDark, -(HALF_X / 2 + 2.5), 0, HALF_Z);  // sul esq (vão do portão x∈[-5,5])
  addBox(HALF_X - 5, 3.2, 1, MAT.zincDark, (HALF_X / 2 + 2.5), 0, HALF_Z);   // sul dir
  addBox(1, 3.2, 2 * HALF_Z, MAT.zincDark, -HALF_X, 0, 0);                 // oeste
  addBox(1, 3.2, 2 * HALF_Z, MAT.zincDark, HALF_X, 0, 0);                  // leste
  zincFence(0, -HALF_Z + 0.52, 0, 2 * HALF_X);
  zincFence(-(HALF_X / 2 + 2.5), HALF_Z - 0.52, Math.PI, HALF_X - 5);
  zincFence((HALF_X / 2 + 2.5), HALF_Z - 0.52, Math.PI, HALF_X - 5);
  zincFence(-HALF_X + 0.52, 0, Math.PI / 2, 2 * HALF_Z);
  zincFence(HALF_X - 0.52, 0, -Math.PI / 2, 2 * HALF_Z);
  {
    const geo = new THREE.BoxGeometry(1, 1, 0.05);
    const im = new THREE.InstancedMesh(geo, MAT.zinc, fenceP.length);
    im.castShadow = im.receiveShadow = true; im.frustumCulled = false;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
    for (let i = 0; i < fenceP.length; i++) {
      const p = fenceP[i];
      e.set(0, p.ry, 0); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(p.x, p.h / 2, p.z), q, new THREE.Vector3(p.w, p.h, 1));
      im.setMatrixAt(i, m4);
      // chapas de origens diferentes: umas ainda azuladas, outras já lavadas/amareladas
      const t = p.tint;
      col.setHSL(t < 0.55 ? 0.55 : 0.09, t < 0.55 ? 0.05 + t * 0.06 : 0.16, 0.72 + (t - 0.5) * 0.3);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    root.add(im);
    // mourões de madeira torta (o BAR pede madeira OU cantoneira; madeira lê melhor)
    const pgeo = new THREE.CylinderGeometry(0.075, 0.105, 1, 5);
    const pmat = lam({ color: 0x4b3a29, roughness: 0.96 });
    const pim = new THREE.InstancedMesh(pgeo, pmat, fencePost.length);
    pim.castShadow = true; pim.frustumCulled = false;
    for (let i = 0; i < fencePost.length; i++) {
      const p = fencePost[i];
      e.set(p.lean, p.ry, p.lean * 0.6); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(p.x, p.h / 2, p.z), q, new THREE.Vector3(1, p.h, 1));
      pim.setMatrixAt(i, m4);
    }
    pim.instanceMatrix.needsUpdate = true; root.add(pim);
  }
  /* ARAME FARPADO no topo da cerca — silhueta clássica e barata: 2 fios em catenária +
     farpas como cruzetas finas. Sem collider (é decoração acima da altura de tiro). */
  {
    const wmat = new THREE.MeshBasicMaterial({ color: 0x2b2620 });
    const barbGeo = [];
    const runWire = (ax, az, bx, bz, y) => {
      const a = new THREE.Vector3(ax, y, az), b = new THREE.Vector3(bx, y, bz);
      const mid = a.clone().lerp(b, 0.5); mid.y -= 0.28;
      const cur = new THREE.QuadraticBezierCurve3(a, mid, b);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(cur, LOWQ ? 8 : 16, 0.016, 3), wmat));
      if (LOWQ) return;
      for (let i = 1; i < 10; i++) {   // farpas
        const pt = cur.getPoint(i / 10);
        const bg = new THREE.BoxGeometry(0.005, 0.1, 0.1);
        bg.rotateY(Math.atan2(bx - ax, bz - az)); bg.rotateZ(0.7);
        bg.translate(pt.x, pt.y, pt.z); barbGeo.push(bg);
      }
    };
    const C = [[-HALF_X + 0.5, -HALF_Z + 0.5], [HALF_X - 0.5, -HALF_Z + 0.5], [HALF_X - 0.5, HALF_Z - 0.5], [-HALF_X + 0.5, HALF_Z - 0.5]];
    for (let i = 0; i < 4; i++) {
      const a = C[i], b = C[(i + 1) % 4];
      if (i === 2) continue;   // lado sul: o vão do portão fica livre
      for (const y of [4.15, 4.45]) runWire(a[0], a[1], b[0], b[1], y);
    }
    if (barbGeo.length) {
      // merge manual (sem BufferGeometryUtils no import map): 1 draw call pras farpas
      let vc = 0, ic = 0;
      for (const g of barbGeo) { vc += g.attributes.position.count; ic += g.index.count; }
      const pos = new Float32Array(vc * 3), idx = new Uint32Array(ic);
      let vo = 0, io = 0;
      for (const g of barbGeo) {
        pos.set(g.attributes.position.array, vo * 3);
        const gi = g.index.array; for (let k = 0; k < gi.length; k++) idx[io + k] = gi[k] + vo;
        vo += g.attributes.position.count; io += gi.length; g.dispose();
      }
      const merged = new THREE.BufferGeometry();
      merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      merged.setIndex(new THREE.BufferAttribute(idx, 1));
      root.add(new THREE.Mesh(merged, wmat));
    }
  }
  /* PORTÃO DE CORRER de zinco (BAR §4.4) — mesma chapa da cerca, moldura de cantoneira,
     TRILHO no chão, cadeado e corrente. Fica aberto (o vão x∈[-5,5] é o spawn P), as duas
     folhas recolhidas nas laterais. Colliders idênticos aos das folhas antigas. */
  addBox(0.25, 3.4, 4.6, MAT.zincOld, -5.2, 0, HALF_Z - 2.2, { ry: 0.9 });
  addBox(0.25, 3.4, 4.6, MAT.zincOld, 5.2, 0, HALF_Z - 2.2, { ry: -0.9 });
  // as duas folhas como sólido GIRADO, pro `paredeAtras` do decalque (ver decalSolids lá em cima)
  for (const sgn of [-1, 1]) decalSolids.push(caixaGirada(0.25, 3.4, 4.6, sgn * 5.2, 0, HALF_Z - 2.2, sgn * -0.9));
  {
    const angle = lam({ map: rustStageTex(1, 51, null, 2, 1), metalness: 0.35, roughness: 0.8 });
    for (const sgn of [-1, 1]) {   // moldura de cantoneira nas folhas
      for (const [ox, oy, w, h] of [[0, 0.06, 4.7, 0.12], [0, 3.3, 4.7, 0.12]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, w), angle);
        m.position.set(sgn * 5.2, oy, HALF_Z - 2.2); m.rotation.y = sgn * -0.9; m.castShadow = true; root.add(m);
      }
    }
    // trilho no chão (o portão é de correr, não de bater)
    const rail = new THREE.Mesh(new THREE.BoxGeometry(15, 0.06, 0.14), lam({ color: 0x4a4a48, metalness: 0.90, roughness: 0.26, envMapIntensity: 2.0 }));   // boleto de trilho: polido pelo uso
    rail.position.set(0, 0.03, HALF_Z - 0.75); rail.receiveShadow = true; root.add(rail);
    /* CORRENTE + CADEADO — regressão medida: pendurados em x=-4,6 / z=33,1 eles caíam
       EXATAMENTE no meio do vão do portão, a ~1,5 m da câmera de quem nasce no spawn P.
       Numa pilha de 7 elos a 1,5 m isso vira uma coluna preta de ~320 px ocluindo o bot
       que corre — obstrução de linha de tiro pura (BAR §2.3, "zero ruído visual na linha
       de tiro"). Realocados pra ponta EXTERNA da folha oeste já recolhida (x=-6,7 /
       z=34,9), encostados na cerca: continuam contando a história do portão trancado, mas
       fora do vão e fora do eixo de saída do spawn. */
    const chain = lam({ color: 0x565049, metalness: 0.85, roughness: 0.32, envMapIntensity: 1.8 });
    for (let i = 0; i < 6; i++) {
      const l = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.017, 4, 8), chain);
      l.position.set(-6.72 + i * 0.02, 1.12 - i * 0.09, HALF_Z - 1.1); l.rotation.y = i % 2 ? 1.57 : 0; root.add(l);
    }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.05), lam({ color: 0x6d6a60, metalness: 0.6, roughness: 0.5 }));
    lock.position.set(-6.64, 0.5, HALF_Z - 1.1); root.add(lock);
  }
  /* PLACA PINTADA À MÃO do portão — o hero prop de identidade do mapa.
     Campo vermelho, letra creme com contorno e sombra preta, baseline irregular,
     conteúdo canônico (FERRO VELHO + o que se compra + telefone + seta). */
  {
    const tex = handSignTex([
      { t: 'FERRO VELHO DO ZÉ', size: 0.9, color: '#f7e9c8', cond: 0.86 },
      { t: 'COMPRA-SE FERRO • COBRE • ALUMÍNIO', size: 0.58, color: '#f2c23a', cond: 0.7 },
      { t: 'BATERIA • MOTOR — FONE 3255-4180', size: 0.58, color: '#f2c23a', cond: 0.7 },
    ], { bg: '#a8241c', w: 1024, h: 288, seed: 4242 });
    /* CALIBRAÇÃO (regressão medida na r1): a placa era 14 × 3,4 m com o centro em y=4,9 —
       base em y=3,2. Três defeitos de uma vez:
         (a) atravessava as chapas de zinco da cerca, que chegam a 4,15 m de altura;
         (b) com 14 m ela invadia x=±7, ou seja, entrava no muro sul (que começa em |x|=5);
         (c) de qualquer posição perto do portão ocupava ~18% do frame NUMA SIGHTLINE,
             com o texto esticado e ilegível — reprovação em C4 e em D4 ao mesmo tempo.
       Agora: 8,6 m (cabe INTEIRA no vão do portão, x∈[-4,3;4,3], sem tocar o muro) e base
       em y=4,42 — acima da chapa mais alta da cerca e da linha do arame. A placa continua
       sendo o marco do spawn P, só que lida como letreiro no alto do portão, e não como
       parede vermelha no meio da tela. */
    // 8,6 / 2,42 mantém a proporção exata do canvas (1024×288): letra pintada esticada é
    // justamente o que reprova em D4, então a placa nunca pode fugir do aspecto da imagem
    const SW = 8.6, SH = 2.42, SY = 5.62;   // largura / altura / centro em y
    const s = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    s.position.set(0, SY, HALF_Z + 0.08); root.add(s);
    // verso (quem já está dentro do pátio também vê a placa — marco do spawn P)
    const s2 = s.clone(); s2.position.z = HALF_Z - 0.30; s2.rotation.y = Math.PI; root.add(s2);
    /* MASTROS DO PORTAL: sobem do chão até acima da placa e dão a ela um suporte visível
       (placa flutuando lê como decal colado). collide:false de propósito — eles ficam em
       z=35,9 e o `bounds` do mapa trava o jogador em z≤35,5, então são inalcançáveis:
       zero efeito em colisão, LOS ou A*. */
    for (const px of [-4.62, 4.62]) {
      addBox(0.26, SY + SH / 2 + 0.25, 0.26, MAT.zincOld, px, 0, HALF_Z - 0.1, { collide: false });
    }
    // travessa de cantoneira ligando os dois mastros por cima da placa
    addBox(SW + 1.1, 0.16, 0.16, MAT.zincOld, 0, SY + SH / 2 + 0.06, HALF_Z - 0.1, { collide: false });
    /* SETA pintada à mão: era 3,4 × 1,1 m a 2,3 m do spawn e na altura do olho — sozinha
       tomava metade do frame nos prints de spawn. Encolhida e realocada pro muro (x=-9,2,
       onde há chapa atrás), acima da linha de tiro: continua dando a affordance de rota
       (BAR §2.5) sem competir com a silhueta de ninguém. */
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75),
      new THREE.MeshBasicMaterial({ map: handSignTex([{ t: '↓ ENTRADA', size: 0.86, color: '#1b1b1b', outline: '#f5e9b8', shadow: '#f5e9b8', cond: 0.78 }], { bg: '#e8c22a', w: 512, h: 160, seed: 77 }), transparent: true }));
    arrow.position.set(-9.2, 3.62, HALF_Z - 0.62); arrow.rotation.y = Math.PI; root.add(arrow);
  }

  // ===== FUNDO DO PÁTIO (crítico gauntlet: "horizonte vazio"): silhueta de pilhas FORA do
  // muro, sem collider — o mundo não acaba atrás da parede =====
  {
    const ring = [
      ['muro_carros', -38, -20, 4.5, Math.PI / 2], ['monte_carros', -40, 2, 4.2, 0.3], ['muro_carros', -38, 24, 4.5, Math.PI / 2],
      ['monte_carros', -22, -42, 4.0, 0.8], ['muro_carros', 2, -41, 4.5, 0], ['monte_carros', 26, -42, 4.6, -0.5],
      ['muro_carros', 39, -14, 4.5, Math.PI / 2], ['monte_carros', 40, 10, 4.2, 1.2], ['muro_carros', 38, 30, 4.5, Math.PI / 2],
      ['monte_carros', -20, 42, 3.8, 2.0], ['muro_carros', 16, 42, 4.2, 0],
    ];
    for (const [id, x, z, h, ry] of ring) gpropV(id, x, z, h, ry);
  }

  // ===== GALPÃO/escritório do Zé (fundo norte — spawn B + bandeira) =====
  const G = { x0: -12, x1: 2, z0: -HALF_Z + 1, z1: -HALF_Z + 9 };   // footprint 14×8
  addBox(G.x1 - G.x0, 3.4, 0.5, MAT.office, (G.x0 + G.x1) / 2, 0, G.z1);          // frente fechada
  addBox(0.5, 3.4, G.z1 - G.z0, MAT.office, G.x0, 0, (G.z0 + G.z1) / 2);          // lateral oeste
  // lateral leste com vão de porta z∈[-31.25,-28.75]
  addBox(0.5, 3.4, 2.5, MAT.office, G.x1, 0, G.z0 + 1.25);
  addBox(0.5, 3.4, 2.5, MAT.office, G.x1, 0, G.z1 - 1.25);
  addBox(G.x1 - G.x0 + 1.5, 0.3, G.z1 - G.z0 + 1.5, MAT.roof, (G.x0 + G.x1) / 2, 3.4, (G.z0 + G.z1) / 2, { collide: false });  // telhado
  addBox(3.2, 1.0, 1.4, nextRust(), -8, 0, -31.5, { collide: true });   // balcão/mesa dentro
  { // placa do escritório: mesma mão de pincel do portão, campo azul (BAR §4.4 aceita
    // vermelho/azul/amarelo). Marco visual do spawn B, legível de longe.
    const s = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.7), new THREE.MeshBasicMaterial({
      map: handSignTex([{ t: 'ESCRITÓRIO', size: 0.82, color: '#f4e7c4', cond: 0.8 }], { bg: '#1f4f86', w: 512, h: 128, seed: 909 }), transparent: true }));
    s.position.set((G.x0 + G.x1) / 2, 4.0, G.z1 + 0.3); root.add(s); }
  gprop('dumpster', 6, -31, 1.4) || addBox(1.2, 1.4, 2, MAT.steel, 6, 0, -31); collide(6, -31, 0.7, 1.1, 1.4);

  // ===== LABIRINTO: muros de carros empilhados Mint (N-S altos) + fileiras prensadas (E-W baixas) =====
  // muro_carros h=3.0 → painel ~2.8w×1.3d; em fila forma a parede do labirinto (não dá pra ver por cima)
  const wallAtNS = (x, z) => {   // parede N-S: 5 painéis ao longo de z (14m)
    for (let i = -2; i <= 2; i++) gpropV('muro_carros', x, z + i * 2.8, 3.0, Math.PI / 2) || addBox(1.3, 3.0, 2.8, nextRust(), x, 0, z + i * 2.8);
    collide(x, z, 0.7, 7.0, 3.0);
  };
  const wallAtEW = (x, z) => {   // parede E-W: 3 painéis ao longo de x (8.4m)
    for (let i = -1; i <= 1; i++) gpropV('muro_carros', x + i * 2.8, z, 3.0) || addBox(2.8, 3.0, 1.3, nextRust(), x + i * 2.8, 0, z);
    collide(x, z, 4.2, 0.7, 3.0);
  };
  // fileira_carros h=1.2 → ~6.3×1.45 (cover baixo E-W, dá pra atirar por cima)
  const rowAt = (x, z) => { gpropV('fileira_carros', x, z, 1.2) || addBox(6.3, 1.2, 1.45, nextRust(), x, 0, z); collide(x, z, 3.2, 0.8, 1.2); };
  wallAtNS(-11, -13);   // A — centro-oeste norte
  wallAtNS(11, 1);      // B — centro-leste
  wallAtNS(-11, 15);    // C — centro-oeste sul
  wallAtNS(21, -20);    // D — leste norte
  rowAt(10, -26);       // F — norte (leste do galpão)
  rowAt(24, 18);        // G — leste sul
  rowAt(-14, 30);       // H — sul (oeste do portão)
  if (!BECO) rowAt(-24, 6);   // E — oeste (no BECO vira muro duplo do cânion)
  // REFORÇO DE RESPAWN (G2-R6B): cover extra nos DOIS spawns — fileiras prensadas fecham
  // o "bolso" do portão (P) e a aproximação norte do galpão (B). h≤1.2: o LOS
  // spawn↔spawn (já 0) não muda; o A* contorna — corredores ≥4m preservados.
  // (os jerseys do reforço entram logo abaixo, onde jerseyAt já está definido)
  rowAt(8, 29);         // P: fileira prensada à direita do portão
  rowAt(-2, -19);       // B: fileira prensada na aproximação do galpão
  wallAtEW(-6, 8);      // I — muro E-W no miolo oeste (mata LOS spawn↔spawn)
  wallAtEW(0, -6);      // J — muro E-W no miolo centro (mata LOS spawn↔spawn)
  // montes de carros (cover médio nos cantos largos)
  const heapAt = (x, z, ry = 0) => { gpropV('monte_carros', x, z, 2.2, ry) || addBox(2.8, 2.2, 2.8, nextRust(), x, 0, z, { ry }); collide(x, z, 1.5, 1.5, 2.2); };
  if (!BECO) heapAt(-22, -24, 0.4);   // no BECO o monte sai da boca norte do cânion
  heapAt(24, 32, -0.3);
  // máquinas do ferro velho: guindaste (marco leste) + prensa (canto SW; no BECO ela sai do
  // vão do cânion pra faixa atrás do muro oeste — continua marco visual, não bloqueia a boca)
  gprop('guindaste', 26, -6, 7) || addBox(5.7, 7, 5.5, MAT.steel, 26, 0, -6); collide(26, -6, 2.9, 2.8, 6.5);
  const _prensaX = BECO ? -29.7 : -26;
  gprop('prensa_carros', _prensaX, 32, 2.6) || addBox(2.3, 2.6, 1.1, nextRust(), _prensaX, 0, 32); collide(_prensaX, 32, 1.2, 0.6, 2.6);

  /* ===== BECO OESTE — o cânion da imagem-conceito do dono (08/2026) =====
     Vão de ~6,6 m (x ∈ ]-26,3,-19,7[), de z=+32 a z=-24. Muros DUPLOS de muro_carros
     (base 3,0 m + topo 2,6 m ≈ 5,6 m — não se vê por cima de lugar nenhum), contínuos
     no lado oeste e com DUAS saídas de 5,6 m pro miolo no lado leste (z∈]3,8[ e
     z∈]-14,-9[) — é beco, não beco-sem-saída. A faixa entre o muro oeste e a cerca
     (x∈]-32,-27,7[) vira cenário com montes de carros fechando as duas pontas. */
  if (BECO) {
    const panel = (x, z) => {
      const ry = Math.PI / 2;
      const base = placeProp('muro_carros', { x, z, targetH: 3.0, ry });
      if (base) { vary(base); root.add(base); base.traverse((m) => { if (m.isMesh) occluders.push(m); }); }
      // topo: leve jitter de z/rotação pra quebrar a linha reta do serrilhado (crítico gauntlet)
      const top = placeProp('muro_carros', { x, z: z + 0.3, y: 2.7, targetH: 2.6, ry: ry + 0.13 });
      if (top) { vary(top); root.add(top); top.traverse((m) => { if (m.isMesh) occluders.push(m); }); }
      if (!base && !top) addBox(1.3, 5.6, 2.8, nextRust(), x, 0, z);   // fallback em peça única
      collide(x, z, 0.7, 1.5, 5.6);
    };
    for (let z = 32; z >= -24; z -= 2.8) {
      panel(-27, z);                                            // muro oeste: contínuo
      if ((z > 3 && z < 8) || (z > -14 && z < -9)) continue;    // as 2 saídas pro miolo
      panel(-19, z);                                            // muro leste
    }
    // fecha a faixa cenário atrás do muro oeste (sem ratinho apertado atrás da parede)
    heapAt(-29.7, 27, 0.2); heapAt(-29.7, -22, -0.4);
    // pórtico da placa na boca sul (z=+29): postes fora do vão + placa dupla-face a 4,7 m
    for (const px of [-27.9, -18.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.2, 8), MAT.steel);
      post.position.set(px, 2.6, 29); post.castShadow = true; root.add(post); occluders.push(post);
      collide(px, 29, 0.15, 0.15, 5.2);
    }
    const becoSignT = handSignTex([{ t: 'BECO OESTE', size: 0.9, color: '#191410', outline: '#f0e6cc', shadow: '#f0e6cc', cond: 0.8, center: true }],
      { bg: '#e0b21e', w: 1024, h: 192, seed: 4242 });
    for (const face of [0, Math.PI]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1.6), new THREE.MeshBasicMaterial({ map: becoSignT, transparent: true }));
      s.position.set(-23, 4.7, 29); s.rotation.y = face; root.add(s);
    }
  }

  // ===== carros unitários + cover baixo nos corredores =====
  let ci = 0;
  const carAt = (x, z, ry) => {
    const id = SINGLES[ci++ % SINGLES.length];
    // gpropV (e não gprop): cada carcaça pega um dos 3 estágios de ferrugem pelo índice
    if (!gpropV(id, x, z, 1.45, ry)) addBox(2, 1.3, 4.2, nextRust(), x, 0, z, { ry });
    collide(x, z, 1.2, 2.2, 1.3);
  };
  carAt(2, 12, -2.9); carAt(18, -10, 1.7);
  carAt(-2, -18, 0.1); carAt(8, 24, -0.6);
  if (!BECO) { carAt(-24, 22, 0.3); carAt(-26, -2, 2.2); }   // no BECO o vão é do cânion
  // jersey barriers + sacos de areia + bloqueio de concreto
  const jerseyAt = (x, z, ry = 0) => { gprop('jersey_barrier', x, z, 1.1, ry) || addBox(0.8, 1.1, 2, MAT.wall, x, 0, z, { ry }); collide(x, z, 0.5, 1.1, 1.1); };
  jerseyAt(-6, 26); jerseyAt(14, 12); jerseyAt(8, -20);
  if (!BECO) jerseyAt(-18, -8);
  jerseyAt(1, 26);            // G2-R6B: bloqueio central à frente do spawn P (portão)
  jerseyAt(-13, -21);         // G2-R6B: bloqueio no flanco oeste do spawn B (galpão)
  const sandAt = (x, z) => { gprop('sandbags', x, z, 0.6) || addBox(1.5, 0.6, 1.7, MAT.wall, x, 0, z); collide(x, z, 0.8, 0.9, 0.6); };
  sandAt(12, 28); sandAt(26, -12);
  if (!BECO) sandAt(-20, 14);
  gprop('concrete_roadblock', 0, 20, 1.1, Math.PI / 2) || addBox(2.7, 1.1, 0.7, MAT.wall, 0, 0, 20); collide(0, 20, 0.5, 1.6, 1.1);

  /* ===== PNEUS EMPILHADOS + TAMBORES DE 200 L (props de identidade, BAR §4.4) =====
     Pneu: preto fosco ESBRANQUIÇADO de poeira, e a pilha tem ÁGUA PARADA dentro do pneu
     de cima — com o reflexo do céu nessa água (é um detalhe citado nominalmente no BAR e
     custa 1 disco por pilha). */
  const tireMat = lam({ map: noiseTex('#26282c', [['#3a3d40', 26, 6, 20, 0.5], ['#585c5c', 18, 3, 10, 0.45], ['#8a8b84', 14, 2, 7, 0.35]], 2, 1, { seed: 601 }), roughness: 0.98 });
  // lâmina d'água parada dentro do pneu/tambor: mesmo raciocínio da poça (0.08 = sub-pixel)
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2b3a3c, metalness: 0.95, roughness: 0.24, envMapIntensity: 2.2, transparent: true, opacity: 0.9 });
  let _ti = 0;
  const tireStack = (x, z) => {
    const i = _ti++;
    if (!gprop('pilha_pneus', x, z, 1.2)) {   // fallback procedural: 4 pneus tortos, não um box
      for (let k = 0; k < 4; k++) {
        const m = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 6, 14), tireMat);
        m.rotation.x = Math.PI / 2; m.rotation.z = k * 1.1 + i;
        m.position.set(x + Math.sin(k * 2.1 + i) * 0.06, 0.15 + k * 0.27, z + Math.cos(k * 1.7 + i) * 0.06);
        m.castShadow = m.receiveShadow = true; root.add(m); occluders.push(m);
      }
    }
    // ÁGUA PARADA no pneu de cima (dengue do ferro velho) — espelha o céu alaranjado
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.26, 12), waterMat);
    w.rotation.x = -Math.PI / 2; w.position.set(x, 1.14, z); root.add(w);
    collide(x, z, 0.5, 0.5, 1.1);
  };
  tireStack(-18, 20); tireStack(16, 30); tireStack(-16, -33); tireStack(26, -30); tireStack(-28, 12);
  /* TAMBOR DE 200 L: 0.58 m Ø × 0.88 m, com os DOIS frisos de rolamento e o tampo.
     Cores por índice — azul/verde/vermelho desbotados com logo ido, e alguns só ferrugem
     (estágio sorteado do mesmo pool das carcaças). Alguns tombados no chão. */
  const DRUM_PAINT = [0x3c5f8e, 0x2f6b46, 0x9c3128, 0xb4a24a, null, null];
  let _bi = 0;
  const barrel = (x, z, tipped = false) => {
    const i = _bi++;
    const col = DRUM_PAINT[i % DRUM_PAINT.length];
    const mat = col == null ? rustMat(i * 31 + 5) : lam({ map: barrelTex(), color: col, metalness: 0.35, roughness: 0.72 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.88, 12), mat);
    body.position.y = 0.44; body.castShadow = body.receiveShadow = true; g.add(body);
    for (const ry of [0.28, 0.6]) {   // frisos de rolamento — a silhueta do tambor 200 L
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.055, 12), mat);
      r.position.y = ry; r.castShadow = true; g.add(r);
    }
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.03, 12), mat);
    lid.position.y = 0.885 + (i % 3 === 0 ? 0.02 : 0); lid.rotation.z = i % 3 === 0 ? 0.09 : 0;   // tampo empenado
    g.add(lid);
    if (tipped) { g.rotation.z = Math.PI / 2 - 0.06; g.position.set(x, 0.30, z); g.rotation.y = i * 1.3; }
    else g.position.set(x, 0, z);
    root.add(g); g.traverse((m) => { if (m.isMesh) occluders.push(m); });
    collide(x, z, tipped ? 0.5 : 0.32, tipped ? 0.32 : 0.32, tipped ? 0.6 : 0.95);
  };
  barrel(-4, 4); barrel(20, 22); barrel(-28, -18); barrel(4, -32); barrel(28, 8);
  barrel(-4.8, 4.5); barrel(20.7, 22.4, true); barrel(-28.7, -17.4); barrel(27.4, 8.6, true);
  // REFORÇO DAS LANES CENTRAIS (G2-R14B, pedido do dono — "mesma coisa no ferro velho"):
  // sucatas escalonadas no corredor-miolo (x≈±6) quebram a lane aberta portão↔galpão.
  // Tudo ≤1.45m de altura (LOS spawn↔spawn, já 0, não muda) e vãos laterais ≥3m pro A*.
  carAt(-6, 24, 0.35);
  carAt(6, -12, -0.3);
  tireStack(3, 22);
  sandAt(-7, 0);

  /* ===== PROPS DE IDENTIDADE PROCEDURAIS (BAR §4.4) =====
     Empilhadeira, carrinho de mão, baterias, rolos de fio de cobre, cadeira monobloco e
     o CACHORRO vira-lata. Tudo geometria primitiva barata (nenhum GLB novo, nenhum
     download) e SÓ a empilhadeira ganha collider — os demais são leitura, não cover,
     e ficam fora da linha de tiro pra não virar ruído (BAR §2.3). */
  {
    const ymat = lam({ map: rustStageTex(2, 777, '#c3ab63', 1, 1), roughness: 0.8, metalness: 0.2 });   // amarelo calcinado
    const dark = lam({ color: 0x2a2c2e, roughness: 0.6, metalness: 0.4 });
    const mesh = (g, m, x, y, z, ry = 0, rx = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.y = ry; o.rotation.x = rx; o.castShadow = o.receiveShadow = true; root.add(o); return o; };
    /* EMPILHADEIRA — marco do PÁTIO LESTE (o crítico pede "marcos distintos por área":
       hoje o leste só tinha o guindaste). Silhueta reconhecível = torre do mastro + garfos. */
    // peça local de grupo (Object3D.position é acessor read-only: nada de Object.assign)
    const part = (g, geo, mat, px, py, pz, ry = 0, rx = 0, rz = 0) => {
      const o = new THREE.Mesh(geo, mat); o.position.set(px, py, pz);
      o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o;
    };
    const forklift = (fx, fz, ry) => {
      const g = new THREE.Group();
      part(g, new THREE.BoxGeometry(1.15, 0.85, 1.9), ymat, 0, 0.72, -0.15);
      part(g, new THREE.BoxGeometry(1.05, 0.5, 0.7), dark, 0, 1.4, -0.55);   // banco/cabine
      for (const sx of [-0.42, 0.42]) {   // gaiola de proteção do operador
        part(g, new THREE.BoxGeometry(0.07, 1.5, 0.07), ymat, sx, 2.0, -1.0);
        part(g, new THREE.BoxGeometry(0.07, 1.5, 0.07), ymat, sx, 2.0, 0.1);
        part(g, new THREE.BoxGeometry(0.09, 2.4, 0.13), dark, sx * 0.55, 1.35, 0.95);   // trilhos do mastro
        part(g, new THREE.BoxGeometry(0.11, 0.05, 1.15), dark, sx * 0.55, 0.09, 1.5);   // GARFOS
      }
      part(g, new THREE.BoxGeometry(1.1, 0.07, 0.07), ymat, 0, 2.72, -0.45);
      for (const [wx, wz, wr] of [[-0.55, 0.75, 0.34], [0.55, 0.75, 0.34], [-0.5, -0.85, 0.24], [0.5, -0.85, 0.24]])
        part(g, new THREE.CylinderGeometry(wr, wr, 0.24, 10), tireMat, wx, wr, wz, 0, 0, Math.PI / 2);
      g.position.set(fx, 0, fz); g.rotation.y = ry; root.add(g);
      g.traverse((m) => { if (m.isMesh) occluders.push(m); });
      collide(fx, fz, 1.1, 1.4, 2.1);
    };
    forklift(20, 9, -1.15);
    /* CARRINHO DE MÃO encostado na parede do barraco */
    const barrow = (bx, bz, ry) => {
      const g = new THREE.Group();
      part(g, new THREE.BoxGeometry(0.62, 0.28, 0.9), rustMat(913), 0, 0.55, 0, 0, -0.9);
      const wood = lam({ color: 0x5b4a34 });
      for (const sx of [-0.24, 0.24]) part(g, new THREE.BoxGeometry(0.05, 0.05, 1.5), wood, sx, 0.62, -0.45, 0, 0.35);
      part(g, new THREE.CylinderGeometry(0.2, 0.2, 0.1, 10), tireMat, 0, 0.2, 0.62, 0, 0, Math.PI / 2);
      g.position.set(bx, 0, bz); g.rotation.y = ry; root.add(g);
      g.traverse((m) => { if (m.isMesh) occluders.push(m); });
      // A cuba chega a 0,89 m: sem pegada o jogador atravessava o carrinho inteiro.
      collide(bx, bz, 0.72, 0.82, 0.95);
    };
    barrow(3.2, -30.4, 0.6);
    /* BATERIAS empilhadas (terminais esverdeados de sulfato) + ROLOS DE FIO DE COBRE —
       é literalmente o que o ferro velho compra; ficam à sombra do barraco. */
    const batMat = lam({ color: 0x1a1c1e, roughness: 0.75 });
    const sulf = lam({ color: 0x6fae86, roughness: 0.6, metalness: 0.25 });
    for (let i = 0; i < 6; i++) {
      const bx = -10.6 + (i % 3) * 0.38, by = 0.14 + Math.floor(i / 3) * 0.27, bz = -30.2 + (i % 2) * 0.05;
      mesh(new THREE.BoxGeometry(0.34, 0.26, 0.2), batMat, bx, by, bz, (i * 0.3) % 0.5);
      for (const tx of [-0.09, 0.09]) mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.05, 6), sulf, bx + tx, by + 0.15, bz);
    }
    const copper = lam({ color: 0xb1622c, metalness: 0.92, roughness: 0.30, envMapIntensity: 1.8 });
    for (const [cx, cz, cr] of [[-11.4, -29.2, 0.28], [-11.0, -28.6, 0.22], [-11.7, -28.7, 0.18]])
      mesh(new THREE.TorusGeometry(cr, 0.075, 5, 12), copper, cx, 0.075, cz, 0, Math.PI / 2);
    /* CADEIRA MONOBLOCO branca encardida na porta do escritório (BAR §4.4) */
    {
      const pl = lam({ color: 0xd6d2c4, roughness: 0.72 });
      // assento/encosto são occluders: a ponta da cadeira invade o colisor do carrinho de mão
      occluders.push(mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), pl, 4.0, 0.44, -29.6, 0.5));
      occluders.push(mesh(new THREE.BoxGeometry(0.42, 0.5, 0.05), pl, 4.0 + Math.sin(0.5) * 0.19, 0.7, -29.6 - Math.cos(0.5) * 0.19, 0.5));
      for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]])
        mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 5), pl, 4.0 + lx, 0.22, -29.6 + lz);
    }
    /* CACHORRO vira-lata dormindo na sombra — o BAR lista cachorro/gato/galinha como
       marcador de "isso é um ferro velho brasileiro, não um depósito industrial". */
    {
      const fur = lam({ color: 0x8a6a44, roughness: 0.95 });
      const dx = 1.6, dz = -29.2, dr = -0.7;
      const body = mesh(new THREE.CapsuleGeometry(0.16, 0.42, 3, 6), fur, dx, 0.17, dz, dr, 0);
      body.rotation.z = Math.PI / 2;
      mesh(new THREE.SphereGeometry(0.14, 8, 6), fur, dx + Math.sin(dr) * 0.34, 0.19, dz + Math.cos(dr) * 0.34, dr);
      for (const e of [-1, 1]) mesh(new THREE.ConeGeometry(0.05, 0.11, 4), fur, dx + Math.sin(dr) * 0.34 + e * 0.07, 0.3, dz + Math.cos(dr) * 0.34, dr);
      mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.34, 5), fur, dx - Math.sin(dr) * 0.36, 0.09, dz - Math.cos(dr) * 0.36, dr, Math.PI / 2 - 0.3);
    }
    /* CARCAÇA APOIADA EM TIJOLO/ARO, não em roda (BAR §4.4) — pilhas de tijolo debaixo
       dos carros unitários; é o detalhe que denuncia "sem roda, sobre calço". */
    const brick = lam({ color: 0x9c5a3c, roughness: 0.95 });
    for (const [bx, bz] of [[-24, 22], [2, 12], [18, -10], [-2, -18], [-26, -2], [8, 24], [-6, 24], [6, -12]]) {
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++)
        mesh(new THREE.BoxGeometry(0.2, 0.09, 0.11), brick, bx + s * 0.85, 0.05 + k * 0.1, bz + s * 1.5, k * 0.5);
    }
  }

  /* ===== GROUND DETAIL PASS pesado (crítico gauntlet R2: "primeiro plano morto") =====
     ferro velho = óleo, sucata, poeira, mato. TUDO sem collider (LOS/A* intactos). */
  {
    let dseed = 113; const drnd = () => (dseed = (dseed * 16807) % 2147483647) / 2147483647;
    const decal = (tex, w, d, x, z, ry = 0, y = 0.018, opacity = 1, rough = 0.95, metal = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity, roughness: rough, metalness: metal, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = ry; m.position.set(x, y, z); m.receiveShadow = true; root.add(m);
    };
    // poças de óleo irregulares c/ SPECULAR (perto de barris, prensa, guindaste, rotas e spawns)
    const oilA = blobTex(10, 11, 14, 0.62, 101), oilB = blobTex(16, 13, 10, 0.5, 202);
    for (const [x, z, w, tx] of [
      [-3.5, 4.8, 3.2, oilA], [19, 21, 2.6, oilB], [-27, -17, 3.0, oilA], [5, -30.5, 2.4, oilB], [27, 7, 2.8, oilA],
      [-25.4, 30.6, 2.8, oilA], [24, -4.5, 3.4, oilB], [0.5, 29, 3.0, oilB], [-6, 25, 2.2, oilA], [8, 27.5, 2.4, oilA],
      [-9, -2, 2.6, oilB], [12, -12, 2.8, oilA], [-20, 6, 2.4, oilB], [2, -8, 2.2, oilA], [-14, -25, 2.6, oilB], [16, 16, 2.4, oilA]
    ]) decal(tx, w, w * (0.7 + drnd() * 0.5), x, z, drnd() * 6.3, 0.018, 1, 0.22, 0.6);
    // poeira/areia acumulada no rodapé dos muros (vento + abandono)
    const dust = blobTex(196, 176, 138, 0.4, 303);
    for (let z = -30; z <= 30; z += 6) { decal(dust, 5.5, 2.0, -HALF_X + 1.4, z + drnd() * 2, 0, 0.014, 0.8); decal(dust, 5.5, 2.0, HALF_X - 1.4, z - drnd() * 2, 0, 0.014, 0.8); }
    for (let x = -26; x <= 26; x += 6) decal(dust, 5.5, 2.0, x + drnd() * 2, -HALF_Z + 1.4, Math.PI / 2, 0.014, 0.8);
    decal(dust, 7, 2.4, -14, HALF_Z - 1.6, Math.PI / 2, 0.014, 0.8); decal(dust, 7, 2.4, 14, HALF_Z - 1.6, Math.PI / 2, 0.014, 0.8);

    /* ---- CHÃO BRASILEIRO: ARGILA VERMELHA + BRITA + POÇAS (BAR §4.4) ----
       "terra batida com trechos de argila vermelha e trechos de brita, manchada de óleo
       preto e com poças de água escura (espelhadas, com iridescência de óleo)".
       O chão antigo era um marrom só; as manchas de laterita são o que dá o cheiro de
       Brasil e, de quebra, funcionam como pontos de referência na navegação. */
    const clay = blobTex(156, 74, 42, 0.55, 404), grit = blobTex(150, 146, 132, 0.42, 505);
    for (const [x, z, w, t] of [
      [-20, -30, 7, clay], [12, -22, 6, clay], [-6, 6, 8, clay], [22, 26, 7, clay], [-26, 16, 6, clay],
      [4, 34, 6, clay], [28, -14, 5, clay], [-14, 24, 6, clay],
      [0, 22, 6, grit], [-18, -4, 6, grit], [16, 4, 6, grit], [-4, -26, 6, grit], [26, -26, 5, grit], [-28, 6, 5, grit]
    ]) decal(t, w, w * (0.6 + drnd() * 0.5), x, z, drnd() * 6.3, 0.012, 0.85);
    // POÇAS: material espelhado (metalness alta + roughness baixa) — é o único lugar do
    // pátio onde o céu de fim de tarde aparece refletido, e o BAR pede isso nominalmente.
    // 0.09 num PLANO horizontal + sol pontual = o reflexo do disco solar cabe em menos de
    // um pixel: a poça "espelhada" não devolvia nenhum brilho medível. 0.26 abre o rastro.
    const puddleMat = new THREE.MeshStandardMaterial({ map: puddleTex(617), transparent: true, metalness: 0.92, roughness: 0.26, envMapIntensity: 2.2, polygonOffset: true, polygonOffsetFactor: -3 });
    for (const [x, z, w] of [[-9.5, 17.5, 3.4], [7.5, -8.5, 2.8], [-19, -19, 3.0], [15, 24, 2.6], [25, -9, 2.4], [-25, 24, 3.0], [2, -34, 2.2], [-3, 8.5, 2.6]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * (0.6 + drnd() * 0.4)), puddleMat);
      m.rotation.x = -Math.PI / 2; m.rotation.z = drnd() * 6.3; m.position.set(x, 0.021, z); root.add(m);
    }
    if (BECO) {
      /* BARRO ÚMIDO DO CÂNION (08/2026): a referência do dono tem chão de barro molhado,
         mais escuro e fechado que o dirt do pátio, com poças de CHUVA espelhadas. Sobrepõe
         o chão só na faixa do vão (sem collider, LOS/A* intactos). */
      const mudMat = lam({ map: noiseTex('#4a3a2c', [['#3a2d22', 30, 10, 30, 0.5], ['#5c4836', 26, 8, 22, 0.45], ['#2e241b', 12, 4, 10, 0.5]], 4, 24, { seed: 991, cracks: '#241b14' }) });
      addFloor(9.6, 60, -23, 4, mudMat, 0.008);
      for (const [x, z, w] of [[-23.5, 26, 2.6], [-22, 12, 2.0], [-24, -3, 2.8], [-22.6, -16, 2.2]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * (0.6 + drnd() * 0.4)), puddleMat);
        m.rotation.x = -Math.PI / 2; m.rotation.z = drnd() * 6.3; m.position.set(x, 0.022, z); root.add(m);
      }
    }
    /* CACOS DE VIDRO — carcaça "sem vidro" tem que ter o vidro NO CHÃO. Quadradinhos
       verdes de para-brisa laminado, levemente especulares: piscam com o sol rasante. */
    {  // InstancedMesh: 90 cacos em 1 draw call (eram 90 chamadas — alvo é 60fps em notebook)
      const shardMat = new THREE.MeshStandardMaterial({ color: 0x9fc6b4, metalness: 0.35, roughness: 0.20, envMapIntensity: 2.4, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
      const spots = [[-24, 22], [2, 12], [18, -10], [-2, -18], [-26, -2], [8, 24], [-6, 24], [6, -12], [-11, -13], [11, 1]];
      const per = LOWQ ? 4 : 9;
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), shardMat, spots.length * per);
      im.frustumCulled = false;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      let n = 0;
      for (const [cx, cz] of spots) for (let k = 0; k < per; k++) {
        e.set(-Math.PI / 2, 0, drnd() * 6.3); q.setFromEuler(e);
        m4.compose(new THREE.Vector3(cx + (drnd() - 0.5) * 3.4, 0.025, cz + (drnd() - 0.5) * 3.4), q,
          new THREE.Vector3(0.05 + drnd() * 0.09, 0.04 + drnd() * 0.08, 1));
        im.setMatrixAt(n++, m4);
      }
      im.instanceMatrix.needsUpdate = true; root.add(im);
    }

    // ---- sucata miúda: chapas, tubos, blocos de motor (corredores e rotas) ----
    const scrapMat = lam({ map: rustStageTex(0, 167, null), metalness: 0.05, roughness: 0.98 });
    const scrapSpots = [   // miolo das rotas principais + perto dos spawns (primeiros 5m!)
      [0, 27], [-3, 24], [4, 22], [-8, 30], [7, 31], [-1, 18], [3, 15], [-5, 10], [2, 6], [-2, -2], [5, -10], [-4, -12],
      [-10, 20], [12, 8], [-14, -6], [8, -16], [16, -18], [-18, 16], [20, 2], [-22, -10], [10, 32], [-12, 33], [14, 26], [-16, 27],
      [-20, -28], [18, -26], [24, 12], [-26, 8],
    ];
    for (const [x, z] of scrapSpots) {
      const kind = drnd();
      if (kind < 0.45) {          // chapa retorcida
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.5 + drnd() * 0.4, 0.035, 0.3 + drnd() * 0.25), scrapMat);
        m.position.set(x + drnd() - 0.5, 0.03, z + drnd() - 0.5); m.rotation.y = drnd() * 6.3; m.rotation.z = (drnd() - 0.5) * 0.25;
        m.castShadow = m.receiveShadow = true; root.add(m);
      } else if (kind < 0.75) {   // tubo/escape
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6 + drnd() * 0.5, 8), scrapMat);
        m.rotation.z = Math.PI / 2; m.rotation.y = drnd() * 6.3; m.position.set(x + drnd() - 0.5, 0.06, z + drnd() - 0.5);
        m.castShadow = true; root.add(m);
      } else {                    // bloco de motor baixo: atravessável como um degrau
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.34), lam({ color: 0x1f1d1b, metalness: 0.75, roughness: 0.26, envMapIntensity: 1.8 }));
        m.position.set(x + drnd() - 0.5, 0.14, z + drnd() - 0.5); m.rotation.y = drnd() * 6.3; m.castShadow = true; root.add(m);
      }
    }
    // peças grandes: portas/capôs apoiados nas pilhas + parachoques no chão
    // portas/capôs guardam TINTA CALCINADA (vermelho vira rosa-salmão): é a peça onde
    // o resto de tinta morta mais aparece, porque é chapa grande e lisa.
    const doorMats = [lam({ map: rustStageTex(2, 211, PAINT_DEAD[0]), metalness: 0.35, roughness: 0.66 }),
      lam({ map: rustStageTex(1, 311, PAINT_DEAD[1]), metalness: 0.1, roughness: 0.94 }),
      lam({ map: rustStageTex(0, 411, PAINT_DEAD[4]), metalness: 0.05, roughness: 0.98 })];
    let _dm = 0;
    const leanDoor = (x, z, ry) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 0.05), doorMats[_dm++ % doorMats.length]);
      m.position.set(x, 0.55, z); m.rotation.y = ry; m.rotation.x = -0.28;   // escorada
      m.castShadow = m.receiveShadow = true; root.add(m);
    };
    leanDoor(-10.2, -8, Math.PI / 2); leanDoor(10.2, 5, -Math.PI / 2); leanDoor(-10.2, 18, Math.PI / 2); leanDoor(0.8, -5.2, 0); leanDoor(-5.2, 8.8, Math.PI);
    const bumper = (x, z, ry) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.22), lam({ color: 0x9aa0a6, metalness: 0.88, roughness: 0.28, envMapIntensity: 1.9 }));
      m.position.set(x, 0.09, z); m.rotation.y = ry; m.castShadow = true; root.add(m);
    };
    bumper(2, 25, 0.4); bumper(-6, -16, 1.9); bumper(14, 20, 2.8); bumper(-12, -20, 0.9); bumper(6, 34, 1.2);
    // pneus soltos (roda completa: torus deitado, alguns empilhados tortos)
    const looseTire = (x, z, up = false) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.13, 8, 16), MAT.tire);
      if (up) { m.rotation.y = drnd() * 6.3; m.rotation.x = 0.15; m.position.set(x, 0.42, z); }
      else { m.rotation.x = Math.PI / 2; m.position.set(x, 0.13, z); }
      m.castShadow = m.receiveShadow = true; root.add(m);
    };
    looseTire(1.5, 30.5); looseTire(-7, 27); looseTire(9, 20, true); looseTire(-13, 12); looseTire(18, 6, true); looseTire(-9, -22); looseTire(13, -24); looseTire(-21, 2); looseTire(22, -16); looseTire(-3, 33.5);
    // mato nascendo entre os carros e nos rodapés (planos cruzados c/ alpha)
    const weedMat = new THREE.MeshLambertMaterial({ map: bladeTex(89, false), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    // planos cruzados num único InstancedMesh (eram 2 draw calls por tufo)
    const weedTufts = [];
    const weed = (x, z, s = 1) => { for (let i = 0; i < 2; i++) weedTufts.push([x, z, s, i * Math.PI / 2 + drnd() * 0.5]); };
    const weedSpots = [
      [-9.5, -13, 1.2], [-12.5, -6, 1], [-9.5, 15, 1.1], [-12.5, 22, 0.9], [12.5, 1, 1.2], [9.5, -4, 1], [12.5, 9, 0.9],
      [20, -18, 1.1], [-22, -22, 1], [-25, 4, 1.2], [-27, 16, 1], [25, 26, 1.1], [27, 2, 0.9], [16, -30, 1],
      [-2, 22, 0.8], [4, 17, 0.9], [-6, 2, 0.8], [3, -13, 0.9], [-16, -30, 1], [8, -30, 1.1], [-30, 28, 1.2], [30, 30, 1],
      [-1, 34, 0.9], [6, 25, 0.8], [-11, 33, 0.9], [0.5, 12, 0.7], [-4, -6.5, 0.8], [6.5, -5.5, 0.9],
    ];
    for (const [x, z, s] of weedSpots) weed(x, z, s);
    {
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), weedMat, weedTufts.length);
      im.receiveShadow = true; im.frustumCulled = false;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      for (let i = 0; i < weedTufts.length; i++) {
        const [x, z, s, ry] = weedTufts[i];
        e.set(0, ry, 0); q.setFromEuler(e);
        m4.compose(new THREE.Vector3(x, 0.27 * s, z), q, new THREE.Vector3(0.7 * s, 0.55 * s, 1));
        im.setMatrixAt(i, m4);
        col.setHSL(0.25 + (i % 7) * 0.008, 0.42 + (i % 5) * 0.05, 0.34 + (i % 3) * 0.05);   // verde nunca uniforme
        im.setColorAt(i, col);
      }
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.userData.nonSolidSurface = true;   // mato atravessável (alphaTest com vãos), não é parede
      root.add(im);
    }

    /* ===== VEGETAÇÃO INVASORA — O ASSUNTO DO MAPA =====
       BAR §4.4: "o verde vivo e saturado do mato contra o laranja da ferrugem é o
       contraste cromático que define este mapa (complementares diretos). Um ferro velho
       sem mato lê como cenário de estúdio." Três camadas: capim ALTO (1,4–2,2 m) nos
       bolsões mortos, TREPADEIRA cobrindo pilhas inteiras, e ÁRVORE + BANANEIRA como
       marcos verticais.
       CLAREZA COMPETITIVA (BAR §2.3, "zero ruído na linha de tiro"): o capim alto só
       entra em bolsão morto e rodapé de cerca — NUNCA no corredor central (|x|<8) nem
       nos 4 m em volta das bandeiras. Kill-switch ?mato=0; em 'low' cai pra 40%. */
    if (QP.get('mato') !== '0') {
      const grassMat = new THREE.MeshLambertMaterial({ map: bladeTex(457, true), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, depthWrite: true });
      // bolsões mortos: encostados na cerca, atrás das pilhas, cantos que ninguém cruza
      const clumpsAll = [
        [-29.5, -30], [-29.5, -22], [-29.5, -6], [-29.5, 10], [-29.5, 26], [-29.5, 33],
        [29.5, -32], [29.5, -24], [29.5, -8], [29.5, 6], [29.5, 20], [29.5, 33],
        [-26, -34], [-8, -34], [16, -34], [24, -34], [-27, 34.5], [22, 34.5],
        [-19.5, -13], [-19.5, 15], [19.5, 1], [-13, -22], [13, -30], [27, -18],
        [-22, 8], [-27, 20], [26, 14], [-24, 28], [21, 27], [-17, 4], [17, -22],
      ];
      // BECO OESTE: o vão do cânion é barro limpo (referência do dono) — o capim alto
      // fica do lado de fora dos muros. O verde×ferrugem do BAR §4.4 segue no resto do pátio.
      const clumps = BECO ? clumpsAll.filter(([cx, cz]) => !(cx > -28 && cx < -18 && cz > -26 && cz < 34)) : clumpsAll;
      const perClump = LOWQ ? 3 : 7;
      const total = clumps.length * perClump;
      const geo = new THREE.PlaneGeometry(1, 1);
      const im = new THREE.InstancedMesh(geo, grassMat, total * 2);   // ×2 = planos cruzados
      im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false;
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color();
      let n = 0;
      for (const [cx, cz] of clumps) {
        for (let k = 0; k < perClump; k++) {
          const a = drnd() * 6.283, d = drnd() * 1.7;
          const px = cx + Math.cos(a) * d, pz = cz + Math.sin(a) * d;
          const h = 1.35 + drnd() * 0.85, w = h * (0.72 + drnd() * 0.4);
          const yaw = drnd() * 3.14;
          // tint por tufo: verde-vivo (a maioria) até um pouco de palha — nunca uniforme
          const v = drnd();
          col.setHSL(0.24 + v * 0.06, 0.45 + (1 - v) * 0.3, 0.36 + v * 0.16);
          for (const off of [0, Math.PI / 2]) {
            e.set(0, yaw + off, 0); q.setFromEuler(e);
            m4.compose(new THREE.Vector3(px, h / 2, pz), q, new THREE.Vector3(w, h, 1));
            im.setMatrixAt(n, m4); im.setColorAt(n, col); n++;
          }
        }
      }
      im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.userData.nonSolidSurface = true;   // capim: folhagem atravessável, não é superfície sólida
      root.add(im);

      /* TREPADEIRA cobrindo pilha inteira — manta de folhas na FACE das paredes de carcaça
         e nos montes. Face escolhida à mão pra não tapar a leitura da rota nem o cover. */
      const vineMat = new THREE.MeshLambertMaterial({ map: vineTex(733), transparent: true, alphaTest: 0.32, side: THREE.DoubleSide });
      const drape = (x, z, ry, w, h) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 1, 3), vineMat);
        // folhagem atravessável (alphaTest com vãos): não é superfície sólida pra régua de raios
        m.userData.nonSolidSurface = true;
        m.position.set(x, h / 2 + 0.05, z); m.rotation.y = ry; m.receiveShadow = true; root.add(m);
      };
      // paredes N-S do labirinto (A -11/-13, B 11/1, C -11/15, D 21/-20): face externa
      drape(-11.75, -13, Math.PI / 2, 12, 3.0); drape(11.75, 1, -Math.PI / 2, 12, 3.0);
      drape(-11.75, 15, Math.PI / 2, 9, 2.8); drape(21.75, -20, -Math.PI / 2, 10, 3.0);
      // montes e prensa: a trepadeira desce do topo
      if (!BECO) drape(-22, -25.6, 0, 4.2, 2.4);   // o monte (-22,-24) não existe no BECO
      drape(24, 33.6, Math.PI, 4.2, 2.4);
      drape(BECO ? -29.7 : -26, 32.7, 0, 3.0, 2.6);   // segue a prensa (atrás do muro oeste no BECO)
      // capim saindo de DENTRO das carcaças (o mato cresce por dentro da sucata)
      // gy = topo da peça (paredes de carcaça 3.0 m, montes 2.2 m): o capim tem que sair
      // POR CIMA da pilha, não ficar embutido nela
      for (const [gx, gz, gy] of [[-11, -16, 3.0], [11, 4, 3.0], [-11, 12, 3.0], [21, -17, 3.0], ...(BECO ? [] : [[-22, -24, 2.2]]), [24, 32, 2.2]]) {
        for (let k = 0; k < 3; k++) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.3), grassMat);
          m.userData.nonSolidSurface = true;
          m.position.set(gx + (drnd() - 0.5) * 1.6, gy + 0.55, gz + (drnd() - 0.5) * 1.6);
          m.rotation.y = drnd() * 3.14; root.add(m);
        }
      }
    }
    /* Árvore e bananeira ficam FORA do gate ?mato=0: a árvore do canto NO tem collider e é
       marco de navegação — tirá-la mudaria o navmesh entre estados do kill-switch. */
    {
      /* ÁRVORE (mangueira de quintal) — marco vertical do canto NOROESTE, o único
         volume orgânico do mapa e a maior mancha de verde saturado do frame. */
      const canopyMat = new THREE.MeshLambertMaterial({ map: canopyTex(811), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
      const barkMat = lam({ color: 0x53412e, roughness: 0.97 });
      const tree = (tx, tz, s, collideIt) => {
        const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.3 * s, 3.6 * s, 7), barkMat);
        tr.position.set(tx, 1.8 * s, tz); tr.castShadow = true; root.add(tr);
        for (const [bx, by, bz, br] of [[0.5, 3.2, 0.2, 0.5], [-0.4, 3.4, -0.4, -0.55]]) {
          const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.12 * s, 1.5 * s, 5), barkMat);
          b.position.set(tx + bx * s, by * s, tz + bz * s); b.rotation.z = br; b.castShadow = true; root.add(b);
        }
        for (let k = 0; k < 3; k++) {   // copa: 3 cartões cruzados (barato e lê bem de longe)
          const c = new THREE.Mesh(new THREE.PlaneGeometry(5.4 * s, 4.2 * s), canopyMat);
          c.position.set(tx, 4.9 * s, tz); c.rotation.y = k * 1.05; c.castShadow = true; root.add(c);
        }
        if (collideIt) { occluders.push(tr); collide(tx, tz, 0.4, 0.4, 3.0); }
      };
      tree(-28.5, -30.5, 1.0, true);            // dentro do pátio (marco do canto NO)
      tree(-42, -34, 1.35, false); tree(44, 26, 1.2, false);   // fora da cerca: skyline vivo

      /* BANANEIRA ao lado do barraco — folha longa, verde vivo; assinatura de quintal. */
      const leafMat = new THREE.MeshLambertMaterial({ map: bladeTex(999, true), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: 0x63b03a });
      const banana = (bx, bz) => {
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.9, 6), lam({ color: 0x6e7a44, roughness: 0.9 }));
        st.position.set(bx, 0.95, bz); st.castShadow = true; root.add(st);
        for (let k = 0; k < 6; k++) {
          const l = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 2.1), leafMat);
          l.position.set(bx + Math.cos(k * 1.05) * 0.55, 2.05, bz + Math.sin(k * 1.05) * 0.55);
          l.rotation.set(-0.85, k * 1.05, 0); l.castShadow = true; root.add(l);
        }
      };
      banana(5.4, -33.4); banana(-13.6, -33.6);
    }

    // ---- SINALIZAÇÃO DO LABIRINTO (crítico: corredores com identidade) ----
    // Placas de rota também PINTADAS A PINCEL (uma fonte digital limpa reprovaria no BAR),
    // mas com contraste alto e placa maior: clareza competitiva vem antes do charme.
    // O campo de cor é o CÓDIGO DA ÁREA (BAR §2.5, cor = affordance):
    // amarelo = portão/sul, azul = galpão/norte, vermelho = pátio leste, verde = beco oeste.
    let _sg = 0;
    const dirSign = (txt, x, z, ry, bg = '#e0b21e', fg = '#191410') => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8), MAT.steel);
      post.position.set(x, 1.25, z); post.castShadow = true; root.add(post);
      const t = handSignTex([{ t: txt, size: 0.84, color: fg, outline: '#f0e6cc', shadow: '#f0e6cc', cond: 0.74, center: true }],
        { bg, w: 512, h: 96, seed: 3001 + (_sg++) * 137 });
      for (const face of [0, Math.PI]) {   // duas faces: legível dos dois lados
        const s = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.36), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
        s.position.set(x, 2.2, z); s.rotation.y = ry + face; root.add(s);
      }
    };
    const AZUL = '#1f4f86', VERM = '#a8241c', VERDE = '#2c6b33', AMAR = '#e0b21e';
    dirSign('GALPÃO →', 7.5, 27, 0, AZUL, '#f4e7c4');            // saída do spawn P, aponta pro miolo
    dirSign('← BECO OESTE', -7.5, 27, 0, VERDE, '#f4e7c4');
    dirSign('PÁTIO LESTE →', 13.5, -3, Math.PI / 2, VERM, '#f7e9c8');
    dirSign('← BECO OESTE', -13.5, 3, -Math.PI / 2, VERDE, '#f4e7c4');
    dirSign('↑ GALPÃO', 1, -21, Math.PI, AZUL, '#f4e7c4');       // aproximação do galpão
    if (!BECO) dirSign('PRENSA', -23.5, 29.5, 0.6, AMAR);
    else dirSign('PRENSA', -29.7, 29.2, 0.6, AMAR);   // a prensa saiu do vão p/ trás do muro oeste
    dirSign('GUINDASTE', 23, -3.5, Math.PI / 2, VERM, '#f7e9c8');
    dirSign('EMPILHADEIRA', 17.5, 8.5, -Math.PI / 2, VERM, '#f7e9c8');   // marco novo do pátio leste
    dirSign('PORTÃO →', 1, -33, Math.PI, AMAR);                  // saída do spawn B de volta ao portão
  }

  /* ===== PERÍMETRO + SKYLINE (crítico R6: "muros = lama marrom sem leitura, topo morto") =====
     zinco escorado, grafite em escala, sucata na base, postes/fios/caixa d'água/antena.
     Tudo sem collider. */
  {
    const zmat = lam({ map: zincTex(2.2, 2.2) });
    const leanZinc = (x, z, ry) => {   // folha de zinco escorada no muro
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.5), zmat);
      m.position.set(x, 1.18, z); m.rotation.y = ry; m.rotation.x = -0.11;
      m.castShadow = m.receiveShadow = true; root.add(m);
    };
    leanZinc(-31.35, -24, Math.PI / 2); leanZinc(-31.35, -21.2, Math.PI / 2); leanZinc(10, -35.35, 0);
    leanZinc(13, -35.35, 0); leanZinc(31.35, 22, -Math.PI / 2); leanZinc(-14, 35.35, Math.PI); leanZinc(31.35, -26, -Math.PI / 2);
    // grafite em escala arquitetônica nos muros internos
    if (T.graffiti && T.graffiti.length) {
      const gp = [[-22, -35.44, 0, 0], [10, -35.44, 0, 1], [25, -35.44, 0, 2],
        [-31.44, -4, Math.PI / 2, 1], [-31.44, 20, Math.PI / 2, 2],
        [31.44, -16, -Math.PI / 2, 0], [31.44, 8, -Math.PI / 2, 2],
        [-16, 35.36, Math.PI, 1], [18, 35.36, Math.PI, 0]];   // sul: à FRENTE das chapas de zinco (z-fight)
      for (const [x, z, ry, gi] of gp) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.7), lam({ map: T.graffiti[gi % T.graffiti.length] }));
        m.position.set(x, 1.75, z); m.rotation.y = ry; m.receiveShadow = true; root.add(m);
      }
    }
    /* PIXAÇÃO em preto/prata sobre o zinco (BAR §4.4) — é diferente do grafite colorido:
       traço reto, alto e angular, uma passada de rolinho. Vai mais alto que o grafite e em
       pedaço menor, pra ler como tag e não como mural. */
    {
      const pix = [pixacaoTex(551), pixacaoTex(917)];
      for (const [x, z, ry, pi] of [[-6, -35.42, 0, 0], [18, -35.42, 0, 1], [-31.42, 10, Math.PI / 2, 1],
        [31.42, -4, -Math.PI / 2, 0], [-24, 35.34, Math.PI, 0], [26, 35.34, Math.PI, 1]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7),
          new THREE.MeshBasicMaterial({ map: pix[pi], transparent: true, alphaTest: 0.15 }));
        m.position.set(x, 2.65, z); m.rotation.y = ry; root.add(m);
      }
    }
    /* ===== DECALQUE RECORTADO (public/img/decals) — 3ª camada de tinta =====
       As vagas abaixo são as que SOBRAM: cada uma foi escolhida por não colidir com nenhum
       dos 9 murais de `T.graffiti` (6,2 m de largura), nenhuma das 6 pixações (3,4 m), nenhuma
       das 7 folhas de zinco escoradas (`leanZinc`, 2,6 m) e nem com a seta "↓ ENTRADA" do
       muro sul. Duas peças sobrepostas na mesma chapa não leem como muro pichado, leem como
       erro de asset — e chapa de 3,2 m não tem altura pra empilhar.
       2,60 m de altura contra os 2,2 m dos cartazes do Piscinão, que é o que foi pedido. */
    for (const x of [-30, -14, 2]) decal(D_MURAL, x, 0.3, -35.40, 0, 2.6, 4.5);           // muro norte
    for (const z of [-32, -14, 30]) decal(D_TAG, -31.40, 0.3, z, Math.PI / 2, 2.6, 4.5);   // muro oeste
    for (const z of [-32, -9, 16]) decal(D_TAG, 31.40, 0.3, z, -Math.PI / 2, 2.6, 4.5);    // muro leste
    for (const x of [-30, -8, 9, 30]) decal(D_MURAL, x, 0.3, 35.40, Math.PI, 2.6, 4.5);    // muro sul
    /* ADENSAMENTO (dono, 07/08): peça menor nos vãos entre as grandes dos 4 muros —
       intercalado, sem tocar chapa de zinco nem a seta ENTRADA (mesmos limites acima). */
    {
      let fk = 23;
      for (const x of [-24, -19, -7, 10, 16, 24]) {
        const k = (fk = (fk * 2654435761) >>> 0) >>> 8;
        decal(k % 3 === 0 ? D_LAMBE : D_TAG, x, k % 2 ? 0.35 : 1.4, -35.40, 0, 1.5, 2.4);
        decal(k % 3 === 1 ? D_LAMBE : D_TAG, x + 2, k % 2 ? 1.4 : 0.35, 35.40, Math.PI, 1.5, 2.4);
      }
      for (const z of [-26, -20, -6, 3, 10, 22, 27]) {
        const k = (fk = (fk * 2654435761) >>> 0) >>> 8;
        decal(D_TAG, -31.40, k % 2 ? 0.35 : 1.4, z, Math.PI / 2, 1.5, 2.4);
        decal(D_TAG, 31.40, k % 2 ? 1.4 : 0.35, z + 2, -Math.PI / 2, 1.5, 2.4);
      }
    }
    /* GALPÃO DO ZÉ — é o marco do spawn B e a única alvenaria do mapa. Frente (2 peças),
       lateral oeste e o trecho de lateral leste que não é vão de porta. */
    for (const x of [-9, -1]) decal(D_MURAL, x, 0.3, -26.68, 0, 2.7, 5.5);
    decal(D_MURAL, -12.32, 0.3, -31, -Math.PI / 2, 2.7, 6.0);
    decal(D_LAMBE, 2.32, 0.3, -28.25, Math.PI / 2, 2.7, 2.1);
    /* AS DUAS FOLHAS DO PORTÃO (ry = ∓0,9) — "portões" está na lista literal do dono, e
       portão de ferro velho pichado é o clichê certo. Face local ±x via `decalFace`. */
    decalFace(D_TAG, -5.2, HALF_Z - 2.2, 0.9, 1, 0.19, 0.35, 2.4, 3.8);
    decalFace(D_TAG, 5.2, HALF_Z - 2.2, -0.9, -1, 0.19, 0.35, 2.4, 3.8);
    // sucata/pneus encostados na base dos muros (quebra a linha reta do rodapé)
    const wallJunk = [[-30.6, -12, 0.3], [-30.6, 4, 1.2], [30.6, -22, 2.1], [30.6, 14, 0.6], [-8, -34.6, 1.7], [20, -34.6, 0.2], [-24, 34.6, 2.8], [12, 34.6, 1.1]];
    for (const [x, z, ry] of wallJunk) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.13, 8, 16), MAT.tire);
      t.rotation.x = Math.PI / 2; t.rotation.z = ry; t.position.set(x, 0.13, z); t.castShadow = t.receiveShadow = true; root.add(t);
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.4), rustMat(300 + (x | 0)));
      s.position.set(x + 0.5, 0.04, z + 0.4); s.rotation.y = ry; s.castShadow = true; root.add(s);
    }
    // postes + fios (catenária) cruzando o pátio — quebra o topo retilíneo do muro
    const postMat = lam({ color: 0x4a3b2c, roughness: 0.9 });
    const postTops = [];
    for (const [x, z] of [[-29, -33], [29, -33], [-29, 33], [29, 33]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 6.4, 8), postMat);
      p.position.set(x, 3.2, z); p.castShadow = true; root.add(p);
      postTops.push(new THREE.Vector3(x, 6.3, z));
    }
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x1c1a18 });
    const wire = (a, b, sag = 1.4) => {
      const mid = a.clone().lerp(b, 0.5); mid.y -= sag;
      const cur = new THREE.QuadraticBezierCurve3(a, mid, b);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(cur, 22, 0.022, 4), wireMat));
    };
    wire(postTops[0], postTops[1]); wire(postTops[2], postTops[3]); wire(postTops[0], postTops[2]); wire(postTops[1], postTops[3]);
    wire(postTops[0], postTops[3], 1.8);   // diagonal
    // caixa d'água no telhado do galpão + uma FORA do muro (silhueta de fundo)
    const waterTank = (x, y, z, s = 1) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 0.8 * s, 1.1 * s, 12), MAT.barrel);
      t.position.set(x, y + 0.55 * s, z); t.castShadow = true; root.add(t);
      const lid = new THREE.Mesh(new THREE.ConeGeometry(0.85 * s, 0.35 * s, 12), MAT.roof);
      lid.position.set(x, y + 1.1 * s + 0.17 * s, z); root.add(lid);
    };
    waterTank(-5, 3.7, -31);            // em cima do galpão
    waterTank(-19, 2.6, -41, 1.3);      // fora do muro norte, num suporte
    for (const [lx, lz] of [[-19.7, -41.7], [-18.3, -41.7], [-19.7, -40.3], [-18.3, -40.3]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.7, 6), postMat);
      leg.position.set(lx, 1.35, lz); root.add(leg);
    }
    // antenas no topo do muro
    for (const [x, z] of [[-31.4, -8], [31.4, 16]]) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), MAT.steel);
      a.position.set(x, 4.4, z); root.add(a);
      for (const wy of [4.9, 5.3]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.03), MAT.steel);
        bar.position.set(x, wy, z); root.add(bar);
      }
    }
    // SILHUETAS atrás dos muros em 2 camadas (opcional do crítico: skyline c/ haze) —
    // galpões, caixas d'água e árvores; camada 2 mais longe e mais "lavada" (sem fog no ferro)
    /* ===== CARTÕES DE SKYLINE — reescritos (B6/B7) =====
       O crítico mediu "silhuetas de casas cinza chapadas": cada cartão era literalmente
       um `fillRect` de UMA cor, sem telhado, sem janela, sem contato com o chão. Um
       retângulo de cor plana com >5% do frame é reprovação automática em B6.
       Agora o canvas é desenhado em ESCALA DE CINZA com volume de verdade (parede clara ×
       empena escura × beiral, fiada de janelas, escorrimento de chuva, faixa de contato) e
       a COR do cartão vem do `material.color`, que multiplica o map. Consequência boa de
       graça: os 10 cartões passam a sair de 4 canvas em vez de 10 (menos custo de carga),
       e espelhar no U dobra as variações — `clone()` compartilha o `source`, então
       continua UMA textura na GPU. */
    const skyTexCache = {};
    const skyCardTex = (kind, seed) => {
      const key = kind + '_' + seed;
      if (skyTexCache[key]) return skyTexCache[key];
      const W = 256, H = 128, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      // cinza levemente quente: o tint do material faz o resto (terra/mato/haze)
      const g = (v, a = 1) => `rgba(${Math.min(255, v) | 0},${Math.min(255, v * 0.975) | 0},${Math.min(255, v * 0.925) | 0},${a})`;
      const base = H - 2;
      if (kind === 'sheds') {
        let bx = 2 + rnd() * 8;
        while (bx < W - 24) {
          const bw = 34 + rnd() * 46, bh = 32 + rnd() * 44, tone = 172 + rnd() * 52;
          x.fillStyle = g(tone); x.fillRect(bx, base - bh, bw, bh);                    // parede ao sol
          x.fillStyle = g(tone * 0.70);                                                // empena/telhado de água
          x.beginPath(); x.moveTo(bx - 4, base - bh); x.lineTo(bx + bw * 0.5, base - bh - 8 - rnd() * 11); x.lineTo(bx + bw + 4, base - bh); x.fill();
          x.fillStyle = g(tone * 0.82); x.fillRect(bx, base - bh, bw, 3);              // beiral
          for (let r = 0; r < 1 + ((rnd() * 3) | 0); r++) {                             // fiadas de janela
            const wy = base - bh + 11 + r * 14; if (wy > base - 8) break;
            for (let k = 0; bx + 7 + k * 11 < bx + bw - 7; k++) {
              if (rnd() > 0.76) continue;
              x.fillStyle = g(tone * (rnd() > 0.5 ? 0.5 : 0.66));
              x.fillRect(bx + 7 + k * 11, wy, 6, 8);
            }
          }
          for (let s2 = 0; s2 < 4; s2++) {                                              // escorrimento de chuva
            x.fillStyle = g(tone * 0.62, 0.35 + rnd() * 0.3);
            x.fillRect(bx + 3 + rnd() * (bw - 6), base - bh + 4, 1 + rnd() * 3, bh * (0.25 + rnd() * 0.6));
          }
          x.fillStyle = g(tone * 0.48, 0.55); x.fillRect(bx, base - 3, bw, 3);          // sombra de contato
          bx += bw + 2 + rnd() * 12;
        }
        const tx = 30 + rnd() * 190;                                                    // caixa d'água em torre
        x.fillStyle = g(140); x.fillRect(tx - 2, base - 96, 4, 96);
        x.fillStyle = g(190); x.fillRect(tx - 10, base - 110, 20, 14);
        x.fillStyle = g(130); x.fillRect(tx - 10, base - 110, 20, 3);
      } else if (kind === 'favela') {
        /* ENCOSTA DE FAVELA (08/2026 — a silhueta do fundo do beco na referência do dono):
           caixinhas empilhadas em fileiras que sobem em degraus, tons quentes variados,
           janelinha, laje e caixa d'água de amianto. O tint do material dá a cor final. */
        for (let row = 0; row < 7; row++) {
          const ry0 = base - row * 13;
          const xOff = (6 - row) * 9 + rnd() * 6;                 // encosta recua à esquerda ao subir
          for (let bx = xOff; bx < W - 10; bx += 9 + rnd() * 7) {
            if (rnd() < 0.12) continue;                           // clareiras/vegetação
            const bw = 8 + rnd() * 6, bh = 7 + rnd() * 6, tone = 150 + rnd() * 70;
            x.fillStyle = g(tone); x.fillRect(bx, ry0 - bh, bw, bh);
            x.fillStyle = g(tone * 0.72); x.fillRect(bx, ry0 - bh - 2, bw, 2);          // laje
            if (rnd() > 0.4) { x.fillStyle = g(tone * 0.5); x.fillRect(bx + 2, ry0 - bh + 2, 2, 3); }   // janela
            if (rnd() > 0.75) { x.fillStyle = g(120); x.fillRect(bx + bw / 2 - 1, ry0 - bh - 6, 2, 5); } // caixa d'água
          }
        }
        x.fillStyle = g(110, 0.6); x.fillRect(0, base - 3, W, 3);   // sombra de contato
      } else {
        for (const [ttx, tr] of [[30 + rnd() * 14, 26 + rnd() * 12], [112 + rnd() * 18, 30 + rnd() * 12], [196 + rnd() * 16, 22 + rnd() * 12]]) {
          x.fillStyle = g(120); x.fillRect(ttx - 3, base - 34, 6, 34);                  // tronco
          for (let i = 0; i < 9; i++) {                                                 // copa em 2 tons (volume)
            const lit = rnd() > 0.45;
            x.fillStyle = g(lit ? 205 : 138, 0.95);
            x.beginPath(); x.ellipse(ttx + (rnd() - 0.5) * tr, base - 38 - rnd() * tr * 0.85,
              tr * (0.34 + rnd() * 0.36), tr * (0.26 + rnd() * 0.3), rnd() * 3, 0, 7); x.fill();
          }
        }
        // um barracão baixo entre as árvores + poste: quebra o "mato só" e dá escala
        const sx0 = 132 + rnd() * 40, sw = 38, sh = 24;
        x.fillStyle = g(196); x.fillRect(sx0, base - sh, sw, sh);
        x.fillStyle = g(132); x.fillRect(sx0 - 3, base - sh - 4, sw + 6, 5);
        x.fillStyle = g(150, 0.5); x.fillRect(sx0, base - 3, sw, 3);
        x.fillStyle = g(115); x.fillRect(72, base - 74, 3, 74);
        for (const dy of [66, 60]) x.fillRect(66, base - dy, 15, 2);
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      skyTexCache[key] = t; return t;
    };
    const skyCard = (kind, seed, tint, x, z, ry, w, h, mirror) => {
      const t = skyCardTex(kind, seed).clone();
      if (mirror) { t.repeat.x = -1; t.offset.x = 1; }   // espelho: u'=1-u, nunca sai de [0,1]
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(tint), transparent: true, alphaTest: 0.05 }));
      m.position.set(x, h / 2 - 0.3, z); m.rotation.y = ry; root.add(m);
    };
    // camada 1 (perto, mais escura) — entre as pilhas do anel externo
    skyCard('sheds', 13, '#8a7c69', -14, -47, 0, 26, 9); skyCard('trees', 24, '#79876a', 18, -48, 0, 22, 8, true);
    skyCard('trees', 41, '#79876a', -46, 16, Math.PI / 2, 22, 8); skyCard('sheds', 29, '#8a7c69', 47, -12, -Math.PI / 2, 26, 9, true);
    skyCard('sheds', 13, '#847767', 10, 47, Math.PI, 24, 8, true); skyCard('trees', 24, '#727f64', -20, 48, Math.PI, 22, 8);
    // camada 2 (longe, lavada de haze — tint puxado pra cor da névoa 0xd9b98c)
    skyCard('sheds', 29, '#c6b79c', 6, -60, 0, 34, 12); skyCard('trees', 41, '#c2bda4', -58, -20, Math.PI / 2, 30, 11, true);
    skyCard('sheds', 13, '#c6b79c', 60, 22, -Math.PI / 2, 32, 12, true); skyCard('trees', 24, '#c2bda4', -8, 60, Math.PI, 30, 11);
    // FAVELA no fundo norte (a silhueta da imagem-conceito, no fim do cânion do beco)
    skyCard('favela', 51, '#c9a882', -10, -62, 0, 40, 13);
    skyCard('favela', 77, '#b89a80', 26, -58, 0, 30, 11, true);
    // chapas de zinco grandes no muro SUL do spawn (opcional do crítico: "2 chapas marrom-chapadas")
    for (const px of [-16.5, 16.5]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.0), lam({ map: zincTex(4.5, 1.2) }));
      m.position.set(px, 1.55, HALF_Z - 0.56); m.rotation.y = Math.PI; m.receiveShadow = true; root.add(m);
    }
    // céu: disco solar + nuvens (sprites com fog:false — sprite de céu não deve receber névoa)
    const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.sunSprite, transparent: true, fog: false, depthWrite: false }));
    // disco solar BAIXO, alinhado com a nova direcional (-46,20,32): é o sol rasante de
    // fim de tarde que justifica as sombras longas e o specular correndo pelo zinco.
    sunSpr.position.set(-92, 40, 64); sunSpr.scale.setScalar(58); root.add(sunSpr);
    if (T.cloud) for (const [cx, cy, cz, cs] of [[-60, 55, -80, 44], [30, 62, -90, 52], [80, 50, 40, 40], [-80, 58, 60, 46]]) {
      const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.cloud, transparent: true, fog: false, depthWrite: false, opacity: 0.85 }));
      cl.position.set(cx, cy, cz); cl.scale.set(cs, cs * 0.42, 1); root.add(cl);
    }
  }

  /* ===== LUZ: FIM DE TARDE (BAR §4.4: "o mais flexível dos quatro; fim de tarde funciona
     melhor — sol rasante fazendo o specular correr pelas chapas onduladas, sombras longas
     entre as pilhas, poeira em suspensão, céu levemente alaranjado").
     O sol saiu de (-24,48,30) — ~55° de elevação, sombra curta, meio-dia disfarçado — para
     ~22° de elevação: a sombra fica ~2,5× mais longa e é ELA que desenha os corredores
     entre as pilhas. Cor mais quente e âmbar; o hemi ganha bounce quente do chão de terra. */
  setMapSky(scene, T, '/img/textures/sky_ferrovelho.webp', 0xc8b49a);
  // Sol de FIM DE TARDE (08/2026 — clima da referência BECO OESTE): mais baixo (sombras
  // longas atravessando o pátio) e mais quente; hemi acompanha. Era 0xffd39a em (-46,20,32).
  const hemi = new THREE.HemisphereLight(0xffdfb0, 0x5a4530, 0.95); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc07a, 1.65); sun.position.set(-52, 14, 36); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -50; sun.shadow.camera.right = 50; sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50; sun.shadow.camera.far = 200; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  /* NÉVOA: o mapa era o único dos quatro sem fog e por isso o fundo colava no primeiro
     plano. A regressão antiga (tela preto-avermelhada com o composer) era com fog denso e
     cor escura; aqui a cor é a MESMA do céu de tarde e o near é longe (55 m), então mesmo
     que o composer some algo o efeito é sutil. Kill-switch padrão ?nofog=1. */
  /* R9 — a névoa era LINEAR (55→235) e BEGE FIXA, e o mapa tinha a pior razão de contraste
     longe/perto dos quatro. Dois erros somados: (a) entre 0 e 55 m a névoa valia zero, ou
     seja, o pátio inteiro sem gradiente de profundidade; (b) o céu MEDIDO logo acima da
     silhueta do muro é 0xa5c5e5 (azul), não 0xd9b98c (bege) — a névoa bege contra céu azul
     é literalmente o desenho da aresta. Agora FogExp2 ρ = 0,0112 (18 % a 40 m, 46 % a 70 m,
     84 % a 120 m, 99 % a 200 m) com base azul e CONTRALUZ QUENTE: com o sol rasante em
     (-46,20,32), olhar na direção dele devolve o âmbar de fim de tarde do mapa; olhar de
     costas devolve azul. É exatamente o que a atmosfera faz e é o que dá o topo/fundo que
     a cor fixa não dava. ?nofog=1 / ?fog2=0 / ?fogd=NN. */
  if (QP.get('nofog') !== '1') scene.fog = makeAerialFog('ferro_velho');
  /* POEIRA EM SUSPENSÃO — o pó do pátio pegando o sol rasante. Points com sprite macio,
     additive, sem depthWrite; estático (o mapa não tem hook de update) mas em 3 camadas de
     altura, o que já dá volume. ?dust=0 desliga; em 'low' não entra. */
  if (!LOWQ && QP.get('dust') !== '0' && T.sunSprite) {
    const N = 900, pos = new Float32Array(N * 3);
    let ds = 7717; const r = () => (ds = (ds * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      // teto do pó 7,5 m -> 4,2 m: acima da linha dos muros as partículas aditivas apareciam
      // como PONTINHOS BRANCOS soltos no céu (o céu não escreve profundidade, então não há o
      // que ocluí-las lá em cima). Pó de pátio fica baixo mesmo; o expoente 1,8 concentra
      // ainda mais perto do chão, que é onde ele pega o sol rasante e faz sentido.
      pos[i * 3] = (r() - 0.5) * 2 * HALF_X; pos[i * 3 + 1] = 0.3 + Math.pow(r(), 1.8) * 4.2; pos[i * 3 + 2] = (r() - 0.5) * 2 * HALF_Z;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({
      map: T.sunSprite, color: 0xffd9a8, size: 0.075, sizeAttenuation: true,
      transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    p.frustumCulled = false; root.add(p);
  }
  /* GOD RAYS BARATOS — cones/lâminas aditivas alinhadas com a direção do sol, saindo dos
     furos do telhado de fibrocimento e dos vãos entre as pilhas. É o truque clássico de
     "light shaft" em geometria: um cone aberto, sem depthWrite, com opacidade baixinha.
     Custa 6 tris-quads e nenhum passe extra. ?rays=0 desliga; fora em 'low'. */
  /* R10 — DESLIGADO POR PADRÃO (opt-in com ?rays=1). A R9 consertou a DIREÇÃO do cone,
     mas o defeito de raiz é outro: god ray é efeito de recinto fechado (feixe cortando
     poeira dentro de um galpão). Num pátio a céu aberto ao meio-dia não há nada na frente
     pra ocluir o cone, então ele lê como uma CUNHA TRANSLÚCIDA atravessando o quadro —
     confirmado pelo dono em jogo e visível em /root/shots/r3b/game-ferro_velho-32-b.png,
     mesmo depois do fix de direção. Régua nova (BAR-CONSISTENCIA §5): efeito que o jogador
     percebe como bug vale menos que a beleza que ele adiciona. Volta se um dia o mapa
     ganhar um galpão coberto de verdade. */
  if (!LOWQ && QP.get('rays') === '1') {
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.075, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    const dir = new THREE.Vector3(-46, 20, 32).normalize();
    /* BUG CORRIGIDO NA R9 — "riscos diagonais branco-claros no céu".
       O cone era posicionado em `+ dir * len/2`, ou seja, SUBINDO na direção do sol a partir
       da abertura. Um shaft de 9 m com dir.y = 0,34 terminava a 7,2 m de altura, acima de
       tudo que existe no pátio (muros e pilhas têm ~3 m) — e como o céu é `scene.background`
       (não escreve profundidade) e o material é aditivo com depthWrite:false, o quad passava
       por cima do céu. Daí as cunhas pálidas atravessando o azul em -169-b e -169-d: não era
       flare, era o god ray inteiro sem NADA na frente pra ocluí-lo.
       Luz não sobe: o shaft desce DA abertura PRO CHÃO. Com `- dir` a ponta larga (raio `w`,
       o -Y local do cone) cai em y = 0,3-1,2 m, dentro do pátio e atrás das carcaças, e a
       ponta fina fica na abertura — que também é o desenho fisicamente certo (o feixe abre
       conforme viaja). Kill-switch ?rays=0 continua valendo. */
    const shaft = (x, y, z, len, w) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.25, w, len, 6, 1, true), rayMat);
      // o cone nasce apontando +Y; gira pra alinhar +Y com o SOL (ponta fina na abertura)
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      // e o corpo desce a partir da abertura, no sentido em que a luz viaja (-dir)
      m.position.set(x - dir.x * len * 0.5, y - dir.y * len * 0.5, z - dir.z * len * 0.5);
      m.renderOrder = 3; root.add(m);
    };
    shaft(-5, 3.6, -31, 7.5, 1.1); shaft(-9, 3.6, -29.5, 6.5, 0.9);   // furos do telhado do barraco
    shaft(-11, 3.0, -13, 8, 1.3); shaft(11, 3.0, 1, 8, 1.3);          // vãos entre as paredes de carcaça
    shaft(-11, 3.0, 15, 7, 1.1); shaft(21, 3.0, -20, 7, 1.1);
    shaft(0, 4.2, HALF_Z - 2, 9, 1.6);                                 // vão do portão
  }

  // ===== ground height (pátio plano) =====
  const groundHeightAt = () => 0;

  // ===== waypoints + A* =====
  const nodes = [], adj = [], STEP = 3.4;
  const blocked = (x, z, inf) => { for (const c of colliders) { if (x > c.minX - inf && x < c.maxX + inf && z > c.minZ - inf && z < c.maxZ + inf && c.minY < 1.6 && c.maxY > 0.15) return true; } return false; };
  for (let gx = -HALF_X + 2; gx <= HALF_X - 2; gx += STEP)
    for (let gz = -HALF_Z + 2; gz <= HALF_Z - 2; gz += STEP)
      if (!blocked(gx, gz, 0.5)) nodes.push({ x: gx, z: gz });
  const segClear = (a, b) => { for (let i = 1; i < 6; i++) { const t = i / 6, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t; if (blocked(x, z, 0.25)) return false; } return true; };
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

  // spawns: P no PORTÃO (sul, olhando pro pátio -z → yaw 0); B ao lado do GALPÃO (norte,
  // olhando +z → yaw π). Convenção do game.js: forward = (-sin yaw, -cos yaw).
  const spawns = {
    /* [-6,-2,2,6] -> [-3.6,-1.2,1.2,3.6] (invariante MAP2B). O vão do portão de correr é
       x ∈ [−5,1 , 5,1]; os slots das pontas estavam em ±6, ou seja, FORA do vão, a 0,67 m da
       folha recolhida — o corpo tem 0,38 m de raio, então dois dos quatro jogadores nasciam
       praticamente encostados na chapa de zinco. Dentro do vão a folga vira 1,50 m e os 4
       slots ficam a 2,4 m um do outro. */
    E: [-3.6, -1.2, 1.2, 3.6].map(x => ({ x, z: HALF_Z - 3, yaw: 0 })),
    B: [-14, -9, -4, 1].map(x => ({ x, z: -25, yaw: Math.PI })),
  };
  // 4 bandeiras (dono): 1 CENTRAL + as outras ESPAÇADAS, e NENHUMA no respawn (a antiga
  // 'PORTÃO' 0,31 nascia colada no spawn P z33; a 'GALPÃO' -16,-31 atrás do spawn B z-25).
  // Agora: centro + sudoeste (13 m à frente do spawn P) + leste + norte (11 m à frente do B).
  const ctfPoints = [
    { id: 'E', label: 'CENTRO', x: 0, z: 2 },
    { id: 'W', label: BECO ? 'BECO OESTE' : 'BECO SUL', x: BECO ? -23 : -20, z: BECO ? 4 : 20 },
    /* PÁTIO LESTE saiu de (24, 0) para (26, -16). Motivo MEDIDO (tools/eval/map-check.mjs,
       invariante CTF1): com CENTRO (0,2), BECO OESTE (-23,4) e PÁTIO LESTE (24,0) as três
       ficavam praticamente na MESMA RETA — a altura desse triângulo era 0,04 m, contra um
       raio de captura de 4,5 m. Três bandeiras colineares viram um corredor: o caminho mais
       curto entre as duas pontas passa DENTRO do anel do meio, que é o mecanismo do "os bots
       ficam todos na bandeira do meio". Com o pátio deslocado 16 m pro norte a menor altura
       de triângulo entre as 4 bandeiras vai a 6,8 m — acima do raio do anel. */
    { id: 'E', label: 'PÁTIO LESTE', x: 26, z: -16 },
    { id: 'B', label: 'GALPÃO', x: -8, z: -14 },
  ];

  // arsenal: shotgun/rifles no miolo do labirinto, snipers nos cantos, pistolas no spawn
  const gmat = lam({ color: 0x20242a });
  const place = (kind, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 1.0), gmat); m.position.set(x, 0.1, z); m.castShadow = true; root.add(m); pickups.push({ x, z, kind, weapon: kind, readyAt: 0, mesh: m }); };
  place('shotgun', -12, -2); place('ak', 4, 0); place('m4', 0, 12); place('mp5', -2, -14);
  place('awp', 29, -22); place('m400', -24, 14);
  place('deagle', -4, 31); place('ak', 0, 31); place('shotgun', 4, 28); place('m4', 8, 33);

  // saia de contato: todas as bases registradas viram UMA malha mesclada = 1 draw call
  SKIRT.build(root);

  /* ═══ PASSADA DE GRAFITE (07/08) ══════════════════════════════════════════
     Pedido do dono: "no ferro velho em todas paredes que derem, não só do escritório
     mas dos muros em volta". As 44 peças à mão vivem no escritório e no portão; o muro
     do perímetro, os contêineres e as pilhas de lataria estavam limpos.
     Ferro velho é o lugar mais bombardeado que existe na vida real — muro de fundo de
     pátio é a superfície preferida de quem pinta, justamente porque ninguém reclama. */
  grafitar({
    id: 'ferro_velho',
    root, T, waypoints: nodes, seed: 8123, passo: 0.95, alcance: 9, cobre: 0.06, minLarg: 0.32,
    /* NEM LATARIA NEM MATO (dono, 07/08: "não faz sentido grafite nos carros e na
       grama, só nas paredes em volta mesmo e no escritório"). Ferro velho de verdade
       tem o muro bombardeado e a sucata limpa — ninguém picha carro que vai pra prensa.
       Por TIPO e não por zona: a lataria empilhada fica no meio do pátio que DEVE ser
       pichado, então recorte por coordenada pegaria o muro junto. */
    evitar: /car|carro|wreck|junk|prensa|guindaste|pneu|tire|grama|grass|mato|bush|planta|plant|folha_|leaf|arbusto|weed/i,
    bandas: [
      /* CARTAZ DA COLEÇÃO (07/08). Reprovação: "tem diversos posters da minha coleção
         e tb que vc gerou que não estão em nenhum mapa". Eram 30 arquivos vivendo em
         2 dos 5 mapas, e mesmo nesses só ~6 entravam por rodada (a vaga era fixa).
         Aqui eles entram como lambe-lambe: banda do olho, tamanho de papel colado, e
         `chance` baixa de propósito — cartaz é tempero, parede de cartaz vira outdoor. */
      { y0: 0.4, y1: 2.6, larg: 1.9, alturas: [1.5, 1.15, 0.85], chance: 24, fonte: 'poster',
        pool: (T.posterFiles || []).map((_, i) => i) },
      { y0: 0.3, y1: 2.6, larg: 3.6, alturas: [2.1, 1.55, 1.1, 0.8, 0.6],
        pool: D_TAG.concat(D_MURAL) },
      { y0: 2.5, y1: 5.0, larg: 4.8, alturas: [2.2, 1.6, 1.1],
        pool: D_MURAL.concat(D_TAG) },
      { y0: 0.3, y1: 3.0, larg: 1.6, alturas: [0.9, 0.65, 0.45], planura: 0.5,
        pool: D_TAG },
    ],
    murais: { texturas: T.muraisHom, nomes: T.muraisHomNomes, seed: 61, separacao: 13 },
  });

  /* BUG-57: ferro velho é território de RATO — e o caramelo guarda o pátio. */
  const ambience = createFavelaAmbience(root, {
    map: 'ferro_velho',
    rats: [
      { pos: [-11, 0, -4], to: [-8.5, 0, -1.5], phase: .2 }, { pos: [5, 0, 1.5], to: [7.5, 0, 3.5], phase: 1.0 },
      { pos: [-1, 0, 13.5], to: [1.5, 0, 15.5], phase: 1.9 }, { pos: [-23, 0, 12.5], to: [-20.5, 0, 15], phase: 2.8 },
    ],
    pigeons: [
      { mode: 'ground', pos: [3, 0, -16], phase: .6 },
      { mode: 'flight', pos: [0, 11, 0], radius: [7, 5], phase: 1.5 },
    ],
    dogs: [{ pos: [-3, 0, 29], to: [1.5, 0, 29], phase: .4 }],
  });

  return {
    ambience,
    root, colliders, occluders, groundHeightAt, spawns, sun, hemi, pickups, ctfPoints,
    /* DECLARAÇÃO PRA RÉGUA (tools/eval/decal-probe.mjs): a lista COMPLETA contra a qual o
       `paredeAtras` validou cada decalque = colliders + as duas folhas giradas do portão. */
    decalSolids: colliders.concat(decalSolids),
    waypoints: { nodes, adj }, nearestWaypoint, findPath,
    bounds: { minX: -HALF_X + 0.5, maxX: HALF_X - 0.5, minZ: -HALF_Z + 0.5, maxZ: HALF_Z - 0.5 },
  };
}
