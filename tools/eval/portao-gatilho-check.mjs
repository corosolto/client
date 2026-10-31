#!/usr/bin/env node
/* ============================================================================
   portao-gatilho-check.mjs — O GATILHO DO PORTÃO COBRE O QUE O PORTÃO MEDE
   ----------------------------------------------------------------------------
   MEDIDO EM 14/10/2026: em 48 h, 13 PRs de jogo passaram sem o portão de navegador
   (#886 e #871 em net.js, #877 em netgame.js, #867 em community.js). O `paths:` do
   portao-browser.yml listava arquivo por arquivo e ninguém lembrava de acrescentar
   o módulo novo. O mesmo filtro também some, sem aviso, em PR com mais de 300
   arquivos, e quando não casa não deixa check nenhum.

   O filtro agora mora em scripts/ci/gatilho.mjs e é chamado por um job `decide`.
   Esta régua mede esse arquivo contra o que os jobs realmente executam:

   PG1 · todo arquivo do FECHO DE IMPORT do que o job roda casa com o gatilho. As
         entradas são os scripts `node` dos passos, a página que o boot abre
         (src/pages/index.astro), o astro.config.mjs, o public/js/main.js, a rota
         /api que o jogo chama no boot e os JSON que os arnêses leem. O fecho segue
         import estático, `import()` literal, `export … from` e `new URL(…,
         import.meta.url)`; caminho absoluto (`/js/x.js`) resolve em public/.
   PG2 · todo `npm run`/`node`/spec dos workflows resolve para ponto de entrada
         conhecido: o `npm run X` está em `passos` do gatilho, o `node arquivo` e o
         spec casam com o gatilho, e todo script que o job usa (aninhado, pre/post,
         ciclo de vida do `npm ci`) aponta para arquivo que casa. E o contrário:
         passo declarado que o workflow não roda mais é vermelho (passo que sumiu).
   PG3 · o `decide` falha FECHADO: `set -euo pipefail`, erro do `git diff` manda
         rodar, evento que não é PR roda sempre, só `rodar=false` exato pula, e todo
         job real tem `needs: decide` + `if:` na saída dele. Nada de `paths:` no `on:`.
   PG4 · a decisão em si: lista vazia roda, docs não acordam, net.js acorda, script
         novo no package.json não acorda, dependência nova acorda, JSON quebrado roda.

         O diff sai com `-c core.quotePath=false -z`: com o padrão, nome com acento vem
         entre aspas em octal, nada casa e o job é pulado. A CLI é provada com nome
         acentuado cru (NUL) e na forma entre aspas.

   PG5 · portão e smoke NÃO escutam `merge_group`: não são obrigatórios, já rodaram no
         PR e, no lote, só disputariam runner com os checks obrigatórios.

   PG6 · pacote público e assert nominal antecedem serve/medição; erro não é ignorado.
         Fetch, assert e imports precisam acordar o portão.

   Mutantes: tira-caminho (PG1), passo-novo (PG2), diff-aberto e quotepath-volta (PG3),
   portao-na-fila (PG5), sem-fetch/fetch-tarde/assert-sem-pack/fetch-ignorado/
   fetch-fora-gatilho (PG6).
   Uso: node tools/eval/portao-gatilho-check.mjs [--mutante=<nome>]
   ============================================================================ */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, normalize } from 'node:path';
