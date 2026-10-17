import { ipAddress, next } from '@vercel/functions';
import { isIP } from 'node:net';
import { saltoDaCloudflare } from './src/lib/api-proxy.mjs';
import { trafficEntry, uniqueRegister } from './src/lib/server-traffic.mjs';

const BACKEND = process.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';
export const config = { runtime: 'nodejs' };

export default function middleware(request, context) {
  const entry = trafficEntry(request);
  const secret = process.env.API_PROXY_SECRET;
  if (entry && secret && secret.length >= 32) {
    const peer = ipAddress(request);
    const cloudflareIp = request.headers.get('cf-connecting-ip');
    const visitorIp = peer && isIP(peer)
      ? (saltoDaCloudflare(peer) && cloudflareIp && isIP(cloudflareIp) ? cloudflareIp : peer)
      : null;
    const day = new Date().toISOString().slice(0, 10);
    const unique = entry.kind === 'browser'
      ? uniqueRegister(visitorIp, request.headers.get('user-agent'), secret, day)
      : null;
    context.waitUntil(fetch(`${BACKEND.replace(/\/$/, '')}/api/server-traffic`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csb-proxy-auth': secret },
      body: JSON.stringify({ ...entry, unique }),
      signal: AbortSignal.timeout(5000),
    }).then((response) => {
      if (!response.ok) console.error('[server-traffic] ingest status', response.status);
    }).catch((error) => console.error('[server-traffic] ingest unavailable', error?.name || 'error')));
  }
  return next();
}
