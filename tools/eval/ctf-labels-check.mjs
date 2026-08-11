/* ============================================================================
   ctf-labels-check.mjs — BANDEIRA COM NOME DO PRÓPRIO MAPA, DECLARADA PELO MAPA.
   ----------------------------------------------------------------------------
   POR QUE EXISTE (defeito do dono, 06/08, com estas palavras)
     "mapa ctf na piscina ta com bandeiras com nome do patio brasilia"

   CAUSA RAIZ: os rótulos CONGRESSO/ÔNIBUS/CATEDRAL moravam no FALLBACK do game.js
   (_initCTF) e vazavam para qualquer mapa sem `world.ctfPoints` — os dois mapas de
   piscina não declaravam. O conserto tem duas pernas: todo mapa registrado DECLARA as
   próprias bandeiras, e o fallback ficou com rótulo neutro (BASE A/CENTRO/BASE B) para
   mapa futuro nunca herdar monumento alheio.

   O QUE ELA EXIGE, construindo cada mapa REGISTRADO no harness (código de produção):
     · CTFL1  world.ctfPoints declarado, com ≥3 pontos e rótulo não-vazio em todos;
     · CTFL2  os nomes de monumento de Brasília só aparecem no praca_poderes;
     · CTFL3  rótulos únicos dentro do mapa (dois "CENTRO" no HUD não orientam ninguém).

   MUTAÇÃO (régua que não morde não existe):
     --mutante=vaza   apaga a declaração do piscina_treta depois do build — o mapa volta a
                      cair no fallback e a CTFL1 tem que ficar VERMELHA.

   Uso: node tools/eval/ctf-labels-check.mjs [--mutante=vaza]
   ============================================================================ */
import { THREE, MAPS, initTextures } from './harness.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const BRASILIA = new Set(['CONGRESSO', 'ÔNIBUS', 'CATEDRAL']);

const T = initTextures();
let vermelho = 0;
for (const [id, def] of Object.entries(MAPS)) {
  const W = def.build(new THREE.Scene(), T);
  if (MUT === 'vaza' && id === 'piscina_treta') delete W.ctfPoints;
  const pts = W.ctfPoints || [];
  const falhas = [];
  if (pts.length < 3 || pts.some((p) => !p.label || !String(p.label).trim())) {
    falhas.push('CTFL1 sem declaração própria (cairia no fallback genérico)');
  }
  const rot = pts.map((p) => String(p.label).toUpperCase());
  if (id !== 'praca_poderes' && rot.some((l) => BRASILIA.has(l))) {
    falhas.push(`CTFL2 rótulo de Brasília fora do praca_poderes: ${rot.filter((l) => BRASILIA.has(l)).join(',')}`);
  }
  if (new Set(rot).size !== rot.length) falhas.push('CTFL3 rótulo repetido no mesmo mapa');
  if (falhas.length) vermelho++;
  console.log(`${falhas.length ? 'CTFL VERMELHA ' : 'CTFL ok       '}${id.padEnd(14)} [${rot.join(' · ') || 'SEM PONTOS'}]${falhas.length ? ' | ' + falhas.join(' | ') : ''}`);
}
console.log(vermelho ? `CTFLABELS ${vermelho} VERMELHA(S)` : 'CTFLABELS verde');
if (vermelho) process.exitCode = 1;
