/* map-contrato-check.mjs — todo mapa do registro devolve o que o `game.js` consome.
 *
 * Irmã da `eval:mapjson`, que valida um spec JSON ANTES do build; esta valida o
 * registro DEPOIS do build, inclusive os mapas escritos à mão.
 *
 * `obrigatorio` não é juízo de valor: é chave que o `game.js` desreferencia SEM guarda.
 * Marcar como obrigatória uma chave guardada reprova mapa que funciona.
 *
 * MC3 usa o MESMO critério de conexidade da `validatePlan` (map_json.js): BFS do nó 0
 * alcança todos. Dois limiares para o mesmo conceito é a LIÇÃO 2 do docs/LICOES.md.
 *
 *   node tools/eval/map-contrato-check.mjs [--extra=map_x.js] [--json]
 *   node tools/eval/map-contrato-check.mjs --mutante=sem-waypoints|grafo-partido
 */
import { THREE, MAPS, initTextures } from './harness.mjs';

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const MUTANTE = arg('mutante', '');
const JSONOUT = process.argv.includes('--json');

const CONSUMIDO = [
  { chave: 'root', tipo: 'object', obrigatorio: true, onde: 'scene.add / dispose' },
  { chave: 'colliders', tipo: 'array', obrigatorio: true, onde: '_collide' },
  { chave: 'occluders', tipo: 'array', obrigatorio: true, onde: 'game.js:2926 intersectObjects' },
  { chave: 'spawns', tipo: 'object', obrigatorio: true, onde: '_startRound' },
  { chave: 'bounds', tipo: 'object', obrigatorio: true, onde: 'game.js:4462' },
  { chave: 'waypoints', tipo: 'object', obrigatorio: true, onde: 'game.js:4157 .nodes, sem guarda' },
  { chave: 'nearestWaypoint', tipo: 'function', obrigatorio: true, onde: 'game.js:4292, sem guarda' },
  { chave: 'findPath', tipo: 'function', obrigatorio: true, onde: 'game.js:4298, sem guarda' },
  { chave: 'groundHeightAt', tipo: 'function', obrigatorio: false, onde: 'game.js:1973 guardado' },
  { chave: 'slowAt', tipo: 'function', obrigatorio: false, onde: 'game.js:4329 guardado' },
];

const tipoDe = (v) => (Array.isArray(v) ? 'array' : typeof v);

/* Teto de nós INALCANÇÁVEIS por mapa. Contar alcançados deixaria a dívida crescer:
   mapa que ganha nós ilhados mantendo o componente atual passaria. Mapa fora da
   lista tem de ser conexo. Ver docs/quality-gates.md.
   Medição pós-merge da main em 17/08 (os 5 mapas fy_* entraram nesta data):
   loja_h 491→493 e ferro_velho 15→21 vieram do merge dos dois grafos; o lajes
   241/363 é o grafo em camadas do roof-first — a simplificação do BUG-58 reconstrói
   esse grafo e este teto DESCE junto. */
const ILHADOS_MAX = {
  loja_h: 493, ferro_velho: 21,
  escadao: 6, lajes: 241, corrego: 15,
};

/* BFS do nó 0, mesmo critério da validatePlan de map_json.js.
   A varredura de linha malformada é SEPARADA da BFS de propósito: dentro dela, nó de
   componente que o nó 0 não alcança nunca seria visitado, e o `adj` quebrado dele
   passaria — até um bot chegar lá e o jogo lançar. */
function alcance(nodes, adj) {
  const malformadas = [];
  for (let i = 0; i < nodes.length; i++) if (!Array.isArray(adj[i])) malformadas.push(i);

  const visto = new Uint8Array(nodes.length);
  const fila = [0];
  visto[0] = 1;
  let n = 1;
  while (fila.length) {
    const i = fila.pop();
    if (!Array.isArray(adj[i])) continue;
    for (const j of adj[i]) {
      if (Number.isInteger(j) && j >= 0 && j < nodes.length && !visto[j]) { visto[j] = 1; n++; fila.push(j); }
    }
  }
  return { n, malformadas };
}

