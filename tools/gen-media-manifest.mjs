#!/usr/bin/env node
/* Gera public/img/walls.json a partir dos wallpapers versionados.
 *
 * A pasta é a fonte de verdade: arquivos wall-N.webp e loading-N.webp entram em
 * ordem numérica. PNG continua sendo fonte pesada e nunca é servido pelo jogo.
 * `--check` é o gate de CI/deploy; `--mutante=defasado` prova que ele morde.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const IMG = join(ROOT, 'public', 'img');
const OUT = join(IMG, 'walls.json');
const CHECK = process.argv.includes('--check');
const MUTANT = (process.argv.find((arg) => arg.startsWith('--mutante=')) || '').split('=')[1] || '';

function listWebp(prefix) {
  const pattern = new RegExp(`^${prefix}-(\\d+)\\.webp$`);
  return readdirSync(IMG)
    .map((file) => {
      const match = file.match(pattern);
      return match ? { number: Number(match[1]), file } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.number - b.number)
    .map(({ file }) => `/img/${file}`);
}

const fresh = {
  walls: listWebp('wall'),
  loading: listWebp('loading'),
};
if (MUTANT === 'defasado') fresh.walls.push('/img/wall-999.webp');

if (!fresh.walls.length || !fresh.loading.length) {
  console.error(`walls/loading vazios em ${IMG}`);
  process.exit(1);
}

if (CHECK) {
  const current = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null;
  const matches = current && JSON.stringify(current) === JSON.stringify(fresh);
  console.log(`MEDIA-CHECK: ${fresh.walls.length} walls + ${fresh.loading.length} loading`);
  if (!matches) {
    console.error('public/img/walls.json defasado; rode `npm run media` e commite');
    process.exit(1);
  }
  console.log('manifesto em dia com o disco');
} else {
  writeFileSync(OUT, `${JSON.stringify(fresh, null, 2)}\n`);
  console.log(`escrito ${OUT}: ${fresh.walls.length} walls + ${fresh.loading.length} loading`);
}
