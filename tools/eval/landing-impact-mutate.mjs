import { spawnSync } from 'node:child_process';

const run = spawnSync(process.execPath, [
  '--loader', './tools/eval/landing-impact-loader.mjs',
  'tools/eval/landing-impact-check.mjs',
], { cwd: process.cwd(), encoding: 'utf8' });
const output = `${run.stdout || ''}\n${run.stderr || ''}`;
if (run.status === 0) throw new Error('mutante sem-impacto sobreviveu ao contrato');
if (output.includes('mutante sem-impacto não encontrou o dispatch de produção')) {
  throw new Error('mutante sem-impacto não foi aplicado');
}
if (!output.includes('dispatch deve expor força normalizada do pouso')) {
  throw new Error(`mutante sem-impacto falhou fora da cláusula esperada:\n${output.slice(-1200)}`);
}
console.log('MUTANTE sem-impacto detectado pelo dispatch real de _updatePlayer');
