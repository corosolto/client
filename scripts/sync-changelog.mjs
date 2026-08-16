#!/usr/bin/env node
/* Notas de release CONSOLIDADAS: a entrada de cada versão agrega TODOS os PRs
   mergeados desde a última tag (decisão do dono, 16/08: consolidar as NOTAS, não a
   cadência de versionamento). Extração 100% git — o subject do merge commit traz o
   #N e o corpo traz o título do PR, então o roteiro não precisa de rede nem de gh.
   O link "Notas completas do release" morreu aqui: a seção do CHANGELOG É as notas
   do release — linkar o release nelas mesmas era um ponteiro que girava em círculo
   (e ainda gravava o domínio pré-migração, rubenmarcus/csbrasil). */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const path = 'CHANGELOG.md';
const current = readFileSync(path, 'utf8');

const git = (args) => execFileSync('git', args, { encoding: 'utf8' });

function tagExists(tag) {
  try { git(['rev-parse', '--verify', '--quiet', `${tag}^{}`]); return true; } catch { return false; }
}

function lastTag(before) {
  try {
    return git(['describe', '--tags', '--abbrev=0', ...(before ? [before] : [])]).trim();
  } catch { return null; }
}

/* PRs mergeados no intervalo. Fallback sem tag: últimos 3 merges (primeira execução
   num clone raso ainda lista algo em vez de estourar). */
function mergedPRs(fromRef, toRef) {
  const range = fromRef ? [`${fromRef}..${toRef || 'HEAD'}`] : ['-3'];
  const out = git(['log', '--merges', '--format=%H\u0001%s\u0001%b\u0002', ...range]);
  const prs = [];
  for (const chunk of out.split('\u0002')) {
    const m = chunk.match(/Merge pull request #(\d+)/);
    if (!m) continue;
    const [, subject, body] = chunk.split('\u0001');
    const title = (body || '').split('\n').map((l) => l.trim()).filter(Boolean)
      .find((l) => !/^Signed-off-by:/i.test(l))
      || subject.replace(/^Merge pull request #\d+ from \S+\s*/, '');
    if (/^chore\(release\)/.test(title)) continue;
    prs.push({ n: m[1], title: title.replace(/[<>]/g, '').replace(/\s+/g, ' ') });
  }
  return prs.reverse();
}

/* Commits diretos (sem PR) no intervalo — raro, mas não pode sumir do registro. */
function directCommits(fromRef, toRef) {
  if (!fromRef) return [];
  const out = git(['log', '--no-merges', '--format=%s', `${fromRef}..${toRef || 'HEAD'}`]);
  return out.split('\n').map((l) => l.trim()).filter(Boolean)
    .filter((s) => !/^chore\(release\)/.test(s))
    .map((s) => ({ n: null, title: s.replace(/[<>]/g, '') }));
}

function buildSection(prs, directs) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [...prs, ...directs].map((p) => `- ${p.title}${p.n ? ` (#${p.n})` : ''}`);
  if (!lines.length) lines.push(`- Publicação ${version}`);
  return `\n## [${version}] — ${date}\n\n### Mudado\n${lines.join('\n')}\n`;
}

function latestSection(text) {
  const start = text.indexOf(`\n## [${version}]`);
  if (start < 0) return null;
  const rest = text.slice(start + 1);
  const next = rest.indexOf('\n## [');
  return { start: start + 1, body: next < 0 ? rest : rest.slice(0, next) };
}

/* ── modo --check: a régua do CHANGELOG (teto com mutação, ver //changelog:check).
   Valida a seção da versão CORRENTE: sem link auto-referente, sem domínio
   pré-migração e — quando as duas tags existem localmente — a contagem de PRs
   bate com a extraída do git. Clone sem tags (Vercel): pula SÓ a contagem,
   declara o pulo; os cheques estruturais mordem em qualquer clone. */
if (process.argv.includes('--check')) {
  const mutante = (process.argv.find((a) => a.startsWith('--mutante=')) || '').split('=')[1];
  const sec = latestSection(current);
  if (!sec) { console.error(`✗ CHANGELOG sem seção [${version}]`); process.exit(1); }

  let body = sec.body;
  if (mutante === 'selflink') body = body.replace('\n', '\n- [Notas completas do release](https://github.com/corosolto/client/releases/tag/v' + version + ').\n');
  if (mutante === 'dominio-velho') body = body.replace('\n', '\n- ver https://github.com/rubenmarcus/csbrasil\n');

  const fails = [];
  if (/Notas completas do release/.test(body)) fails.push('link auto-referente (a seção É as notas)');
  if (/rubenmarcus\/csbrasil/.test(body)) fails.push('domínio pré-migração (rubenmarcus/csbrasil)');

  const tag = `v${version}`;
  if (tagExists(tag)) {
    const prev = lastTag(`${tag}^`);
    if (prev) {
      const expected = mergedPRs(prev, tag).length;
      const got = (body.match(/ \(#\d+\)/g) || []).length;
      if (mutante === 'pr-sumido' && got > 0) fails.push(`contagem de PRs: ${got - 1} na seção, ${expected} no git (mutante)`);
      else if (got !== expected) fails.push(`contagem de PRs: ${got} na seção, ${expected} no git (${prev}..${tag})`);
    } else {
      console.log('  (sem tag anterior local — checagem de contagem pulada, estrutura valendo)');
    }
  } else {
    console.log('  (sem tags locais — checagem de contagem pulada, estrutura valendo)');
  }

  if (fails.length) {
    console.error(`✗ CHANGELOGCHECK ${fails.length} vermelha(s):\n  - ${fails.join('\n  - ')}`);
    process.exit(1);
  }
  console.log(`✓ CHANGELOGCHECK verde: seção [${version}] sem link circular, domínio canônico, PRs conferidos`);
  process.exit(0);
}

/* ── modo escrita (release.yml chama assim) */
if (current.includes(`## [${version}]`)) process.exit(0);

const from = lastTag();
const section = buildSection(mergedPRs(from), directCommits(from));
const first = current.indexOf('\n## [');
if (first < 0) throw new Error('CHANGELOG.md não contém nenhuma seção de versão');
writeFileSync(path, current.slice(0, first) + section + current.slice(first));
