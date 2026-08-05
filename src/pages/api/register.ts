// POST /api/register — registra nick (único) + token do jogador.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { buildSocialUrl } from '../../lib/social';

export const prerender = false;

const REG_WINDOW_MS = 60_000;
const regHits = new Map<string, number[]>();

// o Map só crescia: um IP visto uma vez ficava na memória da instância morna
// pra sempre. Varre e solta os IPs cuja janela já venceu.
function prune(now: number) {
  for (const [k, ts] of regHits)
    if (ts.every(t => now - t >= REG_WINDOW_MS)) regHits.delete(k);
}

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  // rate limit de registro: 10/min por IP (anti nick-farming)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const now = Date.now();
  prune(now);
  const prev = regHits.get(ip) || [];
  const recent = prev.filter(t => now - t < REG_WINDOW_MS);
  if (recent.length >= 10)
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } });
  recent.push(now); regHits.set(ip, recent);

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { nick, token, social, socials, accessToken, avatarUrl } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string' || nick.trim().length < 2)
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });
  const { error } = await supabaseAdmin.rpc('register_player', {
    p_nick: nick.trim().slice(0, 14), p_token: token,
    p_social: typeof social === 'string' ? social.slice(0, 60) : null,
  });
  if (error)
    return new Response(JSON.stringify({ error: error.message }), { status: 409, headers: { 'content-type': 'application/json' } });

  // multi-redes: [{net, handle}] → [{net, url}] + social_link = primeira
  if (Array.isArray(socials) && socials.length) {
    const list = socials
      .filter((s: any) => s && typeof s.net === 'string' && typeof s.handle === 'string')
      .slice(0, 5)
      .map((s: any) => ({ net: s.net.slice(0, 12), url: buildSocialUrl(s.net, s.handle.slice(0, 40)) }))
      .filter((s: any) => s.url);
    if (list.length) {
      await supabaseAdmin.from('players')
        .update({ socials: list, social_link: list[0].url.slice(0, 60) })
        .eq('nick', nick.trim().slice(0, 14)).eq('token', token);
    }
  }

  // se veio sessão OAuth, vincula auth_user + avatar do provedor/custom
  if (typeof accessToken === 'string' && accessToken.length > 20) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (user) {
      const meta: any = user.user_metadata || {};
      await supabaseAdmin.from('players').update({
        auth_user: user.id,
        avatar_url: typeof avatarUrl === 'string' ? avatarUrl.slice(0, 300)
          : (meta.avatar_url || meta.picture || null),
      }).eq('nick', nick.trim().slice(0, 14)).eq('token', token);
    }
  } else if (typeof avatarUrl === 'string' && avatarUrl.length > 10) {
    await supabaseAdmin.from('players').update({ avatar_url: avatarUrl.slice(0, 300) })
      .eq('nick', nick.trim().slice(0, 14)).eq('token', token);
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
