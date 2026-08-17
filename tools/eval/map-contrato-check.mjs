/* map-contrato-check.mjs — TODO MAPA TEM DE DEVOLVER O QUE O JOGO CONSOME.
 * ══════════════════════════════════════════════════════════════════════════════════
 * POR QUE EXISTE
 *
 * O contrato de `build(scene, T)` nunca esteve escrito em lugar nenhum. Ele existia
 * como acordo tácito entre os `map_*.js` escritos à mão e o `game.js` — e acordo
 * tácito não reprova nada.
 *
 * O defeito que fez esta régua nascer: o editor de mapa (repo privado) tem DOIS
 * caminhos para a mesma cena. O "▶ Testar mapa" roda `buildEditorMap()`, que devolve
 * `waypoints`, `nearestWaypoint` e `findPath`. O "⬇ Exportar .js" roda `exportCode()`,
 * que NAO devolve nenhum dos tres. O comentario do proprio builder promete
 * "testar == o que voce vai exportar", e a promessa e' mantida a mao.
 *
 * O jogo desreferencia os tres SEM GUARDA:
 *     game.js:4157   const nd = this.world.waypoints.nodes;
 *     game.js:4292   let from = W.nearestWaypoint(b.pos.x, b.pos.z);
 *     game.js:4298   b.path = W.findPath(...)
 *
 * Ou seja: o mapa que voce TESTOU tem IA de bot, e o mapa que voce EXPORTOU quebra
 * nela. E' a pior forma do defeito — o teste passa e a entrega falha.
 *
 * O QUE ELA MEDE
 *  MC1  todo mapa do registro devolve as chaves que o jogo consome
 *  MC2  as funcoes do contrato sao chamaveis e devolvem o tipo certo
 *  MC3  o grafo de navegacao nao nasce vazio nem desconexo do proprio mapa
 *
 * A LISTA DE CHAVES NAO E' OPINIAO. Ela foi extraida do que `game.js` de fato le
 * de `this.world` / `W`; ver `CONSUMIDO`, com arquivo:linha em cada entrada. Chave
 * nova no jogo entra aqui, e a regua avisa quando um mapa nao a tiver.
 *
 * USO
 *   node tools/eval/map-contrato-check.mjs
 *   node tools/eval/map-contrato-check.mjs --mutante=sem-waypoints   # o teste do teste
 *   node tools/eval/map-contrato-check.mjs --extra=/caminho/map_x.js # mapa AINDA nao registrado
 *   node tools/eval/map-contrato-check.mjs --json
 *
 * O `--extra` existe para o caso que mais importa: mapa recem-saido do editor, antes de
 * alguem registra-lo no `maps.js`. Descobrir que ele quebra a IA de bot DEPOIS de estar
 * no registro e' descobrir tarde.
 */
import { THREE, MAPS, initTextures } from './harness.mjs';

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split('=').slice(1).join('=') : d;
};
const MUTANTE = arg('mutante', '');
const JSONOUT = process.argv.includes('--json');

/* O CONTRATO — E ELE NAO E' OPINIAO MINHA.
 *
 * `obrigatorio` nao quer dizer "eu acho importante": quer dizer que o `game.js`
 * DESREFERENCIA a chave sem guarda, entao mapa sem ela derruba o frame. `opcional`
 * quer dizer que o jogo escreveu a guarda e tem fallback.
 *
 * A primeira versao desta regua marcou `slowAt` e `groundHeightAt` como obrigatorios
 * e reprovou 8 dos 10 mapas que estao EM PRODUCAO E FUNCIONANDO. Os mapas estavam
 * certos e a regua errada — os dois sao guardados. Regua que reprova o que funciona
 * treina quem a le' a ignora-la, que e' o mesmo estrago de nao ter regua.
 *
 * Ao acrescentar chave aqui: cite arquivo:linha e diga se HA guarda no ponto de uso. */
const CONSUMIDO = [
  { chave: 'root', tipo: 'object', obrigatorio: true, onde: 'game.js — scene.add / dispose' },
  { chave: 'colliders', tipo: 'array', obrigatorio: true, onde: 'game.js — _collide' },
  { chave: 'occluders', tipo: 'array', obrigatorio: true, onde: 'game.js:2926 — intersectObjects, sem guarda' },
  { chave: 'spawns', tipo: 'object', obrigatorio: true, onde: 'game.js — _startRound' },
  { chave: 'bounds', tipo: 'object', obrigatorio: true, onde: 'game.js:4462 — const B = this.world.bounds' },
  { chave: 'waypoints', tipo: 'object', obrigatorio: true, onde: 'game.js:4157 — this.world.waypoints.nodes, sem guarda' },
  { chave: 'nearestWaypoint', tipo: 'function', obrigatorio: true, onde: 'game.js:4292 — sem guarda' },
  { chave: 'findPath', tipo: 'function', obrigatorio: true, onde: 'game.js:4298 — sem guarda' },
  { chave: 'groundHeightAt', tipo: 'function', obrigatorio: false, onde: 'game.js:1973 — guardado (? :), cai pra 0' },
  { chave: 'slowAt', tipo: 'function', obrigatorio: false, onde: 'game.js:4329 — guardado (&&), cai pra normal' },
];

