#!/usr/bin/env node
/* Harness local de escuta dos quatro vertical slices. Node puro, fora do runtime.

   node tools/review-character-voices.mjs --dry-run
   node tools/review-character-voices.mjs --port 8134
*/
import { createServer } from 'node:http';
import { readFileSync, writeFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const SOURCE = resolve('content/voice-lines.json');
const AUDIO_ROOT = resolve('public/audio');
const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const port = +(value('--port') || 8134);
const dryRun = args.includes('--dry-run');
const load = () => JSON.parse(readFileSync(SOURCE, 'utf8'));
const summary = () => {
  const data = load();
  return { url: `http://127.0.0.1:${port}`, characters: Object.keys(data.characters || {}).length,
    lines: Object.values(data.characters || {}).reduce((sum, character) => sum + character.lines.length, 0) };
};
console.log(JSON.stringify({ dryRun, ...summary() }, null, 2));
if (dryRun) process.exit(0);

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Revisão de vozes — CORO SOLTO</title><style>
body{margin:0;background:#101116;color:#eee;font:15px system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px}h1{margin:0 0 8px}p{color:#aaa}.grid{display:grid;gap:18px}.card{background:#191b22;border:1px solid #343744;border-radius:12px;padding:18px}.head{display:flex;gap:12px;align-items:center;justify-content:space-between}.status{font-weight:700;color:#ffd166}.lines{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;margin:14px 0}.line{background:#111219;padding:10px;border-radius:8px}.line b,.line small{display:block}.line small{color:#9da1b2;margin:4px 0 8px}audio{width:100%;height:32px}button{border:0;border-radius:7px;padding:9px 14px;margin-right:7px;font-weight:700;cursor:pointer}.ok{background:#44d17a}.bad{background:#ff626e}.pending{background:#8790a8}code{color:#9be7ff}.note{color:#ffcf70}</style></head><body><main>
<h1>Vozes dos quatro pilotos</h1><p>Escute todas as oito falas antes de aprovar. STT prova texto, não timbre, emoção ou naturalidade.</p><div id="app" class="grid"></div>
<script>
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){const d=await fetch('/api/data').then(r=>r.json());app.innerHTML=Object.entries(d.characters).map(([id,c])=>\`<section class="card"><div class="head"><div><h2>\${esc(id)}</h2><span class="status">\${esc(c.status)}</span></div><code>\${esc(c.voiceId)}</code></div><div class="lines">\${c.lines.map(l=>\`<div class="line"><b>\${esc(l.key)} · \${esc(l.event)}</b><span>\${esc(l.text)}</span><small>\${esc(l.direction)}</small>\${l.output?\`<audio controls preload="none" src="/\${esc(l.output.file)}"></audio>\`:'<em>arquivo ausente</em>'}</div>\`).join('')}</div><div><button class="ok" onclick="setStatus('\${id}','approved')">Aprovar 8/8</button><button class="bad" onclick="reject('\${id}')">Reprovar</button><button class="pending" onclick="setStatus('\${id}','generated')">Voltar a pendente</button></div><p class="note">\${esc(c.reviewNote||'')}</p></section>\`).join('')}
async function setStatus(id,status,note=''){const r=await fetch('/api/status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,status,note})});if(!r.ok)alert(await r.text());await load()}
function reject(id){const note=prompt('O que precisa ser corrigido?');if(note!==null)setStatus(id,'rejected',note)}
load();</script></main></body></html>`;

const mime = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); response.end(html); return;
  }
  if (request.method === 'GET' && request.url === '/api/data') {
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(load())); return;
  }
  if (request.method === 'GET' && request.url.startsWith('/audio/')) {
    const file = resolve('public', `.${decodeURIComponent(request.url)}`);
    if (!file.startsWith(`${AUDIO_ROOT}/`)) { response.writeHead(403); response.end('forbidden'); return; }
    try { response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); response.end(readFileSync(file)); }
    catch { response.writeHead(404); response.end('not found'); }
    return;
  }
  if (request.method === 'POST' && request.url === '/api/status') {
    let body = ''; request.on('data', (chunk) => { body += chunk; if (body.length > 16_384) request.destroy(); });
    request.on('end', () => {
      try {
        const { id, status, note = '' } = JSON.parse(body);
        if (!['generated', 'approved', 'rejected'].includes(status)) throw new Error('status inválido');
        const data = load(); if (!data.characters?.[id]) throw new Error('personagem inválido');
        data.characters[id].status = status;
        data.characters[id].reviewNote = String(note).slice(0, 500);
        data.characters[id].reviewedAt = status === 'generated' ? null : new Date().toISOString();
        data.characters[id].reviewedBy = status === 'generated' ? null : 'Ruben-local-review';
        writeFileSync(SOURCE, `${JSON.stringify(data, null, 2)}\n`);
        response.writeHead(200, { 'content-type': 'application/json' }); response.end('{"ok":true}');
      } catch (error) { response.writeHead(400); response.end(error.message); }
    });
    return;
  }
  response.writeHead(404); response.end('not found');
});
server.listen(port, '127.0.0.1', () => console.log(`VOICE_REVIEW http://127.0.0.1:${port}`));
