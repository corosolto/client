#!/usr/bin/env node
/* ============================================================================
   autofix-check.mjs — O BOT CONSERTA, MAS SÓ O QUE É DERIVADO
   ----------------------------------------------------------------------------
   O autofix é a primeira máquina deste repositório com permissão de ESCREVER num
   PR. Isso só é aceitável enquanto três coisas valerem, e esta régua é quem as
   segura:

   AF1 · toda escrita passa pela lista de permissão. Um `git commit`/`git push` no
         autofix.yml que não seja precedido pela trava é a régua inteira contornada.
   AF2 · a lista nunca cobre caminho de código. `public/`, `src/`, `scripts/`,
         `.github/` e os manifestos ficam de fora — inclusive `.github/`, porque um
         bot que edita o workflow que o governa amplia a própria permissão.
   AF3 · o bot não mergeia. Deixar o PR pronto e fechá-lo são coisas diferentes, e
         a segunda é humana (decisão do dono, 21/08).

   Uso: node tools/eval/autofix-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = {
  'autofix-sem-trava': 'AF1',
  'lista-abre-codigo': 'AF2',
  'lista-abre-workflow': 'AF2',
  'autofix-mergeia': 'AF3',
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ler = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const falhas = [];

let wf = ler('.github/workflows/autofix.yml');
let lista = ler('scripts/ci/autofix_allowlist.py');

if (MUT === 'autofix-sem-trava') wf = wf.replace(/autofix_allowlist\.py/g, 'cat');
if (MUT === 'autofix-mergeia') wf = wf.replace('git push origin "HEAD:$HEAD_REF"', 'git push origin "HEAD:$HEAD_REF"\n          gh pr merge "$PR_NUMBER" --squash --auto');
if (MUT === 'lista-abre-codigo') lista = lista.replace('    "docs/",', '    "docs/",\n    "public/",');
if (MUT === 'lista-abre-workflow') lista = lista.replace(/^\s*"\.github\/",$/m, '');

if (!wf) { console.log('  \x1b[31m✗\x1b[0m AF0 .github/workflows/autofix.yml não existe'); process.exit(1); }

/* ---- AF1: escrita só depois da trava ---- */
const usaTrava = /autofix_allowlist\.py/.test(wf);
const escreve = /git (commit|push)/.test(wf);
const posTrava = wf.indexOf('autofix_allowlist.py');
const posCommit = wf.search(/git commit/);
if (escreve && (!usaTrava || posCommit < posTrava)) {
  falhas.push('AF1 autofix.yml escreve no PR sem passar pela lista de permissão antes');
}
/* O commit tem de usar SÓ o que a trava liberou, não um `git add -A`. */
if (/git add\s+(-A|--all|\.)(\s|$)/.test(wf)) {
  falhas.push('AF1 autofix.yml usa `git add` abrangente — o commit deve sair da saída da trava');
}

/* ---- AF2: a lista não cobre código ---- */
if (!lista) falhas.push('AF2 scripts/ci/autofix_allowlist.py não existe');
else {
  const bloco = (lista.match(/PERMITIDOS = \(([\s\S]*?)\)/) || [])[1] || '';
  const proibidos = (lista.match(/PROIBIDOS = \(([\s\S]*?)\)/) || [])[1] || '';
  for (const perigoso of ['public/', 'src/', 'supabase/', 'scripts/', '.github/']) {
    if (new RegExp(`"${perigoso.replace('.', '\\.')}`).test(bloco)) {
      falhas.push(`AF2 a lista de permissão cobre \`${perigoso}\` — o bot passa a poder reescrever código`);
    }
  }
  for (const obrigatorio of ['.github/', 'scripts/', 'package.json']) {
    if (!new RegExp(`"${obrigatorio.replace('.', '\\.')}`).test(proibidos)) {
      falhas.push(`AF2 \`${obrigatorio}\` não está na lista de proibidos`);
    }
  }
}

/* ---- AF3: o bot não mergeia ---- */
if (/gh pr merge/.test(wf)) {
  falhas.push('AF3 autofix.yml mergeia PR — o autofix deixa pronto, quem fecha é gente');
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m AF autofix escreve só o que a trava libera, a lista não cobre código e o bot não mergeia');
if (MUT && !falhas.length) console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
process.exit(falhas.length ? 1 : 0);
