// POST /api/telemetry - quanto se joga e em qual mapa. Ver supabase/migrations/012.
//
// SEPARADA DE /api/submit-match DE PROPÓSITO. As duas rotas recebem o fim da
// mesma partida, mas respondem a perguntas diferentes:
//
//   submit-match  "esse placar é legítimo?"  -> exige nick+token, tem tetos de
//                 plausibilidade e rate limit de 1 partida/90 s por nick.
//   telemetry     "o que as pessoas jogam?"  -> não exige nick, não julga o
//                 placar, e NÃO PODE herdar aquele rate limit: ele existe para
//                 travar quem forja ranking, e aqui só apagaria dado real
//                 (partida curta, ou duas pessoas no mesmo Wi-Fi).
//
// O limite daqui é outro problema - abuso automatizado. 60/min por IP cobre com
// folga o jogo real (uma partida dura minutos) e corta o loop de `curl`.
//
// Anônimo por design: `anonId` é um UUID gerado no cliente e guardado no
// localStorage. Identifica navegador, não pessoa, e some quando o jogador limpa
// o storage. Nenhum IP é gravado - o IP só serve ao rate limit, em memória do
// Postgres do `rl_take`, e nunca entra nas tabelas de telemetria.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'telemetry', ip, 60, 60)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const { anonId, map, mode, seconds, rounds, nick } = body ?? {};

  // O anonId é a única coisa obrigatória, e é validado como UUID porque vira
  // chave primária composta na player_daily: string livre do cliente viraria
  // uma linha nova por lixo enviado.
  if (typeof anonId !== 'string' || !UUID_RE.test(anonId))
    return json({ error: 'bad_anon_id' }, 400);

  // Telemetria NUNCA derruba o fim de partida do jogador. Qualquer falha aqui
  // (banco fora, migration 012 não aplicada) responde ok e some - o cliente
  // manda isto por sendBeacon e não olha a resposta de qualquer jeito.
  try {
    const { error } = await supabaseAdmin.rpc('track_match', {
      p_anon_id: anonId,
      p_map: typeof map === 'string' ? map.slice(0, 40) : 'desconhecido',
      p_mode: mode === 'ctf' ? 'ctf' : 'rounds',
      p_seconds: Number.isFinite(+seconds) ? Math.round(+seconds) : 0,
      p_rounds: Number.isFinite(+rounds) ? Math.round(+rounds) : 0,
      p_nick: typeof nick === 'string' && nick ? nick.slice(0, 32) : null,
    });
    if (error) return json({ ok: true, stored: false });
  } catch {
    return json({ ok: true, stored: false });
  }
  return json({ ok: true, stored: true });
};
