/* ============================================================================
   corrego-preso-check.mjs — O JOGADOR CONSEGUE SAIR DE ONDE ELE CONSEGUE ENTRAR?
   ----------------------------------------------------------------------------
   Relato do dono, vendo o mapa rodando: "tem uma parte do mapa que o jogador
   fica preso".

   POR QUE UMA RÉGUA NOVA, se `eval:mapcontrato` está VERDE: a mapcontrato mede
   BFS no grafo de waypoints ESCRITO À MÃO (map-contrato-check.mjs, `alcance()`).
   Ela não conhece grade, não conhece raio de corpo, não conhece `_collide` e não
   conhece degrau. Um corredor fisicamente lacrado passa nela sem piscar, desde
   que os dois waypoints estejam listados como vizinhos — foi exatamente assim
   que a piscina passou com corredor cortado. Conexo no grafo NÃO é o bastante:
   esta régua ANDA.

   COMO ANDA: grade de 25 cm, corpo de raio 0,38 m, e a decisão de "tem chão
   aqui?" sai do `_collide` DE VERDADE do game.js — o método é chamado na
   instância que o arnês constrói, não reimplementado. Reimplementar seria criar
   um segundo juiz que pode discordar do jogo (o BUG-02 da casa).

   O degrau vem do `STEP_H` do game.js: subida acima dele o `tryAxis` recusa e a
   sonda também. Os dois números são conferidos contra o FONTE do game.js na
   cláusula PRESO0 — régua com limiar próprio envelhece calada.

   MUTAÇÃO (`--mutante=<id>`): reintroduz um defeito conhecido e a régua TEM que
   acender a cláusula certa. Mutante desconhecido sai com código 2.
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { initTextures, bootGame } from './harness.mjs';

const MAPA = 'corrego';
const PASSO = 0.25;             // lado da célula da grade
const AREA_CEL = PASSO * PASSO;
const BOLSAO_MAX = 2.0;         // m² — bolsão livre e inalcançável tolerado
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;
/* Mutante = defeito reintroduzido que a régua TEM que acender. Dois candidatos
   foram testados e REPROVADOS como mutante, o que é informação e não fracasso:
     · `pilar-na-boca` (a estaca de 18 cm da palafita, no lugar exato em que
       estava): sozinha ela NÃO lacra o leito — sobra 0,81 m de vão ao lado dela,
       mais que o corpo de 0,76 m. A régua ficar verde ali está CERTO; quem
       lacrava era o entulho.
     · `sem-degrau`: desligar o STEP_H faz o jogador subir qualquer parede e a
       armadilha some de verdade. Não é defeito, é outra física.
   Ficaram os dois que lacram de fato. */
const MUTANTES = new Set(['entulho-na-boca', 'boca-lacrada']);
if (mutante && !MUTANTES.has(mutante)) {
  console.error(`mutante desconhecido: ${mutante} (conhecidos: ${[...MUTANTES].join(', ')})`);
  process.exit(2);
}

/* ---- PRESO0: os limiares são os DO JOGO, não os meus ---------------------- */
const gameSrc = readFileSync('public/js/game.js', 'utf8');
const mStep = gameSrc.match(/const STEP_H\s*=\s*([\d.]+)/);
const mRaio = gameSrc.match(/_collide\(p\.pos,\s*([\d.]+)\)/);
const STEP_H = mStep ? parseFloat(mStep[1]) : NaN;
const R_CORPO = mRaio ? parseFloat(mRaio[1]) : NaN;

const game = bootGame(MAPA, { textures: initTextures(), ctf: true, seed: 13007 });
const world = game.world;
const gh = world.groundHeightAt;
const B = world.bounds;

/* Um prop pode ser ARRASTADO pra fora da boca pela mutação: ela reinsere o
   colisor exatamente onde ele estava antes do conserto (medido no relatório). */
if (mutante === 'entulho-na-boca') {
  world.colliders.push({ minX: -2.97, maxX: -1.53, minY: -1.75, maxY: -0.85, minZ: -29.01, maxZ: -27.79 });
}
/* mura a boca da rampa 1 de ponta a ponta: qualquer lacre tem que acender */
if (mutante === 'boca-lacrada') {
  world.colliders.push({ minX: -5.2, maxX: -1.0, minY: -1.75, maxY: 0.5, minZ: -30.6, maxZ: -27.0 });
}

const degrau = STEP_H;

/* ---- a grade ------------------------------------------------------------- */
const x0 = B.minX, x1 = B.maxX, z0 = B.minZ, z1 = B.maxZ;
const NX = Math.floor((x1 - x0) / PASSO) + 1;
const NZ = Math.floor((z1 - z0) / PASSO) + 1;
const xOf = (i) => x0 + i * PASSO;
const zOf = (j) => z0 + j * PASSO;

