#!/usr/bin/env node
// CPR: contagem gerada não entra em PR (dois PRs abertos conflitavam no "N scripts"); só o release a reescreve.
// Fato escrito à mão desalinhado na base (versão do package.json × version.js × CHANGELOG, LICENSE) é do
// docs:check, não desta régua: medido em 11 runs de 01–16/11 (ex.: 43480458704, 43821409142), o bump do
// alpha.149 sem CHANGELOG reprovava esta régua em todo PR, main e staging, sem o PR tocar nada dela. Por isso
// cada perturbação tem de acender erro NOVO em relação à base; a cópia mede SEMPRE com um CHANGELOG
// desalinhado de propósito (CPR8) para a tolerância nunca esconder o que a régua cobra.
// Uso: node tools/eval/contagens-pr-check.mjs [--mutante=volatil-vira-estrutural|release-pula-volatil|arch-sem-mascara|mesclar-com-cursor|aceita-marcador|autofix-release|changelog-cego]
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const MUT = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1] || '';
const MUTANTES = {
  'volatil-vira-estrutural': ['tools/gen-docs.mjs', "  numeros: 'volatil',", "  numeros: 'estrutural',"],
  'release-pula-volatil': ['tools/gen-docs.mjs', "classe === 'volatil' && !RELEASE &&", "classe === 'volatil' &&"],
  'arch-sem-mascara': ['tools/gen-arch.mjs', "const RELEASE = process.argv.includes('--release');", 'const RELEASE = true;'],
  'mesclar-com-cursor': ['tools/gerado-modo.mjs', '(velha, k) => !usadas.has(k) && re.test(velha)', '(velha, k) => k > Math.max(-1, ...usadas) && re.test(velha)'],
  'aceita-marcador': ['tools/gen-docs.mjs', 'const MARCADOR_CONFLITO = /^(<{7}|>{7})( |$)|^={7}$/m;', 'const MARCADOR_CONFLITO = /(?!)/;'],
  'autofix-release': ['.github/workflows/autofix.yml', 'node tools/gen-docs.mjs   ||', 'node tools/gen-docs.mjs --release ||'],
  'changelog-cego': ['tools/gen-docs.mjs', 'if (top !== fatos.versao.pacote)', 'if (false)'],
};
if (MUT && !MUTANTES[MUT]) { console.error(`mutante desconhecido: ${MUT}`); process.exit(2); }

