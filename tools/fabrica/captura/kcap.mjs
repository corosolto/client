#!/usr/bin/env node
// Captura de revisão (não versionada): idle/ads/fire/reload vazio/inspect por arma,
// arremesso de granada e golpes da faca, no jogo real com ?vmauthored=1.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (n, d = '') => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=');
const PORTA = arg('porta', '4371');
const ASPECTO = arg('aspecto', '32');
const OUT = path.resolve(arg('out'));
const ARMAS = arg('armas', '').split(',').filter(Boolean);
const EXTRA = arg('query', '');
const VIEWPORT = ASPECTO === '32' ? { width: 1440, height: 960 } : { width: 1440, height: 810 };
const gRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${gRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
await fs.mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
const page = await browser.newPage({ viewport: VIEWPORT });
// --antigo: serve os módulos do viewmodel da base (vm/launch-k 1b5858568) — referência "antes".
if (process.argv.includes('--antigo')) {
  const base = path.resolve('artifacts/vm-k-rebuild/base-src');
  for (const name of ['vmconfig.js', 'meleevm.js', 'authoredvm.js', 'vmbytes.js', 'weaponver.js']) {
    const body = await fs.readFile(path.join(base, name), 'utf8');
    await page.route(`**/js/**/${name}*`, (route) => route.fulfill({ contentType: 'application/javascript; charset=utf-8', body }));
    await page.route(`**/js/${name}*`, (route) => route.fulfill({ contentType: 'application/javascript; charset=utf-8', body }));
  }
  // Na base a granada K não existia (404): o arremesso caía no legado.
  await page.route('**/viewmodels/grenade/grenade-runtime.glb*', (route) => route.fulfill({ status: 404, body: 'ausente na base' }));
}
const erros = [];
page.on('pageerror', (e) => erros.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (/paid-viewmodel|melee-vm/.test(m.text())) erros.push(m.text().slice(0, 200)); });
const shot = async (nome) => {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
      if (el.children.length < 6 && /DEBUG \(console\)/.test(el.textContent || '') && el.offsetHeight > 40) el.style.display = 'none';
    }
  });
  await page.screenshot({ path: path.join(OUT, `${nome}.png`) });
  console.log('png', nome);
};
const q = new URLSearchParams({ debug: '1', auto: 'E', map: 'piscina_treta', armaslazy: '0', vmauthored: '1', vmqa: 'precision' });
for (const [k, v] of new URLSearchParams(EXTRA)) q.set(k, v);
await page.goto(`http://127.0.0.1:${PORTA}/?${q}`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
await page.waitForTimeout(3000);
// Congela bots e o relógio do round: a figura não pode depender de quem entra no quadro.
await page.evaluate(() => {
  const g = window.__game;
  for (const c of g.combatants || []) if (c !== g.player) { c.alive = false; if (c.mesh) c.mesh.visible = false; }
});
// Câmera lenta só no viewmodel: o screenshot custa mais que o clipe inteiro.
await page.evaluate(() => {
  window.__vmSlow = 1;
  const a = window.__authoredVm; const m = window.__game.vm.melee;
  if (a && !a.__slow) { const o = a.update.bind(a); a.update = (dt, ctx) => o(dt * window.__vmSlow, ctx); a.__slow = true; }
  if (m && !m.__slow) { const o = m.update.bind(m); m.update = (dt) => o(dt * window.__vmSlow); m.__slow = true; }
});
// Figura sem bot atirando nem fumaça na frente: mata quem não é o jogador a cada foto.
const calmo = () => page.evaluate(() => {
  const g = window.__game;
  for (const c of g.combatants || []) if (c !== g.player) { c.alive = false; if (c.mesh) c.mesh.visible = false; }
  for (const b of g.bots || []) { b.nextShotAt = Infinity; b.target = null; }
  g.player.hp = 100; g.player.alive = true;
});
const slow = (v) => page.evaluate((x) => { window.__vmSlow = x; }, v);
const waitFor = async (fn, arg0, ms = 15000) => page.waitForFunction(fn, arg0, { timeout: ms, polling: 16 }).catch(() => null);
const settle = async (ms = 2600) => page.waitForTimeout(ms);
const switchTo = async (arma) => {
  for (let t = 0; t < 4; t += 1) {
    const ok = await page.evaluate((w) => { try { window.__game._switchWeapon(w); return window.__game.player.weapon === w; } catch (e) { return String(e); } }, arma);
    if (ok === true) return true;
    await page.waitForTimeout(700);
  }
  return false;
};
// Espera um ponto do clipe corrente (fração do tempo da ação ativa).
const atClip = async (frac, kind = 'authored') => waitFor(([f, k]) => {
  const g = window.__game;
  if (k === 'melee') { const a = g.vm.melee?.current; return a && a.getClip() && a.time / a.getClip().duration >= f; }
  const e = window.__authoredVm?.entry?.(g.player.weapon);
  const a = e?.action; return a && a.getClip() && a.time / a.getClip().duration >= f;
}, [frac, kind], 20000);

for (const arma of ARMAS) {
  if (arma === 'grenade') {
    await switchTo('pistol'); await settle();
    for (const kind of ['frag']) {
      await page.evaluate(() => { window.__game.player.frags = 3; window.__game.player._nextNade = 0; });
      const pontos = [0.12, 0.3, 0.45, 0.58, 0.7, 0.85];
      await slow(0.08);
      await page.evaluate((k) => { window.__game[k === 'frag' ? '_throwFrag' : '_throwSmoke'](); }, kind);
      for (const f of pontos) {
        await waitFor((ff) => { const u = window.__authoredVm?.utility; return !u || u.elapsed / u.duration >= ff; }, f);
        const vivo = await page.evaluate(() => Boolean(window.__authoredVm?.utility));
        await shot(`grenade-${kind}-t${String(Math.round(f * 100)).padStart(3, '0')}${vivo ? '' : '-fim'}`);
      }
      await slow(1);
    }
    continue;
  }
  if (arma === 'knife') {
    if (!(await switchTo('knife'))) { console.log('knife: troca falhou'); continue; }
    await settle(3200);
    await shot('knife-idle');
    await slow(0.1);
    for (const [clip, pts] of [['Draw', [0.3, 0.7]], ['Slash', [0.25, 0.45, 0.7]], ['Stab', [0.25, 0.5, 0.75]], ['Inspect', [0.2, 0.45, 0.7]]]) {
      const ok = await page.evaluate((c) => {
        const m = window.__game.vm.melee;
        if (c === 'Draw') return m.draw();
        return m.playState ? m.playState(c) : false;
      }, clip);
      if (!ok) { console.log(`knife ${clip}: sem clipe`); continue; }
      for (const f of pts) { await atClip(f, 'melee'); await shot(`knife-${clip.toLowerCase()}-f${String(Math.round(f * 100)).padStart(3, '0')}`); }
      await settle(900);
    }
    for (const heavy of [false, true]) {
      await page.evaluate((h) => window.__game.vm.melee.attack(h ? 'heavy' : 'quick'), heavy);
      await atClip(0.4, 'melee');
      await shot(`knife-${heavy ? 'heavy' : 'quick'}-f040`);
      await settle(900);
    }
    await slow(1);
    continue;
  }
  if (!(await switchTo(arma))) { console.log(`${arma}: troca falhou`); continue; }
  await settle();
  await waitFor(() => { const e = window.__authoredVm?.entry?.(window.__game.player.weapon); return !e || (e.drawTime >= e.drawDuration && e.state === 'idle'); }, null, 10000);
  await page.waitForTimeout(800);
  await calmo();
  await shot(`${arma}-idle`);
  // ADS pelo gancho de QA do jogo (o botão direito do mouse não entra sem pointer lock).
  await page.evaluate(() => { if (!window.__game.player.scoped) (window.__vmPrecisionQa?.ads?.() ?? null); });
  await waitFor(() => (window.__authoredVm?.adsAmount ?? 1) >= 0.99, null, 8000);
  await page.waitForTimeout(400);
  await calmo();
  await shot(`${arma}-ads`);
  await page.evaluate(() => { if (window.__game.player.scoped) window.__vmPrecisionQa?.ads?.(); });
  await waitFor(() => (window.__authoredVm?.adsAmount ?? 0) <= 0.01, null, 8000);
  await page.waitForTimeout(600);
  await page.evaluate(() => { const p = window.__game.player; p.ammo[p.weapon].mag = Math.max(p.ammo[p.weapon].mag, 5); });
  await slow(0.1);
  await page.mouse.down({ button: 'left' }); await page.waitForTimeout(70);
  await shot(`${arma}-fire`);
  await page.mouse.up({ button: 'left' }); await page.waitForTimeout(900);
  await calmo();
  await page.evaluate(() => { const g = window.__game, p = g.player; p.ammo[p.weapon].mag = 0; p.ammo[p.weapon].res = Math.max(60, p.ammo[p.weapon].res); g._startReload(); });
  for (const f of [0.15, 0.35, 0.6, 0.85]) { await atClip(f); await shot(`${arma}-reload-empty-f${String(Math.round(f * 100)).padStart(3, '0')}`); }
  await settle(2000);
  const insp = await page.evaluate(() => window.__authoredVm?.inspect?.(window.__game.player.weapon) || false);
  if (insp) for (const f of [0.2, 0.45, 0.7]) { await atClip(f); await shot(`${arma}-inspect-f${String(Math.round(f * 100)).padStart(3, '0')}`); }
  else console.log(`${arma}: sem inspect`);
  await slow(1);
  await settle(1500);
}
await fs.writeFile(path.join(OUT, 'erros.json'), JSON.stringify(erros, null, 1));
await browser.close();
console.log('OUT', OUT, 'erros', erros.length);
