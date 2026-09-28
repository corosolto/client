/* plantao.mjs — vigia-prod: bate no site em produção e reporta o que VIU.
   ─────────────────────────────────────────────────────────────────────────────
   O QUE É: cron local (config intervalo_min) que roda as checagens DECLARADAS
   em acoes/*.md (uma por classe de quebra que já aconteceu — a classe está
   documentada no corpo de cada ação) contra a URL de produção. Falha abre
   issue com evidência (status HTTP, diff, contagem); issue DEDUPLICADA por
   marcador no corpo — se já existe aberta pela mesma checagem, comenta nela.

   DIVISÃO DE TERRITÓRIO com o prod-watch.yml do Actions (decisão 16/08):
   o workflow fica com o barato/determinístico do edge (purge pós-deploy,
   probe de coerência entre módulos, health do banco/schema, dispatch pro
   crash-fix); o vigia-prod fica com as SEMÂNTICAS que precisam da árvore
   local e de estado persistido (bundle vs árvore, manifest de áudio,
   decals-pack, shape do ranking, smoke Playwright). Nenhuma checagem
   duplicada entre os dois.

   COMANDOS:
     bun plantao.mjs rodada            uma rodada e sai (cron-friendly)
     bun plantao.mjs poll              daemon no intervalo do config
     bun plantao.mjs checar <nome>     uma checagem específica, imprime e sai
     bun plantao.mjs selftest          fixture mínima pelo pipeline
   GH_DRY_RUN=1: issue/comentário salvos em estado/dry-run/, não enviados. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarCliente, seco } from '../lib/gh.mjs';
import { carregarPersona, cabecalho, assinatura } from '../lib/persona.mjs';
import { carregarAcoes } from '../lib/acoes.mjs';
import { tabela, codigo, alerta } from '../lib/formatacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(RAIZ, 'config.json'), 'utf8'));
const PERSONA = carregarPersona(RAIZ);
const ESTADO_DIR = join(RAIZ, 'estado');
if (!existsSync(ESTADO_DIR)) mkdirSync(ESTADO_DIR);
const { gh, api } = criarCliente({ patEnv: CFG.pat_env, estadoDir: ESTADO_DIR, repo: CFG.repo });
const BASE = CFG.url.replace(/\/$/, '');
const REPO_DIR = join(RAIZ, CFG.base_dir || '../..');
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('pt-BR')}]`, ...a);
const agora = () => new Date().toISOString();

/* ── primitivas HTTP ───────────────────────────────────────────────────────── */
async function get(caminho, { comoTexto = true } = {}) {
  const r = await fetch(`${BASE}${caminho}`, { redirect: 'follow' });
  const corpo = comoTexto ? await r.text() : Buffer.from(await r.arrayBuffer());
  return { status: r.status, corpo };
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/* O ar publica a MAIN — comparar contra o worktree corrente do dono (branch de
 * feature, árvore suja) acusaria falso vermelho todo dia. Worktree efêmero
 * travado em origin/main, como o modo fix do canarinho. */
export function worktreeDe(branch, wt) {
  const fetch = spawnSync('git', ['fetch', '-q', 'origin', branch], { cwd: REPO_DIR, encoding: 'utf8' });
  if (fetch.status !== 0) throw new Error(`git fetch origin ${branch}: ${(fetch.stderr || '').slice(0, 120)}`);
  const ref = `origin/${branch}`;
  if (!existsSync(wt)) {
    const add = spawnSync('git', ['worktree', 'add', '-q', '--detach', wt, ref], { cwd: REPO_DIR, encoding: 'utf8' });
    if (add.status !== 0) throw new Error(`worktree add: ${(add.stderr || '').slice(0, 120)}`);
  } else {
    spawnSync('git', ['-C', wt, 'checkout', '-q', '--detach', ref], { encoding: 'utf8' });
    spawnSync('git', ['-C', wt, 'reset', '-q', '--hard', ref], { encoding: 'utf8' });
    spawnSync('git', ['-C', wt, 'clean', '-qfd'], { encoding: 'utf8' });
  }
  return wt;
}

export const worktreeMain = () => worktreeDe('main', '/tmp/vigia-main');

/* ── as checagens (uma por classe; a doc mora em acoes/*.md) ───────────────── */
export const CHECAGENS = {
  async 'bundle-em-dia'() {
    const wt = worktreeMain();
    const { moduleCacheManifest } = await import(join(REPO_DIR, 'scripts', 'module-cache.mjs'));
    const esperada = moduleCacheManifest(join(wt, 'public', 'js')).revision;
    const html = await get('/');
    if (html.status !== 200) return { ok: false, evid: `GET / → ${html.status}`, detalhe: html.corpo.slice(0, 200) };
    /* formato real do cache-bust: ?v=<versão>-<revisão 12 hex> — a revisão é o
     * SUFIXO (module-cache digest), ex.: 2.0.0-alpha.133-6247e83ac2e2. */
    const noAr = html.corpo.match(/main\.js\?v=([\w.-]+?([0-9a-f]{12}))/);
    if (!noAr) return { ok: false, evid: 'HTML sem import map (?v=) — boot quebrado ou página errada no ar', detalhe: html.corpo.slice(0, 200) };
    const local = readFileSync(join(wt, 'public', 'js', 'main.js'));
    const servido = await get('/js/main.js?v=' + noAr[1], { comoTexto: false });
    const bytesIguais = sha256(servido.corpo) === sha256(local);
    const revisaoOk = noAr[2] === esperada;
    if (revisaoOk && bytesIguais && servido.status === 200) return { ok: true, evid: `?v=${noAr[1]} == revisão da árvore; bytes de main.js conferem` };
    return {
      ok: false,
      evid: `bundle fora: HTML serve ?v=${noAr[1]}, árvore espera ${esperada}, bytes ${bytesIguais ? 'conferem' : 'DIFEREM'} (status main.js ${servido.status})`,
      detalhe: 'deploy não publicado, build antigo no ar ou edge servindo byte velho (classe BUG-55)',
    };
  },

  async 'manifest-audio'() {
    const r = await get('/audio/manifest.json');
    if (r.status !== 200) return { ok: false, evid: `GET /audio/manifest.json → ${r.status}`, detalhe: 'manifest fora do ar — jogo sem voz' };
    let manifest;
    try { manifest = JSON.parse(r.corpo); } catch (e) { return { ok: false, evid: `manifest.json não parseia: ${e.message}` }; }
    const folhas = (function conta(no) {
      if (typeof no === 'string') return 1;
      if (Array.isArray(no)) return no.reduce((s, x) => s + conta(x), 0);
      if (no && typeof no === 'object') return Object.values(no).reduce((s, x) => s + conta(x), 0);
      return 0;
    })(manifest);
    const arqBase = join(ESTADO_DIR, 'baseline-audio.json');
    const base = existsSync(arqBase) ? JSON.parse(readFileSync(arqBase, 'utf8')) : { folhas };
    if (!existsSync(arqBase)) writeFileSync(arqBase, JSON.stringify({ folhas, quando: agora() }));
    const piso = CFG.piso_audio || 300;
    const encolheu = folhas < base.folhas;
    if (folhas >= piso && !encolheu) {
      if (folhas > base.folhas) writeFileSync(arqBase, JSON.stringify({ folhas, quando: agora() }));
      return { ok: true, evid: `manifest do ar com ${folhas} folhas (piso ${piso}, última ${base.folhas})` };
    }
    return {
      ok: false,
      evid: `manifest do ar encolheu: ${folhas} folhas (era ${base.folhas}, piso ${piso})`,
      detalhe: folhas < 100 ? 'número na casa do example.json (62): o fetch do pacote falhou e o build copiou o exemplo (classe BUG-19)' : 'pacote veio pela metade',
    };
  },

  async 'decals-pack'() {
    const tex = readFileSync(join(worktreeMain(), 'public', 'js', 'textures.js'), 'utf8');
    const pedidos = [...tex.matchAll(/\['([^']+)',\s*[\d.]+,/g)].map((m) => m[1]);
    if (!pedidos.length) return { ok: false, evid: 'DECAL_FILES não encontrado no textures.js — checagem cega', detalhe: 'formato do textures.js mudou; ação precisa de manutenção' };
    const n = Math.min(CFG.amostra_decals || 12, pedidos.length);
    const amostra = [...pedidos].sort(() => Math.random() - 0.5).slice(0, n);
    const faltando = [];
    for (const f of amostra) {
      const r = await fetch(`${BASE}/img/decals/${encodeURIComponent(f)}`, { method: 'HEAD' });
      if (r.status !== 200) faltando.push(`${f} → ${r.status}`);
    }
    if (!faltando.length) return { ok: true, evid: `amostra de ${n}/${pedidos.length} decalques respondendo 200` };
    return { ok: false, evid: `${faltando.length}/${n} da amostra fora do ar: ${faltando.slice(0, 5).join(', ')}`, detalhe: 'pack publicado atrás do DECAL_FILES (classe 06/08, grafite sumido)' };
  },

  async 'ranking-shape'() {
    const r = await get('/api/leaderboard');
    if (r.status !== 200) return { ok: false, evid: `GET /api/leaderboard → ${r.status}`, detalhe: r.corpo.slice(0, 200) };
    let dados;
    try { dados = JSON.parse(r.corpo); } catch { return { ok: false, evid: 'leaderboard não devolve JSON', detalhe: r.corpo.slice(0, 200) }; }
    if (dados && dados.disabled === true) return { ok: true, evid: 'ranking desligado POR ESCOLHA (estado válido, main.js reage)' };
    const lista = Array.isArray(dados) ? dados : dados.rows || dados.entries || dados.top || dados.ranking;
    if (Array.isArray(lista)) return { ok: true, evid: `leaderboard ligado com ${lista.length} entrada(s) no shape esperado` };
    return { ok: false, evid: 'leaderboard ligado sem lista de entradas em campo conhecido', detalhe: JSON.stringify(dados).slice(0, 200) };
  },

  async 'smoke-playwright'() {
    const r = spawnSync('sh', ['-c', CFG.smoke_cmd], {
      cwd: REPO_DIR, encoding: 'utf8', timeout: 12 * 60_000, maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, BASE_URL: BASE },
    });
    const fim = (r.stdout || '') + (r.stderr || '');
    if (r.status === 0) return { ok: true, evid: 'smoke Playwright verde contra produção' };
    return { ok: false, evid: 'smoke Playwright reprovou contra produção', detalhe: fim.split('\n').slice(-12).join('\n'), anexo: join(REPO_DIR, 'test-results') };
  },

  /* CI quebrado na main e deploy de produção falhando — ninguém recebe e-mail
   * disso; a classe inteira é invisível até alguém abrir o Actions. */
  async 'build-em-dia'() {
    const arq = join(ESTADO_DIR, 'ci-vistos.json');
    const vistos = existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : { runs: [], deploy: null };
    const runs = gh(['run', 'list', '-R', CFG.repo, '--branch', 'main', '--status', 'failure', '--limit', '10',
      '--json', 'databaseId,workflowName,displayTitle,event,url'], { json: true });
    const novas = falhasNovas(runs, vistos.runs);
    const deployFalho = await deployDeProducaoFalho(vistos.deploy);
    vistos.runs = [...vistos.runs, ...novas.map((r) => r.databaseId)].slice(-100);
    if (deployFalho) vistos.deploy = deployFalho.id;
    writeFileSync(arq, JSON.stringify(vistos, null, 2));
    if (!novas.length && !deployFalho) return { ok: true, evid: 'nenhum build vermelho novo na main; produção publicando' };

    const partes = [];
    let logCompleto = '';
    for (const r of novas) {
      let rabo = '';
      try { rabo = gh(['run', 'view', String(r.databaseId), '-R', CFG.repo, '--log-failed'], { json: false }).split('\n').slice(-20).map(limparLog).join('\n'); } catch { /* log expirado: o link fica */ }
      partes.push(`${r.workflowName} — ${r.displayTitle.slice(0, 50)} (${r.url})`);
      logCompleto += rabo ? `\n${rabo}\n` : '';
    }
    if (deployFalho) partes.push(`deploy de PRODUÇÃO falhou (${deployFalho.log}) — produção congelada no deploy anterior`);

    const drift = ehDriftDeGerados(logCompleto);
    let conserto = null;
    if (drift) {
      conserto = await consertarDriftGerado();
      if (conserto) log(`drift de gerados: PR de conserto ${conserto.branch}`);
    }
    const evid = `${partes.join(' · ')}${conserto ? ` — PR de conserto já aberto: ${conserto.branch}` : ''}`;
    const detalhe = drift
      ? `classe conhecida: arquivo GERADO desatualizado (o caso alpha.38 do release.yml). Conserto determinístico: \`npm run docs && npm run arch\`.${conserto ? ` O vigia abriu o PR ${conserto.branch} passando pelo portão local.` : ' O PR automático não foi possível (token de escrita ausente ou árvore sem drift) — rodar à mão.'}`
      : `${logCompleto ? `rabo do log:\n${logCompleto}` : 'logs em expiração — abrir o link do run'}`;
    return { ok: false, evid, detalhe };
  },

  /* PR aberto com check vermelho e ninguém resolvendo (o caso 16/08: três PRs
   * travados com o conserto determinístico esperando alguém olhar). Reporta NO
   * PRÓPRIO PR — issue escondida não chega no autor —, e por isso devolve
   * `jaReportado`: a rodada não abre issue por cima. */
  async 'pr-vermelho'() {
    const arq = join(ESTADO_DIR, 'pr-vistos.json');
    const vistos = existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : {};
    const prs = gh(['pr', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '30',
      '--json', 'number,title,url,headRefName,headRefOid,isCrossRepository,statusCheckRollup'], { json: true });
    const vermelhos = prsVermelhos(prs, vistos);
    if (!vermelhos.length) return { ok: true, evid: `nenhum PR aberto com check vermelho novo (${prs.length} abertos)` };

    const linhas = [];
    for (const pr of vermelhos) {
      const falhos = checksFalhos(pr);
      let rabo = '';
      const runId = falhos.map((c) => runIdDaUrl(c.detailsUrl)).find(Boolean);
      if (runId) {
        try { rabo = gh(['run', 'view', String(runId), '-R', CFG.repo, '--log-failed'], { json: false }).split('\n').slice(-20).map(limparLog).join('\n'); }
        catch { /* log expirado ou check de fora do Actions: o link fica */ }
      }
      let arquivos = [];
      try { arquivos = (gh(['pr', 'view', String(pr.number), '-R', CFG.repo, '--json', 'files'], { json: true }).files || []).map((f) => f.path); }
      catch { /* sem a lista de arquivos a classe cai em 'outra', que é o certo */ }
      const classe = classeDaFalha(`${rabo}\n${falhos.map((c) => c.name || c.context || '').join('\n')}`, arquivos);
      const conserto = classe === 'drift' ? await consertarDriftNoPr(pr) : null;
      if (CFG.comentar_pr_vermelho === true) {
        api(`repos/${CFG.repo}/issues/${pr.number}/comments`, 'POST', { body: corpoPrVermelho({ pr, falhos, rabo, classe, conserto }) });
      }
      linhas.push(`#${pr.number} (${classe}${conserto ? ', consertado no branch' : ''}): ${falhos.map((c) => c.name || c.context).slice(0, 3).join(', ')}`);
      log(`pr-vermelho: diagnosticado #${pr.number} — classe ${classe}${conserto ? `, commit ${conserto.sha}` : ''}${CFG.comentar_pr_vermelho === true ? ', comentário publicado' : ', GitHub silencioso'}`);
      /* head só vira "visto" DEPOIS do comentário sair, e nunca em dry-run:
       * marcar antes queimaria a tentativa e o autor nunca receberia nada. */
      if (!seco()) { vistos[pr.number] = pr.headRefOid; writeFileSync(arq, JSON.stringify(vistos, null, 2)); }
    }
    return {
      ok: false,
      jaReportado: true,
      evid: `${vermelhos.length} PR(s) aberto(s) com check vermelho novo: ${linhas.join(' · ')}`,
      detalhe: CFG.comentar_pr_vermelho === true
        ? 'cada autor recebeu o diagnóstico no próprio PR (o vigia não abre issue paralela para vermelho de PR).'
        : 'diagnóstico guardado no log local; o GitHub já mostra o portão vermelho e o vigia só publica quando a política for explicitamente ligada.',
    };
  },
};

/* ── helpers puros do build-em-dia (testáveis offline) ──────────────────────── */
/* Só run de PUSH na main conta: falha de PR tem dono (o autor) e porta própria. */
export function falhasNovas(runs, jaVistos) {
  return (runs || []).filter((r) => r.event === 'push' && !(jaVistos || []).includes(r.databaseId));
}

/* Classe determinística do alpha.38: portão de docs/ARCH reprova na main por
 * arquivo gerado desatualizado — o nome do passo ou o id da régua no log. */
export function ehDriftDeGerados(log) {
  return /docs:check|arch:check|DOCS1|ARCH\.md/.test(log || '');
}

/* ── helpers puros do pr-vermelho (testáveis offline) ───────────────────────── */
/* Dedupe por HEAD, não por PR: novo push é nova tentativa e merece nova
 * passada — comentar de novo no mesmo commit seria a pilha de bot do 16/08. */
export function prsVermelhos(prs, vistos = {}) {
  return (prs || []).filter((pr) => checksFalhos(pr).length > 0 && vistos[pr.number] !== pr.headRefOid);
}

/* O rollup mistura check run (conclusion) e status de commit (state). */
export function checksFalhos(pr) {
  return (pr?.statusCheckRollup || []).filter((c) =>
    /^(FAILURE|TIMED_OUT|CANCELLED|ACTION_REQUIRED|ERROR)$/i.test(c.conclusion || c.state || ''));
}

/* O `gh run view --log-failed` devolve o log CRU do Actions: cor ANSI, BOM e
 * o prefixo "job<TAB>step<TAB>" em toda linha. Colado num comentário isso vira
 * lixo ilegível — o rabo do log só serve se der pra ler. */
export function limparLog(bruto) {
  return String(bruto ?? '')
    .split('\n')
    .map((l) => l.replace(/﻿/g, '').replace(/\x1b\[[0-9;]*m/g, '').replace(/^[^\t]*\t[^\t]*\t/, ''))
    .join('\n')
    .trim();
}

export function runIdDaUrl(url) {
  const m = /\/actions\/runs\/(\d+)/.exec(url || '');
  return m ? m[1] : null;
}

/* A fonte da régua e o contrato que ela guarda. Se o PR mexe AQUI, o vermelho
 * pode ser a régua velha falando — não erro do autor. */
const FONTES_DE_REGUA = /^(scripts\/ci\/|scripts\/(docs|arch)|\.github\/workflows\/|ARCH\.md$)/;

/* Três classes, nesta ordem:
 *  · RÉGUA VELHA: o check reprova em contrato E o próprio PR mexe na fonte da
 *    régua — o PR muda o contrato de propósito. Atualizar régua é decisão
 *    humana; o vigia aponta e não conserta.
 *  · DRIFT: mesmo vermelho, mas o PR não toca a régua — arquivo gerado
 *    desatualizado, conserto determinístico (a classe do alpha.38).
 *  · OUTRA: qualquer coisa que o vigia não sabe classificar — vai o rabo do
 *    log e ponto; palpite de bot sobre bug alheio é ruído. */
export function classeDaFalha(log, arquivos = []) {
  if (!ehDriftDeGerados(log)) return 'outra';
  return (arquivos || []).some((f) => FONTES_DE_REGUA.test(f)) ? 'regua-velha' : 'drift';
}

async function deployDeProducaoFalho(ultimoIdVisto) {
  const deps = gh(['api', `repos/${CFG.repo}/deployments?per_page=10`], { json: true });
  const prod = deps.find((d) => /^production$/i.test(d.environment || ''));
  if (!prod || prod.id === ultimoIdVisto) return null;
  const st = gh(['api', `repos/${CFG.repo}/deployments/${prod.id}/statuses?per_page=1`], { json: true });
  const estado = st[0]?.state || '';
  if (!/^(failure|error)$/i.test(estado)) return null;
  return { id: prod.id, log: `https://github.com/${CFG.repo}/deployments/${prod.id}` };
}

/* Conserto da classe drift: geradores são determinísticos (node puro) e o
 * portão local decide se sobe — mesmo contrato do conserta-codigo. */
async function consertarDriftGerado() {
  const wt = worktreeMain();
  const sh = (cmd) => spawnSync('sh', ['-c', cmd], { cwd: wt, encoding: 'utf8', timeout: 10 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  sh('npm run docs && npm run arch');
  const diff = spawnSync('git', ['-C', wt, 'diff', '--stat'], { encoding: 'utf8' });
  if (!(diff.stdout || '').trim()) return null;
  const gate = sh('npm run docs:check && npm run arch:check');
  if (gate.status !== 0) { log('portão de gerados VERMELHO no worktree — conserto não sobe'); return null; }
  const branch = `vigia/gerados-${new Date().toISOString().slice(0, 10)}`;
  const envG = { ...process.env, GIT_AUTHOR_NAME: 'csbrasil-bot', GIT_AUTHOR_EMAIL: 'csbrasil-bot@users.noreply.github.com', GIT_COMMITTER_NAME: 'csbrasil-bot', GIT_COMMITTER_EMAIL: 'csbrasil-bot@users.noreply.github.com' };
  spawnSync('git', ['-C', wt, 'checkout', '-q', '-B', branch], { encoding: 'utf8' });
  spawnSync('git', ['-C', wt, 'add', '-A'], { encoding: 'utf8', env: envG });
  const c = spawnSync('git', ['-C', wt, 'commit', '-q', '-m', 'chore(docs): blocos gerados em dia (drift detectado pelo vigia)', '-s', '--trailer', 'Agent: vigia-prod'], { encoding: 'utf8', env: envG });
  if (c.status !== 0) return null;
  if (seco()) { log(`[dry-run] push/PR de ${branch} pulados`); return { branch }; }
  const push = spawnSync('git', ['-C', wt, 'push', '-q', 'origin', `HEAD:refs/heads/${branch}`], { encoding: 'utf8' });
  if (push.status !== 0) { log('push falhou (sem credencial de escrita) — issue leva o comando'); return null; }
  const escreve = criarCliente({ patEnv: 'GH_PAT_ESCREVE', estadoDir: ESTADO_DIR, repo: CFG.repo });
  escreve.gh(['pr', 'create', '-R', CFG.repo, '--base', 'main', '--head', branch,
    '--title', 'chore(docs): blocos gerados em dia (build da main vermelho)',
    '--body', 'O build da main reprovou em `docs:check`/`arch:check` por drift de arquivo gerado (a classe do alpha.38, ver release.yml). Este PR roda `npm run docs && npm run arch` num worktree de origin/main e só existe porque `docs:check` e `arch:check` passaram VERDE nele. O portão do CI confirma.']);
  return { branch };
}

/* Conserto do drift NO BRANCH DO PR: mesmo contrato do conserto da main
 * (gerador determinístico + portão verde antes de escrever), mas commitando no
 * branch do autor — abrir PR contra PR é ruído. Fork não dá: o comentário leva
 * o comando exato e a decisão fica com o autor. */
async function consertarDriftNoPr(pr) {
  if (pr.isCrossRepository) return null;
  let wt;
  try { wt = worktreeDe(pr.headRefName, `/tmp/vigia-pr-${pr.number}`); }
  catch (e) { log(`pr-vermelho: worktree do #${pr.number} falhou (${String(e.message).split('\n')[0]}) — sem conserto`); return null; }
  const sh = (cmd) => spawnSync('sh', ['-c', cmd], { cwd: wt, encoding: 'utf8', timeout: 10 * 60_000, maxBuffer: 32 * 1024 * 1024 });
  sh('npm run docs && npm run arch');
  const diff = spawnSync('git', ['-C', wt, 'diff', '--stat'], { encoding: 'utf8' });
  if (!(diff.stdout || '').trim()) return null;
  const gate = sh('npm run docs:check && npm run arch:check');
  if (gate.status !== 0) { log(`pr-vermelho: portão de gerados VERMELHO no #${pr.number} — conserto não sobe`); return null; }
  const envG = { ...process.env, GIT_AUTHOR_NAME: 'csbrasil-bot', GIT_AUTHOR_EMAIL: 'csbrasil-bot@users.noreply.github.com', GIT_COMMITTER_NAME: 'csbrasil-bot', GIT_COMMITTER_EMAIL: 'csbrasil-bot@users.noreply.github.com' };
  spawnSync('git', ['-C', wt, 'add', '-A'], { encoding: 'utf8', env: envG });
  const c = spawnSync('git', ['-C', wt, 'commit', '-q', '-m', 'chore(docs): blocos gerados em dia (drift detectado pelo vigia)', '-s', '--trailer', 'Agent: vigia-prod'], { encoding: 'utf8', env: envG });
  if (c.status !== 0) return null;
  const sha = (spawnSync('git', ['-C', wt, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout || '').trim();
  if (seco()) { log(`[dry-run] push de ${sha} para ${pr.headRefName} pulado`); return { sha, branch: pr.headRefName, seco: true }; }
  const push = spawnSync('git', ['-C', wt, 'push', '-q', 'origin', `HEAD:refs/heads/${pr.headRefName}`], { encoding: 'utf8' });
  if (push.status !== 0) { log(`pr-vermelho: push no ${pr.headRefName} falhou (sem escrita) — comentário leva o comando`); return null; }
  return { sha, branch: pr.headRefName };
}

/* ── comentário no PR (o autor lê onde trabalha) ───────────────────────────── */
export function corpoPrVermelho({ pr, falhos, rabo, classe, conserto }) {
  const lista = (falhos || []).map((c) => `${c.name || c.context}${c.detailsUrl || c.targetUrl ? ` (${c.detailsUrl || c.targetUrl})` : ''}`);
  const veredito = {
    'drift': conserto
      ? alerta('dica', `Classe **drift de gerados**: bloco gerado desatualizado, conserto determinístico. Commitei \`${conserto.sha}\` no \`${conserto.branch}\` — \`npm run docs && npm run arch\` num worktree do seu branch, e só subiu porque \`docs:check\` e \`arch:check\` passaram VERDE nele.`)
      : alerta('atencao', `Classe **drift de gerados**: bloco gerado desatualizado. Não consegui commitar${pr.isCrossRepository ? ' (o PR vem de fork)' : ''}. Conserto:\n${codigo('npm run docs && npm run arch', 'sh')}`),
    'regua-velha': alerta('atencao', 'Classe **régua velha**: o check reprova num contrato que este PR muda de propósito. A régua codificou o contrato antigo — o PR não está "errado". Atualizar a régua é decisão humana, o vigia não mexe.'),
    'outra': alerta('perigo', 'Não sei classificar este vermelho. Segue o que o CI cuspiu — palpite de bot sobre bug alheio só atrapalha.'),
  }[classe];
  const miolo = `<!-- vigia: pr-vermelho ${pr.headRefOid} -->

## check vermelho parado neste PR

${veredito}

${tabela({
    colunas: ['o quê', 'valor'],
    linhas: [
      ['head', `\`${String(pr.headRefOid).slice(0, 12)}\``],
      ['checks vermelhos', String(lista.length)],
      ['classe', `\`${classe}\``],
      ['hora do plantão', agora()],
    ],
  })}

**Vermelho:**
${codigo(lista.join('\n'))}
${rabo ? `\n**Rabo do log:**\n${codigo(rabo)}\n` : '\nLog do run já expirou — abrir pelo link do check.\n'}`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n---\n${assinatura(PERSONA)}`;
}

/* ── issue deduplicada por marcador no corpo ───────────────────────────────── */
export function corpoIssue(acao, resultado) {
  const miolo = `<!-- vigia: ${acao.cfg.checagem} -->

## ${acao.nome} reprovou na produção

${alerta('perigo', `**${resultado.evid}**`)}

${tabela({ colunas: ['o quê', 'valor'], linhas: [
    ['URL', BASE],
    ['checagem', `\`${acao.cfg.checagem}\``],
    ['classe documentada', acao.prompt.split('\n')[0].replace(/^Classe:\s*/, '')],
    ['hora do plantão', agora()],
  ] })}

