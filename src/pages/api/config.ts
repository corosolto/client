// GET /api/config — expõe URL + anon key do Supabase (públicas por design;
// a segurança é o RLS). O client usa pra ligar OAuth/storage.
import type { APIRoute } from 'astro';
import { json, jsonError } from '../../lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  const url = import.meta.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return jsonError('not_configured', 503);
  return json({ url, anonKey }, 200, { 'cache-control': 'public, max-age=3600' });
};
