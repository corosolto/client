#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const plans = [
  {
    file: 'tools/eval/cf-borda-check.mjs',
    mutants: [
      'sem-strip', 'vm-sem-etag', 'vm-304-antes-r2', 'vm-sem-sha', 'apex-301',
      'apex-sem-worker-first', 'assets-sem-fallback', 'assets-intercepta-post',
      'cache-ignora-etag', 'cache-sem-stale', 'cache-revalida-condicional',
      'cache-preenche-condicional', 'cache-sem-single-flight', 'cache-sem-fill-flight',
      'cache-aceita-legado', 'cache-dona-sem-waituntil',
    ],
  },
  { file: 'tools/eval/cf-borda-workerd-check.mjs', mutants: ['espera-le-resposta-da-dona'] },
  { file: 'tools/eval/cf-verifica-deploy-check.mjs', mutants: [] },
  { file: 'tools/eval/cf-audio-prefetch-check.mjs', mutants: [] },
  { file: 'tools/eval/cf-bootstrap-check.mjs', mutants: [] },
  { file: 'tools/eval/cf-virada-check.mjs', mutants: [] },
  { file: 'tools/eval/cf-branch-head-check.mjs', mutants: [] },
  {
    file: 'tools/eval/cf-deploy-ref-check.mjs',
    mutants: [
      'staging-dispatch-arbitrario', 'prod-dispatch-arbitrario', 'prod-sem-candidato',
      'prod-sem-preview-url', 'prod-promove-por-tag', 'prod-percentual-com-simbolo',
      'preview-sem-provisionamento', 'preview-base-arbitraria', 'staging-sem-bootstrap',
      'prod-sem-bootstrap', 'preview-sem-bootstrap', 'staging-mantem-obsoleto',
      'prod-mantem-obsoleto',
      'staging-sem-head-guard', 'prod-sem-head-guard', 'prod-gate-head-message',
      'prod-bootstrap-comentado', 'prod-job-if-false', 'prod-verifica-condicional',
      'prod-verifica-continua-erro', 'prod-verifica-decoy',
    ],
  },
];
const requested = process.argv.filter((arg) => arg.startsWith('--mutante=')).map((arg) => arg.slice(10));
const expected = plans.flatMap((plan) => plan.mutants);
if (requested.length && (requested.length !== expected.length || requested.some((name, index) => name !== expected[index]))) {
  console.error(`lista de mutantes divergente: esperado ${expected.join(',')}; recebido ${requested.join(',')}`);
  process.exit(2);
}

for (const plan of plans) {
  const normal = spawnSync(process.execPath, [plan.file], { cwd: root, stdio: 'inherit' });
  if (normal.status !== 0) process.exit(normal.status ?? 1);
  for (const mutant of plan.mutants) {
    const result = spawnSync(process.execPath, [plan.file, `--mutante=${mutant}`], { cwd: root, encoding: 'utf8' });
    if (result.status !== 1) {
      process.stderr.write(`${plan.file} --mutante=${mutant}: esperado exit 1, obtido ${result.status ?? result.signal ?? 'desconhecido'}\n`);
      process.stderr.write(result.stdout || '');
      process.stderr.write(result.stderr || '');
      process.exit(1);
    }
  }
}
console.log('PASS CF-BORDA-SUITE: baselines verdes e todos os mutantes morreram com exit 1');
