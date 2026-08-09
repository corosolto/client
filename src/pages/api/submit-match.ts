// POST /api/submit-match - valida + rate-limita (por IP) e grava via RPC no DB.
// A validação do token do jogador acontece dentro do RPC (schema.sql).
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { geoFrom } from '../../lib/geo';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

// Rate limit por IP: 1 submit/30 s. ERA um `new Map()` de módulo - que na
// Vercel some no cold start e dá um orçamento novo por instância de lambda
// (ver o cabeçalho de src/lib/ratelimit.ts). Agora conta no Postgres, então é
// o mesmo limite pra todas as instâncias. O limite por NICK (1/90 s) e o teto
// diário continuam dentro do RPC submit_match, onde sempre foram duráveis.

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
  const { nick, token, won, kills, deaths, headshots, bestStreak, rounds, team, seconds, character, mode } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string')
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const n = nick.slice(0, 14);
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
  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 403, headers: { 'content-type': 'application/json' } });

  // geo: presença + histórico agregado por cidade (nunca IP bruto)
  const g = geoFrom(request);
  if (g) {    const today = new Date().toISOString().slice(0, 10);
    await supabaseAdmin.from('presence').upsert({
      nick: nick.slice(0, 14), last_seen: new Date().toISOString(),
      city: g.city, country: g.country, lat: g.lat, lon: g.lon,
    });
    if (g.city) {
      const { data: row } = await supabaseAdmin
        .from('city_daily').select('matches, rounds').eq('day', today).eq('city', g.city).maybeSingle();
      await supabaseAdmin.from('city_daily').upsert({
        day: today, city: g.city, country: g.country,
        matches: (row?.matches ?? 0) + 1,
        rounds: (row?.rounds ?? 0) + (rounds | 0),
      });
    }
  }
  return new Response(JSON.stringify(degraded
    ? { ok: true, warn: 'banco desatualizado - rode supabase/schema.sql (perdeu rounds/time/tempo desta partida)' }
    : { ok: true }), { headers: { 'content-type': 'application/json' } });
};
