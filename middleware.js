import { next } from '@vercel/functions';
import { trafficEntry } from './src/lib/server-traffic.mjs';

const BACKEND = process.env.PUBLIC_API_BASE || 'https://csbrasil-backend-hupd3weo5q-rj.a.run.app';

export default function middleware(request, context) {
  const entry = trafficEntry(request);
  const secret = process.env.API_PROXY_SECRET;
  if (entry && secret && secret.length >= 32) {
    context.waitUntil(fetch(`${BACKEND.replace(/\/$/, '')}/api/server-traffic`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csb-proxy-auth': secret },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(5000),
    }).then((response) => {
      if (!response.ok) console.error('[server-traffic] ingest status', response.status);
    }).catch((error) => console.error('[server-traffic] ingest unavailable', error?.name || 'error')));
  }
  return next();
}
