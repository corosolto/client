#!/usr/bin/env node
/* Prova que o bootstrap cria Worker ausente e nunca sobrescreve um existente. */
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const raiz = resolve(import.meta.dirname, '../..');
const temporario = mkdtempSync(join(tmpdir(), 'csb-cf-bootstrap-'));
const bin = join(temporario, 'bin');
await import('node:fs/promises').then(({ mkdir }) => mkdir(bin));
const log = join(temporario, 'npx.log');
writeFileSync(join(bin, 'curl'), `#!/usr/bin/env bash
set -euo pipefail
saida=
proxima_saida=0
for argumento in "$@"; do
  if [ "$proxima_saida" = 1 ]; then saida="$argumento"; proxima_saida=0; continue; fi
  [ "$argumento" = -o ] && { proxima_saida=1; continue; }
done
printf '%s' '{"fixture":true}' > "$saida"
printf '%s' "$FAKE_HTTP"
`);
writeFileSync(join(bin, 'npx'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_NPX_LOG"
`);
chmodSync(join(bin, 'curl'), 0o755);
chmodSync(join(bin, 'npx'), 0o755);

function executar(codigo) {
  writeFileSync(log, '');
  const resultado = spawnSync('bash', ['tools/cf/bootstrap-worker.sh', 'csb-fixture'], {
    cwd: raiz,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      CLOUDFLARE_API_TOKEN: 'fixture',
      CLOUDFLARE_ACCOUNT_ID: 'conta-fixture',
      FAKE_HTTP: codigo,
      FAKE_NPX_LOG: log,
    },
  });
  return { ...resultado, npx: readFileSync(log, 'utf8').trim() };
}

const existente = executar('200');
if (existente.status !== 0 || existente.npx) throw new Error('bootstrap sobrescreveu Worker existente');
const ausente = executar('404');
if (ausente.status !== 0 || !ausente.npx.includes('wrangler@4.158.0 deploy tools/cf/bootstrap-worker.mjs --name csb-fixture')) {
  throw new Error(`bootstrap não criou Worker ausente: status=${ausente.status} npx=${ausente.npx}`);
}
const erro = executar('500');
if (erro.status === 0 || erro.npx) throw new Error('bootstrap publicou após erro da API');

console.log('cf-bootstrap: Worker existente preservado e ausente criado');
