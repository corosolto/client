/* ============================================================================
   relevo-check.mjs — O MAPA TEM MORRO OU É UM CAMPO NUM GALPÃO?
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   O dono jogou e disse, sobre o fy_campomorro: "o do campinho tambem sem
   topografia". O mapa se chama Campo do MORRO. Nenhuma régua desta base media
   COTA: `map-check.mjs` mede corpo-dentro-de-sólido e escada, `campo-contract`
   mede spawn/rota/luz, `texel-check` mede pixel por metro. Todas ficaram VERDES
   num mapa que o dono descreveu como plano — porque nenhuma delas olha para o
   eixo Y do CHÃO.

   O QUE ELE MEDE — sempre o MOTOR, nunca a declaração
   Tudo sai de `world.groundHeightAt` (a mesma função que `game.js:4669` usa pro
   step-up do jogador) e de `game._freeSpot` (a mesma que resolve colisão), sobre
   a área que o jogador REALMENTE alcança: alagamento a partir dos spawns, com o
   mesmo degrau máximo do jogador (STEP_H = 0,55 m em game.js:~4672). Área que o
   corpo não alcança não conta — senão o relevo da moldura decorativa "aprova"
   um miolo plano, que é exatamente a armadilha deste mapa.

     R1 amplitude    p98−p2 da cota na área ANDÁVEL. Morro é diferença de cota
                     onde se anda, não na borda.
     R2 fração plana % das células andáveis dentro de ±0,25 m da MEDIANA. Campo
                     de várzea é nivelado de propósito, então plano demais é o
                     defeito: se quase tudo está na mesma cota, o campo virou o
                     mapa inteiro.
     R3 declive      % das células andáveis com gradiente local ≥ 12%. Mede se
                     existe LADEIRA, não só patamar: dois platôs ligados por um
                     degrau dão amplitude alta e declive zero.
     R4 subida       maior ganho de cota alcançável a pé em rampa CONTÍNUA
                     (alagamento com degrau ≤ 0,30 m — abaixo do step-up, logo
                     é caminhada, não pulo). Separa morro de elevador.
     R5 silhueta     topo máximo da geometria visível. Morro tem coisa acima da
                     linha do olho; o mapa media 8,33 m contra ~19 m dos maduros.

   MUTANTES (a régua tem que MORDER, não só passar)
     --mutante=terreno-plano   achata groundHeightAt na cota mediana  → R1..R4
     --mutante=silhueta-rasa   rebaixa a geometria alta               → R5
     --mutante=degrau-unico    troca a rampa por um degrau seco       → R3, R4

   Uso: node tools/eval/relevo-check.mjs [mapId]
        node tools/eval/relevo-check.mjs fy_campomorro --mutante=terreno-plano
   Mapas fora da lista MORRO são medidos e impressos, mas não reprovam: o
   contrato de cota é do mapa que se chama morro.
   ============================================================================ */
import { THREE, initTextures, bootGame } from './harness.mjs';

const MAPA = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'fy_campomorro';
const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || null;

// Limiares só para os mapas cujo nome promete morro. Os números vêm do que o
// dono reconhece como morro nesta base: o fy_escadao lê como favela porque tem
// ~5 m de cota na área jogável; abaixo de 3 m o olho lê "terreno plano".
const MORRO = {
  fy_campomorro: { amplitude: 3.0, planaMax: 65, declive: 12, subida: 2.5, topo: 12.0 },
};
const LIMITE = MORRO[MAPA] || null;

const PASSO = 0.75;          // grade de amostragem, ~meia largura de corpo
const RAIO = 0.38;           // mesmo raio de colisão do jogador (game.js:4685)
const STEP_H = 0.55;         // step-up do jogador (game.js:~4672)
const RAMPA_MAX = 0.30;      // degrau que ainda é ladeira, não ressalto

const game = bootGame(MAPA, { textures: initTextures(), bots: 0 });
const world = game.world;
world.root.updateMatrixWorld(true);

const chaoReal = world.groundHeightAt.bind(world);
let chao = chaoReal;

