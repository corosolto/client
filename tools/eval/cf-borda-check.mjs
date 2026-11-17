#!/usr/bin/env node
/* RÉGUA da borda Cloudflare (src/cf/borda.mjs, usada por src/cf/worker.ts). Sem wrangler: o
   módulo roda igual no Node.
     B1  cache-control do navegador sai sem s-maxage/stale-while-revalidate (a Vercel tirava)
     B2  TTL de borda = s-maxage da rota; viewmodel immutable guarda pelo max-age; resto não guarda
     B3  viewmodel do R2: 200 com tamanho/ETag do manifesto, HEAD sem corpo, 304 pelo ETag, e
         null (cai no 404 do Astro) para caminho fora do manifesto, objeto ausente ou tamanho errado
     B4  csbrasil.online (apex) responde 308 para o www preservando caminho e query
     B5  a chave no R2 é a mesma do Blob (scripts/vm-assets.mjs blobPathOf) para todo o manifesto
   Mutantes (cada um tem de reprovar): sem-strip, vm-sem-etag, vm-304-antes-r2, vm-sem-sha,
   apex-301, apex-sem-worker-first, assets-sem-fallback, assets-intercepta-post,
   cache-ignora-etag, cache-sem-stale, cache-revalida-condicional, cache-preenche-condicional,
   cache-sem-single-flight, cache-sem-fill-flight, cache-aceita-legado. */
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { blobPathOf } from '../../scripts/vm-assets.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MUTANTE = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
const MUTACOES = {
  'sem-strip': ['src/cf/borda.mjs', 'if (swr) { stale = Number(swr[1]); continue; }', 'if (swr) { stale = Number(swr[1]); }'],
  'vm-sem-etag': ['src/cf/borda.mjs', "const headers = new Headers({ 'content-type': entrada.contentType, etag });", "const headers = new Headers({ 'content-type': entrada.contentType });"],
  'vm-304-antes-r2': ['src/cf/borda.mjs', '  const chave = chaveR2Viewmodel(entrada);', "  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });\n  const chave = chaveR2Viewmodel(entrada);"],
  'apex-301': ['src/cf/borda.mjs', 'alvo.toString(), 308)', 'alvo.toString(), 301)'],
  'apex-sem-worker-first': ['src/cf/worker.ts', 'const apex = redirectDeHost(url);', 'const apex = null;'],
  'assets-sem-fallback': ['src/cf/worker.ts', 'const asset = env.ASSETS ? await env.ASSETS.fetch(request) : null;', 'const asset = null;'],
  'assets-intercepta-post': ['src/cf/worker.ts', 'return (prepararResposta(await astro.fetch(request, env, ctx), url.pathname)).saida;', 'return astro.fetch(request, env, ctx);'],
  'cache-ignora-etag': ['src/cf/worker.ts', "return etag && request.headers.get('if-none-match') === etag", 'return false'],
  'vm-sem-sha': ['src/cf/borda.mjs', 'if (sha256 !== entrada.sha256) {', 'if (false) {'],
  'cache-sem-stale': ['src/cf/worker.ts', 'if (agora <= staleAte) {', 'if (false) {'],
  'cache-revalida-condicional': ['src/cf/worker.ts', "headers.delete('if-none-match');", ''],
  'cache-preenche-condicional': ['src/cf/worker.ts', 'const nova = await produzir(new Request(request, { headers }), env, ctx, url);', 'const nova = await produzir(request, env, ctx, url);'],
  'cache-sem-single-flight': ['src/cf/worker.ts', 'const existente = OPERACOES_CACHE.get(chave);', 'const existente = undefined;'],
  'cache-sem-fill-flight': ['src/cf/worker.ts', 'const existente = OPERACOES_CACHE.get(chave);', 'const existente = undefined;'],
  'cache-aceita-legado': ['src/cf/worker.ts', 'if (frescoAte > 0) {', 'if (true) {'],
};
if (MUTANTE && !MUTACOES[MUTANTE]) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

