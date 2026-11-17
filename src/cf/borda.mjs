// Peças do Worker (src/cf/worker.ts) que rodam iguais no workerd e no Node, para a régua
// tools/eval/cf-borda-check.mjs exercitar sem subir o wrangler.

export const PREFIXO_VM = '/private-assets/viewmodels/';
// Mesma chave do Vercel Blob (scripts/vm-assets.mjs: blobPathOf); o bucket R2 guarda a cópia.
const PREFIXO_R2_VM = 'viewmodels/sha256/';

// Domínio apex que a Vercel redirecionava (308) para o www pela config de domínio do projeto,
// fora do borda.json. Com a Worker Route no apex, o redirect passa a morar aqui.
const APEX_PARA_WWW = new Map([['csbrasil.online', 'www.csbrasil.online']]);

export function redirectDeHost(url) {
  const destino = APEX_PARA_WWW.get(url.hostname);
  if (!destino) return null;
  const alvo = new URL(url);
  alvo.hostname = destino;
  return Response.redirect(alvo.toString(), 308);
}

export const indiceViewmodels = (manifesto) => new Map(manifesto.files.map((f) => [f.path, f]));

export const chaveR2Viewmodel = (entrada) => `${PREFIXO_R2_VM}${entrada.sha256}${entrada.path.slice(entrada.path.lastIndexOf('.'))}`;

// Viewmodel privado servido do R2 pelo manifesto versionado; fora dele devolve null e cai no 404
// do Astro, e o jogo usa o legado (docs/runbooks/MIGRACAO-CLOUDFLARE.md, "Fases 3–4").
export async function viewmodelDoBucket(request, bucket, indice) {
  if (!bucket || (request.method !== 'GET' && request.method !== 'HEAD')) return null;
  const { pathname } = new URL(request.url);
  if (!pathname.startsWith(PREFIXO_VM)) return null;
  let caminho;
  try { caminho = decodeURIComponent(pathname.slice(PREFIXO_VM.length)); } catch { return null; }
  const entrada = indice.get(caminho);
  if (!entrada) return null;
  const etag = `"${entrada.sha256}"`;
  const headers = new Headers({ 'content-type': entrada.contentType, etag });
  const chave = chaveR2Viewmodel(entrada);
  const objeto = await bucket.get(chave);
  if (!objeto) {
    console.error(`[viewmodel] ausente no R2: ${chave} (${caminho})`);
    return null;
  }
  if (objeto.size !== entrada.bytes) {
    console.error(`[viewmodel] tamanho divergente no R2: ${chave} tem ${objeto.size}, manifesto ${entrada.bytes}`);
    return null;
  }
  const bytes = await objeto.arrayBuffer();
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  let sha256 = '';
  for (const byte of digest) sha256 += byte.toString(16).padStart(2, '0');
  if (sha256 !== entrada.sha256) {
    console.error(`[viewmodel] sha256 divergente no R2: ${chave} tem ${sha256}, manifesto ${entrada.sha256}`);
    return null;
  }
  if (request.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  headers.set('content-length', String(entrada.bytes));
  return new Response(request.method === 'HEAD' ? null : bytes, { status: 200, headers });
}

/* A Vercel consome `s-maxage` e `stale-while-revalidate` na CDN e tira os dois da resposta. Aqui o
   `s-maxage` vira o TTL do caches.default e o navegador recebe o resto, como antes. */
export function politicaCache(valor) {
  let borda = 0, stale = 0;
  const cliente = [];
  for (const diretiva of String(valor || '').split(',').map((d) => d.trim()).filter(Boolean)) {
    const s = /^s-maxage=(\d+)$/i.exec(diretiva);
    if (s) { borda = Number(s[1]); continue; }
    const swr = /^stale-while-revalidate=(\d+)$/i.exec(diretiva);
    if (swr) { stale = Number(swr[1]); continue; }
    cliente.push(diretiva);
  }
  return { borda, stale, cliente: cliente.join(', ') };
}

/* TTL de borda: o `s-maxage` da rota; viewmodel `immutable` (URL com ?v=<sha>) guarda pelo
   max-age, porque cada hit sem cache é uma leitura no R2. Nada mais é guardado. */
export function ttlBorda(pathname, valor) {
  const { borda, cliente } = politicaCache(valor);
  if (borda > 0) return borda;
  if (!pathname.startsWith(PREFIXO_VM) || !/\bimmutable\b/i.test(cliente)) return 0;
  const m = /\bmax-age=(\d+)/i.exec(cliente);
  return m ? Number(m[1]) : 0;
}
