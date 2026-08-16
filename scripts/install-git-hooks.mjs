import { spawnSync } from 'node:child_process';

const atual = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' });
if (atual.error) {
  console.warn('[hooks] Git indisponível; instalação automática ignorada.');
} else if (atual.status === 0 && atual.stdout.trim() !== '.githooks') {
  console.warn(`[hooks] core.hooksPath=${atual.stdout.trim()} preservado; use git commit -s.`);
} else if (atual.status !== 0) {
  const instalado = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks']);
  if (instalado.status !== 0) console.warn('[hooks] fora de um clone Git; instalação ignorada.');
}