/* ---------- silhueta: topo da geometria VISÍVEL (o mutante mexe aqui) ---------- */
const caixa = new THREE.Box3();
const topos = [];
world.root.traverse((o) => {
  if (!o.isMesh || o.visible === false) return;
  caixa.setFromObject(o);
  if (Number.isFinite(caixa.max.y)) topos.push(caixa.max.y);
});
if (mutante === 'silhueta-rasa') for (let i = 0; i < topos.length; i++) topos[i] = Math.min(topos[i], 8.4);
topos.sort((a, b) => a - b);
const topoMax = topos.length ? topos[topos.length - 1] : 0;
const topoP90 = topos.length ? topos[Math.floor(0.9 * topos.length)] : 0;

/* ---------- mutantes de terreno: entram DEPOIS da amostragem de silhueta ---------- */
if (mutante === 'terreno-plano') {
  const alvo = chaoReal(0, 0);
  chao = () => alvo;
} else if (mutante === 'degrau-unico') {
  // Toda cota vira múltiplo de 1 m: a amplitude sobrevive, a ladeira morre.
  chao = (x, z, y) => Math.round(chaoReal(x, z, y));
}

/* ---------- área ANDÁVEL: alagamento a partir dos spawns, física do jogo ---------- */
const B = world.bounds || { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };
const NX = Math.floor((B.maxX - B.minX) / PASSO) + 1;
const NZ = Math.floor((B.maxZ - B.minZ) / PASSO) + 1;
const px = (i) => B.minX + i * PASSO, pz = (k) => B.minZ + k * PASSO;
const idx = (i, k) => i * NZ + k;

// Livre = o resolvedor de colisão do jogo não empurra o corpo para fora do ponto.
const livre = new Uint8Array(NX * NZ);
const cota = new Float32Array(NX * NZ);
for (let i = 0; i < NX; i++) for (let k = 0; k < NZ; k++) {
  const x = px(i), z = pz(k), s = game._freeSpot(x, z, RAIO);
  cota[idx(i, k)] = chao(x, z);
  livre[idx(i, k)] = (Math.abs(s.x - x) < 0.02 && Math.abs(s.z - z) < 0.02) ? 1 : 0;
}

function alagar(degrau) {
  const visto = new Uint8Array(NX * NZ), fila = [];
  for (const slots of Object.values(world.spawns || {})) for (const s of slots) {
    const i = Math.round((s.x - B.minX) / PASSO), k = Math.round((s.z - B.minZ) / PASSO);
    if (i >= 0 && i < NX && k >= 0 && k < NZ && livre[idx(i, k)] && !visto[idx(i, k)]) { visto[idx(i, k)] = 1; fila.push(idx(i, k)); }
  }
  for (let f = 0; f < fila.length; f++) {
    const c = fila[f], i = Math.floor(c / NZ), k = c % NZ;
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di, nk = k + dk;
      if (ni < 0 || ni >= NX || nk < 0 || nk >= NZ) continue;
      const n = idx(ni, nk);
      if (visto[n] || !livre[n]) continue;
      if (Math.abs(cota[n] - cota[c]) > degrau) continue;
      visto[n] = 1; fila.push(n);
    }
  }
  return visto;
}

const andavel = alagar(STEP_H);
const cotasAndaveis = [];
for (let c = 0; c < andavel.length; c++) if (andavel[c]) cotasAndaveis.push(cota[c]);
cotasAndaveis.sort((a, b) => a - b);
const q = (p) => cotasAndaveis.length ? cotasAndaveis[Math.min(cotasAndaveis.length - 1, Math.floor(p * cotasAndaveis.length))] : 0;
const amplitude = q(0.98) - q(0.02);
const mediana = q(0.5);
const planaPct = 100 * cotasAndaveis.filter((h) => Math.abs(h - mediana) <= 0.25).length / Math.max(1, cotasAndaveis.length);

