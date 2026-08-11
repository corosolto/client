/* ============================================================================
   release.mjs — BUMP, CHANGELOG E TAG NUM COMANDO SÓ.
   ----------------------------------------------------------------------------
   POR QUE EXISTE

   A versão vivia em três lugares — `package.json`, `public/js/version.js` e 26
   `?v=` literais no `index.astro` — e nada garantia que concordassem. O
   `version.js` já avisava por escrito o que acontece quando não concordam:

     "bump dos dois lados juntos, senão o navegador serve módulos JS velhos do
      cache — causa raiz de 'correções que não chegavam ao usuário' por dias"

   Os 26 literais morreram (o import map passou a ser gerado do `package.json`).
   Sobraram dois, e este script mantém os dois em sincronia por construção.

   E há a razão nova, de 07/08: passou-se a commitar DIRETO NA MAIN. O
   `versao-bumpada` do `pr-gates` só dispara em `pull_request`, então push direto
   passa por fora dele — esquecer o bump deixou de ser risco e virou o padrão. A
   prova: o código chegou a `alpha.35` com a última tag em `v2.0.0-alpha.32`.

   ── O QUE ELE FAZ, E O QUE ELE SE RECUSA A FAZER ────────────────────────────
   Faz:  bump do `package.json`, sincroniza o `version.js`, abre a seção do
         CHANGELOG, commita e cria a tag `v<versão>`.
   NÃO faz: `git push`. Publicar é ação pra fora e fica na mão de quem decide —
   o comando exato é impresso no fim.

   Recusa-se a rodar com a árvore SUJA. Release de árvore suja é como se manda
   meia mudança pro ar com o número de uma versão inteira.

   Uso:
     npm run release                 # 2.0.0-alpha.35 -> 2.0.0-alpha.36
     npm run release -- --minor      # -> 2.1.0
     npm run release -- --versao 2.0.0-beta.1
     npm run release -- --seco       # mostra o que faria e não escreve nada
   ============================================================================ */
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const val = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const SECO = flag('seco');

