/* ============================================================================
   vercel-ignore-check.mjs — PREVIEW DE PR NÃO BUILDA NA VERCEL, NUNCA
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   Mesmo com o filtro por diff da fase 0, cada PR que tocava `src/` ainda buildava
   preview na Vercel (Build CPU Minutes). O preview por PR migrou para o Cloudflare
   (`cf-preview.yml`, fase 2): o `scripts/ci/vercel-ignore.sh` agora pula TODA branch
   de PR; `staging`, `main` e `lote-*` continuam buildando sempre (STAGING_URL e o
   trem de release dependem delas). O RLS9 do `release-check` cobra produção; esta
   régua roda o script DE VERDADE contra um repositório git temporário.

   CLÁUSULAS (código de saída que a Vercel vê: 0 = pula, 1 = builda)
     VI1  preview, commit só em tools/eval       -> 0 (pula)
     VI2  preview, commit em src/                -> 0 (preview é Cloudflare)
     VI3  preview, commit só em docs/            -> 0 (pula)
     VI4  preview, intervalo que inclui o de src -> 0 (diff não é mais consultado)
     VI5  preview sem VERCEL_GIT_PREVIOUS_SHA    -> 0 (primeiro push também pula)
     VI6  preview com SHA fora do clone          -> 0 (idem; git nem roda)
     VI7  preview em staging/main/lote-*         -> 1 (STAGING_URL e o trem dependem delas)
     VI8  produção: `chore(release):` -> 1; merge comum -> 0 (inalterado)
     VI9  o log diz a decisão: pular em PR cita Cloudflare e produção/trem
     VI10 preview, commit exclusivo em tools/cf  -> 0 (headers mudam no preview CF)

   MUTANTES (`--mutate` roda os três; cada um tem que reprovar):
     preview-pr-builda   branch de PR volta a `exit 1`       -> VI2/VI4/VI5/VI6
     staging-pulado      staging para de buildar              -> VI7
     release-pulado      produção ignora o commit de release  -> VI8

   Uso: node tools/eval/vercel-ignore-check.mjs [--mutate | --mutante=<nome>]
   ============================================================================ */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'ci', 'vercel-ignore.sh');
const MUTANTES = ['preview-pr-builda', 'staging-pulado', 'release-pulado'];
const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=')[1] || '';
const mutante = arg('mutante');
if (mutante && !MUTANTES.includes(mutante)) { console.error(`mutante desconhecido: ${mutante}`); process.exit(2); }

if (process.argv.includes('--mutate')) {
  const mordidos = [];
  for (const m of MUTANTES) {
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), `--mutante=${m}`], { encoding: 'utf8' });
    if (r.status === 1 && /REPROVADO/.test(r.stderr)) mordidos.push(m);
    else console.error(`MUTANTE SOBREVIVEU: ${m} (exit ${r.status})\n${r.stderr.slice(-400)}`);
  }
  if (mordidos.length !== MUTANTES.length) process.exit(1);
  console.log(`MUTANTES MORDIDOS: ${mordidos.join(', ')}`);
  process.exit(0);
}

let fonte = readFileSync(SCRIPT, 'utf8');
const muta = (de, para) => {
  if (!fonte.includes(de)) { console.error(`MUTANTE NÃO APLICOU: ${mutante} (âncora ausente)`); process.exit(2); }
  fonte = fonte.replace(de, para);
};
if (mutante === 'preview-pr-builda') muta('  echo "vercel-ignore: preview de PR agora é Cloudflare (cf-preview.yml); Vercel só produção/trem"\n  exit 0\n', '  exit 1\n');
if (mutante === 'staging-pulado') muta('    staging|main|lote-*|*/lote-*)', '    main|lote-*|*/lote-*)');
if (mutante === 'release-pulado') muta('"chore(release):"*) echo "vercel-ignore: commit de release — builda produção"; exit 1 ;;', '"chore(release):"*) exit 0 ;;');

/* Repositório temporário: commits só em tools, src, docs e tools/cf. */
const repo = mkdtempSync(join(tmpdir(), 'csb-vercel-ignore-'));
const git = (...args) => {
  const r = spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' } });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
};
const escreve = (rel, texto) => { mkdirSync(join(repo, dirname(rel)), { recursive: true }); writeFileSync(join(repo, rel), texto); };
const commit = (msg) => { git('add', '-A'); git('-c', 'user.name=regua', '-c', 'user.email=regua@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', msg); return git('rev-parse', 'HEAD'); };

