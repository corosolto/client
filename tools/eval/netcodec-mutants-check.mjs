/* Prova causal da semântica de mutante do netcodec-check: aplicação é estado separado da
   detecção (âncora 0/ambígua → exit 2), e DETECTADO exige SÓ a cláusula alvo apagada. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const CHECK = path.join(HERE, 'netcodec-check.mjs');
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const NET = path.join(ROOT, 'public/js/net.js');
const TP = path.join(ROOT, 'public/js/transporte.js');
const hash0 = [sha(NET), sha(TP)];

let verdes = 0, vermelhas = 0;
const roda = (args, cwd, espera, frases, proibidas = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { cwd, encoding: 'utf8', timeout: 60_000 });
  const saida = (r.stdout || '') + (r.stderr || '');
  const nome = `${path.basename(cwd)} ${args.join(' ')}`.trim();
  const problemas = [];
  if (Array.isArray(espera) ? !espera.includes(r.status) : r.status !== espera) problemas.push(`exit ${r.status} (esperado ${espera})`);
  for (const f of frases) if (!saida.includes(f)) problemas.push(`faltou "${f}"`);
  for (const f of proibidas) if (saida.includes(f)) problemas.push(`saiu "${f}"`);
  if (/(^|\n)(Error|SyntaxError|TypeError|ReferenceError)[^\n]*\n\s+at /.test(saida)) problemas.push('stack não tratada');
  if (problemas.length) { vermelhas++; console.log(`XX ${nome}\n   ${problemas.join(' | ')}`); }
  else { verdes++; console.log(`ok ${nome} → exit ${r.status}`); }
};

roda([], ROOT, 0, ['APROVADO']);
roda(['--mutante=sem-negociacao'], ROOT, 0, ['DETECTADO — só a cláusula alvo apagou', 'FALHA cliente negocia']);
roda(['--mutante=sem-decoder'], ROOT, 0, ['DETECTADO — só a cláusula alvo apagou', 'FALHA o caminho de produção chama o decoder real']);
roda(['--mutante=estranho'], ROOT, 1, ['mutante desconhecido: estranho']);

/* Drift de fonte em cópia temporária: o produto em disco nunca é tocado (hash no fim). */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'netcodec-mut-'));
const tmpJs = path.join(TMP, 'public/js');
fs.mkdirSync(tmpJs, { recursive: true });
fs.symlinkSync(path.join(ROOT, 'public/js/netcodec.js'), path.join(tmpJs, 'netcodec.js'));
const escreve = (alvo, munge) => fs.writeFileSync(path.join(tmpJs, alvo), munge(fs.readFileSync(path.join(ROOT, 'public/js', alvo), 'utf8')));

escreve('transporte.js', (s) => s.replace('new WebSocket(this.url, SNAPSHOT_PROTOCOLS)', 'new WebSocket(this.url, PROTOS_VELHOS)'));
escreve('net.js', (s) => s);
roda(['--mutante=sem-negociacao'], TMP, 2, ['NÃO APLICOU: âncora presente 0 vez(es)'], ['DETECTADO']);

escreve('transporte.js', (s) => s.concat('\n// espelho: new WebSocket(this.url, SNAPSHOT_PROTOCOLS)\n'));
roda(['--mutante=sem-negociacao'], TMP, 2, ['NÃO APLICOU: âncora presente 2 vez(es)'], ['DETECTADO']);

escreve('transporte.js', (s) => s.replace(/binaryType\s*=\s*'arraybuffer'/, "binaryType = 'blob'"));
roda(['--mutante=sem-negociacao'], TMP, 1, ['REPROVADO — acendeu cláusulas além da alvo'], ['DETECTADO']);

escreve('transporte.js', (s) => s);
escreve('net.js', (s) => s.replace('decodeSnapshot(dados)', 'decodeSnapshotVelho(dados)'));
roda(['--mutante=sem-decoder'], TMP, 2, ['NÃO APLICOU: âncora presente 0 vez(es)'], ['DETECTADO']);

fs.rmSync(TMP, { recursive: true, force: true });
const hash1 = [sha(NET), sha(TP)];
if (hash1.join() !== hash0.join()) { vermelhas++; console.log('XX produto mudou no disco'); }
else { verdes++; console.log(`ok net.js/transporte.js intactos (${hash0[0].slice(0, 12)}…/${hash0[1].slice(0, 12)}…)`); }

console.log(`\nnetcodec-mutants: ${verdes} ok, ${vermelhas} falha(s)`);
process.exit(vermelhas ? 1 : 0);
