#!/usr/bin/env node
/* ============================================================================
   lixo-check.mjs: PR NÃO NASCE COM LIXO
   ----------------------------------------------------------------------------
   POR QUE EXISTE
   A varredura de 09/11/2026 (7 663 arquivos rastreados) achou 65 diários em
   plans/ progress/ prompts/ references/, 612 MB de evidência em
   tools/eval/asset-evidence, 341 réguas em tools/eval sem nenhum chamador, 99
   docs históricos órfãos (CONTINUATION, HANDOFF, datas no nome) e 290 arquivos
   em public/ que nenhum código pede. Nada disso entrou de uma vez: entrou um
   PR por vez, cada um "só mais um arquivo". Limpar é trabalho do dono; não
   deixar nascer é trabalho de régua.

   O QUE MEDE: só o que o PR ADICIONA (git diff --diff-filter=A --no-renames)
   contra a base. Renomear para dentro de pasta proibida conta como adicionar.
   Editar e apagar é sempre permitido: régua que reprovasse edição em progress/
   travaria a própria limpeza.

   LX1 · arquivo novo em plans/ progress/ prompts/ content/ references/
         tools/eval/asset-evidence/. Diário vai no repo privado `progress`;
         fonte de arte e evidência pesada vai no `studio-assets`; evidência de
         PR vai no corpo do PR.
   LX2 · arquivo novo na raiz fora da allowlist (ou pasta nova na raiz).
         A allowlist é literal aqui; quem precisa de arquivo novo na raiz
         muda a lista no MESMO PR, e o revisor vê.
   LX3 · tools/eval/<nome>.mjs novo que nem package.json, nem workflow algum,
         nem outro módulo de tools/eval cita depois do PR: régua órfã ao
         nascer. O cabeçalho "Uso:" do próprio arquivo não conta.
   LX4 · docs/**.md novo com nome de histórico: CONTINUATION, HANDOFF, STATUS,
         RELATORIO, PLANO, data (20261109 / 2026-11-09) ou rodada (R1234).
         Histórico vai no `progress`; doc viva não leva data no nome.
   LX5 · public/img|video|models novo que nenhum código do jogo pede
         (public/js, src, JSONs de public e public/*.css): fragmento de
         caminho, basename ou stem como literal. Asset sem consumidor é fonte
         de arte (studio-assets), não é site.
   LX0 · sem base para comparar a régua não passa calada.

   Base: --base=<ref> > LIXO_BASE > FILA_BASE (CI: base do PR ou do lote; busca
   o commit com --depth=1 se o checkout raso não o tem) > merge-base origin/main.
   Uso: node tools/eval/lixo-check.mjs [--base=<ref>] [--head=<ref>]
        node tools/eval/lixo-check.mjs --mutate
          clone de rascunho + 1 commit por cláusula (6 mutantes vermelhos, um é rename) +
          2 controles positivos (régua ligada e asset citado ficam verdes).
   ============================================================================ */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const arg = (nome) => (process.argv.find((a) => a.startsWith(`--${nome}=`)) || '').split('=').slice(1).join('=');
const git = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', stdio: [opts.input == null ? 'ignore' : 'pipe', 'pipe', 'pipe'], ...opts }).trim();
const gitOk = (args, opts = {}) => { try { git(args, opts); return true; } catch { return false; } };

const RAIZ = git(['rev-parse', '--show-toplevel']);
process.chdir(RAIZ);

/* ── Cláusulas ──────────────────────────────────────────────────────────── */
export const LX1_PREFIXOS = ['plans/', 'progress/', 'prompts/', 'content/', 'references/', 'tools/eval/asset-evidence/'];

/* Raiz rastreada em 09/11/2026 menos o que o bloco 1 da limpeza tira
   (bun.lock, .dockerignore, playwright.config.mjs, OPERACAO-*.md). */
export const ALLOW_RAIZ = new Set([
  '.env.example', '.gitignore', '.mailmap',
  'AGENTS.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'README.md', 'ROADMAP.md', 'SECURITY.md',
  'astro.config.mjs', 'knip.json', 'middleware.js', 'mint-assets.json',
  'package.json', 'package-lock.json', 'playwright.smoke.config.mjs', 'renovate.json',
  'skills-lock.json', 'tsconfig.json', 'vercel.json', 'wrangler.toml', 'wrangler.preview.toml',
]);
export const ALLOW_DIRS = new Set([
  '.agents', '.claude', '.codex', '.githooks', '.github',
  'content', 'docs', 'plans', 'progress', 'prompts', 'public', 'references', 'scripts', 'src', 'tests', 'tools',
]);

