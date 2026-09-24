/* Contraprova de orçamento local da Piscina.
   Compara o candidato com `?piscinaBatch=0`, que preserva a mesma cena e desliga somente
   o lote de caixas repetidas. O teto absoluto continua pertencendo a CENA; esta régua
   prova que a redução vem do mapa, e não de esconder bots ou baixar qualidade. */
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const arg = (name, fallback) => process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const base = arg('base', 'http://127.0.0.1:8152');
const npmRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${npmRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--headless=new', '--mute-audio'],
});

async function measure(mutant) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => localStorage.setItem('awpbr_settings', JSON.stringify({
    quality: 'med', bots: 8, vol: 0, speech: false,
  })));
  const query = mutant ? '&piscinaBatch=0' : '';
  await page.goto(`${base}/?debug=1&auto=P,mst&map=piscina_treta&perfilauto=0${query}`,
    { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__game?._mapId === 'piscina_treta',
    null, { timeout: 180000 });
  await page.waitForTimeout(750);
  const result = await page.evaluate(() => {
    const g = window.__game;
    g.paused = true;
    g.player.hp = 1e9;
    for (const bot of g.bots) {
      bot.hp = 1e9;
      if (bot.mesh?.group) bot.mesh.group.visible = true;
    }
    if (g.vmScene) g.vmScene.visible = false;
    if (g.vm?.root) g.vm.root.visible = false;
    const eye = [0, 5.2, -14], target = [0, 1, 2];
    const [x, y, z] = eye, [tx, ty, tz] = target;
    const dx = tx - x, dy = ty - y, dz = tz - z;
    g.camera.position.set(x, y, z);
    g.camera.rotation.set(Math.atan2(-dy, Math.hypot(dx, dz)), Math.atan2(-dx, -dz), 0, 'YXZ');
    g.camera.updateMatrixWorld(true);
    g.renderer.shadowMap.needsUpdate = true;
    g.renderer.info.autoReset = false;
    g.renderer.info.reset();
    g.renderer.render(g.scene, g.camera);
    const batch = g.world.root.userData.piscinaBatch || { meshes: 0, batches: 0 };
    return {
      bots: g.bots.length,
      calls: g.renderer.info.render.calls,
      triangles: g.renderer.info.render.triangles,
      batch,
    };
  });
  await context.close();
  return { ...result, errors };
}

try {
  const candidate = await measure(false);
  const mutant = await measure(true);
  const savedCalls = mutant.calls - candidate.calls;
  const relative = candidate.calls / mutant.calls;
  const checks = {
    workload: candidate.bots === 15 && mutant.bots === 15,
    batchPresent: candidate.batch.meshes >= 150 && candidate.batch.batches >= 20,
    mutantDisabled: mutant.batch.meshes === 0 && mutant.batch.batches === 0,
    causalCalls: savedCalls >= 150 && relative <= 0.75,
    mediumEnvelope: candidate.calls <= 860 && candidate.triangles <= 1100000,
    noPageErrors: candidate.errors.length === 0 && mutant.errors.length === 0,
  };
  console.log(JSON.stringify({ candidate, mutant, savedCalls, relative: +relative.toFixed(3), checks }, null, 2));
  process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
} finally {
  await browser.close();
}
