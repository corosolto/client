#!/usr/bin/env node
/* ============================================================================
   backend-fake.mjs — BACKEND DE MENTIRA PARA RODAR O WORKER LOCAL COM PERFIL DE FIXTURE
   ----------------------------------------------------------------------------
   As réguas canonical-host-check e game-pages-check interceptam `fetch` do handler SSR
   para devolver o perfil de fixture; no Worker (workerd) não dá para interceptar de fora.
   Este servidor responde `/api/social?action=profile&id=<fixture>` com o mesmo perfil e
   404 para o resto. Aponte `PUBLIC_API_BASE` do wrangler dev para ele:

     node tools/cf/backend-fake.mjs --porta=8788 &
     npx wrangler dev --port 8787 --var PUBLIC_API_BASE:http://127.0.0.1:8788 \
       --var API_PROXY_SECRET:spike-local-secret-0123456789abcdef
     CSB_SSR_BASE=http://127.0.0.1:8787 node tools/eval/canonical-host-check.mjs
   ============================================================================ */
import { createServer } from 'node:http';

const porta = Number((process.argv.find((a) => a.startsWith('--porta=')) || '').split('=')[1]) || 8788;
export const PERFIL_ID = '00000000-0000-4000-8000-00000000c0de';
export const PERFIL = { id: PERFIL_ID, handle: null, nick: 'fixture', url: `/u/${PERFIL_ID}/fixture`, visibility: 'public', source: 'server_verified',
  points: 1, kills: 1, deaths: 1, kd: 1, round_wins: 1, level: 1, next_level_points: 1, position: 1, bio: '', socials: [], avatar_url: null, last_character: null };

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/social' && url.searchParams.get('action') === 'profile' && url.searchParams.get('id') === PERFIL_ID) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ profile: PERFIL }));
    return;
  }
  if (url.pathname === '/api/server-traffic') { res.writeHead(204); res.end(); return; }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found' }));
}).listen(porta, '127.0.0.1', () => console.log(`[backend-fake] http://127.0.0.1:${porta}`));
