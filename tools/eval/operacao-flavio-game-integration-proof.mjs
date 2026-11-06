// Driver: cada mutante precisa derrubar a cláusula de integração que o identifica.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const match = fileURLToPath(new URL('./operacao-flavio-match-integration-check.mjs', import.meta.url));
const recovery = fileURLToPath(new URL('./operacao-flavio-recovery-fire-check.mjs', import.meta.url));
const originalRegroup = fileURLToPath(new URL('./operacao-flavio-regroup-obstacle-check.mjs', import.meta.url));
const pressure = fileURLToPath(new URL('./operacao-flavio-pressure-check.mjs', import.meta.url));
const forwarded = process.argv.slice(2);
const run = (script, args = []) => spawnSync(process.execPath, [script, ...forwarded, ...args], {
  encoding: 'utf8', timeout: 60000, maxBuffer: 2000000,
});
const baseline = (script, name) => {
  const result = run(script);
  if (result.status !== 0 || result.signal || result.error) {
    console.error(`${name}: status=${result.status}, signal=${result.signal}, error=${result.error?.message || ''}`);
    console.error(`${result.stdout}${result.stderr}`.slice(-3000));
  }
  assert.equal(result.status, 0, `${name}: baseline verde`);
  assert.ok(!result.signal && !result.error, `${name}: execução limpa`);
  console.log(`integration-proof: ${name} verde`);
};
baseline(match, 'rodadas, resultado e relógios');
baseline(recovery, 'cadência de recuperação e LOS');
baseline(originalRegroup, 'regroup obstacle original');
baseline(pressure, 'pressão dos atacantes e equipamento/combate do VIP');

for (const [script, name, clause] of [
  [match, 'fim-na-primeira', 'escolta respeita rounds configurados e decide pelo placar acumulado'],
  [match, 'vencedor-da-ultima', 'escolta respeita rounds configurados e decide pelo placar acumulado'],
  [match, 'stats-de-territorio', 'escolta de uma rodada termina sem objective.regras nem território'],
  [match, 'timeout-fora-escolta', 'Javaporcos não herda o relógio nem o teto de rodadas da escolta'],
  [match, 'spawn-sem-autoria', 'spawn B da escolta usa yaw autorado na câmera e nos corpos'],
  [recovery, 'cadencia-longa', 'guarda de skill baixa no slot volta a disparar dentro da janela visível de dois segundos'],
  [recovery, 'cadencia-global', 'pausa longa de skill baixa permanece inalterada fora da escolta'],
  [recovery, 'tiro-sem-los', 'recuperação não dispara quando a linha de visão está fechada'],
  [pressure, 'sem-pressao', 'atacantes recebem destino de contestação na rota do VIP'],
  [pressure, 'vip-de-faca', 'VIP tem pistola visível, colete e capacete restaurados a cada rodada'],
  [pressure, 'vip-sem-armadura', 'VIP tem pistola visível, colete e capacete restaurados a cada rodada'],
  [pressure, 'vip-sem-combate', 'VIP vivo usa aquisição LOS, tiro e recarga genéricos'],
]) {
  const result = run(script, [`--mutante=${name}`]);
  const output = `${result.stdout}${result.stderr}`;
  if (!(result.status === 1 && !result.signal && !result.error
    && output.includes(`Mutação aplicada: ${name}`)
    && output.includes(`✗ ${clause}:`))) {
    console.error(`${name}: status=${result.status}, signal=${result.signal}, error=${result.error?.message || ''}`);
    console.error(output.slice(-3000));
  }
  assert.equal(result.status, 1, `${name}: mutante deve falhar a régua`);
  assert.ok(!result.signal && !result.error, `${name}: falha semântica, não de infraestrutura`);
  assert.ok(output.includes(`Mutação aplicada: ${name}`), `${name}: mutação aplicada de fato`);
  assert.ok(output.includes(`✗ ${clause}:`), `${name}: cláusula precisa detectada`);
  console.log(`integration-proof: ${name} detectado por ${clause}`);
}