let fonte = readFileSync(path.join(ROOT, 'src/cf/borda.mjs'), 'utf8');
let worker = readFileSync(path.join(ROOT, 'src/cf/worker.ts'), 'utf8');
const wrangler = readFileSync(path.join(ROOT, 'wrangler.prod.toml'), 'utf8');
if (MUTANTE) {
  const [arquivo, de, para] = MUTACOES[MUTANTE];
  let alvo = arquivo === 'src/cf/borda.mjs' ? fonte : worker;
  if (!alvo.includes(de)) { console.error(`mutante ${MUTANTE} não encontrou o trecho em ${arquivo}`); process.exit(2); }
  alvo = alvo.replace(de, para);
  if (arquivo === 'src/cf/borda.mjs') fonte = alvo;
  else worker = alvo;
}
const arquivo = path.join(mkdtempSync(path.join(tmpdir(), 'cf-borda-')), 'borda.mjs');
writeFileSync(arquivo, fonte);
const borda = await import(pathToFileURL(arquivo).href);

const falhas = [];
const check = (ok, id, msg) => { if (!ok) { falhas.push(id); console.log(`FAIL ${id} ${msg}`); } };
const silencioso = async (fn) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

// B1
const og = borda.politicaCache('public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
check(og.cliente === 'public, max-age=86400' && og.borda === 604800 && og.stale === 86400, 'B1', `og: ${JSON.stringify(og)}`);
const mapa = borda.politicaCache('public, max-age=0, s-maxage=300, stale-while-revalidate=900');
check(mapa.cliente === 'public, max-age=0' && mapa.borda === 300 && mapa.stale === 900, 'B1', `mapa: ${JSON.stringify(mapa)}`);
check(borda.politicaCache('no-store').cliente === 'no-store' && borda.politicaCache('').cliente === '', 'B1', 'sem s-maxage não muda');

// B2
check(borda.ttlBorda('/mapa', 'public, max-age=0, s-maxage=300') === 300, 'B2', 's-maxage vira TTL');
check(borda.ttlBorda('/private-assets/viewmodels/ak/ak-runtime.glb', 'public, max-age=31536000, immutable') === 31536000, 'B2', 'viewmodel immutable');
check(borda.ttlBorda('/private-assets/viewmodels/shared/x.glb', 'public, max-age=0, must-revalidate') === 0, 'B2', 'shared/ revalida');
check(borda.ttlBorda('/js/main.js', 'public, max-age=31536000, immutable') === 0, 'B2', 'asset fora do viewmodel não entra no cache do Worker');
check(borda.ttlBorda('/u/fulano', 'no-store') === 0, 'B2', 'no-store não guarda');

// B3
const manifesto = JSON.parse(readFileSync(path.join(ROOT, 'tools/viewmodels/vm-assets.manifest.json'), 'utf8'));
const corpo = new TextEncoder().encode('bytes-viewmodel-fixture');
const entrada = {
  path: 'fixture/fixture-runtime.glb',
  bytes: corpo.byteLength,
  sha256: createHash('sha256').update(corpo).digest('hex'),
  contentType: 'model/gltf-binary',
};
const indice = borda.indiceViewmodels({ files: [entrada] });
const bucket = (objetos) => ({
  get: async (k) => {
    const bytes = objetos.get(k);
    return bytes ? { size: bytes.byteLength, body: new Blob([bytes]).stream(), arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) } : null;
  },
  head: async (k) => {
    const bytes = objetos.get(k);
    return bytes ? { size: bytes.byteLength } : null;
  },
});
const cheio = bucket(new Map([[borda.chaveR2Viewmodel(entrada), corpo]]));
const url = `https://www.corosolto.com.br/private-assets/viewmodels/${entrada.path}?v=${entrada.sha256.slice(0, 10)}`;
const ok = await borda.viewmodelDoBucket(new Request(url), cheio, indice);
check(ok?.status === 200 && ok.headers.get('etag') === `"${entrada.sha256}"`
  && ok.headers.get('content-length') === String(entrada.bytes) && (await ok.arrayBuffer()).byteLength === entrada.bytes,
'B3', `GET ${entrada.path}: ${ok?.status} etag=${ok?.headers.get('etag')}`);
const head = await borda.viewmodelDoBucket(new Request(url, { method: 'HEAD' }), cheio, indice);
check(head?.status === 200 && head.body === null && head.headers.get('content-length') === String(entrada.bytes), 'B3', 'HEAD');
const r304 = await borda.viewmodelDoBucket(new Request(url, { headers: { 'if-none-match': `"${entrada.sha256}"` } }), cheio, indice);
check(r304?.status === 304, 'B3', `If-None-Match: ${r304?.status}`);
for (const [caso, req, b] of [
  ['fora do manifesto', new Request('https://x/private-assets/viewmodels/ak/inventado.glb'), cheio],
  ['fora do prefixo', new Request(`https://x/models/${entrada.path}`), cheio],
  ['travessia', new Request('https://x/private-assets/viewmodels/%2e%2e/%2e%2e/vercel.json'), cheio],
  ['POST', new Request(url, { method: 'POST' }), cheio],
  ['sem binding', new Request(url), undefined],
  ['objeto ausente', new Request(url), bucket(new Map())],
  ['tamanho errado', new Request(url), bucket(new Map([[borda.chaveR2Viewmodel(entrada), corpo.subarray(1)]]))],
  ['bytes errados com mesmo tamanho', new Request(url), bucket(new Map([[borda.chaveR2Viewmodel(entrada), new Uint8Array(corpo.byteLength)]]))],
  ['If-None-Match com objeto ausente', new Request(url, { headers: { 'if-none-match': `"${entrada.sha256}"` } }), bucket(new Map())],
  ['If-None-Match com tamanho errado', new Request(url, { headers: { 'if-none-match': `"${entrada.sha256}"` } }), bucket(new Map([[borda.chaveR2Viewmodel(entrada), corpo.subarray(1)]]))],
  ['If-None-Match com bytes errados', new Request(url, { headers: { 'if-none-match': `"${entrada.sha256}"` } }), bucket(new Map([[borda.chaveR2Viewmodel(entrada), new Uint8Array(corpo.byteLength)]]))],
]) {
  const r = await silencioso(() => borda.viewmodelDoBucket(req, b, indice));
  check(r === null, 'B3', `${caso}: esperado null (404 do Astro), veio ${r?.status}`);
}