import { GATILHOS, casa, decidir, scriptsUsados } from '../../scripts/ci/gatilho.mjs';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = {
  'tira-caminho': 'PG1', 'passo-novo': 'PG2', 'diff-aberto': 'PG3', 'quotepath-volta': 'PG3',
  'portao-na-fila': 'PG5',
  'sem-fetch': 'PG6', 'fetch-tarde': 'PG6', 'assert-sem-pack': 'PG6',
  'fetch-ignorado': 'PG6', 'fetch-fora-gatilho': 'PG6',
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

if (MUT === 'tira-caminho') {
  GATILHOS.portao.padroes = GATILHOS.portao.padroes.filter((re) => !String(re).includes('module-cache'));
}

const ler = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const ehArquivo = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const pkg = JSON.parse(ler('package.json'));
const falhas = [];
let mutPG6Aplicou = false;
if (MUT === 'fetch-fora-gatilho') {
  const antes = GATILHOS.portao.padroes;
  GATILHOS.portao.padroes = antes.filter((p) => !String(p).includes('fetch-decals'));
  mutPG6Aplicou = antes.length !== GATILHOS.portao.padroes.length;
}

/* ---------------------------------------------------------------- fecho ---- */
const CODIGO = /\.(m?js|cjs|ts|astro)$/;
const PADROES_IMPORT = [
  /\b(?:import|export)\s[^'"`;()]{0,400}?\sfrom\s*['"]([^'"\n]+)['"]/g,
  /\bimport\s*['"]([^'"\n]+)['"]/g,
  /\bimport\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /new URL\(\s*['"]([^'"\n]+)['"]\s*,\s*import\.meta\.url/g,
];
function resolve(de, spec) {
  const limpo = spec.split(/[?#]/)[0];
  let base;
  if (limpo.startsWith('/')) base = join('public', limpo);
  else if (limpo.startsWith('.')) base = normalize(join(dirname(de), limpo));
  else return null;                                   // node: e pacote: o package-lock cobre
  for (const c of [base, `${base}.js`, `${base}.mjs`, `${base}.ts`, `${base}.json`, join(base, 'index.js'), join(base, 'index.ts'), join(base, 'index.mjs')]) {
    if (ehArquivo(c)) return c.replace(/\\/g, '/');
  }
  return null;
}
function fecho(entradas) {
  const vistos = new Set();
  const fila = [...entradas];
  while (fila.length) {
    const f = fila.shift();
    if (vistos.has(f) || !ehArquivo(f)) continue;
    vistos.add(f);
    if (!CODIGO.test(f)) continue;
    const fonte = ler(f);
    for (const re of PADROES_IMPORT) {
      for (const m of fonte.matchAll(re)) {
        const r = resolve(f, m[1]);
        if (r && !vistos.has(r)) fila.push(r);
      }
    }
  }
  return vistos;
}

/* ------------------------------------------------- comandos do workflow ---- */
function comandos(fonte) {
  return fonte.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
}
function alvosNode(texto) {
  /* `node arquivo`, pulando flags (-e/-p/--test levam código ou outro alvo). */
  const out = [];
  for (const m of texto.matchAll(/(?:^|[\s;&|(])node\s+((?:--?[\w-]+(?:=\S+)?\s+)*)([^\s'"$;&|)]+)/g)) {
    if (/(^|\s)-(e|p|pe)\s/.test(`${m[1]} `) || /--test/.test(m[1])) continue;
    if (/\.(m?js|cjs)$/.test(m[2])) out.push(m[2]);
  }
  return out;
}

/* Jobs por indentação (id com 2 espaços dentro de `jobs:`), como a wftimeout. */
function jobsDe(fonte) {
  const blocos = {};
  let dentro = false;
  let atual = null;
  for (const linha of fonte.split('\n')) {
    if (/^jobs:\s*$/.test(linha)) { dentro = true; continue; }
    if (!dentro) continue;
    if (/^\S/.test(linha)) { dentro = false; continue; }
    const id = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(linha);
    if (id) { atual = id[1]; blocos[atual] = ''; continue; }
    if (atual) blocos[atual] += `${linha}\n`;
  }
  return blocos;
}

function linhasRun(bloco) {
  const out = [];
  for (const [step, corpo] of bloco.split(/^ {6}- /m).slice(1).entries()) {
    const linhas = corpo.split('\n');
    const i = linhas.findIndex((l) => /^(?: {8})?run:/.test(l));
    if (i < 0) continue;
    const valor = linhas[i].replace(/^(?: {8})?run:\s*/, '');
    const comandos = valor === '|' ? linhas.slice(i + 1).filter((l) => /^ {10}\S/.test(l)).map((l) => l.trim()) : [valor];
    for (const cmd of comandos) out.push({ cmd, step, corpo });
  }
  return out;
}
function conferirBootstrapDecals(wf) {
  const job = jobsDe(wf).portao;
  if (!job) { falhas.push('PG6 job portao ausente — bootstrap não medido'); return; }
  const linhas = linhasRun(job);
  const achar = (cmd) => linhas.flatMap((l, i) => l.cmd === cmd ? [i] : []);
  const fetch = achar('bash scripts/fetch-decals.sh');
  const assert = achar('node tools/eval/assets-check.mjs --so=decals');
  const serve = linhas.findIndex((l) => /^npm run eval:serve(?:\s|$)/.test(l.cmd));
  const medir = linhas.findIndex((l) => l.cmd === 'npm run eval:grafite-atual');
  if (fetch.length !== 1) falhas.push(`PG6 fetch público deve executar uma vez no job portao (encontrados ${fetch.length})`);
  if (assert.length !== 1) falhas.push(`PG6 assert de todos os nomes pedidos deve executar uma vez com --so=decals (encontrados ${assert.length})`);
  if (serve < 0 || medir < 0) falhas.push('PG6 serve/medição ausentes — régua perdeu consumidor');
  if (fetch.length === 1 && assert.length === 1 && !(fetch[0] < assert[0] && assert[0] < serve && serve < medir)) falhas.push('PG6 ordem exigida: fetch → assert nominal → serve → medição de grafite');
  for (const i of [...fetch, ...assert]) {
    const corpo = linhas[i].corpo;
    if (/^ {8}(?:if|continue-on-error):/m.test(corpo) || /\bset\s+\+e\b/.test(corpo)) falhas.push('PG6 bootstrap não pode ser condicional nem ignorar falha de fetch/assert');
  }
  for (const f of ['scripts/fetch-decals.sh', 'tools/eval/assets-check.mjs']) if (!ehArquivo(f) || !casa('portao', f)) falhas.push(`PG6 ${f} precisa existir e acordar o portão`);
}

const ENTRADAS_FIXAS = [
  'astro.config.mjs', 'src/pages/index.astro', 'public/js/main.js',
  /* o jogo chama /api/* no boot (public/js/apibase.js); no astro dev quem responde é esta rota */
  'src/pages/api/[rota].ts',
];
const LIDOS = {
  /* arquivos que os arnêses leem por readFileSync: não são import, mas mudam o veredito */
  portao: ['tools/eval/select_inflate_debt.json', 'tools/eval/select_inflate.json', 'tools/eval/graffiti_audit.json', 'tools/eval/graffiti_census.json', 'public/models/ambient/sertao_cabra.glb'],
  smoke: ['playwright.smoke.config.mjs'],
};

for (const [alvo, g] of Object.entries(GATILHOS)) {
  let wf = ler(g.workflow);
  if (!wf) { falhas.push(`PG0 ${g.workflow} não existe — a régua perdeu o alvo`); continue; }
  if (MUT === 'passo-novo' && alvo === 'portao') wf += '\n      - name: passo novo\n        if: ${{ !cancelled() }}\n        run: npm run eval:passo-novo\n';
  if (MUT === 'diff-aberto' && alvo === 'portao') wf = wf.replace(/(if ! git [^\n]*diff[^\n]*\n(?:[^\n]*\n){0,2}?[^\n]*)rodar=true/, '$1rodar=false');
  if (MUT === 'quotepath-volta' && alvo === 'smoke') wf = wf.replace('git -c core.quotePath=false diff', 'git diff');
  if (MUT === 'portao-na-fila' && alvo === 'portao') wf = wf.replace('  pull_request:\n', '  pull_request:\n  merge_group:\n    types: [checks_requested]\n');
  if (alvo === 'portao') {
    const antes = wf;
    if (MUT === 'sem-fetch' || MUT === 'fetch-tarde') wf = wf.replace(/^ {10}bash scripts\/fetch-decals\.sh\n/m, '');
    if (MUT === 'fetch-tarde' && wf !== antes) wf = wf.replace('\n  sertao:', '\n      - name: Fetch atrasado (mutante)\n        run: bash scripts/fetch-decals.sh\n\n  sertao:');
    if (MUT === 'assert-sem-pack') wf = wf.replace(/^ {10}node tools\/eval\/assets-check\.mjs --so=decals\n/m, '');
    if (MUT === 'fetch-ignorado') wf = wf.replace(/^ {10}bash scripts\/fetch-decals\.sh$/m, '          bash scripts/fetch-decals.sh || true');
    mutPG6Aplicou ||= wf !== antes;
    if (MUTANTES[MUT] === 'PG6' && !mutPG6Aplicou) falhas.push(`PG6 mutação ${MUT} não aplicou`);
  }
  const cmd = comandos(wf);
  if (alvo === 'portao') conferirBootstrapDecals(cmd);

  /* ---- PG2: o que o workflow roda é conhecido ---- */
  const npmRun = [...cmd.matchAll(/npm run\s+([\w:.-]+)/g)].map((m) => m[1]);
  for (const s of new Set(npmRun)) {
    if (!g.passos.includes(s)) falhas.push(`PG2 ${g.workflow} roda \`npm run ${s}\`, que não está em GATILHOS.${alvo}.passos (scripts/ci/gatilho.mjs) — o gatilho não sabe o que esse passo carrega`);
    if (!pkg.scripts[s]) falhas.push(`PG2 ${g.workflow} roda \`npm run ${s}\`, que não existe em package.json`);
  }
  for (const s of g.passos) {
    if (!npmRun.includes(s)) falhas.push(`PG2 GATILHOS.${alvo}.passos declara \`${s}\`, que ${g.workflow} não roda mais — passo que sumiu do portão`);
  }
  const usados = scriptsUsados(alvo, pkg.scripts);
  const nodeAlvos = [...alvosNode(cmd), ...[...cmd.matchAll(/(?:^|[\s;&|])(?:bash|sh)\s+([^\s;&|]+\.sh)/g)].map((m) => m[1])];
  for (const s of usados) {
    const linha = pkg.scripts[s];
    if (!linha) continue;
    nodeAlvos.push(...alvosNode(linha));
    for (const m of linha.matchAll(/(?:^|[\s;&|])(?:bash|sh)\s+([^\s;&|]+\.sh)/g)) nodeAlvos.push(m[1]);
  }
  for (const a of new Set(nodeAlvos)) {
    if (!ehArquivo(a)) falhas.push(`PG2 ${alvo}: \`node ${a}\` aponta para arquivo que não existe`);
    else if (!casa(alvo, a)) falhas.push(`PG2 ${alvo}: \`${a}\` roda no job e não casa com o gatilho`);
  }
  const specs = [];
  for (const m of cmd.matchAll(/npx playwright test([^\n]*)/g)) {
    for (const t of m[1].split(/\s+/)) {
      const c = t.replace(/^--config=/, '');
      if (/\.(spec\.js|config\.mjs)$/.test(c)) specs.push(c);
    }
  }
  for (const s of specs) {
    if (!ehArquivo(s)) falhas.push(`PG2 ${alvo}: \`${s}\` não existe`);
    else if (!casa(alvo, s)) falhas.push(`PG2 ${alvo}: \`${s}\` roda no job e não casa com o gatilho`);
  }

  /* ---- PG1: o fecho casa ---- */
  const entradas = [...ENTRADAS_FIXAS, ...nodeAlvos.filter(ehArquivo), ...specs.filter(ehArquivo), ...(LIDOS[alvo] || [])];
  for (const e of LIDOS[alvo] || []) if (!existsSync(e)) falhas.push(`PG1 ${alvo}: \`${e}\` está em LIDOS e não existe — a régua perdeu o alvo`);
  const arquivos = fecho(entradas);
  const fora = [...arquivos].filter((f) => f !== 'package.json' && !casa(alvo, f));
  for (const f of fora) falhas.push(`PG1 ${alvo}: \`${f}\` está no fecho do que o job roda e não casa com o gatilho — PR que mexer nele passa sem ${alvo}`);
  if (arquivos.size < 20) falhas.push(`PG1 ${alvo}: o fecho tem só ${arquivos.size} arquivos — o resolvedor ficou cego`);
  g.medido = arquivos.size;

  /* ---- PG3: o decide falha fechado ---- */
  const on = (wf.match(/^on:\n([\s\S]*?)(?=^\S)/m) || [])[1] || '';
  if (/^\s+paths(-ignore)?:/m.test(on)) falhas.push(`PG3 ${g.workflow} ainda filtra por \`paths:\` no \`on:\` — sem check quando não casa e cego acima de 300 arquivos`);
  const blocos = jobsDe(cmd);
  const decide = blocos.decide || '';
  if (!decide) falhas.push(`PG3 ${g.workflow} não tem o job \`decide\``);
  else {
    if (!/set -euo pipefail/.test(decide)) falhas.push(`PG3 ${g.workflow}: o decide não tem \`set -euo pipefail\` — erro no meio do filtro vira pulo calado`);
    if (!/filter: blob:none/.test(decide)) falhas.push(`PG3 ${g.workflow}: o checkout do decide não é leve (\`filter: blob:none\`)`);
    if (!/git -c core\.quotePath=false diff --no-renames --name-only -z "\$BASE\.\.\.\$HEAD"/.test(decide)) falhas.push(`PG3 ${g.workflow}: o decide não lista o diff com \`git -c core.quotePath=false diff --no-renames --name-only -z "$BASE...$HEAD"\` — nome com acento sai entre aspas, não casa e o job é pulado`);
    if (!/if ! git [^\n]*diff[^\n]*\n(?:[^\n]*\n){0,2}?[^\n]*rodar=true[^\n]*\n[^\n]*exit 0/.test(decide)) falhas.push(`PG3 ${g.workflow}: erro do \`git diff\` não manda rodar — diff que falha vira pulo`);
    if (!/"\$EVENTO" != "pull_request"[^\n]*\n[^\n]*rodar=true/.test(decide)) falhas.push(`PG3 ${g.workflow}: evento que não é PR (push na main, dispatch) não roda sempre`);
    if (!new RegExp(`node scripts/ci/gatilho\\.mjs ${alvo}\\b`).test(decide)) falhas.push(`PG3 ${g.workflow}: o decide não chama \`scripts/ci/gatilho.mjs ${alvo}\` — fonte única quebrada`);
    if (!/grep -qx 'rodar=false'/.test(decide)) falhas.push(`PG3 ${g.workflow}: o pulo não exige \`rodar=false\` exato — saída vazia ou quebrada do gatilho pularia`);
  }
  /* ---- PG5: fora do lote da fila ---- */
  if (/^ {2}merge_group:/m.test(on)) falhas.push(`PG5 ${g.workflow} escuta \`merge_group\` — ${alvo} não é obrigatório e no lote só prende runner dos checks que são`);
  const jobs = Object.entries(blocos).filter(([nome]) => nome !== 'decide');
  if (!jobs.length) falhas.push(`PG3 ${g.workflow}: nenhum job real encontrado`);
  for (const [nome, corpo] of jobs) {
    if (!/^ {4}needs:\s*(?:decide|\[[^\]]*\bdecide\b[^\]]*\])\s*$/m.test(corpo)) falhas.push(`PG3 ${g.workflow}: o job \`${nome}\` não tem \`needs: decide\``);
    if (!/^ {4}if:[^\n]*needs\.decide\.outputs\.rodar == 'true'/m.test(corpo)) falhas.push(`PG3 ${g.workflow}: o job \`${nome}\` não obedece \`needs.decide.outputs.rodar == 'true'\``);
  }
}

/* ---- PG3: a CLI lê nome com acento cru (NUL) e na forma entre aspas do git ---- */
{
  const roda = (entrada) => spawnSync(process.execPath, ['scripts/ci/gatilho.mjs', 'portao'], { input: entrada, encoding: 'utf8' }).stdout.trim();
  if (roda('public/img/ação.png\0docs/x.md\0') !== 'rodar=true') falhas.push('PG3 a CLI não acorda o portão com `public/img/ação.png` separado por NUL');
  if (roda('"public/img/a\\303\\247\\303\\243o.png"\n') !== 'rodar=true') falhas.push('PG3 a CLI não desfaz o nome entre aspas do git (`"public/img/a\\303\\247…"`) — com quotePath ligado o portão seria pulado');
  if (roda('"docs/a\\303\\247\\303\\243o.md"\0') !== 'rodar=false') falhas.push('PG3 a CLI acorda o portão com doc acentuado — o desaspa casou demais');
}

/* ---- PG4: a decisão ---- */
{
  const pacoteBase = ler('package.json');
  const comScript = JSON.stringify({ ...pkg, scripts: { ...pkg.scripts, 'eval:qualquer-novo': 'node x.mjs' } });
  const comDep = JSON.stringify({ ...pkg, dependencies: { ...(pkg.dependencies || {}), 'pacote-novo': '1.0.0' } });
  const comPasso = JSON.stringify({ ...pkg, scripts: { ...pkg.scripts, 'eval:boot': `${pkg.scripts['eval:boot']} --x` } });
  const leitor = (depois) => (lado) => (lado === 'BASE' ? pacoteBase : depois);
  const casos = [
    ['lista vazia roda', 'portao', [], leitor(pacoteBase), true],
    ['só docs não acorda', 'portao', ['docs/docs/comecando.md', 'public/docs/index.html'], leitor(pacoteBase), false],
    ['fetch público acorda o portão', 'portao', ['scripts/fetch-decals.sh'], leitor(pacoteBase), true],
    ['assert de decalques acorda o portão', 'portao', ['tools/eval/assets-check.mjs'], leitor(pacoteBase), true],
    ['net.js acorda o portão', 'portao', ['public/js/net.js'], leitor(pacoteBase), true],
    ['community.js acorda o smoke', 'smoke', ['public/js/community.js'], leitor(pacoteBase), true],
    ['script novo no package.json não acorda', 'portao', ['package.json'], leitor(comScript), false],
    ['dependência nova acorda', 'portao', ['package.json'], leitor(comDep), true],
    ['script usado pelo passo acorda', 'portao', ['package.json'], leitor(comPasso), true],
  ];
  for (const [nome, alvo, lista, lp, esperado] of casos) {
    if (decidir(alvo, lista, lp).rodar !== esperado) falhas.push(`PG4 ${nome}: esperado rodar=${esperado}`);
  }
  let jsonQuebrado;
  try { jsonQuebrado = decidir('portao', ['package.json'], leitor('{')).rodar; } catch { jsonQuebrado = 'lança'; }
  if (jsonQuebrado !== 'lança') falhas.push('PG4 package.json ilegível precisa lançar (a CLI converte em rodar=true), não decidir pular');
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log(`  \x1b[32m✓\x1b[0m PG o gatilho cobre o fecho (portão ${GATILHOS.portao.medido} arquivos, smoke ${GATILHOS.smoke.medido}), todo passo é conhecido e o decide falha fechado`);
if (MUT && !falhas.some((f) => f.startsWith(MUTANTES[MUT]))) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula ${MUTANTES[MUT]} — portão cego`);
  falhas.push('mutacao-cega');   // prova que não morde é vermelho, não aviso (MC1)
}
process.exit(falhas.length ? 1 : 0);
