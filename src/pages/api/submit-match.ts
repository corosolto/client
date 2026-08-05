// POST /api/submit-match — valida + rate-limita (por IP) e grava via RPC no DB.
// A validação do token do jogador acontece dentro do RPC (schema.sql).
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { geoFrom } from '../../lib/geo';
import { json, jsonError } from '../../lib/http';

export const prerender = false;

// rate limit por IP (best-effort: memória da instância serverless;
// o limite durável por nick fica no RPC — 1 submit/90s)
const hits = new Map<string, number>();
const WINDOW_MS = 30_000;

// idem register.ts: sem expurgo o Map acumulava um registro por IP pra sempre.
function prune(now: number) {
  for (const [k, t] of hits) if (now - t >= WINDOW_MS) hits.delete(k);
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!supabaseAdmin) return json(NOT_CONFIGURED, 503);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown';
  const now = Date.now();
  prune(now);
  if (hits.get(ip) && now - hits.get(ip)! < WINDOW_MS) return jsonError('rate_limited', 429);

  let body: any;
  try { body = await request.json(); } catch { return jsonError('bad_json', 400); }
  const { nick, token, won, kills, deaths, headshots, bestStreak, rounds, team, seconds, character } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string') return jsonError('missing_fields', 400);

  const n = nick.slice(0, 14);
  // cascata de compatibilidade: se a função do banco está desatualizada
  // (sem p_character/p_seconds/p_rounds/p_team), grava o núcleo dos stats mesmo assim
  const attempts = [
    { p_nick: n, p_token: token, p_won: !!won, p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0, p_best_streak: bestStreak | 0, p_rounds: rounds | 0, p_team: team === 'P' || team === 'B' ? team : null, p_seconds: seconds | 0, p_character: typeof character === 'string' ? character.slice(0, 20) : null, p_ip: ip },
    { p_nick: n, p_token: token, p_won: !!won, p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0, p_best_streak: bestStreak | 0, p_rounds: rounds | 0, p_team: team === 'P' || team === 'B' ? team : null },
    { p_nick: n, p_token: token, p_won: !!won, p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0, p_best_streak: bestStreak | 0 },
  ];
  let error: any = null, degraded = false;
  for (let i = 0; i < attempts.length; i++) {
    const r = await supabaseAdmin.rpc('submit_match', attempts[i]);
    if (!r.error) { degraded = i > 0; error = null; break; }
    error = r.error;
    if (!/could not find the function|schema cache/i.test(r.error.message)) break; // erro real (token, rate limit…)
  }
  if (error) return jsonError(error.message, 403);

  hits.set(ip, now);
  // geo: presença + histórico agregado por cidade (nunca IP bruto)
  const g = geoFrom(request);
  if (g) {
    const today = new Date().toISOString().slice(0, 10);
    await supabaseAdmin.from('presence').upsert({
      nick: n, last_seen: new Date().toISOString(),
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
  return json(degraded
    ? { ok: true, warn: 'banco desatualizado — rode supabase/schema.sql (perdeu rounds/time/tempo desta partida)' }
    : { ok: true });
};