const livre = new Uint8Array(NX * NZ);
const alt = new Float64Array(NX * NZ);
const p = { x: 0, y: 0, z: 0 };
for (let i = 0; i < NX; i++) {
  for (let j = 0; j < NZ; j++) {
    const x = xOf(i), z = zOf(j);
    const y = gh(x, z);
    p.x = x; p.y = y; p.z = z;
    game._collide(p, R_CORPO);            // o juiz é o do jogo
    const parado = Math.abs(p.x - x) < 1e-9 && Math.abs(p.z - z) < 1e-9;
    const k = i * NZ + j;
    livre[k] = parado ? 1 : 0;
    alt[k] = y;
  }
}

/* ---- alcance a partir dos spawns -----------------------------------------
   ATENÇÃO, e esta régua já errou aqui uma vez: o grafo é DIRIGIDO. Descer é de
   graça (o jogador cai), subir custa <= STEP_H. Uma varredura ingênua "dá pra
   CHEGAR?" acha o fundo do canal alcançável — pela ponte, caindo — e fica VERDE
   com o jogador preso lá dentro. A pergunta certa é "dá pra VOLTAR?".
   Então são DUAS varreduras:
     ida   (ENTRA): aresta k->nk quando subir de k pra nk cabe no degrau;
     volta (SAI):   as MESMAS arestas invertidas, partindo dos spawns.
   Armadilha = célula em que dá pra ENTRAR e não dá pra SAIR. */
const pontos = [];
for (const time of Object.keys(world.spawns || {})) for (const s of world.spawns[time]) pontos.push(s);
const visto = new Uint8Array(NX * NZ);
const fila = [];
const idx = (x, z) => {
  const i = Math.round((x - x0) / PASSO), j = Math.round((z - z0) / PASSO);
  if (i < 0 || j < 0 || i >= NX || j >= NZ) return -1;
  return i * NZ + j;
};
for (const s of pontos) { const k = idx(s.x, s.z); if (k >= 0 && livre[k] && !visto[k]) { visto[k] = 1; fila.push(k); } }
const VIZ = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/* `frente`: true = aresta no sentido de ANDAR (k -> nk). false = sentido inverso. */
function varrer(semente, frente) {
  const marca = new Uint8Array(NX * NZ);
  const q = [];
  for (const k of semente) if (livre[k] && !marca[k]) { marca[k] = 1; q.push(k); }
  while (q.length) {
    const k = q.pop();
    const i = Math.floor(k / NZ), j = k % NZ;
    for (const [di, dj] of VIZ) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const nk = ni * NZ + nj;
      if (marca[nk] || !livre[nk]) continue;
      // a aresta que existe é sempre "andar de A pra B com subida <= degrau"
      const sobe = frente ? alt[nk] - alt[k] : alt[k] - alt[nk];
      if (sobe > degrau) continue;
      marca[nk] = 1; q.push(nk);
    }
  }
  return marca;
}
const sementes = [];
for (const s of pontos) { const k = idx(s.x, s.z); if (k >= 0) sementes.push(k); }
const entra = varrer(sementes, true);    // dá pra chegar
const sai = varrer(sementes, false);     // dá pra voltar
for (let k = 0; k < visto.length; k++) visto[k] = (entra[k] && sai[k]) ? 1 : 0;
/* a armadilha: entra e não sai */
const presos = [];
for (let k = 0; k < livre.length; k++) if (livre[k] && entra[k] && !sai[k]) presos.push(k);

/* ---- componentes livres MAS inalcançáveis -------------------------------- */
const comp = new Int32Array(NX * NZ).fill(-1);
const bolsoes = [];
for (let k = 0; k < livre.length; k++) {
  if (!livre[k] || visto[k] || comp[k] >= 0) continue;
  const id = bolsoes.length;
  const pilha = [k]; comp[k] = id;
  let n = 0; let mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity;
  while (pilha.length) {
    const c = pilha.pop(); n++;
    const i = Math.floor(c / NZ), j = c % NZ;
    const x = xOf(i), z = zOf(j);
    if (x < mnX) mnX = x; if (x > mxX) mxX = x;
    if (z < mnZ) mnZ = z; if (z > mxZ) mxZ = z;
    for (const [di, dj] of VIZ) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const nk = ni * NZ + nj;
      if (!livre[nk] || visto[nk] || comp[nk] >= 0) continue;
      if (Math.abs(alt[nk] - alt[c]) > degrau) continue;
      comp[nk] = id; pilha.push(nk);
    }
  }
  bolsoes.push({ n, area: n * AREA_CEL, mnX, mxX, mnZ, mxZ });
}
bolsoes.sort((a, b) => b.area - a.area);

/* agrupa as células-armadilha em manchas, pra relatar ONDE e não só QUANTAS */
const marcaP = new Uint8Array(NX * NZ);
for (const k of presos) marcaP[k] = 1;
const manchas = [];
for (const k0 of presos) {
  if (marcaP[k0] !== 1) continue;
  const pilha = [k0]; marcaP[k0] = 2;
  let n = 0, mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity;
  while (pilha.length) {
    const c = pilha.pop(); n++;
    const i = Math.floor(c / NZ), j = c % NZ;
    const x = xOf(i), z = zOf(j);
    if (x < mnX) mnX = x; if (x > mxX) mxX = x;
    if (z < mnZ) mnZ = z; if (z > mxZ) mxZ = z;
    for (const [di, dj] of VIZ) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
      const nk = ni * NZ + nj;
      if (marcaP[nk] === 1) { marcaP[nk] = 2; pilha.push(nk); }
    }
  }
  manchas.push({ n, area: n * AREA_CEL, mnX, mxX, mnZ, mxZ });
}
manchas.sort((a, b) => b.area - a.area);
const armadilha = manchas[0] || { area: 0, n: 0 };

