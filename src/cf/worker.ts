// Entrada do Worker (wrangler.toml `main`): embrulha o handler do @astrojs/cloudflare para aplicar
// o que `_headers`/`_redirects` não cobrem (redirect por query e headers de resposta SSR), servir o
// viewmodel privado do R2 e guardar no caches.default o que a rota marca com `s-maxage`.
import astro from '@astrojs/cloudflare/entrypoints/server';
import vercelJson from '../../vercel.json';
import manifestoVm from '../../tools/viewmodels/vm-assets.manifest.json';
import { compilarHeader, compilarRedirect, headersPara, redirectPara } from '../lib/regras-vercel.mjs';
import { indiceViewmodels, politicaCache, redirectDeHost, ttlBorda, viewmodelDoBucket } from './borda.mjs';

const REDIRECTS = vercelJson.redirects.map(compilarRedirect);
const HEADERS = vercelJson.headers.map(compilarHeader);
const VIEWMODELS = indiceViewmodels(manifestoVm);

// Default da Vercel em resposta SSR sem cache-control; mantido para a CDN se comportar igual.
const CACHE_PADRAO = 'public, max-age=0, must-revalidate';
// A cópia no caches.default leva o TTL de borda no cache-control; o do navegador viaja aqui.
const CC_CLIENTE = 'x-csb-cc';

type R2Objeto = { size: number; body?: ReadableStream };
type Env = { PRIVADO?: { get(chave: string): Promise<R2Objeto | null>; head(chave: string): Promise<R2Objeto | null> } };
// lib.dom não conhece `caches.default` (extensão do workerd) e o projeto não carrega @cloudflare/workers-types.
const cacheDaBorda = caches as CacheStorage & { default: Cache };
type Ctx = { waitUntil(p: Promise<unknown>): void };

// workerd entrega [vars] e secrets no binding `env`; process.env nasce vazio
// (stub do adaptador). A ponte copia as strings para process.env em cada fetch.
const ponteEnv = (env: unknown) => {
  const proc = (globalThis.process ??= { env: {} }) as { env: Record<string, string | undefined> };
  const alvo = proc.env ??= {};
  for (const [chave, valor] of Object.entries(env as Record<string, unknown>))
    if (typeof valor === 'string' && !(chave in alvo)) alvo[chave] = valor;
};

const doCache = (guardada: Response) => {
  const saida = new Response(guardada.body, guardada);
  saida.headers.set('cache-control', saida.headers.get(CC_CLIENTE) || CACHE_PADRAO);
  saida.headers.delete(CC_CLIENTE);
  return saida;
};

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    ponteEnv(env);
    const apex = redirectDeHost(url);
    if (apex) return apex;
    const cache = request.method === 'GET' ? cacheDaBorda.default : null;
    const hit = cache ? await cache.match(request) : undefined;
    if (hit) return doCache(hit);

    const redirect = redirectPara(REDIRECTS, url);
    const resposta = redirect
      ? Response.redirect(new URL(redirect.destino, url).toString(), redirect.status)
      : (await viewmodelDoBucket(request, env.PRIVADO, VIEWMODELS)) ?? (await astro.fetch(request, env, ctx));
    // `set`, não `append`: o asset binding já aplicou `_headers`; repetir a chave é idempotente.
    const saida = new Response(resposta.body, resposta);
    for (const [chave, valor] of headersPara(HEADERS, url.pathname)) saida.headers.set(chave, valor);
    const cc = saida.headers.get('cache-control') || CACHE_PADRAO;
    const cliente = politicaCache(cc).cliente || CACHE_PADRAO;
    saida.headers.set('cache-control', cliente);

    const ttl = ttlBorda(url.pathname, cc);
    if (cache && ttl > 0 && saida.status === 200 && !saida.headers.has('set-cookie')) {
      const guardada = new Response(saida.clone().body, saida);
      guardada.headers.set('cache-control', `public, max-age=${ttl}`);
      guardada.headers.set(CC_CLIENTE, cliente);
      ctx.waitUntil(cache.put(request, guardada));
    }
    return saida;
  },
};
