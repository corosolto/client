/* BTC — bots em combate não avançam/recuam até fechar voltas no próprio rastro.
   Cenário real do relato: CTF no Ferro Velho, 4×4, semente 4242, 180 s. O detector
   geométrico exige quase uma volta completa em 6 s, com caminho ≥3 m e pouco avanço líquido.
   Uso: node tools/eval/bot-combat-loop-check.mjs [--mutante=sem-postura|fuga-lateral] */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mutante = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';
if (mutante && !['sem-postura', 'fuga-lateral'].includes(mutante)) throw new Error(`mutante desconhecido: ${mutante}`);
const script = fileURLToPath(new URL('./botsim.mjs', import.meta.url));
const env = { ...process.env, SIM_CTF: '1', SIM_MOVING_LOOPS: '1', SIM_SEEDS: '4242' };
if (mutante === 'sem-postura') env.SIM_MUT_MID_WANDER = '1';
if (mutante === 'fuga-lateral') env.SIM_MUT_SIDE_COVER = '1';
const child = spawnSync(process.execPath, [script, '180', 'ferro_velho'], {
  encoding: 'utf8', env, maxBuffer: 1 << 24,
});
if (child.status !== 0) throw new Error(`botsim falhou: ${(child.stderr || child.stdout).slice(-1200)}`);
const line = child.stderr.split('\n').find((value) => value.startsWith('MOVING_LOOPS '));
if (!line) throw new Error('botsim não entregou MOVING_LOOPS — a régua não sabe medir');
const report = JSON.parse(line.slice('MOVING_LOOPS '.length));
const loops = report.targetPresent;
const limite = 6;
const ok = loops <= limite;
console.log(`${ok ? 'PASSA' : 'FALHA'} BTC1 · Ferro Velho CTF: ${loops} volta(s) de combate em ${report.bots.length} bots/180 s (teto ${limite})`);
if (mutante) {
  console.log(ok ? `mutante ${mutante} NÃO detectado` : `mutante ${mutante} detectado`);
  process.exit(ok ? 1 : 0);
}
process.exit(ok ? 0 : 1);
