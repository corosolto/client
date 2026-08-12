// POST /api/train-frames - recebe lotes opt-in para treino offline dos bots.
import type { APIRoute } from 'astro';
import { mkdir, open } from 'node:fs/promises';
import path from 'node:path';
import { supabaseAdmin, NOT_CONFIGURED } from '../../lib/supabase';
import { rateLimit } from '../../lib/ratelimit';
import { logInternalError } from '../../lib/api-error';
import { resolvePlayerIdentity, validUid } from '../../lib/player-identity';

export const prerender = false;

const MAX_FRAMES = 5000;
const MAX_BYTES = 400_000;
const MAX_REQUEST_BYTES = 550_000;
const MAX_LOCAL_FILE_BYTES = 50 * 1024 * 1024;
const STATE_DIM = 27;
const ACTION_DIM = 7;
const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// O sink de desenvolvimento aceita somente a origem local isolada pelo servidor.
const LOCAL_ENABLED = !supabaseAdmin && import.meta.env.DEV;
const LOCAL_FILE = path.resolve(process.cwd(), 'tools/eval/data/collected.ndjson');
const localWindows = new Map<string, { startedAt: number; count: number }>();

const localRateLimit = (key: string, max: number, windowMs = 60_000) => {
  const now = Date.now();
  if (localWindows.size > 1000) {
    for (const [storedKey, value] of localWindows) {
      if (now - value.startedAt >= windowMs) localWindows.delete(storedKey);
    }
  }
  const current = localWindows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    localWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
};

const readJson = async (request: Request) => {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) throw new Error('body_too_large');
  if (!request.body) throw new Error('bad_json');

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error('body_too_large');
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const clip = (value: unknown, len: number) => typeof value === 'string' ? value.slice(0, len) : null;
const sanitizeMeta = (meta: unknown) => {
  const value = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta as Record<string, unknown> : {};
  return {
    map: clip(value.map, 40) || 'desconhecido',
    mode: value.mode === 'ctf' ? 'ctf' : 'rounds',
    weapon: clip(value.weapon, 32),
  };
};

const validLocalOrigin = (request: Request) => {
  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(request.headers.get('origin') || '');
    return originUrl.host === requestUrl.host
      && ['localhost', '127.0.0.1', '[::1]'].includes(requestUrl.hostname);
  } catch {
    return false;
  }
};

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!supabaseAdmin && !LOCAL_ENABLED)
    return new Response(NOT_CONFIGURED, { status: 503, headers: { 'content-type': 'application/json' } });

  if (supabaseAdmin && !(await rateLimit(supabaseAdmin, 'train_frames_ip', clientAddress || 'unknown', 20, 60)))
    return json({ error: 'rate_limited' }, 429);

  let body: any;
  try {
    body = await readJson(request);
  } catch (error) {
    return json({ error: error instanceof Error && error.message === 'body_too_large' ? 'body_too_large' : 'bad_json' }, 400);
  }

  const { uid: rawUid, token, v, dims, n, meta, data } = body ?? {};
  if (!validUid(rawUid) || !validUid(token))
    return json({ error: 'invalid_identity' }, 400);

  const s = dims?.s | 0, a = dims?.a | 0;
  if (s !== STATE_DIM || a !== ACTION_DIM) return json({ error: 'bad_dims' }, 400);
  if (!Number.isInteger(n) || n < 1 || n > MAX_FRAMES) return json({ error: 'bad_n' }, 400);
  if (typeof data !== 'string' || data.length > MAX_BYTES * 2 || !BASE64_RE.test(data))
    return json({ error: 'bad_data' }, 400);

  const buf = Buffer.from(data, 'base64');
  if (buf.length !== n * (s + a) || buf.length > MAX_BYTES)
    return json({ error: 'len_mismatch' }, 400);

  const m = sanitizeMeta(meta);

  if (!supabaseAdmin) {
    if (!validLocalOrigin(request)) return json({ error: 'local_only' }, 403);
    if (!localRateLimit(`ip:${clientAddress || 'unknown'}`, 20)
        || !localRateLimit(`uid:${rawUid}`, 10)) return json({ error: 'rate_limited' }, 429);
    try {
      await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
      const record = JSON.stringify({ v: v | 0 || 1, dims: { s, a }, n, meta: m, data }) + '\n';
      const file = await open(LOCAL_FILE, 'a');
      try {
        const info = await file.stat();
        if (info.size + Buffer.byteLength(record) > MAX_LOCAL_FILE_BYTES)
          return json({ error: 'local_quota_exceeded' }, 507);
        await file.appendFile(record);
      } finally {
        await file.close();
      }
      return json({ ok: true, stored: 'local' });
    } catch (error) {
      logInternalError('api/train-frames(local)', error, { uid: rawUid });
      return json({ error: 'storage_failed' }, 503);
    }
  }

  const identity = await resolvePlayerIdentity(supabaseAdmin, {
    uid: rawUid,
    token,
    nick: null,
  });
  if (identity.error) {
    logInternalError('api/train-frames-identity', identity.error, { uid: rawUid });
    return json({ error: 'identity_unavailable' }, 503);
  }
  if (!identity.player) return json({ error: 'invalid_identity' }, 403);
  if (!(await rateLimit(supabaseAdmin, 'train_frames_player', identity.player.id, 10, 60)))
    return json({ error: 'rate_limited' }, 429);

  try {
    const { error } = await supabaseAdmin.rpc('insert_training_frames', {
      p_player_id: identity.player.id,
      p_schema: v | 0 || 1,
      p_map: m.map,
      p_mode: m.mode,
      p_weapon: m.weapon,
      p_n: n,
      p_state_dim: s,
      p_action_dim: a,
      p_data: data,
    });
    if (error) throw error;
  } catch (error) {
    logInternalError('api/train-frames', error, { uid: rawUid, playerId: identity.player.id });
    return json({ error: 'storage_failed' }, 503);
  }
  return json({ ok: true, stored: true });
};