**O que o vigia viu:**

${codigo(resultado.evid)}

${resultado.detalhe ? (String(resultado.detalhe).includes('\n') ? codigo(resultado.detalhe) : `> ${resultado.detalhe}`) + '\n' : ''}${resultado.anexo ? `Evidência completa em \`${resultado.anexo}\` (máquina do plantão).\n` : ''}
A classe completa do defeito está documentada na ação \`acoes/${acao.arquivo}\` do bot.`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

export function corpoComentario(resultado) {
  const miolo = `Ainda de plantão: **${resultado.evid}** (${agora()}).`;
  return `${cabecalho(PERSONA)}\n\n${miolo}\n\n---\n${assinatura(PERSONA)}`;
}

const MARCADOR = (checagem) => `<!-- vigia: ${checagem} -->`;

async function reportar(acao, resultado) {
  const marcador = MARCADOR(acao.cfg.checagem);
  const abertas = gh(['issue', 'list', '-R', CFG.repo, '--state', 'open', '--limit', '100', '--json', 'number,body,title'], { json: true });
  const minha = abertas.find((i) => (i.body || '').includes(marcador));
  if (minha) {
    api(`repos/${CFG.repo}/issues/${minha.number}/comments`, 'POST', { body: corpoComentario(resultado) });
    log(`${acao.nome}: comentário na issue #${minha.number} (dedupe)`);
  } else {
    gh(['issue', 'create', '-R', CFG.repo,
      '--title', `[plantão] ${acao.nome} reprovou na produção`,
      '--body', corpoIssue(acao, resultado)]);
    log(`${acao.nome}: issue aberta`);
  }
}