const falhas = [];
const cobra = (id, ok, texto) => { if (!ok) falhas.push(`${id} ${texto}`); };
const roda = (env) => spawnSync('bash', ['-c', fonte], {
  cwd: repo, encoding: 'utf8', env: { PATH: process.env.PATH, ...env },
});
try {
  git('init', '-q', '-b', 'main');
  escreve('README.md', 'base\n'); escreve('src/index.js', 'export const v = 1;\n'); escreve('tools/eval/x.mjs', '// base\n');
  const base = commit('base');
  escreve('tools/eval/x.mjs', '// só régua\n');
  const soTools = commit('chore: régua');
  escreve('src/index.js', 'export const v = 2;\n');
  const comSrc = commit('feat: muda o site');
  escreve('docs/nota.md', '# só docs\n');
  const soDocs = commit('docs: nota');
  escreve('tools/cf/gen-headers-redirects.mjs', '# gera CSP nova\n');
  const comCf = commit('feat: muda headers do Worker');

  const preview = (prev, extra = {}) => roda({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'feat/qualquer', VERCEL_GIT_COMMIT_MESSAGE: 'feat: push', VERCEL_GIT_PREVIOUS_SHA: prev, ...extra });

  git('checkout', '-q', soTools);
  const r1 = preview(base);
  cobra('VI1', r1.status === 0, `commit só em tools/eval deveria pular (exit ${r1.status}): ${r1.stdout}`);
  cobra('VI9', /Cloudflare/.test(r1.stdout) && /produção\/trem/.test(r1.stdout), `log sem a razão do corte: ${r1.stdout}`);

  git('checkout', '-q', comSrc);
  const r2 = preview(soTools);
  cobra('VI2', r2.status === 0, `commit em src/ deveria pular, preview é Cloudflare (exit ${r2.status}): ${r2.stdout}`);

  git('checkout', '-q', soDocs);
  const r3 = preview(comSrc);
  cobra('VI3', r3.status === 0, `commit só em docs/ deveria pular (exit ${r3.status}): ${r3.stdout}`);
  const r4 = preview(base);
  cobra('VI4', r4.status === 0, `intervalo base..docs inclui src/ e mesmo assim pula (exit ${r4.status}): ${r4.stdout}`);
  git('checkout', '-q', comCf);
  const rCf = preview(soDocs);
  cobra('VI10', rCf.status === 0, `commit exclusivo em tools/cf/ deveria pular na Vercel (exit ${rCf.status}): ${rCf.stdout}`);
  const r5 = preview('');
  cobra('VI5', r5.status === 0, `sem VERCEL_GIT_PREVIOUS_SHA deveria pular (exit ${r5.status}): ${r5.stdout}`);
  const r6 = preview('0123456789abcdef0123456789abcdef01234567');
  cobra('VI6', r6.status === 0, `SHA fora do clone deveria pular, nunca falhar (exit ${r6.status}): ${r6.stdout} ${r6.stderr}`);
  for (const ref of ['staging', 'main', 'lote-2026-11-09', 'claude/lote-37']) {
    const r7 = preview(comSrc, { VERCEL_GIT_COMMIT_REF: ref });
    cobra('VI7', r7.status === 1, `${ref} com só docs deveria buildar sempre (exit ${r7.status}): ${r7.stdout}`);
  }

  const prod = (msg) => roda({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_REF: 'main', VERCEL_GIT_COMMIT_MESSAGE: msg, VERCEL_GIT_PREVIOUS_SHA: base }).status;
  cobra('VI8', prod('chore(release): v9.9.9-alpha.1') === 1, 'produção no commit de release deveria buildar');
  cobra('VI8', prod('feat: merge comum') === 0, 'produção em merge comum deveria esperar o trem');
} catch (e) {
  falhas.push(`VI0 instrumento quebrou: ${e.message}`);
} finally {
  rmSync(repo, { recursive: true, force: true });
}

if (falhas.length) {
  for (const f of falhas) console.error(`REPROVADO — ${f}`);
  process.exit(1);
}
if (mutante) { console.error(`MUTANTE SOBREVIVEU: ${mutante}`); process.exit(3); }
console.log('APROVADO — preview de PR não builda na Vercel (Cloudflare assumiu); staging/main/lote e produção no trem continuam:');
