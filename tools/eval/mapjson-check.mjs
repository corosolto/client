/* ============================================================================
   mapjson-check.mjs — A RÉGUA DO FORMATO "MAPA COMO DADO" (issue #210).
   ----------------------------------------------------------------------------
   O ganho real da issue não é o loader — é a régua que nasce junto do formato:
   grafo desconexo, aresta unidirecional e spawn fora da área jogável já quebraram
   PR de mapa aqui. Com JSON validado, conteúdo vira dado que a régua confere, e não
   código que o revisor tenta ler.

   O que ela mede, e por que dá pra medir SEM browser: `buildMapFromJSON` sobe o
   mapa de verdade pelo three vendorizado do harness (mesmo instrumento das outras
   réguas de mapa) e o `validatePlan` roda a geometria de navegação em node puro.

   Uso:
     node tools/eval/mapjson-check.mjs
     node tools/eval/mapjson-check.mjs --mutante=grafo    (grade partida ao meio)
     node tools/eval/mapjson-check.mjs --mutante=aresta   (aresta sem volta)
     node tools/eval/mapjson-check.mjs --mutante=spawn     (spawn fora dos limites)

   O mutante PROVA que a régua morde: cada um corrompe um invariante e a régua tem
   que ficar VERMELHA. Régua que passa no mutante não está medindo nada.
   ============================================================================ */
import { readFileSync } from 'node:fs';
import { THREE, initTextures } from './harness.mjs';

const { buildMapFromJSON, planFromJSON, validatePlan } = await import('../../public/js/map_json.js');

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const SPEC = JSON.parse(readFileSync(new URL('./mapjson_fixture.json', import.meta.url), 'utf8'));

function planMutado() {
  if (MUT === 'grafo') {
    // muro interno de ponta a ponta, sem vão: parte a grade em dois componentes
    const s = structuredClone(SPEC);
    s.boxes.push({ w: 41, h: 3, d: 1, x: 0, z: 4, color: '#000000' });
    return planFromJSON(s);
  }
  if (MUT === 'spawn') {
    // spawn empurrado para fora dos limites do mapa
    const s = structuredClone(SPEC);
    s.spawns.E[0] = { x: 999, z: 999, yaw: 0 };
    return planFromJSON(s);
  }
  const plan = planFromJSON(SPEC);
  if (MUT === 'aresta') {
    // remove a volta de uma aresta: 0→viz existe, viz→0 some
    const viz = plan.adj[0][0];
    plan.adj[viz] = plan.adj[viz].filter((k) => k !== 0);
  }
  return plan;
}

const plan = planMutado();
const problemas = validatePlan(plan);

// paridade do loader: o build real tem que devolver o contrato de world completo
let buildErro = '';
if (!MUT) {
  try {
    const W = buildMapFromJSON(new THREE.Scene(), initTextures(), SPEC);
    const faltando = ['root', 'colliders', 'occluders', 'groundHeightAt', 'slowAt', 'spawns', 'sun', 'hemi', 'pickups', 'ctfPoints', 'waypoints', 'nearestWaypoint', 'findPath', 'bounds']
      .filter((k) => W[k] === undefined);
    if (faltando.length) buildErro = `contrato de world incompleto: falta ${faltando.join(', ')}`;
    else if (!W.waypoints.nodes.length || !W.waypoints.adj.length) buildErro = 'grafo de waypoints vazio no build';
    else if (typeof W.findPath(0, W.waypoints.nodes.length - 1)[0] !== 'number') buildErro = 'findPath não devolveu caminho';
  } catch (e) {
    buildErro = `build lançou: ${e.message}`;
  }
}

console.log(`nós ${plan.nodes.length} · arestas ${plan.adj.reduce((a, l) => a + l.length, 0)} · spawns E${plan.spawns.E.length}/B${plan.spawns.B.length}`);
for (const p of problemas) console.log(`  MJ VERMELHA · ${p}`);
if (buildErro) console.log(`  MJ VERMELHA · ${buildErro}`);

if (MUT) {
  // no mutante, a régua TEM que reprovar
  if (problemas.length) { console.log(`MJ ok · mutante '${MUT}' reprovado como esperado`); process.exit(0); }
  console.log(`MJ VERMELHA · mutante '${MUT}' passou — a régua NÃO morde`); process.exit(1);
}

if (problemas.length || buildErro) { console.log('MJ VERMELHA · fixture reprovado'); process.exit(1); }
console.log('MJ ok · fixture válido e loader com contrato completo');
