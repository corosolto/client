// Env de RUNTIME para código de servidor: process.env primeiro (Vercel functions;
// Workers nodejs_compat com [vars] e `wrangler secret put`).

// Nunca cai para import.meta.env em segredo: o Astro INLINA
// import.meta.env.<SEGREDO> no bundle no momento do build.
const FALLBACK_PUBLIC: Record<string, string | undefined> = {
  // Fallback estático só para PUBLIC_* (público por definição), por nome:
  // referência ao objeto inteiro embutiria os segredos do build no chunk SSR.
  PUBLIC_API_BASE: import.meta.env.PUBLIC_API_BASE,
};

// Base do backend lida por chamada (PUBLIC_API_BASE é [vars] no Workers); mesmo
// default que as rotas usavam quando a env não está configurada.
export const backendUrl = () => envRuntime('PUBLIC_API_BASE') || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';

// Vazio conta como não configurado (mesma semântica do `||` que existia nas rotas).
export function envRuntime(name: string): string | undefined {
  const direto = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (direto !== undefined && direto !== '') return direto;
  return name.startsWith('PUBLIC_') ? FALLBACK_PUBLIC[name] : undefined;
}
