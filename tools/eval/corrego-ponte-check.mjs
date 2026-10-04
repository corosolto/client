/* ============================================================================
   corrego-ponte-check.mjs — ESCALA E TRAVESSIA DAS 4 PONTES DO CÓRREGO (#681)
   ============================================================================
   A issue chegou sem dizer qual ponte: são três baixas (z=-22, 0, 22) e uma
   elevada (z=-11, y=5,6 m). Esta régua mede as QUATRO contra a mesma
   referência humana e devolve qual delas está fora de escala.

   REFERÊNCIA HUMANA — números que o JOGO já usa, nenhum inventado aqui:
     · corpo 1,72 m          glbchars.js TARGET_HEIGHT (char-probe TARGET_H)
     · olho 1,62 m           game.js:6094 (`1.62 - 0.52 * crouchF`)
     · diâmetro 0,76 m       game.js `_collide(pos, 0.38)` — raio de corpo
     · degrau 0,55 m         game.js STEP_H — o que o corpo sobe sem parar

   TETOS — um lugar só, com a procedência de cada um (lei 2):
     · PON1 banda navegável: a malha é quem vale (lei 7) — não um número à mão.
     · PON2 vão livre: 2,00 m, o QUEDA_ANDAR do map-check.mjs:151 — abaixo
       disso a borda é "queda perigosa" na convenção da própria base.
     · PON3 guarda-corpo: 0,90 m, o mínimo de corrimão que a base usa em
       `ponte()` e o que o corpo (1,72 m) cobre até a cintura.

   USO
     node tools/eval/corrego-ponte-check.mjs
     node tools/eval/corrego-ponte-check.mjs --mutante=<nome>
     node tools/eval/corrego-ponte-check.mjs --json

   Sai 1 se qualquer cláusula reprovar, ou se um mutante NÃO acender cláusula
   nenhuma (mutante cego é portão cego — lei 3).
   ============================================================================ */
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------------------
   1. TETOS E REFERÊNCIA
   --------------------------------------------------------------------------- */
export const CORPO = 1.72;          // glbchars.js TARGET_HEIGHT
export const DIAMETRO = 0.76;       // _collide raio 0.38 × 2
export const DEGRAU = 0.55;         // game.js STEP_H
export const VAO_MIN = 2.00;        // map-check.mjs:151 QUEDA_ANDAR
export const GUARDA_MIN = 0.90;     // altura de guarda-corpo sobre o piso
export const TOL_PISO = 0.02;       // folga entre malha, colisor e navegação
export const BANDA_FOLGA = 0.05;    // faixa navegável pode ULTRAPASSAR a malha em até isto

/* As quatro travessias saem do próprio mapa (`ponte()` e `PASS` em
   map_corrego.js). Repetidas aqui porque o módulo não as exporta — e a
   checagem de sanidade abaixo reprova se a sonda não achar o que está
   declarado, senão a régua passa medindo geometria que ninguém construiu. */
const PONTES_BAIXAS = [
  { id: 'norte', z: -22, largura: 3.0, guarda: true },
  { id: 'central', z: 0, largura: 1.8, guarda: false },
  { id: 'sul', z: 22, largura: 3.0, guarda: false },
];
const PASS = { z: -11, y: 5.6, meiaL: 1.25, x0: 13.6 };
const CANAL_FUNDO = -1.75;           // espelho de map_corrego.js:32
const AGUA = CANAL_FUNDO + 0.14;

const MUTANTES = {
  'guarda-fora': 'PON3',       // a guarda volta para FORA da borda do tabuleiro
  'banda-estreita': 'PON1',    // groundHeightAt volta a reconhecer só 5,2 m
  'piso-afundado': 'PON1',     // as tábuas voltam a furar o pé (topo ≠ navegação)
  'vao-baixo': 'PON2',         // o tabuleiro desce e o vão livre fecha
};

const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
if (mutante && !MUTANTES[mutante]) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }
const JSON_OUT = process.argv.includes('--json');

/* ---------------------------------------------------------------------------
   2. MUNDO CONSTRUÍDO DE VERDADE
   --------------------------------------------------------------------------- */
const { THREE, initTextures, bootGame } = await import('./harness.mjs');
const { rotasSeparadas } = await import('./rotas-separadas.mjs');
const game = bootGame('corrego', { textures: initTextures(), ctf: true, seed: 13007 });
const W = game.world;
W.root.updateMatrixWorld(true);

