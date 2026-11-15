// Entrada do Worker (wrangler.toml `main`): embrulha o handler do @astrojs/cloudflare para aplicar
// o que `_headers`/`_redirects` não cobrem (redirect por query e headers de resposta SSR), servir o
// viewmodel privado do R2 e guardar no caches.default o que a rota marca com `s-maxage`.
import astro from '@astrojs/cloudflare/entrypoints/server';
import vercelJson from '../../vercel.json';
import manifestoVm from '../../tools/viewmodels/vm-assets.manifest.json';
import { compilarHeader, compilarRedirect, headersPara, redirectPara } from '../lib/regras-vercel.mjs';
import { PREFIXO_VM, indiceViewmodels, politicaCache, redirectDeHost, ttlBorda, viewmodelDoBucket } from './borda.mjs';

const REDIRECTS = vercelJson.redirects.map(compilarRedirect);
const HEADERS = vercelJson.headers.map(compilarHeader);
const VIEWMODELS = indiceViewmodels(manifestoVm);

// Default da Vercel em resposta SSR sem cache-control; mantido para a CDN se comportar igual.
const CACHE_PADRAO = 'public, max-age=0, must-revalidate';
// A cópia no caches.default leva a janela total; os metadados internos separam
// frescor de stale-while-revalidate e o cache-control do navegador viaja em CC_CLIENTE.
const CC_CLIENTE = 'x-csb-cc';
const CC_FRESCO_ATE = 'x-csb-fresco-ate';
const CC_STALE_ATE = 'x-csb-stale-ate';

type R2Objeto = { size: number; body?: ReadableStream; arrayBuffer(): Promise<ArrayBuffer> };
type Assets = { fetch(request: Request): Promise<Response> };
type Env = {
  ASSETS?: Assets;
  PRIVADO?: { get(chave: string): Promise<R2Objeto | null> };
};
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
  saida.headers.delete(CC_FRESCO_ATE);
  saida.headers.delete(CC_STALE_ATE);
  return saida;
};
const respostaDoSite = async (request: Request, env: Env, ctx: Ctx) => {
  const asset = env.ASSETS ? await env.ASSETS.fetch(request) : null;
  return asset && asset.status !== 404 ? asset : astro.fetch(request, env, ctx);
};
const responderCondicional = (saida: Response, request: Request) => {
  const etag = saida.headers.get('etag');
  return etag && request.headers.get('if-none-match') === etag
    ? new Response(null, { status: 304, headers: saida.headers })
    : saida;
};
const responderCache = (guardada: Response, request: Request) =>
  responderCondicional(doCache(guardada), request);
const prepararResposta = (resposta: Response, pathname: string) => {
  // `set`, não `append`: o asset binding já aplicou `_headers`; repetir a chave é idempotente.
  const saida = new Response(resposta.body, resposta);
  for (const [chave, valor] of headersPara(HEADERS, pathname)) saida.headers.set(chave, valor);
  const cc = saida.headers.get('cache-control') || CACHE_PADRAO;
  const politica = politicaCache(cc);
  const cliente = politica.cliente || CACHE_PADRAO;
  saida.headers.set('cache-control', cliente);
  return { saida, cliente, ttl: ttlBorda(pathname, cc), stale: politica.stale };
};
const produzir = async (request: Request, env: Env, ctx: Ctx, url: URL) => {
  const redirect = redirectPara(REDIRECTS, url);
  const resposta = redirect
    ? Response.redirect(new URL(redirect.destino, url).toString(), redirect.status)
    : (await viewmodelDoBucket(request, env.PRIVADO, VIEWMODELS)) ?? (await respostaDoSite(request, env, ctx));
  return prepararResposta(resposta, url.pathname);
};
type Produzida = { saida: Response; cliente: string; ttl: number; stale: number };
const OPERACOES_CACHE = new Map<string, Promise<Produzida>>();
const rotaTemCache = (pathname: string) =>
  pathname === '/mapa' || pathname.startsWith('/api/og/') || pathname.startsWith(PREFIXO_VM);
const podeGuardar = (saida: Response, ttl: number) =>
  ttl > 0 && saida.status === 200 && !saida.headers.has('set-cookie');
const guardar = async (cache: Cache, request: Request, saida: Response, cliente: string, ttl: number, stale: number) => {
  const guardada = new Response(saida.clone().body, saida);
  const frescoAte = Date.now() + ttl * 1000;
  guardada.headers.set('cache-control', `public, max-age=${ttl + stale}`);
  guardada.headers.set(CC_CLIENTE, cliente);
  guardada.headers.set(CC_FRESCO_ATE, String(frescoAte));
  guardada.headers.set(CC_STALE_ATE, String(frescoAte + stale * 1000));
  await cache.put(request, guardada);
};
const produzirParaCache = async (cache: Cache, request: Request, env: Env, ctx: Ctx, url: URL) => {
  const headers = new Headers(request.headers);
  headers.delete('if-none-match');
  headers.delete('if-modified-since');
  const nova = await produzir(new Request(request, { headers }), env, ctx, url);
  if (podeGuardar(nova.saida, nova.ttl)) {
    try {
      await guardar(cache, request, nova.saida, nova.cliente, nova.ttl, nova.stale);
    } catch (error) {
      console.error(`[cache] gravação falhou para ${url.pathname}:`, error);
    }
  }
  return nova;
};
const operacaoCache = (cache: Cache, request: Request, env: Env, ctx: Ctx, url: URL) => {
  const chave = request.url;
  const existente = OPERACOES_CACHE.get(chave);
  if (existente) return existente;
  const trabalho = produzirParaCache(cache, request, env, ctx, url);
  OPERACOES_CACHE.set(chave, trabalho);
  const limpar = () => {
    if (OPERACOES_CACHE.get(chave) === trabalho) OPERACOES_CACHE.delete(chave);
  };
  void trabalho.then(limpar, limpar);
  return trabalho;
};
const revalidarUmaVez = async (cache: Cache, request: Request, env: Env, ctx: Ctx, url: URL) => {
  try {
    await operacaoCache(cache, request, env, ctx, url);
  } catch (error) {
    console.error(`[cache] revalidação falhou para ${url.pathname}:`, error);
  }
};
const preencherUmaVez = async (cache: Cache, request: Request, env: Env, ctx: Ctx, url: URL) => {
  const nova = await operacaoCache(cache, request, env, ctx, url);
  return { ...nova, saida: nova.saida.clone() };
};

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    ponteEnv(env);
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return (prepararResposta(await astro.fetch(request, env, ctx), url.pathname)).saida;
    const apex = redirectDeHost(url);
    if (apex) return apex;
    const cache = request.method === 'GET' ? cacheDaBorda.default : null;
    const hit = cache ? await cache.match(request) : undefined;
    if (hit) {
      const agora = Date.now();
      const frescoAte = Number(hit.headers.get(CC_FRESCO_ATE)) || 0;
      if (frescoAte > 0) {
        if (agora <= frescoAte) return responderCache(hit, request);
        const staleAte = Number(hit.headers.get(CC_STALE_ATE)) || 0;
        if (agora <= staleAte) {
          ctx.waitUntil(revalidarUmaVez(cache, request, env, ctx, url));
          return responderCache(hit, request);
        }
      }
    }
    if (cache && rotaTemCache(url.pathname))
      return responderCondicional((await preencherUmaVez(cache, request, env, ctx, url)).saida, request);
    return (await produzir(request, env, ctx, url)).saida;
  },
};
