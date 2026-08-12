// GET /api/health - banco e frescor da ingestão, sem contagens/timestamps exatos.
// O detalhe permanece privado em telemetry_ingest_health.
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

const LIMITES_SEGUNDOS: Record<string, number> = {
  presence: 30 * 60,
  funnel: 6 * 3600,
  acquisition: 24 * 3600,
  perf: 24 * 3600,
  telemetry: 24 * 3600,
  match: 24 * 3600,
  city: 24 * 3600,
  picks: 24 * 3600,
};

const resposta = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
    },
  });

export const GET: APIRoute = async () => {
  if (!supabaseAdmin) return resposta({ ok: false, database: false, reason: 'not_configured' }, 503);

  const { data, error } = await supabaseAdmin
    .from('telemetry_ingest_health')
    .select('pipeline, last_success_at');
  if (error) {
    console.error('[api/health]', { error });
    return resposta({ ok: false, database: false, telemetrySchema: false }, 503);
  }

  const agora = Date.now();
  const porPipeline = new Map(
    (data ?? []).map((row: { pipeline: string; last_success_at: string | null }) => [row.pipeline, row.last_success_at]),
  );
  const missing = Object.keys(LIMITES_SEGUNDOS).filter((pipeline) => !porPipeline.has(pipeline));
  const stale = Object.entries(LIMITES_SEGUNDOS)
    .filter(([pipeline, limite]) => {
      const iso = porPipeline.get(pipeline);
      return iso != null && agora - new Date(iso).getTime() > limite * 1000;
    })
    .map(([pipeline]) => pipeline);
  const never = Object.keys(LIMITES_SEGUNDOS).filter((pipeline) => porPipeline.get(pipeline) == null);

  return resposta(
    {
      ok: missing.length === 0,
      database: true,
      telemetrySchema: missing.length === 0,
      fresh: stale.length === 0 && never.length === 0,
      stale,
      never,
    },
    missing.length === 0 ? 200 : 503,
  );
};
