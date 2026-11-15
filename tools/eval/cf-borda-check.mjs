#!/usr/bin/env node
/* RÉGUA da borda Cloudflare (src/cf/borda.mjs, usada por src/cf/worker.ts). Sem wrangler: o
   módulo roda igual no Node.
     B1  cache-control do navegador sai sem s-maxage/stale-while-revalidate (a Vercel tirava)
     B2  TTL de borda = s-maxage da rota; viewmodel immutable guarda pelo max-age; resto não guarda
     B3  viewmodel do R2: 200 com tamanho/ETag do manifesto, HEAD sem corpo, 304 pelo ETag, e
         null (cai no 404 do Astro) para caminho fora do manifesto, objeto ausente ou tamanho errado
     B4  csbrasil.online (apex) responde 308 para o www preservando caminho e query
     B5  a chave no R2 é a mesma do Blob (scripts/vm-assets.mjs blobPathOf) para todo o manifesto
   Mutantes (cada um tem de reprovar): sem-strip, vm-sem-etag, apex-301, apex-sem-worker-first. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { blobPathOf } from '../../scripts/vm-assets.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const MUTANTE = process.argv.find((a) => a.startsWith('--mutante='))?.slice(10) || '';
const MUTACOES = {
  'sem-strip': ['src/cf/borda.mjs', "if (/^stale-while-revalidate=/i.test(diretiva)) continue;", ''],
  'vm-sem-etag': ['src/cf/borda.mjs', "const headers = new Headers({ 'content-type': entrada.contentType, etag });", "const headers = new Headers({ 'content-type': entrada.contentType });"],
  'apex-301': ['src/cf/borda.mjs', 'alvo.toString(), 308)', 'alvo.toString(), 301)'],
  'apex-sem-worker-first': ['wrangler.prod.toml', 'run_worker_first = true', 'run_worker_first = ["/", "/index.html"]'],
};
if (MUTANTE && !MUTACOES[MUTANTE]) { console.error(`mutante desconhecido: ${MUTANTE}`); process.exit(2); }

let fonte = readFileSync(path.join(ROOT, 'src/cf/borda.mjs'), 'utf8');
let wrangler = readFileSync(path.join(ROOT, 'wrangler.prod.toml'), 'utf8');
if (MUTANTE) {
  const [arquivo, de, para] = MUTACOES[MUTANTE];
  const alvo = arquivo === 'src/cf/borda.mjs' ? fonte : wrangler;
  if (!alvo.includes(de)) { console.error(`mutante ${MUTANTE} não encontrou o trecho em ${arquivo}`); process.exit(2); }
  if (arquivo === 'src/cf/borda.mjs') fonte = fonte.replace(de, para);
  else wrangler = wrangler.replace(de, para);
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

// B5
const divergentes = manifesto.files.filter((f) => borda.chaveR2Viewmodel(f) !== blobPathOf(f));
check(!divergentes.length, 'B5', `${divergentes.length} chave(s) R2 ≠ Blob: ${divergentes.slice(0, 3).map((f) => f.path).join(', ')}`);

if (falhas.length) {
  console.log(`cf-borda${MUTANTE ? ` [mutante ${MUTANTE}]` : ''}: ${falhas.length} falha(s): ${[...new Set(falhas)].join(', ')}`);
  process.exit(1);
}
console.log(`cf-borda: B1–B5 ok (${manifesto.files.length} viewmodels no índice)`);
