// POST /api/heartbeat — presença "online agora" com geo aproximado (cidade).
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { geoFrom } from '../../lib/geo';
import { json, jsonError } from '../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return json(NOT_CONFIGURED, 503);
  let body: any;
  try { body = await request.json(); } catch { return jsonError('bad_json', 400); }
  const { nick, token } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string') return jsonError('missing_fields', 400);

  const { data: player } = await supabaseAdmin
    .from('players').select('nick').eq('nick', nick.slice(0, 14)).eq('token', token).maybeSingle();
  if (!player) return jsonError('token inválido', 403);

  const g = geoFrom(request);
  await supabaseAdmin.from('presence').upsert({
    nick: player.nick, last_seen: new Date().toISOString(),
    city: g?.city ?? null, country: g?.country ?? null, lat: g?.lat ?? null, lon: g?.lon ?? null,
  });
  return json({ ok: true });
};
