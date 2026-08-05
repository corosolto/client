// POST /api/avatar — upload de foto de perfil validado por nick+token
// (sem login OAuth). Redimensiona pra 128×128 e grava no bucket avatars.
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { json, jsonError } from '../../lib/http';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!supabaseAdmin) return json(NOT_CONFIGURED, 503);
  let body: any;
  try { body = await request.json(); } catch { return jsonError('bad_json', 400); }
  const { nick, token, image } = body ?? {};
  if (typeof nick !== 'string' || typeof token !== 'string' || typeof image !== 'string')
    return jsonError('missing_fields', 400);

  const { data: player } = await supabaseAdmin
    .from('players').select('id, nick').eq('nick', nick.slice(0, 14)).eq('token', token).maybeSingle();
  if (!player) return jsonError('token inválido', 403);

  const b64 = image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  // barra pelo tamanho da string ANTES de decodificar: base64 rende ~0,75 byte
  // por char, então 3MB ≈ 4M chars. Decodificar primeiro alocava o buffer
  // inteiro (dezenas de MB na função) só pra recusar depois.
  if (b64.length > 4_100_000) return jsonError('imagem muito grande (máx ~3MB)', 400);
  let png: Buffer;
  try {
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > 3_000_000) return jsonError('imagem muito grande (máx ~3MB)', 400);
    png = await sharp(buf).resize(128, 128, { fit: 'cover' }).png().toBuffer();
  } catch { return jsonError('imagem inválida', 400); }

  const path = `${player.id}.png`;
  await supabaseAdmin.storage.from('avatars').upload(path, png, { upsert: true, contentType: 'image/png' });
  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await supabaseAdmin.from('players').update({ avatar_url: url }).eq('nick', player.nick);
  return json({ ok: true, url });
};
