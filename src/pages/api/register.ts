// POST /api/register - registra nick (único) + token do jogador.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { buildSocialUrl } from '../../lib/social';
import { isAllowedAvatarUrl } from '../../lib/safe-url';
import { rateLimit } from '../../lib/ratelimit';
import { isValidNick, NICK_HINT } from '../../lib/nick';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  // rate limit de registro: 10/min por IP (anti nick-farming).
  // ERA um `new Map()` de módulo - que na Vercel vive só dentro de UMA instância
  // de lambda e some no cold start; quem abrisse requests em paralelo ganhava um
  // orçamento novo por instância. Agora conta no Postgres (RPC rl_take), que é
  // memória compartilhada de verdade. Ver supabase/migrations/011.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'register', ip, 10, 60)))
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } });

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { nick, token, social, socials, accessToken, avatarUrl } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string' || nick.trim().length < 2)
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });

  // Charset do nick. O check no banco é a fonte da verdade (players_nick_charset,
  // docs/seguranca.md §8); isto aqui é o espelho, e existe por dois motivos:
  // devolver erro legível em vez do 409 genérico de constraint violada, e recusar
  // ANTES de gastar uma chamada de RPC. Valida o nick já cortado em 14, que é o
  // que de fato vai pro banco - validar o original e gravar o truncado deixaria
  // passar lixo depois do 14º caractere.
  const nickLimpo = nick.trim().slice(0, 14);
  if (!isValidNick(nickLimpo))
    return new Response(JSON.stringify({ error: 'nick_invalid', message: NICK_HINT }), { status: 400, headers: { 'content-type': 'application/json' } });

  const { error } = await supabaseAdmin.rpc('register_player', {
    p_nick: nickLimpo, p_token: token,
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
        .eq('nick', nickLimpo).eq('token', token);
    }
  }

  // ANTI-SSRF NA ORIGEM: avatar_url é lido de volta e BUSCADO pelo servidor em
  // /api/badge. Guardar uma URL arbitrária aqui é o que armava o gatilho -
  // por isso a validação (https + host de avatar conhecido) acontece nos dois
  // lados: na escrita, aqui, e na leitura, no fetchAvatar. Ver src/lib/safe-url.ts.
  const safeAvatar = (v: unknown) =>
    typeof v === 'string' && isAllowedAvatarUrl(v) ? v.slice(0, 300) : null;

  // se veio sessão OAuth, vincula auth_user + avatar do provedor/custom
  if (typeof accessToken === 'string' && accessToken.length > 20) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);
    if (user) {
      const meta: any = user.user_metadata || {};
      await supabaseAdmin.from('players').update({
        auth_user: user.id,
        avatar_url: safeAvatar(avatarUrl) ?? safeAvatar(meta.avatar_url) ?? safeAvatar(meta.picture),
      }).eq('nick', nickLimpo).eq('token', token);
    }
  } else if (safeAvatar(avatarUrl)) {
    await supabaseAdmin.from('players').update({ avatar_url: safeAvatar(avatarUrl) })
      .eq('nick', nickLimpo).eq('token', token);
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
