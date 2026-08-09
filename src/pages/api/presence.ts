// POST /api/presence - "estou com o jogo aberto agora", por anonId.
//
// POR QUE EXISTE, separada do /api/heartbeat (07/08):
// o heartbeat exige `nick` + `token` e o cliente só o dispara com
// `game && registeredNick` (public/js/main.js) - ou seja, jogador REGISTRADO e
// DENTRO de partida. Com o site no ar, a Vercel Analytics mostrava 8 pessoas e o
// rodapé mostrava nada. As duas medidas estavam certas: contam coisas diferentes,
// e a maioria nunca digita nick.
//
// "N online" é lido como "quantas pessoas estão com o jogo aberto", então é isso
// que esta rota mede - inclusive quem está parado no menu.
//
// `anonId` é o MESMO UUID de localStorage da telemetria (`cs_anon`): identifica
// NAVEGADOR, não pessoa, e some quando o jogador limpa o site. Nenhum IP é
// gravado; cidade/país saem do header aproximado da Vercel, a mesma fonte que a
// `presence` de jogador registrado já usa.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { geoFrom } from '../../lib/geo';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  // O cliente pinga a cada 45 s; 20/min por IP é folgado pra várias abas na mesma
  // casa e corta o loop automatizado. Mesmo helper das outras rotas.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'presence', ip, 20, 60))) return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  // UUID validado porque vira CHAVE PRIMÁRIA: string livre do cliente criaria uma
  // linha nova por lixo enviado, e o contador viraria ficção.
  const { anonId } = body ?? {};
  if (typeof anonId !== 'string' || !UUID_RE.test(anonId)) return json({ error: 'bad_anon_id' }, 400);

  /* Presença NUNCA atrapalha o jogador: isto sai por sendBeacon e ninguém lê a
     resposta. Banco fora, migration 014 não aplicada - responde ok e some. É a
     mesma regra da telemetria, e pelo mesmo motivo. */
  try {
    const g = geoFrom(request);
    await supabaseAdmin.rpc('ping_presence', {
      p_anon_id: anonId,
      p_city: g?.city ?? null,
      p_country: g?.country ?? null,
    });
  } catch { /* silencioso de propósito - ver comentário acima */ }
  return json({ ok: true });
};
