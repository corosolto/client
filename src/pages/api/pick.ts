// POST /api/pick - contadores de ESCOLHA (mapa, modo, facção, personagem, arma, música).
// Pedido do dono (06/08): "tracker tudo - mapas escolhidos, músicas mais tocadas, armas,
// times e personagens". Irmã pobre e feliz da /api/telemetry: sem nick, sem placar, sem
// julgamento - só um contador diário por (kind, key), via RPC track_pick (migration 013,
// no acervo privado). Falha NUNCA chega ao jogador: o cliente manda por sendBeacon.
// Rate limit próprio (120/min/IP): uma sessão real gera ~meia dúzia de picks por partida
// + trocas de música; o loop de curl é quem esse teto corta.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

const KINDS = new Set(['mapa', 'modo', 'faccao', 'personagem', 'arma', 'musica']);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'pick', ip, 120, 60))) return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }
  // aceita um pick ou um lote pequeno (o início de partida manda 5 de uma vez)
  const lote = Array.isArray(body?.picks) ? body.picks.slice(0, 8) : [body];
  let ok = 0;
  for (const p of lote) {
    const kind = typeof p?.kind === 'string' ? p.kind : '';
    const key = typeof p?.key === 'string' ? p.key.slice(0, 48) : '';
    if (!KINDS.has(kind) || !key) continue;
    try {
      const { error } = await supabaseAdmin.rpc('track_pick', { p_kind: kind, p_key: key });
      if (!error) ok++;
    } catch { /* banco fora/013 não aplicada: silêncio, por design */ }
  }
  return json({ ok: true, stored: ok });
};
