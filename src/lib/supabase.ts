// Server-side Supabase client — a SERVICE_ROLE key fica SÓ aqui (env var da
// Vercel), nunca no browser. Sem envs configuradas, os endpoints devolvem 503.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.SUPABASE_URL;
const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

// objeto (não string): quem responde é o json() de lib/http
export const NOT_CONFIGURED = {
  error: 'not_configured',
  message: 'Ranking global ainda não configurado (defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).',
};
