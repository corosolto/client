import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE;
assert.ok(base, 'BASE obrigatório');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
assert.ok(!mutant || ['nomes-antigos', 'wallpaper-fixo'].includes(mutant));
const server = await chromium.launchServer({ args: ['--use-angle=metal', '--mute-audio'] });
const browser = await chromium.connect(server.wsEndpoint());
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let failures = 0, targetFailed = false;
try {
  for (const map of ['invasao_javaporcos', 'praca_poderes']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await ctx.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', vol: 0, menuMusic: false })));
    let applied = !mutant;
    if (mutant) await ctx.route(/\/js\/javaporcos_apresentacao\.js/, async route => {
      const response = await route.fetch(), source = await response.text();
      const needle = mutant === 'nomes-antigos' ? "if (modo !== 'horde') return null;" : 'return JAVAPORCOS_WALLS[i % JAVAPORCOS_WALLS.length];';
      applied = source.includes(needle);
      assert.ok(applied, 'mutante não aplicou');
      await route.fulfill({ response, body: source.replace(needle, mutant === 'nomes-antigos' ? 'return null;' : 'return JAVAPORCOS_WALLS[0];') });
    });
    const page = await ctx.newPage();
    await page.clock.install();
    await page.route('**/api/**', route => route.request().method() === 'POST' ? route.fulfill({ json: {} }) : route.continue());
    await page.goto(`${base}/?debug=1&adaptativa=0&map=${map}&auto=E&bots=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    const ui = await page.evaluate(() => {
      const g = window.__game; g.paused = true; g.update = () => {};
      g._showScoreboard(true); g.objective?.atualizaHud(true);
      const header = document.querySelector('#scoreboard h3').textContent;
      const hud = g.objective?.hudDominio?.textContent || '';
      const banner = g.objective?.roundResult('B')?.detail || '';
      g.roundsWon.B = 1; g.roundsWon.E = 0; g._endMatch();
      const end = document.getElementById('match-sub').textContent;
      return { names: [g._teamName('E'), g._teamName('B')], tag: g._teamTag('B'), header, hud, banner, end };
    });
    await page.waitForFunction(() => document.querySelector('.tp-res__frase')?.textContent.length > 0, null, { timeout: 5000 });
    ui.resultadoVisivel = await page.locator('.tp-res__frase').textContent();
    await page.evaluate(() => {
      document.getElementById('match-end').classList.add('hidden');
      document.getElementById('load-overlay').classList.remove('hidden');
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('tp:elenco', { detail: window.__tpElenco })));
    const visibleWall = () => page.locator('.tp-carga__arte').evaluate(e => !e.hidden && e.complete && e.naturalWidth > 0 ? e.currentSrc : '');
    const walls = [await visibleWall()];
    for (let i = 0; i < 2; i++) { await page.clock.fastForward(21000); await page.waitForTimeout(1500); walls.push(await visibleWall()); }
    const horde = map === 'invasao_javaporcos';
    ui.loadingVisivel = await page.locator('.tp-carga').textContent().catch(() => '');
    if (horde && !mutant) await page.screenshot({ path: '/tmp/javaporcos-identidade-loading.png' });
    const namesOk = horde ? ui.names.join('|') === 'Defensores|Javaporcos' && ui.tag === 'Javaporcos' && [ui.header, ui.hud, ui.banner, ui.end, ui.resultadoVisivel, ui.loadingVisivel].every(t => /Javaporcos/i.test(t)) : ui.names.join('|') === 'TIME E|TIME B' && !/Javaporcos/i.test(ui.header + ui.end);
    const wallsOk = horde ? new Set(walls).size === 3 && walls.every(w => /javaporcos/.test(w)) : walls.every(w => !/javaporcos/.test(w));
    const ok = namesOk && wallsOk && (!mutant || applied);
    if (!ok) { failures++; if (horde) targetFailed = true; }
    console.log(`${ok ? '✓' : '✗'} IDENTIDADE ${map}: ${JSON.stringify({ namesOk, wallsOk, ui: { ...ui, loadingVisivel: ui.loadingVisivel.slice(0, 120) }, walls })}`);
    await page.goto('about:blank'); await Promise.race([ctx.close(), delay(3000)]);
  }
} finally { await Promise.race([server.close(), delay(5000)]); if (server.process().exitCode === null) await server.kill(); }
process.exitCode = mutant ? (targetFailed ? 0 : 1) : (failures ? 1 : 0);
