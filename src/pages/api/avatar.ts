import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';
import { jsonError, logInternalError } from '../../lib/api-error';
import { resolvePlayerIdentity, validUid } from '../../lib/player-identity';

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
  const { nick, token, image, uid: rawUid } = body ?? {};
  if (typeof token !== 'string' || typeof image !== 'string' || (!validUid(rawUid) && typeof nick !== 'string'))
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400, headers: { 'content-type': 'application/json' } });
  if (rawUid != null && !validUid(rawUid)) return jsonError(400, 'uid_invalid', 'UID do jogador inválido');

  const uid = validUid(rawUid) ? rawUid : null;
  const identity = await resolvePlayerIdentity(supabaseAdmin, {
    uid,
    token,
    nick: typeof nick === 'string' ? nick.slice(0, 14) : null,
  });
  if (identity.error) {
    logInternalError('api/avatar-identity', identity.error, { uid });
    return jsonError(503, 'identity_unavailable', 'não foi possível validar a identidade agora');
  }
  if (!identity.player) return jsonError(403, 'invalid_identity', 'UID ou token do jogador inválido');
  const player = identity.player;

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
  const { error: uploadError } = await supabaseAdmin.storage.from('avatars').upload(path, png, { upsert: true, contentType: 'image/png' });
  if (uploadError) {
    logInternalError('api/avatar-storage', uploadError, { uid });
    return jsonError(503, 'avatar_storage_failed', 'não foi possível salvar a imagem agora');
  }
  const { data } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await supabaseAdmin.from('players').update({ avatar_url: url }).eq('id', player.id);
  if (updateError) {
    logInternalError('api/avatar-player', updateError, { uid });
    return jsonError(503, 'avatar_profile_failed', 'imagem salva, mas o perfil não foi atualizado');
  }
  return new Response(JSON.stringify({ ok: true, url }), { headers: { 'content-type': 'application/json' } });
};
