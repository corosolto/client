#!/usr/bin/env node
// Piloto faca: captura o controlador REAL do Game, não a rota authored de rifles.
// Avança o jogo em subpassos de 1/120 s, incluindo blends e finished do mixer.
// Fotos são pausas determinísticas da simulação, não vídeo nem prova de contato 3D.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const flags = new Map(process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')));
for (const key of flags.keys()) {
  if (!['saida', 'porta', 'largura', 'altura', 'mutante', 'quadro-z'].includes(key)) throw new Error(`flag desconhecida: ${key}`);
}
const frameZ = flags.has('quadro-z') ? Number(flags.get('quadro-z')) : null;
if (frameZ !== null && !Number.isFinite(frameZ)) throw new Error('quadro-z inválido');
const mutant = flags.get('mutante') || '';
if (mutant && mutant !== 'sem-ataque') throw new Error(`mutante desconhecido: ${mutant}`);
const viewport = { width: Number(flags.get('largura') || 1440), height: Number(flags.get('altura') || 960) };
const port = Number(flags.get('porta') || 8347);
if (![viewport.width, viewport.height, port].every((n) => Number.isInteger(n) && n > 0)) throw new Error('dimensão/porta inválida');
const out = path.resolve(ROOT, flags.get('saida') || 'artifacts/viewmodels/astra-series/knife-baseline');
const base = `http://127.0.0.1:${port}`;
const globalRoot = execFileSync('npm', ['root', '-g']).toString().trim();
const playwright = await import(pathToFileURL(`${globalRoot}/playwright/index.js`).href);
const chromium = playwright.chromium || playwright.default?.chromium;
await fs.mkdir(out, { recursive: true });
// Não conectar a um servidor alheio e depois atribuir seus assets a este checkout.
try { await fetch(base, { signal: AbortSignal.timeout(1000) }); throw new Error(`porta ${port} já ocupada`); }
catch (error) { if (error.message.includes('já ocupada')) throw error; }
const server = spawn(process.execPath, ['tools/eval/serve.mjs', String(port)], { cwd: ROOT, stdio: 'ignore' });
process.on('exit', () => server.kill());
let browser;
const report = { viewport, mutant: mutant || null, sampling: 'Game.update em subpassos <= 1/120 s; fotos congeladas, não vídeo',
  errors: [], warnings: [], checks: [], states: [] };
