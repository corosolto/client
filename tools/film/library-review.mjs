#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const library = resolve(process.argv[2] || '../../launch-media/2026-10-24-growth-pipeline/capture-library');
const rows = (await readFile(join(library, 'index.jsonl'), 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const cards = rows.map(item => `<article data-review="${esc(item.review)}">
  <a href="${esc(item.file)}" target="_blank"><img src="${esc(item.thumbnail || '')}" alt="Quadro do take ${esc(item.id)}" loading="lazy"></a>
  <div class="body"><small>${esc(item.kind || 'gameplay')} · ${esc(item.map || 'sem mapa')} · ${esc(item.opponents || 'desconhecido')}</small>
  <h2>${esc(item.id)}</h2><p>${esc(item.width)}×${esc(item.height)} · ${esc(item.fps)} FPS · ${esc(item.durationSeconds)} s · ${item.audioCodec ? `áudio ${esc(item.audioCodec)}` : 'sem áudio'}</p>
  <p>${esc(item.creator || 'criador não identificado')} · direitos: ${esc(item.rights)} · revisão: <b>${esc(item.review)}</b></p>
  <p><a href="${esc(item.file)}" target="_blank">Abrir original</a></p></div></article>`).join('\n');
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biblioteca de capturas · CORO SOLTO</title>
<style>body{margin:0;background:#101112;color:#f2efe9;font:16px/1.4 system-ui,sans-serif}header{padding:24px 4vw;background:#1a1b1d;border-bottom:3px solid #edc64d}h1{margin:0;font-size:28px}header p{margin:8px 0 0;color:#c8c3b4}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:20px;padding:24px 4vw}article{background:#1a1b1d;border:1px solid #3b3a35;border-radius:10px;overflow:hidden}article img{width:100%;aspect-ratio:16/9;object-fit:contain;background:#090909}.body{padding:15px}small{text-transform:uppercase;color:#edc64d;font-weight:700}h2{font-size:18px;word-break:break-all}p{margin:7px 0}a{color:#edc64d}article[data-review="approved"]{border-color:#60ba76}article[data-review="rejected"]{opacity:.5}</style>
<header><h1>CORO SOLTO · CAPTURAS</h1><p>${rows.length} originais indexados. Pendentes até revisão visual; esta página é local e privada.</p></header><main>${cards}</main></html>`;
await writeFile(join(library, 'index.html'), html);
process.stdout.write(JSON.stringify({ library, items: rows.length, page: join(library, 'index.html') }) + '\n');
