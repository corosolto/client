/* cronica.mjs — cronista: CHANGELOG por PR e digest semanal da crônica.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: dois movimentos.
     · rodada (pós-merge na main): compila os commits novos desde a última
       rodada, agrupa por ÁREA (mapas/armas/personagens/infra) e por trailer
       `Agent:` (a convenção do CONTRIBUTING), e abre PR com a atualização do
       CHANGELOG — NUNCA commit direto. As entradas do CHANGELOG são secas,
       sem voz; a persona mora no corpo do PR.
     · digest (semanal): resumo em DOIS formatos — markdown pro Discord e
       texto curto pro Telegram — salvos em estado/digests/. O POST real só
       acontece se os webhooks estiverem no config (hoje vazios) e respeita
       GH_DRY_RUN. A crônica pode citar quais agentes escreveram o quê
       (trailer Agent:) e quais personas agiram (lido do estado dos outros
       bots) — sem inventar NADA: tudo derivado de commit e de estado.

   COMANDOS:
     bun cronica.mjs rodada      CHANGELOG desde a última rodada → PR
     bun cronica.mjs digest      crônica semanal (dois formatos + POST se cfg)
     bun cronica.mjs selftest    fixture mínima
*/
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente, seco } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { tabela, lista, alerta } from '../lib/formatacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR, { recursive: true });
const { gh } = criarCliente({ patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo });
const REPO_DIR = resolve(RAIZ, CFG.base_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);
const git = (...args) => execFileSync('git', ['-C', REPO_DIR, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

/* ── commits: parse do git log com trailers Agent: e arquivos por commit ───── */
export function parseCommits(logFormato, logArquivos) {
  /* logFormato: linhas "hash<TAB>subject"; logArquivos: blocos "hash\narq\narq\n\n" */
  const arquivosPor = {};
  let hashAtual = null;
  for (const linha of logArquivos.split('\n')) {
    if (/^[0-9a-f]{40}$/.test(linha.trim())) { hashAtual = linha.trim(); arquivosPor[hashAtual] = []; continue; }
    if (hashAtual && linha.trim()) arquivosPor[hashAtual].push(linha.trim());
  }
  return logFormato.split('\n').filter(Boolean).map((l) => {
    const [hash, subject] = l.split('\t');
    return { hash, subject, arquivos: arquivosPor[hash] || [] };
  });
}

export function comTrailers(commits, corpos) {
  const agentDe = {};
  for (const [hash, corpo] of Object.entries(corpos)) {
    const m = (corpo || '').match(/^Agent:\s*(.+)$/m);
    agentDe[hash] = m ? m[1].trim() : null;
  }
  return commits.map((c) => ({ ...c, agent: agentDe[c.hash] ?? null }));
}

export const AREAS = [
  /* caminhos primeiro, subject só com palavra que não cola em outra coisa:
   * "persona" no subject é o elenco dos BOTS, não do jogo — fora daqui. */
  ['mapas', /^public\/js\/map_|public\/js\/maps\.js|mapa|map-/i],
  ['armas e viewmodel', /weapons|viewmodel|public\/js\/weapons|arma/i],
  ['personagens', /chars|glbchars|character|skin/i],
  ['infra, site e docs', /.*/],
];

export function areaDe(arquivos, subject) {
  for (const [nome, re] of AREAS.slice(0, -1)) {
    if (arquivos.some((f) => re.test(f)) || re.test(subject)) return nome;
  }
  return 'infra, site e docs';
}

export function agrupar(commits) {
  const porArea = new Map();
  const porAgent = new Map();
  for (const c of commits) {
    const area = areaDe(c.arquivos, c.subject);
    if (!porArea.has(area)) porArea.set(area, []);
    porArea.get(area).push(c);
    const ag = c.agent || '(sem Agent:)';
    porAgent.set(ag, (porAgent.get(ag) || 0) + 1);
  }
  return { porArea, porAgent };
}

/* ── CHANGELOG: entrada SECA (gabarito do arquivo) ─────────────────────────── */
export function secaoChangelog(grupos, { versao, data }) {
  const linhas = [`## [${versao}] — ${data}`, ''];
  for (const [area, commits] of porAreaOrdenada(grupos)) {
    linhas.push(`### ${area.charAt(0).toUpperCase() + area.slice(1)}`);
    for (const c of commits) linhas.push(`- ${c.subject.replace(/[<>]/g, '')}`);
    linhas.push('');
  }
  linhas.push(`- [Notas completas do release](https://github.com/rubenmarcus/csbrasil/releases/tag/v${versao}).`);
  return linhas.join('\n');
}
const porAreaOrdenada = (grupos) =>
  AREAS.map(([nome]) => [nome, grupos.porArea.get(nome)]).filter(([, cs]) => cs && cs.length);

/* ── PR do CHANGELOG (persona no corpo, não na entrada) ────────────────────── */
export function corpoPR(grupos, { desde, ate, nCommits }) {
  const contagem = [...grupos.porAgent.entries()].map(([ag, n]) => `\`${ag}\`: ${n}`).join(' · ');
  const miolo = `## Atualização do CHANGELOG — rodada do cronista

Compila **${nCommits} commits** da main (${desde.slice(0, 8)}…${ate.slice(0, 8)}),
agrupados por área e assinados por: ${contagem}.

${tabela({ colunas: ['área', 'commits'], linhas: porAreaOrdenada(grupos).map(([area, cs]) => [area, cs.length]) })}

As entradas acrescentadas ao \`CHANGELOG.md\` seguem o gabarito seco do arquivo
— a crônica fica aqui no corpo do PR, não no registro.

> Quem revisa decide se a seção entra como está ou vira nota do release
> automático; nada foi commitado direto na main.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

/* ── digests: Discord (markdown) e Telegram (curto) ────────────────────────── */
export function digestDiscord(grupos, { semana, personasAtuantes = [] }) {
  const agentes = [...grupos.porAgent.entries()].sort((a, b) => b[1] - a[1]);
  const miolo = `## Crônica da semana — ${semana}

${alerta('nota', 'Tudo abaixo é derivado de commit e do estado dos bots — nada inventado.')}

${lista(porAreaOrdenada(grupos).map(([area, cs]) => `**${area}**: ${cs.length} commit(s) — ${cs.slice(0, 3).map((c) => c.subject.slice(0, 60)).join(' · ')}`))}

**Quem escreveu** (pelo trailer \`Agent:\`): ${agentes.map(([ag, n]) => `\`${ag}\` ×${n}`).join(', ')}.
${personasAtuantes.length ? `**Personas em cena**: ${personasAtuantes.join(', ')}.\n` : ''}
Tudo derivado de commit e do estado dos bots — nada inventado.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

export function digestTelegram(grupos, { semana }) {
  const total = [...grupos.porAgent.values()].reduce((s, n) => s + n, 0);
  const top = [...grupos.porAgent.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const areas = porAreaOrdenada(grupos).map(([a, cs]) => `${a} ${cs.length}`).join(' · ');
  return `CORO SOLTO — crônica de ${semana}: ${total} commits (${areas}). Escreveram: ${top.map(([ag, n]) => `${ag} x${n}`).join(', ')}. ${PERSONA.emoji}`;
}

/* ── estado dos outros bots (vitrine da lore, sem invenção) ────────────────── */
function personasAtuantes() {
  const atuantes = [];
  const estadoEstraga = join(RAIZ, '..', 'estraga-codigo', 'estado', 'estado.json');
  if (existsSync(estadoEstraga)) {
    const prs = JSON.parse(readFileSync(estadoEstraga, 'utf8')).prs || {};
    const n = Object.keys(prs).length;
    if (n) atuantes.push(`Palhaço Mal revisou ${n} PR(s)`);
  }
  const baselineVigia = join(RAIZ, '..', 'vigia-prod', 'estado', 'baseline-audio.json');
  if (existsSync(baselineVigia)) atuantes.push('Esbirro de plantão na produção');
  return atuantes;
}

/* ── webhooks (respeitam GH_DRY_RUN: salvam e não enviam) ──────────────────── */
async function postar(url, payload) {
  const arq = join(ESTADO_DIR, 'dry-run', `webhook-${Date.now()}.json`);
  if (seco()) {
    mkdirSync(dirname(arq), { recursive: true });
    writeFileSync(arq, JSON.stringify({ url, payload }, null, 2));
    log(`[dry-run] webhook salvo em ${arq} (não enviado)`);
    return;
  }
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  if (!r.ok) log(`webhook ${url} → ${r.status}`);
}

/* ── rodadas ───────────────────────────────────────────────────────────────── */
async function commitsNovos() {
  const base = CFG.branch_base || 'main';
  spawnSync('git', ['-C', REPO_DIR, 'fetch', '-q', 'origin', base], { encoding: 'utf8' });
  const arqUltimo = join(ESTADO_DIR, 'ultimo-commit.json');
  const ultimo = existsSync(arqUltimo) ? JSON.parse(readFileSync(arqUltimo, 'utf8')).hash : null;
  const range = ultimo ? `${ultimo}..origin/${base}` : `--since=7 days`;
  const formato = git('log', range, '--no-merges', `--pretty=format:%H%x09%s`);
  if (!formato.trim()) return { commits: [], ate: null };
  const arquivos = git('log', range, '--no-merges', '--name-only', '--pretty=format:%H');
  const corpos = {};
  for (const linha of git('log', range, '--no-merges', `--pretty=format:%H%x1f%B%x1e`).split('\x1e')) {
    const [hash, corpo] = linha.split('\x1f');
    if (hash) corpos[hash.trim()] = corpo || '';
  }
  const commits = comTrailers(parseCommits(formato, arquivos), corpos)
    .filter((c) => !/^chore\(release\)/.test(c.subject));
  return { commits, ate: commits[0]?.hash };
}

async function rodada() {
  const { commits, ate } = await commitsNovos();
  if (!commits.length) { log('nenhum commit novo desde a última rodada'); return; }
  const grupos = agrupar(commits);
  const versao = JSON.parse(readFileSync(join(REPO_DIR, 'package.json'), 'utf8')).version;
  const data = new Date().toISOString().slice(0, 10);
  const secao = secaoChangelog(grupos, { versao, data });

  const branch = `cronista/changelog-${data}`;
  spawnSync('git', ['-C', REPO_DIR, 'checkout', '-q', '-B', branch, `origin/${CFG.branch_base || 'main'}`], { encoding: 'utf8' });
  const changelog = readFileSync(join(REPO_DIR, 'CHANGELOG.md'), 'utf8');
  let novo;
  if (changelog.includes(`## [${versao}]`)) {
    /* seção da versão já existe (release automático): acrescenta as áreas que
     * ainda não estão lá, sem duplicar subject. */
    const existentes = new Set(changelog.split('\n').filter((l) => l.startsWith('- ')));
    const bullets = secao.split('\n').filter((l) => l.startsWith('- ') && !existentes.has(l));
    novo = changelog.replace(`## [${versao}]`, `## [${versao}]`);
    const pos = novo.indexOf(`## [${versao}]`);
    const fimSecao = novo.indexOf('\n## [', pos + 1);
    const inserir = bullets.length ? '\n' + bullets.join('\n') : '';
    novo = novo.slice(0, fimSecao) + inserir + novo.slice(fimSecao);
  } else {
    const first = changelog.indexOf('\n## [');
    novo = changelog.slice(0, first) + '\n' + secao + '\n' + changelog.slice(first);
  }
  writeFileSync(join(REPO_DIR, 'CHANGELOG.md'), novo);
  spawnSync('git', ['-C', REPO_DIR, 'add', 'CHANGELOG.md'], { encoding: 'utf8' });
  const envG = { ...process.env };
  spawnSync('git', ['-C', REPO_DIR, 'commit', '-q', '-m', `docs(changelog): rodada do cronista — ${commits.length} commits`, '-s', '--trailer', 'Agent: cronista'], { encoding: 'utf8', env: envG });
  if (seco()) {
    log(`[dry-run] push e PR de ${branch} pulados — GH_DRY_RUN ativo`);
  } else {
    spawnSync('git', ['-C', REPO_DIR, 'push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { encoding: 'utf8' });
    gh(['pr', 'create', '-R', CFG.repo, '--base', CFG.branch_base || 'main', '--head', branch,
      '--title', `docs(changelog): rodada do cronista (${data})`,
      '--body', corpoPR(grupos, { desde: commits[commits.length - 1].hash, ate, nCommits: commits.length })]);
  }
  writeFileSync(join(ESTADO_DIR, 'ultimo-commit.json'), JSON.stringify({ hash: ate, quando: new Date().toISOString() }));
  log(`rodada: ${commits.length} commits compilados → PR ${seco() ? '(dry-run) ' : ''}${branch}`);
}

async function digest() {
  const arqUltimo = join(ESTADO_DIR, 'ultimo-commit.json');
  if (existsSync(arqUltimo)) {
    /* digest usa a semana inteira, independente do que a rodada já compilou */
  }
  const salvo = existsSync(arqUltimo) ? JSON.parse(readFileSync(arqUltimo, 'utf8')).hash : null;
  if (salvo) writeFileSync(arqUltimo, JSON.stringify({ hash: salvo, quando: new Date().toISOString() }));
  const { commits } = await (async () => {
    const originais = await commitsNovos();
    if (originais.commits.length) return originais;
    /* sem commits novos desde a última rodada: reabre a última janela de 7 dias */
    const formato = git('log', '--since=7 days', '--no-merges', '--pretty=format:%H%x09%s');
    const arquivos = git('log', '--since=7 days', '--no-merges', '--name-only', '--pretty=format:%H');
    const corpos = {};
    for (const linha of git('log', '--since=7 days', '--no-merges', '--pretty=format:%H%x1f%B%x1e').split('\x1e')) {
      const [hash, corpo] = linha.split('\x1f');
      if (hash) corpos[hash.trim()] = corpo || '';
    }
    return { commits: comTrailers(parseCommits(formato, arquivos), corpos).filter((c) => !/^chore\(release\)/.test(c.subject)), ate: null };
  })();
  const semana = new Date().toISOString().slice(0, 10);
  const grupos = agrupar(commits);
  const dirDig = join(ESTADO_DIR, 'digests');
  if (!existsSync(dirDig)) mkdirSync(dirDig, { recursive: true });
  const discord = digestDiscord(grupos, { semana, personasAtuantes: personasAtuantes() });
  const telegram = digestTelegram(grupos, { semana });
  writeFileSync(join(dirDig, `discord-${semana}.md`), discord);
  writeFileSync(join(dirDig, `telegram-${semana}.txt`), telegram);
  log(`digest: ${commits.length} commits · arquivos em estado/digests/`);
  if (CFG.discord_webhook) await postar(CFG.discord_webhook, { content: discord.slice(0, 2000) });
  if (CFG.telegram_bot) log('telegram: bot configurado, mas POST do Telegram exige chat_id — preencher no config quando chegar a hora');
}

async function selftest() {
  const logFormato = ['aaa\tfeat(mapas): favela nova', 'bbb\tfix(armas): coice do AK', 'ccc\tchore: x', 'ddd\tdocs: y'].join('\n');
  const logArquivos = 'aaa\npublic/js/map_favela.js\n\nbbb\npublic/js/weapons.js\n\nccc\n.github/workflows/ci.yml\n\nddd\nREADME.md\n';
  const corpos = { aaa: 'corpo\nAgent: GLM Code', bbb: 'Agent: humano', ccc: 'sem trailer', ddd: 'Agent: Kimi Code' };
  const commits = comTrailers(parseCommits(logFormato, logArquivos), corpos);
  const grupos = agrupar(commits);
  const okArea = grupos.porArea.get('mapas')?.length === 1 && grupos.porArea.get('armas e viewmodel')?.length === 1;
  const okAgent = grupos.porAgent.get('GLM Code') === 1 && grupos.porAgent.get('(sem Agent:)') === 1;
  const sec = secaoChangelog(grupos, { versao: '2.0.0-alpha.133', data: '2026-08-16' });
  const okSec = sec.includes('### Mapas') && sec.includes('- feat(mapas): favela nova') && !sec.includes('Raul');
  const pr = corpoPR(grupos, { desde: 'aaa', ate: 'ddd', nCommits: 4 });
  const okPR = pr.includes('**Raul**') && pr.includes('| área') && !sec.includes('🎸');
  const dis = digestDiscord(grupos, { semana: '2026-08-16', personasAtuantes: ['Palhaço Mal revisou 3 PR(s)'] });
  const okDis = dis.includes('**Quem escreveu**') && dis.includes('`GLM Code` ×1') && dis.includes('Palhaço Mal revisou 3 PR(s)');
  const tel = digestTelegram(grupos, { semana: '2026-08-16' });
  const okTel = tel.length <= 400 && !tel.includes('##') && tel.includes('commits');
  console.log(`  agrupamento por área: ${okArea ? '✓' : '✗ ' + JSON.stringify([...grupos.porArea])}`);
  console.log(`  agrupamento por Agent (com sem-trailer): ${okAgent ? '✓' : '✗'}`);
  console.log(`  seção do CHANGELOG seca: ${okSec ? '✓' : '✗'}`);
  console.log(`  PR com persona e tabela: ${okPR ? '✓' : '✗'}`);
  console.log(`  digest Discord com lore derivada: ${okDis ? '✓' : '✗'}`);
  console.log(`  digest Telegram curto e plain: ${okTel ? '✓' : '✗ (' + tel.length + ')'}`);
  const tudo = okArea && okAgent && okSec && okPR && okDis && okTel;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'rodada') await rodada();
  else if (cmd === 'digest') await digest();
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: cronica.mjs rodada|digest|selftest'); process.exit(2); }
}