const nLivres = livre.reduce((a, v) => a + v, 0);
const nAlc = visto.reduce((a, v) => a + v, 0);
const maior = bolsoes[0] || { area: 0, n: 0 };

/* ---- o leito do canal, trecho por trecho --------------------------------- */
/* O canal é cortado pelas 3 pontes em 4 salas. Cada uma tem UMA rampa. Uma sala
   sem saída é o defeito, então cada uma é cobrada por nome. */
const SALAS = [
  ['S1 (rampa oeste z-33/-27)', -33.5, -23.6],
  ['S2 (rampa leste z-13/-7)', -20.4, -1.1],
  ['S3 (rampa oeste z9/15)', 1.1, 20.3],
  ['S4 (rampa leste z29/35)', 23.7, 33.9],
];
const salaStat = SALAS.map(([nome, za, zb]) => {
  let livres = 0, alc = 0;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const x = xOf(i), z = zOf(j);
    if (Math.abs(x) > 2.9 || z < za || z > zb) continue;
    const k = i * NZ + j;
    if (!livre[k]) continue;
    livres++; if (visto[k]) alc++;
  }
  return { nome, livres, alc, frac: livres ? alc / livres : 1 };
});

console.log(`\n[corrego-preso] grade ${PASSO} m · corpo r=${R_CORPO} · degrau ${degrau === 99 ? 'DESLIGADO (mutante)' : STEP_H} m`);
console.log(`  células livres ${nLivres} · alcançadas ${nAlc} · órfãs ${nLivres - nAlc} · bolsões ${bolsoes.length}`);
if (maior.area > 0) {
  console.log(`  maior bolsão: ${maior.area.toFixed(2)} m² em x[${maior.mnX.toFixed(2)},${maior.mxX.toFixed(2)}] z[${maior.mnZ.toFixed(2)},${maior.mxZ.toFixed(2)}]`);
}
for (const s of salaStat) console.log(`  leito ${s.nome}: ${s.alc}/${s.livres} com volta (${(s.frac * 100).toFixed(1)} %)`);
console.log(`  ARMADILHA (entra e não sai): ${presos.length} células · ${(presos.length * AREA_CEL).toFixed(2)} m² em ${manchas.length} mancha(s)`);
for (const m of manchas.slice(0, 3)) {
  console.log(`    · ${m.area.toFixed(2)} m² em x[${m.mnX.toFixed(2)},${m.mxX.toFixed(2)}] z[${m.mnZ.toFixed(2)},${m.mxZ.toFixed(2)}]`);
}

const checks = [
  ['PRESO0 limiares lidos do game.js (STEP_H e raio do corpo)', Number.isFinite(STEP_H) && Number.isFinite(R_CORPO),
    `STEP_H=${STEP_H} raio=${R_CORPO}`],
  [`PRESO1 nenhum bolsão livre-e-inalcançável acima de ${BOLSAO_MAX} m²`, maior.area <= BOLSAO_MAX,
    `maior ${maior.area.toFixed(2)} m²`],
  [`PRESO3 nenhuma mancha em que o jogador ENTRA e não SAI acima de ${BOLSAO_MAX} m²`,
    armadilha.area <= BOLSAO_MAX,
    `maior armadilha ${armadilha.area.toFixed(2)} m²` + (armadilha.area > 0
      ? ` em x[${armadilha.mnX.toFixed(2)},${armadilha.mxX.toFixed(2)}] z[${armadilha.mnZ.toFixed(2)},${armadilha.mxZ.toFixed(2)}]` : '')],
  ['PRESO2 o leito das 4 salas do canal sai pela própria rampa (>= 95 % com volta)',
    salaStat.every((s) => s.frac >= 0.95),
    salaStat.filter((s) => s.frac < 0.95).map((s) => `${s.nome} ${(s.frac * 100).toFixed(1)} %`).join(' · ') || 'todas ok'],
];

let vermelho = 0;
console.log('');
for (const [nome, ok, detalhe] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${nome}${ok ? '' : ` — ${detalhe}`}`);
  if (!ok) vermelho++;
}
if (mutante) {
  if (vermelho === 0) { console.error(`\nMUTANTE ${mutante} NÃO FOI PEGO — a régua não morde.`); process.exit(1); }
  console.log(`\nmutante ${mutante}: ${vermelho} cláusula(s) vermelha(s) — a régua mordeu.`);
  process.exit(0);
}
if (vermelho) { console.error(`\nCÓRREGO-PRESO VERMELHO · ${vermelho} cláusula(s)`); process.exit(1); }
console.log('\nCÓRREGO-PRESO OK — dá pra sair de todo lugar onde dá pra entrar');
