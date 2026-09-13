/* Contrato tático complementar do Córrego.

   O corrego-rotas-check prova a geometria (rampas, pontes, travessia alta, escadas e
   janelas). Esta régua prova a decisão de jogo: de CADA spawn existem três entradas
   navegáveis e diferentes — canal, margem e laje — e as três camadas têm cobertura.

   Uso:
     node tools/eval/corrego-tatico-check.mjs
     node tools/eval/corrego-tatico-check.mjs --mutante=rota-colapsada
     node tools/eval/corrego-tatico-check.mjs --mutante=baixa-sem-cover
*/
import { bootGame, initTextures } from './harness.mjs';

const mutante = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'rota-colapsada': 'TAT1', 'baixa-sem-cover': 'TAT2' };
if (mutante && !MUTANTES[mutante]) throw new Error(`mutante desconhecido: ${mutante}`);

const { world: W } = bootGame('corrego', { textures: initTextures(), ctf: true, seed: 13007 });
const clone = (value) => JSON.parse(JSON.stringify(value));
const routes = clone(W.tacticalRoutes || {});
let cover = clone(W.tacticalCover || []);
if (mutante === 'rota-colapsada') {
  for (const team of Object.keys(routes)) for (const trio of routes[team]) {
    trio[1].entry = { ...trio[0].entry }; trio[1].conflict = { ...trio[0].conflict };
    trio[2].entry = { ...trio[0].entry }; trio[2].conflict = { ...trio[0].conflict };
  }
}
if (mutante === 'baixa-sem-cover') cover = cover.filter((item) => item.lane !== 'baixa');

const failures = [];
const info = [];
const clause = (id, ok, detail) => { info.push(`${id}: ${detail}`); if (!ok) failures.push(`${id}: ${detail}`); };
const near = (point) => W.nearestWaypoint(point.x, point.z);
const pathWorks = (from, point) => {
  const to = near(point), path = W.findPath(from, to);
  return path.length > 1 && path.at(-1) === to;
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

let allSpawns = true;
let minSeparation = Infinity;
let pathsChecked = 0;
for (const team of ['E', 'B']) {
  const teamRoutes = routes[team] || [];
  const spawns = W.spawns?.[team] || [];
  if (teamRoutes.length !== spawns.length || spawns.length !== 4) allSpawns = false;
  for (let i = 0; i < spawns.length; i++) {
    const trio = teamRoutes[i] || [];
    const ids = new Set(trio.map((route) => route.id));
    if (trio.length !== 3 || !['baixa', 'margem', 'alta'].every((id) => ids.has(id))) allSpawns = false;
    const from = near(spawns[i]);
    for (const route of trio) {
      pathsChecked += 2;
      if (!pathWorks(from, route.entry) || !pathWorks(from, route.conflict)) allSpawns = false;
    }
    for (let a = 0; a < trio.length; a++) for (let b = a + 1; b < trio.length; b++) {
      minSeparation = Math.min(minSeparation, dist(trio[a].conflict, trio[b].conflict));
      if (near(trio[a].entry) === near(trio[b].entry)) allSpawns = false;
    }
  }
}

const lowH = W.groundHeightAt(1.4, 11, -1.75);
const marginH = W.groundHeightAt(5.9, 11, 0);
const highH = W.groundHeightAt(4.6, -11, 5.6);
const layersPhysical = lowH < -1.5 && Math.abs(marginH) < 0.2 && highH > 5.3;
clause('TAT1', allSpawns && minSeparation >= 4 && layersPhysical,
  `${pathsChecked} trechos A*; separação mínima ${minSeparation.toFixed(2)} m; cotas baixa/margem/alta ${lowH.toFixed(2)}/${marginH.toFixed(2)}/${highH.toFixed(2)} m`);

const count = (lane) => cover.filter((item) => item.lane === lane);
const low = count('baixa'), margin = count('margem'), high = count('alta');
const lowSafe = low.every((item) => Math.abs(item.x) >= 2.2 && Math.abs(item.x) <= 2.6 && item.h >= 0.8 && item.h <= 1.5);
const marginSafe = margin.every((item) => item.h >= 0.75);
const highSafe = high.every((item) => item.y >= 5.3 && item.h >= 0.45);
clause('TAT2', low.length >= 18 && margin.length >= 4 && high.length >= 4 && lowSafe && marginSafe && highSafe,
  `coberturas baixa/margem/alta ${low.length}/${margin.length}/${high.length}; eixo baixo preserva corredor central`);

if (mutante) {
  const expected = MUTANTES[mutante];
  const bitten = failures.some((failure) => failure.startsWith(`${expected}:`));
  const exclusive = failures.every((failure) => failure.startsWith(`${expected}:`));
  if (!bitten || !exclusive) failures.push(`MUT: ${mutante} deveria acender somente ${expected}`);
}

for (const line of info) console.log(line);
if (failures.length) {
  console.error(`\nFALHOU (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`\nCORREGO TÁTICO OK${mutante ? ` — mutante ${mutante} mordeu ${MUTANTES[mutante]}` : ''}`);
