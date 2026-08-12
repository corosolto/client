import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { geoFrom } from '../../lib/geo';
import { rateLimit } from '../../lib/ratelimit';
import { jsonError, logInternalError } from '../../lib/api-error';
import { resolvePlayerIdentity, validUid } from '../../lib/player-identity';

export const prerender = false;

// Rate limit por IP: 1 submit/30 s. ERA um `new Map()` de módulo - que na
// Vercel some no cold start e dá um orçamento novo por instância de lambda
// (ver o cabeçalho de src/lib/ratelimit.ts). Agora conta no Postgres, então é
// o mesmo limite pra todas as instâncias. O limite por NICK (1/90 s) e o teto
// diário continuam dentro do RPC submit_match, onde sempre foram duráveis.

function submitErrorPayload(message: string) {
  if (/token inválido/i.test(message))
    return { error: 'invalid_token', message: 'token do jogador inválido' };
  if (/aguarde antes de submeter outra partida|muitas partidas seguidas/i.test(message))
    return { error: 'submit_cooldown', message: 'aguarde antes de enviar outra partida' };
  if (/limite diário/i.test(message))
    return { error: 'daily_limit_reached', message: 'limite diário de partidas atingido' };
  if (/stats implaus/i.test(message))
    return { error: 'implausible_stats', message: 'stats rejeitadas pela validação automática' };
  if (/fisicamente possível/i.test(message))
    return { error: 'impossible_kills', message: 'kills além do permitido pela validação automática' };
  if (/partida rápida demais/i.test(message))
    return { error: 'match_too_fast', message: 'partida terminou rápido demais para validação automática' };
  return { error: 'submit_rejected', message: 'não foi possível validar esta partida' };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'submit', ip, 1, 30)))
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } });

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { nick, token, won, kills, deaths, headshots, bestStreak, rounds, team, faction, seconds, character, mode, uid: rawUid } = body ?? {};
  if (typeof token !== 'string' || (!validUid(rawUid) && typeof nick !== 'string'))
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });

  if (rawUid != null && !validUid(rawUid)) return jsonError(400, 'uid_invalid', 'UID do jogador inválido');
  const uid = validUid(rawUid) ? rawUid : null;
  const fallbackNick = typeof nick === 'string' ? nick.slice(0, 14) : null;
  const identity = await resolvePlayerIdentity(supabaseAdmin, { uid, token, nick: fallbackNick });
  if (identity.error) {
    logInternalError('api/submit-match-identity', identity.error, { uid });
    return jsonError(503, 'identity_unavailable', 'não foi possível validar a identidade agora');
  }
  if (!identity.player) return jsonError(403, 'invalid_identity', 'UID ou token do jogador inválido');
  const n = identity.player.nick;
  /* MODO DA PARTIDA (issue #87). A trava de tempo do RPC aplica um piso de segundos por
     rodada, e o piso do ABATE (80 s, rodada de 99 s) não vale pro CAPTURA, onde a rodada
     não tem janela de tempo - era isso que recusava partida legítima e ainda marcava o
     jogador. Só 'rounds' e 'ctf' passam; qualquer outra coisa vira null, e null cai no
     piso BAIXO do lado do banco (cliente com JS em cache não pode ser punido). */
  const m = mode === 'rounds' || mode === 'ctf' ? mode : null;
  // cascata de compatibilidade: se a função do banco está desatualizada
  // (sem p_mode/p_character/p_seconds/p_rounds/p_team), grava o núcleo dos stats mesmo assim
  const attempts = [
    { p_nick: n, p_token: token, p_won: !!won, p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0, p_best_streak: bestStreak | 0, p_rounds: rounds | 0, p_team: team === 'E' || team === 'P' ? 'P' : team === 'B' ? 'B' : null, p_seconds: seconds | 0, p_character: typeof character === 'string' ? character.slice(0, 20) : null, p_ip: ip, p_mode: m },
    { p_nick: n, p_token: token, p_won: !!won, p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0, p_best_streak: bestStreak | 0, p_rounds: rounds | 0, p_team: team === 'E' || team === 'P' ? 'P' : team === 'B' ? 'B' : null, p_seconds: seconds | 0, p_character: typeof character === 'string' ? character.slice(0, 20) : null, p_ip: ip },
    { p_nick: n, p_token: token, p_won: !!won, p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0, p_best_streak: bestStreak | 0, p_rounds: rounds | 0, p_team: team === 'E' || team === 'P' ? 'P' : team === 'B' ? 'B' : null },
    { p_nick: n, p_token: token, p_won: !!won, p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0, p_best_streak: bestStreak | 0 },
  ];
  let error: any = null, degraded = false;
  for (let i = 0; i < attempts.length; i++) {
    const r = await supabaseAdmin.rpc('submit_match', attempts[i]);
    if (!r.error) { degraded = i > 0; error = null; break; }
    error = r.error;
    if (!/could not find the function|schema cache/i.test(r.error.message)) break; // erro real (token, rate limit…)
  }
  if (error) {
    logInternalError('api/submit-match', error, { uid });
    const safe = submitErrorPayload(error.message || '');
    return jsonError(403, safe.error, safe.message);
  }

  const factionId = typeof faction === 'string' && /^(E|B|U|C|F)$/.test(faction) ? faction : null;
  if (factionId) {
    const { error: factionError } = await supabaseAdmin.rpc('track_player_faction', {
      p_nick: n,
      p_faction: factionId,
    });
    if (factionError) logInternalError('api/submit-match-faction', factionError, { uid, faction: factionId });
  }

  // Cidade é contada só por /api/telemetry, inclusive para anônimos.
  const g = geoFrom(request);
  if (g) {
    await supabaseAdmin.from('presence').upsert({
      nick: n, last_seen: new Date().toISOString(),
      city: g.city, country: g.country, lat: g.lat, lon: g.lon,
    });
  }
  return new Response(JSON.stringify(degraded
    ? { ok: true, warn: 'banco desatualizado - rode supabase/schema.sql (perdeu rounds/time/tempo desta partida)' }
    : { ok: true }), { headers: { 'content-type': 'application/json' } });
};
