/* vigia-cron: o relógio do monitoramento (workers/vigia-cron/). O contrato que, quebrado,
   faria a vigilância parar SEM vermelho nenhum: cron do wrangler.toml sem alvo, alvo sem
   cron, workflow alvo sem workflow_dispatch (o GitHub responde 422 e ninguém olha o log do
   Worker), schedule voltando ao workflow (rodada em dobro) e erro HTTP engolido. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import worker from '../../../workers/vigia-cron/index.mjs';
import { ALVOS, REF, disparaCron } from '../../../workers/vigia-cron/dispara.mjs';

const raiz = (p) => readFileSync(fileURLToPath(new URL(`../../../${p}`, import.meta.url)), 'utf8');
const TOKENS = { GITHUB_TOKEN_CLIENT: 'tok-client-SENTINELA', GITHUB_TOKEN_BACKEND: 'tok-backend-SENTINELA' };

function fetchFalso(status = 204, corpo = '') {
  const chamadas = [];
  const fn = async (url, init) => {
    chamadas.push({ url, init });
    return new Response(status === 204 ? null : corpo, { status });
  };
  return { fn, chamadas };
}

function capturaConsole(t) {
  const log = t.mock.method(console, 'log', () => {});
  const err = t.mock.method(console, 'error', () => {});
  const linhas = (m) => m.mock.calls.map((c) => c.arguments.join(' '));
  return { log: () => linhas(log), err: () => linhas(err) };
}

test('index.mjs exporta só o handler: o runtime recusa export que não é handler no módulo principal', async () => {
  const modulo = await import('../../../workers/vigia-cron/index.mjs');
  assert.deepEqual(Object.keys(modulo), ['default']);
  assert.equal(typeof modulo.default.scheduled, 'function');
});

test('wrangler.toml e ALVOS têm exatamente os mesmos crons', () => {
  const toml = raiz('workers/vigia-cron/wrangler.toml');
  const linha = /^crons\s*=\s*\[(.*)\]\s*$/m.exec(toml);
  assert.ok(linha, 'wrangler.toml sem [triggers] crons');
  const crons = [...linha[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual([...crons].sort(), Object.keys(ALVOS).sort());
  assert.match(toml, /^workers_dev = false$/m, 'Worker de cron não precisa de URL pública');
});

test('cada cron dispara o workflow certo, na main, com User-Agent e o token do repo certo', async (t) => {
  capturaConsole(t);
  const esperado = {
    '*/15 * * * *': ['corosolto/client', 'prod-watch.yml', TOKENS.GITHUB_TOKEN_CLIENT],
    '17 * * * *': ['corosolto/client', 'ops-diag.yml', TOKENS.GITHUB_TOKEN_CLIENT],
    '*/30 * * * *': ['corosolto/backend', 'sync-nodes.yml', TOKENS.GITHUB_TOKEN_BACKEND],
  };
  assert.deepEqual(Object.keys(esperado).sort(), Object.keys(ALVOS).sort());
  for (const [cron, [repo, workflow, token]] of Object.entries(esperado)) {
    const { fn, chamadas } = fetchFalso(204);
    const r = await disparaCron(cron, TOKENS, fn);
    assert.deepEqual(r, [{ cron, repo, workflow, ok: true }]);
    assert.equal(chamadas.length, 1);
    const { url, init } = chamadas[0];
    assert.equal(url, `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`);
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { ref: 'main' });
    assert.equal(init.headers.authorization, `Bearer ${token}`);
    assert.match(init.headers['user-agent'], /\S/, 'a API do GitHub recusa request sem User-Agent');
    assert.equal(init.headers.accept, 'application/vnd.github+json');
  }
  assert.equal(REF, 'main');
});

