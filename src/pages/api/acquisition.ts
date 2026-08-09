// POST /api/acquisition - de onde veio o jogador (referrer, UTM, código de referência).
// Ver supabase/migrations/019.
//
// Capturado UMA vez por anon_id (o cliente usa flag de localStorage). A 1ª
// aquisição é a que vale (first-touch-wins): quem volta por outro canal outro
// dia não reescreve a origem original. referrer é só o HOST (não a URL cheia,
// que poderia carregar query sensível). Anônimo, sem IP, fail-silent.
//
// É o motor de crescimento orgânico: ?ref=SEU_CODE atribui jogadores a quem
// indicou, e o painel mostra "quem trouxe quantos".
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/* referrer só interessa como HOST. URL inteira pode carregar query (tokens,
   nicks em /u/*) - host basta pra "veio do reddit" e não vaza nada. */
function hostDe(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || !url) return null;
  try { return new URL(url).host || null; } catch { return null; }
}

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'acquisition', ip, 10, 60)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const anonId = typeof body?.anonId === 'string' ? body.anonId : '';
  if (!UUID_RE.test(anonId)) return json({ error: 'bad_anon_id' }, 400);

  const str = (v: unknown, max: number) => typeof v === 'string' ? v.slice(0, max) : null;

  try {
    const { error } = await supabaseAdmin.rpc('track_acquisition', {
      p_anon_id: anonId,
      p_referrer: hostDe(body.referrer) ?? str(body.referrer, 120),
      p_utm_source: str(body.utmSource, 60), p_utm_medium: str(body.utmMedium, 60),
      p_utm_campaign: str(body.utmCampaign, 60), p_ref_code: str(body.ref, 32),
      p_landing: str(body.landing, 60),
    });
    if (error) return json({ ok: true, stored: false });
  } catch {
    return json({ ok: true, stored: false });
  }
  return json({ ok: true, stored: true });
};
