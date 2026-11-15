#!/usr/bin/env node
/* RÉGUA da borda Cloudflare (src/cf/borda.mjs, usada por src/cf/worker.ts). Sem wrangler: o
   módulo roda igual no Node.
     B1  cache-control do navegador sai sem s-maxage/stale-while-revalidate (a Vercel tirava)
     B2  TTL de borda = s-maxage da rota; viewmodel immutable guarda pelo max-age; resto não guarda
     B3  viewmodel do R2: 200 com tamanho/ETag do manifesto, HEAD sem corpo, 304 pelo ETag, e
         null (cai no 404 do Astro) para caminho fora do manifesto, objeto ausente ou tamanho errado
     B4  csbrasil.online (apex) responde 308 para o www preservando caminho e query
     B5  a chave no R2 é a mesma do Blob (scripts/vm-assets.mjs blobPathOf) para todo o manifesto
   Mutantes (cada um tem de reprovar): sem-strip, vm-sem-etag, apex-301,
   apex-sem-worker-first, assets-sem-fallback, assets-intercepta-post. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { blobPathOf } from '../../scripts/vm-assets.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MUTANTE = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
const MUTACOES = {
  'sem-strip': ['src/cf/borda.mjs', "if (/^stale-while-revalidate=/i.test(diretiva)) continue;", ''],
  'vm-sem-etag': ['src/cf/borda.mjs', "const headers = new Headers({ 'content-type': entrada.contentType, etag });", "const headers = new Headers({ 'content-type': entrada.contentType });"],
  'apex-301': ['src/cf/borda.mjs', 'alvo.toString(), 308)', 'alvo.toString(), 301)'],
  'apex-sem-worker-first': ['src/cf/worker.ts', 'const apex = redirectDeHost(url);', 'const apex = null;'],
  'assets-sem-fallback': ['src/cf/worker.ts', 'const asset = env.ASSETS ? await env.ASSETS.fetch(request) : null;', 'const asset = null;'],
  'assets-intercepta-post': ['src/cf/worker.ts', "if (request.method !== 'GET' && request.method !== 'HEAD') return astro.fetch(request, env, ctx);", ''],
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
check(og.cliente === 'public, max-age=86400' && og.borda === 604800, 'B1', `og: ${JSON.stringify(og)}`);
const mapa = borda.politicaCache('public, max-age=0, s-maxage=300, stale-while-revalidate=900');
check(mapa.cliente === 'public, max-age=0' && mapa.borda === 300, 'B1', `mapa: ${JSON.stringify(mapa)}`);
check(borda.politicaCache('no-store').cliente === 'no-store' && borda.politicaCache('').cliente === '', 'B1', 'sem s-maxage não muda');

// B2
check(borda.ttlBorda('/mapa', 'public, max-age=0, s-maxage=300') === 300, 'B2', 's-maxage vira TTL');
check(borda.ttlBorda('/private-assets/viewmodels/ak/ak-runtime.glb', 'public, max-age=31536000, immutable') === 31536000, 'B2', 'viewmodel immutable');
check(borda.ttlBorda('/private-assets/viewmodels/shared/x.glb', 'public, max-age=0, must-revalidate') === 0, 'B2', 'shared/ revalida');
check(borda.ttlBorda('/js/main.js', 'public, max-age=31536000, immutable') === 0, 'B2', 'asset fora do viewmodel não entra no cache do Worker');
check(borda.ttlBorda('/u/fulano', 'no-store') === 0, 'B2', 'no-store não guarda');

// B3
const manifesto = JSON.parse(readFileSync(path.join(ROOT, 'tools/viewmodels/vm-assets.manifest.json'), 'utf8'));
const indice = borda.indiceViewmodels(manifesto);
const entrada = manifesto.files[0];
const corpo = new Uint8Array(entrada.bytes);
const bucket = (objetos) => ({
  get: async (k) => (objetos.has(k) ? { size: objetos.get(k), body: new Blob([corpo]).stream() } : null),
  head: async (k) => (objetos.has(k) ? { size: objetos.get(k) } : null),
});
const cheio = bucket(new Map([[borda.chaveR2Viewmodel(entrada), entrada.bytes]]));
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
  ['tamanho errado', new Request(url), bucket(new Map([[borda.chaveR2Viewmodel(entrada), entrada.bytes - 1]]))],
]) {
  const r = await silencioso(() => borda.viewmodelDoBucket(req, b, indice));
  check(r === null, 'B3', `${caso}: esperado null (404 do Astro), veio ${r?.status}`);
}

// B4
const apex = borda.redirectDeHost(new URL('https://csbrasil.online/jogar/multiplayer?partida=1'));
check(apex?.status === 308 && apex.headers.get('location') === 'https://www.csbrasil.online/jogar/multiplayer?partida=1', 'B4', `apex: ${apex?.status} ${apex?.headers.get('location')}`);
check(/run_worker_first\s*=\s*true/.test(wrangler), 'B4', 'apex precisa passar toda rota estática pelo redirect do Worker');
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
    name: 'astro-stub',
    setup(esbuild) {
      esbuild.onResolve({ filter: /^@astrojs\/cloudflare\/entrypoints\/server$/ }, () => ({
        path: 'astro-stub',
        namespace: 'cf-borda',
      }));
      esbuild.onLoad({ filter: /.*/, namespace: 'cf-borda' }, () => ({
        contents: "export default { fetch: async () => new Response('astro', { headers: { 'x-csb-source': 'astro' } }) };",
        loader: 'js',
      }));
    },
  }],
});
Object.defineProperty(globalThis, 'caches', {
  configurable: true,
  value: { default: { match: async () => undefined, put: async () => {} } },
});
const workerReal = (await import(pathToFileURL(bundleWorker).href)).default;
const ctx = { waitUntil() {} };
let chamadasAssets = 0;
const assetsOk = {
  fetch: async () => {
    chamadasAssets++;
    return new Response('asset', { headers: { 'x-csb-source': 'asset' } });
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
  new Request('https://www.corosolto.com.br/arquivo-estatico.txt'),
  { ASSETS: assetsOk },
  ctx,
);
check(assetReal.headers.get('x-csb-source') === 'asset' && await assetReal.text() === 'asset',
  'B4', 'entrypoint precisa entregar resposta do binding ASSETS');
const fallbackReal = await workerReal.fetch(
  new Request('https://www.corosolto.com.br/rota-astro'),
  { ASSETS: { fetch: async () => new Response(null, { status: 404 }) } },
  ctx,
);
check(fallbackReal.headers.get('x-csb-source') === 'astro' && await fallbackReal.text() === 'astro',
  'B4', '404 de ASSETS precisa cair no handler Astro');
const chamadasAntesDoPost = chamadasAssets;
const postReal = await workerReal.fetch(
  new Request('https://www.corosolto.com.br/api/conta', { method: 'POST' }),
  { ASSETS: assetsOk },
  ctx,
);
check(postReal.headers.get('x-csb-source') === 'astro'
  && await postReal.text() === 'astro'
  && chamadasAssets === chamadasAntesDoPost,
'B4', 'método de escrita precisa ir direto ao Astro sem consultar ASSETS');

// B5
const divergentes = manifesto.files.filter((f) => borda.chaveR2Viewmodel(f) !== blobPathOf(f));
check(!divergentes.length, 'B5', `${divergentes.length} chave(s) R2 ≠ Blob: ${divergentes.slice(0, 3).map((f) => f.path).join(', ')}`);

if (falhas.length) {
  console.log(`cf-borda${MUTANTE ? ` [mutante ${MUTANTE}]` : ''}: ${falhas.length} falha(s): ${[...new Set(falhas)].join(', ')}`);
  process.exit(1);
}
console.log(`cf-borda: B1–B5 ok (${manifesto.files.length} viewmodels no índice)`);
