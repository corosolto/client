/* ronda.mjs — zelador: rondas de manutenção com ata de assembleia.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: rondas diárias e semanais de manutenção, cada uma declarada em
   acoes/*.md. Tudo advisory: comenta, monta relatório, abre issue — nunca
   fecha PR, nunca apaga branch, nunca faz merge.

   DIVISÃO DE TERRITÓRIO com o issue-sweep do issues-bot.yml (decisão 16/08):
   o sweep do CI fica com o que é LITERALMENTE de issue (labels bot-fixable,
   covered-by-pr, needs-repro, stale-backlog e comentários nelas); o zelador
   fica com o que é do REPO e das PESSOAS: PR parado, branch órfã, CVE de
   devDeps, drift de documentação, assert:assets na main. O relatório semanal
   é UM markdown (estado/relatorios/) que também vira o corpo de UMA issue
   editada — dedupe por marcador, nunca uma issue por achado.

   COMANDOS:
     bun ronda.mjs diaria      PR parado, audit, drift de docs, assert:assets
     bun ronda.mjs semanal     idem + branch órfã + relatório semanal completo
     bun ronda.mjs selftest    fixture mínima
   GH_DRY_RUN=1: comentário/issue salvos em estado/dry-run/, não enviados. */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { tabela, lista, alerta } from '../lib/formatacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR, { recursive: true });
const { gh, api } = criarCliente({ patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo });
const REPO_DIR = join(RAIZ, CFG.base_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);
const agora = () => new Date().toISOString();
const DIAS_MS = 86_400_000;

/* ── rondas ────────────────────────────────────────────────────────────────── */
/* updatedAt do GitHub mexe com QUALQUER coisa — inclusive o comentário do
 * classify de hoje. Cobrança tem que olhar atividade HUMANA: último comentário
 * de gente + último commit. Bot cobrando por causa de comentário de bot é
 * cobrança falsa (medido: 10 PRs conflitados nunca cobrados por isso). */
const BOTS_IGNORAR = /^(csbrasil-bot|estraga-codigo|github-actions|coderabbitai(\[bot\])?|greptile-apps|greptile|cs-brasil-ai-bot)(\[bot\])?$/i;

export function diasSemAtividade(pr, agoraMs = Date.now()) {
  const marcos = [
    pr.createdAt,
    ...(pr.comments || []).filter((c) => !BOTS_IGNORAR.test(c.author?.login || '')).map((c) => c.createdAt),
    ...(pr.reviews || []).filter((r) => !BOTS_IGNORAR.test(r.author?.login || '')).map((r) => r.submittedAt),
    ...((pr.commits || []).map((c) => c.authoredDate || c.committedDate)).slice(-1),
  ].filter(Boolean).map((d) => new Date(d).getTime());
  return Math.floor((agoraMs - Math.max(...marcos)) / DIAS_MS);
}

async function rondaPrParado(itens) {
  const prs = gh(['pr', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '50',
    '--json', 'number,title,updatedAt,createdAt,author,headRefName'], { json: true });
  const cobrados = readJson(join(ESTADO_DIR, 'cobranca-pr.json'), {});
  for (const resumo of prs) {
    /* detalhe por PR: comments/commits não vêm no list, e é eles que separam
     * atividade humana de barulho de bot. Ronda diária aguenta 15 chamadas. */
    const pr = gh(['pr', 'view', String(resumo.number), '-R', CFG.repo,
      '--json', 'number,title,comments,reviews,commits,updatedAt,createdAt'], { json: true });
    const dias = diasSemAtividade(pr);
    if (dias <= (CFG.pr_dias_parado || 5)) continue;
    /* cobrança única por estado do PR: mudou o head, pode cobrar de novo */
    const chave = `${pr.number}:${pr.updatedAt}`;
    if (cobrados[chave]) continue;
    const corpo = `${cabecalho(PERSONA)}\n\n${alerta('atencao', `PR há **${dias} dias** sem movimento — #${pr.number} · ${pr.title.slice(0, 60)}.`)}\n\nSegue em frente, travou ou foi abandonado? Um comentário com o estado resolve.\n\n---\n${assinatura(PERSONA)}`;
    api(`repos/${CFG.repo}/issues/${pr.number}/comments`, 'POST', { body: corpo });
    cobrados[chave] = agora();
    salvarJson(join(ESTADO_DIR, 'cobranca-pr.json'), cobrados);
    itens.push(`PR #${pr.number} parado há ${dias} dias — cobrado`);
    log(`PR #${pr.number}: cobrado (${dias} dias)`);
  }
}

