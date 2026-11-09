#!/usr/bin/env node
/* As bancadas locais (dev.html, ui-v3-kit.html, reticle-pu.png) nunca saem publicadas.
   O teste roda prune-dist numa árvore descartável. --mutante=early-exit devolve
   o bug do #131 (saída antes da lista de alvos) e precisa ficar vermelho.
   `models/fpvm`, `editor/` e `js/editor` saíram da lista em 11/2026: as pastas
   não existem mais no repo, então a régua deixou de exigir a poda delas. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SCRIPT = join(ROOT, 'scripts/prune-dist.mjs');
const MUTANTE = process.argv.includes('--mutante=early-exit');

function arquivo(base, relativo) {
  const alvo = join(base, relativo);
  mkdirSync(dirname(alvo), { recursive: true });
  writeFileSync(alvo, 'fixture');
}

function executar(script) {
  const base = mkdtempSync(join(tmpdir(), 'csbr-prune-'));
  const dev = [
    'dist/client/dev.html', '.vercel/output/static/dev.html',
    'dist/client/ui-v3-kit.html', '.vercel/output/static/ui-v3-kit.html',
    'dist/client/img/reticle-pu.png', '.vercel/output/static/img/reticle-pu.png',
  ];
  try {
    for (const alvo of dev) arquivo(base, alvo);
    const run = spawnSync(process.execPath, [script], { cwd: base, encoding: 'utf8' });
    const erros = [];
    if (run.status !== 0) erros.push(`prune-dist saiu ${run.status}: ${run.stderr.trim()}`);
    for (const alvo of dev) if (existsSync(join(base, alvo))) erros.push(`prune-dist publicou ${alvo}`);
    return erros;
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

if (MUTANTE) {
  const base = mkdtempSync(join(tmpdir(), 'csbr-prune-mutant-'));
  try {
    const mutante = join(base, 'prune-mutant.mjs');
    const fonte = readFileSync(SCRIPT, 'utf8');
    const alterada = fonte.replace(
      "const ALVOS = [",
      "process.exit(0); // mutante: saída antecipada antiga\nconst ALVOS = [",
    );
    if (alterada === fonte) { console.error('mutação não casou o script'); process.exit(2); }
    writeFileSync(mutante, alterada);
    const erros = executar(mutante);
    if (erros.some((erro) => erro.includes('publicou'))) {
      console.log(`✓ mutação early-exit pega: ${erros.join('; ')}`);
      process.exit(0);
    }
    console.error(`✗ mutação early-exit passou: ${erros.join('; ') || 'nenhum erro'}`);
    process.exit(1);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

const erros = executar(SCRIPT);
if (erros.length) {
  for (const erro of erros) console.error(`✗ PRUNE1 ${erro}`);
  process.exit(1);
}
console.log('✓ PRUNE1 prune-dist poda as bancadas locais do publicado');
