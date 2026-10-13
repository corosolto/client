// CI PR807: a raiz precisa conter o componente social real, sem silenciar falhas de render.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, unlink, mkdtemp, mkdir, cp, readdir, symlink, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import net from 'node:net';
import { moduleCacheManifest } from '../../scripts/module-cache.mjs';

const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
const mutations = {
  'sem-componente': s => s.replace('renderer.handle(req, res);', "res.writeHead(200); res.end('<html><body></body></html>');"),
  'erro-200': s => s.replace('renderer.handle(req, res);', "res.writeHead(200); res.end('404');"),
  'shell-removido': s => s.replace("p === '/eval-character.html'", "p === '/shell-ausente'"),
  'cache-gele': s => s.replace('manifest.revision !== revision', 'false'),
};
assert(!mutant || mutations[mutant], 'mutante desconhecido');
const source = await readFile(new URL('./serve.mjs', import.meta.url), 'utf8');
const file = mutant ? new URL(`./.social-serve-${process.pid}.mjs`, import.meta.url) : new URL('./serve.mjs', import.meta.url);
if (mutant) {
  const changed = mutations[mutant](source);
  assert.notEqual(changed, source, 'mutação não aplicada');
  await writeFile(file, changed);
}
const port = await new Promise((resolve, reject) => {
  const reservation = net.createServer();
  reservation.on('error', reject);
  reservation.listen(0, '127.0.0.1', () => {
    const number = reservation.address().port;
    reservation.close(() => resolve(number));
  });
});
await mkdir(resolve('artifacts/social'), { recursive: true });
const fixture = await mkdtemp(resolve('artifacts/social/serve-cache-'));
await mkdir(join(fixture, 'public'));
await cp('public/js', join(fixture, 'public/js'), { recursive: true });
await cp('src', join(fixture, 'src'), { recursive: true });
for (const name of ['package.json', 'astro.config.mjs']) await cp(name, join(fixture, name));
for (const name of ['scripts', 'node_modules']) await symlink(resolve(name), join(fixture, name));
for (const name of await readdir('public')) if (name !== 'js') await symlink(resolve('public', name), join(fixture, 'public', name));
const child = spawn(process.execPath, [file.pathname, String(port)], { cwd: fixture, stdio: ['ignore', 'pipe', 'pipe'] });
const exited = new Promise(resolve => child.once('exit', resolve));
let log = '';
child.stdout.on('data', c => { log = (log + c).slice(-5000); });
child.stderr.on('data', c => { log = (log + c).slice(-5000); });
try {
  const deadline = Date.now() + 60_000;
  let response;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) break;
    try { response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(60_000) }); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  assert(response, `servidor não respondeu; exit=${child.exitCode}; ${log.slice(-1200)}`);
  assert.equal(response.status, 200, `raiz HTTP ${response.status}; ${log.slice(-1200)}`);
  const html = await response.text();
  for (const id of ['hub-community', 'community', 'social-account', 'social-content', 'social-unread', 'account-entry-dialog'])
    assert.match(html, new RegExp(`id="${id}"`), `componente real: ${id}`);
  assert(!html.includes('<Community'), 'componente Astro cru');
  assert(!html.includes('define:vars='), 'variáveis de servidor não renderizadas');
  const { revision } = moduleCacheManifest('public/js');
  assert.match(html, new RegExp(`/js/community\\.js\\?v=[^" ]+${revision}`), 'módulo social com cache por conteúdo');
  assert.match(html, /href="\/social\.css\?v=[a-f0-9]+"/, 'CSS social com hash');
  assert.match(html, /const GIT_SHA = /, 'define:vars real preservado');
  assert.match(html, /type="importmap"/, 'import map preservado');
  const localhost = await fetch(`http://localhost:${port}/eval-character.html`);
  assert.equal(localhost.status, 200, 'hostname usado pelo portão CI');
  const shell = await fetch(`http://127.0.0.1:${port}/eval-character.html`);
  assert.equal(shell.status, 200, 'shell de personagem');
  assert.match(await shell.text(), /three\.module\.js/);
  const asset = await fetch(`http://127.0.0.1:${port}/js/community.js`);
  assert.equal(asset.status, 200);
  assert.equal(await asset.text(), await readFile('public/js/community.js', 'utf8'), 'mesmos bytes do módulo real');
  if (html.includes('/@vite/client')) {
    const vite = await fetch(`http://127.0.0.1:${port}/@vite/client`);
    assert.equal(vite.status, 200, 'runtime do renderer real');
  }
  const mutable = join(fixture, 'public/js/vao.js');
  await writeFile(mutable, (await readFile(mutable, 'utf8')) + '\n// cache probe in isolated fixture\n');
  const next = moduleCacheManifest(join(fixture, 'public/js'));
  assert.notEqual(next.revision, revision, 'fixture não mudou revisão');
  const [fresh, concurrent] = await Promise.all([fetch(`http://127.0.0.1:${port}/`), fetch(`http://127.0.0.1:${port}/`)]);
  assert.equal(fresh.status, 200, 'raiz após mudança de conteúdo');
  const updated = await fresh.text();
  assert.equal(concurrent.status, 200, 'raiz concorrente após mudança');
  assert.equal(await concurrent.text(), updated, 'concorrência usa o mesmo renderer e revisão');
  const map = JSON.parse(updated.match(/<script[^>]*type="importmap"[^>]*>([\s\S]*?)<\/script>/)?.[1] || 'null');
  assert(map, 'import map real ausente após mudança');
  assert.deepEqual(Object.keys(map.imports).filter(k => k.startsWith('./js/')).sort(), next.modules.map(n => `./js/${n}`).sort(), 'inventário publicado exato');
  const { version } = JSON.parse(await readFile('package.json', 'utf8'));
  for (const name of next.modules) assert.equal(map.imports[`./js/${name}`], `./js/${name}?v=${version}-${next.revision}`, `cache atual: ${name}`);
  assert.match(updated, new RegExp(`/js/main\\.js\\?v=[^" ]+${next.revision}`), 'entrypoint com revisão atual');
  assert.match(updated, new RegExp(`/js/community\\.js\\?v=[^" ]+${next.revision}`), 'componente com revisão atual');
  const changedAsset = await fetch(`http://127.0.0.1:${port}/js/vao.js`);
  assert.equal(await changedAsset.text(), await readFile(mutable, 'utf8'), 'bytes da edição isolada servidos');
  const missing = await fetch(`http://127.0.0.1:${port}/arquivo-inexistente-ci.js`);
  assert.equal(missing.status, 404, 'ausência não pode virar verde');
  console.log('PASS HTTP real: comunidade, hashes, variáveis, import map, assets, shell e cache após edição isolada');
} catch (e) {
  console.error(`RED social-serve: ${e.message}`);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await exited;
  await rm(fixture, { recursive: true, force: true });
  if (mutant) await unlink(file);
}