const ler = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');
const fonte = { 'tools/gerado-modo.mjs': ler('tools/gerado-modo.mjs'), 'tools/gen-docs.mjs': ler('tools/gen-docs.mjs'), 'tools/gen-arch.mjs': ler('tools/gen-arch.mjs'), '.github/workflows/autofix.yml': ler('.github/workflows/autofix.yml') };
if (MUT) {
  const [arq, de, para] = MUTANTES[MUT];
  if (!fonte[arq].includes(de)) { console.error(`MUTANTE NAO APLICOU: ${MUT}`); process.exit(2); }
  fonte[arq] = fonte[arq].replace(de, para);
}
// Mede numa cópia: só os arquivos versionados que os geradores leem, com o conteúdo da árvore.
const TMP = mkdtempSync(join(tmpdir(), 'contagens-pr-'));
const LEVA = /^(package\.json|LICENSE|CHANGELOG\.md|README\.md|AGENTS\.md|CONTRIBUTING\.md|mint-assets\.json|skills-lock\.json|public\/js\/.*|public\/vendor\/three\.module\.js|public\/llms\.txt|src\/.*|tools\/[^/]+\.mjs|tools\/eval\/[^/]+\.(mjs|py|md)|docs\/(docs|i18n|issues)\/.*|docs\/package\.json|docs\/docusaurus\.config\.js|\.github\/workflows\/.*|\.claude\/skills\/[^/]+\/SKILL\.md)$/;
const restaurar = () => rmSync(TMP, { recursive: true, force: true });
for (const sinal of ['SIGINT', 'SIGTERM']) process.on(sinal, () => { restaurar(); process.exit(1); });
const T = (p) => join(TMP, p);
// Sem GIT_* herdado: dentro do hook de pre-push o GIT_DIR apontaria o git da cópia para o repositório real.
const ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_')));
const NA_COPIA = { cwd: TMP, env: ENV, encoding: 'utf8' };
const lerT = (p) => readFileSync(T(p), 'utf8');
const GEN = { docs: 'tools/gen-docs.mjs', arch: 'tools/gen-arch.mjs' };
// Item de erro do --check ("         - <motivo>"). O que o gerador escreve (bloco, marcador, colocação) tem de
// fechar depois do --release; o resto é fato escrito à mão, tolerado só se a BASE já o tinha.
const GERADOR = /bloco|marcador|colocaç/;
const DRIFT = '0.0.0-contagens-pr';
const toleradoNaBase = new Map();
const conferir = (qual, args) => {
  const r = spawnSync('node', [T(GEN[qual]), '--check', ...args], NA_COPIA);
  const itens = `${r.stdout}${r.stderr}`.split('\n').map((l) => /^\s+- (.+)$/.exec(l)?.[1]).filter(Boolean);
  return { ok: r.status === 0, itens };
};
const passa = (qual, ...args) => {
  const { ok, itens } = conferir(qual, args);
  if (ok) return true;
  const tolerados = toleradoNaBase.get([qual, ...args].join(' ')) || new Set();
  return itens.length > 0 && itens.every((i) => tolerados.has(i));
};
const trocar = (p, de, para) => {
  const t = lerT(p);
  const n = typeof de === 'function' ? de(t) : t.replace(de, para);
  if (n === t) throw new Error(`não consegui alterar ${p}`);
  writeFileSync(T(p), n);
};
let base;
const voltar = (p) => writeFileSync(T(p), base.get(p));