const cells = [];
const check = (ok, name, evidence) => report.checks.push({ ok: !!ok, name, evidence });
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* subindo */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('servidor não abriu');
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/^(Failed to load resource:|The AudioContext encountered an error)/.test(message.text())) report.errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const text = `${response.status()} ${response.url()}`;
    report.warnings.push(text);
    if (/\/viewmodels\/|\/js\/meleevm\.js/.test(response.url())) report.errors.push(text);
  });
  console.log('melee: abrindo jogo e carregando GLB');
  await page.goto(`${base}/?debug=1&auto=E&vmweapon=knife&map=brasilia&armaslazy=0`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__game?.vm?.melee?.active, null, { timeout: 180000 });
  await page.waitForTimeout(1000);
  if (frameZ !== null) await page.evaluate((z) => {
    const vm = window.__game.vm.melee;
    vm.basePosition.z = z; vm.packageRoot.position.z = z;
  }, frameZ);
  report.frameOverride = frameZ === null ? null : { z: frameZ };
  report.asset = await page.evaluate(async () => {
    const game = window.__game, vm = game.vm.melee;
    const url = performance.getEntriesByType('resource').map((r) => r.name).find((name) => name.includes('/melee/knife-hires.glb'));
    if (!url) throw new Error('GLB servido não encontrado');
    const response = await fetch(url, { cache: 'no-store' });
    const bytes = await response.arrayBuffer();
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    const sha256 = [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
    return { url, status: response.status, bytes: bytes.byteLength, sha256,
      camera: { fov: game.vmCamera.fov, aspect: game.vmCamera.aspect },
      scale: vm.packageRoot.scale.toArray(), position: vm.basePosition.toArray(),
      clips: [...vm.actions].map(([name, action]) => ({ name, duration: action.getClip().duration })) };
  });
  // Congela apenas este Game desta página; todo avanço chama sua implementação real.
  await page.evaluate((mutant) => {
    const game = window.__game;
    if (game.paused || !game.player.alive) throw new Error('jogo não está ativo');
    game.__meleeQaUpdate = game.update;
    game.update = () => {};
    if (mutant === 'sem-ataque') game.vm.melee.attack = () => false;
  }, mutant);
  const advance = async (seconds) => page.evaluate((seconds) => {
    const game = window.__game;
    for (let left = seconds; left > 1e-9;) {
      const dt = Math.min(left, 1 / 120);
      game.__meleeQaUpdate.call(game, dt, false);
      left -= dt;
    }
  }, seconds);
  const snapshot = async (label) => {
    const state = await page.evaluate(() => {
      const game = window.__game, vm = game.vm.melee;
      game.__meleeQaUpdate.call(game, 0, true);
      const meshes = [];
      vm.scene.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const v = mesh.position.clone();
        const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
        let visibleVertices = 0;
        for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld).project(game.vmCamera);
          if (v.z < -1 || v.z > 1) continue;
          const x = (v.x + 1) / 2, y = (1 - v.y) / 2;
          box.minX = Math.min(box.minX, x); box.maxX = Math.max(box.maxX, x);
          box.minY = Math.min(box.minY, y); box.maxY = Math.max(box.maxY, y);
          if (x >= 0 && x <= 1 && y >= 0 && y <= 1) visibleVertices++;
        }
        meshes.push({ name: mesh.name, box, visibleVertices, vertices: mesh.geometry.attributes.position.count });
      });
      return { weapon: game.player.weapon, state: vm.state, active: vm.active,
        alive: game.player.alive, gameTime: game.time, clipTime: vm.current.time,
        position: vm.packageRoot.position.toArray(), motion: vm.attackMotion && { ...vm.attackMotion },
        actions: [...vm.actions].map(([name, a]) => ({ name, weight: a.getEffectiveWeight(), time: a.time })), meshes };
    });
    const file = `${String(cells.length).padStart(2, '0')}-${label}.png`;
    const png = await page.screenshot();
    await fs.writeFile(path.join(out, file), png);
    cells.push({ label, png }); report.states.push({ label, file, ...state });
    return state;
  };
  await advance(0.6);
  const idle = await snapshot('idle');
  check(idle.state === 'Idle' && idle.active, 'idle ativo', idle.state);
  check(idle.meshes.length === 2 && idle.meshes.every((m) => m.visibleVertices > 0), 'arma e mãos presentes no frustum em idle', idle.meshes);
  for (const kind of ['draw', 'quick', 'heavy']) {
    console.log(`melee: ${kind}`);
    await advance(1);
    if (kind === 'draw') {
      await page.evaluate(() => window.__game._switchWeapon('pistol'));
      await advance(0.5);
    }
    const started = await page.evaluate((kind) => {
      const game = window.__game;
      if (kind === 'draw') { game._switchWeapon('knife'); return game.vm.melee.state === 'Draw'; }
      return game._tryKnifeAttack(kind);
    }, kind);
    check(started, `${kind} aceito pelo Game`, started);
    const duration = await page.evaluate(() => {
      const game = window.__game, vm = game.vm.melee;
      // setDuration troca timeScale, mas getEffectiveTimeScale só é atualizado
      // no tick seguinte do mixer. Sem este tick de zero a régua amostra .8 s
      // em uma estocada de .36 s, confundindo fim natural com animação ausente.
      game.__meleeQaUpdate.call(game, 0, false);
      return vm.current.getClip().duration / vm.current.getEffectiveTimeScale();
    });
    let elapsed = 0;
    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      await advance(duration * fraction - elapsed); elapsed = duration * fraction;
      const state = await snapshot(`${kind}-${Math.round(fraction * 100).toString().padStart(3, '0')}`);
      if (fraction === 0.5) check(state.state === (kind === 'draw' ? 'Draw' : 'Stab'), `${kind} animação no meio da ação`, state.state);
    }
    await advance(0.1);
    const returned = await snapshot(`${kind}-retorno`);
    check(returned.state === 'Idle' && returned.motion === null, `${kind} terminou naturalmente`, returned.state);
    check(returned.position.every((value, i) => Math.abs(value - report.asset.position[i]) < 1e-9), `${kind} restaurou posição base`, returned.position);
  }
  await page.evaluate(() => {
    const game = window.__game; game.update = game.__meleeQaUpdate; delete game.__meleeQaUpdate;
  });
  const w = 480, h = Math.round(w * viewport.height / viewport.width), cols = 3;
  const composite = [];
  for (let i = 0; i < cells.length; i++) {
    const svg = `<svg width="${w}" height="30"><rect width="100%" height="100%" fill="#081018"/><text x="9" y="21" fill="white" font-size="17">${cells[i].label}</text></svg>`;
    const input = await sharp(cells[i].png).resize(w, h).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toBuffer();
    composite.push({ input, left: i % cols * w, top: Math.floor(i / cols) * h });
  }
  await sharp({ create: { width: w * cols, height: h * Math.ceil(cells.length / cols), channels: 3, background: '#081018' } })
    .composite(composite).png().toFile(path.join(out, 'contact-sheet.png'));
  check(report.errors.length === 0, 'sem erros de runtime/assets', report.errors);
  report.ok = report.checks.every((item) => item.ok);
} catch (error) { report.errors.push(error.stack); report.ok = false; }
finally {
  await browser?.close(); server.kill();
  await fs.writeFile(path.join(out, 'runtime-report.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify({ ok: report.ok, frames: report.states.length, failures: report.checks.filter((c) => !c.ok), errors: report.errors, out }));
process.exitCode = report.ok ? 0 : 1;