const cols = W.colliders || [];
const gh0 = W.groundHeightAt;
let gh = gh0;
/* O id do `userData` é `ponte-<z>` nas duas pontes sem guarda especial
   (`norte` é o único nome próprio) — mesmo espelho do `corregoBridgeBoard`
   em map_corrego.js:647. Ler a chave errada fazia a régua declarar "nenhuma
   tábua desenhada" nas duas pontes que têm tábuas. */
const idTábua = (p) => (p.id === 'norte' ? 'norte' : `ponte-${p.z}`);

const r2 = (v) => Math.round(v * 100) / 100;
const BB = new THREE.Box3();

/* ---- malha das tábuas: o que o jogador VÊ pisando ---- */
const tabuas = {};          // id da ponte -> topo visual (bbox max.y)
W.root.traverse((o) => {
  if (!o.isMesh || !o.userData || typeof o.userData.corregoBridgeBoard !== 'string') return;
  BB.setFromObject(o);
  const id = o.userData.corregoBridgeBoard;
  (tabuas[id] ||= []).push(BB.max.y);
});

/* ---- tabuleiro: o colisor largo MAIS BAIXO no plano. O `sort` por largura
       pegava a COBERTURA da ponte sul (z=22, y=2,5) em vez do tabuleiro —
       a régua media o telhado de zinco e chamava de ponte (lei 7). ---- */
const tabuleiro = (z) => cols
  .filter((c) => Math.abs((c.minZ + c.maxZ) / 2 - z) < 1.2 && (c.maxX - c.minX) > 8
    && c.maxY < 1.5 && c.maxY - c.minY < 0.6)
  .sort((a, c) => (c.maxX - c.minX) - (a.maxX - a.minX))[0];

/* ---- guarda-corpo: peça estreita e alta APOIADA no tabuleiro. Sem o
       filtro de apoio a sonda pegava o muro de 2,8 m do sobrado e media
       2,62 m de "guarda". ---- */
const guardas = (z, piso) => cols.filter((c) => Math.abs((c.minZ + c.maxZ) / 2 - z) < 1.6
  && (c.maxX - c.minX) < 0.6 && (c.maxZ - c.minZ) > 2 && c.maxY - c.minY > 0.4
  && Math.abs(c.minY - piso) < 0.25);
if (mutante === 'piso-afundado') {
  for (const id of Object.keys(tabuas)) tabuas[id] = tabuas[id].map((t) => t + 0.09);   // tábuas furam o pé
}
if (mutante === 'guarda-fora') {
  // A guarda sai da borda do tabuleiro para o ar: é o defeito que a malha tinha.
  for (const c of guardas(-22, tabuleiro(-22).maxY)) { const d = c.maxX - c.minX; c.minX += 0.45; c.maxX = c.minX + d; }
}
if (mutante === 'vao-baixo') {
  // O tabuleiro desce: o vão de 2,00 m sobre a rota baixa fecha.
  const t = tabuleiro(-22);
  if (t) { t.minY -= 0.40; t.maxY -= 0.40; }
}
/* `banda-estreita`: a faixa volta aos 5,2 m — a ponte some debaixo dos pés
   antes da borda. Some SOB a malha que existe, que é o defeito: o corpo via
   a madeira e não tem chão. */
if (mutante === 'banda-estreita') {
  const ghBase = gh0;
  gh = (x, z, y) => {
    const h = ghBase(x, z, y);
    const ax = Math.abs(x);

    const naPonte = Math.abs(z + 22) <= 1.5 || Math.abs(z) <= 0.9 || Math.abs(z - 22) <= 1.5;
    if (naPonte && ax > 5.2 && ax <= 6 && h > CANAL_FUNDO) return 0;
    return h;
  };
}

/* ---------------------------------------------------------------------------
   3. AS QUATRO TRAVESSIAS, MEDIDAS
   --------------------------------------------------------------------------- */
const falhas = [];
const infos = [];
const medir = [];

