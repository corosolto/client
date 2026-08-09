// POST /api/match - evento RICO de partida (anônimo), uma linha por partida.
// Ver supabase/migrations/016.
//
// COMPLEMENTA /api/telemetry (012, agregado) e /api/submit-match (só registrado):
// aqui é o evento por partida da MAIORIA (que não tem nick), carregando placar,
// arma, personagem e resultado. É o que destrava KD médio, duração típica,
// balanço de arma e rendimento de personagem.
//
// ANÔNIMO POR DESIGN: anonId = UUID de localStorage (navegador, não pessoa),
// nenhum IP gravado. Falha NUNCA chega ao jogador: sai por sendBeacon, o
// cliente não lê a resposta. Rate limit folgado (uma partida dura minutos).
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESULT_RE = /^(won|lost|quit|draw)$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'match', ip, 20, 60)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const { anonId, map, mode, character, team, result, kills, deaths, headshots, bestStreak, rounds, seconds, topWeapon, weaponKills, botCount, nick } = body ?? {};

  // anonId é a única obrigatória: vira FK lógica. Sem ele, descarta em silêncio.
  if (typeof anonId !== 'string' || !UUID_RE.test(anonId))
    return json({ error: 'bad_anon_id' }, 400);

  // weaponKills tem que ser objeto {arma: n}; se vier outra coisa, vira {}.
  const wk = weaponKills && typeof weaponKills === 'object' && !Array.isArray(weaponKills) ? weaponKills : {};

  try {
    const { error } = await supabaseAdmin.rpc('track_match_event', {
      p_anon_id: anonId,
      p_map: typeof map === 'string' ? map.slice(0, 40) : 'desconhecido',
      p_mode: mode === 'ctf' ? 'ctf' : 'rounds',
      p_character: typeof character === 'string' ? character.slice(0, 32) : null,
      p_team: typeof team === 'string' ? team.slice(0, 4) : null,
      p_result: typeof result === 'string' && RESULT_RE.test(result) ? result : 'quit',
      p_kills: kills | 0, p_deaths: deaths | 0, p_headshots: headshots | 0,
      p_best_streak: bestStreak | 0, p_rounds: rounds | 0, p_seconds: Math.round(+seconds) || 0,
      p_top_weapon: typeof topWeapon === 'string' ? topWeapon.slice(0, 32) : null,
      p_weapon_kills: wk, p_bot_count: botCount | 0,
      p_nick: typeof nick === 'string' && nick ? nick.slice(0, 32) : null,
    });
    if (error) return json({ ok: true, stored: false });
  } catch {
    return json({ ok: true, stored: false });
  }
  return json({ ok: true, stored: true });
};
