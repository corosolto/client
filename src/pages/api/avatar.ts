// POST /api/avatar - upload de foto de perfil validado por nick+token
// (sem login OAuth). Redimensiona pra 128×128 e grava no bucket avatars.
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  // Rota SEM limite que aceitava ~3 MB de base64 e rodava `sharp` - o vetor de
  // custo/DoS mais caro do backend (CPU + memória + upload no Storage por
  // request). 5 uploads/10 min por IP: ninguém troca de foto mais que isso.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  if (!(await rateLimit(supabaseAdmin, 'avatar', ip, 5, 600)))
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: { 'content-type': 'application/json' } });

  let body: any;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { nick, token, image } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string' || typeof image !== 'string')
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const { data: player } = await supabaseAdmin
    .from('players').select('id, nick').eq('nick', nick.slice(0, 14)).eq('token', token).maybeSingle();
  if (!player)
    return new Response(JSON.stringify({ error: 'token inválido' }), { status: 403, headers: { 'content-type': 'application/json' } });

  // teto ANTES de decodificar: 3 MB de imagem ≈ 4 MB de base64. Checar só
  // depois do Buffer.from significava alocar o payload inteiro (e um atacante
  // podia mandar 50 MB de string) antes de recusar.
  if (image.length > 4_200_000)
    return new Response(JSON.stringify({ error: 'imagem muito grande (máx ~3MB)' }), { status: 400, headers: { 'content-type': 'application/json' } });

  const b64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  let png: Buffer;
  try {
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 3_000_000)
      return new Response(JSON.stringify({ error: 'imagem muito grande (máx ~3MB)' }), { status: 400, headers: { 'content-type': 'application/json' } });
    // limitInputPixels barra bomba de descompressão (PNG de 40 KB que expande
    // pra 40 000 × 40 000 px e come toda a memória da lambda). 40 MP = folgado.
    png = await sharp(buf, { limitInputPixels: 40_000_000 }).resize(128, 128, { fit: 'cover' }).png().toBuffer();
  } catch {
    return new Response(JSON.stringify({ error: 'imagem inválida' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const path = `${player.id}.png`;
  await supabaseAdmin.storage.from('avatars').upload(path, png, { upsert: true, contentType: 'image/png' });
  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await supabaseAdmin.from('players').update({ avatar_url: url }).eq('nick', player.nick);
  return new Response(JSON.stringify({ ok: true, url }), { headers: { 'content-type': 'application/json' } });
};
