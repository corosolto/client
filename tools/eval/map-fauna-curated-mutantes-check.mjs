/* Driver dos mutantes do menu backdrop (crítica estraga-codigo no #1155): a negação
 * genérica `! node --test` aceitava QUALQUER exit != 0 — crash de import, módulo
 * ausente ou infra quebrada contava como "mutante morto". Aqui cada mutante exige
 * exit 1 E o conjunto exato de testes que devem falhar por causa daquele guarda. */
import { spawnSync } from 'node:child_process';

const ESPERADO = {
  'fauna-gates': ['decorative fauna is requested only after props are ready',
    'ready props release the menu while decorative fauna is still pending'],
  'stale-map': ['old props and fauna cannot rebuild a newly selected map',
    'old callbacks from A cannot redraw after switching A to B and back to A',
    'callbacks cannot redraw when map changes without starting a new preload',
    'pending old props cannot redraw after A to B to A'],
  'ignore-seq': ['old callbacks from A cannot redraw after switching A to B and back to A',
    'pending old props cannot redraw after A to B to A'],
  'ignore-map': ['callbacks cannot redraw when map changes without starting a new preload'],
  'no-late-fauna': ['decorative fauna is requested only after props are ready',
    'ready props release the menu while decorative fauna is still pending'],
};

let reprovado = false;
for (const [mutante, marcadores] of Object.entries(ESPERADO)) {
  const r = spawnSync(process.execPath, ['--test', 'tests/menu-backdrop.test.mjs'],
    { env: { ...process.env, MENU_BACKDROP_MUTANT: mutante }, encoding: 'utf8' });
  const saida = (r.stdout || '') + '\n' + (r.stderr || '');
  const falhas = [...saida.matchAll(/^✖ (.+?)(?: \([\d.]+ms\))?$/gm)]
    .map((m) => m[1].trim()).filter((nome) => nome !== 'failing tests:');
  const motivos = [];
  if (r.status !== 1) motivos.push(`exit ${r.status} (esperado 1: o mutante não morreu pelo contrato)`);
  const ausentes = marcadores.filter((m) => !falhas.includes(m));
  if (ausentes.length) motivos.push(`falhas esperadas ausentes: ${ausentes.join(' | ')}`);
  const estranhas = falhas.filter((f) => !marcadores.includes(f));
  if (estranhas.length) motivos.push(`falhas fora do contrato: ${estranhas.join(' | ')}`);
  if (motivos.length) { console.error(`mutante ${mutante}: REPROVADO — ${motivos.join('; ')}`); reprovado = true; }
  else console.log(`mutante ${mutante}: morto pelo contrato próprio (${falhas.length} falhas exatas)`);
}
if (reprovado) process.exit(1);
console.log('mutantes-check: os 5 mutantes morrem exatamente pelos contratos próprios');