async function rondaBranchOrfa(itens) {
  const refs = gh(['api', `repos/${CFG.repo}/branches?per_page=100`], { json: true });
  const prs = gh(['pr', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '100', '--json', 'number,headRefName'], { json: true });
  const comPr = new Set(prs.map((p) => p.headRefName));
  const commitDe = (sha) => gh(['api', `repos/${CFG.repo}/commits/${sha}`], { json: true });
  for (const ref of refs) {
    if (['main', 'staging', 'release'].includes(ref.name) || comPr.has(ref.name)) continue;
    const det = await commitDe(ref.commit.sha).catch(() => null);
    if (!det) continue;
    const dias = Math.floor((Date.now() - new Date(det.commit.committer.date).getTime()) / DIAS_MS);
    if (dias >= (CFG.branch_dias_orfa || 30)) itens.push(`branch \`${ref.name}\` sem commit há ${dias} dias e sem PR — candidata a limpeza (decisão é da direção)`);
  }
}

async function rondaAudit(itens) {
  const nivel = CFG.audit_level || 'high';
  const r = spawnSync('npm', ['audit', '--package-lock-only', `--audit-level=${nivel}`, '--json'], { cwd: REPO_DIR, encoding: 'utf8', timeout: 120_000, maxBuffer: 16 * 1024 * 1024 });
  if (r.status === 0) return;
  let dados;
  try { dados = JSON.parse(r.stdout); } catch { itens.push('`npm audit` falhou sem JSON — rodar à mão'); return; }
  const vulns = dados.vulnerabilities || {};
  const altas = Object.values(vulns).filter((v) => ['high', 'critical'].includes(v.severity));
  if (!altas.length) return;
  const corpo = `${cabecalho(PERSONA)}\n\n<!-- zelador: audit-cve -->\n\n## Ata: CVE alta nas dependências da categoria\n\n${tabela({
    colunas: ['pacote', 'severidade', 'via'],
    linhas: altas.map((v) => [v.name, v.severity, (v.via || []).map((x) => typeof x === 'string' ? x : x.title).slice(0, 2).join(', ')]),
  })}\n\n\`npm audit --package-lock-only\` na main. A assembleia pede correção ou\nregistro de risco com prazo.\n\n---\n${assinatura(PERSONA)}`;
  const marcador = '<!-- zelador: audit-cve -->';
  const abertas = gh(['issue', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '100', '--json', 'number,body'], { json: true });
  const minha = abertas.find((i) => (i.body || '').includes(marcador));
  if (minha) {
    api(`repos/${CFG.repo}/issues/${minha.number}/comments`, 'POST', { body: `${cabecalho(PERSONA)}\n\nRodada de hoje ainda acusa as CVEs da ata acima.\n\n---\n${assinatura(PERSONA)}` });
    log(`audit: comentário na issue #${minha.number}`);
  } else {
    gh(['issue', 'create', '-R', CFG.repo, '--title', 'ata: CVE alta nas dependências', '--body', corpo]);
    log('audit: issue aberta');
  }
  itens.push(`${altas.length} CVE alta (issue de ata)`);
}

async function rondaDriftDocs(itens) {
  const docs = ['KNOWN-BUGS.md', 'STATUS.md'].map((f) => ({ f, txt: (() => { try { return readFileSync(join(REPO_DIR, f), 'utf8'); } catch { return ''; } })() }));
  const ultimoJogo = spawnSync('git', ['-C', REPO_DIR, 'log', '-1', '--format=%cI', '--', 'public/js', 'src'], { encoding: 'utf8' });
  if (ultimoJogo.status !== 0 || !ultimoJogo.stdout.trim()) return;
  const msJogo = new Date(ultimoJogo.stdout.trim()).getTime();
  for (const { f, txt } of docs) {
    const m = txt.match(/Estado revisado:\s*\*\*(\d{4}-\d{2}-\d{2})\*\*/);
    if (!m) { itens.push(`${f} sem data de "Estado revisado" — a ata exige data`); continue; }
    const msDoc = new Date(m[1] + 'T12:00:00Z').getTime();
    if (msDoc < msJogo - 7 * DIAS_MS) itens.push(`${f} com "Estado revisado" em ${m[1]}, mais de 7 dias atrás do último commit do jogo — revisar`);
  }
}

