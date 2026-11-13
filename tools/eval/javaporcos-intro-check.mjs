import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE;
assert.ok(base, 'BASE obrigatório');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
assert.ok(!mutant || ['sem-intro', 'sem-pular', 'dominio-errado'].includes(mutant));
const server = await chromium.launchServer({ args: ['--use-angle=metal', '--mute-audio'] });
const browser = await chromium.connect(server.wsEndpoint());
const delay = ms => new Promise(r => setTimeout(r, ms));
let failed = false, detected = false, applied = !mutant;
try {
  for (const action of ['button', 'Escape', 'Enter', 'abort']) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await ctx.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'low', vol: 0, menuMusic: false })));
    if (mutant) await ctx.route(/\/js\/javaporcos_intro\.js/, async route => {
      const response = await route.fetch(), source = await response.text();
      const pair = mutant === 'sem-intro' ? ['dialog.showModal();', 'return Promise.resolve();'] : mutant === 'sem-pular' ? ["dialog.querySelector('[data-pular]')?.addEventListener", "dialog.querySelector('[data-inativo]')?.addEventListener"] : ['um sobrevivente mantém a resistência', 'a ocupação encerra a resistência'];
      applied = source.includes(pair[0]); assert.ok(applied, 'mutante não aplicou');
      await route.fulfill({ response, body: source.replace(pair[0], pair[1]) });
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/?debug=1&adaptativa=0&map=invasao_javaporcos&auto=E&bots=1&hordeintro=1`, { waitUntil: 'domcontentloaded' });
    const dialog = page.locator('#javaporcos-intro');
    try {
      await dialog.waitFor({ state: 'visible', timeout: 30000 });
      const text = await dialog.innerText();
      assert.match(text, /javali europeu/i); assert.match(text, /porco doméstico/i);
      if (mutant === 'dominio-errado' && /a ocupação encerra/.test(text)) detected = true;
      assert.match(text, /um sobrevivente mantém a resistência/); assert.match(text, /Pular/);
      assert.equal(await page.evaluate(() => !!window.__game), false, 'partida nasceu antes da intro');
      if (!mutant && action === 'button') {
        await page.screenshot({ path: '/tmp/javaporcos-intro-desktop.png' });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(await dialog.locator('[data-pular]').isVisible());
        await page.screenshot({ path: '/tmp/javaporcos-intro-mobile.png' });
        await page.setViewportSize({ width: 1440, height: 960 });
      }
      await page.waitForTimeout(action === 'button' ? 13000 : 300);
      assert.equal(await page.evaluate(() => !!window.__game), false, 'PREP correu atrás da intro');
      if (action === 'abort') await page.evaluate(() => window.__javaporcosIntroAbort.abort());
      else if (action === 'button') await dialog.locator('[data-pular]').click({ timeout: 1500 });
      else await page.keyboard.press(action);
      if (mutant === 'sem-pular') {
        await page.waitForTimeout(500);
        detected = await dialog.isVisible();
      }
      await dialog.waitFor({ state: 'detached', timeout: 2000 });
      if (action === 'abort') {
        await page.waitForTimeout(1000);
        assert.equal(await page.evaluate(() => !!window.__game), false, 'cancelamento criou Game');
      } else await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
      console.log(`✓ INTRO ${action}: factual, sobrevivência, pausa antes do Game e saída funcional`);
    } catch (e) { failed = true;
      if (mutant === 'sem-intro') {
        await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
        detected = await page.locator('#javaporcos-intro:modal').count() === 0;
      }
      console.log(`✗ INTRO ${action}: ${e.message.slice(0,250)}`); }
    await page.goto('about:blank'); await Promise.race([ctx.close(), delay(3000)]);
    if (failed || mutant) break;
  }
} finally { await Promise.race([server.close(), delay(5000)]); if (server.process().exitCode === null) await server.kill(); }
process.exitCode = mutant ? (failed && applied && detected ? 0 : 1) : (failed ? 1 : 0);