const tipoDe = (v) => (Array.isArray(v) ? 'array' : typeof v);

async function medir(id, buildFn) {
  const scene = new THREE.Scene();
  const T = await initTextures();
  let W;
  try {
    W = (buildFn || MAPS[id].build)(scene, T);
  } catch (e) {
    return { id, erro: String(e && e.message || e) };
  }
  /* MUTANTE: arranca do mapa exatamente o que o `exportCode()` nao emite. Se a regua
     continuar verde com isto, ela nao esta medindo o defeito que a fez nascer. */
  if (MUTANTE === 'sem-waypoints') {
    delete W.waypoints; delete W.nearestWaypoint; delete W.findPath;
  }

  const faltando = [], ausentes_opcionais = [];
  for (const c of CONSUMIDO) {
    const v = W[c.chave];
    const problema = (v === undefined || v === null) ? 'ausente'
      : (tipoDe(v) !== c.tipo) ? tipoDe(v) : null;
    if (!problema) continue;
    (c.obrigatorio ? faltando : ausentes_opcionais).push({ ...c, viu: problema });
  }

  /* MC2/MC3 so' rodam se as chaves existirem — nao adianta empilhar erro derivado. */
  let nos = null, arestas = null, chamavel = null;
  if (!faltando.length) {
    const wp = W.waypoints || {};
    nos = (wp.nodes || []).length;
    arestas = (wp.adj || []).reduce((a, l) => a + (l ? l.length : 0), 0);
    try {
      const i = W.nearestWaypoint(0, 0);
      const p = W.findPath(i, Math.min(nos - 1, i + 1));
      chamavel = Number.isInteger(i) && Array.isArray(p) && p.length > 0;
    } catch (e) { chamavel = false; }
  }
  return { id, faltando, ausentes_opcionais, nos, arestas, chamavel };
}

const ids = Object.keys(MAPS);
const linhas = [];
for (const id of ids) linhas.push(await medir(id));

const EXTRA = arg('extra', '');
if (EXTRA) {
  const url = new URL(EXTRA.startsWith('/') ? `file://${EXTRA}` : EXTRA, `file://${process.cwd()}/`);
  const mod = await import(url.href);
  const build = Object.entries(mod).find(([k, v]) => k.startsWith('build') && typeof v === 'function');
  if (!build) {
    console.error(`x ${EXTRA}: nenhum export build* encontrado`);
    process.exit(1);
  }
  linhas.push(await medir(`extra:${build[0]}`, build[1]));
}

const mc1 = linhas.filter((r) => r.erro || (r.faltando && r.faltando.length));
const mc2 = linhas.filter((r) => r.chamavel === false);
const mc3 = linhas.filter((r) => r.nos !== null && (r.nos < 4 || r.arestas === 0));

if (JSONOUT) {
  console.log(JSON.stringify({ mapas: linhas, mutante: MUTANTE || null }, null, 1));
} else {
  console.log(`CONTRATO DE MAPA — ${ids.length} mapas do registro${MUTANTE ? `  [mutante: ${MUTANTE}]` : ''}\n`);
  for (const r of linhas) {
    if (r.erro) { console.log(`  x ${r.id.padEnd(16)} build lancou: ${r.erro}`); continue; }
    if (r.faltando.length) {
      console.log(`  x ${r.id.padEnd(16)} faltam ${r.faltando.length}:`);
      for (const f of r.faltando) console.log(`      ${f.chave} (${f.viu}, esperado ${f.tipo})  <- ${f.onde}`);
    } else {
      const opt = r.ausentes_opcionais.length ? `  (sem ${r.ausentes_opcionais.map((o) => o.chave).join('/')} — opcional)` : '';
      console.log(`  ok ${r.id.padEnd(16)} ${String(r.nos).padStart(4)} nos · ${String(r.arestas).padStart(5)} arestas · rota ${r.chamavel ? 'ok' : 'FALHA'}${opt}`);
    }
  }
  console.log('');
  console.log(`  MC1 contrato completo        ${mc1.length ? `FALHA — ${mc1.map((r) => r.id).join(', ')}` : 'PASSA'}`);
  console.log(`  MC2 rota chamavel            ${mc2.length ? `FALHA — ${mc2.map((r) => r.id).join(', ')}` : 'PASSA'}`);
  console.log(`  MC3 grafo nao nasce vazio    ${mc3.length ? `FALHA — ${mc3.map((r) => r.id).join(', ')}` : 'PASSA'}`);
}

process.exit(mc1.length + mc2.length + mc3.length ? 1 : 0);