const falhas = [];
let quebrou = false;
try {
  const versionados = execFileSync('git', ['ls-files', '-z']).toString().split('\0').filter((p) => LEVA.test(p) && existsSync(p));
  for (const p of versionados) { mkdirSync(dirname(T(p)), { recursive: true }); cpSync(p, T(p)); }
  for (const [p, t] of Object.entries(fonte)) writeFileSync(T(p), t);
  execFileSync('git', ['init', '-q'], NA_COPIA);
  execFileSync('git', ['add', '-A'], NA_COPIA);
  for (const g of Object.values(GEN)) spawnSync('node', [T(g), '--release'], NA_COPIA);
  trocar('CHANGELOG.md', /^## \[[^\]]+\]/m, `## [${DRIFT}]`);
  base = new Map(['package.json', 'public/js/game.js', 'tools/eval/ARCH.md', ...lerT('tools/gen-docs.mjs').match(/'[\w/.-]+\.md'/g).map((x) => x.slice(1, -1))]
    .filter((p) => existsSync(T(p))).map((p) => [p, lerT(p)]));
  for (const [qual, args] of [['docs', []], ['docs', ['--release']], ['arch', []], ['arch', ['--release']]]) {
    const { itens } = conferir(qual, args);
    const doGerador = itens.filter((i) => GERADOR.test(i));
    if (args.length && doGerador.length) throw new Error(`nem o modo release deixa os blocos gerados em dia: ${doGerador[0]} (rode: npm run docs:release && npm run arch:release e leia o erro)`);
    toleradoNaBase.set([qual, ...args].join(' '), new Set(itens.filter((i) => !GERADOR.test(i))));
  }
  const manuais = [...toleradoNaBase.get('docs --release')];
  if (!manuais.some((i) => i.includes(DRIFT)))
    falhas.push(`CPR8 CHANGELOG começando em '${DRIFT}' passou calado no docs:check:release: a régua não enxerga fato escrito à mão, então tolerá-lo esconderia o que ela devia cobrar`);
  for (const i of manuais.filter((m) => !m.includes(DRIFT)))
    console.log(`  ⚠ fora do escopo desta régua (já estava na base; quem cobra é o npm run docs:check): ${i}`);

  // ---- o PR típico: um script npm a mais e uma linha a mais no game.js
  trocar('package.json', (t) => { const j = JSON.parse(t); j.scripts['zz:contagens-pr'] = 'true'; return `${JSON.stringify(j, null, 2)}\n`; });
  trocar('public/js/game.js', /^/, '// contagens-pr\n');
  if (!passa('docs')) falhas.push('CPR1 um script npm e uma linha de game.js a mais reprovam o docs:check do PR: contagem volátil ainda é cobrada no PR (é o que faz dois PRs conflitarem)');
  if (!passa('arch')) falhas.push('CPR1 uma linha a mais no game.js reprova o arch:check do PR: número de linha ainda é cobrado no PR');
  if (passa('docs', '--release')) falhas.push('CPR2 o mesmo drift PASSA no docs:check:release: o trem não regenera as contagens');
  if (passa('arch', '--release')) falhas.push('CPR2 o mesmo drift PASSA no arch:check:release: o trem não regenera as linhas');
  voltar('package.json'); voltar('public/js/game.js');

  // ---- estrutura continua mordendo no PR
  trocar('package.json', (t) => { const j = JSON.parse(t); j.scripts['check:fast'] += ' zz:contagens-pr'; return `${JSON.stringify(j, null, 2)}\n`; });
  if (passa('docs')) falhas.push('CPR3 check:fast mudou e o docs:check do PR passou: a lista de comandos é estrutura e tem de ser conferida no PR');
  voltar('package.json');
  trocar('public/js/game.js', /^/, '  _contagensPr() {\n');
  if (passa('arch')) falhas.push('CPR3 método novo no game.js e o arch:check do PR passou: a lista de símbolos é estrutura');
  voltar('public/js/game.js');

  // ---- método que muda de lugar: o PR reescreve a linha dele, não o índice inteiro
  trocar('public/js/game.js', (t) => {
    const g = t.split('\n');
    const ini = g.findIndex((l) => /^ {2}_dmgArc\(/.test(l));
    let fim = ini + 1;
    while (fim < g.length && !/^ {2}[_a-zA-Z]\w*\s*\([^)]*\)\s*\{/.test(g[fim])) fim++;
    if (ini < 0) return t;
    const metodo = g.splice(ini, fim - ini);
    g.splice(g.findIndex((l) => /^ {2}_dom\(/.test(l)), 0, ...metodo);
    return g.join('\n');
  });
  spawnSync('node', [T(GEN.arch)], NA_COPIA);
  const sobra = new Map();
  for (const l of base.get('tools/eval/ARCH.md').split('\n')) sobra.set(l, (sobra.get(l) || 0) + 1);
  const mexidas = lerT('tools/eval/ARCH.md').split('\n').filter((l) => !(sobra.get(l) > 0 && sobra.set(l, sobra.get(l) - 1))).length;
  if (mexidas > 2) falhas.push(`CPR6 mover um método reescreve ${mexidas} linhas do ARCH.md no PR: o alinhamento perdeu o lugar e as linhas voltam a conflitar`);
  voltar('public/js/game.js'); voltar('tools/eval/ARCH.md');

  // ---- cada bloco volátil: o PR não confere, o release confere
  const classes = Object.fromEntries([...fonte['tools/gen-docs.mjs'].match(/const CLASSE = \{([\s\S]*?)\n\};/)[1]
    .matchAll(/^\s*(\w+): '(\w+)',/gm)].map((m) => [m[1], m[2]]));
  const colocacao = fonte['tools/gen-docs.mjs'].match(/const COLOCACAO = \{([\s\S]*?)\n\};/)[1];
  const volateis = Object.keys(classes).filter((b) => classes[b] === 'volatil');
  if (!volateis.length) falhas.push('CPR4 nenhum bloco classificado como volátil: a classificação sumiu ou foi lida errado');
  for (const bloco of volateis) {
    const arq = new RegExp(`^\\s*${bloco}: \\['([^']+)'`, 'm').exec(colocacao)?.[1];
    if (!arq) { falhas.push(`CPR4 bloco ${bloco} sem colocação`); continue; }
    trocar(arq, new RegExp(`(BEGIN:GERADO:${bloco}\\b[\\s\\S]*?)(\\d+)`), '$1$27');
    if (!passa('docs')) falhas.push(`CPR4 contagem do bloco ${bloco} adulterada reprova o PR: bloco volátil tratado como estrutura`);
    if (passa('docs', '--release')) falhas.push(`CPR4 contagem do bloco ${bloco} adulterada PASSA no release: o trem pula esse bloco`);
    voltar(arq);
  }

  // ---- marcador de conflito: nem bloco volátil o esconde do PR
  const MARCAS = '<<<<<<< HEAD\n9999\n=======\n1\n>>>>>>> outro\n';
  const arqNumeros = /^\s*numeros: \['([^']+)'/m.exec(colocacao)?.[1];
  trocar(arqNumeros, /(BEGIN:GERADO:numeros\b[^\n]*\n)/, `$1${MARCAS}`);
  if (passa('docs')) falhas.push(`CPR7 marcador de conflito dentro do bloco numeros (${arqNumeros}) passa no docs:check do PR`);
  voltar(arqNumeros);
  trocar('tools/eval/ARCH.md', /(\n## Tamanho dos arquivos indexados\n)/, `\n${MARCAS}$1`);
  if (passa('arch')) falhas.push('CPR7 marcador de conflito dentro do bloco gerado do ARCH.md passa no arch:check do PR');
  voltar('tools/eval/ARCH.md');

  // ---- fiação: o trem chama o modo release, o autofix e os scripts de PR não
  const release = lerT('.github/workflows/release.yml');
  if (!/node tools\/gen-docs\.mjs --release\b/.test(release) || !/node tools\/gen-arch\.mjs --release\b/.test(release))
    falhas.push('CPR5 release.yml não chama gen-docs/gen-arch com --release: nada regenera as contagens');
  const conserta = /- name: Conserta o mecânico[\s\S]*?(?=\n\s*\n|\n {6}- )/.exec(fonte['.github/workflows/autofix.yml'])?.[0] || '';
  if (!/gen-docs\.mjs/.test(conserta) || /--release/.test(conserta))
    falhas.push('CPR5 o autofix regenera em modo release: volta a empurrar contagem para todo PR (e a trazer a main junto)');
  const s = JSON.parse(base.get('package.json')).scripts;
  const pr = ['docs', 'docs:check', 'arch', 'arch:check'].filter((k) => !s[k] || /--release/.test(s[k]));
  const rel = ['docs:release', 'docs:check:release', 'arch:release', 'arch:check:release'].filter((k) => !/--release/.test(s[k] || ''));
  if (pr.length || rel.length) falhas.push(`CPR5 scripts npm fora do contrato: ${[...pr, ...rel].join(', ')} (os de PR sem --release, os :release com)`);
} catch (e) {
  quebrou = true;
  falhas.push(`CPR não deu para medir: ${String(e.message || e).split('\n')[0]}`);
} finally {
  restaurar();
}

for (const f of falhas) console.log(`  \x1b[31m✗\x1b[0m ${f}`);
if (!falhas.length) console.log('  \x1b[32m✓\x1b[0m CPR contagens voláteis só no release; estrutura confere no PR; trem e autofix no modo certo');
if (MUT && !falhas.length) {
  console.log(`  \x1b[31m✗\x1b[0m MUTAÇÃO '${MUT}' não acendeu nenhuma cláusula — portão cego (lei 3)`);
  falhas.push('mutacao-cega');
}
if (MUT && falhas.length && !quebrou && !falhas.includes('mutacao-cega')) { console.log(`  ✓ mutante ${MUT} ficou vermelho`); process.exit(0); }
process.exit(falhas.length ? 1 : 0);
