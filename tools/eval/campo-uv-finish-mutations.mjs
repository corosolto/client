// Nominal e mutantes do suporte: sete cláusulas completas e conjunto exato de falhas.
// Status de sonda cega/infra nunca conta como reprovação medida.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ids = ['CU-1', 'CU-2', 'CU-3', 'CU-4', 'CU-5', 'CU-6', 'CU-7'];
const casos = [
  ['', []], ['guardrepeat20x3',['CU-1']], ['removerguardUV',['CU-3']],
  ['guardperiod2m',['CU-3']], ['removerfimUV',['CU-5','CU-6']],
  ['removerlock',['CU-4']], ['uv-rank1',['CU-3']],
  ['face-ausente',['CU-3']], ['repeat-nao-finito',['CU-1']], ['inventario-compensado',['CU-3']],
];

export function aceitar(r, esperado) {
  if (r.error || r.signal || r.status !== (esperado.length ? 1 : 0)) return false;
  const protocolo = String(r.stdout || '').split('\n').filter(l => /^CU-/.test(l));
  const linhas = protocolo.map(l => l.match(/^(CU-[1-7]) (PASSA|FALHA) — /));
  if (linhas.some(l => !l)) return false;
  if (linhas.length !== 7 || ids.some(id => linhas.filter(l => l[1] === id).length !== 1)) return false;
  const falhas = linhas.filter(l => l[2] === 'FALHA').map(l => l[1]).sort();
  return JSON.stringify(falhas) === JSON.stringify([...esperado].sort());
}

const argv = process.argv.slice(2);
if (argv.length > 1 || (argv.length && argv[0] !== '--self-test')) {
  console.error('uso: node tools/eval/campo-uv-finish-mutations.mjs [--self-test]');
  process.exit(2);
}
if (argv[0] === '--self-test') {
  const saida = falhas => ids.map(id => `${id} ${falhas.includes(id) ? 'FALHA' : 'PASSA'} — prova`).join('\n');
  const provas = [
    [aceitar({ status: 0, stdout: saida([]) }, []), true],
    [aceitar({ status: 1, stdout: saida([]) }, ['CU-2']), false],
    [aceitar({ status: 4, stdout: saida([]) }, ['CU-2']), false],
    [aceitar({ status: 1, stdout: saida(['CU-2']) }, ['CU-2']), true],
    [aceitar({ status: 3, stdout: saida(['CU-2']) }, ['CU-2']), false],
    [aceitar({ status: 1, stdout: saida(['CU-3']) }, ['CU-2']), false],
    [aceitar({ status: 1, stdout: saida(['CU-2']).replace(/^CU-1.*\n/, '') }, ['CU-2']), false],
    [aceitar({ status: 0, stdout: saida([])+'\nCU-8 FALHA — extra' }, []), false],
    [aceitar({ status: 0, stdout: saida([])+'\nCU-2 ERROR — extra' }, []), false],
  ];
  if (provas.some(([obtido, esperado]) => obtido !== esperado)) process.exit(1);
  console.log(`CAMPO-UV wrapper: ${provas.length}/${provas.length} controles, incluindo escape all-PASS/exit1`);
} else {
  const gate = fileURLToPath(new URL('./campo-uv-finish-check.mjs', import.meta.url));
  for (const [mutante, esperado] of casos) {
    const r = spawnSync(process.execPath, [gate, ...(mutante ? ['--mutar=' + mutante] : [])], {
      encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024,
    });
    if (!aceitar(r, esperado)) {
      console.error(`CAMPO-UV wrapper recusou ${mutante || 'nominal'}: status=${r.status}, alvo=${esperado.join(',') || 'nenhum'}`);
      console.error(((r.stdout || '') + '\n' + (r.stderr || '')).slice(-2400));
      process.exit(r.error || r.signal || [2, 3, 4].includes(r.status) ? 3 : 1);
    }
    console.log(`CAMPO-UV ${mutante || 'nominal'}: conjunto ${esperado.join(',') || 'GREEN'} confirmado`);
  }
  console.log(`CAMPO-UV causal ${casos.length}/${casos.length}`);
}