/* R3 — gradiente local por diferença central, só onde os dois vizinhos são andáveis. */
let comDeclive = 0, comGradiente = 0;
for (let i = 1; i < NX - 1; i++) for (let k = 1; k < NZ - 1; k++) {
  const c = idx(i, k);
  if (!andavel[c]) continue;
  const ex = andavel[idx(i + 1, k)] && andavel[idx(i - 1, k)];
  const ez = andavel[idx(i, k + 1)] && andavel[idx(i, k - 1)];
  if (!ex && !ez) continue;
  const gx = ex ? (cota[idx(i + 1, k)] - cota[idx(i - 1, k)]) / (2 * PASSO) : 0;
  const gz = ez ? (cota[idx(i, k + 1)] - cota[idx(i, k - 1)]) / (2 * PASSO) : 0;
  comGradiente++;
  if (Math.hypot(gx, gz) >= 0.12) comDeclive++;
}
const declivePct = 100 * comDeclive / Math.max(1, comGradiente);

/* R4 — ganho de cota alcançável só por ladeira contínua (degrau <= 0,30 m). */
const emRampa = alagar(RAMPA_MAX);
let rampaMin = Infinity, rampaMax = -Infinity;
for (let c = 0; c < emRampa.length; c++) if (emRampa[c]) { rampaMin = Math.min(rampaMin, cota[c]); rampaMax = Math.max(rampaMax, cota[c]); }
const subida = (Number.isFinite(rampaMin) && Number.isFinite(rampaMax)) ? rampaMax - rampaMin : 0;

const areaAndavel = cotasAndaveis.length * PASSO * PASSO;

const num = (v, d = 2) => v.toFixed(d);
const checks = LIMITE ? [
  ['amplitude de cota na área andável', amplitude >= LIMITE.amplitude, `${num(amplitude)} m / ${num(LIMITE.amplitude)} m`],
  ['área andável fora do platô', planaPct <= LIMITE.planaMax, `${num(planaPct, 1)}% plana / máx ${LIMITE.planaMax}%`],
  ['ladeira de verdade (grad ≥ 12%)', declivePct >= LIMITE.declive, `${num(declivePct, 1)}% / ${LIMITE.declive}%`],
  ['subida contínua a pé', subida >= LIMITE.subida, `${num(subida)} m / ${num(LIMITE.subida)} m`],
  ['silhueta acima da linha do olho', topoMax >= LIMITE.topo, `topo ${num(topoMax)} m / ${num(LIMITE.topo)} m`],
] : [];

console.log(`┌─ RELEVO — ${MAPA}${mutante ? ` (mutante ${mutante})` : ''}`);
console.log(`├─ área andável: ${num(areaAndavel, 0)} m² em ${cotasAndaveis.length} células de ${PASSO} m`);
console.log(`├─ cota: p2 ${num(q(0.02))} · mediana ${num(mediana)} · p98 ${num(q(0.98))} · amplitude ${num(amplitude)} m`);
console.log(`├─ plana (±0,25 m da mediana): ${num(planaPct, 1)}%`);
console.log(`├─ declive ≥ 12%: ${num(declivePct, 1)}% de ${comGradiente} células com gradiente`);
console.log(`├─ subida contínua a pé (degrau ≤ ${RAMPA_MAX} m): ${num(subida)} m`);
console.log(`├─ silhueta: topo ${num(topoMax)} m · p90 ${num(topoP90)} m · ${topos.length} malhas`);
if (!LIMITE) { console.log('└─ SEM CONTRATO DE MORRO para este mapa (medição informativa)'); process.exit(0); }
for (const [nome, ok, detalhe] of checks) console.log(`├─ ${ok ? '✓' : '✗'} ${nome} (${detalhe})`);
const falhas = checks.filter(([, ok]) => !ok).length;
if (falhas) {
  console.log(`└─ RELEVO FALHA: ${falhas}/${checks.length}${mutante ? ` (mutante ${mutante} mordido)` : ''}`);
  process.exitCode = 1;
} else if (mutante) {
  console.log(`└─ MUTANTE ${mutante} SOBREVIVEU — a régua não morde.`);
  process.exitCode = 1;
} else console.log('└─ RELEVO OK');
