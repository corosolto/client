#!/usr/bin/env node
/* Prova que a virada nunca sobrescreve nem remove uma rota pertencente a outro Worker. */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const raiz = resolve(import.meta.dirname, '../..');
const temporario = mkdtempSync(join(tmpdir(), 'csb-cf-virada-'));
const bin = join(temporario, 'bin');
const log = join(temporario, 'mutacoes.log');
await import('node:fs/promises').then(({ mkdir }) => mkdir(bin));
const curl = join(bin, 'curl');
writeFileSync(curl, `#!/usr/bin/env bash
set -euo pipefail
metodo=GET
url=
proximo_metodo=0
for argumento in "$@"; do
  if [ "$proximo_metodo" = 1 ]; then metodo="$argumento"; proximo_metodo=0; continue; fi
  [ "$argumento" = "-X" ] && { proximo_metodo=1; continue; }
  case "$argumento" in https://*) url="$argumento";; esac
done
case "$url" in
  *'/zones?name='*) printf '%s\\n' '{"result":[{"id":"zone-fixture"}]}' ;;
  *'/workers/routes')
    if [ "$metodo" = GET ]; then
      case "\${FAKE_OWNER:-}" in
        __none) printf '%s\\n' '{"result":[]}' ;;
        mixed-liga)
          printf '%s\\n' '{"result":[{"id":"r3","pattern":"csbrasil.online/*","script":"worker-alheio"}]}' ;;
        mixed-desliga)
          printf '%s\\n' '{"result":[{"id":"r1","pattern":"www.corosolto.com.br/*","script":"csb-prod"},{"id":"r2","pattern":"www.csbrasil.online/*","script":"csb-prod"},{"id":"r3","pattern":"csbrasil.online/*","script":"worker-alheio"}]}' ;;
        proprios)
          printf '%s\\n' '{"result":[{"id":"r1","pattern":"www.corosolto.com.br/*","script":"csb-prod"},{"id":"r2","pattern":"www.csbrasil.online/*","script":"csb-prod"},{"id":"r3","pattern":"csbrasil.online/*","script":"csb-apex"}]}' ;;
        *)
          printf '{"result":[{"id":"r1","pattern":"www.corosolto.com.br/*","script":"%s"},{"id":"r2","pattern":"www.csbrasil.online/*","script":"%s"},{"id":"r3","pattern":"csbrasil.online/*","script":"%s"}]}\\n' "$FAKE_OWNER" "$FAKE_OWNER" "$FAKE_OWNER" ;;
      esac
    else
      printf '%s %s\\n' "$metodo" "$url" >> "$FAKE_LOG"
      printf '%s\\n' '{"success":true}'
    fi
    ;;
  *'/workers/routes/'*)
    printf '%s %s\\n' "$metodo" "$url" >> "$FAKE_LOG"
    printf '%s\\n' '{"success":true}'
    ;;
  *) printf 'URL inesperada: %s\\n' "$url" >&2; exit 9 ;;
esac
`);
chmodSync(curl, 0o755);

function executar(acao, owner) {
  writeFileSync(log, '');
  const resultado = spawnSync('bash', ['tools/cf/virada.sh', acao], {
    cwd: raiz,
    encoding: 'utf8',
    env: {
      ...process.env,
      TMPDIR: temporario,
      PATH: `${bin}:${process.env.PATH}`,
      CLOUDFLARE_API_TOKEN: 'fixture',
      FAKE_OWNER: owner,
      FAKE_LOG: log,
    },
  });
  return { ...resultado, mutacoes: readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) };
}

const lock = join(temporario, 'csb-cf-virada.lock');
mkdirSync(lock);
const concorrente = executar('liga', '__none');
rmSync(lock, { recursive: true });
if (concorrente.status === 0 || concorrente.mutacoes.length) {
  throw new Error(`liga concorrente não foi bloqueada: status=${concorrente.status} mutações=${concorrente.mutacoes.join(',')}`);
}
const ligaEstrangeira = executar('liga', 'worker-alheio');
if (ligaEstrangeira.status === 0 || ligaEstrangeira.mutacoes.length) {
  throw new Error(`liga alterou rota alheia: status=${ligaEstrangeira.status} mutações=${ligaEstrangeira.mutacoes.join(',')}`);
}
const desligaEstrangeira = executar('desliga', 'worker-alheio');
if (desligaEstrangeira.status === 0 || desligaEstrangeira.mutacoes.length) {
  throw new Error(`desliga alterou rota alheia: status=${desligaEstrangeira.status} mutações=${desligaEstrangeira.mutacoes.join(',')}`);
}
const ligaMista = executar('liga', 'mixed-liga');
if (ligaMista.status === 0 || ligaMista.mutacoes.length) {
  throw new Error(`liga alterou rotas antes de descobrir dona alheia: status=${ligaMista.status} mutações=${ligaMista.mutacoes.join(',')}`);
}
const desligaMista = executar('desliga', 'mixed-desliga');
if (desligaMista.status === 0 || desligaMista.mutacoes.length) {
  throw new Error(`desliga alterou rotas antes de descobrir dona alheia: status=${desligaMista.status} mutações=${desligaMista.mutacoes.join(',')}`);
}
const ligaAusente = executar('liga', '__none');
if (ligaAusente.status !== 0 || ligaAusente.mutacoes.length !== 3 || ligaAusente.mutacoes.some((linha) => !linha.startsWith('POST '))) {
  throw new Error(`liga ausente inválida: status=${ligaAusente.status} mutações=${ligaAusente.mutacoes.join(',')}`);
}
const desligaPropria = executar('desliga', 'proprios');
// Apex nas mãos do csb-prod (desenho antigo) é rota de outro Worker para a virada atual.
const apexNoProd = executar('desliga', 'csb-prod');
if (apexNoProd.status === 0 || apexNoProd.mutacoes.length) {
  throw new Error(`desliga removeu rotas com o apex fora do csb-apex: status=${apexNoProd.status} mutações=${apexNoProd.mutacoes.join(',')}`);
}
if (desligaPropria.status !== 0 || desligaPropria.mutacoes.length !== 3 || desligaPropria.mutacoes.some((linha) => !linha.startsWith('DELETE '))) {
  throw new Error(`desliga própria inválida: status=${desligaPropria.status} mutações=${desligaPropria.mutacoes.join(',')}`);
}

console.log('cf-virada: propriedade das rotas preservada');
