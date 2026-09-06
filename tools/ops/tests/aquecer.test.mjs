/* aquecer.mjs contra um "edge" sintético: MISS na 1ª vez, HIT depois. Cobra que TODO módulo do
   import map e TODO asset dos registros servidos seja pedido com o `?v=` da raiz, que a 2ª passada
   confirme HIT, e que raiz em versão errada não aqueça nada (deploy ainda não chegou). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { aquecer } from '../aquecer.mjs';

const V = '9.9.9-teste.7';
function fixture() {
  const raiz = mkdtempSync(join(tmpdir(), 'csbr-aquecer-'));
  const w = (rel, corpo) => { const abs = join(raiz, rel); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, corpo); };
  const glb = Buffer.concat([Buffer.from('glTF'), Buffer.alloc(60, 1)]);
  w('package.json', JSON.stringify({ version: V }));
  w('public/js/weapons.js', "export const WEAPON_IDS = ['ak'];\n");
  w('public/js/glbchars.js', "export const GLB_CHARS = new Set(['heroi']);\n");
  w('public/js/main.js', 'export const a = 1;\n');
  w('public/models/weapons/ak.glb', glb);
  w('public/models/characters/heroi.glb', glb);
  w('public/models/props/lixeira.glb', glb);
  w('public/models/anims/index.json', '{}'); w('public/models/anims/foot-offsets.json', '{}');
  w('public/vendor/three.module.js', 'export const R = 1;\n'); w('public/style.css', 'body{}');
  return raiz;
}
function edge(raiz, versaoServida) {
  const pedidos = []; const visto = new Set();
  const importMap = { imports: { three: `./vendor/three.module.js?v=${versaoServida}`, './js/main.js': `./js/main.js?v=${versaoServida}-x`, './js/weapons.js': `./js/weapons.js?v=${versaoServida}-x`, './js/glbchars.js': `./js/glbchars.js?v=${versaoServida}-x` } };
  const html = `<!doctype html><html><head><link rel="stylesheet" href="/style.css?v=${versaoServida}"><script type="importmap">${JSON.stringify(importMap)}</script></head></html>`;
  const srv = createServer((req, res) => {
    pedidos.push({ url: req.url, range: req.headers.range || null });
    // soluço de rede na 2ª passada de UM asset: a conexão morre; o aquecedor tem de pedir de novo
    if (req.url.startsWith('/models/props/lixeira.glb') && pedidos.filter((p) => p.url === req.url).length === 2) return req.socket.destroy();
    if (req.url.split('?')[0] === '/') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(html); }
    let corpo; try { corpo = require('node:fs').readFileSync(join(raiz, 'public', req.url.split('?')[0])); } catch { res.writeHead(404); return res.end(); }
    const cf = visto.has(req.url) ? 'HIT' : 'MISS'; visto.add(req.url);
    res.writeHead(200, { 'content-type': 'application/octet-stream', 'cf-cache-status': cf }); res.end(corpo);
  });
  return new Promise((f) => srv.listen(0, '127.0.0.1', () => f({ base: `http://127.0.0.1:${srv.address().port}`, pedidos, fechar: () => new Promise((g) => { srv.closeAllConnections?.(); srv.close(g); }) })));
}
import { createRequire } from 'node:module';
globalThis.require = createRequire(import.meta.url);

test('aquecer: pede módulos e assets dos registros com o ?v= da raiz, e a 2ª passada confirma HIT', { timeout: 30_000 }, async () => {
  const raiz = fixture(); const s = await edge(raiz, V);
  try {
    const r = await aquecer(s.base, { raiz, esperada: V, esperaMs: 1000, pausaMs: 10, log: () => {} });
    assert.equal(r.ok, true, JSON.stringify(r.falhas));
    assert.deepEqual(r.registros, { armas: 'registro-servido', personagens: 'registro-servido' });
    const caminhos = new Set(r.itens.map((i) => new URL(i.url).pathname));
    for (const c of ['/js/main.js', '/vendor/three.module.js', '/models/weapons/ak.glb', '/models/characters/heroi.glb', '/models/props/lixeira.glb', '/style.css']) assert.ok(caminhos.has(c), `${c} não foi aquecido`);
    assert.ok(s.pedidos.filter((p) => p.url.startsWith('/models/weapons/ak.glb')).every((p) => p.url.endsWith(`?v=${encodeURIComponent(V)}`) && p.range === 'bytes=0-15'), 'asset pedido sem o ?v= da raiz ou sem Range');
    assert.equal(r.segunda.hit, r.total, `2ª passada devia ser toda HIT: ${r.frios.join(' · ')}`);
    assert.equal(r.itens.find((i) => i.url.endsWith('/models/props/lixeira.glb'))?.passada, '2-retry', 'o soluço de rede na 2ª passada tinha de virar nova tentativa, não falha');
    assert.ok(r.primeira.hit < r.total, 'a 1ª passada tinha de encontrar MISS (o edge sintético começa frio)');
  } finally { await s.fechar(); rmSync(raiz, { recursive: true, force: true }); }
});

test('aquecer: raiz em versão diferente da esperada não aquece nada e diz por quê', { timeout: 30_000 }, async () => {
  const raiz = fixture(); const s = await edge(raiz, '9.9.9-teste.6');
  try {
    const r = await aquecer(s.base, { raiz, esperada: V, esperaMs: 300, pausaMs: 50, log: () => {} });
    assert.equal(r.ok, false); assert.match(r.motivo, /serve 9\.9\.9-teste\.6, esperava 9\.9\.9-teste\.7/);
    assert.equal(s.pedidos.filter((p) => !p.url.startsWith('/')).length, 0);
    assert.ok(s.pedidos.every((p) => p.url.split('?')[0] === '/'), 'não pode pedir asset com a versão errada');
  } finally { await s.fechar(); rmSync(raiz, { recursive: true, force: true }); }
});
