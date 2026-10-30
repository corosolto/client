import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Referência: cap=0 em artifacts/javaporcos-codex-20261030/ak/javaporcos-ak-cap-false.png, ROI 22–60% x / 35–50% y.
// Sem a tampa defeituosa: 181/78.768 pixels escuros (0,23%); com ela: 100%. Folga de 5% para variação do cenário.
const base = process.env.BASE;
assert.ok(base, 'BASE obrigatório');
const mutant = process.argv.find(a => a.startsWith('--mutante='))?.split('=')[1];
assert.ok(!mutant || ['quantizacao-antiga', 'manga-oculta', 'sem-pos'].includes(mutant), 'mutante desconhecido');
const maps = process.argv.includes('--somente-javaporcos') ? ['invasao_javaporcos'] : ['invasao_javaporcos', 'praca_poderes'];
const server = await chromium.launchServer({ args: ['--use-angle=metal', '--headless=new', '--mute-audio'] });
const browser = await chromium.connect(server.wsEndpoint());
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let failed = 0;
try {
  for (const map of maps) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await ctx.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({ quality: 'high', vol: 0, menuMusic: false })));
    let applied = !mutant || mutant !== 'quantizacao-antiga';
    if (mutant === 'quantizacao-antiga') await ctx.route(/\/js\/vmsleeve\.js/, async route => {
      const response = await route.fetch(), source = await response.text();
      const needle = 'const arr = attr.normalized ? new Float32Array((pos.count + extras.length) * item) : new attr.array.constructor((pos.count + extras.length) * item);';
      assert.ok(source.includes(needle), 'mutante quantizacao-antiga não aplicou');
      applied = true;
      await route.fulfill({ response, body: source.replace(needle, 'const arr = new attr.array.constructor((pos.count + extras.length) * item);').replace('const novo = new THREE.BufferAttribute(arr, item, false);', 'const novo = new THREE.BufferAttribute(arr, item, attr.normalized);') });
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/?debug=1&adaptativa=0&map=${map}&auto=E&bots=3&vmweapon=ak${mutant === 'sem-pos' ? '&bloom=0' : ''}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game?.state === 'live', null, { timeout: 180000 });
    await page.waitForTimeout(4000);
    const result = await page.evaluate(mutant => {
      const g = window.__game;
      g.paused = true; g.update = () => {};
      let sleeve = null;
      g.vm.root.traverse(o => { if (o.userData.sleeveCapped) sleeve = o; });
      if (mutant === 'manga-oculta' && sleeve) sleeve.visible = false;
      let visible = !!sleeve;
      for (let p = sleeve; p; p = p.parent) if (!p.visible) visible = false;
      g.renderer.render(g.scene, g.camera);
      const canvas = document.createElement('canvas');
      canvas.width = g.renderer.domElement.width; canvas.height = g.renderer.domElement.height;
      const context = canvas.getContext('2d'); context.drawImage(g.renderer.domElement, 0, 0);
      const w = Math.floor(canvas.width * .38), h = Math.floor(canvas.height * .15);
      const pixels = context.getImageData(Math.floor(canvas.width * .22), Math.floor(canvas.height * .35), w, h).data;
      let black = 0;
      for (let i = 0; i < pixels.length; i += 4) if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) <= 24) black++;
      return { post: g.renderer.__postPatched === true && g.scene.userData.vmPass?.scene === g.vmScene && g.scene.userData.vmPass?.camera === g.vmCamera, weapon: g.player.weapon, capped: sleeve?.userData.sleeveCapped || 0, visible, black, pixels: w * h, fraction: black / (w * h) };
    }, mutant);
    const ok = applied && result.post && result.weapon === 'ak' && result.capped === 2 && result.visible && result.fraction <= .05;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} AK GPU ${map}: ${JSON.stringify(result)}`);
    await page.goto('about:blank'); await Promise.race([ctx.close(), delay(3000)]);
  }
} finally {
  await Promise.race([server.close(), delay(5000)]);
  if (server.process().exitCode === null) await server.kill();
}
process.exitCode = mutant ? (failed === maps.length ? 0 : 1) : (failed ? 1 : 0);
