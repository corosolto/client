// GET /api/leaderboard — ranking global (top 100) via service key no servidor.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { json, jsonError } from '../../lib/http';

export const prerender = false;

export const GET: APIRoute = async () => {
  if (!supabaseAdmin) return json(NOT_CONFIGURED, 503);
  const { data, error } = await supabaseAdmin.from('leaderboard').select('*');
  if (error) return jsonError(error.message, 500);
  return json({ players: data }, 200, { 'cache-control': 'public, max-age=30' });
};
