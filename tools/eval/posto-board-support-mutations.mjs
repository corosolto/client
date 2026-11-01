// Nominal e mutantes do suporte: seis cláusulas completas e conjunto exato de falhas.
// Status de sonda cega/infra nunca conta como reprovação medida.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ids = ['SUP1', 'SUP2', 'SUP3', 'SUP4', 'SUP5', 'SUP6'];
const casos = [
  ['', []], ['sem-apoio', ['SUP2', 'SUP6']], ['interrompido', ['SUP2']],
  ['oculto', ['SUP2']], ['colisor', ['SUP3']], ['perna-rgb', ['SUP2']],
  ['papel-fora', ['SUP4']], ['papel-fino', ['SUP5']],
];

export function aceitar(r, esperado) {
  if (r.error || r.signal || r.status !== (esperado.length ? 1 : 0)) return false;
  const linhas = String(r.stdout || '').split('\n').map(l => l.match(/^(SUP[1-6]) (PASSA|FALHA) — /)).filter(Boolean);
  if (linhas.length !== 6 || ids.some(id => linhas.filter(l => l[1] === id).length !== 1)) return false;
  const falhas = linhas.filter(l => l[2] === 'FALHA').map(l => l[1]).sort();
  return JSON.stringify(falhas) === JSON.stringify([...esperado].sort());
}

const argv = process.argv.slice(2);
if (argv.length > 1 || (argv.length && argv[0] !== '--self-test')) {
  console.error('uso: node tools/eval/posto-board-support-mutations.mjs [--self-test]');
  process.exit(2);
}
if (argv[0] === '--self-test') {
  const saida = falhas => ids.map(id => `${id} ${falhas.includes(id) ? 'FALHA' : 'PASSA'} — prova`).join('\n');
  const provas = [
    [aceitar({ status: 0, stdout: saida([]) }, []), true],
    [aceitar({ status: 1, stdout: saida([]) }, ['SUP2']), false],
    [aceitar({ status: 4, stdout: saida([]) }, ['SUP2']), false],
    [aceitar({ status: 1, stdout: saida(['SUP2']) }, ['SUP2']), true],
    [aceitar({ status: 3, stdout: saida(['SUP2']) }, ['SUP2']), false],
    [aceitar({ status: 1, stdout: saida(['SUP3']) }, ['SUP2']), false],
    [aceitar({ status: 1, stdout: saida(['SUP2']).replace(/^SUP1.*\n/, '') }, ['SUP2']), false],
  ];
  if (provas.some(([obtido, esperado]) => obtido !== esperado)) process.exit(1);
  console.log(`POSTO-SUPPORT wrapper: ${provas.length}/${provas.length} controles, incluindo escape all-PASS/exit1`);
} else {
  const gate = fileURLToPath(new URL('./posto-board-support-check.mjs', import.meta.url));
  for (const [mutante, esperado] of casos) {
    const r = spawnSync(process.execPath, [gate, ...(mutante ? ['--mutante=' + mutante] : [])], {
      encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024,
    });
    if (!aceitar(r, esperado)) {
      console.error(`POSTO-SUPPORT wrapper recusou ${mutante || 'nominal'}: status=${r.status}, alvo=${esperado.join(',') || 'nenhum'}`);
      console.error(((r.stdout || '') + '\n' + (r.stderr || '')).slice(-2400));
      process.exit(r.error || r.signal || [2, 3, 4].includes(r.status) ? 3 : 1);
    }
    console.log(`POSTO-SUPPORT ${mutante || 'nominal'}: conjunto ${esperado.join(',') || 'GREEN'} confirmado`);
  }
  console.log(`POSTO-SUPPORT causal ${casos.length}/${casos.length}`);
}
