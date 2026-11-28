import http from 'node:http';
import { readFile, mkdir, writeFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
if ((!args.site && !args.package) || (args.site && args.package) || !args.out) throw Error('Use --package=dist/portal/itch-site --out=dist/portal-smoke; --site somente para baseline');
let temporary, packageProof;
if (args.package) {
  temporary = await mkdtemp(path.join(tmpdir(), 'corosolto-portal-'));
  args.site = path.join(temporary, 'site');
  const result = spawnSync('python3', [fileURLToPath(new URL('./package.py', import.meta.url)), 'extract', '--output', path.resolve(args.package), '--extract-to', args.site], { encoding: 'utf8', timeout: 60000 });
  if (result.status !== 0) { await rm(temporary, { recursive: true, force: true }); throw Error(result.stderr || 'ZIP não verificado'); }
  packageProof = JSON.parse(result.stdout);
  // O wrapper só embeda o site de produção (rede externa fica bloqueada aqui); quem o prova é o eval:portalembed.
  if (packageProof.kind !== 'site') { await rm(temporary, { recursive: true, force: true }); throw Error(`smoke prova pacote site; recebeu ${packageProof.kind}`); }
}
const site = path.resolve(args.site), out = path.resolve(args.out), prefix = '/html/12345/';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary' };
const gameServer = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
    const rel = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
    const file = path.resolve(site, rel);
    if (!file.startsWith(site + path.sep) || !(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const game = await listen(gameServer);
const hostServer = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/html' }).end(`<!doctype html><style>html,body,iframe{margin:0;width:100%;height:100%;border:0;overflow:hidden}</style><iframe allow="fullscreen;autoplay;gamepad" allowfullscreen src="${game}${prefix}?debug=1&auto=E,mst&perfilauto=0"></iframe>`);
});
const host = await listen(hostServer);
let browser;
const report = { site, started_at: new Date().toISOString(), viewport: { width: 1200, height: 800 }, failures: [], page_errors: [], external_requests_blocked: 0, pass: false };
report.package = packageProof ? { identity: packageProof.identity, archive: packageProof.archive } : null;
await mkdir(out, { recursive: true });
try {
  report.root_asset_status = (await fetch(game + '/js/main.js')).status;
  if (report.root_asset_status !== 404) throw Error('Servidor mascara subpasta com assets na raiz');
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
  report.browser = browser.version();
  const context = await browser.newContext({ viewport: report.viewport });
  await context.route('**/*', route => {
    const origin = new URL(route.request().url()).origin;
    if ([game, host].includes(origin)) return route.continue();
    report.external_requests_blocked++;
    return route.abort();
  });
  await context.routeWebSocket('**/*', ws => ws.close());
  const page = await context.newPage();
  page.on('pageerror', error => report.page_errors.push(error.message.slice(0, 300)));
  page.on('response', response => {
    if (response.status() >= 400 && report.failures.length < 200) report.failures.push({ status: response.status(), url: response.url() });
  });
  await page.goto(host);
  const iframe = page.frameLocator('iframe');
  await iframe.locator('body').waitFor();
  const frame = page.frames().find(f => f.url().startsWith(game));
  await frame.waitForFunction(() => window.__game?.state === 'live', null, { timeout: Number(args.timeout || 90000) });
  await page.waitForTimeout(3000);
  report.game = await frame.evaluate(() => {
    const g = window.__game;
    return { state: g.state, draw_calls: g.renderer.info.render.calls, canvas: { width: g.renderer.domElement.width, height: g.renderer.domElement.height }, pointer_lock: !!document.pointerLockElement, test_mode: g.testMode };
  });
  report.boot_pass = report.game.state === 'live' && report.game.draw_calls > 0 && report.page_errors.length === 0;
  report.asset_failures = report.failures.filter(f => !new URL(f.url).pathname.startsWith('/api/'));
  report.pass = report.boot_pass && report.asset_failures.length === 0;
  report.limits = ['Solo por entrada debug/auto; não prova navegação normal, movimento humano, som, pointer lock, MP ou aceite visual.', 'Rede externa e WebSockets bloqueados; APIs locais sem backend retornam 404.'];
  await page.screenshot({ path: path.join(out, 'subpath-match.png') });
} catch (error) {
  report.error = error.message;
} finally {
  await browser?.close();
  await Promise.all([new Promise(r => gameServer.close(r)), new Promise(r => hostServer.close(r))]);
  await writeFile(path.join(out, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
console.log(JSON.stringify({ pass: report.pass, game: report.game, root_asset_status: report.root_asset_status, failures: report.failures.length, error: report.error }));
if (!report.pass) process.exitCode = 1;
