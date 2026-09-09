/* Captura equivalente da Piscina reempilhada no Chrome/WebGL real.
   Uso: node tools/eval/piscina-stack-browser.mjs \
     --base=http://127.0.0.1:8152 --out=artifacts/piscina-stack/final/browser */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const arg = (name, fallback) => process.argv.find((x) => x.startsWith(`--${name}=`))?.slice(name.length + 3) || fallback;
const base = arg('base', 'http://127.0.0.1:8152');
const out = arg('out', 'artifacts/piscina-stack/final/browser');
mkdirSync(out, { recursive: true });

const npmRoot = execSync('npm root -g').toString().trim();
const pw = await import(pathToFileURL(`${npmRoot}/playwright/index.js`).href);
const chromium = pw.chromium || pw.default?.chromium;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--headless=new', '--mute-audio'],
});

const poses = [
  { id: 'overview', eye: [0, 4.8, -13.2], target: [0, 0.1, 1] },
  { id: 'west-corridor', eye: [-19, 1.62, -13.5], target: [-19, 1.0, 10] },
  { id: 'east-corridor', eye: [19, 1.62, 13.5], target: [19, 1.0, -10] },
  { id: 'waterline', eye: [0, -0.12, -7], target: [0, -0.65, 5] },
  { id: 'west-portal', eye: [-14.5, 1.62, -11], target: [-19.2, 1.0, -11] },
  { id: 'south-vestibule', eye: [0, 1.8, -22.8], target: [0, 1.1, -14.5] },
  { id: 'spawn-flow', eye: [11.5, 2.1, -22.5], target: [0, 1.0, -14], bots: true },
];
const receipts = [];

for (const quality of ['med', 'low']) for (const teamSize of [5, 8]) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(({ bots, quality }) => {
    localStorage.setItem('awpbr_settings', JSON.stringify({ quality, bots, vol: 0, speech: false }));
  }, { bots: teamSize, quality });
  const url = `${base}/?debug=1&auto=P,mst&map=piscina_treta&perfilauto=0`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'live' && window.__game?._mapId === 'piscina_treta', null, { timeout: 180000 });
  await page.waitForTimeout(750);
  const receipt = await page.evaluate(() => {
    const g = window.__game;
    g.paused = true;
    g.player.hp = 1e9;
    for (const bot of g.bots) bot.hp = 1e9;
    if (g.vmScene) g.vmScene.visible = false;
    if (g.vm?.root) g.vm.root.visible = false;
    for (const drop of g.drops || []) if (drop.mesh) drop.mesh.visible = false;
    const canvas = g.renderer.domElement;
    for (const el of document.body.querySelectorAll('*')) {
      if (el !== canvas && !el.contains(canvas) && !canvas.contains(el)) el.style.setProperty('display', 'none', 'important');
    }
    canvas.style.setProperty('display', 'block', 'important');
    return {
      map: g._mapId,
      state: g.state,
      actualBots: g.bots.length,
      quality: g.settings.quality,
      gpu: g.renderer.__csWebgl,
      canvas: [canvas.width, canvas.height],
    };
  });

  receipt.teamSize = teamSize;
  receipt.requestedQuality = quality;
  receipt.mode = `${teamSize}x${teamSize}`;
  receipt.viewport = [1200, 800];
  receipt.url = url;
  receipt.errors = errors;
  receipt.captures = [];

  for (const pose of poses) {
    const render = await page.evaluate(({ eye, target, bots }) => {
      const g = window.__game;
      for (const bot of g.bots) if (bot.mesh?.group) bot.mesh.group.visible = bots === true;
      const [x, y, z] = eye;
      const [tx, ty, tz] = target;
      const dx = tx - x, dy = ty - y, dz = tz - z;
      const horizontal = Math.hypot(dx, dz);
      const yaw = Math.atan2(-dx, -dz);
      const pitch = Math.atan2(-dy, horizontal);
      g.camera.position.set(x, y, z);
      g.camera.rotation.set(pitch, yaw, 0, 'YXZ');
      g.camera.updateMatrixWorld(true);
      g.renderer.info.autoReset = false;
      g.renderer.info.reset();
      g.renderer.render(g.scene, g.camera);
      return { eye, target, botsVisible: bots === true, yaw, pitch, render: { ...g.renderer.info.render } };
    }, pose);
    const file = `${out}/piscina-${quality}-${teamSize}x${teamSize}-${pose.id}.png`;
    await page.screenshot({ path: file });
    receipt.captures.push({ id: pose.id, file, ...render });
  }
  writeFileSync(`${out}/piscina-${quality}-${teamSize}x${teamSize}.json`, `${JSON.stringify(receipt, null, 2)}\n`);
  receipts.push(receipt);
  await context.close();
}

await browser.close();
const summary = { base, cases: receipts };
writeFileSync(`${out}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
const expectedKnown = (message) => message.includes('SUPPORT_URL_BR is not defined');
if (receipts.some((r) => r.state !== 'live' || r.actualBots !== r.teamSize * 2 - 1 ||
  r.quality !== r.requestedQuality || r.errors.some((e) => !expectedKnown(e)))) {
  process.exitCode = 1;
}