// B4
const apex = borda.redirectDeHost(new URL('https://csbrasil.online/jogar/multiplayer?partida=1'));
check(apex?.status === 308 && apex.headers.get('location') === 'https://www.csbrasil.online/jogar/multiplayer?partida=1', 'B4', `apex: ${apex?.status} ${apex?.headers.get('location')}`);
// Estático fora do Worker (cada invocação é cobrada); o apex inteiro vai ao csb-apex pela rota.
check(/run_worker_first\s*=\s*\[\s*"\/"\s*,\s*"\/index\.html"\s*\]/.test(wrangler) && !/run_worker_first\s*=\s*true/.test(wrangler),
  'B4', 'csb-prod só roda antes dos assets na home; run_worker_first = true faz todo estático virar invocação');
const virada = readFileSync(path.join(ROOT, 'tools/cf/virada.sh'), 'utf8');
check(/"csbrasil\.online csbrasil\.online\/\* csb-apex"/.test(virada), 'B4', 'virada precisa ligar o apex no csb-apex');
const apexWorker = (await import(pathToFileURL(path.join(ROOT, 'tools/cf/apex/worker.mjs')).href)).default;
const apexResp = apexWorker.fetch(new Request('https://csbrasil.online/js/main.js?v=1'));
check(apexResp.status === 308 && apexResp.headers.get('location') === 'https://www.csbrasil.online/js/main.js?v=1',
  'B4', `csb-apex precisa mandar todo caminho do apex ao www: ${apexResp.status} ${apexResp.headers.get('location')}`);
check(borda.redirectDeHost(new URL('https://www.corosolto.com.br/')) === null, 'B4', 'www não redireciona');

