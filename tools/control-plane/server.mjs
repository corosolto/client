#!/usr/bin/env node
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, snapshot } from './state.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PUBLIC = join(ROOT, 'public');
const PORT = Number(process.env.CSBR_CONTROL_PORT || 4180);
const HOST = '127.0.0.1';
const db = openDb();
let tick = null;
let tickTimer = null;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const baseHeaders = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
};

function allowedHost(req) {
  const host = String(req.headers.host || '').split(':')[0];
  return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
}
function json(res, status, body) {
  res.writeHead(status, { ...baseHeaders, 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}
function serveFile(res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = normalize(join(PUBLIC, rel));
  if (file !== PUBLIC && !file.startsWith(PUBLIC + sep)) return json(res, 404, { error: 'not_found' });
  if (!existsSync(file)) return json(res, 404, { error: 'not_found' });
  res.writeHead(200, { ...baseHeaders, 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}

const server = createServer((req, res) => {
  if (!allowedHost(req)) return json(res, 403, { error: 'loopback_only' });
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/api/snapshot') {
    return json(res, 200, snapshot(db));
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });
  serveFile(res, url.pathname);
});

function refreshInBackground() {
  if (tick) return;
  tick = spawn(process.execPath, [join(ROOT, 'cli.mjs'), 'tick'], { stdio: 'ignore', env: process.env });
  tick.once('exit', () => { tick = null; });
}
refreshInBackground();
tickTimer = setInterval(refreshInBackground, 60_000);
server.listen(PORT, HOST, () => console.log(`CSBR Control Plane: http://${HOST}:${PORT}/`));
function stop() {
  clearInterval(tickTimer);
  if (tick) tick.kill('SIGTERM');
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