const VERM = '\x1b[31m', VERDE = '\x1b[32m', CYAN = '\x1b[36m', AMAR = '\x1b[33m', OFF = '\x1b[0m';
const morre = (m) => { console.error(`\n${VERM}release abortado${OFF}  ${m}\n`); process.exit(1); };
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim();
const roda = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit' });
  if (r.error || r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} falhou`);
};
const ARQUIVOS_RELEASE = [
  'package.json', 'package-lock.json', 'public/js/version.js', 'CHANGELOG.md',
  'README.md', 'AGENTS.md', 'STATUS.md', 'docs', 'public/docs',
  'tools/eval/ARCH.md', 'tools/eval/README.md',
];
const desfazRelease = (headAntes, tag) => {
  const headAtual = sh('git rev-parse HEAD');
  const dropTag = spawnSync('git', ['update-ref', '-d', `refs/tags/${tag}`], { stdio: 'inherit' });
  const rewind = headAtual === headAntes
    ? { status: 0 }
    : spawnSync('git', ['update-ref', 'HEAD', headAntes, headAtual], { stdio: 'inherit' });
  const restore = spawnSync('git', ['restore', '--staged', '--worktree', '--', ...ARQUIVOS_RELEASE], { stdio: 'inherit' });
  const clean = spawnSync('git', ['clean', '-fd', '--', ...ARQUIVOS_RELEASE], { stdio: 'inherit' });
  if (dropTag.status !== 0 || rewind.status !== 0 || restore.status !== 0 || clean.status !== 0) {
    console.error(`${VERM}rollback incompleto; confira git status antes de tentar novamente.${OFF}`);
  }
};

/* ---------- 1. a árvore tem que estar limpa ---------- */
const sujo = sh('git status --porcelain')
  .split('\n').filter(Boolean);
if (sujo.length && !SECO) {
  morre(`há ${sujo.length} arquivo(s) modificado(s). Commite ou guarde antes:\n  `
    + sujo.slice(0, 8).map((l) => l.trim()).join('\n  '));
}

/* ---------- 2. calcula a versão nova ---------- */
const pkgTxt = readFileSync('package.json', 'utf8');
const atual = JSON.parse(pkgTxt).version;
const nova = (() => {
  const explicita = val('versao');
  if (explicita) return explicita;
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?$/.exec(atual);
  if (!m) morre(`não sei ler a versão atual '${atual}'. Use --versao <x.y.z>.`);
  const [, MA, MI, PA, pre, n] = m;
  if (flag('major')) return `${+MA + 1}.0.0`;
  if (flag('minor')) return `${MA}.${+MI + 1}.0`;
  if (flag('patch')) return `${MA}.${MI}.${+PA + 1}`;
  /* Padrão = prerelease, porque é o que esta base faz o dia inteiro. `alpha` <
     `beta` < release pelo semver, então o contador anda sozinho. */
  if (!pre) return `${MA}.${MI}.${+PA + 1}`;
  return `${MA}.${MI}.${PA}-${pre}.${+n + 1}`;
})();

console.log(`\n${CYAN}release${OFF}  ${atual} ${AMAR}->${OFF} ${VERDE}${nova}${OFF}${SECO ? `  ${AMAR}(seco)${OFF}` : ''}\n`);

if (sh(`git tag -l v${nova}`)) morre(`a tag v${nova} já existe.`);

/* ---------- 3. escreve nos dois lugares ---------- */
const VERSAO_JS = 'public/js/version.js';
const vTxt = readFileSync(VERSAO_JS, 'utf8');
const linha = /export const VERSION = '([^']+)';/.exec(vTxt);
if (!linha) morre(`não achei a linha VERSION em ${VERSAO_JS}.`);
if (linha[1] !== atual) {
  console.log(`  ${AMAR}aviso${OFF}  ${VERSAO_JS} dizia '${linha[1]}' e o package.json '${atual}' — `
    + 'já estavam fora de sincronia; os dois vão para a versão nova.');
}

if (SECO) {
  console.log(`  package.json      ${atual} -> ${nova}`);
  console.log(`  ${VERSAO_JS}  ${linha[1]} -> ${nova}`);
  console.log('  CHANGELOG.md      seção sincronizada com a nova versão');
  console.log(`  git commit + git tag v${nova}`);
  console.log(`\n${AMAR}seco: nada foi escrito.${OFF}\n`);
  process.exit(0);
}

const headAntes = sh('git rev-parse HEAD');
try {
  roda('npm', ['version', nova, '--no-git-tag-version']);
  writeFileSync(VERSAO_JS, vTxt.replace(linha[0], `export const VERSION = '${nova}';`));
  roda('node', ['scripts/sync-changelog.mjs']);

  /* ---------- 5. os blocos gerados sabem a versão ---------- */
  roda('node', ['tools/gen-docs.mjs']);
  roda('node', ['tools/gen-arch.mjs']);
  roda('npm', ['--prefix', 'docs', 'ci']);
  roda('npm', ['--prefix', 'docs', 'run', 'build:site']);

  /* ---------- 6. commit + tag; toda a transação volta ao HEAD inicial se falhar ---------- */
  roda('git', ['add', ...ARQUIVOS_RELEASE]);
  roda('git', ['commit', '-s', '-m', `release: ${nova}`]);
  roda('git', ['tag', '-a', `v${nova}`, '-m', `v${nova}`]);
} catch (erro) {
  desfazRelease(headAntes, `v${nova}`);
  morre(erro instanceof Error ? erro.message : String(erro));
}

console.log(`\n${VERDE}pronto.${OFF} commit e tag \`v${nova}\` criados LOCALMENTE.\n`);
console.log(`  ${AMAR}1.${OFF} publique quando quiser:`);
console.log(`     git push origin main && git push origin v${nova}\n`);
console.log(`  A tag dispara o job \`release\` do ci.yml, que cria o GitHub Release a partir`);
console.log(`  do CHANGELOG. Ela NÃO deploya: a produção sai da \`main\` pela integração Git`);
console.log(`  da Vercel (vercel.json, \`deploymentEnabled.main\`). A tag é o marco, não o gatilho.\n`);
