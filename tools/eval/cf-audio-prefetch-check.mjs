import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const tmp = mkdtempSync(path.join(tmpdir(), 'cs-cf-audio-'));
const bin = path.join(tmp, 'bin'), dest = path.join(tmp, 'audio'), cache = path.join(tmp, 'cache');
const zip = path.join(tmp, 'pack.zip'), manifesto = path.join(tmp, 'manifest.json');
mkdirSync(bin, { recursive: true });
writeFileSync(zip, 'bytes-do-pack-privado');
writeFileSync(manifesto, '{"origem":"r2-privado"}\n');
const sha = createHash('sha256').update(readFileSync(zip)).digest('hex');

const executavel = (nome, fonte) => {
  const arquivo = path.join(bin, nome);
  writeFileSync(arquivo, fonte);
  chmodSync(arquivo, 0o755);
};
executavel('npx', `#!/usr/bin/env bash
set -euo pipefail
[ "\${CLOUDFLARE_API_TOKEN:-}" = token-sentinela ]
[ "$1" = --no-install ]; shift
[ "$1" = wrangler ]; shift
[ "$1" = r2 ]; shift
[ "$1" = object ]; shift
[ "$1" = get ]; shift
key="$1"; shift
[ "$key" = audio-pack.zip ]
out=''
bucket=''
remote=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --bucket=*) bucket="\${1#--bucket=}"; shift ;;
    --file) out="$2"; shift 2 ;;
    --remote) remote=1; shift ;;
    *) exit 64 ;;
  esac
done
[ "$bucket" = corosolto-private ]
[ "$remote" = 1 ]
[ -n "$out" ]
cp "$FIXTURE_ZIP" "$out"
`);
executavel('unzip', `#!/usr/bin/env bash
set -euo pipefail
dest=''
while [ "$#" -gt 0 ]; do if [ "$1" = -d ]; then dest="$2"; shift 2; else shift; fi; done
mkdir -p "$dest"
cp "$FIXTURE_MANIFEST" "$dest/manifest.json"
printf 'privado' > "$dest/origem-r2.marker"
`);
executavel('node', '#!/usr/bin/env bash\nexit 0\n');

try {
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    FIXTURE_ZIP: zip,
    FIXTURE_MANIFEST: manifesto,
    AUDIO_DEST: dest,
    AUDIO_CACHE_DIR: cache,
    AUDIO_PACK_URL: 'r2://corosolto-private/audio-pack.zip',
    AUDIO_PACK_SHA256: sha,
    CF_API_TOKEN: 'token-sentinela',
    CLOUDFLARE_ACCOUNT_ID: 'conta-fixture',
  };
  execFileSync('bash', ['scripts/fetch-audio.sh', '--prefetch-r2'], { cwd: root, env, stdio: 'pipe' });
  assert.equal(readFileSync(path.join(dest, 'manifest.json'), 'utf8'), readFileSync(manifesto, 'utf8'));
  assert.equal(readFileSync(path.join(dest, 'origem-r2.marker'), 'utf8'), 'privado');
  assert.equal(readdirSync(cache).filter((nome) => nome.endsWith('.zip')).length, 1, 'prefetch precisa deixar um ZIP verificado no cache');

  const semSegredo = { ...env };
  delete semSegredo.CF_API_TOKEN;
  delete semSegredo.CLOUDFLARE_API_TOKEN;
  const saida = execFileSync('bash', ['scripts/fetch-audio.sh'], { cwd: root, env: semSegredo, encoding: 'utf8' });
  assert.match(saida, /audio\/ já configurado/);
  assert.equal(readFileSync(path.join(dest, 'origem-r2.marker'), 'utf8'), 'privado', 'build sem segredo precisa consumir a árvore extraída do R2');
  console.log('PASS CF-AUDIO: prefetch R2 extrai bytes privados e o build sem segredo os consome');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
