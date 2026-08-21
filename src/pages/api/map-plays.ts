// GET /api/map-plays - soma por mapa do contador que o /api/pick alimenta (picks_daily,
// kind='mapa'). Colunas em PORTUGUÊS e RLS fechada: só service_role alcança.
import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const JANELA_DIAS = 365;   // "total" na prática: a tabela nasceu em 06/08/2026

const resposta = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // o número muda devagar e a tela abre muito: quase todo o tráfego morre na borda
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=900',
    },
  });

export const GET: APIRoute = async ({ request }) => {
  // a tela de mapas ordena por este número: falha aqui NUNCA pode derrubar a escolha
  if (!supabaseAdmin) return resposta({ plays: {} });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'map-plays', ip, 60, 60))) return resposta({ plays: {} }, 429);

  const desde = new Date(Date.now() - JANELA_DIAS * 864e5).toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from('picks_daily')
    .select('key, n')
    .eq('kind', 'mapa')
    .gte('dia', desde);
  if (error) {
    console.error('[api/map-plays]', { error: error.message });
    return resposta({ plays: {} });
  }

  const plays: Record<string, number> = {};
  for (const linha of (data ?? []) as Array<{ key: string; n: number }>) {
    if (typeof linha?.key !== 'string') continue;
    plays[linha.key] = (plays[linha.key] || 0) + (Number(linha.n) || 0);
  }
  return resposta({ plays });
};
