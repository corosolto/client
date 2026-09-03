/* ============================================================================
   workflow-local-action-check.mjs — ACTION LOCAL QUE NÃO EXISTE MATA O JOB
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Medido em 26/08/2026 (issue #456): o `issues-bot.yml` chamava
   `uses: ./.github/actions/setup` em três jobs — `triage`, `review-open-issues`
   e `bootstrap` — e `.github/actions/` nunca existiu na história do repositório
   (`git log origin/main -- .github/actions` volta vazio).

   Action local é resolvida no checkout do próprio repositório: o job morre no
   PRIMEIRO passo, com "Can't find action.yml", antes de qualquer lógica. Foi
   assim que o caminho de bootstrap ficou de pé por meses sem abrir uma PR
   sequer, enquanto o workflow prometia que abria.

   Custa caro justamente porque é latente: o erro só aparece quando o gatilho
   raro dispara, e até lá o job aparece `skipped` na lista de runs.

   O QUE ELA MEDE: todo `uses: ./caminho` aponta para um diretório que existe e
   contém `action.yml` ou `action.yaml`.

   Mutantes: caminho-fantasma (aponta um `uses: ./` para pasta inexistente).

   Uso: node tools/eval/workflow-local-action-check.mjs
        [--mutante=caminho-fantasma]
   ============================================================================ */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['caminho-fantasma'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, '.github/workflows');

/* Parser de linha, não de YAML: a régua roda no `check:deploy`, que é node puro
   e sem dependência. Pega `uses: ./x` em qualquer indentação, com ou sem aspas. */
function usosLocais(fonte) {
  const achados = [];
  fonte.split('\n').forEach((linha, i) => {
    const m = /^\s*-?\s*uses:\s*['"]?(\.\/[^'"\s#]+)/.exec(linha);
    if (m) achados.push({ caminho: m[1], linha: i + 1 });
  });
  return achados;
}

const falhas = [];
let total = 0;
for (const arquivo of readdirSync(DIR).filter((f) => f.endsWith('.yml')).sort()) {
  let fonte = readFileSync(path.join(DIR, arquivo), 'utf8');
  if (mutante === 'caminho-fantasma' && arquivo === 'ci.yml') {
    fonte = fonte.replace(/^(\s*)- uses: actions\/checkout@.*$/m, '$1- uses: ./.github/actions/nao-existe');
  }
  for (const uso of usosLocais(fonte)) {
    total += 1;
    const base = path.join(ROOT, uso.caminho);
    const tem = existsSync(path.join(base, 'action.yml')) || existsSync(path.join(base, 'action.yaml'));
    if (!tem) {
      falhas.push(`WLA1 ${arquivo}:${uso.linha} · \`uses: ${uso.caminho}\` sem action.yml/action.yaml no caminho — o job morre no primeiro passo`);
    }
  }
}

for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mWORKFLOW-LOCAL-ACTION ${falhas.length} VERMELHA(S)\x1b[0m${mutante ? ` (mutante=${mutante})` : ''}`);
  process.exitCode = 1;
} else {
  console.log(`\x1b[32mWORKFLOW-LOCAL-ACTION verde: ${total} uso(s) de action local, todos existem\x1b[0m`);
}
