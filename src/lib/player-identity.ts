import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validUid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

type DatabaseError = Pick<PostgrestError, 'code' | 'message'>;

export function isIdentitySchemaMissing(error: DatabaseError | null) {
  const message = String(error?.message || '');
  return error?.code === '42703'
    || error?.code === 'PGRST204'
    || /players.*uid|uid.*schema cache|column.*uid.*does not exist/i.test(message);
}

export function isIdentityRpcMissing(error: DatabaseError | null) {
  return error?.code === 'PGRST202'
    || /register_player_uid.*(?:schema cache|could not find)|could not find the function/i.test(String(error?.message || ''));
}

type IdentityInput = {
  uid: string | null;
  token: string;
  nick: string | null;
};

type PlayerIdentity = {
  id: string;
  nick: string;
};

export async function resolvePlayerIdentity(
  admin: SupabaseClient,
  { uid, token, nick }: IdentityInput,
): Promise<{ player: PlayerIdentity | null; legacy: boolean; error: PostgrestError | null }> {
  if (uid) {
    const result = await admin.from('players').select('id, nick')
      .eq('uid', uid).eq('token', token).maybeSingle();
    if (!result.error && result.data)
      return { player: result.data as PlayerIdentity, legacy: false, error: null };
    if (result.error && !isIdentitySchemaMissing(result.error))
      return { player: null, legacy: false, error: result.error };
  }

  if (!nick) return { player: null, legacy: !uid, error: null };
  const result = await admin.from('players').select('id, nick')
    .eq('nick', nick).eq('token', token).maybeSingle();
  return { player: result.data as PlayerIdentity | null, legacy: true, error: result.error };
}