async function medir(id, buildFn) {
  const scene = new THREE.Scene();
  const T = await initTextures();
  /* Um try só em volta de build E validação: builder que devolve null ou `adj`
     não-array lançava FORA do catch e matava o relatório dos outros mapas. */
  try {
    let W = (buildFn || MAPS[id].build)(scene, T);
    if (!W || typeof W !== 'object') return { id, erro: `build devolveu ${W === null ? 'null' : typeof W}` };

    if (MUTANTE === 'sem-waypoints') { delete W.waypoints; delete W.nearestWaypoint; delete W.findPath; }
    if (MUTANTE === 'grafo-partido' && W.waypoints && Array.isArray(W.waypoints.adj)) {
      const meio = Math.floor(W.waypoints.nodes.length / 2);
      W = { ...W, waypoints: { nodes: W.waypoints.nodes, adj: W.waypoints.adj.map((l, i) => (Array.isArray(l) ? l.filter((j) => (i < meio) === (j < meio)) : l)) } };
    }

    const faltando = [], opcionais = [];
    for (const c of CONSUMIDO) {
      const v = W[c.chave];
      const p = (v === undefined || v === null) ? 'ausente' : (tipoDe(v) !== c.tipo ? tipoDe(v) : null);
      if (p) (c.obrigatorio ? faltando : opcionais).push({ ...c, viu: p });
    }
    if (faltando.length) return { id, faltando, opcionais };

    const nodes = W.waypoints.nodes, adj = W.waypoints.adj;
    if (!Array.isArray(nodes) || !Array.isArray(adj)) {
      return { id, faltando: [{ chave: 'waypoints.nodes/adj', viu: 'não-array', tipo: 'array', onde: 'game.js:4157/4199' }], opcionais };
    }
    const arestas = adj.reduce((a, l) => a + (Array.isArray(l) ? l.length : 0), 0);

    /* MC2: o caminho é consumido como ÍNDICE de nodes (game.js:4306). Entrada fora da
       faixa, não-inteira ou undefined faz o bot ler waypoint inexistente. */
    let chamavel, rotaErro = null;
    try {
      const i = W.nearestWaypoint(0, 0);
      const p = W.findPath(i, Math.min(nodes.length - 1, i + 1));
      chamavel = Number.isInteger(i) && i >= 0 && i < nodes.length
        && Array.isArray(p) && p.length > 0
        && p.every((n) => Number.isInteger(n) && n >= 0 && n < nodes.length);
    } catch (e) { chamavel = false; rotaErro = String((e && e.message) || e); }

    const { n: alcancados, malformadas } = alcance(nodes, adj);
    return { id, faltando: [], opcionais, nos: nodes.length, arestas, chamavel, rotaErro, alcancados, malformadas };
  } catch (e) {
    return { id, erro: String((e && e.message) || e) };
  }
}

const linhas = [];
for (const id of Object.keys(MAPS)) linhas.push(await medir(id));

const EXTRA = arg('extra', '');
if (EXTRA) {
  const url = new URL(EXTRA.startsWith('/') ? `file://${EXTRA}` : EXTRA, `file://${process.cwd()}/`);
  const mod = await import(url.href);
  const b = Object.entries(mod).find(([k, v]) => k.startsWith('build') && typeof v === 'function');
  if (!b) { console.error(`x ${EXTRA}: nenhum export build* encontrado`); process.exit(1); }
  linhas.push(await medir(`extra:${b[0]}`, b[1]));
}

const mc1 = linhas.filter((r) => r.erro || r.faltando?.length || r.malformadas?.length);
const mc2 = linhas.filter((r) => r.chamavel === false);
const ilhados = (r) => r.nos - r.alcancados;
const mc3 = linhas.filter((r) => r.nos != null && ilhados(r) > (ILHADOS_MAX[r.id] ?? 0));

if (JSONOUT) {
  console.log(JSON.stringify({ mapas: linhas, mutante: MUTANTE || null }, null, 1));
} else {
  console.log(`CONTRATO DE MAPA — ${linhas.length} mapas${MUTANTE ? `  [mutante: ${MUTANTE}]` : ''}\n`);
  for (const r of linhas) {
    if (r.erro) { console.log(`  x ${r.id.padEnd(16)} ${r.erro}`); continue; }
    if (r.faltando.length) {
      console.log(`  x ${r.id.padEnd(16)} faltam ${r.faltando.length}:`);
      for (const f of r.faltando) console.log(`      ${f.chave} (${f.viu}, esperado ${f.tipo})  <- ${f.onde}`);
      continue;
    }
    const opt = r.opcionais.length ? `  (sem ${r.opcionais.map((o) => o.chave).join('/')} — opcional)` : '';
    const il = r.nos - r.alcancados;
    const teto = ILHADOS_MAX[r.id] ?? 0;
    const conexo = il === 0 ? 'conexo'
      : il <= teto ? `${il} ilhados (teto ${teto})`
      : `${il} ILHADOS > teto ${teto}`;
    if (r.malformadas.length) console.log(`  x ${r.id.padEnd(16)} adj não-array em ${r.malformadas.length} linha(s): ${r.malformadas.slice(0, 5).join(', ')}`);
    console.log(`  ${r.chamavel && !mc3.includes(r) ? 'ok' : ' x'} ${r.id.padEnd(16)} ${String(r.nos).padStart(4)} nós · ${String(r.arestas).padStart(5)} arestas · rota ${r.chamavel ? 'ok' : `FALHA${r.rotaErro ? ` (${r.rotaErro.slice(0, 40)})` : ''}`} · ${conexo}${opt}`);
  }
  console.log('');
  console.log(`  MC1 contrato completo        ${mc1.length ? `FALHA — ${mc1.map((r) => r.id).join(', ')}` : 'PASSA'}`);
  console.log(`  MC2 rota indexa nós válidos  ${mc2.length ? `FALHA — ${mc2.map((r) => `${r.id}${r.rotaErro ? ` (lançou)` : ''}`).join(', ')}` : 'PASSA'}`);
  console.log(`  MC3 grafo conexo             ${mc3.length ? `FALHA — ${mc3.map((r) => `${r.id} ${r.nos - r.alcancados} ilhados > ${ILHADOS_MAX[r.id] ?? 0}`).join(', ')}` : `PASSA (${Object.keys(ILHADOS_MAX).length} com teto de ilhados)`}`);
}

process.exit(mc1.length + mc2.length + mc3.length ? 1 : 0);