test('resposta não-204 vai para console.error com status e corpo, sem o token', async (t) => {
  const c = capturaConsole(t);
  const { fn } = fetchFalso(403, '{"message":"Resource not accessible by personal access token"}');
  const r = await disparaCron('*/30 * * * *', TOKENS, fn);
  assert.equal(r[0].ok, false);
  const erros = c.err().join('\n');
  assert.match(erros, /"status":403/);
  assert.match(erros, /Resource not accessible/);
  assert.match(erros, /sync-nodes\.yml/);
  assert.doesNotMatch(erros + c.log().join('\n'), /SENTINELA/, 'token vazou no log');
});

test('sucesso loga o status 204; segredo ausente e rede caída não chamam/derrubam em silêncio', async (t) => {
  const c = capturaConsole(t);
  await disparaCron('*/15 * * * *', TOKENS, fetchFalso(204).fn);
  assert.match(c.log().join('\n'), /"workflow":"prod-watch\.yml".*"status":204/);

  const semToken = fetchFalso(204);
  const r = await disparaCron('17 * * * *', {}, semToken.fn);
  assert.equal(r[0].ok, false);
  assert.equal(semToken.chamadas.length, 0);
  assert.match(c.err().join('\n'), /GITHUB_TOKEN_CLIENT ausente/);

  const caiu = await disparaCron('17 * * * *', TOKENS, async () => { throw new TypeError('fetch failed'); });
  assert.equal(caiu[0].ok, false);
  assert.match(c.err().join('\n'), /rede: fetch failed/);

  const orfao = await disparaCron('5 * * * *', TOKENS, fetchFalso(204).fn);
  assert.equal(orfao[0].ok, false);
  assert.match(c.err().join('\n'), /cron sem alvo/);
});

test('handler scheduled: lança em falha (o painel conta a invocação como erro) e resolve em 204', async (t) => {
  capturaConsole(t);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = fetchFalso(204).fn;
    await worker.scheduled({ cron: '*/15 * * * *', scheduledTime: Date.now() }, TOKENS);
    globalThis.fetch = fetchFalso(422, '{"message":"Workflow does not have \'workflow_dispatch\' trigger"}').fn;
    await assert.rejects(worker.scheduled({ cron: '17 * * * *', scheduledTime: Date.now() }, TOKENS), /corosolto\/client\/ops-diag\.yml/);
  } finally {
    globalThis.fetch = original;
  }
});

test('workflows alvo do client aceitam workflow_dispatch sem input obrigatório e não têm mais schedule', () => {
  for (const alvos of Object.values(ALVOS)) {
    for (const { repo, workflow } of alvos) {
      if (repo !== 'corosolto/client') continue;
      const s = raiz(`.github/workflows/${workflow}`);
      const on = /^on:\n([\s\S]*?)^\S/m.exec(s)?.[1] ?? '';
      assert.match(on, /^ {2}workflow_dispatch:/m, `${workflow} sem workflow_dispatch: o dispatch do Worker leva 422`);
      assert.doesNotMatch(on, /^ {2}schedule:/m, `${workflow} voltou a ter schedule: rodada em dobro`);
      assert.doesNotMatch(on, /required: true/, `${workflow} tem input obrigatório que o Worker não manda`);
    }
  }
});

test('o deploy instala exatamente os segredos que ALVOS lê, sem ecoar valor', () => {
  const s = raiz('.github/workflows/vigia-cron-deploy.yml');
  const segredos = new Set(Object.values(ALVOS).flat().map((a) => a.segredo));
  for (const nome of segredos) {
    assert.match(s, new RegExp(`^ {10}${nome}: \\$\\{\\{ secrets\\.[A-Z_]+ \\}\\}$`, 'm'), `deploy não injeta ${nome}`);
    assert.ok(s.includes(`'${nome}=\${${nome}}'`), `deploy não põe ${nome} no --secrets-file por referência`);
  }
  assert.match(s, /wrangler@[\d.]+ deploy --config workers\/vigia-cron\/wrangler\.toml --secrets-file/);
  assert.match(s, /- 'workers\/vigia-cron\/\*\*'/);
  assert.doesNotMatch(s, /echo[^\n]*\$\{?GITHUB_TOKEN_/, 'deploy ecoa token');
});
