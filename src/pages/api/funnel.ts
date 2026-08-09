// POST /api/funnel - etapa do funil de sessão (land/menu/match_start/match_end/quit).
// Ver supabase/migrations/017.
//
// A pergunta que responde: "dos que chegam, quantos CHEGAM A JOGAR e quantos
// TERMINAM?" O contador diário por etapa dá a conversão land→match_start→match_end.
// sendBeacon, fail-silent, anônimo (nem anonId é preciso - é só um contador).
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const STEPS = new Set(['land', 'menu', 'match_start', 'match_end', 'quit']);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'funnel', ip, 30, 60)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const step = typeof body?.step === 'string' ? body.step : '';
  if (!STEPS.has(step)) return json({ error: 'bad_step' }, 400);

  try {
    const { error } = await supabaseAdmin.rpc('track_funnel', { p_step: step });
    if (error) return json({ ok: true, stored: false });
  } catch {
    return json({ ok: true, stored: false });
  }
  return json({ ok: true, stored: true });
};
