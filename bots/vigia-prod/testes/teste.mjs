/* Teste offline do vigia-prod: corpo de issue com dedupe/persona/tabela, a
   contagem de folhas do manifest (a métrica do BUG-19) e os helpers de build. */
import { corpoIssue, corpoComentario, CHECAGENS, falhasNovas, ehDriftDeGerados,
  prsVermelhos, checksFalhos, runIdDaUrl, limparLog, classeDaFalha, corpoPrVermelho } from '../plantao.mjs';
import { carregarPersona } from '../../lib/persona.mjs';
import { carregarAcoes } from '../../lib/acoes.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export async function testar(t, { dir }) {
  const persona = carregarPersona(dir);
  const acoes = carregarAcoes(join(dir, 'acoes'), { exigir: ['checagem'] });
  t.ok(acoes.length >= 5, `cinco checagens declaradas (achei ${acoes.length})`);
  t.ok(acoes.every((a) => CHECAGENS[a.cfg.checagem]), 'toda ação tem executor implementado');
  t.ok(acoes.some((a) => a.cfg.checagem === 'build-em-dia'), 'check de build quebrado declarado');

  /* ── build-em-dia: só push na main, dedupe por run ── */
  const runs = [
    { databaseId: 1, event: 'push', workflowName: 'pr-fast' },
    { databaseId: 2, event: 'pull_request', workflowName: 'pr-fast' },
    { databaseId: 3, event: 'push', workflowName: 'release' },
  ];
  t.igual(falhasNovas(runs, []).length, 2, 'falha de PR não conta — só push na main');
  t.igual(falhasNovas(runs, [1]).length, 1, 'run já visto não reabre issue');
  t.ok(ehDriftDeGerados('✗ DOCS1 a documentação está DESATUALIZADA'), 'log do docs:check reconhecido como drift');
  t.ok(ehDriftDeGerados('Error: arch:check failed'), 'log do arch:check reconhecido');
  t.ok(!ehDriftDeGerados('TypeError: undefined is not a function'), 'erro de código não é drift de gerado');

  /* ── pr-vermelho: dedupe por head, classe, corpo do comentário ── */
  const verde = { number: 1, headRefOid: 'aaa', statusCheckRollup: [{ name: 'build', conclusion: 'SUCCESS' }] };
  const vermelho = { number: 2, headRefOid: 'bbb', title: 't', isCrossRepository: false, statusCheckRollup: [
    { name: 'build', conclusion: 'SUCCESS' },
    { name: 'docs', conclusion: 'FAILURE', detailsUrl: 'https://github.com/o/r/actions/runs/999/job/5' },
  ] };
  const statusVelho = { number: 3, headRefOid: 'ccc', statusCheckRollup: [{ context: 'vercel', state: 'FAILURE' }] };
  t.igual(prsVermelhos([verde, vermelho, statusVelho], {}).length, 2, 'PR verde não entra; check run e status de commit contam');
  t.igual(prsVermelhos([vermelho], { 2: 'bbb' }).length, 0, 'mesmo head já comentado não repete');
  t.igual(prsVermelhos([vermelho], { 2: 'antigo' }).length, 1, 'push novo é nova tentativa — comenta de novo');
  t.igual(checksFalhos(vermelho).length, 1, 'só o check vermelho é listado');
  t.igual(runIdDaUrl('https://github.com/o/r/actions/runs/999/job/5'), '999', 'run id sai da detailsUrl');
  t.igual(runIdDaUrl('https://vercel.com/deploy/abc'), null, 'check de fora do Actions não tem run');
  t.igual(limparLog('build\tpasso\t[36;1mnpm run x[0m'), 'npm run x', 'rabo do log sai sem ANSI nem prefixo job/step');

  t.igual(classeDaFalha('✗ DOCS1 desatualizada', ['public/js/game.js']), 'drift', 'drift: gerado velho e o PR não mexe na régua');
  t.igual(classeDaFalha('✗ DOCS1 desatualizada', ['scripts/ci/dco_check.py']), 'regua-velha', 'PR que mexe na fonte da régua é régua velha, não erro do autor');
  t.igual(classeDaFalha('✗ DOCS1 desatualizada', ['ARCH.md']), 'regua-velha', 'contrato guardado pela régua conta como fonte');
  t.igual(classeDaFalha('TypeError: undefined is not a function', ['public/js/game.js']), 'outra', 'bug de código não vira palpite de bot');

  const prNoFork = { ...vermelho, isCrossRepository: true };
  const cDrift = corpoPrVermelho({ pr: vermelho, falhos: checksFalhos(vermelho), rabo: '✗ DOCS1', classe: 'drift', conserto: { sha: 'deadbee', branch: 'feat/x' } });
  t.contem(cDrift, '<!-- vigia: pr-vermelho bbb -->', 'comentário do PR dedupe pelo head');
  t.contem(cDrift, 'deadbee', 'comentário diz qual commit subiu no branch');
  t.contem(cDrift, '[!TIP]', 'drift consertado é caixa verde');
  const cFork = corpoPrVermelho({ pr: prNoFork, falhos: checksFalhos(prNoFork), rabo: '', classe: 'drift', conserto: null });
  t.contem(cFork, 'fork', 'fork explica por que o vigia não commitou');
  t.contem(cFork, 'npm run docs && npm run arch', 'fork recebe o comando exato');
  const cRegua = corpoPrVermelho({ pr: vermelho, falhos: checksFalhos(vermelho), rabo: '', classe: 'regua-velha', conserto: null });
  t.contem(cRegua, 'decisão humana', 'régua velha não é consertada por bot');
  t.contem(cRegua, '**Esbirro**', 'comentário do PR abre com a persona');

  const acao = acoes[0];
  const issue = corpoIssue(acao, { evid: 'GET /audio/manifest.json → 200 mas 62 folhas', detalhe: 'example copiado' });
  t.contem(issue, `<!-- vigia: ${acao.cfg.checagem} -->`, 'issue carrega o marcador de dedupe');
  t.contem(issue, `**${persona.nome}**`, 'issue abre com cartão da persona');
  t.ok(persona.bordoes.some((b) => issue.includes(`— *${b}`)), 'issue fecha com bordão');
  t.ok(/^\| o quê\s+\| valor/m.test(issue), 'issue traz tabela do plantão');
  t.contem(issue, '```', 'evidência em bloco de código');
  t.contem(issue, new Date().toISOString().slice(0, 10), 'issue registra a hora do plantão');
  const coment = corpoComentario({ evid: 'ainda 62 folhas' });
  t.contem(coment, '**Esbirro**', 'comentário de dedupe com persona');
  t.contem(coment, 'ainda 62 folhas', 'comentário carrega a evidência nova');

  /* contagem de folhas: mesma métrica do assets-check (folha de string) */
  const manifestExemplo = JSON.parse(readFileSync(
    join(dir, '../..', 'public/audio/manifest.example.json'), 'utf8'));
  const folhas = (function conta(no) {
    if (typeof no === 'string') return 1;
    if (Array.isArray(no)) return no.reduce((s, x) => s + conta(x), 0);
    if (no && typeof no === 'object') return Object.values(no).reduce((s, x) => s + conta(x), 0);
    return 0;
  })(manifestExemplo);
  t.ok(folhas > 50 && folhas < 80, `manifest.example.json tem ${folhas} folhas (a casa dos 62 do BUG-19 — abaixo do piso 300)`);

  /* checagem de ranking: shape declarativo sem rede */
  const valida = (dados) => {
    if (dados && dados.disabled === true) return 'ok-desligado';
    const lista = Array.isArray(dados) ? dados : dados.rows || dados.entries || dados.top || dados.ranking;
    return Array.isArray(lista) ? 'ok-ligado' : 'vermelho';
  };
  t.igual(valida({ disabled: true }), 'ok-desligado', 'ranking desligado é estado válido');
  t.igual(valida({ rows: [{ nick: 'x' }] }), 'ok-ligado', 'shape rows aceito');
  t.igual(valida({ erro: 'x' }), 'vermelho', 'sem lista conhecida é vermelho');
}
