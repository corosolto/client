// POST /api/feedback - o que o jogador achou + email + consentimento de
// newsletter. Ver supabase/migrations/013.
//
// O email aqui NÃO é anônimo de propósito: ele é a razão da rota existir
// (semente da lista de newsletter - o dono ainda não tem funil). Por isso o
// consentimento é campo obrigatório e explícito, validado também no banco.
//
// Rate limit apertado (5/hora por IP): feedback real é raro; o que vem em loop
// é curl. Diferente da telemetria, aqui perder um envio abusivo não apaga dado
// de jogo nenhum.
import type { APIRoute } from 'astro';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';
import { notificar } from '../../lib/notify';

export const prerender = false;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'feedback', ip, 5, 3600)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad_json' }, 400); }

  const { email, newsletter, message, map, version } = body ?? {};
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim()) || email.length > 254)
    return json({ error: 'bad_email' }, 400);
  if (typeof message !== 'string' || message.trim().length < 3 || message.length > 2000)
    return json({ error: 'bad_message' }, 400);

  const { error } = await supabaseAdmin.rpc('submit_feedback', {
    p_email: email.trim(),
    p_newsletter: newsletter === true,
    p_message: message.trim(),
    p_map: typeof map === 'string' ? map.slice(0, 40) : null,
    p_version: typeof version === 'string' ? version.slice(0, 40) : null,
  });
  if (error) return json({ error: 'indisponivel' }, 503);

  /* NOTIFICAÇÃO DEPOIS DO BANCO, E SEM PODER DERRUBAR A RESPOSTA (issue #85).
     A ordem importa: o feedback já está gravado quando o email sai, então provedor
     fora do ar custa a notificação e não o dado. `notificar` não lança - devolve
     boolean - e sem `FEEDBACK_TO` ela não faz nada e avisa uma vez no log.
     NÃO vai IP no corpo, pela mesma razão da telemetria. */
  await notificar(`[CORO SOLTO] feedback de ${email.trim()}`, {
    mensagem: message.trim(),
    email: email.trim(),
    newsletter: newsletter === true ? 'sim' : 'não',
    mapa: typeof map === 'string' ? map.slice(0, 40) : ' - ',
    versao: typeof version === 'string' ? version.slice(0, 40) : ' - ',
  });

  return json({ ok: true });
};