export const RE_DOC_HISTORICO = /(CONTINUATION|HANDOFF|STATUS|RELATORIO|PLANO)|\d{4}-?\d{2}-?\d{2}|R\d{3,4}/;
const RE_ASSET = /^public\/(img|video|models)\//;
const ASSET_ISENTO = (base) => base === 'FONTE.md' || base === 'manifest.json' || /^LICENSE/i.test(base) || /\.md$/i.test(base);

const CONSERTO = {
  LX1: 'diário e evidência de PR vão no corpo do PR ou no repo privado `progress`; fonte de arte e evidência pesada vão no `studio-assets`.',
  LX2: 'arquivo de raiz só com entrada em ALLOW_RAIZ/ALLOW_DIRS de tools/eval/lixo-check.mjs, no mesmo PR, com o porquê.',
  LX3: 'ligue a régua num script do package.json ou num workflow de .github/workflows/; se é biblioteca, mova para tools/eval/lib/.',
  LX4: 'histórico vai no repo privado `progress`; doc viva ganha nome sem data, rodada ou CONTINUATION/HANDOFF/STATUS.',
  LX5: 'cite o caminho (ou o basename) em public/js/**, src/** ou num manifesto JSON de public/; fonte de arte vai no `studio-assets`.',
};

/* ── Base ───────────────────────────────────────────────────────────────── */
function resolverBase() {
  const explicita = arg('base') || process.env.LIXO_BASE || '';
  if (explicita) {
    if (gitOk(['rev-parse', '--verify', '--quiet', `${explicita}^{commit}`])) return { base: explicita, origem: 'explícita' };
    return { erro: `base explícita \`${explicita}\` não resolve` };
  }
  const fila = process.env.FILA_BASE || '';
  if (fila) {
    if (!gitOk(['cat-file', '-e', `${fila}^{commit}`])) {
      if (!gitOk(['fetch', '--no-tags', '--depth=1', 'origin', fila])) return { erro: `FILA_BASE ${fila} não existe e o fetch falhou` };
    }
    return { base: fila, origem: 'FILA_BASE' };
  }
  const head = arg('head') || 'HEAD';
  try {
    return { base: git(['merge-base', 'origin/main', head]), origem: 'merge-base origin/main' };
  } catch {
    const raso = gitOk(['rev-parse', '--is-shallow-repository']) && git(['rev-parse', '--is-shallow-repository']) === 'true';
    return { erro: `sem origin/main para o merge-base${raso ? ' (clone raso: passe FILA_BASE ou --base=)' : ''}` };
  }
}