// Integração real do entrypoint: o redirect do apex precisa acontecer antes de ASSETS,
// ASSETS precisa servir estáticos, e 404 do binding precisa cair no handler Astro.
const dirWorker = mkdtempSync(path.join(tmpdir(), 'cf-worker-'));
const bundleWorker = path.join(dirWorker, 'worker.mjs');
await build({
  stdin: {
    contents: worker,
    resolveDir: path.join(ROOT, 'src/cf'),
    sourcefile: 'worker.ts',
    loader: 'ts',
  },
  outfile: bundleWorker,
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node22',
  logLevel: 'silent',
  plugins: [{
    name: 'cf-fixtures',
    setup(esbuild) {
      esbuild.onResolve({ filter: /^@astrojs\/cloudflare\/entrypoints\/server$/ }, () => ({
        path: 'astro-stub',
        namespace: 'cf-borda',
      }));
      esbuild.onResolve({ filter: /vm-assets\.manifest\.json$/ }, () => ({
        path: 'vm-manifest',
        namespace: 'cf-borda',
      }));
      esbuild.onLoad({ filter: /^astro-stub$/, namespace: 'cf-borda' }, () => ({
        contents: "export default { fetch: async () => new Response('astro', { headers: { 'x-csb-source': 'astro' } }) };",
        loader: 'js',
      }));
      esbuild.onLoad({ filter: /^vm-manifest$/, namespace: 'cf-borda' }, () => ({
        contents: `export default ${JSON.stringify({ files: [entrada] })};`,
        loader: 'js',
      }));
    },
  }],
});
let cacheEntry = null;
let falhaCachePut = false;
const pendentes = [];
Object.defineProperty(globalThis, 'caches', {
  configurable: true,
  value: {
    default: {
      match: async () => cacheEntry?.clone(),
      put: async (_request, response) => {
        if (falhaCachePut) throw new Error('cache.put indisponível');
        cacheEntry = response.clone();
      },
      delete: async () => { cacheEntry = null; return true; },
    },
  },
});
const workerReal = (await import(pathToFileURL(bundleWorker).href)).default;
const ctx = { waitUntil(promise) { pendentes.push(promise); } };
let chamadasAssets = 0;
const assetsOk = {
  fetch: async () => {
    chamadasAssets++;
    return new Response('asset', { headers: { 'cache-control': 'public, max-age=60, s-maxage=60', 'x-csb-source': 'asset' } });
  },
};
const apexReal = await workerReal.fetch(
  new Request('https://csbrasil.online/jogar/multiplayer?partida=1'),
  { ASSETS: assetsOk },
  ctx,
);
check(apexReal.status === 308
  && apexReal.headers.get('location') === 'https://www.csbrasil.online/jogar/multiplayer?partida=1'
  && chamadasAssets === 0,
'B4', 'entrypoint precisa redirecionar apex antes de consultar ASSETS');
const assetReal = await workerReal.fetch(
  new Request('https://www.corosolto.com.br/mapa'),
  { ASSETS: assetsOk },
  ctx,
);
check(assetReal.headers.get('x-csb-source') === 'asset' && await assetReal.text() === 'asset',
  'B4', 'entrypoint precisa entregar resposta do binding ASSETS');
await Promise.all(pendentes.splice(0));
const assetCacheado = await workerReal.fetch(
  new Request('https://www.corosolto.com.br/mapa'),
  { ASSETS: { fetch: async () => { throw new Error('cache ignorado'); } } },
  ctx,
);
check(assetCacheado.status === 200
  && assetCacheado.headers.get('etag') === null
  && await assetCacheado.text() === 'asset',
'B4', 'GET cacheado sem ETag e sem If-None-Match precisa preservar status e corpo');
cacheEntry.headers.delete('x-csb-fresco-ate');
let chamadasLegado = 0;
const assetAposLegado = await workerReal.fetch(
  new Request('https://www.corosolto.com.br/mapa'),
  {
    ASSETS: {
      fetch: async () => {
        chamadasLegado++;
        return new Response('asset-renovado', {
          headers: { 'cache-control': 'public, max-age=60, s-maxage=60', 'x-csb-source': 'asset' },
        });
      },
    },
  },
  ctx,
);
check(chamadasLegado === 1 && await assetAposLegado.text() === 'asset-renovado',
  'B2', 'entrada legada sem metadado de frescor precisa ser invalidada e recarregada');
