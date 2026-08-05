// POST /api/avatar — upload de foto de perfil validado por nick+token
// (sem login OAuth). Redimensiona pra 128×128 e grava no bucket avatars.
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });
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

  const b64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  // barra pelo tamanho da string ANTES de decodificar: base64 rende ~0,75 byte
  // por char, então 3MB ≈ 4M chars. Decodificar primeiro alocava o buffer
  // inteiro (dezenas de MB na função) só pra recusar depois.
  if (b64.length > 4_100_000)
    return new Response(JSON.stringify({ error: 'imagem muito grande (máx ~3MB)' }), { status: 400, headers: { 'content-type': 'application/json' } });
  let png: Buffer;
  try {
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 3_000_000)
      return new Response(JSON.stringify({ error: 'imagem muito grande (máx ~3MB)' }), { status: 400, headers: { 'content-type': 'application/json' } });
    png = await sharp(buf).resize(128, 128, { fit: 'cover' }).png().toBuffer();
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
