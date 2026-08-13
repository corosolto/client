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

/* DÍVIDA DECLARADA DE CONEXIDADE — mesmo desenho do `cena-tetos.mjs`: o número sai da
   medição, não de escolha, e serve de trava contra piorar. Estes dois mapas já estão
   em produção com o grafo partido; a régua nasceu depois deles e não pode reprovar o
   que já roda, mas também não vai abençoar. Mapa FORA desta lista tem de ser conexo.

   Medido em 13/08 na alpha.95 (`node tools/eval/map-contrato-check.mjs`). Baixar o
   número é conserto e deve vir com a lista atualizada; subir é regressão e reprova. */
const CONEXIDADE_DIVIDA = {
  loja_h: 143,        // de 634 nós — 77% do grafo inalcançável a partir do nó 0
  ferro_velho: 281,   // de 296 nós — 15 ilhados
};

/* Conexidade: BFS do nó 0, mesmo critério da validatePlan de map_json.js. */
function alcance(nodes, adj) {
  const visto = new Uint8Array(nodes.length);
  const fila = [0];
  visto[0] = 1;
  let n = 1;
  while (fila.length) {
    const i = fila.pop();
    for (const j of (Array.isArray(adj[i]) ? adj[i] : [])) {
      if (Number.isInteger(j) && j >= 0 && j < nodes.length && !visto[j]) { visto[j] = 1; n++; fila.push(j); }
    }
  }
  return n;
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
    const i = W.nearestWaypoint(0, 0);
    const p = W.findPath(i, Math.min(nodes.length - 1, i + 1));
    const chamavel = Number.isInteger(i) && i >= 0 && i < nodes.length
      && Array.isArray(p) && p.length > 0
      && p.every((n) => Number.isInteger(n) && n >= 0 && n < nodes.length);

    return { id, faltando: [], opcionais, nos: nodes.length, arestas, chamavel, alcancados: alcance(nodes, adj) };
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

const mc1 = linhas.filter((r) => r.erro || r.faltando?.length);
const mc2 = linhas.filter((r) => r.chamavel === false);
const divida = (r) => CONEXIDADE_DIVIDA[r.id];
/* Reprova se: mapa sem dívida declarada não é conexo, OU mapa com dívida piorou. */
const mc3 = linhas.filter((r) => r.nos != null && r.alcancados !== r.nos
  && !(divida(r) != null && r.alcancados >= divida(r)));

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
    const d = CONEXIDADE_DIVIDA[r.id];
    const conexo = r.alcancados === r.nos ? 'conexo'
      : (d != null && r.alcancados >= d) ? `partido ${r.alcancados}/${r.nos} (dívida declarada)`
      : `PARTIDO ${r.alcancados}/${r.nos}`;
    console.log(`  ${r.chamavel && !mc3.includes(r) ? 'ok' : ' x'} ${r.id.padEnd(16)} ${String(r.nos).padStart(4)} nós · ${String(r.arestas).padStart(5)} arestas · rota ${r.chamavel ? 'ok' : 'FALHA'} · ${conexo}${opt}`);
  }
  console.log('');
  console.log(`  MC1 contrato completo        ${mc1.length ? `FALHA — ${mc1.map((r) => r.id).join(', ')}` : 'PASSA'}`);
  console.log(`  MC2 rota indexa nós válidos  ${mc2.length ? `FALHA — ${mc2.map((r) => r.id).join(', ')}` : 'PASSA'}`);
  console.log(`  MC3 grafo conexo             ${mc3.length ? `FALHA — ${mc3.map((r) => `${r.id} ${r.alcancados}/${r.nos}`).join(', ')}` : `PASSA (${Object.keys(CONEXIDADE_DIVIDA).length} com dívida declarada)`}`);
}

process.exit(mc1.length + mc2.length + mc3.length ? 1 : 0);
