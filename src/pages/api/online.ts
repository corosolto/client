// GET /api/online - quantos jogadores "online agora" (heartbeat nos últimos 2 min).
// Lê a VIEW public.online_now (schema.sql), que já filtra por janela. Cache curto de
// borda: o número é social proof do rodapé do menu, não telemetria - 30 s de atraso
// é invisível e corta o QPS no Postgres.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  /* ── ESTA GUARDA ESTAVA SEMPRE VERDADEIRA (achado 07/08) ────────────────────
     Era `if (NOT_CONFIGURED)`. Mas `NOT_CONFIGURED` não é booleano: é o CORPO da
     resposta 503, `JSON.stringify({...})` (src/lib/supabase.ts:11) - string não
     vazia, logo sempre truthy. A rota devolvia `{"online": null}` incondicionalmente
     e **nunca chegava a consultar o banco**. Com Supabase configurado ou não, o
     rodapé escondia o contador, e o `try/catch` lá embaixo - que eu cheguei a
     acusar - nunca rodou uma vez sequer.
     Todas as outras rotas usam `NOT_CONFIGURED` como corpo e testam `!supabaseAdmin`;
     só esta trocou as duas coisas. É o tipo de erro que nenhum teste de tipo pega,
     porque `if (string)` é JavaScript válido. */
  if (!supabaseAdmin) {
    return new Response(JSON.stringify({ online: null }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
  /* 60/min: o rodapé chama a cada 60 s e a resposta tem `s-maxage=30`, então o
     tráfego real é quase todo CDN. O limite existe pro caminho que fura o cache. */
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'online', ip, 60, 60)))
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } });

  try {
    /* `online_anon`, não `online_now` (07/08). A `online_now` conta jogador
       REGISTRADO DENTRO DE PARTIDA, porque é isso que o /api/heartbeat exige - e
       era por isso que a Vercel Analytics mostrava 8 pessoas no site e o rodapé
       mostrava nada. As duas medidas estavam certas; contavam coisas diferentes.
       "N online" é lido como "quantas pessoas estão com o jogo aberto", então a
       fonte passa a ser a presença anônima por `anonId` (migration 014), que
       inclui quem está parado no menu. A `online_now` continua existindo: é ela
       que alimenta o mapa de cidades da /mapa, com nick. */
    const { count, error } = await supabaseAdmin
      .from('online_anon')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return new Response(JSON.stringify({ online: count ?? 0 }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'cache-control': 's-maxage=30, stale-while-revalidate=60' },
    });
  } catch (e) {
    /* O `catch` mudo custou caro (07/08): com o site no ar, esta rota devolvia
       `{"online": null}` e o rodapé escondia o contador - comportamento correto do
       rodapé, defeito invisível aqui. `null` era a MESMA resposta de "Supabase não
       configurado" e de "a query explodiu", então não havia como distinguir sem
       abrir o banco. A causa real: a view `online_now` não existe em produção (ela
       morava no `schema.sql`, que saiu do repo público) - agora tem migration, a 014.
       O log não muda a resposta: o contador continua sumindo em silêncio para o
       jogador, que é o certo. Ele só deixa de sumir em silêncio para NÓS. */
    console.error('[online] a consulta a `online_now` falhou - a view existe? (ver supabase/migrations/014):', e);
    return new Response(JSON.stringify({ online: null }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
};
