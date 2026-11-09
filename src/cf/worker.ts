// Entrada do Worker (wrangler.toml `main`): embrulha o handler do @astrojs/cloudflare para aplicar
// o que `_headers`/`_redirects` não cobrem (redirect por query e headers de resposta SSR).
import astro from '@astrojs/cloudflare/entrypoints/server';
import vercelJson from '../../vercel.json';
import { compilarHeader, compilarRedirect, headersPara, redirectPara } from '../lib/regras-vercel.mjs';

const REDIRECTS = vercelJson.redirects.map(compilarRedirect);
const HEADERS = vercelJson.headers.map(compilarHeader);

// Default da Vercel em resposta SSR sem cache-control; mantido para a CDN se comportar igual.
const CACHE_PADRAO = 'public, max-age=0, must-revalidate';

// workerd entrega [vars] e secrets no binding `env` do fetch; `process.env` nasce
// vazio (o banner do adaptador só cria o stub). Copiando aqui, todo o SSR lê
// process.env pela envRuntime em qualquer borda. Só string: bindings de serviço
// (ASSETS etc.) não são env.
const ponteEnv = (env: unknown) => {
  const proc = (globalThis.process ??= { env: {} }) as { env: Record<string, string | undefined> };
  const alvo = proc.env ??= {};
  for (const [chave, valor] of Object.entries(env as Record<string, unknown>))
    if (typeof valor === 'string' && !(chave in alvo)) alvo[chave] = valor;
};

export default {
  async fetch(request: Request, env: unknown, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(request.url);
    ponteEnv(env);
    const redirect = redirectPara(REDIRECTS, url);
    const resposta = redirect
      ? Response.redirect(new URL(redirect.destino, url).toString(), redirect.status)
      : await astro.fetch(request, env, ctx);
    // `set`, não `append`: o asset binding já aplicou `_headers`; repetir a chave é idempotente.
    const saida = new Response(resposta.body, resposta);
    for (const [chave, valor] of headersPara(HEADERS, url.pathname)) saida.headers.set(chave, valor);
    if (!saida.headers.has('cache-control')) saida.headers.set('cache-control', CACHE_PADRAO);
    return saida;
  },
};
