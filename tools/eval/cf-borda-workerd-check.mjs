#!/usr/bin/env node
/* RÉGUA do cache compartilhado do Worker (src/cf/worker.ts) dentro do workerd de verdade
   (`wrangler dev`, local). O Node da régua cf-borda-check não tem as regras do workerd: promessa
   e corpo pertencem à requisição que os criou. Em 17/11 o csb-prod deu 500 em rajadas
   concorrentes da mesma URL com "Cannot perform I/O on behalf of a different request" (a 2ª
   requisição lia a Response da 1ª) e "This promise was created by a request that has since
   ended" (a dona da operação cancelada pelo cliente; o waitUntil que a segura viva é cobrado no
   B2 da cf-borda-check, porque o workerd local não cancela a requisição quando o cliente cai).
     W1  duas requisições vivas na mesma URL: as duas 200 com o corpo da origem, uma ida à origem
     W2  o cliente da dona desiste no meio do preenchimento: quem esperava recebe 200, uma ida à
         origem, e a URL segue servindo depois
   Mutante (tem de reprovar com exit 1): espera-le-resposta-da-dona (o código de antes). */
import { spawn } from 'node:child_process';
import http from 'node:http';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MUTANTE = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
const MUTACOES = {
  'espera-le-resposta-da-dona': [
    '      if (dona) return responderCondicional((await trabalho).saida, request);\n'
      + '      return responderCondicional(await respostaDeQuemEspera(cache, request, env, ctx, url, trabalho), request);',
    '      return responderCondicional((await trabalho).saida.clone(), request);'],
};
if (MUTANTE && !MUTACOES[MUTANTE]) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

let worker = readFileSync(path.join(ROOT, 'src/cf/worker.ts'), 'utf8');
if (MUTANTE) {
  const [de, para] = MUTACOES[MUTANTE];
  if (!worker.includes(de)) { console.error(`mutante ${MUTANTE} não encontrou o trecho em src/cf/worker.ts`); process.exit(2); }
  worker = worker.replace(de, para);
}
const prod = readFileSync(path.join(ROOT, 'wrangler.prod.toml'), 'utf8');
const dataCompat = /^compatibility_date\s*=\s*"([^"]+)"/m.exec(prod)?.[1];
const flagsCompat = /^compatibility_flags\s*=\s*(\[[^\]]*\])/m.exec(prod)?.[1];
if (!dataCompat || !flagsCompat) { console.error('wrangler.prod.toml sem compatibility_date/flags'); process.exit(2); }

// Origem com corpo de I/O nativo (subrequest), como ASSETS e R2 em produção.
const idas = new Map();
const origem = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://origem');
  idas.set(u.search, (idas.get(u.search) || 0) + 1);
  setTimeout(() => {
    if (res.destroyed) return;
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'public, max-age=0, s-maxage=60' });
    res.end(`origem${u.search}`);
  }, Number(u.searchParams.get('lento') || 0));
});
await new Promise((resolve) => origem.listen(0, '127.0.0.1', resolve));
const portaOrigem = origem.address().port;

const dir = mkdtempSync(path.join(tmpdir(), 'cf-workerd-'));
let wrangler = null;
let log = '';
const encerrar = async (codigo) => {
  if (wrangler && wrangler.exitCode === null) {
    wrangler.kill('SIGTERM');
    await new Promise((resolve) => { wrangler.once('exit', resolve); setTimeout(resolve, 3000); });
  }
  origem.close();
  rmSync(dir, { recursive: true, force: true });
  process.exit(codigo);
};

await build({
  stdin: { contents: worker, resolveDir: path.join(ROOT, 'src/cf'), sourcefile: 'worker.ts', loader: 'ts' },
  outfile: path.join(dir, 'worker.mjs'),
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  mainFields: ['module', 'main'],
  logLevel: 'silent',
  plugins: [{
    name: 'cf-workerd',
    setup(esbuild) {
      esbuild.onResolve({ filter: /^@astrojs\/cloudflare\/entrypoints\/server$/ }, () => ({ path: 'astro-stub', namespace: 'cf-workerd' }));
      esbuild.onLoad({ filter: /^astro-stub$/, namespace: 'cf-workerd' }, () => ({
        loader: 'js',
        contents: `export default { fetch: (request) => {
          const u = new URL(request.url);
          return fetch('http://127.0.0.1:${portaOrigem}' + u.pathname + u.search);
        } };`,
      }));
    },
  }],
});
writeFileSync(path.join(dir, 'wrangler.toml'), [
  'name = "cf-borda-workerd"',
  'main = "worker.mjs"',
  'no_bundle = true',
  `compatibility_date = "${dataCompat}"`,
  `compatibility_flags = ${flagsCompat}`,
  '',
].join('\n'));