/* ── rodada ────────────────────────────────────────────────────────────────── */
export async function rodada({ umaChecagem = null } = {}) {
  const acoes = carregarAcoes(join(RAIZ, 'acoes'), { exigir: ['checagem'] });
  const relatorio = [];
  for (const acao of acoes) {
    if (umaChecagem && acao.cfg.checagem !== umaChecagem) continue;
    const fn = CHECAGENS[acao.cfg.checagem];
    if (!fn) { log(`${acao.nome}: checagem '${acao.cfg.checagem}' sem executor — ação ignora a própria existência (falha ruidosa)`); relatorio.push({ acao, resultado: { ok: false, evid: 'executor não implementado' } }); continue; }
    process.stderr.write(`  [${acao.nome}]… `);
    let resultado;
    try { resultado = await fn(); } catch (e) { resultado = { ok: false, evid: `checagem explodiu: ${String(e.message).split('\n')[0]}` }; }
    process.stderr.write(resultado.ok ? 'verde\n' : `VERMELHO — ${resultado.evid}\n`);
    relatorio.push({ acao, resultado });
    /* jaReportado: a checagem já falou no lugar certo (o pr-vermelho comenta no
     * próprio PR). Abrir issue por cima seria o mesmo achado em dois lugares. */
    if (!resultado.ok && !resultado.jaReportado) await reportar(acao, resultado);
  }
  return relatorio;
}

