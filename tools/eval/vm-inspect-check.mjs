#!/usr/bin/env node
/* O default do vm-inspect ficou apontando para um GLB removido e depois para o
   corpo do doador (pernas/botas). Este portão exige uma arma publicada e prova
   as duas cláusulas com --mutante=fantasma|corpo. */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const HTML = readFileSync(join(ROOT, 'public/vm-inspect.html'), 'utf8');
const MUTANTE = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1];

function avaliar(src) {
  const match = src.match(/const\s+SRC\s*=\s*qp\.get\(['"]src['"]\)\s*\|\|\s*['"]([^'"]+)['"]/);
  if (!match) return ['default de SRC não encontrado'];
  const caminho = match[1];
  const erros = [];
  if (!caminho.startsWith('models/weapons/')) erros.push(`default não é arma publicada: ${caminho}`);
  const relativo = `public/${caminho}`;
  if (!existsSync(join(ROOT, relativo))) erros.push(`default não existe: ${relativo}`);
  try { execFileSync('git', ['ls-files', '--error-unmatch', relativo], { cwd: ROOT, stdio: 'ignore' }); }
  catch { erros.push(`default não está versionado: ${relativo}`); }
  return erros;
}

if (MUTANTE) {
  const alvo = MUTANTE === 'fantasma' ? 'models/weapons/fantasma.glb'
    : MUTANTE === 'corpo' ? 'models/fparms/arms.glb' : null;
  if (!alvo) { console.error('mutante deve ser fantasma ou corpo'); process.exit(2); }
  const mutado = HTML.replace(/models\/weapons\/pistol\.glb/, alvo);
  if (mutado === HTML) { console.error('mutação não casou o default'); process.exit(2); }
  const erros = avaliar(mutado);
  if (erros.length) { console.log(`✓ mutação ${MUTANTE} pega: ${erros.join('; ')}`); process.exit(0); }
  console.error(`✗ mutação ${MUTANTE} passou; régua cega`);
  process.exit(1);
}

const erros = avaliar(HTML);
if (erros.length) {
  for (const erro of erros) console.error(`✗ VMI1 ${erro}`);
  process.exit(1);
}
console.log('✓ VMI1 vm-inspect usa uma arma publicada, existente e versionada');