const porta = await new Promise((resolve) => {
  const livre = http.createServer().listen(0, '127.0.0.1', () => { const p = livre.address().port; livre.close(() => resolve(p)); });
});
wrangler = spawn(path.join(ROOT, 'node_modules/.bin/wrangler'),
  ['dev', '--port', String(porta), '--ip', '127.0.0.1', '--show-interactive-dev-session=false', '--log-level', 'error'],
  { cwd: dir, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
wrangler.stdout.on('data', (d) => { log += d; });
wrangler.stderr.on('data', (d) => { log += d; });
const base = `http://127.0.0.1:${porta}`;
for (let tentativa = 0; ; tentativa++) {
  try { await (await fetch(`${base}/pronto`)).arrayBuffer(); break; } catch {
    if (wrangler.exitCode !== null || tentativa > 600) {
      console.error(`wrangler dev não subiu:\n${log}`);
      await encerrar(2);
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

const falhas = [];
const check = (ok, id, msg) => { if (!ok) falhas.push(id); console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${msg}`); };
const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ler = async (pedido) => {
  try {
    const r = await pedido;
    return { status: r.status, corpo: await r.text() };
  } catch (error) {
    return { status: 0, corpo: `${error.name}: ${error.message}` };
  }
};
const resumo = (r) => `${r.status} ${r.corpo.slice(0, 120)}`;

// W1
const w1 = '?w1&lento=400';
const w1a = ler(fetch(`${base}/mapa${w1}`));
await espera(100);
const w1b = ler(fetch(`${base}/mapa${w1}`));
const [r1a, r1b] = await Promise.all([w1a, w1b]);
check(r1a.status === 200 && r1a.corpo === `origem${w1}` && r1b.status === 200 && r1b.corpo === `origem${w1}` && idas.get(w1) === 1,
  'W1', `concorrentes vivos: A=${resumo(r1a)} B=${resumo(r1b)} idas=${idas.get(w1)}`);

// W2
const w2 = '?w2&lento=700';
const desiste = new AbortController();
const w2a = ler(fetch(`${base}/mapa${w2}`, { signal: desiste.signal }));
await espera(100);
const w2b = ler(fetch(`${base}/mapa${w2}`));
await espera(100);
desiste.abort();
const r2b = await w2b;
await w2a;
const r2c = await ler(fetch(`${base}/mapa${w2}`, { signal: AbortSignal.timeout(10000) }));
check(r2b.status === 200 && r2b.corpo === `origem${w2}` && idas.get(w2) === 1 && r2c.status === 200 && r2c.corpo === `origem${w2}`,
  'W2', `dona desconectou: espera=${resumo(r2b)} depois=${resumo(r2c)} idas=${idas.get(w2)}`);

// W3: os contadores passam pelo mesmo preenchimento frio no workerd.
for (const rota of ['online', 'map-plays']) {
  const query = `?w3=${rota}&lento=300`;
  const url = `${base}/api/${rota}${query}`;
  const respostas = await Promise.all(Array.from({ length: 8 }, () => ler(fetch(url))));
  check(respostas.every(resposta => resposta.status === 200 && resposta.corpo === `origem${query}`)
    && idas.get(query) === 1, 'W3', `/api/${rota}: 8 GETs concorrentes, idas à origem=${idas.get(query)}`);
}

console.log(`cf-borda-workerd${MUTANTE ? ` [mutante ${MUTANTE}]` : ''}: ${falhas.length ? `${falhas.length} falha(s): ${falhas.join(', ')}` : 'PASS'}`);
await encerrar(falhas.length ? 1 : 0);