async function rondaAssertAssets(itens) {
  const r = spawnSync('sh', ['-c', 'npm run assert:assets'], { cwd: REPO_DIR, encoding: 'utf8', timeout: 10 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  if (r.status === 0) return;
  itens.push('`npm run assert:assets` REPROVOU na main — o próximo deploy nasce doente (classe BUG-19)');
  const corpo = `${cabecalho(PERSONA)}\n\n<!-- zelador: assert-assets -->\n\n## Ata: assert:assets reprovando na main\n\n\`\`\`\n${((r.stdout || '') + (r.stderr || '')).split('\n').slice(-15).join('\n')}\n\`\`\`\n\n---\n${assinatura(PERSONA)}`;
  const marcador = '<!-- zelador: assert-assets -->';
  const abertas = gh(['issue', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '100', '--json', 'number,body'], { json: true });
  if (abertas.some((i) => (i.body || '').includes(marcador))) { log('assert:assets: issue já aberta (dedupe)'); return; }
  gh(['issue', 'create', '-R', CFG.repo, '--title', 'ata: assert:assets reprovando na main', '--body', corpo]);
  log('assert:assets: issue aberta');
}

/* ── relatório semanal: UM markdown, UMA issue editada ─────────────────────── */
export function corpoRelatorio(itens, { semana } = {}) {
  const miolo = `<!-- zelador: ronda-semanal -->

## Ata da assembleia — ronda de ${semana || agora().slice(0, 10)}

${itens.length
    ? alerta('nota', `**${itens.length} item(ns) na pauta** da semana.`) + '\n\n' + lista(itens)
    : alerta('dica', 'Nada na pauta nesta semana.')}

> Item resolvido sai da ata na próxima edição; item ignorado fica — com data.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

async function publicarRelatorio(itens) {
  const dirRel = join(ESTADO_DIR, 'relatorios');
  if (!existsSync(dirRel)) mkdirSync(dirRel, { recursive: true });
  const nome = `semana-${agora().slice(0, 10)}.md`;
  writeFileSync(join(dirRel, nome), corpoRelatorio(itens));
  const corpo = corpoRelatorio(itens);
  const marcador = '<!-- zelador: ronda-semanal -->';
  const abertas = gh(['issue', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '100', '--json', 'number,body,title'], { json: true });
  const minha = abertas.find((i) => (i.body || '').includes(marcador));
  if (minha) {
    api(`repos/${CFG.repo}/issues/${minha.number}`, 'PATCH', { body: corpo });
    log(`relatório: issue #${minha.number} EDITADA (ata única)`);
  } else {
    gh(['issue', 'create', '-R', CFG.repo, '--title', 'ata da assembleia — ronda semanal do zelador', '--body', corpo]);
    log('relatório: issue aberta');
  }
}

const readJson = (arq, def) => (existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : def);
const salvarJson = (arq, dados) => writeFileSync(arq, JSON.stringify(dados, null, 2));

/* ── CLI ───────────────────────────────────────────────────────────────────── */
async function diaria() {
  const itens = [];
  await rondaPrParado(itens);
  await rondaAudit(itens).catch((e) => itens.push(`audit: falhou (${String(e.message).split('\n')[0]})`));
  await rondaDriftDocs(itens);
  await rondaAssertAssets(itens).catch((e) => itens.push(`assert:assets: falhou (${String(e.message).split('\n')[0]})`));
  log(`ronda diária: ${itens.length} item(ns)`);
  return itens;
}

async function semanal() {
  const itens = await diaria();
  await rondaBranchOrfa(itens);
  await publicarRelatorio(itens);
  log('ronda semanal completa');
}

async function selftest() {
  const pr = { updatedAt: new Date(Date.now() - 9 * DIAS_MS).toISOString(), createdAt: new Date(Date.now() - 12 * DIAS_MS).toISOString(), comments: [{ author: { login: 'ruben' }, createdAt: new Date(Date.now() - 9 * DIAS_MS).toISOString() }], reviews: [] };
  const d = diasSemAtividade(pr);
  const okDias = d === 9;
  const corpo = corpoRelatorio(['item 1', 'item 2'], { semana: '2026-08-16' });
  const okMarcador = corpo.includes('<!-- zelador: ronda-semanal -->');
  const okPersona = corpo.includes('**Sindicato**') && corpo.includes('✊');
  const okLista = corpo.includes('- item 1') && corpo.includes('- item 2');
  const vazia = corpoRelatorio([], { semana: 'x' });
  const okVazia = vazia.includes('Nada na pauta');
  console.log(`  PR sem atividade vira 9 dias: ${okDias ? '✓' : '✗ (' + d + ')'}`);
  console.log(`  relatório com marcador de dedupe: ${okMarcador ? '✓' : '✗'}`);
  console.log(`  relatório com persona: ${okPersona ? '✓' : '✗'}`);
  console.log(`  itens em lista: ${okLista ? '✓' : '✗'}`);
  console.log(`  pauta vazia declarada: ${okVazia ? '✓' : '✗'}`);
  const tudo = okDias && okMarcador && okPersona && okLista && okVazia;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'diaria') await diaria();
  else if (cmd === 'semanal') await semanal();
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: ronda.mjs diaria|semanal|selftest'); process.exit(2); }
}