await Promise.all(pendentes.splice(0));
cacheEntry = null;
let chamadasPreenchimento = 0;
const liberaPreenchimentos = [];
const envPreenchimento = {
  ASSETS: {
    fetch: async () => {
      chamadasPreenchimento++;
      await new Promise((resolve) => liberaPreenchimentos.push(resolve));
      return new Response('cold-fill', {
        headers: { 'cache-control': 'public, max-age=0, s-maxage=60' },
      });
    },
  },
};
const coldA = workerReal.fetch(new Request('https://www.corosolto.com.br/mapa?cold=1'), envPreenchimento, ctx);
const coldB = workerReal.fetch(new Request('https://www.corosolto.com.br/mapa?cold=1'), envPreenchimento, ctx);
await new Promise((resolve) => setImmediate(resolve));
const chamadasAntesDeLiberar = chamadasPreenchimento;
for (const libera of liberaPreenchimentos) libera();
const [coldRespostaA, coldRespostaB] = await Promise.all([coldA, coldB]);
check(chamadasAntesDeLiberar === 1
  && await coldRespostaA.text() === 'cold-fill'
  && await coldRespostaB.text() === 'cold-fill',
'B2', `misses concorrentes precisam compartilhar preenchimento; chamadas=${chamadasAntesDeLiberar}`);
cacheEntry = null;
falhaCachePut = true;
const respostaSemCacheApi = await silencioso(() => workerReal.fetch(
  new Request('https://www.corosolto.com.br/mapa?cache-put-falha=1'),
  {
    ASSETS: {
      fetch: async () => new Response('origem-sem-cache', {
        headers: { 'cache-control': 'public, max-age=0, s-maxage=60' },
      }),
    },
  },
  ctx,
));
falhaCachePut = false;
check(respostaSemCacheApi.status === 200 && await respostaSemCacheApi.text() === 'origem-sem-cache',
  'B2', 'falha transitória do cache.put não pode derrubar a resposta válida da origem');
cacheEntry = null;
const swrRequest = new Request('https://www.corosolto.com.br/mapa?swr=1');
await workerReal.fetch(swrRequest, {
  ASSETS: { fetch: async () => new Response('stale-v1', {
    headers: { 'cache-control': 'public, max-age=0, s-maxage=1, stale-while-revalidate=30' },
  }) },
}, ctx);
await Promise.all(pendentes.splice(0));
cacheEntry.headers.set('x-csb-fresco-ate', String(Date.now() - 1));
cacheEntry.headers.set('x-csb-stale-ate', String(Date.now() + 30000));
const staleReal = await workerReal.fetch(swrRequest, {
  ASSETS: { fetch: async () => new Response('origem indisponível', { status: 503 }) },
}, ctx);
check(staleReal.status === 200 && await staleReal.text() === 'stale-v1',
  'B2', 'janela stale-while-revalidate precisa servir a cópia anterior durante falha da origem');
await Promise.all(pendentes.splice(0));
const liberaRevalidacoes = [];
let chamadasRevalidacao = 0;
const envRevalidacao = {
  ASSETS: {
    fetch: async (request) => {
      chamadasRevalidacao++;
      await new Promise((resolve) => liberaRevalidacoes.push(resolve));
      return request.headers.has('if-none-match')
        ? new Response(null, { status: 304 })
        : new Response('stale-v2', {
          headers: { 'cache-control': 'public, max-age=0, s-maxage=1, stale-while-revalidate=30' },
        });
    },
  },
};
const requestCondicional = new Request(swrRequest, { headers: { 'if-none-match': '"cliente-antigo"' } });
const respostasStale = Promise.all([
  workerReal.fetch(requestCondicional, envRevalidacao, ctx),
  workerReal.fetch(requestCondicional, envRevalidacao, ctx),
]);
if (MUTANTE === 'cache-sem-stale') {
  await new Promise((resolve) => setImmediate(resolve));
  for (const libera of liberaRevalidacoes) libera();
}
const [staleCondicionalA, staleCondicionalB] = await respostasStale;
check(staleCondicionalA.status === 200
  && staleCondicionalB.status === 200
  && await staleCondicionalA.text() === 'stale-v1'
  && await staleCondicionalB.text() === 'stale-v1'
  && chamadasRevalidacao === 1,
'B2', `hits stale concorrentes precisam compartilhar uma revalidação; chamadas=${chamadasRevalidacao}`);
cacheEntry.headers.set('x-csb-stale-ate', String(Date.now() - 1));
const expiradoEmVoo = workerReal.fetch(swrRequest, envRevalidacao, ctx);
await new Promise((resolve) => setImmediate(resolve));
const chamadasComExpirado = chamadasRevalidacao;
for (const libera of liberaRevalidacoes) libera();
const respostaExpirada = await expiradoEmVoo;
await Promise.all(pendentes.splice(0));
check(chamadasComExpirado === 1
  && respostaExpirada.status === 200
  && await respostaExpirada.text() === 'stale-v2',
'B2', `revalidação stale e fill expirado precisam compartilhar a operação; chamadas=${chamadasComExpirado}`);
const staleRevalidado = await workerReal.fetch(swrRequest, {
  ASSETS: { fetch: async () => { throw new Error('revalidação não atualizou o cache'); } },
}, ctx);
check(staleRevalidado.status === 200 && await staleRevalidado.text() === 'stale-v2',
  'B2', 'revalidação de stale precisa retirar condicionais do cliente e renovar a cópia');
