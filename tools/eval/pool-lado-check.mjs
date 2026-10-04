/* POOL-LADO-CHECK — o elenco de cada lado só tem quem pode jogar naquele lado.
   Esquerda (E) e Direita (B) deixaram de ser facção contra facção: o pool é único e cada
   personagem declara os lados permitidos (`ladosDe`, characters.js). Cláusulas:
     PL1  em 60 sorteios E×B, todo aliado pode jogar na Esquerda e todo inimigo na Direita
     PL2  ANTIVACUIDADE: personagem dos dois lados (fora das categorias E/B) entra no sorteio
     PL3  o mesmo personagem não aparece nos dois times da mesma partida
     PL4  numa partida E×B cada bot veste a cor do LADO (braçadeira/rim), não a da categoria
   Mutantes: `categoria` volta ao filtro antigo por facção (`c.team === lado`); `veste` desliga
   o `_defNoLado` (bot volta a vestir a cor da categoria). */
import { CHARACTERS, pickMatchRoster, bootGame, initTextures, Game } from './harness.mjs';
import { PALETA } from '../../public/js/paleta.js';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const { ladosDe, podeNoLado } = await import('../../public/js/characters.js');
const pode = MUT === 'categoria' ? (c, lado) => c.team === lado : podeNoLado;
const falhas = [];
const cobra = (cond, cod, txt, det) => { console.log(`${cod} · ${txt}\n   ${det}\n   ${cond ? 'PASSA' : 'FALHA'}`); if (!cond) falhas.push(cod); };

const SORTEIOS = 60, TIME = 5;
let foraDoLado = [], neutros = new Set(), repetidos = [];
for (let i = 0; i < SORTEIOS; i++) {
  const r = pickMatchRoster('E', 'B', TIME, null);
  for (const d of r.allyDefs) if (!pode(d, 'E')) foraDoLado.push(`${d.id}@E`);
  for (const d of r.enemyDefs) if (!pode(d, 'B')) foraDoLado.push(`${d.id}@B`);
  for (const d of [...r.allyDefs, ...r.enemyDefs]) if (ladosDe(d).length === 2) neutros.add(d.id);
  const aliados = new Set(r.allyDefs.map((d) => d.id));
  for (const d of r.enemyDefs) if (aliados.has(d.id)) repetidos.push(d.id);
}
cobra(foraDoLado.length === 0, 'PL1', 'cada lado só escala quem pode jogar nele',
  `${SORTEIOS} sorteios, time ${TIME}: ${foraDoLado.length} fora do lado ${foraDoLado.slice(0, 6).join(' ')}`);
const totalNeutros = CHARACTERS.filter((c) => ladosDe(c).length === 2).length;
cobra(neutros.size >= Math.min(8, totalNeutros), 'PL2', 'personagens dos dois lados entram no sorteio',
  `${neutros.size} de ${totalNeutros} neutros apareceram`);
cobra(repetidos.length === 0, 'PL3', 'nenhum personagem nos dois times da mesma partida',
  `${repetidos.length} repetições ${[...new Set(repetidos)].slice(0, 6).join(' ')}`);

{
  if (MUT === 'veste') Game.prototype._defNoLado = (def) => def;
  const g = bootGame('posto_treta', { textures: initTextures(), bots: 5 });
  const tomBraco = (f) => parseInt(((f === 'F' || f === 'U') ? PALETA[f].base : PALETA[f].escura).slice(1), 16);
  const cores = (mesh) => { const out = new Set(); mesh.group.traverse((o) => { const m = o.material; if (m && m.color) out.add(m.color.getHex()); }); return out; };
  const errados = [];
  let neutrosEmCampo = 0;
  for (const b of g.bots) {
    const lado = g._factionOf(b.team);
    if (b.def.team === lado) continue;
    neutrosEmCampo++;
    const c = cores(b.mesh);
    if (!c.has(tomBraco(lado)) || c.has(tomBraco(b.def.team))) errados.push(`${b.def.id}(${b.def.team})@${b.team}`);
  }
  cobra(neutrosEmCampo > 0 && errados.length === 0, 'PL4', 'cada bot veste a cor do lado, não a da categoria',
    `${neutrosEmCampo} bots de outra categoria em campo; ${errados.length} com a cor errada ${errados.slice(0, 5).join(' ')}`);
}

console.log(falhas.length ? `\nVERMELHO — ${falhas.join(', ')}` : '\nVERDE');
process.exit(falhas.length ? 1 : 0);