/* ── Diff: só o que o PR adiciona ───────────────────────────────────────── */
/* --no-renames: sem ele o git relata R e o destino do rename escaparia das cláusulas. */
export function arquivosAdicionados(base, head = 'HEAD') {
  const saida = execFileSync('git', ['diff', '--name-status', '--diff-filter=A', '--no-renames', '-z', base, head], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const campos = saida.split('\0');
  const novos = [];
  for (let i = 0; i + 1 < campos.length; i += 2) if (campos[i] === 'A') novos.push(campos[i + 1]);
  return novos;
}

/* ── Fontes lidas da árvore do HEAD (git, não disco): mede o que está commitado ── */
function listarTree(head, raizes) {
  const saida = execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', head, '--', ...raizes], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return saida.split('\0').filter(Boolean);
}
/* Um `git cat-file --batch` para todos os blobs: cabeçalho `<sha> blob <n>`, n bytes, `\n`.
   Devolve um texto por caminho, na mesma ordem (ausente vira ''). */
function lerBlobs(head, caminhos) {
  if (!caminhos.length) return [];
  const buf = execFileSync('git', ['cat-file', '--batch'], { input: caminhos.map((p) => `${head}:${p}`).join('\n') + '\n', maxBuffer: 256 * 1024 * 1024 });
  const textos = [];
  let i = 0;
  while (i < buf.length) {
    const fim = buf.indexOf(10, i);
    const cab = buf.toString('utf8', i, fim).split(' ');
    i = fim + 1;
    if (cab[1] !== 'blob') { textos.push(''); continue; }
    const n = Number(cab[2]);
    textos.push(buf.toString('utf8', i, i + n));
    i += n + 1;
  }
  return textos;
}
const lerTree = (head, caminhos) => lerBlobs(head, caminhos).join('\n');

/* Quem pode "citar" uma régua: package.json, workflows e os outros módulos de
   tools/eval (import de biblioteca), nunca o próprio arquivo (cabeçalho "Uso:"). */
function corpusMencoes(head) {
  const workflows = listarTree(head, ['.github/workflows']).filter((p) => /\.ya?ml$/.test(p));
  const ligacao = lerTree(head, ['package.json', ...workflows]);
  const irmaos = listarTree(head, ['tools/eval']).filter((p) => p.endsWith('.mjs') && !p.startsWith('tools/eval/asset-evidence/'));
  const textos = lerBlobs(head, irmaos);
  return (alvo) => {
    const nome = path.basename(alvo);
    if (mencionado(ligacao, nome)) return true;
    return irmaos.some((p, k) => p !== alvo && mencionado(textos[k], nome));
  };
}
function corpusAssets(head) {
  const todos = listarTree(head, ['public', 'src']);
  const fontes = todos.filter((p) =>
    (p.startsWith('public/js/') && p.endsWith('.js') && path.basename(p) !== 'assetver.js')
    || p.startsWith('src/')
    || (p.startsWith('public/') && !p.startsWith('public/docs/') && !p.startsWith('public/js/') && p.endsWith('.json') && !p.endsWith('.capture.json'))
    || /^public\/[^/]+\.css$/.test(p));
  return lerTree(head, fontes);
}

const mencionado = (corpus, basename) => new RegExp(`(?<![\\w.-])${basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`).test(corpus);

export function classificar(novos, { mencoes, assets }) {
  const falhas = { LX1: [], LX2: [], LX3: [], LX4: [], LX5: [] };
  for (const p of novos) {
    if (LX1_PREFIXOS.some((pre) => p.startsWith(pre))) { falhas.LX1.push(p); continue; }
    const topo = p.split('/')[0];
    if (!p.includes('/')) { if (!ALLOW_RAIZ.has(p)) falhas.LX2.push(p); continue; }
    if (!ALLOW_DIRS.has(topo)) { falhas.LX2.push(p); continue; }
    if (/^tools\/eval\/[^/]+\.mjs$/.test(p)) {
      if (!mencoes()(p)) falhas.LX3.push(p);
      continue;
    }
    if (/^docs\/.*\.md$/i.test(p) && !p.startsWith('docs/adr/')) {
      if (RE_DOC_HISTORICO.test(path.basename(p))) falhas.LX4.push(p);
      continue;
    }
    if (RE_ASSET.test(p)) {
      const base = path.basename(p);
      if (ASSET_ISENTO(base)) continue;
      const rel = p.slice('public/'.length);
      const stem = base.replace(/\.[^.]+$/, '');
      const c = assets();
      // Clipe por estado é pedido pelo índice models/anims/index.json (`"<id>": [... "<estado>"]`), stem curto como "run".
      const clipe = rel.match(/^models\/anims\/([a-z0-9-]+)\/([a-z0-9]+)\.glb$/);
      const noIndice = clipe && new RegExp(`"${clipe[1]}": \\[[^\\]]*"${clipe[2]}"`).test(c);
      const pedido = noIndice || c.includes(rel) || c.includes(base) || (stem.length >= 4 && c.includes(stem));
      if (!pedido) falhas.LX5.push(p);
    }
  }
  return falhas;
}

function medir() {
  const r = resolverBase();
  if (r.erro) {
    console.error(`  \x1b[31m✗\x1b[0m LX0: ${r.erro}; régua sem insumo não pode passar calada`);
    console.error('\x1b[31mlixo 1 VERMELHA\x1b[0m');
    return 1;
  }
  const head = arg('head') || 'HEAD';
  const novos = arquivosAdicionados(r.base, head);
  let mencoesCache, assetsCache;
  const falhas = classificar(novos, {
    mencoes: () => (mencoesCache ??= corpusMencoes(head)),
    assets: () => (assetsCache ??= corpusAssets(head)),
  });
  console.log(`lixo: base ${r.base.slice(0, 12)} (${r.origem}), ${novos.length} arquivo(s) novo(s) no diff`);
  let vermelhas = 0;
  for (const [id, lista] of Object.entries(falhas)) {
    if (!lista.length) { console.log(`  \x1b[32m✓\x1b[0m ${id}`); continue; }
    vermelhas++;
    console.error(`  \x1b[31m✗\x1b[0m ${id}: ${lista.length} arquivo(s)`);
    for (const p of lista) console.error(`      ${p}`);
    console.error(`      conserto: ${CONSERTO[id]}`);
  }
  if (vermelhas) { console.error(`\x1b[31mlixo ${vermelhas} VERMELHA(S)\x1b[0m`); return 1; }
  console.log('\x1b[32mlixo OK\x1b[0m');
  return 0;
}

/* ── Mutantes: clone de rascunho, um commit por cláusula ───────────────── */
/* Nomes montados em partes: este arquivo é irmão em tools/eval e, se citasse o
   mutante literalmente, LX3 o contaria como "ligado" e o mutante ficaria verde. */
const regua = (id) => `tools/eval/zzz-${id}-check.mjs`;
const MUTANTES = [
  { nome: 'diario-progress', acende: 'LX1', arquivos: { 'progress/DIARIO-20261109.md': '# diário\n' } },
  { nome: 'raiz-fora-da-lista', acende: 'LX2', arquivos: { 'NOTAS-20261109.md': '# notas\n' } },
  { nome: 'regua-orfa', acende: 'LX3', arquivos: { [regua('orfa')]: 'process.exit(0);\n' } },
  { nome: 'continuation-novo', acende: 'LX4', arquivos: { 'docs/reports/FOO-CONTINUATION-20261109.md': '# foo\n' } },
  { nome: 'asset-sem-dono', acende: 'LX5', arquivos: { 'public/img/chars/molde/zzz-sem-dono.png': 'png' } },
  {
    nome: 'renomeado-para-progress',
    acende: 'LX1',
    remover: ['README.md'],
    arquivos: (g) => ({ 'progress/DIARIO-20261109.md': g(['show', 'HEAD:README.md']) + '\n' }),
  },
];
/* Controles positivos: o mesmo arquivo novo, mas com quem o pede no mesmo commit. */
const CONTROLES = [
  {
    nome: 'regua-ligada',
    arquivos: (g) => {
      const pkg = JSON.parse(g(['show', 'HEAD:package.json']));
      pkg.scripts['eval:zzz-ligada'] = `node ${regua('ligada')}`;
      return { [regua('ligada')]: 'process.exit(0);\n', 'package.json': JSON.stringify(pkg, null, 2) + '\n' };
    },
  },
  {
    nome: 'asset-citado',
    arquivos: () => ({ 'public/img/zzz-controle.webp': 'webp', 'public/js/zzz-controle.js': "export const CAPA = '/img/zzz-controle.webp';\n" }),
  },
];

function mutar() {
  const headSha = git(['rev-parse', 'HEAD']);
  const dir = mkdtempSync(path.join(tmpdir(), 'lixo-'));
  const g = (args, opts = {}) => git(['-C', dir, '-c', 'user.name=lixo', '-c', 'user.email=lixo@local', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], opts);
  const self = new URL(import.meta.url).pathname;
  let falhou = 0;
  try {
    git(['clone', '-q', '--shared', '--no-checkout', RAIZ, dir]);
    g(['read-tree', headSha]);
    g(['update-ref', 'HEAD', headSha]);
    const rodar = (caso) => {
      g(['read-tree', headSha]);
      const arquivos = typeof caso.arquivos === 'function' ? caso.arquivos(g) : caso.arquivos;
      for (const p of caso.remover || []) g(['update-index', '--force-remove', p]);
      for (const [p, conteudo] of Object.entries(arquivos)) {
        const blob = g(['hash-object', '-w', '--stdin'], { input: conteudo });
        g(['update-index', '--add', '--cacheinfo', `100644,${blob},${p}`]);
      }
      const tree = g(['write-tree']);
      const commit = g(['commit-tree', tree, '-p', headSha, '-m', `mutante ${caso.nome}`]);
      return spawnSync(process.execPath, [self, `--base=${headSha}`, `--head=${commit}`], { cwd: dir, encoding: 'utf8', env: { ...process.env, FILA_BASE: '', LIXO_BASE: '' } });
    };
    for (const m of MUTANTES) {
      const r = rodar(m);
      const semCor = (r.stderr || '').replace(/\x1b\[\d+m/g, '');
      const acesas = [...new Set([...semCor.matchAll(/✗ (LX\d)/g)].map((x) => x[1]))];
      const ok = r.status !== 0 && acesas.length === 1 && acesas[0] === m.acende;
      if (!ok) falhou++;
      console.log(`  ${ok ? '\x1b[32m✓' : '\x1b[31m✗'}\x1b[0m mutante ${m.nome}: esperado ${m.acende} vermelha, saiu ${r.status} com [${acesas.join(', ')}]`);
      if (!ok) console.error((r.stdout || '') + (r.stderr || ''));
    }
    for (const c of CONTROLES) {
      const r = rodar(c);
      const ok = r.status === 0;
      if (!ok) falhou++;
      console.log(`  ${ok ? '\x1b[32m✓' : '\x1b[31m✗'}\x1b[0m controle ${c.nome}: esperado verde, saiu ${r.status}`);
      if (!ok) console.error((r.stdout || '') + (r.stderr || ''));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  if (falhou) { console.error(`\x1b[31mlixo --mutate: ${falhou} caso(s) não se comportaram\x1b[0m`); return 1; }
  console.log(`\x1b[32mlixo --mutate OK: ${MUTANTES.length} mutantes vermelhos, ${CONTROLES.length} controles verdes\x1b[0m`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  process.exit(process.argv.includes('--mutate') ? mutar() : medir());
}