cacheEntry = null;
const fallbackReal = await workerReal.fetch(
  new Request('https://www.corosolto.com.br/rota-astro'),
  { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } },
  ctx,
);
check(fallbackReal.headers.get('x-csb-source') === 'astro' && await fallbackReal.text() === 'astro',
  'B4', '404 de ASSETS precisa cair no handler Astro');
const chamadasAntesDoPost = chamadasAssets;
const postReal = await workerReal.fetch(
  new Request('https://csbrasil.online/discord', { method: 'POST' }),
  { ASSETS: assetsOk },
  ctx,
);
check(postReal.headers.get('x-csb-source') === 'astro'
  && postReal.headers.get('x-content-type-options') === 'nosniff'
  && await postReal.text() === 'astro'
  && chamadasAssets === chamadasAntesDoPost,
'B4', 'método de escrita precisa ir direto ao Astro, preservar headers e ignorar apex/redirect/ASSETS');

cacheEntry = null;
const [vmCondicionalFrio, vmPrimeiro] = await Promise.all([
  workerReal.fetch(
    new Request(url, { headers: { 'if-none-match': `"${entrada.sha256}"` } }),
    { PRIVADO: cheio },
    ctx,
  ),
  workerReal.fetch(new Request(url), { PRIVADO: cheio }, ctx),
]);
await Promise.all(pendentes.splice(0));
const vmCacheEtag = cacheEntry?.headers.get('etag');
const vmCondicional = await workerReal.fetch(
  new Request(url, { headers: { 'if-none-match': `"${entrada.sha256}"` } }),
  { PRIVADO: cheio },
  ctx,
);
check(vmPrimeiro.status === 200
  && vmPrimeiro.headers.get('etag') === `"${entrada.sha256}"`
  && vmCondicionalFrio.status === 304
  && vmCondicionalFrio.body === null
  && vmCacheEtag === `"${entrada.sha256}"`
  && vmCondicional.status === 304
  && vmCondicional.body === null
  && vmCondicional.headers.get('etag') === `"${entrada.sha256}"`,
'B3', `GET cacheado condicional: primeiro=${vmPrimeiro.status}/${vmPrimeiro.headers.get('etag')} cache=${vmCacheEtag} segundo=${vmCondicional.status}/${vmCondicional.headers.get('etag')}`);
// B5
const divergentes = manifesto.files.filter((f) => borda.chaveR2Viewmodel(f) !== blobPathOf(f));
check(!divergentes.length, 'B5', `${divergentes.length} chave(s) R2 ≠ Blob: ${divergentes.slice(0, 3).map((f) => f.path).join(', ')}`);

if (falhas.length) {
  console.log(`cf-borda${MUTANTE ? ` [mutante ${MUTANTE}]` : ''}: ${falhas.length} falha(s): ${[...new Set(falhas)].join(', ')}`);
  process.exit(1);
}
console.log(`cf-borda: B1–B5 ok (${manifesto.files.length} viewmodels no índice)`);
