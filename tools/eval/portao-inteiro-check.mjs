#!/usr/bin/env node
/* ============================================================================
   portao-inteiro-check.mjs — PORTÃO NÃO PODE CITAR PASSO QUE NÃO EXISTE
   ----------------------------------------------------------------------------
   `check:fast` e `check:deploy` são listas de nomes de script. Se um nome citado
   ali não está definido em `scripts`, o npm morre com "missing script" e o portão
   inteiro para no meio - os passos DEPOIS do nome quebrado nunca rodam.

   DOIS CASOS REAIS, os dois em 22/08/2026:
   · o PR #372 citava `eval:gelo` no `check:fast` e nunca definiu o script. A régua
     `treta-gelo-check.mjs` existia e simplesmente não estava ligada em lugar nenhum;
   · resolvendo o conflito de `package.json` do #408, eu fiquei com a linha do
     `check:` de um lado e perdi as DEFINIÇÕES do outro. Três réguas viraram nome
     órfão de uma vez - e conflito de `package.json` é justamente o que mais
     acontece, porque todo PR que acrescenta régua mexe na mesma linha.

   PI1 · todo nome citado em `check:fast`/`check:deploy` existe em `scripts`.
   PI2 · todo script `eval:*` aponta para arquivo que existe em disco.

   Uso: node tools/eval/portao-inteiro-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, existsSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'passo-orfao': 'PI1', 'regua-fantasma': 'PI2' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = { ...pkg.scripts };
if (MUT === 'passo-orfao') scripts['check:fast'] += ' eval:nao-existe';
if (MUT === 'regua-fantasma') scripts['eval:fantasma'] = 'node tools/eval/nao-existe-check.mjs';

const falhas = [];
const PORTOES = ['check:fast', 'check:deploy'];

/* ---- PI1: nome citado tem de estar definido ---- */
for (const portao of PORTOES) {
  const linha = scripts[portao];
  if (!linha) { falhas.push(`PI1 o portão \`${portao}\` não existe em scripts`); continue; }
  /* A linha é `node tools/eval/runner.mjs a b c`: passo é token com `:` que não é
     caminho. `syntax` é o único passo sem `:` e está definido como script. */
  const passos = linha.split(/\s+/).slice(2).filter((t) => t && !t.includes('/'));
  for (const passo of passos) {
    if (!scripts[passo]) {
      falhas.push(`PI1 ${portao} cita \`${passo}\`, que não está definido em scripts — o npm morre em "missing script" e os passos seguintes NÃO rodam`);
    }
  }
}

/* ---- PI2: régua citada tem de existir em disco ---- */
for (const [nome, cmd] of Object.entries(scripts)) {
  if (nome.startsWith('//')) continue;              // chave de documentação, não é script
  const m = String(cmd).match(/node\s+(tools\/[^\s]+\.mjs)/);
  if (m && !existsSync(m[1])) {
    falhas.push(`PI2 \`${nome}\` aponta para ${m[1]}, que não existe em disco`);
  }
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) {
  const total = PORTOES.reduce((n, p) => n + (scripts[p] || '').split(/\s+/).slice(2).filter((t) => t && !t.includes('/')).length, 0);
  console.log(`  \x1b[32m✓\x1b[0m PI todo passo dos dois portões está definido e aponta para arquivo que existe (${total} citações)`);
}
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
