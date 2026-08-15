/* ============================================================================
   fixture-check.mjs — SCRIPT QUE DECIDE NO CI PRECISA DE FIXTURE
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A lei 3 da casa ("toda invariante vem com a mutação que a faz ficar vermelha")
   sempre valeu para os portões de `tools/eval/`. Os scripts de `scripts/ci/` —
   que decidem automerge, deduplicação de crash, triagem e roteamento de PR —
   ficaram de fora, e em 12/08/2026 dois bugs moraram exatamente aí: um filtro
   que nunca casava e um separador de registro que colidia com o dado. Os dois
   teriam morrido na primeira fixture.

   O QUE ELA MEDE: todo `scripts/ci/*.py` TOCADO pelo diff aceita `--selftest` e
   sai 0. Ratchet, não faxina: o que já existia sem fixture está registrado em
   SEM_FIXTURE e essa lista **só pode encolher** — tocar num script legado é o
   momento de escrever a fixture dele, e o portão cobra ali.

    Mutantes: sem-fixture (toca script da dívida sem fixture - FX1), selftest-quebrado
    (finge que o autoteste reprova - FX2) e lista-cresce (dispensa sintética entra na
    SEM_FIXTURE - FX3).

   Uso: node tools/eval/fixture-check.mjs [--base=origin/main]
        [--mutante=lista-cresce|selftest-quebrado]
   ============================================================================ */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { relatarBaseAusente, resolverBase } from './base-ref.mjs';

const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !['lista-cresce', 'selftest-quebrado', 'sem-fixture'].includes(mutante)) {
  throw new Error(`mutante desconhecido: ${mutante}`);
}
const base = arg('base') || 'origin/main';

/* Dívida herdada: script de decisão que nasceu sem fixture. A lista só encolhe.
   Quem tocar num destes escreve o `--selftest` no mesmo PR. */
const SEM_FIXTURE = new Set([
  'scripts/ci/ensure_labels.py',
  'scripts/ci/issue_review.py',
  'scripts/ci/issue_sweep.py',
  'scripts/ci/issue_triage.py',
  'scripts/ci/pr_classify.py',
  'scripts/ci/pr_comment.py',
  'scripts/ci/pr_route.py',
]);

const git = (args, fallback = '') => {
  try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return fallback; }
};

/* Antes de qualquer medição: base que não resolve virava diff vazio e lista de
   base vazia — as duas cláusulas passavam verde sem olhar nada. */
const resolucao = resolverBase(base);
if (!resolucao.ok) process.exit(relatarBaseAusente('FIXTURE', resolucao));

let tocados = git(['diff', '--name-only', `${base}...HEAD`]).split('\n')
  .filter((f) => /^scripts\/ci\/.+\.py$/.test(f) && existsSync(f));
if (mutante === 'lista-cresce') SEM_FIXTURE.add('scripts/ci/fantasma.py');
/* O mutante do FX2 aponta para um script que TEM fixture: sem isso ele cairia no
   FX1 e a cláusula do autoteste quebrado nunca seria exercitada. */
if (mutante === 'selftest-quebrado') tocados = ['scripts/ci/agente_check.py'];
/* FX1 puro: tocar num script da dívida SEM ter escrito a fixture dele. */
if (mutante === 'sem-fixture') tocados = ['scripts/ci/pr_route.py'];

const falhas = [];
for (const arquivo of tocados) {
  if (SEM_FIXTURE.has(arquivo)) {
    falhas.push(`FX1 ${arquivo} decide no CI e não tem \`--selftest\`. Tocou nele? Escreva a fixture no mesmo PR e tire-o da lista SEM_FIXTURE.`);
    continue;
  }
  let ok = false;
  try {
    execFileSync('python3', [arquivo, '--selftest'], { stdio: 'ignore' });
    ok = true;
  } catch { ok = false; }
  if (mutante === 'selftest-quebrado') ok = false;
  if (!ok) falhas.push(`FX2 ${arquivo} não passa em \`python3 ${arquivo} --selftest\``);
}

/* A lista não pode GANHAR entrada. Comparar só o TAMANHO deixava trocar um script
   por outro sem acusar - dispensa nova entrando enquanto uma velha sai (greptile,
   PR #209). A comparação é de conjunto. */
const ESTE = 'tools/eval/fixture-check.mjs';
let existiaNaBase = true;
try { execFileSync('git', ['cat-file', '-e', `${base}:${ESTE}`], { stdio: 'ignore' }); } catch { existiaNaBase = false; }
const naBase = existiaNaBase ? git(['show', `${base}:${ESTE}`]) : '';
let daBase;
if (existiaNaBase && naBase) {
  daBase = new Set([...naBase.matchAll(/'(scripts\/ci\/[^']+)'/g)].map((m) => m[1]));
} else if (existiaNaBase) {
  falhas.push(`FX0 a lista de dispensa existe em \`${base}\` mas não pôde ser lida — sem ela não dá para saber se cresceu`);
  daBase = new Set();
} else {
  /* Este arquivo é NOVO na base: não há lista anterior para ler. A dívida
     herdada é DERIVADA - todo script de ci da base que já não tinha --selftest.
     Sem isso, FX3 ficava cego justamente no PR que cria a régua. */
  daBase = new Set();
  for (const f of git(['ls-tree', '-r', '--name-only', base, 'scripts/ci/']).split('\n').filter((f) => f.endsWith('.py'))) {
    if (!/--selftest/.test(git(['show', `${base}:${f}`]))) daBase.add(f);
  }
}
const novas = [...SEM_FIXTURE].filter((a) => !daBase.has(a));
if (novas.length) falhas.push(`FX3 a lista SEM_FIXTURE ganhou dispensa: ${novas.join(', ')} — ela só encolhe`);

for (const f of falhas) console.error(`  \x1b[31m✗\x1b[0m ${f}`);
if (falhas.length) {
  console.error(`\x1b[31mFIXTURE ${falhas.length} VERMELHA(S)\x1b[0m${mutante ? ` (mutante=${mutante})` : ''}`);
  process.exitCode = 1;
} else {
  console.log(`\x1b[32mFIXTURE verde: ${tocados.length} script(s) de CI tocado(s), ${SEM_FIXTURE.size} na dívida herdada\x1b[0m`);
}
