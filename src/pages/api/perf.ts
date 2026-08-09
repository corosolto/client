// POST /api/perf - amostra de performance do cliente (FPS, boot, dispositivo).
// Ver supabase/migrations/018.
//
// UMA amostra por sessão (depois do boot), não por frame. Responde "quantos
// jogam abaixo de 30 FPS?" e "quanto demora o boot frio pra quem não é o dev?"
// - requisito declarado do dono (máquina fraca). O js_error pega crash; isto
// pega engasgo. Anônimo, sem IP, fail-silent.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const num = (v: unknown, max: number) => Number.isFinite(+v) ? Math.max(0, Math.min(max, Math.round(+v))) : null;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'perf', ip, 10, 60)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const anonId = typeof body?.anonId === 'string' ? body.anonId : '';
  if (!UUID_RE.test(anonId)) return json({ error: 'bad_anon_id' }, 400);

  try {
    const { error } = await supabaseAdmin.rpc('track_perf', {
      p_anon_id: anonId,
      p_version: typeof body.version === 'string' ? body.version.slice(0, 40) : null,
      p_fps: num(body.fps, 240), p_boot_ms: num(body.bootMs, 60000), p_load_ms: num(body.loadMs, 60000),
      p_cores: num(body.cores, 128), p_memory_gb: Number.isFinite(+body.memoryGb) ? +body.memoryGb : null,
      p_renderer: typeof body.renderer === 'string' ? body.renderer.slice(0, 80) : null,
      p_dpr: Number.isFinite(+body.dpr) ? +body.dpr : null,
      p_vw: num(body.vw, 9999), p_vh: num(body.vh, 99999),
      p_connection: typeof body.connection === 'string' ? body.connection.slice(0, 8) : null,
      p_quality: typeof body.quality === 'string' ? body.quality.slice(0, 8) : null,
    });
    if (error) return json({ ok: true, stored: false });
  } catch {
    return json({ ok: true, stored: false });
  }
  return json({ ok: true, stored: true });
};
