// RÉGUA DE BOOT (07/08/2026 — "online muito mais lento que local", 400 jogadores/dia):
// mede requests, bytes na rede e tempo até "jogável" (state === 'live') numa partida
// ?debug&auto, em duas passagens: FRIA (cache desabilitado = 1ª visita) e QUENTE
// (mesmo contexto, cache ligado = visita repetida). Serve para decidir onde otimizar
// com número, não com intuição — lei 1 da casa.
//
// Uso: node tools/eval/boot-waterfall.mjs
//   Sobe tools/eval/serve.mjs sozinho na 8123 (mata ao sair). Um browser só — regra da casa.
import { execSync, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8123';
const gRoot = execSync('npm root -g').toString().trim();
const _pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = _pw.chromium || _pw.default?.chromium;

const srv = spawn('node', ['tools/eval/serve.mjs', '8123'], { stdio: 'ignore' });
process.on('exit', () => srv.kill());
await new Promise((r) => setTimeout(r, 600));

const kind = (u) =>
  /\.glb(\?|$)/.test(u) ? 'glb' :
  /\.(mp3|wav|ogg)(\?|$)/.test(u) ? 'audio' :
  /\.(png|jpg|jpeg|webp|svg|ico)(\?|$)/.test(u) ? 'img' :
  /\.js(\?|$)/.test(u) ? 'js' :
  /\.(css|json|wasm|txt)(\?|$)/.test(u) ? 'dados' : 'outro';

async function pass(page, cdp, cold) {
  const reqs = new Map();   // requestId -> {url, kind}
  const done = [];          // {url, kind, bytes, ms}
  const onReq = (e) => reqs.set(e.requestId, { url: e.request.url, kind: kind(e.request.url), t: e.timestamp });
  const onEnd = (e) => {
    const r = reqs.get(e.requestId);
    if (r) done.push({ ...r, bytes: e.encodedDataLength || 0 });
  };
  cdp.on('Network.requestWillBeSent', onReq);
  cdp.on('Network.loadingFinished', onEnd);
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: cold });
  const t0 = Date.now();
  await page.goto(`${BASE}/?debug=1&auto=P,mst&map=piscina_treta`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__game && window.__game.state === 'live', null, { timeout: 120000 });
  const liveMs = Date.now() - t0;
  // deixa a poeira baixar: assets que chegam DEPOIS do live (lazy) também contam na conta
  await page.waitForTimeout(3000);
  cdp.off('Network.requestWillBeSent', onReq);
  cdp.off('Network.loadingFinished', onEnd);
  return { liveMs, done };
}

const report = (label, { liveMs, done }) => {
  const byKind = {};
  for (const r of done) (byKind[r.kind] || (byKind[r.kind] = { n: 0, b: 0, urls: [] })), byKind[r.kind].n++, byKind[r.kind].b += r.bytes, byKind[r.kind].urls.push(r);
  // os "outro" vão pra um arquivo — da 1ª medição saíram 389 deles, minúsculos, sem identidade
  writeFileSync(`/tmp/boot-outro-${label.includes('FRIA') ? 'fria' : 'quente'}.txt`,
    (byKind.outro ? byKind.outro.urls.map((r) => r.url).join('\n') : '') + '\n');
  const totB = done.reduce((s, r) => s + r.bytes, 0);
  console.log(`\n===== ${label} =====`);
  console.log(`tempo até jogável: ${(liveMs / 1000).toFixed(1)}s · ${done.length} requests · ${(totB / 1e6).toFixed(1)} MB na rede`);
  for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1].b - a[1].b))
    console.log(`  ${k.padEnd(6)} ${String(v.n).padStart(4)} reqs  ${(v.b / 1e6).toFixed(1).padStart(7)} MB`);
  const top = [...done].sort((a, b) => b.bytes - a.bytes).slice(0, 8);
  console.log('  top downloads:');
  for (const r of top) console.log(`    ${(r.bytes / 1e6).toFixed(2).padStart(6)} MB  ${r.url.replace(BASE, '')}`);
  return { liveMs, reqs: done.length, bytes: totB };
};

const browser = await chromium.launch(
  process.env.CHROME_BIN
    ? { executablePath: process.env.CHROME_BIN, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--headless=new', '--mute-audio'] }
    : { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] },
);
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');

const fria = report('FRIA (1ª visita, cache off)', await pass(page, cdp, true));
const quente = report('QUENTE (reload, cache on)', await pass(page, cdp, false));
console.log(`\nRESUMO: fria ${(fria.bytes / 1e6).toFixed(1)}MB/${fria.reqs}req/${(fria.liveMs / 1000).toFixed(1)}s → quente ${(quente.bytes / 1e6).toFixed(1)}MB/${quente.reqs}req/${(quente.liveMs / 1000).toFixed(1)}s`);

await browser.close();
srv.kill();
process.exit(0);