async function poll() {
  log(`plantão: ${BASE} a cada ${CFG.intervalo_min} min (Ctrl+C para)`);
  for (;;) {
    await rodada().catch((e) => log('rodada falhou:', String(e.message).split('\n')[0]));
    await new Promise((r) => setTimeout(r, CFG.intervalo_min * 60_000));
  }
}

async function selftest() {
  /* o pipeline de dedupe e formatação com checagem fake — sem rede. */
  const acao = { nome: 'fake', arquivo: 'fake.md', cfg: { checagem: 'fake' }, prompt: 'Classe: teste.' };
  const issue = corpoIssue(acao, { evid: 'GET / → 500', detalhe: 'detalhe', quando: agora() });
  const okMarcador = issue.includes('<!-- vigia: fake -->');
  const okPersona = issue.includes('**Esbirro**') && /— \*.*\* 🕵️/.test(issue);
  const okTabela = /^\| o quém\s*\|/m.test(issue) || /^\| o quê\s+/m.test(issue);
  const coment = corpoComentario({ evid: 'x' });
  const okComent = coment.includes('**Esbirro**');
  console.log(`  marcador de dedupe no corpo: ${okMarcador ? '✓' : '✗'}`);
  console.log(`  persona + assinatura: ${okPersona ? '✓' : '✗'}`);
  console.log(`  tabela do relatório: ${okTabela ? '✓' : '✗'}`);
  console.log(`  comentário com persona: ${okComent ? '✓' : '✗'}`);
  const tudo = okMarcador && okPersona && okTabela && okComent;
  console.log(tudo ? '✓ SELFTEST verde' : '✗ SELFTEST vermelho');
  process.exit(tudo ? 0 : 1);
}

const [cmd, arg] = process.argv.slice(2);
const chamadoDireto = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (chamadoDireto) {
  if (cmd === 'rodada') await rodada();
  else if (cmd === 'poll') await poll();
  else if (cmd === 'checar' && arg) await rodada({ umaChecagem: arg });
  else if (cmd === 'selftest') await selftest();
  else { console.log('uso: plantao.mjs rodada|poll|checar <nome>|selftest'); process.exit(2); }
}
