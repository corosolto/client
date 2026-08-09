// POST /api/heartbeat - presença "online agora" com geo aproximado (cidade).
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { geoFrom } from '../../lib/geo';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  // Esta rota NÃO tinha limite nenhum e faz uma query + um upsert por chamada.
  // 30/min por IP é folgado pro heartbeat real (o cliente manda 1 a cada ~60 s)
  // e corta o loop automatizado. Ver src/lib/ratelimit.ts.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'heartbeat', ip, 30, 60)))
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } });

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { nick, token } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string')
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const { data: player } = await supabaseAdmin
    .from('players').select('nick').eq('nick', nick.slice(0, 14)).eq('token', token).maybeSingle();
  if (!player)
    return new Response(JSON.stringify({ error: 'token inválido' }), { status: 403, headers: { 'content-type': 'application/json' } });

  const g = geoFrom(request);
  await supabaseAdmin.from('presence').upsert({
    nick: player.nick, last_seen: new Date().toISOString(),
    city: g?.city ?? null, country: g?.country ?? null, lat: g?.lat ?? null, lon: g?.lon ?? null,
  });
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
