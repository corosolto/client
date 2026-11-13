// Traduz o recibo exato da Piscina para o driver semântico sem trocar seu juiz.
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { avaliarFilho, bindings, CLAUSULA } from './piscina-graffiti-batch-check.mjs';

const MUTANTE = 'lote-sem-permissao';
export function traduzirResultado(result, expected) {
  if (expected?.mutante !== MUTANTE) return { ok: false, kind: 'InfrastructureError', reason: 'mutante esperado inválido' };
  const verdict = avaliarFilho(result, expected);
  if (!verdict.ok) return { ok: false, kind: verdict.kind, reason: verdict.reason };
  return { ok: true, report: { mutant: MUTANTE, cases: 1, error: null,
    failed: [{ type: 'ContractViolation', clause: CLAUSULA,
      message: `Os quatro lotes autorais ficaram pintáveis: ${verdict.rec.pintaveis.join(', ')}` }] } };
}

function main(args) {
  if (args.length !== 1 || args[0] !== '--mutante=' + MUTANTE) {
    console.error('uso: node tools/eval/piscina-mutante-adapter.mjs --mutante=' + MUTANTE);
    return 2;
  }
  const sources = bindings(), nonce = randomUUID();
  const env = { PATH: process.env.PATH, LANG: 'C', PISCINA_BATCH_NONCE: nonce };
  if (process.env.TMPDIR) env.TMPDIR = process.env.TMPDIR;
  const result = spawnSync(process.execPath,
    [fileURLToPath(new URL('./piscina-graffiti-batch-check.mjs', import.meta.url)), '--mutante=' + MUTANTE],
    { cwd: fileURLToPath(new URL('../../', import.meta.url)), env, encoding: 'utf8',
      timeout: 180000, maxBuffer: 8 * 1024 * 1024 });
  if (JSON.stringify(sources) !== JSON.stringify(bindings())) {
    console.error('InfrastructureError: fontes mudaram durante a medição');
    return 3;
  }
  const verdict = traduzirResultado(result, { nonce, mutante: MUTANTE, sources });
  if (!verdict.ok) {
    console.error(verdict.kind + ': ' + verdict.reason);
    return verdict.kind === 'ContractViolation' ? 1 : 3;
  }
  console.log('Mutação aplicada: ' + MUTANTE);
  console.log(JSON.stringify(verdict.report));
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error('InfrastructureError: ' + String(error.message).slice(0, 500)); process.exitCode = 3; }
}
