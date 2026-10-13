#!/usr/bin/env node
/* Gera public/js/brasoes_versao.js: hash de conteúdo de cada PNG em public/img/brasoes.
 * O edge segura /img/ por 30 dias sem purge no deploy da Vercel; sem ?v= de conteúdo o
 * brasão trocado continua velho em produção (b.png: 32846 B no edge, 21692 B na main).
 * `--check` é o gate; `--mutante=defasado` prova que ele morde.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const DIR = join(ROOT, 'public', 'img', 'brasoes');
export const OUT = join(ROOT, 'public', 'js', 'brasoes_versao.js');

export function versoes() {
  const out = {};
  for (const f of readdirSync(DIR).filter((n) => /^[a-z]\.png$/.test(n)).sort()) {
    out[f[0]] = createHash('sha256').update(readFileSync(join(DIR, f))).digest('hex').slice(0, 12);
  }
  return out;
}

export const fonte = (v) => `export const BRASAO_VERSAO = Object.freeze(${JSON.stringify(v)});
export const urlDoBrasao = (letra) => \`img/brasoes/\${letra}.png?v=\${BRASAO_VERSAO[letra] || 'sem-versao'}\`;
`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
  const v = versoes();
  if (!Object.keys(v).length) { console.error(`nenhum brasão em ${DIR}`); process.exit(1); }
  const nova = fonte(v);
  if (process.argv.includes('--check')) {
    let atual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (MUT === 'defasado') atual = atual.replace(/"b":"[0-9a-f]{12}"/, '"b":"000000000000"');
    if (atual !== nova) {
      console.error(`BRASAO-VERSAO: public/js/brasoes_versao.js defasado em relação a public/img/brasoes; rode \`npm run brasoes:versao\` e commite (senão o edge serve o brasão antigo por até 30 dias)`);
      process.exit(1);
    }
    console.log(`BRASAO-VERSAO: ${Object.keys(v).length} brasões com hash de conteúdo em dia`);
  } else {
    writeFileSync(OUT, nova);
    console.log(`escrito ${OUT}: ${Object.keys(v).length} brasões`);
  }
}
