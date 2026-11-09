// Server-side Supabase client - a SERVICE_ROLE key fica SÓ aqui (env de
// runtime), nunca no browser. Sem envs configuradas, os endpoints devolvem 503.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { envRuntime } from './env-runtime';

// Cliente lido na PRIMEIRA chamada, não no load do módulo: o segredo vem de
// process.env no runtime (Vercel/Workers), nunca inlinado pelo import.meta.env.
let cliente: SupabaseClient | null | undefined;

export function supabaseAdmin(): SupabaseClient | null {
  if (cliente === undefined) {
    const url = envRuntime('SUPABASE_URL');
    const key = envRuntime('SUPABASE_SERVICE_ROLE_KEY');
    cliente = url && key ? createClient(url, key, { auth: { persistSession: false }, global: { fetch: fetchTimeout } }) : null;
  }
  return cliente;
}

// fetch com TIMEOUT. Sem isto, um Supabase lento/fora pendura o await do lambda
// até o teto de 300s da Vercel -> 504 (incidente 13/08 em /api/presence e
// /api/funnel). Aborta em DB_TIMEOUT_MS; o try/catch fail-open de cada rota vira
// resposta rápida (503/ok) em vez de 504-after-300s. Default 8s cobre o p95 real.
const fetchTimeout: typeof fetch = (input, init) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Number(envRuntime('DB_TIMEOUT_MS')) || 8000);
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
};

export const NOT_CONFIGURED = JSON.stringify({
  error: 'not_configured',
  message: 'Ranking global ainda não configurado (defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).',
});