for (const p of PONTES_BAIXAS) {
  const t = tabuleiro(p.z);
  if (!t) {
    falhas.push(`PONTES ${p.id} (z=${p.z}): nenhum tabuleiro construído no plano — a régua não pode medir o que o mapa não fez`);
    continue;
  }
  const malhaMeiaL = (t.maxX - t.minX) / 2;
  const pisoMalha = t.maxY;                       // face de cima do colisor = o que se pisa
  const pisoNav = gh(0, p.z, pisoMalha);          // o que a navegação devolve
  const tops = tabuas[idTábua(p)] || [];
  if (!tops.length) falhas.push(`PONTES ${p.id}: nenhuma tábua desenhada no plano — a travessia é um colisor invisível`);
  /* O piso que o pé sente é a TÁBUA MAIS ALTA, não a média: as tábuas têm
     ondulação de propósito e a média delas é um número que não existe em
     lugar nenhum do mundo (medido: média 0,38 com a mais alta em 0,40). */
  const pisoVisualMax = tops.length ? Math.max(...tops) : null;
  const pisoVisual = pisoVisualMax;

  /* SANIDADE (lei 7): o que a régua mediu é a ponte declarada? Sem isto ela
     passa com VERDE sobre um tabuleiro que sobrou de outra revisão. */
  if (Math.abs((t.maxZ - t.minZ)) > p.largura + 0.4) {
    falhas.push(`PONTES ${p.id}: tabuleiro medido com ${r2(t.maxZ - t.minZ)} m de largura, o mapa declara ${p.largura} m — a régua está medindo outra coisa`);
  }

  /* A BANDA NAVEGÁVEL: até onde `groundHeightAt` devolve o piso da ponte? A
     sonda anda pelo eixo x em passos de 5 cm a partir do eixo do canal. */
  let bandaNav = 0;
  for (let x = 0; x <= 12; x += 0.05) {
    if (Math.abs(gh(x, p.z, pisoMalha) - pisoNav) < 1e-6) bandaNav = x;
    else break;
  }

  /* CORPO: a faixa é andável de ponta a ponta? `groundHeightAt` pode dizer que
     o piso é o da ponte enquanto o colisor já acabou — e o corpo fica preso
     numa tira de 27 cm que ele vê e não alcança. */
  let xCorpo = 0, travou = null;
  for (let s = 0; s <= 240; s++) {
    const x = (malhaMeiaL * s) / 240;
    const y = gh(x, p.z, pisoMalha);
    if (y !== pisoNav) { travou = { x: r2(x), y: r2(y) }; break; }
    xCorpo = x;
  }

  /* A guarda é a peça apoiada no tabuleiro e PERTO da borda dele. Sem o
     recorte, a sonda pegava o muro de 2,8 m do sobrado (x=-14,2) e media
     2,8 m de "guarda-corpo" (lei 7). O recorte de 0,5 m mantém a guarda de
     fora — que é justamente o defeito do PON3 — e descarta o resto da rua. */
  const gs = guardas(p.z, pisoMalha).filter((c) => Math.abs((c.minX + c.maxX) / 2) <= malhaMeiaL + 0.5);
  const guarda = gs.length
    ? (() => {
      const g = gs.reduce((a, c) => (Math.abs((c.minX + c.maxX) / 2) > Math.abs((a.minX + a.maxX) / 2) ? c : a));
      const xMeio = (g.minX + g.maxX) / 2;
      return { xMeio: r2(xMeio), alt: r2(g.maxY - g.minY), acimaDoPiso: r2(g.maxY - pisoMalha), dentroDaBorda: Math.abs(xMeio) <= malhaMeiaL };
    })()
    : null;

  /* O vão mede do INTRADORSO (face de baixo do colisor), não do topo: é o que
     quem anda no leito do canal tem na cabeça. Medir do topo dava 1,93 m e
     disfarçava o furo — o intradorso está em y=0 e dá 1,75 m. */
  const vao = t.minY - CANAL_FUNDO;
  const vaoAgua = t.minY - AGUA;
  medir.push({
    id: p.id, z: p.z, largura: r2(t.maxZ - t.minZ), guardaDeclarada: p.guarda,
    malhaMeiaL: r2(malhaMeiaL), bandaNav: r2(bandaNav), xCorpo: r2(xCorpo),
    pisoMalha: r2(pisoMalha), pisoNav: r2(pisoNav), pisoVisual: r2(pisoVisual), pisoVisualMax: r2(pisoVisualMax),
    vao: r2(vao), vaoAgua: r2(vaoAgua),
    guarda, guardaPresente: !!guarda, travou,
  });

  infos.push(`${p.id} (z=${p.z}): malha ${r2(t.maxX - t.minX)}×${r2(t.maxZ - t.minZ)} m · piso malha ${r2(pisoMalha)} / nav ${r2(pisoNav)} / tábua ${r2(pisoVisual)}–${r2(pisoVisualMax)} · banda nav ${r2(bandaNav)} m (malha ${r2(malhaMeiaL)}) · corpo anda até ${r2(xCorpo)} m · vão livre ${r2(vao)} m · guarda ${guarda ? `${guarda.alt} m @ x=${guarda.xMeio}` : 'ausente'}`);

  /* ═══ PON1 · um só plano de piso, e a faixa navegável cobre a malha ═══
     Duas metades do mesmo defeito: a malha e a navegação discordam do piso,
     e a faixa que a navegação reconhece é menor que a malha que existe. */
  if (pisoVisual !== null && Math.abs(pisoVisual - pisoNav) > TOL_PISO) {
    falhas.push(`PON1 ${p.id}: o pé pisa a ${r2(pisoNav)} m (navegação) mas a tábua desenhada tem o topo em ${r2(pisoVisual)} m — diferença de ${r2(pisoVisual - pisoNav)} m (tolerância ${TOL_PISO}). O corpo afunda ${r2(pisoVisual - pisoNav)} m na madeira.`);
  }
  if (pisoVisualMax !== null && pisoVisualMax - pisoNav > TOL_PISO) {
    falhas.push(`PON1 ${p.id}: a tábua mais alta chega a ${r2(pisoVisualMax)} m contra ${r2(pisoNav)} m de navegação — ${r2(pisoVisualMax - pisoNav)} m de madeira atravessando a canela.`);
  }
  if (bandaNav < malhaMeiaL - BANDA_FOLGA) {
    falhas.push(`PON1 ${p.id}: a faixa navegável vai até ${r2(bandaNav)} m mas o tabuleiro tem ${r2(malhaMeiaL)} m de meia-largura — ${r2(malhaMeiaL - bandaNav)} m de tabuleiro SÓLO onde há colisor: o corpo vê a madeira e bate numa parede invisível (a ROTA4 mede o chão e não sente isto).`);
  }
  if (travou) {
    falhas.push(`PON1 ${p.id}: o corpo sai do piso da ponte em x=${travou.x} m (altura ${travou.y} m) antes do fim do tabuleiro (${r2(malhaMeiaL)} m) — a travessia não é atravessável de ponta a ponta.`);
  }

  /* ═══ PON2 · vão livre sob o tabuleiro ═══
     Debaixo das três passa a rota baixa de 80 m do canal. O vão tem de
     caber o corpo, no mesmo número que o map-check usa para "queda perigosa". */
  if (vao < VAO_MIN) {
    falhas.push(`PON2 ${p.id}: vão livre de ${r2(vao)} m entre o INTRADORSO do tabuleiro e o leito do canal — o corpo mede ${CORPO} m e a régua exige ${VAO_MIN} m (QUEDA_ANDAR do map-check). Quem anda na rota baixa passa com ${r2(vao - CORPO)} m de folga acima da cabeça${vaoAgua < CORPO ? `, e na lâmina d'água (${r2(AGUA)} m) o vão cai para ${r2(vaoAgua)} m: o corpo não cabe` : ''}.`);
  }

  /* ═══ PON3 · guarda-corpo em escala e SOBRE o tabuleiro ═══
     Guarda declarada que fica fora da madeira não protege nada — e é
     exatamente o que a malha de antes fazia (guarda em x=±6,15 com o
     tabuleiro terminando em ±6). */
  if (p.guarda) {
    if (!guarda) {
      falhas.push(`PON3 ${p.id}: a rota principal declara guarda-corpo e não há nenhuma peça no plano (nem malha nem colisor).`);
    } else {
      if (!guarda.dentroDaBorda) {
        falhas.push(`PON3 ${p.id}: guarda-corpo em x=${guarda.xMeio} m, FORA do tabuleiro (meia-largura ${r2(malhaMeiaL)} m) — ${r2(Math.abs(guarda.xMeio) - malhaMeiaL)} m de guarda no ar, de onde não protege a travessia.`);
      }
      if (guarda.acimaDoPiso < GUARDA_MIN) {
        falhas.push(`PON3 ${p.id}: guarda-corpo com ${guarda.acimaDoPiso} m acima do piso, menos que os ${GUARDA_MIN} m que um corpo de ${CORPO} m usa de apoio.`);
      }
    }
  }
}

/* ═══ PON4 · a travessia elevada é uma travessia ═══
   A elevada (z=-11) não tem vão baixo — o vão dela é de metros. O que ela
   tem é a rampa de acesso medindo o MESMO conceito: inclinação. */
{
  const tabP = cols.filter((c) => Math.abs((c.minZ + c.maxZ) / 2 - PASS.z) <= PASS.meiaL + 0.3
    && (c.maxX - c.minX) > 4 && c.maxY > 3).sort((a, c) => (c.maxX - c.minX) - (a.maxX - a.minX))[0];
  if (!tabP) {
    falhas.push(`PON4 passarela (z=${PASS.z}): nenhum tabuleiro construído na cota alta`);
  } else {
    const vaoP = PASS.y - 0.18 - CANAL_FUNDO;
    const grau = Math.atan2(PASS.y, PASS.x0 - 5) * 180 / Math.PI;
    const guardaP = cols.filter((c) => Math.abs((c.minZ + c.maxZ) / 2 - PASS.z) <= PASS.meiaL + 0.3
      && (c.maxX - c.minX) > 4 && c.maxY - c.minY < 1.5 && c.minY > 3);
    const altGuardaP = guardaP.length ? guardaP.reduce((a, c) => Math.max(a, c.maxY), 0) - PASS.y : null;
    infos.push(`passarela (z=${PASS.z}): vão livre ${r2(vaoP)} m · rampa ${r2(grau)}° (corrida ${r2(PASS.x0 - 5)} m, subida ${PASS.y} m) · guarda ${altGuardaP === null ? 'ausente' : r2(altGuardaP) + ' m'}`);
    if (vaoP < VAO_MIN) falhas.push(`PON4 passarela: vão livre de ${r2(vaoP)} m, abaixo de ${VAO_MIN} m`);
    if (altGuardaP === null) falhas.push('PON4 passarela: nenhum guarda-corpo na cota alta');
    else if (altGuardaP < GUARDA_MIN) falhas.push(`PON4 passarela: guarda-corpo de ${r2(altGuardaP)} m sobre um vão de ${r2(vaoP)} m`);
    medir.push({ id: 'passarela', z: PASS.z, vao: r2(vaoP), grau: Math.round(grau * 100) / 100, guarda: r2(altGuardaP) });
  }
}

/* ---------------------------------------------------------------------------
   4. SAÍDA
   --------------------------------------------------------------------------- */
/* A escala nova estreitou a faixa z das pontes em 0,1 m por borda. Na grade de
   waypoints, isso eliminou uma alternativa real de CTF apesar de a travessia
   direta continuar passando em PON1. Cobra o grafo do jogo, não a presença de
   uma linha de código: todas as 8 relações spawn→bandeira precisam de 2 rotas. */
const nos = W.waypoints?.nodes || [], adj = W.waypoints?.adj || [];
for (const [time, spawns] of Object.entries(W.spawns || {})) {
  for (const p of game.ctfPts || []) {
    const de = W.nearestWaypoint?.(spawns[0].x, spawns[0].z);
    const ate = W.nearestWaypoint?.(p.x, p.z);
    const qtd = Number.isInteger(de) && Number.isInteger(ate) ? rotasSeparadas(nos, adj, de, ate).length : 0;
    if (qtd < 2) falhas.push(`PON5 ${time}→${p.id}: ${qtd} rota(s) separada(s) no grafo CTF; exige 2`);
  }
}
infos.push(`CTF: 8 relações spawn→bandeira com pelo menos 2 rotas separadas`);
if (JSON_OUT) {
  console.log(JSON.stringify({ ok: falhas.length === 0, falhas, infos, medir }, null, 1));
} else {
  console.log('');
  console.log('  CÓRREGO-PONTE — escala e travessia das 4 travessias');
  console.log('  ' + '-'.repeat(92));
  console.log(`  referência: corpo ${CORPO} m · diâmetro ${DIAMETRO} m · degrau ${DEGRAU} m | tetos: vão ${VAO_MIN} m · guarda ${GUARDA_MIN} m · piso ${TOL_PISO} m`);
  for (const i of infos) console.log('  ' + i);
  console.log('  ' + '-'.repeat(92));
}

/* lei 2/3: mutante que não acende cláusula nenhuma é portão cego */
const alvos = new Set();
for (const f of falhas) {
  const m = /^([A-Z]+\d+)/.exec(f);
  if (m) alvos.add(m[1]);
}
if (mutante && !alvos.has(MUTANTES[mutante])) {
  console.error(`MUTANTE CEGO: --mutante=${mutante} deveria acender ${MUTANTES[mutante]} e acendeu ${[...alvos].join(',') || 'nenhuma'}. A régua não está medindo o que ela afirma medir.`);
  process.exit(3);
}

if (falhas.length) {
  console.error(`CÓRREGO-PONTE FALHA (${falhas.length}):`);
  for (const f of falhas) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('  ✓ CÓRREGO-PONTE OK — 4 travessias em escala, malha e navegação na mesma medida');
