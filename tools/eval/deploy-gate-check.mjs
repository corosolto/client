#!/usr/bin/env node
/* ============================================================================
   deploy-gate-check.mjs — QUEM BLOQUEIA O PR É O CI, NÃO A VERCEL
   ----------------------------------------------------------------------------
   MEDIDO EM 21/08/2026: Vercel vermelha em 13 dos 14 PRs vindos de fork, sempre
   com `Authorization required to deploy.` - a proteção de fork da própria Vercel,
   que não se resolve por commit nenhum. E em 4 PRs de casa o vermelho era build
   real, uma vez por `fetch-decals.sh` não ter baixado o acervo (196 de 197
   decalques faltando) num soluço de rede.

   Para poder tirar a Vercel do caminho crítico do PR, duas coisas precisam valer:

   DG1 · o CI constrói o site no próprio PR. Sem isso, tirar a Vercel do bloqueio
         deixaria o PR sem NENHUMA prova de que o site compila.
   DG2 · nenhum download do caminho do build corre sem retry. `set -e` mais um
         `curl` sem `--retry` transforma soluço de rede em PR vermelho, e o autor
         não tem o que consertar - é o mesmo dano do portão que não pode medir.
   DG4 · a liberação AUTOMÁTICA do preview exige as duas coisas ao mesmo tempo: autor já
         convidado para o repositório E diff longe de área sensível. O preview roda
         `vercel build`, que executa o build DO FORK com o VERCEL_TOKEN no ambiente —
         aprovar é dar execução de código a quem abriu o PR. Soltar qualquer um dos dois
         lados transforma o conforto de não clicar num vetor de roubo de token.
   DG3 · a etiqueta que autoriza o preview de fork é criada por quem depende dela.
         O job existia e a etiqueta não: o bot pedia um rótulo que ninguém podia
         aplicar, e o caminho de preview era código morto.

   Uso: node tools/eval/deploy-gate-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { readFileSync, readdirSync } from 'node:fs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = { 'ci-sem-build': 'DG1', 'download-sem-retry': 'DG2', 'preview-sem-etiqueta': 'DG3', 'etiqueta-nao-registrada': 'DG3', 'preview-solta-estranho': 'DG4', 'preview-solta-sensivel': 'DG4' };
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ler = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const falhas = [];

/* ---- DG1: o CI constrói no PR ---- */
let ci = ler('.github/workflows/ci.yml');
if (MUT === 'ci-sem-build') ci = ci.replace('run: npm run build', 'run: echo pulei o build');
const on = (ci.match(/^on:\n([\s\S]*?)(?=^\S)/m) || [])[1] || '';
if (!/^\s{2}pull_request:/m.test(on) || !/run:\s*npm run build/.test(ci)) {
  falhas.push('DG1 ci.yml não constrói o site em pull_request — sem isso a Vercel não pode sair do bloqueio');
}

/* ---- DG2: download do build com retry ---- */
const FETCHERS = readdirSync('scripts').filter((f) => /^fetch-.*\.sh$/.test(f));
for (const f of FETCHERS) {
  let sh = ler(`scripts/${f}`);
  if (MUT === 'download-sem-retry' && f === 'fetch-decals.sh') {
    sh = sh.replace(/curl --retry \d+[^"]*-fsSL/, 'curl -fsSL');
  }
  for (const linha of sh.split('\n')) {
    if (!/^\s*curl\s/.test(linha)) continue;
    if (!/--retry\b/.test(linha)) {
      falhas.push(`DG2 scripts/${f}: curl sem --retry no caminho do build — soluço de rede vira PR vermelho`);
    }
  }
}
if (!FETCHERS.length) falhas.push('DG2 nenhum scripts/fetch-*.sh encontrado — a régua perdeu o alvo');

/* ---- DG3: a etiqueta do preview nasce com quem a usa ---- */
let preview = ler('.github/workflows/preview-bot.yml');
if (MUT === 'preview-sem-etiqueta') preview = preview.replace(/ensure_labels\.py preview-autorizado/, 'ensure_labels.py');
const usaEtiqueta = /github\.event\.label\.name == 'preview-autorizado'/.test(preview);
const criaEtiqueta = /ensure_labels\.py[^\n]*\bpreview-autorizado\b/.test(preview);
/* Chamar o ensure_labels não basta: ele IGNORA em silêncio qualquer nome que não esteja
   no dicionário LABELS dele. Pedir a criação sem registrar o rótulo é o mesmo código
   morto de antes, só que mais difícil de enxergar. */
let labels = ler('scripts/ci/ensure_labels.py');
if (MUT === 'etiqueta-nao-registrada') labels = labels.replace(/^\s*"preview-autorizado".*$/m, '');
const registraEtiqueta = /"preview-autorizado":\s*\(/.test(labels);
if (usaEtiqueta && !criaEtiqueta) {
  falhas.push('DG3 preview-bot.yml exige a etiqueta `preview-autorizado` e não a cria — o caminho de preview vira código morto');
} else if (usaEtiqueta && !registraEtiqueta) {
  falhas.push('DG3 `preview-autorizado` é pedida ao ensure_labels.py mas não está no dicionário LABELS dele — a criação é ignorada em silêncio');
}

/* ---- DG4: a liberação automática tem as duas travas ---- */
if (MUT === 'preview-solta-estranho') preview = preview.replace(/&& \[ "\$CONHECIDO" = "1" \]/, '');
if (MUT === 'preview-solta-sensivel') preview = preview.replace(/\[ "\$PERIGO" -eq 0 \] && /, '');
const autoLabel = /--add-label preview-autorizado/.test(preview);
if (autoLabel) {
  const guarda = (preview.match(/if \[ "\$PERIGO"[^\n]*\n\s*gh pr edit[^\n]*--add-label preview-autorizado/) || [''])[0];
  if (!/CONHECIDO" = "1"/.test(guarda)) {
    falhas.push('DG4 o preview é liberado sozinho sem conferir se o autor é colaborador — dá execução de código com o VERCEL_TOKEN a qualquer um');
  }
  if (!/PERIGO" -eq 0/.test(guarda) || !/TOTAL" -le/.test(guarda)) {
    falhas.push('DG4 o preview é liberado sozinho sem conferir área sensível nem tamanho do diff');
  }
  if (!/collaborators\/\$AUTOR\/permission/.test(preview)) {
    falhas.push('DG4 a liberação automática não consulta a permissão do AUTOR do PR');
  }
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m DG o PR é bloqueado pelo build do CI; download tem retry (${FETCHERS.length} fetchers); etiqueta de preview existe`);
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
