import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

const bucketName = 'gameplay-submissions';
const maxBytes = 300 * 1024 * 1024;
const json = (body: object, status: number) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'origin_invalid' }, 403);
  if (!supabaseAdmin || !import.meta.env.API_PROXY_SECRET) return json({ error: 'not_configured' }, 503);
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const size = Number(input.size);
  const type = String(input.type || '');
  const map = String(input.map || 'partida').replace(/[^a-z0-9_-]/gi, '-').slice(0, 32);
  if (!Number.isSafeInteger(size) || size < 1024 || size > maxBytes || !['video/webm', 'video/mp4'].includes(type))
    return json({ error: 'invalid_file' }, 400);
  if (input.consent !== true) return json({ error: 'consent_required' }, 400);

  const backend = (import.meta.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app').replace(/\/$/, '');
  let account: { authenticated?: boolean; profile?: { id?: string } };
  try {
    const response = await fetch(`${backend}/api/social-auth`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
        origin: new URL(request.url).origin,
        'x-csb-proxy-auth': import.meta.env.API_PROXY_SECRET,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return json({ error: 'login_required' }, 401);
    account = await response.json();
  } catch { return json({ error: 'auth_unavailable' }, 503); }
  const profileId = String(account.profile?.id || '');
  if (!account.authenticated || !/^[a-z0-9-]{8,64}$/i.test(profileId))
    return json({ error: 'login_required' }, 401);

  const { data: bucket, error: bucketError } = await supabaseAdmin.storage.getBucket(bucketName);
  const bucketLimit = Number(bucket?.file_size_limit);
  if (bucketError || !bucket || bucket.public || !bucketLimit || bucketLimit > maxBytes)
    return json({ error: 'storage_not_ready' }, 503);

  const { data: allowed, error: limitError } = await supabaseAdmin.rpc('rl_take', {
    p_bucket: 'gameplay-upload', p_subject: profileId, p_limit: 3, p_window_secs: 86400,
  });
  if (limitError) return json({ error: 'rate_limit_unavailable' }, 503);
  if (allowed === false) return json({ error: 'daily_limit' }, 429);

  const extension = type === 'video/mp4' ? 'mp4' : 'webm';
  const path = `${profileId}/${new Date().toISOString().slice(0, 10)}/${map}-${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabaseAdmin.storage.from(bucketName).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) return json({ error: 'upload_unavailable' }, 503);
  return json({ uploadUrl: data.signedUrl, path, maxBytes }, 200);
};
